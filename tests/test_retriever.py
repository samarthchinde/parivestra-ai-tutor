"""Unit tests for BM25 retriever and chunking."""
from backend.rag.retriever import Chunk, BM25Retriever, get_default_retriever


def test_bm25_retriever_custom_chunks():
    chunks = [
        Chunk(
            id="c1",
            title="Variables in Python",
            subject="Python",
            topic="Variables",
            content="Variables store data values dynamically in Python without declaring types.",
        ),
        Chunk(
            id="c2",
            title="Lists in Python",
            subject="Python",
            topic="Lists",
            content="Lists are mutable ordered collections defined with square brackets.",
        ),
        Chunk(
            id="c3",
            title="Computer Networking Basics",
            subject="Networks",
            topic="Basics",
            content="Computer networks connect devices using IP addresses and routers.",
        ),
    ]

    retriever = BM25Retriever(chunks=chunks)
    results = retriever.retrieve("How are variables declared in Python?", top_k=2)

    assert len(results) >= 1
    top_chunk, score = results[0]
    assert top_chunk.id == "c1"
    assert score > 0.0


def test_bm25_retriever_subject_filtering():
    chunks = [
        Chunk(id="py1", title="Python OOP", subject="Python", topic="OOP", content="Classes and objects in Python."),
        Chunk(id="java1", title="Java OOP", subject="Java", topic="OOP", content="Classes and objects in Java."),
    ]
    retriever = BM25Retriever(chunks=chunks)
    results = retriever.retrieve("Classes and objects", top_k=2, subject="Java")

    assert len(results) == 1
    assert results[0][0].id == "java1"


def test_default_retriever_loads_knowledge_base():
    retriever = get_default_retriever()
    assert len(retriever.chunks) > 5
    # Query something fundamental
    res = retriever.retrieve("Python functions def", top_k=1)
    assert len(res) == 1
    assert "py_func_08" in res[0][0].id or "topic_python" in res[0][0].id or "Function" in res[0][0].title

