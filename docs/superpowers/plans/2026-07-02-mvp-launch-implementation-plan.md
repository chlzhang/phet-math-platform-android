# 最小可用上线实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复学习时长记录和孩子档案级联删除两个核心缺口，完成 Android 真机/模拟器验证并生成可安装 APK。

**Architecture:** 在 `simulators/shared/simulator-core.js` 中统一记录仿真器加载时间并在 `sendAnswerEvent` 时附加 `duration`；前端 `simulator.vue` 将 `data.duration` 透传后端；后端 `delete_user` 接口在删除用户前手动清理其学习记录。

**Tech Stack:** FastAPI + SQLAlchemy + SQLite，uni-app (Vue3) + WebView，HBuilderX 云打包。

## Global Constraints

- 后端测试必须在 Docker 镜像 `phet-backend-base` 中运行（本机 Python 3.14 与 `pydantic-core` 不兼容）。
- 保持 HTTP 家庭内网访问，`manifest.json` 已配置 `usesCleartextTraffic="true"`。
- 不引入新依赖，不改动数据库 schema（仅应用层级联删除）。
- 不处理 `progress` 聚合优化、弃用警告、HTTPS、跨设备同步等非上线阻塞项。

---

## File Structure

| 文件 | 责任 |
|------|------|
| `backend/app/routers/users.py` | 删除用户前清理其学习记录。 |
| `backend/tests/test_users.py` | 新增级联删除测试。 |
| `backend/tests/test_learning.py` | 新增 duration 持久化测试。 |
| `simulators/shared/simulator-core.js` | 记录开始时间，在 `sendAnswerEvent` 中附加 `duration`。 |
| `frontend/uni-app/src/pages/simulator/simulator.vue` | 使用 `data.duration` 创建学习记录。 |
| `README.md` / `DEPLOY.md` | 补充 Android 验证和打包说明。 |

---

### Task 1: 后端级联删除学习记录

**Files:**
- Modify: `backend/app/routers/users.py`
- Modify: `backend/tests/test_users.py`

**Interfaces:**
- Consumes: `DELETE /api/v1/users/{user_id}`
- Produces: 删除用户后，该用户 `LearningRecord` 行数为 0。

- [ ] **Step 1: 写失败测试**

在 `backend/tests/test_users.py` 末尾追加：

```python
def test_delete_user_cascades_learning_records():
    with TestClient(app) as client:
        u = client.post("/api/v1/users", json={"device_id": "d-cascade", "nickname": "小宝"}).json()["data"]
        uid = u["id"]

        for score in [50, 100]:
            r = client.post("/api/v1/learning/record", json={
                "user_id": uid,
                "type": "chicken_rabbit",
                "type_name": "鸡兔同笼",
                "problem_text": "8头22脚",
                "score": score,
                "duration": 30
            })
            assert r.status_code == 200

        hist_before = client.get(f"/api/v1/learning/history?user_id={uid}").json()["data"]
        assert hist_before["total"] == 2

        res = client.delete(f"/api/v1/users/{uid}")
        assert res.status_code == 200
        assert res.json()["success"] is True

        hist_after = client.get(f"/api/v1/learning/history?user_id={uid}").json()["data"]
        assert hist_after["total"] == 0
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd backend
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$(pwd -W)/app:/app/app" \
  -v "$(pwd -W)/tests:/app/tests" \
  -e DATABASE_URL=sqlite:///./phet_math.db \
  phet-backend-base python -m pytest tests/test_users.py::test_delete_user_cascades_learning_records -v
```

Expected: FAIL，断言 `hist_after["total"] == 0` 不成立。

- [ ] **Step 3: 实现级联删除**

修改 `backend/app/routers/users.py`，在 `delete_user` 中先删记录：

```python
from app.models import LearningRecord  # 加到文件顶部

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    db.query(LearningRecord).filter(LearningRecord.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    return {"success": True, "data": {"id": user_id}}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
cd backend
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$(pwd -W)/app:/app/app" \
  -v "$(pwd -W)/tests:/app/tests" \
  -e DATABASE_URL=sqlite:///./phet_math.db \
  phet-backend-base python -m pytest tests/test_users.py::test_delete_user_cascades_learning_records -v
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add backend/app/routers/users.py backend/tests/test_users.py
git commit -m "feat(backend): cascade delete learning records when deleting user"
```

---

### Task 2: 后端确认 duration 字段可被持久化

**Files:**
- Modify: `backend/tests/test_learning.py`

**Interfaces:**
- Consumes: `POST /api/v1/learning/record` 的 `duration` 字段
- Produces: 返回的记录中 `duration` 与提交值一致。

- [ ] **Step 1: 写测试**

在 `backend/tests/test_learning.py` 末尾追加一个新的测试函数，避免与已有双记录测试的 `ORDER BY created_at DESC` 顺序依赖：

```python
def test_record_duration_persisted():
    with TestClient(app) as client:
        u = client.post("/api/v1/users", json={"device_id": "d-duration", "nickname": "时长测试"}).json()["data"]
        uid = u["id"]

        r = client.post("/api/v1/learning/record", json={
            "user_id": uid,
            "type": "chicken_rabbit",
            "type_name": "鸡兔同笼",
            "problem_text": "8头22脚",
            "score": 100,
            "duration": 42
        })
        assert r.status_code == 200

        hist = client.get(f"/api/v1/learning/history?user_id={uid}").json()["data"]
        assert hist["total"] == 1
        assert hist["records"][0]["duration"] == 42
```

- [ ] **Step 2: 运行测试确认通过**

```bash
cd backend
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$(pwd -W)/app:/app/app" \
  -v "$(pwd -W)/tests:/app/tests" \
  -e DATABASE_URL=sqlite:///./phet_math.db \
  phet-backend-base python -m pytest tests/test_learning.py -v
```

Expected: PASS。

- [ ] **Step 3: 提交**

```bash
git add backend/tests/test_learning.py
git commit -m "test(backend): assert duration is persisted in learning records"
```

---

### Task 3: 仿真器核心库记录学习时长

**Files:**
- Modify: `simulators/shared/simulator-core.js`

**Interfaces:**
- Consumes: 仿真器 HTML 加载完成即开始计时。
- Produces: `sendAnswerEvent(detail)` 发送的消息自动包含 `duration`（秒，≥1）。

- [ ] **Step 1: 修改 simulator-core.js**

在文件顶部添加：

```js
const SIMULATOR_START_TIME = Date.now();
```

修改 `sendAnswerEvent` 函数为：

```js
function sendAnswerEvent(detail) {
  const elapsedSeconds = Math.max(1, Math.round((Date.now() - SIMULATOR_START_TIME) / 1000));
  const data = { event: 'answer', duration: elapsedSeconds, ...detail };
  if (window.uni && window.uni.postMessage) {
    window.uni.postMessage({ data });
  } else if (window.parent && window.parent.postMessage) {
    window.parent.postMessage(data, '*');
  }
}
```

- [ ] **Step 2: 本地 H5 快速验证**

启动后端（如未启动）：

```bash
docker compose up -d --build
```

浏览器访问 `http://localhost:8091`，进入任意仿真器，等待几秒后完成操作，检查网络请求 `/api/v1/learning/record` 的 payload 中 `duration > 0`。

> 如果本机没有浏览器测试条件，可跳过此步，直接进入 Task 6 的前端构建验证。

- [ ] **Step 3: 提交**

```bash
git add simulators/shared/simulator-core.js
git commit -m "feat(simulator): track elapsed time and report duration with answer events"
```

---

### Task 4: 前端仿真器页面透传 duration

**Files:**
- Modify: `frontend/uni-app/src/pages/simulator/simulator.vue`

**Interfaces:**
- Consumes: WebView `@message` 事件中的 `data.duration`。
- Produces: `createRecord` 请求中 `duration` 使用仿真器上报值。

- [ ] **Step 1: 修改 simulator.vue**

把 `onMessage` 中的 `duration: 0` 替换为：

```js
duration: data.duration ?? 0
```

完整片段如下：

```js
await createRecord({
  user_id: user.id,
  type: data.type,
  type_name: title.value,
  problem_text: problemText.value || '',
  params: data.params || {},
  score: data.correct ? 100 : (data.score ?? 0),
  duration: data.duration ?? 0
})
```

- [ ] **Step 2: 提交**

```bash
git add frontend/uni-app/src/pages/simulator/simulator.vue
git commit -m "feat(frontend): use simulator-reported duration in learning record"
```

---

### Task 5: 后端全量测试

**Files:**
- 无代码改动，仅验证。

- [ ] **Step 1: 运行全部后端测试**

```bash
cd backend
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$(pwd -W)/app:/app/app" \
  -v "$(pwd -W)/tests:/app/tests" \
  -e DATABASE_URL=sqlite:///./phet_math.db \
  phet-backend-base python -m pytest tests/ -v
```

Expected: 14/14 PASS（当前测试数，如新增测试会有增加）。

- [ ] **Step 2: 提交（如测试有变更）**

如果 Task 1/2 已单独提交，此步无需额外 commit。

---

### Task 6: 前端 H5 构建验证

**Files:**
- 无代码改动，仅验证构建产物。

- [ ] **Step 1: 安装依赖并构建**

```bash
cd frontend/uni-app
npm install
npm run build:h5
```

Expected: 构建成功，无新增编译错误。弃用警告可忽略。

- [ ] **Step 2: 提交（如构建产物需要纳入版本控制）**

`dist/` 通常已被 `.gitignore` 忽略，无需提交。如项目需要静态产物，再决定是否添加。

---

### Task 7: Android 真机/模拟器验证

**Files:**
- 无代码改动，仅手动验证。

**前提条件：**
- 已安装 HBuilderX。
- Android 平板通过 USB 连接电脑并开启开发者模式/USB 调试；或已配置 Android 模拟器。
- 平板与后端服务器处于同一局域网。

- [ ] **Step 1: 配置服务器地址**

打开 `frontend/uni-app/src/utils/api.js`，确认 `DEFAULT_SERVER` 为家中服务器实际局域网地址，例如：

```js
const DEFAULT_SERVER = 'http://192.168.1.100:8091'
```

如地址不同，修改后执行：

```bash
git add frontend/uni-app/src/utils/api.js
git commit -m "chore(frontend): update default server address for home network"
```

- [ ] **Step 2: HBuilderX 运行到设备**

1. 在 HBuilderX 中打开 `frontend/uni-app`。
2. 点击菜单「运行」→「运行到手机或模拟器」→ 选择已连接的 Android 设备。
3. 等待应用安装并启动。

- [ ] **Step 3: 执行验证清单**

| 验证项 | 预期结果 |
|--------|----------|
| 语音输入题目 | 按住麦克风按钮说话，题目自动填入输入框。 |
| 题目解析 | 输入/语音题目后，后端返回题型并进入仿真器。 |
| 仿真器操作 | 完成练习后，成功提示出现。 |
| 学习记录 | 返回首页 → 历史记录，出现刚练习的记录，且 `duration > 0`。 |
| 进度统计 | 进度页按题型汇总，正确率统计正常。 |
| 删除孩子档案 | 在「我的」页面删除某个孩子，该孩子历史记录清空。 |

- [ ] **Step 4: 记录问题并修复**

如有问题，在计划中追加任务修复。常见检查点：
- `manifest.json` 中 `usesCleartextTraffic` 是否仍为 `true`。
- 平板 Wi-Fi 是否与服务器同网段。
- 后端服务是否已启动且防火墙放行 `8091`。

---

### Task 8: 生成 APK

**Files:**
- 无代码改动，仅生成安装包。

- [ ] **Step 1: HBuilderX 云打包**

1. 在 HBuilderX 中点击「发行」→「原生 App-云打包」。
2. 选择「Android Apk」。
3. 填写包名（如 `com.example.phetmath`）和证书信息（可使用 DCloud 公用测试证书测试）。
4. 点击「打包」，等待云端构建完成。
5. 下载 APK 文件到本地。

- [ ] **Step 2: 安装并做最终 Smoke Test**

1. 将 APK 拷贝到 Android 平板。
2. 在平板上安装并打开。
3. 设置服务器地址，重复 Task 7 的验证清单。
4. 确认无崩溃、功能正常。

- [ ] **Step 3: 标记上线就绪**

在 `README.md` 的「快速开始」或「Android 打包」小节补充一句：

```markdown
> 最小可用上线版本已通过 HBuilderX 云打包生成 APK，详见 [DEPLOY.md](DEPLOY.md)。
```

并提交：

```bash
git add README.md DEPLOY.md
git commit -m "docs: update README and DEPLOY for MVP launch"
```

---

## Self-Review

### Spec Coverage

| 设计文档要求 | 对应任务 |
|--------------|----------|
| 学习时长真实记录 | Task 3 + Task 4 |
| 删除孩子档案级联清理记录 | Task 1 |
| Android 环境完整验证 | Task 7 |
| 生成可安装 APK | Task 8 |

### Placeholder Scan

- 无 TBD/TODO。
- 无 "add appropriate error handling" 等模糊描述。
- 每个代码步骤都给出完整代码。
- 每个命令都给出期望输出。

### Type Consistency

- `duration` 在 `RecordCreate` 中类型为 `Optional[int]`，前端 `data.duration ?? 0` 保持为 `number`。
- `sendAnswerEvent` 参数名与所有仿真器模板中调用一致。
- 后端 `delete_user` 路由签名未变更。

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-02-mvp-launch-implementation-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
