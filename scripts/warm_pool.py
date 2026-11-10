"""Pre-fill background question pool for Parivestra AI Tutor."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import argparse
import time
from backend.agents.practice_agent import PracticeAgent
from backend.database import SessionLocal, init_db
from backend.llm.gateway import LLMGateway
from backend.models import GeneratedQuestion

def warm_pool(topics=None, difficulty="Beginner", count_per_topic=2):
    init_db()
    db = SessionLocal()
    gateway = LLMGateway()
    agent = PracticeAgent(gateway=gateway)

    if not topics:
        topics = ["Lists", "Functions", "Dictionaries", "Control Flow", "OOP"]

    print("============================================================")
    print("WARMING PRACTICE QUESTION POOL")
    print(f"Model: {gateway.model} at {gateway.base_url}")
    print(f"Topics: {', '.join(topics)}")
    print(f"Count per topic: {count_per_topic} | Difficulty: {difficulty}")
    print("============================================================")

    total_added = 0
    t0 = time.perf_counter()

    for topic in topics:
        print(f"\n[+] Generating {count_per_topic} questions for '{topic}'...")
        added = agent.refill_pool(
            db=db,
            subject="Python",
            topic=topic,
            difficulty=difficulty,
            target_count=count_per_topic,
        )
        total_added += added
        print(f"    Added {added} question(s) to pool.")

    ready_total = db.query(GeneratedQuestion).filter(GeneratedQuestion.status == "ready").count()
    db.close()

    elapsed = time.perf_counter() - t0
    print("\n============================================================")
    print(f"Pool warm completed in {elapsed:.1f}s.")
    print(f"Total newly generated: {total_added}")
    print(f"Total ready questions in pool: {ready_total}")
    print("============================================================")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Warm question pool")
    parser.add_argument("--count", type=int, default=2, help="Questions per topic")
    parser.add_argument("--difficulty", type=str, default="Beginner", help="Difficulty level")
    parser.add_argument("--topic", type=str, default=None, help="Specific topic")
    args = parser.parse_args()

    topics = [args.topic] if args.topic else None
    warm_pool(topics=topics, difficulty=args.difficulty, count_per_topic=args.count)

