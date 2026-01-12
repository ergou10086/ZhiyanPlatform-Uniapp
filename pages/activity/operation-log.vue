<template>
	<view class="log-page">
		<view class="top-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
			<text class="page-title">操作日志</text>
		</view>

		<scroll-view class="content" scroll-y :style="{ marginTop: contentOffset + 'px' }">
			<view class="toolbar">
				<view class="search-box">
					<uni-icons type="search" size="18" color="#999"></uni-icons>
					<input
						class="search-input"
						placeholder="搜索日志..."
						v-model="searchKeyword"
						@input="onSearch"
					/>
				</view>
				<view class="filters">
					<picker mode="selector" :range="typeOptions" range-key="label" @change="onTypeChange">
						<view class="filter-btn">
							<text>{{ currentTypeLabel }}</text>
							<uni-icons type="arrowdown" size="14" color="#666"></uni-icons>
						</view>
					</picker>
				</view>
			</view>

			<!-- 加载状态 -->
			<loading-spinner v-if="loading" :blend="true" />

			<!-- 日志列表 -->
			<view v-else-if="visibleLogs.length > 0" class="card-list">
				<view class="log-card" v-for="(log, index) in visibleLogs" :key="log.id || index">
					<view class="log-header">
						<text class="log-title">{{ log.title }}</text>
						<view class="log-tag" :class="'tag-' + log.tagClass">{{ log.typeText }}</view>
					</view>
					<text class="log-email">{{ log.username }}</text>
					<view class="log-meta">
						<text class="log-project">项目: {{ log.projectName || '未知项目' }}</text>
						<text class="log-time">{{ log.time }}</text>
					</view>
				</view>
			</view>

			<!-- 空状态 -->
			<view v-else class="empty-container">
				<text class="empty-text">暂无操作日志</text>
			</view>

			<view class="bottom-space"></view>
		</scroll-view>
	</view>
</template>

<script>
import { getMyAllLogs } from '@/api/activelog.js'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

export default {
	components: { LoadingSpinner },
	data() {
		const statusBarHeight = uni.getSystemInfoSync()?.statusBarHeight || 20;
		return {
			statusBarHeight,
			searchKeyword: '',
			loading: false,
			typeOptions: [
				{ value: 'all', label: '全部类型' },
				{ value: 'PROJECT', label: '项目' },
				{ value: 'TASK', label: '任务' },
				{ value: 'ACHIEVEMENT', label: '成果' },
				{ value: 'WIKI', label: 'Wiki' }
			],
			currentType: 'all',
			operationLogs: [],
			// 数据缓存相关
			dataCache: {
				logs: { data: [], timestamp: 0, ttl: 5 * 60 * 1000 } // 5分钟缓存
			}
		};
	},
	computed: {
		contentOffset() {
			return 44 + this.statusBarHeight;
		},
		currentTypeLabel() {
			const current = this.typeOptions.find(o => o.value === this.currentType);
			return current ? current.label : '全部类型';
		},
		visibleLogs() {
			const keyword = this.searchKeyword.trim().toLowerCase();
			return this.operationLogs
				.filter(log => {
					// 按类型筛选
					if (this.currentType !== 'all' && log.source !== this.currentType) return false;
					// 搜索筛选
					if (!keyword) return true;
					return (
						(log.title || '').toLowerCase().includes(keyword) ||
						(log.username || '').toLowerCase().includes(keyword) ||
						(log.projectId || '').toString().toLowerCase().includes(keyword) ||
						(log.projectName || '').toLowerCase().includes(keyword) ||
						(log.typeText || '').toLowerCase().includes(keyword) ||
						(log.operationModule || '').toLowerCase().includes(keyword)
					);
				});
		}
	},
	// 页面初始化时就尝试从缓存恢复数据
	created() {
		this.tryRestoreFromCache();
	},

	onLoad() {
		// 如果还没有数据，才尝试加载
		if (!this.operationLogs || this.operationLogs.length === 0) {
			this.loadDataFromCacheOrRemote();
		}
	},

	// 页面卸载时清除缓存，避免内存泄漏
	onUnload() {
		this.clearCache('logs');
	},

	// 下拉刷新处理
	onPullDownRefresh() {
		console.log('🔄 下拉刷新，清除缓存并重新加载');
		this.clearCache('logs');
		this.loadLogs(true);
	},

	methods: {
		// 检查缓存是否有效
		isCacheValid(cacheKey) {
			const cache = this.dataCache[cacheKey];
			if (!cache || !cache.data || cache.data.length === 0) {
				return false;
			}

			const now = Date.now();
			return (now - cache.timestamp) < cache.ttl;
		},

		// 更新缓存
		updateCache(cacheKey, data) {
			// 确保TTL存在，否则使用默认值
			const ttl = this.dataCache[cacheKey]?.ttl || 5 * 60 * 1000;
			this.dataCache[cacheKey] = {
				data: [...data], // 深拷贝
				timestamp: Date.now(),
				ttl: ttl
			};
		},

		// 清除指定缓存
		clearCache(cacheKey) {
			this.dataCache[cacheKey] = { data: [], timestamp: 0, ttl: this.dataCache[cacheKey].ttl };
		},

		// 尝试从缓存恢复数据
		tryRestoreFromCache() {
			if (this.isCacheValid('logs')) {
				console.log('📋 页面初始化时恢复缓存数据: logs');
				this.operationLogs = this.dataCache.logs.data;
			}
		},

		// 从缓存或远程加载数据
		loadDataFromCacheOrRemote() {
			// 首先检查缓存是否有效
			if (this.isCacheValid('logs')) {
				console.log('📋 使用缓存数据: logs');
				// 直接从缓存恢复数据
				this.operationLogs = this.dataCache.logs.data;
				return;
			}

			// 缓存无效，重新加载数据
			console.log('📥 缓存无效或过期，重新加载日志');
			this.loadLogs(true);
		},

		async loadLogs(forceRefresh = false) {
			// 检查缓存是否有效
			if (!forceRefresh && this.isCacheValid('logs')) {
				console.log('📋 使用缓存数据: logs');
				this.operationLogs = this.dataCache.logs.data;
				return;
			}

			// 否则重新获取数据
			await this.fetchLogs();
		},

		async fetchLogs() {
			try {
				this.loading = true;
				const res = await getMyAllLogs(0, 100); // 获取前100条日志
				
				if (res && (res.code === 200 || res.code === 0)) {
					let list = [];
					
					// 处理分页数据：后端返回 R<Page<UnifiedOperationLogVO>>
					if (Array.isArray(res.content)) {
						list = res.content;
					} else if (res.data && Array.isArray(res.data.content)) {
						list = res.data.content;
					} else if (Array.isArray(res.data)) {
						list = res.data;
					}
					
					// 转换数据格式
					this.operationLogs = list.map(log => {
						const operationType = this.getOperationTypeInfo(log.operationType);
						return {
							id: log.idStr || log.id,
							title: log.title || log.operationModule || '操作日志',
							username: log.username || '未知用户',
							projectId: log.projectIdStr || log.projectId || '-',
							projectName: log.projectName || '未知项目',
							time: this.formatTime(log.time),
							source: log.source || '',
							operationModule: log.operationModule || '',
							operationType: log.operationType || '',
							typeText: operationType.text,
							tagClass: operationType.tagClass
						};
					});

					// 更新缓存
					this.updateCache('logs', this.operationLogs);
				} else {
					uni.showToast({
						title: (res && (res.msg || res.message)) || '获取操作日志失败',
						icon: 'none'
					});
				}
			} catch (e) {
				console.error('获取操作日志失败:', e);
				uni.showToast({
					title: e.message || '获取操作日志失败',
					icon: 'none'
				});
			} finally {
				this.loading = false;
			}
		},
		
		// 将操作类型转换为显示文本和标签样式
		getOperationTypeInfo(operationType) {
			if (!operationType) {
				return { text: '未知', tagClass: 'default' };
			}
			
			const typeStr = operationType.toString().toUpperCase();
			const typeMap = {
				// 创建类
				'CREATE': { text: '创建', tagClass: 'create' },
				// 更新类
				'UPDATE': { text: '更新', tagClass: 'edit' },
				'UPDATE_STATUS': { text: '更新状态', tagClass: 'edit' },
				'UPDATE_DETAIL': { text: '更新详情', tagClass: 'edit' },
				'STATUS_CHANGE': { text: '状态变更', tagClass: 'edit' },
				// 删除类
				'DELETE': { text: '删除', tagClass: 'delete' },
				'FILE_DELETE': { text: '删除文件', tagClass: 'delete' },
				// 上传类
				'FILE_UPLOAD': { text: '上传文件', tagClass: 'upload' },
				// 其他
				'ASSIGN': { text: '分配', tagClass: 'edit' },
				'SUBMIT': { text: '提交', tagClass: 'edit' },
				'REVIEW': { text: '审核', tagClass: 'edit' },
				'COMPLETE': { text: '完成', tagClass: 'create' },
				'MEMBER_ADD': { text: '添加成员', tagClass: 'create' },
				'MEMBER_REMOVE': { text: '移除成员', tagClass: 'delete' },
				'ROLE_CHANGE': { text: '角色变更', tagClass: 'edit' },
				'MOVE': { text: '移动', tagClass: 'edit' }
			};
			
			return typeMap[typeStr] || { text: typeStr, tagClass: 'default' };
		},
		
		// 格式化时间
		formatTime(timeStr) {
			if (!timeStr) return '-';
			try {
				const date = new Date(timeStr);
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				const hours = String(date.getHours()).padStart(2, '0');
				const minutes = String(date.getMinutes()).padStart(2, '0');
				return `${year}/${month}/${day} ${hours}:${minutes}`;
			} catch (e) {
				return timeStr;
			}
		},
		
		onSearch() {
			// reactive filter handled by computed
		},
		onTypeChange(e) {
			const idx = Number(e.detail.value);
			this.currentType = this.typeOptions[idx]?.value || 'all';
		}
	}
};
</script>

<style lang="scss" scoped>
@import '@/static/styles/operation-log.scss';
</style>

