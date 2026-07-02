<script setup>
import { ref, onMounted } from 'vue'
import { fetchProgress } from '@/utils/api.js'

const stats = ref({})
const loading = ref(false)

async function load() {
  const user = uni.getStorageSync('current_user')
  if (!user) return
  loading.value = true
  const res = await fetchProgress(user.id)
  stats.value = res.success ? res.data.progress : {}
  loading.value = false
}

onMounted(load)
</script>

<template>
  <view class="container safe-bottom">
    <text class="title">学习进度 📊</text>
    <view v-if="loading" class="status"><text>加载中...</text></view>
    <view v-else-if="Object.keys(stats).length === 0" class="status"><text>还没有数据~</text></view>
    <view v-else class="list">
      <view v-for="(s, key) in stats" :key="key" class="item kid-card">
        <text class="name">{{ s.type_name }}</text>
        <text class="row">总练习：{{ s.total }} 次</text>
        <text class="row">正确：{{ s.correct }} 次</text>
        <text class="row">正确率：{{ Math.round(s.accuracy * 100) }}%</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.container { min-height: 100vh; padding: 40rpx 32rpx; }
.title { display: block; font-size: 52rpx; font-weight: 900; color: #ff7043; margin-bottom: 36rpx; }
.status { text-align: center; padding: 80rpx; color: #8d6e63; font-size: 30rpx; }
.item { padding: 28rpx; margin-bottom: 24rpx; }
.name { display: block; font-size: 34rpx; font-weight: 800; color: #4e342e; margin-bottom: 16rpx; }
.row { display: block; font-size: 28rpx; color: #5d4037; line-height: 1.8; }
</style>
