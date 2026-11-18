/* WHL App — LAPOR HAZARD + LAPORAN SAYA + VALIDASI HAZARD (tahap 4 rancangan Upgrade\app-beranda-poin-16nov §1 no 9, §3, §7.5).
 * Paket app-tahap36-17nov tim B (Andro, 17 Nov 2026). Server: DASHBOARD PusatHazard.gs (Armand) —
 *   pusatHazardOpsi(token) / pusatHazardKirim(token, d) / pusatHazardSaya(token) / pusatHazardAntre(token) /
 *   pusatHazardPutus(token, id, status, alasan) / pusatHazardAngkatWa(token, idKendala, jenis) / pusatHazardBerkas(token, id, 'foto'|'suara').
 * - Lapor: tombol besar -> kamera langsung (atau galeri), foto WAJIB, lokasi GPS otomatis (wajib), jenis bahaya (chip ikon),
 *   keterangan KETIK atau REKAM SUARA (MediaRecorder 24 kbps, maks 60 dtk). Kirim pakai cid (anti dobel); sinyal putus = antrean di HP, dikirim ulang otomatis.
 * - Laporan saya: Dikirim -> Dicek HSE -> Valid +8 poin (v3.36 kalibrasi; angka dari server OPSI.poin) / Ditolak (+alasan) / Digabung.
 * - Validasi (peran hse, adminhse, pengawas, pimpinan, penuh): Nunggu / Sudah 48 jam / Bot WA (Catatan Kendala WA kategori Jalan, bisa diangkat jadi hazard).
 * Menu tampil hanya kalau pusatPing memuat fungsinya. Tidak menulis ke sheet mana pun selain lewat RPC server di atas.
 * Pemasangan di app.js cuma 3 baris (menu Beranda/Lainnya + notif); klik menu [data-ke="hazard"|"hazardCek"] ditangani file ini sendiri.
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA, Simpan = API.Simpan;
  var VALIDATOR = ['hse', 'adminhse', 'pengawas', 'pimpinan', 'penuh'];
  var JENIS0 = ['Jalan licin', 'Jalan berlubang', 'Longsor / tebing', 'Genangan / banjir', 'Debu tebal', 'Rambu rusak / hilang', 'Unit mogok di jalan', 'Material tumpah', 'Penerangan kurang', 'Lainnya'];
  var IKJ = { 'Jalan licin': '💧', 'Jalan berlubang': '🕳️', 'Longsor / tebing': '⛰️', 'Genangan / banjir': '🌊', 'Debu tebal': '🌫️', 'Rambu rusak / hilang': '🚧', 'Unit mogok di jalan': '🚛', 'Material tumpah': '🪨', 'Penerangan kurang': '🔦', 'Lainnya': '⚠️' };
  var ALASAN = ['Foto tidak jelas', 'Bukan hazard', 'Sudah ditangani', 'Lokasi tidak sesuai', 'Laporan dobel'];
  var MAKS_ANTRE = 4, BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  (function () { var K = window.WHL_KONFIG; if (K && K.RILIS_FITUR) { if (!K.RILIS_FITUR.hazard) K.RILIS_FITUR.hazard = '2026-11-18'; if (!K.RILIS_FITUR.hazardCek) K.RILIS_FITUR.hazardCek = '2026-11-18'; } })(); /* label Baru 7 hari; tanggal di konfig.js menang kalau diisi integrator */

  var CTX = null, AKUN = '', OPSI = null, SAYA = null, ANTRE = [], VAL = null, nTunggu = 0;
  var lapisEl = null, layar = '', tabV = 'tunggu', bukaId = '', tolakId = '', kirimJalan = false, antreJalan = false, notifCari = '', BERKAS = {}, REK = null, GPSW = null, AUDIO = null, sibuk = {};
  var F = formBaru();
  function formBaru() { return { foto: '', jenis: '', ket: '', suara: null, lok: null, lokGalat: '', lokCari: false }; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { return CTX && CTX.sesi(); }
  function punya(fn) { return API.Pusat.asli() && API.Pusat.punya(fn); }
  function boleh(S) { return !!(S || sesi()) && punya('pusatHazardKirim') && !matiAktif(); }
  /* kontrak §umum: {ok:true, aktif:false} = fitur dimatikan admin -> menu DISEMBUNYIKAN (diingat 6 jam per akun; aturFitur(true) dari pusatKegiatanBeranda.fitur.hazard membuka lagi) */
  var MATI = 0, MATI_MS = 6 * 3600000;
  function matiAktif() { return MATI && Date.now() - MATI < MATI_MS; }
  function aturFitur(nyala) { var m = nyala === false ? Date.now() : 0; if (!!m === !!matiAktif()) return; MATI = m; if (AKUN) Simpan.taruh('whlHazardMati_' + AKUN, m ? String(m) : null); if (m && lapisEl) tutup(); else if (CTX && CTX.perbarui) CTX.perbarui(); }
  function bolehValidasi(S) { S = S || sesi(); return !!(S && S.user) && punya('pusatHazardAntre') && VALIDATOR.indexOf(S.user.peran) >= 0 && !(OPSI && OPSI.bolehValidasi === false); }
  function akunDari(S) { return String((S && (S.idProfil || S.idKetik)) || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function panggil(fn, args, ms) { return API.Pusat.panggil(fn, [sesi().tokenPusat].concat(args || []), ms || 30000); }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function jaringan(e) { return /failed to fetch|networkerror|load failed|network|lama menjawab|HTTP 5\d\d|sibuk|offline|abort/i.test(String((e && e.message) || e)); }
  function hariIni() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function waktu(s) {
    if (typeof s === 'number') { var d = new Date(s); s = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) + 'T' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
    var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/); if (!m) return esc(s || '');
    return (m[1] + '-' + m[2] + '-' + m[3] === hariIni() ? 'Hari ini' : (+m[3]) + ' ' + BLN[+m[2] - 1]) + ' ' + m[4] + '.' + m[5];
  }
  function durTeks(d) { d = Math.max(0, Math.round(d)); return Math.floor(d / 60) + ':' + ('0' + d % 60).slice(-2); }
  function jenisL() { return (OPSI && Array.isArray(OPSI.jenis) && OPSI.jenis.length) ? OPSI.jenis : JENIS0; }
  function ik(j) { return IKJ[j] || '⚠️'; }
  function peranTeks(p) { return { driver: 'Driver', pengawas: 'Pengawas', hse: 'HSE', adminhse: 'Admin HSE', pimpinan: 'Pimpinan', penuh: 'Admin', admin: 'Admin', mekanik: 'Mekanik' }[p] || (p ? String(p).charAt(0).toUpperCase() + String(p).slice(1) : ''); }
  function tagSumber(x) {
    if (x.sumber === 'WA') return '<span class="jlTag tw">💬 WA grup</span>';
    return x.peran === 'driver' ? '<span class="jlTag tt">🚛 App · Driver</span>' : '<span class="jlTag tt">🦺 App' + (x.peran ? ' · ' + esc(peranTeks(x.peran)) : '') + '</span>';
  }

  function gaya() {
    if (document.getElementById('hzGaya')) return; var st = document.createElement('style'); st.id = 'hzGaya';
    st.textContent = '.hzLapis .ksnIsi{padding-bottom:44px}'
      + '.hzBesar{display:flex;flex-direction:column;align-items:center;gap:4px;border-radius:22px;padding:22px 14px;text-align:center;background:linear-gradient(150deg,#f2484d,#ff7a33);color:#fff;cursor:pointer;box-shadow:0 10px 26px rgba(242,72,77,.28);-webkit-tap-highlight-color:transparent}'
      + '.hzBesar:active{transform:scale(.985)}.hzBesar .ikB{font-size:44px;line-height:1}.hzBesar b{font-size:19px;margin-top:4px}.hzBesar small{font-size:12.5px;opacity:.92}'
      + '.hzGaleri{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px;margin-top:10px;font-size:14px;cursor:pointer}'
      + '.hzCatat{text-align:center;margin:12px 6px 0;line-height:1.45}.hzKeVal{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border-radius:16px;padding:11px 13px;margin-bottom:12px;background:var(--tint);color:var(--teks);font-weight:700;font-size:14px}.hzKeVal .tx{flex:1}.hzKeVal small{display:block;font-weight:600;color:var(--redup);font-size:12px}.hzKeVal em{font-style:normal;background:#e5484d;color:#fff;font-size:11.5px;font-weight:800;min-width:20px;height:20px;padding:0 6px;border-radius:99px;display:inline-grid;place-items:center}'
      + '.hzAtas{display:flex;gap:10px}.hzFoto{flex:0 0 96px;height:96px;border-radius:14px;overflow:hidden;padding:0;background:var(--panel2)}.hzFoto img{width:100%;height:100%;object-fit:cover;display:block}.hzKanan{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}'
      + '.hzLok{border-radius:12px;background:var(--panel2);padding:7px 10px;font-size:12.5px;line-height:1.35;min-height:44px}.hzLok b{display:block;font-size:13px}.hzLok small{color:var(--redup)}.hzLok.galat{background:rgba(242,72,77,.12);color:var(--tMerah)}.hzLok.galat small{color:inherit}.hzLok button{margin-top:4px;font-size:12px;font-weight:800;color:var(--utama);padding:2px 0;background:none}'
      + '.hzGanti{display:flex;gap:6px}.hzGanti label{flex:1;display:flex;align-items:center;justify-content:center;min-height:36px;font-size:12.5px;cursor:pointer;padding:0 6px}'
      + '.hzLbl{display:block;font-size:12.5px;font-weight:800;margin:14px 2px 7px}.hzLbl em{font-style:normal;font-weight:700;color:var(--redup);font-size:11.5px;margin-left:4px}'
      + '.hzChips{display:flex;flex-wrap:wrap;gap:6px}.hzChip{display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:700;padding:8px 11px;border-radius:99px;background:var(--panel2);color:var(--teks);min-height:38px;border:1.5px solid transparent}.hzChip.on{background:var(--tint);border-color:var(--utama);color:var(--utama)}'
      + 'html[data-tema="gelap"] .hzChip.on{color:var(--tBiru)}'
      + '.hzKet{display:flex;gap:8px;align-items:stretch}.hzKet textarea{flex:1;min-width:0;min-height:58px;resize:vertical;font-size:15px;padding:10px 12px}'
      + '.hzMic{flex:0 0 76px;border-radius:14px;background:rgba(242,72,77,.12);color:var(--tMerah);display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;font-weight:800;gap:2px;line-height:1.15;text-align:center;padding:4px}.hzMic .ikM{font-size:22px}'
      + '.hzMic.rekam{background:#e5484d;color:#fff;animation:hzDenyut 1.2s ease-in-out infinite}.hzMic.rekam b{font-family:Nunito,sans-serif;font-size:16px}@keyframes hzDenyut{50%{box-shadow:0 0 0 6px rgba(229,72,77,.25)}}'
      + '.hzSuara{display:flex;align-items:center;gap:8px;margin-top:8px;border-radius:14px;background:var(--panel2);padding:6px 6px 6px 12px;font-size:13px;font-weight:700}.hzSuara .tx{flex:1}.hzSuara button{min-height:38px;padding:0 12px;border-radius:11px;background:var(--panel);font-weight:800;font-size:13px;color:var(--teks)}.hzSuara button.hps{color:var(--tMerah)}'
      + '.hzGalat{margin-top:10px;border-radius:12px;padding:9px 12px;background:rgba(242,72,77,.12);color:var(--tMerah);font-size:13px;font-weight:700}'
      + '.hzBatal{width:100%;margin-top:10px;min-height:42px}'
      + '.hzBrs{display:flex;align-items:flex-start;gap:10px;padding:11px 2px;width:100%;text-align:left;background:none;color:var(--teks)}.hzBrs+.hzBrs{border-top:1px solid var(--garis)}.hzBrs .hzIk{width:38px;height:38px;border-radius:12px;background:var(--panel2);display:grid;place-items:center;font-size:20px;flex:none}'
      + '.hzBrs .tx{flex:1;min-width:0}.hzBrs .tx b{display:block;font-size:14px}.hzBrs .tx small{display:block;font-size:12px;color:var(--redup);overflow:hidden;text-overflow:ellipsis}.hzBrs .tx .hzAlasan{color:var(--tMerah);font-weight:700;white-space:normal}.hzPoin{font-family:Nunito,sans-serif;font-weight:900;font-size:16px;color:#16a34a;flex:none}'
      + '.hzAlur{display:flex;gap:4px;margin-top:6px}.hzAlur span{flex:1;font-size:10.5px;font-weight:800;text-align:center;padding:5px 2px;border-radius:8px;background:var(--panel2);color:var(--redup);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hzAlur span.on{background:rgba(22,163,74,.14);color:#15803d}.hzAlur span.kini{background:rgba(255,197,48,.22);color:var(--tKuning)}.hzAlur span.no{background:rgba(242,72,77,.13);color:var(--tMerah)}'
      + 'html[data-tema="gelap"] .hzAlur span.on{color:#5fe39a}'
      + '.hzSt{display:inline-block;font-style:normal;font-size:11px;font-weight:800;padding:3px 8px;border-radius:99px;background:var(--panel2);color:var(--redup);margin-top:5px}.hzSt.kuning{background:rgba(255,197,48,.22);color:var(--tKuning)}.hzSt.hijau{background:rgba(22,163,74,.14);color:#15803d}.hzSt.merah{background:rgba(242,72,77,.13);color:var(--tMerah)}.hzSt.biru{background:var(--tint);color:var(--utama)}'
      + 'html[data-tema="gelap"] .hzSt.hijau{color:#5fe39a}'
      + '.hzKecilT{min-height:34px;padding:0 12px;font-size:12.5px;margin-top:7px}'
      + '.hzSeg{grid-template-columns:repeat(3,1fr)!important}.hzSeg button{font-size:13px;gap:5px}.hzSeg button i{font-style:normal;font-size:11px;font-weight:800;background:#e5484d;color:#fff;border-radius:99px;min-width:18px;height:18px;padding:0 5px;display:inline-grid;place-items:center}'
      + '.hzVk .hzVf{margin:-4px -4px 10px;border-radius:14px;overflow:hidden;background:var(--panel2);aspect-ratio:4/3;display:grid;place-items:center;color:var(--redup);font-size:12.5px}.hzVk .hzVf img{width:100%;height:100%;object-fit:cover;display:block}'
      + '.hzVk .hzVj{font-size:15.5px;display:block}.hzVk .kecil{margin-top:3px}.hzVk .hzKetV{margin-top:8px;border-radius:12px;background:var(--panel2);padding:8px 11px;font-size:13.5px;line-height:1.4}'
      + '.hzAksiBaris{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.hzAksiBaris button{min-height:38px;padding:0 12px;border-radius:12px;background:var(--panel2);font-weight:800;font-size:12.5px;color:var(--teks)}'
      + '.hzMirip{margin-top:9px;border-radius:12px;padding:8px 11px;background:rgba(255,197,48,.18);color:var(--tKuning);font-size:12.5px;font-weight:700;line-height:1.4}'
      + '.hzDua{display:grid;grid-template-columns:1fr 1.4fr;gap:8px;margin-top:12px}.hzDua button{min-height:48px;border-radius:14px;font-weight:800;font-size:15px}.hzDua .no{background:rgba(242,72,77,.12);color:var(--tMerah)}.hzDua .ok{background:#16a34a;color:#fff}.hzDua button:disabled{opacity:.55}'
      + '.hzTolak{margin-top:12px;border-top:1px solid var(--garis);padding-top:10px}.hzTolak .isian{font-size:15px;padding:10px 12px}'
      + '.hzWa .hzWaT{font-size:13.5px;line-height:1.4;margin-top:6px}.hzWaAksi{display:flex;gap:8px;margin-top:10px}.hzWaAksi select{flex:1;min-width:0;font-size:14px;padding:9px 10px}.hzWaAksi button{flex:none;min-height:44px;padding:0 12px;font-size:13px}'
      + '.hzLihat{position:fixed;inset:0;z-index:99;background:rgba(0,0,0,.92);display:grid;place-items:center;padding:16px}.hzLihat img{max-width:100%;max-height:100%;border-radius:10px}.hzLihat span{position:absolute;top:calc(14px + env(safe-area-inset-top));right:16px;color:#fff;font-size:15px;font-weight:800;background:rgba(255,255,255,.18);padding:8px 14px;border-radius:99px}'
      + '.jlTag{display:inline-block;font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:6px;margin:4px 4px 0 0;background:var(--panel2);color:var(--redup)}.jlTag.tg{background:rgba(32,195,180,.15);color:#0b8a80}.jlTag.tp{background:rgba(255,197,48,.2);color:var(--tKuning)}.jlTag.tw{background:rgba(22,163,74,.14);color:#15803d}.jlTag.tt{background:var(--tint);color:var(--utama)}.jlTag.td{background:rgba(122,92,240,.15);color:#6d4fe0}'
      + 'html[data-tema="gelap"] .jlTag.tg{color:#5fe0d2}html[data-tema="gelap"] .jlTag.tw{color:#5fe39a}html[data-tema="gelap"] .jlTag.tt{color:var(--tBiru)}html[data-tema="gelap"] .jlTag.td{color:#b9a8ff}';
    document.head.appendChild(st);
  }

  /* ---------- pasang (dipanggil app.js tiap menu digambar) ---------- */
  function pasang(ctx) {
    CTX = ctx || CTX; var a = akunDari(sesi());
    if (a === AKUN) return;
    AKUN = a; OPSI = null; SAYA = null; VAL = null; nTunggu = 0; ANTRE = []; BERKAS = {}; F = formBaru(); MATI = 0;
    if (!a) return;
    Simpan.ambil('whlHazardMati_' + a).then(function (v) { if (AKUN === a && Number(v) && Date.now() - Number(v) < MATI_MS) { MATI = Number(v); if (CTX && CTX.perbarui) CTX.perbarui(); } });
    Simpan.ambil('whlHazardAntre_' + a).then(function (v) { if (AKUN !== a) return; try { var L = JSON.parse(v || '[]'); ANTRE = Array.isArray(L) ? L : []; } catch (e) { ANTRE = []; } if (ANTRE.length) setTimeout(kirimAntrean, 6000); });
  }
  function simpanAntre() { if (AKUN) Simpan.taruh('whlHazardAntre_' + AKUN, ANTRE.length ? JSON.stringify(ANTRE) : null); }
  function jumlahTunggu() { return nTunggu; }

  /* ---------- lapis ---------- */
  function lapis(judul, sub, isi) {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      gaya(); lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis hzLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik); lapisEl.addEventListener('change', ganti); lapisEl.addEventListener('input', ketik);
    }
    var g = lapisEl.querySelector('.ksnIsi'), y = g ? g.scrollTop : 0, sama = lapisEl.getAttribute('data-j') === judul;
    lapisEl.setAttribute('data-j', judul);
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-h="tutup" aria-label="Kembali">‹</button><div class="nm">' + esc(sub) + '<b>' + esc(judul) + '</b></div></div><div class="ksnIsi">' + isi + '</div>';
    if (sama) { var g2 = lapisEl.querySelector('.ksnIsi'); if (g2) g2.scrollTop = y; }
    isiFoto();
  }
  function tutup() {
    hentiRekam(false); hentiGps(); hentiAudio();
    if (!lapisEl) return false; var d = lapisEl; lapisEl = null; layar = ''; tolakId = ''; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200);
    if (CTX && CTX.perbarui) CTX.perbarui(); return true;
  }
  function gagalHtml(pesan) { return '<div class="kartu kosongKm">' + (window.WHL_IKON ? window.WHL_IKON('alarm', 'besar') : '') + '<b>Belum bisa dimuat</b><small>' + esc(pesan) + '</small><button type="button" class="tKecil" data-h="ulang" style="margin-top:10px">Coba lagi</button></div>'; }

  function buka(ctx, jenis) {
    pasang(ctx); gaya();
    if (jenis === 'val' && bolehValidasi()) return bukaVal();
    return bukaLapor();
  }

  /* ================= LAPOR ================= */
  function bukaLapor() {
    layar = 'lapor'; gambarLapor(); mulaiGps();
    if (!OPSI) panggil('pusatHazardOpsi', []).then(function (h) {
      if (h && h.login === false) { tutup(); if (CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (h && h.ok !== false) { OPSI = h; if (h.aktif === false) { aturFitur(false); return; } if (layar === 'lapor') gambarLapor(); if (CTX && CTX.perbarui && h.bolehValidasi === false) CTX.perbarui(); }
    }, function () { /* jalan terus dengan daftar jenis bawaan */ });
    muatSaya(); kirimAntrean();
  }
  function muatSaya() {
    return panggil('pusatHazardSaya', []).then(function (h) {
      if (h && h.login === false) return;
      if (h && h.ok !== false) { SAYA = h; if (h.aktif === false) { OPSI = { aktif: false, pesan: h.pesan }; aturFitur(false); } }
      else if (!SAYA) SAYA = { galat: (h && h.pesan) || 'Daftar laporan belum bisa dimuat.' };
      if (layar === 'lapor') { if (OPSI && OPSI.aktif === false) gambarLapor(); else gambarSaya(); }
    }, function (e) { if (!SAYA) SAYA = { galat: e.message }; if (layar === 'lapor') gambarSaya(); });
  }
  function gambarLapor() {
    if (OPSI && OPSI.aktif === false) { hentiGps(); roti(OPSI.pesan || 'Lapor hazard sedang ditutup.'); aturFitur(false); return; }
    var h = '';
    if (bolehValidasi()) h += '<button type="button" class="hzKeVal" data-h="keVal">🦺<span class="tx">Validasi hazard<small>Cek laporan driver & grup WA</small></span>' + (nTunggu ? '<em>' + (nTunggu > 9 ? '9+' : nTunggu) + '</em>' : '') + '<span>›</span></button>';
    if (!F.foto) {
      h += '<label class="hzBesar"><span class="ikB">📷</span><b>Foto bahaya sekarang</b><small>kamera langsung terbuka · lokasi otomatis</small><input type="file" accept="image/*" capture="environment" data-hf="foto" hidden></label>'
        + '<label class="tKecil hzGaleri">🖼️ Pilih foto dari galeri<input type="file" accept="image/*" data-hf="foto" hidden></label>'
        + '<div class="kecil hzCatat" id="hzLokAwal">' + lokRingkas() + '</div>';
    } else {
      h += '<div class="kartu hzForm"><div class="hzAtas"><button type="button" class="hzFoto" data-h="lihatFoto" aria-label="Lihat foto besar"><img src="' + F.foto + '" alt="Foto hazard"></button><div class="hzKanan"><div id="hzLok">' + lokHtml() + '</div>'
        + '<div class="hzGanti"><label class="tKecil">📷 Ulang<input type="file" accept="image/*" capture="environment" data-hf="foto" hidden></label><label class="tKecil">🖼️ Galeri<input type="file" accept="image/*" data-hf="foto" hidden></label></div></div></div>'
        + '<span class="hzLbl">Jenis bahaya <em>pilih satu</em></span><div class="hzChips" role="radiogroup" aria-label="Jenis bahaya">' + jenisL().map(function (j) { return '<button type="button" class="hzChip' + (F.jenis === j ? ' on' : '') + '" role="radio" aria-checked="' + (F.jenis === j) + '" data-h="jenis" data-j="' + esc(j) + '">' + ik(j) + ' ' + esc(j) + '</button>'; }).join('') + '</div>'
        + '<span class="hzLbl">Keterangan <em>ketik ATAU rekam suara</em></span><div class="hzKet"><textarea class="isian" id="hzKet" rows="2" maxlength="' + ((OPSI && OPSI.ketMaks) || 500) + '" placeholder="Ketik singkat… mis. tanjakan KM 14 licin">' + esc(F.ket) + '</textarea>' + micHtml() + '</div><div id="hzSuaraSlot">' + suaraHtml() + '</div>'
        + '<div id="hzGalat"></div><button type="button" class="tUtama hzKirim" data-h="kirim"' + (kirimJalan ? ' disabled' : '') + '>' + (kirimJalan ? 'Mengirim…' : 'Kirim laporan') + '</button>'
        + '<button type="button" class="tKecil hzBatal" data-h="batalForm">Batal</button></div>';
    }
    h += '<div class="kecil hzCatat">Poin +' + ((OPSI && OPSI.poin) || 8) + ' cuma kalau divalidasi HSE / pengawas (maks ' + ((OPSI && OPSI.maksPoinHari) || 1) + ' laporan berpoin per hari). Tidak melapor = tidak apa-apa.</div>'
      + '<h2 class="bagW">Laporan saya</h2><div id="hzSaya">' + sayaHtml() + '</div>';
    lapis('Lapor hazard', 'Keselamatan bersama', h);
  }
  function lokRingkas() { return F.lok ? '📍 Lokasi siap (±' + Math.round(F.lok.ak) + ' m)' : F.lokGalat ? '📍 ' + esc(F.lokGalat) : '📍 Mencari lokasi GPS…'; }
  function lokHtml() {
    if (F.lok) return '<div class="hzLok"><b>📍 Lokasi didapat</b><small>' + F.lok.lat.toFixed(5) + ', ' + F.lok.lng.toFixed(5) + ' · ±' + Math.round(F.lok.ak) + ' m</small></div>';
    if (F.lokGalat) return '<div class="hzLok galat"><b>📍 Lokasi belum ada</b><small>' + esc(F.lokGalat) + '</small><button type="button" data-h="gps">Coba lagi</button></div>';
    return '<div class="hzLok"><b>📍 Mencari lokasi GPS…</b><small>Tetap di tempat sebentar</small></div>';
  }
  function gambarLok() {
    if (!lapisEl || layar !== 'lapor') return; var a = lapisEl.querySelector('#hzLok'), b = lapisEl.querySelector('#hzLokAwal');
    if (a) a.innerHTML = lokHtml(); if (b) b.innerHTML = lokRingkas();
  }
  function micHtml() {
    if (REK) return '<button type="button" class="hzMic rekam" data-h="stopRekam" aria-label="Berhenti merekam"><b id="hzDetik">' + durTeks((Date.now() - REK.t0) / 1000) + '</b>Ketuk untuk berhenti</button>';
    return '<button type="button" class="hzMic" data-h="rekam" aria-label="Rekam suara"><span class="ikM">🎙</span>' + (F.suara ? 'Rekam ulang' : 'Rekam suara') + '</button>';
  }
  function suaraHtml() { return F.suara && !REK ? '<div class="hzSuara"><span class="tx">🎙 Pesan suara ' + durTeks(F.suara.dur) + '</span><button type="button" data-h="putarSaya">▶ Putar</button><button type="button" class="hps" data-h="hapusSuara" aria-label="Hapus rekaman">✕</button></div>' : ''; }
  function gambarSuara() {
    if (!lapisEl || layar !== 'lapor') return; var m = lapisEl.querySelector('.hzMic'), s = lapisEl.querySelector('#hzSuaraSlot');
    if (m) m.outerHTML = micHtml(); if (s) s.innerHTML = suaraHtml();
  }
  function galatForm(t) { var g = lapisEl && lapisEl.querySelector('#hzGalat'); if (g) { g.innerHTML = '<div class="hzGalat" role="alert">' + esc(t) + '</div>'; g.scrollIntoView({ block: 'center', behavior: 'smooth' }); } else roti(t); R.getar('gagal'); }

  /* ---------- Laporan saya ---------- */
  var ST = { DIKIRIM: 0, DICEK: 1, VALID: 2, DITOLAK: 2, DIGABUNG: 2 };
  function alurHtml(x) {
    var s = x.status, i = ST[s] == null ? 0 : ST[s];
    var akhir = s === 'VALID' ? '<span class="on">Valid' + (x.poin ? ' +' + x.poin + ' poin' : '') + '</span>' : s === 'DITOLAK' ? '<span class="no">Ditolak</span>' : s === 'DIGABUNG' ? '<span class="on">Digabung</span>' : '<span>Valid / Ditolak</span>';
    return '<div class="hzAlur"><span class="on">Dikirim</span><span class="' + (i >= 1 || s === 'VALID' || s === 'DITOLAK' ? 'on' : 'kini') + '">Dicek HSE</span>' + akhir.replace('<span>', i === 1 ? '<span class="kini">' : '<span>') + '</div>';
  }
  function sayaHtml() {
    var h = '';
    if (ANTRE.length) h += '<div class="kartu" style="margin-bottom:10px">' + ANTRE.map(function (a, i) {
      return '<div class="hzBrs"><span class="hzIk">' + ik(a.d.jenis) + '</span><div class="tx"><b>' + esc(a.d.jenis) + '</b><small>' + waktu(a.t) + (a.d.keterangan ? ' · ' + esc(a.d.keterangan.slice(0, 60)) : a.d.suara ? ' · pesan suara' : '') + '</small>'
        + (a.galat ? '<small class="hzAlasan">Ditolak server: ' + esc(a.galat) + '</small><button type="button" class="tKecil hzKecilT" data-h="hapusAntre:' + i + '">Hapus</button>' : '<em class="hzSt kuning">⏳ Menunggu sinyal — dikirim otomatis</em> <button type="button" class="tKecil hzKecilT" data-h="kirimAntre">Kirim sekarang</button>') + '</div></div>';
    }).join('') + '</div>';
    if (!SAYA) return h + (R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>');
    if (SAYA.galat) return h + '<div class="kartu"><div class="kecil">' + esc(SAYA.galat) + '</div><button type="button" class="tKecil hzKecilT" data-h="ulangSaya">Coba lagi</button></div>';
    var L = Array.isArray(SAYA.daftar) ? SAYA.daftar : [];
    if (!L.length) return h + (ANTRE.length ? '' : '<div class="kartu"><div class="kecil" style="text-align:center;padding:6px">Belum ada laporan. Lihat bahaya di jalan? Foto & laporkan.</div></div>');
    return h + eksporHtml('saya') + (SAYA.maksPoinHari ?'<div class="kecil" style="margin:0 4px 8px">Laporan berpoin hari ini: ' + (SAYA.poinHariIni || 0) + ' / ' + SAYA.maksPoinHari + '</div>' : '')
      + '<div class="kartu">' + L.map(function (x) {
        return '<div class="hzBrs"><span class="hzIk">' + ik(x.jenis) + '</span><div class="tx"><b>' + esc(x.jenis) + '</b><small>' + waktu(x.waktu) + (x.keterangan ? ' · ' + esc(String(x.keterangan).slice(0, 70)) : x.adaSuara ? ' · pesan suara' : '') + '</small>'
          + alurHtml(x)
          + (x.status === 'DITOLAK' && x.alasan ? '<small class="hzAlasan">Alasan: ' + esc(x.alasan) + (x.dicekOleh ? ' (' + esc(x.dicekOleh) + ')' : '') + '</small>' : '')
          + (x.status === 'DIGABUNG' ? '<small>Bahaya ini sudah dilaporkan orang lain lebih dulu — laporanmu digabung (tanpa poin). Terima kasih!</small>' : '')
          + (x.status === 'VALID' && x.dicekOleh ? '<small>Divalidasi ' + esc(x.dicekOleh) + (x.waktuCek ? ' · ' + waktu(x.waktuCek) : '') + '</small>' : '')
          + '</div>' + (x.poin ? '<span class="hzPoin">+' + x.poin + '</span>' : '') + '</div>';
      }).join('') + '</div>';
  }
  function gambarSaya() { var el = lapisEl && layar === 'lapor' && lapisEl.querySelector('#hzSaya'); if (el) el.innerHTML = sayaHtml(); }

  /* ---------- GPS ---------- */
  function mulaiGps() {
    hentiGps(); F.lokGalat = '';
    if (!navigator.geolocation) { F.lokGalat = 'HP ini tidak memberi lokasi GPS.'; gambarLok(); return; }
    F.lokCari = true; gambarLok();
    try {
      GPSW = navigator.geolocation.watchPosition(function (p) {
        var ak = p.coords.accuracy || 9999, b = { lat: p.coords.latitude, lng: p.coords.longitude, ak: ak, t: Date.now() };
        if (!F.lok || ak <= F.lok.ak + 5 || Date.now() - F.lok.t > 60000) F.lok = b; F.lokCari = false; F.lokGalat = ''; gambarLok();
      }, function (e) {
        F.lokCari = false; if (F.lok) return;
        F.lokGalat = e && e.code === 1 ? 'Izin lokasi ditolak. Izinkan lokasi untuk WHL App di pengaturan HP.' : 'GPS belum dapat sinyal. Nyalakan lokasi (GPS), lalu Coba lagi.'; gambarLok();
      }, { enableHighAccuracy: true, maximumAge: 20000, timeout: 25000 });
    } catch (e) { F.lokGalat = 'Lokasi tidak bisa dibaca.'; gambarLok(); }
  }
  function hentiGps() { if (GPSW != null) { try { navigator.geolocation.clearWatch(GPSW); } catch (e) { /* */ } GPSW = null; } }

  /* ---------- foto ---------- */
  function kecilkan(file) {
    return new Promise(function (ok, gagal) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, s0 = Math.min(1, 1600 / Math.max(w, h));
        var coba = function (sk, q) {
          var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * sk)); c.height = Math.max(1, Math.round(h * sk));
          var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
          var u = c.toDataURL('image/jpeg', q), n = Math.round((u.length - 23) * 0.75);
          if (n <= 700 * 1024 || sk < 0.3) { URL.revokeObjectURL(url); ok(u); } else if (q > 0.55) coba(sk, q - 0.1); else coba(sk * 0.8, 0.72);
        };
        coba(s0, 0.8);
      };
      img.onerror = function () { URL.revokeObjectURL(url); gagal(new Error('Foto tidak bisa dibaca. Coba ambil ulang.')); };
      img.src = url;
    });
  }

  /* ---------- rekam suara (pola pesan suara forum, maks 60 dtk, 24 kbps) ---------- */
  function pilihMime() { var L = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/aac']; for (var i = 0; i < L.length; i++) { try { if (window.MediaRecorder && MediaRecorder.isTypeSupported(L[i])) return L[i]; } catch (e) { /* */ } } return ''; }
  function mulaiRekam() {
    if (REK) return; hentiAudio();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { galatForm('HP ini belum bisa merekam suara. Ketik keterangan saja.'); return; }
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function (stream) {
      if (layar !== 'lapor') { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      var mime = pilihMime(), rec;
      try { rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 }); } catch (e) { rec = new MediaRecorder(stream); }
      var maks = (OPSI && OPSI.suaraMaksDetik) || 60, rk = REK = { stream: stream, rec: rec, potong: [], t0: Date.now(), mime: rec.mimeType || mime || 'audio/webm' };
      rec.ondataavailable = function (e) { if (e.data && e.data.size) rk.potong.push(e.data); };
      rk.tik = setInterval(function () { if (REK !== rk) return; var dt = (Date.now() - rk.t0) / 1000, el = lapisEl && lapisEl.querySelector('#hzDetik'); if (el) el.textContent = durTeks(dt); if (dt >= maks) hentiRekam(true); }, 250);
      rec.start(250); R.getar('sedang'); gambarSuara();
    }, function () { galatForm('Mikrofon belum diizinkan. Izinkan mikrofon untuk WHL App di pengaturan HP, atau ketik keterangan.'); });
  }
  function hentiRekam(simpan) {
    if (!REK) return; var r = REK; REK = null; clearInterval(r.tik);
    var selesai = function () {
      r.stream.getTracks().forEach(function (t) { t.stop(); });
      if (!simpan) { gambarSuara(); return; }
      var dur = Math.min((OPSI && OPSI.suaraMaksDetik) || 60, (Date.now() - r.t0) / 1000);
      if (dur < 1) { roti('Rekaman terlalu pendek.'); gambarSuara(); return; }
      var blob = new Blob(r.potong, { type: String(r.mime).split(';')[0] }), maksB = ((OPSI && OPSI.suaraMaksKb) || 1536) * 1024;
      if (blob.size > maksB) { galatForm('Rekaman terlalu besar. Rekam lebih singkat.'); gambarSuara(); return; }
      var fr = new FileReader(); fr.onload = function () { F.suara = { data: String(fr.result).replace(/^data:([^;,]+);[^,]*?base64,/, 'data:$1;base64,'), dur: Math.round(dur) }; R.getar(); gambarSuara(); };
      fr.onerror = function () { galatForm('Rekaman gagal dibaca. Ulangi.'); gambarSuara(); }; fr.readAsDataURL(blob);
    };
    r.rec.onstop = selesai; try { if (r.rec.state !== 'inactive') r.rec.stop(); else selesai(); } catch (e) { selesai(); }
  }
  function hentiAudio() { if (AUDIO) { try { AUDIO.a.pause(); } catch (e) { /* */ } AUDIO = null; } }
  function putar(src, kunci, tombol) {
    if (AUDIO && AUDIO.k === kunci) { hentiAudio(); if (tombol) tombol.textContent = tombol.getAttribute('data-l') || '▶ Putar'; return; }
    hentiAudio(); var a = new Audio(src); AUDIO = { a: a, k: kunci };
    if (tombol) { if (!tombol.getAttribute('data-l')) tombol.setAttribute('data-l', tombol.textContent); tombol.textContent = '■ Stop'; }
    a.onended = function () { if (AUDIO && AUDIO.a === a) AUDIO = null; if (tombol) tombol.textContent = tombol.getAttribute('data-l'); };
    a.play().catch(function () { roti('Suara tidak bisa diputar di HP ini.'); if (tombol) tombol.textContent = tombol.getAttribute('data-l'); });
  }

  /* ---------- kirim + antrean ---------- */
  function cidBaru() { return 'hz-' + AKUN + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function kirim() {
    if (kirimJalan) return; var ket = String(F.ket || '').trim();
    if (!F.foto) return galatForm('Ambil foto dulu.');
    if (!F.jenis) return galatForm('Pilih jenis bahaya.');
    if (!F.lok) return galatForm(F.lokGalat || 'Lokasi GPS belum didapat. Tunggu sebentar di tempat terbuka.');
    if (REK) return galatForm('Hentikan rekaman suara dulu.');
    if (!ket && !F.suara) return galatForm('Isi keterangan (ketik) atau rekam suara.');
    var d = { jenis: F.jenis, keterangan: ket.slice(0, (OPSI && OPSI.ketMaks) || 500), foto: F.foto, suara: F.suara ? F.suara.data : '', lat: F.lok.lat, lng: F.lok.lng, akurasi: Math.round(F.lok.ak), cid: cidBaru() };
    kirimJalan = true; gambarLapor(); R.getar();
    panggil('pusatHazardKirim', [d], 90000).then(function (h) {
      kirimJalan = false;
      if (h && h.login === false) { simpanKeAntre(d); tutup(); if (CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (h && h.aktif === false) { aturFitur(false); roti(h.pesan || 'Lapor hazard sedang ditutup.'); return; }
      if (!h || h.ok === false) { gambarLapor(); galatForm((h && h.pesan) || 'Laporan ditolak server.'); return; }
      selesaiKirim(h);
    }, function (e) {
      kirimJalan = false;
      if (jaringan(e)) { simpanKeAntre(d); F = formBaru(); hentiGps(); roti('Sinyal lemah. Laporan disimpan di HP & dikirim otomatis saat ada sinyal.'); if (layar === 'lapor') { gambarLapor(); mulaiGps(); } return; }
      gambarLapor(); galatForm(e.message || 'Gagal mengirim.');
    });
  }
  function selesaiKirim(h) {
    F = formBaru(); R.bunyi('sukses'); R.getar('sukses');
    roti(h.pesan || 'Laporan terkirim. Terima kasih!');
    if (layar === 'lapor') { gambarLapor(); mulaiGps(); }
    muatSaya();
  }
  function simpanKeAntre(d) {
    if (ANTRE.some(function (a) { return a.d.cid === d.cid; })) return;
    ANTRE.push({ d: d, t: Date.now() }); while (ANTRE.length > MAKS_ANTRE) ANTRE.shift(); simpanAntre();
  }
  function kirimAntrean() {
    if (antreJalan || !ANTRE.length || !sesi() || !sesi().tokenPusat || !punya('pusatHazardKirim')) return;
    if (navigator.onLine === false) return;
    antreJalan = true;
    var a = ANTRE.filter(function (x) { return !x.galat; })[0]; if (!a) { antreJalan = false; return; }
    panggil('pusatHazardKirim', [a.d], 90000).then(function (h) {
      antreJalan = false;
      if (h && h.login === false) return;
      if (h && h.ok !== false && h.aktif !== false) { ANTRE = ANTRE.filter(function (x) { return x !== a; }); simpanAntre(); roti(h.dobel ? 'Laporan hazard tertunda sudah tercatat.' : 'Laporan hazard tertunda terkirim.'); muatSaya(); setTimeout(kirimAntrean, 800); }
      else { a.galat = (h && h.pesan) || 'Ditolak server.'; simpanAntre(); gambarSaya(); setTimeout(kirimAntrean, 800); }
    }, function () { antreJalan = false; gambarSaya(); });
  }

  /* ================= VALIDASI (HSE / pengawas) ================= */
  function bukaVal(idSorot) {
    layar = 'val'; hentiGps(); if (idSorot) bukaId = idSorot;
    lapis('Validasi hazard', 'HSE / pengawas', VAL ? valHtml() : (R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>'));
    muatVal();
  }
  function muatVal() {
    return panggil('pusatHazardAntre', []).then(function (h) {
      if (layar !== 'val') return;
      if (h && h.login === false) { tutup(); if (CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (h && h.aktif === false) { aturFitur(false); return; }
      if (!h || h.ok === false) { if (h && h.tolak) { OPSI = Object.assign({}, OPSI || {}, { bolehValidasi: false }); if (CTX.perbarui) CTX.perbarui(); } lapis('Validasi hazard', 'HSE / pengawas', gagalHtml((h && h.pesan) || 'Antrean belum bisa dimuat.')); return; }
      VAL = h; nTunggu = (h.menunggu || []).length;
      if (notifCari) { var nc = notifCari; notifCari = ''; if (!cariVal(nc)) { bukaId = ''; bukaLapor(); return; } } /* notif "laporanmu valid/ditolak" untuk validator yang juga pelapor */
      var M = h.menunggu || [];
      if (!bukaId && tabV === 'tunggu' && M.length) bukaId = M[0].id;
      if (bukaId && tabV !== 'wa') { var ada = M.concat(h.terbaru || []).filter(function (x) { return x.id === bukaId; })[0]; if (ada) { tabV = M.indexOf(ada) >= 0 ? 'tunggu' : 'sudah'; tandaiCek(ada); } }
      gambarVal();
    }, function (e) { if (layar === 'val' && !VAL) lapis('Validasi hazard', 'HSE / pengawas', gagalHtml(e.message)); else if (layar === 'val') roti(e.message); });
  }
  function tandaiCek(x) {
    if (!x || x.status !== 'DIKIRIM' || x.milikSaya || sibuk['cek' + x.id]) return; sibuk['cek' + x.id] = 1;
    panggil('pusatHazardPutus', [x.id, 'DICEK', '']).then(function (h) { if (h && h.ok !== false) { x.status = 'DICEK'; if (layar === 'val') gambarVal(); } }, function () { delete sibuk['cek' + x.id]; });
  }
  function gambarVal() { if (layar === 'val') lapis('Validasi hazard', 'HSE / pengawas · ' + (VAL ? (VAL.menunggu || []).length + ' nunggu dicek' : ''), valHtml()); }
  function valHtml() {
    var V = VAL || {}, M = V.menunggu || [], S = V.terbaru || [], W = V.wa || [];
    var h = '<div class="segmen hzSeg" role="tablist">' + [['tunggu', 'Nunggu', M.length], ['sudah', 'Sudah', 0], ['wa', 'Bot WA', W.length]].map(function (t) { return '<button type="button" role="tab" aria-selected="' + (tabV === t[0]) + '" data-h="tab:' + t[0] + '" class="' + (tabV === t[0] ? 'on' : '') + '">' + t[1] + (t[2] ? ' <i>' + (t[2] > 99 ? '99+' : t[2]) + '</i>' : '') + '</button>'; }).join('') + '</div>';
    if (tabV === 'wa') {
      h += '<div class="kecil" style="margin:0 4px 10px;line-height:1.45">Catatan grup WA (kategori Jalan, 48 jam) yang ditarik bot. <b>Angkat</b> = langsung tampil di Kondisi jalan sebagai hazard valid (tanpa poin, pelapor WA tidak punya akun app).</div>';
      h += W.length ? W.map(function (w) {
        return '<div class="kartu hzWa" style="margin-bottom:10px"><b>💬 ' + esc(w.grup || 'Grup WA') + '</b><div class="kecil">' + esc(w.pelapor || '-') + (w.unit ? ' · ' + esc(w.unit) : '') + ' · ' + waktu((w.tgl || '') + 'T' + (w.jam || '00:00')) + '</div><div class="hzWaT">' + esc(w.ringkas || '') + '</div>'
          + '<div class="hzWaAksi"><select class="isian" data-wa="' + esc(w.idKendala) + '" aria-label="Jenis bahaya">' + jenisL().map(function (j) { return '<option' + (tebakJenis(w.ringkas) === j ? ' selected' : '') + '>' + esc(j) + '</option>'; }).join('') + '</select><button type="button" class="tKecil" data-h="angkat:' + esc(w.idKendala) + '"' + (sibuk['wa' + w.idKendala] ? ' disabled' : '') + '>' + (sibuk['wa' + w.idKendala] ? 'Mengangkat…' : 'Angkat') + '</button></div></div>';
      }).join('') : '<div class="kartu"><div class="kecil" style="text-align:center;padding:6px">Tidak ada catatan WA kategori Jalan 48 jam terakhir.</div></div>';
      return h + '<button type="button" class="tKecil hzBatal" data-h="segarVal">↻ Segarkan</button>';
    }
    var L = tabV === 'tunggu' ? M : S;
    if (!L.length) h += '<div class="kartu"><div class="kecil" style="text-align:center;padding:8px">' + (tabV === 'tunggu' ? 'Semua laporan sudah dicek. 👍' : 'Belum ada yang diputus 48 jam terakhir.') + '</div></div>';
    else h += L.map(function (x) { return x.id === bukaId ? kartuVal(x) : barisVal(x); }).join('');
    return h + '<button type="button" class="tKecil hzBatal" data-h="segarVal">↻ Segarkan</button>' + eksporHtml('val'); /* v3.31 rekap Excel/PDF */
  }
  /* ---------- v3.31 EKSPOR rekap laporan hazard: Excel dibuat di HP dari daftar yang sudah dimuat; PDF dari server kalau ada ---------- */
  /* kontrak Upgrade\katalog-lengkap-17nov\pdf\KONTRAK-APP.md: pusatHazardRekap / pusatHazardRekapPdf (token, {dari?, sampai?, status?, jenis?}); kosong = 7 hari terakhir */
  var FN_PDF = 'pusatHazardRekapPdf', FN_REKAP = 'pusatHazardRekap';
  function srvPunya(fn) { var X = API.Pusat; return !!(X.dikenal && X.dikenal() && X.punya(fn)); }
  function bolehPdf() { return srvPunya(FN_PDF); }
  function eksporHtml(dari) {
    if (!window.WHL_EKSPOR) return '';
    return '<div class="hzEks" style="display:flex;gap:8px;margin:10px 0 4px"><button type="button" class="tKecil" style="flex:1" data-h="excel:' + dari + '">📊 Excel</button>' + (dari === 'val' && bolehPdf() ? '<button type="button" class="tKecil" style="flex:1" data-h="pdf">📄 PDF</button>' : '') + '</div>';
  }
  var ST_TEKS = { DIKIRIM: 'Dikirim', DICEK: 'Dicek HSE', VALID: 'Valid', DITOLAK: 'Ditolak', DIGABUNG: 'Digabung' };
  function barisX(x) {
    var peta = x.lat != null && x.lng != null ? { url: 'https:' + '/' + '/maps.google.com/?q=' + x.lat + ',' + x.lng, teks: 'Peta' } : '';
    return [x.id || '', String(x.waktu || '').replace('T', ' ').slice(0, 16), x.jenis || '', x.nama || '', peranTeks(x.peran || ''), x.sumber || '', x.keterangan || (x.adaSuara ? '(pesan suara)' : ''), ST_TEKS[x.status] || x.status || '', x.dicekOleh || '', String(x.waktuCek || '').replace('T', ' ').slice(0, 16), x.alasan || '', Number(x.poin) || 0, x.lat != null ? Number(x.lat) : '', x.lng != null ? Number(x.lng) : '', peta, (x.pelaporGabung || []).length || ''];
  }
  var KEPALA_X = ['ID', 'Waktu', 'Jenis', 'Pelapor', 'Peran', 'Sumber', 'Keterangan', 'Status', 'Dicek oleh', 'Waktu cek', 'Alasan tolak', 'Poin', 'Lat', 'Lng', 'Lokasi', 'Pelapor digabung'];
  function excel(dari) {
    if (!window.WHL_EKSPOR) return; var t = window.WHL_EKSPOR.tgl();
    if (dari === 'saya') { var L = (SAYA && SAYA.daftar) || []; window.WHL_EKSPOR.excel('Laporan Hazard Saya - ' + t, [['Laporan saya', [KEPALA_X].concat(L.map(barisX))]], roti); return; }
    if (srvPunya(FN_REKAP)) { window.WHL_EKSPOR.excelServer(panggil(FN_REKAP, [{}], 120000), 'Rekap Hazard WHL - ' + t, roti, 'Rekap hazard'); return; } /* 7 hari terakhir, semua status */
    var V = VAL || {};
    window.WHL_EKSPOR.excel('Rekap Hazard WHL - ' + t, [['Nunggu dicek', [KEPALA_X].concat((V.menunggu || []).map(barisX))], ['Sudah diputus', [KEPALA_X].concat((V.terbaru || []).map(barisX))],
      ['Ringkas', [['Rekap hazard WHL', ''], ['Nunggu dicek', (V.menunggu || []).length], ['Sudah diputus (48 jam)', (V.terbaru || []).length], ['Dibuat', new Date().toLocaleString('id-ID')]]]], roti);
  }
  function pdf() { if (window.WHL_EKSPOR) window.WHL_EKSPOR.pdf(panggil(FN_PDF, [{}], 120000), 'Rekap Hazard WHL', roti); }
  function tebakJenis(t) {
    t = String(t || '').toLowerCase();
    return /licin|becek|lumpur/.test(t) ? 'Jalan licin' : /lubang|rusak/.test(t) ? 'Jalan berlubang' : /longsor|tebing/.test(t) ? 'Longsor / tebing' : /genang|banjir|air/.test(t) ? 'Genangan / banjir' : /debu/.test(t) ? 'Debu tebal' : /rambu/.test(t) ? 'Rambu rusak / hilang' : /mogok|storing|rusak di jalan/.test(t) ? 'Unit mogok di jalan' : /tumpah|ceceran/.test(t) ? 'Material tumpah' : /lampu|gelap|penerangan/.test(t) ? 'Penerangan kurang' : 'Lainnya';
  }
  function chipStatus(x) {
    return { DIKIRIM: '<em class="hzSt biru">Baru</em>', DICEK: '<em class="hzSt kuning">Dicek</em>', VALID: '<em class="hzSt hijau">Valid' + (x.poin ? ' +' + x.poin : '') + '</em>', DITOLAK: '<em class="hzSt merah">Ditolak</em>', DIGABUNG: '<em class="hzSt">Digabung</em>' }[x.status] || '<em class="hzSt">' + esc(x.status || '-') + '</em>';
  }
  function barisVal(x) {
    return '<div class="kartu" style="margin-bottom:10px;padding:4px 12px"><button type="button" class="hzBrs" data-h="buka:' + esc(x.id) + '"><span class="hzIk">' + ik(x.jenis) + '</span><div class="tx"><b>' + esc(x.jenis) + '</b><small>' + esc(x.nama || '-') + ' · ' + waktu(x.waktu) + '</small>' + tagSumber(x)
      + (x.pelaporGabung && x.pelaporGabung.length ? '<span class="jlTag">+' + x.pelaporGabung.length + ' pelapor</span>' : '') + '</div>' + chipStatus(x) + '</button></div>';
  }
  function kartuVal(x) {
    var gab = x.pelaporGabung || [], poin = (OPSI && OPSI.poin) || 8, sb = sibuk['p' + x.id];
    var h = '<div class="kartu hzVk" style="margin-bottom:10px">'
      + '<div class="hzVf" data-hzfoto="' + esc(x.id) + '"' + (x.adaFoto ? '' : ' data-kosong="1"') + '>' + (x.adaFoto ? 'Memuat foto…' : 'Tanpa foto (dari WA)') + '</div>'
      + '<b class="hzVj">' + ik(x.jenis) + ' ' + esc(x.jenis) + '</b>' + tagSumber(x) + ' ' + chipStatus(x)
      + '<div class="kecil">' + esc(x.nama || '-') + (x.peran ? ' (' + esc(peranTeks(x.peran)) + ')' : '') + ' · ' + waktu(x.waktu) + (x.akurasi != null ? ' · GPS ±' + esc(x.akurasi) + ' m' : '') + '</div>'
      + (x.keterangan ? '<div class="hzKetV">“' + esc(x.keterangan) + '”</div>' : '')
      + '<div class="hzAksiBaris">' + (x.adaSuara ? '<button type="button" data-h="suara:' + esc(x.id) + '">▶ Putar pesan suara</button>' : '') + (x.lat != null && x.lng != null ? '<button type="button" data-h="peta:' + x.lat + ',' + x.lng + '">📍 Buka lokasi di peta</button>' : '') + '</div>'
      + (gab.length ? '<div class="hzMirip">⚠ Juga dilaporkan: ' + gab.map(esc).join(', ') + ' (digabung, poin ke pelapor pertama).</div>' : '')
      + (x.status === 'DITOLAK' && x.alasan ? '<div class="hzMirip" style="background:rgba(242,72,77,.12);color:var(--tMerah)">Alasan tolak: ' + esc(x.alasan) + (x.dicekOleh ? ' · ' + esc(x.dicekOleh) : '') + '</div>' : '')
      + (x.status === 'VALID' && x.dicekOleh ? '<div class="kecil" style="margin-top:8px">Divalidasi ' + esc(x.dicekOleh) + (x.waktuCek ? ' · ' + waktu(x.waktuCek) : '') + '</div>' : '');
    if (x.milikSaya) return h + '<div class="hzMirip">Ini laporanmu sendiri — divalidasi HSE / pengawas lain.</div></div>';
    if (tolakId === x.id) return h + '<div class="hzTolak"><span class="hzLbl" style="margin-top:0">Alasan menolak <em>wajib</em></span><div class="hzChips">' + ALASAN.map(function (a) { return '<button type="button" class="hzChip" data-h="alasan" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('') + '</div>'
      + '<input class="isian" id="hzAlasan" maxlength="200" placeholder="Tulis alasan…" style="margin-top:8px"><div class="hzDua"><button type="button" class="no" data-h="batalTolak" style="background:var(--panel2);color:var(--teks)">Batal</button><button type="button" class="ok" data-h="kirimTolak:' + esc(x.id) + '" style="background:#e5484d"' + (sb ? ' disabled' : '') + '>' + (sb ? 'Mengirim…' : 'Tolak laporan') + '</button></div></div></div>';
    if (x.status === 'VALID') return h + '<div class="hzDua" style="grid-template-columns:1fr"><button type="button" class="no" data-h="tolak:' + esc(x.id) + '">Ubah jadi ditolak…' + (x.poin ? ' (poin dicabut)' : '') + '</button></div></div>';
    return h + '<div class="hzDua"><button type="button" class="no" data-h="tolak:' + esc(x.id) + '"' + (sb ? ' disabled' : '') + '>Tolak…</button><button type="button" class="ok" data-h="valid:' + esc(x.id) + '"' + (sb ? ' disabled' : '') + '>' + (sb ? 'Mengirim…' : x.status === 'DITOLAK' ? 'Jadikan valid' : x.sumber === 'APP' ? 'Valid +' + poin : 'Valid') + '</button></div></div>';
  }
  function cariVal(id) { var V = VAL || {}; return (V.menunggu || []).concat(V.terbaru || []).filter(function (x) { return x.id === id; })[0]; }
  function putus(id, status, alasan) {
    if (sibuk['p' + id]) return; sibuk['p' + id] = 1; gambarVal();
    panggil('pusatHazardPutus', [id, status, alasan || '']).then(function (h) {
      delete sibuk['p' + id];
      if (h && h.login === false) { tutup(); if (CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (!h || h.ok === false) { roti((h && h.pesan) || 'Gagal menyimpan.'); R.getar('gagal'); gambarVal(); return; }
      R.bunyi('sukses'); R.getar('sukses'); tolakId = '';
      roti(status === 'VALID' ? 'Laporan VALID' + (h.poin ? ' · +' + h.poin + ' poin ke pelapor' : '') + '. Tampil di Kondisi jalan.' : 'Laporan ditolak' + (h.dicabut ? ' · poin dicabut' : '') + '.');
      var M = (VAL && VAL.menunggu) || [], i = -1; M.forEach(function (x, k) { if (x.id === id) i = k; });
      var lanjut = i >= 0 ? (M[i + 1] || M[i - 1]) : null; bukaId = lanjut ? lanjut.id : '';
      muatVal();
    }, function (e) { delete sibuk['p' + id]; roti(e.message); gambarVal(); });
  }
  function angkat(idK) {
    if (sibuk['wa' + idK]) return; var sel = lapisEl && lapisEl.querySelector('select[data-wa="' + (window.CSS && CSS.escape ? CSS.escape(idK) : idK) + '"]'), jenis = sel ? sel.value : 'Lainnya';
    sibuk['wa' + idK] = 1; gambarVal();
    panggil('pusatHazardAngkatWa', [idK, jenis]).then(function (h) {
      delete sibuk['wa' + idK];
      if (!h || h.ok === false) { roti((h && h.pesan) || 'Gagal mengangkat.'); gambarVal(); return; }
      R.bunyi('sukses'); roti(h.dobel ? 'Catatan ini sudah pernah diangkat.' : 'Diangkat jadi hazard valid (sumber WA).');
      if (VAL && VAL.wa) VAL.wa = VAL.wa.filter(function (w) { return w.idKendala !== idK; }); gambarVal(); muatVal();
    }, function (e) { delete sibuk['wa' + idK]; roti(e.message); gambarVal(); });
  }

  /* ---------- berkas foto / suara (dipakai juga oleh jalan.js) ---------- */
  function berkas(id, jenis) {
    var k = id + '|' + jenis; if (BERKAS[k]) return BERKAS[k];
    var j = BERKAS[k] = panggil('pusatHazardBerkas', [id, jenis], 45000).then(function (h) { if (!h || h.ok === false || !h.b64) throw new Error((h && h.pesan) || 'Berkas tidak ada.'); return 'data:' + (h.mime || (jenis === 'suara' ? 'audio/mp4' : 'image/jpeg')) + ';base64,' + h.b64; });
    j.catch(function () { if (BERKAS[k] === j) delete BERKAS[k]; }); return j;
  }
  function isiFoto() {
    if (!lapisEl) return;
    Array.prototype.forEach.call(lapisEl.querySelectorAll('[data-hzfoto]:not([data-kosong])'), function (el) {
      var id = el.getAttribute('data-hzfoto'); el.setAttribute('data-kosong', '1');
      berkas(id, 'foto').then(function (u) { if (document.body.contains(el)) el.innerHTML = '<img src="' + u + '" alt="Foto hazard" data-h="lihat">'; }, function (e) { if (document.body.contains(el)) el.textContent = 'Foto tidak bisa dimuat: ' + e.message; });
    });
  }
  function lihat(src) {
    if (!lapisEl) return; tutupLihat(); var d = document.createElement('div'); d.className = 'hzLihat'; d.setAttribute('data-h', 'tutupLihat');
    d.innerHTML = '<img src="' + src + '" alt="Foto besar"><span>✕ Tutup</span>'; lapisEl.appendChild(d);
  }
  function tutupLihat() { var d = lapisEl && lapisEl.querySelector('.hzLihat'); if (d) { d.remove(); return true; } return false; }

  /* ---------- kejadian ---------- */
  function klik(ev) {
    var b = ev.target.closest('[data-h]'); if (!b || !lapisEl || !lapisEl.contains(b)) return; var n = b.getAttribute('data-h');
    if (n === 'tutup') {
      if (tutupLihat()) return; if (tolakId) { tolakId = ''; gambarVal(); return; }
      R.bunyi('tutup');
      if (layar === 'val' && lapisEl.getAttribute('data-dari') === 'lapor') { lapisEl.removeAttribute('data-dari'); bukaLapor(); return; } /* Validasi dibuka dari layar Lapor -> kembali ke Lapor */
      tutup(); return;
    }
    if (n === 'tutupLihat') { tutupLihat(); return; }
    if (n === 'lihat' || n === 'lihatFoto') { lihat(n === 'lihatFoto' ? F.foto : b.getAttribute('src')); return; }
    if (n === 'ulang') { if (layar === 'val') bukaVal(); else bukaLapor(); return; }
    if (n.indexOf('excel:') === 0) { excel(n.slice(6)); return; } /* v3.31 */
    if (n === 'pdf') { pdf(); return; }
    if (n === 'keVal') { R.getar(); bukaVal(); if (lapisEl) lapisEl.setAttribute('data-dari', 'lapor'); return; }
    if (n === 'gps') { mulaiGps(); return; }
    if (n === 'jenis') { F.jenis = b.getAttribute('data-j'); R.getar(); Array.prototype.forEach.call(lapisEl.querySelectorAll('.hzChip[data-h="jenis"]'), function (c) { var on = c === b; c.classList.toggle('on', on); c.setAttribute('aria-checked', on); }); var g = lapisEl.querySelector('#hzGalat'); if (g) g.innerHTML = ''; return; }
    if (n === 'rekam') { mulaiRekam(); return; }
    if (n === 'stopRekam') { hentiRekam(true); return; }
    if (n === 'hapusSuara') { hentiAudio(); F.suara = null; gambarSuara(); return; }
    if (n === 'putarSaya') { if (F.suara) putar(F.suara.data, 'saya', b); return; }
    if (n === 'kirim') { kirim(); return; }
    if (n === 'batalForm') { hentiRekam(false); hentiAudio(); F = formBaru(); gambarLapor(); mulaiGps(); return; }
    if (n === 'kirimAntre') { ANTRE.forEach(function (a) { delete a.galat; }); kirimAntrean(); roti('Mencoba mengirim…'); return; }
    if (n.indexOf('hapusAntre:') === 0) { ANTRE.splice(+n.slice(11), 1); simpanAntre(); gambarSaya(); return; }
    if (n === 'ulangSaya') { SAYA = null; gambarSaya(); muatSaya(); return; }
    if (n.indexOf('tab:') === 0) { tabV = n.slice(4); tolakId = ''; bukaId = ''; if (tabV === 'tunggu' && VAL && (VAL.menunggu || []).length) { bukaId = VAL.menunggu[0].id; tandaiCek(VAL.menunggu[0]); } gambarVal(); return; }
    if (n === 'segarVal') { muatVal(); roti('Menyegarkan…'); return; }
    if (n.indexOf('buka:') === 0) { bukaId = n.slice(5); tolakId = ''; tandaiCek(cariVal(bukaId)); R.getar(); gambarVal(); return; }
    if (n.indexOf('valid:') === 0) { putus(n.slice(6), 'VALID', ''); return; }
    if (n.indexOf('tolak:') === 0) { tolakId = n.slice(6); gambarVal(); var i = lapisEl.querySelector('#hzAlasan'); if (i) i.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    if (n === 'batalTolak') { tolakId = ''; gambarVal(); return; }
    if (n === 'alasan') { var ia = lapisEl.querySelector('#hzAlasan'); if (ia) ia.value = b.getAttribute('data-a'); return; }
    if (n.indexOf('kirimTolak:') === 0) { var al = lapisEl.querySelector('#hzAlasan'), t = al ? al.value.trim() : ''; if (!t) { roti('Isi alasan penolakan.'); if (al) al.focus(); R.getar('gagal'); return; } putus(n.slice(11), 'DITOLAK', t); return; }
    if (n.indexOf('angkat:') === 0) { angkat(n.slice(7)); return; }
    if (n.indexOf('suara:') === 0) { var id = n.slice(6), tb = b; tb.textContent = 'Memuat suara…'; berkas(id, 'suara').then(function (u) { tb.textContent = '▶ Putar pesan suara'; putar(u, id, tb); }, function (e) { tb.textContent = '▶ Putar pesan suara'; roti(e.message); }); return; }
    if (n.indexOf('peta:') === 0) { var p = n.slice(5); if (CTX && CTX.bukaWeb) CTX.bukaWeb('https:' + '/' + '/www.google.com/maps?q=' + encodeURIComponent(p)); return; }
  }
  function ganti(ev) {
    var t = ev.target; if (t.getAttribute && t.getAttribute('data-hf') === 'foto' && t.files && t.files[0]) {
      var f = t.files[0]; t.value = ''; roti('Menyiapkan foto…');
      kecilkan(f).then(function (u) { F.foto = u; R.getar(); gambarLapor(); if (!F.lok && GPSW == null) mulaiGps(); }, function (e) { roti(e.message); });
    }
  }
  function ketik(ev) { if (ev.target && ev.target.id === 'hzKet') { F.ket = ev.target.value; var g = lapisEl.querySelector('#hzGalat'); if (g && g.innerHTML) g.innerHTML = ''; } }

  /* klik menu Beranda / Lainnya ([data-ke]) — app.js tidak perlu cabang klik baru */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ke]'); if (!b) return; var ke = b.getAttribute('data-ke');
    if ((ke === 'hazard' || ke === 'hazardCek') && CTX && sesi()) { R.getar(); buka(CTX, ke === 'hazardCek' ? 'val' : 'lapor'); }
  });
  window.addEventListener('online', function () { setTimeout(kirimAntrean, 1500); });

  /** notif {jenis:'hazard', id}: validator -> Validasi (sorot id kalau ada di antrean), pelapor -> Lapor hazard (Laporan saya) */
  function bukaNotif(ctx, id) {
    pasang(ctx); gaya();
    if (bolehValidasi()) { tabV = 'tunggu'; bukaId = id || ''; notifCari = id || ''; bukaVal(id); return; }
    bukaLapor();
  }
  function lupakan() { tutup(); MATI = 0; AKUN = ''; OPSI = null; SAYA = null; VAL = null; nTunggu = 0; ANTRE = []; BERKAS = {}; F = formBaru(); }

  window.WHL_HAZARD = { boleh: boleh, aturFitur: aturFitur, bolehValidasi: bolehValidasi, pasang: pasang, buka: buka, bukaNotif: bukaNotif, jumlahTunggu: jumlahTunggu, kirimAntrean: kirimAntrean, berkas: berkas, tutup: tutup, lupakan: lupakan, gaya: gaya,
    _uji: { F: function () { return F; }, antre: function () { return ANTRE; } } };
})();
