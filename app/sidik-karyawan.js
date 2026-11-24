/* WHL App — SIDIK WAJAH ABSEN dari foto ID card Data karyawan (absen-foto-karyawan-baru-24nov, Hesti 24 Nov 2026).
 * Keluhan Pak Fanza: karyawan baru (NOPRI ANSAH) fotonya sudah diupload di Data karyawan, tapi absen mandiri bilang "ID card kamu belum ada fotonya".
 * Sebab: absen mandiri (Absensi Mandiri.gs) cuma kenal sidik wajah dari WajahRef.gs (dibuat sekali dari kartu cetak). Foto Data karyawan
 *   tidak pernah diubah jadi sidik wajah.
 * Modul ini (HANYA jalan di HP Fanza / Reza / Rike, saat menu Data karyawan dipakai):
 *   1. Foto ID baru disimpan -> sidik wajah (128 angka) dihitung DI HP dari foto itu -> dikirim ke Absensi (abmSidikSimpan).
 *   2. Menu Data karyawan dibuka -> tanya Absensi siapa staf yang belum punya sidik (abmSidikPerlu) -> foto ID-nya diambil dari DASHBOARD
 *      (pusatKbFoto, sudah ada) -> sidik dihitung -> dikirim. Jalan di belakang layar, 1 orang sekali.
 * Mesin: @vladmandic/face-api 1.7.13, SsdMobilenetv1 + Landmark68 + FaceRecognitionNet (= mesin WajahRef.gs, jadi skornya sebanding).
 * Yang dikirim ke Absensi cuma 128 angka (bukan foto). Foto tetap di DASHBOARD. Tidak ada yang disimpan di HP.
 * Server: Absensi SidikWajahApp.gs (abmSidikPerlu [tokenAbm], abmSidikSimpan [tokenAbm, {id, sidik, foto, skor, paksa}]).
 */
(function () {
  'use strict';
  var IZIN = ['WHL01001', 'WHL01003', 'WHL01010'];
  var SUMBER = ['https:' + '/' + '/cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13', 'https:' + '/' + '/unpkg.com/@vladmandic/face-api@1.7.13'];
  var JEDA_CEK_MS = 10 * 60000;
  var siapJanji = null, jalan = null, terakhir = 0, gagalSesi = {}, st = { proses: false, selesai: [], gagal: [], pesan: '' };

  function kunci(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function admin(S) { var u = S && S.user; if (!u || u.peran === 'driver') return false; return [S.idProfil, S.idKetik, u.nrp, u.id].some(function (x) { return x && IZIN.indexOf(kunci(x)) >= 0; }); }
  function konfig() { return window.WHL_KONFIG || {}; }
  function batas(j, ms, pesan) { return new Promise(function (ok, gagal) { var t = setTimeout(function () { gagal(new Error(pesan)); }, ms); j.then(function (v) { clearTimeout(t); ok(v); }, function (e) { clearTimeout(t); gagal(e); }); }); }

  /* ---------- server ---------- */
  function abm(fn, args, ms) {
    var url = konfig().ABSEN; if (!url) return Promise.reject(new Error('Alamat Absensi belum ada.'));
    return batas(fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ api: 'abm', fn: fn, args: args || [] }), redirect: 'follow', cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (b) { if (!b || !b.ok) throw new Error((b && (b.pesan || b.error)) || 'Absensi menolak'); return b.hasil || {}; }), ms || 30000, 'Absensi lama menjawab.');
  }
  function pusat(S, fn, args, ms) { var API = window.WHL_API; return API.Pusat.panggil(fn, [S.tokenPusat].concat(args || []), ms || 45000); }

  /* ---------- mesin wajah (dimuat sekali, hanya kalau perlu) ---------- */
  function pasangSkrip(url) {
    return new Promise(function (ok, gagal) {
      if (window.faceapi) { ok(); return; }
      var sc = document.createElement('script'); sc.src = url; sc.async = true;
      sc.onload = function () { window.faceapi ? ok() : gagal(new Error('library wajah rusak')); };
      sc.onerror = function () { try { sc.remove(); } catch (e) { /* */ } gagal(new Error('library wajah gagal dimuat')); };
      document.head.appendChild(sc);
    });
  }
  function siap() {
    if (siapJanji) return siapJanji;
    var coba = function (i) {
      if (i >= SUMBER.length) return Promise.reject(new Error('Mesin wajah tidak bisa diunduh (sinyal?).'));
      var b = SUMBER[i];
      return pasangSkrip(b + '/dist/face-api.js').then(function () {
        var M = b + '/model/', n = window.faceapi.nets;
        return batas(Promise.all([n.ssdMobilenetv1.loadFromUri(M), n.faceLandmark68Net.loadFromUri(M), n.faceRecognitionNet.loadFromUri(M)]), 120000, 'model wajah terlalu lama dimuat');
      }).catch(function () { return coba(i + 1); });
    };
    siapJanji = coba(0).catch(function (e) { siapJanji = null; throw e; });
    return siapJanji;
  }
  function gambar(src) { return new Promise(function (ok, gagal) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { gagal(new Error('foto tidak terbaca')); }; im.src = src; }); }
  function kanvas(im, skala) {
    var w = im.naturalWidth || im.width, h = im.naturalHeight || im.height, s = Math.min(1, 900 / Math.max(w, h)) * (skala || 1);
    var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height); return c;
  }
  /** dataUrl foto -> {v:[128], skor} (wajah terbesar) atau error 'wajah tidak terbaca'. */
  function sidikDari(src) {
    return siap().then(function () { return gambar(src); }).then(function (im) {
      var fa = window.faceapi, ops = new fa.SsdMobilenetv1Options({ minConfidence: 0.3 });
      var cari = function (c) { return fa.detectAllFaces(c, ops).withFaceLandmarks().withFaceDescriptors(); };
      var kecil = Math.max(im.naturalWidth || im.width, im.naturalHeight || im.height) < 450;
      return cari(kanvas(im, kecil ? 2 : 1)).then(function (d) { return d && d.length ? d : (kecil ? d : cari(kanvas(im, 2))); });
    }).then(function (d) {
      if (!d || !d.length) throw new Error('wajah tidak terbaca di foto ID');
      var p = d.slice().sort(function (a, b) { return b.detection.box.width * b.detection.box.height - a.detection.box.width * a.detection.box.height; })[0];
      return { v: Array.prototype.map.call(p.descriptor, function (x) { return Math.round(x * 1e4) / 1e4; }), skor: Math.round(p.detection.score * 100) / 100 };
    });
  }

  /* ---------- 1. sesudah foto ID baru disimpan ---------- */
  function setelahSimpan(S, id, src, fotoId, roti) {
    if (!admin(S) || !S.tokenAbm || !id || !/^WHL-?01\d{3}$/i.test(String(id)) || !src) return Promise.resolve(null);
    return sidikDari(src).then(function (x) { return abm('abmSidikSimpan', [S.tokenAbm, { id: id, sidik: x.v, skor: x.skor, foto: fotoId || '', paksa: true }], 30000); })
      .then(function (h) { if (h && h.ok && !h.lewat && roti) roti('✓ ' + (h.pesan || 'Absen mandiri siap.')); else if (h && !h.ok && roti) roti('Absen wajah: ' + (h.pesan || 'gagal')); return h; })
      .catch(function (e) { if (roti) roti('Absen wajah ' + id + ' belum siap: ' + ((e && e.message) || e) + '. Dicoba lagi saat Data karyawan dibuka.'); return null; });
  }

  /* ---------- 2. isi otomatis yang belum punya sidik ---------- */
  function otomatis(S, roti, paksa) {
    if (!admin(S)) return Promise.resolve(null);
    if (!S.tokenAbm) return Promise.resolve(null); // admin belum aktif absen di HP ini -> lewati diam-diam
    if (jalan) return jalan;
    if (!paksa && Date.now() - terakhir < JEDA_CEK_MS) return Promise.resolve(null);
    terakhir = Date.now(); st = { proses: true, selesai: [], gagal: [], pesan: '' };
    jalan = abm('abmSidikPerlu', [S.tokenAbm], 30000).then(function (h) {
      if (!h || !h.ok) { st.pesan = (h && h.pesan) || 'Absensi menolak'; return null; }
      var L = (h.perlu || []).filter(function (p) { return !gagalSesi[p.id]; });
      var urut = Promise.resolve();
      L.forEach(function (p) {
        urut = urut.then(function () {
          return pusat(S, 'pusatKbFoto', [p.id, 'ID'], 45000).then(function (f) {
            if (!f || !f.ok) throw new Error('foto ID belum ada');
            return sidikDari('data:' + f.mime + ';base64,' + f.b64);
          }).then(function (x) { return abm('abmSidikSimpan', [S.tokenAbm, { id: p.id, sidik: x.v, skor: x.skor }], 30000); })
            .then(function (r) { if (r && r.ok) st.selesai.push(p.nama || p.id); else { gagalSesi[p.id] = 1; st.gagal.push((p.nama || p.id) + ' (' + ((r && r.pesan) || 'ditolak') + ')'); } })
            .catch(function (e) { gagalSesi[p.id] = 1; st.gagal.push((p.nama || p.id) + ' (' + ((e && e.message) || e) + ')'); });
        });
      });
      return urut.then(function () {
        if (roti && st.selesai.length) roti('✓ Absen mandiri siap untuk: ' + st.selesai.join(', ') + '.' + (st.gagal.length ? ' Belum: ' + st.gagal.join('; ') + '.' : ''));
        else if (roti && st.gagal.length && paksa) roti('Absen wajah belum bisa: ' + st.gagal.join('; ') + '.');
        return st;
      });
    }).catch(function (e) { st.pesan = (e && e.message) || String(e); return null; })
      .then(function (r) { st.proses = false; jalan = null; return r; });
    return jalan;
  }
  function lupakan() { gagalSesi = {}; terakhir = 0; st = { proses: false, selesai: [], gagal: [], pesan: '' }; }

  window.WHL_SIDIK = { otomatis: otomatis, setelahSimpan: setelahSimpan, lupakan: lupakan, status: function () { return st; }, _uji: { sidikDari: sidikDari, admin: admin } };
})();
