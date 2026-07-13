const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const ROBINHOOD_INSTRUMENTS = {
  TSM: "ca4821f9-06c3-4c22-bbb8-efe569f23d2b", // 台積電
  NVDA: "a4ecd608-e7b4-4ff3-afa5-f77ae7632dfb", // 輝達
  AAPL: "450dfc6d-5510-4d40-abfb-f633b7d9be3e", // 蘋果
  MSFT: "50810c35-d215-4866-9758-0ada4ac79ffa", // 微軟
  GOOGL: "54db869e-f7d5-45fb-88f1-8d7072d4c8b2", // Alphabet (Google)
  AMZN: "c0bb3aec-bd1e-471e-a4f0-ca011cbec711", // 亞馬遜
  META: "ebab2398-028d-4939-9f1d-13bf38f81c50", // Meta (Facebook)
  TSLA: "e39ed23a-7bd1-4587-b060-71988d9ef483", // 特斯拉
  AVGO: "698f04e6-1710-4f34-b7af-4a88fe5e47b3", // 博通
  SMCI: "50846aee-ce5f-4bd4-bfbb-cef4414f69bd", // 美超微
  ASML: "d083c5f8-e6ca-489d-a96f-93084ca374ac", // 艾斯摩爾
  SPCX: "ef5d2600-32d1-41f5-bfbe-abacac264d2a", // SpaceX
  AMD: "940fc3f5-1db5-4fed-b452-f3a2e4562b5f", // 超微
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json"
    }
  });
}

/**
 * 統一處理帶有超時機制的 fetch (使用 AbortController)
 */
async function fetchWithTimeout(url, options = {}, timeout = 3000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export default {
  async fetch(request, env) {
    // 呼叫網址：https://billowing-queen-4a58.bau720123.workers.dev/path

    if (request.method === "OPTIONS") return new Response(null, {
      headers: CORS
    });

    const path = new URL(request.url).pathname;

    if (path === "/fitx") return await fetchHiStock("stocktop2017", "FITX", "指數", "成交量(口)"); // 台指近
    if (path === "/twn") return await fetchHiStock("stocktop2017", "TWN", "指數", "成交量(口)"); // 富台指

    // https://invest.cnyes.com/futures/GF/TWNCON
    if (path === "/twncon") return await fetchCnyesTwn(); // 富台指

    // if (path === "/brent")  return await fetchHiStock("stocktop2017_Global", "BRENTOIL", "股價", "成交量");
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
      const contractName = decodeURIComponent(parts[3]);
      if (objId && contractName) return await fetchTaifex(objId, contractName);
    }

    if (path === "/cnbc") return await fetchCnbc();
    if (path === "/rh") return await fetchRobinHood();

    if (path === "/foreign-net-position") return await fetchForeignNetPosition();
    if (path === "/institutional") return await fetchInstitutional();
    if (path === "/margin-trading-balance") return await fetchMarginTradingBalance();

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

      if (method === "tickers") return await fetchFugleTickers(env);
      if (method === "quote" && symbol) return await fetchFugleQuote(symbol, env);
      if (method === "volume" && symbol) return await fetchFugleVolume(symbol, env);
      if (method === "history" && symbol) return await fetchFugleHistory(symbol, env);
      if (method === "institutional" && symbol) return await fetchHiStockInstitutional(symbol);
      if (method === "margintradingbalance" && symbol) return await fetchHiStockMarginTradingBalance(symbol);
      if (method === "sma" && symbol) return await fetchFugleSma(symbol, env);
      if (method === "rsi" && symbol) return await fetchFugleRsi(symbol, env);
      if (method === "kdj" && symbol) return await fetchFugleKdj(symbol, env);
      if (method === "macd" && symbol) return await fetchFugleMacd(symbol, env);
      if (method === "brands" && symbol) return await fetchFugleBrands(symbol, env);
    }

    if (path.startsWith("/yahoo-finance/")) {
      const symbol = decodeURIComponent(path.split("/yahoo-finance/")[1]);
      if (symbol) return await fetchYahooFinance(symbol, 1, 1);
    }

    if (path === "/fedwatch") return await fetchFedWatch(env);

    if (path === "/news-rss") return await fetchNewsRss(env);

    if (path === "/america-calendar") return await fetchAmericaCalendar(env);

    if (path.startsWith("/generateCustomEventsFinnhub")) {
      try {
        const parts = path.split("/").filter(Boolean);
        const today = new Date().toISOString().split('T')[0];
        const from = parts[1] || today;
        const to = parts[2] || today;

        const result = await generateCustomEventsFinnhub(from, to, env);
        return new Response(JSON.stringify({
          success: true,
          from,
          to,
          count: result.length,
          data: result
        }), {
          headers: {
            "Content-Type": "application/json"
          }
        });
      } catch (e) {
        return new Response(JSON.stringify({
          success: false,
          error: e.message,
          stack: e.stack
        }), {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
    }

    if (path === "/fear-greed") return await fetchFearAndGreed();

    return json({
      error: "unknown path"
    }, 404);
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleCron(env));
  }
};

async function debugSina() {
  const res = await fetchWithTimeout("https://hq.sinajs.cn/list=hf_YM,hf_ES,hf_NQ,gb_dji,gb_inx,gb_ixic,gb_sox,gb_tsm,hf_OIL,hf_OIL2606,hf_OIL2607,hf_GC,hf_SI,hf_CAD,DINIW,znb_VIX,hf_VX,hf_VX2605,hf_VX2606", {
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
    const res = await fetchWithTimeout("https://histock.tw/stock/module/function.aspx", {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Origin": "https://histock.tw",
        "Referer": "https://histock.tw/",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        m,
        no
      })
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
      open: toFloat(data["開盤"]),
      high: toFloat(data["最高"]),
      low: toFloat(data["最低"]),
      changeText: data["漲跌"] || "",
      current: toFloat(data[current_title]),
      volume: toInt(data[volume_title]),
      updateTime: timeMatch ? timeMatch[1].trim() : "未知",
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

// 鉅亨網（富台指）
async function fetchCnyesTwn() {
  try {
    const res = await fetchWithTimeout(
      "https://ws.api.cnyes.com/ws/api/v1/quote/quotes/GF:TWNCON:FUTURES?column=G,QUOTES", {
        headers: {
          "User-Agent": UA,
          "Referer": "https://invest.cnyes.com/",
          "Origin": "https://invest.cnyes.com",
        }
      }
    );

    const json_data = await res.json();
    const item = json_data?.data?. [0];
    if (!item) return json({
      success: false,
      error: "no data"
    });

    const ts = item["200007"];
    const updateTime = ts ?
      new Date((ts + 8 * 3600) * 1000).toISOString().replace('T', ' ').substring(0, 19) :
      "未知";

    return json({
      success: true,
      name: item["200009"] || "近月富台指",
      price: toFloat(item["6"]),
      updown: toFloat(item["11"]),
      high: toFloat(item["12"]),
      low: toFloat(item["13"]),
      open: toFloat(item["19"]),
      volume: toInt(item["800001"]),
      updateTime,
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

// StockQ（布蘭特原油）
async function fetchBrent() {
  try {
    const res = await fetchWithTimeout("https://www.stockq.org/commodity/FUTRBOIL.php", {
      headers: {
        "User-Agent": UA
      }
    });
    const html = await res.text();

    // 找 class='row2' 的位置，然後找後面第一個 <td...> 到 </td>
    const row2Idx = html.indexOf("class='row2'");
    if (row2Idx === -1) return json({
      success: false,
      error: "找不到 row2"
    });

    const afterRow2 = html.substring(row2Idx);
    const tdStart = afterRow2.indexOf("<td");
    const tdEnd = afterRow2.indexOf("</td>");
    if (tdStart === -1 || tdEnd === -1) return json({
      success: false,
      error: "找不到 td"
    });

    const tdContent = afterRow2.substring(tdStart, tdEnd);
    const priceText = tdContent.replace(/<[^>]+>/g, "").trim();
    const price = toFloat(priceText);

    return json({
      success: true,
      price,
      priceText
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

// 新浪網的布蘭特原油代碼是 hf_OIL，但它是近月合約，會隨著時間推移而變動，所以我們需要動態計算出正確的合約代碼
function getOilSymbol() {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1 + 2; // getMonth() 從0開始，+1轉為實際月份，+2為往後兩個月

  if (month > 12) {
    month -= 12;
    year += 1;
  }

  const yy = String(year).slice(-2); // 取年份後兩碼
  const mm = String(month).padStart(2, '0'); // 月份補零

  return `hf_OIL${yy}${mm}`;
}

function getVixSymbol() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  // 1. 找出本月第 3 個禮拜五
  function getThirdFriday(y, m) {
    let count = 0;
    let date = new Date(y, m, 1);
    while (count < 3) {
      if (date.getDay() === 5) count++; // 5 是禮拜五
      if (count < 3) date.setDate(date.getDate() + 1);
    }
    return date;
  }

  const thirdFriday = getThirdFriday(year, month);

  // 2. 結算日通常是第三個禮拜五的前兩天 (禮拜三)
  const settleDate = new Date(thirdFriday);
  settleDate.setDate(thirdFriday.getDate() - 2);

  // 3. 判斷今天要抓哪個月
  let targetYear = year;
  let targetMonth = month + 1; // 轉為 1-12

  if (now > settleDate) {
    targetMonth += 1;
  }

  // 4. 處理跨年問題
  if (targetMonth > 12) {
    targetMonth -= 12;
    targetYear += 1;
  }

  const yy = String(targetYear).slice(-2);
  const mm = String(targetMonth).padStart(2, '0');

  return `hf_VX${yy}${mm}`;
}

// 新浪網
async function fetchSina(list) {
  // https://gu.sina.cn/ft/hq/hf.php?symbol=OIL
  // https://gu.sina.cn/ft/hq/hf.php?symbol=OIL2606
  // https://gu.sina.cn/ft/hq/hf.php?symbol=OIL2607

  // 定義動態代碼的計算函數映射
  const symbolMap = {
    'hf_OIL': getOilSymbol,
    'hf_VX': getVixSymbol
  };

  // 如果 list 在映射表中，執行對應函數；否則直接使用原始 list
  const processedList = symbolMap[list] ? symbolMap[list]() : list;

  try {
    const res = await fetchWithTimeout(`https://hq.sinajs.cn/list=${processedList}`, {
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
    if (!match) return json({
      success: false,
      error: "解析失敗"
    });

    const parts = match[1].split(",");

    if (list === "DINIW") {
      // 美元指數
      return json({
        success: true,
        title: parts[9],
        time: parts[10] + " " + parts[0] || "",
        price: toFloat(parts[1]),
        open: toFloat(parts[3]),
        low: toFloat(parts[5]),
        high: toFloat(parts[6]),
        prev: toFloat(parts[7]),
      });
    } else if (list.startsWith('znb_')) {
      const price = toFloat(parts[1]);

      const result = {
        success: true,
        title: parts[0],
        time: parts[6] + " " + parts[7] || "",
        price: price,
        open: toFloat(parts[8]),
        low: toFloat(parts[11]),
        high: toFloat(parts[10]),
        prev: toFloat(parts[9]),
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
        title: parts[0],
        time: parts[3] || "",
        price: toFloat(parts[1]),
        open: toFloat(parts[5]),
        low: toFloat(parts[7]),
        high: toFloat(parts[6]),
        prev: toFloat(parts[26]),
      });
    } else if (list.startsWith('hf_')) {
      // hf_YM	道瓊期貨
      // hf_ES	標普 500 期貨
      // hf_NQ	納斯達克 100 期貨
      // hf_OIL 布蘭特原油
      // hf_GC 黃金
      // hf_SI 白銀
      // hf_VX VIX 恐慌指數期貨  

      const price = toFloat(parts[0]);

      const result = {
        success: true,
        title: parts[13],
        price: price,
        open: toFloat(parts[8]),
        high: toFloat(parts[4]),
        low: toFloat(parts[5]),
        time: parts[12] + " " + parts[6] || "",
        prev: toFloat(parts[7]),
      };

      if (list === 'hf_OIL') {
        result.rating = getBrentStatus(price);
      }
      if (list === 'hf_VX') {
        result.rating = getVixStatus(price);
      }

      return json(result);
    } else {
      return json({
        success: true,
        title: '',
        price: 0,
        open: 0,
        high: 0,
        low: 0,
        time: 0,
        prev: 0,
      });
    }
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

// 台灣期貨交易所
async function fetchTaifex(objId, contractName) {
  try {
    const res = await fetchWithTimeout("https://www.taifex.com.tw/cht/quotesApi/getQuotes?objId=" + objId, {
      headers: {
        "User-Agent": UA,
        "Accept": "application/json"
      }
    }, 8000);
    const data = await res.json();

    // const item = data.find(d => d.contract === contract);
    let item;
    item = data.find(d => d.contractName === contractName);

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
      contract: item.contract || "",
      contractName: item.contractName || "",
      price: toFloat(item.price),
      updown: toFloat(item.updown),
      ttlvol: toInt(item.ttlvol),
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

// CNBC（美股四大指數 + TSM ADR + 盤前電子盤）
async function fetchCnbc() {
  try {
    // 1. 盤前 Fair Value (邏輯保持不變)
    // https://www.cnbc.com/pre-markets/
    const fvRes = await fetchWithTimeout(
      "https://quote.cnbc.com/quote-html-webservice/fvquote.htm?requestMethod=quick&noform=0&realtime=0&client=fairValue&output=json&symbols=DJ|SP|ND|TF", {
        headers: {
          "User-Agent": UA
        }
      }
    );
    const fvData = await fvRes.json();
    const fvQuotes = fvData?.FairValueQuoteResult?.FairValueQuote || [];

    const fv = {
      DJ: 0,
      SP: 0,
      ND: 0,
      TF: 0,
      updateTime: "未知"
    };
    for (const q of fvQuotes) {
      if (q.symbol in fv) fv[q.symbol] = q.fmt_change || 0;
      if (fv.updateTime === "未知" && q.last_timedate) fv.updateTime = q.last_timedate;
    }

    // 2. 四大指數 + 個股 (未來可在 symbols 繼續累加，如 |NVDA|AAPL)
    const qRes = await fetchWithTimeout(
      "https://quote.cnbc.com/quote-html-webservice/restQuote/symbolType/symbol?symbols=.DJI|.SPX|.IXIC|.SOX|TSM|NVDA|AAPL|MSFT|GOOGL|AMZN|META|TSLA&requestMethod=itv&noform=1&partnerId=2&fund=1&exthrs=1&output=json&events=1", {
        headers: {
          "User-Agent": UA
        }
      }
    );
    const qData = await qRes.json();
    const quotes = qData?.FormattedQuoteResult?.FormattedQuote || [];

    // 初始化回應容器
    const market = {
      dji: "N/A",
      spx: "N/A",
      ixic: "N/A",
      sox: "N/A"
    };
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
          type: q.ExtendedMktQuote?.type || "",
          market: q.ExtendedMktQuote?.change || "N/A"
        };
      }
    }

    return json({
      success: true,
      fairValue: {
        dow: fv.DJ,
        sp: fv.SP,
        nasdaq: fv.ND,
        russell: fv.TF,
        updateTime: fv.updateTime,
      },
      market,
      stock, // 這裡現在會是 { TSM: { regular: "...", type: "...", market: "..." } }
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

// RobinHood
async function fetchRobinHoodOne(instrumentId) {
  const res = await fetchWithTimeout(
    `https://bonfire.robinhood.com/instruments/${instrumentId}/detail-page-live-updating-data/?display_span=day&hide_extended_hours=false`, {
      headers: {
        "User-Agent": UA,
        "Accept": "application/json"
      }
    }
  );
  const data = await res.json();

  const display = data?.chart_section?.default_display;
  const changeText = display?.secondary_value?.main?.value || "";
  const tertiaryText = display?.tertiary_value?.main?.value || "";

  const quote = data?.chart_section?.quote;
  const previousClose = parseFloat(quote?.previous_close || "").toString();
  const previousCloseDate = quote?.previous_close_date || "";
  const updated_at = quote?.updated_at ?
    new Date(quote.updated_at).toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).replace(/\//g, '-') :
    '-';

  const success = changeText !== "" || tertiaryText !== "" || previousClose !== "" || previousCloseDate !== "" || updated_at !== "";
  return {
    success,
    changeText,
    tertiaryText,
    previousClose,
    previousCloseDate,
    updated_at
  };
}

async function fetchRobinHood() {
  try {
    const entries = Object.entries(ROBINHOOD_INSTRUMENTS);

    const results = await Promise.all(
      entries.map(async ([symbol, instrumentId]) => {
        try {
          const data = await fetchRobinHoodOne(instrumentId);
          return [symbol, data];
        } catch (e) {
          const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
          return [symbol, {
            success: false,
            error: errorMsg
          }];
        }
      })
    );

    const payload = Object.fromEntries(results);
    return json(payload);
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

async function handleSubscribe(request, env) {
  try {
    const body = await request.json();
    const {
      userAgent,
      ...subscription
    } = body;

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
      list.push({
        ...subscription,
        platform,
        time
      });
      await env.KV.put("subscriptions", JSON.stringify(list));
    }

    return json({
      success: true
    });
  } catch (e) {
    return json({
      success: false,
      error: e.message
    }, 500);
  }
}

// Web Push 發送
async function handlePushTest(env) {
  try {
    const existing = await env.KV.get("subscriptions");
    if (!existing) return json({
      success: false,
      error: "沒有訂閱資料"
    });

    const list = JSON.parse(existing);
    const results = await Promise.all(
      list.map(sub => sendWebPush(sub, {
        title: '測試推播',
        body: '這是來自 Cloudflare Worker 的真實推播！',
        url: '/stock/index.html',
        // image: '/stock/banner.png',
        actions: (isAndroidPlatform(sub.platform) || isApplePlatform(sub.platform)) ? [] : [{
            action: 'view',
            title: '查看詳情',
            icon: '/stock/icon-192.png'
          },
          {
            action: 'dismiss',
            title: '忽略',
            icon: '/stock/icon-192.png'
          },
        ]
      }, env))
    );

    return json({
      success: true,
      results
    });
  } catch (e) {
    return json({
      success: false,
      error: e.message
    }, 500);
  }
}

async function sendWebPush(subscription, payload, env) {
  try {
    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys.p256dh;
    const auth = subscription.keys.auth;
    const publicKey = env.VAPID_PUBLIC_KEY;
    const privateKey = env.VAPID_PRIVATE_KEY;
    const subject = env.VAPID_SUBJECT;

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
    return {
      endpoint,
      status: res.status,
      responseBody: resText
    };
  } catch (e) {
    return {
      endpoint: subscription.endpoint,
      error: e.message
    };
  }
}

// VAPID JWT 建立
async function buildVapidJwt(endpoint, subject, publicKeyB64, privateKeyB64) {
  const now = Math.floor(Date.now() / 1000);
  const origin = new URL(endpoint).origin;

  const header = b64url(JSON.stringify({
    typ: 'JWT',
    alg: 'ES256'
  }));
  const payload = b64url(JSON.stringify({
    aud: origin,
    exp: now + 43200,
    sub: subject
  }));
  const input = `${header}.${payload}`;

  // raw 32 bytes → PKCS8 格式（加上 EC 私鑰的 ASN.1 header）
  const rawKey = base64UrlDecode(privateKeyB64);
  const pkcs8 = buildPkcs8(rawKey);

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', pkcs8, {
      name: 'ECDSA',
      namedCurve: 'P-256'
    },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign({
      name: 'ECDSA',
      hash: 'SHA-256'
    },
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
  const encoder = new TextEncoder();
  const clientPublic = base64UrlDecode(p256dhB64);
  const authSecret = base64UrlDecode(authB64);

  // 產生伺服器端 ECDH 金鑰對
  const serverKeyPair = await crypto.subtle.generateKey({
    name: 'ECDH',
    namedCurve: 'P-256'
  }, true, ['deriveBits']);

  const serverPublicRaw = await crypto.subtle.exportKey('raw', serverKeyPair.publicKey);

  // 匯入客戶端公鑰
  const clientKey = await crypto.subtle.importKey(
    'raw', clientPublic, {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    false, []
  );

  // ECDH 共享秘密
  const sharedBits = await crypto.subtle.deriveBits({
      name: 'ECDH',
      public: clientKey
    },
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
  const cek = await hkdf(ikm, salt, encoder.encode('Content-Encoding: aes128gcm\x00'), 16);
  const nonce = await hkdf(ikm, salt, encoder.encode('Content-Encoding: nonce\x00'), 12);

  // 匯入 AES-GCM 金鑰
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);

  // 加密（加上 padding delimiter \x02）
  const data = concat(encoder.encode(plaintext), new Uint8Array([2]));
  const encrypted = await crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv: nonce
  }, aesKey, data);

  // 組合 aes128gcm 格式：salt(16) + rs(4) + keyid_len(1) + keyid + ciphertext
  const serverPubArray = new Uint8Array(serverPublicRaw);
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);

  return concat(salt, rs, new Uint8Array([serverPubArray.length]), serverPubArray, new Uint8Array(encrypted));
}

// HKDF
async function hkdf(ikm, salt, info, length) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info
    },
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
  if (!existing) return json({
    count: 0,
    list: []
  });
  const list = JSON.parse(existing);
  const summary = list.map(s => ({
    endpoint: s.endpoint.substring(0, 60) + '...', // 不顯示完整金鑰
    platform: s.platform || 'unknown',
    time: s.time || 'unknown',
  }));
  return json({
    count: list.length,
    list: summary.reverse()
  }); // 最新的在前
}

async function clearSubs(env) {
  await env.KV.put("subscriptions", JSON.stringify([]));
  return json({
    success: true,
    message: "已清除所有 subscriptions"
  });
}

async function readLogs(env) {
  const existing = await env.KV.get("logs");
  const logs = existing ? JSON.parse(existing) : [];
  return json({
    count: logs.length,
    logs: logs.reverse()
  }); // 最新的在前
}

async function handleWriteLogs(request, env) {
  try {
    const body = await request.json();
    await writeLogs(env, body.tag || 'INFO', body.message || '');
    return json({
      success: true
    });
  } catch (e) {
    return json({
      success: false,
      error: e.message
    });
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

    logs.push({
      tag,
      message,
      time
    });

    // 只保留最新 100 筆，避免 KV 無限增長
    if (logs.length > 100) logs.splice(0, logs.length - 100);

    await env.KV.put("logs", JSON.stringify(logs));
  } catch (e) {
    // log 失敗不影響主流程
  }
}

async function clearLogs(env) {
  await env.KV.put("logs", JSON.stringify([]));
  return json({
    success: true,
    message: "已清除所有 logs"
  });
}

async function fetchFugleTickers(env) {
  try {
    const res = await fetchWithTimeout(
      `https://api.fugle.tw/marketdata/v1.0/stock/intraday/tickers`, {
        headers: {
          "X-API-KEY": env.FUGLE_KEY,
          "Accept": "application/json"
        }
      }
    );

    if (!res.ok) {
      return json({
        success: false,
        error: `HTTP ${res.status}`
      });
    }

    const d = await res.json();
    const data = d.data;

    return json({
      success: true,
      data,
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

async function fetchFugleQuote(symbol, env) {
  try {
    const res = await fetchWithTimeout(
      `https://api.fugle.tw/marketdata/v1.0/stock/intraday/quote/${symbol}`, {
        headers: {
          "X-API-KEY": env.FUGLE_KEY,
          "Accept": "application/json"
        }
      }
    );

    if (!res.ok) {
      return json({
        success: false,
        error: `HTTP ${res.status}`
      });
    }

    const d = await res.json();

    // 解析委買委賣
    const bids = (d.bids || []).map(b => ({
      price: b.price,
      size: b.size
    }));
    const asks = (d.asks || []).map(a => ({
      price: a.price,
      size: a.size
    }));

    return json({
      success: true,
      symbol: d.symbol || "",
      name: d.name || "",
      previousClose: d.previousClose || 0,
      openPrice: d.openPrice || 0,
      highPrice: d.highPrice || 0,
      lowPrice: d.lowPrice || 0,
      closePrice: d.closePrice || 0,
      avgPrice: d.avgPrice || 0,
      change: d.change || 0,
      changePercent: d.changePercent || 0,
      bids,
      asks,
      tradeVolume: d.total?.tradeVolume || 0,
      tradeVolumeAtBid: d.total?.tradeVolumeAtBid || 0,
      tradeVolumeAtAsk: d.total?.tradeVolumeAtAsk || 0,
      transaction: d.total?.transaction || 0,
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

function analyzeVolumeData(data) {
  if (!data || data.length <= 2) {
    return {
      story: "數據量不足，無法進行區間故事分析。"
    };
  }

  // 1. 排序並剔除最高與最低價 (極值去噪)
  const sortedByPrice = [...data].sort((a, b) => b.price - a.price);
  const highestPrice = sortedByPrice[0].price;
  const lowestPrice = sortedByPrice[sortedByPrice.length - 1].price;

  const filteredData = sortedByPrice.filter(b => b.price !== highestPrice && b.price !== lowestPrice);

  if (filteredData.length === 0) return {
    story: "剔除極值後無核心交易數據。"
  };

  // 2. 計算核心區間的總量與基本統計
  let totalVolume = 0;
  let totalBid = 0;
  let totalAsk = 0;

  filteredData.forEach(b => {
    totalVolume += b.volume;
    totalBid += b.volumeAtBid;
    totalAsk += b.volumeAtAsk;
  });

  // 計算未分類成交量 (通常代表開盤集合競價)
  const unaccountedVolume = totalVolume - totalBid - totalAsk;

  // 3. 找出核心戰場：依據成交量排序，取前三名 (價量三劍客)
  const sortedByVolume = [...filteredData].sort((a, b) => b.volume - a.volume);
  const top3 = sortedByVolume.slice(0, 3);
  const top3VolumeSum = top3.reduce((sum, b) => sum + b.volume, 0);
  const top3Percentage = ((top3VolumeSum / totalVolume) * 100).toFixed(1);

  // 4. 分析第一大交易量價位 (核心戰場點)
  const mainBattle = top3[0];
  const mainBattleBidPct = mainBattle.volume > 0 ? (mainBattle.volumeAtBid / mainBattle.volume * 100) : 0;
  const mainBattleAskPct = mainBattle.volume > 0 ? (mainBattle.volumeAtAsk / mainBattle.volume * 100) : 0;

  // 5. 判斷是否有開盤爆量區 (未分類量顯著的價位)
  const openingNode = filteredData.find(b => (b.volume - b.volumeAtBid - b.volumeAtAsk) > (b.volume * 0.3));

  // 6. 動態組裝「故事」文字
  let stories = [];

  // 故事一：核心戰場集中度
  stories.push(`目前核心交火集中在 ${top3.map(b => b.price).join('、')} 元，這三檔合共吃下區間 ${top3Percentage}% 的籌碼，屬於標準的震盪換手格局。`);

  // 故事二：最大量節點的心理戰
  if (mainBattleBidPct > 65) {
    stories.push(`關鍵價位 ${mainBattle.price} 元爆出全天最大量（佔核心區間 ${((mainBattle.volume/totalVolume)*100).toFixed(1)}%），其中內盤主動砸盤佔比高達 ${mainBattleBidPct.toFixed(1)}%。若收盤能守住此價位，暗示有長線大戶在此築起護城河被動接單，反之若跌破，則此處將轉為沈重壓力。`);
  } else if (mainBattleAskPct > 65) {
    stories.push(`關鍵價位 ${mainBattle.price} 元，買氣極盛，外盤追高佔比達 ${mainBattleAskPct.toFixed(1)}%，市場多頭主力試圖在此發動軋空狂攻。`);
  } else {
    stories.push(`最大量節點位於 ${mainBattle.price} 元，內外盤力道各半（內:${mainBattleBidPct.toFixed(0)}%/外:${mainBattleAskPct.toFixed(0)}%），多空在此達成短暫動態平衡。`);
  }

  // 故事三：開盤節點追蹤
  if (openingNode) {
    stories.push(`偵測到 ${openingNode.price} 元有高達 ${openingNode.volume - openingNode.volumeAtBid - openingNode.volumeAtAsk} 張的未分類成交量，高機率為開盤集合競價之法人對敲起漲點，為目前多頭的初始防線。`);
  }

  // 7. 回傳結構化的結果
  return {
    summary: {
      coreRange: `${filteredData[filteredData.length - 1].price} - ${filteredData[0].price}`,
      totalVolume,
      top3Concentration: `${top3Percentage}%`,
      unclassifiedVolume: unaccountedVolume
    },
    story: stories.join("<br><br>")
  };
}

async function fetchFugleVolume(symbol, env) {
  try {
    const res = await fetchWithTimeout(
      `https://api.fugle.tw/marketdata/v1.0/stock/intraday/volumes/${symbol}`, {
        headers: {
          "X-API-KEY": env.FUGLE_KEY,
          "Accept": "application/json"
        }
      }
    );

    if (!res.ok) {
      return json({
        success: false,
        error: `HTTP ${res.status}`
      });
    }

    const d = await res.json();

    // 解析分價量表
    const data = (d.data || []).map(b => ({
      price: b.price,
      volume: b.volume,
      volumeAtBid: b.volumeAtBid,
      volumeAtAsk: b.volumeAtAsk
    }));

    // === 新增：自動化量價故事分析 ===
    const result = analyzeVolumeData(data)

    return json({
      success: true,
      data,
      result,
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

/**
 * 尋找轉折高低點 (Swing Pivots)
 * 若某日高點在前後 leftBars/rightBars 天內皆為區間最高，視為「轉折高點」
 * 若某日低點在前後 leftBars/rightBars 天內皆為區間最低，視為「轉折低點」
 * 注意：轉折點須有「未來」rightBars 天的資料才能確認，
 * 因此資料尾端最近 rightBars 天不會產生新的轉折點（這是正常現象，非 bug）
 */
function findSwingPivots(ascData, leftBars = 2, rightBars = 2) {
  const pivotHighs = [];
  const pivotLows = [];

  for (let i = leftBars; i < ascData.length - rightBars; i++) {
    const cur = ascData[i];
    let isHigh = true;
    let isLow = true;

    for (let j = i - leftBars; j <= i + rightBars; j++) {
      if (j === i) continue;
      if (ascData[j].high >= cur.high) isHigh = false;
      if (ascData[j].low <= cur.low) isLow = false;
      if (!isHigh && !isLow) break;
    }

    if (isHigh) pivotHighs.push({ index: i, date: cur.date, price: cur.high });
    if (isLow) pivotLows.push({ index: i, date: cur.date, price: cur.low });
  }

  return { pivotHighs, pivotLows };
}

/**
 * 三日不破前低 / 前高 判斷
 * 定義：取「最近3個交易日」以外區間的最低/最高價作為「前低 / 前高」參考基準，
 * 再檢查最近3日的最低/最高價是否曾經跌破 / 漲破該基準。
 * 若使用者想改成「以轉折點作為前低/前高」，可改用 findSwingPivots 的結果替換 refLow/refHigh。
 */
/**
 * X日不破前低 / 前高 判斷
 * 定義：近X個交易日，逐日和「前一天」比較（今天vs昨天、昨天vs前天...），
 * 只要有任何一天的低點跌破前一天低點，就算「跌破」；高點同理。
 * 不使用窗口內極值，單純日對日比較，找出第一次出現跌破/突破的那一天。
 * @param {number} recentDays 「近X日」的X（預設3）
 */
function analyzeThreeDayBreakout(ascData, recentDays = 3) {
  const totalDays = ascData.length;
  if (totalDays < recentDays + 1) {
    return { available: false };
  }

  // 取「近X日 + 前一天」共 recentDays+1 天，逐日和前一天比較
  const window = ascData.slice(-(recentDays + 1));

  let noBreakLow = true;
  let noBreakHigh = true;
  let breakLowDay = null;
  let breakHighDay = null;

  for (let i = 1; i < window.length; i++) {
    const cur = window[i];
    const prev = window[i - 1];

    if (cur.low < prev.low) {
      noBreakLow = false;
      if (!breakLowDay) {
        breakLowDay = { date: cur.date, low: cur.low, prevDate: prev.date, prevLow: prev.low };
      }
    }
    if (cur.high > prev.high) {
      noBreakHigh = false;
      if (!breakHighDay) {
        breakHighDay = { date: cur.date, high: cur.high, prevDate: prev.date, prevHigh: prev.high };
      }
    }
  }

  return {
    available: true,
    recentDays,
    noBreakLow, noBreakHigh,
    breakLowDay, breakHighDay
  };
}

/**
 * 趨勢結構判斷：頭頭高、底底高 (多頭) ／ 頭頭低、底底低 (空頭)
 * 利用轉折高低點序列，比較最近兩個轉折高點、最近兩個轉折低點的相對高低
 * @param {number} pivotLeftBars  轉折點左側比較天數
 * @param {number} pivotRightBars 轉折點右側確認天數（越大越可靠，但越晚才能確認出最新轉折點，這是方法論天生的延遲）
 */
function analyzeTrendStructure(ascData, pivotLeftBars = 2, pivotRightBars = 2) {
  const { pivotHighs, pivotLows } = findSwingPivots(ascData, pivotLeftBars, pivotRightBars);

  if (pivotHighs.length < 2 || pivotLows.length < 2) {
    return { available: false, pivotHighs, pivotLows };
  }

  const lastTwoHighs = pivotHighs.slice(-2);
  const lastTwoLows = pivotLows.slice(-2);

  const higherHigh = lastTwoHighs[1].price > lastTwoHighs[0].price;
  const higherLow = lastTwoLows[1].price > lastTwoLows[0].price;
  const lowerHigh = lastTwoHighs[1].price < lastTwoHighs[0].price;
  const lowerLow = lastTwoLows[1].price < lastTwoLows[0].price;

  let trendType = "整理"; // 盤整：高低點結構未同步同向
  if (higherHigh && higherLow) trendType = "多頭";
  else if (lowerHigh && lowerLow) trendType = "空頭";

  return {
    available: true,
    trendType,
    pivotHighs: lastTwoHighs,
    pivotLows: lastTwoLows
  };
}

/**
 * 量價關係判斷
 * @param {number} volRecentDays 量能比較的「近X日」均量天數（預設3）
 * @param {number} volPriorDays  量能比較的「前X日」均量天數（預設3）
 * 價格方向固定採「今日 vs 昨日」單日比較，確保跟資料的 change 欄位、K線顏色一致
 */
function analyzeVolumePriceRelation(ascData, volRecentDays = 3, volPriorDays = 3) {
  const totalDays = ascData.length;
  if (totalDays < 2) {
    return { available: false };
  }

  const today = ascData[totalDays - 1];
  const yest = ascData[totalDays - 2];
  const priceUp = today.close > yest.close;

  if (totalDays < volRecentDays + volPriorDays) {
    // 資料不足以取多日均量，量能同樣退回今日 vs 昨日比較
    return buildVolPriceResult(today.volume > yest.volume, priceUp, false);
  }

  const recentVolSlice = ascData.slice(-volRecentDays);
  const priorVolSlice = ascData.slice(-(volRecentDays + volPriorDays), -volRecentDays);
  const recentVolAvg = recentVolSlice.reduce((sum, d) => sum + d.volume, 0) / volRecentDays;
  const priorVolAvg = priorVolSlice.reduce((sum, d) => sum + d.volume, 0) / volPriorDays;
  const volUp = recentVolAvg > priorVolAvg;

  return buildVolPriceResult(volUp, priceUp, true, recentVolAvg, priorVolAvg, volRecentDays, volPriorDays);
}

function buildVolPriceResult(volUp, priceUp, isAvg, recentVolAvg, priorVolAvg, volRecentDays, volPriorDays) {
  let type, label;
  if (volUp && priceUp) {
    type = "vol_up_price_up";
    label = "量增價漲（多頭健康）";
  } else if (volUp && !priceUp) {
    type = "vol_up_price_down";
    label = "量增價跌（恐慌或出貨）";
  } else if (!volUp && priceUp) {
    type = "vol_down_price_up";
    label = "量縮價漲（籌碼鎖定或散戶行情）";
  } else {
    type = "vol_down_price_down";
    label = "量縮價跌（正常回檔）";
  }

  return { available: true, type, label, volUp, priceUp, isAvg, recentVolAvg, priorVolAvg, volRecentDays, volPriorDays };
}

/**
 * @param {Array} data 富果 API 回傳的歷史K線 (desc，最新在前)
 * @param {Object} [config] 可選，覆寫各項分析的天數設定，不傳則使用預設值
 * @param {number} [config.breakoutRecentDays=3]   X日不破前高低：「近X日」的X（逐日跟前一天比較）
 * @param {number} [config.pivotLeftBars=2]        趨勢結構：轉折點左側比較天數
 * @param {number} [config.pivotRightBars=2]       趨勢結構：轉折點右側確認天數（越大越慢但越可靠）
 * @param {number} [config.volRecentDays=3]        量價關係：近X日均量的X
 * @param {number} [config.volPriorDays=3]         量價關係：前X日均量的X
 */
function analyzeHistoryData(data, config = {}) {
  const cfg = {
    breakoutRecentDays: 3,
    pivotLeftBars: 2,
    pivotRightBars: 2,
    volRecentDays: 3,
    volPriorDays: 3,
    ...config
  };

  if (!data || data.length === 0) {
    return {
      story: "暫無歷史數據可供分析。"
    };
  }

  // 由於富果資料是 desc (最新在前)，我們複製一份並反轉成 asc (舊到新)，方便計算均線與趨勢
  const ascData = [...data].reverse();
  const totalDays = ascData.length;

  // 1. 基礎數據：區間最高、最低價與日期
  let maxPrice = -Infinity,
    minPrice = Infinity;
  let maxDate = "",
    minDate = "";
  let maxVol = -1,
    maxVolDate = "",
    maxVolClose = 0;

  ascData.forEach(d => {
    if (d.high > maxPrice) {
      maxPrice = d.high;
      maxDate = d.date;
    }
    if (d.low < minPrice) {
      minPrice = d.low;
      minDate = d.date;
    }
    if (d.volume > maxVol) {
      maxVol = d.volume;
      maxVolDate = d.date;
      maxVolClose = d.close;
    }
  });

  // 2. 進階指標：計算最新一天的 5日均線(MA5) 與 20日均線(MA20)
  const latestClose = data[0].close;

  let ma5 = null, ma20 = null;
  if (totalDays >= 5) {
    const last5 = ascData.slice(-5);
    ma5 = last5.reduce((sum, d) => sum + d.close, 0) / 5;
  }
  if (totalDays >= 20) {
    const last20 = ascData.slice(-20);
    ma20 = last20.reduce((sum, d) => sum + d.close, 0) / 20;
  }

  // 3. 趨勢慣性：計算近 3 天的走勢 (連漲、連跌或震盪)
  let trendText = "橫盤震盪";
  if (totalDays >= 3) {
    const c1 = ascData[totalDays - 1].close; // 今天
    const c2 = ascData[totalDays - 2].close; // 昨天
    const c3 = ascData[totalDays - 3].close; // 前天
    if (c1 < c2 && c2 < c3) trendText = "短線連跌修正";
    if (c1 > c2 && c2 > c3) trendText = "短線連漲衝刺";
  }

  // 4. 動態動人故事組裝
  let stories = [];

  // 故事一：天花板與地板 (你的初衷)
  stories.push(`近一個月股價於 ${minPrice} 元（${minDate}）築底成功，並於 ${maxPrice} 元（${maxDate}）觸頂回落。目前最新收盤價 ${latestClose} 元，正處於此區間的${latestClose > (maxPrice + minPrice)/2 ? '中高位階（偏強）' : '中低位階（偏弱）'}。`);

  // 故事二：均線多空角力
  if (ma5 && ma20) {
    const ma5Text = `5日線（${ma5.toFixed(1)}）`;
    const ma20Text = `20日線（${ma20.toFixed(1)}）`;
    if (latestClose > ma5 && ma5 > ma20) {
      stories.push(`指標呈現多頭排列，股價站穩 ${ma5Text} 與 ${ma20Text} 之上，技術面由多方掌控主導權。`);
    } else if (latestClose < ma5 && ma5 < ma20) {
      stories.push(`技術面呈現弱勢修正，股價目前壓在 ${ma5Text} 之下，且月線 ${ma20Text} 已轉為上檔實質壓力。`);
    } else {
      stories.push(`目前股價夾在 ${ma5Text} 與 ${ma20Text} 之間，短線多空交錯，正處於方向抉擇的十字路口。`);
    }
  }

  // 故事三：爆量轉折點的心理學
  const maxVolWan = (maxVol / 10000).toFixed(0);
  stories.push(`區間最大失控量發生在 ${maxVolDate}（爆量 ${maxVolWan} 張），當日收盤價為 ${maxVolClose} 元。在技術分析中，此價位匯聚了極高密度的籌碼，若未來回檔不破此爆量Ｋ棒，將會是極強的波段支撐。`);

  // 故事四：X日不破前高／前低（逐日跟前一天比較，支撐壓力測試）
  const breakoutInfo = analyzeThreeDayBreakout(ascData, cfg.breakoutRecentDays);
  if (breakoutInfo.available) {
    if (breakoutInfo.noBreakLow) {
      stories.push(`近${breakoutInfo.recentDays}個交易日，股價每日低點皆未跌破前一日低點，逐日比較未創新低，短線支撐穩固。`);
    } else {
      stories.push(`近${breakoutInfo.recentDays}個交易日內，${breakoutInfo.breakLowDay.date}（低點 ${breakoutInfo.breakLowDay.low} 元）曾跌破前一日 ${breakoutInfo.breakLowDay.prevDate}（低點 ${breakoutInfo.breakLowDay.prevLow} 元），短線支撐一度鬆動。`);
    }
    if (breakoutInfo.noBreakHigh) {
      stories.push(`近${breakoutInfo.recentDays}個交易日，股價每日高點皆未突破前一日高點，逐日比較未創新高，追價動能仍待觀察。`);
    } else {
      stories.push(`近${breakoutInfo.recentDays}個交易日內，${breakoutInfo.breakHighDay.date}（高點 ${breakoutInfo.breakHighDay.high} 元）曾突破前一日 ${breakoutInfo.breakHighDay.prevDate}（高點 ${breakoutInfo.breakHighDay.prevHigh} 元），顯示曾有較積極的買盤出現。`);
    }
  }

  // 故事五：頭頭高/底底高（多頭）或頭頭低/底底低（空頭）的趨勢結構
  // 註：轉折點需未來 pivotRightBars 天資料才能確認，因此顯示的日期會落後最新交易日，這是方法論的正常現象
  // const trendInfo = analyzeTrendStructure(ascData, cfg.pivotLeftBars, cfg.pivotRightBars);
  // if (trendInfo.available) {
  //   if (trendInfo.trendType === "多頭") {
  //     stories.push(`從轉折點結構觀察（最新轉折點須經 ${cfg.pivotRightBars} 個交易日確認，故日期會略滯後於今日），股價呈現「頭頭高、底底高」的多頭排列：最新高點 ${trendInfo.pivotHighs[1].price} 元（${trendInfo.pivotHighs[1].date}）高於前次高點 ${trendInfo.pivotHighs[0].price} 元，低點亦同步墊高至 ${trendInfo.pivotLows[1].price} 元（${trendInfo.pivotLows[1].date}），趨勢結構偏多。`);
  //   } else if (trendInfo.trendType === "空頭") {
  //     stories.push(`從轉折點結構觀察（最新轉折點須經 ${cfg.pivotRightBars} 個交易日確認，故日期會略滯後於今日），股價呈現「頭頭低、底底低」的空頭排列：最新低點 ${trendInfo.pivotLows[1].price} 元（${trendInfo.pivotLows[1].date}）低於前次低點 ${trendInfo.pivotLows[0].price}（${trendInfo.pivotLows[0].date}） 元，高點亦同步走低至 ${trendInfo.pivotHighs[1].price} 元（${trendInfo.pivotHighs[1].date}），趨勢結構偏空。`);
  //   } else {
  //     stories.push(`從轉折點結構觀察，近期高低點交錯，尚未形成一致方向的多頭或空頭排列，市場暫處於盤整格局。`);
  //   }
  // }

  // 故事六：量價關係（量增價漲／量增價跌／量縮價漲／量縮價跌）
  const volPriceInfo = analyzeVolumePriceRelation(ascData, cfg.volRecentDays, cfg.volPriorDays);
  if (volPriceInfo.available) {
    const volBasis = volPriceInfo.isAvg ? `近${volPriceInfo.volRecentDays}日均量相較前${volPriceInfo.volPriorDays}日均量` : "今日成交量相較昨日";
    stories.push(`${volBasis}${volPriceInfo.volUp ? "放大" : "縮減"}，今日收盤價較昨日${volPriceInfo.priceUp ? "上漲" : "下跌"}，屬於「${volPriceInfo.label}」格局。`);
  }

  return {
    summary: {
      rangeHigh: maxPrice,
      rangeHighDate: maxDate,
      rangeLow: minPrice,
      rangeLowDate: minDate,
      ma5: ma5 ? Number(ma5.toFixed(1)) : null,
      ma20: ma20 ? Number(ma20.toFixed(1)) : null,
      maxVolumeDate: maxVolDate,
      shortTrend: trendText,
      threeDayBreakout: breakoutInfo.available ? {
        recentDays: breakoutInfo.recentDays,
        noBreakLow: breakoutInfo.noBreakLow,
        noBreakHigh: breakoutInfo.noBreakHigh,
        breakLowDay: breakoutInfo.breakLowDay,
        breakHighDay: breakoutInfo.breakHighDay
      } : null,
      // trendStructure: trendInfo.available ? trendInfo.trendType : "資料不足",
      volumePriceRelation: volPriceInfo.available ? {
        type: volPriceInfo.type,
        label: volPriceInfo.label
      } : null
    },
    story: stories.join("<br><br>")
  };
}

async function fetchFugleHistory(symbol, env) {
  try {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await fetchWithTimeout(
      `https://api.fugle.tw/marketdata/v1.0/stock/historical/candles/${symbol}?from=${from}&to=${to}&timeframe=D&fields=open,high,low,close,volume,turnover,change&sort=desc`, {
        headers: {
          "X-API-KEY": env.FUGLE_KEY,
          "Accept": "application/json"
        }
      }
    );

    if (!res.ok) {
      return json({
        success: false,
        error: `HTTP ${res.status}`
      });
    }

    const d = await res.json();
    const data = d.data || [];

    // 歷史 K 線動態故事分析
    const result = analyzeHistoryData(data);

    return json({
      success: true,
      data,
      result
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

async function fetchForeignNetPosition_old() {
  try {
    const url = `https://stock.wearn.com/taifexphoto.asp`;
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": UA,
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
      const foreign = parseNumber(cells[5][1]); // 外資

      // 民國年轉西元
      const [y, m, d] = rawDate.split("/");
      const date = `${parseInt(y) + 1911}-${m}-${d}`;

      return {
        date,
        foreign
      };
    }).filter(row => row && !(row.foreign === 0));

    return json({
      success: true,
      data
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

async function fetchForeignNetPosition() {
  try {
    const url = `https://histock.tw/stock/three.aspx`;
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://histock.tw/",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();

    // 找第一個 class 只為 "gvTB" 的 table（精確比對，排除 class 含其他值的）
    const tableMatch = html.match(/<table[^>]*class="gvTB"[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) throw new Error("Table not found");

    const tableHtml = tableMatch[1];

    // 抓所有 <tr>，跳過第一列（標題列 <th>）
    const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].slice(1);

    const data = rows.map(row => {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      if (cells.length < 5) return null;

      const rawDate = stripTags(cells[0][1]).trim(); // "2025/04/15"
      const foreign = parseNumber(cells[1][1]); // 外資
      const trust = parseNumber(cells[2][1]); // 投信
      const dealer = parseNumber(cells[3][1]); // 自營
      const total = parseNumber(cells[4][1]); // 總計

      return {
        date: rawDate,
        foreign,
        trust,
        dealer,
        total
      };
    }).filter(row => row && !(row.foreign === 0 && row.trust === 0 && row.dealer === 0 && row.total === 0));

    return json({
      success: true,
      data
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

function formatValue(str) {
  if (!str) return 0; // 防止 stripTags 噴出 null 或 undefined

  const cleanStr = str
    .replace(/\s+/g, '') // 1. 移除所有空白 (包含 - 1,208 中的空格)
    .replace(/,/g, '') // 2. 移除千分位逗號 (把 1,208 變成 1208)
    .replace(/^\+/, ''); // 3. 移除開頭的正號

  const num = Number(cleanStr);

  // 檢查轉換是否成功，失敗則回傳 0，避免讓 total 變成 NaN
  return isNaN(num) ? 0 : num;
}

async function fetchInstitutional_old() {
  try {
    const url = `https://stock.wearn.com/fundthree.asp`;
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": UA,
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
      const trust = formatValue(stripTags(cells[1][1])); // 投信
      const dealer = formatValue(stripTags(cells[2][1])); // 自營商
      const foreign = formatValue(stripTags(cells[3][1])); // 外資

      // 現在這三個變數都是純數字了
      const totalNum = trust + dealer + foreign;

      // 民國年轉西元
      const [y, m, d] = rawDate.split("/");
      const date = `${parseInt(y) + 1911}-${m}-${d}`;

      return {
        date,
        trust,
        dealer,
        foreign,
        total: totalNum.toFixed(2)
      };
    }).filter(Boolean);

    return json({
      success: true,
      data
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

async function fetchInstitutional() {
  try {
    const url = `https://histock.tw/stock/three.aspx`;
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://histock.tw/",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();

    // 精確比對 class="gvTB gvTB_TWSE"（完全符合，順序與內容一致）
    const tableMatch = html.match(/<table[^>]*class="gvTB gvTB_TWSE"[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) throw new Error("Table not found");

    const tableHtml = tableMatch[1];

    // 抓所有 <tr>，跳過第一列（標題列 <th>）
    const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].slice(1);

    const data = rows.map(row => {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      if (cells.length < 7) return null;

      // 日期格式為 "06/18"，補上當年西元年
      const rawDate = stripTags(cells[0][1]).trim(); // "06/18"
      const foreign = formatValue(stripTags(cells[1][1])); // 外資
      const trust = formatValue(stripTags(cells[2][1])); // 投信
      const dealer = formatValue(stripTags(cells[3][1])); // 自營(總)
      const dealerSelf = formatValue(stripTags(cells[4][1])); // 自營自買
      const dealerHedge = formatValue(stripTags(cells[5][1])); // 自營避險
      const total = formatValue(stripTags(cells[6][1])); // 總計

      // 自營商合計 = 自營(總) + 自營自買 + 自營避險
      // const dealerTotal = dealer + dealerSelf + dealerHedge;

      // 日期補上西元年（頁面只顯示 MM/DD，取當前台北時間的年份）
      const taipeiYear = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Taipei",
        year: "numeric"
      }).split(",")[0];
      const [m, d] = rawDate.split("/");
      const date = `${taipeiYear}-${m}-${d}`;

      return {
        date,
        foreign,
        trust,
        dealer: parseFloat(dealer.toFixed(2)),
        dealerSelf,
        dealerHedge,
        total,
      };
    }).filter(Boolean);

    return json({
      success: true,
      data
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

async function fetchMarginTradingBalance() {
  try {
    // 1. 改請求 JSON 版本的網址，並維持防禦性的 Headers
    const res = await fetchWithTimeout("https://www.twse.com.tw/rwd/zh/marginTrading/MI_MARGN?response=json", {
      headers: {
        "User-Agent": UA,
        "Referer": "https://www.twse.com.tw/",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const jsonRes = await res.json();

    // 2. 檢查 API 狀態與資料完整性
    if (jsonRes.stat !== "OK" || !jsonRes.tables || jsonRes.tables.length === 0) {
      throw new Error(`API response status not OK or tables empty: ${jsonRes.stat || 'Unknown'}`);
    }

    // 3. 解析日期 (從 "20260602" 轉為 "2026-06-02")
    const rawDate = jsonRes.date; // 確保有拿到日期
    if (!rawDate || rawDate.length !== 8) throw new Error("Invalid date format from API");
    const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;

    // 4. 定位到信用交易統計表格的 data
    const tableData = jsonRes.tables[0].data;
    if (!tableData || tableData.length < 3) throw new Error("Target row (Margin Balance) not found in JSON");

    // 第三列（index 2）是「融資金額(仟元)」，取最後一個元素（index 5）為今日餘額
    const marginRow = tableData[2];
    if (marginRow.length < 6) throw new Error("Target cell (Today Balance) not found in JSON");

    // 前日餘額
    const rawValue_1day_before = marginRow[4].trim();
    const valueKThousand_1day_before = parseInt(rawValue_1day_before.replace(/,/g, ""), 10);
    const valueHundredMillion_1day_before = parseFloat((valueKThousand_1day_before / 100000).toFixed(2)); // 仟元 → 億元

    // 今日餘額
    const rawValue = marginRow[5].trim();
    const valueKThousand = parseInt(rawValue.replace(/,/g, ""), 10);
    const valueHundredMillion = parseFloat((valueKThousand / 100000).toFixed(2)); // 仟元 → 億元

    return json({
      success: true,
      date,
      marginBalanceRaw_1day_before: valueKThousand_1day_before, // 原始值（仟元）
      marginBalance_1day_before: valueHundredMillion_1day_before, // 融資餘額（億元）
      marginBalanceRaw: valueKThousand, // 原始值（仟元）
      marginBalance: valueHundredMillion, // 融資餘額（億元）
      marginBalance_diff: (valueHundredMillion - valueHundredMillion_1day_before).toFixed(2), // 差異

    });

  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? '連線逾時' : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

function analyzeInstitutionalData(data) {
  if (!data || data.length === 0) {
    return {
      story: "暫無法人籌碼數據可供分析。"
    };
  }

  // 1. 計算外資與投信的「連續買賣超天數」
  // 因為 data 是 desc (最新在前)，data[0] 就是最新的一天
  const getConsecutiveDays = (key) => {
    const firstAction = data[0][key] >= 0 ? "buy" : "sell";
    let count = 0;

    for (let i = 0; i < data.length; i++) {
      const currentAction = data[i][key] >= 0 ? "buy" : "sell";
      if (currentAction === firstAction) {
        count++;
      } else {
        break;
      }
    }
    return {
      type: firstAction,
      days: count
    };
  };

  const foreignStreak = getConsecutiveDays("foreign");
  const trustStreak = getConsecutiveDays("trust");

  // 2. 計算近 5 日的累計買賣超 (張數)
  const last5Days = data.slice(0, 5);
  let sumForeign5 = 0;
  let sumTrust5 = 0;
  let sumDealer5 = 0;
  let sumTotal5 = 0;

  last5Days.forEach(d => {
    sumForeign5 += d.foreign;
    sumTrust5 += d.trust;
    sumDealer5 += d.dealer;
    sumTotal5 += d.total;
  });

  // 3. 動態組裝「故事」文字
  let stories = [];

  // 故事一：近期的連續慣性
  const formatStreak = (streak) => {
    return streak.type === "buy" ? `連買 ${streak.days} 天` : `連賣 ${streak.days} 天`;
  };

  stories.push(`【現況慣性】外資目前呈現 ${formatStreak(foreignStreak)}，投信則呈現 ${formatStreak(trustStreak)}。`);

  // 故事二：5日主力動向與市場對決
  const foreignWan = (sumForeign5 / 1000).toFixed(1);
  const trustWan = (sumTrust5 / 1000).toFixed(1);

  stories.push(`【近5日籌碼統計】外資累計${sumForeign5 >= 0 ? '買' : '賣'}超 ${Math.abs(foreignWan)} 千張，投信累計${sumTrust5 >= 0 ? '買' : '賣'}超 ${Math.abs(trustWan)} 千張。五日總計三大法人共${sumTotal5 >= 0 ? '匯入' : '提款'} ${Math.abs((sumTotal5/1000).toFixed(1))} 千張。`);

  // 故事三：多空心理角力模型 (判斷誰是主角)
  if (sumForeign5 < 0 && sumTrust5 > 0) {
    stories.push(`💡 籌碼呈現經典的「外資丟、投信撿」對決格局。外資短線調節壓力沉重，但內資投信進場積極護盤，若此時股價在技術面能守住關鍵支撐，代表內資防守強烈，後市不需過度悲觀。`);
  } else if (sumForeign5 > 0 && sumTrust5 > 0) {
    stories.push(`💡 籌碼呈現「土洋同買」的金牌多頭格局。內外資難得達成共識共同做多，這類股票短線動能強勁，通常容易發動波段攻勢。`);
  } else if (sumForeign5 < 0 && sumTrust5 < 0) {
    stories.push(`💡 籌碼呈現「土洋雙殺」的弱勢格局。內外資法人同步轉向站在賣方，籌碼面缺乏主流資金支撐，建議操作上需多加注意風險，靜待賣壓竭盡。`);
  } else if (sumForeign5 > 0 && sumTrust5 < 0) {
    stories.push(`💡 籌碼呈現「外資買、投信調節」的行情。通常代表波段由外資主導，只要外資買盤沒有中斷，短線仍由多方主控盤面。`);
  }

  return {
    summary: {
      foreignStreakDays: foreignStreak.days,
      foreignStreakType: foreignStreak.type,
      trustStreakDays: trustStreak.days,
      trustStreakType: trustStreak.type,
      accumulated5Day: {
        foreign: sumForeign5,
        trust: sumTrust5,
        dealer: sumDealer5,
        total: sumTotal5
      }
    },
    story: stories.join("<br><br>")
  };
}

async function fetchStockWearnInstitutional(symbol) {
  try {
    const url = `https://stock.wearn.com/netbuy.asp?kind=${symbol}`;
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": UA,
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
      const trust = parseNumber(cells[1][1]); // 投信
      const dealer = parseNumber(cells[2][1]); // 自營商
      const foreign = parseNumber(cells[3][1]); // 外資
      const total = trust + dealer + foreign; // 合計

      // 民國年轉西元
      const [y, m, d] = rawDate.split("/");
      const date = `${parseInt(y) + 1911}-${m}-${d}`;

      return {
        date,
        trust,
        dealer,
        foreign,
        total
      };
    }).filter(Boolean);

    // === 新增：三大法人籌碼故事分析 ===
    const result = analyzeInstitutionalData(data);

    return json({
      success: true,
      data,
      result
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

async function fetchHiStockInstitutional(symbol) {
  try {
    const url = `https://histock.tw/stock/chips.aspx?no=${symbol}`;
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://histock.tw/",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();

    // 精確比對 class="tb-stock tbChip w50p pr0"（完全符合，順序與內容一致）
    const tableMatch = html.match(/<table[^>]*class="tb-stock tbChip w50p pr0"[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) throw new Error("Table not found");

    const tableHtml = tableMatch[1];

    // 抓所有 <tr>，跳過第一列（標題列 <th>）
    const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].slice(1);

    const data = rows.map(row => {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      if (cells.length < 6) return null;

      const date = stripTags(cells[0][1]).trim(); // 日期
      const foreign = parseNumber(cells[1][1]); // 外資
      const trust = parseNumber(cells[2][1]); // 投信
      const dealerSelf = parseNumber(cells[3][1]); // 自營(自買)
      const dealerHedge = parseNumber(cells[4][1]); // 自營(避險)
      const total = parseNumber(cells[5][1]); // 總計

      // 自營商 = 自營(自買) + 自營(避險)
      const dealer = dealerSelf + dealerHedge;

      return {
        date,
        foreign,
        trust,
        dealer,
        dealerSelf,
        dealerHedge,
        total
      };
    }).filter(Boolean);

    // 三大法人籌碼故事分析
    const result = analyzeInstitutionalData(data);

    return json({
      success: true,
      data,
      result
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

function analyzeMarginTradingBalanceData(data) {
  if (!data || data.length === 0) {
    return {
      story: "暫無融資餘額數據可供分析。"
    };
  }

  // 1. 融資增減連續方向
  const firstAction = data[0].financing >= 0 ? "buy" : "sell";
  let streakDays = 0;
  for (let i = 0; i < data.length; i++) {
    const currentAction = data[i].financing >= 0 ? "buy" : "sell";
    if (currentAction === firstAction) streakDays++;
    else break;
  }
  const financingStreak = {
    type: firstAction,
    days: streakDays
  };

  // 2. 近 5 日累計統計
  const last5Days = data.slice(0, 5);
  let sumFinancing5 = 0;
  let sumShorting5 = 0;
  let sumVolume5 = 0;
  last5Days.forEach(d => {
    sumFinancing5 += d.financing ?? 0;
    sumShorting5 += d.shorting ?? 0;
    sumVolume5 += d.volume ?? 0;
  });

  // 3. 最新一日數據
  const latest = data[0];
  const latestPrice = latest.price ?? 0;
  const latestFinRatio = latest.financingRatio ?? 0;
  const latestFinBalance = latest.financingBalance ?? 0;

  // 4. 近 5 日股價首尾比對
  const oldest5Price = last5Days[last5Days.length - 1]?.price ?? 0;
  const priceChange5 = latestPrice - oldest5Price;

  // 5. 融資水位警戒（使用率）
  let finRatioWarning = "";
  if (latestFinRatio >= 20) {
    finRatioWarning = `⚠️ 融資使用率已達 ${latestFinRatio}%，籌碼槓桿偏高，注意系統性回檔時的斷頭賣壓風險。`;
  } else if (latestFinRatio >= 10) {
    finRatioWarning = `融資使用率 ${latestFinRatio}%，目前處於中等水位，持續觀察。`;
  }

  // 6. 融券對決：軋空潛力判斷
  let shortSqueezeNote = "";
  if (sumShorting5 < 0 && sumFinancing5 > 0) {
    shortSqueezeNote = `💡 近5日融券同步減少（回補）、融資增加，空方陸續撤退、多方持續進場，具備短線軋空潛力。`;
  } else if (sumShorting5 > 0 && sumFinancing5 < 0) {
    shortSqueezeNote = `💡 近5日融券增加、融資減少，多空力道出現消長，空方正在加碼佈局，留意下檔壓力。`;
  }

  // 7. 量能輔助判斷
  const avgVolume5 = sumVolume5 / last5Days.length;
  let volumeNote = "";
  if (latest.volume > avgVolume5 * 1.5) {
    volumeNote = `今日成交量 ${latest.volume.toLocaleString()} 張，明顯放量（超過近5日均量 ${Math.round(avgVolume5).toLocaleString()} 張的 1.5 倍），變盤訊號需留意。`;
  } else if (latest.volume < avgVolume5 * 0.5) {
    volumeNote = `今日成交量 ${latest.volume.toLocaleString()} 張，明顯縮量（不足近5日均量 ${Math.round(avgVolume5).toLocaleString()} 張的一半），觀望氣氛濃厚。`;
  }

  // 8. 組裝故事文字
  const stories = [];

  // 故事一：現況慣性
  const streakLabel = financingStreak.type === "buy" ?
    `連續增加 ${financingStreak.days} 天` :
    `連續減少 ${financingStreak.days} 天`;
  stories.push(`【現況慣性】融資增減目前呈現 ${streakLabel}，融資餘額 ${latestFinBalance.toLocaleString()} 張，使用率 ${latestFinRatio}%。`);

  // 故事二：近 5 日統計
  const abs5 = Math.abs(sumFinancing5).toLocaleString();
  const dir5 = sumFinancing5 >= 0 ? "淨增加" : "淨減少";
  const priceDir = priceChange5 >= 0 ? "上漲" : "下跌";
  stories.push(`【近5日籌碼統計】融資餘額近5日累計 ${dir5} ${abs5} 張，期間股價 ${priceDir} ${Math.abs(priceChange5).toFixed(0)} 元。`);

  // 故事三：融資 × 股價共振判斷
  if (sumFinancing5 > 0 && priceChange5 > 0) {
    stories.push(`💡 融資持續擴張且股價同步上漲，呈現「融資價格共振向上」格局。散戶信心偏多，短線動能充足，但需留意若融資增幅持續擴大，過熱風險也隨之提升。`);
  } else if (sumFinancing5 > 0 && priceChange5 < 0) {
    stories.push(`💡 融資持續增加但股價卻下跌，出現「融資逆勢攤平」訊號。散戶傾向越跌越買，然而籌碼沉澱風險正在累積，若股價未能止跌回升，後續恐有融資斷頭賣壓。`);
  } else if (sumFinancing5 < 0 && priceChange5 > 0) {
    stories.push(`💡 融資持續減少但股價卻上漲，呈現「去槓桿上漲」的健康格局。籌碼結構逐步轉乾淨，此類行情往往由主力或法人主導，後市相對穩健。`);
  } else if (sumFinancing5 < 0 && priceChange5 < 0) {
    stories.push(`💡 融資減少且股價同步下跌，呈現「融資價格共振向下」的弱勢格局。持有者在虧損中持續出場，若跌勢無量則籌碼漸趨穩定，但短線仍需謹慎操作。`);
  }

  // 故事四：融資水位 / 融券對決 / 量能（有內容才加入）
  if (finRatioWarning) stories.push(finRatioWarning);
  if (shortSqueezeNote) stories.push(shortSqueezeNote);
  if (volumeNote) stories.push(volumeNote);

  return {
    summary: {
      financingStreakDays: financingStreak.days,
      financingStreakType: financingStreak.type,
      latestFinancingRatio: latestFinRatio,
      latestFinancingBalance: latestFinBalance,
      accumulated5Day: {
        financing: sumFinancing5,
        shorting: sumShorting5,
        volume: sumVolume5,
        priceChange: parseFloat(priceChange5.toFixed(0)),
      }
    },
    story: stories.join("<br><br>")
  };
}

async function fetchHiStockMarginTradingBalance(symbol) {
  try {
    const url = `https://histock.tw/stock/chips.aspx?no=${symbol}&m=mg`;
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://histock.tw/",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();

    // 精確比對 class="tb-stock tbChip nofade"（完全符合，順序與內容一致）
    const tableMatch = html.match(/<table[^>]*class="tb-stock tbChip nofade"[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) throw new Error("Table not found");

    const tableHtml = tableMatch[1];

    // 抓所有 <tr>，跳過第一列（標題列 <th>）
    const rows = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].slice(1);

    const data = rows.map(row => {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
      if (cells.length < 13) return null;

      const date = stripTags(cells[0][1]).trim(); // 日期
      const financing = parseNumber(cells[1][1]); // 融資增減
      const financingBalance = parseNumber(cells[2][1]); // 融資餘額
      const financingRatio = stripTags(cells[3][1]); // 融資使用率%
      const shorting = parseNumber(cells[4][1]); // 融券增減
      const shortingRatio = stripTags(cells[6][1]); // 融券使用率%
      const price = parseNumber(cells[10][1]); // 收盤價
      const priceChange = parseNumber(cells[11][1]); // 漲跌幅%
      const volume = parseNumber(cells[12][1]); // 成交量

      return {
        date,
        financing,
        financingBalance,
        financingRatio,
        shorting,
        shortingRatio,
        price,
        priceChange,
        volume
      };
    }).filter(Boolean);

    // 融資餘額與收盤價故事分析
    const result = analyzeMarginTradingBalanceData(data);

    return json({
      success: true,
      data,
      result
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

function analyzeLargeData(data) {
  if (!data || data.length === 0) {
    return {
      story: "暫無籌碼集中度數據可供分析。"
    };
  }

  // 百分比字串轉數字，例如 "82.75%" → 82.75
  function pct(str) {
    return parseFloat((str ?? '0').replace('%', '')) || 0;
  }

  const latest = data[0];
  const last5 = data.slice(0, 5);
  const last10 = data.slice(0, 10);

  const latestConc = pct(latest.chipConcentration);
  const latestForeign = pct(latest.foreignCapital);
  const latestBig = pct(latest.bigPlayerChips);
  const latestDir = pct(latest.DirectorsChips);

  // 1. 近 5 日籌碼集中度趨勢（首尾比對）
  const oldest5Conc = pct(last5[last5.length - 1]?.chipConcentration);
  const concChange5 = latestConc - oldest5Conc;

  // 2. 近 10 日外資籌碼趨勢
  const oldest10Foreign = pct(last10[last10.length - 1]?.foreignCapital);
  const foreignChange10 = latestForeign - oldest10Foreign;

  // 3. 大戶籌碼近 5 日趨勢
  const oldest5Big = pct(last5[last5.length - 1]?.bigPlayerChips);
  const bigChange5 = latestBig - oldest5Big;

  // 4. 籌碼集中度水位評級
  let concLevel = '';
  if (latestConc >= 80) concLevel = '極高（主力高度控盤）';
  else if (latestConc >= 60) concLevel = '偏高（籌碼相對集中）';
  else if (latestConc >= 40) concLevel = '中等（多空拉鋸）';
  else concLevel = '偏低（籌碼分散）';

  // 5. 外資 × 大戶共振判斷
  let synergy = '';
  if (foreignChange10 > 0 && bigChange5 > 0) {
    synergy = `💡 外資與大戶籌碼近期同步增加，呈現「法人大戶共振做多」格局，籌碼結構偏強，上漲動能相對可期。`;
  } else if (foreignChange10 < 0 && bigChange5 < 0) {
    synergy = `💡 外資與大戶籌碼近期同步減少，呈現「法人大戶共同撤退」格局，籌碼結構轉弱，需留意下檔風險。`;
  } else if (foreignChange10 > 0 && bigChange5 < 0) {
    synergy = `💡 外資持續加碼，但大戶籌碼卻在減少，多空力道出現分歧，後市需觀察外資是否持續主導。`;
  } else if (foreignChange10 < 0 && bigChange5 > 0) {
    synergy = `💡 大戶籌碼逆勢增加，但外資同步減少，內外資方向相左，可能存在主力低接機會，但需謹慎觀察後續發展。`;
  }

  // 6. 董監持股水位提示
  let dirNote = '';
  if (latestDir >= 30) {
    dirNote = `董監持股達 ${latestDir}%，內部人持股比例高，流通籌碼相對偏少，股價較易受單一大單影響。`;
  } else if (latestDir <= 5) {
    dirNote = `董監持股僅 ${latestDir}%，內部人持股偏低，需留意經營層對公司前景的信心程度。`;
  }

  // 7. 組裝故事文字
  const stories = [];

  // 故事一：現況水位
  stories.push(`【籌碼現況】籌碼集中度 ${latestConc}%（${concLevel}），外資持股 ${latestForeign}%，大戶持股 ${latestBig}%，董監持股 ${latestDir}%。`);

  // 故事二：近期趨勢
  const concDir = concChange5 >= 0 ? `上升 ${concChange5.toFixed(2)}%` : `下降 ${Math.abs(concChange5).toFixed(2)}%`;
  const bigDir = bigChange5 >= 0 ? `增加 ${bigChange5.toFixed(2)}%` : `減少 ${Math.abs(bigChange5).toFixed(2)}%`;
  const foreignDir = foreignChange10 >= 0 ? `增加 ${foreignChange10.toFixed(2)}%` : `減少 ${Math.abs(foreignChange10).toFixed(2)}%`;
  stories.push(`【近期趨勢】籌碼集中度近5日 ${concDir}，大戶籌碼近5日 ${bigDir}，外資籌碼近10日 ${foreignDir}。`);

  // 故事三：共振判斷
  if (synergy) stories.push(synergy);

  // 故事四：董監提示（有內容才加）
  if (dirNote) stories.push(dirNote);

  return {
    summary: {
      latest: {
        chipConcentration: latestConc,
        foreignCapital: latestForeign,
        bigPlayerChips: latestBig,
        DirectorsChips: latestDir,
      },
      change: {
        concChange5Days: parseFloat(concChange5.toFixed(2)),
        foreignChange10Days: parseFloat(foreignChange10.toFixed(2)),
        bigChange5Days: parseFloat(bigChange5.toFixed(2)),
      }
    },
    story: stories.join("<br><br>")
  };
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
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // 60MA需要更長區間
    const periods = [5, 10, 20, 60];

    // 平行打四支 SMA API + 一支歷史K線 API
    const [results, histRes] = await Promise.all([
      Promise.all(
        periods.map(period =>
          fetchWithTimeout(
            `https://api.fugle.tw/marketdata/v1.0/stock/technical/sma/${symbol}?from=${from}&to=${to}&timeframe=D&period=${period}`, {
              headers: {
                "X-API-KEY": env.FUGLE_KEY,
                "Accept": "application/json"
              }
            }
          ).then(r => r.json())
        )
      ),
      fetchWithTimeout(
        `https://api.fugle.tw/marketdata/v1.0/stock/historical/candles/${symbol}?from=${from}&to=${to}&timeframe=D&fields=close&sort=desc`, {
          headers: {
            "X-API-KEY": env.FUGLE_KEY,
            "Accept": "application/json"
          }
        }
      ).then(r => r.json()),
    ]);

    // 用 date 建立 close price 的查找 Map
    const priceMap = new Map(
      (histRes.data || []).map(row => [row.date, row.close])
    );

    // 以 date 為 key 合併資料
    const merged = {};
    periods.forEach((period, i) => {
      const rows = results[i]?.data || [];
      rows.forEach(row => {
        if (!merged[row.date]) merged[row.date] = {
          date: row.date
        };
        merged[row.date][`sma_${period}`] = parseFloat(row.sma.toFixed(2));
      });
    });

    // 合併 price（找不到日期就給 null）
    Object.values(merged).forEach(row => {
      row.price = priceMap.get(row.date) ?? null;
    });

    // 轉回陣列並依日期遞減排序
    const data = Object.values(merged).sort((b, a) => a.date.localeCompare(b.date));

    return json({
      success: true,
      data
    });
  } catch (e) {
    return json({
      success: false,
      error: e.message
    }, 500);
  }
}

async function fetchFugleRsi(symbol, env) {
  try {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const periods = [6, 9, 14, 20];

    // 平行打四支API
    const results = await Promise.all(
      periods.map(period =>
        fetchWithTimeout(
          `https://api.fugle.tw/marketdata/v1.0/stock/technical/rsi/${symbol}?from=${from}&to=${to}&timeframe=D&period=${period}`, {
            headers: {
              "X-API-KEY": env.FUGLE_KEY,
              "Accept": "application/json"
            }
          }
        ).then(r => r.json())
      )
    );

    // 以 date 為 key 合併資料
    const merged = {};
    periods.forEach((period, i) => {
      const rows = results[i]?.data || [];
      rows.forEach(row => {
        if (!merged[row.date]) merged[row.date] = {
          date: row.date
        };
        merged[row.date][`rsi_${period}`] = parseFloat(row.rsi.toFixed(2));
      });
    });

    // 轉回陣列並依日期遞減排序
    const data = Object.values(merged).sort((b, a) => a.date.localeCompare(b.date));

    return json({
      success: true,
      data
    });
  } catch (e) {
    return json({
      success: false,
      error: e.message
    }, 500);
  }
}

async function fetchFugleKdj(symbol, env) {
  try {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await fetchWithTimeout(
      `https://api.fugle.tw/marketdata/v1.0/stock/technical/kdj/${symbol}?from=${from}&to=${to}&timeframe=D&rPeriod=9&kPeriod=3&dPeriod=3`, {
        headers: {
          "X-API-KEY": env.FUGLE_KEY,
          "Accept": "application/json"
        }
      }
    );

    if (!res.ok) {
      return json({
        success: false,
        error: `HTTP ${res.status}`
      });
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
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

async function fetchFugleMacd(symbol, env) {
  try {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const res = await fetchWithTimeout(
      `https://api.fugle.tw/marketdata/v1.0/stock/technical/macd/${symbol}?from=${from}&to=${to}&timeframe=D&fast=12&slow=26&signal=9`, {
        headers: {
          "X-API-KEY": env.FUGLE_KEY,
          "Accept": "application/json"
        }
      }
    );

    if (!res.ok) {
      return json({
        success: false,
        error: `HTTP ${res.status}`
      });
    }

    const d = await res.json();
    const data = d.data
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(row => ({
        date: row.date,
        macdLine: parseFloat(row.macdLine.toFixed(2)),
        signalLine: parseFloat(row.signalLine.toFixed(2)),
        histogram: parseFloat((row.macdLine - row.signalLine).toFixed(4)),
      }));

    return json({
      success: true,
      data,
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

async function fetchFugleBrands(symbol, env) {
  try {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // 同時打兩支 API
    const [bbRes, histRes] = await Promise.all([
      fetchWithTimeout(
        `https://api.fugle.tw/marketdata/v1.0/stock/technical/bb/${symbol}?from=${from}&to=${to}&timeframe=D&period=20`, {
          headers: {
            "X-API-KEY": env.FUGLE_KEY,
            "Accept": "application/json"
          }
        }
      ),
      fetchWithTimeout(
        `https://api.fugle.tw/marketdata/v1.0/stock/historical/candles/${symbol}?from=${from}&to=${to}&timeframe=D&fields=close&sort=desc`, {
          headers: {
            "X-API-KEY": env.FUGLE_KEY,
            "Accept": "application/json"
          }
        }
      ),
    ]);

    if (!bbRes.ok) return json({
      success: false,
      error: `BB HTTP ${bbRes.status}`
    });
    if (!histRes.ok) return json({
      success: false,
      error: `Hist HTTP ${histRes.status}`
    });

    const bbData = await bbRes.json();
    const histData = await histRes.json();

    // 用 date 建立 close price 的查找 Map
    const priceMap = new Map(
      (histData.data || []).map(row => [row.date, row.close])
    );

    const data = bbData.data
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(row => ({
        date: row.date,
        upper: parseFloat(row.upper.toFixed(2)),
        middle: parseFloat(row.middle.toFixed(2)),
        lower: parseFloat(row.lower.toFixed(2)),
        price: priceMap.get(row.date) ?? null, // ← 新增，找不到日期就給 null
      }));

    return json({
      success: true,
      data
    });

  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

async function fetchYahooFinance(symbol, interval = 1, range = 1) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}d&range=${range}d`;
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "application/json",
      }
    });

    if (!res.ok) {
      return json({
        success: false,
        error: `HTTP ${res.status}`
      }, res.status);
    }

    const data = await res.json();
    const result = data?.chart?.result?. [0];
    if (!result) {
      return json({
        success: false,
        error: "無資料"
      });
    }

    const timestamps = result.timestamp ?? (result.meta?.regularMarketTime ? [result.meta.regularMarketTime] : []);
    const quote = result.indicators?.quote?. [0] || {};
    const closes = quote.close ?? (result.meta?.regularMarketPrice ? [result.meta.regularMarketPrice] : []);
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];

    // 取最後一筆（最新）
    const lastIdx = timestamps.length - 1;
    if (lastIdx < 0) {
      return json({
        success: false,
        error: "timestamp 為空"
      });
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
      success: true,
      prev: toFloat(result.meta?.chartPreviousClose),
      open: toFloat(opens[lastIdx]),
      high: toFloat(highs[lastIdx]),
      low: toFloat(lows[lastIdx]),
      close: toFloat(closes[lastIdx]),
      regularMarketTime,
      updateTime
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

// 語言偵測（簡單判斷是否含中文字元，有中文就不翻）
function isNeedTranslate(str) {
  return !/[\u4e00-\u9fff]/.test(str);
}

// 呼叫 MyMemory 翻譯單一字串
async function translateToZh(text) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-TW&de=bau720123@gmail.com`;
  const res = await fetchWithTimeout(url, {
    headers: {
      "User-Agent": UA
    }
  });
  const data = await res.json();
  return data?.responseData?.translatedText || text; // 失敗就回傳原文
}

// 聯準會利率
async function fetchFedWatch(env) {
  try {
    // 同時打三支 API
    const [investingRes, fredLowRes, fredHighRes] = await Promise.all([
      fetchWithTimeout("https://www.investing.com/central-banks/fed-rate-monitor", {
        headers: {
          "User-Agent": UA,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.investing.com/",
          "Cache-Control": "no-cache",
        }
      }, 10000),
      fetchWithTimeout(`https://api.stlouisfed.org/fred/series/observations?series_id=DFEDTARL&api_key=${env.FRED_KEY}&file_type=json&limit=1&sort_order=desc`, {
        headers: {
          "Accept": "application/json"
        }
      }, 8000),
      fetchWithTimeout(`https://api.stlouisfed.org/fred/series/observations?series_id=DFEDTARU&api_key=${env.FRED_KEY}&file_type=json&limit=1&sort_order=desc`, {
        headers: {
          "Accept": "application/json"
        }
      }, 8000),
    ]);

    if (!investingRes.ok) return json({
      success: false,
      error: `investing.com HTTP ${investingRes.status}`
    });

    const html = await investingRes.text();

    // ── 一、抓第一個 class="infoFed" 區塊，取 Meeting Time ──
    const infoFedIdx = html.indexOf('class="infoFed"');
    if (infoFedIdx === -1) return json({
      success: false,
      error: "找不到 infoFed"
    });

    const infoFedSlice = html.substring(infoFedIdx);
    const iStart = infoFedSlice.indexOf("<i>");
    const iEnd = infoFedSlice.indexOf("</i>", iStart);
    const meetingTimeRaw = (iStart !== -1 && iEnd !== -1) ?
      infoFedSlice.substring(iStart + 3, iEnd).trim() :
      "";

    let meetingTimeTaipei = "";
    if (meetingTimeRaw) {
      const rawNoET = meetingTimeRaw.replace(/\s*ET$/, "").trim();

      function parseETtoTaipei(str) {
        const ampmMatch = str.match(/^(.*?)\s+(\d{1,2}):(\d{2})(AM|PM)$/i);
        if (!ampmMatch) return "";

        const datePart = ampmMatch[1];
        let hours = parseInt(ampmMatch[2], 10);
        const minutes = ampmMatch[3];
        const ampm = ampmMatch[4].toUpperCase();

        if (ampm === "AM" && hours === 12) hours = 0;
        if (ampm === "PM" && hours !== 12) hours += 12;

        const time24 = `${String(hours).padStart(2, '0')}:${minutes}`;

        const dtEDT = new Date(`${datePart} ${time24}:00 GMT-0400`);
        const dtEST = new Date(`${datePart} ${time24}:00 GMT-0500`);

        const month = dtEDT.getUTCMonth() + 1;
        const dt = (month >= 4 && month <= 10) ? dtEDT : dtEST;
        if (isNaN(dt)) return "";

        return dt.toLocaleString("zh-TW", {
          timeZone: "Asia/Taipei",
          hour12: false,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).replace(/\//g, '-');
      }

      meetingTimeTaipei = parseETtoTaipei(rawNoET);
    }

    // ── 二、抓 fedRateTbl table ──
    const tableClass = 'class="genTbl openTbl fedRateTbl"';
    const tableIdx = html.indexOf(tableClass);
    if (tableIdx === -1) return json({
      success: false,
      error: "找不到 fedRateTbl"
    });

    const tableEnd = html.indexOf("</table>", tableIdx);
    const tableSlice = (tableEnd !== -1) ?
      html.substring(tableIdx, tableEnd + 8) :
      html.substring(tableIdx, tableIdx + 8000);

    const tbodyStart = tableSlice.indexOf("<tbody>");
    const tbodyEnd = tableSlice.indexOf("</tbody>");
    if (tbodyStart === -1 || tbodyEnd === -1) return json({
      success: false,
      error: "找不到 tbody"
    });

    const tbody = tableSlice.substring(tbodyStart + 7, tbodyEnd);

    const rates = [];
    const trRegex = /<tr[\s\S]*?<\/tr>/g;
    let trMatch;
    while ((trMatch = trRegex.exec(tbody)) !== null) {
      const row = trMatch[0];
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      const cells = [];
      let tdMatch;
      while ((tdMatch = tdRegex.exec(row)) !== null) {
        const text = tdMatch[1].replace(/<[^>]+>/g, "").trim();
        cells.push(text);
      }
      if (cells.length < 4) continue;

      const parseProb = (s) => {
        if (!s || s === "—" || s === "-") return null;
        return toFloat(s.replace("%", ""));
      };

      rates.push({
        targetRate: cells[0].replace(/\s+/g, " ").trim(),
        currentProb: parseProb(cells[1]),
        prevDayProb: parseProb(cells[2]),
        prevWeekProb: parseProb(cells[3]),
      });
    }

    // ── 三、FRED 當前基準利率 ──
    let currentRateLow = null;
    let currentRateHigh = null;

    try {
      const fredLow = await fredLowRes.json();
      const fredHigh = await fredHighRes.json();
      currentRateLow = toFloat(fredLow?.observations?. [0]?.value);
      currentRateHigh = toFloat(fredHigh?.observations?. [0]?.value);
    } catch (_) {
      // FRED 失敗不影響主資料，currentRate 留 null
    }

    // ── 四、推導每筆 targetRate 的 action ──
    rates.forEach(r => {
      if (currentRateLow === null || currentRateHigh === null) {
        r.action = null;
        return;
      }

      // targetRate 格式："3.50 - 3.75"，取下界比較
      const targetLow = toFloat(r.targetRate.split('-')[0]);
      const diff = Math.round((targetLow - currentRateLow) * 100); // 單位：bp

      if (diff === 0) r.action = '維持利率';
      else if (diff < 0) r.action = `降息 ${Math.abs(diff / 25)} 碼`;
      else r.action = `升息 ${diff / 25} 碼`;
    });

    return json({
      success: true,
      meetingTimeET: meetingTimeRaw,
      meetingTimeTW: meetingTimeTaipei,
      currentRate: (currentRateLow !== null && currentRateHigh !== null) ?
        `${currentRateLow} - ${currentRateHigh}` :
        null,
      rates,
    });

  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

// 新聞 RSS
async function fetchNewsRss(env) {
  const KEYWORDS = [
    '伊朗', '油價', '荷姆茲', '荷莫茲', '原油', '戰爭', '中東', '川普', '軍事', '衝突', '制裁', '核子', '核武', '導彈', '攻擊', '防空', '航運', '油輪', '台積電', 'ADR', '台達電', '聯發科', '台光電', '俄羅斯', '烏克蘭', '三星', '海力士', '談判', '高市', '輝達', 'AMD', '超微'
  ];

  // RSS 來源清單
  const SOURCES = [{
      url: 'https://tw.news.yahoo.com/rss/finance',
      name: 'Yahoo奇摩財經'
    },
    {
      url: 'https://feeds.feedburner.com/rsscna/intworld',
      name: '中央社國際'
    },
    {
      url: 'https://feeds.feedburner.com/rsscna/finance',
      name: '中央社產經'
    },
    {
      url: 'https://feeds.feedburner.com/rsscna/politics',
      name: '中央社政治'
    },
    {
      url: 'https://news.ltn.com.tw/rss/world.xml',
      name: '自由時報國際'
    },
    {
      url: 'https://news.ltn.com.tw/rss/business.xml',
      name: '自由時報財經'
    },
    // { url: 'https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com+Trump&hl=en-US&gl=US&ceid=US:en', name: 'Reuters-Trump' },
    // { url: 'https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com+Iran+oil&hl=en-US&gl=US&ceid=US:en', name: 'Reuters-Iran' },
    {
      url: 'https://cb.yna.co.kr/gate/big5/cn.yna.co.kr/RSS/politics.xml',
      name: '韓聯社'
    },
  ];

  // 解析單一 RSS XML，回傳 items 陣列
  function parseRss(xml, sourceName) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRegex.exec(xml)) !== null) {
      const block = m[1];

      // title：支援 CDATA 與純文字
      const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
        block.match(/<title>([\s\S]*?)<\/title>/);
      // link：
      //   中央社：<link>https://...</link>（有內容，優先）
      //   Yahoo ：<link/>（自閉合空標籤），URL 改放在 <guid>
      const linkMatch = block.match(/<link>(https?:\/\/[^\s<]+)<\/link>/) ||
        block.match(/<link><!\[CDATA\[([\s\S]*?)\]\]><\/link>/) ||
        block.match(/<guid[^>]*>(https?:\/\/[^\s<]+)<\/guid>/);
      const pubMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const srcMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);

      // description：支援 CDATA 與純文字，去除 HTML tag 後截斷
      const descMatch = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
        block.match(/<description>([\s\S]*?)<\/description>/);
      const descRaw = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim() : '';

      // 若原始資料已含 … 摘要符號，代表來源已自行截斷，直接清理使用；否則自行截斷至 120 字
      const hasEllipsis = descRaw.includes('…');
      const descClean = descRaw.replace(/…/g, '').trimEnd();
      const isGoogleNews = sourceName.startsWith('Reuters');
      const desc = isGoogleNews ? '' : (hasEllipsis ? descClean : (descRaw.length > 120 ? descRaw.slice(0, 120) + '…' : descRaw));

      const title = titleMatch ? titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : '';
      if (!title) continue;

      items.push({
        title,
        link: linkMatch ? linkMatch[1].trim() : '',
        pubDate: pubMatch ? pubMatch[1].trim() : '',
        source: srcMatch ? srcMatch[1].trim() : sourceName,
        desc,
      });
    }
    return items;
  }

  try {
    // 平行抓取所有 RSS 來源
    const results = await Promise.allSettled(
      SOURCES.map(s =>
        fetchWithTimeout(s.url, {
          headers: {
            "User-Agent": UA
          }
        }, 5000)
        .then(r => {
          // 韓聯社 XML header 宣告 UTF-8 但實際是 Big5，需強制用 Big5 解碼
          if (s.name === '韓聯社') {
            return r.arrayBuffer().then(buf => new TextDecoder('big5').decode(buf));
          }
          return r.text();
        })
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
    //   const top10Titles = unique.slice(0, 10).map((item, i) => `${i + 1}. ${item.title}`).join('\n'); // 抓取前十則標題的資料
    //   try {
    //     const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'X-goog-api-key': env.GEMINI_KEY,
    //     },
    //     body: JSON.stringify({
    //       system_instruction: { parts: { text: '你是一位專業的金融市場分析師，專注於地緣政治對能源與股票市場的影響。' } },
    //       contents: [{ parts: [{ text: `以下是最新新聞標題，請站在「台灣散戶投資人」的角度，分析這些新聞對美股與台股的整體影響。

    // ${top10Titles}

    // 判斷標準：
    // - 看多：對股市有正面影響，適合進場或持股
    // - 看空：對股市有負面影響，建議減碼或觀望
    // - 中性：影響不明確，建議持觀望態度

    // 請用以下 JSON 格式回答，不要有任何其他文字或 markdown：
    // {"signal":"看多/看空/中性","reason":"50字以內原因，以股市角度說明","risk":"高/中/低"}` }] }],
    //     }),
    //     });
    //     const geminiData = await geminiRes.json();
    //     const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    //     ai_suggest = JSON.parse(text.replace(/```json|```/g, '').trim());
    //   } catch (e) {
    //     ai_suggest = { error: e.message };
    //   }

    // 去重後，統一翻譯英文標題
    const translated = await Promise.all(
      unique.map(async (item) => {
        // if (isNeedTranslate(item.title)) {
        //   item.title = await translateToZh(item.title);
        // }
        return item;
      })
    );

    return new Response(JSON.stringify({
      success: true,
      items: translated.slice(0, 30),
      ai_suggest
    }), {
      headers: {
        ...CORS,
        "Content-Type": "application/json; charset=utf-8"
      }
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
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
    const res = await fetchWithTimeout(`https://www.moneydj.com/us/rest/eventlist?from=${from}&to=${to}`, {
      headers: {
        "User-Agent": UA,
        "Referer": "https://www.moneydj.com/us/home"
      }
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
        acc.push({
          ...item,
          indicators: filteredIndicators
        });
      }
      return acc;
    }, []);

    // 3. 注入「特定自訂事件」邏輯
    const customEvents = generateCustomEvents(currentYear);

    // 4. 取得 Finnhub 財報資料（只查近 14 天，避免超出免費方案限制）
    // const finnhubFrom = twTime.toISOString().split('T')[0]; // 今天
    // const finnhubTo = new Date(twTime.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // +14天
    // const earningsEvents = await generateCustomEventsFinnhub(finnhubFrom, finnhubTo, env);

    // 5. 取得 MacroMicro 靜態 JSON 財報資料（earnings）
    const {
      events: macroEarningsEvents,
      expired: macroEarningsExpired,
      endDate: macroEarningsEndDate
    } = await generateCustomEventsMacroEarnings();

    // 6. 取得 MacroMicro 靜態 JSON 總體經濟事件（macro）
    const {
      events: macroMacroEvents,
      expired: macroMacroExpired,
      endDate: macroMacroEndDate
    } = await generateCustomEventsMacroMacro();

    // 7. 合併所有來源並排序 (依日期 ID)：MoneyDJ + 週期性事件 + 手動事件 + MacroMicro財報 + MacroMicro總經
    const finalData = [...processed, ...customEvents, /*...earningsEvents,*/ ...macroEarningsEvents, ...macroMacroEvents]
      .sort((a, b) => a.id.localeCompare(b.id));

    return json({
      success: true,
      items: finalData,
      macroEarningsExpired,
      macroEarningsEndDate,
      macroMacroExpired,
      macroMacroEndDate
    });
  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    }, 500);
  }
}

/**
 * 自動計算特定金融事件日期
 */
function generateCustomEvents(year) {
  const events = [];

  // 這裡以 2026 年官方 MSCI 公佈日
  const msciAnnounceDates = {
    "2026": {
      1: 10, // 2月 10號
      4: 12, // 5月 12號
      7: 12, // 8月 12號
      10: 11 // 11月 11號
    }
  };

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

    // D. MSCI 相關日期
    if ([1, 4, 7, 10].includes(month)) {
      // 1. 調整生效日 (2, 5, 8, 11 月最後一個交易日/平日) 
      const msciEffectiveDate = getLastWeekday(year, month);
      events.push(createEventObj(msciEffectiveDate, "MSCI生效", "MSCI 指數調整生效日", "#16a085"));

      // 2. 調整公佈日，如果對照表有資料就使用，否則可以用「該月12號」當作估計值
      let announceDay = msciAnnounceDates[year] ? msciAnnounceDates[year][month] : 12;
      const msciAnnounceDate = new Date(year, month, announceDay);
      events.push(createEventObj(msciAnnounceDate, "MSCI公佈", "MSCI 指數審查結果公佈", "#16a085"));
    }

    // E. 費城半導體指數 (SOX) 重組生效日 (通常在 9月、12月第三個星期五)
    if ([8, 11].includes(month)) {
      const soxDate = getNthDay(year, month, 5, 3);
      events.push(createEventObj(soxDate, "SOX調整", "費半指數重組生效日", "#e67e22"));
    }
  }

  // 自定義事件
  events.push(createEventObj(
    new Date("2026-05-08"),
    "TSM",
    "台積電下午1點半公布4月份業績",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-05-13"),
    "川習會",
    "川普專機傍晚抵達北京，展開川習會行程",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-05-14"),
    "TSM",
    "2026 台積電台灣技術論壇",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-05-14"),
    "川習會",
    "川普與習近平見面，討論貿易與地緣政治議題",
    "#3498db",
    "002"
  ));
  events.push(createEventObj(
    new Date("2026-05-15"),
    "聯準會主席任期屆滿",
    "鮑爾主席任期屆滿、華許接任",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-05-15"),
    "川習會",
    "川普與習近平見面，討論貿易與地緣政治議題",
    "#3498db",
    "002"
  ));
  events.push(createEventObj(
    new Date("2026-05-20"),
    "520 總統就職紀念日",
    "520 總統就職紀念日",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-05-20"),
    "Google 開發者大會",
    "Google 開發者大會",
    "#3498db",
    "002"
  ));
  events.push(createEventObj(
    new Date("2026-05-27"),
    "NVIDIA",
    "輝達台灣新總部動土",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-05-28"),
    "TSM",
    "2026 台積電歐洲技術論壇",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-05-28"),
    "AI",
    "兆元宴",
    "#3498db",
    "002"
  ));
  events.push(createEventObj(
    new Date("2026-06-01"),
    "COMPUTEX",
    "NVIDIA 黃仁勳 台北流行音樂中心演講（需要注意台積電、聯發科、台光電）",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-06-01"),
    "COMPUTEX",
    "Qualcomm 執行長 Cristiano Amon 主題演講（需要注意華碩、宏碁、仁寶、廣達）",
    "#3498db",
    "002"
  ));
  events.push(createEventObj(
    new Date("2026-06-02"),
    "COMPUTEX",
    "Marvell 執行長 Matt Murphy 主題演講（需要注意智原、創意、世芯-KY）",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-06-02"),
    "COMPUTEX",
    "Intel 執行長陳立武主題演講（需要注意華碩、宏碁、廣達、仁寶、緯創）",
    "#3498db",
    "002"
  ));
  events.push(createEventObj(
    new Date("2026-06-03"),
    "COMPUTEX",
    "恩智浦 (NXP) 巨頭 Rafael Sotomayor 會在今天發表主題演講（需要注意聯發科、台達電）",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-06-04"),
    "COMPUTEX",
    "COMPUTEX 演講已經全部掀牌，國際媒體的報導也開始疲乏，開始要見真章的時候了",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-06-04"),
    "TSM",
    "台積電股東會",
    "#3498db",
    "002"
  ));
  events.push(createEventObj(
    new Date("2026-06-05"),
    "COMPUTEX",
    "世貿與南港展覽館首度開放一般民眾購票入場參觀 COMPUTEX 展覽，會場內的氣氛與媒體報導將是重要觀察指標",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-06-16"),
    "JAPAN",
    "日本央行（BOJ）利率決策會議",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-06-18"),
    "FED",
    "聯準會（Fed）利率決策與點陣圖",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-06-25"),
    "TSM",
    "台積電中國技術論壇",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-07-03"),
    "TSM",
    "台積電日本技術論壇",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-07-07"),
    "Samsung",
    "三星公布 Q2 營運展望預估",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-07-08"),
    "DELTA",
    "台達電海外法人說明會（地點：新加坡）",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-07-09"),
    "FOMC",
    "聯準會 FOMC 6 月會議記錄（台灣時間週四凌晨）",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-07-09"),
    "DELTA",
    "台達電公佈5月份業績",
    "#3498db",
    "002"
  ));
  events.push(createEventObj(
    new Date("2026-07-09"),
    "DELTA",
    "台達電海外法人說明會（地點：新加坡）",
    "#3498db",
    "003"
  ));
  events.push(createEventObj(
    new Date("2026-07-10"),
    "TSM",
    "台積電公佈5月份業績",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-07-10"),
    "DELTA",
    "台達電海外法人說明會（地點：新加坡）",
    "#3498db",
    "002"
  ));
  events.push(createEventObj(
    new Date("2026-07-16"),
    "TSM",
    "台積電法說會",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-07-29"),
    "SK",
    "海力士正式召開 Q2 財報法人說明會",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-07-30"),
    "DELTA",
    "台達電法說會",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-07-30"),
    "Samsung",
    "三星正式召開 Q2 財報法人說明會",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-09-23"),
    "TSM",
    "台積電北美技術論壇",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-10-29"),
    "DELTA",
    "台達電法說會",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-11-06"),
    "TSM",
    "台積電日本技術論壇",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-11-12"),
    "TSM",
    "台積電台灣技術論壇",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-11-17"),
    "TSM",
    "台積電中國技術論壇",
    "#3498db",
    "001"
  ));
  events.push(createEventObj(
    new Date("2026-11-24"),
    "TSM",
    "台積電歐洲技術論壇",
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
    "indicators": [{
      "code": "",
      "name": fullName
    }]
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

async function generateCustomEventsFinnhub(from, to, env) {
  const cleanKey = env.FINNHUB_KEY;
  if (!cleanKey) return []; // 如果沒有 Key，回傳空陣列

  const url = `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${cleanKey}`;

  try {
    const res = await fetchWithTimeout(url, {
      headers: {
        "User-Agent": UA
      }
    });

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
      'TSM', // 台積電 - 半導體代工龍頭
      'AAPL', // Apple - AI 手機與生態整合
      'META', // Meta - 生成式 AI 廣告與模型
      'MSFT', // Microsoft - Azure AI 與 OpenAI 合作
      'GOOGL', // Alphabet - Google AI 搜尋與雲端
      'AMZN', // Amazon - AWS AI 雲端服務
      'TSLA', // Tesla - 自動駕駛與機器人 AI
      'AMD', // AMD - AI 替代方案與 CPU 大廠
      'PLTR', // Palantir - AI 數據分析平台
      'CRM', // Salesforce - 企業級 AI CRM
      'NOW', // ServiceNow - 企業流程 AI
      'SNOW', // Snowflake - 資料倉儲 AI
      'ORCL', // Oracle - 雲端資料庫與 OCI
      'AVGO', // Broadcom - AI 網通與客製化晶片 (ASIC)
      'QCOM', // Qualcomm - 行動端邊緣 AI
      'ASML', // ASML - EUV 光刻機 (AI 產能關鍵)
      'MU', // Micron - HBM 高頻寬記憶體 (AI 必備)
      'INTC', // Intel - 晶片與晶圓代工競爭者
      'NFLX', // Netflix - 串流領頭羊，AI 推薦演算法
      'SMCI', // Supermicro - AI 伺服器基礎設施
      'ARM' // Arm - AI 晶片架構設計核心
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

// MacroMicro 靜態 JSON 財報資料
async function generateCustomEventsMacroEarnings() {
  const AI_TECH_SYMBOLS = new Set([
    'NVDA', // NVIDIA - AI 晶片龍頭
    'TSM', // 台積電 - 半導體代工龍頭
    'AAPL', // Apple - AI 手機與生態整合
    'META', // Meta - 生成式 AI 廣告與模型
    'MSFT', // Microsoft - Azure AI 與 OpenAI 合作
    'GOOGL', // Alphabet - Google AI 搜尋與雲端
    'AMZN', // Amazon - AWS AI 雲端服務
    'TSLA', // Tesla - 自動駕駛與機器人 AI
    'AMD', // AMD - AI 替代方案與 CPU 大廠
    'PLTR', // Palantir - AI 數據分析平台
    'CRM', // Salesforce - 企業級 AI CRM
    'NOW', // ServiceNow - 企業流程 AI
    'SNOW', // Snowflake - 資料倉儲 AI
    'ORCL', // Oracle - 雲端資料庫與 OCI
    'AVGO', // Broadcom - AI 網通與客製化晶片（ASIC）
    'QCOM', // Qualcomm - 行動端邊緣 AI
    'ASML', // ASML - EUV 光刻機 (AI 產能關鍵)
    'MU', // Micron - HBM 高頻寬記憶體 
    'INTC', // Intel - 晶片與晶圓代工競爭者
    'NFLX', // Netflix - 串流領頭羊，AI 推薦演算法
    'SMCI', // Supermicro - AI 伺服器基礎設施
    'ARM', // Arm - AI 晶片架構設計核心
    'SPCX', // SpaceX - AI 航太與衛星網路（Starlink）
    'AMD', // AMD - AI 替代方案與 CPU 大廠
  ]);

  try {
    const res = await fetch('https://bau720123.github.io/stock/data/macromicro_earnings.json?v=20260701');
    if (!res.ok) {
      console.error(`MacroMicro JSON 讀取失敗 (${res.status})`);
      return {
        events: [],
        expired: false,
        endDate: null
      };
    }

    const data = await res.json();
    const calendarItems = data.calendarItems || {};
    const endDate = data.endDate || null;

    // 判斷是否過期：台北時間今天 > endDate
    const twNow = new Date(Date.now() + 8 * 3600 * 1000);
    const twToday = twNow.toISOString().split('T')[0]; // YYYY-MM-DD
    const expired = endDate ? twToday >= endDate : false;

    const events = [];
    let index = 0;

    // calendarItems 結構：{ "2026-04-28": [...], "2026-04-29": [...] }
    for (const [dateStr, items] of Object.entries(calendarItems)) {
      const dateObj = new Date(dateStr);
      // dateObj.setDate(dateObj.getDate() + 1); // 因為是美東時間，所以日期會比台北晚一天，這裡先加一天轉回台北日期
      if (isNaN(dateObj.getTime())) continue;

      for (const item of items) {
        const symbol = (item.symbol || '').toUpperCase();
        if (!AI_TECH_SYMBOLS.has(symbol)) continue;

        events.push(createEventObj(
          dateObj,
          symbol,
          `${item.name} 財報發布（${item.period || ''} ${item.calendar_year || ''}）`,
          '#27ae60',
          `61${String(index).padStart(3, '0')}` // 61xxx，與 Finnhub 60xx 不衝突
        ));
        index++;
      }
    }

    return {
      events,
      expired,
      endDate
    };

  } catch (e) {
    console.error('MacroMicro 靜態 JSON 執行失敗：', e.message);
    return {
      events: [],
      expired: false,
      endDate: null
    };
  }
}

// MacroMicro 靜態 JSON 總體經濟事件
async function generateCustomEventsMacroMacro() {
  const US_MACRO_EVENTS = new Set([
    '美國聯準會利率決策',
    // '美國聯準會會議紀要',
    // '美國聯準會褐皮書',
    // '美國非農就業', // （美國勞工部）
    '美國消費者物價', // CPI
    '美國ADP非農就業', // （ADP公司）
    // '美國生產者物價',  // PPI
    // '美國消費者信心',
    // '美國申請失業金人數',
  ]);

  try {
    const res = await fetch('https://bau720123.github.io/stock/data/macromicro_macro.json?v=20260701');
    if (!res.ok) {
      console.error(`MacroMicro Macro JSON 讀取失敗 (${res.status})`);
      return {
        events: [],
        expired: false,
        endDate: null
      };
    }

    const data = await res.json();
    const items = data.calendarItems || [];

    // 過期判斷：endTs 轉台北日期
    const endDate = data.endTs ?
      new Date((data.endTs * 1000) + 8 * 3600 * 1000).toISOString().split('T')[0] :
      null;
    const twTodayDash = new Date(Date.now() + 8 * 3600 * 1000).toISOString().split('T')[0];
    const expired = endDate ? twTodayDash > endDate : false;

    const events = [];
    let index = 0;

    for (const item of items) {
      if (item.country !== 'us') continue;
      if (!US_MACRO_EVENTS.has(item.name)) continue;

      // eta 是 UTC 秒，+8h 轉台北時間
      const dateObj = new Date((item.eta * 1000) + 8 * 3600 * 1000);
      if (isNaN(dateObj.getTime())) continue;

      events.push(createEventObj(
        dateObj,
        item.name,
        `${item.name}（MacroMicro 總經）`,
        '#e67e22', // 橘色，與財報綠色區分
        `62${String(index).padStart(3, '0')}` // 62xxx，與財報 61xxx 不衝突
      ));
      index++;
    }

    return {
      events,
      expired,
      endDate
    };

  } catch (e) {
    console.error('MacroMicro Macro 靜態 JSON 執行失敗：', e.message);
    return {
      events: [],
      expired: false,
      endDate: null
    };
  }
}

// CNN Fear & Greed Index
async function fetchFearAndGreed() {
  try {
    const res = await fetchWithTimeout("https://production.dataviz.cnn.io/index/fearandgreed/graphdata", {
      headers: {
        "User-Agent": UA,
        "Accept": "application/json",
        "Referer": "https://edition.cnn.com/markets/fear-and-greed",
      }
    });

    if (!res.ok) return json({
      success: false,
      error: `HTTP ${res.status}`
    });

    const data = await res.json();
    const fg = data?.fear_and_greed;
    if (!fg) return json({
      success: false,
      error: "無資料"
    });

    const ratingMap = {
      "extreme fear": "極度恐慌",
      "fear": "恐慌",
      "neutral": "中性",
      "greed": "貪婪",
      "extreme greed": "極度貪婪",
    };

    return json({
      success: true,
      score: fg.score,
      rating: fg.rating,
      ratingZh: ratingMap[fg.rating] ?? fg.rating,
      updateTime: new Date(fg.timestamp).toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).replace(/\//g, '-'),
      prevClose: fg.previous_close,
      prev1Week: fg.previous_1_week,
      prev1Month: fg.previous_1_month,
      prev1Year: fg.previous_1_year,
    });

  } catch (e) {
    const errorMsg = e.name === 'AbortError' ? "連線逾時" : e.message;
    return json({
      success: false,
      error: errorMsg
    });
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
  if (twHour < 5) return; // 00:00～04:59 不執行

  const existing = await env.KV.get("subscriptions");
  if (!existing) return;

  const list = JSON.parse(existing);

  /*Cloudflare Workers 對外連線有並發限制 Workers 免費方案最多同時 6 個 subrequest*/

  // 第一批：Taifex（容易逾時，先打）
  const [taifexDay, taifexNight, taifexTsmc] = await Promise.all([
    fetchTaifex(2, "臺股期貨"),
    fetchTaifex(12, "臺股期貨"),
    fetchTaifex(12, "台積電期貨"),
  ]);

  // 第二批：其他
  const [twnRes, /*twnConRes, */ brentRes, vixRes, tsmcStock] = await Promise.all([
    fetchHiStock("stocktop2017", "TWN", "指數", "成交量(口)"),
    // fetchCnyesTwn(), // 富台指
    fetchSina("hf_OIL"),
    fetchSina("hf_VX"),
    fetchFugleQuote("2330", env),
  ]);

  const taifex_day = await taifexDay.json();
  const taifex_night = await taifexNight.json();
  const taifex_tsmc = await taifexTsmc.json();
  const twn = await twnRes.json();
  // const twncon  = await twnConRes.json();
  const brent = await brentRes.json();
  const vix = await vixRes.json();
  const tsmc = await tsmcStock.json();

  // 組合摘要文案
  const lines = [];

  // 偵測今日是否有特殊事件
  const todayKey = twTime.toISOString().split('T')[0].replace(/-/g, '');
  const allEvents = generateCustomEvents(currentYear);
  const todaysEvents = allEvents.filter(e => e.id.startsWith(todayKey));

  // if (todaysEvents.length > 0) {
  //   todaysEvents.forEach(ev => {
  //   lines.push(`今日特殊事件：${ev.indicators[0].name}`);
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
    if (taifex_day.success && taifex_day.price >= 0) {
      const sign = taifex_day.updown > 0 ? '▲' : taifex_day.updown < 0 ? '▼' : '';
      lines.push(`台股期貨日盤：${taifex_day.price.toFixed(0)} (${sign}${Math.abs(taifex_day.updown).toFixed(0)})`);
    } else if (taifex_day.error) {
      lines.push(`台股期貨日盤：` + taifex_day.error);
    } else {
      lines.push(`台股期貨日盤：資料從缺`);
    }

    if (tsmc.success) {
      const sign = tsmc.change > 0 ? '▲' : '▼';
      lines.push(`台積電現貨日盤：${tsmc.closePrice.toFixed(0)} (${sign}${Math.abs(tsmc.change).toFixed(0)})`);
    }
  }

  // 台股夜盤是從下午3點開始，一直到隔天
  if (twHour >= 15 || twHour <= 8) {
    if (taifex_night.success && taifex_night.price >= 0) {
      const sign = taifex_night.updown > 0 ? '▲' : taifex_night.updown < 0 ? '▼' : '';
      lines.push(`台股期貨夜盤：${taifex_night.price.toFixed(0)} (${sign}${Math.abs(taifex_night.updown).toFixed(0)})`);
    } else if (taifex_night.error) {
      lines.push(`台股期貨夜盤：` + taifex_night.error);
    } else {
      lines.push(`台股期貨夜盤：資料從缺`);
    }
  }

  // 台積電期貨夜盤是從下午5點25分開始，一直到隔天，不過我們的 cron 是每小時整點，所以實際上是從下午6點開始
  if (twHour >= 18 || twHour <= 8) {
    if (taifex_tsmc.success && taifex_tsmc.price >= 0) {
      const sign = taifex_tsmc.updown > 0 ? '▲' : taifex_tsmc.updown < 0 ? '▼' : '';
      lines.push(`台積電期貨夜盤：${taifex_tsmc.price.toFixed(0)} (${sign}${Math.abs(taifex_tsmc.updown).toFixed(0)})`);
    } else if (taifex_tsmc.error) {
      lines.push(`台積電期貨夜盤：` + taifex_tsmc.error);
    } else {
      lines.push(`台積電期貨夜盤：資料從缺`);
    }
  }

  if (twn.success) {
    lines.push(`富台指漲跌：${twn.changeText}`);
  } else if (twn.error) {
    lines.push(`富台指：` + twn.error);
  } else {
    lines.push(`富台指：資料從缺`);
  }

  // if (twncon.success) {
  //   lines.push(`富台指漲跌：${twncon.updown}`);
  // }

  if (brent.success) {
    lines.push(`布蘭特原油：${brent.price.toFixed(2)} 元（` + getBrentStatus(brent.price) + `）`);
  } else if (brent.error) {
    lines.push(`布蘭特原油：` + brent.error);
  } else {
    lines.push(`布蘭特原油：資料從缺`);
  }

  if (vix.success) {
    lines.push(`VIX 恐慌指數：${vix.price.toFixed(2)}（` + getVixStatus(vix.price) + `）`);
  } else if (vix.error) {
    lines.push(`VIX 恐慌指數：` + vix.error);
  } else {
    lines.push(`VIX 恐慌指數：資料從缺`);
  }

  const body = lines.length > 0 ? lines.join('\n') : '點擊查看即時報價';

  await Promise.all(
    list.map(sub => sendWebPush(sub, {
      title: '每小時市場摘要',
      body,
      url: '/stock/index.html',
      // image: '/stock/banner.png',
      actions: (isAndroidPlatform(sub.platform) || isApplePlatform(sub.platform)) ? [] : [{
          action: 'view',
          title: '查看詳情',
          icon: '/stock/icon-192.png'
        },
        {
          action: 'dismiss',
          title: '忽略',
          icon: '/stock/icon-192.png'
        },
      ]
    }, env))
  );
}

function getBrentStatus(p) {
  if (p < 95) return '平靜';
  if (p < 100) return '警戒';
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