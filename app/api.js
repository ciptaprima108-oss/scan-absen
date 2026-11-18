/* Lapisan data WHL App v2: penyimpanan sesi (native) + panggilan API Apps Script.
 *   Simpan   : Capacitor Preferences (Android SharedPreferences / iOS UserDefaults; tidak hilang saat app ditutup).
 *              Yang disimpan cuma TOKEN sesi + info tampil. PIN tidak pernah disimpan.
 *   Absen    : API "abm" Absensi Tambang (ASLI, sudah live).
 *   Profil   : JSON ?mode=profiljson Input DO V257 (ASLI): foto, predikat, lencana, pencapaian, aktivitas, KPI (staf & driver).
 *   Kpi      : JSON ?mode=kpi Input DO (ASLI) — cadangan kalau profil gagal dimuat.
 *   Pusat    : API "pusat" DASHBOARD (ASLI, live V478): login semua karyawan, ringkasan per peran, unit, ganti PIN (riwayat absensi sengaja TIDAK dipakai app).
 *              Data tiruan (tiruan.js) cuma cadangan kalau server menjawab pintu itu tidak ada (mis. versi lama dikembalikan).
 */
(function () {
  'use strict';
  var K = window.WHL_KONFIG, T = window.WHL_TIRUAN;

  /* ---------- penyimpanan ---------- */
  function plugin() { try { var c = window.Capacitor; return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.Preferences ? c.Plugins.Preferences : null; } catch (e) { return null; } }
  var Simpan = {
    ambil: function (k) {
      var p = plugin();
      if (p) return p.get({ key: k }).then(function (r) { return r && r.value != null ? r.value : ''; }, function () { return ''; });
      try { return Promise.resolve(localStorage.getItem(k) || ''); } catch (e) { return Promise.resolve(''); }
    },
    taruh: function (k, v) {
      var p = plugin();
      if (p) return (v == null ? p.remove({ key: k }) : p.set({ key: k, value: String(v) })).then(function () { }, function () { });
      try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, String(v)); } catch (e) { /* */ }
      return Promise.resolve();
    },
    native: function () { return !!plugin(); }
  };

  /* ---------- jaringan ---------- */
  function denganBatas(janji, ms) {
    return new Promise(function (ok, gagal) {
      var t = setTimeout(function () { gagal(new Error('Server lama menjawab. Cek sinyal, coba lagi.')); }, ms);
      janji.then(function (v) { clearTimeout(t); ok(v); }, function (e) { clearTimeout(t); gagal(e); });
    });
  }
  /** Pola yang sama dengan brf/abm: POST text/plain {api, fn, args} -> {ok, hasil} */
  /* v3.20 perf-dashboard-16nov (audit bug #1): RPC BACA ke api pusat dibagi pakai. Panggilan sama (fn + argumen) yang sedang jalan = ikut menunggu
     janji yang sama; hasil disimpan 20 dtk (ringkasanPusat cuma berbagi yang sedang jalan). RPC tulis (ajukan/putus/batal/...) membuang simpanan.
     Hitungan RPC: window.WHL_RPC_LOG (uji / ukur jumlah panggilan saat buka app). */
  var BACA = /^(pusatPing|pusatGajiAkses|pusatIzinOpsi|pusatIzinSaya|pusatIzinAntre|pusatLemburStatus|pusatLemburSaya|pusatLemburAntre|pusatLemburRiwayat|pusatKpiSaya|pusatKasbonSaya|pusatKasbonOpsi|pusatNotaSaya|pusatNotaOpsi|ringkasanPusat|pusatKasbonDokumen|pusatGajiDriver|pusatIzinCek)$/;
  var BOLEH_SIMPAN = /^(pusatGajiAkses|pusatIzinOpsi|pusatIzinSaya|pusatLemburStatus|pusatKpiSaya)$/, MEMO = {}, MEMO_MS = 20000, BERANDA = null; /* yang lain: cuma berbagi panggilan yang sedang jalan */
  window.WHL_RPC_LOG = window.WHL_RPC_LOG || [];
  function rpc(url, api, fn, args, ms) {
    if (api !== 'pusat') return rpcJaringan(url, api, fn, args, ms);
    if (!BACA.test(fn)) { if (/Ajukan|Putus|Batal|Simpan|Hapus|Ganti|Selesai|Ubah/.test(fn)) MEMO = {}; return rpcJaringan(url, api, fn, args, ms); }
    var kunci = fn + '|' + JSON.stringify(args || []), m = MEMO[kunci], kini = Date.now();
    if (m && (m.jalan || ((m.isi || BOLEH_SIMPAN.test(fn)) && kini - m.t < MEMO_MS))) return m.janji;
    var tunggu = BERANDA && fn !== 'pusatBeranda' ? BERANDA.then(function () { return null; }, function () { return null; }) : null;
    var janji = (tunggu || Promise.resolve()).then(function () {
      var m2 = MEMO[kunci]; if (m2 && m2.isi && Date.now() - m2.t < MEMO_MS) return m2.janji; /* sudah diisi pusatBeranda */
      /* kontrak perf-dashboard-16nov: server sibuk (level atas = error, atau hasil.sibuk) -> RPC baca coba ulang 1x sesudah 2,5 dtk */
      var ulang = function () { return new Promise(function (ok) { setTimeout(ok, 2500); }).then(function () { return rpcJaringan(url, api, fn, args, ms); }); };
      return rpcJaringan(url, api, fn, args, ms).then(function (h) { return h && h.sibuk ? ulang() : h; }, function (e) { if (!/sibuk/i.test(String(e && e.message))) throw e; return ulang(); });
    });
    var rek = { janji: janji, jalan: true, t: kini }; MEMO[kunci] = rek;
    janji.then(function (h) { rek.jalan = false; rek.t = Date.now(); if (h && (h.sibuk || h.ok === false) && MEMO[kunci] === rek) delete MEMO[kunci]; /* jawaban gagal / sibuk tidak disimpan */ }, function () { if (MEMO[kunci] === rek) delete MEMO[kunci]; });
    return janji;
  }
  /** isi simpanan dari hasil pusatBeranda (1 eksekusi server menggantikan beberapa RPC baca) */
  function isiMemo(fn, args, hasil) { if (hasil == null) return; MEMO[fn + '|' + JSON.stringify(args || [])] = { janji: Promise.resolve(hasil), jalan: false, isi: true, t: Date.now() }; }
  function rpcJaringan(url, api, fn, args, ms) {
    window.WHL_RPC_LOG.push({ fn: fn, t: Date.now() });
    return denganBatas(fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ api: api, fn: fn, args: args || [] }), redirect: 'follow', cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (b) { if (!b || !b.ok) throw new Error(rapiPesan((b && (b.pesan || b.error)) || 'Server menolak')); var h = b.hasil || {}; if (h && typeof h.pesan === 'string') h.pesan = rapiPesan(h.pesan); return h; }), ms || 25000); /* v3.9.2: 45 -> 25 dtk (4G lemah: jangan menunggu lama tanpa kabar) */
  }
  /** v3.20 (audit bug #10): pesan kunci server berbahasa Inggris -> bahasa kita */
  function rapiPesan(t) { t = String(t == null ? '' : t); return /lock timeout|another process was holding the lock|too many simultaneous invocations|Service invoked too many times/i.test(t) ? 'Server sedang sibuk, coba lagi sebentar (± 1 menit).' : t; }
  function ambilJson(url, ms) {
    return denganBatas(fetch(url, { redirect: 'follow', cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }), ms || 30000);
  }
  function perangkat() { var u = navigator.userAgent; return /iPhone|iPad/.test(u) ? 'iphone' : /Android/.test(u) ? 'android' : 'lain'; }

  /* ---------- Absen mandiri (ASLI) ---------- */
  var Absen = {
    login: function (id, pin) { return rpc(K.ABSEN, 'abm', 'abmLogin', [id, pin, perangkat()]); },
    status: function (token) { return rpc(K.ABSEN, 'abm', 'abmStatus', [token]); },
    keluar: function (token) { return rpc(K.ABSEN, 'abm', 'abmKeluar', [token]).catch(function () { }); }
  };

  /* ---------- KPI (ASLI) ---------- */
  var kpiSimpan = null;
  var Kpi = {
    /* v3.6 (audit T3): KPI & 5 aspek MILIK SENDIRI lewat DASHBOARD (token dicek server). ?mode=kpi / profiljson lama = cadangan saja. */
    saya: function (sesi) { return rpc(K.DASH, 'pusat', 'pusatKpiSaya', [sesi.tokenPusat], 30000); },
    semua: function (paksa) {
      if (kpiSimpan && !paksa && Date.now() - kpiSimpan.t < 20 * 60000) return Promise.resolve(kpiSimpan.d);
      return ambilJson(K.INPUTDO + '?mode=kpi').then(function (d) { if (!d || !d.ok) throw new Error((d && d.error) || 'KPI belum tersedia'); kpiSimpan = { t: Date.now(), d: d }; return d; });
    },
    /** Cari KPI satu orang: cocokkan nomor kartu yang diketik saat login, cadangan nama. */
    untuk: function (idKetik, nama, paksa) {
      var kunci = function (s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); };
      return Kpi.semua(paksa).then(function (d) {
        var a = kunci(idKetik), n = kunci(nama);
        var s = (d.staf || []).filter(function (x) { return kunci(x.nik) === a; })[0] || (d.staf || []).filter(function (x) { return n && kunci(x.nama) === n; })[0] || null;
        return { bulan: d.bulan, dibuat: d.dibuat, persenBulan: d.persenBulan, kategori: d.kategori, staf: s };
      });
    }
  };

  /* ---------- Profil (ASLI): Input DO ?mode=profiljson (V257) — staf & driver, sudah berisi KPI ---------- */
  var profilSimpan = {};
  var Profil = {
    ambil: function (id, paksa) {
      var k = String(id || '').toUpperCase();
      if (profilSimpan[k] && !paksa && Date.now() - profilSimpan[k].t < 10 * 60000) return Promise.resolve(profilSimpan[k].d);
      return ambilJson(K.INPUTDO + '?mode=profiljson&panduan=0&id=' + encodeURIComponent(k), 40000).then(function (d) {
        if (!d || !d.ok) throw new Error((d && d.error) || 'Profil belum tersedia');
        profilSimpan[k] = { t: Date.now(), d: d }; return d;
      });
    }
  };

  /* ---------- Pusat WHL (ASLI kalau server sudah punya api "pusat", kalau belum: TIRUAN) ---------- */
  var pusatAsli = null, pusatFn = [], cekJalan = null, cekTerakhir = 0; // null = belum dicek; pusatFn = daftar fungsi dari pusatPing
  var Pusat = {
    /** true = api pusat tersedia di server. Dicek sekali tiap app dibuka. Tidak mengirim data apa pun. */
    deteksi: function () {
      if (pusatAsli !== null) return Promise.resolve(pusatAsli);
      /* v3.9.2: pakai daftar fungsi server dari pemeriksaan terakhir (disimpan di HP) supaya app langsung terbuka; diperiksa ulang di belakang.
         Dulu: ping gagal di 4G lemah -> daftar fungsi kosong -> forum dianggap "belum disiapkan" sampai app ditutup (tombol Kelola banner hilang). */
      return Simpan.ambil('whlV2Ping').then(function (v) {
        var c = null; try { c = JSON.parse(v || 'null'); } catch (e) { c = null; }
        if (c && Array.isArray(c.fn) && c.fn.length) { pusatAsli = true; pusatFn = c.fn; setTimeout(function () { Pusat.cekUlang(true); }, 1500); return true; } /* ping di belakang sekali (ditunda 1,5 dtk: kalau pusatBeranda jalan, balasannya sudah memuat fn -> ping dilewati); pasangPush tidak ping lagi (< 5 mnt) */
        return Pusat.deteksiJaringan();
      });
    },
    deteksiJaringan: function () {
      /* API pusat LIVE sejak DASHBOARD V478 (12 Nov 2026). Data contoh HANYA kalau server menjawab jelas bahwa pintunya tidak ada;
         kalau cuma jaringan putus / lambat, tetap dianggap asli (panggilan berikutnya akan memberi pesan koneksi yang jelas). */
      return rpc(K.DASH, 'pusat', 'pusatPing', [], 15000).then(function (h) { pusatAsli = !!(h && h.api === 'pusat'); pusatFn = (h && h.fn) || []; if (pusatAsli) cekTerakhir = Date.now(); if (pusatAsli) Simpan.taruh('whlV2Ping', JSON.stringify({ fn: pusatFn, t: Date.now() })); return pusatAsli; }, function (e) { pusatAsli = !/tidak dikenal|token/i.test(String(e && e.message)); return pusatAsli; });
    },
    /** v2.18: ping ulang (tiap app dibuka lagi / buka Akun) supaya fungsi server yang baru dideploy langsung kebaca.
        Gagal jaringan = daftar lama dipertahankan. */
    /* v3.20 (audit bug #1): ping yang sedang jalan dipakai bersama; ping sukses < 5 mnt lalu = tidak ping lagi (kecuali paksa);
       saatBerubah() HANYA kalau daftar fungsi server berubah (dulu tiap ping sukses -> gajiAkses/izin/lembur dimuat ulang 2-3x). */
    cekUlang: function (paksa, batas) { /* v3.38: batas = batas waktu ping (ms), bawaan 15 dtk */
      if (cekJalan) return cekJalan;
      if (BERANDA) { var bb = BERANDA; return bb.then(function () { return Pusat.cekUlang(paksa); }); } /* tunggu pusatBeranda (balasannya memuat fn = ping) */
      if (pusatAsli === true && Date.now() - cekTerakhir < (paksa ? 15000 : 5 * 60000)) return Promise.resolve(pusatAsli);
      var lama = pusatFn.slice().sort().join(',');
      cekJalan = rpc(K.DASH, 'pusat', 'pusatPing', [], batas || 15000).then(function (h) {
        cekJalan = null;
        if (h && h.api === 'pusat') { pusatAsli = true; pusatFn = h.fn || []; cekTerakhir = Date.now(); Simpan.taruh('whlV2Ping', JSON.stringify({ fn: pusatFn, t: Date.now() })); if (pusatFn.slice().sort().join(',') !== lama && Pusat.saatBerubah) Pusat.saatBerubah(); }
        return pusatAsli;
      }, function () { cekJalan = null; return pusatAsli; });
      return cekJalan;
    },
    /** v3.20: 1 RPC gabungan pusatBeranda (kontrak Vanesa perf-dashboard-16nov) mengisi simpanan RPC baca yang biasa dipanggil saat buka app.
        Server belum punya = tidak melakukan apa-apa (cara lama). */
    beranda: function (sesi) {
      if (!sesi || !sesi.tokenPusat || !Pusat.punya('pusatBeranda')) return Promise.resolve(null);
      var t = sesi.tokenPusat;
      BERANDA = rpc(K.DASH, 'pusat', 'pusatBeranda', [t], 30000).then(function (h) {
        if (!h || h.ok === false) return h;
        if (Array.isArray(h.fn) && h.fn.length) { var lama = pusatFn.slice().sort().join(','); pusatFn = h.fn; cekTerakhir = Date.now(); Simpan.taruh('whlV2Ping', JSON.stringify({ fn: pusatFn, t: Date.now() })); if (lama && pusatFn.slice().sort().join(',') !== lama && Pusat.saatBerubah) setTimeout(Pusat.saatBerubah, 0); }
        var P = { gajiAkses: 'pusatGajiAkses', izinOpsi: 'pusatIzinOpsi', izinSaya: 'pusatIzinSaya', lemburStatus: 'pusatLemburStatus', kpi: 'pusatKpiSaya', kpiSaya: 'pusatKpiSaya' };
        Object.keys(P).forEach(function (k) { if (h[k] && typeof h[k] === 'object' && !h[k].sibuk) isiMemo(P[k], [t], h[k]); });
        if (h.ringkasan && h.ringkasanBagian) isiMemo('ringkasanPusat', [h.ringkasanBagian, false, '', t], h.ringkasan);
        return h;
      }, function () { return null; });
      var b = BERANDA; b.then(function () { if (BERANDA === b) BERANDA = null; });
      return b;
    },
    lupakanSimpanan: function () { MEMO = {}; },
    asli: function () { return pusatAsli === true; },
    punya: function (fn) { return pusatFn.indexOf(fn) >= 0; },
    baruDicek: function (ms) { return cekTerakhir > 0 && Date.now() - cekTerakhir < (ms || 60000); }, /* v3.38: daftar fungsi baru saja terbaca dari server (bukan simpanan HP) */
    dikenal: function () { return pusatFn.length > 0; }, /* v3.9.2: false = daftar fungsi server belum pernah terbaca (ping gagal), bukan berarti fitur tidak ada */ /* mis. punya('pusatForumToken') = forum sudah dipasang di server */
    cekKartu: function (id) { return rpc(K.DASH, 'pusat', 'pusatCekKartu', [id]); },
    login: function (id, pin) { return rpc(K.DASH, 'pusat', 'pusatLogin', [id, pin]); },
    forumToken: function (sesi) { return rpc(K.DASH, 'pusat', 'pusatForumToken', [sesi.tokenPusat], 20000); }, /* forum-12nov: custom token Firebase */
    /* notif-push-13nov: daftarkan token FCM HP ini + minta server kirim notifikasi forum (server memeriksa pesan di Firestore dulu) */
    daftarPerangkat: function (sesi, fcm, platform) { return rpc(K.DASH, 'pusat', 'pusatDaftarPerangkat', [sesi.tokenPusat, fcm, platform]); },
    lepasPerangkat: function (sesi, fcm) { return rpc(K.DASH, 'pusat', 'pusatLepasPerangkat', [sesi.tokenPusat, fcm]); }, /* v3.6 (audit T5): spesifikasi server di ENDPOINT-DIBUTUHKAN.txt H */
    forumNotif: function (sesi, ruang, pesanId, jenis) { return rpc(K.DASH, 'pusat', 'pusatForumNotif', [sesi.tokenPusat, ruang, pesanId, jenis || 'pesan']); },
    /* v3.10 NOTA bengkel pengawas (kontrak Dodi 14 Nov, DASHBOARD api pusat) */
    notaOpsi: function (sesi) { return rpc(K.DASH, 'pusat', 'pusatNotaOpsi', [sesi.tokenPusat], 25000); },
    notaAjukan: function (sesi, d) { return rpc(K.DASH, 'pusat', 'pusatNotaAjukan', [sesi.tokenPusat, d], K.BATAS_NOTA || 90000); }, /* BATAS_NOTA hanya diubah uji otomatis */ /* foto s/d 9 x 300 KB: 4G lemah butuh waktu */
    notaSaya: function (sesi) { return rpc(K.DASH, 'pusat', 'pusatNotaSaya', [sesi.tokenPusat], 25000); },
    /* v3.11: banyak nota sekali kirim + video perbaikan per potongan 4 MB */
    notaAjukanBanyak: function (sesi, d) { return rpc(K.DASH, 'pusat', 'pusatNotaAjukanBanyak', [sesi.tokenPusat, d], K.BATAS_NOTA || 120000); },
    notaVideoMulai: function (sesi, x) { return rpc(K.DASH, 'pusat', 'pusatNotaVideoMulai', [sesi.tokenPusat, x], 25000); },
    notaVideoPotong: function (sesi, upId, ke, b64) { return rpc(K.DASH, 'pusat', 'pusatNotaVideoPotong', [sesi.tokenPusat, upId, ke, b64], K.BATAS_VIDEO || 120000); },
    notaVideoSelesai: function (sesi, upId) { return rpc(K.DASH, 'pusat', 'pusatNotaVideoSelesai', [sesi.tokenPusat, upId], 60000); },
    /* laba-pimpinan-15nov: Laba Unit khusus pimpinan/penuh (DASHBOARD LabaPusat.gs; server menolak peran lain). Baca pertama bisa 20-40 dtk. */
    labaUnit: function (sesi, dari, sampai, armada, paksa) { return rpc(K.DASH, 'pusat', 'pusatLabaUnit', [sesi.tokenPusat, dari || '', sampai || '', armada || 'SEMUA', !!paksa], K.BATAS_LABA || 90000); },
    /* gaji-driver-app-15nov (KONTRAK-APP.md Dodi): gaji driver admin/pimpinan/penuh/pengawas + ajuan kasbon & cicilan HP. Hitungan pertama bisa 20-40 dtk. */
    gajiAkses: function (sesi) { return rpc(K.DASH, 'pusat', 'pusatGajiAkses', [sesi.tokenPusat], 20000); }, /* v3.14 akses-gaji-15nov: flag menu (ringan) */
    gajiDriver: function (sesi, periode, paksa) { return rpc(K.DASH, 'pusat', 'pusatGajiDriver', [sesi.tokenPusat, periode || '', !!paksa], K.BATAS_GAJI || 90000); },
    kasbonOpsi: function (sesi) { return rpc(K.DASH, 'pusat', 'pusatKasbonOpsi', [sesi.tokenPusat], K.BATAS_GAJI || 90000); },
    kasbonAjukan: function (sesi, d) { return rpc(K.DASH, 'pusat', 'pusatKasbonAjukan', [sesi.tokenPusat, d], K.BATAS_NOTA || 90000); },
    kasbonSaya: function (sesi) { return rpc(K.DASH, 'pusat', 'pusatKasbonSaya', [sesi.tokenPusat], 30000); },
    kasbonPutus: function (sesi, id, keputusan, alasan) { return rpc(K.DASH, 'pusat', 'pusatKasbonPutus', [sesi.tokenPusat, id, keputusan, alasan || ''], 45000); },
    kasbonPdf: function (sesi, id) { return rpc(K.DASH, 'pusat', 'pusatKasbonPdf', [sesi.tokenPusat, id], 60000); },
    cicilanStafPdf: function (sesi, periode) { return rpc(K.DASH, 'pusat', 'pusatCicilanStafPdf', [sesi.tokenPusat, periode || ''], 90000); },
    /* v3.15 kasbon-ttd-impor-15nov: Dokumen kasbon & cicilan (admin / pimpinan / Fanza / Reza; hak dicek server) */
    kasbonDokumen: function (sesi, periode) { return rpc(K.DASH, 'pusat', 'pusatKasbonDokumen', [sesi.tokenPusat, periode || ''], K.BATAS_GAJI || 90000); },
    kasbonRekapPdf: function (sesi, periode) { return rpc(K.DASH, 'pusat', 'pusatKasbonRekapPdf', [sesi.tokenPusat, periode || ''], 90000); },
    /* v3.15: daftar fungsi server (salinan) + panggilan umum untuk fitur yang namanya baru ditentukan server (lembur.js) */
    daftar: function () { return pusatFn.slice(); },
    panggil: function (fn, args, ms) { return rpc(K.DASH, 'pusat', fn, args || [], ms || 30000); },
    gantiPin: function (token, lama, baru) { return rpc(K.DASH, 'pusat', 'pusatGantiPin', [token, lama, baru]); },
    ringkasan: function (sesi, bagian, paksa) {
      if (pusatAsli) return rpc(K.DASH, 'pusat', 'ringkasanPusat', [bagian, !!paksa, '', sesi.tokenPusat], 30000); /* v3.9.2: 90 -> 30 dtk; data lama tetap tampil dari cache */
      return new Promise(function (ok) { setTimeout(function () { ok(T.ringkasan(bagian, sesi.user)); }, 250); });
    },
    /* v2.6 (Reza): app TIDAK menampilkan riwayat/rekap absensi siapa pun -> pusatAbsenRiwayat & pusatAbsenHariIni tidak pernah dipanggil dari app. */
  };

  /* ---------- v3.20 (audit bug #4): buka PDF / berkas di DALAM app ----------
     Android APK: AndroidDownloader.simpanFile (seperti sebelumnya). iPhone app: plugin native WhlAsli.bukaBerkas (pratinjau QuickLook, ada tombol bagikan / simpan);
     plugin belum ada (app lama) atau app web di iPhone: lembar pratinjau di dalam app (iframe blob) + tombol Bagikan / Simpan (share sheet).
     Browser lain: tab baru; diblokir -> lembar pratinjau yang sama. Tidak lagi window.open(blob) di iOS (dulu jatuh ke aplikasi luar / layar putih). */
  function ios() { var u = navigator.userAgent || ''; return /iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1); }
  function asliIos() { try { var c = window.Capacitor; return !!(c && c.getPlatform && c.getPlatform() === 'ios' && c.Plugins && c.Plugins.WhlAsli); } catch (e) { return false; } }
  function keBlob(b64, mime) { var bin = atob(b64), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return new Blob([u8], { type: mime }); }
  var lembarPdf = null;
  function tutupLembarPdf() { if (!lembarPdf) return false; var l = lembarPdf; lembarPdf = null; try { URL.revokeObjectURL(l._url); } catch (e) { /* */ } l.remove(); return true; }
  function lembar(nama, blob) {
    tutupLembarPdf();
    var url = URL.createObjectURL(blob), pdf = /pdf/.test(blob.type), d = document.createElement('div');
    d.className = 'whlPdfLembar'; d._url = url;
    d.setAttribute('style', 'position:fixed;inset:0;z-index:10000;background:#1b2433;display:flex;flex-direction:column');
    var bisaBagi = false; try { bisaBagi = !!(navigator.canShare && navigator.canShare({ files: [new File([blob], nama, { type: blob.type })] })); } catch (e) { bisaBagi = false; }
    d.innerHTML = '<div style="display:flex;gap:8px;align-items:center;padding:calc(10px + env(safe-area-inset-top)) 12px 10px;background:#0f1a2e;color:#fff">'
      + '<button type="button" data-p="tutup" style="min-height:44px;min-width:76px;border-radius:12px;border:0;background:#fff;color:#0b1a3a;font-weight:800">Tutup</button>'
      + '<div class="whlPdfNm" style="flex:1;min-width:0;font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>'
      + '<button type="button" data-p="bagi" style="min-height:44px;border-radius:12px;border:0;background:#1565C0;color:#fff;font-weight:800;padding:0 14px">' + (bisaBagi ? 'Bagikan / Simpan' : 'Unduh') + '</button></div>'
      + (pdf ? '<iframe title="Dokumen" style="flex:1;border:0;width:100%;background:#fff"></iframe>' : '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#fff;padding:24px;text-align:center;font-size:14px;line-height:1.5">Berkas siap. Ketuk "' + (bisaBagi ? 'Bagikan / Simpan' : 'Unduh') + '" untuk menyimpan atau membuka di aplikasi lain.</div>');
    d.querySelector('.whlPdfNm').textContent = nama;
    if (pdf) d.querySelector('iframe').src = url;
    d.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-p]'); if (!b) return;
      if (b.getAttribute('data-p') === 'tutup') { tutupLembarPdf(); return; }
      if (bisaBagi) { navigator.share({ files: [new File([blob], nama, { type: blob.type })], title: nama }).catch(function () { }); return; }
      var a = document.createElement('a'); a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove();
    });
    document.body.appendChild(d); lembarPdf = d;
  }
  /** buka / simpan berkas base64 di dalam app. mime bawaan application/pdf. */
  function bukaBerkas(nama, b64, mime) {
    mime = mime || 'application/pdf'; nama = String(nama || 'dokumen.pdf');
    var a = window.AndroidDownloader;
    if (a && typeof a.simpanFile === 'function') { a.simpanFile(nama, b64, mime); return Promise.resolve('android'); }
    var cadangan = function () { try { var bl = keBlob(b64, mime); if (!ios()) { var u = URL.createObjectURL(bl), w = /pdf/.test(mime) ? window.open(u, '_blank') : null; if (w) { setTimeout(function () { URL.revokeObjectURL(u); }, 120000); return 'tab'; } if (!/pdf/.test(mime)) { var l = document.createElement('a'); l.href = u; l.download = nama; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 120000); return 'unduh'; } URL.revokeObjectURL(u); } lembar(nama, bl); return 'lembar'; } catch (e) { throw new Error('Berkas tidak bisa dibuka: ' + e.message); } };
    if (asliIos()) return window.Capacitor.Plugins.WhlAsli.bukaBerkas({ b64: b64, nama: nama, mime: mime }).then(function () { return 'ios'; }, function () { return cadangan(); }); /* app iPhone lama tanpa bukaBerkas -> lembar */
    try { return Promise.resolve(cadangan()); } catch (e) { return Promise.reject(e); }
  }
  window.WHL_BERKAS = { buka: bukaBerkas, tutup: tutupLembarPdf };

  window.WHL_API = { Simpan: Simpan, Absen: Absen, Kpi: Kpi, Profil: Profil, Pusat: Pusat };
})();
