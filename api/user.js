/**
 * 用户相关API
 */
import { get, post, put, del, patch, upload } from '@/utils/request.js'
import config from '@/utils/config.js'

const API_PREFIX = config.apiPrefix

/**
 * 用户登录
 */
export function login(email, password, rememberMe = false) {
	return post(`${API_PREFIX}/login`, {
		email,
		password,
		rememberMe
	})
}

/**
 * 用户注册
 */
export function register(data) {
	return post(`${API_PREFIX}/register`, data)
}

/**
 * 修改用户邮箱（通过验证码）
 */
export function changeEmail(data) {
	return post(`${API_PREFIX}/change-email`, data)
}

/**
 * 发送邮箱验证码
 */
export function sendVerificationCode(email, type = 'REGISTER') {
	return post(`${API_PREFIX}/send-verfcode`, {
		email,
		type
	})
}

/**
 * 重置密码
 */
export function resetPassword(data) {
	return post(`${API_PREFIX}/reset-password`, data)
}

/**
 * 用户登出
 */
export function logout() {
	return post(`${API_PREFIX}/logout`)
}

/**
 * 自动登录检查（RememberMe）
 */
export function autoLoginCheck() {
	return get(`${API_PREFIX}/auto-login-check`)
}

/**
 * 使用刷新Token获取新的访问Token
 */
export function refreshToken(refreshToken) {
	return post(`${API_PREFIX}/refresh`, { refreshToken })
}

export function scanLoginQRCode(qrCodeId) {
	return post(`${API_PREFIX}/qrcode/scan/${encodeURIComponent(qrCodeId)}`)
}

export function confirmLoginQRCode(qrCodeId) {
	return post(`${API_PREFIX}/qrcode/confirm/${encodeURIComponent(qrCodeId)}`)
}

export function cancelLoginQRCode(qrCodeId) {
	return post(`${API_PREFIX}/qrcode/cancel/${encodeURIComponent(qrCodeId)}`)
}

/**
 * 获取当前用户信息
 */
export function getCurrentUser() {
	return get(`${API_PREFIX}/users/me`)
}

/**
 * 根据ID获取用户信息
 */
export function getUserById(userId) {
	return get(`${API_PREFIX}/users/${userId}`)
}

/**
 * 更新当前用户个人资料
 */
export function updateMyProfile(data) {
	return put(`${API_PREFIX}/users/me`, data)
}

/**
 * 更新用户个人资料
 */
export function updateProfile(data) {
	return put(`${API_PREFIX}/users/profile`, data)
}

/**
 * 更新个人简介
 */
export function updateMyBio(description) {
	return patch(`${API_PREFIX}/users/me/profile/description`, {
		description
	})
}

/**
 * 上传用户头像
 */
export function uploadAvatar(filePath) {
	return upload(`${API_PREFIX}/user-avatar/upload`, filePath)
}

/**
 * 获取当前用户头像信息
 */
export function getMyAvatar() {
	return get(`${API_PREFIX}/user-avatar/me_avatar`)
}

/**
 * 获取指定用户头像信息
 */
export function getAvatar(userId) {
	return get(`${API_PREFIX}/user-avatar/${userId}`)
}

/**
 * 更新研究方向标签
 */
export function updateResearchTags(tags) {
	return put(`${API_PREFIX}/profile/research-tags`, {
		researchTags: tags
	})
}

/**
 * 获取当前用户研究方向标签
 */
export function getMyResearchTags() {
	return get(`${API_PREFIX}/users/profile/research-tags`)
}

/**
 * 获取指定用户研究方向标签
 */
export function getUserResearchTags(userId) {
	return get(`${API_PREFIX}/users/${userId}/research-tags`)
}

/**
 * 获取当前用户的关联链接
 */
export function getMyProfileLinks() {
	return get(`${API_PREFIX}/profile/links`)
}

/**
 * 更新当前用户的关联链接
 */
export function updateMyProfileLinks(links) {
	return put(`${API_PREFIX}/profile/links`, {
		links
	})
}

/**
 * 获取指定用户的关联链接
 */
export function getUserProfileLinks(userId) {
	return get(`${API_PREFIX}/users/${userId}/links`)
}

/**
 * 删除用户（注销账号）
 */
export function deleteUser(userId) {
	return del(`${API_PREFIX}/users/${userId}`)
}

/**
 * 搜索用户
 */
export function searchUsers(keyword, page = 0, size = 10) {
	return get(`${API_PREFIX}/users/search`, {
		keyword,
		page,
		size
	})
}

/**
 * 获取用户列表
 */
export function getUserList(page = 0, size = 20, keyword = '') {
	return get(`${API_PREFIX}/users/user-list`, {
		page,
		size,
		keyword
	})
}
