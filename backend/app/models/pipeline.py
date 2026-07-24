"""Phase 4/5 — Recruiting pipeline (job applications).

A pipeline entry is a candidate's application to a SPECIFIC job (Phase 5 made
this job-scoped — Phase 4's candidate-only entry couldn't support an employer
with multiple openings). A candidate has at most one entry per job; the entry
moves through stages with role-differentiated control:

  - recruiters own SOURCING stages (sourced -> screening -> interview) and add
    candidates to / remove them from a job's pipeline
  - employers own DECISION stages (offer / hired / rejected)
  - hr_reviewers add review notes only (no stage control)
  - administrators can do anything (oversight)

Notes are a shared collaboration log any staff/admin can append to. Interviews
(Phase 5, Module 12) hang off an entry for interview tracking.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

# Ordered pipeline stages.
SOURCING_STAGES = ("sourced", "screening", "interview")   # recruiter-controlled
DECISION_STAGES = ("offer", "hired", "rejected")          # employer-controlled
PIPELINE_STAGES = SOURCING_STAGES + DECISION_STAGES
DEFAULT_STAGE = "sourced"

INTERVIEW_MODES = ("onsite", "video", "phone")
INTERVIEW_STATUSES = ("scheduled", "completed", "cancelled")
INTERVIEW_OUTCOMES = ("pending", "passed", "failed")


class PipelineEntry(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "pipeline_entries"
    # One application per (job, candidate) pair.
    __table_args__ = (
        UniqueConstraint("job_id", "candidate_id", name="uq_pipeline_job_candidate"),
    )

    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    stage: Mapped[str] = mapped_column(String(20), nullable=False, default=DEFAULT_STAGE)

    # Who first sourced the candidate into this job's pipeline. SET NULL (not
    # CASCADE) so removing a staff account doesn't erase pipeline history.
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    job: Mapped["Job"] = relationship("Job", back_populates="applications")  # noqa: F821
    notes: Mapped[list["PipelineNote"]] = relationship(
        back_populates="entry",
        cascade="all, delete-orphan",
        order_by="PipelineNote.created_at",
    )
    interviews: Mapped[list["Interview"]] = relationship(
        back_populates="entry",
        cascade="all, delete-orphan",
        order_by="Interview.scheduled_at",
    )


class PipelineNote(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "pipeline_notes"

    pipeline_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pipeline_entries.id", ondelete="CASCADE"),
        nullable=False,
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)

    entry: Mapped["PipelineEntry"] = relationship(back_populates="notes")


class Interview(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Interview tracking for an application (Module 12 — Interview Tracking)."""

    __tablename__ = "interviews"

    pipeline_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pipeline_entries.id", ondelete="CASCADE"),
        nullable=False,
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    mode: Mapped[str | None] = mapped_column(String(20))       # INTERVIEW_MODES
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="scheduled")
    outcome: Mapped[str | None] = mapped_column(String(20))    # INTERVIEW_OUTCOMES
    feedback: Mapped[str | None] = mapped_column(Text)

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    entry: Mapped["PipelineEntry"] = relationship(back_populates="interviews")
