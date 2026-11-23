/* Service worker WHL (app web). Dibuat alat/buat-pwa.mjs — jangan diedit tangan.
 * Menyimpan CANGKANG app saja (HTML/CSS/JS/ikon di folder ini). TIDAK PERNAH menyentuh panggilan ke server lain:
 * jawaban API (script.google.com), pengenal wajah (CDN), dan semua POST lewat langsung tanpa disimpan.
 * v3.20 (audit bug #8) cara ambil:
 *  - index.html / navigasi / versi.json: jaringan dulu (maks 3,5 dtk; halaman yang sudah tersimpan maks 1,2 dtk sejak v3.33) supaya versi baru langsung terpakai; gagal -> salinan di HP.
 *  - berkas ber-?v=<versi app ini> dan berkas cangkang lain (ikon, gambar, suara, pustaka): salinan HP dulu (instan), tanpa menunggu jaringan.
 *  - berkas ber-?v= versi LAIN (index baru, service worker lama): jaringan dulu supaya tidak tercampur versi.
 * v3.43 (audit 20 Nov #3): SATU sumber versi = VERSI konfig.js. Semua ?v= di index/absen/galat salinan PWA diseragamkan ke versi app
 *  saat dirakit (dulu ?v= lama per berkas -> 42/44 skrip lewat jaringan tiap buka, ±1,4 MB). Sekarang tiap buka = salinan HP (instan);
 *  unduh ulang hanya sekali saat versi app berubah (service worker baru dipasang).
 */
const VERSI = '46fe63276d', CACHE = 'whl-cangkang-' + VERSI, APPV = '3.48';
/* WEB PUSH (iPhone iOS 16.4+ dari Layar Utama, Chrome Android): Firebase Cloud Messaging. Pesan ber-"notification" ditampilkan otomatis
 * oleh pustaka Firebase; ketuk -> fcm_options.link (app web, ?buka=forum:ruang / tiket:lambung). */
try {
  importScripts('lib/firebase/firebase-app-compat.js', 'lib/firebase/firebase-messaging-compat.js');
  firebase.initializeApp({"apiKey":"AIzaSyB3Q5O6vnQcQfbpNNIbpWgJveXZO_NaSxw","authDomain":"whl-app-27862.firebaseapp.com","projectId":"whl-app-27862","storageBucket":"whl-app-27862.firebasestorage.app","messagingSenderId":"767196688829","appId":"1:767196688829:web:81f7db8ae4304250e1a2d4"});
  firebase.messaging();
} catch (e) { /* tanpa web push, cangkang app tetap jalan */ }
const BERKAS = ["./","index.html","absen.html","galat.html","gaya.css","tema-whl.css","gaya-absen.css","ikon.js","ilus3d.js","konfig.js","layar.js","tiruan.js","api.js","rasa.js","kuesioner.js","skema-rute.js","forum-konfig.js","forum.js","lib/firebase/firebase-app-compat.js","lib/firebase/firebase-auth-compat.js","lib/firebase/firebase-firestore-compat.js","lib/firebase/firebase-storage-compat.js","lib/firebase/firebase-messaging-compat.js","pasang.js","banner.js","biometrik.js","online.js","kegiatan.css","kegiatan.js","laptop.css","laptop.js","ultah.js","kuis.js","nota.js","nota-edit.js","laba.js","zoom-foto.js","katalog.js","idcard.js","karyawan.js","img/idcard-depan.jpg","img/idcard-belakang.jpg","driver.js","hazard.js","jalan.js","lib/qr-whl.js","gaji.js","kasbon.js","dokumen.js","lembur.js","izin.js","suara/whl_pesan.mp3","poin.js","peringkat.js","poin-staf.js","kuesioner-driver.js","suara/whl_tiket.mp3","suara/whl_pengumuman.mp3","ekspor.js","roster.js","hub.js","laporan-direksi.js","asisten.js","app.js","img/logo-whl.png","img/logo-whl-hitam.png","img/logo-whl-biru.png","img/logo-hadiah.jpg","ikon/ikon-192.png","ikon/ikon-512.png","ikon/ikon-maskable-512.png","ikon/apple-touch-icon.png","manifest.webmanifest"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BERKAS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n.startsWith('whl-cangkang-') && n !== CACHE).map((n) => caches.delete(n)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const q = e.request, u = new URL(q.url);
  if (q.method !== 'GET' || u.origin !== self.location.origin || !u.pathname.startsWith(new URL('./', self.location).pathname)) return; // bukan cangkang app: jangan ikut campur
  const v = u.searchParams.get('v'), nama = u.pathname.split('/').pop(), jaringanDulu = q.mode === 'navigate' || nama === '' || nama.endsWith('.html') || nama === 'versi.json' || (v && v !== APPV);
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    if (!jaringanDulu) { const ada = await c.match(q) || await c.match(q, { ignoreSearch: true }); if (ada) return ada; }
    try {
      const halaman = q.mode === 'navigate' || nama === '' || nama.endsWith('.html'), punya = halaman && !!(await c.match(q, { ignoreSearch: true })); /* v3.33: buka app dari Layar Utama = cepat (maks 1,2 dtk tunggu jaringan kalau salinan halaman sudah ada) */
      const batas = new Promise((_, tolak) => setTimeout(() => tolak(new Error('lama')), jaringanDulu ? (punya ? 1200 : 3500) : 8000));
      const r = await Promise.race([fetch(q, { cache: 'no-store' }), batas]);
      if (r && r.ok && (!v || v === APPV || jaringanDulu === false)) c.put(q, r.clone());
      return r;
    } catch (x) {
      const ada = await c.match(q, { ignoreSearch: true }) || (q.mode === 'navigate' ? await c.match('./index.html') : null);
      if (ada) return ada;
      throw x;
    }
  })());
});
