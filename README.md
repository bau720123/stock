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
            ├─ Fugle         → 台積電現貨（需 API Key）
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
| `/tsmc` | Fugle | 台積電現貨即時報價（含委託簿） |
| `/sina_brent` | 新浪財經 | 布蘭特原油 |
| `/sina_gold` | 新浪財經 | 黃金期貨 |
| `/sina_silver` | 新浪財經 | 白銀期貨 |
| `/sina_usdollar` | 新浪財經 | 美元指數（DINIW） |
| `/sina_vix` | 新浪財經 | VIX 恐慌指數 |
| `/cnbc` | CNBC | 美股四大指數 + 盤前電子盤 + TSM ADR |
| `/rh` | RobinHood | TSM ADR 即時變動 |
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

### 4. Fugle 富果 API

**用途：** 台積電現貨即時報價（含委託簿）

**解決的問題：** 提供台灣股市的官方即時報價，包含委買委賣五檔、均價、漲跌幅等完整資訊，資料來源可靠且有官方文件支援。

**API 端點：**
```
https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/{symbol}
```

**認證方式：** Header 帶入 `X-API-KEY`，API Key 存放於 Cloudflare Worker Secrets（`FUGLE_KEY`）。

**回傳欄位：**

| 欄位 | 說明 |
|------|------|
| `previousClose` | 上個收盤價 |
| `openPrice` | 開盤價 |
| `highPrice` | 最高價 |
| `lowPrice` | 最低價 |
| `closePrice` | 現價 |
| `avgPrice` | 均價 |
| `change` | 漲跌點數 |
| `changePercent` | 漲跌幅（%） |
| `bids` | 委買五檔（price + size） |
| `asks` | 委賣五檔（price + size） |

---

### 5. PWA（Progressive Web App）

**用途：** 讓網頁可安裝至手機桌面，提供類原生 App 體驗

**解決的問題：** 使用者不需要透過 App Store 安裝，直接從瀏覽器加入主畫面，開啟時沒有瀏覽器 UI，體驗接近原生 App。

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

### 6. Service Worker（sw.js）

**用途：** 在瀏覽器背景執行的 JavaScript，是 PWA 推播通知的核心

**解決的問題：** 普通網頁關閉後就無法接收任何訊息。Service Worker 獨立於網頁之外運行，即使使用者沒有開啟頁面，也能接收來自伺服器的推播通知並顯示給使用者。

**重要機制：**

- `skipWaiting()`：新版本安裝後立即接管，不等舊版退場
- `clients.claim()`：立即接管所有已開啟的頁面
- `controllerchange` 事件：搭配 `sessionStorage` 防止無限 reload，偵測到 SW 更新後自動重新整理一次

**更新機制：** 瀏覽器會定期比對 `sw.js` 的內容，只要檔案有任何變動，就會自動觸發更新流程，不需要手動操作。

---

### 7. Web Push Protocol

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
3. 前端將 subscription 傳送到 Worker，存入 KV
4. Worker 需要推播時，向 endpoint URL 發送加密訊息
5. FCM/APNs/WNS 將通知推送到使用者裝置
6. Service Worker 接收並顯示通知
```

**訊息加密：** Web Push 規範要求訊息必須使用 `aes128gcm` 加密，搭配 ECDH 金鑰交換和 HKDF 金鑰推導，本專案使用 Cloudflare Workers 內建的 Web Crypto API 手動實作，不依賴任何外部套件。

**平台差異：**

| 平台 | Action 按鈕 | 備註 |
|------|-------------|------|
| 電腦 Chrome | ✅ 正常 | 完整支援 |
| Android Chrome | ❌ 有 bug | 永遠回傳最後一個按鈕的 action，已改為不帶 actions |
| iOS Safari PWA | ❌ 不顯示 | 系統不支援 action 按鈕，已改為不帶 actions |
| Windows Edge | ✅ 正常 | WNS 通道，完整支援 |

---

### 8. VAPID 金鑰（vapidkeys.com）

**用途：** Web Push 身份驗證

**解決的問題：** FCM/APNs 要求推播請求必須附帶有效的身份證明，才會接受並轉送通知。VAPID（Voluntary Application Server Identification）透過一對公私鑰提供這個驗證機制。

**產生方式：** 透過 [vapidkeys.com](https://vapidkeys.com/) 線上產生一組公私鑰。

**注意事項：**
- `VAPID_SUBJECT` 格式必須是 `mailto:email@example.com`，不能有空格或角括號，否則 Apple APNs 會回傳 `BadJwtToken` 錯誤
- `VAPID_SUBJECT` 為 Plaintext 變數，需加入 `wrangler.toml` 的 `[vars]` 區塊，否則每次 `wrangler deploy` 會將其覆蓋清除

**儲存位置：**

| 變數名稱 | 類型 | 存放位置 |
|----------|------|----------|
| `VAPID_PUBLIC_KEY` | Secret | Cloudflare 後台 |
| `VAPID_PRIVATE_KEY` | Secret | Cloudflare 後台 |
| `VAPID_SUBJECT` | Plaintext | `wrangler.toml` `[vars]` |
| `FUGLE_KEY` | Secret | Cloudflare 後台 |

---

### 9. Cloudflare KV

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
  "platform": "Mozilla/5.0 (Linux; Android...)"
}
```

**LOG 資料結構：**
```json
{
  "time": "2026-03-28 16:48:16",
  "tag": "SW",
  "message": "Push 訂閱完成，已傳送到 Worker"
}
```

**免費額度：** 每天 10 萬次讀寫，個人使用完全足夠。

---

### 10. Cloudflare Cron Trigger

**用途：** 定時執行推播邏輯

**現有設定：** 每小時整點觸發（`0 */1 * * *`）

**時間過濾邏輯：** 在 `handleCron()` 內判斷台灣時間，週六週日及凌晨 00:00～04:59 不執行推播：

```javascript
const twHour = (now.getUTCHours() + 8) % 24;
const twDay  = new Date(now.getTime() + 8 * 3600 * 1000).getUTCDay();
if (twDay === 0 || twDay === 6) return; // 週末不執行
if (twHour < 5) return;                 // 凌晨不執行
```

**本地測試方式（需開兩個終端機）：**
```powershell
# 視窗一：啟動本地伺服器（連線真實 KV）
npm run dev

# 視窗二：手動觸發 Cron
npm run cron-test
```

---

### 11. Node.js 與 npm

**用途：** 執行 Wrangler CLI 工具

**安裝：**
```powershell
npm install -g wrangler
```

---

### 12. Wrangler CLI

**用途：** Cloudflare Workers 的開發與部署工具

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
- Secret 變數（`VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`FUGLE_KEY`）不可放入 `wrangler.toml`，只能在後台設定
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
| 台股市場概況 | 台積電期貨、台股期貨（FITX）、富台指（TWN）、台積電現貨（含委託簿） |
| 美股市場概況 | 盤前電子盤 Fair Value、道瓊/標普/納斯達克/費城半導體、TSM ADR |
| 原物料市場 | 布蘭特原油、黃金、白銀 |
| 市場情緒 | 美元指數（DXY）、VIX 恐慌指數 |
| 台積電 ADR | CNBC 盤中/盤前/盤後變動 |

**Header 功能：**
- `☰` 漢堡按鈕：開啟左側 Slide Menu
- 重新整理按鈕：手動刷新資料（含倒數計時）
- 訂閱通知按鈕：開啟推播訂閱流程（鈴鐺圖示，已授權時亮起）

**URL 參數（隱藏功能）：**
```
?size=200&price=1785
```
帶入台積電委買張數門檻與委賣價格門檻，符合條件時觸發本地通知警示。

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
| 富台指（TWN） | HiStock | HTML 爬蟲（POST） |
| 台積電期貨 | TaiFex 官方 API | JSON API |
| 台積電現貨 | Fugle 官方 API | JSON API（需 API Key） |
| 布蘭特原油 | 新浪財經 | 非官方字串 API |
| 黃金、白銀 | 新浪財經 | 非官方字串 API |
| 美元指數（DXY） | 新浪財經 | 非官方字串 API（特殊欄位格式） |
| VIX 恐慌指數 | 新浪財經 | 非官方字串 API |
| 美股四大指數 + 盤前 | CNBC | 非官方 JSON API |
| 台積電 ADR（TSM） | CNBC | 非官方 JSON API |
| TSM ADR 即時 | RobinHood | 暫停（TLS fingerprint 封鎖） |

---

## 注意事項

- 本專案使用的第三方 API（新浪、HiStock、CNBC）均為非官方接口，可能隨時變更或中斷
- RobinHood API 因 CloudFront WAF + TLS fingerprint 驗證，目前從非瀏覽器環境（Workers、curl、Java）無法存取
- VAPID 私鑰與 Fugle API Key 存放於 Cloudflare Worker Secrets，請勿提交至 Git
- `node_modules/` 和 `.wrangler/` 已加入 `.gitignore`
- Cron Trigger 時間為 UTC，台灣時間需減 8 小時換算
- Android 與 iOS 的推播 Action 按鈕有平台限制，目前僅電腦版與 Windows Edge 支援
