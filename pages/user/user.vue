<template>
	<view class="user-page">
		<!-- 导航栏（自定义，包含状态栏高度） -->
		<view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="nav-left-placeholder"></view>
			<view class="nav-title">个人信息</view>
			<view class="nav-right" @click="showNotification">
				<uni-icons type="bell" size="24" color="#333"></uni-icons>
			</view>
		</view>

		<scroll-view class="content" scroll-y>
			<!-- 个人信息卡片 - 现代化设计 -->
			<view class="profile-card">
				<!-- 背景装饰 -->
				<view class="profile-bg-decoration"></view>
				
				<!-- 扫码按钮 - 右上角 -->
				<view v-if="!isViewingOther" class="profile-scan-btn" @click="openQRCodeLoginPopup">
					<uni-icons type="scan" size="18" color="#667eea"></uni-icons>
				</view>
				
				<!-- 用户头像和基本信息 -->
				<view class="profile-header">
					<view class="profile-avatar-container" @click="changeAvatar">
						<view class="profile-avatar">
							<image v-if="userInfo.avatarData || userInfo.avatar" :src="userInfo.avatarData || userInfo.avatar" mode="aspectFill"></image>
							<uni-icons v-else type="person-filled" size="20" color="#CCCCCC"></uni-icons>
						</view>
					</view>
					
					<view class="profile-info">
						<view class="profile-name-row">
							<text class="profile-name">{{ userInfo.username || '未设置' }}</text>
						</view>
						<text class="profile-id">ID: {{ userInfo.userId || '---' }}</text>
					</view>
				</view>
				
				<!-- 个人简介 - 占满一横排 -->
				<view class="profile-bio-full">
					<text class="bio-text-full">{{ userInfo.bio || '这个人很懒，什么都没有留下。' }}</text>
				</view>
			</view>

			<!-- 邮箱地址 - 现代化设计 -->
			<view class="modern-card">
				<view class="modern-card-header">
					<view class="modern-card-icon">
						<uni-icons type="email" size="20" color="#667eea"></uni-icons>
					</view>
					<view class="modern-card-info">
						<text class="modern-card-title">邮箱地址</text>
						<text class="modern-card-value">{{ maskedEmail }}</text>
					</view>
					<button
						v-if="!isViewingOther"
						class="modern-card-btn"
						@click="editEmail"
					>
						<uni-icons type="compose" size="16" color="#FFFFFF"></uni-icons>
						<text class="modern-card-btn-text">修改</text>
					</button>
				</view>
			</view>

			<!-- 关联链接 - 现代化设计 -->
			<view class="modern-card">
				<view class="modern-card-header">
					<view class="modern-card-icon">
						<uni-icons type="link" size="20" color="#667eea"></uni-icons>
					</view>
					<view class="modern-card-info">
						<text class="modern-card-title">关联链接</text>
						<text class="modern-card-subtitle">{{ profileLinks.length }} 个链接</text>
					</view>
					<view class="modern-card-actions" v-if="!isViewingOther">
						<button class="modern-card-btn modern-card-btn-secondary" @click="saveContact">保存</button>
						<button class="modern-card-btn" @click="linkContact">
							<uni-icons type="plus" size="16" color="#FFFFFF"></uni-icons>
							<text class="modern-card-btn-text">添加</text>
						</button>
					</view>
				</view>
				<view class="modern-card-body">
					<view class="loading-state" v-if="loading && profileLinks.length === 0">
						<uni-icons type="loading" size="20" color="#667eea"></uni-icons>
						<text class="loading-text">关联链接加载中...</text>
					</view>
					<view class="empty-state" v-else-if="!loading && profileLinks.length === 0">
						<uni-icons type="link" size="32" color="#cbd5e1"></uni-icons>
						<text class="empty-text">还没有添加任何关联链接</text>
					</view>
					<view v-else class="links-list">
						<view class="link-item-modern" v-for="(link, index) in profileLinks" :key="index">
							<view class="link-content">
								<view class="link-icon">
									<uni-icons type="link" size="16" color="#667eea"></uni-icons>
								</view>
								<view class="link-info">
									<text class="link-title">{{ link.label || link.url }}</text>
									<text class="link-url">{{ link.url }}</text>
								</view>
							</view>
							<button
								v-if="!isViewingOther"
								class="link-remove-btn-modern"
								@click="removeProfileLink(index)"
							>
								<uni-icons type="trash" size="14" color="#ef4444"></uni-icons>
							</button>
						</view>
					</view>
				</view>
			</view>

			<!-- 所属机构 - 现代化设计 -->
			<view class="modern-card">
				<view class="modern-card-header">
					<view class="modern-card-icon">
						<uni-icons type="home" size="20" color="#667eea"></uni-icons>
					</view>
					<view class="modern-card-info">
						<text class="modern-card-title">所属机构</text>
						<text class="modern-card-value">{{ userInfo.organization || '职业学校' }}</text>
					</view>
					<button class="modern-card-btn" @click="editOrganization">
						<uni-icons type="compose" size="16" color="#FFFFFF"></uni-icons>
						<text class="modern-card-btn-text">绑定</text>
					</button>
				</view>
			</view>

			<!-- 标签管理 - 现代化设计 -->
			<view class="modern-card">
				<view class="modern-card-header">
					<view class="modern-card-icon">
						<uni-icons type="star" size="20" color="#667eea"></uni-icons>
					</view>
					<view class="modern-card-info">
						<text class="modern-card-title">标签管理</text>
						<text class="modern-card-subtitle">{{ (userInfo.tags || []).length }} 个标签</text>
					</view>
					<button class="modern-card-btn" @click="manageTags">
						<uni-icons type="plus" size="16" color="#FFFFFF"></uni-icons>
						<text class="modern-card-btn-text">管理</text>
					</button>
				</view>
				<view class="modern-card-body">
					<view class="tags-list" v-if="(userInfo.tags || []).length > 0">
						<view class="tag-item-modern" v-for="(tag, index) in userInfo.tags" :key="index">
							<text class="tag-text">{{ tag }}</text>
						</view>
					</view>
					<view class="empty-tags" v-else>
						<text class="empty-tags-text">暂无标签，点击管理按钮添加</text>
					</view>
				</view>
			</view>

			<!-- 账户管理 - 现代化设计 -->
			<view class="modern-card danger-card">
				<view class="modern-card-header">
					<view class="modern-card-icon danger-icon">
						<uni-icons type="info" size="20" color="#ef4444"></uni-icons>
					</view>
					<view class="modern-card-info">
						<text class="modern-card-title">账户管理</text>
						<text class="modern-card-subtitle">危险操作，请谨慎</text>
					</view>
				</view>
				<view class="modern-card-body">
					<view class="warning-box-modern">
						<uni-icons type="info" size="20" color="#f59e0b"></uni-icons>
						<text class="warning-text-modern">注销账号后，您的所有数据将被永久删除且无法恢复。此操作不可撤销。</text>
					</view>
					<button class="modern-card-btn danger-btn" @click="deleteAccount">
						<uni-icons type="trash" size="16" color="#FFFFFF"></uni-icons>
						<text class="modern-card-btn-text">注销账号</text>
					</button>
				</view>
			</view>

			<!-- 退出登录 - 现代化设计 -->
			<view class="modern-card">
				<button class="logout-btn-modern" @click="handleLogout">
					<uni-icons type="poweroff" size="20" color="#667eea"></uni-icons>
					<text class="logout-text">退出登录</text>
				</button>
			</view>

			<!-- 底部间距 -->
			<view class="bottom-space"></view>
		</scroll-view>

		<!-- 修改邮箱弹窗 -->
		<uni-popup ref="emailPopup" type="center">
			<view class="email-popup">
				<view class="email-popup-header">
					<text class="email-popup-title">修改登录邮箱</text>
					<view class="email-popup-close" @click="closeEmailPopup">
						<uni-icons type="close" size="20" color="#666"></uni-icons>
					</view>
				</view>
				<view class="email-popup-body">
					<view class="email-field">
						<text class="email-label">当前邮箱</text>
						<text class="email-value">{{ userInfo.email || '未设置' }}</text>
					</view>
					<view class="email-field">
						<text class="email-label">新邮箱</text>
						<input
							v-model="emailForm.newEmail"
							class="email-input"
							placeholder="请输入新的登录邮箱"
							placeholder-class="email-input-placeholder"
						/>

					</view>
					<view class="email-field email-code-row">
						<view class="email-code-input-wrap">
							<text class="email-label">验证码</text>
							<input
								v-model="emailForm.code"
								class="email-input"
								placeholder="请输入邮箱验证码"
								placeholder-class="email-input-placeholder"
								maxlength="6"
							/>
						</view>
						<button
							class="email-code-btn"
							:class="{ disabled: sendingEmailCode || emailCodeCountdown > 0 }"
							@click="handleSendChangeEmailCode"
						>
							<text v-if="emailCodeCountdown === 0">获取验证码</text>
							<text v-else>{{ emailCodeCountdown }}s</text>
						</button>
					</view>
					<view class="email-tip">
						<text>出于账号安全考虑，修改邮箱需要验证发送到新邮箱的验证码。</text>
					</view>
				</view>
				<view class="email-popup-footer">
					<button class="email-btn-cancel" @click="closeEmailPopup">取消</button>
					<button class="email-btn-confirm" @click="submitChangeEmail" :disabled="emailSubmitting">
						<text v-if="!emailSubmitting">确认修改</text>
						<text v-else>提交中...</text>
					</button>
				</view>
			</view>
		</uni-popup>
		<uni-popup ref="linkPopup" type="center">
			<view class="email-popup">
				<view class="email-popup-header">
					<text class="email-popup-title">添加关联链接</text>
					<view class="email-popup-close" @click="closeLinkPopup">
						<uni-icons type="close" size="20" color="#666"></uni-icons>
					</view>
				</view>
				<view class="email-popup-body">
					<view class="email-field">
						<text class="email-label">链接地址</text>
						<input
							v-model="linkForm.url"
							class="email-input"
							placeholder="请输入链接地址，例如：https://example.com"
							placeholder-class="email-input-placeholder"
						/>
					</view>
					<view class="email-field">
						<text class="email-label">链接名称（可选）</text>
						<input
							v-model="linkForm.label"
							class="email-input"
							placeholder="例如：个人主页、GitHub"
							placeholder-class="email-input-placeholder"
						/>
					</view>
					<view class="email-tip">
						<text>建议填写可以直接访问的完整链接地址。</text>
					</view>
				</view>
				<view class="email-popup-footer">
					<button class="email-btn-cancel" @click="closeLinkPopup">取消</button>
					<button class="email-btn-confirm" @click="submitLink" :disabled="linkSubmitting">
						<text v-if="!linkSubmitting">确定</text>
						<text v-else>保存中...</text>
					</button>
				</view>
			</view>
		</uni-popup>
		<uni-popup ref="orgPopup" type="center">
			<view class="email-popup">
				<view class="email-popup-header">
					<text class="email-popup-title">编辑所属机构</text>
					<view class="email-popup-close" @click="closeOrgPopup">
						<uni-icons type="close" size="20" color="#666"></uni-icons>
					</view>
				</view>
				<view class="email-popup-body">
					<view class="email-field">
						<text class="email-label">所属机构</text>
						<input
							v-model="orgForm.organization"
							class="email-input"
							placeholder="请输入所属机构"
							placeholder-class="email-input-placeholder"
						/>
					</view>
					<view class="email-tip">
						<text>例如：某某大学、某某研究院、某公司实验室等。</text>
					</view>
				</view>
				<view class="email-popup-footer">
					<button class="email-btn-cancel" @click="closeOrgPopup">取消</button>
					<button class="email-btn-confirm" @click="submitOrganization" :disabled="orgSubmitting">
						<text v-if="!orgSubmitting">确定</text>
						<text v-else>保存中...</text>
					</button>
				</view>
			</view>
		</uni-popup>

		<!-- 标签管理弹窗 -->
		<uni-popup ref="tagPopup" type="bottom">
			<view class="tag-popup">
				<view class="tag-popup-header">
					<text class="tag-popup-title">管理研究方向标签</text>
					<view class="tag-popup-header-actions">
						<text class="tag-popup-done" @click="confirmTagSelection">完成</text>
						<view class="tag-popup-close" @click="closeTagPopup">
							<uni-icons type="close" size="20" color="#666"></uni-icons>
						</view>
					</view>
				</view>
				<view class="tag-popup-body">
					<text class="tag-popup-hint">最多可添加 5 个研究方向标签，当前已添加 {{ editingTags.length }}/5</text>
					<view class="tag-search">
						<input
							v-model="tagSearchKeyword"
							@input="searchTags"
							class="tag-search-input"
							placeholder="搜索预设标签或输入自定义标签..."
						/>
					</view>
					<view class="tag-selection-area">
						<view v-if="filteredPresetTags.length === 0 && tagSearchKeyword" class="custom-tag-suggestion">
							<text class="custom-tag-text">未找到匹配的预设标签</text>
							<button class="btn-add-custom" :disabled="editingTags.length >= 5" @click="addCustomTag">
								添加自定义标签 "{{ tagSearchKeyword }}"
							</button>
							<text class="custom-tag-note">* 自定义标签将直接添加到您的标签列表</text>
						</view>
						<view v-else class="preset-tags-grid">
							<view
								v-for="tag in filteredPresetTags"
								:key="tag.id"
								class="preset-tag-item"
								:class="{ selected: isTagSelected(tag), disabled: editingTags.length >= 5 && !isTagSelected(tag) }"
								@click="toggleTagSelection(tag)"
							>
								<text class="preset-tag-name">{{ tag.name }}</text>
							</view>
						</view>
					</view>
					<view v-if="editingTags.length > 0" class="selected-tags-section">
						<text class="selected-tags-title">已选标签</text>
						<view class="selected-tags-list">
							<view v-for="(tag, index) in editingTags" :key="index" class="selected-tag">
								<text class="selected-tag-name">{{ tag }}</text>
								<button class="selected-tag-remove" @click.stop="removeTag(index)">
									<uni-icons type="closeempty" size="14" color="#666"></uni-icons>
								</button>
							</view>
						</view>
					</view>
				</view>
			</view>
		</uni-popup>

		<uni-popup ref="qrLoginPopup" type="center">
			<view class="qr-login-popup">
				<view class="qr-login-header">
					<text class="qr-login-title">用手机授权 PC 登录</text>
					<view class="qr-login-close" @click="closeQRCodeLoginPopup">
						<uni-icons type="close" size="20" color="#666"></uni-icons>
					</view>
				</view>
				<view class="qr-login-body">
					<view class="qr-login-desc">扫描 PC 端登录页展示的二维码（H5 不支持时可粘贴 code）</view>
					<view v-if="qrScanNotSupported" class="qr-login-manual">
						<input
							class="qr-login-input"
							v-model="qrManualText"
							placeholder="粘贴 code 或 zhiyan://qrlogin?code=..."
							placeholder-class="qr-login-placeholder"
						/>
						<button class="qr-login-confirm" :disabled="qrLoading || !qrManualText" @click="submitQrManual">
							<text v-if="!qrLoading">确认授权</text>
							<text v-else>处理中...</text>
						</button>
					</view>
					<button class="qr-login-scan" :disabled="qrLoading" @click="startQrScan">
						<text v-if="!qrLoading">开始扫码</text>
						<text v-else>处理中...</text>
					</button>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
import {
	getCurrentUser,
	updateMyProfile,
	updateMyBio,
	uploadAvatar,
	getMyAvatar,
	deleteUser,
	getMyResearchTags,
	getUserById,
	getUserResearchTags,
	getMyProfileLinks,
	updateMyProfileLinks,
	getUserProfileLinks,
	updateResearchTags,
	changeEmail,
	sendVerificationCode,
	scanLoginQRCode,
	confirmLoginQRCode
} from '@/api/user.js'
import config from '@/utils/config.js'
import {
	isGuest,
	getCurrentRoleName,
	requireLogin,
	clearAuth
} from '@/utils/auth.js'

export default {
	data() {
		return {
			statusBarHeight: 0, // 状态栏高度
			userInfo: {
				username: '',
				userId: '',
				avatar: '',
				bio: '',
				email: '',
				organization: '',
				realName: '',
				phone: ''
			},
			userTags: [],
			presetTags: [],
			filteredPresetTags: [],
			tagSearchKeyword: '',
			editingTags: [],
			profileLinks: [],
			loading: false,
			isGuest: true,
			roleName: '游客',
			currentUserId: null,
			viewingUserId: null,
			isViewingOther: false,
			// 修改邮箱相关状态
			emailForm: {
				newEmail: '',
				code: ''
			},
			sendingEmailCode: false,
			emailCodeCountdown: 0,
			emailCodeTimer: null,
			emailSubmitting: false,
			linkForm: {
				url: '',
				label: ''
			},
			linkSubmitting: false,
			orgForm: {
				organization: ''
			},
			orgSubmitting: false,
			qrLoading: false,
			qrScanNotSupported: false,
			qrManualText: ''
		}
	},
	computed: {
		maskedEmail() {
			if (!this.userInfo.email) return '未设置';
			const email = this.userInfo.email;
			const [name, domain] = email.split('@');
			if (!name || !domain) return email;
			if (name.length <= 3) {
				return `${name[0]}***@${domain}`;
			}
			return `${name.substring(0, 2)}***${name.substring(name.length - 1)}@${domain}`;
		}
	},
	onLoad(options) {
		this.getSystemInfo();
		this.checkLoginStatus();
		// 判断是否携带 userId 参数，用于查看他人资料
		const routeUserId = options && options.userId ? String(options.userId) : null;
		const storedUserInfo = uni.getStorageSync(config.userInfoKey);
		const currentId = storedUserInfo?.id;
		if (routeUserId && currentId && routeUserId !== String(currentId)) {
			// 查看他人资料
			this.currentUserId = currentId;
			this.viewingUserId = routeUserId;
			this.isViewingOther = true;
		} else {
			// 查看自己的资料（或无参数时默认）
			this.currentUserId = currentId || null;
			this.viewingUserId = currentId || null;
			this.isViewingOther = false;
		}
	},
	onShow() {
		// 每次显示页面时重新检查登录状态和加载用户信息
		this.checkLoginStatus();
		if (this.isGuest) {
			return;
		}
		if (this.isViewingOther && this.viewingUserId) {
			this.loadOtherUserInfo();
		} else {
			this.loadUserInfo();
		}
	},
	methods: {
		// 获取系统信息（用于设置状态栏高度）
		getSystemInfo() {
			try {
				const systemInfo = uni.getSystemInfoSync();
				this.statusBarHeight = systemInfo.statusBarHeight || 0;
			} catch (e) {
				console.error('获取系统信息失败:', e);
				this.statusBarHeight = 20;
			}
		},
		checkLoginStatus() {
			this.isGuest = isGuest();
			this.roleName = getCurrentRoleName();
		},

		showNotification() {
			uni.showToast({ title: '暂无新通知', icon: 'none' });
		},

		goToLogin() {
			uni.navigateTo({ url: '/pages/auth/login' });
		},

		goToQRCodeLogin() {
			if (!requireLogin('扫码登录(PC)')) {
				return;
			}
			this.openQRCodeLoginPopup();
		},

		openQRCodeLoginPopup() {
			if (!requireLogin('扫码登录(PC)')) {
				return;
			}
			this.qrLoading = false;
			this.qrScanNotSupported = false;
			this.qrManualText = '';
			if (this.$refs.qrLoginPopup && this.$refs.qrLoginPopup.open) {
				this.$refs.qrLoginPopup.open();
			}
			setTimeout(() => {
				this.startQrScan();
			}, 200);
		},

		closeQRCodeLoginPopup() {
			if (this.$refs.qrLoginPopup && this.$refs.qrLoginPopup.close) {
				this.$refs.qrLoginPopup.close();
			}
		},

		parseQrCodeId(raw) {
			if (!raw) return '';
			const text = String(raw).trim();
			if (!text) return '';
			if (text.includes('code=')) {
				try {
					const normalized = text.replace(/^zhiyan:\/\//, 'https://dummy/');
					const url = new URL(normalized);
					return url.searchParams.get('code') || '';
				} catch (e) {
					const match = text.match(/(?:\?|&)code=([^&]+)/);
					return match ? decodeURIComponent(match[1]) : '';
				}
			}
			return text;
		},

		async authorizeQrLogin(qrCodeId) {
			if (!qrCodeId) {
				uni.showToast({ title: '二维码内容无效', icon: 'none' });
				return;
			}
			const confirmRes = await new Promise(resolve => {
				uni.showModal({
					title: '确认授权登录',
					content: '确认后将授权 PC 端使用你的账号登录。',
					confirmText: '确认',
					cancelText: '取消',
					success: resolve
				});
			});
			if (!confirmRes || !confirmRes.confirm) {
				return;
			}
			await scanLoginQRCode(qrCodeId);
			const res = await confirmLoginQRCode(qrCodeId);
			if (res && (res.code === 200 || res.code === 0)) {
				uni.showToast({ title: '授权成功', icon: 'success', duration: 1200 });
				setTimeout(() => {
					this.closeQRCodeLoginPopup();
				}, 1200);
				return;
			}
			uni.showToast({ title: (res && (res.msg || res.message)) || '授权失败', icon: 'none' });
		},

		async startQrScan() {
			if (this.qrLoading) return;
			this.qrLoading = true;
			try {
				const scanRes = await new Promise((resolve, reject) => {
					uni.scanCode({
						scanType: ['qrCode'],
						success: resolve,
						fail: reject
					});
				});
				const qrCodeId = this.parseQrCodeId(scanRes && (scanRes.result || scanRes.path || scanRes.rawData));
				await this.authorizeQrLogin(qrCodeId);
			} catch (e) {
				const errMsg = (e && (e.msg || e.message || e.errMsg)) || '';
				if (errMsg && errMsg.includes('not supported')) {
					this.qrScanNotSupported = true;
					uni.showToast({ title: '当前环境不支持扫码，请改用粘贴 code', icon: 'none' });
					return;
				}
				if (errMsg && errMsg.includes('cancel')) {
					return;
				}
				uni.showToast({ title: errMsg || '扫码失败', icon: 'none' });
			} finally {
				this.qrLoading = false;
			}
		},

		async submitQrManual() {
			if (this.qrLoading) return;
			this.qrLoading = true;
			try {
				const qrCodeId = this.parseQrCodeId(this.qrManualText);
				await this.authorizeQrLogin(qrCodeId);
			} catch (e) {
				const errMsg = (e && (e.msg || e.message || e.errMsg)) || '';
				uni.showToast({ title: errMsg || '操作失败', icon: 'none' });
			} finally {
				this.qrLoading = false;
			}
		},

		logout() {
			uni.showModal({
				title: '确认退出登录',
				content: '退出后需要重新登录才能使用账号功能',
				confirmText: '退出',
				cancelText: '取消',
				success: (res) => {
					if (res.confirm) {
						clearAuth();
						uni.reLaunch({ url: '/pages/auth/login' });
					}
				}
			});
		},

		async loadUserInfo() {
			// 仅在已登录时加载用户信息
			if (this.isGuest) {
				return;
			}
			if (this.loading) return;
			this.loading = true;

			// 先读取本地缓存的用户信息、标签和关联链接，用于快速首屏渲染
			const storedUserInfo = uni.getStorageSync(config.userInfoKey) || null;
			const cachedTags = uni.getStorageSync(config.researchTagsCacheKey);
			const cachedLinks = uni.getStorageSync(config.profileLinksCacheKey);

			// 如果本地已有用户信息缓存，先用缓存填充，避免白屏
			if (storedUserInfo) {
				const cachedAvatar = storedUserInfo.avatarUrl || storedUserInfo.avatar || this.userInfo.avatar || '';
				const cachedAvatarData = storedUserInfo.avatarData || this.userInfo.avatarData || '';
				this.userInfo = {
					username: storedUserInfo.name || storedUserInfo.username || '未设置',
					userId: storedUserInfo.id || '',
					avatar: cachedAvatar,
					avatarData: cachedAvatarData,
					bio: '',
					email: storedUserInfo.email || '',
					organization: this.userInfo.organization || '未设置',
					realName: storedUserInfo.name || '',
					phone: ''
				};
			}

			// 先用本地缓存的标签和关联链接渲染，减少体感等待
			if (Array.isArray(cachedTags) && cachedTags.length > 0) {
				this.userTags = cachedTags;
				// 同步到userInfo.tags以在界面显示
				this.$set(this.userInfo, 'tags', cachedTags);
			}
			if (Array.isArray(cachedLinks) && cachedLinks.length > 0) {
				this.profileLinks = cachedLinks;
			}

			let needHideLoading = false;
			// 首次进入（本地没有缓存）时才展示全屏加载提示
			if (!storedUserInfo) {
				uni.showLoading({ title: '加载中...' });
				needHideLoading = true;
			}
			try {
				const userPromise = getCurrentUser();
				const tagPromise = getMyResearchTags().catch(err => {
					console.error('加载研究方向标签失败:', err);
					return null;
				});
				const linkPromise = getMyProfileLinks().catch(err => {
					console.error('加载关联链接失败:', err);
					return null;
				});

				const res = await userPromise;
				console.log(' 获取用户信息响应:', res);
				if (res && (res.code === 200 || res.code === 0)) {
					// 映射后端返回的字段
					const nextAvatar = res.avatarUrl || this.userInfo.avatar || '';
					this.userInfo = {
						username: res.name || '未设置',
						userId: res.id || '',
						avatar: nextAvatar,
						avatarData: res.avatarData || this.userInfo.avatarData || '',
						bio: res.description || '',
						email: res.email || '',
						organization: res.institution || '未设置',
						realName: res.name || '',
						phone: ''
					};
					const mappedLocalUser = {
						id: res.id || storedUserInfo?.id,
						email: res.email || storedUserInfo?.email,
						name: res.name || storedUserInfo?.name,
						avatarUrl: nextAvatar || storedUserInfo?.avatarUrl || storedUserInfo?.avatar || '',
						avatarData: this.userInfo.avatarData || storedUserInfo?.avatarData || '',
						role: storedUserInfo?.role || 'USER'
					};
					uni.setStorageSync(config.userInfoKey, mappedLocalUser);
				}

				// 处理研究方向标签响应
				const tagRes = await tagPromise;
				console.log(' 获取研究方向标签响应:', tagRes);
				if (tagRes && (tagRes.code === 200 || tagRes.code === 0)) {
					const tags = Array.isArray(tagRes.data)
						? tagRes.data.filter(tag => !!tag)
						: [];
					this.userTags = tags;
					// 同步到userInfo.tags以在界面显示
					this.$set(this.userInfo, 'tags', tags);
					uni.setStorageSync(config.researchTagsCacheKey, tags);
				}

				// 处理关联链接响应
				const linkRes = await linkPromise;
				console.log(' 获取关联链接响应:', linkRes);
				if (linkRes && (linkRes.code === 200 || linkRes.code === 0)) {
					const links = Array.isArray(linkRes.data)
						? linkRes.data.filter(link => !!link)
						: [];
					this.profileLinks = links;
					uni.setStorageSync(config.profileLinksCacheKey, links);
				}
			} catch (error) {
				console.error('加载用户信息失败:', error);
				// 401 / 403（令牌过期或未授权）已在 request.js 中统一处理，这里不再重复提示
				if (!(error && (error.status === 401 || error.status === 403))) {
					uni.showToast({ title: '加载失败', icon: 'none' });
				}
			} finally {
				this.loading = false;
				if (needHideLoading) {
					uni.hideLoading();
				}
			}
		},

		async loadOtherUserInfo() {
			// 仅在已登录且有目标用户ID时加载他人信息
			if (this.isGuest || !this.viewingUserId) {
				return;
			}
			if (this.loading) return;
			this.loading = true;
			uni.showLoading({ title: '加载中...' });
			try {
				console.log('👤 正在加载他人资料，userId:', this.viewingUserId);
				const userPromise = getUserById(this.viewingUserId);
				const tagPromise = getUserResearchTags(this.viewingUserId).catch(tagErr => {
					console.error('加载他人研究方向标签失败:', tagErr);
					return null;
				});
				const linkPromise = getUserProfileLinks(this.viewingUserId).catch(linkErr => {
					console.error('加载他人关联链接失败:', linkErr);
					return null;
				});

				const res = await userPromise;
				console.log('📥 获取他人用户信息响应:', res);
				if (res && (res.code === 200 || res.code === 0)) {
					this.userInfo = {
						username: res.username || res.name || '未设置',
						userId: res.id || res.userId || '',
						avatar: res.avatarUrl || res.avatar || '',
						avatarData: '',
						bio: res.description || '',
						email: res.email || '',
						organization: res.organization || res.institution || '未设置',
						realName: res.name || '',
						phone: ''
					};
				}
				const tagRes = await tagPromise;
				console.log('📥 获取他人研究方向标签响应:', tagRes);
				if (tagRes && (tagRes.code === 200 || tagRes.code === 0)) {
					const tags = Array.isArray(tagRes.data)
						? tagRes.data.filter(tag => !!tag)
						: [];
					this.userTags = tags;
				} else {
					this.userTags = [];
				}
				const linkRes = await linkPromise;
				console.log('📥 获取他人关联链接响应:', linkRes);
				if (linkRes && (linkRes.code === 200 || linkRes.code === 0)) {
					const links = Array.isArray(linkRes.data)
						? linkRes.data.filter(link => !!link)
						: [];
					this.profileLinks = links;
				} else {
					this.profileLinks = [];
				}
			} catch (error) {
				console.error('加载他人用户信息失败:', error);
				if (!(error && (error.status === 401 || error.status === 403))) {
					uni.showToast({ title: '加载失败', icon: 'none' });
				}
			} finally {
				this.loading = false;
				uni.hideLoading();
			}
		},

		async changeAvatar() {
			// 查看他人资料时不允许修改头像
			if (this.isViewingOther) {
				uni.showToast({ title: '暂不支持在此修改他人信息', icon: 'none' });
				return;
			}
			// 权限检查：需要登录
			if (!requireLogin('更改头像')) {
				return;
			}

			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: async (res) => {
					const tempFilePath = res.tempFilePaths[0];

					uni.showLoading({ title: '上传中...' });
					try {
						const result = await uploadAvatar(tempFilePath);
						if (result.code === 200 || result.code === 0) {
							this.userInfo.avatar = result.data.avatarUrl || tempFilePath;
							uni.showToast({ title: '头像上传成功', icon: 'success' });
						} else {
							uni.showToast({ title: '上传失败', icon: 'none' });
						}
					} catch (error) {
						console.error('上传头像失败:', error);
						uni.showToast({ title: '上传失败', icon: 'none' });
					} finally {
						uni.hideLoading();
					}
				}
			});
		},

		// 修改邮箱：弹窗入口
		editEmail() {
			// 查看他人资料时不允许编辑
			if (this.isViewingOther) {
				uni.showToast({ title: '暂不支持在此修改他人信息', icon: 'none' });
				return;
			}
			// 权限检查：需要登录
			if (!requireLogin('编辑邮箱')) {
				return;
			}
			// 重置表单状态
			this.emailForm.newEmail = '';
			this.emailForm.code = '';
			if (this.$refs.emailPopup && this.$refs.emailPopup.open) {
				this.$refs.emailPopup.open();
			}
		},

		closeEmailPopup() {
			if (this.$refs.emailPopup && this.$refs.emailPopup.close) {
				this.$refs.emailPopup.close();
			}
		},

		async handleSendChangeEmailCode() {
			if (this.sendingEmailCode || this.emailCodeCountdown > 0) {
				return;
			}
			const email = (this.emailForm.newEmail || '').trim();
			if (!email) {
				uni.showToast({ title: '请先输入新邮箱地址', icon: 'none' });
				return;
			}
			const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailReg.test(email)) {
				uni.showToast({ title: '邮箱格式不正确', icon: 'none' });
				return;
			}
			this.sendingEmailCode = true;
			try {
				const res = await sendVerificationCode(email, 'CHANGE_EMAIL');
				if (res.code === 200 || res.code === 0) {
					uni.showToast({ title: res.message || '验证码已发送，请检查新邮箱', icon: 'none' });
					this.startEmailCodeCountdown();
				} else {
					uni.showToast({ title: res.message || '验证码发送失败，请稍后重试', icon: 'none' });
				}
			} catch (error) {
				console.error('发送修改邮箱验证码失败:', error);
				uni.showToast({ title: '验证码发送失败，请稍后重试', icon: 'none' });
			} finally {
				this.sendingEmailCode = false;
			}
		},

		startEmailCodeCountdown() {
			this.emailCodeCountdown = 60;
			if (this.emailCodeTimer) {
				clearInterval(this.emailCodeTimer);
			}
			this.emailCodeTimer = setInterval(() => {
				if (this.emailCodeCountdown > 0) {
					this.emailCodeCountdown -= 1;
				} else {
					clearInterval(this.emailCodeTimer);
					this.emailCodeTimer = null;
				}
			}, 1000);
		},

		async submitChangeEmail() {
			if (this.emailSubmitting) {
				return;
			}
			const newEmail = (this.emailForm.newEmail || '').trim();
			const code = (this.emailForm.code || '').trim();
			const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!newEmail) {
				uni.showToast({ title: '请输入新邮箱地址', icon: 'none' });
				return;
			}
			if (!emailReg.test(newEmail)) {
				uni.showToast({ title: '邮箱格式不正确', icon: 'none' });
				return;
			}
			if (!code) {
				uni.showToast({ title: '请输入验证码', icon: 'none' });
				return;
			}
			if (newEmail === this.userInfo.email) {
				uni.showToast({ title: '新邮箱不能与当前邮箱相同', icon: 'none' });
				return;
			}
			this.emailSubmitting = true;
			uni.showLoading({ title: '提交中...' });
			try {
				const storedUserInfo = uni.getStorageSync(config.userInfoKey) || {};
				const userId = storedUserInfo.id || this.userInfo.userId;
				const payload = {
					userId,
					oldEmail: this.userInfo.email || null,
					newEmail,
					verificationCode: code
				};
				const res = await changeEmail(payload);
				if (res && (res.code === 200 || res.code === 0)) {
					const updatedEmail = (res.data && res.data.email) || newEmail;
					this.userInfo.email = updatedEmail;
					const currentLocal = uni.getStorageSync(config.userInfoKey) || {};
					uni.setStorageSync(config.userInfoKey, {
						...currentLocal,
						email: updatedEmail
					});
					uni.showToast({ title: res.msg || res.message || '邮箱修改成功，请重新登录', icon: 'none' });
					this.closeEmailPopup();
				} else if (res) {
					const msg = res.msg || res.message || '';
					if (msg && (msg.indexOf('邮箱已被使用') !== -1 || msg.indexOf('邮箱已被注册') !== -1)) {
						uni.showToast({ title: '该邮箱已被使用，请更换其他邮箱', icon: 'none' });
					} else if (msg) {
						uni.showToast({ title: msg, icon: 'none' });
					} else {
						uni.showToast({ title: '邮箱修改失败', icon: 'none' });
					}
				} else {
					uni.showToast({ title: '邮箱修改失败', icon: 'none' });
				}
			} catch (error) {
				console.error('修改邮箱失败:', error);
				const errMsg = (error && (error.msg || error.message)) || '';
				if (errMsg && (errMsg.indexOf('邮箱已被使用') !== -1 || errMsg.indexOf('邮箱已被注册') !== -1)) {
					uni.showToast({ title: '该邮箱已被使用，请更换其他邮箱', icon: 'none' });
				} else if (errMsg) {
					uni.showToast({ title: errMsg, icon: 'none' });
				} else {
					uni.showToast({ title: '邮箱修改失败，请稍后重试', icon: 'none' });
				}
			} finally {
				this.emailSubmitting = false;
				uni.hideLoading();
			}
		},

		async saveContact() {
			if (this.isViewingOther) {
				uni.showToast({ title: '暂不支持在此修改他人信息', icon: 'none' });
				return;
			}
			if (!requireLogin('保存联系方式')) {
				return;
			}
			uni.showLoading({ title: '保存中...' });
			try {
				// 即使列表为空，也发送给后端，表示清空所有关联链接
				const linksToSave = Array.isArray(this.profileLinks) ? this.profileLinks : [];
				const result = await updateMyProfileLinks(linksToSave);
				if (result.code === 200 || result.code === 0) {
					uni.showToast({ title: '保存成功', icon: 'success' });
					// 同步更新本地缓存，避免下次进入页面仍然看到旧的关联链接
					uni.setStorageSync(config.profileLinksCacheKey, linksToSave);
				} else {
					uni.showToast({ title: result.message || '保存失败', icon: 'none' });
				}
			} catch (error) {
				console.error('保存关联链接失败:', error);
				uni.showToast({ title: '保存失败', icon: 'none' });
			} finally {
				uni.hideLoading();
			}
		},

		removeProfileLink(index) {
			if (this.isViewingOther) {
				return;
			}
			if (!Array.isArray(this.profileLinks) || index < 0 || index >= this.profileLinks.length) {
				return;
			}
			if (!requireLogin('移除关联链接')) {
				return;
			}
			const target = this.profileLinks[index];
			const label = target && (target.label || target.url || '该链接');
			uni.showModal({
				title: '确认移除链接',
				content: `确定要移除「${label}」吗？`,
				confirmText: '移除',
				cancelText: '取消',
				success: async (res) => {
					if (!res || !res.confirm) {
						return;
					}
					const prevLinks = this.profileLinks.slice();
					const nextLinks = prevLinks.filter((_, i) => i !== index);
					this.profileLinks = nextLinks;
					uni.showLoading({ title: '保存中...' });
					try {
						const result = await updateMyProfileLinks(nextLinks);
						if (result && (result.code === 200 || result.code === 0)) {
							uni.setStorageSync(config.profileLinksCacheKey, nextLinks);
							uni.showToast({ title: '已移除', icon: 'success' });
							return;
						}
						this.profileLinks = prevLinks;
						uni.showToast({ title: (result && (result.message || result.msg)) || '移除失败', icon: 'none' });
					} catch (error) {
						this.profileLinks = prevLinks;
						console.error('移除关联链接失败:', error);
						uni.showToast({ title: '移除失败', icon: 'none' });
					} finally {
						uni.hideLoading();
					}
				}
			});
		},

		linkContact() {
			if (this.isViewingOther) {
				uni.showToast({ title: '暂不支持在此修改他人信息', icon: 'none' });
				return;
			}
			if (!requireLogin('链接联系方式')) {
				return;
			}
			this.linkForm = {
				url: '',
				label: ''
			};
			if (this.$refs.linkPopup && this.$refs.linkPopup.open) {
				this.$refs.linkPopup.open();
			}
		},

		closeLinkPopup() {
			if (this.$refs.linkPopup && this.$refs.linkPopup.close) {
				this.$refs.linkPopup.close();
			}
		},

		async submitLink() {
			if (this.isViewingOther) {
				return;
			}
			if (!requireLogin('链接联系方式')) {
				return;
			}
			if (this.linkSubmitting) {
				return;
			}
			const url = (this.linkForm.url || '').trim();
			const label = (this.linkForm.label || '').trim();
			if (!url) {
				uni.showToast({ title: '请先输入链接地址', icon: 'none' });
				return;
			}
			const currentLinks = Array.isArray(this.profileLinks) ? this.profileLinks : [];
			const newLinks = [...currentLinks, { label, url }];
			this.linkSubmitting = true;
			uni.showLoading({ title: '保存中...' });
			try {
				const result = await updateMyProfileLinks(newLinks);
				if (result.code === 200 || result.code === 0) {
					this.profileLinks = newLinks;
					uni.setStorageSync(config.profileLinksCacheKey, newLinks);
					uni.showToast({ title: '添加成功', icon: 'success' });
					this.closeLinkPopup();
				} else {
					uni.showToast({ title: result.message || '添加失败', icon: 'none' });
				}
			} catch (error) {
				console.error('添加关联链接失败:', error);
				uni.showToast({ title: '添加失败', icon: 'none' });
			} finally {
				this.linkSubmitting = false;
				uni.hideLoading();
			}
		},

		editOrganization() {
			if (this.isViewingOther) {
				uni.showToast({ title: '暂不支持在此修改他人信息', icon: 'none' });
				return;
			}
			if (!requireLogin('编辑所属机构')) {
				return;
			}
			this.orgForm.organization = this.userInfo.organization || '';
			if (this.$refs.orgPopup && this.$refs.orgPopup.open) {
				this.$refs.orgPopup.open();
			}
		},

		closeOrgPopup() {
			if (this.$refs.orgPopup && this.$refs.orgPopup.close) {
				this.$refs.orgPopup.close();
			}
		},

		async submitOrganization() {
			if (this.isViewingOther) {
				return;
			}
			if (!requireLogin('编辑所属机构')) {
				return;
			}
			if (this.orgSubmitting) {
				return;
			}
			const organization = (this.orgForm.organization || '').trim();
			if (!organization) {
				uni.showToast({ title: '请输入所属机构', icon: 'none' });
				return;
			}
			this.orgSubmitting = true;
			uni.showLoading({ title: '保存中...' });
			try {
				// 后端使用 institution 字段表示所属机构
				const result = await updateMyProfile({ institution: organization });
				if (result.code === 200 || result.code === 0) {
					this.userInfo.organization = organization;
					uni.showToast({ title: '保存成功', icon: 'success' });
					this.closeOrgPopup();
				} else {
					uni.showToast({ title: result.message || '保存失败', icon: 'none' });
				}
			} catch (error) {
				console.error('更新机构失败:', error);
				uni.showToast({ title: '保存失败', icon: 'none' });
			} finally {
				this.orgSubmitting = false;
				uni.hideLoading();
			}
		},

		manageTags() {
			if (this.isViewingOther) {
				uni.showToast({ title: '暂不支持在此修改他人信息', icon: 'none' });
				return;
			}
			if (!requireLogin('管理标签')) {
				return;
			}
			this.initPresetTags();
			this.tagSearchKeyword = '';
			// 使用一个临时列表在弹窗中编辑，避免每次点击都请求后端
			this.editingTags = Array.isArray(this.userTags) ? this.userTags.slice() : [];
			this.searchTags();
			if (this.$refs.tagPopup && this.$refs.tagPopup.open) {
				this.$refs.tagPopup.open();
			}
		},

		async confirmTagSelection() {
			// 点击“完成”时统一保存一次
			this.userTags = Array.isArray(this.editingTags)
				? this.editingTags.filter(t => !!t)
				: [];
			await this.saveResearchTags();
			this.closeTagPopup();
		},

		closeTagPopup() {
			if (this.$refs.tagPopup && this.$refs.tagPopup.close) {
				this.$refs.tagPopup.close();
			}
		},

		searchTags() {
			const keyword = (this.tagSearchKeyword || '').trim().toLowerCase();
			if (!keyword) {
				this.filteredPresetTags = this.presetTags.slice();
				return;
			}
			this.filteredPresetTags = this.presetTags.filter(tag =>
				(tag.name || '').toLowerCase().includes(keyword)
			);
		},

		isTagSelected(tag) {
			if (!tag || !tag.name) return false;
			return this.editingTags.includes(tag.name);
		},

		async toggleTagSelection(tag) {
			if (!tag || !tag.name) {
				return;
			}
			const name = tag.name;
			const index = this.editingTags.indexOf(name);
			if (index > -1) {
				this.editingTags.splice(index, 1);
			} else {
				if (this.editingTags.length >= 5) {
					uni.showToast({ title: '最多只能添加 5 个标签', icon: 'none' });
					return;
				}
				this.editingTags.push(name);
			}
		},

		async removeTag(index) {
			if (index < 0 || index >= this.editingTags.length) {
				return;
			}
			this.editingTags.splice(index, 1);
		},

		async addCustomTag() {
			const keyword = (this.tagSearchKeyword || '').trim();
			if (!keyword) {
				return;
			}
			if (this.editingTags.length >= 5) {
				uni.showToast({ title: '最多只能添加 5 个标签', icon: 'none' });
				return;
			}
			if (this.editingTags.includes(keyword)) {
				uni.showToast({ title: '该标签已存在', icon: 'none' });
				return;
			}
			this.editingTags.push(keyword);
			this.tagSearchKeyword = '';
			this.searchTags();
		},

		async saveResearchTags() {
			if (this.isViewingOther) {
				return;
			}
			if (!requireLogin('管理标签')) {
				return;
			}
			uni.showLoading({ title: '保存中...' });
			try {
				const tags = Array.isArray(this.userTags)
					? this.userTags.filter(t => !!t)
					: [];
				const result = await updateResearchTags(tags);
				if (result.code === 200 || result.code === 0) {
					this.userTags = tags;
					// 同步更新userInfo.tags以在界面显示
					this.$set(this.userInfo, 'tags', tags);
					uni.setStorageSync(config.researchTagsCacheKey, tags);
					uni.showToast({ title: '保存成功', icon: 'success' });
				} else {
					uni.showToast({ title: result.message || '保存失败', icon: 'none' });
				}
			} catch (error) {
				console.error('更新标签失败:', error);
				uni.showToast({ title: '保存失败', icon: 'none' });
			} finally {
				uni.hideLoading();
			}
		},

		initPresetTags() {
			if (Array.isArray(this.presetTags) && this.presetTags.length > 0) {
				this.filteredPresetTags = this.presetTags.slice();
				return;
			}
			this.presetTags = [
				{ id: 1, name: '人工智能' },
				{ id: 2, name: '机器学习' },
				{ id: 3, name: '深度学习' },
				{ id: 4, name: '大数据' },
				{ id: 5, name: '计算机视觉' },
				{ id: 6, name: '自然语言处理' },
				{ id: 7, name: '数据挖掘' },
				{ id: 8, name: '云计算' },
				{ id: 9, name: '边缘计算' },
				{ id: 10, name: 'DevOps' }
			];
			this.filteredPresetTags = this.presetTags.slice();
		},

		addAchievement() {
			if (this.isViewingOther) {
				uni.showToast({ title: '暂不支持在此修改他人信息', icon: 'none' });
				return;
			}
			if (!requireLogin('关联学术成果')) {
				return;
			}
			uni.showToast({ title: '关联成果功能开发中', icon: 'none' });
		},
		
		handleLogout() {
			uni.showModal({
				title: '确认退出',
				content: '确定要退出登录吗？',
				confirmText: '退出',
				confirmColor: '#667eea',
				success: (res) => {
					if (res.confirm) {
						// 清除登录信息
						clearAuth();
						
						// 重置页面状态
						this.isGuest = true;
						this.roleName = '游客';
						this.userInfo = {
							username: '',
							userId: '',
							avatar: '',
							avatarData: '',
							bio: '',
							email: '',
							organization: '',
							realName: '',
							phone: ''
						};
						
						uni.showToast({ 
							title: '已退出登录', 
							icon: 'success',
							duration: 1500
						});
						
						// 可选：跳转到登录页面
						 setTimeout(() => {
					     uni.reLaunch({ url: '/pages/auth/login' });
						 }, 1500);
					}
				}
			});
		},
		
		deleteAccount() {
			if (this.isViewingOther) {
				uni.showToast({ title: '暂不支持在此注销他人账号', icon: 'none' });
				return;
			}
			// 需要登录
			if (!requireLogin('注销账号')) {
				return;
			}
			// 优先从本地缓存获取当前用户ID，作为后端路径参数
			const storedUserInfo = uni.getStorageSync(config.userInfoKey) || null;
			const userId = storedUserInfo?.id || this.userInfo.userId;
			if (!userId) {
				uni.showToast({ title: '当前账号信息异常，无法注销', icon: 'none' });
				return;
			}
			uni.showModal({
				title: '确认注销',
				content: '注销账号后，您的所有数据将被永久删除且无法恢复。此操作不可撤销！',
				confirmText: '确认注销',
				confirmColor: '#FF4444',
				success: async (res) => {
					if (res.confirm) {
						uni.showLoading({ title: '处理中...' });
						try {
							const result = await deleteUser(userId);
							if (result.code === 200 || result.code === 0) {
								uni.showToast({ 
									title: '账号已注销', 
									icon: 'success',
									success: () => {
										setTimeout(() => {
											// 清理登录状态并返回登录页
											clearAuth();
											uni.reLaunch({ url: '/pages/auth/login' });
										}, 1500);
									},
								});
							} else {
								uni.showToast({ title: result.message || '注销失败', icon: 'none' });
							}
						} catch (error) {
							console.error('注销账号失败:', error);
							const msg = (error && (error.msg || error.message)) || '注销失败';
							uni.showToast({ title: msg, icon: 'none' });
						} finally {
							uni.hideLoading();
						}
					}
				}
			});
		}
	}
}
</script>

<style lang="scss" scoped>
@import '@/static/styles/user.scss';
</style>
