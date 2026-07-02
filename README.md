# 小学数学可视化仿真平台

一个可自动识别小学数学题并生成可视化仿真页面的平台。支持微信小程序、iOS/Android App 和 H5。

## 功能特性

- **题目自动识别**：输入小学数学题，自动判断题型并提取关键参数
- **可视化仿真**：基于题型渲染对应的 H5 交互式仿真器
- **双模式学习**：每个仿真器支持动手操作模式和动画演示模式
- **跨端支持**：uni-app 前端，一套代码同时支持小程序、App、H5
- **模板化扩展**：新增题型只需添加模板配置和仿真器组件

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | uni-app (Vue3) |
| 后端 | Python + FastAPI |
| 数据库 | PostgreSQL + Redis |
| 仿真器 | H5 + Canvas |
| 部署 | Docker + Docker Compose + Nginx |

## 项目结构

```
phet-math-platform/
├── backend/              # FastAPI 后端
├── frontend/uni-app/     # uni-app 前端
├── simulators/           # H5 仿真器模板
│   ├── shared/           # 公共样式和工具库
│   └── templates/        # 各题型仿真器
├── scripts/              # 开发和部署脚本
├── docs/                 # 文档
├── docker-compose.yml
└── nginx.conf
```

## 支持的题型

| 题型 | 类型标识 | 年级 |
|------|----------|------|
| 鸡兔同笼 | chicken_rabbit | 3~5 |
| 植树问题 | tree_planting | 4~5 |
| 分数加减法 | fraction | 3~5 |
| 相遇与追及 | travel | 4~6 |
| 多边形面积推导 | polygon_area | 4~5 |
| 圆的面积推导 | circle_area | 6 |

## 快速开始

### 方式一：Docker 一键部署

```bash
# 克隆项目后进入目录
cd phet-math-platform

# 启动所有服务
docker-compose up --build

# 访问
# API: http://localhost:8090/api/v1/health
# 仿真器: http://localhost:8090/simulators/templates/chicken-rabbit/index.html?heads=8&legs=22
```

### 方式二：本地开发

#### 1. 启动数据库

```bash
docker-compose up -d postgres redis
```

#### 2. 初始化数据库并导入模板

```bash
# Windows
python scripts\init_db.py
python scripts\seed_templates.py

# macOS/Linux
python scripts/init_db.py
python scripts/seed_templates.py
```

#### 3. 启动后端

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 4. 启动前端

使用 HBuilder X 打开 `frontend/uni-app/` 目录，运行到浏览器（H5）或微信开发者工具。

或者使用命令行（需先初始化 uni-app 依赖）：

```bash
cd frontend/uni-app
npm install
npm run dev:h5
```

## API 示例

### 解析题目

```bash
curl -X POST http://localhost:8090/api/v1/problems/parse \
  -H "Content-Type: application/json" \
  -d '{"text": "笼子里有8个头，22只脚，鸡兔各几只？", "grade": 4}'
```

响应：

```json
{
  "success": true,
  "data": {
    "type": "chicken_rabbit",
    "type_name": "鸡兔同笼",
    "params": {"heads": 8, "legs": 22},
    "simulator_url": "/simulators/templates/chicken-rabbit/index.html?heads=8&legs=22"
  }
}
```

### 获取模板列表

```bash
curl http://localhost:8090/api/v1/templates
```

## 添加新题型

1. 在 `simulators/templates/` 下创建新目录
2. 编写 `config.json` 定义参数和元信息
3. 实现 `index.html` 和 `simulator.js`
4. 在 `backend/app/services/problem_parser.py` 中添加识别规则
5. 运行 `python scripts/seed_templates.py` 导入数据库

## 微信小程序注意事项

- 仿真器使用 web-view 加载，需将域名加入小程序「业务域名」白名单
- 本地开发可在微信开发者工具中勾选「不校验合法域名」

## 测试

```bash
cd backend
python tests/test_parser.py
```

## 开发计划

详见 [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)。

## 许可证

MIT
