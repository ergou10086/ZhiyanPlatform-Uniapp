<template>
	<view class="message-list-page">
		<!-- 顶部导航栏 -->
		<view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="nav-left" @click="goBack">
				<uni-icons type="left" size="20" color="#333"></uni-icons>
			</view>
			<text class="nav-title">消息通知</text>
			<view class="nav-right">
				<text v-if="unreadCount > 0" class="unread-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
			</view>
		</view>

		<!-- 工具栏 -->
		<view class="toolbar">
			<view class="toolbar-item" @click="markAllAsRead" v-if="unreadCount > 0">
				<text class="toolbar-text">全部已读</text>
			</view>
		</view>

		<!-- 消息列表 -->
		<scroll-view class="message-scroll" scroll-y @scrolltolower="loadMore" :refresher-enabled="true" @refresherrefresh="onRefresh" :refresher-triggered="refreshing">
			<loading-spinner v-if="loading && messages.length === 0" :overlay="true" />
			
			<view v-else-if="messages.length === 0" class="empty-container">
				<text class="empty-text">暂无消息</text>
			</view>

			<view v-else>
				<view 
					class="message-item" 
					v-for="(msg, index) in messages" 
					:key="msg.recipientId || msg.id || index"
					:class="{ 'unread': !msg.readFlag }"
					@click="onMessageClick(msg)"
				>
					<view class="message-content">
						<view class="message-header">
							<text class="message-title">{{ msg.title || '系统通知' }}</text>
							<text class="message-time">{{ formatTime(msg.triggerTime) }}</text>
						</view>
						<text class="message-body">{{ msg.content || '' }}</text>
						<view v-if="msg.scene" class="message-scene">
							<text class="scene-text">{{ getSceneLabel(msg.scene) }}</text>
						</view>
					</view>
					<view v-if="!msg.readFlag" class="unread-dot"></view>
				</view>
			</view>

			<view v-if="loadingMore" class="loading-more">
				<text class="loading-text">加载更多...</text>
			</view>

			<view v-if="!hasMore && messages.length > 0" class="no-more">
				<text class="no-more-text">没有更多消息了</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { getInboxMessages, markAsRead, markAllAsRead, getUnreadCount } from '@/api/message.js'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

export default {
	components: { LoadingSpinner },
	data() {
		return {
			statusBarHeight: 0,
			messages: [],
			unreadCount: 0,
			loading: false,
			loadingMore: false,
			refreshing: false,
			currentPage: 0,
			pageSize: 20,
			hasMore: true
		}
	},
	onLoad() {
		// 获取状态栏高度
		const systemInfo = uni.getSystemInfoSync()
		this.statusBarHeight = systemInfo.statusBarHeight || 0
		
		// 加载消息
		this.loadMessages(true)
		this.fetchUnreadCount()
	},
	onShow() {
		// 页面显示时刷新未读数量
		this.fetchUnreadCount()
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		// 获取未读消息数量
		async fetchUnreadCount() {
			try {
				const res = await getUnreadCount()
				if (res && (res.code === 200 || res.code === 0)) {
					// request.js 现在会保留 data 字段
					this.unreadCount = res.data || 0
				}
			} catch (e) {
				console.error('获取未读消息数量失败:', e)
			}
		},
		// 加载消息列表
		async loadMessages(reset = false) {
			if (reset) {
				this.currentPage = 0
				this.messages = []
				this.hasMore = true
				this.loading = true
			} else {
				if (!this.hasMore || this.loadingMore) return
				this.loadingMore = true
			}

			try {
				const params = {
					page: this.currentPage,
					size: this.pageSize
				}

				const res = await getInboxMessages(params)
				
				if (res && (res.code === 200 || res.code === 0)) {
					let newMessages = []
					
					// 处理分页数据
					if (res.content && Array.isArray(res.content)) {
						newMessages = res.content
					} else if (res.data && res.data.content && Array.isArray(res.data.content)) {
						newMessages = res.data.content
					} else if (Array.isArray(res.data)) {
						newMessages = res.data
					}

					if (reset) {
						this.messages = newMessages
					} else {
						this.messages = [...this.messages, ...newMessages]
					}

					// 判断是否还有更多
					const total = res.totalElements || res.total || 0
					this.hasMore = this.messages.length < total

					if (!this.hasMore) {
						this.currentPage++
					}
				}
			} catch (e) {
				console.error('加载消息列表失败:', e)
				uni.showToast({
					title: '加载消息失败',
					icon: 'none'
				})
			} finally {
				this.loading = false
				this.loadingMore = false
				this.refreshing = false
			}
		},
		// 加载更多
		loadMore() {
			if (this.hasMore && !this.loadingMore) {
				this.currentPage++
				this.loadMessages(false)
			}
		},
		// 下拉刷新
		onRefresh() {
			this.refreshing = true
			this.loadMessages(true)
			this.fetchUnreadCount()
		},
		// 点击消息
		async onMessageClick(msg) {
			// 如果未读，标记为已读
			if (!msg.readFlag && msg.recipientId) {
				try {
					await markAsRead(msg.recipientId)
					msg.readFlag = true
					// 更新未读数量
					if (this.unreadCount > 0) {
						this.unreadCount--
					}
				} catch (e) {
					console.error('标记消息已读失败:', e)
				}
			}
			
			// 这里可以跳转到消息详情页，暂时只显示提示
			uni.showToast({
				title: msg.title || '查看消息详情',
				icon: 'none',
				duration: 2000
			})
		},
		// 全部标记为已读
		async markAllAsRead() {
			try {
				await markAllAsRead()
				// 更新所有消息为已读
				this.messages.forEach(msg => {
					msg.readFlag = true
				})
				this.unreadCount = 0
				uni.showToast({
					title: '已全部标记为已读',
					icon: 'success'
				})
			} catch (e) {
				console.error('全部标记已读失败:', e)
				uni.showToast({
					title: '操作失败',
					icon: 'none'
				})
			}
		},
		// 格式化时间
		formatTime(timeStr) {
			if (!timeStr) return ''
			const date = new Date(timeStr)
			const now = new Date()
			const diff = now - date
			
			// 小于1分钟
			if (diff < 60000) {
				return '刚刚'
			}
			// 小于1小时
			if (diff < 3600000) {
				return Math.floor(diff / 60000) + '分钟前'
			}
			// 小于24小时
			if (diff < 86400000) {
				return Math.floor(diff / 3600000) + '小时前'
			}
			// 小于7天
			if (diff < 604800000) {
				return Math.floor(diff / 86400000) + '天前'
			}
			// 超过7天，显示具体日期
			const month = date.getMonth() + 1
			const day = date.getDate()
			return `${month}-${day}`
		},
		// 获取场景标签
		getSceneLabel(scene) {
			const sceneMap = {
				'TASK': '任务通知',
				'PROJECT': '项目通知',
				'PROJECT_INVITATION': '项目邀请',
				'PROJECT_MEMBER_APPROVAL': '项目申请',
				'SYSTEM': '系统通知',
				'USER_CUSTOM_MESSAGE': '用户消息'
			}
			return sceneMap[scene] || scene || '通知'
		}
	}
}
</script>

<style scoped>
@import '@/static/styles/message-list.scss';
</style>

