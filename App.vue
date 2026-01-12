<script>
import {
  mapMutations
} from 'vuex'
import {
  version
} from './package.json'
// #ifdef APP
import checkUpdate from '@/uni_modules/uni-upgrade-center-app/utils/check-update';
// #endif
import { checkAllProjectTasks } from '@/utils/taskDeadlineReminder.js'

export default {
  onLaunch: function() {
    // #ifdef H5
    console.log(
        `%c hello uniapp %c v${version} `,
        'background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
        'background:#007aff ;padding: 1px; border-radius: 0 3px 3px 0;  color: #fff; font-weight: bold;'
    )
    // #endif
    // 线上示例使用
    // console.log('%c uni-app官方团队诚邀优秀前端工程师加盟，一起打造更卓越的uni-app & uniCloud，欢迎投递简历到 hr2013@dcloud.io', 'color: red');
    console.log('App Launch');
    // #ifdef APP-PLUS
    // App平台检测升级，服务端代码是通过uniCloud的云函数实现的，详情可参考：https://ext.dcloud.net.cn/plugin?id=4542
    if (plus.runtime.appid !== 'HBuilder') { // 真机运行不需要检查更新，真机运行时appid固定为'HBuilder'，这是调试基座的appid
      checkUpdate()
    }
    // #endif

    // 监听推送消息
    uni.getPushClientId({
      success: (res) => {
        uni.showModal({ title: 'CID', content: res.cid, showCancel: false });
        console.log(res);
        console.log(res.cid);
        try {
          if (res && res.cid) {
            uni.setStorageSync('push_client_id', res.cid);
          }
        } catch (e) {
          console.warn('store push cid failed', e);
        }
      },
      fail: (err) => {
        uni.showToast({ title: '获取 CID 失败', icon: 'none' });
      }
    });

    // 监听点击通知栏事件
    uni.onPushMessage((res) => {
      // 监听【在线、离线】通知栏消息的点击
      if(res.type == 'click'){
        console.log("点击消息，传给客户端的自定义内容：",res.data.payload);  //云函数或本地通知中的 payload 字段
        // 如果需要跳转app内指定页面，则自己实现下方的跳转代码。
        uni.navigateTo({
          //页面路径示例值：/pages/pushinfo/pushinfo
          url:'https://zyplatform.xyz/'
        })
      }
      // 监听【在线】消息到达。若云函数设置了 "force_notification":true，则会自动创建通知栏消息，不会触发此 receive。
      if(res.type == 'receive'){
        console.log("在线推送，接收到的消息内容",res.data);//云函数入参
        //开发者可以自己在此回调，调用 createPushMessage 创建通知栏消息展示。或者处理其它业务逻辑。
        uni.createPushMessage
      }
    })

    // 任务逾期消息推送触发
    this.initTaskDeadlineReminder()

  },
  onShow: function() {
    console.log('App Show')
  },
  onHide: function() {
    console.log('App Hide')
  },
  globalData: {
    test: ''
  },
  methods: {
    ...mapMutations(['setUniverifyErrorMsg', 'setUniverifyLogin']),
    
    /**
     * 初始化任务逾期提醒
     * 每天只检查一次，要不然影响体验
     */
    async initTaskDeadlineReminder() {
      try {
        // 检查是否已登录（通过token判断）
        const config = require('@/utils/config.js').default
        const token = uni.getStorageSync(config.tokenKey)
        if (!token) {
          console.log('用户未登录，跳过任务提醒检查')
          return
        }

        // 检查今天是否已经检查过
        const today = new Date().toDateString()
        const lastCheckDate = uni.getStorageSync('task_reminder_last_check_date')
        
        if (lastCheckDate === today) {
          console.log('今天已检查过任务提醒，跳过')
          return
        }

        // 延迟执行，避免影响应用启动速度
        setTimeout(async () => {
          try {
            console.log('开始检查任务逾期提醒...')
            
            const stats = await checkAllProjectTasks()
            
            // 记录今天已检查
            uni.setStorageSync('task_reminder_last_check_date', today)
            
            // 保存检查结果（可选，用于调试）
            if (stats.reminded > 0) {
              console.log(`任务提醒检查完成：成功提醒 ${stats.reminded} 个任务`)
            } else {
              console.log('任务提醒检查完成：没有需要提醒的任务')
            }
          } catch (error) {
            console.error('任务提醒检查失败:', error)
          }
        }, 3000) // 延迟3秒执行
        
      } catch (error) {
        console.error('初始化任务提醒失败:', error)
      }
    }
  }
}
</script>

<style lang="scss">
/*@import '@/uni_modules/uni-scss/index.scss';*/
/* #ifndef APP-PLUS-NVUE */
/* uni.css - 通用组件、模板样式库，可以当作一套ui库应用 */
/* @import './common/uni.css'; */
/* @import '@/static/customicons.css'; */
/* H5 兼容 pc 所需 */
/* #ifdef H5 */
@media screen and (min-width: 768px) {
  body {
    overflow-y: scroll;
  }
}

/* 顶栏通栏样式 */
/* .uni-top-window {
    left: 0;
    right: 0;
} */

uni-page-body {
  background-color: #F5F5F5 !important;
  min-height: 100% !important;
  height: auto !important;
}

.uni-top-window uni-tabbar .uni-tabbar {
  background-color: #fff !important;
}

.uni-app--showleftwindow .hideOnPc {
  display: none !important;
}

/* #endif */

/* 以下样式用于 hello uni-app 演示所需 */
page {
  background-color: #efeff4;
  height: 100%;
  font-size: 28rpx;
  /* line-height: 1.8; */
}

.fix-pc-padding {
  padding: 0 50px;
}

.uni-header-logo {
  padding: 30rpx;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-top: 10rpx;
}

.uni-header-image {
  width: 100px;
  height: 100px;
}

.uni-hello-text {
  color: #7A7E83;
}

.uni-hello-addfile {
  text-align: center;
  line-height: 300rpx;
  background: #FFF;
  padding: 50rpx;
  margin-top: 10px;
  font-size: 38rpx;
  color: #808080;
}

/* #endif*/
</style>