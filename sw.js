/* =========================================================================
 * Quanta — service worker (public repo)
 * Minimal & safe: caches only the lock-screen shell (same-origin GET) with a
 * network-first strategy so the app opens fast and still works offline for the
 * shell. It NEVER intercepts or caches api.github.com — the token must only
 * ever reach GitHub directly, over HTTPS.
 * ========================================================================= */
'use strict';
var CACHE = 'quanta-shell-v25';
var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.svg?v=25',
  './apple-touch-icon.png?v=25',
  './icon-192.png?v=25',
  './icon-512.png?v=25',
  './maskable-512.png?v=25',
  './favicon-32.png?v=25'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  // Only handle same-origin requests — never touch api.github.com or anything else.
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      if (res && res.ok && url.pathname.indexOf('/api/') !== 0) {
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (cached) {
        return cached || caches.match('./index.html');
      });
    })
  );
});
