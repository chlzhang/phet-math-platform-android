<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { fetchHistory } from '@/utils/api.js'

const records = ref([])
const loading = ref(false)

async function load() {
  const user = uni.getStorageSync('current_user')
  if (!user) return
  loading.value = true
  try {
    const res = await fetchHistory(user.id)
    records.value = res.success ? res.data.records : []
  } catch (e) {
    uni.showToast({ title: '加载失败，请检查网络', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onMounted(load)
onShow(load)
</script>

<template>
  <view class="container safe-bottom">
    <text class="title">练习历史 📚</text>
    <view v-if="loading" class="status"><text>加载中...</text></view>
    <view v-else-if="records.length === 0" class="status"><text>还没有练习记录哦~</text></view>
    <view v-else class="list">
      <view v-for="r in records" :key="r.id" class="item kid-card">
        <text class="name">{{ r.type_name }}</text>
        <text class="text">{{ r.problem_text }}</text>
        <text class="score" :class="{ good: r.score >= 100 }">得分：{{ r.score ?? '-' }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.container { min-height: 100vh; padding: 40rpx 32rpx; }
.title { display: block; font-size: 52rpx; font-weight: 900; color: #ff7043; margin-bottom: 36rpx; }
.status { text-align: center; padding: 80rpx; color: #8d6e63; font-size: 30rpx; }
.list { padding-bottom: 40rpx; }
.item { padding: 28rpx; margin-bottom: 24rpx; }
.name { display: block; font-size: 32rpx; font-weight: 800; color: #4e342e; margin-bottom: 12rpx; }
.text { display: block; font-size: 28rpx; color: #5d4037; margin-bottom: 12rpx; }
.score { font-size: 26rpx; color: #e53935; }
.score.good { color: #43a047; }
</style>
