# Android 平板版数学辅导应用设计文档

> 目标：将现有「小学数学可视化仿真平台」改造成可在 Android 平板安装使用的 APK，供孩子辅导作业。
> 状态：已与客户确认（方案 A：MVP 在线版）。
> 日期：2026-07-02

---

## 1. 目标与范围

### 1.1 核心目标
- 孩子在 Android 平板上打开 App，即可选择题型或语音/输入题目。
- 后端识别题型并返回对应的 H5 仿真页面。
- 在 WebView 中进行交互式操作或观看动画演示。
- 自动记录练习历史、正确率、错题本，并支持查看学习进度。

### 1.2 使用场景
- **网络环境**：家庭 Wi-Fi，平板与后端服务器在同一内网。
- **设备**：Android 平板（优先适配平板横竖屏，手机也可使用）。
- **用户**：学龄儿童直接使用，家长协助做服务器设置和孩子档案管理。

### 1.3 做与不做的范围

| 做 | 不做 |
|---|---|
| uni-app 打包 Android APK | 重写原生 Android / Flutter 客户端 |
| 语音输入（系统语音识别） | 手写识别 / 拍照识题 |
| 学习记录、历史、进度、错题本 | 云端同步 / 多设备实时同步 |
| 多孩子档案切换 | 账号登录 / 家长远程管理 |
| 仿真器触摸适配 | 将仿真器改写成原生组件 |
| 断网友好提示 | 完整离线运行 |
| 家庭内网 HTTP 部署 | 应用商店发布 / 公网 HTTPS 生产部署 |

---

## 2. 总体架构

保持现有 C/S 架构不变：

```
┌─────────────────────────────────────┐
│        Android 平板 (uni-app)        │
│  ├─ 首页 / 题型卡片                 │
│  ├─ 语音输入页                      │
│  ├─ WebView 仿真页                  │
│  ├─ 历史 / 进度 / 错题本 / 设置     │
│  └─ 我的（孩子档案）                │
└──────────────┬──────────────────────┘
               │ HTTP (同一 Wi-Fi)
               ▼
┌─────────────────────────────────────┐
│        家庭服务器 / 电脑             │
│  ├─ Nginx（静态 H5 + 仿真器）       │
│  ├─ FastAPI 后端                    │
│  ├─ PostgreSQL / SQLite             │
│  └─ Redis（可选缓存）               │
└─────────────────────────────────────┘
```

### 2.1 关键取舍
- **使用 HTTP 而非 HTTPS**：家庭内网自签证书会被 Android WebView 拦截，配置 `usesCleartextTraffic` 最简单；未来若部署公网，再切 HTTPS。
- **仿真器继续用 H5 WebView**：现有 6 个 H5 仿真器不改写，只调整触摸交互和尺寸。
- **解析逻辑仍走后端**：保留规则匹配 + mock LLM 兜底，未来可无缝接入真实 LLM。

---

## 3. Android 端（uni-app）改造

### 3.1 新增 / 改造页面

| 页面 | 路径 | 说明 |
|---|---|---|
| 首页 | `pages/index/index.vue` | 增加「按住说话」入口、「我的」入口。 |
| 输入页 | `pages/input/input.vue` | 增加语音按钮，识别结果填入题目框；保留年级选择。 |
| 仿真页 | `pages/simulator/simulator.vue` | WebView 加载仿真器；监听 `postMessage` 收集答题结果。 |
| 历史 | `pages/history/history.vue` | 按时间倒序展示练习记录。 |
| 错题本 | `pages/mistakes/mistakes.vue` | 过滤出答错 / 未答对的记录。 |
| 进度 | `pages/progress/progress.vue` | 按题型统计正确率、练习次数、最近练习时间。 |
| 设置 | `pages/settings/settings.vue` | 服务器地址、当前用户昵称 / 头像。 |
| 我的 | `pages/profile/profile.vue` | 切换 / 新增 / 编辑孩子档案。 |

> 所有新增页面需要在 `src/pages.json` 中注册路由。

### 3.2 新增组件

- **`VoiceInput.vue`**
  - 封装 `plus.speech.startRecognize`（HTML5+ App 模块）。
  - 处理 `RECORD_AUDIO` 权限申请。
  - 显示录音中动画、识别中、识别失败提示。
  - 识别结果以事件形式抛出，由父组件填入输入框。

- **`UserPicker.vue`**
  - 展示当前孩子档案列表，支持切换。
  - 如果没有档案，引导创建默认档案。

### 3.3 WebView ↔ App 通信

仿真器页面在答题完成时，通过 `window.parent.postMessage` 或 `uni.postMessage` 发送事件：

```json
{
  "event": "answer",
  "type": "chicken_rabbit",
  "correct": true,
  "score": 100,
  "params": { "heads": 8, "legs": 22 }
}
```

App 端在 `<web-view @message="onSimulatorMessage">` 中接收，并调用后端 `POST /learning/record` 保存。

### 3.4 权限与配置

- `manifest.json` 中 `app-plus.distribute.android` 增加：
  - `<uses-permission android:name="android.permission.RECORD_AUDIO" />`
  - `<uses-permission android:name="android.permission.INTERNET" />`
  - `android:usesCleartextTraffic="true"`
- `utils/api.js` 中 API Base 改为：
  - 优先读取 `uni.getStorageSync('server_url')`。
  - 否则使用默认内网地址（如 `http://192.168.1.100:8090`）。
  - H5 环境下仍使用 `window.location.origin`。

### 3.5 语音输入说明
- 调用 Android 系统语音识别服务，需要联网。
- 识别结果仅作为文本填入题目框，不直接调用解析；仍需点击「开始解析」走后端。
- 若设备未安装中文语音包或权限被拒绝，降级为键盘输入。

---

## 4. 后端改造

### 4.1 新增接口

#### 用户（孩子档案）
- `POST /users` — 创建档案
- `GET /users?device_id=xxx` — 查询某设备下的档案列表
- `PUT /users/{id}` — 修改昵称 / 头像
- `DELETE /users/{id}` — 删除档案（可选）

#### 学习记录
- `POST /learning/record` — 保存一次练习记录
  ```json
  {
    "user_id": 1,
    "problem_id": "uuid",
    "type": "chicken_rabbit",
    "type_name": "鸡兔同笼",
    "problem_text": "笼子里有8个头，22只脚...",
    "params": { "heads": 8, "legs": 22 },
    "score": 100,
    "duration": 120
  }
  ```
- `GET /learning/history?user_id=1&page=1&size=20` — 历史列表（分页、时间倒序）
- `GET /learning/progress?user_id=1` — 按题型聚合统计
  ```json
  {
    "data": {
      "chicken_rabbit": { "total": 10, "correct": 7, "accuracy": 0.70, "last_at": "..." }
    }
  }
  ```
- `GET /learning/mistakes?user_id=1` — 错题本（`score < 100` 或 `correct=false`）

### 4.2 数据模型调整

复用现有 `users` 与 `learning_records` 表，补全字段：

```python
class User(Base):
    id = Column(Integer, primary_key=True)
    device_id = Column(String(64), index=True)   # 设备标识
    nickname = Column(String(64))                # 孩子昵称
    avatar = Column(String(128))                 # 头像 URL / emoji
    created_at = Column(DateTime, server_default=func.now())

class LearningRecord(Base):
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, index=True)
    problem_id = Column(Integer, nullable=True)  # 关联 problems.id
    type = Column(String(32), index=True)
    type_name = Column(String(64))               # 冗余，方便展示
    problem_text = Column(Text)                  # 冗余，方便展示
    params = Column(JSON)
    score = Column(Integer)                      # 0~100
    duration = Column(Integer, default=0)        # 练习时长（秒）
    created_at = Column(DateTime, server_default=func.now())
```

### 4.3 用户体系
- 不强制登录。
- App 首次启动生成 `device_id`（UUID），使用 `uni.setStorage` 持久化。
- 默认自动创建一个名为「默认宝贝」的档案。
- 家长可在「我的」里新增 / 切换档案；所有学习记录按 `user_id` 隔离。

### 4.4 解析接口
- `POST /problems/parse` 保持不变。
- 为了前端历史页展示，响应中已包含 `problem_id`、`type_name`、`params`。

---

## 5. 仿真器适配

### 5.1 触摸交互改造
- 移除依赖鼠标拖拽的 HTML5 DnD（`dragstart`、`ondrop`）。
- 保留并放大「+ / −」按钮；在支持点击的区域增加点击反馈。
- 对鸡兔同笼等需要拖拽的模板，改为「点击动物头像 → 点击笼子格子」或直接用按钮增减。

### 5.2 尺寸与布局
- 按钮最小点击区域 ≥ 64px。
- 输入框、步骤说明字体适当放大。
- Demo 模式增加显眼的「上一步 / 下一步 / 重置」大按钮。

### 5.3 答题事件上报
- 在 `simulator-core.js` 中新增 `sendAnswerEvent(detail)`：
  ```javascript
  function sendAnswerEvent(detail) {
    const data = { event: 'answer', correct: detail.correct, score: detail.score, ...detail };
    if (window.uni && window.uni.postMessage) {
      window.uni.postMessage({ data });
    } else if (window.parent && window.parent.postMessage) {
      window.parent.postMessage(data, '*');
    }
  }
  ```
- 各模板在 `checkSuccess()` 或演示结束时调用，例如：
  ```javascript
  sendAnswerEvent({ type: 'chicken_rabbit', correct: true, score: 100, params: config });
  ```

---

## 6. 部署与打包

### 6.1 后端部署
在家庭服务器上执行：

```bash
cd /path/to/phet-math-platform
docker-compose up -d
```

确认：
- `http://<服务器IP>:8090/api/v1/health` 返回正常。
- `http://<服务器IP>:8090/simulators/templates/chicken-rabbit/index.html?heads=8&legs=22` 能正常显示。

### 6.2 Android 打包
1. 进入 `frontend/uni-app`：
   ```bash
   npm install
   ```
2. 使用 HBuilderX：
   - 运行 → 运行到手机或模拟器（调试）。
   - 发行 → 原生 App-云打包 / 本地打包，生成 APK。
3. 在 `manifest.json` 中配置：
   - Android 包名（如 `com.example.phetmath`）。
   - 测试签名证书（正式上架前更换）。
   - `usesCleartextTraffic: true`。
4. 首次安装后，在 App「设置」页输入后端地址，如 `http://192.168.1.100:8090`。

### 6.3 网络说明
- Android 9+ 默认禁止明文 HTTP，必须显式开启 cleartext。
- 若未来使用公网 HTTPS，关闭 cleartext 并配置真实 SSL 证书。

---

## 7. 测试清单

### 7.1 功能测试
- [ ] 语音输入授权、识别、结果填入题目框。
- [ ] 题目解析成功并跳转到仿真页。
- [ ] 仿真器加载、交互、演示、答题结果回传。
- [ ] 创建 / 切换孩子档案后，学习记录正确隔离。
- [ ] 历史、进度、错题本数据展示正确。
- [ ] 修改服务器地址后，App 能重新连接。

### 7.2 兼容性测试
- [ ] Android 平板横屏 / 竖屏切换不导致 WebView 白屏或重新加载。
- [ ] 不同 Android 版本（建议最低 Android 8.0）均可安装运行。
- [ ] WebView 能正常加载 H5 仿真器及 CSS/JS。

### 7.3 异常测试
- [ ] 后端不可达时，App 显示友好提示，不崩溃。
- [ ] 语音识别失败时，可继续键盘输入。
- [ ] 解析失败（unknown）时，提示「换个说法试试」。

---

## 8. 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| 家庭服务器 IP 变动 | App 连不上 | 设置页可修改地址；可选 mDNS / 固定 DHCP IP。 |
| 系统语音识别不准 | 孩子输入体验差 | 识别结果仅作填入，不直接解析；支持键盘修正。 |
| WebView cleartext 安全限制 | HTTP 页面加载失败 | 开发/内网阶段开启；公网部署切 HTTPS。 |
| H5 仿真器触摸不友好 | 孩子操作困难 | 统一放大按钮，移除拖拽依赖。 |
| 后端依赖较多（Postgres/Redis） | 家庭部署门槛 | 提供一键 `docker-compose up` 脚本；默认 fallback 到 SQLite。 |

---

## 9. 后续可扩展方向（不在本次范围）

- 本地缓存：缓存题型列表、历史记录、最近仿真器，支持弱网/断网查看。
- 接入真实 LLM：提升题目识别覆盖率和准确率。
- 家长端：独立小程序 / H5 查看孩子学习报告。
- 应用商店发布：补齐隐私协议、年龄分级、HTTPS 等合规要求。

---

## 10. 结论

采用 **方案 A：MVP 在线版**：
- 复用现有 uni-app 前端和 FastAPI 后端，改动最小。
- 通过 HBuilderX 打包生成 Android APK。
- 新增语音输入、多孩子档案、学习记录/历史/进度/错题本、仿真器触摸适配。
- 部署在家庭内网，使用 HTTP + cleartext 配置快速可用。

下一步：编写详细实施计划（writing-plans）。
