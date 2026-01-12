<template>
	<text class="simple-icon" :style="iconStyle">{{ iconChar }}</text>
</template>

<script>
export default {
	name: 'SimpleIcon',
	props: {
		type: {
			type: String,
			default: 'circle'
		},
		size: {
			type: [Number, String],
			default: 20
		},
		color: {
			type: String,
			default: '#333'
		}
	},
	computed: {
		iconChar() {
			const icons = {
				'bell': '🔔',
				'person': '👤',
				'person-filled': '👤',
				'camera': '📷',
				'locked': '🔒',
				'email': '✉️',
				'home': '🏢',
				'eye': '👁️',
				'eye-slash': '🙈',
				'checkmarkempty': '✓',
				'close': '✕',
				'down': '▼',
				'info': 'ℹ️',
				'circle': '●'
			};
			return icons[this.type] || '●';
		},
		iconStyle() {
			return {
				fontSize: (typeof this.size === 'number' ? this.size : parseInt(this.size)) + 'px',
				color: this.color,
				lineHeight: 1
			};
		}
	}
}
</script>

<style scoped>
.simple-icon {
	display: inline-block;
	text-align: center;
}
</style>
