"""Seed sample Class 3 and 4 courses with interactive modules and lessons."""
import json
import logging
from sqlalchemy.orm import Session
from backend.models import Course, CourseModule, CourseLesson, VideoStory, Video

logger = logging.getLogger("backend.seed_courses")


def seed_default_courses(db: Session):
    """Seed foundational Class 3 and Class 4 courses if not present."""
    count = db.query(Course).count()
    if count == 0:
        logger.info("Seeding Class 3 and Class 4 sample courses...")
        _seed_courses(db)

    # Seed sample animated stories if none exist
    story_count = db.query(VideoStory).count()
    if story_count == 0:
        _seed_stories(db)


def _seed_courses(db: Session):
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


def _seed_stories(db: Session):
    sample_stories = [
            {
                "id": "story_water_cycle",
                "topic": "Water Cycle",
                "grade": "Class 3",
                "subject": "EVS",
                "scenes_json": json.dumps([
                    {
                        "scene_number": 1,
                        "title": "A Sunny Day on the Lake",
                        "illustration": "sun",
                        "text": "Meet Piku, a happy little water drop swimming in the warm blue lake.",
                        "speech_text": "Meet Piku, a happy little water drop swimming in the warm blue lake.",
                        "interactive_prompt": "Can you see the bright sun warming up the water?",
                        "options": ["Yes, the sun is warm!", "It is snowing"]
                    },
                    {
                        "scene_number": 2,
                        "title": "Floating Up High",
                        "illustration": "cloud",
                        "text": "The warm sun turns Piku into invisible water vapour. Up and up he floats!",
                        "speech_text": "The warm sun turns Piku into invisible water vapour. Up and up he floats! This is called evaporation.",
                        "interactive_prompt": "What happens when water heats up?",
                        "options": ["It turns to vapour and rises", "It freezes into solid ice"]
                    },
                    {
                        "scene_number": 3,
                        "title": "Making a Fluffy Cloud",
                        "illustration": "cloud",
                        "text": "High in the cool sky, Piku meets millions of tiny water droplets. Together, they form a fluffy white cloud!",
                        "speech_text": "High in the cool sky, Piku meets millions of tiny water droplets. Together, they form a fluffy white cloud! This is condensation.",
                        "interactive_prompt": "What do millions of water drops make together?",
                        "options": ["A soft cloud", "A big rock"]
                    },
                    {
                        "scene_number": 4,
                        "title": "Raindrop Parade",
                        "illustration": "water",
                        "text": "The cloud gets heavy and dark. Whoosh! Piku tumbles down as a dancing raindrop!",
                        "speech_text": "The cloud gets heavy and dark. Whoosh! Piku tumbles down as a dancing raindrop! This is precipitation.",
                        "interactive_prompt": "Rain falling from clouds is called:",
                        "options": ["Precipitation", "Baking"]
                    },
                    {
                        "scene_number": 5,
                        "title": "Back to the River",
                        "illustration": "nature",
                        "text": "Piku splashes onto a green leaf, trickles into a singing brook, and journeys back home to the lake!",
                        "speech_text": "Piku splashes onto a green leaf, trickles into a singing brook, and journeys back home to the lake! The water cycle never stops.",
                        "interactive_prompt": "Where does the water cycle go next?",
                        "options": ["It starts all over again!", "It stops forever"]
                    }
                ]),
                "status": "approved",
                "needs_review": False
            },
            {
                "id": "story_fractions_pizza",
                "topic": "Fractions",
                "grade": "Class 3",
                "subject": "Maths",
                "scenes_json": json.dumps([
                    {
                        "scene_number": 1,
                        "title": "The Fresh Whole Pizza",
                        "illustration": "pizza",
                        "text": "Chef Pari baked a delicious round pizza fresh from the oven! This is 1 whole pizza.",
                        "speech_text": "Chef Pari baked a delicious round pizza fresh from the oven! This is one whole pizza.",
                        "interactive_prompt": "How many pizzas are on the table?",
                        "options": ["1 whole pizza", "5 pizzas"]
                    },
                    {
                        "scene_number": 2,
                        "title": "Cutting in Halves",
                        "illustration": "fraction",
                        "text": "Pari cuts the pizza right down the middle into 2 equal parts. Each slice is 1/2 (one half)!",
                        "speech_text": "Pari cuts the pizza right down the middle into two equal parts. Each slice is one half!",
                        "interactive_prompt": "What do we call one slice when divided into 2 equal parts?",
                        "options": ["1/2 (one half)", "1/10 (one tenth)"]
                    },
                    {
                        "scene_number": 3,
                        "title": "Four Friends Arrive",
                        "illustration": "fraction",
                        "text": "Two more hungry friends ring the doorbell. Pari cuts the pizza once more into 4 equal slices!",
                        "speech_text": "Two more hungry friends ring the doorbell. Pari cuts the pizza once more into four equal slices! Each slice is one fourth or one quarter.",
                        "interactive_prompt": "One slice out of 4 equal slices is written as:",
                        "options": ["1/4", "4/1"]
                    },
                    {
                        "scene_number": 4,
                        "title": "Sharing is Caring",
                        "illustration": "owl",
                        "text": "If Pari eats 1 slice and a friend eats 1 slice, they have eaten 2 out of 4 slices (2/4), which is equal to 1/2 of the pizza!",
                        "speech_text": "If Pari eats one slice and a friend eats one slice, they have eaten two out of four slices, which is equal to half the pizza!",
                        "interactive_prompt": "Is 2/4 the same as 1/2?",
                        "options": ["Yes, they are equal!", "No, completely different"]
                    },
                    {
                        "scene_number": 5,
                        "title": "Fraction Champions!",
                        "illustration": "trophy",
                        "text": "Every slice was shared fairly and everyone is happy and full. You are a true Fraction Champion!",
                        "speech_text": "Every slice was shared fairly and everyone is happy and full. You are a true Fraction Champion!",
                        "interactive_prompt": "What do fractions show?",
                        "options": ["Equal parts of a whole", "A secret phone number"]
                    }
                ]),
                "status": "approved",
                "needs_review": False
            },
            {
                "id": "story_super_nouns",
                "topic": "Nouns",
                "grade": "Class 4",
                "subject": "English",
                "scenes_json": json.dumps([
                    {
                        "scene_number": 1,
                        "title": "The Magic Word Box",
                        "illustration": "book",
                        "text": "Every person, place, animal, and thing has a name. We call these naming words NOUNS!",
                        "speech_text": "Every person, place, animal, and thing has a name. We call these naming words nouns!",
                        "interactive_prompt": "What is another name for a noun?",
                        "options": ["A naming word", "A hopping word"]
                    },
                    {
                        "scene_number": 2,
                        "title": "People and Animals",
                        "illustration": "fox",
                        "text": "Teacher, doctor, baby, elephant, and kitten are all nouns naming people and animals.",
                        "speech_text": "Teacher, doctor, baby, elephant, and kitten are all nouns naming people and animals.",
                        "interactive_prompt": "Which of these is a noun naming an animal?",
                        "options": ["Elephant", "Quickly"]
                    },
                    {
                        "scene_number": 3,
                        "title": "Places to Visit",
                        "illustration": "nature",
                        "text": "School, playground, park, and library are nouns that name special places we visit.",
                        "speech_text": "School, playground, park, and library are nouns that name special places we visit.",
                        "interactive_prompt": "Which of these is a noun naming a place?",
                        "options": ["Playground", "Singing"]
                    },
                    {
                        "scene_number": 4,
                        "title": "Things We Use",
                        "illustration": "pencil",
                        "text": "Pencil, book, chair, and toy are nouns that name things we hold and use every day.",
                        "speech_text": "Pencil, book, chair, and toy are nouns that name things we hold and use every day.",
                        "interactive_prompt": "Which of these is a noun naming a thing?",
                        "options": ["Pencil", "Running"]
                    },
                    {
                        "scene_number": 5,
                        "title": "Super Detective Badge",
                        "illustration": "star",
                        "text": "Look around your room. Count 3 nouns you can see right now! You are a certified Noun Detective!",
                        "speech_text": "Look around your room. Count three nouns you can see right now! You are a certified Noun Detective!",
                        "interactive_prompt": "Are you ready to spot nouns everywhere you go?",
                        "options": ["Yes, I am a Noun Detective!", "Maybe later"]
                    }
                ]),
                "status": "approved",
                "needs_review": False
            }
        ]
    for s_data in sample_stories:
        db.add(VideoStory(**s_data))
    db.commit()
    logger.info("Successfully seeded 3 interactive animated video stories.")
