"""scripts/seed_demo_accounts.py - Create demo teacher, classrooms, and student accounts for Grades 3 to 10."""
import sys
import uuid
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.database import SessionLocal, init_db
from backend.models import User, Class
from backend.auth.security import hash_secret, generate_join_code


def seed_demo():
    init_db()
    db = SessionLocal()
    try:
        print("\n" + "=" * 65)
        print("SEEDING PARIVESTRA DEMO ACCOUNTS (GRADES 3 TO 10)")
        print("=" * 65)

        # 1. Demo Teacher
        teacher_email = "teacher@parivestra.edu"
        teacher_uname = "ms_sharma"
        teacher_secret = "teach123"

        teacher = db.query(User).filter(User.username == teacher_uname).first()
        if not teacher:
            teacher = User(
                id=f"teacher_{uuid.uuid4().hex[:8]}",
                username=teacher_uname,
                email=teacher_email,
                name="Ms. Ananya Sharma",
                display_name="Ms. Sharma",
                avatar="fox",
                role="teacher",
                grade="Class 4",
                default_grade="Class 4",
                password_hash=hash_secret(teacher_secret),
                active=True,
            )
            db.add(teacher)
            db.commit()
            db.refresh(teacher)
        else:
            teacher.password_hash = hash_secret(teacher_secret)
            db.commit()

        print(f"\n👩‍🏫 TEACHER ACCOUNT:")
        print(f"  • Name     : Ms. Ananya Sharma")
        print(f"  • Username : {teacher_uname}")
        print(f"  • Email    : {teacher_email}")
        print(f"  • Password : {teacher_secret}")
        print(f"  • Role     : teacher")

        # 2. Classrooms & Demo Students per Grade
        EDITIONS = {
            3: ("AI Explorers", "1234"),
            4: ("AI Builders", "1234"),
            5: ("AI Innovators", "1234"),
            6: ("AI Thinkers", "learn-ai-2026"),
            7: ("AI Makers", "learn-ai-2026"),
            8: ("AI Engineers", "learn-ai-2026"),
            9: ("AI Analysts", "learn-ai-2026"),
            10: ("AI Leaders", "learn-ai-2026"),
        }

        print(f"\n🎒 DEMO STUDENT ACCOUNTS (1 PER GRADE):")
        print(f" {'Grade':<10} | {'Edition':<15} | {'Username':<12} | {'Secret / Type':<18} | {'Class Code':<10}")
        print("-" * 75)

        for g, (edition, secret) in EDITIONS.items():
            norm_grade = f"Class {g}"
            # Class
            cls = db.query(Class).filter(Class.grade == norm_grade, Class.name == f"{norm_grade} {edition}").first()
            if not cls:
                cls = Class(
                    id=f"class_g{g}_{uuid.uuid4().hex[:6]}",
                    name=f"{norm_grade} {edition}",
                    grade=norm_grade,
                    section="A",
                    join_code=generate_join_code(f"P{g}"),
                    teacher_id=teacher.id,
                    allow_grade_switch=True,
                    allow_join_by_code=True,
                    consent_confirmed=True,
                )
                db.add(cls)
                db.commit()
                db.refresh(cls)

            # Student username
            uname = f"kid{g}" if g <= 5 else f"student{g}"
            student = db.query(User).filter(User.username == uname).first()
            if not student:
                student = User(
                    id=f"student_g{g}_{uuid.uuid4().hex[:6]}",
                    username=uname,
                    name=f"Explorer {g}",
                    display_name=f"Explorer {g}",
                    avatar="owl" if g % 2 == 1 else "panda",
                    role="student",
                    grade=norm_grade,
                    default_grade=norm_grade,
                    class_id=cls.id,
                    password_hash=hash_secret(secret),
                    active=True,
                )
                db.add(student)
                db.commit()
            else:
                student.password_hash = hash_secret(secret)
                student.class_id = cls.id
                db.commit()

            secret_label = f"PIN: {secret}" if g <= 5 else f"PW: {secret}"
            print(f" {norm_grade:<10} | {edition:<15} | {uname:<12} | {secret_label:<18} | {cls.join_code:<10}")

        print("=" * 75 + "\n")
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo()
