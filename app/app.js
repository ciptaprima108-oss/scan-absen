/* WHL App v2 — layar asli Pusat WHL (login, beranda, unit, absen, aplikasi, akun/profil & KPI). */
(function () {
  'use strict';
  var K = window.WHL_KONFIG, T = window.WHL_TIRUAN, API = window.WHL_API, Simpan = API.Simpan, R = window.WHL_RASA;
  var KUNCI_SESI = 'whlV2Sesi', KUNCI_TEMA = 'whlV2Tema', KUNCI_ABM = 'abmToken';
  var $ = function (i) { return document.getElementById(i); };
  var SESI = null, D = {}, tab = 'beranda', ABSEN = null, KPI = null, PROFIL = null, saringUnit = 'semua', cariUnit = '', cariApp = '', tglRiwayat = '', RIWAYAT = null;

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
  function pasangTema(t) { document.documentElement.setAttribute('data-tema', t === 'terang' ? 'terang' : 'gelap'); }
  var temaUji = false;
  Simpan.ambil(KUNCI_TEMA).then(function (t) { if (!temaUji) pasangTema(t); });

  /* ---------- sesi ---------- */
  function simpanSesi() {
    try { if (SESI && SESI.tokenAbm) localStorage.setItem(KUNCI_ABM, SESI.tokenAbm); else localStorage.removeItem(KUNCI_ABM); } catch (e) { /* */ }
    return Simpan.taruh(KUNCI_SESI, SESI ? JSON.stringify(SESI) : null);
  }
  function keLogin(pesan) {
    SESI = null; D = {}; ABSEN = null; KPI = null; PROFIL = null; RIWAYAT = null; simpanSesi();
    $('pesanLogin').textContent = pesan || ''; sibuk(false); layar('layarLogin');
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
      var token = r.token; delete r.token; delete r.ok;
      var s = { mode: 'asli', tokenPusat: token, tokenAbm: '', abmPesan: '', user: r, idKetik: id, namaLengkap: r.namaLengkap || r.nama, jabatan: r.jabatan || '',
        idProfil: /^WHL-?D/i.test(r.idKartu || '') ? r.idKartu : (r.nrp || r.idKartu || id) };
      if (r.peran === 'driver') { selesaiMasuk(s); return null; } // driver tidak absen: tidak perlu sesi absen mandiri
      return API.Absen.login(id, pin).then(function (h) {
        if (h.ok) { s.tokenAbm = h.token; s.jabatan = s.jabatan || h.jabatan || ''; } else s.abmPesan = h.pesan || 'Absen mandiri belum bisa dipakai.';
      }, function (e) { s.abmPesan = 'Absen mandiri belum tersambung (' + e.message + ').'; }).then(function () { selesaiMasuk(s); return null; });
    });
  }
  /* Pusat BELUM punya API: identitas & PIN tetap diperiksa server sungguhan (Absensi, api abm). Ringkasan Pusat = data contoh. */
  function masukSementara(id, pin) {
    return API.Absen.login(id, pin).then(function (h) {
      if (!h.ok) return (h.pesan || 'Gagal masuk.') + (/PIN salah/i.test(h.pesan || '') ? '' : ' (Versi beta: sementara untuk staf yang sudah bisa absen mandiri.)');
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
    { n: 'Warehouse IPP', ic: '📦', d: 'gudang', k: 'Stok, nota, opname, PR', id: 'AKfycbzGRmzcjea3XZnudfHzgzF-Z550Lo0rR6qlaokufPM1dNkv24P6H5jH0JrMnkVQDfTb' },
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
    var P = window.WHL_PASANG; // hanya ada di browser (bukan APK)
    if (P && !P.berdiri()) { var w = null; try { w = window.open(url, '_blank'); } catch (e) { w = null; } if (w) return; }
    window.location.href = url;
  }
  function kartuApp(a) {
    var u = alamat(a);
    return '<button type="button" class="app' + (u ? '' : ' mati') + '" data-web="' + esc(u) + '"><span class="ik">' + a.ic + '</span><span class="tx"><b>' + esc(a.n) + '</b><small>' + esc(a.k) + (a.kunci ? ' · 🔒 ' + esc(a.kunci) : '') + '</small></span><span class="chip web">Web</span></button>';
  }

  function mulaiApp() {
    layar('layarApp');
    $('tAkun').textContent = inisial(SESI.namaLengkap || SESI.user.nama);
    $('pitaContoh').classList.toggle('sembunyi', API.Pusat.asli());
    var t0 = ''; try { t0 = sessionStorage.getItem('whlV2Tab') || ''; } catch (e) { /* */ }
    var h = (location.hash || '').replace('#', ''); if (/^(beranda|unit|absen|apps|akun)$/.test(h)) t0 = h;
    keTab(/^(beranda|unit|absen|apps|akun)$/.test(t0) ? t0 : 'beranda');
    muatRingkasan(false); muatAbsen(); muatProfil(false);
  }
  var URUT = ['beranda', 'unit', 'absen', 'apps', 'akun'];
  function keTab(t) {
    if (t === 'unit' && !bolehUnit()) t = 'beranda';
    var arah = URUT.indexOf(t) >= URUT.indexOf(tab) ? 'masukKanan' : 'masukKiri', pindah = t !== tab;
    tab = t; try { sessionStorage.setItem('whlV2Tab', t); } catch (e) { /* */ }
    Array.prototype.forEach.call(document.querySelectorAll('.nav button[data-tab]'), function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === t); if (b.getAttribute('data-tab') === 'unit') b.style.visibility = bolehUnit() ? '' : 'hidden'; });
    var J = { beranda: ['PUSAT WHL', 'Ringkasan hari ini'], unit: ['UNIT', 'Status unit hari ini'], absen: ['ABSEN', 'Absen mandiri & riwayat'], apps: ['APLIKASI', 'Sistem WHL lain'], akun: ['PROFIL & KPI', 'Akun saya'] }[t];
    $('judulTab').textContent = J[0]; $('subTab').textContent = J[1];
    gambar(true); window.scrollTo(0, 0);
    var el = $('isi'); el.classList.remove('masukKanan', 'masukKiri'); if (pindah) { void el.offsetWidth; el.classList.add(arah); }
    if (t === 'absen' && !RIWAYAT) muatRiwayat();
  }
  /* titik / angka kecil di navigasi bawah (pola badge notifikasi) */
  function aturTanda() {
    var a = $('tandaAbsen'), u = $('tandaUnit'); if (!a || !u || !SESI) return;
    var belumMasuk = SESI.user.peran !== 'driver' && ABSEN && ABSEN.ok && !(ABSEN.hari || []).some(function (x) { return x.tipe === 'Masuk'; });
    a.classList.toggle('sembunyi', !belumMasuk);
    var n = D.pos && D.pos.ok && D.pos.tiket ? Number(D.pos.tiket.nunggu) || 0 : 0;
    u.textContent = n > 9 ? '9+' : String(n); u.classList.toggle('sembunyi', !n || !bolehUnit());
  }

  /* ---------- muat data ---------- */
  var sedangMuat = false;
  function muatRingkasan(paksa) {
    if (!SESI) return Promise.resolve(); sedangMuat = true;
    return API.Pusat.ringkasan(SESI, 'pos,gps,target,subcon,insiden,do,solar,absen,bertugas', paksa).then(function (r) {
      sedangMuat = false;
      if (r && r.login === false) { keLogin('Sesi habis. Silakan masuk lagi.'); return; }
      if (r && r.user && SESI.mode === 'asli') { SESI.user = r.user; simpanSesi(); }
      var pertama = !D.serverJam, lama = D.pos && D.pos.tiket ? Number(D.pos.tiket.nunggu) || 0 : null;
      D = r || {}; gambar(pertama);
      var kini = D.pos && D.pos.ok && D.pos.tiket ? Number(D.pos.tiket.nunggu) || 0 : 0;
      if (API.Pusat.asli() && lama !== null && kini > lama && bolehUnit()) { R.bunyi('notifikasi'); R.getar('awas'); roti('Ada ' + (kini - lama) + ' tiket baru nunggu mekanik.'); }
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
      cekCapaianBaru(p);
      var nm = p.namaLengkap || p.nama || p.driver; if (nm && SESI) { SESI.namaLengkap = nm; if (p.jabatan) SESI.jabatan = p.jabatan; simpanSesi(); $('tAkun').textContent = inisial(nm); }
      gambar();
    }, function (e) {
      PROFIL = { galat: e.message }; gambar();
      API.Kpi.untuk(SESI.idProfil || SESI.idKetik, SESI.namaLengkap || SESI.user.nama, paksa).then(function (k) { KPI = k; gambar(); }, function (e2) { KPI = { galat: e2.message }; gambar(); });
    });
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
  function muatRiwayat() {
    if (!SESI) return; if (!tglRiwayat) tglRiwayat = hariIniWib();
    RIWAYAT = { muat: true }; gambar();
    API.Pusat.riwayat(SESI, tglRiwayat).then(function (r) { if (r && r.login === false) { keLogin('Sesi habis. Silakan masuk lagi.'); return; } RIWAYAT = r || {}; gambar(); }, function (e) { RIWAYAT = { galat: e.message }; gambar(); });
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
  var STATUS = { siap: ['Sudah dicek', '#1fae69'], belum: ['Belum masuk', '#6f7cf0'], nunggu: ['Nunggu mekanik', '#e0a100'], dikerjakan: ['Lagi diperbaiki', '#f08a3c'], standby: ['Standby', '#8fa2b7'] };
  var WARNA_TINDAK = { tindak: '#dc4c4c' };

  /* Grid ikon bulat "layanan" (pola beranda app dompet/belanja): jalan pintas yang paling sering dipakai peran ini. */
  function layanan() {
    var L = [];
    if (SESI.user.peran !== 'driver') L.push(['🤳', 'Absen', 'tab:absen', 'hijau']);
    L.push(['🏅', 'Profil', 'tab:akun', 'emas']);
    if (bolehUnit()) L.push(['🚛', 'Unit', 'tab:unit', 'biru']);
    appsSaya().slice(0, 4).forEach(function (a) { L.push([a.ic, a.n.replace(/ WHL$/, '').replace(/^Live Monitor /, '').replace(/^Dashboard /, ''), 'web:' + alamat(a), '']); });
    L.push(['➕', 'Lapor', 'lapor', 'biru']); L.push(['🗂️', 'Semua', 'tab:apps', '']);
    L = L.slice(0, 8);
    return '<div class="layanan">' + L.map(function (x) { return '<button type="button" class="ly" data-ke="' + esc(x[2]) + '"><span class="' + x[3] + '">' + x[0] + '</span><b>' + esc(x[1]) + '</b></button>'; }).join('') + '</div>';
  }
  function gambarBeranda() {
    var u = SESI.user, kartu = u.kartu || [], h = '';
    h += '<div class="kartu"><div class="diri">' + fotoProfil(PROFIL && !PROFIL.galat ? PROFIL : null, SESI.namaLengkap || u.nama, 46) + '<div class="nama"><b>' + esc(SESI.namaLengkap || u.nama) + '</b><span>' + esc(SESI.jabatan || T.NAMA_PERAN[u.peran] || u.peran) + ' · peran ' + esc(T.NAMA_PERAN[u.peran] || u.peran) + '</span></div></div>'
      + '<div class="status">' + chipAbsen() + (KPI && KPI.staf && KPI.staf.nilai != null ? '<span class="chip biru">KPI ' + esc(KPI.staf.nilai) + ' · ' + esc(KPI.staf.kategori) + '</span>' : '') + '</div>'
      + (u.peran !== 'driver' ? tombolAbsen() : '') + '</div>';
    h += '<input id="cariBeranda" class="isian cariB" type="search" placeholder="Cari menu atau aplikasi..." autocomplete="off">' + layanan();
    if (D.galat) h += '<div class="kartu"><b>Ringkasan gagal dimuat</b><div class="kecil">' + esc(D.galat) + '</div><button type="button" class="tKecil" data-aksi="segar" style="margin-top:10px">Coba lagi</button></div>';
    else if (!D.serverJam) h += '<h2 class="bag">Ringkasan hari ini</h2>' + R.kerangka('kisi') + R.kerangka('daftar');
    else {
      h += '<h2 class="bag">Ringkasan hari ini <span style="flex:1"></span><button type="button" class="chip" data-aksi="segar">⟳ Segarkan</button></h2><div class="grid2">';
      if (kartu.indexOf('ritase') >= 0 && ok('target')) { var t = D.target; h += ring('🎯', 'Target KM bulan ini', naik(t.persen, 1) + '<small>%</small>', angka(t.kmMtd) + ' / ' + angka(t.target) + ' km · rit hari ini ' + angka(t.ritHariIni), { lebar: 1, html: '<div class="palang"><i style="width:' + Math.min(100, Number(t.persen) || 0) + '%"></i></div><span class="kt">Hari ke-' + esc(t.hariKe) + ' dari ' + esc(t.jmlHari) + ' · butuh ±' + angka(t.butuhRitHari) + ' rit/hari</span>' }); }
      if (ok('pos') && (kartu.indexOf('pos') >= 0 || bolehUnit())) { var H = hitungUnit(), P = D.pos; h += ring('🛠️', 'Unit siap', naik(H.siap) + '<small> / ' + angka(P.total) + '</small>', (H.nunggu || 0) + ' nunggu mekanik · ' + (H.dikerjakan || 0) + ' diperbaiki'); h += ring('⚠️', 'Perlu tindakan', naik(P.perluTindakUmum != null ? P.perluTindakUmum : P.perluTindak), (H.belum || 0) + ' unit belum masuk Pos Kontrol'); }
      if (ok('gps') && (kartu.indexOf('gps') >= 0 || kartu.indexOf('ritase') >= 0)) h += ring('📍', 'Ritase GPS', naik(D.gps.totalRit) + '<small> rit</small>', angka(D.gps.sudahMuat) + ' unit sudah muat · ' + angka(D.gps.belumMuat) + ' belum');
      if (kartu.indexOf('insiden') >= 0 && ok('insiden')) h += ring('🦺', 'Hari tanpa insiden', naik(D.insiden.hariSejak) + '<small> hari</small>', angka(D.insiden.belumClose) + ' insiden belum close');
      if (kartu.indexOf('do') >= 0 && ok('do')) h += ring('🧮', 'DO hari ini', naik(D['do'].hariIni.tiket) + '<small> tiket</small>', angka(D['do'].menungguSemua) + ' menunggu DO · ' + angka(D['do'].menunggu3hari) + ' lebih 3 hari');
      if (kartu.indexOf('solar') >= 0 && ok('solar') && D.solar.kini) h += ring('⛽', 'Sisa solar', naik(D.solar.kini.sisa) + '<small> L</small>', 'keluar ' + angka(D.solar.kini.keluar) + ' L');
      if (kartu.indexOf('absensi') >= 0 && ok('absen')) h += ring('🪪', 'Hadir hari ini', naik(D.absen.hadir) + '<small> orang</small>', angka(D.absen.telat) + ' telat · ' + angka(D.absen.belum) + ' belum absen');
      h += '</div>';
      var B = (D.bertugas && D.bertugas.petugas) || [];
      if (B.length) h += '<h2 class="bag">Sedang bertugas ' + contoh() + '</h2><div class="kartu" style="padding:6px 15px">' + B.slice(0, 8).map(function (p) { return '<div class="orang"><div class="bulat">' + esc(inisial(p.nama)) + '</div><div><b>' + esc(p.nama) + '</b><span>' + esc(p.jabatan || '') + '</span></div><div class="kn">' + esc(String(p.sejak || '').replace(':', '.')) + (p.sampai ? (p.sampai === 'lembur' ? ' · lembur' : '–' + esc(String(p.sampai).replace(':', '.'))) : '') + '</div></div>'; }).join('') + '</div>';
      var Tn = (D.pos && D.pos.tindak) || [];
      if (Tn.length && (kartu.indexOf('pos') >= 0 || bolehUnit())) h += '<h2 class="bag">Perlu dicek ' + contoh() + '</h2>' + Tn.slice(0, 5).map(function (x) { return '<div class="unit" style="--st:' + (WARNA_TINDAK[x.s] || (STATUS[x.s] || STATUS.standby)[1]) + ';margin-bottom:8px"><b>' + esc(x.judul) + '</b><small>' + esc(x.ket || '') + (x.umur ? ' · ' + esc(x.umur) : '') + '</small></div>'; }).join('');
    }
    return h;
  }

  function gambarUnit() {
    if (!ok('pos')) return D.galat ? '<div class="kosong">' + esc(D.galat) + '</div>' : R.kerangka('daftar') + R.kerangka('daftar');
    var U = D.pos.units || [], H = hitungUnit(), q = cariUnit.toLowerCase();
    var h = '<input id="cariUnit" class="isian" type="search" placeholder="Cari lambung..." value="' + esc(cariUnit) + '" autocomplete="off" style="margin-bottom:10px">';
    h += '<div class="saring"><button type="button" data-saring="semua" class="' + (saringUnit === 'semua' ? 'on' : '') + '">Semua ' + U.length + '</button>' + Object.keys(STATUS).map(function (s) { return '<button type="button" data-saring="' + s + '" class="' + (saringUnit === s ? 'on' : '') + '">' + STATUS[s][0] + ' ' + (H[s] || 0) + '</button>'; }).join('') + '</div>';
    var L = U.filter(function (x) { return (saringUnit === 'semua' || x.s === saringUnit) && (!q || String(x.l).toLowerCase().indexOf(q) >= 0); });
    h += (API.Pusat.asli() ? '' : '<div class="kecil" style="margin:0 2px 8px">' + contoh() + ' Daftar unit di bawah ini data contoh.</div>');
    h += L.length ? '<div class="unitGrid">' + L.map(function (x) { var S = STATUS[x.s] || STATUS.standby; return '<div class="unit" style="--st:' + S[1] + '"><b>' + esc(x.l) + '</b><em>' + S[0] + '</em><small>' + esc(x.a || '') + (x.k ? ' · ' + esc(x.k) : '') + (x.u ? ' · ' + esc(x.u) : '') + '</small></div>'; }).join('') + '</div>' : R.kosong('Tidak ada unit di sini', 'Coba ganti saringan atau hapus kata pencarian.');
    return h;
  }

  function gambarAbsen() {
    var h = '<div class="kartu"><div class="judulK">Absen saya hari ini <span class="chip asli">data asli</span></div><div class="status">' + chipAbsen() + '</div>' + (SESI.user.peran === 'driver' ? '<div class="kecil" style="margin-top:10px">Driver tidak perlu absen.</div>' : tombolAbsen()) + '</div>';
    h += '<h2 class="bag">Riwayat absensi ' + contoh() + '</h2><div class="kartu"><div class="baris" style="align-items:center"><button type="button" class="tKecil" data-aksi="tglMundur">‹</button><div style="flex:1;text-align:center;font-weight:800">' + esc(tglRiwayat || hariIniWib()) + '</div><button type="button" class="tKecil" data-aksi="tglMaju">›</button></div>';
    if (!RIWAYAT || RIWAYAT.muat) h += '<div style="margin-top:10px">' + R.kerangka('daftar') + '</div>';
    else if (RIWAYAT.galat || RIWAYAT.ok === false) h += '<div class="kosong">' + esc(RIWAYAT.galat || RIWAYAT.pesan || 'Gagal memuat') + '</div>';
    else {
      var L = RIWAYAT.hadir || [];
      h += L.length ? '<div style="margin-top:6px">' + L.map(function (o) { return '<div class="orang"><div class="bulat">' + esc(inisial(o.nama)) + '</div><div><b>' + esc(o.nama) + '</b><span>' + esc(o.jabatan || '') + (o.status && o.status !== 'Tepat' ? ' · ' + esc(o.status) : '') + (o.lembur ? ' · lembur ' + esc(String(o.lembur).toLowerCase()) : '') + '</span></div><div class="kn">' + esc(String(o.masuk || '-').replace(':', '.')) + ' – ' + esc(String(o.pulang || '…').replace(':', '.')) + '</div></div>'; }).join('') + '</div>' : R.kosong('Belum ada catatan absen', 'Tidak ada yang absen di tanggal ini.');
      if ((RIWAYAT.belum || []).length) h += '<div class="kecil" style="margin-top:8px">Belum absen (' + RIWAYAT.belum.length + '): ' + RIWAYAT.belum.map(function (o) { return esc(o.nama); }).join(', ') + '</div>';
      if ((RIWAYAT.tidakMasuk || []).length) h += '<div class="kecil" style="margin-top:6px">Cuti / sakit / izin: ' + RIWAYAT.tidakMasuk.map(function (o) { return esc(o.nama) + (o.kode ? ' (' + esc(o.kode) + ')' : ''); }).join(', ') + '</div>';
      if (RIWAYAT.rosterError) h += '<div class="kecil" style="margin-top:6px;color:var(--tKuning)">' + esc(RIWAYAT.rosterError) + '</div>';
      var RB = RIWAYAT.ringkasBulan || [];
      if (RB.length) h += '</div><h2 class="bag">Rekap bulan ' + esc(RIWAYAT.bulan || '') + (RIWAYAT.lingkup === 'diri' ? ' (saya)' : RIWAYAT.lingkup === 'tim' ? ' (tim)' : '') + '</h2><div class="kartu" style="padding:6px 15px">' + RB.slice(0, 60).map(function (o) { return '<div class="orang"><div class="bulat">' + esc(inisial(o.nama)) + '</div><div style="min-width:0;flex:1"><b>' + esc(o.nama) + '</b><span>' + esc(o.jabatan || '') + '</span></div><div class="kn">' + esc(o.hadir) + ' hari' + (o.telat ? ' · ' + esc(o.telat) + ' telat' : '') + (o.lemburJam ? '<br>lembur ' + esc(o.lemburJam) + ' jam' : '') + '</div></div>'; }).join('');
    }
    h += '</div>';
    h += '<button type="button" class="app" data-web="' + esc(K.ABSEN + '?mode=izin') + '"><span class="ik">📝</span><span class="tx"><b>Pengajuan Izin</b><small>Izin / sakit / cuti</small></span><span class="chip web">Web</span></button>';
    return h;
  }

  function gambarApps() {
    var A = appsSaya(), q = cariApp.toLowerCase();
    var h = '<div class="kecil" style="margin:0 2px 10px">Sistem di bawah ini <b>belum dibuat tampilan aslinya</b>. Dibuka sebagai halaman web di dalam app (bertanda <span class="chip web">Web</span>), dipindah bertahap.</div>';
    h += '<input id="cariApp" class="isian" type="search" placeholder="Cari aplikasi..." value="' + esc(cariApp) + '" autocomplete="off" style="margin-bottom:10px">';
    var L = A.filter(function (a) { return !q || (a.n + ' ' + a.k).toLowerCase().indexOf(q) >= 0; });
    h += L.length ? L.map(kartuApp).join('') : R.kosong(A.length ? 'Tidak ketemu' : 'Belum ada aplikasi untuk peranmu', A.length ? 'Coba kata lain.' : 'Aplikasi muncul sesuai peran di Pusat WHL.');
    h += '<h2 class="bag">Lainnya</h2>' + kartuApp({ n: 'Pusat WHL versi web', ic: '🏠', k: 'Halaman Pusat WHL lengkap (login PIN lagi di sana)', u: K.DASH + '?mode=pusat' });
    return h;
  }

  var TIER = { emas: '#e0a100', perak: '#9fb2c6', perunggu: '#c98a55', berlian: '#58c8ff', platinum: '#b9a6ff', legenda: '#ff8f5a' };
  function tglPendek(t) { var m = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/); return m ? m[3] + '/' + m[2] + (m[4] ? ' ' + m[4].replace(':', '.') : '') : String(t || ''); }
  function fotoProfil(P, nama, px) {
    var f = P && typeof P.foto === 'string' ? P.foto : '';
    if (/^(data:image\/|https:\/\/)/.test(f)) return '<img class="foto" src="' + esc(f) + '" alt="" onerror="this.style.visibility=&quot;hidden&quot;" style="width:' + px + 'px;height:' + px + 'px;flex-basis:' + px + 'px">';
    return '<div class="bulat" style="width:' + px + 'px;height:' + px + 'px;flex-basis:' + px + 'px;font-size:' + Math.round(px * 0.36) + 'px">' + esc(inisial(nama)) + '</div>';
  }
  function kotakKpi() {
    var u = SESI.user, h = '<h2 class="bag">KPI bulan ini <span class="chip asli">data asli</span></h2><div class="kartu">';
    if (!KPI) h += '<div class="kosong"><span class="putar"></span> &nbsp;Menghitung KPI (bisa ±30 detik)...</div>';
    else if (KPI.galat) h += '<div class="kecil">KPI gagal dimuat: ' + esc(KPI.galat) + '</div><button type="button" class="tKecil" data-aksi="kpiUlang" style="margin-top:10px">Coba lagi</button>';
    else if (!KPI.staf) h += '<div class="kecil">' + esc(KPI.pesan || 'Belum ada KPI untuk nomor ' + (SESI.idProfil || SESI.idKetik) + '.') + '</div>';
    else {
      var s = KPI.staf, W = { hijau: '#1fae69', biru: '#3aa0ff', kuning: '#e0a100', merah: '#dc4c4c', abu: '#8fa2b7' }[s.warna] || '#3aa0ff';
      h += '<div class="nilai"><div class="lingkar" style="--p:' + (Number(s.nilai) || 0) + ';--w:' + W + '"><div>' + (s.nilai == null ? '–' : esc(s.nilai)) + '</div></div><div><div class="judulK">' + esc(s.kategori || '') + '</div><div class="kecil">' + esc(s.peranNm || s.jabatan || '') + ' · ' + esc(s.bulan || KPI.bulan || '') + (KPI.persenBulan != null ? ' (bulan berjalan ' + esc(KPI.persenBulan) + '%)' : '') + '</div><div class="kecil">Dihitung ' + esc(s.dibuat || KPI.dibuat || '') + '</div></div></div>';
      if (s.ket || s.catatan) h += '<div class="kecil" style="margin-top:10px">' + esc(s.ket || s.catatan) + '</div>';
      h += (s.kpi || []).map(function (k) {
        return '<div class="kpi"><div class="at"><b>' + esc(k.nm) + '</b><span>' + (k.status === 'ok' ? esc(k.nilai) : '–') + '</span></div><small>' + (k.status === 'ok' ? 'Aktual ' + esc(k.aktual) + (k.standar ? ' · standar ' + esc(k.standar) : '') + (k.bobot ? ' · bobot ' + esc(Math.round(k.bobotPakai || k.bobot)) + '%' : '') : esc(k.ket || k.belum || 'Belum ada data')) + (k.jenis === 'tim' ? ' · nilai tim' : '') + '</small></div>';
      }).join('');
    }
    return h + '</div>';
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
  function profilDriver(P) {
    var h = '', pk = P.pangkat;
    if (pk) h += '<div class="kartu predikat" style="--tr:' + (TIER[pk.tier] || '#3aa0ff') + '"><span class="pi">' + esc(pk.ik || '🚛') + '</span><div style="min-width:0;flex:1"><b>' + esc(pk.nm) + '</b><small>' + (P.peringkat ? 'Peringkat ' + esc(P.peringkat) + ' dari ' + esc(P.jumlahDriver) + ' driver · ' + esc(P.periodeLabel || '') : esc(P.periodeLabel || '')) + '</small>' + (P.peringkatLalu ? '<small>' + esc(P.peringkatLalu.label) + ': peringkat ' + esc(P.peringkatLalu.rank) + ' (' + esc(P.peringkatLalu.rit) + ' rit)</small>' : '') + '</div></div>';
    h += '<div class="grid3"><div><b>' + angka(P.rit) + '</b><small>rit bulan ini</small></div><div><b>' + angka(Math.round(P.ton || 0)) + '</b><small>ton bulan ini</small></div><div><b>' + angka(P.ritTotal) + '</b><small>rit total</small></div></div>';
    if (P.kmTarget) { var pp = Math.min(100, Math.round((Number(P.km) || 0) / P.kmTarget * 100)); h += '<div class="kartu"><div class="at" style="display:flex"><b style="flex:1">KM bulan ini</b><span>' + angka(P.km) + ' / ' + angka(P.kmTarget) + ' km</span></div><div class="palang"><i style="width:' + pp + '%"></i></div><div class="kecil">' + pp + '% dari target' + (P.lambung ? ' · unit ' + esc(P.lambung) + (P.nopol ? ' (' + esc(P.nopol) + ')' : '') : '') + '</div></div>'; }
    h += kotakLencana(P) + kotakKpi();
    var Tb = P.terbuka || [];
    if (Tb.length) h += '<h2 class="bag">DO belum lapor <span class="chip kuning">' + Tb.length + '</span></h2><div class="kartu" style="padding:6px 15px">' + Tb.slice(0, 8).map(function (x) { return barisAkt(tglPendek(x.tglAmbil), x.id, x.rute || '', x.foto ? 'sudah foto' : 'belum foto'); }).join('') + '</div>';
    var R = P.riwayat || [];
    if (R.length) h += '<h2 class="bag">Aktivitas terakhir</h2><div class="kartu" style="padding:6px 15px">' + R.slice(0, 8).map(function (x) { return barisAkt(tglPendek(x.waktu), (x.jenis || '') + (x.rit ? ' · ' + x.rit + ' rit' : ''), x.rute || '', x.status || ''); }).join('') + '</div>';
    if (P.p2h && P.p2h.waktu) h += '<div class="kecil" style="margin:0 4px 12px">P2H terakhir: ' + esc(tglPendek(P.p2h.waktu)) + ' · ' + esc(P.p2h.lambung || '') + ((P.p2h.rusak || []).length ? ' · ' + P.p2h.rusak.length + ' temuan' : ' · tanpa temuan') + '</div>';
    return h;
  }
  function gambarAkun() {
    var u = SESI.user, P = PROFIL && !PROFIL.galat ? PROFIL : null, h = '';
    var nama = (P && (P.namaLengkap || P.nama || P.driver)) || SESI.namaLengkap || u.nama, jab = (P && P.jabatan) || SESI.jabatan || '-';
    h += '<div class="kartu"><div class="diri">' + fotoProfil(P, nama, 72) + '<div class="nama"><b style="white-space:normal">' + esc(nama) + '</b><span>' + esc(jab) + (P && P.bagian && P.bagian !== jab ? ' · ' + esc(P.bagian) : '') + '</span><span>' + esc((P && (P.nik || P.kartu)) || SESI.idProfil || SESI.idKetik) + ' · peran ' + esc(T.NAMA_PERAN[u.peran] || u.peran) + '</span></div></div>'
      + '<div class="status"><span class="chip asli">profil data asli</span>' + (P && P.sejak ? '<span class="chip">sejak ' + esc(tglPendek(P.sejak)) + '</span>' : '') + '</div></div>';
    if (!PROFIL) h += R.kerangka() + R.kerangka('daftar') + '<div class="kecil" style="text-align:center">Memuat profil, bisa ±30 detik...</div>';
    else if (PROFIL.galat) h += '<div class="kartu"><b>Profil belum bisa dimuat</b><div class="kecil">' + esc(PROFIL.galat) + '</div><button type="button" class="tKecil" data-aksi="kpiUlang" style="margin-top:10px">Coba lagi</button></div>' + kotakKpi();
    else h += P.jenis === 'driver' ? profilDriver(P) : profilStaf(P);
    h += '<h2 class="bag">Pengaturan</h2><div class="kartu">'
      + '<div class="baris" style="align-items:center"><div style="flex:1"><b>Tema</b><div class="kecil">Gelap / terang</div></div><button type="button" class="tKecil" data-aksi="tema">' + (document.documentElement.getAttribute('data-tema') === 'terang' ? '🌙 Gelap' : '☀️ Terang') + '</button></div>'
      + '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Suara</b><div class="kecil">Bunyi ketuk, berhasil, gagal</div></div><button type="button" class="saklar' + (R.setel.suara ? ' on' : '') + '" data-aksi="suara" role="switch" aria-checked="' + R.setel.suara + '" aria-label="Suara"><i></i></button></div>'
      + '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Getar</b><div class="kecil">Getar saat berhasil / PIN salah</div></div><button type="button" class="saklar' + (R.setel.getar ? ' on' : '') + '" data-aksi="getarSetel" role="switch" aria-checked="' + R.setel.getar + '" aria-label="Getar"><i></i></button></div>'
      + '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Ganti PIN</b><div class="kecil">' + (API.Pusat.asli() ? 'PIN Pusat WHL (dipakai di semua tempat)' : 'Sementara lewat Pusat WHL versi web') + '</div></div><button type="button" class="tKecil" data-aksi="gantiPin">' + (API.Pusat.asli() ? 'Ganti' : 'Buka web') + '</button></div>'
      + (window.WHL_PASANG && window.WHL_PASANG.bisa() ? '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Pasang di layar utama</b><div class="kecil">Buka WHL seperti aplikasi</div></div><button type="button" class="tKecil" data-aksi="pasang">Caranya</button></div>' : '')
      + '<div class="baris" style="align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid var(--garis)"><div style="flex:1"><b>Muat ulang profil</b><div class="kecil">Ambil data terbaru dari server</div></div><button type="button" class="tKecil" data-aksi="kpiUlang">⟳</button></div>'
      + '</div>';
    h += '<button type="button" class="tKecil" data-aksi="keluar" style="width:100%;color:var(--tMerah);padding:14px">Keluar dari akun</button>';
    h += '<div class="kecil" style="text-align:center;margin-top:14px">WHL App v' + esc(K.VERSI) + ' · sesi disimpan ' + (Simpan.native() ? 'di penyimpanan app' : 'di browser (mode uji)') + '<br>Pusat WHL: ' + (API.Pusat.asli() ? 'tersambung' : 'belum tersambung (data contoh)') + '</div>';
    return h;
  }

  function gambar(animasi) {
    if (!SESI) return;
    var fokus = document.activeElement && document.activeElement.id, pos = fokus && document.activeElement.selectionStart, el = $('isi');
    el.innerHTML = tab === 'unit' ? gambarUnit() : tab === 'absen' ? gambarAbsen() : tab === 'apps' ? gambarApps() : tab === 'akun' ? gambarAkun() : gambarBeranda();
    if (fokus && (fokus === 'cariUnit' || fokus === 'cariApp') && $(fokus)) { $(fokus).focus(); try { $(fokus).setSelectionRange(pos, pos); } catch (e) { /* */ } }
    if (animasi) { R.hitungNaik(el); el.classList.add('anim'); clearTimeout(gambar.t); gambar.t = setTimeout(function () { el.classList.remove('anim'); }, 1100); }
    aturTanda();
  }

  /* ---------- lembar bawah ---------- */
  function bukaLembar(html) { $('lembar').innerHTML = '<div class="pegangan"></div>' + html; $('tirai').classList.add('buka'); R.bunyi('sheet'); }
  function tutupLembar() { $('tirai').classList.remove('buka'); $('lembar').innerHTML = ''; }
  function lembarLapor() {
    var L = (INPUT_PERAN[SESI.user.peran] || []).map(function (i) { return INPUT[i]; });
    bukaLembar('<h3>Lapor / Input</h3><div class="kecil" style="margin-bottom:12px">Form di bawah masih halaman web, dibuka di dalam app.</div>' + (L.length ? L.map(kartuApp).join('') : R.kosong('Belum ada form untuk peranmu', '')) + '<button type="button" class="tKecil" data-aksi="tutup" style="width:100%;margin-top:6px">Tutup</button>');
  }
  function aktifAbsen() {
    R.mintaPin({ judul: 'Aktifkan absen', ket: 'Isi PIN Pusat WHL sekali lagi untuk absen di HP ini.' }, function (pin) {
      return API.Absen.login(SESI.idKetik, pin).then(function (h) {
        if (!h.ok) return h.pesan || 'Gagal.';
        SESI.tokenAbm = h.token; SESI.abmPesan = ''; SESI.jabatan = h.jabatan || SESI.jabatan; simpanSesi(); return null;
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
    if (t.closest('.lapis')) return; // keypad PIN / sukses / onboarding punya pendengar sendiri
    if (t.closest('button')) R.bunyi('ketuk');
    if (t === $('tirai')) { tutupLembar(); return; }
    b = t.closest('.nav button[data-tab]'); if (b) { R.getar(); keTab(b.getAttribute('data-tab')); return; }
    if (t.closest('#tLapor')) { R.getar(); lembarLapor(); return; }
    if (t.closest('#tAkun')) { keTab('akun'); return; }
    b = t.closest('[data-ke]'); if (b) { var ke = b.getAttribute('data-ke'); if (ke === 'lapor') lembarLapor(); else if (ke.indexOf('tab:') === 0) keTab(ke.slice(4)); else if (ke.indexOf('web:') === 0) bukaWeb(ke.slice(4)); return; }
    b = t.closest('[data-web]'); if (b) { var u = b.getAttribute('data-web'); if (u) bukaWeb(u); else roti('Link belum tersedia.'); return; }
    b = t.closest('[data-saring]'); if (b) { saringUnit = b.getAttribute('data-saring'); gambar(); return; }
    b = t.closest('[data-aksi]'); if (!b) return;
    var a = b.getAttribute('data-aksi');
    if (a === 'absen') { if (!navigator.onLine) { R.bunyi('gagal'); roti('Tidak ada internet. Nyalakan data / WiFi dulu.'); return; } R.getar('sedang'); try { sessionStorage.setItem('whlV2Tab', 'absen'); } catch (e) { /* */ } window.location.href = 'absen.html'; }
    else if (a === 'aktifAbsen') aktifAbsen();
    else if (a === 'segar') { D = {}; gambar(); segarSemua(); }
    else if (a === 'kpiUlang') { KPI = null; PROFIL = null; gambar(); muatProfil(true); }
    else if (a === 'tglMundur' || a === 'tglMaju') { var n = geserTgl(tglRiwayat || hariIniWib(), a === 'tglMaju' ? 1 : -1); if (n > hariIniWib()) { roti('Belum ada data besok.'); return; } tglRiwayat = n; muatRiwayat(); }
    else if (a === 'tema') { var baru = document.documentElement.getAttribute('data-tema') === 'terang' ? 'gelap' : 'terang'; pasangTema(baru); Simpan.taruh(KUNCI_TEMA, baru); gambar(); }
    else if (a === 'suara') { R.aturSetel('suara', !R.setel.suara); gambar(); if (R.setel.suara) R.bunyi('sukses'); }
    else if (a === 'getarSetel') { R.aturSetel('getar', !R.setel.getar); gambar(); if (R.setel.getar) R.getar('sukses'); }
    else if (a === 'gantiPin') { if (API.Pusat.asli()) gantiPin(); else bukaWeb(K.DASH + '?mode=pusat'); }
    else if (a === 'pasang') { if (window.WHL_PASANG) window.WHL_PASANG.tampil(); }
    else if (a === 'tutup') tutupLembar();
    else if (a === 'keluar') {
      R.tanya({ judul: 'Keluar dari akun?', ket: 'Kamu perlu nomor ID card dan PIN untuk masuk lagi di HP ini.', ya: 'Keluar', tidak: 'Batal', bahaya: true }).then(function (y) {
        if (!y) return; if (SESI && SESI.tokenAbm) API.Absen.keluar(SESI.tokenAbm); keLogin('');
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
      rinci: [['Jarak dari titik site', h.jarak != null ? h.jarak + ' m' : ''], ['Cocok wajah', h.wajah != null ? String(h.wajah) : ''], ['Lembur', h.lembur ? 'menunggu konfirmasi' : '']] }).then(function () { ABSEN = null; gambar(); muatAbsen(); RIWAYAT = null; if (tab === 'absen') muatRiwayat(); });
  }

  /* ---------- mulai ---------- */
  function mulai() {
    Promise.all([Simpan.ambil(KUNCI_SESI), API.Pusat.deteksi()]).then(function (r) {
      var s = null; try { s = JSON.parse(r[0] || 'null'); } catch (e) { s = null; }
      var pesan = ''; try { pesan = sessionStorage.getItem('whlV2Pesan') || ''; sessionStorage.removeItem('whlV2Pesan'); } catch (e) { /* */ }
      if (!s || !s.user) { keLogin(pesan); return; }
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
    lewatiKenal = q.layar !== 'onboarding'; if (q.diam) R.paksaHemat();
    Simpan.taruh(KUNCI_SESI, null).then(function () { return Simpan.taruh('whlV2Kenal', null); }).then(function () {
      layar('layarLogin'); $('inId').value = ip[0];
      if (q.layar === 'login') return;
      if (q.layar === 'pin' || q.layar === 'pinSalah') { API.Pusat.deteksi().then(function () { R.mintaPin({ judul: 'Masukkan PIN', ket: 'PIN Pusat WHL kamu (4 angka)' }, function (p) { return cobaMasuk(ip[0], p); }); setTimeout(function () { var L = document.querySelector('.pinLapis'); (q.layar === 'pinSalah' ? ['1', '1', '1', '1'] : ['2', '5']).forEach(function (k) { L._tekan(k); }); }, 400); }); return; }
      if (q.layar === 'kerangka') { API.Pusat.ringkasan = function () { return new Promise(function () { }); }; API.Profil.ambil = function () { return new Promise(function () { }); }; }
      API.Pusat.deteksi().then(function () { return cobaMasuk(ip[0], ip[1]); }).then(function () {
        setTimeout(function () {
          if (!SESI) return;
          if (q.lembar === 'lapor') lembarLapor();
          if (q.layar === 'keluar') R.tanya({ judul: 'Keluar dari akun?', ket: 'Kamu perlu nomor ID card dan PIN untuk masuk lagi di HP ini.', ya: 'Keluar', tidak: 'Batal', bahaya: true });
          if (q.layar === 'gantiPin') { gantiPin(); var urutan = (ip[1] + '1357' + '1357').split(''), i = 0; var ketik = function () { var L = document.querySelector('.pinLapis.tampil') || document.querySelector('.pinLapis'); if (L && i < urutan.length) { L._tekan(urutan[i++]); } if (i < urutan.length) setTimeout(ketik, i % 4 === 0 ? 600 : 60); }; setTimeout(ketik, 500); }
          if (q.layar === 'sukses') { try { sessionStorage.setItem('whlV2Sukses', JSON.stringify({ tipe: 'Masuk', jam: '06:54', nama: 'Budi', status: 'Tepat', jarak: 41, wajah: 0.31 })); } catch (e) { /* */ } keTab('absen'); tampilSuksesAbsen(); }
        }, 1500);
      });
    });
  } else mulai();
})();
