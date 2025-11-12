/**
 * OpenAI Whisper API 服務
 * 支援大檔案分割和批次上傳
 */

import { speechToTextConfig } from '../config/speechToTextConfig.js'

class OpenAIWhisperService {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseUrl = 'https://api.openai.com/v1'
    this.maxFileSize = 25 * 1024 * 1024 // OpenAI 限制 25MB
    this.maxDurationPerChunk = 10 * 60 * 1000 // 10 分鐘 (毫秒)
  }

  /**
   * 驗證 API 密鑰
   * @returns {Promise<boolean>}
   */
  async validateApiKey() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      })

      // 嘗試讀取並解析回應 body
      let bodyText = ''
      let jsonBody = null
      try {
        bodyText = await response.text()
        try { jsonBody = JSON.parse(bodyText) } catch (e) { /* not json */ }
      } catch (err) {
        bodyText = `<unable to read body: ${err.message}>`
      }

      if (speechToTextConfig.strictValidation) {
        return response.ok
      }

      // 如果 HTTP 回傳 401/403 或回應 body 明確指出金鑰無效，回傳 false
      if (response.status === 401 || response.status === 403) return false

      const message = (
        (jsonBody && (jsonBody.error?.message || jsonBody.message)) ||
        String(bodyText || '')
      ).toLowerCase()

      if (message.includes('invalid') || message.includes('invalid api key') || message.includes('invalid_api_key') || message.includes('unauthorized')) {
        return false
      }

      // 其他情況以 response.ok 判定
      return response.ok
    } catch (error) {
      console.error('API 密鑰驗證失敗:', error)
      return false
    }
  }

  /**
   * 轉換音訊為文字
   * @param {Blob} audioBlob - 音訊檔案
   * @param {string} languageCode - 語言代碼 (例如: zh)
   * @param {Function} onProgress - 進度回呼函數
   * @returns {Promise<string>} 轉換結果
   */
  async transcribeAudio(audioBlob, languageCode = 'zh', onProgress = null) {
    try {
      // 檢查音訊時長和檔案大小
      const duration = await this.getAudioDuration(audioBlob)
      const fileSize = audioBlob.size
      
      onProgress?.({ 
        status: `音訊時長: ${this.formatDuration(duration)}, 大小: ${this.formatFileSize(fileSize)}`, 
        progress: 5 
      })

      // 如果檔案超過 25MB 或時長超過 10 分鐘，進行分割
      const needsSplitting = fileSize > this.maxFileSize || duration > this.maxDurationPerChunk
      
      if (needsSplitting) {
        console.log(`需要分割: 檔案大小=${this.formatFileSize(fileSize)}, 時長=${this.formatDuration(duration)}`)
        return await this.transcribeChunkedAudio(
          audioBlob, 
          duration, 
          languageCode, 
          onProgress
        )
      } else {
        // 直接上傳
        onProgress?.({ 
          status: '上傳音訊至 OpenAI Whisper...', 
          progress: 20 
        })
        
        const transcript = await this.uploadAndTranscribe(
          audioBlob, 
          languageCode
        )
        
        onProgress?.({ 
          status: '轉換完成', 
          progress: 100 
        })
        
        return transcript
      }
    } catch (error) {
      console.error('Whisper 轉換錯誤:', error)
      throw error
    }
  }

  /**
   * 分割音訊並批次轉換
   * @param {Blob} audioBlob - 原始音訊
   * @param {number} totalDuration - 總時長 (毫秒)
   * @param {string} languageCode - 語言代碼
   * @param {Function} onProgress - 進度回呼
   * @returns {Promise<string>} 合併後的轉錄文本
   */
  async transcribeChunkedAudio(audioBlob, totalDuration, languageCode, onProgress) {
    // 根據檔案大小和時長計算需要分割的片段數
    const fileSize = audioBlob.size
    
    // 計算基於檔案大小的片段數 (每個片段最多 20MB，留一些緩衝)
    const chunksBySize = Math.ceil(fileSize / (20 * 1024 * 1024))
    
    // 計算基於時長的片段數
    const chunksByDuration = Math.ceil(totalDuration / this.maxDurationPerChunk)
    
    // 取較大值確保兩個條件都滿足
    const chunkCount = Math.max(chunksBySize, chunksByDuration)
    
    console.log(`分割計算:`, {
      檔案大小: this.formatFileSize(fileSize),
      時長: this.formatDuration(totalDuration),
      基於大小需要: chunksBySize,
      基於時長需要: chunksByDuration,
      最終分割數: chunkCount
    })
    
    onProgress?.({ 
      status: `將分割成 ${chunkCount} 個片段 (檔案: ${this.formatFileSize(fileSize)}, 時長: ${this.formatDuration(totalDuration)})`, 
      progress: 10 
    })

    // 使用時間切割音訊 (保持音訊完整性)
    const audioChunks = await this.splitAudioByTime(audioBlob, totalDuration, chunkCount)
    
    console.log(`分割完成: ${audioChunks.length} 個片段`)
    
    // 驗證每個片段大小
    audioChunks.forEach((chunk, i) => {
      console.log(`片段 ${i + 1}: ${this.formatFileSize(chunk.size)}`)
      if (chunk.size > this.maxFileSize) {
        console.warn(`⚠️ 片段 ${i + 1} 仍然超過 25MB (${this.formatFileSize(chunk.size)})`)
      }
    })

    // 批次上傳並轉換
    const transcripts = []
    const totalChunks = audioChunks.length

    for (let i = 0; i < totalChunks; i++) {
      const chunk = audioChunks[i]
      const progressPercentage = 20 + (i / totalChunks) * 70
      
      onProgress?.({ 
        status: `轉換片段 ${i + 1}/${totalChunks} (${this.formatFileSize(chunk.size)})`,
        progress: Math.floor(progressPercentage)
      })

      try {
        const transcript = await this.uploadAndTranscribe(
          chunk,
          languageCode,
          `chunk_${i + 1}`
        )
        
        transcripts.push(transcript)
        console.log(`片段 ${i + 1} 完成: ${transcript.length} 字`)
      } catch (error) {
        console.error(`片段 ${i + 1} 轉換失敗:`, error)
        throw new Error(`片段 ${i + 1} 轉換失敗: ${error.message}`)
      }
    }

    onProgress?.({ 
      status: '合併轉換結果...', 
      progress: 95 
    })

    // 合併所有片段的轉錄文本
    const finalTranscript = transcripts.join(' ')
    
    onProgress?.({ 
      status: '轉換完成', 
      progress: 100 
    })

    return finalTranscript
  }

  /**
   * 按時間分割音訊 (使用 Web Audio API)
   * @param {Blob} audioBlob - 原始音訊
   * @param {number} totalDuration - 總時長 (毫秒)
   * @param {number} chunkCount - 片段數
   * @returns {Promise<Blob[]>} 分割後的音訊片段
   */
  async splitAudioByTime(audioBlob, totalDuration, chunkCount) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      
      console.log(`開始分割音訊: 原始大小=${this.formatFileSize(audioBlob.size)}, 片段數=${chunkCount}`)
      
      // 解碼音訊
      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      const chunks = []
      const totalSamples = audioBuffer.getChannelData(0).length
      const samplesPerChunk = Math.ceil(totalSamples / chunkCount)
      const sampleRate = audioBuffer.sampleRate

      // 目標: 每個片段使用較低採樣率來減小 WAV 檔案大小
      const targetSampleRate = Math.min(sampleRate, 16000) // 降低到 16kHz
      
      for (let i = 0; i < chunkCount; i++) {
        const startSample = i * samplesPerChunk
        const endSample = Math.min(startSample + samplesPerChunk, totalSamples)
        
        // 計算重採樣後的樣本數
        const originalLength = endSample - startSample
        const resampledLength = Math.floor(originalLength * targetSampleRate / sampleRate)
        
        const chunkBuffer = audioContext.createBuffer(
          1, // 單聲道減小檔案大小
          resampledLength,
          targetSampleRate
        )

        // 重採樣並混合聲道
        const targetData = chunkBuffer.getChannelData(0)
        
        for (let j = 0; j < resampledLength; j++) {
          const sourceIndex = startSample + Math.floor(j * sampleRate / targetSampleRate)
          
          // 混合所有聲道
          let sum = 0
          for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            sum += audioBuffer.getChannelData(channel)[sourceIndex] || 0
          }
          targetData[j] = sum / audioBuffer.numberOfChannels
        }

        // 轉換為 WAV Blob (使用 8-bit 進一步減小)
        const wavBlob = this.audioBufferToWav(chunkBuffer, 8)
        console.log(`片段 ${i + 1} 處理完成: ${this.formatFileSize(wavBlob.size)} (原: ${this.formatFileSize(audioBlob.size / chunkCount)})`)
        
        chunks.push(wavBlob)
      }

      return chunks
    } catch (error) {
      console.error('音訊分割失敗:', error)
      throw new Error(`無法分割音訊: ${error.message}`)
    }
  }

  /**
   * 上傳並轉換單個音訊檔案
   * @param {Blob} audioBlob - 音訊 Blob
   * @param {string} languageCode - 語言代碼
   * @param {string} filename - 檔案名稱 (可選)
   * @returns {Promise<string>} 轉錄文本
   */
  async uploadAndTranscribe(audioBlob, languageCode, filename = 'audio') {
    try {
      // 檢查檔案大小
      if (audioBlob.size > this.maxFileSize) {
        throw new Error(`檔案太大 (${this.formatFileSize(audioBlob.size)})，超過 25MB 限制`)
      }

      // 創建 FormData
      const formData = new FormData()
      formData.append('file', audioBlob, `${filename}.webm`)
      formData.append('model', 'whisper-1')
      formData.append('language', languageCode)
      formData.append('response_format', 'json')

      // 發送請求到 OpenAI API
      const response = await fetch(
        `${this.baseUrl}/audio/transcriptions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: formData,
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          error.error?.message || 
          `OpenAI API 錯誤: ${response.statusText}`
        )
      }

      const result = await response.json()
      return result.text || ''
    } catch (error) {
      console.error('上傳轉換失敗:', error)
      throw error
    }
  }

  /**
   * 分割音訊 Blob
   * @param {Blob} audioBlob - 原始音訊
   * @param {number} chunkCount - 片段數
   * @returns {Promise<Blob[]>} 分割後的音訊片段
   */
  async splitAudioBlob(audioBlob, chunkCount) {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      
      console.log(`開始分割音訊: 原始大小=${this.formatFileSize(audioBlob.size)}, 片段數=${chunkCount}`)
      
      // 解碼音訊
      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      const chunks = []
      const totalSamples = audioBuffer.getChannelData(0).length
      const samplesPerChunk = Math.ceil(totalSamples / chunkCount)
      const sampleRate = audioBuffer.sampleRate

      for (let i = 0; i < chunkCount; i++) {
        const startSample = i * samplesPerChunk
        const endSample = Math.min(startSample + samplesPerChunk, totalSamples)
        
        const chunkBuffer = audioContext.createBuffer(
          audioBuffer.numberOfChannels,
          endSample - startSample,
          sampleRate
        )

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
          const sourceData = audioBuffer.getChannelData(channel)
          const targetData = chunkBuffer.getChannelData(channel)
          
          for (let j = 0; j < endSample - startSample; j++) {
            targetData[j] = sourceData[startSample + j]
          }
        }

        // 轉換為 WAV Blob
        const wavBlob = this.audioBufferToWav(chunkBuffer)
        chunks.push(wavBlob)
      }

      return chunks
    } catch (error) {
      console.error('音訊分割失敗:', error)
      throw new Error(`無法分割音訊: ${error.message}`)
    }
  }

  /**
   * AudioBuffer 轉換為 WAV Blob
   * @param {AudioBuffer} audioBuffer - 音訊緩衝區
   * @param {number} bitDepth - 位元深度 (8 或 16)
   * @returns {Blob} WAV 格式 Blob
   */
  audioBufferToWav(audioBuffer, bitDepth = 16) {
    const numberOfChannels = audioBuffer.numberOfChannels
    const sampleRate = audioBuffer.sampleRate
    const format = 1 // PCM

    const bytesPerSample = bitDepth / 8
    const blockAlign = numberOfChannels * bytesPerSample

    const channelData = []
    for (let channel = 0; channel < numberOfChannels; channel++) {
      channelData.push(audioBuffer.getChannelData(channel))
    }

    const interleaved = new Float32Array(
      audioBuffer.length * numberOfChannels
    )

    let offset = 0
    const length = audioBuffer.length
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        interleaved[offset++] = channelData[channel][i]
      }
    }

    const dataLength = length * numberOfChannels * bytesPerSample
    const buffer = new ArrayBuffer(44 + dataLength)
    const view = new DataView(buffer)

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    const floatTo16BitPCM = (output, offset, input) => {
      for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]))
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      }
    }

    const floatTo8BitPCM = (output, offset, input) => {
      for (let i = 0; i < input.length; i++, offset += 1) {
        const s = Math.max(-1, Math.min(1, input[i]))
        const val = s < 0 ? s * 0x80 : s * 0x7f
        output.setUint8(offset, val + 128) // 8-bit PCM 是無符號的 (0-255)
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + dataLength, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true) // subChunk1Size
    view.setUint16(20, format, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitDepth, true)
    writeString(36, 'data')
    view.setUint32(40, dataLength, true)

    if (bitDepth === 8) {
      floatTo8BitPCM(view, 44, interleaved)
    } else {
      floatTo16BitPCM(view, 44, interleaved)
    }

    return new Blob([buffer], { type: 'audio/wav' })
  }

  /**
   * 獲取音訊時長
   * @param {Blob} audioBlob - 音訊檔案
   * @returns {Promise<number>} 時長 (毫秒)
   */
  async getAudioDuration(audioBlob) {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const fileReader = new FileReader()

      fileReader.onload = async () => {
        try {
          const arrayBuffer = fileReader.result
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
          const durationInSeconds = audioBuffer.duration
          const durationInMilliseconds = durationInSeconds * 1000
          resolve(durationInMilliseconds)
        } catch (error) {
          reject(new Error(`無法解析音訊時長: ${error.message}`))
        }
      }

      fileReader.onerror = () => {
        reject(new Error('無法讀取音訊檔案'))
      }

      fileReader.readAsArrayBuffer(audioBlob)
    })
  }

  /**
   * 格式化時長顯示
   * @param {number} milliseconds - 毫秒
   * @returns {string} 格式化後的時間字符串
   */
  formatDuration(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  /**
   * 格式化檔案大小
   * @param {number} bytes - 字節數
   * @returns {string} 格式化後的檔案大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }
}

export default OpenAIWhisperService
