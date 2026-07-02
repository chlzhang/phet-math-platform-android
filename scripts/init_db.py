"""
初始化数据库表结构。
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database import init_db

if __name__ == "__main__":
    print("Initializing database tables...")
    init_db()
    print("Done.")
