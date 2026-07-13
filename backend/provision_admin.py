"""Provision an administrator account directly in the database.

Admin accounts cannot be created via the public /auth/register endpoint (that
would be a privilege-escalation hole — it returns 422 for role=administrator).
Use this script for the initial admin / ops provisioning.

Usage:
    python provision_admin.py <email> <password> ["Full Name"]

Requires the same environment as the app (DATABASE_URL). Run from the repo root
with the venv active so `app` is importable.
"""
import sys

from app.core.security import hash_password
from app.database import SessionLocal
from app.models.user import User, UserRole


def provision_admin(email: str, password: str, full_name: str = "Administrator") -> None:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            if existing.role == UserRole.ADMINISTRATOR.value:
                print(f"Admin already exists: {email}")
            else:
                existing.role = UserRole.ADMINISTRATOR.value
                existing.is_active = True
                existing.is_verified = True
                db.commit()
                print(f"Promoted existing user to administrator: {email}")
            return
        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role=UserRole.ADMINISTRATOR.value,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        print(f"Provisioned administrator: {email}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python provision_admin.py <email> <password> [\"Full Name\"]")
        raise SystemExit(1)
    email = sys.argv[1]
    password = sys.argv[2]
    full_name = sys.argv[3] if len(sys.argv) > 3 else "Administrator"
    provision_admin(email, password, full_name)
