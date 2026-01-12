<template>
	<!-- overlay 为全屏遮罩（居中），inline 为局部居中转圈 -->
	<view v-if="visible" :class="overlay ? 'loading-overlay' : (blend ? 'loading-blend' : 'loading-inline')">
		<view class="spinner-wrap" :style="{ transform: 'translateY(' + offsetY + 'px)' }">
			<view
				class="spinner"
				:style="{
					width: size + 'px',
					height: size + 'px',
					borderWidth: borderWidth + 'px',
					borderTopColor: overlay ? '#fff' : color
				}"
			></view>
		</view>
		<text v-if="text" class="loading-text">{{ text }}</text>
	</view>
</template>

<script>
export default {
	props: {
		visible: { type: Boolean, default: true },
		text: { type: String, default: '' },
		overlay: { type: Boolean, default: false },
		size: { type: Number, default: 36 }, // spinner 直径（px）
		borderWidth: { type: Number, default: 4 },
		offsetY: { type: Number, default: 0 },
		blend: { type: Boolean, default: false },
		color: { type: String, default: '#5b8fff' }
	}
};
</script>

<style scoped>
.loading-overlay {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	background: rgba(0, 0, 0, 0.45);
	z-index: 999;
}

.loading-inline {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 20px 0;
	width: 100%;
	box-sizing: border-box;
}

.spinner-wrap {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	border-radius: 0;
	background: transparent;
	box-shadow: none;
}

.spinner {
	border-radius: 50%;
	border-style: solid;
	border-color: rgba(91,143,255,0.2);
	border-top-color: #5b8fff;
	animation: spin 1s linear infinite;
	box-sizing: border-box;
}

.loading-text {
	margin-top: 10px;
	font-size: 14px;
	color: #666;
}

.loading-overlay .loading-text {
	color: #fff;
}

.loading-overlay .spinner {
	border-color: rgba(255, 255, 255, 0.2);
}

.loading-blend {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	display: flex;
	justify-content: center;
	align-items: center;
	background: transparent;
	pointer-events: none; /* 不阻塞页面交互 */
	z-index: 50; /* 低于顶部导航，使其看起来在页面同一图层 */
	animation: fadeIn 120ms ease;
}

.loading-blend .spinner {
	/* 更柔和的边框，融入页面色调 */
	border-color: rgba(255,255,255,0.35);
	border-top-color: rgba(255,255,255,0.9);
	opacity: 0.95;
}

@keyframes fadeIn {
	from { opacity: 0; transform: translateY(6px); }
	to { opacity: 1; transform: translateY(0); }
}

@keyframes spin {
	from { transform: rotate(0deg); }
	to { transform: rotate(360deg); }
}
</style>


