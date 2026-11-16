/* WHL App — KEGIATAN BERANDA (tahap 3 rancangan Upgrade\app-beranda-poin-16nov §1 no 10; tim A Andro, 17 Nov 2026).
 * - 1 RPC baca pusatKegiatanBeranda(token) (server Armand, PusatKegiatan.gs): slide cuaca + daftar ulang tahun hari ini + ultahSaya + ringkas kuis/poin.
 *   Server lama tanpa fungsi itu tapi punya pusatCuaca = slide cuaca saja. Tidak punya keduanya = TIDAK ada slide (fitur disembunyikan).
 * - Slide sistem disisipkan ke karusel banner.js lewat WHL_KEGIATAN.slide() (urutan: ulang tahun -> cuaca -> banner Kelola banner).
 *   Slide = { id, warna, html, judul, klik(ev) } (banner.js: b.html dipakai apa adanya, x.klik dipanggil saat diketuk).
 * - Ketuk slide cuaca = Kondisi jalan (kalau tim B sudah memasang WHL_JALAN) atau rincian cuaca per titik site.
 * - Ketuk slide ulang tahun = Kirim ucapan (ultah.js): buka Forum Umum dengan @nama terisi.
 * Simpan di memori 5 menit + salinan di HP per akun per tanggal (beranda langsung terisi saat app dibuka). Semua tanggal teks WIB.
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA, Simpan = API.Simpan;
  var CTX = null, CTXB = null, KG = null, JALAN = false, AKUN = '', lapisEl = null, SELISIH = 0, MS = 5 * 60000;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function punya(fn) { return API.Pusat.asli() && API.Pusat.punya(fn); }
  function sesi() { return CTX && CTX.sesi ? CTX.sesi() : null; }
  function akun(S) { S = S || sesi(); return String((S && (S.idProfil || S.idKetik)) || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function siap() { return punya('pusatKegiatanBeranda') || punya('pusatCuaca'); }
  /** jam server (WIB) dalam ms: selisih jam HP diperbaiki dari msServer balasan terakhir */
  function kini() { return Date.now() + SELISIH; }
  function tglWib(ms) { var d = new Date((ms == null ? kini() : ms) + 7 * 3600e3); return d.toISOString().slice(0, 10); }
  /** 'yyyy-MM-ddTHH:mm[:ss]' WIB (format kgIso_ server) -> ms */
  function msWib(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 7, +m[5], +(m[6] || 0)) : 0; }
  function jamTitik(s) { return String(s || '').replace(':', '.'); }
  function pendek(n) { return String(n || '').trim().split(/\s+/).slice(0, 2).join(' '); }
  function judulKata(n) { return String(n || '').toLowerCase().replace(/(^|[\s.'-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\b(Hr|Hse|Ga|It|Do|Whl|Pt)\b/g, function (m) { return m.toUpperCase(); }); }
  function namaTampil(n) { return judulKata(pendek(n)); }

  /* ---------- ikon (pakai ilus3d.js kalau bentuknya sudah dipasang; cadangan = gambar sendiri, gaya sama) ---------- */
  var nIk = 0, WARNA = { b: ['#7CC0FF', '#1E88E5', '#1257B3'], w: ['#FFFFFF', '#EEF5FF', '#CFE0F7'], y: ['#FFE58A', '#FFC530', '#E99A00'], o: ['#FFB27A', '#FF7A33', '#D9480F'], r: ['#FF9A9A', '#F2484D', '#B71C2C'], t: ['#8DF0E4', '#20C3B4', '#0B8A80'], u: ['#C9B8FF', '#7A5CF0', '#4B2FB8'] };
  var BENTUK = {
    kuis: function (F, K) { return '<path d="M14 8h32a10 10 0 0 1 10 10v18a10 10 0 0 1-10 10H28l-11 9v-9h-3A10 10 0 0 1 4 36V18A10 10 0 0 1 14 8z" fill="' + F('t') + '"/><path d="M14 8h32a10 10 0 0 1 10 10v18a10 10 0 0 1-10 10H28l-11 9v-9h-3A10 10 0 0 1 4 36V18A10 10 0 0 1 14 8z" fill="' + K + '"/>'
      + '<text x="30" y="38" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="900" font-size="27" fill="#fff">?</text><path d="M52 34l-6 11h5l-3 10 9-13h-5l3-8z" fill="' + F('y') + '"/>'; },
    cuaca: function (F, K) { return '<circle cx="40" cy="22" r="13" fill="' + F('y') + '"/><circle cx="40" cy="22" r="13" fill="' + K + '"/><g stroke="#FFC530" stroke-width="3" stroke-linecap="round"><path d="M40 3v3M55 9l-2 2M59 22h-3M25 9l2 2"/></g>'
      + '<path d="M16 46a10 10 0 0 1 1-20 13 13 0 0 1 24-2 9 9 0 0 1 9 11 8 8 0 0 1-3 15H16a2 2 0 0 1 0-4z" fill="' + F('w') + '"/><path d="M16 46a10 10 0 0 1 1-20 13 13 0 0 1 24-2 9 9 0 0 1 9 11 8 8 0 0 1-3 15H16z" fill="' + K + '"/>'
      + '<g stroke="' + F('b') + '" stroke-width="3.4" stroke-linecap="round"><path d="M20 54l-2 5M30 54l-2 5M40 54l-2 5"/></g>'; },
    ultah: function (F, K) { return '<rect x="8" y="36" width="48" height="20" rx="6" fill="' + F('u') + '"/><rect x="8" y="36" width="48" height="20" rx="6" fill="' + K + '"/><rect x="13" y="24" width="38" height="14" rx="5" fill="' + F('r') + '"/><rect x="13" y="24" width="38" height="14" rx="5" fill="' + K + '"/>'
      + '<path d="M13 30q4 5 8 0t8 0 8 0 8 0 6 0v-3H13z" fill="#fff"/><path d="M8 43q5 5 10 0t10 0 10 0 10 0 8 0v-3H8z" fill="#fff" opacity=".9"/>'
      + '<rect x="21" y="12" width="4" height="12" rx="2" fill="' + F('b') + '"/><rect x="30" y="10" width="4" height="14" rx="2" fill="' + F('t') + '"/><rect x="39" y="12" width="4" height="12" rx="2" fill="' + F('y') + '"/>'
      + '<path d="M23 5q3 4 0 6-3-2 0-6zM32 3q3 4 0 6-3-2 0-6zM41 5q3 4 0 6-3-2 0-6z" fill="' + F('o') + '"/>'; }
  };
  function ikon(nama) {
    if (window.WHL_ILUS && (window.WHL_ILUS_DAFTAR || []).indexOf(nama) >= 0) return window.WHL_ILUS(nama);
    if (!BENTUK[nama]) return window.WHL_ILUS ? window.WHL_ILUS(nama) : '';
    var u = 'kg' + (++nIk) + '_', F = function (x) { return 'url(#' + u + x + ')'; }, K = 'url(#' + u + 'kil)', h = '<defs>';
    Object.keys(WARNA).forEach(function (k) { var c = WARNA[k]; h += '<linearGradient id="' + u + k + '" x1="0.15" y1="0" x2="0.85" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="0.55" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></linearGradient>'; });
    h += '<radialGradient id="' + u + 'kil" cx="0.3" cy="0.22" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
      + '<filter id="' + u + 'jatuh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.4" flood-color="#0B2F6B" flood-opacity=".28"/></filter></defs>';
    return '<svg class="ilus ilus3d" viewBox="0 0 64 64" aria-hidden="true">' + h + '<g filter="url(#' + u + 'jatuh)">' + BENTUK[nama](F, K) + '</g></svg>';
  }
  /** taburan konfeti diam (dekorasi slide / kepala), posisi tetap supaya tidak berkedip tiap gambar ulang */
  function konfDiam(n, besar) {
    var W = ['#FFE58A', '#8DF0E4', '#FF9A9A', '#FFFFFF', '#C9B8FF', '#7CC0FF'], h = '';
    for (var i = 0; i < n; i++) { var x = (i * 37 + 11) % 100, y = (i * 53 + 7) % 100, r = (i * 47) % 180; h += '<i style="left:' + x + '%;top:' + y + '%;background:' + W[i % W.length] + ';transform:rotate(' + r + 'deg)' + (besar ? ';width:8px;height:14px' : '') + '"></i>'; }
    return '<span class="kgKonf" aria-hidden="true">' + h + '</span>';
  }

  /* ---------- muat ---------- */
  function cocokAkun() { var a = akun(); if (a !== AKUN) { AKUN = a; KG = null; JALAN = false; if (window.WHL_ULTAH) window.WHL_ULTAH.lupakan(); } }
  function terima(h, dariSimpan) {
    if (!h || h.ok === false) return false;
    if (h.msServer && !dariSimpan) SELISIH = Number(h.msServer) - Date.now();
    KG = { d: h, t: dariSimpan ? 0 : Date.now(), tgl: String(h.jamServer || '').slice(0, 10) || tglWib() };
    return true;
  }
  function muat(ctx, paksa) {
    if (ctx) CTX = ctx; cocokAkun();
    var S = sesi(); if (!S || !S.tokenPusat || !siap() || JALAN) return Promise.resolve();
    if (KG && KG.t && !paksa && Date.now() - KG.t < MS) return Promise.resolve();
    JALAN = true; var kunci = 'whlKg_' + AKUN, a0 = AKUN;
    var awal = KG ? Promise.resolve() : Simpan.ambil(kunci).then(function (v) { try { var c = JSON.parse(v || 'null'); if (c && !KG && String(c.jamServer || '').slice(0, 10) === tglWib() && terima(c, true)) perbarui(); } catch (e) { /* */ } });
    var fn = punya('pusatKegiatanBeranda') ? 'pusatKegiatanBeranda' : 'pusatCuaca';
    return awal.then(function () { return API.Pusat.panggil(fn, [S.tokenPusat], 30000); }).then(function (h) {
      JALAN = false; if (a0 !== AKUN) return;
      if (h && h.login === false) { if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (fn === 'pusatCuaca' && h) h = { ok: true, jamServer: h.diperbarui || '', fitur: { cuaca: h.aktif !== false, ultah: false, kuis: false }, cuaca: h, ultah: [], ultahSaya: { hariIni: false } }; /* server lama: cuaca saja */
      if (terima(h, false)) { try { Simpan.taruh(kunci, JSON.stringify(h)); } catch (e) { /* */ } }
      else if (KG) KG.t = Date.now(); else KG = { d: null, t: Date.now(), tgl: tglWib() };
      perbarui();
      if (window.WHL_ULTAH) window.WHL_ULTAH.cek();
      try { var FT = (fn === 'pusatKegiatanBeranda' && h && h.ok !== false && h.fitur) || null; /* integrator v3.30: sakelar fitur server -> menu tim B */
        if (FT && 'jalan' in FT && window.WHL_JALAN && window.WHL_JALAN.aturFitur) window.WHL_JALAN.aturFitur(FT.jalan !== false);
        if (FT && 'hazard' in FT && window.WHL_HAZARD && window.WHL_HAZARD.aturFitur) window.WHL_HAZARD.aturFitur(FT.hazard !== false); } catch (e) { /* */ }
    }, function () { JALAN = false; if (KG) KG.t = Date.now(); });
  }
  function perbarui() { try { if (CTX && CTX.perbarui) CTX.perbarui(); } catch (e) { /* */ } }
  function data() { cocokAkun(); var d = KG && KG.d; if (d && KG.tgl && KG.tgl !== tglWib()) return null; /* data kemarin (lewat tengah malam) tidak dipakai */ return d || null; }

  /* ---------- slide sistem untuk karusel banner ---------- */
  /** Kondisi jalan tim B (jalan.js: WHL_JALAN.boleh(S) / buka(ctx)) terpasang & boleh dibuka -> slide cuaca membuka Kondisi jalan */
  function jalanAda() { try { var J = window.WHL_JALAN, F = (data() || {}).fitur || {}; return !!(J && J.buka && (!J.boleh || J.boleh(sesi())) && F.jalan !== false); } catch (e) { return false; } }
  function cuacaSlide(c) {
    var T = (c.titik || [])[0] || {}, hujan = (T.perJam || []).filter(function (x) { return Number(x.peluangHujan) >= 50 || Number(x.kode) >= 51; })[0];
    var ket = (c.titik || []).some(function (t) { return Number(t.kode) >= 51; }) ? c.ringkas
      : hujan ? 'Peluang hujan ' + (hujan.peluangHujan != null ? hujan.peluangHujan + '% ' : '') + 'jam ' + jamTitik(hujan.jam) + ' · jalan bisa licin'
      : T.peluangHujanHariIni != null ? 'Peluang hujan hari ini ' + T.peluangHujanHariIni + '%' + (T.suhuMin != null ? ' · ' + T.suhuMin + '–' + T.suhuMax + '°' : '') : (c.ringkas || '');
    var jalan = jalanAda();
    return { id: 'kg-cuaca', sistem: true, judul: 'Cuaca hari ini', warna: 'kgSld kgCuaca' + (T.siang === false ? ' malam' : ''),
      html: '<span class="kgSIk">' + ikon('cuaca') + '</span><span class="kgSTx"><small>Cuaca hari ini · ' + esc(T.nama || 'site') + (c.jam ? ' · ' + esc(jamTitik(c.jam)) : '') + '</small>'
        + '<span class="kgSuhu">' + (T.suhu != null ? esc(T.suhu) + '°' : '–') + ' <span>' + esc(String(T.label || '').toLowerCase()) + '</span></span><span class="kgSKet">' + esc(ket) + '</span><em>' + (jalan ? 'Lihat kondisi jalan ›' : 'Lihat rincian cuaca ›') + '</em></span>',
      klik: function () { R.bunyi('sheet'); if (jalanAda()) window.WHL_JALAN.buka(CTX); else bukaCuaca(); } };
  }
  /** 1 orang: foto profil dari server (kosong / gagal dimuat = inisial) dengan kue kecil; kontrak A1 */
  function fotoSlide(o) {
    var ini = String(o.nama || '').trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase();
    return '<span class="kgSFoto">' + (o.foto ? '<img src="' + esc(o.foto) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">' : '') + '<b>' + esc(ini) + '</b><i>🎂</i></span>';
  }
  function ultahSlide(L) {
    var nm = L.map(function (x) { return namaTampil(x.nama); }), satu = L.length === 1;
    var judul = satu ? 'Selamat ulang tahun, ' + nm[0] + '!' : 'Selamat ulang tahun, ' + (L.length <= 3 ? nm.slice(0, -1).join(', ') + ' & ' + nm[nm.length - 1] : nm.slice(0, 2).join(', ') + ' & ' + (L.length - 2) + ' rekan lain') + '!';
    var sub = satu ? (L[0].peran === 'driver' ? 'Driver' : 'Staf') + (L[0].jabatan && !/^driver$/i.test(L[0].jabatan) ? ' · ' + judulKata(L[0].jabatan) : '') : L.length + ' rekan berulang tahun hari ini';
    return { id: 'kg-ultah', sistem: true, judul: judul, warna: 'kgSld kgUltahS',
      html: konfDiam(16) + '<span class="kgSIk">' + (satu ? fotoSlide(L[0]) : ikon('ultah')) + '</span><span class="kgSTx"><small>Hari ini ulang tahun 🎉</small><b>' + esc(judul) + '</b><span class="kgSKet">' + esc(sub) + '</span><em>💬 Kirim ucapan</em></span>',
      klik: function () { if (!window.WHL_ULTAH) return; if (satu) window.WHL_ULTAH.kirimUcapan(L[0]); else window.WHL_ULTAH.pilihUcapan(L); } };
  }
  function slide() {
    var d = data(); if (!d) return [];
    var L = [], F = d.fitur || {};
    var U = F.ultah === false ? [] : (d.ultah || []).filter(function (x) { return !(window.WHL_ULTAH && window.WHL_ULTAH.diriSendiri(x)); });
    if (U.length) L.push(ultahSlide(U));
    var c = d.cuaca; if (F.cuaca !== false && c && c.ok !== false && c.aktif !== false && (c.titik || []).length) L.push(cuacaSlide(c));
    return L;
  }

  /* ---------- rincian cuaca (lapis) ---------- */
  function lapis(judul, sub, isi) {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis kgLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', function (ev) { var b = ev.target.closest('[data-kgc]'); if (!b) return; if (b.getAttribute('data-kgc') === 'tutup') { R.bunyi('tutup'); tutup(); } else if (b.getAttribute('data-kgc') === 'segar') { bukaCuaca(true); } });
    }
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-kgc="tutup" aria-label="Kembali">‹</button><div class="nm">' + esc(sub) + '<b>' + esc(judul) + '</b></div></div><div class="ksnIsi">' + isi + '</div>';
  }
  function tutup() { if (!lapisEl) return false; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); return true; }
  function bukaCuaca(segar) {
    var d = data(), c = d && d.cuaca;
    if (segar) { muat(CTX, true).then(function () { if (lapisEl) bukaCuaca(false); }); }
    if (!c || !(c.titik || []).length) { lapis('Cuaca hari ini', 'Otomatis', '<div class="kartu kosongKm"><b>Data cuaca belum tersedia</b><small>' + esc((c && c.pesan) || 'Coba lagi sebentar.') + '</small><button type="button" class="tKecil" data-kgc="segar" style="margin-top:10px">Coba lagi</button></div>'); return; }
    var h = (c.titik || []).map(function (t) {
      var J = (t.perJam || []).map(function (x) { var hj = Number(x.peluangHujan) >= 50 || Number(x.kode) >= 51; return '<div class="' + (hj ? 'hjn' : '') + '"><span>' + esc(jamTitik(x.jam)) + '</span><b>' + esc(x.ikon || '') + '</b><em>' + (x.peluangHujan != null ? esc(x.peluangHujan) + '%' : '') + '</em></div>'; }).join('');
      return '<div class="kgCuacaKp' + (t.siang === false ? ' malam' : '') + '"><span class="ic">' + ikon('cuaca') + '</span><div class="tx"><small>' + esc(t.nama || 'Site') + '</small><div class="kgSuhuB">' + (t.suhu != null ? esc(t.suhu) + '°' : '–') + '</div><b>' + esc(t.ikon || '') + ' ' + esc(t.label || '') + '</b>'
        + '<small>' + (t.suhuMin != null ? 'Hari ini ' + esc(t.suhuMin) + '–' + esc(t.suhuMax) + '°' : '') + (t.peluangHujanHariIni != null ? ' · peluang hujan ' + esc(t.peluangHujanHariIni) + '%' : '') + (t.angin != null ? ' · angin ' + esc(t.angin) + ' km/j' : '') + '</small></div></div>'
        + (J ? '<div class="kgJamC">' + J + '</div>' : '');
    }).join('');
    var licin = (c.titik || []).some(function (t) { return Number(t.kode) >= 51; });
    h = (licin ? '<div class="kgPeringat"><b class="ik">⚠️</b><span>' + esc(c.ringkas) + '<small>Kurangi kecepatan, jaga jarak aman, nyalakan lampu.</small></span></div>' : '') + h
      + '<div class="kecil" style="margin:12px 4px;text-align:center">Sumber ' + esc(c.sumber || 'Open-Meteo') + (c.jam ? ' · update ' + esc(jamTitik(c.jam)) + ' WIB' : '') + ' · diperbarui server tiap 1 jam' + (c.basi ? ' · <b>data lama (server cuaca belum terjangkau)</b>' : '') + '</div>';
    lapis('Cuaca hari ini', 'Otomatis · ' + (c.titik || []).length + ' titik site', h);
  }

  /* ---------- kartu di Beranda (dipanggil app.js gambarBeranda sesudah kartu Hari ini) ---------- */
  function berandaHtml(ctx, ctxB) {
    if (ctx) CTX = ctx; if (ctxB) CTXB = ctxB; cocokAkun();
    if (siap() && (!KG || Date.now() - KG.t > MS)) muat();
    var h = '';
    if (window.WHL_ULTAH) h += window.WHL_ULTAH.kartuHtml();
    if (window.WHL_KUIS) h += window.WHL_KUIS.kartuHtml(CTX);
    try { document.body.classList.toggle('kgUltah', !!(window.WHL_ULTAH && window.WHL_ULTAH.saya())); } catch (e) { /* */ }
    return h;
  }
  function lupakan() { KG = null; AKUN = ''; tutup(); try { document.body.classList.remove('kgUltah'); } catch (e) { /* */ } }

  window.WHL_KEGIATAN = { siap: siap, muat: muat, data: data, slide: slide, berandaHtml: berandaHtml, bukaCuaca: bukaCuaca, tutup: tutup, lupakan: lupakan,
    ikon: ikon, konfDiam: konfDiam, kini: kini, msWib: msWib, tglWib: tglWib, namaTampil: namaTampil, pendek: pendek, punya: punya,
    ctx: function () { return CTX; }, ctxB: function () { return CTXB; }, esc: esc };
})();
