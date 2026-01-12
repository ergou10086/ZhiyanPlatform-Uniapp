<template>
	<view class="custom-tabbar">
		<view 
			class="tabbar-item" 
			v-for="(item, index) in tabList" 
			:key="index"
			:class="{ 'active': currentIndex === index }"
			@click="switchTab(item, index)"
		>
			<view class="tabbar-icon">
				<image 
					:src="currentIndex === index ? item.selectedIconPath : item.iconPath" 
					class="icon-image"
					mode="aspectFit"
				></image>
			</view>
			<text class="tabbar-text" :style="{ color: currentIndex === index ? selectedColor : color }">
				{{ item.text }}
			</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'CustomTabbar',
	props: {
		current: {
			type: Number,
			default: 0
		}
	},
	data() {
		return {
			color: '#7A7E83',
			selectedColor: '#5B5FEF',
			currentIndex: 0,
			tabList: [
				{
					pagePath: '/pages/home/home',
					iconPath: '/static/tabbar/home.png',
					selectedIconPath: '/static/tabbar/home-active.png',
					text: '首页'
				},
				{
					pagePath: '/pages/project/projectsquare',
					iconPath: '/static/tabbar/project.png',
					selectedIconPath: '/static/tabbar/project-active.png',
					text: '项目'
				},
				{
					pagePath: '/pages/ai/ai',
					iconPath: '/static/tabbar/ai.png',
					selectedIconPath: '/static/tabbar/ai-active.png',
					text: 'AI'
				},
				{
					pagePath: '/pages/user/user',
					iconPath: '/static/tabbar/user.png',
					selectedIconPath: '/static/tabbar/user-active.png',
					text: '我的'
				}
			]
		}
	},
	watch: {
		current(newVal) {
			this.currentIndex = newVal;
		}
	},
	mounted() {
		// 根据当前页面路径设置激活状态
		const pages = getCurrentPages();
		const currentPage = pages[pages.length - 1];
		const currentPath = '/' + currentPage.route;
		
		const index = this.tabList.findIndex(item => item.pagePath === currentPath);
		if (index !== -1) {
			this.currentIndex = index;
		}
	},
	methods: {
		switchTab(item, index) {
			if (this.currentIndex === index) {
				return; // 如果点击的是当前页，不执行跳转
			}
			
			this.currentIndex = index;
			uni.switchTab({
				url: item.pagePath,
				fail: () => {
					// 如果switchTab失败，尝试使用navigateTo
					uni.navigateTo({
						url: item.pagePath
					});
				}
			});
		}
	}
}
</script>

<style lang="scss" scoped>
.custom-tabbar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	height: 70px;
	background-color: #FFFFFF;
	border-top: 1px solid #E5E5E5;
	display: flex;
	align-items: center;
	justify-content: space-around;
	z-index: 999;
	padding-bottom: env(safe-area-inset-bottom);
	box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
}

.tabbar-item {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 8px 0;
}

.tabbar-icon {
	margin-bottom: 4px;
	width: 64px;
	height: 64px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.icon-image {
	width: 64px;
	height: 64px;
}

.tabbar-text {
	font-size: 12px;
	font-weight: 500;
}

.tabbar-item.active .tabbar-text {
	font-weight: 600;
}
</style>

