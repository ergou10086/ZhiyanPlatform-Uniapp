import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

/**
 * Vite 配置 - 开发服务器代理
 * 用于解决开发环境的跨域问题
 */
export default defineConfig({
  plugins: [
    uni()
  ],
  
  server: {
    port: 5173, // 开发服务器端口
    host: '0.0.0.0',
    
    // 代理配置
    proxy: {
      // 代理所有 /zhiyan 开头的请求
      '/zhiyan': {
        target: 'http://localhost:9006', // 后端服务地址
        changeOrigin: true, // 改变请求源
        secure: false, // 如果是 https 接口，需要配置这个参数
        ws: true, // 支持 websocket
        
        // 日志
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🚀 [Proxy] 转发请求:', req.method, req.url, '→', options.target + req.url)
          })
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('✅ [Proxy] 收到响应:', req.url, '状态码:', proxyRes.statusCode)
          })
          
          proxy.on('error', (err, req, res) => {
            console.error('❌ [Proxy] 代理错误:', err.message)
          })
        }
      }
    }
  }
})
