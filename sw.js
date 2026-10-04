// Service worker: трекер открывается мгновенно в любой сети, в том числе без интернета.
// Всё берётся «сначала из запаса». Запас — это целая версия трекера с номером CACHE.
// Обновление: новый номер → телефон при открытии в фоне скачивает ВСЮ новую версию
// в отдельный запас и переключается на неё, только когда скачано всё. Версии не смешиваются.
// ПРАВИЛО: любое изменение файлов сайта → поднять номер CACHE (иначе телефон его не получит);
// добавила или удалила файл → ещё и поправить список FILES.
const CACHE = 'diary-v5';
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/tokens.css',
  'css/base.css',
  'css/components.css',
  'js/app.js',
  'js/db.js',
  'js/model.js',
  'js/format.js',
  'js/stats.js',
  'js/backup.js',
  'js/ui/dom.js',
  'js/ui/chips.js',
  'js/ui/forms.js',
  'js/ui/entry.js',
  'js/ui/summary.js',
  'js/ui/feed.js',
  'js/ui/more.js',
  'js/ui/backup-actions.js',
  'js/ui/swipe.js',
  'js/ui/entry-actions.js',
  'assets/cat-crying.png',
  'assets/cat-angry.png',
  'assets/cat-scared.png',
  'assets/cat-tired.png',
  'assets/cat-wideeyed.png',
  'assets/flower.png',
  'assets/heart.png',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' — мимо 10-минутного запаса браузера, чтобы взять именно новую версию.
  // addAll — всё или ничего: если хоть один файл не скачался, остаётся прежняя версия.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Локальный сервер разработки (порт 8000 из .claude/launch.json): нужны свежие файлы
// после каждой правки, поэтому там сначала сеть, а запас — только когда сервер выключен.
const DEV = self.location.hostname === '127.0.0.1' && self.location.port === '8000';

async function fromCache(cache, request) {
  return (await cache.match(request, { ignoreSearch: true }))
    ?? (request.mode === 'navigate' ? cache.match('index.html') : undefined);
}

async function fromCacheOrNetwork(request) {
  const cache = await caches.open(CACHE);
  if (DEV) {
    try {
      return await fetch(request, { cache: 'no-cache' });
    } catch {
      return (await fromCache(cache, request)) ?? Response.error();
    }
  }
  return (await fromCache(cache, request)) ?? fetch(request); // не из версии (страница тестов) — из сети
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(fromCacheOrNetwork(request));
});
