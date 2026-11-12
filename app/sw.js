/* Service worker WHL (app web). Dibuat alat/buat-pwa.mjs — jangan diedit tangan.
 * Menyimpan CANGKANG app saja (HTML/CSS/JS/ikon di folder ini). TIDAK PERNAH menyentuh panggilan ke server lain:
 * jawaban API (script.google.com), pengenal wajah (CDN), dan semua POST lewat langsung tanpa disimpan.
 * Cara ambil: jaringan dulu (maks 4 dtk) supaya versi baru langsung terpakai; kalau gagal / tidak ada sinyal -> salinan di HP.
 */
const VERSI = '2fb58c5a28', CACHE = 'whl-cangkang-' + VERSI;
const BERKAS = ["./","index.html","absen.html","galat.html","gaya.css","gaya-absen.css","konfig.js","tiruan.js","api.js","rasa.js","pasang.js","app.js","img/logo-whl.png","ikon/ikon-192.png","ikon/ikon-512.png","ikon/ikon-maskable-512.png","ikon/apple-touch-icon.png","manifest.webmanifest"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BERKAS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n.startsWith('whl-cangkang-') && n !== CACHE).map((n) => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const q = e.request, u = new URL(q.url);
  if (q.method !== 'GET' || u.origin !== self.location.origin || !u.pathname.startsWith(new URL('./', self.location).pathname)) return; // bukan cangkang app: jangan ikut campur
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const batas = new Promise((_, tolak) => setTimeout(() => tolak(new Error('lama')), 4000));
      const r = await Promise.race([fetch(q, { cache: 'no-store' }), batas]);
      if (r && r.ok) c.put(q, r.clone());
      return r;
    } catch (x) {
      const ada = await c.match(q, { ignoreSearch: true }) || (q.mode === 'navigate' ? await c.match('./index.html') : null);
      if (ada) return ada;
      throw x;
    }
  })());
});
