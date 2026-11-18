"""SQLAlchemy database engine, session management and safe migrations."""
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import DATABASE_URL

logger = logging.getLogger("backend.database")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency for yielding database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_migrations():
    """Safely migrate SQLite database schema without dropping existing tables."""
    from backend import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # Safe column additions for SQLite tables
    with engine.connect() as conn:
        try:
            # Users table migrations
            res_users = conn.execute(text("PRAGMA table_info(users)")).fetchall()
            existing_user_cols = {row[1] for row in res_users}
            for col_name, col_type in [
                ("display_name", "VARCHAR(100) DEFAULT 'Kid Explorer'"),
                ("avatar", "VARCHAR(50) DEFAULT 'owl'"),
                ("grade", "VARCHAR(20) DEFAULT 'Class 3'"),
                ("pin_hash", "VARCHAR(128)"),
                ("xp", "INTEGER DEFAULT 0"),
                ("streak", "INTEGER DEFAULT 1"),
                ("role", "VARCHAR(20) DEFAULT 'student'"),
                ("username", "VARCHAR(64)"),
                ("email", "VARCHAR(120)"),
                ("password_hash", "VARCHAR(255)"),
                ("default_grade", "VARCHAR(20) DEFAULT 'Class 3'"),
                ("class_id", "VARCHAR(64)"),
                ("active", "BOOLEAN DEFAULT 1"),
                ("failed_attempts", "INTEGER DEFAULT 0"),
                ("locked_until", "DATETIME"),
                ("last_login_at", "DATETIME"),
            ]:
                if col_name not in existing_user_cols:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))

            # Attempts table migrations
            res_attempts = conn.execute(text("PRAGMA table_info(attempts)")).fetchall()
            existing_attempt_cols = {row[1] for row in res_attempts}
            if "grade" not in existing_attempt_cols:
                conn.execute(text("ALTER TABLE attempts ADD COLUMN grade VARCHAR(20) DEFAULT 'Class 3'"))

            # Mastery table migrations
            res_mastery = conn.execute(text("PRAGMA table_info(mastery)")).fetchall()
            existing_mastery_cols = {row[1] for row in res_mastery}
            if "grade" not in existing_mastery_cols:
                conn.execute(text("ALTER TABLE mastery ADD COLUMN grade VARCHAR(20) DEFAULT 'Class 3'"))

            # LessonProgress table migrations
            res_lp = conn.execute(text("PRAGMA table_info(lesson_progress)")).fetchall()
            existing_lp_cols = {row[1] for row in res_lp}
            if "grade" not in existing_lp_cols:
                conn.execute(text("ALTER TABLE lesson_progress ADD COLUMN grade VARCHAR(20) DEFAULT 'Class 3'"))

            # VideoWatches table migrations
            res_vw = conn.execute(text("PRAGMA table_info(video_watches)")).fetchall()
            existing_vw_cols = {row[1] for row in res_vw}
            if "grade" not in existing_vw_cols:
                conn.execute(text("ALTER TABLE video_watches ADD COLUMN grade VARCHAR(20) DEFAULT 'Class 3'"))

            # Data backfills for clean consistency
            conn.execute(text("UPDATE users SET role = 'student' WHERE role IS NULL OR role = ''"))
            conn.execute(text("UPDATE users SET username = id WHERE username IS NULL OR username = ''"))
            conn.execute(text("UPDATE users SET default_grade = COALESCE(grade, 'Class 3') WHERE default_grade IS NULL OR default_grade = ''"))
            conn.execute(text("UPDATE attempts SET grade = 'Class 3' WHERE grade IS NULL OR grade = ''"))
            conn.execute(text("UPDATE mastery SET grade = 'Class 3' WHERE grade IS NULL OR grade = ''"))
            conn.execute(text("""
                UPDATE lesson_progress
                SET grade = COALESCE(
                    (SELECT c.grade FROM courses c 
                     JOIN course_modules m ON m.course_id = c.id 
                     JOIN course_lessons l ON l.module_id = m.id 
                     WHERE l.id = lesson_progress.lesson_id),
                    'Class 3'
                )
                WHERE grade IS NULL OR grade = ''
            """))
            conn.execute(text("""
                UPDATE video_watches
                SET grade = COALESCE(
                    (SELECT v.grade FROM videos v WHERE v.id = video_watches.video_id),
                    'Class 3'
                )
                WHERE grade IS NULL OR grade = ''
            """))

            # Courses table migrations
            res_courses = conn.execute(text("PRAGMA table_info(courses)")).fetchall()
            existing_course_cols = {row[1] for row in res_courses}
            for col_name, col_type in [
                ("board", "VARCHAR(50) DEFAULT 'CBSE'"),
                ("unit_id", "VARCHAR(100)"),
            ]:
                if col_name not in existing_course_cols:
                    conn.execute(text(f"ALTER TABLE courses ADD COLUMN {col_name} {col_type}"))

            # Course modules table migrations
            res_modules = conn.execute(text("PRAGMA table_info(course_modules)")).fetchall()
            existing_mod_cols = {row[1] for row in res_modules}
            for col_name, col_type in [
                ("chapter_number", "INTEGER DEFAULT 1"),
                ("learning_objectives_json", "TEXT DEFAULT '[]'"),
                ("prerequisites_json", "TEXT DEFAULT '[]'"),
            ]:
                if col_name not in existing_mod_cols:
                    conn.execute(text(f"ALTER TABLE course_modules ADD COLUMN {col_name} {col_type}"))

            # Course lessons table migrations
            res_lessons = conn.execute(text("PRAGMA table_info(course_lessons)")).fetchall()
            existing_les_cols = {row[1] for row in res_lessons}
            for col_name, col_type in [
                ("status", "VARCHAR(50) DEFAULT 'outline'"),
                ("source_citations_json", "TEXT DEFAULT '[]'"),
            ]:
                if col_name not in existing_les_cols:
                    conn.execute(text(f"ALTER TABLE course_lessons ADD COLUMN {col_name} {col_type}"))

            conn.commit()
        except Exception as e:
            logger.warning(f"Database migration notice: {e}")


def init_db():
    """Create database tables and apply safe migrations."""
    run_migrations()
