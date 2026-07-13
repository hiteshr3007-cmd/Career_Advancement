"""collapse recruiter/hr_reviewer/employer roles into 'employee'

Roles are stored as a String column (not a DB enum), so no type change is
needed — just remap existing rows.

Revision ID: 0002_collapse_roles
Revises: 0001_initial
Create Date: 2026-07-11

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002_collapse_roles"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "UPDATE users SET role = 'employee' "
        "WHERE role IN ('recruiter', 'hr_reviewer', 'employer')"
    )


def downgrade() -> None:
    # Original sub-roles are unrecoverable; map everything back to a single
    # legacy role so downgrade is at least consistent.
    op.execute("UPDATE users SET role = 'recruiter' WHERE role = 'employee'")
