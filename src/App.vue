<template>
  <div class="app-container">
    <header class="app-header">
      <h1>🎙️ 會議錄音與轉文字服務</h1>
      <p>輕鬆將語音轉換為文字，提升工作效率</p>
      
      <!-- API 狀態指示器 -->
      <div class="api-status-banner">
        <span v-if="apiStatus.initialized" class="status-badge success">
          ✓ API 服務已連接
        </span>
        <span v-else-if="apiStatus.checking" class="status-badge loading">
          ⏳ 正在初始化 API...
        </span>
        <span v-else class="status-badge error">
          ✗ API 連接失敗: {{ apiStatus.error }}
        </span>
        
        <!-- API 詳細狀態 -->
        <div class="api-details">
          <span :class="['api-item', { active: apiStatus.webSpeechAvailable }]">
            Web Speech: {{ apiStatus.webSpeechAvailable ? '✓' : '✗' }}
          </span>
          <span :class="['api-item', { active: apiStatus.googleAvailable }]">
            Google: {{ apiStatus.googleAvailable ? '✓' : '✗' }}
          </span>
          <span :class="['api-item', { active: apiStatus.openaiAvailable }]">
            OpenAI: {{ apiStatus.openaiAvailable ? '✓' : '✗' }}
          </span>
        </div>
        
          <!-- 當任一 API 未連線時，顯示輸入框讓使用者手動輸入金鑰 -->
          <div class="api-inputs">
            <div v-if="!apiStatus.googleAvailable" class="api-input">
              <label>Google API Key</label>
              <input type="text" v-model="googleKeyInput" placeholder="輸入 Google API Key" />
              <button class="btn btn-secondary" @click="saveGoogleKey" :disabled="!googleKeyInput || apiStatus.checking">儲存並重試</button>
            </div>

            <div v-if="!apiStatus.openaiAvailable" class="api-input">
              <label>OpenAI API Key</label>
              <input type="text" v-model="openaiKeyInput" placeholder="輸入 OpenAI API Key" />
              <button class="btn btn-secondary" @click="saveOpenAIKey" :disabled="!openaiKeyInput || apiStatus.checking">儲存並重試</button>
            </div>
          </div>
      </div>

      <!-- 引擎選擇器 -->
      <div class="engine-selector">
        <label>選擇轉換引擎：</label>
        <div class="engine-options">
          <button 
            v-for="engine in availableEngines" 
            :key="engine.type"
            @click="selectedEngine = engine.type"
            :class="['engine-btn', { active: selectedEngine === engine.type }]"
            :disabled="!engine.available"
            :title="engine.available ? '' : engine.unavailableReason"
          >
            <span class="engine-name">{{ engine.name }}</span>
            <span class="engine-desc">{{ engine.description }}</span>
            <span v-if="engine.free" class="engine-free">🆓 免費</span>
          </button>
        </div>
      </div>

      <!-- 摘要模型選擇 -->
      <div class="summary-model-selector">
        <label>選擇摘要模型：</label>
        <div class="model-options">
          <button 
            v-for="m in summaryModelsOptions" 
            :key="m.value"
            @click="summaryModel = m.value"
            :class="['model-btn', { active: summaryModel === m.value }]"
            :title="m.value"
          >
            <span class="model-name">{{ m.label }}</span>
          </button>
        </div>
      </div>
    </header>

    <main class="main-content">
      <!-- 錄音控制區 -->
      <div class="recording-section">
        <div class="recording-controls">
          <button 
            v-if="!isRecording" 
            @click="startRecording" 
            class="btn btn-primary"
            :disabled="isProcessing"
          >
            <span class="icon">●</span> 開始錄音
          </button>
          <button 
            v-else 
            @click="stopRecording" 
            class="btn btn-danger"
          >
            <span class="icon">■</span> 停止錄音
          </button>
          
          <div v-if="isRecording" class="recording-indicator">
            <span class="pulse"></span>
            <span>錄音中... {{ recordingTime }}</span>
          </div>
        </div>

        <!-- 檔案上傳區 -->
        <div class="upload-section">
          <div class="upload-label">或上傳音訊檔案：</div>
          <label class="upload-btn">
            <span class="icon">📁</span> 選擇檔案
            <input 
              type="file" 
              @change="handleFileUpload" 
              accept="audio/*"
              :disabled="isProcessing || isRecording"
              style="display: none"
            />
          </label>
          <span v-if="selectedFile" class="file-info">
            📄 {{ selectedFile.name }} ({{ formatFileSize(selectedFile.size) }})
          </span>
        </div>

        <!-- 語言選擇 -->
        <div class="language-selector">
          <label for="language">選擇語言：</label>
          <select id="language" v-model="selectedLanguage" :disabled="isRecording">
            <option value="zh-TW">繁體中文</option>
            <option value="zh-CN">簡體中文</option>
            <option value="en-US">English (US)</option>
            <option value="ja-JP">日本語</option>
            <option value="ko-KR">한국어</option>
          </select>
        </div>
      </div>

      <!-- 處理中提示 -->
      <div v-if="isProcessing" class="processing">
        <div class="spinner"></div>
        <p>{{ processingStatus || '正在處理語音轉文字...' }}</p>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: processingProgress + '%' }"></div>
        </div>
        <span class="progress-text">{{ processingProgress }}%</span>
      </div>

      <!-- 錄音列表 -->
      <div v-if="recordings.length > 0" class="recordings-list">
        <h2>錄音記錄</h2>
          <div v-for="(recording, index) in recordings" :key="index" class="recording-item">
          <div class="recording-header">
            <h3>錄音 {{ recordings.length - index }}</h3>
            <span class="recording-date">{{ recording.date }}</span>
            <span v-if="recording.engine" class="engine-tag">{{ getEngineLabel(recording.engine) }}</span>
          </div>          <!-- 音訊播放器 -->
          <div v-if="recording.audioUrl" class="audio-player">
            <audio :src="recording.audioUrl" controls></audio>
          </div>
          <div v-else class="audio-player no-audio">
            <p>{{ (recording.engine === 'webSpeech' || recording.engine === 'openai') ? '(無法取得音訊)' : '(音訊未保存)' }}</p>
          </div>

          <!-- 轉換後的文字 -->
          <div v-if="recording.transcript" class="transcript">
            <h4>轉換文字：</h4>
            <div class="transcript-content">{{ recording.transcript }}</div>
            
            <!-- 摘要 -->
            <div v-if="recording.summary" class="summary">
              <h4>摘要：</h4>
              <p>{{ recording.summary }}</p>
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div class="recording-actions">
            <button @click="downloadTranscript(recording)" class="btn btn-secondary" :disabled="!recording.transcript">
              <span class="icon">⬇</span> 下載文字
            </button>
            <button @click="generateSummary(recording)" class="btn btn-secondary" :disabled="!recording.transcript || recording.summary">
              <span class="icon">📝</span> 生成摘要
            </button>
            <button @click="deleteRecording(index)" class="btn btn-danger-outline">
              <span class="icon">🗑️</span> 刪除
            </button>
          </div>
        </div>
      </div>

      <!-- 空狀態 -->
      <div v-else class="empty-state">
        <p>尚無錄音記錄，點擊「開始錄音」開始使用</p>
      </div>
    </main>

    <!-- 錯誤訊息 -->
    <div v-if="errorMessage" class="error-toast" @click="errorMessage = ''">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted, reactive, computed } from 'vue'
import SpeechToTextService from './services/speechToText.js'
import { WebSpeechApiService } from './services/webSpeechApi.js'
import OpenAIWhisperService from './services/openaiWhisper.js'
import SummarizeService from './services/summarize.js'
import GoogleSummarizeService from './services/googleSummarize.js'
import { speechToTextConfig } from './config/speechToTextConfig.js'

// API 服務初始化
let speechToTextService = null
let webSpeechService = null
let openaiWhisperService = null
let summarizeService = null
let googleSummarizeService = null
const apiStatus = reactive({
  initialized: false,
  error: null,
  checking: false,
  openaiAvailable: false,
  googleAvailable: false,
  webSpeechAvailable: false,
})

// 初始化 API 服務
const initializeSpeechService = async () => {
  try {
    apiStatus.checking = true
    
    // 初始化 Web Speech API
    webSpeechService = new WebSpeechApiService()
    apiStatus.webSpeechAvailable = webSpeechService.isSupported()
    console.log('✓ Web Speech API 已初始化', apiStatus.webSpeechAvailable ? '(支援)' : '(不支援)')
    
    // 初始化 Google Speech-to-Text API
    const googleKey = speechToTextConfig.googleApiKey
    if (!googleKey || googleKey === 'YOUR_API_KEY_HERE') {
      console.warn('⚠️ Google Speech-to-Text API 密鑰未設定')
      apiStatus.googleAvailable = false
    } else {
      try {
        speechToTextService = new SpeechToTextService(googleKey)
        const isValid = await speechToTextService.validateApiKey()
        apiStatus.googleAvailable = isValid
        if (isValid) {
          console.log('✓ Google Speech-to-Text API 已驗證')
        } else {
          console.warn('⚠️ Google API 密鑰無效')
          speechToTextService = null
        }
      } catch (error) {
        console.error('✗ Google API 初始化失敗:', error.message)
        speechToTextService = null
        apiStatus.googleAvailable = false
      }
      // 無論 Speech-to-Text 是否能初始化，只要有 Google Key 就可以建立 GoogleSummarizeService
      try {
        googleSummarizeService = new GoogleSummarizeService(googleKey)
        console.log('GoogleSummarizeService 已建立')
      } catch (e) {
        console.warn('無法建立 GoogleSummarizeService:', e.message)
        googleSummarizeService = null
      }
    }

    // 初始化 OpenAI Whisper API
    const openaiKey = speechToTextConfig.openaiApiKey
    console.log('=== OpenAI API 初始化 ===')
    console.log('OpenAI Key 狀態:', openaiKey ? '已設定 (長度: ' + openaiKey.length + ')' : '未設定')
    console.log('Key 有效性檢查:', openaiKey && openaiKey !== 'YOUR_API_KEY_HERE' ? '通過' : '失敗')
    
    if (!openaiKey || openaiKey === 'YOUR_API_KEY_HERE') {
      console.warn('⚠️ OpenAI API 密鑰未設定 - 將禁用 OpenAI 引擎')
      apiStatus.openaiAvailable = false
    } else {
      try {
        console.log('📡 正在驗證 OpenAI API 密鑰...')
        openaiWhisperService = new OpenAIWhisperService(openaiKey)
        const isValid = await openaiWhisperService.validateApiKey()
        apiStatus.openaiAvailable = isValid
        console.log('API 驗證結果:', isValid ? '✓ 成功' : '✗ 失敗')
        
        if (isValid) {
          console.log('✓ OpenAI Whisper API 已驗證並初始化成功')
        } else {
          console.warn('⚠️ OpenAI API 密鑰無效或已過期')
          openaiWhisperService = null
        }
      } catch (error) {
        console.error('✗ OpenAI API 初始化失敗:', error.message)
        console.error('詳細錯誤:', error)
        openaiWhisperService = null
        apiStatus.openaiAvailable = false
      }
      // 無論 Whisper 是否能初始化，只要有 OpenAI Key 就可以建立 SummarizeService
      try {
        summarizeService = new SummarizeService(openaiKey)
        console.log('SummarizeService 已建立')
      } catch (e) {
        console.warn('無法建立 SummarizeService:', e.message)
        summarizeService = null
      }
    }
    console.log('=== OpenAI 初始化完成 ===')
    console.log('OpenAI 服務狀態:', openaiWhisperService ? '✓ 已初始化' : '✗ 未初始化')

    // 設定初始化狀態 (只要有任何 API 可用就算初始化成功)
    const hasApiAvailable = apiStatus.googleAvailable || apiStatus.openaiAvailable || apiStatus.webSpeechAvailable
    apiStatus.initialized = hasApiAvailable
    apiStatus.error = hasApiAvailable ? null : '無可用的 API 服務'
    
    console.log('API 初始化完成:', {
      webSpeech: apiStatus.webSpeechAvailable,
      google: apiStatus.googleAvailable,
      openai: apiStatus.openaiAvailable,
      initialized: apiStatus.initialized
    })
  } catch (error) {
    console.error('✗ 初始化失敗:', error)
    apiStatus.error = error.message || '無法初始化 API 服務'
    apiStatus.initialized = false
  } finally {
    apiStatus.checking = false
  }
}

// 在元件掛載時初始化
if (import.meta.hot) {
  import.meta.hot.accept()
}
initializeSpeechService()

// 狀態管理
const isRecording = ref(false)
const isProcessing = ref(false)
const recordings = ref([])
const selectedLanguage = ref('zh-TW')
const selectedEngine = ref('webSpeech') // 預設使用 Web Speech API
// 摘要模型設定
const summaryModel = ref('gpt-3.5-turbo')
const summaryModelsOptions = ref([
  { value: 'gpt-4o-mini', label: 'OpenAI: gpt-4o-mini (快速)' },
  { value: 'gpt-4o', label: 'OpenAI: gpt-4o (高品質)' },
  { value: 'gpt-3.5-turbo', label: 'OpenAI: gpt-3.5-turbo (成本較低)' },
  { value: 'gemini-2.5-flash-lite', label: 'Google: Gemini 2.5 Flash Lite (成本低、快速)' },
  { value: 'gemini-2.5-flash', label: 'Google: Gemini 2.5 Flash (高品質)' }
])
const recordingTime = ref('00:00')
const errorMessage = ref('')
const processingStatus = ref('')
const processingProgress = ref(0)
const selectedFile = ref(null) // 上傳的檔案
// API key inputs (allow user to enter keys at runtime)
const googleKeyInput = ref(speechToTextConfig.googleApiKey && speechToTextConfig.googleApiKey !== 'YOUR_API_KEY_HERE' ? speechToTextConfig.googleApiKey : '')
const openaiKeyInput = ref(speechToTextConfig.openaiApiKey && speechToTextConfig.openaiApiKey !== 'YOUR_API_KEY_HERE' ? speechToTextConfig.openaiApiKey : '')

const saveGoogleKey = async () => {
  if (!googleKeyInput.value) return
  // 更新配置並重新初始化
  speechToTextConfig.googleApiKey = googleKeyInput.value
  apiStatus.checking = true
  apiStatus.error = null
  await initializeSpeechService()
}

const saveOpenAIKey = async () => {
  if (!openaiKeyInput.value) return
  speechToTextConfig.openaiApiKey = openaiKeyInput.value
  apiStatus.checking = true
  apiStatus.error = null
  await initializeSpeechService()
}

// 計算可用引擎
const availableEngines = computed(() => {
  const engines = []
  
  // Web Speech API 總是可用
  engines.push({
    type: 'webSpeech',
    name: '⚡ 快速轉換',
    description: 'Web Speech API - 免費、無限長度',
    available: apiStatus.webSpeechAvailable,
    free: true,
    unavailableReason: apiStatus.webSpeechAvailable ? '可用' : '此瀏覽器不支援 Web Speech API'
  })
  
  // Google Speech-to-Text API
  engines.push({
    type: 'google',
    name: '🎯 精準轉換',
    description: 'Google Speech-to-Text - 高精度',
    available: apiStatus.googleAvailable,
    free: false,
    unavailableReason: apiStatus.googleAvailable ? '可用' : 'Google API 密鑰未設定或無效'
  })

  // OpenAI Whisper API
  engines.push({
    type: 'openai',
    name: '🚀 超強轉換',
    description: 'OpenAI Whisper - 無限長度、自動分割',
    available: apiStatus.openaiAvailable,
    free: false,
    unavailableReason: apiStatus.openaiAvailable ? '可用' : 'OpenAI API 密鑰未設定或無效'
  })
  
  return engines
})

// 錄音相關變數
let mediaRecorder = null
let audioChunks = []
let recordingTimer = null
let recordingStartTime = 0

// 開始錄音
const startRecording = async () => {
  try {
    if (selectedEngine.value === 'webSpeech') {
      // 使用 Web Speech API
      startWebSpeechRecording()
    } else if (selectedEngine.value === 'google') {
      // 使用 Google 的傳統錄音方式
      startGoogleRecording()
    } else if (selectedEngine.value === 'openai') {
      // 使用 OpenAI Whisper 錄音（先錄製本地音訊，再上傳至 Whisper）
      startOpenAIRecording()
    }
  } catch (error) {
    console.error('錄音失敗:', error)
    errorMessage.value = '無法存取麥克風，請檢查瀏覽器權限設定'
  }
}

// Web Speech API 錄音
const startWebSpeechRecording = () => {
  isRecording.value = true
  recordingStartTime = Date.now()
  
  // 先設定狀態
  isProcessing.value = true
  processingStatus.value = '正在監聽...'
  processingProgress.value = 20

  try {
    webSpeechService.start(
      selectedLanguage.value,
      // 實時更新回調
      (update) => {
        processingStatus.value = `正在識別... 信心度: ${(update.confidence * 100).toFixed(0)}%`
        processingProgress.value = 30 + (update.confidence * 50)
      },
      // 完成回調
      (result) => {
        isRecording.value = false
        if (recordingTimer) {
          clearInterval(recordingTimer)
          recordingTimer = null
        }
        recordingTime.value = '00:00'
        
        // 保存結果
        if (result.transcript && result.transcript.trim()) {
          const recording = {
            transcript: result.transcript,
            audioBlob: null, // Web Speech API 無法取得音訊
            audioUrl: null,
            summary: null,
            date: new Date().toLocaleString('zh-TW'),
            language: selectedLanguage.value,
            engine: 'webSpeech'
          }
          
          recordings.value.unshift(recording)
          errorMessage.value = '' // 清除錯誤
        } else {
          errorMessage.value = 'Web Speech API: 未識別到任何文字'
        }
        
        isProcessing.value = false
        processingStatus.value = ''
        processingProgress.value = 0
      },
      // 錯誤回調
      (error) => {
        isRecording.value = false
        if (recordingTimer) {
          clearInterval(recordingTimer)
          recordingTimer = null
        }
        recordingTime.value = '00:00'
        
        console.error('Web Speech API 錯誤:', error)
        errorMessage.value = `Web Speech 錯誤: ${error.message}`
        
        isProcessing.value = false
        processingStatus.value = ''
        processingProgress.value = 0
      }
    )
  } catch (error) {
    console.error('啟動 Web Speech API 失敗:', error)
    errorMessage.value = `啟動錯誤: ${error.message}`
    isRecording.value = false
    isProcessing.value = false
    if (recordingTimer) {
      clearInterval(recordingTimer)
      recordingTimer = null
    }
  }

  // 開始計時
  recordingTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000)
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0')
    const seconds = (elapsed % 60).toString().padStart(2, '0')
    recordingTime.value = `${minutes}:${seconds}`
  }, 1000)
}

// Google Speech-to-Text 錄音
const startGoogleRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  
  mediaRecorder = new MediaRecorder(stream)
  audioChunks = []
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data)
    }
  }
  
  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
    const audioUrl = URL.createObjectURL(audioBlob)
    
    // 停止所有音軌
    stream.getTracks().forEach(track => track.stop())
    
    // 處理語音轉文字
    await processAudioToText(audioBlob, audioUrl)
  }
  
  mediaRecorder.start()
  isRecording.value = true
  recordingStartTime = Date.now()
  
  // 開始計時
  recordingTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000)
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0')
    const seconds = (elapsed % 60).toString().padStart(2, '0')
    recordingTime.value = `${minutes}:${seconds}`
  }, 1000)
}

// OpenAI 錄音：與 Google 類似，錄製音訊然後上傳到 OpenAI Whisper
const startOpenAIRecording = async () => {
  if (!openaiWhisperService) {
    errorMessage.value = 'OpenAI Whisper 服務未初始化或金鑰無效'
    return
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

  mediaRecorder = new MediaRecorder(stream)
  audioChunks = []

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data)
    }
  }

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
    const audioUrl = URL.createObjectURL(audioBlob)

    // 停止所有音軌
    stream.getTracks().forEach(track => track.stop())

    // 使用 OpenAI Whisper 轉錄
    await processAudioToTextOpenAI(audioBlob, audioUrl)
  }

  mediaRecorder.start()
  isRecording.value = true
  recordingStartTime = Date.now()

  // 開始計時
  recordingTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000)
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0')
    const seconds = (elapsed % 60).toString().padStart(2, '0')
    recordingTime.value = `${minutes}:${seconds}`
  }, 1000)
}

// 停止錄音
const stopRecording = () => {
  if (selectedEngine.value === 'webSpeech') {
    webSpeechService.stop()
    isRecording.value = false
  } else if (selectedEngine.value === 'google') {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      isRecording.value = false
    }
  } else if (selectedEngine.value === 'openai') {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
      isRecording.value = false
    }
  }
  
  if (recordingTimer) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }
  recordingTime.value = '00:00'
}

// 使用 OpenAI Whisper 轉錄錄製好的音訊
const processAudioToTextOpenAI = async (audioBlob, audioUrl) => {
  if (!apiStatus.initialized || !openaiWhisperService) {
    errorMessage.value = 'OpenAI Whisper 服務未初始化，請檢查配置'
    const recording = {
      audioUrl,
      audioBlob,
      transcript: '[等待 OpenAI 初始化]',
      summary: null,
      date: new Date().toLocaleString('zh-TW'),
      language: selectedLanguage.value,
      engine: 'openai'
    }
    recordings.value.unshift(recording)
    return
  }

  isProcessing.value = true
  processingStatus.value = '準備音訊檔案...'
  processingProgress.value = 0

  try {
    const languageCode = selectedLanguage.value.split('-')[0]
    const transcript = await openaiWhisperService.transcribeAudio(
      audioBlob,
      languageCode,
      (progress) => {
        processingStatus.value = progress.status
        processingProgress.value = progress.progress
      }
    )

    const recording = {
      audioUrl,
      audioBlob,
      transcript,
      summary: null,
      date: new Date().toLocaleString('zh-TW'),
      language: selectedLanguage.value,
      engine: 'openai'
    }

    recordings.value.unshift(recording)
    errorMessage.value = ''
  } catch (error) {
    console.error('OpenAI 轉換失敗:', error)
    errorMessage.value = `語音轉文字失敗: ${error.message}`

    const recording = {
      audioUrl,
      audioBlob,
      transcript: `[轉換失敗] ${error.message}`,
      summary: null,
      date: new Date().toLocaleString('zh-TW'),
      language: selectedLanguage.value,
      engine: 'openai'
    }
    recordings.value.unshift(recording)
  } finally {
    isProcessing.value = false
    processingStatus.value = ''
    processingProgress.value = 0
  }
}

// 處理語音轉文字
const processAudioToText = async (audioBlob, audioUrl) => {
  if (!apiStatus.initialized) {
    errorMessage.value = 'Google API 服務未初始化，請檢查配置'
    // 即使 API 初始化失敗，仍保存錄音
    const recording = {
      audioUrl,
      audioBlob,
      transcript: '[等待 API 初始化]',
      summary: null,
      date: new Date().toLocaleString('zh-TW'),
      language: selectedLanguage.value,
      engine: 'google'
    }
    recordings.value.unshift(recording)
    return
  }

  isProcessing.value = true
  processingStatus.value = '準備音訊檔案...'
  processingProgress.value = 0

  try {
    // 轉換音訊檔案（如需要）
    const processedAudio = await speechToTextService.convertAudioFormat(audioBlob)

    // 使用 Google Speech-to-Text API 轉換
    const transcript = await speechToTextService.transcribeAudio(
      processedAudio,
      selectedLanguage.value,
      (progress) => {
        processingStatus.value = progress.status
        processingProgress.value = progress.progress
      }
    )

    const recording = {
      audioUrl,
      audioBlob,
      transcript,
      summary: null,
      date: new Date().toLocaleString('zh-TW'),
      language: selectedLanguage.value,
      engine: 'google'
    }

    recordings.value.unshift(recording)
  } catch (error) {
    console.error('轉換失敗:', error)
    errorMessage.value = `語音轉文字失敗: ${error.message}`

    // 即使轉換失敗，仍保存錄音
    const recording = {
      audioUrl,
      audioBlob,
      transcript: `[轉換失敗] ${error.message}`,
      summary: null,
      date: new Date().toLocaleString('zh-TW'),
      language: selectedLanguage.value,
      engine: 'google'
    }
    recordings.value.unshift(recording)
  } finally {
    isProcessing.value = false
    processingStatus.value = ''
    processingProgress.value = 0
  }
}

// 使用 Google Speech-to-Text API 轉換語音
const transcribeAudio = async (audioBlob) => {
  if (!speechToTextService) {
    throw new Error('API 服務未初始化')
  }
  return await speechToTextService.transcribeAudio(audioBlob, selectedLanguage.value)
}

// 下載轉換文字
const downloadTranscript = (recording) => {
  if (!recording.transcript) {
    errorMessage.value = '沒有可下載的文字'
    return
  }
  
  try {
    const engineLabel = getEngineLabel(recording.engine)
    const text = `錄音日期: ${recording.date}
語言: ${recording.language}
引擎: ${engineLabel}

轉換文字:
${recording.transcript}

${recording.summary ? '摘要:\n' + recording.summary : ''}`
    
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    
    // 生成安全的檔名 (移除所有特殊字符)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
    a.download = `錄音文字_${timestamp}.txt`
    
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    
    // 延遲釋放 URL，確保下載完成
    setTimeout(() => URL.revokeObjectURL(url), 100)
    
    errorMessage.value = '' // 清除任何錯誤
  } catch (error) {
    console.error('下載失敗:', error)
    errorMessage.value = `下載失敗: ${error.message}`
  }
}

// 獲取引擎標籤
const getEngineLabel = (engine) => {
  const labels = {
    'webSpeech': '⚡ Web Speech',
    'google': '🎯 Google',
    'openai': '🚀 OpenAI'
  }
  return labels[engine] || engine
}

// 生成摘要（使用 SummarizeService 或 GoogleSummarizeService）
const generateSummary = async (recording) => {
  if (!recording.transcript || recording.summary) return

  // 判斷使用的 API 服務
  const isGoogleModel = summaryModel.value.startsWith('gemini')
  const service = isGoogleModel ? googleSummarizeService : summarizeService

  if (!service) {
    const apiName = isGoogleModel ? 'Google' : 'OpenAI'
    errorMessage.value = `摘要服務未初始化或 ${apiName} API Key 未設定`
    return
  }

  try {
    // 顯示暫時狀態
    recording.summary = '正在生成摘要...'
    const prevProcessing = isProcessing.value
    isProcessing.value = true
    processingStatus.value = `使用 ${summaryModel.value} 生成摘要...`
    processingProgress.value = 10

    // 建議的 options，可依需求調整
    const options = {
      temperature: 0.2,
      max_tokens: 400,
      userPrompt: `請以繁體中文摘要以下內容，列出重點與結論，盡量以條列方式呈現：\n\n${recording.transcript}`
    }

    const summary = await service.summarizeText(recording.transcript, summaryModel.value, options)

    recording.summary = summary || '[AI 未回傳摘要]'
    processingStatus.value = ''
    processingProgress.value = 0
    isProcessing.value = prevProcessing
  } catch (error) {
    console.error('摘要失敗:', error)
    recording.summary = `[摘要失敗] ${error.message}`
    errorMessage.value = `摘要失敗: ${error.message}`
    isProcessing.value = false
    processingStatus.value = ''
    processingProgress.value = 0
  }
}

// 刪除錄音
const deleteRecording = (index) => {
  if (confirm('確定要刪除這筆錄音嗎?')) {
    // 釋放 URL
    if (recordings.value[index].audioUrl) {
      URL.revokeObjectURL(recordings.value[index].audioUrl)
    }
    recordings.value.splice(index, 1)
  }
}

// 格式化檔案大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// 處理檔案上傳
const handleFileUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  // 驗證檔案類型
  if (!file.type.startsWith('audio/')) {
    errorMessage.value = '請選擇有效的音訊檔案（支援 MP3、WAV、WebM、OGG、FLAC 等）'
    event.target.value = '' // 清除選擇
    return
  }
  
  // 驗證檔案大小 (限制 100MB)
  if (file.size > 100 * 1024 * 1024) {
    errorMessage.value = '檔案太大，請選擇 100MB 以下的檔案'
    event.target.value = ''
    return
  }
  
  selectedFile.value = file
  console.log(`檔案選擇: ${file.name}, 類型: ${file.type}, 大小: ${formatFileSize(file.size)}`)
  
  // 自動開始轉換
  await processUploadedFile(file)
  
  // 清除選擇以允許重新上傳同一檔案
  event.target.value = ''
}

// 處理上傳的檔案
const processUploadedFile = async (file) => {
  if (!selectedEngine.value) {
    errorMessage.value = '請先選擇轉換引擎'
    return
  }
  
  isProcessing.value = true
  processingStatus.value = `準備檔案... (${file.name})`
  processingProgress.value = 10
  
  try {
    const audioBlob = file
    const audioUrl = URL.createObjectURL(file)
    
    if (selectedEngine.value === 'webSpeech') {
      // Web Speech API 不支援檔案上傳
      errorMessage.value = 'Web Speech API 不支援檔案上傳，請使用「🎯 精準轉換」或「🚀 超強轉換」引擎'
      isProcessing.value = false
      selectedFile.value = null
      return
    }

    let transcript
    
    if (selectedEngine.value === 'google') {
      if (!speechToTextService) {
        errorMessage.value = 'Google API 服務未初始化，請檢查 API 金鑰設定'
        isProcessing.value = false
        selectedFile.value = null
        return
      }
      
      console.log(`開始轉換: 語言=${selectedLanguage.value}, 引擎=Google`)
      
      // 使用 Google Speech-to-Text API 轉換
      processingStatus.value = `正在轉換 "${file.name}"...`
      processingProgress.value = 30
      
      transcript = await speechToTextService.transcribeAudio(
        audioBlob,
        selectedLanguage.value,
        (progress) => {
          processingStatus.value = `${progress.status} - ${file.name}`
          processingProgress.value = progress.progress
        }
      )
    } else if (selectedEngine.value === 'openai') {
      if (!openaiWhisperService) {
        errorMessage.value = 'OpenAI Whisper 服務未初始化，請檢查 API 金鑰設定'
        isProcessing.value = false
        selectedFile.value = null
        return
      }
      
      console.log(`開始轉換: 語言=${selectedLanguage.value}, 引擎=OpenAI Whisper`)
      
      // 使用 OpenAI Whisper API 轉換 (支援大檔案分割)
      processingStatus.value = `正在轉換 "${file.name}"...`
      processingProgress.value = 30
      
      // 將語言代碼轉換為 Whisper 支援的格式 (例如 zh-TW -> zh)
      const languageCode = selectedLanguage.value.split('-')[0]
      
      transcript = await openaiWhisperService.transcribeAudio(
        audioBlob,
        languageCode,
        (progress) => {
          processingStatus.value = `${progress.status} - ${file.name}`
          processingProgress.value = progress.progress
        }
      )
    }
    
    console.log(`轉換成功，結果長度: ${transcript.length} 字符`)
    
    const recording = {
      audioUrl,
      audioBlob,
      transcript,
      summary: null,
      date: new Date().toLocaleString('zh-TW'),
      language: selectedLanguage.value,
      engine: selectedEngine.value,
      fileName: file.name
    }
    
    recordings.value.unshift(recording)
    selectedFile.value = null
    errorMessage.value = '' // 清除錯誤
    
  } catch (error) {
    console.error('檔案轉換失敗詳細信息:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      error: error.message,
      stack: error.stack
    })
    
    errorMessage.value = `轉換失敗: ${error.message}`
    selectedFile.value = null
    
    // 即使失敗也保存錄音紀錄
    const recording = {
      audioUrl: URL.createObjectURL(file),
      audioBlob: file,
      transcript: `[轉換失敗] ${error.message}\n\n檔案: ${file.name}\n類型: ${file.type}`,
      summary: null,
      date: new Date().toLocaleString('zh-TW'),
      language: selectedLanguage.value,
      engine: selectedEngine.value,
      fileName: file.name
    }
    recordings.value.unshift(recording)
    
  } finally {
    isProcessing.value = false
    processingStatus.value = ''
    processingProgress.value = 0
  }
}

// 清理資源
onUnmounted(() => {
  if (recordingTimer) {
    clearInterval(recordingTimer)
  }
  recordings.value.forEach(recording => {
    if (recording.audioUrl) {
      URL.revokeObjectURL(recording.audioUrl)
    }
  })
})
</script>
