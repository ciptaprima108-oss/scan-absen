/* WHL App v3.36 — KUESIONER DRIVER: driver menilai pelayanan staf (anonim). Andro, 17 Nov 2026 malam.
 * Rancangan: Upgrade\poin-karyawan-17nov\USULAN.md §6 + mockup layar 4. Server: Vanesa (DASHBOARD PusatKsnDriver.gs).
 *   pusatKsnDriverStatus [token] -> {ok, periode, buka, staf:[{nik,nama,jabatan,pernah}], butir:[{id,nm,tanya}], terisi, minPenilai}
 *   pusatKsnDriverKirim  [token, rahasia, {nik, d:[0-5,...] (0 = tidak tahu), alasan, teks}] -> {ok, pesan, terisi}
 * ANONIM: "rahasia" = teks acak 48 huruf, dibuat SEKALI per akun di HP ini (pola kuesioner.js), tidak pernah ditampilkan.
 * Server memakai rahasia untuk tanda 1 driver 1x per staf (HMAC) tanpa menyimpan siapa menilai siapa.
 * Skala 1–5 wajah; nilai 1 wajib pilih alasan (Lama / Kasar / Tidak jelas / Pilih kasih / Lainnya + teks). Maks 10 staf per bulan,
 * nilai minimal 3 staf = +5 poin (dihitung server). Menu: Hub Poin WHL (khusus driver). Tanpa alert/confirm.
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA, Simpan = API.Simpan;
  var FN = { status: 'pusatKsnDriverStatus', kirim: 'pusatKsnDriverKirim' };
  var CTX = null, ST = null, lapisEl = null, PILIH = null, JWB = {}, ALASAN = [], CARI = false, KIRIM = false;
  var WAJAH = [['😠', 'Buruk'], ['🙁', 'Kurang'], ['😐', 'Cukup'], ['🙂', 'Baik'], ['😄', 'Bagus']];
  var ALS = ['Lama', 'Kasar', 'Tidak jelas', 'Pilih kasih', 'Lainnya'];
  var BUTIR_DEF = [{ id: 'D1', nm: 'Ramah & sopan' }, { id: 'D2', nm: 'Cepat membantu / melayani' }, { id: 'D3', nm: 'Jelas & adil memberi info' }];
  var MAKS = 10, MIN_POIN = 3;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { return CTX && CTX.sesi ? CTX.sesi() : null; }
  function punya(fn) { return API.Pusat.asli() && API.Pusat.punya(fn); }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function ILUS(n) { return window.WHL_ILUS ? window.WHL_ILUS(n) : ''; }
  function akun() { var S = sesi(); return String((S && (S.idProfil || S.idKetik)) || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function panggil(fn, args, ms) { var S = sesi(); if (!S || !S.tokenPusat) return Promise.reject(new Error('Belum masuk.')); return API.Pusat.panggil(fn, [S.tokenPusat].concat(args || []), ms || 30000); }
  function habis(h) { if (h && h.login === false) { tutup(); if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return true; } return false; }
  function driver(S) { S = S || sesi(); return !!(S && S.user && S.user.peran === 'driver'); }
  function inisial(n) { var p = String(n || '?').trim().split(/\s+/); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function pendek(n) { var p = String(n || '').trim().toLowerCase().split(/\s+/).filter(Boolean).map(function (w) { return w[0].toUpperCase() + w.slice(1); }); if (!p.length) return '-'; return p.length === 1 ? p[0] : p[0] + ' ' + p[1][0] + '.'; }

  /** rahasia penilai per akun di HP ini (dibuat sekali, tidak ditampilkan, tidak dihapus saat keluar akun) */
  function rahasia() {
    var kk = 'whlKsdRhs_' + akun();
    return Simpan.ambil(kk).then(function (r) {
      if (r && String(r).length >= 32) return r;
      var a = new Uint8Array(48), h = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', o = '';
      (window.crypto || window.msCrypto).getRandomValues(a); for (var i = 0; i < a.length; i++) o += h.charAt(a[i] % 64);
      return Simpan.taruh(kk, o).then(function () { return o; });
    });
  }

  function gaya() {
    if (document.getElementById('ksdGaya')) return; var st = document.createElement('style'); st.id = 'ksdGaya';
    st.textContent = '.ksdLapis .ksnIsi{padding-bottom:44px}'
      + '.ksdAtas{background:linear-gradient(135deg,var(--tint),var(--panel))}.ksdAtas .nm{font-size:16px;font-weight:900;margin-bottom:4px}.ksdProg{height:8px;border-radius:99px;background:var(--panel2);margin-top:10px;overflow:hidden}.ksdProg i{display:block;height:100%;border-radius:99px;background:var(--utama)}'
      + '.ksdJd{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px}.ksdJd b{font-size:14.5px}.ksdJd span{font-size:11.5px;color:var(--redup);font-weight:700;text-align:right}'
      + '.ksdOrg{display:flex;gap:10px;align-items:center;width:100%;text-align:left;padding:10px 0;border-top:1px solid var(--garis);background:none;color:var(--teks);font:inherit}.ksdOrg:first-of-type{border-top:0}'
      + '.ksdOrg .av{width:40px;height:40px;border-radius:50%;background:var(--tint);color:var(--utama);display:grid;place-items:center;font-weight:900;flex:none}.ksdOrg .tx{flex:1;min-width:0}.ksdOrg .tx b{display:block;font-size:14px}.ksdOrg .tx small{display:block;color:var(--redup);font-size:12px;line-height:1.35}'
      + '.ksdSt{font-size:11.5px;font-weight:900;padding:4px 10px;border-radius:99px;white-space:nowrap;flex:none}.ksdSt.sudah{background:rgba(22,163,74,.16);color:#15803d}.ksdSt.belum{background:var(--utama);color:#fff}.ksdSt.mati{background:var(--panel2);color:var(--redup)}'
      + '.ksdRate{background:var(--panel2);border-radius:14px;padding:11px 12px;margin-top:10px}.ksdRate .q{font-size:13.5px;font-weight:800;margin-bottom:8px}.ksdRate .q small{display:block;font-weight:600;color:var(--redup);font-size:12px;margin-top:2px}'
      + '.ksdWajah{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.ksdWajah button{min-height:56px;padding:6px 0 4px;border-radius:12px;border:1px solid var(--garis);background:var(--panel);color:var(--teks);font-size:22px;line-height:1}'
      + '.ksdWajah button small{display:block;font-size:10px;color:var(--redup);margin-top:4px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ksdWajah button.on{border-color:var(--utama);background:var(--tint);box-shadow:0 0 0 2px var(--utama)}'
      + '.ksdCip{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.ksdCip button{min-height:36px;padding:0 12px;border-radius:99px;border:1px solid var(--garis);background:var(--panel);color:var(--redup);font:inherit;font-size:12.5px;font-weight:800}.ksdCip button.on{background:var(--utama);border-color:var(--utama);color:#fff}'
      + '.ksdIn{width:100%;min-height:44px;border-radius:12px;border:1px solid var(--garis);background:var(--panel);color:var(--teks);padding:8px 12px;font:inherit;font-size:14px;margin-top:8px;box-sizing:border-box}'
      + '.ksdTb{display:flex;gap:8px;margin-top:12px}.ksdTb button{flex:1;min-height:48px;border-radius:12px;font:inherit;font-weight:800;font-size:14px;background:var(--panel2);color:var(--teks)}.ksdTb button.utama{background:var(--utama);color:#fff}.ksdTb button:disabled{opacity:.5}'
      + '.ksdLain{width:100%;min-height:44px;margin-top:8px;border-radius:12px;background:var(--panel2);color:var(--teks);font:inherit;font-weight:800;font-size:13.5px}'
      + '.ksdPesan{font-size:12.5px;font-weight:700;color:var(--tMerah);margin-top:8px;min-height:1em}'
      + 'html[data-tema="gelap"] .ksdSt.sudah{color:#4ade80}';
    document.head.appendChild(st);
  }

  /* ---------- data ---------- */
  function bulanTeks(p) { var m = String(p || '').match(/^(\d{4})-(\d{2})$/), B = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']; return m ? B[+m[2] - 1] + ' ' + m[1] : String(p || ''); }
  function norm(h) {
    var d = h || {}, T = d.terisi, daftarTerisi = Array.isArray(T) ? T.map(String) : [];
    var staf = (Array.isArray(d.staf) ? d.staf : []).map(function (x) {
      var p = x.pernah, nik = String(x.nik || x.id || '');
      return { nik: nik, nama: x.nama || '', jabatan: x.jabatan || x.peran || '', pernah: !!p, ketPernah: typeof p === 'string' ? p : (x.ketPernah || ''),
        sudah: x.sudah === true || daftarTerisi.indexOf(nik) >= 0, tt: x.tt === true }; /* kuesioner-wajib-25nov: tidak kenal (server) */
    });
    var jml = Array.isArray(T) ? T.length : Number(T) || staf.filter(function (x) { return x.sudah; }).length;
    return { ok: d.ok !== false, aktif: d.aktif !== false, pesan: d.pesan || '', periode: bulanTeks(d.periode), buka: d.buka !== false, ketBuka: d.alasan || d.ketBuka || d.jadwal || '',
      staf: staf, butir: Array.isArray(d.butir) && d.butir.length ? d.butir : BUTIR_DEF, terisi: jml, maks: Number(d.maksStaf || d.maks) || MAKS, minPoin: Number((d.poin && d.poin.minStaf) || d.minPoin) || MIN_POIN, minPenilai: Number(d.minPenilai) || 10,
      /* API-APP.md §4b (Hesti) */ tampil: d.tampil !== false, boleh: d.boleh !== false, pesanBoleh: d.pesanBoleh || '', catatan: d.catatan || '', poinBesar: Number(d.poin && d.poin.poin) || 5, dapatPoin: !!(d.poin && d.poin.dapat),
      alasanPilihan: Array.isArray(d.alasanPilihan) && d.alasanPilihan.length ? d.alasanPilihan : ALS, wajib: d.wajib && typeof d.wajib === 'object' ? d.wajib : null };
  }
  function muat() {
    return panggil(FN.status, [], 45000).then(function (h) { if (habis(h)) return null; ST = norm(h); return periksaKurang().then(function () { return ST; }); }); /* kuesioner-semua-butir-25nov */
  }

  /* ---------- lapis ---------- */
  function lapis(sub, isi) {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis ksdLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik);
    }
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-ksd="tutup" aria-label="Kembali">‹</button><div class="nm">' + esc(sub) + '<b>Nilai pelayanan staf</b></div></div><div class="ksnIsi">' + isi + '</div>';
  }
  function tutup() { if (!lapisEl) return false; var d = lapisEl; lapisEl = null; PILIH = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); return true; }
  function kosong(j, k, tb) { return '<div class="kartu pnKosong" style="text-align:center;padding:22px 14px">' + ILUS('kuesioner') + '<b style="display:block;margin-top:8px">' + esc(j) + '</b><small style="display:block;color:var(--redup);margin-top:4px;line-height:1.45">' + esc(k || '') + '</small>' + (tb ? '<button type="button" class="tKecil" data-ksd="ulang" style="margin-top:12px">Coba lagi</button>' : '') + '</div>'; }

  function buka(ctx) {
    CTX = ctx || CTX; gaya(); PILIH = null; CARI = false;
    if (!punya(FN.status)) { roti('Kuesioner driver belum tersedia di server.'); return; }
    lapis('Kuesioner anonim', R && R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>');
    muat().then(function () { if (lapisEl) gambar(); }, function (e) { if (lapisEl) lapis('Kuesioner anonim', kosong('Belum bisa dimuat', e.message, true)); });
  }
  function gambar() {
    if (!ST) return;
    kabar(); /* kuesioner-wajib-25nov */
    if (ST.aktif === false || ST.ok === false) { lapis('Kuesioner anonim', kosong(ST.aktif === false ? 'Kuesioner belum dibuka' : 'Belum bisa dimuat', ST.pesan, ST.ok === false)); return; }
    if (ST.tampil === false) { lapis('Kuesioner anonim', kosong('Khusus driver', 'Kuesioner ini untuk driver menilai pelayanan staf.')); return; }
    if (PILIH) { gambarForm(); return; }
    var sisa = Math.max(0, ST.maks - ST.terisi), h = '';
    h += '<div class="kartu ksdAtas"><div class="nm">Kuesioner ' + esc(ST.periode || 'bulan ini') + ' · anonim</div><div class="kecil" style="line-height:1.5">'
      + (ST.buka ? 'Nilaimu tidak tercatat dengan namamu. Nilai minimal ' + ST.minPoin + ' staf = <b style="color:var(--teks)">+' + ST.poinBesar + ' poin</b>' + (ST.dapatPoin ? ' ✅' : '') + '. Sudah: <b style="color:var(--teks)">' + ST.terisi + '</b> dari maks ' + ST.maks + '.' + (!ST.boleh ? '<br><b style="color:var(--tMerah)">' + esc(ST.pesanBoleh || 'Kamu belum bisa menilai bulan ini.') + '</b>' : '')
        : esc(ST.pesan || ST.ketBuka || 'Kuesioner dibuka tiap tanggal 25 sampai akhir bulan.')) + '</div>'
      + (ST.buka ? '<div class="ksdProg"><i style="width:' + Math.min(100, ST.terisi / ST.maks * 100).toFixed(0) + '%"></i></div>' : '') + '</div>';
    var P = ST.staf.filter(function (x) { return x.pernah; }), L = ST.staf.filter(function (x) { return !x.pernah; });
    h += '<div class="kartu"><div class="ksdJd"><b>Pernah menangani kamu bulan ini</b><span>dari tiket & DO</span></div>' + (P.length ? P.map(function (x) { return org(x, sisa); }).join('') : '<div class="kecil">Belum ada data staf yang menangani kamu bulan ini.</div>');
    var wjb = !!(ST.wajib && ST.wajib.aktif); /* kuesioner-wajib-25nov */
    if (L.length && !CARI && !wjb) h += '<button type="button" class="ksdLain" data-ksd="cari">Cari staf lain (' + L.length + ')</button>';
    h += '</div>';
    if (L.length && (CARI || wjb)) h += '<div class="kartu"><div class="ksdJd"><b>Staf lain</b><span>' + L.length + ' orang</span></div><input class="ksdIn" type="search" placeholder="Cari nama / jabatan" aria-label="Cari staf" data-ksd="saring" style="margin:0 0 6px">'
      + '<div id="ksdLain">' + L.map(function (x) { return org(x, sisa); }).join('') + '</div></div>';
    h += '<div class="kecil" style="margin:12px 6px;text-align:center;line-height:1.5">Hasil staf baru tampil kalau minimal ' + ST.minPenilai + ' driver menilai. Siapa yang menilai tidak pernah ditampilkan ke siapa pun.</div>';
    lapis('Kuesioner anonim', h);
  }
  function org(x, sisa) {
    var bisa = ST.buka && ST.boleh, aktif = bisa && (x.sudah || sisa > 0); /* sudah:true masih bisa DIUBAH dari HP yang sama (kunci rahasia) */
    var st = x.sudah && x.kurang && wajibAktif() ? '<span class="ksdSt belum">Lengkapi</span>' : x.sudah ? '<span class="ksdSt sudah">Sudah ✓' + (bisa ? ' · ubah' : '') + '</span>' : !bisa || sisa <= 0 ? '<span class="ksdSt mati">' + (!ST.buka ? 'Tutup' : !ST.boleh ? 'Terkunci' : 'Maks') + '</span>' : '<span class="ksdSt belum">Nilai</span>';
    return '<button type="button" class="ksdOrg"' + (aktif ? ' data-ksd="nilai:' + esc(x.nik) + '"' : ' aria-disabled="true"') + ' data-cari="' + esc((x.nama + ' ' + x.jabatan).toLowerCase()) + '"><span class="av">' + esc(inisial(x.nama)) + '</span><span class="tx"><b>' + esc(pendek(x.nama)) + '</b><small>' + esc([x.jabatan, x.ketPernah].filter(String).join(' · ')) + '</small></span>' + st + '</button>';
  }
  function gambarForm() {
    var x = PILIH, B = ST.butir, ada1 = B.some(function (b) { return JWB[b.id] === 1; }), lengkap = wajibAktif() ? B.every(function (b) { return JWB[b.id] >= 1; }) : B.every(function (b) { return JWB[b.id] >= 0; }) && B.some(function (b) { return JWB[b.id] >= 1; }); /* kuesioner-semua-butir-25nov */
    var h = '<div class="kartu"><div class="ksdJd"><b>' + esc(pendek(x.nama)) + (x.jabatan ? ' · ' + esc(x.jabatan) : '') + '</b><span>' + B.length + ' pertanyaan</span></div>'
      + '<div class="kecil" style="line-height:1.45">Pilih wajah yang paling cocok. ' + (wajibAktif() ? '<b style="color:var(--teks)">Semua pertanyaan wajib dinilai.</b>' : 'Tidak tahu satu pertanyaan? Pilih <b style="color:var(--teks)">Tidak tahu</b>. Tidak kenal orangnya? Tekan <b style="color:var(--teks)">Lewati</b>, tidak ada yang dikirim.') + '</div>';
    B.forEach(function (b) {
      h += '<div class="ksdRate"' + (wajibAktif() && !(JWB[b.id] >= 1) ? ' data-kosong="1" style="box-shadow:inset 0 0 0 2px var(--tMerah,#dc2626)"' : '') + '><div class="q">' + (b.ic ? esc(b.ic) + ' ' : '') + esc(b.nm || b.id) + (b.tanya ? '<small>' + esc(b.tanya) + '</small>' : '') + '</div><div class="ksdWajah" role="radiogroup" aria-label="' + esc(b.nm || b.id) + '">'
        + WAJAH.map(function (w, i) { var n = i + 1; return '<button type="button" role="radio" aria-checked="' + (JWB[b.id] === n) + '" class="' + (JWB[b.id] === n ? 'on' : '') + '" data-ksd="n:' + esc(b.id) + ':' + n + '">' + w[0] + '<small>' + n + ' ' + w[1] + '</small></button>'; }).join('') + '</div>' + (wajibAktif() ? (JWB[b.id] >= 1 ? '' : '<div class="ksdPesan" style="min-height:0;margin-top:6px">Belum dinilai (wajib)</div>') : '<div class="ksdCip"><button type="button" class="' + (JWB[b.id] === 0 ? 'on' : '') + '" data-ksd="n:' + esc(b.id) + ':0">Tidak tahu</button></div>') + '</div>'; /* kuesioner-semua-butir-25nov: tanpa Tidak tahu saat wajib */
    });
    if (ada1) {
      h += '<div class="ksdRate"><div class="q">Nilai 1 wajib pilih alasan</div><div class="ksdCip">' + ST.alasanPilihan.map(function (a) { return '<button type="button" class="' + (ALASAN.indexOf(a) >= 0 ? 'on' : '') + '" role="radio" aria-checked="' + (ALASAN[0] === a) + '" data-ksd="als:' + esc(a) + '">' + esc(a) + '</button>'; }).join('') + '</div>'
        + (ALASAN.indexOf('Lainnya') >= 0 ? '<input class="ksdIn" id="ksdAlasan" maxlength="120" placeholder="Tulis alasan singkat" autocomplete="off">' : '') + '</div>';
    }
    if (wajibAktif() && x.sudah && x.kurang) h += '<div class="ksdPesan" style="color:var(--teks)">Penilaianmu untuk staf ini belum lengkap. Nilai semua pertanyaan lalu kirim lagi.</div>';
    if (wajibAktif() && !lengkap) h += '<div class="ksdPesan" id="ksdKosongInfo">Belum dinilai: ' + B.filter(function (b) { return !(JWB[b.id] >= 1); }).map(function (b) { return esc(b.nm || b.id); }).join(', ') + '</div>';
    h += '<div class="ksdPesan" id="ksdPesan"></div><div class="ksdTb"><button type="button" data-ksd="lewati">' + (wajibAktif() ? 'Kembali ke daftar' : 'Lewati') + '</button><button type="button" class="utama" data-ksd="kirim"' + (lengkap && !KIRIM ? '' : ' disabled') + '>' + (KIRIM ? 'Mengirim…' : 'Kirim penilaian') + '</button></div></div>';
    var simpanTeks = lapisEl && lapisEl.querySelector('#ksdAlasan') ? lapisEl.querySelector('#ksdAlasan').value : '';
    lapis('Kuesioner anonim · ' + (ST.periode || ''), h);
    var el = lapisEl.querySelector('#ksdAlasan'); if (el && simpanTeks) el.value = simpanTeks; /* teks dipertahankan saat layar digambar ulang (tidak diubah tiap ketikan) */
  }
  function pesan(t) { var el = lapisEl && lapisEl.querySelector('#ksdPesan'); if (el) el.textContent = t || ''; }
  function kirim() {
    var x = PILIH, B = ST.butir; if (!x || KIRIM) return;
    var d = B.map(function (b) { return JWB[b.id] == null ? -1 : JWB[b.id]; }); /* 0 = tidak tahu (API-APP.md §4) */
    if (wajibAktif() && d.some(function (n) { return !(n >= 1 && n <= 5); })) { pesan('Semua pertanyaan wajib dinilai.'); return; } /* kuesioner-semua-butir-25nov */
    if (d.some(function (n) { return !(n >= 0 && n <= 5); }) || !d.some(function (n) { return n >= 1; })) { pesan('Isi semua pertanyaan dulu (boleh Tidak tahu), atau tekan Lewati.'); return; }
    var teks = lapisEl.querySelector('#ksdAlasan') ? String(lapisEl.querySelector('#ksdAlasan').value || '').trim() : '';
    var alasan = '';
    if (d.indexOf(1) >= 0) {
      if (!ALASAN.length) { pesan('Ada nilai 1: pilih alasannya dulu.'); return; }
      if (ALASAN.indexOf('Lainnya') >= 0 && teks.length < 5) { pesan('Tulis alasan "Lainnya" minimal 5 huruf.'); return; }
      alasan = ALASAN.join(', ');
    }
    KIRIM = true; gambarForm();
    rahasia().then(function (rhs) { return panggil(FN.kirim, [rhs, { nik: x.nik, d: d, alasan: alasan, teks: alasan ? teks : '' }], 45000); }).then(function (h) {
      KIRIM = false; if (habis(h)) return;
      if (!h || h.ok === false) { if (R && R.bunyi) R.bunyi('gagal'); gambarForm(); pesan((h && h.pesan) || 'Belum bisa dikirim. Coba lagi.'); return; }
      if (R && R.bunyi) R.bunyi('sukses'); if (R && R.getar) R.getar('sukses');
      var lama = x.sudah; ST.staf.forEach(function (s) { if (s.nik === x.nik) { s.sudah = true; s.kurang = false; } }); if (h.dapatPoin) ST.dapatPoin = true;
      ST.terisi = h.terisi != null ? (Array.isArray(h.terisi) ? h.terisi.length : Number(h.terisi) || ST.terisi) : ST.terisi + (lama ? 0 : 1);
      PILIH = null; JWB = {}; ALASAN = [];
      roti(h.pesan || ('Terkirim. Terima kasih! Sudah ' + ST.terisi + ' staf dinilai' + (ST.terisi >= ST.minPoin ? '.' : ', ' + (ST.minPoin - ST.terisi) + ' lagi untuk +5 poin.')));
      gambar();
    }, function (e) { KIRIM = false; gambarForm(); pesan(e.message); });
  }
  /* kuesioner-semua-butir-25nov: selama wajib semua butir wajib; penilaian lama yang belum lengkap = "Lengkapi" (dicek server pakai rahasia HP) */
  function wajibAktif() { return !!(ST && ST.wajib && ST.wajib.aktif); }
  function periksaKurang() {
    if (!wajibAktif() || !ST.buka || !ST.boleh) return Promise.resolve();
    return rahasia().then(function (rhs) { return panggil(FN.kirim, [rhs, { periksa: true }], 45000); }).then(function (h) {
      if (h && h.ok && h.periksa) { var k = h.kurang || []; ST.staf.forEach(function (s) { s.kurang = k.indexOf(s.nik) >= 0; }); }
    }, function () { /* server lama / sinyal */ });
  }
  /* kuesioner-wajib-25nov: kabar ke gerbang wajib (tanpa RPC) */
  function kabar() { setTimeout(function () { try { document.dispatchEvent(new CustomEvent('whl-ksn-berubah', { detail: { jenis: 'driver' } })); } catch (e) { /* */ } }, 0); }
  /** status wajib dari data terakhir: {aktif, selesai, beres, jumlah, periode} atau null (server lama) */
  function wajib() {
    if (!ST || !ST.wajib) return null; var W = ST.wajib, beres = ST.staf.filter(function (s) { return s.sudah && !s.kurang; }).length, target = Number(W.target || W.jumlah) || ST.staf.length; /* hanya yang DINILAI */
    return { aktif: !!W.aktif && ST.buka && ST.boleh, selesai: beres >= target, beres: Math.min(beres, target), jumlah: target, periode: ST.periode };
  }
  function klik(ev) {
    var b = ev.target.closest('[data-ksd]'); if (!b || !lapisEl || !lapisEl.contains(b)) return; var n = b.getAttribute('data-ksd');
    if (n === 'saring') return;
    if (n === 'tutup') { if (PILIH) { PILIH = null; JWB = {}; ALASAN = []; gambar(); return; } if (R && R.bunyi) R.bunyi('tutup'); tutup(); return; }
    if (n === 'ulang') { buka(); return; }
    if (n === 'cari') { CARI = true; gambar(); var c = lapisEl.querySelector('[data-ksd="saring"]'); if (c) c.focus(); return; }
    if (n === 'lewati') { PILIH = null; JWB = {}; ALASAN = []; gambar(); return; }
    if (n === 'kirim') { kirim(); return; }
    if (n.indexOf('nilai:') === 0 && !(ST.buka && ST.boleh)) { roti(ST.pesanBoleh || ST.ketBuka || 'Kamu belum bisa menilai bulan ini.'); return; }
    if (n.indexOf('nilai:') === 0) { var nik = n.slice(6); PILIH = ST.staf.filter(function (s) { return s.nik === nik; })[0] || null; JWB = {}; ALASAN = []; if (R && R.getar) R.getar(); gambar(); var g = lapisEl.querySelector('.ksnIsi'); if (g) g.scrollTop = 0; return; }
    if (n.indexOf('n:') === 0) { var p = n.split(':'); JWB[p[1]] = +p[2]; if (!ST.butir.some(function (x) { return JWB[x.id] === 1; })) ALASAN = []; if (R && R.getar) R.getar(); gambarForm(); return; }
    if (n.indexOf('als:') === 0) { var a = n.slice(4); ALASAN = ALASAN[0] === a ? [] : [a]; gambarForm(); /* server: alasan = SALAH SATU alasanPilihan */ }
  }
  /* saring daftar staf lain: hanya membaca value input */
  document.addEventListener('input', function (ev) {
    var t = ev.target; if (!t || !t.getAttribute || t.getAttribute('data-ksd') !== 'saring' || !lapisEl) return; var q = String(t.value || '').toLowerCase().trim();
    [].forEach.call(lapisEl.querySelectorAll('#ksdLain .ksdOrg'), function (el) { el.style.display = !q || (el.getAttribute('data-cari') || '').indexOf(q) >= 0 ? '' : 'none'; });
  });

  function boleh(S) { return driver(S) && punya(FN.status) && punya(FN.kirim); }
  /** item menu [ikon, label, aksi, lencana, id] (dipakai WHL_POIN.menu -> Hub Poin WHL) */
  function menu(S) { return boleh(S) ? [['kuesioner', 'Nilai staf', 'ksd', 0, 'ksd']] : []; }
  function bukaKe(ke, ctx) { if (ke !== 'ksd') return false; buka(ctx); return true; }
  function lupakan() { ST = null; PILIH = null; JWB = {}; ALASAN = []; CARI = false; tutup(); }
  window.WHL_KSD = { buka: buka, bukaKe: bukaKe, boleh: boleh, menu: menu, tutup: tutup, lupakan: lupakan, FN: FN, /* kuesioner-wajib-25nov: */ muatStatus: function (ctx) { CTX = ctx || CTX; return muat(); }, wajib: wajib, terbuka: function () { return !!lapisEl; }, _uji: { norm: norm, st: function () { return ST; } } };
})();
