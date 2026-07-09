import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON, Boolean, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.candidate import EMBEDDING_DIM
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class Benchmark(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "benchmarks"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    # Information Technology, Human Resources, Sales, Finance, Marketing,
    # Operations, Engineering, Healthcare, Manufacturing
    functional_area: Mapped[str | None] = mapped_column(String(150))
    level: Mapped[str] = mapped_column(String(50), nullable=False)  # entry/mid/senior/lead/executive

    required_skills: Mapped[list] = mapped_column(JSON, default=list)
    preferred_skills: Mapped[list] = mapped_column(JSON, default=list)
    required_certifications: Mapped[list] = mapped_column(JSON, default=list)
    preferred_certifications: Mapped[list] = mapped_column(JSON, default=list)

    min_experience_years: Mapped[float] = mapped_column(Float, default=0)
    max_experience_years: Mapped[float | None] = mapped_column(Float)

    career_milestones: Mapped[list] = mapped_column(JSON, default=list)
    industry_standards: Mapped[dict] = mapped_column(JSON, default=dict)

    description: Mapped[str | None] = mapped_column(String(2000))
    benchmark_embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM))

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column()
