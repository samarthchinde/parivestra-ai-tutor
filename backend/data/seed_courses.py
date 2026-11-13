"""Seed sample Class 3 and 4 courses with interactive modules and lessons."""
import json
import logging
from sqlalchemy.orm import Session
from backend.models import Course, CourseModule, CourseLesson

logger = logging.getLogger("backend.seed_courses")


def seed_default_courses(db: Session):
    """Seed foundational Class 3 and Class 4 courses if not present."""
    count = db.query(Course).count()
    if count > 0:
        return

    logger.info("Seeding Class 3 and Class 4 sample courses...")

    sample_courses = [
        {
            "id": "c3_maths_numbers",
            "title": "Numbers & Place Value Safari",
            "subject": "Maths",
            "grade": "Class 3",
            "description": "Discover hundreds, tens, and ones with Pari on a fun number safari!",
            "cover_key": "maths",
            "status": "approved",
            "needs_review": True,
            "modules": [
                {
                    "id": "c3_m1_mod1",
                    "title": "Module 1: Meet the 3-Digit Numbers",
                    "position": 1,
                    "lessons": [
                        {
                            "id": "c3_m1_l1",
                            "title": "Place Value Adventure",
                            "type": "story",
                            "topic": "Numbers",
                            "position": 1,
                            "xp": 20,
                            "content_json": json.dumps({
                                "slides": [
                                    {
                                        "title": "The Number Kingdom",
                                        "text": "Every number is built from digits: 0, 1, 2, 3, 4, 5, 6, 7, 8, and 9.",
                                        "illustration": "numbers"
                                    },
                                    {
                                        "title": "Ones and Tens",
                                        "text": "When you have 10 single blocks, they snap together into one tall ten tower!",
                                        "illustration": "shapes"
                                    },
                                    {
                                        "title": "The Big Hundreds Block",
                                        "text": "Ten tall ten towers make a giant flat hundred square. In 345, the 3 means 300!",
                                        "illustration": "sun"
                                    }
                                ]
                            })
                        },
                        {
                            "id": "c3_m1_l2",
                            "title": "Place Value Practice",
                            "type": "practice",
                            "topic": "Numbers",
                            "position": 2,
                            "xp": 25,
                            "content_json": json.dumps({
                                "questions": [
                                    {
                                        "question": "In the number 425, what is the place value of the digit 2?",
                                        "options": ["20 (tens)", "2 (ones)", "200 (hundreds)", "0"],
                                        "answer": "20 (tens)"
                                    },
                                    {
                                        "question": "How many tens make one hundred?",
                                        "options": ["10 tens", "5 tens", "100 tens", "20 tens"],
                                        "answer": "10 tens"
                                    },
                                    {
                                        "question": "What is the largest 3-digit number?",
                                        "options": ["999", "100", "900", "1000"],
                                        "answer": "999"
                                    }
                                ]
                            })
                        },
                        {
                            "id": "c3_m1_l3",
                            "title": "Draw Your Number Tower",
                            "type": "activity",
                            "topic": "Numbers",
                            "position": 3,
                            "xp": 15,
                            "content_json": json.dumps({
                                "instructions": "Take a sheet of paper. Draw 3 tall towers for Hundreds, Tens, and Ones. Roll a dice 3 times to make your own 3-digit secret number!",
                                "goal": "Show your drawing to a parent or friend!"
                            })
                        }
                    ]
                },
                {
                    "id": "c3_m1_mod2",
                    "title": "Module 2: Adding Up Friendly Numbers",
                    "position": 2,
                    "lessons": [
                        {
                            "id": "c3_m1_l4",
                            "title": "Adding with Pari",
                            "type": "story",
                            "topic": "Addition",
                            "position": 1,
                            "xp": 20,
                            "content_json": json.dumps({
                                "slides": [
                                    {
                                        "title": "Putting Groups Together",
                                        "text": "Addition is combining groups. If Pari has 14 berries and finds 15 more, how many are there?",
                                        "illustration": "pari"
                                    },
                                    {
                                        "title": "Line Up the Columns",
                                        "text": "Always add the ones first: 4 + 5 = 9. Then add the tens: 1 + 1 = 2. Total: 29 berries!",
                                        "illustration": "sun"
                                    }
                                ]
                            })
                        },
                        {
                            "id": "c3_m1_l5",
                            "title": "Addition Speed Round",
                            "type": "practice",
                            "topic": "Addition",
                            "position": 2,
                            "xp": 25,
                            "content_json": json.dumps({
                                "questions": [
                                    {
                                        "question": "What is 24 + 13?",
                                        "options": ["37", "35", "47", "27"],
                                        "answer": "37"
                                    },
                                    {
                                        "question": "What is 50 + 40?",
                                        "options": ["90", "100", "80", "94"],
                                        "answer": "90"
                                    }
                                ]
                            })
                        }
                    ]
                }
            ]
        },
        {
            "id": "c4_maths_multiplication",
            "title": "Multiplication Fun & Equal Groups",
            "subject": "Maths",
            "grade": "Class 4",
            "description": "Learn the magic of multiplying numbers and solving fast puzzles!",
            "cover_key": "maths",
            "status": "approved",
            "needs_review": True,
            "modules": [
                {
                    "id": "c4_m2_mod1",
                    "title": "Module 1: The Magic of Groups",
                    "position": 1,
                    "lessons": [
                        {
                            "id": "c4_m2_l1",
                            "title": "Repeated Addition Magic",
                            "type": "story",
                            "topic": "Multiplication",
                            "position": 1,
                            "xp": 20,
                            "content_json": json.dumps({
                                "slides": [
                                    {
                                        "title": "Fast Adding!",
                                        "text": "Instead of saying 5 + 5 + 5 + 5, we say 4 times 5!",
                                        "illustration": "numbers"
                                    },
                                    {
                                        "title": "The Product",
                                        "text": "4 times 5 equals 20. Both give the exact same answer!",
                                        "illustration": "clock"
                                    }
                                ]
                            })
                        },
                        {
                            "id": "c4_m2_l2",
                            "title": "Multiplication Quest",
                            "type": "practice",
                            "topic": "Multiplication",
                            "position": 2,
                            "xp": 25,
                            "content_json": json.dumps({
                                "questions": [
                                    {
                                        "question": "What is 6 × 4?",
                                        "options": ["24", "20", "28", "18"],
                                        "answer": "24"
                                    },
                                    {
                                        "question": "Any number multiplied by 0 equals...",
                                        "options": ["0", "1", "The same number", "10"],
                                        "answer": "0"
                                    }
                                ]
                            })
                        }
                    ]
                }
            ]
        },
        {
            "id": "c3_english_nouns_verbs",
            "title": "Nouns and Action Verbs",
            "subject": "English",
            "grade": "Class 3",
            "description": "Explore naming words and action words to make exciting sentences!",
            "cover_key": "english",
            "status": "approved",
            "needs_review": True,
            "modules": [
                {
                    "id": "c3_eng_mod1",
                    "title": "Module 1: Naming Our World",
                    "position": 1,
                    "lessons": [
                        {
                            "id": "c3_eng_l1",
                            "title": "What is a Noun?",
                            "type": "story",
                            "topic": "Nouns",
                            "position": 1,
                            "xp": 20,
                            "content_json": json.dumps({
                                "slides": [
                                    {
                                        "title": "People, Places, Animals, Things",
                                        "text": "A noun is a name. Teacher is a person, forest is a place, lion is an animal, ball is a thing!",
                                        "illustration": "book"
                                    },
                                    {
                                        "title": "Capital Letters for Special Names",
                                        "text": "Proper nouns name special people or places like Pari, Delhi, or India. They always start with capital letters!",
                                        "illustration": "pencil"
                                    }
                                ]
                            })
                        },
                        {
                            "id": "c3_eng_l2",
                            "title": "Spot the Noun Quiz",
                            "type": "practice",
                            "topic": "Nouns",
                            "position": 2,
                            "xp": 25,
                            "content_json": json.dumps({
                                "questions": [
                                    {
                                        "question": "Which of these words is a noun?",
                                        "options": ["Elephant", "Quickly", "Sleep", "Under"],
                                        "answer": "Elephant"
                                    },
                                    {
                                        "question": "Which word is a Proper Noun that needs a capital letter?",
                                        "options": ["Sunday", "river", "pencil", "happy"],
                                        "answer": "Sunday"
                                    }
                                ]
                            })
                        }
                    ]
                }
            ]
        },
        {
            "id": "c4_evs_plants_animals",
            "title": "Plants, Animals and Habitats",
            "subject": "EVS",
            "grade": "Class 4",
            "description": "Discover how green plants make food and how wild animals survive in amazing habitats!",
            "cover_key": "evs",
            "status": "approved",
            "needs_review": True,
            "modules": [
                {
                    "id": "c4_evs_mod1",
                    "title": "Module 1: The Green Kingdom",
                    "position": 1,
                    "lessons": [
                        {
                            "id": "c4_evs_l1",
                            "title": "The Secrets of Plants",
                            "type": "story",
                            "topic": "Plants",
                            "position": 1,
                            "xp": 20,
                            "content_json": json.dumps({
                                "slides": [
                                    {
                                        "title": "Roots Drink Water",
                                        "text": "Under the soil, roots hold the plant tight and drink fresh water.",
                                        "illustration": "plant"
                                    },
                                    {
                                        "title": "Leaves Make Food",
                                        "text": "Green leaves use warm sunlight, air and water to cook tasty food for the whole plant!",
                                        "illustration": "sun"
                                    }
                                ]
                            })
                        },
                        {
                            "id": "c4_evs_l2",
                            "title": "Plant Detective Quiz",
                            "type": "practice",
                            "topic": "Plants",
                            "position": 2,
                            "xp": 25,
                            "content_json": json.dumps({
                                "questions": [
                                    {
                                        "question": "Which part of the plant absorbs water from the soil?",
                                        "options": ["Roots", "Leaves", "Flowers", "Bark"],
                                        "answer": "Roots"
                                    },
                                    {
                                        "question": "What do green leaves use to make food?",
                                        "options": ["Sunlight, air and water", "Juice and sugar", "Sand and rocks", "Only milk"],
                                        "answer": "Sunlight, air and water"
                                    }
                                ]
                            })
                        }
                    ]
                }
            ]
        }
    ]

    for c_data in sample_courses:
        course = Course(
            id=c_data["id"],
            title=c_data["title"],
            subject=c_data["subject"],
            grade=c_data["grade"],
            description=c_data["description"],
            cover_key=c_data["cover_key"],
            status=c_data["status"],
            needs_review=c_data["needs_review"],
        )
        db.add(course)
        db.flush()

        for m_data in c_data.get("modules", []):
            module = CourseModule(
                id=m_data["id"],
                course_id=course.id,
                title=m_data["title"],
                position=m_data["position"],
            )
            db.add(module)
            db.flush()

            for l_data in m_data.get("lessons", []):
                lesson = CourseLesson(
                    id=l_data["id"],
                    module_id=module.id,
                    title=l_data["title"],
                    type=l_data["type"],
                    topic=l_data["topic"],
                    position=l_data["position"],
                    xp=l_data["xp"],
                    content_json=l_data.get("content_json"),
                )
                db.add(lesson)

    db.commit()
    logger.info("Successfully seeded 4 foundational courses with modules and lessons.")
