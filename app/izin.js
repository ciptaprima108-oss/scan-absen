/* WHL App — IZIN / SAKIT / CUTI / OFF native + RIWAYAT LEMBUR (v3.19, kehadiran-izin-15nov, Andro 15 Nov 2026).
 * Kontrak: Upgrade\kehadiran-izin-15nov\KONTRAK-APP.md (Hesti, DASHBOARD api "pusat", argumen 1 = tokenPusat, tanpa objek Date):
 *   pusatIzinOpsi [t] -> {ok, bolehAju, pesanAju, bolehAcc, menungguAcc, jenis[{kode,label,ket,lampiran,susulHari}], aturan{maksHari,cutiMinHari,...,fotoMaksMB}, cuti{tahun,jatah,terpakai,menunggu,sisa,catatan}, penyetuju}
 *   pusatIzinAjukan [t, {cid, jenis, mulai, selesai, alasan, foto}] -> {ok, id, dobel?, hari, catatan, pesan}
 *   pusatIzinSaya [t] -> {ok, cuti, ringkas{menunggu,disetujui,ditolak}, list[{id,jenis,label,mulai,selesai,hari,alasan,status,dibuat,lewat,oleh,waktuPutus,alasanTolak,catatan,catRoster,adaLampiran}]}
 *   pusatIzinAntre [t] -> {ok, list[{id,nama,nrp,jabatan,jenis,label,mulai,selesai,hari,alasan,dibuat,lewat,catatan,adaLampiran,cutiTerpakai,cutiSisa,barengan[]}], riwayat[]}
 *   pusatIzinPutus [t, id, 'ACC'|'TOLAK', alasan] -> {ok, id, status, catRoster, pesan}
 *   pusatIzinBatal [t, id] -> {ok, id, status:'DIBATALKAN', pesan}
 *   pusatIzinLampiran [t, id] -> {ok, tipe, pdf, src:'data:...;base64,...'}
 *   pusatLemburRiwayat [t, 'yyyy-MM'] -> {ok, bulan, namaBulan, bulanAda[], ringkas{ajuan,disetujui,ditolak,menunggu,lain,jamAcc,jamMinta,jamTercatat,menitTercatat}, list[], tercatat[]}
 * Fitur aktif kalau pusatPing memuat pusatIzinOpsi (izin) / pusatLemburRiwayat (riwayat lembur). Belum ada = hub tetap memakai halaman web ?mode=izin seperti 3.18.
 * Alur ajukan / ACC lembur TIDAK diubah (tetap lembur.js).
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA || {};
  var N = { opsi: 'pusatIzinOpsi', ajukan: 'pusatIzinAjukan', saya: 'pusatIzinSaya', antre: 'pusatIzinAntre', putus: 'pusatIzinPutus', batal: 'pusatIzinBatal', lampiran: 'pusatIzinLampiran', rl: 'pusatLemburRiwayat' };
  var CTX = null, OPSI = null, SAYA = null, ANTRE = null, RIW = [], RL = null, rlBulan = '', lapisEl = null, lihatEl = null, mode = 'saya', galat = '', sibuk = false, urutan = 0;
  var rlUrut = 0, tambahYakin = '', F = null, CID = '', yakin = '', tolakId = '', batalYakin = '', notifId = '';
  var NB = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var JENIS0 = [{ kode: 'IZIN', label: 'Izin', lampiran: 'opsional' }, { kode: 'SAKIT', label: 'Sakit', lampiran: 'wajib' }, { kode: 'CUTI', label: 'Cuti', lampiran: 'opsional' }, { kode: 'OFF', label: 'OFF', lampiran: 'opsional' }];
  var ST = { MENUNGGU: ['kuning', 'Menunggu ACC'], DISETUJUI: ['hijau', 'Disetujui'], DITOLAK: ['merah', 'Ditolak'], DIBATALKAN: ['abu', 'Dibatalkan'] };
  var STL = { MENUNGGU: ['kuning', 'Menunggu ACC'], DISETUJUI: ['hijau', 'Disetujui'], DITOLAK: ['merah', 'Ditolak'], DICABUT: ['merah', 'Dicabut'], KEDALUWARSA: ['abu', 'Kedaluwarsa'] };
  var SUMBER = { otomatis: 'otomatis (lewat jam pulang)', poskontrol: 'dari Pos Kontrol', pimpinan: 'dicatat pimpinan', 'manual-pimpinan': 'dicatat pimpinan', perpanjang: 'perpanjangan', app: 'dari app' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { return CTX && CTX.sesi(); }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function perbarui() { if (CTX && CTX.perbarui) CTX.perbarui(); }
  function punya(k) { return !!(API.Pusat.punya && API.Pusat.punya(N[k])); }
  function aktif() { return punya('opsi') && punya('ajukan') && punya('saya'); }
  function lemburAktif() { return punya('rl'); }
  function panggil(k, args, ms) { var S = sesi(); return API.Pusat.panggil(N[k], [S && S.tokenPusat].concat(args || []), ms || 30000); }
  function p2(n) { return ('0' + n).slice(-2); }
  function wib() { return new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000); }
  function hariIni() { var d = wib(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function tgl(t) { var m = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? +m[3] + ' ' + NB[+m[2] - 1].slice(0, 3) : String(t || ''); }
  function rentang(a, b) { return !b || b === a ? tgl(a) : tgl(a) + ' – ' + tgl(b); }
  function jumlahHari(a, b) { var x = Date.parse(a + 'T00:00:00Z'), y = Date.parse((b || a) + 'T00:00:00Z'); return isFinite(x) && isFinite(y) ? Math.round((y - x) / 864e5) + 1 : 0; }
  function namaBulan(p) { var m = String(p || '').match(/^(\d{4})-(\d{2})$/); return m ? NB[+m[2] - 1] + ' ' + m[1] : String(p || ''); }
  function jamT(j) { return String(j == null ? '' : j).replace(':', '.'); }
  function angkaJam(n) { var v = Number(n) || 0; return (Math.round(v * 10) / 10).toLocaleString('id-ID'); }
  function cidBaru() { var a = new Uint8Array(8); try { crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < 8; i++) a[i] = Math.random() * 256; } return 'IZ' + Date.now().toString(36) + Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function jenisList() { return (OPSI && Array.isArray(OPSI.jenis) && OPSI.jenis.length) ? OPSI.jenis : JENIS0; }
  function jenisInfo(k) { return jenisList().filter(function (j) { return j.kode === k; })[0] || null; }
  function aturan() { return (OPSI && OPSI.aturan) || { maksHari: 30, fotoMaksMB: 5 }; }
  function webIzin() { var K = window.WHL_KONFIG || {}; if (CTX && CTX.bukaWeb && K.ABSEN) CTX.bukaWeb(K.ABSEN + '?mode=izin'); }

  /* ---------- ringkasan untuk hub Kehadiran (badge) ---------- */
  function muat(ctx) {
    CTX = ctx || CTX; var S = sesi();
    if (!S || !S.user || S.user.peran === 'driver' || !aktif()) { OPSI = null; return Promise.resolve(null); }
    var saya = ++urutan;
    return Promise.all([panggil('opsi', [], 25000).catch(function () { return null; }), panggil('saya', [], 25000).catch(function () { return null; })]).then(function (r) {
      if (saya !== urutan) return OPSI;
      if (r[0] && r[0].ok) OPSI = r[0]; else if (r[0] && (r[0].login === false || r[0].tolak)) OPSI = null;
      if (r[1] && r[1].ok) SAYA = r[1];
      perbarui(); return OPSI;
    });
  }
  function ringkas() {
    var a = aktif();
    return { aktif: a, lembur: lemburAktif(), bolehAju: !!(OPSI ? OPSI.bolehAju !== false : a), bolehAcc: !!(a && OPSI && OPSI.bolehAcc), menungguAcc: a && OPSI ? Number(OPSI.menungguAcc) || 0 : 0,
      menungguSaya: a && SAYA && SAYA.ringkas ? Number(SAYA.ringkas.menunggu) || 0 : 0, cuti: OPSI && OPSI.cuti || null };
  }

  /* ---------- gaya ---------- */
  function gaya() {
    if (document.getElementById('izGaya')) return;
    var st = document.createElement('style'); st.id = 'izGaya';
    st.textContent = [
      '.izLapis .ksnIsi{padding-bottom:40px}',
      '.izSeg{grid-template-columns:repeat(var(--n,2),1fr)}.izSeg button{font-size:13px;gap:5px;padding:0 4px;line-height:1.15;white-space:normal}',
      '.izSeg .angka,.izAngka{background:var(--merah);color:#fff;border-radius:99px;font-size:11px;padding:1px 6px;font-style:normal;font-weight:800}',
      '.izJenis{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:4px 0}',
      '.izJenis button{min-height:46px;border-radius:12px;background:var(--panel2);border:1px solid var(--garis);font-weight:800;font-size:14px;color:var(--redup);padding:0 4px}',
      '.izJenis button.on{background:var(--tint);color:var(--utama);border-color:var(--utama)}',
      '.izTgl{display:grid;grid-template-columns:minmax(0,1fr);gap:0}.izTgl input{width:100%;min-width:0;max-width:100%;box-sizing:border-box}', /* bertumpuk: input date Android lebar minimalnya besar */
      '.izKet{font-size:12.5px;color:var(--redup);line-height:1.5;margin:6px 2px 0}.izKet b{color:var(--teks)}',
      '.izInfo{background:var(--panel2);border-radius:14px;padding:10px 12px;margin:12px 0 4px;font-size:13px;line-height:1.5}',
      '.izInfo .br{display:flex;justify-content:space-between;gap:10px;padding:2px 0}.izInfo .br span{color:var(--redup)}.izInfo .br b{font-variant-numeric:tabular-nums}',
      '.izLamp{display:flex;gap:10px;align-items:center;margin-top:4px}.izLamp img{width:84px;height:84px;object-fit:cover;border-radius:12px;border:1px solid var(--garis);background:#fff}',
      '.izLamp .pdf{width:84px;height:84px;border-radius:12px;border:1px solid var(--garis);display:flex;align-items:center;justify-content:center;font-weight:900;color:#b42323;background:#fff}',
      '.izLamp .pil{flex:1;display:flex;flex-direction:column;gap:6px}',
      '.izLamp label{display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;border-radius:12px;border:2px dashed var(--garis);background:var(--lembut2);color:var(--utama);font-weight:800;font-size:13.5px;cursor:pointer}',
      '.izKartu{padding:12px 2px}.izKartu + .izKartu{border-top:1px solid var(--garis)}',
      '.izAtas{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.izAtas b{font-size:14.5px;line-height:1.3}',
      '.izKecil{font-size:12.5px;color:var(--redup);line-height:1.55}.izKecil b{color:var(--teks)}',
      '.izTolak{color:var(--tMerah);font-weight:700}',
      '.izBareng{background:#fdf3e1;color:#8a5200;border-radius:10px;padding:7px 10px;margin-top:8px;font-size:12.5px;font-weight:700;line-height:1.45}html[data-tema="gelap"] .izBareng{background:#3a2a10;color:#ffd38a}',
      '.izTombol{display:flex;gap:8px;margin-top:10px}.izTombol button{flex:1;margin:0;min-height:44px}',
      '.izTombol .tolak{background:var(--panel2);color:var(--tMerah);font-weight:800;border-radius:14px}.izTombol .yakin{background:#15803d;color:#fff}',
      '.izKosong{text-align:center;padding:22px 12px;color:var(--redup);font-size:13.5px;line-height:1.5}',
      '.izRingkas{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 12px}',
      '.izRingkas div{background:var(--panel);border:1px solid var(--garis);border-radius:14px;padding:10px 8px;text-align:center}',
      '.izRingkas small{display:block;font-size:11.5px;color:var(--redup);font-weight:700}.izRingkas b{display:block;font-size:19px;font-weight:900;font-variant-numeric:tabular-nums;margin-top:2px}',
      '.izBulan{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 12px}.izBulan b{font-size:16px}',
      '.izBulan button{min-width:46px;min-height:44px;border-radius:12px;background:var(--panel2);border:1px solid var(--garis);font-size:20px;font-weight:900;color:var(--utama)}.izBulan button:disabled{opacity:.35}',
      '.izLihat{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.88);display:flex;flex-direction:column}',
      '.izLihat .bar{display:flex;justify-content:flex-end;padding:calc(10px + env(safe-area-inset-top)) 12px 8px}',
      '.izLihat .bar button{min-height:44px;min-width:88px;border-radius:12px;background:#fff;color:#0b1a3a;font-weight:800;border:0}',
      '.izLihat .gb{flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;padding:8px}.izLihat img{max-width:100%;max-height:100%;object-fit:contain;background:#fff}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---------- lapis ---------- */
  function judul() { return mode === 'lembur' ? 'Riwayat lembur' : mode === 'acc' ? 'Persetujuan izin' : mode === 'aju' ? 'Ajukan izin / cuti' : 'Riwayat izin saya'; }
  function lapis() {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      gaya(); lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis izLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik); lapisEl.addEventListener('change', ubah); lapisEl.addEventListener('input', ketik);
    }
    var g = lapisEl.querySelector('.ksnIsi'), y = g ? g.scrollTop : 0, tolakTeks = (document.getElementById('izAlasanTolak') || {}).value;
    var isi = mode === 'lembur' ? isiLembur() : (tabs() + (mode === 'acc' ? isiAcc() : mode === 'aju' ? isiAju() : isiSaya()));
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-i="kembali" aria-label="Kembali">‹</button><div class="nm">Kehadiran<b>' + judul() + '</b></div></div><div class="ksnIsi">' + isi + '</div>';
    var t2 = document.getElementById('izAlasanTolak'); if (t2 && tolakTeks != null) t2.value = tolakTeks;
    var g2 = lapisEl.querySelector('.ksnIsi'); if (g2) g2.scrollTop = y;
  }
  function tabs() {
    var r = ringkas(), T = [];
    if (r.bolehAcc) T.push(['acc', 'Persetujuan' + (r.menungguAcc ? ' <i class="angka">' + r.menungguAcc + '</i>' : '')]);
    if (!OPSI || OPSI.bolehAju !== false) T.push(['aju', 'Ajukan']);
    T.push(['saya', 'Riwayat saya' + (r.menungguSaya ? ' <i class="angka">' + r.menungguSaya + '</i>' : '')]);
    return '<div class="segmen izSeg" style="--n:' + T.length + '">' + T.map(function (t) { return '<button type="button" data-i="mode:' + t[0] + '" class="' + (mode === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>';
  }
  function tutup() { if (!lapisEl) return; tutupLihat(); var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); perbarui(); }
  function memuat(t) { return '<div class="kartu izKosong"><span class="putar"></span> ' + esc(t || 'Memuat…') + '</div>'; }
  function galatHtml() { return '<div class="kartu izKosong">' + esc(galat) + '<br><button type="button" class="tKecil" data-i="ulang" style="margin-top:10px">Coba lagi</button> <button type="button" class="tKecil" data-i="web" style="margin-top:10px">Buka form web</button></div>'; }
  /* REVISI Reza 15 Nov: lampiran WAJIB semua jenis; cuti hanya masa kerja >= 1 th; OFF jatah 1 hari / 14 hari masuk, habis = IZIN TAMBAHAN potong gaji.
     Field server dibaca longgar (kontrak revisi Hesti): cuti.boleh / cuti.tersediaMulai, off{jatah, hariMasuk, terpakai, sisa}, item.tambahan / potongGaji. */
  /* REVISI 1 kontrak Hesti: cuti{berhak, tersediaMulai, catatan}, jenis[CUTI].tersedia/catatanJenis, off{ada, hariMasuk, jatah, terpakai, menunggu, sisa, teks},
     pusatIzinCek (REVISI 2) -> {kelebihan, bisaPotong, potongUsulHari, ket}; potong gaji diputus penyetuju saat ACC (arg ke-5 'POTONG'|'TIDAK'), item kelebihan/perluPilihPotong/potongStatus. */
  function cutiBoleh() { var c = OPSI && OPSI.cuti, j = jenisInfo('CUTI'); if (j && j.tersedia === false) return false; if (!c) return true; if (c.berhak === false || c.boleh === false) return false; var m = c.tersediaMulai || ''; return !(m && /^\d{4}-\d{2}-\d{2}/.test(m) && m > hariIni()); }
  function cutiMulai() { var c = (OPSI && OPSI.cuti) || {}; return c.tersediaMulai || ''; }
  function cutiCatatan() { var c = (OPSI && OPSI.cuti) || {}, j = jenisInfo('CUTI') || {}; if (j.catatanJenis) return j.catatanJenis; if (c.catatan) return c.catatan; if (c.tglMasuk === '') return 'Data tanggal masuk belum ada — hak cuti belum bisa dihitung. Hubungi admin HRD.'; return 'Cuti belum tersedia (masa kerja belum 1 tahun).' + (cutiMulai() ? ' Cuti tersedia mulai ' + tgl(cutiMulai()) + ' ' + String(cutiMulai()).slice(0, 4) + '.' : ''); }
  function offInfo() { var o = (CEK && CEK.off) || (OPSI && OPSI.off); if (!o) return null; var jt = Number(o.jatah) || 0, tp = Number(o.terpakai) || 0, mn = Number(o.menunggu) || 0; return { ada: o.ada !== false, teks: o.teks || '', aturanTeks: o.aturanTeks || '', jatah: jt, hariMasuk: o.hariMasuk, terpakai: tp, menunggu: mn, sisa: o.sisa != null ? Number(o.sisa) || 0 : Math.max(0, jt - tp - mn), namaBulan: o.namaBulan || '' }; }
  /** pratinjau potong gaji: dari pusatIzinCek kalau ada, kalau belum hitung sendiri (OFF > sisa jatah = izin tambahan; IZIN = selalu potong) */
  /** REVISI 2: pratinjau "bisa dipotong gaji" (diputus penyetuju saat ACC). Dari pusatIzinCek {bisaPotong, kelebihan, potongUsulHari, ket}; tanpa server: IZIN = semua hari, OFF lewat jatah = kelebihan. */
  function potong() {
    if (!F) return null;
    if (CEK && CEK.kunci === kunciCek()) {
      if (CEK.ok === false) return { galat: CEK.pesan || 'Tanggal / jenis ini tidak bisa diajukan.' };
      var kl = Number(CEK.kelebihan) || 0;
      return (CEK.bisaPotong || kl) ? { hari: Number(CEK.potongUsulHari) || kl || jumlahHari(F.mulai, F.selesai), kelebihan: kl, ket: CEK.ket || '' } : null;
    }
    var h = jumlahHari(F.mulai, F.selesai), o = offInfo();
    if (F.jenis === 'OFF' && o && o.ada && h > o.sisa) return { hari: h - o.sisa, kelebihan: h - o.sisa, ket: '' };
    if (F.jenis === 'IZIN') return { hari: h, kelebihan: 0, ket: '' };
    return null;
  }
  function offTambahan() { var x = potong(); return !!(x && x.kelebihan); }
  function kunciCek() { return F ? F.jenis + '|' + F.mulai + '|' + (F.selesai || F.mulai) : ''; }
  var tCek = null, CEK = null;
  function cekServer() {
    clearTimeout(tCek); if (!F || !punyaFn('pusatIzinCek')) return; var k = kunciCek();
    tCek = setTimeout(function () {
      var S = sesi(); API.Pusat.panggil('pusatIzinCek', [S && S.tokenPusat, { jenis: F.jenis, mulai: F.mulai, selesai: F.selesai || F.mulai }], 20000).then(function (h) {
        if (!F || kunciCek() !== k || !h || h.login === false) return; CEK = Object.assign({}, h, { kunci: k }); if (lapisEl && mode === 'aju') lapis();
      }, function () { /* pratinjau gagal: hitungan lokal tetap dipakai, server memeriksa ulang saat kirim */ });
    }, 350);
  }
  function punyaFn(f) { return !!(API.Pusat.punya && API.Pusat.punya(f)); }
  /* REVISI 2 (Reza): potong gaji DITENTUKAN penyetuju saat ACC. Pengaju cuma lihat peringatan. s/d 30 Nov jatah libur 4 hari/bulan, lewat = KELEBIHAN; OFF 1/14 hari mulai 1 Des. */
  function kelebihan(a) { return a ? (Number(a.kelebihan) || (/KELEBIHAN/i.test(String(a.label || '')) ? 1 : 0)) : 0; }
  function bisaPotong(a) { return !!(a && (a.perluPilihPotong || a.potongStatus || a.bisaPotong)); }
  function tambahan(a) { return !!(a && (kelebihan(a) || a.potongStatus)); }
  function tagTambahan(a) {
    var t = '', k = Number(a && a.kelebihan) || 0, st = String((a && a.potongStatus) || ''), n = Number(a && (a.potongHari || a.potongUsulHari)) || 0;
    if (kelebihan(a)) t += ' <em class="notaSt merah">KELEBIHAN' + (k ? ' ' + k + ' hari' : '') + '</em>';
    if (st === 'DIPOTONG') t += ' <em class="notaSt merah">Dipotong gaji' + (n ? ' ' + n + ' hari' : '') + '</em>';
    else if (st === 'TIDAK DIPOTONG') t += ' <em class="notaSt hijau">Tidak dipotong</em>';
    else if (st) t += ' <em class="notaSt kuning">Bisa potong gaji' + (n ? ' ' + n + ' hari' : '') + ' · tergantung ACC</em>';
    return t;
  }
  function offHtml() { var o = offInfo(); if (!o) return ''; if (o.teks) return '<div class="izInfo"><b>' + esc(o.teks) + '</b>' + (o.ada ? '' : '<div class="izKet" style="margin-top:4px">Roster bulan ini belum ada: penyetuju cek manual.</div>') + '<div class="izKet" style="margin-top:4px">' + esc(o.aturanTeks || 'Lewat jatah tetap boleh, ditandai KELEBIHAN; potong gaji diputus penyetuju saat ACC.') + '</div></div>';
    return '<div class="izInfo"><div class="br"><span>Jatah OFF' + (o.namaBulan ? ' ' + esc(o.namaBulan) : '') + '</span><b>' + o.jatah + ' hari' + (o.hariMasuk != null && o.hariMasuk !== '' ? ' (dari ' + esc(o.hariMasuk) + ' hari masuk)' : '') + '</b></div><div class="br"><span>Terpakai</span><b>' + o.terpakai + ' hari</b></div>' + (o.menunggu ? '<div class="br"><span>Menunggu ACC</span><b>' + o.menunggu + ' hari</b></div>' : '') + '<div class="br"><span>Sisa</span><b>' + o.sisa + ' hari</b></div><div class="izKet" style="margin-top:4px">' + esc(o.aturanTeks || 'Lewat jatah tetap boleh, ditandai KELEBIHAN; potong gaji diputus penyetuju saat ACC.') + '</div></div>'; }
  function cutiHtml(c) {
    if (!c) return '';
    return '<div class="izInfo"><div class="br"><span>Cuti tahun ' + esc(c.tahun || '') + '</span><b>jatah ' + esc(c.jatah) + ' hari</b></div><div class="br"><span>Terpakai</span><b>' + esc(c.terpakai || 0) + ' hari</b></div>'
      + (c.menunggu ? '<div class="br"><span>Menunggu ACC</span><b>' + esc(c.menunggu) + ' hari</b></div>' : '') + '<div class="br"><span>Sisa (info)</span><b>' + esc(c.sisa) + ' hari</b></div>'
      + (c.catatan ? '<div class="izKet" style="margin-top:4px">' + esc(c.catatan) + '</div>' : '') + '</div>';
  }

  /* ---------- AJUKAN ---------- */
  function formKosong() { var j = jenisList()[0]; return { jenis: j ? j.kode : 'IZIN', mulai: hariIni(), selesai: hariIni(), alasan: '', foto: '', fotoPdf: false, fotoNama: '' }; }
  function isiAju() {
    if (galat && !OPSI) return galatHtml();
    if (!OPSI) return memuat('Memuat pilihan…');
    if (OPSI.bolehAju === false) return '<div class="kartu izKosong">' + esc(OPSI.pesanAju || 'Akunmu belum bisa mengajukan izin dari app.') + '</div>';
    if (!F) F = formKosong();
    if (punyaFn('pusatIzinCek') && (!CEK || CEK.kunci !== kunciCek())) cekServer();
    var J = jenisInfo(F.jenis) || {}, wajib = true /* REVISI Reza: lampiran wajib SEMUA jenis */, hari = jumlahHari(F.mulai, F.selesai), A = aturan(), h = '<div class="kartu notaForm">';
    h += '<label class="lb">Jenis</label><div class="izJenis">' + jenisList().map(function (j) { return '<button type="button" data-i="jenis:' + esc(j.kode) + '" class="' + (F.jenis === j.kode ? 'on' : '') + '"' + (j.kode === 'CUTI' && !cutiBoleh() ? ' style="opacity:.55"' : '') + '>' + esc(j.label || j.kode) + '</button>'; }).join('') + '</div>';
    if (J.ket) h += '<div class="izKet">' + esc(J.ket) + '</div>';
    h += '<div class="izTgl"><div><label class="lb" for="izMulai">Mulai</label><input class="isian" type="date" id="izMulai" data-f="mulai" value="' + esc(F.mulai) + '"></div><div><label class="lb" for="izSelesai">Sampai</label><input class="isian" type="date" id="izSelesai" data-f="selesai" value="' + esc(F.selesai) + '"></div></div>';
    h += '<div class="izKet" id="izHari">' + (hari > 0 ? '<b>' + hari + ' hari</b>' + (hari > (A.maksHari || 30) ? ' · lebih dari ' + (A.maksHari || 30) + ' hari, tidak bisa' : '') : 'Tanggal sampai tidak boleh sebelum tanggal mulai.') + '</div>';
    h += '<label class="lb" for="izAlasan">Alasan <i class="wajib">wajib</i></label><textarea class="isian bnrTA" id="izAlasan" data-f="alasan" rows="3" maxlength="300" placeholder="mis. keluarga sakit / acara keluarga / pulang kampung">' + esc(F.alasan) + '</textarea>';
    h += '<label class="lb">Lampiran ' + (wajib ? '<i class="wajib">wajib</i>' : '<small style="font-weight:600">(opsional)</small>') + '</label><div class="izLamp">'
      + (F.foto ? (F.fotoPdf ? '<span class="pdf">PDF</span>' : '<img src="' + F.foto + '" alt="Lampiran">') : '')
      + '<div class="pil"><label>📷 ' + (F.foto ? 'Ganti foto' : 'Foto (kamera / galeri)') + '<input type="file" accept="image/*" data-lamp="foto" hidden></label><label>📄 File PDF<input type="file" accept="application/pdf" data-lamp="pdf" hidden></label>'
      + (F.foto ? '<button type="button" class="tKecil" data-i="hapusLamp" style="margin:0;min-height:38px">Hapus lampiran' + (F.fotoNama ? ' (' + esc(F.fotoNama) + ')' : '') + '</button>' : '') + '</div></div>'
      + (wajib ? '<div class="izKet">Semua jenis wajib lampiran: surat dokter (sakit), undangan / surat keterangan, atau foto pendukung.</div>' : '');
    if (F.jenis === 'CUTI') h += cutiBoleh() ? cutiHtml(OPSI.cuti) : '<div class="izBareng">' + esc(cutiCatatan()) + ' Pilih Izin / OFF kalau perlu libur.</div>';
    if (F.jenis === 'OFF') h += offHtml();
    var PG = potong();
    if (PG && PG.galat) h += '<div class="izBareng" style="background:#fde2e2;color:#b42323">' + esc(PG.galat) + '</div>';
    else if (PG) h += '<div class="izBareng" style="margin-top:10px">⚠ ' + (PG.kelebihan ? 'Lewat jatah libur: ditandai <b>KELEBIHAN ' + PG.kelebihan + ' hari</b>. ' : '') + '<b>Bisa dipotong gaji' + (PG.hari ? ' ' + PG.hari + ' hari' : '') + ', tergantung ACC</b> penyetuju.' + (PG.ket ? '<br><span style="font-weight:600">' + esc(PG.ket) + '</span>' : '') + '</div>';
    h += '<div class="pesan" id="izPesan">' + esc(PESAN) + '</div><button type="button" class="tUtama" data-i="kirim"' + (sibuk ? ' disabled' : '') + '>' + (sibuk ? '<span class="putar"></span> Mengirim…' : offTambahan() ? 'Ajukan OFF (kelebihan)' : 'Ajukan ' + esc((J.label || F.jenis).toLowerCase())) + '</button>'
      + '<div class="izKet" style="text-align:center;margin-top:8px">Disetujui oleh ' + esc(OPSI.penyetuju || 'pimpinan') + '. Kamu dapat notifikasi hasilnya.</div></div>';
    return h;
  }
  function kompres(file) {
    return new Promise(function (ok, gagal) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, hh = img.naturalHeight, sk = Math.min(1, 800 / Math.max(w, hh)), q = 0.6, d = ''; /* v3.19 (Reza): sama dgn foto driver, < 100 KB */
        for (var i = 0; i < 6; i++) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * sk)); c.height = Math.max(1, Math.round(hh * sk)); var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); d = c.toDataURL('image/jpeg', q); if (d.length <= 135000) break; if (q > 0.45) q -= 0.08; else sk *= 0.85; }
        URL.revokeObjectURL(url); ok(d);
      };
      img.onerror = function () { URL.revokeObjectURL(url); gagal(new Error('gambar tidak bisa dibaca')); };
      img.src = url;
    });
  }
  function bacaPdf(file) {
    return new Promise(function (ok, gagal) {
      var mb = Number(aturan().fotoMaksMB) || 5;
      if (file.size > mb * 1048576) { gagal(new Error('PDF lebih dari ' + mb + ' MB')); return; }
      var r = new FileReader(); r.onload = function () { var s = String(r.result || ''); s = s.replace(/^data:[^;,]*;base64,/, 'data:application/pdf;base64,'); ok(s); }; r.onerror = function () { gagal(new Error('PDF tidak bisa dibaca')); }; r.readAsDataURL(file);
    });
  }
  var PESAN = '';
  function pesan(t) { PESAN = t || ''; var p = document.getElementById('izPesan'); if (p) p.textContent = PESAN; } /* disimpan: render ulang (pratinjau pusatIzinCek) tidak menghapus pesan */
  function ubah(ev) {
    var e = ev.target; if (!e.getAttribute) return;
    if (e.getAttribute('data-setuju') && F) { F.setujuPotong = !!e.checked; pesan(''); return; }
    var f = e.getAttribute('data-f'); if (f && F) { F[f] = e.value; if (f === 'mulai' && F.selesai < F.mulai) F.selesai = F.mulai; if (f === 'mulai' || f === 'selesai') { F.setujuPotong = false; cekServer(); lapis(); } return; }
    var l = e.getAttribute('data-lamp'); if (!l || !e.files || !e.files[0] || !F) return;
    var bk = e.files[0]; e.value = ''; simpanIsian(); pesan(l === 'pdf' ? 'Membaca PDF…' : 'Mengompres foto…');
    (l === 'pdf' ? bacaPdf(bk) : kompres(bk)).then(function (d) { F.foto = d; F.fotoPdf = l === 'pdf'; F.fotoNama = l === 'pdf' ? String(bk.name || 'lampiran.pdf').slice(0, 40) : ''; PESAN = ''; lapis(); if (R.getar) R.getar(); }, function (x) { pesan('Lampiran gagal: ' + x.message); if (R.bunyi) R.bunyi('gagal'); });
  }
  function ketik(ev) { var e = ev.target; if (!F || !e.getAttribute) return; var f = e.getAttribute('data-f'); if (f === 'alasan') F.alasan = e.value; }
  function simpanIsian() { if (!lapisEl || !F) return; Array.prototype.forEach.call(lapisEl.querySelectorAll('[data-f]'), function (e) { F[e.getAttribute('data-f')] = e.value; }); }
  function periksa() {
    simpanIsian(); var J = jenisInfo(F.jenis), A = aturan(), hari = jumlahHari(F.mulai, F.selesai);
    if (!J) return 'Pilih jenis.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(F.mulai)) return 'Isi tanggal mulai.';
    if (F.selesai && !/^\d{4}-\d{2}-\d{2}$/.test(F.selesai)) return 'Tanggal sampai tidak sah.';
    if (hari < 1) return 'Tanggal sampai tidak boleh sebelum tanggal mulai.';
    if (hari > (A.maksHari || 30)) return 'Maksimal ' + (A.maksHari || 30) + ' hari per pengajuan.';
    var al = String(F.alasan || '').trim(); if (al.length < 3) return 'Tulis alasan (minimal 3 huruf).'; if (al.length > 300) return 'Alasan maksimal 300 huruf.';
    if (F.jenis === 'CUTI' && !cutiBoleh()) return cutiCatatan();
    var PG = potong(); if (PG && PG.galat) return PG.galat;
    if (!F.foto) return 'Lampiran wajib (foto / PDF) untuk semua jenis.';
    return '';
  }
  function kirim() {
    var s = periksa(); if (s) { pesan(s); if (R.bunyi) R.bunyi('gagal'); if (R.getar) R.getar('awas'); return; }
    if (!CID) CID = cidBaru();
    var d = { cid: CID, jenis: F.jenis, mulai: F.mulai, selesai: F.selesai || F.mulai, alasan: String(F.alasan).trim(), foto: F.foto || '' }; /* REVISI 2: setujuPotong dibuang */
    sibuk = true; lapis();
    var gagalKirim = function (e) { sibuk = false; lapis(); pesan('Belum terkirim: ' + ((e && e.message) || 'cek sinyal') + '. Ketuk Ajukan lagi (tidak akan dobel).'); };
    panggil('ajukan', [d], 90000).then(function jawab(h) {
      sibuk = false;
      if (h && h.login === false) { roti('Sesi habis. Keluar lalu masuk lagi.'); lapis(); return; }
      if (h && h.perluSetujuPotong && !d.setujuPotong) { d.setujuPotong = true; sibuk = true; panggil('ajukan', [d], 90000).then(jawab, gagalKirim); return; } /* server REVISI 1 minta setuju: kirim ulang sekali dengan cid sama */
      if (!h || !h.ok) { lapis(); pesan((h && h.pesan) || 'Pengajuan ditolak server.'); if (R.bunyi) R.bunyi('gagal'); return; }
      CID = ''; F = null; PESAN = ''; if (R.bunyi) R.bunyi('sukses'); if (R.getar) R.getar('sukses');
      roti(h.dobel ? 'Pengajuan sudah ada (' + (h.id || '') + '), tunggu ACC.' : (h.pesan || 'Pengajuan terkirim' + (h.id ? ' (' + h.id + ')' : '') + '. Tunggu ACC.'));
      mode = 'saya'; muatSaya(); muat();
    }, gagalKirim);
  }

  /* ---------- RIWAYAT SAYA ---------- */
  function isiSaya() {
    var h = '';
    if (galat && !SAYA) return galatHtml();
    if (!SAYA) return memuat('Memuat riwayat…');
    var k = SAYA.ringkas || {};
    h += '<div class="izRingkas"><div><small>Menunggu</small><b>' + (k.menunggu || 0) + '</b></div><div><small>Disetujui</small><b>' + (k.disetujui || 0) + '</b></div><div><small>Ditolak</small><b>' + (k.ditolak || 0) + '</b></div></div>';
    h += cutiHtml(SAYA.cuti || (OPSI && OPSI.cuti));
    var L = SAYA.list || [];
    h += '<h2 class="bagW">Pengajuan saya <span>' + L.length + '</span></h2>';
    if (!L.length) return h + '<div class="kartu izKosong">Belum ada pengajuan izin / cuti.</div>';
    return h + '<div class="kartu">' + L.map(function (a) {
      var w = ST[a.status] || ['abu', a.status || '-'], id = esc(a.id);
      return '<div class="izKartu"><div class="izAtas"><b>' + esc(a.label || a.jenis) + ' · ' + esc(rentang(a.mulai, a.selesai)) + (a.hari ? ' <small class="izKecil">(' + esc(a.hari) + ' hari)</small>' : '') + '</b><em class="notaSt ' + w[0] + '">' + esc(w[1]) + '</em></div>' + (tambahan(a) ? '<div style="margin:4px 0">' + tagTambahan(a) + '</div>' : '')
        + '<div class="izKecil">' + esc(a.alasan || '') + '<br>' + esc(a.id) + (a.dibuat ? ' · diajukan ' + esc(a.dibuat) : '') + (a.lewat ? ' · <b>' + esc(a.lewat) + '</b>' : '')
        + (a.oleh ? '<br>' + (a.status === 'DITOLAK' ? 'Ditolak' : a.status === 'DIBATALKAN' ? 'Dibatalkan' : 'ACC') + ' oleh <b>' + esc(a.oleh) + '</b> ' + esc(a.waktuPutus || '') : '')
        + (a.status === 'DITOLAK' && a.alasanTolak ? '<br><span class="izTolak">Alasan: ' + esc(a.alasanTolak) + '</span>' : '') + (a.catatan ? '<br>' + esc(a.catatan) : '') + (a.catRoster ? '<br>Roster: ' + esc(a.catRoster) : '') + '</div>'
        + ((a.adaLampiran || a.status === 'MENUNGGU') ? '<div class="izTombol">' + (a.adaLampiran ? '<button type="button" class="tKecil" data-i="lamp:' + id + '">Lihat lampiran</button>' : '')
          + (a.status === 'MENUNGGU' && punya('batal') ? '<button type="button" class="tolak' + (batalYakin === a.id ? ' yakin' : '') + '" data-i="batal:' + id + '"' + (sibuk ? ' disabled' : '') + '>' + (batalYakin === a.id ? 'Ketuk lagi untuk batalkan' : 'Batalkan') + '</button>' : '') + '</div>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function muatSaya() {
    SAYA = SAYA || null; galat = ''; if (!SAYA) lapis();
    return panggil('saya', [], 30000).then(function (h) {
      if (h && h.login === false) galat = 'Sesi habis. Keluar lalu masuk lagi.'; else if (!h || !h.ok) galat = (h && h.pesan) || 'Riwayat belum bisa dimuat.'; else SAYA = h;
      if (lapisEl) lapis(); perbarui();
    }, function (e) { galat = (e && e.message) || 'Gagal memuat.'; if (lapisEl) lapis(); });
  }
  function batal(id) {
    sibuk = true; lapis();
    panggil('batal', [id], 30000).then(function (h) {
      sibuk = false; batalYakin = '';
      if (!h || !h.ok) { roti((h && h.pesan) || 'Belum bisa dibatalkan.'); lapis(); return; }
      roti(h.pesan || 'Pengajuan dibatalkan.'); if (R.bunyi) R.bunyi('sukses'); muatSaya(); muat();
    }, function (e) { sibuk = false; roti((e && e.message) || 'Gagal.'); lapis(); });
  }

  /* ---------- PERSETUJUAN ---------- */
  function isiAcc() {
    if (galat && !ANTRE) return galatHtml();
    if (!ANTRE) return memuat('Memuat antrean…');
    var h = '<h2 class="bagW">Menunggu ACC <span>' + ANTRE.length + '</span></h2>';
    if (!ANTRE.length) h += '<div class="kartu izKosong">Tidak ada pengajuan izin yang menunggu.</div>';
    else h += '<div class="kartu">' + ANTRE.map(function (a) {
      var id = esc(a.id), t = tolakId === a.id;
      return '<div class="izKartu"' + (notifId === a.id ? ' style="background:var(--tint);border-radius:12px;padding:12px 8px"' : '') + '><div class="izAtas"><b>' + esc(a.nama) + '</b><small class="izKecil">' + esc(a.jabatan || a.nrp || '') + '</small></div>'
        + (tambahan(a) ? '<div style="margin:4px 0">' + tagTambahan(a) + '</div>' : '') + '<div class="izKecil"><b>' + esc(a.label || a.jenis) + '</b> · <b>' + esc(rentang(a.mulai, a.selesai)) + '</b>' + (a.hari ? ' (' + esc(a.hari) + ' hari)' : '') + '<br>' + esc(a.alasan || '')
        + '<br>Diajukan ' + esc(a.dibuat || '') + (a.lewat ? ' · <b>' + esc(a.lewat) + '</b>' : '') + (a.catatan ? '<br>' + esc(a.catatan) : '')
        + (a.jenis === 'CUTI' && (a.cutiTerpakai != null || a.cutiSisa != null) ? '<br>Cuti terpakai <b>' + esc(a.cutiTerpakai == null ? '-' : a.cutiTerpakai) + '</b> · sisa <b>' + esc(a.cutiSisa == null ? '-' : a.cutiSisa) + '</b> hari' : '') + '</div>'
        + (a.off && a.off.teks && (a.jenis === 'OFF' || tambahan(a)) ? '<div class="izKecil" style="margin-top:4px">' + esc(a.off.teks) + '</div>' : '') + (a.jenis === 'CUTI' && a.cutiBerhak === false ? '<div class="izBareng" style="background:#fde2e2;color:#b42323">Belum berhak cuti' + (a.cutiCatatan ? ': ' + esc(a.cutiCatatan) : '') + '</div>' : '')
        + (a.barengan && a.barengan.length ? '<div class="izBareng">Juga izin / cuti di tanggal ini: ' + a.barengan.map(esc).join(', ') + '</div>' : '')
        + (a.adaLampiran ? '<button type="button" class="tKecil" data-i="lamp:' + id + '" style="margin-top:8px;min-height:38px">Lihat lampiran</button>' : '')
        + (t ? '<textarea id="izAlasanTolak" class="isian" rows="2" maxlength="200" placeholder="Alasan ditolak (wajib, dikirim ke karyawan)" style="margin-top:8px"></textarea><div class="izTombol"><button type="button" class="tKecil" data-i="batalTolak">Batal</button><button type="button" class="tolak" data-i="tolakKirim:' + id + '"' + (sibuk ? ' disabled' : '') + '>Kirim penolakan</button></div>'
          : (a.perluPilihPotong ? '<div class="izKecil" style="margin-top:10px;font-weight:800;color:var(--teks)">Kalau di-ACC: potong gaji? <i class="wajib">pilih</i></div><div class="izJenis" style="grid-template-columns:1fr 1fr"><button type="button" data-i="pg:' + id + ':POTONG" class="' + (PILIH_PG[a.id] === 'POTONG' ? 'on' : '') + '">Potong gaji' + (a.potongUsulHari ? ' (' + esc(a.potongUsulHari) + ' hari)' : '') + '</button><button type="button" data-i="pg:' + id + ':TIDAK" class="' + (PILIH_PG[a.id] === 'TIDAK' ? 'on' : '') + '">Tidak dipotong</button></div>' : '')
            + '<div class="izTombol"><button type="button" class="tolak" data-i="tolak:' + id + '"' + (sibuk ? ' disabled' : '') + '>Tolak</button><button type="button" class="tUtama' + (yakin === a.id ? ' yakin' : '') + '" data-i="acc:' + id + '"' + (sibuk ? ' disabled' : '') + '>' + (yakin === a.id ? 'Ketuk lagi untuk ACC' : 'ACC') + '</button></div>') + '</div>';
    }).join('') + '</div>';
    if (RIW.length) h += '<h2 class="bagW">Keputusan terakhir <span>' + RIW.length + '</span></h2><div class="kartu">' + RIW.map(function (a) {
      var w = ST[a.status] || ['abu', a.status || '-'];
      return '<div class="izKartu"><div class="izAtas"><b>' + esc(a.nama || '') + ' · ' + esc(a.label || a.jenis) + '</b><em class="notaSt ' + w[0] + '">' + esc(w[1]) + '</em></div><div class="izKecil">' + esc(rentang(a.mulai, a.selesai)) + (a.hari ? ' (' + esc(a.hari) + ' hari)' : '') + (a.oleh ? ' · ' + esc(a.oleh) + ' ' + esc(a.waktuPutus || '') : '') + (a.status === 'DITOLAK' && a.alasanTolak ? '<br><span class="izTolak">Alasan: ' + esc(a.alasanTolak) + '</span>' : '') + '</div></div>';
    }).join('') + '</div>';
    return h + '<div class="izKet" style="margin:12px 4px 20px">ACC = roster tanggal itu otomatis terisi ' + esc(jenisList().map(function (j) { return j.kode; }).join(' / ')) + '. Tolak wajib alasan. Karyawan dapat notifikasi.</div>';
  }
  function muatAntre() {
    galat = ''; if (!ANTRE) lapis();
    return panggil('antre', [], 30000).then(function (h) {
      if (h && h.login === false) galat = 'Sesi habis. Keluar lalu masuk lagi.'; else if (h && h.tolak) galat = h.pesan || 'Persetujuan izin khusus penyetuju.'; else if (!h || !h.ok) galat = (h && h.pesan) || 'Antrean belum bisa dimuat.';
      else { ANTRE = h.list || []; RIW = h.riwayat || []; if (OPSI) OPSI.menungguAcc = ANTRE.length; }
      if (notifId && ANTRE && !ANTRE.some(function (a) { return a.id === notifId; }) && mode === 'acc') { mode = 'saya'; muatSaya(); }
      if (lapisEl) lapis(); perbarui();
    }, function (e) { galat = (e && e.message) || 'Gagal memuat.'; if (lapisEl) lapis(); });
  }
  var PILIH_PG = {};
  function putus(id, kep, alasan) {
    var it = (ANTRE || []).filter(function (z) { return z.id === id; })[0], arg = [id, kep, alasan || '']; if (kep === 'ACC' && it && it.perluPilihPotong) arg.push(PILIH_PG[id] || ''); /* REVISI 2: arg ke-5 'POTONG' | 'TIDAK' */
    sibuk = true; lapis();
    panggil('putus', arg, 45000).then(function (h) {
      sibuk = false; yakin = ''; tolakId = '';
      if (h && h.perluPilihPotong) { roti(h.pesan || 'Pilih dulu: Potong gaji atau Tidak dipotong.'); lapis(); return; }
      if (!h || !h.ok) { roti((h && h.pesan) || 'Keputusan belum tersimpan.'); lapis(); return; }
      if (R.bunyi) R.bunyi('sukses'); if (R.getar) R.getar('sukses');
      roti(h.pesan || (kep === 'ACC' ? 'Izin disetujui' + (h.catRoster ? ' · roster ' + h.catRoster : '') + '.' : 'Izin ditolak.'));
      ANTRE = (ANTRE || []).filter(function (a) { return a.id !== id; }); if (OPSI) OPSI.menungguAcc = ANTRE.length; lapis(); muatAntre(); perbarui();
    }, function (e) { sibuk = false; roti(((e && e.message) || 'Gagal') + '. Coba lagi.'); lapis(); });
  }

  /* ---------- lampiran ---------- */
  function tutupLihat() { if (lihatEl) { lihatEl.remove(); lihatEl = null; } }
  function lihatLampiran(id) {
    roti('Membuka lampiran…');
    panggil('lampiran', [id], 60000).then(function (h) {
      if (!h || !h.ok || !h.src) { roti((h && h.pesan) || 'Lampiran tidak bisa dibuka.'); return; }
      var src = String(h.src);
      if (h.pdf || /^data:application\/pdf/.test(src)) {
        var b64 = src.replace(/^data:[^,]*,/, ''), nama = 'Lampiran ' + id + '.pdf';
        if (window.WHL_GAJI && window.WHL_GAJI.bukaPdf) { window.WHL_GAJI.bukaPdf(nama, b64); return; }
        var a = window.AndroidDownloader; if (a && typeof a.simpanFile === 'function') { a.simpanFile(nama, b64, 'application/pdf'); return; }
        try { var bin = atob(b64), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); window.open(URL.createObjectURL(new Blob([u8], { type: 'application/pdf' })), '_blank'); } catch (e) { roti('PDF tidak bisa dibuka.'); }
        return;
      }
      if (!/^data:image\//.test(src)) { roti('Jenis lampiran tidak dikenal.'); return; }
      tutupLihat(); gaya();
      lihatEl = document.createElement('div'); lihatEl.className = 'izLihat';
      lihatEl.innerHTML = '<div class="bar"><button type="button" data-tutup="1">Tutup</button></div><div class="gb"><img alt="Lampiran"></div>';
      lihatEl.querySelector('img').src = src; lihatEl.addEventListener('click', function (ev) { if (ev.target.closest('[data-tutup]') || ev.target === lihatEl) tutupLihat(); });
      document.body.appendChild(lihatEl);
    }, function (e) { roti((e && e.message) || 'Gagal membuka lampiran.'); });
  }

  /* ---------- RIWAYAT LEMBUR ---------- */
  function isiLembur() {
    if (galat && !RL) return '<div class="kartu izKosong">' + esc(galat) + '<br><button type="button" class="tKecil" data-i="ulang" style="margin-top:10px">Coba lagi</button></div>';
    if (!RL) return memuat('Memuat riwayat lembur…');
    var ada = (RL.bulanAda && RL.bulanAda.length ? RL.bulanAda.slice() : [RL.bulan]).sort().reverse(), i = ada.indexOf(RL.bulan), k = RL.ringkas || {};
    var lama = i >= 0 && i < ada.length - 1 ? ada[i + 1] : '', baru = i > 0 ? ada[i - 1] : '';
    var h = '<div class="izBulan"><button type="button" data-i="' + (lama ? 'bln:' + esc(lama) : 'x') + '"' + (lama ? '' : ' disabled') + ' aria-label="Bulan sebelumnya">‹</button><b>' + esc(RL.namaBulan || namaBulan(RL.bulan)) + '</b><button type="button" data-i="' + (baru ? 'bln:' + esc(baru) : 'x') + '"' + (baru ? '' : ' disabled') + ' aria-label="Bulan berikutnya">›</button></div>';
    h += '<div class="izRingkas"><div><small>Jam ACC</small><b>' + angkaJam(k.jamAcc) + '</b></div><div><small>Jam tercatat</small><b>' + angkaJam(k.jamTercatat) + '</b></div><div><small>Ajuan</small><b>' + (k.ajuan || 0) + '</b></div></div>'
      + '<div class="izRingkas"><div><small>Disetujui</small><b>' + (k.disetujui || 0) + '</b></div><div><small>Ditolak</small><b>' + (k.ditolak || 0) + '</b></div><div><small>Menunggu</small><b>' + (k.menunggu || 0) + '</b></div></div>'
      + '<div class="izKet" style="margin:-4px 4px 10px">Jam ACC = lembur yang di-ACC pimpinan. Jam tercatat = lembur nyata dari scan pulang yang sudah dikonfirmasi.' + (k.jamMinta ? ' Jam diminta: ' + angkaJam(k.jamMinta) + '.' : '') + '</div>';
    var L = RL.list || [], T = RL.tercatat || [];
    h += '<h2 class="bagW">Ajuan & ACC lembur <span>' + L.length + '</span></h2>';
    h += L.length ? '<div class="kartu">' + L.map(function (a) {
      var w = STL[a.status] || ['abu', a.status || '-'];
      return '<div class="izKartu"><div class="izAtas"><b>' + esc(tgl(a.tanggal)) + ' · ' + esc(jamT(a.mulai)) + '–' + esc(jamT(a.sampai)) + (a.jam ? ' <small class="izKecil">(' + esc(a.jam) + ' jam' + (a.jamMinta && String(a.jamMinta) !== String(a.jam) ? ', diminta ' + esc(a.jamMinta) : '') + ')</small>' : '') + '</b><em class="notaSt ' + w[0] + '">' + esc(w[1]) + '</em></div>'
        + '<div class="izKecil">' + esc(a.alasan || '') + (SUMBER[a.sumber] ? ' · ' + esc(SUMBER[a.sumber]) : '') + (a.oleh ? '<br>Oleh <b>' + esc(a.oleh) + '</b> ' + esc(a.waktuPutusLengkap || a.waktuPutus || '') : '') + (a.status === 'DITOLAK' && a.alasanTolak ? '<br><span class="izTolak">Alasan: ' + esc(a.alasanTolak) + '</span>' : '') + '</div></div>';
    }).join('') + '</div>' : '<div class="kartu izKosong">Belum ada ajuan lembur di bulan ini.</div>';
    h += '<h2 class="bagW">Lembur tercatat (scan pulang) <span>' + T.length + '</span></h2>';
    h += T.length ? '<div class="kartu">' + T.map(function (t) {
      var w = /SETUJU/i.test(t.status || '') ? ['hijau', t.status] : /TOLAK/i.test(t.status || '') ? ['merah', t.status] : ['kuning', t.status || '-'];
      return '<div class="izKartu"><div class="izAtas"><b>' + esc(tgl(t.tanggal)) + (t.shift ? ' · ' + esc(t.shift) : '') + '</b><em class="notaSt ' + w[0] + '">' + esc(w[1]) + '</em></div><div class="izKecil">Jam pulang roster ' + esc(jamT(t.jamPulangRoster)) + ' · selesai <b>' + esc(jamT(t.jamSelesai)) + '</b> · <b>' + esc(t.jam != null && t.jam !== '' ? t.jam + ' jam' : (t.menit || 0) + ' mnt') + '</b>' + (t.oleh ? '<br>Dikonfirmasi ' + esc(t.oleh) : '') + '</div></div>';
    }).join('') + '</div>' : '<div class="kartu izKosong">Belum ada lembur tercatat dari scan pulang.</div>';
    return h;
  }
  function muatLembur(bln) {
    rlBulan = bln || ''; RL = null; galat = ''; lapis();
    var saya = ++rlUrut;
    panggil('rl', [rlBulan], 45000).then(function (h) {
      if (saya !== rlUrut) return;
      if (h && h.login === false) galat = 'Sesi habis. Keluar lalu masuk lagi.'; else if (!h || !h.ok) galat = (h && h.pesan) || 'Riwayat lembur belum bisa dimuat.'; else RL = h;
      if (lapisEl) lapis();
    }, function (e) { if (saya !== rlUrut) return; galat = (e && e.message) || 'Gagal memuat.'; if (lapisEl) lapis(); });
  }

  /* ---------- buka ---------- */
  function buka(ctx, keMode, id) {
    CTX = ctx || CTX; if (!aktif()) { webIzin(); return; }
    galat = ''; yakin = ''; tolakId = ''; batalYakin = ''; notifId = id || '';
    var r = ringkas(); mode = keMode || (r.bolehAcc && r.menungguAcc ? 'acc' : 'saya');
    if (mode === 'acc' && OPSI && !OPSI.bolehAcc) mode = 'saya';
    lapis();
    var p = OPSI ? Promise.resolve(OPSI) : muat();
    p.then(function () { if (!lapisEl || mode === 'lembur') return; if (mode === 'acc' && OPSI && !OPSI.bolehAcc) mode = 'saya'; if (!OPSI) galat = galat || 'Pilihan izin belum bisa dimuat.'; lapis(); if (mode === 'acc') muatAntre(); else if (mode === 'saya') muatSaya(); });
  }
  function bukaLembur(ctx) { CTX = ctx || CTX; if (!lemburAktif()) { roti('Riwayat lembur belum tersedia di server.'); return; } mode = 'lembur'; muatLembur(''); }
  function bukaNotif(ctx, id) {
    CTX = ctx || CTX;
    var jalan = function () { if (!aktif()) { webIzin(); return; } muat().then(function () { buka(CTX, OPSI && OPSI.bolehAcc ? 'acc' : 'saya', id); }); };
    if (!aktif()) { API.Pusat.cekUlang().then(jalan, jalan); return; } jalan();
  }

  function klik(ev) {
    var b = ev.target.closest('[data-i]'); if (!b || !lapisEl || !lapisEl.contains(b)) return; var n = b.getAttribute('data-i');
    if (n === 'kembali') { if (mode === 'aju') simpanIsian(); tutup(); return; }
    if (n === 'web') { webIzin(); return; }
    if (n === 'ulang') { galat = ''; if (mode === 'lembur') muatLembur(rlBulan); else if (!OPSI) buka(CTX, mode); else if (mode === 'acc') muatAntre(); else if (mode === 'saya') muatSaya(); else lapis(); return; }
    if (n.indexOf('mode:') === 0) { if (mode === 'aju') simpanIsian(); mode = n.slice(5); galat = ''; PESAN = ''; yakin = ''; tolakId = ''; batalYakin = ''; lapis(); if (mode === 'acc') muatAntre(); else if (mode === 'saya') muatSaya(); if (R.getar) R.getar(); return; }
    if (n.indexOf('jenis:') === 0) { simpanIsian(); F.jenis = n.slice(6); F.setujuPotong = false; cekServer(); lapis(); if (R.getar) R.getar(); return; }
    if (n === 'hapusLamp') { simpanIsian(); F.foto = ''; F.fotoPdf = false; F.fotoNama = ''; lapis(); return; }
    if (n === 'kirim') { if (!sibuk) kirim(); return; }
    if (n.indexOf('lamp:') === 0) { lihatLampiran(n.slice(5)); return; }
    if (n.indexOf('batal:') === 0) { var ib = n.slice(6); if (sibuk) return; if (batalYakin !== ib) { batalYakin = ib; lapis(); setTimeout(function () { if (batalYakin === ib) { batalYakin = ''; if (lapisEl) lapis(); } }, 4000); return; } batal(ib); return; }
    if (n.indexOf('pg:') === 0) { var q = n.split(':'); PILIH_PG[q.slice(1, -1).join(':')] = q[q.length - 1]; yakin = ''; lapis(); if (R.getar) R.getar(); return; }
    if (n.indexOf('acc:') === 0) { var id = n.slice(4); if (sibuk) return; var itA = (ANTRE || []).filter(function (z) { return z.id === id; })[0]; if (itA && itA.perluPilihPotong && !PILIH_PG[id]) { roti('Pilih dulu: Potong gaji atau Tidak dipotong.'); if (R.getar) R.getar('awas'); return; } if (yakin !== id) { yakin = id; tolakId = ''; if (R.getar) R.getar(); lapis(); setTimeout(function () { if (yakin === id) { yakin = ''; if (lapisEl) lapis(); } }, 4000); return; } putus(id, 'ACC', ''); return; }
    if (n.indexOf('tolak:') === 0) { tolakId = n.slice(6); yakin = ''; lapis(); var e = document.getElementById('izAlasanTolak'); if (e) e.focus(); return; }
    if (n === 'batalTolak') { tolakId = ''; lapis(); return; }
    if (n.indexOf('tolakKirim:') === 0) { var al = ((document.getElementById('izAlasanTolak') || {}).value || '').trim(); if (al.length < 3) { roti('Tulis alasan penolakan (minimal 3 huruf).'); return; } putus(n.slice(11), 'TOLAK', al); return; }
    if (n.indexOf('bln:') === 0) { muatLembur(n.slice(4)); return; }
  }
  function kembali() { if (lihatEl) { tutupLihat(); return true; } if (!lapisEl) return false; var k = lapisEl.querySelector('[data-i="kembali"]'); if (k) k.click(); return true; }
  function lupakan() { OPSI = null; SAYA = null; ANTRE = null; RIW = []; RL = null; F = null; CID = ''; urutan++; if (lapisEl) tutup(); }
  window.WHL_IZIN = { aktif: aktif, lemburAktif: lemburAktif, muat: muat, ringkas: ringkas, buka: buka, bukaLembur: bukaLembur, bukaNotif: bukaNotif, kembali: kembali, lupakan: lupakan, _uji: { form: function () { return F; } } };
})();
