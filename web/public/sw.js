/*
 * Kill-switch service worker.
 *
 * 2anki.net was served from Netlify with vite-plugin-pwa (registerType
 * 'autoUpdate') until 2025-10-21. Visitors during that window registered a
 * Workbox service worker at https://2anki.net/sw.js that precached the whole
 * app shell. After 2anki.net moved off Netlify, that worker keeps answering
 * navigations from its stale precache: Convert fails with a 404 and the UI
 * never updates, no matter how many times the user reloads.
 *
 * The current app registers no service worker. This file exists only so those
 * stale registrations pick it up on their next update check (browsers re-fetch
 * the top-level SW script bypassing the HTTP cache). It wipes every cache,
 * unregisters itself, and reloads any open windows onto the live site — so a
 * stranded install recovers the next time it is opened online. It never
 * intercepts fetches (no fetch handler), so it is inert for everyone whose
 * browser was not already carrying the old registration.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      await self.clients.claim();
      const windows = await self.clients.matchAll({ type: 'window' });
      await Promise.all(
        windows.map((client) => client.navigate(client.url).catch(() => {})),
      );
      await self.registration.unregister();
    })(),
  );
});
