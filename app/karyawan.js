/* WHL App — DATA KARYAWAN: karyawan baru + kelengkapan data semua staf & driver (karyawan-baru-21nov, Hesti 21 Nov 2026).
 * Pak Fanza / Reza: masukkan karyawan baru (TYREMAN, MEKANIK MAINTENANCE, dst) dengan data lengkap, langsung tersambung ke semua sistem;
 * plus katalog semua orang (gaya Katalog unit): siapa LENGKAP / BELUM + isian yang kurang, tombol Lengkapi.
 * Foto KTP / SIM -> AI server (kunci Tanya AI WHL) mengisi form -> dikoreksi -> Simpan. Yang diketik manual cukup No HP & Tgl masuk.
 * HAK: menu cuma tampil untuk Fanza WHL-01001, Reza WHL-01003, Rike WHL-01010 DAN server punya pusatKbDaftar; server juga menolak orang lain.
 * Server: DASHBOARD KaryawanBaru.gs lewat api pusat:
 *   pusatKbOpsi [token] · pusatKbDaftar [token, paksa] · pusatKbDetail [token, id] · pusatKbFoto [token, id, 'ID'|'KTP'|'SIM']
 *   pusatKbUnggah [token, {jenis, mime, b64, baca}] · pusatKbSimpan [token, {mode, id, isi, foto, mini, orangBeda}] · pusatKbEkspor [token, {jenis, semua, ids, tandai}]
 * Data pribadi TIDAK disimpan di HP (cuma di memori selama layar terbuka; dibuang saat Keluar lewat lupakan()).
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA || {};
  var IZIN = ['WHL01001', 'WHL01003', 'WHL01010'];
  var NB = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var CTX = null, lapisEl = null, layar = 'daftar', D = null, OPSI = null, galat = '', memuat = false, urutan = 0;
  var F = { cari: '', jenis: 'SEMUA', divisi: '', kurang: false };
  var U = null, uMuat = false, uGalat = '', FOTO = {}, FORM = null, EK = null, ekMuat = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { return CTX && CTX.sesi(); }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function kunci(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function panggil(fn, args, ms) { var S = sesi(); return API.Pusat.panggil(fn, [S && S.tokenPusat].concat(args || []), ms || 45000); }
  function tglID(t) { if (!/^\d{4}-\d{2}-\d{2}$/.test(t || '')) return t || ''; return (+t.slice(8, 10)) + ' ' + NB[+t.slice(5, 7) - 1] + ' ' + t.slice(0, 4); }
  function inisial(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase(); }

  /* ---------- hak ---------- */
  function sayaBoleh(S) {
    var u = S && S.user; if (!u || u.peran === 'driver') return false;
    return [S.idProfil, S.idKetik, u.nrp, u.id].some(function (x) { return x && IZIN.indexOf(kunci(x)) >= 0; });
  }
  function boleh(S) { S = S || sesi(); var X = API.Pusat; return sayaBoleh(S) && !!(X.punya && X.punya('pusatKbDaftar')); }

  /* ---------- gaya (ikut variabel tema app; pola Katalog unit) ---------- */
  function pasangGaya() {
    if (document.getElementById('kbGaya')) return;
    var st = document.createElement('style'); st.id = 'kbGaya';
    st.textContent = [
      '.kbLapis .ksnKp .sp{flex:1}.kbLapis .ksnKp .kb.segar.putar{animation:kbPutar 1s linear infinite}@keyframes kbPutar{to{transform:rotate(360deg)}}',
      '.kbProg{background:var(--panel);border:1px solid var(--garis);border-radius:16px;padding:12px 14px;margin-bottom:10px;box-shadow:var(--bayang)}',
      '.kbProg .ag{font-size:26px;font-weight:900;letter-spacing:-.4px}.kbProg small{color:var(--redup);font-weight:700;font-size:12.5px}',
      '.kbProg .bar{height:9px;border-radius:9px;background:var(--panel2);margin-top:8px;overflow:hidden}.kbProg .bar i{display:block;height:100%;background:var(--hijau);border-radius:9px}',
      '.kbProg .ket{font-size:12px;color:var(--redup);margin-top:6px;line-height:1.45}',
      '.kbBaru{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:50px;border-radius:14px;margin:0 0 10px;font-size:15.5px;font-weight:800}',
      '.kbCari{position:relative;margin:2px 0 8px}.kbCari input{width:100%;box-sizing:border-box;font-size:16px;min-height:46px;padding:11px 14px;border-radius:14px}',
      '.kbSeg{display:flex;gap:4px;background:var(--panel2);border-radius:999px;padding:3px;margin-bottom:8px}.kbSeg button{flex:1;font-size:13px;font-weight:800;padding:8px 6px;border-radius:999px;color:var(--redup);min-height:36px}',
      '.kbSeg button.on{background:var(--panel);color:var(--teks);box-shadow:var(--bayang)}',
      '.kbChips{display:flex;gap:6px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none}.kbChips::-webkit-scrollbar{display:none}',
      '.kbChip{flex:none;font-size:12.5px;font-weight:700;padding:7px 12px;border-radius:999px;border:1px solid var(--garis);color:var(--redup);background:var(--panel);min-height:34px;white-space:nowrap}',
      '.kbChip.on{background:var(--utama);border-color:var(--utama);color:#fff}.kbChip.mrh.on{background:#dc4c4c;border-color:#dc4c4c}',
      '.kbJml{font-size:12.5px;color:var(--redup);margin:0 2px 8px}',
      '.kbGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.kbKartu{display:block;width:100%;text-align:left;padding:0;border-radius:16px;overflow:hidden;background:var(--panel);border:1px solid var(--garis);color:var(--teks);box-shadow:var(--bayang);min-width:0}',
      '.kbKartu .fo{position:relative;aspect-ratio:1/1;background:var(--panel2);display:flex;align-items:center;justify-content:center;overflow:hidden}',
      '.kbKartu .fo img{width:100%;height:100%;object-fit:cover;display:block}.kbKartu .fo .ini{font-size:34px;font-weight:900;color:var(--samar)}',
      '.kbKartu .jn{position:absolute;left:7px;top:7px;font-size:10.5px;font-weight:800;padding:3px 7px;border-radius:999px;background:rgba(21,101,192,.88);color:#fff}.kbKartu .jn.drv{background:rgba(124,58,237,.88)}',
      '.kbKartu .lc{position:absolute;right:7px;top:7px;font-size:10.5px;font-weight:800;padding:3px 7px;border-radius:999px;background:#1fae69;color:#fff}.kbKartu .lc.blm{background:#f59e0b;color:#1a1a1a}',
      '.kbKartu .br{position:absolute;left:7px;bottom:7px;font-size:10.5px;font-weight:800;padding:3px 7px;border-radius:999px;background:#dc4c4c;color:#fff}',
      '.kbKartu .bw{padding:9px 10px 10px}.kbKartu .nm{font-size:14.5px;font-weight:900;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}',
      '.kbKartu .id{font-size:12px;color:var(--redup);font-weight:700;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.kbKartu .kr{font-size:11px;color:var(--tKuning);font-weight:700;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kbKartu .kr.ok{color:var(--tHijau)}',
      '.kbKartu .bar{height:4px;border-radius:9px;background:var(--panel2);margin-top:6px;overflow:hidden}.kbKartu .bar i{display:block;height:100%;background:var(--hijau);border-radius:9px}',
      '.kbKosong{text-align:center;color:var(--redup);padding:36px 12px;font-size:14px}',
      '.kbAtas{display:flex;gap:12px;align-items:center;margin-bottom:12px}.kbAtas .pp{width:92px;height:92px;border-radius:18px;overflow:hidden;background:var(--panel2);flex:none;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;color:var(--samar)}',
      '.kbAtas .pp img{width:100%;height:100%;object-fit:cover}.kbAtas h1{font-size:21px;font-weight:900;margin:0;line-height:1.15}.kbAtas .sub{font-size:13px;color:var(--redup);font-weight:700;margin-top:3px}',
      '.kbTags{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}.kbTag{font-size:11.5px;font-weight:800;padding:4px 9px;border-radius:999px;background:var(--panel2);color:var(--redup)}.kbTag.ok{background:#1fae69;color:#fff}.kbTag.blm{background:#f59e0b;color:#1a1a1a}',
      '.kbKurang{background:rgba(245,158,11,.11);border:1px solid rgba(245,158,11,.4);border-radius:14px;padding:10px 12px;font-size:13px;margin-bottom:10px;line-height:1.5}',
      '.kbH2{font-size:12px;text-transform:uppercase;letter-spacing:1.3px;color:var(--redup);margin:16px 4px 8px;font-weight:700}',
      '.kbRow{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid var(--garis);font-size:14px}.kbRow:first-child{border-top:0}.kbRow span{color:var(--redup)}.kbRow b{text-align:right;word-break:break-word}.kbRow b.kos{color:var(--samar);font-weight:600}',
      '.kbLapis .kartu{padding:4px 16px;display:block}',
      '.kbDok{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.kbDok button{border-radius:14px;overflow:hidden;background:var(--panel2);aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:var(--redup);border:1px dashed var(--garis);padding:0;position:relative}',
      '.kbDok button img{width:100%;height:100%;object-fit:cover}.kbDok button i{position:absolute;left:6px;bottom:6px;font-style:normal;font-size:10.5px;padding:2px 7px;border-radius:999px;background:rgba(0,0,0,.6);color:#fff}',
      '.kbAksi{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.kbAksi button{min-height:50px;margin:0;font-size:15px;border-radius:14px}',
      '.kbBtn2{border-radius:14px;font-weight:800;font-size:14px;background:var(--panel2);color:var(--teks);border:1px solid var(--garis);min-height:46px;padding:0 12px}',
      /* form */
      '.kbF label{display:block;font-size:12.5px;font-weight:800;color:var(--redup);margin:11px 0 5px}.kbF .isian{width:100%;box-sizing:border-box;min-height:46px;font-size:16px}',
      '.kbF .kapital{text-transform:uppercase}.kbF .ai{font-size:10.5px;font-weight:800;color:#fff;background:#7c3aed;border-radius:999px;padding:1px 7px;margin-left:6px;vertical-align:1px}',
      '.kbF .wajib{color:#dc4c4c}.kbF .dua{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      '.kbUp{background:var(--panel);border:1px solid var(--garis);border-radius:16px;padding:12px;margin-bottom:10px}.kbUp h3{margin:0 0 3px;font-size:15.5px;font-weight:900}.kbUp .kc{font-size:12.5px;color:var(--redup);line-height:1.45}',
      '.kbUp .tb{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.kbUp .tb label{display:flex;align-items:center;justify-content:center;margin:0;min-height:46px}',
      '.kbUp .prev{margin-top:9px;border-radius:12px;overflow:hidden;background:var(--panel2);position:relative}.kbUp .prev img{display:block;width:100%;max-height:200px;object-fit:contain}',
      '.kbUp .st{font-size:12.5px;font-weight:700;margin-top:7px}.kbUp .st.ok{color:var(--tHijau)}.kbUp .st.blm{color:var(--tKuning)}.kbUp .st.mrh{color:var(--tMerah)}',
      '.kbIdBaru{background:var(--tint);border-radius:14px;padding:10px 12px;font-size:13.5px;margin-bottom:10px}.kbIdBaru b{font-size:17px}',
      '.kbGalat{background:rgba(220,76,76,.10);border:1px solid rgba(220,76,76,.35);border-radius:14px;padding:10px 12px;font-size:13.5px;margin-top:10px;line-height:1.45}',
      '.kbCent{display:flex;gap:9px;align-items:center;font-size:14px;font-weight:700;margin-top:12px}.kbCent input{width:22px;height:22px}',
      '.kbSimpan{position:sticky;bottom:0;padding:10px 0 calc(8px + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(0,0,0,0),var(--bg) 30%)}',
      /* ID card */
      '.kbIdc{width:240px;aspect-ratio:54/85.6;margin:6px auto 12px;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 6px 24px rgba(0,0,0,.25);display:flex;flex-direction:column;align-items:center;font-family:Arial,sans-serif;color:#0b1a33}',
      '.kbIdc .ka{width:100%;background:#0b1a33;color:#fff;text-align:center;padding:10px 0 7px;font-weight:900;letter-spacing:.3px;font-size:11.5px;border-bottom:4px solid #f5b400}.kbIdc .ka small{display:block;font-size:6.5px;letter-spacing:1.6px;font-weight:800;color:#f5c24a;margin-top:2px}',
      '.kbIdc .kbPita{width:100%;background:#0d4fa8;color:#fff;text-align:center;font-size:7.5px;font-weight:800;letter-spacing:1.6px;padding:4px 0}',
      '.kbIdc .fo{width:50%;aspect-ratio:376/466;margin-top:9px;border:3px solid #0b1a33;outline:4px solid #f5b400;border-radius:2px;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:900;color:#94a3b8}',
      '.kbIdc .fo img{width:100%;height:100%;object-fit:cover}.kbIdc .nm{font-weight:900;font-size:13px;margin-top:9px;text-align:center;padding:0 8px;line-height:1.15}',
      '.kbIdc .jb{background:#f5b400;border-radius:99px;padding:3px 12px;font-weight:900;font-size:9.5px;letter-spacing:.8px;margin-top:5px}.kbIdc .nk{font-size:7.5px;letter-spacing:1.4px;color:#64748b;font-weight:800;margin-top:7px}.kbIdc .id{font-family:Consolas,monospace;font-weight:900;font-size:16px}',
      '.kbTsv{width:100%;box-sizing:border-box;min-height:120px;font-family:Consolas,monospace;font-size:12px}',
      '.kbLihat{position:fixed;inset:0;z-index:10;background:#000;display:flex;flex-direction:column}.kbLihat .ats{display:flex;align-items:center;padding:calc(10px + env(safe-area-inset-top)) 12px 10px;color:#fff}.kbLihat .ats b{flex:1}',
      '.kbLihat .ats button{color:#fff;font-size:26px;min-width:44px;min-height:44px}.kbLihat .tg{flex:1;display:flex;align-items:center;justify-content:center}.kbLihat .tg img{max-width:100%;max-height:100%;object-fit:contain}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- lapis ---------- */
  var LIHAT = null;
  function lapis() {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      pasangGaya();
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis kbLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik); lapisEl.addEventListener('input', ketik); lapisEl.addEventListener('change', ubah); lapisEl.addEventListener('focusout', kapitalkan, true);
    }
    var gulir = lapisEl.querySelector('.ksnIsi'), y = gulir ? gulir.scrollTop : 0;
    var J = { daftar: ['Khusus Fanza · Reza · Rike', 'Data karyawan'], detail: ['Data karyawan', U ? U.o.nama || U.namaSistem : 'Detail'], form: ['Data karyawan', FORM && FORM.mode === 'baru' ? 'Karyawan baru' : 'Lengkapi data'], kartu: ['Pratinjau', 'ID card'], ekspor: ['Data karyawan', 'Ekspor'] }[layar];
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-l="kembali" aria-label="Kembali">‹</button><div class="nm">' + esc(J[0]) + '<b>' + esc(J[1]) + '</b></div><span class="sp"></span>'
      + (layar === 'daftar' ? '<button type="button" class="kb segar' + (memuat ? ' putar' : '') + '" data-l="segar" aria-label="Muat ulang">⟳</button>' : '') + '</div>'
      + '<div class="ksnIsi">' + (layar === 'daftar' ? isiDaftar() : layar === 'detail' ? isiDetail() : layar === 'form' ? isiForm() : layar === 'kartu' ? isiKartu() : isiEkspor()) + '</div>'
      + (LIHAT ? '<div class="kbLihat" data-l="tutupLihat"><div class="ats"><b>' + esc(LIHAT.judul) + '</b><button type="button" data-l="tutupLihat" aria-label="Tutup">✕</button></div><div class="tg"><img src="' + LIHAT.src + '" alt=""></div></div>' : '');
    var g2 = lapisEl.querySelector('.ksnIsi'); if (g2) g2.scrollTop = y;
  }
  function tutup() { if (!lapisEl) return; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); FORM = null; U = null; EK = null; LIHAT = null; if (CTX && CTX.perbarui) CTX.perbarui(); }
  function kembali() {
    if (!lapisEl) return false;
    if (LIHAT) { LIHAT = null; lapis(); return true; }
    if (layar === 'form') { layar = FORM && FORM.mode === 'lengkapi' && U ? 'detail' : 'daftar'; FORM = null; lapis(); return true; }
    if (layar === 'kartu') { layar = U ? 'detail' : 'daftar'; lapis(); return true; }
    if (layar === 'detail' || layar === 'ekspor') { layar = 'daftar'; U = null; EK = null; lapis(); return true; }
    tutup(); return true;
  }

  /* ---------- buka & muat ---------- */
  function buka(ctx, awal) {
    CTX = ctx || CTX;
    if (!boleh()) { roti('Data karyawan khusus Pak Fanza, Reza & Rike.'); return; }
    layar = 'daftar'; lapis(); muat(false);
    if (!OPSI) muatOpsi();
    if (awal === 'baru') setTimeout(bukaBaru, 50);
  }
  function muatOpsi() { return panggil('pusatKbOpsi', [], 40000).then(function (h) { if (h && h.ok) OPSI = h; return OPSI; }).catch(function () { return null; }); }
  function muat(paksa) {
    var saya = ++urutan; memuat = true; galat = ''; if (lapisEl) lapis();
    panggil('pusatKbDaftar', [!!paksa], 90000).then(function (h) {
      if (saya !== urutan) return; memuat = false;
      if (!h || !h.ok) { galat = (h && h.pesan) || 'Data karyawan belum bisa dimuat.'; if (h && h.login === false && CTX && CTX.sesiHabis) CTX.sesiHabis(); }
      else D = h;
      if (lapisEl && layar === 'daftar') lapis();
    }).catch(function (e) { if (saya !== urutan) return; memuat = false; galat = (e && e.message) || 'Sinyal putus. Coba lagi.'; if (lapisEl) lapis(); });
  }

  /* ---------- DAFTAR (gaya katalog) ---------- */
  function cocok(p) {
    if (F.jenis !== 'SEMUA' && p.jenis !== F.jenis) return false;
    if (F.divisi && p.divisi !== F.divisi) return false;
    if (F.kurang && !p.nKurang) return false;
    var q = F.cari.trim().toUpperCase(); if (!q) return true;
    return [p.nama, p.id, p.kartu, p.jabatan, p.lambung].join(' ').toUpperCase().indexOf(q) >= 0;
  }
  function kartu(p) {
    var persen = Math.round(100 * (p.dari - p.nKurang) / (p.dari || 1));
    return '<button type="button" class="kbKartu" data-l="orang:' + esc(p.id) + '"><div class="fo">' + (p.mini ? '<img src="' + esc(p.mini) + '" alt="" loading="lazy">' : '<span class="ini">' + esc(inisial(p.nama)) + '</span>')
      + '<span class="jn' + (p.jenis === 'DRIVER' ? ' drv' : '') + '">' + (p.jenis === 'DRIVER' ? 'DRIVER' : esc(p.divisi || 'STAF')) + '</span>'
      + '<span class="lc' + (p.nKurang ? ' blm' : '') + '">' + (p.nKurang ? 'Kurang ' + p.nKurang : '✓ Lengkap') + '</span>' + (p.baru ? '<span class="br">BARU</span>' : '') + '</div>'
      + '<div class="bw"><div class="nm">' + esc(p.nama) + '</div><div class="id">' + esc(p.id + (p.lambung ? ' · ' + p.lambung : '') + ' · ' + p.jabatan) + '</div>'
      + '<div class="kr' + (p.nKurang ? '' : ' ok') + '">' + (p.nKurang ? esc(p.kurang.slice(0, 3).join(', ') + (p.kurang.length > 3 ? ' +' + (p.kurang.length - 3) : '')) : 'Data lengkap') + '</div>'
      + '<div class="bar"><i style="width:' + persen + '%"></i></div></div></button>';
  }
  function htmlGrid() {
    if (!D) return '';
    var L = D.orang.filter(cocok);
    return '<div class="kbJml">' + L.length + ' orang' + (F.cari || F.divisi || F.kurang || F.jenis !== 'SEMUA' ? ' cocok' : '') + '</div>'
      + (L.length ? '<div class="kbGrid">' + L.map(kartu).join('') + '</div>' : '<div class="kbKosong">Tidak ada yang cocok.</div>');
  }
  function isiDaftar() {
    if (!D) return memuat ? '<div class="kbKosong"><span class="putar"></span> Memuat data karyawan…</div>' : '<div class="kbKosong">' + esc(galat || 'Belum termuat.') + '<br><br><button type="button" class="tUtama" data-l="segar">Coba lagi</button></div>';
    var Rg = D.ringkas, persen = Math.round(100 * Rg.lengkap / (Rg.total || 1)), div = Object.keys(Rg.divisi || {}).sort();
    var h = '<div class="kbProg"><small>Kelengkapan data</small><div><b class="ag">' + Rg.lengkap + '/' + Rg.total + '</b> <small>lengkap (' + persen + '%)</small></div><div class="bar"><i style="width:' + persen + '%"></i></div>'
      + '<div class="ket">Ayo dilengkapi bareng-bareng: buka orangnya → <b>Lengkapi</b> → foto KTP/SIM, AI isi otomatis, cek, simpan.</div></div>'
      + '<button type="button" class="tUtama kbBaru" data-l="baru">＋ Karyawan baru</button>'
      + '<div class="kbCari"><input id="kbCari" class="isian" type="search" placeholder="Cari nama, ID, jabatan, lambung…" value="' + esc(F.cari) + '" autocomplete="off"></div>'
      + '<div class="kbSeg">' + [['SEMUA', 'Semua ' + Rg.total], ['STAF', 'Staf ' + Rg.staf], ['DRIVER', 'Driver ' + Rg.driver]].map(function (x) { return '<button type="button" data-l="jenis:' + x[0] + '" class="' + (F.jenis === x[0] ? 'on' : '') + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>'
      + '<div class="kbChips"><button type="button" class="kbChip mrh' + (F.kurang ? ' on' : '') + '" data-l="kurang">' + (F.kurang ? '✓ ' : '') + 'Belum lengkap · ' + (Rg.total - Rg.lengkap) + '</button>'
      + '<button type="button" class="kbChip' + (!F.divisi ? ' on' : '') + '" data-l="divisi:">Semua divisi</button>'
      + div.map(function (d) { return '<button type="button" class="kbChip' + (F.divisi === d ? ' on' : '') + '" data-l="divisi:' + esc(d) + '">' + esc(d) + ' · ' + Rg.divisi[d] + '</button>'; }).join('') + '</div>'
      + '<div class="kbChips"><button type="button" class="kbChip" data-l="ekspor:idcard">🪪 Paket ID card</button><button type="button" class="kbChip" data-l="ekspor:kimper">📋 Baris DATA KIMPER</button></div>';
    return h + '<div id="kbGrid">' + htmlGrid() + '</div>';
  }

  /* ---------- DETAIL ---------- */
  function bukaOrang(id) {
    layar = 'detail'; U = null; uGalat = ''; uMuat = true; lapis();
    panggil('pusatKbDetail', [id], 45000).then(function (h) {
      uMuat = false; if (!h || !h.ok) uGalat = (h && h.pesan) || 'Data belum bisa dimuat.'; else { U = h; muatFoto(); }
      if (lapisEl && layar === 'detail') lapis();
    }).catch(function (e) { uMuat = false; uGalat = (e && e.message) || 'Sinyal putus.'; if (lapisEl) lapis(); });
  }
  function muatFoto() {
    if (!U) return; var id = U.id;
    ['ID', 'KTP', 'SIM'].forEach(function (j) {
      var k = { ID: 'id', KTP: 'ktp', SIM: 'sim' }[j], kk = id + '|' + j;
      if (U.foto[k] !== 'ada' || FOTO[kk]) return; FOTO[kk] = 'memuat';
      panggil('pusatKbFoto', [id, j], 45000).then(function (h) { if (h && h.ok) { FOTO[kk] = 'data:' + h.mime + ';base64,' + h.b64; if (lapisEl && U && U.id === id && (layar === 'detail' || layar === 'kartu')) lapis(); } else delete FOTO[kk]; }).catch(function () { delete FOTO[kk]; });
    });
  }
  function fotoSrc(id, j) { var v = FOTO[id + '|' + j]; return v && v !== 'memuat' ? v : ''; }
  function baris(lbl, v) { return '<div class="kbRow"><span>' + esc(lbl) + '</span>' + (v ? '<b>' + esc(v) + '</b>' : '<b class="kos">belum diisi</b>') + '</div>'; }
  function isiDetail() {
    if (!U) return uMuat ? '<div class="kbKosong"><span class="putar"></span> Memuat…</div>' : '<div class="kbKosong">' + esc(uGalat) + '</div>';
    var o = U.o, pf = fotoSrc(U.id, 'ID');
    var h = '<div class="kbAtas"><div class="pp">' + (pf ? '<img src="' + pf + '" alt="">' : esc(inisial(o.nama || U.namaSistem))) + '</div><div style="min-width:0"><h1>' + esc(o.nama || U.namaSistem) + '</h1><div class="sub">' + esc(U.id + (U.kartu && U.kartu !== U.id ? ' · kartu ' + U.kartu : '')) + '</div>'
      + '<div class="kbTags"><span class="kbTag">' + esc(U.jenis) + '</span>' + (U.lambung ? '<span class="kbTag">' + esc(U.lambung) + '</span>' : '') + (U.baru ? '<span class="kbTag">Dari app</span>' : '') + '<span class="kbTag ' + (U.kurang.length ? 'blm' : 'ok') + '">' + (U.kurang.length ? 'Kurang ' + U.kurang.length : '✓ Lengkap') + '</span></div></div></div>';
    if (U.kurang.length) h += '<div class="kbKurang"><b>Yang masih kurang:</b> ' + esc(U.kurang.join(', ')) + '</div>';
    h += '<div class="kbAksi" style="margin-top:0"><button type="button" class="tUtama" data-l="lengkapi">📷 Lengkapi</button><button type="button" class="kbBtn2" data-l="kartu">🪪 Pratinjau ID card</button></div>';
    h += '<div class="kbH2">Dokumen</div><div class="kbDok">' + [['ID', 'Foto ID card'], ['KTP', 'KTP'], ['SIM', 'SIM']].map(function (x) {
      var k = { ID: 'id', KTP: 'ktp', SIM: 'sim' }[x[0]], s = fotoSrc(U.id, x[0]);
      return '<button type="button" data-l="' + (s ? 'lihat:' + x[0] : 'lengkapi') + '">' + (s ? '<img src="' + s + '" alt="">' : U.foto[k] === 'KARTU' ? 'Foto kartu GASPOL' : U.foto[k] ? 'Memuat…' : '＋ ' + x[1]) + '<i>' + x[1] + '</i></button>';
    }).join('') + '</div>';
    h += '<div class="kbH2">Identitas</div><div class="kartu">' + baris('Jabatan', o.jabatan) + baris('Divisi', o.divisi) + baris('Tgl masuk', tglID(o.tglMasuk)) + baris('No HP', o.hp) + baris('Vendor', o.vendor) + baris('No KOP', o.kop) + '</div>';
    h += '<div class="kbH2">KTP</div><div class="kartu">' + baris('NIK KTP', o.nikKtp) + baris('Nama di KTP', o.nama) + baris('Tempat, tgl lahir', [o.tempatLahir, tglID(o.tglLahir)].filter(Boolean).join(', ')) + baris('Jenis kelamin', o.jk) + baris('Agama', o.agama) + baris('Alamat', o.alamat) + '</div>';
    h += '<div class="kbH2">SIM</div><div class="kartu">' + baris('No SIM', o.noSim) + baris('Golongan', o.golSim) + baris('Berlaku s/d', tglID(o.simBerlaku)) + '</div>';
    if (o.diubah) h += '<div class="kbJml" style="margin-top:10px">Terakhir diubah ' + esc(o.diubah + (o.diubahOleh ? ' oleh ' + o.diubahOleh : '')) + (o.cetak ? ' · ID card diekspor ' + esc(o.cetak) : '') + '</div>';
    return h;
  }

  /* ---------- FORM (baru / lengkapi) ---------- */
  var ISIAN = ['nama', 'panggilan', 'jabatan', 'nikKtp', 'tempatLahir', 'tglLahir', 'jk', 'agama', 'golDarah', 'kawin', 'alamat', 'hp', 'tglMasuk', 'noSim', 'golSim', 'simBerlaku', 'vendor', 'kop', 'kopBerlaku', 'catatan'];
  function bukaBaru() {
    FORM = { mode: 'baru', isi: { tglMasuk: (OPSI && OPSI.hariIni) || '', vendor: 'PT.WHL' }, ai: {}, foto: {}, prev: {}, proses: {}, st: {}, mini: '', orangBeda: false, kirim: false, galat: '' };
    layar = 'form'; lapis(); if (!OPSI) muatOpsi().then(function () { if (FORM && !FORM.isi.tglMasuk && OPSI) FORM.isi.tglMasuk = OPSI.hariIni; if (lapisEl && layar === 'form') lapis(); });
  }
  function bukaLengkapi() {
    if (!U) return; var isi = {}; ISIAN.forEach(function (k) { isi[k] = U.o[k] || ''; }); if (!isi.nama) isi.nama = U.namaSistem;
    FORM = { mode: 'lengkapi', id: U.id, jenis: U.jenis, bolehIdentitas: U.bolehIdentitas, isi: isi, ai: {}, foto: {}, prev: {}, proses: {}, st: {}, mini: '', kirim: false, galat: '' };
    ['ID', 'KTP', 'SIM'].forEach(function (j) { var s = fotoSrc(U.id, j); if (s) FORM.prev[j] = s; });
    layar = 'form'; lapis(); if (!OPSI) muatOpsi().then(function () { if (lapisEl && layar === 'form') lapis(); });
  }
  function inp(k, lbl, o) {
    o = o || {}; var v = FORM.isi[k] || '', ai = FORM.ai[k] ? '<span class="ai">AI</span>' : '', w = o.wajib ? ' <span class="wajib">*</span>' : '';
    var atr = ' id="kbF_' + k + '" data-k="' + k + '"' + (o.dis ? ' disabled' : '') + (o.max ? ' maxlength="' + o.max + '"' : '');
    if (o.pilih) return '<label for="kbF_' + k + '">' + esc(lbl) + w + ai + '</label><select class="isian"' + atr + '><option value="">— pilih —</option>' + o.pilih.map(function (p) { return '<option' + (p === v ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') + (v && o.pilih.indexOf(v) < 0 ? '<option selected>' + esc(v) + '</option>' : '') + '</select>';
    if (o.panjang) return '<label for="kbF_' + k + '">' + esc(lbl) + w + ai + '</label><textarea class="isian kapital" rows="3"' + atr + '>' + esc(v) + '</textarea>';
    return '<label for="kbF_' + k + '">' + esc(lbl) + w + ai + '</label><input class="isian' + (o.tipe ? '' : ' kapital') + '" type="' + (o.tipe || 'text') + '"' + (o.num ? ' inputmode="numeric"' : '') + atr + ' value="' + esc(v) + '" autocomplete="off" autocapitalize="characters">';
  }
  function kotakUnggah(j, judul, ket) {
    var p = FORM.prev[j], pr = FORM.proses[j], st = FORM.st[j];
    return '<div class="kbUp"><h3>' + judul + '</h3><div class="kc">' + ket + '</div>'
      + '<div class="tb"><label class="kbBtn2">📷 Kamera<input type="file" accept="image/*" capture="environment" data-f="' + j + '" hidden></label><label class="kbBtn2">🖼️ Galeri<input type="file" accept="image/*" data-f="' + j + '" hidden></label></div>'
      + (p ? '<div class="prev"><img src="' + p + '" alt="Foto ' + j + '"></div>' : '')
      + (pr ? '<div class="st blm"><span class="putar"></span> ' + (j === 'ID' ? 'Mengunggah…' : 'Mengunggah & AI membaca… (±10–30 dtk)') + '</div>' : st ? '<div class="st ' + st[0] + '">' + esc(st[1]) + '</div>' : '') + '</div>';
  }
  function isiForm() {
    if (!FORM) return '';
    var baru = FORM.mode === 'baru', idn = baru || FORM.bolehIdentitas, J = OPSI ? OPSI.jabatan.map(function (x) { return x.j; }) : ['TYREMAN', 'MEKANIK MAINTENANCE'];
    var h = '<div class="kbF">';
    h += baru ? '<div class="kbIdBaru">ID karyawan dibuat <b>otomatis</b> saat Simpan' + (OPSI && OPSI.idBerikut ? ' (perkiraan <b>' + esc(OPSI.idBerikut) + '</b>)' : '') + '. Tidak perlu diketik.</div>'
      : '<div class="kbIdBaru">Melengkapi <b>' + esc(FORM.id) + '</b>' + (idn ? '' : ' · nama & jabatan di sistem tidak diubah dari sini') + '</div>';
    h += kotakUnggah('KTP', '1. Foto KTP', 'Foto KTP lurus, terang, tidak silau. AI ' + (OPSI && OPSI.ai ? '(' + esc(OPSI.ai) + ') ' : '') + 'mengisi NIK, nama, lahir, alamat. Cek lagi sebelum simpan.');
    h += kotakUnggah('SIM', '2. Foto SIM' + (FORM.jenis === 'DRIVER' ? ' <span class="wajib">*</span>' : ' (kalau ada)'), 'No SIM, golongan, dan masa berlaku terisi otomatis.');
    h += kotakUnggah('ID', '3. Foto ID card', 'Format ID card: <b>latar putih, seragam hitam</b>, badan tegak, wajah jelas.');
    h += '<div class="kbH2">Isian (bisa dikoreksi)</div>';
    h += inp('nama', 'Nama lengkap (sesuai KTP)', { wajib: baru, dis: !idn && false, max: 60 });
    if (idn) h += inp('jabatan', 'Jabatan / divisi', { wajib: true, pilih: J });
    h += inp('panggilan', 'Nama panggilan', { max: 30 });
    h += '<div class="dua"><div>' + inp('hp', 'No HP (manual)', { wajib: baru, tipe: 'tel', num: true, max: 16 }) + '</div><div>' + inp('tglMasuk', 'Tgl masuk kerja (manual)', { wajib: baru, tipe: 'date' }) + '</div></div>';
    h += inp('nikKtp', 'NIK KTP (16 angka)', { tipe: 'text', num: true, max: 16 });
    h += '<div class="dua"><div>' + inp('tempatLahir', 'Tempat lahir', { max: 40 }) + '</div><div>' + inp('tglLahir', 'Tgl lahir', { tipe: 'date' }) + '</div></div>';
    h += '<div class="dua"><div>' + inp('jk', 'Jenis kelamin', { pilih: ['LAKI-LAKI', 'PEREMPUAN'] }) + '</div><div>' + inp('agama', 'Agama', { pilih: ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU'] }) + '</div></div>';
    h += inp('alamat', 'Alamat (sesuai KTP)', { panjang: true });
    h += '<div class="dua"><div>' + inp('noSim', 'No SIM', { max: 20 }) + '</div><div>' + inp('golSim', 'Gol SIM', { pilih: ['A', 'B1', 'B1 UMUM', 'B2', 'B2 UMUM', 'C'] }) + '</div></div>';
    h += inp('simBerlaku', 'SIM berlaku s/d', { tipe: 'date' });
    h += '<div class="dua"><div>' + inp('vendor', 'Vendor', { max: 30 }) + '</div><div>' + inp('kop', 'No KOP (kalau ada)', { max: 40 }) + '</div></div>';
    if (FORM.isi.kop) h += inp('kopBerlaku', 'KOP berlaku s/d', { tipe: 'date' });
    h += inp('catatan', 'Catatan (boleh kosong)', { max: 200 });
    if (baru && FORM.namaSama) h += '<label class="kbCent"><input type="checkbox" id="kbOrangBeda"' + (FORM.orangBeda ? ' checked' : '') + '> Orang berbeda (nama sama dengan karyawan lain)</label>';
    if (FORM.galat) h += '<div class="kbGalat">' + esc(FORM.galat) + '</div>';
    var sibuk = FORM.kirim || Object.keys(FORM.proses).some(function (k) { return FORM.proses[k]; });
    h += '<div class="kbSimpan"><button type="button" class="tUtama" data-l="simpan"' + (sibuk ? ' disabled' : '') + ' style="width:100%;min-height:52px;margin:0">' + (FORM.kirim ? 'Menyimpan…' : baru ? 'Simpan & buat ID' : 'Simpan') + '</button></div></div>';
    return h;
  }
  /* kompres: tunggu gambar selesai dimuat (pelajaran foto nota putih 16 Nov) */
  function kecilkan(src, maks, q, persegi) {
    return new Promise(function (ok, gagal) {
      var im = new Image();
      im.onload = function () {
        try {
          var w = im.naturalWidth, hh = im.naturalHeight, sx = 0, sy = 0, sw = w, sh = hh;
          if (persegi) { var s0 = Math.min(w, hh); sx = (w - s0) / 2; sy = Math.max(0, (hh - s0) * 0.25); sw = sh = s0; }
          var s = Math.min(1, maks / Math.max(sw, sh)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(sw * s)); c.height = Math.max(1, Math.round(sh * s));
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, sx, sy, sw, sh, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/jpeg', q));
        } catch (e) { gagal(e); }
      };
      im.onerror = function () { gagal(new Error('Foto tidak bisa dibaca. Coba foto lain.')); };
      im.src = src;
    });
  }
  function bacaFile(f) { return new Promise(function (ok, gagal) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = function () { gagal(new Error('File tidak bisa dibaca.')); }; r.readAsDataURL(f); }); }
  function ubah(ev) {
    var t = ev.target; if (!t) return;
    if (t.id === 'kbOrangBeda' && FORM) { FORM.orangBeda = !!t.checked; return; }
    if (t.getAttribute('data-k') && FORM) { FORM.isi[t.getAttribute('data-k')] = t.value; delete FORM.ai[t.getAttribute('data-k')]; if (t.getAttribute('data-k') === 'kop') lapis(); return; }
    var j = t.getAttribute('data-f'); if (!j || !FORM) return;
    var f = t.files && t.files[0]; t.value = ''; if (!f) return;
    if (!/^image\//.test(f.type || 'image/')) { roti('Pilih file foto.'); return; }
    var form = FORM; form.proses[j] = true; form.st[j] = null; form.galat = ''; lapis();
    bacaFile(f).then(function (asli) {
      return Promise.all([kecilkan(asli, 1600, 0.85), j === 'ID' ? kecilkan(asli, 120, 0.6, true) : Promise.resolve('')]);
    }).then(function (hs) {
      form.prev[j] = hs[0]; if (j === 'ID') form.mini = hs[1]; if (lapisEl && FORM === form) lapis();
      return panggil('pusatKbUnggah', [{ jenis: j, mime: 'image/jpeg', b64: hs[0].split(',')[1], baca: j !== 'ID' }], 120000);
    }).then(function (h) {
      form.proses[j] = false;
      if (!h || !h.ok) { form.st[j] = ['mrh', (h && h.pesan) || 'Gagal mengunggah.']; }
      else {
        form.foto[j.toLowerCase()] = h.fileId;
        var n = 0;
        if (h.baca) Object.keys(h.baca).forEach(function (k) { if (k.charAt(0) === '_' || !h.baca[k] || ISIAN.indexOf(k) < 0) return; if (k === 'nama' && form.mode === 'lengkapi' && !form.bolehIdentitas && form.isi.nama && j === 'SIM') return; if (!form.isi[k] || form.ai[k] || k === 'nikKtp' || k === 'noSim') { if (form.isi[k] !== h.baca[k]) n++; form.isi[k] = h.baca[k]; form.ai[k] = 1; } });
        form.st[j] = [h.baca ? 'ok' : j === 'ID' ? 'ok' : 'blm', j === 'ID' ? '✓ Foto tersimpan.' : h.baca ? '✓ ' + (h.pesanAi || 'Terbaca.') + ' ' + n + ' isian diisi AI.' + (h.baca._cek ? ' ' + h.baca._cek : '') + (h.baca._catatan ? ' (' + h.baca._catatan + ')' : '') : '✓ Foto tersimpan. ' + (h.pesanAi || 'Isi manual.')];
        if (R.getar) R.getar('sukses');
      }
      if (lapisEl && FORM === form) lapis();
    }).catch(function (e) { form.proses[j] = false; form.st[j] = ['mrh', (e && e.message) || 'Sinyal putus, coba lagi.']; if (lapisEl && FORM === form) lapis(); });
  }
  function ketik(ev) {
    var t = ev.target; if (!t) return;
    if (t.id === 'kbCari') { F.cari = t.value; var g = lapisEl.querySelector('#kbGrid'); if (g) g.innerHTML = htmlGrid(); return; }
    var k = t.getAttribute('data-k'); if (k && FORM) { FORM.isi[k] = t.value; delete FORM.ai[k]; }
  }
  /* kapital dibuat saat keluar kolom (BUKAN tiap ketikan: keyboard HP menghapus teks) */
  function kapitalkan(ev) { var t = ev.target; if (!t || !t.classList || !t.classList.contains('kapital') || !FORM) return; var v = String(t.value || '').toUpperCase(); if (v !== t.value) t.value = v; var k = t.getAttribute('data-k'); if (k) FORM.isi[k] = v; }
  function simpan() {
    if (!FORM || FORM.kirim) return;
    var form = FORM, isi = {};
    ISIAN.forEach(function (k) { var v = String(form.isi[k] == null ? '' : form.isi[k]).trim(); isi[k] = /^(tglLahir|tglMasuk|simBerlaku|kopBerlaku|hp|nikKtp)$/.test(k) ? v : v.toUpperCase(); });
    if (form.mode === 'lengkapi' && !form.bolehIdentitas) delete isi.jabatan;
    var kurang = [];
    if (form.mode === 'baru') { if (isi.nama.length < 3) kurang.push('Nama lengkap'); if (!isi.jabatan) kurang.push('Jabatan'); if (!isi.hp) kurang.push('No HP'); if (!isi.tglMasuk) kurang.push('Tgl masuk'); }
    if (isi.nikKtp && isi.nikKtp.replace(/\D/g, '').length !== 16) kurang.push('NIK KTP harus 16 angka');
    if (kurang.length) { form.galat = 'Belum lengkap: ' + kurang.join(', ') + '.'; lapis(); return; }
    form.kirim = true; form.galat = ''; lapis();
    panggil('pusatKbSimpan', [{ mode: form.mode, id: form.id || '', isi: isi, foto: form.foto, mini: form.mini, orangBeda: !!form.orangBeda }], 90000).then(function (h) {
      form.kirim = false;
      if (!h || !h.ok) { form.galat = (h && h.pesan) || 'Gagal simpan.'; if (h && h.namaSama) form.namaSama = true; if (h && h.login === false && CTX && CTX.sesiHabis) CTX.sesiHabis(); if (lapisEl && FORM === form) lapis(); return; }
      if (R.bunyi) R.bunyi('sukses'); roti(h.pesan + (h.kurang && h.kurang.length ? ' Masih kurang: ' + h.kurang.join(', ') + '.' : ''));
      Object.keys(FOTO).forEach(function (k) { if (k.indexOf(h.id + '|') === 0) delete FOTO[k]; });
      FORM = null; OPSI = null; muatOpsi(); muat(false); bukaOrang(h.id);
    }).catch(function (e) { form.kirim = false; form.galat = (e && e.message) || 'Sinyal putus. Data belum tersimpan, coba lagi.'; if (lapisEl && FORM === form) lapis(); });
  }

  /* ---------- pratinjau ID card (tampilan saja; kartu cetak tetap dari skrip IDCardWHL) ---------- */
  function isiKartu() {
    if (!U) return '';
    var o = U.o, f = fotoSrc(U.id, 'ID'), jab = o.jabatan || '-';
    return '<div class="kbIdc"><div class="ka">PT. WHALE HOLDER LOGISTIC<small>COAL HAULING · MINING LOGISTICS</small></div><div class="kbPita">KARTU IDENTITAS KARYAWAN</div><div class="fo">' + (f ? '<img src="' + f + '" alt="">' : esc(inisial(o.nama || U.namaSistem))) + '</div>'
      + '<div class="nm">' + esc(o.nama || U.namaSistem) + '</div><div class="jb">' + esc(jab) + '</div><div class="nk">NIK KARYAWAN</div><div class="id">' + esc(U.id) + '</div></div>'
      + '<div class="kbJml" style="text-align:center">Pratinjau sederhana. Kartu cetak (depan + QR profil di belakang) dibuat dari menu Ekspor → Paket ID card lalu skrip IDCardWHL di laptop.</div>'
      + (f ? '' : '<div class="kbKurang">Foto ID card belum ada. Tekan Lengkapi → 3. Foto ID card.</div>');
  }

  /* ---------- EKSPOR ---------- */
  function bukaEkspor(jenis) { layar = 'ekspor'; EK = { jenis: jenis, semua: false, tandai: true, hasil: null, galat: '' }; lapis(); }
  function jalankanEkspor() {
    if (!EK || ekMuat) return; ekMuat = true; EK.galat = ''; EK.hasil = null; lapis();
    var e = EK;
    panggil('pusatKbEkspor', [{ jenis: e.jenis, semua: e.semua, tandai: e.tandai }], 120000).then(function (h) {
      ekMuat = false; if (!h || !h.ok) e.galat = (h && h.pesan) || 'Ekspor gagal.'; else e.hasil = h;
      if (lapisEl && EK === e) lapis();
    }).catch(function (x) { ekMuat = false; e.galat = (x && x.message) || 'Sinyal putus.'; if (lapisEl) lapis(); });
  }
  function isiEkspor() {
    if (!EK) return ''; var k = EK.jenis === 'kimper', h = '';
    h += '<div class="kbUp"><h3>' + (k ? '📋 Baris DATA KIMPER' : '🪪 Paket ID card') + '</h3><div class="kc">' + (k
      ? 'Baris siap tempel ke tab DATA KIMPER (file xlsx di Drive). Kolom A–R; kolom rumus (UMUR, SISA WAKTU) dikosongkan → salin rumus dari baris di atasnya. App TIDAK menulis ke xlsx.'
      : 'ZIP berisi karyawan.csv (ID, nama, jabatan) + foto ID card, disimpan di folder Drive privat. Unduh ke laptop lalu jalankan skrip <b>buat_idcard_karyawan_baru.py</b> di IDCardWHL → PNG + PDF cetak (biasa & MIRROR).') + '</div>'
      + '<label class="kbCent"><input type="checkbox" data-e="semua"' + (EK.semua ? ' checked' : '') + '> ' + (k ? 'Semua staf yang punya data (bukan cuma karyawan baru yang belum diekspor)' : 'Semua staf berfoto (termasuk yang sudah pernah diekspor)') + '</label>'
      + '<label class="kbCent"><input type="checkbox" data-e="tandai"' + (EK.tandai ? ' checked' : '') + '> Tandai ' + (k ? 'sudah diekspor ke Kimper' : 'sudah dicetak') + '</label>'
      + '<button type="button" class="tUtama" data-l="jalanEkspor" style="width:100%;margin-top:12px"' + (ekMuat ? ' disabled' : '') + '>' + (ekMuat ? 'Menyiapkan…' : 'Buat sekarang') + '</button></div>';
    if (EK.galat) h += '<div class="kbGalat">' + esc(EK.galat) + '</div>';
    var H = EK.hasil;
    if (H && H.jenis === 'kimper') h += '<div class="kbUp"><h3>' + H.jumlah + ' baris</h3>' + (H.jumlah ? '<textarea class="isian kbTsv" id="kbTsv" readonly>' + esc(H.tsv) + '</textarea><button type="button" class="kbBtn2" data-l="salin" style="width:100%;margin-top:8px">📋 Salin semua</button>' : '<div class="kc">Tidak ada karyawan baru yang belum diekspor.</div>') + '</div>';
    if (H && H.jenis === 'idcard') h += '<div class="kbUp"><h3>' + H.jumlah + ' kartu siap</h3><div class="kc">' + esc(H.nama) + '<br>' + esc((H.ids || []).join(', ')) + '</div><button type="button" class="tUtama" data-l="bukaZip" style="width:100%;margin-top:10px">Buka di Drive (unduh ZIP)</button></div>';
    return h;
  }

  /* ---------- klik ---------- */
  function klik(ev) {
    var b = ev.target.closest('[data-l],[data-e]'); if (!b) return;
    if (b.hasAttribute('data-e')) { if (EK) EK[b.getAttribute('data-e')] = !!b.checked; return; }
    var a = b.getAttribute('data-l'), i = a.indexOf(':'), n = i < 0 ? a : a.slice(0, i), v = i < 0 ? '' : a.slice(i + 1);
    if (n === 'kembali') { kembali(); return; }
    if (n === 'tutupLihat') { if (ev.target === b || b.tagName === 'BUTTON') { LIHAT = null; lapis(); } return; }
    if (n === 'segar') { muat(true); return; }
    if (n === 'jenis') { F.jenis = v; lapis(); return; }
    if (n === 'divisi') { F.divisi = v; lapis(); return; }
    if (n === 'kurang') { F.kurang = !F.kurang; lapis(); return; }
    if (n === 'orang') { bukaOrang(v); return; }
    if (n === 'baru') { bukaBaru(); return; }
    if (n === 'lengkapi') { bukaLengkapi(); return; }
    if (n === 'kartu') { layar = 'kartu'; lapis(); return; }
    if (n === 'lihat') { var s = fotoSrc(U && U.id, v); if (s) { LIHAT = { src: s, judul: v === 'ID' ? 'Foto ID card' : v }; lapis(); } return; }
    if (n === 'simpan') { simpan(); return; }
    if (n === 'ekspor') { bukaEkspor(v); return; }
    if (n === 'jalanEkspor') { jalankanEkspor(); return; }
    if (n === 'bukaZip') { if (EK && EK.hasil && EK.hasil.url && CTX && CTX.bukaWeb) CTX.bukaWeb(EK.hasil.url); return; }
    if (n === 'salin') { var t = lapisEl.querySelector('#kbTsv'); if (!t) return; var ok = function () { roti('Disalin. Tempel di sel A baris kosong DATA KIMPER.'); }; if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(ok, function () { t.select(); document.execCommand('copy'); ok(); }); else { t.select(); document.execCommand('copy'); ok(); } return; }
  }
  /** Keluar / ganti akun: buang semua data pribadi dari memori. */
  function lupakan() { D = null; OPSI = null; U = null; FORM = null; EK = null; FOTO = {}; LIHAT = null; if (lapisEl) { try { lapisEl.remove(); } catch (e) { /* */ } lapisEl = null; } }

  window.WHL_KARYAWAN = { boleh: boleh, buka: buka, kembali: kembali, lupakan: lupakan, _uji: { sayaBoleh: sayaBoleh, cocok: cocok, F: F } };
})();
