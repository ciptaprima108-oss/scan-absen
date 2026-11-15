/* WHL App — LABA UNIT / HASIL HAULING khusus PIMPINAN (laba-pimpinan-15nov, Vanesa 15 Nov 2026).
 * Reza: pimpinan (mis. Pak Fanza) lihat Laba Unit langsung di App. Web app Laba Unit tetap "Hanya saya"; angka dihitung server DASHBOARD
 * (LabaPusat.gs = logika web app Laba Unit yang sama) dan dikirim jadi lewat api pusat:
 *   pusatLabaUnit [token, dari 'yyyy-mm-dd', sampai, armada 'SEMUA'|'TRINTIN WHL'|..., paksa] -> {ok, total, armadaSub, rute, units, memo, konfig, ...}
 * Hak: menu cuma tampil untuk peran pimpinan / penuh; server juga menolak peran lain (bukan cuma disembunyikan).
 * Layar asli app (bukan iframe), ikut tema terang/gelap (variabel CSS app). Angka tidak disimpan di HP (cuma di memori selama app terbuka).
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA || {};
  var PERAN = ['pimpinan', 'penuh'];
  var NB = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var CTX = null, lapisEl = null, H = null, galat = '', memuat = false, urutan = 0, saring = 'semua', terbuka = {}, aturBuka = false;
  var P = { dari: '', sampai: '', armada: 'SEMUA', cepat: 'bulanIni' };
  var SIMPAN = {}; // hasil per periode selama app terbuka (bukan di penyimpanan HP)

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function IK(n, c) { return window.WHL_IKON ? window.WHL_IKON(n, c) : ''; }
  function sesi() { return CTX && CTX.sesi(); }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function hariIni() { var d = new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000), p = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function akhirBulan(m) { return m + '-' + ('0' + new Date(+m.slice(0, 4), +m.slice(5, 7), 0).getDate()).slice(-2); }
  function bulanLalu(m) { var y = +m.slice(0, 4), b = +m.slice(5, 7) - 1; if (b < 1) { b = 12; y--; } return y + '-' + ('0' + b).slice(-2); }
  function tglID(t) { if (!t) return ''; return (+t.slice(8, 10)) + ' ' + NB[+t.slice(5, 7) - 1] + ' ' + t.slice(0, 4); }
  function periodeTeks(a, b) { if (a === b) return tglID(a); if (a.slice(0, 7) === b.slice(0, 7)) return (+a.slice(8)) + '–' + tglID(b); return tglID(a) + ' – ' + tglID(b); }
  function num(n, d) { return (Number(n) || 0).toLocaleString('id-ID', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function rp(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '−' : '') + 'Rp ' + Math.abs(n).toLocaleString('id-ID'); }
  function pendek(n) { n = Number(n) || 0; var a = Math.abs(n), s = n < 0 ? '−' : ''; if (a >= 1e9) return s + (a / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' M'; if (a >= 1e6) return s + (a / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt'; return s + Math.round(a).toLocaleString('id-ID'); }
  function persen(x) { return x == null || !isFinite(x) ? '–' : (x * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + '%'; }
  function namaArmada(a) { return a === 'SEMUA' ? 'Semua' : String(a).split(' ').map(function (w, i) { return i === 0 ? w.charAt(0) + w.slice(1).toLowerCase() : w; }).join(' '); }

  function serverPunya() { var X = API.Pusat; return !(X.dikenal && X.dikenal()) || X.punya('pusatLabaUnit'); }
  function boleh(S) { S = S || sesi(); return !!(S && S.user && PERAN.indexOf(S.user.peran) >= 0) && serverPunya(); }

  /* ---------- gaya (khusus layar ini, ikut variabel tema app) ---------- */
  function pasangGaya() {
    if (document.getElementById('lbuGaya')) return;
    var st = document.createElement('style'); st.id = 'lbuGaya';
    st.textContent = [
      '.lbuLapis .ksnKp .sp{flex:1}',
      '.lbuLapis .ksnKp .kb.segar{font-size:20px;opacity:.9}',
      '.lbuLapis .ksnKp .kb.segar.putar{animation:lbuPutar 1s linear infinite}',
      '@keyframes lbuPutar{to{transform:rotate(360deg)}}',
      '.lbuPer{font-size:13px;color:var(--redup);margin:0 2px 8px;line-height:1.45}',
      '.lbuPer b{color:var(--teks)}',
      '.lbuAtur{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:2px 0 12px}',
      '.lbuAtur label{font-size:12px;color:var(--redup);font-weight:700;display:block;margin-bottom:4px}',
      '.lbuAtur .isian{font-size:15px;padding:10px 12px;min-height:44px}',
      '.lbuAtur .tUtama{grid-column:1/-1;margin:0;min-height:44px}',
      '.lbuHero{position:relative;overflow:hidden}',
      '.lbuHero .jd{font-size:13px;font-weight:700;color:var(--redup)}',
      '.lbuHero .ag{font-size:34px;font-weight:900;letter-spacing:-.5px;line-height:1.1;margin:2px 0;font-variant-numeric:tabular-nums;color:var(--tHijau)}',
      '.lbuHero.minus .ag{color:var(--tMerah)}',
      '.lbuHero .pn{font-size:12.5px;color:var(--redup);font-variant-numeric:tabular-nums}',
      '.lbuHero .chip{position:absolute;top:14px;right:14px}',
      '.lbuDua{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}',
      '.lbuDua>div{background:var(--panel2);border-radius:14px;padding:10px 11px;min-width:0}',
      '.lbuDua small{display:block;font-size:12px;color:var(--redup);font-weight:700}',
      '.lbuDua b{display:block;font-size:19px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.lbuDua span{display:block;font-size:11.5px;color:var(--redup);font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.lbuBatang{display:flex;height:12px;border-radius:999px;overflow:hidden;margin:14px 0 6px;background:var(--panel2)}',
      '.lbuBatang i{display:block;height:100%}',
      '.lbuLeg{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11.5px;color:var(--redup)}',
      '.lbuLeg span{display:inline-flex;align-items:center;gap:5px}.lbuLeg i{width:9px;height:9px;border-radius:3px;display:inline-block}',
      '.lbuW1{background:#f59e0b}.lbuW2{background:#8b5cf6}.lbuW3{background:#64748b}.lbuW4{background:#1fae69}.lbuW5{background:#dc4c4c}',
      '.lbuBaris{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid var(--garis);font-size:14px}',
      '.lbuBaris:first-child{border-top:0}.lbuBaris span{color:var(--redup);min-width:0}.lbuBaris span small{display:block;font-size:11.5px}',
      '.lbuBaris b{font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right}.lbuBaris b small{display:block;font-size:11.5px;color:var(--redup);font-weight:600}',
      '.lbuBaris.tot{font-weight:800}.lbuBaris.tot span{color:var(--teks)}',
      '.lbuStat{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:12px;text-align:center}',
      '.lbuStat div{background:var(--panel2);border-radius:12px;padding:8px 4px;min-width:0}',
      '.lbuStat b{display:block;font-size:16px;font-weight:800;font-variant-numeric:tabular-nums}.lbuStat small{font-size:11px;color:var(--redup);font-weight:700}',
      '.lbuStat .merah b{color:var(--tMerah)}',
      '.lbuJudul{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:18px 4px 9px}',
      '.lbuJudul h2{font-size:12px;text-transform:uppercase;letter-spacing:1.3px;color:var(--redup);margin:0;font-weight:700}',
      '.lbuSeg{display:flex;gap:4px;background:var(--panel2);border-radius:999px;padding:3px}',
      '.lbuSeg button{font-size:12.5px;font-weight:700;padding:7px 11px;border-radius:999px;color:var(--redup);min-height:34px}',
      '.lbuSeg button.on{background:var(--panel);color:var(--teks);box-shadow:var(--bayang)}',
      '.lbuUnit{display:block;width:100%;text-align:left;background:var(--panel);border:1px solid var(--garis);border-left:4px solid var(--hijau);border-radius:14px;padding:11px 12px;margin-bottom:8px;color:var(--teks)}',
      '.lbuUnit.rugi{border-left-color:var(--merah);background:linear-gradient(90deg,rgba(220,76,76,.09),rgba(220,76,76,0) 60%),var(--panel)}',
      '.lbuUnit .at{display:flex;align-items:center;gap:10px}',
      '.lbuUnit .no{flex:none;width:26px;height:26px;border-radius:50%;background:var(--panel2);font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;color:var(--redup)}',
      '.lbuUnit .nm{flex:1;min-width:0}.lbuUnit .nm b{display:flex;align-items:center;gap:6px;font-size:15px}.lbuUnit .nm small{display:block;font-size:12px;color:var(--redup);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.lbuUnit .nm .chip{font-size:10.5px;padding:2px 7px}',
      '.lbuUnit .lb{flex:none;text-align:right;font-variant-numeric:tabular-nums}.lbuUnit .lb b{display:block;font-size:15px;color:var(--tHijau)}.lbuUnit.rugi .lb b{color:var(--tMerah)}',
      '.lbuUnit .lb small{font-size:11.5px;color:var(--redup)}',
      '.lbuRinci{margin-top:10px;padding-top:6px;border-top:1px dashed var(--garis)}',
      '.lbuRinci .lbuBaris{font-size:13px;padding:7px 0}',
      '.lbuRute{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}',
      '.lbuKaki{font-size:12px;color:var(--redup);line-height:1.55;margin:14px 4px 0}',
      '.lbuKaki b{color:var(--teks)}',
      '.lbuMuat{text-align:center;padding:30px 10px;color:var(--redup);font-size:13px}',
      '.lbuKosong{text-align:center;padding:24px 12px;color:var(--redup);font-size:13.5px}',
      '.lbuLapis .ksnIsi.redup{opacity:.55;transition:opacity .2s}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---------- lapis (layar penuh, tombol Back HP menekan .ksnKp .kb pertama = Kembali) ---------- */
  function lapis() {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      pasangGaya();
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis lbuLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik);
    }
    var gulir = lapisEl.querySelector('.ksnIsi'), y = gulir ? gulir.scrollTop : 0;
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-l="kembali" aria-label="Kembali">‹</button><div class="nm">Khusus pimpinan<b>Laba unit</b></div><span class="sp"></span>'
      + '<button type="button" class="kb segar' + (memuat ? ' putar' : '') + '" data-l="segar" aria-label="Muat ulang data">⟳</button></div>'
      + '<div class="ksnIsi' + (memuat && H ? ' redup' : '') + '">' + isi() + '</div>';
    var g2 = lapisEl.querySelector('.ksnIsi'); if (g2) g2.scrollTop = y;
  }
  function tutup() { if (!lapisEl) return; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); if (CTX && CTX.perbarui) CTX.perbarui(); }

  function setCepat(c) {
    var t = hariIni(), m = (P.dari || t).slice(0, 7);
    if (c === 'bulanIni') { P.dari = t.slice(0, 8) + '01'; P.sampai = t; }
    else if (c === 'bulanLalu') { var b = bulanLalu(t.slice(0, 7)); P.dari = b + '-01'; P.sampai = akhirBulan(b); }
    else if (c === 'a') { P.dari = m + '-01'; P.sampai = m + '-15'; }
    else if (c === 'b') { P.dari = m + '-16'; P.sampai = akhirBulan(m); }
    P.cepat = c;
  }

  function buka(ctx) {
    CTX = ctx || CTX;
    if (!boleh()) { roti('Laba unit khusus pimpinan.'); return; }
    if (!P.dari) setCepat('bulanIni');
    terbuka = {}; aturBuka = false; lapis(); muat(false);
  }
  function kunci() { return P.dari + '|' + P.sampai + '|' + P.armada; }
  function muat(paksa) {
    var k = kunci(), saya = ++urutan;
    if (!paksa && SIMPAN[k] && Date.now() - SIMPAN[k].t < 10 * 60000) { H = SIMPAN[k].h; galat = ''; memuat = false; lapis(); return; }
    memuat = true; galat = ''; lapis();
    API.Pusat.labaUnit(sesi(), P.dari, P.sampai, P.armada, !!paksa).then(function (h) {
      if (saya !== urutan) return;
      memuat = false;
      if (h && h.login === false) { galat = 'Sesi habis. Keluar lalu masuk lagi.'; H = null; }
      else if (!h || !h.ok) { galat = (h && h.pesan) || 'Data laba belum bisa diambil.'; if (h && h.tolak) H = null; }
      else { H = h; P.dari = h.dari; P.sampai = h.sampai; P.armada = h.armada; SIMPAN[kunci()] = { t: Date.now(), h: h }; if (paksa) roti('Data terbaru dimuat'); }
      if (lapisEl) lapis();
    }, function (e) {
      if (saya !== urutan) return;
      memuat = false; galat = /tidak dikenal/i.test(String(e && e.message)) ? 'Server Pusat belum dipasang fitur Laba unit.' : String((e && e.message) || 'Gagal memuat.');
      if (lapisEl) lapis();
    });
  }

  /* ---------- isi layar ---------- */
  function isi() {
    var h = '';
    var cepat = [['bulanIni', 'Bulan ini'], ['bulanLalu', 'Bulan lalu'], ['a', '1–15'], ['b', '16–akhir'], ['atur', 'Atur tanggal']];
    h += '<div class="saring" role="group" aria-label="Periode">' + cepat.map(function (c) { var on = c[0] === 'atur' ? aturBuka : (!aturBuka && P.cepat === c[0]); return '<button type="button" class="' + (on ? 'on' : '') + '" data-l="cepat:' + c[0] + '" aria-pressed="' + on + '">' + c[1] + '</button>'; }).join('') + '</div>';
    if (aturBuka) h += '<div class="lbuAtur"><div><label for="lbuDari">Dari</label><input id="lbuDari" class="isian" type="date" value="' + esc(P.dari) + '"></div>'
      + '<div><label for="lbuSampai">Sampai</label><input id="lbuSampai" class="isian" type="date" value="' + esc(P.sampai) + '"></div><button type="button" class="tUtama" data-l="terapkan">Tampilkan</button></div>';
    var arm = (H && H.armadaList) || ['TRINTIN WHL', 'TRINTIN CPS', 'TRINTIN CPS 2', 'TRONTON'];
    h += '<div class="saring" role="group" aria-label="Armada">' + ['SEMUA'].concat(arm).map(function (a) { var on = P.armada === a; return '<button type="button" class="' + (on ? 'on' : '') + '" data-l="armada:' + esc(a) + '" aria-pressed="' + on + '">' + esc(namaArmada(a)) + '</button>'; }).join('') + '</div>';
    h += '<div class="lbuPer">Periode <b>' + esc(periodeTeks(P.dari, P.sampai)) + '</b> · tanggal bongkar' + (P.armada !== 'SEMUA' ? ' · <b>' + esc(namaArmada(P.armada)) + '</b>' : '') + '</div>';

    if (galat && !H) return h + '<div class="kartu kosongKm">' + IK('alarm', 'besar') + '<b>Laba unit belum bisa dibuka</b><small>' + esc(galat) + '</small><button type="button" class="tKecil" data-l="ulang" style="margin-top:10px">Coba lagi</button></div>';
    if (!H) return h + '<div class="kartu lbuMuat"><span class="putar"></span><br>Menghitung laba unit…<br><small>Pertama kali bisa 20–40 detik (server membaca data DO & nota).</small></div>';
    if (galat) h += '<div class="pita" style="margin-bottom:10px"><span>⚠️</span><span>' + esc(galat) + ' Angka di bawah dari muatan sebelumnya.</span></div>';

    var T = H.total, minus = T.bersih < 0, om = Math.max(T.omzet, 1);
    h += '<div class="kartu lbuHero' + (minus ? ' minus' : '') + '"><div class="jd">Laba bersih</div><div class="ag">' + esc(pendek(T.bersih)) + '</div><div class="pn">' + esc(rp(T.bersih)) + '</div>'
      + '<span class="chip ' + (minus ? 'merah' : 'hijau') + '">margin ' + esc(persen(T.margin)) + '</span>'
      + '<div class="lbuDua"><div><small>Pendapatan</small><b>' + esc(pendek(T.omzet)) + '</b><span>' + esc(num(T.ton, 1)) + ' t × tarif</span></div><div><small>Biaya</small><b>' + esc(pendek(T.biaya)) + '</b><span>' + esc(persen(T.biaya / om)) + ' dari pendapatan</span></div></div>';
    if (T.omzet > 0) {
      var bag = [['lbuW1', T.borongan, 'Borongan'], ['lbuW2', T.subsidi, 'Subsidi solar'], ['lbuW3', T.potJasa + T.potPool, 'Potongan'], [minus ? 'lbuW5' : 'lbuW4', Math.abs(T.bersih), minus ? 'Rugi' : 'Laba']];
      var jml = bag.reduce(function (s, x) { return s + Math.max(0, x[1]); }, 0) || 1;
      h += '<div class="lbuBatang" role="img" aria-label="Komposisi pendapatan">' + bag.map(function (x) { return '<i class="' + x[0] + '" style="width:' + (Math.max(0, x[1]) / jml * 100).toFixed(2) + '%"></i>'; }).join('') + '</div>'
        + '<div class="lbuLeg">' + bag.map(function (x) { return '<span><i class="' + x[0] + '"></i>' + x[2] + ' ' + esc(persen(x[1] / om)) + '</span>'; }).join('') + '</div>';
    }
    h += '<div class="lbuStat"><div><b>' + num(T.unit) + '</b><small>unit</small></div><div><b>' + num(T.rit) + '</b><small>rit</small></div><div><b>' + esc(pendek(T.ton)) + '</b><small>ton</small></div><div class="' + (T.rugi ? 'merah' : '') + '"><b>' + num(T.rugi) + '</b><small>unit rugi</small></div></div></div>';

    var K = H.konfig || {};
    h += '<div class="lbuJudul"><h2>Rincian biaya</h2></div><div class="kartu">'
      + baris('Pendapatan (omzet)', rp(T.omzet), num(T.ton, 2) + ' ton bongkar × tarif per rute')
      + baris('Borongan sopir', '−' + rp(T.borongan).replace('−', ''), 'aktual DO / TRIP')
      + baris('Subsidi solar', '−' + rp(T.subsidi).replace('−', ''), num(T.solarL) + ' L standar × Rp ' + num(K.subsidiPerL || 0))
      + baris('Potongan ' + num((K.potJasa || 0) * 100) + '% ban + sparepart + jasa', '−' + rp(T.potJasa).replace('−', ''), '')
      + baris('Potongan ' + num((K.potPool || 0) * 100) + '% kas pool', '−' + rp(T.potPool).replace('−', ''), '')
      + '<div class="lbuBaris tot"><span>Laba bersih</span><b style="color:' + (minus ? 'var(--tMerah)' : 'var(--tHijau)') + '">' + esc(rp(T.bersih)) + '</b></div></div>';

    if (P.armada === 'SEMUA' && (H.armadaSub || []).length > 1) {
      h += '<div class="lbuJudul"><h2>Per armada</h2></div><div class="kartu">' + H.armadaSub.map(function (g) {
        return '<div class="lbuBaris"><span><b style="color:var(--teks)">' + esc(namaArmada(g.nama)) + '</b><small>' + num(g.unit) + ' unit · ' + num(g.rit) + ' rit' + (g.rugi ? ' · ' + g.rugi + ' rugi' : '') + '</small></span><b style="color:' + (g.bersih < 0 ? 'var(--tMerah)' : 'var(--teks)') + '">' + esc(pendek(g.bersih)) + '<small>margin ' + esc(persen(g.margin)) + '</small></b></div>';
      }).join('') + '</div>';
    }
    if ((H.rute || []).length) {
      h += '<div class="lbuJudul"><h2>Per rute</h2></div><div class="kartu">' + H.rute.map(function (z) {
        return '<div class="lbuBaris"><span><b style="color:var(--teks)">' + esc(z.rute) + '</b><small>' + num(z.rit) + ' rit · ' + num(z.ton, 1) + ' t · ' + (z.tarif ? 'Rp ' + num(z.tarif) + '/t' : 'tarif belum ada') + '</small></span><b style="color:' + (z.bersih < 0 ? 'var(--tMerah)' : 'var(--teks)') + '">' + esc(pendek(z.bersih)) + '<small>pendapatan ' + esc(pendek(z.omzet)) + '</small></b></div>';
      }).join('') + '</div>';
    }

    var U = H.units || [], rugi = U.filter(function (u) { return u.rugi; });
    h += '<div class="lbuJudul"><h2>Per unit · laba tertinggi</h2><div class="lbuSeg" role="group" aria-label="Saring unit"><button type="button" data-l="saring:semua" class="' + (saring === 'semua' ? 'on' : '') + '">Semua ' + U.length + '</button><button type="button" data-l="saring:rugi" class="' + (saring === 'rugi' ? 'on' : '') + '">Rugi ' + rugi.length + '</button></div></div>';
    var L = saring === 'rugi' ? rugi : U;
    if (!L.length) h += '<div class="kartu lbuKosong">' + (U.length ? 'Tidak ada unit rugi di periode ini.' : 'Belum ada ritase di periode ini.') + '</div>';
    h += L.map(function (u) { return kartuUnit(u, U.indexOf(u) + 1); }).join('');

    var M = H.memo || {};
    h += '<div class="lbuKaki">Data ritase sampai <b>' + esc(tglID(H.dataSampai)) + '</b>' + (P.sampai > H.dataSampai ? ' (periode melewati data terakhir)' : '') + ' · dihitung server ' + esc(String(H.diambil || '').slice(11) || '-') + ' WIB' + (H.dariCache ? ' (simpanan ≤30 menit, tekan ⟳ untuk data terbaru)' : '') + '.<br>'
      + 'Rumus sama dengan web app Laba Unit: pendapatan = ton bongkar × tarif flat per rute ('
      + Object.keys(K.tarif || {}).map(function (k) { return esc(k) + ' Rp ' + num(K.tarif[k]); }).join(', ') + '); laba = pendapatan − borongan sopir − subsidi solar − potongan ' + num((K.potJasa || 0) * 100) + '% − ' + num((K.potPool || 0) * 100) + '%.'
      + ' Info (bukan pengurang): nota jasa aktual unit jalan ' + esc(pendek(T.jasaAktual)) + ', unit tanpa ritase ' + esc(pendek(M.jasaUnitLain || 0)) + ', kas site ' + esc(pendek(M.kasSite || 0)) + '.</div>';
    return h;
  }
  function baris(a, b, k) { return '<div class="lbuBaris"><span>' + esc(a) + (k ? '<small>' + esc(k) + '</small>' : '') + '</span><b>' + esc(b) + '</b></div>'; }
  function kartuUnit(u, no) {
    var buka = !!terbuka[u.l];
    var h = '<button type="button" class="lbuUnit' + (u.rugi ? ' rugi' : '') + '" data-l="unit:' + esc(u.l) + '" aria-expanded="' + buka + '"><div class="at"><span class="no">' + no + '</span>'
      + '<span class="nm"><b>' + esc(u.l) + (u.rugi ? ' <span class="chip merah">Rugi</span>' : '') + '</b><small>' + esc(namaArmada(u.grp)) + ' · ' + num(u.rit) + ' rit · ' + num(u.ton, 1) + ' t · ' + num(u.hk) + ' hari</small></span>'
      + '<span class="lb"><b>' + esc(pendek(u.bersih)) + '</b><small>' + (u.omzet ? esc(persen(u.margin)) : 'tanpa pendapatan') + '</small></span></div>';
    if (buka) {
      h += '<div class="lbuRinci">'
        + baris('Pendapatan', rp(u.omzet), '') + baris('Borongan sopir', rp(-u.borongan), '') + baris('Subsidi solar', rp(-u.subsidi), num(u.solarL) + ' L standar')
        + baris('Potongan ban + sparepart + jasa', rp(-u.potJasa), '') + baris('Potongan kas pool', rp(-u.potPool), '')
        + '<div class="lbuBaris tot"><span>Laba bersih</span><b style="color:' + (u.rugi ? 'var(--tMerah)' : 'var(--tHijau)') + '">' + esc(rp(u.bersih)) + '</b></div>'
        + baris('Nota jasa aktual (info)', rp(u.jasaAktual), 'sudah diwakili potongan, bukan pengurang')
        + (u.nopol ? baris('Nopol', u.nopol, '') : '')
        + '<div class="lbuRute">' + (u.rute || []).map(function (r) { return '<span class="chip">' + esc(r[0]) + ' · ' + num(r[1]) + ' rit · ' + num(r[2], 1) + ' t</span>'; }).join('') + '</div></div>';
    }
    return h + '</button>';
  }

  function klik(ev) {
    var b = ev.target.closest('[data-l]'); if (!b || !lapisEl || !lapisEl.contains(b)) return;
    var n = b.getAttribute('data-l');
    if (n === 'kembali') { tutup(); return; }
    if (n === 'segar') { if (!memuat) muat(true); return; }
    if (n === 'ulang') { muat(false); return; }
    if (n.indexOf('cepat:') === 0) {
      var c = n.slice(6);
      if (c === 'atur') { aturBuka = !aturBuka; lapis(); return; }
      aturBuka = false; setCepat(c); terbuka = {}; muat(false); if (R.getar) R.getar(); return;
    }
    if (n === 'terapkan') {
      var d = (document.getElementById('lbuDari') || {}).value || '', s = (document.getElementById('lbuSampai') || {}).value || '';
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^\d{4}-\d{2}-\d{2}$/.test(s)) { roti('Isi tanggal dari & sampai dulu.'); return; }
      if (d > s) { var t = d; d = s; s = t; }
      P.dari = d; P.sampai = s; P.cepat = 'atur'; aturBuka = false; terbuka = {}; muat(false); return;
    }
    if (n.indexOf('armada:') === 0) { P.armada = n.slice(7); terbuka = {}; muat(false); if (R.getar) R.getar(); return; }
    if (n.indexOf('saring:') === 0) { saring = n.slice(7); lapis(); return; }
    if (n.indexOf('unit:') === 0) { var l = n.slice(5); terbuka[l] = !terbuka[l]; lapis(); return; }
  }
  /** untuk tombol Back HP */
  function kembali() { if (!lapisEl) return false; tutup(); return true; }
  /* keluar akun: buang angka dari memori */
  function lupakan() { SIMPAN = {}; H = null; galat = ''; P = { dari: '', sampai: '', armada: 'SEMUA', cepat: 'bulanIni' }; if (lapisEl) tutup(); }
  window.WHL_LABA = { boleh: boleh, buka: buka, kembali: kembali, lupakan: lupakan };
})();
