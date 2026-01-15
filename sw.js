const CACHE_NAME = 'uni-planner-v3'; // تغيير الرقم هنا إلزامي لإجبار iOS على التحديث
const assets = [
    './',
    './index.html',
    './style.css',
    './config.js',
    './storage.js',
    './utils.js',
    './ui-manager.js',
    './calendar-engine.js',
    './app.js',
    './manifest.json'
];

self.addEventListener('install', e => {
    // فرض التحديث الفوري دون انتظار إغلاق التبويبات
    self.skipWaiting(); 
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(assets)));
});

self.addEventListener('activate', e => {
    // حذف أي Cache قديم تماماً
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => { if (key !== CACHE_NAME) return caches.delete(key); })
        ))
    );
    return self.clients.claim();
});

self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
