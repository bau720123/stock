const CACHE_NAME = 'stock-v3';

// 安裝事件：Service Worker 第一次註冊時觸發
self.addEventListener('install', event => {
  console.log('[SW] 安裝完成');
  self.skipWaiting(); // 立即啟用，不等舊版退場
});

// 啟動事件：Service Worker 接管頁面時觸發
self.addEventListener('activate', event => {
  console.log('[SW] 已啟動');
  event.waitUntil(clients.claim()); // 立即接管所有頁面
});

// 推播通知接收事件
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // 純文字的情況（例如 DevTools 測試）
    data = { body: event.data ? event.data.text() : '有新的市場資訊' };
  }

  const title = data.title || '即時報價';
  const options = {
    body:     data.body || '有新的市場資訊',
    icon:     '/stock/icon-192.png',
    badge:    '/stock/icon-192.png',
    // image:    data.image  || '/stock/banner.png',
    tag: data.title || '即時報價',
    renotify: true,
    silent:   false,
    vibrate:  [200, 100, 200],
    actions:  data.actions || [
      { action: 'view',    title: '查看詳情' },
      { action: 'dismiss', title: '忽略' },
    ],
    data: { url: data.url || '/stock/index.html' },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 使用者點擊通知時觸發
// self.addEventListener('notificationclick', event => {
//   event.notification.close();
//   if (event.action === 'dismiss') return; // 忽略就直接關掉
//   const url = event.notification.data?.url || '/stock/index.html';
//   event.waitUntil(clients.openWindow(url));
// });
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const action = event.action || '(點擊通知本身)';

  event.waitUntil(
    fetch(`https://billowing-queen-4a58.bau720123.workers.dev/log?action=${encodeURIComponent(action)}`)
      .then(() => {
        if (event.action === 'dismiss') return;
        const url = event.notification.data?.url || '/stock/index.html';
        return clients.openWindow(url);
      })
  );
});