/* WHL App — CETAK ID CARD dari Data karyawan (app-cetak-idcard-27nov, Armand 27 Nov 2026). WHL_IDCETAK.
 * Pak Fanza: "di Data Karyawan di app tambahkan fitur cetak ID card, bisa pilih dan mirror".
 *   1. PILIH   : centang orang (cari, Staf / Driver, "belum ada foto", pilih semua hasil saring).
 *   2. CETAK   : pratinjau lembar + pilihan sisi (depan+belakang / depan saja / belakang saja) + MIRROR + tanpa foto (siluet / lewati) -> PDF A4.
 * Kartu & PDF dirakit DI PERANGKAT INI (canvas + penulis PDF kecil di bawah). Tidak ada layanan luar: QR dari lib/qr-whl.js yang ikut app.
 * Desain & ukuran = kartu resmi yang sudah beredar (IDCardWHL\buat_idcard_8nov.py + cetak_27nov.py):
 *   kartu 820x1296 px, template img/idcard-cetak-depan.png (dasar kartu ANDRI, bingkai berisi siluet) & idcard-cetak-belakang.png (dasar kartu MACIS)
 *   = dasar yang sama dengan skrip, dibuat alat/buat-template.py; bingkai foto (220,312) 376x468, nama y848 (Arial tebal 44, mengecil 2
 *   sampai <= 600), pita jabatan 892-952 (tebal 30, jarak huruf 4), NIK KARYAWAN y985, ID y1030 (Consolas tebal 50); belakang QR 484 px di
 *   (168,256) tingkat koreksi M, ID y817 (58), nama y880 (38, mengecil sampai <= 700), jabatan y918 (32). Tanpa foto = siluet kartu resmi (sudah ada di template).
 *   PDF: A4 landscape, kartu CR80 54 x 85,6 mm, jarak 10 x 8 mm, tanda potong; tata letak 4 per lembar (bawaan), 8 per lembar (= skrip), atau 1 sisi; halaman belakang kolomnya dicerminkan
 *   (balik di sisi panjang); MIRROR = seluruh halaman dicerminkan kiri-kanan (sama dengan pdf8(..., mirror=True)); keterangan kaki tidak ikut dicerminkan.
 * Server: DASHBOARD PusatIdCard.gs lewat api pusat: pusatIdCard [token, 'status' | 'daftar' | 'foto', {ids}] (baca saja; hak diperiksa server).
 * Data: nama / jabatan / ID dari server (tidak bisa diketik). Foto & kartu hanya di memori selama layar terbuka; dibuang saat ditutup / Keluar.
 *       Yang disimpan di HP cuma pilihan cetak (tata letak, sisi, mirror, tanpa foto) di localStorage "whlIdCetak".
 */
(function () {
  'use strict';
  var API = window.WHL_API;
  var KW = 820, KH = 1296, BOX = [220, 312, 376, 468], NAVY = '#0b1a33', KUNING = '#f5b400';
  var SANS = 'Arial, "Liberation Sans", "Helvetica Neue", Helvetica, Roboto, sans-serif', MONO = 'Consolas, "Roboto Mono", "DejaVu Sans Mono", Menlo, "Courier New", monospace';
  var MM = 72 / 25.4, PW = 297 * MM, PH = 210 * MM, CW = 54 * MM, CH = 85.6 * MM, GX = 10 * MM, GY = 8 * MM;
  /* TATA LETAK (Pak Fanza 27 Nov: "1 lembar 4 ID card, depan depan, belakang belakang"). Ukuran kartu selalu 54 x 85,6 mm, jarak 10 x 8 mm, di tengah A4 mendatar.
     '4'     = 2 x 2 kartu per lembar (BAWAAN): halaman depan 4 sisi depan, halaman belakang 4 sisi belakang (kolom dicerminkan untuk bolak-balik).
     '8'     = 4 x 2 kartu per lembar (tata letak skrip pdf8).
     'lipat' = cetak 1 sisi, 2 orang per lembar: baris atas depan, baris bawah belakang tepat di bawah depannya (gunting lalu tempel punggung). */
  var TATA = { '4': { kol: 2, brs: 2, per: 4 }, '8': { kol: 4, brs: 2, per: 8 }, lipat: { kol: 2, brs: 2, per: 2 } };
  function tata(t) { return TATA[t] || TATA['4']; }
  var FOTO_SEKALI = 6, MAKS_KARTU_APK = 16; /* APK: PDF dikirim ke Android sebagai teks base64 -> dipecah per 16 kartu (2 lembar) supaya tidak terlalu besar */
  var CTX = null, el = null, langkah = 'pilih', D = null, memuat = false, galat = '', urut = 0;
  var F = { cari: '', jenis: 'SEMUA', tanpa: false }, PILIH = {};
  var OPSI = { tata: '4', sisi: 'dua', mirror: true, tanpa: 'siluet' };
  var FOTO = {}, FGAGAL = {}, KARTU = {}, PROSES = null, SIAP = false, kerja = 0, TPL = {}, HRD = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { return CTX && CTX.sesi ? CTX.sesi() : null; }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function panggil(aksi, data, ms) { var S = sesi(); return API.Pusat.panggil('pusatIdCard', [S && S.tokenPusat, aksi, data || null], ms || 60000); }
  function inisial(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase(); }
  function bacaOpsi() { try { var o = JSON.parse(localStorage.getItem('whlIdCetak') || 'null'); if (o) { if (TATA[o.tata]) OPSI.tata = o.tata; if (/^(dua|depan|belakang)$/.test(o.sisi)) OPSI.sisi = o.sisi; if (typeof o.mirror === 'boolean') OPSI.mirror = o.mirror; if (/^(siluet|lewati)$/.test(o.tanpa)) OPSI.tanpa = o.tanpa; } } catch (e) { /* bawaan */ } }
  function simpanOpsi() { try { localStorage.setItem('whlIdCetak', JSON.stringify(OPSI)); } catch (e) { /* tidak apa */ } }

  /* ---------- hak (server tetap memeriksa) ---------- */
  function adaPintu() { var X = API && API.Pusat; return !!(X && X.punya && X.punya('pusatIdCard')); }
  function boleh(S) { return adaPintu() && !!(window.WHL_KARYAWAN && window.WHL_KARYAWAN.boleh(S || sesi())); }
  /** Peran HRD: tanya server sekali (saklar picSaklarHrd). Balas Promise<boolean>. */
  function cekHrd(ctx) {
    CTX = ctx || CTX;
    if (!adaPintu()) return Promise.resolve(false);
    if (HRD !== null) return Promise.resolve(HRD);
    return panggil('status', null, 30000).then(function (h) { HRD = !!(h && h.ok && h.boleh); return HRD; }, function () { return false; });
  }

  /* =====================================================================================================
   * KARTU (canvas) — posisi & ukuran sama dengan skrip kartu resmi
   * ===================================================================================================== */
  function muatGambar(src) { return new Promise(function (ok, gagal) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { gagal(new Error('Gambar tidak bisa dibaca.')); }; im.src = src; }); }
  function tpl(n) { return TPL[n] || (TPL[n] = muatGambar('img/idcard-cetak-' + n + '.png').catch(function (e) { delete TPL[n]; throw e; })); }
  function kanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function lebarJarak(x, t, j) { var l = 0; for (var i = 0; i < t.length; i++) l += x.measureText(t.charAt(i)).width; return l + j * Math.max(0, t.length - 1); }
  function tulisJarak(x, cx, cy, t, j) { var p = cx - lebarJarak(x, t, j) / 2; x.textAlign = 'left'; for (var i = 0; i < t.length; i++) { x.fillText(t.charAt(i), p, cy); p += x.measureText(t.charAt(i)).width + j; } }
  function pil(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  /* Tinggi tulisan: skrip memakai jangkar tengah PIL (tengah antara ascender & descender, dibulatkan seperti FreeType). Kanvas memakai garis dasar
     huruf + selisih yang dihitung dari metrik Arial (0,905 / 0,212) dan Consolas (0,7427 / 0,2573) supaya tinggi tulisan sama dengan kartu resmi. */
  function dasar(cy, u, mono) { return cy + (Math.ceil((mono ? 0.7427 : 0.905) * u) - Math.ceil((mono ? 0.2573 : 0.212) * u)) / 2; }
  function urlProfil(id) { var K = window.WHL_KONFIG || {}; return (K.INPUTDO || '') + '?mode=profil&id=' + encodeURIComponent(id); }
  /** o = {id, qr, jenis, kartu, nama, jabatan}; foto = HTMLImageElement | null (null = siluet). Balas Promise<{depan, belakang}> kanvas 820x1296. */
  function rakit(o, foto) {
    var id = String(o.id || '').toUpperCase(), nama = String(o.nama || '-').toUpperCase().trim(), jab = String(o.jabatan || '-').toUpperCase().trim(), driver = o.jenis === 'DRIVER';
    return Promise.all([tpl('depan'), tpl('belakang')]).then(function (T) {
      var c = kanvas(KW, KH), x = c.getContext('2d'), u;
      x.fillStyle = '#fff'; x.fillRect(0, 0, KW, KH); x.drawImage(T[0], 0, 0, KW, KH);
      x.imageSmoothingQuality = 'high';
      if (foto) { /* pasang_foto: penuh lebar & rata atas; foto lebih pendek dari bingkai = potong kiri-kanan */
        var w = foto.naturalWidth || foto.width, h = foto.naturalHeight || foto.height, ch = Math.round(w * BOX[3] / BOX[2]);
        if (ch <= h) x.drawImage(foto, 0, 0, w, ch, BOX[0], BOX[1], BOX[2], BOX[3]);
        else { var cw = Math.round(h * BOX[2] / BOX[3]); x.drawImage(foto, Math.floor((w - cw) / 2), 0, cw, h, BOX[0], BOX[1], BOX[2], BOX[3]); }
      } /* tanpa foto: siluet sudah ada di template (sama dengan kartu resmi tanpa foto) */
      x.textBaseline = 'alphabetic'; x.textAlign = 'center'; x.fillStyle = NAVY;
      u = 44; x.font = 'bold ' + u + 'px ' + SANS; while (x.measureText(nama).width > 600 && u > 16) { u -= 2; x.font = 'bold ' + u + 'px ' + SANS; }
      x.fillText(nama, 410, dasar(848, u));
      u = 30; x.font = 'bold ' + u + 'px ' + SANS; while (lebarJarak(x, jab, 4) + 90 > 760 && u > 14) { u -= 1; x.font = 'bold ' + u + 'px ' + SANS; }
      var pw = Math.max(300, lebarJarak(x, jab, 4) + 90);
      x.fillStyle = KUNING; pil(x, 410 - pw / 2, 892, pw, 60, 30); x.fill();
      x.fillStyle = NAVY; tulisJarak(x, 410, dasar(922, u), jab, 4);
      x.fillStyle = 'rgb(100,116,139)'; x.font = 'bold 22px ' + SANS; tulisJarak(x, 410, dasar(985, 22), 'NIK KARYAWAN', 5);
      x.fillStyle = NAVY; u = 50; x.font = 'bold ' + u + 'px ' + MONO; while (lebarJarak(x, id, 2) > 700 && u > 20) { u -= 2; x.font = 'bold ' + u + 'px ' + MONO; }
      tulisJarak(x, 410, dasar(1030, u, true), id, 2);

      var b = kanvas(KW, KH), y = b.getContext('2d');
      y.fillStyle = '#fff'; y.fillRect(0, 0, KW, KH); y.drawImage(T[1], 0, 0, KW, KH);
      if (!(window.WHL_QR && window.WHL_QR.matriks)) throw new Error('Pustaka QR tidak termuat.');
      var m = window.WHL_QR.matriks(urlProfil(o.qr || id), 'M'), n = m.n; y.fillStyle = '#fff'; y.fillRect(168, 256, 484, 484); y.fillStyle = '#000';
      for (var r = 0; r < n; r++) for (var s = 0; s < n; s++) if (m.data[r * n + s]) { var ax = Math.floor(s * 484 / n), ay = Math.floor(r * 484 / n); y.fillRect(168 + ax, 256 + ay, Math.floor((s + 1) * 484 / n) - ax, Math.floor((r + 1) * 484 / n) - ay); }
      y.textBaseline = 'alphabetic';
      y.fillStyle = 'rgb(255,211,107)'; u = 58; y.font = 'bold ' + u + 'px ' + MONO; while (lebarJarak(y, id, 3) > 720 && u > 20) { u -= 2; y.font = 'bold ' + u + 'px ' + MONO; }
      tulisJarak(y, 410, dasar(817, u, true), id, 3);
      y.textAlign = 'center'; y.fillStyle = '#fff'; u = 38; y.font = 'bold ' + u + 'px ' + SANS; while (y.measureText(nama).width > 700 && u > 14) { u -= 1; y.font = 'bold ' + u + 'px ' + SANS; }
      y.fillText(nama, 410, dasar(880, u));
      var bawah = driver && o.kartu && o.kartu !== id ? jab + '  ·  ' + o.kartu : jab; /* kartu driver: JABATAN · ID kartu (buat_idcard_driver_14nov.py) */
      y.fillStyle = 'rgb(200,214,235)'; u = driver && o.kartu && o.kartu !== id ? 30 : 32; y.font = u + 'px ' + SANS; while (y.measureText(bawah).width > 720 && u > 14) { u -= 1; y.font = u + 'px ' + SANS; }
      y.fillText(bawah, 410, dasar(918, u));
      return { depan: c, belakang: b };
    });
  }
  function keJpeg(c) {
    return new Promise(function (ok, gagal) {
      var selesai = function (u8) { ok(u8); };
      if (c.toBlob) c.toBlob(function (bl) { if (!bl) { gagal(new Error('Kartu gagal dibuat.')); return; } var fr = new FileReader(); fr.onload = function () { selesai(new Uint8Array(fr.result)); }; fr.onerror = function () { gagal(new Error('Kartu gagal dibaca.')); }; fr.readAsArrayBuffer(bl); }, 'image/jpeg', 0.93);
      else { try { var b = atob(c.toDataURL('image/jpeg', 0.93).split(',')[1]), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); selesai(u); } catch (e) { gagal(e); } }
    });
  }

  /* =====================================================================================================
   * PDF — penulis kecil: halaman A4 landscape, gambar JPEG (DCTDecode), tanda potong, 1 baris keterangan (Helvetica)
   * ===================================================================================================== */
  function posisi(i, belakang, t) {
    var T = tata(t), lipat = T === TATA.lipat, r = lipat ? (belakang ? 1 : 0) : Math.floor(i / T.kol), k = lipat ? i : i % T.kol;
    if (belakang && !lipat) k = T.kol - 1 - k;
    var x0 = (PW - (T.kol * CW + (T.kol - 1) * GX)) / 2, y0 = (PH - (T.brs * CH + (T.brs - 1) * GY)) / 2;
    return { x: x0 + k * (CW + GX), y: PH - y0 - (r + 1) * CH - r * GY, k: k, r: r };
  }
  function daftarHalaman(n, sisi, t) {
    var T = tata(t), H = [], s = T === TATA.lipat ? ['LIPAT'] : sisi === 'depan' ? ['DEPAN'] : sisi === 'belakang' ? ['BELAKANG'] : ['DEPAN', 'BELAKANG'];
    for (var a = 0; a < n; a += T.per) s.forEach(function (x) { H.push({ awal: a, akhir: Math.min(n, a + T.per), sisi: x, lembar: a / T.per + 1 }); });
    return H;
  }
  /** kartu yang digambar di 1 halaman: [{i (urutan dalam lembar), bk (sisi belakang?)}] */
  function isiHalaman(h) { var L = [], n = h.akhir - h.awal, i; if (h.sisi === 'LIPAT') { for (i = 0; i < n; i++) L.push({ i: i, bk: false }); for (i = 0; i < n; i++) L.push({ i: i, bk: true }); } else for (i = 0; i < n; i++) L.push({ i: i, bk: h.sisi === 'BELAKANG' }); return L; }
  function ketHalaman(h, ids, mirror, tgl, t) { return 'ID Card WHL ' + tgl + ' - ' + (tata(t) === TATA.lipat ? '1 sisi' : tata(t).per + ' per lembar') + ' - Lembar ' + h.lembar + ' - ' + (h.sisi === 'LIPAT' ? 'DEPAN (atas) + BELAKANG (bawah), cetak 1 sisi' : h.sisi === 'DEPAN' ? 'DEPAN' : 'BELAKANG (dicerminkan, balik di sisi panjang)') + (mirror ? ' - MIRROR' : '') + ' - ' + ids.join(', ') + ' - skala 100%'; }
  function tglIni() { var d = new Date(Date.now() + 7 * 3600000); return d.toISOString().slice(0, 10); }
  /** L = [{id, depan:Uint8Array, belakang:Uint8Array}], opsi {tata, sisi, mirror, tgl}. Balas Uint8Array PDF. */
  function buatPdf(L, opsi) {
    var f = function (v) { return (Math.round(v * 1000) / 1000).toString(); }, enc = function (s) { var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; };
    var teksPdf = function (s) { return String(s).replace(/[^\x20-\x7e]/g, '?').replace(/([\\()])/g, '\\$1'); };
    var objek = [null, null, null], tgl = opsi.tgl || tglIni(); /* 1 katalog, 2 daftar halaman, 3 huruf */
    var tambah = function (kepala, isi) { objek.push({ kepala: kepala, isi: isi || null }); return objek.length; };
    var gbr = {}, pakai = function (id, sisi, u8) { var k = id + '|' + sisi; if (!gbr[k]) gbr[k] = tambah('<< /Type /XObject /Subtype /Image /Width ' + KW + ' /Height ' + KH + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + u8.length + ' >>', u8); return gbr[k]; };
    var hal = [];
    daftarHalaman(L.length, opsi.sisi, opsi.tata).forEach(function (h) {
      var grup = L.slice(h.awal, h.akhir), s = 'q\n', res = '';
      if (opsi.mirror) s += '-1 0 0 1 ' + f(PW) + ' 0 cm\n';
      isiHalaman(h).forEach(function (it) {
        var k = grup[it.i], bk = it.bk, p = posisi(it.i, bk, opsi.tata), no = pakai(k.id, bk ? 'B' : 'D', bk ? k.belakang : k.depan), x = p.x, y = p.y, Lm = 4 * MM, d1 = 1 * MM;
        res += '/Im' + no + ' ' + no + ' 0 R ';
        s += 'q ' + f(CW) + ' 0 0 ' + f(CH) + ' ' + f(x) + ' ' + f(y) + ' cm /Im' + no + ' Do Q\n0.6 0.6 0.6 RG 0.3 w\n';
        [[x, y, -1, -1], [x + CW, y, 1, -1], [x, y + CH, -1, 1], [x + CW, y + CH, 1, 1]].forEach(function (t) {
          s += f(t[0] + t[2] * d1) + ' ' + f(t[1]) + ' m ' + f(t[0] + t[2] * Lm) + ' ' + f(t[1]) + ' l S\n' + f(t[0]) + ' ' + f(t[1] + t[3] * d1) + ' m ' + f(t[0]) + ' ' + f(t[1] + t[3] * Lm) + ' l S\n';
        });
      });
      s += 'Q\nBT /F1 7 Tf 0.4 0.4 0.4 rg ' + f(10 * MM) + ' ' + f(5 * MM) + ' Td (' + teksPdf(ketHalaman(h, grup.map(function (k) { return k.id; }), opsi.mirror, tgl, opsi.tata)) + ') Tj ET\n';
      var isi = enc(s), noIsi = tambah('<< /Length ' + isi.length + ' >>', isi);
      hal.push(tambah('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + f(PW) + ' ' + f(PH) + '] /Resources << /XObject << ' + res + '>> /Font << /F1 3 0 R >> >> /Contents ' + noIsi + ' 0 R >>'));
    });
    var info = tambah('<< /Title (' + teksPdf('ID Card WHL ' + tgl + (opsi.mirror ? ' (MIRROR)' : '')) + ') /Producer (WHL App) >>');
    objek[0] = { kepala: '<< /Type /Catalog /Pages 2 0 R >>' };
    objek[1] = { kepala: '<< /Type /Pages /Count ' + hal.length + ' /Kids [' + hal.map(function (n) { return n + ' 0 R'; }).join(' ') + '] >>' };
    objek[2] = { kepala: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>' };
    var bag = [], pjg = 0, ofs = [], dorong = function (u) { bag.push(u); pjg += u.length; };
    dorong(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10])); /* %PDF-1.4 + tanda biner */
    objek.forEach(function (o, i) {
      ofs.push(pjg); dorong(enc((i + 1) + ' 0 obj\n' + o.kepala + '\n'));
      if (o.isi) { dorong(enc('stream\n')); dorong(o.isi); dorong(enc('\nendstream\n')); }
      dorong(enc('endobj\n'));
    });
    var xref = pjg, t = 'xref\n0 ' + (objek.length + 1) + '\n0000000000 65535 f \n';
    ofs.forEach(function (o) { t += ('0000000000' + o).slice(-10) + ' 00000 n \n'; });
    t += 'trailer\n<< /Size ' + (objek.length + 1) + ' /Root 1 0 R /Info ' + info + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
    dorong(enc(t));
    var out = new Uint8Array(pjg), p = 0; bag.forEach(function (u) { out.set(u, p); p += u.length; });
    return out;
  }
  function keB64(u8) { var s = '', i; for (i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }

  /* =====================================================================================================
   * LAYAR
   * ===================================================================================================== */
  function pasangGaya() {
    if (document.getElementById('ctkGaya')) return;
    var st = document.createElement('style'); st.id = 'ctkGaya';
    st.textContent = [
      '.ctkLapis{z-index:8}.ctkLapis .ksnKp .sp{flex:1}.ctkLapis.lebar .ksnIsi{max-width:980px}',
      '.ctkCari input{width:100%;box-sizing:border-box;font-size:16px;min-height:46px;padding:11px 14px;border-radius:14px;margin:2px 0 8px}',
      '.ctkSeg{display:flex;gap:4px;background:var(--panel2);border-radius:999px;padding:3px;margin-bottom:8px}.ctkSeg button{flex:1;font-size:13px;font-weight:800;padding:8px 6px;border-radius:999px;color:var(--redup);min-height:38px}',
      '.ctkSeg button.on{background:var(--panel);color:var(--teks);box-shadow:var(--bayang)}',
      '.ctkTata{display:grid;gap:7px}.ctkTata button{display:block;width:100%;text-align:left;padding:10px 12px;border-radius:12px;border:1px solid var(--garis);background:var(--panel2);color:var(--teks);min-height:52px}.ctkTata button b{display:block;font-size:14.5px}.ctkTata button small{display:block;font-size:12px;color:var(--redup);font-weight:600;margin-top:2px}.ctkTata button.on{border-color:var(--utama);box-shadow:0 0 0 2px var(--utama) inset;background:var(--panel)}',
      '.ctkChips{display:flex;gap:6px;flex-wrap:wrap;padding:2px 0 10px}.ctkChip{font-size:12.5px;font-weight:700;padding:8px 12px;border-radius:999px;border:1px solid var(--garis);color:var(--redup);background:var(--panel);min-height:38px}',
      '.ctkChip.on{background:var(--utama);border-color:var(--utama);color:#fff}.ctkChip.krg.on{background:#b45309;border-color:#b45309}',
      '.ctkJml{font-size:12.5px;color:var(--redup);margin:0 2px 8px}',
      '.ctkBr{display:flex;align-items:center;gap:11px;width:100%;text-align:left;padding:9px 11px;margin-bottom:7px;border-radius:14px;background:var(--panel);border:1px solid var(--garis);color:var(--teks);min-height:58px}',
      '.ctkBr.on{border-color:var(--utama);box-shadow:0 0 0 2px var(--utama) inset}',
      '.ctkBr .ck{flex:none;width:26px;height:26px;border-radius:8px;border:2px solid var(--samar);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:900;color:transparent}',
      '.ctkBr.on .ck{background:var(--utama);border-color:var(--utama);color:#fff}',
      '.ctkBr .av{flex:none;width:40px;height:40px;border-radius:10px;overflow:hidden;background:var(--panel2);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:var(--samar)}.ctkBr .av img{width:100%;height:100%;object-fit:cover}',
      '.ctkBr .tx{flex:1;min-width:0}.ctkBr .tx b{display:block;font-size:14.5px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ctkBr .tx small{display:block;font-size:12px;color:var(--redup);font-weight:600;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.ctkCp{flex:none;font-size:10.5px;font-weight:800;padding:3px 8px;border-radius:999px;background:#f59e0b;color:#1a1a1a}.ctkCp.drv{background:rgba(124,58,237,.9);color:#fff}',
      '.ctkKosong{text-align:center;color:var(--redup);padding:36px 12px;font-size:14px;line-height:1.5}',
      '.ctkBawah{position:sticky;bottom:0;display:flex;align-items:center;gap:10px;padding:10px 0 calc(8px + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(0,0,0,0),var(--bg) 32%);margin-top:6px}',
      '.ctkBawah .jm{flex:1;font-size:13.5px;font-weight:800}.ctkBawah .jm small{display:block;font-weight:600;color:var(--redup);font-size:12px}.ctkBawah .tUtama{margin:0;min-height:50px;padding:0 18px;width:auto;flex:none}',
      '.ctkKotak{background:var(--panel);border:1px solid var(--garis);border-radius:16px;padding:12px 14px;margin-bottom:10px;box-shadow:var(--bayang)}.ctkKotak h3{margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:var(--redup)}',
      '.ctkKotak .ket{font-size:12.5px;color:var(--redup);line-height:1.5;margin-top:8px}',
      '.ctkSak{display:flex;align-items:center;gap:12px;width:100%;text-align:left;color:var(--teks);min-height:48px}.ctkSak .tx{flex:1;font-size:14.5px;font-weight:800}.ctkSak .tx small{display:block;font-size:12px;font-weight:600;color:var(--redup);margin-top:2px;line-height:1.4}',
      '.ctkSak .tg{flex:none;width:50px;height:30px;border-radius:999px;background:var(--samar);position:relative;transition:background .15s}.ctkSak .tg i{position:absolute;left:3px;top:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:left .15s}',
      '.ctkSak.on .tg{background:#1fae69}.ctkSak.on .tg i{left:23px}',
      '.ctkAwas{background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.45);border-radius:14px;padding:10px 12px;font-size:13px;line-height:1.5;margin-bottom:10px}.ctkAwas b{display:block;margin-bottom:2px}.ctkAwas.mrh{background:rgba(220,76,76,.10);border-color:rgba(220,76,76,.4)}',
      '.ctkProg{display:flex;align-items:center;gap:10px;font-size:13.5px;font-weight:700;padding:14px 4px}.ctkProg .bar{flex:1;height:8px;border-radius:8px;background:var(--panel2);overflow:hidden}.ctkProg .bar i{display:block;height:100%;background:var(--utama)}',
      '.ctkHal{margin:0 0 14px}.ctkHal .jd{font-size:12px;font-weight:800;color:var(--redup);margin:0 2px 5px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}.ctkHal .jd i{font-style:normal;background:var(--panel2);border-radius:999px;padding:2px 8px}.ctkHal .jd i.mr{background:#7c3aed;color:#fff}',
      '.ctkKertas{position:relative;width:100%;aspect-ratio:297/210;background:#fff;border-radius:6px;box-shadow:0 2px 12px rgba(0,0,0,.28);overflow:hidden}.ctkKertas .dlm{position:absolute;inset:0}.ctkKertas.mirror .dlm{transform:scaleX(-1)}',
      '.ctkKertas img{position:absolute;display:block}',
      '.ctkAksi{display:grid;grid-template-columns:1fr;gap:8px;margin:4px 0 10px}.ctkAksi button{min-height:52px;margin:0;font-size:15.5px;border-radius:14px}',
      '.ctkBtn2{border-radius:14px;font-weight:800;font-size:14.5px;background:var(--panel2);color:var(--teks);border:1px solid var(--garis);min-height:48px;padding:0 12px}',
      '@media (min-width:700px){.ctkAksi{grid-template-columns:1fr 1fr}}'
    ].join('');
    document.head.appendChild(st);
  }
  function terpilih() { return D ? D.orang.filter(function (o) { return PILIH[o.id]; }) : []; }
  function dicetak() { var L = terpilih(); return OPSI.tanpa === 'lewati' ? L.filter(function (o) { return !!FOTO[o.id]; }) : L; }
  function cocok(o) {
    if (F.jenis !== 'SEMUA' && o.jenis !== F.jenis) return false;
    if (F.tanpa && o.foto) return false;
    var q = F.cari.trim().toUpperCase(); if (!q) return true;
    return [o.nama, o.id, o.kartu, o.jabatan, o.divisi, o.lambung].join(' ').toUpperCase().indexOf(q) >= 0;
  }
  function gambar() {
    if (el && !document.body.contains(el)) el = null;
    if (!el) {
      pasangGaya();
      el = document.createElement('div'); el.className = 'lapis ksnLapis ctkLapis'; document.body.appendChild(el);
      requestAnimationFrame(function () { if (el) el.classList.add('tampil'); });
      el.addEventListener('click', klik); el.addEventListener('input', ketik);
    }
    el.classList.toggle('lebar', langkah === 'cetak');
    var gl = el.querySelector('.ksnIsi'), y = gl && el.getAttribute('data-langkah') === langkah ? gl.scrollTop : 0;
    var aktif = document.activeElement && document.activeElement.id === 'ctkCari', pos = aktif ? document.activeElement.selectionStart : 0;
    el.setAttribute('data-langkah', langkah);
    el.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-c="kembali" aria-label="Kembali">‹</button><div class="nm">' + (langkah === 'pilih' ? 'Data karyawan' : 'Cetak ID card') + '<b>' + (langkah === 'pilih' ? 'Cetak ID card' : 'Pratinjau &amp; PDF') + '</b></div><span class="sp"></span>'
      + (langkah === 'pilih' ? '<button type="button" class="kb" data-c="segar" aria-label="Muat ulang">⟳</button>' : '') + '</div><div class="ksnIsi">' + (langkah === 'pilih' ? isiPilih() : isiCetak()) + '</div>';
    var g2 = el.querySelector('.ksnIsi'); if (g2) g2.scrollTop = y;
    if (aktif) { var ci = el.querySelector('#ctkCari'); if (ci) { ci.focus(); try { ci.setSelectionRange(pos, pos); } catch (e) { /* */ } } }
  }
  function baris(o) {
    var on = !!PILIH[o.id];
    return '<button type="button" class="ctkBr' + (on ? ' on' : '') + '" data-c="pilih:' + esc(o.id) + '" role="checkbox" aria-checked="' + on + '"><span class="ck">✓</span>'
      + '<span class="av">' + (o.mini && /^data:image\//.test(o.mini) ? '<img src="' + esc(o.mini) + '" alt="" loading="lazy">' : esc(inisial(o.nama))) + '</span>'
      + '<span class="tx"><b>' + esc(o.nama) + '</b><small>' + esc(o.id + ' · ' + (o.jabatan || '-') + (o.lambung ? ' · ' + o.lambung : '')) + '</small></span>'
      + (o.jenis === 'DRIVER' ? '<span class="ctkCp drv">DRIVER</span>' : '') + (o.foto ? '' : '<span class="ctkCp">tanpa foto</span>') + '</button>';
  }
  function htmlDaftar() {
    var L = D.orang.filter(cocok), nP = L.filter(function (o) { return PILIH[o.id]; }).length;
    return '<div class="ctkChips"><button type="button" class="ctkChip" data-c="semua"' + (L.length ? '' : ' disabled') + '>☑ Pilih semua hasil saring (' + L.length + ')</button>'
      + '<button type="button" class="ctkChip" data-c="kosong"' + (Object.keys(PILIH).length ? '' : ' disabled') + '>Kosongkan pilihan</button></div>'
      + '<div class="ctkJml">' + L.length + ' orang tampil' + (nP ? ' · ' + nP + ' di antaranya dipilih' : '') + '</div>'
      + (L.length ? L.map(baris).join('') : '<div class="ctkKosong">Tidak ada yang cocok.</div>');
  }
  function htmlBawah() {
    var n = terpilih().length, tf = terpilih().filter(function (o) { return !o.foto; }).length;
    return '<div class="jm">' + n + ' orang dipilih<small>' + (n ? Math.ceil(n / tata(OPSI.tata).per) + ' lembar A4' + (tf ? ' · ' + tf + ' tanpa foto' : '') : 'Centang orangnya dulu') + '</small></div>'
      + '<button type="button" class="tUtama" data-c="lanjut"' + (n ? '' : ' disabled') + '>Pratinjau ›</button>';
  }
  function isiPilih() {
    if (!D) return memuat ? '<div class="ctkKosong"><span class="putar"></span> Memuat daftar karyawan…</div>' : '<div class="ctkKosong">' + esc(galat || 'Belum termuat.') + '<br><br><button type="button" class="tUtama" data-c="segar">Coba lagi</button></div>';
    var R = D.ringkas || {};
    return '<div class="ctkCari"><input id="ctkCari" class="isian" type="search" placeholder="Cari nama, ID, jabatan…" value="' + esc(F.cari) + '" autocomplete="off"></div>'
      + (R.driver ? '<div class="ctkSeg">' + [['SEMUA', 'Semua ' + (R.total || 0)], ['STAF', 'Staf ' + (R.staf || 0)], ['DRIVER', 'Driver ' + (R.driver || 0)]].map(function (x) { return '<button type="button" data-c="jenis:' + x[0] + '" class="' + (F.jenis === x[0] ? 'on' : '') + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>' : '')
      + '<div class="ctkChips"><button type="button" class="ctkChip krg' + (F.tanpa ? ' on' : '') + '" data-c="tanpa">' + (F.tanpa ? '✓ ' : '') + 'Belum ada foto · ' + (R.tanpaFoto || 0) + '</button></div>'
      + '<div id="ctkDaftar">' + htmlDaftar() + '</div><div class="ctkBawah" id="ctkBawah">' + htmlBawah() + '</div>';
  }
  function saklar(nama, on, judul, ket) { return '<button type="button" class="ctkSak' + (on ? ' on' : '') + '" data-c="' + nama + '" role="switch" aria-checked="' + on + '"><span class="tx">' + judul + '<small>' + ket + '</small></span><span class="tg"><i></i></span></button>'; }
  function isiCetak() {
    var T = terpilih(), tanpa = T.filter(function (o) { return !FOTO[o.id]; }), C = dicetak();
    var lipat = OPSI.tata === 'lipat';
    var h = '<div class="ctkKotak"><h3>Tata letak</h3><div class="ctkTata">' + [['4', '4 per lembar', 'Depan 4 kartu, belakang 4 kartu (bolak-balik)'], ['8', '8 per lembar', 'Hemat kertas (bolak-balik)'], ['lipat', '1 sisi: depan di atas, belakang di bawah', '2 orang per lembar, tanpa bolak-balik; gunting lalu tempel']].map(function (x) { return '<button type="button" data-c="tata:' + x[0] + '" class="' + (OPSI.tata === x[0] ? 'on' : '') + '" role="radio" aria-checked="' + (OPSI.tata === x[0]) + '"><b>' + x[1] + '</b><small>' + x[2] + '</small></button>'; }).join('') + '</div></div>'
      + (lipat ? '' : '<div class="ctkKotak"><h3>Sisi yang dicetak</h3><div class="ctkSeg" style="margin:0">' + [['dua', 'Depan + belakang'], ['depan', 'Depan saja'], ['belakang', 'Belakang saja']].map(function (x) { return '<button type="button" data-c="sisi:' + x[0] + '" class="' + (OPSI.sisi === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div></div>')
      + '<div class="ctkKotak">' + saklar('mirror', OPSI.mirror, 'Mirror (cermin kiri-kanan)', 'Seluruh halaman dibalik kiri-kanan, sama dengan berkas “-MIRROR” yang biasa dicetak. Matikan kalau mau cetak biasa.') + '</div>';
    if (PROSES) return h + '<div class="ctkProg"><span class="putar"></span><span>' + esc(PROSES.teks) + '</span><span class="bar"><i style="width:' + Math.round(100 * PROSES.n / (PROSES.dari || 1)) + '%"></i></span></div>';
    if (galat) return h + '<div class="ctkAwas mrh"><b>Belum berhasil</b>' + esc(galat) + '</div><div class="ctkAksi"><button type="button" class="tUtama" data-c="ulang">Coba lagi</button></div>';
    if (!SIAP) return h;
    if (tanpa.length) {
      h += '<div class="ctkAwas"><b>' + tanpa.length + ' orang belum punya foto ID</b>' + tanpa.map(function (o) { return esc(o.nama + ' (' + o.id + ')' + (FGAGAL[o.id] ? ' — ' + FGAGAL[o.id] : '')); }).join('<br>') + '</div>'
        + '<div class="ctkKotak">' + saklar('tanpa', OPSI.tanpa === 'siluet', 'Tetap cetak dengan siluet', OPSI.tanpa === 'siluet' ? 'Kartu tanpa foto memakai gambar siluet. Matikan untuk melewati mereka.' : 'Yang belum punya foto TIDAK dicetak (' + tanpa.length + ' orang dilewati).') + '</div>';
    }
    var aneh = C.filter(function (o) { return o.tanpaNik; }), beda = C.filter(function (o) { return o.jabatanData; });
    if (aneh.length) h += '<div class="ctkAwas"><b>NIK karyawan belum ada</b>' + aneh.map(function (o) { return esc(o.nama + ' (' + o.id + ')'); }).join('<br>') + '<br>Nomor di kartu memakai ID kartu, bukan NIK karyawan. Periksa dulu sebelum dicetak.</div>';
    if (beda.length) h += '<div class="ctkJml">Jabatan di kartu mengikuti keputusan cetak: ' + beda.map(function (o) { return esc(o.nama + ' = ' + o.jabatan + ' (data: ' + o.jabatanData + ')'); }).join('; ') + '</div>';
    if (!C.length) return h + '<div class="ctkKosong">Tidak ada kartu untuk dicetak.<br>Semua yang dipilih belum punya foto.</div>';
    var H = daftarHalaman(C.length, OPSI.sisi, OPSI.tata), apk = !!(window.AndroidDownloader && window.AndroidDownloader.simpanFile), nBerkas = apk ? Math.ceil(C.length / MAKS_KARTU_APK) : 1;
    h += '<div class="ctkAksi"><button type="button" class="tUtama" data-c="pdf">📄 ' + (apk ? 'Simpan PDF' : 'Buka / simpan PDF') + ' (' + C.length + ' kartu, ' + H.length + ' halaman)</button>'
      + (apk ? '' : '<button type="button" class="ctkBtn2" data-c="unduh">⬇ Unduh berkas PDF</button>') + '</div>'
      + '<div class="ctkJml">Kertas A4 mendatar, ' + (lipat ? '2 orang per lembar (depan di atas, belakang di bawah)' : tata(OPSI.tata).per + ' kartu per lembar') + ', ukuran kartu 54 × 85,6 mm. Saat mencetak pilih <b>skala 100% / Actual size</b> (jangan “Fit to page”).'
      + (lipat ? ' Cetak 1 sisi saja; gunting tiap kartu lalu tempel belakang ke punggung depannya.' : OPSI.sisi === 'dua' ? ' Bolak-balik: balik di sisi panjang.' : '') + (nBerkas > 1 ? ' Di APK berkas dipecah jadi ' + nBerkas + ' PDF (' + MAKS_KARTU_APK + ' kartu per berkas).' : '') + '</div>';
    H.forEach(function (p, i) {
      h += '<div class="ctkHal"><div class="jd">Halaman ' + (i + 1) + '<i>Lembar ' + p.lembar + '</i><i>' + (p.sisi === 'LIPAT' ? 'Depan + belakang' : p.sisi === 'DEPAN' ? 'Depan' : 'Belakang') + '</i>' + (OPSI.mirror ? '<i class="mr">MIRROR</i>' : '') + '</div><div class="ctkKertas' + (OPSI.mirror ? ' mirror' : '') + '"><div class="dlm">';
      var grupP = C.slice(p.awal, p.akhir);
      isiHalaman(p).forEach(function (it) {
        var o = grupP[it.i], ps = posisi(it.i, it.bk, OPSI.tata), k = KARTU[o.id]; if (!k) return;
        h += '<img alt="" src="' + (it.bk ? k.urlB : k.urlD) + '" style="left:' + (100 * ps.x / PW).toFixed(3) + '%;top:' + (100 * (PH - ps.y - CH) / PH).toFixed(3) + '%;width:' + (100 * CW / PW).toFixed(3) + '%;height:' + (100 * CH / PH).toFixed(3) + '%">';
      });
      h += '</div></div></div>';
    });
    return h;
  }

  /* ---------- muat & siapkan ---------- */
  function muat() {
    var saya = ++urut; memuat = true; galat = ''; if (el) gambar();
    panggil('daftar', null, 90000).then(function (h) {
      if (saya !== urut) return; memuat = false;
      if (!h || !h.ok) { galat = (h && h.pesan) || 'Daftar belum bisa dimuat.'; if (h && h.login === false && CTX && CTX.sesiHabis) CTX.sesiHabis(); }
      else { D = h; var ada = {}; h.orang.forEach(function (o) { ada[o.id] = 1; }); Object.keys(PILIH).forEach(function (k) { if (!ada[k]) delete PILIH[k]; }); }
      if (el && langkah === 'pilih') gambar();
    }).catch(function (e) { if (saya !== urut) return; memuat = false; galat = (e && e.message) || 'Sinyal putus. Coba lagi.'; if (el) gambar(); });
  }
  function buangKartu(id) { var k = KARTU[id]; if (!k) return; try { URL.revokeObjectURL(k.urlD); URL.revokeObjectURL(k.urlB); } catch (e) { /* */ } delete KARTU[id]; }
  function majukan(teks, n, dari) { PROSES = { teks: teks, n: n, dari: dari }; if (el && langkah === 'cetak') gambar(); }
  /** Ambil foto yang belum ada (bertahap), lalu rakit kartu yang belum ada. */
  function siapkan() {
    var saya = ++kerja, T = terpilih(); SIAP = false; galat = '';
    var perlu = T.filter(function (o) { return o.foto && !(o.id in FOTO) && !FGAGAL[o.id]; }).map(function (o) { return o.id; }), nFoto = perlu.length;
    T.forEach(function (o) { if (!o.foto && !(o.id in FOTO)) FOTO[o.id] = null; });
    function ambil() {
      if (saya !== kerja) return Promise.reject(new Error('batal'));
      if (!perlu.length) return Promise.resolve();
      majukan('Mengambil foto ' + (nFoto - perlu.length) + '/' + nFoto + '…', nFoto - perlu.length, nFoto);
      var ids = perlu.slice(0, FOTO_SEKALI);
      return panggil('foto', { ids: ids }, 120000).then(function (h) {
        if (!h || !h.ok) { if (h && h.login === false && CTX && CTX.sesiHabis) CTX.sesiHabis(); throw new Error((h && h.pesan) || 'Foto belum bisa diambil.'); }
        var sisa = h.sisa || [], maju = 0;
        ids.forEach(function (id) {
          if (sisa.indexOf(id) >= 0) return; maju++; perlu.splice(perlu.indexOf(id), 1);
          var f = h.foto && h.foto[id];
          if (f && f.b64) FOTO[id] = 'data:' + (f.mime || 'image/jpeg') + ';base64,' + f.b64; else { FOTO[id] = null; if (h.gagal && h.gagal[id]) FGAGAL[id] = h.gagal[id]; }
        });
        if (!maju) throw new Error('Server tidak mengirim foto. Coba lagi.');
        return ambil();
      });
    }
    function rakitSemua() {
      var antre = T.filter(function (o) { return !KARTU[o.id]; }), n = 0, dari = antre.length;
      function satu() {
        if (saya !== kerja) return Promise.reject(new Error('batal'));
        var o = antre.shift(); if (!o) return Promise.resolve();
        majukan('Merakit kartu ' + n + '/' + dari + '…', n, dari);
        var src = FOTO[o.id];
        return (src ? muatGambar(src).catch(function () { FOTO[o.id] = null; FGAGAL[o.id] = 'foto tidak terbaca di perangkat ini'; return null; }) : Promise.resolve(null)).then(function (im) {
          return rakit(o, im);
        }).then(function (k) {
          return Promise.all([keJpeg(k.depan), keJpeg(k.belakang)]);
        }).then(function (j) {
          KARTU[o.id] = { depan: j[0], belakang: j[1], urlD: URL.createObjectURL(new Blob([j[0]], { type: 'image/jpeg' })), urlB: URL.createObjectURL(new Blob([j[1]], { type: 'image/jpeg' })) };
          n++; return new Promise(function (ok) { setTimeout(ok, 0); }).then(satu);
        });
      }
      return satu();
    }
    return ambil().then(rakitSemua).then(function () {
      if (saya !== kerja) return; PROSES = null; SIAP = true; if (el && langkah === 'cetak') gambar();
    }).catch(function (e) {
      if (saya !== kerja || (e && e.message === 'batal')) return;
      PROSES = null; galat = (e && e.message) || 'Gagal menyiapkan kartu.'; if (el && langkah === 'cetak') gambar();
    });
  }

  /* ---------- keluarkan PDF ---------- */
  function namaBerkas(n, bagian, dari) { return 'ID-CARD-WHL-' + n + 'kartu-' + tglIni() + (OPSI.tata === 'lipat' ? '-1SISI' : '-' + tata(OPSI.tata).per + 'perlembar' + (OPSI.sisi === 'depan' ? '-DEPAN' : OPSI.sisi === 'belakang' ? '-BELAKANG' : '')) + (OPSI.mirror ? '-MIRROR' : '') + (dari > 1 ? '-bagian' + bagian + 'dari' + dari : '') + '.pdf'; }
  function bahanPdf(L) { return L.map(function (o) { return { id: o.id, depan: KARTU[o.id].depan, belakang: KARTU[o.id].belakang }; }); }
  function keluarkan(cara) {
    var C = dicetak().filter(function (o) { return KARTU[o.id]; }); if (!C.length) { roti('Tidak ada kartu untuk dicetak.'); return; }
    try {
      var apk = !!(window.AndroidDownloader && window.AndroidDownloader.simpanFile), per = apk ? MAKS_KARTU_APK : C.length, dari = Math.ceil(C.length / per);
      for (var b = 0; b < dari; b++) {
        var grup = C.slice(b * per, (b + 1) * per), u8 = buatPdf(bahanPdf(grup), { tata: OPSI.tata, sisi: OPSI.sisi, mirror: OPSI.mirror }), nama = namaBerkas(grup.length, b + 1, dari);
        if (cara === 'unduh') { var url = URL.createObjectURL(new Blob([u8], { type: 'application/pdf' })), a = document.createElement('a'); a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove(); setTimeout((function (x) { return function () { URL.revokeObjectURL(x); }; })(url), 120000); }
        else if (window.WHL_BERKAS && window.WHL_BERKAS.buka) window.WHL_BERKAS.buka(nama, keB64(u8), 'application/pdf').catch(function (e) { roti((e && e.message) || 'PDF tidak bisa dibuka.'); });
        else { roti('Pembuka berkas tidak tersedia.'); return; }
      }
      roti(dari > 1 ? dari + ' berkas PDF disiapkan.' : 'PDF disiapkan (' + C.length + ' kartu).');
    } catch (e) { roti('PDF gagal dibuat: ' + ((e && e.message) || e)); }
  }

  /* ---------- peristiwa ---------- */
  function segarDaftar() { var d = el && el.querySelector('#ctkDaftar'), b = el && el.querySelector('#ctkBawah'); if (d) d.innerHTML = htmlDaftar(); if (b) b.innerHTML = htmlBawah(); }
  function ketik(ev) { if (ev.target && ev.target.id === 'ctkCari') { F.cari = ev.target.value; segarDaftar(); } }
  function klik(ev) {
    var b = ev.target.closest('[data-c]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-c'), i = a.indexOf(':'), n = i < 0 ? a : a.slice(0, i), v = i < 0 ? '' : a.slice(i + 1);
    if (n === 'kembali') { kembali(); return; }
    if (n === 'segar') { muat(); return; }
    if (n === 'jenis') { F.jenis = v; gambar(); return; }
    if (n === 'tanpa' && langkah === 'pilih') { F.tanpa = !F.tanpa; gambar(); return; }
    if (n === 'pilih') { if (PILIH[v]) delete PILIH[v]; else PILIH[v] = 1; b.classList.toggle('on', !!PILIH[v]); b.setAttribute('aria-checked', String(!!PILIH[v])); var bw = el.querySelector('#ctkBawah'); if (bw) bw.innerHTML = htmlBawah(); return; }
    if (n === 'semua') { if (D) D.orang.filter(cocok).forEach(function (o) { PILIH[o.id] = 1; }); segarDaftar(); return; }
    if (n === 'kosong') { PILIH = {}; segarDaftar(); return; }
    if (n === 'lanjut') { if (!terpilih().length) return; langkah = 'cetak'; galat = ''; gambar(); siapkan(); return; }
    if (n === 'ulang') { FGAGAL = {}; galat = ''; siapkan(); return; }
    if (n === 'tata') { if (TATA[v]) { OPSI.tata = v; simpanOpsi(); gambar(); } return; }
    if (n === 'sisi') { OPSI.sisi = v; simpanOpsi(); gambar(); return; }
    if (n === 'mirror') { OPSI.mirror = !OPSI.mirror; simpanOpsi(); gambar(); return; }
    if (n === 'tanpa') { OPSI.tanpa = OPSI.tanpa === 'siluet' ? 'lewati' : 'siluet'; simpanOpsi(); gambar(); return; }
    if (n === 'pdf' || n === 'unduh') { keluarkan(n); return; }
  }
  function buangHasil() { kerja++; Object.keys(KARTU).forEach(buangKartu); FOTO = {}; FGAGAL = {}; PROSES = null; SIAP = false; }
  function tutup() { if (!el) return; var d = el; el = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); buangHasil(); }
  function kembali() {
    if (!el) return false;
    if (langkah === 'cetak') { kerja++; PROSES = null; galat = ''; langkah = 'pilih'; gambar(); return true; }
    tutup(); return true;
  }
  /** opsi.hrd = true: dibuka dari layar HRD (hak tetap diperiksa server). opsi.ids = centang awal. */
  function buka(ctx, opsi) {
    CTX = ctx || CTX; opsi = opsi || {};
    if (!adaPintu()) { roti('Cetak ID card belum dipasang di server.'); return; }
    if (!opsi.hrd && !boleh()) { roti('Cetak ID card khusus yang boleh membuka Data karyawan.'); return; }
    bacaOpsi(); langkah = 'pilih'; galat = ''; F.cari = ''; F.jenis = 'SEMUA'; F.tanpa = false; PILIH = {};
    (opsi.ids || []).forEach(function (id) { PILIH[id] = 1; });
    gambar(); muat();
  }
  /** Keluar / ganti akun: buang semua dari memori. */
  function lupakan() { urut++; D = null; PILIH = {}; HRD = null; buangHasil(); if (el) { try { el.remove(); } catch (e) { /* */ } el = null; } }

  window.WHL_IDCETAK = { boleh: boleh, cekHrd: cekHrd, hrdBoleh: function () { return HRD === true; }, buka: buka, kembali: kembali, lupakan: lupakan,
    _uji: { rakit: rakit, buatPdf: buatPdf, keJpeg: keJpeg, posisi: posisi, daftarHalaman: daftarHalaman, ketHalaman: ketHalaman, urlProfil: urlProfil, muatGambar: muatGambar, cocok: cocok, F: F, OPSI: OPSI,
      TATA: TATA, isiHalaman: isiHalaman, ukuran: { PW: PW, PH: PH, CW: CW, CH: CH, GX: GX, GY: GY } } };
})();
