const urlParams = new URLSearchParams(window.location.search);
const card_type = urlParams.get('card_type') || 'taiwan-market';

// 警示閾值 localStorage 工具
const ALERT_PREFIX = 'alert_';

function alertGet(key) {
  const val = localStorage.getItem(ALERT_PREFIX + key);
  return val !== null ? parseFloat(val) : null;
}

function alertSet(key, value) {
  if (value === '' || value === null || isNaN(value)) {
    localStorage.removeItem(ALERT_PREFIX + key);
  } else {
    localStorage.setItem(ALERT_PREFIX + key, String(value));
  }
}

function alertEnabled(key) {
  return alertGet(key) !== null;
}

// group-header HTML 產生器（含偵測設定按鈕）
// settingsKey：若傳入則顯示齒輪按鈕，點擊呼叫 openAlertSettings(settingsKey)
function groupHeader(label, settingsKey = null, wording = '') {
  let isActive;
  if (settingsKey && settingsKey.startsWith('mystock_')) {
    isActive = alertEnabled(settingsKey + '_bids_price') ||
      alertEnabled(settingsKey + '_bids_qty') ||
      alertEnabled(settingsKey + '_asks_price') ||
      alertEnabled(settingsKey + '_asks_qty');
  } else {
    isActive = settingsKey && (alertEnabled(settingsKey + '_high') || alertEnabled(settingsKey + '_low') || alertEnabled(settingsKey));
  }

  var descButton = wording ? `
  <button class="alert-settings-btn" onclick="showInfo('${wording}')" title="內容說明">
    ❔
  </button>` : '';

  var space = settingsKey != '' ? '&nbsp;' : '';

  const usStocks = ['TSM', 'NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AVGO', 'SMCI', 'ASML', 'SPCX', 'AMD'];

  var settingsButton = '';
  if (settingsKey) {
    if (usStocks.includes(settingsKey)) {
      settingsButton = `
        <button class="alert-settings-btn"
          title="前往 Robinhood"
          onclick="window.open('https://robinhood.com/us/en/stocks/${settingsKey}/', '_blank')">
          📈
        </button>`;
    } else {
      settingsButton = `
        <button class="alert-settings-btn ${isActive ? 'active' : ''}"
          title="偵測設定"
          onclick="openAlertSettings('${settingsKey}')">
          設定價格提醒
        </button>`;
    }
  }

  return `<span class="group-header"><span class="group-header-title">${label}</span>${descButton}${space}${settingsButton}</span>`;
}

// 偵測設定彈窗
// config 格式：{ title, fields: [{ key, label, placeholder, unit }] }
// 自選股票清單：從 localStorage 讀取，fallback 到預設值
const MY_STOCKS_DEFAULT = [{
    symbol: '2330',
    name: '台積電'
  },
  // { symbol: '2308', name: '台達電' },
  // { symbol: '2317', name: '鴻海' },
];

function loadMyStocksList() {
  try {
    const saved = localStorage.getItem('my_stocks_list');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('讀取自選股票清單失敗，使用預設值', e);
  }
  return MY_STOCKS_DEFAULT;
}

function saveMyStocksList(list) {
  localStorage.setItem('my_stocks_list', JSON.stringify(list));
}

let MY_STOCKS = loadMyStocksList();

const ALERT_CONFIGS = {
  tsmc: {
    title: '台積電 偵測設定',
    fields: [{
        key: 'tsmc_high',
        label: '價格大於等於此值時通知',
        placeholder: '例：2000',
        unit: 'TWD'
      },
      {
        key: 'tsmc_low',
        label: '價格小於等於此值時通知',
        placeholder: '例：1800',
        unit: 'TWD'
      },
    ]
  },
  brent: {
    title: '布蘭特原油 偵測設定',
    fields: [{
        key: 'brent_high',
        label: '價格大於等於此值時通知',
        placeholder: '例：100',
        unit: 'USD'
      },
      {
        key: 'brent_low',
        label: '價格小於等於此值時通知',
        placeholder: '例：95',
        unit: 'USD'
      },
    ]
  },
  gold: {
    title: '黃金 偵測設定',
    fields: [{
        key: 'gold_high',
        label: '價格大於等於此值時通知',
        placeholder: '例：4000',
        unit: 'USD'
      },
      {
        key: 'gold_low',
        label: '價格小於等於此值時通知',
        placeholder: '例：3500',
        unit: 'USD'
      },
    ]
  },
  silver: {
    title: '白銀 偵測設定',
    fields: [{
        key: 'silver_high',
        label: '價格大於等於此值時通知',
        placeholder: '例：70',
        unit: 'USD'
      },
      {
        key: 'silver_low',
        label: '價格小於等於此值時通知',
        placeholder: '例：65',
        unit: 'USD'
      },
    ]
  },
  copper: {
    title: '銅 偵測設定',
    fields: [{
        key: 'copper_high',
        label: '價格大於等於此值時通知',
        placeholder: '例：70',
        unit: 'USD'
      },
      {
        key: 'copper_low',
        label: '價格小於等於此值時通知',
        placeholder: '例：65',
        unit: 'USD'
      },
    ]
  },
  vix: {
    title: 'VIX 恐慌指數 偵測設定',
    fields: [{
        key: 'vix_high',
        label: '指數高於此值時通知',
        placeholder: '例：30',
        unit: ''
      },
      {
        key: 'vix_low',
        label: '指數低於此值時通知',
        placeholder: '例：25',
        unit: ''
      },
    ]
  },
  vix_futures: {
    title: 'VIX 恐慌指數期貨 偵測設定',
    fields: [{
        key: 'vix_futures_high',
        label: '指數高於此值時通知',
        placeholder: '例：30',
        unit: ''
      },
      {
        key: 'vix_futures_low',
        label: '指數低於此值時通知',
        placeholder: '例：25',
        unit: ''
      },
    ]
  },
  usdollar: {
    title: '美元指數 偵測設定',
    fields: [{
        key: 'usdollar_high',
        label: '價格大於等於此值時通知',
        placeholder: '例：100',
        unit: ''
      },
      {
        key: 'usdollar_low',
        label: '價格小於等於此值時通知',
        placeholder: '例：99',
        unit: ''
      },
    ]
  },
  utctwd: {
    title: '美金兌換台幣匯率 偵測設定',
    fields: [{
        key: 'utctwd_high',
        label: '價格大於等於此值時通知',
        placeholder: '例：30',
        unit: ''
      },
      {
        key: 'utctwd_low',
        label: '價格小於等於此值時通知',
        placeholder: '例：25',
        unit: ''
      },
    ]
  },
  utcjpy: {
    title: '美元兌日圓匯率 偵測設定',
    fields: [{
        key: 'utcjpy_high',
        label: '價格大於等於此值時通知',
        placeholder: '例：100',
        unit: ''
      },
      {
        key: 'utcjpy_low',
        label: '價格小於等於此值時通知',
        placeholder: '例：99',
        unit: ''
      },
    ]
  }
};

// 動態注入自選股票的警示設定
syncAlertConfigs();

function syncAlertConfigs() {
  for (const stock of MY_STOCKS) {
    ALERT_CONFIGS[`mystock_${stock.symbol}`] = {
      title: `${stock.name}（${stock.symbol}）偵測設定`,
      fields: [
        // { key: `mystock_${stock.symbol}_high`, label: '價格大於等於此值時通知', placeholder: '例：1000', unit: 'TWD' },
        // { key: `mystock_${stock.symbol}_low`,  label: '價格小於等於此值時通知', placeholder: '例：800',  unit: 'TWD' },
        {
          key: `mystock_${stock.symbol}_bids_price`,
          label: '委買的價格（等於）、委買的張數（小於等於）<br>符合下述情境時通知',
          placeholder: '委買的價格',
          unit: 'TWD'
        },
        {
          key: `mystock_${stock.symbol}_bids_qty`,
          label: '',
          placeholder: '委買的張數',
          unit: '張'
        },
        {
          key: `mystock_${stock.symbol}_asks_price`,
          label: '委賣的價格（等於）、委賣的張數（小於等於）<br>符合下述情境時通知',
          placeholder: '委賣的價格',
          unit: 'TWD'
        },
        {
          key: `mystock_${stock.symbol}_asks_qty`,
          label: '',
          placeholder: '委賣的張數',
          unit: '張'
        },
      ]
    };
  }
}

function syncAddBtnState() {
  const rowCount = document.querySelectorAll('.mystock-row').length;
  const addBtn = document.getElementById('mystock-add-btn');
  const sotckLimit_max = document.getElementById('stock-limit-max');
  const sotckLimit_min = document.getElementById('stock-limit-min');
  if (addBtn) {
    addBtn.disabled = rowCount >= 5;
    addBtn.style.opacity = rowCount >= 5 ? '0.4' : '1';
    addBtn.style.cursor = rowCount >= 5 ? 'not-allowed' : 'pointer';
    sotckLimit_max.style.display = rowCount >= 5 ? 'block' : 'none';
    sotckLimit_min.style.display = rowCount == 0 ? 'block' : 'none';
  }
}

// 自選股票清單管理介面
async function openMyStockSettings() {
  // 每次開啟都讀取最新的清單
  let editList = loadMyStocksList().map(s => ({
    ...s
  }));

  // Autocomplete helpers
  function buildAcDropdown() {
    const el = document.createElement('div');
    el.id = 'ac-dropdown';
    el.style.cssText = `
      position:fixed; z-index:99999;
      background:#1a2130; border:1px solid #3a4a5c; border-radius:4px;
      max-height:220px; overflow-y:auto;
      font-size:.82rem; font-family:var(--mono);
      box-shadow:0 4px 16px #00000066;
      display:none;`;
    document.body.appendChild(el);
    return el;
  }

  function positionDropdown(dropdown, input) {
    const rect = input.getBoundingClientRect();
    const popupRect = document.querySelector('.swal2-popup').getBoundingClientRect();
    dropdown.style.left = rect.left + 'px';
    dropdown.style.top = (rect.bottom + 2) + 'px';
    dropdown.style.width = (popupRect.right - rect.left - 16) + 'px';
  }

  function filterTickers(query, mode) {
    if (!query || !_tickersCache) return [];
    const q = query.toLowerCase();
    return _tickersCache
      .filter(t => t.symbol && t.name)
      .filter(t => mode === 'name' ? t.name.includes(query) : t.symbol.toLowerCase().includes(q))
      .slice(0, 10);
  }

  function closeAcDropdown(dropdown) {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
  }

  // 移動前先把 DOM 當下的輸入值同步回 editList，避免重繪時內容遺失
  function syncFromDom() {
    editList.forEach((_, i) => {
      const sym = document.getElementById(`mystock-symbol-${i}`);
      const name = document.getElementById(`mystock-name-${i}`);
      if (sym) editList[i].symbol = sym.value.trim();
      if (name) editList[i].name = name.value.trim();
    });
  }

  const btnBase = `background:none; border:1px solid #3a4a5c; border-radius:4px; color:#5a7080; cursor:pointer; padding:5px 7px; font-size:.8rem; flex-shrink:0; line-height:1;`;

  function renderRows() {
    const last = editList.length - 1;
    return editList.map((s, i) => `
      <div id="mystock-row-${i}" style="display:flex; align-items:center; gap:6px; margin-bottom:8px;" class="mystock-row">
      <input
        id="mystock-symbol-${i}"
        type="text"
        maxlength="10"
        placeholder="股票代號"
        value="${s.symbol}"
        autocomplete="off"
        style="width:7em; background:#1a2130; border:1px solid #2e3f52; border-radius:4px; color:#c8d8e8; font-size:.85rem; padding:6px 8px; outline:none; font-family:var(--mono);"
      />
      <input
        id="mystock-name-${i}"
        type="text"
        maxlength="20"
        placeholder="股票名稱"
        value="${s.name}"
        style="width:6em; flex:1; background:#1a2130; border:1px solid #2e3f52; border-radius:4px; color:#c8d8e8; font-size:.85rem; padding:6px 8px; outline:none;"
      />
      <button type="button" onclick="mystockMoveRow(${i},-1)"
        ${i === 0 ? 'disabled style="' + btnBase + ' opacity:.25; cursor:default;"' : 'style="' + btnBase + '"'}
        onmouseover="if(!this.disabled){this.style.borderColor='#5a9eff';this.style.color='#5a9eff';}"
        onmouseout="this.style.borderColor='#3a4a5c';this.style.color='#5a7080';"
      >▲</button>
      <button type="button" onclick="mystockMoveRow(${i},1)"
        ${i === last ? 'disabled style="' + btnBase + ' opacity:.25; cursor:default;"' : 'style="' + btnBase + '"'}
        onmouseover="if(!this.disabled){this.style.borderColor='#5a9eff';this.style.color='#5a9eff';}"
        onmouseout="this.style.borderColor='#3a4a5c';this.style.color='#5a7080';"
      >▼</button>
      <button type="button" onclick="mystockRemoveRow(${i})"
        style="${btnBase}"
        onmouseover="this.style.borderColor='#ff4d6a'; this.style.color='#ff4d6a';"
        onmouseout="this.style.borderColor='#3a4a5c'; this.style.color='#5a7080';"
      >－</button>
      </div>`).join('');
  }

  function getHtml() {
    return `
      <div style="font-size:.75rem; color:#5a7080; margin-bottom:12px; text-align:left;">
      請設定股票代號與股票名稱，儲存後立即生效
      <br>
      股票名稱若不填，會自動抓取並對應
      </div>
      <div id="stock-limit-max" style="display:none; font-size:.75rem; color:red; margin-bottom:12px; text-align:left;">
      已達到最大能新增的數量
      </div>
      <div id="stock-limit-min" style="display:none; font-size:.75rem; color:red; margin-bottom:12px; text-align:left;">
      請至少保留一檔股票
      </div>
      <div id="mystock-rows">${renderRows()}</div>
      <button
      type="button"
      id="mystock-add-btn"
      onclick="mystockAddRow()"
      style="margin-top:4px; background:none; border:1px solid #3a4a5c; border-radius:4px; color:#5a7080; cursor:pointer; padding:6px 16px; font-size:.8rem; width:100%;"
      onmouseover="this.style.borderColor='#00c98a'; this.style.color='#00c98a';"
      onmouseout="this.style.borderColor='#3a4a5c'; this.style.color='#5a7080';"
      >＋ 新增</button>
    `;
  }

  // 掛到 window 讓 inline onclick 可以呼叫
  window.mystockAddRow = function() {
    syncFromDom();
    editList.push({
      symbol: '',
      name: ''
    });
    document.getElementById('mystock-rows').innerHTML = renderRows();
    syncAddBtnState();
  };

  window.mystockRemoveRow = function(idx) {
    syncFromDom();
    editList.splice(idx, 1);
    document.getElementById('mystock-rows').innerHTML = renderRows();
    syncAddBtnState();
  };

  window.mystockMoveRow = function(idx, dir) {
    syncFromDom();
    const target = idx + dir;
    if (target < 0 || target >= editList.length) return;
    [editList[idx], editList[target]] = [editList[target], editList[idx]];
    document.getElementById('mystock-rows').innerHTML = renderRows();
  };

  const result = await Swal.fire({
    title: '自選股票清單管理',
    html: getHtml(),
    background: '#111620',
    color: '#c8d8e8',
    confirmButtonText: '儲存',
    confirmButtonColor: '#0d6efd',
    cancelButtonText: '取消',
    showCancelButton: true,
    cancelButtonColor: '#3a4a5c',
    focusDeny: false,
    focusConfirm: false,
    didOpen: () => {
      const firstInput = document.querySelector('.swal2-popup input');
      if (firstInput) firstInput.blur();
      syncAddBtnState();

      // Autocomplete 事件綁定
      const acDropdown = buildAcDropdown();

      function bindAcToSymbolInputs() {
        const inputs = [
          ...document.querySelectorAll('[id^="mystock-symbol-"]').values().map(el => ({
            el,
            mode: 'symbol'
          })),
          ...document.querySelectorAll('[id^="mystock-name-"]').values().map(el => ({
            el,
            mode: 'name'
          })),
        ];
        inputs.forEach(({
          el: input,
          mode
        }) => {
          if (input._acBound) return;
          input._acBound = true;

          input.addEventListener('input', () => {
            const query = input.value.trim();
            const results = filterTickers(query, mode);
            if (!query || results.length === 0) {
              closeAcDropdown(acDropdown);
              return;
            }
            acDropdown.innerHTML = results.map(t => `
              <div data-symbol="${t.symbol}" data-name="${t.name}"
              style="padding:8px 12px; cursor:pointer; border-bottom:1px solid #2e3f52;
                  display:flex; justify-content:space-between; align-items:center; gap:8px;"
              onmouseover="this.style.background='#2e3f52';"
              onmouseout="this.style.background='';"
              >
              <span style="color:#f0b429; flex-shrink:0;">${t.symbol}</span>
              <span style="color:#c8d8e8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.name}</span>
              </div>`).join('');
            positionDropdown(acDropdown, input);
            acDropdown.style.display = 'block';

            acDropdown.querySelectorAll('div[data-symbol]').forEach(item => {
              item.addEventListener('mousedown', e => {
                e.preventDefault();
                const idx = input.id.replace('mystock-symbol-', '').replace('mystock-name-', '');
                const symbolInput = document.getElementById('mystock-symbol-' + idx);
                const nameInput = document.getElementById('mystock-name-' + idx);
                if (symbolInput) symbolInput.value = item.dataset.symbol;
                if (nameInput) nameInput.value = item.dataset.name;
                closeAcDropdown(acDropdown);
              });
            });
          });

          input.addEventListener('blur', () => {
            // 延遲關閉，讓 mousedown 能先觸發
            setTimeout(() => closeAcDropdown(acDropdown), 150);
          });
        });
      }

      // 初始綁定 + 每次 renderRows 後重新綁定
      bindAcToSymbolInputs();
      const acObserver = new MutationObserver(() => bindAcToSymbolInputs());
      const rowsContainer = document.getElementById('mystock-rows');
      if (rowsContainer) {
        acObserver.observe(rowsContainer, {
          childList: true,
          subtree: true
        });
      }

      // Swal 關閉時清理
      const popup = document.querySelector('.swal2-popup');
      if (popup) {
        new MutationObserver(() => {
          if (!document.body.contains(popup)) {
            closeAcDropdown(acDropdown);
            acDropdown.remove();
            acObserver.disconnect();
          }
        }).observe(document.body, {
          childList: true
        });
      }
    },
    preConfirm: () => {
      // 從 DOM 讀取最新輸入值
      const rows = document.querySelectorAll('[id^="mystock-row-"]');
      const list = [];
      rows.forEach((_, i) => {
        const symbol = (document.getElementById(`mystock-symbol-${i}`)?.value || '').trim().toUpperCase();
        const name = (document.getElementById(`mystock-name-${i}`)?.value || '').trim();
        if (symbol) list.push({
          symbol,
          name: name || symbol
        });
      });
      if (list.length === 0) {
        // Swal.showValidationMessage('請至少保留一檔股票');
        return false;
      }
      return list;
    }
  });

  if (!result.isConfirmed) return;

  // 先去重（由後往前，保留最早那筆）
  const deduped = result.value.reduceRight((acc, item) => {
    if (!acc.some(i => i.symbol === item.symbol)) {
      acc.unshift(item);
    }
    return acc;
  }, []);

  // 挑選出 symbol 等於 name 的資料
  const needFetch = deduped.filter(s => s.symbol === s.name);

  // 平行抓取缺少 name 的股票資料
  if (needFetch.length > 0) {
    await Promise.all(
      needFetch.map(async s => {
        const data = await fetch(WORKER + '/stock/quote/' + s.symbol).then(r => r.json()).catch(() => null);
        if (data && data.success && data.name) {
          const target = deduped.find(r => r.symbol === s.symbol);
          if (target) target.name = data.name;
        }
      })
    );
  }
  saveMyStocksList(deduped);

  Swal.fire({
    icon: 'success',
    title: '已儲存',
    text: '股票清單已更新',
    background: '#111620',
    color: '#c8d8e8',
    confirmButtonText: '立即更新',
    showCancelButton: true,
    cancelButtonText: '稍後再說',
    cancelButtonColor: '#3a4a5c',
  }).then(r => {
    if (r.isConfirmed) {
      MY_STOCKS = loadMyStocksList(); // 更新全域變數
      syncAlertConfigs(); // 重新注入新股票的警示設定
      loadMyStock();
      // location.reload();
    }
  });
}

const swalQueue = [];
let isSwalRunning = false;

async function showInfo(wording = '', title = '內容說明') {
  swalQueue.push({
    wording,
    title
  });
  if (!isSwalRunning) {
    await processSwalQueue();
  }
}

async function processSwalQueue() {
  isSwalRunning = true;
  while (swalQueue.length > 0) {
    const {
      wording,
      title
    } = swalQueue.shift();
    await Swal.fire({
      icon: 'info',
      title: title,
      html: `<div style="text-align: left;">${wording.toString().replace(/\n/g, '<br>')}</div>`,
      showCancelButton: false,
      background: '#111620',
      color: '#c8d8e8',
      confirmButtonText: '知道了',
    });
  }
  isSwalRunning = false;
}

async function openAlertSettings(configKey) {
  const config = ALERT_CONFIGS[configKey];
  if (!config) return;

  // 動態產生表單 HTML
  const fieldsHtml = config.fields.map(f => {
    const currentVal = alertGet(f.key);
    return `
      <div style="margin-bottom:14px; text-align:left;">
      <label style="display:block; font-size:.8rem; color:#aaa; margin-bottom:5px;">${f.label}</label>
      <div style="display:flex; align-items:center; gap:8px;">
        <input
        id="swal-field-${f.key}"
        type="number"
        step="0.01"
        placeholder="${f.placeholder}"
        value="${currentVal !== null ? currentVal : ''}"
        style="
          flex:1;
          background:#1a2130;
          border:1px solid #2e3f52;
          border-radius:4px;
          color:#c8d8e8;
          font-size:.9rem;
          padding:7px 10px;
          outline:none;
        "
        />
        <span style="color:#5a7080; font-size:.8rem; min-width:30px;">${f.unit}</span>
        <button
        type="button"
        onclick="document.getElementById('swal-field-${f.key}').value=''"
        title="清除"
        style="
          background:none;
          border:1px solid #3a4a5c;
          border-radius:4px;
          color:#5a7080;
          cursor:pointer;
          padding:5px 8px;
          font-size:.75rem;
          transition: border-color .2s, color .2s;
        "
        onmouseover="this.style.borderColor='#ff4d6a'; this.style.color='#ff4d6a';"
        onmouseout="this.style.borderColor='#3a4a5c'; this.style.color='#5a7080';"
        >清除</button>
      </div>
      </div>
    `;
  }).join('');

  const result = await Swal.fire({
    title: config.title,
    html: `
    <div style="font-size:.75rem; color:#5a7080; margin-bottom:16px;">留空或清除表示停用該項偵測</div>
    ${fieldsHtml}
  `,
    background: '#111620',
    color: '#c8d8e8',
    confirmButtonText: '儲存',
    confirmButtonColor: '#0d6efd',
    cancelButtonText: '取消',
    showCancelButton: true,
    cancelButtonColor: '#3a4a5c',
    focusDeny: false,
    focusConfirm: false,
    didOpen: () => {
      const firstInput = document.querySelector('.swal2-popup input');
      if (firstInput) firstInput.blur();
    },
    preConfirm: () => {
      const values = {};
      for (const f of config.fields) {
        const el = document.getElementById('swal-field-' + f.key);
        values[f.key] = el ? el.value.trim() : '';
      }
      return values;
    }
  });

  if (!result.isConfirmed) return;

  // 儲存至 localStorage
  for (const f of config.fields) {
    const val = result.value[f.key];
    alertSet(f.key, val === '' ? null : parseFloat(val));
  }

  Swal.fire({
    icon: 'success',
    title: '已儲存',
    text: "偵測設定已更新",
    showCancelButton: true,
    background: '#111620',
    color: '#c8d8e8',
    confirmButtonText: '立即更新',
    cancelButtonText: '稍後再說'
  }).then((result) => {
    if (result.isConfirmed) {
      location.reload();
    }
  });
}

async function sendNotification(title, body, url = '../stock/index.html', sound = 'alert_alert') {
  // 發出 alert
  // showSweetAlert('warning', title + "：" + body);
  showInfo(body, title);

  // 頁面在前景時播放音效
  new Audio(`../stock/sounds/${sound}.wav`).play().catch((err) => {
    // showSweetAlert('error', '發生錯誤', err.message);
  });

  // 確認有通知權限
  if (Notification.permission !== 'granted') return;

  const isAndroid = /Android/i.test(navigator.userAgent);

  const reg = await navigator.serviceWorker.ready;
  reg.showNotification(title, {
    body: body, // 通知內文
    icon: '/stock/icon-512.png', // 通知圖示（大圖）
    badge: '/stock/icon-192.png', // 狀態列小圖示（Android）
    // image: '/stock/banner.png', // 通知內的橫幅大圖
    tag: title, // 同 tag 的通知會互相取代，避免洗版
    renotify: true, // tag 相同時是否還要震動提醒
    silent: false, // 是否靜音
    vibrate: [200, 100, 200], // 震動模式（Android）
    actions: isAndroid ? [] : [ // 通知上的快捷按鈕
      {
        action: 'view',
        title: '查看詳情'
      },
      {
        action: 'dismiss',
        title: '忽略'
      },
    ],
    data: {
      url: url
    }, // 把目標網址存進去
  });
}

// 將訂閱邏輯封裝成一個函數
async function subscribeUser() {
  if (!('serviceWorker' in navigator)) {
    const replyMessage = '您的瀏覽器不支援 Service Worker';
    showSweetAlert('error', '發生錯誤', replyMessage);
    await writeLogs('ERROR', replyMessage);
    return;
  }

  try {
    // 確保 SW 已啟動
    const reg = await navigator.serviceWorker.ready;

    // iOS 偵測與提醒
    const isStandalone = window.navigator.standalone === true;
    if (!isStandalone && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      const replyMessage = 'iOS 必須先「加入主畫面」成為 PWA 才能開啟通知！';
      showSweetAlert('error', '發生錯誤', replyMessage);
      await writeLogs('ERROR', replyMessage);
      return;
    }

    // 請求通知權限
    const permission = await Notification.requestPermission();
    const replyMessage = '[SW] 通知權限：' + permission;
    showSweetAlert('info', '通知權限', replyMessage);
    await writeLogs('INFO', replyMessage);

    if (permission !== 'granted') {
      const replyMessage = '權限被拒絕，請至「設定 > 通知 > 即時報價」手動開啟';
      showSweetAlert('error', '發生錯誤', replyMessage);
      await writeLogs('ERROR', replyMessage);
      return;
    }

    if (permission === 'granted') {
      document.getElementById("subscribeIcon").style.fill = "aliceblue";
    }

    // 訂閱 Web Push
    const VAPID_PUBLIC_KEY = 'BNKIWkZVpBlLD1R1i7eU7ZhtS-W7X5wI_v84v_rGOGBRvAKO999c1DssgaBvVRI2y5w2SkUx62upF8hs34PicbA';

    let subscription;
    try {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      const replyMessage = '訂閱成功：' + subscription.endpoint.substring(0, 50);
      showSweetAlert('info', '訂閱狀態', replyMessage);
      await writeLogs('PUSH', replyMessage);
    } catch (e) {
      const replyMessage = '訂閱失敗：' + e.message;
      showSweetAlert('error', '發生錯誤', replyMessage);
      await writeLogs('SW', replyMessage);
      return;
    }

    try {
      // 把 subscription 傳給 Worker 時，順便帶上 User-Agent
      await fetch('https://billowing-queen-4a58.bau720123.workers.dev/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...subscription.toJSON(),
          userAgent: navigator.userAgent
        })
      });
      const replyMessage = 'Push 訂閱完成，已傳送到 Worker';
      showSweetAlert('info', '訂閱狀態', replyMessage);
      await writeLogs('SW', replyMessage);
    } catch (e) {
      const replyMessage = '傳送到 Worker 失敗：' + e.message;
      showSweetAlert('error', '發生錯誤', replyMessage);
      await writeLogs('ERROR', replyMessage);
    }
  } catch (err) {
    const replyMessage = '例外失敗：' + err;
    showSweetAlert('error', '發生錯誤', replyMessage);
    await writeLogs('ERROR', replyMessage);
  }
}

// Service Worker 註冊
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/stock/sw.js')
      .then(async reg => {
        const replyMessage = '註冊成功：' + reg.scope;
        // showSweetAlert('info', '註冊狀態', replyMessage);
        await writeLogs('SW', replyMessage);

        // 先檢查 Notification 是否存在
        if (typeof Notification === 'undefined') {
          const replyMessage = '此環境不支援通知功能';
          showSweetAlert('error', '發生錯誤', replyMessage);
          await writeLogs('ERROR', replyMessage);
          return;
        }

        // 檢查通知權限
        if (Notification.permission === 'granted') {
          document.getElementById("subscribeIcon").style.fill = "aliceblue";
        }
      })
      .catch(async err => {
        const replyMessage = '註冊失敗：' + err;
        // showSweetAlert('error', '發生錯誤', replyMessage);
        await writeLogs('ERROR', replyMessage);
      });
  });
}

// VAPID 公鑰轉換工具函數
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

const WORKER = "https://billowing-queen-4a58.bau720123.workers.dev";
let tsmCnbcData = null; // 用於跨卡片共享資料

// 系統即時時間顯示
function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent = now.toLocaleTimeString('zh-TW', {
    hour24: false
  });
}
// setInterval(updateClock, 1000);
// updateClock();

function changeClass(val, reverse = 0) {
  if (!val) return '';
  const s = String(val);

  let isUp = s.includes('▲') || s.includes('+') || s > 0;
  let isDown = s.includes('▼') || s.includes('-') || s < 0;

  if (!isUp && !isDown) return '';

  // 如果 reverse 為 1，則將 isUp 與 isDown 對調
  if (reverse === 1) {
    [isUp, isDown] = [isDown, isUp];
  }

  return isUp ? 'up' : 'down';
}

function formatChange(val) {
  if (typeof val === 'number') return (val > 0 ? '+' : '') + val.toFixed(2);
  return val;
}

function row(label, value = '', cls = '') {
  return `<div class="row"><span class="row-label">${label}</span><span class="row-value ${cls}">${value}</span></div>`;
}

function setCard(id, updown, html, extraClass = '') {
  const card = document.getElementById(id);
  card.className = 'card ' + (updown > 0 ? 'up' : updown < 0 ? 'down' : '') + (extraClass ? ' ' + extraClass : '');
  card.innerHTML = html;
  setTimeout(() => card.classList.add('loaded'), 20);
}

async function loadAll() {
  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          document.getElementById("subscribeIcon").style.fill = "aliceblue";
        } else {
          document.getElementById("subscribeIcon").style.fill = "none";
        }
      });
    } else if (Notification.permission === 'granted') {
      document.getElementById("subscribeIcon").style.fill = "aliceblue";
    } else {
      document.getElementById("subscribeIcon").style.fill = "none";
    }
  }

  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');

  // 重置為 skeleton
  document.querySelectorAll('.card').forEach(c => {
    c.className = 'card';
    // c.innerHTML = c.querySelector('.card-title')?.outerHTML ||
    //   '<div class="skeleton"></div>';
    // const sk = document.createElement('div');
    // sk.className = 'skeleton';
    // sk.style.width = '60%';
    // c.appendChild(sk);
  });

  // await Promise.allSettled([
  //   loadTw(),
  //   loadAmerica(),
  //   loadMaterials(),
  //   loadSentiment(),
  //   loadMyStock(),
  // ]);

  // 先移除所有選單的 active 狀態（避免切換時殘留）
  document.querySelectorAll('#menuList a').forEach(link => {
    link.classList.remove('active');
  });

  // 尋找 href 包含當前 card_type 的連結並加上 active
  // 利用屬性選擇器 [href*="..."] 非常精準
  const activeLink = document.querySelector(`#menuList a[href*="card_type=${card_type}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }

  // 定義對照表：[參數值]: { 元素ID, 執行函式 }
  const config = {
    'taiwan-market': {
      id: 'card-tw',
      fn: loadTw
    },
    'america-market': {
      id: 'card-america',
      fn: loadAmerica
    },
    'asia-market': {
      id: 'card-asia',
      fn: loadAsia
    },
    'materials': {
      id: 'card-materials',
      fn: loadMaterials
    },
    'market-sentiment': {
      id: 'card-sentiment',
      fn: loadSentiment
    },
    'my-stock': {
      id: 'card-mystock',
      fn: loadMyStock
    },
    'news': {
      id: 'card-news',
      fn: loadNews
    },
    'america-calendar': {
      id: 'card-america-calendar',
      fn: loadAmericaCalendar
    },
  };

  // 先隱藏所有卡片並重置樣式
  document.querySelectorAll('.card').forEach(c => {
    c.style.display = 'none';
    c.className = 'card';
  });

  // 判斷模式並執行
  if (card_type === 'all') {
    // 全顯示
    const promises = [];

    for (const key in config) {
      const target = config[key];
      const el = document.getElementById(target.id);
      if (el) {
        el.style.display = 'block'; // 顯示所有卡片
      }
      promises.push(target.fn()); // 加入執行隊列
    }

    // 並行執行所有抓取函式
    await Promise.allSettled(promises);

  } else {
    // 單一顯示
    // 取得目標設定
    const target = config[card_type];

    if (target) {
      // 顯示對應的卡片
      const el = document.getElementById(target.id);
      if (el) el.style.display = 'block';

      // 只執行對應的函式
      try {
        await target.fn();
      } catch (e) {
        console.error(`載入 ${card_type} 資料失敗：`, e);
      }
    } else {
      console.warn(`未知的 card_type: ${card_type}`);
      // 選項：如果參數亂傳，可以導向預設值或顯示錯誤
    }
  }

  btn.classList.remove('spinning');
  startCountdown();
}

window.onload = loadAll;

function getMarketEmoji() {
  const now = new Date();
  // 轉成台北時間
  const tpe = new Date(now.toLocaleString('en-US', {
    timeZone: 'Asia/Taipei'
  }));
  const h = tpe.getHours();
  const m = tpe.getMinutes();
  const hm = h * 100 + m; // 例如 09:37 → 937
  const day = tpe.getDay(); // 0=週日, 1=週一, ..., 6=週六
  const isWeekday = day >= 1 && day <= 5;

  const isDaySession = isWeekday && hm >= 830 && hm <= 1345; // 08:30 ~ 13:45
  const isNightSession = isWeekday && hm >= 1500 || hm <= 500; // 15:00 ~ 隔日05:00
  const isTsmcNight = isWeekday && hm >= 1725 || hm <= 500; // 17:25 ~ 隔日05:00
  const isTwn = isWeekday; // 17:25 ~ 隔日08:59

  return {
    isDaySession,
    isNightSession,
    isTsmcNight,
    isTwn
  };
}

// 台股市場概況
async function loadTw() {
  const [taifexNight, taifexDay, twn, /*twncon, */ taifexTsmc, fugleQuote /*, fugleVolume, fugleHistory*/ , ForeignNetPosition, Institutional, MarginTradingBalance] = await Promise.all([
    fetch(WORKER + '/taifex/12/臺股期貨').then(r => r.json()), // 台股期貨夜盤
    fetch(WORKER + '/taifex/2/臺股期貨').then(r => r.json()), // 台股期貨日盤
    fetch(WORKER + '/twn').then(r => r.json()), // 富台指
    // fetch(WORKER + '/twncon').then(r => r.json()), // 富台指
    fetch(WORKER + '/taifex/12/台積電期貨').then(r => r.json()), // 台積電期貨夜盤
    fetch(WORKER + '/stock/quote/2330').then(r => r.json()), // 台積電現貨日盤股價資訊
    // fetch(WORKER + '/stock/volume/2330').then(r => r.json()), // 台積電現貨日盤分價量表
    // fetch(WORKER + '/stock/history/2330').then(r => r.json()), // 台積電現股歷史股價資料
    fetch(WORKER + '/foreign-net-position').then(r => r.json()), // 外資空單數
    fetch(WORKER + '/institutional').then(r => r.json()), // 三大法人買賣超
    fetch(WORKER + '/margin-trading-balance').then(r => r.json()), // 融資餘額
  ]);

  const {
    isDaySession,
    isNightSession,
    isTsmcNight,
    isTwn
  } = getMarketEmoji();

  // 各種時間區段標籤
  const futuresDay = `${isDaySession ? '🟢' : '🔴'} 期貨日盤`;
  const futuresNight = `${isNightSession ? '🟢' : '🔴'} 期貨夜盤`;
  const tsmcNight = `${isTsmcNight ? '🟢' : '🔴'} 期貨夜盤`;
  const spotDay = `${isDaySession ? '🟢' : '🔴'} 現貨日盤`;
  const twnDay = `${isTwn ? '🟢' : '🔴'} 富台指`;

  let html = `<div class="card-title">台股市場概況</div>`;

  html += `<div class="card-title" style="color: sandybrown;">㊣大盤指數㊣</div>`;

  // 【台股期貨夜盤】
  html += groupHeader(futuresNight, '', '台股期貨（簡稱「台指期」）是以「台灣加權股價指數」為標的物的期貨契約，讓投資人透過保證金制度，以小博大操作台股漲跌。具高槓桿、多空靈活、交易成本低等特性，熱門商品包括大台指、小台指、微台指，結算日為每月第三個星期三。<br><br>交易時間：每週一至週五的下午15:00至隔日凌晨05:00。');
  if (taifexNight.success && taifexNight.price > 0) {
    const sign = taifexNight.updown > 0 ? '▲' : taifexNight.updown < 0 ? '▼' : '';
    var cls = 'up';
    if (taifexNight.updown > 0) cls = 'down';
    html += row('現價', taifexNight.price.toFixed(1), 'accent');
    html += row('漲跌', sign + Math.abs(taifexNight.updown).toFixed(0), cls);
  } else {
    html += `<div class="error-text">暫時無法取得資料，請於 15:00 之後再進行嘗試</div>`;
  }

  // 【台股期貨日盤】
  html += groupHeader(futuresDay, '', '台股期貨（簡稱「台指期」）是以「台灣加權股價指數」為標的物的期貨契約，讓投資人透過保證金制度，以小博大操作台股漲跌。具高槓桿、多空靈活、交易成本低等特性，熱門商品包括大台指、小台指、微台指，結算日為每月第三個星期三。<br><br>交易時間：每週一至週五的上午8:45至下午1:45');
  if (taifexDay.success && taifexDay.price > 0) {
    const sign = taifexDay.updown > 0 ? '▲' : taifexDay.updown < 0 ? '▼' : '';
    var cls = 'up';
    if (taifexDay.updown > 0) cls = 'down';
    html += row('現價', taifexDay.price.toFixed(1), 'accent');
    html += row('漲跌', sign + Math.abs(taifexDay.updown).toFixed(0), cls);
  } else {
    html += `<div class="error-text">暫時無法取得資料，請於 09:00 之後再進行嘗試</div>`;
  }

  // 【富台指】
  html += groupHeader(twnDay, '', '「富台指」全名為「富時台灣指數期貨」（FTSE Taiwan Index Futures），是新加坡交易所（SGX）與富時羅素（FTSE Russell）合作推出的金融衍生工具。它以美元計價，因 MSCI 摩台指移出新加坡而誕生，成為國際投資人衡量台股表現、避險及在台股休市時預估開盤方向的核心工具。<br><br>交易時間：幾乎全天候營業');
  if (twn.success) {
    const cls = changeClass(twn.changeText, 1);
    const formattedTime = twn.updateTime.replace(/\./g, '-');
    // html += row('開盤價', twn.open.toFixed(0));
    // html += row('最高價', twn.high.toFixed(0));
    // html += row('最低價', twn.low.toFixed(0));
    html += row('現價', twn.current.toFixed(2), 'accent');
    html += row('漲跌', twn.changeText, cls);
    html += row('更新時間', formattedTime);
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 【富台指】
  // html += groupHeader(twnDay, '', '「富台指」全名為「富時台灣指數期貨」（FTSE Taiwan Index Futures），是新加坡交易所（SGX）與富時羅素（FTSE Russell）合作推出的金融衍生工具。它以美元計價，因 MSCI 摩台指移出新加坡而誕生，成為國際投資人衡量台股表現、避險及在台股休市時預估開盤方向的核心工具。<br><br>交易時間：幾乎全天候營業');
  // if (twncon.success) {
  //   const cls = changeClass(twncon.updown, 1);
  //   const formattedTime = twncon.updateTime.replace(/\./g, '-');
  //   html += row('開盤價', twncon.open.toFixed(0));
  //   html += row('最高價', twncon.high.toFixed(0));
  //   html += row('最低價', twncon.low.toFixed(0));
  //   html += row('現價', twncon.price.toFixed(2), 'accent');
  //   html += row('漲跌', twncon.updown, cls);
  //   html += row('更新時間', formattedTime);
  // } else {
  //   html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  // }

  html += `<div class="card-title" style="margin-top: 20px; color: sandybrown;">㊣台積電㊣</div>`;

  // 【台積電期貨夜盤】
  html += groupHeader(tsmcNight, '', '台積電期貨（股票期貨）是由台灣期貨交易所推出的金融衍生品，標的為台積電（2330）股票。具備低保證金（高槓桿）、多空雙向操作、交易稅低等特性，一口標準期貨代表2張台積電股票（2,000股）。此外，還有小台積電期貨（100股）供資金較小投資人選擇，且具備夜盤交易功能，可靈活應對ADR漲跌。<br><br>交易時間：每週一至週五的下午17:25至隔日凌晨05:00。');
  if (taifexTsmc.success && taifexTsmc.price > 0) {
    const sign = taifexTsmc.updown > 0 ? '▲' : taifexTsmc.updown < 0 ? '▼' : '';
    var cls = 'up';
    if (taifexTsmc.updown > 0) cls = 'down';
    html += row('現價', taifexTsmc.price.toFixed(1), 'accent');
    html += row('漲跌', sign + Math.abs(taifexTsmc.updown).toFixed(0), cls);
  } else {
    html += `<div class="error-text">暫時無法取得資料，請於 17:25 之後再進行嘗試</div>`;
  }

  // 【台積電現貨日盤】
  html += groupHeader(spotDay, '', '台積電（TSMC）是全球最大的專業積體電路（IC）製造服務公司，總部位於臺灣新竹科學園區，1987年由張忠謀創立。台積電首創「純晶圓代工」模式，不設計自有品牌產品，專注為Apple、NVIDIA等科技大廠代工生產領先技術的晶片，在先進製程（如3奈米、2奈米）上具統治性地位，被譽為「護國神山」。');
  if (fugleQuote.success) {
    const cls = changeClass(fugleQuote.change, 1);
    const sign = fugleQuote.change > 0 ? '▲' : fugleQuote.change < 0 ? '▼' : '';
    const lowMinusOpen = (fugleQuote.lowPrice - fugleQuote.openPrice).toFixed(0);
    const lowMinusOpenCls = lowMinusOpen > 0 ? 'up' : lowMinusOpen < 0 ? 'down' : '';

    // html += row('上個收盤價', fugleQuote.previousClose.toFixed(0));
    // html += row('開盤價', fugleQuote.openPrice.toFixed(0));
    // html += row('最高價', fugleQuote.highPrice.toFixed(0));
    // html += row('最低價', fugleQuote.lowPrice.toFixed(0));
    html += row('現價', fugleQuote.closePrice.toFixed(0), 'accent');
    // html += row('均價', fugleQuote.avgPrice.toFixed(2));
    html += row('漲跌', sign + fugleQuote.change, cls);
    // html += row('低減開', lowMinusOpen, lowMinusOpenCls);

    // 委託簿
    // html += `
    //   <div class="row">
    //   <span class="row-label">委託簿</span>
    //   <span style="cursor:pointer;user-select:none;" onclick="
    //     const ob = document.getElementById('orderbook');
    //     const btn = this;
    //     if (ob.style.display === 'none') {
    //     ob.style.display = 'block';
    //     btn.textContent = '－';
    //     } else {
    //     ob.style.display = 'none';
    //     btn.textContent = '＋';
    //     }
    //   ">＋</span>
    //   </div>`;
    // html += `
    //   <div id="orderbook" style="display: none">
    //   <div style="display:grid;grid-template-columns:1fr 58px 58px 1fr;gap:2px;font-family:var(--mono);font-size:.75rem;">
    //     <span style="color:var(--dim);text-align:center;">張數</span>
    //     <span style="color:var(--up);text-align:right;padding-right:6px;">委買</span>
    //     <span style="color:var(--down);text-align:left;padding-left:6px;">委賣</span>
    //     <span style="color:var(--dim);text-align:center;">張數</span>
    //   </div>`;

    // const maxRows = Math.max(fugleQuote.bids.length, fugleQuote.asks.length);
    // for (let i = 0; i < maxRows; i++) {
    //   const bid = fugleQuote.bids[i];
    //   const ask = fugleQuote.asks[i];
    //   html += `
    //   <div style="display:grid;grid-template-columns:1fr 58px 58px 1fr;gap:2px;font-family:var(--mono);font-size:.75rem;padding:2px 0;border-bottom:1px solid var(--border);">
    //     <span style="color:var(--up);text-align:center;">${bid ? bid.size : ''}</span>
    //     <span style="color:var(--up);text-align:right;padding-right:6px;">${bid ? bid.price : ''}</span>
    //     <span style="color:var(--down);text-align:left;padding-left:6px;">${ask ? ask.price : ''}</span>
    //     <span style="color:var(--down);text-align:center;">${ask ? ask.size : ''}</span>
    //   </div>`;
    // }
    // html += `</div>`;

    // 價格門檻通知（從 localStorage 讀取，未設定則不觸發）
    // const tsmcHigh = alertGet('tsmc_high');
    // const tsmcLow  = alertGet('tsmc_low');
    // if (tsmcHigh !== null && fugleQuote.closePrice >= tsmcHigh) {
    //   sendNotification(
    //   '台積電股票警示',
    //   `價格 ${fugleQuote.closePrice.toFixed(2)} TWD，已高於設定門檻 ${tsmcHigh} TWD`,
    //   'https://tw.stock.yahoo.com/quote/2330.TW'
    //   );
    // }
    // if (tsmcLow !== null && fugleQuote.closePrice <= tsmcLow) {
    //   sendNotification(
    //   '台積電股票警示',
    //   `價格 ${fugleQuote.closePrice.toFixed(2)} TWD，已低於設定門檻 ${tsmcLow} TWD`,
    //   'https://tw.stock.yahoo.com/quote/2330.TW'
    //   );
    // }
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // // 分價量表
  // const volumeHtml = renderVolumeProfile(fugleVolume, 'tw');
  // html += volumeHtml;

  // // 歷史股價
  // html += `
  //   <div class="row">
  //   <span class="row-label">歷史股價</span>
  //   <span style="cursor:pointer;user-select:none;" onclick="
  //     const ob = document.getElementById('stockhistory');
  //     const btn = this;
  //     if (ob.style.display === 'none') {
  //     ob.style.display = 'block';
  //     btn.textContent = '－';
  //     } else {
  //     ob.style.display = 'none';
  //     btn.textContent = '＋';
  //     }
  //   ">＋</span>
  //   </div>`;
  // html += `<div id="stockhistory" style="display:none;">
  //   ${renderStockHistory(fugleHistory)}
  // </div>`;

  html += `<div class="card-title" style="margin-top: 20px;  margin-bottom: 5px; color: sandybrown;">㊣其它相關㊣</div>`;

  // 外資空單數
  html += `
  <div class="row">
    <span class="row-label">外資空單數</span>
    <span style="cursor:pointer;user-select:none;" onclick="
    const ob = document.getElementById('foreignnetposition');
    const btn = this;
    if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
    } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
    }
    ">＋</span>
  </div>`;
  html += `<div id="foreignnetposition" style="display:none;">
  ${renderForeignNetPosition(ForeignNetPosition)}
  </div>`;

  html += `<div class="row">
  ${renderChartForeignNetPosition(ForeignNetPosition)}
  </div>`;

  // 三大法人買賣超
  html += `
  <div class="row">
    <span class="row-label">三大法人買賣超</span>
    <span style="cursor:pointer;user-select:none;" onclick="
    const ob = document.getElementById('institutional');
    const btn = this;
    if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
    } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
    }
    ">＋</span>
  </div>`;
  html += `<div id="institutional" style="display:none;">
  ${renderInstitutional(Institutional)}
  </div>`;

  html += `<div class="row">
  ${renderChartInstitutional(Institutional)}
  </div>`;

  html += row('融資餘額', MarginTradingBalance.marginBalance + ' 億', 'accent');
  html += row('增減', MarginTradingBalance.marginBalance_diff, cls);
  html += row('更新時間', MarginTradingBalance.date);

  setCard('card-tw', 0, html, card_type === 'taiwan-market' ? 'card-wide' : '');

  ChartForeignNetPosition();
  ChartInstitutional();
}

function renderChartForeignNetPosition(data) {
  if (!data || !data.success || !data.data || !data.data.length) return '<p>無外資空單口數圖表資料</p>';

  const sorted = [...data.data].sort((a, b) => a.date.localeCompare(b.date));

  // 把資料暫存到 window，等 DOM 就緒後取用
  window._tw_foreignnetposition_chartPending = window._tw_foreignnetposition_chartPending || {};
  window._tw_foreignnetposition_chartPending[0] = sorted;

  // 回傳容器，圖表由 setTimeout 在 DOM 就緒後掛入
  return `<div id="tw_foreignnetposition_chart" style="height:260px;"></div>`;
}

function ChartForeignNetPosition() {
  const pending = window._tw_foreignnetposition_chartPending || {};
  const el = document.getElementById('tw_foreignnetposition_chart');
  if (!el || !pending[0]) return;
  const sorted = pending[0];

  const dates = sorted.map(d => d.date);
  const foreign = sorted.map(d => d.foreign ?? null);

  el.style.width = '100%';
  const chart = echarts.init(el, null, {
    height: 260
  });
  chart.setOption({
    backgroundColor: '#0a0e14',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e2736',
      borderColor: '#3a4a5c',
      textStyle: {
        color: '#c8d8e8',
        fontSize: 11
      },
      formatter(params) {
        const p = params[0];
        if (!p) return '';
        const col = p.value >= 0 ? '#ff4d6a' : '#00c98a';
        return `<div style="font-family:monospace;font-size:11px;line-height:1.8">
      <b style="color:#c8d8e8">${p.name}</b><br>
      外資淨部位 <span style="color:${col}">${p.value?.toLocaleString() ?? '-'}</span> 口
    </div>`;
      }
    },
    grid: {
      left: 70,
      right: 10,
      top: 16,
      bottom: 40
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: {
        lineStyle: {
          color: '#1e2736'
        }
      },
      axisLabel: {
        color: '#5a7080',
        fontSize: 10,
        rotate: 30
      },
      splitLine: {
        show: false
      },
    },
    yAxis: {
      type: 'value',
      scale: true,
      inverse: true,
      axisLine: {
        lineStyle: {
          color: '#1e2736'
        }
      },
      axisLabel: {
        color: '#5a7080',
        fontSize: 10,
        formatter: v => v.toLocaleString()
      },
      splitLine: {
        lineStyle: {
          color: '#1e2736'
        }
      },
    },
    dataZoom: [{
        type: 'inside',
        start: 0,
        end: 100
      },
      {
        type: 'slider',
        bottom: 0,
        height: 20,
        borderColor: '#3a4a5c',
        backgroundColor: '#0a0e14',
        fillerColor: '#1e273680',
        handleStyle: {
          color: '#5a9eff'
        },
        textStyle: {
          color: '#5a7080',
          fontSize: 10
        }
      },
    ],
    series: [{
      type: 'line',
      data: foreign,
      smooth: true,
      symbol: 'none',
      lineStyle: {
        color: '#5a9eff',
        width: 1.5
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
              offset: 0,
              color: '#5a9eff33'
            },
            {
              offset: 1,
              color: '#5a9eff00'
            },
          ]
        }
      },
      markLine: {
        silent: true,
        symbol: 'none',
        data: [{
          yAxis: 0,
          lineStyle: {
            color: '#5a7080',
            type: 'dashed',
            width: 1
          }
        }]
      }
    }, ],
  });

  new ResizeObserver(() => chart.resize()).observe(el);
  window._tw_foreignnetposition_chartPending = {};
}

function renderChartInstitutional(data) {
  if (!data || !data.success || !data.data || !data.data.length) return '<p>無三大法人買賣超圖表資料</p>';

  const sorted = [...data.data].sort((a, b) => a.date.localeCompare(b.date));

  // 把資料暫存到 window，等 DOM 就緒後取用
  window._tw_institutional_chartPending = window._tw_institutional_chartPending || {};
  window._tw_institutional_chartPending[0] = sorted;

  // 回傳容器，圖表由 setTimeout 在 DOM 就緒後掛入
  return `<div id="tw_institutional_chart" style="height:260px;"></div>`;
}

function ChartInstitutional() {
  const pending = window._tw_institutional_chartPending || {};
  for (const i in pending) {
    const el = document.getElementById('tw_institutional_chart');
    if (!el) continue;
    const sorted = pending[i];

    const dates = sorted.map(d => d.date);
    const trust = sorted.map(d => d.trust ?? 0);
    const dealer = sorted.map(d => d.dealer ?? 0);
    const foreign = sorted.map(d => d.foreign ?? 0);

    el.style.width = '100%';
    const chart = echarts.init(el, null, {
      height: 260
    });
    chart.setOption({
      backgroundColor: '#0a0e14',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e2736',
        borderColor: '#3a4a5c',
        textStyle: {
          color: '#c8d8e8',
          fontSize: 11
        },
      },
      legend: {
        data: ['投信', '自營商', '外資'],
        textStyle: {
          color: '#5a7080',
          fontSize: 11
        },
        top: 4,
      },
      grid: {
        left: 55,
        right: 10,
        top: 32,
        bottom: 40
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
        axisLabel: {
          color: '#5a7080',
          fontSize: 10,
          rotate: 30
        },
        splitLine: {
          show: false
        },
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
        axisLabel: {
          color: '#5a7080',
          fontSize: 10
        },
        splitLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
      },
      dataZoom: [{
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          bottom: 0,
          height: 20,
          borderColor: '#3a4a5c',
          backgroundColor: '#0a0e14',
          fillerColor: '#1e273680',
          handleStyle: {
            color: '#5a9eff'
          },
          textStyle: {
            color: '#5a7080',
            fontSize: 10
          }
        }
      ],
      series: [{
          name: '投信',
          type: 'bar',
          data: trust,
          stack: 'total',
          itemStyle: {
            color: '#5a9eff'
          }
        },
        {
          name: '自營商',
          type: 'bar',
          data: dealer,
          stack: 'total',
          itemStyle: {
            color: '#f0b429'
          }
        },
        {
          name: '外資',
          type: 'bar',
          data: foreign,
          stack: 'total',
          itemStyle: {
            color: (params) => params.value >= 0 ? '#ff4d6a' : '#00c98a'
          }
        },
      ],
    });

    new ResizeObserver(() => chart.resize()).observe(el);
  }
  window._tw_institutional_chartPending = {};
}

function renderForeignNetPosition(data) {
  if (!data || !data.success || !data.data.length) return '<p>無外資空單數資料</p>';

  const headerRow = `
  <tr>
    <th style="position:sticky;left:0;top:0;z-index:3;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);">日期</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">外資空單數</th>
  </tr>`;
  const bodyRows = data.data.map(d => `
  <tr style="border-bottom:1px solid var(--border);">
    <td style="position:sticky;left:0;z-index:1;background:#1a2332;padding:6px 10px;white-space:nowrap;text-align:center;font-size:12px;">${d.date}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.foreign ?? '-'}</td>
  </tr>`).join('');

  return `
    <div style="overflow-x:auto;overflow-y:auto;max-height:180px;">
      <table style="border-collapse:collapse;font-family:var(--mono);width:100%;">
      <thead>${headerRow}</thead>
      <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

function renderInstitutional(data) {
  if (!data || !data.success || !data.data.length) return '<p>無三大法人買賣超資料</p>';

  const headerRow = `
  <tr>
    <th style="position:sticky;left:0;top:0;z-index:3;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);">日期</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">投信</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">自營商</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">外資</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">合計</th>
  </tr>`;
  const bodyRows = data.data.map(d => `
  <tr style="border-bottom:1px solid var(--border);">
    <td style="position:sticky;left:0;z-index:1;background:#1a2332;padding:6px 10px;white-space:nowrap;text-align:center;font-size:12px;">${d.date}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.trust  ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.dealer ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.foreign ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.total ?? '-'}</td>
  </tr>`).join('');

  return `
    <div style="overflow-x:auto;overflow-y:auto;max-height:180px;">
      <table style="border-collapse:collapse;font-family:var(--mono);width:100%;">
      <thead>${headerRow}</thead>
      <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

function getMarketStatus() {
  const now = new Date();
  // 強制轉化為台北時間 (UTC+8) 以免使用者電腦時區錯誤
  const taipeiTime = new Date(now.toLocaleString("en-US", {
    timeZone: "Asia/Taipei"
  }));

  const day = taipeiTime.getDay(); // 0: 日, 1: 一, ..., 6: 六
  const hour = taipeiTime.getHours();
  const minute = taipeiTime.getMinutes();
  const currentTime = hour * 100 + minute; // 格式化為 HHMM，例如 16:12 為 1612

  // 判斷是否為夏令時間 (2026年 3/8 ~ 11/1)
  // 簡單判斷：5月絕對是夏令
  const estString = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "short"
  });
  const isSummerTime = estString.includes("EDT");

  // 設定開關盤時間 (夏令)
  const preMarketStart = 1600;
  const regularMarketStart = isSummerTime ? 2130 : 2230;
  const regularMarketEnd = 400; // 04:00 (次日)
  const futuresPauseStart = 500; // 05:00
  const futuresPauseEnd = 600; // 06:00

  // 1. 判斷【美股期貨電子盤】狀態
  // 規則：週一 06:00 到 週六 05:00，扣除每天 05:00-06:00 暫停
  let futuresStatus = "🔴";
  if (day >= 1 && day <= 5) {
    if (!(currentTime >= futuresPauseStart && currentTime < futuresPauseEnd)) {
      futuresStatus = "🟢";
    }
  } else if (day === 6 && currentTime < futuresPauseStart) {
    futuresStatus = "🟢";
  } else if (day === 0 && currentTime >= 1800) { // 部分期貨週日晚上提前開盤
    futuresStatus = "🟢";
  }

  // 2. 判斷【美股四大指數】狀態 (正式開盤)
  // 規則：週一至週五 21:30 到 次日 04:00
  let regularStatus = "🔴";
  // 如果在 21:30 之後 或 04:00 之前 (考慮跨夜)
  if (day >= 1 && day <= 5) {
    if (currentTime >= regularMarketStart || currentTime < regularMarketEnd) {
      // 注意：週五晚上的交易會跨到週六凌晨 04:00
      regularStatus = "🟢";
    }
  } else if (day === 6 && currentTime < regularMarketEnd) {
    regularStatus = "🟢";
  }

  return {
    futuresStatus,
    regularStatus
  };
}

// 美股市場概況
async function loadAmerica() {
  const [cnbcPreMarkets, /*yahooNqf, yahooIxic, yahooSox, */ yahooBtc, yahooFvx, yahooTnx, yahooTxy, /*yahooTsm, */ robinHood, fugleQuote, yahooUtcTwd] = await Promise.all([
    fetch(WORKER + '/cnbc').then(r => r.json()).catch(() => ({
      success: false
    })), // 美股盤前電子盤
    // fetch(WORKER + '/yahoo-finance/NQ=F').then(r => r.json()).catch(() => ({ success: false })), // 那斯達克 100 期貨期貨
    // fetch(WORKER + '/yahoo-finance/^IXIC').then(r => r.json()).catch(() => ({ success: false })), // 那斯達克指數
    // fetch(WORKER + '/yahoo-finance/^SOX').then(r => r.json()).catch(() => ({ success: false })), // 那斯達克指數
    fetch(WORKER + '/yahoo-finance/BTC-USD').then(r => r.json()).catch(() => ({
      success: false
    })), // 比特幣
    fetch(WORKER + '/yahoo-finance/^FVX').then(r => r.json()).catch(() => ({
      success: false
    })), // 美國5年期公債殖利率
    fetch(WORKER + '/yahoo-finance/^TNX').then(r => r.json()).catch(() => ({
      success: false
    })), // 美國10年期公債殖利率
    fetch(WORKER + '/yahoo-finance/^TYX').then(r => r.json()).catch(() => ({
      success: false
    })), // 美國30年期公債殖利率
    // fetch(WORKER + '/yahoo-finance/TSM').then(r => r.json()).catch(() => ({ success: false })), // 台積電 ADR
    fetch(WORKER + '/rh').then(r => r.json()).catch(() => ({
      success: false
    })), // Robinhood
    fetch(WORKER + '/stock/quote/2330').then(r => r.json()), // 台積電現貨日盤股價資訊
    fetch(WORKER + '/yahoo-finance/USDTWD=X').then(r => r.json()).catch(() => ({
      success: false
    })), // 美金兌換台幣匯率
  ]);

  let html = `<div class="card-title">美股市場概況</div>`;

  const status = getMarketStatus();

  // 美股期貨電子盤
  html += groupHeader(`${status.futuresStatus}【美股期貨電子盤】`, '', '美股期貨電子盤（Pre-Market Session）指在正常開盤時間（美東時間 9:30 AM）前，透過電子通訊網路（ECN）進行的股票交易時段，通常為美東時間凌晨 4:00 至 9:30，對應台灣時間晚上 16:00/17:00 後至 21:30。此時段成交量較小但波動大，適合作為盤前財報發布後的策略布局與風險控管。');
  if (cnbcPreMarkets.success) {
    html += row('道瓊期貨', formatChange(cnbcPreMarkets.fairValue.dow), changeClass(cnbcPreMarkets.fairValue.dow));
    html += row('標普500期貨', formatChange(cnbcPreMarkets.fairValue.sp), changeClass(cnbcPreMarkets.fairValue.sp));
    html += row('納斯達克100期貨', formatChange(cnbcPreMarkets.fairValue.nasdaq), changeClass(cnbcPreMarkets.fairValue.nasdaq));
    html += row('羅素2000期貨', formatChange(cnbcPreMarkets.fairValue.russell), changeClass(cnbcPreMarkets.fairValue.russell));
  }

  // 美股四大指數
  html += groupHeader(`${status.regularStatus}【美股四大指數】`, '', '美股四大指數（道瓊、標普500、納斯達克、費城半導體）是反映美國股市與經濟動能的核心指標。道瓊代表藍籌龍頭，標普500涵蓋大盤整體，納斯達克側重科技成長，費半則專注半導體產業。這些指數為投資人提供了評估市場漲跌、產業趨勢及全球資金流向的關鍵基準。');
  if (cnbcPreMarkets.success) {
    html += row('道瓊工業指數', formatChange(cnbcPreMarkets.market.dji), changeClass(cnbcPreMarkets.market.dji));
    html += row('標普500指數', formatChange(cnbcPreMarkets.market.spx), changeClass(cnbcPreMarkets.market.spx));
    html += row('納斯達克指數', formatChange(cnbcPreMarkets.market.ixic), changeClass(cnbcPreMarkets.market.ixic));
    html += row('費城半導體指數', formatChange(cnbcPreMarkets.market.sox), changeClass(cnbcPreMarkets.market.sox));
  }

  // // 那斯達克 100 期貨
  // html += groupHeader('【那斯達克 100 期貨】', '', '那斯達克 100 指數（NASDAQ-100 Index）是反映美國科技股表現的核心指標，涵蓋了100家領先的科技公司。此指數為投資人提供了評估美國科技產業健康狀況的重要參考。');
  // if (yahooNqf.success) {
  //   const changeNum = yahooNqf.close - yahooNqf.prev;
  //   const cls = changeNum < 0 ? 'down' : 'up';
  //   const changePercent = changeNum / yahooNqf.prev * 100;

  //   html += row('前次', yahooNqf.prev.toFixed(2));
  //   html += row('開盤價', yahooNqf.open.toFixed(2));
  //   html += row('最高價', yahooNqf.high.toFixed(2));
  //   html += row('最低價', yahooNqf.low.toFixed(2));
  //   html += row('漲跌', changeNum.toFixed(2), cls);
  //   html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
  //   html += row('價格', yahooNqf.close.toFixed(2), 'accent');
  //   html += row('更新時間', yahooNqf.updateTime);
  // } else {
  //   html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  // }

  // // 那斯達克指數
  // html += groupHeader('【那斯達克指數】', '', '那斯達克指數（NASDAQ Composite Index）是反映美國科技股表現的核心指標，涵蓋了納斯達克交易所上市的多種股票，代表了美國科技產業的整體表現。此指數為投資人提供了評估美國科技產業景氣與技術發展的重要參考。');
  // if (yahooIxic.success) {
  //   const changeNum = yahooIxic.close - yahooIxic.prev;
  //   const cls = changeNum < 0 ? 'down' : 'up';
  //   const changePercent = changeNum / yahooIxic.prev * 100;

  //   html += row('前次', yahooIxic.prev.toFixed(2));
  //   html += row('開盤價', yahooIxic.open.toFixed(2));
  //   html += row('最高價', yahooIxic.high.toFixed(2));
  //   html += row('最低價', yahooIxic.low.toFixed(2));
  //   html += row('漲跌', changeNum.toFixed(2), cls);
  //   html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
  //   html += row('價格', yahooIxic.close.toFixed(2), 'accent');
  //   html += row('更新時間', yahooIxic.updateTime);
  // } else {
  //   html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  // }

  // // 費城半導體指數
  // html += groupHeader('【費城半導體指數】', '', '費城半導體指數（Philadelphia Semiconductor Index，SOX）是反映美國半導體產業表現的核心指標，涵蓋了全球知名的半導體公司，包括設計、製造與封裝等各個環節。此指數為投資人提供了評估半導體產業景氣與技術發展的重要參考。');
  // if (yahooSox.success) {
  //   const changeNum = yahooSox.close - yahooSox.prev;
  //   const cls = changeNum < 0 ? 'down' : 'up';
  //   const changePercent = changeNum / yahooSox.prev * 100;

  //   html += row('前次', yahooSox.prev.toFixed(2));
  //   html += row('開盤價', yahooSox.open.toFixed(2));
  //   html += row('最高價', yahooSox.high.toFixed(2));
  //   html += row('最低價', yahooSox.low.toFixed(2));
  //   html += row('漲跌', changeNum.toFixed(2), cls);
  //   html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
  //   html += row('價格', yahooSox.close.toFixed(2), 'accent');
  //   html += row('更新時間', yahooSox.updateTime);
  // } else {
  //   html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  // }

  // 比特幣
  html += groupHeader('【比特幣】', '', '比特幣（Bitcoin, BTC）是一種去中心化的數位加密貨幣，由中本聰（Satoshi Nakamoto）於2008年提出，2009年正式問世。它基於區塊鏈技術，透過點對點（P2P）網絡運行，無需任何中央銀行或第三方機構發行與管理，具有安全、透明、總量限制（上限 2100 萬枚）等特性，通常被視為一種虛擬資產或投資工具。');
  if (yahooBtc.success) {
    const changeNum = yahooBtc.close - yahooBtc.prev;
    const cls = changeNum < 0 ? 'down' : 'up';
    const changePercent = changeNum / yahooBtc.prev * 100;

    // html += row('前次', yahooBtc.prev.toFixed(2));
    // html += row('開盤價', yahooBtc.open.toFixed(2));
    // html += row('最高價', yahooBtc.high.toFixed(2));
    // html += row('最低價', yahooBtc.low.toFixed(2));
    html += row('價格', yahooBtc.close.toFixed(2), 'accent');
    html += row('漲跌', changeNum.toFixed(2), cls);
    // html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
    html += row('更新時間', yahooBtc.updateTime);
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  html += `<div class="card-title" style="margin-top: 5%;">美國公債殖利率</div>`;

  // 美國5年期公債殖利率
  html += groupHeader('【5年期公債殖利率】', '', '美國5年期公債殖利率是反映美國5年期國債收益率的重要指標，通常被視為衡量市場利率水平和經濟前景的重要參考。');
  if (yahooFvx.success) {
    const changeNum = yahooFvx.close - yahooFvx.prev;
    const cls = changeNum < 0 ? 'down' : 'up';
    const changePercent = changeNum / yahooFvx.prev * 100;

    // html += row('前次', yahooFvx.prev.toFixed(2));
    // html += row('開盤價', yahooFvx.open.toFixed(2));
    // html += row('最高價', yahooFvx.high.toFixed(2));
    // html += row('最低價', yahooFvx.low.toFixed(2));
    html += row('利率', yahooFvx.close.toFixed(2), 'accent');

    // 警戒區間判斷
    const fvxRate = yahooFvx.close;
    if (fvxRate >= 4.55) {
      html += row('警戒水位', `紅色危險區（${fvxRate >= 5.0 ? '逼近5.0%' : '衝擊資產/引發拋售'}）`);
    } else if (fvxRate >= 4.35) {
      html += row('警戒水位', '黃色警戒（開始承壓）');
    } else {
      html += row('利率狀態', '正常', 'accent');
    }
    html += row('漲跌', changeNum.toFixed(2), cls);
    // html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
    html += row('更新時間', yahooFvx.updateTime);
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 美國10年期公債殖利率
  html += groupHeader('【10年期公債殖利率】', '', '美國10年期公債殖利率是反映美國10年期國債收益率的重要指標，通常被視為衡量市場利率水平和經濟前景的重要參考。');
  if (yahooTnx.success) {
    const changeNum = yahooTnx.close - yahooTnx.prev;
    const cls = changeNum < 0 ? 'down' : 'up';
    const changePercent = changeNum / yahooTnx.prev * 100;

    // html += row('前次', yahooTnx.prev.toFixed(2));
    // html += row('開盤價', yahooTnx.open.toFixed(2));
    // html += row('最高價', yahooTnx.high.toFixed(2));
    // html += row('最低價', yahooTnx.low.toFixed(2));
    html += row('利率', yahooTnx.close.toFixed(2), 'accent');

    // 警戒區間判斷
    const tnxRate = yahooTnx.close;
    if (tnxRate >= 4.65) {
      html += row('警戒水位', `紅色危險區（${tnxRate >= 5.0 ? '逼近5.0%' : '衝擊資產/引發拋售'}）`);
    } else if (tnxRate >= 4.50) {
      html += row('警戒水位', '黃色警戒（開始承壓）');
    } else {
      html += row('利率狀態', '正常', 'accent');
    }
    html += row('漲跌', changeNum.toFixed(2), cls);
    // html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
    html += row('更新時間', yahooTnx.updateTime);
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 美國30年期公債殖利率
  html += groupHeader('【30年期公債殖利率】', '', '美國30年期公債殖利率是反映美國30年期國債收益率的重要指標，通常被視為衡量市場利率水平和經濟前景的重要參考。');
  if (yahooTxy.success) {
    const changeNum = yahooTxy.close - yahooTxy.prev;
    const cls = changeNum < 0 ? 'down' : 'up';
    const changePercent = changeNum / yahooTxy.prev * 100;

    // html += row('前次', yahooTxy.prev.toFixed(2));
    // html += row('開盤價', yahooTxy.open.toFixed(2));
    // html += row('最高價', yahooTxy.high.toFixed(2));
    // html += row('最低價', yahooTxy.low.toFixed(2));
    html += row('利率', yahooTxy.close.toFixed(2), 'accent');

    // 警戒區間判斷
    const txyRate = yahooTxy.close;
    if (txyRate >= 5.25) {
      html += row('警戒水位', '紅色危險區（衝擊資產/引發拋售）');
    } else if (txyRate >= 5.00) {
      html += row('警戒水位', '黃色警戒（開始承壓）');
    } else {
      html += row('利率狀態', '正常', 'accent');
    }

    html += row('漲跌', changeNum.toFixed(2), cls);
    // html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
    html += row('更新時間', yahooTxy.updateTime);
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // Robinhood

  html += `<div class="card-title" style="margin-top: 5%;">重要科技股</div>`;

  // 台積電 ADR
  html += groupHeader('【台積電 ADR】', 'TSM', '台積電 ADR（American Depositary Receipts，美國存託憑證）是台積電在美國發行的股票憑證（代號：TSM），掛牌於紐約證券交易所（NYSE）。它讓美國投資人能用美元直接買賣台積電，代表國際資金對台積電的看法，且 1 單位 ADR 等於 5 股台積電台股（2330）普通股。');
  if (robinHood.TSM.success && robinHood.TSM.changeText != '') {
    html += row('前次', robinHood.TSM.previousClose, 'accent');
    html += row('今日漲跌', robinHood.TSM.changeText, changeClass(robinHood.TSM.changeText));
    if (robinHood.TSM.tertiaryText) {
      html += row('隔夜漲跌', robinHood.TSM.tertiaryText, changeClass(robinHood.TSM.tertiaryText));
    }
    html += row('更新時間', robinHood.TSM.updated_at);
    html += row('對應台股：台積電（2330）');

    if (fugleQuote.success && yahooUtcTwd.success) {
      const twdPrice = parseFloat(fugleQuote.closePrice); // 台積電現股價格
      const fx = parseFloat(yahooUtcTwd.close); // 美金兌換台幣匯率
      const adr = parseFloat(robinHood.TSM.previousClose); // 台積電ADR的收盤價格

      // 1. 先把美國的 ADR 價格，完美解構還原成「台幣計價的普通股價格」
      const adrToTwd = (adr / 5) * fx;

      // 2. 【終極 Bug 修正】溢價率 = (台幣 ADR 價 / 台灣現股價 - 1) * 100
      const premium = ((adrToTwd / twdPrice) - 1) * 100;

      let pStatus = '正常';
      let pCls = 'accent';

      // 警戒區間 If-Else
      if (premium > 25.0) {
        pStatus = '極度過熱（考慮減碼）';
        pCls = 'danger';
      } else if (premium > 15.0) {
        pStatus = '偏高（暫停追高）';
        pCls = 'warning';
      } else if (premium > 5.0) {
        pStatus = '常態穩定';
        pCls = 'accent';
      } else if (premium > -5.0) {
        pStatus = '輕微折價（可留意買點）';
        pCls = 'accent';
      } else {
        pStatus = '明顯折價（分批低接）';
        pCls = 'success';
      }

      html += row('換算台股價', adrToTwd.toFixed(2) + ' 元');
      html += row('即時溢價率', premium.toFixed(2) + '%', pCls);
      html += row('溢價警戒狀態', pStatus, pCls);
    }
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 輝達
  html += groupHeader('【輝達】', 'NVDA', '輝達（NVIDIA Corporation，代號：NVDA）是美國的一家科技公司，專注於設計和銷售圖形處理器（GPU）和人工智能計算解決方案。');
  if (robinHood.NVDA.success && robinHood.NVDA.changeText != '') {
    html += row('前次', robinHood.NVDA.previousClose, 'accent');
    html += row('今日漲跌', robinHood.NVDA.changeText, changeClass(robinHood.NVDA.changeText));
    if (robinHood.NVDA.tertiaryText) {
      html += row('隔夜漲跌', robinHood.NVDA.tertiaryText, changeClass(robinHood.NVDA.tertiaryText));
    }
    html += row('更新時間', robinHood.NVDA.updated_at);

    html += `
    <div class="row">
    <span class="row-label">對應台股如下</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('NVDA');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="NVDA" style="display:none;">`;
    html += row('台積電（2330）：獨家先進製程（3奈米/4奈米）代工、CoWoS 先進封裝獨家供應');
    html += row('鴻海（2317）：Blackwell 伺服器整機與 NVL72 機櫃全球最大代工、主要水冷板供應商');
    html += row('廣達（2382）：旗下雲達科技（QCT）為全球 AI 伺服器整機設計與系統整合大廠');
    html += row('台達電（2308）：高階 AI 伺服器電源龍頭、800V 次世代高壓直流電（HVDC）獨家壟斷商');
    html += row('奇鋐（3017）：3D Vapor Chamber（均熱片）與 Blackwell 水冷機櫃散熱系統核心供應商');
    html += row('雙鴻（3324）：高階伺服器水冷板、CDU（冷卻分配總成）與快接頭等全套液冷系統大廠');
    html += `</div>`;
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 蘋果
  html += groupHeader('【蘋果】', 'AAPL', '蘋果（Apple Inc.，代號：AAPL）是美國的一家科技公司，專注於設計、開發和銷售消費電子產品、計算機軟件和線上服務。');
  if (robinHood.AAPL.success && robinHood.AAPL.changeText != '') {
    html += row('前次', robinHood.AAPL.previousClose, 'accent');
    html += row('今日漲跌', robinHood.AAPL.changeText, changeClass(robinHood.AAPL.changeText));
    if (robinHood.AAPL.tertiaryText) {
      html += row('隔夜漲跌', robinHood.AAPL.tertiaryText, changeClass(robinHood.AAPL.tertiaryText));
    }
    html += row('更新時間', robinHood.AAPL.updated_at);
    html += `
    <div class="row">
    <span class="row-label">對應台股如下</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('AAPL');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="AAPL" style="display:none;">`;
    html += row('台積電（2330）：iPhone、Mac 全系列 A 與 M 系列處理器全球獨家晶圓代工');
    html += row('大立光（3008）：高階 iPhone 後置潛望式長焦鏡頭、主鏡頭核心光學設計與製造商');
    html += row('玉晶光（3406）：iPhone 前置鏡頭、超廣角鏡頭與 Vision Pro 光學模組主要供應商');
    html += row('鴻海（2317）：高階 iPhone（Pro / Pro Max 系列）全球第一大終極組裝代工廠');
    html += row('華通（2313）：iPhone 主機板高階 HDI（高密度互連板）與軟硬結合板核心一線供應商');
    html += row('新日興（3376）：MacBook 與 iPad 全系列精密金屬軸承（Hinge）及中高階機殼機構件');
    html += `</div>`;
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 微軟
  html += groupHeader('【微軟】', 'MSFT', '微軟（Microsoft Corporation，代號：MSFT）是美國的一家科技公司，專注於設計、開發和銷售電腦軟件、計算機硬體和線上服務。');
  if (robinHood.MSFT.success && robinHood.MSFT.changeText != '') {
    html += row('前次', robinHood.MSFT.previousClose, 'accent');
    html += row('今日漲跌', robinHood.MSFT.changeText, changeClass(robinHood.MSFT.changeText));
    if (robinHood.MSFT.tertiaryText) {
      html += row('隔夜漲跌', robinHood.MSFT.tertiaryText, changeClass(robinHood.MSFT.tertiaryText));
    }
    html += row('更新時間', robinHood.MSFT.updated_at);
    html += `
    <div class="row">
    <span class="row-label">對應台股如下</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('MSFT');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="MSFT" style="display:none;">`;
    html += row('緯穎（6669）：微軟自研雲端與 AI 伺服器最大白牌（ODM Direct）系統整合與製造廠');
    html += row('廣達（2382）：微軟 Azure 資料中心通用伺服器與高階 AI 伺服器核心組裝夥伴');
    html += row('鴻海（2317）：供應微軟全球資料中心之高階網通設備、基板（HGX）與關鍵零組件');
    html += row('信驊（5274）：伺服器遠端管理晶片（BMC）全球壟斷龍頭，微軟機房必備控管晶片');
    html += row('智邦（2345）：供應微軟超級資料中心專用之 400G / 800G 白牌高階網路交換器');
    html += `</div>`;
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 谷哥
  html += groupHeader('【谷歌】', 'GOOGL', '谷歌（Google LLC，代號：GOOGL）是美國的一家科技公司，專注於設計、開發和銷售網路搜尋引擎、線上廣告平台、雲端計算服務和消費電子產品。');
  if (robinHood.GOOGL.success && robinHood.GOOGL.changeText != '') {
    html += row('前次', robinHood.GOOGL.previousClose, 'accent');
    html += row('今日漲跌', robinHood.GOOGL.changeText, changeClass(robinHood.GOOGL.changeText));
    if (robinHood.GOOGL.tertiaryText) {
      html += row('隔夜漲跌', robinHood.GOOGL.tertiaryText, changeClass(robinHood.GOOGL.tertiaryText));
    }
    html += row('更新時間', robinHood.GOOGL.updated_at);
    html += `
    <div class="row">
    <span class="row-label">對應台股如下</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('GOOGL');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="GOOGL" style="display:none;">`;
    html += row('世芯-KY（3661）：Google 自研 AI 晶片（TPU v5/v6系列）次世代架構 ASIC 核心後端設計服務');
    html += row('廣達（2382）：Google 全球 TPU 自研 AI 伺服器整機與機櫃最大獨家系統整合廠');
    html += row('台達電（2308）：Google 北美大型 AI 資料中心之高效能電源供應系統及客製化電力基建');
    html += row('健策（3653）：Google 自研 TPU 處理器專用高階 ILM（精密均熱片/扣件）獨家供應商');
    html += row('鴻海（2317）：Google 雲端運算機房之標準伺服器、高速連接器及網通系統代工');
    html += row('聯發科（2454）：與 Google 合作開發次世代邊緣 AI、平板、智慧物聯網晶片架構設計');
    html += `</div>`;
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 亞馬遜
  html += groupHeader('【亞馬遜】', 'AMZN', '亞馬遜（Amazon.com, Inc.，代號：AMZN）是美國的一家科技公司，專注於設計、開發和銷售線上零售、雲端計算服務和數位媒體內容。');
  if (robinHood.AMZN.success && robinHood.AMZN.changeText != '') {
    html += row('前次', robinHood.AMZN.previousClose, 'accent');
    html += row('今日漲跌', robinHood.AMZN.changeText, changeClass(robinHood.AMZN.changeText));
    if (robinHood.AMZN.tertiaryText) {
      html += row('隔夜漲跌', robinHood.AMZN.tertiaryText, changeClass(robinHood.AMZN.tertiaryText));
    }
    html += row('更新時間', robinHood.AMZN.updated_at);
    html += `
    <div class="row">
    <span class="row-label">對應台股如下</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('AMZN');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="AMZN" style="display:none;">`;
    html += row('世芯-KY（3661）：亞馬遜 AWS 自研 AI 晶片（Trainium 系列）獨家 ASIC 設計，大客戶亞馬遜更直接參與其私募股權');
    html += row('緯穎（6669）：近年新斬獲的亞馬遜 AWS 雲端資料中心伺服器第二主力 ODM 代工廠');
    html += row('鴻海（2317）：亞馬遜北美與歐洲資料中心之大規模高階網通機櫃、儲存設備組裝');
    html += row('川湖（2059）：亞馬遜高階伺服器與 AI 重量級機櫃專用「高承重精密導軌」獨家大廠');
    html += row('金像電（2368）：亞馬遜高速雲端伺服器主機板專用「高層數超低損耗 PCB 硬板」一線大廠');
    html += `</div>`;
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // META
  html += groupHeader('【META】', 'META', 'META（Meta Platforms, Inc.，代號：META）是美國的一家科技公司，專注於設計、開發和銷售社交媒體平台、虛擬實境設備和人工智能技術。');
  if (robinHood.META.success && robinHood.META.changeText != '') {
    html += row('前次', robinHood.META.previousClose, 'accent');
    html += row('今日漲跌', robinHood.META.changeText, changeClass(robinHood.META.changeText));
    if (robinHood.META.tertiaryText) {
      html += row('隔夜漲跌', robinHood.META.tertiaryText, changeClass(robinHood.META.tertiaryText));
    }
    html += row('更新時間', robinHood.META.updated_at);
    html += `
    <div class="row">
    <span class="row-label">對應台股如下</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('META');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="META" style="display:none;">`;
    html += row('廣達（2382）：Meta 超級資料中心（Open Compute Project）最主要的 AI 伺服器與硬體設備架構商');
    html += row('緯穎（6669）：Meta 通用雲端硬體與儲存伺服器之長期核心 ODM 生態系合作夥伴');
    html += row('智邦（2345）：Meta 資料中心「開放式網通架構」下，800G 交換器最主要的白牌製造商');
    html += row('欣興（3037）：Meta 自研晶片及 AI 伺服器高階網通晶片專用之 ABF 載板核心供應商');
    html += row('南電（8046）：提供 Meta 高效能運算（HPC）基礎設施所需的次世代中高階處理器 ABF 載板');
    html += `</div>`;
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 特斯拉
  html += groupHeader('【特斯拉】', 'TSLA', '特斯拉（Tesla, Inc.，代號：TSLA）是美國的一家科技公司，專注於設計、開發和銷售電動汽車、能源存儲解決方案和太陽能發電產品。');
  if (robinHood.TSLA.success && robinHood.TSLA.changeText != '') {
    html += row('前次', robinHood.TSLA.previousClose, 'accent');
    html += row('今日漲跌', robinHood.TSLA.changeText, changeClass(robinHood.TSLA.changeText));
    if (robinHood.TSLA.tertiaryText) {
      html += row('隔夜漲跌', robinHood.TSLA.tertiaryText, changeClass(robinHood.TSLA.tertiaryText));
    }
    html += row('更新時間', robinHood.TSLA.updated_at);
    html += `
    <div class="row">
    <span class="row-label">對應台股如下</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('TSLA');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="TSLA" style="display:none;">`;
    html += row('貿聯-KY（3665）：特斯拉超級工廠（Gigafactory）全車系「高壓電池管理、動力傳輸線束」獨家/首選大廠');
    html += row('台達電（2308）：特斯拉電動車之馬達驅動器、車載充電器（OBC）及全球超級充電樁電力模組');
    html += row('華孚（6235）：特斯拉全車系車載大螢幕機構件、安全部件專用「輕量化鎂鋁合金壓鑄件」');
    html += row('定穎投控（3715）：特斯拉自動駕駛（FSD）核心電腦與車身控制模組專用之「高階高密度車用 PCB 板」');
    html += row('和碩（4938）：特斯拉北美超級電腦與特定車款之車載中央控制電腦（ECU）核心組裝代工廠');
    html += `</div>`;
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 博通
  html += groupHeader('【博通】', 'AVGO', '博通（Broadcom Inc.，代號：AVGO）是美國的一家科技公司，專注於設計、開發和銷售網路和通信解決方案。');
  if (robinHood.AVGO.success && robinHood.AVGO.changeText != '') {
    html += row('前次', robinHood.AVGO.previousClose, 'accent');
    html += row('今日漲跌', robinHood.AVGO.changeText, changeClass(robinHood.AVGO.changeText));
    if (robinHood.AVGO.tertiaryText) {
      html += row('隔夜漲跌', robinHood.AVGO.tertiaryText, changeClass(robinHood.AVGO.tertiaryText));
    }
    html += row('更新時間', robinHood.AVGO.updated_at);
    html += `
    <div class="row">
    <span class="row-label">對應台股如下</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('AVGO');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="AVGO" style="display:none;">`;
    html += row('台積電（2330）：博通全球最核心的高階 5奈米/3奈米 網通交換器與客製化 ASIC 晶片獨家代工廠');
    html += row('智邦（2345）：與博通深度綁定，全面採用博通 Tomahawk 晶片設計自製高階白牌網路交換器');
    html += row('日月光投控（3711）：博通高階網通晶片、AI 加速器專用之先進系統級封裝（SiP）與 2.5D 封裝大廠');
    html += row('京元電子（2449）：博通全球高階網通、無線通訊晶片在出廠前最主要的高頻晶圓測試與成品測試基地');
    html += row('聯發科（2454）：在 Wi-Fi 7 核心技術與物聯網通訊標準上，與博通在全球市場同為領頭羊兼技術競爭/合作對象');
    html += `</div>`;
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 美超微
  html += groupHeader('【美超微】', 'SMCI', '美超微（Super Micro Computer, Inc.，代號：SMCI）是美國的一家科技公司，專注於設計、開發和銷售伺服器、儲存和網路解決方案。');
  if (robinHood.SMCI.success && robinHood.SMCI.changeText != '') {
    html += row('前次', robinHood.SMCI.previousClose, 'accent');
    html += row('今日漲跌', robinHood.SMCI.changeText, changeClass(robinHood.SMCI.changeText));
    if (robinHood.SMCI.tertiaryText) {
      html += row('隔夜漲跌', robinHood.SMCI.tertiaryText, changeClass(robinHood.SMCI.tertiaryText));
    }
    html += row('更新時間', robinHood.SMCI.updated_at);
    html += `
    <div class="row">
    <span class="row-label">對應台股如下</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('SMCI');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="SMCI" style="display:none;">`;
    html += row('雙鴻（3324）：美超微液冷機櫃（Liquid Cooling）標準配備中，冷卻板模組與部分 CDU 系統的首選核心盟友');
    html += row('奇鋐（3017）：供應美超微美、歐、亞各廠區伺服器所需的散熱風扇模組與高階風冷散熱片');
    html += row('華泰（2329）：美超微最長期的台灣代工夥伴，獨家承接其伺服器主機板 SMT 表面黏著與後段組裝');
    html += row('台光電（2383）：美超微高階 AI 伺服器主機板專用之「超高頻、超低損耗 CCL（銅箔基板）」');
    html += row('台達電（2308）：美超微高功率 AI 伺服器（特別是搭配鈦金級/鉑金級效率）之高階鈦金級電源供應器');
    html += row('迎廣（6117）：美超微高階高密度 AI 伺服器專用「高階金屬機殼與滑軌機構件」重要本土配合廠');
    html += `</div>`;
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 艾斯摩爾
  html += groupHeader('【艾斯摩爾】', 'ASML', '艾斯摩爾（ASML Holding N.V.，代號：ASML）是荷蘭的一家科技公司，專注於設計、開發和銷售光刻設備，是全球半導體製造業的重要供應商。');
  if (robinHood.ASML.success && robinHood.ASML.changeText != '') {
    html += row('前次', robinHood.ASML.previousClose, 'accent');
    html += row('今日漲跌', robinHood.ASML.changeText, changeClass(robinHood.ASML.changeText));
    if (robinHood.ASML.tertiaryText) {
      html += row('隔夜漲跌', robinHood.ASML.tertiaryText, changeClass(robinHood.ASML.tertiaryText));
    }
    html += row('更新時間', robinHood.ASML.updated_at);
    html += `
    <div class="row">
    <span class="row-label">對應台股如下</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('ASML');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="ASML" style="display:none;">`;
    html += row('台積電（2330）：ASML 全球最尖端設備（High-NA EUV 極紫外光光刻機）的最大採購客戶與技術推進夥伴');
    html += row('家登（3680）：通過 ASML 全球唯一/少數認證，生產先進製程專用之「EUV POD（極紫外光光罩傳送盒）」');
    html += row('帆宣（6196）：長期承接 ASML 精密精密黃光設備之「精密機台關鍵模組代工組裝」與廠務系統');
    html += row('弘塑（3131）：ASML 高階檢測設備與台積電先進封裝（CoWoS）濕製程酸洗設備核心供應商');
    html += row('公準（3178）：ASML 精密光刻機台內高難度「高精密真空精密微結構金屬精密零組件」認證合格製造商');
    html += `</div>`;
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // SpaceX
  html += groupHeader('【SpaceX】', 'SPCX', 'SpaceX（Space Exploration Technologies Corp.，代號：SPCX）是美國的一家航天公司，專注於設計、開發和銷售運載火箭和太空飛行器。');
  if (robinHood.SPCX.success && robinHood.SPCX.changeText != '') {
    html += row('前次', robinHood.SPCX.previousClose, 'accent');
    html += row('今日漲跌', robinHood.SPCX.changeText, changeClass(robinHood.SPCX.changeText));
    if (robinHood.SPCX.tertiaryText) {
      html += row('隔夜漲跌', robinHood.SPCX.tertiaryText, changeClass(robinHood.SPCX.tertiaryText));
    }
    html += row('更新時間', robinHood.SPCX.updated_at);
    html += `
    <div class="row">
    <span class="row-label">對應台股如下</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('SPCX');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="SPCX" style="display:none;">`;
    html += row('華通（2313）：SpaceX Starlink（星鏈計畫）低軌衛星本體、地面接收站專用「Anylayer 高階衛星 PCB 板」全球龍頭');
    html += row('昇達科（3491）：SpaceX 衛星本體與地面站專用之「高頻微波/毫米波通訊天線元器件」獨家/一線大廠');
    html += row('啟碁（6285）：SpaceX 使用者端（User Terminal）室內高階 Wi-Fi 路由器與地面通訊網路設備代工廠');
    html += row('同欣電（6271）：負責 SpaceX 低軌衛星通訊模組之「高階高頻陶瓷基板 RF 封裝與檢測服務」');
    html += row('事欣科（4916）：提供 SpaceX 運載火箭與太空艙之「國防航太等級高耐規 EMS 封裝與線束組裝」');
    html += `</div>`;
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 超微
  html += groupHeader('【超微】', 'AMD', '超微（Advanced Micro Devices, Inc.，代號：AMD）是美國的一家科技公司，專注於設計、開發和銷售微處理器（CPU）、圖形處理器（GPU）和個人電腦、伺服器晶片組。');
  if (robinHood.AMD.success && robinHood.AMD.changeText != '') {
    html += row('前次', robinHood.AMD.previousClose, 'accent');
    html += row('今日漲跌', robinHood.AMD.changeText, changeClass(robinHood.AMD.changeText));
    if (robinHood.AMD.tertiaryText) {
      html += row('隔夜漲跌', robinHood.AMD.tertiaryText, changeClass(robinHood.AMD.tertiaryText));
    }
    html += row('更新時間', robinHood.AMD.updated_at);
    html += `
    <div class="row">
    <span class="row-label">對應台股如下</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('AMD');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="AMD" style="display:none;">`;
    html += row('台積電（2330）：超微全系列 Zen 架構 CPU、Radeon GPU 及 MI 系列 AI 晶片之先進製程（3奈米/4奈米/5奈米）獨家晶圓代工與 CoWoS 先進封裝');
    html += row('健策（3653）：超微伺服器處理器（EPYC 系列）與 AI 晶片專用「高階 CPU 均熱片（Heat Spreader）」全球最大核心獨家供應商，純度極高');
    html += row('穎崴（6515）：超微高階晶片出廠前「晶圓測試、Final Test（成品測試）」專用之高頻高速測試座（Test Socket）核心大廠');
    html += row('廣達（2382）：超微 MI300X 及次世代 AI 伺服器整機與機櫃之主要 ODM 設計整合與代工廠');
    html += row('鴻海（2317）：超微 AI 伺服器基板（Substrate）與高效能運算機房之標準網通機櫃代工');
    html += row('祥碩（5269）：超微桌上型與筆記型電腦主機板晶片組（Chipset）之獨家/核心高速傳輸介面授權與設計夥伴');
    html += row('欣興（3037）：超微大型資料中心晶片與 AI 晶片封裝專用「超高層數 ABF 載板」核心一線供應商');
    html += `</div>`;
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  setCard('card-america', 0, html);
}

function getAsiaMarketEmoji() {
  const now = new Date();
  // 轉成台北時間
  const tpe = new Date(now.toLocaleString('en-US', {
    timeZone: 'Asia/Taipei'
  }));
  const h = tpe.getHours();
  const m = tpe.getMinutes();
  const hm = h * 100 + m; // 例如 09:37 → 937
  const day = tpe.getDay(); // 0=週日, 1=週一, ..., 6=週六
  const isWeekday = day >= 1 && day <= 5;

  const isJapanDaySession = isWeekday && hm >= 800 && hm <= 1430; // 08:00 ~ 14:00
  const isKoreaDaySession = isWeekday && hm >= 800 && hm <= 1430; // 08:00 ~ 14:30

  return {
    isJapanDaySession,
    isKoreaDaySession
  };
}

// 亞洲市場概況
async function loadAsia() {
  // 1. 抓取日經 225 指數（第一支 API 直接衝，不延遲）
  const yahooJapan = await fetch(WORKER + '/yahoo-finance/%5EN225')
    .then(r => r.json())
    .catch(() => ({
      success: false
    }));

  // 2. 延遲 200 毫秒，錯開對同一網域的連續請求
  await sleep(400);

  // 3. 抓取 韓國綜合指數
  const yahooKorea = await fetch(WORKER + '/yahoo-finance/%5EKS11')
    .then(r => r.json())
    .catch(() => ({
      success: false
    }));

  const status = getAsiaMarketEmoji();

  // 各種時間區段標籤
  const JapanfuturesDay = `${status.isJapanDaySession ? '🟢' : '🔴'} `;
  const KoreafuturesDay = `${status.isKoreaDaySession ? '🟢' : '🔴'} `;

  let html = `<div class="card-title">亞洲市場概況</div>`;

  // 【日經225指數】
  html += groupHeader(JapanfuturesDay + '【日經225指數】', '', '日經225指數（Nikkei 225）是日本最具代表性的股票市場指數，由東京證券交易所上市的225家大型企業股票構成，用以反映日本股市的整体表現。<br><br>交易時間：每週一至週五的上午08:00至下午14:30，其中中午10:30至11:30休市。');
  if (yahooJapan.success) {
    const changeNum = yahooJapan.close - yahooJapan.prev;
    const cls = changeClass(changeNum, 1);
    const changePercent = changeNum / yahooJapan.prev * 100;

    // html += row('前次', yahooJapan.prev.toFixed(2));
    // html += row('開盤價', yahooJapan.open.toFixed(2));
    // html += row('最高價', yahooJapan.high.toFixed(2));
    // html += row('最低價', yahooJapan.low.toFixed(2));
    html += row('價格', yahooJapan.close.toFixed(2), 'accent');
    html += row('漲跌', changeNum.toFixed(2), cls);
    // html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
    html += row('更新時間', yahooJapan.updateTime);
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 【韓國綜合指數】
  html += groupHeader(KoreafuturesDay + '【韓國綜合指數】', '', '韓國綜合指數（KOSPI, Korea Composite Stock Price Index）是韓國最具代表性的股票市場指數，由韓國交易所上市的所有普通股構成，用以反映韓國股市的整体表現。<br><br>交易時間：每週一至週五的上午08:00至下午14:30。');
  if (yahooKorea.success) {
    const changeNum = yahooKorea.close - yahooKorea.prev;
    const cls = changeClass(changeNum, 1);
    const changePercent = changeNum / yahooKorea.prev * 100;

    // html += row('前次', yahooKorea.prev.toFixed(2));
    // html += row('開盤價', yahooKorea.open.toFixed(2));
    // html += row('最高價', yahooKorea.high.toFixed(2));
    // html += row('最低價', yahooKorea.low.toFixed(2));
    html += row('價格', yahooKorea.close.toFixed(2), 'accent');
    html += row('漲跌', changeNum.toFixed(2), cls);
    // html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
    html += row('更新時間', yahooKorea.updateTime);
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  setCard('card-asia', 0, html);
}

// 原物料市場
async function loadMaterials() {
  const [sinaBrent, sinaGold, sinaSilver, sinaCopper] = await Promise.all([
    fetch(WORKER + '/sina/hf_OIL').then(r => r.json()).catch(() => ({
      success: false
    })), // 布蘭特原油
    fetch(WORKER + '/sina/hf_GC').then(r => r.json()).catch(() => ({
      success: false
    })), // 黃金
    fetch(WORKER + '/sina/hf_SI').then(r => r.json()).catch(() => ({
      success: false
    })), // 白銀
    fetch(WORKER + '/sina/hf_CAD').then(r => r.json()).catch(() => ({
      success: false
    })), // 銅
  ]);

  let html = `<div class="card-title">原物料市場</div>`;

  // 【布蘭特原油】
  html += groupHeader('【布蘭特原油】', 'brent', '布蘭特原油（Brent Crude）是產自歐洲北海的輕質低硫原油，為全球最重要的國際原油定價基準之一，通常用於衡量歐洲、非洲與中東地區輸往西方的石油價格。其特色為含硫量低、品質適中，適合提煉汽油、柴油與航空煤油，全球約有三分之二的實體原油貿易以此為參考基準。');
  if (sinaBrent.success) {
    const changeNum = sinaBrent.price - sinaBrent.prev;
    const cls = changeNum < 0 ? 'down' : 'up';
    const changePercent = changeNum / sinaBrent.prev * 100;

    html += row('前次', sinaBrent.prev.toFixed(2));
    html += row('開盤價', sinaBrent.open.toFixed(2));
    html += row('最高價', sinaBrent.high.toFixed(2));
    html += row('最低價', sinaBrent.low.toFixed(2));
    html += row('價格', sinaBrent.price.toFixed(2), 'accent');
    html += row('漲跌', changeNum.toFixed(2), cls);
    // html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
    html += row('情緒評級', sinaBrent.rating);
    html += row('更新時間', sinaBrent.time);

    // 價格門檻通知（從 localStorage 讀取，未設定則不觸發）
    const brentHigh = alertGet('brent_high');
    const brentLow = alertGet('brent_low');
    if (brentHigh !== null && sinaBrent.price >= brentHigh) {
      sendNotification(
        '布蘭特原油價格警示',
        `價格 ${sinaBrent.price.toFixed(2)} USD，已高於設定門檻 ${brentHigh} USD`,
        'https://hk.investing.com/commodities/brent-oil'
      );
    }
    if (brentLow !== null && sinaBrent.price <= brentLow) {
      sendNotification(
        '布蘭特原油價格警示',
        `價格 ${sinaBrent.price.toFixed(2)} USD，已低於設定門檻 ${brentLow} USD`,
        'https://hk.investing.com/commodities/brent-oil'
      );
    }
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 【黃金】
  html += groupHeader('【黃金】', 'gold', '黃金是指全球範圍內進行黃金實物買賣、衍生品交易的場所與管道總稱，主要包含倫敦（場外交易 OTC）、紐約（期貨交易所）等實體與虛擬市場。它是金融體系的重要組成，具備避險與投資價值，交易形式包含現貨黃金、金條、金幣、黃金ETF及期貨合約等。');
  if (sinaGold.success) {
    const changeNum = sinaGold.price - sinaGold.prev;
    const cls = changeNum < 0 ? 'down' : 'up';
    const changePercent = changeNum / sinaGold.prev * 100;
    // html += row('前次', sinaGold.prev.toFixed(2));
    // html += row('開盤價', sinaGold.open.toFixed(2));
    // html += row('最高價', sinaGold.high.toFixed(2));
    // html += row('最低價', sinaGold.low.toFixed(2));
    html += row('價格', sinaGold.price.toFixed(2), 'accent');
    html += row('漲跌', changeNum.toFixed(2), cls);
    // html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
    html += row('更新時間', sinaGold.time);

    // 價格門檻通知（從 localStorage 讀取，未設定則不觸發）
    const goldHigh = alertGet('gold_high');
    const goldLow = alertGet('gold_low');
    if (goldHigh !== null && sinaGold.price >= goldHigh) {
      sendNotification(
        '黃金價格警示',
        `價格 ${sinaGold.price.toFixed(2)} USD，已高於設定門檻 ${goldHigh} USD`,
        'https://hk.investing.com/commodities/gold'
      );
    }
    if (goldLow !== null && sinaGold.price <= goldLow) {
      sendNotification(
        '黃金價格警示',
        `價格 ${sinaGold.price.toFixed(2)} USD，已低於設定門檻 ${goldLow} USD`,
        'https://hk.investing.com/commodities/gold'
      );
    }
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 【白銀】
  html += groupHeader('【白銀】', 'silver', '白銀是一個全球性的貴金屬交易網絡，主要買賣具有投資和工業雙重屬性的實體白銀。市場核心在於倫敦現貨市場與美國 COMEX 期貨市場，具高波動性，價格受工業需求（如光伏、電子）與金融投資需求（避險、抗通膨）共同驅動，常以美元計價。');
  if (sinaSilver.success) {
    const changeNum = sinaSilver.price - sinaSilver.prev;
    const cls = changeNum < 0 ? 'down' : 'up';
    const changePercent = changeNum / sinaSilver.prev * 100;
    // html += row('前次', sinaSilver.prev.toFixed(2));
    // html += row('開盤價', sinaSilver.open.toFixed(2));
    // html += row('最高價', sinaSilver.high.toFixed(2));
    // html += row('最低價', sinaSilver.low.toFixed(2));
    html += row('價格', sinaSilver.price.toFixed(2), 'accent');
    html += row('漲跌', changeNum.toFixed(2), cls);
    // html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
    html += row('更新時間', sinaSilver.time);

    // 價格門檻通知（從 localStorage 讀取，未設定則不觸發）
    const silverHigh = alertGet('silver_high');
    const silverLow = alertGet('silver_low');
    if (silverHigh !== null && sinaSilver.price >= silverHigh) {
      sendNotification(
        '白銀價格警示',
        `價格 ${sinaSilver.price.toFixed(2)} USD，已高於設定門檻 ${silverHigh} USD`,
        'https://hk.investing.com/commodities/silver'
      );
    }
    if (silverLow !== null && sinaSilver.price <= silverLow) {
      sendNotification(
        '白銀價格警示',
        `價格 ${sinaSilver.price.toFixed(2)} USD，已低於設定門檻 ${silverLow} USD`,
        'https://hk.investing.com/commodities/silver'
      );
    }
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 【銅】
  html += groupHeader('【銅】', 'copper', '銅是一種重要的工業金屬，廣泛應用於電力、建築和製造業。其價格受全球經濟活動、供需關係和地緣政治因素影響，常以美元計價。');
  if (sinaCopper.success) {
    const changeNum = sinaCopper.price - sinaCopper.prev;
    const cls = changeNum < 0 ? 'down' : 'up';
    const changePercent = changeNum / sinaCopper.prev * 100;
    // html += row('前次', sinaCopper.prev.toFixed(2));
    // html += row('開盤價', sinaCopper.open.toFixed(2));
    // html += row('最高價', sinaCopper.high.toFixed(2));
    // html += row('最低價', sinaCopper.low.toFixed(2));
    html += row('價格', sinaCopper.price.toFixed(2), 'accent');
    html += row('漲跌', changeNum.toFixed(2), cls);
    // html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
    html += row('更新時間', sinaCopper.time);

    // 價格門檻通知（從 localStorage 讀取，未設定則不觸發）
    const copperHigh = alertGet('copper_high');
    const copperLow = alertGet('copper_low');
    if (copperHigh !== null && sinaCopper.price >= copperHigh) {
      sendNotification(
        '銅價格警示',
        `價格 ${sinaCopper.price.toFixed(2)} USD，已高於設定門檻 ${copperHigh} USD`,
        'https://hk.investing.com/commodities/copper'
      );
    }
    if (copperLow !== null && sinaCopper.price <= copperLow) {
      sendNotification(
        '銅價格警示',
        `價格 ${sinaCopper.price.toFixed(2)} USD，已低於設定門檻 ${copperLow} USD`,
        'https://hk.investing.com/commodities/copper'
      );
    }
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  setCard('card-materials', 0, html);
}
// async function loadMaterials() {
//   const [yahooBrent, yahooGold, yahooSilver] = await Promise.all([
//   fetch(WORKER + '/yahoo-finance/BZ=F').then(r => r.json()).catch(() => ({ success: false })), // 布蘭特原油
//   fetch(WORKER + '/yahoo-finance/GC=F').then(r => r.json()).catch(() => ({ success: false })), // 黃金
//   fetch(WORKER + '/yahoo-finance/SI=F').then(r => r.json()).catch(() => ({ success: false })), // 白銀
//   ]);

//   let html = `<div class="card-title">原物料市場</div>`;

//   // 【布蘭特原油】
//   html += groupHeader('【布蘭特原油】', 'brent', '布蘭特原油（Brent Crude）是產自歐洲北海的輕質低硫原油，為全球最重要的國際原油定價基準之一，通常用於衡量歐洲、非洲與中東地區輸往西方的石油價格。其特色為含硫量低、品質適中，適合提煉汽油、柴油與航空煤油，全球約有三分之二的實體原油貿易以此為參考基準。');
//   if (yahooBrent.success) {
//   const changeNum = yahooBrent.close - yahooBrent.prev;
//   const cls = changeNum < 0 ? 'down' : 'up';
//   const changePercent = changeNum / yahooBrent.prev * 100;

//   html += row('前次', yahooBrent.prev.toFixed(2));
//   html += row('開盤價', yahooBrent.open.toFixed(2));
//   html += row('最高價', yahooBrent.high.toFixed(2));
//   html += row('最低價', yahooBrent.low.toFixed(2));
//   html += row('漲跌', changeNum.toFixed(2), cls);
//   html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
//   html += row('價格', yahooBrent.close.toFixed(2), 'accent');
//   html += row('更新時間', yahooBrent.updateTime);

//   // 價格門檻通知（從 localStorage 讀取，未設定則不觸發）
//   const brentHigh = alertGet('brent_high');
//   const brentLow  = alertGet('brent_low');
//   if (brentHigh !== null && sinaBrent.price >= brentHigh) {
//     sendNotification(
//     '布蘭特原油價格警示',
//     `價格 ${sinaBrent.price.toFixed(2)} USD，已高於設定門檻 ${brentHigh} USD`,
//     'https://hk.investing.com/commodities/brent-oil'
//     );
//   }
//   if (brentLow !== null && sinaBrent.price <= brentLow) {
//     sendNotification(
//     '布蘭特原油價格警示',
//     `價格 ${sinaBrent.price.toFixed(2)} USD，已低於設定門檻 ${brentLow} USD`,
//     'https://hk.investing.com/commodities/brent-oil'
//     );
//   }
//   } else {
//   html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
//   }

//   // 【黃金】
//   html += groupHeader('【黃金】', 'gold', '黃金是指全球範圍內進行黃金實物買賣、衍生品交易的場所與管道總稱，主要包含倫敦（場外交易 OTC）、紐約（期貨交易所）等實體與虛擬市場。它是金融體系的重要組成，具備避險與投資價值，交易形式包含現貨黃金、金條、金幣、黃金ETF及期貨合約等。');
//   if (yahooGold.success) {
//   const changeNum = yahooGold.close - yahooGold.prev;
//   const cls = changeNum < 0 ? 'down' : 'up';
//   const changePercent = changeNum / yahooGold.prev * 100;

//   html += row('前次', yahooGold.prev.toFixed(2));
//   html += row('開盤價', yahooGold.open.toFixed(2));
//   html += row('最高價', yahooGold.high.toFixed(2));
//   html += row('最低價', yahooGold.low.toFixed(2));
//   html += row('漲跌', changeNum.toFixed(2), cls);
//   html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
//   html += row('價格', yahooGold.close.toFixed(2), 'accent');
//   html += row('更新時間', yahooGold.updateTime);

//   // 價格門檻通知（從 localStorage 讀取，未設定則不觸發）
//   const goldHigh = alertGet('gold_high');
//   const goldLow  = alertGet('gold_low');
//   if (goldHigh !== null && sinaGold.price >= goldHigh) {
//     sendNotification(
//     '黃金價格警示',
//     `價格 ${sinaGold.price.toFixed(2)} USD，已高於設定門檻 ${goldHigh} USD`,
//     'https://hk.investing.com/commodities/gold'
//     );
//   }
//   if (goldLow !== null && sinaGold.price <= goldLow) {
//     sendNotification(
//     '黃金價格警示',
//     `價格 ${sinaGold.price.toFixed(2)} USD，已低於設定門檻 ${goldLow} USD`,
//     'https://hk.investing.com/commodities/gold'
//     );
//   }
//   } else {
//   html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
//   }

//   // 【白銀】
//   html += groupHeader('【白銀】', 'silver', '白銀是一個全球性的貴金屬交易網絡，主要買賣具有投資和工業雙重屬性的實體白銀。市場核心在於倫敦現貨市場與美國 COMEX 期貨市場，具高波動性，價格受工業需求（如光伏、電子）與金融投資需求（避險、抗通膨）共同驅動，常以美元計價。');
//   if (yahooSilver.success) {
//   const changeNum = yahooSilver.close - yahooSilver.prev;
//   const cls = changeNum < 0 ? 'down' : 'up';
//   const changePercent = changeNum / yahooSilver.prev * 100;

//   html += row('前次', yahooSilver.prev.toFixed(2));
//   html += row('開盤價', yahooSilver.open.toFixed(2));
//   html += row('最高價', yahooSilver.high.toFixed(2));
//   html += row('最低價', yahooSilver.low.toFixed(2));
//   html += row('漲跌', changeNum.toFixed(2), cls);
//   html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
//   html += row('價格', yahooSilver.close.toFixed(2), 'accent');
//   html += row('更新時間', yahooSilver.updateTime);

//   // 價格門檻通知（從 localStorage 讀取，未設定則不觸發）
//   const silverHigh = alertGet('silver_high');
//   const silverLow  = alertGet('silver_low');
//   if (silverHigh !== null && sinaSilver.price >= silverHigh) {
//     sendNotification(
//     '白銀價格警示',
//     `價格 ${sinaSilver.price.toFixed(2)} USD，已高於設定門檻 ${silverHigh} USD`,
//     'https://hk.investing.com/commodities/silver'
//     );
//   }
//   if (silverLow !== null && sinaSilver.price <= silverLow) {
//     sendNotification(
//     '白銀價格警示',
//     `價格 ${sinaSilver.price.toFixed(2)} USD，已低於設定門檻 ${silverLow} USD`,
//     'https://hk.investing.com/commodities/silver'
//     );
//   }
//   } else {
//   html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
//   }

//   setCard('card-materials', 0, html);
// }

// 市場情緒
async function loadSentiment() {
  const [ /*sinaVix, */ sinaVixFutures, fearGreed, sinaUsdollar, yahooUtcTwd, yahooUtcJpy, fedwatch] = await Promise.all([
    // fetch(WORKER + '/sina/znb_VIX').then(r => r.json()).catch(() => ({ success: false })), // VIX 恐慌指數
    fetch(WORKER + '/sina/hf_VX').then(r => r.json()).catch(() => ({
      success: false
    })), // VIX 恐慌指數期貨
    fetch(WORKER + '/fear-greed').then(r => r.json()).catch(() => ({
      success: false
    })), // CNN Fear & Greed Index
    fetch(WORKER + '/sina/DINIW').then(r => r.json()).catch(() => ({
      success: false
    })), // 美元指數
    fetch(WORKER + '/yahoo-finance/USDTWD=X').then(r => r.json()).catch(() => ({
      success: false
    })), // 美金兌換台幣匯率
    fetch(WORKER + '/yahoo-finance/USDJPY=X').then(r => r.json()).catch(() => ({
      success: false
    })), // 美金兌換日幣匯率
    fetch(WORKER + '/fedwatch').then(r => r.json()).catch(() => ({
      success: false
    })), // 聯準會利率
  ]);

  let html = `<div class="card-title">市場情緒</div>`;

  // 【VIX 恐慌指數】
  /*html += groupHeader('【VIX 恐慌指數】', 'vix', 'VIX 恐慌指數（全稱：CBOE Volatility Index，簡稱 VIX）是衡量標準普爾 500 指數（S&P 500）期權隱含波動率的指標，反映市場對未來 30 天美股波動幅度的預期。數值越高代表投資者越恐慌、預期波動越大；通常在股市急跌或市場震盪時飆升。');
  if (sinaVix.success) {
    const changeNum = sinaVix.price - sinaVix.prev;
    const cls = changeNum < 0 ? 'down' : 'up';
    const changePercent = changeNum / sinaVix.prev * 100;

    // html += row('前次', sinaVix.prev.toFixed(2));
    // html += row('開盤價', sinaVix.open.toFixed(2));
    // html += row('最高價', sinaVix.high.toFixed(2));
    // html += row('最低價', sinaVix.low.toFixed(2));
    html += row('數值', sinaVix.price.toFixed(2), 'accent');
    html += row('漲跌', changeNum.toFixed(2), cls);
    // html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
    html += row('情緒評級', sinaVix.rating);
    html += row('更新時間', sinaVix.time);

    // 價格門檻通知（從 localStorage 讀取，未設定則不觸發）
    const vixHigh = alertGet('vix_high');
    const vixLow  = alertGet('vix_low');
    if (vixHigh !== null && sinaVix.price >= vixHigh) {
    sendNotification(
      'VIX 恐慌指數警示',
      `數值 ${sinaVix.price.toFixed(2)}，已高於設定門檻 ${vixHigh}`,
      'https://hk.investing.com/indices/volatility-s-p-500'
    );
    }
    if (vixLow !== null && sinaVix.price <= vixLow) {
    sendNotification(
      'VIX 恐慌指數警示',
      `數值 ${sinaVix.price.toFixed(2)}，已低於設定門檻 ${vixLow}`,
      'https://hk.investing.com/indices/volatility-s-p-500'
    );
    }
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }*/

  // 【VIX 恐慌指數期貨】
  html += groupHeader('【VIX 恐慌指數期貨】', 'vix_futures', 'VIX 恐慌指數期貨是基於 VIX 指數的衍生品，反映市場對未來 30 天美股波動幅度的預期。數值越高代表投資者越恐慌、預期波動越大；通常在股市急跌或市場震盪時飆升。');
  if (sinaVixFutures.success) {
    const changeNum = sinaVixFutures.price - sinaVixFutures.prev;
    const cls = changeNum < 0 ? 'down' : 'up';
    const changePercent = changeNum / sinaVixFutures.prev * 100;

    html += row('前次', sinaVixFutures.prev.toFixed(2));
    // html += row('開盤價', sinaVixFutures.open.toFixed(2));
    // html += row('最高價', sinaVixFutures.high.toFixed(2));
    // html += row('最低價', sinaVixFutures.low.toFixed(2));
    html += row('數值', sinaVixFutures.price.toFixed(2), 'accent');
    html += row('漲跌', changeNum.toFixed(2), cls);
    // html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
    html += row('情緒評級', sinaVixFutures.rating);
    html += row('更新時間', sinaVixFutures.time);

    // 價格門檻通知（從 localStorage 讀取，未設定則不觸發）
    const vixFuturesHigh = alertGet('vix_futures_high');
    const vixFuturesLow = alertGet('vix_futures_low');
    if (vixFuturesHigh !== null && sinaVixFutures.price >= vixFuturesHigh) {
      sendNotification(
        'VIX 恐慌指數期貨警示',
        `數值 ${sinaVixFutures.price.toFixed(2)}，已高於設定門檻 ${vixFuturesHigh}`,
        'https://hk.investing.com/indices/volatility-s-p-500'
      );
    }
    if (vixFuturesLow !== null && sinaVixFutures.price <= vixFuturesLow) {
      sendNotification(
        'VIX 恐慌指數期貨警示',
        `數值 ${sinaVixFutures.price.toFixed(2)}，已低於設定門檻 ${vixLow}`,
        'https://hk.investing.com/indices/volatility-s-p-500'
      );
    }
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 【CNN Fear & Greed Index】
  html += groupHeader('【CNN Fear & Greed Index】', '', 'CNN Fear & Greed Index 是由 CNN Business 編製的綜合市場情緒指數，數值介於 0–100，整合了七項子指標：股價動能、漲跌強弱、漲跌廣度、Put/Call 比率、垃圾債券需求、市場波動率（VIX）及避險資產需求。數值越低代表市場越恐慌，越高則越貪婪。與 VIX 單一衡量波動率不同，此指數反映的是市場整體情緒的多面向變化。');
  if (fearGreed.success) {
    const scoreColor = fearGreed.score >= 50 ? 'up' : 'down';
    const trendIcon = (curr, prev) => curr > prev ? '▲' : curr < prev ? '▼' : '－';

    html += row('前次收盤', `${fearGreed.prevClose.toFixed(1)} ${trendIcon(fearGreed.score, fearGreed.prevClose)}`);
    html += row('一週前', `${fearGreed.prev1Week.toFixed(1)} ${trendIcon(fearGreed.score, fearGreed.prev1Week)}`);
    html += row('一個月前', `${fearGreed.prev1Month.toFixed(1)} ${trendIcon(fearGreed.score, fearGreed.prev1Month)}`);
    html += row('一年前', `${fearGreed.prev1Year.toFixed(1)} ${trendIcon(fearGreed.score, fearGreed.prev1Year)}`);
    html += row('當前指數', fearGreed.score.toFixed(1), scoreColor);
    html += row('情緒評級', fearGreed.ratingZh, scoreColor);
    html += row('更新時間', fearGreed.updateTime);
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 【美元指數】
  html += groupHeader('【美元指數】', 'usdollar', '美元指數（DXY）是顯示美元相對於主要貨幣強弱的指數。當美元指數 > 100 且持續走強，意味著外資（特別是美資）正在全球進行「獲利了結、班師回朝」。');
  if (sinaUsdollar.success) {
    const changeNum = sinaUsdollar.price - sinaUsdollar.prev;
    const cls = changeNum < 0 ? 'down' : 'up';
    const changePercent = changeNum / sinaUsdollar.prev * 100;

    html += row('前次', sinaUsdollar.prev.toFixed(2));
    html += row('開盤價', sinaUsdollar.open.toFixed(2));
    html += row('最高價', sinaUsdollar.high.toFixed(2));
    html += row('最低價', sinaUsdollar.low.toFixed(2));
    html += row('漲跌', changeNum.toFixed(2), cls);
    // html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
    html += row('數值', sinaUsdollar.price.toFixed(2), 'accent');
    html += row('更新時間', sinaUsdollar.time);

    // 價格門檻通知（從 localStorage 讀取，未設定則不觸發）
    const usdollarHigh = alertGet('usdollar_high');
    const usdollarLow = alertGet('usdollar_low');
    if (usdollarHigh !== null && sinaUsdollar.price >= usdollarHigh) {
      sendNotification(
        '美元指數警示',
        `數值 ${sinaUsdollar.price.toFixed(2)}，已高於設定門檻 ${usdollarHigh}`,
        'https://hk.investing.com/indices/usdollar'
      );
    }
    if (usdollarLow !== null && sinaUsdollar.price <= usdollarLow) {
      sendNotification(
        '美元指數警示',
        `數值 ${sinaUsdollar.price.toFixed(2)}，已低於設定門檻 ${usdollarLow}`,
        'https://hk.investing.com/indices/usdollar'
      );
    }
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 【美金兌換台幣匯率】
  html += groupHeader('【美金兌換台幣匯率】', 'utctwd', '美金兌換台幣匯率（USDTWD）是反映美元與台灣新台幣之間兌換關係的指標。');
  if (yahooUtcTwd.success) {
    const changeNum = yahooUtcTwd.close - yahooUtcTwd.prev;
    const cls = changeClass(changeNum, 1);
    const changePercent = changeNum / yahooUtcTwd.prev * 100;

    html += row('前次', yahooUtcTwd.prev.toFixed(2));
    html += row('開盤價', yahooUtcTwd.open.toFixed(2));
    html += row('最高價', yahooUtcTwd.high.toFixed(2));
    html += row('最低價', yahooUtcTwd.low.toFixed(2));
    html += row('價格', yahooUtcTwd.close.toFixed(2), 'accent');
    html += row('漲跌', changeNum.toFixed(2), cls);
    // html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
    html += row('更新時間', yahooUtcTwd.updateTime);

    // 價格門檻通知（從 localStorage 讀取，未設定則不觸發）
    const usdtwdHigh = alertGet('utctwd_high');
    const usdtwdLow = alertGet('utctwd_low');
    if (usdtwdHigh !== null && yahooUtcTwd.close >= usdtwdHigh) {
      sendNotification(
        '美金兌換台幣匯率警示',
        `數值 ${yahooUtcTwd.close.toFixed(2)}，已高於設定門檻 ${usdtwdHigh}`,
        'https://hk.investing.com/indices/usdollar'
      );
    }
    if (usdtwdLow !== null && yahooUtcTwd.close <= usdtwdLow) {
      sendNotification(
        '美金兌換台幣匯率警示',
        `數值 ${yahooUtcTwd.close.toFixed(2)}，已低於設定門檻 ${usdtwdLow}`,
        'https://hk.investing.com/indices/usdollar'
      );
    }
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 【美金兌換日幣匯率】
  html += groupHeader('【美金兌換日幣匯率】', 'utcjpy', '美金兌換日幣匯率（USDJPY）是反映美元與日本円之間兌換關係的指標。');
  if (yahooUtcJpy.success) {
    const changeNum = yahooUtcJpy.close - yahooUtcJpy.prev;
    const cls = changeClass(changeNum, 1);
    const changePercent = changeNum / yahooUtcJpy.prev * 100;

    html += row('前次', yahooUtcJpy.prev.toFixed(2));
    html += row('開盤價', yahooUtcJpy.open.toFixed(2));
    html += row('最高價', yahooUtcJpy.high.toFixed(2));
    html += row('最低價', yahooUtcJpy.low.toFixed(2));
    html += row('價格', yahooUtcJpy.close.toFixed(2), 'accent');
    html += row('漲跌', changeNum.toFixed(2), cls);
    // html += row('漲跌幅', changePercent.toFixed(2) + '%', cls);
    html += row('更新時間', yahooUtcJpy.updateTime);

    // 價格門檻通知（從 localStorage 讀取，未設定則不觸發）
    const utcjpyHigh = alertGet('utcjpy_high');
    const utcjpyLow = alertGet('utcjpy_low');
    if (utcjpyHigh !== null && yahooUtcJpy.close >= utcjpyHigh) {
      sendNotification(
        '美金兌換日幣匯率警示',
        `數值 ${yahooUtcJpy.close.toFixed(2)}，已高於設定門檻 ${utcjpyHigh}`,
        'https://hk.investing.com/indices/usdollar'
      );
    }
    if (utcjpyLow !== null && yahooUtcJpy.close <= utcjpyLow) {
      sendNotification(
        '美金兌換日幣匯率警示',
        `數值 ${yahooUtcJpy.close.toFixed(2)}，已低於設定門檻 ${utcjpyLow}`,
        'https://hk.investing.com/indices/usdollar'
      );
    }
  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  // 【聯準會利率】
  html += groupHeader('【聯準會利率】', '', '聯準會利率（Fed Funds Rate）由美國聯邦公開市場委員會（FOMC）決議，是美國貨幣政策的核心工具，直接影響借貸成本、匯率走勢與全球資金流向。此處顯示 CME FedWatch 對本次 FOMC 會議各目標利率區間的市場預期概率。');
  if (fedwatch.success) {
    html += row('下次會議', fedwatch.meetingTimeTW || fedwatch.meetingTimeET);

    fedwatch.rates.forEach(r => {
      const curr = r.currentProb;
      const isDominant = curr !== null && fedwatch.rates.every(x => (x.currentProb ?? 0) <= curr);
      const fmtProb = (v) => v !== null ? v.toFixed(1) + '%' : '—';

      html += groupHeader(`目標利率：${r.targetRate}%（${r.action}）`);
      html += row('目前概率', fmtProb(curr), isDominant ? 'accent' : '');
      html += row('前日概率', fmtProb(r.prevDayProb));
      html += row('前週概率', fmtProb(r.prevWeekProb));
    });

    html += `<div class="row">${renderChartFedWatch(fedwatch)}</div>`;

  } else {
    html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
  }

  setCard('card-sentiment', 0, html);

  ChartFedWatch();
}

function renderChartFedWatch(data) {
  if (!data || !data.success || !data.rates || !data.rates.length) return '';

  // window._fedwatch_chartPending = data;

  // 過濾掉 0 的資料，避免圖表顯示過多無意義的項目
  window._fedwatch_chartPending = {
    ...data,
    rates: data.rates.filter(r => r.currentProb !== null && r.currentProb !== 0),
  };

  return `<div id="fedwatch_chart" style="height:260px;"></div>`;
}

function ChartFedWatch() {
  const data = window._fedwatch_chartPending;
  const el = document.getElementById('fedwatch_chart');
  if (!el || !data) return;

  // 只取 currentProb 有值的項目
  // const validRates = data.rates.filter(r => r.currentProb !== null);
  const validRates = data.rates;

  // 圓餅圖資料：label 顯示 targetRate + action
  const pieData = validRates.map(r => {
    const label = r.action ?
      `${r.targetRate}（${r.action}）` :
      r.targetRate;
    return {
      name: label,
      value: r.currentProb
    };
  });

  // 主色系：維持利率用綠，降息用藍，升息用紅
  const colorMap = (action) => {
    if (!action || action === '維持利率') return '#00c98a';
    if (action.startsWith('降息')) return '#5a9eff';
    if (action.startsWith('升息')) return '#ff4d6a';
    return '#c8d8e8';
  };
  const colors = validRates.map(r => colorMap(r.action));

  const meetingDate = data.meetingTimeTW ?
    data.meetingTimeTW.split(' ')[0] :
    data.meetingTimeET;

  el.style.width = '100%';
  const chart = echarts.init(el, null, {
    height: 260
  });
  chart.setOption({
    backgroundColor: '#0a0e14',
    title: {
      text: `聯準會利率期貨隱含機率 - ${meetingDate}`,
      left: 'center',
      top: 8,
      textStyle: {
        color: '#c8d8e8',
        fontSize: 12,
        fontWeight: 'normal'
      },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e2736',
      borderColor: '#3a4a5c',
      textStyle: {
        color: '#c8d8e8',
        fontSize: 11
      },
      formatter: params =>
        `<div style="font-family:monospace;font-size:11px;line-height:1.8">
      <b style="color:#c8d8e8">${params.name}</b><br>
      目前概率 <span style="color:${params.color}">${params.value.toFixed(1)}%</span>
    </div>`,
    },
    legend: {
      orient: 'vertical',
      bottom: 0,
      left: 'left'
    },
    /*legend: {
      top: '5%',
      left: 'center'
    },*/
    series: [{
      type: 'pie',
      radius: '50%',
      data: pieData,
      label: {
        color: '#c8d8e8',
        fontSize: 10,
        // formatter: params => `${params.name}\n${params.value.toFixed(1)}%`,
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  });

  new ResizeObserver(() => chart.resize()).observe(el);
}

// Tickers 快取
let _tickersCache = null;

async function loadTickers() {
  if (_tickersCache) return _tickersCache;
  try {
    const res = await fetch('https://bau720123.github.io/stock/data/tickers.json?v=20260701');
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      // 缺少 name 的資料，預設使用 symbol 值補齊
      _tickersCache = json.data.map(t => ({
        ...t,
        name: t.name || t.symbol
      }));
    } else {
      _tickersCache = [];
    }
  } catch (e) {
    _tickersCache = [];
  }
  return _tickersCache;
}

// 我的自選股
let _mystockApiCache = null; // 快取 API 結果，供 resize 時重繪使用

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 新增一個依序抓取並帶延遲的 Helper
async function fetchMetricsSequentially(urlSegment, delayMs = 200) {
  const results = [];
  for (const stock of MY_STOCKS) {
    // 只有在抓第二檔（含）以上時才需要 delay
    if (results.length > 0) {
      await sleep(delayMs);
    }

    const res = await fetch(`${WORKER}/stock/${urlSegment}/${stock.symbol}`)
      .then(r => r.json())
      .catch(() => ({
        success: false
      }));

    results.push(res);
  }
  return results;
}

async function loadMyStock() {
  await loadTickers(); // 預先載入 tickers，供 openMyStockSettings autocomplete 使用

  // 平行抓取所有自選股票的相關屬性資訊
  const [quoteResults, volumeResults, historyResults, institutionalResults, margintradingbalanceResults, smaResults, rsiResults, kdjResults, macdResults, brandsResults] =
  /*await Promise.all([
     Promise.all(
     MY_STOCKS.map(s => fetch(WORKER + '/stock/quote/' + s.symbol).then(r => r.json()).catch(() => ({ success: false })))
     ),
     Promise.all(
     MY_STOCKS.map(s => fetch(WORKER + '/stock/volume/' + s.symbol).then(r => r.json()).catch(() => ({ success: false })))
     ),
     Promise.all(
     MY_STOCKS.map(s => fetch(WORKER + '/stock/history/' + s.symbol).then(r => r.json()).catch(() => ({ success: false })))
     ),
     Promise.all(
     MY_STOCKS.map(s => fetch(WORKER + '/stock/institutional/' + s.symbol).then(r => r.json()).catch(() => ({ success: false })))
     ),
     Promise.all(
     MY_STOCKS.map(s => fetch(WORKER + '/stock/sma/' + s.symbol).then(r => r.json()).catch(() => ({ success: false })))
     ),
     Promise.all(
     MY_STOCKS.map(s => fetch(WORKER + '/stock/rsi/' + s.symbol).then(r => r.json()).catch(() => ({ success: false })))
     ),
     Promise.all(
     MY_STOCKS.map(s => fetch(WORKER + '/stock/kdj/' + s.symbol).then(r => r.json()).catch(() => ({ success: false })))
     ),
     Promise.all(
     MY_STOCKS.map(s => fetch(WORKER + '/stock/macd/' + s.symbol).then(r => r.json()).catch(() => ({ success: false })))
     ),
     Promise.all(
     MY_STOCKS.map(s => fetch(WORKER + '/stock/brands/' + s.symbol).then(r => r.json()).catch(() => ({ success: false })))
     )
   ]);*/
  await Promise.all([
    fetchMetricsSequentially('quote', 400),
    fetchMetricsSequentially('volume', 400),
    fetchMetricsSequentially('history', 400),
    fetchMetricsSequentially('institutional', 400),
    fetchMetricsSequentially('margintradingbalance', 400),
    fetchMetricsSequentially('sma', 400),
    fetchMetricsSequentially('rsi', 400),
    fetchMetricsSequentially('kdj', 400),
    fetchMetricsSequentially('macd', 400),
    fetchMetricsSequentially('brands', 400)
  ]);

  // 存入快取
  _mystockApiCache = {
    quoteResults,
    volumeResults,
    historyResults,
    institutionalResults,
    margintradingbalanceResults,
    smaResults,
    rsiResults,
    kdjResults,
    macdResults,
    brandsResults
  };

  _renderMyStock(_mystockApiCache);
}

function _renderMyStock({
  quoteResults,
  volumeResults,
  historyResults,
  institutionalResults,
  margintradingbalanceResults,
  smaResults,
  rsiResults,
  kdjResults,
  macdResults,
  brandsResults
}) {
  // 銷毀頁面上所有殘留的 ECharts 實例，避免 canvas 尺寸錯誤
  // 排除台股市場概況的圖表（tw_foreignnetposition_chart、tw_institutional_chart）
  document.querySelectorAll('[_echarts_instance_]:not(#tw_foreignnetposition_chart):not(#tw_institutional_chart):not(#fedwatch_chart)').forEach(el => {
    echarts.getInstanceByDom(el)?.dispose();
  });

  let html = `<div class="card-title" style="margin-bottom: 0px;">
  <span class="card-title-text">我的自選股</span>
  <button class="alert-settings-btn" title="管理股票清單" onclick="openMyStockSettings()">
    ⚙️
  </button>
  </div>`;

  // 導覽列（按鈕 + dots）
  const dotsHtml = MY_STOCKS.map((s, i) =>
    `<span class="mystock-dot ${i === 0 ? 'active' : ''}" onclick="gotoMyStockSlide(${i})" title="${s.name}"></span>`
  ).join('');

  html += `
  <div class="mystock-nav">
  <button class="mystock-nav-btn" id="mystock-prev" onclick="stepMyStockSlide(-1)" ${MY_STOCKS.length <= 1 ? 'style="visibility:hidden"' : ''}>◀ 上一檔</button>
  <div class="mystock-dots" id="mystock-dots">${dotsHtml}</div>
  <button class="mystock-nav-btn" id="mystock-next" onclick="stepMyStockSlide(1)" ${MY_STOCKS.length <= 1 ? 'style="visibility:hidden"' : ''}>下一檔 ▶</button>
  </div>`;

  html += `<div style="position:relative;">
  <div class="mystock-slider-wrapper">
    <div class="mystock-slider-track" id="mystock-track">`;

  const {
    isDaySession
  } = getMarketEmoji();

  for (let i = 0; i < MY_STOCKS.length; i++) {
    html += `<div class="stock-slide">`;
    const stock = MY_STOCKS[i];
    const data = quoteResults[i];
    const settingsKey = `mystock_${stock.symbol}`;

    html += groupHeader(`【${data.name || stock.name}】`, settingsKey, ``);

    if (data.success) {
      const cls = changeClass(data.change, 1);
      const sign = data.change > 0 ? '▲' : data.change < 0 ? '▼' : '';
      const lowMinusOpen = (data.lowPrice - data.openPrice).toFixed(0);
      const lowMinusOpenCls = lowMinusOpen > 0 ? 'up' : lowMinusOpen < 0 ? 'down' : '';
      const closePrice = data.closePrice.toFixed(0);

      html += row('上個收盤價', data.previousClose.toFixed(0));
      html += row('開盤價', data.openPrice.toFixed(0));
      html += row('最高價', data.highPrice.toFixed(0));
      html += row('最低價', data.lowPrice.toFixed(0));
      html += row('現價', closePrice, 'accent');
      html += row('均價', data.avgPrice.toFixed(2));
      html += row('漲跌', sign + data.change, cls);
      html += row('低減開', lowMinusOpen, lowMinusOpenCls);

      // 委託簿
      html += `
    <div class="row">
      <span class="row-label">委託簿</span>
      <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('orderbook_${i}');
      const btn = this;
      if (ob.style.display === 'none') {
        ob.style.display = 'block';
        btn.textContent = '－';
      } else {
        ob.style.display = 'none';
        btn.textContent = '＋';
      }
      ">＋</span>
    </div>`;
      html += `
    <div id="orderbook_${i}" style="display: none">
      <div style="display:grid;grid-template-columns:1fr 58px 58px 1fr;gap:2px;font-family:var(--mono);font-size:.75rem;">
      <span style="color:var(--dim);text-align:center;">張數</span>
      <span style="color:var(--up);text-align:right;padding-right:6px;">委買</span>
      <span style="color:var(--down);text-align:left;padding-left:6px;">委賣</span>
      <span style="color:var(--dim);text-align:center;">張數</span>
      </div>`;

      const maxRows = Math.max(data.bids.length, data.asks.length);
      for (let j = 0; j < maxRows; j++) {
        const bid = data.bids[j];
        const ask = data.asks[j];
        html += `
      <div style="display:grid;grid-template-columns:1fr 58px 58px 1fr;gap:2px;font-family:var(--mono);font-size:.75rem;padding:2px 0;border-bottom:1px solid var(--border);">
      <span style="color:var(--up);text-align:center;">${bid ? bid.size : ''}</span>
      <span style="color:var(--up);text-align:right;padding-right:6px;">${bid ? bid.price : ''}</span>
      <span style="color:var(--down);text-align:left;padding-left:6px;">${ask ? ask.price : ''}</span>
      <span style="color:var(--down);text-align:center;">${ask ? ask.size : ''}</span>
      </div>`;
      }
      html += `</div>`;

      // 價格門檻通知（從 localStorage 讀取）
      if (isDaySession) {
        const stockHigh = alertGet(`mystock_${stock.symbol}_high`);
        const stockLow = alertGet(`mystock_${stock.symbol}_low`);

        // if (stockHigh !== null && closePrice >= stockHigh) {
        //   sendNotification(
        //   `${data.name} 股票警示`,
        //   `價格 ${closePrice} TWD，已高於設定門檻 ${stockHigh} TWD`,
        //   `https://tw.stock.yahoo.com/quote/${stock.symbol}.TW`
        //   );
        // }
        // if (stockLow !== null && closePrice <= stockLow) {
        //   sendNotification(
        //   `${data.name} 股票警示`,
        //   `價格 ${closePrice} TWD，已低於設定門檻 ${stockLow} TWD`,
        //   `https://tw.stock.yahoo.com/quote/${stock.symbol}.TW`
        //   );
        // }

        // 讀取委買的價格與張數設定
        const stockBidsPrice = alertGet(`mystock_${stock.symbol}_bids_price`);
        const stockBidsQty = alertGet(`mystock_${stock.symbol}_bids_qty`);
        const now_stockBidsPrice = data.bids[0].price;
        const now_stockBidsQty = data.bids[0].size;

        if (stockBidsPrice == now_stockBidsPrice && now_stockBidsQty <= stockBidsQty) {
          sendNotification(
            `${data.name} 股票警示`,
            `委買價格 ${now_stockBidsPrice} TWD，已等於設定門檻 ${stockBidsPrice} TWD\n委買張數 ${now_stockBidsQty} 張，已小於等於設定門檻 ${stockBidsQty} 張`,
            `https://tw.stock.yahoo.com/quote/${stock.symbol}.TW`,
            `down_alert`
          );
        }

        // 讀取委賣的價格與張數設定
        const stockAsksPrice = alertGet(`mystock_${stock.symbol}_asks_price`);
        const stockAsksQty = alertGet(`mystock_${stock.symbol}_asks_qty`);
        const now_stockAsksPrice = data.asks[0].price;
        const now_stockAsksQty = data.asks[0].size;

        if (stockAsksPrice == now_stockAsksPrice && now_stockAsksQty <= stockAsksQty) {
          sendNotification(
            `${data.name} 股票警示`,
            `委賣價格 ${now_stockAsksPrice} TWD，已等於設定門檻 ${stockAsksPrice} TWD\n委賣張數 ${now_stockAsksQty} 張，已小於等於設定門檻 ${stockAsksQty} 張`,
            `https://tw.stock.yahoo.com/quote/${stock.symbol}.TW`,
            `up_alert`
          );
        }
      }
    } else {
      html += `<div class="error-text">暫時無法取得資料，請稍後再試</div>`;
    }

    // 分價量表
    html += renderVolumeProfile(volumeResults[i], stock.symbol);

    // 歷史股價
    html += `
    <div class="row">
    <span class="row-label">歷史股價</span>
    <div style="display: flex; gap: 8px; align-items: center;">
      <a style="cursor:pointer; user-select:none; text-decoration:none;" onclick="showInfo('${historyResults[0].result.story}')">❔</a>
      <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('stockhistory_${i}');
      const btn = this;
      if (ob.style.display === 'none') {
        ob.style.display = 'block';
        btn.textContent = '－';
      } else {
        ob.style.display = 'none';
        btn.textContent = '＋';
      }
      ">＋</span>
    </div>
    </div>`;
    html += `<div id="stockhistory_${i}" style="display:none;" class="donotswipe">
    ${renderStockHistory(historyResults[i])}
  </div>`;

    html += `<div class="row donotswipe">
    ${renderStockChartHistory(historyResults[i], i)}
  </div>`;

    // 三大法人買賣超
    html += `
    <div class="row">
    <span class="row-label">三大法人買賣超</span>
    <div style="display: flex; gap: 8px; align-items: center;">
      <a style="cursor:pointer; user-select:none; text-decoration:none;" onclick="showInfo('${institutionalResults?.[i]?.result?.story ?? '無三大法人買賣超資料'}')">❔</a>
      <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('stockinstitutional_${i}');
      const btn = this;
      if (ob.style.display === 'none') {
        ob.style.display = 'block';
        btn.textContent = '－';
      } else {
        ob.style.display = 'none';
        btn.textContent = '＋';
      }
      ">＋</span>
    </div>
    </div>`;
    html += `<div id="stockinstitutional_${i}" style="display:none;" class="donotswipe">
    ${renderStockInstitutional(institutionalResults[i])}
  </div>`;

    html += `<div class="row donotswipe">
    ${renderStockChartInstitutional(institutionalResults[i], i)}
  </div>`;

    // 融資餘額增減
    html += `
    <div class="row">
    <span class="row-label">融資餘額增減</span>
    <div style="display: flex; gap: 8px; align-items: center;">
      <a style="cursor:pointer; user-select:none; text-decoration:none;" onclick="showInfo('${margintradingbalanceResults?.[i]?.result?.story ?? '無融資餘額增減資料'}')">❔</a>
      <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('stockmargintradingbalance_${i}');
      const btn = this;
      if (ob.style.display === 'none') {
        ob.style.display = 'block';
        btn.textContent = '－';
      } else {
        ob.style.display = 'none';
        btn.textContent = '＋';
      }
      ">＋</span>
    </div>
    </div>`;
    html += `<div id="stockmargintradingbalance_${i}" style="display:none;" class="donotswipe">
    ${renderStockMarginTradingBalance(margintradingbalanceResults[i])}
  </div>`;

    html += `<div class="row donotswipe">
    ${renderStockChartMarginTradingBalance(margintradingbalanceResults[i], i)}
  </div>`;


    // 主力籌碼集中度
    html += `
    <div class="row">
    <span class="row-label">主力籌碼集中度</span>
    <div style="display: flex; gap: 8px; align-items: center;">
      <a style="cursor:pointer; user-select:none; text-decoration:none;" onclick="gotoHistock('large', '${stock.symbol}')">📈</a>
    </div>
    </div>`;

    // 券商分點買賣
    html += `
    <div class="row">
    <span class="row-label">券商分點買賣</span>
    <div style="display: flex; gap: 8px; align-items: center;">
      <a style="cursor:pointer; user-select:none; text-decoration:none;" onclick="gotoHistock('branch', '${stock.symbol}')">📈</a>
    </div>
    </div>`;

    // 集保戶股權分散表
    html += `
    <div class="row">
    <span class="row-label">集保戶股權分散表</span>
    <div style="display: flex; gap: 8px; align-items: center;">
      <a style="cursor:pointer; user-select:none; text-decoration:none;" onclick="gotoHistock('equity', '${stock.symbol}')">📈</a>
    </div>
    </div>`;

    // 簡單移動平均線
    html += `
    <div class="row">
    <span class="row-label">簡單移動平均線<br>比較股價是否站上均線</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('stocksma_${i}');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="stocksma_${i}" style="display:none;" class="donotswipe">
    ${renderStockSma(smaResults[i])}
  </div>`;

    html += `<div class="row donotswipe">
    ${renderStockChartSma(smaResults[i], i)}
  </div>`;

    // 相對強弱指數
    html += `
    <div class="row">
    <span class="row-label">相對強弱指數<br>大於70可能超買，小於30可能超賣</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('stockrsi_${i}');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="stockrsi_${i}" style="display:none;" class="donotswipe">
    ${renderStockRsi(rsiResults[i])}
  </div>`;

    html += `<div class="row donotswipe">
    ${renderStockChartRsi(rsiResults[i], i)}
  </div>`;

    // 隨機指標
    html += `
    <div class="row">
    <span class="row-label">隨機指標<br>KD大於80可能超買，KD小於20可能超賣</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('stockkdj_${i}');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="stockkdj_${i}" style="display:none;" class="donotswipe">
    ${renderStockKdj(kdjResults[i])}
  </div>`;

    html += `<div class="row donotswipe">
    ${renderStockChartKdj(kdjResults[i], i)}
  </div>`;

    // 平滑異同移動平均線（MACD）
    html += `
    <div class="row">
    <span class="row-label">平滑異同移動平均線（MACD）<br>MACD 慢慢往上交叉信號線時，這通常被視為買進<br>MACD 慢慢往下交叉信號線時，這通常被視為賣出</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('stockmacd_${i}');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="stockmacd_${i}" style="display:none;" class="donotswipe">
    ${renderStockMacd(macdResults[i])}
  </div>`;

    html += `<div class="row donotswipe">
    ${renderStockChartMacd(macdResults[i], i)}
  </div>`;

    // 布林通道（Bollinger Bands）
    html += `
    <div class="row">
    <span class="row-label">布林通道（Bollinger Bands）<br>上、中、下軌則代表價格的波動範圍<br>也間接代表了超買或是超賣的可能機率</span>
    <span style="cursor:pointer;user-select:none;" onclick="
      const ob = document.getElementById('stockbrands_${i}');
      const btn = this;
      if (ob.style.display === 'none') {
      ob.style.display = 'block';
      btn.textContent = '－';
      } else {
      ob.style.display = 'none';
      btn.textContent = '＋';
      }
    ">＋</span>
    </div>`;
    html += `<div id="stockbrands_${i}" style="display:none;" class="donotswipe">
    ${renderStockBrands(brandsResults[i])}
  </div>`;

    html += `<div class="row donotswipe">
    ${renderStockChartBrands(brandsResults[i], i)}
  </div>`;

    html += `</div>`; // .stock-slide
  }

  html += `
    </div><!-- /.mystock-slider-track -->
  </div><!-- /.mystock-slider-wrapper -->`;

  setCard('card-mystock', 0, html, card_type === 'my-stock' ? 'card-wide' : '');

  StockChartHistory();
  StockChartInstitutional();
  StockChartMarginTradingBalance();
  StockChartSma();
  StockChartRsi();
  StockChartKdj();
  StockChartMacd();
  StockChartBrands();

  initMyStockSlider();
}

// ── MyStock Slider ──
let _mystockSlideIndex = 0;
let _mystockSliderInited = false;

function initMyStockSlider() {
  // 保留上次停留的頁面（loadAll 重跑時不跳回第 0 頁）
  // 但如果超出新的股票數量範圍就夾回合法值
  const total = MY_STOCKS.length;
  _mystockSlideIndex = Math.max(0, Math.min(total - 1, _mystockSlideIndex));
  _updateMyStockSlider();

  // Touch / swipe 手勢支援
  // 用 event delegation 綁在 document，避免 _renderMyStock 重建 DOM 後舊元素的事件失效
  if (_mystockSliderInited) return;
  _mystockSliderInited = true;

  let startX = 0;
  let isDragging = false;

  document.addEventListener('touchstart', e => {
    if (!e.target.closest('#mystock-track')) return;
    if (e.target.closest('.donotswipe')) return;
    startX = e.touches[0].clientX;
    isDragging = true;
  }, {
    passive: true
  });

  document.addEventListener('touchend', e => {
    if (!isDragging) return;
    isDragging = false;
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      stepMyStockSlide(diff > 0 ? 1 : -1);
    }
  }, {
    passive: true
  });

  // 轉向或視窗 resize 時：用快取資料重繪整個 card（不打 API），解決 ECharts canvas 尺寸錯誤
  let _resizeTimer = null;
  const onResize = () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(() => {
      if (_mystockApiCache) {
        _renderMyStock(_mystockApiCache);
      }
    }, 200);
  };
  window.addEventListener('orientationchange', onResize);
  window.addEventListener('resize', onResize);
}

function _updateMyStockSlider() {
  const total = MY_STOCKS.length;
  const i = _mystockSlideIndex;

  const track = document.getElementById('mystock-track');
  if (!track) return;

  // 先短暫關閉 transition，避免 resize 時產生動畫滑動
  track.style.transition = 'none';
  track.style.transform = `translateX(-${i * 100}%)`;
  // 下一個 frame 再恢復 transition
  requestAnimationFrame(() => {
    track.style.transition = '';
  });

  // dots
  document.querySelectorAll('.mystock-dot').forEach((dot, idx) => {
    dot.classList.toggle('active', idx === i);
  });

  // 底部按鈕 disabled 狀態
  const prevBtn = document.getElementById('mystock-prev');
  const nextBtn = document.getElementById('mystock-next');
  if (prevBtn) prevBtn.disabled = (i === 0);
  if (nextBtn) nextBtn.disabled = (i === total - 1);
}

window.stepMyStockSlide = function(dir) {
  const total = MY_STOCKS.length;
  _mystockSlideIndex = Math.max(0, Math.min(total - 1, _mystockSlideIndex + dir));
  _updateMyStockSlider();
};

window.gotoMyStockSlide = function(idx) {
  _mystockSlideIndex = idx;
  _updateMyStockSlider();
};

const pending = window._history_chartPending || {};
for (const i in pending) {
  const el = document.getElementById('stock_history_chart_' + i);
  if (!el) continue;
  const sorted = pending[i];

  const chart = LightweightCharts.createChart(el, {
    width: el.offsetWidth || 300,
    height: 260,
    layout: {
      background: {
        color: '#0a0e14'
      },
      textColor: '#5a7080'
    },
    grid: {
      vertLines: {
        color: '#1e2736'
      },
      horzLines: {
        color: '#1e2736'
      }
    },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal
    },
    rightPriceScale: {
      borderColor: '#1e2736'
    },
    timeScale: {
      borderColor: '#1e2736',
      fixLeftEdge: true,
      fixRightEdge: true
    },
    handleScroll: {
      mouseWheel: true
    },
    handleScale: {
      mouseWheel: true
    },
  });

  const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: '#ff4d6a',
    downColor: '#00c98a',
    borderUpColor: '#ff4d6a',
    borderDownColor: '#00c98a',
    wickUpColor: '#ff4d6a',
    wickDownColor: '#00c98a',
  });
  candleSeries.setData(sorted.map(d => ({
    time: d.date,
    open: d.open,
    high: d.high,
    low: d.low,
    close: d.close,
  })));

  const volSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
    priceFormat: {
      type: 'volume'
    },
    priceScaleId: 'vol',
  });
  chart.priceScale('vol').applyOptions({
    scaleMargins: {
      top: 0.82,
      bottom: 0
    },
  });
  volSeries.setData(sorted.map(d => ({
    time: d.date,
    value: Math.round(d.volume / 1000),
    color: d.change >= 0 ? '#ff4d6a33' : '#00c98a33',
  })));

  new ResizeObserver(() => chart.applyOptions({
    width: el.offsetWidth
  })).observe(el);
}
window._history_chartPending = {}; // 清空，避免重複初始化

function StockChartHistory_lightweight_charts() {
  const pending = window._history_chartPending || {};
  for (const i in pending) {
    const el = document.getElementById('stock_history_chart_' + i);
    if (!el) continue;
    const sorted = pending[i];

    const chart = LightweightCharts.createChart(el, {
      width: el.offsetWidth || 300,
      height: 260,
      layout: {
        background: {
          color: '#0a0e14'
        },
        textColor: '#5a7080'
      },
      grid: {
        vertLines: {
          color: '#1e2736'
        },
        horzLines: {
          color: '#1e2736'
        }
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal
      },
      rightPriceScale: {
        borderColor: '#1e2736'
      },
      timeScale: {
        borderColor: '#1e2736',
        fixLeftEdge: true,
        fixRightEdge: true
      },
      handleScroll: {
        mouseWheel: true
      },
      handleScale: {
        mouseWheel: true
      },
    });

    const candleSeries = chart.addSeries(LightweightCharts.CandlestickSeries, {
      upColor: '#ff4d6a',
      downColor: '#00c98a',
      borderUpColor: '#ff4d6a',
      borderDownColor: '#00c98a',
      wickUpColor: '#ff4d6a',
      wickDownColor: '#00c98a',
    });
    candleSeries.setData(sorted.map(d => ({
      time: d.date,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    })));

    const volSeries = chart.addSeries(LightweightCharts.HistogramSeries, {
      priceFormat: {
        type: 'volume'
      },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0
      },
    });
    volSeries.setData(sorted.map(d => ({
      time: d.date,
      value: Math.round(d.volume / 1000),
      color: d.change >= 0 ? '#ff4d6a33' : '#00c98a33',
    })));

    new ResizeObserver(() => chart.applyOptions({
      width: el.offsetWidth
    })).observe(el);
  }
  window._history_chartPending = {}; // 清空，避免重複初始化
}

function StockChartHistory() {
  const pending = window._history_chartPending || {};
  for (const i in pending) {
    const el = document.getElementById('stock_history_chart_' + i);
    if (!el) continue;
    const sorted = pending[i];

    const dates = sorted.map(d => d.date);
    const ohlc = sorted.map(d => [d.open, d.close, d.low, d.high]);
    const vols = sorted.map(d => ({
      value: Math.round(d.volume / 1000),
      itemStyle: {
        color: d.change >= 0 ? '#ff4d6a55' : '#00c98a55'
      }
    }));

    el.style.width = '100%';
    let chart = echarts.getInstanceByDom(el);
    if (!chart) {
      chart = echarts.init(el, null, {
        height: 300
      });
    }
    chart.setOption({
      backgroundColor: '#0a0e14',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        backgroundColor: '#1e2736',
        borderColor: '#3a4a5c',
        textStyle: {
          color: '#c8d8e8',
          fontSize: 11
        },
        formatter(params) {
          const c = params.find(p => p.seriesType === 'candlestick');
          const v = params.find(p => p.seriesName === 'vol');
          if (!c) return '';
          const [, o, cl, lo, hi] = c.value; // 第0位是index，用逗號跳過
          const chg = cl - o;
          const col = chg >= 0 ? '#ff4d6a' : '#00c98a';
          return `
            <div style="font-family:monospace;font-size:11px;line-height:1.8">
            <b style="color:#c8d8e8">${c.name}</b><br>
            開 ${o} &nbsp; 高 <span style="color:${col}">${hi}</span><br>
            低 <span style="color:${col}">${lo}</span> &nbsp; 收 <span style="color:${col}">${cl}</span><br>
            漲跌 <span style="color:${col}">${chg >= 0 ? '+' : ''}${chg}</span><br>
            量 ${v ? v.value.toLocaleString() + ' 張' : '-'}
            </div>
          `;
        }
      },
      axisPointer: {
        link: [{
          xAxisIndex: 'all'
        }]
      },
      grid: [{
          left: 55,
          right: 10,
          top: 8,
          bottom: 100
        },
        {
          left: 55,
          right: 10,
          top: 220,
          bottom: 30
        },
      ],
      xAxis: [{
          type: 'category',
          data: dates,
          gridIndex: 0,
          axisLine: {
            lineStyle: {
              color: '#1e2736'
            }
          },
          axisLabel: {
            show: false
          },
          splitLine: {
            show: false
          }
        },
        {
          type: 'category',
          data: dates,
          gridIndex: 1,
          axisLine: {
            lineStyle: {
              color: '#1e2736'
            }
          },
          axisLabel: {
            color: '#5a7080',
            fontSize: 10
          },
          splitLine: {
            show: false
          }
        },
      ],
      yAxis: [{
          scale: true,
          gridIndex: 0,
          axisLine: {
            lineStyle: {
              color: '#1e2736'
            }
          },
          axisLabel: {
            color: '#5a7080',
            fontSize: 10
          },
          splitLine: {
            lineStyle: {
              color: '#1e2736'
            }
          }
        },
        {
          scale: true,
          gridIndex: 1,
          axisLine: {
            lineStyle: {
              color: '#1e2736'
            }
          },
          axisLabel: {
            color: '#5a7080',
            fontSize: 9
          },
          splitLine: {
            show: false
          }
        },
      ],
      dataZoom: [{
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          xAxisIndex: [0, 1],
          bottom: 0,
          height: 20,
          borderColor: '#3a4a5c',
          backgroundColor: '#0a0e14',
          fillerColor: '#1e273680',
          handleStyle: {
            color: '#5a9eff'
          },
          textStyle: {
            color: '#5a7080',
            fontSize: 10
          }
        },
      ],
      series: [{
          type: 'candlestick',
          name: 'K線',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: ohlc,
          itemStyle: {
            color: '#ff4d6a',
            color0: '#00c98a',
            borderColor: '#ff4d6a',
            borderColor0: '#00c98a',
          }
        },
        {
          type: 'bar',
          name: 'vol',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: vols,
          barMaxWidth: 8
        },
      ],
    });

    new ResizeObserver(() => chart.resize()).observe(el);
  }
  window._history_chartPending = {};
}

function StockChartInstitutional() {
  const pending = window._institutional_chartPending || {};
  for (const i in pending) {
    const el = document.getElementById('stock_institutional_chart_' + i);
    if (!el) continue;
    const sorted = pending[i];

    const dates = sorted.map(d => d.date);
    const trust = sorted.map(d => d.trust ?? 0);
    const dealer = sorted.map(d => d.dealer ?? 0);
    const foreign = sorted.map(d => d.foreign ?? 0);

    el.style.width = '100%';
    const chart = echarts.init(el, null, {
      height: 260
    });
    chart.setOption({
      backgroundColor: '#0a0e14',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e2736',
        borderColor: '#3a4a5c',
        textStyle: {
          color: '#c8d8e8',
          fontSize: 11
        },
      },
      legend: {
        data: ['投信', '自營商', '外資'],
        textStyle: {
          color: '#5a7080',
          fontSize: 11
        },
        top: 4,
      },
      grid: {
        left: 55,
        right: 10,
        top: 32,
        bottom: 40
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
        axisLabel: {
          color: '#5a7080',
          fontSize: 10,
          rotate: 30
        },
        splitLine: {
          show: false
        },
      },
      yAxis: {
        type: 'value',
        axisLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
        axisLabel: {
          color: '#5a7080',
          fontSize: 10
        },
        splitLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
      },
      dataZoom: [{
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          bottom: 0,
          height: 20,
          borderColor: '#3a4a5c',
          backgroundColor: '#0a0e14',
          fillerColor: '#1e273680',
          handleStyle: {
            color: '#5a9eff'
          },
          textStyle: {
            color: '#5a7080',
            fontSize: 10
          }
        }
      ],
      series: [{
          name: '投信',
          type: 'bar',
          data: trust,
          stack: 'total',
          itemStyle: {
            color: '#5a9eff'
          }
        },
        {
          name: '自營商',
          type: 'bar',
          data: dealer,
          stack: 'total',
          itemStyle: {
            color: '#f0b429'
          }
        },
        {
          name: '外資',
          type: 'bar',
          data: foreign,
          stack: 'total',
          itemStyle: {
            color: '#ff4d6a'
          }
        },
      ],
    });

    new ResizeObserver(() => chart.resize()).observe(el);
  }
  window._institutional_chartPending = {};
}

function StockChartMarginTradingBalance() {
  const pending = window._margintradingbalance_chartPending || {};
  for (const i in pending) {
    const el = document.getElementById('stock_margintradingbalance_chart_' + i);
    if (!el) continue;
    const sorted = pending[i];

    const dates = sorted.map(d => d.date);
    const financing = sorted.map(d => d.financing ?? 0);
    const financingBalance = sorted.map(d => d.financingBalance ?? 0);
    const price = sorted.map(d => d.price ?? 0);
    const volume = sorted.map(d => d.volume ?? 0);

    const financingBars = financing.map(v => ({
      value: v,
      itemStyle: {
        color: v >= 0 ? '#ff4d6a' : '#00c98a'
      }
    }));

    const volumeBars = sorted.map(d => ({
      value: d.volume ?? 0,
      itemStyle: {
        color: (d.price ?? 0) >= (d.prevPrice ?? d.price ?? 0) ? '#ff4d6a55' : '#00c98a55'
      }
    }));

    el.style.width = '100%';
    let chart = echarts.getInstanceByDom(el);
    if (!chart) {
      chart = echarts.init(el, null, {
        height: 260
      });
    }

    // 根據容器寬度動態計算 legend 是否會換行，並調整 grid top
    function buildOption() {
      const isNarrow = el.offsetWidth < 400;
      const legendRows = isNarrow ? 2 : 1; // 窄螢幕 legend 會換成兩行
      const legendHeight = legendRows * 22; // 每行約 22px
      const gridTop = legendHeight + 16; // legend 高度 + 間距
      const gridBottom2Top = gridTop + 155; // 下方成交量區塊起點

      return {
        backgroundColor: '#0a0e14',
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
          backgroundColor: '#1e2736',
          borderColor: '#3a4a5c',
          textStyle: {
            color: '#c8d8e8',
            fontSize: 11
          },
          formatter(params) {
            const date = params[0]?.name ?? '';
            let html = `<div style="font-family:monospace;font-size:11px;line-height:1.8"><b style="color:#c8d8e8">${date}</b><br>`;
            params.forEach(p => {
              const color = p.color?.colorStops?. [0]?.color ?? p.color ?? '#c8d8e8';
              const val = typeof p.value === 'number' ? p.value.toLocaleString() : p.value;
              html += `<span style="color:${color}">●</span> ${p.seriesName}：${val}<br>`;
            });
            html += '</div>';
            return html;
          }
        },
        axisPointer: {
          link: [{
            xAxisIndex: 'all'
          }]
        },
        legend: {
          data: ['融資餘額' /*, '融資增減'*/ , '收盤價', '成交量'],
          textStyle: {
            color: '#5a7080',
            fontSize: 11
          },
          top: 4,
        },
        grid: [{
            left: 65,
            right: 55,
            top: gridTop,
            bottom: 100
          },
          {
            left: 65,
            right: 55,
            top: gridBottom2Top,
            bottom: 30
          },
        ],
        xAxis: [{
            type: 'category',
            data: dates,
            gridIndex: 0,
            axisLine: {
              lineStyle: {
                color: '#1e2736'
              }
            },
            axisLabel: {
              show: false
            },
            splitLine: {
              show: false
            }
          },
          {
            type: 'category',
            data: dates,
            gridIndex: 1,
            axisLine: {
              lineStyle: {
                color: '#1e2736'
              }
            },
            axisLabel: {
              color: '#5a7080',
              fontSize: 10
            },
            splitLine: {
              show: false
            }
          },
        ],
        yAxis: [{
            scale: true,
            gridIndex: 0,
            axisLine: {
              lineStyle: {
                color: '#1e2736'
              }
            },
            axisLabel: {
              color: '#5a7080',
              fontSize: 10
            },
            splitLine: {
              lineStyle: {
                color: '#1e2736'
              }
            },
            /*name: '餘額(張)', */
            nameTextStyle: {
              color: '#5a7080',
              fontSize: 9
            }
          },
          {
            scale: true,
            gridIndex: 0,
            axisLine: {
              lineStyle: {
                color: '#1e2736'
              }
            },
            axisLabel: {
              color: '#f0b42988',
              fontSize: 10
            },
            splitLine: {
              show: false
            },
            /*name: '股價(元)', */
            nameTextStyle: {
              color: '#f0b42988',
              fontSize: 9
            }
          },
          {
            scale: true,
            gridIndex: 1,
            axisLine: {
              lineStyle: {
                color: '#1e2736'
              }
            },
            axisLabel: {
              color: '#5a7080',
              fontSize: 9
            },
            splitLine: {
              show: false
            }
          },
        ],
        dataZoom: [{
            type: 'inside',
            xAxisIndex: [0, 1],
            start: 0,
            end: 100
          },
          {
            type: 'slider',
            xAxisIndex: [0, 1],
            bottom: 0,
            height: 20,
            borderColor: '#3a4a5c',
            backgroundColor: '#0a0e14',
            fillerColor: '#1e273680',
            handleStyle: {
              color: '#5a9eff'
            },
            textStyle: {
              color: '#5a7080',
              fontSize: 10
            }
          },
        ],
        series: [{
            name: '融資餘額',
            type: 'line',
            xAxisIndex: 0,
            yAxisIndex: 0,
            data: financingBalance,
            symbol: 'none',
            lineStyle: {
              color: '#5a9eff',
              width: 2
            },
            areaStyle: {
              color: '#5a9eff18'
            }
          },
          /*{ name: '融資增減', type: 'bar', xAxisIndex: 0, yAxisIndex: 0,
            data: financingBars, barMaxWidth: 6 },*/
          {
            name: '收盤價',
            type: 'line',
            xAxisIndex: 0,
            yAxisIndex: 1,
            data: price,
            symbol: 'none',
            lineStyle: {
              color: '#f0b429',
              width: 1.5,
              type: 'dashed'
            }
          },
          {
            name: '成交量',
            type: 'bar',
            xAxisIndex: 1,
            yAxisIndex: 2,
            data: volumeBars,
            barMaxWidth: 8
          },
        ],
      };
    }

    chart.setOption(buildOption());

    // ResizeObserver：resize 同時重算 option，解決直向 legend 換行蓋圖問題
    new ResizeObserver(() => {
      chart.resize();
      chart.setOption(buildOption());
    }).observe(el);
  }
  window._margintradingbalance_chartPending = {};
}

function StockChartSma() {
  const pending = window._sma_chartPending || {};

  // 依容器寬度判斷 legend 是否會換行成兩行，回傳對應的 grid.top
  function getGridTop(el) {
    const w = el.clientWidth;
    // 5 個 legend 項目（SMA5/10/20/60 + 股價），窄於此寬度時通常會換行
    return w < 420 ? 56 : 32;
  }

  for (const i in pending) {
    const el = document.getElementById('stock_sma_chart_' + i);
    if (!el) continue;
    const sorted = pending[i];

    const dates = sorted.map(d => d.date);
    const sma5 = sorted.map(d => d.sma_5 ?? null);
    const sma10 = sorted.map(d => d.sma_10 ?? null);
    const sma20 = sorted.map(d => d.sma_20 ?? null);
    const sma60 = sorted.map(d => d.sma_60 ?? null);
    const price = sorted.map(d => d.price ?? null);

    el.style.width = '100%';
    const chart = echarts.init(el, null, {
      height: 260
    });
    chart.setOption({
      backgroundColor: '#0a0e14',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e2736',
        borderColor: '#3a4a5c',
        textStyle: {
          color: '#c8d8e8',
          fontSize: 11
        },
      },
      legend: {
        data: ['SMA5', 'SMA10', 'SMA20', 'SMA60', '股價'],
        icon: 'rect', // 設為矩形
        itemWidth: 20, // 線段長度
        itemHeight: 2, // 線段粗細（看起來就是一條線）
        textStyle: {
          color: '#5a7080',
          fontSize: 11
        },
        top: 4,
      },
      grid: {
        left: 55,
        right: 10,
        top: getGridTop(el), // 改成動態計算
        bottom: 40
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
        axisLabel: {
          color: '#5a7080',
          fontSize: 10,
          rotate: 30
        },
        splitLine: {
          show: false
        },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
        axisLabel: {
          color: '#5a7080',
          fontSize: 10
        },
        splitLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
      },
      dataZoom: [{
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          bottom: 0,
          height: 20,
          borderColor: '#3a4a5c',
          backgroundColor: '#0a0e14',
          fillerColor: '#1e273680',
          handleStyle: {
            color: '#5a9eff'
          },
          textStyle: {
            color: '#5a7080',
            fontSize: 10
          }
        }
      ],
      series: [{
          name: 'SMA5',
          type: 'line',
          data: sma5,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#ff4d6a',
            width: 1.5
          },
          itemStyle: {
            color: '#ff4d6a'
          }
        },
        {
          name: 'SMA10',
          type: 'line',
          data: sma10,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#f0b429',
            width: 1.5
          },
          itemStyle: {
            color: '#f0b429'
          }
        },
        {
          name: 'SMA20',
          type: 'line',
          data: sma20,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#5a9eff',
            width: 1.5
          },
          itemStyle: {
            color: '#5a9eff'
          }
        },
        {
          name: 'SMA60',
          type: 'line',
          data: sma60,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#00c98a',
            width: 1.5
          },
          itemStyle: {
            color: '#00c98a'
          }
        },
        {
          name: '股價',
          type: 'line',
          data: price,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#12d623',
            width: 1.5
          },
          itemStyle: {
            color: '#12d623'
          }
        },
      ],
    });

    // resize 時同步更新 grid.top，避免視窗縮放後 legend 換行卻沒補高度
    let lastTop = getGridTop(el);
    new ResizeObserver(() => {
      chart.resize();
      const newTop = getGridTop(el);
      if (newTop !== lastTop) {
        lastTop = newTop;
        chart.setOption({ grid: { top: newTop } });
      }
    }).observe(el);
  }
  window._sma_chartPending = {};
}

function StockChartRsi() {
  const pending = window._rsi_chartPending || {};
  for (const i in pending) {
    const el = document.getElementById('stock_rsi_chart_' + i);
    if (!el) continue;
    const sorted = pending[i];

    const dates = sorted.map(d => d.date);
    const rsi6 = sorted.map(d => d.rsi_6 ?? null);
    const rsi9 = sorted.map(d => d.rsi_9 ?? null);
    const rsi14 = sorted.map(d => d.rsi_14 ?? null);
    const rsi20 = sorted.map(d => d.rsi_20 ?? null);

    el.style.width = '100%';
    const chart = echarts.init(el, null, {
      height: 260
    });
    chart.setOption({
      backgroundColor: '#0a0e14',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e2736',
        borderColor: '#3a4a5c',
        textStyle: {
          color: '#c8d8e8',
          fontSize: 11
        },
      },
      legend: {
        data: ['RSI6', 'RSI9', 'RSI14', 'RSI20'],
        icon: 'rect', // 設為矩形
        itemWidth: 20, // 線段長度
        itemHeight: 2, // 線段粗細（看起來就是一條線）
        textStyle: {
          color: '#5a7080',
          fontSize: 11
        },
        top: 4,
      },
      grid: {
        left: 45,
        right: 10,
        top: 32,
        bottom: 40
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
        axisLabel: {
          color: '#5a7080',
          fontSize: 10,
          rotate: 30
        },
        splitLine: {
          show: false
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
        axisLabel: {
          color: '#5a7080',
          fontSize: 10
        },
        splitLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
        markLine: {
          silent: true
        },
      },
      dataZoom: [{
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          bottom: 0,
          height: 20,
          borderColor: '#3a4a5c',
          backgroundColor: '#0a0e14',
          fillerColor: '#1e273680',
          handleStyle: {
            color: '#5a9eff'
          },
          textStyle: {
            color: '#5a7080',
            fontSize: 10
          }
        }
      ],
      series: [{
          name: 'RSI6',
          type: 'line',
          data: rsi6,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#ff4d6a',
            width: 1.5
          },
          itemStyle: {
            color: '#ff4d6a'
          }
        },
        {
          name: 'RSI9',
          type: 'line',
          data: rsi9,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#f0b429',
            width: 1.5
          },
          itemStyle: {
            color: '#f0b429'
          }
        },
        {
          name: 'RSI14',
          type: 'line',
          data: rsi14,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#5a9eff',
            width: 1.5
          },
          itemStyle: {
            color: '#5a9eff'
          }
        },
        {
          name: 'RSI20',
          type: 'line',
          data: rsi20,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#00c98a',
            width: 1.5
          },
          itemStyle: {
            color: '#00c98a'
          }
        },
        /*{
          // 超買線 70
          type: 'line', markLine: { silent: true }, symbol: 'none',
          lineStyle: { color: 'transparent' },
          markLine: {
          silent: true,
          symbol: 'none',
          data: [
            { yAxis: 70, lineStyle: { color: '#ff4d6a55', type: 'dashed', width: 1 },
            label: { formatter: '超買 70', color: '#ff4d6a', fontSize: 10 } },
            { yAxis: 30, lineStyle: { color: '#00c98a55', type: 'dashed', width: 1 },
            label: { formatter: '超賣 30', color: '#00c98a', fontSize: 10 } },
          ],
          },
        },*/
      ],
    });

    new ResizeObserver(() => chart.resize()).observe(el);
  }
  window._rsi_chartPending = {};
}

function StockChartKdj() {
  const pending = window._kdj_chartPending || {};
  for (const i in pending) {
    const el = document.getElementById('stock_kdj_chart_' + i);
    if (!el) continue;
    const sorted = pending[i];

    const dates = sorted.map(d => d.date);
    const kLine = sorted.map(d => d.k ?? null);
    const dLine = sorted.map(d => d.d ?? null);
    // const jLine = sorted.map(d => d.j ?? null);

    el.style.width = '100%';
    const chart = echarts.init(el, null, {
      height: 260
    });
    chart.setOption({
      backgroundColor: '#0a0e14',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e2736',
        borderColor: '#3a4a5c',
        textStyle: {
          color: '#c8d8e8',
          fontSize: 11
        },
      },
      legend: {
        data: ['K', 'D' /*, 'J'*/ ],
        icon: 'rect', // 設為矩形
        itemWidth: 20, // 線段長度
        itemHeight: 2, // 線段粗細（看起來就是一條線）
        textStyle: {
          color: '#5a7080',
          fontSize: 11
        },
        top: 4,
      },
      grid: {
        left: 45,
        right: 10,
        top: 32,
        bottom: 40
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
        axisLabel: {
          color: '#5a7080',
          fontSize: 10,
          rotate: 30
        },
        splitLine: {
          show: false
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
        axisLabel: {
          color: '#5a7080',
          fontSize: 10
        },
        splitLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
      },
      dataZoom: [{
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          bottom: 0,
          height: 20,
          borderColor: '#3a4a5c',
          backgroundColor: '#0a0e14',
          fillerColor: '#1e273680',
          handleStyle: {
            color: '#5a9eff'
          },
          textStyle: {
            color: '#5a7080',
            fontSize: 10
          }
        }
      ],
      series: [{
          name: 'K',
          type: 'line',
          data: kLine,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#ff4d6a',
            width: 1.5
          },
          itemStyle: {
            color: '#ff4d6a'
          }
        },
        {
          name: 'D',
          type: 'line',
          data: dLine,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#5a9eff',
            width: 1.5
          },
          itemStyle: {
            color: '#5a9eff'
          }
        },
        // { name: 'J', type: 'line', data: jLine, smooth: true,
        //   symbol: 'none', lineStyle: { color: '#f0b429', width: 1.5 }, itemStyle: { color: '#f0b429' } },
        /*{
          type: 'line', symbol: 'none',
          lineStyle: { color: 'transparent' },
          markLine: {
          silent: true,
          symbol: 'none',
          data: [
            { yAxis: 80, lineStyle: { color: '#ff4d6a55', type: 'dashed', width: 1 },
            label: { formatter: '超買 80', color: '#ff4d6a', fontSize: 10 } },
            { yAxis: 20, lineStyle: { color: '#00c98a55', type: 'dashed', width: 1 },
            label: { formatter: '超賣 20', color: '#00c98a', fontSize: 10 } },
          ],
          },
        },*/
      ],
    });

    new ResizeObserver(() => chart.resize()).observe(el);
  }
  window._kdj_chartPending = {};
}

function StockChartMacd() {
  const pending = window._macd_chartPending || {};
  for (const i in pending) {
    const el = document.getElementById('stock_macd_chart_' + i);
    if (!el) continue;
    const sorted = pending[i];

    const dates = sorted.map(d => d.date);
    const macdLine = sorted.map(d => d.macdLine ?? null);
    const signalLine = sorted.map(d => d.signalLine ?? null);
    const histogram = sorted.map(d => d.histogram ?? null);

    el.style.width = '100%';
    const chart = echarts.init(el, null, {
      height: 280
    });
    chart.setOption({
      backgroundColor: '#0a0e14',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e2736',
        borderColor: '#3a4a5c',
        textStyle: {
          color: '#c8d8e8',
          fontSize: 11
        },
      },
      legend: {
        data: ['MACD', '信號線'],
        icon: 'rect', // 設為矩形
        itemWidth: 20, // 線段長度
        itemHeight: 2, // 線段粗細（看起來就是一條線）
        textStyle: {
          color: '#5a7080',
          fontSize: 11
        },
        top: 4,
      },
      axisPointer: {
        link: [{
          xAxisIndex: 'all'
        }]
      },
      grid: [{
          left: 55,
          right: 10,
          top: 32,
          bottom: 120
        },
        {
          left: 55,
          right: 10,
          top: 180,
          bottom: 40
        },
      ],
      xAxis: [{
          type: 'category',
          data: dates,
          gridIndex: 0,
          axisLine: {
            lineStyle: {
              color: '#1e2736'
            }
          },
          axisLabel: {
            show: false
          },
          splitLine: {
            show: false
          }
        },
        {
          type: 'category',
          data: dates,
          gridIndex: 1,
          axisLine: {
            lineStyle: {
              color: '#1e2736'
            }
          },
          axisLabel: {
            color: '#5a7080',
            fontSize: 10,
            rotate: 30
          },
          splitLine: {
            show: false
          }
        },
      ],
      yAxis: [{
          scale: true,
          gridIndex: 0,
          axisLine: {
            lineStyle: {
              color: '#1e2736'
            }
          },
          axisLabel: {
            color: '#5a7080',
            fontSize: 10
          },
          splitLine: {
            lineStyle: {
              color: '#1e2736'
            }
          }
        },
        {
          scale: true,
          gridIndex: 1,
          axisLine: {
            lineStyle: {
              color: '#1e2736'
            }
          },
          axisLabel: {
            color: '#5a7080',
            fontSize: 10
          },
          splitLine: {
            show: false
          }
        },
      ],
      dataZoom: [{
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          xAxisIndex: [0, 1],
          bottom: 0,
          height: 20,
          borderColor: '#3a4a5c',
          backgroundColor: '#0a0e14',
          fillerColor: '#1e273680',
          handleStyle: {
            color: '#5a9eff'
          },
          textStyle: {
            color: '#5a7080',
            fontSize: 10
          }
        },
      ],
      series: [{
          name: 'MACD',
          type: 'line',
          data: macdLine,
          xAxisIndex: 0,
          yAxisIndex: 0,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#ff4d6a',
            width: 1.5
          },
          itemStyle: {
            color: '#ff4d6a'
          }
        },
        {
          name: '信號線',
          type: 'line',
          data: signalLine,
          xAxisIndex: 0,
          yAxisIndex: 0,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#5a9eff',
            width: 1.5
          },
          itemStyle: {
            color: '#5a9eff'
          }
        },
      ],
    });

    new ResizeObserver(() => chart.resize()).observe(el);
  }
  window._macd_chartPending = {};
}

function StockChartBrands() {
  const pending = window._brands_chartPending || {};
  for (const i in pending) {
    const el = document.getElementById('stock_brands_chart_' + i);
    if (!el) continue;
    const sorted = pending[i];

    const dates = sorted.map(d => d.date);
    const upper = sorted.map(d => d.upper ?? null);
    const middle = sorted.map(d => d.middle ?? null);
    const lower = sorted.map(d => d.lower ?? null);
    const price = sorted.map(d => d.price ?? null);

    el.style.width = '100%';
    const chart = echarts.init(el, null, {
      height: 260
    });
    chart.setOption({
      backgroundColor: '#0a0e14',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#1e2736',
        borderColor: '#3a4a5c',
        textStyle: {
          color: '#c8d8e8',
          fontSize: 11
        },
      },
      legend: {
        data: ['上軌', '中軌', '下軌', '股價'],
        icon: 'rect', // 設為矩形
        itemWidth: 20, // 線段長度
        itemHeight: 2, // 線段粗細（看起來就是一條線）
        textStyle: {
          color: '#5a7080',
          fontSize: 11
        },
        top: 4,
      },
      grid: {
        left: 55,
        right: 10,
        top: 32,
        bottom: 40
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
        axisLabel: {
          color: '#5a7080',
          fontSize: 10,
          rotate: 30
        },
        splitLine: {
          show: false
        },
      },
      yAxis: {
        scale: true,
        axisLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
        axisLabel: {
          color: '#5a7080',
          fontSize: 10
        },
        splitLine: {
          lineStyle: {
            color: '#1e2736'
          }
        },
      },
      dataZoom: [{
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          type: 'slider',
          bottom: 0,
          height: 20,
          borderColor: '#3a4a5c',
          backgroundColor: '#0a0e14',
          fillerColor: '#1e273680',
          handleStyle: {
            color: '#5a9eff'
          },
          textStyle: {
            color: '#5a7080',
            fontSize: 10
          }
        },
      ],
      series: [{
          name: '上軌',
          type: 'line',
          data: upper,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#ff4d6a',
            width: 1.5
          },
          areaStyle: {
            color: 'transparent'
          },
          itemStyle: {
            color: '#ff4d6a'
          }
        },
        {
          name: '中軌',
          type: 'line',
          data: middle,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#f0b429',
            width: 1.5 /*, type: 'dashed'*/
          },
          itemStyle: {
            color: '#f0b429'
          }
        },
        {
          name: '下軌',
          type: 'line',
          data: lower,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#00c98a',
            width: 1.5
          },
          areaStyle: {
            color: 'transparent',
            origin: 'auto',
          },
          itemStyle: {
            color: '#00c98a'
          },
        },
        {
          name: '股價',
          type: 'line',
          data: price,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color: '#5a9eff',
            width: 1.5
          },
          itemStyle: {
            color: '#5a9eff'
          }
        },
      ],
    });

    new ResizeObserver(() => chart.resize()).observe(el);
  }
  window._brands_chartPending = {};
}

function renderVolumeProfile(data, id) {
  if (!data || !data.success || !data.data.length) return '<p>無分價量表資料</p>';

  const maxVolume = Math.max(...data.data.map(d => d.volume));
  const maxPrice = Math.max(...data.data.map(d => d.price));
  const minPrice = Math.min(...data.data.map(d => d.price));

  // const filteredData = data.data.filter(d => d.price !== maxPrice && d.price !== minPrice);
  // const rows = filteredData.map(d => {
  const rows = data.data.map(d => {
    const bidPct = (d.volumeAtBid / maxVolume * 100).toFixed(1);
    const askPct = (d.volumeAtAsk / maxVolume * 100).toFixed(1);
    const totalPct = (d.volume / d.volume * 100).toFixed(1);

    // 價格顏色：最高紅、最低藍、其餘預設
    let priceColor = '';
    if (d.price === maxPrice) priceColor = 'color:#e05c5c;font-weight:bold;';
    else if (d.price === minPrice) priceColor = 'color:#5b9bd5;font-weight:bold;';

    // 外盤強買壓：外盤佔比 > 80% 時 yellow 高亮（優先級最低，不覆蓋最高/最低價）
    const askRatio = d.volume > 0 ? d.volumeAtAsk / d.volume : 0;
    if (!priceColor && askRatio > 0.8) priceColor = 'color:#ffd600;font-weight:bold;';

    return `
      <div style="display:none;align-items:center;margin-bottom:0px;border-bottom: 1px solid var(--border);padding: 10px 0px 10px 12px;" class="ordervolume_${id}">
      <!-- 左側文字 -->
      <div style="width:160px;font-size:12px;line-height:1.6;flex-shrink:0;">
        <div style="${priceColor}">成交價：${d.price.toFixed(2)}</div>
        <div>累計成交量：${d.volume}</div>
        <div style="color:#4caf50;">內盤成交量：${d.volumeAtBid}</div>
        <div style="color:#2196f3;">外盤成交量：${d.volumeAtAsk}</div>
      </div>
      <!-- 右側 bar -->
      <div style="flex:1;position:relative;height:40px;">
        <!-- 灰色背景（滿格，代表最大量參考） -->
        <div style="position:absolute;top:8px;left:0;width:100%;height:24px;background:#333;border-radius:3px;"></div>
        <!-- 整體總量的範圍（內盤綠 + 外盤藍，並排） -->
        <div style="position:absolute;top:8px;left:0;width:${totalPct}%;height:24px;display:flex;border-radius:3px;overflow:hidden;">
        <!-- 內盤（綠） -->
        <div style="width:${d.volume > 0 ? (d.volumeAtBid / d.volume * 100).toFixed(1) : 0}%;background:#4caf50;"></div>
        <!-- 外盤（藍） -->
        <div style="width:${d.volume > 0 ? (d.volumeAtAsk / d.volume * 100).toFixed(1) : 0}%;background:#2196f3;"></div>
        </div>
      </div>
      </div>
    `;
  }).join('');

  return `
    <div>
      <div class="row">
      <span class="row-label">分價量表</span>
      <div style="display: flex; gap: 8px; align-items: center;">
        <a style="cursor:pointer; user-select:none; text-decoration:none;" onclick="showInfo('${data.result.story}')">❔</a>
        <span style="cursor:pointer;user-select:none;" onclick="
        const items = document.querySelectorAll('.ordervolume_${id}');
        const btn = this;
        const isHidden = items[0].style.display === 'none';
        items.forEach(el => el.style.display = isHidden ? 'flex' : 'none');
        btn.textContent = isHidden ? '－' : '＋';
        ">＋</span>
      </div>
      </div>
      <div style="overflow-y:auto;max-height:200px;">
      ${rows}
      </div>
    </div>
  `;
}

function renderStockHistory(data) {
  if (!data || !data.success || !data.data.length) return '<p>無歷史股價資料</p>';

  const headerRow = `
  <tr>
    <th style="position:sticky;left:0;top:0;z-index:3;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);">日期</th>
    ${['開盤', '最高', '最低', '收盤', '漲跌', '成交量', '成交金額'].map(h =>
    `<th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">${h}</th>`
    ).join('')}
  </tr>`;

  const bodyRows = data.data.map(d => {
    const changeCls = d.change > 0 ? 'color:#e05c5c;' : d.change < 0 ? 'color:#4caf50;' : '';
    const sign = d.change > 0 ? '▲' : d.change < 0 ? '▼' : '';
    const volume = (d.volume / 1000).toFixed(0); // 張（股÷1000）
    const turnover = (d.turnover / 100000000).toFixed(2); // 億元

    return `
      <tr style="border-bottom:1px solid var(--border);">
      <td style="position:sticky;left:0;z-index:1;background:#1a2332;padding:6px 10px;white-space:nowrap;font-size:12px;">${d.date}</td>
      <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.open}</td>
      <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.high}</td>
      <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.low}</td>
      <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.close}</td>
      <td style="padding:6px 10px;text-align:center;font-size:12px;${changeCls}">${sign}${d.change}</td>
      <td style="padding:6px 10px;text-align:center;font-size:12px;">${volume}</td>
      <td style="padding:6px 10px;text-align:center;font-size:12px;">${turnover}億</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="overflow-x:auto;overflow-y:auto;max-height:180px;">
      <table style="border-collapse:collapse;font-family:var(--mono);width:100%;">
      <thead>${headerRow}</thead>
      <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

function renderStockChartHistory(data, i) {
  if (!data || !data.success || !data.data || !data.data.length) return '<p>無歷史股價圖表資料</p>';

  const sorted = [...data.data].sort((a, b) => a.date.localeCompare(b.date));

  // 把資料暫存到 window，等 DOM 就緒後取用
  window._history_chartPending = window._history_chartPending || {};
  window._history_chartPending[i] = sorted;

  // 回傳容器，圖表由 setTimeout 在 DOM 就緒後掛入
  return `<div id="stock_history_chart_${i}" style="height:300px;"></div>`;
}

function renderStockInstitutional(data) {
  if (!data || !data.success || !data.data.length) return '<p>無三大法人買賣超資料</p>';

  const headerRow = `
  <tr>
    <th style="position:sticky;left:0;top:0;z-index:3;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);">日期</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">投信</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">自營商</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">外資</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">合計</th>
  </tr>`;

  const bodyRows = data.data.map(d => `
  <tr style="border-bottom:1px solid var(--border);">
    <td style="position:sticky;left:0;z-index:1;background:#1a2332;padding:6px 10px;white-space:nowrap;text-align:center;font-size:12px;">${d.date}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.trust  ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.dealer ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.foreign ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.total ?? '-'}</td>
  </tr>`).join('');

  return `
    <div style="overflow-x:auto;overflow-y:auto;max-height:180px;">
      <table style="border-collapse:collapse;font-family:var(--mono);width:100%;">
      <thead>${headerRow}</thead>
      <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

function renderStockChartInstitutional(data, i) {
  if (!data || !data.success || !data.data || !data.data.length) return '<p>無三大法人買賣超圖表資料</p>';

  const sorted = [...data.data].sort((a, b) => a.date.localeCompare(b.date));

  // 把資料暫存到 window，等 DOM 就緒後取用
  window._institutional_chartPending = window._institutional_chartPending || {};
  window._institutional_chartPending[i] = sorted;

  // 回傳容器，圖表由 setTimeout 在 DOM 就緒後掛入
  return `<div id="stock_institutional_chart_${i}" style="height:260px;"></div>`;
}

function renderStockMarginTradingBalance(data) {
  if (!data || !data.success || !data.data.length) return '<p>無融資融券增減資料</p>';

  const headerRow = `
  <tr>
    <th style="position:sticky;left:0;top:0;z-index:3;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);">日期</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">融資增加</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">融資餘額</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">收盤價</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">成交量</th>
  </tr>`;

  const bodyRows = data.data.map(d => `
  <tr style="border-bottom:1px solid var(--border);">
    <td style="position:sticky;left:0;z-index:1;background:#1a2332;padding:6px 10px;white-space:nowrap;text-align:center;font-size:12px;">${d.date}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.financing  ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.financingBalance ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.price ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.volume ?? '-'}</td>
  </tr>`).join('');

  return `
    <div style="overflow-x:auto;overflow-y:auto;max-height:180px;">
      <table style="border-collapse:collapse;font-family:var(--mono);width:100%;">
      <thead>${headerRow}</thead>
      <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

function renderStockChartMarginTradingBalance(data, i) {
  if (!data || !data.success || !data.data || !data.data.length) return '<p>無融資餘額增減資料</p>';

  const sorted = [...data.data].sort((a, b) => a.date.localeCompare(b.date));

  // 把資料暫存到 window，等 DOM 就緒後取用
  window._margintradingbalance_chartPending = window._margintradingbalance_chartPending || {};
  window._margintradingbalance_chartPending[i] = sorted;

  // 回傳容器，圖表由 setTimeout 在 DOM 就緒後掛入
  return `<div id="stock_margintradingbalance_chart_${i}" style="height:260px;"></div>`;
}

function renderStockSma(data) {
  if (!data || !data.success || !data.data.length) return '<p>無簡單移動平均線資料</p>';

  const headerRow = `
  <tr>
    <th style="position:sticky;left:0;top:0;z-index:3;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);">日期</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">SMA5</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">SMA10</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">SMA20</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">SMA60</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">股價</th>
  </tr>`;

  const bodyRows = data.data.map(d => `
  <tr style="border-bottom:1px solid var(--border);">
    <td style="position:sticky;left:0;z-index:1;background:#1a2332;padding:6px 10px;white-space:nowrap;text-align:center;font-size:12px;">${d.date}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.sma_5  ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.sma_10 ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.sma_20 ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.sma_60 ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.price ?? '-'}</td>
  </tr>`).join('');

  return `
    <div style="overflow-x:auto;overflow-y:auto;max-height:180px;">
      <table style="border-collapse:collapse;font-family:var(--mono);width:100%;">
      <thead>${headerRow}</thead>
      <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

function renderStockChartSma(data, i) {
  if (!data || !data.success || !data.data || !data.data.length) return '<p>無簡單移動平均線圖表資料</p>';

  const sorted = [...data.data].sort((a, b) => a.date.localeCompare(b.date));

  // 把資料暫存到 window，等 DOM 就緒後取用
  window._sma_chartPending = window._sma_chartPending || {};
  window._sma_chartPending[i] = sorted;

  // 回傳容器，圖表由 setTimeout 在 DOM 就緒後掛入
  return `<div id="stock_sma_chart_${i}" style="height:260px;"></div>`;
}

function renderStockRsi(data) {
  if (!data || !data.success || !data.data.length) return '<p>無相對強弱指標資料</p>';

  const headerRow = `
  <tr>
    <th style="position:sticky;left:0;top:0;z-index:3;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);">日期</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">RS6</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">RSI9</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">RSI14</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">RSI20</th>
  </tr>`;

  const bodyRows = data.data.map(d => `
  <tr style="border-bottom:1px solid var(--border);">
    <td style="position:sticky;left:0;z-index:1;background:#1a2332;padding:6px 10px;white-space:nowrap;text-align:center;font-size:12px;">${d.date}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.rsi_6  ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.rsi_9 ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.rsi_14 ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.rsi_20 ?? '-'}</td>
  </tr>`).join('');

  return `
    <div style="overflow-x:auto;overflow-y:auto;max-height:180px;">
      <table style="border-collapse:collapse;font-family:var(--mono);width:100%;">
      <thead>${headerRow}</thead>
      <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

function renderStockChartRsi(data, i) {
  if (!data || !data.success || !data.data || !data.data.length) return '<p>無相對強弱指標圖表資料</p>';

  const sorted = [...data.data].sort((a, b) => a.date.localeCompare(b.date));

  // 把資料暫存到 window，等 DOM 就緒後取用
  window._rsi_chartPending = window._rsi_chartPending || {};
  window._rsi_chartPending[i] = sorted;

  // 回傳容器，圖表由 setTimeout 在 DOM 就緒後掛入
  return `<div id="stock_rsi_chart_${i}" style="height:260px;"></div>`;
}

function renderStockKdj(data) {
  if (!data || !data.success || !data.data.length) return '<p>無隨機指標資料</p>';

  const headerRow = `
  <tr>
    <th style="position:sticky;left:0;top:0;z-index:3;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);">日期</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">K線（快速平均線）</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">D線（慢速平均線）</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">J線（方向線）</th>
  </tr>`;

  const bodyRows = data.data.map(d => `
  <tr style="border-bottom:1px solid var(--border);">
    <td style="position:sticky;left:0;z-index:1;background:#1a2332;padding:6px 10px;white-space:nowrap;text-align:center;font-size:12px;">${d.date}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.k  ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.d ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.j ?? '-'}</td>
  </tr>`).join('');

  return `
    <div style="overflow-x:auto;overflow-y:auto;max-height:180px;">
      <table style="border-collapse:collapse;font-family:var(--mono);width:100%;">
      <thead>${headerRow}</thead>
      <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

function renderStockChartKdj(data, i) {
  if (!data || !data.success || !data.data || !data.data.length) return '<p>無隨機指標圖表資料</p>';

  const sorted = [...data.data].sort((a, b) => a.date.localeCompare(b.date));

  // 把資料暫存到 window，等 DOM 就緒後取用
  window._kdj_chartPending = window._kdj_chartPending || {};
  window._kdj_chartPending[i] = sorted;

  // 回傳容器，圖表由 setTimeout 在 DOM 就緒後掛入
  return `<div id="stock_kdj_chart_${i}" style="height:260px;"></div>`;
}

function renderStockMacd(data) {
  if (!data || !data.success || !data.data.length) return '<p>無平滑異同移動平均線資料</p>';

  const headerRow = `
  <tr>
    <th style="position:sticky;left:0;top:0;z-index:3;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);">日期</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">MACD 線</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">信號線</th>
  </tr>`;

  const bodyRows = data.data.map(d => `
  <tr style="border-bottom:1px solid var(--border);">
    <td style="position:sticky;left:0;z-index:1;background:#1a2332;padding:6px 10px;white-space:nowrap;text-align:center;font-size:12px;">${d.date}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.macdLine  ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.signalLine ?? '-'}</td>
  </tr>`).join('');

  return `
    <div style="overflow-x:auto;overflow-y:auto;max-height:180px;">
      <table style="border-collapse:collapse;font-family:var(--mono);width:100%;">
      <thead>${headerRow}</thead>
      <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

function renderStockChartMacd(data, i) {
  if (!data || !data.success || !data.data || !data.data.length) return '<p>無平滑異同移動平均線圖表資料</p>';

  const sorted = [...data.data].sort((a, b) => a.date.localeCompare(b.date));

  // 把資料暫存到 window，等 DOM 就緒後取用
  window._macd_chartPending = window._macd_chartPending || {};
  window._macd_chartPending[i] = sorted;

  // 回傳容器，圖表由 setTimeout 在 DOM 就緒後掛入
  return `<div id="stock_macd_chart_${i}" style="height:280px;"></div>`;
}

function renderStockBrands(data) {
  if (!data || !data.success || !data.data.length) return '<p>無布林通道資料</p>';

  const headerRow = `
  <tr>
    <th style="position:sticky;left:0;top:0;z-index:3;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);">日期</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">上軌</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">中軌</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">下軌</th>
    <th style="position:sticky;top:0;z-index:2;background:#1a2332;padding:6px 10px;white-space:nowrap;border-bottom:1px solid var(--border);text-align:center;">股價</th>
  </tr>`;

  const bodyRows = data.data.map(d => `
  <tr style="border-bottom:1px solid var(--border);">
    <td style="position:sticky;left:0;z-index:1;background:#1a2332;padding:6px 10px;white-space:nowrap;text-align:center;font-size:12px;">${d.date}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.upper  ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.middle ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.lower ?? '-'}</td>
    <td style="padding:6px 10px;text-align:center;font-size:12px;">${d.price ?? '-'}</td>
  </tr>`).join('');

  return `
    <div style="overflow-x:auto;overflow-y:auto;max-height:180px;">
      <table style="border-collapse:collapse;font-family:var(--mono);width:100%;">
      <thead>${headerRow}</thead>
      <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

function renderStockChartBrands(data, i) {
  if (!data || !data.success || !data.data || !data.data.length) return '<p>無布林通道圖表資料</p>';

  const sorted = [...data.data].sort((a, b) => a.date.localeCompare(b.date));

  // 把資料暫存到 window，等 DOM 就緒後取用
  window._brands_chartPending = window._brands_chartPending || {};
  window._brands_chartPending[i] = sorted;

  // 回傳容器，圖表由 setTimeout 在 DOM 就緒後掛入
  return `<div id="stock_brands_chart_${i}" style="height:260px;"></div>`;
}

// 已讀清單：用 localStorage 儲存已點擊過的新聞連結
const WAR_READ_KEY = 'war_read_links';

function warReadSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(WAR_READ_KEY) || '[]'));
  } catch (e) {
    return new Set();
  }
}

function warMarkRead(link, source) {
  if (!link) return;
  const set = warReadSet();
  set.add(link);
  // 最多保留 500 筆，避免 localStorage 無限增長
  const arr = [...set].slice(-500);
  localStorage.setItem(WAR_READ_KEY, JSON.stringify(arr));

  // 即時更新對應的 DOM，將該新聞標記為已讀（文字改為「已讀」，標題變淡色）
  const row = document.querySelector(`[data-war-link="${CSS.escape(link)}"]`);
  if (row) {
    const badge = row.querySelector('.war-badge');
    const title = row.querySelector('.war-title');
    if (badge) badge.textContent = '已讀';
    if (title) badge.style.color = 'gray';
    if (title) title.style.color = 'var(--dim)';
  }

  if (source && (source.includes('自由時報') || source.includes('韓聯社'))) {
    Swal.fire({
      grow: "fullscreen",
      html: '<iframe src="' + link + '" frameborder="0" style="width:100%; height:80vh; display:block;"></iframe>',
      showCloseButton: true,
      showConfirmButton: false,
    });
  } else {
    location.href = link;
  }
}

// 國際政治新聞
async function loadNews() {
  let html = `<div class="card-title">國際政治新聞</div>`;

  try {
    const data = await fetch(WORKER + '/news-rss').then(r => r.json()).catch(() => ({
      success: false
    }));

    // if (data.ai_suggest && !data.ai_suggest.error) {
    //   const s = data.ai_suggest;
    //   const signalCls = s.signal === '看多' ? 'up' : s.signal === '看空' ? 'down' : '';
    //   html += `
    //   <div class="ai-suggest-block">
    //     <div class="ai-suggest-title">🤖 AI 市場訊號分析</div>
    //     <div class="ai-suggest-row">訊號：<span class="${signalCls}">${s.signal}</span></div>
    //     <div class="ai-suggest-row">風險：${s.risk}</div>
    //     <div class="ai-suggest-row">原因：${s.reason}</div>
    //   </div>
    //   `;
    // } else {
    //   html += `<div class="error-text">AI 分析暫時無法使用：${data.ai_suggest.error}</div>`;
    // }

    if (data.success && data.items && data.items.length > 0) {
      const readSet = warReadSet();

      data.items.forEach(item => {
        const isRead = item.link && readSet.has(item.link);

        // pubDate 轉台北時間（UTC+8）
        let pubDateTw = '';
        if (item.pubDate) {
          try {
            const d = new Date(item.pubDate);
            pubDateTw = d.toLocaleString('zh-TW', {
              timeZone: 'Asia/Taipei',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });
          } catch (e) {
            pubDateTw = item.pubDate;
          }
        }

        html += `
      <div data-war-link="${item.link ? item.link.replace(/"/g, '&quot;') : ''}" style="padding: 10px 0; border-bottom: 2px solid var(--border);">
      <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:5px;">
        <span class="war-badge" style="font-family:var(--mono); font-size:1rem; color:${isRead ? 'gray' : 'white'}; background:var(--muted); border-radius:3px; padding:1px 5px; flex-shrink:0;">${isRead ? '已讀' : '未讀'}</span>
        <div class="war-title" style="font-size: 1.2rem; color: ${isRead ? 'var(--dim)' : 'bisque'}; line-height: 1.5;">
        ${item.title || '（無標題）'}
        </div>
      </div>
      ${item.desc ? `
      <div style="font-size: .88rem; color: var(--dim); line-height: 1.55; margin-bottom: 6px;">
        ${item.desc}
      </div>` : ''}
      <div style="display:flex; flex-wrap:wrap; gap: 6px 16px; align-items:center;">
        ${item.link ? `
        <a rel="noopener noreferrer"
          onclick="warMarkRead('${item.link.replace(/'/g, "\\'")}', '${item.source}')"
          style="font-family: var(--mono); font-size: .72rem; color: var(--neutral); text-decoration: none; cursor: pointer;">
          點我看詳細 ↗
        </a>` : ''}
        <span style="font-family: var(--mono); font-size: .68rem; color: var(--dim);">
        🕐 ${pubDateTw || '—'}
        </span>
        ${item.source ? `
        <span style="font-family: var(--mono); font-size: .68rem; color: yellowgreen;">
          📰 ${item.source}
        </span>` : ''}
      </div>
      </div>`;
      });
    } else {
      html += `<div class="error-text">暫時無法取得新聞，請稍後再試</div>`;
    }
  } catch (e) {
    html += `<div class="error-text">載入失敗：${e.message}</div>`;
  }

  setCard('card-news', 0, html, 'card-wide');
}

// 美股行事曆
let calendarDataCache = null; // 儲存從 Worker 拿到的所有資料
let currentCalView = {
  year: new Date().getFullYear(),
  month: new Date().getMonth()
};

function onCalendarResize() {
  renderCalendarMode();
}

function renderCalendarMode() {
  // 根據目前的螢幕方向決定要渲染哪一種版型
  if (window.matchMedia('(orientation: portrait)').matches) {
    renderCalendarList();
  } else {
    renderCalendarView();
  }
}

async function loadAmericaCalendar() {
  const cardId = 'card-america-calendar';
  const container = document.getElementById(cardId);

  // 只有第一次加載或點擊重新整理時才 Fetch
  if (!calendarDataCache) {
    try {
      const res = await fetch(WORKER + '/america-calendar');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      calendarDataCache = data.items;

      // 檢查 MacroMicro 財報資料是否過期
      if (data.macroEarningsExpired) {
        showSweetAlert('warning', 'MacroMicro 財報資料已過期', `資料涵蓋範圍至：${data.macroEarningsEndDate}`);
      }

      // 檢查 MacroMicro 總經資料是否過期
      if (data.macroMacroExpired) {
        showSweetAlert('warning', 'MacroMicro 總經資料已過期', `資料涵蓋範圍至：${data.macroMacroEndDate}`);
      }

    } catch (e) {
      container.innerHTML = `<div class="card-title">美股行事曆</div><div class="error-text">載入失敗：${e.message}</div>`;
      return;
    }
  }

  renderCalendarMode(); // 剛進入頁面時直接根據當下的螢幕方向渲染適合的版型

  // 螢幕方向改變時重新渲染
  window.removeEventListener('resize', onCalendarResize); // 先移除舊的
  window.addEventListener('resize', onCalendarResize); // 再註冊新的
}

// 負責渲染特定月份的 HTML
function renderCalendarView() {
  const {
    year,
    month
  } = currentCalView;
  const cardId = 'card-america-calendar';

  const eventMap = {};
  calendarDataCache.forEach(item => {
    const dateKey = item.id.substring(0, 8);
    if (!eventMap[dateKey]) eventMap[dateKey] = [];
    eventMap[dateKey].push(item);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Intl.DateTimeFormat(navigator.language, {
    month: 'long'
  }).format(new Date(year, month));

  let html = `
  <div class="card-title">美股行事曆</div>
  <div class="calendar-header">
    <button class="calendar-nav-btn" onclick="changeMonth(-1)">◀</button>
    <div style="color:var(--accent);">${year} / ${String(month + 1).padStart(2, '0')}<!--（${monthName}）--></div>
    <button class="calendar-nav-btn" onclick="changeMonth(1)">▶</button>
  </div>
  <div class="calendar-grid">
    ${['日', '一', '二', '三', '四', '五', '六'].map(d => `<div class="calendar-day-head">${d}</div>`).join('')}
  `;

  // 填充空白
  for (let i = 0; i < firstDay; i++) html += `<div class="calendar-cell" style="opacity:0.1;"></div>`;

  // 填充日期
  const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}`;
    const isToday = dateKey === todayStr;
    const dayEvents = eventMap[dateKey] || [];

    html += `
    <div class="calendar-cell ${isToday ? 'today' : ''}">
    <div class="calendar-date-num">${day}</div>
    ${dayEvents.map(ev => {
      // 💡 這裡已經可以使用 ev.indicators 陣列了
      return ev.indicators.map(ind => `
      <div class="calendar-event" 
         style="background: ${ev.textColor}15; color: ${ev.textColor}; border-left: 2px solid ${ev.textColor}"
         onclick="gotoMoneyDJ('${ind.code}')">
        ${ev.type === 'market' ? '休' : ''}${ind.name}
      </div>
      `).join('');
    }).join('')}
    </div>`;
  }

  html += `</div>`;
  setCard(cardId, 0, html, 'card-wide');
}

function renderCalendarList() {
  const {
    year,
    month
  } = currentCalView;
  const cardId = 'card-america-calendar';

  const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, '');

  // 只取當月資料，依日期排序
  const monthPrefix = `${year}${String(month + 1).padStart(2, '0')}`;
  const monthItems = calendarDataCache
    .filter(item => item.id.substring(0, 6) === monthPrefix)
    .sort((a, b) => a.id.localeCompare(b.id));

  // 依日期分組
  const grouped = {};
  monthItems.forEach(item => {
    const dateKey = item.id.substring(0, 8);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(item);
  });

  let html = `
  <div class="card-title">美股行事曆</div>
  <div class="calendar-header">
    <button class="calendar-nav-btn" onclick="changeMonth(-1)">◀</button>
    <div style="color:var(--accent);">${year} / ${String(month + 1).padStart(2, '0')}</div>
    <button class="calendar-nav-btn" onclick="changeMonth(1)">▶</button>
  </div>
  <div style="display:flex; flex-direction:column; gap:8px; padding:4px 0;">
  `;

  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  Object.keys(grouped).sort().forEach(dateKey => {
    const day = parseInt(dateKey.substring(6, 8));
    const dateObj = new Date(year, month, day);
    const dayName = dayNames[dateObj.getDay()];
    const isToday = dateKey === todayStr;
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    html += `
    <div style="border-left: 3px solid ${isToday ? 'var(--accent)' : 'var(--border)'}; padding: 4px 8px;">
    <div style="font-size:0.8em; color:${isToday ? 'var(--accent)' : (isWeekend ? '#888' : 'var(--fg)')};
          margin-bottom:4px; font-weight:bold;">
      ${month + 1}/${day}（${dayName}）${isToday ? ' ◀ 今天' : ''}
    </div>
    ${grouped[dateKey].map(ev =>
      ev.indicators.map(ind => `
      <div class="calendar-event"
         style="background:${ev.textColor}15; color:${ev.textColor}; border-left:2px solid ${ev.textColor};
            margin-bottom:3px; padding:4px 6px;"
         onclick="gotoMoneyDJ('${ind.code}')">
        ${ev.type === 'market' ? '休 ' : ''}${ind.name}
      </div>
      `).join('')
    ).join('')}
    </div>
  `;
  });

  if (Object.keys(grouped).length === 0) {
    html += `<div style="color:#888; padding:12px;">本月無事件</div>`;
  }

  html += `</div>`;
  setCard(cardId, 0, html, 'card-wide');
}

// 切換月份函式
window.changeMonth = function(offset) {
  let newMonth = currentCalView.month + offset;
  let newYear = currentCalView.year;

  if (newMonth < 0) {
    newMonth = 11;
    newYear--;
  } else if (newMonth > 11) {
    newMonth = 0;
    newYear++;
  }

  currentCalView = {
    year: newYear,
    month: newMonth
  };
  renderCalendarMode(); // 切換月份時直接根據當下的螢幕方向渲染適合的版型
};

function gotoMoneyDJ(code = '') {
  if (code != '') {
    location.href = "https://www.moneydj.com/funddj/yl/BFRK01.djhtm?a=" + code;
  } else {
    // 
  }
}

const {
  isDaySession
} = getMarketEmoji();
var REFRESH_INTERVAL = 999; // 秒，改這個就通吃
if (isDaySession) {
  REFRESH_INTERVAL = 60; // 台股交易時間更新頻率較高
}
let _countdownTimer = null;

function startCountdown() {
  clearInterval(_countdownTimer);
  let count = REFRESH_INTERVAL;
  document.getElementById('countdown').textContent = count;

  _countdownTimer = setInterval(() => {
    count--;
    document.getElementById('countdown').textContent = count;
    if (count <= 0) {
      clearInterval(_countdownTimer);
      loadAll();
    }
  }, 1000);
}

async function writeLogs(tag, message) {
  try {
    await fetch(`${WORKER}/write-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tag,
        message
      })
    });
  } catch (e) {
    // log 失敗不影響主流程
  }
}

function showSweetAlert(icon = 'info', title = '', text = '') {
  Swal.fire({
    icon: icon,
    title: title,
    text: text,
    confirmButtonText: '確定',
    confirmButtonColor: '#0d6efd'
  });
}

function gotoHistock(behavior, symbol) {
  var link = 'https://histock.tw/stock/';
  Swal.fire({
    grow: "fullscreen",
    html: '<iframe src="' + link + behavior + '.aspx?no=' + symbol + '" frameborder="0" style="width:100%; height:80vh; display:block;"></iframe>',
    showCloseButton: true,
    showConfirmButton: false,
  });
}

function openMenu() {
  document.getElementById('slideMenu').classList.add('active');
  document.getElementById('menuOverlay').classList.add('active');
  document.body.style.overflow = 'hidden'; // 禁止 body 滾動
  // document.getElementById("slideMenu").style.width = "250px";
  // document.getElementById("header").style.marginLeft = "250px";
  // document.getElementById("grid").style.marginLeft = "250px";
}

function closeMenu() {
  document.getElementById('slideMenu').classList.remove('active');
  document.getElementById('menuOverlay').classList.remove('active');
  document.body.style.overflow = ''; // 恢復 body 滾動
  // document.getElementById("slideMenu").style.width = "0px";
  // document.getElementById("header").style.marginLeft = "0px";
  // document.getElementById("grid").style.marginLeft = "0px";
}

if (card_type == 'all') {
  function waitForElements(selectors, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const allFound = selectors.every(sel => document.querySelector(sel));
        if (allFound) {
          clearInterval(interval);
          resolve();
        }
      }, 200);

      setTimeout(() => {
        clearInterval(interval);
        reject(new Error('Tour elements not found in time'));
      }, timeout);
    });
  }

  const tourSelectors = [
    '#card-tw', '#card-america', '#card-asia',
    '#card-materials', '#card-sentiment', '#card-mystock',
    '#card-news', '#card-america-calendar',
  ];

  waitForElements(tourSelectors).then(() => {
    if (localStorage.getItem('tourDone')) return;

    const driver = window.driver.js.driver;

    const driverObj = driver({
      animate: true,
      showProgress: true,
      allowClose: true,
      nextBtnText: '下一步 →',
      prevBtnText: '← 上一步',
      doneBtnText: '完成 ✓',
      progressText: '{{current}} / {{total}}',

      // 關閉自動 scroll
      smoothScroll: false,

      // 每次切換步驟前，手動 scroll 到目標元素
      onHighlightStarted: (element) => {
        if (!element) return;

        setTimeout(() => {
          location.hash = '#' + element.id;
        }, 100);
      },

      onDestroyStarted: () => {
        localStorage.setItem('tourDone', '1');
        driverObj.destroy();
      },
      steps: [{
          element: '#card-tw',
          popover: {
            title: '台股市場概況',
            description: '針對台股市場的整體狀況進行分析，包含重要指數、外資買賣超與空單數等資訊',
          }
        },
        {
          element: '#card-america',
          popover: {
            title: '美股市場概況',
            description: '針對美股市場的整體狀況進行分析，包含重要指數、殖利率、重要科技股等資訊',
          }
        },
        {
          element: '#card-asia',
          popover: {
            title: '亞洲市場概況',
            description: '針對亞洲市場的整體狀況進行分析，包含日經225指數、韓國綜合指數等資訊',
          }
        },
        {
          element: '#card-materials',
          popover: {
            title: '原物料市場',
            description: '針對原物料市場的整體狀況進行分析，包含布蘭特原油、黃金、白銀、銅等資訊',
          }
        },
        {
          element: '#card-sentiment',
          popover: {
            title: '市場情緒',
            description: '針對市場情緒的整體狀況進行分析，包含恐慌指數、美元指數、匯率、聯準會利率等資訊',
          }
        },
        {
          element: '#card-mystock',
          popover: {
            title: '我的自選股',
            description: '針對我的自選股的整體狀況進行分析，包含股價、成交量、技術指標等資訊',
          }
        },
        {
          element: '#card-news',
          popover: {
            title: '國際政治新聞',
            description: '列出即時最新國際新聞、經濟動向等資訊',
          }
        },
        {
          element: '#card-america-calendar',
          popover: {
            title: '美股行事曆',
            description: '列出美股行事曆中相關的重要經濟事件、財報發布日等資訊',
          }
        },
      ]
    });

    driverObj.drive();

  }).catch(err => {
    showInfo('教學導覽略過：', err.message);
  });
}