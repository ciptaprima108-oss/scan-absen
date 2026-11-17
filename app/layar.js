/* WHL App v3.33 — layar.js (WHL_LAYAR), Andro 17 Nov 2026. Permintaan Reza:
 *  1) Forum/layar lapis di iPhone kacau sesudah keyboard / balik dari app lain (nav & kolom tulis naik ke tengah, Beranda tembus,
 *     area kosong bisa digulir, status bar menimpa chat). Sebab: halaman (body) ikut tergulir + tinggi layar iOS basi.
 *     Perbaikan: selama ada layar .lapis terbuka, gulir body DIKUNCI (cuma isi lapis yang bergulir), posisi Beranda disimpan & dipulihkan;
 *     keyboard iPhone diukur lewat visualViewport (--vvTinggi/--vvAtas, kelas vv-kb + kb-buka) jadi kolom tulis pas di atas keyboard;
 *     waktu app ke latar keyboard ditutup dulu, waktu kembali posisi gulir & ukuran layar dihitung ulang.
 *  2) Balik dari app lain = langsung terbuka seperti WA/IG: layar terakhir (tab + forum) diingat 4 jam walau HP mematikan app di latar,
 *     akun biometrik tidak diminta Face ID / sidik jari lagi selama belum 4 jam tidak dibuka (K.JAM_KUNCI). Lewat 4 jam = masuk lagi.
 * Tanpa reload, tanpa alert. */
(function () {
  'use strict';
  var H = document.documentElement, vv = window.visualViewport, K = window.WHL_KONFIG || {};
  var JAM = Number(K.JAM_KUNCI) > 0 ? Number(K.JAM_KUNCI) : 4, BATAS = JAM * 3600000;
  var K_AKTIF = 'whlV2Aktif', K_SESI = 'whlV2SesiBioL', K_LAYAR = 'whlV2LayarL';
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* */ } return null; }
  function sekarang() { return Date.now(); }

  /* ---------- 1. kunci gulir body selama ada .lapis ---------- */
  var terkunci = false, yKunci = 0, maks = Math.max(window.innerHeight || 0, vv ? vv.height : 0);
  function adaLapis() { return !!document.querySelector('body > .lapis'); }
  function kunci(on) {
    if (on === terkunci || !document.body) return; terkunci = on; var b = document.body;
    if (on) { yKunci = window.pageYOffset || 0; b.style.top = (-yKunci) + 'px'; H.classList.add('kunci-gulir'); }
    else { H.classList.remove('kunci-gulir'); b.style.top = ''; window.scrollTo(0, yKunci); }
  }
  function aktifIsian() { var a = document.activeElement; return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable) && !/^(button|checkbox|radio|file|range|submit)$/i.test(a.type || '')); }
  function ukur() {
    var t = vv ? vv.height : window.innerHeight, a = vv ? vv.offsetTop : 0, ih = window.innerHeight;
    maks = Math.max(maks, ih, t);
    H.style.setProperty('--vvTinggi', Math.round(t) + 'px'); H.style.setProperty('--vvAtas', Math.round(a) + 'px');
    var kbVv = !!vv && t < maks * 0.78 && aktifIsian(), kbIh = ih < maks * 0.78; /* iPhone: cuma visualViewport yang mengecil; Android: innerHeight */
    H.classList.toggle('vv-kb', kbVv); H.classList.toggle('kb-buka', kbVv || kbIh);
  }
  function pulih() { /* sesudah keyboard tutup / app kembali: buang geseran halaman yang tertinggal */
    if (aktifIsian()) { ukur(); return; }
    if (terkunci && (window.pageYOffset || (vv && vv.offsetTop))) window.scrollTo(0, 0);
    ukur();
  }
  var jadwal = 0; function pulihNanti() { clearTimeout(jadwal); jadwal = setTimeout(pulih, 120); }
  function pantau() {
    kunci(adaLapis());
    try { new MutationObserver(function () { kunci(adaLapis()); }).observe(document.body, { childList: true }); } catch (e) { /* */ }
  }
  if (document.body) pantau(); else document.addEventListener('DOMContentLoaded', pantau);
  if (vv) { vv.addEventListener('resize', function () { ukur(); if (!aktifIsian()) pulihNanti(); }); vv.addEventListener('scroll', ukur); }
  window.addEventListener('resize', ukur);
  window.addEventListener('orientationchange', function () { maks = 0; setTimeout(ukur, 400); });
  document.addEventListener('focusin', function () { setTimeout(ukur, 60); setTimeout(ukur, 400); });
  document.addEventListener('focusout', function () { setTimeout(function () { if (!aktifIsian()) pulih(); }, 80); setTimeout(pulih, 450); });
  ukur();

  /* ---------- 2. kembali dari app lain ---------- */
  var tSembunyi = 0, lamaCb = [];
  function tandaiAktif() { ls(K_AKTIF, String(sekarang())); }
  function simpanLayar() {
    var tab = ''; try { tab = sessionStorage.getItem('whlV2Tab') || ''; } catch (e) { /* */ }
    ls(K_LAYAR, JSON.stringify({ tab: tab, forum: H.classList.contains('forum-buka'), t: sekarang() }));
  }
  function keLatar() {
    tSembunyi = sekarang(); tandaiAktif(); simpanLayar();
    try { var a = document.activeElement; if (a && aktifIsian()) a.blur(); } catch (e) { /* */ } /* keyboard ditutup sebelum ke latar: kembali tidak tertinggal tinggi layar keyboard */
  }
  function kembali() {
    var lama = tSembunyi && sekarang() - tSembunyi >= BATAS; tSembunyi = 0; tandaiAktif();
    pulih(); setTimeout(pulih, 300); setTimeout(pulih, 900);
    if (lama) lamaCb.forEach(function (f) { try { f(); } catch (e) { /* */ } });
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) keLatar(); else kembali(); });
  window.addEventListener('pagehide', keLatar);
  window.addEventListener('pageshow', function (e) { if (e.persisted) kembali(); else pulih(); });
  setInterval(function () { if (!document.hidden) tandaiAktif(); }, 60000);
  function segar() { var t = Number(ls(K_AKTIF) || 0); return t > 0 && sekarang() - t < BATAS; }

  window.WHL_LAYAR = {
    jam: JAM,
    segar: segar, /* true = app terakhir dibuka < JAM jam lalu */
    /* sesi akun biometrik (di HP aslinya cuma hidup selama app terbuka): disalin supaya app yang dimatikan HP di latar tidak minta biometrik lagi < JAM jam */
    simpanSesi: function (s) { ls(K_SESI, s ? JSON.stringify(s) : null); },
    ambilSesi: function () { if (!segar()) { ls(K_SESI, null); return null; } try { var s = JSON.parse(ls(K_SESI) || 'null'); return s && s.user ? s : null; } catch (e) { return null; } },
    layarTerakhir: function () { if (!segar()) return null; try { return JSON.parse(ls(K_LAYAR) || 'null'); } catch (e) { return null; } },
    saatLama: function (f) { if (typeof f === 'function') lamaCb.push(f); }, /* app tetap hidup di latar >= JAM jam lalu dibuka lagi */
    pulih: pulih, _uji: { kunci: function () { return terkunci; }, keLatar: keLatar, kembali: kembali, mundurkan: function (ms) { tSembunyi -= ms; ls(K_AKTIF, String(Number(ls(K_AKTIF) || sekarang()) - ms)); } }
  };
  /* catatan: K_AKTIF TIDAK ditulis saat app dibuka; mulai() di app.js membaca segar() dulu, baru detak 60 dtk / ke latar menimpanya */
})();
