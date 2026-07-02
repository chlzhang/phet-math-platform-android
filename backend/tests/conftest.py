import pytest
from app.config import Settings
import app.config as config_module


def _get_test_settings() -> Settings:
    """Return test settings using an in-file SQLite database."""
    return Settings(
        app_name="Test API",
        debug=True,
        database_url="sqlite:///./test.db",
        redis_url="redis://localhost:6379/0",
        templates_dir="simulators/templates",
        llm_provider="mock",
    )


# Override get_settings before any test module imports app.main / app.database,
# ensuring all model engines and session makers use SQLite instead of PostgreSQL.
config_module.get_settings = _get_test_settings

# Import after patching so the engine is bound to SQLite.
from app.database import init_db  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Create tables in the test SQLite database once per test session."""
    init_db()
    yield
