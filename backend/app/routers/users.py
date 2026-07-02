from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    openid: Optional[str] = None
    nickname: Optional[str] = None


@router.post("")
async def create_user(user: UserCreate):
    # 占位接口，实际应写入数据库
    return {
        "success": True,
        "message": "用户创建成功",
        "data": {"id": 1, "openid": user.openid, "nickname": user.nickname}
    }


@router.get("/{user_id}/records")
async def get_user_records(user_id: int):
    # 占位接口，实际应查询学习记录
    return {
        "success": True,
        "data": {"user_id": user_id, "records": []}
    }
