/* WHL App v3.32 — ROSTER di Kehadiran (Reza 17 Nov; server Armand Upgrade\roster-app-17nov\hasil\PusatRoster.gs) — Andro.
 *   pusatRosterSaya(token, bulan?) -> {ok, nama, bulan:[{bulan, label, ada, pesan, hari:[{tgl, hr, kode, shift, jam, status, hariIni}], ringkas}]} (bulan ini + bulan depan)
 *   pusatRosterStaf(token, {bulan?|dari,sampai, divisi?, nama?}) -> {ok, dari, sampai, tanggal:[{tgl, hr, tglN, hariIni}], orang:[{nama, jabatan, divisi, saya, sel:[{kode, shift, jam, status}]}], divisi:[], ringkasHari:[], pesan:[]}
 *   status: kerja | libur | cuti | full | kosong.  Khusus staf (driver tidak). Kartu & layar tampil hanya kalau pusatPing memuat pusatRosterSaya.
 *   Ekspor: Excel dibuat di HP dari tabel (WHL_EKSPOR); PDF dari server kalau ada pusatRosterPdf (kalau tidak, tombol PDF tidak tampil).
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA || {};
  var CTX = null, lapisEl = null, TAB = 'saya', SAYA = null, STAF = null, F = { mode: 'minggu', divisi: '', nama: '' }, MUAT = false;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { return CTX && CTX.sesi ? CTX.sesi() : null; }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function punya(fn) { return API.Pusat.asli() && API.Pusat.punya(fn); }
  function boleh(S) { S = S || sesi(); return !!(S && S.user && S.user.peran !== 'driver') && punya('pusatRosterSaya'); }
  function panggil(fn, args, ms) { var S = sesi(); return API.Pusat.panggil(fn, [S && S.tokenPusat].concat(args || []), ms || 45000); }
  function tglWib(geserHari) { var d = new Date(Date.now() + 7 * 3600000 + (geserHari || 0) * 86400000); return d.toISOString().slice(0, 10); }
  function geserBulan(ym, n) { var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + ('0' + (m + 1)).slice(-2); }
  var HR = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  function gaya() {
    if (document.getElementById('rsGaya')) return; var st = document.createElement('style'); st.id = 'rsGaya';
    st.textContent = '.rsLapis .ksnIsi{padding-bottom:44px}.rsSeg{margin:10px 0 12px}'
      + '.rsBln{margin-bottom:14px}.rsBln h3{margin:2px 4px 8px;font-size:15px;display:flex;justify-content:space-between;align-items:baseline}.rsBln h3 small{font-size:11.5px;color:var(--redup);font-weight:700}'
      + '.rsKal{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}.rsKal .hd{font-size:10.5px;font-weight:800;color:var(--redup);text-align:center;padding:2px 0}'
      + '.rsKal .c{min-height:54px;border-radius:10px;background:var(--panel);padding:4px 3px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:1px;box-shadow:0 0 0 1px var(--garis) inset}'
      + '.rsKal .c b{font-size:12px}.rsKal .c i{font-style:normal;font-size:10.5px;font-weight:900;padding:1px 5px;border-radius:6px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rsKal .c small{font-size:9.5px;color:var(--redup);line-height:1.1}'
      + '.rsKal .c.ini{box-shadow:0 0 0 2px var(--utama) inset}.rsKal .c.kosongH{background:none;box-shadow:none}'
      + '.rsS-kerja{background:rgba(30,136,229,.15);color:#1565c0}.rsS-libur{background:var(--panel2);color:var(--redup)}.rsS-cuti{background:rgba(255,197,48,.25);color:var(--tKuning)}.rsS-full{background:rgba(22,163,74,.15);color:#15803d}.rsS-kosong{background:none;color:var(--samar,var(--redup))}'
      + 'html[data-tema="gelap"] .rsS-kerja{color:#9cc6fa}html[data-tema="gelap"] .rsS-full{color:#5fe39a}'
      + '.rsSaring{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}.rsSaring select,.rsSaring input{flex:1 1 140px;min-height:40px;border-radius:12px;border:1px solid var(--garis);background:var(--panel);color:var(--teks);padding:6px 10px;font:inherit;font-size:13.5px}'
      + '.rsTblW{overflow:auto;-webkit-overflow-scrolling:touch;border-radius:14px;background:var(--panel);box-shadow:0 0 0 1px var(--garis) inset;max-height:62vh}'
      + '.rsTbl{border-collapse:separate;border-spacing:0;font-size:12px}.rsTbl th,.rsTbl td{padding:5px 6px;text-align:center;white-space:nowrap;border-bottom:1px solid var(--garis)}'
      + '.rsTbl thead th{position:sticky;top:0;background:var(--panel2);z-index:2;font-size:11px}.rsTbl th.nm,.rsTbl td.nm{position:sticky;left:0;background:var(--panel);z-index:1;text-align:left;max-width:132px;overflow:hidden;text-overflow:ellipsis}.rsTbl thead th.nm{z-index:3;background:var(--panel2)}'
      + '.rsTbl td.nm small{display:block;color:var(--redup);font-size:10px}.rsTbl .ini{background:rgba(30,136,229,.10)}.rsTbl thead th.ini{background:var(--utama);color:#fff}.rsTbl tr.saya td.nm{color:var(--utama);font-weight:800}'
      + '.rsTbl td i{font-style:normal;font-weight:900;font-size:11px;padding:1px 5px;border-radius:6px}.rsTbl tr.div td{background:var(--panel2);text-align:left;font-weight:800;font-size:11px;color:var(--redup)}.rsTbl tr.div td span{position:sticky;left:6px}.rsMode{display:flex;gap:6px;margin-bottom:8px}.rsMode button{flex:1;min-height:38px;border-radius:99px;font-weight:800;font-size:12.5px;background:var(--panel2);color:var(--redup)}.rsMode button.on{background:var(--utama);color:#fff}'
      + '.rsEks{display:flex;gap:8px;margin:12px 0}.rsEks button{flex:1;min-height:40px;border-radius:12px;font-weight:800;font-size:13px;background:var(--panel2);color:var(--teks)}.rsLeg{display:flex;flex-wrap:wrap;gap:6px;margin:8px 2px;font-size:11px}.rsLeg i{font-style:normal;font-weight:800;padding:1px 6px;border-radius:6px}';
    document.head.appendChild(st);
  }
  function lapis(isi) {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      gaya(); lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis rsLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik); lapisEl.addEventListener('change', ganti); lapisEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'rsNama') { F.nama = e.target.value.trim(); muatStaf(); } });
    }
    var seg = '<div class="segmen rsSeg">' + [['saya', 'Roster saya'], ['staf', 'Roster staf']].filter(function (x) { return x[0] === 'saya' || punya('pusatRosterStaf'); }).map(function (x) { return '<button type="button" data-rs="tab:' + x[0] + '" class="' + (TAB === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-rs="tutup" aria-label="Kembali">‹</button><div class="nm">Kehadiran<b>Roster</b></div></div><div class="ksnIsi">' + seg + isi + '</div>';
  }
  function tutup() { if (!lapisEl) return false; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); return true; }
  function tunggu() { return R.kerangka ? R.kerangka('daftar') : '<div class="kartu"><span class="putar"></span> Memuat roster…</div>'; }
  function gagalHtml(p) { return '<div class="kartu kosongKm"><b>Roster belum bisa dimuat</b><small>' + esc(p || '') + '</small><button type="button" class="tKecil" data-rs="ulang" style="margin-top:10px">Coba lagi</button></div>'; }
  function sel(o) { var t = o.status === 'kosong' ? '–' : o.status === 'full' ? 'FULL' : (o.kode || o.shift || ''); return '<i class="rsS-' + esc(o.status || 'kosong') + '">' + esc(t) + '</i>'; }
  var LEG = '<div class="rsLeg"><i class="rsS-kerja">kerja</i><i class="rsS-libur">OFF / libur</i><i class="rsS-cuti">cuti / izin / sakit</i><i class="rsS-full">full time</i></div>';

  /* ---------- Roster saya ---------- */
  function muatSaya() {
    MUAT = true; lapis(tunggu());
    panggil('pusatRosterSaya', []).then(function (h) {
      MUAT = false; if (h && h.login === false) { tutup(); if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return; }
      SAYA = h && h.ok !== false ? h : { galat: (h && h.pesan) || 'Roster belum tersedia.' }; if (lapisEl && TAB === 'saya') gambarSaya();
    }, function (e) { MUAT = false; SAYA = { galat: e.message }; if (lapisEl && TAB === 'saya') gambarSaya(); });
  }
  function gambarSaya() {
    if (!SAYA) { lapis(tunggu()); return; } if (SAYA.galat) { lapis(gagalHtml(SAYA.galat)); return; }
    var h = '<div class="kecil" style="margin:0 4px 10px">' + esc(SAYA.nama || '') + (SAYA.jabatan ? ' · ' + esc(SAYA.jabatan) : '') + '</div>' + LEG;
    (SAYA.bulan || []).forEach(function (b) {
      var Hr = b.hari || [], awal = Hr.length ? new Date(Hr[0].tgl + 'T00:00:00Z').getUTCDay() : 1, kos = (awal + 6) % 7, Rg = b.ringkas || {};
      h += '<div class="rsBln"><h3>' + esc(b.label || b.bulan) + '<small>' + (Rg.kerja || 0) + ' kerja · ' + (Rg.libur || 0) + ' libur' + (Rg.cuti ? ' · ' + Rg.cuti + ' cuti' : '') + '</small></h3>'
        + (b.ada === false && b.pesan ? '<div class="kecil" style="margin:0 4px 8px">' + esc(b.pesan) + '</div>' : '')
        + '<div class="rsKal">' + ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(function (x) { return '<span class="hd">' + x + '</span>'; }).join('')
        + new Array(kos + 1).join('<span class="c kosongH"></span>')
        + Hr.map(function (x) { return '<span class="c' + (x.hariIni ? ' ini' : '') + '"><b>' + (+x.tgl.slice(8, 10)) + '</b>' + sel(x) + (x.jam ? '<small>' + esc(String(x.jam).replace(/:/g, '.')) + '</small>' : '') + '</span>'; }).join('') + '</div></div>';
    });
    h += eksHtml('saya');
    lapis(h);
  }
  /* ---------- Roster staf ---------- */
  function rentang() {
    var t = tglWib(0), dow = new Date(t + 'T00:00:00Z').getUTCDay(), senin = tglWib(-((dow + 6) % 7)), minggu = tglWib(6 - ((dow + 6) % 7));
    if (F.mode === 'minggu') return { dari: senin, sampai: minggu };
    if (F.mode === 'bulanDepan') return { bulan: geserBulan(t.slice(0, 7), 1) };
    return { bulan: t.slice(0, 7) };
  }
  function muatStaf() {
    MUAT = true; STAF = null; gambarStaf();
    var f = rentang(); if (F.divisi) f.divisi = F.divisi; if (F.nama) f.nama = F.nama;
    panggil('pusatRosterStaf', [f], 60000).then(function (h) {
      MUAT = false; if (h && h.login === false) { tutup(); if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return; }
      STAF = h && h.ok !== false ? h : { galat: (h && h.pesan) || 'Roster staf belum tersedia.' }; if (lapisEl && TAB === 'staf') gambarStaf();
    }, function (e) { MUAT = false; STAF = { galat: e.message }; if (lapisEl && TAB === 'staf') gambarStaf(); });
  }
  var DIVISI = [];
  function gambarStaf() {
    var h = '<div class="rsMode">' + [['minggu', 'Minggu ini'], ['bulan', 'Bulan ini'], ['bulanDepan', 'Bulan depan']].map(function (x) { return '<button type="button" data-rs="mode:' + x[0] + '" class="' + (F.mode === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>'
      + '<div class="rsSaring"><select id="rsDivisi" aria-label="Divisi"><option value="">Semua divisi</option>' + DIVISI.map(function (d) { return '<option' + (F.divisi === d ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') + '</select>'
      + '<input id="rsNama" type="search" placeholder="Cari nama… (Enter)" value="' + esc(F.nama) + '" autocomplete="off" class="kapital"></div>';
    if (!STAF) { lapis(h + tunggu()); return; } if (STAF.galat) { lapis(h + gagalHtml(STAF.galat)); return; }
    if (Array.isArray(STAF.divisi) && STAF.divisi.length) DIVISI = STAF.divisi;
    var T = STAF.tanggal || [], O = STAF.orang || [];
    h = h.replace(/<select id="rsDivisi"[\s\S]*?<\/select>/, '<select id="rsDivisi" aria-label="Divisi"><option value="">Semua divisi</option>' + DIVISI.map(function (d) { return '<option' + (F.divisi === d ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') + '</select>');
    h += LEG + '<div class="kecil" style="margin:0 4px 6px">' + O.length + ' orang · ' + esc(tglPendek(STAF.dari)) + ' – ' + esc(tglPendek(STAF.sampai)) + ' · geser tabel ke samping ›</div>';
    if (!O.length) h += '<div class="kartu"><div class="kecil" style="text-align:center;padding:8px">Tidak ada nama yang cocok.</div></div>';
    else {
      var lastDiv = null;
      h += '<div class="rsTblW" id="rsTblW"><table class="rsTbl"><thead><tr><th class="nm">Nama</th>' + T.map(function (t) { return '<th class="' + (t.hariIni ? 'ini' : '') + '">' + esc(t.tglN) + '<br><small>' + esc(t.hr || '') + '</small></th>'; }).join('') + '</tr></thead><tbody>'
        + O.map(function (o) {
          var dv = o.divisi !== lastDiv ? '<tr class="div"><td colspan="' + (T.length + 1) + '"><span>' + esc(o.divisi || '-') + '</span></td></tr>' : ''; lastDiv = o.divisi;
          return dv + '<tr class="' + (o.saya ? 'saya' : '') + '"><td class="nm">' + esc(o.nama) + '<small>' + esc(o.jabatan || '') + '</small></td>' + (o.sel || []).map(function (s, i) { return '<td class="' + (T[i] && T[i].hariIni ? 'ini' : '') + '" title="' + esc((s.shift || '') + (s.jam ? ' ' + s.jam : '')) + '">' + sel(s) + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
    }
    (STAF.pesan || []).forEach(function (p) { h += '<div class="kecil" style="margin:8px 4px 0">' + esc(p) + '</div>'; });
    h += eksHtml('staf');
    lapis(h);
    var w = lapisEl && lapisEl.querySelector('#rsTblW'), ini = w && w.querySelector('thead th.ini'); if (w && ini) w.scrollLeft = Math.max(0, ini.offsetLeft - 150);
  }
  function tglPendek(t) { var NB = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']; return /^\d{4}-\d{2}-\d{2}/.test(t || '') ? (+t.slice(8, 10)) + ' ' + NB[+t.slice(5, 7) - 1] : (t || ''); }
  /* ---------- ekspor ---------- */
  function eksHtml(dari) {
    if (!window.WHL_EKSPOR) return '';
    return '<div class="rsEks"><button type="button" data-rs="excel:' + dari + '">📊 Excel</button>' + (punya('pusatRosterPdf') ? '<button type="button" data-rs="pdf:' + dari + '">📄 PDF</button>' : '') + '</div>';
  }
  function excel(dari) {
    if (!window.WHL_EKSPOR) return;
    if (dari === 'saya' && SAYA && SAYA.bulan) {
      window.WHL_EKSPOR.excel('Roster ' + (SAYA.nama || 'saya') + ' - ' + tglWib(0), SAYA.bulan.map(function (b) { return [b.label || b.bulan, [['Tanggal', 'Hari', 'Kode', 'Shift', 'Jam', 'Status']].concat((b.hari || []).map(function (x) { return [x.tgl, x.hr || '', x.kode || '', x.shift || '', x.jam || '', x.status || '']; }))]; }), roti); return;
    }
    if (dari === 'staf' && STAF && STAF.orang) {
      var T = STAF.tanggal || [];
      var kepala = ['Nama', 'Jabatan', 'Divisi'].concat(T.map(function (t) { return t.tgl + ' ' + (t.hr || ''); }));
      var rows = STAF.orang.map(function (o) { return [o.nama, o.jabatan || '', o.divisi || ''].concat((o.sel || []).map(function (s) { return s.status === 'kosong' ? '' : s.status === 'full' ? 'FULL' : (s.kode || s.shift || '') + (s.jam ? ' (' + s.jam + ')' : ''); })); });
      window.WHL_EKSPOR.excel('Roster Staf WHL ' + (STAF.dari || '') + ' sd ' + (STAF.sampai || ''), [['Roster staf', [kepala].concat(rows)]], roti);
    }
  }
  function pdf(dari) {
    if (!window.WHL_EKSPOR) return; var f = dari === 'saya' ? { saya: true } : rentang(); if (dari !== 'saya') { if (F.divisi) f.divisi = F.divisi; if (F.nama) f.nama = F.nama; }
    window.WHL_EKSPOR.pdf(panggil('pusatRosterPdf', [f], 120000), 'Roster WHL', roti);
  }
  /* ---------- klik ---------- */
  function klik(ev) {
    var b = ev.target.closest('[data-rs]'); if (!b || !lapisEl || !lapisEl.contains(b)) return; var n = b.getAttribute('data-rs');
    if (n === 'tutup') { if (R.bunyi) R.bunyi('tutup'); tutup(); return; }
    if (n === 'ulang') { if (TAB === 'saya') muatSaya(); else muatStaf(); return; }
    if (n.indexOf('tab:') === 0) { TAB = n.slice(4); if (TAB === 'saya') { if (SAYA && !SAYA.galat) gambarSaya(); else muatSaya(); } else { if (STAF && !STAF.galat) gambarStaf(); else muatStaf(); } return; }
    if (n.indexOf('mode:') === 0) { F.mode = n.slice(5); if (R.getar) R.getar(); muatStaf(); return; }
    if (n.indexOf('excel:') === 0) { excel(n.slice(6)); return; }
    if (n.indexOf('pdf:') === 0) { pdf(n.slice(4)); return; }
  }
  function ganti(ev) { if (ev.target.id === 'rsDivisi') { F.divisi = ev.target.value; muatStaf(); } else if (ev.target.id === 'rsNama') { F.nama = ev.target.value.trim(); muatStaf(); } }
  function buka(ctx, tab) { CTX = ctx || CTX; if (!boleh()) { roti('Roster belum tersedia di server.'); return; } TAB = tab === 'staf' && punya('pusatRosterStaf') ? 'staf' : 'saya'; gaya(); if (TAB === 'saya') muatSaya(); else muatStaf(); }
  function kartuHtml() {
    return '<div class="kartu hdK"><div class="hdAtas"><span class="ik">' + (window.WHL_ILUS ? window.WHL_ILUS('jadwal') || window.WHL_ILUS('jam') : '') + '</span><span class="tx"><b>Roster</b><small>Jadwal kerja / OFF / cuti kamu dan seluruh staf.</small></span></div>'
      + '<ul class="hdFitur"><li>Roster saya: kalender bulan ini & bulan depan + jam shift.</li>' + (punya('pusatRosterStaf') ? '<li>Roster staf: tabel semua staf × tanggal, saring divisi / nama, Excel.</li>' : '') + '</ul>'
      + '<div class="hdTombol"><button type="button" class="tUtama" data-rs-buka="saya">Roster saya</button>' + (punya('pusatRosterStaf') ? '<button type="button" class="tKecil" data-rs-buka="staf">Roster staf</button>' : '') + '</div></div>';
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-rs-buka]'); if (!b) return; if (R.getar) R.getar(); buka(CTX, b.getAttribute('data-rs-buka')); });
  function lupakan() { SAYA = null; STAF = null; DIVISI = []; F = { mode: 'minggu', divisi: '', nama: '' }; tutup(); }
  window.WHL_ROSTER = { boleh: boleh, buka: buka, tutup: tutup, kartuHtml: kartuHtml, pasang: function (c) { CTX = c || CTX; }, lupakan: lupakan, kembali: function () { return tutup(); } };
})();
