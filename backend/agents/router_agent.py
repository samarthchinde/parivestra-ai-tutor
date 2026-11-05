"""Router Agent: Classifies student queries into intent categories."""
import re
from typing import Literal, Optional, Union
from pydantic import BaseModel, Field

from backend.llm.gateway import LLMGateway

RouteCategory = Literal["concept_question", "practice_request", "progress_question", "off_topic"]


class RouterInput(BaseModel):
    message: str = Field(..., description="Student input text")


class RouterOutput(BaseModel):
    category: RouteCategory = Field(..., description="Classified intent category")
    confidence: float = Field(default=1.0, description="Classification confidence (0.0 - 1.0)")
    reason: str = Field(default="rule_based", description="Explanation of classification decision")


class RouterAgent:
    """Classifies user messages using deterministic rules, falling back to LLM."""

    PRACTICE_PATTERNS = [
        r"\b(practice|quiz|mcq|test me|test my knowledge|generate question|questions|exercise)\b",
        r"\b(give me a question|give me a quiz|solve problem)\b",
    ]

    PROGRESS_PATTERNS = [
        r"\b(progress|my progress|score|scores|stats|weakest|weak topics?|how am i doing|mastery|revision)\b",
        r"\b(what should i study|what should i revise|review my progress|my results)\b",
    ]

    CONCEPT_PATTERNS = [
        r"^(what|why|how|explain|define|tell me about|difference between|can you explain)\b",
        r"\b(python|variable|function|list|tuple|dict|oop|class|loop|recursion|algorithm|networking|java|machine learning|ai)\b",
        r"\b(syntax|error|bug|return value|parameter|argument|pointer)\b",
    ]

    OFF_TOPIC_PATTERNS = [
        r"\b(weather|movie|cricket|football|president|celebrity|recipe|restaurant|song|joke)\b",
        r"^(hi|hello|hey|good morning|good afternoon|good evening|bye|thanks|thank you)$",
    ]

    def __init__(self, gateway: Optional[LLMGateway] = None):
        self.gateway = gateway or LLMGateway()

    def route(self, input_data: Union[RouterInput, dict]) -> RouterOutput:
        if isinstance(input_data, dict):
            input_data = RouterInput(**input_data)
        msg = input_data.message.strip().lower()

        # 1. Practice patterns
        for pattern in self.PRACTICE_PATTERNS:
            if re.search(pattern, msg):
                return RouterOutput(
                    category="practice_request",
                    confidence=0.95,
                    reason=f"Matched practice pattern: {pattern}",
                )

        # 2. Progress patterns
        for pattern in self.PROGRESS_PATTERNS:
            if re.search(pattern, msg):
                return RouterOutput(
                    category="progress_question",
                    confidence=0.95,
                    reason=f"Matched progress pattern: {pattern}",
                )

        # 3. Off topic patterns
        for pattern in self.OFF_TOPIC_PATTERNS:
            if re.search(pattern, msg):
                return RouterOutput(
                    category="off_topic",
                    confidence=0.90,
                    reason=f"Matched off-topic pattern: {pattern}",
                )

        # 4. Concept patterns
        for pattern in self.CONCEPT_PATTERNS:
            if re.search(pattern, msg):
                return RouterOutput(
                    category="concept_question",
                    confidence=0.90,
                    reason=f"Matched concept pattern: {pattern}",
                )

        # 5. Fallback to LLM if ambiguous
        try:
            prompt = (
                "You are an intent classifier for an educational AI tutor.\n"
                "Classify the student's message into EXACTLY ONE category:\n"
                "- concept_question: asking to learn, understand, or clarify an academic topic.\n"
                "- practice_request: asking for quiz, practice questions, or test.\n"
                "- progress_question: asking about their performance, scores, or weak areas.\n"
                "- off_topic: chit-chat, greetings, or unrelated to studies.\n\n"
                f"Student message: \"{input_data.message}\"\n\n"
                "Respond with ONLY the category name."
            )
            raw = self.gateway.chat([{"role": "user", "content": prompt}], max_tokens=15, temperature=0.0)
            raw_clean = raw.strip().lower()

            for cat in ["concept_question", "practice_request", "progress_question", "off_topic"]:
                if cat in raw_clean:
                    return RouterOutput(
                        category=cat,  # type: ignore
                        confidence=0.85,
                        reason="Classified by LLM fallback",
                    )
        except Exception:
            pass

        # Default fallback
        return RouterOutput(
            category="concept_question",
            confidence=0.6,
            reason="Default fallback to concept question",
        )
