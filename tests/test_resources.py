"""Tests for Institute Resource Library:
File validation, sanitization, extraction, BM25 indexing/unindexing, and admin authorization.
"""
from pathlib import Path
import tempfile
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend import config
from backend.agents.resource_service import (
    sanitize_filename,
    validate_file_meta,
    extract_text_from_file,
    chunk_text,
    index_resource,
    unindex_resource,
    MAX_FILE_SIZE_BYTES,
)
from backend.models import Base, ResourceModel, User
from backend.rag.retriever import BM25Retriever, Chunk


@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    user = User(id="res_user_1", name="Prof. Turing")
    db.add(user)
    db.commit()

    yield db
    db.close()


def test_validate_file_meta_extensions():
    # Valid extensions
    for name in ["notes.pdf", "guide.MD", "cheatsheet.txt"]:
        valid, ext, err = validate_file_meta(name, 1024)
        assert valid is True
        assert err is None

    # Invalid extensions
    for name in ["script.py", "malicious.exe", "bundle.zip", "run.sh"]:
        valid, ext, err = validate_file_meta(name, 1024)
        assert valid is False
        assert "Unsupported file type" in err


def test_validate_file_meta_size_limit():
    valid, _, _ = validate_file_meta("doc.pdf", 5 * 1024 * 1024)
    assert valid is True

    # 11 MB should exceed 10 MB limit
    invalid, _, err = validate_file_meta("doc.pdf", 11 * 1024 * 1024)
    assert invalid is False
    assert "exceeds maximum allowed 10 MB limit" in err


def test_sanitize_filename():
    assert sanitize_filename("../../etc/passwd") == "passwd"
    assert sanitize_filename("..\\..\\Windows\\System32\\cmd.exe") == "cmd.exe"
    assert sanitize_filename("normal_file.pdf") == "normal_file.pdf"
    assert sanitize_filename("file with spaces (1).txt") == "file with spaces _1_.txt"


def test_text_extraction_md_and_txt():
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)

        # 1. Text file
        txt_file = tmp_path / "sample.txt"
        txt_file.write_text("Python was created by Guido van Rossum.", encoding="utf-8")
        extracted_txt = extract_text_from_file(txt_file, "txt")
        assert "Guido van Rossum" in extracted_txt

        # 2. Markdown file
        md_file = tmp_path / "sample.md"
        md_file.write_text("# Python Functions\n\nDefines reusable blocks of code.", encoding="utf-8")
        extracted_md = extract_text_from_file(md_file, "md")
        assert "Python Functions" in extracted_md
        assert "reusable blocks of code" in extracted_md


def test_chunk_text():
    text = (
        "Paragraph 1: Object-oriented programming in Python uses classes.\n\n"
        "Paragraph 2: Encapsulation restricts direct access to some of an object's components.\n\n"
        "Paragraph 3: Polymorphism allows entities to be represented in different forms."
    )
    chunks = chunk_text(
        text=text,
        resource_id="res_oop_101",
        title="OOP Guide",
        subject="Python",
        topic="OOP",
        max_chunk_chars=120,
    )
    assert len(chunks) >= 2
    for c in chunks:
        assert c.subject == "Python"
        assert c.topic == "OOP"
        assert c.id.startswith("res_oop_101_")


def test_indexing_and_unindexing_bm25():
    with tempfile.TemporaryDirectory() as tmp_dir:
        doc_file = Path(tmp_dir) / "decorators.txt"
        doc_file.write_text(
            "Python decorators are callables used to modify or extend the behavior of functions.\n"
            "Common syntax uses the @decorator symbol above a function definition.",
            encoding="utf-8",
        )

        res = ResourceModel(
            id="res_test_decorators",
            title="Decorators Guide",
            subject="Python",
            topic="Decorators",
            file_type="txt",
            original_filename="decorators.txt",
            stored_path=str(doc_file),
            file_size=len(doc_file.read_bytes()),
            approved=True,
        )

        # Fresh retriever with 1 dummy chunk
        retriever = BM25Retriever(chunks=[
            Chunk(id="c0", title="Basic", subject="Python", topic="Basics", content="Basic python intro.")
        ])

        # 1. Before indexing: search for 'decorator' should not find decorators.txt
        res_before = retriever.retrieve("decorators syntax", top_k=3)
        assert not any(c.id.startswith("res_test_decorators") for c, _ in res_before)

        # 2. Index resource
        count = index_resource(res, retriever)
        assert count > 0

        # Search for 'decorator': must rank top
        res_after = retriever.retrieve("decorators syntax", top_k=3)
        assert any(c.id.startswith("res_test_decorators") for c, _ in res_after)

        # 3. Unindex resource
        unindex_resource("res_test_decorators", retriever)
        res_unindexed = retriever.retrieve("decorators syntax", top_k=3)
        assert not any(c.id.startswith("res_test_decorators") for c, _ in res_unindexed)


def test_admin_auth_and_permissions(test_db):
    from api import check_is_admin, require_admin
    from fastapi import HTTPException

    # Match against config.ADMIN_KEY
    valid_key = config.ADMIN_KEY
    assert check_is_admin(valid_key) is True
    assert check_is_admin("wrong_key_123") is False
    assert check_is_admin(None) is False
    assert check_is_admin("") is False

    # require_admin raises 403 on False
    assert require_admin(is_admin=True) is True
    with pytest.raises(HTTPException) as exc_info:
        require_admin(is_admin=False)
    assert exc_info.value.status_code == 403

