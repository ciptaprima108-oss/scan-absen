/* WHL App v2.11 — FORUM WHL (chat ruang + foto + pesan suara), mesin Firebase (Firestore; Storage opsional).
 * Masuk TANPA akun baru: token Pusat (sudah login PIN) -> api "pusat" pusatForumToken -> custom token Firebase (klaim nrp, nama, peran, admin, ruang[]).
 * Aturan keamanan ada di server (Upgrade\forum-12nov\aturan\*.rules); app ini cuma klien.
 * Hemat kuota (paket gratis Spark): 1 pendengar ringan per ruang untuk lencana (hanya pesan sesudah terakhir dibaca), 30 pesan per halaman,
 *   foto/suara dibaca hanya saat ditampilkan/diputar, tanda dibaca ditulis paling sering 1x/20 dtk per ruang.
 */
(function () {
  'use strict';
  var KF = window.WHL_FORUM_KONFIG, R = window.WHL_RASA, API = window.WHL_API, Simpan = API.Simpan, K = window.WHL_KONFIG;
  var fb = null, db = null, st = null, auth = null, siapJanji = null, FV = null, TS = null;
  var CTX = null, INFO = null, RUANG = [], BARU = {}, BACA_SAYA = {}, AWAS = {}, CUPLIK = {}, KENAL = {}, mulaiMs = Date.now(), nadaTerakhir = 0;
  var lapisEl = null, aktif = '', LIVE = [], LAMA = [], habis = false, BACA = {}, SEMATAN = null, unsub = [], balasKe = null, MEDIA = {}, audioNow = null, REK = null, tulisBacaT = 0, gagalMasuk = null;
  var PERAN_NM = { pimpinan: 'Pimpinan', penuh: 'Akses penuh', pengawas: 'Pengawas', mekanik: 'Mekanik', admin: 'Admin', adminhse: 'Admin HR & HSE', hse: 'HSE', logistik: 'Logistik', fuelman: 'Fuelman', kreatif: 'Kreatif', driver: 'Driver' };
  var EMOJI = ['👍', '❤️', '😂', '😮', '🙏', '✅'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inisial(n) { var p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function pendek(n) { return String(n || '').trim().split(/\s+/).slice(0, 2).join(' '); }
  function warnaNama(uid) { var h = 0; for (var i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) % 360; return 'hsl(' + h + ',62%,38%)'; }
  function jam(ms) { var d = new Date(ms); return ('0' + d.getHours()).slice(-2) + '.' + ('0' + d.getMinutes()).slice(-2); }
  function hariTeks(ms) { var d = new Date(ms), k = new Date(), b = new Date(); b.setDate(k.getDate() - 1); if (d.toDateString() === k.toDateString()) return 'Hari ini'; if (d.toDateString() === b.toDateString()) return 'Kemarin'; return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }); }
  function durTeks(s) { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function hostEmu() { if (KF.emulator.host) return KF.emulator.host; var n = false; try { n = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform(); } catch (e) { /* */ } return n ? '10.0.2.2' : '127.0.0.1'; }
  function muatSkrip(src) { return new Promise(function (ok, gagal) { var ada = document.querySelector('script[src="' + src + '"]'); if (ada && (ada.dataset.siap || (src.indexOf('app-compat') > 0 && window.firebase))) return ok(); var s = document.createElement('script'); s.src = src; s.onload = function () { s.dataset.siap = '1'; ok(); }; s.onerror = function () { gagal(new Error('Pustaka forum gagal dimuat')); }; document.head.appendChild(s); }); }

  /* ---------- siapkan Firebase + masuk ---------- */
  function siapkan() {
    if (siapJanji) return siapJanji;
    var L = ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js'].concat(KF.media === 'storage' ? ['firebase-storage-compat.js'] : []);
    siapJanji = L.reduce(function (p, f) { return p.then(function () { return muatSkrip('lib/firebase/' + f); }); }, Promise.resolve()).then(function () {
      fb = window.firebase.initializeApp(KF.firebase, 'forum-whl'); auth = fb.auth(); db = fb.firestore(); FV = window.firebase.firestore.FieldValue; TS = window.firebase.firestore.Timestamp;
      db.settings({ experimentalAutoDetectLongPolling: true, merge: true });
      if (KF.mode === 'emulator') { var h = hostEmu(); auth.useEmulator('http://' + h + ':' + KF.emulator.auth, { disableWarnings: true }); db.useEmulator(h, KF.emulator.firestore); }
      else { try { db.enablePersistence({ synchronizeTabs: false }).catch(function () { }); } catch (e) { /* */ } } // cache di HP: buka ulang ruang tidak membaca ulang pesan lama (hemat kuota)
      if (KF.media === 'storage') { st = fb.storage(); if (KF.mode === 'emulator') st.useEmulator(hostEmu(), KF.emulator.storage); }
    });
    siapJanji.catch(function () { siapJanji = null; });
    return siapJanji;
  }
  var segarSesi = false;
  function masuk(paksa) {
    var kunci = String(CTX.sesi.idProfil || CTX.sesi.idKetik || '');
    return siapkan().then(function () { return new Promise(function (ok) { var u = auth.onAuthStateChanged(function (x) { u(); ok(x); }); }); }).then(function (user) {
      return Simpan.ambil('whlForumUntuk').then(function (untuk) {
        if (user && untuk === kunci && !paksa && segarSesi) return user; /* v3.6 (audit T5): token forum baru sekali tiap app dibuka -> peran/ruang/akun nonaktif ikut terbaru */
        return (user ? auth.signOut() : Promise.resolve()).then(function () { return API.Pusat.forumToken(CTX.sesi); }).then(function (h) {
          if (!h || !h.ok) { var e = new Error((h && h.pesan) || 'Forum belum bisa dibuka.'); e.ditolak = !!(h && h.ditolak); e.login = h && h.login; throw e; }
          return auth.signInWithCustomToken(h.token).then(function (c) { return Simpan.taruh('whlForumUntuk', kunci).then(function () { return c.user; }); });
        });
      });
    }).then(function (user) { return user.getIdTokenResult(); }).then(function (r) {
      segarSesi = true; var c = r.claims; INFO = { uid: auth.currentUser.uid, nama: c.nama, peran: c.peran, admin: c.admin === true, ruang: c.ruang || [] };
      RUANG = KF.ruang.filter(function (x) { return INFO.ruang.indexOf(x.id) >= 0; }); return INFO;
    });
  }

  /* ---------- lencana: pesan baru per ruang (sesudah terakhir dibaca di HP ini) ---------- */
  function awasi(r) {
    if (AWAS[r]) AWAS[r]();
    var sejak = TS.fromMillis(BACA_SAYA[r] || (Date.now() - 3 * 864e5));
    AWAS[r] = db.collection('ruang').doc(r).collection('pesan').where('waktu', '>', sejak).orderBy('waktu', 'desc').limit(21).onSnapshot(function (s) {
      var n = 0, atas = null;
      s.forEach(function (d) { var x = d.data({ serverTimestamps: 'estimate' }); if (x.uid !== INFO.uid && !x.hapus) { n++; if (!atas) atas = x; } });
      BARU[r] = aktif === r ? 0 : n; if (atas) CUPLIK[r] = { nama: atas.nama, teks: cuplik(atas), waktu: atas.waktu ? atas.waktu.toMillis() : Date.now() };
      s.docChanges().forEach(function (ch) {
        if (ch.type !== 'added' || ch.doc.metadata.hasPendingWrites) return; var x = ch.doc.data({ serverTimestamps: 'estimate' });
        if (x.uid === INFO.uid || x.hapus || !x.waktu || x.waktu.toMillis() < mulaiMs) return;
        var disebut = (x.sebut || []).indexOf(INFO.uid) >= 0, ruangNm = (KF.ruang.filter(function (q) { return q.id === r; })[0] || {}).nama || r;
        if (aktif === r && document.visibilityState === 'visible') return;
        if (Date.now() - nadaTerakhir > 4000) { nadaTerakhir = Date.now(); R.bunyi(disebut ? 'pengumumanWhl' : 'pesanWhl'); R.getar(disebut ? 'awas' : undefined); }
        if (CTX.roti) CTX.roti((disebut ? '@ Kamu disebut · ' : '💬 ') + ruangNm + ': ' + pendek(x.nama) + ' — ' + cuplik(x).slice(0, 60));
      });
      if (lapisEl && !aktif) gambarDaftar(); if (CTX.perbarui) CTX.perbarui();
    }, function () { });
  }
  function cuplik(x) { return x.hapus ? 'pesan dihapus' : x.jenis === 'foto' ? '📷 Foto' + (x.teks ? ': ' + x.teks : '') : x.jenis === 'suara' ? '🎤 Pesan suara ' + durTeks(x.media && x.media.dur) : String(x.teks || ''); }
  function totalBaru() { var n = 0; Object.keys(BARU).forEach(function (r) { n += BARU[r] || 0; }); return n; }

  /** Dipanggil app sesudah login (diam-diam). -> Promise<{ok, baru}> */
  function mulai(ctx) {
    CTX = ctx; gagalMasuk = null;
    if (!KF.aktif || !API.Pusat.asli() || !ctx.sesi.tokenPusat) { gagalMasuk = 'Forum butuh sambungan Pusat WHL.'; return Promise.resolve({ ok: false }); }
    if (!API.Pusat.punya('pusatForumToken')) { gagalMasuk = 'disiapkan'; return Promise.resolve({ ok: false, disiapkan: true }); } // server Pusat belum punya kunci masuk forum
    return Simpan.ambil('whlForumBaca').then(function (v) { try { BACA_SAYA = JSON.parse(v || '{}') || {}; } catch (e) { BACA_SAYA = {}; } return masuk(false); })
      .then(function () { RUANG.forEach(function (x) { awasi(x.id); }); return { ok: true }; }, function (e) { var siap = /belum disiapkan|kunci layanan/i.test(e.message); gagalMasuk = siap ? 'disiapkan' : e.message; return { ok: false, ditolak: e.ditolak, disiapkan: siap, pesan: e.message }; });
  }
  function keluar() { segarSesi = false; tutup(true); Object.keys(AWAS).forEach(function (r) { AWAS[r](); }); AWAS = {}; BARU = {}; INFO = null; if (auth) auth.signOut().catch(function () { }); Simpan.taruh('whlForumUntuk', null); }

  /* ---------- lapis ---------- */
  function lapis(html) {
    if (lapisEl) { lapisEl.innerHTML = html; return lapisEl; }
    var d = document.createElement('div'); d.className = 'lapis ksnLapis fmLapis'; d.innerHTML = html; document.body.appendChild(d); lapisEl = d; document.documentElement.classList.add('forum-buka'); /* v3.0: navigasi bawah tetap tampil */
    requestAnimationFrame(function () { d.classList.add('tampil'); });
    d.addEventListener('click', klik); d.addEventListener('input', ketik); d.addEventListener('change', pilihFile);
    return d;
  }
  function tutup(diam) { berhenti(); hentiRekam(false); document.documentElement.classList.remove('forum-buka'); if (!lapisEl) return; var d = lapisEl; lapisEl = null; aktif = ''; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, diam || R.hemat() ? 0 : 220); if (CTX && CTX.perbarui) CTX.perbarui(); }
  function berhenti() { unsub.forEach(function (f) { try { f(); } catch (e) { /* */ } }); unsub = []; if (audioNow) { audioNow.pause(); audioNow = null; } }
  function kepala(judul, sub, kembali, kanan, ava) { return '<div class="ksnKp' + (ava ? ' fmKp' : '') + '"><button type="button" class="kb" data-f="' + kembali + '" aria-label="Kembali">‹</button>' + (ava ? '<span class="fmAva">' + ava + '</span>' : '') + '<div class="nm">' + esc(sub) + '<b>' + esc(judul) + '</b></div>' + (kanan || '') + '</div>'; }
  function chipUji() { return KF.mode === 'emulator' ? '<span class="chip kuning" style="margin-left:auto;flex:none">MODE UJI</span>' : ''; }

  /* ---------- daftar ruang ---------- */
  function buka(ctx) {
    CTX = ctx || CTX; aktif = '';
    if (INFO) { gambarDaftar(); return; }
    lapis(kepala('Forum WHL', 'Menyambung...', 'tutup', chipUji()) + '<div class="ksnIsi">' + R.kerangka('daftar') + '</div>');
    mulai(CTX).then(function (h) {
      if (h.ok) gambarDaftar();
      else if (h.disiapkan) lapis(kepala('Forum WHL', 'Segera hadir', 'tutup') + '<div class="ksnIsi"><div class="kartu ksnTutup"><span>💬</span><b>Forum sedang disiapkan</b><small>Ruang obrolan, foto, dan pesan suara antar staf WHL sedang dipasang di server. Kalau sudah siap, menu ini langsung bisa dipakai tanpa memperbarui app.</small></div>'
        + '<div class="ksnInfo">Yang akan ada: ruang Umum + ruang per divisi, kirim foto & pesan suara, balas, reaksi, sebut @nama, pengumuman yang disematkan.</div></div>');
      else lapis(kepala('Forum WHL', 'Belum bisa dibuka', 'tutup', chipUji()) + '<div class="ksnIsi">' + R.kosong(h.ditolak ? 'Forum belum dibuka untuk peranmu' : 'Forum belum tersambung', h.pesan || gagalMasuk || '') + (h.ditolak ? '' : '<button type="button" class="tKecil" data-f="ulang" style="width:100%">Coba lagi</button>') + '</div>');
    });
  }
  function gambarDaftar() {
    var h = kepala('Forum WHL', pendek(INFO.nama) + ' · ' + (PERAN_NM[INFO.peran] || INFO.peran) + (INFO.admin ? ' · admin' : ''), 'tutup', chipUji()) + '<div class="ksnIsi">';
    if (KF.mode === 'emulator') h += '<div class="ksnInfo kuning">Mode uji: tersambung ke emulator di laptop (project <b>' + esc(KF.firebase.projectId) + '</b>), bukan server sungguhan.</div>';
    h += RUANG.map(function (x) {
      var n = BARU[x.id] || 0, c = CUPLIK[x.id];
      return '<button type="button" class="app fmR" data-ruang="' + x.id + '"><span class="ik">' + ikRuang(x) + '</span><span class="tx"><b>' + esc(x.nama) + '</b><small>' + (c ? esc(pendek(c.nama)) + ': ' + esc(c.teks).slice(0, 70) : esc(x.ket)) + '</small></span>' + (n ? '<span class="fmN">' + (n > 20 ? '20+' : n) + '</span>' : (c ? '<em class="fmJ">' + jam(c.waktu) + '</em>' : '')) + '</button>';
    }).join('');
    h += '<div class="app mati"><span class="ik">✉️</span><span class="tx"><b>Pesan langsung (1 lawan 1)</b><small>Ditunda, menyusul</small></span><span class="chip kuning">Segera</span></div>';
    h += '<div class="kecil" style="margin:10px 4px">Ruang yang tampil mengikuti peranmu di Pusat WHL. Pesan baru berbunyi saat app terbuka. Saat app ditutup, notifikasi muncul kalau Notifikasi langsung di Akun sudah Aktif.</div>';
    lapis(h + '</div>');
  }

  /* ---------- ruang obrolan ---------- */
  function bukaRuang(r) {
    berhenti(); aktif = r; LIVE = []; LAMA = []; habis = false; BACA = {}; SEMATAN = null; balasKe = null; BARU[r] = 0;
    var x = KF.ruang.filter(function (q) { return q.id === r; })[0];
    lapis(kepala(x.nama, x.ket, 'daftar', chipUji(), ikRuang(x)) + '<div class="fmSem" id="fmSem" hidden></div><div class="fmList" id="fmList"><div class="kosong"><span class="putar"></span> Memuat pesan...</div></div>' + penulis());
    var ref = db.collection('ruang').doc(r);
    unsub.push(ref.collection('pesan').orderBy('waktu', 'desc').limit(30).onSnapshot(function (s) {
      var bawah = dekatBawah(); LIVE = []; s.forEach(function (d) { LIVE.push(ubah(d)); });
      if (s.size < 30 && !LAMA.length) habis = true;
      gambarPesan(bawah || !s.docChanges().some(function (c) { return c.type === 'modified'; })); tandaiBaca(r);
    }, function (e) { var L = document.getElementById('fmList'); if (L) L.innerHTML = R.kosong('Pesan tidak bisa dimuat', e.message); }));
    unsub.push(ref.collection('baca').onSnapshot(function (s) { BACA = {}; s.forEach(function (d) { var b = d.data({ serverTimestamps: 'estimate' }); BACA[d.id] = b.waktu ? b.waktu.toMillis() : 0; KENAL[d.id] = b.nama; }); gambarPesan(false); }, function () { }));
    unsub.push(ref.onSnapshot(function (d) { SEMATAN = d.exists ? (d.data({ serverTimestamps: 'estimate' }).sematan || null) : null; gambarSematan(); }, function () { }));
    if (CTX.perbarui) CTX.perbarui();
  }
  function ubah(d) { var x = d.data({ serverTimestamps: 'estimate' }); x.id = d.id; x.ms = x.waktu ? x.waktu.toMillis() : Date.now(); x.tunda = d.metadata.hasPendingWrites; KENAL[x.uid] = x.nama; return x; }
  function tandaiBaca(r) {
    BACA_SAYA[r] = Date.now(); Simpan.taruh('whlForumBaca', JSON.stringify(BACA_SAYA));
    if (Date.now() - tulisBacaT < 20000) return; tulisBacaT = Date.now();
    db.collection('ruang').doc(r).collection('baca').doc(INFO.uid).set({ nama: INFO.nama, waktu: FV.serverTimestamp() }).catch(function () { });
    awasi(r);
  }
  function muatLama() {
    var semua = LAMA.concat(LIVE).sort(function (a, b) { return a.ms - b.ms; }), awal = semua[0]; if (!awal) return;
    var L = document.getElementById('fmList'), tinggi = L.scrollHeight;
    db.collection('ruang').doc(aktif).collection('pesan').orderBy('waktu', 'desc').startAfter(TS.fromMillis(awal.ms)).limit(30).get().then(function (s) {
      s.forEach(function (d) { LAMA.push(ubah(d)); }); if (s.size < 30) habis = true; gambarPesan(false); L.scrollTop = L.scrollHeight - tinggi;
    });
  }
  function dekatBawah() { var L = document.getElementById('fmList'); return !L || L.scrollHeight - L.scrollTop - L.clientHeight < 120; }
  function gambarSematan() {
    var el = document.getElementById('fmSem'); if (!el) return;
    if (!SEMATAN || !SEMATAN.teks) { el.hidden = true; return; }
    el.hidden = false; el.innerHTML = '<span>📌</span><div><b>Pengumuman</b><small>' + esc(SEMATAN.teks) + '</small><em>disematkan ' + esc(pendek(SEMATAN.oleh)) + '</em></div>' + (INFO.admin ? '<button type="button" class="kbK" data-f="lepas" aria-label="Lepas sematan">✕</button>' : '');
  }
  function teksHtml(t) {
    var h = esc(t).replace(/\n/g, '<br>');
    return h.replace(/@([A-Za-z][A-Za-z.'-]*(?: [A-Za-z][A-Za-z.'-]*)?)/g, function (m, n) { var saya = INFO && pendek(INFO.nama).toLowerCase() === n.toLowerCase(); return '<b class="fmSebut' + (saya ? ' saya' : '') + '">@' + n + '</b>'; });
  }
  function gelHtml(gel, id) { var g = (gel && gel.length ? gel : [3, 5, 4, 6, 3, 5, 7, 4, 3, 5, 6, 4, 3, 2]); return '<span class="gel" id="gel_' + id + '">' + g.map(function (v) { return '<i style="height:' + (18 + Math.min(9, v) * 9) + '%"></i>'; }).join('') + '</span>'; }
  function gambarPesan(keBawah) {
    var L = document.getElementById('fmList'); if (!L) return;
    var lihat = {}, semua = LAMA.concat(LIVE).filter(function (x) { if (lihat[x.id]) return false; lihat[x.id] = 1; return true; }).sort(function (a, b) { return a.ms - b.ms; });
    if (!semua.length) { L.innerHTML = R.kosong('Belum ada pesan', 'Mulai obrolan di ruang ini.'); return; }
    var h = habis ? '<div class="fmHari"><span>Awal obrolan</span></div>' : '<button type="button" class="tKecil fmLama" data-f="lama">Muat pesan lebih lama</button>', hariLalu = '', lalu = null;
    semua.forEach(function (x) {
      var hr = hariTeks(x.ms); if (hr !== hariLalu) { h += '<div class="fmHari"><span>' + esc(hr) + '</span></div>'; hariLalu = hr; lalu = null; }
      var saya = x.uid === INFO.uid, sambung = lalu && lalu.uid === x.uid && x.ms - lalu.ms < 300000; lalu = x;
      var reaksi = {}; Object.keys(x.reaksi || {}).forEach(function (u) { var e = x.reaksi[u]; reaksi[e] = (reaksi[e] || 0) + 1; });
      var dibaca = saya ? Object.keys(BACA).filter(function (u) { return u !== INFO.uid && BACA[u] >= x.ms; }).length : 0;
      h += '<div class="fmB' + (saya ? ' saya' : '') + (sambung ? ' sambung' : '') + (x.hapus ? ' hapus' : '') + '" data-pesan="' + x.id + '">'
        + (!saya && !sambung ? '<b class="fmNama" style="color:' + warnaNama(x.uid) + '">' + esc(pendek(x.nama)) + ' <small>' + esc(PERAN_NM[x.peran] || x.peran || '') + '</small></b>' : '')
        + (x.hapus ? '<div class="fmTeks"><i>🚫 Pesan dihapus</i></div>' : (x.balas ? '<div class="fmKutip"><b>' + esc(pendek(x.balas.nama)) + '</b>' + esc(x.balas.cuplik) + '</div>' : '')
          + (x.jenis === 'foto' ? '<div class="fmFoto" data-foto="' + x.id + '" style="aspect-ratio:' + ((x.media && x.media.w) || 4) + '/' + ((x.media && x.media.h) || 3) + '">' + (MEDIA[x.media.ref] ? '<img src="' + MEDIA[x.media.ref] + '" alt="Foto">' : '<span class="putar"></span>') + '</div>' : '')
          + (x.jenis === 'suara' ? '<div class="fmSuara"><button type="button" class="fmPutar" data-putar="' + x.id + '" aria-label="Putar pesan suara">▶</button>' + gelHtml(x.media && x.media.gel, x.id) + '<em>' + durTeks(x.media && x.media.dur) + '</em></div>' : '')
          + (x.teks ? '<div class="fmTeks">' + teksHtml(x.teks) + '</div>' : ''))
        + '<div class="fmMeta">' + (x.tunda ? '🕓' : jam(x.ms)) + (saya && !x.hapus && !x.tunda ? ' · ' + (dibaca ? '✓✓ dibaca ' + dibaca : '✓ terkirim') : '') + '</div>'
        + (Object.keys(reaksi).length && !x.hapus ? '<div class="fmReaksi">' + Object.keys(reaksi).map(function (e) { return '<span class="' + (x.reaksi[INFO.uid] === e ? 'saya' : '') + '">' + e + (reaksi[e] > 1 ? ' ' + reaksi[e] : '') + '</span>'; }).join('') + '</div>' : '')
        + '</div>';
    });
    L.innerHTML = h;
    semua.forEach(function (x) { if (x.jenis === 'foto' && !x.hapus && x.media && !MEDIA[x.media.ref]) ambilMedia(x.media).then(function (u) { var el = L.querySelector('[data-foto="' + x.id + '"]'); if (el) el.innerHTML = '<img src="' + u + '" alt="Foto">'; }, function () { }); });
    if (keBawah) L.scrollTop = L.scrollHeight;
  }
  function ambilMedia(m) {
    if (MEDIA[m.ref]) return Promise.resolve(MEDIA[m.ref]);
    var j = m.via === 'st' ? st.ref(m.ref).getDownloadURL() : db.collection('ruang').doc(aktif).collection('media').doc(m.ref).get().then(function (d) { if (!d.exists) throw new Error('media hilang'); var x = d.data(); return 'data:' + x.mime + ';base64,' + x.data; });
    return j.then(function (u) { MEDIA[m.ref] = u; return u; });
  }
  function cari(id) { return LAMA.concat(LIVE).filter(function (x) { return x.id === id; })[0]; }

  /* ---------- menulis ---------- */
  function penulis() {
    return '<div class="fmTulis" id="fmTulis"><div class="fmBalasBar" id="fmBalasBar" hidden></div><div class="fmSaran" id="fmSaran" hidden></div>'
      + '<div class="fmBaris" id="fmBaris"><button type="button" class="fmIk" data-f="foto" aria-label="Kirim foto">📷</button><textarea id="fmTeks" rows="1" maxlength="2000" placeholder="Tulis pesan..."></textarea><button type="button" class="fmKirim" id="fmKirim" data-f="kirim" aria-label="Rekam pesan suara">🎤</button></div>'
      + '<div class="fmRekam" id="fmRekam" hidden><button type="button" class="fmIk" data-f="batalRekam" aria-label="Batal">🗑️</button><span class="fmMerah"></span><em id="fmDetik">0:00</em><span class="gel live" id="fmGelLive"></span><button type="button" class="fmKirim kirim" data-f="kirimRekam" aria-label="Kirim pesan suara">➤</button></div>'
      + '<input type="file" id="fmFile" accept="image/*" hidden></div>';
  }
  function aturTombol() { var t = document.getElementById('fmTeks'), b = document.getElementById('fmKirim'); if (!t || !b) return; var ada = t.value.trim().length > 0; b.textContent = ada ? '➤' : '🎤'; b.classList.toggle('kirim', ada); b.setAttribute('aria-label', ada ? 'Kirim pesan' : 'Rekam pesan suara'); t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; }
  function dasarPesan(jenis) { return { uid: INFO.uid, nama: INFO.nama, peran: INFO.peran, jenis: jenis, teks: '', media: null, balas: balasKe ? { id: balasKe.id, nama: balasKe.nama, cuplik: cuplik(balasKe).slice(0, 150) } : null, sebut: [], reaksi: {}, hapus: false, waktu: FV.serverTimestamp() }; }
  function selesaiKirim() { balasKe = null; var b = document.getElementById('fmBalasBar'); if (b) b.hidden = true; R.bunyi('ketuk'); R.getar(); var L = document.getElementById('fmList'); if (L) L.scrollTop = L.scrollHeight; }
  /* notif-push-13nov: minta server mengirim notifikasi ke anggota ruang (server memeriksa pesan ini di Firestore dulu). Gagal = diam, chat tetap terkirim. */
  function notifServer(ruang, id, jenis) {
    if (!id || !API.Pusat.punya('pusatForumNotif') || !CTX.sesi || !CTX.sesi.tokenPusat) return;
    setTimeout(function () { API.Pusat.forumNotif(CTX.sesi, ruang, id, jenis).catch(function () { }); }, 1500); // beri waktu stempel waktu server tertulis
  }
  function galatKirim(e) { R.bunyi('gagal'); R.getar('gagal'); CTX.roti('Gagal mengirim: ' + (e && e.message || e)); }
  function kirimTeks() {
    var t = document.getElementById('fmTeks'), isi = t.value.trim(); if (!isi) return;
    var p = dasarPesan('teks'); p.teks = isi.slice(0, 2000);
    Object.keys(KENAL).forEach(function (u) { if (u !== INFO.uid && p.sebut.length < 10 && isi.toLowerCase().indexOf('@' + pendek(KENAL[u]).toLowerCase()) >= 0) p.sebut.push(u); });
    t.value = ''; aturTombol(); document.getElementById('fmSaran').hidden = true;
    var rgKirim = aktif; db.collection('ruang').doc(aktif).collection('pesan').add(p).then(function (ref) { selesaiKirim(); notifServer(rgKirim, ref && ref.id, 'pesan'); }, galatKirim); selesaiKirim();
  }
  function blobKe64(b) { return new Promise(function (ok, gagal) { var r = new FileReader(); r.onload = function () { var s = String(r.result); ok(s.slice(s.indexOf(',') + 1)); }; r.onerror = gagal; r.readAsDataURL(b); }); }
  function kirimMedia(jenis, blob, meta) {
    var batas = jenis === 'foto' ? 300 * 1024 : 500 * 1024;
    if (blob.size > batas) { galatKirim(new Error(jenis === 'foto' ? 'foto masih lebih dari 300 KB' : 'pesan suara lebih dari 500 KB')); return; }
    var ruang = db.collection('ruang').doc(aktif), p = dasarPesan(jenis), mime = (blob.type || (jenis === 'foto' ? 'image/jpeg' : 'audio/webm'));
    p.media = { via: KF.media === 'storage' ? 'st' : 'fs', ref: '', mime: mime, ukuran: blob.size, w: meta.w || 0, h: meta.h || 0, dur: Math.round((meta.dur || 0) * 10) / 10, gel: meta.gel || [] };
    CTX.roti(jenis === 'foto' ? 'Mengirim foto...' : 'Mengirim pesan suara...');
    var jalan, rgM = aktif;
    if (KF.media === 'storage') {
      var path = 'forum/' + aktif + '/' + INFO.uid + '/' + Date.now() + (jenis === 'foto' ? '.jpg' : /mp4|aac/.test(mime) ? '.m4a' : '.webm');
      p.media.ref = path; jalan = st.ref(path).put(blob, { contentType: mime }).then(function () { return ruang.collection('pesan').add(p); }).then(function (ref) { notifServer(rgM, ref && ref.id, 'pesan'); });
    } else {
      var mRef = ruang.collection('media').doc(), pRef = ruang.collection('pesan').doc(); p.media.ref = mRef.id;
      jalan = blobKe64(blob).then(function (b64) { MEDIA[mRef.id] = 'data:' + mime + ';base64,' + b64; var bt = db.batch(); bt.set(mRef, { uid: INFO.uid, mime: mime, data: b64, waktu: FV.serverTimestamp() }); bt.set(pRef, p); return bt.commit(); }).then(function () { notifServer(rgM, pRef.id, 'pesan'); });
    }
    jalan.then(selesaiKirim, galatKirim);
  }
  function kecilkanFoto(file) {
    return new Promise(function (ok, gagal) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, s0 = Math.min(1, 1280 / Math.max(w, h));
        var coba = function (sk, q) {
          var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * sk)); c.height = Math.max(1, Math.round(h * sk));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function (b) { if (!b) { gagal(new Error('Foto tidak bisa diproses')); return; } if (b.size <= 300 * 1024 || sk < 0.25) { URL.revokeObjectURL(url); ok({ blob: b, w: c.width, h: c.height }); } else if (q > 0.5) coba(sk, q - 0.1); else coba(sk * 0.8, 0.72); }, 'image/jpeg', q);
        };
        coba(s0, 0.8);
      };
      img.onerror = function () { gagal(new Error('Gambar tidak bisa dibaca')); }; img.src = url;
    });
  }
  function pilihFile(ev) { if (ev.target.id !== 'fmFile' || !ev.target.files[0]) return; var f = ev.target.files[0]; ev.target.value = ''; kecilkanFoto(f).then(function (h) { kirimMedia('foto', h.blob, { w: h.w, h: h.h }); }, galatKirim); }

  /* ---------- pesan suara (rekam -> kirim, maks 60 dtk) ---------- */
  function pilihMime() { var L = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/aac']; for (var i = 0; i < L.length; i++) { try { if (window.MediaRecorder && MediaRecorder.isTypeSupported(L[i])) return L[i]; } catch (e) { /* */ } } return ''; }
  function mulaiRekam() {
    if (!navigator.mediaDevices || !window.MediaRecorder) { galatKirim(new Error('HP ini belum bisa merekam suara')); return; }
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
      var mime = pilihMime(), rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 });
      var AC = window.AudioContext || window.webkitAudioContext, ac = new AC(), an = ac.createAnalyser(); an.fftSize = 512; ac.createMediaStreamSource(stream).connect(an);
      var buf = new Uint8Array(an.fftSize);
      var rk = REK = { stream: stream, rec: rec, potong: [], ac: ac, sampel: [], t0: Date.now(), mime: rec.mimeType || mime || 'audio/webm' };
      rec.ondataavailable = function (e) { if (e.data && e.data.size) rk.potong.push(e.data); }; // pakai rk (bukan REK): potongan terakhir datang sesudah REK dikosongkan
      REK.tik = setInterval(function () {
        if (REK !== rk) return; an.getByteTimeDomainData(buf); var s = 0; for (var i = 0; i < buf.length; i++) { var v = (buf[i] - 128) / 128; s += v * v; } var rms = Math.sqrt(s / buf.length); rk.sampel.push(rms);
        var dt = (Date.now() - rk.t0) / 1000, el = document.getElementById('fmDetik'), g = document.getElementById('fmGelLive');
        if (el) el.textContent = durTeks(dt); if (g) g.innerHTML = rk.sampel.slice(-28).map(function (v) { return '<i style="height:' + Math.max(10, Math.min(100, v * 400)) + '%"></i>'; }).join('');
        if (dt >= 60) hentiRekam(true);
      }, 100);
      rec.start(250);
      document.getElementById('fmBaris').hidden = true; document.getElementById('fmRekam').hidden = false; R.getar('sedang');
    }, function () { galatKirim(new Error('mikrofon belum diizinkan. Izinkan mikrofon untuk WHL App di pengaturan HP.')); });
  }
  function hentiRekam(kirim) {
    if (!REK) return; var r = REK; REK = null; clearInterval(r.tik);
    var akhir = function () { r.stream.getTracks().forEach(function (t) { t.stop(); }); try { r.ac.close(); } catch (e) { /* */ } var a = document.getElementById('fmBaris'), b = document.getElementById('fmRekam'); if (a) a.hidden = false; if (b) b.hidden = true; };
    r.rec.onstop = function () {
      akhir(); if (!kirim) return;
      var dur = Math.min(60, (Date.now() - r.t0) / 1000); if (dur < 1) { CTX.roti('Pesan suara terlalu pendek.'); return; }
      var blob = new Blob(r.potong, { type: r.mime.split(';')[0] }), n = 40, gel = [], per = Math.max(1, Math.floor(r.sampel.length / n)), maks = 0.0001;
      r.sampel.forEach(function (v) { if (v > maks) maks = v; });
      for (var i = 0; i < n && i * per < r.sampel.length; i++) { var s = 0, c = 0; for (var j = i * per; j < (i + 1) * per && j < r.sampel.length; j++) { s += r.sampel[j]; c++; } gel.push(Math.round(Math.min(9, (s / Math.max(1, c)) / maks * 9))); }
      kirimMedia('suara', blob, { dur: dur, gel: gel });
    };
    try { r.rec.stop(); } catch (e) { akhir(); }
  }
  function putar(id) {
    var x = cari(id); if (!x || !x.media) return;
    var tb = lapisEl.querySelector('[data-putar="' + id + '"]');
    if (audioNow && audioNow._id === id) { if (audioNow.paused) audioNow.play(); else audioNow.pause(); return; }
    if (audioNow) { audioNow.pause(); var lama = lapisEl.querySelector('[data-putar="' + audioNow._id + '"]'); if (lama) lama.textContent = '▶'; }
    tb.innerHTML = '<span class="putar"></span>';
    ambilMedia(x.media).then(function (u) {
      var a = new Audio(u); a._id = id; audioNow = a;
      a.onplay = function () { tb.textContent = '❚❚'; }; a.onpause = function () { tb.textContent = '▶'; };
      a.ontimeupdate = function () { var g = document.getElementById('gel_' + id), d = a.duration && isFinite(a.duration) ? a.duration : x.media.dur || 1; if (g) g.style.setProperty('--p', Math.min(100, a.currentTime / d * 100) + '%'); };
      a.onended = function () { tb.textContent = '▶'; var g = document.getElementById('gel_' + id); if (g) g.style.setProperty('--p', '0%'); audioNow = null; };
      a.play().catch(function (e) { tb.textContent = '▶'; galatKirim(new Error('tidak bisa diputar: ' + e.message)); });
    }, function (e) { tb.textContent = '▶'; galatKirim(e); });
  }

  /* ---------- aksi pesan (lembar bawah) ---------- */
  function aksi(id) {
    var x = cari(id); if (!x || x.hapus) return;
    var saya = x.uid === INFO.uid, d = document.createElement('div'); d.className = 'tirai buka fmAksi';
    d.innerHTML = '<div class="lembar"><div class="pegangan"></div><div class="fmEmo">' + EMOJI.map(function (e) { return '<button type="button" data-emo="' + e + '" class="' + ((x.reaksi || {})[INFO.uid] === e ? 'on' : '') + '">' + e + '</button>'; }).join('') + '</div>'
      + '<button type="button" class="app" data-a="balas"><span class="ik">↩️</span><span class="tx"><b>Balas</b><small>Kutip pesan ini</small></span></button>'
      + (x.teks ? '<button type="button" class="app" data-a="salin"><span class="ik">📋</span><span class="tx"><b>Salin teks</b></span></button>' : '')
      + (INFO.admin ? '<button type="button" class="app" data-a="sematkan"><span class="ik">📌</span><span class="tx"><b>Sematkan sebagai pengumuman</b><small>Tampil di atas ruang ini</small></span></button>' : '')
      + (saya || INFO.admin ? '<button type="button" class="app" data-a="hapus"><span class="ik">🗑️</span><span class="tx"><b style="color:var(--tMerah)">Hapus pesan</b><small>' + (saya ? 'Pesanmu sendiri' : 'Sebagai admin') + '</small></span></button>' : '')
      + '<button type="button" class="tKecil" data-a="tutup" style="width:100%;margin-top:6px">Tutup</button></div>';
    document.body.appendChild(d); R.bunyi('sheet');
    d.addEventListener('click', function (ev) {
      var t = ev.target, b = t.closest('[data-emo]'), a = t.closest('[data-a]');
      if (t === d) { d.remove(); R.bunyi('tutup'); return; }
      if (b) { var e = b.getAttribute('data-emo'), upd = {}; upd['reaksi.' + INFO.uid] = (x.reaksi || {})[INFO.uid] === e ? FV.delete() : e; db.collection('ruang').doc(aktif).collection('pesan').doc(id).update(upd).catch(galatKirim); R.getar(); d.remove(); return; }
      if (!a) return; var k = a.getAttribute('data-a'); d.remove();
      if (k === 'balas') { balasKe = x; var bb = document.getElementById('fmBalasBar'); bb.hidden = false; bb.innerHTML = '<div><b>↩️ Membalas ' + esc(pendek(x.nama)) + '</b><small>' + esc(cuplik(x).slice(0, 80)) + '</small></div><button type="button" class="kbK" data-f="batalBalas" aria-label="Batal balas">✕</button>'; document.getElementById('fmTeks').focus(); }
      else if (k === 'salin') { try { navigator.clipboard.writeText(x.teks); CTX.roti('Teks disalin.'); } catch (e2) { /* */ } }
      else if (k === 'sematkan') { var rgS = aktif; db.collection('ruang').doc(aktif).set({ sematan: { teks: cuplik(x).slice(0, 500), oleh: INFO.nama, waktu: FV.serverTimestamp(), pesanId: id } }).then(function () { R.bunyi('sukses'); CTX.roti('Disematkan sebagai pengumuman.'); notifServer(rgS, id, 'sematan'); }, galatKirim); }
      else if (k === 'hapus') R.tanya({ judul: 'Hapus pesan ini?', ket: 'Pesan diganti tulisan "Pesan dihapus" untuk semua orang.', ya: 'Hapus', tidak: 'Batal', bahaya: true }).then(function (ya) {
        if (!ya) return; var ruang = db.collection('ruang').doc(aktif), bt = db.batch();
        bt.update(ruang.collection('pesan').doc(id), { hapus: true, teks: '', media: null, balas: null, sebut: [], reaksi: {} });
        if (x.media && x.media.via === 'fs') bt.delete(ruang.collection('media').doc(x.media.ref));
        bt.commit().then(function () { if (x.media && x.media.via === 'st') st.ref(x.media.ref).delete().catch(function () { }); R.bunyi('tutup'); }, galatKirim);
      });
    });
  }

  /* ---------- pendengar ---------- */
  function klik(ev) {
    var t = ev.target, b;
    if (t.closest('button') && !t.closest('[data-putar]')) R.bunyi('ketuk');
    b = t.closest('[data-ruang]'); if (b) { bukaRuang(b.getAttribute('data-ruang')); return; }
    b = t.closest('[data-putar]'); if (b) { putar(b.getAttribute('data-putar')); return; }
    b = t.closest('[data-foto]'); if (b) { var im = b.querySelector('img'); if (im) lihatFoto(im.src); return; }
    b = t.closest('[data-sebut]'); if (b) { var ta = document.getElementById('fmTeks'); ta.value = ta.value.replace(/@[^@\n]{0,30}$/, '@' + b.getAttribute('data-sebut') + ' '); document.getElementById('fmSaran').hidden = true; ta.focus(); aturTombol(); return; }
    b = t.closest('[data-f]');
    if (b) {
      var f = b.getAttribute('data-f');
      if (f === 'tutup') tutup(); else if (f === 'daftar') { berhenti(); aktif = ''; gambarDaftar(); } else if (f === 'ulang') { INFO = null; buka(); }
      else if (f === 'lama') muatLama(); else if (f === 'foto') document.getElementById('fmFile').click();
      else if (f === 'kirim') { if (document.getElementById('fmTeks').value.trim()) kirimTeks(); else mulaiRekam(); }
      else if (f === 'batalRekam') { hentiRekam(false); CTX.roti('Rekaman dibatalkan.'); } else if (f === 'kirimRekam') hentiRekam(true);
      else if (f === 'batalBalas') { balasKe = null; document.getElementById('fmBalasBar').hidden = true; }
      else if (f === 'lepas') db.collection('ruang').doc(aktif).set({ sematan: null }).catch(galatKirim);
      return;
    }
    b = t.closest('[data-pesan]'); if (b) aksi(b.getAttribute('data-pesan'));
  }
  function ketik(ev) {
    if (ev.target.id !== 'fmTeks') return; aturTombol();
    var m = ev.target.value.match(/@([^@\n]{0,30})$/), s = document.getElementById('fmSaran');
    if (!m) { s.hidden = true; return; }
    var q = m[1].toLowerCase(), L = Object.keys(KENAL).filter(function (u) { return u !== INFO.uid && pendek(KENAL[u]).toLowerCase().indexOf(q) === 0; }).slice(0, 5);
    s.hidden = !L.length; s.innerHTML = L.map(function (u) { return '<button type="button" data-sebut="' + esc(pendek(KENAL[u])) + '"><span class="bulat">' + esc(inisial(KENAL[u])) + '</span>' + esc(pendek(KENAL[u])) + '</button>'; }).join('');
  }
  function lihatFoto(src) { var d = document.createElement('div'); d.className = 'fmFotoBesar'; d.innerHTML = '<img src="' + src + '" alt="Foto"><button type="button" aria-label="Tutup">✕</button>'; d.onclick = function () { d.remove(); }; document.body.appendChild(d); }

  /* notif-push-13nov: notifikasi forum diketuk -> buka forum langsung di ruang itu */
  /* v2.16: ikon garis WHL untuk ruang (emoji kalau ikon.js tidak ada) */
  function ikRuang(x) { var m = { umum: 'pengumuman', pengawas: 'insiden', mekanik: 'truk', fuelman: 'solar', admin: 'dokumen', kantor: 'rumahWeb' }; return window.WHL_IKON ? window.WHL_IKON(m[x.id] || 'forum') : x.ic; }
  function bukaKe(ctx, r) {
    buka(ctx); var n = 0, i = setInterval(function () { if (INFO || ++n > 60) { clearInterval(i); if (INFO && INFO.ruang.indexOf(r) >= 0) bukaRuang(r); } }, 250);
  }
  window.WHL_FORUM = { fs: function () { return INFO && db ? { db: db, FV: FV, info: INFO } : null; }, /* v3.6: dipakai banner.js */ terbuka: function () { return !!lapisEl; }, tutup: function () { tutup(); }, keDaftar: function () { if (aktif && INFO) { berhenti(); aktif = ''; gambarDaftar(); } }, disiapkan: function () { return gagalMasuk === 'disiapkan'; }, mulai: mulai, buka: buka, bukaKe: bukaKe, keluar: keluar, totalBaru: totalBaru, siap: function () { return !!INFO; }, gagal: function () { return gagalMasuk; },
    _uji: { bukaRuang: bukaRuang, kirimTeks: function (t) { var el = document.getElementById('fmTeks'); el.value = t; kirimTeks(); }, rekam: mulaiRekam, henti: hentiRekam, aksi: function () { var s = LIVE.slice().sort(function (a, b) { return b.ms - a.ms; })[0]; if (s) aksi(s.id); } } };
})();
