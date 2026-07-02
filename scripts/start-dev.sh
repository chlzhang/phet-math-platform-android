#!/bin/bash
set -e

echo "Starting development environment..."

# 启动 PostgreSQL 和 Redis（假设已通过 Docker 运行）
if ! docker ps | grep -q phet_postgres; then
    echo "Starting PostgreSQL and Redis via Docker Compose..."
    cd "$(dirname "$0")/.."
    docker-compose up -d postgres redis
fi

# 初始化数据库
cd "$(dirname "$0")/.."
python scripts/init_db.py
python scripts/seed_templates.py

# 启动后端
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
