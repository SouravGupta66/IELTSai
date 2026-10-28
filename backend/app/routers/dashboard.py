# backend/app/routers/dashboard.py (NEW FILE)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ..database import get_db
from ..models import SpeakingSession, WritingSubmission, ListeningAttempt, ReadingAttempt, UserProgress

router = APIRouter()


def _utc_iso(dt):
    """Models store naive UTC (datetime.utcnow); mark it as UTC so browsers
    don't parse it as local time and show e.g. "6 hours ago" for a fresh attempt."""
    return dt.isoformat() + "Z" if dt else None

@router.get("/stats/{user_id}")
async def get_user_stats(user_id: UUID, db: Session = Depends(get_db)):
    """Get user statistics for dashboard"""
    
    # Count sessions
    speaking_count = db.query(SpeakingSession).filter(SpeakingSession.user_id == user_id).count()
    writing_count = db.query(WritingSubmission).filter(WritingSubmission.user_id == user_id).count()
    listening_count = db.query(ListeningAttempt).filter(ListeningAttempt.user_id == user_id).count()
    reading_count = db.query(ReadingAttempt).filter(ReadingAttempt.user_id == user_id).count()
    
    total_tests = speaking_count + writing_count + listening_count + reading_count
    
    # Get progress
    progress = db.query(UserProgress).filter(UserProgress.user_id == user_id).all()
    
    # Calculate average band
    scores = []
    for p in progress:
        scores.append(float(p.average_band))
    
    avg_band = sum(scores) / len(scores) if scores else 0
    
    # Get best scores
    best_scores = {}
    for p in progress:
        best_scores[p.module] = float(p.best_band)
    
    return {
        "total_tests": total_tests,
        "speaking_count": speaking_count,
        "writing_count": writing_count,
        "listening_count": listening_count,
        "reading_count": reading_count,
        "average_band": round(avg_band, 1),
        "best_scores": best_scores,
        "progress": {
            "speaking": best_scores.get("speaking", 0),
            "writing": best_scores.get("writing", 0),
            "listening": best_scores.get("listening", 0),
            "reading": best_scores.get("reading", 0),
        }
    }

@router.get("/recent/{user_id}")
async def get_recent_activity(user_id: UUID, db: Session = Depends(get_db)):
    """Get recent practice activity across all 4 IELTS modules"""
    
    activity = []
    
    # 1. Speaking sessions
    speaking = db.query(SpeakingSession).filter(
        SpeakingSession.user_id == user_id
    ).order_by(SpeakingSession.created_at.desc()).limit(5).all()
    for s in speaking:
        activity.append({
            "module": "speaking",
            "type": "speaking",
            "band": float(s.band_score) if s.band_score else 0,
            "score": float(s.band_score) if s.band_score else 0,
            "created_at": _utc_iso(s.created_at),
            "date": s.created_at.strftime("%Y-%m-%d %H:%M") if s.created_at else ""
        })
        
    # 2. Writing submissions
    writing = db.query(WritingSubmission).filter(
        WritingSubmission.user_id == user_id
    ).order_by(WritingSubmission.created_at.desc()).limit(5).all()
    for w in writing:
        band = float(w.overall_band) if w.overall_band else float(w.task2_band or w.task1_band or 0)
        activity.append({
            "module": "writing",
            "type": "writing",
            "band": band,
            "score": band,
            "created_at": _utc_iso(w.created_at),
            "date": w.created_at.strftime("%Y-%m-%d %H:%M") if w.created_at else ""
        })
        
    # 3. Listening attempts
    listening = db.query(ListeningAttempt).filter(
        ListeningAttempt.user_id == user_id
    ).order_by(ListeningAttempt.created_at.desc()).limit(5).all()
    for l in listening:
        activity.append({
            "module": "listening",
            "type": "listening",
            "band": float(l.band_score) if l.band_score else 0,
            "score": float(l.band_score) if l.band_score else 0,
            "created_at": _utc_iso(l.created_at),
            "date": l.created_at.strftime("%Y-%m-%d %H:%M") if l.created_at else ""
        })
        
    # 4. Reading attempts
    reading = db.query(ReadingAttempt).filter(
        ReadingAttempt.user_id == user_id
    ).order_by(ReadingAttempt.created_at.desc()).limit(5).all()
    for r in reading:
        activity.append({
            "module": "reading",
            "type": "reading",
            "band": float(r.band_score) if r.band_score else 0,
            "score": float(r.band_score) if r.band_score else 0,
            "created_at": _utc_iso(r.created_at),
            "date": r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else ""
        })

    # Sort all activities by created_at descending
    activity.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    
    return activity[:4]