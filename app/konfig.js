/* Alamat mesin (API) di belakang WHL App v2. Semua web app Apps Script milik WHL; app ini cuma klien.
 * Di dalam app (https://localhost tanpa port / capacitor://localhost) alamat ini TIDAK bisa dialihkan.
 * Pengalihan ke server tiruan hanya berlaku saat halaman dibuka dari server uji lokal (ada nomor port),
 * lewat localStorage "whlUji" = {"DASH":"...","ABSEN":"...","INPUTDO":"..."} (lihat uji/server-tiruan.mjs).
 */
(function () {
  var S = 'https://script.google.com/macros/s/';
  var K = {
    VERSI: '3.4', KODE: 304, /* KODE = versionCode APK (dipakai cek pembaruan di browser; di APK dibaca dari Android) */
    RILIS: 'https:' + '/' + '/ciptaprima108-oss.github.io/scan-absen/rilis/', /* v3.3 pembaruan dari dalam app: versi.json + APK */
    DASH: S + 'AKfycbzqJ0nKotpl-TjuTHLTMcOZpYZSeWdE9VWHFw0h712aoMagPDZJMQ--7W-kDtCxPvw/exec',     /* DASHBOARD: Pusat WHL */
    ABSEN: S + 'AKfycbyJBXvN79b4y9eunDSRigMXmDOS4kW3K5ZF0ZEbGCKT1-WPqi-zEica0r7M__-dqwqhDQ/exec',  /* Absensi Tambang: api abm */
    INPUTDO: S + 'AKfycbyKhvU4gKQZuD63XdBMpHuBO52c7XX1sYnfkG9eBbZheulntIPJGS8iFdpvhIx8ADSb/exec', /* Input DO: ?mode=kpi, profil */
    UJI: false
  };
  try {
    if (location.port && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      var u = JSON.parse(localStorage.getItem('whlUji') || 'null');
      if (u) { ['DASH', 'ABSEN', 'INPUTDO'].forEach(function (k) { if (u[k]) K[k] = u[k]; }); K.UJI = true; }
    }
  } catch (e) { /* abaikan */ }
  window.WHL_KONFIG = K;
})();
