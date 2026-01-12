<template>
  <view
    class="ai-page"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
  >
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :class="{ 'nav-bar-hidden': showHistoryPanel || showUploadPanel }" :style="{ paddingTop: statusBarHeight + 'px' }">
      <!-- 历史记录按钮 -->
      <view class="nav-action nav-action-left" @tap="openHistoryPanel">
        <image 
          class="nav-action-icon" 
          src="/static/history-icon.png" 
          mode="aspectFit"
        />
      </view>
      <text class="nav-title">AI助手</text>
      <!-- 新建对话按钮 -->
      <view class="nav-action" @tap="handleNewChat">
        <image 
          class="nav-action-icon" 
          src="/static/588da4462f8beb8c2afb9542ffcc0aed.png" 
          mode="aspectFit"
        />
      </view>
    </view>

    <!-- 聊天内容区域 -->
    <view class="chat-body" :class="{ 'panel-open': showHistoryPanel || showUploadPanel }" :style="chatBodyStyle">
      <scroll-view
        class="chat-scroll"
        :scroll-y="true"
        :scroll-with-animation="true"
        :scroll-top="scrollTop"
      >
        <!-- 开场白背景区域 -->
        <view v-if="messages.length === 0" class="welcome-section">
          <text class="welcome-title">嗨！我是你的AI助手</text>
          <text class="welcome-subtitle">我可以进行文件问答，绘制思维导图，编写代码等等。有什么问题可以来问我~</text>
        </view>
        
        <view class="chat-list" :class="{ 'has-welcome': messages.length === 0 }">
          <view
            v-for="item in messages"
            :key="item.id"
            class="chat-item"
            :class="item.role"
          >
            <view class="bubble-wrapper" :class="item.role">
              <view class="bubble" :class="item.role">
                <view v-if="item.role === 'assistant'" class="message-content">
                  <text v-for="(segment, index) in parseMessageContent(item.content)" :key="index">
                    <block v-if="segment.type === 'text'">{{ segment.content }}</block>
                    <view v-else-if="segment.type === 'code'" class="code-block">
                      <view class="code-block-header">
                        <text class="code-language">{{ segment.language || 'code' }}</text>
                        <view class="code-actions">
                          <view 
                            class="code-action-btn code-toggle-btn" 
                            @tap.stop="toggleCodeCollapse(item.id, index)"
                          >
                            <text class="code-toggle-text">{{ isCodeCollapsed(item.id, index) ? '展开' : '折叠' }}</text>
                          </view>
                          <view class="code-action-btn code-copy-btn" @tap.stop="handleCopyCode(segment.originalContent || segment.content)">
                            <image class="code-copy-icon" src="/static/icon-copy.png" mode="aspectFit" />
                          </view>
                        </view>
                      </view>
                      <view class="code-content-wrapper" :class="{ 'collapsed': isCodeCollapsed(item.id, index) }" @touchstart="handleCodeTouchStart" @touchmove="handleCodeTouchMove" @touchend="handleCodeTouchEnd">
                        <view v-if="segment.isHighlighted" class="code-content" v-html="segment.content"></view>
                        <text v-else class="code-content">{{ segment.content }}</text>
                      </view>
                    </view>
                  </text>
                </view>
                <text v-else class="bubble-text">{{ item.content }}</text>
              </view>
              <!-- 当前 AI 正在生成时的“生成中”动画 -->
              <view
                v-if="item.role === 'assistant' && isSending && currentGeneratingMessageId === item.id"
                class="generating-indicator"
              >
                <text class="generating-text">生成中</text>
                <view class="generating-dot dot1"></view>
                <view class="generating-dot dot2"></view>
                <view class="generating-dot dot3"></view>
              </view>
              <!-- AI消息操作按钮 -->
              <!-- 只在最后一条完整的AI消息显示按钮，且不在生成中 -->
              <view v-if="item.role === 'assistant' && item.content && isLastCompleteMessage(item.id)" class="message-actions">
                <view class="action-btn" @tap="handleCopy(item.content)">
                  <image class="action-icon" src="/static/icon-copy.png" mode="aspectFit" />
                </view>
                <view class="action-btn" @tap="handleRegenerate(item.id)">
                  <image class="action-icon" src="/static/icon-regenerate.png" mode="aspectFit" />
                </view>
                <view class="action-btn" :class="{ 'action-btn-active': messageFeedback[item.id] === 'like' }" @tap="handleLike(item.id)">
                  <image
                    class="action-icon"
                    :src="messageFeedback[item.id] === 'like' ? '/static/icon-liked.png' : '/static/icon-like.png'"
                    mode="aspectFit"
                  />
                </view>
                <view class="action-btn" :class="{ 'action-btn-active': messageFeedback[item.id] === 'dislike' }" @tap="handleDislike(item.id)">
                  <image
                    class="action-icon"
                    :src="messageFeedback[item.id] === 'dislike' ? '/static/icon-disliked.png' : '/static/icon-dislike.png'"
                    mode="aspectFit"
                  />
                </view>
              </view>
            </view>

            <!-- 用户头像（可选） -->
            <image
              v-if="item.role === 'user'"
              class="avatar user-avatar"
              src="/static/user-avatar.png"
              mode="aspectFill"
            />
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部输入栏 -->
    <view class="input-bar" :class="{ 'input-bar-hidden': showHistoryPanel || showUploadPanel }" :style="{ paddingBottom: safeAreaInsets.bottom + 'px' }">
      <view v-if="uploadedFiles && uploadedFiles.length" class="uploaded-strip">
        <scroll-view class="uploaded-scroll" scroll-x>
          <view class="uploaded-scroll-inner">
            <view v-for="f in uploadedFiles" :key="f.id" class="uploaded-item">
              <image class="uploaded-icon" src="/static/tabbar/up_files.png" mode="aspectFit" />
              <view class="uploaded-info">
                <text class="uploaded-name">{{ f.name }}</text>
                <text class="uploaded-meta">{{ formatFileSizeBrief(f.size) }}</text>
              </view>
              <view class="uploaded-remove" @tap.stop="removeFile(f.id)">
                <text>×</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="input-row">
        <view class="upload-btn" @tap="triggerUploadSelect">
          <image class="upload-btn-icon" src="/static/tabbar/files_up.png" mode="aspectFit" />
        </view>
        <input
          class="input"
          v-model="inputValue"
          type="text"
          :confirm-type="'send'"
          placeholder="请输入您的问题..."
          placeholder-class="input-placeholder"
          maxlength="10000"
          @confirm="handleSend"
        />
        <button
          class="send-btn"
          :class="{ disabled: !inputValue.trim() || isSending }"
          :disabled="!inputValue.trim() || isSending"
          @tap="handleSend"
        >
          发送
        </button>
      </view>
    </view>
    <view class="debug-toggle" @tap="diagVisible = !diagVisible">
      <text class="debug-text">诊断</text>
    </view>

    <view v-if="diagVisible" class="debug-panel">
      <view class="debug-row">
        <text class="debug-title">最后选择结果:</text>
        <text class="debug-content">{{ JSON.stringify(lastPickRes) }}</text>
      </view>
      <view class="debug-row">
        <text class="debug-title">探测日志（最近5条）:</text>
        <view class="debug-logs">
          <view v-for="(l, idx) in probeLogs.slice(-5)" :key="idx" class="debug-log-row">
            <text class="debug-log-time">{{ new Date(l.time).toLocaleTimeString() }}:</text>
            <text class="debug-log-msg">{{ l.type }} {{ l.path || '' }} {{ l.err ? (l.err.message || l.err) : (l.info ? JSON.stringify(l.info) : '') }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 历史对话记录组件 -->
    <HistoryChat
      :showHistoryPanel="showHistoryPanel"
      :chatHistory="chatHistory"
      @close="closeHistoryPanel"
      @load-chat="loadChatHistory"
      @clear-all="clearAllHistory"
    />

    <!-- 文件上传管理组件 -->
    <RecordFiles
      ref="recordFiles"
      :showUploadPanel="showUploadPanel"
      :uploadedFiles="uploadedFiles"
      :upload-url="uploadUrl"
      :isUploading="isUploadingFiles"
      @close="closeUploadPanel"
      @continue-upload="continueUpload"
      @remove-file="removeFile"
      @clear-all="clearAllFiles"
      @upload-success="(payload) => { /* forward for compatibility */ console.log('recordFiles upload-success', payload) }"
      @upload-error="(payload) => { console.warn('recordFiles upload-error', payload) }"
      @add-files="onAddFiles"
    />
  </view>
</template>

<script>
import hljs from 'highlight.js'
import HistoryChat from './history_chat.vue'
import RecordFiles from './record_files.vue'

import config from '../../utils/config.js'
import { upload } from '../../utils/request.js'

export default {
  name: 'ai',
  components: {
    HistoryChat,
    RecordFiles
  },
  data() {
    return {
      messages: [],
      inputValue: '',
      scrollTop: 0,
      showUploadPanel: false,
      uploadedFiles: [],
      showHistoryPanel: false,
      chatHistory: [],
      currentChatId: null,
      difyConversationId: '',
      isSending: false,
      currentStreamTask: null,
      sseBuffer: '',
      sseCurrentEvent: null,
      sseCurrentDataLines: [],
      // 消息反馈状态：like/dislike/null
      messageFeedback: {},
      // 当前正在生成回复的 AI 消息 id
      currentGeneratingMessageId: null,
      // 侧滑手势相关
      touchStartX: 0,
      touchStartY: 0,
      touchStartTime: 0,
      // 系统信息和安全区域
      systemInfo: null,
      statusBarHeight: 0,
      safeAreaInsets: { top: 0, bottom: 0 },
      // diagnostics
      diagVisible: false,
      isUploadingFiles: false,
      uploadUrl: `${config.baseURL}/zhiyan/ai/dify/files/upload`,
      lastPickRes: null,
      probeLogs: [],
      // 代码块折叠状态
      collapsedCodeBlocks: {},
      // 代码块触摸状态
      codeBlockTouchState: {
        isTouching: false,
        startX: 0,
        startY: 0,
        startTime: 0
      },
      // 全局标志，用于阻止右滑手势
      preventHistoryGesture: false
    }
  },
  onShow() {
    this.loadChatHistoryFromStorage()
    this.getSystemInfo()
    // 兼容之前版本：如果还保留老的气泡式欢迎语，进入页面时清空
    if (
      this.messages.length === 1 &&
      this.messages[0].role === 'assistant' &&
      this.messages[0].content &&
      this.messages[0].content.indexOf('您好！我是AI助手') === 0
    ) {
      this.messages = []
      this.scrollTop = 0
    }
  },
  methods: {
    abortCurrentStream() {
      try {
        if (this.currentStreamTask && typeof this.currentStreamTask.abort === 'function') {
          this.currentStreamTask.abort()
        }
      } catch (e) {
        console.error('中断流式请求失败:', e)
      } finally {
        this.currentStreamTask = null
        this.sseBuffer = ''
        this.sseCurrentEvent = null
        this.sseCurrentDataLines = []
        this.isSending = false
        this.currentGeneratingMessageId = null
      }
    },

    parseAndHandleSSEMessage(dataLines, eventType, onDelta, onConversationId) {
      if (!dataLines || dataLines.length === 0) return
      const raw = dataLines.join('').trim()
      if (!raw) return
      if (!(raw.startsWith('{') || raw.startsWith('['))) {
        return
      }
      try {
        const msg = JSON.parse(raw)
        if (msg.conversation_id || msg.conversationId) {
          const convId = msg.conversation_id || msg.conversationId
          if (onConversationId) onConversationId(convId)
        }

        const event = eventType || msg.event || msg.eventType
        const content = msg.data || msg.answer
        if ((event === 'message' || event === 'agent_message') && content) {
          if (onDelta) onDelta(String(content))
        }
      } catch (e) {
        console.error('SSE JSON解析失败:', e)
      }
    },

    startDifyChatStream({ query, conversationId, difyFileIds, onDelta, onEnd, onError }) {
      const token = uni.getStorageSync(config.tokenKey)
      if (!token) {
        throw new Error('未登录，请先登录')
      }

      const params = []
      params.push(`query=${encodeURIComponent(query)}`)
      if (conversationId) {
        params.push(`conversationId=${encodeURIComponent(conversationId)}`)
      }
      if (Array.isArray(difyFileIds) && difyFileIds.length > 0) {
        difyFileIds
          .filter(id => id && String(id).trim())
          .forEach(id => params.push(`difyFileIds=${encodeURIComponent(String(id).trim())}`))
      }

      const url = `${config.baseURL}/zhiyan/ai/dify/chat/stream?${params.join('&')}`

      this.sseBuffer = ''
      this.sseCurrentEvent = null
      this.sseCurrentDataLines = []

      const task = uni.request({
        url,
        method: 'POST',
        header: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'text',
        enableChunked: true,
        success: res => {
          if (res && res.statusCode && res.statusCode !== 200) {
            const errText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data || {})
            if (onError) onError(new Error(`HTTP ${res.statusCode}: ${errText}`))
            return
          }
          if (typeof res.data === 'string' && res.data) {
            this.handleSseChunk(res.data, onDelta)
          }
          if (onEnd) onEnd()
        },
        fail: err => {
          if (onError) onError(err)
        }
      })

      if (task && typeof task.onChunkReceived === 'function') {
        task.onChunkReceived(chunkRes => {
          try {
            const chunk = chunkRes && (chunkRes.data || chunkRes)
            if (chunk) {
              const text = typeof chunk === 'string' ? chunk : String(chunk)
              this.handleSseChunk(text, onDelta)
            }
          } catch (e) {
            if (onError) onError(e)
          }
        })
      }

      return task
    },

    handleSseChunk(chunkText, onDelta) {
      this.sseBuffer += chunkText
      const lines = this.sseBuffer.split('\n')
      this.sseBuffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = String(line || '').trim()
        if (trimmed === '') {
          if (this.sseCurrentDataLines.length > 0) {
            this.parseAndHandleSSEMessage(
              this.sseCurrentDataLines,
              this.sseCurrentEvent,
              onDelta,
              convId => {
                this.difyConversationId = convId
              }
            )
            this.sseCurrentDataLines = []
            this.sseCurrentEvent = null
          }
          continue
        }
        if (trimmed.startsWith('event:')) {
          this.sseCurrentEvent = trimmed.substring(6).trim()
          continue
        }
        if (trimmed.startsWith('data:')) {
          const data = trimmed.substring(5).trim()
          this.sseCurrentDataLines.push(data)
          if (data.endsWith('}')) {
            this.parseAndHandleSSEMessage(
              this.sseCurrentDataLines,
              this.sseCurrentEvent,
              onDelta,
              convId => {
                this.difyConversationId = convId
              }
            )
            this.sseCurrentDataLines = []
          }
        }
      }
    },

    async ensureDifyFileIds() {
      if (!this.uploadedFiles || this.uploadedFiles.length === 0) return []

      this.isUploadingFiles = true
      const difyIds = []
      try {
        for (let i = 0; i < this.uploadedFiles.length; i++) {
          const f = this.uploadedFiles[i]
          if (!f) continue

          if (f.difyFileId) {
            difyIds.push(String(f.difyFileId))
            continue
          }

          const name = f.name || `文件${i + 1}`
          const status = f.uploadStatus || ''

          if (status === 'uploading') {
            throw new Error(`文件「${name}」仍在上传中，请稍后再发送提问`)
          }
          if (status === 'error') {
            throw new Error(`文件「${name}」上传失败，请重新选择或重试上传`)
          }

          throw new Error(`文件「${name}」尚未上传完成，请稍后再试`)
        }

        return difyIds
      } finally {
        this.isUploadingFiles = false
      }
    },

    // 处理 RecordFiles 发出的新增文件事件，合并到全局 uploadedFiles
    onAddFiles(files) {
      if (!files || !files.length) return
      this.uploadedFiles = this.uploadedFiles.concat(files)
    },

    formatFileSizeBrief(bytes) {
      const n = Number(bytes || 0)
      if (!n) return '0KB'
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + 'KB'
      if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + 'MB'
      return (n / 1024 / 1024 / 1024).toFixed(1) + 'GB'
    },

    triggerUploadSelect() {
      try {
        const recordFiles = this.$refs.recordFiles
        const uploader = recordFiles && recordFiles.$refs ? recordFiles.$refs.uploader : null
        if (uploader && typeof uploader.selectFile === 'function') {
          uploader.selectFile()
          return
        }
      } catch (e) {
        console.error('[AI] triggerUploadSelect failed:', e)
      }
      this.continueUpload()
    },

    // 获取系统信息
    getSystemInfo() {
      try {
        const systemInfo = uni.getSystemInfoSync()
        this.systemInfo = systemInfo
        this.statusBarHeight = systemInfo.statusBarHeight || 0
        // 获取安全区域，uni-app会自动处理不同设备
        this.safeAreaInsets = systemInfo.safeAreaInsets || { top: 0, bottom: 0 }
        
        console.log('系统信息:', {
          statusBarHeight: this.statusBarHeight,
          safeAreaInsets: this.safeAreaInsets,
          screenHeight: systemInfo.screenHeight,
          safeArea: systemInfo.safeArea
        })
      } catch (e) {
        console.error('获取系统信息失败:', e)
        // 设置默认值
        this.statusBarHeight = 20
        this.safeAreaInsets = { top: 20, bottom: 0 }
      }
    },
    // 新建对话，清空当前消息并回到欢迎语
    handleNewChat() {
      this.abortCurrentStream()
      this.saveCurrentChat()
      this.messages = []
      this.currentChatId = null
      this.difyConversationId = ''
      this.scrollTop = 0
      this.currentGeneratingMessageId = null
      // 清空已上传的文件
      this.uploadedFiles = []
    },
    async handleSend() {
      const text = this.inputValue.trim()
      if (!text) return
      if (this.isSending) return

      // 添加用户消息
      const userMsg = {
        id: Date.now(),
        role: 'user',
        content: text
      }
      this.messages.push(userMsg)
      this.inputValue = ''

      this.$nextTick(() => {
        this.scrollTop = 999999
      })

      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: ''
      }
      const aiIndex = this.messages.length
      this.messages.push(aiMsg)

      this.abortCurrentStream()
      this.isSending = true
      this.currentGeneratingMessageId = aiMsg.id

      try {
        const difyFileIds = await this.ensureDifyFileIds()
        this.currentStreamTask = this.startDifyChatStream({
          query: text,
          conversationId: this.difyConversationId,
          difyFileIds,
          onDelta: delta => {
            this.messages[aiIndex].content += delta
            this.$nextTick(() => {
              this.scrollTop = 999999
            })
          },
          onEnd: () => {
            this.isSending = false
            this.currentStreamTask = null
            this.currentGeneratingMessageId = null
            this.$nextTick(() => {
              this.scrollTop = 999999
              this.saveCurrentChat()
            })
          },
          onError: err => {
            const msg = err && err.message ? err.message : String(err || '未知错误')
            this.messages[aiIndex].content = '抱歉，AI服务暂时不可用，请稍后再试。\n错误详情：' + msg
            this.isSending = false
            this.currentStreamTask = null
            this.currentGeneratingMessageId = null
            this.$nextTick(() => {
              this.scrollTop = 999999
              this.saveCurrentChat()
            })
          }
        })
      } catch (e) {
        const msg = e && e.message ? e.message : String(e || '未知错误')
        this.messages[aiIndex].content = '抱歉，发送消息时出现错误，请稍后再试。\n错误详情：' + msg
        this.isSending = false
        this.currentStreamTask = null
        this.currentGeneratingMessageId = null
        this.$nextTick(() => {
          this.scrollTop = 999999
          this.saveCurrentChat()
        })
      }
    },
    // 打开上传文件弹窗
    openUploadPanel() {
      this.showUploadPanel = true
    },

    // 关闭上传文件弹窗
    closeUploadPanel() {
      this.showUploadPanel = false
    },
    // 继续上传文件
    async continueUpload() {
      console.log('[AI] continueUpload called')
      const recordFiles = this.$refs.recordFiles
      if (recordFiles && recordFiles.$refs && recordFiles.$refs.uploader && typeof recordFiles.$refs.uploader.selectFile === 'function') {
        try {
          recordFiles.$refs.uploader.selectFile()
          return
        } catch (e) {
          console.error('[AI] call uploader.selectFile failed:', e)
        }
      }

      // 直接使用 uni.chooseFile，避免复杂的组件引用问题
      if (!uni || typeof uni.chooseFile !== 'function') {
        uni.showToast({
          title: '当前环境不支持文件选择',
          icon: 'none'
        })
        return
      }

      uni.chooseFile({
        count: 10,
        type: 'file',
        success: (res) => {
          console.log('[AI] chooseFile success:', res)

          const tempFiles = (res && res.tempFiles) ? res.tempFiles : []
          const tempFilePaths = (res && res.tempFilePaths) ? res.tempFilePaths : []
          const now = Date.now()

          const newFiles = tempFiles.map((file, index) => {
            const path = file.path || file.tempFilePath || file.url || tempFilePaths[index]
            const fileName = file.name || file.fileName || (path ? String(path).split(/[\\/]/).pop() : '')
            return {
              id: `${now}_${index}`,
              name: fileName || `文件${this.uploadedFiles.length + index + 1}`,
              size: file.size || 0,
              time: file.lastModified || now,
              path,
              difyFileId: ''
            }
          })

          this.uploadedFiles = this.uploadedFiles.concat(newFiles)

          uni.showToast({
            title: `已选择 ${newFiles.length} 个文件`,
            icon: 'success'
          })
        },
        fail: (err) => {
          console.error('[AI] chooseFile fail:', err)

          // 如果 uni.chooseFile 失败，尝试使用 plus API 作为备选方案
          if (typeof plus !== 'undefined') {
            console.log('[AI] trying plus API as fallback')
            this.chooseFilesAppPlus(10)
              .then(files => {
                const now = Date.now()
                const newFiles = (files || []).map((file, index) => ({
                  id: `${now}_${index}`,
                  name: file.name || `文件${this.uploadedFiles.length + index + 1}`,
                  size: file.size || 0,
                  time: file.lastModified || now,
                  path: file.path,
                  difyFileId: ''
                }))
                this.uploadedFiles = this.uploadedFiles.concat(newFiles)
                uni.showToast({
                  title: `已选择 ${newFiles.length} 个文件`,
                  icon: 'success'
                })
              })
              .catch(plusErr => {
                console.error('[AI] plus API also failed:', plusErr)
                const msg = err.errMsg || plusErr.message || '选择文件失败'
                uni.showToast({
                  title: msg,
                  icon: 'none'
                })
              })
          } else {
            const msg = err.errMsg || '选择文件失败'
            uni.showToast({
              title: msg,
              icon: 'none'
            })
          }
        }
      })
    },

    removeFile(id) {
      if (!id) return
      this.uploadedFiles = (this.uploadedFiles || []).filter(f => f && f.id !== id)
    },

    clearAllFiles() {
      this.uploadedFiles = []
    },

    chooseFilesAppPlus(limit = 1) {
      return new Promise((resolve, reject) => {
        try {
          if (typeof plus === 'undefined') {
            reject(new Error('运行环境未就绪'))
            return
          }

          const osName = plus.os.name

          if (osName === 'Android') {
            const main = plus.android.runtimeMainActivity()
            const Intent = plus.android.importClass('android.content.Intent')
            const Activity = plus.android.importClass('android.app.Activity')
            const OpenableColumns = plus.android.importClass('android.provider.OpenableColumns')

            const requestCode = 39001
            const oldOnActivityResult = main.onActivityResult

            const getMetaFromUri = (uriObj) => {
              try {
                const resolver = main.getContentResolver()
                plus.android.importClass(resolver)
                const cursor = resolver.query(uriObj, null, null, null, null)
                plus.android.importClass(cursor)
                let name = ''
                let size = 0
                if (cursor && cursor.moveToFirst()) {
                  const nameIdx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                  const sizeIdx = cursor.getColumnIndex(OpenableColumns.SIZE)
                  if (nameIdx >= 0) name = cursor.getString(nameIdx)
                  if (sizeIdx >= 0) size = cursor.getLong(sizeIdx)
                }
                cursor && cursor.close && cursor.close()
                return { name, size }
              } catch (e) {
                return { name: '', size: 0 }
              }
            }

            const copyUriToCacheFile = (uriObj, fileName) => {
              const File = plus.android.importClass('java.io.File')
              const FileOutputStream = plus.android.importClass('java.io.FileOutputStream')
              const BufferedOutputStream = plus.android.importClass('java.io.BufferedOutputStream')
              const BufferedInputStream = plus.android.importClass('java.io.BufferedInputStream')

              const resolver = main.getContentResolver()
              plus.android.importClass(resolver)
              try {
                // 请求持久化读取权限，避免部分URI在后续读取时被拒绝
                try {
                  resolver.takePersistableUriPermission && resolver.takePersistableUriPermission(uriObj, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                } catch (permErr) {
                  // 部分系统/权限模型下此调用可能失败，记录后继续尝试打开流
                  console.warn('[AI] takePersistableUriPermission failed', permErr)
                }
              } catch (e) {}
              const inputStream = resolver.openInputStream(uriObj)
              plus.android.importClass(inputStream)

              const cacheDir = main.getCacheDir().getAbsolutePath()
              const safeName = (fileName || `upload_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_')
              const outFile = new File(cacheDir, `${Date.now()}_${safeName}`)

              const fos = new FileOutputStream(outFile)
              const bos = new BufferedOutputStream(fos)
              const bis = new BufferedInputStream(inputStream)

              const buffer = plus.android.newObject('byte[]', 1024 * 64)
              let len = bis.read(buffer)
              while (len && len > 0) {
                bos.write(buffer, 0, len)
                len = bis.read(buffer)
              }
              bos.flush()
              bos.close()
              bis.close()
              return outFile.getAbsolutePath()
            }

            main.onActivityResult = function (req, res, data) {
              if (req !== requestCode) {
                if (oldOnActivityResult) return oldOnActivityResult.apply(this, arguments)
                return
              }
              try {
                if (res !== Activity.RESULT_OK) {
                  reject(new Error('已取消'))
                  return
                }
                if (!data) {
                  reject(new Error('未选择文件'))
                  return
                }

                const results = []
                const clipData = data.getClipData && data.getClipData()
                if (clipData) {
                  const count = Math.min(clipData.getItemCount(), Number(limit) || 1)
                  for (let i = 0; i < count; i++) {
                    const item = clipData.getItemAt(i)
                    const uriObj = item.getUri()
                    const meta = uriObj ? getMetaFromUri(uriObj) : { name: '', size: 0 }
                    const localPath = uriObj ? copyUriToCacheFile(uriObj, meta.name) : ''
                    results.push({ path: localPath, name: meta.name, size: meta.size })
                  }
                } else {
                  const uriObj = data.getData && data.getData()
                  const meta = uriObj ? getMetaFromUri(uriObj) : { name: '', size: 0 }
                  const localPath = uriObj ? copyUriToCacheFile(uriObj, meta.name) : ''
                  if (!localPath) {
                    reject(new Error('未获取到文件路径'))
                    return
                  }
                  results.push({ path: localPath, name: meta.name, size: meta.size })
                }

                resolve(results)
              } catch (e) {
                reject(e)
              } finally {
                main.onActivityResult = oldOnActivityResult
              }
            }

            const intent = new Intent(Intent.ACTION_GET_CONTENT)
            intent.setType('*/*')
            intent.addCategory(Intent.CATEGORY_OPENABLE)
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            intent.addFlags(Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION)
            intent.addFlags(Intent.FLAG_GRANT_PREFIX_URI_PERMISSION)
            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
            main.startActivityForResult(Intent.createChooser(intent, '选择文件'), requestCode)
            return
          }

          if (osName === 'iOS') {
            const UIDocumentPickerViewController = plus.ios.importClass('UIDocumentPickerViewController')
            const UIApplication = plus.ios.importClass('UIApplication')

            const pick = UIDocumentPickerViewController.alloc().init()
            pick.allowsMultipleSelection = true

            const delegate = plus.ios.implements('UIDocumentPickerDelegate', {
              documentPicker_didPickDocumentsAtURLs: function (controller, urls) {
                try {
                  const arr = []
                  const count = Math.min(urls.count(), Number(limit) || 1)
                  for (let i = 0; i < count; i++) {
                    const url = urls.objectAtIndex(i)
                    const path = url.path().toString()
                    const name = url.lastPathComponent().toString()
                    arr.push({ path, name, size: 0 })
                  }
                  resolve(arr)
                } catch (e) {
                  reject(e)
                }
              },
              documentPickerWasCancelled: function () {
                reject(new Error('已取消'))
              }
            })

            pick.delegate = delegate
            const app = UIApplication.sharedApplication()
            const rootVC = app.keyWindow.rootViewController
            rootVC.presentViewController_animated_completion(pick, true, null)
            return
          }

          reject(new Error('未知系统平台'))
        } catch (e) {
          reject(e)
        }
      })
    },

    // 格式化日期
    formatDate(time) {
      if (!time) return ''
      const d = new Date(time)
      const y = d.getFullYear()
      const m = `${d.getMonth() + 1}`.padStart(2, '0')
      const day = `${d.getDate()}`.padStart(2, '0')
      return `${y}-${m}-${day}`
    },
    // 打开历史对话弹窗
    openHistoryPanel() {
      this.showHistoryPanel = true
    },
    // 关闭历史对话弹窗
    closeHistoryPanel() {
      this.showHistoryPanel = false
    },
    // 从存储中加载历史对话
    loadChatHistoryFromStorage() {
      try {
        const history = uni.getStorageSync('chatHistory')
        if (history) {
          this.chatHistory = JSON.parse(history)
        }
      } catch (e) {
        console.error('加载历史对话失败:', e)
        this.chatHistory = []
      }
    },
    // 保存历史对话到存储
    saveChatHistoryToStorage() {
      try {
        uni.setStorageSync('chatHistory', JSON.stringify(this.chatHistory))
      } catch (e) {
        console.error('保存历史对话失败:', e)
      }
    },
    // 保存当前对话
    saveCurrentChat() {
      if (this.messages.length === 0) return
      
      const chatId = this.currentChatId || `chat_${Date.now()}`
      const firstUserMessage = this.messages.find(msg => msg.role === 'user')
      const title = firstUserMessage ? 
        firstUserMessage.content.substring(0, 20) + (firstUserMessage.content.length > 20 ? '...' : '') : 
        '新对话'
      
      const chatData = {
        id: chatId,
        title: title,
        messages: this.messages,
        difyConversationId: this.difyConversationId,
        messageCount: this.messages.length,
        lastUpdate: Date.now()
      }
      
      const existingIndex = this.chatHistory.findIndex(chat => chat.id === chatId)
      if (existingIndex >= 0) {
        this.chatHistory[existingIndex] = chatData
      } else {
        this.chatHistory.unshift(chatData)
      }
      
      // 只保留最近50条对话记录
      if (this.chatHistory.length > 50) {
        this.chatHistory = this.chatHistory.slice(0, 50)
      }
      
      this.saveChatHistoryToStorage()
      this.currentChatId = chatId
    },
    // 加载历史对话
    loadChatHistory(chat) {
      this.saveCurrentChat()
      this.messages = [...chat.messages]
      this.currentChatId = chat.id
      this.difyConversationId = chat.difyConversationId || ''
      this.closeHistoryPanel()
      
      this.$nextTick(() => {
        this.scrollTop = 999999
      })
    },
    // 清空所有历史对话
    clearAllHistory() {
      this.chatHistory = []
      this.saveChatHistoryToStorage()
      this.currentChatId = null
    },
    // 记录手势起点
    handleTouchStart(e) {
      const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0])
      if (!touch) return
      this.touchStartX = touch.clientX
      this.touchStartY = touch.clientY
      this.touchStartTime = Date.now()
    },
    // 监听右滑打开历史侧边栏
    handleTouchEnd(e) {
      if (this.showHistoryPanel) return
      
      // 检查全局标志，如果阻止历史手势则直接返回
      if (this.preventHistoryGesture) {
        return;
      }
      
      const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
      if (!touch) return

      const deltaX = touch.clientX - this.touchStartX
      const deltaY = touch.clientY - this.touchStartY
      const duration = Date.now() - this.touchStartTime

      const isFastEnough = duration < 500
      const isHorizontalSwipe = Math.abs(deltaX) > 80 && Math.abs(deltaY) < 50

      // 在屏幕任意位置，快速右滑且横向位移明显时触发
      if (isFastEnough && isHorizontalSwipe && deltaX > 0) {
        this.openHistoryPanel()
      }
    },
    // 复制消息内容
    handleCopy(content) {
      // 如果是AI消息，检查是否为Markdown格式，如果是则复制原始内容，否则复制处理后的内容
      const dataToCopy = content
      uni.setClipboardData({
        data: dataToCopy,
        success: () => {
          uni.showToast({
            title: '已复制',
            icon: 'success'
          })
        }
      })
    },
    // 重新生成消息
    handleRegenerate(messageId) {
      const messageIndex = this.messages.findIndex(msg => msg.id === messageId)
      if (messageIndex === -1) return
      
      // 找到对应的用户消息
      let userMessageIndex = -1
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (this.messages[i].role === 'user') {
          userMessageIndex = i
          break
        }
      }
      
      if (userMessageIndex === -1) {
        uni.showToast({
          title: '无法找到对应的用户消息',
          icon: 'none'
        })
        return
      }
      
      // 删除当前AI消息及之后的所有消息
      this.messages = this.messages.slice(0, messageIndex)
      
      // 重新发送用户消息
      const userMessage = this.messages[userMessageIndex]
      this.inputValue = userMessage.content
      this.$nextTick(() => {
        this.handleSend()
      })
    },
    // 点赞
    handleLike(messageId) {
      // 如果已经点过赞，则取消点赞；否则设置为点赞，并取消点踩
      if (this.messageFeedback[messageId] === 'like') {
        this.$set(this.messageFeedback, messageId, null)
      } else {
        this.$set(this.messageFeedback, messageId, 'like')
      }
    },
    // 点踩
    handleDislike(messageId) {
      // 如果已经点过踩，则取消点踩；否则设置为点踩，并取消点赞
      if (this.messageFeedback[messageId] === 'dislike') {
        this.$set(this.messageFeedback, messageId, null)
      } else {
        this.$set(this.messageFeedback, messageId, 'dislike')
      }
    },
    // 判断是否是最后一条完整的AI消息（不在生成中）
    isLastCompleteMessage(messageId) {
      if (!this.messages || this.messages.length === 0) return false
      
      // 找到最后一条AI消息
      let lastAssistantIndex = -1
      for (let i = this.messages.length - 1; i >= 0; i--) {
        if (this.messages[i].role === 'assistant') {
          lastAssistantIndex = i
          break
        }
      }
      
      if (lastAssistantIndex === -1) return false
      
      const lastAssistant = this.messages[lastAssistantIndex]
      // 必须是最后一条AI消息，且内容不为空，且不在生成中
      return lastAssistant.id === messageId && 
             lastAssistant.content && 
             lastAssistant.content.trim() !== '' &&
             !this.isSending
    },
    
    // 检测文本是否为Markdown格式
    isMarkdownFormat(text) {
      if (!text || typeof text !== 'string') return false
      
      // 检测常见的Markdown标记
      const markdownPatterns = [
        /^#{1,6}\s+/m,           // 标题 # ## ###
        /^\*\s+.*/m,              // 无序列表
        /^\d+\.\s+.*/m,           // 有序列表
        /\*\*.*?\*\*/,            // 粗体 **text**
        /\*.*?\*/,                // 斜体 *text*
        /```[\s\S]*?```/,          // 代码块
        /`.*?`/,                  // 行内代码
        /^\[.*?\]:\s+.*$/m,       // 链接引用
        /\[.*?\]\(.*?\)/,         // 链接 [text](url)
        /^\|.*\|.*\|$/m,          // 表格
        /^\s*[-*_]{3,}\s*$/m,     // 分隔线 ---
      ]
      
      // 如果匹配任何一个Markdown模式，则认为是Markdown格式
      return markdownPatterns.some(pattern => pattern.test(text))
    },
    
    // 将Markdown转换为普通文本
    convertMarkdownToPlainText(markdownText) {
      if (!markdownText || typeof markdownText !== 'string') return markdownText
      
      let plainText = markdownText
      
      // 处理代码块 ```code``` -> code
      plainText = plainText.replace(/```[\s\S]*?```/g, (match) => {
        return match.replace(/```/g, '').trim()
      })
      
      // 处理行内代码 `code` -> code
      plainText = plainText.replace(/`([^`]+)`/g, '$1')
      
      // 处理粗体 **text** -> text
      plainText = plainText.replace(/\*\*([^*]+)\*\*/g, '$1')
      
      // 处理斜体 *text* -> text
      plainText = plainText.replace(/\*([^*]+)\*/g, '$1')
      
      // 处理标题 # Header -> Header
      plainText = plainText.replace(/^#{1,6}\s+(.+)$/gm, '$1')
      
      // 处理无序列表 * item -> item
      plainText = plainText.replace(/^\*\s+(.+)$/gm, '$1')
      
      // 处理有序列表 1. item -> item
      plainText = plainText.replace(/^\d+\.\s+(.+)$/gm, '$1')
      
      // 处理链接 [text](url) -> text (url)
      plainText = plainText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
      
      // 处理表格 - 移除表格标记，只保留内容
      plainText = plainText.replace(/^\|(.+)\|$/gm, (match, content) => {
        return content.split('|').map(cell => cell.trim()).join(' ')
      })
      
      // 移除分隔线
      plainText = plainText.replace(/^\s*[-*_]{3,}\s*$/gm, '')
      
      // 处理引用 > text -> text
      plainText = plainText.replace(/^>\s+(.+)$/gm, '$1')
      
      // 合并多个连续的空行
      plainText = plainText.replace(/\n{3,}/g, '\n\n')
      
      return plainText.trim()
    },
    
    // 处理消息内容，如果是Markdown则转换为普通文本
    processMessageContent(content) {
      if (this.isMarkdownFormat(content)) {
        return this.convertMarkdownToPlainText(content)
      }
      return content
    },
    
    // 解析消息内容，区分文本和代码块
    parseMessageContent(content) {
      if (!content || typeof content !== 'string') return [{ type: 'text', content }]
      
      const segments = []
      // 匹配代码块 ```language\ncode\n```
      const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
      let lastIndex = 0
      let match
      
      while ((match = codeBlockRegex.exec(content)) !== null) {
        // 添加代码块之前的文本
        if (match.index > lastIndex) {
          const textContent = content.substring(lastIndex, match.index)
          if (textContent.trim()) {
            segments.push({ type: 'text', content: this.processMessageContent(textContent) })
          }
        }
        
        // 添加代码块
        const language = match[1] || ''
        const codeContent = match[2].trim()
        if (codeContent) {
          // 使用highlight.js高亮代码
          let highlightedContent = codeContent
          let isHighlighted = false

          try {
            if (language && hljs.getLanguage(language)) {
              // 使用指定语言进行高亮
              highlightedContent = hljs.highlight(codeContent, { language }).value
              isHighlighted = true
            } else if (!language) {
              // 如果没有语言标识，尝试自动检测
              const autoResult = hljs.highlightAuto(codeContent)
              if (autoResult && autoResult.value) {
                highlightedContent = autoResult.value
                isHighlighted = true
              }
            }
          } catch (e) {
            console.warn('代码高亮失败:', e)
            highlightedContent = codeContent
            isHighlighted = false
          }

          segments.push({
            type: 'code',
            content: highlightedContent,
            originalContent: codeContent, // 保留原始内容用于复制
            language,
            isHighlighted
          })
        }
        
        lastIndex = codeBlockRegex.lastIndex
      }
      
      // 添加最后的文本
      if (lastIndex < content.length) {
        const textContent = content.substring(lastIndex)
        if (textContent.trim()) {
          segments.push({ type: 'text', content: this.processMessageContent(textContent) })
        }
      }
      
      // 如果没有找到代码块，直接返回处理后的文本
      if (segments.length === 0) {
        return [{ type: 'text', content: this.processMessageContent(content) }]
      }
      
      return segments
    },
    
    // 复制代码块内容
    handleCopyCode(codeContent) {
      uni.setClipboardData({
        data: codeContent,
        success: () => {
          uni.showToast({
            title: '代码已复制',
            icon: 'success'
          })
        }
      })
    },
    
    // 切换代码块折叠状态
    toggleCodeCollapse(messageId, codeBlockIndex) {
      const key = `${messageId}_${codeBlockIndex}`;
      this.$set(this.collapsedCodeBlocks, key, !this.collapsedCodeBlocks[key]);
    },
    
    // 检查代码块是否处于折叠状态
    isCodeCollapsed(messageId, codeBlockIndex) {
      const key = `${messageId}_${codeBlockIndex}`;
      return this.collapsedCodeBlocks[key] === true;
    },
    
    // 处理代码块触摸开始事件
    handleCodeTouchStart(e) {
      // 记录触摸开始状态
      this.codeBlockTouchState.isTouching = true;
      this.codeBlockTouchState.startTime = Date.now();
      // 设置全局标志，阻止右滑手势
      this.preventHistoryGesture = true;
      
      const touch = e.touches && e.touches[0];
      if (touch) {
        this.codeBlockTouchState.startX = touch.clientX;
        this.codeBlockTouchState.startY = touch.clientY;
      }
      
      // 阻止事件冒泡
      e.stopPropagation && e.stopPropagation();
    },
    
    // 处理代码块触摸移动事件
    handleCodeTouchMove(e) {
      if (!this.codeBlockTouchState.isTouching) return;
      
      const touch = e.touches && e.touches[0];
      if (!touch) return;
      
      const deltaX = touch.clientX - this.codeBlockTouchState.startX;
      const deltaY = Math.abs(touch.clientY - this.codeBlockTouchState.startY);
      
      // 如果是水平滑动且垂直移动很小，则阻止事件冒泡
      if (Math.abs(deltaX) > 10 && deltaY < 30) {
        e.stopPropagation && e.stopPropagation();
      }
    },
    
    // 处理代码块触摸结束事件
    handleCodeTouchEnd(e) {
      // 重置触摸状态
      this.codeBlockTouchState.isTouching = false;
      this.codeBlockTouchState.startX = 0;
      this.codeBlockTouchState.startY = 0;
      this.codeBlockTouchState.startTime = 0;
      
      // 延迟重置全局标志，给手势处理留出时间
      setTimeout(() => {
        this.preventHistoryGesture = false;
      }, 700);
      
      // 阻止事件冒泡
      e.stopPropagation && e.stopPropagation();
    }
  },
  // 诊断面板样式与触发按钮
  computed: {
    // 计算聊天内容区域的样式
    chatBodyStyle() {
      if (this.showHistoryPanel || this.showUploadPanel) {
        return {
          top: '0px',
          bottom: '0px'
        }
      }
      
      // 动态计算导航栏的实际高度
      // 在uni-app中，我们可以使用像素单位，因为系统信息返回的是像素
      const navHeight = this.statusBarHeight + 44 // 导航栏内容高度44px
      const baseInputHeight = 65
      const extraFilesHeight = this.uploadedFiles && this.uploadedFiles.length ? 60 : 0
      const inputHeight = baseInputHeight + extraFilesHeight + (this.safeAreaInsets.bottom || 0)
      
      return {
        top: navHeight + 'px',
        bottom: inputHeight + 'px'
      }
    }
  }
}
</script>

<style scoped lang="scss">
@import '@/static/styles/ai.scss';
</style>