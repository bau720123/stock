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
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const path = new URL(request.url).pathname;

    if (path === "/fitx")    return await fetchHiStock("stocktop2017", "FITX", "指數", "成交量(口)");
    if (path === "/twn")     return await fetchHiStock("stocktop2017", "TWN", "指數", "成交量(口)");
    // if (path === "/brent")    return await fetchHiStock("stocktop2017_Global", "BRENTOIL", "股價", "成交量");
    // if (path === "/brent_stockq")   return await fetchBrent();
    if (path === "/sina_brent") return await fetchSina("hf_OIL");
    if (path === "/sina_gold") return await fetchSina("hf_GC");
    if (path === "/sina_silver") return await fetchSina("hf_SI");
    if (path === "/sina_usdollar") return await fetchSina("DINIW");
    if (path === "/sina_vix") return await fetchSina("hf_VX");
    if (path === "/taifex")  return await fetchTaifex();
    if (path === "/cnbc")    return await fetchCnbc();
    if (path === "/rh")      return await fetchRobinHood();
    if (path === "/subscribe") return await handleSubscribe(request, env);
    if (path === "/push-test") return await handlePushTest(env);

    return json({ error: "unknown path" }, 404);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleCron(env));
  }
};

// ── HiStock（台指期 / 富台指）──────────────────────────────
async function fetchHiStock(m, no, current_title, volume_title) {
  try {
    const res = await fetch("https://histock.tw/stock/module/function.aspx", {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Origin": "https://histock.tw",
        "Referer": "https://histock.tw/",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ m, no })
    });
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

// ── StockQ（布蘭特原油）────────────────────────────────────
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

// ── 新浪網────────────────────────────────────
async function fetchSina(list) {
  // https://gu.sina.cn/ft/hq/hf.php?symbol=OIL
  try {
    const res = await fetch(`https://hq.sinajs.cn/list=${list}`, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://finance.sina.com.cn/"
      }
    });
    const text = await res.text();

    const match = text.match(/"([^"]+)"/);
    if (!match) return json({ success: false, error: "解析失敗" });

    const parts = match[1].split(",");

    if (list === "DINIW") {
      return json({
        success: true,
        time:   parts[0] || "",
        price:  toFloat(parts[1]),
        open:   toFloat(parts[3]),
        low:    toFloat(parts[5]),
        high:   toFloat(parts[6]),
        prev:   toFloat(parts[7]),
      });
    } else {
      return json({
        success: true,
        price:  toFloat(parts[0]),
        change: toFloat(parts[2]),
        open:   toFloat(parts[3]),
        high:   toFloat(parts[4]),
        low:    toFloat(parts[5]),
        time:   parts[6] || "",
        prev:   toFloat(parts[7]),
      });
    }

  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

// ── TaiFex（台積電期貨）────────────────────────────────────
async function fetchTaifex() {
  try {
    const res = await fetch("https://www.taifex.com.tw/cht/quotesApi/getQuotes?objId=12", {
      headers: { "User-Agent": UA, "Accept": "application/json" }
    });
    const data = await res.json();

    const item = data.find(d => d.contractName === "台積電期貨");

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
    // 盤前 Fair Value
    const fvRes = await fetch(
      "https://quote.cnbc.com/quote-html-webservice/fvquote.htm?requestMethod=quick&noform=0&realtime=1&client=fairValue&output=json&symbols=DJ%7CSP%7CND%7CTF",
      { headers: { "User-Agent": UA } }
    );
    const fvData = await fvRes.json();
    const fvQuotes = fvData?.FairValueQuoteResult?.FairValueQuote || [];

    const fv = { DJ: 0, SP: 0, ND: 0, TF: 0, updateTime: "未知" };
    for (const q of fvQuotes) {
      if (q.symbol in fv) fv[q.symbol] = q.fv_change || 0;
      if (fv.updateTime === "未知" && q.last_timedate) fv.updateTime = q.last_timedate;
    }

    // 四大指數 + TSM ADR
    const qRes = await fetch(
      "https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=.DJI%7C.SP500%7C.IXIC%7C.SOX%7CTSM&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1",
      { headers: { "User-Agent": UA } }
    );
    const qData = await qRes.json();
    const quotes = qData?.FormattedQuoteResult?.FormattedQuote || [];

    const market = { dji: "N/A", sp500: "N/A", ixic: "N/A", sox: "N/A", tsmRegular: "N/A", tsmType: "", tsmMarket: "N/A" };
    for (const q of quotes) {
      if (q.symbol === ".DJI")   market.dji    = q.change || "N/A";
      if (q.symbol === ".SP500") market.sp500  = q.change || "N/A";
      if (q.symbol === ".IXIC")  market.ixic   = q.change || "N/A";
      if (q.symbol === ".SOX")   market.sox    = q.change || "N/A";
      if (q.symbol === "TSM") {
        market.tsmRegular = q.change || "N/A";
        market.tsmType    = q.ExtendedMktQuote?.type || "";
        market.tsmMarket  = q.ExtendedMktQuote?.change || "N/A";
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
    });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

// ── RobinHood（TSM ADR 即時）───────────────────────────────
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

    const success = changeText !== "" || tertiaryText !== "";
    return json({ success, changeText, tertiaryText });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

async function handleSubscribe(request, env) {
  try {
    const subscription = await request.json();

    // 讀取現有的 subscriptions
    const existing = await env.KV.get("subscriptions");
    const list = existing ? JSON.parse(existing) : [];

    // 避免重複儲存同一個 endpoint
    const isDuplicate = list.some(s => s.endpoint === subscription.endpoint);
    if (!isDuplicate) {
      list.push(subscription);
      await env.KV.put("subscriptions", JSON.stringify(list));
      console.log(`[KV] 新增 subscription，目前共 ${list.length} 筆`);
    }

    return json({ success: true });
  } catch (e) {
    return json({ success: false, error: e.message }, 500);
  }
}

// ── Web Push 發送 ──────────────────────────────────────────
async function handlePushTest(env) {
  try {
    const existing = await env.KV.get("subscriptions");
    if (!existing) return json({ success: false, error: "沒有訂閱資料" });

    const list = JSON.parse(existing);
    const results = await Promise.all(
      list.map(sub => sendWebPush(sub, {
        title: '測試推播',
        body: '這是來自 Cloudflare Worker 的真實推播！',
        url: '/stock/index.html'
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
    const body = await encryptPayload(
      JSON.stringify(payload), p256dh, auth
    );

    // 3. 發送
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt},k=${publicKey}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
      },
      body,
    });

    return { endpoint, status: res.status };
  } catch (e) {
    return { endpoint: subscription.endpoint, error: e.message };
  }
}

// ── VAPID JWT 建立 ─────────────────────────────────────────
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

// ── aes128gcm 加密 ─────────────────────────────────────────
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

// ── HKDF ──────────────────────────────────────────────────
async function hkdf(ikm, salt, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key, length * 8
  );
  return new Uint8Array(bits);
}

// ── 工具函數（Base64）─────────────────────────────────────
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

async function handleCron(env) {
  // 目前先簡單發一個每日摘要推播
  const existing = await env.KV.get("subscriptions");
  if (!existing) return;

  const list = JSON.parse(existing);
  await Promise.all(
    list.map(sub => sendWebPush(sub, {
      title: '每日市場摘要',
      body: '點擊查看今日即時報價',
      url: '/stock/index.html'
    }, env))
  );
}

// ── 工具函數 ───────────────────────────────────────────────
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