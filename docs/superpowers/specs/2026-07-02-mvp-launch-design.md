# 最小可用上线设计文档

## 目标

让「数学小乐园」Android 平板版达到家庭局域网内可正式给小孩使用的状态。本次只处理阻塞上线的核心缺口，性能优化和体验打磨留到后续迭代。

## 上线标准

完成以下四项即视为最小可用上线：

1. 学习时长被真实记录（当前 `duration` 恒为 0）。
2. 删除孩子档案时，其学习记录被一并清理。
3. 在 Android 真机或模拟器上完整跑通核心流程。
4. 生成可安装的 APK。

## 非目标

以下问题本次不处理：

- `progress` 后端全表加载的性能优化。
- Pydantic / Sass 弃用警告。
- 跨设备账号同步。
- HTTPS / 公网访问。
- 自动化数据备份。

## 方案选型

### 学习时长：仿真器内计时（推荐方案）

在 `simulators/shared/simulator-core.js` 中记录仿真器加载时间，当孩子完成练习时，由 `sendAnswerEvent` 自动计算并上报已用秒数。

**不选前端包装层计时的原因**：包装层计时会把 WebView 加载、白屏等待时间也算进去，不能反映孩子实际练习时长。

### 级联删除：应用层手动清理

在 `delete_user` 接口里先删除 `LearningRecord` 中 `user_id` 匹配的记录，再删除用户。

**不选数据库外键级联的原因**：SQLite 默认不强制外键，需要额外配置 `PRAGMA foreign_keys = ON` 和 SQLAlchemy 事件，增加了模型层复杂度。应用层删除更清晰、跨数据库行为一致。

## 架构与改动点

| 文件 | 改动说明 |
|------|----------|
| `simulators/shared/simulator-core.js` | 新增 `startTime` 记录；`sendAnswerEvent` 自动附加 `duration`（秒）。 |
| `simulators/templates/*/*.html` | 在每个仿真器的「提交/完成」回调里调用 `sendAnswerEvent`。 |
| `frontend/uni-app/src/pages/simulator/simulator.vue` | `createRecord` 时写入 `data.duration`，不再硬编码 `0`。 |
| `backend/app/routers/users.py` | `delete_user` 先删除该用户的学习记录，再删除用户。 |
| `backend/tests/test_users.py` | 新增级联删除断言。 |
| `README.md` / `DEPLOY.md` | 补充 Android 验证和打包步骤。 |

## 数据流

1. WebView 加载仿真器 HTML。
2. `simulators/shared/simulator-core.js` 初始化时记录 `startTime = Date.now()`。
3. 孩子完成练习，仿真器调用：
   ```js
   sendAnswerEvent({
     type: 'chicken_rabbit',
     params: { heads: 8, legs: 22 },
     correct: true,
     score: 100
   })
   ```
4. `sendAnswerEvent` 内部自动追加：
   ```js
   duration: Math.max(1, Math.round((Date.now() - startTime) / 1000))
   ```
5. `simulator.vue` 的 `@message` 收到事件，调用 `createRecord` 时将 `data.duration` 写入 `LearningRecord.duration`。
6. 历史记录、进度统计页面读取该字段并展示。

## 错误处理

- 如果仿真器未调用 `sendAnswerEvent`，或旧模板未升级，`duration` 回退到 `0`，不影响功能。
- 保存学习记录失败时，前端打印日志但不阻断用户返回上一页。
- 删除用户时若记录删除失败，整体事务回滚，避免产生孤立记录或删除一半的状态。

## 后端接口变更

### DELETE /api/v1/users/{user_id}

行为变更：删除用户前，先删除该用户的所有学习记录。

返回保持不变：

```json
{
  "success": true,
  "data": { "id": 1 }
}
```

## 测试计划

### 后端单元测试

- 新增测试：创建用户 → 创建 2 条学习记录 → 删除用户 → 断言该用户记录数为 0。
- 全量后端测试在 Docker 镜像 `phet-backend-base` 中跑通（当前环境 Python 3.14 与依赖不兼容）。

### 前端构建

- `npm run build:h5` 成功，无新增编译错误。

### Android 真机/模拟器验证

- 语音输入题目后能正确填入输入框。
- 题目解析后进入仿真器页面。
- 在仿真器内完成练习并返回，历史记录出现对应记录且 `duration > 0`。
- 进度页能正确按题型汇总。
- 删除孩子档案后，该孩子历史记录不再显示。

### APK 打包

- 使用 HBuilderX 云打包生成 APK。
- 在 Android 平板上安装并启动，进行端到端 smoke test。

## 部署与运维

- 家庭内网保持 HTTP 明文访问，`manifest.json` 已配置 `usesCleartextTraffic="true"`。
- 后端端口保持 `8091`，平板设置页填写家中服务器局域网地址。
- 数据库文件 `backend/phet_math.db` 建议定期手动备份。

## 后续迭代方向

- 将 `progress` 聚合改为 SQL 层统计，避免记录增多后全表加载。
- 清理 Pydantic / Sass 弃用警告。
- 增加数据导出或自动备份机制。
- 根据真实使用反馈优化仿真器交互和语音输入体验。
