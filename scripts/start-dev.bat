@echo off
echo Starting development environment...

cd /d "%~dp0\.."

REM Start PostgreSQL and Redis via Docker Compose
for /f "tokens=*" %%a in ('docker ps -q -f name^=phet_postgres') do set POSTGRES_RUNNING=%%a
if "%POSTGRES_RUNNING%"=="" (
    echo Starting PostgreSQL and Redis via Docker Compose...
    docker-compose up -d postgres redis
)

REM Initialize database
python scripts\init_db.py
python scripts\seed_templates.py

REM Start backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
