<template>
  <view
    v-if="innerMounted"
    class="history-mask"
    :class="{ 'history-mask-show': isVisible }"
    @tap="onMaskTap"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <view
      class="history-panel"
      :class="{ 'history-panel-show': isVisible }"
      @tap.stop
    >
      <!-- 头部 -->
      <view class="history-header">
        <text class="history-title">历史对话</text>
        <text class="history-close" @tap="closeHistoryPanel">✕</text>
      </view>

      <!-- 历史记录列表 -->
      <scroll-view scroll-y class="history-list-wrapper">
        <view
          v-for="chat in chatHistory"
          :key="chat.id"
          class="history-item"
          @tap="loadChatHistory(chat)"
        >
          <view class="history-item-icon">💬</view>
          <view class="history-item-info">
            <text class="history-item-title">{{ chat.title }}</text>
            <text class="history-item-meta">
              {{ chat.messageCount }}条消息 · {{ formatDate(chat.lastUpdate) }}
            </text>
          </view>
          <text class="history-item-arrow">›</text>
        </view>

        <view v-if="chatHistory.length === 0" class="history-empty">
          <text class="history-empty-text">暂无历史对话记录</text>
        </view>
      </scroll-view>

      <!-- 底部按钮 -->
      <view class="history-footer">
        <button
          class="history-btn history-btn-danger"
          :disabled="!chatHistory.length"
          :class="{ disabled: !chatHistory.length }"
          @tap="clearAllHistory"
        >
          清空历史
        </button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'HistoryChat',
  props: {
    showHistoryPanel: {
      type: Boolean,
      default: false
    },
    chatHistory: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      // 内部控制挂载和动画状态
      innerMounted: false,
      isVisible: false,
      animationDuration: 250,
      // 手势相关
      touchStartX: 0,
      touchStartY: 0,
      touchStartTime: 0
    }
  },
  watch: {
    showHistoryPanel: {
      immediate: true,
      handler(val) {
        if (val) {
          this.openPanel()
        } else {
          this.closePanel()
        }
      }
    }
  },
  methods: {
    // 打开面板（带动画）
    openPanel() {
      if (this.innerMounted && this.isVisible) return
      this.innerMounted = true
      this.$nextTick(() => {
        // 延迟一点再切换状态，保证过渡生效
        setTimeout(() => {
          this.isVisible = true
        }, 20)
      })
    },
    // 关闭面板（带动画）
    closePanel() {
      if (!this.innerMounted) return
      this.isVisible = false
      setTimeout(() => {
        this.innerMounted = false
      }, this.animationDuration)
    },
    // 点击遮罩关闭
    onMaskTap() {
      this.closeHistoryPanel()
    },
    // 关闭历史对话弹窗
    closeHistoryPanel() {
      this.$emit('close')
    },
    // 加载历史对话
    loadChatHistory(chat) {
      this.$emit('load-chat', chat)
    },
    // 清空所有历史对话
    clearAllHistory() {
      if (!this.chatHistory.length) return
      uni.showModal({
        title: '清空历史对话',
        content: '确定要清空所有历史对话记录吗？此操作不可恢复。',
        confirmText: '清空全部',
        confirmColor: '#f87171',
        success: res => {
          if (res.confirm) {
            this.$emit('clear-all')
          }
        }
      })
    },
    // 格式化日期
    formatDate(time) {
      if (!time) return ''
      const d = new Date(time)
      const y = d.getFullYear()
      const m = `${d.getMonth() + 1}`.padStart(2, '0')
      const day = `${d.getDate()}`.padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    // 记录手势起点
    handleTouchStart(e) {
      const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0])
      if (!touch) return
      this.touchStartX = touch.clientX
      this.touchStartY = touch.clientY
      this.touchStartTime = Date.now()
    },
    // 左滑关闭历史侧边栏
    handleTouchEnd(e) {
      const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
      if (!touch) return
      const deltaX = touch.clientX - this.touchStartX
      const deltaY = touch.clientY - this.touchStartY
      const duration = Date.now() - this.touchStartTime

      const isFastEnough = duration < 500
      const isHorizontalSwipe = Math.abs(deltaX) > 80 && Math.abs(deltaY) < 50

      if (isFastEnough && isHorizontalSwipe && deltaX < 0) {
        this.closeHistoryPanel()
      }
    }
  }
}
</script>

<style scoped lang="scss">
@import '@/static/styles/history_chat.scss';
</style>