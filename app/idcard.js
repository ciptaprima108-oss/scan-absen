/* v3.47 (23 Nov, Pak Fanza: "Foto ID card itu langsung kamu yang bikin, kita masukin datanya aja") — WHL_IDCARD.
 * Kartu ID card resmi WHL dirakit DI HP (canvas) dari data + foto wajah. Desain = kartu resmi IDCardWHL\kartu-8nov
 * (template kosong img/idcard-depan.jpg & img/idcard-belakang.jpg, dibuat Upgrade\foto-zoom-23nov\idcard\buat-template.py,
 * posisi teks sama dengan buat_idcard.py: nama y848, pita jabatan 892-952, NIK KARYAWAN y985, ID y1030; belakang QR 484px di (168,256)).
 * Foto wajah TIDAK diubah isinya (tanpa AI): cuma dipotong (crop) ke bingkai + latar boleh diputihkan (isi warna dari tepi foto).
 *   WHL_IDCARD.muat(src)                       -> Promise<HTMLImageElement>
 *   WHL_IDCARD.siapkan(img)                    -> {asli, putih|null, sarankanPutih, kotak:{x,y,w,h}|null}  (kanvas, maks 1400 px)
 *   WHL_IDCARD.aturAwal(info, putih)           -> {s, px, py}  posisi awal otomatis (kepala di atas, badan di tengah)
 *   WHL_IDCARD.gambarBingkai(ctx, W, H, sumber, at)  gambar foto ke bingkai (cover + geser/zoom)
 *   WHL_IDCARD.potret(sumber, at)              -> dataURL JPEG 752x936 (foto ID card yang disimpan ke server)
 *   WHL_IDCARD.pasangEditor(kanvas, ambil, ubah) -> geser 1 jari / cubit 2 jari / roda mouse di kanvas bingkai
 *   WHL_IDCARD.kartu({id, nama, jabatan}, srcPotret) -> Promise<{depan, belakang}> dataURL PNG 820x1296
 */
(function () {
  'use strict';
  var FW = 376, FH = 468, BOX = [220, 312], KW = 820, KH = 1296, NAVY = '#0b1a33', KUNING = '#f5b400';
  var SANS = 'Arial, "Helvetica Neue", Helvetica, Roboto, "Segoe UI", sans-serif', MONO = 'Consolas, "Roboto Mono", Menlo, "Courier New", monospace';
  var TPL = {};
  function muat(src) {
    return new Promise(function (ok, gagal) {
      var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { gagal(new Error('Gambar tidak bisa dibaca.')); }; im.src = src;
    });
  }
  function tpl(n) { return TPL[n] || (TPL[n] = muat('img/idcard-' + n + '.jpg').catch(function (e) { delete TPL[n]; throw e; })); }
  function kanvas(w, h) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }

  /* ---------- latar putih: isi wilayah yang menyambung ke tepi foto & warnanya mirip tepi ---------- */
  function topeng(img) {
    var M = 360, r = Math.min(1, M / Math.max(img.width, img.height)), w = Math.max(8, Math.round(img.width * r)), h = Math.max(8, Math.round(img.height * r));
    var c = kanvas(w, h), x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h);
    var d = x.getImageData(0, 0, w, h).data, n = w * h, bg = new Uint8Array(n), sr = new Float32Array(n * 3), q = new Int32Array(n), qa = 0, qb = 0;
    function jarak(i, r0, g0, b0) { var a = i * 4, dr = d[a] - r0, dg = d[a + 1] - g0, db = d[a + 2] - b0; return Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11) * 1.7; }
    function benih(i) { if (bg[i]) return; bg[i] = 1; var a = i * 4; sr[i * 3] = d[a]; sr[i * 3 + 1] = d[a + 1]; sr[i * 3 + 2] = d[a + 2]; q[qb++] = i; }
    var tepi = 0;
    /* benih: tepi ATAS + kiri/kanan 65% atas. Tepi bawah TIDAK (badan/baju menyentuh bawah foto, jangan ikut diputihkan) */
    for (var i = 0; i < w; i++) benih(i);
    for (var j = 0; j < Math.round(h * 0.65); j++) { benih(j * w); benih(j * w + w - 1); }
    tepi = qb;
    while (qa < qb) {
      var p = q[qa++], px = p % w, py = (p - px) / w, a0 = p * 4;
      var tet = [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, py > 0 ? p - w : -1, py < h - 1 ? p + w : -1];
      for (var k = 0; k < 4; k++) {
        var t = tet[k]; if (t < 0 || bg[t]) continue;
        if (jarak(t, d[a0], d[a0 + 1], d[a0 + 2]) > 15) continue; /* tetangga harus mirip */
        if (jarak(t, sr[p * 3], sr[p * 3 + 1], sr[p * 3 + 2]) > 55) continue; /* dan tidak jauh dari warna tepi asalnya */
        bg[t] = 1; sr[t * 3] = sr[p * 3]; sr[t * 3 + 1] = sr[p * 3 + 1]; sr[t * 3 + 2] = sr[p * 3 + 2]; q[qb++] = t;
      }
    }
    /* pinggiran (rambut/bahu) yang masih bercampur warna latar: 2 putaran, ambang lebih longgar, cuma piksel yang menempel latar */
    for (var ul = 0; ul < 2; ul++) {
      var tambah = [];
      for (i = 0; i < n; i++) {
        if (bg[i]) continue; var ix = i % w, tt = [ix > 0 ? i - 1 : -1, ix < w - 1 ? i + 1 : -1, i - w, i + w];
        for (k = 0; k < 4; k++) { var u2 = tt[k]; if (u2 < 0 || u2 >= n || !bg[u2]) continue; if (jarak(i, sr[u2 * 3], sr[u2 * 3 + 1], sr[u2 * 3 + 2]) < 95) { tambah.push(i, u2); break; } }
      }
      for (k = 0; k < tambah.length; k += 2) { var t3 = tambah[k], s3 = tambah[k + 1]; bg[t3] = 1; sr[t3 * 3] = sr[s3 * 3]; sr[t3 * 3 + 1] = sr[s3 * 3 + 1]; sr[t3 * 3 + 2] = sr[s3 * 3 + 2]; }
    }
    /* tepi foto yang ikut latar (kalau latar polos hampir semua tepi ikut) */
    var nb = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (i = 0; i < n; i++) { if (bg[i]) nb++; else { var cx = i % w, cy = (i - cx) / w; if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy; } }
    var rasio = nb / n, keliling = w + 2 * Math.round(h * 0.65);
    /* rata tepi topeng (lebar 1 px) supaya pinggiran lembut */
    var m = kanvas(w, h), mx = m.getContext('2d'), md = mx.createImageData(w, h);
    for (i = 0; i < n; i++) { var aa = i * 4; md.data[aa] = md.data[aa + 1] = md.data[aa + 2] = 255; md.data[aa + 3] = bg[i] ? 255 : 0; }
    mx.putImageData(md, 0, 0);
    return { kanvas: m, rasio: rasio, tepiPenuh: tepi >= keliling * 0.9, kotak: x1 >= 0 ? { x: x0 / w, y: y0 / h, w: (x1 - x0 + 1) / w, h: (y1 - y0 + 1) / h } : null };
  }
  function siapkan(img) {
    var r = Math.min(1, 1400 / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height)), w = (img.naturalWidth || img.width) * r, h = (img.naturalHeight || img.height) * r;
    var asli = kanvas(w, h); asli.getContext('2d').drawImage(img, 0, 0, asli.width, asli.height);
    var t = null; try { t = topeng(asli); } catch (e) { t = null; }
    var putih = null, saran = false;
    if (t && t.rasio > 0.08 && t.rasio < 0.85) {
      putih = kanvas(asli.width, asli.height); var px = putih.getContext('2d');
      px.drawImage(asli, 0, 0);
      px.filter = 'blur(' + Math.max(1, Math.round(asli.width / 300)) + 'px)'; /* pinggiran halus (browser tanpa filter: tetap jalan) */
      px.imageSmoothingEnabled = true; px.drawImage(t.kanvas, 0, 0, asli.width, asli.height); px.filter = 'none';
      saran = t.rasio > 0.15 && t.rasio < 0.75;
    }
    var k = t && t.kotak && t.kotak.w > 0.12 && t.kotak.h > 0.2 && t.rasio > 0.08 && t.rasio < 0.85 ? t.kotak : null;
    return { asli: asli, putih: putih, sarankanPutih: saran, kotak: k, rasio: t ? t.rasio : 0 };
  }

  /* ---------- posisi foto di bingkai: s = zoom (1 = pas menutup bingkai), px/py = geser (satuan bingkai) ---------- */
  function ukur(sumber, at, W, H) {
    var w = sumber.width, h = sumber.height, k = Math.max(W / w, H / h) * at.s;
    return { k: k, dw: w * k, dh: h * k };
  }
  function jepit(sumber, at, W, H) {
    W = W || FW; H = H || FH;
    if (!(at.s >= 1)) at.s = 1; if (at.s > 5) at.s = 5;
    var u = ukur(sumber, at, W, H), mx = (u.dw - W) / 2, my = (u.dh - H) / 2;
    at.px = Math.max(-mx, Math.min(mx, at.px || 0)); at.py = Math.max(-my, Math.min(my, at.py || 0));
    return at;
  }
  /* awal otomatis: badan (kotak non-latar) mengisi ±90% lebar, kepala ±6% dari atas; tanpa kotak = atas foto (seperti skrip kartu lama) */
  function aturAwal(info, pakaiPutih) {
    var src = info.asli, at = { s: 1, px: 0, py: 0 }, w = src.width, h = src.height, k0 = Math.max(FW / w, FH / h);
    var kt = info.kotak;
    if (kt) {
      var bw = kt.w * w, s = Math.max(1, Math.min(3, (FW * 0.9) / (bw * k0))); at.s = s;
      var k = k0 * s, cx = (kt.x + kt.w / 2) * w * k, ty = kt.y * h * k;
      at.px = w * k / 2 - cx; at.py = (h * k - FH) / 2 - (ty - FH * 0.06);
    } else {
      at.py = (h * k0 - FH) / 2; /* rata atas */
    }
    return jepit(src, at);
  }
  function gambarBingkai(ctx, W, H, sumber, at) {
    var a = jepit(sumber, { s: at.s, px: at.px * W / FW, py: at.py * H / FH }, W, H), u = ukur(sumber, a, W, H);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sumber, (W - u.dw) / 2 + a.px, (H - u.dh) / 2 + a.py, u.dw, u.dh);
  }
  function potret(sumber, at) { var c = kanvas(FW * 2, FH * 2); gambarBingkai(c.getContext('2d'), c.width, c.height, sumber, at); return c.toDataURL('image/jpeg', 0.9); }

  /* ---------- editor: geser / cubit di kanvas bingkai ---------- */
  function pasangEditor(cv, ambil, ubah) {
    var P = {}, awal = null;
    function titik(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * FW / r.width, y: (e.clientY - r.top) * FH / r.height }; }
    function daftar() { return Object.keys(P).map(function (k) { return P[k]; }); }
    function mulai() {
      var a = daftar(), S = ambil(); if (!S) { awal = null; return; }
      if (a.length >= 2) awal = { n: 2, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, mx: (a[0].x + a[1].x) / 2, my: (a[0].y + a[1].y) / 2, s: S.at.s, px: S.at.px, py: S.at.py };
      else if (a.length === 1) awal = { n: 1, x: a[0].x, y: a[0].y, px: S.at.px, py: S.at.py };
      else awal = null;
    }
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', function (e) { try { cv.setPointerCapture(e.pointerId); } catch (er) { /* */ } P[e.pointerId] = titik(e); mulai(); e.preventDefault(); });
    cv.addEventListener('pointermove', function (e) {
      if (!P[e.pointerId] || !awal) return; P[e.pointerId] = titik(e); var a = daftar(), S = ambil(); if (!S) return;
      if (awal.n === 2 && a.length >= 2) {
        var d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, mx = (a[0].x + a[1].x) / 2, my = (a[0].y + a[1].y) / 2, s = Math.max(1, Math.min(5, awal.s * d / awal.d)), f = s / awal.s;
        /* titik di bawah jari tetap (koordinat relatif tengah bingkai) */
        S.at.s = s; S.at.px = (mx - FW / 2) - ((awal.mx - FW / 2) - awal.px) * f; S.at.py = (my - FH / 2) - ((awal.my - FH / 2) - awal.py) * f;
      } else if (awal.n === 1 && a.length === 1) { S.at.px = awal.px + (a[0].x - awal.x); S.at.py = awal.py + (a[0].y - awal.y); }
      jepit(S.sumber, S.at); ubah(); e.preventDefault();
    });
    function lepas(e) { if (!P[e.pointerId]) return; delete P[e.pointerId]; mulai(); }
    cv.addEventListener('pointerup', lepas); cv.addEventListener('pointercancel', lepas);
    ['gesturestart', 'gesturechange'].forEach(function (n) { cv.addEventListener(n, function (e) { e.preventDefault(); }); });
    cv.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    cv.addEventListener('wheel', function (e) { e.preventDefault(); var S = ambil(); if (!S) return; zoom(S, e.deltaY < 0 ? 1.12 : 1 / 1.12); ubah(); }, { passive: false });
  }
  function zoom(S, f) { var s = Math.max(1, Math.min(5, S.at.s * f)), r = s / S.at.s; S.at.s = s; S.at.px *= r; S.at.py *= r; jepit(S.sumber, S.at); }

  /* ---------- kartu ---------- */
  function hurufJarak(ctx, teks, jarak) { var l = 0; for (var i = 0; i < teks.length; i++) l += ctx.measureText(teks[i]).width; return l + jarak * Math.max(0, teks.length - 1); }
  function tulisJarak(ctx, cx, cy, teks, jarak) {
    var x = cx - hurufJarak(ctx, teks, jarak) / 2; ctx.textAlign = 'left';
    for (var i = 0; i < teks.length; i++) { ctx.fillText(teks[i], x, cy); x += ctx.measureText(teks[i]).width + jarak; }
  }
  function pasFont(ctx, teks, berat, ukuran, keluarga, maks, jarak) {
    var u = ukuran; do { ctx.font = berat + ' ' + u + 'px ' + keluarga; if (hurufJarak(ctx, teks, jarak || 0) <= maks) break; u -= 1; } while (u > 16);
    return u;
  }
  function sudut(ctx, w, h, r) { ctx.beginPath(); ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r); ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.closePath(); }
  function pil(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function urlProfil(id) { var K = window.WHL_KONFIG || {}; return K.INPUTDO ? K.INPUTDO + '?mode=profil&id=' + encodeURIComponent(id) : String(id); }
  function kartu(d, srcPotret) {
    d = d || {}; var id = String(d.id || 'WHL-0????').toUpperCase(), nama = String(d.nama || '-').toUpperCase().trim(), jab = String(d.jabatan || '-').toUpperCase().trim();
    return Promise.all([tpl('depan'), tpl('belakang'), srcPotret ? muat(srcPotret) : Promise.resolve(null)]).then(function (a) {
      /* DEPAN */
      var c = kanvas(KW, KH), x = c.getContext('2d');
      x.save(); sudut(x, KW, KH, 44); x.clip(); x.drawImage(a[0], 0, 0, KW, KH);
      if (a[2]) {
        var w = a[2].naturalWidth, h = a[2].naturalHeight, k = Math.max(FW / w, FH / h), dw = w * k, dh = h * k; /* sama dgn pasang_foto: penuh lebar, rata atas */
        x.save(); x.beginPath(); x.rect(BOX[0], BOX[1], FW, FH); x.clip(); x.imageSmoothingQuality = 'high'; x.drawImage(a[2], BOX[0] + (FW - dw) / 2, BOX[1], dw, dh); x.restore();
      } else { x.fillStyle = '#cbd5e1'; x.font = 'bold 120px ' + SANS; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(nama.split(/\s+/).slice(0, 2).map(function (s) { return s.charAt(0); }).join(''), BOX[0] + FW / 2, BOX[1] + FH / 2); }
      x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillStyle = NAVY;
      pasFont(x, nama, 'bold', 44, SANS, 640, 0); x.fillText(nama, 410, 848);
      var uj = pasFont(x, jab, 'bold', 30, SANS, 600, 4), lb = hurufJarak(x, jab, 4), pw = Math.min(700, Math.max(300, lb + 90));
      x.fillStyle = KUNING; pil(x, 410 - pw / 2, 892, pw, 60, 30); x.fill();
      x.fillStyle = NAVY; x.font = 'bold ' + uj + 'px ' + SANS; tulisJarak(x, 410, 922, jab, 4);
      x.fillStyle = 'rgb(100,116,139)'; x.font = 'bold 22px ' + SANS; tulisJarak(x, 410, 985, 'NIK KARYAWAN', 5);
      x.fillStyle = NAVY; pasFont(x, id, 'bold', 50, MONO, 600, 2); tulisJarak(x, 410, 1030, id, 2);
      x.restore();
      /* BELAKANG */
      var b = kanvas(KW, KH), y = b.getContext('2d');
      y.save(); sudut(y, KW, KH, 44); y.clip(); y.drawImage(a[1], 0, 0, KW, KH);
      if (window.WHL_QR && window.WHL_QR.matriks) {
        var m = window.WHL_QR.matriks(urlProfil(id), 'M'), sel = 484 / m.n; y.fillStyle = '#000';
        for (var r = 0; r < m.n; r++) for (var s = 0; s < m.n; s++) if (m.data[r * m.n + s]) y.fillRect(Math.floor(168 + s * sel), Math.floor(256 + r * sel), Math.ceil(sel), Math.ceil(sel));
      }
      y.textBaseline = 'middle'; y.textAlign = 'center';
      y.fillStyle = 'rgb(255,211,107)'; pasFont(y, id, 'bold', 58, MONO, 640, 3); tulisJarak(y, 410, 817, id, 3);
      y.fillStyle = '#fff'; pasFont(y, nama, 'bold', 38, SANS, 720, 0); y.textAlign = 'center'; y.fillText(nama, 410, 880);
      y.fillStyle = 'rgb(200,214,235)'; pasFont(y, jab, 'normal', 32, SANS, 720, 0); y.textAlign = 'center'; y.fillText(jab, 410, 918);
      y.restore();
      return { depan: c.toDataURL('image/png'), belakang: b.toDataURL('image/png') };
    });
  }

  window.WHL_IDCARD = { muat: muat, siapkan: siapkan, aturAwal: aturAwal, jepit: jepit, zoom: zoom, gambarBingkai: gambarBingkai, potret: potret, pasangEditor: pasangEditor, kartu: kartu, urlProfil: urlProfil, BINGKAI: [FW, FH] };
})();
