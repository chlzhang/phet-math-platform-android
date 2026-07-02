from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/users", tags=["users"])

class UserCreate(BaseModel):
    device_id: Optional[str] = None
    nickname: str
    avatar: Optional[str] = None

class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    avatar: Optional[str] = None

class UserOut(BaseModel):
    id: int
    device_id: Optional[str]
    nickname: Optional[str]
    avatar: Optional[str]
    class Config:
        from_attributes = True

@router.post("")
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    user = User(**body.model_dump(exclude_unset=True))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"success": True, "data": UserOut.model_validate(user)}

@router.get("")
def list_users(device_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(User)
    if device_id:
        q = q.filter(User.device_id == device_id)
    users = q.order_by(User.created_at.desc()).all()
    return {"success": True, "data": {"users": [UserOut.model_validate(u) for u in users]}}

@router.put("/{user_id}")
def update_user(user_id: int, body: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return {"success": True, "data": UserOut.model_validate(user)}

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    db.delete(user)
    db.commit()
    return {"success": True, "data": {"id": user_id}}
