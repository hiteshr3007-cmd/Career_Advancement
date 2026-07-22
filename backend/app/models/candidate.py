import uuid
from datetime import date

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Boolean, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin

EMBEDDING_DIM = 384  # matches app.services.matching.embeddings HashingVectorizer (local, no OpenAI)


class CandidateProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "candidate_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )

    phone: Mapped[str | None] = mapped_column(String(50))
    location: Mapped[str | None] = mapped_column(String(255))
    summary: Mapped[str | None] = mapped_column(Text)

    current_designation: Mapped[str | None] = mapped_column(String(255))
    experience_level: Mapped[str | None] = mapped_column(String(50))  # entry/mid/senior/lead/executive
    total_experience_years: Mapped[float | None] = mapped_column(Float)
    # True once the candidate has explicitly typed a value into the profile
    # form; while False, total_experience_years is recomputed automatically
    # from `experiences` whenever an entry is added/removed.
    experience_years_manual_override: Mapped[bool] = mapped_column(Boolean, default=False)
    industry: Mapped[str | None] = mapped_column(String(150))
    functional_area: Mapped[str | None] = mapped_column(String(150))
    career_stage: Mapped[str | None] = mapped_column(String(100))

    certifications: Mapped[list] = mapped_column(JSON, default=list)
    projects: Mapped[list] = mapped_column(JSON, default=list)
    achievements: Mapped[list] = mapped_column(JSON, default=list)
    keywords: Mapped[list] = mapped_column(JSON, default=list)
    career_preferences: Mapped[dict] = mapped_column(JSON, default=dict)

    raw_extracted_data: Mapped[dict | None] = mapped_column(JSON)
    profile_embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM))

    profile_completeness: Mapped[float] = mapped_column(Float, default=0.0)

    user: Mapped["User"] = relationship("User", back_populates="candidate_profile")  # noqa: F821
    skills: Mapped[list["CandidateSkill"]] = relationship(
        "CandidateSkill", back_populates="candidate", cascade="all, delete-orphan"
    )
    education: Mapped[list["CandidateEducation"]] = relationship(
        "CandidateEducation", back_populates="candidate", cascade="all, delete-orphan"
    )
    experiences: Mapped[list["CandidateExperience"]] = relationship(
        "CandidateExperience", back_populates="candidate", cascade="all, delete-orphan"
    )
    resumes: Mapped[list["Resume"]] = relationship(  # noqa: F821
        "Resume", back_populates="candidate", cascade="all, delete-orphan"
    )


class CandidateSkill(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "candidate_skills"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    proficiency: Mapped[str | None] = mapped_column(String(50))  # beginner/intermediate/advanced/expert
    category: Mapped[str | None] = mapped_column(String(100))  # technical/soft/domain
    source: Mapped[str] = mapped_column(String(20), default="resume")  # resume/manual
    # Optional user self-rating, 1-5, used by the scorecard's skill scoring.
    manual_score: Mapped[int | None] = mapped_column(Integer, nullable=True)

    candidate: Mapped["CandidateProfile"] = relationship("CandidateProfile", back_populates="skills")


class CandidateEducation(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "candidate_education"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False
    )
    degree: Mapped[str | None] = mapped_column(String(255))
    field_of_study: Mapped[str | None] = mapped_column(String(255))
    institution: Mapped[str | None] = mapped_column(String(255))
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    grade: Mapped[str | None] = mapped_column(String(50))

    candidate: Mapped["CandidateProfile"] = relationship("CandidateProfile", back_populates="education")


class CandidateExperience(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "candidate_experience"

    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(255))
    company: Mapped[str | None] = mapped_column(String(255))
    industry: Mapped[str | None] = mapped_column(String(150))
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    description: Mapped[str | None] = mapped_column(Text)

    candidate: Mapped["CandidateProfile"] = relationship("CandidateProfile", back_populates="experiences")
