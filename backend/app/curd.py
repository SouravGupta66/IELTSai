# backend/app/crud.py
# ALL database operations happen here
# Industry rule: No other file touches the database directly!

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from uuid import UUID
import json

# Import our models
from .models import (
    User, SpeakingQuestion, SpeakingSession,
    WritingPrompt, WritingSubmission,
    ListeningTest, ListeningQuestion, ListeningAttempt,
    ReadingPassage, ReadingQuestion, ReadingAttempt,UserProgress
)
from datetime import datetime

# Import schemas for type hints
from .shemas import (
    UserCreate, SpeakingQuestionCreate, SpeakingSessionCreate,
    WritingPromptCreate, WritingSubmissionCreate,
    ListeningAttemptCreate, ReadingAttemptCreate
)

# ═══════════════════════════════════════════
# USER CRUD
# ═══════════════════════════════════════════

def create_user(db: Session, email: str, name: str, hashed_password: str, target_band: float = 6.0):
    """Create new user with password"""
    db_user = User(
        email=email,
        name=name,
        hashed_password=hashed_password,
        target_band=target_band
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user
    
       
   
def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Find user by email (for login)"""
    return db.query(User).filter(User.email == email).first()

def get_user_by_id(db: Session, user_id: UUID) -> Optional[User]:
    """Find user by ID"""
    return db.query(User).filter(User.id == user_id).first()

# ═══════════════════════════════════════════
# SPEAKING QUESTIONS CRUD (Offline Content)
# ═══════════════════════════════════════════

def create_speaking_question(db: Session, question_data: dict) -> SpeakingQuestion:
    """Store AI-generated question in database"""
    db_question = SpeakingQuestion(
        part=question_data["part"],
        topic=question_data["topic"],
        band_seed=question_data["band_seed"],
        question_text=question_data["question_text"],
        used_count=0
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

def get_speaking_question(
    db: Session,
    part: Optional[int] = None,
    topic: Optional[str] = None,
    band: Optional[float] = None
) -> Optional[SpeakingQuestion]:
    """
    Get a random question matching criteria
    Industry pattern: Use least-used questions first
    """
    query = db.query(SpeakingQuestion).filter(SpeakingQuestion.is_active == True)
    
    if part:
        query = query.filter(SpeakingQuestion.part == part)
    if topic:
        query = query.filter(SpeakingQuestion.topic == topic)
    if band:
        # Get closest band (±0.5 range)
        query = query.filter(
            SpeakingQuestion.band_seed >= band - 0.5,
            SpeakingQuestion.band_seed <= band + 0.5
        )
    
    # Order by least used (fair distribution)
    return query.order_by(SpeakingQuestion.used_count.asc()).first()

def increment_question_usage(db: Session, question_id: UUID):
    """Track how many times question was used"""
    question = db.query(SpeakingQuestion).filter(SpeakingQuestion.id == question_id).first()
    if question:
        question.used_count += 1
        db.commit()

# ═══════════════════════════════════════════
# SPEAKING SESSIONS CRUD (Student Attempts)
# ═══════════════════════════════════════════

def create_speaking_session(db: Session, user_id: UUID, question_id: UUID) -> SpeakingSession:
    """Start a new speaking session"""
    db_session = SpeakingSession(
        user_id=user_id,
        question_id=question_id
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def update_speaking_session(
    db: Session,
    session_id: UUID,
    audio_url: Optional[str] = None,
    transcript: Optional[str] = None,
    scores: Optional[dict] = None
) -> SpeakingSession:
    """Update session with AI scoring results"""
    db_session = db.query(SpeakingSession).filter(SpeakingSession.id == session_id).first()
    
    if not db_session:
        return None
    
    if audio_url:
        db_session.audio_url = audio_url
    if transcript:
        db_session.transcript = transcript
    if scores:
        db_session.band_score = scores.get("band_score")
        db_session.fluency_score = scores.get("fluency")
        db_session.vocab_score = scores.get("vocabulary")
        db_session.grammar_score = scores.get("grammar")
        db_session.pronunciation_score = scores.get("pronunciation")
        db_session.coherence_score = scores.get("coherence")
        db_session.feedback = scores.get("feedback")
    
    db.commit()
    db.refresh(db_session)
    return db_session

def get_user_speaking_history(db: Session, user_id: UUID) -> List[SpeakingSession]:
    """Get all speaking attempts for a user"""
    return db.query(SpeakingSession).filter(
        SpeakingSession.user_id == user_id
    ).order_by(SpeakingSession.created_at.desc()).all()

# ═══════════════════════════════════════════
# WRITING PROMPTS CRUD (Offline Content)
# ═══════════════════════════════════════════

def create_writing_prompt(db: Session, prompt_data: dict) -> WritingPrompt:
    """Store AI-generated writing prompt"""
    db_prompt = WritingPrompt(
        task_type=prompt_data["task_type"],
        topic=prompt_data["topic"],
        band_seed=prompt_data["band_seed"],
        prompt_text=prompt_data["prompt_text"],
        task_1_image_url=prompt_data.get("task_1_image_url")
    )
    db.add(db_prompt)
    db.commit()
    db.refresh(db_prompt)
    return db_prompt

def get_writing_prompts(
    db: Session,
    task_type: int,
    topic: Optional[str] = None,
    band: Optional[float] = None
) -> List[WritingPrompt]:
    """Get writing prompts for a test (Task 1 + Task 2)"""
    query = db.query(WritingPrompt).filter(
        WritingPrompt.task_type == task_type,
        WritingPrompt.is_active == True
    )
    
    if topic:
        query = query.filter(WritingPrompt.topic == topic)
    if band:
        query = query.filter(
            WritingPrompt.band_seed >= band - 0.5,
            WritingPrompt.band_seed <= band + 0.5
        )
    
    return query.order_by(func.random()).limit(1).all()

# ═══════════════════════════════════════════
# WRITING SUBMISSIONS CRUD (Student Essays)
# ═══════════════════════════════════════════

def create_writing_submission(
    db: Session,
    user_id: UUID,
    task1_prompt_id: Optional[UUID],
    task2_prompt_id: Optional[UUID],
    task1_text: str,
    task2_text: str
) -> WritingSubmission:
    """Save student essays"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        user = db.query(User).first()
        if user:
            user_id = user.id
        else:
            user = User(
                id=user_id,
                email="demo@example.com",
                name="Demo User",
                hashed_password="demo"
            )
            db.add(user)
            db.commit()

    db_submission = WritingSubmission(
        user_id=user_id,
        task1_prompt_id=task1_prompt_id,
        task2_prompt_id=task2_prompt_id,
        task1_text=task1_text,
        task2_text=task2_text,
        word_count_task1=len(task1_text.split()) if task1_text else 0,
        word_count_task2=len(task2_text.split()) if task2_text else 0
    )
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    return db_submission

def update_writing_scores(
    db: Session,
    submission_id: UUID,
    scores: dict
) -> WritingSubmission:
    """Update with AI scores"""
    db_sub = db.query(WritingSubmission).filter(WritingSubmission.id == submission_id).first()
    
    if not db_sub:
        return None
    
    db_sub.task1_band = scores.get("task1_band")
    db_sub.task2_band = scores.get("task2_band")
    db_sub.overall_band = scores.get("overall_band")
    db_sub.task_achievement = scores.get("task_achievement")
    db_sub.coherence = scores.get("coherence")
    db_sub.lexical_resource = scores.get("lexical_resource")
    db_sub.grammatical_range = scores.get("grammatical_range")
    db_sub.feedback = scores.get("feedback")
    
    db.commit()
    db.refresh(db_sub)
    return db_sub

# ═══════════════════════════════════════════
# LISTENING TESTS CRUD (Offline Content)
# ═══════════════════════════════════════════

def create_listening_test(db: Session, test_data: dict) -> ListeningTest:
    """Store AI-generated listening test"""
    db_test = ListeningTest(
        topic=test_data["topic"],
        band_seed=test_data["band_seed"],
        script_text=test_data["script_text"],
        audio_url=test_data["audio_url"],
        question_count=test_data.get("question_count", 40)
    )
    db.add(db_test)
    db.commit()
    db.refresh(db_test)
    return db_test

def create_listening_question(db: Session, test_id: UUID, question_data: dict) -> ListeningQuestion:
    """Store individual listening question"""
    db_question = ListeningQuestion(
        test_id=test_id,
        section=question_data["section"],
        question_number=question_data["question_number"],
        question_text=question_data["question_text"],
        answer_key=question_data["answer"],
        question_type=question_data["type"],
        options=question_data.get("options"),
        points=question_data.get("points", 1.0)
    )
    db.add(db_question)
    db.commit()
    return db_question

def get_listening_test(
    db: Session,
    topic: Optional[str] = None,
    band: Optional[float] = None
) -> Optional[ListeningTest]:
    """Get a listening test"""
    query = db.query(ListeningTest).filter(ListeningTest.is_active == True)
    
    if topic:
        query = query.filter(ListeningTest.topic == topic)
    if band:
        query = query.filter(
            ListeningTest.band_seed >= band - 0.5,
            ListeningTest.band_seed <= band + 0.5
        )
    
    return query.order_by(func.random()).first()

def get_listening_questions(db: Session, test_id: UUID) -> List[ListeningQuestion]:
    """Get all questions for a test"""
    return db.query(ListeningQuestion).filter(
        ListeningQuestion.test_id == test_id
    ).order_by(ListeningQuestion.section, ListeningQuestion.question_number).all()

# ═══════════════════════════════════════════
# LISTENING ATTEMPTS CRUD (Student Answers)
# ═══════════════════════════════════════════

def create_listening_attempt(
    db: Session,
    user_id: UUID,
    test_id: UUID,
    answers: dict,
    score: float,
    band: float,
    section_breakdown: Optional[dict] = None
) -> ListeningAttempt:
    """Save student listening answers"""
    db_attempt = ListeningAttempt(
        user_id=user_id,
        test_id=test_id,
        answers=answers,
        score=score,
        band_score=band,
        section_breakdown=section_breakdown
    )
    db.add(db_attempt)
    db.commit()
    db.refresh(db_attempt)
    return db_attempt

# ═══════════════════════════════════════════
# READING PASSAGES CRUD (Offline Content)
# ═══════════════════════════════════════════

def create_reading_passage(db: Session, passage_data: dict) -> ReadingPassage:
    """Store AI-generated reading passage"""
    db_passage = ReadingPassage(
        topic=passage_data["topic"],
        band_seed=passage_data["band_seed"],
        title=passage_data.get("title"),
        passage_text=passage_data["passage_text"],
        word_count=passage_data.get("word_count", len(passage_data["passage_text"].split())),
        question_count=len(passage_data.get("questions", []))
    )
    db.add(db_passage)
    db.commit()
    db.refresh(db_passage)
    return db_passage

def create_reading_question(db: Session, passage_id: UUID, question_data: dict) -> ReadingQuestion:
    """Store individual reading question"""
    db_question = ReadingQuestion(
        passage_id=passage_id,
        question_number=question_data["question_number"],
        question_text=question_data["question_text"],
        answer_key=question_data["answer"],
        question_type=question_data["type"],
        options=question_data.get("options"),
        points=question_data.get("points", 1.0)
    )
    db.add(db_question)
    db.commit()
    return db_question

def get_reading_passage(
    db: Session,
    topic: Optional[str] = None,
    band: Optional[float] = None
) -> Optional[ReadingPassage]:
    """Get a reading passage"""
    query = db.query(ReadingPassage).filter(ReadingPassage.is_active == True)
    
    if topic:
        query = query.filter(ReadingPassage.topic == topic)
    if band:
        query = query.filter(
            ReadingPassage.band_seed >= band - 0.5,
            ReadingPassage.band_seed <= band + 0.5
        )
    
    return query.order_by(func.random()).first()

def get_reading_questions(db: Session, passage_id: UUID) -> List[ReadingQuestion]:
    """Get all questions for a passage"""
    return db.query(ReadingQuestion).filter(
        ReadingQuestion.passage_id == passage_id
    ).order_by(ReadingQuestion.question_number).all()

# ═══════════════════════════════════════════
# READING ATTEMPTS CRUD (Student Answers)
# ═══════════════════════════════════════════

def create_reading_attempt(
    db: Session,
    user_id: UUID,
    passage_id: UUID,
    answers: dict,
    score: float,
    band: float,
    breakdown: Optional[dict] = None
) -> ReadingAttempt:
    """Save student reading answers"""
    db_attempt = ReadingAttempt(
        user_id=user_id,
        passage_id=passage_id,
        answers=answers,
        score=score,
        band_score=band,
        per_question_breakdown=breakdown
    )
    db.add(db_attempt)
    db.commit()
    db.refresh(db_attempt)
    return db_attempt


# Add these functions to backend/app/crud.py

def get_session_by_id(db: Session, session_id: UUID) -> Optional[SpeakingSession]:
    """Get speaking session by ID"""
    return db.query(SpeakingSession).filter(SpeakingSession.id == session_id).first()

def get_session_with_question(db: Session, session_id: UUID) -> Optional[SpeakingSession]:
    """Get session with question data (eager loading)"""
    from sqlalchemy.orm import joinedload
    return db.query(SpeakingSession).options(
        joinedload(SpeakingSession.question)
    ).filter(SpeakingSession.id == session_id).first()



# backend/app/crud.py
# ADD THESE FUNCTIONS to your existing file

# ═══════════════════════════════════════════
# EXISTING FUNCTIONS (you already have these)
# ═══════════════════════════════════════════
# create_user, get_user_by_email, get_user_by_id
# create_speaking_question, get_speaking_question, increment_question_usage
# create_speaking_session, update_speaking_session, get_user_speaking_history
# create_writing_prompt, get_writing_prompts
# create_writing_submission, update_writing_scores
# create_listening_test, create_listening_question, get_listening_test
# get_listening_questions, create_listening_attempt
# create_reading_passage, create_reading_question, get_reading_passage
# get_reading_questions, create_reading_attempt

# ═══════════════════════════════════════════
# NEW: MISSING FUNCTIONS FOR ROUTERS
# ═══════════════════════════════════════════

# ─── SPEAKING SESSION ───

def get_session_by_id(db: Session, session_id: UUID) -> Optional[SpeakingSession]:
    """Get speaking session by ID (for audio upload/transcribe)"""
    return db.query(SpeakingSession).filter(SpeakingSession.id == session_id).first()

def get_session_with_question(db: Session, session_id: UUID) -> Optional[SpeakingSession]:
    """Get session with question data (for scoring)"""
    from sqlalchemy.orm import joinedload
    return db.query(SpeakingSession).options(
        joinedload(SpeakingSession.question)
    ).filter(SpeakingSession.id == session_id).first()

# ─── WRITING SUBMISSION ───

def get_submission_by_id(db: Session, submission_id: UUID) -> Optional[WritingSubmission]:
    """Get writing submission with prompts (for scoring)"""
    from sqlalchemy.orm import joinedload
    return db.query(WritingSubmission).options(
        joinedload(WritingSubmission.task1_prompt),
        joinedload(WritingSubmission.task2_prompt)
    ).filter(WritingSubmission.id == submission_id).first()

def get_user_writing_history(db: Session, user_id: UUID) -> List[WritingSubmission]:
    """Get all writing submissions for a user"""
    return db.query(WritingSubmission).filter(
        WritingSubmission.user_id == user_id
    ).order_by(WritingSubmission.created_at.desc()).all()

# ─── LISTENING TEST ───

def get_listening_test_by_id(db: Session, test_id: UUID) -> Optional[ListeningTest]:
    """Get listening test by ID"""
    return db.query(ListeningTest).filter(ListeningTest.id == test_id).first()

def get_user_listening_history(db: Session, user_id: UUID) -> List[ListeningAttempt]:
    """Get all listening attempts for a user"""
    return db.query(ListeningAttempt).filter(
        ListeningAttempt.user_id == user_id
    ).order_by(ListeningAttempt.created_at.desc()).all()

# ─── READING PASSAGE ───

def get_reading_passage_by_id(db: Session, passage_id: UUID) -> Optional[ReadingPassage]:
    """Get reading passage by ID"""
    return db.query(ReadingPassage).filter(ReadingPassage.id == passage_id).first()

def get_user_reading_history(db: Session, user_id: UUID) -> List[ReadingAttempt]:
    """Get all reading attempts for a user"""
    return db.query(ReadingAttempt).filter(
        ReadingAttempt.user_id == user_id
    ).order_by(ReadingAttempt.created_at.desc()).all()

# ─── USER PROGRESS (Gamification) ───

def get_user_progress(db: Session, user_id: UUID) -> List[UserProgress]:
    """Get progress across all modules"""
    return db.query(UserProgress).filter(UserProgress.user_id == user_id).all()

def update_user_progress(db: Session, user_id: UUID, module: str, band: float):
    """Update user's best/average score for a module"""
    progress = db.query(UserProgress).filter(
        UserProgress.user_id == user_id,
        UserProgress.module == module
    ).first()
    
    if progress:
        # Update existing
        # average_band/best_band are SQL DECIMAL columns (Python Decimal) - Decimal
        # and float can't be mixed in arithmetic (TypeError), so normalize to float.
        progress.total_attempts += 1
        progress.average_band = (float(progress.average_band) + band) / 2
        if band > float(progress.best_band):
            progress.best_band = band
        progress.last_attempt_at = datetime.utcnow()
    else:
        # Create new
        progress = UserProgress(
            user_id=user_id,
            module=module,
            total_attempts=1,
            average_band=band,
            best_band=band
        )
        db.add(progress)
    
    db.commit()
    return progress