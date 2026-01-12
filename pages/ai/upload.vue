<template>
  <view class="upload-container">
    <!-- 已选择文件列表 -->
    <view class="file-list" v-if="fileList.length > 0">
      <view
        class="file-item"
        v-for="(file, index) in fileList"
        :key="file.id"
      >
        <!-- 文件信息 -->
        <view class="file-info">
          <view class="file-icon">
            <text class="icon">{{ getFileIcon(file.name) }}</text>
          </view>
          <view class="file-details">
            <text class="file-name">{{ file.name }}</text>
            <text class="file-size">{{ formatFileSize(file.size) }}</text>

            <!-- 上传进度 -->
            <view v-if="file.status === 'uploading'" class="upload-progress">
              <view class="progress-bar">
                <view
                  class="progress-fill"
                  :style="{ width: file.progress + '%' }"
                ></view>
              </view>
              <text class="progress-text">{{ file.progress }}%</text>
            </view>

            <!-- 状态提示 -->
            <text v-if="file.status === 'success'" class="status-success">✓ 上传成功</text>
            <text v-if="file.status === 'error'" class="status-error">× {{ file.errorMsg }}</text>
            <text v-if="file.status === 'pending'" class="status-pending">等待上传</text>
          </view>
        </view>

        <!-- 操作按钮 -->
        <view class="file-actions">
          <view
            v-if="file.status === 'error'"
            class="action-btn retry"
            @click="retryUpload(file)"
          >
            重试
          </view>
          <view
            class="action-btn delete"
            @click="removeFile(index)"
          >
            删除
          </view>
        </view>
      </view>
    </view>

    <!-- 选择文件按钮（包含上传/清空操作，避免重复按钮） -->
    <view
      v-if="showSelectButton"
      class="upload-btn"
      @click="selectFile"
      :class="{ 'disabled': fileList.length >= maxCount }"
    >
      <text class="btn-icon">+</text>
      <text class="btn-text">选择文件</text>
      <text class="btn-subtext">支持PDF、Word、Excel等格式</text>

      <!-- 当非自动上传并且已有文件时，在选择区域内显示查看与清空操作（上传在底部保留） -->
      <view v-if="fileList.length > 0" class="upload-controls">
        <button
          class="submit-btn preview-btn"
          @click.stop="previewSelected"
          :disabled="!hasImageFiles"
        >
          查看图片
        </button>
        <button
          class="submit-btn clear-btn"
          @click.stop="clearAll"
        >
          清空全部
        </button>
      </view>
    </view>

    <!-- 底部上传按钮（保留为主上传入口，仅在非自动上传时显示） -->
    <view v-if="!autoUpload && fileList.length > 0" class="upload-action">
      <button
        class="submit-btn"
        @click="startUpload"
        :disabled="uploading"
      >
        {{ uploading ? '上传中...' : '开始上传' }}
      </button>
    </view>
    
    <!-- HBuilder 预览模式下的模拟添加文件（仅用于调试） -->
    <view v-if="isHBuilderPreview && showSelectButton" class="mock-add-file" style="margin-top:20rpx;">
      <input class="mock-input" v-model="mockFileName" placeholder="输入模拟文件名（例如 test.pdf）" />
      <button class="submit-btn" @click.stop="addMockFile" :disabled="!mockFileName">添加测试文件</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'AppFileUploader',
  props: {
    // 上传接口地址
    uploadUrl: {
      type: String,
      required: true
    },
    // 最大文件数量
    maxCount: {
      type: Number,
      default: 5
    },
    // 单个文件大小限制（MB）
    maxSize: {
      type: Number,
      default: 50
    },
    // 是否自动上传
    autoUpload: {
      type: Boolean,
      default: true
    },
    // 额外的表单数据
    formData: {
      type: Object,
      default: () => ({})
    },
    // 请求头
    headers: {
      type: Object,
      default: () => ({})
    }
    ,
    // multipart 文件字段名，默认 file；如果是 /upload/batch 接口，默认使用 files
    fileFieldName: {
      type: String,
      default: 'file'
    }
    ,
    // 是否显示选择文件按钮（在父组件中可隐藏，仅通过外部按钮触发选择）
    showSelectButton: {
      type: Boolean,
      default: true
    }
    ,
    // 在 HBuilder 预览时是否优先调用原生文件选择（true = 调用 plus 的原生选择器）
    preferNativeInPreview: {
      type: Boolean,
      default: true
    }
  },
  
  mounted() {
    // 检测是否在 HBuilder 容器，若是则允许显示模拟添加文件的调试入口（仅预览用）
    try {
      if (typeof plus !== 'undefined' && plus.android && typeof plus.android.runtimeMainActivity === 'function') {
        const pkg = plus.android.runtimeMainActivity().getPackageName()
        this.isHBuilderPreview = !!(pkg && String(pkg).indexOf('io.dcloud.HBuilder') >= 0)
      }
    } catch (e) {
      // ignore
    }
  },
  data() {
    return {
      fileList: [],        // 文件列表
      uploading: false,    // 是否正在上传
      uploadTasks: new Map(), // 存储上传任务，用于取消
      isHBuilderPreview: false,
      mockFileName: ''
    }
  },
  computed: {
    // 是否包含可预览的图片文件
    hasImageFiles() {
      return this.fileList.some(file => {
        if (!file) return false
        const t = (file.type || '').toLowerCase()
        if (t.startsWith('image/')) return true
        return /\.(jpe?g|png|gif|bmp)$/i.test(file.name || '')
      })
    }
  },
  methods: {
    // 核心方法1：选择文件
    async selectFile() {
      try {
        console.log('[Uploader] selectFile called, showSelectButton=', this.showSelectButton)

        // 显示加载提示
        uni.showLoading({
          title: '正在启动文件选择器...',
          mask: true
        })
        let res;

        // 检查uni.chooseFile是否可用
        const canChooseFile = uni && typeof uni.chooseFile === 'function';
        console.log('[Uploader] canChooseFile=', !!canChooseFile, 'plus=', typeof plus !== 'undefined');

        if (canChooseFile) {
          console.log('[Uploader] calling uni.chooseFile...')
          // 使用uni.chooseFile
          res = await uni.chooseFile({
            count: this.maxCount - this.fileList.length, // 还能选择的文件数
            type: 'all', // 选择所有类型
            extension: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.jpg', '.png', '.zip']
          });
          console.log('[Uploader] uni.chooseFile result:', res)
        } else if (typeof plus !== 'undefined') {
          console.log('[Uploader] plus available - checking container')
          // HBuilder 容器内的 plus API 回调经常不可靠，优先使用图片选择以便在预览中测试
          try {
            const pkg = (plus.android && plus.android.runtimeMainActivity && typeof plus.android.runtimeMainActivity === 'function')
              ? plus.android.runtimeMainActivity().getPackageName()
              : ''
            if (pkg && String(pkg).indexOf('io.dcloud.HBuilder') >= 0) {
              console.log('[Uploader] detected HBuilder container')
              if (this.preferNativeInPreview) {
                console.log('[Uploader] preferNativeInPreview=true, trying chooseFilesAppPlus()')
                try {
                  res = await this.chooseFilesAppPlus(this.maxCount - this.fileList.length);
                  console.log('[Uploader] chooseFilesAppPlus result:', res)
                } catch (plusError) {
                  console.warn('[Uploader] chooseFilesAppPlus failed in HBuilder, falling back to uni.chooseImage', plusError)
                  // 在HBuilder预览模式下，如果plus API失败，回退到uni.chooseImage
                  const imgRes = await uni.chooseImage({
                    count: this.maxCount - this.fileList.length,
                    sizeType: ['original', 'compressed'],
                    sourceType: ['album', 'camera']
                  })
                  // 转换图片选择结果为统一格式
                  res = {
                    tempFiles: (imgRes && imgRes.tempFiles) ? imgRes.tempFiles.map(f => ({
                      name: f.path.split('/').pop() || f.path.split('\\\\').pop(),
                      path: f.path,
                      size: f.size || 0,
                      type: 'image/' + (f.path.split('.').pop() || '').toLowerCase()
                    })) : []
                  }
                  console.log('[Uploader] uni.chooseImage fallback result normalized:', res)
                }
              } else {
                console.log('[Uploader] preferNativeInPreview=false, using uni.chooseImage for preview')
                const imgRes = await uni.chooseImage({
                  count: this.maxCount - this.fileList.length,
                  sizeType: ['original', 'compressed'],
                  sourceType: ['album', 'camera']
                })
                // 转换图片选择结果为统一格式
                res = {
                  tempFiles: (imgRes && imgRes.tempFiles) ? imgRes.tempFiles.map(f => ({
                    name: f.path.split('/').pop() || f.path.split('\\\\').pop(),
                    path: f.path,
                    size: f.size || 0,
                    type: 'image/' + (f.path.split('.').pop() || '').toLowerCase()
                  })) : []
                }
                console.log('[Uploader] uni.chooseImage result normalized:', res)
              }
            } else {
              console.log('[Uploader] using chooseFilesAppPlus for production app')
              // 降级到plus API（仅App端）
              res = await this.chooseFilesAppPlus(this.maxCount - this.fileList.length);
              console.log('[Uploader] chooseFilesAppPlus result:', res)
            }
          } catch (e) {
            console.warn('[Uploader] plus fallback error, trying chooseFilesAppPlus', e)
            try {
              res = await this.chooseFilesAppPlus(this.maxCount - this.fileList.length);
              console.log('[Uploader] chooseFilesAppPlus result after error:', res)
            } catch (finalError) {
              console.error('[Uploader] all plus methods failed, showing error', finalError)
              uni.showToast({
                title: '文件选择失败，请重试',
                icon: 'none',
                duration: 2000
              })
              return
            }
          }
        } else {
          // 不支持的文件选择环境
          console.log('[Uploader] file selection not supported here')
          uni.showModal({
            title: '提示',
            content: '当前环境不支持文件选择功能，请使用其他方式上传文件',
            showCancel: false
          });
          return;
        }

        // normalize results: support tempFiles or tempFilePaths
        let normalizedTempFiles = []
        if (res) {
          if (Array.isArray(res.tempFiles) && res.tempFiles.length > 0) {
            normalizedTempFiles = res.tempFiles
          } else if (Array.isArray(res.tempFilePaths) && res.tempFilePaths.length > 0) {
            normalizedTempFiles = res.tempFilePaths.map(p => {
              const name = (p || '').split(/[\\/]/).pop() || ''
              return { name, path: p, size: 0, type: '' }
            })
          }
        }
        console.log('[Uploader] normalizedTempFiles:', normalizedTempFiles)

        // 2. 处理选择的文件
        if (normalizedTempFiles && normalizedTempFiles.length > 0) {
          const newFiles = normalizedTempFiles.map(tempFile => {
            // 检查文件大小
            if (tempFile.size > this.maxSize * 1024 * 1024) {
              uni.showToast({
                title: `文件 ${tempFile.name} 超过${this.maxSize}MB限制`,
                icon: 'none'
              })
              return null
            }

            // 创建文件对象
            return {
              id: Date.now() + Math.random(),
              name: tempFile.name,
              path: tempFile.path,
              size: tempFile.size,
              type: tempFile.type,
              status: 'pending', // pending, uploading, success, error
              progress: 0,
              errorMsg: ''
            }
          }).filter(file => file !== null) // 过滤掉超限的文件

          // 3. 添加到文件列表（使用不可变更新以确保响应式渲染）
          this.fileList = this.fileList.concat(newFiles)

          // 触发事件通知父组件已选择文件（无论是否自动上传）
          this.$emit('files-selected', newFiles)

          // 4. 如果自动上传，开始上传
          if (this.autoUpload && newFiles.length > 0) {
            this.startUpload()
          }
        }

        // 隐藏加载提示
        uni.hideLoading()

      } catch (error) {
        // 隐藏加载提示
        uni.hideLoading()

        console.error('选择文件失败:', error)
        // 用户取消选择不提示错误
        if (error.errMsg && !error.errMsg.includes('cancel')) {
          uni.showToast({
            title: '选择文件失败',
            icon: 'none'
          })
        }
      }
    },

    // 在 HBuilder 预览模式下添加模拟文件（仅用于调试显示，不会真实上传）
    addMockFile() {
      const name = String(this.mockFileName || '').trim()
      if (!name) return
      const mock = {
        id: Date.now() + Math.random(),
        name,
        path: '',
        size: 0,
        type: '',
        status: 'pending',
        progress: 0,
        errorMsg: ''
      }
      // 添加到本组件列表并通知父组件
      this.fileList = this.fileList.concat([mock])
      this.$emit('files-selected', [{ name: mock.name, path: mock.path, size: mock.size }])
      this.mockFileName = ''
    },

    // 核心方法2：开始上传
    async startUpload() {
      if (this.uploading) return

      this.uploading = true

      // 找出所有待上传的文件
      const pendingFiles = this.fileList.filter(file => file.status === 'pending')

      if (pendingFiles.length === 0) {
        this.uploading = false
        return
      }

      // 逐个上传文件
      for (const file of pendingFiles) {
        try {
          await this.uploadSingleFile(file)
        } catch (error) {
          console.error('文件上传失败:', error)
        }
      }

      this.uploading = false

      // 检查是否全部上传成功
      const successCount = this.fileList.filter(f => f.status === 'success').length
      const errorCount = this.fileList.filter(f => f.status === 'error').length

      if (errorCount === 0 && successCount > 0) {
        uni.showToast({
          title: `成功上传${successCount}个文件`,
          icon: 'success'
        })
      }
    },

    // 核心方法3：上传单个文件
    uploadSingleFile(file) {
      return new Promise((resolve, reject) => {
        const fileIndex = this.fileList.findIndex(f => f.id === file.id)
        if (fileIndex === -1) {
          reject(new Error('文件不存在'))
          return
        }

        // 更新状态为上传中
        this.$set(this.fileList[fileIndex], 'status', 'uploading')

        // 创建上传任务
        const isBatchEndpoint = typeof this.uploadUrl === 'string' && this.uploadUrl.indexOf('/upload/batch') >= 0
        const nameField = (this.fileFieldName && String(this.fileFieldName)) || 'file'
        const actualNameField = (nameField === 'file' && isBatchEndpoint) ? 'files' : nameField

        const uploadTask = uni.uploadFile({
          url: this.uploadUrl,
          filePath: file.path,
          name: actualNameField, // 后端接收的文件字段名
          formData: {
            ...this.formData,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            timestamp: Date.now()
          },
          header: {
            // 不要手动设置 Content-Type，让 uni.uploadFile 自动生成 boundary
            ...this.headers
          },

          success: (uploadRes) => {
            try {
              const raw = uploadRes && uploadRes.data
              const res = typeof raw === 'string' ? JSON.parse(raw) : (raw || {})

              if (res.code === 200 || res.success) {
                // 上传成功
                this.$set(this.fileList[fileIndex], 'status', 'success')
                this.$set(this.fileList[fileIndex], 'progress', 100)
                this.$set(this.fileList[fileIndex], 'response', res.data)

                // 触发成功事件
                this.$emit('upload-success', {
                  file: file,
                  response: res.data,
                  index: fileIndex
                })

                resolve(res.data)
              } else {
                // 服务器返回错误
                const msg = res.msg || res.message || res.error || `上传失败(${uploadRes.statusCode || ''})`
                this.handleUploadError(fileIndex, msg)
                reject(new Error(msg))
              }
            } catch (e) {
              // 解析响应失败
              let msg = '服务器响应异常'
              try {
                const raw = uploadRes && uploadRes.data
                if (raw) msg = `${msg}: ${typeof raw === 'string' ? raw : JSON.stringify(raw)}`
              } catch (e2) {
                // ignore
              }
              this.handleUploadError(fileIndex, msg)
              reject(new Error(msg))
            }
          },

          fail: (error) => {
            let errorMsg = '上传失败'
            if (error.errMsg) {
              if (error.errMsg.includes('timeout')) {
                errorMsg = '网络超时'
              } else if (error.errMsg.includes('network')) {
                errorMsg = '网络连接失败'
              }
            }
            this.handleUploadError(fileIndex, errorMsg)
            reject(error)
          }
        })

        // 监听上传进度
        uploadTask.onProgressUpdate = (res) => {
          this.$set(this.fileList[fileIndex], 'progress', res.progress)
          this.$emit('upload-progress', {
            file: file,
            progress: res.progress,
            index: fileIndex
          })
        }

        // 存储上传任务以便取消
        this.uploadTasks.set(file.id, uploadTask)
      })
    },

    // 处理上传错误
    handleUploadError(fileIndex, errorMsg) {
      this.$set(this.fileList[fileIndex], 'status', 'error')
      this.$set(this.fileList[fileIndex], 'errorMsg', errorMsg)
      this.$emit('upload-error', {
        file: this.fileList[fileIndex],
        error: errorMsg,
        index: fileIndex
      })
    },

    // 重试上传
    retryUpload(file) {
      const fileIndex = this.fileList.findIndex(f => f.id === file.id)
      if (fileIndex === -1) return

      this.$set(this.fileList[fileIndex], 'status', 'pending')
      this.$set(this.fileList[fileIndex], 'errorMsg', '')

      if (this.autoUpload) {
        this.uploadSingleFile(this.fileList[fileIndex])
      }
    },

    // 删除文件
    removeFile(index) {
      const file = this.fileList[index]

      // 如果正在上传，先取消上传
      if (this.uploadTasks.has(file.id)) {
        const task = this.uploadTasks.get(file.id)
        task.abort()
        this.uploadTasks.delete(file.id)
      }

      // 从列表中移除
      this.fileList.splice(index, 1)

      this.$emit('file-remove', file)
    },

    // 获取文件图标
    getFileIcon(fileName) {
      const ext = fileName.split('.').pop().toLowerCase()
      const icons = {
        pdf: '📕',
        doc: '📘',
        docx: '📘',
        xls: '📗',
        xlsx: '📗',
        ppt: '📙',
        pptx: '📙',
        txt: '📄',
        jpg: '🖼️',
        jpeg: '🖼️',
        png: '🖼️',
        zip: '📦',
        rar: '📦'
      }
      return icons[ext] || '📎'
    },

    // 格式化文件大小
    formatFileSize(bytes) {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    },

    // 清除所有文件
    clearAll() {
      // 取消所有上传任务
      this.uploadTasks.forEach(task => task.abort())
      this.uploadTasks.clear()

      this.fileList = []
      this.uploading = false
    },

    // 获取已上传成功的文件
    getSuccessFiles() {
      return this.fileList.filter(file => file.status === 'success')
    },

    // 预览选中的图片文件（仅图片）
    previewSelected() {
      const imgs = this.fileList.filter(file => {
        if (!file) return false
        const t = (file.type || '').toLowerCase()
        if (t.startsWith('image/')) return true
        return /\.(jpe?g|png|gif|bmp)$/i.test(file.name || '')
      })

      if (!imgs || imgs.length === 0) {
        uni.showToast({ title: '没有可预览的图片', icon: 'none' })
        return
      }

      const urls = imgs.map(f => f.path)
      uni.previewImage({ urls, current: urls[0] })
    },

    // App端文件选择降级方案（使用plus API）
    chooseFilesAppPlus(limit = 1) {
      return new Promise((resolve, reject) => {
        try {
          if (typeof plus === 'undefined') {
            reject(new Error('运行环境未就绪'));
            return;
          }

          const osName = plus.os.name;

          if (osName === 'Android') {
            // Android平台文件选择
            const main = plus.android.runtimeMainActivity();
            const Intent = plus.android.importClass('android.content.Intent');
            const Activity = plus.android.importClass('android.app.Activity');
            const OpenableColumns = plus.android.importClass('android.provider.OpenableColumns');

            const requestCode = 39001;
            const oldOnActivityResult = main.onActivityResult;

            const vm = this;

            // 添加超时机制，避免在HBuilder预览模式下无限等待
            let timeoutId = setTimeout(() => {
              console.warn('[Uploader] Android file selection timeout, restoring onActivityResult')
              main.onActivityResult = oldOnActivityResult;
              reject(new Error('文件选择超时，请重试'));
            }, 30000); // 30秒超时

            const getMetaFromUri = (uriObj) => {
              try {
                const resolver = main.getContentResolver();
                plus.android.importClass(resolver);
                const cursor = resolver.query(uriObj, null, null, null, null);
                plus.android.importClass(cursor);
                let name = '';
                let size = 0;
                if (cursor && cursor.moveToFirst()) {
                  const nameIdx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                  const sizeIdx = cursor.getColumnIndex(OpenableColumns.SIZE);
                  if (nameIdx >= 0) name = cursor.getString(nameIdx);
                  if (sizeIdx >= 0) size = cursor.getLong(sizeIdx);
                }
                cursor && cursor.close && cursor.close();
                return { name, size };
              } catch (e) {
                console.warn('[Uploader] getMetaFromUri error:', e)
                return { name: '', size: 0 };
              }
            };

            main.onActivityResult = function(requestCode2, resultCode, data) {
              clearTimeout(timeoutId); // 清除超时
              main.onActivityResult = oldOnActivityResult;

              if (requestCode !== requestCode2) {
                return; // 不是我们发起的请求，忽略
              }

              if (!data) {
                reject(new Error('用户取消选择'));
                return;
              }

              if (resultCode === Activity.RESULT_OK) {
                try {
                  const uri = data.getData();
                  if (!uri) {
                    reject(new Error('获取文件URI失败'));
                    return;
                  }

                  const { name, size } = getMetaFromUri(uri);
                  const filePath = plus.io.convertLocalFileSystemURL(uri.toString());

                  console.log('[Uploader] Android file selected:', { name, size, filePath })

                  resolve({
                    tempFiles: [{
                      name: name || '未知文件',
                      path: filePath,
                      size: size,
                      type: vm && typeof vm.getFileMimeType === 'function' ? vm.getFileMimeType(name) : 'application/octet-stream'
                    }]
                  });
                } catch (e) {
                  console.error('[Uploader] Android file processing error:', e)
                  reject(new Error('处理选择的文件时出错'));
                }
              } else {
                reject(new Error('选择文件失败'));
              }
            };

            try {
              const intent = new Intent(Intent.ACTION_GET_CONTENT);
              intent.setType('*/*');
              intent.addCategory(Intent.CATEGORY_OPENABLE);

              console.log('[Uploader] Starting Android file picker activity')
              main.startActivityForResult(intent, requestCode);
            } catch (e) {
              clearTimeout(timeoutId);
              main.onActivityResult = oldOnActivityResult;
              console.error('[Uploader] Failed to start Android file picker:', e)
              reject(new Error('启动文件选择器失败'));
            }

          } else if (osName === 'iOS') {
            // iOS平台文件选择（简化实现）
            console.log('[Uploader] Starting iOS file picker with plus.gallery.pick')

            // 添加超时机制
            let timeoutId = setTimeout(() => {
              console.warn('[Uploader] iOS file selection timeout')
              reject(new Error('文件选择超时，请重试'));
            }, 30000); // 30秒超时

            plus.gallery.pick((path) => {
              clearTimeout(timeoutId);
              console.log('[Uploader] iOS file selected:', path)
              const fileName = path.substring(path.lastIndexOf('/') + 1);
              resolve({
                tempFiles: [{
                  name: fileName,
                  path: path,
                  size: 0, // iOS下无法获取准确大小
                  type: this.getFileMimeType(fileName)
                }]
              });
            }, (error) => {
              clearTimeout(timeoutId);
              console.warn('[Uploader] iOS file selection error:', error)
              reject(new Error('用户取消选择'));
            }, {
              multiple: limit > 1,
              system: false
            });
          } else {
            reject(new Error('不支持的平台'));
          }
        } catch (error) {
          reject(error);
        }
      });
    },

    // 根据文件名获取MIME类型
    getFileMimeType(fileName) {
      if (!fileName) return 'application/octet-stream';

      const ext = fileName.split('.').pop().toLowerCase();
      const mimeTypes = {
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed'
      };

      return mimeTypes[ext] || 'application/octet-stream';
    }
  }
}
</script>

<style scoped>
@import '@/static/styles/upload.scss';
</style>