# 仿真器模板规范

## 目录结构

每个题型模板是一个独立目录：

```
simulators/templates/{type}/
├── config.json          # 模板元信息
├── index.html           # 仿真器入口页面
├── simulator.js         # 仿真器逻辑
└── style.css            # 样式（可选）
```

---

## config.json

```json
{
  "type": "chicken_rabbit",
  "name": "鸡兔同笼",
  "icon": "🐔🐰",
  "description": "假设全是鸡或全是兔，通过腿数差异推理鸡兔数量。",
  "grade_range": [3, 5],
  "keywords": ["鸡", "兔", "头", "腿", "脚", "笼"],
  "params": {
    "heads": {
      "label": "总头数",
      "type": "int",
      "min": 2,
      "max": 50,
      "default": 8
    },
    "legs": {
      "label": "总腿数",
      "type": "int",
      "min": 4,
      "max": 200,
      "default": 22
    }
  },
  "modes": ["interactive", "demo"],
  "demo_methods": [
    { "key": "assume_chicken", "name": "假设全是鸡" },
    { "key": "assume_rabbit", "name": "假设全是兔" },
    { "key": "list", "name": "列表尝试法" }
  ]
}
```

### params 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| type | string | int / float / string / select |
| label | string | 显示名称 |
| min | number | 最小值（数值类型） |
| max | number | 最大值（数值类型） |
| default | any | 默认值 |
| options | array | select 类型可选项 |

---

## index.html

仿真器入口页面需满足：

1. 从 URL 查询参数读取配置
2. 调用 `initSimulator(params)` 初始化
3. 支持两种模式切换：interactive / demo
4. 移动端适配

示例结构：

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>鸡兔同笼</title>
  <link rel="stylesheet" href="../../shared/simulator-base.css">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="app">
    <div class="mode-tabs">
      <button class="mode-btn active" data-mode="interactive">动手操作</button>
      <button class="mode-btn" data-mode="demo">动画演示</button>
    </div>
    <div class="controls" id="controls"></div>
    <div class="main-stage">
      <div class="viz-area" id="vizArea"></div>
      <div class="side-panel" id="sidePanel"></div>
    </div>
  </div>
  <script src="../../shared/simulator-core.js"></script>
  <script src="simulator.js"></script>
  <script>
    const params = new URLSearchParams(location.search);
    const config = {
      heads: parseInt(params.get('heads')) || 8,
      legs: parseInt(params.get('legs')) || 22,
      mode: params.get('mode') || 'interactive'
    };
    initSimulator(config);
  </script>
</body>
</html>
```

---

## simulator.js

每个仿真器暴露一个 `initSimulator(config)` 函数：

```javascript
function initSimulator(config) {
  // 1. 渲染控制面板
  // 2. 绑定事件
  // 3. 初始化可视化区域
  // 4. 如果是 demo 模式，准备步骤
}

function renderInteractive() { ... }
function renderDemo() { ... }
function nextStep() { ... }
function checkAnswer() { ... }
```

---

## shared/simulator-base.css

提供统一的样式变量和基础组件样式：

- `.card`
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`
- `.input-group`
- `.mode-tabs`, `.mode-btn`
- `.solution-steps`, `.step`
- `.success-msg`
- `.tip`

---

## shared/simulator-core.js

提供公共工具函数：

```javascript
// 创建 DOM 元素
function createEl(tag, className, text) { ... }

// 创建步骤面板
function createSteps(container, steps) { ... }

// 激活某一步骤
function activateStep(container, index) { ... }

// 常用数学工具
function gcd(a, b) { ... }
function lcm(a, b) { ... }

// 从 URL 读取参数
function getUrlParams() { ... }

// 统一成功提示
function showSuccess(container, message) { ... }
```

---

## 模板列表

当前需要模板化的题型：

| type | name | 参数 |
|------|------|------|
| chicken_rabbit | 鸡兔同笼 | heads, legs |
| tree_planting | 植树问题 | length, interval, type |
| fraction | 分数加减法 | a, b, c, d, op |
| travel_meet | 相遇问题 | distance, v1, v2 |
| travel_chase | 追及问题 | distance, v1, v2 |
| polygon_area | 多边形面积 | shape, a, b, h |
| circle_area | 圆的面积 | r, parts |
