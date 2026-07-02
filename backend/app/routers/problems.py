from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from typing import Optional, Union
import uuid

from app.database import get_db
from app.models import Problem
from app.services.problem_parser import parse_problem
from app.services.template_engine import build_simulator_url
from app.services.llm_client import parse_with_llm

router = APIRouter(prefix="/problems", tags=["problems"])


class ParseRequest(BaseModel):
    text: str
    grade: Union[int, str] = 0

    @field_validator('grade', mode='before')
    @classmethod
    def parse_grade(cls, v):
        if isinstance(v, str):
            cn_nums = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6,
                       '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6}
            # 兼容 "四年级"、"4年级"、"grade4" 等常见写法
            for suffix in ('年级', '年級'):
                if v.endswith(suffix):
                    prefix = v[:-len(suffix)]
                    return cn_nums.get(prefix, 0)
            low = v.lower()
            if low.startswith('grade'):
                try:
                    return int(low[5:])
                except ValueError:
                    return 0
            # 纯数字或纯中文数字
            if v in cn_nums:
                return cn_nums[v]
            try:
                return int(v)
            except ValueError:
                return 0
        return v


class ParseResponse(BaseModel):
    success: bool
    message: str
    data: dict


@router.post("/parse", response_model=ParseResponse)
async def parse(request: ParseRequest, db: Session = Depends(get_db)):
    text = request.text.strip()
    if not text:
        return ParseResponse(success=False, message="题目不能为空", data={})
    
    # 先用规则匹配
    result = parse_problem(text, request.grade)
    method = "rule"
    
    # 规则匹配失败，或置信度较低时，调用 LLM 兜底/纠正
    if result["type"] == "unknown" or result["confidence"] < 0.5:
        llm_result = await parse_with_llm(text, request.grade)
        if llm_result["type"] != "unknown":
            result = llm_result
            method = "llm"
    
    if result["type"] == "unknown":
        return ParseResponse(
            success=False,
            message="无法识别题目类型，请尝试输入更完整的小学数学题目",
            data={"type": "unknown", "confidence": 0.0}
        )
    
    # 构建仿真器 URL
    simulator_url = build_simulator_url(result["type"], result["params"])
    
    # 保存到数据库
    problem = Problem(
        text=text,
        grade=request.grade or 0,
        type=result["type"],
        params=result["params"],
        simulator_url=simulator_url,
        confidence=result["confidence"],
        method=method
    )
    db.add(problem)
    db.commit()
    db.refresh(problem)
    
    return ParseResponse(
        success=True,
        message="解析成功",
        data={
            "problem_id": str(problem.id),
            "type": result["type"],
            "type_name": result["name"],
            "grade": request.grade or 0,
            "params": result["params"],
            "simulator_url": simulator_url,
            "confidence": result["confidence"],
            "method": method
        }
    )
