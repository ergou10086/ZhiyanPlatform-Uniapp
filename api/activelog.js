import { get } from '@/utils/request.js'

const ACTIVELOG_PREFIX = '/zhiyan/activelog'

/**
 * 获取我的所有操作日志
 * @param {number} page 页码，从0开始
 * @param {number} size 每页大小
 * @returns {Promise}
 */
export function getMyAllLogs(page = 0, size = 20) {
	return get(`${ACTIVELOG_PREFIX}/myself/all`, {
		page,
		size
	})
}

