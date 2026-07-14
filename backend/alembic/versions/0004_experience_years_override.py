"""add experience_years_manual_override to candidate_profiles

total_experience_years is now auto-derived from the candidate's
CandidateExperience entries whenever they change, unless the candidate has
explicitly typed a value into the profile form themselves — this flag tracks
which mode a given profile is in so an experience-entry edit doesn't clobber
a manual override.

Revision ID: 0004_experience_years_override
Revises: 0003_uncollapse_roles
Create Date: 2026-07-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_experience_years_override"
down_revision: Union[str, None] = "0003_uncollapse_roles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "candidate_profiles",
        sa.Column(
            "experience_years_manual_override",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("candidate_profiles", "experience_years_manual_override")
