let config = {};
let mode = 'interactive';
let progress = 0, animating = false;
let stepIndex = 0;

function initSimulator(params) {
  config = {
    r: params.r || 4,
    parts: params.parts || 16,
    mode: params.mode || 'interactive'
  };
  document.getElementById('successMsg').style.display = 'none';
  renderModeTabs();
  renderSidePanel();
  setMode(config.mode);
}

function renderModeTabs() {
  createModeTabs(document.getElementById('modeTabs'), [
    { key: 'interactive', label: '🎮 动手操作' },
    { key: 'demo', label: '▶️ 动画演示' }
  ], setMode);
}

function setMode(newMode) {
  mode = newMode;
  document.getElementById('demoControls').classList.toggle('hidden', mode !== 'demo');
  reset();
}

function reset() {
  progress = 0; animating = false; stepIndex = 0;
  renderControls();
  draw();
  if (mode === 'demo') prepareDemoSteps();
  else prepareInteractiveSteps();
  document.getElementById('successMsg').style.display = 'none';
}

function renderControls() {
  document.getElementById('controls').innerHTML = `
    <div class="input-group"><label>半径</label><input id="rInput" value="${config.r}"></div>
    <div class="input-group"><label>份数</label><input id="partsInput" value="${config.parts}"></div>
    <button class="btn btn-primary" onclick="applyConfig()">生成</button>
    <button class="btn btn-secondary" onclick="animateUnwrap()">展开</button>
    <button class="btn btn-danger" onclick="reset()">重置</button>
  `;
  bindNumberInput(document.getElementById('rInput'), { int: true, min: 1, max: 20 });
  bindNumberInput(document.getElementById('partsInput'), { int: true, min: 4, max: 64 });
  document.getElementById('demoControls').innerHTML = `
    <button class="btn btn-primary" onclick="startDemo()">开始演示</button>
    <button class="btn btn-secondary" onclick="nextStep()">下一步</button>
    <button class="btn btn-danger" onclick="reset()">重置</button>
  `;
}

function renderSidePanel() {
  const area = Math.PI * config.r * config.r;
  document.getElementById('sidePanel').innerHTML = `
    <div class="stat-box"><div class="stat-title">圆的面积</div><div class="stat-value" id="circleArea">${area.toFixed(2)}</div></div>
    <div class="stat-box"><div class="stat-title">近似长方形面积</div><div class="stat-value" id="rectArea">?</div></div>
    <div class="stat-box"><div class="stat-title">公式推导</div><div class="stat-value" style="font-size:0.85rem" id="formula">?</div></div>
    <div class="solution-steps"><h3>📋 推导过程</h3><div id="steps"></div></div>
  `;
}

function applyConfig() {
  config.r = parseInt(document.getElementById('rInput').value) || 4;
  config.parts = parseInt(document.getElementById('partsInput').value) || 16;
  renderSidePanel();
  reset();
}

function animateUnwrap() {
  if (animating) return;
  animating = true;
  animate(1500, p => { progress = p; draw(); }, () => { animating = false; });
}

function draw() {
  const canvas = document.getElementById('ciCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = 120, cy = 160, scale = 25, r = config.r * scale;

  // Original circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#e3f2fd';
  ctx.fill();
  ctx.strokeStyle = '#1565c0';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#1565c0';
  ctx.font = '14px Microsoft YaHei';
  ctx.fillText('圆 r=' + config.r, cx - 25, cy + r + 25);

  // Draw unwrapped sectors as rectangles on right
  const rx = 280, ry = 160;
  const halfCircumference = Math.PI * r;
  const sectorWidth = halfCircumference * 2 / config.parts;
  const spacing = 8 * progress;
  const maxDisplay = Math.floor((canvas.width - rx - 20) / sectorWidth);

  for (let i = 0; i < Math.min(config.parts, maxDisplay); i++) {
    const isUp = i % 2 === 0;
    const x = rx + i * sectorWidth;
    ctx.fillStyle = isUp ? '#90caf9' : '#e3f2fd';
    ctx.strokeStyle = '#1565c0';
    ctx.beginPath();
    ctx.moveTo(x, ry + (isUp ? -spacing : spacing));
    ctx.lineTo(x + sectorWidth, ry + (isUp ? -spacing : spacing));
    ctx.lineTo(x + sectorWidth, ry + (isUp ? -spacing - r : spacing + r));
    ctx.lineTo(x, ry + (isUp ? -spacing - r : spacing + r));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = '#1565c0';
  ctx.fillText('近似长方形', rx + 20, ry + r + 25);
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = '#666';
  ctx.beginPath();
  ctx.moveTo(rx, ry - spacing - r / 2);
  ctx.lineTo(rx + Math.min(config.parts, maxDisplay) * sectorWidth, ry - spacing - r / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const area = Math.PI * config.r * config.r;
  const rectArea = progress > 0 ? area : null;
  document.getElementById('rectArea').textContent = rectArea ? rectArea.toFixed(2) : '?';
  document.getElementById('formula').textContent = progress > 0
    ? `长≈πr=${(Math.PI * config.r).toFixed(2)}, 宽=r=${config.r}, S≈πr²`
    : '?';
}

function prepareInteractiveSteps() {
  document.getElementById('steps').innerHTML = '<p style="color:#999">点击“展开”观察圆如何转化为近似长方形。</p>';
}

function prepareDemoSteps() {
  const steps = [
    `把一个圆平均分成 ${config.parts} 个小扇形。`,
    '把这些扇形交错拼接，上半部分弧朝上，下半部分弧朝下。',
    '份数越多，拼成的图形越接近长方形。',
    `长方形的长 ≈ 圆周长的一半 = πr = ${(Math.PI * config.r).toFixed(2)}，宽 = r = ${config.r}。`,
    `面积 ≈ πr × r = πr² = ${(Math.PI * config.r * config.r).toFixed(2)}。`
  ];
  createSteps(document.getElementById('steps'), steps);
}

function startDemo() { reset(); nextStep(); }
function nextStep() {
  if (stepIndex > 0) document.getElementById(`steps-step-${stepIndex - 1}`).classList.remove('active');
  if (stepIndex >= 5) { stepIndex = 0; return; }
  activateStep(document.getElementById('steps'), stepIndex);
  progress = stepIndex / 4;
  draw();
  if (stepIndex === 4) {
    showSuccess(document.getElementById('successMsg'), '🎉 推导完成！圆面积公式 S = πr²。');
  }
  stepIndex++;
}
