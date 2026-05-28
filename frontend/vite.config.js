import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, resolve(__dirname, '..'), '')
  const frontendEnv = loadEnv(mode, __dirname, '')
  const apiProxyTarget = frontendEnv.VITE_API_PROXY_TARGET
    || rootEnv.VITE_API_PROXY_TARGET
    || `http://localhost:${rootEnv.PORT || '5000'}`

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: frontendEnv.VITE_DEV_HOST || rootEnv.VITE_DEV_HOST || 'localhost',
      proxy: {
        '/api': apiProxyTarget
      }
    }
  }
})
