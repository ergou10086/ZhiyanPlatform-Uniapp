<template>
	<view class="activity-page">
		<view class="top-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
			<text class="page-title">我的活动</text>
			<view class="top-actions">
				<view class="filter-input">
					<uni-icons type="calendar" size="18" color="#999"></uni-icons>
					<input class="filter-placeholder" placeholder="按截止时间" disabled />
				</view>
				<view class="overdue-filter">
					<text class="overdue-label">仅看逾期项</text>
					<switch :checked="onlyOverdue" color="#5B9BFF" @change="toggleOverdue"></switch>
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
					<text>{{ tab.label }}</text>
				</view>
			</view>
		</view>

		<scroll-view class="content" scroll-y :style="{ marginTop: contentOffset + 'px' }">
			<view v-if="currentSection === 'tasks'" class="card-list">
				<view class="task-card" v-for="(item, index) in visibleTasks" :key="index">
					<view class="task-header">
						<view class="task-info">
							<text class="member-name">{{ item.name }}</text>
							<text class="task-title">{{ item.title }}</text>
						</view>
						<view class="primary-btn">审核</view>
					</view>
					<view class="task-meta">
						<text class="task-submitted">提交于 {{ item.submitted }}</text>
					</view>
				</view>
			</view>

			<view v-else-if="currentSection === 'projects'" class="card-list">
				<view class="project-card" v-for="(project, index) in projects" :key="index">
					<text class="project-title">{{ project.title }}</text>
					<view class="status-badge" :class="'status-' + project.statusKey">
						<text>{{ project.status }}</text>
					</view>
				</view>
			</view>

			<view v-else class="card-list">
				<view class="log-card" v-for="(log, index) in operationLogs" :key="index">
					<view class="log-header">
						<text class="log-title">{{ log.title }}</text>
						<view class="log-tag" :class="'tag-' + log.type">{{ log.typeText }}</view>
					</view>
					<text class="log-email">{{ log.email }}</text>
					<view class="log-meta">
						<text class="log-project">项目 ID: {{ log.projectId }}</text>
						<text class="log-time">{{ log.time }}</text>
					</view>
				</view>
			</view>

			<view class="bottom-space"></view>
		</scroll-view>

		<view class="bottom-nav">
			<view
				class="nav-item"
				:class="{ active: currentSection === 'tasks' }"
				@click="switchSection('tasks')"
			>
				<text>我的任务</text>
			</view>
			<view
				class="nav-item"
				:class="{ active: currentSection === 'projects' }"
				@click="switchSection('projects')"
			>
				<text>项目总览</text>
			</view>
			<view
				class="nav-item"
				:class="{ active: currentSection === 'logs' }"
				@click="switchSection('logs')"
			>
				<text>操作日志</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		const statusBarHeight = uni.getSystemInfoSync()?.statusBarHeight || 20;
		return {
			statusBarHeight,
			onlyOverdue: false,
			currentSection: 'tasks',
			taskTabs: [
				{ key: 'review', label: '我审核的任务' },
				{ key: 'submitted', label: '我提交的任务' },
				{ key: 'published', label: '我发布的任务' }
			],
			currentTaskTab: 'review',
			tasks: {
				review: [
					{ name: '张伟', title: '市场推广计划 v2.0', submitted: '2023年10月15日', overdue: false },
					{ name: '李娜', title: 'Q4 用户调研报告', submitted: '2023年10月18日', overdue: false },
					{ name: '王强', title: '产品功能迭代提案', submitted: '2023年10月20日', overdue: false },
					{ name: '陈静', title: '客户反馈整理文档', submitted: '2023年10月22日', overdue: false },
					{ name: '刘洋', title: '技术架构优化方案', submitted: '2023年10月25日', overdue: false }
				],
				submitted: [
					{ name: '我', title: '项目周报 V3', submitted: '2023年10月12日', overdue: false },
					{ name: '我', title: '季度 OKR 执行情况', submitted: '2023年10月08日', overdue: true }
				],
				published: [
					{ name: '我', title: '新功能发布计划', submitted: '2023年09月30日', overdue: false },
					{ name: '我', title: '需求池优先级排序', submitted: '2023年09月28日', overdue: false }
				]
			},
			projects: [
				{ title: 'AI 智能分析平台', status: '进行中', statusKey: 'ongoing' },
				{ title: '糖脂代谢相关的基础科学问题研究', status: '进行中', statusKey: 'ongoing' },
				{ title: '高级职业学校规划与发展', status: '已归档', statusKey: 'archived' },
				{ title: '仿生多孔聚合物膜用于低成本、高效率的海水淡化研究', status: '进行中', statusKey: 'ongoing' },
				{ title: '私有测试', status: '进行中', statusKey: 'ongoing' },
				{ title: '环境与地球科学', status: '进行中', statusKey: 'ongoing' },
				{ title: '演示操作用项目', status: '已归档', statusKey: 'archived' }
			],
			operationLogs: [
				{ title: '成果管理', email: '1977127178@qq.com', projectId: '1993897241143808000', time: '2025/12/09 10:44', type: 'upload', typeText: '上传文件' },
				{ title: '项目管理', email: 'admin@company.com', projectId: '1993897241143808001', time: '2025/12/08 15:22', type: 'create', typeText: '创建' },
				{ title: '用户管理', email: 'manager@company.com', projectId: '1993897241143808002', time: '2025/12/08 09:15', type: 'delete', typeText: '删除' },
				{ title: '数据分析', email: 'analyst@company.com', projectId: '1993897241143808003', time: '2025/12/07 14:30', type: 'export', typeText: '导出' },
				{ title: '系统设置', email: 'techlead@company.com', projectId: '1993897241143808004', time: '2025/12/07 11:45', type: 'edit', typeText: '修改' }
			]
		};
	},
	computed: {
		contentOffset() {
			// 44px title row + 16px padding + filter + tabs
			return 44 + this.statusBarHeight + 132;
		},
		visibleTasks() {
			const list = this.tasks[this.currentTaskTab] || [];
			if (!this.onlyOverdue) {
				return list;
			}
			return list.filter(item => item.overdue);
		}
	},
	onLoad(options) {
		if (options?.section) {
			this.switchSection(options.section);
		}
		if (options?.tab) {
			this.switchTaskTab(options.tab);
		}
	},
	methods: {
		switchTaskTab(key) {
			this.currentTaskTab = key;
		},
		switchSection(section) {
			this.currentSection = section;
		},
		toggleOverdue(e) {
			this.onlyOverdue = e.detail.value;
		}
	}
};
</script>

<style lang="scss" scoped>
@import '@/static/styles/activity.scss';
</style>

