let config = {};
let mode = 'interactive';
let stepIndex = 0, demoSteps = [];

function initSimulator(params) {
  config = {
    a: params.a || 1, b: params.b || 2,
    op: params.op || '+',
    c: params.c || 1, d: params.d || 3,
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
  renderControls();
  drawBars(false);
  if (mode === 'demo') prepareDemoSteps();
  else prepareInteractiveSteps();
  document.getElementById('successMsg').style.display = 'none';
}

function computeResult() {
  const common = lcm(config.b, config.d);
  const n1 = config.a * (common / config.b);
  const n2 = config.c * (common / config.d);
  const resNum = config.op === '+' ? n1 + n2 : n1 - n2;
  const g = gcd(Math.abs(resNum), common);
  return { common, n1, n2, resNum, simpNum: resNum / g, simpDen: common / g };
}

function drawBars(showResult) {
  const result = computeResult();
  document.getElementById('bar1').innerHTML = barHTML(config.b, config.a, '#90caf9');
  document.getElementById('bar2').innerHTML = barHTML(config.d, config.c, '#a5d6a7');
  document.getElementById('label1').textContent = `${config.a}/${config.b}`;
  document.getElementById('label2').textContent = `${config.c}/${config.d}`;
  document.getElementById('opLabel').textContent = config.op;
  if (showResult) {
    document.getElementById('barResult').innerHTML = barHTML(result.common, result.resNum, '#ce93d8');
    document.getElementById('labelResult').textContent = `${result.simpNum}/${result.simpDen}`;
  } else {
    document.getElementById('barResult').innerHTML = '';
    document.getElementById('labelResult').textContent = '?';
  }
}

function barHTML(den, num, color) {
  let html = '';
  for (let i = 0; i < den; i++) {
    html += `<div class="fraction-piece" style="width:${100 / den}%;background:${i < num ? color : '#fff'}"></div>`;
  }
  return html;
}

function renderControls() {
  document.getElementById('controls').innerHTML = `
    <div class="input-group"><input id="fa" value="${config.a}" style="width:45px">/<input id="fb" value="${config.b}" style="width:45px"></div>
    <div class="input-group"><select id="fop"><option value="+" ${config.op === '+' ? 'selected' : ''}>+</option><option value="-" ${config.op === '-' ? 'selected' : ''}>−</option></select></div>
    <div class="input-group"><input id="fc" value="${config.c}" style="width:45px">/<input id="fd" value="${config.d}" style="width:45px"></div>
    <button class="btn btn-primary" onclick="applyConfig()">生成题目</button>
    <button class="btn btn-secondary" onclick="showAnswer()">显示答案</button>
    <button class="btn btn-danger" onclick="reset()">重置</button>
  `;
  ['fa','fb','fc','fd'].forEach(id => bindNumberInput(document.getElementById(id), { int: true, min: 1, max: 99 }));
  document.getElementById('demoControls').innerHTML = `
    <button class="btn btn-primary" onclick="startDemo()">开始演示</button>
    <button class="btn btn-secondary" onclick="nextStep()">下一步</button>
    <button class="btn btn-danger" onclick="reset()">重置</button>
  `;
}

function renderSidePanel() {
  document.getElementById('sidePanel').innerHTML = `
    <div class="stat-box"><div class="stat-title">算式</div><div class="stat-value" style="font-size:1.1rem" id="equation">${config.a}/${config.b} ${config.op} ${config.c}/${config.d}</div></div>
    <div class="stat-box"><div class="stat-title">你的答案</div><div class="stat-value" id="userAnswer">?</div></div>
    <div class="stat-box"><div class="stat-title">正确答案</div><div class="stat-value" id="correctAnswer">?</div></div>
    <div class="solution-steps"><h3>📋 解题思路</h3><div id="steps"></div></div>
  `;
}

function applyConfig() {
  config.a = parseInt(document.getElementById('fa').value) || 1;
  config.b = parseInt(document.getElementById('fb').value) || 2;
  config.op = document.getElementById('fop').value;
  config.c = parseInt(document.getElementById('fc').value) || 1;
  config.d = parseInt(document.getElementById('fd').value) || 3;
  renderSidePanel();
  reset();
}

function showAnswer() {
  drawBars(true);
  const r = computeResult();
  document.getElementById('userAnswer').textContent = `${r.simpNum}/${r.simpDen}`;
  document.getElementById('correctAnswer').textContent = `${r.simpNum}/${r.simpDen}`;
}

function prepareInteractiveSteps() {
  document.getElementById('steps').innerHTML = '<p style="color:#999">点击“显示答案”查看结果，注意分母不同时要先通分。</p>';
}

function prepareDemoSteps() {
  const r = computeResult();
  if (config.b === config.d) {
    demoSteps = [
      `算式：${config.a}/${config.b} ${config.op} ${config.c}/${config.d}`,
      '分母相同，直接把分子相' + (config.op === '+' ? '加' : '减') + '。',
      `${config.a} ${config.op} ${config.c} = ${r.resNum}，分母保持 ${config.b}。`,
      `结果：${r.simpNum}/${r.simpDen}`
    ];
  } else {
    demoSteps = [
      `算式：${config.a}/${config.b} ${config.op} ${config.c}/${config.d}`,
      `分母不同，先通分。最小公分母是 ${r.common}。`,
      `${config.a}/${config.b} = ${r.n1}/${r.common}，${config.c}/${config.d} = ${r.n2}/${r.common}。`,
      `分子相${config.op === '+' ? '加' : '减'}：${r.n1} ${config.op} ${r.n2} = ${r.resNum}。`,
      `结果约分：${r.resNum}/${r.common} = ${r.simpNum}/${r.simpDen}`
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
    drawBars(true);
    const r = computeResult();
    document.getElementById('userAnswer').textContent = `${r.simpNum}/${r.simpDen}`;
    document.getElementById('correctAnswer').textContent = `${r.simpNum}/${r.simpDen}`;
    showSuccess(document.getElementById('successMsg'), '🎉 演示完成！通分后图形才能直接相加。');
  }
  stepIndex++;
}
