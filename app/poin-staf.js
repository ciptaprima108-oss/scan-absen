/* WHL App v3.36 — POIN KARYAWAN (staf non-driver) + NILAI REKAN KERJA. Andro, 17 Nov 2026 malam.
 * Rancangan: Upgrade\poin-karyawan-17nov\USULAN.md + mockup layar 1 & 3. Server: Vanesa (DASHBOARD PusatPoinStaf.gs, PusatKsnDriver.gs).
 * 1) Poin saya (staf): poin.js memanggil WHL_POIN_STAF.slot(ctx) -> kotak di layar Poin WHL berisi
 *    kriteria peran hari ini, tantangan minggu ini, "akan dikurangi" (HANYA kalau server bilang pengurang aktif; Reza: poin PLUS dulu),
 *    dan ringkas nilai rekan kerja. Data: pusatPoinStaf(token).
 * 2) Layar "Nilai rekan kerja" (ke = 'nilaiRekan'): Nilai dari staf x (n penilai) & Nilai dari driver y (n penilai), TERPISAH.
 *    Hanya untuk orangnya sendiri (+ pimpinan, server yang menentukan isi `daftar`). Data: pusatKsnDriverHasil(token).
 * Penyetuju ACC (Reza, Fanza, Puput, Rike) tetap dapat poin tapi tidak tampil di papan staf (server: ikutPapan:false).
 * Semua fitur tersembunyi kalau pusatPing belum memuat fungsinya. Tanpa alert/confirm. Bentuk data dibaca lewat norm*() supaya
 * perubahan nama field server cukup diubah di satu tempat.
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA;
  var CTX = null, DATA = null, JALAN = null, NIL = null, NIL_JALAN = null, lapisEl = null;
  var FN = { poin: 'pusatPoinStaf', hasil: 'pusatKsnDriverHasil', kurang: 'pusatPoinKurangSaya' }; /* kurang = API-APP.md §1b (staf & driver) */
  var KUR = null, KUR_JALAN = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ang(n, d) { var v = Number(n); if (!isFinite(v)) return '–'; return v.toLocaleString('id-ID', { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 1 : d }); }
  function sesi() { return CTX && CTX.sesi ? CTX.sesi() : null; }
  function punya(fn) { return API.Pusat.asli() && API.Pusat.punya(fn); }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function ILUS(n) { return window.WHL_ILUS ? window.WHL_ILUS(n) : ''; }
  function panggil(fn, args, ms) { var S = sesi(); if (!S || !S.tokenPusat) return Promise.reject(new Error('Belum masuk.')); return API.Pusat.panggil(fn, [S.tokenPusat].concat(args || []), ms || 30000); }
  function habis(h) { if (h && h.login === false) { tutup(); if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return true; } return false; }
  function staf() { var S = sesi(); return !!(S && S.user && S.user.peran !== 'driver'); }
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  function tgl(t) { var m = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/); if (!m) return esc(t || ''); var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return HARI[d.getUTCDay()] + ' ' + (+m[3]) + ' ' + BLN[+m[2] - 1] + (m[4] ? ' ' + m[4] + '.' + m[5] : ''); }
  var IKON = { PGW_TUNJUK: '🛠️', PGW_P2H: '📋', PGW_GANTUNG0: '⏱️', HZ_CEK: '⚠️', MEK_STD: '🔧', MEK_AWET: '🧰', MEK_SOP: '✅', ADM_DO1: '📄', ADM_MEJA: '🗂️', ADM_ACC: '✔️', HR_IZIN: '📝', HR_ROSTER: '📅',
    HSE_LAPAWAL: '🚨', HSE_DOK: '🪪', LOG_SELIP0: '📦', LOG_JELAS: '🔎', LOG_TRX: '🧾', FUEL_TANGKI: '⛽', FUEL_VS: '🎫', ABSEN: '⏰', HADIRPENUH: '🗓️', HAZARD: '⚠️', KSN_ISI: '📝', KSN_NILAI: '⭐', HADIR: '🗓️', TANTANGAN: '🏆', BULANAN: '🏅', PAPAN: '🥇' };
  function ikon(k) { k = String(k || ''); return IKON[k] || IKON[k.replace(/^S_/, '')] || '⭐'; }

  function gaya() {
    if (document.getElementById('pstGaya')) return; var st = document.createElement('style'); st.id = 'pstGaya';
    st.textContent = '.pstLapis .ksnIsi{padding-bottom:44px}#pstSlot:empty{display:none}'
      + '.pstUji{display:inline-block;font-size:11px;font-weight:900;padding:2px 8px;border-radius:99px;background:#FFC530;color:#3b1d00;margin-left:6px;vertical-align:middle}'
      + '.pstJd{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:6px}.pstJd b{font-size:14.5px}.pstJd span{font-size:11.5px;color:var(--redup);font-weight:700;text-align:right}'
      + '.pstKr{display:flex;gap:10px;align-items:center;padding:9px 0;border-top:1px dashed var(--garis)}.pstKr:first-of-type{border-top:0}'
      + '.pstKr .ik{width:36px;height:36px;flex:none;border-radius:12px;background:var(--tint);display:grid;place-items:center;font-size:18px}.pstKr .tx{flex:1;min-width:0}.pstKr .tx b{display:block;font-size:13.5px}.pstKr .tx small{display:block;color:var(--redup);font-size:12px}'
      + '.pstBar{height:6px;border-radius:9px;background:var(--panel2);margin-top:6px;overflow:hidden}.pstBar i{display:block;height:100%;border-radius:9px;background:var(--utama)}.pstBar i.hijau{background:#16a34a}.pstBar i.kuning{background:#E99A00}'
      + '.pstPn{font-family:Nunito,sans-serif;font-weight:900;font-size:14px;color:var(--utama);white-space:nowrap;flex:none}'
      + '.pstTtg{background:linear-gradient(135deg,var(--tint),var(--panel))}.pstTtg .nm{font-size:16px;font-weight:900;margin:2px 0 4px}.pstHari{display:flex;gap:4px;margin-top:10px}.pstHari span{flex:1;min-width:0;text-align:center;font-size:11px;font-weight:800;padding:6px 0;border-radius:8px;background:var(--panel2);color:var(--redup)}'
      + '.pstHari span.ok{background:rgba(22,163,74,.16);color:#15803d}.pstHari span.no{background:rgba(242,72,77,.14);color:var(--tMerah)}'
      + '.pstKurang{border-radius:16px;padding:11px 13px;margin:12px 0;background:rgba(255,197,48,.18);color:var(--tKuning);font-size:13px;line-height:1.5;font-weight:600}.pstKurang b{color:var(--teks)}'
      + '.pstNil2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pstNil2 > div{background:var(--panel2);border-radius:14px;padding:12px 8px;text-align:center;min-width:0}'
      + '.pstNil2 .lb{font-size:12px;color:var(--redup);font-weight:800}.pstNil2 .an{font-family:Nunito,sans-serif;font-size:30px;font-weight:900;line-height:1.15}.pstNil2 .an small{font-size:13px;color:var(--redup);font-weight:800}'
      + '.pstNil2 .bt{color:#E99A00;letter-spacing:1px;font-size:13px}.pstNil2 .np{font-size:11.5px;color:var(--redup);font-weight:700}.pstNil2 .blm{font-size:12px;color:var(--redup);font-weight:700;margin-top:8px;line-height:1.35}'
      + '.pstButir{display:flex;justify-content:space-between;gap:8px;font-size:13px;padding:7px 0;border-top:1px dashed var(--garis)}.pstButir:first-of-type{border-top:0}.pstButir span:last-child{font-weight:900;flex:none}'
      + '.pstTb{margin-top:10px;width:100%;min-height:44px;border-radius:12px;background:var(--panel2);color:var(--teks);font:inherit;font-weight:800;font-size:13.5px}'
      + '.pstOrg{display:flex;gap:10px;align-items:center;padding:9px 0;border-top:1px solid var(--garis)}.pstOrg:first-of-type{border-top:0}.pstOrg .tx{flex:1;min-width:0}.pstOrg .tx b{display:block;font-size:13.5px}.pstOrg .tx small{display:block;color:var(--redup);font-size:11.5px}.pstOrg .nl{font-family:Nunito,sans-serif;font-weight:900;font-size:13px;text-align:right;flex:none;line-height:1.3}'
      + '.pstCari{width:100%;min-height:44px;border-radius:12px;border:1px solid var(--garis);background:var(--panel);color:var(--teks);padding:8px 12px;font:inherit;font-size:14px;box-sizing:border-box;margin-bottom:8px}'
      + 'html[data-tema="gelap"] .pstHari span.ok{color:#4ade80}';
    document.head.appendChild(st);
  }

  /* ---------- normalisasi data server (satu tempat kalau nama field berubah) ---------- */
  function normPoin(h) {
    /* kontrak API-APP.md §1 (Vanesa 17 Nov) */
    var d = h || {}, hi = d.hariIni, sk = d.skorMinggu && typeof d.skorMinggu === 'object' ? d.skorMinggu : null, tg = d.tantangan || {}, mg = tg.minggu || null, pg = d.pengurang || {};
    var kr = (Array.isArray(d.kriteria) ? d.kriteria : []).map(function (x) {
      return { kode: x.kode, label: x.label, ikon: x.ikon, ket: x.teks || x.ket || '', dapat: Number(x.dapat != null ? x.dapat : x.poin) || 0, maks: Number(x.maks) || 0, persen: x.persen, status: x.status || '' };
    });
    return {
      ok: d.ok !== false, aktif: d.aktif !== false, tolak: d.tolak === true, pesan: d.pesan || '',
      mode: String(d.mode || '').toUpperCase(), uji: d.uji === true || String(d.mode || '').toUpperCase() === 'UJI', /* UJI = masa uji (belum masuk saldo) */
      peran: d.peranLabel || d.peran || '', ikutPapan: d.ikutPapan !== false && !(sk && sk.ikut === false),
      batas: Number(d.batasHarian) || 20, hariIni: Math.max(0, Number(hi && typeof hi === 'object' ? hi.poin : hi) || 0), ketHari: hi && typeof hi === 'object' ? hi.keterangan || '' : '',
      tanggal: d.hari || d.tanggal || '', shift: d.shift || '',
      skor: sk && sk.persen != null ? Number(sk.persen) : null, urut: sk && sk.urut != null ? Number(sk.urut) : null,
      kriteria: kr,
      tantangan: mg, berikut: mg && mg.berikut ? mg.berikut : null, bulan: Array.isArray(tg.bulan) ? tg.bulan : [],
      /* Reza 17 Nov 21.xx: pengurang NYALA (staf & driver) -> kotak "Akan dikurangi" selalu tampil kalau server mengirim isi akan[] */
      pengurangAktif: pg.aktif === true, kurang: Array.isArray(pg.akan) ? pg.akan : [], caraSanggah: pg.caraSanggah || '',
      riwayatUji: Array.isArray(d.riwayatUji) ? d.riwayatUji : []
    };
  }
  function normSkor(x) { /* {nilai, n} | {rata, penilai} ; nilai null = belum cukup penilai */
    x = x || {}; var n = Number(x.n != null ? x.n : x.penilai) || 0, v = x.nilai != null ? x.nilai : x.rata;
    return { nilai: v == null || v === '' || !isFinite(Number(v)) ? null : Number(v), n: n, min: Number(x.min || x.minPenilai) || 0, butir: Array.isArray(x.butir) ? x.butir : [] };
  }
  function normHasil(h) {
    var d = h || {};
    var pr = String(d.periode || d.label || ''), m = pr.match(/^(\d{4})-(\d{2})$/), BL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    if (m) pr = BL[+m[2] - 1] + ' ' + m[1];
    return { ok: d.ok !== false, aktif: d.aktif !== false, pesan: d.pesan || d.catatan || '', catatan: d.catatan || '', periode: pr, tutup: d.tutup || '',
      staf: normSkor(d.dariStaf), driver: normSkor(d.dariDriver), poin: Array.isArray(d.poin) ? d.poin : [],
      daftar: Array.isArray(d.daftar) ? d.daftar : null /* pimpinan: [{nama, jabatan, dariStaf, dariDriver}] */ };
  }

  /* ---------- data ---------- */
  function muat(paksa) {
    if (!staf() || !punya(FN.poin)) return Promise.resolve(null);
    if (JALAN) return JALAN;
    if (DATA && !paksa && Date.now() - DATA.t < 5 * 60000) return Promise.resolve(DATA.d);
    JALAN = panggil(FN.poin, []).then(function (h) { JALAN = null; if (habis(h)) return null; DATA = { d: normPoin(h), t: Date.now() }; isiSlot(); return DATA.d; },
      function (e) { JALAN = null; if (!DATA) DATA = { d: { ok: false, pesan: e.message, kriteria: [], kurang: [] }, t: Date.now() - 4 * 60000 }; isiSlot(); throw e; });
    return JALAN;
  }
  function muatNilai(paksa) {
    if (!staf() || !punya(FN.hasil)) return Promise.resolve(null);
    if (NIL_JALAN) return NIL_JALAN;
    if (NIL && !paksa && Date.now() - NIL.t < 10 * 60000) return Promise.resolve(NIL.d);
    NIL_JALAN = panggil(FN.hasil, []).then(function (h) { NIL_JALAN = null; if (habis(h)) return null; NIL = { d: normHasil(h), t: Date.now() }; isiSlot(); return NIL.d; },
      function (e) { NIL_JALAN = null; throw e; });
    return NIL_JALAN;
  }

  /** pengurang untuk DRIVER (staf memakai pusatPoinStaf.pengurang): pusatPoinKurangSaya */
  function muatKurang(paksa) {
    if (!punya(FN.kurang)) return Promise.resolve(null);
    if (KUR_JALAN) return KUR_JALAN;
    if (KUR && !paksa && Date.now() - KUR.t < 5 * 60000) return Promise.resolve(KUR.d);
    KUR_JALAN = panggil(FN.kurang, []).then(function (h) { KUR_JALAN = null; if (habis(h)) return null; var d = h || {}; KUR = { d: { aktif: d.ok !== false && d.aktif !== false, kurang: Array.isArray(d.akan) ? d.akan : [], caraSanggah: d.caraSanggah || '' }, t: Date.now() }; isiSlot(); return KUR.d; },
      function (e) { KUR_JALAN = null; throw e; });
    return KUR_JALAN;
  }
  /* ---------- 1. kotak di layar Poin WHL (staf; driver = kartu Akan dikurangi saja) ---------- */
  /** dipanggil poin.js gambarPoin(): html kotak (dari data tersimpan) + muat ulang di belakang */
  function slot(ctx) {
    CTX = ctx || CTX;
    if (!staf()) { if (!punya(FN.kurang)) return ''; gaya(); if (!KUR || Date.now() - KUR.t > 5 * 60000) muatKurang().catch(function () { }); return '<div id="pstSlot">' + isiHtml() + '</div>'; }
    if (!(punya(FN.poin) || punya(FN.hasil))) return '';
    gaya();
    if (!DATA || Date.now() - DATA.t > 5 * 60000) muat().catch(function () { });
    if (!NIL || Date.now() - NIL.t > 10 * 60000) muatNilai().catch(function () { });
    return '<div id="pstSlot">' + isiHtml() + '</div>';
  }
  function isiSlot() { var el = document.getElementById('pstSlot'); if (el) el.innerHTML = isiHtml(); }
  function isiHtml() {
    var h = '', d = DATA && DATA.d;
    if (!staf()) return KUR && KUR.d && KUR.d.aktif ? kurangHtml(KUR.d) : '';
    if (punya(FN.poin)) {
      if (!d) h += '<div class="kartu"><div class="kecil"><span class="putar"></span> Memuat kriteria peranmu…</div></div>';
      else if (d.tolak) h += '';
      else if (d.aktif === false) h += '<div class="kartu kecil" style="line-height:1.5"><b style="color:var(--teks)">Poin karyawan belum dibuka.</b> ' + esc(d.pesan || 'Sedang disiapkan.') + '</div>';
      else if (d.ok === false) h += '<div class="kartu kecil">Kriteria peran belum bisa dimuat. ' + esc(d.pesan || '') + ' <button type="button" class="tKecil" data-pst="ulang">Coba lagi</button></div>';
      else h += kurangHtml(d) + kriteriaHtml(d) + tantanganHtml(d) + ujiHtml(d);
    }
    if (punya(FN.hasil)) h += nilaiRingkas();
    return h;
  }
  function kriteriaHtml(d) {
    var K = d.kriteria, uji = d.uji;
    var h = '<div class="kartu"><div class="pstJd"><b>Kriteria peranmu hari ini' + (uji ? '<span class="pstUji">MASA UJI</span>' : '') + '</b><span>' + esc([d.peran, d.tanggal ? tgl(d.tanggal) : '', d.shift].filter(String).join(' · ')) + '</span></div>';
    h += '<div class="kecil" style="margin-bottom:4px;line-height:1.45">Hari ini <b style="color:var(--teks)">' + ang(d.hariIni, 0) + ' / ' + ang(d.batas, 0) + '</b> poin (batas harian staf)'
      + (d.skor != null && d.ikutPapan ? ' · skor minggu ' + ang(d.skor, 0) + '%' + (d.urut ? ' · #' + ang(d.urut, 0) + ' Staf' : '') : '') + (d.ketHari ? '<br>' + esc(d.ketHari) : '') + '</div>';
    if (!K.length) h += '<div class="kecil" style="padding:8px 0">Belum ada kriteria khusus untuk peranmu. Poin tetap dari absen tepat, hazard, dan bonus mingguan.</div>';
    h += K.map(function (x) {
      var p = x.dapat, mk = x.maks, pr = x.persen != null ? Number(x.persen) : (mk ? p / mk * 100 : 0), st = x.status;
      var kls = st === 'tunggu' ? 'kuning' : st === 'dapat' || pr >= 100 ? 'hijau' : '';
      return '<div class="pstKr"><span class="ik">' + (x.ikon || ikon(x.kode)) + '</span><div class="tx"><b>' + esc(x.label || x.kode) + '</b>' + (x.ket ? '<small>' + esc(x.ket) + '</small>' : '')
        + '<div class="pstBar"><i class="' + kls + '" style="width:' + Math.max(0, Math.min(100, pr || 0)).toFixed(0) + '%"></i></div></div><span class="pstPn">+' + ang(p, 0) + (mk ? '/' + ang(mk, 0) : '') + (st === 'tunggu' ? '?' : '') + '</span></div>';
    }).join('');
    if (uji) h += '<div class="kecil" style="margin-top:8px;line-height:1.45">Masa uji: poin peran dihitung & tampil dulu, <b>belum masuk saldo</b> sampai angka dikalibrasi.</div>';
    if (!d.ikutPapan) h += '<div class="kecil" style="margin-top:8px;line-height:1.45">Kamu tidak tampil di papan peringkat staf minggu ini (penyetuju ACC / pimpinan, atau hadir kurang dari 4 hari). Poinmu tetap masuk.</div>';
    return h + '</div>';
  }
  var ST_T = { ok: ['ok', ' ✓'], tercapai: ['ok', ' ✓'], gagal: ['no', ' ✗'] };
  function tantanganHtml(d) {
    var t = d.tantangan, b = d.berikut, h = '';
    if (t && t.nama && t.untukSaya !== false) {
      var H = Array.isArray(t.hari) ? t.hari : [];
      h += '<div class="kartu pstTtg"><div class="pstJd"><b>🏆 Tantangan minggu ini</b><span>' + (t.sampai ? 's/d ' + tgl(t.sampai) + ' 06.00' : '') + '</span></div><div class="nm">' + esc(t.nama) + (t.status === 'tercapai' ? ' ✅' : t.status === 'gagal' ? ' ❌' : '') + '</div>'
        + '<div class="kecil" style="line-height:1.45">' + esc(t.syarat || t.ket || '') + (t.poin ? ' Hadiah <b style="color:var(--teks)">+' + ang(t.poin, 0) + '</b> (hadir minimal 4 hari).' : '') + '</div>'
        + (H.length ? '<div class="pstHari">' + H.map(function (x) { var k = ST_T[x.status] || ['', '']; return '<span class="' + k[0] + '">' + esc(x.label || x.lb || '') + k[1] + '</span>'; }).join('') + '</div>' : '') + '</div>';
    } else if (b && b.nama) h += '<div class="kartu kecil" style="line-height:1.45">🏆 Tantangan peranmu: <b style="color:var(--teks)">' + esc(b.nama) + '</b> minggu depan.</div>';
    var B = (d.bulan || []).filter(function (x) { return x.untukSaya !== false && x.status !== 'bukan'; });
    if (B.length) h += '<div class="kartu"><div class="pstJd"><b>🏅 Tantangan bulan ini</b></div>' + B.map(function (x) {
      return '<div class="pstKr"><span class="ik">' + (x.status === 'tercapai' ? '✅' : x.status === 'gagal' ? '❌' : '⏳') + '</span><div class="tx"><b>' + esc(x.nama) + '</b><small>' + esc([x.syarat, x.ket].filter(Boolean).join(' · ')) + '</small></div><span class="pstPn"' + (x.status === 'gagal' ? ' style="color:var(--redup);text-decoration:line-through"' : '') + '>+' + ang(x.poin, 0) + '</span></div>';
    }).join('') + '</div>';
    return h;
  }
  /** Reza 17 Nov malam: pengurang NYALA untuk staf & driver -> selalu tampil kalau server mengirim akan[] (tidak digantung flag aktif) */
  function kurangHtml(d) {
    if (!d.kurang.length) return '';
    return '<div class="pstKurang"><b>Akan dikurangi (masa sanggah 48 jam)</b>' + d.kurang.map(function (x) {
      return '<div style="margin-top:6px">' + tgl(x.hari || x.tgl) + ' · ' + esc(x.label || x.kode || '') + ' · <b style="color:var(--tMerah)">−' + ang(Math.abs(Number(x.poin) || 0), 0) + '</b>' + (x.alasan ? '<br><span style="color:var(--teks)">' + esc(x.alasan) + '</span>' : '')
        + (x.sanggahSampai ? '<br>Bisa disanggah sampai <b>' + tgl(x.sanggahSampai) + '</b>' : '') + '</div>';
    }).join('') + '<div style="margin-top:8px">' + esc(d.caraSanggah || 'Ada izin/alasan? Ajukan izin di Kehadiran atau hubungi admin sebelum batas sanggah. Izin yang disetujui membatalkan pengurang otomatis.') + '</div><button type="button" class="pstTb" data-ke="poinSanggah" style="background:var(--panel)">Sanggah ke admin ›</button></div>';
  }
  function ujiHtml(d) {
    if (!d.uji || !d.riwayatUji.length) return '';
    return '<div class="kartu"><div class="pstJd"><b>Riwayat masa uji</b><span>belum masuk saldo</span></div>' + d.riwayatUji.slice(0, 30).map(function (x) {
      var p = Number(x.poin) || 0;
      return '<div class="pstKr"><span class="ik">' + ikon(x.sumber) + '</span><div class="tx"><b>' + esc(x.label || x.sumber) + '</b><small>' + esc([tgl(x.hari), x.catatan].filter(Boolean).join(' · ')) + '</small></div><span class="pstPn" style="color:' + (p < 0 ? 'var(--tMerah)' : 'var(--redup)') + '">' + (p > 0 ? '+' : p < 0 ? '−' : '') + ang(Math.abs(p), 0) + '</span></div>';
    }).join('') + '</div>';
  }
  function nilaiRingkas() {
    var n = NIL && NIL.d;
    var h = '<div class="kartu"><div class="pstJd"><b>Nilai rekan kerja</b><span>' + esc(n && n.periode ? n.periode : 'hanya kamu & pimpinan') + '</span></div>';
    if (!n) h += '<div class="kecil"><span class="putar"></span> Memuat…</div>';
    else if (n.aktif === false || n.ok === false) h += '<div class="kecil">' + esc(n.pesan || 'Belum ada hasil kuesioner.') + '</div>';
    else h += duaNilai(n, true) + (n.catatan ? '<div class="kecil" style="margin-top:6px">' + esc(n.catatan) + '</div>' : '');
    return h + '<button type="button" class="pstTb" data-ke="nilaiRekan">Lihat rincian nilai ›</button></div>';
  }
  function bintang(v) { var b = Math.round(Number(v) || 0); return '★★★★★'.slice(0, b) + '☆☆☆☆☆'.slice(0, 5 - b); }
  function satuNilai(lb, s, minDef) {
    var min = s.min || minDef;
    if (s.nilai == null) return '<div><div class="lb">' + lb + '</div><div class="an">–</div><div class="blm">Belum cukup penilai<br>(' + ang(s.n, 0) + ' dari minimal ' + ang(min, 0) + ')</div></div>';
    return '<div><div class="lb">' + lb + '</div><div class="an">' + ang(s.nilai, 1) + '<small> / 5</small></div><div class="bt">' + bintang(s.nilai) + '</div><div class="np">' + ang(s.n, 0) + ' penilai</div></div>';
  }
  function duaNilai(n) { return '<div class="pstNil2">' + satuNilai('Nilai dari staf', n.staf, 5) + satuNilai('Nilai dari driver', n.driver, 10) + '</div>'; }

  /* ---------- 2. layar Nilai rekan kerja ---------- */
  function lapis(judul, sub, isi) {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis pstLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik); lapisEl.addEventListener('input', saring);
    }
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-pst="tutup" aria-label="Kembali">‹</button><div class="nm">' + esc(sub) + '<b>' + esc(judul) + '</b></div></div><div class="ksnIsi">' + isi + '</div>';
  }
  function tutup() { if (!lapisEl) return false; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); return true; }
  function bukaNilai(ctx) {
    CTX = ctx || CTX; gaya();
    if (!punya(FN.hasil)) { roti('Nilai rekan kerja belum tersedia di server.'); return; }
    gambarNilai();
    muatNilai(true).then(function () { if (lapisEl) gambarNilai(); }, function (e) { if (lapisEl && !NIL) lapis('Nilai rekan kerja', 'Kuesioner', '<div class="kartu pnKosong">' + ILUS('kuesioner') + '<b>Belum bisa dimuat</b><small>' + esc(e.message) + '</small><button type="button" class="tKecil" data-pst="ulangNilai" style="margin-top:10px">Coba lagi</button></div>'); });
  }
  function gambarNilai() {
    var n = NIL && NIL.d, sub = 'Hanya kamu & pimpinan yang bisa melihat';
    if (!n) { lapis('Nilai rekan kerja', sub, R && R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>'); return; }
    if (n.aktif === false || n.ok === false) { lapis('Nilai rekan kerja', sub, '<div class="kartu pnKosong">' + ILUS('kuesioner') + '<b>Belum ada hasil</b><small>' + esc(n.pesan || 'Hasil tampil sesudah periode kuesioner ditutup.') + '</small></div>'); return; }
    var h = '<div class="kecil" style="margin:2px 4px 10px;line-height:1.5">' + (n.periode ? 'Periode <b style="color:var(--teks)">' + esc(n.periode) + '</b>' + (n.tutup ? ' · ditutup ' + esc(tgl(n.tutup)) : '') + '. ' : '') + 'Siapa yang menilai tidak pernah ditampilkan.</div>';
    h += '<div class="kartu">' + duaNilai(n) + '</div>';
    if (n.driver.butir.length) h += '<div class="kartu"><div class="pstJd"><b>Dari driver</b><span>' + n.driver.butir.length + ' butir</span></div>' + n.driver.butir.map(butir).join('') + '</div>';
    if (n.staf.butir.length) h += '<div class="kartu"><div class="pstJd"><b>Dari staf</b><span>' + n.staf.butir.length + ' butir</span></div>' + n.staf.butir.map(butir).join('') + '</div>';
    if (n.poin.length) h += '<div class="kartu"><div class="pstJd"><b>Poin dari kuesioner</b></div>' + n.poin.map(function (x) { return '<div class="pstButir"><span>' + esc(x.label || '') + '</span><span style="color:#16a34a">+' + ang(x.poin, 0) + '</span></div>'; }).join('') + '</div>';
    if (n.daftar) {
      h += '<h2 class="bagW">Semua staf <span>' + n.daftar.length + '</span></h2><div class="kartu"><input class="pstCari" type="search" placeholder="Cari nama / jabatan" aria-label="Cari staf" data-pst="cari">'
        + '<div id="pstDaftar">' + n.daftar.map(function (x) {
          var s = normSkor(x.dariStaf), d = normSkor(x.dariDriver);
          return '<div class="pstOrg" data-cari="' + esc(String((x.nama || '') + ' ' + (x.jabatan || '')).toLowerCase()) + '"><div class="tx"><b>' + esc(x.nama || '') + '</b><small>' + esc(x.jabatan || '') + '</small></div><span class="nl">Staf ' + (s.nilai == null ? '–' : ang(s.nilai, 1)) + ' <small style="color:var(--redup)">(' + ang(s.n, 0) + ')</small><br>Driver ' + (d.nilai == null ? '–' : ang(d.nilai, 1)) + ' <small style="color:var(--redup)">(' + ang(d.n, 0) + ')</small></span></div>';
        }).join('') + '</div></div>';
    }
    h += '<div class="kecil" style="margin:12px 6px;text-align:center;line-height:1.5">Nilai di bawah 4,0 tidak mengurangi poin. Nilai staf tampil kalau minimal 5 penilai, nilai driver minimal 10 penilai.</div>';
    lapis('Nilai rekan kerja', sub, h);
  }
  function butir(x) { var v = x.nilai != null ? x.nilai : x.rata; return '<div class="pstButir"><span>' + esc(x.nm || x.label || x.id || '') + '</span><span>' + (v == null ? '–' : ang(v, 1)) + '</span></div>'; }
  function saring(ev) {
    var t = ev.target; if (!t || t.getAttribute('data-pst') !== 'cari') return; var q = String(t.value || '').toLowerCase().trim(); /* hanya membaca value, tidak mengubahnya */
    [].forEach.call(lapisEl.querySelectorAll('#pstDaftar .pstOrg'), function (el) { el.style.display = !q || el.getAttribute('data-cari').indexOf(q) >= 0 ? '' : 'none'; });
  }
  function klik(ev) {
    var b = ev.target.closest('[data-pst]'); if (!b || !lapisEl || !lapisEl.contains(b)) return; var n = b.getAttribute('data-pst');
    if (n === 'tutup') { if (R && R.bunyi) R.bunyi('tutup'); tutup(); return; }
    if (n === 'ulangNilai') { NIL = null; bukaNilai(); }
  }
  /* tombol "Coba lagi" di kotak (di dalam layar Poin WHL milik poin.js) */
  document.addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('#pstSlot [data-pst="ulang"]'); if (!b) return; DATA = null; isiSlot(); muat(true).catch(function (e) { roti(e.message); }); });

  /** pintu dari WHL_POIN.buka: true = aksi milik modul ini */
  function buka(ke, ctx) { if (ke !== 'nilaiRekan') return false; bukaNilai(ctx); return true; }
  function boleh(S) { return !!(S && S.user && S.user.peran !== 'driver' && punya(FN.hasil)); }
  function lupakan() { DATA = null; NIL = null; KUR = null; JALAN = null; NIL_JALAN = null; KUR_JALAN = null; tutup(); }
  window.WHL_POIN_STAF = { slot: slot, buka: buka, boleh: boleh, muat: muat, lupakan: lupakan, tutup: tutup, FN: FN, _uji: { normPoin: normPoin, normHasil: normHasil, isiHtml: isiHtml } };
})();
