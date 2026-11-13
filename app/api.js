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
  function rpc(url, api, fn, args, ms) {
    return denganBatas(fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ api: api, fn: fn, args: args || [] }), redirect: 'follow', cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (b) { if (!b || !b.ok) throw new Error((b && (b.pesan || b.error)) || 'Server menolak'); return b.hasil || {}; }), ms || 45000);
  }
  function ambilJson(url, ms) {
    return denganBatas(fetch(url, { redirect: 'follow', cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }), ms || 60000);
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
      return ambilJson(K.INPUTDO + '?mode=profiljson&panduan=0&id=' + encodeURIComponent(k), 90000).then(function (d) {
        if (!d || !d.ok) throw new Error((d && d.error) || 'Profil belum tersedia');
        profilSimpan[k] = { t: Date.now(), d: d }; return d;
      });
    }
  };

  /* ---------- Pusat WHL (ASLI kalau server sudah punya api "pusat", kalau belum: TIRUAN) ---------- */
  var pusatAsli = null, pusatFn = []; // null = belum dicek; pusatFn = daftar fungsi dari pusatPing
  var Pusat = {
    /** true = api pusat tersedia di server. Dicek sekali tiap app dibuka. Tidak mengirim data apa pun. */
    deteksi: function () {
      if (pusatAsli !== null) return Promise.resolve(pusatAsli);
      /* API pusat LIVE sejak DASHBOARD V478 (12 Nov 2026). Data contoh HANYA kalau server menjawab jelas bahwa pintunya tidak ada;
         kalau cuma jaringan putus / lambat, tetap dianggap asli (panggilan berikutnya akan memberi pesan koneksi yang jelas). */
      return rpc(K.DASH, 'pusat', 'pusatPing', [], 20000).then(function (h) { pusatAsli = !!(h && h.api === 'pusat'); pusatFn = (h && h.fn) || []; return pusatAsli; }, function (e) { pusatAsli = !/tidak dikenal|token/i.test(String(e && e.message)); return pusatAsli; });
    },
    /** v2.18: ping ulang (tiap app dibuka lagi / buka Akun) supaya fungsi server yang baru dideploy langsung kebaca.
        Gagal jaringan = daftar lama dipertahankan. */
    cekUlang: function () {
      return rpc(K.DASH, 'pusat', 'pusatPing', [], 20000).then(function (h) { if (h && h.api === 'pusat') { pusatAsli = true; pusatFn = h.fn || []; } return pusatAsli; }, function () { return pusatAsli; });
    },
    asli: function () { return pusatAsli === true; },
    punya: function (fn) { return pusatFn.indexOf(fn) >= 0; }, /* mis. punya('pusatForumToken') = forum sudah dipasang di server */
    cekKartu: function (id) { return rpc(K.DASH, 'pusat', 'pusatCekKartu', [id]); },
    login: function (id, pin) { return rpc(K.DASH, 'pusat', 'pusatLogin', [id, pin]); },
    forumToken: function (sesi) { return rpc(K.DASH, 'pusat', 'pusatForumToken', [sesi.tokenPusat]); }, /* forum-12nov: custom token Firebase */
    /* notif-push-13nov: daftarkan token FCM HP ini + minta server kirim notifikasi forum (server memeriksa pesan di Firestore dulu) */
    daftarPerangkat: function (sesi, fcm, platform) { return rpc(K.DASH, 'pusat', 'pusatDaftarPerangkat', [sesi.tokenPusat, fcm, platform]); },
    forumNotif: function (sesi, ruang, pesanId, jenis) { return rpc(K.DASH, 'pusat', 'pusatForumNotif', [sesi.tokenPusat, ruang, pesanId, jenis || 'pesan']); },
    gantiPin: function (token, lama, baru) { return rpc(K.DASH, 'pusat', 'pusatGantiPin', [token, lama, baru]); },
    ringkasan: function (sesi, bagian, paksa) {
      if (pusatAsli) return rpc(K.DASH, 'pusat', 'ringkasanPusat', [bagian, !!paksa, '', sesi.tokenPusat], 90000);
      return new Promise(function (ok) { setTimeout(function () { ok(T.ringkasan(bagian, sesi.user)); }, 250); });
    },
    /* v2.6 (Reza): app TIDAK menampilkan riwayat/rekap absensi siapa pun -> pusatAbsenRiwayat & pusatAbsenHariIni tidak pernah dipanggil dari app. */
  };

  window.WHL_API = { Simpan: Simpan, Absen: Absen, Kpi: Kpi, Profil: Profil, Pusat: Pusat };
})();
