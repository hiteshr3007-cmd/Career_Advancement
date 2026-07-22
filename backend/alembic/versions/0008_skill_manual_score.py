"""add manual_score (1-5 self-rating) to candidate_skills for the scorecard

Revision ID: 0008_skill_manual_score
Revises: 0007_password_reset_code
Create Date: 2026-07-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_skill_manual_score"
down_revision: Union[str, None] = "0007_password_reset_code"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "candidate_skills",
        sa.Column("manual_score", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("candidate_skills", "manual_score")
