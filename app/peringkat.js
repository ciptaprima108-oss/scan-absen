/* WHL App — PAPAN PERINGKAT MINGGUAN (tahap 6 rancangan Upgrade\app-beranda-poin-16nov §1 no 6; server Armand PusatPoin.gs pusatPeringkat). Andro tim C, 17 Nov 2026.
 * 4 papan: Ritase (tiket Input DO saja), P2H rajin, Nol insiden (daftar kehormatan), Pelapor hazard (valid). Minggu = Senin 06.00 – Senin 06.00.
 * "Minggu ini" = berjalan (cache server 30 mnt), "Minggu lalu" = final (dihitung Senin 06.00, top 3 +30/+20/+10, nol insiden +10).
 * Lencana 🎂 untuk yang berulang tahun hari ini (x.ultah dari server). Posisi saya disorot. Tanpa angka uang.
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA;
  var CTX = null, lapisEl = null, MODE = 'berjalan', PAPAN = 'ritase', DATA = {}, MATI = false;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ang(n) { var v = Number(n); return isFinite(v) ? v.toLocaleString('id-ID') : '–'; }
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
  function buka(ctx) { CTX = ctx || CTX; gaya(); if (!punya()) { roti('Peringkat belum tersedia di server.'); return; } gambar(); muat(); }
  function muat(paksa) {
    var m = MODE, c = DATA[m];
    if (c && !paksa && Date.now() - c.t < 10 * 60000) { gambar(); return; }
    var S = sesi(); if (!S || !S.tokenPusat) return;
    API.Pusat.panggil('pusatPeringkat', [S.tokenPusat, m === 'berjalan' ? 'berjalan' : ''], 60000).then(function (h) {
      if (h && h.login === false) { tutup(); if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (h && h.aktif === false) MATI = true;
      DATA[m] = { d: h, t: Date.now() }; if (lapisEl && MODE === m) gambar();
    }, function (e) { DATA[m] = { d: { ok: false, pesan: e.message }, t: 0 }; if (lapisEl && MODE === m) gambar(); });
  }
  function gambar() {
    var c = DATA[MODE], d = c && c.d, seg = '<div class="segmen">' + [['berjalan', 'Minggu ini'], ['lalu', 'Minggu lalu (final)']].map(function (x) { return '<button type="button" data-k="mode:' + x[0] + '" class="' + (MODE === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (!d) { lapis('Peringkat', 'Senin 06.00 – Senin 06.00', seg + (R && R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>')); return; }
    if (d.aktif === false) { lapis('Peringkat', 'Papan mingguan', '<div class="kartu prkKosong">' + ILUS('peringkat') + '<b>Peringkat belum dibuka</b><small>' + esc(d.pesan || 'Sedang disiapkan.') + '</small></div>'); return; }
    if (d.ok === false) { lapis('Peringkat', 'Papan mingguan', seg + '<div class="kartu prkKosong">' + ILUS('peringkat') + '<b>Belum bisa dimuat</b><small>' + esc(d.pesan || '') + '</small><button type="button" class="tKecil" data-k="ulang" style="margin-top:10px">Coba lagi</button></div>'); return; }
    var Pp = Array.isArray(d.papan) ? d.papan : [], p = Pp.filter(function (x) { return x.id === PAPAN; })[0] || Pp[0];
    if (p) PAPAN = p.id;
    var sub = (d.label || '') + (d.berjalan ? ' · tutup Senin 06.00' : d.final === false ? ' · belum final' : ' · final');
    var h = seg + '<div class="prkSeg" role="tablist">' + Pp.map(function (x) { return '<button type="button" role="tab" data-k="papan:' + esc(x.id) + '" class="' + (x.id === PAPAN ? 'on' : '') + '">' + (IKON_PAPAN[x.id] || '🏅') + ' ' + esc(SINGKAT[x.id] || x.judul) + '</button>'; }).join('') + '</div>';
    if (!p) { lapis('Peringkat', sub, h + kosong('Belum ada papan', '')); return; }
    var L = Array.isArray(p.daftar) ? p.daftar : [], sat = p.satuan || '', nol = p.id === 'nolinsiden';
    if (!d.berjalan && d.final === false) h += '<div class="kartu kecil" style="line-height:1.5">Hasil final minggu lalu dihitung otomatis <b>Senin 06.00</b>. Sementara lihat tab <b>Minggu ini</b>.</div>';
    if (p.gagal && !L.length) { lapis('Peringkat', sub, h + kosong('Papan ' + (SINGKAT[p.id] || p.judul) + ' belum bisa dihitung', 'Data sumber sedang tidak terbaca. Coba lagi nanti.')); return; }
    if (!L.length) { lapis('Peringkat', sub, h + kosong('Belum ada nama di papan ini', d.berjalan ? 'Minggu baru dimulai. Ayo jadi yang pertama!' : '') + hadiah(d)); return; }
    h += '<div class="kartu"><div class="kecil" style="margin-bottom:4px;font-weight:800;color:var(--teks)">' + esc(nol ? 'Daftar kehormatan · tanpa insiden' : p.judul) + '</div>' + podium(L.slice(0, 3), sat, nol) + '</div>';
    var sisa = L.slice(3), saya = p.saya, adaSaya = L.some(function (x) { return x.saya; });
    if (sisa.length) h += '<div class="kartu">' + sisa.map(function (x) { return baris(x, sat, nol); }).join('') + '</div>';
    if (saya && !adaSaya) h += '<div class="kartu">' + baris({ urut: saya.urut, nama: (sesi() && (sesi().namaLengkap || sesi().user.nama)) || 'Kamu', nilai: saya.nilai, saya: true }, sat, nol) + '</div>';
    else if (!saya && sesi() && sesi().user.peran === 'driver') h += '<div class="kecil" style="margin:4px 6px 12px">Kamu belum masuk papan ini ' + (d.berjalan ? 'minggu ini' : 'minggu lalu') + '.</div>';
    h += hadiah(d) + '<div class="kecil" style="margin:12px 6px;text-align:center;line-height:1.5">Periode ' + esc(d.periode || 'Senin 06.00 – Senin 06.00') + '. Ritase dihitung dari tiket Input DO saja. Pelapor hazard = laporan yang sudah divalidasi HSE/pengawas.</div>';
    lapis('Peringkat', sub, h);
  }
  function nm(x) { return esc(x.saya ? 'Kamu · ' + pendek(x.nama) : pendek(x.nama)) + ((x.ultah || (window.WHL_ULTAH && window.WHL_ULTAH.lencana && window.WHL_ULTAH.lencana(x.uid, x.nama))) ? ' 🎂' : ''); } /* integrator v3.30: lencana juga dari daftar ultah Beranda */
  function nilaiTeks(x, sat, nol) { return ang(x.nilai) + ' ' + esc(nol ? 'hari kerja' : sat); }
  function podium(T, sat, nol) {
    var urut = [T[1], T[0], T[2]], tinggi = [62, 86, 48], latar = ['linear-gradient(180deg,#9fb6d6,#6c86ad)', 'linear-gradient(180deg,#ffd36a,#e99a00)', 'linear-gradient(180deg,#ffb27a,#d9480f)'], no = [2, 1, 3];
    return '<div class="prkPodium">' + urut.map(function (x, i) {
      if (!x) return '<div class="prkPd"></div>';
      return '<div class="prkPd' + (no[i] === 1 ? ' satu' : '') + (x.saya ? ' saya' : '') + '">' + (no[i] === 1 ? '<span class="prkMhk">👑</span>' : '') + '<span class="prkAva" style="background:' + warna(x.nama) + '">' + esc(inisial(x.nama)) + '</span><b>' + nm(x) + '</b><small>' + nilaiTeks(x, sat, nol) + '</small>'
        + (Number(x.poin) > 0 ? '<span class="prkPoin">+' + ang(x.poin) + ' poin</span>' : '') + '<span class="prkBlok" style="height:' + tinggi[i] + 'px;background:' + latar[i] + '">' + no[i] + '</span></div>';
    }).join('') + '</div>';
  }
  function baris(x, sat, nol) {
    return '<div class="prkBrs' + (x.saya ? ' saya' : '') + '"><span class="rk">' + ang(x.urut) + '</span><span class="prkAva" style="background:' + warna(x.nama) + '">' + esc(inisial(x.nama)) + '</span><div class="tx"><b>' + nm(x) + '</b>' + (Number(x.poin) > 0 ? '<small>+' + ang(x.poin) + ' poin Senin pagi</small>' : '') + '</div><span class="nil">' + ang(x.nilai) + '</span></div>';
  }
  function hadiah(d) {
    var H = d.hadiah || { top: [30, 20, 10], nolInsiden: 10 }, t = H.top || [30, 20, 10];
    return '<div class="kartu prkHadiah">' + ILUS('poin') + '<div class="kecil" style="flex:1;line-height:1.45"><b style="color:var(--teks)">Hadiah poin Senin pagi:</b> #1 +' + t[0] + ' · #2 +' + t[1] + ' · #3 +' + t[2] + ' tiap papan. Semua di daftar Nol insiden +' + (H.nolInsiden || 10) + '.</div></div>';
  }
  function kosong(j, k) { return '<div class="kartu prkKosong">' + ILUS('peringkat') + '<b>' + esc(j) + '</b><small>' + esc(k || '') + '</small></div>'; }
  function klik(ev) {
    var b = ev.target.closest('[data-k]'); if (!b || !lapisEl || !lapisEl.contains(b)) return; var n = b.getAttribute('data-k');
    if (n === 'tutup') { if (R && R.bunyi) R.bunyi('tutup'); tutup(); return; }
    if (n === 'ulang') { muat(true); gambar(); return; }
    if (n.indexOf('mode:') === 0) { MODE = n.slice(5); gambar(); muat(); return; }
    if (n.indexOf('papan:') === 0) { PAPAN = n.slice(6); if (R && R.getar) R.getar(); gambar(); }
  }
  function lupakan() { DATA = {}; MATI = false; MODE = 'berjalan'; PAPAN = 'ritase'; tutup(); }
  window.WHL_PERINGKAT = { buka: buka, tutup: tutup, lupakan: lupakan, mati: function () { return MATI; }, _uji: { pendek: pendek, data: function () { return DATA; } } };
})();
