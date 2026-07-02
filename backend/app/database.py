from sqlalchemy.orm import Session
from app.models import get_engine, get_session_local, Base

engine = get_engine()
SessionLocal = get_session_local()


def init_db():
    """Create all tables."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency for FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
