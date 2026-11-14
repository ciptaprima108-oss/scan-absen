/* WHL App v2 — layar asli Pusat WHL (login, beranda, unit, absen, aplikasi, akun/profil & KPI). */
(function () {
  'use strict';
  var K = window.WHL_KONFIG, T = window.WHL_TIRUAN, API = window.WHL_API, Simpan = API.Simpan, R = window.WHL_RASA;
  var KUNCI_SESI = 'whlV2Sesi', KUNCI_TEMA = 'whlV2Tema', KUNCI_ABM = 'abmToken';
  var $ = function (i) { return document.getElementById(i); };
  var SESI = null, D = {}, tab = 'beranda', ABSEN = null, KPI = null, PROFIL = null, saringUnit = 'semua', cariUnit = '', cariApp = '', KSN = null, FORUM = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function angka(n) { return Number(n || 0).toLocaleString('id-ID'); }
  function roti(t) { var r = $('roti'); r.textContent = t; r.classList.add('tampil'); clearTimeout(roti.t); roti.t = setTimeout(function () { r.classList.remove('tampil'); }, 2800); }
  function inisial(n) { var p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function contoh() { return API.Pusat.asli() ? '' : '<span class="chip contoh">contoh</span>'; }
  function layar(nama) { ['layarMuat', 'layarLogin', 'layarApp'].forEach(function (l) { $(l).classList.toggle('sembunyi', l !== nama); }); }
  function jalanJam() { var d = new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000), p = function (n) { return ('0' + n).slice(-2); }; $('jam').textContent = p(d.getHours()) + '.' + p(d.getMinutes()); }
  function hariIniWib() { var d = new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000), p = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function geserTgl(t, n) { var d = new Date(t + 'T12:00:00'); d.setDate(d.getDate() + n); var p = function (x) { return ('0' + x).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }

  /* ---------- tema ---------- */
  function pasangTema(t) { var gelap = t === 'gelap'; document.documentElement.setAttribute('data-tema', gelap ? 'gelap' : 'terang'); var mt = document.querySelector('meta[name=theme-color]'); if (mt) mt.setAttribute('content', gelap ? '#0D2A55' : '#1565C0'); var b = document.getElementById('btnTema'); if (b) b.textContent = gelap ? '☀️' : '🌙'; }
  function pasangSuara() { var b = document.getElementById('btnSuara'); if (b) { b.textContent = R.setel.suara ? '🔊' : '🔇'; b.setAttribute('aria-pressed', R.setel.suara ? 'true' : 'false'); } }
  var IK = window.WHL_IKON;
  Array.prototype.forEach.call(document.querySelectorAll('[data-ikon]'), function (e) { e.innerHTML = IK(e.getAttribute('data-ikon')); });
  var temaUji = false;
  Simpan.ambil('whlV2TemaVer').then(function (v) {
    if (v === 'superapp') return Simpan.ambil(KUNCI_TEMA).then(function (t) { if (!temaUji) pasangTema(t); });
    /* v2.18: pertama kali buka tampilan super-app -> setelan tema lama diganti terang (biru-putih WHL); sesudah itu pilihan orang dipakai lagi */
    if (!temaUji) pasangTema('terang'); Simpan.taruh(KUNCI_TEMA, 'terang'); Simpan.taruh('whlV2TemaVer', 'superapp');
  });

  /* ---------- sesi ---------- */
  var KUNCI_TERBUKA = 'whlV2SesiTerbuka';
  function simpanSesi() {
    try { if (SESI && SESI.tokenAbm) localStorage.setItem(KUNCI_ABM, SESI.tokenAbm); else localStorage.removeItem(KUNCI_ABM); } catch (e) { /* */ }
    /* v3.9: akun dengan masuk biometrik -> sesi hanya hidup selama app terbuka (sessionStorage); di HP tersimpan TERENKRIPSI (biometrik.js) */
    try { if (SESI && SESI.bio) sessionStorage.setItem(KUNCI_TERBUKA, JSON.stringify(SESI)); else sessionStorage.removeItem(KUNCI_TERBUKA); } catch (e) { /* */ }
    return Simpan.taruh(KUNCI_SESI, SESI && !SESI.bio ? JSON.stringify(SESI) : null);
  }
  function keLogin(pesan) {
    SESI = null; D = {}; ABSEN = null; KPI = null; PROFIL = null; KSN = null; if (window.WHL_KSN) window.WHL_KSN.lupa(); if (window.WHL_FORUM) window.WHL_FORUM.keluar(); FORUM = null; lepasPush(); simpanSesi();
    $('pesanLogin').textContent = pesan || ''; sibuk(false); layar('layarLogin'); gambarBioLogin();
  }

  /* ---------- v3.9 MASUK BIOMETRIK (Face ID / Touch ID / sidik jari HP) ---------- */
  var BIO = null, bioGanti = false;
  function bioLabel() { return BIO && BIO.label ? BIO.label : 'biometrik HP'; }
  function bioJudul() { return /Face ID/.test(bioLabel()) ? 'Face ID' : 'sidik jari / wajah'; }
  function gambarBioLogin() {
    var el = $('bioMasuk'); if (!el || !window.WHL_BIO) return;
    window.WHL_BIO.daftar().then(function (L) {
      var x = L[0];
      if (!x || bioGanti) { el.innerHTML = L.length && bioGanti ? '<button type="button" class="tKecil bioKembali" data-bio="kembali">← Kembali ke ' + esc(String(x.nama).split(' ')[0]) + '</button>' : ''; $('kartuLogin').classList.remove('sembunyi'); return; }
      $('kartuLogin').classList.add('sembunyi');
      el.innerHTML = '<div class="kartu bioKartu"><span class="bioAva">' + esc(inisial(x.nama)) + '</span><div class="kecil">Masuk sebagai</div><b class="bioNama">' + esc(x.nama) + '</b><div class="kecil">' + esc(x.id) + '</div>'
        + '<button type="button" class="tUtama bioTombol" data-bio="masuk">' + IK('absen') + ' Masuk dengan ' + esc(x.mode === 'android' ? 'sidik jari / wajah' : 'Face ID') + '</button>'
        + '<div class="bioBaris"><button type="button" class="tKecil" data-bio="pin">Pakai PIN</button><button type="button" class="tKecil" data-bio="ganti">Ganti akun</button></div>'
        + '<div class="pesan" id="bioPesan"></div></div>';
    });
  }
  function bioMasuk() {
    window.WHL_BIO.daftar().then(function (L) {
      var x = L[0]; if (!x) return; var ps = $('bioPesan'); if (ps) ps.textContent = '';
      window.WHL_BIO.buka(x.id).then(function (teks) {
        var s = JSON.parse(teks); s.bio = true; SESI = s; simpanSesi(); R.bunyi('sukses'); R.getar('sukses'); mulaiApp();
      }, function (e) {
        var m = String(e && e.message || e);
        if (/dibatalkan/.test(m)) return;
        if (/berubah|hilang|tidak ada|tidak bisa dipakai/.test(m)) window.WHL_BIO.hapus(x.id).then(function () { $('inId').value = x.id; bioGanti = false; gambarBioLogin(); });
        R.bunyi('gagal'); if (ps) ps.textContent = 'Biometrik gagal: ' + m + '. Pakai PIN.';
      });
    });
  }
  /* sesi server habis / PIN diganti / akun nonaktif / keluar -> kunci biometrik akun itu dibuang */
  function bioGugur(id) { if (window.WHL_BIO && id) return window.WHL_BIO.hapus(id); return Promise.resolve(); }
  function bioTawarkan() {
    if (!window.WHL_BIO || !SESI || SESI.mode !== 'asli' || SESI.bio) return;
    var id = SESI.idProfil || SESI.idKetik, k = window.WHL_BIO.kunciAkun(id);
    Promise.all([window.WHL_BIO.tersedia(), Simpan.ambil('whlBioTolak_' + k), window.WHL_BIO.info(id)]).then(function (r) {
      BIO = r[0]; if (!r[0].ada || r[1] || r[2]) return;
      setTimeout(function () {
        R.tanya({ judul: 'Masuk pakai ' + bioJudul() + ' berikutnya?', ket: 'Tidak perlu ketik PIN tiap buka app. Yang memeriksa ' + bioLabel() + ' adalah HP kamu sendiri; data wajah / sidik jari tidak dikirim ke mana pun. Bisa dimatikan di Akun.', ya: 'Aktifkan', tidak: 'Nanti saja' }).then(function (y) {
          if (y) bioAktifkan(); else Simpan.taruh('whlBioTolak_' + k, '1');
        });
      }, 1600);
    });
  }
  function bioAktifkan() {
    if (!SESI) return; var id = SESI.idProfil || SESI.idKetik, salin = JSON.parse(JSON.stringify(SESI)); delete salin.bio;
    return window.WHL_BIO.aktifkan(id, SESI.namaLengkap || SESI.user.nama, JSON.stringify(salin)).then(function (mode) {
      SESI.bio = true; SESI.bioMode = mode; simpanSesi(); R.bunyi('sukses'); R.getar('sukses');
      roti(mode === 'gerbang' ? 'Aktif. Catatan: peramban ini belum mendukung kunci passkey penuh, Face ID dipakai sebagai gerbang app.' : 'Masuk biometrik aktif. Buka app berikutnya cukup ' + bioJudul() + '.');
      if (tab === 'akun') gambar();
    }, function (e) { if (!/dibatalkan/.test(String(e && e.message))) { R.bunyi('gagal'); roti('Biometrik belum bisa diaktifkan: ' + (e && e.message || e)); } });
  }
  function bioMatikan() {
    if (!SESI) return; var id = SESI.idProfil || SESI.idKetik;
    bioGugur(id).then(function () { SESI.bio = false; delete SESI.bioMode; simpanSesi(); roti('Masuk biometrik dimatikan. App tetap masuk otomatis di HP ini.'); if (tab === 'akun') gambar(); });
  }
  function barisOnline() {
    if (!window.WHL_ONLINE || !forumTampil()) return '';
    var on = window.WHL_ONLINE.tampil();
    return '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Tampilkan status online saya</b><div class="kecil">Kalau nyala, staf lain bisa melihat kamu sedang online / baru aktif.</div></div><button type="button" class="saklar' + (on ? ' on' : '') + '" data-aksi="online" role="switch" aria-checked="' + on + '" aria-label="Tampilkan status online"><i></i></button></div>';
  }
  function barisBio() {
    if (!window.WHL_BIO || !SESI || SESI.mode !== 'asli') return '';
    var ada = BIO && BIO.ada;
    return '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Masuk pakai ' + esc(bioJudul()) + '</b><div class="kecil">'
      + (SESI.bio ? 'Aktif. Tiap app dibuka, cukup ' + esc(bioLabel()) + '. Gugur sendiri kalau PIN diganti atau sesi habis.' : ada ? 'Tanpa ketik PIN tiap buka app. Data biometrik tetap di HP.' : esc((BIO && BIO.alasan) || 'Memeriksa...')) + '</div></div>'
      + '<button type="button" class="saklar' + (SESI.bio ? ' on' : '') + '" data-aksi="bio" role="switch" aria-checked="' + !!SESI.bio + '" aria-label="Masuk biometrik"' + (ada || SESI.bio ? '' : ' disabled') + '><i></i></button></div>';
  }

  /* ---------- LOGIN: nomor kartu -> keypad PIN (pola app bank: PIN diketik di keypad sendiri, bukan keyboard HP) ---------- */
  function pesanLogin(t) { $('pesanLogin').textContent = t || ''; if (t) { R.bunyi('gagal'); R.getar('awas'); } }
  function sibuk(y) { $('tMasuk').disabled = y; $('tMasuk').innerHTML = y ? '<span class="putar"></span> &nbsp;Memeriksa...' : 'Lanjut'; }
  function lanjut() {
    var id = $('inId').value.trim().toUpperCase(); $('inId').value = id; $('inId').blur();
    if (id.replace(/[^A-Z0-9]/g, '').length < 4) { pesanLogin('Isi dulu nomor ID card / NRP kamu, contoh WHL-01003.'); return; }
    if (!navigator.onLine) { pesanLogin('Tidak ada internet. Nyalakan data / WiFi lalu coba lagi.'); return; }
    sibuk(true); $('pesanLogin').textContent = '';
    API.Pusat.deteksi().then(function (asli) { return asli ? API.Pusat.cekKartu(id) : { ok: true }; }).then(function (c) {
      sibuk(false);
      if (!c.ok) { pesanLogin(c.pesan || 'Nomor tidak dikenal. Cek lagi nomor di ID card.'); return; }
      if (c.buatPin) return alurBuatPin(id, c.nama);
      return R.mintaPin({ judul: 'Masukkan PIN', ket: (c.nama ? 'Halo ' + c.nama + '. ' : '') + 'PIN Pusat WHL kamu (4 angka)' }, function (pin) { return cobaMasuk(id, pin); });
    }).catch(function (e) { sibuk(false); pesanLogin('Koneksi gagal: ' + e.message + '. Cek internet lalu coba lagi.'); });
  }
  function alurBuatPin(id, nama) {
    var pertama = '';
    return R.mintaPin({ judul: 'Buat PIN baru', ket: 'Halo ' + (nama || '') + '. Pilih 4 angka yang gampang kamu ingat (jangan 1234 / 0000).' }, function (p) { pertama = p; return null; }).then(function (lanjutkan) {
      if (!lanjutkan) return;
      return R.mintaPin({ judul: 'Ulangi PIN baru', ket: 'Ketik sekali lagi PIN yang tadi.' }, function (p) { return p !== pertama ? 'PIN tidak sama. Ketik ulang.' : cobaMasuk(id, p); });
    });
  }
  /** -> Promise<string|null>: pesan salah (keypad bergetar), atau null kalau berhasil masuk */
  function cobaMasuk(id, pin) { return API.Pusat.asli() ? masukAsli(id, pin) : masukSementara(id, pin); }
  /* Pusat sudah punya API: login Pusat (peran & hak dari server), lalu sesi absen mandiri dengan PIN yang sama. */
  function masukAsli(id, pin) {
    return API.Pusat.login(id, pin).then(function (r) {
      if (!r.ok) return r.pesan || 'Gagal masuk.';
      if (r.peran === 'driver') return 'App ini khusus staf WHL. Driver tetap memakai jalur yang biasa (tablet / Pusat WHL web).'; /* aturan Reza 12 Nov: app khusus staf */
      var token = r.token; delete r.token; delete r.ok;
      var s = { mode: 'asli', tokenPusat: token, tokenAbm: '', abmPesan: '', user: r, idKetik: id, namaLengkap: r.namaLengkap || r.nama, jabatan: r.jabatan || '',
        idProfil: /^WHL-?D/i.test(r.idKartu || '') ? r.idKartu : (r.nrp || r.idKartu || id) };
      return API.Absen.login(id, pin).then(function (h) {
        if (h.ok) { s.tokenAbm = h.token; s.jabatan = s.jabatan || h.jabatan || ''; } else s.abmPesan = h.pesan || 'Absen mandiri belum bisa dipakai.';
      }, function (e) { s.abmPesan = 'Absen mandiri belum tersambung (' + e.message + ').'; }).then(function () { selesaiMasuk(s); return null; });
    });
  }
  /* Pusat BELUM punya API: identitas & PIN tetap diperiksa server sungguhan (Absensi, api abm). Ringkasan Pusat = data contoh. */
  function masukSementara(id, pin) {
    return API.Absen.login(id, pin).then(function (h) {
      if (!h.ok) return (h.pesan || 'Gagal masuk.') + (/PIN salah/i.test(h.pesan || '') ? '' : '');
      var peran = T.tebakPeran(h.jabatan);
      selesaiMasuk({ mode: 'tiruan', tokenPusat: '', tokenAbm: h.token, abmPesan: '', user: T.infoUser(h.namaLengkap || h.nama, peran), idKetik: id, namaLengkap: h.namaLengkap || h.nama, jabatan: h.jabatan || '' });
      return null;
    });
  }
  var lewatiKenal = false;
  function selesaiMasuk(s) {
    SESI = s;
    return simpanSesi().then(function () { return Simpan.ambil('whlV2Kenal'); }).then(function (kenal) {
      mulaiApp();
      if (kenal || lewatiKenal) { R.bunyi('sukses'); R.getar('sukses'); } else { Simpan.taruh('whlV2Kenal', '1'); R.onboarding(); }
      bioGanti = false;
      /* masuk pakai PIN: kalau akun ini sudah pakai biometrik -> simpan ulang sesi baru (minta biometrik sekali); kalau belum -> tawarkan */
      if (window.WHL_BIO) window.WHL_BIO.info(s.idProfil || s.idKetik).then(function (x) { if (x) setTimeout(function () { R.tanya({ judul: 'Perbarui masuk biometrik?', ket: 'Sesi baru dari PIN disimpan untuk masuk biometrik berikutnya.', ya: 'Perbarui', tidak: 'Matikan' }).then(function (y) { if (y) bioAktifkan(); else bioGugur(s.idProfil || s.idKetik); }); }, 1500); else if (!kenal) setTimeout(bioTawarkan, 9000); else bioTawarkan(); });
    });
  }

  /* ---------- APLIKASI ---------- */
  var APPS = [
    { n: 'Dashboard Produksi', ic: '📊', d: 'ritase', g: 'dash', k: 'Ritase & tonase harian', u: K.DASH },
    { n: 'Generator Laporan', ic: '🖨️', d: 'generator', k: 'Report Hauling, Sub Con & baca form PDF', u: K.DASH + '?mode=generator' },
    { n: 'Menu Input', ic: '📋', d: 'pos', k: 'Form lapangan: Pos Kontrol, P2H, Driver Baru', u: K.DASH + '?mode=menu' },
    { n: 'Live Monitor Pos Kontrol', ic: '🖥️', d: 'pos', k: 'Tiket mekanik live', u: K.DASH + '?mode=monitor' },
    { n: 'GPS TrackSolid', ic: '📍', d: 'gps', k: 'Posisi live, muat/kosong, KM jalan', id: 'AKfycbwhemxEHZgsj9Z_9ex_siIvs3NmHLlHEns8WRSX-yKwjMlDlQHwXeR_1WdFHcMHvPpq' },
    { n: 'Analisa Insiden WHL', ic: '🦺', d: 'insiden', g: 'analisa', k: 'Insiden, PICA, Laporan Awal', id: 'AKfycbwYC0wJcbDt4jrvuKnWe9L_2Xe1AD25tRTGz-4ffAbi5ojTDgohcIdDsJ_dkaI3WU5e' },
    { n: 'Input DO & Uang Jalan', ic: '🧮', d: 'do', g: 'inputdo', k: 'Uang jalan, lapor DO, voucher solar', u: K.INPUTDO, kunci: 'Login admin' },
    { n: 'DO & Kendala WHL', ic: '🧾', d: 'do', k: 'Foto DO per lambung + tiket kendala', id: 'AKfycbyQVFHsikAi-ZERgngM_kEglGvs7nIgyAFKFdzzb42bSlgjRgPKOmPD1QUsyvjpqZDb' },
    { n: 'Inputan DO', ic: '📄', d: 'do', k: 'Input DO per trip CBR-JNN', id: 'AKfycbxgNS2DIS1wAjzQ7v9PqyGh0wXLISMUWdYDwibH5sJeE8Vfo2b6ViZ1yfedasljaAnE' },
    { n: 'Kuota 107', ic: '🚚', d: 'ritase', k: 'Bagi kuota 107 ke PORT per vendor', id: 'AKfycbwCMZzfqXSnNpl0wHb9UIaWcmHOuX-4pKmZmP532go0s3jrqh4pxoKM1oeq1IQtAHI' },
    { n: 'Stok Solar WHL', ic: '⛽', d: 'solar', k: 'Solar masuk/keluar tangki POOL 108', id: 'AKfycbwtQwcT7H-sRDTULlgzHWZpXg6g1CMzY5LrLG1hvCRVKOsoCvN4PxejxN8XTDD1VGSW' },
    { n: 'Ceklis Inventaris', ic: '✅', d: 'inventaris', k: 'Aset kantor per ruangan', id: 'AKfycbwDI5OEtGGN_IDxuN2rk74_5cjP7LSPYWivm8VUCL-2oZQAS9spOGVaEOb57plcU27-Yw' },
    { n: 'Absensi WHL', ic: '🪪', d: 'absensi', k: 'Rekap absen, roster', u: K.ABSEN },
    { n: 'Commissioning & Kimper', ic: '📝', d: 'insiden', k: 'Form vendor commissioning & kimper', id: 'AKfycbz9u33XobIts_QZA6jdBZYii5v-iySnej6SzuyyGCm9zGhyqlztUnp3TnT3ifQeUeQNLA' }
  ];
  var INPUT = [
    { ic: '📣', n: 'Laporan Awal Kejadian', k: 'Analisa Insiden · pilih menu 📣 Laporan Awal', id: 'AKfycbwYC0wJcbDt4jrvuKnWe9L_2Xe1AD25tRTGz-4ffAbi5ojTDgohcIdDsJ_dkaI3WU5e' },
    { ic: '🦺', n: 'Input Insiden', k: 'Analisa Insiden · pilih menu ➕ Input Insiden', id: 'AKfycbwYC0wJcbDt4jrvuKnWe9L_2Xe1AD25tRTGz-4ffAbi5ojTDgohcIdDsJ_dkaI3WU5e' },
    { ic: '📇', n: 'Scan Absen (tablet briefing)', k: 'Operator: scan ID card, kamera live', u: 'https://ciptaprima108-oss.github.io/scan-absen/' },
    { ic: '📝', n: 'Commissioning & Kimper', k: 'Form vendor: pilih vendor lalu isi', id: 'AKfycbz9u33XobIts_QZA6jdBZYii5v-iySnej6SzuyyGCm9zGhyqlztUnp3TnT3ifQeUeQNLA' },
    { ic: '🧮', n: 'Input DO & Uang Jalan', k: 'Uang jalan, lapor DO', u: K.INPUTDO, kunci: 'Login admin' },
    { ic: '📋', n: 'Menu Input lapangan', k: 'Pos Kontrol, P2H, Driver Baru', u: K.DASH + '?mode=menu' },
    { ic: '🖥️', n: 'Live Monitor Pos Kontrol', k: 'Tiket mekanik live', u: K.DASH + '?mode=monitor' },
    { ic: '📝', n: 'Pengajuan Izin', k: 'Izin / sakit / cuti', u: K.ABSEN + '?mode=izin' }
  ];
  var INPUT_PERAN = { pimpinan: [6, 5, 4, 0, 1, 2, 3, 7], penuh: [4, 6, 5, 0, 1, 2, 3, 7], pengawas: [6, 5, 7], mekanik: [5, 7], admin: [4, 7], adminhse: [0, 1, 2, 3, 7], hse: [0, 1, 6, 5, 7], logistik: [7], fuelman: [7], kreatif: [7], driver: [] };
  function alamat(a) { return a.u || (a.id ? 'https://script.google.com/macros/s/' + a.id + '/exec' : ''); }
  function appsSaya() { var A = (SESI && SESI.user.apps) || []; return APPS.filter(function (a) { return A.indexOf('*') >= 0 || A.indexOf(a.d) >= 0 || (a.g && A.indexOf(a.g) >= 0); }); }
  function bolehUnit() { return !!SESI && ((SESI.user.rinci || []).indexOf('unit') >= 0 || SESI.user.admin || T.UNIT_PERAN.indexOf(SESI.user.peran) >= 0); }
  /* Buka sistem lain yang masih halaman web.
     APK: di WebView yang sama (tombol Back kembali). App web terpasang (iPhone/Android): keluar dari lingkup app -> HP membukanya di
     peramban dalam-app dengan tombol Selesai/tutup untuk kembali. Browser biasa: tab baru, app tetap terbuka di tab ini. */
  function bukaWeb(url) {
    if (!url) return; if (!navigator.onLine) { roti('Tidak ada internet.'); return; }
    try { sessionStorage.setItem('whlV2Tab', tab); } catch (e) { /* */ }
    var AD = window.AndroidDownloader; if (AD && typeof AD.bukaWeb === 'function') { try { AD.bukaWeb(url); return; } catch (e) { /* */ } } /* v3.6 (audit T2): APK -> WebView terpisah tanpa token */
    try { var CI = window.Capacitor; if (CI && CI.getPlatform && CI.getPlatform() === 'ios' && CI.Plugins && CI.Plugins.WhlAsli) { CI.Plugins.WhlAsli.bukaWeb({ url: url }); return; } } catch (e) { /* */ } /* app iPhone: peramban terpisah (SFSafariViewController) */
    var P = window.WHL_PASANG; // hanya ada di browser (bukan APK)
    if (P && !P.berdiri()) { var w = null; try { w = window.open(url, '_blank'); } catch (e) { w = null; } if (w) return; }
    window.location.href = url;
  }
  function kartuApp(a) {
    var u = alamat(a);
    return '<button type="button" class="app' + (u ? '' : ' mati') + '" data-web="' + esc(u) + '"><span class="ik">' + window.WHL_ILUS(a.ikn || IKON_DIV[a.d] || 'web') + '</span><span class="tx"><b>' + esc(a.n) + '</b><small>' + esc(a.k) + (a.kunci ? ' · 🔒 ' + esc(a.kunci) : '') + '</small></span><span class="chip web">Web</span>' + IK('kanan', 'kmP') + '</button>';
  }

  function mulaiApp() {
    try { var jk = window.AndroidDownloader; if (jk && jk.aturSuaraKeras && jk.suaraKeras() !== suaraKeras()) jk.aturSuaraKeras(suaraKeras()); } catch (e) { /* */ }
    layar('layarApp');
    $('tAkun').textContent = inisial(SESI.namaLengkap || SESI.user.nama);
    $('pitaContoh').classList.toggle('sembunyi', API.Pusat.asli());
    var t0 = ''; try { t0 = sessionStorage.getItem('whlV2Tab') || ''; } catch (e) { /* */ }
    var h = (location.hash || '').replace('#', ''); if (/^(beranda|unit|absen|apps|akun|kotak|aktivitas)$/.test(h)) t0 = h;
    keTab(/^(beranda|unit|absen|apps|akun|kotak|aktivitas)$/.test(t0) ? t0 : 'beranda');
    muatRingkasan(false); muatAbsen(); muatProfil(false); muatKsn(); setTimeout(muatForum, 1200);
    setTimeout(function () { if (NOTIF.tiket && bolehUnit()) aturNotif(true); }, 1500); // pastikan jadwal cek latar terpasang
    setTimeout(function () { if (SESI && API.Pusat.asli()) pasangPush(); }, 2500); // notif-push-13nov
    setTimeout(function () { if (window.WHL_RILIS) window.WHL_RILIS.cekOtomatis(); }, 4000); // v3.3: ada versi baru? (maks 1x per 6 jam)
    bukaDariAlamat();
  }
  var URUT = ['beranda', 'apps', 'unit', 'absen', 'kotak', 'akun'], AKT = 'unit', RIWAYAT = [], mundur = false, tekanKeluar = 0;
  var NAV_DARI = { beranda: 'beranda', apps: 'beranda', unit: 'aktivitas', absen: 'aktivitas', kotak: 'kotak', akun: 'akun' };
  function keTab(t) {
    if (t === 'aktivitas') t = bolehUnit() ? AKT : 'absen'; /* v2.16: Aktivitas = Unit + Absen saya (segmen di atas) */
    if (t === 'unit' && !bolehUnit()) t = 'absen';
    if (t === 'unit' || t === 'absen') AKT = t;
    if (t !== tab && !mundur) { RIWAYAT.push(tab); if (RIWAYAT.length > 20) RIWAYAT.shift(); }
    if (t === 'beranda') RIWAYAT = [];
    if (tab === 'kotak' && t !== 'kotak') bacaSemuaKotak();
    if (t === 'akun' && SESI && API.Pusat.asli() && !PUSH.aktif) setTimeout(function () { pasangPush(false); }, 300);
    if (t === 'akun' && window.WHL_BIO && !BIO) window.WHL_BIO.tersedia().then(function (h) { BIO = h; if (tab === 'akun') gambar(); });
    if (!pluginPush() && !mundur && t !== tab) try { history.pushState({ whl: t }, ''); } catch (e) { /* */ } // keluar dari Kotak masuk = semua dianggap sudah dibaca
    var arah = URUT.indexOf(t) >= URUT.indexOf(tab) ? 'masukKanan' : 'masukKiri', pindah = t !== tab;
    tab = t; try { sessionStorage.setItem('whlV2Tab', t); } catch (e) { /* */ }
    Array.prototype.forEach.call(document.querySelectorAll('.nav button[data-tab]'), function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === NAV_DARI[t]); });
    var J = { beranda: 'Pusat WHL', unit: 'Aktivitas', absen: 'Aktivitas', apps: 'Semua layanan', akun: 'Akun saya', kotak: 'Kotak masuk' }[t];
    $('judulTab').textContent = J; $('kpl').classList.toggle('ringkas', t !== 'beranda'); if ($('tKembali')) $('tKembali').hidden = t === 'beranda';
    gambar(true); window.scrollTo(0, 0);
    var el = $('isi'); el.classList.remove('masukKanan', 'masukKiri'); if (pindah) { void el.offsetWidth; el.classList.add(arah); }
  }
  /* v3.0 tombol Back HP (dipanggil MainActivity): 'ok' = sudah ditangani, 'keluar' = tutup app */
  function tanyaKeluar() { if (Date.now() - tekanKeluar < 2000) return 'keluar'; tekanKeluar = Date.now(); roti('Tekan sekali lagi untuk keluar'); return 'ok'; }
  window.WHL_KEMBALI = function () {
    try {
      var tr = document.querySelectorAll('.tirai.buka'), atas = tr[tr.length - 1];
      if (atas) { if (atas.id === 'tirai') tutupLembar(); else atas.dispatchEvent(new MouseEvent('click', { bubbles: true })); return 'ok'; }
      var L = document.querySelectorAll('.lapis.tampil'), lp = L[L.length - 1];
      if (lp) { var b = lp.querySelector('.ksnKp .kb, .pinBatal, .suksesBawah button, [data-o="lewati"]'); if (b) { b.click(); return 'ok'; } }
      if (!SESI || $('layarApp').classList.contains('sembunyi')) return tanyaKeluar();
      if (tab !== 'beranda') { var p = RIWAYAT.pop(); while (p && p === tab) p = RIWAYAT.pop(); mundur = true; keTab(p || 'beranda'); mundur = false; return 'ok'; }
      if (window.scrollY > 300) { window.scrollTo({ top: 0, behavior: 'smooth' }); }
      return tanyaKeluar();
    } catch (e) { return 'ok'; }
  };
  /* PWA / browser: tombol Kembali peramban & gestur iPhone = sama dengan tombol Back Android */
  if (!pluginPush()) {
    try { history.replaceState({ whlAkar: 1 }, ''); history.pushState({ whl: 1 }, ''); } catch (e) { /* */ }
    window.addEventListener('popstate', function () { var r = window.WHL_KEMBALI(); if (r === 'keluar') { try { history.back(); } catch (e) { /* */ } } else { try { history.pushState({ whl: 1 }, ''); } catch (e) { /* */ } } });
  }
  /* notifikasi web diketuk -> app dibuka dengan ?buka=forum:umum / tiket:WHL 902 */
  function bukaDariAlamat() { var m = /[?&]buka=([^&#]+)/.exec(location.search); if (!m) return; var p = decodeURIComponent(m[1]).split(':'); try { history.replaceState(history.state, '', location.pathname); } catch (e) { /* */ } setTimeout(function () { bukaDariNotif(p[0] === 'tiket' ? { jenis: 'tiket', l: p.slice(1).join(':') } : { jenis: 'forum', ruang: p[1] || 'umum' }); }, 1800); }
  /* keyboard HP terbuka -> navigasi bawah & kartu melayang disembunyikan, kolom ketik forum pas di atas keyboard */
  var tinggiMaks = window.innerHeight;
  window.addEventListener('resize', function () { tinggiMaks = Math.max(tinggiMaks, window.innerHeight); document.documentElement.classList.toggle('kb-buka', window.innerHeight < tinggiMaks * 0.78); });

  /* titik / angka kecil di navigasi bawah (pola badge notifikasi) */
  function aturTanda() {
    var a = $('tandaAbsen'), u = $('tandaUnit'); if (!a || !u || !SESI) return;
    var belumMasuk = SESI.user.peran !== 'driver' && ABSEN && ABSEN.ok && !(ABSEN.hari || []).some(function (x) { return x.tipe === 'Masuk'; });
    a.classList.toggle('sembunyi', !belumMasuk);
    var n = daftarTindak().total;
    u.textContent = n > 9 ? '9+' : String(n); u.classList.toggle('sembunyi', !n || !bolehUnit());
    var fa = $('tandaApps'), fn = forumBaru(); if (fa) { fa.textContent = fn > 9 ? '9+' : String(fn); fa.classList.toggle('sembunyi', !fn); }
    var nk = kotakBelum(), tk = $('tandaKotak'), tl = $('tandaLonceng');
    [tk, tl].forEach(function (e) { if (e) { e.textContent = nk > 9 ? '9+' : String(nk); e.classList.toggle('sembunyi', !nk); } });
    if (n && bolehUnit()) a.classList.add('sembunyi'); // satu tanda saja di Aktivitas: angka unit, kalau tidak ada baru titik absen
  }

  /* ---------- v2.16 Kotak masuk: notifikasi yang pernah masuk di HP ini (push, tiket baru, pengumuman) + yang perlu tindakan sekarang ---------- */
  var KOTAK = [];
  Simpan.ambil('whlV2Kotak').then(function (v) { try { var a = JSON.parse(v || '[]'); if (Array.isArray(a)) KOTAK = a.concat(KOTAK).slice(0, 40); } catch (e) { /* */ } aturTanda(); });
  function simpanKotak() { Simpan.taruh('whlV2Kotak', JSON.stringify(KOTAK.slice(0, 40))); }
  function catatKotak(jenis, judul, isi, data) {
    var id = (data && (data.pesan || data.id || data.l) || '') + ':' + judul;
    if (KOTAK.some(function (x) { return x.id === id && Date.now() - x.w < 3600000; })) return;
    KOTAK.unshift({ id: id, j: jenis, t: String(judul || '').slice(0, 90), i: String(isi || '').slice(0, 200), d: data || {}, w: Date.now(), b: false });
    KOTAK = KOTAK.slice(0, 40); simpanKotak(); aturTanda(); if (tab === 'kotak') gambar();
  }
  function kotakBelum() { return KOTAK.filter(function (x) { return !x.b; }).length; }
  function bacaSemuaKotak() { if (tab !== 'kotak' || !kotakBelum()) return; KOTAK.forEach(function (x) { x.b = true; }); simpanKotak(); aturTanda(); }
  function waktuLalu(w) { var m = Math.max(0, Math.round((Date.now() - w) / 60000)); return m < 1 ? 'baru saja' : m < 60 ? m + ' mnt lalu' : m < 1440 ? Math.floor(m / 60) + ' jam lalu' : Math.floor(m / 1440) + ' hr lalu'; }
  var IKON_KOTAK = { tiket: ['alarm', 'merah'], forum: ['forum', 'biru'], sebut: ['forum', 'biru'], pengumuman: ['pengumuman', 'biru'], absen: ['absen', 'biru'], ksn: ['kuesioner', 'kuning'], info: ['lonceng', ''] };
  function barisKotak(ik, warna, judul, isi, kanan, attr, belum) {
    return '<button type="button" class="km' + (belum ? ' belum' : '') + '" ' + attr + '><span class="kmI ' + warna + '">' + window.WHL_ILUS(ik) + '</span><span class="tx"><b>' + esc(String(judul || '').replace(/^[^A-Za-z0-9@]+/, '')) + '</b>' + (isi ? '<small>' + esc(isi) + '</small>' : '') + '</span><em>' + esc(kanan || '') + '</em>' + IK('kanan', 'kmP') + '</button>';
  }
  function gambarKotak() {
    var h = '', P = [], T2 = daftarTindak();
    if (T2.storing.length) P.push(['alarm', 'merah', T2.storing.length + ' unit perlu storing', 'Unit mogok di jalan, perlu didatangi', 'data-ke="tab:unit"']);
    if (T2.gantung.length) P.push(['jam', 'kuning', T2.gantung.length + ' tiket gantung', 'Lebih dari 2 jam belum selesai', 'data-ke="tab:unit"']);
    if (T2.tunjuk.length) P.push(['truk', 'kuning', T2.tunjuk.length + ' unit menunggu mekanik', 'Belum ada mekanik ditunjuk', 'data-ke="tab:unit"']);
    if (T2.grup.length) P.push(['forum', 'kuning', T2.grup.length + ' laporan grup WA belum beres', 'Tiket belum sesuai laporan grup', 'data-ke="tab:unit"']);
    var fb = forumBaru(); if (fb) P.push(['forum', 'biru', fb + ' pesan forum belum dibaca', 'Ketuk untuk buka Forum WHL', 'data-ke="forum"']);
    if (KSN && KSN.ada && KSN.buka && KSN.sisa) P.push(['kuesioner', 'kuning', 'Kuesioner: ' + KSN.sisa + ' rekan belum dinilai', 'Anonim, boleh dicicil', 'data-ke="ksn"']);
    if (SESI.user.peran !== 'driver' && ABSEN && ABSEN.ok && !(ABSEN.hari || []).some(function (x) { return x.tipe === 'Masuk'; })) P.push(['absen', 'biru', 'Kamu belum absen masuk hari ini', 'Absen pakai pindai wajah + GPS', 'data-ke="tab:absen"']);
    h += '<h2 class="bagW">Perlu tindakan <span>' + (P.length ? P.length : '') + '</span></h2>';
    h += P.length ? '<div class="kartu daftarKm">' + P.map(function (x) { return barisKotak(x[0], x[1], x[2], x[3], '', x[4], false); }).join('') + '</div>' : '<div class="kartu kosongKm">' + IK('centang', 'besar') + '<b>Semua beres</b><small>Tidak ada yang perlu kamu tindak sekarang.</small></div>';
    h += '<h2 class="bagW">Notifikasi <span>' + (KOTAK.length ? '<button type="button" class="chip" data-aksi="kotakHapus">Bersihkan</button>' : '') + '</span></h2>';
    h += KOTAK.length ? '<div class="kartu daftarKm">' + KOTAK.map(function (x, i) { var ik = IKON_KOTAK[x.j] || IKON_KOTAK.info; return barisKotak(ik[0], ik[1], x.t, x.i, waktuLalu(x.w), 'data-kotak="' + i + '"', !x.b); }).join('') + '</div>'
      : '<div class="kartu kosongKm">' + IK('kotak', 'besar') + '<b>Belum ada notifikasi</b><small>Pesan forum, pengumuman, dan tiket Pos Kontrol yang masuk ke HP ini tampil di sini.</small></div>';
    return h;
  }
  /* kartu "sedang berjalan" melayang di atas navigasi (Beranda) */
  function gambarMelayang() {
    var el = $('melayang'); if (!el) return;
    if (tab !== 'beranda' || !SESI) { el.classList.add('sembunyi'); return; }
    var T2 = daftarTindak(), h = '';
    if (T2.storing.length) { var x = T2.storing[0]; h = '<button type="button" class="mlI merah" data-ke="tab:unit">' + IK('alarm') + '</button><button type="button" class="mlT" data-ke="tab:unit"><b>' + T2.storing.length + ' unit storing sedang ditangani</b><small>' + esc(x.l) + (x.mek ? ' · ' + x.mek : ' · belum ada mekanik') + (x.umur ? ' · ' + x.umur : '') + '</small></button><button type="button" class="mlB" data-ke="tab:unit">Lihat</button>'; }
    else if (SESI.user.peran !== 'driver' && ABSEN && ABSEN.ok) {
      var c = ABSEN.hari || [], m = c.filter(function (y) { return y.tipe === 'Masuk'; })[0], pl = c.filter(function (y) { return /^Pulang/.test(y.tipe); })[0];
      h = '<button type="button" class="mlI" data-ke="tab:absen">' + IK(m ? 'jam' : 'absen') + '</button><button type="button" class="mlT" data-ke="tab:absen"><b>' + (m ? (pl ? 'Sudah pulang ' + esc(String(pl.jam).replace(':', '.')) : 'Sedang bertugas sejak ' + esc(String(m.jam).replace(':', '.'))) : 'Belum absen masuk') + '</b><small>' + (m ? (m.status === 'Telat' ? 'Masuk tercatat telat' : 'Absen masuk tercatat') + (pl ? '' : ' · absen pulang nanti') : 'Pindai wajah + GPS di lokasi site') + '</small></button>' + (pl ? '' : '<button type="button" class="mlB" data-aksi="absen">Absen</button>');
    }
    el.innerHTML = h; el.classList.toggle('sembunyi', !h);
  }
  function segmenAkt() {
    if (!bolehUnit()) return '';
    return '<div class="segmen" role="tablist"><button type="button" role="tab" data-ke="tab:unit" class="' + (tab === 'unit' ? 'on' : '') + '">' + IK('truk') + 'Unit hari ini</button><button type="button" role="tab" data-ke="tab:absen" class="' + (tab === 'absen' ? 'on' : '') + '">' + IK('absen') + 'Absen saya</button></div>';
  }
  /* kartu sorotan yang bisa digeser (pola kartu promo super-app; isinya informasi kerja) */
  function sorotan() {
    var L = [], T2 = daftarTindak(), N = nilaiSaya();
    if (T2.total) L.push(['merah', 'alarm', T2.total + ' unit perlu ditindak', [T2.storing.length ? T2.storing.length + ' storing' : '', T2.gantung.length ? T2.gantung.length + ' tiket gantung' : '', T2.tunjuk.length ? T2.tunjuk.length + ' tunggu mekanik' : '', T2.grup.length ? T2.grup.length + ' grup WA' : ''].filter(Boolean).join(' · '), 'tab:unit', 'Tindak sekarang']);
    var fb = forumBaru(); if (forumTampil()) L.push(['biru', 'forum', fb ? fb + ' pesan baru di Forum' : 'Forum WHL', fb ? 'Ada obrolan tim yang belum kamu baca.' : 'Ngobrol, kirim foto & pesan suara dengan tim.', 'forum', fb ? 'Baca' : 'Buka forum']);
    if (KSN && KSN.ada && KSN.buka) L.push(['ungu', 'kuesioner', KSN.sisa ? 'Kuesioner rekan kerja' : 'Kuesioner selesai', KSN.sisa ? 'Belum diisi ' + KSN.sisa + ' orang. Anonim, boleh dicicil.' : 'Terima kasih, semua rekan sudah kamu nilai.', 'ksn', KSN.sisa ? 'Isi sekarang' : 'Lihat']);
    if (KSN && KSN.ada && KSN.k3) L.push(['ungu', 'insiden', 'Penilaian K3 staf', 'Isi insiden, pelanggaran & temuan APD bulan ini.', 'k3', 'Isi']);
    if (N && N.nilai != null) L.push(['tua', 'profil', 'Nilai bulan ini ' + N.nilai, (N.kategori || '') + (N.label ? ' · ' + N.label : ''), 'tab:akun', 'Lihat rincian']);
    if (!L.length) return '';
    return '<div class="geser">' + L.map(function (x) { return '<button type="button" class="sorot ' + x[0] + '" data-ke="' + x[4] + '"><span class="soI">' + IK(x[1]) + '</span><b>' + esc(x[2]) + '</b><small>' + esc(x[3]) + '</small><em>' + esc(x[5]) + ' ' + IK('kanan') + '</em><span class="soBesar">' + IK(x[1]) + '</span></button>'; }).join('') + '</div>';
  }

  /* ---------- Kuesioner (v2.10): layar asli di kuesioner.js; di sini cuma kartu Beranda + lencana ---------- */
  function ctxKsn() { return { sesi: SESI, simpanSesi: simpanSesi, roti: roti, selesai: function (r) { if (r && r.ada) KSN = r; gambar(); } }; }
  function muatKsn() {
    if (!SESI || !window.WHL_KSN || SESI.user.peran === 'driver') { KSN = null; return; } // driver: server menolak (bukan staf) -> pintunya disembunyikan
    window.WHL_KSN.muat(ctxKsn()).then(function (r) { KSN = r; gambar(); });
  }
  function kartuKsn() {
    if (!KSN || SESI.user.peran === 'driver') return '';
    var h = '';
    if (KSN.ada && KSN.buka) h += '<button type="button" class="uh ksnK' + (KSN.sisa ? ' perlu' : '') + '" data-ke="ksn"><div class="uh-atas"><b>📝 Kuesioner rekan kerja</b><span>' + (KSN.sisa ? '<i class="chip merah">belum diisi ' + KSN.sisa + ' orang</i>' : '<i class="chip hijau">✓ selesai</i>') + ' ›</span></div><div class="kecil" style="margin-top:6px">Saling menilai sikap & kepatuhan SOP, <b>anonim</b>. ' + esc(KSN.alasan || '') + ' Boleh dicicil.</div></button>';
    else if (KSN.ada) h += '<button type="button" class="uh ksnK tutupK" data-ke="ksn"><div class="uh-atas"><b>📝 Kuesioner rekan kerja</b><span>›</span></div><div class="kecil" style="margin-top:4px">🗓️ ' + esc(KSN.alasan || 'Belum dibuka.') + '</div></button>';
    else if (KSN.perluPin) h += '<button type="button" class="uh ksnK tutupK" data-ke="ksn"><div class="uh-atas"><b>📝 Kuesioner rekan kerja</b><span>masuk ›</span></div><div class="kecil" style="margin-top:4px">Ketuk lalu isi PIN sekali untuk melihat jadwal kuesioner.</div></button>';
    if (KSN.ada && KSN.k3) h += '<button type="button" class="uh ksnK" data-ke="k3"><div class="uh-atas"><b>🦺 Penilaian K3 staf</b><span>HSE Officer ›</span></div><div class="kecil" style="margin-top:4px">Isi jumlah insiden, pelanggaran, dan temuan APD tiap staf bulan ini.</div></button>';
    return h;
  }

  /* ---------- Forum (v2.11): forum.js; di sini cuma pintu + lencana ---------- */
  function ctxForum() { return { sesi: SESI, roti: roti, perbarui: function () { aturTanda(); if (tab === 'beranda' || tab === 'apps') gambar(); } }; }
  /* ---------- v2.14 Notifikasi tiket perlu ditindak ---------- */
  var NOTIF = { tiket: false }, TINDAK_LALU = null;
  function jembatan() { var a = window.AndroidDownloader; return a && typeof a.aturNotifTiket === 'function' ? a : null; }
  Simpan.ambil('whlV2Notif').then(function (v) { try { NOTIF = JSON.parse(v || '{}') || { tiket: false }; } catch (e) { /* */ } });
  function aturNotif(nyala) { NOTIF.tiket = !!nyala; Simpan.taruh('whlV2Notif', JSON.stringify(NOTIF)); var j = jembatan(); if (j) try { j.aturNotifTiket(!!nyala); } catch (e) { /* */ } }
  /* saat app terbuka: bandingkan daftar perlu ditindak tiap kali ringkasan dimuat ulang -> yang BARU dibunyikan */
  function cekTindakBaru() {
    if (!bolehUnit()) return; var T2 = daftarTindak(), kini = {}, baru = [];
    ['storing', 'gantung', 'tunjuk'] /* fix: nama kelompok di daftarTindak = tunjuk */.forEach(function (g) { T2[g].forEach(function (x) { var k = g + ':' + (x.id || x.l); kini[k] = x; if (TINDAK_LALU && !TINDAK_LALU[k]) baru.push(x); }); });
    var adaLalu = !!TINDAK_LALU; TINDAK_LALU = kini; if (!baru.length) return;
    if (adaLalu) baru.slice(0, 5).forEach(function (y) { catatKotak('tiket', (y.grup === 'storing' ? 'Storing ' : y.grup === 'gantung' ? 'Tiket gantung ' : 'Tunggu mekanik ') + y.l, (y.ket || '') + (y.lok ? ' · ' + y.lok : ''), { jenis: 'tiket', l: y.l }); });
    var x = baru[0]; R.bunyi('tiketWhl'); R.getar('awas');
    roti((x.grup === 'storing' ? '🚨 Storing ' : x.grup === 'gantung' ? '⏰ Tiket gantung ' : '🔧 Tunggu mekanik ') + x.l + (baru.length > 1 ? ' (+' + (baru.length - 1) + ' lagi)' : '') + ' — buka tab Unit');
  }
  /* dipanggil MainActivity saat notifikasi diketuk */
  window.WHL_TINDAK = function (lb) {
    if (!SESI || $('layarApp').classList.contains('sembunyi')) return false;
    keTab('unit'); if (lb === '*') return true;
    var tunggu = function (n) {
      if (!ok('pos')) { if (n < 30) setTimeout(function () { tunggu(n + 1); }, 500); return; }
      gambar(); var i = TINDAK_SEKARANG.map(function (x) { return kunciLb(x.l); }).indexOf(kunciLb(lb));
      if (i >= 0) lembarTindak(TINDAK_SEKARANG[i]); else roti('Tiket ' + lb + ' sudah tidak ada di daftar perlu ditindak.');
    };
    tunggu(0); return true;
  };
  /* ---------- notif-push-13nov: notifikasi PUSH (FCM) — muncul + bunyi walau app TERTUTUP ----------
   * Hanya jalan di APK yang punya google-services.json (MainActivity.adaFcm) DAN server sudah punya pusatDaftarPerangkat.
   * Kalau belum, app tetap memakai cek tiket berkala (v2.14) sebagai cadangan. */
  var PUSH = { aktif: false, status: 'belum', token: '', galat: '' }, pushPasang = false;
  function pluginPush() { try { return window.Capacitor && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins.PushNotifications; } catch (e) { return null; } }
  function adaFcm() { var a = window.AndroidDownloader; try { return !!(a && typeof a.adaFcm === 'function' && a.adaFcm()); } catch (e) { return false; } }
  var KANAL_PUSH = [
    { id: 'whl_forum', name: 'Forum WHL', description: 'Pesan baru di ruang forum', sound: 'whl_pop' },
    { id: 'whl_sebut', name: 'Forum: kamu disebut', description: 'Seseorang menyebut @namamu', sound: 'whl_aman' },
    { id: 'whl_pengumuman', name: 'Pengumuman', description: 'Pengumuman yang disematkan di forum', sound: 'whl_aman' },
    { id: 'whl_tiket', name: 'Tiket Pos Kontrol', description: 'Storing, tiket gantung, tunggu mekanik', sound: 'whl_alarm' }
  ];
  function bukaDariNotif(d) {
    d = d || {}; if (!SESI) return;
    if (d.jenis === 'forum' && window.WHL_FORUM) window.WHL_FORUM.bukaKe(ctxForum(), String(d.ruang || 'umum'));
    else if (d.jenis === 'tiket' && d.l) window.WHL_TINDAK(String(d.l));
  }
  /* v2.18: alur aktifkan notifikasi per langkah dengan status & galat ASLI: cek app -> ping server ulang -> izin -> token FCM -> daftar ke server.
     Dijalankan otomatis tiap app dibuka / kembali dari latar / buka Akun (kalau belum aktif), dan manual lewat tombol "Aktifkan notifikasi". */
  var pushJalan = null, pushTunggu = null;
  function pushSet(st, galat) { PUSH.status = st; PUSH.galat = galat || ''; PUSH.aktif = st === 'aktif'; if (tab === 'akun') gambar(); }
  function pasangPendengar(PN) {
    if (pushPasang) return; pushPasang = true;
    PN.addListener('registration', function (t) {
      clearTimeout(pushTunggu); PUSH.token = t.value; if (!SESI) return;
      pushSet('mendaftar', 'Token HP didapat, mendaftarkan ke server...');
      API.Pusat.daftarPerangkat(SESI, t.value, platformPush()).then(function (h) {
        if (h && h.ok) { pushSet('aktif'); if (NOTIF.tiket) aturNotif(false); /* server sudah kirim notifikasi tiket -> cek berkala dimatikan supaya tidak dobel */ }
        else if (h && h.login === false) pushSet('gagal', 'Server menolak: sesi habis. Keluar lalu masuk lagi.');
        else pushSet('gagal', 'Server menolak: ' + ((h && h.pesan) || 'tanpa keterangan'));
      }, function (e) { pushSet('gagal', 'Gagal menghubungi server: ' + ((e && e.message) || e)); });
    });
    PN.addListener('registrationError', function (e) { clearTimeout(pushTunggu); pushSet('gagal', 'Gagal ambil token notifikasi: ' + ((e && (e.error || e.message)) || 'tanpa keterangan')); });
    /* app sedang dibuka: Android tidak menampilkan notifikasi -> tampilkan sendiri + bunyi */
    PN.addListener('pushNotificationReceived', function (n) {
      var d = n.data || {}; catatKotak(d.jenis === 'tiket' ? 'tiket' : /^📌/.test(n.title || '') ? 'pengumuman' : /menyebutmu/.test(n.title || '') ? 'sebut' : d.jenis === 'forum' ? 'forum' : 'info', n.title, n.body, d);
      if (d.jenis === 'forum' && window.WHL_FORUM && window.WHL_FORUM.siap()) return; // forum tersambung sudah membunyikan sendiri
      R.bunyi(d.jenis === 'tiket' ? 'tiketWhl' : 'pesanWhl'); R.getar('awas'); roti((n.title ? n.title + ' — ' : '') + (n.body || ''));
      if (d.jenis === 'tiket') muatRingkasan(false);
    });
    PN.addListener('pushNotificationActionPerformed', function (a) { var d = (a.notification && a.notification.data) || {}; catatKotak(d.jenis === 'tiket' ? 'tiket' : d.jenis === 'forum' ? 'forum' : 'info', a.notification && a.notification.title, a.notification && a.notification.body, d); if (KOTAK[0]) KOTAK[0].b = true; setTimeout(function () { bukaDariNotif(d); }, 400); });
    KANAL_PUSH.forEach(function (k) { PN.createChannel({ id: k.id, name: k.name, description: k.description, sound: k.sound, importance: 5, visibility: 1, vibration: true, lights: true, lightColor: '#1E88E5' }).catch(function () { }); });
  }
  /* ---------- PWA (iPhone iOS 16.4+ dipasang ke layar utama / Chrome Android): WEB PUSH lewat Firebase Messaging + VAPID ---------- */
  var webPesan = null;
  function webPushBisa() { return !pluginPush() && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && location.protocol === 'https:'; }
  function muatJs(src) { return new Promise(function (ok, gagal) { if (document.querySelector('script[src="' + src + '"]') && (src.indexOf('app-compat') < 0 || window.firebase)) return ok(); var e = document.createElement('script'); e.src = src; e.setAttribute('data-src', src); e.onload = function () { e.dataset.siap = '1'; ok(); }; e.onerror = function () { gagal(new Error('gagal memuat ' + src)); }; document.head.appendChild(e); }); }
  function muatMessaging() { return (window.firebase ? Promise.resolve() : muatJs('lib/firebase/firebase-app-compat.js')).then(function () { return window.firebase.messaging ? null : muatJs('lib/firebase/firebase-messaging-compat.js'); }); }
  function iosBelumDipasang() { var ua = navigator.userAgent || '', ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); return ios && !(window.WHL_PASANG && window.WHL_PASANG.berdiri()); }
  function pasangWebPush(manual) {
    var KF = window.WHL_FORUM_KONFIG || {};
    if (iosBelumDipasang()) { pushSet('pasangDulu'); return Promise.resolve(); }
    if (!webPushBisa()) { pushSet('webTidak'); return Promise.resolve(); }
    if (!KF.vapid) { pushSet('server', 'Kunci Web Push belum dipasang di app. Notifikasi untuk iPhone menyusul.'); return Promise.resolve(); }
    if (Notification.permission === 'denied') { pushSet('ditolak', 'Notifikasi untuk WHL diblokir. iPhone: Setelan > Notifikasi > WHL > Izinkan Notifikasi.'); return Promise.resolve(); }
    if (Notification.permission !== 'granted' && !manual) { pushSet('belum'); return Promise.resolve(); } // iOS wajib dari ketukan pengguna
    if (pushJalan) return pushJalan;
    pushSet('mendaftar', 'Memeriksa server...');
    pushJalan = API.Pusat.cekUlang().then(function () {
      if (!API.Pusat.punya('pusatDaftarPerangkat')) { pushSet('server', 'Server belum punya fungsi notifikasi (atau tidak terjangkau). Coba lagi nanti.'); return; }
      return (Notification.permission === 'granted' ? Promise.resolve('granted') : Notification.requestPermission()).then(function (iz) {
        if (iz !== 'granted') { pushSet('ditolak', 'Izin notifikasi tidak diberikan. iPhone: Setelan > Notifikasi > WHL > Izinkan Notifikasi, lalu coba lagi.'); return; }
        pushSet('mendaftar', 'Mengambil token notifikasi...');
        return muatMessaging().then(function () {
        var fb = (window.firebase.apps || []).filter(function (x) { return x.name === 'pesan-whl'; })[0] || window.firebase.initializeApp(KF.firebase, 'pesan-whl');
        webPesan = webPesan || fb.messaging();
        return navigator.serviceWorker.ready.then(function (reg) { return webPesan.getToken({ vapidKey: KF.vapid, serviceWorkerRegistration: reg }); }).then(function (tok) {
          if (!tok) throw new Error('token kosong');
          PUSH.token = tok; pushSet('mendaftar', 'Token didapat, mendaftarkan ke server...');
          if (!webPesan._dengar) { webPesan._dengar = true; webPesan.onMessage(function (m) { var n = m.notification || {}, d = m.data || {}; catatKotak(d.jenis === 'tiket' ? 'tiket' : d.jenis === 'forum' ? 'forum' : 'info', n.title, n.body, d); R.bunyi(d.jenis === 'tiket' ? 'tiketWhl' : 'pesanWhl'); roti((n.title ? n.title + ' — ' : '') + (n.body || '')); }); }
          return API.Pusat.daftarPerangkat(SESI, tok, 'web').then(function (h) {
            if (h && h.ok) pushSet('aktif'); else if (h && h.login === false) pushSet('gagal', 'Server menolak: sesi habis. Keluar lalu masuk lagi.'); else pushSet('gagal', 'Server menolak: ' + ((h && h.pesan) || 'tanpa keterangan'));
          });
        });
        });
      });
    }).catch(function (e) { pushSet('gagal', 'Gagal: ' + ((e && e.message) || e)); }).then(function () { pushJalan = null; });
    return pushJalan;
  }
  function pasangPush(manual) {
    var PN = pluginPush();
    if (!PN) { if (!SESI || (PUSH.aktif && !manual)) return Promise.resolve(); return pasangWebPush(manual); }
    if (!adaFcm()) { pushSet('tanpaFcm'); return Promise.resolve(); }
    if (!SESI) return Promise.resolve();
    if (PUSH.aktif && !manual) return Promise.resolve();
    if (pushJalan) return pushJalan;
    pushSet('mendaftar', 'Memeriksa server...');
    pushJalan = API.Pusat.cekUlang().then(function () {
      if (!API.Pusat.punya('pusatDaftarPerangkat')) { pushSet('server', 'Server belum punya fungsi notifikasi (atau tidak terjangkau). Coba lagi nanti.'); return; }
      pasangPendengar(PN);
      pushSet('mendaftar', 'Memeriksa izin notifikasi...');
      return PN.checkPermissions().then(function (p) {
        if (p.receive === 'granted') return p;
        if (p.receive === 'denied' && !manual) return p; // jangan ganggu tiap buka app; tombol Aktifkan meminta lagi
        return PN.requestPermissions();
      }).then(function (p) {
        if (p.receive !== 'granted') { pushSet('ditolak', 'Izin notifikasi untuk WHL ditolak di HP ini.'); return; }
        pushSet('mendaftar', 'Mengambil token notifikasi dari Google...');
        clearTimeout(pushTunggu); pushTunggu = setTimeout(function () { if (PUSH.status === 'mendaftar') pushSet('gagal', 'Token notifikasi tidak datang dalam 25 detik. Pastikan Layanan Google Play aktif & ada internet, lalu coba lagi.'); }, 25000);
        return PN.register();
      });
    }).catch(function (e) { pushSet('gagal', 'Gagal: ' + ((e && e.message) || e)); }).then(function () { pushJalan = null; });
    return pushJalan;
  }
  function lepasPush() { var PN = pluginPush(); PUSH.aktif = false; PUSH.status = 'belum'; PUSH.galat = ''; if (PN && adaFcm() && pushPasang) try { PN.unregister(); } catch (e) { /* */ } }
  /* app kembali dari latar -> ping ulang + coba lagi kalau belum aktif */
  document.addEventListener('visibilitychange', function () { if (!document.hidden && SESI && API.Pusat.asli() && !PUSH.aktif) pasangPush(false); if (!document.hidden && SESI && window.WHL_RILIS) window.WHL_RILIS.cekOtomatis(); });
  function suaraKeras() { return R.setel.keras !== false; }
  function platformPush() { return suaraKeras() ? 'andr-whl4' : 'andr-biasa'; } /* v3.7: andr-whl4 = saluran whl4_* (suara "We Ha El") */
  function barisSuaraKeras() {
    return '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Suara notifikasi keras</b><div class="kecil">Suara WHL: perempuan berkata "Pesan, We Ha El" / "Tiket, We Ha El" + jingle, keras & jelas, getar panjang. Juga di dalam app.</div></div><button type="button" class="saklar' + (suaraKeras() ? ' on' : '') + '" data-aksi="suaraKeras" role="switch" aria-checked="' + suaraKeras() + '" aria-label="Suara notifikasi keras"><i></i></button></div>'
      + '<button type="button" class="tKecil" data-aksi="ujiBunyi" style="width:100%;margin-top:10px">' + IK('lonceng') + ' Uji bunyi notifikasi</button>';
  }
  function pushBaris() {
    if (PUSH.status === 'belum' && pluginPush() && !adaFcm()) PUSH.status = 'tanpaFcm';
    if (PUSH.status === 'belum' && !pluginPush()) PUSH.status = iosBelumDipasang() ? 'pasangDulu' : webPushBisa() ? 'belum' : 'webTidak';
    var t = { aktif: ['Aktif', 'Notifikasi forum & tiket muncul dengan bunyi walau app ditutup.'], mendaftar: ['Menyambungkan...', ''],
      ditolak: ['Izin ditolak', 'Buka setelan notifikasi, nyalakan "Izinkan notifikasi" untuk WHL, lalu kembali ke sini.'], gagal: ['Gagal', ''],
      server: ['Belum tersedia', ''], tanpaFcm: ['Belum tersedia', 'Versi app ini belum tersambung ke layanan notifikasi.'],
      bukanApp: ['Hanya di app Android', 'Notifikasi langsung hanya ada di app Android WHL.'], pasangDulu: ['Pasang dulu', 'Di iPhone, notifikasi hanya bisa kalau WHL sudah ditambahkan ke Layar Utama (Bagikan > Tambahkan ke Layar Utama), lalu dibuka dari ikonnya. Butuh iOS 16.4 ke atas.'],
      webTidak: ['Tidak didukung', 'Peramban / versi iOS ini belum mendukung notifikasi web (perlu iOS 16.4+).'], belum: ['Belum aktif', 'Ketuk "Aktifkan notifikasi".'] }[PUSH.status] || ['Belum aktif', ''];
    var ket = PUSH.galat || t[1], bisa = (pluginPush() && adaFcm()) || (!pluginPush() && webPushBisa() && !iosBelumDipasang());
    return '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Notifikasi langsung</b><div class="kecil" id="pushKet">' + esc(ket) + '</div></div>'
      + '<span class="kecil" style="white-space:nowrap;font-weight:800;color:' + (PUSH.aktif ? 'var(--utama)' : PUSH.status === 'gagal' || PUSH.status === 'ditolak' ? 'var(--tMerah)' : 'var(--redup)') + '">' + esc(t[0]) + '</span></div>'
      + (bisa && !PUSH.aktif && PUSH.status !== 'mendaftar' ? '<button type="button" class="tUtama" data-aksi="pushUlang" style="margin-top:10px;min-height:48px;font-size:15px">Aktifkan notifikasi</button>' : '')
      + (PUSH.status === 'ditolak' && window.AndroidDownloader && window.AndroidDownloader.bukaSetelanNotif ? '<button type="button" class="tKecil" data-aksi="pushSetelan" style="width:100%;margin-top:8px">Buka setelan notifikasi HP</button>' : '')
      + (PUSH.aktif ? '<button type="button" class="tKecil" data-aksi="pushUlang" style="width:100%;margin-top:10px">Daftarkan ulang HP ini</button>' : '')
      + (pluginPush() ? '<button type="button" class="tKecil" data-aksi="pushTips" style="width:100%;margin-top:8px">Notifikasi telat / tidak bunyi?</button>' : '');
  }
  function lembarTipsNotif() {
    bukaLembar('<h3>Supaya notifikasi selalu muncul</h3>'
      + '<p class="kecil">Beberapa merek HP mematikan app di latar untuk hemat baterai. Lakukan sekali saja:</p>'
      + '<ol class="kecil" style="padding-left:18px;line-height:1.55"><li><b>Semua HP:</b> Setelan &gt; Aplikasi &gt; WHL &gt; Notifikasi = <b>Izinkan</b>, semua kategori nyala (Forum, Tiket, Pengumuman).</li>'
      + '<li><b>Baterai:</b> Setelan &gt; Aplikasi &gt; WHL &gt; Baterai = <b>Tidak dibatasi</b>.</li>'
      + '<li><b>Xiaomi / Redmi / POCO:</b> Setelan &gt; Aplikasi &gt; Kelola aplikasi &gt; WHL &gt; <b>Mulai otomatis</b> nyala, Penghemat baterai = <b>Tanpa batasan</b>. Di menu Terbaru, tahan kartu WHL lalu ketuk ikon gembok.</li>'
      + '<li><b>Oppo / Realme:</b> Setelan &gt; Baterai &gt; WHL &gt; <b>Izinkan aktivitas latar</b> + <b>Izinkan mulai otomatis</b>.</li>'
      + '<li><b>Vivo / iQOO:</b> Setelan &gt; Baterai &gt; Konsumsi daya latar tinggi &gt; WHL nyala; Setelan &gt; Aplikasi &gt; Izin &gt; <b>Mulai otomatis</b> nyala.</li>'
      + '<li><b>Samsung:</b> Setelan &gt; Baterai &gt; Batas penggunaan latar &gt; pastikan WHL <b>tidak</b> ada di "Aplikasi tidur".</li>'
      + '<li>Di HP merek di atas, jangan geser-tutup WHL dari menu Terbaru.</li></ol>'
      + '<p class="kecil">HP mati / tanpa sinyal: notifikasi menyusul begitu HP tersambung lagi (maks 1 jam).</p>'
      + '<button type="button" class="tKecil" data-aksi="tutup" style="width:100%;margin-top:12px">Mengerti</button>');
  }
  setInterval(function () { if (SESI && !document.hidden && API.Pusat.asli()) muatRingkasan(false); }, 300000); // app terbuka: segarkan ringkasan tiap 5 menit

  function muatForum() { if (!SESI || !window.WHL_FORUM || !API.Pusat.asli()) return; window.WHL_FORUM.mulai(ctxForum()).then(function (h) { FORUM = h; gambar(); if (h && h.ok && window.WHL_BANNER) window.WHL_BANNER.muat().then(function (ada) { if (ada && tab === 'beranda') gambar(); }); if (h && h.ok && window.WHL_ONLINE) window.WHL_ONLINE.mulai({ sesi: function () { return SESI; }, perbarui: function () { if (tab === 'beranda') gambar(); } }); }); }
  /* v3.9: nama staf yang sedang bertugas (absen hari ini) untuk mengisi peserta banner — hanya dipakai admin di Kelola banner */
  function bertugasNama() { return API.Pusat.ringkasan(SESI, 'bertugas', true).then(function (r) { var P = (r && r.bertugas && r.bertugas.petugas) || []; return P.map(function (x) { return String(x.nama || '').trim(); }).filter(Boolean); }); }
  function ctxBanner() { return { bertugas: bertugasNama, roti: roti, perbarui: function () { if (tab === 'beranda') gambar(); }, tab: function (t) { keTab(t); }, web: bukaWeb,
    forum: function (r) { if (window.WHL_FORUM) window.WHL_FORUM.bukaKe(ctxForum(), r); }, aksi: function (n) { if (n === 'ksn' && window.WHL_KSN) window.WHL_KSN.buka(ctxKsn()); } }; }
  function forumTampil() { return !!window.WHL_FORUM && API.Pusat.asli() && !(FORUM && FORUM.ditolak); }
  function forumBaru() { return window.WHL_FORUM && window.WHL_FORUM.siap() ? window.WHL_FORUM.totalBaru() : 0; }

  /* ---------- muat data ---------- */
  var sedangMuat = false;
  function muatRingkasan(paksa) {
    if (!SESI) return Promise.resolve(); sedangMuat = true;
    return API.Pusat.ringkasan(SESI, 'pos,gps,target,subcon,insiden,do,solar', paksa) /* v2.6: tanpa 'absen' & 'bertugas' (kehadiran orang lain tidak ditampilkan di app) */.then(function (r) {
      sedangMuat = false;
      if (r && r.login === false) { if (SESI && SESI.bio) bioGugur(SESI.idProfil || SESI.idKetik); keLogin('Sesi habis. Silakan masuk lagi pakai PIN.'); return; }
      if (r && r.user && SESI.mode === 'asli') { SESI.user = r.user; simpanSesi(); }
      var pertama = !D.serverJam, lama = D.pos && D.pos.tiket ? Number(D.pos.tiket.nunggu) || 0 : null;
      D = r || {}; gambar(pertama); cekTindakBaru();
      var kini = D.pos && D.pos.ok && D.pos.tiket ? Number(D.pos.tiket.nunggu) || 0 : 0;
    }, function (e) { sedangMuat = false; D = { galat: e.message }; gambar(); });
  }
  function muatAbsen() {
    if (!SESI || !SESI.tokenAbm) { ABSEN = { tanpa: true }; gambar(); return; }
    API.Absen.status(SESI.tokenAbm).then(function (h) {
      if (h.login === false) {
        SESI.tokenAbm = ''; SESI.abmPesan = 'Sesi absen habis. Ketuk "Aktifkan absen" lalu isi PIN.'; simpanSesi();
        if (SESI.mode === 'tiruan') { keLogin('Sesi habis. Silakan masuk lagi.'); return; } // di mode sementara sesi absen = sesi app
        ABSEN = { tanpa: true };
      } else ABSEN = h;
      gambar();
    }, function (e) { ABSEN = { galat: e.message }; gambar(); });
  }
  /* Profil asli (Input DO ?mode=profiljson). KPI ikut di dalam profil; kalau profil gagal, KPI dicoba dari ?mode=kpi. */
  function muatProfil(paksa) {
    if (!SESI) return;
    API.Profil.ambil(SESI.idProfil || SESI.idKetik, paksa).then(function (p) {
      PROFIL = p;
      var k = p.kpi || null;
      KPI = { bulan: (k && k.bulan) || '', dibuat: (k && k.dibuat) || '', persenBulan: k && k.persenBulan, staf: k && !k.error ? k : null, pesan: k && k.error };
      if (kpiLewatPusat() && (p.jenis === 'staf' || !k || k.pribadi)) muatKpiSaya(); /* v3.6: nilai dari pusatKpiSaya (profil publik tidak lagi berisi nilai) */
      cekCapaianBaru(p);
      var nm = p.namaLengkap || p.nama || p.driver; if (nm && SESI) { SESI.namaLengkap = nm; if (p.jabatan) SESI.jabatan = p.jabatan; simpanSesi(); $('tAkun').textContent = inisial(nm); }
      gambar();
    }, function (e) {
      PROFIL = { galat: e.message }; gambar();
      if (kpiLewatPusat()) { muatKpiSaya(); return; }
      API.Kpi.untuk(SESI.idProfil || SESI.idKetik, SESI.namaLengkap || SESI.user.nama, paksa).then(function (k) { KPI = k; gambar(); }, function (e2) { KPI = { galat: e2.message }; gambar(); });
    });
  }
  function kpiLewatPusat() { return API.Pusat.asli() && API.Pusat.punya('pusatKpiSaya'); }
  function muatKpiSaya() {
    if (!SESI) return;
    API.Kpi.saya(SESI).then(function (k) {
      if (k && k.login === false) { keLogin('Sesi habis. Silakan masuk lagi.'); return; }
      KPI = { bulan: (k && k.bulan) || '', dibuat: (k && k.dibuat) || '', persenBulan: k && k.persenBulan, staf: k && k.ok ? k.kpi : null, pesan: k && k.ok ? k.ket : (k && k.pesan) };
      if (PROFIL && !PROFIL.galat && k && k.ok) PROFIL.kpi = k.kpi;
      gambar();
    }, function (e) { KPI = { galat: e.message }; gambar(); });
  }
  /* Bandingkan lencana/achievement dengan yang terakhir dilihat di HP ini; kalau ada yang baru / naik tingkat -> rayakan. */
  function cekCapaianBaru(p) {
    if (!SESI) return;
    var kini = {}; (p.pencapaian || []).forEach(function (x) { kini['a:' + (x.id || x.nm)] = x.tier || '1'; }); (p.lencana || []).forEach(function (x) { kini['l:' + x.nm] = x.tier || '1'; });
    var kunci = 'whlV2Capai_' + String(SESI.idProfil || SESI.idKetik).replace(/[^A-Z0-9]/g, '');
    Simpan.ambil(kunci).then(function (v) {
      var lama = null; try { lama = JSON.parse(v || 'null'); } catch (e) { lama = null; }
      Simpan.taruh(kunci, JSON.stringify(kini));
      if (!lama) return; // pertama kali: jangan rayakan semuanya sekaligus
      var baru = Object.keys(kini).filter(function (k) { return lama[k] !== kini[k]; });
      if (!baru.length) return;
      R.konfeti(); R.bunyi('achievement'); R.getar('sukses'); roti('🏆 ' + (baru.length > 1 ? baru.length + ' pencapaian baru!' : 'Pencapaian baru: ' + baru[0].slice(2)));
    });
  }
  /* ---------- potongan tampilan ---------- */
  function chipAbsen() {
    if (SESI && SESI.user.peran === 'driver') return '';
    if (!ABSEN) return '<span class="chip"><span class="putar"></span> Memuat absen...</span>';
    if (ABSEN.tanpa) return '<span class="chip kuning">Absen mandiri belum aktif</span>';
    if (ABSEN.galat) return '<span class="chip merah">Absen: ' + esc(ABSEN.galat) + '</span>';
    if (!ABSEN.ok) return '<span class="chip merah">' + esc(ABSEN.pesan || 'Gagal memuat absen') + '</span>';
    var c = ABSEN.hari || [], m = c.filter(function (x) { return x.tipe === 'Masuk'; })[0], p = c.filter(function (x) { return /^Pulang/.test(x.tipe); })[0];
    return (m ? '<span class="chip ' + (m.status === 'Telat' ? 'kuning' : 'hijau') + '">Masuk ' + esc(String(m.jam).replace(':', '.')) + (m.status === 'Telat' ? ' · telat' : '') + '</span>' : '<span class="chip">Belum masuk</span>')
      + (p ? '<span class="chip biru">Pulang ' + esc(String(p.jam).replace(':', '.')) + '</span>' : (m ? '<span class="chip">Belum pulang</span>' : ''));
  }
  function tombolAbsen() {
    if (ABSEN && ABSEN.tanpa) return '<div class="kecil" style="margin-top:10px">' + esc((SESI && SESI.abmPesan) || 'Absen mandiri belum aktif di HP ini.') + '</div>' + (SESI && SESI.mode === 'asli' ? '<button type="button" class="tKecil" data-aksi="aktifAbsen" style="margin-top:10px;width:100%">Aktifkan absen (isi PIN)</button>' : '');
    return '<button type="button" class="tUtama tHijau" data-aksi="absen" style="margin-top:12px">🤳 ABSEN SEKARANG</button><div class="kecil" style="margin-top:8px;text-align:center">GPS maks ' + esc((ABSEN && ABSEN.titik && ABSEN.titik.radius) || 100) + ' m dari titik site + cek wajah.</div>';
  }
  function naik(n, des) { var v = Number(n) || 0; return '<span data-naik="' + v + '" data-des="' + (des || 0) + '">' + v.toLocaleString('id-ID', { minimumFractionDigits: des || 0, maximumFractionDigits: des || 0 }) + '</span>'; }
  function ring(ik, jd, ag, kt, ekstra) { return '<div class="ring' + (ekstra && ekstra.lebar ? ' lebar' : '') + '"><span class="ik">' + ik + '</span><span class="jd">' + esc(jd) + '</span><span class="ag">' + ag + '</span><span class="kt">' + kt + '</span>' + contoh() + ((ekstra && ekstra.html) || '') + '</div>'; }
  function ok(b) { return D[b] && D[b].ok; }
  function hitungUnit() { var h = {}; ((D.pos && D.pos.units) || []).forEach(function (u) { h[u.s] = (h[u.s] || 0) + 1; }); var x = (D.pos && D.pos.hit) || {}; Object.keys(x).forEach(function (k) { if (typeof x[k] === 'number' && !(k in h)) h[k] = x[k]; }); return h; }
  var STATUS = { siap: ['Sudah dicek', '#16a34a'], belum: ['Belum masuk', '#6366f1'], nunggu: ['Nunggu mekanik', '#eab308'], dikerjakan: ['Lagi diperbaiki', '#f97316'], standby: ['Standby', '#a3acb9'] };
  var WARNA_TINDAK = { tindak: '#dc2626' };

  /* Grid ikon bulat "layanan" (pola beranda app dompet/belanja): jalan pintas yang paling sering dipakai peran ini. */
  function layanan() {
    var L = [];
    if (SESI.user.peran !== 'driver') L.push(['absen', 'Absen', 'tab:absen']);
    if (bolehUnit()) L.push(['truk', 'Unit', 'tab:unit', daftarTindak().total]);
    if (forumTampil()) L.push(['forum', 'Forum', 'forum', forumBaru()]);
    L.push(['input', 'Input', 'lapor']);
    if (KSN && (KSN.ada || KSN.perluPin) && SESI.user.peran !== 'driver') L.push(['kuesioner', 'Kuesioner', 'ksn', KSN.ada && KSN.buka ? KSN.sisa : 0]);
    L.push(['profil', 'Nilai saya', 'tab:akun']);
    appsSaya().forEach(function (a) { L.push([IKON_DIV[a.d] || 'web', a.n.replace(/ WHL$/, '').replace(/^Live Monitor /, '').replace(/^Dashboard /, ''), 'web:' + alamat(a)]); });
    L = L.slice(0, 7); L.push(['lainnya', 'Lainnya', 'lainnya']); // 2 baris x 4 ikon, ikon ke-8 selalu "Lainnya" (lembar bawah semua layanan)
    return '<div class="layanan">' + L.map(function (x) { return '<button type="button" class="ly" data-ke="' + esc(x[2]) + '"><span>' + ILUS(x[0]) + (x[3] ? '<i class="tanda angka">' + (x[3] > 9 ? '9+' : x[3]) + '</i>' : '') + '</span><b>' + esc(x[1]) + '</b></button>'; }).join('') + '</div>';
  }
  /* v3.0 lembar "Lainnya": semua layanan asli + aplikasi web WHL, ikon ilustrasi berwarna (buatan sendiri, palet WHL) */
  var ILUS = window.WHL_ILUS;
  function petakLy(x) { return '<button type="button" class="ly lyL" data-ke="' + esc(x[2]) + '"><span>' + ILUS(x[0]) + (x[3] ? '<i class="tanda angka">' + (x[3] > 9 ? '9+' : x[3]) + '</i>' : '') + (x[4] ? '<i class="baru">Baru</i>' : '') + '</span><b>' + esc(x[1]) + '</b></button>'; }
  function lembarLainnya() {
    var A = [], T2 = daftarTindak();
    if (SESI.user.peran !== 'driver') A.push(['absen', 'Absen', 'tab:absen']);
    if (bolehUnit()) A.push(['truk', 'Unit hari ini', 'tab:unit', T2.total]);
    if (forumTampil()) A.push(['forum', 'Forum', 'forum', forumBaru()]);
    A.push(['input', 'Input cepat', 'lapor']);
    A.push(['kotak', 'Kotak masuk', 'tab:kotak', kotakBelum(), 1]);
    if (hitungProyeksi()) A.push(['grafik', 'Proyeksi target', 'proyeksi', 0, 1]);
    if (KSN && (KSN.ada || KSN.perluPin)) A.push(['kuesioner', 'Kuesioner', 'ksn', KSN.ada && KSN.buka ? KSN.sisa : 0]);
    if (KSN && KSN.ada && KSN.k3) A.push(['insiden', 'Penilaian K3', 'k3']);
    A.push(['profil', 'Nilai saya', 'tab:akun']);
    A.push(['akun', 'Akun', 'tab:akun']);
    if (window.WHL_BANNER && window.WHL_BANNER.admin()) A.push(['kreatif', 'Kelola banner', 'kelolaBanner', 0, 1]);
    var W = appsSaya().map(function (a) { return [IKON_DIV[a.d] || 'web', a.n.replace(/ WHL$/, '').replace(/^Live Monitor /, ''), 'web:' + alamat(a), 0, a.baru]; });
    W.push(['rumahWeb', 'Pusat WHL web', 'web:' + K.DASH + '?mode=pusat']);
    bukaLembar('<div class="lembarLy"><h3>Layanan WHL</h3><div class="layanan">' + A.map(petakLy).join('') + '</div>'
      + '<h3>Aplikasi WHL</h3><div class="kecil" style="margin:-4px 0 10px">Halaman web, dibuka di dalam app. Tombol Kembali membawa kamu ke sini lagi.</div><div class="layanan">' + W.map(petakLy).join('') + '</div></div>');
  }

  /* ---------- Beranda: susunan & istilah mengikuti Pusat WHL web (pusat.html) ---------- */
  var DIV = { pos: ['Pos Kontrol', '🔧', '#ea580c', '#fff1e8'], ritase: ['Ritase', '🚚', '#2563eb', '#eaf1ff'], gps: ['GPS', '📍', '#0891b2', '#e6f7fb'], subcon: ['Ritase Harian per Rute', '🛣️', '#db2777', '#fdeef6'],
    insiden: ['Insiden', '🦺', '#be123c', '#fdecef'], 'do': ['DO & Uang Jalan', '🧾', '#7c3aed', '#f2ecff'], solar: ['Solar', '⛽', '#b45309', '#fdf3e4'], gudang: ['Gudang', '📦', '#0f766e', '#e6f6f3'],
    input: ['Input cepat', '➕', '#15803d', '#e8f7ee'], kreatif: ['Kreatif (Bot AI)', '🎬', '#9333ea', '#f5ecff'], absensi: ['Absensi & Roster', '🪪', '#0369a1', '#e0f2fe'], apps: ['Semua Aplikasi', '🧭', '#475569', '#eef1f5'] };
  var IKON_DIV = { pos: 'monitor', ritase: 'grafik', gps: 'lokasi', subcon: 'peta', insiden: 'insiden', 'do': 'dokumen', solar: 'solar', gudang: 'gudang', input: 'input', kreatif: 'kreatif', absensi: 'kartuId', apps: 'lainnya', inventaris: 'centang' };
  var IKON_BESAR = { pos: '🛠️', ritase: '🚛', gps: '🛰️', subcon: '🛣️', insiden: '🦺', 'do': '🧾', solar: '⛽', gudang: '📦', input: '✍️', kreatif: '🎬', absensi: '🪪', apps: '🧭' };
  var URUT_KARTU = ['pos', 'ritase', 'gps', 'subcon', 'insiden', 'do', 'solar', 'absensi', 'input', 'kreatif', 'apps']; /* v2.12: kartu gudang dibuang (keputusan Reza) */
  var KELOMPOK = { pimpinan: ['⭐', 'Pimpinan'], pengawas: ['🦺', 'Pengawas'], mekanik: ['🔧', 'Mekanik'], admin: ['🗂️', 'Admin & logistik'], hse: ['⛑️', 'HSE'], lain: ['👷', 'Lainnya'] };
  function sapa() { var d = new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000), h = d.getHours(); return h >= 4 && h < 11 ? 'Selamat pagi' : h >= 11 && h < 15 ? 'Selamat siang' : h >= 15 && h < 18 ? 'Selamat sore' : 'Selamat malam'; }
  function rp(n) { return Number(n || 0).toLocaleString('id-ID'); }
  function vbar(seg) { return '<div class="vbar">' + seg.map(function (x) { return x[0] ? '<i style="flex:' + x[0] + ';background:' + x[1] + '"></i>' : ''; }).join('') + '</div>'; }
  function vleg(seg) { return '<div class="vleg">' + seg.map(function (x) { return '<span><b style="background:' + x[1] + '"></b>' + esc(x[2]) + '</span>'; }).join('') + '</div>'; }
  /** Isi satu kartu topik: angka besar, arti, 2 baris kecil. Kalimatnya sama dengan fungsi kartu() di pusat.html. */
  function isiKartu(k) {
    var x = { ang: '', sat: '', art: '', mini: [], vis: '', mati: false, v: null };
    var muat = function () { x.ang = '…'; x.art = 'memuat'; }, gagalK = function (t) { x.mati = true; x.ang = '–'; x.art = t; };
    if (k === 'pos') {
      if (!D.pos) muat(); else if (!ok('pos')) gagalK('Live Monitor tidak terbaca');
      else { var P = D.pos, h = hitungUnit(); x.v = (h.nunggu || 0) + (h.dikerjakan || 0); x.sat = ' unit'; x.art = 'lagi di bengkel Pos Kontrol'; x.mini = [(h.nunggu || 0) + ' nunggu mekanik', (h.dikerjakan || 0) + ' lagi diperbaiki']; if (P.perluTindak) x.mini.unshift('🚨 ' + P.perluTindak + ' perlu ditindak');
        var sg = [[(h.siap || 0) + (h.belum || 0), '#bbf7d0', 'RFU ' + ((h.siap || 0) + (h.belum || 0) + (h.standby || 0))], [h.standby || 0, '#e5e7eb', 'standby ' + (h.standby || 0)], [h.nunggu || 0, '#fde047', 'nunggu ' + (h.nunggu || 0)], [h.dikerjakan || 0, '#7c2d12', 'diperbaiki ' + (h.dikerjakan || 0)]]; x.vis = vbar(sg) + vleg(sg); }
    } else if (k === 'ritase') {
      if (!D.gps) muat(); else if (!ok('gps')) gagalK('Ritase GPS tidak terbaca');
      else { var G = D.gps, TG = ok('target') ? D.target : null; x.v = G.totalRit; x.sat = ' rit'; x.art = 'rit GPS hari ini sejak 06.00';
        x.mini = TG && TG.target ? ['KM bulan ini ' + rp(TG.kmMtd) + ' dari ' + rp(TG.target) + ' (' + String(TG.persen).replace('.', ',') + '%)', 'Perlu ±' + rp(TG.sisaRitHari != null ? TG.sisaRitHari : TG.butuhRitHari) + ' rit/hari'] : (G.rute || []).slice(0, 2).map(function (r) { return r[0] + ': ' + r[1] + ' rit'; });
        if (!x.mini.length) x.mini = ['Belum ada rit hari ini'];
        if (TG && TG.target) x.vis = '<div class="vbar"><i style="flex:' + Math.max(0.5, TG.persen) + ';background:#bbf7d0"></i><i style="flex:' + Math.max(0, 100 - TG.persen) + ';background:rgba(255,255,255,.12)"></i></div><div class="vleg"><span>' + String(TG.persen).replace('.', ',') + '% target KM bulan ini</span></div>'; }
    } else if (k === 'insiden') {
      if (!D.insiden) muat(); else if (!ok('insiden')) gagalK('Data insiden tidak terbaca');
      else { var I = D.insiden; if (I.hariSejak == null) { x.ang = '–'; x.art = 'belum ada insiden tercatat'; } else { x.v = I.hariSejak; x.sat = ' hari'; x.art = 'aman sejak kejadian terakhir'; var hs = Math.min(30, I.hariSejak); x.vis = vbar([[hs, '#bbf7d0'], [30 - hs, 'rgba(255,255,255,.12)']]) + '<div class="vleg"><span>menuju 30 hari tanpa insiden</span></div>'; }
        x.mini = [I.tahunIni + ' insiden tahun ' + I.tahun, I.belumClose ? I.belumClose + ' belum close' : 'Semua sudah close']; }
    } else if (k === 'gps') {
      if (!D.gps) muat(); else if (!ok('gps')) gagalK('GPS tidak terbaca');
      else { var G2 = D.gps; x.v = G2.sudahMuat; x.sat = ' unit'; x.art = 'sudah muat sejak 06.00'; x.mini = [G2.unitGps + ' unit terbaca GPS', (G2.jalanMuat || 0) + ' jalan bermuatan']; }
    } else if (k === 'do') {
      if (!D['do']) muat(); else if (!ok('do')) gagalK(D['do'].tolak ? 'khusus peran lain' : 'Input DO tidak terbaca');
      else { var O = D['do'].hariIni; x.v = O.tiket; x.sat = ' tiket'; x.art = 'uang jalan diambil hari ini'; x.mini = [O.menunggu + ' nunggu DO · ' + O.lengkap + ' DO lengkap', O.uj != null ? 'Rp ' + rp(O.uj) + ' uang jalan' : '🔒 nominal khusus admin'];
        var sd = [[O.lengkap, '#bbf7d0', O.lengkap + ' DO lengkap'], [O.menunggu, '#fde047', O.menunggu + ' nunggu DO']]; x.vis = vbar(sd) + vleg(sd); }
    } else if (k === 'solar') {
      if (!D.solar) muat(); else if (!ok('solar')) gagalK(D.solar.tolak ? 'khusus peran lain' : 'Data solar tidak terbaca');
      else { var Q = D.solar; x.sat = ' L';
        if (Q.kini) { x.v = Q.kini.sisa; x.art = 'sisa tangki POOL per hari ini jam ' + String(Q.jam || '').replace(':', '.') + ' (hitungan)'; }
        else if (Q.stok) { x.v = Q.stok.sisa; x.art = 'sisa tangki POOL (catatan ' + tglPendek(Q.stok.tgl) + ')'; }
        else { x.v = Q.trip ? Q.trip.liter : 0; x.art = 'solar keluar lewat voucher hari ini'; }
        x.mini = Q.trip ? [rp(Q.trip.liter) + ' L voucher hari ini', Q.trip.voucher + ' voucher'] : ['Voucher hari ini belum terbaca']; }
    } else if (k === 'gudang') {
      if (!D.pos) muat(); else if (!ok('pos')) gagalK('Cek Selip tidak terbaca');
      else { var CS = D.pos.cekSelip || { belum: 0 }; x.v = CS.belum; x.sat = ' barang'; x.art = 'keluar gudang tanpa laporan'; x.mini = ['Rincian di Warehouse IPP']; }
    } else if (k === 'subcon') {
      if (!D.subcon) muat(); else if (!ok('subcon')) gagalK('Ritase harian tidak terbaca');
      else { var S = D.subcon; if (S.rit != null) { x.v = Math.round(Number(S.rit) * 100) / 100; x.sat = ' rit'; } else x.ang = '–'; x.art = S.hariData ? 'total Sub Con tgl ' + S.hariData : (S.adaData === false ? 'belum ada ritase bulan ini' : 'ritase harian per rute'); x.mini = [(S.vendor != null ? S.vendor + ' vendor Sub Con' : 'Sub Con') + (S.jalan != null ? ' · ' + S.jalan + ' unit jalan' : ''), 'Rincian per rute di Dashboard WHL']; }
    } else if (k === 'input') {
      var IL = (INPUT_PERAN[SESI.user.peran] || []); x.v = IL.length; x.sat = ' form'; x.art = 'langsung ke aplikasi input'; x.mini = IL.slice(0, 2).map(function (i) { return INPUT[i].ic + ' ' + INPUT[i].n; });
    } else if (k === 'absensi') {
      x.ang = 'Absen saya'; x.art = 'status absen kamu hari ini';
    } else if (k === 'kreatif') { x.ang = 'Buat konten'; x.art = 'Poster & caption media sosial WHL oleh bot AI';
    } else { var AP = appsSaya(); x.v = AP.length; x.art = 'aplikasi untuk peranmu'; x.mini = AP.slice(0, 2).map(function (a) { return a.ic + ' ' + a.n; }); }
    return x;
  }
  function kartuTopik(k) {
    var d = DIV[k] || DIV.apps, x = isiKartu(k);
    return '<button type="button" class="kt' + (x.mati ? ' mati' : '') + '" data-kt="' + k + '" style="--a:' + d[2] + '"><span class="ic">' + IK(IKON_DIV[k] || 'lainnya') + '</span><span class="jd">' + esc(d[0]) + '</span>' + (x.vis ? '<span class="vis">' + x.vis + '</span>' : '')
      + '<span class="ang">' + (x.v != null ? naik(x.v, x.v % 1 ? 2 : 0) + (x.sat ? '<small>' + esc(x.sat) + '</small>' : '') : esc(x.ang)) + '</span><span class="art">' + esc(x.art) + '</span></button>';
  }
  /* Rincian singkat satu topik (lembar bawah): baris kecil seperti di kartu web + tombol ke aplikasinya */
  function lembarTopik(k) {
    if (k === 'pos') { keTab('unit'); return; } if (k === 'absensi') { keTab('absen'); return; } if (k === 'apps') { keTab('apps'); return; } if (k === 'input') { lembarLapor(); return; }
    var d = DIV[k] || DIV.apps, x = isiKartu(k), TUJU = { ritase: K.DASH, gps: alamat(APPS[4]), subcon: K.DASH, insiden: alamat(APPS[5]), 'do': K.INPUTDO, solar: alamat(APPS[10]), gudang: alamat(APPS[11]), kreatif: K.DASH + '?mode=kreatif' };
    bukaLembar('<h3>' + d[1] + ' ' + esc(d[0]) + '</h3><div class="dt-angka" style="color:' + d[2] + '">' + (x.v != null ? rp(x.v) + esc(x.sat) : esc(x.ang)) + '</div><div class="kecil" style="font-size:14px;margin-bottom:10px">' + esc(x.art) + '</div>'
      + x.mini.map(function (m) { return '<div class="dt-mini" style="background:' + d[3] + ';color:#1f2430">' + esc(m) + '</div>'; }).join('')
      + (TUJU[k] ? '<button type="button" class="app" data-web="' + esc(TUJU[k]) + '" style="margin-top:12px"><span class="ik" style="background:' + d[3] + '">' + d[1] + '</span><span class="tx"><b>Buka rinciannya</b><small>Halaman web, dibuka di dalam app</small></span><span class="chip web">Web</span></button>' : '')
      + '<button type="button" class="tKecil" data-aksi="tutup" style="width:100%;margin-top:6px">Tutup</button>');
  }
  /* Kepala: sapaan besar + hari tambang + pil status (gaya kepala Pusat web) */
  function gambarKepala() {
    if (!SESI) return; var u = SESI.user, P = D.pos && D.pos.ok ? D.pos : null, nama = String(SESI.namaLengkap || u.nama || '').split(/\s+/)[0];
    pasangSuara();
    $('sapa').textContent = sapa() + ', ' + (nama ? nama.charAt(0).toUpperCase() + nama.slice(1).toLowerCase() : '');
    $('subTab').textContent = D.serverJam ? 'Hari tambang ' + String(D.hariTambang || '') + ' · ' + String(D.serverJam).slice(-5).replace(':', '.') + ' WIB' : 'PT. Whale Holder Logistic';
    var pil = '';
    if (P && bolehUnit() && (P.perluTindakUmum != null ? P.perluTindakUmum : P.perluTindak)) pil += '<button type="button" class="pill merah" data-ke="tab:unit">🚨 ' + (daftarTindak().total || (P.perluTindakUmum != null ? P.perluTindakUmum : P.perluTindak)) + ' perlu ditindak</button>';
    if (u.peran !== 'driver' && ABSEN && ABSEN.ok) { var c = ABSEN.hari || [], m = c.filter(function (x) { return x.tipe === 'Masuk'; })[0], pl = c.filter(function (x) { return /^Pulang/.test(x.tipe); })[0]; pil += '<button type="button" class="pill' + (m ? ' hijau' : '') + '" data-ke="tab:absen">' + (m ? '✅ Masuk ' + esc(String(m.jam).replace(':', '.')) + (m.status === 'Telat' ? ' · telat' : '') : '🕘 Belum absen masuk') + (pl ? ' · pulang ' + esc(String(pl.jam).replace(':', '.')) : '') + '</button>'; }
    var NS = nilaiSaya(); if (NS && NS.nilai != null) pil += '<button type="button" class="pill" data-ke="tab:akun">🏅 Nilai ' + esc(NS.nilai) + ' · ' + esc(NS.kategori || '') + (NS.label ? ' (sementara)' : '') + '</button>';
    $('pills').innerHTML = pil;
    $('kpDiri').innerHTML = '<button type="button" class="diriChip" data-ke="tab:akun">' + ((T.NAMA_PERAN[u.peran] && { pimpinan: '⭐', penuh: '🔓', pengawas: '🦺', mekanik: '🔧', admin: '🗂️', adminhse: '🧑‍💼', hse: '⛑️', logistik: '📦', fuelman: '⛽', kreatif: '🎬', driver: '🚚' }[u.peran]) || '👤') + ' ' + esc(nama.toUpperCase()) + ' · ' + esc(T.NAMA_PERAN[u.peran] || u.peran) + '</button>';
  }
  function gambarBeranda() {
    var u = SESI.user, kartu = u.kartu || [], h = '';
    /* v2.16 pola super-app: grid layanan -> kartu sorotan geser -> ringkasan. Perlu ditindak ada di kartu sorotan + Aktivitas + Kotak masuk. */
    if (window.WHL_BANNER) h += window.WHL_BANNER.html(); /* v3.6 banner pengumuman (karusel) */
    h += '<div class="kartu kLayanan">' + layanan() + '</div>';
    if (window.WHL_ONLINE) h += window.WHL_ONLINE.htmlBeranda(); /* v3.9: siapa online (semua staf) */
    h += sorotan();
    if (D.serverJam && (kartu.indexOf('ritase') >= 0 || bolehPimpinan())) h += kartuProyeksi(); /* v3.0: proyeksi target di atas, seperti Pusat web */
    if (ABSEN && ABSEN.tanpa && u.peran !== 'driver') h += '<div class="kartu absenK"><b>Absen mandiri belum aktif</b>' + tombolAbsen() + '</div>';
    if (KSN && !KSN.ada && KSN.perluPin) h += kartuKsn();
    if (D.galat) return h + '<div class="kartu"><b>Ringkasan gagal dimuat</b><div class="kecil">' + esc(D.galat) + '</div><button type="button" class="tKecil" data-aksi="segar" style="margin-top:10px">Coba lagi</button></div>';
    if (!D.serverJam) return h + R.kerangka('kisi') + R.kerangka('daftar');
    /* Unit hari ini (kartu putih + palang bertumpuk + kotak bergaris kiri, seperti web) */
    if (ok('pos') && (kartu.indexOf('pos') >= 0 || bolehUnit())) {
      var P = D.pos, H = hitungUnit(), perbaikan = (H.nunggu || 0) + (H.dikerjakan || 0), rfu = H.rfu != null ? H.rfu : Math.max(0, (P.total || 0) - perbaikan), A = P.armada || {};
      h += '<h2 class="bagW">Armada hari ini</h2><button type="button" class="uh" data-ke="tab:unit"><div class="uh-atas"><b>Unit hari ini</b><span>' + esc(P.tanggal ? 'hari tambang ' + P.tanggal : '') + contoh() + '</span></div>'
        + '<div class="uh-tot"><b>' + naik(P.total) + '</b><span>unit total</span><em>Trintin ' + rp(A.trintin) + ' · Tronton ' + rp(A.tronton) + '</em></div>'
        + '<div class="stack">' + ['siap', 'belum', 'standby', 'nunggu', 'dikerjakan'].map(function (k) { return H[k] ? '<i style="flex:' + H[k] + ';background:' + STATUS[k][1] + '"></i>' : ''; }).join('') + '</div>'
        + '<div class="uh-kotak lebar" style="--s:#16a34a"><b>' + naik(rfu) + '</b><span>RFU (siap jalan)</span><small>Total ' + rp(P.total) + ' unit – ' + perbaikan + ' unit perbaikan' + (H.standby ? ' · termasuk ' + H.standby + ' standby' : '') + '</small></div>'
        + '<div class="uh-grid"><div class="uh-kotak" style="--s:#16a34a"><b>' + naik(P.sudahMasuk != null ? P.sudahMasuk : (P.total || 0) - (H.belum || 0)) + '</b><span>Sudah masuk Pos Kontrol</span><small>Ada catatan Pos Kontrol sejak 06.00</small></div>'
        + '<div class="uh-kotak" style="--s:#6366f1"><b>' + naik(H.belum) + '</b><span>Belum masuk</span><small>Belum ada catatan Pos Kontrol hari ini</small></div>'
        + '<div class="uh-kotak" style="--s:#f97316"><b>' + naik(perbaikan) + '</b><span>Perbaikan</span><small>' + (H.nunggu || 0) + ' nunggu mekanik · ' + (H.dikerjakan || 0) + ' lagi diperbaiki</small></div>'
        + '<div class="uh-kotak" style="--s:#a3acb9"><b>' + naik(H.standby) + '</b><span>Standby</span><small>Diparkir, tidak dijalankan</small></div></div>'
        + (P.tiket && P.tiket.lewat ? '<div class="uh-masuk">⏰ ' + P.tiket.lewat + ' tiket perbaikan terbuka lebih dari 2 jam <em>lihat Cek sekarang</em></div>' : '')
        + '<div class="uh-ket">RFU = total unit dikurangi unit yang tiket perbaikannya masih terbuka. Ketuk untuk lihat semua unit.</div></button>';
    }
    /* Kartu topik berwarna per divisi, urutan = URUT_KARTU web, disaring hak peran (user.kartu dari server) */
    var L = URUT_KARTU.filter(function (k) { return kartu.indexOf(k) >= 0 && k !== 'kreatif' && k !== 'absensi'; }); /* v2.6: kartu Absensi (jumlah hadir/telat/belum) tidak ditampilkan */
    if (L.length) h += '<h2 class="bagW">Ringkasan hari ini <span><button type="button" class="chip" data-aksi="segar">' + IK('segar') + ' Segarkan</button></span></h2><div class="gridKt">' + L.map(kartuTopik).join('') + '</div>';
    return h;
  }

  /* ---------- v3.0 PROYEKSI target bulan (rumus sama dengan Dashboard WHL web: proyeksi = realisasi + rata-rata harian x sisa hari;
     >=100% TEMBUS TARGET, >=90% MEPET, selain itu MELESET). Data: ringkasanPusat 'target' (KM GPS). Target rit/tonase belum dikirim server. ---------- */
  function bolehPimpinan() { return !!SESI && (SESI.user.peran === 'pimpinan' || SESI.user.peran === 'penuh' || SESI.user.admin === true); }
  function hitungProyeksi() {
    if (!ok('target') || !Number(D.target.target)) return null;
    var TG = D.target, PR = TG.proyeksi || {}, target = Number(TG.target), capai = Number(TG.kmMtd) || 0, jml = Number(TG.jmlHari) || 30, hb = Math.max(1, Math.min(Number(TG.hariKe) || 1, jml));
    var pace = PR.paceKmHari != null ? Number(PR.paceKmHari) : capai / hb, proy = PR.proyeksiKm != null ? Number(PR.proyeksiKm) : capai + pace * Math.max(jml - hb, 0);
    var pp = proy / target * 100, persen = capai / target * 100, harus = target * hb / jml;
    return { TG: TG, target: target, capai: capai, jml: jml, hb: hb, pace: pace, proy: proy, pp: pp, persen: persen, harus: harus, sisa: Math.max(0, target - capai), sisaHari: Math.max(jml - hb, 0),
      lab: pp >= 100 ? ['TEMBUS TARGET', 'tembus'] : pp >= 90 ? ['MEPET', 'mepet'] : ['MELESET', 'meleset'] };
  }
  function pr1(x) { return (Math.round(x * 10) / 10).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  /* v3.1: baris RIT Trintin dari ringkasanPusat target.ritTon.rit (ritase sheet servo, sama Dashboard WHL). Realisasi = ritSheetMtd,
     BUKAN ritMtd (itu rit GPS). Angka persen/proyeksi/status/butuhPerHari dari server. Tonase SENGAJA tidak ditampilkan (keputusan Reza:
     target tonase lama basi) sampai ada keputusan baru. ok:false / tidak ada -> baris rit disembunyikan. */
  function barisRit(TG) {
    var RT = TG && TG.ritTon; if (!RT || RT.ok !== true || !RT.rit) return '';
    var r = RT.rit, real = TG.ritSheetMtd != null ? Number(TG.ritSheetMtd) : Number(r.realisasi) || 0;
    var h = '<div class="ritP"><div class="ritAtas"><b>' + IK('truk') + 'Rit Trintin</b>';
    if (r.status === 'BELUM ADA TARGET' || !Number(r.target)) return h + '<span class="lencanaP kosongT">Target rit belum diatur</span></div><div class="kecil">Realisasi ' + rp(real) + ' rit s/d hari ke-' + esc(RT.hariBerjalan || '') + '. Target diatur di Command Center Dashboard WHL.</div></div>';
    var st = r.status === 'TEMBUS TARGET' ? 'tembus' : r.status === 'MEPET' ? 'mepet' : 'meleset', pc = Math.min(100, Number(r.persen) || 0), pj = Math.min(100, Number(r.proyeksiPersen) || 0), ph = Math.min(100, (Number(r.seharusnya) || 0) / Number(r.target) * 100);
    return h + '<span class="lencanaP ' + st + '">' + esc(r.status) + '</span></div>'
      + '<div class="ritAngka"><b>' + rp(real) + '</b><span>dari target ' + rp(r.target) + ' rit · ' + pr1(Number(r.persen) || 0) + '%</span></div>'
      + '<div class="proyBar kecilB"><i class="isi" style="width:' + pc + '%"></i><i class="proyeksi" style="width:' + pj + '%"></i>' + (r.seharusnya ? '<span class="harus" style="left:' + ph + '%"></span>' : '') + '</div>'
      + '<div class="proyGrid"><div><small>Proyeksi akhir bulan</small><b>' + rp(Math.round(Number(r.proyeksi) || 0)) + ' <i>rit · ' + pr1(Number(r.proyeksiPersen) || 0) + '%</i></b></div><div><small>Butuh per hari</small><b>' + (r.butuhPerHari != null ? pr1(Number(r.butuhPerHari)) : '–') + ' <i>rit/hari</i></b></div>'
      + '<div><small>Rata-rata harian</small><b>' + (r.rataHari != null ? pr1(Number(r.rataHari)) : '–') + ' <i>rit/hari</i></b></div><div><small>Hari berjalan</small><b>' + esc(RT.hariBerjalan || '–') + ' <i>dari ' + esc(RT.jmlHari || '') + '</i></b></div></div></div>';
  }
  function kartuProyeksi() {
    var X = hitungProyeksi(); if (!X) return '';
    var TG = X.TG, pc = Math.min(100, X.persen), ph = Math.min(100, X.harus / X.target * 100), pj = Math.min(100, X.pp), perHari = X.sisaHari ? X.sisa / X.sisaHari : 0;
    return '<h2 class="bagW">Proyeksi bulan ini <span>' + esc(TG.bulan || '') + contoh() + '</span></h2><button type="button" class="uh proy" data-kt="ritase">'
      + '<div class="proyAtas"><div class="cincin" style="--p:' + pc + '"><div><b>' + pr1(X.persen) + '%</b><small>tercapai</small></div></div>'
      + '<div class="proyKanan"><span class="lencanaP ' + X.lab[1] + '">' + IK(X.lab[1] === 'tembus' ? 'centang' : X.lab[1] === 'mepet' ? 'alarm' : 'grafik') + X.lab[0] + '</span>'
      + '<small>Proyeksi KM akhir bulan</small><b class="proyAngka">' + rp(Math.round(X.proy)) + ' <i>km</i></b><em>' + pr1(X.pp) + '% dari target ' + rp(X.target) + ' km</em></div></div>'
      + '<div class="proyBar"><i class="isi" style="width:' + pc + '%"></i><i class="proyeksi" style="width:' + pj + '%"></i><span class="harus" style="left:' + ph + '%"></span></div>'
      + '<div class="proyLeg"><span><i class="lg1"></i>Realisasi ' + rp(Math.round(X.capai)) + ' km</span><span><i class="lg2"></i>Proyeksi</span><span><i class="lg3"></i>Seharusnya hari ini ' + rp(Math.round(X.harus)) + '</span></div>'
      + '<div class="proyGrid"><div><small>Rata-rata harian</small><b>' + rp(Math.round(X.pace)) + ' <i>km/hari</i></b></div><div><small>Butuh per hari</small><b>' + (X.sisaHari ? rp(Math.round(perHari)) + ' <i>km/hari</i>' : '–') + '</b></div>'
      + '<div><small>Hari ke</small><b>' + X.hb + ' <i>dari ' + X.jml + '</i></b></div><div><small>Rit hari ini</small><b>' + rp(TG.ritHariIni || 0) + (TG.butuhRitHari || TG.sisaRitHari ? ' <i>/ perlu ±' + rp(TG.sisaRitHari != null ? TG.sisaRitHari : TG.butuhRitHari) + '</i>' : '') + '</b></div></div>'
      /* v3.2: baris Rit Trintin dibuang (Reza: "proyeksi rit ga usah"); fungsi barisRit dibiarkan, tidak dipanggil */
      + '<div class="uh-ket" style="text-align:left">Proyeksi = realisasi + rata-rata harian × sisa ' + X.sisaHari + ' hari (rumus sama dengan Dashboard WHL).</div></button>';
  }

  /* ---------- PERLU DITINDAK (v2.7): disusun dari data yang SUDAH ada di ringkasanPusat (pos.units, pos.tindak, gps.perUnit) ---------- */
  function kunciLb(x) { return String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^WHL(?=\d)/, ''); }
  function menitUmur(u) { var t = String(u || ''), m = 0, a; if ((a = t.match(/(\d+)\s*hr/))) m += +a[1] * 1440; if ((a = t.match(/(\d+)\s*jam/))) m += +a[1] * 60; if ((a = t.match(/(\d+)\s*mnt/))) m += +a[1]; return m; }
  var GRUP_TINDAK = [['storing', '🚨', 'Perlu storing', 'Unit mogok di jalan, perlu didatangi'], ['gantung', '⏰', 'Tiket gantung', 'Lebih dari 2 jam belum ditunjuk / belum selesai'], ['tunjuk', '🔧', 'Menunggu penunjukan mekanik', 'Tiket baru, belum ada mekanik'], ['grup', '💬', 'Laporan grup WA belum beres', 'Dilapor / dibereskan di grup, tiket belum sesuai']];
  function teksMenit(m) { m = Math.max(0, Math.round(Number(m) || 0)); var h = Math.floor(m / 1440), j = Math.floor((m % 1440) / 60), n = m % 60; return h ? h + ' hr ' + j + ' jam' : j ? j + ' jam' + (n ? ' ' + n + ' mnt' : '') : n + ' mnt'; }
  var TEKS_TP = { CLOSE_GRUP: 'beres di grup, tiket belum ditutup', LAPOR_GRUP: 'dilapor di grup, belum ada tiket', ANTRI: 'kelamaan nunggu mekanik', GANTUNG: 'tiket gantung' };
  /** -> { storing:[], gantung:[], tunjuk:[], grup:[], total } ; tiap unit masuk SATU kelompok (urutan prioritas: storing > gantung > tunjuk).
   *  v2.9: memakai kolom rinci Pos Kontrol (DASHBOARD V479): storing/jenis ASLI dari kolom JENIS, mek, oleh, lok, mnt, mntTunggu, mntKerja, id, tp, q.
   *  Cadangan kalau kolom itu tidak ada (server lama): storing ditebak dari awalan "STORING:" dan menit diurai dari teks umur. */
  function daftarTindak() {
    var out = { storing: [], gantung: [], tunjuk: [], grup: [], total: 0 };
    if (!ok('pos') || !bolehUnit()) return out;
    var P = D.pos, PU = (ok('gps') && D.gps.perUnit) || {}, sudah = {}, batas = (P.tiket && Number(P.tiket.lewatMenit)) || 120;
    (P.units || []).forEach(function (u) {
      if (u.s !== 'nunggu' && u.s !== 'dikerjakan') return;
      var k = String(u.k || ''), rinci = u.storing !== undefined || u.jenis !== undefined, mnt = u.mnt != null ? Number(u.mnt) : menitUmur(u.u), gp = PU[kunciLb(u.l)] || null;
      var storing = rinci ? u.storing === true || String(u.jenis || '').toUpperCase() === 'STORING' : /^\s*STORING/i.test(k);
      var grup = storing ? 'storing' : (u.lw || u.gantung || u.lama || /tiket lama/i.test(k) ? 'gantung' : (u.s === 'nunggu' ? 'tunjuk' : ''));
      if (!grup) return; sudah[kunciLb(u.l)] = 1;
      var jenis = String(u.jenis || (k.match(/^\s*([A-Z]{3,}):/) || [])[1] || '');
      out[grup].push({ l: u.l, a: u.a || '', s: u.s, ket: k.replace(/^\s*[A-Z]{3,}\s*:\s*/, '') || (u.s === 'nunggu' ? 'Belum ada rincian keluhan' : ''), lok: u.lok || '', gps: gp ? gp.pos : '', umur: u.mnt != null ? teksMenit(u.mnt) : (u.u || ''), mnt: mnt, merah: !!u.lw || mnt >= batas, grup: grup,
        id: u.id || '', jenis: jenis, st: u.st || '', mek: u.mek || '', oleh: u.oleh || '', jamMasuk: u.jamMasuk || '', jamTunjuk: u.jamTunjuk || '', mntTunggu: u.mntTunggu, mntKerja: u.mntKerja, tp: u.tp || '', q: u.q || '', rinci: rinci });
    });
    (P.tindak || []).forEach(function (t) {
      if (t.s !== 'tindak') return; var j = String(t.judul || ''), lb = t.l || j.split(' ').slice(0, /^(WHL|CONTOH)\s/i.test(j) ? 2 : 1).join(' ');
      var tipe = t.tipe || (/kelamaan nunggu mekanik/i.test(j) ? 'ANTRI' : /belum ada tiket/i.test(j) ? 'LAPOR_GRUP' : /belum ditutup/i.test(j) ? 'CLOSE_GRUP' : '');
      if (sudah[kunciLb(lb)]) return; // unitnya sudah tampil di kelompok tiket; tanda peringatannya ikut di baris itu (tp)
      sudah[kunciLb(lb)] = 1;
      var g2 = PU[kunciLb(lb)] || null, mnt2 = t.mnt != null ? Number(t.mnt) : menitUmur(t.umur);
      out[tipe === 'ANTRI' ? 'tunjuk' : 'grup'].push({ l: lb, a: t.a || '', s: tipe === 'ANTRI' ? 'nunggu' : 'tindak', judul: j, ket: t.ket || j.replace(lb, '').trim(), lok: t.lok || '', gps: g2 ? g2.pos : '', umur: t.mnt != null ? teksMenit(t.mnt) : (t.umur || ''), mnt: mnt2, merah: tipe !== 'ANTRI' || mnt2 >= batas, grup: tipe === 'ANTRI' ? 'tunjuk' : 'grup',
        id: t.id || '', jenis: t.jenis || '', st: '', mek: t.mek || '', oleh: '', jamMasuk: t.jamMasuk || '', jamTunjuk: t.jamTunjuk || '', tp: tipe, jamGrup: t.jamGrup || '', q: t.q || '', rinci: t.tipe !== undefined });
    });
    ['storing', 'gantung', 'tunjuk', 'grup'].forEach(function (k) { out[k].sort(function (a, b) { return b.mnt - a.mnt; }); out.total += out[k].length; });
    return out;
  }
  var TINDAK_SEKARANG = [], IKON_GRUP = { storing: 'alarm', gantung: 'jam', tunjuk: 'truk', grup: 'forum' };
  function barisTindak(x, i) {
    return '<button type="button" class="ti tiT" data-tindak="' + i + '"><span class="tic' + (x.merah ? ' merah' : ' kuning') + '" style="--s:' + (x.merah ? '#e5484d' : '#f0a020') + '">' + IK(IKON_GRUP[x.grup] || 'truk') + '</span><span class="tx"><b>' + esc(x.l)
      + (x.jenis && x.grup !== 'storing' ? ' <i class="tagT i">' + esc(x.jenis.toLowerCase()) + '</i>' : '') + (x.tp && x.tp !== 'ANTRI' && x.grup !== 'grup' ? ' <i class="tagT m">⚠ ' + esc(TEKS_TP[x.tp] || x.tp) + '</i>' : '') + '</b><small>' + esc(x.ket || '-') + '</small>'
      + (x.lok || x.gps ? '<small>📍 ' + esc(x.lok || '') + (x.lok && x.gps ? ' · ' : '') + (x.gps ? 'GPS: ' + esc(x.gps) : '') + '</small>' : '')
      + (x.s === 'tindak' ? '' : '<small>' + (x.mek ? '🧑‍🔧 ' + esc(x.mek) + (x.oleh ? ' · ditunjuk ' + esc(x.oleh) : '') : (x.s === 'nunggu' ? '<i class="tagT k">belum ada mekanik</i>' : (x.rinci ? '<i class="tagT k">mekanik belum tercatat</i>' : '<i class="tagT">lagi diperbaiki</i>'))) + '</small>')
      + '</span><em style="color:' + (x.merah ? '#b91c1c' : '#a16207') + '">' + esc(x.umur || '') + '</em></button>';
  }
  function lembarTindak(x) {
    var G = GRUP_TINDAK.filter(function (g) { return g[0] === x.grup; })[0] || ['', '', '', ''], B = [];
    if (x.id) B.push(['No. tiket', x.id]);
    if (x.jenis) B.push(['Jenis', x.jenis]);
    B.push(['Status tiket', x.st || (x.s === 'nunggu' ? 'Belum ada mekanik' : x.s === 'dikerjakan' ? 'Lagi diperbaiki' : 'Belum ada tiket')]);
    B.push(['Keluhan', x.ket || '-']);
    if (x.lok) B.push(['Lokasi (dari keterangan)', x.lok]);
    B.push(['Posisi GPS sekarang', x.gps || 'tidak terbaca']);
    if (x.jamMasuk) B.push(['Masuk', String(x.jamMasuk).slice(0, 5) + ' ' + String(x.jamMasuk).slice(11).replace(':', '.')]);
    if (x.s !== 'tindak') B.push(['Mekanik', x.mek || 'belum ditunjuk']);
    if (x.jamTunjuk || x.oleh) B.push(['Ditunjuk', (x.jamTunjuk ? String(x.jamTunjuk).slice(11).replace(':', '.') : '') + (x.oleh ? ' oleh ' + x.oleh : '')]);
    if (x.mntTunggu != null) B.push([x.s === 'nunggu' ? 'Sudah menunggu' : 'Lama tunggu ditunjuk', teksMenit(x.mntTunggu)]);
    if (x.mntKerja != null) B.push(['Sudah dikerjakan', teksMenit(x.mntKerja)]);
    if (x.umur) B.push(['Umur tiket', x.umur]);
    if (x.tp) B.push(['Peringatan', (TEKS_TP[x.tp] || x.tp) + (x.jamGrup ? ' (grup jam ' + String(x.jamGrup).replace(':', '.') + ')' : '')]);
    var form = x.q ? K.DASH + '?' + x.q : '', aksi = x.s === 'nunggu' ? 'Tunjuk mekanik' : x.s === 'dikerjakan' ? 'Update / selesaikan tiket' : 'Catat Unit Masuk';
    bukaLembar('<h3>' + G[1] + ' ' + esc(x.l) + '</h3><div class="status" style="margin:6px 0 10px"><span class="chip ' + (x.merah ? 'merah' : 'kuning') + '">' + esc(G[2]) + '</span>' + (x.umur ? '<span class="chip">' + esc(x.umur) + '</span>' : '') + (x.a ? '<span class="chip">' + esc(x.a) + '</span>' : '') + '</div>'
      + '<div class="rinci" style="max-width:none;margin-top:0">' + B.map(function (r) { return '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div>'
      + '<div class="kecil" style="margin:12px 2px 8px">' + (form ? 'Tombol di bawah membuka form Pos Kontrol dengan lambung <b>' + esc(x.l) + '</b> sudah terpilih (halaman web, di dalam app). Pilih tiketnya lalu ' + esc(aksi.toLowerCase()) + '.' : 'Tindakan dilakukan di form Pos Kontrol (halaman web, di dalam app). Cari lambung <b>' + esc(x.l) + '</b> di sana.') + '</div>'
      + (form ? kartuApp({ n: aksi, ic: '📋', d: 'pos', k: 'Form Pos Kontrol · ' + x.l, u: form }) : kartuApp({ n: aksi, ic: '📋', d: 'pos', k: 'Menu Input: Pos Kontrol', u: K.DASH + '?mode=menu' }))
      + kartuApp({ n: 'Live Monitor Pos Kontrol', ic: '🖥️', d: 'pos', k: 'Lihat semua tiket (cuma lihat)', u: K.DASH + '?mode=monitor' })
      + kartuApp({ n: 'Lihat posisi di GPS', ic: '📍', d: 'gps', k: 'Tracking GPS WHL', id: 'AKfycbwhemxEHZgsj9Z_9ex_siIvs3NmHLlHEns8WRSX-yKwjMlDlQHwXeR_1WdFHcMHvPpq' })
      + '<button type="button" class="tKecil" data-aksi="tutup" style="width:100%;margin-top:6px">Tutup</button>');
  }
  function bagianTindak(ringkas) {
    var T2 = daftarTindak(); TINDAK_SEKARANG = [];
    var TK = (ok('pos') && D.pos.tiket) || {}, tanpaRinci = ok('pos') && bolehUnit() && !(D.pos.units || []).some(function (u) { return u.k !== undefined; });
    if (!T2.total && tanpaRinci && (TK.storing || TK.lewat || TK.nunggu)) return '<div class="kartu tindakK"><b>🚨 Pos Kontrol sekarang</b><div class="tdHit">' + (TK.storing ? '<button type="button" class="m" data-ke="tab:unit"><b>' + TK.storing + '</b><span>🚨 storing</span></button>' : '') + (TK.lewat ? '<button type="button" class="m" data-ke="tab:unit"><b>' + TK.lewat + '</b><span>⏰ lewat 2 jam</span></button>' : '') + (TK.nunggu ? '<button type="button" class="k" data-ke="tab:unit"><b>' + TK.nunggu + '</b><span>🔧 tunggu mekanik</span></button>' : '') + '</div><div class="kecil">Rincian tiket hanya untuk pengawas, mekanik, HSE dan pimpinan.</div></div>';
    if (!T2.total) return ringkas ? '' : '<div class="kartu amanK"><b>✅ Tidak ada yang perlu ditindak</b><div class="kecil">Tidak ada storing, tiket gantung, atau unit menunggu mekanik saat ini.</div></div>';
    var h = '';
    if (ringkas) { /* kartu Beranda: jumlah per kelompok + 3 terlama */
      var semua = T2.storing.concat(T2.gantung, T2.tunjuk, T2.grup).sort(function (a, b) { return (b.grup === 'storing') - (a.grup === 'storing') || b.mnt - a.mnt; });
      h += '<div class="kartu tindakK"><button type="button" class="tdAtas" data-ke="tab:unit"><b>🚨 Perlu ditindak sekarang</b><span>' + T2.total + ' unit ›</span></button><div class="tdHit">'
        + GRUP_TINDAK.map(function (g) { var n = T2[g[0]].length; return n ? '<button type="button" data-ke="tab:unit" class="' + (g[0] === 'storing' || g[0] === 'gantung' ? 'm' : 'k') + '"><b>' + n + '</b><span>' + g[1] + ' ' + esc(g[2].replace('Menunggu penunjukan mekanik', 'Tunggu mekanik').replace('Laporan grup WA belum beres', 'Grup WA')) + '</span></button>' : ''; }).join('') + '</div>';
      semua.slice(0, 3).forEach(function (x) { TINDAK_SEKARANG.push(x); h += barisTindak(x, TINDAK_SEKARANG.length - 1); });
      return h + (semua.length > 3 ? '<button type="button" class="tKecil" data-ke="tab:unit" style="width:100%;margin-top:6px">Lihat semua ' + semua.length + ' di tab Unit</button>' : '') + '</div>';
    }
    h += '<h2 class="bagW">Perlu ditindak <span>' + T2.total + ' unit' + contoh() + '</span></h2>';
    GRUP_TINDAK.forEach(function (g) {
      var L = T2[g[0]]; if (!L.length) return;
      h += '<div class="kartu grupT"><div class="gtAtas"><b><span class="gtI g-' + g[0] + '">' + IK(IKON_GRUP[g[0]]) + '</span>' + esc(g[2]) + ' <em>' + L.length + '</em></b><small>' + esc(g[3]) + '</small></div>' + L.map(function (x) { TINDAK_SEKARANG.push(x); return barisTindak(x, TINDAK_SEKARANG.length - 1); }).join('') + '</div>';
    });
    return h;
  }
  /* ---------- SKEMA RUTE (v2.7): skema sederhana dari gps.peta (zona sekarang tiap unit + muat/kosong + asal). Posisi di jalan = perkiraan arah. ---------- */
  /* v2.12: skema rute SAMA dengan panel "🗺️ Jalur hauling sekarang · GPS nyata" Pusat WHL web (kode disalin utuh ke skema-rute.js
     oleh alat/salin-skema.mjs; data gps.skema dari ringkasanPusat; spesifikasi Gepi). Kalau server belum kirim gps.skema -> skema zona lama. */
  function bagianSkema() {
    if (!D.gps || !ok('gps')) return bagianSkemaZona();
    var GS = D.gps; if (!window.WHL_SKEMA || !GS.skema || !GS.skema.u || !GS.skema.u.length) return bagianSkemaZona();
    var lebar = Math.min(window.innerWidth || 390, 560), md = lebar < 600 ? 'tegak' : 'lebar', k = window.WHL_SKEMA.gambar(GS, md);
    var perb = ok('pos') && D.pos.hit ? (D.pos.hit.nunggu || 0) + (D.pos.hit.dikerjakan || 0) : '–', sb = ok('pos') && D.pos.hit ? D.pos.hit.standby : '–';
    return '<section class="peta-k"><div class="peta-top"><h2>Jalur hauling sekarang</h2><span class="tg-n">GPS nyata</span>' + contoh() + '</div>'
      + '<div class="lgds"><span class="lgd">🚚 ' + k.jalan + ' di jalan</span><span class="lgd"><i style="background:#22c55e"></i>' + k.muat + ' bermuatan</span><span class="lgd"><i style="background:#cbd5e1"></i>' + k.kosong + ' kosong</span><span class="lgd"><i style="background:#ef4444"></i>' + perb + ' perbaikan</span><span class="lgd"><i style="background:#7b8a9e"></i>' + sb + ' standby</span></div>'
      + '<div class="peta-isi" id="petaIsiApp" data-mode="' + md + '">' + k.svg + '</div><div class="peta-pop" id="petaPopApp" role="status"></div>'
      + '<div class="peta-ket">Skema rute GPS (sama dengan halaman GPS) · ' + k.unit + ' unit · truk di jalan = posisi GPS 5 menitan ditaruh di ruas terdekat' + (k.tdk.length ? ' · ' + k.tdk.length + ' belum terpetakan: ' + k.tdk.map(function (u) { return esc(u.pendek); }).join(', ') : '') + (GS.updated ? ' · ' + esc(GS.updated) : '') + '</div>'
      + kartuApp({ n: 'Buka skema lengkap', ikn: 'peta', d: 'gps', k: 'Tracking GPS WHL · tab Skema Rute', id: 'AKfycbwhemxEHZgsj9Z_9ex_siIvs3NmHLlHEns8WRSX-yKwjMlDlQHwXeR_1WdFHcMHvPpq' }) + '</section>';
  }
  function bagianSkemaZona() {
    if (!D.gps) return ''; if (!ok('gps')) return '<h2 class="bagW">🛣️ Skema rute</h2><div class="kartu"><div class="kecil">GPS tidak terbaca.</div></div>';
    var PT = D.gps.peta || [], titik = {}, jalanIsi = [], jalanKosong = [], lain = [];
    PT.forEach(function (u) {
      var z = String(u.z || '').toUpperCase();
      if (z.indexOf('DI ') === 0) { var n = z.slice(3).trim() || '?'; (titik[n] = titik[n] || []).push(u); }
      else if (z === 'JALAN') (String(u.m || '').toUpperCase() === 'MUAT' ? jalanIsi : jalanKosong).push(u);
      else lain.push(u);
    });
    var JENIS = function (n) { return /POOL|WORKSHOP|BENGKEL/.test(n) ? ['🅿️', 'pool'] : /PORT|JETTY|PELABUHAN/.test(n) ? ['⚓', 'pelabuhan'] : /^1?07$|KM ?107|STOCK/.test(n) ? ['🏔️', 'stockpile'] : ['⛏️', 'tempat muat']; };
    var URUTT = function (n) { var j = JENIS(n)[1]; return j === 'pool' ? 0 : j === 'tempat muat' ? 1 : j === 'stockpile' ? 3 : 5; };
    var chipU = function (u) { return '<span class="skU' + (String(u.m || '').toUpperCase() === 'MUAT' ? ' isi' : '') + '">' + esc(String(u.l).replace(/^WHL\s*/i, '')) + '</span>'; };
    var baris = function (ik, nama, ket, L, kelas) { return '<div class="skB ' + kelas + '"><span class="skI">' + ik + '</span><div class="skT"><b>' + esc(nama) + ' <em>' + L.length + '</em></b><small>' + esc(ket) + '</small><div class="skL">' + (L.length ? L.slice(0, 40).map(chipU).join('') : '<i>tidak ada unit</i>') + '</div></div></div>'; };
    var urut = Object.keys(titik).sort(function (a, b) { return URUTT(a) - URUTT(b) || (a < b ? -1 : 1); }), h = '', sudahIsi = false, sudahKosong = false;
    urut.forEach(function (n, i) {
      var j = JENIS(n);
      if (!sudahIsi && URUTT(n) >= 3) { h += baris('🚛', 'Jalan bermuatan', 'menuju stockpile / pelabuhan', jalanIsi, 'jalan isi'); sudahIsi = true; }
      h += baris(j[0], n, j[1], titik[n], 'titik');
    });
    if (!sudahIsi) h += baris('🚛', 'Jalan bermuatan', 'menuju stockpile / pelabuhan', jalanIsi, 'jalan isi');
    h += baris('🚚', 'Jalan kosong', 'kembali ke tempat muat / pool', jalanKosong, 'jalan');
    if (lain.length) h += baris('❔', 'Belum terbaca', 'GPS belum mengirim posisi', lain, 'jalan');
    return '<h2 class="bagW">🛣️ Skema rute <span>' + PT.length + ' unit GPS' + contoh() + '</span></h2><div class="kartu skema"><div class="skLeg"><span class="skU isi">123</span> bermuatan <span class="skU">123</span> kosong' + (D.gps.updated ? ' · data ' + esc(String(D.gps.updated).slice(-5).replace(':', '.')) : '') + '</div>' + h
      + '<div class="kecil" style="margin-top:8px">Skema sederhana dari zona GPS tiap unit. Jarak & posisi persis di jalan ada di skema lengkap.</div>'
      + kartuApp({ n: 'Buka skema lengkap', ic: '🗺️', d: 'gps', k: 'Skema rute & peta di Tracking GPS', id: 'AKfycbwhemxEHZgsj9Z_9ex_siIvs3NmHLlHEns8WRSX-yKwjMlDlQHwXeR_1WdFHcMHvPpq' }) + '</div>';
  }
  function gambarUnit() {
    if (!ok('pos')) return segmenAkt() + (D.galat ? R.kosong('Unit gagal dimuat', D.galat) : R.kerangka('daftar') + R.kerangka('daftar'));
    var U = D.pos.units || [], H = hitungUnit(), q = cariUnit.toLowerCase();
    var h = segmenAkt() + (bolehPimpinan() ? kartuProyeksi() : '') + bagianTindak(false) + bagianSkema();
    h += '<h2 class="bagW">🚛 Semua unit <span>' + U.length + ' unit' + contoh() + '</span></h2><input id="cariUnit" class="isian" type="search" placeholder="Cari lambung..." value="' + esc(cariUnit) + '" autocomplete="off" style="margin-bottom:10px">';
    h += '<div class="saring"><button type="button" data-saring="semua" class="' + (saringUnit === 'semua' ? 'on' : '') + '">Semua ' + U.length + '</button>' + Object.keys(STATUS).map(function (st) { return '<button type="button" data-saring="' + st + '" class="' + (saringUnit === st ? 'on' : '') + '">' + STATUS[st][0] + ' ' + (H[st] || 0) + '</button>'; }).join('') + '</div>';
    var L = U.filter(function (x) { return (saringUnit === 'semua' || x.s === saringUnit) && (!q || String(x.l).toLowerCase().indexOf(q) >= 0); });
    h += L.length ? '<div class="unitGrid">' + L.map(function (x) { var S = STATUS[x.s] || STATUS.standby; return '<div class="unit" style="--st:' + S[1] + '"><b>' + esc(x.l) + (x.storing === true && x.s !== 'siap' ? ' <i class="tagT m">storing</i>' : '') + '</b><em>' + S[0] + '</em><small>' + esc(x.a || '') + (x.k ? ' · ' + esc(x.k) : '') + (x.mnt != null && x.s !== 'siap' ? ' · ' + esc(teksMenit(x.mnt)) : (x.u ? ' · ' + esc(x.u) : '')) + '</small>' + (x.mek ? '<small>🧑‍🔧 ' + esc(x.mek) + '</small>' : '') + (x.tp && TEKS_TP[x.tp] ? '<small style="color:#b91c1c;font-weight:800">⚠ ' + esc(TEKS_TP[x.tp]) + '</small>' : '') + '</div>'; }).join('') + '</div>' : R.kosong('Tidak ada unit di sini', 'Coba ganti saringan atau hapus kata pencarian.');
    return h;
  }

  /* Tab Absen (v2.6, permintaan Reza): HANYA status absen diri sendiri hari ini + tombol ABSEN. Tidak ada riwayat, rekap bulan,
     daftar belum absen, atau cuti/izin orang lain, untuk semua peran. */
  function gambarAbsen() {
    var h = segmenAkt() + '<div class="kartu absenK"><div class="judulK">Absen saya hari ini</div><div class="status">' + chipAbsen() + '</div>' + (SESI.user.peran === 'driver' ? '' : tombolAbsen()) + '</div>';
    if (SESI.user.peran !== 'driver') h += '<div class="kecil" style="margin:0 6px 14px">Absen pertama hari ini tercatat sebagai <b>Masuk</b>, absen berikutnya (minimal 2 jam kemudian) sebagai <b>Pulang</b>.</div>';
    h += '<div class="bingkai">' + kartuApp({ n: 'Pengajuan Izin', ikn: 'dokumen', k: 'Izin / sakit / cuti', u: K.ABSEN + '?mode=izin' }) + '</div>';
    return h;
  }

  function gambarApps() {
    var A = appsSaya(), q = cariApp.toLowerCase();
    var h = '<div class="cariBaris">' + IK('cari') + '<input id="cariApp" type="search" placeholder="Cari aplikasi atau menu..." value="' + esc(cariApp) + '" autocomplete="off"></div>';
    var L = A.filter(function (a) { return !q || (a.n + ' ' + a.k).toLowerCase().indexOf(q) >= 0; });
    h += '<h2 class="bagW">Layanan di app</h2><div class="bingkai">' + (forumTampil() ? '<button type="button" class="app" data-ke="forum"><span class="ik">' + window.WHL_ILUS('forum') + '</span><span class="tx"><b>Forum WHL</b><small>Obrolan, foto & pesan suara antar karyawan</small></span>' + (forumBaru() ? '<span class="fmN">' + forumBaru() + '</span>' : (window.WHL_FORUM.disiapkan() ? '<span class="chip kuning">Segera</span>' : '<span class="chip asli">Asli</span>')) + IK('kanan', 'kmP') + '</button>' : '')
      + '<button type="button" class="app" data-ke="lapor"><span class="ik">' + window.WHL_ILUS('input') + '</span><span class="tx"><b>Input cepat</b><small>Form lapangan sesuai peranmu</small></span>' + IK('kanan', 'kmP') + '</button></div>';
    h += '<h2 class="bagW">Aplikasi web <span>' + L.length + '</span></h2><div class="kecil bingkaiKet">' + IK('web') + '<span>Belum punya tampilan asli. Dibuka sebagai halaman web di dalam app; tombol Kembali membawa kamu ke sini lagi.</span></div>';
    h += L.length ? '<div class="bingkai">' + L.map(kartuApp).join('') + '</div>' : R.kosong(A.length ? 'Tidak ketemu' : 'Belum ada aplikasi untuk peranmu', A.length ? 'Coba kata lain.' : 'Aplikasi muncul sesuai peran di Pusat WHL.');
    h += '<div class="bingkai" style="margin-top:12px">' + kartuApp({ n: 'Pusat WHL versi web', ikn: 'rumahWeb', k: 'Halaman Pusat WHL lengkap (login PIN lagi di sana)', u: K.DASH + '?mode=pusat' }) + '</div>';
    return h;
  }

  var TIER = { emas: '#e0a100', perak: '#9fb2c6', perunggu: '#c98a55', berlian: '#58c8ff', platinum: '#b9a6ff', legenda: '#ff8f5a' };
  function tglPendek(t) { var m = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/); return m ? m[3] + '/' + m[2] + (m[4] ? ' ' + m[4].replace(':', '.') : '') : String(t || ''); }
  function fotoProfil(P, nama, px) {
    var f = P && typeof P.foto === 'string' ? P.foto : '';
    if (/^(data:image\/|https:\/\/)/.test(f)) return '<img class="foto" src="' + esc(f) + '" alt="" onerror="this.style.visibility=&quot;hidden&quot;" style="width:' + px + 'px;height:' + px + 'px;flex-basis:' + px + 'px">';
    return '<div class="bulat" style="width:' + px + 'px;height:' + px + 'px;flex-basis:' + px + 'px;font-size:' + Math.round(px * 0.36) + 'px">' + esc(inisial(nama)) + '</div>';
  }
  /* ---------- PENILAIAN BULAN INI · 5 ASPEK (v2.8; Input DO V259: aspek[], nilaiAkhir, nilaiAkhirLabel, kategoriAkhir) ----------
     Hanya nilai milik orang yang login (dari profilnya sendiri). Tiap baris bisa diketuk -> lembar "Dari mana angka ini?". */
  var WARNA_NILAI = { hijau: '#16a34a', biru: '#2563eb', kuning: '#eab308', merah: '#dc2626', abu: '#a3acb9' };
  var PENJELAS = [];
  function nilaiSaya() { var s = KPI && KPI.staf; if (!s) return null; var ada = Array.isArray(s.aspek) && s.aspek.length; return { s: s, ada: !!ada, nilai: ada && s.nilaiAkhir != null ? s.nilaiAkhir : s.nilai, kategori: ada ? (s.kategoriAkhir || s.kategori) : s.kategori, warna: ada ? (s.warnaAkhir || s.warna) : s.warna, label: ada ? (s.nilaiAkhirLabel || '') : '' }; }
  function persenTeks(n) { return String(Math.round(Number(n) * 10) / 10).replace('.', ',') + '%'; }
  function barisKpi(k) {
    var info = k.info || k.status === 'info', okk = k.status === 'ok'; PENJELAS.push({ jenis: 'kpi', d: k });
    return '<button type="button" class="kpi kpiB" data-jelas="' + (PENJELAS.length - 1) + '"><div class="at"><b>' + esc(k.nm) + (k.usulan ? ' <i class="tagT k">usulan</i>' : '') + '</b>' + (info ? '<i class="tagT i">Info saja</i>' : '<span>' + (okk ? esc(k.nilai) : '–') + '</span>') + '</div><small>'
      + (okk || info ? 'Aktual ' + esc(k.aktual) + (k.standar ? ' · standar ' + esc(k.standar) : '') + (!info && (k.bobotPakai || k.bobot) ? ' · bobot ' + esc(Math.round(k.bobotPakai || k.bobot)) + '%' : '') : esc(k.ket || k.belum || 'Belum ada data'))
      + (k.jenis === 'tim' ? ' · nilai tim' : '') + ' <u>ⓘ</u></small></button>';
  }
  function kotakKpi() {
    PENJELAS = [];
    var N = nilaiSaya(), h = '<h2 class="bagW">Penilaian bulan ini <span>' + (N && N.ada ? '5 aspek' : 'KPI') + ' <i class="chip asli">data asli</i></span></h2><div class="kartu">';
    if (!KPI) return h + R.kerangka('daftar').replace('<div class="kartu">', '<div>') + '</div>';
    if (KPI.galat) return h + '<div class="kecil">Penilaian gagal dimuat: ' + esc(KPI.galat) + '</div><button type="button" class="tKecil" data-aksi="kpiUlang" style="margin-top:10px">Coba lagi</button></div>';
    if (!N) return h + '<div class="kecil">' + esc(KPI.pesan || 'Belum ada penilaian untuk nomor ' + (SESI.idProfil || SESI.idKetik) + '.') + '</div></div>';
    var s = N.s, W = WARNA_NILAI[N.warna] || '#2563eb';
    h += '<div class="nilai"><div class="lingkar" style="--p:' + (Number(N.nilai) || 0) + ';--w:' + W + '"><div>' + (N.nilai == null ? '–' : esc(N.nilai)) + '</div></div><div><div class="judulK">' + esc(N.kategori || '') + '</div>'
      + (N.label ? '<div class="chip kuning" style="margin:4px 0">' + esc(N.label) + '</div>' : '') + '<div class="kecil">' + esc(s.peranNm || s.jabatan || '') + ' · ' + esc(s.bulan || KPI.bulan || '') + (KPI.persenBulan != null ? ' (bulan berjalan ' + esc(KPI.persenBulan) + '%)' : '') + '</div><div class="kecil">Dihitung ' + esc(s.dibuat || KPI.dibuat || '') + (s.pedoman ? ' · Pedoman ' + esc(s.pedoman) : '') + '</div></div></div>';
    if (N.ada) {
      h += '<div class="aspekL">' + s.aspek.map(function (a) {
        var ada = a.nilai != null; PENJELAS.push({ jenis: 'aspek', d: a, catatan: s.aspekCatatan || '' });
        return '<button type="button" class="aspek' + (ada ? '' : ' tunggu') + '" data-jelas="' + (PENJELAS.length - 1) + '"><div class="at"><b>' + esc(a.nm) + '</b><em>bobot ' + esc(a.bobot) + '%</em>' + (ada ? '<span>' + esc(a.nilai) + '</span>' : '') + '</div>'
          + (ada ? '<div class="palang"><i style="width:' + Math.max(2, Math.min(100, Number(a.nilai) || 0)) + '%"></i></div><small>' + esc(a.rinci || '') + (a.bobotPakai != null && Math.round(a.bobotPakai) !== Math.round(a.bobot) ? (a.rinci ? ' · ' : '') + 'sementara dihitung ' + persenTeks(a.bobotPakai) : '') + ' <u>ⓘ</u></small>'
            : '<small><i class="tagT k">⏳ ' + esc(a.tag || a.ket || 'Menunggu') + '</i> <u>ⓘ</u></small>') + '</button>';
      }).join('') + '</div>';
      if (s.aspekCatatan) h += '<div class="kecil" style="margin-top:8px">' + esc(s.aspekCatatan) + '</div>';
    }
    var L = s.kpi || [];
    if (L.length) h += '<div class="kpiJudul">' + (N.ada ? 'Isi aspek Kinerja (KPI)' : 'Rincian KPI') + (s.nilai != null && N.ada ? ' <em>nilai ' + esc(s.nilai) + '</em>' : '') + '</div>' + L.map(barisKpi).join('');
    if (s.catatan || s.ket) h += '<div class="kecil" style="margin-top:10px">' + esc(s.catatan || s.ket) + '</div>';
    return h + '</div>';
  }
  /* Lembar bawah "Dari mana angka ini?" — teks diambil dari data server kalau ada */
  function lembarJelas(x) {
    var d = x.d, B = [], bobot = Number(d.bobot) || 0, pakai = d.bobotPakai == null ? null : Number(d.bobotPakai);
    if (x.jenis === 'aspek') {
      B.push(['Nilai', d.nilai != null ? String(d.nilai) : 'belum ada']); B.push(['Bobot di pedoman', bobot + '%']);
      if (pakai != null) B.push(['Bobot yang dipakai sekarang', d.nilai != null ? persenTeks(pakai) : 'belum ikut dihitung']);
    } else {
      var info = d.info || d.status === 'info';
      B.push(['Angka kamu bulan ini', d.aktual || '–']); if (d.standar) B.push(['Standar (pembanding)', d.standar]);
      B.push(['Nilai', info ? 'tidak dinilai (info saja)' : d.status === 'ok' ? String(d.nilai) : 'belum ada']);
      if (!info && bobot) B.push(['Bobot', bobot + '%' + (pakai != null && Math.round(pakai) !== Math.round(bobot) ? ' → dipakai ' + persenTeks(pakai) : '')]);
      if (d.n != null) B.push(['Jumlah data', String(d.n)]);
    }
    var h = '<h3>Dari mana angka ini?</h3><div class="kecil" style="font-size:15px;font-weight:800;color:var(--teks);margin:2px 0 10px">' + esc(d.nm) + (d.jenis === 'tim' ? ' · nilai tim' : '') + '</div>'
      + '<div class="rinci" style="max-width:none;margin-top:0">' + B.map(function (r) { return '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('') + '</div>';
    var P = [];
    if (d.sumber) P.push(['📂 Sumber data', d.sumber]);
    if (d.rinci) P.push(['🧮 Hitungan', d.rinci]);
    if (d.standarDasar) P.push(['📏 Arti standar', 'Standar = ' + d.standarDasar + '. Jadi pembandingnya data WHL sendiri, bukan angka karangan.' + (d.sementara ? ' Masih sementara karena datanya baru sedikit.' : '')]);
    if (d.ket) P.push(['ℹ️ Keterangan', d.ket]);
    if (d.catatan) P.push(['📝 Catatan', d.catatan]);
    if (d.usulan) P.push(['🧪 Masih usulan', typeof d.usulan === 'string' ? d.usulan : 'KPI ini masih usulan, belum ditetapkan.']);
    if (typeof d.info === 'string') P.push(['ℹ️ Info', d.info]);
    if (pakai != null && Math.round(pakai) > Math.round(bobot) && (x.jenis !== 'aspek' || d.nilai != null)) P.push(['⚖️ Kenapa bobotnya membesar?', x.catatan || 'Bagian lain yang belum punya data tidak ikut dihitung, jadi bobotnya dibagi ke bagian yang sudah ada datanya. Kalau data lain sudah masuk, bobot kembali ke ' + bobot + '%.']);
    else if (x.jenis === 'aspek' && d.nilai == null) P.push(['⏳ Kenapa belum ada nilai?', (d.ket || d.tag || 'Datanya belum masuk.') + ' Selama belum ada, aspek ini tidak mengurangi nilai akhir kamu.']);
    h += P.map(function (p) { return '<div class="jelasP"><b>' + p[0] + '</b><span>' + esc(p[1]) + '</span></div>'; }).join('');
    bukaLembar(h + '<button type="button" class="tKecil" data-aksi="tutup" style="width:100%;margin-top:12px">Mengerti</button>');
  }
  /* Kartu ringkas di Beranda */
  function kartuNilaiBeranda() {
    var N = nilaiSaya(); if (!N || N.nilai == null) return '';
    var W = WARNA_NILAI[N.warna] || '#2563eb', s = N.s;
    return '<button type="button" class="uh nilaiB" data-ke="tab:akun"><div class="uh-atas"><b>🏅 Penilaian bulan ini</b><span>' + (N.ada ? '5 aspek' : 'KPI') + ' ›</span></div><div class="nilai" style="margin-top:10px"><div class="lingkar kecilL" style="--p:' + (Number(N.nilai) || 0) + ';--w:' + W + '"><div>' + esc(N.nilai) + '</div></div><div style="min-width:0;flex:1"><b style="font-size:17px">' + esc(N.kategori || '') + '</b>' + (N.label ? '<div class="kecil" style="font-weight:800;color:var(--tKuning)">' + esc(N.label) + '</div>' : '')
      + (N.ada ? '<div class="aspekMini">' + s.aspek.map(function (a) { return '<span class="' + (a.nilai != null ? 'ada' : '') + '" title="' + esc(a.nm) + '"><i style="height:' + (a.nilai != null ? Math.max(8, Math.min(100, Number(a.nilai))) : 0) + '%"></i><em>' + esc(String(a.nm).split(/[\s(/]/)[0].slice(0, 7)) + '</em></span>'; }).join('') + '</div>' : '') + '</div></div></button>';
  }
  function kotakLencana(P) {
    var L = P.lencana || []; if (!L.length) return '';
    return '<h2 class="bag">Lencana <span class="chip">' + L.length + '</span></h2><div class="lencana">' + L.map(function (x) { return '<div class="lc" style="--tr:' + (TIER[x.tier] || '#8fa2b7') + '"><span>' + esc(x.ik || '🏅') + '</span><b>' + esc(x.nm) + '</b><small>' + esc(x.ket || '') + '</small></div>'; }).join('') + '</div>';
  }
  function kotakPencapaian(P) {
    var L = P.pencapaian || []; if (!L.length) return '';
    return '<h2 class="bag">Achievement</h2><div class="kartu" style="padding:4px 15px">' + L.map(function (x) {
      var w = TIER[x.tier] || '#3aa0ff', p = Math.max(0, Math.min(100, Number(x.persen) || 0));
      return '<div class="capai"><span class="ci" style="--tr:' + w + '">' + esc(x.ik || '⭐') + '</span><div><div class="at"><b>' + esc(x.nm) + '</b>' + (x.tierNm ? '<em style="color:' + w + '">' + esc(x.tierNm) + '</em>' : '') + '</div><div class="palang"><i style="width:' + p + '%;background:' + w + '"></i></div><small>' + esc(x.ket || '') + (x.berikut && x.berikut.kurang != null ? ' · kurang ' + esc(x.berikut.kurang) + ' lagi ke ' + esc(x.berikut.tierNm || x.berikut.nm || 'tingkat berikut') : '') + '</small></div></div>';
    }).join('') + '</div>';
  }
  function barisAkt(kiri, judul, ket, kanan) { return '<div class="orang"><div class="tglK">' + esc(kiri) + '</div><div style="min-width:0;flex:1"><b>' + esc(judul) + '</b><span>' + esc(ket) + '</span></div>' + (kanan ? '<div class="kn">' + esc(kanan) + '</div>' : '') + '</div>'; }
  function profilStaf(P) {
    var h = '', A = P.aktivitas || {}, pr = P.predikat;
    if (pr) h += '<div class="kartu predikat" style="--tr:' + (TIER[pr.tier] || '#3aa0ff') + '"><span class="pi">' + esc(pr.ik || '🎖️') + '</span><div style="min-width:0;flex:1"><b>' + esc(pr.nm) + '</b><small>' + esc(pr.ket || '') + (pr.tingkat ? ' · tingkat ' + esc(pr.tingkat) + ' dari ' + esc(pr.dari) : '') + '</small>' + (pr.berikut && pr.berikut.nm ? '<small>Berikutnya: ' + esc(pr.berikut.nm) + (pr.berikut.kurang != null ? ' (kurang ' + esc(pr.berikut.kurang) + ')' : '') + '</small>' : '') + '</div></div>';
    h += kotakLencana(P) + kotakPencapaian(P) + kotakKpi();
    if (A && (A.total || (A.terakhir || []).length)) {
      h += '<h2 class="bag">Aktivitas</h2><div class="grid3"><div><b>' + angka(A.bulanIni) + '</b><small>bulan ini</small></div><div><b>' + angka(A.total) + '</b><small>total</small></div><div><b>' + angka(A.unit) + '</b><small>unit ditangani</small></div></div>';
      var Tk = A.terakhir || [];
      if (Tk.length) h += '<div class="kartu" style="padding:6px 15px">' + Tk.slice(0, 8).map(function (x) { return barisAkt(tglPendek(x.t), (x.lambung ? x.lambung + ' · ' : '') + (x.jenis || ''), x.ket || '', x.status || ''); }).join('') + '</div>';
    }
    return h;
  }
  function gambarAkun() {
    var u = SESI.user, P = PROFIL && !PROFIL.galat ? PROFIL : null, h = '';
    var nama = (P && (P.namaLengkap || P.nama || P.driver)) || SESI.namaLengkap || u.nama, jab = (P && P.jabatan) || SESI.jabatan || '-';
    h += '<div class="kartu"><div class="diri">' + fotoProfil(P, nama, 72) + '<div class="nama"><b style="white-space:normal">' + esc(nama) + '</b><span>' + esc(jab) + (P && P.bagian && P.bagian !== jab ? ' · ' + esc(P.bagian) : '') + '</span><span>' + esc((P && (P.nik || P.kartu)) || SESI.idProfil || SESI.idKetik) + ' · peran ' + esc(T.NAMA_PERAN[u.peran] || u.peran) + '</span></div></div>'
      + '<div class="status"><span class="chip biru">Versi ' + esc(K.VERSI) + (window.AndroidDownloader && window.AndroidDownloader.versiApk ? ' · APK ' + esc(window.AndroidDownloader.versiApk()) : '') + '</span><span class="chip asli">profil data asli</span>' + (P && P.sejak ? '<span class="chip">sejak ' + esc(tglPendek(P.sejak)) + '</span>' : '') + '</div></div>';
    if (!PROFIL) h += R.kerangka() + R.kerangka('daftar') + '<div class="kecil" style="text-align:center">Memuat profil, bisa ±30 detik...</div>';
    else if (PROFIL.galat) h += '<div class="kartu"><b>Profil belum bisa dimuat</b><div class="kecil">' + esc(PROFIL.galat) + '</div><button type="button" class="tKecil" data-aksi="kpiUlang" style="margin-top:10px">Coba lagi</button></div>' + kotakKpi();
    else h += profilStaf(P);
    h += '<h2 class="bag">Pengaturan</h2><div class="kartu">'
      + '<div class="baris" style="align-items:center"><div style="flex:1"><b>Tema</b><div class="kecil">Gelap / terang</div></div><button type="button" class="tKecil" data-aksi="tema">' + (document.documentElement.getAttribute('data-tema') === 'gelap' ? '☀️ Terang' : '🌙 Gelap') + '</button></div>'
      + '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Suara</b><div class="kecil">Bunyi ketuk, berhasil, gagal</div></div><button type="button" class="saklar' + (R.setel.suara ? ' on' : '') + '" data-aksi="suara" role="switch" aria-checked="' + R.setel.suara + '" aria-label="Suara"><i></i></button></div>'
      + '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Getar</b><div class="kecil">Getar saat berhasil / PIN salah</div></div><button type="button" class="saklar' + (R.setel.getar ? ' on' : '') + '" data-aksi="getarSetel" role="switch" aria-checked="' + R.setel.getar + '" aria-label="Getar"><i></i></button></div>'
      + barisBio() + barisOnline() + barisSuaraKeras() + pushBaris() + (bolehUnit() && !PUSH.aktif && jembatan() ? '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Cek tiket berkala</b><div class="kecil">Storing, tiket gantung, tunggu mekanik. Dicek ±15 menit sekali walau app ditutup' + (jembatan() ? '' : ' (hanya di app Android)') + '.</div></div><button type="button" class="saklar' + (NOTIF.tiket ? ' on' : '') + '" data-aksi="notifTiket" role="switch" aria-checked="' + !!NOTIF.tiket + '" aria-label="Notifikasi tiket"><i></i></button></div>'
        + (NOTIF.tiket && jembatan() ? '<button type="button" class="tKecil" data-aksi="ujiNotif" style="width:100%;margin-top:10px">Periksa tiket sekarang</button><div class="kecil" style="margin-top:6px">Notifikasi hanya muncul untuk tiket BARU sejak pemeriksaan sebelumnya. Android bisa menunda pemeriksaan saat hemat baterai; izinkan WHL "tanpa batasan baterai" supaya lebih tepat waktu.</div>' : '') : '')
      + '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Ganti PIN</b><div class="kecil">' + (API.Pusat.asli() ? 'PIN Pusat WHL (dipakai di semua tempat)' : 'Sementara lewat Pusat WHL versi web') + '</div></div><button type="button" class="tKecil" data-aksi="gantiPin">' + (API.Pusat.asli() ? 'Ganti' : 'Buka web') + '</button></div>'
      + (window.WHL_PASANG && window.WHL_PASANG.bisa() ? '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Pasang di layar utama</b><div class="kecil">Buka WHL seperti aplikasi</div></div><button type="button" class="tKecil" data-aksi="pasang">Caranya</button></div>' : '')
      + (!window.WHL_RILIS ? '' : '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Pembaruan app</b><div class="kecil">Versi terpasang ' + esc(K.VERSI) + '. Versi baru bisa diunduh langsung dari sini.</div></div><button type="button" class="tKecil" data-aksi="cekRilis">Cek pembaruan</button></div>')
      + '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Muat ulang profil</b><div class="kecil">Ambil data terbaru dari server</div></div><button type="button" class="tKecil" data-aksi="kpiUlang">⟳</button></div>'
      + '</div>';
    h += '<button type="button" class="tKecil" data-aksi="keluar" style="width:100%;color:var(--tMerah);padding:14px">Keluar dari akun</button>';
    h += '<div class="kecil" style="text-align:center;margin-top:14px">WHL App v' + esc(K.VERSI) + ' · sesi disimpan ' + (Simpan.native() ? 'di penyimpanan app' : 'di browser (mode uji)') + '<br>Pusat WHL: ' + (API.Pusat.asli() ? 'tersambung' : 'belum tersambung (data contoh)') + '</div>';
    return h;
  }

  function gambar(animasi) {
    if (!SESI) return;
    var fokus = document.activeElement && document.activeElement.id, pos = fokus && document.activeElement.selectionStart, el = $('isi');
    var bg = $('bnrGeser'), bnrI = bg ? Math.round(bg.scrollLeft / Math.max(1, bg.clientWidth)) : 0;
    el.innerHTML = tab === 'unit' ? gambarUnit() : tab === 'absen' ? gambarAbsen() : tab === 'apps' ? gambarApps() : tab === 'akun' ? gambarAkun() : tab === 'kotak' ? gambarKotak() : gambarBeranda();
    gambarMelayang();
    if (tab === 'beranda' && window.WHL_BANNER && $('bnrGeser')) { window.WHL_BANNER.pasang(ctxBanner()); if (bnrI) $('bnrGeser').scrollLeft = bnrI * $('bnrGeser').clientWidth; }
    if (fokus && (fokus === 'cariUnit' || fokus === 'cariApp') && $(fokus)) { $(fokus).focus(); try { $(fokus).setSelectionRange(pos, pos); } catch (e) { /* */ } }
    gambarKepala();
    if (animasi) { R.hitungNaik(el); R.hitungNaik($('kpl')); el.classList.add('anim'); clearTimeout(gambar.t); gambar.t = setTimeout(function () { el.classList.remove('anim'); }, 1100); }
    aturTanda();
  }

  /* ---------- lembar bawah ---------- */
  function bukaLembar(html) { $('lembar').innerHTML = '<div class="pegangan"></div>' + html; $('tirai').classList.add('buka'); R.bunyi('sheet'); }
  function tutupLembar() { if ($('tirai').classList.contains('buka')) R.bunyi('tutup'); $('tirai').classList.remove('buka'); $('lembar').innerHTML = ''; }
  function lembarLapor() {
    var L = (INPUT_PERAN[SESI.user.peran] || []).map(function (i) { return INPUT[i]; });
    bukaLembar('<h3>➕ Input cepat</h3><div class="kecil" style="margin-bottom:12px">Form di bawah masih halaman web, dibuka di dalam app.</div>' + (L.length ? L.map(kartuApp).join('') : R.kosong('Belum ada form untuk peranmu', '')) + '<button type="button" class="tKecil" data-aksi="tutup" style="width:100%;margin-top:6px">Tutup</button>');
  }
  function aktifAbsen() {
    R.mintaPin({ judul: 'Aktifkan absen', ket: 'Isi PIN Pusat WHL sekali lagi untuk absen di HP ini.' }, function (pin) {
      return API.Absen.login(SESI.idKetik, pin).then(function (h) {
        if (!h.ok) return h.pesan || 'Gagal.';
        SESI.tokenAbm = h.token; SESI.abmPesan = ''; SESI.jabatan = h.jabatan || SESI.jabatan; simpanSesi(); if (SESI.bio) setTimeout(bioAktifkan, 800); return null;
      });
    }).then(function (jadi) { if (jadi) { ABSEN = null; gambar(); muatAbsen(); R.bunyi('sukses'); R.getar('sukses'); roti('Absen mandiri aktif.'); } });
  }
  function gantiPin() {
    var lama = '', baru = '';
    R.mintaPin({ judul: 'PIN lama', ket: 'Ketik PIN yang sekarang.' }, function (p) { lama = p; return null; }).then(function (y) {
      return y && R.mintaPin({ judul: 'PIN baru', ket: 'Pilih 4 angka baru (jangan 1234 / 0000).' }, function (p) { baru = p; return null; });
    }).then(function (y) {
      return y && R.mintaPin({ judul: 'Ulangi PIN baru', ket: 'Ketik sekali lagi PIN baru.' }, function (p) {
        if (p !== baru) return 'PIN tidak sama. Ketik ulang.';
        return API.Pusat.gantiPin(SESI.tokenPusat, lama, baru).then(function (r) {
          if (!r.ok) return r.pesan || 'Gagal mengganti PIN.';
          if (SESI.bio) { bioGugur(SESI.idProfil || SESI.idKetik); SESI.bio = false; } /* v3.9: PIN diganti -> masuk biometrik gugur */
          SESI.tokenPusat = r.token; SESI.tokenAbm = '';
          return API.Absen.login(SESI.idKetik, baru).then(function (h) { if (h.ok) SESI.tokenAbm = h.token; else SESI.abmPesan = h.pesan || ''; }, function () { SESI.abmPesan = 'Aktifkan lagi absen mandiri.'; }).then(function () { simpanSesi(); return null; });
        });
      });
    }).then(function (jadi) { if (jadi) { ABSEN = null; muatAbsen(); R.sukses({ judul: 'PIN berhasil diganti', sub: 'PIN baru berlaku di Pusat WHL, tablet briefing dan absen mandiri.', rinci: [['HP lain', 'diminta masuk lagi']], konfeti: false }); } });
  }
  function segarSemua() { muatAbsen(); return muatRingkasan(true); }

  /* ---------- satu pendengar klik ---------- */
  document.addEventListener('click', function (ev) {
    var t = ev.target, b;
    if (t.closest('.lapis')) return; // keypad PIN / sukses / onboarding / kuesioner punya pendengar sendiri
    if (t.closest('button') && !t.closest('[data-aksi="tutup"]') && !t.closest('#btnSuara')) R.bunyi('ketuk');
    if (t === $('tirai')) { tutupLembar(); return; }
    b = t.closest('.nav button[data-tab]'); if (b) { R.getar(); if (window.WHL_FORUM && window.WHL_FORUM.terbuka()) window.WHL_FORUM.tutup(); keTab(b.getAttribute('data-tab')); return; }
    if (t.closest('#navForum') && window.WHL_FORUM && window.WHL_FORUM.terbuka()) { window.WHL_FORUM.keDaftar(); return; }
    if (t.closest('#tLapor')) { R.getar(); lembarLapor(); return; }
    if (t.closest('#tAkun')) { keTab('akun'); return; }
    b = t.closest('[data-bio]'); if (b) { var bk = b.getAttribute('data-bio');
      if (bk === 'masuk') bioMasuk(); else if (bk === 'pin') { window.WHL_BIO.daftar().then(function (L) { if (L[0]) { $('inId').value = L[0].id; bioGanti = true; gambarBioLogin(); lanjut(); } }); }
      else if (bk === 'ganti') { bioGanti = true; $('inId').value = ''; gambarBioLogin(); setTimeout(function () { $('inId').focus(); }, 200); } else if (bk === 'kembali') { bioGanti = false; gambarBioLogin(); }
      return; }
    if (t.closest('#tKembali')) { R.getar(); window.WHL_KEMBALI(); return; }
    if (t.closest('#tKotakAtas')) { R.getar(); keTab('kotak'); return; }
    if (t.closest('#tCari')) { keTab('apps'); setTimeout(function () { var c = $('cariApp'); if (c) c.focus(); }, 60); return; }
    b = t.closest('[data-kotak]'); if (b) { var xk = KOTAK[+b.getAttribute('data-kotak')]; if (xk) { xk.b = true; simpanKotak(); aturTanda(); if (xk.d && xk.d.jenis) bukaDariNotif(xk.d); else if (xk.j === 'tiket') keTab('unit'); } return; }
    b = t.closest('#petaIsiApp [data-info]'); if (b) { var pp = $('petaPopApp'), kt = $('petaIsiApp').getBoundingClientRect(); if (pp) { pp.textContent = b.getAttribute('data-info'); pp.style.display = 'block'; pp.style.left = Math.max(8, Math.min(kt.width - 240, ev.clientX - kt.left - 110)) + 'px'; pp.style.top = Math.max(40, ev.clientY - kt.top + 30) + 'px'; clearTimeout(pp._t); pp._t = setTimeout(function () { pp.style.display = 'none'; }, 4000); } return; }
    b = t.closest('[data-jelas]'); if (b) { var xj = PENJELAS[+b.getAttribute('data-jelas')]; if (xj) { R.getar(); lembarJelas(xj); } return; }
    b = t.closest('[data-tindak]'); if (b) { var xt = TINDAK_SEKARANG[+b.getAttribute('data-tindak')]; if (xt) { R.getar(); lembarTindak(xt); } return; }
    b = t.closest('[data-kt]'); if (b) { R.getar(); lembarTopik(b.getAttribute('data-kt')); return; }
    if (t.closest('#btnTema')) { var tb = document.documentElement.getAttribute('data-tema') === 'gelap' ? 'terang' : 'gelap'; pasangTema(tb); Simpan.taruh(KUNCI_TEMA, tb); gambar(); return; }
    if (t.closest('#btnSuara')) { R.aturSetel('suara', !R.setel.suara); pasangSuara(); if (R.setel.suara) R.bunyi('notifikasi'); if (tab === 'akun') gambar(); return; }
    b = t.closest('[data-ke]'); if (b) { var ke = b.getAttribute('data-ke'); if (b.closest('#lembar') && ke !== 'lainnya') tutupLembar(); if (ke === 'lainnya') lembarLainnya(); else if (ke === 'kelolaBanner') { window.WHL_BANNER.pasang(ctxBanner()); window.WHL_BANNER.kelola(); } else if (ke === 'proyeksi') { keTab('beranda'); setTimeout(function () { var pq = document.querySelector('.proy'); if (pq) pq.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120); } else if (ke === 'lapor') lembarLapor(); else if (ke === 'forum') window.WHL_FORUM.buka(ctxForum()); else if (ke === 'ksn') window.WHL_KSN.buka(ctxKsn()); else if (ke === 'k3') window.WHL_KSN.bukaK3(ctxKsn()); else if (ke.indexOf('tab:') === 0) keTab(ke.slice(4)); else if (ke.indexOf('web:') === 0) bukaWeb(ke.slice(4)); return; }
    b = t.closest('[data-web]'); if (b) { var u = b.getAttribute('data-web'); if (u) bukaWeb(u); else roti('Link belum tersedia.'); return; }
    b = t.closest('[data-saring]'); if (b) { saringUnit = b.getAttribute('data-saring'); gambar(); return; }
    b = t.closest('[data-aksi]'); if (!b) return;
    var a = b.getAttribute('data-aksi');
    if (a === 'absen') { if (!navigator.onLine) { R.bunyi('gagal'); roti('Tidak ada internet. Nyalakan data / WiFi dulu.'); return; } R.getar('sedang'); try { sessionStorage.setItem('whlV2Tab', 'absen'); } catch (e) { /* */ } window.location.href = 'absen.html'; }
    else if (a === 'aktifAbsen') aktifAbsen();
    else if (a === 'segar') { D = {}; gambar(); segarSemua(); }
    else if (a === 'kpiUlang') { KPI = null; PROFIL = null; gambar(); muatProfil(true); }
    else if (a === 'tema') { var baru = document.documentElement.getAttribute('data-tema') === 'gelap' ? 'terang' : 'gelap'; pasangTema(baru); Simpan.taruh(KUNCI_TEMA, baru); gambar(); }
    else if (a === 'suara') { R.aturSetel('suara', !R.setel.suara); pasangSuara(); gambar(); if (R.setel.suara) R.bunyi('notifikasi'); }
    else if (a === 'kotakHapus') { KOTAK = []; simpanKotak(); gambar(); aturTanda(); roti('Notifikasi dibersihkan.'); }
    else if (a === 'online') { var on2 = !window.WHL_ONLINE.tampil(); window.WHL_ONLINE.aturTampil(on2); gambar(); roti(on2 ? 'Status online kamu ditampilkan.' : 'Status online disembunyikan.'); }
    else if (a === 'bio') { if (SESI && SESI.bio) bioMatikan(); else bioAktifkan(); }
    else if (a === 'cekRilis') { if (window.WHL_RILIS) window.WHL_RILIS.cekManual(roti); }
    else if (a === 'suaraKeras') {
      var kn = !suaraKeras(); R.aturSetel('keras', kn); var jb2 = window.AndroidDownloader; if (jb2 && jb2.aturSuaraKeras) try { jb2.aturSuaraKeras(kn); } catch (e) { /* */ }
      if (PUSH.token && SESI) API.Pusat.daftarPerangkat(SESI, PUSH.token, platformPush()).catch(function () { }); // server ikut pakai saluran keras/biasa
      gambar(); R.bunyi('notifikasi'); roti(kn ? 'Suara notifikasi keras dinyalakan.' : 'Suara notifikasi biasa.');
    }
    else if (a === 'ujiBunyi') { R.bunyi('pesanWhl'); R.getar('awas'); var jb3 = window.AndroidDownloader; if (jb3 && jb3.ujiBunyi) { try { jb3.ujiBunyi(); } catch (e) { /* */ } roti('Notifikasi uji dikirim ke HP ini.'); } else roti('Uji bunyi notifikasi hanya di app Android.'); }
    else if (a === 'pushUlang') { pasangPush(true); roti('Mengaktifkan notifikasi...'); }
    else if (a === 'pushSetelan') { try { window.AndroidDownloader.bukaSetelanNotif(); } catch (e) { roti('Buka Setelan HP > Aplikasi > WHL > Notifikasi.'); } }
    else if (a === 'pushTips') lembarTipsNotif();
    else if (a === 'notifTiket') { aturNotif(!NOTIF.tiket); gambar(); roti(NOTIF.tiket ? 'Notifikasi tiket dinyalakan.' : 'Notifikasi tiket dimatikan.'); }
    else if (a === 'ujiNotif') { var jb = jembatan(); if (jb) { jb.cekTiketSekarang(); roti('Memeriksa tiket di latar... notifikasi muncul kalau ada tiket baru.'); } }
    else if (a === 'getarSetel') { R.aturSetel('getar', !R.setel.getar); gambar(); if (R.setel.getar) R.getar('sukses'); }
    else if (a === 'gantiPin') { if (API.Pusat.asli()) gantiPin(); else bukaWeb(K.DASH + '?mode=pusat'); }
    else if (a === 'pasang') { if (window.WHL_PASANG) window.WHL_PASANG.tampil(); }
    else if (a === 'tutup') tutupLembar();
    else if (a === 'keluar') {
      R.tanya({ judul: 'Keluar dari akun?', ket: 'Kamu perlu nomor ID card dan PIN untuk masuk lagi di HP ini.', ya: 'Keluar', tidak: 'Batal', bahaya: true }).then(function (y) {
        if (!y) return; if (SESI && SESI.tokenAbm) API.Absen.keluar(SESI.tokenAbm);
        /* v3.6 (audit T5): HP ini berhenti menerima notifikasi akun ini (server + perangkat), kotak masuk & cache dibersihkan */
        if (SESI && PUSH.token && API.Pusat.punya('pusatLepasPerangkat')) API.Pusat.lepasPerangkat(SESI, PUSH.token).catch(function () { });
        try { if (webPesan) webPesan.deleteToken().catch(function () { }); } catch (e) { /* */ }
        KOTAK = []; simpanKotak(); Simpan.taruh('whlBanner', null);
        if (SESI) bioGugur(SESI.idProfil || SESI.idKetik); /* v3.9 */
        var habis = function () { keLogin(''); }; if (window.WHL_ONLINE) { var tunda = setTimeout(habis, 2500); window.WHL_ONLINE.berhenti().then(function () { clearTimeout(tunda); habis(); }); } else habis();
      });
    }
  });
  document.addEventListener('input', function (ev) {
    if (ev.target.id === 'cariUnit') { cariUnit = ev.target.value; gambar(); }
    if (ev.target.id === 'cariApp') { cariApp = ev.target.value; gambar(); }
    if (ev.target.id === 'cariBeranda' && ev.target.value.trim()) { cariApp = ev.target.value; keTab('apps'); var c = $('cariApp'); if (c) { c.focus(); try { c.setSelectionRange(cariApp.length, cariApp.length); } catch (e) { /* */ } } }
  });
  $('tMasuk').onclick = lanjut;
  $('inId').addEventListener('keydown', function (e) { if (e.key === 'Enter') lanjut(); });
  $('inId').addEventListener('focusout', function () { this.value = this.value.trim().toUpperCase(); });
  Array.prototype.forEach.call(document.querySelectorAll('.versi'), function (e) { e.textContent = K.VERSI; });
  setInterval(jalanJam, 10000); jalanJam();
  document.addEventListener('visibilitychange', function () { if (!document.hidden && SESI && !sedangMuat) { muatRingkasan(false); muatAbsen(); } });
  R.pasangTarik(function () { return !!SESI && !$('layarApp').classList.contains('sembunyi') && !$('tirai').classList.contains('buka') && !document.querySelector('.lapis'); }, segarSemua);

  /* Layar sukses penuh sesudah absen (halaman absen menitip hasilnya lalu kembali ke sini). */
  function tampilSuksesAbsen() {
    var h = null; try { h = JSON.parse(sessionStorage.getItem('whlV2Sukses') || 'null'); sessionStorage.removeItem('whlV2Sukses'); } catch (e) { h = null; }
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* */ }
    if (!h) return;
    R.sukses({ judul: (h.tipe || 'Absen') + ' tercatat', sub: (h.nama ? h.nama + ' · ' : '') + 'pukul ' + String(h.jam || '').replace(':', '.') + (h.status && h.status !== 'Tepat' ? ' · ' + h.status : ''),
      rinci: [['Jarak dari titik site', h.jarak != null ? h.jarak + ' m' : ''], ['Cocok wajah', h.wajah != null ? String(h.wajah) : ''], ['Lembur', h.lembur ? 'menunggu konfirmasi' : '']] }).then(function () { ABSEN = null; gambar(); muatAbsen(); });
  }

  /* ---------- mulai ---------- */
  function mulai() {
    Promise.all([Simpan.ambil(KUNCI_SESI), API.Pusat.deteksi()]).then(function (r) {
      var s = null; try { s = JSON.parse(r[0] || 'null'); } catch (e) { s = null; }
      var pesan = ''; try { pesan = sessionStorage.getItem('whlV2Pesan') || ''; sessionStorage.removeItem('whlV2Pesan'); } catch (e) { /* */ }
      if (!s || !s.user) { var t0 = null; try { t0 = JSON.parse(sessionStorage.getItem(KUNCI_TERBUKA) || 'null'); } catch (e) { t0 = null; } if (t0 && t0.user) s = t0; }
      if (!s || !s.user) { keLogin(pesan); return; }
      if (s.user.peran === 'driver') { keLogin('App ini khusus staf WHL. Driver tetap memakai jalur yang biasa (tablet / Pusat WHL web).'); return; }
      if (s.mode === 'tiruan' && r[1]) { keLogin('Pusat WHL sudah tersambung ke app. Masuk sekali lagi ya.'); return; }
      SESI = s;
      /* halaman absen menghapus token-nya sendiri kalau sesi absen habis -> samakan */
      var tokLokal = ''; try { tokLokal = localStorage.getItem(KUNCI_ABM) || ''; } catch (e) { /* */ }
      if (location.hash === '#keluar-absen') { SESI.tokenAbm = ''; SESI.abmPesan = pesan || 'Sesi absen habis.'; if (SESI.mode === 'tiruan') { keLogin(pesan || 'Sesi habis. Silakan masuk lagi.'); return; } }
      else if (SESI.tokenAbm && !tokLokal) { try { localStorage.setItem(KUNCI_ABM, SESI.tokenAbm); } catch (e) { /* */ } }
      var sukses = location.hash === '#sukses';
      simpanSesi(); mulaiApp(); if (sukses) { keTab('absen'); tampilSuksesAbsen(); }
    });
  }
  /* Kait uji (HANYA di server uji lokal, K.UJI): ?ujiMasuk=ID:PIN&tab=unit&tema=terang -> login otomatis ke server tiruan untuk potret layar. */
  if (K.UJI && /[?&]ujiMasuk=/.test(location.search)) {
    var q = {}; location.search.slice(1).split('&').forEach(function (p) { var i = p.indexOf('='); q[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1)); });
    if (q.tema) { temaUji = true; pasangTema(q.tema); }
    var ip = q.ujiMasuk.split(':'); if (q.tab) { try { sessionStorage.setItem('whlV2Tab', q.tab); } catch (e) { /* */ } }
    lewatiKenal = q.layar !== 'onboarding'; if (q.diam) R.paksaHemat(); if (q.suara === 'mati') R.aturSetel('suara', false);
    Simpan.taruh(KUNCI_SESI, null).then(function () { return Simpan.taruh('whlV2Kenal', null); }).then(function () {
      layar('layarLogin'); $('inId').value = ip[0];
      if (q.layar === 'login') return;
      if (q.layar === 'pin' || q.layar === 'pinSalah') { API.Pusat.deteksi().then(function () { R.mintaPin({ judul: 'Masukkan PIN', ket: 'PIN Pusat WHL kamu (4 angka)' }, function (p) { return cobaMasuk(ip[0], p); }); setTimeout(function () { var L = document.querySelector('.pinLapis'); (q.layar === 'pinSalah' ? ['1', '1', '1', '1'] : ['2', '5']).forEach(function (k) { L._tekan(k); }); }, 400); }); return; }
      if (q.layar === 'kerangka') { API.Pusat.ringkasan = function () { return new Promise(function () { }); }; API.Profil.ambil = function () { return new Promise(function () { }); }; }
      API.Pusat.deteksi().then(function () { return cobaMasuk(ip[0], ip[1]); }).then(function (salah) { if (salah) pesanLogin(salah);
        setTimeout(function () {
          if (!SESI) return;
          if (q.lembar === 'lapor') lembarLapor();
          if (q.layar === 'keluar') R.tanya({ judul: 'Keluar dari akun?', ket: 'Kamu perlu nomor ID card dan PIN untuk masuk lagi di HP ini.', ya: 'Keluar', tidak: 'Batal', bahaya: true });
          if (q.layar === 'ksn' || q.layar === 'ksnForm' || q.layar === 'k3') { setTimeout(function () { if (q.layar === 'k3') window.WHL_KSN.bukaK3(ctxKsn()); else { window.WHL_KSN.buka(ctxKsn()); if (q.layar === 'ksnForm') setTimeout(function () { window.WHL_KSN._form(); var L = document.querySelectorAll('.ksnLapis [data-butir][data-n="4"]'); if (L[0]) L[0].click(); var M = document.querySelector('.ksnLapis [data-butir="T2"][data-n="2"]'); if (M) M.click(); }, 500); } }, 1300); }
          if (/^forum/.test(q.layar)) { setTimeout(function () { var F = window.WHL_FORUM; F.buka(ctxForum()); var tunggu = function (f) { var i = setInterval(function () { if (F.siap()) { clearInterval(i); f(); } }, 200); };
            if (q.layar !== 'forum') tunggu(function () { F._uji.bukaRuang('umum'); setTimeout(function () {
              if (q.layar === 'forumKirim') F._uji.kirimTeks('Siap, dicek dari app WHL 👍 @Contoh Mekanik');
              if (q.layar === 'forumSuara') { F._uji.rekam(); setTimeout(function () { F._uji.henti(true); }, 2600); }
              if (q.layar === 'forumAksi') setTimeout(F._uji.aksi, 400);
            }, 1500); }); }, 900); }
          if (q.layar === 'notifTindak') setTimeout(function () { NOTIF.tiket = true; window.WHL_TINDAK('WHL 901'); }, 1200);
          if (/^rilis/.test(q.layar)) fetch(location.origin + '/api/uji?rilis=baru');
          if (q.layar === 'rilis') setTimeout(function () { window.WHL_RILIS.cekManual(roti); }, 1500);
          if (q.layar === 'rilisUnduh') setTimeout(function () { window.WHL_RILIS.cek(true).then(function (h) { if (!h.ada) return; window.WHL_RILIS.tawarkan(h.info); var t = document.querySelector('.rilisProg'); if (t) t.hidden = false; window.WHL_UNDUH('progres', '64'); }); }, 1500);
          if (q.layar === 'bannerDetail') setTimeout(function () { var c = document.createElement('canvas'); c.width = 1200; c.height = 600; var x = c.getContext('2d'); var gr = x.createLinearGradient(0, 0, 1200, 600); gr.addColorStop(0, '#0D2A55'); gr.addColorStop(1, '#1E88E5'); x.fillStyle = gr; x.fillRect(0, 0, 1200, 600); x.fillStyle = '#FFC857'; x.beginPath(); x.arc(1000, 170, 110, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 70px sans-serif'; x.fillText('BRIEFING SORE', 70, 290); x.font = '42px sans-serif'; x.fillText('13/11/2026 · Brief sore team', 70, 360);
            window.WHL_BANNER.pasang(ctxBanner()); window.WHL_BANNER.detail({ judul: 'Briefing sore 13/11/2026', sub: 'Brief sore team', gambar: c.toDataURL('image/jpeg', 0.8), mulai: '2026-11-13', isi: 'Pokok bahasan:\n- Unit storing KM 40 (WHL 902) dikawal mekanik malam\n- Wajib APD lengkap di area loading\n- Target ritase malam 120 rit\nCatatan: laporan kendala lewat Forum ruang Pengawas.', peserta: ['BUDI CONTOH SANTOSO', 'MEKANIK CONTOH', 'ANDI PENGAWAS', 'RINA HSE', 'DEDI FUELMAN'], oleh: 'REZA CONTOH', dibuat: '2026-11-13T09:30:00Z', tujuan: { jenis: 'forum', nilai: 'pengawas' } }); }, 1500);
          if (q.layar === 'bioLogin') { Simpan.taruh('whlBioDaftar', JSON.stringify([{ k: 'WHL09001', id: 'WHL-09001', nama: 'BUDI CONTOH SANTOSO', mode: 'prf' }])).then(function () { setTimeout(function () { keLogin(''); }, 600); }); }
          if (q.layar === 'bioTawar') setTimeout(function () { BIO = { ada: true, label: 'Face ID / Touch ID', jenis: 'web' }; R.tanya({ judul: 'Masuk pakai Face ID berikutnya?', ket: 'Tidak perlu ketik PIN tiap buka app. Yang memeriksa Face ID / Touch ID adalah HP kamu sendiri; data wajah / sidik jari tidak dikirim ke mana pun. Bisa dimatikan di Akun.', ya: 'Aktifkan', tidak: 'Nanti saja' }); }, 1500);
          if (q.layar === 'kelolaBanner') setTimeout(function () { var t0 = Date.now(), i = setInterval(function () { if (window.WHL_BANNER.admin() || Date.now() - t0 > 20000) { clearInterval(i); window.WHL_BANNER.pasang(ctxBanner()); window.WHL_BANNER.kelola(); setTimeout(function () { window.WHL_BANNER._uji.form(null); }, 2500); } }, 400); }, 800);
          if (q.layar === 'lainnya') setTimeout(lembarLainnya, 1500);
          if (q.layar === 'proyeksi') setTimeout(function () { var pq = document.querySelector('.proy'); if (pq) window.scrollTo(0, pq.getBoundingClientRect().top + window.scrollY - 90); }, 2200);
          if (q.layar === 'kotakIsi') setTimeout(function () { catatKotak('pengumuman', '📌 Pengumuman · Umum WHL', 'Briefing K3 besok jam 06.30 di POOL 108, semua pengawas hadir.', { jenis: 'forum', ruang: 'umum', pesan: 'contoh1' }); catatKotak('tiket', '🚨 Storing WHL 902', 'Ban lepas di KM 11 · belum ada mekanik', { jenis: 'tiket', l: 'WHL 902' }); catatKotak('sebut', '@ Andi menyebutmu', 'Andi: @Budi tolong cek unit 905 di KM 40', { jenis: 'forum', ruang: 'pengawas', pesan: 'contoh2' }); KOTAK[2].b = true; KOTAK[2].w -= 3 * 3600000; simpanKotak(); keTab('kotak'); }, 900);
          if (q.layar === 'pushTips') setTimeout(function () { keTab('akun'); setTimeout(lembarTipsNotif, 900); }, 600);
          if (q.layar === 'notifSetel') setTimeout(function () { NOTIF.tiket = true; keTab('akun'); setTimeout(function () { var x = document.querySelector('[data-aksi="notifTiket"]'); if (x) x.scrollIntoView(); }, 1500); }, 600);
          if (q.layar === 'skemaInfo') setTimeout(function () { var x = document.querySelector('#petaIsiApp .trk[data-info]'); if (x) x.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 200, clientY: 1300 })); }, 1600);
          if (q.layar === 'ksnKirim') { setTimeout(function () { window.WHL_KSN.buka(ctxKsn()); setTimeout(function () { window.WHL_KSN._form(); ['T1', 'T2', 'T3', 'T4', 'S1', 'S2'].forEach(function (id) { var b = document.querySelector('.ksnLapis [data-butir="' + id + '"][data-n="4"]'); if (b) b.click(); }); document.querySelector('.ksnLapis [data-k="kirim"]').click(); setTimeout(function () { var y = document.querySelector('.tirai.buka [data-j="1"]'); if (y) y.click(); }, 500); }, 500); }, 1300); }
          if (q.layar === 'tindak') { setTimeout(function () { if (TINDAK_SEKARANG[0]) lembarTindak(TINDAK_SEKARANG[0]); }, 1200); }
          if (q.layar === 'jelas') { setTimeout(function () { var i = 0; for (var n = 0; n < PENJELAS.length; n++) if (PENJELAS[n].jenis === 'kpi') { i = n; break; } if (PENJELAS[i]) lembarJelas(PENJELAS[i]); }, 1200); }
          if (q.layar === 'gantiPin') { gantiPin(); var urutan = (ip[1] + '1357' + '1357').split(''), i = 0; var ketik = function () { var L = document.querySelector('.pinLapis.tampil') || document.querySelector('.pinLapis'); if (L && i < urutan.length) { L._tekan(urutan[i++]); } if (i < urutan.length) setTimeout(ketik, i % 4 === 0 ? 600 : 60); }; setTimeout(ketik, 500); }
          if (q.layar === 'sukses') { try { sessionStorage.setItem('whlV2Sukses', JSON.stringify({ tipe: 'Masuk', jam: '06:54', nama: 'Budi', status: 'Tepat', jarak: 41, wajah: 0.31 })); } catch (e) { /* */ } keTab('absen'); tampilSuksesAbsen(); }
        }, 1500);
      });
    });
  } else mulai();
})();
