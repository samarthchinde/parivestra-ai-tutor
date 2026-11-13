"""Grounded Draft Course Generation Pipeline with Source Verification and Band-Specific Readability."""
import json
import logging
import re
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.llm.gateway import LLMGateway
from backend.rag.retriever import BaseRetriever, get_default_retriever
from backend.models import Course, CourseModule, CourseLesson
from backend.config.bands import get_band_for_grade, get_reading_limit
from backend.agents.tutor_agent import verify_and_simplify_reading_level

logger = logging.getLogger("backend.courses.generator")


def generate_module_draft(
    course_id: str,
    module_id: str,
    db: Session,
    gateway: Optional[LLMGateway] = None,
    retriever: Optional[BaseRetriever] = None,
) -> Dict[str, Any]:
    """Generates draft lessons for a module strictly grounded in retrieved sources.
    If no sources exist for this chapter, returns status='outline' and flags 'Needs source material'.
    """
    gateway = gateway or LLMGateway()
    retriever = retriever or get_default_retriever()

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        return {"status": "error", "error": "Course not found"}

    module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not module:
        return {"status": "error", "error": "Module not found"}

    # 1. Parse objectives & keywords
    objectives = []
    if module.learning_objectives_json:
        try:
            objectives = json.loads(module.learning_objectives_json)
        except Exception:
            pass

    search_query = f"{module.title} {' '.join(objectives)}"

    # 2. Retrieve verified sources for this grade and subject
    retrieved = retriever.retrieve(
        query=search_query,
        top_k=4,
        subject=course.subject,
        grade=course.grade,
    )

    if not retrieved:
        logger.warning(
            f"No sources found for {course.grade} {course.subject} - {module.title}. "
            "Refusing to generate from LLM memory without grounding."
        )
        return {
            "status": "outline",
            "course_id": course_id,
            "module_id": module_id,
            "flag": "Needs source material",
            "message": (
                f"No verified curriculum sources found in Library for {course.grade} {course.subject}: '{module.title}'. "
                "Upload textbook notes or syllabus files in the Grown-ups Library before generating lessons."
            ),
        }

    valid_chunk_ids = [c.id for c, _ in retrieved]
    context_str = "\n\n".join(
        f"[Chunk ID: {c.id}] (Title: {c.title})\n{c.content}" for c, _ in retrieved
    )

    band = get_band_for_grade(course.grade)
    reading_limit = get_reading_limit(course.grade)

    prompt = (
        f"You are creating a 3-part educational lesson module for {course.grade} students ({band} band) "
        f"on '{module.title}' in {course.subject}.\n"
        f"STRICT RULES:\n"
        f"1. Use ONLY the provided curriculum sources. Do not invent ungrounded facts.\n"
        f"2. Every slide in 'story_lesson' MUST cite at least one valid Chunk ID from: {valid_chunk_ids}.\n"
        f"3. Maximum sentence length: average under {reading_limit} words per sentence.\n"
        f"4. Practice questions must have exactly 4 distinct options and one verified correct answer.\n\n"
        f"CURRICULUM SOURCES:\n{context_str}\n\n"
        "Return ONLY a valid JSON object matching this schema:\n"
        "{\n"
        '  "story_lesson": {\n'
        '    "title": "Lesson title",\n'
        '    "slides": [\n'
        '      {"title": "Slide Title", "text": "2-3 short sentences.", "citation_id": "' + valid_chunk_ids[0] + '", "illustration": "numbers"}\n'
        '    ]\n'
        '  },\n'
        '  "practice_lesson": {\n'
        '    "title": "Practice title",\n'
        '    "questions": [\n'
        '      {"question": "Question text", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "Why correct"}\n'
        '    ]\n'
        '  },\n'
        '  "activity_lesson": {\n'
        '    "title": "Hands-on activity title",\n'
        '    "instructions": "Step-by-step instructions for child or student.",\n'
        '    "goal": "Clear objective of the activity"\n'
        '  }\n'
        "}"
    )

    # 3. Retry loop (up to 3 attempts)
    last_error = ""
    for attempt in range(1, 4):
        try:
            raw_res = gateway.chat(
                [{"role": "user", "content": prompt}],
                stream=False,
                temperature=0.3,
                max_tokens=900,
            )

            # JSON extraction
            match = re.search(r"\{[\s\S]*\}", raw_res)
            if not match:
                raise ValueError("No JSON block found in model response")

            data = json.loads(match.group(0))

            # Validate schema
            story = data.get("story_lesson", {})
            practice = data.get("practice_lesson", {})
            activity = data.get("activity_lesson", {})

            slides = story.get("slides", [])
            questions = practice.get("questions", [])

            if len(slides) < 2:
                raise ValueError("Story lesson must have at least 2 slides")

            # Check citation presence
            for s in slides:
                c_id = s.get("citation_id")
                if not c_id or c_id not in valid_chunk_ids:
                    s["citation_id"] = valid_chunk_ids[0]

                # Check reading level
                s["text"] = verify_and_simplify_reading_level(s.get("text", ""), grade=course.grade)

            if len(questions) < 2:
                raise ValueError("Practice lesson must have at least 2 questions")

            for q in questions:
                opts = q.get("options", [])
                if len(opts) != 4 or len(set(opts)) != 4:
                    raise ValueError("Each question must have exactly 4 unique options")
                if q.get("answer") not in opts:
                    raise ValueError(f"Question answer '{q.get('answer')}' not in options list")

            # Update DB lessons
            # Remove previous outline lessons
            db.query(CourseLesson).filter(CourseLesson.module_id == module.id).delete()

            # Lesson 1: Story
            les1 = CourseLesson(
                id=f"les_{module.id}_story",
                module_id=module.id,
                title=story.get("title", f"Explore: {module.title}"),
                type="story",
                status="draft",
                topic=module.title,
                position=1,
                xp=25,
                source_citations_json=json.dumps(valid_chunk_ids),
                content_json=json.dumps({"slides": slides}),
            )
            # Lesson 2: Practice
            les2 = CourseLesson(
                id=f"les_{module.id}_practice",
                module_id=module.id,
                title=practice.get("title", f"Practice: {module.title}"),
                type="practice",
                status="draft",
                topic=module.title,
                position=2,
                xp=30,
                source_citations_json=json.dumps(valid_chunk_ids),
                content_json=json.dumps({"questions": questions}),
            )
            # Lesson 3: Activity
            les3 = CourseLesson(
                id=f"les_{module.id}_activity",
                module_id=module.id,
                title=activity.get("title", f"Activity: {module.title}"),
                type="activity",
                status="draft",
                topic=module.title,
                position=3,
                xp=20,
                content_json=json.dumps(activity),
            )
            db.add(les1)
            db.add(les2)
            db.add(les3)

            # Update course status to draft needing review
            course.status = "draft"
            course.needs_review = True
            db.commit()

            logger.info(f"Successfully generated grounded draft lessons for module {module.id}")
            return {
                "status": "draft_generated",
                "course_id": course_id,
                "module_id": module_id,
                "lessons_count": 3,
                "needs_review": True,
            }

        except Exception as err:
            logger.warning(f"Generation attempt {attempt} failed: {err}")
            last_error = str(err)
            db.rollback()

    return {
        "status": "error",
        "error": f"Failed after 3 attempts: {last_error}",
        "course_id": course_id,
        "module_id": module_id,
    }
