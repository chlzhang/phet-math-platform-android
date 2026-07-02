/**
 * API 封装
 * H5 环境下自动使用当前页面 origin，实现本地开发、Docker 本地部署、线上域名部署无需修改代码。
 * 小程序 / App 环境请把下方 fallback 域名改成你的生产域名。
 */

function getApiBase() {
  // H5（浏览器）：用当前页面 origin，前后端同域部署，避免跨域
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}/api/v1`
  }
  // 小程序 / App：填写实际生产域名
  return 'https://your-domain.com/api/v1'
}

const API_BASE = getApiBase()

/**
 * 通用请求封装
 * @param {string} method HTTP 方法
 * @param {string} url 相对地址（如 /templates）
 * @param {object} data 请求数据
 * @returns {Promise<object>}
 */
export function request(method, url, data = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${API_BASE}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json'
      },
      timeout: 20000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(`请求失败：${res.statusCode}`))
        }
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

/**
 * 获取模板列表
 */
export function fetchTemplates() {
  return request('GET', '/templates')
}

/**
 * 解析题目
 * @param {string} text 题目文本
 * @param {number} grade 年级
 */
export function parseProblem(text, grade) {
  return request('POST', '/problems/parse', { text, grade })
}

/**
 * 获取模板详情
 * @param {string} type 题型类型
 */
export function fetchTemplateDetail(type) {
  return request('GET', `/templates/${type}`)
}

/**
 * 根据后端返回的相对 URL 拼装完整仿真器地址
 * @param {string} simulatorUrl 后端返回的 simulator_url，如 /simulators/chicken-rabbit/index.html?heads=8
 */
export function buildSimulatorUrl(simulatorUrl) {
  if (!simulatorUrl) return ''
  if (simulatorUrl.startsWith('http')) return simulatorUrl
  const root = API_BASE.replace(/\/api\/v1$/, '')
  return `${root}${simulatorUrl}`
}
