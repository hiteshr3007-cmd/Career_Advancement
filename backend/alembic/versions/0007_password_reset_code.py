"""switch password reset to short codes (OTP): drop unique on token, add attempts

Revision ID: 0007_password_reset_code
Revises: 0005_career_plans
Create Date: 2026-07-21

The reset flow now emails a short numeric CODE the user types in, instead of a
long unique link token. Codes are per-user and short, so the global unique
constraint on `token` must go; an `attempts` counter backs brute-force locking.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_password_reset_code"
down_revision: Union[str, None] = "0005_career_plans"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Codes repeat across users/rows, so the token can no longer be globally
    # unique. Drop the unique constraint (Postgres auto-name), keep the plain
    # lookup index (ix_password_reset_tokens_token) in place.
    op.drop_constraint("password_reset_tokens_token_key", "password_reset_tokens", type_="unique")
    op.add_column(
        "password_reset_tokens",
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("password_reset_tokens", "attempts")
    op.create_unique_constraint(
        "password_reset_tokens_token_key", "password_reset_tokens", ["token"]
    )
