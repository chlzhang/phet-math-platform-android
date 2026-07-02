import json
import httpx
from typing import Dict, Any
from app.config import get_settings


SYSTEM_PROMPT = """你是一个小学数学题目解析助手。请分析用户输入的题目，判断它属于以下哪种题型，并提取关键参数。

可用题型：
- chicken_rabbit：鸡兔同笼。参数：heads（总头数，整数）、legs（总腿数/脚数，整数）。
- tree_planting：植树问题。参数：length（总长度，整数）、interval（间隔长度，整数）、type（种植方式：both=两端都种、one=一端种、none=两端都不种、circle=环形）。
- fraction：分数加减法。参数：a/b 和 c/d 两个分数，op 为 "+" 或 "-"。
- travel_meet：相遇问题。参数：distance（两地距离）、v1（一方速度）、v2（另一方速度）。
- travel_chase：追及问题。参数：distance（初始距离/路程差）、v1（追者速度）、v2（被追者速度）。
- polygon_area：多边形面积。参数：shape（parallelogram=平行四边形、triangle=三角形、trapezoid=梯形）、a（底/上底）、b（下底，三角形可为0）、h（高）。
- circle_area：圆的面积。参数：r（半径）、parts（切分份数，默认16）。
- unknown：无法识别或不在上述题型中。

请只返回 JSON，不要任何解释文字。格式如下：
{
  "type": "chicken_rabbit",
  "name": "鸡兔同笼",
  "confidence": 0.95,
  "params": {"heads": 35, "legs": 94}
}
"""


class MockLLMClient:
    """模拟 LLM 客户端，用于未匹配到规则时的兜底解析。"""

    def __init__(self):
        self.settings = get_settings()

    async def parse_problem(self, text: str, grade: int = 0) -> Dict[str, Any]:
        return {
            "type": "unknown",
            "name": "未知题型",
            "confidence": 0.0,
            "params": {},
            "method": "llm"
        }


class LLMClient:
    """LLM 客户端封装，支持 mock / OpenAI 兼容接口。"""

    def __init__(self):
        self.settings = get_settings()
        self.provider = self.settings.llm_provider

    async def parse_problem(self, text: str, grade: int = 0) -> Dict[str, Any]:
        if self.provider == "mock":
            return await MockLLMClient().parse_problem(text, grade)

        if self.provider in ("openai", "kimi"):
            return await self._call_openai_compatible(text, grade)

        return await MockLLMClient().parse_problem(text, grade)

    async def _call_openai_compatible(self, text: str, grade: int) -> Dict[str, Any]:
        api_key = self.settings.llm_api_key
        base_url = self.settings.llm_base_url.rstrip("/")
        model = self.settings.llm_model

        if not api_key or not base_url or not model:
            return await MockLLMClient().parse_problem(text, grade)

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"年级：{grade}\n题目：{text}"}
            ],
            "temperature": 1,
            "max_tokens": 512
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers=headers,
                    json=payload
                )
                resp.raise_for_status()
                data = resp.json()
                content = data["choices"][0]["message"]["content"]

                # 清理可能的 markdown 代码块
                content = content.strip()
                if content.startswith("```json"):
                    content = content[7:]
                if content.startswith("```"):
                    content = content[3:]
                if content.endswith("```"):
                    content = content[:-3]
                content = content.strip()

                result = json.loads(content)
                result["method"] = "llm"
                result.setdefault("confidence", 0.0)
                return result
        except Exception as e:
            # LLM 调用失败时返回 unknown，避免阻塞主流程
            return {
                "type": "unknown",
                "name": "未知题型",
                "confidence": 0.0,
                "params": {},
                "method": "llm",
                "error": str(e)
            }


async def parse_with_llm(text: str, grade: int = 0) -> Dict[str, Any]:
    client = LLMClient()
    return await client.parse_problem(text, grade)
