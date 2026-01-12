<template>
	<view class="home-page">
		<!-- 导航栏（自定义，包含状态栏高度） -->
		<view class="navbar" :style="{ 
			paddingTop: statusBarHeight + 'px',
			transform: navbarHidden ? 'translateY(-100%)' : 'translateY(0)'
		}">
			<view class="nav-title">首页</view>
			<view class="nav-right-group">
				<view class="notification-bell" @click="onBellClick">
					<uni-icons type="notification" size="24" color="#333"></uni-icons>
					<view v-if="unreadCount > 0" class="badge">
						<text class="badge-text">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
					</view>
				</view>
			</view>
		</view>

		<view class="content">
		<!-- 调试信息（开发环境显示） -->
		<view v-if="false" style="background: red; color: white; padding: 10px; font-size: 12px;">
			调试信息: 用户名={{ currentUserName }}, 任务数={{ tasks.length }}, 项目数={{ projects.length }}
		</view>

		<!-- 加载状态指示器 -->
		<view v-if="pageLoading" class="loading-overlay">
			<loading-spinner :overlay="false" />
			<text class="loading-text">正在加载首页...</text>
		</view>

		<!-- 错误状态 -->
		<view v-else-if="pageError" class="error-state">
			<view class="error-content">
				<uni-icons type="info" size="48" color="#ff6b6b"></uni-icons>
				<text class="error-title">加载失败</text>
				<text class="error-desc">{{ pageError }}</text>
				<button class="retry-btn" @click="retryLoadPage">重试</button>
			</view>
		</view>

		<!-- 页面内容 -->
		<view v-else>

		<!-- 顶部欢迎区 -->
			<view class="hero-card">
				<view class="hero-left">
					<view class="welcome-row">
						<text class="welcome-text">嗨，{{ currentUserName || '用户' }}</text>
						<view class="online-dot"></view>
					</view>
					<text class="welcome-sub">今天也要元气满满 ✨</text>
					<view class="hero-chips">
						<view class="hero-chip">
							<uni-icons type="calendar" size="18" color="#4A90E2"></uni-icons>
							<text>{{ taskSummary.upcoming }} 个临近截止</text>
						</view>
						<view class="hero-chip">
							<uni-icons type="flag" size="18" color="#FF8A5C"></uni-icons>
							<text>{{ taskSummary.highPriority }} 个高优先级</text>
						</view>
						<view class="hero-chip">
							<uni-icons type="bars" size="18" color="#4A90E2"></uni-icons>
							<text>{{ taskSummary.inProgress }} 个进行中的任务</text>
						</view>
						<view class="hero-chip">
							<view class="hero-chip-icon hero-chip-icon-folder">
								<text>📁</text>
							</view>
							<text>{{ projectCount }} 个我的项目</text>
						</view>
					</view>
				</view>
				<view class="hero-avatar">
					<image v-if="currentUserAvatar" :src="currentUserAvatar" mode="aspectFill"></image>
					<view v-else class="hero-avatar-placeholder">
						<uni-icons type="person-filled" size="36" color="#fff"></uni-icons>
					</view>
				</view>
			</view>

			<!-- 快捷功能 -->
			<view class="section section-first">
				<view class="section-header">
					<text class="section-title">我的活动</text>
					<text class="section-subtitle">常用操作一键直达</text>
				</view>
				<view class="activity-quick-list">
					<!-- 审核单独一行 -->
					<view
						class="activity-quick-card"
						v-for="(action, index) in quickActions.slice(0, 1)"
						:key="index"
						@click="handleAction(action.key)"
					>
						<view class="activity-quick-glow"></view>
						<view class="activity-quick-header">
							<text class="activity-quick-tag">快捷入口</text>
							<text class="activity-quick-index">0{{ index + 1 }}</text>
						</view>
						<view class="activity-quick-body">
							<view class="activity-quick-icon" :style="{ backgroundColor: action.color }">
								<uni-icons :type="action.icon" size="28" color="#fff"></uni-icons>
							</view>
							<view class="activity-quick-info">
								<text class="activity-quick-name">{{ action.name }}</text>
								<text class="activity-quick-desc">{{ getQuickActionDesc(action.key) }}</text>
							</view>
						</view>
					</view>
					
					<!-- 项目总览和操作日志在同一行 -->
					<view class="activity-quick-row">
						<view
							class="activity-quick-card activity-quick-card-half"
							v-for="(action, index) in quickActions.slice(1, 3)"
							:key="index + 1"
							@click="handleAction(action.key)"
						>
							<view class="activity-quick-glow"></view>
							<view class="activity-quick-header">
								<text class="activity-quick-tag">快捷入口</text>
								<text class="activity-quick-index">0{{ index + 2 }}</text>
							</view>
							<view class="activity-quick-body">
								<view class="activity-quick-icon" :style="{ backgroundColor: action.color }">
									<uni-icons :type="action.icon" size="24" color="#fff"></uni-icons>
								</view>
								<view class="activity-quick-info">
									<text class="activity-quick-name">{{ action.name }}</text>
									<text class="activity-quick-desc">{{ getQuickActionDesc(action.key) }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>
			</view>

			<!-- 工作项 -->
			<view class="section section-middle">
				<text class="section-title">工作项</text>
				<loading-spinner v-if="loadingTasks" :overlay="false" />
				<view v-else-if="tasks.length === 0" class="task-empty">
					<text class="empty-text">暂无任务</text>
				</view>
				<view v-else class="task-list">
					<view
						class="task-card"
						v-for="(task, index) in tasks"
						:key="task.id || index"
						:class="['task-card--' + (task.priority || 'medium')]"
						@click.stop="goToTaskDetail(task)"
					>
						<view class="task-header">
							<text class="task-title">{{ getTaskTitleOnly(task.title) }}</text>
							<view class="task-priority" :class="'task-priority-' + task.priority">
								<text>{{ getPriorityText(task.priority) }}</text>
							</view>
						</view>
						<text class="task-desc">{{ truncateDescription(task.description) }}</text>
						<view class="task-meta">
							<view class="meta-left">
								<text class="task-id">{{ formatTaskId(task.id) }}</text>
								<view class="dot"></view>
								<text class="task-deadline">{{ formatTaskDeadline(task.deadline) }}</text>
							</view>
							<view class="task-status" :class="'status-' + task.statusKey">
								<text>{{ task.status }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<!-- 我的工作日历 -->
			<view class="section calendar-section">
				<view class="section-header">
					<text class="section-title">我的工作日历</text>
					<text class="section-subtitle">同步任务节奏，提前规划</text>
				</view>
				<view class="calendar-card" style="margin-top: 20rpx;">
					<!-- 年月选择器 -->
					<view class="calendar-month-selector">
						<picker mode="date" :value="calendarPickerValue" fields="month" @change="onCalendarMonthChange">
							<view class="calendar-month-text">
								<text>{{ calendarMonthText }}</text>
								<uni-icons type="calendar" size="16" color="#4A90E2"></uni-icons>
						</view>
						</picker>
					</view>
					
					<!-- 当月安排和图例 -->
					<view class="calendar-header-new">
						<text class="calendar-label">当月安排</text>
							<view class="calendar-legend">
								<view class="legend-item">
									<view class="legend-dot legend-dot-today"></view>
									<text>今天</text>
								</view>
								<view class="legend-item">
									<view class="legend-dot legend-dot-muted"></view>
									<text>非当月</text>
								</view>
								<view class="legend-item">
									<view class="legend-dot deadline-dot-high"></view>
									<text>高优先级</text>
								</view>
								<view class="legend-item">
									<view class="legend-dot deadline-dot-medium"></view>
									<text>中优先级</text>
								</view>
								<view class="legend-item">
									<view class="legend-dot deadline-dot-low"></view>
									<text>低优先级</text>
								</view>
							</view>
							</view>
					
					<!-- 可滑动的日历 -->
					<swiper 
						class="calendar-swiper" 
						:current="calendarSwiperIndex" 
						@change="onCalendarSwiperChange"
						:duration="300"
					>
						<swiper-item v-for="(monthData, index) in calendarSwiperMonths" :key="index">
					<view class="calendar-grid">
						<view class="calendar-weekdays">
							<text v-for="(day, idx) in ['日','一','二','三','四','五','六']" :key="idx">{{ day }}</text>
						</view>
						<view class="calendar-days">
							<view
										v-for="(day, dayIndex) in monthData.days"
										:key="dayIndex"
								class="calendar-day"
								:class="{
									'calendar-day--active': day.isToday,
									'calendar-day--empty': !day.isCurrentMonth,
									'calendar-day--has-deadline': day.hasDeadline,
									'calendar-day--deadline-high': day.hasDeadline && day.deadlinePriority === 'high',
									'calendar-day--deadline-medium': day.hasDeadline && day.deadlinePriority === 'medium',
									'calendar-day--deadline-low': day.hasDeadline && day.deadlinePriority === 'low'
								}"
								@click="onCalendarDayClick(day)"
							>
								<text class="calendar-day-number">{{ day.date }}</text>
								<view v-if="day.hasDeadline" class="calendar-deadline-dot" :class="'deadline-dot-' + day.deadlinePriority"></view>
							</view>
						</view>
					</view>
						</swiper-item>
					</swiper>
				</view>
			</view>

			<!-- 底部间距 -->
			<view class="bottom-space"></view>

		</view><!-- 结束页面内容容器 -->

		<!-- 消息通知弹窗 -->
		<view v-if="showMessagePanel" class="message-panel-overlay" @click="closeMessagePanel">
			<view class="message-panel" @click.stop>
				<!-- 弹窗头部 -->
				<view class="panel-header">
					<text class="panel-title">消息通知</text>
					<view class="panel-actions">
						<view class="toolbar-btn" @click="markAllAsRead" v-if="hasUnreadMessages">
							<text class="toolbar-btn-text">全部已读</text>
						</view>
						<view v-if="unreadCount > 0" class="panel-unread-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</view>
						<view class="panel-close" @click="closeMessagePanel">
							<uni-icons type="close" size="20" color="#666"></uni-icons>
						</view>
					</view>
				</view>

				<!-- 消息列表 -->
				<scroll-view class="panel-message-list" scroll-y enable-back-to-top @scrolltolower="loadMoreMessages" :refresher-enabled="true" @refresherrefresh="refreshMessages" :refresher-triggered="refreshingMessages" :scroll-top="scrollTop">
					<view v-if="messageLoading && messageList.length === 0" class="message-loading">
						<text class="loading-text">加载中...</text>
					</view>
					
					<view v-else-if="messageList.length === 0" class="message-empty">
						<text class="empty-text">暂无消息</text>
					</view>

					<view v-else>
						<view 
							class="message-item" 
							v-for="(msg, index) in messageList" 
							:key="msg.recipientId || msg.id || index"
							:class="{ 'unread': !msg.readFlag }"
							@click="onMessageClick(msg)"
						>
							<view class="message-content">
								<view class="message-header">
									<text class="message-title">{{ msg.title || '系统通知' }}</text>
									<text class="message-time">{{ formatMessageTime(msg.triggerTime) }}</text>
								</view>
								<text class="message-body">{{ msg.content || '' }}</text>
								<view v-if="msg.scene" class="message-scene">
									<text class="scene-text">{{ getMessageSceneLabel(msg.scene) }}</text>
								</view>
							</view>
							<view v-if="!msg.readFlag" class="unread-dot"></view>
						</view>
					</view>

					<view v-if="messageLoadingMore" class="message-loading-more">
						<text class="loading-text">加载更多...</text>
					</view>

					<view v-if="!messageHasMore && messageList.length > 0" class="message-no-more">
						<text class="no-more-text">没有更多消息了</text>
					</view>
				</scroll-view>
			</view>
		</view>
		
		<!-- 消息详情弹窗 -->
		<uni-popup
			ref="messageDetailPopup"
			type="center"
			:show="showMessageDetail"
			@change="onMessageDetailPopupChange"
			:mask-click="true"
			:mask-closeable="true"
		>
			<view class="task-detail-popup message-detail-popup" @click.stop>
				<view class="popup-header">
					<text class="popup-title">消息详情</text>
					<uni-icons
						type="close"
						size="24"
						color="#999"
						@click="closeMessageDetail"
						class="close-icon"
					></uni-icons>
				</view>

				<scroll-view scroll-y class="popup-content">
					<view class="task-detail-card">
						<view class="task-detail-header">
							<text class="task-detail-title">{{ currentMessage?.title || '系统通知' }}</text>
						</view>

						<view class="task-detail-meta">
							<view class="meta-item">
								<text class="meta-label">时间：</text>
								<text class="meta-value">{{ currentMessage?.triggerTime || '' }}</text>
							</view>
							<view class="meta-item" v-if="currentMessage?.scene">
								<text class="meta-label">类型：</text>
								<text class="meta-value">{{ getMessageSceneLabel(currentMessage.scene) }}</text>
							</view>
						</view>

						<view class="task-detail-desc" v-if="currentMessage?.content">
							<text class="desc-label">内容：</text>
							<text class="desc-content">{{ currentMessage.content }}</text>
						</view>
					</view>
				</scroll-view>

				<view class="popup-footer">
					<button class="btn-cancel" @click="closeMessageDetail">关闭</button>
				</view>
			</view>
		</uni-popup>
		
		<!-- 任务详情弹窗 -->
		<uni-popup ref="taskDetailPopup" type="center" :show="showTaskDetail" @change="onPopupChange" :mask-click="true" :mask-closeable="true">
			<view class="task-detail-popup" @click.stop>
				<view class="popup-header">
					<text class="popup-title">任务详情</text>
					<uni-icons type="close" size="24" color="#999" @click="closeTaskDetail" class="close-icon"></uni-icons>
				</view>
				
				<scroll-view scroll-y class="popup-content">
					<view class="task-detail-card">
						<view class="task-detail-header">
							<text class="task-detail-title">{{ currentTask?.title || '无标题任务' }}</text>
							<view class="task-priority" :class="'task-priority-' + currentTask?.priority">
								{{ getPriorityText(currentTask?.priority) }}
							</view>
						</view>
						
						<view class="task-detail-desc" v-if="currentTask?.description">
							<text class="desc-label">任务描述：</text>
							<text class="desc-content">{{ currentTask.description }}</text>
						</view>
						
						<view class="task-detail-meta">
							<view class="meta-item">
								<text class="meta-label">任务ID：</text>
								<text class="meta-value">{{ formatTaskId(currentTask?.id) }}</text>
							</view>
							<view class="meta-item">
								<text class="meta-label">截止时间：</text>
								<text class="meta-value">{{ formatTaskDeadline(currentTask?.deadline) || '无' }}</text>
							</view>
							<view class="meta-item">
								<text class="meta-label">状态：</text>
								<text class="task-status" :class="'status-' + (currentTask?.status || 'todo')">
									{{ getTaskStatusText(currentTask?.status) }}
								</text>
							</view>
						</view>
					</view>
				</scroll-view>
				
				<view class="popup-footer">
					<button class="btn-cancel" @click="closeTaskDetail">关闭</button>
					<button class="btn-primary" @click="goToProject(currentTask?.projectId)" v-if="currentTask?.projectId">
						前往项目
					</button>
				</view>
			</view>
		</uni-popup>
		
		<!-- 日历任务截止日期弹窗 -->
		<uni-popup ref="deadlineTasksPopup" type="center" :show="showDeadlineTasksPopup" @change="onDeadlinePopupChange" :mask-click="true" :mask-closeable="true">
			<view class="deadline-tasks-popup" @click.stop>
				<view class="popup-header">
					<text class="popup-title">{{ selectedDeadlineDate ? formatDeadlineDateTitle(selectedDeadlineDate) : '任务截止日期' }}</text>
					<uni-icons type="close" size="24" color="#999" @click.stop="closeDeadlineTasksPopup" class="close-icon"></uni-icons>
				</view>
				
				<scroll-view scroll-y class="popup-content">
					<view v-if="deadlineTasks.length === 0" class="deadline-tasks-empty">
						<text class="empty-text">该日期暂无截止任务</text>
					</view>
					<view v-else class="deadline-tasks-list">
						<view
							class="deadline-task-item"
							v-for="(task, index) in deadlineTasks"
							:key="task.id || index"
							@click="goToTaskDetailFromDeadline(task)"
						>
							<view class="deadline-task-header">
								<text class="deadline-task-title">{{ getTaskTitleOnly(task.title) }}</text>
								<view class="task-priority" :class="'task-priority-' + task.priority">
									<text>{{ getPriorityText(task.priority) }}</text>
								</view>
							</view>
							<text v-if="task.description" class="deadline-task-desc">{{ truncateDescription(task.description) }}</text>
							<view class="deadline-task-meta">
								<text class="deadline-task-id">{{ formatTaskId(task.id) }}</text>
								<view class="task-status" :class="'status-' + task.statusKey">
									<text>{{ task.status }}</text>
								</view>
							</view>
						</view>
					</view>
				</scroll-view>
				
				<view class="popup-footer">
					<button class="btn-cancel" @click="closeDeadlineTasksPopup">关闭</button>
				</view>
			</view>
		</uni-popup>
		</view>
	</view>
</template>

<script>
import { getCurrentUser, getMyAvatar } from '@/api/user.js'
import config from '@/utils/config.js'
import { getMyProjects } from '@/api/project.js'
import { getUnreadCount, getInboxMessages, getUnreadMessages, markAsRead, markAllAsRead } from '@/api/message.js'
import { getMyAssignedTasks } from '@/api/task.js'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

export default {
	components: { LoadingSpinner },
		data() {
		return {
			// 页面加载状态
			pageLoading: true,
			pageError: null,
			// 任务详情弹窗相关状态
			showTaskDetail: false,
			currentTask: null,
			statusBarHeight: 0, // 状态栏高度
			navbarHidden: false, // 导航栏是否隐藏
			lastScrollTop: 0, // 上次滚动位置
			scrollThreshold: 10, // 滚动阈值，超过这个值才开始判断方向
			unreadCount: 0,
			unreadCountLoaded: false, // 标记未读消息是否已加载过
			pageInitialized: false, // 标记首页是否已完成过一次完整初始化
			currentUserName: '',
			currentUserAvatar: '',
			quickActions: [
				{ key: 'review', name: '审核', icon: 'calendar', color: '#5B9BFF' },
				{ key: 'projectOverview', name: '项目总览', icon: 'bars', color: '#7C9BFF' },
				{ key: 'operationLog', name: '操作日志', icon: 'list', color: '#5B8FFF' }
			],
			projects: [],
			showAllProjects: false, // 控制是否显示所有项目
			showMessagePanel: false, // 控制消息弹窗显示
			messageList: [], // 消息列表
			messageLoading: false, // 消息加载中
			messageLoadingMore: false, // 加载更多中
			refreshingMessages: false, // 刷新中
			messageCurrentPage: 0, // 消息当前页
			messagePageSize: 20, // 消息每页数量
			messageHasMore: true, // 是否还有更多消息
			scrollTop: 0, // 滚动位置
			showMessageDetail: false, // 消息详情弹窗显示
			currentMessage: null, // 当前查看的消息详情
			tasks: [], // 任务列表
			loadingTasks: false, // 任务加载中
			calendarYear: new Date().getFullYear(), // 日历当前年份
			calendarMonth: new Date().getMonth() + 1, // 日历当前月份（1-12）
			calendarSwiperIndex: 1, // swiper当前索引（中间位置，用于左右滑动）
			showMonthPicker: false, // 是否显示年月选择器
			// 日历任务截止日期弹窗
			showDeadlineTasksPopup: false, // 控制任务截止日期弹窗显示
			selectedDeadlineDate: null, // 选中的日期 {year, month, date}
			deadlineTasks: [] // 该日期截止的任务列表
		}
	},
	computed: {
		// 根据 showAllProjects 返回要显示的项目列表
		displayProjects() {
			if (this.showAllProjects) {
				return this.projects;
			}
			return this.projects.slice(0, 3); // 默认只显示前3个
		},
		// 当前消息列表中是否还有未读消息（控制“全部已读”按钮显示）
		hasUnreadMessages() {
			const list = Array.isArray(this.messageList) ? this.messageList : [];
			return list.some(msg => msg && !msg.readFlag);
		},
		// 格式化日历月份显示
		calendarMonthText() {
			return `${this.calendarYear} 年 ${this.calendarMonth} 月`;
		},
		// picker组件的value值
		calendarPickerValue() {
			const month = this.calendarMonth < 10 ? `0${this.calendarMonth}` : this.calendarMonth;
			return `${this.calendarYear}-${month}`;
		},
		// 生成swiper需要的三个月数据（上月、本月、下月）
		calendarSwiperMonths() {
			const currentYear = this.calendarYear;
			const currentMonth = this.calendarMonth;
			const months = [];
			
			// 生成上个月、本月、下个月的数据
			for (let i = -1; i <= 1; i++) {
				let year = currentYear;
				let month = currentMonth + i;
				
				if (month <= 0) {
					month = 12;
					year--;
				} else if (month > 12) {
					month = 1;
					year++;
				}
				
				months.push({
					year,
					month,
					days: this.buildCalendarDays(year, month)
				});
			}
			
			return months;
		},
		// 任务和项目的快速统计
		taskSummary() {
			const tasks = Array.isArray(this.tasks) ? this.tasks : [];
			const now = Date.now();
			const threeDays = 1000 * 60 * 60 * 24 * 3;
			const inProgress = tasks.filter(t => (t.statusKey || '').toLowerCase() === 'in_progress').length;
			const highPriority = tasks.filter(t => (t.priority || '').toLowerCase() === 'high').length;
			const upcoming = tasks.filter(t => {
				if (!t.deadline) return false;
				const time = new Date(t.deadline).getTime();
				if (Number.isNaN(time)) return false;
				return time >= now && time - now <= threeDays;
			}).length;
			return {
				total: tasks.length,
				inProgress,
				highPriority,
				upcoming
			};
		},
		projectCount() {
			return Array.isArray(this.projects) ? this.projects.length : 0;
		}
	},
	onLoad() {
		console.log('🏠 首页 onLoad 开始加载');
		// 首次进入才进行完整初始化并展示 loading
		this.loadPage({ showLoading: true, force: false });
		console.log('🏠 首页 onLoad 完成');
	},
	onShow() {
		console.log('🏠 首页 onShow 开始加载');
		// 回到首页默认静默刷新（避免整页 loading 闪烁）
		this.loadPage({ showLoading: !this.pageInitialized, force: false });
		console.log('🏠 首页 onShow 完成');
	},
	onPageScroll(e) {
		// 监听页面滚动，实现导航栏的显示/隐藏
		const scrollTop = e.scrollTop || 0;
		
		// 如果滚动到顶部附近，始终显示导航栏
		if (scrollTop <= this.scrollThreshold) {
			this.navbarHidden = false;
			this.lastScrollTop = scrollTop;
			return;
		}
		
		// 判断滚动方向
		const scrollingDown = scrollTop > this.lastScrollTop;
		
		// 只有当滚动距离有明显变化时才切换状态（避免频繁切换，提高性能）
		const scrollDelta = Math.abs(scrollTop - this.lastScrollTop);
		if (scrollDelta > 5) {
			// 向下滚动时隐藏导航栏，向上滚动时显示导航栏
			this.navbarHidden = scrollingDown;
			this.lastScrollTop = scrollTop;
		}
	},
	methods: {
		// 生成指定年月的日历日期数组
		buildCalendarDays(year, month) {
			const today = new Date();
			const currentYear = today.getFullYear();
			const currentMonth = today.getMonth() + 1;
			const currentDate = today.getDate();
			
			// 获取当月第一天是星期几（0=周日，1=周一...）
			const firstDay = new Date(year, month - 1, 1).getDay();
			// 获取当月有多少天
			const daysInMonth = new Date(year, month, 0).getDate();
			
			// 获取所有任务的截止日期信息
			const tasks = Array.isArray(this.tasks) ? this.tasks : [];
			const taskDeadlines = {};
			
			// 遍历任务，按截止日期分组，并记录最高优先级
			tasks.forEach(task => {
				if (!task.deadline) return;
				try {
					const deadline = new Date(task.deadline);
					const taskYear = deadline.getFullYear();
					const taskMonth = deadline.getMonth() + 1;
					const taskDate = deadline.getDate();
					
					// 只处理当前显示月份的任务
					if (taskYear === year && taskMonth === month) {
						const dateKey = taskDate;
						const priority = (task.priority || 'medium').toLowerCase();
						
						// 如果该日期还没有任务，或者当前任务优先级更高，则更新
						if (!taskDeadlines[dateKey]) {
							taskDeadlines[dateKey] = {
								hasTask: true,
								priority: priority,
								count: 1
							};
						} else {
							taskDeadlines[dateKey].count++;
							// 优先级排序：high > medium > low
							const priorityOrder = { high: 3, medium: 2, low: 1 };
							if (priorityOrder[priority] > priorityOrder[taskDeadlines[dateKey].priority]) {
								taskDeadlines[dateKey].priority = priority;
							}
						}
					}
				} catch (e) {
					console.warn('解析任务截止日期失败:', task.deadline, e);
				}
			});
			
			const days = [];
			
			// 添加上月的空白日期（用于对齐）
			for (let i = 0; i < firstDay; i++) {
				days.push({ date: '', isToday: false, isCurrentMonth: false });
			}
			
			// 添加当月的日期
			for (let i = 1; i <= daysInMonth; i++) {
				const dayInfo = {
					date: i,
					year: year,
					month: month,
					isToday: year === currentYear && month === currentMonth && i === currentDate,
					isCurrentMonth: true
				};
				
				// 如果有任务在该日期截止，添加任务信息
				if (taskDeadlines[i]) {
					dayInfo.hasDeadline = true;
					dayInfo.deadlinePriority = taskDeadlines[i].priority;
					dayInfo.deadlineCount = taskDeadlines[i].count;
				}
				
				days.push(dayInfo);
			}
			
			return days;
		},
		// 重试加载页面
		retryLoadPage() {
			console.log('🏠 用户点击重试，重新加载首页');
			this.loadPage({ showLoading: true, force: true });
		},

		loadPage({ showLoading, force }) {
			// 如果已经初始化过且不是强制刷新，则不再重置整页 loading/error
			if (showLoading) {
				this.pageLoading = true;
				this.pageError = null;
			}

			this.getSystemInfo();

			const loadPromises = [
				this.loadCurrentUserSummary().then(() => {
					console.log('🏠 首页用户信息加载成功');
				}).catch(e => {
					console.error('🏠 首页加载用户信息失败:', e);
					this.currentUserName = '用户';
					this.currentUserAvatar = '/static/images/default-avatar.png';
					return '用户信息加载失败，但不影响页面显示';
				}).then(() => {
					return new Promise(resolve => setTimeout(resolve, 100)).then(() => Promise.all([
						(force || !this.unreadCountLoaded ? this.fetchUnreadCount().then(() => {
							this.unreadCountLoaded = true;
							console.log('🏠 首页未读消息数量加载成功');
						}).catch(e => {
							console.error('🏠 首页加载未读消息失败:', e);
							return '未读消息加载失败，但不影响页面显示';
						}) : Promise.resolve()),

						this.loadProjectsFromBackend().then(() => {
							console.log('🏠 首页项目列表加载成功');
						}).catch(e => {
							console.error('🏠 首页加载项目列表失败:', e);
							return '项目列表加载失败，但不影响页面显示';
						}),

						this.loadMyTasks().then(() => {
							console.log('🏠 首页任务列表加载成功');
						}).catch(e => {
							console.error('🏠 首页加载任务失败:', e);
							return '任务列表加载失败，但不影响页面显示';
						})
					]));
				})
			];

			Promise.all(loadPromises).then(() => {
				console.log('🏠 首页所有数据加载完成');
				this.pageInitialized = true;
				if (showLoading) {
					this.pageLoading = false;
				}
			}).catch((error) => {
				console.error('🏠 首页加载过程中发生严重错误:', error);
				if (showLoading) {
					this.pageError = '页面加载失败，请检查网络连接或重试';
					this.pageLoading = false;
				}
			});
		},

		// 获取系统信息（用于设置状态栏高度）
		getSystemInfo() {
			try {
				const systemInfo = uni.getSystemInfoSync();
				this.statusBarHeight = systemInfo.statusBarHeight || 0;
			} catch (e) {
				console.error('获取系统信息失败:', e);
				this.statusBarHeight = 20;
			}
		},
		// 获取未读消息数量（过滤掉知识库和Wiki相关消息）
		async fetchUnreadCount() {
			try {
				// 直接获取未读消息数量
				const res = await getUnreadCount();
				console.log('未读消息数量接口返回:', res);
				
				if (res && (res.code === 200 || res.code === 0)) {
					// 直接使用返回的数量
					this.unreadCount = res.data || 0;
					console.log('未读消息数量:', this.unreadCount);
				} else {
					console.warn('获取未读消息数量接口返回异常:', res);
					// 如果接口失败，尝试使用备用方法
					await this.fetchUnreadCountFallback();
				}
			} catch (e) {
				console.error('获取未读消息数量失败:', e);
				// 如果直接获取数量失败，尝试使用备用方法
				await this.fetchUnreadCountFallback();
			}
		},
		// 备用方法：获取未读消息列表并计算数量
		async fetchUnreadCountFallback() {
			try {
				// 获取未读消息列表，然后过滤计算数量
				// 获取足够多的未读消息（200条应该足够）
				const res = await getUnreadMessages({ page: 1, size: 200 });
				console.log('未读消息接口返回:', res);
				
				if (res && (res.code === 200 || res.code === 0)) {
					let unreadMessages = [];
					
					// 处理分页数据
					if (res.content && Array.isArray(res.content)) {
						unreadMessages = res.content;
					} else if (res.data && res.data.content && Array.isArray(res.data.content)) {
						unreadMessages = res.data.content;
					} else if (Array.isArray(res.data)) {
						unreadMessages = res.data;
					} else if (Array.isArray(res)) {
						unreadMessages = res;
					}

					console.log('未读消息列表:', unreadMessages);

					// 过滤掉知识库（ACHIEVEMENT）和 Wiki（WIKI）相关的消息
					const filteredMessages = unreadMessages.filter(msg => {
						if (!msg) return false;
						const scene = (msg.scene || msg.messageScene || '').toUpperCase();
						const businessType = (msg.businessType || '').toUpperCase();
						return !scene.includes('ACHIEVEMENT') &&
						       !scene.includes('WIKI') &&
						       businessType !== 'ACHIEVEMENT' && 
						       businessType !== 'WIKI';
					});
					
					// 计算过滤后的未读数量
					this.unreadCount = filteredMessages.length;
					console.log('过滤后的未读消息数量:', this.unreadCount, '原始数量:', unreadMessages.length);

					// 触发视图更新
					this.$forceUpdate();
				} else {
					console.warn('获取未读消息接口返回异常:', res);
				}
			} catch (e) {
				console.error('获取未读消息数量失败:', e);
				// 显示错误提示
				uni.showToast({
					title: '获取未读消息失败',
					icon: 'none',
					duration: 2000
				});
			}
		},
		// 点击顶部通知铃铛
		onBellClick() {
			// 显示消息弹窗
			this.showMessagePanel = true;
			// 如果消息列表为空，加载消息
			if (this.messageList.length === 0) {
				this.loadMessages(true);
			}
		},
		// 关闭消息弹窗
		closeMessagePanel() {
			this.showMessagePanel = false;
		},
		// 加载消息列表
		async loadMessages(reset = false) {
			if (reset) {
				this.messageCurrentPage = 0;
				this.messageList = [];
				this.messageHasMore = true;
				this.messageLoading = true;
			} else {
				if (!this.messageHasMore || this.messageLoadingMore) return;
				this.messageLoadingMore = true;
			}

			try {
				const params = {
					page: this.messageCurrentPage,
					size: this.messagePageSize
				};

				const res = await getInboxMessages(params);
				
				if (res && (res.code === 200 || res.code === 0)) {
					let newMessages = [];
					
					// 处理分页数据
					if (res.content && Array.isArray(res.content)) {
						newMessages = res.content;
					} else if (res.data && res.data.content && Array.isArray(res.data.content)) {
						newMessages = res.data.content;
					} else if (Array.isArray(res.data)) {
						newMessages = res.data;
					}

					// 过滤掉知识库（ACHIEVEMENT）和 Wiki（WIKI）相关的消息
					newMessages = newMessages.filter(msg => {
						// 获取消息场景，scene 字段存储的是枚举名称（如 ACHIEVEMENT_FILE_UPLOADED、WIKI_PAGE_CREATED）
						const scene = msg.scene || msg.messageScene || '';
						// 过滤掉以 ACHIEVEMENT_ 或 WIKI_ 开头的消息
						// 也过滤掉 businessType 为 ACHIEVEMENT 或 WIKI 的消息（双重保险）
						const businessType = msg.businessType || '';
						return !scene.startsWith('ACHIEVEMENT_') && 
						       !scene.startsWith('WIKI_') &&
						       businessType !== 'ACHIEVEMENT' && 
						       businessType !== 'WIKI';
					});

					if (reset) {
						this.messageList = newMessages;
					} else {
						this.messageList = [...this.messageList, ...newMessages];
					}

					// 判断是否还有更多
					const total = res.totalElements || res.total || 0;
					this.messageHasMore = this.messageList.length < total;

					if (this.messageHasMore) {
						this.messageCurrentPage++;
					}
					
					// 重新计算过滤后的未读数量（基于当前显示的消息）
					if (reset) {
						this.recalculateUnreadCount();
					}
				}
			} catch (e) {
				console.error('加载消息列表失败:', e);
				uni.showToast({
					title: '加载消息失败',
					icon: 'none'
				});
			} finally {
				this.messageLoading = false;
				this.messageLoadingMore = false;
				this.refreshingMessages = false;
			}
		},
		// 加载更多消息
		loadMoreMessages() {
			if (this.messageHasMore && !this.messageLoadingMore) {
				this.loadMessages(false);
			}
		},
		// 刷新消息
		refreshMessages() {
			this.refreshingMessages = true;
			this.loadMessages(true);
			this.fetchUnreadCount();
		},
		
    // 重新计算未读数量（基于过滤后的消息列表）
    recalculateUnreadCount() {
      const unreadCount = this.messageList.filter(msg => !msg.readFlag).length;
      this.unreadCount = unreadCount;
      console.log('重新计算未读数量:', this.unreadCount);
    },
		// 点击消息
		async onMessageClick(msg) {
			if (!msg) return;
			// 如果未读，标记为已读
			if (!msg.readFlag && msg.recipientId) {
				try {
					await markAsRead(msg.recipientId);
					msg.readFlag = true;
					// 重新计算未读数量
					this.recalculateUnreadCount();
				} catch (e) {
					console.error('标记消息已读失败:', e);
				}
			}
			// 关闭消息通知抽屉
			this.closeMessagePanel();
			// 打开消息详情弹窗
			this.currentMessage = { ...msg };
			this.showMessageDetail = true;
			this.$nextTick(() => {
				setTimeout(() => {
					if (this.$refs.messageDetailPopup) {
						if (typeof this.$refs.messageDetailPopup.open === 'function') {
							this.$refs.messageDetailPopup.open();
						} else if (typeof this.$refs.messageDetailPopup.show === 'function') {
							this.$refs.messageDetailPopup.show();
						}
					}
				}, 50);
			});
		},
		// 关闭消息详情弹窗
		closeMessageDetail() {
			this.showMessageDetail = false;
			this.$nextTick(() => {
				if (this.$refs.messageDetailPopup) {
					if (typeof this.$refs.messageDetailPopup.close === 'function') {
						this.$refs.messageDetailPopup.close();
					} else if (typeof this.$refs.messageDetailPopup.hide === 'function') {
						this.$refs.messageDetailPopup.hide();
					}
				}
			});
		},
		// 处理消息详情弹窗状态变化
		onMessageDetailPopupChange(e) {
			this.showMessageDetail = e.show;
		},
		// 全部标记为已读
		async markAllAsRead() {
			try {
				await markAllAsRead();
				// 更新所有消息为已读
				this.messageList.forEach(msg => {
					msg.readFlag = true;
				});
				// 重新计算未读数量
				this.recalculateUnreadCount();
				// 同时刷新未读数量（从后端获取最新状态）
				this.fetchUnreadCount();
			} catch (e) {
				console.error('全部标记已读失败:', e);
				uni.showToast({
					title: '操作失败',
					icon: 'none'
				});
			}
		},
		// 格式化消息时间
		formatMessageTime(timeStr) {
			if (!timeStr) return '';
			const date = new Date(timeStr);
			const now = new Date();
			const diff = now - date;
			
			// 小于1分钟
			if (diff < 60000) {
				return '刚刚';
			}
			// 小于1小时
			if (diff < 3600000) {
				return Math.floor(diff / 60000) + '分钟前';
			}
			// 小于24小时
			if (diff < 86400000) {
				return Math.floor(diff / 3600000) + '小时前';
			}
			// 小于7天
			if (diff < 604800000) {
				return Math.floor(diff / 86400000) + '天前';
			}
			// 超过7天，显示具体日期
			const month = date.getMonth() + 1;
			const day = date.getDate();
			return `${month}-${day}`;
		},
		// 获取消息场景标签
		getMessageSceneLabel(scene) {
			const sceneMap = {
				'TASK': '任务通知',
				'PROJECT': '项目通知',
				'PROJECT_INVITATION': '项目邀请',
				'PROJECT_MEMBER_APPROVAL': '项目申请',
				'SYSTEM': '系统通知',
				'USER_CUSTOM_MESSAGE': '用户消息'
			};
			return sceneMap[scene] || scene || '通知';
		},
		// 加载项目列表
		async loadProjectsFromBackend() {
			try {
				const res = await getMyProjects(0, 6);

				if (res && (res.code === 200 || res.code === 0)) {
					let list = [];

					if (Array.isArray(res.content)) {
						list = res.content;
					} else if (res.data && Array.isArray(res.data.content)) {
						list = res.data.content;
					} else if (Array.isArray(res.data)) {
						list = res.data;
					}

					this.projects = list.map(p => ({
						id: p.id,
						title: p.name || p.title || '未命名项目',
						avatar: p.imageUrl || p.image || p.avatar || ''
					}));
				} else {
					uni.showToast({
						title: (res && (res.msg || res.message)) || '获取项目列表失败',
						icon: 'none'
					});
				}
			} catch (e) {
				console.error('加载项目列表失败:', e);
				uni.showToast({
					title: e.message || '获取项目列表失败',
					icon: 'none'
				});
			}
		},
		// 切换显示所有项目
		toggleShowAllProjects() {
			this.showAllProjects = !this.showAllProjects;
		},
		// 处理快捷功能点击
		handleAction(key) {
			const pageMap = {
				review: '/pages/activity/review',
				projectOverview: '/pages/activity/project-overview',
				operationLog: '/pages/activity/operation-log'
			};
			const url = pageMap[key] || '/pages/activity/review';
			uni.navigateTo({ url });
		},
		// 不同快捷入口的描述文案
		getQuickActionDesc(key) {
			const map = {
				review: '待我审核的任务与项目',
				projectOverview: '一眼掌握项目整体进度',
				operationLog: '查看关键操作与系统记录'
			};
			return map[key] || '常用功能快捷到达';
		},
		// 跳转到个人信息页
		goToProfile() {
			uni.navigateTo({
				url: '/pages/user/user'
			});
		},
		// 加载我的任务
		async loadMyTasks() {
			try {
				this.loadingTasks = true;
				const res = await getMyAssignedTasks(0, 20);
				
				if (res && (res.code === 200 || res.code === 0)) {
					let taskList = [];
					
					// 处理分页数据
					if (res.content && Array.isArray(res.content)) {
						taskList = res.content;
					} else if (res.data && res.data.content && Array.isArray(res.data.content)) {
						taskList = res.data.content;
					} else if (Array.isArray(res.data)) {
						taskList = res.data;
					}
					
					// 映射任务数据
					const mappedTasks = taskList.map(task => ({
						id: task.id || task.taskId || `#TASK-${task.id}`,
						title: task.title || '未命名任务',
						description: task.description || '',
						priority: this.mapTaskPriority(task.priority),
						priorityText: this.getPriorityText(this.mapTaskPriority(task.priority)),
						deadline: task.dueDate || task.due_date || null,
						status: this.getTaskStatusText(task.status),
						statusKey: this.getTaskStatusKey(task.status),
						projectId: task.projectId || task.project_id
					}));
					
					// 过滤掉已完成和待审核的任务
					const activeTasks = mappedTasks.filter(task => {
						const status = String(task.statusKey || '').toUpperCase();
						// 排除已完成状态
						const completedStatuses = ['DONE', 'COMPLETED', '完成', '已完成'];
						if (completedStatuses.some(s => status.includes(s))) {
							return false;
						}
						// 排除待审核状态（但保留被打回的）
						const pendingReviewStatuses = ['PENDING_REVIEW', '待审核'];
						if (pendingReviewStatuses.some(s => status.includes(s))) {
							return false;
						}
						return true;
					});
					
					// 按优先级排序（高优先级在前）
					activeTasks.sort((a, b) => {
						const priorityWeight = { 'high': 3, 'medium': 2, 'low': 1 };
						return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
					});
					
					this.tasks = activeTasks;
					console.log('加载任务成功，数量:', this.tasks.length);
				} else {
					this.tasks = [];
				}
			} catch (e) {
				console.error('加载任务失败:', e);
				this.tasks = [];
			} finally {
				this.loadingTasks = false;
			}
		},
		// 映射任务优先级
		mapTaskPriority(priority) {
			const priorityMap = {
				'HIGH': 'high',
				'MEDIUM': 'medium',
				'LOW': 'low'
			};
			return priorityMap[priority] || 'medium';
		},
		// 获取优先级文本
		getPriorityText(priority) {
			const textMap = {
				'high': '高优先级',
				'medium': '中优先级',
				'low': '低优先级'
			};
			return textMap[priority] || '中优先级';
		},
		// 获取任务状态文本
		getTaskStatusText(status) {
			if (!status) return '进行中';
			const statusStr = String(status).toUpperCase();
			const statusMap = {
				'TODO': '待开始',
				'IN_PROGRESS': '进行中',
				'BLOCKED': '已阻塞',
				'DONE': '已完成',
				'COMPLETED': '已完成',
				'PENDING_REVIEW': '待审核'
			};
			return statusMap[statusStr] || '进行中';
		},
		// 获取任务状态键
		getTaskStatusKey(status) {
			if (!status) return 'in_progress';
			const statusStr = String(status).toUpperCase();
			const statusMap = {
				'TODO': 'todo',
				'IN_PROGRESS': 'in_progress',
				'BLOCKED': 'blocked',
				'DONE': 'done',
				'COMPLETED': 'done',
				'PENDING_REVIEW': 'pending_review'
			};
			return statusMap[statusStr] || 'in_progress';
		},
		// 获取纯任务标题（去除项目名称）
		getTaskTitleOnly(title) {
			if (!title) return '未命名任务';
			// 直接返回任务标题，不包含项目名称
			// 如果标题中包含了项目名称（例如："[项目名] 任务名"），可以在这里处理
			// 目前后端返回的title就是纯任务名称，直接返回即可
			return title;
		},
		// 格式化任务ID
		formatTaskId(taskId) {
			if (!taskId) return '#TASK-000';
			// 如果已经是格式化的ID（包含#），直接返回
			if (String(taskId).includes('#')) {
				return taskId;
			}
			// 否则格式化为 #TASK-{id}
			return `#TASK-${taskId}`;
		},
		// 格式化任务截止日期
		formatTaskDeadline(deadline) {
			if (!deadline) return '无截止日期';
			try {
				const date = new Date(deadline);
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				return `截止: ${year}-${month}-${day}`;
			} catch (e) {
				return `截止: ${deadline}`;
			}
		},
		// 截取任务描述，只显示12个字
		truncateDescription(description) {
			if (!description) return '';
			if (description.length <= 12) return description;
			return description.substring(0, 12) + '...';
		},
		// swiper切换事件处理
		onCalendarSwiperChange(e) {
			const currentIndex = e.detail.current;
			const direction = currentIndex - this.calendarSwiperIndex;
			
			// 向右滑动（切换到下一个月）
			if (direction === 1 || (currentIndex === 0 && this.calendarSwiperIndex === 2)) {
				this.changeMonth(1);
			}
			// 向左滑动（切换到上一个月）
			else if (direction === -1 || (currentIndex === 2 && this.calendarSwiperIndex === 0)) {
				this.changeMonth(-1);
			}
			
			// 重置swiper索引到中间位置，以便继续滑动
			this.$nextTick(() => {
				this.calendarSwiperIndex = 1;
			});
		},
		// 切换月份（正数表示下个月，负数表示上个月）
		changeMonth(direction) {
			if (direction > 0) {
				// 下一个月
			if (this.calendarMonth === 12) {
				this.calendarMonth = 1;
				this.calendarYear++;
			} else {
				this.calendarMonth++;
			}
			} else {
				// 上一个月
				if (this.calendarMonth === 1) {
					this.calendarMonth = 12;
					this.calendarYear--;
				} else {
					this.calendarMonth--;
				}
			}
		},
		// 年月选择器change事件
		onCalendarMonthChange(e) {
			const value = e.detail.value;
			const [year, month] = value.split('-').map(Number);
			this.calendarYear = year;
			this.calendarMonth = month;
			// 重置swiper索引
			this.calendarSwiperIndex = 1;
		},
		// 关闭任务详情弹窗
		closeTaskDetail() {
			console.log('closeTaskDetail called');
			this.showTaskDetail = false;
			this.$nextTick(() => {
				if (this.$refs.taskDetailPopup) {
					if (typeof this.$refs.taskDetailPopup.close === 'function') {
						this.$refs.taskDetailPopup.close();
					} else if (typeof this.$refs.taskDetailPopup.hide === 'function') {
						this.$refs.taskDetailPopup.hide();
					}
				}
			});
		},
		// 处理弹窗状态变化
		onPopupChange(e) {
			this.showTaskDetail = e.show;
		},
		// 跳转到任务详情
		goToTaskDetail(task) {
			console.log('goToTaskDetail called with task:', task);
			// 更新当前任务数据
			this.currentTask = { ...task };
			// 显示弹窗
			this.showTaskDetail = true;
			
			// 确保uni-popup组件已经初始化
			this.$nextTick(() => {
				console.log('In nextTick - showing popup');
				// 添加一个小的延迟确保DOM更新完成
				setTimeout(() => {
					if (this.$refs.taskDetailPopup) {
						console.log('Opening task detail popup');
						// 直接调用open方法打开弹窗
						if (typeof this.$refs.taskDetailPopup.open === 'function') {
							this.$refs.taskDetailPopup.open();
						} else if (typeof this.$refs.taskDetailPopup.show === 'function') {
							this.$refs.taskDetailPopup.show();
						}
					} else {
						console.error('taskDetailPopup ref not found or invalid');
					}
				}, 50);
			});
		},
		
		// 跳转到任务所属项目
		goToProject(projectId) {
			if (!projectId) return;
			
			// 关闭弹窗
			this.showTaskDetail = false;
			
			// 跳转到项目详情页
			uni.navigateTo({
				url: `/pages/project/ProjectDetail?id=${projectId}`
			});
		},
		
		// 点击日历日期
		onCalendarDayClick(day) {
			// 只处理有截止日期的日期
			if (!day.hasDeadline || !day.isCurrentMonth) return;
			
			// 使用day对象中的年月信息（swiper中不同月份的数据）
			const year = day.year || this.calendarYear;
			const month = day.month || this.calendarMonth;
			const date = day.date;
			
			// 保存选中的日期
			this.selectedDeadlineDate = { year, month, date };
			
			// 获取该日期截止的所有任务
			this.getDeadlineTasks(year, month, date);
			
			// 显示弹窗
			this.showDeadlineTasksPopup = true;
			
			// 确保uni-popup组件已经初始化
			this.$nextTick(() => {
				setTimeout(() => {
					if (this.$refs.deadlineTasksPopup) {
						if (typeof this.$refs.deadlineTasksPopup.open === 'function') {
							this.$refs.deadlineTasksPopup.open();
						} else if (typeof this.$refs.deadlineTasksPopup.show === 'function') {
							this.$refs.deadlineTasksPopup.show();
						}
					}
				}, 50);
			});
		},
		
		// 获取指定日期截止的任务
		getDeadlineTasks(year, month, date) {
			const tasks = Array.isArray(this.tasks) ? this.tasks : [];
			const deadlineTasks = [];
			
			tasks.forEach(task => {
				if (!task.deadline) return;
				try {
					const deadline = new Date(task.deadline);
					const taskYear = deadline.getFullYear();
					const taskMonth = deadline.getMonth() + 1;
					const taskDate = deadline.getDate();
					
					// 匹配选中的日期
					if (taskYear === year && taskMonth === month && taskDate === date) {
						deadlineTasks.push(task);
					}
				} catch (e) {
					console.warn('解析任务截止日期失败:', task.deadline, e);
				}
			});
			
			// 按优先级排序
			deadlineTasks.sort((a, b) => {
				const priorityWeight = { 'high': 3, 'medium': 2, 'low': 1 };
				return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
			});
			
			this.deadlineTasks = deadlineTasks;
		},
		
		// 格式化截止日期标题
		formatDeadlineDateTitle(dateInfo) {
			if (!dateInfo) return '任务截止日期';
			const { year, month, date } = dateInfo;
			return `${year}年${month}月${date}日 截止任务`;
		},
		
		// 关闭截止日期任务弹窗
		closeDeadlineTasksPopup() {
			this.showDeadlineTasksPopup = false;
			if (this.$refs.deadlineTasksPopup) {
				if (typeof this.$refs.deadlineTasksPopup.close === 'function') {
					this.$refs.deadlineTasksPopup.close();
				} else if (typeof this.$refs.deadlineTasksPopup.hide === 'function') {
					this.$refs.deadlineTasksPopup.hide();
				}
			}
		},
		
		// 处理截止日期弹窗状态变化
		onDeadlinePopupChange(e) {
			this.showDeadlineTasksPopup = e.show;
		},
		
		// 从截止日期弹窗跳转到任务详情
		goToTaskDetailFromDeadline(task) {
			// 先关闭截止日期弹窗
			this.closeDeadlineTasksPopup();
			// 然后打开任务详情弹窗
			setTimeout(() => {
				this.goToTaskDetail(task);
			}, 300);
		},

		// 加载当前用户摘要信息
		async loadCurrentUserSummary() {
			// 设置默认值
			this.currentUserName = '用户';
			this.currentUserAvatar = '/static/images/default-avatar.png';

			try {
				// 尝试从本地存储获取用户信息
				try {
					const userInfo = uni.getStorageSync(config.userInfoKey);
					if (userInfo) {
						this.currentUserName = userInfo.nickname || userInfo.username || '用户';
						const cachedAvatar =
							userInfo.avatar ||
							userInfo.avatarUrl ||
							userInfo.avatar_url ||
							userInfo.avatarData;
						if (cachedAvatar) {
							this.currentUserAvatar = cachedAvatar;
						}
					}
				} catch (e) {
					console.warn('从本地存储获取用户信息失败:', e);
				}

				// 并行加载用户信息和头像
				const [userRes, avatarRes] = await Promise.all([
					getCurrentUser().catch(e => {
						console.warn('获取用户信息失败:', e);
						return null;
					}),
					getMyAvatar().catch(e => {
						console.warn('获取用户头像失败:', e);
						return null;
					})
				]);

				// 处理用户数据
				if (userRes) {
					const userData = userRes.data || userRes;
					if (userData) {
						const newName = userData.username || userData.nickname || userData.name || '用户';
						console.log('设置用户名:', newName);
						this.currentUserName = newName;

						// 如果接口里已经带了头像地址，优先使用
						const userAvatarFromProfile =
							userData.avatar ||
							userData.avatarUrl ||
							userData.avatarURL ||
							userData.avatar_url ||
							userData.headImg ||
							userData.headImgUrl;
						if (userAvatarFromProfile && !this.currentUserAvatar) {
							console.log('从用户信息中设置头像:', userAvatarFromProfile);
							this.currentUserAvatar = userAvatarFromProfile;
						}

						// 保存到本地存储（统一使用 config.userInfoKey）
						// 重要：必须保留原有的所有字段（如 id, email, name, role 等），只更新需要更新的字段
						try {
							const existingUserInfo = uni.getStorageSync(config.userInfoKey) || {};
							uni.setStorageSync(config.userInfoKey, {
								...existingUserInfo, // 保留原有所有字段
								id: userData.id || existingUserInfo.id, // 确保ID不被丢失
								userId: userData.userId || userData.id || existingUserInfo.userId || existingUserInfo.id, // 兼容userId字段
								nickname: newName,
								username: userData.username || userData.name || existingUserInfo.username,
								name: userData.name || userData.username || existingUserInfo.name,
								email: userData.email || existingUserInfo.email, // 保留邮箱
								role: userData.role || existingUserInfo.role, // 保留角色
								avatar: this.currentUserAvatar,
								avatarData: userData.avatarData || existingUserInfo.avatarData // 保留avatarData
							});
						} catch (e) {
							console.warn('保存用户信息到本地存储失败:', e);
						}
					}
				}

				// 处理头像数据
				if (avatarRes) {
					const avatarData = avatarRes.data || avatarRes;
					if (avatarData) {
						let avatarUrl = '';

						// 兼容多种后端返回结构
						if (typeof avatarData === 'string') {
							avatarUrl = avatarData;
						} else {
							avatarUrl =
								avatarData.cdnUrl ||
								avatarData.cdn_url ||
								avatarData.avatarUrl ||
								avatarData.avatar_url ||
								avatarData.url ||
								(avatarData.data &&
									(avatarData.data.cdnUrl ||
										avatarData.data.cdn_url ||
										avatarData.data.avatarUrl ||
										avatarData.data.avatar_url ||
										avatarData.data.url)) ||
								'';

							// 新后端 AvatarDTO 返回 avatarData(纯Base64) + contentType，需要在前端拼接成 data URL
							if (!avatarUrl) {
								const rawAvatar =
									avatarData.avatarData ||
									(avatarData.data && avatarData.data.avatarData) ||
									'';
								const contentType =
									avatarData.contentType ||
									(avatarData.data && avatarData.data.contentType) ||
									'image/jpeg';

								if (rawAvatar) {
									// 如果后端已经返回 data: 开头的完整URL，直接用；否则按 contentType 拼接
									avatarUrl = rawAvatar.startsWith('data:')
										? rawAvatar
										: `data:${contentType};base64,${rawAvatar}`;
								}
							}
						}

						if (avatarUrl) {
							console.log('设置用户头像:', avatarUrl);
							this.currentUserAvatar = avatarUrl;
						}
					}
				} else {
					// 如果头像接口调用失败（比如403错误），静默处理，不影响页面显示
					console.log('头像接口调用失败，使用默认头像 - 可能是后端权限配置问题');
				}

				// 如果头像接口没有返回可用地址，但用户信息里有头像，也用上
				if (
					(!this.currentUserAvatar || this.currentUserAvatar === '/static/images/default-avatar.png') &&
					userRes
				) {
					const userData = userRes.data || userRes;
					const fallbackAvatar =
						userData?.avatar ||
						userData?.avatarUrl ||
						userData?.avatar_url ||
						userData?.avatarURL;
					if (fallbackAvatar) {
						console.log('使用用户信息中的头像作为兜底:', fallbackAvatar);
						this.currentUserAvatar = fallbackAvatar;
					}
				}

				// 兜底：把最终头像写回本地缓存，供首页和其他页面复用
				// 重要：必须保留原有的所有字段（如 id, email, name, role 等），只更新头像相关字段
				try {
					const cached = uni.getStorageSync(config.userInfoKey) || {};
					uni.setStorageSync(config.userInfoKey, {
						...cached, // 保留原有所有字段
						avatar: this.currentUserAvatar,
						avatarUrl: this.currentUserAvatar,
						// 为兼容个人信息页(user.vue)，同时写入 avatarData 字段
						avatarData: this.currentUserAvatar
						// 不覆盖其他字段，确保 id, email, name, role 等关键信息不被丢失
					});

				} catch (e) {
					console.warn('写入头像缓存失败:', e);
				}
			} catch (e) {
				console.error('加载用户信息或头像失败:', e);
				// 即使失败也显示默认值
				this.currentUserName = '用户';
				this.currentUserAvatar = '/static/images/default-avatar.png';
			}
		}
	}
}
</script>

<style lang="scss" scoped>
@import '@/common/styles/common.scss';
@import '@/static/styles/home.scss';
</style>