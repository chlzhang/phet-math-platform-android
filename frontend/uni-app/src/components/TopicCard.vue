<script setup>
/**
 * 题型卡片组件
 * props:
 *   - type: 题型标识
 *   - name: 题型名称
 *   - icon: 图标/emoji
 *   - description: 描述
 *   - gradeRange?: 适用年级 [min, max]
 */
const props = defineProps({
  type: { type: String, required: true },
  name: { type: String, required: true },
  icon: { type: String, default: '📚' },
  description: { type: String, default: '' },
  gradeRange: { type: Array, default: () => [] }
})

const emit = defineEmits(['tap'])

function handleTap() {
  emit('tap', props.type)
}

function gradeText() {
  if (!props.gradeRange || props.gradeRange.length < 2) return ''
  return `适合 ${props.gradeRange[0]}-${props.gradeRange[1]} 年级`
}
</script>

<template>
  <view class="topic-card kid-card" @click="handleTap">
    <view class="icon-box">
      <text class="icon">{{ icon }}</text>
    </view>
    <view class="info">
      <text class="name">{{ name }}</text>
      <text class="desc">{{ description }}</text>
      <text v-if="gradeText()" class="grade">{{ gradeText() }}</text>
    </view>
    <view class="arrow">
      <text class="arrow-text">›</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.topic-card {
  display: flex;
  align-items: center;
  padding: 28rpx;
  margin-bottom: 24rpx;
  border: 6rpx solid #fff;
  transition: transform 0.15s;
}

.topic-card:active {
  transform: scale(0.98);
}

.icon-box {
  flex-shrink: 0;
  width: 112rpx;
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #ffccbc 0%, #ffab91 100%);
  border-radius: 28rpx;
  margin-right: 24rpx;
}

.icon {
  font-size: 56rpx;
  line-height: 1;
}

.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.name {
  font-size: 36rpx;
  font-weight: 800;
  color: #4e342e;
  margin-bottom: 8rpx;
}

.desc {
  font-size: 26rpx;
  color: #8d6e63;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.grade {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #ff7043;
  background: #fff3e0;
  align-self: flex-start;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}

.arrow {
  flex-shrink: 0;
  margin-left: 16rpx;
}

.arrow-text {
  font-size: 52rpx;
  color: #ffab91;
  font-weight: 700;
}
</style>
