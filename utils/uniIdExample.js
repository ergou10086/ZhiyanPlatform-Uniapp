// uni-id 使用示例
import uniId from './uniId.js'

// 1. 登录示例
async function loginExample() {
  try {
    const result = await uniId.login('username', 'password')
    console.log('登录成功', result)
    // result 包含用户信息和token等
  } catch (err) {
    console.error('登录失败', err)
  }
}

// 2. 注册示例
async function registerExample() {
  try {
    const result = await uniId.register('username', 'password', '昵称')
    console.log('注册成功', result)
  } catch (err) {
    console.error('注册失败', err)
  }
}

// 3. 检查登录状态
function checkLoginStatus() {
  const isLoggedIn = uniId.checkLogin()
  if (isLoggedIn) {
    console.log('用户已登录')
    const userInfo = uniId.getCurrentUser()
    console.log('用户信息:', userInfo)
  } else {
    console.log('用户未登录')
  }
}

// 4. 获取用户信息
async function getUserInfoExample() {
  try {
    const result = await uniId.getUserInfo()
    if (result.code === 0) {
      console.log('获取用户信息成功', result.userInfo)
    } else {
      console.error('获取用户信息失败', result.message)
    }
  } catch (err) {
    console.error('获取用户信息出错', err)
  }
}

// 根据邮箱校验并更新CID的示例
async function verifyAndUpdateCidExample() {
  try {
    const result = await uniId.verifyAndUpdateCid('user@example.com', 'device_cid_123')
    console.log('CID校验更新结果:', result)

    switch (result.action) {
      case 'no_change':
        console.log('CID已是最新，无需更新')
        break
      case 'updated':
        console.log('CID已更新，从', result.oldCid, '更新为', result.cid)
        break
      case 'created':
        console.log('新CID已绑定')
        break
    }
  } catch (err) {
    console.error('CID校验更新失败:', err)
  }
}

// 根据邮箱查询CID信息的示例
async function getCidByEmailExample() {
  try {
    const result = await uniId.getCidByEmail('user@example.com')
    console.log('邮箱查询CID结果:', result)

    if (result.data) {
      console.log('找到CID信息:', {
        cid: result.data.cid,
        platform: result.data.platform,
        lastActive: new Date(result.data.last_active_date).toLocaleString()
      })
    } else {
      console.log('该邮箱没有对应的CID记录')
    }
  } catch (err) {
    console.error('查询CID失败:', err)
  }
}

// 5. 注销示例
async function logoutExample() {
  try {
    const result = await uniId.logout()
    console.log('注销成功', result)
  } catch (err) {
    console.error('注销失败', err)
  }
}

// 页面中使用示例
export default {
  data() {
    return {
      username: '',
      password: '',
      nickname: ''
    }
  },
  methods: {
    // 登录方法
    async handleLogin() {
      if (!this.username || !this.password) {
        uni.showToast({
          title: '请输入用户名和密码',
          icon: 'none'
        })
        return
      }

      uni.showLoading({ title: '登录中...' })

      try {
        await uniId.login(this.username, this.password)
        uni.showToast({
          title: '登录成功',
          icon: 'success'
        })
        // 登录成功后跳转到首页或其他页面
        uni.switchTab({
          url: '/pages/index/index'
        })
      } catch (err) {
        uni.showToast({
          title: err.message || '登录失败',
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    },

    // 注册方法
    async handleRegister() {
      if (!this.username || !this.password || !this.nickname) {
        uni.showToast({
          title: '请填写完整信息',
          icon: 'none'
        })
        return
      }

      uni.showLoading({ title: '注册中...' })

      try {
        await uniId.register(this.username, this.password, this.nickname)
        uni.showToast({
          title: '注册成功，请登录',
          icon: 'success'
        })
        // 可以自动填充用户名到登录表单
      } catch (err) {
        uni.showToast({
          title: err.message || '注册失败',
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    },

    // 页面加载时检查登录状态
    onLoad() {
      const isLoggedIn = uniId.checkLogin()
      if (isLoggedIn) {
        // 已登录，跳转到首页
        uni.switchTab({
          url: '/pages/index/index'
        })
      }
    }
  }
}
