<template>
  <view class="content">
    <!-- #ifdef MP-QQ -->
    <button type="default" @tap="loginByQQ">QQ登录</button>
    <button type="default" @tap="bindQQ">绑定QQ</button>
    <button type="default" @tap="unbindQQ">解绑QQ</button>
    <!-- #endif -->
    <!-- #ifdef APP-PLUS -->
    <template v-if="hasQQAuth">
      <button type="default" @tap="loginByQQ">QQ登录</button>
      <button type="default" @tap="bindQQ">绑定QQ</button>
      <button type="default" @tap="unbindQQ">解绑QQ</button>
    </template>
    <template v-else>
      <view class="tips">未包含QQ登录模块</view>
    </template>
    <!-- #endif -->
  </view>
</template>

<script>
  export default {
    data() {
      return {
        hasQQAuth: false
      }
    },
    onLoad() {
      uni.getProvider({
        service: 'oauth',
        success: (res) => {
          if (res.provider.indexOf('qq') > -1) {
            this.hasQQAuth = true
          }
        }
      })
    },
    methods: {
      getQQCode() {
        return new Promise((resolve, reject) => {
          uni.login({
            provider: 'qq',
            success(res) {
              console.log('uni.login success: ' + JSON.stringify(res))
              // #ifdef APP-PLUS
              resolve({
                accessToken: res.authResult.access_token,
              })
              // #endif
              // #ifdef MP-QQ
              resolve({
                code: res.code,
              })
              // #endif
            },
            fail(err) {
              reject(new Error('QQ登录失败'))
            }
          })
        })
      },
      unbindQQ() {
        uniCloud.callFunction({
          name: 'uni-id-test',
          data: {
            action: 'unbindQQ'
          },
          success(res) {
            uni.showModal({
              showCancel: false,
              content: JSON.stringify(res.result)
            })
          },
          fail(e) {
            console.error(e)
            uni.showModal({
              showCancel: false,
              content: 'QQ解绑失败，请稍后再试'
            })
          }
        })
      },
      bindQQ() {
        this.getQQCode().then(({
          code,
          accessToken
        }) => {
          return uniCloud.callFunction({
            name: 'uni-id-test',
            data: {
              action: 'bindQQ',
              params: {
                code,
                accessToken
              }
            }
          })
        }).then((res) => {
          uni.showModal({
            showCancel: false,
            content: JSON.stringify(res.result)
          })
        }).catch(() => {
          uni.showModal({
            showCancel: false,
            content: 'QQ绑定失败，请稍后再试'
          })
        })
      },
      loginByQQ() {
        console.log(1, Date.now())
        this.getQQCode().then(({
          code,
          accessToken
        } = {}) => {
        console.log(2, Date.now())
          return uniCloud.callFunction({
            name: 'uni-id-test',
            data: {
              action: 'loginByQQ',
              params: {
                code,
                accessToken
              }
            }
          })
        }).then((res) => {
        console.log(3, Date.now())
          uni.showModal({
            showCancel: false,
            content: JSON.stringify(res.result)
          })
          if (res.result.code === 0) {
            uni.setStorageSync('uni_id_token', res.result.token)
            uni.setStorageSync('uni_id_token_expired', res.result.tokenExpired)
          }
        }).catch((e) => {
        console.log(4, Date.now())
          console.error(e)
          uni.showModal({
            showCancel: false,
            content: 'QQ登录失败，请稍后再试'
          })
        })
      },
    }
  }
</script>

<style>

</style>
