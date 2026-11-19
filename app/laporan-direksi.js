/* ============================================================================================
   WHL App - Laporan Operasional ke Direksi (Asisten Saya - Fanza) - v2 19 Nov 2026, Divisi Upgrade (Vanesa)
   Revisi Reza: konsep kartu lama DIPERTAHANKAN (kesimpulan 1 kalimat di atas, status keseluruhan, KPI angka besar
   dengan panah + persen vs periode lalu, Perlu perhatian / Sudah ditangani) tetapi dibungkus gaya LAPORAN DATA
   PROFESIONAL: baris judul sederhana (bukan kop surat), tabel, grafik, warna formal terbatas. Tanpa tanda tangan.
     HARIAN   : tepat 1 halaman A4 potret -> PNG (dilihat langsung di WA) + PDF.
     MINGGUAN / BULANAN : PDF multi-halaman + gambar halaman 1 sebagai pratinjau.
   Grafik digambar sendiri di canvas. PDF dirakit sendiri (halaman canvas -> JPEG -> PDF 1.4), tanpa library luar,
   jalan di WebView Capacitor Android/iOS dan PWA iPhone.

   API:
     window.WHL_LAPORAN_DIREKSI.buka(data)            -> lembar pratinjau + teks + catatan + Bagikan / Unduh
     window.WHL_LAPORAN_DIREKSI.gambar(data, opsi)    -> Promise<Blob> PNG halaman 1 (A4, 1860x2631)
     window.WHL_LAPORAN_DIREKSI.pdf(data, opsi)       -> Promise<Blob> application/pdf (semua halaman)
     window.WHL_LAPORAN_DIREKSI.teks(data)            -> string pesan WA formal (maks 6 baris)
   opsi = { catatan:'teks', catatanDiGambar:true }.  Kontrak data lengkap: kartu\KONTRAK-DATA.txt.
   Semua field opsional: bagian yang datanya tidak ada disembunyikan, tidak error.
   Catatan: tanpa garis miring ganda di string (aturan proyek), URL dirakit 'https:' + '/' + '/...'.
   ============================================================================================ */
(function (root) {
  'use strict';

  /* v2.1 (Reza: huruf terlalu kecil): halaman logis 800 x 1131 (A4) dirender 2,325x -> 1860 x 2630 px.
     Teks isi 20 px = 31 px pada lebar 1240 (±15 pt); huruf terkecil 17 px (±12,6 pt). Isi dikurangi, bukan huruf dikecilkan. */
  var PW = 800, PH = 1131, M = 44, SK = 2.325, BAWAH = PH - 70, MIN_PX = 17;
  var FONT = '"Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, -apple-system, sans-serif';
  var C = { navy: '#1f3a5f', navy2: '#3b6189', teks: '#1d2733', redup: '#5a6676', samar: '#8a95a3', garis: '#d3dae3', garis2: '#e8ecf1',
    isi: '#f4f6f9', zebra: '#f7f9fb', hijau: '#2e7d4f', kuning: '#b26f12', merah: '#b03a2e', abu: '#9aa5b1' };
  var TINT = { hijau: '#e8f3ec', kuning: '#fbf1e1', merah: '#f8e6e4', netral: '#eef1f4' };
  var WST = { hijau: C.hijau, kuning: C.kuning, merah: C.merah, netral: C.samar };
  var KATA = { hijau: 'Baik', kuning: 'Waspada', merah: 'Kritis', netral: '-' };
  var KATA_ALL = { hijau: 'Aman terkendali', kuning: 'Perlu dipantau', merah: 'Perlu tindakan', netral: 'Belum lengkap' };
  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  /* ---------------- normalisasi data ---------------- */
  function str(v) { return v == null ? '' : String(v).replace(/\s+/g, ' ').trim(); }
  function angka(v) { if (typeof v === 'number') return isFinite(v) ? v : null; if (v == null || v === '') return null; var n = Number(String(v).replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null; }
  function arr(a) { return Array.isArray(a) ? a.filter(function (x) { return x != null && x !== ''; }) : []; }
  function obj(a) { return arr(a).filter(function (x) { return typeof x === 'object'; }); }
  function jenisBaku(j) { j = str(j).toLowerCase(); if (j.indexOf('ming') === 0 || j.indexOf('week') === 0) return 'Mingguan'; if (j.indexOf('bul') === 0 || j.indexOf('mon') === 0) return 'Bulanan'; return 'Harian'; }
  function stBaku(s) { s = str(s).toLowerCase(); return WST[s] ? s : 'netral'; }
  function normal(d) {
    d = d && typeof d === 'object' ? d : {};
    var jenis = jenisBaku(d.jenis);
    var kpi = obj(d.kpi).slice(0, 8).map(function (k) {
      var arah = str(k.arah).toLowerCase(); if (['naik', 'turun', 'tetap'].indexOf(arah) < 0) arah = '';
      return { label: str(k.label) || 'Indikator', nilai: angka(k.nilai), satuan: str(k.satuan), banding: angka(k.banding), arah: arah,
        baik: typeof k.baik === 'boolean' ? k.baik : null, status: stBaku(k.status), persen: angka(k.persen) };
    });
    var ring = Array.isArray(d.ringkasan) ? d.ringkasan.map(str).filter(Boolean).join(' ') : str(d.ringkasan);
    var pen = d.penyebab && typeof d.penyebab === 'object' ? d.penyebab : null;
    var unit = d.unit && typeof d.unit === 'object' ? { ready: angka(d.unit.ready), bd: angka(d.unit.bd), standby: angka(d.unit.standby) } : null;
    if (unit && unit.ready == null && unit.bd == null) unit = null;
    return {
      jenis: jenis, periode: str(d.periode), perusahaan: str(d.perusahaan) || 'PT. Whale Holder Logistic',
      nama: str(d.namaLengkap) || (str(d.nama).length > 8 ? str(d.nama) : '') || 'Fanza Dwiyan Prasetya', jabatan: str(d.jabatan) || 'Manager Operation',
      namaPendek: str(d.namaPendek) || 'Fanza', dibuat: str(d.dibuat),
      kesimpulan: str(d.kesimpulan) || (kpi.length ? 'Ringkasan ' + jenis.toLowerCase() + ' belum lengkap; angka yang sudah masuk tercantum di bawah.' : 'Data laporan ' + jenis.toLowerCase() + ' belum masuk.'),
      ringkasan: ring, kpi: kpi,
      perhatian: arr(d.perhatian).map(str).filter(Boolean).slice(0, 3), ditangani: arr(d.ditangani).map(str).filter(Boolean).slice(0, 3),
      isu: obj(d.isu).map(function (x) { return { isu: str(x.isu), penyebab: str(x.penyebab), tindakan: str(x.tindakan), status: str(x.status) }; }).filter(function (x) { return x.isu; }),
      perShift: obj(d.perShift).map(function (x) { return { shift: str(x.shift) || '-', ritase: angka(x.ritase), tonase: angka(x.tonase) }; }).filter(function (x) { return x.ritase != null || x.tonase != null; }),
      unit: unit,
      tren: obj(d.tren).map(function (x) { return { tgl: str(x.tgl), ritase: angka(x.ritase), tonase: angka(x.tonase), unitReadyPct: angka(x.unitReadyPct) }; }),
      targetReady: angka(d.targetReadyPct),
      penyebab: pen ? [['Driver', angka(pen.driver)], ['Mekanik', angka(pen.mekanik)], ['Jalan', angka(pen.jalan)]].filter(function (x) { return x[1] != null; }) : [],
      penyebabSatuan: str(d.penyebabSatuan) || 'jam',
      topUnit: obj(d.topUnit).map(function (x) { return { nama: str(x.unit || x.nama), penyebab: str(x.penyebab), jam: angka(x.jamHilang != null ? x.jamHilang : x.jam) }; }).filter(function (x) { return x.nama; }).slice(0, 5),
      topDriver: obj(d.topDriver).map(function (x) { return { nama: str(x.nama || x.driver), penyebab: str(x.penyebab || x.catatan), jam: angka(x.jamHilang != null ? x.jamHilang : x.jam), unit: str(x.unit) }; }).filter(function (x) { return x.nama; }).slice(0, 5),
      bd: obj(d.bd).map(function (x) { return { unit: str(x.unit), kerusakan: str(x.kerusakan || x.keterangan), mulai: str(x.mulai), selesai: str(x.selesai), jam: angka(x.jam) }; }).filter(function (x) { return x.unit; }),
      p2h: angka(d.p2hPct), absensi: angka(d.absensiPct), targetPatuh: angka(d.targetKepatuhanPct) || 95,
      vendor: obj(d.vendor).map(function (x) { return { nama: str(x.nama), tgl: str(x.tgl), catatan: str(x.catatan) }; }).filter(function (x) { return x.nama; }),
      rencana: arr(d.rencana).map(str).filter(Boolean).slice(0, 8),
      catatan: str(d.catatan)
    };
  }

  /* ---------------- format ---------------- */
  function fmt(n, des) {
    if (n == null || !isFinite(n)) return '-';
    if (des == null) des = Math.abs(n) >= 100 || Math.round(n) === n ? 0 : 1;
    var neg = n < 0, s = Math.abs(n).toFixed(des), p = s.split('.'), bulat = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + bulat + (p[1] && /[1-9]/.test(p[1]) ? ',' + p[1].replace(/0+$/, '') : '');
  }
  function nilaiSatuan(k, n) { n = n === undefined ? k.nilai : n; if (n == null) return '-'; return fmt(n) + (k.satuan === '%' ? '%' : k.satuan ? ' ' + k.satuan : ''); }
  function pembanding(j) { return j === 'Mingguan' ? 'minggu lalu' : j === 'Bulanan' ? 'bulan lalu' : 'kemarin'; }
  function kolomPeriode(j) { return j === 'Mingguan' ? ['Minggu ini', 'Minggu lalu'] : j === 'Bulanan' ? ['Bulan ini', 'Bulan lalu'] : ['Hari ini', 'Kemarin']; }
  /* perubahan: { arah, teks:'8,1%' | '3,3 poin' | 'stabil' | '', warna } */
  function ubah(k) {
    var arah = k.arah, t = '';
    if (k.persen != null) { t = fmt(Math.abs(k.persen), Math.abs(k.persen) >= 10 ? 0 : 1) + '%'; if (!arah) arah = k.persen > 0 ? 'naik' : k.persen < 0 ? 'turun' : 'tetap'; }
    else if (k.banding != null && k.nilai != null) {
      var s = k.nilai - k.banding;
      if (k.satuan === '%') t = fmt(Math.abs(s), Math.abs(s) >= 10 ? 0 : 1) + ' poin';
      else if (k.banding !== 0) { var p = s / Math.abs(k.banding) * 100; t = fmt(Math.abs(p), Math.abs(p) >= 10 ? 0 : 1) + '%'; }
      else if (s !== 0) t = fmt(Math.abs(s));
      arah = s > 0 ? 'naik' : s < 0 ? 'turun' : 'tetap';
    }
    if (arah === 'tetap') t = 'stabil';
    var warna = arah === 'tetap' ? 'netral' : k.baik === true ? 'hijau' : k.baik === false ? 'merah' : 'netral';
    return { arah: arah, teks: t, warna: warna };
  }
  function statusAll(d) {
    var a = { merah: 0, kuning: 0, hijau: 0 }; d.kpi.forEach(function (k) { if (a[k.status] != null) a[k.status]++; });
    return a.merah ? 'merah' : a.kuning ? 'kuning' : a.hijau ? 'hijau' : 'netral';
  }
  function stIsu(s) { s = str(s).toLowerCase(); if (/selesai|beres|done|tutup|ok/.test(s)) return 'hijau'; if (/proses|jalan|tunggu|menunggu|pantau/.test(s)) return 'kuning'; return s ? 'merah' : 'netral'; }
  function labelTgl(t, banyak) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
    if (m) return banyak ? String(+m[3]) : +m[3] + ' ' + BULAN[+m[2] - 1];
    return t.length > 7 ? t.slice(0, 7) : t;
  }
  function sekarangWib() {
    try { return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace(/\s+pukul\s+/, ', ') + ' WIB'; } catch (e) { return ''; }
  }

  /* ---------------- teks WA (formal, maks 6 baris) ---------------- */
  function teks(data, catatan) {
    var d = normal(data), b = [];
    b.push('*Laporan ' + d.jenis + ' Operasional' + (d.periode ? ' — ' + d.periode : '') + '*');
    b.push('Status: ' + KATA_ALL[statusAll(d)] + '. ' + d.kesimpulan);
    if (d.kpi.length) b.push(d.kpi.slice(0, 4).map(function (k) {
      var u = ubah(k), p = u.arah === 'naik' ? '▲' : u.arah === 'turun' ? '▼' : '';
      return k.label + ' *' + nilaiSatuan(k) + '*' + (u.teks ? ' (' + (u.teks === 'stabil' ? 'stabil' : p + u.teks) + ')' : '');
    }).join(' | '));
    if (d.isu.length) b.push('Perhatian: ' + d.isu[0].isu + (d.isu[0].tindakan ? ' — ' + d.isu[0].tindakan : '') + (d.isu.length > 1 ? ' (+' + (d.isu.length - 1) + ' isu lain)' : ''));
    else if (d.perhatian.length) b.push('Perhatian: ' + d.perhatian[0] + (d.perhatian.length > 1 ? ' (+' + (d.perhatian.length - 1) + ' lainnya)' : ''));
    var cat = str(catatan != null ? catatan : d.catatan); if (cat) b.push('Catatan: ' + cat);
    b.push('_Disusun: ' + d.nama + ', ' + d.jabatan + (d.jenis === 'Harian' ? '' : ' · rincian lengkap di PDF terlampir') + '_');
    while (b.length > 6) b.splice(b.length - 2, 1);
    return b.join('\n');
  }

  /* ---------------- alat gambar ---------------- */
  function F(px) { return Math.max(MIN_PX, Math.round(px * 1.12)); }
  function font(px, tebal) { return (tebal || 400) + ' ' + F(px) + 'px ' + FONT; }
  function fontAsli(px, tebal) { return (tebal || 400) + ' ' + Math.round(px) + 'px ' + FONT; }
  function bungkus(ctx, s, lebar, maks) {
    var kata = str(s).split(' '), baris = [], cur = '';
    for (var i = 0; i < kata.length; i++) {
      var coba = cur ? cur + ' ' + kata[i] : kata[i];
      if (ctx.measureText(coba).width <= lebar || !cur) {
        cur = coba;
        while (ctx.measureText(cur).width > lebar && cur.length > 1) { var j = cur.length; while (j > 1 && ctx.measureText(cur.slice(0, j)).width > lebar) j--; baris.push(cur.slice(0, j)); cur = cur.slice(j); }
      } else { baris.push(cur); cur = kata[i]; }
    }
    if (cur) baris.push(cur);
    if (maks && baris.length > maks) {
      var sisa = baris.slice(0, maks), akhir = sisa[maks - 1] + ' ' + baris.slice(maks).join(' ');
      while (akhir.length > 1 && ctx.measureText(akhir + '…').width > lebar) akhir = akhir.slice(0, -1);
      sisa[maks - 1] = akhir.replace(/[\s,.;:-]+$/, '') + '…'; baris = sisa;
    }
    return baris;
  }
  function kotak(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function garis(ctx, x1, y1, x2, y2, warna, tebal, putus) {
    ctx.save(); ctx.strokeStyle = warna; ctx.lineWidth = tebal || 1; if (putus && ctx.setLineDash) ctx.setLineDash(putus);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }
  function tulis(ctx, s, x, y, px, tebal, warna, rata) { ctx.font = font(px, tebal); ctx.fillStyle = warna || C.teks; ctx.textAlign = rata || 'left'; ctx.fillText(s, x, y); ctx.textAlign = 'left'; }
  function segitiga(ctx, cx, cy, s, naik, warna) {
    ctx.fillStyle = warna; ctx.beginPath();
    if (naik) { ctx.moveTo(cx, cy - s * 0.5); ctx.lineTo(cx + s * 0.55, cy + s * 0.42); ctx.lineTo(cx - s * 0.55, cy + s * 0.42); }
    else { ctx.moveTo(cx, cy + s * 0.5); ctx.lineTo(cx + s * 0.55, cy - s * 0.42); ctx.lineTo(cx - s * 0.55, cy - s * 0.42); }
    ctx.closePath(); ctx.fill();
  }
  function titik(ctx, cx, cy, r, warna) { ctx.fillStyle = warna; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
  /* konteks pengukur: font & measureText asli, semua gambar diabaikan */
  function pengukur(ctx) {
    var u = { measureText: function (s) { return ctx.measureText(s); }, createLinearGradient: function () { return { addColorStop: function () { } }; } };
    Object.defineProperty(u, 'font', { get: function () { return ctx.font; }, set: function (v) { ctx.font = v; } });
    ['fillRect', 'strokeRect', 'beginPath', 'moveTo', 'lineTo', 'quadraticCurveTo', 'closePath', 'fill', 'stroke', 'arc', 'fillText', 'save', 'restore', 'clip', 'setLineDash', 'rect'].forEach(function (k) { u[k] = function () { }; });
    return u;
  }
  function langkahRapi(maks) {
    if (!(maks > 0)) return 1; var mentah = maks / 4, p = Math.pow(10, Math.floor(Math.log(mentah) / Math.LN10)), f = mentah / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
  }

  /* ---------------- komponen ---------------- */
  function judulSeksi(ctx, no, judul, x, y, w) {
    tulis(ctx, (no ? no + '.  ' : '') + judul.toUpperCase(), x, y + 28, 21, 700, C.navy);
    garis(ctx, x, y + 42, x + w, y + 42, C.garis, 1.5);
    return 60;
  }
  /* tabel: kolom [{j, l(fraksi), r:'kanan'|'tengah'}], baris [[sel]], sel = string | {t, st:'hijau|kuning|merah', tebal, warna} */
  function tabel(ctx, x, y, w, kolom, baris, opsi) {
    opsi = opsi || {}; var fpx = opsi.fpx || 18, lh = Math.round(F(fpx) * 1.28), pad = 10, y0 = y;
    var xs = [], cx = x; kolom.forEach(function (k) { xs.push(cx); cx += k.l * w; });
    ctx.fillStyle = C.navy; ctx.fillRect(x, y, w, 42);
    kolom.forEach(function (k, i) {
      var lw = k.l * w, tx = k.r === 'kanan' ? xs[i] + lw - pad : k.r === 'tengah' ? xs[i] + lw / 2 : xs[i] + pad, hp = 18;
      while (hp > 15) { ctx.font = fontAsli(hp, 700); if (ctx.measureText(k.j).width <= lw - pad * 2) break; hp--; }
      ctx.fillStyle = '#ffffff'; ctx.textAlign = k.r === 'kanan' ? 'right' : k.r === 'tengah' ? 'center' : 'left'; ctx.fillText(k.j, tx, y + 28); ctx.textAlign = 'left';
    });
    y += 42;
    baris.forEach(function (b, bi) {
      ctx.font = font(fpx, 400);
      var isi = b.map(function (sel, i) {
        var o = typeof sel === 'object' && sel ? sel : { t: sel == null ? '' : String(sel) };
        ctx.font = font(fpx, o.tebal ? 600 : 400);
        var lebar = kolom[i].l * w - pad * 2 - (o.st ? 20 : 0);
        return { o: o, ln: bungkus(ctx, o.t, lebar, opsi.maks || 2) };
      });
      var nb = Math.max.apply(null, isi.map(function (s) { return s.ln.length || 1; })), h = nb * lh + 14;
      if (bi % 2 === 1) { ctx.fillStyle = C.zebra; ctx.fillRect(x, y, w, h); }
      isi.forEach(function (s, i) {
        var k = kolom[i], lw = k.l * w, rata = k.r === 'kanan' ? 'right' : k.r === 'tengah' ? 'center' : 'left';
        var tx = rata === 'right' ? xs[i] + lw - pad : rata === 'center' ? xs[i] + lw / 2 : xs[i] + pad, warna = s.o.warna || C.teks;
        if (s.o.st) { titik(ctx, xs[i] + pad + 6, y + 8 + lh * 0.5, 6, WST[s.o.st]); tx = xs[i] + pad + 18; rata = 'left'; warna = s.o.warna || WST[s.o.st]; }
        s.ln.forEach(function (t, li) { tulis(ctx, t, tx, y + 8 + lh * li + F(fpx) * 0.95, fpx, s.o.tebal || s.o.st ? 600 : 400, warna, rata); });
      });
      y += h; garis(ctx, x, y, x + w, y, C.garis2, 1);
    });
    garis(ctx, x, y, x + w, y, C.garis, 1.5);
    return y - y0;
  }
  function grafikBatang(ctx, x, y, w, h, label, nilai, opsi) {
    opsi = opsi || {}; var kiri = 66, bawah = 40, atas = 26, gw = w - kiri, gh = h - bawah - atas, n = nilai.length;
    var maks = Math.max.apply(null, nilai.map(function (v) { return v || 0; }).concat([1])), st = langkahRapi(maks), top = Math.ceil(maks / st) * st || st;
    for (var i = 0; i <= Math.round(top / st); i++) {
      var v = st * i, yy = y + atas + gh - gh * v / top;
      garis(ctx, x + kiri, yy, x + w, yy, i ? C.garis2 : C.garis, 1);
      tulis(ctx, fmt(v), x + kiri - 10, yy + 5, 14, 400, C.samar, 'right');
    }
    var slot = gw / Math.max(n, 1), bw = Math.min(slot * 0.66, 90), tiap = Math.ceil(n / 8);
    nilai.forEach(function (v, i) {
      var cx = x + kiri + slot * i + slot / 2;
      if (v != null) {
        var bh = gh * v / top; ctx.fillStyle = opsi.warnaFn ? opsi.warnaFn(v, i) : (opsi.warna || C.navy2); ctx.fillRect(cx - bw / 2, y + atas + gh - bh, bw, bh);
        if (n <= 8) tulis(ctx, fmt(v), cx, y + atas + gh - bh - 7, 16, 700, C.teks, 'center');
      }
      if (i % tiap === 0 || i === n - 1) tulis(ctx, label[i], cx, y + h - 10, 16, 400, C.redup, 'center');
    });
    var ada = nilai.filter(function (v) { return v != null; });
    if (opsi.rata && ada.length > 2) {
      var r = ada.reduce(function (a, b) { return a + b; }, 0) / ada.length, yr = y + atas + gh - gh * r / top;
      garis(ctx, x + kiri, yr, x + w, yr, C.kuning, 2.5, [10, 6]);
      ctx.font = font(15, 700); var tr = 'rata-rata ' + fmt(r); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + w - ctx.measureText(tr).width - 10, yr - 24, ctx.measureText(tr).width + 10, 22);
      tulis(ctx, tr, x + w - 4, yr - 7, 15, 700, C.kuning, 'right');
    }
  }
  function grafikGaris(ctx, x, y, w, h, label, nilai, opsi) {
    opsi = opsi || {}; var kiri = 72, bawah = 40, atas = 26, gw = w - kiri, gh = h - bawah - atas, n = nilai.length;
    var ada = nilai.filter(function (v) { return v != null; }); if (!ada.length) return;
    var lo = Math.min.apply(null, ada.concat(opsi.target != null ? [opsi.target] : [])), hi = Math.max.apply(null, ada.concat(opsi.target != null ? [opsi.target] : []));
    var stL = hi - lo <= 16 ? 5 : 10, bawahN = Math.max(0, Math.floor((lo - 3) / stL) * stL), atasN = Math.min(opsi.maks || 1e12, Math.ceil((hi + 2) / stL) * stL); if (atasN <= bawahN) atasN = bawahN + stL;
    while ((atasN - bawahN) / stL > 6) stL *= 2;
    var py = function (v) { return y + atas + gh - gh * (v - bawahN) / (atasN - bawahN); };
    for (var i = 0; bawahN + stL * i <= atasN + 1e-9; i++) { var v = bawahN + stL * i, yy = py(v); garis(ctx, x + kiri, yy, x + w, yy, i ? C.garis2 : C.garis, 1); tulis(ctx, fmt(v) + (opsi.satuan || ''), x + kiri - 10, yy + 5, 14, 400, C.samar, 'right'); }
    var slot = gw / Math.max(n, 1), tiap = Math.ceil(n / 8), pts = [];
    nilai.forEach(function (v, i) { var cx = x + kiri + slot * i + slot / 2; if (v != null) pts.push([cx, py(v), v]); if (i % tiap === 0 || i === n - 1) tulis(ctx, label[i], cx, y + h - 10, 16, 400, C.redup, 'center'); });
    if (opsi.target != null) { var yt = py(opsi.target); garis(ctx, x + kiri, yt, x + w, yt, C.merah, 2.5, [10, 6]); tulis(ctx, 'target ' + fmt(opsi.target) + (opsi.satuan || ''), x + w - 4, yt - 8, 15, 700, C.merah, 'right'); }
    if (pts.length > 1) {
      ctx.save(); ctx.globalAlpha = 0.1; ctx.fillStyle = C.navy; ctx.beginPath(); ctx.moveTo(pts[0][0], y + atas + gh);
      pts.forEach(function (p) { ctx.lineTo(p[0], p[1]); }); ctx.lineTo(pts[pts.length - 1][0], y + atas + gh); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.save(); ctx.strokeStyle = C.navy; ctx.lineWidth = 4.5; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); ctx.restore();
    }
    pts.forEach(function (p) { titik(ctx, p[0], p[1], n > 12 ? 4.5 : 6.5, C.navy); if (n <= 8) tulis(ctx, fmt(p[2]) + (opsi.satuan || ''), p[0], p[1] - 14, 15, 700, C.teks, 'center'); });
  }
  function batangMendatar(ctx, x, y, w, item, satuan) {
    var total = item.reduce(function (a, b) { return a + (b[1] || 0); }, 0) || 1, maks = Math.max.apply(null, item.map(function (b) { return b[1] || 0; }).concat([1]));
    var kl = 130, kk = 250, bw = w - kl - kk, warna = [C.navy, C.navy2, C.abu];
    item.forEach(function (b, i) {
      var yy = y + i * 54;
      tulis(ctx, b[0], x, yy + 29, 19, 600, C.teks);
      ctx.fillStyle = C.isi; ctx.fillRect(x + kl, yy + 8, bw, 30);
      ctx.fillStyle = warna[i % 3]; ctx.fillRect(x + kl, yy + 8, bw * (b[1] || 0) / maks, 30);
      tulis(ctx, fmt(b[1]) + ' ' + satuan + ' (' + fmt((b[1] || 0) / total * 100, 0) + '%)', x + w, yy + 29, 18, 700, C.teks, 'right');
    });
    return item.length * 54;
  }
  function batangPatuh(ctx, x, y, w, label, v, target) {
    var st = v >= target ? 'hijau' : v >= target - 10 ? 'kuning' : 'merah', kl = 220, kk = 110, bw = w - kl - kk;
    tulis(ctx, label, x, y + 30, 19, 600, C.teks);
    ctx.fillStyle = C.isi; ctx.fillRect(x + kl, y + 12, bw, 28);
    ctx.fillStyle = WST[st]; ctx.fillRect(x + kl, y + 12, bw * Math.max(0, Math.min(100, v)) / 100, 28);
    var xt = x + kl + bw * target / 100; garis(ctx, xt, y + 4, xt, y + 48, C.teks, 2);
    tulis(ctx, 'target ' + fmt(target) + '%', xt, y + 70, 15, 600, C.redup, 'center');
    tulis(ctx, fmt(v) + '%', x + w, y + 34, 26, 700, WST[st], 'right');
    return 88;
  }

  /* ---------------- seksi ---------------- */
  function seksiKesimpulan(d, opsi) {
    return { lukis: function (ctx, x, y, w) {
      var st = statusAll(d), y0 = y;
      var pad = 22, kpx = 26; ctx.font = font(kpx, 700); var kb = bungkus(ctx, d.kesimpulan, w - pad * 2 - 8, 3), lhk = Math.round(F(kpx) * 1.22);
      ctx.font = font(18, 400); var rb = d.ringkasan ? bungkus(ctx, d.ringkasan, w - pad * 2 - 8, d.jenis === 'Harian' ? 3 : 5) : [];
      var h = 22 + 40 + kb.length * lhk + (rb.length ? 10 + rb.length * 28 : 0) + 20;
      ctx.fillStyle = C.isi; ctx.fillRect(x, y, w, h); ctx.fillStyle = WST[st]; ctx.fillRect(x, y, 6, h);
      tulis(ctx, 'KESIMPULAN', x + pad, y + 42, 15, 700, C.redup);
      var kata = KATA_ALL[st]; ctx.font = font(16, 700); var wk = ctx.measureText(kata).width + 46;
      ctx.fillStyle = TINT[st]; kotak(ctx, x + w - pad - wk, y + 16, wk, 38, 19); ctx.fill(); titik(ctx, x + w - pad - wk + 19, y + 35, 7, WST[st]);
      tulis(ctx, kata, x + w - pad - wk + 34, y + 42, 16, 700, WST[st]);
      var yy = y + 62;
      kb.forEach(function (b) { yy += lhk; tulis(ctx, b, x + pad, yy - 8, kpx, 700, C.navy); });
      if (rb.length) { yy += 10; rb.forEach(function (b) { yy += 28; tulis(ctx, b, x + pad, yy - 6, 18, 400, C.teks); }); }
      return h + 24 + (y - y0);
    } };
  }
  function seksiKartuKpi(d) {
    if (!d.kpi.length) return null;
    return { lukis: function (ctx, x, y0, w) {
      var ks = d.kpi.slice(0, 4), n = ks.length, kol = n === 4 ? 2 : n, brs = Math.ceil(n / kol), gap = 12, tw = (w - gap * (kol - 1)) / kol, h = 128;
      ks.forEach(function (k, i) {
        var tx = x + (i % kol) * (tw + gap), u = ubah(k), y = y0 + Math.floor(i / kol) * (h + gap);
        ctx.font = font(17, 600); tulis(ctx, bungkus(ctx, k.label, tw - 52, 1)[0], tx + 18, y + 36, 17, 600, C.redup);
        if (k.status !== 'netral') titik(ctx, tx + tw - 22, y + 30, 7, WST[k.status]);
        var a = k.nilai == null ? '-' : fmt(k.nilai), sat = k.nilai == null ? '' : k.satuan === '%' ? '%' : k.satuan, bpx = 50;
        ctx.font = font(20, 600); var ws = sat ? ctx.measureText(sat).width + 8 : 0;
        while (bpx > 28) { ctx.font = font(bpx, 700); if (ctx.measureText(a).width + ws <= tw - 36) break; bpx -= 2; }
        tulis(ctx, a, tx + 18, y + 84, bpx, 700, C.teks); var wa = ctx.measureText(a).width;
        if (sat) tulis(ctx, sat, tx + 18 + wa + (k.satuan === '%' ? 2 : 8), y + 84, 20, 600, C.redup);
        if (u.teks) {
          var wu = WST[u.warna], xx = tx + 18;
          if (u.arah === 'naik' || u.arah === 'turun') { segitiga(ctx, xx + 9, y + 106, 17, u.arah === 'naik', wu); xx += 24; }
          tulis(ctx, u.teks, xx, y + 113, 17, 700, wu); ctx.font = font(17, 700); xx += ctx.measureText(u.teks).width + 8;
          ctx.font = font(15, 400); var ket = 'vs ' + pembanding(d.jenis); if (xx + ctx.measureText(ket).width < tx + tw - 10) tulis(ctx, ket, xx, y + 113, 15, 400, C.redup);
        } else tulis(ctx, 'belum ada pembanding', tx + 18, y + 113, 15, 400, C.redup);
        ctx.strokeStyle = C.garis; ctx.lineWidth = 1; ctx.strokeRect(tx + 0.5, y + 0.5, tw - 1, h - 1); ctx.fillStyle = WST[k.status]; ctx.fillRect(tx, y, tw, 5);
      });
      return brs * h + (brs - 1) * gap + 24;
    } };
  }
  function seksiTabelKpi(d, no) {
    if (!d.kpi.length) return null; var kp = kolomPeriode(d.jenis);
    return { judul: 'Indikator Kinerja Utama', lukis: function (ctx, x, y, w) {
      return tabel(ctx, x, y, w, [{ j: 'Indikator', l: 0.34 }, { j: kp[0], l: 0.16, r: 'kanan' }, { j: kp[1], l: 0.16, r: 'kanan' }, { j: 'Δ', l: 0.16, r: 'kanan' }, { j: 'Status', l: 0.18 }],
        d.kpi.map(function (k) {
          var u = ubah(k), dt = u.teks ? (u.teks === 'stabil' ? 'stabil' : (u.arah === 'turun' ? '−' : '+') + u.teks) : '-';
          return [{ t: k.label, tebal: true }, nilaiSatuan(k), k.banding != null ? nilaiSatuan(k, k.banding) : '-', { t: dt, warna: WST[u.warna], tebal: true }, k.status === 'netral' ? '-' : { t: KATA[k.status], st: k.status }];
        }), { fpx: 18, maks: 1 }) + 24;
    } };
  }
  function seksiGrafikHarian(d) {
    var adaShift = d.perShift.length > 0, adaTren = d.tren.filter(function (t) { return t.ritase != null; }).length > 1, adaUnit = !!d.unit && !adaShift && !adaTren; /* v2.1: satu grafik saja di harian */
    if (!adaShift && !adaUnit && !adaTren) return null;
    return { judul: adaShift ? 'Produksi per Shift' + (adaUnit ? ' & Status Unit' : '') : adaUnit ? 'Status Unit' : 'Ritase 7 Hari Terakhir', fleks: true, lukis: function (ctx, x, y, w, h) {
      h = h || 300; var gh = h - 24;
      var wKiri = adaUnit && (adaShift || adaTren) ? w * 0.58 : w;
      if (adaShift) {
        grafikBatang(ctx, x, y, wKiri - 24, gh, d.perShift.map(function (s) { return s.shift + (s.tonase != null ? '  (' + fmt(s.tonase) + ' t)' : ''); }), d.perShift.map(function (s) { return s.ritase; }), { warna: C.navy2 });
        tulis(ctx, 'ritase', x, y + 14, 15, 600, C.redup);
      } else if (adaTren) {
        var tr = d.tren.slice(-7); grafikBatang(ctx, x, y, wKiri - 24, gh, tr.map(function (t) { return labelTgl(t.tgl, false); }), tr.map(function (t) { return t.ritase; }), { warna: C.navy2, rata: true });
      }
      if (adaUnit) {
        var ux = adaShift || adaTren ? x + wKiri + 16 : x, uw = adaShift || adaTren ? w - wKiri - 16 : w, u = d.unit, it = [['Ready', u.ready, C.navy], ['Breakdown', u.bd, C.merah], ['Standby', u.standby, C.abu]].filter(function (b) { return b[1] != null; });
        var tot = it.reduce(function (a, b) { return a + b[1]; }, 0) || 1, cx = ux, by = y + 30;
        ctx.fillStyle = C.isi; ctx.fillRect(ux, y, uw, gh);
        var padat = gh < 150 + 58 + it.length * 30;
        tulis(ctx, 'Unit ready', ux + 24, y + (padat ? 34 : 44), 17, 600, C.redup);
        tulis(ctx, fmt((u.ready || 0) / tot * 100, 1) + '%', ux + 24, y + (padat ? 80 : 100), padat ? 40 : 48, 700, C.navy);
        tulis(ctx, fmt(u.ready) + ' dari ' + fmt(tot) + ' unit', ux + 24, y + (padat ? 106 : 130), padat ? 14 : 16, 400, C.redup);
        by = y + (padat ? 120 : 156); cx = ux + 24; var bw = uw - 48;
        it.forEach(function (b) { var lw = bw * b[1] / tot; ctx.fillStyle = b[2]; ctx.fillRect(cx, by, lw, padat ? 18 : 26); cx += lw; });
        if (padat) { var lx = ux + 24; it.forEach(function (b) { ctx.fillStyle = b[2]; ctx.fillRect(lx, by + 30, 12, 12); var t = b[0] + ' ' + fmt(b[1]); tulis(ctx, t, lx + 18, by + 42, 15, 600, C.teks); ctx.font = font(15, 600); lx += ctx.measureText(t).width + 40; }); }
        else it.forEach(function (b, i) { var ly = by + 58 + i * 30; ctx.fillStyle = b[2]; ctx.fillRect(ux + 24, ly - 13, 14, 14); tulis(ctx, b[0], ux + 46, ly, 16, 400, C.teks); tulis(ctx, fmt(b[1]) + ' unit', ux + uw - 24, ly, 16, 700, C.teks, 'right'); });
      }
      return h;
    } };
  }
  function seksiPerhatian(d, maksIsu, tanpaDitangani) {
    var isu = d.isu.slice(0, maksIsu || 3);
    if (!isu.length && !d.perhatian.length && !d.ditangani.length) return null;
    return { judul: isu.length ? 'Perlu Perhatian & Tindak Lanjut' : 'Perlu Perhatian & Sudah Ditangani', lukis: function (ctx, x, y, w) {
      var y0 = y;
      if (isu.length) {
        y += tabel(ctx, x, y, w, [{ j: 'Isu', l: 0.3 }, { j: 'Penyebab', l: 0.17 }, { j: 'Tindakan', l: 0.33 }, { j: 'Status', l: 0.2 }],
          isu.map(function (s) { return [{ t: s.isu, tebal: true }, s.penyebab || '-', s.tindakan || '-', s.status ? { t: s.status, st: stIsu(s.status) } : '-']; }), { fpx: 17, maks: d.jenis === 'Harian' ? 2 : 3 });
        if (d.isu.length > isu.length) { y += 24; tulis(ctx, '+' + (d.isu.length - isu.length) + ' isu lain tercatat di App WHL', x, y, 14, 400, C.samar); }
        y += 18;
        if (d.ditangani.length && !tanpaDitangani) {
          tulis(ctx, 'SUDAH DITANGANI', x, y + 22, 15, 700, C.hijau); y += 36;
          ctx.font = font(17, 400);
          d.ditangani.forEach(function (s) { var ln = bungkus(ctx, s, w - 30, 1); titik(ctx, x + 7, y + 13, 5, C.hijau); tulis(ctx, ln[0], x + 24, y + 20, 17, 400, C.teks); y += 30; });
        }
        return y - y0 + 16;
      }
      var kol = [['Perlu perhatian', d.perhatian, C.kuning], ['Sudah ditangani', tanpaDitangani ? [] : d.ditangani, C.hijau]].filter(function (k) { return k[1].length; });
      var cw = (w - 32 * (kol.length - 1)) / kol.length, hmax = 0;
      kol.forEach(function (k, i) {
        var cx = x + i * (cw + 32), yy = y; ctx.fillStyle = k[2]; ctx.fillRect(cx, yy + 8, 12, 12); tulis(ctx, k[0].toUpperCase(), cx + 22, yy + 20, 15, 700, k[2]); yy += 36;
        ctx.font = font(17, 400);
        k[1].forEach(function (s) { var ln = bungkus(ctx, s, cw - 24, 3); titik(ctx, cx + 6, yy + 12, 5, k[2]); ln.forEach(function (t, li) { tulis(ctx, t, cx + 22, yy + 19 + li * 27, 17, 400, C.teks); }); yy += ln.length * 27 + 10; });
        hmax = Math.max(hmax, yy - y);
      });
      return hmax + 16;
    } };
  }
  function seksiCatatan(cat) {
    if (!cat) return null;
    return { lukis: function (ctx, x, y, w) {
      ctx.font = font(17, 400); var ln = bungkus(ctx, cat, w - 44, 3), h = 48 + ln.length * 28 + 14;
      ctx.strokeStyle = C.garis; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); ctx.fillStyle = C.navy; ctx.fillRect(x, y, 4, h);
      tulis(ctx, 'CATATAN', x + 22, y + 32, 15, 700, C.navy);
      ln.forEach(function (t, i) { tulis(ctx, t, x + 22, y + 62 + i * 28, 17, 400, C.teks); });
      return h + 20;
    } };
  }
  function statistik(vals, lbl, sat) {
    var v = vals.map(function (x, i) { return [x, lbl[i]]; }).filter(function (p) { return p[0] != null; }); if (!v.length) return '';
    var r = v.reduce(function (a, b) { return a + b[0]; }, 0) / v.length, hi = v.reduce(function (a, b) { return b[0] > a[0] ? b : a; }), lo = v.reduce(function (a, b) { return b[0] < a[0] ? b : a; });
    return 'Rata-rata ' + fmt(r) + sat + '  \u00B7  Maks ' + fmt(hi[0]) + sat + ' (' + hi[1] + ')  \u00B7  Min ' + fmt(lo[0]) + sat + ' (' + lo[1] + ')';
  }
  function seksiTren(d) {
    var t = d.tren; if (t.length < 2) return [];
    var banyak = t.length > 10, lbl = t.map(function (x) { return labelTgl(x.tgl, banyak); }), lblP = t.map(function (x) { return labelTgl(x.tgl, false); }), out = [], pertama = true;
    [['Ritase per hari', 'ritase', ' rit', 'batang'], ['Tonase per hari (ton)', 'tonase', ' t', 'batang'], ['Unit ready (%)', 'unitReadyPct', '%', 'garis']].forEach(function (g) {
      var v = t.map(function (x) { return x[g[1]]; }); if (v.filter(function (a) { return a != null; }).length < 2) return;
      out.push({ judul: pertama ? 'Tren Harian' : '', baru: pertama, lukis: function (ctx, x, y, w) {
        tulis(ctx, g[0], x, y + 22, 19, 700, C.teks);
        tulis(ctx, statistik(v, lblP, g[2] === '%' ? '%' : ''), x, y + 50, 15, 400, C.redup);
        if (g[3] === 'garis') grafikGaris(ctx, x, y + 64, w, 300, lbl, v, { satuan: '%', target: d.targetReady, maks: 100 });
        else grafikBatang(ctx, x, y + 64, w, 300, lbl, v, { warna: g[1] === 'tonase' ? C.navy : C.navy2, rata: true });
        return 64 + 300 + 30;
      } });
      pertama = false;
    });
    return out;
  }
  function seksiTidakEfektif(d) {
    if (!d.penyebab.length && !d.topUnit.length && !d.topDriver.length) return null;
    return { judul: 'Analisa Unit Tidak Efektif', baru: true, lukis: function (ctx, x, y, w) {
      var y0 = y;
      if (d.penyebab.length) {
        var sat = d.penyebabSatuan, kolSat = sat === 'jam' ? 'Jam hilang' : 'Hilang (' + sat + ')';
        tulis(ctx, 'Waktu hilang per penyebab (' + sat + ')', x, y + 22, 19, 700, C.teks); y += 42;
        y += batangMendatar(ctx, x, y, w, d.penyebab, d.penyebabSatuan) + 10;
        var b = d.penyebab.slice().sort(function (a, c) { return (c[1] || 0) - (a[1] || 0); })[0], tot = d.penyebab.reduce(function (a, c) { return a + (c[1] || 0); }, 0);
        if (tot) { ctx.font = font(17, 400); tulis(ctx, 'Penyebab terbesar: ' + b[0].toLowerCase() + ' (' + fmt(b[1] / tot * 100, 0) + '% dari ' + fmt(tot) + ' ' + d.penyebabSatuan + ' hilang).', x, y + 22, 17, 400, C.redup); y += 52; }
      }
      if (d.topUnit.length) {
        tulis(ctx, 'Top ' + d.topUnit.length + ' unit paling banyak tidak efektif', x, y + 22, 19, 700, C.teks); y += 38;
        y += tabel(ctx, x, y, w, [{ j: 'No', l: 0.07, r: 'tengah' }, { j: 'Unit', l: 0.19 }, { j: 'Penyebab utama', l: 0.46 }, { j: kolSat, l: 0.28, r: 'kanan' }],
          d.topUnit.map(function (u, i) { return [String(i + 1), { t: u.nama, tebal: true }, u.penyebab || '-', u.jam != null ? fmt(u.jam) + ' ' + sat : '-']; }), { fpx: 17, maks: 2 }) + 30;
      }
      if (d.topDriver.length) {
        tulis(ctx, 'Top ' + d.topDriver.length + ' driver dengan waktu hilang terbanyak', x, y + 22, 19, 700, C.teks); y += 38;
        y += tabel(ctx, x, y, w, [{ j: 'No', l: 0.07, r: 'tengah' }, { j: 'Driver', l: 0.3 }, { j: 'Unit', l: 0.17 }, { j: 'Catatan', l: 0.24 }, { j: kolSat, l: 0.22, r: 'kanan' }],
          d.topDriver.map(function (u, i) { return [String(i + 1), { t: u.nama, tebal: true }, u.unit || '-', u.penyebab || '-', u.jam != null ? fmt(u.jam) + ' ' + sat : '-']; }), { fpx: 17, maks: 2 }) + 30;
      }
      return y - y0;
    } };
  }
  function seksiBd(d) {
    if (!d.bd.length) return null;
    var maksBaris = 10;
    return { judul: 'Breakdown & Lama Perbaikan', lukis: function (ctx, x, y, w) {
      var y0 = y, jam = d.bd.map(function (b) { return b.jam; }).filter(function (v) { return v != null; }), tot = jam.reduce(function (a, b) { return a + b; }, 0);
      var terlama = d.bd.reduce(function (a, b) { return (b.jam || 0) > (a.jam || 0) ? b : a; });
      var fig = [['Jumlah kejadian', fmt(d.bd.length)], ['Total jam BD', fmt(tot) + ' jam'], ['Rata-rata perbaikan', jam.length ? fmt(tot / jam.length, 1) + ' jam' : '-'], ['Terlama' + (terlama.jam != null ? ' \u00B7 ' + terlama.unit : ''), terlama.jam != null ? fmt(terlama.jam) + ' jam' : '-']];
      var fw = (w - 14) / 2;
      fig.forEach(function (f, i) {
        var fx = x + (i % 2) * (fw + 14), fy = y + Math.floor(i / 2) * 104; ctx.fillStyle = C.isi; ctx.fillRect(fx, fy, fw, 92);
        ctx.font = font(15, 600); tulis(ctx, bungkus(ctx, f[0], fw - 32, 1)[0], fx + 18, fy + 32, 15, 600, C.redup); ctx.font = font(26, 700); tulis(ctx, bungkus(ctx, f[1], fw - 32, 1)[0], fx + 18, fy + 74, 26, 700, C.navy);
      });
      y += 104 * 2 + 14;
      var urut = d.bd.slice().sort(function (a, b) { return (b.jam || 0) - (a.jam || 0); }), tampil = urut.slice(0, maksBaris);
      var waktu = function (b) { return (b.mulai || '-') + ' \u2192 ' + (b.selesai || 'belum selesai'); };
      y += tabel(ctx, x, y, w, [{ j: 'Unit', l: 0.18 }, { j: 'Kerusakan', l: 0.33 }, { j: 'Mulai \u2192 selesai', l: 0.32 }, { j: 'Lama', l: 0.17, r: 'kanan' }],
        tampil.map(function (b) { return [{ t: b.unit, tebal: true }, b.kerusakan || '-', b.selesai ? waktu(b) : { t: waktu(b), warna: C.merah }, b.jam != null ? fmt(b.jam) + ' jam' : '-']; }), { fpx: 17, maks: 2 });
      if (urut.length > tampil.length) { y += 24; tulis(ctx, '+' + (urut.length - tampil.length) + ' kejadian lain (lebih singkat) tercatat di App WHL', x, y, 14, 400, C.samar); }
      return y - y0 + 34;
    } };
  }
  function seksiPatuh(d) {
    if (d.p2h == null && d.absensi == null) return null;
    return { judul: 'Kepatuhan P2H & Absensi', lukis: function (ctx, x, y, w) {
      var y0 = y;
      if (d.p2h != null) y += batangPatuh(ctx, x, y, w, 'P2H harian unit', d.p2h, d.targetPatuh) + 6;
      if (d.absensi != null) y += batangPatuh(ctx, x, y, w, 'Kehadiran (absensi)', d.absensi, d.targetPatuh) + 6;
      return y - y0 + 20;
    } };
  }
  function seksiVendor(d) {
    if (!d.vendor.length) return null;
    return { judul: 'Kunjungan Vendor', lukis: function (ctx, x, y, w) {
      return tabel(ctx, x, y, w, [{ j: 'Tanggal', l: 0.22 }, { j: 'Vendor', l: 0.16 }, { j: 'Catatan', l: 0.62 }],
        d.vendor.slice(0, 10).map(function (v) { return [v.tgl || '-', { t: v.nama, tebal: true }, v.catatan || '-']; }), { fpx: 17, maks: 3 }) + 30;
    } };
  }
  function seksiRencana(d) {
    if (!d.rencana.length) return null;
    return { judul: 'Rencana ' + (d.jenis === 'Bulanan' ? 'Bulan' : 'Minggu') + ' Berikutnya', lukis: function (ctx, x, y, w) {
      var y0 = y;
      d.rencana.forEach(function (r, i) {
        ctx.font = font(18, 400); var ln = bungkus(ctx, r, w - 52, 3);
        ctx.fillStyle = C.navy; kotak(ctx, x, y + 2, 32, 32, 4); ctx.fill(); tulis(ctx, String(i + 1), x + 16, y + 25, 16, 700, '#ffffff', 'center');
        ln.forEach(function (t, li) { tulis(ctx, t, x + 46, y + 26 + li * 29, 18, 400, C.teks); }); y += Math.max(44, ln.length * 29 + 16);
      });
      return y - y0 + 20;
    } };
  }

  /* ---------------- susun halaman ---------------- */
  /* buang = bagian yang dilepas supaya HARIAN tetap 1 halaman tanpa mengecilkan huruf */
  function daftarSeksi(d, opsi, buang) {
    buang = buang || {}; if (buang.ringkas) d = Object.assign({}, d, { ringkasan: '' });
    var cat = opsi && opsi.catatanDiGambar ? str(opsi.catatan) : '';
    var s = [seksiKesimpulan(d), seksiKartuKpi(d), buang.tabel ? null : seksiTabelKpi(d)];
    if (d.jenis === 'Harian') s.push(buang.grafik ? null : seksiGrafikHarian(d), seksiPerhatian(d, buang.isu1 ? 1 : buang.isu2 ? 2 : 3, buang.ditangani), seksiCatatan(cat));
    else { s.push(seksiPerhatian(d, 3), seksiCatatan(cat)); s = s.concat(seksiTren(d)); s.push(seksiTidakEfektif(d), seksiBd(d), seksiPatuh(d), seksiVendor(d), seksiRencana(d)); }
    return s.filter(Boolean);
  }
  function yMulai(hal) { return hal === 0 ? M + 124 : M + 56; }
  var GRAFIK_MIN = 190, GRAFIK_TAMBAH = 120;
  function susunSekali(d, opsi, u, buang) {
    var w = PW - M * 2, sek = daftarSeksi(d, opsi, buang), hal = [[]], y = yMulai(0), no = 0;
    sek.forEach(function (s) {
      if (s.judul) s.no = ++no;
      var hj = s.judul ? 60 : 0;
      s.h = hj + (s.fleks ? GRAFIK_MIN : s.lukis(u, M, 0, w));
      if (s.fleks) s.tinggiF = GRAFIK_MIN - 20;
      if ((s.baru && hal[hal.length - 1].length) || (y + s.h > BAWAH && hal[hal.length - 1].length && d.jenis !== 'Harian')) { hal.push([]); y = yMulai(hal.length - 1); }
      s.y = y; hal[hal.length - 1].push(s); y += s.h;
    });
    return { hal: hal, sisa: BAWAH - y };
  }
  function susun(d, opsi, mctx) {
    var u = pengukur(mctx), r = susunSekali(d, opsi, u, {});
    if (d.jenis !== 'Harian') return r.hal;
    /* harian: lepas bagian satu per satu sampai muat 1 halaman (tabel KPI dulu -> isinya sudah di kartu KPI; lalu grafik; isu tetap diutamakan) */
    var urutan = [{ tabel: 1 }, { tabel: 1, grafik: 1 }, { tabel: 1, grafik: 1, ditangani: 1 }, { tabel: 1, grafik: 1, ditangani: 1, isu2: 1 }, { tabel: 1, grafik: 1, ditangani: 1, isu2: 1, ringkas: 1 }, { tabel: 1, grafik: 1, ditangani: 1, isu1: 1, ringkas: 1 }];
    for (var i = 0; i < urutan.length && r.sisa < 0; i++) r = susunSekali(d, opsi, u, urutan[i]);
    /* sisa ruang -> grafik dipertinggi, seksi sesudahnya digeser */
    var p0 = r.hal[0], f = p0.filter(function (s) { return s.fleks; })[0];
    if (f && r.sisa > 0) { var tambah = Math.min(GRAFIK_TAMBAH, r.sisa), geser = false; f.tinggiF += tambah; f.h += tambah; p0.forEach(function (s) { if (geser) s.y += tambah; if (s === f) geser = true; }); }
    return r.hal;
  }
  function kepala(ctx, d, i, n) {
    var judul = d.perusahaan + ' — Laporan ' + d.jenis + ' Operasional', w = PW - M * 2;
    if (i === 0) {
      /* judul satu baris kalau muat; kalau tidak, dipecah di tanda pisah jadi 2 baris (huruf tidak dikecilkan) */
      ctx.font = font(24, 700);
      if (ctx.measureText(judul).width <= w) { tulis(ctx, judul, M, M + 50, 24, 700, C.navy); }
      else { tulis(ctx, d.perusahaan, M, M + 22, 16, 700, C.navy2); tulis(ctx, 'Laporan ' + d.jenis + ' Operasional', M, M + 54, 26, 700, C.navy); }
      ctx.font = font(16, 400); var sub = (d.periode ? 'Periode: ' + d.periode + '   |   ' : '') + 'Disusun: ' + d.nama + ', ' + d.jabatan;
      if (ctx.measureText(sub).width <= w) tulis(ctx, sub, M, M + 84, 16, 400, C.redup);
      else { tulis(ctx, 'Disusun: ' + d.nama + ', ' + d.jabatan, M, M + 84, 16, 400, C.redup); if (d.periode) tulis(ctx, d.periode, PW - M, M + 22, 16, 700, C.navy, 'right'); }
      ctx.fillStyle = C.navy; ctx.fillRect(M, M + 98, w, 3);
    } else {
      ctx.font = font(15, 700); var jp = bungkus(ctx, 'Laporan ' + d.jenis + ' Operasional', w * 0.62, 1)[0];
      tulis(ctx, jp, M, M + 20, 15, 700, C.navy); tulis(ctx, d.periode, PW - M, M + 20, 15, 400, C.redup, 'right');
      garis(ctx, M, M + 32, PW - M, M + 32, C.navy, 1.5);
    }
    garis(ctx, M, PH - 52, PW - M, PH - 52, C.garis, 1);
    tulis(ctx, 'Dibuat otomatis App WHL' + (d.dibuat ? ' \u00B7 ' + d.dibuat : ''), M, PH - 26, 14, 400, C.samar);
    tulis(ctx, 'Hal. ' + (i + 1) + ' / ' + n, PW - M, PH - 26, 14, 700, C.redup, 'right');
  }
  function lukisHalaman(ctx, d, hal, i) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, PW, PH); ctx.textBaseline = 'alphabetic';
    kepala(ctx, d, i, hal.length);
    var w = PW - M * 2;
    hal[i].forEach(function (s) {
      var y = s.y; if (s.judul) y += judulSeksi(ctx, s.no, s.judul, M, y, w);
      s.lukis(ctx, M, y, w, s.tinggiF);
    });
  }
  function kanvas() { var c = document.createElement('canvas'); c.width = Math.round(PW * SK); c.height = Math.round(PH * SK); return c; }
  function halaman(data, opsi) {
    if (typeof document === 'undefined') return Promise.reject(new Error('butuh browser (canvas)'));
    try {
      var d = normal(data); if (!d.dibuat) d.dibuat = sekarangWib();
      var m = document.createElement('canvas').getContext('2d'), hal = susun(d, opsi, m), out = [];
      for (var i = 0; i < hal.length; i++) { var c = kanvas(), ctx = c.getContext('2d'); ctx.scale(SK, SK); lukisHalaman(ctx, d, hal, i); out.push(c); }
      return Promise.resolve(out);
    } catch (e) { return Promise.reject(e); }
  }
  function keBlob(c, tipe, q) {
    return new Promise(function (ok, gagal) {
      if (c.toBlob) c.toBlob(function (b) { b ? ok(b) : gagal(new Error('Gambar gagal dibuat')); }, tipe, q);
      else { try { ok(new Blob([b64keBytes(c.toDataURL(tipe, q).split(',')[1])], { type: tipe })); } catch (e) { gagal(e); } }
    });
  }
  function b64keBytes(b64) { var bin = atob(b64), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function gambar(data, opsi) { return halaman(data, opsi).then(function (hs) { return keBlob(hs[0], 'image/png'); }); }

  /* ---------------- PDF 1.4 sederhana: tiap halaman = 1 gambar JPEG penuh A4 ---------------- */
  function rakitPdf(jpeg, judul) {
    var bagian = [], off = 0, xref = [], N = 3 + jpeg.length * 3;
    function tulisB(x) { var b; if (typeof x === 'string') { b = new Uint8Array(x.length); for (var i = 0; i < x.length; i++) b[i] = x.charCodeAt(i) & 255; } else b = x; bagian.push(b); off += b.length; }
    function hexUtf16(s) { var h = 'FEFF'; for (var i = 0; i < s.length; i++) h += ('000' + s.charCodeAt(i).toString(16).toUpperCase()).slice(-4); return '<' + h + '>'; }
    tulisB('%PDF-1.4\n%âãÏÓ\n');
    xref[1] = off; tulisB('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    var kids = []; for (var i = 0; i < jpeg.length; i++) kids.push((4 + i * 3) + ' 0 R');
    xref[2] = off; tulisB('2 0 obj\n<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + jpeg.length + ' >>\nendobj\n');
    xref[3] = off; tulisB('3 0 obj\n<< /Title ' + hexUtf16(judul || 'Laporan') + ' /Producer (App WHL) >>\nendobj\n');
    jpeg.forEach(function (j, i) {
      var p = 4 + i * 3, isi = 'q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';
      xref[p] = off; tulisB(p + ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ' + (p + 2) + ' 0 R >> >> /Contents ' + (p + 1) + ' 0 R >>\nendobj\n');
      xref[p + 1] = off; tulisB((p + 1) + ' 0 obj\n<< /Length ' + isi.length + ' >>\nstream\n' + isi + '\nendstream\nendobj\n');
      xref[p + 2] = off; tulisB((p + 2) + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + j.w + ' /Height ' + j.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + j.b.length + ' >>\nstream\n');
      tulisB(j.b); tulisB('\nendstream\nendobj\n');
    });
    var awalXref = off, t = 'xref\n0 ' + (N + 1) + '\n0000000000 65535 f \n';
    for (var k = 1; k <= N; k++) t += ('000000000' + xref[k]).slice(-10) + ' 00000 n \n';
    tulisB(t + 'trailer\n<< /Size ' + (N + 1) + ' /Root 1 0 R /Info 3 0 R >>\nstartxref\n' + awalXref + '\n%%EOF\n');
    var total = new Uint8Array(off), pos = 0; bagian.forEach(function (b) { total.set(b, pos); pos += b.length; });
    return total;
  }
  function pdf(data, opsi) {
    var d = normal(data);
    return halaman(data, opsi).then(function (hs) {
      var jp = hs.map(function (c) { return { w: c.width, h: c.height, b: b64keBytes(c.toDataURL('image/jpeg', 0.9).split(',')[1]) }; });
      return new Blob([rakitPdf(jp, 'Laporan ' + d.jenis + ' Operasional ' + d.periode)], { type: 'application/pdf' });
    });
  }

  /* ---------------- lembar di app ---------------- */
  var CSS = ''
    + '.wld-latar{position:fixed;inset:0;z-index:10050;background:rgba(5,14,28,.55);display:flex;align-items:flex-end;justify-content:center;animation:wldMuncul .18s ease-out}'
    + '.wld{width:100%;max-width:480px;max-height:94vh;max-height:94dvh;overflow:auto;-webkit-overflow-scrolling:touch;background:var(--panel,#fff);color:var(--teks,#0f1b2d);border-radius:22px 22px 0 0;box-shadow:0 -10px 34px rgba(0,0,0,.25);padding:10px 16px calc(16px + env(safe-area-inset-bottom));box-sizing:border-box;font-family:inherit}'
    + '.wld *{box-sizing:border-box}.wld [hidden]{display:none!important}'
    + '.wld-pegang{width:44px;height:5px;border-radius:3px;background:var(--garis,#d5dde8);margin:2px auto 10px}'
    + '.wld-kepala{display:flex;align-items:center;gap:10px;margin-bottom:10px}'
    + '.wld-kepala h3{flex:1;margin:0;font-size:17px;font-weight:800;line-height:1.25}'
    + '.wld-kepala small{display:block;font-size:12px;font-weight:600;color:var(--redup,#56677e)}'
    + '.wld-x{min-width:44px;min-height:44px;border:0;border-radius:12px;background:var(--panel2,#eef3fa);color:var(--teks,#0f1b2d);font-size:22px;font-weight:700;line-height:1;cursor:pointer}'
    + '.wld-hal{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;padding:2px 2px 8px;min-height:120px;position:relative}'
    + '.wld-hal img{flex:none;width:calc(100% - 28px);max-width:min(100%,calc(52vh * .707));aspect-ratio:1240/1754;scroll-snap-align:center;border-radius:6px;border:1px solid var(--garis,#e3eaf3);background:#fff;box-shadow:var(--bayang,0 6px 18px rgba(16,42,84,.1))}'
    + '.wld-hal img:only-child{margin:0 auto}'
    + '.wld-muat{flex:1;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:var(--redup,#56677e);min-height:200px}'
    + '.wld-info{font-size:12px;color:var(--redup,#56677e);text-align:center;margin-top:2px}'
    + '.wld-label{display:block;font-size:12.5px;font-weight:800;color:var(--redup,#56677e);margin:14px 0 6px;letter-spacing:.2px}'
    + '.wld textarea,.wld input[type=text]{width:100%;font:inherit;font-size:15px;line-height:1.45;color:var(--teks,#0f1b2d);background:var(--isian,#f3f6fb);border:1px solid var(--garis,#e3eaf3);border-radius:12px;padding:10px 12px;outline:none;resize:vertical}'
    + '.wld textarea{min-height:140px}'
    + '.wld textarea:focus,.wld input[type=text]:focus{border-color:var(--utama,#1565c0);box-shadow:0 0 0 3px rgba(21,101,192,.18)}'
    + '.wld-cek{display:flex;align-items:center;gap:10px;margin-top:8px;font-size:14px;font-weight:600;min-height:40px;cursor:pointer}'
    + '.wld-cek input{width:20px;height:20px;accent-color:var(--utama,#1565c0)}'
    + '.wld-tips{font-size:12px;color:var(--redup,#56677e);margin-top:4px;line-height:1.4}'
    + '.wld-aksi{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}'
    + '.wld-aksi button{min-height:50px;border:0;border-radius:14px;font:inherit;font-size:14.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 10px;line-height:1.15}'
    + '.wld-wa{grid-column:1/-1;background:#1faa59;color:#fff;box-shadow:0 6px 16px rgba(31,170,89,.28)}'
    + '.wld-wa:active,.wld-dua:active{transform:scale(.98)}'
    + '.wld-dua{background:var(--panel2,#eef3fa);color:var(--teks,#0f1b2d);border:1px solid var(--garis,#e3eaf3)!important}'
    + '.wld-aksi button[disabled]{opacity:.55}'
    + '.wld-aksi svg{flex:none;width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}'
    + '.wld-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:10060;background:#0f1b2d;color:#fff;font-size:14px;font-weight:700;padding:12px 18px;border-radius:14px;max-width:calc(100% - 32px);text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.3)}'
    + '@keyframes wldMuncul{from{opacity:0}to{opacity:1}}'
    + '@media (prefers-reduced-motion:reduce){.wld-latar{animation:none}}'
    + '@media (min-width:600px){.wld-latar{align-items:center}.wld{border-radius:22px;max-height:90vh}}';
  function pasangCss() { if (document.getElementById('wld-css')) return; var s = document.createElement('style'); s.id = 'wld-css'; s.textContent = CSS; document.head.appendChild(s); }
  var IK = {
    wa: '<svg viewBox="0 0 24 24"><path d="M4 20l1.3-4A8 8 0 1 1 8.4 19z"/><path d="M9 9.5c.3 2 2.2 4.3 4.6 5 .7.2 1.6-.5 1.8-1.2l-1.6-.9-.8.8c-1-.4-2-1.4-2.4-2.4l.8-.8-.9-1.6c-.7.2-1.5.6-1.5 1.1z" fill="currentColor" stroke="none"/></svg>',
    bagi: '<svg viewBox="0 0 24 24"><path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6"/></svg>',
    unduh: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    salin: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/></svg>'
  };
  var aktif = null;
  function toast(p) { var t = document.createElement('div'); t.className = 'wld-toast'; t.textContent = p; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2800); }
  function salinLama(s) { try { var ta = document.createElement('textarea'); ta.value = s; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:-1000px;opacity:0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); ta.remove(); return !!ok; } catch (e) { return false; } }
  function salinTeks(s) { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(s).then(function () { return true; }, function () { return salinLama(s); }); return Promise.resolve(salinLama(s)); }
  function namaBerkas(d, ext) { return ('Laporan-' + d.jenis + '-WHL-' + (d.periode || '')).replace(/[^A-Za-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/-$/, '') + '.' + ext; }
  function blobKeB64(blob) { return new Promise(function (ok, gagal) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1]); }; r.onerror = gagal; r.readAsDataURL(blob); }); }
  function unduhBlob(blob, nama) {
    if (root.WHL_BERKAS && typeof root.WHL_BERKAS.buka === 'function') return blobKeB64(blob).then(function (b64) { return root.WHL_BERKAS.buka(nama, b64, blob.type); });
    var u = URL.createObjectURL(blob), a = document.createElement('a'); a.href = u; a.download = nama; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 60000); return Promise.resolve('unduh');
  }
  function bukaWa(s) { var url = 'https:' + '/' + '/wa.me/?text=' + encodeURIComponent(s), w = null; try { w = root.open(url, '_blank'); } catch (e) { w = null; } if (!w) location.href = url; }
  function tutup() {
    if (!aktif) return false; var a = aktif; aktif = null;
    a.url.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) { /* */ } });
    document.removeEventListener('keydown', a.kunci); a.el.remove(); return true;
  }
  function buka(data) {
    if (typeof document === 'undefined') return null;
    tutup(); pasangCss();
    var d = normal(data), harian = d.jenis === 'Harian';
    var el = document.createElement('div'); el.className = 'wld-latar'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Laporan ' + d.jenis + ' ke direksi');
    el.innerHTML = '<div class="wld"><div class="wld-pegang"></div>'
      + '<div class="wld-kepala"><h3>Laporan ' + d.jenis + ' ke Direksi<small></small></h3><button type="button" class="wld-x" data-a="tutup" aria-label="Tutup">×</button></div>'
      + '<div class="wld-hal"><div class="wld-muat">Menyusun laporan…</div></div><div class="wld-info"></div>'
      + '<label class="wld-label" for="wld-teks">PESAN WA (BISA DIUBAH)</label><textarea id="wld-teks" rows="7"></textarea>'
      + '<label class="wld-label" for="wld-cat">CATATAN TAMBAHAN (OPSIONAL)</label>'
      + '<input type="text" id="wld-cat" maxlength="240" placeholder="mis. Besok koordinasi perbaikan jalan KM 12" autocomplete="off">'
      + '<label class="wld-cek"><input type="checkbox" id="wld-catgb"> Masukkan catatan ke laporan</label>'
      + '<div class="wld-tips">Catatan ikut di akhir pesan WA. Kalau teks tidak ikut terkirim bersama berkas, tinggal tempel (teks sudah disalin otomatis).</div>'
      + '<div class="wld-aksi">'
      + '<button type="button" class="wld-wa" data-a="wa" disabled>' + IK.wa + (harian ? 'Bagikan gambar ke WA' : 'Bagikan PDF ke WA') + '</button>'
      + '<button type="button" class="wld-dua" data-a="wa2" disabled>' + IK.bagi + (harian ? 'Bagikan PDF' : 'Bagikan gambar hal. 1') + '</button>'
      + '<button type="button" class="wld-dua" data-a="salin">' + IK.salin + 'Salin teks</button>'
      + '<button type="button" class="wld-dua" data-a="unduhPdf" disabled>' + IK.unduh + 'Unduh PDF</button>'
      + '<button type="button" class="wld-dua" data-a="unduhPng" disabled>' + IK.unduh + 'Unduh gambar</button>'
      + '</div></div>';
    el.querySelector('.wld-kepala small').textContent = [d.namaPendek, d.periode].filter(Boolean).join(' · ');
    var ta = el.querySelector('#wld-teks'), inCat = el.querySelector('#wld-cat'), cekGb = el.querySelector('#wld-catgb'), wadah = el.querySelector('.wld-hal'), info = el.querySelector('.wld-info');
    ta.value = teks(d, '');
    var st = { el: el, url: [], png: null, pdf: null, kunci: null, waktu: null, nomor: 0 }; aktif = st;
    var tombol = ['wa', 'wa2', 'unduhPdf', 'unduhPng'];
    function aktifkan(on) { tombol.forEach(function (a) { el.querySelector('[data-a=' + a + ']').disabled = !on; }); }
    function teksAkhir() { var t = ta.value.replace(/\s+$/, ''), c = str(inCat.value); return c && t.indexOf(c) < 0 ? t + '\nCatatan: ' + c : t; }
    function render() {
      var no = ++st.nomor, op = { catatan: inCat.value, catatanDiGambar: cekGb.checked }; aktifkan(false);
      return halaman(data, op).then(function (hs) {
        return Promise.all([keBlob(hs[0], 'image/png')].concat(hs.map(function (c) { return keBlob(c, 'image/jpeg', 0.85); }))).then(function (bl) {
          if (no !== st.nomor || aktif !== st) return;
          st.url.forEach(function (u) { URL.revokeObjectURL(u); }); st.url = [];
          st.png = bl[0]; wadah.innerHTML = '';
          bl.slice(1).forEach(function (b, i) { var u = URL.createObjectURL(b), im = document.createElement('img'); st.url.push(u); im.src = u; im.alt = 'Halaman ' + (i + 1); wadah.appendChild(im); });
          info.textContent = hs.length > 1 ? hs.length + ' halaman A4 · geser untuk melihat' : '1 halaman A4';
          var jp = hs.map(function (c) { return { w: c.width, h: c.height, b: b64keBytes(c.toDataURL('image/jpeg', 0.9).split(',')[1]) }; });
          st.pdf = new Blob([rakitPdf(jp, 'Laporan ' + d.jenis + ' Operasional ' + d.periode)], { type: 'application/pdf' });
          aktifkan(true);
        });
      }).catch(function (e) { wadah.innerHTML = '<div class="wld-muat"></div>'; wadah.firstChild.textContent = 'Laporan gagal dibuat: ' + (e && e.message || e); });
    }
    inCat.addEventListener('input', function () { if (cekGb.checked) { clearTimeout(st.waktu); st.waktu = setTimeout(render, 450); } });
    cekGb.addEventListener('change', render);
    function bagikan(blob, ext) {
      var s = teksAkhir(), nama = namaBerkas(d, ext); salinTeks(s);
      var f = null; try { f = new File([blob], nama, { type: blob.type }); } catch (e) { f = null; }
      var bisa = false; try { bisa = !!(f && navigator.share && navigator.canShare && navigator.canShare({ files: [f] })); } catch (e) { bisa = false; }
      if (bisa) return navigator.share({ files: [f], text: s, title: 'Laporan ' + d.jenis + ' Operasional' }).then(function () { toast('Dibagikan. Teks juga sudah disalin.'); }, function (e) { if (e && e.name === 'AbortError') return; return cadangan(blob, nama, s); });
      return cadangan(blob, nama, s);
    }
    function cadangan(blob, nama, s) {
      return unduhBlob(blob, nama).catch(function () { }).then(function () { toast('Berkas diunduh & teks disalin. Lampirkan berkas di WA.'); setTimeout(function () { bukaWa(s); }, 700); });
    }
    function simpan(blob, ext) { unduhBlob(blob, namaBerkas(d, ext)).then(function (r) { if (r === 'unduh' || r === 'android') toast('Berkas disimpan.'); }, function (e) { toast('Gagal menyimpan: ' + (e && e.message || e)); }); }
    el.addEventListener('click', function (ev) {
      if (ev.target === el) { tutup(); return; }
      var b = ev.target.closest('[data-a]'); if (!b || b.disabled) return;
      var a = b.getAttribute('data-a');
      if (a === 'tutup') tutup();
      else if (a === 'wa') bagikan(harian ? st.png : st.pdf, harian ? 'png' : 'pdf');
      else if (a === 'wa2') bagikan(harian ? st.pdf : st.png, harian ? 'pdf' : 'png');
      else if (a === 'unduhPdf') simpan(st.pdf, 'pdf');
      else if (a === 'unduhPng') simpan(st.png, 'png');
      else if (a === 'salin') salinTeks(teksAkhir()).then(function (ok) { toast(ok ? 'Teks disalin.' : 'Tidak bisa menyalin, tahan & salin manual.'); });
    });
    st.kunci = function (ev) { if (ev.key === 'Escape') tutup(); }; document.addEventListener('keydown', st.kunci);
    document.body.appendChild(el); render();
    return { tutup: tutup, el: el };
  }

  var api = { buka: buka, gambar: gambar, pdf: pdf, teks: function (data) { return teks(data); }, tutup: tutup,
    _uji: { normal: normal, fmt: fmt, ubah: ubah, halaman: halaman, rakitPdf: rakitPdf, susun: susun, PW: PW, PH: PH } };
  root.WHL_LAPORAN_DIREKSI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
