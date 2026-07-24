"""Phase 4/5 — Recruiting pipeline endpoints (job applications).

Role-differentiated (this is the point — the three staff roles stop being
interchangeable):
  - recruiter     : source candidates into a job, move SOURCING stages, notes,
                    schedule interviews
  - employer      : move DECISION stages (offer/hired/rejected), notes, interviews
  - hr_reviewer   : notes only (review/compliance), no stage control, no sourcing
  - administrator : everything (oversight)
Candidates see their own applications (read-only); super_admins have no access.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, aliased, selectinload

from app.core.deps import require_roles
from app.database import get_db
from app.models.candidate import CandidateProfile
from app.models.job import Job
from app.models.pipeline import (
    DECISION_STAGES,
    PIPELINE_STAGES,
    SOURCING_STAGES,
    Interview,
    PipelineEntry,
    PipelineNote,
)
from app.models.user import User, UserRole
from app.schemas.pipeline import (
    InterviewCreate,
    InterviewOut,
    InterviewUpdate,
    PipelineEntryCreate,
    PipelineEntryDetailOut,
    PipelineEntryOut,
    PipelineNoteCreate,
    PipelineNoteOut,
    PipelineStageUpdate,
)

router = APIRouter(prefix="/pipeline", tags=["Recruiting Pipeline (Phase 4/5)"])

STAFF_ROLES = (
    UserRole.RECRUITER.value,
    UserRole.HR_REVIEWER.value,
    UserRole.EMPLOYER.value,
    UserRole.ADMINISTRATOR.value,
)
SOURCING_ROLES = (UserRole.RECRUITER.value, UserRole.ADMINISTRATOR.value)
INTERVIEW_ROLES = (UserRole.RECRUITER.value, UserRole.EMPLOYER.value, UserRole.ADMINISTRATOR.value)


def _assert_can_set_stage(user: User, stage: str) -> None:
    """Stage control is split by role: recruiters own sourcing, employers own
    decisions, admins own both, hr_reviewers own neither."""
    if user.role == UserRole.ADMINISTRATOR.value:
        return
    if stage in SOURCING_STAGES and user.role == UserRole.RECRUITER.value:
        return
    if stage in DECISION_STAGES and user.role == UserRole.EMPLOYER.value:
        return
    owner = "a recruiter" if stage in SOURCING_STAGES else "an employer"
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Moving a candidate to '{stage}' is {owner}'s action.",
    )


def _entry_to_out(entry: PipelineEntry, job: Job | None, profile: CandidateProfile | None,
                  cand_user: User | None, creator: User | None) -> PipelineEntryOut:
    return PipelineEntryOut(
        id=entry.id,
        job_id=entry.job_id,
        candidate_id=entry.candidate_id,
        stage=entry.stage,
        created_by=entry.created_by,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        job_title=job.title if job else None,
        candidate_name=cand_user.full_name if cand_user else None,
        candidate_email=cand_user.email if cand_user else None,
        candidate_headline=profile.current_designation if profile else None,
        created_by_name=creator.full_name if creator else None,
        note_count=len(entry.notes),
        interview_count=len(entry.interviews),
    )


@router.post("", response_model=PipelineEntryOut, status_code=status.HTTP_201_CREATED)
def add_to_pipeline(
    payload: PipelineEntryCreate,
    current_user: User = Depends(require_roles(*SOURCING_ROLES)),
    db: Session = Depends(get_db),
):
    job = db.get(Job, payload.job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    profile = db.get(CandidateProfile, payload.candidate_id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    exists = (
        db.query(PipelineEntry)
        .filter(PipelineEntry.job_id == payload.job_id, PipelineEntry.candidate_id == payload.candidate_id)
        .first()
    )
    if exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Candidate is already in this job's pipeline"
        )
    entry = PipelineEntry(job_id=payload.job_id, candidate_id=payload.candidate_id, created_by=current_user.id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _entry_to_out(entry, job, profile, profile.user, current_user)


@router.get("", response_model=list[PipelineEntryOut])
def list_pipeline(
    job_id: uuid.UUID | None = Query(None),
    stage: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    if stage is not None and stage not in PIPELINE_STAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"stage must be one of: {', '.join(PIPELINE_STAGES)}",
        )
    Creator = aliased(User)
    query = (
        db.query(PipelineEntry, Job, CandidateProfile, User, Creator)
        .options(selectinload(PipelineEntry.notes), selectinload(PipelineEntry.interviews))
        .join(Job, PipelineEntry.job_id == Job.id)
        .join(CandidateProfile, PipelineEntry.candidate_id == CandidateProfile.id)
        .join(User, CandidateProfile.user_id == User.id)
        .outerjoin(Creator, PipelineEntry.created_by == Creator.id)
    )
    if job_id is not None:
        query = query.filter(PipelineEntry.job_id == job_id)
    if stage is not None:
        query = query.filter(PipelineEntry.stage == stage)
    rows = query.order_by(PipelineEntry.updated_at.desc()).offset(offset).limit(limit).all()
    return [_entry_to_out(entry, job, profile, cand_user, creator)
            for entry, job, profile, cand_user, creator in rows]


@router.get("/me", response_model=list[PipelineEntryOut])
def my_applications(
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    """A candidate's own applications across all jobs (read-only)."""
    profile = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    rows = (
        db.query(PipelineEntry, Job)
        .options(selectinload(PipelineEntry.notes), selectinload(PipelineEntry.interviews))
        .join(Job, PipelineEntry.job_id == Job.id)
        .filter(PipelineEntry.candidate_id == profile.id)
        .order_by(PipelineEntry.updated_at.desc())
        .all()
    )
    return [_entry_to_out(entry, job, profile, current_user, None) for entry, job in rows]


def _load_entry(db: Session, entry_id: uuid.UUID) -> PipelineEntry:
    entry = (
        db.query(PipelineEntry)
        .options(selectinload(PipelineEntry.notes), selectinload(PipelineEntry.interviews))
        .filter(PipelineEntry.id == entry_id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline entry not found")
    return entry


def _detail(db: Session, entry: PipelineEntry) -> PipelineEntryDetailOut:
    job = db.get(Job, entry.job_id)
    profile = db.get(CandidateProfile, entry.candidate_id)
    cand_user = profile.user if profile else None
    creator = db.get(User, entry.created_by) if entry.created_by else None
    author_ids = {n.author_id for n in entry.notes if n.author_id}
    authors = {u.id: u for u in db.query(User).filter(User.id.in_(author_ids))} if author_ids else {}
    base = _entry_to_out(entry, job, profile, cand_user, creator)
    return PipelineEntryDetailOut(
        **base.model_dump(),
        notes=[
            PipelineNoteOut(
                id=n.id,
                author_id=n.author_id,
                author_name=authors[n.author_id].full_name if n.author_id in authors else None,
                body=n.body,
                created_at=n.created_at,
            )
            for n in entry.notes
        ],
        interviews=[InterviewOut.model_validate(i) for i in entry.interviews],
    )


@router.get("/{entry_id}", response_model=PipelineEntryDetailOut)
def get_pipeline_entry(
    entry_id: uuid.UUID,
    current_user: User = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    return _detail(db, _load_entry(db, entry_id))


@router.patch("/{entry_id}/stage", response_model=PipelineEntryDetailOut)
def move_stage(
    entry_id: uuid.UUID,
    payload: PipelineStageUpdate,
    current_user: User = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    entry = _load_entry(db, entry_id)
    _assert_can_set_stage(current_user, payload.stage)
    entry.stage = payload.stage
    db.commit()
    db.refresh(entry)
    return _detail(db, entry)


@router.post("/{entry_id}/notes", response_model=PipelineEntryDetailOut, status_code=status.HTTP_201_CREATED)
def add_note(
    entry_id: uuid.UUID,
    payload: PipelineNoteCreate,
    current_user: User = Depends(require_roles(*STAFF_ROLES)),
    db: Session = Depends(get_db),
):
    entry = _load_entry(db, entry_id)
    db.add(PipelineNote(pipeline_entry_id=entry.id, author_id=current_user.id, body=payload.body))
    db.commit()
    db.refresh(entry)
    return _detail(db, entry)


# --- Interview tracking (Module 12) ---
@router.post("/{entry_id}/interviews", response_model=InterviewOut, status_code=status.HTTP_201_CREATED)
def schedule_interview(
    entry_id: uuid.UUID,
    payload: InterviewCreate,
    current_user: User = Depends(require_roles(*INTERVIEW_ROLES)),
    db: Session = Depends(get_db),
):
    entry = _load_entry(db, entry_id)
    interview = Interview(
        pipeline_entry_id=entry.id,
        scheduled_at=payload.scheduled_at,
        mode=payload.mode,
        feedback=payload.feedback,
        created_by=current_user.id,
    )
    db.add(interview)
    db.commit()
    db.refresh(interview)
    return interview


@router.patch("/interviews/{interview_id}", response_model=InterviewOut)
def update_interview(
    interview_id: uuid.UUID,
    payload: InterviewUpdate,
    current_user: User = Depends(require_roles(*INTERVIEW_ROLES)),
    db: Session = Depends(get_db),
):
    interview = db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(interview, field, value)
    db.commit()
    db.refresh(interview)
    return interview


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_pipeline(
    entry_id: uuid.UUID,
    current_user: User = Depends(require_roles(*SOURCING_ROLES)),
    db: Session = Depends(get_db),
):
    entry = _load_entry(db, entry_id)
    db.delete(entry)
    db.commit()
