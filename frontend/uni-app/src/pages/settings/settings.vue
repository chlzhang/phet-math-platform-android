<script setup>
import { ref, onMounted } from 'vue'
import { getServerUrl, setServerUrl } from '@/utils/api.js'

const serverUrl = ref('')
const user = ref(null)

onMounted(() => {
  serverUrl.value = getServerUrl()
  try { user.value = uni.getStorageSync('current_user') } catch (e) {}
})

function save() {
  const url = serverUrl.value.trim()
  if (!url) {
    uni.showToast({ title: '地址不能为空', icon: 'none' })
    return
  }
  setServerUrl(url)
  uni.showToast({ title: '已保存', icon: 'success' })
}
</script>

<template>
  <view class="container safe-bottom">
    <text class="title">设置 ⚙️</text>
    <view class="card kid-card">
      <text class="label">后端服务器地址</text>
      <input v-model="serverUrl" class="kid-input" placeholder="http://192.168.1.100:8090" />
      <text class="hint">请填写和后端同一 Wi-Fi 的地址，例如 http://192.168.1.100:8090</text>
      <button class="kid-btn" @click="save">保存</button>
    </view>
    <view v-if="user" class="card kid-card">
      <text class="label">当前宝贝</text>
      <text class="user">{{ user.avatar || '👶' }} {{ user.nickname }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.container { min-height: 100vh; padding: 40rpx 32rpx; }
.title { display: block; font-size: 52rpx; font-weight: 900; color: #ff7043; margin-bottom: 36rpx; }
.card { padding: 32rpx; margin-bottom: 32rpx; }
.label { display: block; font-size: 32rpx; font-weight: 700; color: #4e342e; margin-bottom: 20rpx; }
input { margin-bottom: 16rpx; }
.hint { display: block; font-size: 24rpx; color: #8d6e63; margin-bottom: 24rpx; line-height: 1.5; }
.user { font-size: 32rpx; color: #5d4037; }
</style>
