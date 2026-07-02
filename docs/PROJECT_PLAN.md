# 小学数学可视化仿真平台 - 项目开发计划

## 1. 项目目标

构建一个可自动识别小学数学题并生成可视化仿真页面的平台。

- **核心功能**：用户输入题目 → 后端识别题型并提取参数 → 返回对应的 H5 仿真页面
- **前端**：uni-app 跨端应用（微信小程序 + iOS/Android App + H5）
- **后端**：Python FastAPI 服务
- **仿真器**：基于现有 6 个 H5 仿真器模板化扩展

---

## 2. 技术栈

| 层级 | 技术 |
|------|------|
| 前端跨端框架 | uni-app (Vue3) |
| 仿真器渲染 | H5 + Canvas/SVG/Web Components |
| 后端框架 | Python + FastAPI |
| 数据库 | PostgreSQL + Redis |
| LLM | 通义千问 / 文心一言 / OpenAI API（可选） |
| 部署 | Docker + Docker Compose + Nginx |
| 对象存储 | 阿里云 OSS / 腾讯云 COS（可选） |

---

## 3. 目录结构

```
phet-math-platform/
├── README.md
├── docker-compose.yml
├── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI 入口
│   │   ├── config.py               # 配置
│   │   ├── models.py               # 数据模型
│   │   ├── database.py             # 数据库连接
│   │   ├── routers/
│   │   │   ├── problems.py         # 题目解析 API
│   │   │   ├── templates.py        # 模板管理 API
│   │   │   └── users.py            # 用户/学习记录 API
│   │   └── services/
│   │       ├── problem_parser.py   # 题目分类 + 参数提取
│   │       ├── llm_client.py       # LLM 调用封装
│   │       └── template_engine.py  # 模板渲染
│   └── tests/
│       └── test_parser.py
├── frontend/
│   └── uni-app/                    # uni-app 项目
│       ├── App.vue
│       ├── pages.json
│       ├── manifest.json
│       ├── pages/
│       │   ├── index/index.vue     # 首页题目卡片
│       │   ├── input/input.vue     # 题目输入页
│       │   └── simulator/simulator.vue # WebView 加载仿真器
│       └── components/
│           ├── TopicCard.vue
│           └── ProblemInput.vue
├── simulators/
│   ├── shared/                     # 公共样式、工具函数
│   │   ├── simulator-base.css
│   │   └── simulator-core.js
│   └── templates/                  # 各题型模板
│       ├── chicken-rabbit/
│       │   ├── index.html
│       │   ├── config.json
│       │   └── simulator.js
│       ├── tree-planting/
│       ├── fraction/
│       ├── travel/
│       ├── polygon/
│       └── circle/
└── docs/
    ├── PROJECT_PLAN.md
    ├── api-spec.md
    └── template-spec.md
```

---

## 4. 核心 API 设计

### 4.1 题目解析接口

```http
POST /api/v1/problems/parse
Content-Type: application/json

{
  "text": "笼子里有若干只鸡和兔，从上面数有8个头，从下面数有22只脚，鸡兔各几只？",
  "grade": 4
}
```

响应：

```json
{
  "success": true,
  "data": {
    "problem_id": "uuid",
    "type": "chicken_rabbit",
    "type_name": "鸡兔同笼",
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

### 4.2 模板列表接口

```http
GET /api/v1/templates
```

### 4.3 模板详情接口

```http
GET /api/v1/templates/{type}
```

---

## 5. 题目解析策略

采用 **规则匹配优先 + LLM 兜底** 的混合策略。

### 5.1 规则匹配层

```python
RULES = [
    {
        "type": "chicken_rabbit",
        "keywords": ["鸡", "兔", "头", "腿", "脚", "笼"],
        "extractors": {
            "heads": r"(\d+)\s*个头",
            "legs": r"(\d+)\s*(?:只脚|条腿)"
        }
    },
    {
        "type": "tree_planting",
        "keywords": ["每隔", "米", "种树", "植树", "两端"],
        "extractors": { ... }
    },
    ...
]
```

### 5.2 LLM 兜底层

当规则匹配失败或置信度低时，调用 LLM：

```python
prompt = f"""
请判断以下小学数学题的类型并提取参数，返回 JSON：
题目：{text}
年级：{grade}

要求：
1. type 必须是已知类型之一：chicken_rabbit, tree_planting, fraction_add, travel_meet, travel_chase, polygon_area, circle_area
2. 如果无法判断，type 填 unknown
3. params 使用整数或小数
"""
```

---

## 6. 仿真器模板规范

每个模板目录包含：

```json
// config.json
{
  "type": "chicken_rabbit",
  "name": "鸡兔同笼",
  "grade_range": [3, 5],
  "params": {
    "heads": { "label": "总头数", "type": "int", "min": 2, "max": 50, "default": 8 },
    "legs": { "label": "总腿数", "type": "int", "min": 4, "max": 200, "default": 22 }
  },
  "modes": ["interactive", "demo"],
  "keywords": ["鸡", "兔", "头", "腿", "脚", "笼"]
}
```

`index.html` 通过 URL 参数读取配置并初始化仿真器。

---

## 7. 开发阶段

### Phase 1：基础框架（第 1~2 周）

- [ ] 搭建后端 FastAPI 项目骨架
- [ ] 搭建 uni-app 前端骨架
- [ ] 创建仿真器模板目录结构
- [ ] 编写 API 接口规范文档
- [ ] 设计 PostgreSQL 数据库表

### Phase 2：核心功能（第 3~5 周）

- [ ] 实现规则匹配的题目解析器
- [ ] 封装 LLM 客户端（可选本地模拟）
- [ ] 实现模板引擎和参数注入
- [ ] 前端完成首页、输入页、WebView 仿真页
- [ ] 将 6 个 H5 仿真器改造为模板化组件

### Phase 3：数据与优化（第 6~7 周）

- [ ] 编写数据库迁移脚本
- [ ] 导入模板配置种子数据
- [ ] 添加 Redis 缓存
- [ ] 单元测试覆盖核心解析逻辑
- [ ] 前端适配微信小程序和 H5

### Phase 4：部署与交付（第 8 周）

- [ ] 编写 Dockerfile 和 docker-compose.yml
- [ ] 配置 Nginx 反向代理
- [ ] 本地完整联调
- [ ] 编写部署文档

---

## 8. 多 Agent 并行任务分配

| Agent | 任务 | 输出 |
|-------|------|------|
| Agent 1 | 后端 API 服务 | `backend/` 完整代码 |
| Agent 2 | 前端 uni-app 壳子 | `frontend/uni-app/` 完整代码 |
| Agent 3 | H5 仿真器模板化 | `simulators/templates/` 6 个模板 |
| Agent 4 | 数据库与部署配置 | `docker-compose.yml`, `nginx.conf`, 迁移脚本 |

---

## 9. 验收标准

1. 后端能正确识别清单中至少 10 种题型并提取参数
2. 前端能选择题型、输入题目、打开 WebView 查看仿真
3. 6 个 H5 仿真器都能通过 URL 参数被正确驱动
4. `docker-compose up` 能一键启动完整服务
5. 提供 README 说明如何本地运行和部署

---

## 10. 风险与应对

| 风险 | 应对 |
|------|------|
| LLM 调用成本高/不稳定 | 规则匹配优先，LLM 仅兜底，支持开关 |
| 题型覆盖不足 | 先聚焦 6 个已验证题型，逐步扩展 |
| 小程序 WebView 限制 | 仿真器域名加入业务域名白名单 |
| 多端适配问题 | 优先保证微信小程序和 H5，App 次之 |
