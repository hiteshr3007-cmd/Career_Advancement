"""Phase 5 — Employer Portal (Module 12) + Job Matching Engine (Module 13).

Job requisitions owned by employers, plus candidate<->job matching:
  - GET  /jobs/recommended/me       candidate: best-matching open jobs
  - GET  /jobs/{id}/candidates      staff: best-matching candidates for a job
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Text, func
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, require_roles
from app.database import get_db
from app.models.candidate import CandidateProfile
from app.models.job import Job
from app.models.pipeline import PipelineEntry
from app.models.user import User, UserRole
from app.schemas.job import (
    JobCreate,
    JobOut,
    JobSearchPage,
    JobStatusUpdate,
    JobUpdate,
    RecommendedCandidateOut,
    RecommendedJobOut,
)
from app.services.job_matching import build_job_embedding_text, compute_job_match
from app.services.matching.embeddings import (
    EmbeddingUnavailable,
    build_candidate_embedding_text,
    generate_embedding,
)

router = APIRouter(prefix="/jobs", tags=["Employer Portal & Job Matching (Phase 5)"])

STAFF_ROLES = (
    UserRole.RECRUITER.value,
    UserRole.HR_REVIEWER.value,
    UserRole.EMPLOYER.value,
    UserRole.ADMINISTRATOR.value,
)
EMPLOYER_ROLES = (UserRole.EMPLOYER.value, UserRole.ADMINISTRATOR.value)


def _apply_job_embedding(job: Job) -> None:
    try:
        text = build_job_embedding_text(job)
        if text.strip():
            job.job_embedding = generate_embedding(text)
    except EmbeddingUnavailable:
        pass


def _ensure_candidate_embedding(candidate: CandidateProfile) -> None:
    if candidate.profile_embedding is not None:
        return
    try:
        text = build_candidate_embedding_text(candidate)
        if text.strip():
            candidate.profile_embedding = generate_embedding(text)
    except EmbeddingUnavailable:
        pass


def _job_to_out(job: Job, employer: User | None, application_count: int | None = None) -> JobOut:
    base = JobOut.model_validate(job)
    base.employer_name = employer.full_name if employer else None
    base.application_count = application_count
    return base


def _load_job(db: Session, job_id: uuid.UUID) -> Job:
    job = db.get(Job, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


def _assert_can_manage(user: User, job: Job) -> None:
    if user.role == UserRole.ADMINISTRATOR.value:
        return
    if job.employer_id == user.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You can only manage your own job postings.",
    )


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: JobCreate,
    current_user: User = Depends(require_roles(*EMPLOYER_ROLES)),
    db: Session = Depends(get_db),
):
    job = Job(**payload.model_dump(), employer_id=current_user.id)
    _apply_job_embedding(job)
    db.add(job)
    db.commit()
    db.refresh(job)
    return _job_to_out(job, current_user, application_count=0)


@router.get("", response_model=JobSearchPage)
def list_jobs(
    status_filter: str | None = Query(None, alias="status"),
    industry: str | None = Query(None),
    location: str | None = Query(None),
    skill: str | None = Query(None),
    q: str | None = Query(None, description="free-text match on title"),
    mine: bool = Query(False, description="employer: only my postings"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_candidate = current_user.role == UserRole.CANDIDATE.value
    query = db.query(Job)

    # Candidates only ever see open jobs; staff can filter by any status.
    if is_candidate:
        query = query.filter(Job.status == "open")
    elif status_filter:
        query = query.filter(Job.status == status_filter)

    if mine and not is_candidate:
        query = query.filter(Job.employer_id == current_user.id)
    if industry:
        query = query.filter(Job.industry.ilike(f"%{industry}%"))
    if location:
        query = query.filter(Job.location.ilike(f"%{location}%"))
    if q:
        query = query.filter(Job.title.ilike(f"%{q}%"))
    if skill:
        # required_skills is a JSON array; cast to text for a contains match
        # (good enough for a directory filter — avoids a JSON operator that
        # differs across SQLite/Postgres).
        query = query.filter(func.cast(Job.required_skills, Text).ilike(f"%{skill}%"))

    total = query.count()
    jobs = query.order_by(Job.created_at.desc()).offset(offset).limit(limit).all()

    # application counts + employer names in bulk (avoid N+1)
    job_ids = [j.id for j in jobs]
    counts: dict[uuid.UUID, int] = {}
    employers: dict[uuid.UUID, User] = {}
    if job_ids:
        for jid, cnt in (
            db.query(PipelineEntry.job_id, func.count(PipelineEntry.id))
            .filter(PipelineEntry.job_id.in_(job_ids))
            .group_by(PipelineEntry.job_id)
            .all()
        ):
            counts[jid] = cnt
        emp_ids = {j.employer_id for j in jobs if j.employer_id}
        if emp_ids:
            employers = {u.id: u for u in db.query(User).filter(User.id.in_(emp_ids))}

    items = [
        _job_to_out(j, employers.get(j.employer_id), application_count=counts.get(j.id, 0))
        for j in jobs
    ]
    return JobSearchPage(items=items, total=total, limit=limit, offset=offset)


# --- Matching (declared before /{job_id} so the literal path wins) ---
@router.get("/recommended/me", response_model=list[RecommendedJobOut])
def recommended_jobs_for_me(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    candidate = (
        db.query(CandidateProfile)
        .options(selectinload(CandidateProfile.skills))
        .filter(CandidateProfile.user_id == current_user.id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    _ensure_candidate_embedding(candidate)
    db.commit()  # persist any newly-computed embedding

    jobs = db.query(Job).filter(Job.status == "open").all()
    scored = []
    for job in jobs:
        scores = compute_job_match(candidate, job)
        scored.append(RecommendedJobOut(job=_job_to_out(job, None), **scores))
    scored.sort(key=lambda r: r.match_score, reverse=True)
    return scored[:limit]


@router.get("/{job_id}/candidates", response_model=list[RecommendedCandidateOut])
def recommended_candidates_for_job(
    job_id: uuid.UUID,
    limit: int = Query(25, ge=1, le=200),
    current_user: User = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    job = _load_job(db, job_id)
    candidates = (
        db.query(CandidateProfile)
        .options(selectinload(CandidateProfile.skills), selectinload(CandidateProfile.user))
        .all()
    )
    scored = []
    for cand in candidates:
        scores = compute_job_match(cand, job)
        scored.append(
            RecommendedCandidateOut(
                candidate_id=cand.id,
                full_name=cand.user.full_name if cand.user else None,
                email=cand.user.email if cand.user else None,
                current_designation=cand.current_designation,
                total_experience_years=cand.total_experience_years,
                **scores,
            )
        )
    scored.sort(key=lambda r: r.match_score, reverse=True)
    return scored[:limit]


@router.get("/{job_id}", response_model=JobOut)
def get_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = _load_job(db, job_id)
    if current_user.role == UserRole.CANDIDATE.value and job.status != "open":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    employer = db.get(User, job.employer_id) if job.employer_id else None
    count = db.query(func.count(PipelineEntry.id)).filter(PipelineEntry.job_id == job.id).scalar()
    return _job_to_out(job, employer, application_count=count)


@router.patch("/{job_id}", response_model=JobOut)
def update_job(
    job_id: uuid.UUID,
    payload: JobUpdate,
    current_user: User = Depends(require_roles(*EMPLOYER_ROLES)),
    db: Session = Depends(get_db),
):
    job = _load_job(db, job_id)
    _assert_can_manage(current_user, job)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(job, field, value)
    # Recompute the embedding if any text/skill field changed.
    if data.keys() & {"title", "description", "industry", "functional_area",
                      "required_skills", "preferred_skills", "required_certifications"}:
        _apply_job_embedding(job)
    db.commit()
    db.refresh(job)
    employer = db.get(User, job.employer_id) if job.employer_id else None
    return _job_to_out(job, employer)


@router.patch("/{job_id}/status", response_model=JobOut)
def update_job_status(
    job_id: uuid.UUID,
    payload: JobStatusUpdate,
    current_user: User = Depends(require_roles(*EMPLOYER_ROLES)),
    db: Session = Depends(get_db),
):
    job = _load_job(db, job_id)
    _assert_can_manage(current_user, job)
    job.status = payload.status
    db.commit()
    db.refresh(job)
    employer = db.get(User, job.employer_id) if job.employer_id else None
    return _job_to_out(job, employer)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: uuid.UUID,
    current_user: User = Depends(require_roles(*EMPLOYER_ROLES)),
    db: Session = Depends(get_db),
):
    job = _load_job(db, job_id)
    _assert_can_manage(current_user, job)
    db.delete(job)
    db.commit()
