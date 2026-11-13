"""Build idempotent course shells (status='outline') for all curriculum units across Classes 3-10."""
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, ".")

from sqlalchemy.orm import Session
from backend.database import SessionLocal, init_db
from backend.models import Course, CourseModule, CourseLesson
from backend.curriculum.loader import load_curriculum
from backend.config.bands import ALL_GRADES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scripts.build_course_shells")


def build_course_shells():
    """Reads curriculum JSON files and populates database with course shells idempotently."""
    init_db()
    db: Session = SessionLocal()

    total_courses_created = 0
    total_modules_created = 0
    total_lessons_created = 0

    try:
        for grade in ALL_GRADES:
            curricula = load_curriculum(board="cbse", grade=grade)
            for curr in curricula:
                subject = curr["subject"]
                grade_name = curr["grade"]

                for u_idx, unit in enumerate(curr.get("units", [])):
                    unit_id = unit["id"]
                    unit_title = unit["title"]

                    # Unique deterministic course ID
                    grade_slug = grade_name.lower().replace(" ", "")
                    subj_slug = subject.lower().replace(" ", "_")
                    course_id = f"course_{grade_slug}_{subj_slug}_{unit_id}"

                    course = db.query(Course).filter(Course.id == course_id).first()
                    if not course:
                        course = Course(
                            id=course_id,
                            title=f"{subject}: {unit_title}",
                            subject=subject,
                            grade=grade_name,
                            board="CBSE",
                            unit_id=unit_id,
                            description=f"CBSE Curriculum Unit on {unit_title} for {grade_name}.",
                            cover_key=subject.lower().replace(" ", "_"),
                            status="outline",
                            needs_review=True,
                        )
                        db.add(course)
                        db.flush()
                        total_courses_created += 1

                    # Modules = Chapters
                    for c_idx, chap in enumerate(unit.get("chapters", [])):
                        chap_id = chap["id"]
                        chap_title = chap["title"]
                        mod_id = f"mod_{chap_id}"

                        module = db.query(CourseModule).filter(CourseModule.id == mod_id).first()
                        if not module:
                            module = CourseModule(
                                id=mod_id,
                                course_id=course.id,
                                title=f"Chapter {chap.get('chapter_number', c_idx + 1)}: {chap_title}",
                                chapter_number=chap.get("chapter_number", c_idx + 1),
                                learning_objectives_json=json.dumps(chap.get("learning_objectives", [])),
                                prerequisites_json=json.dumps(chap.get("prerequisites", [])),
                                position=c_idx + 1,
                            )
                            db.add(module)
                            db.flush()
                            total_modules_created += 1

                            # Create 2 placeholder outline lessons
                            les1 = CourseLesson(
                                id=f"les_{chap_id}_explore",
                                module_id=module.id,
                                title=f"Concept Explorer: {chap_title}",
                                type="story",
                                status="outline",
                                topic=chap_title,
                                position=1,
                                xp=20,
                                content_json=json.dumps({
                                    "status": "outline",
                                    "note": "Needs source material or draft generation.",
                                    "objectives": chap.get("learning_objectives", []),
                                }),
                            )
                            les2 = CourseLesson(
                                id=f"les_{chap_id}_practice",
                                module_id=module.id,
                                title=f"Practice Quest: {chap_title}",
                                type="practice",
                                status="outline",
                                topic=chap_title,
                                position=2,
                                xp=25,
                                content_json=json.dumps({
                                    "status": "outline",
                                    "note": "Awaiting teacher-approved question generation.",
                                }),
                            )
                            db.add(les1)
                            db.add(les2)
                            total_lessons_created += 2

        db.commit()
        logger.info(
            f"Successfully built/verified course shells. Created {total_courses_created} courses, "
            f"{total_modules_created} modules, {total_lessons_created} outline lessons."
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error building course shells: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    build_course_shells()
