import json

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.routers import problems, templates, users, learning
from app.config import get_settings
from app.database import init_db

settings = get_settings()


class UTF8JSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
        ).encode("utf-8")


app = FastAPI(
    title=settings.app_name,
    description="小学数学可视化仿真平台后端 API",
    version="1.0.0",
    default_response_class=UTF8JSONResponse
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(problems.router, prefix="/api/v1")
app.include_router(templates.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(learning.router, prefix="/api/v1")


@app.get("/api/v1/health")
async def health():
    return {"success": True, "data": {"status": "ok"}}


@app.on_event("startup")
async def startup():
    # 启动时初始化数据库表
    init_db()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
