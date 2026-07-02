<script setup>
import { ref, onMounted } from 'vue'

const props = defineProps({
  autoStart: { type: Boolean, default: false }
})

const emit = defineEmits(['result', 'error'])
const listening = ref(false)
const tip = ref('')

onMounted(() => {
  if (props.autoStart) {
    start()
  }
})

function requestPermission() {
  return new Promise((resolve, reject) => {
    // #ifdef APP-PLUS
    plus.android.requestPermissions(
      ['android.permission.RECORD_AUDIO'],
      (result) => {
        if (result.granted && result.granted.length > 0) resolve()
        else reject(new Error('需要录音权限才能语音识别'))
      },
      reject
    )
    // #endif
    // #ifndef APP-PLUS
    resolve()
    // #endif
  })
}

function start() {
  // #ifndef APP-PLUS
  uni.showToast({ title: '请在 App 端使用语音', icon: 'none' })
  return
  // #endif

  requestPermission().then(() => {
    listening.value = true
    tip.value = '正在听...'
    plus.speech.startRecognize(
      {},
      (text) => {
        listening.value = false
        tip.value = ''
        emit('result', text)
      },
      (err) => {
        listening.value = false
        tip.value = ''
        emit('error', err.message || '识别失败')
      }
    )
  }).catch((e) => {
    emit('error', e.message)
  })
}

function stop() {
  // #ifdef APP-PLUS
  plus.speech.stopRecognize()
  // #endif
  listening.value = false
  tip.value = ''
}
</script>

<template>
  <view class="voice-input" @touchstart.prevent="start" @touchend.prevent="stop" @mousedown.prevent="start" @mouseup.prevent="stop">
    <view class="btn" :class="{ active: listening }">
      <text class="icon">🎙️</text>
      <text class="text">{{ listening ? '松开结束' : '按住说话' }}</text>
    </view>
    <text v-if="tip" class="tip">{{ tip }}</text>
  </view>
</template>

<style lang="scss" scoped>
.voice-input { display: flex; flex-direction: column; align-items: center; margin: 24rpx 0; }
.btn { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 160rpx; height: 160rpx; border-radius: 50%; background: linear-gradient(135deg, #81d4fa, #29b6f6); box-shadow: 0 8rpx 0 #0288d1; transition: transform .1s; }
.btn.active { transform: translateY(8rpx); box-shadow: 0 0 0 #0288d1; }
.icon { font-size: 64rpx; }
.text { font-size: 24rpx; color: #fff; margin-top: 8rpx; }
.tip { margin-top: 16rpx; font-size: 28rpx; color: #0288d1; }
</style>
