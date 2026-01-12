<template>
  <view v-show="showUploadPanel" class="upload-mask">
    <view class="upload-panel" @tap.stop>
      <!-- 头部 -->
      <view class="upload-header">
        <text class="upload-title">已上传文件</text>
        <text class="upload-close" @tap="closeUploadPanel">✕</text>
      </view>

      <!-- 文件列表 -->
      <scroll-view scroll-y class="upload-list-wrapper">
        <view
          v-for="file in uploadedFiles"
          :key="file.id"
          class="upload-item"
        >
          <view class="upload-item-icon">
            <text v-if="file.difyFileId" class="upload-status uploaded">✓</text>
            <text v-else class="upload-status pending">○</text>
          </view>
          <view class="upload-item-info">
            <text class="upload-item-name">{{ file.name }}</text>
            <text class="upload-item-meta">
              {{ formatFileSize(file.size) }} · {{ formatDate(file.time) }}
              <text v-if="file.difyFileId" class="upload-meta-status uploaded">已上传</text>
              <text v-else class="upload-meta-status pending">待上传</text>
            </text>

            <!-- 上传进度条 -->
            <view v-if="file.progress != null" class="upload-progress-row">
              <view class="progress-track">
                <view class="progress-fill-local" :style="{ width: (file.progress || 0) + '%' }"></view>
              </view>
              <text class="progress-text">{{ file.progress || 0 }}%</text>
            </view>
            <text v-if="file.errorMessage" class="upload-error">{{ file.errorMessage }}</text>
          </view>
          <text
            class="upload-item-delete"
            @tap.stop="removeFile(file.id)"
          >
            🗑
          </text>
        </view>

        <view v-if="uploadedFiles.length === 0" class="upload-empty">
          <text class="upload-empty-text">暂未上传文件，点击下方继续上传</text>
        </view>
      </scroll-view>

      <!-- 嵌入上传组件（使用你实现的 upload.vue） -->
      <view style="margin-top: 20rpx;">
        <AppFileUploader
          ref="uploader"
          :upload-url="uploadUrl"
          :form-data="{ type: 'document' }"
          :max-count="10"
          :max-size="200"
          :auto-upload="true"
          :show-select-button="false"
          @upload-success="onUploadSuccess"
          @upload-error="onUploadError"
          @upload-progress="onUploadProgress"
          @file-remove="onUploaderFileRemove"
          @files-selected="onUploaderFilesSelected"
        />
      </view>

      <!-- 底部按钮 -->
      <view class="upload-footer">
        <button
          class="upload-btn upload-btn-secondary"
          @tap="continueUpload"
          :disabled="isUploading"
          :class="{ disabled: isUploading }"
        >
          {{ isUploading ? '上传中...' : '继续上传' }}
        </button>
        <button
          class="upload-btn upload-btn-danger"
          :disabled="!uploadedFiles.length"
          :class="{ disabled: !uploadedFiles.length }"
          @tap="clearAllFiles"
        >
          清空全部
        </button>
      </view>
    </view>
  </view>
</template>

<script>
import AppFileUploader from './upload.vue'
import config from '../../utils/config.js'

export default {
  name: 'RecordFiles',
  components: {
    AppFileUploader
  },
  props: {
    showUploadPanel: {
      type: Boolean,
      default: false
    },
    uploadedFiles: {
      type: Array,
      default: () => []
    },
    isUploading: {
      type: Boolean,
      default: false
    }
    ,
    uploadUrl: {
      type: String,
      default: 'https://zhiyan/ai/dify/files/upload'
    }
  },
  methods: {
    // 关闭上传文件弹窗
    closeUploadPanel() {
      this.$emit('close')
    },
    // 继续上传文件（保留向后兼容）
    continueUpload() {
      console.log('[RecordFiles] continueUpload tapped, emit continue-upload')
      this.$emit('continue-upload')
    },
    // 删除单个文件（来自列表删除）
    removeFile(id) {
      this.$emit('remove-file', id)
    },
    // 清空全部文件
    clearAllFiles() {
      if (!this.uploadedFiles.length) return
      uni.showModal({
        title: '清空全部文件',
        content: '确定要清空所有已上传的文件吗？',
        confirmText: '清空全部',
        confirmColor: '#f87171',
        success: res => {
          if (res.confirm) {
            this.$emit('clear-all')
          }
        }
      })
    },
    // 处理 upload.vue 上传成功事件
    onUploadSuccess({ file, response, index }) {
      const match = this.uploadedFiles.find(f => f.name === file.name && (f.size === file.size || !file.size))
      if (match) {
        match.difyFileId = (response && (response.fileId || response.id)) ? String(response.fileId || response.id) : match.difyFileId || ''
        match.progress = 100
        match.uploadStatus = 'success'
        match.errorMessage = ''
      }
      this.$emit('continue-upload-success', { file: match || file, response, index })
      this.$emit('upload-success', { file: match || file, response, index })
    },
    // 处理 upload.vue 上传失败事件
    onUploadError(payload) {
      const f = payload && payload.file
      if (f) {
        const match = this.uploadedFiles.find(x => x.name === f.name && (x.size === f.size || !f.size))
        if (match) {
          match.uploadStatus = 'error'
          match.errorMessage = payload.error || (payload.errorMsg || '上传失败')
        }
      }
      this.$emit('upload-error', payload)
    },
    // 处理 upload.vue 进度事件
    onUploadProgress({ file, progress, index }) {
      const match = this.uploadedFiles.find(f => f.name === file.name && (f.size === file.size || !file.size))
      if (match) {
        match.progress = progress
        match.uploadStatus = 'uploading'
      }
      this.$emit('upload-progress', { file: match || file, progress, index })
    },
    // upload.vue 内部删除事件 -> 转发为 remove-file
    onUploaderFileRemove(file) {
      const match = this.uploadedFiles.find(f => f.name === file.name && (f.size === file.size || !file.size))
      if (match) {
        this.$emit('remove-file', match.id)
      } else {
        this.$emit('file-remove', file)
      }
    },
    // 处理 uploader 选择但尚未上传的文件：通知父组件添加到 uploadedFiles 列表
    onUploaderFilesSelected(newFiles) {
      console.log('[RecordFiles] onUploaderFilesSelected', newFiles)
      if (!newFiles || !newFiles.length) return
      const now = Date.now()
      const mapped = newFiles.map((f, idx) => ({
        id: `${now}_${idx}_${Math.floor(Math.random() * 10000)}`,
        name: f.name || `文件${idx + 1}`,
        size: f.size || 0,
        time: now,
        path: f.path || f.tempFilePath || '',
        difyFileId: '',
        uploadStatus: 'pending',
        progress: 0,
        errorMessage: ''
      }))
      // 将选中文件交由上层管理
      this.$emit('add-files', mapped)
    },
    // 格式化文件大小
    formatFileSize(size) {
      if (!size) return '0MB'
      const mb = size / 1024 / 1024
      return `${mb.toFixed(1)}MB`
    },
    // 格式化日期
    formatDate(time) {
      if (!time) return ''
      const d = new Date(time)
      const y = d.getFullYear()
      const m = `${d.getMonth() + 1}`.padStart(2, '0')
      const day = `${d.getDate()}`.padStart(2, '0')
      return `${y}-${m}-${day}`
    }
  },
 
}
</script>

<style scoped lang="scss">
@import '@/static/styles/record_files.scss';
</style>