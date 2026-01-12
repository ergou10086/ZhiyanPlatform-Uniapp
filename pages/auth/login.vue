<template>
	<view class="login-page">
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
				<text class="title">欢迎回来</text>
				<text class="subtitle">登录您的账号继续使用</text>
			</view>
			
			<!-- 登录表单 -->
			<view class="form">
				<view class="input-group">
					<view class="input-wrapper">
						<uni-icons type="person" size="20" color="#999"></uni-icons>
						<input 
							class="input" 
							v-model="formData.username" 
							placeholder="请输入用户名或邮箱"
							placeholder-class="placeholder"
							@focus="onFocus('username')"
							@blur="onBlur"
						/>
					</view>
					<view class="input-line" :class="{ active: focusField === 'username' }"></view>
				</view>
				
				<view class="input-group">
					<view class="input-wrapper">
						<uni-icons type="locked" size="20" color="#999"></uni-icons>
						<input 
							class="input" 
							v-model="formData.password" 
							:password="!showPassword"
							placeholder="请输入密码"
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
				
				<view class="options">
					<view class="remember" @click="toggleRemember">
						<view class="checkbox" :class="{ checked: rememberMe }">
							<uni-icons v-if="rememberMe" type="checkmarkempty" size="14" color="#FFFFFF"></uni-icons>
						</view>
						<text class="option-text">记住我</text>
					</view>
					<text class="forgot-link" @click="forgotPassword">忘记密码？</text>
				</view>
				
				<button class="btn-login" @click="handleLogin" :disabled="loading">
					<text v-if="!loading">登录</text>
					<text v-else>登录中...</text>
				</button>
				
				<view class="divider">
					<view class="divider-line"></view>
					<text class="divider-text">或</text>
					<view class="divider-line"></view>
				</view>
				
				<view class="register-link">
					<text class="link-text">还没有账号？</text>
					<text class="link-btn" @click="goToRegister">立即注册</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { login, autoLoginCheck, refreshToken } from '@/api/user.js'
import config from '@/utils/config.js'
import {
	saveLoginData,
	isAutoLoginEnabled,
	getRefreshToken,
	getRememberMeToken,
	clearAuth
} from '@/utils/auth.js'
import uniId from '@/utils/uniId.js'

export default {
		data() {
			return {
			formData: {
				username: '',
				password: ''
			},
			showPassword: false,
			// 记住我默认不勾选，由用户主动选择
			rememberMe: false,
			focusField: '',
			loading: false
			}
		},
	onLoad() {
		this.initLoginPage();
	},
	methods: {
		// 初始化登录页：预填账号、检查本地登录状态和自动登录
		async initLoginPage() {
			// 1. 预填已保存的账号信息（不自动勾选记住我）
			const savedUsername = uni.getStorageSync('saved_username');
			const savedPassword = uni.getStorageSync('saved_password');
			if (savedUsername) {
				this.formData.username = savedUsername;
			}
			if (savedPassword) {
				this.formData.password = savedPassword;
			}
			// rememberMe 保持默认 false，由用户自己决定
			
			// 2. 如果本地已有有效 Token 和用户信息，直接跳转首页
			const token = uni.getStorageSync(config.tokenKey);
			const userInfo = uni.getStorageSync(config.userInfoKey);
			if (token && userInfo) {
				uni.switchTab({ url: '/pages/home/home' });
				return;
			}
			
			// 3. 检查是否启用了自动登录（记住我）
			if (!isAutoLoginEnabled() || !getRememberMeToken()) {
				return;
			}
			
			this.loading = true;
			uni.showLoading({ title: '自动登录中...' });
			try {
				const checkRes = await autoLoginCheck();
				console.log('自动登录检查响应:', {
					code: checkRes && checkRes.code,
					valid: checkRes && checkRes.valid
				});
				if (checkRes && (checkRes.code === 200 || checkRes.code === 0) && checkRes.valid) {
					const localRefreshToken = getRefreshToken();
					if (localRefreshToken) {
						try {
							const refreshRes = await refreshToken(localRefreshToken);
							console.log('刷新Token响应:', {
								code: refreshRes && refreshRes.code,
								hasAccessToken: !!(refreshRes && refreshRes.accessToken)
							});
							if (refreshRes && (refreshRes.code === 200 || refreshRes.code === 0) && refreshRes.accessToken) {
								// 通过刷新Token自动登录成功，记住我标记保持为 true
								saveLoginData({
									accessToken: refreshRes.accessToken,
									refreshToken: refreshRes.refreshToken,
									user: refreshRes.user
								}, true);
								uni.showToast({ title: '自动登录成功', icon: 'success', duration: 1000 });
								setTimeout(() => {
									uni.switchTab({ url: '/pages/home/home' });
								}, 1000);
								return;
							}
						} catch (e) {
							console.error('刷新Token失败:', e);
						}
					}
					// 有效的 RememberMe 但无法通过刷新Token恢复登录
					clearAuth();
					uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
				}
			} catch (e) {
				console.error('自动登录检查失败:', e);
			} finally {
				this.loading = false;
				uni.hideLoading();
			}
		},
		
		onFocus(field) {
			this.focusField = field;
		},
		
		onBlur() {
			this.focusField = '';
		},
		
		togglePassword() {
			this.showPassword = !this.showPassword;
		},
		
		toggleRemember() {
			this.rememberMe = !this.rememberMe;
		},
		
		async handleLogin() {
			// 表单验证
			if (!this.formData.username) {
				uni.showToast({ title: '请输入用户名或邮箱', icon: 'none' });
				return;
			}
			
			if (!this.formData.password) {
				uni.showToast({ title: '请输入密码', icon: 'none' });
				return;
			}
			
			if (this.formData.password.length < 6) {
				uni.showToast({ title: '密码长度不能少于6位', icon: 'none' });
				return;
			}

			this.loading = true;
			uni.showLoading({ title: '登录中...' });

			try {
				// 使用传统登录
				const res = await login(this.formData.username, this.formData.password, this.rememberMe);

				if (res.code === 200 || res.code === 0) {
					// 检查token是否存在
					if (!res.accessToken) {
						console.error('登录响应中缺少 accessToken');
						uni.showToast({
							title: '登录失败：缺少访问令牌',
							icon: 'none'
						});
						return;
					}

					// 统一使用 auth 工具保存登录相关数据
					saveLoginData({
						accessToken: res.accessToken,
						refreshToken: res.refreshToken,
						rememberMeToken: res.rememberMeToken,
						user: res.user
					}, this.rememberMe);

					// 记住用户名/密码（仅与当前 rememberMe 开关绑定）
					if (this.rememberMe) {
						// 验证token是否保存成功（只记录是否成功，不输出token内容）
						const savedToken = uni.getStorageSync(config.tokenKey);
						console.log('Token保存验证:', { saved: !!savedToken });
						if (!savedToken) {
							console.error('Token保存失败');
							uni.showToast({
								title: '登录失败：令牌保存失败',
								icon: 'none'
							});
							return;
						}
						uni.setStorageSync('saved_username', this.formData.username);
						uni.setStorageSync('saved_password', this.formData.password);
					} else {
						uni.removeStorageSync('saved_username');
						uni.removeStorageSync('saved_password');
					}

					// 同步用户信息到 uni-id 系统（异步，包含CID绑定）
					try {
						await this.syncUserToUniId(res.user, this.formData.password);
					} catch (e) {
						console.warn('同步用户信息到 uni-id 失败:', e);
						// 如果用户信息同步失败，尝试使用邮箱校验更新CID
						try {
							const pushCid = uni.getStorageSync('push_client_id') || null;
							if (pushCid && res.user.email) {
								// 使用新的邮箱校验CID方法
								await uniId.verifyAndUpdateCid(res.user.email, pushCid);
								console.log('通过邮箱校验成功更新CID');
							} else if (typeof uni.getPushClientId === 'function') {
								uni.getPushClientId({
									success: async (r) => {
										if (r && r.cid && res.user.email) {
											uni.setStorageSync('push_client_id', r.cid);
											try {
												await uniId.verifyAndUpdateCid(res.user.email, r.cid);
												console.log('通过邮箱校验成功绑定CID');
											} catch (verifyError) {
												console.warn('邮箱校验CID失败:', verifyError);
											}
										}
									},
									fail: () => { /* ignore */ }
								});
							}
						} catch (cidError) {
							console.warn('CID操作失败:', cidError);
						}
					}

					uni.showToast({
						title: '登录成功',
						icon: 'success',
						duration: 1500
					});

					// 延迟跳转到首页
					setTimeout(() => {
						console.log('登录成功，准备跳转到首页');
						uni.switchTab({
							url: '/pages/home/home'
						});
					}, 1500);
				} else {
					uni.showToast({
						title: this.getLoginErrorMessage(res) || '登录失败，请检查用户名和密码',
						icon: 'none'
					});
				}
			} catch (error) {
				console.error('登录失败:', error);
				uni.showToast({
					title: this.getLoginErrorMessage(error) || '登录失败，请稍后重试',
					icon: 'none'
				});
			} finally {
				this.loading = false;
				uni.hideLoading();
			}
		},
		getLoginErrorMessage(err) {
			if (!err) return '';
			// 兜底：后端/网关常用状态码
			const statusCode = err.statusCode || err.status || err.httpStatus || err.data?.statusCode;
			if (statusCode === 401 || statusCode === 403) return '账号或密码错误';

			// 一些业务层也会用 code 表达错误
			const bizCode = err.code || err.data?.code;
			if ((bizCode === 401 || bizCode === 403) && !err.msg && !err.message) return '账号或密码错误';

			const rawMsg = (typeof err === 'string')
				? err
				: (
					err.msg ||
					err.message ||
					err.error ||
					err.data?.msg ||
					err.data?.message ||
					err.data?.error ||
					err.data?.data?.msg ||
					err.data?.data?.message ||
					err.errMsg ||
					''
				);

			const msg = String(rawMsg || '').trim();
			if (!msg) return '';

			const msgLower = msg.toLowerCase();
			if (msgLower.includes('timeout') || msgLower.includes('超时')) return '请求超时，请检查网络或稍后重试';
			if (msgLower.includes('network') || msgLower.includes('fail to fetch') || msgLower.includes('无法连接')) return '无法连接服务器，请检查网络';
			if (msgLower.includes('密码') && (msgLower.includes('错误') || msgLower.includes('不正确'))) return '密码错误';
			if ((msgLower.includes('用户') || msgLower.includes('账号')) && (msgLower.includes('不存在') || msgLower.includes('not found'))) return '账号不存在';
			if (msgLower.includes('禁用') || msgLower.includes('锁定') || msgLower.includes('disabled') || msgLower.includes('locked')) return '账号已被禁用，请联系管理员';
			if (msgLower.includes('unauthorized') || msgLower.includes('401')) return '账号或密码错误';

			return msg;
		},

		forgotPassword() {
			uni.navigateTo({ url: '/pages/auth/forgot-password' });
		},

		goToRegister() {
			uni.navigateTo({ url: '/pages/auth/register' });
		},

		// 同步用户信息到 uni-id 系统
		async syncUserToUniId(userInfo, password) {
			if (!userInfo || !password) return;

			try {
				// 获取本地存储的CID（如果有的话）
				const cid = uni.getStorageSync('push_client_id')

				// 使用云函数直接在数据库中创建或更新用户信息
				const syncData = {
					userInfo: userInfo,
					password: password
				}

				// 如果有CID，一起传递
				if (cid) {
					syncData.cid = cid
				}

				console.log('调用 syncUser，传递数据:', { action: 'syncUser', data: syncData })

				const syncResult = await uniCloud.callFunction({
					name: 'bindCid',
					data: {
						action: 'syncUser',
						data: syncData
					}
				});

				console.log('syncUser 调用结果:', syncResult)

				if (syncResult.result && syncResult.result.code === 0) {
					console.log('用户信息已同步到 uni-id 系统');
					// 如果有CID并且同步成功，说明CID也已经绑定了，不需要再次调用bindCid
					if (cid && syncResult.result.message.includes('CID')) {
						console.log('CID已随用户信息同步完成')
						return
					}
				} else {
					console.warn('同步用户信息到 uni-id 失败:', syncResult.result?.message || '未知错误');
				}
			} catch (error) {
				console.warn('同步用户信息到 uni-id 出错:', error);
			}
		},

		// 绑定 CID 到当前登录用户（调用 uniCloud 云函数）
		async bindCidToUser(cid) {
			if (!cid) return;
			try {
				const token = uni.getStorageSync(config.tokenKey);
				if (!token) return;
				const res = await uniCloud.callFunction({
					name: 'bindCid',
					data: { cid, token }
				});
				console.log('bindCid result', res);
			} catch (e) {
				console.warn('bindCidToUser failed', e);
			}
		}
	}
}
</script>

<style lang="scss" scoped>
@import '@/static/styles/login.scss';
</style>
