/**
 * 任务逾期提醒服务
 * 负责检查即将到期的任务并发送unipush提醒
 * 但是没办法，我把其中的一些查询的方法写进去了，我怕跟别人创上了
 * @author ErgouTree
 */
import uniId from './uniId.js'
import { getProjectTasks } from '@/api/task.js'
import { getTaskSubmissions } from '@/api/taskSubmission.js'
import { getUserById } from '@/api/user.js'
import { batchSendMessage } from '@/api/unipush.js'
import { getMyProjects } from '@/api/project.js'

/**
 * 计算日期差异（天数）
 * 
 * @param {Date|string} date1 
 * @param {Date|string} date2 
 * @returns {number} 天数差异
 */
function dateDiffInDays(date1, date2) {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    const diffTime = d2.getTime() - d1.getTime()
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
	return diffDays
}


/**
 * 获取任务负责人ID列表
 * 从任务详情DTO中获取执行者信息（assignees字段）
 * 
 * @param {Object} task - 任务对象（TaskDetailDTO）
 * @returns {Array<string>} 负责人ID列表
 */
function getTaskAssignees(task) {
    // 从 TaskDetailDTO 的 assignees 字段获取执行者ID
    if (task.assignees && Array.isArray(task.assignees)) {
        return task.assignees
            .map(assignee => {
                // assignee 可能是对象 {userId, userName, email, avatarUrl} 或直接是ID
                if (typeof assignee === 'object' && assignee !== null) {
                    return assignee.userId ? String(assignee.userId) : null
                }
                return assignee ? String(assignee) : null
            })
            .filter(id => id !== null)
    }
    
    // 兼容旧格式：如果有 assigneeId 字段（向后兼容）
    if (task.assigneeId) {
        try {
            if (typeof task.assigneeId === 'string') {
                return JSON.parse(task.assigneeId)
            }
            if (Array.isArray(task.assigneeId)) {
                return task.assigneeId.map(id => String(id))
            }
            return [String(task.assigneeId)]
        } catch (e) {
            console.error('解析任务负责人ID失败:', e)
            return []
        }
    }
    
    return []
}

/**
 * 根据用户ID批量获取用户邮箱
 * 
 * @param {Array<string>} userIds - 用户ID列表
 * @returns {Promise<Object>} userId -> email 的映射
 */
async function getUserEmailsMap(userIds) {
    const emailMap = {}

    // 那还说啥了开始往里装
    const promises = userIds.map(userId => getUserById(userId))
    const results = await Promise.allSettled(promises)

    results.forEach((result, index) => {
		if (result.status === 'fulfilled' && result.value && result.value.data) {
			const user = result.value.data
			const userId = userIds[index]
			emailMap[userId] = user.email
		}
	})
	
	return emailMap
}

/**
 * 根据邮箱批量获取CID
 * @param {Array<string>} emails - 邮箱列表
 * @returns {Promise<Object>} email -> cid 的映射
 */
async function getCidsByEmails(emails) {
    const cidMap = {}

    const promises = emails.map(email => uniId.getCidByEmail(email))
    const results = await Promise.allSettled(promises)

    results.forEach((result, index) => {
		if (result.status === 'fulfilled' && result.value && result.value.code === 0) {
			const email = emails[index]
			const cidData = result.value.data
			if (cidData && cidData.cid) {
				cidMap[email] = cidData.cid
			}
		}
	})
	
	return cidMap
}

/**
 * 检查任务是否有提交记录
 * 
 * @param {string|number} taskId - 任务ID
 * @returns {Promise<boolean>} 是否有提交
 */
async function hasTaskSubmission(taskId) {
    try {
		const response = await getTaskSubmissions(taskId)
		if (response && response.code === 200 && response.data) {
			// 检查是否有提交记录（数组不为空）
			const submissions = Array.isArray(response.data) ? response.data : (response.data.content || [])
			return submissions.length > 0
		}
		return false
	} catch (error) {
		console.error('获取任务提交记录失败:', error)
		return false
	}
}

/**
 * 检查单个项目的任务并发送提醒
 * @param {string} projectId - 项目ID
 * @returns {Promise<Object>} 处理结果统计
 */
async function checkProjectTasks(projectId) {
    // 我上来就定义
    const stats = {
        total: 0,
        needRemind: 0,
        reminded: 0,
        failed: 0
    }

    try{
        // 1. 首先，获取项目的所有任务
		const response = await getProjectTasks(projectId, 0, 1000)
        if (!response || response.code !== 200) {
            console.error('获取项目任务失败:', projectId)
			return stats
        }

        const tasks = response.data?.content || response.data || []
		stats.total = tasks.length

        const today = new Date()
        today.setHours(0, 0, 0, 0) // 标准化为当天开始时间

        // 2. 筛选需要提醒的任务，也就是距离截止日期还剩1天或者以内的任务
		for (const task of tasks) {
            try{
                // 检查截止日期
                if (!task.dueDate) {
					continue
				}
				
                const dueDate = new Date(task.dueDate)
                dueDate.setHours(0, 0, 0, 0) // 标准化为截止日期开始时间
                const daysUntilDue = dateDiffInDays(today, dueDate)

                // 检查任务状态，已完成的任务不需要提醒
				if (task.status === 'DONE') {
					continue
				}

                // 只处理1天内到期的任务
                if (daysUntilDue !== 1) {
					continue
				}

                // 3. 这时候再检查是否有提交记录
				const hasSubmission = await hasTaskSubmission(task.id)
				if (hasSubmission) {
					console.log('任务已有提交记录，跳过提醒:', task.id)
					continue
				}

                stats.needRemind++

                // 4. 获取需要通知的用户ID列表,创建者 + 负责人
				const userIds = new Set()
				userIds.add(String(task.creatorId))  // 创建者

                // 添加负责人
				const assignees = getTaskAssignees(task)
                assignees.forEach(id => userIds.add(String(id)))
                const userIdArray = Array.from(userIds)
				if (userIdArray.length === 0) {
					console.warn('任务没有负责人处理，负责人发送:', task.id)
					continue
				}

                // 5. 获取需要被提醒的用户的邮箱
				const emailMap = await getUserEmailsMap(userIdArray)
				const emails = Object.values(emailMap).filter(email => email)
                if (emails.length === 0) {
                    console.warn('无法获取任务中任何一个用户的邮箱，跳过发送该任务的预期通知:', task.id)
					stats.failed++
					continue
                }

                // 6. 根据邮箱获取CID
                const cidMap = await getCidsByEmails(emails)
                const cids = Object.values(cidMap).filter(cid => cid)
                if(cids.length === 0) {
                    console.warn('无法获取任务中任何一个用户的CID，跳过发送该任务的预期通知:', task.id)
                    stats.failed++
                    continue
                }

                // 7. 发送推送通知
				const title = '任务即将到期提醒'
				const content = `您的任务《${task.title}》将于明天到期，请及时完成并提交。`
				const payload = {
					type: 'TASK_DEADLINE_REMIND',
					taskId: task.id,
					projectId: projectId,
					dueDate: task.dueDate
				}
                const pushResult = await batchSendMessage(cids, title, content, payload)

                if (pushResult && (pushResult.code === 200 || pushResult.code === 0)) {
					stats.reminded++
					console.log('任务提醒发送成功:', task.id, '通知人数:', cids.length)
				} else {
					stats.failed++
					console.error('任务提醒发送失败:', task.id, pushResult)
				}
            }catch (error) {
				console.error('处理任务时出错:', task.id, error)
				stats.failed++
			}
        }
    }catch (ergoutree) {
        console.error('检查项目任务失败:', ergoutree)
        return stats
    }
}


/**
 * 获取用户参与的项目ID列表
 * @returns {Promise<Array<string>>} 项目ID列表
 */
export async function getUserProjectIds() {
	try {
		// 获取用户的所有项目（分页获取，这里获取前100个）
		const response = await getMyProjects(0, 100)
		if (response && response.code === 200 && response.data) {
			const projects = response.data.content || response.data || []
			return projects.map(project => String(project.id)).filter(id => id)
		}
		return []
	} catch (error) {
		console.error('获取用户项目列表失败:', error)
		return []
	}
}

/**
 * 检查所有项目的任务
 * 这个才是该提醒业务的主入口
 * 如果未传入项目ID列表，则自动获取用户参与的项目
 * 
 * @param {Array<string>} projectIds - 项目ID列表（可选，不传则自动获取）
 * @returns {Promise<Object>} 总体统计发送结果
 */
export async function checkAllProjectTasks(projectIds = null) {
	// 如果没有传入项目ID列表，则自动获取
	if (!projectIds || projectIds.length === 0) {
		projectIds = await getUserProjectIds()
		if (projectIds.length === 0) {
			console.log('用户没有参与任何项目，跳过任务提醒检查')
			return {
				projects: 0,
				total: 0,
				needRemind: 0,
				reminded: 0,
				failed: 0,
				startTime: new Date().toISOString(),
				endTime: new Date().toISOString()
			}
		}
	}
	const totalStats = {
		projects: projectIds.length,
		total: 0,
		needRemind: 0,
		reminded: 0,
		failed: 0,
		startTime: new Date().toISOString()
	}
	
	console.log('开始检查任务逾期提醒，项目数量:', projectIds.length)
	
	// 逐个检查项目
	for (const projectId of projectIds) {
		const stats = await checkProjectTasks(projectId)
		totalStats.total += stats.total
		totalStats.needRemind += stats.needRemind
		totalStats.reminded += stats.reminded
		totalStats.failed += stats.failed
	}
	
	totalStats.endTime = new Date().toISOString()
	
	console.log('任务逾期提醒检查完成:', totalStats)
	
	return totalStats
}

/**
 * 测试
 * 手动触发单个任务的提醒
 * 
 * @param {Object} task - 任务对象
 * @param {string} projectId - 项目ID
 * @returns {Promise<Object>} 发送结果
 */
export async function manualRemindTask(task, projectId) {
	try {
		// 获取需要通知的用户ID
		const userIds = new Set()
		userIds.add(String(task.creatorId))
		
		const assignees = getTaskAssignees(task)
		assignees.forEach(id => userIds.add(String(id)))
		
		const userIdArray = Array.from(userIds)
		
		// 获取邮箱
		const emailMap = await getUserEmailsMap(userIdArray)
		const emails = Object.values(emailMap).filter(email => email)
		
		// 获取CID
		const cidMap = await getCidsByEmails(emails)
		const clientIds = Object.values(cidMap).filter(cid => cid)
		
		if (clientIds.length === 0) {
			return {
				success: false,
				message: '无法获取用户CID'
			}
		}
		
		// 发送通知
		const title = '任务到期提醒（测试）'
		const content = `任务《${task.title}》的到期提醒测试。`
		const payload = {
			type: 'TASK_DEADLINE_REMIND_TEST',
			taskId: task.id,
			projectId: projectId
		}
		
		const result = await batchSendMessage(clientIds, title, content, payload)
		
		return {
			success: result && (result.code === 200 || result.code === 0),
			clientIds: clientIds,
			result: result
		}
		
	} catch (error) {
		console.error('手动提醒失败:', error)
		return {
			success: false,
			message: error.message
		}
	}
}

export default {
	checkAllProjectTasks,
	checkProjectTasks,
	manualRemindTask,
	getUserProjectIds
}