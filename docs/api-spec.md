# API 接口规范

## 基础信息

- Base URL: `http://localhost:8000/api/v1`
- 所有响应格式：

```json
{
  "success": true,
  "message": "",
  "data": { ... }
}
```

---

## 1. 解析题目

### POST /problems/parse

解析用户输入的数学题目，返回题型、参数和仿真器地址。

**请求体：**

```json
{
  "text": "笼子里有若干只鸡和兔，从上面数有8个头，从下面数有22只脚，鸡兔各几只？",
  "grade": 4
}
```

**响应：**

```json
{
  "success": true,
  "message": "解析成功",
  "data": {
    "problem_id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "chicken_rabbit",
    "type_name": "鸡兔同笼",
    "grade": 4,
    "params": {
      "heads": 8,
      "legs": 22
    },
    "simulator_url": "/simulators/chicken-rabbit/index.html?heads=8&legs=22",
    "confidence": 0.95,
    "method": "rule"
  }
}
```

**错误响应：**

```json
{
  "success": false,
  "message": "无法识别题目类型",
  "data": {
    "type": "unknown",
    "confidence": 0.0
  }
}
```

---

## 2. 获取模板列表

### GET /templates

返回所有支持的仿真器模板列表。

**响应：**

```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "type": "chicken_rabbit",
        "name": "鸡兔同笼",
        "grade_range": [3, 5],
        "icon": "🐔🐰",
        "description": "假设全是鸡或全是兔，通过腿数差异推理数量。"
      }
    ]
  }
}
```

---

## 3. 获取模板详情

### GET /templates/{type}

返回指定模板的完整配置，包括参数定义、演示步骤等。

**响应：**

```json
{
  "success": true,
  "data": {
    "type": "chicken_rabbit",
    "name": "鸡兔同笼",
    "config": {
      "params": {
        "heads": { "label": "总头数", "type": "int", "min": 2, "max": 50, "default": 8 },
        "legs": { "label": "总腿数", "type": "int", "min": 4, "max": 200, "default": 22 }
      },
      "modes": ["interactive", "demo"]
    }
  }
}
```

---

## 4. 健康检查

### GET /health

```json
{
  "success": true,
  "data": { "status": "ok" }
}
```
