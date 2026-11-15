/* WHL App — GAJI DRIVER (gaji-driver-app-15nov, Andro 15 Nov 2026).
 * Reza: admin / pimpinan / penuh / pengawas cek kira-kira gaji driver masih berapa setelah dipotong kasbon & cicilan HP.
 * Angka dihitung server DASHBOARD (GajiPusat.gs = rumus Gaji Input DO yang sama), lewat api pusat (kontrak KONTRAK-APP.md Dodi):
 *   pusatGajiDriver [token, periode 'yyyy-MM' | '', paksa]  -> {ok, periode, periodes, total, driver[], unit[], staf[] (bolehStaf), terbawaSiap, terbawaMulai, tutupBuku, diambil, dariCache}
 *   pusatKasbonPdf [token, id]        -> {ok, nama, b64}   (surat pernyataan cicilan karyawan, dari tab Cicilan karyawan)
 *   pusatCicilanStafPdf [token, per]  -> {ok, nama, b64}   (rekap potongan cicilan HP karyawan untuk HRD)
 * Hak: menu tampil kalau peran admin/pimpinan/penuh/pengawas DAN pusatPing memuat pusatGajiDriver; server juga menolak peran lain.
 * Angka TIDAK disimpan di HP (cuma di memori selama app terbuka, dibuang saat keluar akun).
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA || {};
  var PERAN = ['admin', 'pimpinan', 'penuh', 'pengawas'];
  var NB = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var CTX = null, lapisEl = null, H = null, galat = '', memuat = false, urutan = 0, tab = 'driver', cari = '', periode = '', terbuka = {};
  var SIMPAN = {}; // hasil per periode selama app terbuka (bukan di penyimpanan HP)

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function IK(n, c) { return window.WHL_IKON ? window.WHL_IKON(n, c) : ''; }
  function sesi() { return CTX && CTX.sesi(); }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function num(n, d) { return (Number(n) || 0).toLocaleString('id-ID', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function rp(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '−' : '') + 'Rp ' + Math.abs(n).toLocaleString('id-ID'); }
  function bulan(p) { var m = String(p || '').match(/^(\d{4})-(\d{2})$/); return m ? NB[+m[2] - 1] + ' ' + m[1] : String(p || ''); }
  function bulanPendek(p) { var m = String(p || '').match(/^(\d{4})-(\d{2})$/); return m ? NB[+m[2] - 1].slice(0, 3) + ' ' + m[1].slice(2) : String(p || ''); }
  function norm(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

  function serverPunya() { var X = API.Pusat; return !!(X.punya && X.punya('pusatGajiDriver')); }
  /* v3.14 akses-gaji-15nov: hak dari server lewat pusatGajiAkses (ringan) -> {bolehGaji, bolehStaf, bolehAcc, bolehAjuDriver, bolehAjuDiri}.
     Server lama (belum punya pusatGajiAkses) = perilaku 3.13 (peran admin/pimpinan/penuh/pengawas). */
  var AKSES = null; // { akun, h }
  function aksesBaru() { var X = API.Pusat; return !!(X.punya && X.punya('pusatGajiAkses')); }
  function akunDari(S) { return String((S && (S.idProfil || S.idKetik)) || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  /** flag hak akun ini (null = belum terbaca / server lama) */
  function akses(S) { S = S || sesi(); return AKSES && S && AKSES.akun === akunDari(S) ? AKSES.h : null; }
  function muatAkses(ctx) {
    CTX = ctx || CTX; var S = sesi(); if (!S || !S.user || !aksesBaru()) return Promise.resolve(null);
    var akun = akunDari(S), kunci = 'whlGajiAkses_' + akun, Simpan = API.Simpan;
    var dariHp = AKSES && AKSES.akun === akun ? Promise.resolve() : Simpan.ambil(kunci).then(function (v) { try { var c = JSON.parse(v || 'null'); if (c && typeof c === 'object' && !AKSES) AKSES = { akun: akun, h: c }; } catch (e) { /* */ } });
    return dariHp.then(function () {
      return API.Pusat.gajiAkses(S).then(function (h) {
        if (h && h.ok) { var a = { bolehGaji: !!h.bolehGaji, bolehStaf: !!h.bolehStaf, bolehAcc: !!h.bolehAcc, bolehAjuDriver: !!h.bolehAjuDriver, bolehAjuDiri: h.bolehAjuDiri !== false }; AKSES = { akun: akun, h: a }; Simpan.taruh(kunci, JSON.stringify(a)); }
        return akses(S);
      }, function () { return akses(S); });
    });
  }
  function boleh(S) {
    S = S || sesi(); if (!S || !S.user || S.user.peran === 'driver' || !serverPunya()) return false;
    if (aksesBaru()) { var A = akses(S); return !!(A && (A.bolehGaji || A.bolehStaf)); }
    return PERAN.indexOf(S.user.peran) >= 0;
  }
  /** judul menu: "Cicilan karyawan" kalau cuma boleh rekap karyawan */
  function judul(S) { var A = aksesBaru() ? akses(S) : null; return A && !A.bolehGaji && A.bolehStaf ? 'Cicilan karyawan' : 'Gaji driver'; }
  function gajiOk() { var A = aksesBaru() ? akses() : null; if (H && H.bolehGaji === false) return false; if (A && !A.bolehGaji) return false; return true; }
  function stafOk() { var A = aksesBaru() ? akses() : null; if (H) return !!H.bolehStaf; return !!(A && A.bolehStaf); }

  /* sisa gaji tampil tidak minus; merah kalau habis karena potongan (atau gaji rit sendiri minus) */
  function sisaTampil(o) { return Math.max(0, Number(o.bersih) || 0); }
  function habis(o) { var b = Number(o.bersih) || 0; return b < 0 || (b <= 0 && (Number(o.dipotong) || 0) > 0); }

  /* ---------- gaya (ikut variabel tema app) ---------- */
  function pasangGaya() {
    if (document.getElementById('gjiGaya')) return;
    var st = document.createElement('style'); st.id = 'gjiGaya';
    st.textContent = [
      '.gjiLapis .ksnKp .sp{flex:1}',
      '.gjiLapis .ksnKp .kb.segar{font-size:20px;opacity:.9}',
      '.gjiLapis .ksnKp .kb.segar.putar{animation:gjiPutar 1s linear infinite}',
      '@keyframes gjiPutar{to{transform:rotate(360deg)}}',
      '.gjiLapis .ksnIsi.redup{opacity:.55;transition:opacity .2s}',
      '.gjiTab{grid-template-columns:repeat(var(--n,2),1fr)}',
      '.gjiCari{position:relative;margin:0 0 10px}.gjiCari input{padding-left:38px}.gjiCari .ikn{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:18px;height:18px;opacity:.6}',
      '.gjiHero .jd{font-size:13px;font-weight:700;color:var(--redup)}',
      '.gjiHero .ag{font-size:30px;font-weight:900;letter-spacing:-.5px;line-height:1.15;margin:2px 0 4px;font-variant-numeric:tabular-nums}',
      '.gjiHero .pn{font-size:12.5px;color:var(--redup)}',
      '.gjiEmpat{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}',
      '.gjiEmpat>div{background:var(--panel2);border-radius:14px;padding:9px 11px;min-width:0}',
      '.gjiEmpat small{display:block;font-size:11.5px;color:var(--redup);font-weight:700}',
      '.gjiEmpat b{display:block;font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.gjiEmpat .merah b{color:var(--tMerah)}',
      '.gjiKartu{display:block;width:100%;text-align:left;background:var(--panel);border:1px solid var(--garis);border-left:4px solid var(--utama,#1565C0);border-radius:14px;padding:11px 12px;margin-bottom:8px;color:var(--teks)}',
      '.gjiKartu.habis{border-left-color:var(--merah);background:linear-gradient(90deg,rgba(220,76,76,.09),rgba(220,76,76,0) 60%),var(--panel)}',
      '.gjiKartu .at{display:flex;align-items:flex-start;gap:10px}',
      '.gjiKartu .nm{flex:1;min-width:0}.gjiKartu .nm b{display:block;font-size:14.5px;line-height:1.3;word-break:break-word}',
      '.gjiKartu .nm small{display:block;font-size:12px;color:var(--redup);margin-top:2px}',
      '.gjiKartu .ss{flex:none;text-align:right;font-variant-numeric:tabular-nums}.gjiKartu .ss small{display:block;font-size:11px;color:var(--redup);font-weight:700}',
      '.gjiKartu .ss b{display:block;font-size:16px;color:var(--tHijau)}.gjiKartu.habis .ss b{color:var(--tMerah)}',
      '.gjiMini{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:9px}',
      '.gjiMini div{background:var(--panel2);border-radius:10px;padding:6px 7px;min-width:0}',
      '.gjiMini small{display:block;font-size:10.5px;color:var(--redup);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.gjiMini b{display:block;font-size:12.5px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.gjiTerbawa{margin-top:8px;font-size:12px;font-weight:700;color:var(--tKuning);display:flex;gap:6px;align-items:center}',
      '.gjiRinci{margin-top:10px;padding-top:4px;border-top:1px dashed var(--garis)}',
      '.gjiBaris{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid var(--garis);font-size:13px}',
      '.gjiBaris:first-child{border-top:0}.gjiBaris span{color:var(--redup);min-width:0}.gjiBaris span small{display:block;font-size:11px}',
      '.gjiBaris b{font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right}',
      '.gjiBaris.tot{font-weight:800}.gjiBaris.tot span{color:var(--teks)}',
      '.gjiSub{font-size:11.5px;font-weight:800;color:var(--redup);text-transform:uppercase;letter-spacing:1px;margin:10px 0 2px}',
      '.gjiChip{display:inline-block;font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:99px;margin-left:5px;vertical-align:1px}',
      '.gjiChip.merah{background:#fde2e2;color:#c62828}.gjiChip.kuning{background:#fdf3e1;color:#9a5b00}.gjiChip.abu{background:var(--panel2);color:var(--redup)}',
      'html[data-tema="gelap"] .gjiChip.merah{background:#3a1620;color:#fca5a5}html[data-tema="gelap"] .gjiChip.kuning{background:#3a2a10;color:#fcd34d}',
      '.gjiKaki{font-size:12px;color:var(--redup);line-height:1.55;margin:14px 4px 0}',
      '.gjiMuat{text-align:center;padding:30px 10px;color:var(--redup);font-size:13px}',
      '.gjiKosong{text-align:center;padding:22px 12px;color:var(--redup);font-size:13.5px}',
      '.gjiJumlah{font-size:12px;color:var(--redup);margin:0 4px 8px}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---------- lapis ---------- */
  function lapis() {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      pasangGaya();
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis gjiLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik);
      lapisEl.addEventListener('input', function (ev) { if (ev.target && ev.target.id === 'gjiCari') { cari = ev.target.value; var d = document.getElementById('gjiDaftar'); if (d) d.innerHTML = daftarHtml(); } });
    }
    var gulir = lapisEl.querySelector('.ksnIsi'), y = gulir ? gulir.scrollTop : 0;
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-g="kembali" aria-label="Kembali">‹</button><div class="nm">' + (gajiOk() ? 'Perkiraan<b>Gaji driver' : 'Rekap HRD<b>Cicilan karyawan') + '</b></div><span class="sp"></span>'
      + '<button type="button" class="kb segar' + (memuat ? ' putar' : '') + '" data-g="segar" aria-label="Hitung ulang">⟳</button></div>'
      + '<div class="ksnIsi' + (memuat && H ? ' redup' : '') + '">' + isi() + '</div>';
    var g2 = lapisEl.querySelector('.ksnIsi'); if (g2) g2.scrollTop = y;
  }
  function tutup() { if (!lapisEl) return; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); if (CTX && CTX.perbarui) CTX.perbarui(); }

  function buka(ctx) {
    CTX = ctx || CTX;
    if (!boleh()) { roti('Gaji driver khusus admin, pengawas, dan orang yang ditunjuk.'); return; }
    if (!gajiOk()) tab = 'staf'; else if (tab === 'staf' && !stafOk()) tab = 'driver';
    terbuka = {}; lapis(); muat(false);
  }
  function muat(paksa) {
    var k = periode || 'KINI', saya = ++urutan;
    if (!paksa && SIMPAN[k] && Date.now() - SIMPAN[k].t < 10 * 60000) { H = SIMPAN[k].h; galat = ''; memuat = false; lapis(); return; }
    memuat = true; galat = ''; lapis();
    API.Pusat.gajiDriver(sesi(), periode, !!paksa).then(function (h) {
      if (saya !== urutan) return;
      memuat = false;
      if (h && h.login === false) { galat = 'Sesi habis. Keluar lalu masuk lagi.'; H = null; }
      else if (!h || !h.ok) { galat = (h && h.pesan) || 'Data gaji belum bisa diambil.'; if (h && h.tolak) H = null; }
      else { H = h; periode = h.periode; SIMPAN[periode] = SIMPAN[k] = { t: Date.now(), h: h }; if (tab === 'staf' && !h.bolehStaf) tab = 'driver'; if (h.bolehGaji === false) tab = 'staf'; if (paksa) roti(h.dariCache ? 'Baru saja dihitung, ini data terakhir' : 'Data terbaru dimuat'); }
      if (lapisEl) lapis();
    }, function (e) {
      if (saya !== urutan) return;
      memuat = false; galat = /tidak dikenal/i.test(String(e && e.message)) ? 'Server Pusat belum dipasang fitur Gaji driver.' : String((e && e.message) || 'Gagal memuat.');
      if (lapisEl) lapis();
    });
  }

  /* ---------- isi ---------- */
  function isi() {
    var h = '';
    var per = (H && H.periodes) || [];
    if (per.length) h += '<div class="saring" role="group" aria-label="Periode">' + per.slice(0, 6).map(function (p) { var on = p === (H && H.periode); return '<button type="button" class="' + (on ? 'on' : '') + '" data-g="per:' + esc(p) + '" aria-pressed="' + on + '">' + esc(bulanPendek(p)) + '</button>'; }).join('') + '</div>';
    if (galat && !H) return h + '<div class="kartu kosongKm">' + IK('alarm', 'besar') + '<b>Gaji driver belum bisa dibuka</b><small>' + esc(galat) + '</small><button type="button" class="tKecil" data-g="ulang" style="margin-top:10px">Coba lagi</button></div>';
    if (!H) return h + '<div class="kartu gjiMuat"><span class="putar"></span><br>' + (gajiOk() ? 'Menghitung gaji driver…' : 'Memuat cicilan karyawan…') + '<br><small>Pertama kali bisa 20–40 detik (server membaca DO, kasbon, cicilan).</small></div>';
    if (galat) h += '<div class="pitaData gagal">' + IK('alarm') + '<span>' + esc(galat) + ' Angka di bawah dari muatan sebelumnya.</span></div>';
    if (H.tutupBuku) h += '<div class="pitaData">' + IK('centang') + '<span>Gaji ' + esc(bulan(H.periode)) + ' sudah tutup buku.</span></div>';
    if (!H.terbawaSiap && H.terbawaMulai && H.periode > H.terbawaMulai) h += '<div class="pitaData gagal">' + IK('alarm') + '<span>Bulan lalu belum tutup buku: sisa kasbon terbawa belum ikut dihitung.</span></div>';

    if (!gajiOk()) { /* v3.14: cuma hak rekap cicilan karyawan (tanpa angka gaji driver) */
      h += '<button type="button" class="tKecil" data-g="rekapStaf" style="width:100%;margin:0 0 10px">' + IK('dokumen') + ' Rekap PDF untuk HRD · ' + esc(bulan(H.periode)) + '</button>';
      return h + '<div id="gjiDaftar">' + stafHtml() + '</div><div class="gjiKaki">Rekap potongan cicilan HP karyawan untuk HRD. Gaji karyawan tidak dihitung sistem.</div>';
    }
    var T = H.total || {}, DL = H.driver || [];
    /* jumlah sisa = jumlah sisa tampil per driver (tidak minus), "habis" = sisa Rp 0 karena potongan atau gaji rit minus */
    var sisaTot = DL.length ? DL.reduce(function (s, o) { return s + sisaTampil(o); }, 0) : Math.max(0, T.bersih), nHabis = DL.length ? DL.filter(habis).length : T.minus;
    h += '<div class="kartu gjiHero"><div class="jd">Perkiraan sisa gaji · ' + esc(bulan(H.periode)) + '</div><div class="ag">' + esc(rp(sisaTot)) + '</div>'
      + '<div class="pn">' + num(T.driver) + ' driver · ' + num(T.rit) + ' rit' + (T.tunggu ? ' · ' + num(T.tunggu) + ' rit belum lapor DO' : '') + '</div>'
      + '<div class="gjiEmpat"><div><small>Gaji kotor</small><b>' + esc(rp(T.gajiKotor)) + '</b></div><div><small>Dipotong</small><b>' + esc(rp(T.dipotong)) + '</b></div>'
      + '<div><small>Cicilan HP</small><b>' + esc(rp(T.potCicilan)) + '</b></div><div><small>Kasbon</small><b>' + esc(rp(T.potKasbon)) + '</b></div>'
      + (T.terbawa ? '<div><small>Kasbon terbawa</small><b style="color:var(--tKuning)">' + esc(rp(T.terbawa)) + '</b></div>' : '')
      + (nHabis ? '<div class="merah"><small>Sisa gaji Rp 0</small><b>' + num(nHabis) + ' driver</b></div>' : '') + '</div></div>';

    var tabs = [['driver', 'Per driver'], ['unit', 'Per unit']]; if (stafOk()) tabs.push(['staf', 'Cicilan karyawan']);
    h += '<div class="segmen gjiTab" style="--n:' + tabs.length + '">' + tabs.map(function (t) { return '<button type="button" data-g="tab:' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (tab !== 'staf') h += '<div class="gjiCari">' + IK('cari') + '<input id="gjiCari" class="isian" type="search" autocomplete="off" placeholder="Cari nama driver / lambung" value="' + esc(cari) + '"></div>';
    else h += '<button type="button" class="tKecil" data-g="rekapStaf" style="width:100%;margin:0 0 10px">' + IK('dokumen') + ' Rekap PDF untuk HRD</button>';
    h += '<div id="gjiDaftar">' + daftarHtml() + '</div>';
    h += '<div class="gjiKaki">Angka perkiraan dari server (rumus sama dengan Gaji di Input DO). Sisa gaji tidak dibuat minus: potongan yang tidak muat dibawa ke bulan depan sebagai <b>sisa kasbon terbawa</b>. '
      + 'Dihitung ' + esc(String(H.diambil || '-')) + ' WIB' + (H.dariCache ? ' (simpanan ≤10 menit, tekan ⟳ untuk hitung ulang)' : '') + '.</div>';
    return h;
  }
  function cocok(o) { var q = norm(cari); if (!q) return true; return norm(o.driver).indexOf(q) >= 0 || norm(o.lambung).indexOf(q) >= 0 || (o.lambungList || []).some(function (l) { return norm(l).indexOf(q) >= 0; }) || (o.driverList || []).some(function (n) { return norm(n).indexOf(q) >= 0; }); }
  function daftarHtml() {
    if (!H) return '';
    if (tab === 'staf') return stafHtml();
    if (tab === 'unit') {
      var U = (H.unit || []).map(function (u) { return Object.assign({ driverList: u.driver }, u); }).filter(cocok);
      if (!U.length) return '<div class="kartu gjiKosong">' + (cari ? 'Tidak ada unit yang cocok.' : 'Belum ada data unit di periode ini.') + '</div>';
      return '<div class="gjiJumlah">' + U.length + ' unit</div>' + U.map(kartuUnit).join('');
    }
    var D = (H.driver || []).slice().sort(function (a, b) { return String(a.driver).localeCompare(String(b.driver)); }).filter(cocok);
    if (!D.length) return '<div class="kartu gjiKosong">' + (cari ? 'Tidak ada driver yang cocok.' : 'Belum ada ritase di periode ini.') + '</div>';
    return '<div class="gjiJumlah">' + D.length + ' driver' + (cari ? ' cocok' : '') + '</div>' + D.map(kartuDriver).join('');
  }
  function baris(a, b, k, gaya) { return '<div class="gjiBaris"><span>' + esc(a) + (k ? '<small>' + esc(k) + '</small>' : '') + '</span><b' + (gaya ? ' style="' + gaya + '"' : '') + '>' + esc(b) + '</b></div>'; }
  function kartuDriver(o) {
    var kunci = 'd:' + o.driver, buka = !!terbuka[kunci], hb = habis(o), potKas = (Number(o.potKasbon) || 0) + (Number(o.kasbonMasuk) || 0);
    var h = '<button type="button" class="gjiKartu' + (hb ? ' habis' : '') + '" data-g="buka:' + esc(kunci) + '" aria-expanded="' + buka + '"><div class="at">'
      + '<span class="nm"><b>' + esc(o.driver) + (hb ? '<span class="gjiChip merah">' + (o.bersih < 0 ? 'Minus' : 'Habis dipotong') + '</span>' : '') + '</b><small>' + esc(o.lambung || 'tanpa lambung') + ' · ' + num(o.rit) + ' rit · ' + num(o.ton, 2) + ' t' + (o.tunggu ? ' · ' + num(o.tunggu) + ' belum lapor' : '') + '</small></span>'
      + '<span class="ss"><small>Sisa gaji</small><b>' + esc(rp(sisaTampil(o))) + '</b></span></div>'
      + '<div class="gjiMini"><div><small>Gaji kotor</small><b>' + esc(rp(o.gajiKotor)) + '</b></div><div><small>Cicilan HP</small><b>' + esc(rp(o.potCicilan)) + '</b></div><div><small>Kasbon</small><b>' + esc(rp(potKas)) + '</b></div></div>'
      + (o.terbawa > 0 ? '<div class="gjiTerbawa">↪ Sisa kasbon terbawa ke bulan depan ' + esc(rp(o.terbawa)) + '</div>' : '');
    if (buka) {
      h += '<div class="gjiRinci">'
        + baris('Gaji rit', rp(o.gajiRit), num(o.rit) + ' rit · borongan ' + rp(o.borongan))
        + (o.returRp ? baris('Retur solar', rp(o.returRp)) : '') + (o.potVcr ? baris('Voucher solar', rp(-o.potVcr)) : '') + (o.bonus ? baris('Bonus', rp(o.bonus)) : '')
        + baris('Gaji kotor', rp(o.gajiKotor), 'sebelum cicilan & kasbon', 'color:var(--teks)')
        + baris('Cicilan HP', rp(-o.potCicilan))
        + baris('Kasbon bulan ini', rp(-o.potKasbon), (o.bayar ? 'sudah dikurangi bayar ' + rp(o.bayar) : ''))
        + (o.kasbonMasuk ? baris('Sisa kasbon bulan lalu', rp(-o.kasbonMasuk)) : '')
        + baris('Total potongan', rp(-o.potongan)) + (o.potongan !== o.dipotong ? baris('Yang bisa dipotong', rp(-o.dipotong), 'dibatasi sampai gaji Rp 0') : '')
        + '<div class="gjiBaris tot"><span>Sisa gaji (perkiraan)</span><b style="color:' + (hb ? 'var(--tMerah)' : 'var(--tHijau)') + '">' + esc(rp(sisaTampil(o))) + '</b></div>'
        + (o.bersih < 0 ? baris('Catatan', 'gaji rit minus ' + rp(o.bersih), '', 'color:var(--tMerah)') : '')
        + (o.terbawa > 0 ? baris('Terbawa ke bulan depan', rp(o.terbawa), '', 'color:var(--tKuning)') : '');
      if ((o.cicilanRinci || []).length) h += '<div class="gjiSub">Cicilan HP</div>' + o.cicilanRinci.map(function (c) { return baris(c.barang + (c.lunasCepat ? ' (lunas cepat)' : ''), rp(c.potong), 'ke-' + c.ke + ' dari ' + c.n + ' · sisa ' + rp(c.sisa)); }).join('');
      if ((o.kasbonRinci || []).length) h += '<div class="gjiSub">Kasbon & bayar</div>' + o.kasbonRinci.map(function (k) { return baris((k.jenis === 'BAYAR' ? 'Bayar · ' : '') + (k.tgl || ''), rp(k.jenis === 'BAYAR' ? -k.jumlah : k.jumlah), k.ket || ''); }).join('');
      if ((o.lambungList || []).length > 1) h += baris('Lambung', o.lambungList.join(', '));
      if (o.nik) h += baris('NIK / kartu', o.nik);
      h += '</div>';
    }
    return h + '</button>';
  }
  function kartuUnit(u) {
    var kunci = 'u:' + u.lambung, buka = !!terbuka[kunci], hb = (u.minus || 0) > 0 || (u.bersih <= 0 && u.dipotong > 0);
    var h = '<button type="button" class="gjiKartu' + (hb ? ' habis' : '') + '" data-g="buka:' + esc(kunci) + '" aria-expanded="' + buka + '"><div class="at">'
      + '<span class="nm"><b>' + esc(u.lambung) + (u.minus ? '<span class="gjiChip merah">' + u.minus + ' minus</span>' : '') + '</b><small>' + (u.driver || []).length + ' driver · ' + num(u.rit) + ' rit · ' + num(u.ton, 2) + ' t</small></span>'
      + '<span class="ss"><small>Sisa gaji</small><b>' + esc(rp(Math.max(0, u.bersih))) + '</b></span></div>'
      + '<div class="gjiMini"><div><small>Gaji kotor</small><b>' + esc(rp(u.gajiKotor)) + '</b></div><div><small>Cicilan HP</small><b>' + esc(rp(u.potCicilan)) + '</b></div><div><small>Kasbon</small><b>' + esc(rp(u.potKasbon)) + '</b></div></div>'
      + (u.terbawa > 0 ? '<div class="gjiTerbawa">↪ Sisa kasbon terbawa ' + esc(rp(u.terbawa)) + '</div>' : '');
    if (buka) {
      var D = (H.driver || []).filter(function (o) { return (u.driver || []).indexOf(o.driver) >= 0; });
      h += '<div class="gjiRinci"><div class="gjiSub">Driver di unit ini</div>' + D.map(function (o) { return baris(o.driver, rp(sisaTampil(o)), num(o.rit) + ' rit · kotor ' + rp(o.gajiKotor) + (o.terbawa > 0 ? ' · terbawa ' + rp(o.terbawa) : ''), habis(o) ? 'color:var(--tMerah)' : ''); }).join('') + '</div>';
    }
    return h + '</button>';
  }
  function stafHtml() {
    var L = H.staf || [];
    if (!L.length) return '<div class="kartu gjiKosong">Belum ada cicilan HP karyawan di ' + esc(bulan(H.periode)) + '.</div>';
    var tot = L.reduce(function (s, c) { return s + (Number(c.potong) || 0); }, 0);
    return '<div class="gjiJumlah">' + L.length + ' karyawan · potong bulan ini ' + esc(rp(tot)) + '</div>' + L.map(function (c) {
      var tunggu = /MENUNGGU/.test(c.status);
      return '<div class="gjiKartu"><div class="at"><span class="nm"><b>' + esc(c.nama) + '<span class="gjiChip ' + (tunggu ? 'kuning' : 'abu') + '">' + esc(c.status) + '</span></b><small>' + esc(c.nrp || '') + (c.jabatan ? ' · ' + esc(c.jabatan) : '') + '</small></span>'
        + '<span class="ss"><small>Potong</small><b style="color:var(--teks)">' + esc(rp(c.potong)) + '</b></span></div>'
        + '<div class="gjiMini"><div><small>HP</small><b>' + esc(c.barang) + '</b></div><div><small>Cicilan ke</small><b>' + (c.ke ? c.ke + ' / ' + c.n : '–') + '</b></div><div><small>Sisa utang</small><b>' + esc(rp(c.sisa)) + '</b></div></div>'
        + (c.ajuan ? '<button type="button" class="tKecil" data-g="surat:' + esc(c.ajuan) + '" style="margin-top:8px;min-height:38px">' + IK('dokumen') + ' Surat pernyataan</button>' : '') + '</div>';
    }).join('');
  }

  /* ---------- PDF (base64 dari server) ---------- */
  function bukaPdf(nama, b64) {
    var a = window.AndroidDownloader;
    if (a && typeof a.simpanFile === 'function') { a.simpanFile(nama, b64, 'application/pdf'); return; }
    try {
      var bin = atob(b64), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      var url = URL.createObjectURL(new Blob([u8], { type: 'application/pdf' })), w = window.open(url, '_blank');
      if (!w) { var l = document.createElement('a'); l.href = url; l.download = nama; document.body.appendChild(l); l.click(); l.remove(); }
      setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
    } catch (e) { roti('PDF tidak bisa dibuka: ' + e.message); }
  }
  function ambilPdf(janji) {
    roti('Menyiapkan PDF…');
    janji.then(function (h) { if (!h || !h.ok) { roti((h && h.pesan) || 'PDF belum bisa dibuat.'); return; } bukaPdf(h.nama || 'dokumen.pdf', h.b64); }, function (e) { roti(String((e && e.message) || 'Gagal mengambil PDF.')); });
  }

  function klik(ev) {
    var b = ev.target.closest('[data-g]'); if (!b || !lapisEl || !lapisEl.contains(b)) return;
    var n = b.getAttribute('data-g');
    if (n === 'kembali') { tutup(); return; }
    if (n === 'segar') { if (!memuat) muat(true); return; }
    if (n === 'ulang') { muat(false); return; }
    if (n.indexOf('per:') === 0) { periode = n.slice(4); terbuka = {}; muat(false); if (R.getar) R.getar(); return; }
    if (n.indexOf('tab:') === 0) { tab = n.slice(4); terbuka = {}; lapis(); if (R.getar) R.getar(); return; }
    if (n.indexOf('buka:') === 0) { var k = n.slice(5); terbuka[k] = !terbuka[k]; lapis(); return; }
    if (n === 'rekapStaf') { ambilPdf(API.Pusat.cicilanStafPdf(sesi(), H ? H.periode : '')); return; }
    if (n.indexOf('surat:') === 0) { ambilPdf(API.Pusat.kasbonPdf(sesi(), n.slice(6))); return; }
  }
  function kembali() { if (!lapisEl) return false; tutup(); return true; }
  function lupakan() { SIMPAN = {}; H = null; galat = ''; periode = ''; cari = ''; tab = 'driver'; AKSES = null; if (lapisEl) tutup(); }
  window.WHL_GAJI = { boleh: boleh, buka: buka, kembali: kembali, lupakan: lupakan, bukaPdf: bukaPdf, judul: judul, akses: function (S) { return aksesBaru() ? akses(S) : null; }, muatAkses: muatAkses };
})();
