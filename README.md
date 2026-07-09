# 會議錄音與轉文字服務

基於 Vue 3 + Vite 的線上錄音、語音轉文字與摘要服務，支援三種轉換引擎、可自訂轉錄/摘要模型，並整合 OpenAI 與 Google 的語音辨識與生成式 AI API。

線上展示：https://chuangmaster.github.io/audio-transcripty/

## 🌟 功能特色

- 🎙️ 現場錄音 / 📁 上傳音訊檔案（二擇一，畫面依模式切換）
- 三種轉換引擎可選：
  - ⚡ 快速轉換 (Web Speech API) — 免費、瀏覽器內建、無限長度，準確度較低
  - 🎯 精準轉換 (Google Speech-to-Text) — 高準確度，同步 API 限制單次音訊 60 秒內
  - 🚀 超強轉換 (OpenAI Whisper) — 無限長度，超過大小/時長會自動分割上傳
- 轉錄模型依引擎顯示對應選項（Whisper-1 / GPT-4o Transcribe 系列 / Google latest_long 等），並可輸入自訂模型名稱
- 轉錄提示詞 / 關鍵字欄位：輸入人名、專有名詞等關鍵字，提升辨識準確度
- 摘要模型可選（OpenAI GPT 系列 / Google Gemini），依是否已設定對應 API Key 動態顯示可用選項，並支援自訂模型
- API 狀態即時監控，可直接在畫面上輸入、儲存並重新驗證 API Key
- 錄音記錄管理、轉文字下載、摘要生成
- 響應式設計

## 支援語言

- 繁體中文 (zh-TW)
- 簡體中文 (zh-CN)
- English - US (en-US)
- 日本語 (ja-JP)
- 한국어 (ko-KR)

> Google 引擎的可選轉錄模型會依語言動態調整，因為 Google 的模型與語言支援是綁定的（例如 `latest_long` 只支援部分語言，其餘語言僅能使用 `default`）。

## 技術架構

- **前端框架**: Vue 3 (Composition API) + Vite
- **錄音技術**: MediaRecorder API / Web Speech API
- **語音轉文字**:
  - Google Cloud Speech-to-Text API
  - OpenAI Audio Transcriptions API（`whisper-1`、`gpt-4o-transcribe`、`gpt-4o-mini-transcribe` 或自訂模型）
- **摘要生成**:
  - OpenAI Chat Completions API
  - Google Generative Language API (Gemini)
- **部署**: GitHub Actions 於推送到 `main` 分支時自動建置並發佈到 GitHub Pages

## 安裝與執行

### 1. 安裝依賴套件

```bash
npm install
```

### 2. 設定 API 密鑰（可選）

可以直接啟動應用後在畫面上的「API Key」輸入框貼上金鑰並儲存，或是先建立 `.env` / `.env.local`：

```env
VITE_GOOGLE_API_KEY=your_google_api_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

未設定 Google / OpenAI 金鑰時，仍可使用免費的「⚡ 快速轉換 (Web Speech API)」。

### 3. 啟動開發伺服器

```bash
npm run dev
```

### 4. 建置生產版本

```bash
npm run build
```

## 使用說明

1. 選擇「🎙️ 現場錄音」或「📁 上傳音訊檔案」其中一種模式
2. 選擇轉換引擎與語言
3. 使用 Google / OpenAI 引擎時，可進一步選擇轉錄模型，並視需要填寫轉錄提示詞 / 關鍵字
4. 開始錄音或選擇檔案，系統會自動轉換為文字並顯示進度
5. 選擇摘要模型（需先設定對應 API Key），點擊「生成摘要」
6. 播放錄音、下載轉文字檔案，或刪除不需要的紀錄

## 已知限制

- **Google 精準轉換**走同步 `recognize` API，單次音訊需在 60 秒以內，超過會被拒絕並提示改用 OpenAI Whisper
- 前端直接呼叫第三方 API，金鑰會存在瀏覽器記憶體中；正式環境建議改用後端代理並在 Google Cloud / OpenAI 後台限制金鑰的使用網域

## ⚠️ 安全性提醒

- `.env`、`.env.local` 已加入 `.gitignore`，切勿把含有真實金鑰的檔案提交到版本控制
- 不要把 API 金鑰貼到對話、Issue、截圖或任何會被記錄下來的地方；一旦金鑰外流，請立即到 Google Cloud Console / OpenAI 後台註銷並重新產生

## 專案結構

```
audio-transcripty/
├── .github/workflows/deploy.yml    # GitHub Actions：建置並部署到 GitHub Pages
├── .env                            # 環境變數（僅放預設佔位字串，不納入版控）
├── index.html                      # HTML 入口檔案
├── package.json                    # 專案依賴設定
├── vite.config.js                  # Vite 建置設定（含 GitHub Pages base path）
├── README.md                       # 專案說明文件
└── src/
    ├── main.js                     # Vue 應用程式入口
    ├── App.vue                     # 主要元件（引擎/模型選擇、錄音、摘要、UI 狀態）
    ├── style.css                   # 全域樣式
    ├── config/
    │   └── speechToTextConfig.js   # API 設定與引擎中繼資料
    └── services/
        ├── speechToText.js         # Google Speech-to-Text 服務
        ├── openaiWhisper.js        # OpenAI Whisper 轉錄服務（含分段上傳）
        ├── webSpeechApi.js         # 瀏覽器 Web Speech API 封裝
        ├── summarize.js            # OpenAI 摘要服務
        └── googleSummarize.js      # Google Gemini 摘要服務
```

## 部署

推送到 `main` 分支會觸發 `.github/workflows/deploy.yml`：安裝依賴 → `npm run build` → 使用 `peaceiris/actions-gh-pages` 將 `dist/` 發佈到 GitHub Pages，通常幾分鐘內會反映在線上展示網址。

## License

MIT License
