<template>
	<view class="qrcode-login-page">
		<view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="nav-left" @click="goBack">
				<uni-icons type="left" size="22" color="#333"></uni-icons>
			</view>
			<view class="nav-title">扫码登录</view>
			<view class="nav-right"></view>
		</view>

		<view class="content">
			<view class="card">
				<view class="title">用手机授权 PC 登录</view>
				<view class="desc">点击下方按钮扫描 PC 端登录页展示的二维码</view>

				<view v-if="scanNotSupported" class="manual-box">
					<view class="manual-title">当前环境不支持相机扫码</view>
					<view class="manual-desc">请在 PC 端扫码弹窗复制 code（或二维码内容）粘贴到这里</view>
					<input
						class="manual-input"
						v-model="manualText"
						placeholder="粘贴 code 或 zhiyan://qrlogin?code=..."
						placeholder-class="manual-placeholder"
					/>
					<button class="btn-confirm" :disabled="loading || !manualText" @click="submitManual">
						<text v-if="!loading">确认授权</text>
						<text v-else>处理中...</text>
					</button>
				</view>

				<button class="btn-scan" :disabled="loading" @click="startScan">
					<text v-if="!loading">开始扫码</text>
					<text v-else>处理中...</text>
				</button>
			</view>
		</view>
	</view>
</template>

<script>
import { scanLoginQRCode, confirmLoginQRCode } from '@/api/user.js'

export default {
	data() {
		return {
			statusBarHeight: 0,
			loading: false,
			scanNotSupported: false,
			manualText: ''
		}
	},
	onLoad() {
		this.getSystemInfo()
		setTimeout(() => {
			this.startScan()
		}, 200)
	},
	methods: {
		getSystemInfo() {
			try {
				const systemInfo = uni.getSystemInfoSync()
				this.statusBarHeight = systemInfo.statusBarHeight || 0
			} catch (e) {
				this.statusBarHeight = 20
			}
		},
		goBack() {
			uni.navigateBack()
		},
		parseQrCodeId(raw) {
			if (!raw) return ''
			const text = String(raw).trim()
			if (!text) return ''

			if (text.includes('code=')) {
				try {
					const normalized = text.replace(/^zhiyan:\/\//, 'https://dummy/')
					const url = new URL(normalized)
					return url.searchParams.get('code') || ''
				} catch (e) {
					const match = text.match(/(?:\?|&)code=([^&]+)/)
					return match ? decodeURIComponent(match[1]) : ''
				}
			}

			return text
		},
		async authorize(qrCodeId) {
			if (!qrCodeId) {
				uni.showToast({ title: '二维码内容无效', icon: 'none' })
				return
			}

			const confirmRes = await new Promise(resolve => {
				uni.showModal({
					title: '确认授权登录',
					content: '确认后将授权 PC 端使用你的账号登录。',
					confirmText: '确认',
					cancelText: '取消',
					success: resolve
				})
			})

			if (!confirmRes || !confirmRes.confirm) {
				return
			}

			await scanLoginQRCode(qrCodeId)
			const res = await confirmLoginQRCode(qrCodeId)
			if (res && (res.code === 200 || res.code === 0)) {
				uni.showToast({ title: '授权成功', icon: 'success', duration: 1200 })
				setTimeout(() => {
					uni.navigateBack()
				}, 1200)
				return
			}
			uni.showToast({ title: (res && (res.msg || res.message)) || '授权失败', icon: 'none' })
		},
		async startScan() {
			if (this.loading) return
			this.loading = true
			try {
				const scanRes = await new Promise((resolve, reject) => {
					uni.scanCode({
						scanType: ['qrCode'],
						success: resolve,
						fail: reject
					})
				})

				const qrCodeId = this.parseQrCodeId(scanRes && (scanRes.result || scanRes.path || scanRes.rawData))
				await this.authorize(qrCodeId)
			} catch (e) {
				const errMsg = (e && (e.msg || e.message || e.errMsg)) || ''
				if (errMsg && errMsg.includes('not supported')) {
					this.scanNotSupported = true
					uni.showToast({ title: '当前环境不支持扫码，请改用粘贴 code', icon: 'none' })
					return
				}
				if (errMsg && errMsg.includes('cancel')) {
					return
				}
				uni.showToast({ title: errMsg || '扫码失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		async submitManual() {
			if (this.loading) return
			this.loading = true
			try {
				const qrCodeId = this.parseQrCodeId(this.manualText)
				await this.authorize(qrCodeId)
			} catch (e) {
				const errMsg = (e && (e.msg || e.message || e.errMsg)) || ''
				uni.showToast({ title: errMsg || '操作失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		}
	}
}
</script>

<style lang="scss" scoped>
@import '@/static/styles/qrcode-login.scss';
</style>
