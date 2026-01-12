// uni-id 云函数封装
const uniID = require('uni-id-common')

// 初始化 uni-id
function initUniID(context) {
  return uniID.createInstance({
    context: context
  })
}

// 登录
async function login(event, context) {
  const uniIDInstance = initUniID(context)
  
  const result = await uniIDInstance.login({
    username: event.username,
    password: event.password
  })
  
  return result
}

// 注册
async function register(event, context) {
  const uniIDInstance = initUniID(context)
  
  const result = await uniIDInstance.register({
    username: event.username,
    password: event.password,
    nickname: event.nickname
  })
  
  return result
}

// 注销
async function logout(event, context) {
  const uniIDInstance = initUniID(context)
  
  const result = await uniIDInstance.logout({
    token: event.token
  })
  
  return result
}

// 获取用户信息
async function getUserInfo(event, context) {
  const uniIDInstance = initUniID(context)

  const result = await uniIDInstance.checkToken({
    token: event.token
  })

  if (result.code === 0) {
    return {
      code: 0,
      message: '获取用户信息成功',
      userInfo: result.userInfo
    }
  } else {
    return {
      code: result.code,
      message: result.message
    }
  }
}

// 绑定设备CID到用户
async function bindCid(event, context) {
  const { cid, token } = event

  if (!cid || !token) {
    return {
      code: 10001,
      message: '缺少必要参数：cid 或 token'
    }
  }

  const uniIDInstance = initUniID(context)

  // 验证token
  const checkResult = await uniIDInstance.checkToken({
    token: token
  })

  if (checkResult.code !== 0) {
    return {
      code: checkResult.code,
      message: checkResult.message || 'token无效'
    }
  }

  try {
    const db = uniCloud.database()
    const userId = checkResult.uid

    // 获取用户的邮箱信息
    const userInfo = await db.collection('uni-id-users').doc(userId).get()
    const userEmail = userInfo.data && userInfo.data.length > 0 ? userInfo.data[0].email : null

    let existingRecord = null
    let foundByEmail = false

    // 首先通过邮箱查找是否已有记录（如果有邮箱的话）
    if (userEmail) {
      const emailExistingCid = await db.collection('zhiyan-cids').where({
        email: userEmail
      }).limit(1).get()

      if (emailExistingCid.data && emailExistingCid.data.length > 0) {
        existingRecord = emailExistingCid.data[0]
        foundByEmail = true
        console.log('通过邮箱找到现有记录，将进行更新:', { email: userEmail, existingCid: existingRecord.cid })
      }
    }

    // 如果没有通过邮箱找到记录，则通过CID查询
    if (!existingRecord) {
      const cidExistingQuery = await db.collection('zhiyan-cids').where({
        cid: cid
      }).limit(1).get()

      if (cidExistingQuery.data && cidExistingQuery.data.length > 0) {
        existingRecord = cidExistingQuery.data[0]
      }
    }

    if (existingRecord) {
      // 记录已存在，更新信息
      const updateData = {
        user_id: userId, // 确保用户ID正确
        last_active_date: Date.now(),
        status: 0 // 激活状态
      }

      // 更新邮箱（如果有的话）
      if (userEmail) {
        updateData.email = userEmail
      }

      await db.collection('zhiyan-cids').doc(existingRecord._id).update(updateData)

      if (foundByEmail) {
        console.log('通过邮箱更新CID绑定:', { cid, userId, email: userEmail })
      } else {
        console.log('CID已存在，更新绑定:', { cid, userId, email: userEmail })
      }
    } else {
      // 没有找到现有记录，创建新记录
      const cidData = {
        user_id: userId,
        cid: cid,
        platform: context.PLATFORM || 'app-plus',
        device_info: {
          model: context.DEVICEID || 'unknown',
          system: context.PLATFORM || 'app-plus',
          version: '1.0.0'
        },
        create_date: Date.now(),
        last_active_date: Date.now(),
        status: 0
      }

      // 如果用户有邮箱，添加到CID数据中
      if (userEmail) {
        cidData.email = userEmail
      }

      await db.collection('zhiyan-cids').add(cidData)
      console.log('新CID绑定成功:', { cid, userId, email: userEmail })
    }

    return {
      code: 0,
      message: 'CID绑定成功'
    }

  } catch (error) {
    console.error('CID绑定失败:', error)
    return {
      code: 10005,
      message: 'CID绑定失败: ' + error.message
    }
  }
}

// 同步用户信息到 uni-id 系统
async function syncUser(event, context) {
  const { userInfo, password, cid } = event

  if (!userInfo) {
    return {
      code: 10001,
      message: '缺少用户信息'
    }
  }

  try {
    const db = uniCloud.database()
    const crypto = require('crypto')

    // 确定用户名：优先使用邮箱，否则使用用户名
    const username = userInfo.email || userInfo.username || userInfo.name
    if (!username) {
      return {
        code: 10002,
        message: '无法确定用户名'
      }
    }

    // 检查用户是否已存在
    const existingUser = await db.collection('uni-id-users').where({
      username: username
    }).limit(1).get()

    let userId
    let isNewUser = false

    if (existingUser.data && existingUser.data.length > 0) {
      // 用户已存在，只更新基本信息
      userId = existingUser.data[0]._id
      await db.collection('uni-id-users').doc(userId).update({
        nickname: userInfo.name || userInfo.nickname || '用户',
        last_login_date: Date.now(),
        last_login_ip: context.CLIENTIP || 'unknown'
      })

      console.log('用户信息已更新:', username)
    } else {
      // 用户不存在，创建新用户
      // 使用简单的 SHA256 哈希作为临时解决方案
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex')

      const newUser = {
        username: username,
        password: hashedPassword,
        nickname: userInfo.name || userInfo.nickname || '用户',
        status: 0, // 正常状态
        role: ['user'], // 默认角色
        register_date: Date.now(),
        register_ip: context.CLIENTIP || 'unknown',
        last_login_date: Date.now(),
        last_login_ip: context.CLIENTIP || 'unknown'
      }

      // 如果有邮箱，添加到用户信息中
      if (userInfo.email) {
        newUser.email = userInfo.email
      }

      const createResult = await db.collection('uni-id-users').add(newUser)

      if (createResult.id) {
        userId = createResult.id
        isNewUser = true
        console.log('新用户创建成功:', username)
      } else {
        return {
          code: 10003,
          message: '创建用户失败'
        }
      }
    }

    // 如果提供了CID，同时在zhiyan-cids表中创建或更新记录
    if (cid && userId) {
      let existingRecord = null
      let isUpdateByEmail = false

      // 首先通过邮箱查询是否已有记录（如果有邮箱的话）
      if (userInfo.email) {
        const emailExistingCid = await db.collection('zhiyan-cids').where({
          email: userInfo.email
        }).limit(1).get()

        if (emailExistingCid.data && emailExistingCid.data.length > 0) {
          existingRecord = emailExistingCid.data[0]
          isUpdateByEmail = true
          console.log('通过邮箱找到现有记录，将进行更新:', { email: userInfo.email, existingCid: existingRecord.cid })
        }
      }

      // 如果没有通过邮箱找到记录，则通过user_id查询
      if (!existingRecord) {
        const userExistingCid = await db.collection('zhiyan-cids').where({
          user_id: userId
        }).limit(1).get()

        if (userExistingCid.data && userExistingCid.data.length > 0) {
          existingRecord = userExistingCid.data[0]
        }
      }

      if (existingRecord) {
        // 记录已存在，更新信息
        const existingCid = existingRecord.cid
        const updateData = {
          user_id: userId, // 确保用户ID正确
          cid: cid, // 更新为新的CID
          last_active_date: Date.now(),
          status: 0, // 激活状态
          platform: context.PLATFORM || 'app-plus',
          device_info: {
            model: context.DEVICEID || 'unknown',
            system: context.PLATFORM || 'app-plus',
            version: '1.0.0'
          }
        }

        // 更新邮箱（如果有的话）
        if (userInfo.email) {
          updateData.email = userInfo.email
        }

        await db.collection('zhiyan-cids').doc(existingRecord._id).update(updateData)

        if (isUpdateByEmail) {
          console.log('通过邮箱更新CID记录:', { email: userInfo.email, oldCid: existingCid, newCid: cid, userId })
        } else if (existingCid === cid) {
          console.log('CID相同，更新活跃时间:', { cid, userId, email: userInfo.email })
        } else {
          console.log('CID已更新:', { oldCid: existingCid, newCid: cid, userId, email: userInfo.email })
        }
      } else {
        // 没有找到现有记录，创建新记录
        const cidData = {
          user_id: userId,
          cid: cid,
          platform: context.PLATFORM || 'app-plus',
          device_info: {
            model: context.DEVICEID || 'unknown',
            system: context.PLATFORM || 'app-plus',
            version: '1.0.0'
          },
          create_date: Date.now(),
          last_active_date: Date.now(),
          status: 0
        }

        // 如果有邮箱，添加到CID数据中
        if (userInfo.email) {
          cidData.email = userInfo.email
        }

        await db.collection('zhiyan-cids').add(cidData)
        console.log('新CID绑定成功:', { cid, userId, email: userInfo.email })
      }
    }

    return {
      code: 0,
      message: '用户信息已同步',
      uid: userId,
      isNewUser: isNewUser
    }

  } catch (error) {
    console.error('同步用户信息出错:', error)
    return {
      code: 10004,
      message: '同步用户信息失败: ' + error.message
    }
  }
}

// 根据邮箱校验并更新CID（简化版：直接通过邮箱操作zhiyan-cids表）
async function verifyAndUpdateCid(event, context) {
  const { email, cid, userId } = event

  if (!email || !cid) {
    return {
      code: 10001,
      message: '缺少必要参数：email 或 cid'
    }
  }

  try {
    const db = uniCloud.database()

    // 直接通过邮箱查询zhiyan-cids表
    const existingQuery = await db.collection('zhiyan-cids').where({
      email: email
    }).limit(1).get()

    let result = {
      code: 0,
      message: '',
      action: '',
      email: email,
      cid: cid
    }

    if (existingQuery.data && existingQuery.data.length > 0) {
      // 邮箱已存在记录
      const existingRecord = existingQuery.data[0]
      const existingCid = existingRecord.cid

      if (existingCid === cid) {
        // CID相同，只更新活跃时间
        const updateData = {
          last_active_date: Date.now(),
          status: 0 // 激活状态
        }

        // 如果传入了userId，也更新user_id
        if (userId) {
          updateData.user_id = userId
        }

        await db.collection('zhiyan-cids').doc(existingRecord._id).update(updateData)

        result.message = 'CID验证成功，当前CID已是最新'
        result.action = 'no_change'
        console.log('CID相同，更新活跃时间:', { email, cid })
      } else {
        // CID不同，更新CID
        const updateData = {
          cid: cid, // 更新为新的CID
          last_active_date: Date.now(),
          status: 0, // 激活状态
          platform: context.PLATFORM || 'app-plus',
          device_info: {
            model: context.DEVICEID || 'unknown',
            system: context.PLATFORM || 'app-plus',
            version: '1.0.0'
          }
        }

        // 如果传入了userId，也更新user_id
        if (userId) {
          updateData.user_id = userId
        }

        await db.collection('zhiyan-cids').doc(existingRecord._id).update(updateData)

        result.message = 'CID已更新'
        result.action = 'updated'
        result.oldCid = existingCid
        console.log('通过邮箱更新CID:', { email, oldCid: existingCid, newCid: cid })
      }
    } else {
      // 邮箱不存在，创建新记录
      let actualUserId = userId

      // 如果没有传入userId，从uni-id-users表查找
      if (!actualUserId) {
        const userQuery = await db.collection('uni-id-users').where({
          email: email
        }).limit(1).get()

        if (!userQuery.data || userQuery.data.length === 0) {
          return {
            code: 10002,
            message: '用户不存在，无法绑定CID'
          }
        }

        actualUserId = userQuery.data[0]._id
      }

      const newCidData = {
        user_id: actualUserId,
        cid: cid,
        email: email,
        platform: context.PLATFORM || 'app-plus',
        device_info: {
          model: context.DEVICEID || 'unknown',
          system: context.PLATFORM || 'app-plus',
          version: '1.0.0'
        },
        create_date: Date.now(),
        last_active_date: Date.now(),
        status: 0
      }

      await db.collection('zhiyan-cids').add(newCidData)

      result.message = 'CID绑定成功'
      result.action = 'created'
      result.userId = actualUserId
      console.log('新CID绑定成功:', { email, cid })
    }

    return result

  } catch (error) {
    console.error('CID校验更新失败:', error)
    return {
      code: 10005,
      message: 'CID校验更新失败: ' + error.message
    }
  }
}

// 根据邮箱查询CID信息
async function getCidByEmail(event, context) {
  const { email } = event

  if (!email) {
    return {
      code: 10001,
      message: '缺少必要参数：email'
    }
  }

  try {
    const db = uniCloud.database()

    // 通过邮箱查询 zhiyan-cids 表
    const cidQuery = await db.collection('zhiyan-cids').where({
      email: email
    }).limit(1).get()

    if (cidQuery.data && cidQuery.data.length > 0) {
      const cidRecord = cidQuery.data[0]

      // 返回CID信息（不包含敏感字段如_id）
      const result = {
        code: 0,
        message: '查询成功',
        data: {
          user_id: cidRecord.user_id,
          cid: cidRecord.cid,
          email: cidRecord.email,
          platform: cidRecord.platform,
          device_info: cidRecord.device_info,
          create_date: cidRecord.create_date,
          last_active_date: cidRecord.last_active_date,
          status: cidRecord.status
        }
      }

      console.log('根据邮箱查询CID成功:', { email, cid: cidRecord.cid })
      return result
    } else {
      return {
        code: 0,
        message: '未找到对应的CID记录',
        data: null
      }
    }

  } catch (error) {
    console.error('根据邮箱查询CID失败:', error)
    return {
      code: 10006,
      message: '查询失败: ' + error.message
    }
  }
}

// 云函数入口
exports.main = async (event, context) => {
  // 设置客户端信息（根据uni-id-common的要求）
  context.APPID = '__UNI__43C3508' // 从manifest.json获取
  context.PLATFORM = context.PLATFORM || 'app-plus' // 默认平台
  context.LOCALE = context.LOCALE || 'zh-Hans' // 默认语言

  console.log('bindCid 云函数接收到的事件:', event)

  // 检查是否是直接的参数传递（用于兼容现有的bindCid调用）
  if (event.cid && event.token) {
    return await bindCid(event, context)
  }

  // 否则通过action方式调用（用于uni-id功能）
  const { action, data } = event
  console.log('解析后的 action:', action, 'data:', data)

  switch (action) {
    case 'login':
      return await login(data, context)
    case 'register':
      return await register(data, context)
    case 'logout':
      return await logout(data, context)
    case 'getUserInfo':
      return await getUserInfo(data, context)
    case 'syncUser':
      return await syncUser(data, context)
    case 'verifyAndUpdateCid':
      return await verifyAndUpdateCid(data, context)
    case 'getCidByEmail':
      return await getCidByEmail(data, context)
    default:
      return {
        code: 10001,
        message: '未知的操作类型'
      }
  }
}
