import { post, put, get } from '@/utils/request.js'
import { upload } from '@/utils/request.js'
import config from '@/utils/config.js'

/**
 * 提交任务
 * @param {string|number} taskId 任务ID
 * @param {object} data 提交数据 {submissionContent, actualWorktime?, attachmentUrls?}
 */
export function submitTask(taskId, data) {
  return post(`/zhiyan/projects/tasks/submissions/${taskId}/submit`, data)
}

/**
 * 获取任务的最新提交
 * @param {string|number} taskId 任务ID
 */
export function getLatestSubmission(taskId) {
  return get(`/zhiyan/projects/tasks/submissions/task/${taskId}/latest`)
}

/**
 * 获取任务的所有提交记录
 * @param {string|number} taskId 任务ID
 */
export function getTaskSubmissions(taskId) {
  return get(`/zhiyan/projects/tasks/submissions/task/${taskId}`)
}

/**
 * 获取待我审核的提交（我作为创建者需要审核）
 */
export function getPendingSubmissionsForReview(params) {
  return get(`/zhiyan/projects/tasks/submissions/pending-for-review`, params)
}

/**
 * 获取我提交的任务记录（包含待审核/已完成/被打回）
 */
export function getMySubmissions(params) {
  return get(`/zhiyan/projects/tasks/submissions/my-submissions`, params)
}

/**
 * 获取我审核通过的提交记录（分页）
 * @param {{page?: number, size?: number}} params
 */
export function getSubmissionsByReviewer(params) {
  return get(`/zhiyan/projects/tasks/submissions/by-reviewer`, params)
}

/**
 * 审核任务提交
 * @param {string|number} submissionId 提交记录ID
 * @param {{reviewStatus:'APPROVED'|'REJECTED',reviewComment?:string}} data
 */
export function reviewSubmission(submissionId, data) {
  return put(`/zhiyan/projects/tasks/submissions/${submissionId}/review`, data)
}

/**
 * 上传任务附件
 * @param {string} filePath 文件路径（uni.chooseFile返回的路径）
 */
export function uploadSubmissionFile(filePath) {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync(config.tokenKey);
    const fullUrl = filePath.startsWith('http') ? filePath : config.baseURL + '/zhiyan/projects/tasks/submissions/files/upload';

    // Android 上文档类文件经常返回 content:// 形式的 URI，plus.io.resolveLocalFileSystemURL 无法解析
    // 这类情况直接走 uni.uploadFile 的兜底逻辑，避免在 HTML5+ 分支里报“路径不可用”
    const isContentUri = typeof filePath === 'string' && filePath.indexOf('content://') === 0

    // #ifdef APP-PLUS
    // uni.uploadFile 在部分 Android ROM/权限策略下会出现读不到本地文件内容，导致服务端收到 0B
    // 这里使用 HTML5+ 原生 uploader，读取本地文件更可靠
    // 但对于 content:// 这类 URI，HTML5+ 无法解析路径，需跳过此分支
    try {
      if (!isContentUri && typeof plus !== 'undefined' && plus.uploader && typeof plus.uploader.createUpload === 'function') {
        const prepareReadablePath = () =>
          new Promise((r, j) => {
            try {
              const basename = (p) => {
                try {
                  const s = String(p || '')
                  const n = s.split('?')[0].split('#')[0].split('/').pop()
                  return n || 'file'
                } catch (e) {
                  return 'file'
                }
              }

              const toUrl = (p) => {
                try {
                  if (typeof p !== 'string') return ''
                  if (p.startsWith('file://')) return p
                  if (p.startsWith('/')) {
                    if (plus.io && typeof plus.io.convertAbsoluteFileSystem === 'function') {
                      return plus.io.convertAbsoluteFileSystem(p)
                    }
                  }
                  return p
                } catch (e) {
                  return p
                }
              }

              const toAbs = (p) => {
                try {
                  if (typeof p !== 'string') return ''
                  if (p.startsWith('/')) return p
                  if (p.startsWith('file://')) {
                    if (plus.io && typeof plus.io.convertLocalFileSystemURL === 'function') {
                      return plus.io.convertLocalFileSystemURL(p)
                    }
                  }
                  return p
                } catch (e) {
                  return p
                }
              }

              const originalName = basename(filePath)
              const url = toUrl(filePath)

              plus.io.resolveLocalFileSystemURL(
                url,
                (entry) => {
                  try {
                    entry.file(
                      (f) => {
                        const realSize = (f && f.size) || 0

                        // 强制复制到 _doc，避免外部存储/权限策略导致 uploader 读取为空（0B）
                        const copyToDoc = () => {
                          try {
                            plus.io.resolveLocalFileSystemURL(
                              '_doc/',
                              (docDir) => {
                                const safeName = `task-upload-${Date.now()}-${Math.floor(Math.random() * 10000)}-${originalName}`
                                entry.copyTo(
                                  docDir,
                                  safeName,
                                  (newEntry) => {
                                    const newUrl = newEntry && typeof newEntry.toLocalURL === 'function' ? newEntry.toLocalURL() : ''
                                    const abs = toAbs(newUrl)
                                    try {
                                      newEntry.file(
                                        (nf) => {
                                          const newSize = (nf && nf.size) || 0
                                          if (newSize <= 0) {
                                            j(new Error('读取文件失败：文件大小为0'))
                                            return
                                          }
                                          r({ absPath: abs, filename: originalName, size: newSize })
                                        },
                                        () => j(new Error('读取文件失败：无法获取文件信息'))
                                      )
                                    } catch (e) {
                                      j(new Error('读取文件失败：无法获取文件信息'))
                                    }
                                  },
                                  () => j(new Error('复制文件失败'))
                                )
                              },
                              () => j(new Error('无法访问_doc目录'))
                            )
                          } catch (e) {
                            j(new Error('复制文件失败'))
                          }
                        }

                        // 有些机型直接传外部路径会 0B，这里统一复制到 _doc
                        if (realSize <= 0) {
                          j(new Error('读取文件失败：文件大小为0'))
                          return
                        }
                        copyToDoc()
                      },
                      () => j(new Error('读取文件失败：无法获取文件信息'))
                    )
                  } catch (e) {
                    j(new Error('读取文件失败：无法获取文件信息'))
                  }
                },
                () => j(new Error('读取文件失败：路径不可用'))
              )
            } catch (e) {
              j(e)
            }
          })

        prepareReadablePath()
          .then(({ absPath, filename, size }) => {
            let uploadUrl = absPath
            try {
              if (typeof uploadUrl === 'string' && uploadUrl.startsWith('/')) {
                if (plus.io && typeof plus.io.convertAbsoluteFileSystem === 'function') {
                  uploadUrl = plus.io.convertAbsoluteFileSystem(uploadUrl)
                }
              }
            } catch (e) {
              // ignore
            }

            const task = plus.uploader.createUpload(
              fullUrl,
              { method: 'POST' },
              (t, status) => {
                try {
                  const respText = (t && (t.responseText || t.response)) || ''
                  if (status === 200) {
                    const data = typeof respText === 'string' ? JSON.parse(respText) : respText
                    if (data && (data.code === 200 || data.code === 0)) {
                      resolve({ code: 200, data: data.data })
                    } else {
                      uni.showToast({ title: (data && data.msg) || '上传失败', icon: 'none' })
                      reject(data || new Error('上传失败'))
                    }
                  } else {
                    const msg = `上传失败(${status})${respText ? ': ' + respText : ''}`
                    uni.showToast({ title: msg, icon: 'none' })
                    reject(new Error(msg))
                  }
                } catch (e) {
                  uni.showToast({ title: '上传响应解析失败', icon: 'none' })
                  reject(e)
                }
              }
            )

            try {
              if (token) task.setRequestHeader('Authorization', `Bearer ${token}`)
            } catch (e) {
              // ignore
            }

            try {
              if (size != null) task.addData('clientSize', String(size))
              if (filename) task.addData('clientFilename', String(filename))
            } catch (e) {
              // ignore
            }

            // 这里统一传 file:// URL 给 addFile，避免部分机型传绝对路径导致 0B
            task.addFile(uploadUrl, { key: 'file', name: filename })
            task.start()
          })
          .catch((e) => {
            uni.showToast({ title: e && e.message ? e.message : '读取文件失败', icon: 'none' })
            reject(e)
          })

        return

      }
    } catch (e) {
      // ignore and fallback to uni.uploadFile
    }
    // #endif

    // App 端部分机型如果传 file:// URL，会导致 uploadFile 读取不到内容（上传 0B）
    // 这里统一转成本地绝对路径；content:// 由 uni.uploadFile 自行处理
    // #ifdef APP-PLUS
    try {
      if (!isContentUri && typeof plus !== 'undefined' && plus.io && typeof plus.io.convertLocalFileSystemURL === 'function') {
        if (typeof filePath === 'string' && filePath.startsWith('file://')) {
          filePath = plus.io.convertLocalFileSystemURL(filePath)
        }
      }
    } catch (e) {
      // ignore
    }
    // #endif
    
    uni.uploadFile({
      url: fullUrl,
      filePath: filePath,
      name: 'file',
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          try {
            const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            if (data.code === 200 || data.code === 0) {
              resolve({
                code: 200,
                data: data.data
              });
            } else {
              uni.showToast({
                title: data.msg || '上传失败',
                icon: 'none'
              });
              reject(data);
            }
          } catch (e) {
            console.error('解析上传响应失败:', e);
            uni.showToast({
              title: '上传响应解析失败',
              icon: 'none'
            });
            reject(new Error('上传响应解析失败'));
          }
        } else {
          let msg = `上传失败(${res.statusCode})`
          try {
            const body = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
            if (body) msg = `${msg}: ${body}`
          } catch (e) {
            // ignore
          }
          uni.showToast({
            title: msg,
            icon: 'none'
          });
          reject(res);
        }
      },
      fail: (err) => {
        console.error('上传失败:', err);
        uni.showToast({
          title: (err && (err.errMsg || err.message)) || '上传失败',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
}

