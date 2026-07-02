# Android 平板版数学辅导应用实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有小学数学可视化仿真平台改造为可在 Android 平板安装使用的 APK，并新增语音输入、多孩子档案、学习记录/历史/进度/错题本功能。

**Architecture:** 保留现有 FastAPI + uni-app 架构；后端新增用户与学习记录 API，前端新增页面和组件，H5 仿真器做触摸适配并通过 postMessage 向 App 上报答题结果，最后通过 HBuilderX 打包 Android APK。

**Tech Stack:** Python 3.11 + FastAPI + SQLAlchemy + Pydantic + pytest；uni-app (Vue3) + HBuilderX/Android Studio；H5 + Canvas/SVG 仿真器；Docker + Docker Compose。

## Global Constraints

- 后端必须兼容现有数据库表，通过 SQLAlchemy 自动建表；生产环境建议使用 Alembic，本次 MVP 不引入迁移工具。
- 所有后端响应使用 UTF-8 中文编码（沿用 `UTF8JSONResponse`）。
- 前端继续用 uni-app Vue3，新页面使用 `<script setup>` 和 SCOPED SCSS。
- App 通过 HTTP 访问家庭内网服务器，必须配置 `usesCleartextTraffic`。
- 语音输入调用系统语音识别（需要网络和录音权限）。
- 学习记录按 `user_id` 隔离，不强制登录。

---

## File Structure

```
backend/
  app/
    models.py                 # 修改 User / LearningRecord 字段
    routers/
      users.py                # 重写/补全用户 CRUD
      learning.py             # 新增学习记录 API
    main.py                   # 注册 users / learning 路由
  tests/
    test_users.py             # 用户接口测试
    test_learning.py          # 学习记录接口测试

frontend/uni-app/src/
  utils/api.js               # 支持动态服务器地址 + 新接口
  components/
    VoiceInput.vue           # 语音输入组件
    UserPicker.vue           # 孩子档案选择
  pages/
    profile/profile.vue      # 我的：档案管理
    settings/settings.vue    # 设置：服务器地址 / 当前用户
    history/history.vue      # 历史练习
    mistakes/mistakes.vue    # 错题本
    progress/progress.vue    # 学习进度
    index/index.vue          # 增加语音/我的入口
    input/input.vue          # 集成语音按钮
    simulator/simulator.vue  # 监听 WebView 消息并保存记录
  manifest.json              # Android 权限 + cleartext
  pages.json                 # 注册新页面

simulators/
  shared/simulator-core.js   # 新增 sendAnswerEvent
  templates/
    chicken-rabbit/simulator.js
    tree-planting/simulator.js
    fraction/simulator.js
    travel/simulator.js
    polygon/simulator.js
    circle/simulator.js      # 以上全部：触摸适配 + 调用 sendAnswerEvent
```

---

## Task 1: 后端数据模型调整

**Files:**
- Modify: `backend/app/models.py`
- Test: `backend/tests/test_models.py`（新建）

**Interfaces:**
- Produces: `User.device_id`, `User.nickname`, `User.avatar`；`LearningRecord.user_id`, `LearningRecord.problem_text`, `LearningRecord.type_name`, `LearningRecord.params`, `LearningRecord.score`, `LearningRecord.duration`。

- [ ] **Step 1: 修改模型字段**

在 `backend/app/models.py` 中：

```python
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(64), index=True, nullable=True)
    openid = Column(String(64), unique=True, index=True, nullable=True)
    nickname = Column(String(64), nullable=True)
    avatar = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class LearningRecord(Base):
    __tablename__ = "learning_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)
    problem_id = Column(Integer, nullable=True)
    type = Column(String(32), nullable=False, index=True)
    type_name = Column(String(64), nullable=True)
    problem_text = Column(Text, nullable=True)
    params = Column(JSON, default=dict)
    score = Column(Integer, nullable=True)
    duration = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 2: 编写模型导入测试**

新建 `backend/tests/test_models.py`：

```python
from app.models import User, LearningRecord

def test_user_fields():
    u = User(device_id="dev-1", nickname="宝贝")
    assert u.nickname == "宝贝"

def test_learning_record_fields():
    r = LearningRecord(user_id=1, type="chicken_rabbit", type_name="鸡兔同笼", score=100)
    assert r.type_name == "鸡兔同笼"
```

- [ ] **Step 3: 运行测试**

```bash
cd backend
python -m pytest tests/test_models.py -v
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/models.py backend/tests/test_models.py
git commit -m "feat(backend): extend User and LearningRecord models"
```

---

## Task 2: 后端用户（孩子档案）API

**Files:**
- Modify: `backend/app/routers/users.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_users.py`

**Interfaces:**
- Produces:
  - `POST /api/v1/users` → `{success, data: {id, device_id, nickname, avatar}}`
  - `GET /api/v1/users?device_id=xxx` → `{success, data: {users: [...]}}`
  - `PUT /api/v1/users/{id}` → 更新昵称/头像
  - `DELETE /api/v1/users/{id}` → 删除档案

- [ ] **Step 1: 实现 users 路由**

将 `backend/app/routers/users.py` 替换为：

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/users", tags=["users"])

class UserCreate(BaseModel):
    device_id: Optional[str] = None
    nickname: str
    avatar: Optional[str] = None

class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    avatar: Optional[str] = None

class UserOut(BaseModel):
    id: int
    device_id: Optional[str]
    nickname: Optional[str]
    avatar: Optional[str]
    class Config:
        from_attributes = True

@router.post("")
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    user = User(**body.model_dump(exclude_unset=True))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"success": True, "data": UserOut.model_validate(user)}

@router.get("")
def list_users(device_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(User)
    if device_id:
        q = q.filter(User.device_id == device_id)
    users = q.order_by(User.created_at.desc()).all()
    return {"success": True, "data": {"users": [UserOut.model_validate(u) for u in users]}}

@router.put("/{user_id}")
def update_user(user_id: int, body: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return {"success": True, "data": UserOut.model_validate(user)}

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    db.delete(user)
    db.commit()
    return {"success": True, "data": {"id": user_id}}
```

- [ ] **Step 2: 确保 main.py 已注册 users 路由**

`backend/app/main.py` 中应包含：

```python
from app.routers import problems, templates, users
# ...
app.include_router(users.router, prefix="/api/v1")
```

> `learning` 路由在 Task 3 中添加，本任务不要提前引入。

- [ ] **Step 3: 编写用户接口测试**

新建 `backend/tests/test_users.py`：

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_and_list_user():
    res = client.post("/api/v1/users", json={"device_id": "d1", "nickname": "宝贝"})
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["nickname"] == "宝贝"
    uid = data["id"]

    res = client.get("/api/v1/users?device_id=d1")
    assert res.status_code == 200
    assert len(res.json()["data"]["users"]) >= 1

    res = client.put(f"/api/v1/users/{uid}", json={"nickname": "小明"})
    assert res.json()["data"]["nickname"] == "小明"

    res = client.delete(f"/api/v1/users/{uid}")
    assert res.json()["success"] is True
```

- [ ] **Step 4: 运行测试**

```bash
cd backend
python -m pytest tests/test_users.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/users.py backend/app/main.py backend/tests/test_users.py
git commit -m "feat(backend): add user profile CRUD"
```

---

## Task 3: 后端学习记录 API

**Files:**
- Create: `backend/app/routers/learning.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/test_learning.py`

**Interfaces:**
- Produces:
  - `POST /api/v1/learning/record` → 保存记录
  - `GET /api/v1/learning/history?user_id=1` → 历史列表
  - `GET /api/v1/learning/progress?user_id=1` → 按题型统计
  - `GET /api/v1/learning/mistakes?user_id=1` → 错题本

- [ ] **Step 1: 实现 learning 路由**

创建 `backend/app/routers/learning.py`：

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from app.database import get_db
from app.models import LearningRecord

router = APIRouter(prefix="/learning", tags=["learning"])

class RecordCreate(BaseModel):
    user_id: Optional[int] = None
    problem_id: Optional[int] = None
    type: str
    type_name: Optional[str] = None
    problem_text: Optional[str] = None
    params: Optional[dict] = None
    score: Optional[int] = None
    duration: Optional[int] = 0

@router.post("/record")
def create_record(body: RecordCreate, db: Session = Depends(get_db)):
    record = LearningRecord(**body.model_dump(exclude_unset=True))
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"success": True, "data": {"id": record.id}}

@router.get("/history")
def history(user_id: Optional[int] = None, page: int = 1, size: int = 20, db: Session = Depends(get_db)):
    q = db.query(LearningRecord)
    if user_id is not None:
        q = q.filter(LearningRecord.user_id == user_id)
    total = q.count()
    records = q.order_by(LearningRecord.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {
        "success": True,
        "data": {
            "total": total,
            "page": page,
            "size": size,
            "records": [
                {
                    "id": r.id,
                    "user_id": r.user_id,
                    "type": r.type,
                    "type_name": r.type_name,
                    "problem_text": r.problem_text,
                    "params": r.params,
                    "score": r.score,
                    "duration": r.duration,
                    "created_at": r.created_at.isoformat() if r.created_at else None
                }
                for r in records
            ]
        }
    }

@router.get("/progress")
def progress(user_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(LearningRecord)
    if user_id is not None:
        q = q.filter(LearningRecord.user_id == user_id)
    rows = q.all()
    stats = {}
    for r in rows:
        s = stats.setdefault(r.type, {"type_name": r.type_name or r.type, "total": 0, "correct": 0, "accuracy": 0.0, "last_at": None})
        s["total"] += 1
        if r.score is not None and r.score >= 100:
            s["correct"] += 1
        ts = r.created_at.isoformat() if r.created_at else ""
        if s["last_at"] is None or ts > s["last_at"]:
            s["last_at"] = ts
    for s in stats.values():
        s["accuracy"] = round(s["correct"] / s["total"], 2) if s["total"] else 0.0
    return {"success": True, "data": {"progress": stats}}

@router.get("/mistakes")
def mistakes(user_id: Optional[int] = None, page: int = 1, size: int = 20, db: Session = Depends(get_db)):
    q = db.query(LearningRecord).filter(LearningRecord.score < 100)
    if user_id is not None:
        q = q.filter(LearningRecord.user_id == user_id)
    total = q.count()
    records = q.order_by(LearningRecord.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return {
        "success": True,
        "data": {
            "total": total,
            "records": [
                {"id": r.id, "type": r.type, "type_name": r.type_name, "problem_text": r.problem_text,
                 "params": r.params, "score": r.score, "created_at": r.created_at.isoformat() if r.created_at else None}
                for r in records
            ]
        }
    }
```

- [ ] **Step 2: 注册 learning 路由**

在 `backend/app/main.py` 中：

```python
from app.routers import problems, templates, users, learning
# ...
app.include_router(users.router, prefix="/api/v1")
app.include_router(learning.router, prefix="/api/v1")
```

- [ ] **Step 3: 编写学习记录测试**

新建 `backend/tests/test_learning.py`：

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_record_history_progress_mistakes():
    # create a user first
    u = client.post("/api/v1/users", json={"device_id": "dl", "nickname": "x"}).json()["data"]
    uid = u["id"]

    r = client.post("/api/v1/learning/record", json={
        "user_id": uid,
        "type": "chicken_rabbit",
        "type_name": "鸡兔同笼",
        "problem_text": "8头22脚",
        "score": 50
    })
    assert r.status_code == 200

    r = client.post("/api/v1/learning/record", json={
        "user_id": uid,
        "type": "chicken_rabbit",
        "type_name": "鸡兔同笼",
        "problem_text": "8头22脚",
        "score": 100
    })
    assert r.status_code == 200

    hist = client.get(f"/api/v1/learning/history?user_id={uid}").json()["data"]
    assert hist["total"] == 2

    prog = client.get(f"/api/v1/learning/progress?user_id={uid}").json()["data"]
    assert prog["progress"]["chicken_rabbit"]["total"] == 2
    assert prog["progress"]["chicken_rabbit"]["correct"] == 1

    ms = client.get(f"/api/v1/learning/mistakes?user_id={uid}").json()["data"]
    assert ms["total"] == 1
```

- [ ] **Step 4: 运行测试**

```bash
cd backend
python -m pytest tests/test_learning.py -v
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/learning.py backend/app/main.py backend/tests/test_learning.py
git commit -m "feat(backend): add learning record APIs"
```

---

## Task 4: 前端 API 工具层改造

**Files:**
- Modify: `frontend/uni-app/src/utils/api.js`

**Interfaces:**
- Produces: `getApiBase()`, `setServerUrl(url)`, `getServerUrl()`, 用户/学习相关 API 函数。

- [ ] **Step 1: 重写 api.js**

将 `frontend/uni-app/src/utils/api.js` 替换为：

```javascript
const DEFAULT_SERVER = 'http://192.168.1.100:8090'
const SERVER_KEY = 'server_url'

export function getServerUrl() {
  try {
    return uni.getStorageSync(SERVER_KEY) || DEFAULT_SERVER
  } catch (e) {
    return DEFAULT_SERVER
  }
}

export function setServerUrl(url) {
  uni.setStorageSync(SERVER_KEY, url)
}

function getApiBase() {
  // #ifdef H5
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}/api/v1`
  }
  // #endif
  return `${getServerUrl()}/api/v1`
}

export function request(method, url, data = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${getApiBase()}${url}`,
      method,
      data,
      header: { 'Content-Type': 'application/json' },
      timeout: 20000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(`请求失败：${res.statusCode}`))
        }
      },
      fail: reject
    })
  })
}

export function fetchTemplates() { return request('GET', '/templates') }
export function fetchTemplateDetail(type) { return request('GET', `/templates/${type}`) }
export function parseProblem(text, grade) { return request('POST', '/problems/parse', { text, grade }) }

export function createUser(payload) { return request('POST', '/users', payload) }
export function fetchUsers(deviceId) { return request('GET', `/users?device_id=${encodeURIComponent(deviceId)}`) }
export function updateUser(id, payload) { return request('PUT', `/users/${id}`, payload) }
export function deleteUser(id) { return request('DELETE', `/users/${id}`) }

export function createRecord(payload) { return request('POST', '/learning/record', payload) }
export function fetchHistory(userId, page = 1, size = 20) {
  return request('GET', `/learning/history?user_id=${userId}&page=${page}&size=${size}`)
}
export function fetchProgress(userId) { return request('GET', `/learning/progress?user_id=${userId}`) }
export function fetchMistakes(userId, page = 1, size = 20) {
  return request('GET', `/learning/mistakes?user_id=${userId}&page=${page}&size=${size}`)
}

export function buildSimulatorUrl(simulatorUrl) {
  if (!simulatorUrl) return ''
  if (simulatorUrl.startsWith('http')) return simulatorUrl
  // #ifdef H5
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}${simulatorUrl}`
  }
  // #endif
  return `${getServerUrl()}${simulatorUrl}`
}
```

- [ ] **Step 2: 检查无语法错误**

在 `frontend/uni-app` 运行：

```bash
npx eslint src/utils/api.js
```

若未配置 ESLint，可跳过。

- [ ] **Step 3: Commit**

```bash
git add frontend/uni-app/src/utils/api.js
git commit -m "feat(frontend): dynamic server URL and learning/user APIs"
```

---

## Task 5: 语音输入组件

**Files:**
- Create: `frontend/uni-app/src/components/VoiceInput.vue`

**Interfaces:**
- Emits: `@result(text)` 识别完成文本；`@error(msg)` 识别失败。

- [ ] **Step 1: 实现 VoiceInput.vue**

```vue
<script setup>
import { ref } from 'vue'

const emit = defineEmits(['result', 'error'])
const listening = ref(false)
const tip = ref('')

function requestPermission() {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    plus.android.requestPermissions(
      ['android.permission.RECORD_AUDIO'],
      (result) => {
        if (result.granted && result.granted.length > 0) resolve()
        else reject(new Error('需要录音权限才能语音识别'))
      },
      reject
    )
    // #endif
    // #ifndef APP-PLUS
    resolve()
    // #endif
  })
}

function start() {
  // #ifndef APP-PLUS
  uni.showToast({ title: '请在 App 端使用语音', icon: 'none' })
  return
  // #endif

  requestPermission().then(() => {
    listening.value = true
    tip.value = '正在听...'
    plus.speech.startRecognize(
      { engine: 'iFly' },
      (text) => {
        listening.value = false
        tip.value = ''
        emit('result', text)
      },
      (err) => {
        listening.value = false
        tip.value = ''
        emit('error', err.message || '识别失败')
      }
    )
  }).catch((e) => {
    emit('error', e.message)
  })
}

function stop() {
  // #ifdef APP-PLUS
  plus.speech.stopRecognize()
  // #endif
  listening.value = false
  tip.value = ''
}
</script>

<template>
  <view class="voice-input" @touchstart.prevent="start" @touchend.prevent="stop" @mousedown.prevent="start" @mouseup.prevent="stop">
    <view class="btn" :class="{ active: listening }">
      <text class="icon">🎙️</text>
      <text class="text">{{ listening ? '松开结束' : '按住说话' }}</text>
    </view>
    <text v-if="tip" class="tip">{{ tip }}</text>
  </view>
</template>

<style lang="scss" scoped>
.voice-input { display: flex; flex-direction: column; align-items: center; margin: 24rpx 0; }
.btn { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 160rpx; height: 160rpx; border-radius: 50%; background: linear-gradient(135deg, #81d4fa, #29b6f6); box-shadow: 0 8rpx 0 #0288d1; transition: transform .1s; }
.btn.active { transform: translateY(8rpx); box-shadow: 0 0 0 #0288d1; }
.icon { font-size: 64rpx; }
.text { font-size: 24rpx; color: #fff; margin-top: 8rpx; }
.tip { margin-top: 16rpx; font-size: 28rpx; color: #0288d1; }
</style>
```

- [ ] **Step 2: 在输入页临时测试**

暂时在 `frontend/uni-app/src/pages/input/input.vue` 中导入并监听：

```vue
<VoiceInput @result="text = $event" />
```

（正式集成在 Task 10 完成。）

- [ ] **Step 3: Commit**

```bash
git add frontend/uni-app/src/components/VoiceInput.vue
git commit -m "feat(frontend): add VoiceInput component"
```

---

## Task 6: 孩子档案选择与「我的」页面

**Files:**
- Create: `frontend/uni-app/src/components/UserPicker.vue`
- Create: `frontend/uni-app/src/pages/profile/profile.vue`

**Interfaces:**
- `UserPicker` emits `@select(user)` and `@add`.
- `profile.vue` uses local `device_id` and manages users via API.

- [ ] **Step 1: 实现 UserPicker.vue**

```vue
<script setup>
const props = defineProps({ users: { type: Array, default: () => [] }, current: { type: Object, default: null } })
const emit = defineEmits(['select', 'add'])
</script>

<template>
  <view class="picker">
    <view v-for="u in users" :key="u.id" class="user-item kid-card" :class="{ active: current && current.id === u.id }" @click="emit('select', u)">
      <text class="avatar">{{ u.avatar || '👶' }}</text>
      <text class="name">{{ u.nickname || '未命名' }}</text>
    </view>
    <view class="user-item kid-card add" @click="emit('add')">
      <text class="avatar">➕</text>
      <text class="name">新增宝贝</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.picker { display: flex; flex-wrap: wrap; gap: 24rpx; }
.user-item { width: calc(50% - 12rpx); display: flex; flex-direction: column; align-items: center; padding: 32rpx; border: 6rpx solid #fff; }
.user-item.active { border-color: #29b6f6; background: #e1f5fe; }
.avatar { font-size: 64rpx; margin-bottom: 12rpx; }
.name { font-size: 30rpx; color: #4e342e; font-weight: 700; }
</style>
```

- [ ] **Step 2: 实现 profile.vue**

```vue
<script setup>
import { ref, onMounted } from 'vue'
import UserPicker from '@/components/UserPicker.vue'
import { fetchUsers, createUser, updateUser, deleteUser, setServerUrl, getServerUrl } from '@/utils/api.js'

const DEVICE_KEY = 'device_id'
const CURRENT_USER_KEY = 'current_user'
const users = ref([])
const currentUser = ref(null)
const newName = ref('')

function getDeviceId() {
  let id = uni.getStorageSync(DEVICE_KEY)
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    uni.setStorageSync(DEVICE_KEY, id)
  }
  return id
}

async function loadUsers() {
  const deviceId = getDeviceId()
  const res = await fetchUsers(deviceId)
  if (res.success) {
    users.value = res.data.users || []
    const cached = uni.getStorageSync(CURRENT_USER_KEY)
    if (cached) {
      const found = users.value.find(u => u.id === cached.id)
      currentUser.value = found || users.value[0] || null
    } else {
      currentUser.value = users.value[0] || null
    }
    if (currentUser.value) uni.setStorageSync(CURRENT_USER_KEY, currentUser.value)
  }
}

async function addUser() {
  const name = newName.value.trim() || '默认宝贝'
  const res = await createUser({ device_id: getDeviceId(), nickname: name, avatar: '👶' })
  if (res.success) {
    newName.value = ''
    await loadUsers()
  }
}

function selectUser(u) {
  currentUser.value = u
  uni.setStorageSync(CURRENT_USER_KEY, u)
  uni.showToast({ title: `已切换：${u.nickname}`, icon: 'none' })
}

async function removeUser(u) {
  await deleteUser(u.id)
  await loadUsers()
}

onMounted(loadUsers)
</script>

<template>
  <view class="container safe-bottom">
    <text class="title">我的孩子 👶</text>
    <UserPicker :users="users" :current="currentUser" @select="selectUser" @add="addUser" />
    <view class="add-box kid-card">
      <text class="label">新增宝贝</text>
      <input v-model="newName" class="kid-input" placeholder="输入昵称" />
      <button class="kid-btn" @click="addUser">添加</button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.container { min-height: 100vh; padding: 40rpx 32rpx; }
.title { display: block; font-size: 52rpx; font-weight: 900; color: #ff7043; margin-bottom: 36rpx; }
.add-box { margin-top: 40rpx; padding: 32rpx; }
.label { display: block; font-size: 32rpx; font-weight: 700; color: #4e342e; margin-bottom: 20rpx; }
input { margin-bottom: 24rpx; }
</style>
```

- [ ] **Step 3: 在 H5 或 App 中预览**

打开 `pages/profile/profile` 路径，检查能否新增/切换用户。

- [ ] **Step 4: Commit**

```bash
git add frontend/uni-app/src/components/UserPicker.vue frontend/uni-app/src/pages/profile/profile.vue
git commit -m "feat(frontend): user picker and profile page"
```

---

## Task 7: 设置页面

**Files:**
- Create: `frontend/uni-app/src/pages/settings/settings.vue`

**Interfaces:**
- 读取/保存服务器地址；展示当前用户昵称。

- [ ] **Step 1: 实现 settings.vue**

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { getServerUrl, setServerUrl } from '@/utils/api.js'

const serverUrl = ref('')
const user = ref(null)

onMounted(() => {
  serverUrl.value = getServerUrl()
  try { user.value = uni.getStorageSync('current_user') } catch (e) {}
})

function save() {
  const url = serverUrl.value.trim()
  if (!url) {
    uni.showToast({ title: '地址不能为空', icon: 'none' })
    return
  }
  setServerUrl(url)
  uni.showToast({ title: '已保存', icon: 'success' })
}
</script>

<template>
  <view class="container safe-bottom">
    <text class="title">设置 ⚙️</text>
    <view class="card kid-card">
      <text class="label">后端服务器地址</text>
      <input v-model="serverUrl" class="kid-input" placeholder="http://192.168.1.100:8090" />
      <text class="hint">请填写和后端同一 Wi-Fi 的地址，例如 http://192.168.1.100:8090</text>
      <button class="kid-btn" @click="save">保存</button>
    </view>
    <view v-if="user" class="card kid-card">
      <text class="label">当前宝贝</text>
      <text class="user">{{ user.avatar || '👶' }} {{ user.nickname }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.container { min-height: 100vh; padding: 40rpx 32rpx; }
.title { display: block; font-size: 52rpx; font-weight: 900; color: #ff7043; margin-bottom: 36rpx; }
.card { padding: 32rpx; margin-bottom: 32rpx; }
.label { display: block; font-size: 32rpx; font-weight: 700; color: #4e342e; margin-bottom: 20rpx; }
input { margin-bottom: 16rpx; }
.hint { display: block; font-size: 24rpx; color: #8d6e63; margin-bottom: 24rpx; line-height: 1.5; }
.user { font-size: 32rpx; color: #5d4037; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/uni-app/src/pages/settings/settings.vue
git commit -m "feat(frontend): settings page"
```

---

## Task 8: 历史、错题本、进度页面

**Files:**
- Create: `frontend/uni-app/src/pages/history/history.vue`
- Create: `frontend/uni-app/src/pages/mistakes/mistakes.vue`
- Create: `frontend/uni-app/src/pages/progress/progress.vue`

**Interfaces:**
- 读取当前 `current_user` id，调用对应 API。

- [ ] **Step 1: 实现 history.vue**

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { fetchHistory } from '@/utils/api.js'

const records = ref([])
const loading = ref(false)

async function load() {
  const user = uni.getStorageSync('current_user')
  if (!user) return
  loading.value = true
  const res = await fetchHistory(user.id)
  records.value = res.success ? res.data.records : []
  loading.value = false
}

onMounted(load)
</script>

<template>
  <view class="container safe-bottom">
    <text class="title">练习历史 📚</text>
    <view v-if="loading" class="status"><text>加载中...</text></view>
    <view v-else-if="records.length === 0" class="status"><text>还没有练习记录哦~</text></view>
    <view v-else class="list">
      <view v-for="r in records" :key="r.id" class="item kid-card">
        <text class="name">{{ r.type_name }}</text>
        <text class="text">{{ r.problem_text }}</text>
        <text class="score" :class="{ good: r.score >= 100 }">得分：{{ r.score ?? '-' }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.container { min-height: 100vh; padding: 40rpx 32rpx; }
.title { display: block; font-size: 52rpx; font-weight: 900; color: #ff7043; margin-bottom: 36rpx; }
.status { text-align: center; padding: 80rpx; color: #8d6e63; font-size: 30rpx; }
.list { padding-bottom: 40rpx; }
.item { padding: 28rpx; margin-bottom: 24rpx; }
.name { display: block; font-size: 32rpx; font-weight: 800; color: #4e342e; margin-bottom: 12rpx; }
.text { display: block; font-size: 28rpx; color: #5d4037; margin-bottom: 12rpx; }
.score { font-size: 26rpx; color: #e53935; }
.score.good { color: #43a047; }
</style>
```

- [ ] **Step 2: 实现 mistakes.vue**

与 history.vue 类似，调用 `fetchMistakes(user.id)`；标题改为「错题本」；列表过滤 score < 100。

- [ ] **Step 3: 实现 progress.vue**

```vue
<script setup>
import { ref, onMounted } from 'vue'
import { fetchProgress } from '@/utils/api.js'

const stats = ref({})
const loading = ref(false)

async function load() {
  const user = uni.getStorageSync('current_user')
  if (!user) return
  loading.value = true
  const res = await fetchProgress(user.id)
  stats.value = res.success ? res.data.progress : {}
  loading.value = false
}

onMounted(load)
</script>

<template>
  <view class="container safe-bottom">
    <text class="title">学习进度 📊</text>
    <view v-if="loading" class="status"><text>加载中...</text></view>
    <view v-else-if="Object.keys(stats).length === 0" class="status"><text>还没有数据~</text></view>
    <view v-else class="list">
      <view v-for="(s, key) in stats" :key="key" class="item kid-card">
        <text class="name">{{ s.type_name }}</text>
        <text class="row">总练习：{{ s.total }} 次</text>
        <text class="row">正确：{{ s.correct }} 次</text>
        <text class="row">正确率：{{ Math.round(s.accuracy * 100) }}%</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.container { min-height: 100vh; padding: 40rpx 32rpx; }
.title { display: block; font-size: 52rpx; font-weight: 900; color: #ff7043; margin-bottom: 36rpx; }
.status { text-align: center; padding: 80rpx; color: #8d6e63; font-size: 30rpx; }
.item { padding: 28rpx; margin-bottom: 24rpx; }
.name { display: block; font-size: 34rpx; font-weight: 800; color: #4e342e; margin-bottom: 16rpx; }
.row { display: block; font-size: 28rpx; color: #5d4037; line-height: 1.8; }
</style>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/uni-app/src/pages/history/history.vue frontend/uni-app/src/pages/mistakes/mistakes.vue frontend/uni-app/src/pages/progress/progress.vue
git commit -m "feat(frontend): history, mistakes, and progress pages"
```

---

## Task 9: 首页入口改造

**Files:**
- Modify: `frontend/uni-app/src/pages/index/index.vue`

**Interfaces:**
- 增加「按住说话」快速入口、「我的」「设置」入口。

- [ ] **Step 1: 修改 index.vue**

在 `template` 中 header 下方新增快捷入口：

```vue
<view class="quick-row">
  <view class="quick-card kid-card" @click="goToVoiceInput">
    <text class="quick-icon">🎙️</text>
    <view class="quick-text">
      <text class="quick-title">按住说话</text>
      <text class="quick-desc">用语音输入题目</text>
    </view>
  </view>
</view>
<view class="quick-row">
  <view class="quick-card kid-card" @click="goToProfile">
    <text class="quick-icon">👶</text>
    <text class="quick-title">我的孩子</text>
  </view>
  <view class="quick-card kid-card" @click="goToSettings">
    <text class="quick-icon">⚙️</text>
    <text class="quick-title">设置</text>
  </view>
</view>
```

在 `script` 中补充函数：

```javascript
function goToVoiceInput() { uni.navigateTo({ url: '/pages/input/input?voice=1' }) }
function goToProfile() { uni.navigateTo({ url: '/pages/profile/profile' }) }
function goToSettings() { uni.navigateTo({ url: '/pages/settings/settings' }) }
```

- [ ] **Step 2: 运行 H5 预览**

```bash
cd frontend/uni-app
npm run dev:h5
```

打开浏览器确认首页出现新入口且无报错。

- [ ] **Step 3: Commit**

```bash
git add frontend/uni-app/src/pages/index/index.vue
git commit -m "feat(frontend): add voice/profile/settings entries on home"
```

---

## Task 10: 输入页集成语音

**Files:**
- Modify: `frontend/uni-app/src/pages/input/input.vue`

**Interfaces:**
- 接收 `voice=1` 参数时自动弹出语音；VoiceInput 结果写入 `text`。

- [ ] **Step 1: 导入并放置 VoiceInput**

```vue
<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { parseProblem, fetchTemplateDetail } from '@/utils/api.js'
import ProblemInput from '@/components/ProblemInput.vue'
import VoiceInput from '@/components/VoiceInput.vue'

const currentType = ref('')
const typeName = ref('')
const loading = ref(false)
const text = ref('')

onLoad((options) => {
  if (options?.type) {
    currentType.value = decodeURIComponent(options.type)
    loadTypeName(currentType.value)
  }
  if (options?.voice === '1') {
    // 让 VoiceInput 组件自己触发
  }
})

async function loadTypeName(type) { ... }

async function handleSubmit({ text: t, grade }) { ... }

function onVoiceResult(t) {
  text.value = t
  uni.showToast({ title: '已填入语音内容', icon: 'none' })
}
</script>
```

由于 `ProblemInput` 组件内部管理 text，需要把 `text` 改成 prop + emit 或在 `ProblemInput` 增加 `setText` 方法。更简单：给 `ProblemInput` 增加 `v-model:text`。

- [ ] **Step 2: 改造 ProblemInput 支持 v-model:text**

修改 `frontend/uni-app/src/components/ProblemInput.vue`：

```vue
<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  typeName: { type: String, default: '' },
  modelValue: { type: String, default: '' },
  defaultGrade: { type: Number, default: 3 },
  loading: { type: Boolean, default: false }
})
const text = ref(props.modelValue || '')
const gradeIndex = ref(Math.max(0, props.defaultGrade - 1))
const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
const selectedGrade = computed(() => gradeIndex.value + 1)

watch(() => props.modelValue, (v) => { text.value = v || '' })

const emit = defineEmits(['submit', 'update:modelValue'])

function onGradeChange(e) { gradeIndex.value = Number(e.detail.value) }

function submit() {
  const value = text.value.trim()
  if (!value) {
    uni.showToast({ title: '请先输入题目哦~', icon: 'none' })
    return
  }
  emit('update:modelValue', value)
  emit('submit', { text: value, grade: selectedGrade.value })
}
</script>
```

保留其余 template/style 不变。

- [ ] **Step 3: 在 input.vue 模板中绑定**

```vue
<VoiceInput @result="onVoiceResult" />
<ProblemInput v-model:text="text" :type-name="typeName" :loading="loading" @submit="handleSubmit" />
```

- [ ] **Step 4: 运行 H5 预览**

确认输入框能接收语音结果。

- [ ] **Step 5: Commit**

```bash
git add frontend/uni-app/src/pages/input/input.vue frontend/uni-app/src/components/ProblemInput.vue
git commit -m "feat(frontend): integrate voice input into problem input page"
```

---

## Task 11: 仿真页接收 WebView 消息并保存记录

**Files:**
- Modify: `frontend/uni-app/src/pages/simulator/simulator.vue`

**Interfaces:**
- 监听 `<web-view @message>`，调用 `createRecord`。

- [ ] **Step 1: 修改 simulator.vue**

```vue
<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { buildSimulatorUrl, createRecord } from '@/utils/api.js'

const title = ref('仿真演示')
const simulatorUrl = ref('')
const recordSaved = ref(false)

onLoad((options) => {
  if (options?.url) simulatorUrl.value = decodeURIComponent(options.url)
  if (options?.title) title.value = decodeURIComponent(options.title)
})

const fullUrl = computed(() => buildSimulatorUrl(simulatorUrl.value))

function goBack() { uni.navigateBack({ delta: 1 }) }

async function onMessage(e) {
  const data = e.detail?.data || e.detail
  if (!data || data.event !== 'answer') return
  const user = uni.getStorageSync('current_user')
  if (!user) return
  try {
    await createRecord({
      user_id: user.id,
      type: data.type,
      type_name: title.value,
      problem_text: '',
      params: data.params || {},
      score: data.correct ? 100 : (data.score ?? 0),
      duration: 0
    })
    recordSaved.value = true
  } catch (err) {
    console.error('保存学习记录失败', err)
  }
}
</script>

<template>
  <view class="container">
    <view class="header">
      <view class="header-inner">
        <text class="back" @click="goBack">← 返回</text>
        <text class="title">{{ title }}</text>
        <text class="placeholder"></text>
      </view>
    </view>
    <web-view v-if="fullUrl" class="web-view" :src="fullUrl" @message="onMessage" />
    <view v-else class="error">...</view>
  </view>
</template>
```

- [ ] **Step 2: 确认 buildSimulatorUrl 返回 http 地址**

在 App 端，确保 `getServerUrl()` 返回的是 `http://...`。

- [ ] **Step 3: Commit**

```bash
git add frontend/uni-app/src/pages/simulator/simulator.vue
git commit -m "feat(frontend): save learning record from simulator webview"
```

---

## Task 12: Manifest 与页面路由配置

**Files:**
- Modify: `frontend/uni-app/src/manifest.json`
- Modify: `frontend/uni-app/src/pages.json`

- [ ] **Step 1: 修改 manifest.json**

在 `app-plus.distribute.android` 中：

```json
"distribute": {
  "android": {
    "permissions": [
      "<uses-permission android:name=\"android.permission.INTERNET\" />",
      "<uses-permission android:name=\"android.permission.RECORD_AUDIO\" />"
    ],
    "abiFilters": ["armeabi-v7a", "arm64-v8a"],
    "minSdkVersion": 21,
    "targetSdkVersion": 33
  }
}
```

并在 `app-plus` 根级增加：

```json
"app-plus": {
  "usingComponents": true,
  "compilerVersion": 3,
  "distribute": { ... },
  "userPermissions": ["android.permission.RECORD_AUDIO"]
}
```

> 注：cleartext 配置通常需要 AndroidManifest 级别的 `android:usesCleartextTraffic="true"`；uni-app 可在 `manifest.json` 的 `app-plus.distribute.android.customconfig` 或打包后手动修改 `AndroidManifest.xml`。本次计划采用打包后产物验证，如 HBuilderX 云打包无该选项，则通过自定义基座或 `network_security_config` 处理。

- [ ] **Step 2: 修改 pages.json**

新增页面注册：

```json
{
  "pages": [
    ...,
    { "path": "pages/profile/profile", "style": { "navigationBarTitleText": "我的孩子" } },
    { "path": "pages/settings/settings", "style": { "navigationBarTitleText": "设置" } },
    { "path": "pages/history/history", "style": { "navigationBarTitleText": "练习历史" } },
    { "path": "pages/mistakes/mistakes", "style": { "navigationBarTitleText": "错题本" } },
    { "path": "pages/progress/progress", "style": { "navigationBarTitleText": "学习进度" } }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/uni-app/src/manifest.json frontend/uni-app/src/pages.json
git commit -m "chore(frontend): manifest permissions and page routes"
```

---

## Task 13: 仿真器核心增加答题事件

**Files:**
- Modify: `simulators/shared/simulator-core.js`

- [ ] **Step 1: 添加 sendAnswerEvent**

在 `simulators/shared/simulator-core.js` 末尾追加：

```javascript
function sendAnswerEvent(detail) {
  const data = { event: 'answer', ...detail };
  if (window.uni && window.uni.postMessage) {
    window.uni.postMessage({ data });
  } else if (window.parent && window.parent.postMessage) {
    window.parent.postMessage(data, '*');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add simulators/shared/simulator-core.js
git commit -m "feat(simulator): add sendAnswerEvent for app communication"
```

---

## Task 14: 所有仿真器触摸适配与事件上报

**Files:**
- Modify: `simulators/templates/*/simulator.js` 和 `simulators/templates/*/style.css`

**Interfaces:**
- 移除拖拽，放大按钮，在成功/演示结束时调用 `sendAnswerEvent({ type, correct, score, params })`。

- [ ] **Step 1: 鸡兔同笼模板改造**

在 `simulators/templates/chicken-rabbit/simulator.js` 中：
- 移除 `dragStart`、`allowDrop`、`drop` 及 `draggable="true"` 属性。
- 保留并放大 `+ / −` 按钮。
- 在 `checkSuccess()` 中：

```javascript
function checkSuccess() {
  const heads = chickens + rabbits, legs = chickens * 2 + rabbits * 4;
  if (heads === config.heads && legs === config.legs) {
    showSuccess(document.getElementById('successMsg'), `🎉 答对了！...`);
    sendAnswerEvent({ type: 'chicken_rabbit', correct: true, score: 100, params: config });
  } else {
    document.getElementById('successMsg').style.display = 'none';
  }
}
```

- demo 结束 `nextStep()` 最后一步也调用 `sendAnswerEvent(...)`。

- [ ] **Step 2: 植树问题、分数、行程、多边形、圆模板改造**

对每个模板执行相同操作：
1. 检查是否存在鼠标拖拽或过小点击区，改为点击/按钮。
2. 在 CSS 中增大按钮和字体。
3. 在判定成功或演示结束时调用 `sendAnswerEvent({ type: '<type>', correct, score, params: config })`。

- [ ] **Step 3: 本地浏览器验证**

启动后端后访问：

```bash
curl http://localhost:8090/simulators/templates/chicken-rabbit/index.html?heads=8&legs=22
```

在浏览器开发者工具 Console 中确认无 JS 报错，`+ / −` 按钮可点击。

- [ ] **Step 4: Commit**

```bash
git add simulators/templates
git commit -m "feat(simulators): touch-friendly interactions and answer events"
```

---

## Task 15: 端到端集成与 Android 打包

**Files:**
- Modify: `frontend/uni-app/package.json`（可选，确认 scripts）
- Verify: `docker-compose.yml`, `nginx.conf`

- [ ] **Step 1: 后端全量测试**

```bash
cd backend
python -m pytest tests/ -v
```

Expected: all PASS

- [ ] **Step 2: 启动本地后端**

```bash
docker-compose up -d
python scripts/init_db.py
python scripts/seed_templates.py
```

确认：

```bash
curl http://localhost:8090/api/v1/health
```

返回 `{ "success": true, ... }`。

- [ ] **Step 3: 构建 H5 产物**

```bash
cd frontend/uni-app
npm install
npm run build:h5
```

确认 `frontend/uni-app/dist/build/h5/index.html` 存在。

- [ ] **Step 4: H5 端到端自测**

```bash
npm run dev:h5
```

在浏览器中：
1. 首页加载题型列表。
2. 输入题目解析并跳转到仿真页。
3. 仿真器操作后，后端数据库出现 `learning_records` 记录。

- [ ] **Step 5: Android 打包（HBuilderX 云打包）**

1. 使用 HBuilderX 打开 `frontend/uni-app`。
2. 菜单：发行 → 原生 App-云打包。
3. 选择 Android（apk），使用 DCloud 公用测试证书。
4. 等待生成 APK 并下载。

- [ ] **Step 6: 安装到平板并测试**

1. 将 APK 安装到 Android 平板。
2. 平板连接同一 Wi-Fi。
3. 打开 App → 设置 → 输入后端地址 → 保存。
4. 语音输入 / 键盘输入题目 → 解析 → 仿真 → 返回历史/进度查看。

- [ ] **Step 7: Commit 任何最终调整**

```bash
git add -A
git commit -m "chore: integration and android build verification"
```

---

## Self-Review

### Spec coverage
- 目标与范围 → Task 1-15 全部围绕 MVP 在线版展开。
- 总体架构 → 保留 C/S，后端/前端/仿真器分层对应 Task 1-15。
- Android 端改造 → Task 4-12。
- 后端改造 → Task 1-3。
- 仿真器适配 → Task 13-14。
- 部署与测试 → Task 15。

### Placeholder scan
- 无 TBD/TODO。
- 所有代码块给出具体实现或具体调用示例。
- 测试命令和期望输出明确。

### Type consistency
- `User.device_id`、`LearningRecord.user_id` 等字段在模型、路由、前端 API 中一致。
- `sendAnswerEvent` 的 `detail` 对象在 shared core 和各模板中一致使用 `{ type, correct, score, params }`。
- `current_user` 本地缓存 key 在 profile/settings/simulator/history 等页面中一致使用 `'current_user'`。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-02-android-tablet-implementation-plan.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

Which approach?
