"""Unit tests for RouterAgent classification rules."""
from backend.agents.router_agent import RouterAgent, RouterInput


def test_router_concept_questions():
    router = RouterAgent()
    samples = [
        "What is a variable in Python?",
        "Explain how recursion works",
        "How do functions return values?",
        "Difference between lists and tuples",
    ]
    for sample in samples:
        res = router.route(RouterInput(message=sample))
        assert res.category == "concept_question"


def test_router_practice_requests():
    router = RouterAgent()
    samples = [
        "I want to practice some MCQs",
        "Give me a quiz on Python lists",
        "Can you test my knowledge on loops?",
        "Generate practice questions for me",
    ]
    for sample in samples:
        res = router.route(RouterInput(message=sample))
        assert res.category == "practice_request"


def test_router_progress_questions():
    router = RouterAgent()
    samples = [
        "How is my progress looking?",
        "What are my weakest topics?",
        "Show my score and revision recommendation",
        "How am I doing so far?",
    ]
    for sample in samples:
        res = router.route(RouterInput(message=sample))
        assert res.category == "progress_question"


def test_router_off_topic():
    router = RouterAgent()
    samples = [
        "What is the weather outside?",
        "Tell me a joke about cats",
        "Who is the president of France?",
    ]
    for sample in samples:
        res = router.route(RouterInput(message=sample))
        assert res.category == "off_topic"

