/* WHL App v3.31 — EKSPOR bersama (Andro 17 Nov 2026): Excel .xlsx dibuat di HP (tanpa internet) + buka berkas (PDF/Excel) di dalam app.
 * Pola sama dengan dokumen.js / poin.js (zip "stored" + CRC32, sel teks inlineStr, angka n, baris pertama tebal, sel {url,teks} = HYPERLINK).
 * Dipakai katalog.js (Katalog unit), hazard.js (rekap laporan hazard), peringkat.js (papan mingguan).
 *   WHL_EKSPOR.excel(namaBerkas, [[namaSheet, [[kepala...], [baris...], ...]], ...], roti)
 *   WHL_EKSPOR.buka(namaBerkas, b64, mime, roti)   -> WHL_BERKAS.buka (Android simpan/buka, iPhone QuickLook, browser unduh)
 *   WHL_EKSPOR.pdf(promiseHasilServer, namaCadangan, roti)  -> hasil {ok, b64, nama} dari server dibuka langsung di app
 */
(function () {
  'use strict';
  var CRC = null, MIME_X = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  function crc32(u8) { if (!CRC) { CRC = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } } var x = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) x = CRC[(x ^ u8[i]) & 255] ^ (x >>> 8); return (x ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {
    var enc = new TextEncoder(), bag = [], pusat = [], ofs = 0;
    function u16(v) { return [v & 255, (v >>> 8) & 255]; } function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
    files.forEach(function (f) {
      var nm = enc.encode(f[0]), d = enc.encode(f[1]), c = crc32(d);
      var lok = [].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(c), u32(d.length), u32(d.length), u16(nm.length), u16(0));
      bag.push(new Uint8Array(lok), nm, d);
      pusat.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(c), u32(d.length), u32(d.length), u16(nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(ofs))), nm);
      ofs += lok.length + nm.length + d.length;
    });
    var cdLen = 0; pusat.forEach(function (a) { cdLen += a.length; });
    var akhir = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cdLen), u32(ofs), u16(0)));
    var semua = bag.concat(pusat, [akhir]), tot = semua.reduce(function (s, a) { return s + a.length; }, 0), out = new Uint8Array(tot), p = 0;
    semua.forEach(function (a) { out.set(a, p); p += a.length; });
    return out;
  }
  function xmlEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
  function kolomX(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function lembarX(baris) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
      + baris.map(function (r, i) { return '<row r="' + (i + 1) + '">' + r.map(function (v, j) { var ref = kolomX(j) + (i + 1), st = i === 0 ? ' s="1"' : '';
        if (v && typeof v === 'object' && v.url) { var fu = String(v.url).replace(/"/g, '""'), ft = String(v.teks || 'Buka').replace(/"/g, '""'); return '<c r="' + ref + '" t="str"><f>' + xmlEsc('HYPERLINK("' + fu + '","' + ft + '")') + '</f><v>' + xmlEsc(v.teks || 'Buka') + '</v></c>'; }
        if (v && typeof v === 'object') v = '';
        return typeof v === 'number' && isFinite(v) ? '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>' : '<c r="' + ref + '" t="inlineStr"' + st + '><is><t xml:space="preserve">' + xmlEsc(v) + '</t></is></c>'; }).join('') + '</row>'; }).join('')
      + '</sheetData></worksheet>';
  }
  function xlsx(sheets) {
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
      + sheets.map(function (s, i) { return '<sheet name="' + xmlEsc(String(s[0]).replace(/[\[\]\*\?\/\\:]/g, ' ').slice(0, 31)) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>';
    var wbr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('')
      + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    var sty = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
      + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs>'
      + '<cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>';
    var f = [['[Content_Types].xml', ct], ['_rels/.rels', rels], ['xl/workbook.xml', wb], ['xl/_rels/workbook.xml.rels', wbr], ['xl/styles.xml', sty]];
    sheets.forEach(function (s, i) { f.push(['xl/worksheets/sheet' + (i + 1) + '.xml', lembarX(s[1])]); });
    return zip(f);
  }
  function keB64(u8) { var s = '', i; for (i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function buka(nama, b64, mime, roti) {
    roti = roti || function () { };
    if (window.WHL_BERKAS) return window.WHL_BERKAS.buka(nama, b64, mime).catch(function (e) { roti(e.message); });
    try { var bin = atob(b64), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); var url = URL.createObjectURL(new Blob([u8], { type: mime })), l = document.createElement('a'); l.href = url; l.download = nama; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 120000); } catch (e) { roti('Berkas tidak bisa dibuka: ' + e.message); }
    return Promise.resolve();
  }
  function aman(n) { return String(n || 'Data WHL').replace(/[\\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim(); }
  function excel(nama, sheets, roti) {
    roti = roti || function () { };
    try { var b64 = keB64(xlsx(sheets)); buka(aman(nama) + '.xlsx', b64, MIME_X, roti); roti('Excel disiapkan.'); return b64; }
    catch (e) { roti('Excel gagal dibuat: ' + e.message); return ''; }
  }
  function pdf(janji, namaCadangan, roti) {
    roti = roti || function () { }; roti('Menyiapkan PDF…');
    return janji.then(function (h) {
      if (!h || h.ok === false || !h.b64) { roti((h && h.pesan) || 'PDF belum bisa dibuat.'); return; }
      return buka(h.nama || (aman(namaCadangan) + '.pdf'), h.b64, 'application/pdf', roti);
    }, function (e) { roti(e.message); });
  }
  /** Excel dari data server {ok, judul, kolom[], baris[][]} (kontrak katalog-lengkap-17nov\pdf: pusatKatalogRekap / pusatHazardRekap / pusatPeringkatRekap). Link http -> HYPERLINK. */
  function excelServer(janji, namaCadangan, roti, lembar) {
    roti = roti || function () { }; roti('Menyiapkan Excel…');
    return janji.then(function (h) {
      if (!h || h.ok === false || h.aktif === false || !Array.isArray(h.kolom)) { roti((h && h.pesan) || 'Excel belum bisa dibuat.'); return; }
      var rows = (h.baris || []).map(function (r) { return (r || []).map(function (v) { return typeof v === 'string' && /^https?:\/\//.test(v) ? { url: v, teks: /maps/i.test(v) ? 'Peta' : 'Buka' } : v; }); });
      excel(h.judul || namaCadangan, [[lembar || 'Data', [h.kolom].concat(rows)]], roti);
    }, function (e) { roti(e.message); });
  }
  /** tanggal hari ini WIB yyyy-mm-dd untuk nama berkas */
  function tglIni() { var d = new Date(Date.now() + 7 * 3600000); return d.toISOString().slice(0, 10); }
  window.WHL_EKSPOR = { excel: excel, excelServer: excelServer, pdf: pdf, buka: buka, tgl: tglIni, _xlsxB64: function (s) { return keB64(xlsx(s)); } };
})();
