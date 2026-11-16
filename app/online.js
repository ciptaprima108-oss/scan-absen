/* WHL App v3.29 — STATUS ONLINE staf + driver (kontrak Armand app-tahap12-16nov §5 REVISI 1; permintaan Reza 16 Nov: ringkas ala WA/IG).
 * Tiap orang menulis 1 dokumen aktif/{uid} miliknya: nama, peran (= token), jabatan, platform, online, waktu (server) = terakhir aktif, mulai = awal sesi online.
 *  - tulis (merge) saat app dibuka / kembali ke depan, lalu paling sering 1x / 5 menit selama terlihat; ke latar / keluar akun: online=false.
 *  - pilihan di Akun "Tampilkan status online saya" (bawaan nyala) -> mati = dokumen dihapus.
 * Baca: aktif orderBy('waktu','desc').limit(50) (indeks 1 kolom bawaan), dibaca saat app dibuka/kembali (maks 1x/menit) + tiap 5 menit.
 * Tampilan: 1 baris ringkas "Andi, Budi +12 online · 5 baru aktif" -> ketuk = lembar rinci: Online sekarang / Aktif sebelumnya ("aktif 12 mnt lalu"), label Driver / Staf.
 */
(function () {
  'use strict';
  var Simpan = window.WHL_API.Simpan, KUNCI = 'whlOnlineTampil', tampil = true, LIST = null, waktuMuat = 0, detak = null, CTX = null, mulaiSesi = null, tulisAkhir = 0;
  var TULIS_MS = 5 * 60000, ONLINE_MS = 5 * 60000, BARU_MULAI_MS = 10 * 60000, JENDELA_MS = 24 * 3600000;
  Simpan.ambil(KUNCI).then(function (v) { tampil = v !== '0'; });
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fs() { return window.WHL_FORUM && window.WHL_FORUM.fs(); }
  function pimpinan() { return !!fs(); } /* nama lama dipertahankan: true = boleh melihat daftar (semua yang login forum, staf & driver) */
  function platform() { try { if (window.Capacitor && window.Capacitor.isNativePlatform()) return /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'iphone' : 'android'; } catch (e) { /* */ } return /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'iphone' : 'web'; }
  function tulis(online, paksa) {
    var F = fs(); if (!F || !CTX || !CTX.sesi()) return Promise.resolve();
    var ref = F.db.collection('aktif').doc(F.info.uid);
    if (!tampil) return ref.delete().catch(function () { });
    if (online && !paksa && Date.now() - tulisAkhir < TULIS_MS) return Promise.resolve(); /* hemat kuota Spark: maks 1 tulis / 5 mnt selama dipakai */
    var S = CTX.sesi(), d = { nama: F.info.nama, peran: F.info.peran, jabatan: String(S.jabatan || '').slice(0, 80), platform: platform(), online: !!online, waktu: F.FV.serverTimestamp() };
    if (online) { if (!mulaiSesi) mulaiSesi = new Date(Date.now() - 60000); /* aturan: mulai <= waktu server (jam HP bisa sedikit maju) */ d.mulai = F.TS ? F.TS.fromDate(mulaiSesi) : mulaiSesi; } else mulaiSesi = null;
    tulisAkhir = online ? Date.now() : 0;
    return ref.set(d, { merge: true }).catch(function () { tulisAkhir = 0; });
  }
  function mulai(ctx) {
    CTX = ctx; clearInterval(detak);
    var tunggu = 0, i = setInterval(function () { if (fs() || ++tunggu > 60) { clearInterval(i); if (fs()) { tulis(true, true); muat(); } } }, 500);
    detak = setInterval(function () { if (!document.hidden && fs()) { tulis(true); muat(); } }, TULIS_MS);
  }
  document.addEventListener('visibilitychange', function () { if (!fs()) return; if (document.hidden) tulis(false); else { tulis(true, true); if (Date.now() - waktuMuat > 60000) muat(); } });
  function berhenti() { clearInterval(detak); return tulis(false); }
  function aturTampil(v) { tampil = !!v; Simpan.taruh(KUNCI, v ? '1' : '0'); return tulis(true, true); }

  function ms(t) { try { return t && t.toMillis ? t.toMillis() : 0; } catch (e) { return 0; } }
  function muat() {
    var F = fs(); if (!F) return Promise.resolve(null);
    return F.db.collection('aktif').orderBy('waktu', 'desc').limit(50).get().then(function (s) {
      var kini = Date.now(), L = [];
      s.forEach(function (d) {
        var x = d.data({ serverTimestamps: 'estimate' }), w = ms(x.waktu); if (d.id === F.info.uid || !w) return;
        var umur = kini - w; if (umur > JENDELA_MS) return;
        var on = !!x.online && umur < ONLINE_MS, mu = ms(x.mulai);
        L.push({ nama: x.nama, jabatan: x.jabatan, peran: x.peran, platform: x.platform, menit: Math.max(0, Math.round(umur / 60000)), on: on, baruOn: on && mu && kini - mu < BARU_MULAI_MS });
      });
      L.sort(function (a, b) { return (b.on - a.on) || (a.menit - b.menit); }); LIST = L; waktuMuat = kini;
      if (CTX && CTX.perbarui) CTX.perbarui(); return L;
    }, function () { return LIST; });
  }
  function inisial(n) { var p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function depan(n) { var p = String(n || '').trim().split(/\s+/)[0] || ''; return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(); }
  function lalu(m) { return m < 1 ? 'baru saja' : m < 60 ? m + ' mnt lalu' : Math.floor(m / 60) + ' jam lalu'; }
  function label(x) { return x.peran === 'driver' ? 'Driver' : 'Staf'; }
  function hitung() { var on = (LIST || []).filter(function (x) { return x.on; }), baru = (LIST || []).filter(function (x) { return !x.on && x.menit < 60; }); return { on: on, baru: baru }; }
  /** 1 baris ringkas (Beranda & atas daftar ruang Forum) */
  function ringkas(tempat) {
    if (!pimpinan() || !LIST) return '';
    var H = hitung(), nm = H.on.slice(0, 2).map(function (x) { return depan(x.nama); }), sisa = H.on.length - nm.length;
    var teks = H.on.length ? esc(nm.join(', ')) + (sisa > 0 ? ' +' + sisa : '') + ' online' : 'Belum ada yang online';
    var bnm = H.baru.slice(0, 2).map(function (x) { return depan(x.nama); });
    var sub = H.baru.length ? H.baru.length + ' baru aktif' + (bnm.length ? ' (' + esc(bnm.join(', ')) + (H.baru.length > 2 ? ', …' : '') + ')' : '') : 'tidak ada yang aktif 1 jam terakhir';
    return '<button type="button" class="onRingkas ' + (tempat || '') + '" data-online="rinci" aria-label="Lihat siapa yang online"><span class="onTumpuk">' + H.on.slice(0, 3).map(function (x) { return '<span class="onAva on">' + esc(inisial(x.nama)) + '<i></i></span>'; }).join('') + (H.on.length ? '' : '<span class="onAva">' + '·' + '</span>') + '</span>'
      + '<span class="tx"><b>' + (H.on.length ? '<i class="titikOn"></i>' : '') + teks + '</b><small>' + sub + '</small></span><span class="pn">›</span></button>';
  }
  function htmlBeranda() { return ringkas('onBeranda'); }
  function htmlForum() { return ringkas('onForumR'); }
  /* lembar rinci (ketuk ringkasan) */
  var lmb = null;
  function gaya() {
    if (document.getElementById('onGaya')) return; var st = document.createElement('style'); st.id = 'onGaya';
    st.textContent = '.onRingkas{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:var(--panel);border-radius:18px;padding:10px 12px;margin:0 0 12px;box-shadow:var(--bayang)}.onRingkas .tx{flex:1;min-width:0}.onRingkas b{display:flex;align-items:center;gap:6px;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.onRingkas small{display:block;font-size:12px;color:var(--redup);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.onRingkas .pn{color:var(--redup);font-size:20px}'
      + '.onTumpuk{display:flex;flex:none}.onTumpuk .onAva{width:32px;height:32px;font-size:11.5px;margin-left:-8px;box-shadow:0 0 0 2px var(--panel)}.onTumpuk .onAva:first-child{margin-left:0}'
      + '.onLmb{position:fixed;inset:0;z-index:40;background:rgba(3,10,22,.45);display:flex;align-items:flex-end}.onLmb .isi{background:var(--bg);width:100%;max-height:82vh;overflow:auto;border-radius:24px 24px 0 0;padding:14px 16px calc(20px + env(safe-area-inset-bottom))}.onLmb h3{margin:6px 2px 8px;font-size:15px;display:flex;justify-content:space-between}.onLmb h3 span{color:var(--redup);font-size:12.5px}.onLmb .tutupL{display:block;margin:0 auto 8px;width:44px;height:5px;border-radius:99px;background:var(--garis)}'
      + '.onLmb .onBaris em.drv{font-style:normal}.onLbl{font-style:normal;font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:99px;margin-left:6px;background:var(--panel2);color:var(--redup)}.onLbl.drv{background:rgba(255,122,51,.15);color:#c2410c}';
    document.head.appendChild(st);
  }
  function baris(x) { return '<div class="onBaris"><span class="onAva' + (x.on ? ' on' : '') + '">' + esc(inisial(x.nama)) + '<i></i></span><div><b>' + esc(x.nama) + '<i class="onLbl' + (x.peran === 'driver' ? ' drv' : '') + '">' + label(x) + '</i></b><small>' + esc(x.jabatan || '') + '</small></div><em>' + (x.on ? (x.baruOn ? 'baru online' : 'online') : 'aktif ' + esc(lalu(x.menit))) + '</em></div>'; }
  function rinci() {
    gaya(); tutupRinci(); var H = hitung(), L = LIST || [], lain = L.filter(function (x) { return !x.on; });
    lmb = document.createElement('div'); lmb.className = 'onLmb';
    lmb.innerHTML = '<div class="isi kartu onForum" role="dialog" aria-label="Siapa yang online"><span class="tutupL"></span>'
      + '<h3>Online sekarang <span>' + H.on.length + ' orang</span></h3>' + (H.on.length ? H.on.map(baris).join('') : '<div class="kecil">Belum ada yang online selain kamu.</div>')
      + '<h3 style="margin-top:14px">Aktif sebelumnya <span>24 jam terakhir</span></h3>' + (lain.length ? lain.map(baris).join('') : '<div class="kecil">Belum ada.</div>')
      + '<div class="kecil" style="margin-top:10px">Online = app dibuka dalam 5 menit terakhir. Sembunyikan status kamu di Akun.</div></div>';
    lmb.addEventListener('click', function (e) { if (e.target === lmb || e.target.closest('.tutupL')) tutupRinci(); });
    document.body.appendChild(lmb);
    if (Date.now() - waktuMuat > 60000) muat().then(function () { if (lmb) rinci(); });
  }
  function tutupRinci() { if (!lmb) return false; lmb.remove(); lmb = null; return true; }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-online="rinci"]'); if (b) { e.stopPropagation(); rinci(); } }, true);
  gaya();
  window.WHL_ONLINE = { mulai: mulai, berhenti: berhenti, aturTampil: aturTampil, tampil: function () { return tampil; }, pimpinan: pimpinan, htmlBeranda: htmlBeranda, htmlForum: htmlForum, muat: muat, tutupRinci: tutupRinci, _uji: { setList: function (L) { LIST = L; waktuMuat = Date.now(); } } };
})();
