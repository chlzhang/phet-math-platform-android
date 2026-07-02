<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { buildSimulatorUrl, createRecord } from '@/utils/api.js'

const title = ref('仿真演示')
const simulatorUrl = ref('')
const problemText = ref('')
const recordSaved = ref(false)

onLoad((options) => {
  if (options?.url) {
    simulatorUrl.value = decodeURIComponent(options.url)
  }
  if (options?.title) {
    title.value = decodeURIComponent(options.title)
  }
  if (options?.text) {
    problemText.value = decodeURIComponent(options.text)
  }
})

const fullUrl = computed(() => buildSimulatorUrl(simulatorUrl.value))

function goBack() {
  uni.navigateBack({ delta: 1 })
}

async function onMessage(e) {
  const raw = e.detail?.data
  const items = Array.isArray(raw) ? raw : [raw]
  for (const data of items) {
    if (!data || data.event !== 'answer') continue
    const user = uni.getStorageSync('current_user')
    if (!user) continue
    try {
      await createRecord({
        user_id: user.id,
        type: data.type,
        type_name: title.value,
        problem_text: problemText.value || '',
        params: data.params || {},
        score: data.correct ? 100 : (data.score ?? 0),
        duration: data.duration ?? 0
      })
      recordSaved.value = true
    } catch (err) {
      console.error('保存学习记录失败', err)
    }
  }
}
</script>

<template>
  <view class="container">
    <!-- #ifdef MP-WEIXIN -->
    <cover-view class="header mp-header">
      <cover-view class="header-inner">
        <cover-view class="back" @click="goBack">← 返回</cover-view>
        <cover-view class="title">{{ title }}</cover-view>
        <cover-view class="placeholder"></cover-view>
      </cover-view>
    </cover-view>
    <!-- #endif -->

    <!-- #ifndef MP-WEIXIN -->
    <view class="header">
      <view class="header-inner">
        <text class="back" @click="goBack">← 返回</text>
        <text class="title">{{ title }}</text>
        <text class="placeholder"></text>
      </view>
    </view>
    <!-- #endif -->

    <web-view v-if="fullUrl" class="web-view" :src="fullUrl" @message="onMessage" />
    <view v-else class="error">
      <text class="error-text">仿真地址丢失，请返回重试~</text>
      <button class="kid-btn" @click="goBack">返回</button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #fff8e1;
}

.header {
  flex-shrink: 0;
  padding-top: var(--status-bar-height);
  background: #fff8e1;
  border-bottom: 2rpx solid #ffe0b2;
  position: relative;
  z-index: 1000;
}

.mp-header {
  /* cover-view 需要明确高度，防止被 web-view 覆盖 */
  height: calc(var(--status-bar-height) + 96rpx);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
  padding: 0 24rpx;
}

.back {
  font-size: 28rpx;
  color: #fff;
  font-weight: 700;
  background: #ff7043;
  padding: 12rpx 24rpx;
  border-radius: 32rpx;
  min-width: 100rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(255, 112, 67, 0.3);
}

.title {
  flex: 1;
  text-align: center;
  font-size: 34rpx;
  font-weight: 800;
  color: #4e342e;
}

.placeholder {
  min-width: 120rpx;
}

.web-view {
  flex: 1;
  width: 100%;
}

.error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx;
}

.error-text {
  font-size: 32rpx;
  color: #8d6e63;
  margin-bottom: 36rpx;
}
</style>
