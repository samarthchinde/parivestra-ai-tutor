import json
import pytest
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

from api import (
    get_courses,
    get_course_detail,
    get_lesson_content,
    complete_lesson,
    get_videos,
    get_story_detail,
    verify_admin,
    LessonCompleteRequest,
)
from backend.database import Base
from backend.models import User, Course, CourseModule, CourseLesson, VideoStory, Video
from backend.agents.tutor_agent import check_child_safety, verify_and_simplify_reading_level
from backend.config import ADMIN_KEY


@pytest.fixture
def kids_mock_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # Create student
    user = User(
        id="child_42",
        name="Little Explorer",
        display_name="Little Explorer",
        avatar="fox",
        grade="Class 3",
        xp=50,
        streak=2,
    )
    db.add(user)

    # Create approved course with module & lesson
    course1 = Course(
        id="c_test_01",
        title="Test Maths Safari",
        subject="Maths",
        grade="Class 3",
        description="Learn place value with Pari!",
        cover_key="maths",
        status="approved",
        needs_review=False,
    )
    db.add(course1)
    db.flush()

    mod1 = CourseModule(
        id="m_test_01",
        course_id=course1.id,
        title="Module 1: Numbers",
        position=1,
    )
    db.add(mod1)
    db.flush()

    les1 = CourseLesson(
        id="l_test_01",
        module_id=mod1.id,
        title="Place Value Lesson",
        type="story",
        topic="Numbers",
        position=1,
        xp=20,
        content_json=json.dumps({"slides": [{"title": "Number Fun", "text": "Digits 0 to 9."}]}),
    )
    db.add(les1)

    # Create draft course
    course_draft = Course(
        id="c_draft_01",
        title="Draft Science Quest",
        subject="EVS",
        grade="Class 3",
        description="Needs teacher review.",
        cover_key="evs",
        status="draft",
        needs_review=True,
    )
    db.add(course_draft)

    # Create sample approved story
    story1 = VideoStory(
        id="story_water_test",
        topic="Water Cycle",
        grade="Class 3",
        subject="EVS",
        scenes_json=json.dumps([
            {"scene_number": 1, "title": "Sunny Day", "text": "Sun shines on the lake."}
        ]),
        status="approved",
        needs_review=False,
    )
    db.add(story1)

    db.commit()
    return db


def test_child_safety_checks():
    """Verify child safety filter detects distress keywords without exposing raw child text."""
    safe_text = "Can you help me understand fractions and pizza?"
    assert check_child_safety(safe_text) is None

    unsafe_text = "I feel lonely and hurt inside"
    response = check_child_safety(unsafe_text)
    assert response is not None
    assert "talk with a grown-up you trust" in response

    bullying_text = "everyone at school bullies me"
    bullying_response = check_child_safety(bullying_text)
    assert bullying_response is not None
    assert "talk with a grown-up you trust" in bullying_response


def test_sentence_length_reading_level():
    """Verify reading-level check simplifies or truncates overlong adult sentences for Class 3-4."""
    short_sentence = "Roots drink water from the soil."
    simplified = verify_and_simplify_reading_level(short_sentence)
    assert "Roots drink water" in simplified

    long_sentence = (
        "The extraordinary multifaceted photosynthesis phenomenon fundamentally leverages "
        "electromagnetic radiation from our local star to synthesize glucose while discharging diatomic oxygen molecules."
    )
    simplified_long = verify_and_simplify_reading_level(long_sentence)
    assert len(simplified_long.split()) <= 13


def test_courses_api_endpoints(kids_mock_db):
    """Verify course syllabus, lesson content, and completion with XP rewards."""
    user = kids_mock_db.query(User).filter(User.id == "child_42").first()

    # 1. List courses (student view: only approved)
    data = get_courses(user=user, db=kids_mock_db)
    courses = data["courses"]
    assert len(courses) == 1
    assert courses[0]["id"] == "c_test_01"
    assert courses[0]["progress_percentage"] == 0

    # 2. Course detail
    detail = get_course_detail(course_id="c_test_01", user=user, db=kids_mock_db)
    assert detail["title"] == "Test Maths Safari"
    assert len(detail["modules"]) == 1
    assert len(detail["modules"][0]["lessons"]) == 1

    # 3. Lesson content
    lesson_data = get_lesson_content(course_id="c_test_01", lesson_id="l_test_01", user=user, db=kids_mock_db)
    assert lesson_data["id"] == "l_test_01"
    assert "slides" in lesson_data["content"]

    # 4. Complete lesson & check XP increase
    initial_xp = user.xp
    complete_res = complete_lesson(
        course_id="c_test_01",
        lesson_id="l_test_01",
        req=LessonCompleteRequest(score=100.0),
        user=user,
        db=kids_mock_db,
    )
    assert complete_res["status"] == "completed"
    assert complete_res["xp_awarded"] == 20
    assert user.xp == initial_xp + 20


def test_draft_visibility_with_admin_key(kids_mock_db):
    """Verify students cannot see drafts, but admin key reveals them."""
    user = kids_mock_db.query(User).filter(User.id == "child_42").first()

    # Student request without admin key -> only approved courses (count 1)
    student_res = get_courses(user=user, db=kids_mock_db)
    assert len(student_res["courses"]) == 1

    # Admin request with admin key -> approved + draft courses (count 2)
    admin_res = get_courses(x_admin_key=ADMIN_KEY, user=user, db=kids_mock_db)
    assert len(admin_res["courses"]) == 2
    assert any(c["id"] == "c_draft_01" for c in admin_res["courses"])


def test_story_player_endpoints(kids_mock_db):
    """Verify animated video stories retrieval and detail."""
    user = kids_mock_db.query(User).filter(User.id == "child_42").first()

    # Get media list
    media_data = get_videos(user=user, db=kids_mock_db)
    assert "stories" in media_data
    assert len(media_data["stories"]) == 1
    assert media_data["stories"][0]["id"] == "story_water_test"

    # Get detail
    story_detail = get_story_detail(story_id="story_water_test", db=kids_mock_db)
    assert story_detail["id"] == "story_water_test"
    assert len(story_detail["scenes"]) == 1


def test_verify_admin_authorization():
    """Verify admin key validator accepts correct key and raises 401 on missing/wrong key."""
    # Correct key
    assert verify_admin(x_admin_key=ADMIN_KEY) is True

    # Missing key
    with pytest.raises(HTTPException) as exc:
        verify_admin(x_admin_key=None)
    assert exc.value.status_code == 401

    # Wrong key
    with pytest.raises(HTTPException) as exc_wrong:
        verify_admin(x_admin_key="invalid_password")
    assert exc_wrong.value.status_code == 401
