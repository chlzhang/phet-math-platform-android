# 任务快照 - 小学数学可视化仿真平台

> 生成时间：2026-07-01
> 状态：MVP 已完成，Docker 本地部署已成功运行
> 当前端口：Nginx 8090，Backend 8091，PostgreSQL 5433，Redis 6380
> 用途：任务恢复时了解当前进度，避免重复工作。

---

## 项目目标

构建一个可自动识别小学数学题并生成可视化仿真页面的平台：
- 前端：uni-app 跨端应用（微信小程序 + iOS/Android App + H5）
- 后端：Python FastAPI 服务
- 仿真器：6 个 H5 仿真器模板
- 部署：Docker + Docker Compose

---

## 当前完成状态

| 模块 | 状态 | 说明 |
|------|------|------|
| 项目开发计划 | ✅ 完成 | docs/PROJECT_PLAN.md |
| API 接口规范 | ✅ 完成 | docs/api-spec.md |
| 仿真器模板规范 | ✅ 完成 | docs/template-spec.md |
| 公共样式与工具库 | ✅ 完成 | simulators/shared/ |
| 后端 API 服务 | ✅ 完成 | backend/ FastAPI 完整实现 |
| 前端 uni-app 壳子 | ✅ 完成 | frontend/uni-app/ |
| H5 仿真器模板 | ✅ 完成 | 6 个模板全部完成 |
| 数据库与部署配置 | ✅ 完成 | docker-compose.yml、nginx.conf、scripts/ |
| 集成测试 | ✅ 完成 | parser 测试通过，API 本地测试通过 |

---

## 已验证功能

1. ✅ `POST /api/v1/problems/parse` 可正确解析：
   - 鸡兔同笼
   - 植树问题
   - 多边形面积
   - 圆的面积
2. ✅ `GET /api/v1/templates` 返回 6 个模板列表
3. ✅ `GET /api/v1/health` 健康检查正常
4. ✅ 生成的 simulator_url 路径正确，如 `/simulators/templates/chicken-rabbit/index.html?heads=8&legs=22`
5. ✅ 静态仿真器文件（HTML/CSS/JS）可通过 Nginx 访问
6. ✅ Docker Compose 已成功启动 postgres + redis + backend + nginx，无端口冲突
7. ✅ `python tests/test_parser.py` 全部通过

---

## 关键文件位置

```
D:/Project/PHET/phet-math-platform/
├── README.md                         ✅
├── docker-compose.yml                ✅
├── nginx.conf                        ✅
├── .gitignore                        ✅
├── docs/
│   ├── PROJECT_PLAN.md              ✅
│   ├── api-spec.md                  ✅
│   └── template-spec.md             ✅
├── backend/                          ✅
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models.py
│   │   ├── database.py
│   │   ├── routers/
│   │   │   ├── problems.py
│   │   │   ├── templates.py
│   │   │   └── users.py
│   │   └── services/
│   │       ├── problem_parser.py
│   │       ├── template_engine.py
│   │       └── llm_client.py
│   └── tests/
│       └── test_parser.py
├── frontend/uni-app/                 ✅
│   ├── App.vue
│   ├── main.js
│   ├── manifest.json
│   ├── pages.json
│   ├── package.json
│   ├── pages/
│   │   ├── index/index.vue
│   │   ├── input/input.vue
│   │   └── simulator/simulator.vue
│   ├── components/
│   │   ├── TopicCard.vue
│   │   └── ProblemInput.vue
│   └── utils/api.js
├── simulators/
│   ├── shared/
│   │   ├── simulator-base.css
│   │   └── simulator-core.js
│   └── templates/
│       ├── chicken-rabbit/
│       ├── tree-planting/
│       ├── fraction/
│       ├── travel/
│       ├── polygon/
│       └── circle/
└── scripts/
    ├── init_db.py
    ├── seed_templates.py
    ├── start-dev.sh
    └── start-dev.bat
```

---

## 如何运行

### Docker 一键部署

```bash
cd D:/Project/PHET/phet-math-platform
docker-compose up --build
```

访问入口：http://localhost:8090

### 本地开发

```bash
# 1. 启动数据库
docker-compose up -d postgres redis

# 2. 初始化并导入模板
cd D:/Project/PHET/phet-math-platform
python scripts/init_db.py
python scripts/seed_templates.py

# 3. 配置环境变量
cd backend
copy .env.example .env
# 如果使用 Docker 启动的数据库，保持默认端口 5433/6380 即可

# 4. 启动后端
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 4. 启动前端（使用 HBuilder X 或 CLI）
cd frontend/uni-app
npm install
npm run dev:h5
```

---

## 已知限制与后续优化

1. **LLM 解析为 Mock**：当前未接入真实大模型，仅做规则匹配 + mock 兜底。
2. **前端 CLI 依赖**：已添加 package.json，但未实际安装测试 node_modules。
3. **仿真器视觉细节**：模板已功能完整，但部分动画和布局可在真实浏览器中进一步调优。
4. **用户系统为占位**：users 路由未完整实现数据库写入。
5. **微信小程序**：上线前需配置业务域名白名单。
6. **数据库迁移**：当前使用 SQLAlchemy 自动建表，生产环境建议使用 Alembic。

---

## 下一步建议

1. 在浏览器中打开各个仿真器模板，验证交互和动画效果。
2. 使用 HBuilder X 运行前端，联调后端 API。
3. 接入真实 LLM API 提升题目识别覆盖率。
4. 补充更多题型模板（和差倍、盈亏、烙饼优化等）。
