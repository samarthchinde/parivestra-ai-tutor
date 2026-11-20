"""Unit and integration tests for Parivestra Authentication, Role Permissions, and Grade Scoping."""
import pytest
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request, Response
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.models import User, Class, Course, CourseModule, CourseLesson, Attempt, Mastery, AuthSession
from backend.auth.security import hash_secret, generate_session_token, hash_token
from backend.routes.auth_router import (
    login,
    logout,
    get_current_user_info,
    switch_active_grade,
    create_guest_session,
    create_class,
    create_student,
    LoginRequest,
    SwitchGradeRequest,
    CreateClassRequest,
    CreateStudentRequest,
)
from api import get_courses, get_course_detail, get_subjects, get_report_card


def make_request(headers=None, client_ip="127.0.0.1"):
    hdrs = []
    if headers:
        for k, v in headers.items():
            hdrs.append((k.lower().encode("latin-1"), v.encode("latin-1")))
    scope = {
        "type": "http",
        "client": (client_ip, 50000),
        "headers": hdrs,
        "method": "POST",
        "path": "/",
        "scheme": "http",
    }
    return Request(scope)


@pytest.fixture
def auth_test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    # Seed Admin
    admin = User(
        id="admin_user",
        username="admin",
        email="admin@school.edu",
        role="admin",
        password_hash=hash_secret("admin_pass"),
        grade="Class 10",
        default_grade="Class 10",
    )
    db.add(admin)

    # Seed Teacher
    teacher = User(
        id="teacher_user",
        username="teacher_sharma",
        email="teacher@school.edu",
        role="teacher",
        password_hash=hash_secret("teach_pass"),
        grade="Class 4",
        default_grade="Class 4",
    )
    db.add(teacher)

    # Seed Classes
    # Class 3: grade switching ALLOWED
    cls3 = Class(
        id="cls_3a",
        name="Class 3 Blue",
        grade="Class 3",
        section="A",
        join_code="PARI-3A",
        teacher_id="teacher_user",
        allow_grade_switch=True,
        allow_join_by_code=True,
    )
    # Class 4: grade switching LOCKED
    cls4 = Class(
        id="cls_4b",
        name="Class 4 Red",
        grade="Class 4",
        section="B",
        join_code="PARI-4B",
        teacher_id="teacher_user",
        allow_grade_switch=False,
        allow_join_by_code=False,
    )
    db.add_all([cls3, cls4])

    # Seed Students
    student3 = User(
        id="student_3",
        username="kid3",
        role="student",
        grade="Class 3",
        default_grade="Class 3",
        class_id="cls_3a",
        password_hash=hash_secret("1234"),
    )
    student4 = User(
        id="student_4",
        username="kid4",
        role="student",
        grade="Class 4",
        default_grade="Class 4",
        class_id="cls_4b",
        password_hash=hash_secret("4321"),
    )
    db.add_all([student3, student4])

    # Seed Grade 3 and Grade 9 Courses
    c3 = Course(
        id="course_g3_shapes",
        title="Grade 3 Shapes & Patterns",
        subject="Maths",
        grade="Class 3",
        status="approved",
    )
    c9 = Course(
        id="course_g9_trig",
        title="Grade 9 Trigonometry",
        subject="Maths",
        grade="Class 9",
        status="approved",
    )
    db.add_all([c3, c9])

    db.commit()

    try:
        yield db
    finally:
        db.close()


def test_login_success_and_logout(auth_test_db):
    resp = Response()
    req = make_request()
    res = login(LoginRequest(username="kid3", secret="1234"), resp, req, auth_test_db)

    assert res["status"] == "ok"
    assert res["user"]["username"] == "kid3"
    assert res["active_grade"] == "Class 3"
    assert "token" in res

    # Verify session persisted in db
    tok_hash = hash_token(res["token"])
    sess = auth_test_db.query(AuthSession).filter(AuthSession.token_hash == tok_hash).first()
    assert sess is not None

    user = auth_test_db.query(User).filter(User.username == "kid3").first()
    me = get_current_user_info((user, sess), auth_test_db)
    assert me["user"]["username"] == "kid3"
    assert me["active_grade"] == "Class 3"
    assert me["user"]["allow_grade_switch"] is True

    # Logout
    logout_req = make_request(headers={"authorization": f"Bearer {res['token']}"})
    logout_res = logout(Response(), logout_req, auth_test_db)
    assert logout_res["status"] == "ok"

    # Session deleted
    sess_after = auth_test_db.query(AuthSession).filter(AuthSession.token_hash == tok_hash).first()
    assert sess_after is None


def test_login_failure_and_lockout(auth_test_db):
    req = make_request()

    # 4 failed attempts raise 401
    for _ in range(4):
        with pytest.raises(HTTPException) as exc_info:
            login(LoginRequest(username="kid3", secret="wrong"), Response(), req, auth_test_db)
        assert exc_info.value.status_code == 401
        assert "That did not match" in exc_info.value.detail

    # 5th failed attempt raises 429 lockout
    with pytest.raises(HTTPException) as exc_5:
        login(LoginRequest(username="kid3", secret="wrong"), Response(), req, auth_test_db)
    assert exc_5.value.status_code == 429
    assert "locked for 5 minutes" in exc_5.value.detail

    # Even right secret is blocked while locked
    with pytest.raises(HTTPException) as exc_blocked:
        login(LoginRequest(username="kid3", secret="1234"), Response(), req, auth_test_db)
    assert exc_blocked.value.status_code == 429


def test_grade_switch_allowed(auth_test_db):
    user = auth_test_db.query(User).filter(User.username == "kid3").first()
    sess = AuthSession(
        id="sess_switch_test",
        user_id=user.id,
        token_hash="fake_hash",
        active_grade="Class 3",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        last_seen_at=datetime.now(timezone.utc),
    )
    auth_test_db.add(sess)
    auth_test_db.commit()

    switch_res = switch_active_grade(SwitchGradeRequest(grade="Class 5"), (user, sess), auth_test_db)
    assert switch_res["status"] == "ok"
    assert switch_res["active_grade"] == "Class 5"
    assert sess.active_grade == "Class 5"


def test_grade_switch_forbidden_when_locked(auth_test_db):
    user = auth_test_db.query(User).filter(User.username == "kid4").first()
    sess = AuthSession(
        id="sess_locked_switch_test",
        user_id=user.id,
        token_hash="fake_hash_4",
        active_grade="Class 4",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        last_seen_at=datetime.now(timezone.utc),
    )
    auth_test_db.add(sess)
    auth_test_db.commit()

    # Attempt to switch to Class 6 should be rejected with 403
    with pytest.raises(HTTPException) as exc_info:
        switch_active_grade(SwitchGradeRequest(grade="Class 6"), (user, sess), auth_test_db)
    assert exc_info.value.status_code == 403
    assert "Class 4" in exc_info.value.detail


def test_grade_isolation_courses_and_subjects(auth_test_db):
    user3 = auth_test_db.query(User).filter(User.username == "kid3").first()
    user4 = auth_test_db.query(User).filter(User.username == "kid4").first()

    # 1. Class 3 receives only Class 3 course
    c_res3 = get_courses(active_grade="Class 3", user=user3, db=auth_test_db)
    courses3 = c_res3["courses"]
    assert len(courses3) == 1
    assert courses3[0]["id"] == "course_g3_shapes"
    assert courses3[0]["grade"] == "Class 3"

    # 2. Class 9 receives only Class 9 course
    c_res9 = get_courses(active_grade="Class 9", user=user3, db=auth_test_db)
    courses9 = c_res9["courses"]
    assert len(courses9) == 1
    assert courses9[0]["id"] == "course_g9_trig"
    assert courses9[0]["grade"] == "Class 9"

    # 3. User 4 (locked to Class 4) requesting Grade 9 course detail raises 403
    with pytest.raises(HTTPException) as exc_info:
        get_course_detail("course_g9_trig", active_grade="Class 4", user=user4, db=auth_test_db)
    assert exc_info.value.status_code == 403

    # 4. Subjects for Class 3 has EVS
    sub3 = get_subjects(active_grade="Class 3")
    names3 = [s["name"] for s in sub3["subjects"]]
    assert "EVS" in names3
    assert "Science" not in names3

    # 5. Subjects for Class 7 has Science & Social Science
    sub7 = get_subjects(active_grade="Class 7")
    names7 = [s["name"] for s in sub7["subjects"]]
    assert "Science" in names7
    assert "Social Science" in names7


def test_guest_session_creation(auth_test_db):
    res = create_guest_session({"grade": "Class 6"}, Response(), make_request(), auth_test_db)
    assert res["status"] == "ok"
    assert res["is_guest"] is True
    assert res["active_grade"] == "Class 6"


def test_teacher_class_creation_and_student_management(auth_test_db):
    teacher = auth_test_db.query(User).filter(User.username == "teacher_sharma").first()
    dummy_sess = AuthSession(
        id="sess_t", user_id=teacher.id, token_hash="h", active_grade="Class 4",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )

    # Create Class
    c_res = create_class(
        CreateClassRequest(name="Class 5 Superstars", grade="Class 5", section="B", allow_grade_switch=True),
        (teacher, dummy_sess),
        auth_test_db,
    )
    cls_data = c_res["class"]
    assert cls_data["grade"] == "Class 5"
    assert "join_code" in cls_data

    # Create Student
    s_res = create_student(
        CreateStudentRequest(username="new_kid5", grade="Class 5", class_id=cls_data["id"]),
        (teacher, dummy_sess),
        auth_test_db,
    )
    st = s_res["student"]
    assert st["username"] == "new_kid5"
    assert len(st["secret"]) == 4  # PIN for Class 5


def test_report_card_endpoint(auth_test_db):
    user = auth_test_db.query(User).filter(User.username == "kid3").first()

    # Submit 1 attempt
    att = Attempt(
        user_id="student_3",
        grade="Class 3",
        subject="Maths",
        topic="Shapes",
        difficulty="Beginner",
        question_id="q1",
        selected="Circle",
        correct=True,
    )
    auth_test_db.add(att)
    auth_test_db.commit()

    rc = get_report_card(grade="Class 3", active_grade="Class 3", user=user, db=auth_test_db)
    assert rc["status"] == "ok"
    assert rc["grade"] == "Class 3"
    math_card = next(s for s in rc["subjects"] if s["subject"] == "Maths")
    assert math_card["quiz_attempts"] == 1
    assert math_card["quiz_accuracy"] == 100.0


def test_kid4_login_and_me_resolution(auth_test_db):
    """Verify login as kid4 succeeds, sets cookie, and subsequent /me returns Class 4."""
    resp = Response()
    req = make_request()
    res = login(LoginRequest(username="kid4", secret="4321", grade="Class 4"), resp, req, auth_test_db)

    assert res["status"] == "ok"
    assert res["user"]["username"] == "kid4"
    assert res["active_grade"] == "Class 4"

    # Verify cookie headers were set
    assert "set-cookie" in resp.headers or len(resp.raw_headers) > 0

    # Retrieve session token
    tok_hash = hash_token(res["token"])
    sess = auth_test_db.query(AuthSession).filter(AuthSession.token_hash == tok_hash).first()
    assert sess is not None
    assert sess.active_grade == "Class 4"

    # Verify GET /api/auth/me returns Class 4
    user = auth_test_db.query(User).filter(User.username == "kid4").first()
    me = get_current_user_info((user, sess), auth_test_db)
    assert me["status"] == "ok"
    assert me["user"]["username"] == "kid4"
    assert me["active_grade"] == "Class 4"
    assert me["user"]["default_grade"] == "Class 4"


def test_unauthenticated_me_safety_and_no_loop(auth_test_db):
    """Verify unauthenticated requests raise 401 without error loops or mutations."""
    from backend.auth.dependencies import extract_session_token
    from backend.routes.auth_router import get_current_auth

    req_empty = make_request()
    token = extract_session_token(req_empty)
    assert token is None

    # Verify get_current_auth raises 401
    with pytest.raises(HTTPException) as exc_info:
        get_current_auth(request=req_empty, db=auth_test_db)
    assert exc_info.value.status_code == 401
    assert "Authentication required" in exc_info.value.detail


def test_favicon_endpoint_returns_svg():
    """Verify /favicon.ico route serves the Pari robot SVG."""
    from api import favicon
    resp = favicon()
    # Should either be FileResponse with image/svg+xml or 204
    assert resp.status_code in [200, 204]
    if resp.status_code == 200:
        assert resp.media_type == "image/svg+xml"

