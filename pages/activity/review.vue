<template>
	<view class="review-page">
		<view class="top-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="title-row">
				<text class="page-title">我的任务</text>
				<text class="muted-text">我的活动</text>
			</view>
			<view class="top-actions">
				<view class="filter-input" @click="toggleSortOrder">
					<uni-icons type="calendar" size="18" color="#999"></uni-icons>
					<text class="filter-placeholder">
						按截止时间 {{ sortOrder === 'asc' ? '↑' : '↓' }}
					</text>
				</view>
			</view>
			<view class="task-tabs">
				<view
					v-for="tab in taskTabs"
					:key="tab.key"
					class="task-tab"
					:class="{ active: currentTaskTab === tab.key }"
					@click="switchTaskTab(tab.key)"
				>
					<text class="tab-label">{{ tab.label }}</text>
					<!-- red dot badge on white box top-right -->
					<view v-if="tab.key === 'review' && pendingCount > 0" class="tab-badge-dot"></view>
				</view>
			</view>
		</view>

		<scroll-view class="content" scroll-y :style="{ marginTop: contentOffset + 'px' }">
			<!-- 我提交的任务状态筛选（放在统计卡片上方） -->
			<view v-if="currentTaskTab === 'submitted'" class="status-filter-row">
				<view
					v-for="item in [
						{ key: 'all', label: '全部' },
						{ key: 'PENDING', label: '已提交' },
						{ key: 'REJECTED', label: '被打回' },
						{ key: 'APPROVED', label: '已完成' }
					]"
					:key="item.key"
					class="status-chip"
					:class="{ active: statusFilter === item.key }"
					@click="setStatusFilter(item.key)"
				>
					<text>{{ item.label }}</text>
				</view>
			</view>

			<!-- 发布任务状态筛选（放在统计卡片上方） -->
			<view v-if="currentTaskTab === 'published'" class="status-filter-row">
				<view
					v-for="item in [
						{ key: 'todo', label: '待接取' },
						{ key: 'in_progress', label: '已接取' }
					]"
					:key="item.key"
					class="status-chip"
					:class="{ active: publishedFilter === item.key }"
					@click="setPublishedFilter(item.key)"
				>
					<text>{{ item.label }}</text>
				</view>
			</view>

			<view class="stats-row">
				<view
					:class="[
						'stat-card', 
						'stat-card-alert',
						currentTaskTab === 'review' ? 'stat-card-red' : 
						currentTaskTab === 'submitted' ? 'stat-card-green' : 
						currentTaskTab === 'approved' ? 'stat-card-gray' : 
						'stat-card-blue'
					]"
				>
					<text class="stat-value">{{ currentTaskTab === 'review' ? pendingCount : visibleTasks.length }}</text>
					<text class="stat-label">
						{{ currentTaskTab === 'review' ? '待审核' : currentTaskTab === 'submitted' ? (statusFilter === 'all' ? '全部' : getStatusFilterLabel(statusFilter)) : currentTaskTab === 'published' ? getPublishedFilterLabel(publishedFilter) : '已处理' }}
					</text>
				</view>
			</view>
			<view class="card-list">
				<view class="task-card" v-for="(item, index) in visibleTasks" :key="index">
					<view class="task-header">
						<view class="task-info">
							<text class="member-name">{{ ['review','submitted','published'].includes(currentTaskTab) ? item.title : item.name }}</text>
							<text class="task-title">{{ ['review','submitted','published'].includes(currentTaskTab) ? item.name : item.title }}</text>
							<view class="task-meta-row">
								<view class="pill">提交于 {{ item.submitted }}</view>
								<view v-if="item.deadline" class="pill">截止 {{ item.deadline }}</view>
								<view class="pill mild">{{ item.projectName || '未知项目' }}</view>
							</view>
						</view>
						<view
							class="status-pill"
							:class="statusClass(currentTaskTab, item)"
						>
							{{ statusText(currentTaskTab, item) }}
						</view>
					</view>
					<view class="task-footer">
						<view class="assignees">
							<view class="avatar">{{ ['review','submitted','published'].includes(currentTaskTab) ? (item.title || '').slice(0,1) : (item.name || '').slice(0,1) }}</view>
							<text class="assignee-name">{{ item.name }}</text>
						</view>
						<view
							v-if="currentTaskTab === 'review'"
							class="primary-btn"
							@click.stop="openReview(item)"
						>
							审核
						</view>
						<view
							v-else
							class="secondary-btn"
							@click.stop="viewProject(item)"
						>
							{{ actionText(currentTaskTab) }}
						</view>
					</view>
				</view>
			</view>
			<view class="bottom-space"></view>
		</scroll-view>
		<loading-spinner v-if="loading" :blend="true" />

		<view v-if="showModal" class="modal-mask" @click="closeModal"></view>
		<view v-if="showModal" class="modal">
			<view class="modal-header gradient">
				<view>
					<text class="modal-title">审核任务提交</text>
					<text class="modal-sub">{{ selectedTask.projectName || '—' }}</text>
				</view>
				<uni-icons type="closeempty" size="22" color="#fff" @click="closeModal"></uni-icons>
			</view>

			<view class="modal-body">
				<view class="grid">
					<view class="info-card">
						<text class="info-label">任务标题</text>
						<text class="info-value">{{ selectedTask.title }}</text>
					</view>
					<view class="info-card">
						<text class="info-label">所属项目</text>
						<text class="info-value">{{ selectedTask.projectName || '—' }}</text>
					</view>
					<view class="info-card">
						<text class="info-label">提交人</text>
						<text class="info-value">{{ selectedTask.name }}</text>
					</view>
					<view class="info-card">
						<text class="info-label">提交时间</text>
						<text class="info-value">{{ selectedTask.submitted || '—' }}</text>
					</view>
					<view class="info-card">
						<text class="info-label">实际工时</text>
						<text class="info-value">{{ selectedTask.actualWorktime ? selectedTask.actualWorktime + ' 小时' : '—' }}</text>
					</view>
				</view>

				<view class="section-card">
					<text class="section-title">提交说明</text>
					<view class="description-box">{{ selectedTask.description || '—' }}</view>
				</view>

				<view class="section-card" v-if="selectedTask.attachments && selectedTask.attachments.length">
					<view class="section-row">
						<text class="section-title">附件 ({{ selectedTask.attachments.length }})</text>
					</view>
					<view
						class="file-row"
						v-for="(file, idx) in selectedTask.attachments"
						:key="idx"
						@click="downloadAttachment(file)"
					>
						<uni-icons type="paperclip" size="18" color="#327aff"></uni-icons>
						<text class="file-name">{{ getFileName(file) }}</text>
						<uni-icons type="download" size="18" color="#327aff"></uni-icons>
					</view>
				</view>

				<view class="section-card">
					<text class="section-title">审核意见 (选填)</text>
					<textarea
						class="textarea"
						placeholder="请填写审核意见，拒绝时建议说明原因..."
						:maxlength="2000"
						v-model="reviewComment"
					></textarea>
					<view class="textarea-count">{{ reviewComment.length }}/2000</view>
				</view>

				<view class="section-card">
					<text class="section-title required">审核结果</text>
					<view class="radio-group">
						<label class="radio-card" :class="{ active: reviewResult === 'approve' }" @click="setResult('approve')">
							<view class="radio-left">
								<view class="radio-dot filled success" v-if="reviewResult === 'approve'"></view>
								<view class="radio-dot" v-else></view>
								<view class="radio-text">
									<text class="radio-title">批准通过</text>
									<text class="radio-desc">同意此次提交</text>
								</view>
							</view>
							<uni-icons type="checkbox" size="20" color="#52c41a" v-if="reviewResult === 'approve'"></uni-icons>
						</label>
						<label class="radio-card" :class="{ active: reviewResult === 'reject' }" @click="setResult('reject')">
							<view class="radio-left">
								<view class="radio-dot filled danger" v-if="reviewResult === 'reject'"></view>
								<view class="radio-dot" v-else></view>
								<view class="radio-text">
									<text class="radio-title">拒绝退回</text>
									<text class="radio-desc">不同意此次提交</text>
								</view>
							</view>
							<uni-icons type="close" size="20" color="#f5222d" v-if="reviewResult === 'reject'"></uni-icons>
						</label>
					</view>
				</view>

				<view class="modal-footer">
					<view class="action-row">
						<button class="btn ghost" @click="closeModal">取消</button>
						<button class="btn primary" @click="submitReview()">确定</button>
					</view>
				</view>
			</view>
		</view>

		<!-- 提交详情弹窗 -->
		<view v-if="showSubmissionModal" class="modal-mask" @click="closeSubmissionModal"></view>
		<view v-if="showSubmissionModal" class="modal">
			<view class="modal-header gradient">
				<view>
					<text class="modal-title">提交详情</text>
					<text class="modal-sub">{{ selectedTask.projectName || '—' }}</text>
				</view>
				<uni-icons type="closeempty" size="22" color="#fff" @click="closeSubmissionModal"></uni-icons>
			</view>

			<view class="modal-body">
				<view class="grid">
					<view class="info-card">
						<text class="info-label">任务标题</text>
						<text class="info-value">{{ selectedTask.title }}</text>
					</view>
					<view class="info-card">
						<text class="info-label">所属项目</text>
						<text class="info-value">{{ selectedTask.projectName || '—' }}</text>
					</view>
					<view class="info-card">
						<text class="info-label">提交人</text>
						<text class="info-value">{{ selectedTask.name }}</text>
					</view>
					<view class="info-card">
						<text class="info-label">提交时间</text>
						<text class="info-value">{{ selectedTask.submitted || '—' }}</text>
					</view>
					<view class="info-card full-width">
						<text class="info-label">任务描述</text>
						<text class="info-value">{{ selectedTask.description || '暂无描述' }}</text>
					</view>
					<view class="info-card full-width" v-if="selectedTask.content">
						<text class="info-label">提交内容</text>
						<text class="info-value">{{ selectedTask.content }}</text>
					</view>
					<view class="info-card full-width" v-if="selectedTask.remark">
						<text class="info-label">备注说明</text>
						<text class="info-value">{{ selectedTask.remark }}</text>
					</view>
					<view class="info-card">
						<text class="info-label">审核状态</text>
						<text class="info-value" :class="'status-' + (selectedTask.statusKey || 'pending')">
							{{ selectedTask.statusText || '待审核' }}
						</text>
					</view>
					<view class="info-card" v-if="selectedTask.reviewTime">
						<text class="info-label">审核时间</text>
						<text class="info-value">{{ selectedTask.reviewTime }}</text>
					</view>
					<view class="info-card" v-if="selectedTask.reviewer">
						<text class="info-label">审核人</text>
						<text class="info-value">{{ selectedTask.reviewer }}</text>
					</view>
				</view>

				<view class="modal-footer">
					<view class="action-row">
						<button class="btn primary" @click="closeSubmissionModal">关闭</button>
					</view>
				</view>
			</view>
		</view>

		<!-- 项目详情弹窗 -->
		<view v-if="showProjectModal" class="modal-mask" @click="closeProjectModal"></view>
		<view v-if="showProjectModal" class="modal">
			<view class="modal-header gradient">
				<view>
					<text class="modal-title">项目详情</text>
					<text class="modal-sub">{{ selectedTask.projectName || '—' }}</text>
				</view>
				<uni-icons type="closeempty" size="22" color="#fff" @click="closeProjectModal"></uni-icons>
			</view>

			<view class="modal-body">
				<view class="grid">
					<view class="info-card">
						<text class="info-label">项目名称</text>
						<text class="info-value">{{ selectedTask.projectName || '—' }}</text>
					</view>
					<view class="info-card">
						<text class="info-label">项目ID</text>
						<text class="info-value">{{ selectedTask.projectId || '—' }}</text>
					</view>
					<view class="info-card">
						<text class="info-label">任务标题</text>
						<text class="info-value">{{ selectedTask.title }}</text>
					</view>
					<view class="info-card">
						<text class="info-label">任务状态</text>
						<text class="info-value" :class="'status-' + (selectedTask.statusKey || 'pending')">
							{{ selectedTask.statusText || '待接取' }}
						</text>
					</view>
					<view class="info-card full-width">
						<text class="info-label">任务描述</text>
						<text class="info-value">{{ selectedTask.description || '暂无描述' }}</text>
					</view>
					<view class="info-card" v-if="selectedTask.deadline">
						<text class="info-label">截止时间</text>
						<text class="info-value">{{ selectedTask.deadline }}</text>
					</view>
					<view class="info-card" v-if="selectedTask.priority">
						<text class="info-label">优先级</text>
						<text class="info-value" :class="'priority-' + (selectedTask.priority || 'medium')">
							{{ getPriorityText(selectedTask.priority) }}
						</text>
					</view>
				</view>

				<view class="modal-footer">
					<view class="action-row">
						<button class="btn ghost" @click="closeProjectModal">关闭</button>
						<button class="btn primary" @click="goToProject">查看项目</button>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { getPendingSubmissionsForReview, getMySubmissions, reviewSubmission, getSubmissionsByReviewer } from '@/api/taskSubmission.js'
import { getMyCreatedTasks, getTaskDetail } from '@/api/task.js'
import { getUserById } from '@/api/user.js'
import { batchSendMessage } from '@/api/unipush.js'
import uniId from '@/utils/uniId.js'
import { getCurrentUser } from '@/utils/auth.js'
import config from '@/utils/config.js'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

export default {
	components: { LoadingSpinner },
		data() {
		const statusBarHeight = uni.getSystemInfoSync()?.statusBarHeight || 20;
		return {
			statusBarHeight,
			sortOrder: 'asc', // asc 升序，desc 降序
			statusFilter: 'all', // 提交任务状态筛选
			taskTabs: [
				{ key: 'review', label: '审核' },
				{ key: 'submitted', label: '提交' },
				{ key: 'published', label: '发布' },
				{ key: 'approved', label: '已处理' }
			],
			currentTaskTab: 'review',
			loading: false,
			// 发布任务的子筛选器
			publishedFilter: 'todo', // todo: 待接取, in_progress: 已接取
			// 数据缓存相关
			dataCache: {
				review: { data: [], timestamp: 0, ttl: 5 * 60 * 1000 }, // 5分钟缓存
				submitted: { data: [], timestamp: 0, ttl: 5 * 60 * 1000 },
				published: { data: [], timestamp: 0, ttl: 5 * 60 * 1000 },
				approved: { data: [], timestamp: 0, ttl: 5 * 60 * 1000 }
			},
			tasks: {
				review: [],
				submitted: [],
				published: [],
				approved: []
			},
			showModal: false,
			showSubmissionModal: false, // 提交详情弹窗
			showProjectModal: false, // 项目详情弹窗
			selectedTask: {},
			reviewComment: '',
			reviewResult: 'approve'
		};
	},
	computed: {
		contentOffset() {
			// 计算顶部固定栏的总高度：状态栏高度 + 标题行(44px) + 筛选行(44px) + 标签栏(60px) + 内边距
			return this.statusBarHeight + 44 + 44 + 60 + 20;
		},
		secondStat() {
			if (this.currentTaskTab === 'submitted') {
				return this.submittedCounts.notDone;
			}
			if (this.currentTaskTab === 'published') {
				if (this.publishedFilter === 'todo') {
					return this.publishedCounts.todo;
				} else if (this.publishedFilter === 'in_progress') {
					return this.publishedCounts.inProgress;
				}
				return this.publishedCounts.submitted;
			}
			// review tab：已处理
			return this.tasks.review.filter(item => item.statusKey && item.statusKey !== 'pending').length;
		},
		submittedCounts() {
			const list = this.tasks.submitted || [];
			return {
				submitted: list.filter(i => i.statusKey === 'PENDING').length,
				notDone: list.filter(i => i.statusKey === 'IN_PROGRESS').length
			};
		},
		publishedCounts() {
			const list = this.tasks.published || [];
			const todo = list.filter(i => (i.statusKey || 'TODO') === 'TODO').length;
			const inProgress = list.filter(i => i.statusKey === 'IN_PROGRESS').length;
			const submitted = list.filter(i => i.statusKey === 'submitted').length;
			return {
				todo,
				inProgress,
				submitted,
				notSubmitted: Math.max(list.length - submitted, 0)
			};
		},
		visibleTasks() {
			let list = this.tasks[this.currentTaskTab] || [];
			// 如果是 approved 标签页，直接返回已处理任务列表
			if (this.currentTaskTab === 'approved') {
				return list;
			}

			// 审核任务只显示待审核的提交（已移除筛选逻辑）

			// 我提交的任务按状态筛选
			if (this.currentTaskTab === 'submitted' && this.statusFilter !== 'all') {
				list = list.filter(item => item.statusKey === this.statusFilter);
			}

			// 发布任务按状态筛选
			if (this.currentTaskTab === 'published') {
				if (this.publishedFilter === 'todo') {
					list = list.filter(item => (item.statusKey || 'TODO') === 'TODO');
				} else if (this.publishedFilter === 'in_progress') {
					list = list.filter(item => (item.statusKey || 'TODO') === 'IN_PROGRESS');
				}
			}
			// 按截止时间排序
			const sorted = [...list].sort((a, b) => {
				const t1 = a.deadline ? new Date(a.deadline).getTime() : 0;
				const t2 = b.deadline ? new Date(b.deadline).getTime() : 0;
				return this.sortOrder === 'asc' ? t1 - t2 : t2 - t1;
			});
			return sorted;
		},
		pendingCount() {
			const list = this.tasks.review || [];
			return list.filter(i => (i.statusKey || 'pending') === 'pending').length;
		},
		reviewStats() {
			const list = this.tasks.review || [];
			const now = new Date();
			const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7天内

			return {
				pending: list.filter(i => (i.statusKey || 'pending') === 'pending').length,
				processed: list.filter(i => (i.statusKey || 'pending') !== 'pending').length
			};
		}
	},
	// 页面初始化时就尝试从缓存恢复数据
	created() {
		this.tryRestoreFromCache();
	},

	onShow() {
		// 如果还没有数据，才尝试加载
		if (!this.tasks[this.currentTaskTab] || this.tasks[this.currentTaskTab].length === 0) {
			this.loadDataFromCacheOrRemote();
		}
	},

	// 页面卸载时清除缓存，避免内存泄漏
	onUnload() {
		this.clearAllCache();
	},

	// 下拉刷新处理
	onPullDownRefresh() {
		console.log('🔄 下拉刷新，清除缓存并重新加载');
		this.clearCache(this.currentTaskTab);
		this.loadCurrentTab(true);
	},

	// 页面隐藏时不清除缓存（保持数据）
	onHide() {
		// 页面隐藏时保持缓存，避免每次切换都重新加载
	},

	methods: {
		// 检查缓存是否有效
		isCacheValid(tabKey) {
			const cache = this.dataCache[tabKey];
			if (!cache || !cache.data || cache.data.length === 0) {
				return false;
			}

			const now = Date.now();
			return (now - cache.timestamp) < cache.ttl;
		},

		// 更新缓存
		updateCache(tabKey, data) {
			// 确保TTL存在，否则使用默认值
			const ttl = this.dataCache[tabKey]?.ttl || 5 * 60 * 1000;
			this.dataCache[tabKey] = {
				data: [...data], // 深拷贝
				timestamp: Date.now(),
				ttl: ttl
			};
		},

		// 清除指定标签页的缓存
		clearCache(tabKey) {
			this.dataCache[tabKey] = { data: [], timestamp: 0, ttl: this.dataCache[tabKey].ttl };
		},

		// 清除所有缓存
		clearAllCache() {
			Object.keys(this.dataCache).forEach(key => {
				this.clearCache(key);
			});
		},

		// 尝试从缓存恢复数据
		tryRestoreFromCache() {
			// 检查所有标签页的缓存，如果有效就恢复
			Object.keys(this.dataCache).forEach(tabKey => {
				if (this.isCacheValid(tabKey)) {
					console.log(`📋 页面初始化时恢复缓存数据: ${tabKey}`);
					this.tasks[tabKey] = this.dataCache[tabKey].data;
				}
			});
		},

		// 从缓存或远程加载数据
		loadDataFromCacheOrRemote() {
			// 首先检查缓存是否有效
			if (this.isCacheValid(this.currentTaskTab)) {
				console.log(`📋 使用缓存数据: ${this.currentTaskTab}`);
				// 直接从缓存恢复数据
				this.tasks[this.currentTaskTab] = this.dataCache[this.currentTaskTab].data;
				return;
			}

			// 缓存无效，重新加载数据
			console.log(`📥 缓存无效或过期，重新加载: ${this.currentTaskTab}`);
			this.loadCurrentTab(true);
		},
		async loadCurrentTab(forceRefresh = false) {
			if (this.loading) return;

			// 检查缓存是否有效
			if (!forceRefresh && this.isCacheValid(this.currentTaskTab)) {
				console.log(`📋 使用缓存数据: ${this.currentTaskTab}`);
				this.tasks[this.currentTaskTab] = this.dataCache[this.currentTaskTab].data;
				return;
			}

			this.loading = true;
			try {
				if (this.currentTaskTab === 'review') {
					await this.loadReviewTasks();
				} else if (this.currentTaskTab === 'submitted') {
					await this.loadMySubmissions();
				} else if (this.currentTaskTab === 'published') {
					await this.loadMyCreatedTasks();
				} else if (this.currentTaskTab === 'approved') {
					await this.loadApprovedTasks();
				}
			} catch (e) {
				console.error('加载任务失败:', e);
				uni.showToast({ title: '加载失败', icon: 'none' });
			} finally {
				this.loading = false;
				uni.stopPullDownRefresh();
			}
		},
		async loadReviewTasks() {
			// 审核标签页只显示待审核的提交
			const res = await getPendingSubmissionsForReview({ page: 0, size: 50 });
			const list = this.extractList(res);
			this.tasks.review = list.map(item => this.mapSubmission(item, 'review'));
			// 更新缓存
			this.updateCache('review', this.tasks.review);
		},
		async loadMySubmissions() {
			const res = await getMySubmissions({ page: 0, size: 50 });
			const list = this.extractList(res);
			this.tasks.submitted = list.map(item => this.mapSubmission(item, 'submitted'));
			// 更新缓存
			this.updateCache('submitted', this.tasks.submitted);
		},
		// loadMyUnsubmittedTasks removed — IN_PROGRESS filter removed
		async loadApprovedTasks() {
			try {
				console.log('[loadApprovedTasks] 调用 by-reviewer 接口');
				const res = await getSubmissionsByReviewer({ page: 0, size: 100 });
				console.log('[loadApprovedTasks] by-reviewer 响应:', res);
				const list = this.extractList(res);
				// 将后端返回的已审核历史映射为 approved 列表
				this.tasks.approved = list.map(item => {
					const mapped = this.mapSubmission(item, 'approved');
					// 标记为已处理
					mapped.statusKey = 'approved';
					mapped.statusText = '已处理';
					return mapped;
				});
				// 更新缓存
				this.updateCache('approved', this.tasks.approved);
			} catch (e) {
				console.error('加载已处理任务失败:', e);
				uni.showToast({ title: '加载已处理任务失败', icon: 'none' });
				this.tasks.approved = [];
			}
		},
		async loadMyCreatedTasks() {
			const res = await getMyCreatedTasks(0, 100);
			console.log('loadMyCreatedTasks 原始响应:', res);
			const list = this.extractList(res);
			console.log('loadMyCreatedTasks 提取的列表:', list);
			this.tasks.published = list.map(item => {
				const deadline = item.dueDate || item.taskDueDate || item.deadline;
				// 根据TaskStatus.java的枚举值设置正确的状态
				const statusKey = item.status || item.taskStatus || 'TODO';
				let statusText = '待接取';
				if (statusKey === 'IN_PROGRESS') {
					statusText = '已接取';
				} else if (statusKey === 'DONE') {
					statusText = '已完成';
				} else if (statusKey === 'BLOCKED') {
					statusText = '已阻塞';
				} else if (statusKey === 'PENDING_REVIEW') {
					statusText = '待审核';
				}

				// 调试项目名称映射
				const mappedProjectName = item.projectName || item.projectTitle || item.project?.name || item.project?.title || '未知项目';
				console.log('项目名称映射:', {
					original: item.projectName,
					mapped: mappedProjectName,
					item: item
				});

				return {
					id: item.id,
					title: item.title || item.taskTitle || '未命名任务',
					name: item.creatorName || item.creator || '我',
					submitted: this.formatDate(item.createdAt || item.createTime),
					deadline: deadline ? this.formatDate(deadline) : '',
					description: item.description || '',
					statusText: statusText,
					statusKey: statusKey,
					projectName: mappedProjectName,
					projectId: item.projectId || item.project?.id || item.projectId
				};
			});
			// 更新缓存
			this.updateCache('published', this.tasks.published);
		},
		extractList(res) {
			if (!res) return [];
			if (Array.isArray(res.data?.content)) return res.data.content;
			if (Array.isArray(res.content)) return res.content;
			if (Array.isArray(res.data)) return res.data;
			if (Array.isArray(res)) return res;
			return [];
		},
		mapSubmission(item, tab) {
			const deadline = item.taskDueDate || item.dueDate || item.deadline;
			// 支持更多后端字段名：status, status_value, statusValue, taskStatus, task_status
			const statusRaw = String(item.status || item.reviewStatus || item.submissionStatus || '').toUpperCase();
			const statusValue = String(item.status || item.status_value || item.statusValue || item.taskStatus || item.task_status || '').toUpperCase();
			let statusKey = 'pending';
			let statusText = '待审核';
			if (tab === 'submitted') {
				// 优先使用审核状态判断（submission.reviewStatus）
				if (statusRaw.includes('REJECT')) {
					statusKey = 'REJECTED';
					statusText = '被打回';
				} else if (statusRaw.includes('PENDING')) {
					statusKey = 'PENDING';
					statusText = '已提交';
				} else if (statusRaw.includes('APPROVED') || statusRaw.includes('DONE')) {
					statusKey = 'APPROVED';
					statusText = '已完成';
				} else {
				// 我们将 IN_PROGRESS 的判断统一交由后端提供（/my-unsubmitted）。
				// 这里不再基于客户端字段做 IN_PROGRESS 的判断，默认视为已提交/待审核
				statusKey = 'PENDING';
				statusText = '已提交';
				}
			}
			const submitterName = this.extractSubmitterName(item);
			// 如果该提交已经被审核为通过，并且审核人是当前用户，且当前映射用于审核列表，则标记为已处理（processed）
			if (tab === 'review') {
				try {
					const currentUser = this.getCurrentUserId();
					const reviewStatusRaw = String(item.reviewStatus || item.review_status || '').toUpperCase();
					const reviewerId = item.reviewerId || item.reviewer_id || item.reviewer;
					if (reviewStatusRaw.includes('APPROVED') && reviewerId && String(reviewerId) === String(currentUser)) {
						statusKey = 'processed';
						statusText = '已处理';
					}
				} catch (e) {
					// ignore
				}
			}


			return {
				id: item.id || item.submissionId,
				submissionId: item.id || item.submissionId,
				taskId: item.taskId || item.task_id || item.task?.id || null,
				title: item.taskTitle || item.title || '未命名任务',
				name: submitterName || '未知提交人',
				submitted: this.formatDate(item.submissionTime || item.createdAt || item.createTime),
				deadline: deadline ? this.formatDate(deadline) : '',
				description: item.submissionContent || item.description || '',
				statusText,
				statusKey,
				// 保留 reviewer 信息用于本地筛选
				reviewerId: item.reviewerId || item.reviewer_id || (item.reviewer && (item.reviewer.id || item.reviewer.userId || item.reviewerId)) || null,
				reviewStatus: item.reviewStatus || item.review_status || null,
				projectName: item.projectName || item.projectTitle || item.project?.name || item.project?.title || '未知项目',
				projectId: item.projectId || item.project?.id || item.projectId,
				actualWorktime: item.actualWorktime || item.actualHours || item.worktime || null,
				attachments: item.attachmentUrls || item.attachments || []
			};
		},
		extractSubmitterName(item) {
			const fromDirect =
				item.submitterName ||
				item.submitterUsername ||
				item.creatorName ||
				item.creator ||
				item.submitter;
			// 如果 submitter 是对象，取常见字段
			if (fromDirect && typeof fromDirect === 'object') {
				return (
					fromDirect.name ||
					fromDirect.username ||
					fromDirect.nickname ||
					fromDirect.email ||
					fromDirect.id ||
					''
				);
			}
			// 字符串或其它类型
			if (fromDirect) return String(fromDirect);
			return '';
		},
		formatDate(dateStr) {
			if (!dateStr) return '';
			const d = new Date(dateStr);
			if (isNaN(d.getTime())) return dateStr;
			const y = d.getFullYear();
			const m = String(d.getMonth() + 1).padStart(2, '0');
			const day = String(d.getDate()).padStart(2, '0');
			const hh = String(d.getHours()).padStart(2, '0');
			const mm = String(d.getMinutes()).padStart(2, '0');
			return `${y}-${m}-${day} ${hh}:${mm}`;
		},
		/**
		 * 获取当前登录用户ID
		 * 统一使用全局 auth 工具中通过 config.userInfoKey 保存的用户信息
		 */
		getCurrentUserId() {
			try {
				const info = getCurrentUser && typeof getCurrentUser === 'function'
					? getCurrentUser()
					: null;
				if (!info) return null;
				return info.id ? String(info.id) : null;
			} catch (e) {
				return null;
			}
		},
		getFileName(path) {
			if (!path) return '';
			try {
				return decodeURIComponent(path).split('/').pop();
			} catch (e) {
				return String(path).split('/').pop();
			}
		},
		downloadAttachment(fileUrl) {
			if (!fileUrl) return;
			try {
				const base = (config && config.baseURL) ? String(config.baseURL).replace(/\/+$/, '') : '';
				const encodedFileUrl = encodeURIComponent(fileUrl);
				const token = uni.getStorageSync(config.tokenKey);
				let downloadUrl = `${base}/zhiyan/projects/tasks/submissions/files/download?fileUrl=${encodedFileUrl}`;
				if (token) {
					downloadUrl += `&token=${encodeURIComponent(token)}`;
				}

				uni.downloadFile({
					url: downloadUrl,
					success: res => {
						if (res.statusCode === 200) {
							uni.openDocument({
								filePath: res.tempFilePath
							});
						} else {
							uni.showToast({ title: '下载失败', icon: 'none' });
						}
					},
					fail: () => {
						uni.showToast({ title: '下载失败', icon: 'none' });
					}
				});
			} catch (e) {
				uni.showToast({ title: '下载失败', icon: 'none' });
			}
		},
		actionText(tab) {
			if (tab === 'submitted') {
				return '查看提交';
			}
			if (tab === 'published') {
				return '查看项目';
			}
			if (tab === 'completed') {
				return '查看结果';
			}
			return '查看';
		},
		statusText(tab, item) {
			if (tab === 'review') {
				return item.statusText || '待审核';
			}
			if (tab === 'submitted') {
				return item.statusText || '审核中';
			}
			if (tab === 'published') {
				return item.statusText || '待开始';
			}
			// completed
			return item.statusText || '已完成';
		},
		statusClass(tab, item) {
			if (tab === 'review') {
				const key = item.statusKey || 'pending';
				if (key === 'processed' || key === 'done') return 'done';
				return 'waiting';
			}
			const key = item.statusKey || 'pending';
			return key;
		},
		switchTaskTab(key) {
			this.currentTaskTab = key;
			// 切换Tab时重置提交状态筛选
			if (key !== 'submitted') {
				this.statusFilter = 'all';
			}
			this.loadCurrentTab();
		},
		// 切换截止时间排序
		toggleSortOrder() {
			this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
		},
		async setStatusFilter(key) {
			this.statusFilter = key;
			// 切换"我提交的任务"的筛选时，重新加载已提交列表
			if (this.currentTaskTab === 'submitted') {
				await this.loadMySubmissions();
			}
		},

		getStatusFilterLabel(key) {
			const statusMap = {
				'all': '全部',
				'PENDING': '已提交(待审核中)',
				'REJECTED': '被打回(审核完毕被拒绝)',
				'APPROVED': '已完成'
			};
			return statusMap[key] || '已提交';
		},

		getPublishedFilterLabel(key) {
			const publishedMap = {
				'todo': '待接取',
				'in_progress': '已接取'
			};
			return publishedMap[key] || '待接取';
		},

		setPublishedFilter(key) {
			this.publishedFilter = key;
			// 发布任务筛选只是前端过滤，无需重新加载数据
		},
		openReview(item) {
			this.selectedTask = item;
			this.showModal = true;
		},
		viewProject(item) {
			// 设置选中的任务
			this.selectedTask = item;
			
			// 根据当前标签页显示不同的弹窗
			if (this.currentTaskTab === 'submitted') {
				// 提交界面显示提交详情
				this.showSubmissionModal = true;
			} else if (this.currentTaskTab === 'published') {
				// 发布界面显示项目详情
				this.showProjectModal = true;
			} else {
				// 其他界面显示项目详情
				this.showProjectModal = true;
			}
		},
		closeModal() {
			this.showModal = false;
			this.reviewComment = '';
			this.reviewResult = 'approve';
		},
		closeSubmissionModal() {
			this.showSubmissionModal = false;
		},
		closeProjectModal() {
			this.showProjectModal = false;
		},
		goToProject() {
			console.log('goToProject 调用，selectedTask:', this.selectedTask);
			if (this.selectedTask && this.selectedTask.projectId) {
				console.log('准备跳转到项目详情，projectId:', this.selectedTask.projectId);
				uni.navigateTo({
					url: '/pages/project/ProjectDetail?id=' + this.selectedTask.projectId
				});
			} else {
				console.log('项目信息不完整，selectedTask:', this.selectedTask);
				uni.showToast({
					title: '项目信息不完整',
					icon: 'none'
				});
			}
		},
		getPriorityText(priority) {
			const priorityMap = {
				'high': '高',
				'medium': '中',
				'low': '低'
			};
			return priorityMap[priority] || '中';
		},
		setResult(val) {
			this.reviewResult = val;
		},
		async submitReview(result) {
			if (result) {
				this.reviewResult = result;
			}
			if (!this.selectedTask || !this.selectedTask.submissionId) {
				uni.showToast({ title: '缺少提交记录ID', icon: 'none' });
				return;
			}
			const payload = {
				reviewStatus: this.reviewResult === 'approve' ? 'APPROVED' : 'REJECTED',
				reviewComment: this.reviewComment
			};
			try {
				console.log('[submitReview] 开始审核，selectedTask:', this.selectedTask);
				console.log('[submitReview] 审核结果:', this.reviewResult);
				console.log('[submitReview] payload:', payload);
				
				const reviewRes = await reviewSubmission(this.selectedTask.submissionId, payload);
				console.log('[submitReview] 审核接口返回:', reviewRes);
				
				uni.showToast({
					title: this.reviewResult === 'approve' ? '已批准' : '已拒绝',
					icon: 'success'
				});
				
				// 保存审核结果，用于后续推送
				const actualReviewStatus = payload.reviewStatus; // 'APPROVED' 或 'REJECTED'
				
				// 如果审核接口返回的数据中包含taskId，更新selectedTask
				if (reviewRes && (reviewRes.code === 200 || reviewRes.code === 0)) {
					const returnedTaskId = reviewRes.taskId || reviewRes.task_id || reviewRes.data?.taskId || reviewRes.data?.task_id;
					if (returnedTaskId) {
						this.selectedTask.taskId = returnedTaskId;
						console.log('[submitReview] 从审核接口返回中获取到taskId:', returnedTaskId);
					}
					// 同时更新projectId（如果返回了）
					if (reviewRes.projectId || reviewRes.project_id || reviewRes.data?.projectId || reviewRes.data?.project_id) {
						this.selectedTask.projectId = reviewRes.projectId || reviewRes.project_id || reviewRes.data?.projectId || reviewRes.data?.project_id;
					}
				}
				
				// 如果还是没有taskId，尝试从selectedTask中获取（可能已经在mapSubmission中设置了）
				if (!this.selectedTask.taskId) {
					console.warn('[submitReview] 审核接口返回中没有taskId，尝试使用selectedTask中的taskId');
					console.warn('[submitReview] selectedTask.taskId:', this.selectedTask.taskId);
				}
				
				// 审核成功后发送推送消息给任务负责人，传递实际的审核状态
				console.log('[submitReview] 准备发送推送通知，selectedTask:', this.selectedTask);
				console.log('[submitReview] 实际审核状态:', actualReviewStatus);
				this.sendReviewPushNotification(actualReviewStatus);
				
				this.closeModal();
				// 审核完成后清除相关缓存并强制刷新
				this.clearCache('review');
				this.clearCache('approved');
				this.loadCurrentTab(true);
			} catch (e) {
				console.error('审核失败', e);
				uni.showToast({ title: '审核失败', icon: 'none' });
			}
		},
		
		/**
		 * 发送审核结果推送消息给任务负责人
		 * @param {string} reviewStatus - 审核状态 'APPROVED' 或 'REJECTED'
		 */
		async sendReviewPushNotification(reviewStatus) {
			try {
				console.log('[sendReviewPushNotification] 开始发送推送通知');
				console.log('[sendReviewPushNotification] selectedTask:', this.selectedTask);
				
				const taskId = this.selectedTask.taskId;
				const projectId = this.selectedTask.projectId;
				
				if (!taskId || !projectId) {
					console.warn('[sendReviewPushNotification] 缺少taskId或projectId，无法发送推送');
					console.warn('[sendReviewPushNotification] taskId:', taskId, 'projectId:', projectId);
					return;
				}
				
				console.log('[sendReviewPushNotification] 获取任务详情，taskId:', taskId, 'projectId:', projectId);
				
				// 获取任务详情，包含负责人信息
				const taskRes = await getTaskDetail(taskId, projectId);
				console.log('[sendReviewPushNotification] 任务详情响应:', taskRes);
				
				if (!taskRes || (taskRes.code !== 200 && taskRes.code !== 0)) {
					console.warn('[sendReviewPushNotification] 获取任务详情失败:', taskRes);
					return;
				}
				
				const task = taskRes;
				const assignees = task.assignees || [];
				
				console.log('[sendReviewPushNotification] 任务负责人数量:', assignees.length);
				console.log('[sendReviewPushNotification] 负责人列表:', assignees);
				
				if (assignees.length === 0) {
					console.log('[sendReviewPushNotification] 任务没有负责人，跳过推送');
					return;
				}
				
				// 获取所有负责人的邮箱
				console.log('[sendReviewPushNotification] 开始获取负责人邮箱...');
				const emailPromises = assignees.map(async (assignee) => {
					try {
						const userId = assignee.userId || assignee.id;
						if (!userId) {
							console.warn('[sendReviewPushNotification] 负责人缺少userId:', assignee);
							return null;
						}
						
						console.log('[sendReviewPushNotification] 获取用户信息，userId:', userId);
						const userRes = await getUserById(userId);
						console.log('[sendReviewPushNotification] 用户信息响应:', userRes);
						
						if (userRes && (userRes.code === 200 || userRes.code === 0)) {
							const email = userRes.email || userRes.data?.email;
							console.log('[sendReviewPushNotification] 用户', userId, '的邮箱:', email);
							return email || null;
						}
						return null;
					} catch (e) {
						console.error(`[sendReviewPushNotification] 获取用户${assignee.userId}信息失败:`, e);
						return null;
					}
				});
				
				const emails = (await Promise.all(emailPromises)).filter(email => email !== null);
				console.log('[sendReviewPushNotification] 获取到的邮箱列表:', emails);
				
				if (emails.length === 0) {
					console.warn('[sendReviewPushNotification] 没有找到有效的负责人邮箱');
					return;
				}
				
				// 通过邮箱获取CID
				console.log('[sendReviewPushNotification] 开始通过邮箱获取CID...');
				const cidPromises = emails.map(async (email) => {
					try {
						console.log('[sendReviewPushNotification] 查询邮箱CID:', email);
						const cidRes = await uniId.getCidByEmail(email);
						console.log('[sendReviewPushNotification] CID查询结果:', cidRes);
						
						if (cidRes && cidRes.code === 0 && cidRes.data && cidRes.data.cid) {
							const cid = cidRes.data.cid;
							console.log('[sendReviewPushNotification] 邮箱', email, '的CID:', cid);
							return cid;
						}
						console.warn('[sendReviewPushNotification] 邮箱', email, '没有找到CID');
						return null;
					} catch (e) {
						console.error(`[sendReviewPushNotification] 获取邮箱${email}的CID失败:`, e);
						return null;
					}
				});
				
				const clientIds = (await Promise.all(cidPromises)).filter(cid => cid !== null);
				console.log('[sendReviewPushNotification] 获取到的CID列表:', clientIds);
				
				if (clientIds.length === 0) {
					console.warn('[sendReviewPushNotification] 没有找到有效的CID');
					return;
				}
				
				// 构建推送消息
				const taskTitle = task.title || this.selectedTask.title || '任务';
				// 使用传入的reviewStatus参数，如果没有则从this.reviewResult判断
				const actualStatus = reviewStatus || (this.reviewResult === 'approve' ? 'APPROVED' : 'REJECTED');
				const isApproved = actualStatus === 'APPROVED';
				
				console.log('[sendReviewPushNotification] 审核状态判断:', {
					reviewStatus: reviewStatus,
					thisReviewResult: this.reviewResult,
					actualStatus: actualStatus,
					isApproved: isApproved
				});
				
				const title = isApproved ? '任务审核通过' : '任务审核被退回';
				const content = isApproved 
					? `您负责的任务"${taskTitle}"已通过审核`
					: `您负责的任务"${taskTitle}"审核未通过，请查看详情`;
				
				console.log('[sendReviewPushNotification] 准备发送推送消息');
				console.log('[sendReviewPushNotification] 标题:', title);
				console.log('[sendReviewPushNotification] 内容:', content);
				console.log('[sendReviewPushNotification] CID数量:', clientIds.length);
				
				// 发送批量推送
				try {
					const pushRes = await batchSendMessage(clientIds, title, content, {
						type: 'task_review',
						taskId: taskId,
						projectId: projectId,
						reviewStatus: actualStatus,
						taskTitle: taskTitle
					});
					
					// 批量推送返回的是数组，需要特殊处理
					console.log('[sendReviewPushNotification] 推送消息响应:', pushRes);
					
					// 检查响应是否成功（批量推送返回数组，每个元素都是一个响应对象）
					if (Array.isArray(pushRes)) {
						const successCount = pushRes.filter(res => res && (res.code === 200 || res.code === 0 || res.errCode === 0)).length;
						console.log(`[sendReviewPushNotification] 推送消息发送成功，${successCount}/${pushRes.length}个推送成功`);
					} else if (pushRes && (pushRes.code === 200 || pushRes.code === 0 || pushRes.errCode === 0)) {
						console.log(`[sendReviewPushNotification] 推送消息发送成功，共${clientIds.length}个负责人收到推送`);
					} else {
						// 即使响应格式不对，如果HTTP状态码是200，也认为可能成功了
						console.log(`[sendReviewPushNotification] 推送请求已发送，响应格式:`, typeof pushRes);
					}
				} catch (e) {
					console.error('[sendReviewPushNotification] 发送推送消息失败:', e);
					console.error('[sendReviewPushNotification] 错误详情:', JSON.stringify(e, null, 2));
					
					// 如果错误对象中有statusCode 200，说明HTTP请求成功了，只是响应解析有问题
					if (e && e.statusCode === 200) {
						console.warn('[sendReviewPushNotification] HTTP请求成功，但响应解析可能有问题，推送可能已发送');
					}
					// 推送失败不影响审核流程，只记录错误
				}
			} catch (e) {
				console.error('[sendReviewPushNotification] 发送推送通知过程出错:', e);
				console.error('[sendReviewPushNotification] 错误堆栈:', e.stack);
				// 推送失败不影响审核流程，只记录错误
			}
		}
	}
};
</script>

<style lang="scss" scoped>
@import '@/static/styles/review.scss';
</style>

