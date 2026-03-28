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
            ├─ TaiFex        → 台積電期貨
            ├─ 新浪財經       → 布蘭特原油、黃金、白銀、美元指數、VIX
            ├─ CNBC          → 美股四大指數、盤前電子盤、TSM ADR
            └─ RobinHood     → TSM ADR 即時報價
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

**現有路徑：**

| 路徑 | 資料來源 | 說明 |
|------|----------|------|
| `/fitx` | HiStock | 台股期貨即時報價 |
| `/twn` | HiStock | 富台指即時報價 |
| `/taifex` | TaiFex | 台積電期貨報價 |
| `/sina_brent` | 新浪財經 | 布蘭特原油 |
| `/sina_gold` | 新浪財經 | 黃金期貨 |
| `/sina_silver` | 新浪財經 | 白銀期貨 |
| `/sina_usdollar` | 新浪財經 | 美元指數（DINIW） |
| `/sina_vix` | 新浪財經 | VIX 恐慌指數 |
| `/cnbc` | CNBC | 美股四大指數 + 盤前電子盤 + TSM ADR |
| `/rh` | RobinHood | TSM ADR 即時變動 |
| `/subscribe` | — | 接收並儲存裝置推播訂閱資料 |
| `/push-test` | — | 手動觸發推播測試 |

**免費額度：** 每天 10 萬次請求，個人使用完全足夠。

---

### 3. 新浪財經非官方 API（hq.sinajs.cn）

**用途：** 即時原物料與市場情緒指數報價

**解決的問題：** HiStock、StockQ 等網站需要 HTML 爬蟲解析，資料延遲較高。新浪財經的 `hq.sinajs.cn` 接口直接回傳結構化字串，更新頻率接近 Investing.com、TradingView 等專業平台等級。

**注意事項：** 此為非官方、未公開文件的接口，新浪沒有義務維持相容性，使用時需加 `Referer` header 才能正常回應。

**常用 Symbol 對照：**

| Symbol | 說明 |
|--------|------|
| `hf_OIL` | 布蘭特原油 |
| `hf_GC` | 黃金期貨 |
| `hf_SI` | 白銀期貨 |
| `hf_VX` | VIX 恐慌指數 |
| `DINIW` | 美元指數（欄位格式與其他不同，需特殊處理） |

---

### 4. PWA（Progressive Web App）

**用途：** 讓網頁可安裝至手機桌面，提供類原生 App 體驗

**解決的問題：** 使用者不需要透過 App Store 安裝，直接從瀏覽器加入主畫面，開啟時沒有瀏覽器 UI，體驗接近原生 App。

**實作所需檔案：**

- `manifest.json`：定義 App 名稱、圖示、啟動 URL、顯示模式
- `icon-192.png`：通知圖示與主畫面圖示
- `icon-512.png`：高解析度圖示
- `banner.png`：推播通知橫幅圖

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

---

### 5. Service Worker（sw.js）

**用途：** 在瀏覽器背景執行的 JavaScript，是 PWA 推播通知的核心

**解決的問題：** 普通網頁關閉後就無法接收任何訊息。Service Worker 獨立於網頁之外運行，即使使用者沒有開啟頁面，也能接收來自伺服器的推播通知並顯示給使用者。

**重要機制：**

- `skipWaiting()`：新版本安裝後立即接管，不等舊版退場
- `clients.claim()`：立即接管所有已開啟的頁面
- `controllerchange` 事件：偵測到 SW 更新後自動重新整理頁面，確保使用者看到最新版本

**更新機制：** 瀏覽器會定期比對 `sw.js` 的內容，只要檔案有任何變動，就會自動觸發更新流程，不需要手動操作。

---

### 6. Web Push Protocol

**用途：** 從伺服器主動推送通知到使用者裝置

**解決的問題：** 傳統網頁無法主動聯繫使用者，必須等使用者自己開啟頁面。Web Push 讓伺服器可以在任何時間點主動推送通知，即使頁面已關閉。

**推播底層基礎設施：**

| 平台 | 推播服務 |
|------|----------|
| Android / Chrome | FCM（Firebase Cloud Messaging） |
| iOS / Safari | APNs（Apple Push Notification service） |

**推播流程：**
```
1. 使用者允許通知權限
2. 瀏覽器向 FCM/APNs 申請 subscription（含 endpoint URL）
3. 前端將 subscription 傳送到 Worker，存入 KV
4. Worker 需要推播時，向 endpoint URL 發送加密訊息
5. FCM/APNs 將通知推送到使用者裝置
6. Service Worker 接收並顯示通知
```

**訊息加密：** Web Push 規範要求訊息必須使用 `aes128gcm` 加密，搭配 ECDH 金鑰交換和 HKDF 金鑰推導，本專案使用 Cloudflare Workers 內建的 Web Crypto API 手動實作，不依賴任何外部套件。

---

### 7. VAPID 金鑰（vapidkeys.com）

**用途：** Web Push 身份驗證

**解決的問題：** FCM/APNs 要求推播請求必須附帶有效的身份證明，才會接受並轉送通知。VAPID（Voluntary Application Server Identification）透過一對公私鑰提供這個驗證機制。

**產生方式：** 透過 [vapidkeys.com](https://vapidkeys.com/) 線上產生一組公私鑰：

- **公鑰（Public Key）**：放在前端，供瀏覽器訂閱時使用
- **私鑰（Private Key）**：存放於 Cloudflare Worker Secrets，伺服器端簽名用，絕對不能暴露在前端

**儲存位置：**

| 變數名稱 | 類型 | 用途 |
|----------|------|------|
| `VAPID_PUBLIC_KEY` | Secret | VAPID 公鑰 |
| `VAPID_PRIVATE_KEY` | Secret | VAPID 私鑰 |
| `VAPID_SUBJECT` | Plaintext | 聯絡信箱（mailto:...） |

---

### 8. Cloudflare KV

**用途：** 儲存各裝置的 Push Subscription

**解決的問題：** Worker 是無狀態的（Stateless），每次請求結束後不保留任何資料。需要一個持久化儲存空間來記錄所有裝置的 subscription，才能在 Cron 觸發時知道要推播給哪些裝置。

**資料結構：**
```
Key: "subscriptions"
Value: [
  { endpoint: "https://fcm.googleapis.com/...", keys: { auth: "...", p256dh: "..." } },
  { endpoint: "https://fcm.googleapis.com/...", keys: { auth: "...", p256dh: "..." } },
  ...
]
```

**特性：** 自動去除重複 endpoint，同一裝置多次訂閱不會重複儲存。

**免費額度：** 每天 10 萬次讀寫，個人使用完全足夠。

---

### 9. Cloudflare Cron Trigger

**用途：** 定時執行推播邏輯

**解決的問題：** 純前端無法主動發起任何動作，必須等使用者開啟頁面才能執行。Cron Trigger 讓 Worker 可以在固定時間自動執行，不需要使用者任何操作。

**時區注意：** Cron Trigger 只支援 UTC，台灣（UTC+8）需手動換算：

| 台灣時間 | UTC | Cron 設定 |
|----------|-----|-----------|
| 每天 08:00 | 00:00 | `0 0 * * *` |
| 每天 12:00 | 04:00 | `0 4 * * *` |
| 每天 20:00 | 12:00 | `0 12 * * *` |

**wrangler 安裝方式：**
```toml
npm install -g wrangler
```

**wrangler.toml 設定：**
```toml
[triggers]
crons = ["0 0 * * *"]
```

**本地測試方式（需開兩個終端機）：**
```powershell
# 視窗一：啟動本地伺服器（連線真實 KV）
npm run dev

# 視窗二：手動觸發 Cron
npm run cron-test
```

---

### 10. Node.js 與 npm

**用途：** 執行 Wrangler CLI 工具

**解決的問題：** Wrangler 是 Cloudflare 官方的 CLI 工具，需要 Node.js 環境才能執行。本專案不使用任何 npm 套件，Node.js 和 npm 的唯一用途是執行 Wrangler。

---

### 11. Wrangler CLI

**用途：** Cloudflare Workers 的開發與部署工具

**解決的問題：** 取代每次都要手動開啟瀏覽器、複製貼上程式碼、點擊 Deploy 的繁瑣流程。

**常用指令（透過 package.json scripts 封裝）：**

```powershell
npm run dev      # wrangler dev --test-scheduled --remote（本地開發 + 連線真實 KV）
npm run deploy   # wrangler deploy（部署 worker.js 到 Cloudflare）
npm run cron-test # 手動觸發 Cron（需先執行 npm run dev）
```

**wrangler.toml 關鍵設定：**
```toml
name = "billowing-queen-4a58"
main = "worker.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "KV"
id = "e733a1b2b10c4c44b9aa862b241ee83f"

[triggers]
crons = ["0 0 * * *"]
```

**注意：** `npm run deploy` 會自動 minify 程式碼，部署後在 Cloudflare 後台 Edit code 看到的是壓縮版本，原始碼請以本地 `worker.js` 為準。

---

## 本地通知 vs 推播通知

| | 本地通知 | Web Push 推播通知 |
|--|----------|-------------------|
| 觸發方式 | 頁面開著時由 JS 觸發 | 伺服器主動發送 |
| 頁面需開著 | ✅ 需要 | ❌ 不需要 |
| 實作複雜度 | 簡單 | 複雜（需 VAPID + 加密） |
| 使用情境 | 價格門檻警示（頁面開著） | 每日摘要、重大事件 |

本專案兩種都有實作：
- **本地通知**：`loadCommodity()` 等函數中，當資料符合條件時呼叫 `sendNotification()`
- **Web Push**：`handleCron()` 定時推播 + `/push-test` 手動測試

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
| 富台指（TWN） | HiStock | HTML 爬蟲（POST） |
| 台積電期貨 | TaiFex 官方 API | JSON API |
| 布蘭特原油 | 新浪財經 | 非官方字串 API |
| 黃金、白銀 | 新浪財經 | 非官方字串 API |
| 美元指數（DXY） | 新浪財經 | 非官方字串 API（特殊欄位格式） |
| VIX 恐慌指數 | 新浪財經 | 非官方字串 API |
| 美股四大指數 + 盤前 | CNBC | 非官方 JSON API |
| 台積電 ADR（TSM） | CNBC + RobinHood | 非官方 JSON API（雙來源） |

---

## 注意事項

- 本專案使用的第三方 API（新浪、HiStock、CNBC、RobinHood）均為非官方接口，可能隨時變更或中斷
- VAPID 私鑰存放於 Cloudflare Worker Secrets，請勿提交至 Git
- `node_modules/` 和 `.wrangler/` 已加入 `.gitignore`
- Cron Trigger 時間為 UTC，台灣時間需減 8 小時換算
