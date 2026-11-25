/* WHL App 3.58 — GERBANG KUESIONER WAJIB (kuesioner-wajib-25nov, Vanesa 25 Nov 2026).
 * Pak Fanza 25 Nov: staf DAN driver yang belum menuntaskan kuesioner periode berjalan, begitu membuka App langsung diarahkan ke layar kuesioner
 * dan TIDAK bisa memakai menu lain (termasuk absen & lapor storing, tanpa pengecualian) sampai semua rekan di daftarnya selesai.
 * Tablet GASPOL (app terpisah com.tambang.gaspol) tidak tersentuh: file ini hanya dimuat App WHL.
 *
 * Sumber status (server, tanpa nilai siapa pun):
 *   staf   -> Absensi ksnStatus  : wajib {aktif, selesai, beres, jumlah}; tuntas = SEMUA rekan DINILAI (Fanza: "pokoknya harus isi", Tidak tahu tidak dihitung).
 *   driver -> DASHBOARD pusatKsnDriverStatus : wajib {aktif, target}; tuntas = SEMUA staf aktif DINILAI (tanpa batas 10, tanpa syarat DO).
 * Server lama (tanpa field wajib) = gerbang diam. Sakelar: server KSN_WAJIB / KSD_WAJIB = 'mati', atau konfig.js KSN_WAJIB:false.
 * Cara kunci: lapis .ksnwGerbang di atas semua layar (di bawah layar Update wajib), #layarApp dibuat inert, tombol Back HP tidak membuka menu.
 * Layar kuesioner (.ksnStafLapis / .ksdLapis), keypad PIN, layar sukses, lembar tanya & roti dinaikkan di atas gerbang.
 * Tanpa sinyal: pakai status terakhir di HP ini (akun + periode sama). Belum pernah tahu statusnya (mis. perlu PIN kuesioner) = tidak dikunci.
 * Tanpa alert/confirm/prompt.
 */
(function () {
  'use strict';
  var K = window.WHL_KONFIG || {}, API = window.WHL_API || {};
  var O = null, el = null, INFO = null, cekTerakhir = 0, kembaliAsli = null, tekanKeluar = 0, pernahKunci = false, pasang = false;
  var SIMPAN = 'whlKsnwKunci', BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { try { return O && O.sesi ? O.sesi() : null; } catch (e) { return null; } }
  function driver() { var S = sesi(); return !!(S && S.user && S.user.peran === 'driver'); }
  function akun() { var S = sesi(); return String((S && (S.idProfil || S.idKetik || (S.user && S.user.id))) || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function periodeKini() { return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 7); }
  function bulanTeks(p) { var m = String(p || '').match(/^(\d{4})-(\d{2})$/); return m ? BULAN[+m[2] - 1] + ' ' + m[1] : String(p || ''); }
  function nyalaApp() { return K.KSN_WAJIB !== false; }
  function boleh() { var S = sesi(); return !!(S && S.mode === 'asli' && nyalaApp()); }
  function roti(t) { if (O && O.roti) O.roti(t); }

  /* ---------- simpanan status terakhir (untuk buka tanpa sinyal) ---------- */
  function ingat(w) { try { localStorage.setItem(SIMPAN, JSON.stringify({ a: akun(), p: w.periode || periodeKini(), k: !!(w.aktif && !w.selesai), b: w.beres || 0, j: w.jumlah || 0, d: driver() })); } catch (e) { /* */ } }
  function dariIngat() {
    try { var x = JSON.parse(localStorage.getItem(SIMPAN) || 'null'); if (x && x.k && x.a === akun() && x.p === periodeKini() && x.d === driver()) return { aktif: true, selesai: false, beres: x.b, jumlah: x.j, periode: x.p, simpanan: true }; } catch (e) { /* */ }
    return null;
  }

  /* ---------- gaya ---------- */
  function gaya() {
    if (document.getElementById('ksnwGaya')) return; var st = document.createElement('style'); st.id = 'ksnwGaya';
    st.textContent = '.ksnwGerbang{position:fixed;inset:0;z-index:2147482000;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg,#f4f7fb);color:var(--teks,#0f172a);padding:max(20px,env(safe-area-inset-top)) 16px max(20px,env(safe-area-inset-bottom));overflow-y:auto;-webkit-overflow-scrolling:touch}'
      + '.ksnwIsi{width:100%;max-width:440px;text-align:center}.ksnwIkon{width:76px;height:76px;margin:0 auto 12px;border-radius:24px;background:var(--tint,#e0f2fe);display:grid;place-items:center;font-size:38px}'
      + '.ksnwIsi h2{font-size:20px;font-weight:900;margin:0 0 6px;letter-spacing:-.01em}.ksnwWajib{font-size:15.5px;font-weight:800;line-height:1.4;margin:0 auto 16px;padding:10px 12px;border-radius:14px;background:rgba(220,38,38,.10);color:var(--tMerah,#b91c1c);max-width:380px}'
      + '.ksnwKartu{background:var(--panel,#fff);border:1px solid var(--garis,#e2e8f0);border-radius:18px;padding:14px 16px;text-align:left;margin-bottom:14px}.ksnwBaris{display:flex;align-items:baseline;gap:8px}.ksnwBaris b{flex:1;font-size:16px}.ksnwBaris span{font-size:12.5px;font-weight:800;color:var(--redup,#64748b)}'
      + '.ksnwPalang{height:10px;border-radius:99px;background:var(--panel2,#eef2f7);margin:10px 0 8px;overflow:hidden}.ksnwPalang i{display:block;height:100%;border-radius:99px;background:var(--utama,#0284c7);transition:width .3s}'
      + '.ksnwKartu small{display:block;color:var(--redup,#64748b);font-size:12.5px;line-height:1.45}.ksnwGerbang .tUtama{width:100%;min-height:52px;font-size:16px}.ksnwGerbang .tKecil{width:100%;min-height:46px;margin-top:10px}'
      + '.ksnwCatat{font-size:12.5px;color:var(--redup,#64748b);line-height:1.5;margin:14px 4px 0}.ksnwGalat{font-size:13px;font-weight:700;color:var(--tMerah,#b91c1c);margin:0 0 10px}'
      + 'html.ksnw-aktif .ksnStafLapis,html.ksnw-aktif .ksdLapis{z-index:2147482100}'
      + 'html.ksnw-aktif .pinLapis,html.ksnw-aktif .suksesLapis,html.ksnw-aktif .tirai.buka:not(#tirai),html.ksnw-aktif #roti,html.ksnw-aktif .konfeti{z-index:2147482200}';
    document.head.appendChild(st);
  }

  /* ---------- gambar gerbang ---------- */
  function gambar() {
    var w = INFO || {}, drv = driver(), n = Number(w.jumlah) || 0, b = Math.min(n, Number(w.beres) || 0), sisa = Math.max(0, n - b), pct = n ? Math.round(b / n * 100) : 0;
    var siapa = drv ? 'staf' : 'rekan';
    var h = '<div class="ksnwIsi"><div class="ksnwIkon" aria-hidden="true">📝</div><h2>' + (drv ? 'Kuesioner pelayanan staf' : 'Kuesioner rekan kerja') + '</h2>'
      + '<p class="ksnwWajib">Isi kuesioner dulu untuk membuka App (absen &amp; menu lain)</p>'
      + '<div class="ksnwKartu"><div class="ksnwBaris"><b>' + b + ' dari ' + n + ' ' + siapa + ' selesai</b><span>' + (sisa ? 'sisa ' + sisa : 'beres') + '</span></div>'
      + '<div class="ksnwPalang" role="progressbar" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + b + '"><i style="width:' + pct + '%"></i></div>'
      + '<small>Periode ' + esc(bulanTeks(w.periode || periodeKini())) + ' · anonim · boleh dicicil, yang sudah diisi tidak hilang.</small></div>'
      + (w.simpanan ? '<div class="ksnwGalat">Belum bisa memuat kuesioner dari server (cek sinyal). Status di atas dari HP ini.</div>' : '')
      + '<button type="button" class="tUtama" data-w="isi">' + (b ? 'Lanjutkan kuesioner' : 'Isi kuesioner sekarang') + '</button>'
      + (w.simpanan ? '<button type="button" class="tKecil" data-w="ulang">Coba muat lagi</button>' : '')
      + '<p class="ksnwCatat">🔒 Nama kamu tidak disimpan bersama nilai. Setiap ' + siapa + ' di daftar wajib diberi nilai. Semua menu terbuka otomatis begitu selesai.</p></div>';
    el.innerHTML = h;
  }
  function kunci(w) {
    INFO = w; gaya();
    if (!el) {
      el = document.createElement('div'); el.className = 'ksnwGerbang'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Kuesioner wajib');
      el.addEventListener('click', klik); document.body.appendChild(el);
      document.documentElement.classList.add('ksnw-aktif');
      var la = document.getElementById('layarApp'); if (la) la.inert = true;
      try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) { /* */ }
      Array.prototype.forEach.call(document.querySelectorAll('.tirai.buka'), function (t) { if (t.id === 'tirai') t.classList.remove('buka'); else t.remove(); }); /* lembar menu yang sempat terbuka ditutup */
      pernahKunci = true;
    }
    gambar();
  }
  function lepas() {
    var tadi = !!el; INFO = null;
    if (el) { el.remove(); el = null; }
    document.documentElement.classList.remove('ksnw-aktif');
    var la = document.getElementById('layarApp'); if (la) la.inert = false;
    if (tadi && pernahKunci) { pernahKunci = false; roti('Kuesioner selesai. Terima kasih, App terbuka kembali.'); }
  }
  function terapkan(w, simpan) {
    if (!boleh() || !w || !w.aktif || w.selesai) { if (w && !w.simpanan && simpan !== false) ingat(w || {}); lepas(); return; }
    if (!w.simpanan && simpan !== false) ingat(w);
    kunci(w);
  }

  /* ---------- status ---------- */
  function infoStaf(r) {
    if (!r || !r.ada) return null; var W = r.wajib; if (!W || typeof W !== 'object') return { lama: true };
    var n = Number(r.jumlah) || 0, s = Number(r.sisa) || 0;
    return { aktif: !!W.aktif && !!r.buka && r.ikut !== false, selesai: s === 0, beres: n - s, jumlah: n, periode: r.periode };
  }
  function staf(r) { /* dipanggil app.js muatKsn dan cek() */
    cekTerakhir = Date.now();
    if (!O || driver() || !boleh()) return;
    if (!r || r.galat) { var c = dariIngat(); if (c) kunci(c); return; }
    if (r.perluPin || !r.ada) { lepas(); return; } /* belum bisa dipastikan ikut atau tidak -> tidak dikunci (lihat laporan) */
    var w = infoStaf(r); if (!w || w.lama) { lepas(); return; }
    terapkan(w);
  }
  function cek() {
    if (!O || !boleh()) { lepas(); return; }
    cekTerakhir = Date.now();
    var S = sesi();
    if (driver()) {
      var D = window.WHL_KSD; if (!D || !D.boleh || !D.boleh(S) || !D.muatStatus) { lepas(); return; }
      D.muatStatus(O.ctxDriver ? O.ctxDriver() : null).then(function (st) {
        if (!st) return; var w = D.wajib && D.wajib();
        if (!w) { if (st.ok === false) { var c = dariIngat(); if (c) kunci(c); } else lepas(); return; }
        terapkan(w);
      }, function () { var c = dariIngat(); if (c) kunci(c); });
      return;
    }
    var Q = window.WHL_KSN; if (!Q) { lepas(); return; }
    Q.muat((Q.ctx && Q.ctx()) || (O.ctxKsn && O.ctxKsn())).then(function (r) { try { var cx = O.ctxKsn && O.ctxKsn(); if (cx && cx.selesai) cx.selesai(r); } catch (e) { /* */ } staf(r); });
  }
  /* perubahan dari layar kuesioner (tanpa RPC) */
  document.addEventListener('whl-ksn-berubah', function () {
    if (!O || !boleh() || !sesi()) return;
    var w = null;
    if (driver()) { if (window.WHL_KSD && window.WHL_KSD.wajib) w = window.WHL_KSD.wajib(); }
    else if (window.WHL_KSN) w = infoStaf(window.WHL_KSN.ringkas());
    if (w && !w.lama) terapkan(w);
  });

  /* ---------- tombol ---------- */
  function bukaKuesioner() {
    if (driver()) { if (window.WHL_KSD) window.WHL_KSD.buka(O.ctxDriver ? O.ctxDriver() : undefined); return; }
    var Q = window.WHL_KSN; if (Q) Q.buka((Q.ctx && Q.ctx()) || O.ctxKsn());
  }
  function klik(ev) {
    var b = ev.target.closest('[data-w]'); if (!b) return; var a = b.getAttribute('data-w');
    try { if (window.WHL_RASA && window.WHL_RASA.bunyi) window.WHL_RASA.bunyi('ketuk'); } catch (e) { /* */ }
    if (a === 'isi') bukaKuesioner();
    else if (a === 'ulang') cek();
  }

  /* ---------- tombol Back HP / gestur kembali ---------- */
  function pasangKembali() {
    if (kembaliAsli || typeof window.WHL_KEMBALI !== 'function') return;
    kembaliAsli = window.WHL_KEMBALI;
    window.WHL_KEMBALI = function () {
      if (!el) return kembaliAsli();
      try {
        if (window.WHL_RILIS && window.WHL_RILIS.wajib && window.WHL_RILIS.wajib()) return 'keluar';
        if (document.querySelector('.tirai.buka:not(#tirai), .pinLapis.tampil, .suksesLapis.tampil')) return kembaliAsli(); /* tutup dialog di dalam kuesioner */
        var kb = document.querySelector('.ksdLapis.tampil .ksnKp .kb, .ksnStafLapis.tampil .ksnKp .kb'); if (kb) { kb.click(); return 'ok'; }
        if (Date.now() - tekanKeluar < 2000) return 'keluar';
        tekanKeluar = Date.now(); roti('Selesaikan kuesioner dulu. Tekan sekali lagi untuk keluar.'); return 'ok';
      } catch (e) { return 'ok'; }
    };
  }

  /* ---------- daur ---------- */
  function mulai(o) {
    O = o || O; pasangKembali();
    if (!boleh()) { lepas(); return; }
    var c = dariIngat(); if (c) kunci(c); /* langsung tertutup (tanpa kedip menu) kalau terakhir diketahui belum selesai */
    if (driver()) cek(); /* staf: tunggu hasil muatKsn dari app.js -> staf(r) */
    else if (!window.WHL_KSN) lepas();
    if (!pasang) {
      pasang = true;
      document.addEventListener('visibilitychange', function () { if (!document.hidden && O && sesi() && Date.now() - cekTerakhir > 3 * 60000) cek(); });
      setInterval(function () { if (!document.hidden && O && sesi() && Date.now() - cekTerakhir > 15 * 60000) cek(); }, 60000); /* periode bisa buka (tgl 25 00.00) / tutup saat app terbuka */
    }
  }
  function lupakan() { O = O ? { sesi: function () { return null; } } : null; pernahKunci = false; lepas(); }
  window.WHL_KSNW = { mulai: mulai, staf: staf, cek: cek, lupakan: lupakan, aktif: function () { return !!el; }, _uji: { infoStaf: infoStaf, info: function () { return INFO; } } };
})();
