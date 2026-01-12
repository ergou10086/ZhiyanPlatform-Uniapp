import { get, post, put, patch, del } from '@/utils/request.js'

const TASK_PREFIX = '/zhiyan/projects/tasks'

/**
 * 获取我的所有任务（包括分配和接取的）
 * @param {number} page - 页码（从0开始）
 * @param {number} size - 每页数量
 */
export function getMyAssignedTasks(page = 0, size = 20) {
	return get(`${TASK_PREFIX}/my-assigned`, { page, size })
}

/**
 * 获取我创建的任务
 * @param {number} page - 页码（从0开始）
 * @param {number} size - 每页数量
 */
export function getMyCreatedTasks(page = 0, size = 20) {
	return get(`${TASK_PREFIX}/my-created`, { page, size })
}

/**
 * 获取我未提交的任务（分页）
 * @param {number} page - 页码
 * @param {number} size - 每页大小
 */
// getMyUnsubmittedTasks removed — IN_PROGRESS removed from frontend filters

export function getProjectTasks(projectId, page = 0, size = 20) {
	return get(`/zhiyan/projects/tasks/projects/${projectId}`, { page, size })
}

/**
 * 获取任务详情
 * @param {number} taskId - 任务ID
 */
function getTaskDetailById(taskId) {
	return get(`${TASK_PREFIX}/${taskId}`)
}

/**
 * 更新任务状态
 * @param {number} taskId - 任务ID
 * @param {string} status - 任务状态
 */
export function updateTaskStatus(taskId, status) {
	// 使用 GET 方式通过 query 参数传递 status
	return patch(`${TASK_PREFIX}/${taskId}/status?status=${status}`)
}

/**
 * 注意：后端没有直接的获取单个任务详情接口
 * 需要通过项目任务列表接口获取，然后从列表中查找对应的任务
 * @param {string|number} taskId 任务ID
 * @param {string|number} projectId 项目ID（必需）
 */
export function getTaskDetail(taskId, projectId) {
	if (!projectId) {
		return getTaskDetailById(taskId)
	}

	// 由于后端没有单个任务详情接口，我们从项目任务列表中查找
	// 使用较大的size值以确保能找到任务
	return get(`/zhiyan/projects/tasks/projects/${projectId}`, { page: 0, size: 1000 }).then(res => {
    if (res && (res.code === 200 || res.code === 0)) {
      let list = []

      if (res.content && Array.isArray(res.content)) {
        list = res.content
      } else if (res.data && res.data.content && Array.isArray(res.data.content)) {
        list = res.data.content
      } else if (Array.isArray(res.data)) {
        list = res.data
      } else if (Array.isArray(res)) {
        list = res
      }

      // 从列表中查找对应的任务
      const taskIdStr = String(taskId)
      const task = list.find(t => {
        const id = String(t.id || '')
        return id === taskIdStr
      })

      if (task) {
        return {
          code: 200,
          msg: '获取成功',
          ...task
        }
      } else {
        return {
          code: 404,
          msg: '任务不存在'
        }
      }
    }
    return res
  }).catch(error => {
    console.error('[getTaskDetail] 获取任务详情失败:', error)
    return Promise.reject(error)
  })
}

/**
 * 分配任务给项目成员
 * @param {string|number} taskId 任务ID
 * @param {Array<number>} assigneeIds 执行者ID列表
 */
export function assignTask(taskId, assigneeIds) {
	return put(`/zhiyan/projects/tasks/${taskId}/assign`, assigneeIds)
}

/**
 * 接取任务
 * @param {string|number} taskId 任务ID
 */
function claimTaskAbsolute(taskId) {
	return post(`/zhiyan/projects/tasks/${taskId}/claim`)
}

/**
 * 接取任务
 * @param {string|number} taskId 任务ID
 */
export function claimTask(taskId) {
	return claimTaskAbsolute(taskId)
}

/**
 * 更新任务状态
 * @param {string|number} taskId 任务ID
 * @param {string} status 任务状态 (TODO/IN_PROGRESS/BLOCKED/PENDING_REVIEW/DONE)
 */
function updateTaskStatusAbsolute(taskId, status) {
	return patch(`/zhiyan/projects/tasks/${taskId}/status?status=${status}`)
}

/**
 * 创建任务
 * @param {Object} taskData 任务数据
 * @param {string|number} taskData.projectId 项目ID（必需）
 * @param {string} taskData.title 任务标题（必需）
 * @param {string} taskData.description 任务描述
 * @param {Array<number>} taskData.assigneeIds 执行者ID列表
 * @param {string} taskData.priority 优先级 (HIGH/MEDIUM/LOW)
 * @param {string} taskData.dueDate 截止日期 (YYYY-MM-DD)
 * @param {number} taskData.requiredPeople 需要的人数
 * @param {boolean} taskData.isMilestone 是否为里程碑任务
 */
export function createTask(taskData) {
  return post('/zhiyan/projects/tasks', taskData)
}

/**
 * 更新任务
 * @param {string|number} taskId 任务ID
 * @param {Object} taskData 任务数据
 * @param {string} taskData.title 任务标题
 */
export function updateTask(taskId, taskData) {
  return put(`/zhiyan/projects/tasks/${taskId}`, taskData)
}

export function deleteTask(taskId) {
	return del(`${TASK_PREFIX}/${taskId}`)
}
