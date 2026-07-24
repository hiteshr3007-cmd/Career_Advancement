"""Phase 6 — Learning & Certification Marketplace (Module 15).

Recommendations (Phase 3) tell a candidate WHAT to learn; an Enrollment tracks
that they took it. Completing an enrollment feeds back into scoring: the target
skill's proficiency is bumped and profile completeness recomputed (the "closed
loop" — see app/services/learning.py).
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

ENROLLMENT_STATUSES = ("enrolled", "in_progress", "completed", "dropped")
ENROLLMENT_KINDS = ("course", "certification")


class Enrollment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "enrollments"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[str | None] = mapped_column(String(150))
    url: Mapped[str | None] = mapped_column(String(500))
    kind: Mapped[str] = mapped_column(String(20), default="course")  # ENROLLMENT_KINDS
    # The skill this learning item develops; used to bump proficiency on completion.
    skill_target: Mapped[str | None] = mapped_column(String(150))

    status: Mapped[str] = mapped_column(String(20), nullable=False, default="enrolled")
    progress_pct: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    candidate: Mapped["CandidateProfile"] = relationship("CandidateProfile")  # noqa: F821
