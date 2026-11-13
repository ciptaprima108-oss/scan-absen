/* WHL App v3.9 — MASUK PAKAI BIOMETRIK HP (Face ID / Touch ID / sidik jari / wajah bawaan HP). BUKAN pindai wajah absen.
 * Login pertama tetap ID card + PIN Pusat. Sesudah itu sesi (token Pusat & absen) disimpan TERENKRIPSI di HP; kuncinya hanya bisa
 * dipakai sesudah verifikasi biometrik di HP itu. Data biometrik tidak pernah keluar dari HP (yang memeriksa = sistem Android / iOS).
 *  - APK Android : jembatan native (Biometrik.java): kunci AES-GCM di penyimpan kunci aman Android, wajib BiometricPrompt kelas kuat per pemakaian,
 *                  gugur otomatis kalau sidik jari / wajah di HP ditambah.
 *  - PWA iPhone  : WebAuthn passkey platform (Face ID / Touch ID), terikat domain app. Kalau ekstensi PRF ada (iOS 18+), kunci enkripsi
 *                  DITURUNKAN dari passkey (tanpa Face ID tidak bisa dibuka). Kalau PRF tidak ada: kunci AES tak-terekspor di IndexedDB
 *                  dan Face ID hanya jadi GERBANG di app (lebih lemah; dijelaskan di layar).
 * Server tetap memeriksa token seperti biasa: token kedaluwarsa / PIN diganti / akun dinonaktifkan -> biometrik gugur, minta PIN lagi.
 */
(function () {
  'use strict';
  var Simpan = window.WHL_API.Simpan, DAFTAR = 'whlBioDaftar', MINTA = {}, nomor = 0;
  function jb() { var a = window.AndroidDownloader; return a && typeof a.bioAda === 'function' ? a : null; }
  function kunciAkun(id) { return String(id || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function b64(buf) { var s = '', b = new Uint8Array(buf); for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64(t) { t = String(t).replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; var s = atob(t), b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
  function acak(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return a; }

  /* ---------- daftar akun yang memakai biometrik di HP ini (tanpa token; token ada di blob terenkripsi) ---------- */
  function daftar() { return Simpan.ambil(DAFTAR).then(function (v) { try { var a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }); }
  function taruhDaftar(a) { return Simpan.taruh(DAFTAR, JSON.stringify(a.slice(0, 5))); }
  function info(id) { var k = kunciAkun(id); return daftar().then(function (a) { return a.filter(function (x) { return x.k === k; })[0] || null; }); }

  /* ---------- ketersediaan ---------- */
  function tersedia() {
    var a = jb();
    if (a) { var h = 'tidak'; try { h = String(a.bioAda()); } catch (e) { /* */ } return Promise.resolve({ ada: h === 'ya', jenis: 'android', label: 'sidik jari / wajah HP', alasan: h === 'ya' ? '' : h === 'belum' ? 'Belum ada sidik jari / wajah terdaftar di HP ini (Setelan > Keamanan).' : 'HP ini tidak punya biometrik yang cukup aman.' }); }
    if (!window.PublicKeyCredential || !window.isSecureContext || !crypto || !crypto.subtle) return Promise.resolve({ ada: false, jenis: 'web', alasan: 'Peramban ini tidak mendukung passkey.' });
    return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(function (ok) {
      var ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
      return { ada: !!ok, jenis: 'web', label: ios ? 'Face ID / Touch ID' : 'sidik jari / wajah HP', alasan: ok ? '' : 'Face ID / Touch ID belum aktif di perangkat ini.' };
    }, function () { return { ada: false, jenis: 'web', alasan: 'Passkey tidak tersedia.' }; });
  }

  /* ---------- Android: panggil native, jawaban lewat window.WHL_BIO_HASIL ---------- */
  window.WHL_BIO_HASIL = function (id, ok, isi) { var m = MINTA[id]; if (!m) return; delete MINTA[id]; if (ok) m.ok(isi); else m.gagal(new Error(isi || 'dibatalkan')); };
  function asli(fn, args) { return new Promise(function (ok, gagal) { var id = 'b' + (++nomor); MINTA[id] = { ok: ok, gagal: gagal }; try { jb()[fn].apply(jb(), [id].concat(args)); } catch (e) { delete MINTA[id]; gagal(e); } }); }

  /* ---------- Web: WebAuthn + PRF ---------- */
  var GARAM = new TextEncoder().encode('WHL-APP-BIOMETRIK-v1');
  function db() { return new Promise(function (ok, gagal) { var r = indexedDB.open('whl-bio', 1); r.onupgradeneeded = function () { r.result.createObjectStore('kunci'); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { gagal(r.error); }; }); }
  function idb(mode, fn) { return db().then(function (d) { return new Promise(function (ok, gagal) { var t = d.transaction('kunci', mode), s = t.objectStore('kunci'), r = fn(s); t.oncomplete = function () { ok(r && r.result); }; t.onerror = function () { gagal(t.error); }; }); }); }
  function kunciDariPrf(prf) { return crypto.subtle.importKey('raw', prf, 'HKDF', false, ['deriveKey']).then(function (k) { return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: GARAM, info: new TextEncoder().encode('sesi') }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']); }); }
  function minta(credId) {
    return navigator.credentials.get({ publicKey: { challenge: acak(32), rpId: location.hostname, allowCredentials: [{ type: 'public-key', id: unb64(credId) }], userVerification: 'required', timeout: 60000, extensions: { prf: { eval: { first: GARAM } } } } })
      .then(function (a) { if (!a) throw new Error('dibatalkan'); var r = a.getClientExtensionResults ? a.getClientExtensionResults() : {}; return (r.prf && r.prf.results && r.prf.results.first) || null; });
  }
  function simpanWeb(k, nama, teks) {
    var credId;
    return navigator.credentials.create({ publicKey: { rp: { name: 'WHL', id: location.hostname }, user: { id: acak(16), name: k, displayName: nama || k }, challenge: acak(32),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], timeout: 60000,
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' }, extensions: { prf: { eval: { first: GARAM } } } } })
      .then(function (c) {
        if (!c) throw new Error('dibatalkan'); credId = b64(c.rawId);
        var r = c.getClientExtensionResults ? c.getClientExtensionResults() : {};
        if (r.prf && r.prf.results && r.prf.results.first) return r.prf.results.first;
        if (r.prf && r.prf.enabled) return minta(credId); // sebagian peramban baru memberi hasil PRF saat get
        return null;
      }).then(function (prf) {
        if (prf) return kunciDariPrf(prf).then(function (kk) { return { kunci: kk, mode: 'prf' }; });
        return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']).then(function (kk) { return idb('readwrite', function (s) { return s.put(kk, k); }).then(function () { return { kunci: kk, mode: 'gerbang' }; }); });
      }).then(function (h) {
        var iv = acak(12);
        return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, h.kunci, new TextEncoder().encode(teks)).then(function (ct) {
          return Simpan.taruh('whlBioBlob_' + k, JSON.stringify({ c: credId, iv: b64(iv), d: b64(ct), m: h.mode })).then(function () { return h.mode; });
        });
      });
  }
  function bukaWeb(k) {
    return Simpan.ambil('whlBioBlob_' + k).then(function (v) {
      var B = JSON.parse(v || 'null'); if (!B) throw new Error('data biometrik tidak ada');
      return minta(B.c).then(function (prf) {
        if (B.m === 'prf') { if (!prf) throw new Error('kunci passkey tidak bisa dipakai di perangkat ini'); return kunciDariPrf(prf); }
        return idb('readonly', function (s) { return s.get(k); }).then(function (kk) { if (!kk) throw new Error('kunci hilang'); return kk; });
      }).then(function (kk) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(B.iv) }, kk, unb64(B.d)); }).then(function (pt) { return new TextDecoder().decode(pt); });
    });
  }

  /* ---------- API untuk app.js ---------- */
  /** Aktifkan untuk akun ini: teks = sesi JSON (berisi token). -> Promise<mode> */
  function aktifkan(id, nama, teks) {
    var k = kunciAkun(id);
    var jalan = jb() ? asli('bioSimpan', [k, teks]).then(function () { return 'android'; }) : simpanWeb(k, nama, teks);
    return jalan.then(function (mode) {
      return daftar().then(function (a) { a = a.filter(function (x) { return x.k !== k; }); a.unshift({ k: k, id: id, nama: nama || id, mode: mode, sejak: Date.now() }); return taruhDaftar(a); }).then(function () { return mode; });
    });
  }
  /** Buka sesi tersimpan (minta biometrik). -> Promise<teks sesi> */
  function buka(id) { var k = kunciAkun(id); return jb() ? asli('bioBuka', [k]) : bukaWeb(k); }
  /** Hapus (keluar akun, PIN diganti, sesi kedaluwarsa, dimatikan di Akun). */
  function hapus(id) {
    var k = kunciAkun(id);
    try { if (jb()) jb().bioHapus(k); } catch (e) { /* */ }
    try { idb('readwrite', function (s) { return s.delete(k); }).catch(function () { }); } catch (e) { /* */ }
    return Simpan.taruh('whlBioBlob_' + k, null).then(daftar).then(function (a) { return taruhDaftar(a.filter(function (x) { return x.k !== k; })); });
  }
  /** Pindahkan akun ke urutan pertama (akun terakhir yang masuk). */
  function pakai(id) { var k = kunciAkun(id); return daftar().then(function (a) { var x = a.filter(function (y) { return y.k === k; })[0]; if (!x) return; return taruhDaftar([x].concat(a.filter(function (y) { return y.k !== k; }))); }); }
  window.WHL_BIO = { tersedia: tersedia, aktifkan: aktifkan, buka: buka, hapus: hapus, daftar: daftar, info: info, pakai: pakai, kunciAkun: kunciAkun };
})();
