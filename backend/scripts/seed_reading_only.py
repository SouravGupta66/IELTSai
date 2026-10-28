# backend/scripts/seed_reading_only.py
# Focused reading-passage seeding with the current (fail-loud) ollama_service code.

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.database import SessionLocal
from app.models import ReadingPassage
from app.services.ollama_service import ollama_service
from app.curd import create_reading_passage, create_reading_question

BANDS = [7.0, 7.5, 8.0]
TOPICS = ["environment", "education", "work"]


def covered(db, band):
    return db.query(ReadingPassage).filter(
        ReadingPassage.band_seed >= band - 0.5,
        ReadingPassage.band_seed <= band + 0.5,
    ).first() is not None


def main():
    db = SessionLocal()
    generated = 0
    try:
        for i, band in enumerate(BANDS):
            topic = TOPICS[i % len(TOPICS)]
            if covered(db, band):
                print(f"Skip Band {band} (covered)")
                continue
            for attempt in range(2):
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
                    print(f"Generated Band {band} ({topic}, {len(result.get('questions', []))} questions)")
                    break
                except Exception as e:
                    print(f"Failed Band {band} attempt {attempt+1}: {e}")
    finally:
        db.close()
    print(f"Done. Generated {generated} passages.")


if __name__ == "__main__":
    main()
