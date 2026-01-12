<template>
	<view class="forgot-password-page">
		<!-- 背景装饰 -->
		<view class="bg-decoration">
			<view class="circle circle-1"></view>
			<view class="circle circle-2"></view>
			<view class="circle circle-3"></view>
		</view>
		
		<view class="content">
			<!-- Logo和标题 -->
			<view class="header">
				<view class="back-btn" @click="goToLogin">
					<uni-icons type="left" size="20" color="#0ea5e9"></uni-icons>
					<text class="back-text">返回登录</text>
				</view>
				<view class="logo">
					<image class="logo-image" src="/static/logo2.png" mode="aspectFit"></image>
				</view>
				<text class="title">重置密码</text>
				<text class="subtitle">通过邮箱验证重置您的密码</text>
			</view>
			
			<!-- 重置密码表单 -->
			<view class="form">
				<view class="input-group">
					<view class="input-wrapper">
						<uni-icons type="email" size="20" color="#999"></uni-icons>
						<input 
							class="input" 
							v-model="formData.email" 
							placeholder="请输入您的邮箱地址"
							placeholder-class="placeholder"
							@focus="onFocus('email')"
							@blur="onBlur"
						/>
						<text class="email-invalid-link" @click="goToChangeEmail">该邮箱失效？</text>
					</view>
					<view class="input-line" :class="{ active: focusField === 'email' }"></view>
				</view>
				
				<view class="input-group">
					<view class="input-wrapper">
						<uni-icons type="auth" size="20" color="#999"></uni-icons>
						<input 
							class="input code-input" 
							v-model="formData.code" 
							placeholder="请输入6位验证码"
							placeholder-class="placeholder"
							maxlength="6"
							@focus="onFocus('code')"
							@blur="onBlur"
							@input="formatCodeInput"
						/>
						<view
							class="code-btn"
							:class="{ disabled: sendingCode || codeCountdown > 0 }"
							@click.stop="handleSendCode"
						>
							<text v-if="codeCountdown === 0">发送验证码</text>
							<text v-else>{{ codeCountdown }}s后重发</text>
						</view>
					</view>
					<view class="input-line" :class="{ active: focusField === 'code' }"></view>
				</view>
				
				<view class="input-group">
					<view class="input-wrapper">
						<uni-icons type="locked" size="20" color="#999"></uni-icons>
						<input 
							class="input" 
							v-model="formData.newPassword" 
							:password="!showPassword"
							placeholder="新密码(7-25位,必须包含字母)"
							placeholder-class="placeholder"
							@focus="onFocus('newPassword')"
							@blur="onBlur"
							@input="updatePasswordStrength"
						/>
						<view class="icon-btn" @click="togglePassword">
							<uni-icons :type="showPassword ? 'eye-slash' : 'eye'" size="20" color="#999"></uni-icons>
						</view>
					</view>
					<view class="input-line" :class="{ active: focusField === 'newPassword' }"></view>
					<!-- 密码强度显示 -->
					<view v-if="formData.newPassword" class="password-strength">
						<view class="strength-bar">
							<view 
								class="strength-fill" 
								:style="{ 
									width: `${(passwordStrength.level / 5) * 100}%`,
									backgroundColor: passwordStrength.color
								}"
							></view>
						</view>
						<text class="strength-label" :style="{ color: passwordStrength.color }">
							{{ passwordStrength.label }}
						</text>
					</view>
				</view>
				
				<view class="input-group">
					<view class="input-wrapper">
						<uni-icons type="locked" size="20" color="#999"></uni-icons>
						<input 
							class="input" 
							v-model="formData.confirmPassword" 
							:password="!showConfirmPassword"
							placeholder="请再次输入新密码"
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
				
				<button class="btn-reset" @click="handleResetPassword" :disabled="loading">
					<text v-if="!loading">重置密码</text>
					<text v-else>重置中...</text>
				</button>
			</view>
		</view>
		
		<!-- 自定义成功提示弹窗 -->
		<view v-if="showSuccessModal" class="success-modal" @click="closeSuccessModal">
			<view class="success-modal-content" @click.stop>
				<view class="success-icon-wrapper">
					<uni-icons type="checkmarkempty" size="48" color="#10b981"></uni-icons>
				</view>
				<text class="success-title">验证码已发送</text>
				<text class="success-message">已发送到您的邮箱，请查收</text>
				<text class="success-hint">（测试模式下验证码会显示在后端控制台）</text>
				<button class="success-confirm-btn" @click="closeSuccessModal">知道了</button>
			</view>
		</view>
	</view>
</template>

<script>
import { sendVerificationCode, resetPassword } from '@/api/user.js'

export default {
	data() {
		return {
			formData: {
				email: '',
				code: '',
				newPassword: '',
				confirmPassword: ''
			},
			showPassword: false,
			showConfirmPassword: false,
			focusField: '',
			loading: false,
			sendingCode: false,
			codeCountdown: 0,
			passwordStrength: { level: 0, label: '', color: '#ef4444' },
			showSuccessModal: false
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
		
		formatCodeInput(e) {
			// 只允许输入数字
			let value = e.detail.value.replace(/[^0-9]/g, '');
			// 限制6位
			if (value.length > 6) {
				value = value.substring(0, 6);
			}
			this.formData.code = value;
		},
		
		async handleSendCode() {
			if (this.sendingCode || this.codeCountdown > 0) return;
			
			if (!this.formData.email) {
				uni.showToast({ title: '请先输入邮箱地址', icon: 'none' });
				return;
			}
			
			// 邮箱格式验证（与网页端一致）
			if (!this.isValidEmail(this.formData.email)) {
				uni.showToast({ title: '请输入正确的邮箱格式', icon: 'none' });
				return;
			}
			
			this.sendingCode = true;
			uni.showLoading({ title: '发送中...' });
			
			try {
				// 与网页端一致：传递对象 { email, type: 'RESET_PASSWORD' }
				const res = await sendVerificationCode(this.formData.email, 'RESET_PASSWORD');
				if (res.code === 200 || res.code === 0) {
					// 显示自定义成功弹窗
					this.showSuccessModal = true;
					this.startCountdown();
				} else {
					uni.showToast({ 
						title: res.msg || res.message || '发送失败，请重试', 
						icon: 'none' 
					});
				}
			} catch (error) {
				console.error('发送验证码失败:', error);
				const errorMessage = error.msg || error.message || '发送失败，请稍后重试';
				uni.showToast({ 
					title: errorMessage, 
					icon: 'none' 
				});
			} finally {
				this.sendingCode = false;
				uni.hideLoading();
			}
		},
		
		startCountdown() {
			this.codeCountdown = 60;
			const timer = setInterval(() => {
				this.codeCountdown--;
				if (this.codeCountdown <= 0) {
					clearInterval(timer);
				}
			}, 1000);
		},
		
		// 邮箱格式验证（与网页端一致）
		isValidEmail(email) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			return emailRegex.test(email);
		},
		
		// 密码验证（与网页端一致）
		validatePassword(password) {
			if (!password) {
				return { isValid: false, message: '密码不能为空' };
			}
			if (password.length < 7) {
				return { isValid: false, message: '密码长度不能少于7位' };
			}
			if (password.length > 25) {
				return { isValid: false, message: '密码长度不能超过25位' };
			}
			if (!/[a-zA-Z]/.test(password)) {
				return { isValid: false, message: '密码必须包含至少一个字母' };
			}
			return { isValid: true, message: '' };
		},
		
		// 计算密码强度（与网页端一致）
		calculatePasswordStrength(password) {
			if (!password || password.length < 7) {
				return { level: 0, label: '无效', color: '#ef4444' };
			}

			// 检查字符类型
			const hasDigit = /[0-9]/.test(password);
			const hasLowercase = /[a-z]/.test(password);
			const hasUppercase = /[A-Z]/.test(password);
			const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);
			
			let charTypeCount = 0;
			if (hasDigit) charTypeCount++;
			if (hasLowercase || hasUppercase) charTypeCount++;
			if (hasSpecialChar) charTypeCount++;
			
			const length = password.length;
			
			// 5 - 无懈可击：>12位，有大写字母、小写字母和特殊字符
			if (length > 12 && hasLowercase && hasUppercase && hasSpecialChar) {
				return { level: 5, label: '无懈可击', color: '#10b981' };
			}
			
			// 4 - 高强度：≥10位，包含三种及以上字符组合（数字+字母+符号）
			if (length >= 10 && charTypeCount >= 3) {
				return { level: 4, label: '高强度', color: '#22c55e' };
			}
			
			// 3 - 稳健：≥8位，包含三种及以上字符组合（数字+字母+符号）
			if (length >= 8 && charTypeCount >= 3) {
				return { level: 3, label: '稳健', color: '#3b82f6' };
			}
			
			// 2 - 入门：>7位，仅两种字符组合
			if (length > 7 && charTypeCount === 2) {
				return { level: 2, label: '入门', color: '#f59e0b' };
			}
			
			// 1 - 无效：密码强度不够平台最低标准
			if (length > 7 && charTypeCount === 1) {
				return { level: 1, label: '无效', color: '#ef4444' };
			}
			
			// 0 - 不符合基本要求
			return { level: 0, label: '无效', color: '#ef4444' };
		},
		
		updatePasswordStrength() {
			if (this.formData.newPassword) {
				this.passwordStrength = this.calculatePasswordStrength(this.formData.newPassword);
			} else {
				this.passwordStrength = { level: 0, label: '', color: '#ef4444' };
			}
		},
		
		async handleResetPassword() {
			// 表单验证（与网页端一致）
			if (!this.formData.email) {
				uni.showToast({ title: '请输入邮箱地址', icon: 'none' });
				return;
			}
			
			if (!this.formData.code) {
				uni.showToast({ title: '请输入验证码', icon: 'none' });
				return;
			}
			
			// 验证验证码格式
			if (!/^\d{6}$/.test(this.formData.code)) {
				uni.showToast({ title: '请输入6位数字验证码', icon: 'none' });
				return;
			}
			
			if (!this.formData.newPassword) {
				uni.showToast({ title: '请输入新密码', icon: 'none' });
				return;
			}
			
			if (!this.isValidEmail(this.formData.email)) {
				uni.showToast({ title: '请输入正确的邮箱格式', icon: 'none' });
				return;
			}
			
			if (this.formData.newPassword !== this.formData.confirmPassword) {
				uni.showToast({ title: '两次输入的密码不一致', icon: 'none' });
				return;
			}
			
			// 检查密码是否与邮箱相同
			if (this.formData.newPassword.toLowerCase() === this.formData.email.toLowerCase()) {
				uni.showToast({ title: '密码不能与邮箱相同', icon: 'none' });
				return;
			}
			
			// 使用与网页端一致的密码验证
			const passwordValidation = this.validatePassword(this.formData.newPassword);
			if (!passwordValidation.isValid) {
				uni.showToast({ title: passwordValidation.message, icon: 'none' });
				return;
			}
			
			// 检查密码强度（与网页端一致，要求 level >= 2）
			const strength = this.calculatePasswordStrength(this.formData.newPassword);
			if (strength.level < 2) {
				uni.showToast({ title: '密码强度不足，请使用字母、数字和特殊字符组合', icon: 'none' });
				return;
			}
			
			this.loading = true;
			uni.showLoading({ title: '重置中...' });
			
			try {
				// 构建重置密码请求体（与网页端一致）
				const resetData = {
					email: this.formData.email,
					verificationCode: this.formData.code,
					newPassword: this.formData.newPassword,
					confirmPassword: this.formData.confirmPassword
				};
				
				// 调用重置密码API（与网页端一致）
				const res = await resetPassword(resetData);
				
				if (res.code === 200 || res.code === 0) {
					uni.showToast({ 
						title: '密码重置成功！请使用新密码登录', 
						icon: 'success',
						duration: 2000
					});
					
					// 延迟跳转到登录页面，让用户看到提示
					setTimeout(() => {
						this.goToLogin();
					}, 2000);
				} else {
					uni.showToast({ 
						title: res.msg || res.message || '密码重置失败，请重试', 
						icon: 'none' 
					});
				}
			} catch (error) {
				console.error('密码重置失败:', error);
				const errorMessage = error.msg || error.message || '密码重置失败，请稍后重试';
				uni.showToast({ 
					title: errorMessage, 
					icon: 'none' 
				});
			} finally {
				this.loading = false;
				uni.hideLoading();
			}
		},
		
		goToLogin() {
			uni.navigateBack();
		},
		
		goToChangeEmail() {
			// TODO: 跳转到修改邮箱页面
			uni.showToast({ title: '修改邮箱功能开发中', icon: 'none' });
		},
		
		closeSuccessModal() {
			this.showSuccessModal = false;
		}
	}
}
</script>

<style lang="scss" scoped>
@import '@/static/styles/forgot-password.scss';
</style>

