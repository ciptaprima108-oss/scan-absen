/* WHL App — PERAN HRD (LIHAT SAJA) — app-peran-hrd-26nov (Armand, 26 Nov 2026; keputusan Pak Fanza).
 * Orang berperan "hrd" melihat: data karyawan, absensi & roster, masa berlaku dokumen, KPI, insiden & pelanggaran, kasbon & cicilan HP,
 * ulang tahun & poin, hasil kuesioner. TIDAK ADA tombol ubah / simpan / hapus di file ini; server juga menolak semua tulis dari peran hrd
 * (DASHBOARD Hrd.gs: hrdGerbang_ + hrdSaringToken_). Menu operasional (DO, uang jalan, Pos Kontrol, P2H, ban, GPS, gudang, solar) tidak tampil.
 * Server: 1 pintu  pusatHrd [token, aksi, data]  (baca saja).
 * Data pribadi TIDAK disimpan di HP: hanya di memori selama app terbuka, dibuang saat Keluar (lupakan()).
 * NIK KTP / alamat / HP / no SIM datang dari server SUDAH disamarkan (kecuali saklar server KTP penuh dinyalakan).
 */
(function () {
  'use strict';
  var API = window.WHL_API;
  var CTX = null, lapisEl = null, layar = '', MENU = null, menuMuat = false, menuGalat = '';
  var DATA = {}, MUAT = {}, GALAT = {}, ORANG = null, orangMuat = false, orangGalat = '', KPI = {}, kpiMuat = '', dariLayar = '';
  var F = { cari: '', kary: 'aktif', jenis: 'SEMUA', dok: 'perlu', absen: 'rekap', bulan: '', hutang: 'driver', periode: '', ultah: 'ultah', minggu: '', tahun: '', ksn: '' };
  var BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var IKON = { karyawan: '👥', absen: '🗓️', dokumen: '📄', kpi: '🎯', insiden: '⚠️', hutang: '💳', ultah: '🎂', kuesioner: '📝' };
  var JUDUL = { karyawan: 'Data karyawan', absen: 'Absensi & roster', dokumen: 'Masa berlaku dokumen', kpi: 'KPI per orang', insiden: 'Insiden & pelanggaran', hutang: 'Kasbon & cicilan HP', ultah: 'Ulang tahun & poin', kuesioner: 'Hasil kuesioner', orang: 'Detail orang' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { return CTX && CTX.sesi ? CTX.sesi() : null; }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function rp(n) { return 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID'); }
  function angka(n) { return (Number(n) || 0).toLocaleString('id-ID'); }
  function inisial(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase(); }
  function bulanLabel(ym) { return /^\d{4}-\d{2}$/.test(ym || '') ? BLN[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4) : ''; }
  function geserBulan(ym, n) { var t = (+ym.slice(0, 4)) * 12 + (+ym.slice(5, 7)) - 1 + n; return Math.floor(t / 12) + '-' + ('0' + (t % 12 + 1)).slice(-2); }
  function panggil(aksi, data, ms) {
    var S = sesi();
    if (!S || !S.tokenPusat) return Promise.resolve({ ok: false, pesan: 'Sesi habis. Silakan masuk lagi.' });
    return API.Pusat.panggil('pusatHrd', [S.tokenPusat, aksi, data || {}], ms || 60000).then(function (h) {
      if (h && h.login === false && CTX && CTX.sesiHabis) CTX.sesiHabis();
      return h || { ok: false, pesan: 'Server tidak menjawab.' };
    }, function (e) { return { ok: false, pesan: String((e && e.message) || 'Tidak tersambung. Cek internet lalu coba lagi.').slice(0, 160) }; });
  }

  /* ---------- hak ---------- */
  function mode(S) { S = S || sesi(); return !!(S && S.user && S.user.peran === 'hrd'); }
  function pribadi() { return true; } /* app-hrd-seperti-karyawan-27nov: hrd = staf biasa (absen, izin, lembur sendiri), tidak lagi bergantung saklar */
  /** tab yang boleh dibuka peran hrd (dipakai keTab di app.js). Kehadiran pribadi hanya kalau saklar server "pribadi" NYALA. */
  function tabBoleh(t) { return t; } /* app-hrd-seperti-karyawan-27nov */

  /** tombol bawah: Aktivitas (unit / kehadiran) hanya kalau saklar pribadi NYALA; Forum tidak dibuka untuk peran hrd (server menolak). */
  function aturNav() {
    try {
      var h = mode(), a = document.querySelector('.nav button[data-tab="aktivitas"]'), f = document.getElementById('navForum');
      if (a && h) a.classList.remove('sembunyi'); /* app-hrd-seperti-karyawan-27nov: tombol bawah lengkap seperti staf lain */
      if (f && h) f.classList.remove('sembunyi');
    } catch (e) { /* */ }
  }

  /* ---------- gaya ---------- */
  function pasangGaya() {
    if (document.getElementById('hrdGaya')) return;
    var st = document.createElement('style'); st.id = 'hrdGaya';
    st.textContent = [
      '.hrdRuang{border:1.5px solid var(--utama);box-shadow:var(--bayang)}.hrdRuangKp{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}.hrdRuangKp b{font-size:16px;font-weight:900}',
      '.hrdMini{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}.hrdMn{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:4px;padding:9px 2px;border-radius:14px;background:var(--panel2);color:var(--teks);min-width:0;min-height:64px}',
      '.hrdMn span{font-size:22px;line-height:1}.hrdMn b{font-size:11px;font-weight:800;line-height:1.2;text-align:center;overflow-wrap:anywhere}.hrdMn.mati{opacity:.5}.hrdRuang .hrdBag{margin:0;border:0;padding:0;background:none}.hrdRuang .hrdBag h3{margin-top:2px}',
      '.hrdSapa{background:var(--panel);border:1px solid var(--garis);border-radius:20px;padding:16px;margin-bottom:12px;box-shadow:var(--bayang)}',
      '.hrdSapa b{display:block;font-size:19px;font-weight:900;letter-spacing:-.3px}.hrdSapa span{display:block;font-size:13px;color:var(--redup);margin-top:3px;line-height:1.45}',
      '.hrdPita{display:flex;gap:9px;align-items:flex-start;background:var(--tint,var(--panel2));border:1px solid var(--garis);border-radius:14px;padding:10px 12px;margin-bottom:12px;font-size:12.5px;line-height:1.45;color:var(--teks)}',
      '.hrdPita i{font-style:normal;font-size:16px;flex:none}.hrdPita b{font-weight:800}',
      '.hrdGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}',
      '.hrdKt{display:flex;flex-direction:column;align-items:flex-start;gap:5px;text-align:left;background:var(--panel);border:1px solid var(--garis);border-radius:18px;padding:13px 12px;color:var(--teks);box-shadow:var(--bayang);min-height:112px;min-width:0}',
      '.hrdKt .ik{font-size:24px;line-height:1}.hrdKt b{font-size:14.5px;font-weight:800;line-height:1.25}.hrdKt small{font-size:11.5px;color:var(--redup);line-height:1.4}',
      '.hrdKt.mati{opacity:.55}.hrdKt em{font-style:normal;font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:999px;background:var(--panel2);color:var(--redup);margin-top:auto}',
      '.hrdT2{background:var(--panel);border:1px dashed var(--garis);border-radius:16px;padding:12px 14px;font-size:12.5px;color:var(--redup);line-height:1.5;margin-bottom:12px}.hrdT2 b{display:block;color:var(--teks);font-size:13px;margin-bottom:4px}.hrdT2 li{margin-left:16px}',
      '.hrdLapis .ksnKp .sp{flex:1}.hrdLapis .ksnKp .kb.putar{animation:hrdPutar 1s linear infinite}@keyframes hrdPutar{to{transform:rotate(360deg)}}',
      '.hrdLapis .ksnKp .lihat{font-size:10.5px;font-weight:800;background:rgba(255,255,255,.18);padding:3px 8px;border-radius:999px;white-space:nowrap}',
      '.hrdRk{display:grid;grid-template-columns:repeat(auto-fit,minmax(74px,1fr));gap:8px;margin-bottom:10px}',
      '.hrdRk div{background:var(--panel);border:1px solid var(--garis);border-radius:14px;padding:9px 8px;text-align:center;min-width:0}.hrdRk b{display:block;font-size:19px;font-weight:900}.hrdRk span{font-size:10.5px;color:var(--redup);font-weight:700}',
      '.hrdRk .m b{color:var(--merah)}.hrdRk .k b{color:var(--kuning)}.hrdRk .h b{color:var(--hijau)}',
      '.hrdCari input{width:100%;box-sizing:border-box;font-size:16px;min-height:46px;padding:11px 14px;border-radius:14px;margin-bottom:8px}',
      '.hrdSeg{display:flex;gap:4px;background:var(--panel2);border-radius:999px;padding:3px;margin-bottom:8px}.hrdSeg button{flex:1;font-size:12.5px;font-weight:800;padding:8px 4px;border-radius:999px;color:var(--redup);min-height:36px}',
      '.hrdSeg button.on{background:var(--panel);color:var(--teks);box-shadow:var(--bayang)}',
      '.hrdBln{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.hrdBln b{font-size:15px;font-weight:800}.hrdBln button{min-width:44px;min-height:40px;border-radius:12px;background:var(--panel);border:1px solid var(--garis);font-size:18px;font-weight:900;color:var(--teks)}.hrdBln button:disabled{opacity:.35}',
      '.hrdJml{font-size:12px;color:var(--redup);margin:0 2px 8px}',
      '.hrdBr{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:var(--panel);border:1px solid var(--garis);border-radius:14px;padding:10px 12px;margin-bottom:7px;color:var(--teks);min-width:0}',
      '.hrdBr .av{flex:none;width:38px;height:38px;border-radius:50%;background:var(--panel2);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;color:var(--redup);overflow:hidden}.hrdBr .av img{width:100%;height:100%;object-fit:cover}',
      '.hrdBr .tx{flex:1;min-width:0}.hrdBr .tx b{display:block;font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hrdBr .tx small{display:block;font-size:11.5px;color:var(--redup);line-height:1.45;overflow-wrap:anywhere}',
      '.hrdBr .kn{flex:none;text-align:right;font-size:12px;font-weight:800}.hrdBr .kn small{display:block;font-size:10.5px;font-weight:700;color:var(--redup)}',
      '.hrdCp{display:inline-block;font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:999px;background:var(--panel2);color:var(--redup);margin:2px 3px 0 0;white-space:nowrap}',
      '.hrdCp.m{background:rgba(220,76,76,.14);color:var(--merah)}.hrdCp.k{background:rgba(224,161,0,.16);color:var(--tKuning,var(--kuning))}.hrdCp.h{background:rgba(31,174,105,.14);color:var(--hijau)}.hrdCp.b{background:rgba(47,127,216,.14);color:var(--biru)}',
      '.hrdKet{font-size:11.5px;color:var(--redup);line-height:1.5;margin:8px 2px 4px}',
      '.hrdKosong{text-align:center;color:var(--redup);font-size:13px;padding:26px 10px;line-height:1.5}',
      '.hrdBag{background:var(--panel);border:1px solid var(--garis);border-radius:16px;padding:12px 14px;margin-bottom:10px}.hrdBag h3{margin:0 0 8px;font-size:13px;font-weight:900;letter-spacing:.2px;text-transform:uppercase;color:var(--redup)}',
      '.hrdDl{display:grid;grid-template-columns:108px 1fr;gap:5px 10px;font-size:13px}.hrdDl dt{color:var(--redup);font-weight:700}.hrdDl dd{margin:0;font-weight:700;overflow-wrap:anywhere}',
      '.hrdKepala{display:flex;gap:12px;align-items:center;margin-bottom:10px}.hrdKepala .av{width:62px;height:62px;border-radius:50%;background:var(--panel2);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:var(--redup);overflow:hidden;flex:none}.hrdKepala .av img{width:100%;height:100%;object-fit:cover}',
      '.hrdKepala b{display:block;font-size:17px;font-weight:900;line-height:1.2}.hrdKepala small{display:block;color:var(--redup);font-size:12.5px;margin-top:2px}',
      '.hrdRos{overflow-x:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--garis);border-radius:14px;background:var(--panel)}.hrdRos table{border-collapse:collapse;font-size:11px}',
      '.hrdRos th,.hrdRos td{padding:5px 4px;text-align:center;border-bottom:1px solid var(--garis);white-space:nowrap;min-width:26px}.hrdRos th:first-child,.hrdRos td:first-child{position:sticky;left:0;background:var(--panel);text-align:left;font-weight:800;max-width:118px;overflow:hidden;text-overflow:ellipsis;padding-left:10px;z-index:1}',
      '.hrdRos td.kerja{color:var(--teks);font-weight:800}.hrdRos td.libur{color:var(--redup)}.hrdRos td.cuti{color:var(--kuning);font-weight:800}.hrdRos th.ini{color:var(--utama)}',
      '.hrdTbl{font-size:12.5px;width:100%;border-collapse:collapse}.hrdTbl td{padding:4px 0;border-bottom:1px dashed var(--garis);vertical-align:top}.hrdTbl td:last-child{text-align:right;font-weight:800;white-space:nowrap;padding-left:8px}',
      '.hrdMuat{display:flex;align-items:center;gap:10px;color:var(--redup);font-size:13px;padding:22px 6px}.hrdMuat i{width:18px;height:18px;border-radius:50%;border:3px solid var(--garis);border-top-color:var(--utama);animation:hrdPutar 1s linear infinite;flex:none}',
      '.hrdGalat{background:rgba(220,76,76,.1);border:1px solid rgba(220,76,76,.35);color:var(--teks);border-radius:14px;padding:12px 14px;font-size:13px;line-height:1.5;margin-bottom:10px}.hrdGalat button{display:block;margin-top:8px;font-weight:800;color:var(--utama)}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- BERANDA (mengganti beranda operasional untuk peran hrd) ---------- */
  function muatMenu(paksa) {
    if (menuMuat || (MENU && !paksa)) return;
    menuMuat = true; menuGalat = '';
    panggil('menu', {}, 30000).then(function (h) {
      menuMuat = false;
      if (h && h.ok) { MENU = h; if (!F.bulan) F.bulan = h.bulan || ''; aturNav(); } else menuGalat = (h && h.pesan) || 'Menu HRD belum bisa dimuat.';
      if (CTX && CTX.perbarui) CTX.perbarui();
    });
  }
  function berandaHtml(ctx) {
    CTX = ctx || CTX; pasangGaya(); pasangKlik(); aturNav();
    if (!MENU && !menuMuat && !menuGalat) muatMenu(false);
    /* app-hrd-seperti-karyawan-27nov: kartu menonjol di Beranda staf biasa (banner, layanan, forum, kuis tetap ada di bawahnya) */
    var h = '<div class="kartu hrdRuang"><div class="hrdRuangKp"><b>🗃️ Ruang HRD</b><span class="hrdCp">👁️ lihat saja</span></div>';
    if (menuGalat) return h + '<div class="hrdGalat">' + esc(menuGalat) + '<button type="button" data-hrd="ulangMenu">Coba lagi</button></div></div>';
    if (!MENU) return h + '<div class="hrdMuat"><i></i><span>Memuat Ruang HRD…</span></div></div>';
    var PENDEK = { karyawan: 'Karyawan', absen: 'Absensi', dokumen: 'Dokumen', kpi: 'KPI', insiden: 'Insiden', hutang: 'Kasbon', ultah: 'Ultah & poin', kuesioner: 'Kuesioner' };
    h += '<div class="hrdMini">' + MENU.bagian.map(function (b) {
      return '<button type="button" class="hrdMn' + (b.siap ? '' : ' mati') + '" data-hrd="buka:' + esc(b.id) + '" aria-label="' + esc(b.judul) + '"><span>' + (IKON[b.id] || '📁') + '</span><b>' + esc(PENDEK[b.id] || b.judul) + '</b></button>';
    }).join('') + '</div>';
    return h + adminHtml() + '</div>';
  }
  /* Administrasi (Pak Fanza 27 Nov: Adel juga perwakilan HO administrasi, "Input DO uang jalan kasih tampil").
     Kartu ini HANYA membuka halaman web Input DO yang sama dengan kartu "Administrasi WHL" peran lain. Login di sana pakai akun Input DO sendiri;
     app tidak menyimpan / mengisi sandinya. Ringkasan di atasnya = ringkasanPusat bagian 'do' (baca saja, tanpa angka rupiah). */
  var DO = null, doMuat = false;
  function muatDo() {
    if (doMuat || DO) return; var S = sesi(); if (!S || !API.Pusat.ringkasan) return; doMuat = true;
    API.Pusat.ringkasan(S, 'do', false).then(function (r) { doMuat = false; DO = (r && r['do'] && r['do'].ok !== false && r['do'].hariIni) ? r['do'] : { kosong: true }; if (CTX && CTX.perbarui) CTX.perbarui(); }, function () { doMuat = false; DO = { kosong: true }; });
  }
  function adminHtml() {
    muatDo();
    var h = '<div class="hrdBag"><h3>Administrasi · DO & uang jalan</h3>';
    if (DO && !DO.kosong) { var a = DO.hariIni || {}, k = DO.hariKemarin || {};
      h += '<div class="hrdRk"><div><b>' + angka(a.tiket) + '</b><span>tiket hari ini</span></div><div class="k"><b>' + angka(a.menunggu) + '</b><span>menunggu DO</span></div><div class="h"><b>' + angka(a.lengkap) + '</b><span>selesai</span></div><div><b>' + angka(k.tiket) + '</b><span>kemarin</span></div><div class="' + (DO.menunggu3hari ? 'm' : '') + '"><b>' + angka(DO.menungguSemua) + '</b><span>DO belum kembali</span></div></div>'
        + '<div class="hrdKet">Hari tambang ' + esc(DO.hari || '') + ' · ringkasan baca saja, tanpa nominal.' + (DO.menunggu3hari ? ' ' + angka(DO.menunggu3hari) + ' DO belum kembali lebih dari 3 hari.' : '') + '</div>'; }
    h += '<button type="button" class="hrdBr" data-hrd="web:inputdo"><span class="av">🧮</span><span class="tx"><b>Input DO & Uang Jalan</b><small>Halaman web Administrasi WHL · masuk pakai akun Input DO kamu sendiri</small></span><span class="hrdCp b">Web</span></button></div>';
    return h;
  }
  /** daftar ikon layanan untuk peran hrd (dipakai kandidatLayanan app.js): hanya bagian HRD */
  function layanan() {
    return ['karyawan', 'absen', 'dokumen', 'kpi', 'insiden', 'hutang', 'ultah', 'kuesioner'].map(function (id) { return ['web', JUDUL[id], 'hrd:' + id, 0, 'hrd:' + id]; });
  }
  var klikTerpasang = false;
  function pasangKlik() {
    if (klikTerpasang) return; klikTerpasang = true;
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-hrd]') : null; if (!b || (lapisEl && lapisEl.contains(b))) return;
      var a = b.getAttribute('data-hrd');
      if (a === 'ulangMenu') { menuGalat = ''; muatMenu(true); if (CTX && CTX.perbarui) CTX.perbarui(); return; }
      if (a === 'web:inputdo') { var u = (window.WHL_KONFIG || {}).INPUTDO; if (u && CTX && CTX.bukaWeb) CTX.bukaWeb(u); return; }
      if (a.indexOf('buka:') === 0) buka(CTX, a.slice(5));
    });
  }

  /* ---------- lapis ---------- */
  function lapis() {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      pasangGaya();
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis hrdLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik); lapisEl.addEventListener('input', ketik);
    }
    var gulir = lapisEl.querySelector('.ksnIsi'), y = gulir ? gulir.scrollTop : 0, sama = lapisEl.getAttribute('data-layar') === layar;
    var aktif = document.activeElement && document.activeElement.id === 'hrdCari', pos = aktif ? document.activeElement.selectionStart : 0;
    var isi = { karyawan: isiKaryawan, absen: isiAbsen, dokumen: isiDokumen, kpi: isiKpi, insiden: isiInsiden, hutang: isiHutang, ultah: isiUltah, kuesioner: isiKuesioner, orang: isiOrang }[layar];
    var sedang = layar === 'orang' ? orangMuat : !!MUAT[kunciData()];
    lapisEl.setAttribute('data-layar', layar);
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-h="kembali" aria-label="Kembali">‹</button><div class="nm">Ruang HRD<b>' + esc(layar === 'orang' && ORANG ? ORANG.nama : JUDUL[layar] || '') + '</b></div><span class="sp"></span><span class="lihat">👁️ lihat saja</span>'
      + '<button type="button" class="kb' + (sedang ? ' putar' : '') + '" data-h="segar" aria-label="Muat ulang">⟳</button></div><div class="ksnIsi">' + (isi ? isi() : '') + '</div>';
    var g2 = lapisEl.querySelector('.ksnIsi'); if (g2 && sama) g2.scrollTop = y;
    if (aktif) { var c = document.getElementById('hrdCari'); if (c) { c.focus(); try { c.setSelectionRange(pos, pos); } catch (e) { /* */ } } }
  }
  function tutup() { if (!lapisEl) return; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); ORANG = null; layar = ''; }
  function kembali() {
    if (!lapisEl) return false;
    if (layar === 'orang') { layar = dariLayar || 'karyawan'; ORANG = null; lapis(); return true; }
    tutup(); return true;
  }
  function buka(ctx, bagian) {
    CTX = ctx || CTX;
    if (!mode()) { roti('Layar ini khusus peran HRD.'); return; }
    if (!JUDUL[bagian] || bagian === 'orang') bagian = 'karyawan';
    layar = bagian; F.cari = ''; lapis(); muat(false);
  }

  /* ---------- muat data per layar ---------- */
  function kunciData() {
    if (layar === 'absen') return F.absen === 'roster' ? 'roster|' + F.bulan : 'absen|' + F.bulan;
    if (layar === 'hutang') return 'hutang|' + F.periode;
    if (layar === 'ultah') return F.ultah === 'poin' ? 'poin|' + F.minggu : 'ultah';
    if (layar === 'insiden') return 'insiden|' + F.tahun;
    if (layar === 'kuesioner') return 'kuesioner|' + F.ksn;
    if (layar === 'kpi') return 'karyawan';
    return layar;
  }
  function permintaan() {
    if (layar === 'absen') return F.absen === 'roster' ? ['roster', { bulan: F.bulan }] : ['absen', { bulan: F.bulan }];
    if (layar === 'hutang') return ['hutang', { periode: F.periode }];
    if (layar === 'ultah') return F.ultah === 'poin' ? ['poin', { minggu: F.minggu }] : ['ultah', {}];
    if (layar === 'insiden') return ['insiden', { tahun: F.tahun }];
    if (layar === 'kuesioner') return ['kuesioner', { periode: F.ksn }];
    if (layar === 'kpi') return ['karyawan', {}];
    return [layar, {}];
  }
  function muat(paksa) {
    if (layar === 'orang') { if (ORANG) bukaOrang(ORANG.id, true); return; }
    var k = kunciData(); if (MUAT[k] || (DATA[k] && !paksa)) return;
    var p = permintaan(); MUAT[k] = true; GALAT[k] = ''; if (lapisEl) lapis();
    panggil(p[0], p[1], 90000).then(function (h) {
      MUAT[k] = false;
      if (h && h.ok) DATA[k] = h; else GALAT[k] = (h && h.pesan) || 'Belum bisa dimuat.';
      if (lapisEl) lapis();
    }).catch(function () { MUAT[k] = false; if (!DATA[k]) GALAT[k] = 'Belum bisa dimuat. Coba lagi.'; try { if (lapisEl) lapis(); } catch (e2) { /* */ } }); /* hrd-orang-cepat-27nov */
  }
  function keadaan() {
    var k = kunciData();
    if (GALAT[k] && !DATA[k]) return '<div class="hrdGalat">' + esc(GALAT[k]) + '<button type="button" data-h="segar">Coba lagi</button></div>';
    if (!DATA[k]) return '<div class="hrdMuat"><i></i><span>Memuat…</span></div>';
    return '';
  }
  function data() { return DATA[kunciData()] || null; }
  function cocok(teks) { var q = F.cari.trim().toLowerCase(); return !q || String(teks || '').toLowerCase().indexOf(q) >= 0; }
  function kotakCari(ph) { return '<div class="hrdCari"><input id="hrdCari" type="search" autocomplete="off" placeholder="' + esc(ph || 'Cari nama…') + '" value="' + esc(F.cari) + '"></div>'; }
  function seg(nama, pilihan) { return '<div class="hrdSeg">' + pilihan.map(function (p) { return '<button type="button" data-h="seg:' + nama + ':' + p[0] + '" class="' + (F[nama] === p[0] ? 'on' : '') + '">' + esc(p[1]) + '</button>'; }).join('') + '</div>'; }
  function catatan(D) { var c = D && D.catatan; if (!c || !c.length) return ''; return '<div class="hrdKet">ⓘ ' + esc(Array.isArray(c) ? c.join(' ') : c) + '</div>'; }

  /* ---------- 1. data karyawan ---------- */
  function barisOrang(o, kanan, bawah) {
    return '<button type="button" class="hrdBr" data-h="orang:' + esc(o.id) + '"><span class="av">' + esc(inisial(o.nama)) + '</span><span class="tx"><b>' + esc(o.nama) + '</b><small>' + esc(o.jabatan || '') + (o.lambung ? ' · ' + esc(o.lambung) : '') + ' · ' + esc(o.id) + '</small>' + (bawah || '') + '</span>' + (kanan || '') + '</button>';
  }
  function isiKaryawan() {
    var s = keadaan(); if (s) return s;
    var D = data(), R = D.ringkas || {};
    var h = '<div class="hrdRk"><div><b>' + angka(R.aktif) + '</b><span>aktif</span></div><div><b>' + angka(R.staf) + '</b><span>staf</span></div><div><b>' + angka(R.driver) + '</b><span>driver</span></div><div class="h"><b>' + angka(R.baru) + '</b><span>baru</span></div><div class="m"><b>' + angka(R.keluar) + '</b><span>keluar</span></div></div>';
    h += seg('kary', [['aktif', 'Aktif'], ['baru', 'Baru'], ['keluar', 'Keluar']]) + kotakCari('Cari nama, jabatan, ID…');
    if (F.kary === 'keluar') {
      var K = (D.keluar || []).filter(function (o) { return cocok(o.nama + ' ' + o.id + ' ' + o.status); });
      h += '<div class="hrdJml">' + K.length + ' orang tercatat keluar (dari Register ID)</div>';
      h += K.length ? K.map(function (o) { return '<div class="hrdBr"><span class="av">' + esc(inisial(o.nama)) + '</span><span class="tx"><b>' + esc(o.nama) + '</b><small>' + esc(o.id) + (o.jenis ? ' · ' + esc(o.jenis) : '') + '</small></span><span class="kn"><span class="hrdCp m">' + esc(o.status) + '</span><small>' + esc(o.tgl || '') + '</small></span></div>'; }).join('') : '<div class="hrdKosong">Tidak ada.</div>';
      return h + catatan(D);
    }
    h += seg('jenis', [['SEMUA', 'Semua'], ['STAF', 'Staf'], ['DRIVER', 'Driver']]);
    if (window.WHL_IDCETAK) { /* app-cetak-idcard-27nov (peran HRD) */
      if (window.WHL_IDCETAK.hrdBoleh()) h += '<button type="button" class="tKecil" data-h="cetakId" style="margin:0 0 8px">🖨️ Cetak ID card</button>';
      else if (!isiKaryawan._idc) { isiKaryawan._idc = true; window.WHL_IDCETAK.cekHrd(CTX).then(function (ya) { if (ya && lapisEl && layar === 'karyawan') lapis(); }); }
    }
    var L = (D.orang || []).filter(function (o) { return (F.kary !== 'baru' || o.baru) && (F.jenis === 'SEMUA' || o.jenis === F.jenis) && cocok(o.nama + ' ' + o.jabatan + ' ' + o.id + ' ' + o.divisi + ' ' + o.lambung); });
    h += '<div class="hrdJml">' + L.length + ' orang</div>';
    h += L.length ? L.map(function (o) {
      return barisOrang(o, '<span class="kn">' + esc(o.masaKerja || '') + '<small>' + esc(o.tglMasuk || 'tgl masuk kosong') + '</small></span>', (o.baru ? '<span class="hrdCp h">baru</span>' : '') + '<span class="hrdCp">' + esc(o.divisi || o.jenis) + '</span>' + (o.dataKurang ? '<span class="hrdCp k">data kurang ' + o.dataKurang + '</span>' : ''));
    }).join('') : '<div class="hrdKosong">Tidak ketemu.</div>';
    return h + catatan(D);
  }

  /* ---------- 2. absensi & roster ---------- */
  function navBulan(ym, maks, aksi) {
    return '<div class="hrdBln"><button type="button" data-h="' + aksi + ':-1" aria-label="Bulan sebelumnya">‹</button><b>' + esc(bulanLabel(ym)) + '</b><button type="button" data-h="' + aksi + ':1" aria-label="Bulan berikutnya"' + (maks && ym >= maks ? ' disabled' : '') + '>›</button></div>';
  }
  function isiAbsen() {
    var bl = (MENU && MENU.bulan) || F.bulan, h = seg('absen', [['rekap', 'Rekap bulan'], ['roster', 'Roster']]) + navBulan(F.bulan, F.absen === 'roster' ? geserBulan(bl, 1) : bl, 'bulan');
    var s = keadaan(); if (s) return h + s;
    var D = data();
    if (F.absen === 'roster') {
      var T = D.tanggal || [], O = (D.orang || []).filter(function (o) { return cocok(o.nama + ' ' + o.jabatan + ' ' + o.divisi); });
      h += kotakCari('Cari nama / jabatan…') + '<div class="hrdJml">' + O.length + ' orang · ' + T.length + ' hari</div>';
      if (!T.length || !O.length) return h + '<div class="hrdKosong">' + esc((D.pesan && D.pesan.join(' ')) || 'Roster bulan ini belum ada.') + '</div>';
      h += '<div class="hrdRos"><table><tr><th>Nama</th>' + T.map(function (t) { return '<th class="' + (t.hariIni ? 'ini' : '') + '">' + t.tglN + '<br>' + esc(String(t.hr || '').slice(0, 2)) + '</th>'; }).join('') + '</tr>'
        + O.map(function (o) { return '<tr><td title="' + esc(o.jabatan) + '">' + esc(o.nama) + '</td>' + (o.sel || []).map(function (c) { return '<td class="' + esc(c.status) + '">' + esc(c.status === 'kerja' ? (c.kode || '•') : c.status === 'libur' ? 'L' : c.status === 'cuti' ? (c.kode || 'C').slice(0, 2) : c.status === 'full' ? 'F' : '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div>';
      return h + '<div class="hrdKet">Huruf = kode shift di roster · L = libur · F = full time · kosong = tidak ada di roster. Geser ke samping untuk tanggal lain.</div>' + (D.pesan && D.pesan.length ? catatan({ catatan: D.pesan }) : '');
    }
    var R = D.ringkas || {};
    h += '<div class="hrdRk"><div><b>' + angka(R.orang) + '</b><span>orang</span></div><div class="h"><b>' + angka(R.hadir) + '</b><span>hari hadir</span></div><div class="k"><b>' + angka(R.telat) + '</b><span>telat</span></div><div class="m"><b>' + (D.rosterAda ? angka(R.tanpaScan) : '–') + '</b><span>tanpa scan</span></div><div><b>' + angka(R.lemburJam) + '</b><span>jam lembur</span></div></div>';
    h += kotakCari('Cari nama / jabatan…');
    var L = (D.orang || []).filter(function (o) { return cocok(o.nama + ' ' + o.jabatan); });
    h += L.length ? L.map(function (o) {
      return barisOrang(o, '<span class="kn">' + o.hadir + ' hari<small>hadir</small></span>',
        '<span class="hrdCp' + (o.telat ? ' k' : '') + '">telat ' + o.telat + '</span><span class="hrdCp' + (o.tanpaScan ? ' m' : '') + '">tanpa scan ' + (o.tanpaScan == null ? '–' : o.tanpaScan) + '</span>' + (o.izin ? '<span class="hrdCp b">izin/cuti ' + o.izin + '</span>' : '') + '<span class="hrdCp">lembur ' + String(o.lemburJam).replace('.', ',') + ' j</span>' + (o.lemburTunggu ? '<span class="hrdCp k">' + o.lemburTunggu + ' lembur menunggu</span>' : ''));
    }).join('') : '<div class="hrdKosong">Tidak ketemu.</div>';
    return h + '<div class="hrdKet">' + esc(D.ket || '') + '</div>' + catatan(D);
  }

  /* ---------- 3. dokumen ---------- */
  var CP_DOK = { habis: 'm', segera: 'm', dekat: 'k', aman: 'h', kosong: '' };
  function chipDok(d) { return '<span class="hrdCp ' + (CP_DOK[d.status] || '') + '">' + esc(d.jenis + (d.gol ? ' ' + d.gol : '')) + ': ' + esc(d.berlaku ? d.berlaku + ' · ' + d.teks : d.teks) + '</span>'; }
  function isiDokumen() {
    var s = keadaan(); if (s) return s;
    var D = data(), R = D.ringkas || {};
    var h = '<div class="hrdRk"><div class="m"><b>' + angka(R.habis) + '</b><span>sudah habis</span></div><div class="m"><b>' + angka(R.segera) + '</b><span>≤ 30 hari</span></div><div class="k"><b>' + angka(R.dekat) + '</b><span>≤ 60 hari</span></div><div class="h"><b>' + angka(R.aman) + '</b><span>aman</span></div><div><b>' + angka(R.kosong) + '</b><span>belum diisi</span></div></div>';
    h += seg('dok', [['perlu', 'Perlu perhatian'], ['kosong', 'Belum diisi'], ['semua', 'Semua']]) + kotakCari('Cari nama / lambung…');
    var L = (D.orang || []).filter(function (o) { return (F.dok === 'semua' || (F.dok === 'kosong' ? o.status === 'kosong' : /habis|segera|dekat/.test(o.status))) && cocok(o.nama + ' ' + o.jabatan + ' ' + o.lambung + ' ' + o.id); });
    h += '<div class="hrdJml">' + L.length + ' orang</div>';
    h += L.length ? L.map(function (o) { return barisOrang(o, '', (o.dok || []).map(chipDok).join('')); }).join('') : '<div class="hrdKosong">' + (F.dok === 'perlu' ? 'Tidak ada dokumen yang habis / hampir habis.' : 'Tidak ada.') + '</div>';
    return h + '<div class="hrdKet">' + esc(D.catatan || '') + '</div>';
  }

  /* ---------- 4. KPI ---------- */
  function kotakKpi(k) {
    if (!k) return '';
    if (k.ok === false) return '<div class="hrdKet">KPI: ' + esc(k.pesan || 'belum tersedia') + '</div>';
    var h = '<div class="hrdRk"><div class="' + (k.nilai == null ? '' : k.nilai >= 90 ? 'h' : k.nilai >= 75 ? 'k' : 'm') + '"><b>' + (k.nilai == null ? '–' : String(k.nilai).replace('.', ',')) + '</b><span>nilai KPI' + (k.bulan ? ' ' + esc(k.bulan) : '') + '</span></div>' + (k.predikat ? '<div><b>' + esc(k.predikat) + '</b><span>predikat</span></div>' : '') + (k.peran ? '<div><b style="font-size:13px">' + esc(k.peran) + '</b><span>peran KPI</span></div>' : '') + '</div>';
    if (k.aspek && k.aspek.length) h += '<table class="hrdTbl">' + k.aspek.map(function (a) { return '<tr><td>' + esc(a.nama) + (a.ket ? '<br><span style="color:var(--redup);font-size:11px">' + esc(a.ket) + '</span>' : '') + '</td><td>' + (a.nilai == null ? '–' : String(a.nilai).replace('.', ',')) + (a.bobot != null ? ' <span style="color:var(--redup);font-weight:700">· bobot ' + a.bobot + '</span>' : '') + '</td></tr>'; }).join('') + '</table>';
    return h;
  }
  function isiKpi() {
    var s = keadaan(); if (s) return s;
    var D = data(), h = '<div class="hrdPita"><i>🎯</i><span>Pilih orang untuk melihat nilai KPI <b>bulan berjalan</b>. Nilai diambil dari sistem penilaian yang sama dengan menu "Nilai saya" milik orang itu.</span></div>' + seg('jenis', [['SEMUA', 'Semua'], ['STAF', 'Staf'], ['DRIVER', 'Driver']]) + kotakCari('Cari nama / jabatan…');
    var L = (D.orang || []).filter(function (o) { return (F.jenis === 'SEMUA' || o.jenis === F.jenis) && cocok(o.nama + ' ' + o.jabatan + ' ' + o.id); });
    h += '<div class="hrdJml">' + L.length + ' orang</div>' + (L.length ? L.map(function (o) {
      var k = KPI[o.id], kn = k && k.ok ? '<span class="kn">' + (k.nilai == null ? '–' : String(k.nilai).replace('.', ',')) + '<small>KPI</small></span>' : k ? '<span class="kn"><small>belum ada</small></span>' : '<span class="kn"><small>lihat ›</small></span>';
      return barisOrang(o, kn, '');
    }).join('') : '<div class="hrdKosong">Tidak ketemu.</div>');
    return h + '<div class="hrdKet">KPI bulan lalu dan daftar nilai semua orang sekaligus menyusul (tahap 2).</div>';
  }

  /* ---------- 5. insiden ---------- */
  function barisInsiden(x) { return '<tr><td>' + esc(x.tgl) + ' · <b>' + esc(x.tab) + '</b>' + (x.jenis ? '<br>' + esc(x.jenis) : '') + (x.kategori ? ' <span style="color:var(--redup)">(' + esc(x.kategori) + ')</span>' : '') + (x.unit || x.lokasi ? '<br><span style="color:var(--redup);font-size:11px">' + esc([x.unit, x.lokasi].filter(Boolean).join(' · ')) + '</span>' : '') + (x.sanksi ? '<br><span style="font-size:11px">Tindakan: ' + esc(x.sanksi) + '</span>' : '') + '</td><td>' + esc(x.status || '') + '</td></tr>'; }
  function isiInsiden() {
    var th = F.tahun || String(new Date().getFullYear()), kini = String(new Date().getFullYear());
    var h = '<div class="hrdBln"><button type="button" data-h="tahun:-1" aria-label="Tahun sebelumnya">‹</button><b>Tahun ' + esc(th) + '</b><button type="button" data-h="tahun:1" aria-label="Tahun berikutnya"' + (th >= kini ? ' disabled' : '') + '>›</button></div>';
    var s = keadaan(); if (s) return h + s;
    var D = data(), R = D.ringkas || {};
    h += '<div class="hrdRk"><div><b>' + angka(R.orang) + '</b><span>orang</span></div><div class="m"><b>' + angka(R.insiden) + '</b><span>insiden</span></div><div class="k"><b>' + angka(R.pelanggaran) + '</b><span>pelanggaran</span></div></div>' + kotakCari('Cari nama…');
    var L = (D.orang || []).filter(function (o) { return cocok(o.nama); });
    h += L.length ? L.map(function (o) {
      return '<div class="hrdBag"><div class="hrdKepala" style="margin-bottom:6px"><div><b style="font-size:15px">' + esc(o.nama) + '</b><small>' + (o.insiden ? '<span class="hrdCp m">' + o.insiden + ' insiden</span>' : '') + (o.pelanggaran ? '<span class="hrdCp k">' + o.pelanggaran + ' pelanggaran</span>' : '') + ' terakhir ' + esc(o.terakhir) + '</small></div></div><table class="hrdTbl">' + (o.daftar || []).slice(0, 8).map(barisInsiden).join('') + '</table></div>';
    }).join('') : '<div class="hrdKosong">Tidak ada catatan di tahun ini.</div>';
    return h + '<div class="hrdKet">' + esc(D.ket || '') + '</div>' + catatan(D);
  }

  /* ---------- 6. kasbon & cicilan ---------- */
  function isiHutang() {
    var Dk = data(), per = (Dk && Dk.periode) || F.periode || (MENU && MENU.bulan) || '';
    var h = seg('hutang', [['driver', 'Driver'], ['staf', 'Karyawan (cicilan HP)']]) + (per ? navBulan(per, (MENU && MENU.bulan) || per, 'periode') : '');
    var s = keadaan(); if (s) return h + s;
    var D = Dk, R = D.ringkas || {};
    if (F.hutang === 'staf') {
      var Ls = (D.staf || []).filter(function (o) { return cocok(o.nama + ' ' + o.jabatan); });
      h += '<div class="hrdRk"><div><b>' + angka(R.staf) + '</b><span>cicilan berjalan</span></div><div class="k"><b style="font-size:14px">' + rp(R.sisaCicilanStaf) + '</b><span>total sisa</span></div></div>' + kotakCari('Cari nama…');
      return h + (Ls.length ? Ls.map(function (o) { return '<div class="hrdBr"><span class="av">' + esc(inisial(o.nama)) + '</span><span class="tx"><b>' + esc(o.nama) + '</b><small>' + esc(o.jabatan || '') + (o.barang ? ' · ' + esc(o.barang) : '') + '</small><span class="hrdCp">cicilan ' + o.ke + '/' + o.n + '</span><span class="hrdCp">' + rp(o.perBulan) + '/bln</span>' + (o.status ? '<span class="hrdCp b">' + esc(o.status) + '</span>' : '') + '</span><span class="kn">' + rp(o.sisa) + '<small>sisa</small></span></div>'; }).join('') : '<div class="hrdKosong">Tidak ada cicilan HP karyawan di periode ini.</div>') + '<div class="hrdKet">' + esc(D.ket || '') + '</div>';
    }
    h += '<div class="hrdRk"><div><b>' + angka(R.driver) + '</b><span>driver</span></div><div class="k"><b style="font-size:14px">' + rp(R.kasbon) + '</b><span>kasbon periode ini</span></div><div class="k"><b style="font-size:14px">' + rp(R.sisaCicilanDriver) + '</b><span>sisa cicilan HP</span></div>' + (R.tunggu ? '<div><b>' + R.tunggu + '</b><span>ajuan menunggu</span></div>' : '') + '</div>' + kotakCari('Cari nama / lambung…');
    var L = (D.driver || []).filter(function (o) { return cocok(o.nama + ' ' + o.lambung); });
    h += L.length ? L.map(function (o) {
      return '<div class="hrdBr"><span class="av">' + esc(inisial(o.nama)) + '</span><span class="tx"><b>' + esc(o.nama) + '</b><small>' + esc(o.lambung || '') + (o.statusUser && o.statusUser !== 'user' ? ' · ' + esc(o.statusUser) : '') + '</small>'
        + '<span class="hrdCp' + (o.kasbon ? ' k' : '') + '">kasbon ' + rp(o.kasbon) + '</span>' + (o.bayar ? '<span class="hrdCp h">dibayar ' + rp(o.bayar) + '</span>' : '') + (o.terbawa ? '<span class="hrdCp m">terbawa ' + rp(o.terbawa) + '</span>' : '')
        + (o.cicilan || []).map(function (c) { return '<span class="hrdCp b">' + esc(c.barang || 'cicilan') + ' ' + c.ke + '/' + c.n + '</span>'; }).join('') + (o.tungguN ? '<span class="hrdCp">' + o.tungguN + ' ajuan menunggu</span>' : '')
        + (D.gaji ? '<span class="hrdCp">gaji bersih ' + rp(o.bersih) + '</span>' : '') + '</span><span class="kn">' + rp(o.sisaCicilan) + '<small>sisa cicilan</small></span></div>';
    }).join('') : '<div class="hrdKosong">Tidak ada kasbon / cicilan driver di periode ini.</div>';
    return h + '<div class="hrdKet">' + esc(D.ket || '') + (D.tutupBuku ? ' Periode ini sudah tutup buku.' : '') + '</div>' + catatan(D);
  }

  /* ---------- 7. ulang tahun & poin ---------- */
  function isiUltah() {
    var h = seg('ultah', [['ultah', 'Ulang tahun'], ['poin', 'Papan poin']]);
    var s = keadaan(); if (s) return h + s;
    var D = data();
    if (F.ultah === 'poin') {
      var blok = function (jd, P) {
        if (!P) return '';
        if (P.ok === false) return '<div class="hrdBag"><h3>' + esc(jd) + '</h3><div class="hrdKet">' + esc(P.pesan) + '</div></div>';
        return '<div class="hrdBag"><h3>' + esc(jd) + ' · ' + esc(P.label || '') + (P.berjalan ? ' (berjalan)' : '') + '</h3>' + ((P.papan || []).map(function (p) {
          return '<b style="font-size:13px">' + esc(p.judul) + '</b><table class="hrdTbl" style="margin:4px 0 10px">' + ((p.daftar || []).slice(0, 10).map(function (x) { return '<tr><td>' + (x.urut ? x.urut + '. ' : '') + esc(x.nama) + (x.peranLabel ? ' <span style="color:var(--redup)">· ' + esc(x.peranLabel) + '</span>' : '') + '</td><td>' + (x.nilai == null ? '' : String(x.nilai).replace('.', ',') + esc(p.satuan || '')) + (x.poin ? ' · +' + x.poin : '') + '</td></tr>'; }).join('') || '<tr><td>Belum ada.</td><td></td></tr>') + '</table>';
        }).join('') || '<div class="hrdKet">Belum ada papan.</div>') + '</div>';
      };
      return h + seg('minggu', [['', 'Minggu lalu (final)'], ['berjalan', 'Minggu ini']]) + blok('Driver', D.driver) + blok('Staf', D.staf) + catatan(D);
    }
    var R = D.ringkas || {};
    h += '<div class="hrdRk"><div class="h"><b>' + angka(R.hariIni) + '</b><span>hari ini</span></div><div><b>' + angka(R.minggu) + '</b><span>7 hari</span></div><div><b>' + angka(R.bulan) + '</b><span>30 hari</span></div></div>' + kotakCari('Cari nama…');
    var L = (D.orang || []).filter(function (o) { return cocok(o.nama + ' ' + o.jabatan); });
    h += L.length ? L.slice(0, 120).map(function (o) { return barisOrang(o, '<span class="kn">' + esc(o.tgl) + '<small>' + (o.hariLagi === 0 ? '🎂 hari ini' : o.hariLagi + ' hari lagi') + (o.umur ? ' · ke-' + o.umur : '') + '</small></span>', ''); }).join('') : '<div class="hrdKosong">Belum ada tanggal lahir.</div>';
    return h + '<div class="hrdKet">' + (D.tanpaTgl ? D.tanpaTgl + ' orang belum punya tanggal lahir di Data karyawan. ' : '') + 'Tahun lahir tidak ditampilkan.</div>';
  }

  /* ---------- 8. kuesioner ---------- */
  function nilaiKsn(x, min) { if (!x) return '<small>–</small>'; return x.nilai == null ? '<small>' + x.n + ' penilai (min ' + min + ')</small>' : String(x.nilai).replace('.', ',') + '<small>' + x.n + ' penilai</small>'; }
  function isiKuesioner() {
    var s = keadaan(); if (s) return s;
    var D = data(), h = '<div class="hrdBln"><button type="button" data-h="ksn:-1" aria-label="Periode sebelumnya">‹</button><b>Periode ' + esc(bulanLabel(D.periode)) + '</b><button type="button" data-h="ksn:1" aria-label="Periode berikutnya"' + (geserBulan(D.periode, 1) >= D.periodeBuka ? ' disabled' : '') + '>›</button></div>' + kotakCari('Cari nama…');
    var L = (D.orang || []).filter(function (o) { return cocok(o.nama + ' ' + o.jabatan); });
    h += L.length ? L.map(function (o) { return '<div class="hrdBr"><span class="av">' + esc(inisial(o.nama)) + '</span><span class="tx"><b>' + esc(o.nama) + '</b><small>' + esc(o.jabatan || '') + '</small></span><span class="kn" title="dari driver">🚚 ' + nilaiKsn(o.dariDriver, D.minDriver) + '</span><span class="kn" title="dari rekan kerja" style="margin-left:10px">🧑‍💼 ' + nilaiKsn(o.dariStaf, D.minStaf) + '</span></div>'; }).join('') : '<div class="hrdKosong">Belum ada hasil.</div>';
    return h + '<div class="hrdKet">🚚 = nilai dari driver · 🧑‍💼 = nilai dari rekan kerja. ' + esc(D.ket || '') + '</div>' + catatan(D);
  }

  /* ---------- detail 1 orang ---------- */
  /* hrd-orang-cepat-27nov: nama + jabatan dari daftar yang sudah ada di HP tampil dulu; data dasar (cepat) lalu bagian berat menyusul; galat apa pun = pesan + Coba lagi */
  function orangDariDaftar(id) { var r = null; try { Object.keys(DATA).forEach(function (k) { var L = DATA[k] && DATA[k].orang; if (!r && Array.isArray(L)) L.some(function (x) { if (x && x.id === id) { r = x; return true; } return false; }); }); } catch (e) { r = null; } return r || {}; }
  function bukaOrang(id, paksa) {
    if (!paksa) dariLayar = layar === 'orang' ? dariLayar : layar;
    var kenal = orangDariDaftar(id), lama = ORANG && ORANG.id === id ? ORANG : {};
    ORANG = { id: id, nama: kenal.nama || lama.nama || '', jabatan: kenal.jabatan || lama.jabatan || '' };
    layar = 'orang'; orangMuat = true; orangGalat = ''; lapis();
    var gagal = function (pesan) { orangMuat = false; if (!ORANG || ORANG.id !== id) return; if (ORANG.ok && ORANG.dasar) ORANG.lanjutGalat = pesan; else orangGalat = pesan; try { if (lapisEl && layar === 'orang') lapis(); } catch (e2) { /* */ } };
    var lengkap = function () {
      panggil('orang', { id: id }, 90000).then(function (h) {
        if (!ORANG || ORANG.id !== id) { orangMuat = false; return; }
        if (h && h.ok) { orangMuat = false; ORANG = h; if (lapisEl && layar === 'orang') lapis(); } else gagal((h && h.pesan) || 'Belum bisa dimuat.');
      }).catch(function () { gagal('Belum bisa dimuat. Coba lagi.'); });
    };
    panggil('orang', { id: id, dasar: 1 }, 45000).then(function (h) {
      if (!ORANG || ORANG.id !== id) { orangMuat = false; return; }
      if (h && h.ok && h.dasar) { ORANG = h; if (lapisEl && layar === 'orang') lapis(); lengkap(); return; }
      if (h && h.ok) { orangMuat = false; ORANG = h; if (lapisEl && layar === 'orang') lapis(); return; } /* server lama: jawabannya sudah lengkap */
      lengkap(); /* data dasar gagal: tetap coba yang lengkap, galatnya ditampilkan di sana */
    }).catch(function () { gagal('Belum bisa dimuat. Coba lagi.'); });
  }
  function muatKpi(id) {
    if (kpiMuat) return; kpiMuat = id; if (lapisEl) lapis();
    panggil('kpi', { id: id }, 60000).then(function (h) { kpiMuat = ''; KPI[id] = h || { ok: false, pesan: 'belum tersedia' }; if (lapisEl) lapis(); }).catch(function () { kpiMuat = ''; KPI[id] = KPI[id] || { ok: false, pesan: 'belum tersedia' }; try { if (lapisEl) lapis(); } catch (e2) { /* */ } }); /* hrd-orang-cepat-27nov */
  }
  function dl(L) { return '<dl class="hrdDl">' + L.filter(function (x) { return x[1] !== '' && x[1] != null; }).map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>'; }).join('') + '</dl>'; }
  function isiOrang() {
    if (orangGalat) return '<div class="hrdGalat">' + esc(orangGalat) + '<button type="button" data-h="segar">Coba lagi</button></div>';
    var o = ORANG; if (!o || !o.ok) return (o && o.nama ? '<div class="hrdKepala"><span class="av">' + esc(inisial(o.nama)) + '</span><div><b>' + esc(o.nama) + '</b><small>' + esc(o.jabatan || '') + '</small></div></div>' : '') + '<div class="hrdMuat"><i></i><span>Memuat data orang… Bisa sampai 1 menit kalau datanya belum dibuka hari ini.</span></div>'; /* hrd-orang-cepat-27nov */
    var P = o.pribadi || {}, h = '<div class="hrdKepala"><span class="av">' + (o.mini && /^data:image\//.test(o.mini) ? '<img alt="" src="' + esc(o.mini) + '">' : esc(inisial(o.nama))) + '</span><div><b>' + esc(o.nama) + '</b><small>' + esc(o.jabatan) + ' · ' + esc(o.divisi || o.jenis) + '</small><span class="hrdCp h">' + esc(o.status) + '</span>' + (o.baru ? '<span class="hrdCp b">karyawan baru</span>' : '') + '</div></div>';
    h += '<div class="hrdBag"><h3>Kepegawaian</h3>' + dl([['ID permanen', o.id], ['ID kartu', o.kartu], ['Jenis', o.jenis], ['Jabatan', o.jabatan], ['Divisi', o.divisi], ['Lambung', o.lambung], ['Vendor', o.vendor], ['Tgl masuk', o.tglMasuk], ['Masa kerja', o.masaKerja]]) + (o.dataKurang && o.dataKurang.length ? '<div class="hrdKet">Data belum lengkap: ' + esc(o.dataKurang.join(', ')) + '</div>' : '') + '</div>';
    h += '<div class="hrdBag"><h3>Data pribadi' + (P.samar ? ' <span class="hrdCp">disamarkan</span>' : '') + '</h3>' + dl([['NIK KTP', P.nikKtp], ['Tempat lahir', P.tempatLahir], ['Tgl lahir', P.tglLahir], ['Umur', P.umur ? P.umur + ' th' : ''], ['Jenis kelamin', P.jk], ['Status', P.kawin], ['Agama', P.agama], ['Gol darah', P.golDarah], ['No HP', P.hp], ['Alamat', P.alamat], ['No SIM', P.noSim]]) + (P.samar ? '<div class="hrdKet">NIK, alamat, no HP dan no SIM disamarkan sebagian. Tahun lahir tidak ditampilkan.</div>' : '') + '</div>';
    if (o.dasar) return h + (o.lanjutGalat ? '<div class="hrdGalat">Dokumen, absensi, insiden, kasbon dan kuesioner belum bisa dimuat: ' + esc(o.lanjutGalat) + '<button type="button" data-h="segar">Coba lagi</button></div>' : '<div class="hrdMuat"><i></i><span>Memuat dokumen, absensi, insiden, kasbon dan kuesioner… Bisa sampai 1 menit.</span></div>'); /* hrd-orang-cepat-27nov */
    var d = o.dokumen || {}; h += '<div class="hrdBag"><h3>Masa berlaku dokumen</h3>' + (d.galat ? '<div class="hrdKet">' + esc(d.galat) + '</div>' : (d.dok && d.dok.length ? d.dok.map(chipDok).join('') : '<div class="hrdKet">Tidak ada dokumen bertanggal untuk orang ini.</div>')) + '<div class="hrdKet">MCU, surat sehat, SIMPER MIP: menyusul (tahap 2).</div></div>';
    if (o.absen) { var a = o.absen; h += '<div class="hrdBag"><h3>Absensi ' + esc(bulanLabel(a.bulan)) + '</h3>' + (a.galat ? '<div class="hrdKet">' + esc(a.galat) + '</div>' : a.kosong ? '<div class="hrdKet">Belum ada catatan absen bulan ini.</div>' : '<div class="hrdRk"><div class="h"><b>' + a.hadir + '</b><span>hadir</span></div><div class="k"><b>' + a.telat + '</b><span>telat</span></div><div class="m"><b>' + (a.tanpaScan == null ? '–' : a.tanpaScan) + '</b><span>tanpa scan</span></div><div><b>' + String(a.lemburJam).replace('.', ',') + '</b><span>jam lembur</span></div></div>') + '</div>'; }
    h += '<div class="hrdBag"><h3>KPI bulan berjalan</h3>' + (KPI[o.id] ? kotakKpi(KPI[o.id]) : o.kpiBisa ? '<button type="button" class="tKecil" data-h="kpi:' + esc(o.id) + '">' + (kpiMuat === o.id ? 'Memuat…' : 'Tampilkan nilai KPI') + '</button>' : '<div class="hrdKet">Nomor orang ini belum dikenali sistem penilaian.</div>') + '</div>';
    var i = o.insiden || {}; h += '<div class="hrdBag"><h3>Insiden & pelanggaran ' + esc(i.tahun || '') + '</h3>' + (i.galat ? '<div class="hrdKet">' + esc(i.galat) + '</div>' : (i.daftar && i.daftar.length ? '<table class="hrdTbl">' + i.daftar.map(barisInsiden).join('') + '</table>' : '<div class="hrdKet">Tidak ada catatan atas nama ini.</div>') + '<div class="hrdKet">Dicocokkan berdasarkan nama di Database Insiden.</div>') + '</div>';
    var u = o.hutang || {}; h += '<div class="hrdBag"><h3>Kasbon & cicilan ' + esc(bulanLabel(u.periode)) + '</h3>';
    if (u.galat) h += '<div class="hrdKet">' + esc(u.galat) + '</div>';
    else if (!u.driver && !(u.staf && u.staf.length)) h += '<div class="hrdKet">Tidak ada kasbon / cicilan tercatat.</div>';
    else {
      if (u.driver) h += '<table class="hrdTbl"><tr><td>Kasbon periode ini</td><td>' + rp(u.driver.kasbon) + '</td></tr>' + (u.driver.bayar ? '<tr><td>Sudah dibayar</td><td>' + rp(u.driver.bayar) + '</td></tr>' : '') + (u.driver.terbawa ? '<tr><td>Terbawa dari bulan lalu</td><td>' + rp(u.driver.terbawa) + '</td></tr>' : '') + '<tr><td>Sisa cicilan HP</td><td>' + rp(u.driver.sisaCicilan) + '</td></tr>' + (u.gaji ? '<tr><td>Gaji bersih</td><td>' + rp(u.driver.bersih) + '</td></tr>' : '') + '</table>';
      (u.staf || []).forEach(function (c) { h += '<table class="hrdTbl"><tr><td>' + esc(c.barang || 'Cicilan HP') + ' · ' + c.ke + '/' + c.n + '</td><td>sisa ' + rp(c.sisa) + '</td></tr></table>'; });
    }
    h += '</div>';
    var q = o.kuesioner || {}; if (!q.bukan) h += '<div class="hrdBag"><h3>Kuesioner ' + esc(bulanLabel(q.periode)) + '</h3>' + (q.galat ? '<div class="hrdKet">' + esc(q.galat) + '</div>' : q.kosong ? '<div class="hrdKet">Tidak ikut dinilai di periode ini.</div>' : '<div class="hrdRk"><div><b>' + (q.dariDriver && q.dariDriver.nilai != null ? String(q.dariDriver.nilai).replace('.', ',') : '–') + '</b><span>dari driver (' + ((q.dariDriver && q.dariDriver.n) || 0) + ')</span></div><div><b>' + (q.dariStaf && q.dariStaf.nilai != null ? String(q.dariStaf.nilai).replace('.', ',') : '–') + '</b><span>dari rekan (' + ((q.dariStaf && q.dariStaf.n) || 0) + ')</span></div></div>') + '</div>';
    return h;
  }

  /* ---------- klik & ketik (tidak ada aksi tulis) ---------- */
  function klik(e) {
    var b = e.target.closest('[data-h]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-h'), p = a.split(':');
    if (a === 'kembali') { kembali(); return; }
    if (a === 'cetakId') { if (window.WHL_IDCETAK) window.WHL_IDCETAK.buka(CTX, { hrd: true }); return; } /* app-cetak-idcard-27nov (peran HRD) */
    if (a === 'segar') { if (layar === 'orang') { if (ORANG) bukaOrang(ORANG.id, true); } else muat(true); return; }
    if (p[0] === 'seg') { F[p[1]] = p.slice(2).join(':'); lapis(); muat(false); return; }
    if (p[0] === 'bulan') { F.bulan = geserBulan(F.bulan || (MENU && MENU.bulan) || new Date().toISOString().slice(0, 7), +p[1]); lapis(); muat(false); return; }
    if (p[0] === 'periode') { var D = data(), pr = (D && D.periode) || F.periode || (MENU && MENU.bulan); if (pr) { F.periode = geserBulan(pr, +p[1]); lapis(); muat(false); } return; }
    if (p[0] === 'tahun') { F.tahun = String((+(F.tahun || new Date().getFullYear())) + (+p[1])); lapis(); muat(false); return; }
    if (p[0] === 'ksn') { var Dq = data(); if (Dq && Dq.periode) { F.ksn = geserBulan(Dq.periode, +p[1]); lapis(); muat(false); } return; }
    if (p[0] === 'kpi') { muatKpi(p.slice(1).join(':')); return; }
    if (p[0] === 'orang') { var id = p.slice(1).join(':'); var dariKpi = layar === 'kpi'; bukaOrang(id, false); if (dariKpi && !KPI[id]) muatKpi(id); return; }
  }
  var ketikT = 0;
  function ketik(e) { if (e.target && e.target.id === 'hrdCari') { F.cari = e.target.value; clearTimeout(ketikT); ketikT = setTimeout(lapis, 180); } }

  function lupakan() { DO = null; doMuat = false; MENU = null; menuMuat = false; menuGalat = ''; DATA = {}; MUAT = {}; GALAT = {}; ORANG = null; KPI = {}; kpiMuat = ''; F.cari = ''; if (lapisEl) { try { lapisEl.remove(); } catch (e) { /* */ } lapisEl = null; } layar = ''; try { var f = document.getElementById('navForum'); if (f) f.classList.remove('sembunyi'); } catch (e2) { /* */ } }

  window.WHL_HRD = { mode: mode, pribadi: pribadi, tabBoleh: tabBoleh, berandaHtml: berandaHtml, layanan: layanan, buka: buka, kembali: kembali, lupakan: lupakan,
    _uji: { F: F, data: function () { return DATA; }, menu: function () { return MENU; } } };
})();
