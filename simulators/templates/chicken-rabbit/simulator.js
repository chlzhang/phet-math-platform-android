let config = {};
let mode = 'interactive';
let method = 'assume_chicken';
let chickens = 0, rabbits = 0;
let stepIndex = 0, demoSteps = [];

function initSimulator(params) {
  config = {
    heads: params.heads || 8,
    legs: params.legs || 22,
    mode: params.mode || 'interactive'
  };
  
  document.getElementById('successMsg').style.display = 'none';
  renderModeTabs();
  renderSidePanel();
  setMode(config.mode);
}

function renderModeTabs() {
  const container = document.getElementById('modeTabs');
  createModeTabs(container, [
    { key: 'interactive', label: '🎮 动手操作' },
    { key: 'demo', label: '▶️ 动画演示' }
  ], setMode);
}

function setMode(newMode) {
  mode = newMode;
  document.getElementById('methodSelector').classList.toggle('hidden', mode !== 'demo');
  document.getElementById('demoControls').classList.toggle('hidden', mode !== 'demo');
  document.getElementById('palette').classList.toggle('hidden', mode === 'demo');
  document.getElementById('tip').textContent = mode === 'demo'
    ? '点击“开始演示”，系统会一步步讲解鸡兔同笼的解法。'
    : '点击 + / − 按钮调整小鸡和小兔数量，让当前头数和腿数与题目一致。';
  reset();
}

function reset() {
  chickens = 0; rabbits = 0; stepIndex = 0;
  renderCage();
  renderControls();
  if (mode === 'demo') prepareDemoSteps();
  else prepareInteractiveSteps();
  document.getElementById('successMsg').style.display = 'none';
}

function renderControls() {
  const controls = document.getElementById('controls');
  controls.innerHTML = `
    <div class="input-group"><label>总头数</label><input id="headsInput" value="${config.heads}"></div>
    <div class="input-group"><label>总腿数</label><input id="legsInput" value="${config.legs}"></div>
    <button class="btn btn-primary" onclick="applyConfig()">生成题目</button>
    <button class="btn btn-danger" onclick="reset()">清空</button>
  `;
  bindNumberInput(document.getElementById('headsInput'), { int: true, min: 2, max: 50 });
  bindNumberInput(document.getElementById('legsInput'), { int: true, min: 4, max: 200 });

  const palette = document.getElementById('palette');
  palette.innerHTML = `
    <div class="animal-control">
      <div class="animal-emoji">🐔</div><div class="animal-label">小鸡</div>
      <div class="animal-buttons">
        <button class="btn btn-primary btn-lg" onclick="addAnimal('chicken')">+</button>
        <button class="btn btn-danger btn-lg" onclick="removeAnimal('chicken')">−</button>
      </div>
    </div>
    <div class="animal-control">
      <div class="animal-emoji">🐰</div><div class="animal-label">小兔</div>
      <div class="animal-buttons">
        <button class="btn btn-primary btn-lg" onclick="addAnimal('rabbit')">+</button>
        <button class="btn btn-danger btn-lg" onclick="removeAnimal('rabbit')">−</button>
      </div>
    </div>
  `;

  const methodSelector = document.getElementById('methodSelector');
  methodSelector.innerHTML = `
    <button class="btn btn-blue ${method === 'assume_chicken' ? '' : 'btn-secondary'}" onclick="setMethod('assume_chicken')">假设全是鸡</button>
    <button class="btn btn-blue ${method === 'assume_rabbit' ? '' : 'btn-secondary'}" onclick="setMethod('assume_rabbit')">假设全是兔</button>
    <button class="btn btn-blue ${method === 'list' ? '' : 'btn-secondary'}" onclick="setMethod('list')">列表尝试</button>
  `;

  const demoControls = document.getElementById('demoControls');
  demoControls.innerHTML = `
    <button class="btn btn-primary" onclick="startDemo()">开始演示</button>
    <button class="btn btn-secondary" onclick="nextStep()">下一步</button>
    <button class="btn btn-danger" onclick="reset()">重置</button>
  `;
}

function renderSidePanel() {
  const panel = document.getElementById('sidePanel');
  panel.innerHTML = `
    <div class="stat-box"><div class="stat-title">目标头数</div><div class="stat-value" id="targetHeads">${config.heads}</div></div>
    <div class="stat-box"><div class="stat-title">目标腿数</div><div class="stat-value" id="targetLegs">${config.legs}</div></div>
    <div class="stat-box"><div class="stat-title">当前头数</div><div class="stat-value" id="currentHeads">0</div></div>
    <div class="stat-box"><div class="stat-title">当前腿数</div><div class="stat-value" id="currentLegs">0</div></div>
    <div class="stat-box"><div class="stat-title">小鸡</div><div class="stat-value" id="chickenCount">0</div></div>
    <div class="stat-box"><div class="stat-title">小兔</div><div class="stat-value" id="rabbitCount">0</div></div>
    <div class="solution-steps"><h3>📋 解题思路</h3><div id="steps"></div></div>
  `;
}

function applyConfig() {
  config.heads = parseInt(document.getElementById('headsInput').value) || 8;
  config.legs = parseInt(document.getElementById('legsInput').value) || 22;
  document.getElementById('targetHeads').textContent = config.heads;
  document.getElementById('targetLegs').textContent = config.legs;
  reset();
}

function addAnimal(type) {
  if (type === 'chicken') chickens++; else rabbits++;
  renderCage(); checkSuccess();
}
function removeAnimal(type) {
  if (type === 'chicken' && chickens > 0) chickens--;
  if (type === 'rabbit' && rabbits > 0) rabbits--;
  renderCage(); checkSuccess();
}

function renderCage() {
  const grid = document.getElementById('animalGrid'); grid.innerHTML = '';
  for (let i = 0; i < chickens; i++) grid.appendChild(createAnimal('chicken'));
  for (let i = 0; i < rabbits; i++) grid.appendChild(createAnimal('rabbit'));
  document.getElementById('currentHeads').textContent = chickens + rabbits;
  document.getElementById('currentLegs').textContent = chickens * 2 + rabbits * 4;
  document.getElementById('chickenCount').textContent = chickens;
  document.getElementById('rabbitCount').textContent = rabbits;
}

function createAnimal(type) {
  const div = createEl('div', 'animal');
  div.innerHTML = `<span>${type === 'chicken' ? '🐔' : '🐰'}</span><span class="animal-name">${type === 'chicken' ? '小鸡' : '小兔'}</span><span class="leg-badge">${type === 'chicken' ? 2 : 4}腿</span>`;
  return div;
}

function checkSuccess() {
  const heads = chickens + rabbits, legs = chickens * 2 + rabbits * 4;
  if (heads === config.heads && legs === config.legs) {
    showSuccess(document.getElementById('successMsg'), `🎉 答对了！${chickens} 只小鸡，${rabbits} 只小兔。`);
    sendAnswerEvent({ type: 'chicken_rabbit', correct: true, score: 100, params: config });
  } else {
    document.getElementById('successMsg').style.display = 'none';
  }
}

function setMethod(m) { method = m; renderControls(); reset(); }

function prepareInteractiveSteps() {
  const steps = document.getElementById('steps');
  steps.innerHTML = `<p style="color:#999">动手摆放动物，观察头数和腿数的变化。</p>`;
}

function prepareDemoSteps() {
  const rabbits = (config.legs - config.heads * 2) / 2;
  const chickens = config.heads - rabbits;
  demoSteps = [];
  if (method === 'assume_chicken') {
    demoSteps = [
      `题目：笼子里共有 ${config.heads} 个头，${config.legs} 条腿。`,
      `假设全是小鸡，腿数应为：${config.heads} × 2 = ${config.heads * 2} 条。`,
      `实际有 ${config.legs} 条腿，少了 ${config.legs - config.heads * 2} 条。`,
      `每把一只小鸡换成小兔，增加 2 条腿。`,
      `需要换：${config.legs - config.heads * 2} ÷ 2 = ${rabbits} 只小兔。`,
      `答案：${chickens} 只小鸡，${rabbits} 只小兔。`
    ];
  } else if (method === 'assume_rabbit') {
    demoSteps = [
      `题目：笼子里共有 ${config.heads} 个头，${config.legs} 条腿。`,
      `假设全是小兔，腿数应为：${config.heads} × 4 = ${config.heads * 4} 条。`,
      `实际有 ${config.legs} 条腿，多了 ${config.heads * 4 - config.legs} 条。`,
      `每把一只小兔换成小鸡，减少 2 条腿。`,
      `需要换：${config.heads * 4 - config.legs} ÷ 2 = ${chickens} 只小鸡。`,
      `答案：${chickens} 只小鸡，${rabbits} 只小兔。`
    ];
  } else {
    let html = '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:6px">';
    for (let c = 0; c <= config.heads; c++) {
      const r = config.heads - c, legs = c * 2 + r * 4;
      const ok = legs === config.legs;
      html += `<span style="padding:4px 8px;border-radius:5px;background:${ok ? '#c8e6c9' : '#f5f5f5'};font-size:0.8rem">鸡${c} 兔${r} = ${legs}腿</span>`;
    }
    html += '</div>';
    demoSteps = [
      `题目：笼子里共有 ${config.heads} 个头，${config.legs} 条腿。`,
      '用列表法从 0 只小鸡开始逐一尝试：',
      html,
      `答案：${chickens} 只小鸡，${rabbits} 只小兔。`
    ];
  }
  createSteps(document.getElementById('steps'), demoSteps);
}

function startDemo() { reset(); nextStep(); }
function nextStep() {
  if (stepIndex > 0) document.getElementById(`steps-step-${stepIndex - 1}`).classList.remove('active');
  if (stepIndex >= demoSteps.length) { stepIndex = 0; return; }
  activateStep(document.getElementById('steps'), stepIndex);
  const rabbitsAns = (config.legs - config.heads * 2) / 2;
  const chickensAns = config.heads - rabbitsAns;
  if (method === 'assume_chicken') {
    if (stepIndex === 1) { chickens = config.heads; rabbits = 0; }
    else if (stepIndex >= 4) { chickens = chickensAns; rabbits = rabbitsAns; }
  } else if (method === 'assume_rabbit') {
    if (stepIndex === 1) { chickens = 0; rabbits = config.heads; }
    else if (stepIndex >= 4) { chickens = chickensAns; rabbits = rabbitsAns; }
  } else {
    if (stepIndex === 3) { chickens = chickensAns; rabbits = rabbitsAns; }
  }
  renderCage();
  if (stepIndex === demoSteps.length - 1) {
    showSuccess(document.getElementById('successMsg'), `🎉 演示完成！${chickensAns} 只小鸡，${rabbitsAns} 只小兔。`);
    sendAnswerEvent({ type: 'chicken_rabbit', correct: true, score: 100, params: config });
  }
  stepIndex++;
}
