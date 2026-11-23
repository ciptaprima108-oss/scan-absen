/* WHL App — KATALOG UNIT (katalog-unit-16nov, Armand 16 Nov 2026).
 * Reza: "fitur katalog Unit kita, isinya data unit trus fotonya, semua data2nya. Bukan data perbaikan." + "Unit kita aja (Trintin, Tronton), vendor gausah."
 * Lihat: pimpinan / akses penuh / admin / admin HR&HSE / pengawas. Ubah (foto, dokumen, isi kolom kosong): admin & pimpinan (server yang memutuskan: bolehUbah).
 * Server DASHBOARD (KatalogUnit.gs) lewat api pusat:
 *   pusatKatalogDaftar [token, paksa] · pusatKatalogDetail [token, lambung] · pusatKatalogFoto [token, lambung, fileId]
 *   pusatKatalogSimpan [token, {lambung, isian, cid}] · pusatKatalogUnggah [token, {lambung, jenis, mime, b64, mini, ket, sampul, cid}]
 *   pusatKatalogSampul [token, {lambung, fotoId, mini}] · pusatKatalogHapusFoto [token, lambung, fotoId]
 * Menu muncul kalau peran cocok DAN pusatPing server sudah memuat pusatKatalogDaftar. Layar asli app, ikut tema terang/gelap (variabel CSS app).
 * Foto unit disimpan di folder Drive PRIVAT; gambarnya diambil lewat server (bukan link Drive). Data cuma di memori selama app terbuka.
 * Tidak memakai alert/confirm: hapus foto = ketuk 2x.
 * v3.46 unit-nonaktif-23nov (Pak Fanza): detail unit -> "Nonaktifkan unit" (alasan Dijual / Tidak dipakai / Lainnya + catatan, ketuk 2x) &
 *   "Aktifkan lagi"; chip filter "Nonaktif". Khusus Fanza/Reza/Rike (server: bolehNonaktif). RPC pusatUnaNonaktif / pusatUnaAktifkan (UnitNonaktif.gs).
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA || {};
  var PERAN = ['pimpinan', 'penuh', 'admin', 'adminhse', 'pengawas'];
  var CTX = null, lapisEl = null, D = null, galat = '', memuat = false, urutan = 0;
  var layar = 'daftar', U = null, uGalat = '', uMuat = false, lembar = null, lihat = null, hapusSiap = '', kirim = false;
  var F = { cari: '', armada: 'SEMUA', merk: '', dok: '', keluar: false };
  var FOTO = {}; // fileId -> dataURL (memori saja)
  var JENIS_UNIT = ['UNIT', 'DEPAN', 'BELAKANG', 'KIRI', 'KANAN', 'KABIN'], JENIS_DOK = ['STNK', 'KIR', 'PAJAK'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { return CTX && CTX.sesi(); }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function getar() { if (R.getar) R.getar(); }
  function panggil(fn, args, ms) { var S = sesi(); return API.Pusat.panggil(fn, [S && S.tokenPusat].concat(args || []), ms || 45000); }
  function serverPunya() { var X = API.Pusat; return !(X.dikenal && X.dikenal()) || X.punya('pusatKatalogDaftar'); }
  function boleh(S) { S = S || sesi(); if (!S || !S.user) return false; var X = API.Pusat; if (X.dikenal && X.dikenal() && X.punya('pusatKatalogRiwayat')) return S.user.peran !== 'driver'; /* v3.31 edit-semua (V526): semua staf selain driver */ return PERAN.indexOf(S.user.peran) >= 0 && serverPunya(); }
  function adminK() { return !U || U.bolehAdmin == null ? true : U.bolehAdmin === true; } /* server lama tanpa bolehAdmin: hapus ikut bisaHapus seperti dulu */
  var NB = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function tglID(t) { return /^\d{4}-\d{2}-\d{2}/.test(t || '') ? (+t.slice(8, 10)) + ' ' + NB[+t.slice(5, 7) - 1] + ' ' + t.slice(0, 4) : (t || ''); }
  function cid() { return 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function namaArmada(a) { return a === 'TRONTON' ? 'Tronton' : 'Trintin'; }

  /* ---------- gaya ---------- */
  function pasangGaya() {
    if (document.getElementById('ktlGaya')) return;
    var st = document.createElement('style'); st.id = 'ktlGaya';
    st.textContent = [
      '.ktlLapis .ksnKp .sp{flex:1}.ktlLapis .ksnKp .kb.segar{font-size:20px}.ktlLapis .ksnKp .kb.segar.putar{animation:ktlPutar 1s linear infinite}@keyframes ktlPutar{to{transform:rotate(360deg)}}',
      '.ktlCari{position:relative;margin:2px 0 10px}.ktlCari input{width:100%;box-sizing:border-box;font-size:16px;min-height:46px;padding:11px 14px 11px 40px;border-radius:14px}',
      '.ktlCari svg{position:absolute;left:13px;top:50%;transform:translateY(-50%);width:18px;height:18px;opacity:.55}',
      '.ktlSeg{display:flex;gap:4px;background:var(--panel2);border-radius:999px;padding:3px;margin-bottom:8px}',
      '.ktlSeg button{flex:1;font-size:13px;font-weight:700;padding:8px 6px;border-radius:999px;color:var(--redup);min-height:38px}',
      '.ktlSeg button.on{background:var(--panel);color:var(--teks);box-shadow:var(--bayang)}',
      '.ktlChips{display:flex;gap:6px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none}.ktlChips::-webkit-scrollbar{display:none}',
      '.ktlChip{flex:none;font-size:12.5px;font-weight:700;padding:7px 12px;border-radius:999px;border:1px solid var(--garis);color:var(--redup);background:var(--panel);min-height:34px;white-space:nowrap}',
      '.ktlChip.on{border-color:var(--biru);color:var(--tBiru);background:rgba(21,101,192,.10)}',
      '.ktlPita{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border-radius:14px;padding:11px 13px;margin-bottom:10px;font-size:13.5px;font-weight:700;color:var(--teks);background:rgba(220,76,76,.10);border:1px solid rgba(220,76,76,.35)}',
      '.ktlPita.org{background:rgba(245,158,11,.11);border-color:rgba(245,158,11,.4)}.ktlPita .ik{font-size:20px}.ktlPita small{display:block;font-weight:600;color:var(--redup);font-size:12px}',
      '.ktlJml{font-size:12.5px;color:var(--redup);margin:0 2px 8px}',
      '.ktlGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.ktlKartu{display:block;width:100%;text-align:left;padding:0;border-radius:16px;overflow:hidden;background:var(--panel);border:1px solid var(--garis);color:var(--teks);box-shadow:var(--bayang);min-width:0}',
      '.ktlKartu .fo{position:relative;aspect-ratio:4/3;background:var(--panel2);display:flex;align-items:center;justify-content:center;overflow:hidden}',
      '.ktlKartu .fo img{width:100%;height:100%;object-fit:cover;display:block}',
      '.ktlKartu .fo .kos{display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--samar);font-size:11px;font-weight:700}.ktlKartu .fo .kos svg{width:54px;height:34px;opacity:.6}',
      '.ktlKartu .ar{position:absolute;left:7px;top:7px;font-size:10.5px;font-weight:800;letter-spacing:.4px;padding:3px 7px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff}',
      '.ktlKartu .ar.tron{background:rgba(124,58,237,.85)}.ktlKartu .ar.trin{background:rgba(21,101,192,.85)}',
      '.ktlKartu .td{position:absolute;right:7px;top:7px;width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)}',
      '.ktlKartu .kl{position:absolute;left:0;right:0;bottom:0;font-size:10.5px;font-weight:800;text-align:center;padding:3px;background:rgba(100,116,139,.92);color:#fff}',
      '.ktlKartu .bw{padding:9px 10px 10px}.ktlKartu .lb{font-size:17px;font-weight:900;letter-spacing:-.2px;line-height:1.15}',
      '.ktlKartu .mk{font-size:12px;color:var(--redup);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}',
      '.ktlKartu .dr{font-size:11.5px;color:var(--redup);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px}',
      '.ktlKartu .bar{height:4px;border-radius:9px;background:var(--panel2);margin-top:7px;overflow:hidden}.ktlKartu .bar i{display:block;height:100%;background:var(--hijau);border-radius:9px}',
      '.ktlD-merah{background:#dc4c4c}.ktlD-oranye{background:#f59e0b}.ktlD-hijau{background:#1fae69}.ktlD-abu{background:#94a3b8}',
      '.ktlKosong{text-align:center;color:var(--redup);padding:36px 12px;font-size:14px}',
      /* detail */
      '.ktlGal{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -14px 12px;padding:0 14px;scrollbar-width:none}.ktlGal::-webkit-scrollbar{display:none}',
      '.ktlGal .gf{flex:none;width:82%;max-width:420px;aspect-ratio:4/3;border-radius:16px;overflow:hidden;background:var(--panel2);position:relative;scroll-snap-align:center;padding:0;border:0}',
      '.ktlGal .gf img{width:100%;height:100%;object-fit:cover;display:block}.ktlGal .gf .lbl{position:absolute;left:8px;bottom:8px;font-size:11.5px;font-weight:800;padding:4px 9px;border-radius:999px;background:rgba(0,0,0,.6);color:#fff}',
      '.ktlGal .gf .sp1{position:absolute;right:8px;top:8px;font-size:11px;font-weight:800;padding:3px 8px;border-radius:999px;background:#f59e0b;color:#1a1a1a}',
      '.ktlGal .gf .mu{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--samar);font-size:12px;font-weight:700}',
      '.ktlGal .gf.tambah{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;width:46%;border:2px dashed var(--garis);background:transparent;color:var(--tBiru);font-weight:800;font-size:13px}',
      '.ktlGal .gf.tambah b{font-size:30px;line-height:1}',
      '.ktlJudul{display:flex;align-items:flex-start;gap:10px;margin-bottom:12px}.ktlJudul h1{font-size:26px;font-weight:900;margin:0;letter-spacing:-.4px;line-height:1.1}',
      '.ktlJudul .sub{font-size:13.5px;color:var(--redup);font-weight:700;margin-top:3px}.ktlJudul .chs{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}',
      '.ktlTag{font-size:11.5px;font-weight:800;padding:4px 9px;border-radius:999px;background:var(--panel2);color:var(--redup)}.ktlTag.trin{color:#fff;background:#1565c0}.ktlTag.tron{color:#fff;background:#7c3aed}.ktlTag.kel{color:#fff;background:#64748b}',
      '.ktlH2{font-size:12px;text-transform:uppercase;letter-spacing:1.3px;color:var(--redup);margin:18px 4px 9px;font-weight:700;display:flex;justify-content:space-between;align-items:center}',
      '.ktlH2 button{font-size:12.5px;letter-spacing:0;text-transform:none;font-weight:800;color:var(--tBiru);padding:4px 2px}',
      '.ktlDok{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
      '.ktlDok .dk{border-radius:14px;padding:10px 9px;background:var(--panel);border:1px solid var(--garis);border-top:4px solid #94a3b8;min-width:0;text-align:left;color:var(--teks)}',
      '.ktlDok .dk.habis{border-top-color:#dc4c4c;background:linear-gradient(180deg,rgba(220,76,76,.10),rgba(220,76,76,0) 70%),var(--panel)}',
      '.ktlDok .dk.segera{border-top-color:#f59e0b;background:linear-gradient(180deg,rgba(245,158,11,.12),rgba(245,158,11,0) 70%),var(--panel)}.ktlDok .dk.aman{border-top-color:#1fae69}',
      '.ktlDok .dk small{display:block;font-size:11.5px;font-weight:800;color:var(--redup)}.ktlDok .dk b{display:block;font-size:13.5px;font-weight:800;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.ktlDok .dk span{display:block;font-size:11.5px;font-weight:700;margin-top:2px}.ktlDok .dk.habis span{color:var(--tMerah)}.ktlDok .dk.segera span{color:var(--tKuning)}.ktlDok .dk.aman span{color:var(--tHijau)}.ktlDok .dk.kosong span{color:var(--samar)}',
      '.ktlDok .dk i{display:block;font-style:normal;font-size:11px;color:var(--tBiru);font-weight:800;margin-top:5px}',
      '.ktlLapis .kartu{padding:4px 16px;display:block}.ktlRow b{flex:1 1 auto}',
      '.ktlRow{display:flex;flex-wrap:nowrap;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid var(--garis);font-size:14px;align-items:flex-start}.ktlRow:first-child{border-top:0}',
      '.ktlRow span{color:var(--redup);flex:0 1 auto;min-width:0}.ktlRow b{text-align:right;min-width:0;word-break:break-word}.ktlRow b small{display:block;font-size:11px;color:var(--samar);font-weight:600}',
      '.ktlRow b small.kor{color:var(--tKuning);font-weight:700}.ktlLmb .oto{display:block;font-size:11.5px;color:var(--samar);font-weight:600;margin:-2px 0 4px}',
      '.ktlRow b.kosong{color:var(--samar);font-weight:600}.ktlRow .isi{font-size:12.5px;font-weight:800;color:var(--tBiru);padding:0 0 0 6px}',
      '.ktlAksi{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.ktlAksi button{min-height:50px;margin:0;font-size:15px;border-radius:14px}',
      '.ktlBtn2{border-radius:14px;font-weight:800;font-size:14px;background:var(--panel2);color:var(--teks);border:1px solid var(--garis);min-height:46px;padding:0 12px}',
      '.ktlBtnMerah{background:#dc4c4c;color:#fff;border-color:#dc4c4c}',
      /* lembar bawah (unggah / isi data) */
      '.ktlLmb{position:fixed;inset:0;z-index:9;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}',
      '.ktlLmb .in{width:100%;max-width:560px;max-height:88vh;overflow-y:auto;background:var(--bg);border-radius:20px 20px 0 0;padding:16px 16px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box}',
      '.ktlLmb h3{margin:0 0 4px;font-size:18px;font-weight:900}.ktlLmb .kc{font-size:12.5px;color:var(--redup);margin-bottom:12px}',
      '.ktlLmb label{display:block;font-size:12.5px;font-weight:800;color:var(--redup);margin:10px 0 5px}.ktlLmb .isian{width:100%;box-sizing:border-box;min-height:46px;font-size:16px}',
      '.ktlLmb .kapital{text-transform:uppercase}.ktlLmb .dua{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.ktlLmb .dua button,.ktlLmb .dua label{min-height:50px;margin:0;font-size:15px}',
      '.ktlLmb .prev{margin-top:10px;border-radius:14px;overflow:hidden;background:var(--panel2)}.ktlLmb .prev img{display:block;width:100%;max-height:240px;object-fit:contain}',
      '.ktlLmb .cent{display:flex;gap:9px;align-items:center;font-size:14px;font-weight:700;margin-top:12px;color:var(--teks)}.ktlLmb .cent input{width:22px;height:22px}',
      /* penampil foto */
      '.ktlLihat{position:fixed;inset:0;z-index:10;background:#000;display:flex;flex-direction:column}',
      '.ktlLihat .ats{display:flex;align-items:center;gap:10px;padding:calc(10px + env(safe-area-inset-top)) 12px 10px;color:#fff}.ktlLihat .ats b{flex:1;font-size:15px}.ktlLihat .ats button{color:#fff;font-size:26px;font-weight:900;min-width:44px;min-height:44px}',
      '.ktlLihat .tg{flex:1;display:flex;align-items:center;justify-content:center;overflow:auto}.ktlLihat .tg img{max-width:100%;max-height:100%;object-fit:contain}.ktlLihat .tg iframe{width:100%;height:100%;border:0;background:#fff}',
      '.ktlLihat .bwh{display:flex;gap:8px;padding:10px 12px calc(12px + env(safe-area-inset-bottom))}.ktlLihat .bwh button{flex:1;min-height:46px;border-radius:14px;font-weight:800;color:#fff;background:rgba(255,255,255,.14)}',
      '.ktlLihat .bwh button.mrh{background:#dc4c4c}.ktlLihat .ket{color:#cbd5e1;font-size:12.5px;padding:0 14px 6px}'
    ].join('');
    document.head.appendChild(st);
  }
  var TRUK = '<svg viewBox="0 0 64 40" fill="currentColor" aria-hidden="true"><rect x="2" y="8" width="36" height="20" rx="3"/><path d="M40 14h12l8 9v5H40z"/><circle cx="14" cy="32" r="5"/><circle cx="48" cy="32" r="5"/></svg>';
  var LUP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';
  var WARNA_DOK = { habis: 'merah', segera: 'oranye', aman: 'hijau', kosong: 'abu' };

  /* ---------- lapis ---------- */
  function lapis() {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      pasangGaya();
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis ktlLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik); lapisEl.addEventListener('input', ketik); lapisEl.addEventListener('change', ubahFile);
    }
    var gulir = lapisEl.querySelector('.ksnIsi'), y = gulir ? gulir.scrollTop : 0, det = layar === 'detail';
    var judul = det && U && U.unit ? U.unit.l : 'Katalog unit', sub = det ? 'Katalog unit' : 'Unit WHL · Trintin & Tronton';
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-l="kembali" aria-label="Kembali">‹</button><div class="nm">' + esc(sub) + '<b>' + esc(judul) + '</b></div><span class="sp"></span>'
      + '<button type="button" class="kb segar' + ((det ? uMuat : memuat) ? ' putar' : '') + '" data-l="segar" aria-label="Muat ulang">⟳</button></div>'
      + '<div class="ksnIsi">' + (det ? isiDetail() : isiDaftar()) + '</div>' + htmlLembar() + htmlLihat();
    var g2 = lapisEl.querySelector('.ksnIsi'); if (g2) g2.scrollTop = y;
    if (det) muatFotoGaleri();
  }
  function tutup() { if (!lapisEl) return; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); if (CTX && CTX.perbarui) CTX.perbarui(); }

  /* ---------- DAFTAR ---------- */
  function cocok(u) {
    if (F.na) { if (u.st !== 'NONAKTIF') return false; } else if (!F.keluar && u.st !== 'AKTIF') return false; /* unit-nonaktif-23nov */
    if (F.armada !== 'SEMUA' && u.a !== F.armada) return false;
    if (F.merk && u.merk !== F.merk) return false;
    if (F.dok === 'habis' && u.dokBuruk !== 'habis') return false;
    if (F.dok === 'segera' && u.dokBuruk !== 'segera') return false;
    var q = F.cari.trim().toUpperCase(); if (!q) return true;
    var angka = q.replace(/[^0-9]/g, '');
    if (angka && angka.length >= 2 && String(Number(angka)) === u.k) return true;
    return [u.l, u.nopol, u.merk, u.tipe, u.lama].concat(u.driver || []).join(' ').toUpperCase().indexOf(q) >= 0;
  }
  function kartu(u) {
    var w = WARNA_DOK[u.dokBuruk] || 'abu', persen = Math.round(100 * (u.lengkap || 0) / (u.dari || 10));
    return '<button type="button" class="ktlKartu' + (u.st === 'NONAKTIF' ? ' na' : '') + '" data-l="unit:' + esc(u.l) + '"><div class="fo">'
      + (u.mini ? '<img src="' + esc(u.mini) + '" alt="Foto ' + esc(u.l) + '" loading="lazy">' : '<span class="kos">' + TRUK + 'Belum ada foto</span>')
      + '<span class="ar ' + (u.a === 'TRONTON' ? 'tron' : 'trin') + '">' + namaArmada(u.a).toUpperCase() + '</span>'
      + '<span class="td ktlD-' + w + '" title="Dokumen"></span>' + (u.nSisi != null ? '<span class="ns' + (Number(u.nSisi) >= 4 ? ' ok' : '') + '">' + Number(u.nSisi) + '/4 sisi</span>' : '') + (u.st !== 'AKTIF' ? '<span class="kl' + (u.st === 'NONAKTIF' ? ' na' : '') + '">' + esc(u.st === 'NONAKTIF' && u.na && u.na.alasan ? 'NONAKTIF · ' + u.na.alasan : u.st) + '</span>' : '') + '</div>'
      + '<div class="bw"><div class="lb">' + esc(u.l) + '</div><div class="mk">' + esc([u.merk || 'Merk belum diisi', u.nopol].filter(Boolean).join(' · ')) + '</div>'
      + '<div class="dr">' + (u.driver && u.driver.length ? '👤 ' + esc(u.driver.join(', ')) : '<span style="opacity:.7">Driver tetap belum ada</span>') + '</div>'
      + '<div class="bar" title="Kelengkapan data ' + persen + '%"><i style="width:' + persen + '%"></i></div></div></button>';
  }
  function htmlGrid() {
    if (!D) return '';
    var L = D.unit.filter(cocok); gayaNa(); /* unit-nonaktif-23nov */
    return '<div class="ktlJml">' + L.length + ' unit' + (F.cari || F.merk || F.dok || F.armada !== 'SEMUA' ? ' cocok' : '') + '</div>'
      + (L.length ? '<div class="ktlGrid">' + L.map(kartu).join('') + '</div>' : '<div class="ktlKosong">Tidak ada unit yang cocok.</div>');
  }
  function isiDaftar() {
    if (!D) return memuat ? '<div class="ktlKosong"><span class="putar"></span> Memuat katalog…</div>' : '<div class="ktlKosong">' + esc(galat || 'Katalog belum termuat.') + '<br><br><button type="button" class="tUtama" data-l="segar">Coba lagi</button></div>';
    var Rg = D.ringkas || {}, merk = Object.keys(Rg.merk || {}).sort();
    var h = '<div class="ktlCari">' + LUP + '<input id="ktlCari" class="isian" type="search" placeholder="Cari lambung, plat, driver, merk…" value="' + esc(F.cari) + '" autocomplete="off"></div>'
      + '<div class="ktlSeg">' + [['SEMUA', 'Semua ' + (Rg.aktif || '')], ['TRINTIN', 'Trintin'], ['TRONTON', 'Tronton']].map(function (x) { return '<button type="button" data-l="armada:' + x[0] + '" class="' + (F.armada === x[0] ? 'on' : '') + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>';
    if (Rg.habis) h += '<button type="button" class="ktlPita" data-l="dok:habis"><span class="ik">⛔</span><span>' + Rg.habis + ' unit dokumennya sudah habis<small>STNK / pajak / KIR lewat tanggal · ketuk untuk lihat</small></span></button>';
    if (Rg.segera) h += '<button type="button" class="ktlPita org" data-l="dok:segera"><span class="ik">⏳</span><span>' + Rg.segera + ' unit dokumennya habis ≤ ' + (D.segeraHari || 30) + ' hari<small>Siapkan perpanjangan</small></span></button>';
    h += '<div class="ktlChips">'
      + '<button type="button" class="ktlChip' + (!F.merk && !F.dok ? ' on' : '') + '" data-l="merk:">Semua merk</button>'
      + merk.map(function (m) { return '<button type="button" class="ktlChip' + (F.merk === m ? ' on' : '') + '" data-l="merk:' + esc(m) + '">' + esc(m) + ' · ' + Rg.merk[m] + '</button>'; }).join('')
      + (F.dok ? '<button type="button" class="ktlChip on" data-l="dok:">' + (F.dok === 'habis' ? 'Dokumen habis' : 'Segera habis') + ' ✕</button>' : '')
      + '<button type="button" class="ktlChip' + (F.keluar ? ' on' : '') + '" data-l="keluar">' + (F.keluar ? '✓ ' : '') + 'Unit keluar</button>' + chipNa() + '</div>'; /* unit-nonaktif-23nov */
    h += eksporHtml(); /* v3.31 Excel (dibuat di HP) + PDF (server) */
    return h + '<div id="ktlGrid">' + htmlGrid() + '</div>' + (D.galat && D.galat.length ? '<div class="ktlJml" style="margin-top:12px">⚠️ Sebagian data otomatis belum terbaca: ' + esc(D.galat.join(' · ')) + '</div>' : '');
  }
  function ketik(ev) { if (ev.target && ev.target.id === 'ktlCari') { F.cari = ev.target.value; var g = lapisEl.querySelector('#ktlGrid'); if (g) g.innerHTML = htmlGrid(); } }

  function muat(paksa) {
    var saya = ++urutan; memuat = true; galat = ''; lapis();
    panggil('pusatKatalogDaftar', [!!paksa], 60000).then(function (h) {
      if (saya !== urutan) return; memuat = false;
      if (!h || !h.ok) { galat = (h && h.pesan) || 'Katalog belum bisa dimuat.'; if (h && h.login === false && CTX && CTX.sesiHabis) CTX.sesiHabis(); }
      else D = h;
      if (lapisEl) lapis();
    }).catch(function (e) { if (saya !== urutan) return; memuat = false; galat = (e && e.message) || 'Sinyal putus. Coba lagi.'; if (lapisEl) lapis(); });
  }

  /* ---------- DETAIL ---------- */
  function bukaUnit(l) { RW.semua = null; RW.yakin = ''; RW.buka = false; layar = 'detail'; U = null; uGalat = ''; hapusSiap = ''; muatUnit(l); }
  function muatUnit(l) {
    uMuat = true; lapis();
    panggil('pusatKatalogDetail', [l], 45000).then(function (h) {
      uMuat = false; if (!h || !h.ok) uGalat = (h && h.pesan) || 'Data unit belum bisa dimuat.'; else { U = h; uGalat = ''; setTimeout(sampulOtomatis, 1500); }
      if (lapisEl && layar === 'detail') lapis();
    }).catch(function (e) { uMuat = false; uGalat = (e && e.message) || 'Sinyal putus.'; if (lapisEl) lapis(); });
  }
  function sisaTeks(d) {
    if (d.s === 'kosong') return 'Belum diisi';
    if (d.s === 'habis') return 'Habis ' + Math.abs(d.sisa) + ' hari lalu';
    if (d.sisa === 0) return 'Habis hari ini';
    return 'Sisa ' + d.sisa + ' hari';
  }
  function isiDetail() {
    if (!U) return uMuat ? '<div class="ktlKosong"><span class="putar"></span> Memuat unit…</div>' : '<div class="ktlKosong">' + esc(uGalat) + '</div>';
    var u = U.unit, ub = U.bolehUbah, fotoUnit = U.foto.filter(function (f) { return JENIS_DOK.indexOf(f.jenis) < 0; });
    var h = '<div class="ktlGal">' + fotoUnit.map(function (f) {
      var src = FOTO[f.fileId];
      return '<button type="button" class="gf" data-l="lihat:' + esc(f.id) + '">' + (src ? '<img src="' + src + '" alt="' + esc(f.label) + '">' : '<span class="mu">' + (f.sumber === 'p2h' || f.mime.indexOf('image') === 0 ? 'Memuat foto…' : 'PDF') + '</span>')
        + '<span class="lbl">' + esc(f.label) + '</span>' + (f.sampul ? '<span class="sp1">Sampul</span>' : '') + '</button>';
    }).join('') + (ub ? '<button type="button" class="gf tambah" data-l="unggah:UNIT"><b>＋</b>Tambah foto</button>' : '')
      + (!fotoUnit.length && !ub ? '<div class="gf"><span class="mu">' + TRUK + '&nbsp;Belum ada foto unit</span></div>' : '') + '</div>';
    h += sisiHtml(fotoUnit, ub); /* v3.31 foto 4 sisi */
    h += '<div class="ktlJudul"><div style="flex:1;min-width:0"><h1>' + esc(u.l) + '</h1><div class="sub">' + esc([u.merk, u.tipe, u.tahun].filter(Boolean).join(' · ') || 'Merk / tipe belum diisi') + '</div>'
      + '<div class="chs"><span class="ktlTag ' + (u.a === 'TRONTON' ? 'tron' : 'trin') + '">' + namaArmada(u.a) + '</span>' + (u.st !== 'AKTIF' ? '<span class="ktlTag kel">' + esc(u.st) + '</span>' : '<span class="ktlTag">Aktif</span>')
      + (u.nopol ? '<span class="ktlTag">' + esc(u.nopol) + '</span>' : '') + (u.lama ? '<span class="ktlTag">Dulu ' + esc(u.lama) + '</span>' : '') + '</div></div></div>';
    h += naHtml(); /* unit-nonaktif-23nov */
    h += '<div class="ktlH2">Dokumen' + (ub ? '<button type="button" data-l="unggah:STNK">＋ Foto dokumen</button>' : '') + '</div><div class="ktlDok">' + U.dok.map(function (d) {
      return '<button type="button" class="dk ' + d.s + '" data-l="' + (d.fotoId ? 'lihat:' + esc(d.fotoId) : ub && !d.tgl ? 'isi' : 'x') + '"><small>' + esc(d.label) + '</small><b>' + (d.tgl ? esc(tglID(d.tgl)) : '—') + '</b><span>' + sisaTeks(d) + '</span>'
        + (d.fotoId ? '<i>Lihat dokumen ›</i>' : ub && !d.tgl ? '<i>Isi tanggal ›</i>' : '') + '</button>';
    }).join('') + '</div>';
    h += '<div class="ktlH2">Data unit' + (ub ? '<button type="button" data-l="isi">✏️ Ubah</button>' : '') + '</div><div class="kartu">'
      + U.data.filter(function (x) { return ['stnk', 'pajak', 'kir'].indexOf(x.k) < 0; }).map(function (x) {
        return '<div class="ktlRow"><span>' + esc(x.label) + '</span>' + (x.v ? '<b>' + esc(x.v) + (x.koreksi ? '<small class="kor">dikoreksi admin · asli: ' + esc(x.asli) + '</small>' : x.src ? '<small>' + esc(x.src === 'Admin' ? 'diisi admin' : 'otomatis · ' + x.src) + '</small>' : '') + diubahHtml(x.k) + '</b>' : '<b class="kosong">belum diisi' + (x.bisaIsi ? '<button type="button" class="isi" data-l="isi">Isi</button>' : '') + '</b>') + '</div>';
      }).join('') + '</div>';
    h += riwayatHtml(); /* v3.31 edit-semua (V526) */
    h += '<div class="ktlH2">Driver tetap</div><div class="kartu">' + (U.driver && U.driver.length ? U.driver.map(function (d) { return '<div class="ktlRow"><span>👤 ' + esc(d.n) + '</span><b>' + esc(d.id || '') + '</b></div>'; }).join('') : '<div class="ktlRow"><span>Belum ada kartu driver dengan lambung utama ini</span></div>') + '</div>';
    h += '<div class="ktlH2">GPS & P2H</div><div class="kartu">'
      + '<div class="ktlRow"><span>IMEI GPS</span>' + (U.gps ? '<b>' + esc(U.gps.imei) + '<small>' + esc(U.gps.nama + (U.gps.akun ? ' · akun ' + U.gps.akun : '')) + '</small></b>' : '<b class="kosong">belum terpasang / belum di-mapping</b>') + '</div>'
      + '<div class="ktlRow"><span>P2H kelengkapan terakhir</span>' + (U.p2h ? '<b>' + esc(U.p2h.tgl || '-') + '<small>' + esc(U.p2h.oleh ? 'oleh ' + U.p2h.oleh : '') + '</small></b>' : '<b class="kosong">belum ada</b>') + '</div></div>';
    if (bolehPdf() && window.WHL_EKSPOR) h += '<div class="ktlEks" style="margin-top:12px"><button type="button" data-l="pdfUnit">📄 PDF unit ini (foto 4 sisi + data)</button></div>'; /* v3.31 */
    if (ub) h += '<div class="ktlAksi"><button type="button" class="tUtama" data-l="unggah:UNIT">📷 Tambah foto</button><button type="button" class="ktlBtn2" data-l="isi">✏️ Ubah / lengkapi</button></div>';
    h += naAksiHtml(); /* unit-nonaktif-23nov */
    return h;
  }
  function muatFotoGaleri() {
    if (!U) return;
    U.foto.forEach(function (f) {
      if (FOTO[f.fileId] || f.memuat || JENIS_DOK.indexOf(f.jenis) >= 0 || (f.mime && f.mime.indexOf('image') !== 0)) return;
      f.memuat = true; var l = U.unit.l;
      panggil('pusatKatalogFoto', [l, f.fileId], 45000).then(function (h) { f.memuat = false; if (h && h.ok) { FOTO[f.fileId] = 'data:' + h.mime + ';base64,' + h.b64; if (lapisEl && U && U.unit.l === l && !lembar) lapis(); } }).catch(function () { f.memuat = false; });
    });
  }

  /* ---------- lembar: isi data ---------- */
  function htmlLembar() {
    if (!lembar || !U) return '';
    if (lembar.jenis === 'na' || lembar.jenis === 'ak') return naLembarHtml(); /* unit-nonaktif-23nov */
    if (lembar.jenis === 'isi') {
      var kolom = U.data.filter(function (x) { return x.bisaIsi; });
      return '<div class="ktlLmb" data-l="tutupLembar"><div class="in" data-l="x"><h3>Ubah / lengkapi ' + esc(U.unit.l) + '</h3><div class="kc">Isi yang kosong, atau koreksi data otomatis. Nilai asli di sheet sumber tetap tersimpan dan tiap koreksi dicatat. Kosongkan koreksi untuk kembali ke nilai otomatis.</div>'
        + (kolom.length ? kolom.map(function (x) {
          var t = x.jenis === 'tgl' ? 'date' : x.jenis === 'tahun' ? 'number' : 'text', kap = x.jenis === 'kode' || x.jenis === 'teks';
          return '<label for="ktlF_' + x.k + '">' + esc(x.label) + '</label>' + (x.otomatis ? '<span class="oto">otomatis: ' + esc(x.otomatis) + (x.otomatisSrc ? ' (' + esc(x.otomatisSrc) + ')' : '') + '</span>' : '') + (x.jenis === 'panjang' ? '<textarea id="ktlF_' + x.k + '" class="isian" rows="3">' + esc(lembar.nilai && x.k in lembar.nilai ? lembar.nilai[x.k] : x.v) + '</textarea>'
            : '<input id="ktlF_' + x.k + '" class="isian' + (kap ? ' kapital' : '') + '" type="' + t + '"' + (t === 'number' ? ' inputmode="numeric" min="1980" max="2100"' : '') + ' value="' + esc(lembar.nilai && x.k in lembar.nilai ? lembar.nilai[x.k] : x.v) + '" autocomplete="off">');
        }).join('') : '<div class="kc">Semua kolom sudah lengkap.</div>')
        + '<div class="dua"><button type="button" class="ktlBtn2" data-l="tutupLembar">Batal</button><button type="button" class="tUtama" data-l="simpan"' + (kirim ? ' disabled' : '') + '>' + (kirim ? 'Menyimpan…' : 'Simpan') + '</button></div></div></div>';
    }
    var dok = JENIS_DOK.indexOf(lembar.pilih) >= 0, J = U.jenisFoto || {};
    return '<div class="ktlLmb" data-l="tutupLembar"><div class="in" data-l="x"><h3>' + (dok ? 'Foto dokumen' : 'Tambah foto') + ' · ' + esc(U.unit.l) + '</h3><div class="kc">Foto disimpan di folder Drive privat WHL, cuma bisa dilihat lewat app.</div>'
      + '<label>Jenis</label><div class="ktlChips" style="flex-wrap:wrap">' + (dok ? JENIS_DOK : JENIS_UNIT.concat(['LAIN'])).map(function (j) { return '<button type="button" class="ktlChip' + (lembar.pilih === j ? ' on' : '') + '" data-l="jenis:' + j + '">' + esc(J[j] || j) + '</button>'; }).join('') + '</div>'
      + '<div class="dua" style="margin-top:4px"><label class="ktlBtn2" style="display:flex;align-items:center;justify-content:center;margin:0">📷 Kamera<input type="file" accept="image/*" capture="environment" data-f="foto" hidden></label>'
      + '<label class="ktlBtn2" style="display:flex;align-items:center;justify-content:center;margin:0">🖼️ Galeri' + (dok ? ' / PDF' : '') + '<input type="file" accept="image/*' + (dok ? ',application/pdf' : '') + '" data-f="foto" hidden></label></div>'
      + (lembar.pratinjau ? '<div class="prev">' + (lembar.mime === 'application/pdf' ? '<div class="ktlKosong">📄 ' + esc(lembar.nama || 'PDF') + '</div>' : '<img src="' + lembar.pratinjau + '" alt="Pratinjau">') + '</div>' : '')
      + (lembar.proses ? '<div class="kc" style="margin-top:8px"><span class="putar"></span> Menyiapkan foto…</div>' : '')
      + '<label for="ktlKet">Keterangan (boleh kosong)</label><input id="ktlKet" class="isian" maxlength="120" value="' + esc(lembar.ket || '') + '">'
      + (!dok ? '<label class="cent"><input type="checkbox" id="ktlSampul"' + (lembar.sampul ? ' checked' : '') + '> Jadikan foto sampul katalog</label>' : '')
      + '<div class="dua"><button type="button" class="ktlBtn2" data-l="tutupLembar">Batal</button><button type="button" class="tUtama" data-l="kirimFoto"' + (!lembar.b64 || kirim ? ' disabled' : '') + '>' + (kirim ? 'Mengirim…' : 'Simpan foto') + '</button></div></div></div>';
  }
  /* kompres: tunggu gambar BENAR-BENAR selesai dimuat sebelum digambar (pelajaran foto nota putih 16 Nov) */
  function kecilkan(src, maks, q) {
    return new Promise(function (ok, gagal) {
      var im = new Image();
      im.onload = function () {
        try {
          var s = Math.min(1, maks / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.naturalWidth * s)); c.height = Math.max(1, Math.round(im.naturalHeight * s));
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/jpeg', q));
        } catch (e) { gagal(e); }
      };
      im.onerror = function () { gagal(new Error('Foto tidak bisa dibaca. Coba foto lain.')); };
      im.src = src;
    });
  }
  function bacaFile(f) { return new Promise(function (ok, gagal) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = function () { gagal(new Error('File tidak bisa dibaca.')); }; r.readAsDataURL(f); }); }
  function ubahFile(ev) {
    var inp = ev.target; if (!inp || inp.getAttribute('data-f') !== 'foto' || !lembar) return;
    var f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
    simpanKet();
    if (f.type === 'application/pdf') {
      if (f.size > 2500000) { roti('PDF maksimal 2,5 MB.'); return; }
      lembar.proses = true; lapis();
      bacaFile(f).then(function (d) { lembar.proses = false; lembar.mime = 'application/pdf'; lembar.b64 = d.split(',')[1]; lembar.mini = ''; lembar.pratinjau = 'pdf'; lembar.nama = f.name; lapis(); }).catch(function (e) { lembar.proses = false; roti(e.message); lapis(); });
      return;
    }
    lembar.proses = true; lapis();
    var url = URL.createObjectURL(f);
    kecilkan(url, 1280, 0.72).then(function (besar) {
      return kecilkan(besar, 240, 0.6).then(function (mini) {
        URL.revokeObjectURL(url);
        var b64 = besar.split(',')[1];
        if (b64.length * 0.75 < 6000) throw new Error('Foto kosong / putih. Ulangi ambil foto.');
        lembar.proses = false; lembar.mime = 'image/jpeg'; lembar.b64 = b64; lembar.mini = mini; lembar.pratinjau = besar; lapis();
      });
    }).catch(function (e) { URL.revokeObjectURL(url); lembar.proses = false; roti((e && e.message) || 'Foto gagal disiapkan.'); lapis(); });
  }
  function simpanKet() { var k = lapisEl && lapisEl.querySelector('#ktlKet'), s = lapisEl && lapisEl.querySelector('#ktlSampul'); if (lembar) { if (k) lembar.ket = k.value; if (s) lembar.sampul = s.checked; } }
  function kirimFoto() {
    simpanKet(); if (!lembar || !lembar.b64 || kirim) return;
    kirim = true; lapis(); var l = U.unit.l;
    if (!lembar.cid) lembar.cid = cid();
    panggil('pusatKatalogUnggah', [{ lambung: l, jenis: lembar.pilih, mime: lembar.mime, b64: lembar.b64, mini: lembar.mini || '', ket: lembar.ket || '', sampul: !!lembar.sampul, cid: lembar.cid }], 120000).then(function (h) {
      kirim = false;
      if (!h || !h.ok) { roti((h && h.pesan) || 'Foto belum tersimpan.'); lapis(); return; }
      if (lembar.pratinjau && lembar.mime !== 'application/pdf') FOTO[h.foto.fileId] = lembar.pratinjau;
      lembar = null; roti(h.pesan || 'Foto tersimpan.'); getar(); D = null; muatUnit(l); muat(false);
    }).catch(function (e) { kirim = false; roti(((e && e.message) || 'Sinyal putus') + '. Ketuk Simpan lagi (tidak akan dobel).'); lapis(); });
  }
  function simpanIsian() {
    if (kirim || !U) return;
    var isian = {}, ada = 0;
    U.data.forEach(function (x) { if (!x.bisaIsi) return; var el = lapisEl.querySelector('#ktlF_' + x.k); if (!el) return; var v = String(el.value || '').trim(); if (x.jenis === 'kode' || x.jenis === 'teks') v = v.toUpperCase(); if (v !== (x.v || '')) { isian[x.k] = v; ada++; } });
    if (!ada) { lembar = null; lapis(); return; }
    lembar.nilai = isian; // isian tetap ada kalau simpan gagal (layar digambar ulang)
    kirim = true; lapis(); var l = U.unit.l;
    panggil('pusatKatalogSimpan', [{ lambung: l, isian: isian, cid: lembar.cid || (lembar.cid = cid()) }], 45000).then(function (h) {
      kirim = false;
      if (!h || !h.ok) { roti((h && h.pesan) || 'Belum tersimpan.'); lapis(); return; }
      roti(h.pesan + (h.dilewati && h.dilewati.length ? ' Dilewati: ' + h.dilewati.join(', ') : '')); getar(); lembar = null; D = null; muatUnit(l); muat(false);
    }).catch(function (e) { kirim = false; roti((e && e.message) || 'Sinyal putus. Coba lagi.'); lapis(); });
  }

  /* ---------- penampil foto / dokumen ---------- */
  function htmlLihat() {
    if (!lihat || !U) return '';
    var f = U.foto.filter(function (x) { return x.id === lihat; })[0]; if (!f) return '';
    var src = FOTO[f.fileId], pdf = f.mime === 'application/pdf';
    var bisaSampul = U.bolehUbah && f.sumber === 'katalog' && !f.sampul && JENIS_DOK.indexOf(f.jenis) < 0 && !pdf;
    return '<div class="ktlLihat"><div class="ats"><button type="button" data-l="tutupLihat" aria-label="Tutup">‹</button><b>' + esc(f.label) + ' · ' + esc(U.unit.l) + '</b></div>'
      + '<div class="tg">' + (src ? (pdf ? '<iframe src="' + src + '" title="Dokumen"></iframe>' : '<img src="' + src + '" alt="' + esc(f.label) + '">') : '<span style="color:#94a3b8"><span class="putar"></span> Memuat…</span>') + '</div>'
      + '<div class="ket">' + esc([f.waktu, f.oleh ? 'oleh ' + f.oleh : '', f.ket].filter(Boolean).join(' · ')) + '</div>'
      + (U.bolehUbah && (bisaSampul || f.bisaHapus) ? '<div class="bwh">' + (bisaSampul ? '<button type="button" data-l="sampul:' + esc(f.id) + '">⭐ Jadikan sampul</button>' : '')
        + (f.bisaHapus && adminK() ? '<button type="button" class="' + (hapusSiap === f.id ? 'mrh' : '') + '" data-l="hapus:' + esc(f.id) + '">' + (hapusSiap === f.id ? 'Ketuk lagi untuk hapus' : '🗑 Hapus') + '</button>' : '') + '</div>' : '') + '</div>';
  }
  function bukaLihat(id) {
    lihat = id; hapusSiap = ''; lapis();
    var f = U.foto.filter(function (x) { return x.id === id; })[0]; if (!f || FOTO[f.fileId]) return;
    panggil('pusatKatalogFoto', [U.unit.l, f.fileId], 60000).then(function (h) {
      if (h && h.ok) { FOTO[f.fileId] = 'data:' + h.mime + ';base64,' + h.b64; if (lihat === id) lapis(); } else { roti((h && h.pesan) || 'Foto tidak bisa dibuka.'); }
    }).catch(function () { roti('Sinyal putus. Coba lagi.'); });
  }
  function jadikanSampul(id) {
    var f = U.foto.filter(function (x) { return x.id === id; })[0], src = f && FOTO[f.fileId]; if (!src || kirim) return;
    kirim = true; var l = U.unit.l;
    kecilkan(src, 240, 0.6).then(function (mini) { return panggil('pusatKatalogSampul', [{ lambung: l, fotoId: id, mini: mini }], 45000); }).then(function (h) {
      kirim = false; roti((h && h.pesan) || 'Belum berhasil.'); if (h && h.ok) { lihat = null; D = null; muatUnit(l); muat(false); }
    }).catch(function (e) { kirim = false; roti((e && e.message) || 'Gagal.'); });
  }
  function hapusFoto(id) {
    if (hapusSiap !== id) { hapusSiap = id; lapis(); setTimeout(function () { if (hapusSiap === id) { hapusSiap = ''; if (lapisEl) lapis(); } }, 4000); return; }
    hapusSiap = ''; var l = U.unit.l;
    panggil('pusatKatalogHapusFoto', [l, id], 45000).then(function (h) { roti((h && h.pesan) || 'Belum terhapus.'); if (h && h.ok) { lihat = null; D = null; muatUnit(l); muat(false); } }).catch(function () { roti('Sinyal putus. Coba lagi.'); });
  }

  /* ---------- v3.31: FOTO 4 SISI (Depan/Belakang/Kiri/Kanan, slot per sisi; unggah lewat pusatKatalogUnggah jenis = sisi) ---------- */
  var SISI = [['DEPAN', 'Depan'], ['BELAKANG', 'Belakang'], ['KIRI', 'Kiri'], ['KANAN', 'Kanan']];
  function gayaV331() {
    if (document.getElementById('ktlGaya331')) return; var st = document.createElement('style'); st.id = 'ktlGaya331';
    st.textContent = '.ktlSisi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:2px 0 12px}.ktlSisi .ss{position:relative;aspect-ratio:1/1;border-radius:14px;overflow:hidden;background:var(--panel2);border:1px dashed var(--garis);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;color:var(--redup);font:inherit;font-size:11.5px;font-weight:800;padding:0}'
      + '.ktlSisi .ss.ada{border-style:solid}.ktlSisi .ss img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.ktlSisi .ss b{font-size:20px;line-height:1;color:var(--utama)}.ktlSisi .ss .nm{position:absolute;left:0;right:0;bottom:0;padding:3px 0;background:rgba(0,0,0,.55);color:#fff;font-size:10.5px}'
      + '.ktlSisi .ss .gt{position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font-size:12px;display:grid;place-items:center}'
      + '.ktlSisi .ss .isi{position:absolute;inset:0;padding:0;background:none;border:0;display:grid;place-items:center;color:var(--redup);font:inherit}.ktlSisi .ss .gt{border:0;padding:0;font:inherit;z-index:2}.ktlSisi .ss .gt.hp{right:auto;left:4px}.ktlSisi .ss .gt.yakin{width:auto;padding:0 6px;border-radius:99px;background:#e5484d;font-size:10px;font-weight:800}'
      + '.ktlKartu .fo .ns{position:absolute;right:6px;bottom:6px;font-size:10px;font-weight:900;padding:2px 6px;border-radius:99px;background:rgba(0,0,0,.55);color:#fff}.ktlKartu .fo .ns.ok{background:#16a34a}'
      + '.ktlEks{display:flex;gap:8px;margin:2px 0 10px}.ktlEks button{flex:1;min-height:40px;border-radius:12px;font-weight:800;font-size:13px;background:var(--panel2);color:var(--teks)}';
    document.head.appendChild(st);
  }
  var SISI_MUAT = {}, SAMPUL_SUDAH = {};
  function muatSisi(fid) { if (!U || SISI_MUAT[fid]) return; SISI_MUAT[fid] = 1; var l = U.unit.l; panggil('pusatKatalogFoto', [l, fid], 45000).then(function (h) { if (h && h.ok) { FOTO[fid] = 'data:' + h.mime + ';base64,' + h.b64; if (lapisEl && U && U.unit.l === l && !lembar && layar === 'detail') lapis(); } }).catch(function () { SISI_MUAT[fid] = 0; }); }
  /** sampul otomatis (kontrak §Sampul otomatis): admin/pimpinan, sekali per unit, diam-diam */
  function sampulOtomatis() {
    if (!U || !U.bolehUbah || !U.sampulSaran || SAMPUL_SUDAH[U.unit.l]) return; var l = U.unit.l, id = U.sampulSaran; SAMPUL_SUDAH[l] = 1;
    var f = (U.foto || []).filter(function (x) { return x.id === id; })[0] || ((U.sisi || []).map(function (s) { return s.foto; }).filter(function (x) { return x && x.id === id; })[0]); if (!f || !f.fileId) return;
    (FOTO[f.fileId] ? Promise.resolve({ ok: true, src: FOTO[f.fileId] }) : panggil('pusatKatalogFoto', [l, f.fileId], 45000)).then(function (h) { if (!h || !h.ok) return; var src = h.src || ('data:' + h.mime + ';base64,' + h.b64); return kecilkan(src, 240, 0.6).then(function (mini) { return panggil('pusatKatalogSampul', [{ lambung: l, fotoId: id, mini: mini }], 45000).then(function (r) { if (r && r.ok && D) { D.unit.forEach(function (u) { if (u.l === l) { u.mini = mini0(r) || mini; u.perluSampul = false; } }); } }); }); }).catch(function () { /* abaikan */ });
  }
  function mini0(r) { return r && r.mini ? r.mini : ''; }
  function sisiHtml(fotoUnit, ub) {
    gayaV331();
    /* server katalog-lengkap-17nov (V525): U.sisi [{k, label, foto:{id, fileId, sumber, bisaHapus}|null}]; server lama: foto terbaru per jenis dari U.foto */
    var SV = U && Array.isArray(U.sisi) && U.sisi.length ? U.sisi : null;
    var ada = 0, h = SISI.map(function (s) {
      var f = null, sv = SV && SV.filter(function (x) { return x.k === s[0]; })[0];
      if (SV) { if (sv && sv.foto) f = { id: sv.foto.id, fileId: sv.foto.fileId, sumber: sv.foto.sumber, bisaHapus: !!sv.foto.bisaHapus }; }
      else f = fotoUnit.filter(function (x) { return x.jenis === s[0]; }).slice(-1)[0];
      if (f) { ada++; var src = FOTO[f.fileId]; if (!src && f.fileId && SV) muatSisi(f.fileId);
        return '<div class="ss ada"><button type="button" class="isi" data-l="lihat:' + esc(f.id) + '" data-fid="' + esc(f.fileId || '') + '">' + (src ? '<img src="' + src + '" alt="' + esc(s[1]) + '">' : '<span>Memuat…</span>') + '</button><span class="nm">' + esc((sv && sv.label) || s[1]) + (f.sumber === 'commissioning' ? ' · Commissioning' : '') + '</span>'
          + (ub ? '<button type="button" class="gt" data-l="unggah:' + s[0] + '" aria-label="Ganti foto ' + s[1] + '">📷</button>' : '')
          + (ub && f.bisaHapus && adminK() && f.sumber !== 'commissioning' ? '<button type="button" class="gt hp' + (hapusSiap === f.id ? ' yakin' : '') + '" data-l="hapus:' + esc(f.id) + '" aria-label="Hapus foto ' + s[1] + '">' + (hapusSiap === f.id ? 'Yakin?' : '🗑') + '</button>' : '') + '</div>'; }
      var lb = esc((sv && sv.label) || s[1]);
      return ub ? '<button type="button" class="ss" data-l="unggah:' + s[0] + '"><b>📷</b>' + lb + '</button>' : '<div class="ss"><span>' + lb + '</span><small>belum ada</small></div>';
    }).join('');
    return '<div class="ktlH2">Foto 4 sisi <small style="font-weight:700;color:var(--redup)">' + ada + '/4</small></div><div class="ktlSisi">' + h + '</div>';
  }
  /* ---------- v3.31: EKSPOR daftar unit (yang sedang tersaring) ---------- */
  /* kontrak Upgrade\katalog-lengkap-17nov\pdf\KONTRAK-APP.md: pusatKatalogPdf(token, {lambung?|armada?, status?, foto?}), pusatKatalogRekap(token, {armada?, status?}) */
  var FN_PDF = 'pusatKatalogPdf', FN_REKAP = 'pusatKatalogRekap';
  function srvPunya(fn) { var X = API.Pusat; return !!(X.punya && X.dikenal && X.dikenal() && X.punya(fn)); }
  function bolehPdf() { return srvPunya(FN_PDF); }
  function eksporHtml() {
    if (!window.WHL_EKSPOR || !D) return ''; gayaV331();
    return '<div class="ktlEks"><button type="button" data-l="excel">📊 Excel</button>' + (bolehPdf() ? '<button type="button" data-l="pdf">📄 PDF ringkas</button><button type="button" data-l="pdf4">📄 PDF + foto</button>' : '') + '</div>';
  }
  function saringSrv() { var s = {}; if (F.armada !== 'SEMUA') s.armada = F.armada; if (F.na) s.status = 'NONAKTIF'; else if (!F.keluar) s.status = 'AKTIF'; return s; } /* unit-nonaktif-23nov */
  function dokTeks(s) { return s === 'habis' ? 'Ada yang habis' : s === 'segera' ? 'Segera habis' : s === 'kosong' ? 'Belum diisi' : 'Aman'; }
  function excel() {
    if (!window.WHL_EKSPOR) return;
    if (srvPunya(FN_REKAP)) { window.WHL_EKSPOR.excelServer(panggil(FN_REKAP, [saringSrv()], 120000), 'Katalog Unit WHL - ' + window.WHL_EKSPOR.tgl(), roti, 'Katalog unit'); return; } /* lengkap: rangka, mesin, warna, STNK/pajak/KIR, foto 4 sisi */
    if (!D) return;
    var L = D.unit.filter(cocok);
    var rows = L.map(function (u) { return [u.l, namaArmada(u.a), u.st || '', u.nopol || '', u.merk || '', u.tipe || '', u.tahun || '', (u.driver || []).join(', '), dokTeks(u.dokBuruk), Math.round(100 * (u.lengkap || 0) / (u.dari || 10)), u.lama || '']; });
    var saring = [F.armada !== 'SEMUA' ? namaArmada(F.armada) : 'Semua armada', F.merk || '', F.dok === 'habis' ? 'dokumen habis' : F.dok === 'segera' ? 'segera habis' : '', F.na ? 'unit nonaktif' : F.keluar ? 'termasuk unit keluar' : 'unit aktif', F.cari ? 'cari "' + F.cari + '"' : ''].filter(Boolean).join(' · ');
    window.WHL_EKSPOR.excel('Katalog Unit WHL - ' + window.WHL_EKSPOR.tgl(), [
      ['Unit', [['Lambung', 'Armada', 'Status', 'Nopol', 'Merk', 'Tipe', 'Tahun', 'Driver tetap', 'Dokumen', 'Kelengkapan data (%)', 'Lambung lama']].concat(rows)],
      ['Ringkas', [['Katalog unit WHL', ''], ['Saringan', saring], ['Jumlah unit', L.length], ['Dibuat', new Date().toLocaleString('id-ID')]]]
    ], roti);
  }
  function pdf(jenis) {
    if (!window.WHL_EKSPOR) return;
    var s = jenis === 'unit' && U ? { lambung: U.unit.l } : saringSrv(); if (jenis === '4sisi') s.foto = '4sisi'; else if (jenis !== 'unit') s.foto = 'sampul';
    window.WHL_EKSPOR.pdf(panggil(FN_PDF, [s], 120000), 'Katalog Unit WHL' + (s.lambung ? ' - ' + s.lambung : ''), roti);
  }

  /* ---------- v3.31 EDIT SEMUA (kontrak Upgrade\katalog-lengkap-17nov\edit-semua\KONTRAK-APP.md, V526): diubah per kolom, riwayat, Kembalikan (admin) ---------- */
  var RW = { buka: false, semua: null, yakin: '' };
  function tglJam(w) { var m = String(w || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); return m ? (+m[3]) + ' ' + NB[+m[2] - 1] + ' ' + m[4] + '.' + m[5] : esc(w || ''); }
  function diubahHtml(k) { var d = U && U.diubah && U.diubah[k]; if (!d) return ''; return '<small class="ktlUbah">diubah oleh ' + esc(d.oleh || '-') + (d.waktu ? ' · ' + tglJam(d.waktu) : '') + (d.sebelumnya ? ' · sebelumnya ' + esc(d.sebelumnya) : '') + '</small>'; }
  function riwayatHtml() {
    var L = (RW.semua && U && RW.semua.l === U.unit.l ? RW.semua.d : (U && U.riwayat)) || []; if (!U || !Array.isArray(U.riwayat)) return '';
    var adm = U.bolehAdmin === true;
    return '<div class="ktlH2"><button type="button" data-l="riwayat" style="background:none;padding:0;font:inherit;color:inherit">Riwayat perubahan ' + (RW.buka ? '▴' : '▾') + '</button><small style="font-weight:700;color:var(--redup)">' + L.length + '</small></div>'
      + (!RW.buka ? '' : '<div class="kartu">' + (L.length ? L.map(function (r) {
        var bisa = adm && r.bisaKembali;
        return '<div class="ktlRow" style="align-items:flex-start"><span>' + esc(r.label || r.kolom || r.aksi || '') + '<small style="display:block">' + tglJam(r.waktu) + ' · ' + esc(r.oleh || '-') + '</small></span><b>' + esc(r.baru != null && r.baru !== '' ? r.baru : r.aksi || '') + (r.lamaTampil || r.lama ? '<small>sebelumnya ' + esc(r.lamaTampil || r.lama) + '</small>' : '')
          + (bisa ? '<button type="button" class="isi' + (RW.yakin === String(r.id) ? ' mrh' : '') + '" data-l="kembali:' + esc(r.id) + '">' + (RW.yakin === String(r.id) ? 'Kembalikan ' + esc(r.label || '') + ' ke ' + esc(r.lamaTampil || r.lama || '(kosong)') + '?' : 'Kembalikan') + '</button>' : '') + '</b></div>';
      }).join('') : '<div class="ktlRow"><span>Belum ada perubahan</span></div>') + (!RW.semua && srvPunya('pusatKatalogRiwayat') ? '<button type="button" class="ktlBtn2" style="width:100%;margin-top:8px" data-l="riwayatSemua">Lihat semua</button>' : '') + '</div>');
  }
  function riwayatSemua() {
    if (!U) return; var l = U.unit.l;
    panggil('pusatKatalogRiwayat', [l], 45000).then(function (h) { if (h && h.ok && U && U.unit.l === l) { RW.semua = { l: l, d: h.riwayat || [] }; if (h.bolehAdmin != null) U.bolehAdmin = h.bolehAdmin; lapis(); } else roti((h && h.pesan) || 'Riwayat belum bisa dimuat.'); }).catch(function () { roti('Sinyal putus. Coba lagi.'); });
  }
  function kembalikan(id) {
    if (!U || kirim) return;
    if (RW.yakin !== String(id)) { RW.yakin = String(id); lapis(); setTimeout(function () { if (RW.yakin === String(id)) { RW.yakin = ''; if (lapisEl) lapis(); } }, 5000); return; }
    var l = U.unit.l; RW.yakin = ''; kirim = true; lapis();
    panggil('pusatKatalogKembalikan', [l, id], 45000).then(function (h) { kirim = false; roti((h && h.pesan) || 'Belum berhasil.'); RW.semua = null; muatUnit(l); if (h && h.ok) muat(false); }).catch(function () { kirim = false; roti('Sinyal putus. Coba lagi.'); lapis(); });
  }

  /* ---------- unit-nonaktif-23nov (Pak Fanza): NONAKTIFKAN UNIT (soft delete) — khusus Fanza/Reza/Rike (server: bolehNonaktif) ---------- */
  function bolehNa() { return !!(U && U.bolehNonaktif === true && srvPunya('pusatUnaNonaktif')); }
  function gayaNa() {
    if (document.getElementById('ktlGayaNa')) return; var st = document.createElement('style'); st.id = 'ktlGayaNa';
    st.textContent = '.ktlNa{border-radius:14px;padding:12px 14px;margin:0 0 12px;background:rgba(220,76,76,.10);border:1px solid rgba(220,76,76,.35);color:var(--teks);font-size:13.5px;line-height:1.4}'
      + '.ktlNa b{display:block;font-size:15px;font-weight:900;color:var(--tMerah)}.ktlNa span{display:block;font-weight:700;margin-top:3px}.ktlNa small{display:block;color:var(--redup);font-size:12px;margin-top:3px}'
      + '.ktlBtnNa{color:var(--tMerah);border-color:rgba(220,76,76,.55)}.ktlNaAksi{margin-top:10px}.ktlNaAksi button{width:100%;min-height:48px;margin:0}'
      + '.ktlNaDr{margin-top:12px;font-size:13px;line-height:1.45;padding:10px 12px;border-radius:12px;background:var(--panel2);color:var(--teks)}.ktlNaDr small{color:var(--redup)}'
      + '.ktlKartu .kl.na{background:rgba(220,76,76,.92)}.ktlKartu.na .fo img{filter:grayscale(1);opacity:.75}.ktlLmb button[disabled]{opacity:.5}';
    document.head.appendChild(st);
  }
  function chipNa() {
    if (!D) return ''; gayaNa();
    var n = D.unit.filter(function (u) { return u.st === 'NONAKTIF'; }).length; if (!n && !D.bolehNonaktif) return '';
    return '<button type="button" class="ktlChip' + (F.na ? ' on' : '') + '" data-l="naFilter">' + (F.na ? '✓ ' : '') + '⛔ Nonaktif · ' + n + '</button>';
  }
  function naHtml() {
    if (!U || !U.unit || U.unit.st !== 'NONAKTIF') return ''; gayaNa();
    var a = U.na || {}, dr = a.driver || [];
    return '<div class="ktlNa"><b>⛔ Unit nonaktif</b><span>' + esc(a.alasan || 'Nonaktif') + (a.catatan ? ' · ' + esc(a.catatan) : '') + '</span>'
      + '<small>sejak ' + esc(tglID(a.tgl || '')) + (a.oleh ? ' · oleh ' + esc(a.oleh) : '') + '</small>'
      + (dr.length ? '<small>Driver tetap yang dilepas: ' + esc(dr.join(', ')) + '</small>' : '')
      + '<small>Unit tidak muncul di daftar & pilihan unit mana pun. Riwayat lama tetap utuh.</small></div>';
  }
  function naAksiHtml() {
    if (!bolehNa()) return ''; gayaNa();
    return U.unit.st === 'NONAKTIF'
      ? '<div class="ktlNaAksi"><button type="button" class="tUtama" data-l="akBuka">✅ Aktifkan lagi</button></div>'
      : '<div class="ktlNaAksi"><button type="button" class="ktlBtn2 ktlBtnNa" data-l="naBuka">⛔ Nonaktifkan unit (dijual / tidak dipakai)</button></div>';
  }
  function naLembarHtml() {
    var u = U.unit, yk = !!lembar.yakin;
    var tombol = function (aksi, teks, teksYakin) { return '<div class="dua"><button type="button" class="ktlBtn2" data-l="tutupLembar">Batal</button><button type="button" class="ktlBtn2 ' + (yk ? 'ktlBtnMerah' : 'ktlBtnNa') + '" data-l="' + aksi + '"' + (kirim || (aksi === 'naKirim' && !lembar.alasan) ? ' disabled' : '') + '>' + (kirim ? 'Menyimpan…' : yk ? teksYakin : teks) + '</button></div>'; };
    if (lembar.jenis === 'na') {
      var dr = U.driver || [], al = lembar.alasan || '';
      return '<div class="ktlLmb" data-l="tutupLembar"><div class="in" data-l="x"><h3>Nonaktifkan ' + esc(u.l) + '?</h3>'
        + '<div class="kc">Unit hilang dari semua daftar & pilihan unit (P2H, Pos Kontrol, Ban, GASPOL, Input DO, GPS, briefing, laporan). Riwayat lama (ritase, tiket, laporan) tetap utuh. Bisa diaktifkan lagi kapan saja.</div>'
        + '<label>Alasan</label><div class="ktlChips" style="flex-wrap:wrap">' + [['DIJUAL', '💰 Dijual'], ['TIDAK DIPAKAI', '💤 Tidak dipakai'], ['LAINNYA', '✏️ Lainnya']].map(function (x) { return '<button type="button" class="ktlChip' + (al === x[0] ? ' on' : '') + '" data-l="naAlasan:' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>'
        + '<label for="ktlNaCat">Catatan' + (al === 'LAINNYA' ? ' (wajib)' : ' (boleh kosong)') + '</label><textarea id="ktlNaCat" class="isian" rows="2" maxlength="200" placeholder="mis. dijual ke …, tanggal serah terima">' + esc(lembar.catatan || '') + '</textarea>'
        + '<div class="ktlNaDr">' + (dr.length ? '👤 Driver tetap yang dilepas dari unit ini: <b>' + esc(dr.map(function (d) { return d.n; }).join(', ')) + '</b><br><small>Driver TIDAK dinonaktifkan, cuma lambung utamanya dikosongkan.</small>' : 'Unit ini tidak punya driver tetap.') + '</div>'
        + tombol('naKirim', 'Nonaktifkan', 'Ketuk lagi: Ya, nonaktifkan ' + esc(u.l)) + '</div></div>';
    }
    var dl = (U.na && U.na.driver) || [];
    return '<div class="ktlLmb" data-l="tutupLembar"><div class="in" data-l="x"><h3>Aktifkan lagi ' + esc(u.l) + '?</h3><div class="kc">Unit muncul lagi di semua daftar & pilihan unit.</div>'
      + (dl.length ? '<label class="cent"><input type="checkbox" id="ktlAkDr"' + (lembar.drv !== false ? ' checked' : '') + '> Kembalikan driver tetap: ' + esc(dl.join(', ')) + '</label><div class="kc" style="margin-top:6px">Hanya kalau driver itu belum pegang unit lain.</div>' : '')
      + tombol('akKirim', 'Aktifkan lagi', 'Ketuk lagi: Ya, aktifkan ' + esc(u.l)) + '</div></div>';
  }
  function naSimpanKetik() { if (!lembar || !lapisEl) return; var t = lapisEl.querySelector('#ktlNaCat'), c = lapisEl.querySelector('#ktlAkDr'); if (t) lembar.catatan = t.value; if (c) lembar.drv = c.checked; }
  function naKirim(jenis) {
    naSimpanKetik(); if (!lembar || kirim || !U || !bolehNa()) return;
    if (jenis === 'na') {
      if (!lembar.alasan) { roti('Pilih alasan dulu.'); return; }
      if (lembar.alasan === 'LAINNYA' && !String(lembar.catatan || '').trim()) { roti('Alasan Lainnya: tulis catatannya dulu.'); return; }
    }
    if (!lembar.yakin) { var lb0 = lembar; lb0.yakin = true; lapis(); setTimeout(function () { if (lembar === lb0 && lb0.yakin && !kirim) { naSimpanKetik(); lb0.yakin = false; if (lapisEl) lapis(); } }, 5000); return; } /* pola ketuk 2x (tanpa confirm) */
    kirim = true; lapis(); var l = U.unit.l; if (!lembar.cid) lembar.cid = cid();
    var fn = jenis === 'na' ? 'pusatUnaNonaktif' : 'pusatUnaAktifkan';
    var arg = jenis === 'na' ? { lambung: l, alasan: lembar.alasan, catatan: String(lembar.catatan || '').trim().slice(0, 200), cid: lembar.cid } : { lambung: l, kembalikanDriver: lembar.drv !== false, cid: lembar.cid };
    panggil(fn, [arg], 60000).then(function (h) {
      kirim = false;
      if (!h || !h.ok) { if (lembar) lembar.yakin = false; roti((h && h.pesan) || 'Belum berhasil.'); lapis(); return; }
      lembar = null; roti(h.pesan || 'Tersimpan.'); getar(); D = null; muatUnit(l); muat(false);
    }).catch(function (e) { kirim = false; if (lembar) lembar.yakin = false; roti(((e && e.message) || 'Sinyal putus') + '. Ketuk lagi (tidak akan dobel).'); lapis(); });
  }

  /* ---------- klik ---------- */
  function klik(ev) {
    var b = ev.target.closest('[data-l]'); if (!b || !lapisEl || !lapisEl.contains(b)) return;
    var n = b.getAttribute('data-l');
    if (n === 'x') return;
    if (n === 'kembali') { kembali(); return; }
    if (n === 'segar') { if (layar === 'detail' && U) muatUnit(U.unit.l); else if (!memuat) muat(true); return; }
    if (n.indexOf('armada:') === 0) { F.armada = n.slice(7); lapis(); getar(); return; }
    if (n.indexOf('merk:') === 0) { F.merk = n.slice(5); if (!F.merk) F.dok = ''; lapis(); return; }
    if (n.indexOf('dok:') === 0) { F.dok = n.slice(4); lapis(); return; }
    if (n === 'keluar') { F.keluar = !F.keluar; if (F.keluar) F.na = false; lapis(); return; }
    if (n.indexOf('unit:') === 0) { bukaUnit(n.slice(5)); return; }
    if (n.indexOf('lihat:') === 0) { bukaLihat(n.slice(6)); return; }
    if (n === 'tutupLihat') { lihat = null; hapusSiap = ''; lapis(); return; }
    if (n.indexOf('sampul:') === 0) { jadikanSampul(n.slice(7)); return; }
    if (n.indexOf('hapus:') === 0) { hapusFoto(n.slice(6)); return; }
    if (n === 'riwayat') { RW.buka = !RW.buka; lapis(); return; }
    if (n === 'riwayatSemua') { riwayatSemua(); return; }
    if (n.indexOf('kembali:') === 0) { kembalikan(n.slice(8)); return; }
    if (n === 'isi') { if (U && U.bolehUbah) { lembar = { jenis: 'isi' }; lapis(); } return; }
    if (n.indexOf('unggah:') === 0) { if (U && U.bolehUbah) { lembar = { jenis: 'foto', pilih: n.slice(7) }; lapis(); } return; }
    if (n.indexOf('jenis:') === 0) { simpanKet(); lembar.pilih = n.slice(6); if (lembar.mime === 'application/pdf' && JENIS_DOK.indexOf(lembar.pilih) < 0) { lembar.b64 = ''; lembar.pratinjau = ''; } lapis(); return; }
    if (n === 'tutupLembar') { if (b.classList.contains('ktlLmb') && ev.target !== b) return; if (!kirim) { lembar = null; lapis(); } return; }
    if (n === 'kirimFoto') { kirimFoto(); return; }
    if (n === 'excel') { excel(); return; }
    if (n === 'pdf') { pdf(); return; }
    if (n === 'pdf4') { pdf('4sisi'); return; }
    if (n === 'pdfUnit') { pdf('unit'); return; }
    if (n === 'simpan') { simpanIsian(); return; }
    if (n === 'naFilter') { F.na = !F.na; if (F.na) F.keluar = false; lapis(); getar(); return; } /* unit-nonaktif-23nov */
    if (n === 'naBuka') { if (bolehNa()) { lembar = { jenis: 'na', alasan: '' }; lapis(); } return; }
    if (n === 'akBuka') { if (bolehNa()) { lembar = { jenis: 'ak', drv: true }; lapis(); } return; }
    if (n.indexOf('naAlasan:') === 0) { if (lembar) { naSimpanKetik(); lembar.alasan = n.slice(9); lembar.yakin = false; lapis(); } return; }
    if (n === 'naKirim') { naKirim('na'); return; }
    if (n === 'akKirim') { naKirim('ak'); return; }
  }
  /* tombol Back HP: penampil -> lembar -> detail -> daftar -> tutup */
  function kembali() {
    if (!lapisEl) return false;
    if (lihat) { lihat = null; hapusSiap = ''; lapis(); return true; }
    if (lembar) { if (!kirim) { lembar = null; lapis(); } return true; }
    if (layar === 'detail') { layar = 'daftar'; U = null; lapis(); if (!D) muat(false); return true; }
    tutup(); return true;
  }
  function buka(ctx) {
    CTX = ctx || CTX;
    if (!boleh()) { roti('Katalog unit khusus pimpinan, admin, dan pengawas.'); return; }
    layar = 'daftar'; lembar = null; lihat = null; lapis();
    if (!D) muat(false);
  }
  function lupakan() { D = null; U = null; FOTO = {}; galat = ''; F = { cari: '', armada: 'SEMUA', merk: '', dok: '', keluar: false }; if (lapisEl) tutup(); }
  window.WHL_KATALOG = { boleh: boleh, buka: buka, kembali: kembali, lupakan: lupakan, _uji: { setData: function (d) { D = d; }, bukaUnit: bukaUnit, F: F } };
})();
