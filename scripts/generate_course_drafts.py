"""Batch Course Draft Generator with Rate Limits, Resume Support, and Grounding Checks."""
import argparse
import json
import os
import sys
import time
from datetime import datetime

sys.path.insert(0, os.path.abspath("."))

from backend.database import SessionLocal, init_db
from backend.models import Course, CourseModule
from backend.courses.generator import generate_module_draft
from backend.llm.gateway import LLMGateway
from backend.rag.retriever import get_default_retriever

PROGRESS_FILE = os.path.join("data", "generation_progress.json")


def load_progress() -> dict:
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"last_updated": None, "completed": {}, "needs_sources": {}, "failed": {}}


def save_progress(progress: dict):
    os.makedirs(os.path.dirname(PROGRESS_FILE), exist_ok=True)
    progress["last_updated"] = datetime.utcnow().isoformat()
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(progress, f, indent=2)


def main():
    parser = argparse.ArgumentParser(description="Generate draft courses using local LLM with source verification.")
    parser.add_argument("--grade", type=str, default=None, help="Filter by grade (e.g. 'Class 6')")
    parser.add_argument("--subject", type=str, default=None, help="Filter by subject (e.g. 'Science')")
    parser.add_argument("--limit", type=int, default=10, help="Maximum modules to generate")
    parser.add_argument("--delay", type=float, default=1.0, help="Seconds to delay between calls")
    parser.add_argument("--force", action="store_true", help="Force re-generation even if completed before")

    args = parser.parse_args()
    init_db()
    db = SessionLocal()
    gateway = LLMGateway()
    retriever = get_default_retriever()
    progress = load_progress()

    query = db.query(Course)
    if args.grade:
        query = query.filter(Course.grade == args.grade)
    if args.subject:
        query = query.filter(Course.subject.ilike(args.subject))

    courses = query.all()
    target_modules = []

    for c in courses:
        for m in c.modules:
            # Check if module already drafted
            has_drafted_lessons = any(l.status in ("draft", "approved", "published") for l in m.lessons)
            if has_drafted_lessons and not args.force:
                continue

            if not args.force and m.id in progress.get("completed", {}):
                continue

            target_modules.append((c, m))

    print(f"Found {len(target_modules)} candidate module(s) for draft generation.")
    if not target_modules:
        print("All candidate modules are already drafted or complete.")
        return

    processed = 0
    for idx, (course, module) in enumerate(target_modules[:args.limit]):
        print(f"[{idx+1}/{min(len(target_modules), args.limit)}] Processing {course.grade} {course.subject} - Module '{module.title}'...")
        res = generate_module_draft(
            course_id=course.id,
            module_id=module.id,
            db=db,
            gateway=gateway,
            retriever=retriever,
        )

        status = res.get("status")
        if status == "draft_generated":
            print(f"   ✓ Draft generated (3 lessons created, needs teacher review)")
            progress["completed"][module.id] = {
                "course_id": course.id,
                "title": module.title,
                "grade": course.grade,
                "subject": course.subject,
                "timestamp": datetime.utcnow().isoformat(),
            }
            if module.id in progress.get("needs_sources", {}):
                del progress["needs_sources"][module.id]
        elif status == "outline":
            print(f"   ℹ Grounding check: {res.get('message')}")
            progress["needs_sources"][module.id] = {
                "course_id": course.id,
                "title": module.title,
                "grade": course.grade,
                "subject": course.subject,
                "timestamp": datetime.utcnow().isoformat(),
            }
        else:
            print(f"   ✗ Generation error: {res.get('error')}")
            progress["failed"][module.id] = {
                "course_id": course.id,
                "title": module.title,
                "error": res.get("error"),
                "timestamp": datetime.utcnow().isoformat(),
            }

        save_progress(progress)
        processed += 1
        time.sleep(args.delay)

    print(f"\nBatch generation completed. Total processed: {processed}")
    print(f"Progress recorded in {PROGRESS_FILE}")


if __name__ == "__main__":
    main()
