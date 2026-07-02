let config = {};
let mode = 'interactive';
let plantedPositions = [];
let stepIndex = 0, demoSteps = [];

const typeNames = { both: '两端都种', one: '一端种', none: '两端不种', circle: '环形' };

function initSimulator(params) {
  config = {
    length: params.length || 20,
    interval: params.interval || 5,
    type: params.type || 'both',
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
  document.getElementById('treeControls').classList.toggle('hidden', mode === 'demo');
  document.getElementById('tip').textContent = mode === 'demo'
    ? '点击“开始演示”，理解段数和棵数的关系。'
    : '点击“种一棵”或“移除一棵”调整道路两旁的树，使棵数符合题目要求。';
  reset();
}

function reset() {
  plantedPositions = []; stepIndex = 0;
  renderRoad();
  renderControls();
  if (mode === 'demo') prepareDemoSteps();
  else prepareInteractiveSteps();
  document.getElementById('successMsg').style.display = 'none';
}

function getTarget() {
  const segments = Math.floor(config.length / config.interval);
  if (config.type === 'both') return segments + 1;
  if (config.type === 'none') return segments - 1;
  return segments;
}

function renderControls() {
  document.getElementById('controls').innerHTML = `
    <div class="input-group"><label>路长</label><input id="lenInput" value="${config.length}"></div>
    <div class="input-group"><label>间隔</label><input id="intInput" value="${config.interval}"></div>
    <div class="input-group"><label>方式</label>
      <select id="typeInput">
        <option value="both" ${config.type === 'both' ? 'selected' : ''}>两端都种</option>
        <option value="one" ${config.type === 'one' ? 'selected' : ''}>一端种</option>
        <option value="none" ${config.type === 'none' ? 'selected' : ''}>两端不种</option>
        <option value="circle" ${config.type === 'circle' ? 'selected' : ''}>环形</option>
      </select>
    </div>
    <button class="btn btn-primary" onclick="applyConfig()">生成题目</button>
    <button class="btn btn-danger" onclick="reset()">清空</button>
  `;
  bindNumberInput(document.getElementById('lenInput'), { int: true, min: 1, max: 1000 });
  bindNumberInput(document.getElementById('intInput'), { int: true, min: 1, max: 100 });

  document.getElementById('treeControls').innerHTML = `
    <button class="btn btn-primary btn-lg" onclick="addTree()">🌳 种一棵</button>
    <button class="btn btn-danger btn-lg" onclick="removeTree()">🗑️ 移除一棵</button>
  `;

  document.getElementById('demoControls').innerHTML = `
    <button class="btn btn-primary" onclick="startDemo()">开始演示</button>
    <button class="btn btn-secondary" onclick="nextStep()">下一步</button>
    <button class="btn btn-danger" onclick="reset()">重置</button>
  `;
}

function renderSidePanel() {
  const target = getTarget();
  const segments = Math.floor(config.length / config.interval);
  document.getElementById('sidePanel').innerHTML = `
    <div class="stat-box"><div class="stat-title">种植方式</div><div class="stat-value" style="font-size:1rem">${typeNames[config.type]}</div></div>
    <div class="stat-box"><div class="stat-title">目标棵数</div><div class="stat-value" id="targetTrees">${target}</div></div>
    <div class="stat-box"><div class="stat-title">当前棵数</div><div class="stat-value" id="currentTrees">0</div></div>
    <div class="stat-box"><div class="stat-title">段数</div><div class="stat-value" id="segments">${segments}</div></div>
    <div class="solution-steps"><h3>📋 解题思路</h3><div id="steps"></div></div>
  `;
}

function applyConfig() {
  config.length = parseInt(document.getElementById('lenInput').value) || 20;
  config.interval = parseInt(document.getElementById('intInput').value) || 5;
  config.type = document.getElementById('typeInput').value;
  renderSidePanel();
  reset();
}

function renderRoad() {
  const road = document.getElementById('road');
  road.innerHTML = '<div class="road-line"></div>';
  const width = road.clientWidth;
  plantedPositions.forEach(pos => {
    const tree = createEl('div', 'tree'); tree.textContent = '🌳';
    tree.style.left = (pos * width) + 'px';
    road.appendChild(tree);
  });
  document.getElementById('currentTrees').textContent = plantedPositions.length;
}

function getValidPositions() {
  const segments = Math.floor(config.length / config.interval);
  const validPositions = [];
  if (config.type === 'both') for (let i = 0; i <= segments; i++) validPositions.push(i / segments);
  else if (config.type === 'one') for (let i = 0; i < segments; i++) validPositions.push(i / segments);
  else if (config.type === 'none') for (let i = 1; i < segments; i++) validPositions.push(i / segments);
  else for (let i = 0; i < segments; i++) validPositions.push(i / segments);
  return validPositions;
}

function addTree() {
  if (mode !== 'interactive') return;
  const validPositions = getValidPositions();
  const next = validPositions.find(p => !plantedPositions.includes(p));
  if (next !== undefined) plantedPositions.push(next);
  renderRoad(); checkSuccess();
}

function removeTree() {
  if (mode !== 'interactive' || plantedPositions.length === 0) return;
  plantedPositions.pop();
  renderRoad(); checkSuccess();
}

function checkSuccess() {
  const target = getTarget();
  if (plantedPositions.length === target) {
    showSuccess(document.getElementById('successMsg'), `🎉 正确！${typeNames[config.type]}时，棵数 = ${config.type === 'both' ? '段数+1' : config.type === 'none' ? '段数-1' : '段数'}。`);
    sendAnswerEvent({ type: 'tree_planting', correct: true, score: 100, params: config });
  } else {
    document.getElementById('successMsg').style.display = 'none';
  }
}

function prepareInteractiveSteps() {
  document.getElementById('steps').innerHTML = '<p style="color:#999">点击道路种树，注意段数和棵数的关系。</p>';
}

function prepareDemoSteps() {
  const segments = Math.floor(config.length / config.interval);
  const target = getTarget();
  let formula = '';
  if (config.type === 'both') formula = '棵数 = 段数 + 1';
  else if (config.type === 'one') formula = '棵数 = 段数';
  else if (config.type === 'none') formula = '棵数 = 段数 - 1';
  else formula = '棵数 = 段数';
  demoSteps = [
    `题目：${config.length} 米的路，每隔 ${config.interval} 米种一棵，${typeNames[config.type]}。`,
    `先算段数：${config.length} ÷ ${config.interval} = ${segments} 段。`,
    `${typeNames[config.type]}时，${formula}。`,
    `所以棵数 = ${target}。`
  ];
  createSteps(document.getElementById('steps'), demoSteps);
}

function startDemo() { reset(); nextStep(); }
function nextStep() {
  if (stepIndex > 0) document.getElementById(`steps-step-${stepIndex - 1}`).classList.remove('active');
  if (stepIndex >= demoSteps.length) { stepIndex = 0; return; }
  activateStep(document.getElementById('steps'), stepIndex);
  if (stepIndex === demoSteps.length - 1) {
    const target = getTarget();
    const segments = Math.floor(config.length / config.interval);
    const road = document.getElementById('road');
    plantedPositions = [];
    for (let i = 0; i < target; i++) {
      let pos;
      if (config.type === 'both') pos = i / (target - 1);
      else if (config.type === 'none') pos = (i + 1) / (segments + 1);
      else pos = i / segments;
      plantedPositions.push(pos);
      const tree = createEl('div', 'tree'); tree.textContent = '🌳';
      tree.style.left = (pos * road.clientWidth) + 'px';
      road.appendChild(tree);
    }
    document.getElementById('currentTrees').textContent = target;
    showSuccess(document.getElementById('successMsg'), `🎉 演示完成！共 ${target} 棵。`);
    sendAnswerEvent({ type: 'tree_planting', correct: true, score: 100, params: config });
  }
  stepIndex++;
}
