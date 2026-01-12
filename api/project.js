import { get } from '@/utils/request.js'

const PROJECT_PREFIX = '/zhiyan/projects'

export function getMyProjects(page = 0, size = 20) {
	return get(`${PROJECT_PREFIX}/my-projects`, {
		page,
		size,
		excludeArchived: true // 排除已归档的项目
	})
}

export function getProjectById(projectId) {
	return get(`${PROJECT_PREFIX}/${projectId}`)
}

// 分页获取项目成员列表（与 PC 端 /zhiyan/projects/{projectId}/members 保持一致）
export function getProjectMembers(projectId, page = 0, size = 20) {
	return get(`${PROJECT_PREFIX}/${projectId}/members`, {
		page,
		size
	})
}
