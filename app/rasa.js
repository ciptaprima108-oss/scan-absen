/* WHL App v2.2 — "rasa" aplikasi: suara, getar, animasi, keypad PIN, layar sukses, lembar tanya, onboarding, tarik-segarkan.
 * SEMUA SUARA ORISINAL: disintesis di HP dengan WebAudio (gelombang sinus/segitiga buatan kode ini), tidak ada file audio,
 * tidak ada suara dari aplikasi lain. Daftar & resepnya ada di DAFTAR-SUARA.txt.
 * Efek berat (konfeti, kabur latar, pegas) otomatis dimatikan kalau HP minta "kurangi gerakan" atau HP kelas bawah.
 */
(function () {
  'use strict';
  var Simpan = window.WHL_API.Simpan, KUNCI = 'whlV2Rasa';
  var setel = { suara: true, getar: true };
  var kurangGerak = false; try { kurangGerak = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* */ }
  var kentang = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  var hemat = kurangGerak || !!kentang;
  document.documentElement.classList.toggle('hemat', hemat);
  document.documentElement.classList.toggle('diam', kurangGerak);
  /* ukur sekali: kalau layar tidak sanggup ±50 fps, pindah ke mode hemat */
  if (!hemat && window.requestAnimationFrame) {
    var n = 0, t0 = 0;
    var ukur = function (t) { if (!t0) t0 = t; n++; if (t - t0 < 600) requestAnimationFrame(ukur); else if (n / ((t - t0) / 1000) < 45 && !document.hidden) { hemat = true; document.documentElement.classList.add('hemat'); } };
    setTimeout(function () { requestAnimationFrame(ukur); }, 1500);
  }
  Simpan.ambil(KUNCI).then(function (v) { try { var o = JSON.parse(v || 'null'); if (o) { setel.suara = o.suara !== false; setel.getar = o.getar !== false; } } catch (e) { /* */ } });
  function aturSetel(k, v) { setel[k] = !!v; Simpan.taruh(KUNCI, JSON.stringify(setel)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- SUARA (WebAudio, orisinal) ---------- */
  var ctx = null, induk = null;
  function senyap() { try { var a = window.AndroidDownloader; return !!(a && typeof a.modeSenyap === 'function' && a.modeSenyap()); } catch (e) { return false; } } // Android: HP mode senyap/getar. iPhone: WebAudio ikut tombol senyap dengan sendirinya.
  function audio() {
    if (ctx) return ctx;
    var A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    try { ctx = new A(); induk = ctx.createGain(); induk.gain.value = 0.5; induk.connect(ctx.destination); } catch (e) { ctx = null; }
    return ctx;
  }
  /** satu nada: f = Hz awal, f2 = Hz akhir (geser), mulai & lama dalam detik, kuat 0..1 */
  function nada(f, mulai, lama, jenis, kuat, f2) {
    var c = audio(); if (!c) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + mulai;
    o.type = jenis || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + lama);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kuat, t + Math.min(0.012, lama / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + lama);
    o.connect(g); g.connect(induk); o.start(t); o.stop(t + lama + 0.02);
  }
  var RESEP = {
    ketuk: function () { nada(920, 0, 0.045, 'sine', 0.10, 700); },
    sheet: function () { nada(320, 0, 0.11, 'sine', 0.07, 560); },
    sukses: function () { nada(784, 0, 0.14, 'triangle', 0.16); nada(988, 0.09, 0.14, 'triangle', 0.16); nada(1319, 0.18, 0.32, 'triangle', 0.18); nada(2637, 0.18, 0.28, 'sine', 0.04); },
    gagal: function () { nada(370, 0, 0.16, 'triangle', 0.16, 330); nada(262, 0.14, 0.26, 'triangle', 0.16, 220); },
    pinSalah: function () { nada(196, 0, 0.07, 'triangle', 0.18); nada(196, 0.11, 0.09, 'triangle', 0.18, 175); },
    notifikasi: function () { nada(1047, 0, 0.22, 'sine', 0.13); nada(1397, 0.12, 0.36, 'sine', 0.12); },
    achievement: function () { [523, 659, 784, 1047].forEach(function (f, i) { nada(f, i * 0.085, 0.2, 'triangle', 0.15); }); nada(1568, 0.36, 0.5, 'sine', 0.10); nada(3136, 0.40, 0.42, 'sine', 0.035); }
  };
  function bunyi(nm) {
    if (!setel.suara || !RESEP[nm] || document.hidden || senyap()) return;
    var c = audio(); if (!c) return;
    try { if (c.state === 'suspended') c.resume(); RESEP[nm](); } catch (e) { /* */ }
  }

  /* ---------- GETAR (Capacitor Haptics, cadangan navigator.vibrate) ---------- */
  function haptik() { try { var c = window.Capacitor; return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.Haptics ? c.Plugins.Haptics : null; } catch (e) { return null; } }
  function getar(jenis) {
    if (!setel.getar) return;
    var h = haptik();
    try {
      if (h) {
        if (jenis === 'sukses') h.notification({ type: 'SUCCESS' }); else if (jenis === 'gagal') h.notification({ type: 'ERROR' }); else if (jenis === 'awas') h.notification({ type: 'WARNING' });
        else h.impact({ style: jenis === 'sedang' ? 'MEDIUM' : 'LIGHT' });
      } else if (navigator.vibrate) navigator.vibrate(jenis === 'gagal' ? [40, 60, 40] : jenis === 'sukses' ? [18, 50, 30] : jenis === 'awas' ? [30, 40, 30] : 10);
    } catch (e) { /* */ }
  }

  /* ---------- ANGKA NAIK ---------- */
  function hitungNaik(akar) {
    var L = akar.querySelectorAll('[data-naik]');
    Array.prototype.forEach.call(L, function (el) {
      var tujuan = Number(el.getAttribute('data-naik')), des = Number(el.getAttribute('data-des') || 0);
      if (!isFinite(tujuan)) return;
      var tulis = function (v) { el.textContent = v.toLocaleString('id-ID', { minimumFractionDigits: des, maximumFractionDigits: des }); };
      if (hemat || tujuan === 0) { tulis(tujuan); return; }
      var t0 = 0, lama = 650;
      var langkah = function (t) { if (!t0) t0 = t; var p = Math.min(1, (t - t0) / lama), e = 1 - Math.pow(1 - p, 3); tulis(tujuan * e); if (p < 1 && el.isConnected) requestAnimationFrame(langkah); else tulis(tujuan); };
      tulis(0); requestAnimationFrame(langkah);
    });
  }

  /* ---------- KONFETI RINGAN ---------- */
  function konfeti() {
    if (hemat) return;
    var c = document.createElement('canvas'), W = c.width = window.innerWidth, H = c.height = window.innerHeight, g = c.getContext('2d');
    c.className = 'konfeti'; document.body.appendChild(c);
    var warna = ['#56b0ff', '#2f8ef0', '#2bc97c', '#ffd36a', '#ffffff', '#9ccaff'], P = [];
    for (var i = 0; i < 70; i++) P.push({ x: W / 2 + (Math.random() - 0.5) * 80, y: H * 0.32, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 3, s: 4 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, w: warna[i % warna.length] });
    var t0 = 0;
    var gbr = function (t) {
      if (!t0) t0 = t; var u = (t - t0) / 1600; g.clearRect(0, 0, W, H);
      P.forEach(function (p) { p.vy += 0.28; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - u); g.fillStyle = p.w; g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.66); g.restore(); });
      if (u < 1) requestAnimationFrame(gbr); else c.remove();
    };
    requestAnimationFrame(gbr);
  }

  /* ---------- LAPIS PENUH (keypad PIN, sukses, onboarding) ---------- */
  function lapis(kelas, html) {
    var d = document.createElement('div'); d.className = 'lapis ' + kelas; d.innerHTML = html; document.body.appendChild(d);
    requestAnimationFrame(function () { d.classList.add('tampil'); });
    return d;
  }
  function tutupLapis(d) { d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, hemat ? 0 : 230); }

  /** Keypad PIN gaya bank. kirim(pin) -> Promise<string|null>: string = pesan salah (keypad bergetar, isi dihapus), null = benar (keypad ditutup).
   *  Mengembalikan Promise<boolean> (false = dibatalkan). */
  function mintaPin(o, kirim) {
    return new Promise(function (selesai) {
      var isi = '', sibuk = false;
      var tombol = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'h'].map(function (k) {
        if (!k) return '<span></span>';
        return '<button type="button" data-k="' + k + '"' + (k === 'h' ? ' aria-label="Hapus"' : '') + '>' + (k === 'h' ? '<svg viewBox="0 0 24 24"><path d="M9 6h11v12H9l-6-6z"/><path d="M12.500 9.500l4 5M16.500 9.500l-4 5"/></svg>' : k) + '</button>';
      }).join('');
      var d = lapis('pinLapis', '<div class="pinAtas"><button type="button" class="pinBatal" data-k="x">Batal</button></div>'
        + '<div class="pinTengah"><img src="img/logo-whl.png" alt="" class="logo" style="width:54px;height:54px;margin:0 auto 14px"><h2>' + esc(o.judul || 'Masukkan PIN') + '</h2><p>' + esc(o.ket || 'PIN Pusat WHL 4 angka') + '</p>'
        + '<div class="titik" aria-live="polite"><i></i><i></i><i></i><i></i></div><div class="pinPesan" role="alert"></div></div><div class="papan">' + tombol + '</div>');
      var titik = d.querySelector('.titik'), pesan = d.querySelector('.pinPesan');
      function gambar() { Array.prototype.forEach.call(titik.children, function (t, i) { t.classList.toggle('isi', i < isi.length); }); }
      function tekan(k) {
        if (sibuk) return;
        if (k === 'x') { tutupLapis(d); selesai(false); return; }
        if (k === 'h') { isi = isi.slice(0, -1); bunyi('ketuk'); getar(); gambar(); return; }
        if (isi.length >= 4) return;
        isi += k; bunyi('ketuk'); getar(); pesan.textContent = ''; gambar();
        if (isi.length === 4) {
          sibuk = true; titik.classList.add('tunggu');
          var pin = isi;
          Promise.resolve().then(function () { return kirim(pin); }).then(function (salah) {
            sibuk = false; titik.classList.remove('tunggu');
            if (salah) { isi = ''; gambar(); pesan.textContent = salah; titik.classList.remove('goyang'); void titik.offsetWidth; titik.classList.add('goyang'); bunyi('pinSalah'); getar('gagal'); }
            else { tutupLapis(d); selesai(true); }
          }, function (e) { sibuk = false; titik.classList.remove('tunggu'); isi = ''; gambar(); pesan.textContent = 'Koneksi gagal: ' + (e && e.message || e) + '. Coba lagi.'; bunyi('gagal'); getar('gagal'); });
        }
      }
      d.addEventListener('click', function (ev) { var b = ev.target.closest('[data-k]'); if (b) tekan(b.getAttribute('data-k')); });
      d._tekan = tekan; // dipakai uji
    });
  }

  /** Layar sukses penuh: centang beranimasi + ringkasan + tombol Selesai. */
  function sukses(o) {
    return new Promise(function (selesai) {
      var baris = (o.rinci || []).filter(function (r) { return r[1] != null && r[1] !== ''; }).map(function (r) { return '<div><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('');
      var d = lapis('suksesLapis', '<div class="suksesIsi"><svg class="centang" viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="44"/><path d="M28 50l14 14 27-31"/></svg><h2>' + esc(o.judul || 'Berhasil') + '</h2><p>' + esc(o.sub || '') + '</p>'
        + (baris ? '<div class="rinci">' + baris + '</div>' : '') + '</div><div class="suksesBawah"><button type="button" class="tUtama" style="margin-top:0">Selesai</button></div>');
      setTimeout(function () { bunyi(o.suara || 'sukses'); getar('sukses'); if (o.konfeti !== false) konfeti(); }, 180);
      d.querySelector('button').addEventListener('click', function () { bunyi('ketuk'); tutupLapis(d); selesai(); });
    });
  }

  /** Lembar tanya (bottom sheet konfirmasi). -> Promise<boolean> */
  function tanya(o) {
    return new Promise(function (selesai) {
      var d = document.createElement('div'); d.className = 'tirai buka';
      d.innerHTML = '<div class="lembar"><div class="pegangan"></div><h3>' + esc(o.judul) + '</h3><div class="kecil" style="margin:4px 0 16px;font-size:14px">' + esc(o.ket || '') + '</div><div class="duaTombol"><button type="button" class="tKecil" data-j="0">' + esc(o.tidak || 'Batal') + '</button><button type="button" class="tUtama' + (o.bahaya ? ' tMerah' : '') + '" style="margin-top:0" data-j="1">' + esc(o.ya || 'Ya') + '</button></div></div>';
      document.body.appendChild(d); bunyi('sheet');
      d.addEventListener('click', function (ev) { var b = ev.target.closest('[data-j]'); if (!b && ev.target !== d) return; d.remove(); selesai(!!b && b.getAttribute('data-j') === '1'); });
    });
  }

  /** Onboarding 3 slide (sekali per HP). Ilustrasi = SVG buatan sendiri. */
  function onboarding() {
    var SL = [
      ['<svg viewBox="0 0 120 120"><rect x="34" y="14" width="52" height="92" rx="10"/><circle cx="60" cy="50" r="13"/><path d="M42 82c4-10 32-10 36 0"/><path d="M52 22h16"/></svg>', 'Absen dari HP sendiri', 'Di area site, cukup hadapkan wajah ke kamera. Wajah dipindai otomatis, tidak perlu antre di tablet.'],
      ['<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="40"/><path d="M60 20a40 40 0 0 1 34 61" class="tebal"/><path d="M46 62l10 10 20-23"/></svg>', 'Lihat nilai kerjamu', 'Profil, lencana, achievement dan KPI bulan ini ada di tab foto kamu di pojok kanan atas.'],
      ['<svg viewBox="0 0 120 120"><rect x="16" y="20" width="38" height="34" rx="9"/><rect x="66" y="20" width="38" height="34" rx="9"/><rect x="16" y="66" width="38" height="34" rx="9"/><rect x="66" y="66" width="38" height="34" rx="9"/><path d="M28 37h14M78 37h14M28 83h14M85 76v14M78 83h14"/></svg>', 'Semua sistem WHL, satu pintu', 'Ringkasan hari ini di Beranda. Form dan aplikasi lain ada di tombol + dan tab Aplikasi.']
    ];
    return new Promise(function (selesai) {
      var i = 0;
      var d = lapis('onLapis', '<div class="onAtas"><button type="button" class="pinBatal" data-o="lewati">Lewati</button></div><div class="onIsi"></div><div class="onBawah"><div class="onTitik"><i></i><i></i><i></i></div><button type="button" class="tUtama" style="margin-top:0" data-o="lanjut">Lanjut</button></div>');
      var isi = d.querySelector('.onIsi'), tb = d.querySelector('[data-o="lanjut"]');
      function gambar() {
        isi.innerHTML = '<div class="onSlide">' + SL[i][0] + '<h2>' + SL[i][1] + '</h2><p>' + SL[i][2] + '</p></div>';
        Array.prototype.forEach.call(d.querySelectorAll('.onTitik i'), function (t, k) { t.classList.toggle('on', k === i); });
        tb.textContent = i === SL.length - 1 ? 'Mulai' : 'Lanjut';
      }
      function tutup() { tutupLapis(d); selesai(); }
      d.addEventListener('click', function (ev) { var b = ev.target.closest('[data-o]'); if (!b) return; bunyi('ketuk'); getar(); if (b.getAttribute('data-o') === 'lewati' || i === SL.length - 1) tutup(); else { i++; gambar(); } });
      var x0 = null; d.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      d.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (dx < -50 && i < SL.length - 1) { i++; gambar(); } else if (dx > 50 && i > 0) { i--; gambar(); } }, { passive: true });
      gambar();
    });
  }

  /** Tarik ke bawah untuk menyegarkan (hanya saat halaman di paling atas). */
  function pasangTarik(boleh, segar) {
    var el = document.createElement('div'); el.className = 'tarik'; el.innerHTML = '<span class="putar"></span>'; document.body.appendChild(el);
    var y0 = null, dy = 0, aktif = false;
    document.addEventListener('touchstart', function (e) { if (!boleh() || window.scrollY > 0 || e.touches.length !== 1) { y0 = null; return; } y0 = e.touches[0].clientY; dy = 0; aktif = false; }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (y0 == null) return; dy = e.touches[0].clientY - y0;
      if (dy > 12 && window.scrollY <= 0) { aktif = true; var t = Math.min(90, dy * 0.45); el.style.transform = 'translate(-50%,' + (t - 50) + 'px)'; el.style.opacity = Math.min(1, t / 60); el.classList.toggle('siap', t >= 62); }
    }, { passive: true });
    document.addEventListener('touchend', function () {
      if (y0 == null) return; y0 = null;
      if (aktif && dy * 0.45 >= 62) { el.classList.add('jalan'); el.style.transform = 'translate(-50%,14px)'; bunyi('ketuk'); getar('sedang'); Promise.resolve(segar()).then(function () { setTimeout(function () { el.classList.remove('jalan', 'siap'); el.style.transform = ''; el.style.opacity = 0; }, 500); }); }
      else { el.style.transform = ''; el.style.opacity = 0; el.classList.remove('siap'); }
    }, { passive: true });
  }

  /** Kerangka (skeleton) saat memuat. */
  function kerangka(jenis) {
    var k = function (h, w, lain) { return '<div class="kr" style="height:' + h + 'px;' + (w ? 'width:' + w + ';' : '') + (lain || '') + '"></div>'; };
    if (jenis === 'kisi') return '<div class="grid2">' + k(86, '', 'grid-column:1/-1;border-radius:18px') + k(112, '', 'border-radius:18px') + k(112, '', 'border-radius:18px') + k(112, '', 'border-radius:18px') + k(112, '', 'border-radius:18px') + '</div>';
    if (jenis === 'daftar') return '<div class="kartu">' + [1, 2, 3, 4].map(function () { return '<div style="display:flex;gap:10px;align-items:center;padding:8px 0">' + k(36, '36px', 'border-radius:50%;flex:none') + '<div style="flex:1">' + k(13, '60%') + '<div style="height:6px"></div>' + k(11, '40%') + '</div></div>'; }).join('') + '</div>';
    return '<div class="kartu">' + k(18, '50%') + '<div style="height:10px"></div>' + k(12, '90%') + '<div style="height:6px"></div>' + k(12, '70%') + '</div>';
  }
  /** Keadaan kosong bergambar (SVG buatan sendiri). */
  function kosong(judul, ket) {
    return '<div class="kosongGbr"><svg viewBox="0 0 120 90" aria-hidden="true"><path d="M14 70h92"/><rect x="26" y="34" width="44" height="28" rx="4"/><path d="M70 42h16l10 10v10H70z"/><circle cx="40" cy="66" r="6"/><circle cx="84" cy="66" r="6"/><path d="M34 22c4-6 12-6 15 0 6-2 11 2 10 7H30c-3-3-1-7 4-7z"/></svg><b>' + esc(judul) + '</b><span>' + esc(ket || '') + '</span></div>';
  }

  window.WHL_RASA = { paksaHemat: function () { hemat = true; document.documentElement.classList.add('hemat', 'diam'); }, setel: setel, aturSetel: aturSetel, hemat: function () { return hemat; }, bunyi: bunyi, getar: getar, hitungNaik: hitungNaik, konfeti: konfeti, mintaPin: mintaPin, sukses: sukses, tanya: tanya, onboarding: onboarding, pasangTarik: pasangTarik, kerangka: kerangka, kosong: kosong, daftarSuara: Object.keys(RESEP) };
})();
