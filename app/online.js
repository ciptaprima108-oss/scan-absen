/* WHL App v3.9 — "Sedang online / Baru aktif" (permintaan Reza 13 Nov; keputusan final: dilihat semua staf).
 * Tiap staf (app terbuka) menulis dokumen Firestore aktif/{uid} miliknya sendiri: nama, jabatan, peran, platform, waktu server, online.
 *  - ditulis saat app dibuka, kembali dari latar, dan tiap 2 menit selama app terlihat (±30 staf x 8 jam x 30/jam ≈ 7.200 tulis/hari, kuota Spark 20.000)
 *  - saat Keluar akun / app ke latar: online=false. Pilihan di Akun "Tampilkan status online saya" (bawaan nyala) -> mati = dokumen dihapus.
 * Yang boleh MEMBACA daftar = semua staf yang login (keputusan final Reza 13 Nov). Driver tidak ada di app.
 */
(function () {
  'use strict';
  var Simpan = window.WHL_API.Simpan, KUNCI = 'whlOnlineTampil', tampil = true, LIST = null, waktuMuat = 0, detak = null, CTX = null;
  Simpan.ambil(KUNCI).then(function (v) { tampil = v !== '0'; });
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fs() { return window.WHL_FORUM && window.WHL_FORUM.fs(); }
  function pimpinan() { return !!fs(); } /* KEPUTUSAN FINAL Reza 13 Nov: daftar online boleh dilihat SEMUA staf yang login */
  function platform() { try { if (window.Capacitor && window.Capacitor.isNativePlatform()) return 'android'; } catch (e) { /* */ } return /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'iphone' : 'web'; }
  function tulis(online) {
    var F = fs(); if (!F || !CTX || !CTX.sesi()) return Promise.resolve();
    var ref = F.db.collection('aktif').doc(F.info.uid);
    if (!tampil) return ref.delete().catch(function () { });
    var S = CTX.sesi();
    return ref.set({ nama: F.info.nama, peran: F.info.peran, jabatan: String(S.jabatan || '').slice(0, 80), platform: platform(), online: !!online, waktu: F.FV.serverTimestamp() }).catch(function () { });
  }
  function mulai(ctx) {
    CTX = ctx; clearInterval(detak);
    var tunggu = 0, i = setInterval(function () { if (fs() || ++tunggu > 60) { clearInterval(i); if (fs()) { tulis(true); if (pimpinan()) muat(); } } }, 500);
    detak = setInterval(function () { if (!document.hidden && fs()) { tulis(true); if (pimpinan()) muat(); } }, 120000);
  }
  document.addEventListener('visibilitychange', function () { if (!fs()) return; tulis(!document.hidden); if (!document.hidden && pimpinan() && Date.now() - waktuMuat > 60000) muat(); });
  function berhenti() { clearInterval(detak); return tulis(false); }
  function aturTampil(v) { tampil = !!v; Simpan.taruh(KUNCI, v ? '1' : '0'); return tulis(true); }

  /* ---------- daftar untuk pimpinan ---------- */
  function muat() {
    var F = fs(); if (!F || !pimpinan()) return Promise.resolve(null);
    return F.db.collection('aktif').get().then(function (s) {
      var kini = Date.now(), L = [];
      s.forEach(function (d) { var x = d.data({ serverTimestamps: 'estimate' }); var w = x.waktu && x.waktu.toMillis ? x.waktu.toMillis() : 0; if (d.id === F.info.uid || !w) return; var m = (kini - w) / 60000; if (m > 60) return; L.push({ nama: x.nama, jabatan: x.jabatan, peran: x.peran, platform: x.platform, menit: Math.max(0, Math.round(m)), on: x.online && m < 5 }); });
      L.sort(function (a, b) { return (b.on - a.on) || (a.menit - b.menit); }); LIST = L; waktuMuat = kini; if (CTX && CTX.perbarui) CTX.perbarui(); return L;
    }, function () { LIST = null; return null; });
  }
  function inisial(n) { var p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function teksMenit(m) { return m < 1 ? 'baru saja' : m + ' mnt lalu'; }
  /** kartu Beranda (pimpinan saja) */
  function htmlBeranda() {
    if (!pimpinan() || !LIST) return '';
    var on = LIST.filter(function (x) { return x.on; }), baru = LIST.filter(function (x) { return !x.on; });
    return '<h2 class="bagW">Sedang online <span><i class="titikOn"></i>' + on.length + ' staf</span></h2><div class="kartu onKartu">'
      + (LIST.length ? '<div class="onGeser">' + LIST.slice(0, 20).map(function (x) { return '<div class="onOrang' + (x.on ? ' on' : '') + '"><span class="onAva">' + esc(inisial(x.nama)) + '<i></i></span><b>' + esc(String(x.nama).split(/\s+/).slice(0, 2).join(' ')) + '</b><small>' + (x.on ? 'online' : esc(teksMenit(x.menit))) + '</small></div>'; }).join('') + '</div>'
        + (baru.length ? '<div class="kecil" style="margin-top:8px">' + baru.length + ' staf baru aktif dalam 1 jam terakhir.</div>' : '')
        : '<div class="kecil">Belum ada staf lain yang membuka app dalam 1 jam terakhir.</div>') + '</div>';
  }
  /** bagian atas daftar ruang Forum (pimpinan saja) */
  function htmlForum() {
    if (!pimpinan() || !LIST) return '';
    var on = LIST.filter(function (x) { return x.on; });
    return '<div class="kartu onForum"><div class="onJudul"><b><i class="titikOn"></i>Sedang online ' + on.length + '</b><small>1 jam terakhir</small></div>'
      + (LIST.length ? LIST.slice(0, 30).map(function (x) { return '<div class="onBaris"><span class="onAva' + (x.on ? ' on' : '') + '">' + esc(inisial(x.nama)) + '<i></i></span><div><b>' + esc(x.nama) + '</b><small>' + esc(x.jabatan || x.peran || '') + '</small></div><em>' + (x.on ? 'online' : esc(teksMenit(x.menit))) + '</em></div>'; }).join('') : '<div class="kecil">Belum ada staf lain online.</div>') + '</div>';
  }
  window.WHL_ONLINE = { mulai: mulai, berhenti: berhenti, aturTampil: aturTampil, tampil: function () { return tampil; }, pimpinan: pimpinan, htmlBeranda: htmlBeranda, htmlForum: htmlForum, muat: muat };
})();
