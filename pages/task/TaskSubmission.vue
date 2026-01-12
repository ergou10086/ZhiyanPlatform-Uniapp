<template>
  <view class="task-submission-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-left" @click="goBack">
          <uni-icons type="left" size="20" color="#333"></uni-icons>
        </view>
        <view class="navbar-title">{{ latestSubmission ? '更改提交' : '提交任务' }}</view>
        <view class="navbar-right"></view>
      </view>
    </view>

    <!-- 页面内容 -->
    <scroll-view class="content" scroll-y>
      <loading-spinner v-if="loading" :overlay="false" :blend="true" />

      <view v-else-if="task" class="submission-content">
        <!-- 任务信息 -->
        <view class="info-card task-info-card">
          <view class="info-label">
            <uni-icons type="info" size="18" color="#666"></uni-icons>
            <text>任务信息</text>
          </view>
          <view class="task-info">
            <view class="task-info-item">
              <text class="task-info-label">任务标题：</text>
              <text class="task-info-value">{{ task.title }}</text>
            </view>
            <view v-if="task.description" class="task-info-item">
              <text class="task-info-label">任务描述：</text>
              <text class="task-info-value">{{ task.description }}</text>
            </view>
          </view>
        </view>

        <!-- 提交工时 -->
        <view class="info-card">
          <view class="form-label">
            <text>提交工时</text>
            <text class="label-tip">(单位：小时，支持小数)</text>
          </view>
          <view class="worktime-input-wrapper">
            <view class="worktime-input-box">
              <uni-easyinput
                v-model="formData.actualWorktime"
                type="number"
                placeholder="例如 2 或 2.5 表示耗时 2.5 小时"
                :inputBorder="false"
              />
            </view>
            <text class="input-suffix">小时</text>
          </view>
          <view class="form-hint">可选项，不填默认不记录工时</view>
        </view>

        <!-- 提交说明 -->
        <view class="info-card">
          <view class="form-label required">
            <text>提交说明</text>
            <text class="label-tip">(至少10字)</text>
          </view>
          <textarea
            v-model="formData.submissionContent"
            class="form-textarea"
            placeholder="请详细描述任务完成情况，包括完成的工作内容、遇到的问题及解决方案等..."
            maxlength="5000"
            :auto-height="true"
          />
          <view class="char-count">{{ formData.submissionContent.length }} / 5000</view>
        </view>

        <!-- 附件上传 -->
        <view class="info-card">
          <view class="form-label">
            <text>附件</text>
            <text class="label-tip">(选填，支持文档、图片、压缩包等)</text>
          </view>
          <view class="upload-area">
            <!-- 文件列表 -->
            <view v-if="uploadedFiles.length > 0" class="file-list">
              <view
                v-for="(file, index) in uploadedFiles"
                :key="index"
                class="file-item"
              >
                <view class="file-icon">
                  <uni-icons type="paperclip" size="20" color="#1677ff"></uni-icons>
                </view>
                <view class="file-info">
                  <text class="file-name">{{ file.filename || file.name }}</text>
                  <text v-if="file.size" class="file-size">{{ formatFileSize(file.size) }}</text>
                </view>
                <view class="file-remove" @tap.stop="removeFile(index)">
                  <uni-icons type="close" size="16" color="#999"></uni-icons>
                </view>
              </view>
            </view>

            <!-- 上传按钮 -->
            <button class="upload-trigger" plain @tap.stop="triggerFileUpload">
              <uni-icons type="cloud-upload" size="32" color="#1677ff"></uni-icons>
              <text class="upload-text">点击上传附件</text>
              <text class="upload-hint">支持多个文件，单个文件不超过100MB</text>
            </button>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部提交按钮 -->
    <view class="bottom-actions">
      <button
        class="submit-btn"
        @click="handleSubmit"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? '提交中...' : (latestSubmission ? '保存更改' : '提交任务') }}
      </button>
    </view>
  </view>
</template>

<script>
import { submitTask, getLatestSubmission, uploadSubmissionFile } from '@/api/taskSubmission.js'
import { getTaskDetail } from '@/api/task.js'
import config from '@/utils/config.js'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import uniId from '@/utils/uniId.js'
import { batchSendMessage } from '@/api/unipush.js'

export default {
  components: { LoadingSpinner },
  name: 'TaskSubmission',
  data() {
    return {
      taskId: '',
      projectId: '',
      task: null,
      loading: true,
      latestSubmission: null,
      filePickerExtname: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'zip', 'rar', '7z', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'avi'],
      formData: {
        actualWorktime: '',
        submissionContent: '',
        attachmentUrls: []
      },
      uploadedFiles: [],
      isSubmitting: false
    }
  },
  computed: {
    canSubmit() {
      return this.formData.submissionContent.trim().length >= 10
    }
  },
  onLoad(options) {
    if (options && options.taskId) {
      this.taskId = options.taskId
    }
    if (options && options.projectId) {
      this.projectId = options.projectId
    }
    if (this.taskId && this.projectId) {
      this.fetchTaskDetail()
      this.fetchLatestSubmission()
    } else {
      uni.showToast({
        title: '缺少必要参数',
        icon: 'none'
      })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
  },
  methods: {
    // 兼容各端文件选择
    async fetchTaskDetail() {
      try {
        this.loading = true
        const res = await getTaskDetail(this.taskId, this.projectId)
        
        if (res && (res.code === 200 || res.code === 0)) {
          this.task = res.data || res
        } else {
          uni.showToast({
            title: (res && (res.msg || res.message)) || '获取任务详情失败',
            icon: 'none'
          })
        }
      } catch (e) {
        console.error('获取任务详情失败:', e)
        uni.showToast({
          title: e.message || '获取任务详情失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    async fetchLatestSubmission() {
      try {
        const res = await getLatestSubmission(this.taskId)
        console.log('fetchLatestSubmission response:', res)
        
        const latest = res && (res.data || res)
        let latestSubmission = latest
        if (Array.isArray(latestSubmission)) {
          latestSubmission = latestSubmission[0]
        } else if (latestSubmission && Array.isArray(latestSubmission.content)) {
          latestSubmission = latestSubmission.content[0]
        }
        console.log('latest submission candidate:', latestSubmission)

        if (res && (res.code === 200 || res.code === 0) && latestSubmission) {
          // 更改提交场景：优先回填最近一次提交。
          // 兼容本地 userInfo 缺失/解析失败的情况，避免页面变成空白。
          let canPrefill = true
          try {
            const userInfo = uni.getStorageSync(config.userInfoKey)
            if (userInfo) {
              const user = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo
              const currentUserId = String(user.id || user.userId || '')
              const submitterId = String(
                latestSubmission.submitterId ||
                  latestSubmission.submitter?.id ||
                  latestSubmission.creatorId ||
                  latestSubmission.createdBy ||
                  latestSubmission.createdById ||
                  latestSubmission.userId ||
                  ''
              )
              if (currentUserId && submitterId && currentUserId !== submitterId) {
                console.warn('latest submission submitter mismatch, still prefill:', {
                  currentUserId,
                  submitterId
                })
              }
            }
          } catch (e) {
            console.warn('读取用户信息失败，继续回填最近一次提交:', e)
          }

          if (canPrefill) {
            this.latestSubmission = latestSubmission
            console.log('prefill submission:', this.latestSubmission)
            this.loadPreviousSubmission()
          }
        }
      } catch (e) {
        console.error('获取最新提交失败:', e)
      }
    },
    loadPreviousSubmission() {
      if (!this.latestSubmission) return
      
      // 加载实际工时
      if (this.latestSubmission.actualWorktime !== undefined && this.latestSubmission.actualWorktime !== null) {
        this.formData.actualWorktime = String(this.latestSubmission.actualWorktime)
      } else {
        this.formData.actualWorktime = ''
      }
      
      // 加载提交说明
      this.formData.submissionContent = this.latestSubmission.submissionContent || ''
      
      // 加载附件
      if (this.latestSubmission.attachmentUrls && this.latestSubmission.attachmentUrls.length > 0) {
        this.formData.attachmentUrls = [...this.latestSubmission.attachmentUrls]
        this.uploadedFiles = this.latestSubmission.attachmentUrls.map(url => {
          const fileName = this.getFileNameFromUrl(url)
          return {
            filename: fileName,
            url: url,
            size: 0
          }
        })
      } else {
        this.formData.attachmentUrls = []
        this.uploadedFiles = []
      }
    },
    getFileNameFromUrl(url) {
      if (!url) return '未知文件'
      try {
        const parts = url.split('/')
        const fileName = parts[parts.length - 1]
        return decodeURIComponent(fileName)
      } catch (error) {
        console.error('解析文件名失败:', error)
        return '未知文件'
      }
    },
    triggerFileUpload() {
      const extensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.md', '.zip', '.rar', '.7z', '.jpg', '.jpeg', '.png', '.gif', '.mp4', '.avi']

      const onSuccess = (res) => {
        const tempFiles = (res && (res.tempFiles || res.files)) || []
        this.handleFileSelect(tempFiles)
      }

      const onFail = (err) => {
        console.error('选择文件失败:', err)
        let msg = '选择文件失败'
        if (typeof err === 'string') {
          msg = err
        } else if (err && (err.errMsg || err.message)) {
          msg = err.errMsg || err.message
        } else {
          try {
            const raw = err ? JSON.stringify(err) : ''
            if (raw) msg = raw
          } catch (e) {
            // ignore
          }
        }
        uni.showToast({
          title: msg,
          icon: 'none'
        })
      }

      // 给用户即时反馈，避免“没反应”的感受
      uni.showToast({
        title: '正在打开文件选择…',
        icon: 'none',
        duration: 800
      })

      try {
        if (typeof uni.chooseFile === 'function') {
          uni.chooseFile({
            count: 9,
            type: 'all',
            extension: extensions,
            success: onSuccess,
            fail: onFail
          })
          return
        }

        // 小程序等端通常使用 chooseMessageFile
        if (typeof uni.chooseMessageFile === 'function') {
          uni.chooseMessageFile({
            count: 9,
            type: 'file',
            extension: extensions,
            success: onSuccess,
            fail: onFail
          })
          return
        }

        // App 端兜底：HTML5+ 原生文件选择
        // #ifdef APP-PLUS
        if (typeof plus !== 'undefined' && plus.io && typeof plus.io.chooseFile === 'function') {
          const onPlusChooseSuccess = (e) => {
            let rawPaths = []
            if (typeof e === 'string') {
              rawPaths = [e]
            } else if (e) {
              rawPaths = (e.files || (e.file ? [e.file] : []) || []).filter(Boolean)
            }

            if (!rawPaths || rawPaths.length === 0) {
              onFail({ errMsg: '未选择文件' })
              return
            }

            const resolvedTempFiles = []

            const resolveOne = (p) =>
              new Promise((resolve) => {
                const finish = (path, size = 0) => resolve({ path, size })

                const getSize = (path) =>
                  new Promise((r) => {
                    try {
                      plus.io.getFileInfo({
                        filePath: path,
                        success: (info) => r((info && info.size) || 0),
                        fail: () => r(0)
                      })
                    } catch (e) {
                      r(0)
                    }
                  })

                try {
                  plus.io.resolveLocalFileSystemURL(
                    p,
                    (entry) => {
                      const localUrl = entry && typeof entry.toLocalURL === 'function' ? entry.toLocalURL() : p

                      const normalizeForUpload = (maybeUrl) => {
                        try {
                          if (typeof plus !== 'undefined' && plus.io && typeof plus.io.convertLocalFileSystemURL === 'function') {
                            // 把 file:///_doc 等 URL 统一转成绝对路径，避免 uni.uploadFile 读不到导致 0B
                            return plus.io.convertLocalFileSystemURL(maybeUrl)
                          }
                        } catch (e) {
                          // ignore
                        }
                        return maybeUrl
                      }

                      const copyToDoc = () => {
                        try {
                          plus.io.resolveLocalFileSystemURL(
                            '_doc/',
                            (docDir) => {
                              const originName = this.getFileNameFromUrl(localUrl)
                              const safeName = `task-upload-${Date.now()}-${Math.floor(Math.random() * 10000)}-${originName}`
                              entry.copyTo(
                                docDir,
                                safeName,
                                (newEntry) => {
                                  const newUrl = newEntry && typeof newEntry.toLocalURL === 'function' ? newEntry.toLocalURL() : localUrl
                                  const uploadPath = normalizeForUpload(newUrl)
                                  getSize(uploadPath).then((s) => finish(uploadPath, s))
                                },
                                () => {
                                  const uploadPath = normalizeForUpload(localUrl)
                                  getSize(uploadPath).then((s) => finish(uploadPath, s))
                                }
                              )
                            },
                            () => {
                              const uploadPath = normalizeForUpload(localUrl)
                              getSize(uploadPath).then((s) => finish(uploadPath, s))
                            }
                          )
                        } catch (e) {
                          const uploadPath = normalizeForUpload(localUrl)
                          getSize(uploadPath).then((s) => finish(uploadPath, s))
                        }
                      }

                      copyToDoc()
                    },
                    () => {
                      getSize(p).then((s) => finish(p, s))
                    }
                  )
                } catch (err) {
                  getSize(p).then((s) => finish(p, s))
                }
              })

            Promise.all(rawPaths.map(resolveOne)).then((items) => {
              items.forEach(({ path, size }) => {
                resolvedTempFiles.push({
                  path,
                  tempFilePath: path,
                  name: this.getFileNameFromUrl(path),
                  size: size || 0
                })
              })

              uni.showToast({
                title: `已选择 ${resolvedTempFiles.length} 个文件，开始上传…`,
                icon: 'none',
                duration: 800
              })

              onSuccess({ tempFiles: resolvedTempFiles })
            })
          }

          const onPlusChooseFail = (err) => {
            // 部分机型/ROM 会把选择结果回传到 fail 回调里（err.files / err.file）
            // 这里做兜底：只要拿得到 files，就按 success 继续走上传
            if (err) {
              let maybe = err
              if (typeof err === 'string') {
                try {
                  const parsed = JSON.parse(err)
                  if (parsed) maybe = parsed
                } catch (e) {
                  // ignore
                }
              }
              const files = (maybe && (maybe.files || (maybe.file ? [maybe.file] : []))) || []
              if (files && files.length > 0) {
                onPlusChooseSuccess(maybe)
                return
              }
            }
            onFail(err)
          }

          // 使用 (success, fail, options) 签名，部分机型 object 形式不回调
          plus.io.chooseFile(onPlusChooseSuccess, onPlusChooseFail, { multiple: true })
          return
        }
        // #endif

        uni.showToast({
          title: '当前平台不支持选择文件',
          icon: 'none'
        })
      } catch (e) {
        console.error('打开文件选择器异常:', e)
        uni.showToast({
          title: e.message || '打开文件选择器失败',
          icon: 'none'
        })
      }
    },
    async handleFileSelect(files) {
      for (const file of files) {
        const filePath = file.path || file.tempFilePath
        if (!filePath) {
          uni.showToast({
            title: '文件路径获取失败',
            icon: 'none'
          })
          continue
        }
        // 检查文件大小（100MB限制）
        if (file.size > 100 * 1024 * 1024) {
          uni.showToast({
            title: `文件 ${file.name} 超过100MB限制`,
            icon: 'none'
          })
          continue
        }

        try {
          uni.showLoading({
            title: '上传中...'
          })
          
          const response = await uploadSubmissionFile(filePath)
          
          uni.hideLoading()
          
          if (response && response.code === 200 && response.data) {
            this.uploadedFiles.push({
              filename: response.data.filename || file.name,
              url: response.data.url,
              size: file.size
            })
            this.formData.attachmentUrls.push(response.data.url)
            uni.showToast({
              title: '上传成功',
              icon: 'success',
              duration: 1500
            })
          } else {
            uni.showToast({
              title: (response && response.msg) || '上传失败',
              icon: 'none'
            })
          }
        } catch (error) {
          uni.hideLoading()
          console.error('文件上传失败:', error)
          uni.showToast({
            title: error.msg || error.message || '上传失败',
            icon: 'none'
          })
        }
      }
    },
    removeFile(index) {
      this.uploadedFiles.splice(index, 1)
      this.formData.attachmentUrls.splice(index, 1)
    },
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    },
    async handleSubmit() {
      if (!this.canSubmit) {
        uni.showToast({
          title: '提交说明至少需要10个字符',
          icon: 'none'
        })
        return
      }

      if (this.formData.submissionContent.length > 5000) {
        uni.showToast({
          title: '提交说明不能超过5000个字符',
          icon: 'none'
        })
        return
      }

      const trimmedContent = this.formData.submissionContent.trim()

      // 验证工时
      let actualWorktimeValue = null
      if (this.formData.actualWorktime !== '' && this.formData.actualWorktime !== null && this.formData.actualWorktime !== undefined) {
        const parsed = Number(this.formData.actualWorktime)
        if (Number.isNaN(parsed)) {
          uni.showToast({
            title: '提交工时必须是数字',
            icon: 'none'
          })
          return
        }
        if (parsed < 0) {
          uni.showToast({
            title: '提交工时不能为负数',
            icon: 'none'
          })
          return
        }
        actualWorktimeValue = Number(parsed.toFixed(2))
      }

      const payload = {
        submissionContent: trimmedContent,
        attachmentUrls: [...this.formData.attachmentUrls]
      }

      if (actualWorktimeValue !== null) {
        payload.actualWorktime = actualWorktimeValue
      }

      this.isSubmitting = true

      try {
        const response = await submitTask(this.taskId, payload)

        if (response && response.code === 200) {
          uni.showToast({
            title: '任务提交成功，等待审核',
            icon: 'success'
          })
          this.triggerTaskSubmitPush(trimmedContent)
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } else {
          uni.showToast({
            title: (response && response.msg) || '提交失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('提交任务失败:', error)
        uni.showToast({
          title: error.msg || error.message || '提交失败',
          icon: 'none'
        })
      } finally {
        this.isSubmitting = false
      }
    },
    async triggerTaskSubmitPush(submissionText) {
      try {
        if (!this.task || !this.taskId || !this.projectId) {
          return
        }

        const receiversSet = new Set()

        if (this.task.creatorEmail) {
          const email = String(this.task.creatorEmail).trim()
          if (email) {
            receiversSet.add(email)
          }
        }

        if (Array.isArray(this.task.assignees)) {
          this.task.assignees.forEach(assignee => {
            const email = assignee && assignee.email ? String(assignee.email).trim() : ''
            if (email) {
              receiversSet.add(email)
            }
          })
        }

        if (receiversSet.size === 0) {
          return
        }

        let submitterEmail = ''
        let submitterName = ''
        try {
          const stored = uni.getStorageSync(config.userInfoKey)
          if (stored) {
            const user = typeof stored === 'string' ? JSON.parse(stored) : stored
            submitterEmail = user.email || ''
            submitterName = user.name || user.username || ''
          }
        } catch (e) {
          console.warn('读取提交人信息失败:', e)
        }

        const original = (submissionText && typeof submissionText === 'string')
          ? submissionText.trim().replace(/\s+/g, ' ')
          : ''

        let brief = ''
        if (original) {
          brief = original.slice(0, 20)
        }

        const actor = submitterName || submitterEmail || '有人'
        const safeTaskTitle = this.task && this.task.title ? this.task.title : ''

        const title = safeTaskTitle
          ? `${actor} 提交了任务「${safeTaskTitle}」`
          : `${actor} 提交了一个任务`

        let body = ''
        if (brief) {
          body = `提交说明：${brief}${original.length > brief.length ? '...' : ''}`
        } else if (safeTaskTitle) {
          body = `任务「${safeTaskTitle}」已提交`
        } else {
          body = '有新的任务提交'
        }

        const emails = Array.from(receiversSet)
        const cidSet = new Set()

        for (let i = 0; i < emails.length; i++) {
          const email = emails[i]
          try {
            const res = await uniId.getCidByEmail(email)
            console.log('[TaskSubmitPush] getCidByEmail 返回:', email, res)
            if (res && res.code === 0 && res.data && res.data.cid) {
              cidSet.add(res.data.cid)
            }
          } catch (err) {
            console.warn('根据邮箱查询CID失败:', email, err)
          }
        }

        const cidList = Array.from(cidSet)
        console.log('[TaskSubmitPush] 聚合到的 CID 列表:', cidList)
        if (cidList.length === 0) {
          return
        }

        const payload = {
          type: 'TASK_SUBMIT',
          taskId: this.taskId,
          projectId: this.projectId,
          submitterEmail,
          submitterName,
          descriptionBrief: brief
        }

        console.log('[TaskSubmitPush] 即将发送 Unipush 批量推送:', {
          clientIds: cidList,
          title,
          body,
          payload
        })

        await batchSendMessage(cidList, title, body, payload)
      } catch (e) {
        console.error('触发任务提交推送失败:', e)
      }
    },
    goBack() {
      uni.navigateBack()
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/static/styles/TaskSubmission.scss';
</style>

