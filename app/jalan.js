/* WHL App — KONDISI JALAN (tahap 4 rancangan Upgrade\app-beranda-poin-16nov §1 no 8, §3; app-tahap36-17nov tim B, Andro 17 Nov 2026).
 * INFORMASI SAJA (keputusan Reza): TIDAK ADA tombol lapor di layar ini. Data otomatis dari server DASHBOARD pusatInfoJalan(token) (PusatHazard.gs, Armand, cache 5 mnt):
 *   ruas[] {ruas, status lancar|melambat|padat|'tidak ada data', label, kecepatan, normal, trip, jam, sumber, catatan[{sumber, jam, tgl, teks, kategori}], waspada}
 *   umum[] (catatan tanpa ruas), hazard[] (hazard VALID 24 jam {id, jenis, teks, jam, tgl, lat, lng, adaFoto, asal}), port {unitDiPort, jam, sumber}, sumberGagal{}.
 * Warna tampilan: Lancar (hijau) / Licin atau Melambat (kuning) / Rusak atau Padat (merah) / Antre (ungu), label sumber + jam: 🛰 GPS / 🚧 Pos Kontrol / 💬 WA / 🦺 Pengawas / ⚠ Hazard valid.
 * Foto terbaru (hazard valid ≤ 3 jam) lewat WHL_HAZARD.berkas (pusatHazardBerkas). Menu tampil hanya kalau pusatPing memuat pusatInfoJalan.
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA, Simpan = API.Simpan;
  var IKJ = { 'Jalan licin': '💧', 'Jalan berlubang': '🕳️', 'Longsor / tebing': '⛰️', 'Genangan / banjir': '🌊', 'Debu tebal': '🌫️', 'Rambu rusak / hilang': '🚧', 'Unit mogok di jalan': '🚛', 'Material tumpah': '🪨', 'Penerangan kurang': '🔦', 'Lainnya': '⚠️' };
  var PORT_ANTRE = 4; /* >= 4 unit di area port = tampil "Antre" (ungu) */
  (function () { var K = window.WHL_KONFIG; if (K && K.RILIS_FITUR && !K.RILIS_FITUR.jalan) K.RILIS_FITUR.jalan = '2026-11-18'; })(); /* label Baru 7 hari; tanggal di konfig.js menang */

  var CTX = null, AKUN = '', D = null, tDim = 0, jalan = false, lapisEl = null, rinci = {}, galat = '';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { return CTX && CTX.sesi(); }
  function punya(fn) { return API.Pusat.asli() && API.Pusat.punya(fn); }
  function boleh(S) { return !!(S || sesi()) && punya('pusatInfoJalan') && !(MATI && Date.now() - MATI < 6 * 3600000); }
  /* kontrak: {ok:true, aktif:false} = dimatikan admin -> menu DISEMBUNYIKAN (diingat 6 jam per akun); aturFitur(true/false) dari pusatKegiatanBeranda.fitur.jalan */
  var MATI = 0;
  function aturFitur(nyala) { var m = nyala === false ? Date.now() : 0; if (!!m === !!(MATI && Date.now() - MATI < 6 * 3600000)) return; MATI = m; if (AKUN) Simpan.taruh('whlJalanMati_' + AKUN, m ? String(m) : null); if (m) tutup(); if (CTX && CTX.perbarui) CTX.perbarui(); }
  function akunDari(S) { return String((S && (S.idProfil || S.idKetik)) || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function pasang(ctx) {
    CTX = ctx || CTX; var a = akunDari(sesi()); if (a === AKUN) return; AKUN = a; D = null; tDim = 0; rinci = {}; MATI = 0;
    if (a) Simpan.ambil('whlJalanMati_' + a).then(function (v) { if (AKUN === a && Number(v) && Date.now() - Number(v) < 6 * 3600000) { MATI = Number(v); if (CTX && CTX.perbarui) CTX.perbarui(); } });
  }
  function jamT(j) { return String(j || '').replace(':', '.'); }

  function gaya() {
    if (window.WHL_HAZARD && window.WHL_HAZARD.gaya) window.WHL_HAZARD.gaya(); /* kelas .jlTag & .hzLihat bersama */
    if (document.getElementById('jlGaya')) return; var st = document.createElement('style'); st.id = 'jlGaya';
    st.textContent = '.jlLapis .ksnIsi{padding-bottom:44px}.jlStrip .hiStrip{grid-template-columns:repeat(4,1fr)}.hs.ungu{background:rgba(122,92,240,.14)}.hs.ungu b{color:#6d4fe0}.hs.hijau{background:rgba(22,163,74,.13)}.hs.hijau b{color:#15803d}'
      + 'html[data-tema="gelap"] .hs.ungu b{color:#b9a8ff}html[data-tema="gelap"] .hs.hijau b{color:#5fe39a}'
      + '.jlJudul{display:flex;justify-content:space-between;align-items:baseline;margin:0 2px 4px}.jlJudul b{font-size:15px}.jlJudul span{font-size:11.5px;color:var(--redup);font-weight:700}'
      + '.jlRuas{display:flex;gap:10px;padding:11px 0;width:100%;text-align:left;background:none;color:var(--teks)}.jlRuas+.jlRuas{border-top:1px solid var(--garis)}'
      + '.jlRuas .bar{width:5px;border-radius:99px;background:#16a34a;flex:0 0 auto}.jlRuas.kn .bar{background:#f0a020}.jlRuas.mr .bar{background:#e5484d}.jlRuas.un .bar{background:#7a5cf0}.jlRuas.ab .bar{background:var(--garis)}'
      + '.jlRuas .tx{flex:1;min-width:0}.jlRuas .tx b{display:block;font-size:14px}.jlRuas .tx small{display:block;font-size:12px;color:var(--redup);line-height:1.4}'
      + '.jlChip{align-self:flex-start;flex:0 0 auto;font-style:normal;font-size:12px;font-weight:800;padding:4px 10px;border-radius:99px;background:rgba(22,163,74,.14);color:#15803d}.jlChip.kn{background:rgba(255,197,48,.22);color:var(--tKuning)}.jlChip.mr{background:rgba(242,72,77,.13);color:var(--tMerah)}.jlChip.un{background:rgba(122,92,240,.15);color:#6d4fe0}.jlChip.ab{background:var(--panel2);color:var(--redup)}'
      + 'html[data-tema="gelap"] .jlChip{color:#5fe39a}html[data-tema="gelap"] .jlChip.kn{color:var(--tKuning)}html[data-tema="gelap"] .jlChip.mr{color:var(--tMerah)}html[data-tema="gelap"] .jlChip.un{color:#b9a8ff}html[data-tema="gelap"] .jlChip.ab{color:var(--redup)}'
      + '.jlCat{margin-top:6px;border-left:3px solid var(--garis);padding:1px 0 1px 8px}.jlCat p{margin:3px 0 0;font-size:12.5px;line-height:1.4;color:var(--teks)}.jlLagi{font-size:12px;font-weight:800;color:var(--utama);margin-top:4px;display:inline-block}'
      + '.jlFoto{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.jlFoto::-webkit-scrollbar{display:none}.jlFoto button{flex:0 0 124px;height:94px;border-radius:12px;overflow:hidden;position:relative;background:var(--panel2);padding:0;color:var(--redup);font-size:11px}'
      + '.jlFoto img{width:100%;height:100%;object-fit:cover;display:block}.jlFoto span{position:absolute;left:0;right:0;bottom:0;padding:14px 7px 5px;font-size:10.5px;font-weight:800;color:#fff;text-align:left;background:linear-gradient(transparent,rgba(0,0,0,.65))}'
      + '.jlHz{display:flex;gap:10px;padding:10px 0;align-items:flex-start}.jlHz+.jlHz{border-top:1px solid var(--garis)}.jlHz .ik{width:36px;height:36px;border-radius:11px;background:rgba(255,197,48,.2);display:grid;place-items:center;font-size:19px;flex:none}.jlHz .tx{flex:1;min-width:0}.jlHz .tx b{display:block;font-size:13.5px}.jlHz .tx small{display:block;font-size:12px;color:var(--redup)}'
      + '.jlPeta{font-size:12px;font-weight:800;color:var(--utama);background:none;padding:4px 0;flex:none}.jlKaki{text-align:center;margin:14px 8px 0;line-height:1.5}.jlSegar{width:100%;margin-top:12px;min-height:42px}.jlGagal{margin:10px 2px 0;border-radius:12px;padding:8px 11px;background:rgba(255,197,48,.18);color:var(--tKuning);font-size:12.5px;font-weight:700}';
    document.head.appendChild(st);
  }

  /* ---------- nilai tampilan ---------- */
  function nilaiRuas(r) {
    var t = (r.catatan || []).map(function (c) { return c.teks || ''; }).join(' ').toLowerCase();
    if (/lubang|berlubang|rusak|longsor|amblas|ambles|patah|putus|tebing/.test(t)) return ['mr', 'Rusak'];
    if (r.status === 'padat') return ['mr', 'Padat'];
    if (/licin|hujan|becek|lumpur|genang|banjir/.test(t)) return ['kn', 'Licin'];
    if (r.status === 'melambat') return ['kn', 'Melambat'];
    if (/antre|antri|antrian|macet/.test(t)) return ['un', 'Antre'];
    if (r.waspada) return ['kn', 'Waspada'];
    if (r.status === 'lancar') return ['hj', 'Lancar'];
    return (r.catatan || []).length ? ['kn', 'Ada catatan'] : ['ab', 'Belum ada data'];
  }
  function tag(sumber, jam) {
    var s = String(sumber || ''), j = jam ? ' ' + esc(jamT(jam)) : '';
    if (/gps|geofence/i.test(s)) return '<span class="jlTag tg">🛰 ' + esc(s) + j + '</span>';
    if (/pos/i.test(s)) return '<span class="jlTag tp">🚧 Pos Kontrol' + j + '</span>';
    if (/^wa/i.test(s)) return '<span class="jlTag tw">💬 WA grup' + j + '</span>';
    if (/pengawas/i.test(s)) return '<span class="jlTag tt">🦺 Pengawas' + j + '</span>';
    if (/hazard/i.test(s)) return '<span class="jlTag td">⚠ Hazard valid' + j + '</span>';
    return '<span class="jlTag">' + esc(s) + j + '</span>';
  }
  function hitung(d) {
    var n = { hj: 0, kn: 0, mr: 0 }; (d.ruas || []).forEach(function (r) { var v = nilaiRuas(r)[0]; if (n[v] != null) n[v]++; });
    return n;
  }

  /* ---------- muat ---------- */
  function muat(paksa) {
    if (jalan) return; if (D && !paksa && Date.now() - tDim < 60000) { gambar(); return; }
    jalan = true; galat = '';
    var awal = D ? Promise.resolve() : Simpan.ambil('whlJalan_' + AKUN).then(function (v) { try { var c = JSON.parse(v || 'null'); if (c && !D) { D = c; gambar(); } } catch (e) { /* */ } });
    awal.then(function () { return API.Pusat.panggil('pusatInfoJalan', [sesi().tokenPusat], 30000); }).then(function (h) {
      jalan = false;
      if (h && h.login === false) { tutup(); if (CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (h && h.aktif === false) { D = null; Simpan.taruh('whlJalan_' + AKUN, null); roti(h.pesan || 'Kondisi jalan sedang ditutup.'); aturFitur(false); return; }
      if (h && h.ok !== false) { D = h; tDim = Date.now(); Simpan.taruh('whlJalan_' + AKUN, JSON.stringify(h)); }
      else galat = (h && h.pesan) || 'Kondisi jalan belum bisa dimuat.';
      gambar();
    }, function (e) { jalan = false; galat = e.message || 'Koneksi bermasalah.'; gambar(); });
  }

  /* ---------- tampil ---------- */
  function lapis(sub, isi) {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis jlLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik);
    }
    var g = lapisEl.querySelector('.ksnIsi'), y = g ? g.scrollTop : 0;
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-j="tutup" aria-label="Kembali">‹</button><div class="nm">' + esc(sub) + '<b>Kondisi jalan</b></div></div><div class="ksnIsi">' + isi + '</div>';
    var g2 = lapisEl.querySelector('.ksnIsi'); if (g2) g2.scrollTop = y;
    isiFoto();
  }
  function gambar() {
    if (!lapisEl) return;
    var d = D;
    if (!d) { lapis('memuat…', galat ? gagalHtml(galat) : (R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>')); return; }
    var n = hitung(d), P = d.port, h = '';
    h += '<div class="kartu hiKartu jlStrip" role="group" aria-label="Ringkasan kondisi jalan"><div class="hiStrip">'
      + '<div class="hs hijau"><small>Lancar</small><b>' + n.hj + '<em>ruas</em></b></div><div class="hs kuning"><small>Licin / lambat</small><b>' + n.kn + '</b></div>'
      + '<div class="hs merah"><small>Rusak / padat</small><b>' + n.mr + '</b></div><div class="hs ungu"><small>Di port</small><b>' + (P && P.unitDiPort != null ? P.unitDiPort + '<em>unit</em>' : '–') + '</b></div></div></div>';
    /* ruas */
    h += '<h2 class="bagW">Ruas jalan hauling</h2><div class="kartu" style="padding-top:4px;padding-bottom:4px">';
    (d.ruas || []).forEach(function (r, i) {
      var v = nilaiRuas(r), C = r.catatan || [], buka = !!rinci['r' + i], tampil = buka ? C : C.slice(0, 2);
      var ket = r.kecepatan != null ? 'rata-rata ' + r.kecepatan + ' km/jam' + (r.normal ? ' (normal ' + r.normal + ')' : '') + (r.trip ? ' · ' + r.trip + ' trip' : '') : (r.label || 'Belum ada data GPS 3 jam terakhir');
      h += '<div class="jlRuas ' + v[0] + '"><span class="bar"></span><div class="tx"><b>' + esc(r.ruas) + '</b><small>' + esc(ket) + '</small>'
        + (r.kecepatan != null || r.jam ? tag(r.sumber || 'GPS otomatis', r.jam) : '')
        + tampil.map(function (c) { return '<div class="jlCat">' + tag(c.sumber, c.jam) + '<p>' + esc(c.teks) + '</p></div>'; }).join('')
        + (C.length > 2 ? '<button type="button" class="jlLagi" data-j="rinci:r' + i + '">' + (buka ? 'Ringkas' : '+' + (C.length - 2) + ' catatan lagi') + '</button>' : '')
        + '</div><em class="jlChip ' + v[0] + '">' + v[1] + '</em></div>';
    });
    if (P && P.unitDiPort != null) {
      var antre = P.unitDiPort >= PORT_ANTRE;
      h += '<div class="jlRuas ' + (antre ? 'un' : '') + '"><span class="bar"></span><div class="tx"><b>Port (bongkar)</b><small>' + P.unitDiPort + ' unit di area port sekarang</small>' + tag(P.sumber || 'GPS otomatis', P.jam) + '</div><em class="jlChip ' + (antre ? 'un' : '') + '">' + (antre ? 'Antre' : 'Lancar') + '</em></div>';
    }
    if (!(d.ruas || []).length && !(P && P.unitDiPort != null)) h += '<div class="kecil" style="padding:10px 2px">Belum ada data ruas.</div>';
    h += '</div>';
    /* foto terbaru */
    var FT = (d.hazard || []).filter(function (x) { return x.adaFoto; }).slice(0, 8);
    if (FT.length && window.WHL_HAZARD) h += '<h2 class="bagW">Foto terbaru <span class="kecil">3 jam terakhir</span></h2><div class="jlFoto">' + FT.map(function (x) {
      return '<button type="button" data-j="foto" data-jlfoto="' + esc(x.id) + '" aria-label="Foto ' + esc(x.jenis) + '">Memuat…<span>' + esc(x.jenis) + ' · ' + esc(jamT(x.jam)) + '</span></button>';
    }).join('') + '</div>';
    /* hazard valid */
    var HZ = d.hazard || [];
    if (HZ.length) h += '<h2 class="bagW">Hazard valid <span class="kecil">24 jam</span></h2><div class="kartu" style="padding-top:4px;padding-bottom:4px">' + HZ.slice(0, rinci.hz ? 40 : 6).map(function (x) {
      return '<div class="jlHz"><span class="ik">' + (IKJ[x.jenis] || '⚠️') + '</span><div class="tx"><b>' + esc(x.jenis) + '</b><small>' + esc(x.teks && x.teks !== x.jenis ? x.teks : '') + '</small>' + tag('Hazard valid', x.jam) + (x.asal === 'WA' ? tag('WA') : '') + '</div>'
        + (x.lat != null && x.lng != null ? '<button type="button" class="jlPeta" data-j="peta:' + x.lat + ',' + x.lng + '">📍 Peta</button>' : '') + '</div>';
    }).join('') + (HZ.length > 6 ? '<button type="button" class="jlLagi" data-j="rinci:hz" style="margin:4px 0 8px">' + (rinci.hz ? 'Ringkas' : 'Lihat semua (' + HZ.length + ')') + '</button>' : '') + '</div>';
    /* catatan lain */
    var U = d.umum || [];
    if (U.length) h += '<h2 class="bagW">Catatan lain <span class="kecil">WA & Pos Kontrol</span></h2><div class="kartu" style="padding-top:4px;padding-bottom:4px">' + U.slice(0, rinci.um ? 20 : 5).map(function (c) {
      return '<div class="jlHz"><span class="ik" style="background:var(--panel2)">' + (/pos/i.test(c.sumber) ? '🚧' : '💬') + '</span><div class="tx"><b>' + esc(c.kategori || c.sumber || 'Catatan') + (c.grup ? ' · ' + esc(c.grup) : '') + '</b><small style="color:var(--teks)">' + esc(c.teks) + '</small>' + tag(c.sumber, c.jam) + '</div></div>';
    }).join('') + (U.length > 5 ? '<button type="button" class="jlLagi" data-j="rinci:um" style="margin:4px 0 8px">' + (rinci.um ? 'Ringkas' : 'Lihat semua (' + U.length + ')') + '</button>' : '') + '</div>';
    var SG = d.sumberGagal || {}, gg = Object.keys(SG).filter(function (k) { return SG[k]; });
    if (gg.length) h += '<div class="jlGagal">Sebagian sumber belum terbaca: ' + gg.map(function (k) { return { gps: 'GPS', wa: 'grup WA', pos: 'Pos Kontrol', hazard: 'hazard' }[k] || k; }).join(', ') + '. Data lain tetap tampil.</div>';
    if (galat) h += '<div class="jlGagal">Belum bisa memperbarui: ' + esc(galat) + ' (tampil data terakhir).</div>';
    h += '<div class="kecil jlKaki">Informasi otomatis dari GPS unit, Pos Kontrol, grup WA & laporan hazard yang sudah divalidasi. Kecepatan ruas dari trip 3 jam terakhir dibanding normal 7 hari.</div>'
      + '<button type="button" class="tKecil jlSegar" data-j="segar"' + (jalan ? ' disabled' : '') + '>' + (jalan ? 'Memperbarui…' : '↻ Segarkan') + '</button>';
    lapis('update otomatis ' + esc(jamT(d.jam || '')) + ' · informasi saja', h);
  }
  function gagalHtml(p) { return '<div class="kartu kosongKm">' + (window.WHL_IKON ? window.WHL_IKON('alarm', 'besar') : '') + '<b>Belum bisa dimuat</b><small>' + esc(p) + '</small><button type="button" class="tKecil" data-j="segar" style="margin-top:10px">Coba lagi</button></div>'; }
  function isiFoto() {
    if (!lapisEl || !window.WHL_HAZARD) return;
    Array.prototype.forEach.call(lapisEl.querySelectorAll('[data-jlfoto]:not([data-isi])'), function (el) {
      el.setAttribute('data-isi', '1'); var lb = el.querySelector('span');
      window.WHL_HAZARD.berkas(el.getAttribute('data-jlfoto'), 'foto').then(function (u) { if (!document.body.contains(el)) return; el.innerHTML = '<img src="' + u + '" alt="">'; if (lb) el.appendChild(lb); }, function () { if (document.body.contains(el)) el.firstChild.nodeValue = 'Foto tidak ada'; });
    });
  }
  function lihat(src) { if (!lapisEl || !src) return; tutupLihat(); var d = document.createElement('div'); d.className = 'hzLihat'; d.setAttribute('data-j', 'tutupLihat'); d.innerHTML = '<img src="' + src + '" alt="Foto besar"><span>✕ Tutup</span>'; lapisEl.appendChild(d); }
  function tutupLihat() { var d = lapisEl && lapisEl.querySelector('.hzLihat'); if (d) { d.remove(); return true; } return false; }
  function klik(ev) {
    var b = ev.target.closest('[data-j]'); if (!b || !lapisEl || !lapisEl.contains(b)) return; var n = b.getAttribute('data-j');
    if (n === 'tutup') { if (tutupLihat()) return; R.bunyi('tutup'); tutup(); }
    else if (n === 'tutupLihat') tutupLihat();
    else if (n === 'segar') { R.getar(); muat(true); gambar(); }
    else if (n.indexOf('rinci:') === 0) { var k = n.slice(6); rinci[k] = !rinci[k]; gambar(); }
    else if (n === 'foto') { var im = b.querySelector('img'); if (im) lihat(im.getAttribute('src')); }
    else if (n.indexOf('peta:') === 0 && CTX && CTX.bukaWeb) CTX.bukaWeb('https:' + '/' + '/www.google.com/maps?q=' + encodeURIComponent(n.slice(5)));
  }
  function buka(ctx) {
    pasang(ctx); gaya(); rinci = {};
    if (!lapisEl) lapis('memuat…', R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>');
    gambar(); muat(false);
  }
  function tutup() { if (!lapisEl) return false; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); return true; }
  function lupakan() { tutup(); D = null; AKUN = ''; tDim = 0; MATI = 0; }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }

  /* klik menu Beranda / Lainnya [data-ke="jalan"] — tanpa cabang klik baru di app.js. Tim A (slide cuaca) boleh memanggil WHL_JALAN.buka(ctx) langsung. */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ke="jalan"]'); if (!b || !CTX || !sesi()) return; R.getar(); buka(CTX);
  });

  window.WHL_JALAN = { boleh: boleh, aturFitur: aturFitur, pasang: pasang, buka: buka, tutup: tutup, lupakan: lupakan };
})();
