/**
 * API配置文件
 */
// 开发环境和生产环境的API基础地址
// const API_BASE_URL = {
// 	// 开发环境 - 使用空字符串，让请求走代理
// 	development: 'http://192.168.1.116:9006',
// 	// 生产环境
// 	production: 'https://api.zhiyan.com'
// }

const API_BASE_URL = 'https://api.zyplatform.xyz'

// // 当前环境
// const ENV = process.env.NODE_ENV || 'development'

// 导出配置
export default {
	// API基础地址
	//baseURL: API_BASE_URL[ENV],
	baseURL: API_BASE_URL,
	
	// 请求超时时间（毫秒）- 增加到60秒
	timeout: 60000,
	
	// Token存储的key
	tokenKey: 'zhiyan_token',
	
	// 用户信息存储的key
	userInfoKey: 'zhiyan_user_info',
	
	// 用户研究方向标签缓存 key
	researchTagsCacheKey: 'zhiyan_user_research_tags',

	// 用户关联链接缓存 key
	profileLinksCacheKey: 'zhiyan_user_profile_links',

	// 刷新Token存储的key
	refreshTokenKey: 'zhiyan_refresh_token',

	// RememberMe Token存储的key
	rememberMeTokenKey: 'zhiyan_remember_me_token',


	// 是否启用自动登录标记的key
	autoLoginFlagKey: 'zhiyan_auto_login_enabled',

	// API路径前缀
	apiPrefix: '/zhiyan/auth'
}