"""Phase 6 — HR Consultation Platform (Module 16).

A candidate requests a consultation (career guidance, resume review, or
interview prep); an HR reviewer / recruiter / admin picks it up, confirms a
time, and marks it complete.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

SESSION_TYPES = ("career_guidance", "resume_review", "interview_prep")
CONSULTATION_STATUSES = ("requested", "confirmed", "completed", "cancelled")


class Consultation(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "consultations"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False
    )
    # The staff member handling the session; assigned when confirmed.
    advisor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    session_type: Mapped[str] = mapped_column(String(30), nullable=False)  # SESSION_TYPES
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="requested")

    topic: Mapped[str | None] = mapped_column(String(255))
    requested_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text)

    candidate: Mapped["CandidateProfile"] = relationship("CandidateProfile")  # noqa: F821
    advisor: Mapped["User"] = relationship("User")  # noqa: F821
