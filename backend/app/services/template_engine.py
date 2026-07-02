import json
import os
from typing import List, Dict, Any, Optional, Tuple
from app.config import get_settings


def get_templates_dir() -> str:
    """获取仿真器模板目录的绝对路径。"""
    settings = get_settings()
    # 如果 templates_dir 是相对路径，基于项目根目录解析
    if not os.path.isabs(settings.templates_dir):
        # __file__ = backend/app/services/template_engine.py
        # 项目根目录 = backend/app/services -> backend/app -> backend -> project_root
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        return os.path.join(project_root, settings.templates_dir)
    return settings.templates_dir


def list_template_dirs() -> List[str]:
    """列出所有模板目录名。"""
    templates_dir = get_templates_dir()
    if not os.path.exists(templates_dir):
        return []
    return sorted([
        d for d in os.listdir(templates_dir)
        if os.path.isdir(os.path.join(templates_dir, d))
        and os.path.exists(os.path.join(templates_dir, d, "config.json"))
    ])


def _load_all_templates() -> List[Tuple[str, Dict[str, Any]]]:
    """加载所有模板，返回 (目录名, 配置) 列表。"""
    result = []
    for dirname in list_template_dirs():
        config_path = os.path.join(get_templates_dir(), dirname, "config.json")
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
        result.append((dirname, config))
    return result


def _find_dir_by_type(template_type: str) -> Optional[str]:
    """根据题型 type 找到对应的目录名。"""
    for dirname, config in _load_all_templates():
        if config.get("type") == template_type:
            return dirname
    return None


def load_template_config(template_type: str) -> Optional[Dict[str, Any]]:
    """加载指定模板的 config.json（通过 type 查找）。"""
    dirname = _find_dir_by_type(template_type)
    if not dirname:
        return None
    config_path = os.path.join(get_templates_dir(), dirname, "config.json")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def list_templates() -> List[Dict[str, Any]]:
    """返回所有模板的摘要列表。"""
    templates = []
    for dirname, config in _load_all_templates():
        templates.append({
            "type": config.get("type", dirname),
            "name": config.get("name", dirname),
            "icon": config.get("icon", ""),
            "description": config.get("description", ""),
            "grade_range": config.get("grade_range", [])
        })
    return templates


def get_template_detail(template_type: str) -> Optional[Dict[str, Any]]:
    """返回单个模板详情。"""
    config = load_template_config(template_type)
    if not config:
        return None
    return {
        "type": config.get("type", template_type),
        "name": config.get("name", template_type),
        "config": config
    }


def build_simulator_url(template_type: str, params: Dict[str, Any]) -> str:
    """
    根据模板类型和参数构建仿真器 URL。
    
    例如：/simulators/chicken-rabbit/index.html?heads=8&legs=22
    """
    dirname = _find_dir_by_type(template_type)
    if not dirname:
        dirname = template_type
    if not params:
        return f"/simulators/templates/{dirname}/index.html"
    query = "&".join([f"{k}={v}" for k, v in params.items()])
    return f"/simulators/templates/{dirname}/index.html?{query}"
