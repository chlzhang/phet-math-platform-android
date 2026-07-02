<script setup>
import { ref, computed } from 'vue'

/**
 * 题目输入组件（可复用）
 * 支持 v-model 形式的 text 与 grade
 * emits: submit({ text, grade })
 */
const props = defineProps({
  typeName: { type: String, default: '' },
  defaultText: { type: String, default: '' },
  defaultGrade: { type: Number, default: 3 },
  loading: { type: Boolean, default: false }
})

const text = ref(props.defaultText)
const gradeIndex = ref(Math.max(0, props.defaultGrade - 1))

const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']

const selectedGrade = computed(() => gradeIndex.value + 1)

const emit = defineEmits(['submit'])

function onGradeChange(e) {
  gradeIndex.value = Number(e.detail.value)
}

function submit() {
  const value = text.value.trim()
  if (!value) {
    uni.showToast({ title: '请先输入题目哦~', icon: 'none' })
    return
  }
  emit('submit', { text: value, grade: selectedGrade.value })
}
</script>

<template>
  <view class="problem-input kid-card">
    <view v-if="typeName" class="type-tag">
      <text class="type-tag-text">{{ typeName }}</text>
    </view>

    <view class="field">
      <text class="label">题目内容</text>
      <textarea
        v-model="text"
        class="kid-input textarea"
        placeholder="把题目粘贴或输入到这里，例如：笼子里有若干只鸡和兔..."
        placeholder-class="placeholder"
        :maxlength="800"
        auto-height
      />
    </view>

    <view class="field">
      <text class="label">所在年级</text>
      <picker mode="selector" :range="grades" :value="gradeIndex" @change="onGradeChange">
        <view class="grade-picker">
          <text class="grade-value">{{ grades[gradeIndex] }}</text>
          <text class="grade-arrow">▼</text>
        </view>
      </picker>
    </view>

    <button
      class="parse-btn kid-btn"
      :loading="loading"
      :disabled="loading"
      @click="submit"
    >
      {{ loading ? '正在思考...' : '开始解析 🚀' }}
    </button>
  </view>
</template>

<style lang="scss" scoped>
.problem-input {
  padding: 36rpx;
  position: relative;
}

.type-tag {
  position: absolute;
  top: -20rpx;
  left: 36rpx;
  background: linear-gradient(90deg, #81d4fa 0%, #29b6f6 100%);
  padding: 10rpx 28rpx;
  border-radius: 999rpx;
  box-shadow: 0 6rpx 0 #0288d1;
}

.type-tag-text {
  font-size: 26rpx;
  font-weight: 700;
  color: #fff;
}

.field {
  margin-top: 32rpx;
  margin-bottom: 24rpx;
}

.label {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #4e342e;
  margin-bottom: 16rpx;
}

.textarea {
  min-height: 240rpx;
}

.placeholder {
  color: #bcaaa4;
}

.grade-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #fff3e0;
  border: 4rpx solid #ffe0b2;
  border-radius: 24rpx;
}

.grade-value {
  font-size: 32rpx;
  color: #5d4037;
  font-weight: 700;
}

.grade-arrow {
  font-size: 24rpx;
  color: #ffab91;
}

.parse-btn {
  margin-top: 36rpx;
}
</style>
