/* WHL App sebagai APP WEB (PWA) — dipakai iPhone lewat "Tambahkan ke Layar Utama" (gratis, tanpa App Store / TestFlight).
 * File ini diam di dalam APK (Capacitor): semua isinya hanya jalan kalau halaman dibuka dari browser.
 *   1. daftar service worker (sw.js): cangkang app tersimpan di HP, update terpasang sendiri
 *   2. petunjuk pasang: iPhone Safari = gambar langkah Bagikan -> Tambahkan ke Layar Utama; Android Chrome = tombol Pasang
 */
(function () {
  'use strict';
  var native = false; try { native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()); } catch (e) { /* */ }
  if (native) return;
  var ua = navigator.userAgent || '';
  var iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var safari = iOS && !/CriOS|FxiOS|EdgiOS|OPiOS|Instagram|FBAN|FBAV|Line\/|WhatsApp/.test(ua);
  var berdiri = false; try { berdiri = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { /* */ }
  document.documentElement.classList.toggle('pwa', berdiri);

  /* ---------- service worker ---------- */
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (r) {
        document.documentElement.setAttribute('data-sw', 'terdaftar');
        try { r.update(); } catch (e) { /* */ }
        var sudah = false;
        navigator.serviceWorker.addEventListener('controllerchange', function () { if (sudah || !navigator.serviceWorker.controller) return; sudah = true; document.documentElement.setAttribute('data-sw', 'baru'); }); // versi baru aktif; dipakai saat app dibuka berikutnya
      }, function () { document.documentElement.setAttribute('data-sw', 'gagal'); });
    });
  }

  /* ---------- petunjuk pasang ---------- */
  var tunda = null; // event beforeinstallprompt (Android Chrome)
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lembar(html) {
    var d = document.createElement('div'); d.className = 'tirai buka'; d.innerHTML = '<div class="lembar"><div class="pegangan"></div>' + html + '</div>';
    document.body.appendChild(d);
    d.addEventListener('click', function (ev) { if (ev.target === d || ev.target.closest('[data-tutup]')) d.remove(); });
    return d;
  }
  var IKON_BAGI = '<svg viewBox="0 0 24 24" class="ikP"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  var IKON_TAMBAH = '<svg viewBox="0 0 24 24" class="ikP"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.500v7M8.500 12h7"/></svg>';
  function langkah(n, ikon, judul, ket) { return '<div class="lkP"><i>' + n + '</i>' + ikon + '<div><b>' + judul + '</b><span>' + ket + '</span></div></div>'; }
  function tampil() {
    if (berdiri) return;
    if (iOS && !safari) {
      lembar('<h3>Buka di Safari dulu</h3><div class="kecil" style="font-size:14px;margin:4px 0 14px">Di iPhone, app ini cuma bisa dipasang lewat <b>Safari</b>. Salin alamat halaman ini, buka Safari, tempel, lalu ikuti petunjuk pasang.</div><button type="button" class="tUtama" style="margin-top:0" data-tutup="1">Mengerti</button>');
      return;
    }
    if (iOS) {
      lembar('<h3>Pasang WHL di layar utama</h3><div class="kecil" style="font-size:14px;margin:4px 0 12px">Supaya terbuka seperti aplikasi (layar penuh, ikon WHL), lakukan sekali saja:</div>'
        + langkah(1, IKON_BAGI, 'Ketuk tombol Bagikan', 'Kotak dengan panah ke atas, di bawah layar Safari.')
        + langkah(2, IKON_TAMBAH, 'Pilih "Tambahkan ke Layar Utama"', 'Geser daftar ke bawah kalau belum kelihatan.')
        + langkah(3, '<img src="ikon/ikon-192.png" alt="" class="ikP" style="border-radius:9px">', 'Ketuk "Tambah"', 'Ikon WHL muncul di layar utama. Buka dari situ, lalu masuk dengan PIN.')
        + '<button type="button" class="tUtama" data-tutup="1">Mengerti</button>');
      return;
    }
    if (tunda) { var e = tunda; tunda = null; e.prompt(); return; }
    lembar('<h3>Pasang WHL di layar utama</h3><div class="kecil" style="font-size:14px;margin:4px 0 12px">Di Chrome Android: ketuk <b>titik tiga</b> di kanan atas, lalu pilih <b>Instal aplikasi</b> / <b>Tambahkan ke layar utama</b>.</div><button type="button" class="tUtama" style="margin-top:0" data-tutup="1">Mengerti</button>');
  }
  function pita() {
    if (berdiri || document.getElementById('pitaPasang')) return;
    var sudah = ''; try { sudah = localStorage.getItem('whlPwaPetunjuk') || ''; } catch (e) { /* */ }
    var p = document.createElement('div'); p.id = 'pitaPasang'; p.className = 'pitaPasang' + (sudah ? ' kecilP' : '');
    p.innerHTML = '<img src="ikon/ikon-192.png" alt=""><div><b>Pasang WHL di HP</b><span>' + esc(iOS ? 'Buka seperti aplikasi, tanpa App Store.' : 'Buka seperti aplikasi, tanpa Play Store.') + '</span></div><button type="button" class="tKecil" data-p="pasang">' + (iOS ? 'Caranya' : 'Pasang') + '</button><button type="button" class="tutupP" data-p="tutup" aria-label="Tutup">×</button>';
    document.body.appendChild(p);
    p.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-p]'); if (!b) return;
      try { localStorage.setItem('whlPwaPetunjuk', '1'); } catch (e) { /* */ }
      if (b.getAttribute('data-p') === 'pasang') tampil();
      p.remove();
    });
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); tunda = e; pita(); });
  window.addEventListener('appinstalled', function () { var p = document.getElementById('pitaPasang'); if (p) p.remove(); });
  /* banner sekali (iPhone: langsung; Android: saat Chrome bilang bisa dipasang). Sesudah pernah ditutup tidak muncul sendiri lagi; tetap bisa lewat Profil > Pengaturan. */
  window.addEventListener('load', function () {
    var sudah = ''; try { sudah = localStorage.getItem('whlPwaPetunjuk') || ''; } catch (e) { /* */ }
    if (iOS && !berdiri && !sudah) setTimeout(pita, 1200);
  });
  window.WHL_PASANG = { tampil: tampil, bisa: function () { return !berdiri; }, berdiri: function () { return berdiri; } };
})();
