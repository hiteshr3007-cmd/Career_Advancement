"""Phase 5 — Employer Portal: job requisitions and employer company profiles.

A `Job` is a requisition posted by an employer (Module 12). Candidates are
matched against jobs by the AI Job Matching Engine (Module 13), and enter a
job's hiring pipeline as applications (see app/models/pipeline.py).

Job skills/certs are stored as JSON string arrays (mirroring Benchmark) so the
matching engine can reuse the same set-overlap + semantic-similarity code. A
job also carries its own embedding for candidate<->job semantic matching.
"""
import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.candidate import EMBEDDING_DIM
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

# Ordered job lifecycle. `draft` is not visible to candidates; `open` accepts
# applications; `closed` is archived.
JOB_STATUSES = ("draft", "open", "closed")
DEFAULT_JOB_STATUS = "open"

EMPLOYMENT_TYPES = ("full_time", "part_time", "contract", "internship", "temporary")
REMOTE_OPTIONS = ("onsite", "hybrid", "remote")


class EmployerProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Company/employer info attached to an employer user account. Separate from
    the User row (which holds auth/name) so employer-specific fields don't bloat
    it; one profile per employer user."""

    __tablename__ = "employer_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    company_name: Mapped[str | None] = mapped_column(String(255))
    website: Mapped[str | None] = mapped_column(String(255))
    industry: Mapped[str | None] = mapped_column(String(150))
    company_size: Mapped[str | None] = mapped_column(String(50))  # 1-10, 11-50, ...
    location: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship("User")  # noqa: F821


class Job(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "jobs"

    # The employer (user) who owns this requisition. SET NULL keeps the job (and
    # its pipeline history) if the employer account is removed.
    employer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    industry: Mapped[str | None] = mapped_column(String(150))
    functional_area: Mapped[str | None] = mapped_column(String(150))
    location: Mapped[str | None] = mapped_column(String(255))
    employment_type: Mapped[str | None] = mapped_column(String(30))  # EMPLOYMENT_TYPES
    remote_option: Mapped[str | None] = mapped_column(String(20))    # REMOTE_OPTIONS

    required_skills: Mapped[list] = mapped_column(JSON, default=list)
    preferred_skills: Mapped[list] = mapped_column(JSON, default=list)
    required_certifications: Mapped[list] = mapped_column(JSON, default=list)

    min_experience_years: Mapped[float] = mapped_column(Float, default=0)
    max_experience_years: Mapped[float | None] = mapped_column(Float)

    salary_min: Mapped[float | None] = mapped_column(Float)
    salary_max: Mapped[float | None] = mapped_column(Float)
    openings: Mapped[int] = mapped_column(Integer, default=1)

    status: Mapped[str] = mapped_column(String(20), nullable=False, default=DEFAULT_JOB_STATUS)

    job_embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM))

    applications: Mapped[list["PipelineEntry"]] = relationship(  # noqa: F821
        back_populates="job", cascade="all, delete-orphan"
    )
