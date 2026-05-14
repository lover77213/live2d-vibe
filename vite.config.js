import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  // 这里的 base 必须和你的 GitHub 仓库名完全一致，且前后都有斜杠
  base: '/live2d-vibe/', 
  plugins: [vue()],
  server: {
    port: 5173
  }
})
