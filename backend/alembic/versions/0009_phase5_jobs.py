"""Phase 5 — Employer Portal & Job Matching: jobs, employer_profiles, interviews,
and rework pipeline_entries to be job-scoped (per (job, candidate)).

Revision ID: 0009_phase5_jobs
Revises: 0008_skill_manual_score
Create Date: 2026-07-24

Note: pipeline_entries/pipeline_notes may already exist physically (created via
create_all during Phase 4 testing) even though the old 0006 migration was never
recorded. This migration drops and rebuilds them job-aware; the discarded rows
were sourcing test data (no job association was possible before).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

revision: str = "0009_phase5_jobs"
down_revision: Union[str, None] = "0008_skill_manual_score"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_tables() -> set[str]:
    return set(inspect(op.get_bind()).get_table_names())


def upgrade() -> None:
    existing = _existing_tables()

    if "employer_profiles" not in existing:
        op.create_table(
            "employer_profiles",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("company_name", sa.String(255)),
            sa.Column("website", sa.String(255)),
            sa.Column("industry", sa.String(150)),
            sa.Column("company_size", sa.String(50)),
            sa.Column("location", sa.String(255)),
            sa.Column("description", sa.Text()),
            sa.UniqueConstraint("user_id"),
        )

    if "jobs" not in existing:
        op.create_table(
            "jobs",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column(
                "employer_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("description", sa.Text()),
            sa.Column("industry", sa.String(150)),
            sa.Column("functional_area", sa.String(150)),
            sa.Column("location", sa.String(255)),
            sa.Column("employment_type", sa.String(30)),
            sa.Column("remote_option", sa.String(20)),
            sa.Column("required_skills", sa.JSON(), nullable=False, server_default="[]"),
            sa.Column("preferred_skills", sa.JSON(), nullable=False, server_default="[]"),
            sa.Column("required_certifications", sa.JSON(), nullable=False, server_default="[]"),
            sa.Column("min_experience_years", sa.Float(), server_default="0"),
            sa.Column("max_experience_years", sa.Float()),
            sa.Column("salary_min", sa.Float()),
            sa.Column("salary_max", sa.Float()),
            sa.Column("openings", sa.Integer(), server_default="1"),
            sa.Column("status", sa.String(20), nullable=False, server_default="open"),
            sa.Column("job_embedding", Vector(384)),
        )
        op.create_index("ix_jobs_status", "jobs", ["status"])
        op.create_index("ix_jobs_employer", "jobs", ["employer_id"])

    # Rebuild pipeline tables job-aware. Drop children first.
    existing = _existing_tables()
    if "interviews" in existing:
        op.drop_table("interviews")
    if "pipeline_notes" in existing:
        op.drop_table("pipeline_notes")
    if "pipeline_entries" in existing:
        op.drop_table("pipeline_entries")

    op.create_table(
        "pipeline_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "job_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("jobs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("stage", sa.String(20), nullable=False, server_default="sourced"),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.UniqueConstraint("job_id", "candidate_id", name="uq_pipeline_job_candidate"),
    )
    op.create_index("ix_pipeline_entries_stage", "pipeline_entries", ["stage"])
    op.create_index("ix_pipeline_entries_job", "pipeline_entries", ["job_id"])
    op.create_index("ix_pipeline_entries_candidate", "pipeline_entries", ["candidate_id"])

    op.create_table(
        "pipeline_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "pipeline_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("pipeline_entries.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("body", sa.Text(), nullable=False),
    )
    op.create_index("ix_pipeline_notes_entry", "pipeline_notes", ["pipeline_entry_id"])

    op.create_table(
        "interviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "pipeline_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("pipeline_entries.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("scheduled_at", sa.DateTime(timezone=True)),
        sa.Column("mode", sa.String(20)),
        sa.Column("status", sa.String(20), nullable=False, server_default="scheduled"),
        sa.Column("outcome", sa.String(20)),
        sa.Column("feedback", sa.Text()),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_interviews_entry", "interviews", ["pipeline_entry_id"])


def downgrade() -> None:
    # Drop Phase 5 tables and restore the candidate-centric pipeline (0004-era).
    op.drop_index("ix_interviews_entry", table_name="interviews")
    op.drop_table("interviews")
    op.drop_index("ix_pipeline_notes_entry", table_name="pipeline_notes")
    op.drop_table("pipeline_notes")
    for ix in ("ix_pipeline_entries_candidate", "ix_pipeline_entries_job", "ix_pipeline_entries_stage"):
        op.drop_index(ix, table_name="pipeline_entries")
    op.drop_table("pipeline_entries")
    op.drop_index("ix_jobs_employer", table_name="jobs")
    op.drop_index("ix_jobs_status", table_name="jobs")
    op.drop_table("jobs")
    op.drop_table("employer_profiles")

    # Recreate the pre-Phase-5 candidate-scoped pipeline so downgrade is coherent.
    op.create_table(
        "pipeline_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("stage", sa.String(20), nullable=False, server_default="sourced"),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.UniqueConstraint("candidate_id"),
    )
    op.create_table(
        "pipeline_notes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "pipeline_entry_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("pipeline_entries.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("body", sa.Text(), nullable=False),
    )
