<script setup>
const props = defineProps({ users: { type: Array, default: () => [] }, current: { type: Object, default: null } })
const emit = defineEmits(['select', 'add'])
</script>

<template>
  <view class="picker">
    <view v-for="u in users" :key="u.id" class="user-item kid-card" :class="{ active: current && current.id === u.id }" @click="emit('select', u)">
      <text class="avatar">{{ u.avatar || '👶' }}</text>
      <text class="name">{{ u.nickname || '未命名' }}</text>
    </view>
    <view class="user-item kid-card add" @click="emit('add')">
      <text class="avatar">➕</text>
      <text class="name">新增宝贝</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.picker { display: flex; flex-wrap: wrap; gap: 24rpx; }
.user-item { width: calc(50% - 12rpx); display: flex; flex-direction: column; align-items: center; padding: 32rpx; border: 6rpx solid #fff; }
.user-item.active { border-color: #29b6f6; background: #e1f5fe; }
.avatar { font-size: 64rpx; margin-bottom: 12rpx; }
.name { font-size: 30rpx; color: #4e342e; font-weight: 700; }
</style>
