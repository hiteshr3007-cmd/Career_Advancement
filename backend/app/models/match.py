import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import UUIDPrimaryKeyMixin


class CandidateBenchmarkMatch(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "candidate_benchmark_matches"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False
    )
    benchmark_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("benchmarks.id", ondelete="CASCADE"), nullable=False
    )

    match_score: Mapped[float] = mapped_column(Float, nullable=False)
    readiness_score: Mapped[float] = mapped_column(Float, nullable=False)
    semantic_similarity: Mapped[float] = mapped_column(Float, default=0.0)

    matched_required_skills: Mapped[list] = mapped_column(JSON, default=list)
    missing_required_skills: Mapped[list] = mapped_column(JSON, default=list)
    matched_preferred_skills: Mapped[list] = mapped_column(JSON, default=list)
    missing_certifications: Mapped[list] = mapped_column(JSON, default=list)
    experience_gap_years: Mapped[float] = mapped_column(Float, default=0.0)

    gap_summary: Mapped[dict] = mapped_column(JSON, default=dict)

    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
