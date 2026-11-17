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
      + '.jlRingkas{display:flex;gap:12px;align-items:center;padding:14px 16px;margin-bottom:12px}.jlRingkas .ik{font-size:28px;line-height:1;flex:none}.jlRingkas b{display:block;font-size:15.5px;line-height:1.35}.jlRingkas small{display:block;color:var(--redup);font-size:12px;margin-top:3px}.jlRingkas.hj{background:rgba(22,163,74,.10)}.jlRingkas.kn,.jlRingkas.mr{background:rgba(255,197,48,.16)}.jlRingkas.un{background:rgba(122,92,240,.12)}'
      + '.jlTmp{display:flex;gap:10px;padding:11px 0;width:100%;text-align:left;background:none;color:var(--teks);font:inherit}.jlTmp+.jlTmp{border-top:1px solid var(--garis)}.jlTmp .bar{width:5px;border-radius:99px;background:#16a34a;flex:0 0 auto}.jlTmp.kn .bar{background:#f0a020}.jlTmp.mr .bar{background:#e5484d}.jlTmp.un .bar{background:#7a5cf0}'
      + '.jlTmp .tx{flex:1;min-width:0}.jlTmp .a1{display:flex;justify-content:space-between;align-items:center;gap:8px}.jlTmp .a1 b{font-size:15px}.jlTmp .a2{font-size:12.5px;color:var(--redup);margin-top:3px;display:flex;flex-wrap:wrap;gap:2px 6px}.jlTmp .a2 .jm{margin-left:auto;font-weight:800}.jlTmp .a3{font-size:12.5px;margin-top:4px;color:var(--teks);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.jlRs{font-size:12.5px;margin-top:6px;line-height:1.4}.jlSb{font-size:11px;font-weight:800;color:var(--redup);white-space:nowrap}.jlKosong{width:100%;min-height:42px;border-radius:14px;background:var(--panel2);color:var(--redup);font:inherit;font-size:13px;font-weight:700;padding:8px 12px;text-align:left;margin-bottom:12px}'
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
  /* ---------- v3.31 (Reza 17 Nov): tampil PER TEMPAT (BSR, KM 107, PORT, POOL, MIP sesuai jalur), ringkasan 1 kalimat di atas ----------
   * Ruas "A - B" dipetakan ke tempat A (unit keluar) dan B (unit masuk). Port = d.port. Field server opsional d.tempat[] {tempat, unit, jam}
   * (unit di geofence per tempat) dipakai kalau ada. Jarak ruas: r.jarak / r.km dari server, cadangan tab JARAK RUTE yang diketahui. */
  var TEMPAT = [['BSR', 'BSR'], ['107', 'KM 107'], ['PORT', 'PORT'], ['POOL', 'POOL'], ['MIP', 'MIP'], ['BA', 'BA']];
  var JARAK0 = { 'BSR-107': 34, '107-PORT': 107, 'MIP-107': 30, 'MIP-PORT': 137, 'BA-PORT': 118 };
  function kunciT(s) { s = String(s || '').toUpperCase(); if (/BSR/.test(s)) return 'BSR'; if (/107/.test(s)) return '107'; if (/PORT|PELABUHAN|BONGKAR/.test(s)) return 'PORT'; if (/POOL/.test(s)) return 'POOL'; if (/MIP/.test(s)) return 'MIP'; if (/\bBA\b/.test(s)) return 'BA'; return ''; }
  function ujung(r) { var p = String(r.ruas || '').split(/\s*[-–>]+\s*/); return [kunciT(p[0]), kunciT(p[p.length - 1])]; }
  function jarakRuas(r) { var x = Number(r.jarak != null ? r.jarak : r.jarakKm != null ? r.jarakKm : r.km); if (x > 0) return x; var u = ujung(r); return JARAK0[u[0] + '-' + u[1]] || JARAK0[u[1] + '-' + u[0]] || 0; }
  function tempuh(km, v) { if (!(km > 0) || !(v > 0)) return ''; var m = Math.round(km / v * 60), j = Math.floor(m / 60); return '± ' + (j ? j + ' jam ' : '') + (m % 60 ? (m % 60) + ' mnt' : (j ? '' : '1 mnt')); }
  function jamDari(j) { var m = String(j || '').match(/(\d{1,2})[:.](\d{2})/); return m ? ('0' + m[1]).slice(-2) + '.' + m[2] : ''; }
  var NAMA_ST = { hj: 'Lancar', kn: 'Licin', mr: 'Rusak', un: 'Padat', ab: 'Belum ada data' }, BOBOT = { mr: 4, kn: 3, un: 2, hj: 1, ab: 0 };
  function ikonSumber(s) { s = String(s || ''); return /gps|geofence/i.test(s) ? '🛰' : /pos/i.test(s) ? '🚧' : /^wa/i.test(s) ? '💬' : /pengawas/i.test(s) ? '🦺' : /hazard/i.test(s) ? '⚠' : '•'; }
  function tagK(s, jam) { var j = jamDari(jam); return '<span class="jlSb" title="' + esc(s || '') + '">' + ikonSumber(s) + (j ? ' ' + j : '') + '</span>'; }
  function susunTempat(d) {
    var T = {}; TEMPAT.forEach(function (t) { T[t[0]] = { k: t[0], nama: t[1], ruas: [], cat: [], unit: null, jam: '', st: 'ab', label: '' }; });
    function jamMaks(o, j) { var x = jamDari(j); if (x && x > o.jam) o.jam = x; }
    function tambahCat(o, c) { if (!c || !c.teks) return; if (o.cat.some(function (y) { return y.teks === c.teks; })) return; o.cat.push(c); jamMaks(o, c.jam); }
    (d.ruas || []).forEach(function (r) {
      var u = ujung(r), ada = r.kecepatan != null || (r.catatan || []).length;
      u.forEach(function (k, i) { var o = T[k]; if (!o || !ada) return; o.ruas.push({ r: r, arah: i === 0 ? 'keluar' : 'masuk', lawan: (T[u[1 - i]] || {}).nama || '' }); jamMaks(o, r.jam); (r.catatan || []).forEach(function (c) { tambahCat(o, c); }); });
    });
    (d.umum || []).concat((d.hazard || []).map(function (x) { return { sumber: 'Hazard valid', jam: x.jam, teks: x.jenis + (x.teks && x.teks !== x.jenis ? ': ' + x.teks : '') }; })).forEach(function (c) { var k = kunciT(c.teks); if (k && T[k]) tambahCat(T[k], c); });
    var P = d.port; if (P && P.unitDiPort != null) { T.PORT.unit = Number(P.unitDiPort); T.PORT.unitSumber = P.sumber || 'GPS otomatis'; jamMaks(T.PORT, P.jam); }
    /* server katalog-lengkap-17nov (V525): tempat[] {nama, kode, unitDiArea, status kosong|normal|antre|antre panjang|tidak ada data, lamaRataMnt, kecepatanRata, catatan[], jam, sumber} */
    (Array.isArray(d.tempat) ? d.tempat : []).forEach(function (x) { var k = kunciT(x.kode || x.nama || x.tempat), o = T[k]; if (!o) return; o.srv = x; var un = x.unitDiArea != null ? x.unitDiArea : x.unit; if (un != null) { o.unit = Number(un); o.unitSumber = x.sumber || 'GPS'; } if (x.lamaRataMnt != null) o.lama = Number(x.lamaRataMnt); if (x.kecepatanRata != null) o.kecSrv = Number(x.kecepatanRata); (x.catatan || []).forEach(function (c) { tambahCat(o, c); }); jamMaks(o, x.jam); });
    Object.keys(T).forEach(function (k) {
      var o = T[k], st = 'ab', lb = '';
      o.ruas.forEach(function (x) { var v = nilaiRuas(x.r); if (v[0] === 'un' && /antre/i.test(v[1])) v = ['un', 'Antre']; if (BOBOT[v[0]] > BOBOT[st]) { st = v[0]; lb = v[1]; } });
      var S = o.srv && String(o.srv.status || '').toLowerCase(); if (S === 'antre panjang') { st = 'mr'; lb = 'Antre panjang'; } else if (S === 'antre' && BOBOT.un > BOBOT[st]) { st = 'un'; lb = 'Antre'; } else if (S === 'normal' && BOBOT.hj > BOBOT[st]) { st = 'hj'; lb = 'Lancar'; } else if (S === 'kosong' && st === 'ab' && !o.cat.length) { lb = 'Kosong'; o.kosong = true; }
      var tc = o.cat.map(function (c) { return c.teks; }).join(' ').toLowerCase();
      if (/lubang|rusak|longsor|amblas|ambles|patah|putus/.test(tc) && BOBOT.mr > BOBOT[st]) { st = 'mr'; lb = 'Rusak'; }
      else if (/licin|becek|lumpur|genang|banjir/.test(tc) && BOBOT.kn > BOBOT[st]) { st = 'kn'; lb = 'Licin'; }
      if (!o.srv && o.unit != null && o.unit >= PORT_ANTRE && BOBOT.un > BOBOT[st]) { st = 'un'; lb = 'Antre'; }
      if (st === 'ab' && (o.unit != null || o.cat.length)) { st = /antre|antri|macet/.test(tc) ? 'un' : 'hj'; lb = st === 'un' ? 'Antre' : 'Lancar'; }
      var V = o.ruas.map(function (x) { return Number(x.r.kecepatan); }).filter(function (v) { return v > 0; });
      o.kec = o.kecSrv != null && o.kecSrv > 0 ? Math.round(o.kecSrv) : V.length ? Math.round(V.reduce(function (s, v) { return s + v; }, 0) / V.length) : null;
      o.st = st; o.label = lb || NAMA_ST[st]; o.ada = st !== 'ab';
    });
    return TEMPAT.map(function (t) { return T[t[0]]; });
  }
  function ringkasan(L, d) {
    var ada = L.filter(function (o) { return o.ada; }), buruk = ada.filter(function (o) { return o.st === 'mr' || o.st === 'kn'; }).sort(function (a, b) { return BOBOT[b.st] - BOBOT[a.st]; }), padat = ada.filter(function (o) { return o.st === 'un'; });
    var port = L.filter(function (o) { return o.k === 'PORT'; })[0], cu = '';
    try { var KG = window.WHL_KEGIATAN && window.WHL_KEGIATAN.data(); if (KG && KG.cuaca && KG.cuaca.ringkas) cu = KG.cuaca.ringkas; } catch (e) { /* */ }
    if (!ada.length) return { k: 'ab', ik: '🛣️', t: 'Belum ada unit lewat 3 jam terakhir', s: cu };
    if (buruk.length) {
      var b = buruk[0], c = b.cat.filter(function (x) { return /licin|lubang|rusak|longsor|genang|banjir|becek|lumpur/i.test(x.teks); })[0];
      return { k: buruk[0].st, ik: '⚠️', t: 'Hati-hati — ' + buruk.map(function (o) { return o.nama + ' ' + o.label.toLowerCase(); }).slice(0, 2).join(', ') + (padat.length ? ', ' + padat[0].nama + ' ' + padat[0].label.toLowerCase() : ''), s: (c ? (/^wa/i.test(c.sumber) ? 'WA' : c.sumber || '') + (jamDari(c.jam) ? ' ' + jamDari(c.jam) : '') : '') + (cu ? (c ? ' · ' : '') + cu : '') };
    }
    if (padat.length) return { k: 'un', ik: '⏳', t: 'Ramai — ' + padat.map(function (o) { return o.nama + ' ' + o.label.toLowerCase() + (o.unit != null ? ' (' + o.unit + ' unit)' : ''); }).join(', '), s: cu };
    return { k: 'hj', ik: '✅', t: 'Jalan aman — ' + ada.length + ' tempat lancar' + (port && port.unit != null ? ', port tidak antre' : ''), s: cu };
  }
  function lamaTeks(m) { m = Math.round(Number(m) || 0); return m >= 60 ? Math.floor(m / 60) + ' jam' + (m % 60 ? ' ' + (m % 60) + ' mnt' : '') : m + ' mnt'; }
  function kartuTempat(o, i) {
    var buka = !!rinci['t' + o.k], kec = o.kec != null ? o.kec + ' km/j' : '', C = o.cat;
    var h = '<button type="button" class="jlTmp ' + o.st + '" data-j="rinci:t' + o.k + '" aria-expanded="' + buka + '"><span class="bar"></span><div class="tx"><div class="a1"><b>' + esc(o.nama) + '</b><em class="jlChip ' + o.st + '">' + esc(o.label) + '</em></div>'
      + '<div class="a2">' + [o.unit != null ? '🚛 ' + o.unit + ' unit di area' : '', o.lama != null && o.unit ? '⏳ rata-rata ' + lamaTeks(o.lama) : '', kec ? '⏱ ' + kec : '', C.length ? '💬 ' + C.length + ' catatan' : ''].filter(Boolean).join(' · ') + (o.jam ? '<span class="jm">' + o.jam + '</span>' : '') + '</div>'
      + (C.length && !buka ? '<div class="a3">' + esc(C[0].teks) + '</div>' : '');
    if (buka) {
      h += o.ruas.map(function (x) {
        var r = x.r, km = jarakRuas(r), tp = tempuh(km, Number(r.kecepatan));
        return '<div class="jlRs">' + (x.arah === 'masuk' ? '⬇ masuk dari ' : '⬆ keluar ke ') + esc(x.lawan || r.ruas) + ' · ' + (r.kecepatan != null ? r.kecepatan + ' km/j' + (r.normal ? ' (normal ' + r.normal + ')' : '') : 'tanpa GPS') + (r.trip ? ' · ' + r.trip + ' trip' : '') + (tp ? ' · ' + tp + (km ? ' (' + km + ' km)' : '') : '') + ' ' + tagK(r.sumber || 'GPS otomatis', r.jam) + '</div>';
      }).join('')
        + (o.unit != null ? '<div class="jlRs">🚛 ' + o.unit + ' unit di area sekarang ' + tagK(o.unitSumber, o.jam) + '</div>' : '')
        + C.map(function (c) { return '<div class="jlCat"><p>' + esc(c.teks) + ' ' + tagK(c.sumber, c.jam) + '</p></div>'; }).join('');
    }
    return h + '</div></button>';
  }
  function gambar() {
    if (!lapisEl) return;
    var d = D;
    if (!d) { lapis('memuat…', galat ? gagalHtml(galat) : (R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>')); return; }
    var L = susunTempat(d), ada = L.filter(function (o) { return o.ada; }), kos = L.filter(function (o) { return !o.ada && o.k !== 'BA'; }), S = ringkasan(L, d), h = '';
    h += '<div class="kartu jlRingkas ' + S.k + '" role="status"><span class="ik">' + S.ik + '</span><div><b>' + esc(S.t) + '</b>' + (S.s ? '<small>' + esc(S.s) + '</small>' : '') + '</div></div>';
    if (ada.length) h += '<div class="kartu" style="padding-top:2px;padding-bottom:2px">' + ada.map(kartuTempat).join('') + '</div>';
    if (kos.length) h += '<button type="button" class="jlKosong" data-j="rinci:kos">' + (rinci.kos ? kos.map(function (o) { return esc(o.nama) + (o.kosong ? ' (0 unit)' : ''); }).join(' · ') + ' — belum ada unit lewat / catatan 3 jam terakhir' : kos.length + ' tempat belum ada data' + ' ›') + '</button>';
    /* foto terbaru */
    var FT = (d.hazard || []).filter(function (x) { return x.adaFoto; }).slice(0, 8);
    if (FT.length && window.WHL_HAZARD) h += '<h2 class="bagW">Foto terbaru <span class="kecil">3 jam terakhir</span></h2><div class="jlFoto">' + FT.map(function (x) {
      return '<button type="button" data-j="foto" data-jlfoto="' + esc(x.id) + '" aria-label="Foto ' + esc(x.jenis) + '">Memuat…<span>' + esc(x.jenis) + ' · ' + esc(jamDari(x.jam)) + '</span></button>';
    }).join('') + '</div>';
    /* hazard valid tanpa tempat */
    var HZ = (d.hazard || []).filter(function (x) { return !kunciT(x.jenis + ' ' + (x.teks || '')); });
    if (HZ.length) h += '<h2 class="bagW">Hazard valid lain <span class="kecil">24 jam</span></h2><div class="kartu" style="padding-top:4px;padding-bottom:4px">' + HZ.slice(0, rinci.hz ? 40 : 4).map(function (x) {
      return '<div class="jlHz"><span class="ik">' + (IKJ[x.jenis] || '⚠️') + '</span><div class="tx"><b>' + esc(x.jenis) + ' ' + tagK('Hazard valid', x.jam) + '</b><small>' + esc(x.teks && x.teks !== x.jenis ? x.teks : '') + '</small></div>'
        + (x.lat != null && x.lng != null ? '<button type="button" class="jlPeta" data-j="peta:' + x.lat + ',' + x.lng + '">📍 Peta</button>' : '') + '</div>';
    }).join('') + (HZ.length > 4 ? '<button type="button" class="jlLagi" data-j="rinci:hz" style="margin:4px 0 8px">' + (rinci.hz ? 'Ringkas' : 'Lihat semua (' + HZ.length + ')') + '</button>' : '') + '</div>';
    /* catatan umum tanpa tempat */
    var U = (d.umum || []).filter(function (c) { return !kunciT(c.teks); });
    if (U.length) h += '<h2 class="bagW">Catatan lain</h2><div class="kartu" style="padding-top:4px;padding-bottom:4px">' + U.slice(0, rinci.um ? 20 : 3).map(function (c) {
      return '<div class="jlHz"><span class="ik" style="background:var(--panel2)">' + ikonSumber(c.sumber) + '</span><div class="tx"><small style="color:var(--teks)">' + esc(c.teks) + '</small>' + tagK(c.sumber, c.jam) + '</div></div>';
    }).join('') + (U.length > 3 ? '<button type="button" class="jlLagi" data-j="rinci:um" style="margin:4px 0 8px">' + (rinci.um ? 'Ringkas' : 'Lihat semua (' + U.length + ')') + '</button>' : '') + '</div>';
    var SG = d.sumberGagal || {}, gg = Object.keys(SG).filter(function (k) { return SG[k]; });
    if (gg.length) h += '<div class="jlGagal">Sebagian sumber belum terbaca: ' + gg.map(function (k) { return { gps: 'GPS', wa: 'grup WA', pos: 'Pos Kontrol', hazard: 'hazard' }[k] || k; }).join(', ') + '. Data lain tetap tampil.</div>';
    if (galat) h += '<div class="jlGagal">Belum bisa memperbarui: ' + esc(galat) + ' (tampil data terakhir).</div>';
    h += '<div class="kecil jlKaki">Ketuk tempat untuk rincian (kecepatan masuk/keluar, perkiraan waktu tempuh, catatan). 🛰 GPS · 🚧 Pos Kontrol · 💬 WA · ⚠ Hazard valid.</div>'
      + '<button type="button" class="tKecil jlSegar" data-j="segar"' + (jalan ? ' disabled' : '') + '>' + (jalan ? 'Memperbarui…' : '↻ Segarkan') + '</button>';
    lapis('update ' + esc(jamDari(d.jam || d.diperbarui || '')) + ' · informasi saja', h);
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
