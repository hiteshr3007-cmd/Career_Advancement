"""Provision a super-admin account directly in the database.

A super admin's job is CRUD over administrator/super_admin accounts only. Like
regular admins, they can also be granted via the SUPER_ADMIN_EMAILS allowlist
at registration; this script is the bootstrap path for a fresh environment with
no allowlisted email yet.

Usage (run from the backend/ dir with the venv active):
    python scripts/provision_super_admin.py <email> <password> ["Full Name"]

Requires the same environment as the app (DATABASE_URL).
"""
import os
import sys

# Make `app` importable when run as `python scripts/provision_super_admin.py`
# (the parent of scripts/ is the backend root).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.user import User, UserRole


def provision_super_admin(email: str, password: str, full_name: str = "Super Admin") -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            if existing.role == UserRole.SUPER_ADMIN.value:
                print(f"Super admin already exists: {email}")
            else:
                existing.role = UserRole.SUPER_ADMIN.value
                existing.is_active = True
                existing.is_verified = True
                db.commit()
                print(f"Promoted existing user to super admin: {email}")
            return
        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role=UserRole.SUPER_ADMIN.value,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        print(f"Provisioned super admin: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print('Usage: python scripts/provision_super_admin.py <email> <password> ["Full Name"]')
        raise SystemExit(1)
    email = sys.argv[1]
    password = sys.argv[2]
    full_name = sys.argv[3] if len(sys.argv) > 3 else "Super Admin"
    provision_super_admin(email, password, full_name)
