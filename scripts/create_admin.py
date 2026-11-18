"""scripts/create_admin.py - Bootstrap initial administrator account."""
import argparse
import os
import sys
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.database import SessionLocal, init_db
from backend.models import User
from backend.auth.security import hash_secret
from backend import config


def create_or_reset_admin(username: str = "admin", email: str = "admin@parivestra.edu", secret: str = None):
    init_db()
    db = SessionLocal()
    try:
        admin_secret = secret or getattr(config, "ADMIN_KEY", "parivestra_admin_secret")

        existing = db.query(User).filter((User.username == username) | (User.role == "admin")).first()
        if existing:
            print(f"[INFO] Existing admin found: username='{existing.username}', email='{existing.email}'")
            print("[INFO] Updating password with current ADMIN_KEY...")
            existing.password_hash = hash_secret(admin_secret)
            existing.role = "admin"
            existing.active = True
            db.commit()
            print("=" * 60)
            print("ADMIN ACCOUNT READY")
            print(f"Username : {existing.username}")
            print(f"Email    : {existing.email}")
            print(f"Password : {admin_secret}")
            print("=" * 60)
            return

        admin = User(
            id="admin_root",
            username=username,
            email=email,
            password_hash=hash_secret(admin_secret),
            name="School Administrator",
            display_name="School Administrator",
            avatar="owl",
            role="admin",
            grade="Class 10",
            default_grade="Class 10",
            active=True,
        )
        db.add(admin)
        db.commit()

        print("=" * 60)
        print("ADMIN ACCOUNT CREATED")
        print(f"Username : {username}")
        print(f"Email    : {email}")
        print(f"Password : {admin_secret}")
        print("=" * 60)
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create or reset initial administrator account.")
    parser.add_argument("--username", default="admin", help="Admin username")
    parser.add_argument("--email", default="admin@parivestra.edu", help="Admin email")
    parser.add_argument("--secret", default=None, help="Password (defaults to ADMIN_KEY from .env)")
    args = parser.parse_args()

    create_or_reset_admin(args.username, args.email, args.secret)
