/**
 * Unipush消息推送相关API
 * 发送到后端unipush的封装实现，请求均为POST请求
 */
import { post } from '@/utils/request.js'

const UNIPUSH_PREFIX = '/zhiyan/message/unipush'

/**
 * 构建URL查询参数
 * @param {Object} params - 参数对象
 * @returns {string} 查询字符串
 */
function buildQueryString(params) {
	if (!params || Object.keys(params).length === 0) {
		return ''
	}
	const query = Object.keys(params)
		.filter(key => params[key] !== null && params[key] !== undefined)
		.map(key => {
			const value = params[key]
			// 处理数组参数（后端 List<String> 需要多个同名参数）
			if (Array.isArray(value)) {
				return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&')
			}
			return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
		})
		.join('&')
	return query ? `?${query}` : ''
}


/**
 * 发送推送消息
 * 完整版，带payload载荷
 * 
 * @param {Object} request - 推送请求对象
 * @param {Array<string>} request.pushClientId - 客户端ID列表
 * @param {string} request.title - 推送标题
 * @param {string} request.content - 推送内容
 * @param {Object} request.payload - 自定义载荷数据（可选）
 */
export function sendPushMessage(request) {
	return post(`${UNIPUSH_PREFIX}/send`, request)
}

/**
 * 发送简单推送
 * 仅标题和内容，不带payload
 * 
 * @param {Array<string>} clientIds - 客户端ID列表
 * @param {string} title - 推送标题
 * @param {string} content - 推送内容
 */
export function sendSimplePushMessage(clientIds, title, content) {
	const queryString = buildQueryString({ clientIds, title, content })
	return post(`${UNIPUSH_PREFIX}/send/simple${queryString}`)
}

/**
 * 单用户推送
 * cid单推
 * 
 * @param {string} clientId - 客户端ID
 * @param {string} title - 推送标题
 * @param {string} content - 推送内容
 * @param {Object} payload - 自定义载荷数据（可选）
 */
export function sendToSingleUser(clientId, title, content, payload = null) {
	const queryString = buildQueryString({ clientId, title, content })
	return post(`${UNIPUSH_PREFIX}/send/single${queryString}`, payload)
}

/**
 * 批量推送
 * 自动分批处理
 * 
 * @param {Array<string>} clientIds - 客户端ID列表
 * @param {string} title - 推送标题
 * @param {string} content - 推送内容
 * @param {Object} payload - 自定义载荷数据（可选）
 */
export function batchSendMessage(clientIds, title, content, payload = null) {
	const queryString = buildQueryString({ clientIds, title, content })
	return post(`${UNIPUSH_PREFIX}/send/batch${queryString}`, payload)
}

/**
 * 测试推送
 * 用于测试消息推送功能是否正常
 * 
 * @param {string} clientId - 客户端ID
 */
export function testPush(clientId) {
	const queryString = buildQueryString({ clientId })
	return post(`${UNIPUSH_PREFIX}/test${queryString}`)
}
