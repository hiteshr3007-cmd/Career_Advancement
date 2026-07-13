"""split the collapsed 'employee' role back into distinct recruiter/hr_reviewer/employer

The single 'employee' role introduced in 0002 is reverted — the product now
wants distinct company-staff roles again. The original sub-role of any given
user was already discarded by 0002 (that's an inherent one-way loss, as its
own downgrade() acknowledged), so every 'employee' row is remapped to
'recruiter' as a safe default; an admin can reassign individual users to
'hr_reviewer' / 'employer' afterwards via PATCH /admin/users if needed.

Roles are stored as a String column (not a DB enum), so no type change is
needed — just remap existing rows.

Revision ID: 0003_uncollapse_roles
Revises: 0002_collapse_roles
Create Date: 2026-07-13

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0003_uncollapse_roles"
down_revision: Union[str, None] = "0002_collapse_roles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE users SET role = 'recruiter' WHERE role = 'employee'")


def downgrade() -> None:
    op.execute("UPDATE users SET role = 'employee' WHERE role IN ('recruiter', 'hr_reviewer', 'employer')")
