const DEFAULT_SERVER = 'http://192.168.1.100:8090'
const SERVER_KEY = 'server_url'

export function getServerUrl() {
  try {
    return uni.getStorageSync(SERVER_KEY) || DEFAULT_SERVER
  } catch (e) {
    return DEFAULT_SERVER
  }
}

export function setServerUrl(url) {
  uni.setStorageSync(SERVER_KEY, url)
}

function getApiBase() {
  // #ifdef H5
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}/api/v1`
  }
  // #endif
  return `${getServerUrl()}/api/v1`
}

export function request(method, url, data = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${getApiBase()}${url}`,
      method,
      data,
      header: { 'Content-Type': 'application/json' },
      timeout: 20000,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(`请求失败：${res.statusCode}`))
        }
      },
      fail: reject
    })
  })
}

export function fetchTemplates() { return request('GET', '/templates') }
export function fetchTemplateDetail(type) { return request('GET', `/templates/${type}`) }
export function parseProblem(text, grade) { return request('POST', '/problems/parse', { text, grade }) }

export function createUser(payload) { return request('POST', '/users', payload) }
export function fetchUsers(deviceId) { return request('GET', `/users?device_id=${encodeURIComponent(deviceId)}`) }
export function updateUser(id, payload) { return request('PUT', `/users/${id}`, payload) }
export function deleteUser(id) { return request('DELETE', `/users/${id}`) }

export function createRecord(payload) { return request('POST', '/learning/record', payload) }
export function fetchHistory(userId, page = 1, size = 20) {
  return request('GET', `/learning/history?user_id=${userId}&page=${page}&size=${size}`)
}
export function fetchProgress(userId) { return request('GET', `/learning/progress?user_id=${userId}`) }
export function fetchMistakes(userId, page = 1, size = 20) {
  return request('GET', `/learning/mistakes?user_id=${userId}&page=${page}&size=${size}`)
}

export function buildSimulatorUrl(simulatorUrl) {
  if (!simulatorUrl) return ''
  if (simulatorUrl.startsWith('http')) return simulatorUrl
  // #ifdef H5
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}${simulatorUrl}`
  }
  // #endif
  return `${getServerUrl()}${simulatorUrl}`
}
