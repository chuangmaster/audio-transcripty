# 會議錄音與轉文字服務

這是一個基於 Vue 3 的線上錄音與語音轉文字服務，**整合了 Google Cloud Speech-to-Text API**，讓使用者能夠方便地將語音內容轉換為文字。

## 🌟 功能特色

- ✅ 網頁錄音功能（使用 Web Audio API）
- ✅ **Google Speech-to-Text API 語音轉文字**（高準確度）
- ✅ 支援多語言識別
- ✅ 錄音檔案播放
- ✅ 轉文字檔案下載
- ✅ 摘要生成功能
- ✅ 錄音記錄管理
- ✅ 響應式設計
- ✅ API 狀態實時監控
- ✅ 轉換進度顯示

## 支援語言

- 繁體中文
- 簡體中文
- English (US)
- 日本語
- 한국어

## 技術架構

- **前端框架**: Vue 3 (Composition API)
- **建置工具**: Vite
- **錄音技術**: MediaRecorder API
- **語音識別**: **Google Cloud Speech-to-Text API**
- **API 通訊**: RESTful API

## 安裝與執行

### 1. 安裝依賴套件

```bash
npm install
```

### 2. 設定 Google Speech-to-Text API（重要！）

**快速設定：**
```bash
npm run setup-env
```

**詳細指南請參考：** [GOOGLE_API_SETUP.md](./GOOGLE_API_SETUP.md)

具體步驟：
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案並啟用 Cloud Speech-to-Text API
3. 建立 API 密鑰
4. 編輯 `.env.local` 檔案，設定你的 API 密鑰：
   ```env
   VITE_GOOGLE_API_KEY=YOUR_API_KEY_HERE
   ```

### 3. 啟動開發伺服器

```bash
npm run dev
```

應用程式將在 `http://localhost:5173` 啟動

### 4. 建置生產版本

```bash
npm run build
```

## 使用說明

1. **開始錄音**: 點擊「開始錄音」按鈕，允許瀏覽器存取麥克風
2. **選擇語言**: 在開始錄音前可以選擇要識別的語言
3. **停止錄音**: 點擊「停止錄音」按鈕結束錄音
4. **查看結果**: 系統會自動處理語音轉文字，並顯示在錄音列表中
5. **播放錄音**: 使用音訊播放器重聽錄音內容
6. **下載文字**: 點擊「下載文字」按鈕將轉換後的文字儲存為 TXT 檔案
7. **生成摘要**: 點擊「生成摘要」按鈕快速瀏覽內容重點
8. **刪除錄音**: 點擊「刪除」按鈕移除不需要的錄音

## 注意事項

### 🔐 Google Speech-to-Text API 整合

本專案已完全整合 Google Cloud Speech-to-Text API，提供高品質的語音識別功能。

**關鍵特性：**
- ✅ 自動語言識別和轉換
- ✅ 自動標點符號添加
- ✅ 使用長表單模型獲得最佳結果
- ✅ 支援 12+ 語言
- ✅ 實時進度反饋

**詳細設定指南請參考：** [GOOGLE_API_SETUP.md](./GOOGLE_API_SETUP.md)

該指南涵蓋：
- 完整的 Google Cloud 設定步驟
- 本地開發環境配置
- 安全性最佳實踐
- 生產環境部署建議
- 常見問題排查
- 費用優化建議

### ⚠️ 安全性

**開發環境：**
- API 密鑰存儲在 `.env.local` 中
- 確保 `.env.local` 在 `.gitignore` 中
- 不要將密鑰提交到版本控制

**生產環境：**
- 強烈建議使用後端代理伺服器代替前端直接調用
- 在 Google Cloud 中限制 API 密鑰只能從你的網域存取
- 監控 API 使用量和成本

### 📊 使用說明

1. **檢查 API 連接**: 應用啟動時會自動驗證 API 狀態
2. **選擇語言**: 在開始錄音前選擇識別語言
3. **開始錄音**: 點擊「開始錄音」按鈕
4. **停止錄音**: 點擊「停止錄音」按鈕
5. **等待轉換**: 系統會自動上傳音訊並進行轉換（可見進度條）
6. **查看結果**: 轉換後的文字會顯示在錄音列表中
7. **下載文字**: 點擊「下載文字」以 TXT 格式保存
8. **生成摘要**: 點擊「生成摘要」快速瀏覽重點

### 🌐 支援語言

- 繁體中文 (zh-TW)
- 簡體中文 (zh-CN)
- English - US (en-US)
- English - UK (en-GB)
- 日本語 (ja-JP)
- 한국어 (ko-KR)
- Français (fr-FR)
- Deutsch (de-DE)
- Español (es-ES)
- Italiano (it-IT)
- Português - Brazil (pt-BR)
- Русский (ru-RU)
- Tiếng Việt (vi-VN)
- ไทย (th-TH)

## 專案結構

```
meeting-recorder/
├── .env.example                    # 環境變數範本
├── .gitignore                      # Git 忽略檔案
├── index.html                      # HTML 入口檔案
├── package.json                    # 專案依賴設定
├── vite.config.js                  # Vite 建置設定
├── README.md                       # 專案說明文件
├── GOOGLE_API_SETUP.md             # Google API 設定指南
├── RD.md                           # 需求規格書
└── src/
    ├── main.js                     # Vue 應用程式入口
    ├── App.vue                     # 主要元件（整合 Google API）
    ├── style.css                   # 全域樣式
    ├── config/
    │   └── speechToTextConfig.js   # Google API 設定檔
    └── services/
        └── speechToText.js         # Google Speech-to-Text 服務類
```

## 核心功能模組

### 1. Speech-to-Text 服務 (`src/services/speechToText.js`)
- 封裝 Google Cloud Speech-to-Text API 調用
- 音訊格式轉換
- 進度回調功能
- 錯誤處理

### 2. 配置管理 (`src/config/speechToTextConfig.js`)
- API 密鑰管理
- 語言配置
- 音訊參數設定
- 超時設定

### 3. Vue 主元件 (`src/App.vue`)
- 錄音控制
- 語言選擇
- 進度監控
- 結果顯示和管理

## 開發指南

### 更改 API 密鑰
編輯 `.env.local` 檔案：
```env
VITE_GOOGLE_API_KEY=your_new_api_key_here
```

### 自訂語言支援
編輯 `src/config/speechToTextConfig.js` 中的 `languages` 陣列。

### 自訂音訊設定
在 `src/config/speechToTextConfig.js` 中修改 `audio` 和 `apiParams` 物件。

### 調試
- 檢查瀏覽器開發者工具的 Console 標籤
- 查看 Network 標籤中的 API 請求
- 檢查 API 狀態指示器（頁面頂部）

## 常見問題

### 📋 完整 FAQ 和故障排除

詳見 [GOOGLE_API_SETUP.md](./GOOGLE_API_SETUP.md) 中的「常見問題」部分

### Q: 如何處理 CORS 錯誤？
**A:** 確保：
1. API 密鑰正確設定
2. Google Cloud 中 API 限制已配置
3. API 密鑰有正確的應用限制

### Q: 轉換不準確怎麼辦？
**A:** 
- 確保音訊清晰，沒有背景噪音
- 確認選擇的語言正確
- 檢查音訊採樣率（推薦 16kHz）
- 嘗試使用長表單模型

### Q: 如何在生產環境中使用？
**A:** 
強烈建議使用後端代理伺服器。詳見 [GOOGLE_API_SETUP.md](./GOOGLE_API_SETUP.md) 中的「生產環境」部分。

## 費用資訊

Google Cloud Speech-to-Text 定價：
- **免費配額**：每月 60 分鐘
- **超過配額**：$0.024 / 分鐘

詳細費用說明見 [GOOGLE_API_SETUP.md](./GOOGLE_API_SETUP.md)

## 未來改進方向

- [ ] 實時語音轉文字流式處理
- [ ] 加入使用者認證系統
- [ ] 雲端儲存功能
- [ ] AI 智能摘要功能
- [ ] 支援更多音訊格式
- [ ] 批量轉換功能
- [ ] 協作編輯功能
- [ ] 多語言界面

MIT License
