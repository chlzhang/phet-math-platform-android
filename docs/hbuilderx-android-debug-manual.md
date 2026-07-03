# HBuilderX Android 平板调试与打包手册

> 本手册记录如何在 Windows 电脑上使用 HBuilderX 调试「数学小乐园」Android 平板版，以及常见问题排查方法。

---

## 一、环境准备

### 1.1 必备软件

| 软件 | 用途 | 下载地址 |
|------|------|----------|
| HBuilderX | uni-app 开发、运行、打包 | https://www.dcloud.io/hbuilderx.html |
| Docker Desktop | 运行后端服务 | https://www.docker.com/products/docker-desktop |
| Git | 拉取/更新代码 | https://git-scm.com/download/win |

### 1.2 Android 平板准备

1. 开启「开发者选项」：
   - 进入「设置」→「关于平板」，连续点击「版本号」7 次，直到提示已开启开发者模式。
2. 在开发者选项中开启：
   - **USB 调试**
   - **USB 安装**（HBuilderX 首次运行需要安装基座）
   - **关闭 MIUI 优化**（小米/红米平板如遇到安装失败，需关闭）
3. 用 USB 数据线连接平板和电脑。
4. 如果弹出「允许 USB 调试吗？」，勾选「始终允许」并确认。

### 1.3 安装 USB 驱动

如果 HBuilderX 检测不到设备，可能需要安装驱动：

- 华为：https://consumer.huawei.com/en/support/hisuite/
- 小米：MIUI 自带，或安装小米手机助手
- 其他品牌：去官网下载对应的手机助手/驱动

验证驱动是否装好：

```bash
adb devices
```

应输出类似：

```
List of devices attached
xxx123456789    device
```

如果显示 `unauthorized`，请在平板上确认 USB 调试授权。

---

## 二、后端服务启动

### 2.1 进入项目目录

```bash
cd D:\Project\PHET\phet-math-platform-android
```

### 2.2 启动后端

```bash
docker compose up -d --build
```

### 2.3 查看后端日志

```bash
docker compose logs -f backend
```

### 2.4 查看服务器局域网 IP

```bash
ipconfig
```

找到当前 Wi-Fi 适配器的 IPv4 地址，例如 `192.168.1.100`。

### 2.5 防火墙放行

确保 Windows 防火墙允许 8091 端口：

```powershell
# 以管理员身份运行 PowerShell
New-NetFirewallRule -DisplayName "PhetBackend" -Direction Inbound -LocalPort 8091 -Protocol TCP -Action Allow
```

---

## 三、前端配置

### 3.1 修改默认服务器地址

打开 `frontend/uni-app/src/utils/api.js`：

```javascript
const DEFAULT_SERVER = 'http://192.168.1.100:8091'
```

把 `192.168.1.100` 换成你实际的服务器 IP。

### 3.2 manifest.json 检查

打开 `frontend/uni-app/src/manifest.json`，确认：

```json
{
  "app-plus": {
    "distribute": {
      "android": {
        "usesCleartextTraffic": true
      }
    }
  }
}
```

如果缺少这个配置，平板无法通过 HTTP 访问后端。

---

## 四、HBuilderX 调试流程

### 4.1 打开项目

1. 启动 HBuilderX。
2. 点击「文件」→「打开目录」。
3. 选择 `D:\Project\PHET\phet-math-platform-android\frontend\uni-app`，点击「选择文件夹」。

### 4.2 运行到 Android 平板

1. 选中左侧项目栏里的 `frontend/uni-app`。
2. 点击菜单「运行」→「运行到手机或模拟器」。
3. 如果看到设备列表，选择你的平板。
4. 首次运行会安装「HBuilder 基座」，等待安装完成。
5. 应用启动后，在平板上操作。

### 4.3 查看运行日志

HBuilderX 底部有「控制台」和「调试」面板：

- **控制台**：查看编译、打包日志。
- **调试**：查看 App 运行时的 `console.log` 输出。

如果 WebView 页面有问题，可以在 HBuilderX 中启用 WebView 调试：

1. 在 `manifest.json` 的 `app-plus` → `distribute` → `android` 中添加：

```json
"debuggable": true
```

2. 重新运行到设备。
3. 在 Chrome 浏览器地址栏输入：`chrome://inspect/#devices`
4. 找到对应 WebView，点击「inspect」查看控制台网络请求。

---

## 五、端到端验证清单

| 步骤 | 操作 | 预期结果 |
|------|------|----------|
| 1 | 打开 App，进入「设置」页 | 能看到当前服务器地址 |
| 2 | 检查服务器地址 | 显示 `http://<服务器IP>:8091` |
| 3 | 返回首页，按住麦克风说一道数学题 | 语音被识别并填入输入框 |
| 4 | 点击「开始练习」或提交 | 后端返回题型，进入仿真器 |
| 5 | 在仿真器内完成操作 | 出现成功提示 |
| 6 | 返回首页，进入「历史记录」 | 出现刚练习的记录，且 `duration > 0` |
| 7 | 进入「进度」页 | 按题型汇总，正确率统计正常 |
| 8 | 进入「我的」，删除一个孩子档案 | 该孩子的历史记录清空 |

如果任何一步失败，跳到「七、常见问题排查」。

---

## 六、云打包 APK

### 6.1 打包前检查

1. 确认 `manifest.json` 中：
   - `name`：应用名称（如「数学小乐园」）
   - `appid`：DCloud 应用标识（如果没有，登录 HBuilderX 账号后自动获取）
   - `versionName`、`versionCode`：版本号
2. 确认应用图标已配置（可选，不配置会用默认图标）。

### 6.2 执行云打包

1. 在 HBuilderX 中选中 `frontend/uni-app`。
2. 点击「发行」→「原生 App-云打包」。
3. 配置：
   - **选择平台**：Android Apk
   - **包名**：例如 `com.example.phetmath`
   - **证书**：
     - 测试阶段：选择「使用 DCloud 公用测试证书」
     - 正式发布：选择「自有证书」并上传 `.keystore` 文件
4. 点击「打包」。
5. 等待云端构建（通常 1-5 分钟）。
6. 构建完成后，HBuilderX 会提示下载 APK。

### 6.3 安装 APK 到平板

1. 把下载的 APK 拷贝到平板。
2. 在平板文件管理器中点击安装。
3. 如果提示「未知来源」，请允许当前文件管理器安装应用。
4. 打开应用，设置服务器地址，重复第五章的验证清单。

---

## 七、常见问题排查

### 7.1 HBuilderX 检测不到设备

**现象**：「运行到手机或模拟器」里没有设备。

**排查步骤**：

1. 检查 USB 线是否支持数据传输（部分线只支持充电）。
2. 检查平板是否开启 USB 调试。
3. 安装对应品牌 USB 驱动。
4. 在命令行运行 `adb devices`，确认设备已连接。
5. 如果显示 `unauthorized`，在平板上撤销 USB 调试授权后重新授权。
6. 重启 HBuilderX 和平板。

### 7.2 运行到设备时报「安装基座失败」

**现象**：提示安装 HBuilder 基座失败。

**解决方法**：

1. 确认开启「USB 安装」。
2. 小米/红米平板关闭「MIUI 优化」。
3. 手动在平板上下载安装 HBuilder 基座 APK（HBuilderX 控制台会提供下载链接）。
4. 重新运行。

### 7.3 App 打开后白屏或无法访问后端

**现象**：页面空白，或提示网络错误。

**排查步骤**：

1. 检查 `manifest.json` 中 `usesCleartextTraffic` 是否为 `true`。
2. 检查 `frontend/uni-app/src/utils/api.js` 中的 `DEFAULT_SERVER` 是否为正确的局域网 IP。
3. 在电脑浏览器访问 `http://<服务器IP>:8091/api/v1/health`，确认后端可访问。
4. 确认平板和服务器在同一 Wi-Fi。
5. 检查防火墙是否放行 8091 端口。
6. 查看 HBuilderX 控制台日志，确认请求 URL 是否正确。

### 7.4 语音输入无反应

**现象**：按住麦克风没有弹出录音界面，或识别结果为空。

**排查步骤**：

1. 确认 `manifest.json` 中已申请录音权限：

```json
"permissions": ["RECORD_AUDIO"]
```

2. 在平板上给应用授权麦克风权限。
3. 确认网络可访问（语音识别通常需要在线引擎）。
4. 查看 HBuilderX 控制台是否有 `plus.speech` 相关错误。

### 7.5 仿真器内操作后没有保存记录

**现象**：完成练习后返回首页，历史记录没有出现。

**排查步骤**：

1. 确认当前已选择孩子档案（首页应显示当前用户）。
2. 在 HBuilderX 控制台查看 WebView 的 `@message` 输出。
3. 在 Chrome 调试工具中查看 `createRecord` 请求是否成功。
4. 查看后端日志，确认 `POST /api/v1/learning/record` 是否收到请求。
5. 如果 `duration` 始终为 0，检查 `simulators/shared/simulator-core.js` 是否正确加载。

### 7.6 删除孩子档案后记录还在

**现象**：删除孩子后，历史记录页面仍显示该孩子的记录。

**排查步骤**：

1. 确认删除的是当前查看的孩子。
2. 查看后端日志，确认 `DELETE /api/v1/users/{id}` 执行成功。
3. 如果历史记录页面有缓存，下拉刷新或重新进入页面。

### 7.7 云打包失败

**现象**：HBuilderX 提示云打包失败。

**排查步骤**：

1. 检查 `manifest.json` 是否完整，特别是 `appid`。
2. 登录 HBuilderX 账号（云打包需要登录）。
3. 检查包名格式是否正确（如 `com.example.phetmath`）。
4. 查看 HBuilderX 控制台的具体错误信息。
5. 如果是证书问题，测试阶段改用 DCloud 公用测试证书。

---

## 八、快速命令参考

```bash
# 启动后端
cd D:\Project\PHET\phet-math-platform-android
docker compose up -d --build

# 查看后端日志
docker compose logs -f backend

# 后端测试（必须在 Docker 中运行）
cd backend
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$(pwd -W)/app:/app/app" \
  -v "$(pwd -W)/tests:/app/tests" \
  -e DATABASE_URL=sqlite:///./phet_math.db \
  phet-backend-base python -m pytest tests/ -v

# 前端 H5 构建
cd frontend/uni-app
npm install
npm run build:h5

# 查看 Android 设备
adb devices

# 放行 8091 端口（PowerShell 管理员）
New-NetFirewallRule -DisplayName "PhetBackend" -Direction Inbound -LocalPort 8091 -Protocol TCP -Action Allow
```

---

## 九、版本记录

| 日期 | 版本 | 说明 |
|------|------|------|
| 2026-07-02 | 1.0 | 初版，覆盖 HBuilderX 调试、云打包、常见问题排查 |

---

如有新的问题或补充，更新到此手册中。
