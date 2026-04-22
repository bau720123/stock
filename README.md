# 即時報價儀表板

一個以純前端技術為核心，搭配 Cloudflare 無伺服器架構，實現即時金融市場報價、PWA 安裝與主動推播通知的個人投資輔助工具。

---

## 專案背景

傳統金融資訊網站（如 HiStock、StockQ）皆因瀏覽器的 CORS 同源政策限制，無法直接由前端 JavaScript 發起跨域請求。本專案透過 Cloudflare Workers 作為中間代理層，繞過此限制，並以 GitHub Pages 提供靜態前端介面，在完全不需要自建伺服器的前提下，實現完整的即時報價系統。

---

## 系統架構總覽

```
使用者裝置（瀏覽器 / PWA）
    │
    ├─ GitHub Pages          → 提供靜態前端頁面
    │
    └─ Cloudflare Worker     → 代理爬蟲 / 推播發送
            │
            ├─ HiStock       → 台股期貨、富台指
            ├─ 鉅亨網         → 富台指（備援來源）
            ├─ TaiFex        → 台股/台積電期貨
            ├─ Fugle         → 台股現貨即時報價、歷史K線、技術指標（需 API Key）
            ├─ 玩股網 (wearn) → 外資期貨淨部位、三大法人買賣、個股法人明細
            ├─ 台灣證券交易所  → 融資餘額
            ├─ 新浪財經       → 布蘭特原油、黃金、白銀、美元指數、VIX
            ├─ Yahoo Finance  → 美股/ETF 個股行情
            ├─ CNBC          → 美股四大指數、盤前 Fair Value、TSM ADR
            ├─ RobinHood     → TSM ADR 即時報價（目前因 TLS 封鎖暫停）
            ├─ CNN           → 恐慌貪婪指數（Fear & Greed Index）
            ├─ MoneyDJ       → 美股重要經濟指標行事曆
            ├─ Finnhub       → 科技股財報發布日曆（需 API Key）
            └─ RSS Feeds     → Yahoo奇摩財經、中央社、自由時報
```

---

## 技術與服務說明

### 1. GitHub Pages

**用途：** 靜態網站託管

**解決的問題：** 免費提供可公開存取的網頁託管環境，不需要租用 VPS 或管理伺服器。所有的 HTML、CSS、JavaScript、Service Worker、PWA manifest 等靜態資源皆部署於此。

**網址格式：**
```
https://{username}.github.io/{repo}/
```

---

### 2. Cloudflare Workers

**用途：** 無伺服器代理層（Serverless Proxy）

**解決的問題：**

瀏覽器的同源政策（CORS）禁止前端 JavaScript 直接向第三方網站發送請求，即使手動偽造 `Origin` 或 `Referer` header，瀏覽器也會攔截並拒絕讀取回應。Cloudflare Workers 在伺服器端執行，不受 CORS 限制，可自由設定任意 header，例如：

```javascript
fetch("https://histock.tw/stock/module/function.aspx", {
  headers: {
    "Origin": "https://histock.tw",   // 伺服器端可自由偽造
    "Referer": "https://histock.tw/",
  }
});
```

**語言環境：** JavaScript（ES Modules），基於 Web Standards API（Fetch API），非 Node.js 環境。

**注意：** `env` 是每次 Request 注入的參數，不是全域變數；若在 `fetch()` 之外的函式中需要 `env`，必須明確透過參數傳遞。

**現有路徑：**

| 路徑 | 資料來源 | 說明 |
|------|----------|------|
| `/fitx` | HiStock | 台股期貨（FITX）即時報價 |
| `/twn` | HiStock | 富台指即時報價（備援） |
| `/twncon` | 鉅亨網 | 富台指即時報價（主要） |
| `/taifex/{objId}/{contract}` | TaiFex 官方 API | 台股/台積電期貨報價（日盤/夜盤） |
| `/stock/quote/{symbol}` | Fugle | 台股個股即時報價（含委買委賣五檔） |
| `/stock/volume/{symbol}` | Fugle | 台股個股分價量表 |
| `/stock/history/{symbol}` | Fugle | 台股個股歷史 K 線（近 30 天，日線） |
| `/stock/institutional/{symbol}` | 玩股網 | 個股三大法人買賣明細 |
| `/stock/sma/{symbol}` | Fugle | 均線（SMA 5/10/20/60 日） |
| `/stock/rsi/{symbol}` | Fugle | RSI 指標（6/9/14/20 日） |
| `/stock/kdj/{symbol}` | Fugle | KDJ 指標（9/3/3） |
| `/stock/macd/{symbol}` | Fugle | MACD（12/26/9） |
| `/stock/brands/{symbol}` | Fugle | 布林通道（BB，20 日） |
| `/yahoo-finance/{symbol}` | Yahoo Finance | 美股/ETF 個股行情（近 1 日收盤資料） |
| `/sina/{symbol}` | 新浪財經 | 原物料/指數即時報價（多 symbol 格式） |
| `/debug-sina` | 新浪財經 | 批次查詢多個 Sina symbol 原始回應（除錯用） |
| `/cnbc` | CNBC | 美股四大指數 + 盤前 Fair Value + TSM ADR |
| `/rh` | RobinHood | TSM ADR 即時變動（TLS 封鎖中） |
| `/fear-greed` | CNN | 恐慌貪婪指數（Fear & Greed Index） |
| `/foreign-net-position` | 玩股網 | 外資期貨淨未平倉口數（日期序列） |
| `/institutional` | 玩股網 | 三大法人合計買賣超（日期序列） |
| `/margin-trading-balance` | 台灣證券交易所 | 全市場融資餘額（億元） |
| `/news-rss` | Yahoo奇摩/中央社/自由時報 | 關鍵字過濾財經新聞 |
| `/america-calendar` | MoneyDJ + Finnhub + 自訂 | 美股重要事件行事曆 |
| `/generateCustomEventsFinnhub/{from}/{to}` | Finnhub | 科技股財報日曆（最多 14 天） |
| `/subscribe` | — | 接收並儲存裝置推播訂閱資料 |
| `/push-test` | — | 手動觸發推播測試 |
| `/read-subs` | — | 查看所有訂閱裝置清單 |
| `/clear-subs` | — | 清除所有訂閱資料 |
| `/write-logs` | — | 寫入系統 LOG |
| `/read-logs` | — | 查看系統 LOG |
| `/clear-logs` | — | 清除系統 LOG |

**免費額度：** 每天 10 萬次請求，個人使用完全足夠。

---

### 3. 新浪財經非官方 API（hq.sinajs.cn）

**用途：** 即時原物料與市場情緒指數報價

**解決的問題：** 直接回傳結構化字串，更新頻率接近 Investing.com、TradingView 等專業平台等級。

**注意事項：**
- 此為非官方、未公開文件的接口，使用時需加 `Referer` header 才能正常回應
- 回應編碼為 GBK，需透過 `TextDecoder("gbk")` 轉換後才能正確解析中文

**支援的 Symbol 格式與欄位對照：**

| 前綴 | 範例 | 說明 | 特殊處理 |
|------|------|------|----------|
| `hf_` | `hf_OIL`, `hf_GC`, `hf_SI` | 期貨（原油/黃金/白銀） | 標準欄位格式 |
| `znb_` | `znb_VIX` | 市場指數（VIX） | 獨立欄位格式 |
| `gb_` | `gb_dji`, `gb_inx`, `gb_ixic` | 美股現貨指數 | 獨立欄位格式 |
| `DINIW` | `DINIW` | 美元指數 | 欄位順序與其他完全不同，需特殊處理 |

---

### 4. Fugle 富果 API

**用途：** 台股即時報價、歷史 K 線、技術指標

**API 端點（現有）：**

| 端點類型 | URL 格式 |
|----------|----------|
| 即時報價 | `https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/{symbol}` |
| 分價量表 | `https://api.fugle.tw/marketdata/v1.0/stock/intraday/volumes/{symbol}` |
| 歷史K線 | `https://api.fugle.tw/marketdata/v1.0/stock/historical/candles/{symbol}?from=...&to=...&timeframe=D` |
| 均線 SMA | `https://api.fugle.tw/marketdata/v1.0/stock/technical/sma/{symbol}?period={N}` |
| RSI | `https://api.fugle.tw/marketdata/v1.0/stock/technical/rsi/{symbol}?period={N}` |
| KDJ | `https://api.fugle.tw/marketdata/v1.0/stock/technical/kdj/{symbol}` |
| MACD | `https://api.fugle.tw/marketdata/v1.0/stock/technical/macd/{symbol}` |
| 布林通道 | `https://api.fugle.tw/marketdata/v1.0/stock/technical/bb/{symbol}` |

**認證方式：** Header 帶入 `X-API-KEY`，API Key 存放於 Cloudflare Worker Secrets（`FUGLE_KEY`）。

---

### 5. 台灣期貨交易所（TaiFex）API

**用途：** 台股/台積電期貨即時報價（日盤/夜盤）

**端點格式：**
```
https://www.taifex.com.tw/cht/quotesApi/getQuotes?objId={objId}
```

**常用 objId 與 contract 對照：**

| objId | contract | 說明 |
|-------|----------|------|
| `2` | `TX046` | 台股期貨日盤（以 `contractName=臺股期貨` 比對） |
| `12` | `TX056` | 台股期貨夜盤（以 `contractName=臺股期貨` 比對） |
| `12` | `CDF056` | 台積電期貨夜盤（以 `contract` 欄位比對） |

---

### 6. CNN 恐慌貪婪指數（Fear & Greed Index）

**用途：** 反映市場整體情緒，作為 VIX 的補充情緒指標

**來源：** `https://production.dataviz.cnn.io/index/fearandgreed/graphdata`

**回傳欄位：**

| 欄位 | 說明 |
|------|------|
| `score` | 目前分數（0～100） |
| `rating` | 英文評級（extreme fear / fear / neutral / greed / extreme greed） |
| `ratingZh` | 中文評級（極度恐慌 / 恐慌 / 中性 / 貪婪 / 極度貪婪） |
| `updateTime` | 更新時間（台北時區） |
| `prevClose` | 昨收分數 |
| `prev1Week` | 一週前分數 |
| `prev1Month` | 一個月前分數 |
| `prev1Year` | 一年前分數 |

---

### 7. 新聞 RSS 聚合（/news-rss）

**用途：** 聚合多個台灣財經媒體 RSS，依關鍵字過濾相關新聞

**RSS 來源：**

| 名稱 | URL |
|------|-----|
| Yahoo奇摩財經 | `https://tw.news.yahoo.com/rss/finance` |
| 中央社國際 | `https://feeds.feedburner.com/rsscna/intworld` |
| 中央社產經 | `https://feeds.feedburner.com/rsscna/finance` |
| 中央社政治 | `https://feeds.feedburner.com/rsscna/politics` |
| 自由時報國際 | `https://news.ltn.com.tw/rss/world.xml` |
| 自由時報財經 | `https://news.ltn.com.tw/rss/business.xml` |

**過濾關鍵字（部分）：** 伊朗、油價、原油、台積電、ADR、戰爭、中東、川普、軍事、衝突…等

**其他特性：**
- 依 `pubDate` 降冪排序，最多回傳 30 則
- 依標題去重（相同標題只保留最早出現的一筆）
- `description` 超過 120 字自動截斷並加 `…`
- 預留 `ai_suggest` 欄位（目前 Gemini 分析程式碼暫以 comment-out 方式保留）

---

### 8. 美股行事曆（/america-calendar）

**用途：** 整合多來源，提供完整的美股投資重要事件日曆

**資料來源合併順序：**
1. MoneyDJ（經濟指標，依關鍵字過濾）
2. 自訂週期性事件（`generateCustomEvents`）
3. Finnhub 科技股財報（`generateCustomEventsFinnhub`，僅查未來 14 天）

**自動計算的週期性事件：**

| 事件 | 規則 |
|------|------|
| 台指期/選擇權結算日 | 每月第三個星期三 |
| 美股四巫日 | 3、6、9、12 月第三個星期五 |
| 富時羅素指數重組 | 6 月最後一個星期五、11 月第二個星期五 |
| MSCI 指數調整 | 2、5、8、11 月最後一個平日 |

**Finnhub 財報追蹤清單（部分）：**
NVDA、TSM、AAPL、META、MSFT、GOOGL、AMZN、TSLA、AMD、PLTR、AVGO、QCOM、ASML、MU、INTC、NFLX、SMCI、ARM 等 AI/科技股

> **注意：** Finnhub 免費方案日期範圍超過 14 天會靜默截斷結果，查詢時需限制在 14 天內。

---

### 9. Cron 定時推播（handleCron）

**觸發時間：** 每小時整點（UTC `0 */1 * * *`）

**執行條件（台灣時間）：** 週一至週五，05:00～23:59

**推播內容（依時段顯示）：**

| 時段（台灣時間） | 推播項目 |
|-----------------|----------|
| 全時段 | 今日特殊事件、富台指漲跌、布蘭特原油（含評級）、VIX（含評級） |
| 09:00～14:00 | 台股期貨日盤、台積電現貨（Fugle） |
| 15:00 以後 或 08:00 以前 | 台股期貨夜盤 |
| 17:00 以後 或 08:00 以前 | 台積電期貨夜盤 |

**情緒評級輔助函式：**

```javascript
getBrentStatus(price)  // < 100: 平靜 / < 110: 留意 / < 120: 波動加劇 / ≥ 120: 恐慌
getVixStatus(value)    // < 20: 平靜 / < 25: 留意 / < 30: 波動加劇 / ≥ 30: 恐慌
```

---

### 10. PWA（Progressive Web App）

**用途：** 讓網頁可安裝至手機桌面，提供類原生 App 體驗

**實作所需檔案：**

- `manifest.json`：定義 App 名稱、圖示、啟動 URL、顯示模式
- `icon-192.png`：通知圖示與主畫面圖示
- `icon-512.png`：高解析度圖示
- `banner.png`：推播通知橫幅圖
- `favicon.ico`：瀏覽器分頁圖示

**`manifest.json` 關鍵欄位：**
```json
{
  "name": "即時報價",
  "short_name": "報價",
  "start_url": "/stock/index.html",
  "display": "standalone",
  "background_color": "#0a0e14",
  "theme_color": "#0a0e14"
}
```

**iOS 限制：**
- `Notification.requestPermission()` 必須由使用者手勢觸發，不能在頁面載入時自動呼叫
- 必須先加入主畫面成為 PWA 才能使用推播功能

---

### 11. Service Worker（sw.js）

**用途：** 在瀏覽器背景執行的 JavaScript，是 PWA 推播通知的核心

**解決的問題：** 普通網頁關閉後就無法接收任何訊息。Service Worker 獨立於網頁之外運行，即使使用者沒有開啟頁面，也能接收來自伺服器的推播通知並顯示給使用者。

**重要機制：**

- `skipWaiting()`：新版本安裝後立即接管，不等舊版退場
- `clients.claim()`：立即接管所有已開啟的頁面
- `controllerchange` 事件：搭配 `sessionStorage` 防止無限 reload，偵測到 SW 更新後自動重新整理一次

**更新機制：** 瀏覽器會定期比對 `sw.js` 的內容，只要檔案有任何變動，就會自動觸發更新流程，不需要手動操作。

---

### 12. Web Push Protocol

**用途：** 從伺服器主動推送通知到使用者裝置

**解決的問題：** 傳統網頁無法主動聯繫使用者，必須等使用者自己開啟頁面。Web Push 讓伺服器可以在任何時間點主動推送通知，即使頁面已關閉。

**推播底層基礎設施：**

| 平台 | 推播服務 | Endpoint 格式 |
|------|----------|---------------|
| Android / Chrome | FCM（Firebase Cloud Messaging） | `https://fcm.googleapis.com/...` |
| iOS / Safari（PWA） | APNs（Apple Push Notification service） | `https://web.push.apple.com/...` |
| Windows / Edge | WNS（Windows Notification Service） | `https://wns2-*.notify.windows.com/...` |

**推播流程：**
```
1. 使用者點擊「訂閱通知」按鈕並允許權限
2. 瀏覽器向 FCM/APNs/WNS 申請 subscription（含 endpoint URL）
3. 前端將 subscription + userAgent 完整字串傳送到 Worker，存入 KV
4. Worker 需要推播時，向 endpoint URL 發送加密訊息
5. FCM/APNs/WNS 將通知推送到使用者裝置
6. Service Worker 接收並顯示通知
```

**訊息加密：** Web Push 規範要求訊息必須使用 `aes128gcm` 加密，搭配 ECDH 金鑰交換和 HKDF 金鑰推導，本專案使用 Cloudflare Workers 內建的 Web Crypto API 手動實作，不依賴任何外部套件。

**平台差異與 Action 按鈕：**

| 平台 | Action 按鈕 | 備註 |
|------|-------------|------|
| 電腦 Chrome | ✅ 正常 | 完整支援 |
| Android Chrome | ❌ 停用 | 永遠回傳最後一個按鈕的 action，已改為不帶 actions |
| iOS Safari PWA | ❌ 停用 | 系統不支援 action 按鈕，已改為不帶 actions |
| Windows Edge | ✅ 正常 | WNS 通道，完整支援 |

**平台偵測函式：**
```javascript
isAndroidPlatform(platform)  // 偵測 Android 裝置
isApplePlatform(platform)    // 偵測 iPhone / iPad / iPod / Mac
```

> 訂閱時會儲存完整 `User-Agent` 字串（`platform` 欄位），而非僅儲存 boolean，以支援更細緻的平台判斷。

---

### 13. VAPID 金鑰（vapidkeys.com）

**用途：** Web Push 身份驗證

**注意事項：**
- `VAPID_SUBJECT` 格式必須是 `mailto:email@example.com`，不能有空格或角括號，否則 Apple APNs 會回傳 `BadJwtToken` 錯誤
- `VAPID_SUBJECT` 為 Plaintext 變數，需加入 `wrangler.toml` 的 `[vars]` 區塊，否則每次 `wrangler deploy` 會將其清除

**儲存位置：**

| 變數名稱 | 類型 | 存放位置 |
|----------|------|----------|
| `VAPID_PUBLIC_KEY` | Secret | Cloudflare 後台 |
| `VAPID_PRIVATE_KEY` | Secret | Cloudflare 後台 |
| `VAPID_SUBJECT` | Plaintext | `wrangler.toml` `[vars]` |
| `FUGLE_KEY` | Secret | Cloudflare 後台 |
| `FINNHUB_KEY` | Secret | Cloudflare 後台 |

---

### 14. Cloudflare KV

**用途：** 儲存推播訂閱資料與系統 LOG

**現有 Key：**

| Key | 說明 |
|-----|------|
| `subscriptions` | 所有裝置的 Push subscription 清單 |
| `logs` | 系統事件 LOG（最新 100 筆） |

**subscription 資料結構：**
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": { "auth": "...", "p256dh": "..." },
  "platform": "Mozilla/5.0 (Linux; Android...)",
  "time": "2026-04-22 10:00:00"
}
```

**LOG 資料結構：**
```json
{
  "time": "2026-04-22 10:00:00",
  "tag": "SW",
  "message": "Push 訂閱完成，已傳送到 Worker"
}
```

**免費額度：** 每天 10 萬次讀寫，個人使用完全足夠。

---

### 15. Cloudflare Cron Trigger

**用途：** 定時執行推播邏輯

**現有設定：** 每小時整點觸發（`0 */1 * * *`）

**本地測試方式（需開兩個終端機）：**
```powershell
# 視窗一：啟動本地伺服器（連線真實 KV）
npm run dev

# 視窗二：手動觸發 Cron
npm run cron-test
```

---

### 16. Node.js 與 Wrangler CLI

**用途：** 執行 Wrangler CLI 工具

**安裝：**
```powershell
npm install -g wrangler
```

**常用指令：**

```powershell
npm run dev       # 本地開發 + 連線真實 KV
npm run deploy    # 部署 worker.js 到 Cloudflare
npm run cron-test # 手動觸發 Cron（需先執行 npm run dev）
```

**wrangler.toml 完整設定：**
```toml
name = "billowing-queen-4a58"
main = "worker.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "KV"
id = "e733a1b2b10c4c44b9aa862b241ee83f"

[triggers]
crons = ["0 */1 * * *"]

[vars]
VAPID_SUBJECT = "mailto:your@email.com"
```

**重要注意：**
- `npm run deploy` 會自動 minify 程式碼，後台 Edit code 看到的是壓縮版本，原始碼以本地 `worker.js` 為準
- Secret 變數（`VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`FUGLE_KEY`、`FINNHUB_KEY`）不可放入 `wrangler.toml`，只能在後台設定
- Plaintext 變數（`VAPID_SUBJECT`）必須放入 `wrangler.toml`，否則每次 deploy 會被清除

---

## 本地通知 vs 推播通知

| | 本地通知 | Web Push 推播通知 |
|--|----------|-------------------|
| 觸發方式 | 頁面開著時由 JS 觸發 | 伺服器主動發送 |
| 頁面需開著 | ✅ 需要 | ❌ 不需要 |
| 實作複雜度 | 簡單 | 複雜（需 VAPID + 加密） |
| 使用情境 | 價格門檻警示（頁面開著） | 每小時市場摘要 |

---

## 頁面功能說明

**卡片區塊：**

| 卡片 | 內容 |
|------|------|
| 台股市場概況 | 台積電期貨/現貨、台股期貨（FITX）、富台指（TWN/TWNCON）、委買委賣五檔 |
| 美股市場概況 | 盤前電子盤 Fair Value、道瓊/標普/納斯達克/費城半導體、TSM ADR |
| 原物料市場 | 布蘭特原油（含評級）、黃金、白銀 |
| 市場情緒 | 美元指數（DXY）、VIX 恐慌指數（含評級）、CNN 恐慌貪婪指數 |
| 台積電 ADR | CNBC 盤中/盤前/盤後變動 |
| 財經新聞 | 關鍵字過濾新聞、已讀/未讀標記 |
| 美股行事曆 | 月曆視圖，含經濟指標、財報日、結算日等 |
| 法人動向 | 三大法人買賣超、外資期貨淨部位、融資餘額 |
| 自選股 | localStorage 自訂股票清單，支援 `^` 符號（Yahoo Finance 格式） |

**Header 功能：**
- `☰` 漢堡按鈕：開啟左側 Slide Menu
- 重新整理按鈕：手動刷新資料（含倒數計時，5 分鐘自動刷新）
- 訂閱通知按鈕：開啟推播訂閱流程（鈴鐺圖示，已授權時亮起）

**URL 參數（隱藏功能）：**
```
?card_type=xxx          → 切換單一卡片模式（card-wide 版面）
?size=200&price=1785    → 台積電委買張數/委賣價格門檻，符合條件觸發本地通知
```

---

## 目錄結構

```
stock/
├── index.html        # 前端主頁面
├── sw.js             # Service Worker
├── manifest.json     # PWA 設定
├── icon-192.png      # PWA 圖示（192x192）
├── icon-512.png      # PWA 圖示（512x512）
├── banner.png        # 推播通知橫幅圖
├── favicon.ico       # 瀏覽器分頁圖示
├── worker.js         # Cloudflare Worker 原始碼
├── wrangler.toml     # Wrangler 設定檔
├── package.json      # npm scripts 設定
└── .gitignore        # 排除 node_modules/ .wrangler/
```

---

## 資料來源說明

| 資料 | 來源 | 類型 |
|------|------|------|
| 台股期貨（FITX） | HiStock | HTML 爬蟲（POST） |
| 富台指（TWN） | HiStock | HTML 爬蟲（POST，備援） |
| 富台指（TWNCON） | 鉅亨網 | JSON API（主要） |
| 台股/台積電期貨 | TaiFex 官方 API | JSON API |
| 台股個股現貨 | Fugle 官方 API | JSON API（需 API Key） |
| 技術指標（SMA/RSI/KDJ/MACD/BB） | Fugle 官方 API | JSON API（需 API Key） |
| 個股法人明細 | 玩股網 (wearn.com) | HTML 爬蟲 |
| 三大法人合計 | 玩股網 (wearn.com) | HTML 爬蟲 |
| 外資期貨淨部位 | 玩股網 (wearn.com) | HTML 爬蟲 |
| 融資餘額 | 台灣證券交易所 (TWSE) | HTML 爬蟲 |
| 布蘭特原油 | 新浪財經 (hf_OIL) | 非官方字串 API |
| 黃金、白銀 | 新浪財經 (hf_GC, hf_SI) | 非官方字串 API |
| 美元指數（DXY） | 新浪財經 (DINIW) | 非官方字串 API（特殊欄位格式） |
| VIX 恐慌指數 | 新浪財經 (znb_VIX) | 非官方字串 API |
| 美股四大指數 + 盤前 | CNBC | 非官方 JSON API |
| 台積電 ADR（TSM） | CNBC | 非官方 JSON API |
| 美股/ETF 個股 | Yahoo Finance | 非官方 JSON API |
| TSM ADR 即時 | RobinHood | 暫停（TLS fingerprint 封鎖） |
| 恐慌貪婪指數 | CNN | 非官方 JSON API |
| 科技股財報日 | Finnhub | 官方 API（需 API Key，免費方案限 14 天） |
| 美股經濟行事曆 | MoneyDJ | 非官方 JSON API |
| 財經新聞 | Yahoo奇摩/中央社/自由時報 | RSS Feed |

---

## 注意事項

- 本專案使用的第三方 API（新浪、HiStock、CNBC、MoneyDJ）均為非官方接口，可能隨時變更或中斷
- RobinHood API 因 CloudFront WAF + TLS fingerprint 驗證，目前從非瀏覽器環境（Workers、curl、Java）無法存取
- Finnhub 免費方案超過 14 天的查詢會靜默截斷，不會報錯，查詢前需主動限制日期範圍
- VAPID 私鑰與 Fugle/Finnhub API Key 存放於 Cloudflare Worker Secrets，請勿提交至 Git
- `node_modules/` 和 `.wrangler/` 已加入 `.gitignore`
- Cron Trigger 時間為 UTC，台灣時間需加 8 小時換算
- Android 與 iOS 的推播 Action 按鈕有平台限制，目前僅電腦版與 Windows Edge 支援
- 前端資料自動刷新間隔為 5 分鐘（避免觸發第三方 API 封鎖限制）
- 新浪財經 API 回應為 GBK 編碼，必須透過 `TextDecoder("gbk")` 解碼，不可直接使用 `res.text()`
