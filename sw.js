const CACHE_NAME = 'stock-v1';

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

// 推播通知接收事件（之後會用到）
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '即時報價';
  const options = {
    body: data.body || '有新的市場資訊',
    icon: '/stock/icon-192.png',
    badge: '/stock/icon-192.png',
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// 使用者點擊通知時觸發
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/stock/index.html')
  );
});