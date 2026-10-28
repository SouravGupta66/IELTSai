# backend/scripts/seed_data.py
# Run once to fill your database with practice content: `python scripts/seed_data.py` from backend/

import os
import sys

# Allow `python scripts/seed_data.py` to find the `app` package regardless of cwd
# (this script isn't run as part of a package, so relative imports don't work here).
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Windows consoles default to a non-UTF-8 codepage (cp1252), which crashes on the
# emoji inside ollama_service's error messages when they get printed below.
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models import SpeakingQuestion
from app.services.ollama_service import ollama_service
from app.services.tts_service import tts_service
from app.routers.speaking import _compose_question_text
from app.curd import (
    create_writing_prompt,
    create_reading_passage, create_reading_question,
    create_listening_test, create_listening_question,
)
import time


def seed_speaking_questions(db: Session, topics_per_part: int = 4):
    """
    Generate speaking questions, covering all 3 parts (loop order is
    part-first so a small budget still guarantees coverage of every part,
    instead of exhausting the budget on part 1 before reaching 2/3).
    """
    topics = ["travel", "technology", "education", "work", "family", "hobbies", "food", "environment"]
    parts = [1, 2, 3]
    bands = [5.0, 6.0, 6.5, 7.0, 7.5, 8.0]

    generated = 0
    for part in parts:
        for i in range(topics_per_part):
            topic = topics[i % len(topics)]
            band = bands[i % len(bands)]

            for attempt in range(2):  # one retry if validation fails
                try:
                    result = ollama_service.generate_speaking_question(part, topic, band)
                    validation = ollama_service.validate_speaking_question(
                        result["question_text"], part, band
                    )
                    if validation.get("is_valid", True):
                        question = SpeakingQuestion(
                            part=part, topic=topic, band_seed=band,
                            question_text=_compose_question_text(result), used_count=0
                        )
                        db.add(question)
                        db.commit()
                        generated += 1
                        print(f"Speaking: {topic} Part {part} Band {band}")
                        break
                except Exception as e:
                    print(f"Speaking failed ({topic} Part {part}): {e}")
            time.sleep(1)

    print(f"Total speaking questions generated: {generated}")


def seed_writing_prompts(db: Session, topics_count: int = 4):
    """Generate Task 1 + Task 2 writing prompts for a handful of topics/bands."""
    topics = ["travel", "technology", "education", "environment"][:topics_count]
    bands = [6.0, 6.5, 7.0]

    generated = 0
    for topic in topics:
        for band in bands:
            for task_type in (1, 2):
                try:
                    result = ollama_service.generate_writing_prompt(task_type, topic, band)
                    create_writing_prompt(db, {
                        "task_type": task_type, "topic": topic, "band_seed": band,
                        "prompt_text": result["prompt_text"],
                        "task_1_image_url": result.get("task_1_image_url"),
                    })
                    generated += 1
                    print(f"Writing: {topic} Task {task_type} Band {band}")
                except Exception as e:
                    print(f"Writing failed ({topic} Task {task_type}): {e}")
                time.sleep(1)

    print(f"Total writing prompts generated: {generated}")


def seed_reading_passages(db: Session, topics_count: int = 3):
    """Generate reading passages (each call includes its ~13 questions)."""
    topics = ["science", "history", "technology", "environment", "education", "health"][:topics_count]
    bands = [6.0, 6.5, 7.0]

    generated = 0
    for topic in topics:
        band = bands[topics.index(topic) % len(bands)]
        try:
            result = ollama_service.generate_reading_passage(topic, band)
            passage = create_reading_passage(db, {
                "topic": topic, "band_seed": band,
                "title": result.get("title", "Untitled"),
                "passage_text": result["passage_text"],
                "word_count": result.get("word_count", len(result["passage_text"].split())),
            })
            for q in result.get("questions", []):
                create_reading_question(db, passage.id, {
                    "question_number": q["number"], "question_text": q["question"],
                    "answer": q["answer"], "type": q["type"],
                    "options": q.get("options"), "points": q.get("points", 1.0),
                })
            generated += 1
            print(f"Reading: {topic} Band {band} ({len(result.get('questions', []))} questions)")
        except Exception as e:
            print(f"Reading failed ({topic}): {e}")
        time.sleep(1)

    print(f"Total reading passages generated: {generated}")


def seed_listening_tests(db: Session, count: int = 1):
    """Generate listening tests (script generated section-by-section, then narrated with Piper)."""
    topics = ["daily routine", "job interview", "campus tour"][:count]
    band = 6.5

    generated = 0
    for topic in topics:
        try:
            result = ollama_service.generate_listening_script(topic, band)
            audio_url = tts_service.synthesize_to_file(result["script"])
            test = create_listening_test(db, {
                "topic": topic, "band_seed": band, "script_text": result["script"],
                "audio_url": audio_url, "question_count": result.get("total_questions", 0),
            })
            for section in result.get("sections", []):
                for q in section.get("questions", []):
                    create_listening_question(db, test.id, {
                        "section": section["section_number"], "question_number": q["number"],
                        "question_text": q["question"], "answer": q["answer"],
                        "type": q.get("type", "fill_blank"), "options": q.get("options"), "points": 1.0,
                    })
            generated += 1
            print(f"Listening: {topic} Band {band} ({result.get('total_questions', 0)} questions)")
        except Exception as e:
            print(f"Listening failed ({topic}): {e}")

    print(f"Total listening tests generated: {generated}")


def main():
    print("Seeding IELTS Database...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_speaking_questions(db, topics_per_part=2)
        seed_writing_prompts(db, topics_count=2)
        seed_reading_passages(db, topics_count=2)
        # Listening already has at least one test seeded manually this session;
        # skip by default since each one takes several minutes on this hardware.
        # seed_listening_tests(db, count=1)
    finally:
        db.close()

    print("Seeding complete!")


if __name__ == "__main__":
    main()
