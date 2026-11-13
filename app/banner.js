/* WHL App v3.6 — BANNER / POSTER PENGUMUMAN di Beranda (karusel geser otomatis + titik indikator, rasio 2:1).
 * Sumber: Firestore koleksi `banner` (judul, sub, gambar <=300 KB base64 / https github.io, tujuan, mulai-sampai, aktif, urut) — dibaca
 * lewat login forum (token staf). Hanya ADMIN (klaim admin, Reza & Fanza) yang melihat "Kelola banner" dan boleh menulis (aturan Firestore).
 * Banner bawaan buatan sendiri tampil di belakang banner dari server.
 */
(function () {
  'use strict';
  var R = window.WHL_RASA, Simpan = window.WHL_API.Simpan;
  var DARI = [], CTX = null, putar = null, lapisEl = null, hapusSiap = '', SIMPAN = 'whlBanner';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function IK(n) { return window.WHL_IKON ? window.WHL_IKON(n) : ''; }
  function hariIni() { var d = new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000), p = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function tglKe(n) { var d = new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000); return d.getDate(); }

  /* ---------- banner bawaan (ilustrasi SVG buatan sendiri, palet WHL) ---------- */
  function ilus(jenis) {
    var truk = '<g transform="translate(212 58)"><rect x="0" y="22" width="78" height="40" rx="6" fill="#fff" opacity=".95"/><path d="M78 34h22l16 16v12H78z" fill="#fff" opacity=".85"/><rect x="84" y="38" width="16" height="10" rx="2" fill="#1565C0" opacity=".5"/><path d="M6 22c4-14 22-20 40-14 10-8 28-6 32 6" fill="#0D2A55" opacity=".85"/><circle cx="18" cy="66" r="9" fill="#0D2A55"/><circle cx="18" cy="66" r="4" fill="#fff"/><circle cx="62" cy="66" r="9" fill="#0D2A55"/><circle cx="62" cy="66" r="4" fill="#fff"/><circle cx="100" cy="66" r="9" fill="#0D2A55"/><circle cx="100" cy="66" r="4" fill="#fff"/></g>';
    var lonceng = '<g transform="translate(236 40)"><circle cx="50" cy="50" r="46" fill="#fff" opacity=".18"/><path d="M28 70V48a22 22 0 0 1 44 0v22l7 9H21z" fill="#fff"/><path d="M42 84a8 8 0 0 0 16 0" fill="#FFC857"/><circle cx="76" cy="26" r="10" fill="#FF6B6B"/><path d="M6 40q-6 10 0 20M94 40q6 10 0 20" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/></g>';
    var papan = '<g transform="translate(228 34)"><rect x="8" y="6" width="84" height="104" rx="10" fill="#fff"/><rect x="30" y="0" width="40" height="14" rx="5" fill="#FFC857"/><path d="M22 40l6 6 12-12M22 64l6 6 12-12M22 88l6 6 12-12" stroke="#1565C0" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M48 42h30M48 66h30M48 90h22" stroke="#9CC6FA" stroke-width="5" stroke-linecap="round"/></g>';
    var dasar = '<circle cx="330" cy="10" r="70" fill="#fff" opacity=".07"/><circle cx="20" cy="170" r="60" fill="#fff" opacity=".06"/><path d="M0 150 Q 90 120 180 146 T 360 136 V180 H0z" fill="#fff" opacity=".08"/>';
    return '<svg viewBox="0 0 360 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + dasar + (jenis === 'notif' ? lonceng : jenis === 'ksn' ? papan : truk) + '</svg>';
  }
  function bawaan() {
    var L = [{ id: 'b-sambut', judul: 'Selamat datang di WHL App', sub: 'Pusat WHL, forum, notifikasi & nilai kerja dalam satu app.', ilus: 'truk', warna: 'biru', tujuan: { jenis: 'tab', nilai: 'apps' } },
      { id: 'b-notif', judul: 'Aktifkan notifikasi', sub: 'Pesan forum & tiket Pos Kontrol langsung berbunyi walau app ditutup.', ilus: 'notif', warna: 'tua', tujuan: { jenis: 'tab', nilai: 'akun' } }];
    var t = tglKe(); L.push({ id: 'b-ksn', judul: t >= 25 ? 'Kuesioner rekan kerja dibuka' : 'Kuesioner dibuka tanggal 25', sub: t >= 25 ? 'Nilai sikap & kepatuhan SOP rekan kerja, anonim.' : 'Siapkan penilaian rekan kerja kamu sampai akhir bulan.', ilus: 'ksn', warna: 'ungu', tujuan: { jenis: 'aksi', nilai: 'ksn' } });
    return L;
  }
  function aktif(b) { var h = hariIni(); return b.aktif !== false && (!b.mulai || b.mulai <= h) && (!b.sampai || b.sampai >= h); }
  function daftar() { return DARI.filter(aktif).sort(function (a, b) { return (a.urut || 0) - (b.urut || 0); }).slice(0, 8).concat(bawaan()); }

  /* ---------- muat dari Firestore (sesudah login forum) ---------- */
  Simpan.ambil(SIMPAN).then(function (v) { try { var a = JSON.parse(v || '[]'); if (Array.isArray(a) && !DARI.length) DARI = a; } catch (e) { /* */ } });
  function muat() {
    return new Promise(function (ok) {
      var n = 0, i = setInterval(function () {
        var F = window.WHL_FORUM && window.WHL_FORUM.fs();
        if (!F && ++n < 60) return; clearInterval(i); if (!F) return ok(false);
        F.db.collection('banner').get().then(function (s) {
          var L = []; s.forEach(function (d) { var x = d.data(); x.id = d.id; delete x.waktu; L.push(x); });
          DARI = L; try { Simpan.taruh(SIMPAN, JSON.stringify(L.filter(aktif).slice(0, 6))); } catch (e) { /* */ } ok(true);
        }, function () { ok(false); });
      }, 500);
    });
  }
  function admin() { var F = window.WHL_FORUM && window.WHL_FORUM.fs(); return !!(F && F.info.admin); }

  /* ---------- karusel ---------- */
  function html() {
    var L = daftar();
    return '<div class="bnrKotak"><div class="bnrGeser" id="bnrGeser">' + L.map(function (b, i) {
      var isi = b.gambar ? '<img src="' + esc(b.gambar) + '" alt="" loading="lazy">' + (b.judul ? '<div class="bnrTeks gelap"><b>' + esc(b.judul) + '</b>' + (b.sub ? '<small>' + esc(b.sub) + '</small>' : '') + '</div>' : '')
        : '<span class="bnrIlus">' + ilus(b.ilus) + '</span><div class="bnrTeks"><b>' + esc(b.judul) + '</b><small>' + esc(b.sub || '') + '</small></div>';
      return '<button type="button" class="bnr ' + (b.warna || 'biru') + (b.gambar ? ' foto' : '') + '" data-bnr="' + i + '" aria-label="' + esc(b.judul) + '">' + isi + '</button>';
    }).join('') + '</div><div class="bnrTitik" id="bnrTitik">' + L.map(function (b, i) { return '<i class="' + (i ? '' : 'on') + '"></i>'; }).join('') + '</div>'
      + (admin() ? '<button type="button" class="bnrKelola" data-bnr-kelola="1">' + IK('input') + 'Kelola banner</button>' : '') + '</div>';
  }
  function pasang(ctx) {
    CTX = ctx; clearInterval(putar);
    var g = document.getElementById('bnrGeser'), t = document.getElementById('bnrTitik'); if (!g) return;
    var L = daftar(), ke = function (i) { g.scrollTo({ left: i * g.clientWidth, behavior: 'smooth' }); };
    g.addEventListener('scroll', function () { var i = Math.round(g.scrollLeft / Math.max(1, g.clientWidth)); Array.prototype.forEach.call(t.children, function (x, j) { x.classList.toggle('on', j === i); }); }, { passive: true });
    var diam = 0; g.addEventListener('touchstart', function () { diam = Date.now(); }, { passive: true });
    putar = setInterval(function () { if (!document.body.contains(g)) { clearInterval(putar); return; } if (document.hidden || Date.now() - diam < 8000 || L.length < 2) return; var i = Math.round(g.scrollLeft / Math.max(1, g.clientWidth)); ke((i + 1) % L.length); }, 5000);
    g.onclick = function (ev) { var b = ev.target.closest('[data-bnr]'); if (!b) return; var x = L[+b.getAttribute('data-bnr')]; if (x) tuju(x.tujuan || {}); };
    var k = document.querySelector('[data-bnr-kelola]'); if (k) k.onclick = kelola;
  }
  function tuju(t) {
    if (!CTX) return; R.bunyi('ketuk');
    if (t.jenis === 'forum') CTX.forum(t.nilai || 'umum'); else if (t.jenis === 'tab') CTX.tab(t.nilai || 'beranda'); else if (t.jenis === 'url' && /^https:\/\//.test(t.nilai || '')) CTX.web(t.nilai); else if (t.jenis === 'aksi') CTX.aksi(t.nilai);
  }

  /* ---------- KELOLA BANNER (admin) ---------- */
  function tutup() { if (!lapisEl) return; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); if (CTX && CTX.perbarui) CTX.perbarui(); }
  function lapis(h) {
    if (!lapisEl) { lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis bnrLapis'; document.body.appendChild(lapisEl); requestAnimationFrame(function () { lapisEl.classList.add('tampil'); }); lapisEl.addEventListener('click', klik); lapisEl.addEventListener('change', pilihFoto); }
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-k="tutup" aria-label="Kembali">‹</button><div class="nm">Khusus admin<b>Kelola banner</b></div></div><div class="ksnIsi">' + h + '</div>';
  }
  function kelola() {
    if (!admin()) { R.bunyi('gagal'); return; }
    lapis('<div class="kecil" style="text-align:center;padding:20px"><span class="putar"></span> Memuat banner...</div>');
    muat().then(gambarDaftar);
  }
  var EDIT = null, FOTO = '';
  function gambarDaftar() {
    var L = DARI.slice().sort(function (a, b) { return (a.urut || 0) - (b.urut || 0); }), h = hariIni();
    lapis('<button type="button" class="tUtama" data-k="baru" style="margin-top:0">+ Banner baru</button>'
      + '<div class="kecil" style="margin:10px 2px">Tampil di Beranda semua staf, urut dari angka kecil. Banner bawaan (Selamat datang, Notifikasi, Kuesioner) selalu di belakang.</div>'
      + (L.length ? '<div class="bingkai">' + L.map(function (b) {
        var st = !aktif(b) ? (b.aktif === false ? 'nonaktif' : (b.sampai && b.sampai < h ? 'sudah lewat' : 'belum mulai')) : 'tampil';
        return '<div class="bnrBaris"><span class="bnrMini">' + (b.gambar ? '<img src="' + esc(b.gambar) + '" alt="">' : '') + '</span><div class="tx"><b>' + esc(b.judul) + '</b><small>urut ' + esc(b.urut) + ' · ' + st + (b.mulai || b.sampai ? ' · ' + esc(b.mulai || '…') + ' s/d ' + esc(b.sampai || '…') : '') + '</small></div>'
          + '<button type="button" class="tKecil" data-k="ubah" data-id="' + esc(b.id) + '">Ubah</button><button type="button" class="tKecil' + (hapusSiap === b.id ? ' tMerah' : '') + '" data-k="hapus" data-id="' + esc(b.id) + '">' + (hapusSiap === b.id ? 'Ketuk lagi' : 'Hapus') + '</button></div>';
      }).join('') + '</div>' : (window.WHL_RASA.kosong ? window.WHL_RASA.kosong('Belum ada banner dari admin', 'Ketuk "+ Banner baru" untuk menambah.') : '')));
  }
  function form(b) {
    EDIT = b || null; FOTO = b && b.gambar || '';
    var t = (b && b.tujuan) || { jenis: 'tidak', nilai: '' };
    lapis('<div class="bnrPratinjau" id="bnrPra">' + (FOTO ? '<img src="' + esc(FOTO) + '" alt="">' : '<span>Belum ada gambar (rasio 2:1, mis. 1200×600)</span>') + '</div>'
      + '<label class="tKecil bnrPilih">' + IK('kotak') + ' Pilih gambar dari galeri<input type="file" accept="image/*" id="bnrFile" hidden></label><div class="kecil" id="bnrInfo" style="margin:6px 2px 0">Gambar dikompres di HP ini sampai ≤300 KB.</div>'
      + '<label class="lb" for="bnrJudul">Judul</label><input class="isian" id="bnrJudul" maxlength="80" value="' + esc(b && b.judul || '') + '">'
      + '<label class="lb" for="bnrSub">Keterangan (boleh kosong)</label><input class="isian" id="bnrSub" maxlength="140" value="' + esc(b && b.sub || '') + '">'
      + '<label class="lb" for="bnrTuju">Kalau diketuk</label><select class="isian" id="bnrTuju">' + [['tidak', 'Tidak ke mana-mana'], ['forum', 'Buka ruang forum'], ['tab', 'Buka layar app'], ['url', 'Buka alamat web (https)']].map(function (o) { return '<option value="' + o[0] + '"' + (t.jenis === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'
      + '<input class="isian" id="bnrNilai" placeholder="umum / pengawas · akun / kotak / unit · https://..." value="' + esc(t.nilai || '') + '" style="margin-top:8px">'
      + '<div class="baris" style="margin-top:4px"><div style="flex:1"><label class="lb" for="bnrMulai">Mulai</label><input class="isian" type="date" id="bnrMulai" value="' + esc(b && b.mulai || '') + '"></div><div style="flex:1"><label class="lb" for="bnrSampai">Sampai</label><input class="isian" type="date" id="bnrSampai" value="' + esc(b && b.sampai || '') + '"></div></div>'
      + '<div class="baris" style="align-items:flex-end"><div style="flex:1"><label class="lb" for="bnrUrut">Urutan (0–99)</label><input class="isian" type="number" min="0" max="99" id="bnrUrut" value="' + esc(b && b.urut != null ? b.urut : 1) + '"></div><label class="tKecil" style="display:flex;align-items:center;gap:8px;padding:0 14px;min-height:52px"><input type="checkbox" id="bnrAktif"' + (!b || b.aktif !== false ? ' checked' : '') + '> Tampilkan</label></div>'
      + '<div class="pesan" id="bnrPesan"></div><button type="button" class="tUtama" data-k="simpan">Simpan banner</button><button type="button" class="tKecil" data-k="daftar" style="width:100%;margin-top:8px">Batal</button>');
  }
  function kompres(file) {
    return new Promise(function (ok, gagal) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var W = 1200, H = 600, c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d');
        var s = Math.max(W / img.width, H / img.height), w = img.width * s, h = img.height * s; x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); URL.revokeObjectURL(url);
        var q = 0.86, d = c.toDataURL('image/jpeg', q); while (d.length > 400000 && q > 0.35) { q -= 0.08; d = c.toDataURL('image/jpeg', q); }
        if (d.length > 400000) { c.width = 900; c.height = 450; c.getContext('2d').drawImage(img, (900 - w * 0.75) / 2, (450 - h * 0.75) / 2, w * 0.75, h * 0.75); d = c.toDataURL('image/jpeg', 0.6); }
        if (d.length > 409600) return gagal(new Error('gambar masih terlalu besar')); ok(d);
      };
      img.onerror = function () { gagal(new Error('gambar tidak bisa dibaca')); }; img.src = url;
    });
  }
  function pilihFoto(ev) {
    if (ev.target.id !== 'bnrFile' || !ev.target.files[0]) return;
    var info = document.getElementById('bnrInfo'); info.textContent = 'Mengompres...';
    kompres(ev.target.files[0]).then(function (d) { FOTO = d; document.getElementById('bnrPra').innerHTML = '<img src="' + d + '" alt="">'; info.textContent = 'Siap: ' + Math.round(d.length * 0.75 / 1024) + ' KB (1200×600).'; }, function (e) { info.textContent = 'Gagal: ' + e.message; R.bunyi('gagal'); });
  }
  function nilai(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  function simpan() {
    var F = window.WHL_FORUM.fs(), p = document.getElementById('bnrPesan'), salah = function (t) { p.textContent = t; R.bunyi('gagal'); };
    if (!F || !F.info.admin) return salah('Khusus admin.');
    var jd = nilai('bnrJudul'), tj = nilai('bnrTuju'), nl = nilai('bnrNilai'), ur = parseInt(nilai('bnrUrut'), 10);
    if (!FOTO) return salah('Pilih gambar dulu.'); if (!jd) return salah('Judul belum diisi.');
    if (tj === 'url' && !/^https:\/\//.test(nl)) return salah('Alamat web harus diawali https://');
    if (!(ur >= 0 && ur <= 99)) ur = 1;
    var d = { judul: jd.slice(0, 80), sub: nilai('bnrSub').slice(0, 140), gambar: FOTO, tujuan: { jenis: tj, nilai: tj === 'tidak' ? '' : nl.slice(0, 300) }, mulai: nilai('bnrMulai') || null, sampai: nilai('bnrSampai') || null,
      aktif: document.getElementById('bnrAktif').checked, urut: ur, oleh: F.info.nama, waktu: F.FV.serverTimestamp() };
    p.textContent = 'Menyimpan...';
    var ref = EDIT ? F.db.collection('banner').doc(EDIT.id) : F.db.collection('banner').doc();
    ref.set(d).then(function () { R.bunyi('sukses'); muat().then(gambarDaftar); }, function (e) { salah('Gagal menyimpan: ' + (e && e.message || e)); });
  }
  function klik(ev) {
    var b = ev.target.closest('[data-k]'); if (!b) return; var k = b.getAttribute('data-k'), id = b.getAttribute('data-id');
    if (k === 'tutup') { if (document.getElementById('bnrJudul')) gambarDaftar(); else tutup(); }
    else if (k === 'baru') form(null); else if (k === 'daftar') gambarDaftar();
    else if (k === 'ubah') form(DARI.filter(function (x) { return x.id === id; })[0]);
    else if (k === 'simpan') simpan();
    else if (k === 'hapus') {
      if (hapusSiap !== id) { hapusSiap = id; gambarDaftar(); setTimeout(function () { if (hapusSiap === id) { hapusSiap = ''; if (lapisEl && !document.getElementById('bnrJudul')) gambarDaftar(); } }, 4000); return; }
      hapusSiap = ''; window.WHL_FORUM.fs().db.collection('banner').doc(id).delete().then(function () { R.bunyi('sukses'); muat().then(gambarDaftar); }, function (e) { R.bunyi('gagal'); alertLembut('Gagal menghapus: ' + e.message); });
    }
  }
  function alertLembut(t) { var p = document.getElementById('bnrPesan'); if (p) p.textContent = t; else if (CTX && CTX.roti) CTX.roti(t); }

  window.WHL_BANNER = { html: html, pasang: pasang, muat: muat, kelola: kelola, admin: admin, _uji: { form: form, setDari: function (L) { DARI = L; } } };
})();
