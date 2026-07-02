# 家庭内网部署手册

本文档介绍如何在家庭局域网内部署 `phet-math-platform-android`，供 Android 平板通过 Wi-Fi 访问。

## 一、前提条件

- 一台常开的家用电脑、NAS 或树莓派（建议 2 核 4G 及以上）
- 该设备已安装 Docker 和 Docker Compose
- Android 平板与服务器连接同一 Wi-Fi
- 确保家庭路由器允许局域网设备间通信（通常默认开启）

## 二、服务器环境准备

### 1. 安装 Docker

以 Ubuntu 为例：

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
# 退出并重新登录 SSH，使 docker 用户组生效
```

Windows 用户可安装 Docker Desktop 并启用 WSL2 后端。

## 三、上传项目代码

在本地项目根目录执行：

```bash
# 方式一：rsync（推荐）
rsync -avz --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.venv' \
  --exclude='.env' \
  ./phet-math-platform-android/ root@服务器IP:/opt/phet-math-platform-android/

# 方式二：直接复制到共享文件夹/SMB
```

> 不要上传 `.env` 文件（包含密钥）和本地数据库文件。

## 四、配置环境变量

登录服务器：

```bash
ssh root@服务器IP
cd /opt/phet-math-platform-android
```

复制环境变量模板：

```bash
cp .env.example .env
nano .env
```

家庭内网部署保持默认即可，重点是：

```bash
# 使用 SQLite 时无需配置 PostgreSQL
DATABASE_URL=sqlite:///./phet_math.db

# LLM 配置（不配置则使用 mock，仅识别题库内题目）
LLM_PROVIDER=mock
```

保存退出。

## 五、启动服务

```bash
cd /opt/phet-math-platform-android
docker compose up -d --build
```

查看运行状态：

```bash
docker compose ps
docker compose logs -f backend
```

## 六、查看服务器局域网 IP

```bash
ip addr show
# 或
hostname -I
```

例如服务器 IP 为 `192.168.1.100`，后端端口为 `8091`。

## 七、平板端配置

1. 在 Android 平板上安装 HBuilderX 生成的 APK
2. 打开应用，进入「设置」页面
3. 输入服务器地址：`http://192.168.1.100:8091`
4. 返回首页，开始使用语音输入或手动输入题目

> 由于使用 HTTP 明文传输，已在 `manifest.json` 中配置 `usesCleartextTraffic="true"`。

## 八、更新维护

### 更新前端代码

如果使用 H5 方式访问（非 APK），需要重新构建：

```bash
cd /opt/phet-math-platform-android/frontend/uni-app
npm install
npm run build:h5
```

APK 方式只需重新打包并安装新 APK。

### 更新后端代码

```bash
cd /opt/phet-math-platform-android
docker compose up -d --build backend
```

### 查看日志

```bash
# 全部日志
docker compose logs -f

# 仅后端
docker compose logs -f backend

# 仅 Nginx
docker compose logs -f nginx
```

### 数据备份

学习记录默认保存在 `backend/phet_math.db`。建议定期备份：

```bash
cp /opt/phet-math-platform-android/backend/phet_math.db /backup/phet_math_$(date +%F).db
```

---

如有问题，查看 `docker compose logs` 日志定位即可。
