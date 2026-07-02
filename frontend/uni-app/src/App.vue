<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('App Launch')
})
onShow(() => {
  console.log('App Show')
})
onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="scss">
/* 全局基础样式：适合小学生的卡通柔和风格 */
page {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background: linear-gradient(180deg, #fff8e1 0%, #ffe0b2 100%);
  color: #5d4037;
  min-height: 100vh;
}

* {
  box-sizing: border-box;
}

.kid-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 48rpx;
  border-radius: 9999rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(90deg, #ffab91 0%, #ff7043 100%);
  box-shadow: 0 8rpx 0 #e64a19, 0 16rpx 24rpx rgba(230, 74, 25, 0.25);
  transition: transform 0.1s;
}

.kid-btn:active {
  transform: translateY(8rpx);
  box-shadow: 0 0 0 #e64a19, 0 4rpx 12rpx rgba(230, 74, 25, 0.25);
}

.kid-card {
  background: #ffffff;
  border-radius: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(93, 64, 55, 0.1);
}

.kid-input {
  width: 100%;
  padding: 24rpx;
  font-size: 32rpx;
  line-height: 1.6;
  background: #fff3e0;
  border: 4rpx solid #ffe0b2;
  border-radius: 24rpx;
  color: #5d4037;
}

.kid-input:focus {
  border-color: #ffab91;
  outline: none;
}

.safe-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
