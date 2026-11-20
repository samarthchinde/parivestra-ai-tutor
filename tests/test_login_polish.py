"""Unit and integration tests for Login Polish: Multi-Role Registration,
Link Codes, Password/PIN Validation, and Parent Boundary Enforcement.
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request, Response
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.models import User, Class, AuthSession, ParentChildLink, ParentLinkCode
from backend.auth.security import hash_secret, hash_token
from backend.routes.auth_router import (
    register_student,
    register_teacher,
    register_parent,
    check_username_available,
    StudentRegisterRequest,
    TeacherRegisterRequest,
    ParentRegisterRequest,
)
from backend.routes.parent_router import (
    link_child,
    list_linked_children,
    get_child_report_card,
    get_child_progress,
    LinkChildRequest,
)
from backend.routes.teacher_router import (
    create_link_code,
    list_link_codes,
    CreateLinkCodeRequest,
)


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
def login_test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    # Seed Teacher
    teacher = User(
        id="teacher_sharma",
        username="ms_sharma",
        email="ms_sharma@school.edu",
        role="teacher",
        name="Ms. Sharma",
        password_hash=hash_secret("teach123"),
        grade="Class 3",
        active=True,
    )
    db.add(teacher)

    # Seed Class
    cls = Class(
        id="cls_3a",
        name="Class 3-A Explorers",
        grade="Class 3",
        section="A",
        join_code="PARI-3A",
        teacher_id="teacher_sharma",
        allow_grade_switch=True,
    )
    db.add(cls)

    # Seed existing student
    kid3 = User(
        id="student_kid3",
        username="kid3",
        name="Kid Three",
        display_name="Kid Three",
        role="student",
        grade="Class 3",
        default_grade="Class 3",
        class_id="cls_3a",
        pin_hash=hash_secret("8392"),
        password_hash=hash_secret("8392"),
        active=True,
    )
    db.add(kid3)

    db.commit()
    yield db
    db.close()


# ========================================================
# 1. Username Availability
# ========================================================
def test_username_available(login_test_db):
    req = make_request()
    res1 = check_username_available("cool_tiger", req, login_test_db)
    assert res1["available"] is True

    # Already taken
    res2 = check_username_available("kid3", req, login_test_db)
    assert res2["available"] is False
    assert "already taken" in res2["reason"].lower()

    # Profanity
    res3 = check_username_available("stupid_bot", req, login_test_db)
    assert res3["available"] is False

    # Email
    res4 = check_username_available("kid@gmail.com", req, login_test_db)
    assert res4["available"] is False


# ========================================================
# 2. Student Self-Registration
# ========================================================
def test_student_registration_junior(login_test_db):
    req = make_request(client_ip="10.0.0.1")
    payload = StudentRegisterRequest(
        username="ananya_3",
        secret="8392",
        confirm_secret="8392",
        grade="Class 3",
        avatar="fox",
        display_name="Ananya",
    )
    res = register_student(payload, Response(), req, login_test_db)
    assert res["status"] == "ok"
    assert res["user"]["username"] == "ananya_3"
    assert res["user"]["role"] == "student"
    assert res["user"]["avatar"] == "fox"
    assert "token" in res

    # Verify persisted in DB
    created = login_test_db.query(User).filter(User.username == "ananya_3").first()
    assert created is not None
    assert created.role == "student"


def test_student_registration_weak_pin_rejected(login_test_db):
    req = make_request(client_ip="10.0.0.2")
    # Sequential 1234
    with pytest.raises(HTTPException) as exc1:
        register_student(
            StudentRegisterRequest(username="bob_3", secret="1234", grade="Class 3"),
            Response(), req, login_test_db
        )
    assert exc1.value.status_code == 400
    assert "guess" in exc1.value.detail.lower() or "consecutive" in exc1.value.detail.lower()

    # Repeated 0000
    with pytest.raises(HTTPException) as exc2:
        register_student(
            StudentRegisterRequest(username="bob_3", secret="0000", grade="Class 3"),
            Response(), req, login_test_db
        )
    assert exc2.value.status_code == 400
    assert "repeated" in exc2.value.detail.lower() or "simple" in exc2.value.detail.lower()


def test_student_registration_middle_password(login_test_db):
    req = make_request(client_ip="10.0.0.3")
    payload = StudentRegisterRequest(
        username="arjun_ai",
        secret="SuperSecret#2026",
        confirm_secret="SuperSecret#2026",
        grade="Class 7",
        avatar="robot",
    )
    res = register_student(payload, Response(), req, login_test_db)
    assert res["status"] == "ok"
    assert res["user"]["grade"] == "Class 7"


def test_student_registration_role_escalation_defense(login_test_db):
    req = make_request(client_ip="10.0.0.4")
    with pytest.raises(HTTPException) as exc:
        register_student(
            StudentRegisterRequest(username="sneaky", secret="8392", grade="Class 3", role="teacher"),
            Response(), req, login_test_db
        )
    assert exc.value.status_code == 400
    assert "role escalation is forbidden" in exc.value.detail.lower()


# ========================================================
# 3. Teacher Registration
# ========================================================
def test_teacher_registration(login_test_db):
    req = make_request(client_ip="10.0.0.5")
    # Valid invite
    payload = TeacherRegisterRequest(
        name="Mr. Vikram",
        email="vikram@school.edu",
        password="TeacherPass#2026",
        invite_code="TEACH-PARIVESTRA-2026",
    )
    res = register_teacher(payload, Response(), req, login_test_db)
    assert res["status"] == "ok"
    assert res["user"]["role"] == "teacher"
    assert res["user"]["display_name"] == "Mr. Vikram"

    # Invalid invite
    with pytest.raises(HTTPException) as exc_inv:
        register_teacher(
            TeacherRegisterRequest(
                name="Imposter",
                email="imposter@school.edu",
                password="TeacherPass#2026",
                invite_code="WRONG-CODE",
            ),
            Response(), req, login_test_db
        )
    assert exc_inv.value.status_code == 403


# ========================================================
# 4. Parent Registration, Link Codes, & Scoping
# ========================================================
def test_parent_registration_and_child_linking(login_test_db):
    req = make_request(client_ip="10.0.0.6")

    # Step 1: Register parent
    p_res = register_parent(
        ParentRegisterRequest(
            name="Sunita Rao",
            email="sunita@example.com",
            password="ParentPass#2026",
        ),
        Response(), req, login_test_db
    )
    assert p_res["status"] == "ok"
    assert p_res["user"]["role"] == "parent"

    parent_user = login_test_db.query(User).filter(User.email == "sunita@example.com").first()
    teacher_user = login_test_db.query(User).filter(User.username == "ms_sharma").first()
    dummy_sess = AuthSession(id="sess1", user_id=parent_user.id, token_hash="h1", expires_at=datetime.now(timezone.utc) + timedelta(days=1))

    # Step 2: Teacher generates link code for student kid3
    code_res = create_link_code(
        CreateLinkCodeRequest(student_id="student_kid3"),
        auth=(teacher_user, dummy_sess),
        db=login_test_db,
    )
    assert code_res["status"] == "ok"
    link_code = code_res["code"]
    assert link_code.startswith("LINK-")

    # Step 3: Parent links kid3
    link_res = link_child(
        LinkChildRequest(child_username="kid3", link_code=link_code),
        auth=(parent_user, dummy_sess),
        db=login_test_db,
    )
    assert link_res["status"] == "ok"
    assert "successfully linked" in link_res["message"].lower()

    # Step 4: Reusing the same link code fails (single-use defense)
    with pytest.raises(HTTPException) as exc_reuse:
        link_child(
            LinkChildRequest(child_username="kid3", link_code=link_code),
            auth=(parent_user, dummy_sess),
            db=login_test_db,
        )
    assert exc_reuse.value.status_code == 400
    assert "already been used" in exc_reuse.value.detail.lower()

    # Step 5: Parent lists linked children
    kids_res = list_linked_children(auth=(parent_user, dummy_sess), db=login_test_db)
    assert kids_res["status"] == "ok"
    assert len(kids_res["children"]) == 1
    assert kids_res["children"][0]["username"] == "kid3"

    # Step 6: Parent reads child's report card
    rc_res = get_child_report_card("student_kid3", auth=(parent_user, dummy_sess), db=login_test_db)
    assert rc_res["status"] == "ok"
    assert rc_res["student"]["username"] == "kid3"
    assert "practice" in rc_res
    assert "workbook" in rc_res


def test_parent_forbidden_from_unlinked_child(login_test_db):
    req = make_request(client_ip="10.0.0.7")
    p_res = register_parent(
        ParentRegisterRequest(name="Other Parent", email="other@example.com", password="OtherPass#2026"),
        Response(), req, login_test_db
    )
    other_parent = login_test_db.query(User).filter(User.email == "other@example.com").first()
    dummy_sess = AuthSession(id="sess2", user_id=other_parent.id, token_hash="h2", expires_at=datetime.now(timezone.utc) + timedelta(days=1))

    # Attempt to read kid3 report card without linking -> 403 Forbidden
    with pytest.raises(HTTPException) as exc_blocked:
        get_child_report_card("student_kid3", auth=(other_parent, dummy_sess), db=login_test_db)
    assert exc_blocked.value.status_code == 403
    assert "not authorized" in exc_blocked.value.detail.lower()

    # Attempt to read kid3 progress -> 403 Forbidden
    with pytest.raises(HTTPException) as exc_prog:
        get_child_progress("student_kid3", auth=(other_parent, dummy_sess), db=login_test_db)
    assert exc_prog.value.status_code == 403
