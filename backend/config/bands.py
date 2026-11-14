"""Age bands and pedagogical configuration for Classes 3 to 10."""
from typing import Dict, List, Any


AGE_BANDS: Dict[str, Dict[str, Any]] = {
    "junior": {
        "name": "Junior Explorers",
        "grades": ["Class 3", "Class 4", "Class 5"],
        "age_range": "8 - 11 years",
        "reading_level_limit": 12,  # Max average words per sentence
        "subjects": ["Maths", "English", "EVS"],
        "mascot_size": "large",
        "theme": "playful",
        "tone": "Warm, cheerful, highly encouraging with tiny real-world analogies and short sentences.",
        "question_style": "Picture-like, direct, friendly wording with immediate positive feedback.",
        "games": ["ninja", "word", "bughunt"],
    },
    "middle": {
        "name": "Middle School Scholars",
        "grades": ["Class 6", "Class 7", "Class 8"],
        "age_range": "11 - 14 years",
        "reading_level_limit": 16,
        "subjects": ["Maths", "English", "Science", "Social Science"],
        "mascot_size": "medium",
        "theme": "calm",
        "tone": "Clear, structured, step-by-step logic, guiding curiosity and reasoning.",
        "question_style": "Multi-step conceptual problems, applied examples, progressive hints.",
        "games": ["ninja", "word", "bughunt"],
    },
    "senior": {
        "name": "Senior Academy",
        "grades": ["Class 9", "Class 10"],
        "age_range": "14 - 16 years",
        "reading_level_limit": 20,
        "subjects": ["Maths", "English", "Science", "Social Science"],
        "science_units": ["Physics", "Chemistry", "Biology"],
        "mascot_size": "small",
        "theme": "focused",
        "tone": "Concise, precise, exam-aware, strictly grounded in textbook sources with exact citations.",
        "question_style": "CBSE board-style MCQs, assertion-reasoning, case studies, formula derivations.",
        "games": ["sprint", "ninja", "word"],
    },
}

ALL_GRADES: List[str] = [
    "Class 3", "Class 4", "Class 5",
    "Class 6", "Class 7", "Class 8",
    "Class 9", "Class 10",
]


def normalize_grade(grade: str) -> str:
    """Normalize grade strings like 'class 3', 'Class 3', '3', 'grade 3' to 'Class 3'."""
    if not grade:
        return "Class 3"
    g = grade.strip()
    digits = "".join(ch for ch in g if ch.isdigit())
    if digits and 3 <= int(digits) <= 10:
        return f"Class {digits}"
    return "Class 3"


def get_band_for_grade(grade: str) -> str:
    """Return 'junior', 'middle', or 'senior' for a given grade."""
    norm = normalize_grade(grade)
    for band_key, band_data in AGE_BANDS.items():
        if norm in band_data["grades"]:
            return band_key
    return "junior"


def get_subjects_for_grade(grade: str) -> List[str]:
    """Return available school subjects for the student's grade."""
    band_key = get_band_for_grade(grade)
    return AGE_BANDS[band_key]["subjects"]


def get_reading_limit(grade: str) -> int:
    """Return maximum average sentence word count for the grade."""
    band_key = get_band_for_grade(grade)
    return AGE_BANDS[band_key]["reading_level_limit"]


def get_previous_grade(grade: str) -> str | None:
    """Return previous grade for revision mode (e.g. Class 9 -> Class 8), or None if Class 3."""
    norm = normalize_grade(grade)
    try:
        idx = ALL_GRADES.index(norm)
        if idx > 0:
            return ALL_GRADES[idx - 1]
    except ValueError:
        pass
    return None

