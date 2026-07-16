"""add career_plans table (Phase 3: gap report, recommendations, roadmap)

Revision ID: 0005_career_plans
Revises: 0004_experience_years_override
Create Date: 2026-07-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_career_plans"
down_revision: Union[str, None] = "0004_experience_years_override"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "career_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("error", sa.Text()),
        sa.Column("gap_report", sa.JSON()),
        sa.Column("recommendations", sa.JSON()),
        sa.Column("roadmap", sa.JSON()),
        sa.Column("llm_used", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("notes", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("generated_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("candidate_id"),
    )


def downgrade() -> None:
    op.drop_table("career_plans")
