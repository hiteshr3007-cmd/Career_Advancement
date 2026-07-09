import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import require_roles
from app.database import get_db
from app.models.benchmark import Benchmark
from app.models.candidate import CandidateProfile
from app.models.match import CandidateBenchmarkMatch
from app.models.user import User, UserRole
from app.schemas.match import MatchResultOut
from app.services.matching.embeddings import (
    EmbeddingUnavailable,
    build_candidate_embedding_text,
    generate_embedding,
)
from app.services.matching.engine import compute_match

router = APIRouter(prefix="/matching", tags=["Benchmark Matching Engine"])

VIEWER_ROLES = (
    UserRole.RECRUITER.value,
    UserRole.HR_REVIEWER.value,
    UserRole.EMPLOYER.value,
    UserRole.ADMINISTRATOR.value,
)


def _load_candidate_for_matching(db: Session, candidate_id: uuid.UUID) -> CandidateProfile:
    candidate = (
        db.query(CandidateProfile)
        .options(joinedload(CandidateProfile.skills), joinedload(CandidateProfile.experiences))
        .filter(CandidateProfile.id == candidate_id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found")
    return candidate


def _ensure_candidate_embedding(candidate: CandidateProfile) -> None:
    if candidate.profile_embedding is not None:
        return
    try:
        text = build_candidate_embedding_text(candidate)
        if text.strip():
            candidate.profile_embedding = generate_embedding(text)
    except EmbeddingUnavailable:
        pass


def _run_matching(db: Session, candidate: CandidateProfile, benchmark_id: uuid.UUID | None) -> list[CandidateBenchmarkMatch]:
    _ensure_candidate_embedding(candidate)

    query = db.query(Benchmark).filter(Benchmark.is_active.is_(True))
    if benchmark_id:
        query = query.filter(Benchmark.id == benchmark_id)
    elif candidate.industry:
        query = query.filter(Benchmark.category.ilike(f"%{candidate.industry}%"))

    benchmarks = query.all()
    if benchmark_id and not benchmarks:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark not found or inactive")

    results: list[CandidateBenchmarkMatch] = []
    for benchmark in benchmarks:
        scores = compute_match(candidate, benchmark)

        existing = (
            db.query(CandidateBenchmarkMatch)
            .filter(
                CandidateBenchmarkMatch.candidate_id == candidate.id,
                CandidateBenchmarkMatch.benchmark_id == benchmark.id,
            )
            .first()
        )
        if existing:
            for field, value in scores.items():
                setattr(existing, field, value)
            results.append(existing)
        else:
            match = CandidateBenchmarkMatch(candidate_id=candidate.id, benchmark_id=benchmark.id, **scores)
            db.add(match)
            results.append(match)

    db.commit()
    for r in results:
        db.refresh(r)
    return results


@router.post("/me/compute", response_model=list[MatchResultOut])
def compute_my_matches(
    benchmark_id: uuid.UUID | None = None,
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    candidate = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    candidate = _load_candidate_for_matching(db, candidate.id)
    return _run_matching(db, candidate, benchmark_id)


@router.get("/me", response_model=list[MatchResultOut])
def get_my_matches(
    current_user: User = Depends(require_roles(UserRole.CANDIDATE.value)),
    db: Session = Depends(get_db),
):
    candidate = db.query(CandidateProfile).filter(CandidateProfile.user_id == current_user.id).first()
    if not candidate:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found")
    return (
        db.query(CandidateBenchmarkMatch)
        .filter(CandidateBenchmarkMatch.candidate_id == candidate.id)
        .order_by(CandidateBenchmarkMatch.match_score.desc())
        .all()
    )


@router.post("/candidates/{candidate_id}/compute", response_model=list[MatchResultOut])
def compute_candidate_matches(
    candidate_id: uuid.UUID,
    benchmark_id: uuid.UUID | None = None,
    current_user: User = Depends(require_roles(*VIEWER_ROLES)),
    db: Session = Depends(get_db),
):
    candidate = _load_candidate_for_matching(db, candidate_id)
    return _run_matching(db, candidate, benchmark_id)


@router.get("/candidates/{candidate_id}", response_model=list[MatchResultOut])
def get_candidate_matches(
    candidate_id: uuid.UUID,
    current_user: User = Depends(require_roles(*VIEWER_ROLES)),
    db: Session = Depends(get_db),
):
    return (
        db.query(CandidateBenchmarkMatch)
        .filter(CandidateBenchmarkMatch.candidate_id == candidate_id)
        .order_by(CandidateBenchmarkMatch.match_score.desc())
        .all()
    )
