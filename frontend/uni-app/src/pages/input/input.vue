<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { parseProblem, fetchTemplateDetail } from '@/utils/api.js'
import ProblemInput from '@/components/ProblemInput.vue'
import VoiceInput from '@/components/VoiceInput.vue'

const currentType = ref('')
const typeName = ref('')
const loading = ref(false)
const text = ref('')
const autoVoice = ref(false)

onLoad((options) => {
  if (options?.type) {
    currentType.value = decodeURIComponent(options.type)
    loadTypeName(currentType.value)
  }
  if (options?.voice === '1') {
    autoVoice.value = true
  }
})

function onVoiceResult(t) {
  text.value = t
  uni.showToast({ title: '已填入语音内容', icon: 'none' })
}

async function loadTypeName(type) {
  try {
    const res = await fetchTemplateDetail(type)
    if (res.success && res.data?.name) {
      typeName.value = res.data.name
    }
  } catch (err) {
    console.error('获取题型名称失败', err)
  }
}

async function handleSubmit({ text, grade }) {
  loading.value = true
  try {
    const res = await parseProblem(text, grade)
    if (res.success && res.data?.simulator_url) {
      const { problem_id, type_name, simulator_url } = res.data
      const url = `/pages/simulator/simulator?url=${encodeURIComponent(simulator_url)}&title=${encodeURIComponent(type_name || '仿真演示')}&text=${encodeURIComponent(text)}`
      uni.navigateTo({ url })
    } else {
      uni.showToast({
        title: res.message || '无法识别题目类型，换个说法试试~',
        icon: 'none',
        duration: 3000
      })
    }
  } catch (err) {
    console.error(err)
    uni.showToast({
      title: '解析失败，请检查网络或题目内容',
      icon: 'none',
      duration: 3000
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="container safe-bottom">
    <view class="header">
      <text class="title">输入题目 ✏️</text>
      <text class="subtitle">把数学题目告诉小助手，马上生成动画仿真</text>
    </view>

    <VoiceInput :auto-start="autoVoice" @result="onVoiceResult" />

    <ProblemInput
      v-model:text="text"
      :type-name="typeName || '自由输入'"
      :loading="loading"
      @submit="handleSubmit"
    />

    <view class="tips kid-card">
      <text class="tips-title">小提示 💡</text>
      <text class="tips-item">• 输入越完整，识别越准确</text>
      <text class="tips-item">• 支持鸡兔同笼、植树问题等常见题型</text>
      <text class="tips-item">• 解析成功后会自动打开仿真页面</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  padding: 40rpx 32rpx;
}

.header {
  margin-bottom: 48rpx;
}

.title {
  display: block;
  font-size: 52rpx;
  font-weight: 900;
  color: #ff7043;
  text-shadow: 2rpx 4rpx 0 #ffe0b2;
  margin-bottom: 12rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: #8d6e63;
}

.tips {
  margin-top: 36rpx;
  padding: 28rpx 32rpx;
  background: #e1f5fe;
  border: 6rpx solid #fff;
}

.tips-title {
  display: block;
  font-size: 32rpx;
  font-weight: 800;
  color: #0288d1;
  margin-bottom: 16rpx;
}

.tips-item {
  display: block;
  font-size: 28rpx;
  color: #4e342e;
  line-height: 1.8;
}
</style>
