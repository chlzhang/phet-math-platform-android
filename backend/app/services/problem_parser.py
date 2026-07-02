import re
from typing import Dict, Any, Tuple


# 题型规则定义
RULES = [
    {
        "type": "chicken_rabbit",
        "name": "鸡兔同笼",
        "keywords": ["鸡", "兔", "头", "腿", "脚", "笼"],
        "extractors": {
            "heads": r"(\d+)\s*个?头",
            "legs": r"(\d+)\s*(?:只?脚|条腿|只腿)"
        },
        "grade_range": [3, 5]
    },
    {
        "type": "tree_planting",
        "name": "植树问题",
        "keywords": ["每隔", "间隔", "米", "种树", "植树", "栽树", "两端", "一边", "两旁"],
        "extractors": {},
        "grade_range": [4, 5]
    },
    {
        "type": "fraction",
        "name": "分数加减法",
        "keywords": ["分数", "几分之几", "相加", "相减", "和", "差"],
        "extractors": {},
        "grade_range": [3, 5]
    },
    {
        "type": "travel_meet",
        "name": "相遇问题",
        "keywords": ["相向", "相遇", "相对而行", "同时出发", "两地"],
        "extractors": {},
        "grade_range": [4, 6]
    },
    {
        "type": "travel_chase",
        "name": "追及问题",
        "keywords": ["追及", "追上", "同向", "落后", "先行"],
        "extractors": {},
        "grade_range": [4, 6]
    },
    {
        "type": "polygon_area",
        "name": "多边形面积",
        "keywords": ["面积", "平行四边形", "三角形", "梯形", "底", "高"],
        "extractors": {},
        "grade_range": [4, 5]
    },
    {
        "type": "circle_area",
        "name": "圆的面积",
        "keywords": ["圆", "半径", "面积", "π", "pi"],
        "extractors": {},
        "grade_range": [6]
    }
]


def _extract_number_before(text: str, keyword: str) -> int:
    """提取关键词前面的数字。"""
    pattern = rf"(\d+)\s*{re.escape(keyword)}"
    match = re.search(pattern, text)
    return int(match.group(1)) if match else 0


def _extract_number_after(text: str, keyword: str) -> int:
    """提取关键词后面的数字。"""
    pattern = rf"{re.escape(keyword)}\s*(\d+)"
    match = re.search(pattern, text)
    return int(match.group(1)) if match else 0


def _extract_all_numbers(text: str) -> list:
    """提取文本中所有数字。"""
    return [int(n) for n in re.findall(r"\d+", text)]


def _detect_tree_type(text: str) -> str:
    """检测植树问题的种植方式。"""
    if "环形" in text or "圆形" in text or "周长" in text:
        return "circle"
    if "两端都不" in text or "两边都不" in text or "都不种" in text:
        return "none"
    if "一端" in text or "一头" in text:
        return "one"
    return "both"


def _detect_travel_type(text: str) -> str:
    """检测行程问题类型。"""
    if "追" in text or "同向" in text or "落后" in text or "先行" in text:
        return "chase"
    return "meet"


def _extract_distance(text: str) -> int:
    """从行程问题文本中提取距离。"""
    # 模式：相距/距离/落后/先行 X 米
    patterns = [
        r"(?:相距|距离|落后|先行|两地).{0,5}?(\d+)\s*米",
        r"(\d+)\s*米.{0,5}?(?:相距|距离|落后|先行)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return int(match.group(1))
    return 0


def _extract_speeds(text: str) -> list:
    """从行程问题文本中提取两个速度。"""
    # 模式：X 米/分、每分钟走 X 米、速度是 X
    patterns = [
        r"(?:每分钟走|速度是|速度为)\s*(\d+)\s*米",
        r"(\d+)\s*米\s*/\s*(?:分|分钟|秒|小时)",
        r"(\d+)\s*米/?分",
    ]
    speeds = []
    for pattern in patterns:
        matches = re.findall(pattern, text)
        for m in matches:
            v = int(m) if isinstance(m, str) else int(m[0]) if isinstance(m, tuple) else 0
            if v not in speeds:
                speeds.append(v)
    # 兜底：提取所有数字，排除已识别的距离
    if len(speeds) < 2:
        all_nums = _extract_all_numbers(text)
        for n in all_nums:
            if n not in speeds:
                speeds.append(n)
    return speeds[:2]


def _detect_polygon_shape(text: str) -> str:
    """检测多边形类型。"""
    if "平行四边形" in text:
        return "parallelogram"
    if "三角形" in text:
        return "triangle"
    if "梯形" in text:
        return "trapezoid"
    return "parallelogram"


def _detect_fraction_pattern(text: str) -> bool:
    """检测是否包含分数形式的表达式，如 1/2、3/4、几分之几。"""
    if re.search(r"\d+\s*/\s*\d+", text):
        return True
    if "几分之几" in text or "分数" in text:
        return True
    return False


def _match_type(text: str, grade: int = 0) -> Tuple[str, float]:
    """根据关键词匹配题型。"""
    lower_text = text.lower()
    best_type = "unknown"
    best_score = 0.0
    
    for rule in RULES:
        score = 0
        for kw in rule["keywords"]:
            if kw in lower_text:
                score += 1
        if score > best_score:
            best_score = score
            best_type = rule["type"]
    
    # 如果检测到分数表达式，优先判定为分数题
    if _detect_fraction_pattern(text) and best_type != "fraction":
        if best_score < 2:
            best_type = "fraction"
            best_score = 2
    
    # 根据命中关键词数量计算置信度
    confidence = min(best_score / 3, 1.0) if best_score > 0 else 0.0
    return best_type, confidence


def _extract_params(text: str, ptype: str) -> Dict[str, Any]:
    """根据题型提取参数。"""
    nums = _extract_all_numbers(text)
    params = {}
    
    if ptype == "chicken_rabbit":
        # 通常前两个数字是头数和腿数
        if len(nums) >= 2:
            params["heads"] = nums[0]
            params["legs"] = nums[1]
        else:
            params["heads"] = 8
            params["legs"] = 22
    
    elif ptype == "tree_planting":
        params["type"] = _detect_tree_type(text)
        if len(nums) >= 2:
            params["length"] = nums[0]
            params["interval"] = nums[1]
        else:
            params["length"] = 20
            params["interval"] = 5
    
    elif ptype == "fraction":
        # 尝试提取形如 a/b 的分数
        fractions = re.findall(r"(\d+)\s*/\s*(\d+)", text)
        if len(fractions) >= 2:
            params["a"] = int(fractions[0][0])
            params["b"] = int(fractions[0][1])
            params["c"] = int(fractions[1][0])
            params["d"] = int(fractions[1][1])
        elif len(nums) >= 4:
            params["a"] = nums[0]
            params["b"] = nums[1]
            params["c"] = nums[2]
            params["d"] = nums[3]
        else:
            params["a"] = 1
            params["b"] = 2
            params["c"] = 1
            params["d"] = 3
        params["op"] = "-" if "减" in text or "差" in text else "+"
    
    elif ptype in ("travel_meet", "travel_chase"):
        travel_type = _detect_travel_type(text)
        params["type"] = travel_type
        # 尝试从“相距/落后/距离/两地”等上下文中提取距离
        distance = _extract_distance(text)
        # 提取速度：通常跟在“每分钟走/速度是”后面
        speeds = _extract_speeds(text)
        if distance and len(speeds) >= 2:
            params["distance"] = distance
            params["v1"] = speeds[0]
            params["v2"] = speeds[1]
        elif len(nums) >= 3:
            params["distance"] = nums[0]
            params["v1"] = nums[1]
            params["v2"] = nums[2]
        else:
            params["distance"] = 300
            params["v1"] = 60
            params["v2"] = 40
    
    elif ptype == "polygon_area":
        params["shape"] = _detect_polygon_shape(text)
        if len(nums) >= 3:
            params["a"] = nums[0]
            params["b"] = nums[1]
            params["h"] = nums[2]
        elif len(nums) >= 2:
            params["a"] = nums[0]
            params["h"] = nums[1]
            params["b"] = 0
        else:
            params["a"] = 6
            params["b"] = 0
            params["h"] = 4
    
    elif ptype == "circle_area":
        if len(nums) >= 1:
            params["r"] = nums[0]
        else:
            params["r"] = 4
        params["parts"] = 16
    
    return params


def parse_problem(text: str, grade: int = 0) -> Dict[str, Any]:
    """
    解析用户输入的数学题目。
    
    返回：
    {
        "type": 题型,
        "name": 题型名称,
        "confidence": 置信度,
        "params": 提取的参数,
        "method": "rule"
    }
    """
    if not text or not text.strip():
        return {
            "type": "unknown",
            "name": "未知题型",
            "confidence": 0.0,
            "params": {},
            "method": "rule"
        }
    
    ptype, confidence = _match_type(text, grade)
    
    if ptype == "unknown":
        return {
            "type": "unknown",
            "name": "未知题型",
            "confidence": 0.0,
            "params": {},
            "method": "rule"
        }
    
    rule = next((r for r in RULES if r["type"] == ptype), None)
    params = _extract_params(text, ptype)
    
    # 合并 travel 类型
    if ptype in ("travel_meet", "travel_chase"):
        # 根据检测到的具体类型修正
        detected = params.get("type", "meet")
        if detected == "chase":
            ptype = "travel_chase"
        else:
            ptype = "travel_meet"
        rule = next((r for r in RULES if r["type"] == ptype), rule)
    
    return {
        "type": ptype,
        "name": rule["name"] if rule else ptype,
        "confidence": confidence,
        "params": params,
        "method": "rule"
    }
