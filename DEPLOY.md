# 云服务器部署手册

本文档介绍如何将 `phet-math-platform` 部署到腾讯云服务器，并通过互联网访问。

## 一、前提条件

- 已购买腾讯云 CVM（建议 2 核 4G 及以上，系统盘 50GB+）
- 已购买域名并完成 ICP 备案（国内服务器 80/443 端口必须备案）
- 服务器已安装 Docker 和 Docker Compose
- 已准备好 SSL 证书（Let's Encrypt、腾讯云免费证书或商业证书）

## 二、服务器环境准备

### 1. 安装 Docker

以 Ubuntu 22.04 为例：

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
# 退出并重新登录 SSH，使 docker 用户组生效
```

### 2. 配置安全组

在腾讯云控制台 -> 安全组，放行以下端口：

| 端口 | 用途 | 来源 |
|---|---|---|
| 22 | SSH 管理 | 你的 IP |
| 80 | HTTP（自动跳转 HTTPS） | 0.0.0.0/0 |
| 443 | HTTPS 访问 | 0.0.0.0/0 |

> 生产环境不建议对外暴露 8090/8091/5433/6380 等调试端口。

## 三、上传项目代码

在本地项目根目录执行：

```bash
# 方式一：rsync（推荐）
rsync -avz --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.venv' \
  --exclude='ssl' \
  --exclude='.env' \
  ./phet-math-platform/ root@你的服务器IP:/opt/phet-math-platform/

# 方式二：scp
scp -r ./phet-math-platform root@你的服务器IP:/opt/
```

> 不要上传 `ssl/` 目录（包含本地自签名证书）和 `.env` 文件（包含密钥）。

## 四、配置环境变量

登录服务器：

```bash
ssh root@你的服务器IP
cd /opt/phet-math-platform
```

复制环境变量模板：

```bash
cp .env.example .env
nano .env
```

编辑 `.env`：

```bash
# 数据库密码（生产环境务必设置为强密码）
DB_PASSWORD=YourStrongDbPassword123!

# LLM 配置（不配置则使用 mock，无法识别题库外的题目）
LLM_PROVIDER=kimi
LLM_BASE_URL=https://api.kimi.com/coding/v1
LLM_MODEL=kimi-for-coding
LLM_API_KEY=你的真实API密钥
```

保存退出。

## 五、准备 SSL 证书

将 SSL 证书文件上传到服务器 `/opt/phet-math-platform/ssl/` 目录：

```bash
mkdir -p /opt/phet-math-platform/ssl
# 上传你的证书文件，命名必须一致
cp your_domain_cert.pem /opt/phet-math-platform/ssl/cert.pem
cp your_domain_key.pem /opt/phet-math-platform/ssl/key.pem
```

> 如果你使用腾讯云免费证书，下载 Nginx 版本，通常包含 `.crt` 和 `.key` 文件，分别重命名为 `cert.pem` 和 `key.pem`。

## 六、修改 Nginx 域名（可选）

生产环境建议把 `nginx.conf` 中的 `server_name _;` 改成你的实际域名：

```bash
server_name your-domain.com www.your-domain.com;
```

如果暂时使用 IP 访问，保持 `_` 即可。

## 七、启动服务

```bash
cd /opt/phet-math-platform
docker compose up -d --build
```

查看运行状态：

```bash
docker compose ps
docker compose logs -f backend
```

## 八、域名解析

在腾讯云 DNS 控制台，添加 A 记录：

| 主机记录 | 记录类型 | 记录值 |
|---|---|---|
| @ | A | 你的服务器公网 IP |
| www | A | 你的服务器公网 IP |

等待 DNS 生效（通常几分钟到几小时），然后访问：

```
https://your-domain.com/
```

## 九、微信小程序业务域名配置

如果要在微信小程序中使用 WebView 加载仿真器：

1. 登录微信公众平台 -> 开发 -> 开发管理 -> 业务域名
2. 添加你的域名：`https://your-domain.com`
3. 下载校验文件，放到 `/opt/phet-math-platform/frontend/uni-app/dist/build/h5/` 根目录
4. 重新打包并重启 Nginx：

```bash
cd /opt/phet-math-platform/frontend/uni-app
npm install
npm run build:h5
cd /opt/phet-math-platform
docker compose restart nginx
```

> 小程序 WebView 必须访问备案域名 + HTTPS。

## 十、更新维护

### 更新前端代码

```bash
cd /opt/phet-math-platform/frontend/uni-app
npm install
npm run build:h5
cd /opt/phet-math-platform
docker compose restart nginx
```

### 更新后端代码

```bash
cd /opt/phet-math-platform
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

数据库数据默认持久化在 Docker volume `postgres_data` 中。建议定期备份：

```bash
docker exec phet_postgres pg_dump -U postgres -d phet_math > backup_$(date +%F).sql
```

## 十一、常见问题

### 1. 访问 `https://your-domain.com` 提示证书不安全

- 检查 `ssl/cert.pem` 和 `ssl/key.pem` 是否正确
- 检查证书是否过期
- 自签名证书只用于本地测试，生产环境必须使用正规 CA 签发的证书

### 2. 页面能打开但题目解析失败

- 检查后端容器状态：`docker compose ps`
- 查看后端日志：`docker compose logs -f backend`
- 检查 `.env` 中的 LLM 配置是否正确

### 3. 数据库连接失败

- 检查 `.env` 中的 `DB_PASSWORD` 是否与 `docker-compose.yml` 中的变量一致
- 确保没有外部程序占用 5432 端口

### 4. 如何关闭 LLM 调用

将 `.env` 中的 `LLM_PROVIDER` 改为 `mock`：

```bash
LLM_PROVIDER=mock
```

然后重启后端：

```bash
docker compose up -d --build backend
```

## 十二、文件清单

部署到服务器时，至少需要以下文件：

```
phet-math-platform/
├── backend/
├── frontend/uni-app/dist/build/h5/   # 需要重新 build
├── simulators/
├── nginx.conf
├── docker-compose.yml
├── .env                               # 服务器本地创建
└── ssl/                               # 服务器本地放置证书
```

---

如有问题，查看 `docker compose logs` 日志定位即可。
