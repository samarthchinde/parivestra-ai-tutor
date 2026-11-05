"""Grader Agent: Grades MCQ answers deterministically in code, with LLM explanations for mistakes."""
from typing import List, Optional, Union
from pydantic import BaseModel, Field

from backend.llm.gateway import LLMGateway


class GradeInput(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    selected_answer: str
    topic: Optional[str] = None


class GradeOutput(BaseModel):
    is_correct: bool
    correct_answer: str
    selected_answer: str
    explanation: str


class GraderAgent:
    """Grades answers strictly in deterministic Python code."""

    def __init__(self, gateway: Optional[LLMGateway] = None):
        self.gateway = gateway or LLMGateway()

    def grade(self, input_data: Union[GradeInput, dict]) -> GradeOutput:
        if isinstance(input_data, dict):
            input_data = GradeInput(**input_data)
        sel = input_data.selected_answer.strip()
        corr = input_data.correct_answer.strip()

        # Grade in code: exact or case-insensitive match
        is_correct = sel.lower() == corr.lower()

        if is_correct:
            return GradeOutput(
                is_correct=True,
                correct_answer=corr,
                selected_answer=sel,
                explanation=f"Excellent! '{corr}' is indeed the correct answer.",
            )

        # Answer was incorrect: generate concise explanation using LLM
        explanation = f"That's incorrect. You selected '{sel}', but the correct answer is '{corr}'."
        try:
            prompt = (
                f"Question: \"{input_data.question}\"\n"
                f"Options: {', '.join(input_data.options)}\n"
                f"Student selected: \"{sel}\"\n"
                f"Correct answer: \"{corr}\"\n\n"
                "In 1 to 2 encouraging sentences, explain why the correct answer is right and why the chosen option is wrong."
            )
            llm_exp = self.gateway.chat([{"role": "user", "content": prompt}], max_tokens=120, temperature=0.2)
            if llm_exp and len(llm_exp.strip()) > 10:
                explanation = llm_exp.strip()
        except Exception:
            pass

        return GradeOutput(
            is_correct=False,
            correct_answer=corr,
            selected_answer=sel,
            explanation=explanation,
        )
