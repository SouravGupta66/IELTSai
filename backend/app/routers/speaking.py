# backend/app/routers/speaking.py
# FIXED VERSION

import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
#                                    ↑↑↑↑↑↑↑↑↑
#                                    IMPORT BackgroundTasks here!
import uuid
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID
import os

from ..database import get_db
from ..curd import (
    create_speaking_question, get_speaking_question,
    create_speaking_session, update_speaking_session,
    increment_question_usage, get_user_speaking_history,
    get_session_by_id, get_session_with_question,  # Make sure these exist!
    update_user_progress
)
from ..shemas import (
    SpeakingQuestionCreate, SpeakingQuestionResponse,
    SpeakingSessionCreate, SpeakingSessionResponse,
    SpeakingSessionScore
)
from ..services.ollama_service import ollama_service
from ..services.stt_service import stt_service

router = APIRouter()


def _compose_question_text(generated: dict) -> str:
    """
    Folds Part 2's cue_points into question_text as real cue-card formatted
    text ("Describe a/an X.\n\nYou should say:\n- ...\n- ..."), since the DB
    has no separate column for them and adding one isn't safe without a
    migration path (create_all() won't alter already-created tables).
    """
    cue_points = generated.get("cue_points")
    if not cue_points:
        return generated["question_text"]

    bullets = "\n".join(f"- {point}" for point in cue_points)
    return f"{generated['question_text']}\n\nYou should say:\n{bullets}"

# ═══════════════════════════════════════════
# OFFLINE PHASE: Admin generates content
# ═══════════════════════════════════════════

@router.post("/generate-question", response_model=SpeakingQuestionResponse)
async def generate_question(
    part: int,
    topic: str,
    band: float,
    db: Session = Depends(get_db)
):
    """
    ADMIN ONLY: Generate new speaking question using AI
    """
    # Generate with Qwen 3B
    generated = await asyncio.to_thread(ollama_service.generate_speaking_question, part, topic, band)

    # Validate (fast rule-based check, no LLM call)
    validation = ollama_service.validate_speaking_question(
        generated["question_text"], part, band
    )

    # If valid, store in database
    if validation.get("is_valid", True):
        question_data = {
            "part": part,
            "topic": topic,
            "band_seed": band,
            "question_text": _compose_question_text(generated)
        }
        db_question = create_speaking_question(db, question_data)
        return db_question

    # Retry once
    else:
        generated = await asyncio.to_thread(ollama_service.generate_speaking_question, part, topic, band)
        validation = ollama_service.validate_speaking_question(
            generated["question_text"], part, band
        )

        if validation.get("is_valid", True):
            question_data = {
                "part": part,
                "topic": topic,
                "band_seed": band,
                "question_text": _compose_question_text(generated)
            }
            db_question = create_speaking_question(db, question_data)
            return db_question
        
        raise HTTPException(
            status_code=400,
            detail=f"Failed to generate valid question: {validation.get('issues', ['Unknown'])}"
        )

# ═══════════════════════════════════════════
# LIVE PHASE: Student gets question
# ═══════════════════════════════════════════

@router.get("/question", response_model=SpeakingQuestionResponse)
async def fetch_question(
    part: int,
    topic: Optional[str] = None,
    band: Optional[float] = None,
    db: Session = Depends(get_db)
    # REMOVED: background_tasks from here!
    # BackgroundTasks doesn't work well with GET requests
):
    """
    STUDENT: Get a speaking question from database
    If not found, returns 404 (frontend should handle this)
    """
    # Fetch from database
    question = get_speaking_question(db, part=part, topic=topic, band=band)
    
    if not question:
        raise HTTPException(
            status_code=404,
            detail="No questions available. Ask admin to generate some!"
        )
    
    # Track usage
    increment_question_usage(db, question.id)
    
    return question

# ═══════════════════════════════════════════
# ALTERNATIVE: Generate-on-demand endpoint (POST, not GET)
# ═══════════════════════════════════════════

@router.post("/question-live", response_model=SpeakingQuestionResponse)
async def fetch_question_live(
    part: int,
    topic: str,
    band: float,
    background_tasks: BackgroundTasks,  # ✅ Works in POST!
    db: Session = Depends(get_db)
):
    """
    STUDENT: Get question - generates live if not in DB
    Slower but always works
    """
    # Try database first
    question = get_speaking_question(db, part=part, topic=topic, band=band)
    
    if question:
        increment_question_usage(db, question.id)
        return question
    
    # Not found - generate live
    print(f"⚠️  No question found. Generating live...")
    
    try:
        generated = await asyncio.to_thread(ollama_service.generate_speaking_question, part, topic, band)

        # Store it if it passes the same cheap rule-based check as the admin
        # endpoint: a real DB row is required for start-session (FK on
        # question_id), and it grows the bank so the next student hits the DB.
        validation = ollama_service.validate_speaking_question(
            generated["question_text"], part, band
        )
        if validation.get("is_valid", True) and len(topic) <= 50:
            return create_speaking_question(db, {
                "part": part,
                "topic": topic,
                "band_seed": band,
                "question_text": _compose_question_text(generated)
            })

        # Invalid output (or topic too long for the column): return unsaved
        temp_id = uuid.uuid4()
        return SpeakingQuestionResponse(
            id=temp_id,
            part=part,
            topic=topic,
            band_seed=band,
            question_text=_compose_question_text(generated),
            used_count=0
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"AI generation failed: {str(e)}"
        )

# ═══════════════════════════════════════════
# SESSION MANAGEMENT
# ═══════════════════════════════════════════

@router.post("/start-session", response_model=SpeakingSessionResponse)
async def start_session(
    question_id: UUID,
    user_id: UUID,
    db: Session = Depends(get_db)
):
    """
    STUDENT: Start a new speaking practice session
    """
    session = create_speaking_session(db, user_id, question_id)
    return session

@router.post("/upload-audio/{session_id}")
async def upload_audio(
    session_id: UUID,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    STUDENT: Upload recorded audio file
    """
    # Ensure directory exists
    os.makedirs("uploads/audio", exist_ok=True)
    
    # Save file
    file_path = f"uploads/audio/{session_id}.wav"
    with open(file_path, "wb") as f:
        f.write(await audio.read())
    
    # Update session
    update_speaking_session(db, session_id, audio_url=file_path)
    
    return {"status": "success", "audio_url": file_path}

@router.post("/transcribe/{session_id}")
async def transcribe_audio(
    session_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Convert audio to text using Whisper
    """
    session = get_session_by_id(db, session_id)
    if not session or not session.audio_url:
        raise HTTPException(status_code=404, detail="Audio not found")

    if not os.path.exists(session.audio_url):
        raise HTTPException(status_code=404, detail="Audio file missing on disk")

    try:
        transcript = await asyncio.to_thread(stt_service.transcribe, session.audio_url)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Transcription failed: {str(e)}")

    if not transcript:
        # VAD found no speech at all - almost always a mic/recording issue on
        # the client (wrong input device, muted, permission granted but no
        # signal), not a transcription failure. Surface that clearly instead
        # of silently storing an empty transcript that would confuse scoring.
        raise HTTPException(
            status_code=422,
            detail="No speech detected in the recording. Check your microphone and try again."
        )

    update_speaking_session(db, session_id, transcript=transcript)
    
    return {"status": "success", "transcript": transcript}

from pydantic import BaseModel

class ExaminerTurnPayload(BaseModel):
    part: int
    topic: str
    current_question: str
    dialogue_history: list = []
    latest_user_transcript: str

class ScoreSessionPayload(BaseModel):
    transcript: Optional[str] = None
    dialogue_history: Optional[list] = None

@router.post("/examiner-turn")
async def generate_examiner_turn(payload: ExaminerTurnPayload):
    """
    Generate dynamic real-time examiner follow-up reply based on candidate's transcript
    """
    reply = await asyncio.to_thread(
        ollama_service.generate_examiner_turn,
        payload.part,
        payload.topic,
        payload.current_question,
        payload.dialogue_history,
        payload.latest_user_transcript
    )
    return reply

@router.post("/score/{session_id}")
async def score_session(
    session_id: UUID,
    payload: Optional[ScoreSessionPayload] = None,
    db: Session = Depends(get_db)
):
    """
    AI scores the speaking answer (supports multi-turn dialogue history)
    """
    session = get_session_with_question(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    transcript_to_use = (payload and payload.transcript) or session.transcript
    dialogue_history = payload.dialogue_history if payload else None
    
    if not transcript_to_use and not dialogue_history:
        raise HTTPException(status_code=400, detail="No transcript or dialogue to score")
    
    # Score with AI
    scores = await asyncio.to_thread(
        ollama_service.score_speaking_answer,
        transcript_to_use or "",
        session.question.question_text,
        session.question.part,
        dialogue_history
    )
    
    # Save scores
    if transcript_to_use and not session.transcript:
        update_speaking_session(db, session_id, transcript=transcript_to_use)
    
    update_speaking_session(db, session_id, scores=scores)
    if scores.get("band_score") is not None:
        update_user_progress(db, session.user_id, "speaking", scores["band_score"])

    return scores

@router.get("/history/{user_id}")
async def get_history(
    user_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get student's speaking history
    """
    history = get_user_speaking_history(db, user_id)
    return history