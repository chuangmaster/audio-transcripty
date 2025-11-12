/**
 * SummarizeService
 * 提供以 OpenAI Chat Completion API 對文字產生摘要的簡單封裝
 */
import { speechToTextConfig } from '../config/speechToTextConfig.js'

class SummarizeService {
  constructor(apiKey) {
    this.apiKey = apiKey || speechToTextConfig.openaiApiKey
    this.baseUrl = 'https://api.openai.com/v1'
  }

  async summarizeText(text, model = 'gpt-3.5-turbo', options = {}) {
    if (!text || !text.trim()) throw new Error('沒有要摘要的文字')
    if (!this.apiKey) throw new Error('OpenAI API Key 未設定')

    const systemPrompt = options.systemPrompt || '你是一個專業的摘要機器人，請以簡潔、條列或段落的方式產生摘要，語言請依照輸入要求。不需要使用markdown格式。'
    const userPrompt = options.userPrompt || `請以繁體中文摘要下列內容，保留重要重點與結論，並盡量保持簡潔：\n\n${text}`

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: options.temperature ?? 0.2,
      max_tokens: options.max_tokens ?? 800
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      let errText = response.statusText
      try { const j = await response.json(); errText = j.error?.message || JSON.stringify(j) } catch (e) {}
      throw new Error(`OpenAI API 錯誤: ${errText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    return content.trim()
  }
}

export default SummarizeService
