# 数学小乐园（Android 平板版）

一款面向家庭场景、在 Android 平板上辅导孩子做数学作业的辅助应用。后端运行在局域网内的电脑或 NAS 上，平板通过 Wi-Fi 访问，无需注册账号即可使用。

## 功能特性

- **语音输入题目**：按住麦克风按钮，说出小学数学题，自动填入输入框
- **题型识别**：后端规则匹配常见小学数学题型，提取关键参数
- **可视化仿真**：在平板 WebView 中加载交互式 H5 仿真器，支持动手操作和动画演示
- **多孩子档案**：一台平板可创建多个孩子档案，学习记录自动按孩子隔离
- **学习记录**：练习历史、错题本、学习进度统计
- **家庭内网部署**：平板通过 HTTP 访问家中服务器，无需公网域名和 SSL 证书

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | uni-app (Vue3) |
| 后端 | Python + FastAPI |
| 数据库 | SQLite（默认）/ PostgreSQL（可选） |
| 仿真器 | H5 + Canvas/SVG |
| 部署 | Docker + Docker Compose |

## 支持的题型

| 题型 | 类型标识 | 年级 |
|------|----------|------|
| 鸡兔同笼 | chicken_rabbit | 3~5 |
| 植树问题 | tree_planting | 4~5 |
| 分数加减法 | fraction | 3~5 |
| 相遇与追及 | travel | 4~6 |
| 多边形面积推导 | polygon_area | 4~5 |
| 圆的面积推导 | circle_area | 6 |

## 项目结构

```
phet-math-platform-android/
├── backend/              # FastAPI 后端
├── frontend/uni-app/     # uni-app 前端（Android / H5）
├── simulators/           # H5 仿真器模板
│   ├── shared/           # 公共样式和工具库
│   └── templates/        # 各题型仿真器
├── scripts/              # 开发脚本
├── docs/                 # 设计文档
├── docker-compose.yml
└── nginx.conf
```

## 快速开始

### 1. 启动后端服务

确保已安装 Docker 和 Docker Compose。

```bash
cd phet-math-platform-android
docker compose up -d --build
```

后端默认监听 `http://localhost:8091`。首次启动会自动创建 SQLite 数据库表。

### 2. 查看服务器地址

在启动后端的家用电脑上查看局域网 IP，例如 `192.168.1.100`。

### 3. 配置平板端服务器地址

- 在 HBuilderX 中打开 `frontend/uni-app`
- 点击菜单「运行」→「运行到手机或模拟器」→选择已连接的 Android 平板
- 首次打开应用后，进入「设置」页面，输入后端地址：`http://192.168.1.100:8091`

> 默认地址已在 `frontend/uni-app/src/utils/api.js` 中设置为 `http://192.168.1.100:8091`，请根据实际 IP 修改。

### 4. Android 打包

使用 HBuilderX 云打包功能生成 APK：

1. 在 HBuilderX 中点击「发行」→「原生 App-云打包」
2. 选择「Android Apk」
3. 配置包名、证书等信息
4. 点击「打包」并下载 APK 安装到平板

## API 示例

### 解析题目

```bash
curl -X POST http://192.168.1.100:8091/api/v1/problems/parse \
  -H "Content-Type: application/json" \
  -d '{"text": "笼子里有8个头，22只脚，鸡兔各几只？", "grade": 4}'
```

### 检查后端健康

```bash
curl http://192.168.1.100:8091/api/v1/health
```

## 测试

后端测试需要在 Docker 中运行（当前环境 Python 3.14 与依赖不兼容）：

```bash
cd backend
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$(pwd -W)/app:/app/app" \
  -v "$(pwd -W)/tests:/app/tests" \
  -e DATABASE_URL=sqlite:///./phet_math.db \
  phet-backend-base python -m pytest tests/ -v
```

## 部署说明

详见 [DEPLOY.md](DEPLOY.md)。

## 设计文档

- [Android 平板改造设计文档](docs/superpowers/specs/2026-07-02-android-tablet-design.md)
- [实施计划](docs/superpowers/plans/2026-07-02-android-tablet-implementation-plan.md)

## 许可证

MIT
