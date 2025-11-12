/**
 * GoogleSummarizeService
 * 使用 Google Generative AI API (Gemini) 生成文字摘要
 */

class GoogleSummarizeService {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models'
  }

  async summarizeText(text, model = 'gemini-2.5-flash-lite', options = {}) {
    if (!text || !text.trim()) throw new Error('沒有要摘要的文字')
    if (!this.apiKey) throw new Error('Google API Key 未設定')

    const fullPrompt = (options.userPrompt || `請以繁體中文摘要下列內容，保留重要重點與結論，並盡量保持簡潔，不需要使用markdown格式：\n\n${text}`)
      .replace(/\n\n/g, '\n'); // Gemini API 對於連續換行較敏感

    // Google Generative AI API 的 generateContent 請求格式
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: fullPrompt }
          ]
        }
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        maxOutputTokens: options.max_tokens ?? 800
      }
    }

    const response = await fetch(`${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      let errText = response.statusText
      try { const j = await response.json(); errText = j.error?.message || JSON.stringify(j) } catch (e) {}
      throw new Error(`Google API 錯誤: ${errText}`)
    }

    const data = await response.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return content.trim()
  }
}

export default GoogleSummarizeService
