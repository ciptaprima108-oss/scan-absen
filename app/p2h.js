/* WHL App — 🚦 ISI P2H HARIAN (app-p2h-harian-26nov, Armand 26 Nov 2026). Tahap 3 cicilan 1 rencana pindah ke App WHL.
 * Form P2H Harian (dulu halaman web ?mode=p2hharian) jadi layar asli di app: 14 item yang sama (BAIK / TIDAK BAIK, tingkat Ringan / Berat,
 *   keterangan), armada + No Lambung dari roster, shift, catatan, 1 foto opsional kamera / galeri (dikecilkan 1280 px), TTD driver.
 * Server = DASHBOARD PusatP2hApp.gs lewat api pusat: pusatP2hHarian [token, aksi, data] (aksi setup / simpan / riwayat / status).
 *   Semua aturan (item wajib, keterangan, tingkat, 2 TTD, cid anti-dobel, lock) tetap dicek SERVER oleh simpanP2HHarian yang lama.
 * REVISI 2 (Pak Fanza 26 Nov): yang MENGISI hanya driver (nama dari data user, tidak diketik; tanpa nama / TTD pengawas).
 *   Pengawas / pimpinan / HSE hanya MELIHAT daftar "Hari ini" semua unit. App = cadangan P2H GASPOL: unit yang sudah P2H hari
 *   tambang ini (GASPOL atau app) ditandai "sudah P2H hari ini", tombol Kirim mati, dan server tidak membuat baris kedua.
 * SINYAL HILANG: kiriman SELALU disimpan dulu di HP (antrean per akun + cid), lalu dikirim. Gagal jaringan -> dicoba lagi otomatis
 *   (5 dtk, 30 dtk, lalu tiap 2 menit; juga saat sinyal kembali / app dibuka) selama masih hari tambang yang sama dan belum 6 jam
 *   (umur pengaman cid di server). Lewat itu: tombol "Kirim sekarang" manual. Tanda "N belum terkirim" di kepala layar + angka di ikon menu.
 * Isian yang belum dikirim disimpan sebagai draf di HP (18 jam). Antrean TIDAK dihapus saat Keluar; hanya dikirim oleh akun yang mengisinya.
 * Tanpa alert/confirm/prompt; hapus = tekan 2x. Menu tampil hanya kalau pusatPing menyebut pusatP2hHarian.
 */
(function () {
  'use strict';
  var API = window.WHL_API, K = window.WHL_KONFIG || {};
  var FN = 'pusatP2hHarian';
  var PERAN = ['driver', 'pengawas', 'pimpinan', 'penuh', 'hse'];
  /* = P2HH_ITEMS (P2HHarian.gs). Dipakai kalau daftar dari server belum pernah termuat di HP ini. */
  var ITEM_BAWAAN = [
    { g: 'Mesin', n: 'OLI', k: 'A', d: 'oli mesin & hidrolik cukup, tidak bocor' },
    { g: 'Roda & rem', n: 'BAN & TEKANAN ANGIN', k: 'AA', d: 'tidak sobek / benjol / kempes' },
    { g: 'Roda & rem', n: 'BAUT RODA', k: 'AA', d: 'lengkap dan kencang' },
    { g: 'Roda & rem', n: 'REM KAKI', k: 'AA', d: 'pakem, angin rem cukup' },
    { g: 'Roda & rem', n: 'REM PARKIR', k: 'AA', d: 'menahan unit' },
    { g: 'Kabin & kendali', n: 'KEMUDI', k: 'AA', d: 'tidak berat, tidak oblak' },
    { g: 'Kabin & kendali', n: 'SABUK PENGAMAN', k: 'AA', d: 'ada dan mengunci' },
    { g: 'Kabin & kendali', n: 'KLAKSON', k: 'AA', d: 'bunyi' },
    { g: 'Kabin & kendali', n: 'PANEL INDIKATOR', k: 'A', d: 'lampu peringatan & meteran berfungsi' },
    { g: 'Kabin & kendali', n: 'KACA & SPION', k: 'A', d: 'tidak retak, spion lengkap' },
    { g: 'Kabin & kendali', n: 'RADIO KOMUNIKASI', k: 'A', d: 'bisa kirim & terima' },
    { g: 'Lampu', n: 'LAMPU DEPAN', k: 'AA', d: 'jauh & dekat menyala' },
    { g: 'Lampu', n: 'LAMPU REM & BELAKANG', k: 'AA', d: 'menyala' },
    { g: 'Lampu', n: 'LAMPU SEIN & HAZARD', k: 'A', d: 'kiri, kanan, hazard menyala' }
  ];
  var HASIL = { LAYAK: 'LAYAK JALAN', CATATAN: 'LAYAK JALAN DENGAN CATATAN', TIDAK: 'TIDAK LAYAK JALAN' };
  var MAKS_ANTRE = 12, UMUR_OTOMATIS = 6 * 3600000, UMUR_DRAF = 18 * 3600000, JEDA = [5000, 30000, 120000], BATAS_KIRIM = 60000;

  var CTX = null, S_AKHIR = null, el = null, TAB = 'isi', SETUP = null, galatSetup = '', memuatSetup = false, MATI = '';
  var F = null, DIPULIHKAN = 0, Q = [], Q_UID = '', Q_SIAP = false, RIW = null, galatRiw = '', memuatRiw = false, STATUS = null, KABAR = null;
  var TTD = {}, tPompa = null, sedangKirim = false, tDraf = null, urut = 0, SIAP2X = {}, pesanForm = '';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { var s = CTX && CTX.sesi ? CTX.sesi() : null; return s || S_AKHIR; }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function getar(j) { try { if (window.WHL_RASA && window.WHL_RASA.getar) window.WHL_RASA.getar(j); } catch (e) { /* */ } }
  function daring() { return navigator.onLine !== false; }
  function uid(S) { S = S || sesi(); return S ? String(S.idProfil || (S.user && S.user.nama) || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 40) : ''; }
  function panggil(aksi, data, ms) { var S = sesi(); return API.Pusat.panggil(FN, [S && S.tokenPusat, aksi, data || {}], ms || 30000); }
  function hariTambangHp(t) { return new Date((t || Date.now()) + 3600000).toISOString().slice(0, 10); } /* WIB (UTC+7) dikurangi 6 jam = UTC+1 */
  function cidBaru() { var a = 'abcdefghijklmnopqrstuvwxyz0123456789', s = ''; for (var i = 0; i < 10; i++) s += a.charAt(Math.floor(Math.random() * a.length)); return 'p2a' + Date.now().toString(36) + s; }
  function jam(t) { var d = new Date(t), p = function (n) { return n < 10 ? '0' + n : '' + n; }; return p(d.getHours()) + '.' + p(d.getMinutes()); }
  function lamaTeks(t) { var m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'baru saja' : m < 60 ? m + ' menit lalu' : Math.floor(m / 60) + ' jam ' + (m % 60) + ' menit lalu'; }
  function tglId(s) { var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] : String(s || ''); }
  function galatJaringan(e) { var t = String((e && e.message) || e || ''); return (e && e.name === 'TypeError') || /Failed to fetch|NetworkError|Load failed|Server lama menjawab|HTTP \d|sibuk|Terlalu banyak|koneksi|internet/i.test(t); }
  function kunci(n) { return 'whlP2h' + n + ':' + (Q_UID || uid()); }

  /* ---------- hak (tampilan saja; server menolak lagi kalau tidak boleh) ---------- */
  function boleh(S) {
    S = S || sesi(); var u = S && S.user, X = API && API.Pusat;
    if (!u || !X || !X.punya || !X.punya(FN) || PERAN.indexOf(u.peran) < 0) return false;
    S_AKHIR = S; siapkanAntre(S); /* app.js memanggil boleh() tiap menggambar menu -> antrean ikut dikirim walau layar ini belum dibuka */
    return true;
  }
  function antre() { return Q_SIAP ? Q.length : 0; }
  function judul(S) { S = S || sesi(); return S && S.user && S.user.peran === 'driver' ? 'Isi P2H' : 'P2H Harian'; } /* nama menu: driver mengisi, yang lain melihat */
  function itemList() { return (SETUP && SETUP.items && SETUP.items.length) ? SETUP.items : ITEM_BAWAAN; }
  function saya() { var u = (sesi() || {}).user || {}; return (SETUP && SETUP.saya) || { g: u.peran === 'driver' ? 'driver' : 'lihat', nama: String(u.nama || '').toUpperCase(), armada: '', lambung: '' }; }

  /* ---------- antrean kirim (disimpan di HP per akun) ---------- */
  function siapkanAntre(S) {
    var id = uid(S); if (!id || (Q_UID === id && Q_SIAP)) { if (Q_SIAP) jadwal(1500); return Promise.resolve(); }
    Q_UID = id; Q_SIAP = false; Q = [];
    return API.Simpan.ambil(kunci('Antre')).then(function (v) {
      if (Q_UID !== id) return;
      try { var a = JSON.parse(v || '[]'); Q = Array.isArray(a) ? a.filter(function (x) { return x && x.cid && x.p; }) : []; } catch (e) { Q = []; }
      Q.forEach(function (x) { x.mengirim = false; x.berikut = 0; });
      Q_SIAP = true; jadwal(1500); if (el) gambar(); if (Q.length && CTX && CTX.perbarui) CTX.perbarui();
    });
  }
  /** Simpan antrean lalu baca ulang (Simpan.taruh menelan galat memori penuh). Balas true kalau benar-benar tersimpan. */
  function simpanAntre() {
    var isi = JSON.stringify(Q.map(function (x) { return { cid: x.cid, t: x.t, hariHp: x.hariHp, lambung: x.lambung, st: x.st, pesan: x.pesan || '', coba: x.coba || 0, p: x.p }; }));
    var k = kunci('Antre');
    return API.Simpan.taruh(k, Q.length ? isi : null).then(function () { return API.Simpan.ambil(k); }).then(function (v) { return Q.length ? v === isi : !v; }, function () { return false; });
  }
  function otomatis(x) { return x.st === 'tunggu' && Date.now() - x.t <= UMUR_OTOMATIS && x.hariHp === hariTambangHp(); }
  function jadwal(ms) {
    clearTimeout(tPompa); tPompa = null;
    var L = Q.filter(otomatis); if (!L.length || !sesi()) return;
    var kini = Date.now(), dekat = Math.min.apply(null, L.map(function (x) { return x.berikut || 0; }));
    tPompa = setTimeout(pompa, Math.max(ms || 0, Math.min(120000, Math.max(800, dekat - kini))));
  }
  function pompa() {
    if (sedangKirim || !Q_SIAP) return;
    var S = sesi(); if (!S || !S.tokenPusat || uid(S) !== Q_UID) return;
    if (!daring()) { jadwal(15000); return; }
    var kini = Date.now(), x = Q.filter(function (y) { return otomatis(y) && (y.berikut || 0) <= kini; })[0];
    if (!x) { jadwal(); return; }
    kirim(x);
  }
  function kirim(x) {
    if (sedangKirim) return; sedangKirim = true; x.mengirim = true; if (el) gambarRingan();
    var idSaya = Q_UID, selesai = function () { sedangKirim = false; x.mengirim = false; if (el) gambar(); if (CTX && CTX.perbarui) CTX.perbarui(); jadwal(); };
    panggil('simpan', x.p, BATAS_KIRIM).then(function (h) {
      if (Q_UID !== idSaya) { sedangKirim = false; return; }
      if (h && h.ok) {
        Q = Q.filter(function (y) { return y.cid !== x.cid; }); RIW = null;
        if (h.sudahAda) { KABAR = { jenis: 'sudah', lambung: h.lambung || x.lambung, teks: h.pesan || 'Unit ini sudah P2H hari ini. Tidak dibuat P2H kedua.' }; if (F && F.lambung === (h.lambung || x.lambung)) { STATUS = { ok: true, sudah: true, lambung: F.lambung, jam: h.jam || '', sumber: h.sumber || '', hasil: h.hasil || '' }; } if (!el) roti(KABAR.teks); }
        else { KABAR = { jenis: 'ok', lambung: h.lambung || x.lambung, hasil: h.hasil || '', waktu: h.waktu || '', ulang: !!h.dariKirimanUlang, n: Number(h.jmlTidakBaik) || 0 }; getar('sukses'); if (!el) roti('P2H ' + (h.lambung || x.lambung) + ' terkirim.'); }
        return simpanAntre().then(selesai);
      }
      if (h && h.login === false) { x.berikut = Date.now() + 120000; x.pesan = 'Sesi habis. Masuk lagi, kiriman dilanjutkan.'; if (el && CTX && CTX.sesiHabis) CTX.sesiHabis(); return selesai(); }
      if (h && h.sibuk) { gagalSementara(x, h.pesan || 'Server sibuk.'); return selesai(); }
      x.st = 'tolak'; x.pesan = String((h && h.pesan) || 'Ditolak server.'); if (KABAR && KABAR.cid === x.cid) KABAR = { jenis: 'tolak', cid: x.cid, lambung: x.lambung, teks: x.pesan };
      getar('gagal'); return simpanAntre().then(selesai);
    }, function (e) {
      if (Q_UID !== idSaya) { sedangKirim = false; return; }
      if (galatJaringan(e)) { gagalSementara(x, ''); if (KABAR && KABAR.cid === x.cid) KABAR = { jenis: 'antre', cid: x.cid, lambung: x.lambung }; }
      else { x.st = 'tolak'; x.pesan = String((e && e.message) || 'Ditolak server.'); if (KABAR && KABAR.cid === x.cid) KABAR = { jenis: 'tolak', cid: x.cid, lambung: x.lambung, teks: x.pesan }; }
      return simpanAntre().then(selesai);
    });
  }
  function gagalSementara(x, pesan) { x.coba = (x.coba || 0) + 1; x.berikut = Date.now() + JEDA[Math.min(x.coba - 1, JEDA.length - 1)]; x.pesan = pesan || ''; }
  try {
    window.addEventListener('online', function () { Q.forEach(function (x) { x.berikut = 0; }); pompa(); if (el) gambarRingan(); });
    window.addEventListener('offline', function () { if (el) gambarRingan(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { Q.forEach(function (x) { if ((x.berikut || 0) - Date.now() > 5000) x.berikut = 0; }); pompa(); } });
  } catch (e) { /* */ }

  /* ---------- isian + draf ---------- */
  function formBaru() {
    var s = saya(), j = new Date().getHours();
    return { armada: s.armada || '', lambung: s.lambung || '', shift: j >= 6 && j < 18 ? 'SIANG' : 'MALAM', jawab: {}, tingkat: {}, ket: {}, catatan: '',
      driver: s.nama, foto: '', ttd: { driver: '' }, cid: '', disentuh: false };
  }
  function adaIsi(f) { return !!f && (Object.keys(f.jawab || {}).length > 0 || !!f.catatan || !!(f.ttd && f.ttd.driver)); }
  function simpanDraf() {
    clearTimeout(tDraf);
    tDraf = setTimeout(function () {
      if (!F || !Q_UID) return;
      if (!adaIsi(F)) { API.Simpan.taruh(kunci('Draf'), null); return; }
      var f = {}; for (var k in F) if (Object.prototype.hasOwnProperty.call(F, k) && k !== 'foto') f[k] = F[k];
      API.Simpan.taruh(kunci('Draf'), JSON.stringify({ t: Date.now(), f: f }));
    }, 500);
  }
  function buangDraf() { clearTimeout(tDraf); if (Q_UID) API.Simpan.taruh(kunci('Draf'), null); }
  function muatDraf() {
    return API.Simpan.ambil(kunci('Draf')).then(function (v) {
      try {
        var o = JSON.parse(v || 'null');
        if (o && o.f && Date.now() - o.t < UMUR_DRAF && adaIsi(o.f)) { var b = formBaru(); for (var k in o.f) if (Object.prototype.hasOwnProperty.call(b, k)) b[k] = o.f[k]; b.foto = ''; F = b; DIPULIHKAN = o.t; return; }
      } catch (e) { /* draf rusak: mulai kosong */ }
      DIPULIHKAN = 0;
    });
  }
  function hasilKini() {
    var I = itemList(), tb = 0, berat = 0, jawab = 0;
    I.forEach(function (it) { var s = F.jawab[it.n]; if (s) jawab++; if (s === 'TIDAK BAIK') { tb++; if (F.tingkat[it.n] === 'BERAT') berat++; } });
    return { total: I.length, jawab: jawab, tb: tb, berat: berat, hasil: jawab < I.length ? '' : berat ? HASIL.TIDAK : tb ? HASIL.CATATAN : HASIL.LAYAK };
  }
  function kelasHasil(h) { return h === HASIL.TIDAK ? 'mrh' : h === HASIL.CATATAN ? 'kng' : h === HASIL.LAYAK ? 'hij' : ''; }

  /* ---------- gaya (ikut variabel tema app) ---------- */
  function pasangGaya() {
    if (document.getElementById('p2aGaya')) return;
    var st = document.createElement('style'); st.id = 'p2aGaya';
    st.textContent = [
      '.p2aLapis button{touch-action:manipulation;-webkit-tap-highlight-color:transparent;font-family:inherit}.p2aLapis .ksnKp .sp{flex:1}',
      '.p2aLapis .ksnIsi{overflow-x:hidden}',
      '.p2aChip{border:0;border-radius:999px;background:#f59e0b;color:#1a1000;font-size:12px;font-weight:900;padding:7px 11px;white-space:nowrap;flex:none}',
      '.p2aTab{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px;margin-bottom:12px}',
      '.p2aTab button{border:1px solid var(--garis);background:var(--panel);color:var(--redup);border-radius:14px;min-height:44px;font-size:13.5px;font-weight:800;padding:0 4px}',
      '.p2aTab button.on{border-color:#1565c0;box-shadow:0 0 0 2px #1565c0 inset;color:var(--teks)}',
      '.p2aPita{font-size:13px;line-height:1.45;border-radius:14px;padding:10px 12px;margin-bottom:10px;background:rgba(245,158,11,.13);border:1px solid rgba(245,158,11,.42);overflow-wrap:anywhere}',
      '.p2aPita.mrh{background:rgba(220,38,38,.1);border-color:rgba(220,38,38,.38)}.p2aPita.hij{background:rgba(22,163,74,.12);border-color:rgba(22,163,74,.4)}.p2aPita.br{background:rgba(21,101,192,.1);border-color:rgba(21,101,192,.32)}',
      '.p2aPita b{display:block;font-size:14.5px}.p2aPita .brs{display:flex;gap:8px;margin-top:8px;flex-wrap:wrap}',
      '.p2aKc{border:1px solid var(--garis);background:var(--panel);color:var(--teks);border-radius:11px;min-height:40px;padding:0 12px;font-size:13px;font-weight:800}',
      '.p2aKc.utama{background:#1565c0;border-color:#1565c0;color:#fff}.p2aKc.mrh{color:#dc2626}.p2aKc.siap{background:#dc2626;border-color:#dc2626;color:#fff}',
      '.p2aKartu{background:var(--panel);border:1px solid var(--garis);border-radius:16px;padding:12px;margin-bottom:10px;box-shadow:var(--bayang)}',
      '.p2aLbl{font-size:12.5px;font-weight:800;color:var(--redup);margin:10px 2px 6px;display:block}.p2aLbl:first-child{margin-top:0}.p2aLbl .w{color:#dc2626;font-weight:800}',
      '.p2aSeg{display:grid;grid-template-columns:1fr 1fr;gap:8px}.p2aSeg button{border:1px solid var(--garis);background:var(--panel2,var(--panel));color:var(--teks);border-radius:12px;min-height:46px;font-size:14.5px;font-weight:800}',
      '.p2aSeg button.on{background:#1565c0;border-color:#1565c0;color:#fff}',
      '.p2aIn{width:100%;box-sizing:border-box;border:1px solid var(--garis);background:var(--panel2,var(--panel));color:var(--teks);border-radius:12px;min-height:46px;padding:10px 12px;font-size:16px;font-family:inherit}',
      '.p2aIn.kapital{text-transform:uppercase}.p2aIn[readonly]{opacity:.85;font-weight:800}select.p2aIn{appearance:auto}',
      '.p2aSemua{width:100%;border:1px dashed #16a34a;background:rgba(22,163,74,.1);color:#15803d;border-radius:12px;min-height:46px;font-size:14.5px;font-weight:900;margin-bottom:10px}',
      '.p2aGrp{font-size:12px;font-weight:900;letter-spacing:.7px;text-transform:uppercase;color:#1565c0;margin:14px 2px 6px}',
      '.p2aIt{border-top:1px solid var(--garis);padding:10px 0}.p2aGrp + .p2aIt{border-top:0;padding-top:2px}.p2aIt.kurang{background:rgba(220,38,38,.07);border-radius:10px;padding-left:6px;padding-right:6px}',
      '.p2aIt .a{display:flex;align-items:center;gap:8px}.p2aIt .nm{flex:1;min-width:0}.p2aIt .nm b{display:block;font-size:14px;line-height:1.25;overflow-wrap:anywhere}.p2aIt .nm small{display:block;font-size:11.5px;color:var(--redup);line-height:1.3;margin-top:2px}',
      '.p2aIt .jw{display:flex;gap:6px;flex:none}.p2aIt .jw button{width:62px;min-height:48px;border-radius:12px;border:1px solid var(--garis);background:var(--panel2,var(--panel));color:var(--teks);font-size:12px;font-weight:900;line-height:1.15;padding:0 2px}',
      '.p2aIt .jw button.on.b{background:#16a34a;border-color:#16a34a;color:#fff}.p2aIt .jw button.on.t{background:#dc2626;border-color:#dc2626;color:#fff}',
      '.p2aIt .kt{margin-top:8px;display:none}.p2aIt.tb .kt{display:block}.p2aIt .tk{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px}',
      '.p2aIt .tk button{border:1px solid var(--garis);background:var(--panel2,var(--panel));color:var(--teks);border-radius:11px;min-height:44px;font-size:13px;font-weight:900;line-height:1.15}.p2aIt .tk button small{display:block;font-size:10.5px;font-weight:700;opacity:.85}',
      '.p2aIt .tk button.on.r{background:#f59e0b;border-color:#f59e0b;color:#1a1000}.p2aIt .tk button.on.br{background:#b91c1c;border-color:#b91c1c;color:#fff}',
      '.p2aHasil{border-radius:14px;padding:11px 12px;margin:12px 0 2px;font-size:13px;background:var(--panel2,var(--panel));border:1px solid var(--garis)}.p2aHasil b{display:block;font-size:16px}',
      '.p2aHasil.hij{background:rgba(22,163,74,.13);border-color:rgba(22,163,74,.45)}.p2aHasil.kng{background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.5)}.p2aHasil.mrh{background:rgba(220,38,38,.12);border-color:rgba(220,38,38,.45)}',
      '.p2aFoto{display:grid;grid-template-columns:1fr 1fr;gap:8px}.p2aPrev{display:none;width:100%;max-height:220px;object-fit:contain;border-radius:12px;margin-top:8px;background:#000}.p2aPrev.ada{display:block}',
      '.p2aTtd{position:relative;border:1.5px dashed var(--garis);border-radius:14px;background:#fff;overflow:hidden}.p2aTtd canvas{display:block;width:100%;height:132px;touch-action:none}',
      '.p2aTtd .hp{position:absolute;top:6px;right:6px;border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:9px;font-size:12px;font-weight:800;padding:6px 10px}',
      '.p2aTtd .ph{position:absolute;left:0;right:0;top:52px;text-align:center;font-size:13px;color:#94a3b8;pointer-events:none}',
      '.p2aKirim{width:100%;min-height:54px;border:0;border-radius:15px;background:#16a34a;color:#fff;font-size:16.5px;font-weight:900;margin-top:14px}.p2aKirim[disabled]{opacity:.6}',
      '.p2aMsg{font-size:13.5px;font-weight:800;color:#dc2626;margin-top:10px;min-height:18px;overflow-wrap:anywhere}',
      '.p2aLama{display:block;width:100%;border:0;background:none;color:var(--redup);font-size:12.5px;text-decoration:underline;padding:14px 0 4px}',
      '.p2aR{border-left:5px solid #94a3b8}.p2aR.hij{border-left-color:#16a34a}.p2aR.kng{border-left-color:#f59e0b}.p2aR.mrh{border-left-color:#dc2626}',
      '.p2aR .a{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}.p2aR .lb{font-size:18px;font-weight:900}.p2aR .jm{margin-left:auto;font-size:12.5px;font-weight:800;color:var(--redup);white-space:nowrap}',
      '.p2aR .hs{display:inline-block;font-size:11.5px;font-weight:900;border-radius:999px;padding:3px 9px;margin-top:5px;background:rgba(148,163,184,.2)}.p2aR.hij .hs{background:rgba(22,163,74,.15);color:#15803d}.p2aR.kng .hs{background:rgba(245,158,11,.2);color:#b45309}.p2aR.mrh .hs{background:rgba(220,38,38,.14);color:#dc2626}',
      '.p2aR .inf{font-size:12.5px;color:var(--redup);line-height:1.45;margin-top:5px;overflow-wrap:anywhere}.p2aR .inf b{color:var(--teks)}',
      '.p2aKosong{text-align:center;color:var(--redup);font-size:13.5px;padding:26px 10px;line-height:1.5}',
      'html[data-tema="gelap"] .p2aSemua{color:#4ade80}html[data-tema="gelap"] .p2aR.hij .hs{color:#4ade80}html[data-tema="gelap"] .p2aR.kng .hs{color:#fbbf24}html[data-tema="gelap"] .p2aR.mrh .hs{color:#fca5a5}html[data-tema="gelap"] .p2aGrp{color:#60a5fa}html[data-tema="gelap"] .p2aMsg{color:#fca5a5}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- lapis ---------- */
  function kepala() {
    var s = saya(), n = antre();
    return '<div class="ksnKp"><button type="button" class="kb" data-a="kembali" aria-label="Kembali">‹</button><div class="nm">' + esc((s.g === 'driver' ? 'Driver' : 'Lihat saja') + (s.nama ? ' · ' + s.nama : '')) + '<b>' + (s.g === 'driver' ? 'Isi P2H Harian' : 'P2H Harian hari ini') + '</b></div><span class="sp"></span>'
      + (n ? '<button type="button" class="p2aChip" data-a="tab:antre">' + n + ' belum terkirim</button>' : '') + '</div>';
  }
  function gambar() {
    if (el && !document.body.contains(el)) el = null;
    if (!el) {
      pasangGaya();
      el = document.createElement('div'); el.className = 'lapis ksnLapis p2aLapis'; document.body.appendChild(el);
      requestAnimationFrame(function () { if (el) el.classList.add('tampil'); });
      el.addEventListener('click', klik); el.addEventListener('input', ketik); el.addEventListener('change', ubah);
    }
    if (TAB === 'antre' && !Q.length) TAB = 'isi';
    if (saya().g !== 'driver') TAB = 'hari'; /* pengawas / pimpinan / HSE: lihat saja */
    var g = el.querySelector('.ksnIsi'), y = g ? g.scrollTop : 0;
    el.innerHTML = kepala() + '<div class="ksnIsi">' + tabHtml() + (TAB === 'isi' ? isiHtml() : TAB === 'hari' ? hariHtml() : antreHtml()) + '</div>';
    var g2 = el.querySelector('.ksnIsi'); if (g2) g2.scrollTop = y;
    if (TAB === 'isi') pasangTtd();
  }
  /** Perubahan kecil (status kirim, sinyal) tanpa menggambar ulang form yang sedang diisi. */
  function gambarRingan() {
    if (!el) return;
    if (TAB !== 'isi') { gambar(); return; }
    var kp = el.querySelector('.ksnKp'); if (kp) kp.outerHTML = kepala();
    var a = el.querySelector('#p2aAtas'); if (a) a.innerHTML = atasHtml();
    var t = el.querySelector('.p2aTab'); if (t) t.outerHTML = tabHtml();
  }
  function tabHtml() {
    if (saya().g !== 'driver') return '';
    var T = [['isi', 'Isi P2H'], ['hari', 'P2H saya']];
    if (Q.length) T.push(['antre', 'Antrean (' + Q.length + ')']);
    return '<div class="p2aTab">' + T.map(function (t) { return '<button type="button" data-a="tab:' + t[0] + '" class="' + (TAB === t[0] ? 'on' : '') + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>';
  }
  function tombolLama() { return '<button type="button" class="p2aLama" data-a="lama">Pakai tampilan lama</button>'; }
  function atasHtml() {
    var h = '';
    if (!daring()) h += '<div class="p2aPita"><b>📵 Tidak ada sinyal</b>Isi saja seperti biasa. P2H disimpan dulu di HP dan dikirim sendiri begitu sinyal kembali.</div>';
    if (KABAR) {
      if (KABAR.jenis === 'sudah') h += '<div class="p2aPita br"><b>ℹ️ ' + esc(KABAR.lambung) + ' sudah P2H hari ini</b>' + esc(KABAR.teks) + '</div>';
      else if (KABAR.jenis === 'kirim') h += '<div class="p2aPita br"><b>⏳ Mengirim P2H ' + esc(KABAR.lambung) + '…</b>Sudah tersimpan di HP. Boleh lanjut isi unit lain.</div>';
      else if (KABAR.jenis === 'ok') h += '<div class="p2aPita ' + (kelasHasil(KABAR.hasil) || 'hij') + '"><b>✅ P2H ' + esc(KABAR.lambung) + ' terkirim</b>' + esc(KABAR.hasil) + (KABAR.n ? ' · ' + KABAR.n + ' item tidak baik' : '') + (KABAR.waktu ? ' · ' + esc(KABAR.waktu) : '') + (KABAR.ulang ? ' · (kiriman ulang, tidak dobel)' : '') + '</div>';
      else if (KABAR.jenis === 'antre') h += '<div class="p2aPita"><b>📥 P2H ' + esc(KABAR.lambung) + ' tersimpan di HP</b>Belum terkirim karena sinyal. Dikirim otomatis, tidak perlu isi ulang.<div class="brs"><button type="button" class="p2aKc" data-a="tab:antre">Lihat antrean</button></div></div>';
      else if (KABAR.jenis === 'tolak') h += '<div class="p2aPita mrh"><b>❌ P2H ' + esc(KABAR.lambung) + ' ditolak server</b>' + esc(KABAR.teks) + '<div class="brs"><button type="button" class="p2aKc utama" data-a="bukaLagi:' + esc(KABAR.cid) + '">Buka lagi di form</button></div></div>';
      else if (KABAR.jenis === 'penuh') h += '<div class="p2aPita mrh"><b>⚠️ Memori HP penuh</b>' + esc(KABAR.teks) + '</div>';
    }
    if (DIPULIHKAN) h += '<div class="p2aPita br"><b>📝 Isian tadi dipulihkan</b>Diisi ' + esc(lamaTeks(DIPULIHKAN)) + ', belum dikirim. Lanjutkan saja.<div class="brs"><button type="button" class="p2aKc mrh" data-a="kosongkan">Kosongkan isian</button></div></div>';
    return h;
  }
  function pilihanHtml(id, f, daftar, kosong, nilai) {
    var ada = daftar.indexOf(nilai) >= 0;
    return '<select class="p2aIn" id="' + id + '" data-f="' + f + '"><option value="">' + esc(kosong) + '</option>' + daftar.map(function (x) { return '<option value="' + esc(x) + '"' + (x === nilai ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('')
      + (nilai && !ada ? '<option value="' + esc(nilai) + '" selected>' + esc(nilai) + '</option>' : '') + '</select>';
  }
  function sudahP2h() { return !!(F && STATUS && STATUS.sudah && STATUS.lambung === F.lambung); }
  function statusHtml() {
    if (!sudahP2h()) return '';
    return '<div class="p2aPita hij" style="margin:8px 0 0">✅ <b style="display:inline">' + esc(STATUS.lambung) + ' sudah P2H hari ini</b>' + (STATUS.jam ? ' jam ' + esc(String(STATUS.jam).replace(':', '.')) : '') + (STATUS.sumber === 'GASPOL' ? ' lewat tablet GASPOL' : ' lewat app') + (STATUS.hasil ? ' · ' + esc(STATUS.hasil) : '') + '. Tidak perlu isi lagi.</div>';
  }
  function segarKirim() {
    var b = el && el.querySelector('[data-a="kirim"]'), x = el && el.querySelector('#p2aStatus'); if (x && F) x.innerHTML = statusHtml();
    if (b) { b.disabled = sudahP2h(); b.textContent = sudahP2h() ? 'Unit ini sudah P2H hari ini' : 'Kirim P2H Harian'; }
  }
  function hasilHtml() {
    var r = hasilKini();
    if (!r.hasil) return '<div class="p2aHasil"><b>' + r.jawab + ' dari ' + r.total + ' item diperiksa</b>Semua item wajib dijawab.</div>';
    return '<div class="p2aHasil ' + kelasHasil(r.hasil) + '"><b>' + esc(r.hasil) + '</b>' + (r.tb ? r.tb + ' item tidak baik' + (r.berat ? ' · ' + r.berat + ' kerusakan berat' : ' · kerusakan ringan') : 'Semua ' + r.total + ' item baik') + '</div>';
  }
  function isiHtml() {
    if (MATI) return '<div class="p2aPita"><b>Isi P2H di app sedang ditutup</b>' + esc(MATI) + '</div>' + tombolLama();
    if (!F) return '<div class="p2aKosong"><span class="putar"></span><br>Menyiapkan form…</div>';
    var s = saya(), I = itemList(), R = (SETUP && SETUP.roster) || {}, unit = (R[F.armada] || []).slice(), grup = '', h = '<div id="p2aAtas">' + atasHtml() + '</div>';
    if (galatSetup && !SETUP) h += '<div class="p2aPita mrh"><b>Daftar unit belum termuat</b>' + esc(galatSetup) + ' Buka layar ini sekali saat ada sinyal supaya daftar unit tersimpan di HP.<div class="brs"><button type="button" class="p2aKc utama" data-a="muatSetup">Coba lagi</button></div></div>';
    h += '<div class="p2aKartu"><span class="p2aLbl">Armada <span class="w">wajib</span></span><div class="p2aSeg">' + ['TRINTIN', 'TRONTON'].map(function (a) { return '<button type="button" data-a="armada:' + a + '" class="' + (F.armada === a ? 'on' : '') + '">' + (a === 'TRINTIN' ? 'Trintin' : 'Tronton') + '</button>'; }).join('') + '</div>'
      + '<label class="p2aLbl" for="p2aLambung">No Lambung <span class="w">wajib</span></label>' + pilihanHtml('p2aLambung', 'lambung', unit, F.armada ? '— pilih unit —' : '— pilih armada dulu —', F.lambung) + '<div id="p2aStatus">' + statusHtml() + '</div>'
      + '<span class="p2aLbl">Shift <span class="w">wajib</span></span><div class="p2aSeg">' + ['SIANG', 'MALAM'].map(function (a) { return '<button type="button" data-a="shift:' + a + '" class="' + (F.shift === a ? 'on' : '') + '">' + (a === 'SIANG' ? '☀️ Siang' : '🌙 Malam') + '</button>'; }).join('') + '</div></div>';
    h += '<div class="p2aKartu"><button type="button" class="p2aSemua" data-a="semuaBaik">✓ Tandai semua BAIK</button>';
    I.forEach(function (it, i) {
      if (it.g !== grup) { grup = it.g; h += '<div class="p2aGrp">' + esc(grup) + '</div>'; }
      var j = F.jawab[it.n] || '', tk = F.tingkat[it.n] || '';
      h += '<div class="p2aIt' + (j === 'TIDAK BAIK' ? ' tb' : '') + '" data-i="' + i + '"><div class="a"><div class="nm"><b>' + esc(it.n) + '</b><small>' + esc(it.d) + '</small></div><div class="jw">'
        + '<button type="button" class="b' + (j === 'BAIK' ? ' on' : '') + '" data-a="jw:' + i + ':B">✓<br>Baik</button><button type="button" class="t' + (j === 'TIDAK BAIK' ? ' on' : '') + '" data-a="jw:' + i + ':T">✕ Tidak<br>baik</button></div></div>'
        + '<div class="kt"><div class="tk"><button type="button" class="r' + (tk === 'RINGAN' ? ' on' : '') + '" data-a="tk:' + i + ':RINGAN">Ringan<small>masih layak jalan</small></button><button type="button" class="br' + (tk === 'BERAT' ? ' on' : '') + '" data-a="tk:' + i + ':BERAT">Berat<small>tidak layak jalan</small></button></div>'
        + '<input class="p2aIn" data-ket="' + i + '" maxlength="150" placeholder="Apa yang tidak baik? (wajib)" value="' + esc(F.ket[it.n] || '') + '"></div></div>';
    });
    h += '<div id="p2aHasil">' + hasilHtml() + '</div></div>';
    h += '<div class="p2aKartu"><label class="p2aLbl" for="p2aCatatan">Catatan <small>(boleh kosong)</small></label><input class="p2aIn" id="p2aCatatan" data-f="catatan" maxlength="300" placeholder="catatan tambahan" value="' + esc(F.catatan) + '">'
      + '<span class="p2aLbl">Foto <small>(boleh kosong, mis. foto bagian yang rusak)</small></span><div class="p2aFoto"><button type="button" class="p2aKc" data-a="foto:kamera">📷 Kamera</button><button type="button" class="p2aKc" data-a="foto:galeri">🖼️ Pilih dari galeri</button></div>'
      + '<input type="file" id="p2aFileKam" accept="image/*" capture="environment" hidden><input type="file" id="p2aFileGal" accept="image/*" hidden>'
      + '<img class="p2aPrev' + (F.foto ? ' ada' : '') + '" id="p2aPrev" alt=""' + (F.foto ? ' src="' + F.foto + '"' : '') + '><div id="p2aFotoSt">' + (F.foto ? '<button type="button" class="p2aKc mrh" style="margin-top:8px" data-a="fotoHapus">Hapus foto</button>' : '') + '</div></div>';
    h += '<div class="p2aKartu"><label class="p2aLbl" for="p2aDriver">Nama driver</label><input class="p2aIn" id="p2aDriver" readonly value="' + esc(F.driver) + '">'
      + '<span class="p2aLbl">Tanda tangan driver <span class="w">wajib</span></span><div class="p2aTtd"><canvas id="p2aTtd_driver"></canvas><button type="button" class="hp" data-a="ttdHapus:driver">Hapus</button><span class="ph">tanda tangan di sini</span></div>'
      + '<button type="button" class="p2aKirim" data-a="kirim"' + (sudahP2h() ? ' disabled' : '') + '>' + (sudahP2h() ? 'Unit ini sudah P2H hari ini' : 'Kirim P2H Harian') + '</button><div class="p2aMsg" id="p2aMsg">' + esc(pesanForm) + '</div></div>';
    return h + tombolLama();
  }
  function hariHtml() {
    var s = saya(), h = '';
    if (memuatRiw && !RIW) return '<div class="p2aKosong"><span class="putar"></span><br>Memuat…</div>';
    if (galatRiw && !RIW) return '<div class="p2aPita mrh"><b>Daftar belum bisa dimuat</b>' + esc(galatRiw) + '<div class="brs"><button type="button" class="p2aKc utama" data-a="muatRiw">Coba lagi</button></div></div>';
    if (!RIW) return '';
    var L = RIW.list || [], tl = L.filter(function (x) { return x.hasil === HASIL.TIDAK; }).length;
    h += '<div class="p2aPita br"><b>' + (s.g === 'driver' ? 'P2H saya' : 'P2H semua unit') + ' · hari tambang ' + esc(tglId(RIW.hari)) + '</b>' + L.length + ' P2H diisi driver lewat app' + (tl ? ' · ' + tl + ' tidak layak jalan' : '') + '. P2H yang diisi di tablet GASPOL tidak tampil di daftar ini.'
      + '<div class="brs"><button type="button" class="p2aKc" data-a="muatRiw">⟳ Muat ulang</button></div></div>';
    if (!L.length) return h + '<div class="p2aKosong">Belum ada P2H dari app hari ini.</div>';
    L.forEach(function (x) {
      h += '<div class="p2aKartu p2aR ' + kelasHasil(x.hasil) + '"><div class="a"><span class="lb">' + esc(x.lambung) + '</span><small>' + esc(x.armada === 'TRONTON' ? 'Tronton' : 'Trintin') + ' · ' + esc(x.shift) + '</small><span class="jm">' + esc(String(x.jam || '').replace(':', '.')) + '</span></div>'
        + '<span class="hs">' + esc(x.hasil) + '</span>' + (x.temuan ? '<div class="inf"><b>Temuan:</b> ' + esc(x.temuan) + '</div>' : '')
        + '<div class="inf">Driver <b>' + esc(x.driver || '-') + '</b></div>' + (x.catatan ? '<div class="inf">Catatan: ' + esc(x.catatan) + '</div>' : '') + '</div>';
    });
    return h;
  }
  function antreHtml() {
    var h = '<div class="p2aPita' + (daring() ? ' br' : '') + '"><b>' + Q.length + ' P2H belum terkirim</b>' + (daring() ? 'Dikirim otomatis satu per satu. Tidak akan dobel walau terkirim dua kali.' : 'Menunggu sinyal. Tetap tersimpan di HP walau app ditutup.') + '</div>';
    Q.forEach(function (x) {
      var basi = x.st === 'tunggu' && !otomatis(x), siap = SIAP2X['buang:' + x.cid] && Date.now() - SIAP2X['buang:' + x.cid] < 4000;
      var st = x.mengirim ? '⏳ Sedang dikirim…' : x.st === 'tolak' ? '❌ Ditolak server: ' + x.pesan : basi ? '⚠️ Sudah lewat 6 jam / ganti hari tambang, tidak dikirim otomatis. Kalau dikirim sekarang, tercatat sebagai P2H hari ini.' : '📥 Menunggu ' + (daring() ? 'giliran kirim' : 'sinyal') + (x.coba ? ' · sudah dicoba ' + x.coba + 'x' : '') + (x.pesan ? ' · ' + x.pesan : '');
      h += '<div class="p2aKartu p2aR ' + (x.st === 'tolak' ? 'mrh' : basi ? 'kng' : '') + '"><div class="a"><span class="lb">' + esc(x.lambung || '-') + '</span><small>' + esc(x.p.shift || '') + '</small><span class="jm">diisi ' + esc(tglId(x.hariHp)) + ' ' + esc(jam(x.t)) + '</span></div><div class="inf">' + esc(st) + '</div><div class="p2aPita" style="border:0;background:none;padding:0;margin:8px 0 0"><div class="brs" style="margin:0">'
        + (x.st === 'tolak' ? '<button type="button" class="p2aKc utama" data-a="bukaLagi:' + esc(x.cid) + '">Buka lagi di form</button>' : '<button type="button" class="p2aKc utama" data-a="kirimKini:' + esc(x.cid) + '"' + (x.mengirim ? ' disabled' : '') + '>Kirim sekarang</button>')
        + (x.st === 'tolak' || basi ? '<button type="button" class="p2aKc ' + (siap ? 'siap' : 'mrh') + '" data-a="buang:' + esc(x.cid) + '">' + (siap ? 'Tekan sekali lagi' : 'Buang') + '</button>' : '') + '</div></div></div>';
    });
    return h;
  }

  /* ---------- tanda tangan ---------- */
  function pasangTtd() {
    TTD = {};
    ['driver'].forEach(function (k) {
      var cv = el.querySelector('#p2aTtd_' + k); if (!cv) return;
      var p = TTD[k] = { cv: cv, isi: !!F.ttd[k] }, ph = cv.parentNode.querySelector('.ph');
      var dpr = Math.min(2, window.devicePixelRatio || 1), wd = cv.clientWidth || 300, hg = cv.clientHeight || 132;
      cv.width = Math.round(wd * dpr); cv.height = Math.round(hg * dpr);
      var c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); c.scale(dpr, dpr); c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#111';
      if (F.ttd[k]) { if (ph) ph.style.display = 'none'; var im = new Image(); im.onload = function () { try { c.drawImage(im, 0, 0, wd, hg); } catch (e) { /* */ } }; im.src = F.ttd[k]; }
      var gbr = false, xy = function (e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.addEventListener('pointerdown', function (e) { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { /* */ } gbr = true; var a = xy(e); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + 0.1, a[1] + 0.1); c.stroke(); p.isi = true; if (ph) ph.style.display = 'none'; });
      cv.addEventListener('pointermove', function (e) { if (!gbr) return; e.preventDefault(); var a = xy(e); c.lineTo(a[0], a[1]); c.stroke(); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { cv.addEventListener(n, function () { if (!gbr) return; gbr = false; if (p.isi && F) { F.ttd[k] = cv.toDataURL('image/png'); F.disentuh = true; simpanDraf(); } }); });
    });
  }

  /* ---------- foto (dikecilkan di HP) ---------- */
  function bacaFoto(inp) {
    var f = inp.files && inp.files[0]; if (!f || !F) return;
    var st = el.querySelector('#p2aFotoSt'); if (st) st.textContent = 'Memproses foto…';
    var rd = new FileReader();
    rd.onerror = function () { if (st) st.textContent = 'Foto gagal dibaca. Coba lagi.'; };
    rd.onload = function () {
      var im = new Image();
      im.onerror = function () { if (st) st.textContent = 'Berkas ini bukan foto.'; };
      im.onload = function () {
        var kecil = function (sisi, mutu) { var sk = Math.min(1, sisi / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(im.width * sk)); cv.height = Math.max(1, Math.round(im.height * sk)); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); return cv.toDataURL('image/jpeg', mutu); };
        var d = kecil(1280, 0.7); if (d.length > 800000) d = kecil(1024, 0.55); if (d.length > 800000) d = kecil(800, 0.5);
        if (!F) return; F.foto = d; F.disentuh = true; inp.value = ''; if (el && TAB === 'isi') gambar();
      };
      im.src = rd.result;
    };
    rd.readAsDataURL(f);
  }

  /* ---------- aksi ---------- */
  function bacaIsian() {
    if (!el || !F || TAB !== 'isi') return;
    var I = itemList();
    Array.prototype.forEach.call(el.querySelectorAll('[data-ket]'), function (x) { var it = I[+x.getAttribute('data-ket')]; if (it) F.ket[it.n] = x.value; });
    Array.prototype.forEach.call(el.querySelectorAll('[data-f]'), function (x) { var f = x.getAttribute('data-f'); if (x.tagName === 'INPUT' && !x.readOnly && f === 'catatan') F[f] = x.value; });
  }
  function msg(t) { pesanForm = t || ''; var m = el && el.querySelector('#p2aMsg'); if (m) m.textContent = pesanForm; }
  function segarHasil() { var x = el && el.querySelector('#p2aHasil'); if (x) x.innerHTML = hasilHtml(); }
  function setJawab(i, nilai) {
    var it = itemList()[i]; if (!it) return;
    F.jawab[it.n] = nilai;
    if (nilai === 'TIDAK BAIK') { if (!F.tingkat[it.n]) F.tingkat[it.n] = it.k === 'AA' ? 'BERAT' : 'RINGAN'; } else { delete F.tingkat[it.n]; delete F.ket[it.n]; }
    var w = el.querySelector('.p2aIt[data-i="' + i + '"]'); if (!w) return;
    w.classList.toggle('tb', nilai === 'TIDAK BAIK'); w.classList.remove('kurang');
    w.querySelector('.jw .b').classList.toggle('on', nilai === 'BAIK'); w.querySelector('.jw .t').classList.toggle('on', nilai === 'TIDAK BAIK');
    w.querySelector('.tk .r').classList.toggle('on', F.tingkat[it.n] === 'RINGAN'); w.querySelector('.tk .br').classList.toggle('on', F.tingkat[it.n] === 'BERAT');
    if (nilai !== 'TIDAK BAIK') { var inp = w.querySelector('[data-ket]'); if (inp) inp.value = ''; }
  }
  function cekStatus() {
    STATUS = null; segarKirim();
    if (!F || !F.lambung || !F.armada || !daring() || !sesi()) return;
    var lb = F.lambung;
    panggil('status', { armada: F.armada, lambung: lb }, 20000).then(function (h) { if (!h || !h.ok || !F || F.lambung !== lb) return; STATUS = h; segarKirim(); }, function () { /* petunjuk saja */ });
  }
  function validasi() {
    var I = itemList(), kurang = -1, pesan = '';
    if (!F.armada) return ['Pilih armada dulu.', '.p2aSeg'];
    if (!F.lambung) return ['Pilih No Lambung.', '#p2aLambung'];
    if (sudahP2h()) return [F.lambung + ' sudah P2H hari ini. Tidak perlu isi lagi.', '#p2aLambung'];
    if (!F.shift) return ['Pilih shift: Siang atau Malam.', '.p2aSeg'];
    I.forEach(function (it, i) {
      if (kurang >= 0) return; var j = F.jawab[it.n];
      if (j !== 'BAIK' && j !== 'TIDAK BAIK') { kurang = i; pesan = 'Item "' + it.n + '" belum diperiksa.'; }
      else if (j === 'TIDAK BAIK' && !String(F.ket[it.n] || '').trim()) { kurang = i; pesan = 'Tulis apa yang tidak baik pada "' + it.n + '".'; }
      else if (j === 'TIDAK BAIK' && F.tingkat[it.n] !== 'RINGAN' && F.tingkat[it.n] !== 'BERAT') { kurang = i; pesan = 'Pilih kerusakan ringan atau berat untuk "' + it.n + '".'; }
    });
    if (kurang >= 0) return [pesan, '.p2aIt[data-i="' + kurang + '"]', true];
    if (!F.ttd.driver) return ['Tanda tangan driver belum ada.', '#p2aTtd_driver'];
    return null;
  }
  function kirimForm(btn) {
    bacaIsian();
    var v = validasi();
    if (v) { msg(v[0]); getar('gagal'); var t = el.querySelector(v[1]); if (t) { if (v[2]) t.classList.add('kurang'); try { t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) { /* */ } } return; }
    if (Q.length >= MAKS_ANTRE) { msg('Antrean di HP penuh (' + MAKS_ANTRE + ' P2H belum terkirim). Cari sinyal dulu supaya terkirim.'); return; }
    if (btn) btn.disabled = true;
    var I = itemList(), items = {}, ket = {}, tingkat = {};
    I.forEach(function (it) { items[it.n] = F.jawab[it.n]; if (F.jawab[it.n] === 'TIDAK BAIK') { ket[it.n] = String(F.ket[it.n] || '').trim().slice(0, 150); tingkat[it.n] = F.tingkat[it.n]; } });
    var kini = Date.now(), cid = F.cid || cidBaru();
    var x = { cid: cid, t: kini, hariHp: hariTambangHp(kini), lambung: F.lambung, st: 'tunggu', pesan: '', coba: 0, berikut: 0,
      p: { cid: cid, armada: F.armada, lambung: F.lambung, shift: F.shift, items: items, keterangan: ket, tingkat: tingkat, catatan: String(F.catatan || '').trim().slice(0, 300), ttdDriver: F.ttd.driver, foto: F.foto || '' } };
    Q.push(x); KABAR = { jenis: 'kirim', cid: cid, lambung: x.lambung };
    simpanAntre().then(function (ok) {
      if (!ok && x.p.foto) { x.p.foto = ''; return simpanAntre().then(function (ok2) { if (ok2) roti('Memori HP hampir penuh: foto tidak ikut disimpan.'); return ok2; }); }
      return ok;
    }).then(function (ok) {
      if (!ok) KABAR = { jenis: 'penuh', teks: 'P2H ' + x.lambung + ' belum bisa disimpan di HP. Jangan tutup app sampai muncul tanda terkirim.' };
      F = formBaru(); DIPULIHKAN = 0; STATUS = null; pesanForm = ''; buangDraf(); TAB = 'isi';
      if (el) { gambar(); var g = el.querySelector('.ksnIsi'); if (g) g.scrollTop = 0; }
      if (CTX && CTX.perbarui) CTX.perbarui();
      if (daring()) { if (!sedangKirim) kirim(x); else jadwal(500); } else { if (KABAR && KABAR.cid === cid) KABAR = { jenis: 'antre', cid: cid, lambung: x.lambung }; gambarRingan(); jadwal(15000); }
    });
  }
  function bukaLagi(cid) {
    var x = Q.filter(function (y) { return y.cid === cid; })[0]; if (!x) return;
    var p = x.p, b = formBaru();
    b.armada = p.armada; b.lambung = p.lambung; b.shift = p.shift; b.jawab = p.items || {}; b.ket = p.keterangan || {}; b.tingkat = p.tingkat || {}; b.catatan = p.catatan || '';
    b.foto = p.foto || ''; b.ttd = { driver: p.ttdDriver || '' }; b.cid = p.cid; b.disentuh = true;
    F = b; DIPULIHKAN = 0; KABAR = null; pesanForm = x.pesan ? 'Ditolak: ' + x.pesan : ''; Q = Q.filter(function (y) { return y.cid !== cid; }); TAB = 'isi';
    simpanAntre(); simpanDraf(); gambar(); if (CTX && CTX.perbarui) CTX.perbarui();
  }
  function duaKali(k) { var kini = Date.now(), lalu = SIAP2X[k] || 0; if (lalu && kini - lalu > 450 && kini - lalu < 4000) { delete SIAP2X[k]; return true; } if (!lalu || kini - lalu >= 4000) SIAP2X[k] = kini; return false; }

  function klik(e) {
    var b = e.target.closest ? e.target.closest('[data-a]') : null; if (!b || b.disabled) return;
    var a = b.getAttribute('data-a'), i = a.indexOf(':'), n = i < 0 ? a : a.slice(0, i), v = i < 0 ? '' : a.slice(i + 1);
    if (n === 'kembali') { tutup(); return; }
    if (n === 'lama') { if (CTX && CTX.bukaWeb) CTX.bukaWeb(K.DASH + '?mode=p2hharian'); return; }
    if (n === 'tab') { bacaIsian(); TAB = v; if (v === 'hari' && !RIW) muatRiw(); gambar(); var g = el.querySelector('.ksnIsi'); if (g) g.scrollTop = 0; return; }
    if (n === 'muatRiw') { RIW = null; muatRiw(); gambar(); return; }
    if (n === 'muatSetup') { muatSetup(); return; }
    if (n === 'kirimKini') { var x = Q.filter(function (y) { return y.cid === v; })[0]; if (!x) return; if (!daring()) { roti('Belum ada sinyal.'); return; } if (sedangKirim) { roti('Masih mengirim P2H lain, tunggu sebentar.'); return; } x.st = 'tunggu'; kirim(x); return; }
    if (n === 'bukaLagi') { bukaLagi(v); return; }
    if (n === 'buang') { if (!duaKali('buang:' + v)) { gambar(); return; } Q = Q.filter(function (y) { return y.cid !== v; }); if (KABAR && KABAR.cid === v) KABAR = null; simpanAntre(); gambar(); if (CTX && CTX.perbarui) CTX.perbarui(); return; }
    if (!F) return;
    F.disentuh = true;
    if (n === 'armada') { bacaIsian(); if (F.armada !== v) { F.armada = v; F.lambung = ''; STATUS = null; } msg(''); simpanDraf(); gambar(); return; }
    if (n === 'shift') { F.shift = v; Array.prototype.forEach.call(b.parentNode.children, function (c) { c.classList.toggle('on', c === b); }); simpanDraf(); return; }
    if (n === 'semuaBaik') { itemList().forEach(function (it, k) { if (F.jawab[it.n] !== 'TIDAK BAIK') setJawab(k, 'BAIK'); }); segarHasil(); msg(''); simpanDraf(); getar(); return; }
    if (n === 'jw') { var p = v.split(':'); setJawab(+p[0], p[1] === 'B' ? 'BAIK' : 'TIDAK BAIK'); segarHasil(); msg(''); simpanDraf(); if (p[1] === 'T') { var inp = el.querySelector('[data-ket="' + p[0] + '"]'); if (inp) try { inp.focus({ preventScroll: true }); } catch (e2) { /* */ } } return; }
    if (n === 'tk') { var q = v.split(':'), it = itemList()[+q[0]]; if (!it) return; F.tingkat[it.n] = q[1]; var w = b.parentNode; w.querySelector('.r').classList.toggle('on', q[1] === 'RINGAN'); w.querySelector('.br').classList.toggle('on', q[1] === 'BERAT'); segarHasil(); simpanDraf(); return; }
    if (n === 'foto') { var f = el.querySelector(v === 'kamera' ? '#p2aFileKam' : '#p2aFileGal'); if (f) f.click(); return; }
    if (n === 'fotoHapus') { bacaIsian(); F.foto = ''; gambar(); return; }
    if (n === 'ttdHapus') { F.ttd[v] = ''; bacaIsian(); simpanDraf(); gambar(); return; }
    if (n === 'kosongkan') { if (!duaKali('kosongkan')) { b.textContent = 'Tekan sekali lagi'; b.classList.add('siap'); return; } F = formBaru(); DIPULIHKAN = 0; STATUS = null; pesanForm = ''; buangDraf(); gambar(); return; }
    if (n === 'kirim') { kirimForm(b); return; }
  }
  function ketik(e) {
    var t = e.target; if (!F || !t || !t.getAttribute) return;
    if (t.hasAttribute('data-ket')) { var it = itemList()[+t.getAttribute('data-ket')]; if (it) { F.ket[it.n] = t.value; F.disentuh = true; simpanDraf(); } return; }
    var f = t.getAttribute('data-f'); if (f === 'catatan' || ((f === 'driver' || f === 'pengawas') && t.tagName === 'INPUT')) { F[f] = t.value; F.disentuh = true; simpanDraf(); }
  }
  function ubah(e) {
    var t = e.target; if (!t) return;
    if (t.id === 'p2aFileKam' || t.id === 'p2aFileGal') { bacaFoto(t); return; }
    if (!F || t.tagName !== 'SELECT') return;
    var f = t.getAttribute('data-f'); F[f] = t.value; F.disentuh = true; msg('');
    if (f === 'lambung') cekStatus();
    simpanDraf();
  }

  /* ---------- data server ---------- */
  function terimaSetup(h) {
    SETUP = h; galatSetup = ''; MATI = '';
    var s = h.saya || {};
    if (F && !F.disentuh && !adaIsi(F)) F = formBaru();
    else if (F) F.driver = s.nama || F.driver;
  }
  function muatSetup() {
    if (memuatSetup) return; memuatSetup = true; var u0 = urut;
    panggil('setup', {}, 30000).then(function (h) {
      memuatSetup = false; if (u0 !== urut) return;
      if (h && h.ok) { terimaSetup(h); API.Simpan.taruh(kunci('Setup'), JSON.stringify(h)); if (el) { gambar(); if (F && F.lambung && !STATUS) cekStatus(); } return; }
      if (h && h.login === false) { if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (h && h.mati) { MATI = h.pesan || 'P2H lewat tablet GASPOL dulu.'; if (el) gambar(); return; }
      galatSetup = (h && h.pesan) || 'Server menolak.'; if (el) gambar();
    }, function (e) { memuatSetup = false; if (u0 !== urut) return; galatSetup = daring() ? String((e && e.message) || 'Gagal memuat.') : 'Tidak ada sinyal.'; if (el && !SETUP) gambar(); });
  }
  function muatRiw() {
    if (memuatRiw) return; memuatRiw = true; galatRiw = ''; var u0 = urut;
    panggil('riwayat', { hari: 1 }, 30000).then(function (h) {
      memuatRiw = false; if (u0 !== urut) return;
      if (h && h.ok) RIW = h; else if (h && h.login === false) { if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return; } else galatRiw = (h && h.pesan) || 'Server menolak.';
      if (el && TAB === 'hari') gambar();
    }, function (e) { memuatRiw = false; if (u0 !== urut) return; galatRiw = daring() ? String((e && e.message) || 'Gagal memuat.') : 'Tidak ada sinyal. Daftar ini butuh sinyal.'; if (el && TAB === 'hari') gambar(); });
  }

  function buka(ctx) {
    CTX = ctx; var S = sesi(); if (!S) return; S_AKHIR = S;
    TAB = 'isi'; KABAR = null; pesanForm = ''; RIW = null; galatRiw = ''; STATUS = null; urut++;
    var u0 = urut;
    if (saya().g !== 'driver') { TAB = 'hari'; gambar(); muatRiw(); return; } /* lihat saja: langsung daftar hari ini */
    gambar();
    (siapkanAntre(S) || Promise.resolve()).then(function () { return API.Simpan.ambil(kunci('Setup')); }).then(function (v) {
      if (u0 !== urut) return;
      if (!SETUP) { try { var o = JSON.parse(v || 'null'); if (o && o.ok && o.items) SETUP = o; } catch (e) { /* */ } }
      return F ? null : muatDraf();
    }).then(function () {
      if (u0 !== urut) return;
      if (!F) F = formBaru();
      gambar(); muatSetup(); if (F.lambung) cekStatus();
    });
  }
  function tutup() {
    if (!el) return; bacaIsian(); if (F && adaIsi(F)) simpanDraf();
    var d = el; el = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); urut++;
    if (CTX && CTX.perbarui) CTX.perbarui();
  }
  function kembali() { if (!el) return false; tutup(); return true; }
  /** Keluar / ganti akun: buang isi memori. Antrean & draf di penyimpanan HP TETAP (per akun) dan lanjut dikirim saat akun itu masuk lagi. */
  function lupakan() {
    urut++; clearTimeout(tPompa); clearTimeout(tDraf); tPompa = null; CTX = null; S_AKHIR = null; SETUP = null; F = null; Q = []; Q_UID = ''; Q_SIAP = false; RIW = null; STATUS = null; KABAR = null; MATI = ''; TTD = {}; sedangKirim = false; DIPULIHKAN = 0;
    if (el) { try { el.remove(); } catch (e) { /* */ } el = null; }
  }

  window.WHL_P2H = { boleh: boleh, buka: buka, kembali: kembali, lupakan: lupakan, antre: antre, judul: judul,
    _uji: { form: function () { return F; }, antrean: function () { return Q; }, setup: function () { return SETUP; }, kabar: function () { return KABAR; }, pompa: pompa, jeda: function (a) { JEDA = a; }, hariTambangHp: hariTambangHp, hasil: function () { return hasilKini(); },
      mundurkan: function (cid, ms) { Q.forEach(function (x) { if (x.cid === cid) { x.t -= ms; x.hariHp = hariTambangHp(x.t); } }); return simpanAntre(); } } };
})();
