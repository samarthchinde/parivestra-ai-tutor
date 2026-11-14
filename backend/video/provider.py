"""Video Provider Interface and Story Player Provider.
Provides an extensible architecture for local story explainers and video generation.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class StoryScene(BaseModel):
    title: str
    narration: str
    caption: str
    illustration: str
    mcq: Optional[Dict[str, Any]] = None


class StoryOutput(BaseModel):
    topic: str
    grade: str
    subject: str
    scenes: List[StoryScene]


class VideoProvider(ABC):
    """Abstract interface for educational video and interactive story generation."""

    @abstractmethod
    def generate_story(
        self,
        topic: str,
        grade: str,
        subject: str,
    ) -> StoryOutput:
        """Generate animated story scenes for Class 3-4."""
        pass


class StoryPlayerProvider(VideoProvider):
    """Local, rule-and-template-backed Story Provider for Class 3-4 interactive SVG explainers.
    Does not call any external third-party API.
    """

    ALLOWED_ILLUSTRATIONS = [
        "sun", "plant", "water_drop", "tree", "numbers", "shapes",
        "animals", "book", "pencil", "clock", "food", "family", "pari"
    ]

    def generate_story(
        self,
        topic: str,
        grade: str,
        subject: str,
    ) -> StoryOutput:
        """Generates a structured, child-safe 5-scene story lesson with simple words and an end quiz."""
        clean_topic = topic.strip().title()

        scenes = [
            StoryScene(
                title=f"Welcome to {clean_topic}!",
                narration=f"Hello explorer! Today Pari will help you learn all about {clean_topic}.",
                caption=f"Today's Adventure: Discovering {clean_topic}!",
                illustration="pari",
            ),
            StoryScene(
                title="Look Closely!",
                narration=f"We see {clean_topic} in our everyday world. Notice how useful and special it is!",
                caption="Everything around us has a wonderful story.",
                illustration="sun" if subject.lower() == "evs" else "numbers" if subject.lower() == "maths" else "book",
            ),
            StoryScene(
                title="How It Works",
                narration="Each little part works together step by step, just like good friends playing happily.",
                caption="Learning step by step makes us super smart!",
                illustration="plant" if subject.lower() == "evs" else "shapes" if subject.lower() == "maths" else "pencil",
            ),
            StoryScene(
                title="Fun Example",
                narration="When you practice every single day, your brain grows stronger and happier!",
                caption="Practice brings joyful smiles!",
                illustration="water_drop" if subject.lower() == "evs" else "clock" if subject.lower() == "maths" else "animals",
            ),
            StoryScene(
                title="You Did It!",
                narration="You completed this adventure! Try this quick question to show your skills.",
                caption="Great job exploring with Pari!",
                illustration="pari",
                mcq={
                    "question": f"What did we learn about in this story lesson?",
                    "options": [clean_topic, "Dinosaurs", "Flying Cars", "Sleeping all day"],
                    "answer": clean_topic,
                },
            ),
        ]

        return StoryOutput(
            topic=clean_topic,
            grade=grade,
            subject=subject,
            scenes=scenes,
        )

