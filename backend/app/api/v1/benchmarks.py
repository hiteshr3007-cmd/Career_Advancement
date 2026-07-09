import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.database import get_db
from app.models.benchmark import Benchmark
from app.models.user import User, UserRole
from app.schemas.benchmark import BenchmarkCreate, BenchmarkOut, BenchmarkUpdate
from app.services.matching.embeddings import EmbeddingUnavailable, build_benchmark_embedding_text, generate_embedding

router = APIRouter(prefix="/benchmarks", tags=["Benchmark Repository"])

READ_ROLES = (
    UserRole.CANDIDATE.value,
    UserRole.RECRUITER.value,
    UserRole.HR_REVIEWER.value,
    UserRole.EMPLOYER.value,
    UserRole.ADMINISTRATOR.value,
)


def _refresh_embedding(benchmark: Benchmark) -> None:
    try:
        text = build_benchmark_embedding_text(benchmark)
        if text.strip():
            benchmark.benchmark_embedding = generate_embedding(text)
    except EmbeddingUnavailable:
        pass


@router.post("", response_model=BenchmarkOut, status_code=status.HTTP_201_CREATED)
def create_benchmark(
    payload: BenchmarkCreate,
    current_user: User = Depends(require_roles(UserRole.ADMINISTRATOR.value)),
    db: Session = Depends(get_db),
):
    benchmark = Benchmark(**payload.model_dump(), created_by=current_user.id)
    _refresh_embedding(benchmark)
    db.add(benchmark)
    db.commit()
    db.refresh(benchmark)
    return benchmark


@router.get("", response_model=list[BenchmarkOut])
def list_benchmarks(
    category: str | None = None,
    level: str | None = None,
    functional_area: str | None = None,
    is_active: bool = True,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    query = db.query(Benchmark).filter(Benchmark.is_active == is_active)
    if category:
        query = query.filter(Benchmark.category.ilike(f"%{category}%"))
    if level:
        query = query.filter(Benchmark.level == level)
    if functional_area:
        query = query.filter(Benchmark.functional_area.ilike(f"%{functional_area}%"))
    return query.order_by(Benchmark.created_at.desc()).offset(offset).limit(limit).all()


@router.get("/{benchmark_id}", response_model=BenchmarkOut)
def get_benchmark(
    benchmark_id: uuid.UUID,
    current_user: User = Depends(require_roles(*READ_ROLES)),
    db: Session = Depends(get_db),
):
    benchmark = db.get(Benchmark, benchmark_id)
    if not benchmark:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark not found")
    return benchmark


@router.put("/{benchmark_id}", response_model=BenchmarkOut)
def update_benchmark(
    benchmark_id: uuid.UUID,
    payload: BenchmarkUpdate,
    current_user: User = Depends(require_roles(UserRole.ADMINISTRATOR.value)),
    db: Session = Depends(get_db),
):
    benchmark = db.get(Benchmark, benchmark_id)
    if not benchmark:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(benchmark, field, value)

    if any(f in update_data for f in ("name", "category", "description", "required_skills", "preferred_skills")):
        _refresh_embedding(benchmark)

    db.commit()
    db.refresh(benchmark)
    return benchmark


@router.delete("/{benchmark_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_benchmark(
    benchmark_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.ADMINISTRATOR.value)),
    db: Session = Depends(get_db),
):
    benchmark = db.get(Benchmark, benchmark_id)
    if not benchmark:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark not found")
    benchmark.is_active = False
    db.commit()
    return None
