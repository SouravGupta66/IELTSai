# backend/scripts/seed_gaps.py
# Targeted top-up for Reading passages and Writing prompts at the bands
# real registered accounts actually use, so students don't hit a live
# multi-minute generation on first request.

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

import time
from app.database import SessionLocal
from app.models import WritingPrompt, ReadingPassage
from app.services.ollama_service import ollama_service
from app.curd import create_writing_prompt, create_reading_passage, create_reading_question

TARGET_BANDS = [7.0, 7.5, 8.0]
WRITING_TOPICS = ["technology", "education"]
READING_TOPICS = ["technology", "environment"]


def writing_covered(db, task_type, band):
    return db.query(WritingPrompt).filter(
        WritingPrompt.task_type == task_type,
        WritingPrompt.band_seed >= band - 0.5,
        WritingPrompt.band_seed <= band + 0.5,
    ).first() is not None


def reading_covered(db, band):
    return db.query(ReadingPassage).filter(
        ReadingPassage.band_seed >= band - 0.5,
        ReadingPassage.band_seed <= band + 0.5,
    ).first() is not None


def seed_writing(db):
    generated = 0
    for i, band in enumerate(TARGET_BANDS):
        topic = WRITING_TOPICS[i % len(WRITING_TOPICS)]
        for task_type in (1, 2):
            if writing_covered(db, task_type, band):
                print(f"Skip Writing Task {task_type} Band {band} (covered)")
                continue
            try:
                result = ollama_service.generate_writing_prompt(task_type, topic, band)
                create_writing_prompt(db, {
                    "task_type": task_type, "topic": topic, "band_seed": band,
                    "prompt_text": result["prompt_text"],
                    "task_1_image_url": result.get("task_1_image_url"),
                })
                generated += 1
                print(f"Generated Writing: Task {task_type} Band {band} ({topic})")
            except Exception as e:
                print(f"Failed Writing (Task {task_type} Band {band}): {e}")
            time.sleep(1)
    print(f"Writing: {generated} new prompts")


def seed_reading(db):
    generated = 0
    for i, band in enumerate(TARGET_BANDS):
        topic = READING_TOPICS[i % len(READING_TOPICS)]
        if reading_covered(db, band):
            print(f"Skip Reading Band {band} (covered)")
            continue
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
            print(f"Generated Reading: Band {band} ({topic}, {len(result.get('questions', []))} questions)")
        except Exception as e:
            print(f"Failed Reading (Band {band}): {e}")
    print(f"Reading: {generated} new passages")


def main():
    db = SessionLocal()
    try:
        seed_writing(db)
        seed_reading(db)
    finally:
        db.close()
    print("Done.")


if __name__ == "__main__":
    main()
