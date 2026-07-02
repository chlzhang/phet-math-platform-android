# 数学小乐园 - 前端 uni-app 跨端应用

小学数学可视化仿真平台的前端壳子，基于 uni-app Vue3 开发，支持微信小程序、H5、iOS/Android App。

## 目录结构

```
frontend/uni-app/
├── App.vue                 # 应用入口、全局样式
├── main.js                 # Vue3 createApp
├── manifest.json           # 各端配置
├── pages.json              # 页面注册与导航栏配置
├── index.html              # H5 渲染模板
├── pages/
│   ├── index/index.vue     # 首页：题型卡片列表
│   ├── input/input.vue     # 题目输入页
│   └── simulator/simulator.vue # 仿真页（web-view）
├── components/
│   ├── TopicCard.vue       # 题型卡片
│   └── ProblemInput.vue    # 题目输入组件
└── utils/
    └── api.js              # API 请求封装
```

## 如何运行

### 方式一：HBuilder X（推荐，多端一键运行）

1. 打开 HBuilder X，选择 **文件 → 打开目录**，定位到 `frontend/uni-app/`。
2. 安装依赖（如提示）：点击菜单 **工具 → 插件安装**，安装 uni-app 编译器。
3. 运行：
   - H5：点击工具栏 **运行 → 运行到浏览器 → Chrome/Firefox**。
   - 微信小程序：点击 **运行 → 运行到小程序模拟器 → 微信开发者工具**（需先安装微信开发者工具并配置路径）。
   - App：点击 **运行 → 运行到手机或模拟器**。

### 方式二：Vue CLI / CLI 项目

如需使用命令行，可先在 `frontend/uni-app/` 同级通过 `@dcloudio/uni-app` 脚手架创建项目，再将本目录文件复制进去：

```bash
# 全局安装脚手架（如未安装）
npm install -g @dcloudio/uniapp-cli

# 或在已有 uni-app 项目根目录执行
cd frontend/uni-app
npm install
npm run dev:h5      # H5
npm run dev:mp-weixin   # 微信小程序
npm run dev:app     # App
```

> 注：当前目录仅包含源码级文件，未包含 `node_modules` 与 `package.json`。若使用命令行方式，需自行补充 uni-app 项目工程文件。

## API 配置

默认后端地址：`http://localhost:8000/api/v1`

修改位置：`utils/api.js` 中的 `API_BASE`。

## 页面说明

| 页面 | 功能 |
|------|------|
| 首页 | 调用 `GET /templates` 展示所有题型卡片；支持直接输入题目 |
| 输入页 | 文本输入 + 年级选择；调用 `POST /problems/parse` 解析 |
| 仿真页 | 使用 `web-view` 加载后端返回的 `simulator_url`；顶部标题与返回按钮 |

## 各端注意事项

- **H5**：`web-view` 以 iframe 形式加载完整仿真器链接，直接打开即可。
- **微信小程序**：`web-view` 要求域名已加入微信小程序后台「业务域名」白名单。开发测试可关闭开发者工具域名校验（详情 → 本地设置 → 不校验合法域名），上线前必须配置。
- **App**：如 `web-view` 为原生层级，顶部返回按钮在某些设备上可能被覆盖，建议优先使用系统返回键/手势。

## 样式风格

采用卡通柔和风格：圆角大卡片、渐变按钮、大字号、高对比度配色，优先适配移动端小学生使用场景。
