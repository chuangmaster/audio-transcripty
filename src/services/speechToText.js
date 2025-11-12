/**
 * Google Speech-to-Text API 服務
 * 前端集成版本
 */

import { speechToTextConfig } from '../config/speechToTextConfig.js'

class SpeechToTextService {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseUrl = 'https://speech.googleapis.com/v1/speech:recognize'
  }

  /**
   * 根據語言代碼獲取支援的模型
   * @param {string} languageCode - 語言代碼
   * @returns {string} 模型名稱
   */
  getModelForLanguage(languageCode) {
    // latest_long 模型支援的語言列表 (主要是英語和歐洲語言)
    const latestLongSupportedLanguages = [
      'en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE', 
      'it-IT', 'pt-BR', 'ru-RU', 'ja-JP'
    ]
    
    // 如果是支援的語言，使用 latest_long；否則使用預設模型
    if (latestLongSupportedLanguages.includes(languageCode)) {
      return 'latest_long'
    } else {
      // 中文、韓文、越南文等使用預設模型
      return 'default'
    }
  }

  /**
   * 轉換音訊為文字
   * @param {Blob} audioBlob - 音訊檔案
   * @param {string} languageCode - 語言代碼 (例如: zh-TW, en-US)
   * @param {Function} onProgress - 進度回呼函數
   * @returns {Promise<string>} 轉換結果
   */
  async transcribeAudio(audioBlob, languageCode = 'zh-TW', onProgress = null) {
    try {
      // 將音訊 Blob 轉換為 Base64
      onProgress?.({ status: '準備音訊檔案...', progress: 10 })
      const base64Audio = await this.blobToBase64(audioBlob)
      
      // 移除 data:audio/...;base64, 前綴
      const audioContent = base64Audio.split(',')[1]
      
      onProgress?.({ status: '上傳至 Google API...', progress: 30 })
      
      // 自動偵測音訊編碼
      const encoding = this.getAudioEncoding(audioBlob.type)
      
      // 構建請求
      // 注意: WebM Opus 格式的 MediaRecorder 預設採樣率為 48000Hz
      const requestBody = {
        config: {
          encoding: encoding,
          // 只有在使用 PCM 相關格式時才明確指定採樣率
          // 對於 WebM Opus、MP3、FLAC 等，讓 API 自動偵測
          ...(encoding.includes('LINEAR') && { sampleRateHertz: 48000 }),
          languageCode: languageCode,
          enableAutomaticPunctuation: true,
          model: this.getModelForLanguage(languageCode), // 根據語言選擇合適的模型
          useEnhanced: true,
        },
        audio: {
          content: audioContent,
        },
      }

      onProgress?.({ status: '等待 API 回應...', progress: 50 })
      
      // 發送請求到 Google Speech-to-Text API
      const response = await fetch(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`API 錯誤: ${error.error?.message || '未知錯誤'}`)
      }

      onProgress?.({ status: '處理結果...', progress: 80 })
      const result = await response.json()

      if (result.results && result.results.length > 0) {
        const transcript = result.results
          .map(result => 
            result.alternatives[0]?.transcript || ''
          )
          .join(' ')
        
        onProgress?.({ status: '完成', progress: 100 })
        return transcript
      } else {
        throw new Error('無法識別音訊內容，請確保音訊清晰')
      }
    } catch (error) {
      console.error('語音轉文字錯誤:', error)
      throw error
    }
  }

  /**
   * 轉換 Blob 為 Base64
   * @param {Blob} blob - 檔案 Blob
   * @returns {Promise<string>} Base64 字符串
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  /**
   * 獲取音訊編碼格式
   * @param {string} mimeType - MIME 類型
   * @returns {string} 編碼格式
   */
  getAudioEncoding(mimeType) {
    // 標準化 MIME 類型 (移除編碼參數)
    const cleanMimeType = mimeType?.split(';')[0]?.toLowerCase() || ''
    
    const encodingMap = {
      'audio/webm': 'WEBM_OPUS',
      'audio/mpeg': 'MP3',
      'audio/mp3': 'MP3',
      'audio/wav': 'LINEAR16',
      'audio/x-wav': 'LINEAR16',
      'audio/ogg': 'OGG_OPUS',
      'audio/opus': 'OGG_OPUS',
      'audio/flac': 'FLAC',
      'audio/x-flac': 'FLAC',
      'audio/x-mulaw': 'MULAW',
      'audio/x-raw': 'LINEAR16',
      'audio/aac': 'MP3', // AAC 用 MP3 編碼支援
      'audio/x-m4a': 'MP3',
      'audio/mp4': 'MP3',
    }
    
    const encoding = encodingMap[cleanMimeType]
    
    if (encoding) {
      console.log(`偵測到音訊格式: ${cleanMimeType} → ${encoding}`)
      return encoding
    }
    
    // 如果找不到，根據副檔名猜測
    console.warn(`未知的音訊格式: ${cleanMimeType}, 預設使用 WEBM_OPUS`)
    return 'WEBM_OPUS'
  }

  /**
   * 驗證 API 密鑰
   * @returns {Promise<boolean>}
   */
  async validateApiKey() {
    try {
      const response = await fetch(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: { languageCode: 'zh-TW' },
            audio: { content: '' },
          }),
        }
      )
      // 嘗試讀取並解析回應 body，以辨識常見的『金鑰無效』錯誤訊息
      let bodyText = ''
      let jsonBody = null
      try {
        bodyText = await response.text()
        try { jsonBody = JSON.parse(bodyText) } catch (e) { /* not json */ }
      } catch (err) {
        bodyText = `<unable to read body: ${err.message}>`
      }

      // 如果啟用嚴格驗證，只接受 HTTP 2xx
      if (speechToTextConfig.strictValidation) {
        return response.ok
      }

      // 如果回傳 401/403 則肯定無效
      if (response.status === 401 || response.status === 403) {
        return false
      }

      // 嘗試從回傳內容判定是否明確說明金鑰無效
      const message = (
        (jsonBody && (jsonBody.error?.message || jsonBody.message)) ||
        String(bodyText || '')
      ).toLowerCase()

      const invalidPatterns = [
        'api key not valid',
        'invalid api key',
        'api key is invalid',
        'invalid api key',
        'not authorized',
        'forbidden',
        'permission denied',
        'request had invalid authentication credentials'
      ]

      for (const p of invalidPatterns) {
        if (message.includes(p)) {
          return false
        }
      }

      // 其他狀況: 若為 2xx 視為有效；若為 400 且沒有明確指出金鑰問題，視為可能有效
      if (response.ok) return true
      if (response.status === 400) return true

      // 預設回傳 false（保守）
      return false
    } catch (error) {
      console.error('API 密鑰驗證失敗:', error)
      return false
    }
  }

  /**
   * 轉換音訊格式 (如需要)
   * @param {Blob} audioBlob - 原始音訊 Blob
   * @returns {Promise<Blob>} 轉換後的 Blob
   */
  async convertAudioFormat(audioBlob) {
    // 如果已經是支援的格式，直接返回
    if (['audio/webm', 'audio/wav', 'audio/flac'].includes(audioBlob.type)) {
      return audioBlob
    }
    
    // 其他格式暫時直接使用 (實際應用中可使用 ffmpeg.js 進行轉換)
    return audioBlob
  }
}

export default SpeechToTextService
