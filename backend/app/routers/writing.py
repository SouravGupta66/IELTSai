# backend/app/routers/writing.py
# ALL writing-related API endpoints

import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from ..database import get_db
from ..curd import (
    create_writing_prompt, get_writing_prompts,
    create_writing_submission, update_writing_scores,
    get_submission_by_id, update_user_progress
)
from ..shemas import (
    WritingPromptCreate, WritingPromptResponse,
    WritingSubmissionCreate, WritingSubmissionResponse
)
from ..services.ollama_service import ollama_service

router = APIRouter()


def _round_to_half_band(score: float) -> float:
    """
    Official IELTS band rounding: round to the nearest quarter band, then
    .25 rounds up to .5 and .75 rounds up to the next whole band.
    """
    quarter = round(score * 4) / 4
    frac = quarter - int(quarter)
    if abs(frac - 0.25) < 1e-9:
        return int(quarter) + 0.5
    if abs(frac - 0.75) < 1e-9:
        return int(quarter) + 1.0
    return quarter

# ═══════════════════════════════════════════
# OFFLINE PHASE: Content Generation
# ═══════════════════════════════════════════

@router.post("/generate-prompt", response_model=WritingPromptResponse)
async def generate_prompt(
    task_type: int,
    topic: str,
    band: float,
    db: Session = Depends(get_db)
):
    """
    ADMIN: Generate new writing prompt using AI
    """
    # Generate with Qwen 3B
    generated = await asyncio.to_thread(ollama_service.generate_writing_prompt, task_type, topic, band)

    # Validate (simple check - is prompt long enough?)
    if len(generated.get("prompt_text", "")) < 20:
        # Retry once
        generated = await asyncio.to_thread(ollama_service.generate_writing_prompt, task_type, topic, band)
    
    # Store in database
    prompt_data = {
        "task_type": task_type,
        "topic": topic,
        "band_seed": band,
        "prompt_text": generated["prompt_text"],
        "task_1_image_url": generated.get("task_1_image_url")
    }
    
    db_prompt = create_writing_prompt(db, prompt_data)
    return db_prompt

# ═══════════════════════════════════════════
# LIVE PHASE: Student Interaction
# ═══════════════════════════════════════════

@router.get("/prompts", response_model=list[WritingPromptResponse])
async def fetch_prompts(
    topic: Optional[str] = None,
    band: Optional[float] = None,
    db: Session = Depends(get_db)
):
    """
    STUDENT: Get Task 1 + Task 2 prompts for a writing test
    """
    # Get Task 1 (chart/graph description)
    task1_prompts = get_writing_prompts(db, task_type=1, topic=topic, band=band)
    
    # Get Task 2 (essay)
    task2_prompts = get_writing_prompts(db, task_type=2, topic=topic, band=band)
    
    if not task1_prompts or not task2_prompts:
        # Fallback: generate on demand
        if not task1_prompts:
            generated = await asyncio.to_thread(ollama_service.generate_writing_prompt, 1, topic or "general", band or 6.0)
            prompt_data = {
                "task_type": 1,
                "topic": topic or "general",
                "band_seed": band or 6.0,
                "prompt_text": generated["prompt_text"],
                "task_1_image_url": generated.get("task_1_image_url")
            }
            db_prompt = create_writing_prompt(db, prompt_data)
            task1_prompts = [db_prompt]

        if not task2_prompts:
            generated = await asyncio.to_thread(ollama_service.generate_writing_prompt, 2, topic or "general", band or 6.0)
            prompt_data = {
                "task_type": 2,
                "topic": topic or "general",
                "band_seed": band or 6.0,
                "prompt_text": generated["prompt_text"],
                "task_1_image_url": generated.get("task_1_image_url")
            }
            db_prompt = create_writing_prompt(db, prompt_data)
            task2_prompts = [db_prompt]
    
    return task1_prompts + task2_prompts

@router.post("/submit", response_model=WritingSubmissionResponse)
async def submit_essays(
    submission: WritingSubmissionCreate,
    user_id: UUID,  # In real app: from JWT token
    db: Session = Depends(get_db)
):
    """
    STUDENT: Submit both essays
    """
    # Save to database
    db_submission = create_writing_submission(
        db, user_id,
        submission.task1_prompt_id,
        submission.task2_prompt_id,
        submission.task1_text,
        submission.task2_text
    )
    
    return db_submission

@router.post("/score/{submission_id}")
async def score_essays(
    submission_id: UUID,
    db: Session = Depends(get_db)
):
    """
    AI scores both essays using Qwen 3B
    """
    submission = get_submission_by_id(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Score Task 1
    scores1 = await asyncio.to_thread(
        ollama_service.score_writing_essay,
        submission.task1_text or "",
        submission.task1_prompt.prompt_text if submission.task1_prompt else "Writing Task 1",
        1
    )

    # Score Task 2
    scores2 = await asyncio.to_thread(
        ollama_service.score_writing_essay,
        submission.task2_text or "",
        submission.task2_prompt.prompt_text if submission.task2_prompt else "Writing Task 2",
        2
    )
    
    # Calculate overall - real IELTS weights Task 2 roughly twice Task 1
    # (not a flat 50/50 average), then rounds to the nearest half band using
    # the official rule: .25 rounds up to .5, .75 rounds up to the next whole band.
    overall = _round_to_half_band((scores1["band_score"] + 2 * scores2["band_score"]) / 3)
    
    # Combine scores
    combined_scores = {
        "task1_band": scores1["band_score"],
        "task2_band": scores2["band_score"],
        "overall_band": overall,
        "task_achievement": round((scores1["task_achievement"] + scores2["task_achievement"]) / 2, 1),
        "coherence": round((scores1["coherence"] + scores2["coherence"]) / 2, 1),
        "lexical_resource": round((scores1["lexical_resource"] + scores2["lexical_resource"]) / 2, 1),
        "grammatical_range": round((scores1["grammatical_range"] + scores2["grammatical_range"]) / 2, 1),
        "feedback": f"Task 1: {scores1['feedback']}\n\nTask 2: {scores2['feedback']}"
    }
    
    # Save scores
    update_writing_scores(db, submission_id, combined_scores)
    update_user_progress(db, submission.user_id, "writing", overall)

    return combined_scores