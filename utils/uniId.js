/**
 * uni-id 云函数前端封装
 * 用于调用 bindCid 云函数，实现登录、注册、注销等功能
 */

const uniId = {
  /**
   * 登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise} 登录结果
   */
  login: function(username, password) {
    return new Promise((resolve, reject) => {
      uniCloud.callFunction({
        name: 'bindCid',
        data: {
          action: 'login',
          data: {
            username: username,
            password: password
          }
        },
        success: function(res) {
          if (res.result.code === 0) {
            // 保存 token 和过期时间
            if (res.result.token) {
              uni.setStorageSync('uni_id_token', res.result.token)
            }
            if (res.result.tokenExpired) {
              uni.setStorageSync('uni_id_token_expired', res.result.tokenExpired)
            }
            // 保存用户信息
            if (res.result.userInfo) {
              uni.setStorageSync('uni_id_user_info', res.result.userInfo)
            }
            resolve(res.result)
          } else {
            reject(res.result)
          }
        },
        fail: function(err) {
          reject(err)
        }
      })
    })
  },

  /**
   * 注册
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @param {string} nickname - 昵称
   * @returns {Promise} 注册结果
   */
  register: function(username, password, nickname) {
    return new Promise((resolve, reject) => {
      uniCloud.callFunction({
        name: 'bindCid',
        data: {
          action: 'register',
          data: {
            username: username,
            password: password,
            nickname: nickname
          }
        },
        success: function(res) {
          resolve(res.result)
        },
        fail: function(err) {
          reject(err)
        }
      })
    })
  },

  /**
   * 注销
   * @returns {Promise} 注销结果
   */
  logout: function() {
    return new Promise((resolve, reject) => {
      const token = uni.getStorageSync('uni_id_token')

      uniCloud.callFunction({
        name: 'bindCid',
        data: {
          action: 'logout',
          data: {
            token: token
          }
        },
        success: function(res) {
          // 清除本地存储的认证信息
          uni.removeStorageSync('uni_id_token')
          uni.removeStorageSync('uni_id_token_expired')
          uni.removeStorageSync('uni_id_user_info')
          resolve(res.result)
        },
        fail: function(err) {
          reject(err)
        }
      })
    })
  },

  /**
   * 获取用户信息
   * @returns {Promise} 用户信息
   */
  getUserInfo: function() {
    return new Promise((resolve, reject) => {
      const token = uni.getStorageSync('uni_id_token')

      uniCloud.callFunction({
        name: 'bindCid',
        data: {
          action: 'getUserInfo',
          data: {
            token: token
          }
        },
        success: function(res) {
          resolve(res.result)
        },
        fail: function(err) {
          reject(err)
        }
      })
    })
  },

  /**
   * 检查登录状态
   * @returns {boolean} 是否已登录且token未过期
   */
  checkLogin: function() {
    const token = uni.getStorageSync('uni_id_token')
    const tokenExpired = uni.getStorageSync('uni_id_token_expired')

    if (!token || !tokenExpired) {
      return false
    }

    // 检查token是否过期
    if (Date.now() > tokenExpired) {
      // token 已过期，清除本地存储
      uni.removeStorageSync('uni_id_token')
      uni.removeStorageSync('uni_id_token_expired')
      uni.removeStorageSync('uni_id_user_info')
      return false
    }

    return true
  },

  /**
   * 获取当前用户信息（从本地存储）
   * @returns {Object|null} 用户信息
   */
  getCurrentUser: function() {
    const userInfo = uni.getStorageSync('uni_id_user_info')
    return userInfo || null
  },

  /**
   * 获取当前token
   * @returns {string|null} token
   */
  getToken: function() {
    return uni.getStorageSync('uni_id_token') || null
  },

  /**
   * 清除所有认证信息
   */
  clearAuth: function() {
    uni.removeStorageSync('uni_id_token')
    uni.removeStorageSync('uni_id_token_expired')
    uni.removeStorageSync('uni_id_user_info')
  },

  /**
   * 根据邮箱校验并更新CID
   * 增改一体，维护的是云空间的数据库
   * 
   * @param {string} email - 用户邮箱
   * @param {string} cid - 客户端ID
   * @returns {Promise} 操作结果
   */
  verifyAndUpdateCid: function(email, cid) {
    return new Promise((resolve, reject) => {
      uniCloud.callFunction({
        name: 'bindCid',
        data: {
          action: 'verifyAndUpdateCid',
          data: {
            email: email,
            cid: cid
          }
        },
        success: function(res) {
          if (res.result && res.result.code === 0) {
            resolve(res.result)
          } else {
            reject(res.result || { message: '操作失败' })
          }
        },
        fail: function(err) {
          reject(err)
        }
      })
    })
  },

  /**
   * 根据邮箱查询CID信息
   *
   * @param {string} email - 用户邮箱
   * @returns {Promise} 查询结果，包含CID信息或null
   */
  getCidByEmail: function(email) {
    return new Promise((resolve, reject) => {
      uniCloud.callFunction({
        name: 'bindCid',
        data: {
          action: 'getCidByEmail',
          data: {
            email: email
          }
        },
        success: function(res) {
          if (res.result && res.result.code === 0) {
            resolve(res.result)
          } else {
            reject(res.result || { message: '查询失败' })
          }
        },
        fail: function(err) {
          reject(err)
        }
      })
    })
  },
}

export default uniId
