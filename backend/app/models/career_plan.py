import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class CareerPlan(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Persisted Phase 3 output (gap report + recommendations + roadmap) for a
    candidate. One row per candidate — regeneration overwrites in place.
    Generation runs as a background task (like resume parsing): status goes
    pending -> processing -> completed | failed."""

    __tablename__ = "career_plans"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    error: Mapped[str | None] = mapped_column(Text)

    gap_report: Mapped[dict | None] = mapped_column(JSON)
    recommendations: Mapped[dict | None] = mapped_column(JSON)
    roadmap: Mapped[dict | None] = mapped_column(JSON)
    llm_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[list] = mapped_column(JSON, default=list)

    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
