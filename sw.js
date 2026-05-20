// ── 汉字转拼音 PWA · Service Worker ──
const CACHE_VER  = 'pinyin-v2';
const CACHE_STATIC = CACHE_VER + '-static';
const CACHE_CDN    = CACHE_VER + '-cdn';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-192.png',
  '/icon-384.png',
  '/icon-512.png',
  '/screenshot-mobile.png',
  '/screenshot-mobile2.png'
];

const CDN_ASSETS = [
  'https://unpkg.com/pinyin-pro@3.18.2/dist/index.js'
];

// ── 安装：预缓存静态资源 ──
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_STATIC).then(c => c.addAll(STATIC_ASSETS)),
      caches.open(CACHE_CDN).then(c => c.addAll(CDN_ASSETS))
    ])
  );
  self.skipWaiting();
});

// ── 激活：清理旧缓存 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_CDN)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── 请求拦截策略 ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // CDN 资源：缓存优先
  if (url.hostname === 'unpkg.com') {
    event.respondWith(cacheFirst(event.request, CACHE_CDN));
    return;
  }

  // 同源 GET 请求：缓存优先，网络兜底
  if (event.request.method === 'GET' && url.origin === self.location.origin) {
    event.respondWith(
      cacheFirst(event.request, CACHE_STATIC).catch(() => offlineFallback())
    );
    return;
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && request.method === 'GET') {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function offlineFallback() {
  const cached = await caches.match('/offline.html');
  return cached || new Response(
    '<h1>离线中</h1><p>请检查网络连接后重试</p>',
    { headers: { 'Content-Type': 'text/html;charset=utf-8' } }
  );
}

// ── 推送通知（能力声明，PWABuilder 加分项）──
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || '汉字转拼音', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-96.png'
    })
  );
});
