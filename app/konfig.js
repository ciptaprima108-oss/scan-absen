/* Alamat mesin (API) di belakang WHL App v2. Semua web app Apps Script milik WHL; app ini cuma klien.
 * Di dalam app (https://localhost tanpa port / capacitor://localhost) alamat ini TIDAK bisa dialihkan.
 * Pengalihan ke server tiruan hanya berlaku saat halaman dibuka dari server uji lokal (ada nomor port),
 * lewat localStorage "whlUji" = {"DASH":"...","ABSEN":"...","INPUTDO":"..."} (lihat uji/server-tiruan.mjs).
 */
(function () {
  var S = 'https://script.google.com/macros/s/';
  var K = {
    VERSI: '3.42', KODE: 343, /* KODE = versionCode APK (dipakai cek pembaruan di browser; di APK dibaca dari Android) */
    RILIS: 'https:' + '/' + '/ciptaprima108-oss.github.io/scan-absen/rilis/', /* v3.3 pembaruan dari dalam app: versi.json + APK */
    DASH: S + 'AKfycbzqJ0nKotpl-TjuTHLTMcOZpYZSeWdE9VWHFw0h712aoMagPDZJMQ--7W-kDtCxPvw/exec',     /* DASHBOARD: Pusat WHL */
    ABSEN: S + 'AKfycbyJBXvN79b4y9eunDSRigMXmDOS4kW3K5ZF0ZEbGCKT1-WPqi-zEica0r7M__-dqwqhDQ/exec',  /* Absensi Tambang: api abm */
    INPUTDO: S + 'AKfycbyKhvU4gKQZuD63XdBMpHuBO52c7XX1sYnfkG9eBbZheulntIPJGS8iFdpvhIx8ADSb/exec', /* Input DO: ?mode=kpi, profil */
    UJI: false,
    JAM_KUNCI: 4, /* v3.33 (Reza 17 Nov): app tidak dibuka >= 4 jam -> akun biometrik masuk lagi; < 4 jam langsung kembali ke layar terakhir (layar.js) */
    /* v3.32 (Reza 17 Nov): akun full time tanpa kotak Absen/Lembur melayang di Beranda (menu Kehadiran tetap ada). Server boleh juga kirim user.tanpaKotakAbsen. */
    TANPA_KOTAK_ABSEN: ['WHL-01001'], /* Pak FANZA DWIYAN PRASETYA (pimpinan, full time) */
    /* tahap1-16nov: label "Baru" = 7 hari sejak tanggal rilis (06.00 WIB) DAN belum pernah dibuka di HP ini (localStorage whlBaruDibuka).
       Fitur tanpa tanggal di sini tidak pernah dapat label. id = id ikon Atur Beranda (kehadiran, nota, laba, gaji, kasbon, dokkas, kotak, proyeksi, kelolaBanner, app:<nama>). */
    RILIS_FITUR: {
      nota: '2026-11-14', laba: '2026-11-15', gaji: '2026-11-15', kasbon: '2026-11-15', dokkas: '2026-11-15', kehadiran: '2026-11-15',
      kuis: '2026-11-17', /* tahap5 Andro-A: menu Kuis safety driver; ganti ke tanggal rilis */
      drvProfil: '2026-11-17', drvDo: '2026-11-17', p2h: '2026-11-18' /* v3.37 P2H saya */, drvDok: '2026-11-17', katalog: '2026-11-17', jalan: '2026-11-17', hazard: '2026-11-17', hazardCek: '2026-11-17' /* v3.30 tahap 3-6 */, poin: '2026-11-17', peringkat: '2026-11-17', poinAcc: '2026-11-17', poinRekap: '2026-11-17', hubHazard: '2026-11-17', hubGaji: '2026-11-17', hubPoin: '2026-11-17' /* v3.31 ikon gabungan */, roster: '2026-11-17' /* app-tahap36 C */, nilaiRekan: '2026-11-17', ksd: '2026-11-17' /* v3.36 poin karyawan: Nilai rekan (staf) + Nilai staf (kuesioner driver) */ /* v3.29 menu driver: isi tanggal sesuai hari rilis */
    }
  };
  try {
    if (location.port && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
      var u = JSON.parse(localStorage.getItem('whlUji') || 'null');
      if (u) { ['DASH', 'ABSEN', 'INPUTDO'].forEach(function (k) { if (u[k]) K[k] = u[k]; }); K.UJI = true; }
    }
  } catch (e) { /* abaikan */ }
  window.WHL_KONFIG = K;
})();
