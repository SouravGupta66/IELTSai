# backend/app/routers/reading.py
import asyncio
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from uuid import UUID

from ..database import get_db
from ..curd import (
    create_reading_passage, create_reading_question,
    get_reading_passage, get_reading_questions,
    create_reading_attempt, update_user_progress
)
from ..services.ollama_service import ollama_service

router = APIRouter()

_OPTION_PREFIX_RE = re.compile(r'^[A-Z][.)]\s*')


def _strip_option_prefix(text: str) -> str:
    """Strips a leading 'A. '/'A)' style MCQ letter prefix, if present."""
    return _OPTION_PREFIX_RE.sub('', text).strip()

# ═══════════════════════════════════════════
# OFFLINE PHASE: Generate Passage + Questions
# ═══════════════════════════════════════════

@router.post("/generate-passage")
async def generate_passage(
    topic: str,
    band: float,
    db: Session = Depends(get_db)
):
    """ADMIN: Generate reading passage + 13 questions"""
    generated = await asyncio.to_thread(ollama_service.generate_reading_passage, topic, band)
    
    # Create passage
    passage_data = {
        "topic": topic,
        "band_seed": band,
        "title": generated.get("title", "Untitled"),
        "passage_text": generated["passage_text"],
        "word_count": generated.get("word_count", len(generated["passage_text"].split()))
    }
    
    db_passage = create_reading_passage(db, passage_data)
    
    # Create questions
    for q in generated.get("questions", []):
        question_data = {
            "question_number": q["number"],
            "question_text": q["question"],
            "answer": q["answer"],
            "type": q["type"],
            "options": q.get("options"),
            "points": q.get("points", 1.0)
        }
        create_reading_question(db, db_passage.id, question_data)
    
    return {"passage_id": db_passage.id, "question_count": len(generated.get("questions", []))}

# ═══════════════════════════════════════════
# LIVE PHASE: Student Interaction
# ═══════════════════════════════════════════

@router.get("/passage")
async def fetch_passage(
    topic: Optional[str] = None,
    band: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """STUDENT: Get reading passage with questions. Generates + stores one on demand if none exist."""
    passage = get_reading_passage(db, topic=topic, band=band)

    if not passage:
        try:
            generated = await asyncio.to_thread(ollama_service.generate_reading_passage, topic or "general", band or 6.5)
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"AI generation failed: {str(e)}")

        passage = create_reading_passage(db, {
            "topic": topic or "general",
            "band_seed": band or 6.5,
            "title": generated.get("title", "Untitled"),
            "passage_text": generated["passage_text"],
            "word_count": generated.get("word_count", len(generated["passage_text"].split())),
        })
        for q in generated.get("questions", []):
            create_reading_question(db, passage.id, {
                "question_number": q["number"], "question_text": q["question"],
                "answer": q["answer"], "type": q["type"],
                "options": q.get("options"), "points": q.get("points", 1.0),
            })

    # Get questions
    questions = get_reading_questions(db, passage.id)
    
    # Build response (hide answer keys!)
    question_list = []
    for q in questions:
        q_data = {
            "id": str(q.id),
            "question_number": q.question_number,
            "question_text": q.question_text,
            "question_type": q.question_type,
        }
        if q.options:
            q_data["options"] = q.options
        question_list.append(q_data)
    
    return {
        "id": str(passage.id),
        "title": passage.title,
        "topic": passage.topic,
        "band_seed": float(passage.band_seed),
        "passage_text": passage.passage_text,
        "word_count": passage.word_count,
        "questions": question_list
    }

@router.post("/submit")
async def submit_answers(
    passage_id: UUID,
    user_id: UUID,
    answers: dict,  # {"1": "A", "2": "TRUE", "3": "matching"}
    db: Session = Depends(get_db)
):
    """STUDENT: Submit reading answers"""
    # Get correct answers
    questions = get_reading_questions(db, passage_id)
    
    # Calculate score
    correct = 0
    total_points = 0
    breakdown = {}
    
    for q in questions:
        student_answer = answers.get(str(q.question_number), "").strip().upper()
        correct_answer = q.answer_key.strip().upper()

        # MCQ options are stored/submitted as "A. Full option text", but the
        # model's answer_key is just the option's text without the letter
        # prefix - compare on the substantive text either way so a correct
        # selection doesn't get marked wrong over a formatting mismatch.
        is_correct = (
            student_answer == correct_answer
            or _strip_option_prefix(student_answer) == _strip_option_prefix(correct_answer)
        )
        
        breakdown[str(q.question_number)] = {
            "correct": is_correct,
            "student_answer": student_answer,
            "correct_answer": correct_answer,
            "points": float(q.points) if is_correct else 0
        }
        
        if is_correct:
            correct += 1
        
        total_points += float(q.points)
    
    # Convert to IELTS band. The official table is for a 40-question paper,
    # but generated passages carry far fewer questions, so scale to the
    # 40-question equivalent first (otherwise even 5/5 maps to band 3.5).
    band = _convert_reading_score(round(correct * 40 / len(questions)) if questions else 0)
    
    # Save attempt
    create_reading_attempt(
        db, user_id, passage_id,
        answers, correct, band, breakdown
    )
    update_user_progress(db, user_id, "reading", band)

    return {
        "score": correct,
        "total_questions": len(questions),
        "band_score": band,
        "per_question_breakdown": breakdown,
        "feedback": _generate_reading_feedback(correct, len(questions), band),
    }

def _generate_reading_feedback(correct: int, total: int, band: float) -> str:
    """Rule-based feedback (no LLM call - keeps submission fast/reliable)."""
    if band >= 8.0:
        headline = "Excellent reading comprehension!"
    elif band >= 6.5:
        headline = "Good performance, with room to sharpen detail-level accuracy."
    elif band >= 5.0:
        headline = "A solid attempt - work on scanning for specific details and keywords."
    else:
        headline = "Keep practicing - focus on understanding the overall gist before hunting for details."

    return f"{headline} You answered {correct} out of {total} questions correctly."

def _convert_reading_score(raw_score: int) -> float:
    """
    IELTS Academic Reading band conversion. Reading's raw-to-band curve is
    NOT the same as Listening's in the real exam (this used to incorrectly
    reuse Listening's table verbatim) - these breakpoints follow the commonly
    published Academic Reading conversion (slightly stricter mid-range than
    Listening, e.g. band 7 needs 30-32 correct here vs 30-31 in Listening).
    """
    if raw_score >= 39: return 9.0
    elif raw_score >= 37: return 8.5
    elif raw_score >= 35: return 8.0
    elif raw_score >= 33: return 7.5
    elif raw_score >= 30: return 7.0
    elif raw_score >= 27: return 6.5
    elif raw_score >= 23: return 6.0
    elif raw_score >= 19: return 5.5
    elif raw_score >= 15: return 5.0
    elif raw_score >= 13: return 4.5
    elif raw_score >= 10: return 4.0
    else: return 3.5