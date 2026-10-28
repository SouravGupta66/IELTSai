# backend/app/routers/listening.py
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID
import json

from ..database import get_db
from ..curd import (
    create_listening_test, create_listening_question,
    get_listening_test, get_listening_questions,
    create_listening_attempt, update_user_progress
)
from ..services.ollama_service import ollama_service
from ..services.tts_service import tts_service

router = APIRouter()

# ─── ADMIN: Generate Test ───
@router.post("/generate-test")
async def generate_test(
    topic: str,
    band: float,
    db: Session = Depends(get_db)
):
    """Generate complete listening test with AI"""
    generated = await asyncio.to_thread(ollama_service.generate_listening_script, topic, band)

    # Generate narration audio with Piper
    audio_url = await asyncio.to_thread(tts_service.synthesize_to_file, generated["script"])

    # Create test
    test_data = {
        "topic": topic,
        "band_seed": band,
        "script_text": generated["script"],
        "audio_url": audio_url,
        "question_count": generated.get("total_questions", 40)
    }

    db_test = create_listening_test(db, test_data)
    
    # Create questions
    for section in generated.get("sections", []):
        for q in section.get("questions", []):
            question_data = {
                "section": section["section_number"],
                "question_number": q["number"],
                "question_text": q["question"],
                "answer": q["answer"],
                "type": q["type"],
                "options": q.get("options"),
                "points": q.get("points", 1.0)
            }
            create_listening_question(db, db_test.id, question_data)
    
    return {
        "test_id": db_test.id,
        "message": "Test generated with narration audio.",
        "audio_url": audio_url,
        "question_count": len(generated.get("sections", []))
    }

# ─── STUDENT: Get Test ───
@router.get("/test")
async def fetch_test(
    topic: Optional[str] = None,
    band: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """Get a listening test (questions only, no answers!)"""
    test = get_listening_test(db, topic=topic, band=band)
    
    if not test:
        raise HTTPException(status_code=404, detail="No listening tests available")
    
    questions = get_listening_questions(db, test.id)
    
    # Build response - HIDE answer keys!
    question_list = []
    for q in questions:
        q_data = {
            "id": str(q.id),
            "section": q.section,
            "question_number": q.question_number,
            "question_text": q.question_text,
            "question_type": q.question_type,
        }
        if q.options:
            q_data["options"] = q.options
        question_list.append(q_data)
    
    return {
        "test_id": str(test.id),
        "topic": test.topic,
        "band_seed": float(test.band_seed),
        "audio_url": test.audio_url,
        "section_count": test.section_count,
        "questions": question_list
    }

# ─── STUDENT: Submit Answers ───
@router.post("/submit")
async def submit_answers(
    test_id: UUID,
    user_id: UUID,
    answers: dict,  # {"1": "A", "2": "hotel", ...}
    time_spent: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Submit and score answers"""
    # Get correct answers
    questions = get_listening_questions(db, test_id)
    
    correct = 0
    total_points = 0
    section_scores = {1: 0, 2: 0, 3: 0, 4: 0}
    section_totals = {1: 0, 2: 0, 3: 0, 4: 0}
    # Answer keys are hidden by GET /test, so this is the only place the
    # client can learn them - return them now that the attempt is final.
    answer_review = []

    for q in questions:
        raw_answer = answers.get(str(q.question_number), "")
        student_answer = raw_answer.strip().lower()
        correct_answer = q.answer_key.strip().lower()
        is_correct = student_answer == correct_answer

        if is_correct:
            correct += 1
            section_scores[q.section] += float(q.points)

        total_points += float(q.points)
        section_totals[q.section] += float(q.points)
        answer_review.append({
            "question_number": q.question_number,
            "your_answer": raw_answer,
            "correct_answer": q.answer_key,
            "is_correct": is_correct,
        })
    
    # Convert to IELTS band. The official table is for a 40-question test,
    # but generated tests carry far fewer questions, so scale to the
    # 40-question equivalent first (otherwise even a perfect score maps to 3.0).
    band = _convert_listening_score(round(correct * 40 / len(questions)) if questions else 0)
    
    # Section breakdown
    breakdown = {}
    for section in range(1, 5):
        if section_totals[section] > 0:
            pct = section_scores[section] / section_totals[section]
            breakdown[f"section_{section}"] = {
                "correct": section_scores[section],
                "total": section_totals[section],
                "percentage": round(pct * 100, 1)
            }
    
    # Save attempt
    db_attempt = create_listening_attempt(
        db, user_id, test_id,
        answers, correct, band, breakdown
    )
    update_user_progress(db, user_id, "listening", band)

    feedback = _generate_listening_feedback(correct, len(questions), band, breakdown)

    return {
        "score": correct,
        "total_questions": len(questions),
        "band_score": band,
        "section_breakdown": breakdown,
        "time_spent": time_spent,
        "feedback": feedback,
        "answer_review": answer_review,
    }

def _generate_listening_feedback(correct: int, total: int, band: float, breakdown: dict) -> str:
    """
    Rule-based feedback (no LLM call - keeps submission fast/reliable and avoids
    adding more load to Ollama on top of question/audio generation).
    """
    if band >= 8.0:
        headline = "Excellent listening comprehension!"
    elif band >= 6.5:
        headline = "Good performance, with room to sharpen the details."
    elif band >= 5.0:
        headline = "A solid attempt - focus on catching specific details like names, numbers, and dates."
    else:
        headline = "Keep practicing - try listening for keywords and overall context first, then details."

    weakest_section = None
    weakest_pct = 101
    for section_key, data in breakdown.items():
        if data["percentage"] < weakest_pct:
            weakest_pct = data["percentage"]
            weakest_section = section_key.replace("_", " ").title()

    detail = f"You answered {correct} out of {total} questions correctly."
    if weakest_section and weakest_pct < 100:
        detail += f" {weakest_section} was your weakest area ({weakest_pct}% correct) - review that section's audio again."

    return f"{headline} {detail}"

def _convert_listening_score(raw_score: int) -> float:
    """IELTS Listening band conversion"""
    if raw_score >= 39: return 9.0
    elif raw_score >= 37: return 8.5
    elif raw_score >= 35: return 8.0
    elif raw_score >= 32: return 7.5
    elif raw_score >= 30: return 7.0
    elif raw_score >= 26: return 6.5
    elif raw_score >= 23: return 6.0
    elif raw_score >= 18: return 5.5
    elif raw_score >= 16: return 5.0
    elif raw_score >= 13: return 4.5
    elif raw_score >= 10: return 4.0
    else: return 3.0