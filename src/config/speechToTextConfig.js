/**
 * 語音轉文字 API 設定
 * 支援多個轉換引擎:
 * 1. Web Speech API (免費，瀏覽器內建)
 * 2. Google Speech-to-Text API
 * 3. OpenAI Whisper API (支援無限長度音訊)
 */

// 從環境變數讀取 API 密鑰 (開發環境中)
const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY
const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY

console.log('=== 環境變數檢查 ===')
console.log('VITE_GOOGLE_API_KEY:', googleApiKey ? '✓ 已設定 (' + googleApiKey.length + ' 字符)' : '✗ 未設定')
console.log('VITE_OPENAI_API_KEY:', openaiApiKey ? '✓ 已設定 (' + openaiApiKey.length + ' 字符)' : '✗ 未設定')

if (!googleApiKey && import.meta.env.DEV) {
  console.warn(
    '⚠️ 未設定 Google Speech-to-Text API 密鑰。\n' +
    '請在 .env 檔案中設定 VITE_GOOGLE_API_KEY\n' +
    '或透過環境變數設定。'
  )
}

if (!openaiApiKey && import.meta.env.DEV) {
  console.warn(
    '⚠️ 未設定 OpenAI API 密鑰。\n' +
    '請在 .env 檔案中設定 VITE_OPENAI_API_KEY\n' +
    '或透過環境變數設定。'
  )
}

export const speechToTextConfig = {
  // Google Cloud API 設定
  googleApiKey: googleApiKey || 'YOUR_API_KEY_HERE',
  
  // OpenAI API 設定
  openaiApiKey: openaiApiKey || 'YOUR_API_KEY_HERE',
  
  // 語言設定
  languages: [
    { code: 'zh-TW', name: '繁體中文' },
    { code: 'zh-CN', name: '簡體中文' },
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'ja-JP', name: '日本語' },
    { code: 'ko-KR', name: '한국어' },
    { code: 'fr-FR', name: 'Français' },
    { code: 'de-DE', name: 'Deutsch' },
    { code: 'es-ES', name: 'Español' },
    { code: 'it-IT', name: 'Italiano' },
    { code: 'pt-BR', name: 'Português (Brazil)' },
    { code: 'ru-RU', name: 'Русский' },
    { code: 'vi-VN', name: 'Tiếng Việt' },
    { code: 'th-TH', name: 'ไทย' },
  ],

  // 音訊設定
  audio: {
    sampleRate: 48000, // WebM Opus 的 MediaRecorder 預設採樣率
    channels: 1, // 單聲道
    bitsPerSample: 16,
  },

  // API 參數
  apiParams: {
    encoding: 'WEBM_OPUS', // 預設使用 WebM Opus 格式 (MediaRecorder 原生格式)
    // 注意: 不在 API 請求中指定 sampleRateHertz，讓 Google API 從音訊頭自動讀取
    // WebM Opus 固定為 48000Hz
    enableAutomaticPunctuation: true, // 自動添加標點符號
    // model: 自動根據語言選擇 (latest_long 用於英文/歐語, default 用於亞洲語言)
    useEnhanced: true, // 使用增強模型
    maxAlternatives: 1, // 返回結果數量
  },

  // 超時設定 (毫秒)
  timeout: 300000, // 5 分鐘

  // 引擎選擇配置
  engines: {
    webSpeech: {
      enabled: true,
      name: '快速轉換 (Web Speech API)',
      description: '免費、無限長度、準確度較低',
      free: true,
      maxDuration: Infinity,
    },
    google: {
      enabled: true,
      name: '精準轉換 (Google Speech-to-Text)',
      description: '高準確度、詞級時間戳、付費',
      free: false,
      maxDuration: 60000, // 同步 API 60 秒限制
    },
    openai: {
      enabled: true,
      name: '🚀 超強轉換 (OpenAI Whisper)',
      description: '無限長度、自動分割、支援多語言',
      free: false,
      maxDuration: Infinity,
    },
  },

  // 驗證嚴格模式: 如果為 true，驗證 API 金鑰時僅接受 HTTP 2xx 回應
  strictValidation: false,
}

export default speechToTextConfig
