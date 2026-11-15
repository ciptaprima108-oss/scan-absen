/* WHL App — DOKUMEN KASBON & CICILAN (v3.15, kasbon-ttd-impor-15nov, Andro 15 Nov 2026).
 * Reza: "dokumen2nya bisa dicek dimana sama rekapannya". Untuk admin / pimpinan / Pak Fanza / Reza (hak dicek server).
 * KONTRAK (KONTRAK-APP.md, DASHBOARD api pusat):
 *   pusatKasbonDokumen [token, periode] -> {ok, periode, periodes, bolehStaf, ajuan[], rekap[], staf[] (bolehStaf), total, diambil} | {tolak:true}
 *   pusatKasbonRekapPdf [token, periode] -> {ok, nama, b64}
 *   pusatKasbonPdf [token, id] -> {ok, nama, b64}   (form / surat pernyataan + stempel verifikasi elektronik, dibuat server)
 * Excel (.xlsx) disusun di HP dari rekap[] / ajuan[] / staf[] (zip tanpa kompresi, tanpa library). Angka cuma di memori selama app terbuka.
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA || {};
  var NB = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var CTX = null, lapisEl = null, H = null, galat = '', memuat = false, urutan = 0, periode = '', tab = 'ajuan', fStatus = 'semua', fJenis = 'semua', terbuka = {}, DITOLAK = {};
  var SIMPAN = {};
  var STATUS = { 'MENUNGGU ADMIN': ['kuning', 'Menunggu admin'], 'MENUNGGU PIMPINAN': ['kuning', 'Menunggu Pak Fanza'], DISETUJUI: ['hijau', 'Disetujui'], DITOLAK: ['merah', 'Ditolak'] };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function IK(n, c) { return window.WHL_IKON ? window.WHL_IKON(n, c) : ''; }
  function sesi() { return CTX && CTX.sesi(); }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function rp(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '−' : '') + 'Rp ' + Math.abs(n).toLocaleString('id-ID'); }
  function bulan(p) { var m = String(p || '').match(/^(\d{4})-(\d{2})$/); return m ? NB[+m[2] - 1] + ' ' + m[1] : String(p || ''); }
  function bulanPendek(p) { var m = String(p || '').match(/^(\d{4})-(\d{2})$/); return m ? NB[+m[2] - 1].slice(0, 3) + ' ' + m[1].slice(2) : String(p || ''); }
  function akun(S) { return String((S && (S.idProfil || S.idKetik)) || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }

  function serverPunya() { var X = API.Pusat; return !!(X.punya && X.punya('pusatKasbonDokumen')); }
  /* server belum punya flag dokumen di pusatGajiAkses: tampil untuk peran admin/pimpinan atau yang boleh rekap karyawan (Fanza, Reza);
     kalau server menjawab tolak, menu disembunyikan untuk akun itu */
  function boleh(S) {
    S = S || sesi(); if (!S || !S.user || S.user.peran === 'driver' || !serverPunya() || DITOLAK[akun(S)]) return false;
    var A = window.WHL_GAJI && window.WHL_GAJI.akses ? window.WHL_GAJI.akses(S) : null;
    return ['admin', 'pimpinan'].indexOf(S.user.peran) >= 0 || !!(A && A.bolehStaf);
  }

  function pasangGaya() {
    if (document.getElementById('dkGaya')) return;
    var st = document.createElement('style'); st.id = 'dkGaya';
    st.textContent = [
      '.dkLapis .ksnKp .sp{flex:1}.dkLapis .ksnKp .kb.segar{font-size:20px;opacity:.9}.dkLapis .ksnKp .kb.segar.putar{animation:dkPutar 1s linear infinite}@keyframes dkPutar{to{transform:rotate(360deg)}}',
      '.dkLapis .ksnIsi.redup{opacity:.55}',
      '.dkSaringJ{font-size:11.5px;font-weight:800;color:var(--redup);text-transform:uppercase;letter-spacing:1px;margin:2px 4px 4px}',
      '.dkKartu{padding:12px 2px}.dkKartu + .dkKartu{border-top:1px solid var(--garis)}',
      '.dkAtas{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.dkAtas b{font-size:14.5px;line-height:1.3;word-break:break-word}',
      '.dkNom{font-size:18px;font-weight:900;font-variant-numeric:tabular-nums;margin:3px 0 1px}',
      '.dkKecil{font-size:12.5px;color:var(--redup);line-height:1.5}.dkKecil b{color:var(--teks)}',
      '.dkTombol{display:flex;gap:8px;margin:2px 0 12px}.dkTombol button{flex:1;margin:0;min-height:46px}',
      '.dkTot{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dkTot>div{background:var(--panel2);border-radius:14px;padding:9px 11px;min-width:0}',
      '.dkTot small{display:block;font-size:11.5px;color:var(--redup);font-weight:700}.dkTot b{display:block;font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.dkBaris{display:block;width:100%;text-align:left;background:var(--panel);border:1px solid var(--garis);border-radius:14px;padding:11px 12px;margin-bottom:8px;color:var(--teks)}',
      '.dkBaris .at{display:flex;gap:10px;align-items:flex-start}.dkBaris .nm{flex:1;min-width:0}.dkBaris .nm b{display:block;font-size:14.5px}.dkBaris .nm small{display:block;font-size:12px;color:var(--redup)}',
      '.dkBaris .jm{text-align:right;flex:none}.dkBaris .jm small{display:block;font-size:11px;color:var(--redup);font-weight:700}.dkBaris .jm b{font-size:15.5px;font-variant-numeric:tabular-nums}',
      '.dkRinci{margin-top:8px;padding-top:6px;border-top:1px dashed var(--garis);font-size:12.5px}.dkRinci div{display:flex;justify-content:space-between;gap:8px;padding:3px 0}.dkRinci span{color:var(--redup)}',
      '.dkKosong{text-align:center;padding:22px 12px;color:var(--redup);font-size:13.5px}.dkMuat{text-align:center;padding:30px 10px;color:var(--redup);font-size:13px}'
    ].join('\n');
    document.head.appendChild(st);
  }
  function lapis() {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) { pasangGaya(); lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis dkLapis'; document.body.appendChild(lapisEl); requestAnimationFrame(function () { lapisEl.classList.add('tampil'); }); lapisEl.addEventListener('click', klik); }
    var g = lapisEl.querySelector('.ksnIsi'), y = g ? g.scrollTop : 0;
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-d="kembali" aria-label="Kembali">‹</button><div class="nm">Arsip &amp; rekap<b>Dokumen kasbon &amp; cicilan</b></div><span class="sp"></span>'
      + '<button type="button" class="kb segar' + (memuat ? ' putar' : '') + '" data-d="segar" aria-label="Muat ulang">⟳</button></div><div class="ksnIsi' + (memuat && H ? ' redup' : '') + '">' + isi() + '</div>';
    var g2 = lapisEl.querySelector('.ksnIsi'); if (g2) g2.scrollTop = y;
  }
  function tutup() { if (!lapisEl) return; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); if (CTX && CTX.perbarui) CTX.perbarui(); }
  function buka(ctx) { CTX = ctx || CTX; if (!boleh()) { roti('Dokumen kasbon khusus admin / pimpinan.'); return; } terbuka = {}; lapis(); muat(false); }
  function muat(paksa) {
    var k = periode || 'KINI', saya = ++urutan;
    if (!paksa && SIMPAN[k] && Date.now() - SIMPAN[k].t < 5 * 60000) { H = SIMPAN[k].h; galat = ''; memuat = false; lapis(); return; }
    memuat = true; galat = ''; lapis();
    API.Pusat.kasbonDokumen(sesi(), periode).then(function (h) {
      if (saya !== urutan) return; memuat = false;
      if (h && h.login === false) { galat = 'Sesi habis. Keluar lalu masuk lagi.'; H = null; }
      else if (h && h.tolak) { galat = h.pesan || 'Khusus admin / pimpinan.'; H = null; DITOLAK[akun(sesi())] = true; if (CTX && CTX.perbarui) CTX.perbarui(); }
      else if (!h || !h.ok) galat = (h && h.pesan) || 'Dokumen belum bisa dimuat.';
      else { H = h; periode = h.periode; SIMPAN[periode] = SIMPAN[k] = { t: Date.now(), h: h }; }
      if (lapisEl) lapis();
    }, function (e) { if (saya !== urutan) return; memuat = false; galat = String((e && e.message) || 'Gagal memuat.'); if (lapisEl) lapis(); });
  }

  function saringAjuan() {
    return ((H && H.ajuan) || []).filter(function (a) {
      if (fStatus === 'admin' && a.status !== 'MENUNGGU ADMIN') return false;
      if (fStatus === 'pimpinan' && a.status !== 'MENUNGGU PIMPINAN') return false;
      if (fStatus === 'setuju' && a.status !== 'DISETUJUI') return false;
      if (fStatus === 'tolak' && a.status !== 'DITOLAK') return false;
      if (fJenis === 'kasbon' && a.jenis !== 'KASBON') return false;
      if (fJenis === 'hp' && a.jenis !== 'CICILAN HP') return false;
      if (fJenis === 'karyawan' && a.untuk !== 'KARYAWAN') return false;
      return true;
    });
  }
  function chip(grup, nilai, label, aktif) { var on = aktif === nilai; return '<button type="button" class="' + (on ? 'on' : '') + '" data-d="' + grup + ':' + nilai + '" aria-pressed="' + on + '">' + label + '</button>'; }
  function isi() {
    var h = '', per = (H && H.periodes) || [];
    if (per.length) h += '<div class="saring" role="group" aria-label="Bulan">' + per.slice(0, 6).map(function (p) { return chip('per', p, esc(bulanPendek(p)), H.periode); }).join('') + '</div>';
    if (galat && !H) return h + '<div class="kartu kosongKm">' + IK('alarm', 'besar') + '<b>Dokumen belum bisa dibuka</b><small>' + esc(galat) + '</small><button type="button" class="tKecil" data-d="ulang" style="margin-top:10px">Coba lagi</button></div>';
    if (!H) return h + '<div class="kartu dkMuat"><span class="putar"></span><br>Memuat dokumen & rekap…</div>';
    if (galat) h += '<div class="pitaData gagal">' + IK('alarm') + '<span>' + esc(galat) + '</span></div>';
    var A = H.ajuan || [], Rk = H.rekap || [];
    h += '<div class="segmen"><button type="button" data-d="tab:ajuan" class="' + (tab === 'ajuan' ? 'on' : '') + '">Ajuan ' + A.length + '</button><button type="button" data-d="tab:rekap" class="' + (tab === 'rekap' ? 'on' : '') + '">Rekap potongan</button></div>';
    if (tab === 'rekap') return h + rekapHtml();
    h += '<div class="dkSaringJ">Status</div><div class="saring">' + chip('st', 'semua', 'Semua', fStatus) + chip('st', 'admin', 'Menunggu admin', fStatus) + chip('st', 'pimpinan', 'Menunggu Pak Fanza', fStatus) + chip('st', 'setuju', 'Disetujui', fStatus) + chip('st', 'tolak', 'Ditolak', fStatus) + '</div>';
    h += '<div class="dkSaringJ">Jenis</div><div class="saring">' + chip('jn', 'semua', 'Semua', fJenis) + chip('jn', 'kasbon', 'Kasbon', fJenis) + chip('jn', 'hp', 'Cicilan HP', fJenis) + (H.bolehStaf ? chip('jn', 'karyawan', 'Karyawan', fJenis) : '') + '</div>';
    var L = saringAjuan();
    h += '<h2 class="bagW">' + esc(bulan(H.periode)) + ' <span>' + L.length + (L.length !== A.length ? ' dari ' + A.length : '') + '</span></h2>';
    if (!L.length) return h + '<div class="kartu dkKosong">' + (A.length ? 'Tidak ada ajuan yang cocok dengan saringan.' : 'Belum ada ajuan di bulan ini.') + '</div>';
    h += '<div class="kartu notaDaftar">' + L.map(function (a) {
      var w = STATUS[a.status] || ['abu', a.status];
      return '<div class="dkKartu"><div class="dkAtas"><b>' + (a.jenis === 'CICILAN HP' ? '📱 ' : '🧾 ') + esc(a.nama) + (a.untuk === 'KARYAWAN' ? ' <span class="gjiChip abu">karyawan</span>' : '') + '</b><em class="notaSt ' + w[0] + '">' + esc(w[1]) + '</em></div>'
        + '<div class="dkNom">' + rp(a.nominal) + '</div><div class="dkKecil">' + (a.jenis === 'CICILAN HP' ? esc(a.barang) + ' · ' + esc(a.tenor) + 'x ' + rp(a.perBulan) + (a.mulai ? ' · mulai ' + esc(bulan(a.mulai)) : '') : esc(a.alasan || '')) + '</div>'
        + '<div class="dkKecil">' + esc(a.id) + ' · ' + esc(a.waktu) + (a.lambung ? ' · ' + esc(a.lambung) : '') + '<br>Diajukan <b>' + esc(a.pengaju) + '</b>'
        + (a.accAdmin ? '<br>✓ Admin <b>' + esc(a.accAdmin) + '</b> ' + esc(a.accAdminWaktu || '') : '') + (a.accPimpinan ? '<br>✓ Pak Fanza <b>' + esc(a.accPimpinan) + '</b> ' + esc(a.accPimpinanWaktu || '') : '')
        + (a.status === 'DITOLAK' ? '<br><span style="color:var(--tMerah);font-weight:700">Ditolak: ' + esc(a.alasanTolak || '-') + '</span>' : '') + (a.idTercatat ? '<br>Tercatat <b>' + esc(a.idTercatat) + '</b>' : '') + '</div>'
        + '<button type="button" class="tKecil kbDokumen" data-d="pdf:' + esc(a.id) + '">' + IK('dokumen') + ' PDF ajuan</button></div>';
    }).join('') + '</div>';
    return h;
  }
  function rekapHtml() {
    var Rk = H.rekap || [], T = H.total || {}, h = '';
    h += '<div class="dkTombol"><button type="button" class="tUtama" data-d="rekapPdf">' + IK('dokumen') + ' PDF rekap</button><button type="button" class="tKecil" data-d="excel">⬇ Excel</button><button type="button" class="tKecil" data-d="csv">CSV</button></div>';
    h += '<div class="kartu"><div class="dkKecil" style="margin-bottom:8px">Potongan gaji driver · <b>' + esc(bulan(H.periode)) + '</b> · ' + (T.orang || 0) + ' driver</div><div class="dkTot">'
      + '<div><small>Kasbon bulan ini</small><b>' + rp(T.kasbon) + '</b></div><div><small>Terbawa bulan lalu</small><b>' + rp(T.kasbonMasuk) + '</b></div>'
      + '<div><small>Cicilan HP</small><b>' + rp(T.cicilan) + '</b></div><div><small>Total potongan</small><b>' + rp(T.potongan) + '</b></div>'
      + '<div><small>Terpotong</small><b>' + rp(T.dipotong) + '</b></div><div><small>Terbawa ke bulan depan</small><b style="color:var(--tKuning)">' + rp(T.terbawa) + '</b></div></div></div>';
    h += '<h2 class="bagW">Per driver <span>' + Rk.length + '</span></h2>';
    if (!Rk.length) h += '<div class="kartu dkKosong">Belum ada potongan di bulan ini.</div>';
    h += Rk.map(function (o) {
      var k = o.nama, b = !!terbuka[k];
      return '<button type="button" class="dkBaris" data-d="buka:' + esc(k) + '" aria-expanded="' + b + '"><div class="at"><span class="nm"><b>' + esc(o.nama) + '</b><small>' + esc(o.lambung || '-') + (o.nik ? ' · ' + esc(o.nik) : '') + '</small></span><span class="jm"><small>Potongan</small><b>' + rp(o.potongan) + '</b></span></div>'
        + (b ? '<div class="dkRinci"><div><span>Kasbon bulan ini</span><b>' + rp(o.kasbon) + '</b></div><div><span>Terbawa bulan lalu</span><b>' + rp(o.kasbonMasuk) + '</b></div><div><span>Cicilan HP</span><b>' + rp(o.cicilan) + '</b></div>'
          + '<div><span>Terpotong</span><b>' + rp(o.dipotong) + '</b></div><div><span>Terbawa ke bulan depan</span><b>' + rp(o.terbawa) + '</b></div>'
          + (o.kasbonRinci || []).map(function (x) { return '<div><span>' + esc((x.tgl || '') + ' ' + (x.jenis || '')) + '</span><b>' + rp(x.jumlah) + '</b></div>'; }).join('')
          + (o.cicilanRinci || []).map(function (c) { return '<div><span>' + esc(c.barang + ' ke-' + c.ke + '/' + c.n) + '</span><b>' + rp(c.potong) + '</b></div>'; }).join('') + '</div>' : '')
        + '</button>';
    }).join('');
    if (H.bolehStaf && (H.staf || []).length) h += '<h2 class="bagW">Cicilan karyawan <span>' + H.staf.length + '</span></h2><div class="kartu">' + H.staf.map(function (c) { return '<div class="dkKecil" style="display:flex;justify-content:space-between;gap:8px;padding:5px 0"><span><b>' + esc(c.nama) + '</b> · ' + esc(c.barang) + (c.ke ? ' ' + c.ke + '/' + c.n : '') + '</span><b>' + rp(c.potong) + '</b></div>'; }).join('') + '</div>';
    h += '<div class="dkKecil" style="margin:12px 4px 20px">Excel berisi lembar Rekap driver, Ajuan' + (H.bolehStaf ? ', dan Cicilan karyawan' : '') + '. Diambil ' + esc(H.diambil || '-') + '.</div>';
    return h;
  }

  /* ---------- berkas: PDF dari server, Excel dibuat di HP ---------- */
  function simpanBerkas(nama, b64, mime) {
    var a = window.AndroidDownloader;
    if (a && typeof a.simpanFile === 'function') { a.simpanFile(nama, b64, mime); return; }
    try {
      var bin = atob(b64), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      var url = URL.createObjectURL(new Blob([u8], { type: mime })), l = document.createElement('a');
      if (/pdf/.test(mime)) { var w = window.open(url, '_blank'); if (w) { setTimeout(function () { URL.revokeObjectURL(url); }, 120000); return; } }
      l.href = url; l.download = nama; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 120000);
    } catch (e) { roti('Berkas tidak bisa dibuka: ' + e.message); }
  }
  function ambilPdf(janji) { roti('Menyiapkan PDF…'); janji.then(function (h) { if (!h || !h.ok) { roti((h && h.pesan) || 'PDF belum bisa dibuat.'); return; } simpanBerkas(h.nama || 'dokumen.pdf', h.b64, 'application/pdf'); }, function (e) { roti(String((e && e.message) || 'Gagal mengambil PDF.')); }); }

  /* XLSX minimal: zip "stored" + CRC32, sel teks inlineStr, sel angka n. Baris pertama tebal (style 1). */
  var CRC = null;
  function crc32(u8) { if (!CRC) { CRC = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } } var x = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) x = CRC[(x ^ u8[i]) & 255] ^ (x >>> 8); return (x ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {
    var enc = new TextEncoder(), bag = [], pusat = [], ofs = 0;
    function u16(v) { return [v & 255, (v >>> 8) & 255]; } function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
    files.forEach(function (f) {
      var nm = enc.encode(f[0]), d = enc.encode(f[1]), c = crc32(d);
      var lok = [].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(c), u32(d.length), u32(d.length), u16(nm.length), u16(0));
      bag.push(new Uint8Array(lok), nm, d);
      pusat.push([].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(c), u32(d.length), u32(d.length), u16(nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(ofs)), nm);
      ofs += lok.length + nm.length + d.length;
    });
    var cdLen = 0, cd = []; pusat.forEach(function (p) { var a = Array.isArray(p) ? new Uint8Array(p) : p; cd.push(a); cdLen += a.length; });
    var akhir = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cdLen), u32(ofs), u16(0)));
    var semua = bag.concat(cd, [akhir]), tot = semua.reduce(function (s, a) { return s + a.length; }, 0), out = new Uint8Array(tot), p = 0;
    semua.forEach(function (a) { out.set(a, p); p += a.length; });
    return out;
  }
  function xmlEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
  function kolom(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function lembar(baris) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
      + baris.map(function (r, i) { return '<row r="' + (i + 1) + '">' + r.map(function (v, j) { var ref = kolom(j) + (i + 1), st = i === 0 ? ' s="1"' : ''; return typeof v === 'number' && isFinite(v) ? '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>' : '<c r="' + ref + '" t="inlineStr"' + st + '><is><t xml:space="preserve">' + xmlEsc(v) + '</t></is></c>'; }).join('') + '</row>'; }).join('')
      + '</sheetData></worksheet>';
  }
  function xlsx(sheets) {
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
      + sheets.map(function (s, i) { return '<sheet name="' + xmlEsc(s[0]) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>';
    var wbr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('')
      + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    var sty = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
      + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs>'
      + '<cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>';
    var f = [['[Content_Types].xml', ct], ['_rels/.rels', rels], ['xl/workbook.xml', wb], ['xl/_rels/workbook.xml.rels', wbr], ['xl/styles.xml', sty]];
    sheets.forEach(function (s, i) { f.push(['xl/worksheets/sheet' + (i + 1) + '.xml', lembar(s[1])]); });
    return zip(f);
  }
  function keB64(u8) { var s = '', i; for (i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function bukuExcel() {
    var Rk = (H.rekap || []).map(function (o, i) { return [i + 1, o.nama, o.nik || '', o.lambung || '', o.kasbon || 0, o.kasbonMasuk || 0, o.cicilan || 0, o.potongan || 0, o.dipotong || 0, o.terbawa || 0]; }), T = H.total || {};
    var sh = [['Rekap driver', [['No', 'Driver', 'NIK', 'Lambung', 'Kasbon bulan ini', 'Terbawa bulan lalu', 'Cicilan HP', 'Total potongan', 'Terpotong', 'Terbawa ke bulan depan']].concat(Rk, [['', 'TOTAL ' + (T.orang || Rk.length) + ' driver', '', '', T.kasbon || 0, T.kasbonMasuk || 0, T.cicilan || 0, T.potongan || 0, T.dipotong || 0, T.terbawa || 0]])],
      ['Ajuan', [['ID', 'Waktu', 'Untuk', 'Nama', 'NIK/NRP', 'Lambung', 'Jenis', 'Nominal', 'Alasan / HP', 'Tenor', 'Per bulan', 'Mulai', 'Pengaju', 'Status', 'ACC admin', 'ACC Pak Fanza', 'Alasan tolak', 'ID tercatat']].concat((H.ajuan || []).map(function (a) {
        return [a.id, a.waktu, a.untuk, a.nama, a.nik || '', a.lambung || '', a.jenis, Number(a.nominal) || 0, a.jenis === 'CICILAN HP' ? a.barang : a.alasan, a.tenor === '' ? '' : Number(a.tenor) || '', Number(a.perBulan) || '', a.mulai || '', a.pengaju, a.status,
          a.accAdmin ? a.accAdmin + ' ' + (a.accAdminWaktu || '') : '', a.accPimpinan ? a.accPimpinan + ' ' + (a.accPimpinanWaktu || '') : '', a.alasanTolak || '', a.idTercatat || ''];
      }))]];
    if (H.bolehStaf && (H.staf || []).length) sh.push(['Cicilan karyawan', [['Nama', 'NRP', 'Jabatan', 'HP', 'Harga', 'Tenor', 'Per bulan', 'Mulai', 'Ke', 'Potong bulan ini', 'Sisa utang', 'Status']].concat(H.staf.map(function (c) { return [c.nama, c.nrp, c.jabatan || '', c.barang, Number(c.harga) || 0, Number(c.tenor) || 0, Number(c.perBulan) || 0, c.mulai || '', c.ke ? c.ke + '/' + c.n : '', Number(c.potong) || 0, Number(c.sisa) || 0, c.status]; }))]);
    return xlsx(sh);
  }
  function excel() {
    try { var u8 = bukuExcel(); simpanBerkas('Rekap Kasbon & Cicilan HP - ' + bulan(H.periode) + '.xlsx', keB64(u8), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); roti('Excel disiapkan.'); }
    catch (e) { roti('Excel gagal dibuat: ' + e.message); }
  }

  /* CSV rekap driver (pemisah ; supaya Excel Indonesia langsung rapi, BOM UTF-8) */
  function teksCsv() {
    var T = H.total || {}, q = function (v) { v = v == null ? '' : String(v); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var B = [['No', 'Driver', 'NIK', 'Lambung', 'Kasbon bulan ini', 'Terbawa bulan lalu', 'Cicilan HP', 'Total potongan', 'Terpotong', 'Terbawa ke bulan depan']]
      .concat((H.rekap || []).map(function (o, i) { return [i + 1, o.nama, o.nik || '', o.lambung || '', o.kasbon || 0, o.kasbonMasuk || 0, o.cicilan || 0, o.potongan || 0, o.dipotong || 0, o.terbawa || 0]; }))
      .concat([['', 'TOTAL', '', '', T.kasbon || 0, T.kasbonMasuk || 0, T.cicilan || 0, T.potongan || 0, T.dipotong || 0, T.terbawa || 0]]);
    return '﻿' + B.map(function (r) { return r.map(q).join(';'); }).join('\r\n') + '\r\n';
  }
  function csv() {
    try { var u8 = new TextEncoder().encode(teksCsv()); simpanBerkas('Rekap Kasbon & Cicilan HP - ' + bulan(H.periode) + '.csv', keB64(u8), 'text/csv'); roti('CSV disiapkan.'); }
    catch (e) { roti('CSV gagal dibuat: ' + e.message); }
  }
  function klik(ev) {
    var b = ev.target.closest('[data-d]'); if (!b || !lapisEl || !lapisEl.contains(b)) return; var n = b.getAttribute('data-d');
    if (n === 'kembali') { tutup(); return; }
    if (n === 'segar') { if (!memuat) muat(true); return; }
    if (n === 'ulang') { muat(false); return; }
    if (n.indexOf('per:') === 0) { periode = n.slice(4); terbuka = {}; muat(false); if (R.getar) R.getar(); return; }
    if (n.indexOf('tab:') === 0) { tab = n.slice(4); lapis(); return; }
    if (n.indexOf('st:') === 0) { fStatus = n.slice(3); lapis(); return; }
    if (n.indexOf('jn:') === 0) { fJenis = n.slice(3); lapis(); return; }
    if (n.indexOf('buka:') === 0) { var k = n.slice(5); terbuka[k] = !terbuka[k]; lapis(); return; }
    if (n.indexOf('pdf:') === 0) { ambilPdf(API.Pusat.kasbonPdf(sesi(), n.slice(4))); return; }
    if (n === 'rekapPdf') { ambilPdf(API.Pusat.kasbonRekapPdf(sesi(), H ? H.periode : '')); return; }
    if (n === 'excel') { if (H) excel(); return; }
    if (n === 'csv') { if (H) csv(); return; }
  }
  function kembali() { if (!lapisEl) return false; tutup(); return true; }
  function lupakan() { SIMPAN = {}; H = null; galat = ''; periode = ''; tab = 'ajuan'; fStatus = 'semua'; fJenis = 'semua'; if (lapisEl) tutup(); }
  window.WHL_DOKKAS = { boleh: boleh, buka: buka, kembali: kembali, lupakan: lupakan, _uji: { xlsx: function () { return H ? keB64(bukuExcel()) : ''; }, csv: function () { return H ? teksCsv() : ''; } } };
})();
