/**
 * 小学数学仿真器公共核心库
 */

function createEl(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = text;
  return el;
}

function createSteps(container, steps) {
  container.innerHTML = '';
  steps.forEach((text, i) => {
    const div = createEl('div', 'step');
    div.id = `${container.id}-step-${i}`;
    div.innerHTML = `<span class="step-number">${i + 1}</span>${text}`;
    container.appendChild(div);
  });
}

function activateStep(container, index) {
  const steps = container.querySelectorAll('.step');
  steps.forEach((s, i) => {
    if (i === index) s.classList.add('active');
    else s.classList.remove('active');
  });
}

function getUrlParams() {
  const params = new URLSearchParams(location.search);
  const result = {};
  for (const [key, value] of params) {
    if (value === 'true') result[key] = true;
    else if (value === 'false') result[key] = false;
    else if (!isNaN(value) && value.trim() !== '') result[key] = Number(value);
    else result[key] = value;
  }
  return result;
}

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  return b ? gcd(b, a % b) : a;
}

function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

function showSuccess(container, message) {
  container.textContent = message;
  container.style.display = 'block';
}

function hideSuccess(container) {
  container.style.display = 'none';
}

/**
 * 创建模式切换按钮
 */
function createModeTabs(container, modes, onChange) {
  container.innerHTML = '';
  modes.forEach((mode, i) => {
    const btn = createEl('button', 'mode-btn' + (i === 0 ? ' active' : ''), mode.label);
    btn.onclick = () => {
      container.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(mode.key);
    };
    container.appendChild(btn);
  });
}

/**
 * 绑定数字输入框，支持 min/max
 */
function bindNumberInput(input, options = {}) {
  input.addEventListener('change', () => {
    let v = parseFloat(input.value);
    if (isNaN(v)) v = options.default || 0;
    if (options.min !== undefined) v = Math.max(v, options.min);
    if (options.max !== undefined) v = Math.min(v, options.max);
    if (options.int) v = Math.round(v);
    input.value = v;
  });
}

/**
 * 简易动画函数
 */
function animate(duration, onFrame, onComplete) {
  let start = null;
  function step(t) {
    if (!start) start = t;
    const p = Math.min((t - start) / duration, 1);
    onFrame(p);
    if (p < 1) requestAnimationFrame(step);
    else if (onComplete) onComplete();
  }
  requestAnimationFrame(step);
}

function sendAnswerEvent(detail) {
  const data = { event: 'answer', ...detail };
  if (window.uni && window.uni.postMessage) {
    window.uni.postMessage({ data });
  } else if (window.parent && window.parent.postMessage) {
    window.parent.postMessage(data, '*');
  }
}
