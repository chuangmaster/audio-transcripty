import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  // GitHub Pages 部署配置
  // 倉庫名稱為 audio-transcripty，所以 base 路徑需要設置為 '/audio-transcripty/'
  base: '/audio-transcripty/',
  
  plugins: [vue()],
  
  server: {
    port: 3000,
    open: true
  }
})
