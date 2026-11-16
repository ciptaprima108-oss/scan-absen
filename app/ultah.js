/* WHL App — ULANG TAHUN (tahap 3 rancangan Upgrade\app-beranda-poin-16nov §1 no 10b; tim A Andro, 17 Nov 2026).
 * Data dari kegiatan.js (pusatKegiatanBeranda): ultah[] = {nama, jabatan, peran, foto, uid} TANPA tahun lahir, ultahSaya = {hariIni, bonus, pesan, bonusDiberi, bonusBaru}.
 * - Yang berulang tahun (staf & driver): LAYAR SPESIAL sekali per hari saat buka app (konfeti, kartu ucapan PT WHL + foto, bonus poin dari server),
 *   tema beranda ultah seharian (kelas body.kgUltah), lencana 🎂 di sebelah nama (kepala app & forum), kartu "Ucapan dari rekan" di Beranda.
 * - Ucapan dari rekan = pesan Forum Umum (ruang 'semua') HARI INI yang menyebut dia (field sebut berisi uid-nya, atau teks @Nama). Dibaca langsung
 *   dari Firestore lewat login forum yang sudah ada (tanpa RPC baru). Forum belum tersambung = kartu tetap tampil dengan tombol ke Forum Umum.
 * - Kirim ucapan (dari slide banner): buka Forum Umum, kolom ketik sudah terisi "@Nama Selamat ulang tahun! 🎂". Pesan dikirim orangnya sendiri.
 */
(function () {
  'use strict';
  var R = window.WHL_RASA, Simpan = window.WHL_API.Simpan;
  var lapisEl = null, UCAP = null, UCAP_JALAN = false, UCAP_T = 0, SPESIAL_CEK = '';
  function KG() { return window.WHL_KEGIATAN; }
  function esc(s) { return KG().esc(s); }
  function d() { return KG() ? KG().data() : null; }
  function sesi() { var c = KG() && KG().ctx(); return c && c.sesi ? c.sesi() : null; }
  function akun() { var S = sesi(); return String((S && (S.idProfil || S.idKetik)) || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function rapat(s) { return String(s || '').toUpperCase().replace(/[^A-Z]/g, ''); }
  function saya() { var x = d(); return !!(x && x.ultahSaya && x.ultahSaya.hariIni && (!x.fitur || x.fitur.ultah !== false)); }
  function namaSaya() { var S = sesi(); return String((S && (S.namaLengkap || (S.user && S.user.nama))) || ''); }
  function diriSendiri(x) { var n = rapat(namaSaya()); return !!n && saya() && rapat(x.nama) === n; }
  function dataSaya() { var x = d(), n = rapat(namaSaya()); return ((x && x.ultah) || []).filter(function (o) { return rapat(o.nama) === n; })[0] || null; }
  function fs() { return window.WHL_FORUM && window.WHL_FORUM.fs ? window.WHL_FORUM.fs() : null; }
  function uidSaya() { var F = fs(); return F && F.info ? F.info.uid : ((dataSaya() || {}).uid || ''); }
  /** lencana 🎂: uid forum (dari server) ATAU nama lengkap/pendek cocok dengan yang berulang tahun hari ini */
  function lencana(uid, nama) {
    var x = d(); if (!x || (x.fitur && x.fitur.ultah === false)) return false;
    var L = x.ultah || [], n = rapat(nama), np = rapat(KG().pendek(nama));
    return L.some(function (o) { return (uid && o.uid && o.uid === uid) || (n && (rapat(o.nama) === n || (np.length > 3 && rapat(KG().pendek(o.nama)) === np))); });
  }
  function inisial(n) { return String(n || '').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase(); }

  /* ---------- kirim ucapan -> Forum Umum dengan @nama ---------- */
  function ruangUmum() { var F = fs(); if (F && F.info && (F.info.ruang || []).indexOf('semua') < 0) return 'umum'; return 'semua'; } /* server forum lama tanpa Forum Umum: ruang 'umum' */
  function kirimUcapan(o) {
    if (!o) return; tutup();
    var cb = KG().ctxB();
    if (!window.WHL_FORUM || !cb || !cb.forum) { var c = KG().ctx(); if (c && c.roti) c.roti('Forum belum tersedia di HP ini.'); return; }
    R.bunyi('sheet'); R.getar();
    if (window.WHL_FORUM.kenalkan && o.uid) window.WHL_FORUM.kenalkan(o.uid, o.nama); /* supaya @nama tercatat di field sebut walau dia belum pernah menulis di forum */
    var r = ruangUmum(), teks = '@' + KG().namaTampil(o.nama) + ' Selamat ulang tahun! 🎂🎉 ';
    cb.forum(r);
    var n = 0, i = setInterval(function () {
      var t = document.getElementById('fmTeks'); n++;
      if (!t && n < 80) return; clearInterval(i); if (!t) return;
      if (String(t.value || '').indexOf(teks.trim()) < 0) t.value = teks + (t.value || '');
      try { t.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) { /* */ }
      setTimeout(function () { try { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } catch (e) { /* */ } }, 60);
    }, 200);
  }
  function pilihUcapan(L) {
    lapis('Kirim ucapan', 'Ulang tahun hari ini', '<div class="kartu">' + L.map(function (o, i) {
      return '<div class="kgOrang">' + foto(o, 'kecil') + '<div class="tx"><b>' + esc(KG().namaTampil(o.nama)) + ' 🎂</b><small>' + esc(o.peran === 'driver' ? 'Driver' : 'Staf') + (o.jabatan && !/^driver$/i.test(o.jabatan) ? ' · ' + esc(String(o.jabatan).toLowerCase().replace(/(^|\s)\S/g, function (m) { return m.toUpperCase(); }).replace(/\b(Hr|Hse|Ga|It|Do)\b/g, function (m) { return m.toUpperCase(); })) : '') + '</small></div><button type="button" class="tKecil" data-ku="kirim:' + i + '">💬 Ucapkan</button></div>';
    }).join('') + '</div><div class="kecil" style="margin:10px 4px;text-align:center">Ucapan dikirim ke Forum Umum dengan @nama, jadi dia dapat notifikasi.</div>', L);
  }
  function foto(o, ukuran) {
    var f = o && o.foto, i = inisial(o && o.nama);
    return '<span class="kgFoto ' + (ukuran || '') + '">' + (f ? '<img src="' + esc(f) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">' : '') + '<span>' + esc(i) + '</span></span>';
  }

  /* ---------- ucapan dari rekan (Firestore Forum Umum, hari ini) ---------- */
  function muatUcapan(paksa) {
    var F = fs(); if (!F || UCAP_JALAN || !saya()) return Promise.resolve(UCAP);
    if (UCAP && !paksa && Date.now() - UCAP_T < 60000) return Promise.resolve(UCAP);
    UCAP_JALAN = true;
    var r = (F.info.ruang || []).indexOf('semua') >= 0 ? 'semua' : 'umum', tgl = KG().tglWib(), m = tgl.split('-'), awal = new Date(Date.UTC(+m[0], +m[1] - 1, +m[2], -7, 0, 0));
    var uid = F.info.uid, nm = KG().pendek(namaSaya()).toLowerCase();
    return F.db.collection('ruang').doc(r).collection('pesan').where('waktu', '>=', awal).orderBy('waktu', 'desc').limit(150).get().then(function (s) {
      var L = [];
      s.forEach(function (doc) {
        var x = doc.data(); if (!x || x.hapus || x.uid === uid) return;
        var teks = String(x.teks || ''), sebut = (x.sebut || []).indexOf(uid) >= 0 || (nm && teks.toLowerCase().indexOf('@' + nm) >= 0);
        if (!sebut) return;
        var ms = 0; try { ms = x.waktu && x.waktu.toMillis ? x.waktu.toMillis() : 0; } catch (e) { ms = 0; }
        L.push({ nama: x.nama, peran: x.peran, teks: teks.replace(/@[A-Za-z][A-Za-z.'-]*(?: [A-Za-z][A-Za-z.'-]*)?\s*/, '').trim() || (x.jenis === 'foto' ? '📷 Foto' : x.jenis === 'suara' ? '🎤 Pesan suara' : ''), ms: ms });
      });
      UCAP = L; UCAP_T = Date.now(); UCAP_JALAN = false; perbarui(); return L;
    }, function () { UCAP_JALAN = false; UCAP_T = Date.now(); if (!UCAP) UCAP = []; return UCAP; });
  }
  function perbarui() { var c = KG() && KG().ctx(); try { if (c && c.perbarui) c.perbarui(); } catch (e) { /* */ } }
  function jamDari(ms) { if (!ms) return ''; var t = new Date(ms + 7 * 3600e3); return ('0' + t.getUTCHours()).slice(-2) + '.' + ('0' + t.getUTCMinutes()).slice(-2); }
  function barisUcapan(u) { return '<div class="kgUcap"><span class="kgFoto kecil"><span>' + esc(inisial(u.nama)) + '</span></span><div class="tx"><b>' + esc(KG().namaTampil(u.nama)) + ' <i class="' + (u.peran === 'driver' ? '' : 'staf') + '">' + (u.peran === 'driver' ? 'Driver' : 'Staf') + '</i></b><small>' + esc(u.teks) + '</small></div><em>' + esc(jamDari(u.ms)) + '</em></div>'; }
  function kartuHtml() {
    if (!saya()) return '';
    if (fs() && (!UCAP || Date.now() - UCAP_T > 60000)) muatUcapan();
    var L = UCAP || [], ada = !!fs();
    return '<div class="kartu kgUcapK"><div class="hiBar"><b>💌 Ucapan dari rekan</b><span>' + (ada ? L.length + ' ucapan · Forum Umum' : 'Forum Umum') + '</span></div>'
      + (L.length ? L.slice(0, 3).map(barisUcapan).join('') + (L.length > 3 ? '<button type="button" class="kgLink" data-kg="ucapan">Lihat semua ' + L.length + ' ›</button>' : '')
        : '<div class="kecil" style="padding:4px 2px 2px">' + (ada ? (UCAP ? 'Belum ada ucapan. Rekan yang menyebut @namamu di Forum Umum muncul di sini.' : 'Memuat ucapan…') : 'Ucapan rekan di Forum Umum muncul di sini begitu forum tersambung.') + '</div>')
      + '</div>';
  }
  function bukaUcapan() {
    var L = UCAP || [];
    lapis('Ucapan dari rekan', 'Forum Umum · hari ini', (L.length ? '<div class="kartu">' + L.map(barisUcapan).join('') + '</div>' : '<div class="kartu kosongKm"><b>Belum ada ucapan</b><small>Ucapan yang menyebut @namamu di Forum Umum hari ini muncul di sini.</small></div>')
      + '<button type="button" class="tUtama" data-ku="forum" style="margin-top:12px">Buka Forum Umum</button>');
    muatUcapan(true).then(function () { if (lapisEl && lapisEl.getAttribute('data-j') === 'ucapan' && (UCAP || []).length !== L.length) bukaUcapan(); });
    if (lapisEl) lapisEl.setAttribute('data-j', 'ucapan');
  }

  /* ---------- lapis biasa ---------- */
  var DAFTAR = [];
  function lapis(judul, sub, isi, L) {
    DAFTAR = L || DAFTAR;
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis kgLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik);
    }
    lapisEl.removeAttribute('data-j');
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-ku="tutup" aria-label="Kembali">‹</button><div class="nm">' + esc(sub) + '<b>' + esc(judul) + '</b></div></div><div class="ksnIsi">' + isi + '</div>';
  }
  function tutup() { if (!lapisEl) return false; var x = lapisEl; lapisEl = null; x.classList.remove('tampil'); setTimeout(function () { x.remove(); }, 200); return true; }
  function klik(ev) {
    var b = ev.target.closest('[data-ku]'); if (!b) return; var n = b.getAttribute('data-ku');
    if (n === 'tutup') { R.bunyi('tutup'); tutup(); }
    else if (n.indexOf('kirim:') === 0) kirimUcapan(DAFTAR[+n.slice(6)]);
    else if (n === 'forum') { tutup(); var cb = KG().ctxB(); if (cb && cb.forum) cb.forum(ruangUmum()); }
  }

  /* ---------- LAYAR SPESIAL (sekali per hari) ---------- */
  var spEl = null, konfJalan = false;
  function cek() {
    if (!saya()) return; var a = akun(), t = KG().tglWib(); if (!a || SPESIAL_CEK === a + t) return; SPESIAL_CEK = a + t;
    Simpan.ambil('whlUltahDilihat_' + a).then(function (v) { if (v === t) return; bukaSpesial(); Simpan.taruh('whlUltahDilihat_' + a, t); }); /* kontrak A1: sekali per hari per HP (di sini juga per akun) */
  }
  function bukaSpesial() {
    var x = d(), U = (x && x.ultahSaya) || {}, o = dataSaya() || { nama: namaSaya() }, nm = KG().namaTampil(namaSaya() || o.nama);
    var bonus = Number(U.bonusDiberi) > 0 ? Number(U.bonusDiberi) : 0;
    /* pesan server "Selamat ulang tahun, NAMA! Semoga ... — PT WHL": salam pembuka & tanda tangan dibuang (sudah ada di judul & baris TTD kartu) */
    var inti = String(U.pesan || '').replace(/\s*—\s*PT WHL\s*$/, '').replace(/^\s*selamat ulang tahun[^!]*!\s*/i, '').trim();
    var pesan = (inti || 'Semoga sehat, selamat di jalan, dan rezekinya lancar.') + ' Terima kasih sudah menjaga keselamatan & semangat kerja tiap hari.';
    if (spEl) spEl.remove();
    spEl = document.createElement('div'); spEl.className = 'lapis kgSpesial'; spEl.setAttribute('role', 'dialog'); spEl.setAttribute('aria-label', 'Selamat ulang tahun');
    spEl.innerHTML = '<canvas class="kgKonfC" aria-hidden="true"></canvas>' + KG().konfDiam(26, true)
      + '<div class="kgSpIsi"><div class="kgSpAtas"><button type="button" class="kgSpTutup" data-o="lewati" data-sp="tutup" aria-label="Tutup">✕</button></div>'
      + '<div class="kgSpKartu">' + foto(o, 'besar') + '<small>PT WHALE HOLDER LOGISTIC</small><h2>Selamat ulang tahun,<br>' + esc(nm) + '!</h2><p>' + esc(pesan) + '</p><div class="kgSpTtd">— Manajemen PT WHL</div></div>'
      + (bonus ? '<div class="kgSpBonus"><span class="ik">🎁</span><div><b>+' + bonus + ' poin hadiah ulang tahun</b><small>= Rp ' + (bonus * 100).toLocaleString('id-ID') + ' nilai hadiah · sudah masuk ke Poin WHL</small></div></div>' : '')
      + '<button type="button" class="kgSpTbl" data-sp="ucapan">💌 Lihat ucapan dari rekan</button><button type="button" class="kgSpTbl dua" data-sp="tutup">Ke Beranda</button>'
      + '<div class="kgSpKet">Tema ulang tahun & lencana 🎂 aktif seharian</div></div>';
    document.body.appendChild(spEl);
    requestAnimationFrame(function () { if (spEl) spEl.classList.add('tampil'); });
    spEl.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-sp]'); if (!b) return; var k = b.getAttribute('data-sp');
      tutupSpesial(); if (k === 'ucapan') { muatUcapan(true); bukaUcapan(); }
    });
    setTimeout(function () { R.bunyi('achievement'); R.getar('sukses'); }, 250);
    konfeti(spEl.querySelector('canvas'));
    muatUcapan(true).then(function (L) { var b = spEl && spEl.querySelector('[data-sp="ucapan"]'); if (b && L && L.length) b.textContent = '💌 Buka ' + L.length + ' ucapan dari rekan'; });
    perbarui();
  }
  function tutupSpesial() { if (!spEl) return false; var x = spEl; spEl = null; konfJalan = false; x.classList.remove('tampil'); R.bunyi('tutup'); setTimeout(function () { x.remove(); }, 250); return true; }
  /** konfeti hujan warna ultah (± 4 dtk), mati otomatis di mode hemat / "kurangi gerakan" */
  function konfeti(c) {
    if (!c || (R.hemat && R.hemat())) return;
    var W = c.width = window.innerWidth, H = c.height = window.innerHeight, g = c.getContext('2d'); if (!g) return;
    var warna = ['#FFE58A', '#FFC530', '#8DF0E4', '#FF9A9A', '#FFFFFF', '#C9B8FF', '#FF7A8A', '#7CC0FF'], P = [];
    for (var i = 0; i < 140; i++) P.push({ x: Math.random() * W, y: -Math.random() * H * 0.9, vx: (Math.random() - 0.5) * 1.6, vy: 2 + Math.random() * 3.2, s: 6 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.25, w: warna[i % warna.length], b: Math.random() < 0.3 });
    var t0 = 0; konfJalan = true;
    var gbr = function (t) {
      if (!konfJalan || !c.isConnected) return; if (!t0) t0 = t; var u = (t - t0) / 4200; g.clearRect(0, 0, W, H);
      P.forEach(function (p) { p.x += p.vx + Math.sin((t + p.s * 100) / 400) * 0.6; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, Math.min(1, (1 - u) * 1.6)); g.fillStyle = p.w; if (p.b) { g.beginPath(); g.arc(0, 0, p.s / 2.6, 0, 6.29); g.fill(); } else g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); });
      if (u < 1) requestAnimationFrame(gbr); else g.clearRect(0, 0, W, H);
    };
    requestAnimationFrame(gbr);
  }
  function lupakan() { UCAP = null; UCAP_T = 0; SPESIAL_CEK = ''; tutup(); tutupSpesial(); }

  /* klik kartu Beranda (data-kg) — pendengar sendiri, tidak menyentuh pengendali klik app.js */
  document.addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('[data-kg="ucapan"]'); if (!b || b.closest('.lapis')) return; R.bunyi('sheet'); bukaUcapan(); });
  /* tombol Kembali Android / gestur: layar spesial ditutup dulu (WHL_KEMBALI mengklik [data-o="lewati"] pada .lapis.tampil teratas) */

  window.WHL_ULTAH = { saya: saya, lencana: lencana, diriSendiri: diriSendiri, kirimUcapan: kirimUcapan, pilihUcapan: pilihUcapan, kartuHtml: kartuHtml, cek: cek, bukaSpesial: bukaSpesial, tutupSpesial: tutupSpesial, bukaUcapan: bukaUcapan, muatUcapan: muatUcapan, tutup: tutup, lupakan: lupakan, uidSaya: uidSaya };
})();
