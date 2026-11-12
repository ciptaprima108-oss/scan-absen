/* WHL App v2 — layar asli Pusat WHL (login, beranda, unit, absen, aplikasi, akun/profil & KPI). */
(function () {
  'use strict';
  var K = window.WHL_KONFIG, T = window.WHL_TIRUAN, API = window.WHL_API, Simpan = API.Simpan, R = window.WHL_RASA;
  var KUNCI_SESI = 'whlV2Sesi', KUNCI_TEMA = 'whlV2Tema', KUNCI_ABM = 'abmToken';
  var $ = function (i) { return document.getElementById(i); };
  var SESI = null, D = {}, tab = 'beranda', ABSEN = null, KPI = null, PROFIL = null, saringUnit = 'semua', cariUnit = '', cariApp = '';

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
  function pasangTema(t) { var gelap = t === 'gelap'; document.documentElement.setAttribute('data-tema', gelap ? 'gelap' : 'terang'); var b = document.getElementById('btnTema'); if (b) b.textContent = gelap ? '☀️' : '🌙'; }
  function pasangSuara() { var b = document.getElementById('btnSuara'); if (b) { b.textContent = R.setel.suara ? '🔊' : '🔇'; b.setAttribute('aria-pressed', R.setel.suara ? 'true' : 'false'); } }
  var temaUji = false;
  Simpan.ambil(KUNCI_TEMA).then(function (t) { if (!temaUji) pasangTema(t); });

  /* ---------- sesi ---------- */
  function simpanSesi() {
    try { if (SESI && SESI.tokenAbm) localStorage.setItem(KUNCI_ABM, SESI.tokenAbm); else localStorage.removeItem(KUNCI_ABM); } catch (e) { /* */ }
    return Simpan.taruh(KUNCI_SESI, SESI ? JSON.stringify(SESI) : null);
  }
  function keLogin(pesan) {
    SESI = null; D = {}; ABSEN = null; KPI = null; PROFIL = null; simpanSesi();
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
    return '<button type="button" class="app' + (u ? '' : ' mati') + '" data-web="' + esc(u) + '"><span class="ik" style="background:' + ((DIV[a.d] || DIV.apps)[3]) + '">' + a.ic + '</span><span class="tx"><b>' + esc(a.n) + '</b><small>' + esc(a.k) + (a.kunci ? ' · 🔒 ' + esc(a.kunci) : '') + '</small></span><span class="chip web">Web</span></button>';
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
    var J = { beranda: 'Pusat WHL', unit: 'Unit hari ini', absen: 'Absen', apps: 'Semua Aplikasi', akun: 'Profil & KPI' }[t];
    $('judulTab').textContent = J; $('kpl').classList.toggle('ringkas', t !== 'beranda');
    gambar(true); window.scrollTo(0, 0);
    var el = $('isi'); el.classList.remove('masukKanan', 'masukKiri'); if (pindah) { void el.offsetWidth; el.classList.add(arah); }
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
    return API.Pusat.ringkasan(SESI, 'pos,gps,target,subcon,insiden,do,solar', paksa) /* v2.6: tanpa 'absen' & 'bertugas' (kehadiran orang lain tidak ditampilkan di app) */.then(function (r) {
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
    if (SESI.user.peran !== 'driver') L.push(['🤳', 'Absen', 'tab:absen', 'hijau']);
    L.push(['🏅', 'Profil', 'tab:akun', 'emas']);
    if (bolehUnit()) L.push(['🚛', 'Unit', 'tab:unit', 'biru']);
    appsSaya().slice(0, 4).forEach(function (a) { L.push([a.ic, a.n.replace(/ WHL$/, '').replace(/^Live Monitor /, '').replace(/^Dashboard /, ''), 'web:' + alamat(a), '']); });
    L.push(['➕', 'Input', 'lapor', 'biru']); L.push(['🗂️', 'Semua', 'tab:apps', '']);
    L = L.slice(0, 8);
    return '<div class="layanan">' + L.map(function (x) { return '<button type="button" class="ly" data-ke="' + esc(x[2]) + '"><span class="' + x[3] + '">' + x[0] + '</span><b>' + esc(x[1]) + '</b></button>'; }).join('') + '</div>';
  }
  /* ---------- Beranda: susunan & istilah mengikuti Pusat WHL web (pusat.html) ---------- */
  var DIV = { pos: ['Pos Kontrol', '🔧', '#ea580c', '#fff1e8'], ritase: ['Ritase', '🚚', '#2563eb', '#eaf1ff'], gps: ['GPS', '📍', '#0891b2', '#e6f7fb'], subcon: ['Ritase Harian per Rute', '🛣️', '#db2777', '#fdeef6'],
    insiden: ['Insiden', '🦺', '#be123c', '#fdecef'], 'do': ['DO & Uang Jalan', '🧾', '#7c3aed', '#f2ecff'], solar: ['Solar', '⛽', '#b45309', '#fdf3e4'], gudang: ['Gudang', '📦', '#0f766e', '#e6f6f3'],
    input: ['Input cepat', '➕', '#15803d', '#e8f7ee'], kreatif: ['Kreatif (Bot AI)', '🎬', '#9333ea', '#f5ecff'], absensi: ['Absensi & Roster', '🪪', '#0369a1', '#e0f2fe'], apps: ['Semua Aplikasi', '🧭', '#475569', '#eef1f5'] };
  var IKON_BESAR = { pos: '🛠️', ritase: '🚛', gps: '🛰️', subcon: '🛣️', insiden: '🦺', 'do': '🧾', solar: '⛽', gudang: '📦', input: '✍️', kreatif: '🎬', absensi: '🪪', apps: '🧭' };
  var URUT_KARTU = ['pos', 'ritase', 'gps', 'subcon', 'insiden', 'do', 'solar', 'gudang', 'absensi', 'input', 'kreatif', 'apps'];
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
    return '<button type="button" class="kt' + (x.mati ? ' mati' : '') + '" data-kt="' + k + '" style="--a:' + d[2] + '"><span class="ic">' + d[1] + '</span><span class="jd">' + esc(d[0]) + '</span>' + (x.vis ? '<span class="vis">' + x.vis + '</span>' : '')
      + '<span class="ang">' + (x.v != null ? naik(x.v, x.v % 1 ? 2 : 0) + (x.sat ? '<small>' + esc(x.sat) + '</small>' : '') : esc(x.ang)) + '</span><span class="art">' + esc(x.art) + '</span><span class="ic-besar" aria-hidden="true">' + (IKON_BESAR[k] || '') + '</span></button>';
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
    $('sapa').textContent = sapa() + ' 👋';
    $('subTab').textContent = D.serverJam ? 'Hari tambang ' + String(D.hariTambang || '') + ' · ' + String(D.serverJam).slice(-5).replace(':', '.') + ' WIB' : 'PT. Whale Holder Logistic';
    var pil = '';
    if (P && bolehUnit() && (P.perluTindakUmum != null ? P.perluTindakUmum : P.perluTindak)) pil += '<button type="button" class="pill merah" data-ke="tab:unit">🚨 ' + (P.perluTindakUmum != null ? P.perluTindakUmum : P.perluTindak) + ' perlu ditindak</button>';
    if (u.peran !== 'driver' && ABSEN && ABSEN.ok) { var c = ABSEN.hari || [], m = c.filter(function (x) { return x.tipe === 'Masuk'; })[0], pl = c.filter(function (x) { return /^Pulang/.test(x.tipe); })[0]; pil += '<button type="button" class="pill' + (m ? ' hijau' : '') + '" data-ke="tab:absen">' + (m ? '✅ Masuk ' + esc(String(m.jam).replace(':', '.')) + (m.status === 'Telat' ? ' · telat' : '') : '🕘 Belum absen masuk') + (pl ? ' · pulang ' + esc(String(pl.jam).replace(':', '.')) : '') + '</button>'; }
    if (KPI && KPI.staf && KPI.staf.nilai != null) pil += '<button type="button" class="pill" data-ke="tab:akun">🏅 KPI ' + esc(KPI.staf.nilai) + ' · ' + esc(KPI.staf.kategori) + '</button>';
    $('pills').innerHTML = pil;
    $('kpDiri').innerHTML = '<button type="button" class="diriChip" data-ke="tab:akun">' + ((T.NAMA_PERAN[u.peran] && { pimpinan: '⭐', penuh: '🔓', pengawas: '🦺', mekanik: '🔧', admin: '🗂️', adminhse: '🧑‍💼', hse: '⛑️', logistik: '📦', fuelman: '⛽', kreatif: '🎬', driver: '🚚' }[u.peran]) || '👤') + ' ' + esc(nama.toUpperCase()) + ' · ' + esc(T.NAMA_PERAN[u.peran] || u.peran) + '</button>';
  }
  function gambarBeranda() {
    var u = SESI.user, kartu = u.kartu || [], h = '';
    if (u.peran !== 'driver') h += '<div class="kartu absenK"><div class="baris" style="align-items:center"><div style="flex:1;min-width:0"><b>Absen saya hari ini</b><div class="status" style="margin-top:6px">' + chipAbsen() + '</div></div></div>' + tombolAbsen() + '</div>';
    h += '<input id="cariBeranda" class="isian cariB" type="search" placeholder="Cari menu atau aplikasi..." autocomplete="off">' + layanan();
    if (D.galat) return h + '<div class="kartu"><b>Ringkasan gagal dimuat</b><div class="kecil">' + esc(D.galat) + '</div><button type="button" class="tKecil" data-aksi="segar" style="margin-top:10px">Coba lagi</button></div>';
    if (!D.serverJam) return h + R.kerangka('kisi') + R.kerangka('daftar');
    /* Unit hari ini (kartu putih + palang bertumpuk + kotak bergaris kiri, seperti web) */
    if (ok('pos') && (kartu.indexOf('pos') >= 0 || bolehUnit())) {
      var P = D.pos, H = hitungUnit(), perbaikan = (H.nunggu || 0) + (H.dikerjakan || 0), rfu = H.rfu != null ? H.rfu : Math.max(0, (P.total || 0) - perbaikan), A = P.armada || {};
      h += '<button type="button" class="uh" data-ke="tab:unit"><div class="uh-atas"><b>Unit hari ini</b><span>' + esc(P.tanggal ? 'hari tambang ' + P.tanggal : '') + contoh() + '</span></div>'
        + '<div class="uh-tot"><b>' + naik(P.total) + '</b><span>unit total</span><em>Trintin ' + rp(A.trintin) + ' · Tronton ' + rp(A.tronton) + '</em></div>'
        + '<div class="stack">' + ['siap', 'belum', 'standby', 'nunggu', 'dikerjakan'].map(function (k) { return H[k] ? '<i style="flex:' + H[k] + ';background:' + STATUS[k][1] + '"></i>' : ''; }).join('') + '</div>'
        + '<div class="uh-kotak lebar" style="--s:#16a34a"><b>' + naik(rfu) + '</b><span>RFU (siap jalan)</span><small>Total ' + rp(P.total) + ' unit – ' + perbaikan + ' unit perbaikan' + (H.standby ? ' · termasuk ' + H.standby + ' standby' : '') + '</small></div>'
        + '<div class="uh-grid"><div class="uh-kotak" style="--s:#16a34a"><b>' + naik(P.sudahMasuk != null ? P.sudahMasuk : (P.total || 0) - (H.belum || 0)) + '</b><span>Sudah masuk Pos Kontrol</span><small>Ada catatan Pos Kontrol sejak 06.00</small></div>'
        + '<div class="uh-kotak" style="--s:#6366f1"><b>' + naik(H.belum) + '</b><span>Belum masuk</span><small>Belum ada catatan Pos Kontrol hari ini</small></div>'
        + '<div class="uh-kotak" style="--s:#f97316"><b>' + naik(perbaikan) + '</b><span>Perbaikan</span><small>' + (H.nunggu || 0) + ' nunggu mekanik · ' + (H.dikerjakan || 0) + ' lagi diperbaiki</small></div>'
        + '<div class="uh-kotak" style="--s:#a3acb9"><b>' + naik(H.standby) + '</b><span>Standby</span><small>Diparkir, tidak dijalankan</small></div></div>'
        + (P.tiket && P.tiket.lewat ? '<div class="uh-masuk">⏰ ' + P.tiket.lewat + ' tiket perbaikan terbuka lebih dari 2 jam <em>lihat Cek sekarang</em></div>' : '')
        + '<div class="uh-ket">RFU = total unit dikurangi unit yang tiket perbaikannya masih terbuka. Ketuk untuk lihat semua unit.</div></button>';
      var Tn = P.tindak || [];
      if (Tn.length) h += '<h2 class="bagW">Cek sekarang <span>' + Tn.length + ' hal' + contoh() + '</span></h2><div class="kartu" style="padding:6px 8px">' + Tn.slice(0, 7).map(function (x) {
        var w = WARNA_TINDAK[x.s] || (STATUS[x.s] || STATUS.standby)[1];
        return '<div class="ti"><span class="tic" style="background:#fff1e8;--s:' + w + '">🔧</span><span class="tx"><b>' + esc(x.judul) + '</b><small>' + esc(x.s === 'tindak' ? 'Perlu ditindak' : (STATUS[x.s] || ['', ''])[0]) + (x.ket ? ' · ' + esc(x.ket) : '') + '</small></span><em style="color:' + (x.lw || x.s === 'tindak' ? '#b91c1c' : 'var(--redup)') + '">' + esc(x.umur || '') + (x.lw ? ' ⏰' : '') + '</em></div>'; }).join('') + '</div>';
    }
    /* Target KM bulan (kartu putih seperti web): target, tercapai, pace, proyeksi */
    if (kartu.indexOf('ritase') >= 0 && ok('target') && D.target.target) {
      var TG = D.target, PR = TG.proyeksi || {}, pp = Math.min(100, Number(TG.persen) || 0), capai = PR.proyeksiKm != null && PR.proyeksiKm >= TG.target;
      h += '<button type="button" class="uh tkm" data-kt="ritase"><div class="uh-atas"><b>🎯 Target KM bulan ini</b><span>ketuk untuk rincian' + contoh() + '</span></div>'
        + '<div class="tkm-grid"><div><small>Target ' + esc(TG.bulan || '') + '</small><b>' + naik(TG.target) + ' <i>km</i></b></div><div><small>Sudah tercapai</small><b>' + naik(TG.kmMtd) + ' <i>km · ' + String(TG.persen).replace('.', ',') + '%</i></b></div>'
        + (PR.paceKmHari != null ? '<div><small>Pace rata-rata</small><b>' + rp(PR.paceKmHari) + ' <i>km/hari</i></b></div>' : '') + (PR.proyeksiKm != null ? '<div><small>Proyeksi akhir bulan</small><b style="color:' + (capai ? '#16a34a' : '#b91c1c') + '">' + rp(PR.proyeksiKm) + ' <i>km</i></b></div>' : '') + '</div>'
        + '<div class="stack" style="height:14px"><i style="flex:' + Math.max(0.5, pp) + ';background:linear-gradient(90deg,#2563eb,#16a34a)"></i><i style="flex:' + (100 - pp) + ';background:transparent"></i></div>'
        + '<div class="uh-ket" style="text-align:left">Hari ke-' + esc(TG.hariKe) + ' dari ' + esc(TG.jmlHari) + ' · rit hari ini ' + rp(TG.ritHariIni) + ' · perlu ±' + rp(TG.sisaRitHari != null ? TG.sisaRitHari : TG.butuhRitHari) + ' rit/hari</div></button>';
    }
    /* Kartu topik berwarna per divisi, urutan = URUT_KARTU web, disaring hak peran (user.kartu dari server) */
    var L = URUT_KARTU.filter(function (k) { return kartu.indexOf(k) >= 0 && k !== 'kreatif' && k !== 'absensi'; }); /* v2.6: kartu Absensi (jumlah hadir/telat/belum) tidak ditampilkan */
    if (L.length) h += '<h2 class="bagW">Ringkasan <span><button type="button" class="chip" data-aksi="segar">⟳ Segarkan</button></span></h2><div class="gridKt">' + L.map(kartuTopik).join('') + '</div>';
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

  /* Tab Absen (v2.6, permintaan Reza): HANYA status absen diri sendiri hari ini + tombol ABSEN. Tidak ada riwayat, rekap bulan,
     daftar belum absen, atau cuti/izin orang lain, untuk semua peran. */
  function gambarAbsen() {
    var h = '<div class="kartu absenK"><div class="judulK">Absen saya hari ini</div><div class="status">' + (chipAbsen() || '<span class="chip">Driver tidak perlu absen</span>') + '</div>' + (SESI.user.peran === 'driver' ? '' : tombolAbsen()) + '</div>';
    if (SESI.user.peran !== 'driver') h += '<div class="kecil" style="margin:0 6px 14px">Absen pertama hari ini tercatat sebagai <b>Masuk</b>, absen berikutnya (minimal 2 jam kemudian) sebagai <b>Pulang</b>.</div>';
    h += '<button type="button" class="app" data-web="' + esc(K.ABSEN + '?mode=izin') + '"><span class="ik" style="background:#e0f2fe">📝</span><span class="tx"><b>Pengajuan Izin</b><small>Izin / sakit / cuti</small></span><span class="chip web">Web</span></button>';
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
      + '<div class="baris" style="align-items:center"><div style="flex:1"><b>Tema</b><div class="kecil">Gelap / terang</div></div><button type="button" class="tKecil" data-aksi="tema">' + (document.documentElement.getAttribute('data-tema') === 'gelap' ? '☀️ Terang' : '🌙 Gelap') + '</button></div>'
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
    if (t.closest('button') && !t.closest('[data-aksi="tutup"]') && !t.closest('#btnSuara')) R.bunyi('ketuk');
    if (t === $('tirai')) { tutupLembar(); return; }
    b = t.closest('.nav button[data-tab]'); if (b) { R.getar(); keTab(b.getAttribute('data-tab')); return; }
    if (t.closest('#tLapor')) { R.getar(); lembarLapor(); return; }
    if (t.closest('#tAkun')) { keTab('akun'); return; }
    b = t.closest('[data-kt]'); if (b) { R.getar(); lembarTopik(b.getAttribute('data-kt')); return; }
    if (t.closest('#btnTema')) { var tb = document.documentElement.getAttribute('data-tema') === 'gelap' ? 'terang' : 'gelap'; pasangTema(tb); Simpan.taruh(KUNCI_TEMA, tb); gambar(); return; }
    if (t.closest('#btnSuara')) { R.aturSetel('suara', !R.setel.suara); pasangSuara(); if (R.setel.suara) R.bunyi('notifikasi'); if (tab === 'akun') gambar(); return; }
    b = t.closest('[data-ke]'); if (b) { var ke = b.getAttribute('data-ke'); if (ke === 'lapor') lembarLapor(); else if (ke.indexOf('tab:') === 0) keTab(ke.slice(4)); else if (ke.indexOf('web:') === 0) bukaWeb(ke.slice(4)); return; }
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
      rinci: [['Jarak dari titik site', h.jarak != null ? h.jarak + ' m' : ''], ['Cocok wajah', h.wajah != null ? String(h.wajah) : ''], ['Lembur', h.lembur ? 'menunggu konfirmasi' : '']] }).then(function () { ABSEN = null; gambar(); muatAbsen(); });
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
    lewatiKenal = q.layar !== 'onboarding'; if (q.diam) R.paksaHemat(); if (q.suara === 'mati') R.aturSetel('suara', false);
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
