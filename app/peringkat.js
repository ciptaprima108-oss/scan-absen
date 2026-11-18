/* WHL App — PAPAN PERINGKAT MINGGUAN (tahap 6 rancangan Upgrade\app-beranda-poin-16nov §1 no 6; server Armand PusatPoin.gs pusatPeringkat). Andro tim C, 17 Nov 2026.
 * 4 papan: Ritase (tiket Input DO saja), P2H rajin, Nol insiden (daftar kehormatan), Pelapor hazard (valid). Minggu = Senin 06.00 – Senin 06.00.
 * "Minggu ini" = berjalan (cache server 30 mnt), "Minggu lalu" = final (dihitung Senin 06.00, top 3 +30/+20/+10, nol insiden +10).
 * Lencana 🎂 untuk yang berulang tahun hari ini (x.ultah dari server). Posisi saya disorot. Tanpa angka uang.
 * v3.36 (poin karyawan): tab Driver | Staf. Staf = pusatPeringkatStaf (API-APP.md §2): Staf teladan (% capaian peran), Divisi terbaik, Hadir sempurna.
 * Driver hanya melihat papan Driver (tanpa bilah tab). Pimpinan & penyetuju ACC tidak ikut papan staf (disaring server).
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA;
  var CTX = null, lapisEl = null, MODE = 'berjalan', PAPAN = 'ritase', DATA = {}, MATI = false;
  var JENIS = 'driver', DATA_S = {}, PAPAN_S = 'staf', FN_S = 'pusatPeringkatStaf'; /* v3.36 tab Staf */
  function bolehStaf() { var S = CTX && CTX.sesi ? CTX.sesi() : null; return !!(S && S.user && S.user.peran !== 'driver' && API.Pusat.asli() && API.Pusat.punya(FN_S)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var DES = 0; /* v3.31: desimal papan dari server (ritase setara 107-PORT = 1) */
  function ang(n, des) { var v = Number(n); if (!isFinite(v)) return '–'; var d = des == null ? 0 : des; return d ? v.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }) : v.toLocaleString('id-ID', { maximumFractionDigits: 1 }); }
  function ILUS(n) { return window.WHL_ILUS ? window.WHL_ILUS(n) : ''; }
  function sesi() { return CTX && CTX.sesi ? CTX.sesi() : null; }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  var WARNA = ['#1E88E5', '#20C3B4', '#7A5CF0', '#FF7A33', '#E99A00', '#D9480F', '#0B8A80', '#1257B3', '#B71C2C', '#4A5872'];
  function warna(n) { var h = 0; String(n || '').split('').forEach(function (c) { h = (h * 31 + c.charCodeAt(0)) >>> 0; }); return WARNA[h % WARNA.length]; }
  function inisial(n) { var p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  /** "BAYU SAPUTRA WIJAYA" -> "Bayu S." (papan dilihat semua orang: cukup nama depan + inisial) */
  function pendek(n) { var p = String(n || '').trim().toLowerCase().split(/\s+/).filter(Boolean).map(function (w) { return w[0].toUpperCase() + w.slice(1); }); if (!p.length) return '-'; return p.length === 1 ? p[0] : p[0] + ' ' + p[1][0] + '.'; }
  var IKON_PAPAN = { ritase: '🚛', p2h: '📋', nolinsiden: '🛡️', hazard: '⚠️' }, SINGKAT = { ritase: 'Ritase', p2h: 'P2H', nolinsiden: 'Nol insiden', hazard: 'Hazard' };
  function gaya() {
    if (document.getElementById('prkGaya')) return; var st = document.createElement('style'); st.id = 'prkGaya';
    st.textContent = '.prkLapis .ksnIsi{padding-bottom:44px}.prkSeg{display:flex;gap:6px;overflow-x:auto;margin:10px 0 12px;scrollbar-width:none}.prkSeg::-webkit-scrollbar{display:none}'
      + '.prkSeg button{flex:none;min-height:40px;padding:0 14px;border-radius:99px;font-weight:800;font-size:13px;background:var(--panel2);color:var(--redup)}.prkSeg button.on{background:var(--utama);color:#fff}'
      + '.prkPodium{display:grid;grid-template-columns:1fr 1.1fr 1fr;align-items:end;gap:8px;padding:6px 2px 0}.prkPd{display:flex;flex-direction:column;align-items:center;text-align:center;min-width:0}'
      + '.prkAva{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:900;font-size:16px;box-shadow:0 0 0 3px var(--panel)}.prkPd.satu .prkAva{width:58px;height:58px;font-size:19px}'
      + '.prkPd b{font-size:12.5px;margin-top:6px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.prkPd small{font-size:11.5px;color:var(--redup);font-weight:700}.prkMhk{font-size:20px;line-height:1;margin-bottom:2px}'
      + '.prkBlok{width:100%;margin-top:6px;border-radius:12px 12px 4px 4px;display:grid;place-items:center;color:#fff;font-family:Nunito,sans-serif;font-weight:900;font-size:22px}'
      + '.prkPd.saya .prkAva{box-shadow:0 0 0 3px var(--utama)}.prkPoin{font-size:10.5px;font-weight:900;color:#15803d;background:rgba(22,163,74,.14);padding:1px 7px;border-radius:99px;margin-top:3px}'
      + '.prkBrs{display:flex;align-items:center;gap:10px;padding:9px 6px;border-top:1px solid var(--garis);border-radius:10px}.prkBrs:first-child{border-top:0}.prkBrs .rk{width:26px;text-align:center;font-family:Nunito,sans-serif;font-weight:900;color:var(--redup);flex:none}'
      + '.prkBrs .prkAva{width:34px;height:34px;font-size:12px;box-shadow:none;flex:none}.prkBrs .tx{flex:1;min-width:0}.prkBrs .tx b{display:block;font-size:14px}.prkBrs .tx small{display:block;color:var(--redup);font-size:11.5px}.prkBrs .nil{font-family:Nunito,sans-serif;font-weight:900;font-size:16px;flex:none}'
      + '.prkBrs.saya{background:var(--tint);border-top-color:transparent}.prkBrs.saya .tx b{color:var(--utama)}.prkHadiah{display:flex;gap:10px;align-items:center}.prkHadiah .ilus{width:40px;height:40px;flex:none}'
      + 'html[data-tema="gelap"] .prkPoin{color:#4ade80}'
      + '.prkKet{margin:-2px 0 6px;line-height:1.4}.prkBrs .nil small.prkSat{display:block;font-family:inherit;font-size:10.5px;font-weight:700;color:var(--redup);text-align:right}.prkEks{display:flex;gap:8px;justify-content:center;margin:0 6px 14px}.prkEks button{min-height:40px;padding:0 16px;border-radius:12px;font-weight:800;font-size:13px;background:var(--panel2);color:var(--teks)}'
      + '.prkJenis{display:flex;background:var(--panel2);border-radius:14px;padding:3px;gap:3px;margin:2px 0 10px}.prkJenis button{flex:1;min-height:42px;border-radius:11px;font-weight:800;font-size:14px;color:var(--redup);background:none}.prkJenis button.on{background:var(--panel);color:var(--teks);box-shadow:0 1px 3px rgba(0,0,0,.18)}'
      + '.prkBrs .tx small.prkPr{color:var(--redup)}.prkPd small.prkPr{display:block;font-size:10.5px;font-weight:700;color:var(--redup);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.prkKosong{text-align:center;padding:20px 12px}.prkKosong .ilus{width:68px;height:68px}.prkKosong b{display:block;margin-top:6px}.prkKosong small{display:block;color:var(--redup);margin-top:4px;line-height:1.45}';
    document.head.appendChild(st);
  }
  function punya() { return API.Pusat.asli() && API.Pusat.punya('pusatPeringkat'); }
  function lapis(judul, sub, isi) {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis prkLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik);
    }
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-k="tutup" aria-label="Kembali">‹</button><div class="nm">' + esc(sub) + '<b>' + esc(judul) + '</b></div></div><div class="ksnIsi">' + isi + '</div>';
  }
  function tutup() { if (!lapisEl) return false; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); return true; }
  function buka(ctx) { CTX = ctx || CTX; gaya(); if (!bolehStaf()) JENIS = 'driver'; else if (!punya()) JENIS = 'staf'; if (!punya() && !bolehStaf()) { roti('Peringkat belum tersedia di server.'); return; } gambar(); muat(); }
  function muat(paksa) {
    if (JENIS === 'staf') { muatStaf(paksa); return; }
    var m = MODE, c = DATA[m];
    if (c && !paksa && Date.now() - c.t < 10 * 60000) { gambar(); return; }
    var S = sesi(); if (!S || !S.tokenPusat) return;
    API.Pusat.panggil('pusatPeringkat', [S.tokenPusat, m === 'berjalan' ? 'berjalan' : ''], 60000).then(function (h) {
      if (h && h.login === false) { tutup(); if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (h && h.aktif === false) MATI = true;
      DATA[m] = { d: h, t: Date.now() }; if (lapisEl && MODE === m) gambar();
    }, function (e) { DATA[m] = { d: { ok: false, pesan: e.message }, t: 0 }; if (lapisEl && MODE === m) gambar(); });
  }
  function jenisHtml() { if (!(bolehStaf() && punya())) return ''; return '<div class="prkJenis" role="tablist" aria-label="Papan">' + [['driver', '🚛 Driver'], ['staf', '🧑‍💼 Staf']].map(function (x) { return '<button type="button" role="tab" aria-selected="' + (JENIS === x[0]) + '" data-k="jenis:' + x[0] + '" class="' + (JENIS === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>'; }
  function gambar() {
    if (JENIS === 'staf') { gambarStaf(); return; }
    var c = DATA[MODE], d = c && c.d, seg = jenisHtml() + '<div class="segmen">' + [['berjalan', 'Minggu ini'], ['lalu', 'Minggu lalu (final)']].map(function (x) { return '<button type="button" data-k="mode:' + x[0] + '" class="' + (MODE === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (!d) { lapis('Peringkat', 'Senin 06.00 – Senin 06.00', seg + (R && R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>')); return; }
    if (d.aktif === false) { lapis('Peringkat', 'Papan mingguan', jenisHtml() + '<div class="kartu prkKosong">' + ILUS('peringkat') + '<b>Peringkat belum dibuka</b><small>' + esc(d.pesan || 'Sedang disiapkan.') + '</small></div>'); return; }
    if (d.ok === false) { lapis('Peringkat', 'Papan mingguan', seg + '<div class="kartu prkKosong">' + ILUS('peringkat') + '<b>Belum bisa dimuat</b><small>' + esc(d.pesan || '') + '</small><button type="button" class="tKecil" data-k="ulang" style="margin-top:10px">Coba lagi</button></div>'); return; }
    var Pp = Array.isArray(d.papan) ? d.papan : [], p = Pp.filter(function (x) { return x.id === PAPAN; })[0] || Pp[0];
    if (p) PAPAN = p.id;
    var sub = (d.label || '') + (d.berjalan ? ' · tutup Senin 06.00' : d.final === false ? ' · belum final' : ' · final');
    var h = seg + '<div class="prkSeg" role="tablist">' + Pp.map(function (x) { return '<button type="button" role="tab" data-k="papan:' + esc(x.id) + '" class="' + (x.id === PAPAN ? 'on' : '') + '">' + (IKON_PAPAN[x.id] || '🏅') + ' ' + esc(SINGKAT[x.id] || x.judul) + '</button>'; }).join('') + '</div>';
    if (!p) { lapis('Peringkat', sub, h + kosong('Belum ada papan', '')); return; }
    var L = Array.isArray(p.daftar) ? p.daftar : [], sat = p.satuanPendek || p.satuan || (p.id === 'ritase' ? 'rit' : ''), nol = p.id === 'nolinsiden'; /* v3.31: satuan pendek di podium */
    DES = p.desimal != null && isFinite(Number(p.desimal)) ? Math.max(0, Math.min(2, Number(p.desimal))) : 0;
    if (!d.berjalan && d.final === false) h += '<div class="kartu kecil" style="line-height:1.5">Hasil final minggu lalu dihitung otomatis <b>Senin 06.00</b>. Sementara lihat tab <b>Minggu ini</b>.</div>';
    if (p.gagal && !L.length) { lapis('Peringkat', sub, h + kosong('Papan ' + (SINGKAT[p.id] || p.judul) + ' belum bisa dihitung', 'Data sumber sedang tidak terbaca. Coba lagi nanti.')); return; }
    if (!L.length) { lapis('Peringkat', sub, h + kosong('Belum ada nama di papan ini', d.berjalan ? 'Minggu baru dimulai. Ayo jadi yang pertama!' : '') + hadiah(d)); return; }
    h += '<div class="kartu"><div class="kecil" style="margin-bottom:4px;font-weight:800;color:var(--teks)">' + esc(nol ? 'Daftar kehormatan · tanpa insiden' : p.judul) + '</div>' + (p.keterangan ? '<div class="kecil prkKet">' + esc(p.keterangan) + '</div>' : '') + podium(L.slice(0, 3), sat, nol) + '</div>';
    var sisa = L.slice(3), saya = p.saya, adaSaya = L.some(function (x) { return x.saya; });
    if (sisa.length) h += '<div class="kartu">' + sisa.map(function (x) { return baris(x, sat, nol); }).join('') + '</div>';
    if (saya && !adaSaya) h += '<div class="kartu">' + baris({ urut: saya.urut, nama: (sesi() && (sesi().namaLengkap || sesi().user.nama)) || 'Kamu', nilai: saya.nilai, saya: true }, sat, nol) + '</div>';
    else if (!saya && sesi() && sesi().user.peran === 'driver') h += '<div class="kecil" style="margin:4px 6px 12px">Kamu belum masuk papan ini ' + (d.berjalan ? 'minggu ini' : 'minggu lalu') + '.</div>';
    h += hadiah(d) + '<div class="kecil" style="margin:12px 6px;text-align:center;line-height:1.5">Periode ' + esc(d.periode || 'Senin 06.00 – Senin 06.00') + '. ' + esc(ketRitase(Pp)) + ' Pelapor hazard = laporan yang sudah divalidasi HSE/pengawas.</div>' + eksporHtml();
    lapis('Peringkat', sub, h);
  }
  function nm(x) { return esc(x.saya ? 'Kamu · ' + pendek(x.nama) : pendek(x.nama)) + ((x.ultah || (window.WHL_ULTAH && window.WHL_ULTAH.lencana && window.WHL_ULTAH.lencana(x.uid, x.nama))) ? ' 🎂' : ''); } /* integrator v3.30: lencana juga dari daftar ultah Beranda */
  function nilaiTeks(x, sat, nol) { return ang(x.nilai, nol ? 0 : DES) + ' ' + esc(nol ? 'hari kerja' : sat); }
  function ketRitase(Pp) { var r = (Pp || []).filter(function (x) { return x.id === 'ritase'; })[0]; return r && r.keterangan ? String(r.keterangan).replace(/\.?\s*$/, '.') : 'Ritase dari tiket Input DO.'; }
  function podium(T, sat, nol) {
    var urut = [T[1], T[0], T[2]], tinggi = [62, 86, 48], latar = ['linear-gradient(180deg,#9fb6d6,#6c86ad)', 'linear-gradient(180deg,#ffd36a,#e99a00)', 'linear-gradient(180deg,#ffb27a,#d9480f)'], no = [2, 1, 3];
    return '<div class="prkPodium">' + urut.map(function (x, i) {
      if (!x) return '<div class="prkPd"></div>';
      return '<div class="prkPd' + (no[i] === 1 ? ' satu' : '') + (x.saya ? ' saya' : '') + '">' + (no[i] === 1 ? '<span class="prkMhk">👑</span>' : '') + '<span class="prkAva" style="background:' + warna(x.nama) + '">' + esc(inisial(x.nama)) + '</span><b>' + nm(x) + '</b><small>' + nilaiTeks(x, sat, nol) + '</small>'
        + (Number(x.poin) > 0 ? '<span class="prkPoin">+' + ang(x.poin) + ' poin</span>' : '') + '<span class="prkBlok" style="height:' + tinggi[i] + 'px;background:' + latar[i] + '">' + no[i] + '</span></div>';
    }).join('') + '</div>';
  }
  function baris(x, sat, nol) {
    return '<div class="prkBrs' + (x.saya ? ' saya' : '') + '"><span class="rk">' + ang(x.urut) + '</span><span class="prkAva" style="background:' + warna(x.nama) + '">' + esc(inisial(x.nama)) + '</span><div class="tx"><b>' + nm(x) + '</b>' + (Number(x.poin) > 0 ? '<small>+' + ang(x.poin) + ' poin Senin pagi</small>' : '') + '</div><span class="nil">' + ang(x.nilai, nol ? 0 : DES) + (sat && !nol ? '<small class="prkSat">' + esc(sat) + '</small>' : '') + '</span></div>';
  }
  function hadiah(d) {
    var H = d.hadiah || { top: [30, 20, 10], nolInsiden: 10 }, t = H.top || [30, 20, 10];
    return '<div class="kartu prkHadiah">' + ILUS('poin') + '<div class="kecil" style="flex:1;line-height:1.45"><b style="color:var(--teks)">Hadiah poin Senin pagi:</b> #1 +' + t[0] + ' · #2 +' + t[1] + ' · #3 +' + t[2] + ' tiap papan. Semua di daftar Nol insiden +' + (H.nolInsiden || 10) + '.</div></div>';
  }
  /* ---------- v3.31 ekspor: Excel dibuat di HP dari data papan yang sudah dimuat; PDF dari server (kalau server punya fungsinya) ---------- */
  var FN_PDF = 'pusatPeringkatPdf';
  function bolehPdf() { return API.Pusat.asli() && API.Pusat.punya(FN_PDF); }
  function eksporHtml() { return window.WHL_EKSPOR ? '<div class="prkEks"><button type="button" data-k="excel">📊 Excel</button>' + (bolehPdf() ? '<button type="button" data-k="pdf">📄 PDF</button>' : '') + '</div>' : ''; }
  function excel() {
    var S0 = sesi(); if (S0 && window.WHL_EKSPOR && API.Pusat.asli() && API.Pusat.punya('pusatPeringkatRekap')) { window.WHL_EKSPOR.excelServer(API.Pusat.panggil('pusatPeringkatRekap', [S0.tokenPusat, MODE === 'berjalan' ? 'berjalan' : ''], 120000), 'Peringkat WHL', roti, 'Peringkat'); return; } /* kontrak katalog-lengkap-17nov\pdf */
    var c = DATA[MODE], d = c && c.d; if (!d || !Array.isArray(d.papan) || !window.WHL_EKSPOR) return;
    var sh = d.papan.map(function (p) {
      var nol = p.id === 'nolinsiden', sat = nol ? 'hari kerja' : (p.satuanPendek || p.satuan || ''), des = nol ? 0 : (p.desimal != null ? Number(p.desimal) || 0 : 0);
      var rows = (p.daftar || []).map(function (x) { var v = Number(x.nilai); return [Number(x.urut) || '', x.nama || '', isFinite(v) ? (des ? Math.round(v * Math.pow(10, des)) / Math.pow(10, des) : v) : '', sat, Number(x.poin) || 0]; });
      return [SINGKAT[p.id] || p.judul || p.id, [['Urut', 'Nama', 'Nilai', 'Satuan', 'Poin Senin']].concat(rows, p.keterangan ? [[], ['Keterangan', p.keterangan]] : [])];
    });
    sh.unshift(['Ringkas', [['Peringkat WHL', d.label || ''], ['Periode', d.periode || 'Senin 06.00 – Senin 06.00'], ['Status', d.berjalan ? 'Minggu berjalan (belum final)' : d.final === false ? 'Belum final' : 'Final'], ['Dibuat', new Date().toLocaleString('id-ID')]]]);
    window.WHL_EKSPOR.excel('Peringkat WHL - ' + (d.label || (MODE === 'berjalan' ? 'Minggu ini' : 'Minggu lalu')), sh, roti);
  }
  function pdf() {
    var S = sesi(); if (!S || !window.WHL_EKSPOR) return;
    window.WHL_EKSPOR.pdf(API.Pusat.panggil(FN_PDF, [S.tokenPusat, MODE === 'berjalan' ? 'berjalan' : ''], 120000), 'Peringkat WHL', roti);
  }
  function kosong(j, k) { return '<div class="kartu prkKosong">' + ILUS('peringkat') + '<b>' + esc(j) + '</b><small>' + esc(k || '') + '</small></div>'; }
  function klik(ev) {
    var b = ev.target.closest('[data-k]'); if (!b || !lapisEl || !lapisEl.contains(b)) return; var n = b.getAttribute('data-k');
    if (n === 'tutup') { if (R && R.bunyi) R.bunyi('tutup'); tutup(); return; }
    if (n === 'ulang') { muat(true); gambar(); return; }
    if (n.indexOf('mode:') === 0) { MODE = n.slice(5); gambar(); muat(); return; }
    if (n.indexOf('jenis:') === 0) { JENIS = n.slice(6) === 'staf' && bolehStaf() ? 'staf' : 'driver'; if (R && R.getar) R.getar(); gambar(); muat(); return; }
    if (n.indexOf('papanS:') === 0) { PAPAN_S = n.slice(7); if (R && R.getar) R.getar(); gambar(); return; }
    if (n.indexOf('papan:') === 0) { PAPAN = n.slice(6); if (R && R.getar) R.getar(); gambar(); }
    if (n === 'excel') { excel(); return; }
    if (n === 'pdf') { pdf(); return; }
  }
  /* ---------- v3.36 papan STAF (pusatPeringkatStaf) ---------- */
  var IKON_S = { staf: '🏅', divisi: '🧩', hadir: '🗓️' }, SINGKAT_S = { staf: 'Staf teladan', divisi: 'Divisi terbaik', hadir: 'Hadir sempurna' };
  function muatStaf(paksa) {
    var m = MODE, c = DATA_S[m];
    if (c && !paksa && Date.now() - c.t < 10 * 60000) { gambar(); return; }
    var S = sesi(); if (!S || !S.tokenPusat) return;
    API.Pusat.panggil(FN_S, [S.tokenPusat, m === 'berjalan' ? 'berjalan' : ''], 60000).then(function (h) {
      if (h && h.login === false) { tutup(); if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return; }
      DATA_S[m] = { d: h || { ok: false }, t: Date.now() }; if (lapisEl && MODE === m && JENIS === 'staf') gambar();
    }, function (e) { DATA_S[m] = { d: { ok: false, pesan: e.message }, t: 0 }; if (lapisEl && MODE === m && JENIS === 'staf') gambar(); });
  }
  function gambarStaf() {
    var c = DATA_S[MODE], d = c && c.d, seg = jenisHtml() + '<div class="segmen">' + [['berjalan', 'Minggu ini'], ['lalu', 'Minggu lalu (final)']].map(function (x) { return '<button type="button" data-k="mode:' + x[0] + '" class="' + (MODE === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (!d) { lapis('Peringkat', 'Papan staf', seg + (R && R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>')); return; }
    if (d.aktif === false) { lapis('Peringkat', 'Papan staf', seg + kosong('Papan staf belum dibuka', d.pesan || 'Sedang disiapkan.')); return; }
    if (d.ok === false) { lapis('Peringkat', 'Papan staf', seg + '<div class="kartu prkKosong">' + ILUS('peringkat') + '<b>Belum bisa dimuat</b><small>' + esc(d.pesan || '') + '</small><button type="button" class="tKecil" data-k="ulang" style="margin-top:10px">Coba lagi</button></div>'); return; }
    var Pp = Array.isArray(d.papan) ? d.papan : [], p = Pp.filter(function (x) { return x.id === PAPAN_S; })[0] || Pp[0]; if (p) PAPAN_S = p.id;
    var sub = (d.label || '') + (d.berjalan ? ' · tutup Senin 06.00' : d.final === false ? ' · belum final' : ' · final') + (d.uji ? ' · MASA UJI' : '');
    var h = seg + '<div class="prkSeg" role="tablist">' + Pp.map(function (x) { return '<button type="button" role="tab" data-k="papanS:' + esc(x.id) + '" class="' + (x.id === PAPAN_S ? 'on' : '') + '">' + (IKON_S[x.id] || '🏅') + ' ' + esc(SINGKAT_S[x.id] || x.judul) + '</button>'; }).join('') + '</div>';
    if (d.keterangan) h += '<div class="kecil prkKet" style="margin:0 4px 10px">' + esc(d.keterangan) + '</div>';
    if (!p) { lapis('Peringkat', sub, h + kosong('Belum ada papan', '')); return; }
    var L = Array.isArray(p.daftar) ? p.daftar : [], hadir = p.id === 'hadir', div = p.id === 'divisi', sat = p.satuan == null ? '%' : p.satuan;
    if (!L.length) { lapis('Peringkat', sub, h + kosong('Belum ada nama di papan ini', d.berjalan ? 'Minggu baru dimulai.' : '') + hadiahS(d)); return; }
    if (hadir) h += '<div class="kartu"><div class="kecil" style="margin-bottom:4px;font-weight:800;color:var(--teks)">Daftar kehormatan · hadir tepat semua hari roster</div>' + L.map(function (x) { return barisS(x, '', true, false); }).join('') + '</div>';
    else {
      h += '<div class="kartu"><div class="kecil" style="margin-bottom:4px;font-weight:800;color:var(--teks)">' + esc(p.judul || SINGKAT_S[p.id] || '') + '</div>' + podiumS(L.slice(0, 3), sat, div) + '</div>';
      if (L.length > 3) h += '<div class="kartu">' + L.slice(3).map(function (x) { return barisS(x, sat, false, div); }).join('') + '</div>';
      var saya = p.saya, adaSaya = L.some(function (x) { return x.saya; });
      if (saya && !adaSaya) h += '<div class="kartu">' + barisS({ urut: saya.urut, nama: div ? 'Divisimu' : 'Kamu', nilai: saya.nilai, saya: true }, sat, false, true) + '</div>';
    }
    h += hadiahS(d) + '<div class="kecil" style="margin:12px 6px;text-align:center;line-height:1.5">Periode ' + esc(d.periode || 'Senin 06.00 – Senin 06.00') + '. Pimpinan & penyetuju ACC tidak ikut papan staf.</div>';
    lapis('Peringkat', sub, h);
  }
  function nmS(x, div) { return esc(div ? (x.saya ? 'Divisimu · ' : '') + (x.nama || '') : (x.saya ? 'Kamu · ' : '') + pendek(x.nama)); }
  function subS(x, div) { return esc(div ? (x.anggota ? x.anggota + ' orang' : '') : [x.peranLabel, x.hari ? x.hari + ' hari' : ''].filter(Boolean).join(' · ')); }
  function podiumS(T, sat, div) {
    var urut = [T[1], T[0], T[2]], tinggi = [62, 86, 48], latar = ['linear-gradient(180deg,#9fb6d6,#6c86ad)', 'linear-gradient(180deg,#ffd36a,#e99a00)', 'linear-gradient(180deg,#ffb27a,#d9480f)'], no = [2, 1, 3];
    return '<div class="prkPodium">' + urut.map(function (x, i) {
      if (!x) return '<div class="prkPd"></div>';
      return '<div class="prkPd' + (no[i] === 1 ? ' satu' : '') + (x.saya ? ' saya' : '') + '">' + (no[i] === 1 ? '<span class="prkMhk">👑</span>' : '') + '<span class="prkAva" style="background:' + warna(x.nama) + '">' + esc(inisial(x.nama)) + '</span><b>' + nmS(x, div) + '</b><small class="prkPr">' + subS(x, div) + '</small><small>' + ang(x.nilai) + esc(sat) + '</small>'
        + (Number(x.poin) > 0 ? '<span class="prkPoin">+' + ang(x.poin) + ' poin' + (div ? '/org' : '') + '</span>' : '') + '<span class="prkBlok" style="height:' + tinggi[i] + 'px;background:' + latar[i] + '">' + no[i] + '</span></div>';
    }).join('') + '</div>';
  }
  function barisS(x, sat, hadir, div) {
    return '<div class="prkBrs' + (x.saya ? ' saya' : '') + '"><span class="rk">' + (hadir ? '✓' : ang(x.urut)) + '</span><span class="prkAva" style="background:' + warna(x.nama) + '">' + esc(inisial(x.nama)) + '</span><div class="tx"><b>' + nmS(x, div) + '</b><small class="prkPr">' + subS(x, div) + (Number(x.poin) > 0 ? ' · +' + ang(x.poin) + ' poin' : '') + '</small></div>' + (hadir ? '' : '<span class="nil">' + ang(x.nilai) + '<small class="prkSat">' + esc(sat) + '</small></span>') + '</div>';
  }
  function hadiahS(d) {
    var H = d.hadiah || {}, t = H.top || [20, 15, 10];
    return '<div class="kartu prkHadiah">' + ILUS('poin') + '<div class="kecil" style="flex:1;line-height:1.45"><b style="color:var(--teks)">Hadiah poin Senin pagi:</b> Staf teladan #1 +' + t[0] + ' · #2 +' + t[1] + ' · #3 +' + t[2] + '. Divisi juara +' + (H.divisi || 10) + ' per anggota (hadir ≥ 4 hari).</div></div>';
  }
  function lupakan() { DATA = {}; DATA_S = {}; MATI = false; MODE = 'berjalan'; PAPAN = 'ritase'; PAPAN_S = 'staf'; JENIS = 'driver'; tutup(); }
  window.WHL_PERINGKAT = { buka: buka, tutup: tutup, lupakan: lupakan, mati: function () { return MATI && !bolehStaf(); }, _uji: { pendek: pendek, data: function () { return DATA; } } };
})();
