import { getUserById } from '@/api/user.js'
import uniId from '@/utils/uniId.js'
import config from '@/utils/config.js'

function getPushResultArray(pushRes) {
  if (Array.isArray(pushRes)) return pushRes
  if (pushRes && Array.isArray(pushRes.data)) return pushRes.data
  if (pushRes && pushRes.data && Array.isArray(pushRes.data.data)) return pushRes.data.data
  return null
}

function buildQueryString(params) {
  if (!params) return ''
  const parts = []
  Object.keys(params).forEach((key) => {
    const value = params[key]
    if (value === null || value === undefined) return
    if (Array.isArray(value)) {
      value.forEach(v => parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`))
      return
    }
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  })
  return parts.length ? `?${parts.join('&')}` : ''
}

function silentPost(urlPath, queryParams, data) {
  const token = uni.getStorageSync(config.tokenKey)
  const url = config.baseURL + urlPath + buildQueryString(queryParams)
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: 'POST',
      data: data == null ? null : data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      timeout: config.timeout,
      success: (res) => {
        // 不做 toast；上层只关心不影响主流程
        if (res && res.statusCode === 200) {
          resolve(res.data)
          return
        }
        reject({
          statusCode: res && res.statusCode,
          data: res && res.data,
          msg: (res && res.data && (res.data.msg || res.data.message || res.data.error)) || '请求失败'
        })
      },
      fail: (err) => {
        reject(err)
      }
    })
  })
}

function getCurrentUserName() {
  try {
    const userInfo = uni.getStorageSync(config.userInfoKey)
    if (userInfo) {
      const user = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo
      const name = (user && (user.nickname || user.username || user.name || user.realName)) || ''
      if (name) return String(name)
    }
  } catch (e) {
    // ignore
  }
  try {
    const currentUser = uniId.getCurrentUser && uniId.getCurrentUser()
    const name = (currentUser && (currentUser.nickname || currentUser.username || currentUser.name)) || ''
    if (name) return String(name)
  } catch (e) {
    // ignore
  }
  return '未知用户'
}

async function getCidByUserId(userId) {
  if (!userId) return null
  const userRes = await getUserById(userId)
  if (!userRes || (userRes.code !== 200 && userRes.code !== 0)) return null
  const email = userRes.email || (userRes.data && userRes.data.email)
  if (!email) return null
  const cidRes = await uniId.getCidByEmail(email)
  if (!cidRes || cidRes.code !== 0 || !cidRes.data || !cidRes.data.cid) return null
  return cidRes.data.cid
}

export async function sendClaimPushToCreator(task, projectId) {
  const rawTask = task && (task.rawTask || task)
  if (!rawTask) return null

  const creatorId = String(
    rawTask.creatorId ||
      rawTask.createdBy ||
      rawTask.taskCreatorId ||
      rawTask.createdById ||
      (rawTask.creator && rawTask.creator.id) ||
      rawTask.userId ||
      ''
  )
  if (!creatorId || creatorId === 'undefined' || creatorId === 'null') return null

  const creatorCid = await getCidByUserId(creatorId)
  if (!creatorCid) return null

  const currentUserName = getCurrentUserName()
  const title = '任务接取通知'
  const content = `${currentUserName} 接取了您的任务"${String(rawTask.title || '')}"`

  try {
    return await silentPost(
      '/zhiyan/message/unipush/send/single',
      { clientId: creatorCid, title, content },
      {
        type: 'task_claimed',
        taskId: String(rawTask.id || ''),
        projectId: String(projectId || ''),
        taskTitle: String(rawTask.title || ''),
        claimedBy: currentUserName
      }
    )
  } catch (e) {
    console.error('[taskPush.sendClaimPushToCreator] push failed:', e)
    return null
  }
}

export async function sendAssignPushToMembers(task, memberIds, projectId) {
  const rawTask = task && (task.rawTask || task)
  if (!rawTask) return null
  if (!memberIds || !memberIds.length) return null

  const currentUserName = getCurrentUserName()
  const title = '任务分配通知'
  const content = `${currentUserName} 给您分配了任务"${String(rawTask.title || '')}"`

  const cidList = []
  for (const memberId of memberIds) {
    try {
      const cid = await getCidByUserId(memberId)
      if (cid) cidList.push(cid)
    } catch (e) {
      console.error('[taskPush.sendAssignPushToMembers] get cid failed:', memberId, e)
    }
  }

  const uniqueCidList = Array.from(new Set(cidList))
  if (!uniqueCidList.length) return null

  try {
    const pushRes = await silentPost(
      '/zhiyan/message/unipush/send/batch',
      { clientIds: uniqueCidList, title, content },
      {
        type: 'task_assigned',
        taskId: String(rawTask.id || ''),
        projectId: String(projectId || ''),
        taskTitle: String(rawTask.title || ''),
        assignedBy: currentUserName
      }
    )

    const arr = getPushResultArray(pushRes)
    if (arr) {
      const successCount = arr.filter(r => r && (r.code === 200 || r.code === 0 || r.errCode === 0)).length
      console.log(`[taskPush.sendAssignPushToMembers] done ${successCount}/${arr.length}`)
    }

    return pushRes
  } catch (e) {
    console.error('[taskPush.sendAssignPushToMembers] push failed:', e)
    return null
  }
}
