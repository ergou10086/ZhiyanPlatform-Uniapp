<template>
	<view class="overview-page">
		<view class="top-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
			<text class="page-title">项目总览</text>
		</view>

		<scroll-view class="content" scroll-y :style="{ marginTop: contentOffset + 'px' }">
			<!-- 加载状态 -->
			<loading-spinner v-if="loading" :blend="true" />
			
			<!-- 项目列表 -->
			<view v-else-if="projects.length > 0" class="card-list">
				<view
					class="project-card"
					v-for="(project, index) in projects"
					:key="project.id || index"
					@click="goDetail(project)"
				>
					<text class="project-title">{{ project.title }}</text>
					<view class="status-badge" :class="'status-' + project.statusKey">
						<text>{{ project.status }}</text>
					</view>
				</view>
			</view>
			
			<!-- 空状态 -->
			<view v-else class="empty-container">
				<text class="empty-text">暂无参与的项目</text>
			</view>
			
			<view class="bottom-space"></view>
		</scroll-view>
	</view>
</template>

<script>
import { getMyProjects } from '@/api/project.js'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

export default {
	components: { LoadingSpinner },
	data() {
		const statusBarHeight = uni.getSystemInfoSync()?.statusBarHeight || 20;
		return {
			statusBarHeight,
			projects: [],
			loading: false
		};
	},
	computed: {
		contentOffset() {
			return 44 + this.statusBarHeight;
		}
	},
	onLoad() {
		this.fetchProjects();
	},
	methods: {
		async fetchProjects() {
			try {
				this.loading = true;
				const res = await getMyProjects(0, 100); // 获取前100个项目
				
				if (res && (res.code === 200 || res.code === 0)) {
					let list = [];
					
					// 处理分页数据：后端返回 R<Page<Project>>，Page 对象包含 content 数组
					if (Array.isArray(res.content)) {
						// R<Page<Project>> 展开的情况：content 直接在顶层
						list = res.content;
					} else if (res.data && Array.isArray(res.data.content)) {
						// 兼容如果后端返回在 data 里再包一层 Page
						list = res.data.content;
					} else if (Array.isArray(res.data)) {
						list = res.data;
					}
					
					// 转换数据格式
					this.projects = list.map(p => {
						const statusInfo = this.getStatusInfo(p.status);
						return {
							id: p.idStr || p.id,
							title: p.name || p.title || '未命名项目',
							status: statusInfo.text,
							statusKey: statusInfo.key
						};
					});
				} else {
					uni.showToast({
						title: (res && (res.msg || res.message)) || '获取项目列表失败',
						icon: 'none'
					});
				}
			} catch (e) {
				console.error('获取项目列表失败:', e);
				uni.showToast({
					title: e.message || '获取项目列表失败',
					icon: 'none'
				});
			} finally {
				this.loading = false;
			}
		},
		
		// 将后端状态枚举转换为前端显示格式
		getStatusInfo(status) {
			const statusMap = {
				'PLANNING': { text: '规划中', key: 'planning' },
				'ONGOING': { text: '进行中', key: 'ongoing' },
				'COMPLETED': { text: '已完成', key: 'completed' },
				'ARCHIVED': { text: '已归档', key: 'archived' }
			};
			
			const statusStr = (status || 'ONGOING').toString().toUpperCase();
			return statusMap[statusStr] || statusMap['ONGOING'];
		},
		
		goDetail(project) {
			const title = encodeURIComponent(project.title || '');
			const id = project.id || '';
			uni.navigateTo({
				url: `/pages/project/ProjectDetail?id=${id}&title=${title}`
			});
		}
	}
};
</script>

<style lang="scss" scoped>
@import '@/static/styles/project-overview.scss';
</style>

