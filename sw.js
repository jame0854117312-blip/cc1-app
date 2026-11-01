/* CC1 Study Lab — service worker
 * หน้าแอป: ดึงจากเน็ตก่อน (ได้เวอร์ชันล่าสุดเสมอ) ถ้าไม่มีเน็ตใช้ตัวที่เก็บไว้
 * ฟอนต์: เก็บไว้ใช้ออฟไลน์หลังเปิดครั้งแรก
 * Google Apps Script (คะแนน/บัญชี): ไม่เก็บ ส่งตรงเสมอ */
self.window = self;
try { importScripts('config.js'); } catch (e) {}
const VERSION = 'cc1-shell1';
const FONTS = 'cc1-fonts';
const RAW = 'cc1-raw';
const CORE = ['./', './index.html', './config.js', './transform-web.js', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './maskable-512.png', './apple-touch-icon.png'];

function prefetchRaw() {
  const api = (self.CC1_API || '').trim();
  if (!/^https:\/\/script\.google\.com\//.test(api)) return Promise.resolve();
  const req = new Request(api + '?raw=index', { credentials: 'omit', mode: 'cors' });
  return fetch(req).then(res => res.ok ? caches.open(RAW).then(c => c.put(req, res)) : null).catch(() => {});
}

self.addEventListener('install', e => {
  e.waitUntil(Promise.all([caches.open(VERSION).then(c => c.addAll(CORE)), prefetchRaw()]).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== FONTS && k !== RAW).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

async function networkFirst(req, key) {
  const cache = await caches.open(VERSION);
  try {
    const res = await Promise.race([fetch(req, { cache: 'no-store' }), timeout(4000)]);
    if (res && res.ok) cache.put(key || req, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(key || req)) || (await cache.match('./index.html')) || Response.error();
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* เนื้อหาบทเรียนจาก Apps Script: ใช้ตัวที่เก็บไว้ทันที แล้วอัปเดตเบื้องหลัง */
  if (url.hostname === 'script.google.com' && url.searchParams.get('raw') === 'index') {
    e.respondWith(caches.open(RAW).then(async c => {
      const hit = await c.match(req, { ignoreVary: true });
      const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; });
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net;
    }));
    return;
  }
  if (/(^|\.)script\.google\.com$|googleusercontent\.com$/.test(url.hostname)) return;

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; })
        .catch(() => hit || Response.error());
      return hit || net;
    }));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, './index.html')); return; }
  if (/\/(config\.js|manifest\.webmanifest)$/.test(url.pathname)) { e.respondWith(networkFirst(req)); return; }

  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
    return res;
  })));
});
