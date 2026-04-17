const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" }
  });
}

export default {
  async fetch(request, env) {
    // 呼叫網址：https://billowing-queen-4a58.bau720123.workers.dev/path

    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const path = new URL(request.url).pathname;

    if (path === "/fitx")    return await fetchHiStock("stocktop2017", "FITX", "指數", "成交量(口)"); // 台指近
    if (path === "/twn")     return await fetchHiStock("stocktop2017", "TWN", "指數", "成交量(口)"); // 富台指

    // https://invest.cnyes.com/futures/GF/TWNCON
    if (path === "/twncon")     return await fetchCnyesTwn(); // 富台指

    // if (path === "/brent")    return await fetchHiStock("stocktop2017_Global", "BRENTOIL", "股價", "成交量");
    // if (path === "/brent_stockq")   return await fetchBrent();

    // 新浪網
    if (path.startsWith("/sina/")) {
      // VIX 恐慌指數：https://quotes.sina.cn/index/global/vix
      // hf_VX 是期貨
      const symbol = path.split("/sina/")[1];
      if (symbol) return await fetchSina(symbol);
    }

    if (path === "/debug-sina") return await debugSina();

    if (path.startsWith("/taifex/")) {
      const parts = path.split("/"); // ["", "taifex", "12", "CDF046"]
      const objId = parts[2];
      const contract = parts[3];
      if (objId && contract) return await fetchTaifex(objId, contract);
    }

    if (path === "/cnbc")    return await fetchCnbc();
    if (path === "/rh")      return await fetchRobinHood();

    if (path === "/foreign-net-position")      return await fetchForeignNetPosition();
    if (path === "/institutional")      return await fetchInstitutional();
  
    if (path === "/subscribe") return await handleSubscribe(request, env);
    if (path === "/push-test") return await handlePushTest(env);
    if (path === "/read-subs") return await readSubs(env);
    if (path === "/clear-subs") return await clearSubs(env);
    if (path === "/read-logs") return await readLogs(env);
    if (path === "/write-logs") return await handleWriteLogs(request, env);
    if (path === "/clear-logs") return await clearLogs(env);

    if (path.startsWith("/stock/")) {
      const parts = path.split("/"); // ["", "stock", "quote", "2330"]
      const method = parts[2];
      const symbol = parts[3];

      if (method === "quote" && symbol)   return await fetchFugleQuote(symbol, env);
      if (method === "volume" && symbol)   return await fetchFugleVolume(symbol, env);
      if (method === "history" && symbol)   return await fetchFugleHistory(symbol, env);
      if (method === "institutional" && symbol)   return await fetchFugleInstitutional(symbol);
      if (method === "sma" && symbol)   return await fetchFugleSma(symbol, env);
      if (method === "rsi" && symbol)   return await fetchFugleRsi(symbol, env);
      if (method === "kdj" && symbol)   return await fetchFugleKdj(symbol, env);
      if (method === "macd" && symbol)   return await fetchFugleMacd(symbol, env);
      if (method === "brands" && symbol)   return await fetchFugleBrands(symbol, env);
    }

    if (path.startsWith("/yahoo-finance/")) {
      const symbol = decodeURIComponent(path.split("/yahoo-finance/")[1]);
      if (symbol) return await fetchYahooFinance(symbol, 1, 1);
    }

    if (path === "/news-rss")  return await fetchNewsRss(env);

    if (path === "/america-calendar") return await fetchAmericaCalendar(env);

    if (path.startsWith("/generateCustomEventsFinnhub")) {
      try {
        const parts = path.split("/").filter(Boolean);
        const today = new Date().toISOString().split('T')[0];
        const from = parts[1] || today;
        const to   = parts[2] || today;

        const result = await generateCustomEventsFinnhub(from, to, env);
        return new Response(JSON.stringify({ success: true, from, to, count: result.length, data: result }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message, stack: e.stack }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    if (path === "/fear-greed") return await fetchFearAndGreed();

    return json({ error: "unknown path" }, 404);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleCron(env));
  }
};

async function debugSina() {
  const res = await fetch("https://hq.sinajs.cn/list=hf_YM,hf_ES,hf_NQ,gb_dji,gb_inx,gb_ixic,gb_sox,gb_tsm,hf_OIL,hf_GC,hf_SI,DINIW,znb_VIX", {
    headers: {
      "User-Agent": UA,
      "Referer": "https://finance.sina.com.cn/"
    }
  });

  // 1. 先取得原始的 ArrayBuffer (二進位資料)
  const buffer = await res.arrayBuffer();

  // 2. 使用 TextDecoder 並指定 'gbk' 編碼
  const decoder = new TextDecoder("gbk");
  const text = decoder.decode(buffer);

  // 3. 回傳時強制指定 charset=utf-8，讓你的瀏覽器/App 能正確顯示
  return new Response(text, { 
    headers: { 
      ...CORS, 
      "Content-Type": "text/plain; charset=utf-8" 
    } 
  });
}

// HiStock（台指期 / 富台指）
async function fetchHiStock(m, no, current_title, volume_title) {
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), 3000)
    );

    const res = await Promise.race([
      fetch("https://histock.tw/stock/module/function.aspx", {
        method: "POST",
        headers: {
          "User-Agent": UA,
          "Origin": "https://histock.tw",
          "Referer": "https://histock.tw/",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ m, no })
      }),
      timeout
    ]);
    const html = await res.text();

    const data = {};
    const pat = /<li[^>]*>[\s\S]*?<[^>]*ci_title[^>]*>([\s\S]*?)<\/[^>]+>[\s\S]*?<[^>]*ci_value[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/g;
    let match;
    while ((match = pat.exec(html)) !== null) {
      const title = match[1].replace(/<[^>]+>/g, "").trim();
      const value = match[2].replace(/<[^>]+>/g, "").trim();
      if (title) data[title] = value;
    }

    const timeMatch = html.match(/~\s*([\d.]+\s+[\d:]+)/);

    return json({
      success: Object.keys(data).length > 0,
      open:       toFloat(data["開盤"]),
      high:       toFloat(data["最高"]),
      low:        toFloat(data["最低"]),
      changeText: data["漲跌"] || "",
      current:    toFloat(data[current_title]),
      volume:     toInt(data[volume_title]),
      updateTime: timeMatch ? timeMatch[1].trim() : "未知",
    });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

// 鉅亨網（富台指）
async function fetchCnyesTwn() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      "https://ws.api.cnyes.com/ws/api/v1/quote/quotes/GF:TWNCON:FUTURES?column=G,QUOTES",
      {
        signal: controller.signal,
        headers: {
          "User-Agent": UA,
          "Referer": "https://invest.cnyes.com/",
          "Origin": "https://invest.cnyes.com",
        }
      }
    );
    clearTimeout(timer);

    const json_data = await res.json();
    const item = json_data?.data?.[0];
    if (!item) return json({ success: false, error: "no data" });

    const ts = item["200007"];
    const updateTime = ts
      ? new Date((ts + 8 * 3600) * 1000).toISOString().replace('T', ' ').substring(0, 19)
      : "未知";

    return json({
      success: true,
      name:       item["200009"] || "近月富台指",
      price:      toFloat(item["6"]),
      updown:     toFloat(item["11"]),
      high:       toFloat(item["12"]),
      low:        toFloat(item["13"]),
      open:       toFloat(item["19"]),
      volume:     toInt(item["800001"]),
      updateTime,
    });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

// StockQ（布蘭特原油）
async function fetchBrent() {
  try {
    const res = await fetch("https://www.stockq.org/commodity/FUTRBOIL.php", {
      headers: { "User-Agent": UA }
    });
    const html = await res.text();

    // 找 class='row2' 的位置，然後找後面第一個 <td...> 到 </td>
    const row2Idx = html.indexOf("class='row2'");
    if (row2Idx === -1) return json({ success: false, error: "找不到 row2" });

    const afterRow2 = html.substring(row2Idx);
    const tdStart = afterRow2.indexOf("<td");
    const tdEnd   = afterRow2.indexOf("</td>");
    if (tdStart === -1 || tdEnd === -1) return json({ success: false, error: "找不到 td" });

    const tdContent = afterRow2.substring(tdStart, tdEnd);
    const priceText = tdContent.replace(/<[^>]+>/g, "").trim();
    const price = toFloat(priceText);

    return json({ success: true, price, priceText });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

// 新浪網
async function fetchSina(list) {
  // https://gu.sina.cn/ft/hq/hf.php?symbol=OIL
  try {
    const res = await fetch(`https://hq.sinajs.cn/list=${list}`, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://finance.sina.com.cn/"
      }
    });
    // const text = await res.text();

  // 1. 先取得原始的 ArrayBuffer (二進位資料)
  const buffer = await res.arrayBuffer();

  // 2. 使用 TextDecoder 並指定 'gbk' 編碼
  const decoder = new TextDecoder("gbk");
  const text = decoder.decode(buffer);

    const match = text.match(/"([^"]+)"/);
    if (!match) return json({ success: false, error: "解析失敗" });

    const parts = match[1].split(",");

    if (list === "DINIW") {
      // 美元指數
      return json({
        success: true,
        title:  parts[9],
        time:   parts[10] + " " + parts[0] || "",
        price:  toFloat(parts[1]),
        open:   toFloat(parts[3]),
        low:    toFloat(parts[5]),
        high:   toFloat(parts[6]),
        prev:   toFloat(parts[7]),
      });
    } else if (list.startsWith('znb_')) {
      const price = toFloat(parts[1]);

      const result = {
        success: true,
        title:  parts[0],
        time:   parts[6] + " " + parts[7] || "",
        price:  price,
        open:   toFloat(parts[8]),
        low:    toFloat(parts[11]),
        high:   toFloat(parts[10]),
        prev:   toFloat(parts[9]),
      };

      // znb_VIX 恐慌指數
      if (list === 'znb_VIX') {
        result.rating = getVixStatus(price);
      }

      return json(result);
    } else if (list.startsWith('gb_')) {
      // gb_dji 道瓊工業指數
      // gb_inx 標普500指數
      // gb_ixic 那斯達克指數
      // gb_sox 費城半導體指數
      // gb_tsm 台積電 ADR
      return json({
        success: true,
        title:  parts[0],
        time:   parts[3] || "",
        price:  toFloat(parts[1]),
        open:   toFloat(parts[5]),
        low:    toFloat(parts[7]),
        high:   toFloat(parts[6]),
        prev:   toFloat(parts[26]),
      });
    } else if (list.startsWith('hf_')) {
      // hf_YM	道瓊期貨
      // hf_ES	標普 500 期貨
      // hf_NQ	納斯達克 100 期貨
      // hf_OIL 布蘭特原油
      // hf_GC 黃金
      // hf_SI 白銀

      const price = toFloat(parts[0]);

      const result = {
        success: true,
        title:  parts[13],
        price:  price,
        open:   toFloat(parts[8]),
        high:   toFloat(parts[4]),
        low:    toFloat(parts[5]),
        time:   parts[12] + " " + parts[6] || "",
        prev:   toFloat(parts[7]),
      };

      if (list === 'hf_OIL') {
        result.rating = getBrentStatus(price);
      }

      return json(result);
    } else {
      return json({
        success: true,
        title: '',
        price:  0,
        open:   0,
        high:   0,
        low:    0,
        time:   0,
        prev:   0,
      });
    }

  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

// 台灣期貨交易所
async function fetchTaifex(objId, contract) {
  try {
    const res = await fetch("https://www.taifex.com.tw/cht/quotesApi/getQuotes?objId=" + objId, {
      headers: { "User-Agent": UA, "Accept": "application/json" }
    });
    const data = await res.json();

    // const item = data.find(d => d.contract === contract);
    let item;
    if (contract === 'TX046' || contract === 'TX056') {
      item = data.find(d => d.contractName === '臺股期貨');
    } else {
      item = data.find(d => d.contract === contract);
    }

    // 找不到時回傳空資料（資料從缺時正常現象）
    if (!item) {
      return json({
        success: false,
        contract: "",
        contractName: "",
        price: 0,
        updown: 0,
        ttlvol: 0,
      });
    }

    return json({
      success: true,
      contract:     item.contract || "",
      contractName: item.contractName || "",
      price:        toFloat(item.price),
      updown:       toFloat(item.updown),
      ttlvol:       toInt(item.ttlvol),
    });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

// ── CNBC（美股四大指數 + TSM ADR + 盤前電子盤）─────────────
async function fetchCnbc() {
  try {
    const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    // 1. 盤前 Fair Value (邏輯保持不變)
    // https://www.cnbc.com/pre-markets/
    const fvRes = await fetch(
      "https://quote.cnbc.com/quote-html-webservice/fvquote.htm?requestMethod=quick&noform=0&realtime=0&client=fairValue&output=json&symbols=DJ|SP|ND|TF",
      { headers: { "User-Agent": UA } }
    );
    const fvData = await fvRes.json();
    const fvQuotes = fvData?.FairValueQuoteResult?.FairValueQuote || [];

    const fv = { DJ: 0, SP: 0, ND: 0, TF: 0, updateTime: "未知" };
    for (const q of fvQuotes) {
      if (q.symbol in fv) fv[q.symbol] = q.fmt_change || 0;
      if (fv.updateTime === "未知" && q.last_timedate) fv.updateTime = q.last_timedate;
    }

    // 2. 四大指數 + 個股 (未來可在 symbols 繼續累加，如 |NVDA|AAPL)
    const qRes = await fetch(
      "https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=.DJI|.SPX|.IXIC|.SOX|TSM&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1",
      { headers: { "User-Agent": UA } }
    );
    const qData = await qRes.json();
    const quotes = qData?.FormattedQuoteResult?.FormattedQuote || [];

    // 初始化回應容器
    const market = { dji: "N/A", spx: "N/A", ixic: "N/A", sox: "N/A" };
    const stock = {}; 

    // 指數與代碼的映射表
    const indexMap = {
      ".DJI": "dji",
      ".SPX": "spx",
      ".IXIC": "ixic",
      ".SOX": "sox"
    };

    for (const q of quotes) {
      const sym = q.symbol;

      // 如果是四大指數
      if (indexMap[sym]) {
        market[indexMap[sym]] = q.change || "N/A";
      } else {
        // 如果不是指數 (代表是個股)，則放入分門別類的 stock 物件中
        stock[sym] = {
          regular: q.change || "N/A",
          type:    q.ExtendedMktQuote?.type || "",
          market:  q.ExtendedMktQuote?.change || "N/A"
        };
      }
    }

    return json({
      success: true,
      fairValue: {
        dow:     fv.DJ,
        sp:      fv.SP,
        nasdaq:  fv.ND,
        russell: fv.TF,
        updateTime: fv.updateTime,
      },
      market,
      stock, // 這裡現在會是 { TSM: { regular: "...", type: "...", market: "..." } }
    });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

// RobinHood（TSM ADR 即時）
async function fetchRobinHood() {
  try {
    const instrumentId = "ca4821f9-06c3-4c22-bbb8-efe569f23d2b";
    const res = await fetch(
      `https://bonfire.robinhood.com/instruments/${instrumentId}/detail-page-live-updating-data/?display_span=day&hide_extended_hours=false`,
      { headers: { "User-Agent": UA, "Accept": "application/json" } }
    );
    const data = await res.json();

    const display = data?.chart_section?.default_display;
    const changeText   = display?.secondary_value?.main?.value || "";
    const tertiaryText = display?.tertiary_value?.main?.value  || "";

    const quote = data?.chart_section?.quote;
    const previousClose = parseFloat(quote?.previous_close || "").toString();
    const previousCloseDate = quote?.previous_close_date || "";
    const updated_at = quote?.updated_at
      ? new Date(quote.updated_at).toLocaleString("zh-TW", {
          timeZone: "Asia/Taipei",
          hour12: false,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        }).replace(/\//g, '-')
      : '-';

    const success = changeText !== "" || tertiaryText !== "" || previousClose !== "" || previousCloseDate !== "" || updated_at !== "";
    return json({ success, changeText, tertiaryText, previousClose, previousCloseDate, updated_at });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

async function handleSubscribe(request, env) {
  try {
    const body = await request.json();
    const { userAgent, ...subscription } = body;

    // 記錄完整 userAgent
    const platform = userAgent || 'unknown';

    // 台灣時間（UTC+8）
    const now = new Date();
    const twTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const time = twTime.toISOString().replace('T', ' ').substring(0, 19);

    // 讀取現有的 subscriptions
    const existing = await env.KV.get("subscriptions");
    const list = existing ? JSON.parse(existing) : [];
  
    // 避免重複儲存同一個 endpoint
    const isDuplicate = list.some(s => s.endpoint === subscription.endpoint);
    if (!isDuplicate) {
      list.push({ ...subscription, platform, time });
      await env.KV.put("subscriptions", JSON.stringify(list));
    }

    return json({ success: true });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

// Web Push 發送
async function handlePushTest(env) {
  try {
    const existing = await env.KV.get("subscriptions");
    if (!existing) return json({ success: false, error: "沒有訂閱資料" });

    const list = JSON.parse(existing);
    const results = await Promise.all(
      list.map(sub => sendWebPush(sub, {
        title: '測試推播',
        body: '這是來自 Cloudflare Worker 的真實推播！',
        url: '/stock/index.html',
      // image: '/stock/banner.png',
      actions: (isAndroidPlatform(sub.platform) || isApplePlatform(sub.platform)) ? [] : [
        { action: 'view',    title: '查看詳情', icon: '/stock/icon-192.png' },
        { action: 'dismiss', title: '忽略',     icon: '/stock/icon-192.png' },
      ]
      }, env))
    );

    return json({ success: true, results });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

async function sendWebPush(subscription, payload, env) {
  try {
    const endpoint  = subscription.endpoint;
    const p256dh    = subscription.keys.p256dh;
    const auth      = subscription.keys.auth;
    const publicKey = env.VAPID_PUBLIC_KEY;
    const privateKey = env.VAPID_PRIVATE_KEY;
    const subject   = env.VAPID_SUBJECT;

    // 1. 建立 VAPID JWT
    const jwt = await buildVapidJwt(endpoint, subject, publicKey, privateKey);

    // 2. 加密 payload
    const body = await encryptPayload(JSON.stringify(payload), p256dh, auth);

    const isApple = endpoint.includes('web.push.apple.com');

    const headers = {
      'Authorization': `vapid t=${jwt},k=${publicKey}`,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL': '86400',
    };

    // Apple 需要額外的 header
    if (isApple) {
      headers['apns-push-type'] = 'alert';
      headers['apns-priority'] = '10';
    }

    // 3. 發送
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
    });

    // 顯示錯誤訊息
    const resText = await res.text();
    return { endpoint, status: res.status, responseBody: resText };
  } catch (e) {
    return { endpoint: subscription.endpoint, error: e.message };
  }
}

// VAPID JWT 建立
async function buildVapidJwt(endpoint, subject, publicKeyB64, privateKeyB64) {
  const now    = Math.floor(Date.now() / 1000);
  const origin = new URL(endpoint).origin;

  const header  = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const payload = b64url(JSON.stringify({ aud: origin, exp: now + 43200, sub: subject }));
  const input   = `${header}.${payload}`;

  // raw 32 bytes → PKCS8 格式（加上 EC 私鑰的 ASN.1 header）
  const rawKey = base64UrlDecode(privateKeyB64);
  const pkcs8  = buildPkcs8(rawKey);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', pkcs8,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(input)
  );

  return `${input}.${uint8ToB64url(new Uint8Array(sig))}`;
}

// raw EC 私鑰 → PKCS8 DER 格式
function buildPkcs8(rawKey) {
  // P-256 EC 私鑰的 PKCS8 ASN.1 header
  const header = new Uint8Array([
    0x30, 0x41, // SEQUENCE
    0x02, 0x01, 0x00, // INTEGER 0 (version)
    0x30, 0x13, // SEQUENCE (algorithmIdentifier)
      0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, // OID ecPublicKey
      0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, // OID P-256
    0x04, 0x27, // OCTET STRING
      0x30, 0x25, // SEQUENCE
        0x02, 0x01, 0x01, // INTEGER 1
        0x04, 0x20, // OCTET STRING (32 bytes)
  ]);
  return concat(header, rawKey);
}

// aes128gcm 加密
async function encryptPayload(plaintext, p256dhB64, authB64) {
  const encoder       = new TextEncoder();
  const clientPublic  = base64UrlDecode(p256dhB64);
  const authSecret    = base64UrlDecode(authB64);

  // 產生伺服器端 ECDH 金鑰對
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );

  const serverPublicRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);

  // 匯入客戶端公鑰
  const clientKey = await crypto.subtle.importKey(
    'raw', clientPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, []
  );

  // ECDH 共享秘密
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: clientKey },
    serverKeyPair.privateKey, 256
  );

  // 產生 salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF 建立 PRK
  const ikm = await hkdf(
    new Uint8Array(sharedBits), authSecret,
    concat(encoder.encode('WebPush: info\x00'), clientPublic, new Uint8Array(serverPublicRaw)),
    32
  );

  // 建立 CEK 和 nonce
  const cek   = await hkdf(ikm, salt, encoder.encode('Content-Encoding: aes128gcm\x00'), 16);
  const nonce = await hkdf(ikm, salt, encoder.encode('Content-Encoding: nonce\x00'), 12);

  // 匯入 AES-GCM 金鑰
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);

  // 加密（加上 padding delimiter \x02）
  const data      = concat(encoder.encode(plaintext), new Uint8Array([2]));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, data);

  // 組合 aes128gcm 格式：salt(16) + rs(4) + keyid_len(1) + keyid + ciphertext
  const serverPubArray = new Uint8Array(serverPublicRaw);
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);

  return concat(salt, rs, new Uint8Array([serverPubArray.length]), serverPubArray, new Uint8Array(encrypted));
}

// HKDF
async function hkdf(ikm, salt, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key, length * 8
  );
  return new Uint8Array(bits);
}

// 工具函數（Base64）
function b64url(str) {
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function uint8ToB64url(buf) {
  return btoa(String.fromCharCode(...buf)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - s.length % 4);
  return Uint8Array.from(atob(s + pad), c => c.charCodeAt(0));
}

function concat(...arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function readSubs(env) {
  const existing = await env.KV.get("subscriptions");
  if (!existing) return json({ count: 0, list: [] });
  const list = JSON.parse(existing);
  const summary = list.map(s => ({
    endpoint: s.endpoint.substring(0, 60) + '...', // 不顯示完整金鑰
    platform: s.platform || 'unknown',
    time: s.time || 'unknown',
  }));
  return json({ count: list.length, list: summary.reverse() }); // 最新的在前
}

async function clearSubs(env) {
  await env.KV.put("subscriptions", JSON.stringify([]));
  return json({ success: true, message: "已清除所有 subscriptions" });
}

async function readLogs(env) {
  const existing = await env.KV.get("logs");
  const logs = existing ? JSON.parse(existing) : [];
  return json({ count: logs.length, logs: logs.reverse() }); // 最新的在前
}

async function handleWriteLogs(request, env) {
  try {
    const body = await request.json();
    await writeLogs(env, body.tag || 'INFO', body.message || '');
    return json({ success: true });
  } catch (e) {
    return json({ success: false, error: e.message });
  }
}

async function writeLogs(env, tag, message) {
  try {
    const existing = await env.KV.get("logs");
    const logs = existing ? JSON.parse(existing) : [];

    // 台灣時間（UTC+8）
    const now = new Date();
    const twTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const time = twTime.toISOString().replace('T', ' ').substring(0, 19);

    logs.push({ tag, message, time });

    // 只保留最新 100 筆，避免 KV 無限增長
    if (logs.length > 100) logs.splice(0, logs.length - 100);

    await env.KV.put("logs", JSON.stringify(logs));
  } catch (e) {
    // log 失敗不影響主流程
  }
}

async function clearLogs(env) {
  await env.KV.put("logs", JSON.stringify([]));
  return json({ success: true, message: "已清除所有 logs" });
}

async function fetchFugleQuote(symbol, env) {
  try {
    const res = await fetch(
      `https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/${symbol}`,
      {
        headers: {
          "X-API-KEY": env.FUGLE_KEY,
          "Accept": "application/json"
        }
      }
    );

    if (!res.ok) {
      return json({ success: false, error: `HTTP ${res.status}` });
    }

    const d = await res.json();

    // 解析委買委賣
    const bids = (d.bids || []).map(b => ({ price: b.price, size: b.size }));
    const asks = (d.asks || []).map(a => ({ price: a.price, size: a.size }));

    return json({
      success: true,
      symbol:        d.symbol        || "",
      name:          d.name          || "",
      previousClose: d.previousClose || 0,
      openPrice:     d.openPrice     || 0,
      highPrice:     d.highPrice     || 0,
      lowPrice:      d.lowPrice      || 0,
      closePrice:    d.closePrice    || 0,
      avgPrice:      d.avgPrice      || 0,
      change:        d.change        || 0,
      changePercent: d.changePercent || 0,
      bids,
      asks,
      tradeVolume:       d.total?.tradeVolume       || 0,
      tradeVolumeAtBid:  d.total?.tradeVolumeAtBid  || 0,
      tradeVolumeAtAsk:  d.total?.tradeVolumeAtAsk  || 0,
      transaction:       d.total?.transaction        || 0,
    });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

async function fetchFugleVolume(symbol, env) {
  try {
    const res = await fetch(
      `https://api.fugle.tw/marketdata/v1.0/stock/intraday/volumes/${symbol}`,
      {
        headers: {
          "X-API-KEY": env.FUGLE_KEY,
          "Accept": "application/json"
        }
      }
    );

    if (!res.ok) {
      return json({ success: false, error: `HTTP ${res.status}` });
    }

    const d = await res.json();

    // 解析分價量表
    const data = (d.data || []).map(b => ({ price: b.price, volume: b.volume, volumeAtBid: b.volumeAtBid, volumeAtAsk: b.volumeAtAsk }));

    return json({
      success: true,
      data,
    });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

async function fetchFugleHistory(symbol, env) {
  try {
    const to   = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await fetch(
      `https://api.fugle.tw/marketdata/v1.0/stock/historical/candles/${symbol}?from=${from}&to=${to}&timeframe=D&fields=open,high,low,close,volume,turnover,change&sort=desc`,
      {
        headers: {
          "X-API-KEY": env.FUGLE_KEY,
          "Accept": "application/json"
        }
      }
    );

    if (!res.ok) {
      return json({ success: false, error: `HTTP ${res.status}` });
    }

    const d = await res.json();
    const data = d.data;

    return json({
      success: true,
      data,
    });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

async function fetchForeignNetPosition() {
  try {
    const url = `https://stock.wearn.com/taifexphoto.asp`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://stock.wearn.com/",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();

    // 找 class="mobile_img" 的 table
    const tableMatch = html.match(/<table[^>]*class="taifexphoto"[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) throw new Error("Table not found");

    const tableHtml = tableMatch[1];

    // 抓所有 <tr>，跳過前兩列（標題列）
    const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].slice(2);

    const data = rows.map(row => {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      if (cells.length < 4) return null;

      const rawDate = stripTags(cells[0][1]).trim(); // "115/04/15"
      const foreign  = parseNumber(cells[5][1]);     // 外資

      // 民國年轉西元
      const [y, m, d] = rawDate.split("/");
      const date = `${parseInt(y) + 1911}-${m}-${d}`;

      return { date, foreign };
    }).filter(Boolean);

    return json({ success: true, data });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

function formatValue(str) {
  if (!str) return 0; // 防止 stripTags 噴出 null 或 undefined

  const cleanStr = str
    .replace(/\s+/g, '')    // 1. 移除所有空白 (包含 - 1,208 中的空格)
    .replace(/,/g, '')      // 2. 移除千分位逗號 (把 1,208 變成 1208)
    .replace(/^\+/, '');    // 3. 移除開頭的正號

  const num = Number(cleanStr);
  
  // 檢查轉換是否成功，失敗則回傳 0，避免讓 total 變成 NaN
  return isNaN(num) ? 0 : num;
}

async function fetchInstitutional() {
  try {
    const url = `https://stock.wearn.com/fundthree.asp`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://stock.wearn.com/",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();

    // 找 class="mobile_img" 的 table
    const tableMatches = [...html.matchAll(/<table[^>]*class="mobile_img"[^>]*>([\s\S]*?)<\/table>/gi)];
    if (tableMatches.length < 2) throw new Error("Table not found");

    const tableHtml = tableMatches[1][1]; // 取第二筆

    // 抓所有 <tr>，跳過前兩列（標題列）
    const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].slice(2);

    const data = rows.map(row => {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      if (cells.length < 4) return null;

      const rawDate = stripTags(cells[0][1]).trim(); // "115/04/15"
      const trust    = formatValue(stripTags(cells[1][1]));     // 投信
      const dealer   = formatValue(stripTags(cells[2][1]));     // 自營商
      const foreign  = formatValue(stripTags(cells[3][1]));     // 外資

      // 現在這三個變數都是純數字了
      const totalNum = trust + dealer + foreign;

      // 民國年轉西元
      const [y, m, d] = rawDate.split("/");
      const date = `${parseInt(y) + 1911}-${m}-${d}`;

      return { date, trust, dealer, foreign, total: totalNum.toFixed(2) };
    }).filter(Boolean);

    return json({ success: true, data });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

async function fetchFugleInstitutional(symbol) {
  try {
    const url = `https://stock.wearn.com/netbuy.asp?kind=${symbol}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://stock.wearn.com/",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();

    // 找 class="mobile_img" 的 table
    const tableMatch = html.match(/<table[^>]*class="mobile_img"[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) throw new Error("Table not found");

    const tableHtml = tableMatch[1];

    // 抓所有 <tr>，跳過前兩列（標題列）
    const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].slice(2);

    const data = rows.map(row => {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      if (cells.length < 4) return null;

      const rawDate = stripTags(cells[0][1]).trim(); // "115/04/15"
      const trust    = parseNumber(cells[1][1]);     // 投信
      const dealer   = parseNumber(cells[2][1]);     // 自營商
      const foreign  = parseNumber(cells[3][1]);     // 外資
      const total  = trust + dealer + foreign;       // 合計

      // 民國年轉西元
      const [y, m, d] = rawDate.split("/");
      const date = `${parseInt(y) + 1911}-${m}-${d}`;

      return { date, trust, dealer, foreign, total };
    }).filter(Boolean);

    return json({ success: true, data });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

// 去除 HTML tags
function stripTags(html) {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, "").trim();
}

// 解析數字，處理 "+ 4,826" / "-138" 格式
function parseNumber(html) {
  const text = stripTags(html).replace(/,/g, "").replace(/\s/g, "");
  const match = text.match(/[+-]?\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

async function fetchFugleSma(symbol, env) {
  try {
    const to   = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 60MA需要更長區間
    const periods = [5, 10, 20, 60];

    // 平行打四支API
    const results = await Promise.all(
      periods.map(period =>
        fetch(
          `https://api.fugle.tw/marketdata/v1.0/stock/technical/sma/${symbol}?from=${from}&to=${to}&timeframe=D&period=${period}`,
          { headers: { "X-API-KEY": env.FUGLE_KEY, "Accept": "application/json" } }
        ).then(r => r.json())
      )
    );

    // 以 date 為 key 合併資料
    const merged = {};
    periods.forEach((period, i) => {
      const rows = results[i]?.data || [];
      rows.forEach(row => {
        if (!merged[row.date]) merged[row.date] = { date: row.date };
        merged[row.date][`sma_${period}`] = parseFloat(row.sma.toFixed(2));
      });
    });

    // 轉回陣列並依日期遞減排序
    const data = Object.values(merged).sort((b, a) => a.date.localeCompare(b.date));

    return json({ success: true, data });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

async function fetchFugleRsi(symbol, env) {
  try {
    const to   = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const periods = [6, 9, 14, 20];

    // 平行打四支API
    const results = await Promise.all(
      periods.map(period =>
        fetch(
          `https://api.fugle.tw/marketdata/v1.0/stock/technical/rsi/${symbol}?from=${from}&to=${to}&timeframe=D&period=${period}`,
          { headers: { "X-API-KEY": env.FUGLE_KEY, "Accept": "application/json" } }
        ).then(r => r.json())
      )
    );

    // 以 date 為 key 合併資料
    const merged = {};
    periods.forEach((period, i) => {
      const rows = results[i]?.data || [];
      rows.forEach(row => {
        if (!merged[row.date]) merged[row.date] = { date: row.date };
        merged[row.date][`rsi_${period}`] = parseFloat(row.rsi.toFixed(2));
      });
    });

    // 轉回陣列並依日期遞減排序
    const data = Object.values(merged).sort((b, a) => a.date.localeCompare(b.date));

    return json({ success: true, data });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

async function fetchFugleKdj(symbol, env) {
  try {
    const to   = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await fetch(
      `https://api.fugle.tw/marketdata/v1.0/stock/technical/kdj/${symbol}?from=${from}&to=${to}&timeframe=D&rPeriod=9&kPeriod=3&dPeriod=3`,
      {
        headers: {
          "X-API-KEY": env.FUGLE_KEY,
          "Accept": "application/json"
        }
      }
    );

    if (!res.ok) {
      return json({ success: false, error: `HTTP ${res.status}` });
    }

    const d = await res.json();
    const data = d.data
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(row => ({
        date: row.date,
        k: parseFloat(row.k.toFixed(2)),
        d: parseFloat(row.d.toFixed(2)),
        j: parseFloat(row.j.toFixed(2)),
      }));

    return json({
      success: true,
      data,
    });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

async function fetchFugleMacd(symbol, env) {
  try {
    const to   = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await fetch(
      `https://api.fugle.tw/marketdata/v1.0/stock/technical/macd/${symbol}?from=${from}&to=${to}&timeframe=D&fast=12&slow=26&signal=9`,
      {
        headers: {
          "X-API-KEY": env.FUGLE_KEY,
          "Accept": "application/json"
        }
      }
    );

    if (!res.ok) {
      return json({ success: false, error: `HTTP ${res.status}` });
    }

    const d = await res.json();
    const data = d.data
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(row => ({
        date: row.date,
        macdLine: parseFloat(row.macdLine.toFixed(2)),
        signalLine: parseFloat(row.signalLine.toFixed(2)),
      }));

    return json({
      success: true,
      data,
    });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

async function fetchFugleBrands(symbol, env) {
  try {
    const to   = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await fetch(
      `https://api.fugle.tw/marketdata/v1.0/stock/technical/bb/${symbol}?from=${from}&to=${to}&timeframe=D&period=20`,
      {
        headers: {
          "X-API-KEY": env.FUGLE_KEY,
          "Accept": "application/json"
        }
      }
    );

    if (!res.ok) {
      return json({ success: false, error: `HTTP ${res.status}` });
    }

    const d = await res.json();
    const data = d.data
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(row => ({
        date: row.date,
        upper: parseFloat(row.upper.toFixed(2)),
        middle: parseFloat(row.middle.toFixed(2)),
        lower: parseFloat(row.lower.toFixed(2)),
      }));

    return json({
      success: true,
      data,
    });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

async function fetchYahooFinance(symbol, interval = 1, range = 1) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}d&range=${range}d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "application/json",
      }
    });
 
    if (!res.ok) {
      return json({ success: false, error: `HTTP ${res.status}` }, res.status);
    }
 
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) {
      return json({ success: false, error: "無資料" });
    }
 
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const closes = quote.close  || [];
    const opens  = quote.open   || [];
    const highs  = quote.high   || [];
    const lows   = quote.low    || [];
 
    // 取最後一筆（最新）
    const lastIdx = timestamps.length - 1;
    if (lastIdx < 0) {
      return json({ success: false, error: "timestamp 為空" });
    }
 
    const regularMarketTime = result.meta?.regularMarketTime;
    const updateTime = new Date(regularMarketTime * 1000).toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).replace(/\//g, '-');
 
    return json({
      success:    true,
      prev:       toFloat(result.meta?.chartPreviousClose),
      open:       toFloat(opens[lastIdx]),
      high:       toFloat(highs[lastIdx]),
      low:        toFloat(lows[lastIdx]),
      close:      toFloat(closes[lastIdx]),
      regularMarketTime,
      updateTime
    });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

// 語言偵測（簡單判斷是否含中文字元，有中文就不翻）
function isNeedTranslate(str) {
  return !/[\u4e00-\u9fff]/.test(str);
}

// 呼叫 MyMemory 翻譯單一字串
async function translateToZh(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-TW&de=bau720123@gmail.com`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  const data = await res.json();
  return data?.responseData?.translatedText || text; // 失敗就回傳原文
}

// 新聞 RSS（美伊戰爭消息）
async function fetchNewsRss(env) {
  // 關鍵字：至少命中其中一個才納入
  // const KEYWORDS = ['伊朗', '油價', '荷姆茲', '荷莫茲', '原油', '戰爭', '中東', '美國', '川普', '軍事', '衝突', '制裁', '核子', '核武', '導彈', '攻擊', '防空', '航運', '油輪'];
  const KEYWORDS = [
    // 中文（原有）
    '伊朗', '油價', '荷姆茲', '荷莫茲', '原油', '戰爭', '中東', '川普', '軍事', '衝突', '制裁', '核子', '核武', '導彈', '攻擊', '防空', '航運', '油輪', '台積電', 'ADR' 
    // 英文（新增）
    // 'Trump', 'Iran', 'Hormuz', 'crude', 'sanction', 'missile', 'ceasefire', 'tariff',
  ];
 
  // RSS 來源清單
  const SOURCES = [
    { url: 'https://tw.news.yahoo.com/rss/finance',                  name: 'Yahoo奇摩財經' },
    { url: 'https://feeds.feedburner.com/rsscna/intworld',           name: '中央社國際' },
    { url: 'https://feeds.feedburner.com/rsscna/finance',            name: '中央社產經' },
    { url: 'https://feeds.feedburner.com/rsscna/politics',           name: '中央社政治' },
    { url: 'https://news.ltn.com.tw/rss/world.xml',                  name: '自由時報國際' },
    { url: 'https://news.ltn.com.tw/rss/business.xml',               name: '自由時報財經' },
    // { url: 'https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com+Trump&hl=en-US&gl=US&ceid=US:en', name: 'Reuters-Trump' },
    // { url: 'https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com+Iran+oil&hl=en-US&gl=US&ceid=US:en', name: 'Reuters-Iran' },
  ];
 
  // 解析單一 RSS XML，回傳 items 陣列
  function parseRss(xml, sourceName) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRegex.exec(xml)) !== null) {
      const block = m[1];
 
      // title：支援 CDATA 與純文字
      const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)
                      || block.match(/<title>([\s\S]*?)<\/title>/);
      // link：
      //   中央社：<link>https://...</link>（有內容，優先）
      //   Yahoo ：<link/>（自閉合空標籤），URL 改放在 <guid>
      const linkMatch  = block.match(/<link>(https?:\/\/[^\s<]+)<\/link>/)
                      || block.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/)
                      || block.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/);
      const pubMatch   = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const srcMatch   = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);

      // description：支援 CDATA 與純文字，去除 HTML tag 後截斷
      const descMatch  = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)
                      || block.match(/<description>([\s\S]*?)<\/description>/);
      const descRaw    = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').trim() : '';

      // 若原始資料已含 … 摘要符號，代表來源已自行截斷，直接清理使用；否則自行截斷至 120 字
      const hasEllipsis = descRaw.includes('…');
      const descClean   = descRaw.replace(/…/g, '').trimEnd();
      const isGoogleNews = sourceName.startsWith('Reuters');
      const desc = isGoogleNews ? '' : (hasEllipsis ? descClean : (descRaw.length > 120 ? descRaw.slice(0, 120) + '…' : descRaw));
 
      const title = titleMatch ? titleMatch[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim() : '';
      if (!title) continue;
 
      items.push({
        title,
        link:    linkMatch  ? linkMatch[1].trim()  : '',
        pubDate: pubMatch   ? pubMatch[1].trim()   : '',
        source:  srcMatch   ? srcMatch[1].trim()   : sourceName,
        desc,
      });
    }
    return items;
  }
 
  try {
    // 平行抓取所有 RSS 來源
    const results = await Promise.allSettled(
      SOURCES.map(s =>
        fetch(s.url, { headers: { "User-Agent": UA } })
          .then(r => r.text())
          .then(xml => parseRss(xml, s.name))
          .catch(() => [])
      )
    );
 
    // 合併所有來源
    let allItems = [];
    results.forEach(r => {
      if (r.status === 'fulfilled') allItems = allItems.concat(r.value);
    });
 
    // 關鍵字過濾
    const filtered = allItems.filter(item =>
      KEYWORDS.some(kw => item.title.includes(kw))
    );
 
    // 依 pubDate 降冪排序（最新在前）
    filtered.sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    });
 
    // 去重（相同標題只保留第一筆）
    const seen = new Set();
    const unique = filtered.filter(item => {
      if (seen.has(item.title)) return false;
      seen.add(item.title);
      return true;
    });

    let ai_suggest = null;
//     const top10Titles = unique.slice(0, 10).map((item, i) => `${i + 1}. ${item.title}`).join('\n'); // 抓取前十則標題的資料
//     try {
//       const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'X-goog-api-key': env.GEMINI_KEY,
//         },
//         body: JSON.stringify({
//           system_instruction: { parts: { text: '你是一位專業的金融市場分析師，專注於地緣政治對能源與股票市場的影響。' } },
//           contents: [{ parts: [{ text: `以下是最新新聞標題，請站在「台灣散戶投資人」的角度，分析這些新聞對美股與台股的整體影響。

// ${top10Titles}

// 判斷標準：
// - 看多：對股市有正面影響，適合進場或持股
// - 看空：對股市有負面影響，建議減碼或觀望
// - 中性：影響不明確，建議持觀望態度

// 請用以下 JSON 格式回答，不要有任何其他文字或 markdown：
// {"signal":"看多/看空/中性","reason":"50字以內原因，以股市角度說明","risk":"高/中/低"}` }] }],
//         }),
//       });
//       const geminiData = await geminiRes.json();
//       const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
//       ai_suggest = JSON.parse(text.replace(/```json|```/g, '').trim());
//     } catch (e) {
//       ai_suggest = { error: e.message };
//     }

    // 去重後，統一翻譯英文標題
    const translated = await Promise.all(
      unique.map(async (item) => {
        // if (isNeedTranslate(item.title)) {
        //   item.title = await translateToZh(item.title);
        // }
        return item;
      })
    );
 
    return new Response(JSON.stringify({ success: true, items: translated.slice(0, 30), ai_suggest }), {
      headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

// 美股行事曆
async function fetchAmericaCalendar(env) {
  try {
    const now = new Date();
    const twTime = new Date(now.getTime() + 8 * 3600 * 1000);
    const currentYear = twTime.getFullYear();
    
    // 固定抓取當月 1 號開始到年底
    const from = `${currentYear}-${String(twTime.getMonth() + 1).padStart(2, '0')}-01`;
    const to = `${currentYear}-12-31`;
    
    // 1. 抓取 MoneyDJ 資料
    const res = await fetch(`https://www.moneydj.com/us/rest/eventlist?from=${from}&to=${to}`, {
      headers: { "User-Agent": UA, "Referer": "https://www.moneydj.com/us/home" }
    });
    const data = await res.json();

    const keywords = ['美國核心CPI年增率', '美國生產者物價指數', 'EI020089', '美國零售額月增率', '申請失業救濟人數', '美國非農業就業人數變化', '美國消費者信心指數'];

    // 2. 處理原本的 MoneyDJ 資料
    let processed = data.reduce((acc, item) => {
      const indicatorList = item.details.split(',').map(d => {
        const parts = d.split(':');
        return {
          code: parts.length > 1 ? parts[0].trim() : '',
          name: parts.length > 1 ? parts[1].trim() : parts[0].trim()
        };
      });

      let shouldInclude = false;
      let filteredIndicators = [];

      if (item.type === 'market') {
        shouldInclude = true;
        filteredIndicators = indicatorList;
      } else if (item.type === 'index') {
        filteredIndicators = indicatorList.filter(ind => 
          keywords.some(kw => ind.name.includes(kw) || ind.code.includes(kw))
        );
        if (filteredIndicators.length > 0) shouldInclude = true;
      }

      if (shouldInclude) {
        acc.push({ ...item, indicators: filteredIndicators });
      }
      return acc;
    }, []);

    // 3. 注入「特定自訂事件」邏輯
    const customEvents = generateCustomEvents(currentYear);

    // 4. 取得 Finnhub 財報資料（只查近 14 天，避免超出免費方案限制）
    const finnhubFrom = twTime.toISOString().split('T')[0]; // 今天
    const finnhubTo = new Date(twTime.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // +14天
    const earningsEvents = await generateCustomEventsFinnhub(finnhubFrom, finnhubTo, env);

    // 5. 合併所有來源並排序 (依日期 ID)：MoneyDJ + 週期性事件 + 手動事件 + Finnhub
    const finalData = [...processed, ...customEvents, ...earningsEvents]
      .sort((a, b) => a.id.localeCompare(b.id));

    return json({ success: true, items: finalData });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

/**
 * 自動計算特定金融事件日期
 */
function generateCustomEvents(year) {
  const events = [];

  for (let month = 0; month < 12; month++) { // 0 = 1月, 11 = 12月
    const monthStr = String(month + 1).padStart(2, '0');

    // A. 台指期／選擇權結算日 (每月第三個星期三)
    const twSettleDate = getNthDay(year, month, 3, 3);
    events.push(createEventObj(twSettleDate, "結算", "台指期/選擇權結算日", "#f39c12"));

    // B. 美股四巫日 (3, 6, 9, 12 月的第三個星期五)
    if ([2, 5, 8, 11].includes(month)) {
      const witchingDate = getNthDay(year, month, 5, 3);
      events.push(createEventObj(witchingDate, "四巫", "美股四巫日 (Triple Witching)", "#8e44ad"));
    }

    // C. 富時羅素指數重組生效日
    // 6 月最後一個星期五
    if (month === 5) {
      const ftseJune = getNthDay(year, month, 5, -1);
      events.push(createEventObj(ftseJune, "富時", "富時羅素指數重組生效日", "#e66767"));
    }
    // 11 月第二個星期五
    if (month === 10) {
      const ftseNov = getNthDay(year, month, 5, 2);
      events.push(createEventObj(ftseNov, "富時", "富時羅素指數重組生效日", "#e66767"));
    }

    // D. MSCI 指數調整生效日 (2, 5, 8, 11 月最後一個交易日/平日) 
    if ([1, 4, 7, 10].includes(month)) {
      const msciDate = getLastWeekday(year, month);
      events.push(createEventObj(msciDate, "MSCI", "MSCI 指數調整生效日", "#16a085"));
    }
  }

  // 自定義事件
  // events.push(createEventObj(
  //   new Date("2026-04-10"), 
  //   "TSM",
  //   "台積電下午1點半公布3月份業績", 
  //   "#3498db", 
  //   "001"
  // ));
  events.push(createEventObj(
    new Date("2026-04-16"), 
    "TSM",
    "台積電下午2點法說會", 
    "#3498db", 
    "001"
  ));

  return events;
}

/**
 * 輔助：建立符合結構的事件物件
 */
function createEventObj(dateObj, shortText, fullName, color, id_series = '999') {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${y}${m}${d}`;
  const dateFmt = `${y}/${m}/${d}`;

  return {
    "id": dateStr + id_series, // 加上 999 確保在當天排序靠後
    "start_date": `${dateFmt} 1:00`,
    "end_date": `${dateFmt} 2:00`,
    "textColor": color,
    "text": shortText,
    "type": "index",
    "details": `:${fullName}`,
    "indicators": [{ "code": "", "name": fullName }]
  };
}

/**
 * 輔助：取得該月第 N 個星期幾 (n 為負數代表倒數)
 * dayOfWeek: 0=日, 1=一, ..., 3=三, ..., 5=五, 6=六
 */
function getNthDay(year, month, dayOfWeek, n) {
  if (n > 0) {
    let date = new Date(year, month, 1);
    let count = 0;
    while (date.getMonth() === month) {
      if (date.getDay() === dayOfWeek) {
        count++;
        if (count === n) return new Date(date);
      }
      date.setDate(date.getDate() + 1);
    }
  } else {
    // 找倒數
    let date = new Date(year, month + 1, 0); // 該月最後一天
    while (date.getMonth() === month) {
      if (date.getDay() === dayOfWeek) return new Date(date);
      date.setDate(date.getDate() - 1);
    }
  }
  return null;
}

/**
 * 輔助：取得該月最後一個平日 (Mon-Fri)
 */
function getLastWeekday(year, month) {
  let date = new Date(year, month + 1, 0);
  while (date.getDay() === 0 || date.getDay() === 6) { // 0=日, 6=六
    date.setDate(date.getDate() - 1);
  }
  return new Date(date);
}

async function Finnhub_test(from, to, finnhubKey) {
  const cleanKey = finnhubKey.trim();
  const cleanKey_compare = env.FINNHUB_KEY;
}

async function generateCustomEventsFinnhub(from, to, env) {
  const cleanKey = env.FINNHUB_KEY;
  // const cleanKey = "d7bjvbpr01qgc9t7m9o0d7bjvbpr01qgc9t7m9og";
  if (!cleanKey) return []; // 如果沒有 Key，回傳空陣列

  const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${cleanKey}`;
  
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });

    // 如果 API 報錯 (如 401)，記錄錯誤並回傳空陣列，避免主程式壞掉
    if (!res.ok) {
      const errorDetail = await res.text();
      console.error(`Finnhub API Error (${res.status}): ${errorDetail}`);
      return []; 
    }

    const data = await res.json();
    const earnings = data.earningsCalendar || [];

     // 這裡是你原本預計要過濾的股票清單
    const AI_TECH_SYMBOLS = new Set([
      'NVDA', // NVIDIA - AI 晶片龍頭
      'TSM',  // 台積電 - 半導體代工龍頭
      'AAPL', // Apple - AI 手機與生態整合
      'META', // Meta - 生成式 AI 廣告與模型
      'MSFT', // Microsoft - Azure AI 與 OpenAI 合作
      'GOOGL',// Alphabet - Google AI 搜尋與雲端
      'AMZN', // Amazon - AWS AI 雲端服務
      'TSLA', // Tesla - 自動駕駛與機器人 AI
      'AMD',  // AMD - AI 替代方案與 CPU 大廠
      'PLTR', // Palantir - AI 數據分析平台
      'CRM',  // Salesforce - 企業級 AI CRM
      'NOW',  // ServiceNow - 企業流程 AI
      'SNOW', // Snowflake - 資料倉儲 AI
      'ORCL', // Oracle - 雲端資料庫與 OCI
      'AVGO', // Broadcom - AI 網通與客製化晶片 (ASIC)
      'QCOM', // Qualcomm - 行動端邊緣 AI
      'ASML', // ASML - EUV 光刻機 (AI 產能關鍵)
      'MU',   // Micron - HBM 高頻寬記憶體 (AI 必備)
      'INTC', // Intel - 晶片與晶圓代工競爭者
      'NFLX', // Netflix - 串流領頭羊，AI 推薦演算法
      'SMCI', // Supermicro - AI 伺服器基礎設施
      'ARM'   // Arm - AI 晶片架構設計核心
    ]);

    // 直接回傳處理後的 events 陣列
    return earnings
      .filter(item => AI_TECH_SYMBOLS.has(item.symbol))
      .map((item, index) => {
        return createEventObj(
          new Date(item.date),
          item.symbol,
          `${item.symbol} 財報發布（預估 EPS：${item.epsEstimate || 'N/A'}）`,
          "#3498db",
          `60${index}`
        );
      });

  } catch (e) {
    console.error("Finnhub 執行失敗：", e.message);
    return []; // 發生例外時也回傳空陣列
  }
}

// CNN Fear & Greed Index
async function fetchFearAndGreed() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch("https://production.dataviz.cnn.io/index/fearandgreed/graphdata", {
      headers: {
        "User-Agent": UA,
        "Accept": "application/json",
        "Referer": "https://edition.cnn.com/markets/fear-and-greed",
      },
      signal: controller.signal,
    });

    clearTimeout(timer);
    if (!res.ok) return json({ success: false, error: `HTTP ${res.status}` });

    const data = await res.json();
    const fg = data?.fear_and_greed;
    if (!fg) return json({ success: false, error: "無資料" });

    const ratingMap = {
      "extreme fear": "極度恐慌",
      "fear":         "恐慌",
      "neutral":      "中性",
      "greed":        "貪婪",
      "extreme greed":"極度貪婪",
    };

    return json({
      success:        true,
      score:          fg.score,
      rating:         fg.rating,
      ratingZh:       ratingMap[fg.rating] ?? fg.rating,
      updateTime:     new Date(fg.timestamp).toLocaleString("zh-TW", {
                        timeZone: "Asia/Taipei", hour12: false,
                        year: "numeric", month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit", second: "2-digit"
                      }).replace(/\//g, '-'),
      prevClose:      fg.previous_close,
      prev1Week:      fg.previous_1_week,
      prev1Month:     fg.previous_1_month,
      prev1Year:      fg.previous_1_year,
    });

  } catch (e) {
    clearTimeout(timer);
    return json({ success: false, error: e.message });
  }
}

async function handleCron(env) {
  // 判斷台灣時間是否在週一至週五 05:00～00:00
  const now = new Date();
  const twTime = new Date(now.getTime() + 8 * 3600 * 1000);
  const twHour = twTime.getUTCHours();
  const twDay = twTime.getUTCDay();
  const currentYear = twTime.getFullYear();

  // 週一(1)至週五(5)，05:00～23:59
  if (twDay === 0 || twDay === 6) return; // 週六、週日不執行
  if (twHour < 5) return;                 // 00:00～04:59 不執行

  const existing = await env.KV.get("subscriptions");
  if (!existing) return;

  const list = JSON.parse(existing);

  // 平行抓取所有資料
  const [taifexDay, taifexNight, taifexTsmc, twnRes, /*twnConRes, */brentRes, vixRes, tsmcStock] = await Promise.all([
    fetchTaifex(2, "TX046"), // 台股期貨日盤
    fetchTaifex(12, "TX056"), // 台股期貨夜盤
    fetchTaifex(12, "CDF056"), // 台積電期貨夜盤
    fetchHiStock("stocktop2017", "TWN", "指數", "成交量(口)"),
    // fetchCnyesTwn(), // 富台指
    fetchSina("hf_OIL"),
    fetchSina("znb_VIX"),
    fetchFugleQuote("2330", env),
  ]);

  const taifex_day = await taifexDay.json();
  const taifex_night = await taifexNight.json();
  const taifex_tsmc = await taifexTsmc.json();
  const twn    = await twnRes.json();
  // const twncon    = await twnConRes.json();
  const brent  = await brentRes.json();
  const vix    = await vixRes.json();
  const tsmc   = await tsmcStock.json();

  // 組合摘要文案
  const lines = [];

  // 偵測今日是否有特殊事件
  const todayKey = twTime.toISOString().split('T')[0].replace(/-/g, '');
  const allEvents = generateCustomEvents(currentYear);
  const todaysEvents = allEvents.filter(e => e.id.startsWith(todayKey));

  // if (todaysEvents.length > 0) {
  //   todaysEvents.forEach(ev => {
  //     lines.push(`今日特殊事件：${ev.indicators[0].name}`);
  //   }); 
  // }
  if (todaysEvents.length > 0) {
    // 提取所有事件名稱
    // 使用 "、" 串接
    const eventNames = todaysEvents.map(ev => ev.indicators[0].name).join('、');
    
    lines.push(`🚨 今日特殊事件：${eventNames}`);
  }

  // 台股日盤時間是從早上9點到下午1點半，不過我們的 cron 是每小時整點，所以實際上是從早上9點到下午2點會有日盤資料
  if (twHour > 9 && twHour <= 14) {
    if (taifex_day.success && taifex_day.price > 0) {
      const sign = taifex_day.updown > 0 ? '▲' : taifex_day.updown < 0 ? '▼' : '';
      lines.push(`台股期貨日盤：${taifex_day.price.toFixed(0)} (${sign}${Math.abs(taifex_day.updown).toFixed(0)})`);
    }

    if (tsmc.success) {
      const sign = tsmc.change > 0 ? '▲' : '▼';
      lines.push(`台積電現貨日盤：${tsmc.closePrice.toFixed(0)} (${sign}${Math.abs(tsmc.change).toFixed(0)})`);
    }
  }

  // 台股夜盤是從下午3點開始，直到隔天凌晨（不過我們的 cron 是每小時整點，所以實際上是從下午3點到晚上11點會有夜盤資料）
  if (twHour >= 15 || twHour <= 8) {
    if (taifex_night.success && taifex_night.price > 0) {
      const sign = taifex_night.updown > 0 ? '▲' : taifex_night.updown < 0 ? '▼' : '';
      lines.push(`台股期貨夜盤：${taifex_night.price.toFixed(0)} (${sign}${Math.abs(taifex_night.updown).toFixed(0)})`);
    }
  }

  if (twHour >= 17 || twHour <= 8) {
    // 台積電期貨夜盤是從下午5點開始，直到隔天凌晨（不過我們的 cron 是每小時整點，所以實際上是從下午5點到晚上11點會有夜盤資料）
    if (taifex_tsmc.success && taifex_tsmc.price > 0) {
      const sign = taifex_tsmc.updown > 0 ? '▲' : taifex_tsmc.updown < 0 ? '▼' : '';
      lines.push(`台積電期貨夜盤：${taifex_tsmc.price.toFixed(0)} (${sign}${Math.abs(taifex_tsmc.updown).toFixed(0)})`);
    }
  }

  if (twn.success) {
    lines.push(`富台指漲跌：${twn.changeText}`);
  }

  // if (twncon.success) {
  //   lines.push(`富台指漲跌：${twncon.updown}`);
  // }

  if (brent.success) {
    lines.push(`布蘭特原油：${brent.price.toFixed(2)} 元（` + getBrentStatus(brent.price) + `）`);
  }

  if (vix.success) {
    lines.push(`VIX 恐慌指數：${vix.price.toFixed(2)}（` + getVixStatus(vix.price) + `）`);
  }

  const body = lines.length > 0 ? lines.join('\n') : '點擊查看即時報價';

  await Promise.all(
    list.map(sub => sendWebPush(sub, {
      title: '每小時市場摘要',
      body,
      url: '/stock/index.html',
      // image: '/stock/banner.png',
      actions: (isAndroidPlatform(sub.platform) || isApplePlatform(sub.platform)) ? [] : [
        { action: 'view',    title: '查看詳情', icon: '/stock/icon-192.png' },
        { action: 'dismiss', title: '忽略',     icon: '/stock/icon-192.png' },
      ]
    }, env))
  );
}

function getBrentStatus(p) {
  if (p < 100) return '平靜';
  if (p < 110) return '留意';
  if (p < 120) return '波動加劇';
  return '恐慌';
}

function getVixStatus(v) {
  if (v < 20) return '平靜';
  if (v < 25) return '留意';
  if (v < 30) return '波動加劇';
  return '恐慌';
}

// 是否是Android裝置（用於決定是否顯示行動按鈕，因為 Android 的 Web Push 行動按鈕支援不佳）
function isAndroidPlatform(platform) {
  return platform && /Android/i.test(platform);
}

// 是否是iOS或Mac裝置
function isApplePlatform(platform) {
  return platform && /iPhone|iPad|iPod|Mac/i.test(platform);
}

// 工具函數
function toFloat(s) {
  if (s == null) return 0;
  const n = parseFloat(String(s).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

function toInt(s) {
  if (s == null) return 0;
  const n = parseInt(String(s).replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}