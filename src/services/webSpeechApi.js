/**
 * Web Speech API Service
 * 提供瀏覽器原生語音識別功能
 * - 完全免費
 * - 支援無限長度錄音
 * - 準確度較低，適合快速記錄
 * - 無詞級時間戳
 */

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export class WebSpeechApiService {
  constructor() {
    if (!SpeechRecognition) {
      console.warn('Web Speech API 不支援此瀏覽器');
      this.supported = false;
      return;
    }

    this.recognition = new SpeechRecognition();
    this.supported = true;
    this.isListening = false;
    this.transcript = '';
    this.interimTranscript = '';
    this.results = [];

    this._setupRecognition();
  }

  _setupRecognition() {
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'zh-TW'; // 預設語言

    // 中間結果（使用者還在說話時）
    this.recognition.onresult = (event) => {
      this.interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          this.transcript += transcript + ' ';
        } else {
          this.interimTranscript += transcript;
        }
      }
    };

    // 錯誤處理
    this.recognition.onerror = (event) => {
      console.error('Web Speech API 錯誤:', event.error);
      this._triggerCallback('error', {
        error: event.error,
        message: this._getErrorMessage(event.error)
      });
    };

    // 識別結束
    this.recognition.onend = () => {
      this.isListening = false;
      this._triggerCallback('end', {
        transcript: this.transcript.trim(),
        results: this.results
      });
    };
  }

  /**
   * 啟動語音識別
   * @param {string} languageCode - 語言代碼（如 'zh-TW', 'en-US'）
   * @param {Function} onUpdate - 實時更新回調
   * @param {Function} onComplete - 完成回調
   * @param {Function} onError - 錯誤回調
   */
  start(languageCode = 'zh-TW', onUpdate = null, onComplete = null, onError = null) {
    if (!this.supported) {
      console.error('Web Speech API 不支援');
      return;
    }

    if (this.isListening) {
      console.warn('已在監聽中');
      return;
    }

    // 規範化語言代碼
    const normalizedLang = this._normalizeLanguageCode(languageCode);
    this.recognition.lang = normalizedLang;
    
    console.log(`Web Speech API 設定語言: ${languageCode} → ${normalizedLang}`);
    
    this.transcript = '';
    this.interimTranscript = '';
    this.results = [];

    this.callbacks = {
      update: onUpdate,
      complete: onComplete,
      error: onError
    };

    // 實時更新回調
    this.recognition.onresult = (event) => {
      this.interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          this.transcript += transcript + ' ';
          this.results.push({
            transcript: transcript,
            confidence: event.results[i][0].confidence,
            isFinal: true
          });
        } else {
          this.interimTranscript += transcript;
        }
      }

      if (onUpdate) {
        onUpdate({
          final: this.transcript.trim(),
          interim: this.interimTranscript,
          confidence: this.results.length > 0 ? this.results[this.results.length - 1].confidence : 0
        });
      }
    };

    // 錯誤處理
    this.recognition.onerror = (event) => {
      console.error('Web Speech API 錯誤:', event.error);
      if (onError) {
        onError({
          error: event.error,
          message: this._getErrorMessage(event.error)
        });
      }
    };

    // 識別結束
    this.recognition.onend = () => {
      this.isListening = false;
      if (onComplete) {
        onComplete({
          transcript: this.transcript.trim(),
          results: this.results
        });
      }
    };

    this.isListening = true;
    this.recognition.start();
  }

  /**
   * 停止語音識別
   */
  stop() {
    if (!this.isListening) return;
    this.recognition.stop();
  }

  /**
   * 中止語音識別
   */
  abort() {
    this.recognition.abort();
    this.isListening = false;
  }

  /**
   * 獲取最終轉錄文本
   */
  getTranscript() {
    return this.transcript.trim();
  }

  /**
   * 獲取所有結果
   */
  getResults() {
    return this.results;
  }

  /**
   * 重置狀態
   */
  reset() {
    this.transcript = '';
    this.interimTranscript = '';
    this.results = [];
  }

  /**
   * 檢查瀏覽器支援
   */
  isSupported() {
    return this.supported;
  }

  /**
   * 獲取支援的語言清單
   */
  getSupportedLanguages() {
    return [
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
      { code: 'pt-BR', name: 'Português' },
      { code: 'ru-RU', name: 'Русский' },
      { code: 'vi-VN', name: 'Tiếng Việt' },
      { code: 'th-TH', name: 'ไทย' }
    ];
  }

  _triggerCallback(type, data) {
    if (this.callbacks && this.callbacks[type]) {
      this.callbacks[type](data);
    }
  }

  /**
   * 規範化語言代碼
   * Web Speech API 支援的語言代碼格式可能因瀏覽器而異
   */
  _normalizeLanguageCode(code) {
    // 語言代碼映射，確保相容性
    const languageMap = {
      'zh-TW': 'zh-TW',      // 繁體中文
      'zh-CN': 'zh-CN',      // 簡體中文
      'zh': 'zh-CN',         // 預設中文
      'en-US': 'en-US',      // 美式英文
      'en-GB': 'en-GB',      // 英式英文
      'en': 'en-US',         // 預設英文
      'ja-JP': 'ja-JP',      // 日語
      'ja': 'ja-JP',
      'ko-KR': 'ko-KR',      // 韓語
      'ko': 'ko-KR',
      'fr-FR': 'fr-FR',      // 法語
      'fr': 'fr-FR',
      'de-DE': 'de-DE',      // 德語
      'de': 'de-DE',
      'es-ES': 'es-ES',      // 西班牙語
      'es': 'es-ES',
      'it-IT': 'it-IT',      // 義大利語
      'it': 'it-IT',
      'pt-BR': 'pt-BR',      // 葡萄牙語（巴西）
      'pt': 'pt-BR',
      'ru-RU': 'ru-RU',      // 俄語
      'ru': 'ru-RU',
      'vi-VN': 'vi-VN',      // 越南語
      'vi': 'vi-VN',
      'th-TH': 'th-TH',      // 泰語
      'th': 'th-TH'
    };

    return languageMap[code] || code;
  }

  _getErrorMessage(error) {
    const messages = {
      'no-speech': '未偵測到聲音，請重試',
      'audio-capture': '找不到麥克風，請檢查權限',
      'network': '網路連線錯誤',
      'aborted': '語音識別已中止',
      'service-not-allowed': '語音識別服務未授權',
      'bad-grammar': '語法錯誤',
      'network-timeout': '連線逾時'
    };
    return messages[error] || `錯誤: ${error}`;
  }
}

export default WebSpeechApiService;
