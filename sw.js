// Service worker: запоминает файлы трекера, чтобы он открывался без интернета.
// Стратегия «сначала сеть»: есть интернет — берём свежие файлы (и обновляем запас),
// нет интернета или сеть молчит дольше 3 секунд — отдаём сохранённые.
const CACHE = 'diary-v1';
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
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    // no-cache: всегда спрашиваем сервер «файл поменялся?» (без этого GitHub Pages
    // разрешает браузеру 10 минут отдавать старую копию, и обновления опаздывают).
    const response = await withTimeout(fetch(request, { cache: 'no-cache' }), 3000);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const page = await cache.match('index.html');
      if (page) return page;
    }
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});
