/* WHL App — KUIS SAFETY DRIVER (tahap 5 rancangan Upgrade\app-beranda-poin-16nov §5; tim A Andro, 17 Nov 2026).
 * Server Armand (PusatKuis.gs): pusatKuisStatus(token) · pusatKuisBuka(token, sesiId) · pusatKuisJawab(token, sesiId, pilihan 0..3 urutan TAMPIL).
 * Aturan Reza: KHUSUS DRIVER, sesi 09.00 & 16.00 WIB (buka 60 mnt), 1 soal, 30 detik sejak soal dibuka (dihitung SERVER), 1x jawab,
 * 10 benar tercepat per sesi +10 poin. Kunci & penjelasan TIDAK dikirim server sebelum sesi ditutup (anti contek) -> ditampilkan di "Sesi tadi".
 * Kartu kuis di Beranda driver (dibuka / sudah dijawab / "sesi berikut 16.00 · x lagi"); staf tidak melihat apa pun.
 * Fitur tampil hanya kalau pusatPing memuat pusatKuisStatus (dan pusatKegiatanBeranda tidak bilang fitur.kuis = false).
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA;
  var CTX = null, ST = null, ST_JALAN = false, lapisEl = null, SOAL = null, JAWAB = null, tik = null, tunda = null, sedangKirim = false;
  function KG() { return window.WHL_KEGIATAN; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { return CTX && CTX.sesi ? CTX.sesi() : null; }
  function punya(fn) { return API.Pusat.asli() && API.Pusat.punya(fn); }
  function driver(S) { S = S || sesi(); return !!(S && S.user && S.user.peran === 'driver'); }
  function aktif(S) {
    if (!driver(S) || !punya('pusatKuisStatus')) return false;
    var d = KG() && KG().data(); if (d && d.fitur && d.fitur.kuis === false) return false;
    return true;
  }
  function panggil(fn, args, ms) { return API.Pusat.panggil(fn, [sesi().tokenPusat].concat(args || []), ms || 25000); }
  function kini() { return KG() ? KG().kini() : Date.now(); }
  function msWib(iso) { return KG() ? KG().msWib(iso) : 0; }
  function jamT(s) { return String(s || '').replace(':', '.'); }
  var BLN = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
  function tglPendek(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (+m[3]) + ' ' + BLN[+m[2] - 1] : ''; }
  function lagi(ms) { var m = Math.max(0, Math.round(ms / 60000)); if (m < 1) return 'sebentar lagi'; if (m < 60) return m + ' menit lagi'; var j = Math.floor(m / 60), s = m % 60; return j + ' jam' + (s ? ' ' + s + ' mnt' : '') + ' lagi'; }

  /* ---------- status ringkas (kartu Beranda) ---------- */
  /** bentuk ringkas: {terbuka, sesi:{id,jam,tutup}, sudahJawab, sudahBuka, berikut:{id,jam,mulai}} — dari pusatKegiatanBeranda.kuis, cadangan pusatKuisStatus */
  function ringkas() {
    var d = KG() && KG().data();
    if (ST && ST.d && Date.now() - ST.t < 120000) return ST.r;
    if (d && d.kuis) return d.kuis;
    if (!ST || Date.now() - ST.t > 120000) muatStatus();
    return ST && ST.r;
  }
  function dariStatus(h) {
    var s = h.sekarang;
    return { terbuka: !!(s && s.terbuka), sesi: s ? { id: s.id, jam: s.jam, tutup: s.tutup } : null, sudahJawab: !!(s && s.saya && s.saya.sudahJawab), sudahBuka: !!(s && s.saya && s.saya.sudahBuka), berikut: h.berikut || null, jadwal: h.jadwal };
  }
  function muatStatus() {
    if (ST_JALAN) return ST_JALAN; /* panggilan yang sedang jalan dipakai bersama (dulu: langsung null -> layar "Belum bisa dimuat") */
    if (!aktif()) return Promise.resolve(ST && ST.d);
    return (ST_JALAN = panggil('pusatKuisStatus', []).then(function (h) {
      ST_JALAN = false;
      if (h && h.login === false) { if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return null; }
      if (h && h.ok !== false && h.tampil !== false && h.aktif !== false) ST = { d: h, r: dariStatus(h), t: Date.now() }; else ST = { d: null, r: null, t: Date.now(), mati: h && h.aktif === false };
      jadwalUlang(); perbarui(); return ST.d;
    }, function () { ST_JALAN = false; if (!ST) ST = { d: null, r: null, t: Date.now() }; return null; }));
  }
  function perbarui() { try { if (CTX && CTX.perbarui) CTX.perbarui(); } catch (e) { /* */ } }
  /** gambar ulang Beranda tepat saat sesi dibuka / ditutup (paling lama 1 jam ditunda) */
  function jadwalUlang() {
    clearTimeout(tunda); var r = ringkas(); if (!r) return;
    var tuju = r.terbuka && r.sesi ? msWib(r.sesi.tutup) : r.berikut ? msWib(r.berikut.mulai) : 0; if (!tuju) return;
    var j = tuju - kini() + 1500; if (j <= 0 || j > 3600e3) return;
    tunda = setTimeout(function () { ST = null; if (KG()) KG().muat(null, true); muatStatus(); }, j);
  }
  function kartuHtml(ctx) {
    if (ctx) CTX = ctx; if (!aktif()) return '';
    var r = ringkas(); if (!r) return '';
    if (!tunda) jadwalUlang();
    var ik = '<span class="kgKuisIk">' + (KG() ? KG().ikon('kuis') : '') + '</span>';
    if (r.terbuka && r.sesi && !r.sudahJawab) {
      var sisa = msWib(r.sesi.tutup) - kini();
      return '<button type="button" class="kartu kgKuisK buka" data-kg="kuis">' + ik + '<span class="tx"><b>Kuis safety ' + esc(jamT(r.sesi.jam)) + ' DIBUKA</b><small>1 soal · 30 detik · 10 benar tercepat +10 poin' + (sisa > 0 ? ' · tutup ' + esc(lagi(sisa)) : '') + '</small></span><span class="kgChip">Jawab ›</span></button>';
    }
    if (r.terbuka && r.sesi && r.sudahJawab) return '<button type="button" class="kartu kgKuisK" data-kg="kuis">' + ik + '<span class="tx"><b>Kuis ' + esc(jamT(r.sesi.jam)) + ' sudah kamu jawab ✓</b><small>Kunci & penjelasan muncul jam ' + esc(jamT(String(r.sesi.tutup || '').slice(11, 16))) + '. ' + (r.berikut ? 'Sesi berikut ' + esc(jamT(r.berikut.jam)) + '.' : '') + '</small></span><span class="kgChip abu">Hasil ›</span></button>';
    if (r.berikut) return '<button type="button" class="kartu kgKuisK" data-kg="kuis">' + ik + '<span class="tx"><b>Kuis sesi ' + esc(jamT(r.berikut.jam)) + ' dibuka ' + esc(lagi(msWib(r.berikut.mulai) - kini())) + '</b><small>10 benar tercepat dapat +10 poin · jadwal ' + esc((r.jadwal || ['09:00', '16:00']).map(jamT).join(' & ')) + '</small></span><span class="kgChip abu">Lihat ›</span></button>';
    return '';
  }

  /* ---------- layar kuis ---------- */
  function lapis(isi, sub) {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis kgLapis kgKuisLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik);
    }
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-kq="tutup" aria-label="Kembali">‹</button><div class="nm">' + esc(sub || 'Driver WHL') + '<b>Kuis safety</b></div></div><div class="ksnIsi">' + isi + '</div>';
  }
  function tutup() { berhentiTik(); if (!lapisEl) return false; var d = lapisEl; lapisEl = null; SOAL = null; JAWAB = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); perbarui(); return true; }
  function gagalHtml(p) { return '<div class="kartu kosongKm"><b>Belum bisa dimuat</b><small>' + esc(p) + '</small><button type="button" class="tKecil" data-kq="ulang" style="margin-top:10px">Coba lagi</button></div>'; }
  function buka(ctx) {
    if (ctx) CTX = ctx; if (!sesi()) return;
    if (!driver()) { if (CTX && CTX.roti) CTX.roti('Kuis safety khusus driver.'); return; }
    if (!punya('pusatKuisStatus')) { if (CTX && CTX.roti) CTX.roti('Kuis safety belum dibuka di server.'); return; }
    SOAL = null; JAWAB = null; berhentiTik();
    lapis(R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>');
    (ST_JALAN || Promise.resolve()).then(function () { ST = null; return muatStatus(); }).then(function (h) { /* selalu status segar (panggilan lama ditunggu dulu) */
      if (!lapisEl) return;
      if (!h) { lapis(gagalHtml(ST && ST.mati ? 'Kuis belum dibuka admin.' : 'Cek sinyal, lalu coba lagi.')); return; }
      gambarStatus(h);
    });
  }
  function slotHtml(n, terisi, saya) {
    var h = ''; for (var i = 1; i <= n; i++) h += '<i class="' + (i <= terisi ? 'on' : '') + (saya === i ? ' saya' : '') + '">' + i + '</i>';
    return '<div class="kgSlot">' + h + '</div>';
  }
  function hasilSayaHtml(s, info) {
    if (!s || !s.sudahJawab) return '';
    if (s.terlambat) return '<div class="kgHasil salah"><span class="ik">⏱</span><div><b>Waktu habis</b><small>Jawaban lewat 30 detik, tidak dihitung.</small></div></div>';
    if (s.benar) return '<div class="kgHasil benar"><span class="ik">' + (s.poin ? '🎉' : '✅') + '</span><div><b>Benar!' + (s.urutan ? ' Urutan ke-' + esc(s.urutan) : '') + (s.poin ? ' → +' + esc(s.poin) + ' poin' : '') + '</b><small>' + (s.detik != null ? 'Dijawab dalam ' + esc(String(s.detik).replace('.', ',')) + ' detik. ' : '') + (s.poin ? '' : s.urutan && s.urutan > 10 ? '10 tercepat sudah terisi, tetap mantap!' : '') + '</small></div></div>';
    return '<div class="kgHasil salah"><span class="ik">✗</span><div><b>Belum tepat</b><small>' + (info && info.tutupJam ? 'Kunci & penjelasan muncul jam ' + esc(info.tutupJam) + '.' : 'Lihat kunci & penjelasan sesudah sesi ditutup.') + '</small></div></div>';
  }
  function gambarStatus(h) {
    var s = h.sekarang, l = h.lalu, out = '';
    if (s && s.terbuka) {
      var tj = jamT(String(s.tutup || '').slice(11, 16)), terisi = 10 - (Number(s.slotTersisa) >= 0 ? Number(s.slotTersisa) : 10);
      if (s.saya && s.saya.sudahJawab) {
        out += '<div class="kgKuisKp"><div class="atas"><span>SESI ' + esc(jamT(s.jam)) + ' · ' + esc(tglPendek(s.mulai)) + '</span><span>tutup ' + esc(tj) + '</span></div><h3>Kamu sudah menjawab sesi ini.</h3><p>' + esc(s.penjawab || 0) + ' driver sudah menjawab.</p></div>'
          + hasilSayaHtml(s.saya, { tutupJam: tj });
      } else {
        out += '<div class="kgKuisKp"><div class="atas"><span>SESI ' + esc(jamT(s.jam)) + ' · ' + esc(tglPendek(s.mulai)) + '</span><span>tutup ' + esc(tj) + '</span></div>'
          + '<h3>Siap? 1 soal safety, 30 detik.</h3><p>Waktu mulai berjalan begitu soal dibuka dan tidak bisa diulang. Sekali jawab. 10 jawaban benar tercepat dapat <b>+' + esc(h.poin || 10) + ' poin</b>.</p>'
          + '<button type="button" class="kgMulai" data-kq="mulai:' + esc(s.id) + '">' + (s.saya && s.saya.sudahBuka ? 'Lanjutkan soal' : 'Buka soal sekarang') + '</button></div>';
      }
      out += '<div class="kartu"><div class="hiBar"><b>10 benar tercepat · sesi ' + esc(jamT(s.jam)) + '</b><span>' + (Number(s.slotTersisa) > 0 ? esc(s.slotTersisa) + ' jatah lagi' : 'jatah habis') + '</span></div>' + slotHtml(10, terisi, s.saya && s.saya.poin ? s.saya.urutan : 0) + '</div>';
    } else if (h.berikut) {
      out += '<div class="kgKuisKp tunggu"><div class="atas"><span>SESI BERIKUT</span><span>' + esc(tglPendek(h.berikut.mulai)) + '</span></div><h3>Kuis ' + esc(jamT(h.berikut.jam)) + ' dibuka ' + esc(lagi((h.berikut.mulaiMs || msWib(h.berikut.mulai)) - kini())) + '</h3><p>Jadwal tiap hari: ' + esc((h.jadwal || []).map(jamT).join(' & ')) + ' WIB. Ada notifikasi saat sesi dibuka.</p></div>';
    }
    if (l && l.id && (!s || l.id !== s.id)) {
      out += '<h2 class="bagW">Sesi ' + esc(jamT(l.jam)) + ' · ' + esc(tglPendek(l.mulai)) + '</h2><div class="kartu kgLalu">'
        + (l.soal ? '<div class="kgLaluSoal">' + esc(l.soal) + '</div>' : '')
        + (l.kunciTeks ? '<div class="kgOpsi benar statis"><span class="h">✓</span><span>' + esc(l.kunciTeks) + '</span></div>' : '')
        + (l.penjelasan ? '<div class="kgJelas"><b>Penjelasan</b>' + esc(l.penjelasan) + '</div>' : '')
        + (l.saya && l.saya.sudahJawab ? hasilSayaHtml(l.saya) : '<div class="kecil" style="margin-top:8px">Kamu tidak ikut sesi ini.</div>')
        + ((l.pemenang || []).length ? '<div class="hiBar" style="margin-top:12px"><b>10 benar tercepat</b><span>' + esc(l.penjawab || 0) + ' penjawab</span></div><div class="kgJuara">' + l.pemenang.map(function (p) { return '<div><span class="no">' + esc(p.urut) + '</span><b>' + esc(KG() ? KG().namaTampil(p.nama) : p.nama) + '</b><em>' + esc(String(p.detik).replace('.', ',')) + ' dtk' + (p.poin ? ' · +' + esc(p.poin) : '') + '</em></div>'; }).join('') + '</div>' : '')
        + '</div>';
    }
    out += '<div class="kecil" style="margin:12px 4px;text-align:center">Waktu dihitung server, bukan jam HP. Bank soal disusun tim HSE WHL.</div>';
    lapis(out);
  }
  /* --- soal --- */
  function mulai(id) {
    if (sedangKirim) return; sedangKirim = true; R.getar('sedang');
    var b = lapisEl && lapisEl.querySelector('.kgMulai'); if (b) { b.disabled = true; b.innerHTML = '<span class="putar"></span> Membuka soal…'; }
    panggil('pusatKuisBuka', [id], 25000).then(function (h) {
      sedangKirim = false; if (!lapisEl) return;
      if (h && h.login === false) { tutup(); if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (!h || h.ok === false) { R.bunyi('gagal'); lapis(gagalHtml((h && h.pesan) || 'Soal belum bisa dibuka.')); return; }
      if (h.sudahJawab) { buka(); return; }
      SOAL = h; SOAL.batas = Date.now() + Math.max(0, Number(h.sisaMs) || 0); SOAL.id = h.sesiId || id; JAWAB = null;
      gambarSoal(); mulaiTik();
    }, function (e) { sedangKirim = false; if (lapisEl) { R.bunyi('gagal'); lapis(gagalHtml(e.message || 'Cek sinyal, lalu coba lagi.')); } });
  }
  function gambarSoal() {
    var h = SOAL, sisa = Math.max(0, h.batas - Date.now()), habis = sisa <= 0 && !JAWAB, j = JAWAB || {};
    var kls = function (i) { if (j.dipilih !== i) return j.dipilih != null || habis ? ' redup' : ''; if (j.kirim) return ' dipilih'; return j.hasil ? (j.hasil.benar ? ' benar' : ' salah') : ' dipilih'; };
    var out = '<div class="kgKuisKp soal' + (sisa <= 10000 && !JAWAB ? ' genting' : '') + '"><div class="atas"><span>' + esc(String(h.topik || 'SAFETY').toUpperCase()) + '</span>' + (j.hasil ? '<span>✓ terjawab</span>' : '<span class="kgDetik">⏱ <b id="kgDetik">' + Math.ceil(sisa / 1000) + '</b> dtk</span>') + '</div>'
      + '<h3>' + esc(h.soal) + '</h3><div class="kgWaktu"><i id="kgWaktuBar" style="width:' + (sisa / ((h.batasDetik || 30) * 10)).toFixed(1) + '%"></i></div></div>'
      + (h.pilihan || []).map(function (p, i) { return '<button type="button" class="kgOpsi' + kls(i) + '" data-kq="jawab:' + i + '"' + (j.dipilih != null || habis ? ' disabled' : '') + '><span class="h">' + 'ABCD'.charAt(i) + '</span><span>' + esc(p) + '</span></button>'; }).join('');
    if (j.kirim) out += '<div class="kgHasil tunggu"><span class="putar"></span><div><b>Mengirim jawaban…</b><small>Jangan tutup layar ini.</small></div></div>';
    else if (j.galat) out += '<div class="kgHasil salah"><span class="ik">!</span><div><b>Jawaban belum terkirim</b><small>' + esc(j.galat) + '</small><button type="button" class="tKecil" data-kq="kirimUlang" style="margin-top:8px">Kirim ulang jawaban</button></div></div>';
    else if (j.hasil) {
      var x = j.hasil;
      out += x.terlambat ? '<div class="kgHasil salah"><span class="ik">⏱</span><div><b>Waktu habis</b><small>' + esc(x.pesan || 'Lewat 30 detik.') + '</small></div></div>'
        : x.benar ? '<div class="kgHasil benar"><span class="ik">' + (x.poin ? '🎉' : '✅') + '</span><div><b>Benar!' + (x.urutan ? ' Urutan ke-' + esc(x.urutan) : '') + (x.poin ? ' → +' + esc(x.poin) + ' poin' : '') + '</b><small>' + (x.detik != null ? 'Dijawab dalam ' + esc(String(x.detik).replace('.', ',')) + ' detik. ' : '') + (x.poin ? 'Poin masuk ke Poin WHL.' : esc(x.pesan || '')) + (x.kunciMuncul ? ' Penjelasan muncul jam ' + esc(jamT(String(x.kunciMuncul).slice(11, 16))) + '.' : '') + '</small></div></div>'
        : '<div class="kgHasil salah"><span class="ik">✗</span><div><b>Belum tepat</b><small>' + esc(String(x.pesan || '').replace(/^Belum tepat\.\s*/i, '').replace(/(\d{2}):(\d{2})/g, '$1.$2')) + ' Tetap semangat, ikut sesi berikutnya ya.</small></div></div>';
      out += '<button type="button" class="tUtama" data-kq="selesai" style="margin-top:12px">Selesai</button>';
    } else if (habis) out += '<div class="kgHasil salah"><span class="ik">⏱</span><div><b>Waktu habis</b><small>30 detik sudah lewat, sesi ini tidak dapat poin. Ikut sesi berikutnya ya.</small></div></div><button type="button" class="tUtama" data-kq="selesai" style="margin-top:12px">Selesai</button>';
    else out += '<div class="kecil" style="margin:10px 4px;text-align:center">Pilih satu jawaban. Sekali pilih langsung terkirim.</div>';
    lapis(out, 'Sesi ' + jamT(String(h.sesiId || '').slice(-2)) + '.00');
  }
  function mulaiTik() {
    berhentiTik();
    tik = setInterval(function () {
      if (!lapisEl || !SOAL) { berhentiTik(); return; }
      var sisa = Math.max(0, SOAL.batas - Date.now()), el = document.getElementById('kgDetik'), bar = document.getElementById('kgWaktuBar');
      if (el) el.textContent = Math.ceil(sisa / 1000); if (bar) bar.style.width = (sisa / ((SOAL.batasDetik || 30) * 10)).toFixed(1) + '%';
      var kp = lapisEl.querySelector('.kgKuisKp'); if (kp && !JAWAB) kp.classList.toggle('genting', sisa <= 10000);
      if (sisa <= 0) { berhentiTik(); if (!JAWAB) { R.bunyi('gagal'); R.getar('gagal'); gambarSoal(); } }
    }, 200);
  }
  function berhentiTik() { clearInterval(tik); tik = null; }
  function jawab(i) {
    if (!SOAL || JAWAB || SOAL.batas - Date.now() <= 0) return;
    JAWAB = { dipilih: i, kirim: true }; R.getar('sedang'); berhentiTik(); gambarSoal(); kirim();
  }
  function kirim() {
    JAWAB.kirim = true; JAWAB.galat = null;
    panggil('pusatKuisJawab', [SOAL.id, JAWAB.dipilih], 30000).then(function (h) {
      if (!JAWAB) return; JAWAB.kirim = false;
      if (h && h.login === false) { tutup(); if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (!h || h.ok === false) { JAWAB.galat = (h && h.pesan) || 'Server menolak.'; R.bunyi('gagal'); gambarSoal(); return; }
      var x = h.sudah && h.hasil ? { benar: h.hasil.benar, terlambat: h.hasil.terlambat, urutan: h.hasil.urutan, poin: h.hasil.poin, detik: h.hasil.detik, pesan: h.pesan } : h;
      JAWAB.hasil = x;
      if (x.benar) { R.bunyi(x.poin ? 'achievement' : 'sukses'); R.getar('sukses'); if (x.poin && R.konfeti) R.konfeti(); } else { R.bunyi('gagal'); R.getar('gagal'); }
      ST = null; if (KG()) KG().muat(null, true);
      gambarSoal();
    }, function (e) { if (!JAWAB) return; JAWAB.kirim = false; JAWAB.galat = (e && e.message) || 'Sinyal putus.'; R.bunyi('gagal'); gambarSoal(); });
  }
  function klik(ev) {
    var b = ev.target.closest('[data-kq]'); if (!b || b.disabled) return; var n = b.getAttribute('data-kq');
    if (n === 'tutup' || n === 'selesai') { R.bunyi('tutup'); if (n === 'selesai') { buka(); return; } tutup(); }
    else if (n === 'ulang') buka();
    else if (n.indexOf('mulai:') === 0) mulai(n.slice(6));
    else if (n.indexOf('jawab:') === 0) jawab(+n.slice(6));
    else if (n === 'kirimUlang' && JAWAB) { kirim(); gambarSoal(); }
  }
  /* kartu Beranda & menu grid (data-kg="kuis" / data-ke="kg:kuis") — pendengar sendiri, tidak menyentuh pengendali klik app.js */
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-kg="kuis"], [data-ke="kg:kuis"]'); if (!b || b.closest('.lapis')) return;
    var c = CTX || (KG() && KG().ctx()); R.bunyi('sheet'); buka(c);
  });
  function lupakan() { ST = null; clearTimeout(tunda); tunda = null; tutup(); }

  window.WHL_KUIS = { aktif: aktif, kartuHtml: kartuHtml, buka: buka, tutup: tutup, muatStatus: muatStatus, lupakan: lupakan };
})();
