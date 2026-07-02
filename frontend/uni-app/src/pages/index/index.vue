<script setup>
import { ref, onMounted } from 'vue'
import { fetchTemplates } from '@/utils/api.js'
import TopicCard from '@/components/TopicCard.vue'

const templates = ref([])
const loading = ref(false)
const errorMsg = ref('')

onMounted(() => {
  loadTemplates()
})

async function loadTemplates() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await fetchTemplates()
    if (res.success && Array.isArray(res.data?.templates)) {
      templates.value = res.data.templates
    } else {
      templates.value = []
    }
  } catch (err) {
    console.error(err)
    errorMsg.value = '题库加载失败，请检查网络后再试~'
    uni.showToast({ title: errorMsg.value, icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goToInput(type = '') {
  const url = type ? `/pages/input/input?type=${encodeURIComponent(type)}` : '/pages/input/input'
  uni.navigateTo({ url })
}
</script>

<template>
  <view class="container safe-bottom">
    <view class="header">
      <text class="title">数学小乐园 🎈</text>
      <text class="subtitle">选一个题型，开始有趣的仿真学习吧！</text>
    </view>

    <view class="quick-entry" @click="goToInput()">
      <view class="quick-card kid-card">
        <text class="quick-icon">✏️</text>
        <view class="quick-text">
          <text class="quick-title">直接输入题目</text>
          <text class="quick-desc">不知道题型？让系统自己判断</text>
        </view>
        <text class="quick-arrow">›</text>
      </view>
    </view>

    <view class="section-title">
      <text class="section-text">题型卡片</text>
    </view>

    <view v-if="loading" class="status">
      <text class="status-text">正在加载题型...</text>
    </view>

    <view v-else-if="templates.length === 0" class="status">
      <text class="status-text">{{ errorMsg || '暂无题型，稍后再来看看吧~' }}</text>
      <button v-if="errorMsg" class="retry-btn kid-btn" @click="loadTemplates">重新加载</button>
    </view>

    <view v-else class="card-list">
      <TopicCard
        v-for="item in templates"
        :key="item.type"
        :type="item.type"
        :name="item.name"
        :icon="item.icon || '📚'"
        :description="item.description"
        :grade-range="item.grade_range"
        @tap="goToInput"
      />
    </view>
  </view>
</template>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  padding: 40rpx 32rpx;
}

.header {
  margin-bottom: 36rpx;
}

.title {
  display: block;
  font-size: 56rpx;
  font-weight: 900;
  color: #ff7043;
  text-shadow: 2rpx 4rpx 0 #ffe0b2;
  margin-bottom: 12rpx;
}

.subtitle {
  display: block;
  font-size: 30rpx;
  color: #8d6e63;
}

.quick-entry {
  margin-bottom: 40rpx;
}

.quick-card {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  border: 6rpx solid #fff;
}

.quick-card:active {
  transform: scale(0.98);
}

.quick-icon {
  font-size: 64rpx;
  margin-right: 24rpx;
}

.quick-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.quick-title {
  font-size: 34rpx;
  font-weight: 800;
  color: #4e342e;
  margin-bottom: 6rpx;
}

.quick-desc {
  font-size: 26rpx;
  color: #8d6e63;
}

.quick-arrow {
  font-size: 52rpx;
  color: #ffab91;
  font-weight: 700;
}

.section-title {
  margin-bottom: 24rpx;
}

.section-text {
  font-size: 34rpx;
  font-weight: 800;
  color: #4e342e;
  padding-left: 16rpx;
  border-left: 10rpx solid #ffab91;
}

.card-list {
  padding-bottom: 40rpx;
}

.status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx;
}

.status-text {
  font-size: 30rpx;
  color: #8d6e63;
  margin-bottom: 24rpx;
}

.retry-btn {
  padding: 18rpx 48rpx;
  font-size: 30rpx;
}
</style>
