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
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });

    const path = new URL(request.url).pathname;

    if (path === "/fitx")    return await fetchHiStock("stocktop2017", "FITX");
    if (path === "/twn")     return await fetchHiStock("stocktop2017", "TWN");
    if (path === "/brent")   return await fetchBrent();
    if (path === "/taifex")  return await fetchTaifex();
    if (path === "/cnbc")    return await fetchCnbc();
    if (path === "/rh")      return await fetchRobinHood();

    return json({ error: "unknown path" }, 404);
  }
};

// ── HiStock（台指期 / 富台指）──────────────────────────────
async function fetchHiStock(m, no) {
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
      current:    toFloat(data["指數"]),
      volume:     toInt(data["成交量(口)"]),
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