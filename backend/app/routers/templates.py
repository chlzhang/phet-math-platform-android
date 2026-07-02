from fastapi import APIRouter, HTTPException
from app.services.template_engine import list_templates, get_template_detail

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("")
async def get_templates():
    return {
        "success": True,
        "data": {"templates": list_templates()}
    }


@router.get("/{template_type}")
async def get_template(template_type: str):
    detail = get_template_detail(template_type)
    if not detail:
        raise HTTPException(status_code=404, detail="模板不存在")
    return {
        "success": True,
        "data": detail
    }
