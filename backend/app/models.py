# backend/app/models.py
# SQLAlchemy = Python way to create SQL tables

from sqlalchemy import Column, String, Integer, DECIMAL, Boolean, Text, JSON, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .database import Base  # Connects to PostgreSQL
import uuid
from datetime import datetime

# ───────────────────────────────────────────
# 1. USERS TABLE
# ───────────────────────────────────────────
# backend/app/models.py
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    target_band = Column(DECIMAL(2,1), default=6.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    speaking_sessions = relationship("SpeakingSession", back_populates="user")
    writing_submissions = relationship("WritingSubmission", back_populates="user")

# ───────────────────────────────────────────
# 2. SPEAKING QUESTIONS (Offline Generated)
# ───────────────────────────────────────────
class SpeakingQuestion(Base):
    __tablename__ = "speaking_questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    part = Column(Integer, nullable=False)  # 1, 2, or 3
    topic = Column(String(50), nullable=False)  # 'travel', 'technology'
    band_seed = Column(DECIMAL(2,1), nullable=False)  # 5.0, 6.5, 7.0
    question_text = Column(Text, nullable=False)
    used_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # One question → Many sessions
    sessions = relationship("SpeakingSession", back_populates="question")

# ───────────────────────────────────────────
# 3. SPEAKING SESSIONS (Student Attempts)
# ───────────────────────────────────────────
class SpeakingSession(Base):
    __tablename__ = "speaking_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("speaking_questions.id"), nullable=False)
    audio_url = Column(Text)  # Path to stored audio file
    transcript = Column(Text)  # Whisper transcription
    band_score = Column(DECIMAL(2,1))
    fluency_score = Column(DECIMAL(2,1))
    vocab_score = Column(DECIMAL(2,1))
    grammar_score = Column(DECIMAL(2,1))
    pronunciation_score = Column(DECIMAL(2,1))
    coherence_score = Column(DECIMAL(2,1))
    feedback = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Connect back to parent tables
    user = relationship("User", back_populates="speaking_sessions")
    question = relationship("SpeakingQuestion", back_populates="sessions")

# ───────────────────────────────────────────
# 4. WRITING PROMPTS (Offline Generated)
# ───────────────────────────────────────────
class WritingPrompt(Base):
    __tablename__ = "writing_prompts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_type = Column(Integer, nullable=False)  # 1 or 2
    topic = Column(String(50), nullable=False)
    band_seed = Column(DECIMAL(2,1), nullable=False)
    prompt_text = Column(Text, nullable=False)
    task_1_image_url = Column(Text)  # Only for Task 1
    used_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# ───────────────────────────────────────────
# 5. WRITING SUBMISSIONS (Student Essays)
# ───────────────────────────────────────────
class WritingSubmission(Base):
    __tablename__ = "writing_submissions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    task1_prompt_id = Column(UUID(as_uuid=True), ForeignKey("writing_prompts.id"))
    task2_prompt_id = Column(UUID(as_uuid=True), ForeignKey("writing_prompts.id"))
    task1_text = Column(Text)
    task2_text = Column(Text)
    task1_band = Column(DECIMAL(2,1))
    task2_band = Column(DECIMAL(2,1))
    overall_band = Column(DECIMAL(2,1))
    task_achievement = Column(DECIMAL(2,1))
    coherence = Column(DECIMAL(2,1))
    lexical_resource = Column(DECIMAL(2,1))
    grammatical_range = Column(DECIMAL(2,1))
    feedback = Column(Text)
    word_count_task1 = Column(Integer)
    word_count_task2 = Column(Integer)
    time_spent_seconds = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="writing_submissions")
    task1_prompt = relationship("WritingPrompt", foreign_keys=[task1_prompt_id])
    task2_prompt = relationship("WritingPrompt", foreign_keys=[task2_prompt_id])

# ───────────────────────────────────────────
# 6. LISTENING TESTS (Offline Generated)
# ───────────────────────────────────────────
class ListeningTest(Base):
    __tablename__ = "listening_tests"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic = Column(String(50), nullable=False)
    band_seed = Column(DECIMAL(2,1), nullable=False)
    script_text = Column(Text, nullable=False)
    audio_url = Column(Text, nullable=False)
    section_count = Column(Integer, default=4)
    question_count = Column(Integer, default=40)
    used_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # One test → Many questions
    questions = relationship("ListeningQuestion", back_populates="test")

# ───────────────────────────────────────────
# 7. LISTENING QUESTIONS
# ───────────────────────────────────────────
class ListeningQuestion(Base):
    __tablename__ = "listening_questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    test_id = Column(UUID(as_uuid=True), ForeignKey("listening_tests.id"), nullable=False)
    section = Column(Integer, nullable=False)  # 1-4
    question_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    answer_key = Column(Text, nullable=False)
    question_type = Column(String(20), nullable=False)  # 'MCQ', 'fill_blank'
    options = Column(JSON)  # ["A", "B", "C", "D"] stored as JSON
    points = Column(DECIMAL(3,1), default=1.0)
    
    test = relationship("ListeningTest", back_populates="questions")

# ───────────────────────────────────────────
# 8. LISTENING ATTEMPTS (Student Answers)
# ───────────────────────────────────────────
class ListeningAttempt(Base):
    __tablename__ = "listening_attempts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    test_id = Column(UUID(as_uuid=True), ForeignKey("listening_tests.id"), nullable=False)
    answers = Column(JSON, nullable=False)  # {"1": "A", "2": "hotel"}
    score = Column(DECIMAL(5,2))
    band_score = Column(DECIMAL(2,1))
    section_breakdown = Column(JSON)
    time_spent_seconds = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

# ───────────────────────────────────────────
# 9. READING PASSAGES (Offline Generated)
# ───────────────────────────────────────────
class ReadingPassage(Base):
    __tablename__ = "reading_passages"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic = Column(String(50), nullable=False)
    band_seed = Column(DECIMAL(2,1), nullable=False)
    passage_text = Column(Text, nullable=False)
    title = Column(String(200))
    word_count = Column(Integer)
    question_count = Column(Integer, default=13)
    used_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    questions = relationship("ReadingQuestion", back_populates="passage")

# ───────────────────────────────────────────
# 10. READING QUESTIONS
# ───────────────────────────────────────────
class ReadingQuestion(Base):
    __tablename__ = "reading_questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    passage_id = Column(UUID(as_uuid=True), ForeignKey("reading_passages.id"), nullable=False)
    question_number = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)
    answer_key = Column(Text, nullable=False)
    question_type = Column(String(20), nullable=False)  # 'MCQ', 'T-F-NG'
    options = Column(JSON)
    points = Column(DECIMAL(3,1), default=1.0)
    
    passage = relationship("ReadingPassage", back_populates="questions")

# ───────────────────────────────────────────
# 11. READING ATTEMPTS
# ───────────────────────────────────────────
class ReadingAttempt(Base):
    __tablename__ = "reading_attempts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    passage_id = Column(UUID(as_uuid=True), ForeignKey("reading_passages.id"), nullable=False)
    answers = Column(JSON, nullable=False)
    score = Column(DECIMAL(5,2))
    band_score = Column(DECIMAL(2,1))
    per_question_breakdown = Column(JSON)
    time_spent_seconds = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)



# Add this to your schema (optional, for admin analytics)

class QuestionGenerationLog(Base):
    __tablename__ = "generation_logs"
    
    id = Column(UUID, primary_key=True)
    module = Column(String(20))           # "speaking", "writing", etc.
    topic = Column(String(50))
    band_seed = Column(DECIMAL(2,1))
    generated_text = Column(Text)         # Raw AI output
    is_valid = Column(Boolean)            # Validation result
    validation_score = Column(DECIMAL(3,1))  # 0-10
    issues = Column(JSON)                 # ["too formal", "unclear"]
    retry_count = Column(Integer, default=0)  # How many retries
    created_at = Column(DateTime, default=datetime.utcnow)


# backend/app/models.py
# ADD THIS MODEL if missing

class UserProgress(Base):
    __tablename__ = "user_progress"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    module = Column(String(20), nullable=False)  # speaking, writing, listening, reading
    total_attempts = Column(Integer, default=0)
    average_band = Column(DECIMAL(2,1), default=0.0)
    best_band = Column(DECIMAL(2,1), default=0.0)
    last_attempt_at = Column(DateTime, default=datetime.utcnow)
    
    # Unique constraint: one progress record per user per module
    __table_args__ = (
        # This is SQLAlchemy way to define unique constraint
        {'sqlite_autoincrement': True}  # Remove if using PostgreSQL only
    )