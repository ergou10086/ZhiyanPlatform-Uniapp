import { get, put, del } from '@/utils/request.js'

const MESSAGE_PREFIX = '/zhiyan/message'

/**
 * 获取未读消息数量
 */
export function getUnreadCount() {
	return get(`${MESSAGE_PREFIX}/unread/count`)
}

/**
 * 获取用户收件箱消息列表（分页）
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码（从0开始）
 * @param {number} params.size - 每页数量
 */
export function getInboxMessages(params = {}) {
	return get(`${MESSAGE_PREFIX}/list`, params)
}

/**
 * 获取未读消息列表（分页）
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码（从0开始）
 * @param {number} params.size - 每页数量
 */
export function getUnreadMessages(params = {}) {
	return get(`${MESSAGE_PREFIX}/unread`, params)
}

/**
 * 标记消息为已读
 * @param {number} recipientId - 消息收件记录ID
 */
export function markAsRead(recipientId) {
	return put(`${MESSAGE_PREFIX}/read/${recipientId}`)
}

/**
 * 标记所有消息为已读
 */
export function markAllAsRead() {
	return put(`${MESSAGE_PREFIX}/read/all`)
}

/**
 * 删除消息
 * @param {number} recipientId - 消息收件记录ID
 */
export function deleteMessage(recipientId) {
	return del(`${MESSAGE_PREFIX}/${recipientId}`)
}

/**
 * 获取消息详情
 * @param {number} messageId - 消息ID
 */
export function getMessageDetail(messageId) {
	return get(`${MESSAGE_PREFIX}/${messageId}`)
}

