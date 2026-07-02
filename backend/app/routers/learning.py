from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.database import get_db
from app.models import LearningRecord

router = APIRouter(prefix="/learning", tags=["learning"])

class RecordCreate(BaseModel):
    user_id: Optional[int] = None
    problem_id: Optional[int] = None
    type: str
    type_name: Optional[str] = None
    problem_text: Optional[str] = None
    params: Optional[dict] = None
    score: Optional[int] = None
    duration: Optional[int] = 0

@router.post("/record")
def create_record(body: RecordCreate, db: Session = Depends(get_db)):
    record = LearningRecord(**body.model_dump(exclude_unset=True))
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"success": True, "data": {"id": record.id}}

@router.get("/history")
def history(user_id: Optional[int] = None, page: int = 1, size: int = 20, db: Session = Depends(get_db)):
    q = db.query(LearningRecord)
    if user_id is not None:
        q = q.filter(LearningRecord.user_id == user_id)
    total = q.count()
    records = q.order_by(LearningRecord.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {
        "success": True,
        "data": {
            "total": total,
            "page": page,
            "size": size,
            "records": [
                {
                    "id": r.id,
                    "user_id": r.user_id,
                    "type": r.type,
                    "type_name": r.type_name,
                    "problem_text": r.problem_text,
                    "params": r.params,
                    "score": r.score,
                    "duration": r.duration,
                    "created_at": r.created_at.isoformat() if r.created_at else None
                }
                for r in records
            ]
        }
    }

@router.get("/progress")
def progress(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(LearningRecord)
    if user_id is not None:
        q = q.filter(LearningRecord.user_id == user_id)
    rows = q.all()
    stats = {}
    for r in rows:
        s = stats.setdefault(r.type, {"type_name": r.type_name or r.type, "total": 0, "correct": 0, "accuracy": 0.0, "last_at": None})
        s["total"] += 1
        if r.score is not None and r.score >= 100:
            s["correct"] += 1
        ts = r.created_at.isoformat() if r.created_at else ""
        if s["last_at"] is None or ts > s["last_at"]:
            s["last_at"] = ts
    for s in stats.values():
        s["accuracy"] = round(s["correct"] / s["total"], 2) if s["total"] else 0.0
    return {"success": True, "data": {"progress": stats}}

@router.get("/mistakes")
def mistakes(user_id: Optional[int] = None, page: int = 1, size: int = 20, db: Session = Depends(get_db)):
    q = db.query(LearningRecord).filter(LearningRecord.score < 100)
    if user_id is not None:
        q = q.filter(LearningRecord.user_id == user_id)
    total = q.count()
    records = q.order_by(LearningRecord.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {
        "success": True,
        "data": {
            "total": total,
            "records": [
                {"id": r.id, "type": r.type, "type_name": r.type_name, "problem_text": r.problem_text,
                 "params": r.params, "score": r.score, "created_at": r.created_at.isoformat() if r.created_at else None}
                for r in records
            ]
        }
    }
