// public/sw.js

// ===== Настройки кэша =====
const VERSION = 'v1'; // можешь поменять при необходимости
const HTML_CACHE   = `html-${VERSION}`;
const ASSETS_CACHE = `assets-${VERSION}`;
const OTHER_CACHE  = `other-${VERSION}`;

const STATIC_PRECACHE = [
  '/',             // корневая страница
  '/manifest.json',
  '/favicon.ico',
];

// ===== Установка (precache базового) =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(HTML_CACHE);
        await cache.addAll(STATIC_PRECACHE);
      } catch (e) {
        // если офлайн в первый раз — просто пропустим
      }
    })()
  );
  // Важное: НЕ делаем skipWaiting здесь,
  // мы управляем обновлением осознанно через сообщение { type: 'SKIP_WAITING' }
});

// ===== Активация (очистка старых кэшей + захват клиентов) =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // удалить все кэши, кроме текущих
      const keys = await caches.keys();
      const allow = new Set([HTML_CACHE, ASSETS_CACHE, OTHER_CACHE]);
      await Promise.all(
        keys
          .filter((k) => !allow.has(k))
          .map((k) => caches.delete(k))
      );

      // новый SW сразу управляет открытыми вкладками
      await self.clients.claim();
    })()
  );
});

// ===== Помощники =====
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const resp = await fetch(request);
  // только GET и успешные ответы кладём в кэш
  if (request.method === 'GET' && resp && resp.status === 200) {
    try { await cache.put(request, resp.clone()); } catch {}
  }
  return resp;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(request);
    if (request.method === 'GET' && resp && resp.status === 200) {
      try { await cache.put(request, resp.clone()); } catch {}
    }
    return resp;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // офлайн-заглушка для навигации, если ничего нет
    if (request.mode === 'navigate') {
      return new Response('<h1>Offline</h1><p>No cached page.</p>', {
        headers: { 'Content-Type': 'text/html; charset=UTF-8' },
        status: 200,
      });
    }
    throw new Error('Network and cache both failed');
  }
}

// ===== Политика запросов =====
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Ничего не делаем для не-GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) Всегда сеть для Supabase (и других API) — без кэширования
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/')
  ) {
    return; // пропускаем — пусть идёт напрямую
  }

  // 2) Внешние домены (google fonts и т.п.)
  if (url.origin !== self.location.origin) {
    // Google Maps/JS — сеть
    if (
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('maps.googleapis.com')
    ) {
      return; // network-only
    }
    // Для остальных внешних — можно Cache-First как "other"
    event.respondWith(cacheFirst(req, OTHER_CACHE));
    return;
  }

  // 3) HTML навигация — Network-First (получить самый свежий shell)
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, HTML_CACHE));
    return;
  }

  // 4) Статика next: /_next/* (js/css/chunks) — Cache-First
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(cacheFirst(req, ASSETS_CACHE));
    return;
  }

  // 5) Файлы статики по расширениям — Cache-First
  if (/\.(?:js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|webp|ico)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(req, ASSETS_CACHE));
    return;
  }

  // 6) По умолчанию — Network-First (подходит для редких html/json ресурсов)
  event.respondWith(networkFirst(req, OTHER_CACHE));
});

// ===== Сообщения от страницы (обновление SW) =====
self.addEventListener('message', (event) => {
  const msg = event && event.data;
  if (!msg) return;

  // Принудительно применяем новую версию SW
  if (msg.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
