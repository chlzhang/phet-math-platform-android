let config = {};
let mode = 'interactive';
let progress = 0, animating = false;
let stepIndex = 0;

const shapeNames = { parallelogram: '平行四边形', triangle: '三角形', trapezoid: '梯形' };

function initSimulator(params) {
  config = {
    shape: params.shape || 'parallelogram',
    a: params.a || 6,
    b: params.b || 0,
    h: params.h || 4,
    mode: params.mode || 'interactive'
  };
  if (!config.b && config.shape === 'trapezoid') config.b = config.a + 2;
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
    <div class="input-group"><label>图形</label>
      <select id="shapeInput">
        <option value="parallelogram" ${config.shape === 'parallelogram' ? 'selected' : ''}>平行四边形</option>
        <option value="triangle" ${config.shape === 'triangle' ? 'selected' : ''}>三角形</option>
        <option value="trapezoid" ${config.shape === 'trapezoid' ? 'selected' : ''}>梯形</option>
      </select>
    </div>
    <div class="input-group"><label>底/上底</label><input id="aInput" value="${config.a}"></div>
    <div class="input-group"><label>下底</label><input id="bInput" value="${config.b}"></div>
    <div class="input-group"><label>高</label><input id="hInput" value="${config.h}"></div>
    <button class="btn btn-primary" onclick="applyConfig()">生成</button>
    <button class="btn btn-secondary" onclick="animateTransform(() => sendAnswerEvent({ type: 'polygon', correct: true, score: 100, params: config }))">变形</button>
    <button class="btn btn-danger" onclick="reset()">重置</button>
  `;
  bindNumberInput(document.getElementById('aInput'), { int: true, min: 1, max: 50 });
  bindNumberInput(document.getElementById('bInput'), { int: true, min: 0, max: 50 });
  bindNumberInput(document.getElementById('hInput'), { int: true, min: 1, max: 50 });
  document.getElementById('demoControls').innerHTML = `
    <button class="btn btn-primary" onclick="startDemo()">开始演示</button>
    <button class="btn btn-secondary" onclick="nextStep()">下一步</button>
    <button class="btn btn-danger" onclick="reset()">重置</button>
  `;
}

function renderSidePanel() {
  document.getElementById('sidePanel').innerHTML = `
    <div class="stat-box"><div class="stat-title">图形</div><div class="stat-value" style="font-size:1rem">${shapeNames[config.shape]}</div></div>
    <div class="stat-box"><div class="stat-title">原图形面积</div><div class="stat-value" id="origArea">?</div></div>
    <div class="stat-box"><div class="stat-title">转化后面积</div><div class="stat-value" id="newArea">?</div></div>
    <div class="stat-box"><div class="stat-title">公式</div><div class="stat-value" style="font-size:0.9rem" id="formula">?</div></div>
    <div class="solution-steps"><h3>📋 推导过程</h3><div id="steps"></div></div>
  `;
}

function applyConfig() {
  config.shape = document.getElementById('shapeInput').value;
  config.a = parseInt(document.getElementById('aInput').value) || 6;
  config.b = parseInt(document.getElementById('bInput').value) || 0;
  config.h = parseInt(document.getElementById('hInput').value) || 4;
  if (config.shape === 'trapezoid' && !config.b) config.b = config.a + 2;
  renderSidePanel();
  reset();
}

function animateTransform(onComplete) {
  if (animating) return;
  animating = true;
  animate(1500, p => { progress = p; draw(); }, () => {
    animating = false;
    if (onComplete) onComplete();
  });
}

function draw() {
  const canvas = document.getElementById('pgCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const scale = 35, ox = 80, oy = 240;
  ctx.lineWidth = 2; ctx.strokeStyle = '#333';
  ctx.font = '14px Microsoft YaHei'; ctx.fillStyle = '#333';

  let area = 0, newArea = 0, formula = '';

  if (config.shape === 'parallelogram') {
    const skew = 60 * (1 - progress);
    ctx.fillStyle = '#90caf9';
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + config.a * scale, oy);
    ctx.lineTo(ox + config.a * scale + skew, oy - config.h * scale);
    ctx.lineTo(ox + skew, oy - config.h * scale);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillText('底=' + config.a, ox + config.a * scale / 2 - 20, oy + 20);
    ctx.fillText('高=' + config.h, ox + config.a * scale + skew + 10, oy - config.h * scale / 2);
    area = config.a * config.h;
    newArea = area;
    formula = 'S = 底 × 高';
  } else if (config.shape === 'triangle') {
    const offX = config.a * scale * progress;
    ctx.fillStyle = '#a5d6a7';
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + config.a * scale, oy);
    ctx.lineTo(ox + config.a * scale / 2 + offX, oy - config.h * scale);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (progress > 0) {
      ctx.fillStyle = '#c8e6c9';
      ctx.beginPath();
      ctx.moveTo(ox + config.a * scale, oy);
      ctx.lineTo(ox + config.a * scale + offX, oy);
      ctx.lineTo(ox + config.a * scale / 2 + offX, oy - config.h * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#333';
    ctx.fillText('底=' + config.a, ox + config.a * scale / 2 - 15, oy + 20);
    area = config.a * config.h / 2;
    newArea = progress > 0 ? config.a * config.h : null;
    formula = 'S = 底 × 高 ÷ 2';
  } else {
    const bottomBase = config.b || config.a + 2;
    const shift = (bottomBase - config.a) * scale / 2 * progress;
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + bottomBase * scale, oy);
    ctx.lineTo(ox + bottomBase * scale - shift, oy - config.h * scale);
    ctx.lineTo(ox + shift, oy - config.h * scale);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (progress > 0) {
      ctx.fillStyle = '#ffe0b2';
      ctx.beginPath();
      ctx.moveTo(ox + bottomBase * scale, oy);
      ctx.lineTo(ox + bottomBase * scale - shift, oy - config.h * scale);
      ctx.lineTo(ox + bottomBase * scale, oy - config.h * scale);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#333';
    ctx.fillText('上底=' + config.a, ox + config.a * scale / 2 - 20, oy - config.h * scale - 10);
    ctx.fillText('下底=' + bottomBase, ox + bottomBase * scale / 2 - 20, oy + 20);
    area = (config.a + bottomBase) * config.h / 2;
    newArea = progress > 0 ? (config.a + bottomBase) * config.h : null;
    formula = 'S = (上底+下底) × 高 ÷ 2';
  }

  document.getElementById('origArea').textContent = area;
  document.getElementById('newArea').textContent = newArea ? (newArea + ' ÷ 2 = ' + area) : '?';
  document.getElementById('formula').textContent = formula;
}

function prepareInteractiveSteps() {
  document.getElementById('steps').innerHTML = '<p style="color:#999">点击“变形”观察图形转化过程。</p>';
}

function prepareDemoSteps() {
  const bottomBase = config.b || config.a + 2;
  let steps = [];
  if (config.shape === 'parallelogram') {
    steps = [
      '平行四边形可以通过割补变成一个长方形。',
      `长方形的长 = 平行四边形的底 = ${config.a}。`,
      `长方形的宽 = 平行四边形的高 = ${config.h}。`,
      `面积 = ${config.a} × ${config.h} = ${config.a * config.h}。`
    ];
  } else if (config.shape === 'triangle') {
    steps = [
      '两个完全一样的三角形可以拼成一个平行四边形。',
      `平行四边形的底 = ${config.a}，高 = ${config.h}。`,
      `平行四边形面积 = ${config.a * config.h}。`,
      `一个三角形面积 = ${config.a * config.h} ÷ 2 = ${config.a * config.h / 2}。`
    ];
  } else {
    steps = [
      '两个完全一样的梯形可以拼成一个平行四边形。',
      `平行四边形的底 = 上底 + 下底 = ${config.a} + ${bottomBase} = ${config.a + bottomBase}。`,
      `平行四边形的高 = ${config.h}，面积 = ${(config.a + bottomBase) * config.h}。`,
      `一个梯形面积 = ${(config.a + bottomBase) * config.h} ÷ 2 = ${(config.a + bottomBase) * config.h / 2}。`
    ];
  }
  createSteps(document.getElementById('steps'), steps);
}

function startDemo() { reset(); nextStep(); }
function nextStep() {
  if (stepIndex > 0) document.getElementById(`steps-step-${stepIndex - 1}`).classList.remove('active');
  if (stepIndex >= 4) { stepIndex = 0; return; }
  activateStep(document.getElementById('steps'), stepIndex);
  progress = (stepIndex + 1) / 4;
  draw();
  if (stepIndex === 3) {
    showSuccess(document.getElementById('successMsg'), '🎉 推导完成！公式来源清楚了吗？');
    sendAnswerEvent({ type: 'polygon', correct: true, score: 100, params: config });
  }
  stepIndex++;
}
