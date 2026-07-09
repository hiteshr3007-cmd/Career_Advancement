"""initial schema: auth, candidate profile, resume, benchmark, matching

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

EMBEDDING_DIM = 384  # local HashingVectorizer output size, see app/services/matching/embeddings.py


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.String(512), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("token"),
    )
    op.create_index("ix_refresh_tokens_token", "refresh_tokens", ["token"])

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.String(512), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("token"),
    )
    op.create_index("ix_password_reset_tokens_token", "password_reset_tokens", ["token"])

    op.create_table(
        "candidate_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("phone", sa.String(50)),
        sa.Column("location", sa.String(255)),
        sa.Column("summary", sa.Text()),
        sa.Column("current_designation", sa.String(255)),
        sa.Column("experience_level", sa.String(50)),
        sa.Column("total_experience_years", sa.Float()),
        sa.Column("industry", sa.String(150)),
        sa.Column("functional_area", sa.String(150)),
        sa.Column("career_stage", sa.String(100)),
        sa.Column("certifications", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("projects", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("achievements", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("keywords", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("career_preferences", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("raw_extracted_data", sa.JSON()),
        sa.Column("profile_embedding", Vector(EMBEDDING_DIM)),
        sa.Column("profile_completeness", sa.Float(), nullable=False, server_default="0"),
        sa.UniqueConstraint("user_id"),
    )

    op.create_table(
        "candidate_skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(150), nullable=False),
        sa.Column("proficiency", sa.String(50)),
        sa.Column("category", sa.String(100)),
        sa.Column("source", sa.String(20), nullable=False, server_default="resume"),
    )

    op.create_table(
        "candidate_education",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("degree", sa.String(255)),
        sa.Column("field_of_study", sa.String(255)),
        sa.Column("institution", sa.String(255)),
        sa.Column("start_date", sa.Date()),
        sa.Column("end_date", sa.Date()),
        sa.Column("grade", sa.String(50)),
    )

    op.create_table(
        "candidate_experience",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255)),
        sa.Column("company", sa.String(255)),
        sa.Column("industry", sa.String(150)),
        sa.Column("start_date", sa.Date()),
        sa.Column("end_date", sa.Date()),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("description", sa.Text()),
    )

    op.create_table(
        "resumes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("original_file_name", sa.String(255), nullable=False),
        sa.Column("file_type", sa.String(10), nullable=False),
        sa.Column("storage_key", sa.String(512), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("parsing_status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("parsing_method", sa.String(20)),
        sa.Column("parsing_error", sa.Text()),
        sa.Column("extracted_text", sa.Text()),
        sa.Column("parsed_data", sa.JSON()),
    )

    op.create_table(
        "benchmarks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("functional_area", sa.String(150)),
        sa.Column("level", sa.String(50), nullable=False),
        sa.Column("required_skills", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("preferred_skills", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("required_certifications", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("preferred_certifications", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("min_experience_years", sa.Float(), nullable=False, server_default="0"),
        sa.Column("max_experience_years", sa.Float()),
        sa.Column("career_milestones", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("industry_standards", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("description", sa.String(2000)),
        sa.Column("benchmark_embedding", Vector(EMBEDDING_DIM)),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", postgresql.UUID(as_uuid=True)),
    )

    op.create_table(
        "candidate_benchmark_matches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("candidate_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("benchmark_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("benchmarks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("match_score", sa.Float(), nullable=False),
        sa.Column("readiness_score", sa.Float(), nullable=False),
        sa.Column("semantic_similarity", sa.Float(), nullable=False, server_default="0"),
        sa.Column("matched_required_skills", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("missing_required_skills", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("matched_preferred_skills", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("missing_certifications", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("experience_gap_years", sa.Float(), nullable=False, server_default="0"),
        sa.Column("gap_summary", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "stored_files",
        sa.Column("key", sa.String(512), primary_key=True),
        sa.Column("content_type", sa.String(150), nullable=False),
        sa.Column("data", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("stored_files")
    op.drop_table("candidate_benchmark_matches")
    op.drop_table("benchmarks")
    op.drop_table("resumes")
    op.drop_table("candidate_experience")
    op.drop_table("candidate_education")
    op.drop_table("candidate_skills")
    op.drop_table("candidate_profiles")
    op.drop_table("password_reset_tokens")
    op.drop_table("refresh_tokens")
    op.drop_table("users")
