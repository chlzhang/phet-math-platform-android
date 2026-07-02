let config = {};
let mode = 'interactive';
let stepIndex = 0, demoSteps = [];

const typeNames = { meet: '相遇问题', chase: '追及问题' };

function initSimulator(params) {
  config = {
    type: params.type || 'meet',
    distance: params.distance || 300,
    v1: params.v1 || 60,
    v2: params.v2 || 40,
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
  stepIndex = 0;
  const track = document.getElementById('track');
  const w = track.clientWidth - 40;
  document.getElementById('a').style.transition = 'none';
  document.getElementById('b').style.transition = 'none';
  document.getElementById('a').style.left = '10px';
  document.getElementById('b').style.left = config.type === 'meet' ? (w + 10) + 'px' : '10px';
  document.getElementById('meetPoint').style.opacity = '0';
  renderControls();
  updateStats(0, 0);
  if (mode === 'demo') prepareDemoSteps();
  else prepareInteractiveSteps();
  document.getElementById('successMsg').style.display = 'none';
}

function computeTime() {
  if (config.type === 'meet') return config.distance / (config.v1 + config.v2);
  if (config.v1 <= config.v2) return Infinity;
  return config.distance / (config.v1 - config.v2);
}

function renderControls() {
  document.getElementById('controls').innerHTML = `
    <div class="input-group"><label>类型</label>
      <select id="typeInput">
        <option value="meet" ${config.type === 'meet' ? 'selected' : ''}>相遇</option>
        <option value="chase" ${config.type === 'chase' ? 'selected' : ''}>追及</option>
      </select>
    </div>
    <div class="input-group"><label>路程</label><input id="distInput" value="${config.distance}"></div>
    <div class="input-group"><label>甲速</label><input id="v1Input" value="${config.v1}"></div>
    <div class="input-group"><label>乙速</label><input id="v2Input" value="${config.v2}"></div>
    <button class="btn btn-primary" onclick="applyConfig()">生成题目</button>
    <button class="btn btn-secondary" onclick="playAnimation(() => sendAnswerEvent({ type: 'travel', correct: true, score: 100, params: config }))">播放动画</button>
    <button class="btn btn-danger" onclick="reset()">重置</button>
  `;
  bindNumberInput(document.getElementById('distInput'), { int: true, min: 10, max: 10000 });
  bindNumberInput(document.getElementById('v1Input'), { int: true, min: 1, max: 1000 });
  bindNumberInput(document.getElementById('v2Input'), { int: true, min: 1, max: 1000 });
  document.getElementById('demoControls').innerHTML = `
    <button class="btn btn-primary" onclick="startDemo()">开始演示</button>
    <button class="btn btn-secondary" onclick="nextStep()">下一步</button>
    <button class="btn btn-danger" onclick="reset()">重置</button>
  `;
}

function renderSidePanel() {
  document.getElementById('sidePanel').innerHTML = `
    <div class="stat-box"><div class="stat-title">问题类型</div><div class="stat-value" style="font-size:1rem">${typeNames[config.type]}</div></div>
    <div class="stat-box"><div class="stat-title">相遇/追及时间</div><div class="stat-value" id="timeVal">?</div></div>
    <div class="stat-box"><div class="stat-title">甲走的路程</div><div class="stat-value" id="distA">0</div></div>
    <div class="stat-box"><div class="stat-title">乙走的路程</div><div class="stat-value" id="distB">0</div></div>
    <div class="solution-steps"><h3>📋 解题思路</h3><div id="steps"></div></div>
  `;
}

function applyConfig() {
  config.type = document.getElementById('typeInput').value;
  config.distance = parseInt(document.getElementById('distInput').value) || 300;
  config.v1 = parseInt(document.getElementById('v1Input').value) || 60;
  config.v2 = parseInt(document.getElementById('v2Input').value) || 40;
  if (config.type === 'chase' && config.v1 <= config.v2) {
    alert('追及问题中，甲的速度必须大于乙的速度');
    return;
  }
  renderSidePanel();
  reset();
}

function updateStats(time, distA, distB) {
  document.getElementById('timeVal').textContent = time ? time.toFixed(2) + ' 分钟' : '?';
  document.getElementById('distA').textContent = distA ? distA.toFixed(1) + ' 米' : '0';
  document.getElementById('distB').textContent = distB ? distB.toFixed(1) + ' 米' : '0';
}

function playAnimation(onComplete) {
  const track = document.getElementById('track');
  const w = track.clientWidth - 40;
  const time = computeTime();
  if (!isFinite(time)) { alert('速度设置不合理，无法追上'); return; }
  const distA = config.v1 * time;
  const distB = config.v2 * time;
  const meetLeft = 10 + (distA / config.distance) * w;
  document.getElementById('a').style.transition = `left ${time}s linear`;
  document.getElementById('b').style.transition = `left ${time}s linear`;
  document.getElementById('a').style.left = meetLeft + 'px';
  document.getElementById('b').style.left = config.type === 'meet' ? meetLeft + 'px' : (10 + (distB / config.distance) * w) + 'px';
  document.getElementById('meetPoint').style.left = meetLeft + 'px';
  document.getElementById('meetPoint').style.opacity = '1';
  setTimeout(() => {
    updateStats(time, distA, distB);
    if (onComplete) onComplete();
  }, time * 1000);
}

function prepareInteractiveSteps() {
  document.getElementById('steps').innerHTML = '<p style="color:#999">调整参数后点击“播放动画”，观察相遇或追上的时刻。</p>';
}

function prepareDemoSteps() {
  const time = computeTime();
  if (config.type === 'meet') {
    demoSteps = [
      `题目：两人相距 ${config.distance} 米，甲速 ${config.v1} 米/分，乙速 ${config.v2} 米/分，相向而行。`,
      '相遇时，两人走的路程之和等于总路程。',
      `速度和 = ${config.v1} + ${config.v2} = ${config.v1 + config.v2} 米/分。`,
      `相遇时间 = ${config.distance} ÷ ${config.v1 + config.v2} = ${time.toFixed(2)} 分钟。`
    ];
  } else {
    demoSteps = [
      `题目：两人相距 ${config.distance} 米，甲速 ${config.v1} 米/分，乙速 ${config.v2} 米/分，同向追及。`,
      '追上时，甲比乙多走了初始距离。',
      `速度差 = ${config.v1} - ${config.v2} = ${config.v1 - config.v2} 米/分。`,
      `追及时间 = ${config.distance} ÷ ${config.v1 - config.v2} = ${time.toFixed(2)} 分钟。`
    ];
  }
  createSteps(document.getElementById('steps'), demoSteps);
}

function startDemo() { reset(); nextStep(); }
function nextStep() {
  if (stepIndex > 0) document.getElementById(`steps-step-${stepIndex - 1}`).classList.remove('active');
  if (stepIndex >= demoSteps.length) { stepIndex = 0; return; }
  activateStep(document.getElementById('steps'), stepIndex);
  if (stepIndex === demoSteps.length - 1) {
    playAnimation(() => sendAnswerEvent({ type: 'travel', correct: true, score: 100, params: config }));
    showSuccess(document.getElementById('successMsg'), '🎉 动画开始！观察两人何时相遇/追上。');
  }
  stepIndex++;
}
