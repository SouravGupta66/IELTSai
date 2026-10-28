# backend/app/schemas.py
# Pydantic = Data validation and serialization

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from decimal import Decimal
from datetime import datetime
from uuid import UUID

# ───────────────────────────────────────────
# BASE CLASSES (Industry Pattern: DRY)
# ───────────────────────────────────────────

class BaseSchema(BaseModel):
    """Base class with common config"""
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: lambda v: float(v),
            datetime: lambda v: v.isoformat()
        }

# ───────────────────────────────────────────
# USER SCHEMAS
# ───────────────────────────────────────────

class UserCreate(BaseSchema):
    email: str
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6, max_length=72)  # Fix: 72 for bcrypt
    target_band: Optional[Decimal] = Field(default=6.0, ge=0.0, le=9.0)

class UserResponse(BaseSchema):
    id: UUID
    email: str
    name: str
    target_band: float
    created_at: datetime  # Fixed: datetime instead of str
    is_active: bool = True

# ───────────────────────────────────────────
# SPEAKING QUESTION SCHEMAS
# ───────────────────────────────────────────

class SpeakingQuestionCreate(BaseSchema):
    part: int = Field(..., ge=1, le=3)
    topic: str = Field(..., min_length=1, max_length=50)
    band_seed: Decimal = Field(..., ge=0.0, le=9.0)
    question_text: str = Field(..., min_length=10)

class SpeakingQuestionResponse(BaseSchema):
    id: Optional[UUID] = None
    part: int
    topic: str
    band_seed: float
    question_text: str
    used_count: int = 0

# ───────────────────────────────────────────
# SPEAKING SESSION SCHEMAS
# ───────────────────────────────────────────

class SpeakingSessionCreate(BaseSchema):
    question_id: UUID

class SpeakingSessionScore(BaseSchema):
    transcript: str
    band_score: Decimal = Field(..., ge=0.0, le=9.0)
    fluency_score: Optional[Decimal] = Field(None, ge=0.0, le=9.0)
    vocab_score: Optional[Decimal] = Field(None, ge=0.0, le=9.0)
    grammar_score: Optional[Decimal] = Field(None, ge=0.0, le=9.0)
    pronunciation_score: Optional[Decimal] = Field(None, ge=0.0, le=9.0)
    coherence_score: Optional[Decimal] = Field(None, ge=0.0, le=9.0)
    feedback: Optional[str] = None

class SpeakingSessionResponse(BaseSchema):
    id: UUID
    user_id: UUID
    question_id: UUID
    question: SpeakingQuestionResponse
    transcript: Optional[str]
    band_score: Optional[float]
    feedback: Optional[str]
    created_at: datetime  # Fixed: datetime instead of str

# ───────────────────────────────────────────
# WRITING PROMPT SCHEMAS
# ───────────────────────────────────────────

class WritingPromptCreate(BaseSchema):
    task_type: int = Field(..., ge=1, le=2)
    topic: str = Field(..., max_length=50)
    band_seed: Decimal = Field(..., ge=0.0, le=9.0)
    prompt_text: str = Field(..., min_length=20)
    task_1_image_url: Optional[str] = None

class WritingPromptResponse(BaseSchema):
    id: Optional[UUID] = None
    task_type: int
    topic: str
    band_seed: float
    prompt_text: str
    task_1_image_url: Optional[str] = None

# ───────────────────────────────────────────
# WRITING SUBMISSION SCHEMAS
# ───────────────────────────────────────────

class WritingSubmissionCreate(BaseSchema):
    task1_prompt_id: UUID
    task2_prompt_id: UUID
    task1_text: str = Field(default="", min_length=0)
    task2_text: str = Field(default="", min_length=0)

class WritingScoreRequest(BaseSchema):
    task1_text: str
    task2_text: str

class WritingSubmissionResponse(BaseSchema):
    id: UUID
    user_id: UUID
    task1_prompt: WritingPromptResponse
    task2_prompt: WritingPromptResponse
    task1_band: Optional[float]
    task2_band: Optional[float]
    overall_band: Optional[float]
    feedback: Optional[str]
    word_count_task1: Optional[int]
    word_count_task2: Optional[int]

# ───────────────────────────────────────────
# LISTENING TEST SCHEMAS
# ───────────────────────────────────────────

class ListeningQuestionResponse(BaseSchema):
    id: UUID
    section: int
    question_number: int
    question_text: str
    question_type: str
    options: Optional[List[str]] = None

class ListeningTestResponse(BaseSchema):
    id: Optional[UUID] = None
    topic: str
    band_seed: float
    audio_url: str
    section_count: int
    questions: List[ListeningQuestionResponse]

class ListeningAttemptCreate(BaseSchema):
    test_id: UUID
    answers: Dict[str, str]

class ListeningAttemptResponse(BaseSchema):
    id: UUID
    score: float
    band_score: float
    section_breakdown: Optional[Dict]
    time_spent_seconds: Optional[int]

# ───────────────────────────────────────────
# READING PASSAGE SCHEMAS
# ───────────────────────────────────────────

class ReadingQuestionResponse(BaseSchema):
    id: UUID
    question_number: int
    question_text: str
    question_type: str
    options: Optional[List[str]] = None

class ReadingPassageResponse(BaseSchema):
    id: Optional[UUID] = None
    topic: str
    band_seed: float
    title: Optional[str]
    passage_text: str
    word_count: Optional[int]
    questions: List[ReadingQuestionResponse]

class ReadingAttemptCreate(BaseSchema):
    passage_id: UUID
    answers: Dict[str, str]

class ReadingAttemptResponse(BaseSchema):
    id: UUID
    score: float
    band_score: float
    per_question_breakdown: Optional[Dict]

# ───────────────────────────────────────────
# HISTORY & PROGRESS SCHEMAS
# ───────────────────────────────────────────

class UserProgressResponse(BaseSchema):
    module: str
    total_attempts: int
    average_band: float
    best_band: float
    last_attempt_at: Optional[datetime]  # Fixed: datetime instead of str

class WritingHistoryResponse(BaseSchema):
    id: UUID
    created_at: datetime  # Fixed: datetime instead of str
    task1_band: Optional[float]
    task2_band: Optional[float]
    overall_band: Optional[float]
    word_count_task1: Optional[int]
    word_count_task2: Optional[int]

class ListeningHistoryResponse(BaseSchema):
    id: UUID
    created_at: datetime  # Fixed: datetime instead of str
    score: float
    band_score: float
    time_spent_seconds: Optional[int]

class ReadingHistoryResponse(BaseSchema):
    id: UUID
    created_at: datetime  # Fixed: datetime instead of str
    score: float
    band_score: float
    time_spent_seconds: Optional[int]