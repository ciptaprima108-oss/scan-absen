/* WHL App v2.10 — layar ASLI Kuesioner saling menilai (anonim) + pintu K3 (HSE Officer).
 * Mesin: Absensi Tambang, api "ksn" (Kuesioner.gs, live V29). Balasan JSON polos (tanpa bungkus hasil).
 *   ksnLogin [id, pin] · ksnStatus [token] · ksnKirim [token, rahasia, {nik, t[4], s[2], alasan}] · k3Daftar [token] · k3Simpan [token, {...}]
 * ANONIM: "rahasia" = teks acak 48 huruf yang dibuat SEKALI di perangkat ini (crypto.getRandomValues), disimpan hanya di penyimpanan app
 *   (Capacitor Preferences), tidak diturunkan dari NRP dan tidak pernah dikirim ke tempat lain selain bersama jawaban ke ksnKirim.
 * Jawaban yang sudah diisi disimpan di perangkat (server tidak bisa mengembalikannya). Aturan (sama dengan server & kuesioner.html):
 *   tidak menilai diri sendiri · nilai 1–2 atau 5 wajib alasan >= 10 huruf · "Tidak tahu" seluruhnya TIDAK dikirim · periode harus buka.
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA, Simpan = API.Simpan, K = window.WHL_KONFIG;
  var K_RHS = 'whlKsnRahasia';
  var ST = null, ISI = {}, CTX = null, lapisEl = null, bukaNik = '', cari = '', K3 = null, k3Buka = '';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function inisial(n) { var p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function rpc(fn, args) {
    return new Promise(function (ok, gagal) {
      var t = setTimeout(function () { gagal(new Error('Server lama menjawab. Cek sinyal, coba lagi.')); }, 60000);
      fetch(K.ABSEN, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ api: 'ksn', fn: fn, args: args || [] }), redirect: 'follow', cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (b) { clearTimeout(t); ok(b && b.hasil && b.ok === true && b.hasil.ok !== undefined ? b.hasil : (b || {})); }, function (e) { clearTimeout(t); gagal(e); });
    });
  }
  function token() { return (CTX && CTX.sesi && (CTX.sesi.tokenKsn || CTX.sesi.tokenAbm)) || ''; }
  function kunciIsi() { return 'whlKsnIsi_' + ST.periode + '_' + String(ST.nik || '').replace(/[^A-Za-z0-9]/g, ''); }
  function simpanIsi() { return Simpan.taruh(kunciIsi(), JSON.stringify(ISI)); }
  function rahasia() {
    return Simpan.ambil(K_RHS).then(function (r) {
      if (/^[A-Za-z0-9_-]{32,80}$/.test(r)) return r;
      var a = new Uint8Array(48), h = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', o = '';
      (window.crypto || window.msCrypto).getRandomValues(a); for (var i = 0; i < a.length; i++) o += h.charAt(a[i] % 64);
      return Simpan.taruh(K_RHS, o).then(function () { return o; });
    });
  }
  function rekan() { return ST ? (ST.staf || []).filter(function (o) { return o.nik !== ST.nik; }) : []; }
  function statusOrang(nik) { var x = ISI[nik]; return !x ? 'belum' : x.kirim ? 'ok' : x.tt ? 'tt' : (Object.keys(x.v || {}).length || x.alasan ? 'draf' : 'belum'); }
  function sisa() { return rekan().filter(function (o) { var s = statusOrang(o.nik); return s !== 'ok' && s !== 'tt'; }).length; }

  /** Muat status kuesioner untuk kartu Beranda. -> {ada, buka, alasan, sisa, jumlah, k3, perluPin, galat} */
  function muat(ctx) {
    CTX = ctx;
    if (!token()) return Promise.resolve({ ada: false, perluPin: true });
    return rpc('ksnStatus', [token()]).then(function (h) {
      if (h.login === false) return { ada: false, perluPin: true };
      if (!h.ok) return { ada: false, galat: h.pesan || 'Kuesioner belum bisa dimuat.' };
      ST = h;
      return Simpan.ambil(kunciIsi()).then(function (v) { try { ISI = JSON.parse(v || '{}') || {}; } catch (e) { ISI = {}; } return ringkas(); });
    }, function (e) { return { ada: false, galat: e.message }; });
  }
  function ringkas() { return ST ? { ada: true, buka: !!ST.buka, alasan: ST.alasan || '', sisa: sisa(), jumlah: rekan().length, k3: !!ST.k3, periode: ST.periode } : { ada: false }; }

  /* ---------- lapis penuh ---------- */
  function lapis(html) {
    if (lapisEl) { lapisEl.innerHTML = html; return lapisEl; } // sudah terbuka: ganti isi saja (tanpa kedip)
    var d = document.createElement('div'); d.className = 'lapis ksnLapis'; d.innerHTML = html; document.body.appendChild(d); lapisEl = d;
    requestAnimationFrame(function () { d.classList.add('tampil'); });
    d.addEventListener('click', klik); d.addEventListener('input', ketik);
    return d;
  }
  function tutup() { if (!lapisEl) return; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, R.hemat() ? 0 : 220); if (CTX && CTX.selesai) CTX.selesai(ringkas()); }
  function kepala(judul, sub, kembali) { return '<div class="ksnKp"><button type="button" class="kb" data-k="' + kembali + '" aria-label="Kembali">‹</button><div class="nm">' + esc(sub) + '<b>' + esc(judul) + '</b></div></div>'; }

  function mintaMasuk(lalu) {
    R.mintaPin({ judul: 'Masuk kuesioner', ket: 'Isi PIN Pusat WHL kamu sekali lagi.' }, function (pin) {
      return rpc('ksnLogin', [CTX.sesi.idKetik, pin]).then(function (h) {
        if (!h.ok) return h.pesan || 'Gagal masuk.';
        CTX.sesi.tokenKsn = h.token; CTX.simpanSesi(); return null;
      });
    }).then(function (jadi) { if (jadi) muat(CTX).then(lalu); });
  }

  /* ---------- KUESIONER: daftar rekan ---------- */
  function buka(ctx) {
    CTX = ctx; bukaNik = ''; cari = '';
    if (!ST) { if (!token()) { mintaMasuk(function (r) { if (r.ada) gambarDaftar(); else R.bunyi('gagal'), CTX.roti(r.galat || 'Kuesioner belum bisa dibuka.'); }); return; } lapis(kepala('Kuesioner', 'Memuat...', 'tutup') + '<div class="ksnIsi">' + R.kerangka('daftar') + '</div>'); muat(ctx).then(function (r) { if (r.ada) gambarDaftar(); else if (r.perluPin) { tutup(); mintaMasuk(function (r2) { if (r2.ada) gambarDaftar(); }); } else { tutup(); R.bunyi('gagal'); CTX.roti(r.galat || 'Kuesioner belum bisa dibuka.'); } }); return; }
    gambarDaftar();
  }
  function gambarDaftar() {
    var L = rekan(), n = L.length, beres = n - sisa(), q = cari.toLowerCase();
    var h = kepala('Kuesioner rekan kerja', 'Periode ' + (ST.periode || ''), 'tutup') + '<div class="ksnIsi">';
    h += '<div class="ksnInfo"><b>🔒 Anonim.</b> Nama kamu <b>tidak disimpan</b> bersama nilainya. Tidak ada yang bisa melihat siapa menilai siapa, termasuk atasan. Hasil tiap orang baru dipakai sesudah periode tutup dan penilainya minimal ' + esc(ST.minPenilai || 5) + ' orang.</div>';
    if (!ST.buka) h += '<div class="kartu ksnTutup"><span>🗓️</span><b>' + esc(ST.alasan || 'Kuesioner belum dibuka.') + '</b><small>Kalau sudah dibuka, kamu bisa mengisinya di sini. Boleh dicicil.</small></div>';
    else {
      h += '<div class="kartu"><div class="at" style="display:flex;align-items:baseline"><b style="flex:1">' + beres + ' dari ' + n + ' rekan selesai</b><span class="kecil">' + (sisa() ? 'sisa ' + sisa() : 'beres 🎉') + '</span></div><div class="palang"><i style="width:' + (n ? Math.round(beres / n * 100) : 0) + '%"></i></div><div class="kecil">Boleh dicicil. Yang sudah diisi tersimpan di HP ini; jawaban bisa diubah dari HP yang sama selama periode masih buka.</div></div>';
      h += '<input id="ksnCari" class="isian" type="search" placeholder="Cari nama rekan..." value="' + esc(cari) + '" autocomplete="off" style="margin-bottom:10px">';
      var T = L.filter(function (o) { return !q || (o.nama + ' ' + o.jabatan).toLowerCase().indexOf(q) >= 0; });
      h += T.length ? T.map(function (o) {
        var s = statusOrang(o.nik);
        return '<button type="button" class="app ksnOrg" data-nik="' + esc(o.nik) + '"><span class="bulat">' + esc(inisial(o.nama)) + '</span><span class="tx"><b>' + esc(o.nama) + '</b><small>' + esc(o.jabatan || '') + '</small></span><span class="chip ' + (s === 'ok' ? 'hijau' : s === 'tt' ? '' : s === 'draf' ? 'kuning' : 'biru') + '">' + (s === 'ok' ? '✓ Terkirim' : s === 'tt' ? 'Tidak tahu' : s === 'draf' ? 'Draf' : 'Isi') + '</span></button>';
      }).join('') : R.kosong('Tidak ketemu', 'Coba kata lain.');
    }
    if (ST.catatan) h += '<div class="kecil" style="margin-top:10px">' + esc(ST.catatan) + '</div>';
    var fokus = document.activeElement && document.activeElement.id === 'ksnCari', pos = fokus && document.activeElement.selectionStart;
    lapis(h + '</div>').removeAttribute('data-nik');
    if (fokus) { var c = document.getElementById('ksnCari'); c.focus(); try { c.setSelectionRange(pos, pos); } catch (e) { /* */ } }
  }
  /* ---------- KUESIONER: form satu rekan ---------- */
  var LABEL = ['', 'Kurang sekali', 'Kurang', 'Cukup', 'Baik', 'Sangat baik'];
  function gambarForm() {
    var o = rekan().filter(function (x) { return x.nik === bukaNik; })[0]; if (!o) { gambarDaftar(); return; }
    var x = ISI[o.nik] || (ISI[o.nik] = { v: {}, alasan: '', tt: false, kirim: false }), B = ST.butir || [];
    var h = kepala(o.nama, o.jabatan || 'Rekan kerja', 'daftar') + '<div class="ksnIsi">';
    h += '<div class="kecil" style="margin:0 4px 10px">Nilai 1 (kurang sekali) sampai 5 (sangat baik). Ketuk angka yang sama sekali lagi untuk mengosongkan butir yang kamu tidak tahu.</div>';
    var aspekLalu = '';
    B.forEach(function (b) {
      if (b.aspek !== aspekLalu) { aspekLalu = b.aspek; h += '<h2 class="bagW" style="margin-top:14px">' + (b.aspek === 'sop' ? '📋 Kepatuhan SOP & administrasi' : '🤝 Sikap & kerja sama') + '</h2>'; }
      var v = Number(x.v[b.id]) || 0;
      h += '<div class="kartu ksnButir"><b>' + esc(b.nm) + (b.usulan ? ' <i class="tagT k">usulan</i>' : '') + '</b><small>' + esc(b.tanya || '') + '</small><div class="skala" role="radiogroup" aria-label="' + esc(b.nm) + '">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" role="radio" aria-checked="' + (v === n) + '" class="' + (v === n ? 'on n' + n : '') + '" data-butir="' + esc(b.id) + '" data-n="' + n + '">' + n + '</button>'; }).join('') + '</div><em>' + (v ? LABEL[v] : 'belum dinilai / tidak tahu') + '</em></div>';
    });
    var nilai = B.map(function (b) { return Number(x.v[b.id]) || 0; }).filter(function (n) { return n > 0; }), wajib = nilai.some(function (n) { return n <= 2 || n === 5; });
    h += '<div class="kartu"><label class="lb" for="ksnAlasan" style="margin-top:0">Alasan / contoh kejadian' + (wajib ? ' <b style="color:var(--tMerah)">(wajib, karena ada nilai 1–2 atau 5)</b>' : ' (boleh kosong)') + '</label><textarea id="ksnAlasan" class="isian" rows="3" maxlength="300" placeholder="Tulis kejadiannya saja, singkat.">' + esc(x.alasan || '') + '</textarea>'
      + '<div class="ksnInfo kuning" style="margin:10px 0 0">✍️ Tulis kejadiannya saja. Gaya tulisan atau cerita yang terlalu khas bisa membuat orang menebak penulisnya.</div></div>';
    h += '<div class="pesan" id="ksnPesan" role="alert"></div><div class="duaTombol"><button type="button" class="tKecil" data-k="tt">Tidak tahu / tidak pernah kerja bareng</button><button type="button" class="tUtama" style="margin-top:0" data-k="kirim"' + (ST.buka ? '' : ' disabled') + '>' + (x.kirim ? 'Simpan perubahan' : 'Simpan') + '</button></div>';
    var y = lapisEl ? lapisEl.querySelector('.ksnIsi') : null, gulung = y && lapisEl.getAttribute('data-nik') === o.nik ? y.scrollTop : 0;
    lapis(h + '</div>').setAttribute('data-nik', o.nik);
    if (gulung) lapisEl.querySelector('.ksnIsi').scrollTop = gulung;
  }
  function kirim(o, x, nilai) {
    var tb = lapisEl.querySelector('[data-k="kirim"]'), ps = document.getElementById('ksnPesan');
    tb.disabled = true; tb.innerHTML = '<span class="putar"></span> &nbsp;Menyimpan...';
    rahasia().then(function (rhs) { return rpc('ksnKirim', [token(), rhs, { nik: o.nik, t: nilai.slice(0, 4), s: nilai.slice(4, 6), alasan: String(x.alasan || '').trim() }]); }).then(function (h) {
      if (h.login === false) { tutup(); CTX.sesi.tokenKsn = ''; ST = null; mintaMasuk(function () { buka(CTX); }); return; }
      if (!h.ok) { tb.disabled = false; tb.textContent = 'Simpan'; ps.textContent = h.pesan || 'Gagal menyimpan.'; R.bunyi('gagal'); R.getar('gagal'); return; }
      x.kirim = true; x.tt = false; simpanIsi(); if (h.terisi != null) ST.terisi = h.terisi;
      R.getar('sukses'); bukaNik = '';
      if (!sisa()) { gambarDaftar(); R.sukses({ judul: 'Kuesioner selesai', sub: 'Terima kasih. Semua rekan sudah kamu nilai atau tandai tidak tahu.', rinci: [['Periode', ST.periode], ['Jawaban', 'anonim, tersimpan'], ['Bisa diubah', 'dari HP ini, selama periode buka']] }); }
      else { R.bunyi('sukses'); gambarDaftar(); CTX.roti('Tersimpan (anonim). Sisa ' + sisa() + ' rekan.'); }
    }, function (e) { tb.disabled = false; tb.textContent = 'Simpan'; ps.textContent = 'Koneksi gagal: ' + e.message + '. Jawaban masih tersimpan sebagai draf di HP.'; R.bunyi('gagal'); });
  }

  /* ---------- PINTU K3 (hanya akun dengan k3 = true) ---------- */
  function bukaK3(ctx) {
    CTX = ctx; k3Buka = '';
    lapis(kepala('Penilaian K3', 'HSE Officer', 'tutup') + '<div class="ksnIsi">' + R.kerangka('daftar') + '</div>');
    rpc('k3Daftar', [token()]).then(function (h) {
      if (!h.ok) { tutup(); R.bunyi('gagal'); CTX.roti(h.pesan || 'Form K3 belum bisa dibuka.'); return; }
      K3 = h; gambarK3();
    }, function (e) { tutup(); CTX.roti('Koneksi gagal: ' + e.message); });
  }
  function nilaiK3(k) { return Math.max(0, 100 - 25 * Number(k.insiden) - 10 * Number(k.pelanggaran) - 5 * Number(k.apd)); }
  function gambarK3() {
    var L = K3.staf || [], sudah = L.filter(function (o) { return o.k3; }).length;
    var h = kepala('Penilaian K3', 'Bulan ' + (K3.bulan || ''), 'tutup') + '<div class="ksnIsi"><div class="ksnInfo"><b>' + sudah + ' dari ' + L.length + '</b> staf sudah diisi bulan ini. Nilai K3 = 100 − 25 per insiden − 10 per pelanggaran − 5 per temuan APD. Isi 0 kalau tidak ada. Mengisi ulang menggantikan isian sebelumnya (isian lama tetap tercatat).</div>';
    h += L.map(function (o) {
      var k = o.k3, bk = k3Buka === o.nik;
      return '<div class="kartu k3Org"><button type="button" class="k3Kp" data-k3="' + esc(o.nik) + '"><span class="tx"><b>' + esc(o.nama) + '</b><small>' + esc(o.jabatan || '') + '</small></span><span class="chip ' + (k ? 'hijau' : 'biru') + '">' + (k ? nilaiK3(k) : 'Isi') + '</span></button>'
        + (bk ? '<div class="k3Tiga"><label>Insiden<small>−25</small><input id="kI" class="isian" type="number" inputmode="numeric" min="0" max="99" value="' + (k ? esc(k.insiden) : '') + '"></label><label>Pelanggaran<small>−10</small><input id="kP" class="isian" type="number" inputmode="numeric" min="0" max="99" value="' + (k ? esc(k.pelanggaran) : '') + '"></label><label>Temuan APD<small>−5</small><input id="kA" class="isian" type="number" inputmode="numeric" min="0" max="99" value="' + (k ? esc(k.apd) : '') + '"></label></div>'
          + '<label class="lb" for="kB">Bukti / catatan kejadian (wajib kalau ada angka selain 0)</label><textarea id="kB" class="isian" rows="2" maxlength="500"></textarea><div class="pesan" id="kPesan" role="alert"></div><button type="button" class="tUtama" style="margin-top:8px" data-k="k3simpan">Simpan</button>' : '') + '</div>';
    }).join('');
    lapis(h + '</div>');
  }
  function simpanK3() {
    var o = (K3.staf || []).filter(function (x) { return x.nik === k3Buka; })[0], g = function (i) { return document.getElementById(i).value.trim(); }, i = g('kI'), p = g('kP'), a = g('kA'), bukti = g('kB'), ps = document.getElementById('kPesan');
    if (i === '' || p === '' || a === '') { ps.textContent = 'Isi ketiga angka (0 kalau tidak ada).'; R.bunyi('gagal'); return; }
    if ([i, p, a].some(function (v) { return !/^\d{1,2}$/.test(v); })) { ps.textContent = 'Jumlah harus angka bulat 0–99.'; R.bunyi('gagal'); return; }
    if (Number(i) + Number(p) + Number(a) > 0 && bukti.length < 5) { ps.textContent = 'Tulis bukti / catatan kejadiannya dulu.'; R.bunyi('gagal'); return; }
    var tb = lapisEl.querySelector('[data-k="k3simpan"]'); tb.disabled = true; tb.innerHTML = '<span class="putar"></span> &nbsp;Menyimpan...';
    rpc('k3Simpan', [token(), { nik: o.nik, nama: o.nama, k3Insiden: i, k3Pelanggaran: p, k3Apd: a, bukti: bukti }]).then(function (h) {
      if (!h.ok) { tb.disabled = false; tb.textContent = 'Simpan'; ps.textContent = h.pesan || 'Gagal menyimpan.'; R.bunyi('gagal'); R.getar('gagal'); return; }
      o.k3 = { insiden: Number(i), pelanggaran: Number(p), apd: Number(a) }; k3Buka = ''; gambarK3(); R.bunyi('sukses'); R.getar('sukses'); CTX.roti(h.pesan || 'Nilai K3 ' + o.nama + ' tersimpan.');
    }, function (e) { tb.disabled = false; tb.textContent = 'Simpan'; ps.textContent = 'Koneksi gagal: ' + e.message; });
  }

  /* ---------- pendengar ---------- */
  function klik(ev) {
    var t = ev.target, b;
    if (t.closest('button')) R.bunyi('ketuk');
    b = t.closest('[data-butir]');
    if (b) { var x = ISI[bukaNik], id = b.getAttribute('data-butir'), n = Number(b.getAttribute('data-n')); if (Number(x.v[id]) === n) delete x.v[id]; else x.v[id] = n; x.tt = false; simpanIsi(); R.getar(); gambarForm(); return; }
    b = t.closest('[data-nik]'); if (b && b.classList.contains('ksnOrg')) { if (!ST.buka) return; bukaNik = b.getAttribute('data-nik'); gambarForm(); lapisEl.querySelector('.ksnIsi').scrollTop = 0; return; }
    b = t.closest('[data-k3]'); if (b) { var nk = b.getAttribute('data-k3'); k3Buka = k3Buka === nk ? '' : nk; gambarK3(); return; }
    b = t.closest('[data-k]'); if (!b) return;
    var a = b.getAttribute('data-k');
    if (a === 'tutup') tutup();
    else if (a === 'daftar') { bukaNik = ''; gambarDaftar(); }
    else if (a === 'k3simpan') simpanK3();
    else if (a === 'tt') { ISI[bukaNik] = { v: {}, alasan: '', tt: true, kirim: false }; simpanIsi(); bukaNik = ''; gambarDaftar(); CTX.roti('Ditandai tidak tahu (tidak dikirim, tidak dihitung).'); if (!sisa()) R.sukses({ judul: 'Kuesioner selesai', sub: 'Terima kasih. Semua rekan sudah kamu nilai atau tandai tidak tahu.', rinci: [['Periode', ST.periode]] }); }
    else if (a === 'kirim') {
      var o = rekan().filter(function (z) { return z.nik === bukaNik; })[0], y = ISI[bukaNik], ps = document.getElementById('ksnPesan');
      var nilai = (ST.butir || []).map(function (bt) { return y.v[bt.id] || ''; }), isi = nilai.filter(function (n2) { return n2 !== ''; });
      if (!isi.length) { ps.textContent = 'Belum ada butir yang dinilai. Kalau tidak pernah kerja bareng, ketuk "Tidak tahu".'; R.bunyi('gagal'); R.getar('awas'); return; }
      if (isi.some(function (n2) { return n2 <= 2 || n2 === 5; }) && String(y.alasan || '').trim().length < 10) { ps.textContent = 'Nilai 1–2 atau 5 wajib diberi alasan singkat (minimal 10 huruf).'; R.bunyi('gagal'); R.getar('awas'); var al = document.getElementById('ksnAlasan'); if (al) al.focus(); return; }
      var sama = isi.length >= 4 && isi.every(function (n2) { return n2 === isi[0]; });
      if (sama) R.tanya({ judul: 'Semua butir nilainya ' + isi[0], ket: 'Sudah dipikir satu per satu untuk ' + o.nama + '?', ya: 'Ya, kirim', tidak: 'Periksa lagi' }).then(function (ya) { if (ya) kirim(o, y, nilai); });
      else kirim(o, y, nilai);
    }
  }
  function ketik(ev) {
    if (ev.target.id === 'ksnAlasan' && ISI[bukaNik]) { ISI[bukaNik].alasan = ev.target.value; clearTimeout(ketik.t); ketik.t = setTimeout(simpanIsi, 600); }
    if (ev.target.id === 'ksnCari') { cari = ev.target.value; gambarDaftar(); }
  }
  function lupa() { ST = null; ISI = {}; K3 = null; if (lapisEl) { lapisEl.remove(); lapisEl = null; } } // dipanggil saat keluar akun (rahasia perangkat TIDAK dihapus supaya jawaban lama tetap bisa diubah)
  window.WHL_KSN = { muat: muat, ringkas: ringkas, buka: buka, bukaK3: bukaK3, lupa: lupa, _form: function (nik) { bukaNik = nik || (rekan()[0] || {}).nik; if (!ISI[bukaNik]) ISI[bukaNik] = { v: {}, alasan: '', tt: false, kirim: false }; gambarForm(); } };
})();
