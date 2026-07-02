from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(64), index=True, nullable=True)
    openid = Column(String(64), unique=True, index=True, nullable=True)
    nickname = Column(String(64), nullable=True)
    avatar = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Problem(Base):
    __tablename__ = "problems"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    text = Column(Text, nullable=False)
    grade = Column(Integer, nullable=True)
    type = Column(String(32), nullable=False)
    params = Column(JSON, default=dict)
    simulator_url = Column(String(512), nullable=True)
    confidence = Column(Float, default=0.0)
    method = Column(String(16), default="rule")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Template(Base):
    __tablename__ = "templates"
    
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(32), unique=True, index=True, nullable=False)
    name = Column(String(64), nullable=False)
    icon = Column(String(16), nullable=True)
    description = Column(Text, nullable=True)
    grade_range = Column(JSON, default=list)
    config = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LearningRecord(Base):
    __tablename__ = "learning_records"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    problem_id = Column(Integer, nullable=True)
    type = Column(String(32), nullable=False, index=True)
    type_name = Column(String(64), nullable=True)
    problem_text = Column(Text, nullable=True)
    params = Column(JSON, default=dict)
    score = Column(Integer, nullable=True)
    duration = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


def get_engine():
    settings = get_settings()
    url = settings.database_url
    # 如果 URL 是 sqlite，直接创建
    if url.startswith("sqlite"):
        return create_engine(url)
    # 如果 PostgreSQL 驱动未安装，自动降级到 SQLite（仅本地开发）
    try:
        return create_engine(url)
    except ModuleNotFoundError:
        print("Warning: PostgreSQL driver not found, falling back to SQLite for local development.")
        return create_engine("sqlite:///./phet_math.db")


def get_session_local():
    engine = get_engine()
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)
