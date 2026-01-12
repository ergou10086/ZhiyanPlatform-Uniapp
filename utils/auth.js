/**
 * 权限管理工具
 */
import config from './config.js'

// 系统角色枚举
export const SysRole = {
	DEVELOPER: 'DEVELOPER',    // 开发者
	USER: 'USER',              // 普通用户
	GUEST: 'GUEST'             // 访客用户（未登录）
}

// 角色显示名称
export const RoleNames = {
	[SysRole.DEVELOPER]: '开发者',
	[SysRole.USER]: '普通用户',
	[SysRole.GUEST]: '游客'
}

/**
 * 获取当前用户角色
 */
export function getCurrentRole() {
	const token = uni.getStorageSync(config.tokenKey);
	if (!token) {
		return SysRole.GUEST;
	}
	
	const userInfo = uni.getStorageSync(config.userInfoKey);
	if (!userInfo || !userInfo.role) {
		return SysRole.GUEST;
	}
	
	return userInfo.role || SysRole.USER;
}

/**
 * 获取当前用户角色显示名称
 */
export function getCurrentRoleName() {
	const role = getCurrentRole();
	return RoleNames[role] || '游客';
}

/**
 * 检查是否已登录
 */
export function isLoggedIn() {
	const token = uni.getStorageSync(config.tokenKey);
	return !!token;
}

/**
 * 检查是否是游客
 */
export function isGuest() {
	return getCurrentRole() === SysRole.GUEST;
}

/**
 * 检查是否是普通用户或以上
 */
export function isUser() {
	const role = getCurrentRole();
	return role === SysRole.USER || role === SysRole.DEVELOPER;
}

/**
 * 检查是否是开发者
 */
export function isDeveloper() {
	return getCurrentRole() === SysRole.DEVELOPER;
}

/**
 * 权限检查 - 需要登录才能执行的操作
 * @param {String} actionName 操作名称（用于提示）
 * @param {Function} callback 登录后的回调函数
 * @returns {Boolean} 是否有权限
 */
export function requireLogin(actionName = '此操作', callback = null) {
	if (isGuest()) {
		uni.showModal({
			title: '需要登录',
			content: `${actionName}需要登录后才能使用，是否前往登录？`,
			confirmText: '去登录',
			cancelText: '取消',
			success: (res) => {
				if (res.confirm) {
					uni.navigateTo({
						url: '/pages/auth/login',
						success: () => {
							// 保存回调函数，登录成功后执行
							if (callback) {
								uni.setStorageSync('login_callback', callback.toString());
							}
						}
					});
				}
			}
		});
		return false;
	}
	return true;
}

/**
 * 权限检查 - 需要普通用户权限
 * @param {String} actionName 操作名称
 * @returns {Boolean} 是否有权限
 */
export function requireUser(actionName = '此操作') {
	if (!isUser()) {
		uni.showToast({
			title: `${actionName}需要普通用户权限`,
			icon: 'none'
		});
		return false;
	}
	return true;
}

/**
 * 权限检查 - 需要开发者权限
 * @param {String} actionName 操作名称
 * @returns {Boolean} 是否有权限
 */
export function requireDeveloper(actionName = '此操作') {
	if (!isDeveloper()) {
		uni.showToast({
			title: `${actionName}需要开发者权限`,
			icon: 'none'
		});
		return false;
	}
	return true;
}

/**
 * 游客提示 - 温和提示，不强制跳转
 * @param {String} message 提示信息
 */
export function guestTip(message = '登录后可使用更多功能') {
	if (isGuest()) {
		uni.showToast({
			title: message,
			icon: 'none',
			duration: 2000
		});
	}
}

/**
 * 保存登录返回的数据（Token、用户信息、RememberMe等）
 * @param {Object} loginData 登录响应扁平对象（request.js 已展开 data）
 * @param {Boolean} rememberMe 是否勾选记住我
 */
export function saveLoginData(loginData, rememberMe = false) {
	if (!loginData) return;

	const {
		accessToken,
		refreshToken,
		rememberMeToken,
		user,
		userInfo
	} = loginData;

	// 保存访问Token
	if (accessToken) {
		uni.setStorageSync(config.tokenKey, accessToken);
	}

	// 保存刷新Token
	if (refreshToken) {
		uni.setStorageSync(config.refreshTokenKey, refreshToken);
	}

	// 处理用户信息
	const rawUser = userInfo || user;
	if (rawUser) {
		const mappedUserInfo = {
			id: rawUser.id,
			email: rawUser.email,
			name: rawUser.name,
			avatarData: rawUser.avatarData,
			// 从 roles 数组中获取第一个角色，如果没有则默认为 USER
			role: (rawUser.roles && rawUser.roles.length > 0) ? rawUser.roles[0] : 'USER'
		};
		uni.setStorageSync(config.userInfoKey, mappedUserInfo);
	}

	// 记住我：仅在勾选时保存 rememberMeToken 和标记
	if (rememberMe) {
		if (rememberMeToken) {
			// 初次登录：保存后端返回的 rememberMeToken
			uni.setStorageSync(config.rememberMeTokenKey, rememberMeToken);
		}
		// 即使本次响应未返回 rememberMeToken（例如刷新Token），也保留已有的 RememberMe 状态
		uni.setStorageSync(config.autoLoginFlagKey, true);
	} else {
		// 未勾选则清理之前的记住我状态
		uni.removeStorageSync(config.rememberMeTokenKey);
		uni.removeStorageSync(config.autoLoginFlagKey);
	}
}

/**
 * 获取当前用户信息
 */
export function getCurrentUser() {
	const userInfo = uni.getStorageSync(config.userInfoKey);
	return userInfo || null;
}

/**
 * 获取刷新Token
 */
export function getRefreshToken() {
	return uni.getStorageSync(config.refreshTokenKey) || '';
}

/**
 * 获取RememberMe Token
 */
export function getRememberMeToken() {
	return uni.getStorageSync(config.rememberMeTokenKey) || '';
}

/**
 * 是否启用了自动登录（记住我）
 */
export function isAutoLoginEnabled() {
	return !!uni.getStorageSync(config.autoLoginFlagKey);
}

/**
 * 清除登录信息
 */
export function clearAuth() {
	uni.removeStorageSync(config.tokenKey);
	uni.removeStorageSync(config.userInfoKey);
	uni.removeStorageSync(config.refreshTokenKey);
	uni.removeStorageSync(config.rememberMeTokenKey);
	uni.removeStorageSync(config.autoLoginFlagKey);
	uni.removeStorageSync('login_callback');
}

/**
 * 执行登录后的回调
 */
export function executeLoginCallback() {
	const callbackStr = uni.getStorageSync('login_callback');
	if (callbackStr) {
		try {
			const callback = eval(`(${callbackStr})`);
			if (typeof callback === 'function') {
				callback();
			}
		} catch (e) {
			console.error('执行登录回调失败:', e);
		} finally {
			uni.removeStorageSync('login_callback');
		}
	}
}
