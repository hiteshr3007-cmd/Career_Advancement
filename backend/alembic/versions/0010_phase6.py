"""Phase 6 — Learning Marketplace + HR Consultation Platform: enrollments,
consultations. (Analytics is read-only, no schema.)

Revision ID: 0010_phase6
Revises: 0009_phase5_jobs
Create Date: 2026-07-24
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0010_phase6"
down_revision: Union[str, None] = "0009_phase5_jobs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "enrollments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("provider", sa.String(150)),
        sa.Column("url", sa.String(500)),
        sa.Column("kind", sa.String(20), server_default="course"),
        sa.Column("skill_target", sa.String(150)),
        sa.Column("status", sa.String(20), nullable=False, server_default="enrolled"),
        sa.Column("progress_pct", sa.Integer(), server_default="0"),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_enrollments_candidate", "enrollments", ["candidate_id"])

    op.create_table(
        "consultations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column(
            "candidate_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("candidate_profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "advisor_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("session_type", sa.String(30), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="requested"),
        sa.Column("topic", sa.String(255)),
        sa.Column("requested_time", sa.DateTime(timezone=True)),
        sa.Column("scheduled_at", sa.DateTime(timezone=True)),
        sa.Column("notes", sa.Text()),
    )
    op.create_index("ix_consultations_candidate", "consultations", ["candidate_id"])
    op.create_index("ix_consultations_status", "consultations", ["status"])


def downgrade() -> None:
    op.drop_index("ix_consultations_status", table_name="consultations")
    op.drop_index("ix_consultations_candidate", table_name="consultations")
    op.drop_table("consultations")
    op.drop_index("ix_enrollments_candidate", table_name="enrollments")
    op.drop_table("enrollments")
