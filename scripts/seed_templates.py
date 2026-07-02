"""
读取 simulators/templates/ 下的 config.json，导入数据库。
"""
import sys
import os
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.database import SessionLocal, init_db
from app.models import Template
from app.services.template_engine import get_templates_dir


def seed():
    init_db()
    db = SessionLocal()
    templates_dir = get_templates_dir()
    
    count = 0
    for dirname in sorted(os.listdir(templates_dir)):
        config_path = os.path.join(templates_dir, dirname, "config.json")
        if not os.path.exists(config_path):
            continue
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
        
        existing = db.query(Template).filter(Template.type == config["type"]).first()
        if existing:
            print(f"Template {config['type']} already exists, skipping.")
            continue
        
        template = Template(
            type=config["type"],
            name=config["name"],
            icon=config.get("icon", ""),
            description=config.get("description", ""),
            grade_range=config.get("grade_range", []),
            config=config
        )
        db.add(template)
        count += 1
        print(f"Added template: {config['type']} - {config['name']}")
    
    db.commit()
    db.close()
    print(f"\nSeeded {count} templates.")


if __name__ == "__main__":
    seed()
