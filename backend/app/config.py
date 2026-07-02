from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "小学数学可视化仿真平台 API"
    debug: bool = True
    
    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/phet_math"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # Templates
    templates_dir: str = "simulators/templates"
    
    # LLM (optional)
    llm_provider: str = "mock"  # mock, openai, qwen
    llm_api_key: str = ""
    llm_model: str = ""
    llm_base_url: str = ""  # OpenAI 兼容 Base URL
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
