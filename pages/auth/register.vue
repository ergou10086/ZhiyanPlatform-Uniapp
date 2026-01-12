<template>
	<view class="register-page">
		<!-- 背景装饰 -->
		<view class="bg-decoration">
			<view class="circle circle-1"></view>
			<view class="circle circle-2"></view>
			<view class="circle circle-3"></view>
		</view>

		<view class="content">
			<!-- Logo和标题 -->
			<view class="header">
				<view class="logo">
					<image class="logo-image" src="/static/logo2.png" mode="aspectFit"></image>
				</view>
				<text class="title">创建账号</text>
				<text class="subtitle">加入智研，开启您的研究之旅</text>
			</view>

			<!-- 注册表单 -->
			<view class="form">
				<view class="input-group">
					<view class="input-wrapper">
						<uni-icons type="person" size="20" color="#999"></uni-icons>
						<input
							class="input"
							v-model="formData.name"
							placeholder="昵称"
							placeholder-class="placeholder"
							maxlength="100"
							@focus="onFocus('name')"
							@blur="onBlur"
						/>
					</view>
					<view class="input-line" :class="{ active: focusField === 'name' }"></view>
				</view>

				<view class="input-group">
					<view class="input-wrapper">
						<uni-icons type="email" size="20" color="#999"></uni-icons>
						<input
							class="input"
							v-model="formData.email"
							placeholder="邮箱地址"
							placeholder-class="placeholder"
							type="text"
							@focus="onFocus('email')"
							@blur="onBlur"
						/>
					</view>
					<view class="input-line" :class="{ active: focusField === 'email' }"></view>
				</view>

				<view class="input-group">
					<view class="input-wrapper">
						<uni-icons type="auth" size="20" color="#999"></uni-icons>
						<input
							class="input"
							v-model="formData.verificationCode"
							placeholder="邮箱验证码"
							placeholder-class="placeholder"
							maxlength="6"
							@focus="onFocus('verificationCode')"
							@blur="onBlur"
						/>
						<view
							class="code-btn"
							:class="{ disabled: sendingCode || codeCountdown > 0 }"
							@click.stop="handleSendCode"
						>
							<text v-if="codeCountdown === 0">获取验证码</text>
							<text v-else>{{ codeCountdown }}s</text>
						</view>
					</view>
					<view class="input-line" :class="{ active: focusField === 'verificationCode' }"></view>
				</view>

				<view class="input-group">
					<view class="input-wrapper">
						<uni-icons type="locked" size="20" color="#999"></uni-icons>
						<input
							class="input"
							v-model="formData.password"
							:password="!showPassword"
							placeholder="密码（至少6位）"
							placeholder-class="placeholder"
							@focus="onFocus('password')"
							@blur="onBlur"
						/>
						<view class="icon-btn" @click="togglePassword">
							<uni-icons :type="showPassword ? 'eye-slash' : 'eye'" size="20" color="#999"></uni-icons>
						</view>
					</view>
					<view class="input-line" :class="{ active: focusField === 'password' }"></view>
				</view>

				<view class="input-group">
					<view class="input-wrapper">
						<uni-icons type="locked" size="20" color="#999"></uni-icons>
						<input
							class="input"
							v-model="formData.confirmPassword"
							:password="!showConfirmPassword"
							placeholder="确认密码"
							placeholder-class="placeholder"
							@focus="onFocus('confirmPassword')"
							@blur="onBlur"
						/>
						<view class="icon-btn" @click="toggleConfirmPassword">
							<uni-icons :type="showConfirmPassword ? 'eye-slash' : 'eye'" size="20" color="#999"></uni-icons>
						</view>
					</view>
					<view class="input-line" :class="{ active: focusField === 'confirmPassword' }"></view>
				</view>
				<view class="input-group">
					<view class="input-wrapper">
						<uni-icons type="home" size="20" color="#999"></uni-icons>
						<input
							class="input"
							v-model="formData.institution"
							placeholder="所属机构（选填）"
							placeholder-class="placeholder"
							maxlength="200"
							@focus="onFocus('institution')"
							@blur="onBlur"
						/>
					</view>
					<view class="input-line" :class="{ active: focusField === 'institution' }"></view>
				</view>

				<view class="agreement" @click="toggleAgreement">
					<view class="checkbox" :class="{ checked: agreedToTerms }">
						<uni-icons v-if="agreedToTerms" type="checkmarkempty" size="14" color="#FFFFFF"></uni-icons>
					</view>
					<text class="agreement-text">
						我已阅读并同意
						<text class="link" @click.stop="viewTerms">《用户协议》</text>
						和
						<text class="link" @click.stop="viewPrivacy">《隐私政策》</text>
					</text>
				</view>

				<button class="btn-register" @click="handleRegister" :disabled="loading">
					<text v-if="!loading">注册</text>
					<text v-else>注册中...</text>
				</button>

				<view class="divider">
					<view class="divider-line"></view>
					<view class="divider-line"></view>
				</view>

				<view class="login-link">
					<text class="link-text">已有账号？</text>
					<text class="link-btn" @click="goToLogin">立即登录</text>
				</view>
			</view>

			<!-- 底部间距 -->
			<view class="bottom-space"></view>
		</view>
	</view>
</template>

<script>
import { register, sendVerificationCode } from '@/api/user.js'

export default {
	data() {
		return {
			formData: {
				name: '',
				email: '',
				verificationCode: '',
				password: '',
				confirmPassword: '',
				institution: ''
			},
			showPassword: false,
			showConfirmPassword: false,
			agreedToTerms: false,
			focusField: '',
			loading: false,
			sendingCode: false,
			codeCountdown: 0,
			codeTimer: null
		}
	},
	methods: {
		onFocus(field) {
			this.focusField = field;
		},

		onBlur() {
			this.focusField = '';
		},

		togglePassword() {
			this.showPassword = !this.showPassword;
		},

		toggleConfirmPassword() {
			this.showConfirmPassword = !this.showConfirmPassword;
		},

		toggleAgreement() {
			this.agreedToTerms = !this.agreedToTerms;
		},

		validateForm() {
			// 姓名验证
			if (!this.formData.name) {
				uni.showToast({ title: '请输入昵称', icon: 'none' });
				return false;
			}
			if (this.formData.name.length > 100) {
				uni.showToast({ title: '昵称长度不能超过100个字符', icon: 'none' });
				return false;
			}

			// 邮箱验证
			if (!this.formData.email) {
				uni.showToast({ title: '请输入邮箱地址', icon: 'none' });
				return false;
			}

			const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailReg.test(this.formData.email)) {
				uni.showToast({ title: '邮箱格式不正确', icon: 'none' });
				return false;
			}

			// 验证码验证
			if (!this.formData.verificationCode) {
				uni.showToast({ title: '请输入邮箱验证码', icon: 'none' });
				return false;
			}
			const codeReg = /^\d{4,6}$/;
			if (!codeReg.test(this.formData.verificationCode)) {
				uni.showToast({ title: '验证码应为4-6位数字', icon: 'none' });
				return false;
			}

			// 密码验证
			if (!this.formData.password) {
				uni.showToast({ title: '请输入密码', icon: 'none' });
				return false;
			}

			if (this.formData.password.length < 7 || this.formData.password.length > 25) {
				uni.showToast({ title: '密码长度应为7-25位', icon: 'none' });
				return false;
			}
			const passwordReg = /[A-Za-z]/;
			if (!passwordReg.test(this.formData.password)) {
				uni.showToast({ title: '密码必须包含至少一个字母', icon: 'none' });
				return false;
			}

			// 确认密码验证
			if (!this.formData.confirmPassword) {
				uni.showToast({ title: '请确认密码', icon: 'none' });
				return false;
			}

			if (this.formData.password !== this.formData.confirmPassword) {
				uni.showToast({ title: '两次输入的密码不一致', icon: 'none' });
				return false;
			}

			// 所属机构长度校验（可选）
			if (this.formData.institution && this.formData.institution.length > 200) {
				uni.showToast({ title: '所属机构长度不能超过200个字符', icon: 'none' });
				return false;
			}

			// 协议验证
			if (!this.agreedToTerms) {
				uni.showToast({ title: '请阅读并同意用户协议和隐私政策', icon: 'none' });
				return false;
			}

			return true;
		},

		async handleSendCode() {
			if (this.sendingCode || this.codeCountdown > 0) {
				return;
			}
			// 简单的邮箱校验，和表单一致
			if (!this.formData.email) {
				uni.showToast({ title: '请先输入邮箱地址', icon: 'none' });
				return;
			}
			const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailReg.test(this.formData.email)) {
				uni.showToast({ title: '邮箱格式不正确', icon: 'none' });
				return;
			}
			this.sendingCode = true;
			try {
				const res = await sendVerificationCode(this.formData.email, 'REGISTER');
				if (res.code === 200 || res.code === 0) {
					uni.showToast({ title: res.message || '验证码已发送，请检查邮箱', icon: 'none' });
					this.startCodeCountdown();
				} else {
					uni.showToast({ title: res.message || '验证码发送失败，请稍后重试', icon: 'none' });
				}
			} catch (error) {
				console.error('发送验证码失败:', error);
				uni.showToast({ title: '验证码发送失败，请稍后重试', icon: 'none' });
			} finally {
				this.sendingCode = false;
			}
		},

		startCodeCountdown() {
			this.codeCountdown = 60;
			if (this.codeTimer) {
				clearInterval(this.codeTimer);
			}
			this.codeTimer = setInterval(() => {
				if (this.codeCountdown > 0) {
					this.codeCountdown -= 1;
				} else {
					clearInterval(this.codeTimer);
					this.codeTimer = null;
				}
			}, 1000);
		},

		async handleRegister() {
			if (!this.validateForm()) {
				return;
			}

			this.loading = true;
			uni.showLoading({ title: '注册中...' });

			try {
				const registerData = {
					name: this.formData.name,
					email: this.formData.email,
					verificationCode: this.formData.verificationCode,
					password: this.formData.password,
					confirmPassword: this.formData.confirmPassword
				};
				// 可选字段
				if (this.formData.institution) {
					registerData.institution = this.formData.institution;
				}

				const res = await register(registerData);

				if (res.code === 200 || res.code === 0) {
					uni.showToast({
						title: '注册成功',
						icon: 'success',
						duration: 2000
					});

					// 延迟跳转到登录页
					setTimeout(() => {
						const pages = getCurrentPages && getCurrentPages();
						if (pages && pages.length > 1) {
							uni.navigateBack();
						} else {
							uni.reLaunch({ url: '/pages/auth/login' });
						}
					}, 2000);
				} else {
					uni.showToast({
						title: res.msg || res.message || '注册失败，请稍后重试',
						icon: 'none'
					});
				}
			} catch (error) {
				console.error('注册失败:', error);
				uni.showToast({
					title: error.message || '注册失败，请稍后重试',
					icon: 'none'
				});
			} finally {
				this.loading = false;
				uni.hideLoading();
			}
		},

		viewTerms() {
			uni.showToast({ title: '用户协议页面开发中', icon: 'none' });
		},

		viewPrivacy() {
			uni.showToast({ title: '隐私政策页面开发中', icon: 'none' });
		},

		goToLogin() {
			const pages = getCurrentPages && getCurrentPages();
			if (pages && pages.length > 1) {
				uni.navigateBack();
			} else {
				uni.reLaunch({ url: '/pages/auth/login' });
			}
		}
	}
}
</script>

<style lang="scss" scoped>
@import '@/common/styles/common.scss';
@import '@/static/styles/register.scss';
</style>
