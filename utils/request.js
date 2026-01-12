/**
 * 网络请求封装
 */
import config from './config.js'
import { clearAuth } from './auth.js'

let __authRedirecting = false
let __forbiddenNotified = false

function redirectToLoginOnce(message) {
	if (__authRedirecting) return
	__authRedirecting = true
	try {
		clearAuth()
	} catch (e) {
		// ignore
	}
	if (message) {
		uni.showToast({ title: message, icon: 'none' })
	}
	try {
		const pages = (typeof getCurrentPages === 'function') ? getCurrentPages() : []
		const current = pages && pages.length ? pages[pages.length - 1] : null
		const route = current && (current.route || current.__route__)
		if (route && route.indexOf('pages/auth/login') !== -1) {
			return
		}
	} catch (e) {
		// ignore
	}
	uni.reLaunch({ url: '/pages/auth/login' })
	setTimeout(() => {
		__authRedirecting = false
	}, 1200)
}

function notifyForbiddenOnce(message) {
	if (__forbiddenNotified) return
	__forbiddenNotified = true
	uni.showToast({ title: message || '权限不足', icon: 'none' })
	setTimeout(() => {
		__forbiddenNotified = false
	}, 1500)
}

let __refreshingTokenPromise = null

function refreshAccessTokenIfPossible() {
	if (__refreshingTokenPromise) {
		return __refreshingTokenPromise
	}
	const refreshToken = uni.getStorageSync(config.refreshTokenKey)
	if (!refreshToken) {
		return Promise.reject(new Error('NO_REFRESH_TOKEN'))
	}
	const refreshUrl = config.baseURL + (config.apiPrefix || '/zhiyan/auth') + '/refresh'
	__refreshingTokenPromise = new Promise((resolve, reject) => {
		uni.request({
			url: refreshUrl,
			method: 'POST',
			data: { refreshToken },
			header: { 'Content-Type': 'application/json' },
			timeout: config.timeout,
			success: (res) => {
				try {
					if (res.statusCode === 200 && res.data && (res.data.code === 200 || res.data.code === 0) && res.data.accessToken) {
						const body = res.data
						uni.setStorageSync(config.tokenKey, body.accessToken)
						if (body.refreshToken) {
							uni.setStorageSync(config.refreshTokenKey, body.refreshToken)
						}
						resolve(body)
					} else {
						const err = res.data || {}
						err.statusCode = res.statusCode
						reject(err)
					}
				} catch (e) {
					reject(e)
				}
			},
			fail: (err) => {
				reject(err)
			},
			complete: () => {
				__refreshingTokenPromise = null
			}
		})
	})
	return __refreshingTokenPromise
}

function normalizeBigIntFields(value) {
	if (Array.isArray(value)) {
		return value.map(normalizeBigIntFields)
	}

	if (value && typeof value === 'object') {
		const result = {}
		// 先递归处理所有字段
		Object.keys(value).forEach(key => {
			const v = value[key]
			let normalized = normalizeBigIntFields(v)
			// 对 16 位及以上的整型数字统一转成字符串，避免继续丢精度
			if (typeof normalized === 'number' && Number.isInteger(normalized)) {
				const absStr = String(Math.abs(normalized))
				if (absStr.length >= 16) {
					normalized = absStr
				}
			}
			result[key] = normalized
		})
		// 如果存在 xxxStr 字段，则优先使用 xxxStr 的值覆盖 xxx，保证使用后端提供的字符串 ID
		Object.keys(result).forEach(key => {
			if (key.endsWith('Str')) {
				const baseKey = key.slice(0, -3)
				if (baseKey && result[key] != null) {
					result[baseKey] = String(result[key])
				}
			}
		})
		return result
	}
	return value
}

/**
 * 发起HTTP请求
 * @param {Object} options 请求配置
 * @returns {Promise}
 */
function request(options) {
	return new Promise((resolve, reject) => {
		// 获取token
		const token = uni.getStorageSync(config.tokenKey)

		console.log('🔍 请求信息:', {
			url: options.url,
			method: options.method || 'GET',
			hasToken: !!token
		});

		// 构建完整URL
		const url = options.url.startsWith('http')
			? options.url
			: config.baseURL + options.url

		// 构建请求头
		const header = {
			'Content-Type': 'application/json',
			...options.header
		}

		// 添加token
		if (token) {
			header['Authorization'] = `Bearer ${token}`
			console.log('✅ 已添加 Authorization 头');
		} else {
			// 一些接口本身就是未登录场景（例如登录、注册、自动登录检查等），不必提示警告
			const urlPath = options.url || '';
			const isPublicAuthEndpoint = /\/login$|\/register$|\/auto-login-check$|\/refresh$|\/forgot-password$|\/send-verfcode$|\/reset-password$/.test(urlPath);
			if (isPublicAuthEndpoint) {
				console.log('ℹ️ 本次为公共认证接口请求，未携带 Token 属于正常情况');
			} else {
				console.warn('⚠️ 未找到 Token，请求可能被拒绝');
			}
		}

		// 发起请求
		uni.request({
			url,
			method: options.method || 'GET',
			data: options.data,
			header,
			timeout: options.timeout || config.timeout,
			success: (res) => {
				console.log('📥 收到响应:', {
					statusCode: res.statusCode,
					url: options.url || ''
				});

				const urlPath = options.url || ''
				const isPublicAuthEndpoint = /\/login$|\/register$|\/auto-login-check$|\/refresh$|\/forgot-password$|\/send-verfcode$|\/reset-password$/.test(urlPath)

				// 请求成功
				if (res.statusCode === 200) {
					// 处理数组响应（批量推送接口返回数组）
					if (Array.isArray(res.data)) {
						const normalizedData = normalizeBigIntFields(res.data)
						const response = {
							code: 200,
							msg: 'success',
							data: normalizedData
						};
						console.log('✅ 返回数组数据:', {
							code: response.code,
							arrayLength: normalizedData.length,
							url: urlPath
						});
						resolve(response);
						return;
					}
					
					// 检查业务状态码
					if (res.data.code === 200 || res.data.code === 0) {
						const normalizedData = normalizeBigIntFields(res.data.data)
						// 返回完整的响应对象，包含 code, msg, data
						const response = {
							code: res.data.code,
							msg: res.data.msg || res.data.message,
							data: normalizedData,
							// 重要：保留原始响应中的所有字段，包括 accessToken, refreshToken 等
							...res.data,
							// 特别处理：确保data中的token字段也被保留
							...(normalizedData || {})
						};
						console.log('✅ 返回数据:', {
							code: response.code,
							msg: response.msg,
							hasData: !!response.data,
							url: urlPath
						});
						console.log('🔑 Token检查:', {
							hasAccessToken: !!response.accessToken,
							hasRefreshToken: !!response.refreshToken
						});
						resolve(response);
					} else {
						// 业务错误
						const errorObj = {
							...(res.data || {}),
							statusCode: res.statusCode,
							msg: (res.data && (res.data.msg || res.data.message || res.data.error)) || '请求失败'
						}
						if (!isPublicAuthEndpoint) {
							uni.showToast({
								title: errorObj.msg,
								icon: 'none'
							})
						}
						reject(errorObj)
					}
				} else if (res.statusCode === 401) {
					// 未授权：通常是 Token 失效/缺失，需要重新登录
					console.warn('⚠️ 认证失败，状态码:', res.statusCode, '响应数据:', res.data);
					console.warn('🔍 当前Token:', uni.getStorageSync(config.tokenKey) ? '存在' : '不存在');
					const raw = res.data || {}
					let msg = raw.msg || raw.message || raw.error || ''
					if (!msg && isPublicAuthEndpoint) {
						msg = '账号或密码错误'
					}
					const errorObj = { ...raw, statusCode: res.statusCode, msg: msg || `请求失败(${res.statusCode})` }
					if (!isPublicAuthEndpoint && !options.__isRetry) {
						refreshAccessTokenIfPossible()
							.then(() => {
								request({ ...options, __isRetry: true }).then(resolve).catch(reject)
							})
							.catch(() => {
								redirectToLoginOnce('登录已过期，请重新登录')
								reject(errorObj)
							})
					} else {
						if (!isPublicAuthEndpoint) {
							redirectToLoginOnce('登录已过期，请重新登录')
						}
						reject(errorObj)
					}
				} else if (res.statusCode === 403) {
					console.warn('⚠️ 权限不足，状态码:', res.statusCode, '响应数据:', res.data);
					const raw = res.data || {}
					const msg = raw.msg || raw.message || raw.error || '权限不足'
					const errorObj = { ...raw, statusCode: res.statusCode, msg }
					if (!isPublicAuthEndpoint) {
						const msgStr = String(msg || '').toLowerCase()
						const tokenExpiredByMsg =
							(msgStr.includes('token') || msgStr.includes('令牌') || msgStr.includes('jwt')) &&
							(msgStr.includes('过期') || msgStr.includes('expired') || msgStr.includes('失效') || msgStr.includes('invalid'))
						const path = (raw && raw.path) || urlPath || ''
						const lowerPath = String(path || '').toLowerCase()
						const isAuthMeEndpoint = lowerPath.includes('/zhiyan/auth/users/me')
						const isAuthProfileEndpoint =
							lowerPath.includes('/zhiyan/auth/users/profile') ||
							lowerPath.includes('/zhiyan/auth/profile/')
						const treatAsTokenExpired = tokenExpiredByMsg || isAuthMeEndpoint || isAuthProfileEndpoint
						if (treatAsTokenExpired && !options.__isRetry) {
							refreshAccessTokenIfPossible()
								.then(() => {
									request({ ...options, __isRetry: true }).then(resolve).catch(reject)
								})
								.catch(() => {
									redirectToLoginOnce('登录已过期，请重新登录')
									reject(errorObj)
								})
						} else {
							if (treatAsTokenExpired) {
								redirectToLoginOnce('登录已过期，请重新登录')
							} else {
								notifyForbiddenOnce(msg)
							}
							reject(errorObj)
						}
					} else {
						reject(errorObj)
					}
				} else {
					// 其他HTTP错误
					const raw = res.data || {}
					const msg = raw.msg || raw.message || raw.error || `请求失败(${res.statusCode})`
					const errorObj = { ...raw, statusCode: res.statusCode, msg }
					if (!isPublicAuthEndpoint) {
						uni.showToast({
							title: msg,
							icon: 'none'
						})
					}
					reject(errorObj)
				}
			},
			fail: (err) => {
				// 网络错误
				const errMsg = err && err.errMsg || '未知错误'
				console.error('请求失败:', {
					url,
					method: options.method || 'GET',
					errMsg,
					detail: err
				})

				// 根据错误类型提供更详细的提示
				let errorTitle = '网络请求失败'
				if (errMsg.includes('timeout') || errMsg.includes('abort')) {
					errorTitle = '请求超时，请检查网络连接或服务器状态'
				} else if (errMsg.includes('fail')) {
					errorTitle = '无法连接到服务器，请检查网络设置'
				}

				uni.showToast({
					title: errorTitle,
					icon: 'none',
					duration: 3000
				})
				reject(err)
			}
		})
	})
}
/**
 * GET请求
 */
export function get(url, data, options = {}) {
	return request({
		url,
		method: 'GET',
		data,
		...options
	})
}
/**
 * POST请求
 */
export function post(url, data, options = {}) {
	return request({
		url,
		method: 'POST',
		data,
		...options
	})
}
/**
 * PUT请求
 */
export function put(url, data, options = {}) {
	return request({
		url,
		method: 'PUT',
		data,
		...options
	})
}
/**
 * DELETE请求
 */
export function del(url, data, options = {}) {
	return request({
		url,
		method: 'DELETE',
		data,
		...options
	})
}
/**
 * PATCH请求
 */
export function patch(url, data, options = {}) {
	return request({
		url,
		method: 'PATCH',
		data,
		...options
	})
}
/**
 * 上传文件
 */
export function upload(url, filePath, formData = {}, options = {}) {
	return new Promise(async (resolve, reject) => {
		const token = uni.getStorageSync(config.tokenKey)
		const fullUrl = url.startsWith('http') ? url : config.baseURL + url

		let uploadPath = filePath
		try {
			// Normalize common URI variants
			if (!uploadPath) throw new Error('filePath为空')
			if (typeof uploadPath === 'string' && uploadPath.startsWith('file://')) {
				uploadPath = uploadPath.replace(/^file:\/\//, '')
			}

			// 如果 plus 环境可用，尝试转换为本地可读路径（兼容 content:// 等）
			if (typeof plus !== 'undefined' && plus.io && typeof plus.io.convertLocalFileSystemURL === 'function') {
				try {
					const converted = plus.io.convertLocalFileSystemURL(uploadPath)
					if (converted) uploadPath = converted
				} catch (e) {
					// ignore conversion errors
				}
			}
		} catch (e) {
			console.warn('[upload] 文件路径处理失败:', e)
		}

		const header = {
			'Authorization': token ? `Bearer ${token}` : '',
			// 让 uni.uploadFile 自行设置 Content-Type 边界
			...options.header
		}

		try {
			const task = uni.uploadFile({
				url: fullUrl,
				filePath: uploadPath,
				name: options.name || 'file',
				formData: formData || {},
				header,
				success: (res) => {
					try {
						if (res.statusCode === 200) {
							let parsed = null
							try {
								parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
							} catch (e) {
								// 不是JSON，直接返回原始数据
								parsed = res.data
							}
							// 支持后端直接返回{code:..., data:...}或直接返回数据对象
							if (parsed && (parsed.code === 200 || parsed.code === 0)) {
								resolve(parsed)
							} else if (parsed && (parsed.data || parsed.id || parsed.fileId)) {
								resolve(parsed)
							} else {
								uni.showToast({ title: parsed && parsed.msg ? parsed.msg : '上传失败', icon: 'none' })
								reject(parsed)
							}
						} else {
							uni.showToast({ title: `上传失败(${res.statusCode})`, icon: 'none' })
							reject(res)
						}
					} catch (e) {
						console.error('[upload] 处理上传响应失败:', e, 'raw:', res)
						reject(e)
					}
				},
				fail: (err) => {
					console.error('上传失败:', err)
					uni.showToast({ title: '上传失败', icon: 'none' })
					reject(err)
				}
			})

			// 支持上传进度回调
			try {
				if (task && typeof task.onProgressUpdate === 'function') {
					task.onProgressUpdate((prog) => {
						try {
							const percent = (prog && (prog.progress || (prog.totalBytesSent && prog.totalBytesExpectedToSend ? Math.floor((prog.totalBytesSent / prog.totalBytesExpectedToSend) * 100) : prog.progress))) || 0
							if (typeof options.onProgress === 'function') options.onProgress(percent, prog)
						} catch (e) {
							console.warn('[upload] 进度监听异常:', e)
						}
					})
				}
			} catch (e) {
				console.warn('[upload] attach progress listener failed', e)
			}
		} catch (e) {
			console.error('[upload] 调用 uni.uploadFile 失败:', e)
			uni.showToast({ title: '上传失败', icon: 'none' })
			reject(e)
		}
	})
}
export default request