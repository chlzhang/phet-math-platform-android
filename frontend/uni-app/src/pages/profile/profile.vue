<script setup>
import { ref, onMounted } from 'vue'
import UserPicker from '@/components/UserPicker.vue'
import { fetchUsers, createUser, updateUser, deleteUser, setServerUrl, getServerUrl } from '@/utils/api.js'

const DEVICE_KEY = 'device_id'
const CURRENT_USER_KEY = 'current_user'
const users = ref([])
const currentUser = ref(null)
const newName = ref('')

function getDeviceId() {
  let id = uni.getStorageSync(DEVICE_KEY)
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    uni.setStorageSync(DEVICE_KEY, id)
  }
  return id
}

async function loadUsers() {
  const deviceId = getDeviceId()
  try {
    const res = await fetchUsers(deviceId)
    if (res.success) {
      users.value = res.data.users || []
      // Auto-create a default child profile on first launch.
      if (users.value.length === 0) {
        await createUser({ device_id: deviceId, nickname: '默认宝贝', avatar: '👶' })
        await loadUsers()
        return
      }
      const cached = uni.getStorageSync(CURRENT_USER_KEY)
      if (cached) {
        const found = users.value.find(u => u.id === cached.id)
        currentUser.value = found || users.value[0] || null
      } else {
        currentUser.value = users.value[0] || null
      }
      if (currentUser.value) uni.setStorageSync(CURRENT_USER_KEY, currentUser.value)
    }
  } catch (e) {
    uni.showToast({ title: '加载失败，请检查网络', icon: 'none' })
  }
}

async function addUser() {
  const name = newName.value.trim() || '默认宝贝'
  try {
    const res = await createUser({ device_id: getDeviceId(), nickname: name, avatar: '👶' })
    if (res.success) {
      newName.value = ''
      await loadUsers()
    }
  } catch (e) {
    uni.showToast({ title: '添加失败，请检查网络', icon: 'none' })
  }
}

function selectUser(u) {
  try {
    currentUser.value = u
    uni.setStorageSync(CURRENT_USER_KEY, u)
    uni.showToast({ title: `已切换：${u.nickname}`, icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '切换失败，请重试', icon: 'none' })
  }
}

async function removeUser(u) {
  try {
    await deleteUser(u.id)
    await loadUsers()
  } catch (e) {
    uni.showToast({ title: '删除失败，请检查网络', icon: 'none' })
  }
}

onMounted(loadUsers)
</script>

<template>
  <view class="container safe-bottom">
    <text class="title">我的孩子 👶</text>
    <UserPicker :users="users" :current="currentUser" @select="selectUser" @add="addUser" />
    <view class="add-box kid-card">
      <text class="label">新增宝贝</text>
      <input v-model="newName" class="kid-input" placeholder="输入昵称" />
      <button class="kid-btn" @click="addUser">添加</button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.container { min-height: 100vh; padding: 40rpx 32rpx; }
.title { display: block; font-size: 52rpx; font-weight: 900; color: #ff7043; margin-bottom: 36rpx; }
.add-box { margin-top: 40rpx; padding: 32rpx; }
.label { display: block; font-size: 32rpx; font-weight: 700; color: #4e342e; margin-bottom: 20rpx; }
input { margin-bottom: 24rpx; }
</style>
