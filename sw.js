const CACHE_NAME = 'uni-planner-v2';

// تحديث القائمة لتشمل الملفات الجديدة المقسمة
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
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(assets)));
});

self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});
