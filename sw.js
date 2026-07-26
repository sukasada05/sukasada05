// sw.js - Service Worker untuk DUKOPS
const CACHE_NAME = 'dukops-v4';
const BASE_PATH = '/dukops4/';

const urlsToCache = [
    BASE_PATH,
    BASE_PATH + 'index.html',
    BASE_PATH + 'styles.css',
    BASE_PATH + 'app.js',
    BASE_PATH + 'css/main.css',
    BASE_PATH + 'icons/favicon-96x96.png',
    BASE_PATH + 'icons/favicon.svg',
    BASE_PATH + 'site.webmanifest',
    BASE_PATH + 'LOGO KOREM163 Wirasatya.png',
    BASE_PATH + 'army.gif'
];

// ============================================================
// INSTALL - Caching assets
// ============================================================
self.addEventListener('install', event => {
    console.log('🔧 SW Install event triggered');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Caching DUKOPS assets...');
                return cache.addAll(urlsToCache)
                    .then(() => {
                        console.log('✅ All assets cached successfully!');
                    })
                    .catch(err => {
                        console.error('❌ Failed to cache some assets:', err);
                    });
            })
            .then(() => {
                console.log('✅ SW Install complete, skipWaiting...');
                return self.skipWaiting();
            })
    );
});

// ============================================================
// ACTIVATE - Clean old caches
// ============================================================
self.addEventListener('activate', event => {
    console.log('🔧 SW Activate event triggered');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ SW Activated, claiming clients...');
            return self.clients.claim();
        })
    );
});

// ============================================================
// FETCH - Cache-first strategy
// ============================================================
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // Skip cross-origin requests
    if (url.origin !== self.location.origin) {
        return;
    }

    console.log('🌐 Fetching:', url.pathname);

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('✅ Cache hit:', url.pathname);
                    return response;
                }
                console.log('📡 Network fetch:', url.pathname);
                return fetch(event.request).catch(() => {
                    console.log('⚠️ Offline fallback for:', url.pathname);
                    return new Response(`
                        <!DOCTYPE html>
                        <html lang="id">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>DUKOPS - Offline</title>
                            <style>
                                * { margin:0; padding:0; box-sizing:border-box; }
                                body {
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                                    background: #0a1a0a;
                                    color: #e0e8e0;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    min-height: 100vh;
                                    padding: 20px;
                                    text-align: center;
                                }
                                .offline-box {
                                    background: #1a2a1a;
                                    border: 2px solid #4CAF50;
                                    border-radius: 16px;
                                    padding: 40px;
                                    max-width: 400px;
                                    width: 100%;
                                }
                                .offline-icon { font-size: 64px; margin-bottom: 20px; }
                                h1 { color: #4CAF50; font-size: 24px; margin-bottom: 10px; }
                                p { color: #889988; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
                                .btn-retry {
                                    background: #4CAF50;
                                    color: #0a1a0a;
                                    border: none;
                                    padding: 12px 30px;
                                    border-radius: 8px;
                                    font-size: 16px;
                                    font-weight: bold;
                                    cursor: pointer;
                                }
                                .btn-retry:hover { background: #66bb6a; }
                                .status { font-size: 12px; color: #556655; margin-top: 15px; }
                            </style>
                        </head>
                        <body>
                            <div class="offline-box">
                                <div class="offline-icon">📡</div>
                                <h1>DUKOPS BABINSA</h1>
                                <p>Anda sedang <strong>offline</strong>.<br>Silakan periksa koneksi internet Anda.</p>
                                <button class="btn-retry" onclick="location.reload()">🔄 COBA LAGI</button>
                                <div class="status">KORAMIL 1609-05/SUKASADA</div>
                            </div>
                        </body>
                        </html>
                    `, {
                        status: 200,
                        headers: { 'Content-Type': 'text/html' }
                    });
                });
            })
    );
});

console.log('📱 DUKOPS Service Worker loaded (v4)');
console.log('📦 Cache name:', CACHE_NAME);
