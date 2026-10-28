# backend/scripts/seed_speaking_bands.py
# Targeted top-up: ensures every part has coverage for the bands real
# registered users actually have as target_band, so GET /speaking/question
# (matched within +-0.5 band) doesn't 404 for real accounts.

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

import time
from app.database import SessionLocal
from app.models import SpeakingQuestion
from app.services.ollama_service import ollama_service
from app.routers.speaking import _compose_question_text

TOPICS = ["technology", "travel", "education", "work", "hobbies", "environment"]
PARTS = [1, 2, 3]
BANDS = [6.5, 7.0, 7.5, 8.0]  # 6.0 already covered; fill the rest


def already_covered(db, part, band):
    return db.query(SpeakingQuestion).filter(
        SpeakingQuestion.part == part,
        SpeakingQuestion.band_seed >= band - 0.5,
        SpeakingQuestion.band_seed <= band + 0.5,
    ).first() is not None


def main():
    db = SessionLocal()
    generated = 0
    try:
        for part in PARTS:
            for i, band in enumerate(BANDS):
                if already_covered(db, part, band):
                    print(f"Skip Part {part} Band {band} (already covered)")
                    continue

                topic = TOPICS[(part + i) % len(TOPICS)]
                for attempt in range(2):
                    try:
                        result = ollama_service.generate_speaking_question(part, topic, band)
                        validation = ollama_service.validate_speaking_question(
                            result["question_text"], part, band
                        )
                        if validation.get("is_valid", True):
                            db.add(SpeakingQuestion(
                                part=part, topic=topic, band_seed=band,
                                question_text=_compose_question_text(result), used_count=0
                            ))
                            db.commit()
                            generated += 1
                            print(f"Generated: Part {part} Band {band} ({topic})")
                            break
                    except Exception as e:
                        print(f"Failed (Part {part} Band {band}, attempt {attempt+1}): {e}")
                time.sleep(1)
    finally:
        db.close()

    print(f"Done. Generated {generated} new speaking questions.")


if __name__ == "__main__":
    main()
