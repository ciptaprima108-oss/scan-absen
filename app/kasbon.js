/* WHL App — AJUAN KASBON & CICILAN HP (gaji-driver-app-15nov, Andro 15 Nov 2026).
 * Alur (keputusan Reza 15 Nov, server Dodi PusatKasbon.gs + KasbonBersama.gs):
 *   - pengawas / admin / pimpinan / penuh mengajukan untuk DRIVER: Kasbon (nominal + alasan) atau Cicilan HP (merk, harga, tenor maks 3, tanpa DP, foto nota wajib)
 *   - SEMUA karyawan (bukan driver) boleh mengajukan Cicilan HP untuk dirinya sendiri (tenor maks 6)
 *   - TTD jari orang yang dipotong gajinya di kanvas HP -> PNG
 *   - MENUNGGU ADMIN (Input DO) -> DISETUJUI, atau MENUNGGU PIMPINAN -> Pak Fanza ACC / Tolak di app ini -> DISETUJUI / DITOLAK
 * KONTRAK (KONTRAK-APP.md, DASHBOARD api pusat):
 *   pusatKasbonOpsi [token] -> {ok, periode, mulaiPilihan[], bolehDriver, bolehAcc, drivers[{driver,nik,lambung,rit,gajiKotor,potongan,bersih,menunggu,sisa,cicilanAda}], diri{nama,nrp,jabatan,cicilanAda}, aturan{batasKasbon,batasSisa,tenorMaks{DRIVER,KARYAWAN},bulat}}
 *   pusatKasbonAjukan [token, d] d={cid, untuk, driver, jenis, nominal, alasan, barang, harga, tenor, mulai, foto, ttd} -> {ok, id, perluPimpinan, dobel?}
 *   pusatKasbonSaya [token] -> {ok, bolehAcc, list[], pimpinan[]}
 *   pusatKasbonPutus [token, id, 'ACC'|'TOLAK', alasan] -> {ok, id, status}
 *   pusatKasbonPdf [token, id] -> {ok, nama, b64}
 * v3.18 kasbon-bukti-transfer-15nov: KASBON wajib foto driver (d.fotoDriver JPEG; v3.19: <=800 px q0.6, < 100 KB); urutan ACC baru MENUNGGU PIMPINAN -> MENUNGGU ADMIN (siap ditransfer)
 *   -> DISETUJUI (ditransfer, bukti admin); tab "Perlu ACC pimpinan" paling depan; info bukti adaBukti/buktiWaktu/buktiOleh/buktiUrl. Server lama = label lama.
 * Anti-dobel: cid per ajuan (kirim ulang cid sama -> server balas id lama). Draf form + antrean kirim ulang disimpan di HP per akun.
 */
(function () {
  'use strict';
  var R = window.WHL_RASA || {}, API = window.WHL_API, Simpan = API.Simpan;
  var CTX = null, OPSI = null, OPSI_T = 0, LIST = null, PIMP = [], BOLEHACC = false, lapisEl = null, ttdEl = null, F = null, mengirim = false, tab = 'daftar', pesanForm = '';
  var tolakId = '', tolakAlasan = '', memutus = '';
  var KASBON = 'KASBON', HP = 'CICILAN HP', DRV = 'DRIVER', KRY = 'KARYAWAN', MAKS_FOTO = 600000;
  var NB = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var ATURAN0 = { batasKasbon: 1000000, batasSisa: 1000000, tenorMaks: { DRIVER: 3, KARYAWAN: 6 }, bulat: 1000 };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function IK(n, c) { return window.WHL_IKON ? window.WHL_IKON(n, c) : ''; }
  function rp(n) { n = Math.round(Number(n) || 0); return (n < 0 ? '−' : '') + 'Rp ' + Math.abs(n).toLocaleString('id-ID'); }
  function angka(t) { return Number(String(t == null ? '' : t).replace(/[^0-9]/g, '')) || 0; }
  function bulan(p) { var m = String(p || '').match(/^(\d{4})-(\d{2})$/); return m ? NB[+m[2] - 1] + ' ' + m[1] : String(p || ''); }
  function geser(p, n) { var m = String(p || '').match(/^(\d{4})-(\d{2})$/); if (!m) return ''; var t = +m[1] * 12 + (+m[2] - 1) + n; return Math.floor(t / 12) + '-' + ('0' + (t % 12 + 1)).slice(-2); }
  function idAcak() { var a = ''; try { var u = new Uint8Array(6); crypto.getRandomValues(u); a = Array.prototype.map.call(u, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); } catch (e) { a = Math.random().toString(36).slice(2, 10); } return Date.now().toString(36) + a; }
  function sesi() { return CTX && CTX.sesi(); }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function aturan() { return (OPSI && OPSI.aturan) || ATURAN0; }
  function serverPunya() { var X = API.Pusat; return !!(X.punya && X.punya('pusatKasbonAjukan') && X.punya('pusatKasbonSaya')); }
  /* semua karyawan non-driver (cicilan HP diri sendiri); ajuan untuk driver ditentukan server lewat OPSI.bolehDriver */
  /* v3.14 akses-gaji-15nov: flag hak dari server (pusatGajiAkses lewat WHL_GAJI.akses); null = server lama / belum terbaca -> perilaku 3.13 */
  function AK(S) { var G = window.WHL_GAJI; return G && G.akses ? G.akses(S || sesi()) : null; }
  function boleh(S) {
    S = S || sesi(); if (!(S && S.user && S.user.peran && S.user.peran !== 'driver') || !serverPunya()) return false;
    var A = AK(S); return A ? !!(A.bolehAjuDriver || A.bolehAjuDiri || A.bolehAcc) : true;
  }
  function bolehDrv() { var A = AK(); return !!(OPSI && OPSI.bolehDriver) && (!A || A.bolehAjuDriver); }
  function bolehDiri() { var A = AK(); return !A || A.bolehAjuDiri; }
  /** angka gaji driver boleh tampil? (server mengirim null kalau akun tidak punya hak gaji) */
  function angkaGaji(d) { var A = AK(); return !!d && d.sisa != null && !(A && !A.bolehGaji) && !(OPSI && OPSI.bolehGaji === false); }
  function akun() { var S = sesi(); return String((S && (S.idProfil || S.idKetik)) || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function kunciAntre() { return 'whlKasbonAntre_' + akun(); }
  function kunciDraf() { return 'whlKasbonDraf_' + akun(); }
  function antre() { return Simpan.ambil(kunciAntre()).then(function (v) { try { var a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }); }
  function taruhAntre(a) { return Simpan.taruh(kunciAntre(), a.length ? JSON.stringify(a) : null); }

  /** Jadwal cicilan tanpa DP — SAMA dengan kajRencana_ server: per = ceil(harga/tenor/1000)*1000, tiap bulan min(per, sisa), terakhir = sisa. */
  function rencana(harga, tenor) {
    var B = aturan().bulat || 1000; harga = Math.max(0, Math.round(Number(harga) || 0)); tenor = Math.max(1, Math.floor(Number(tenor) || 1));
    var per = Math.ceil(harga / tenor / B) * B, out = [], sisa = harga;
    for (var i = 0; i < tenor && sisa > 0; i++) { var a = i === tenor - 1 ? sisa : Math.min(per, sisa); out.push(a); sisa -= a; }
    return out;
  }
  /* v3.18 kasbon-bukti-transfer-15nov: foto driver (wajib untuk KASBON) -> JPEG sisi terpanjang maks 800 px, kualitas 0.6 (v3.19) (turun pelan kalau masih > batas) */
  var MAKS_FOTO_DRV = 135000; /* v3.19 (Reza): PDF kasbon seringan mungkin -> sisi 800 px, JPEG 0.6, target < 100 KB */
  function fotoKecil(file) {
    return new Promise(function (ok, gagal) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, sk = Math.min(1, 800 / Math.max(w, h)), q = 0.6, d = '';
        for (var i = 0; i < 8; i++) {
          var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * sk)); c.height = Math.max(1, Math.round(h * sk));
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          d = c.toDataURL('image/jpeg', q); if (d.length <= MAKS_FOTO_DRV) break;
          if (q > 0.45) q -= 0.08; else sk *= 0.85;
        }
        URL.revokeObjectURL(url);
        if (!/^data:image\/jpeg;base64,/.test(d)) gagal(new Error('foto tidak bisa diolah')); else ok(d);
      };
      img.onerror = function () { URL.revokeObjectURL(url); gagal(new Error('gambar tidak bisa dibaca')); };
      img.src = url;
    });
  }
  /** server sudah memakai alur baru (pimpinan dulu -> admin transfer + bukti)? dikenali dari field adaBukti di daftar; belum terbaca = anggap baru */
  var ALUR_BARU = true;
  function cekAlur(L) { if (L && L.length) ALUR_BARU = L.some(function (x) { return x && x.adaBukti !== undefined; }); }
  function bukaTautan(u) {
    if (!/^https:\/\//.test(String(u || ''))) return;
    if (CTX && CTX.bukaWeb) { CTX.bukaWeb(u); return; }
    try { window.open(u, '_blank', 'noopener'); } catch (e) { /* */ }
  }
  function labelDriver(d) { return d.driver + ' · ' + (d.lambung ? d.lambung : 'SERAP'); }
  function setDriver(nama) { simpanIsian(); F.driver = nama; rapikan(); pesanForm = ''; gambarForm(); simpanDraf(); }
  function bukaPilihDriver() {
    var D = (OPSI && OPSI.drivers) || [], lab = D.map(labelDriver), dp = driverPilih();
    if (!window.WHL_PEMILIH) return;
    window.WHL_PEMILIH.buka({ judul: 'Pilih driver (' + D.length + ')', daftar: lab, nilai: dp ? labelDriver(dp) : '', baru: '', ket: 'Driver belum ada? Minta admin tambah kartu driver di Input DO.',
      pilih: function (v) { var i = lab.indexOf(v); if (i >= 0) setDriver(D[i].driver); } });
  }
  function driverPilih() { return F && F.driver && OPSI ? (OPSI.drivers || []).filter(function (d) { return d.driver === F.driver; })[0] || null : null; }
  /** potongan ajuan ini di gaji bulan berjalan: kasbon = nominal; cicilan HP = cicilan ke-1 kalau mulai bulan ini */
  function potonganIni() { if (!F || !OPSI) return 0; if (F.jenis === KASBON) return F.nominal || 0; var r = F.harga > 0 && F.tenor > 0 ? rencana(F.harga, F.tenor) : []; return r.length && F.mulai === OPSI.periode ? r[0] : 0; }
  function sisaSesudah() { var d = driverPilih(); return d ? d.sisa - potonganIni() : null; }
  /** perkiraan aturan ACC Pak Fanza (info saja; server menghitung ulang). Keputusan Reza 15 Nov: sisa gaji SESUDAH ajuan ini < batas. */
  function perluPimpinan() {
    var A = aturan(), a = [], s = F.untuk === DRV && angkaGaji(driverPilih()) ? sisaSesudah() : null;
    if (F.jenis === HP) a.push('semua cicilan HP di-ACC pimpinan');
    if (F.jenis === KASBON && F.nominal >= A.batasKasbon) a.push('kasbon ' + rp(A.batasKasbon) + ' ke atas'); /* v3.21: server Input DO V294 / DASHBOARD V508 = >= 1 jt */
    if (s != null && s < A.batasSisa) a.push('perkiraan sisa gaji sesudah ajuan ' + rp(Math.max(0, s)) + ' (di bawah ' + rp(A.batasSisa) + ')');
    return a;
  }

  /* ---------- foto nota: kamera/galeri -> JPEG <= ±600 KB ---------- */
  function kompres(file) {
    return new Promise(function (ok, gagal) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, sk = Math.min(1, 1600 / Math.max(w, h)), q = 0.82, d = '';
        for (var i = 0; i < 10; i++) {
          var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * sk)); c.height = Math.max(1, Math.round(h * sk));
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          d = c.toDataURL('image/jpeg', q); if (d.length <= MAKS_FOTO) break;
          if (q > 0.5) q -= 0.12; else sk *= 0.8;
        }
        URL.revokeObjectURL(url);
        if (d.length > MAKS_FOTO) gagal(new Error('foto terlalu besar')); else ok(d);
      };
      img.onerror = function () { URL.revokeObjectURL(url); gagal(new Error('gambar tidak bisa dibaca')); };
      img.src = url;
    });
  }

  /* ---------- gaya ---------- */
  function pasangGaya() {
    if (document.getElementById('kbGaya')) return;
    var st = document.createElement('style'); st.id = 'kbGaya';
    st.textContent = [
      '.kbSeg{grid-template-columns:repeat(var(--n,2),1fr)}',
      '.kbSeg button{font-size:13px;gap:5px;padding:0 4px}',
      '.kbSeg .angka{background:var(--merah);color:#fff;border-radius:99px;font-size:11px;padding:1px 6px;font-style:normal}',
      '.kbSeg[style*="--n:3"] button{font-size:12px;line-height:1.15;white-space:normal}',
      '.kbBukti{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;font-size:12.5px;font-weight:700;color:var(--tHijau)}',
      '.kbBukti button.link{color:var(--utama);text-decoration:underline;background:none;border:0;padding:0;font:inherit;font-weight:800;min-height:32px}',
      '.kbFotoDrv{display:flex;gap:10px;align-items:center;margin-top:4px}',
      '.kbFotoDrv img{width:96px;height:96px;object-fit:cover;border-radius:14px;border:1px solid var(--garis);background:#fff}',
      '.kbFotoDrv .pil{flex:1;display:flex;flex-direction:column;gap:6px}',
      '.kbFotoDrv label{display:flex;align-items:center;justify-content:center;gap:6px;min-height:44px;border-radius:12px;border:2px dashed var(--garis);background:var(--lembut2);color:var(--utama);font-weight:800;font-size:13.5px;cursor:pointer}',
      '.kbInfo{background:var(--panel2);border-radius:14px;padding:10px 12px;margin:12px 0 4px;font-size:13px;line-height:1.5}',
      '.kbInfo .br{display:flex;justify-content:space-between;gap:10px;padding:3px 0}.kbInfo .br span{color:var(--redup)}.kbInfo .br b{font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.kbInfo .br.tot{border-top:1px solid var(--garis);margin-top:4px;padding-top:7px;font-weight:800}.kbInfo .br.tot span{color:var(--teks)}',
      '.kbInfo .merah{color:var(--tMerah)}.kbInfo .hijau{color:var(--tHijau)}',
      '.kbAcc{display:flex;gap:8px;align-items:flex-start;border-radius:12px;padding:9px 11px;margin:8px 0 0;font-size:12.5px;font-weight:700;line-height:1.45;background:#fdf3e1;color:#8a5200}',
      'html[data-tema="gelap"] .kbAcc{background:#3a2a10;color:#ffd38a}',
      '.kbAcc.biru{background:var(--tint);color:var(--tBiru)}',
      '.kbAcc.merah{background:#fde2e2;color:#b42323}html[data-tema="gelap"] .kbAcc.merah{background:#3a1620;color:#fca5a5}',
      '.kbPil{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 4px}',
      '.kbPil button{min-width:46px;min-height:44px;border-radius:12px;background:var(--panel2);border:1px solid var(--garis);font-weight:800;font-size:15px;color:var(--redup);padding:0 12px}',
      '.kbPil button.on{background:var(--tint);color:var(--utama);border-color:var(--utama)}',
      '.kbRencana{font-size:12.5px;color:var(--redup);margin:6px 2px 0;line-height:1.5}.kbRencana b{color:var(--teks);font-variant-numeric:tabular-nums}',
      '.kbTtd{display:flex;align-items:center;gap:10px;margin-top:4px}',
      '.kbTtd img{flex:1;min-width:0;height:84px;object-fit:contain;background:#fff;border-radius:12px;border:1px solid var(--garis)}',
      '.kbTtdKosong{flex:1;min-height:84px;border:2px dashed var(--garis);border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;color:var(--utama);font-weight:800;font-size:14px;background:var(--lembut2)}',
      '.kbKartu{padding:12px 2px}.kbKartu + .kbKartu{border-top:1px solid var(--garis)}',
      '.kbAtas{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}.kbAtas b{font-size:14.5px;line-height:1.3;word-break:break-word}',
      '.kbNom{font-size:19px;font-weight:900;font-variant-numeric:tabular-nums;margin:4px 0 1px}',
      '.kbRinci{font-size:12.5px;color:var(--redup);line-height:1.5}',
      '.kbJejak{font-size:12px;color:var(--redup);margin-top:6px;line-height:1.55}.kbJejak b{color:var(--teks)}',
      '.kbTolak{display:flex;gap:7px;align-items:flex-start;margin-top:8px;font-size:12.5px;color:var(--tMerah);font-weight:700}',
      '.kbTombol{display:flex;gap:8px;margin-top:10px}.kbTombol button{flex:1;margin:0;min-height:44px}',
      '.kbDokumen{margin-top:8px;min-height:38px}',
      '.kbTtdLapis .ksnIsi{display:flex;flex-direction:column}',
      '.kbKanvasB{position:relative;background:#fff;border-radius:16px;border:2px solid var(--garis);overflow:hidden;touch-action:none}',
      '.kbKanvasB canvas{display:block;width:100%;height:100%;touch-action:none}',
      '.kbKanvasB .garis{position:absolute;left:18px;right:18px;bottom:46px;border-bottom:2px dashed #c9d3e0;pointer-events:none}',
      '.kbKanvasB .x{position:absolute;left:18px;bottom:50px;font:700 20px sans-serif;color:#9aa8bb;pointer-events:none}',
      '.kbKanvasB .tip{position:absolute;left:0;right:0;top:40%;text-align:center;color:#9aa8bb;font-weight:700;font-size:14px;pointer-events:none}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---------- lapis utama ---------- */
  function lapis(h) {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      pasangGaya();
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis kbLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik); lapisEl.addEventListener('change', ubah); lapisEl.addEventListener('input', ketik); lapisEl.addEventListener('focusout', lepasFokus);
    }
    var tabs = BOLEHACC ? [['acc', 'Perlu ACC pimpinan' + (PIMP.length ? ' <i class="angka">' + PIMP.length + '</i>' : '')], ['daftar', 'Ajuan saya'], ['baru', 'Ajukan']] /* v3.18: tab ACC pimpinan PALING DULU; 3 tab tanpa ikon */
      : [['daftar', IK('kotak') + 'Ajuan saya'], ['baru', IK('input') + 'Ajukan']];
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-k="kembali" aria-label="Kembali">‹</button><div class="nm">Potong gaji<b>Kasbon &amp; cicilan HP</b></div></div>'
      + '<div class="ksnIsi"><div class="segmen kbSeg" style="--n:' + tabs.length + '">' + tabs.map(function (t) { return '<button type="button" data-k="tab:' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>' + h + '</div>';
  }
  function tutup() { if (!lapisEl) return; tutupTtd(); var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); if (CTX && CTX.perbarui) CTX.perbarui(); }
  function memuatHtml(t) { return '<div class="kecil" style="text-align:center;padding:24px"><span class="putar"></span> ' + esc(t || 'Memuat...') + '</div>'; }

  function muatOpsi(paksa) {
    if (OPSI && !paksa && Date.now() - OPSI_T < 10 * 60000) return Promise.resolve(OPSI);
    return API.Pusat.kasbonOpsi(sesi()).then(function (o) {
      if (o && o.login === false) throw new Error('Sesi habis, keluar lalu masuk lagi.');
      if (!o || !o.ok) throw new Error((o && o.pesan) || 'Pilihan ajuan belum tersedia.');
      OPSI = o; OPSI_T = Date.now(); if (o.bolehAcc) BOLEHACC = true; return o;
    });
  }
  function buka(ctx, keTab) {
    CTX = ctx || CTX; if (!boleh()) { roti('Ajuan kasbon belum tersedia untuk akunmu.'); return; }
    tab = keTab || 'daftar'; tolakId = ''; pesanForm = ''; tabOtomatis = !keTab;
    var A0 = AK(); if (A0) BOLEHACC = !!A0.bolehAcc; /* v3.14: tab Perlu ACC langsung dari flag server */
    if (tabOtomatis && BOLEHACC && PIMP.length) tab = 'acc'; /* v3.18: yang bisa ACC langsung ke daftar ACC pimpinan */
    lapis(memuatHtml());
    if (tab === 'baru') bukaForm(); else daftar();
    muatOpsi(false).then(function () { if (lapisEl && tab !== 'baru') segarTab(); }, function () { /* form akan menampilkan galatnya sendiri */ });
    kirimAntrean();
  }
  function segarTab() { if (!lapisEl) return; if (tab === 'baru') { if (F) { simpanIsian(); gambarForm(); } } else if (tab === 'acc') gambarAcc(); else gambarDaftar(ANTRE_TAMPIL, GALAT_DAFTAR); }

  /* ---------- daftar "Ajuan saya" + "Perlu ACC" ---------- */
  var ANTRE_TAMPIL = [], GALAT_DAFTAR = '', tabOtomatis = false;
  /* v3.18 alur baru: MENUNGGU PIMPINAN -> MENUNGGU ADMIN (siap ditransfer) -> DISETUJUI (ditransfer). Server lama (tanpa adaBukti) -> label lama. */
  var STATUS = { 'MENUNGGU ADMIN': ['kuning', 'Menunggu transfer admin'], 'MENUNGGU PIMPINAN': ['kuning', 'Menunggu ACC pimpinan'], DISETUJUI: ['hijau', 'Ditransfer'], DITOLAK: ['merah', 'Ditolak'], BATAL: ['merah', 'BATAL'] };
  var STATUS_LAMA = { 'MENUNGGU ADMIN': ['kuning', 'Menunggu admin'], 'MENUNGGU PIMPINAN': ['kuning', 'Menunggu Pak Fanza'], DISETUJUI: ['hijau', 'Disetujui'], DITOLAK: ['merah', 'Ditolak'], BATAL: ['merah', 'BATAL'] };
  function labelStatus(x) {
    var baru = !!x && x.adaBukti !== undefined, w = (baru ? STATUS : STATUS_LAMA)[x && x.status] || ['abu', (x && x.status) || '-'];
    if (baru && x.status === 'DISETUJUI' && x.jenis === HP) w = ['hijau', 'Disetujui'];
    return w;
  }
  function daftar(keTab) {
    tab = keTab || (tab === 'acc' ? 'acc' : 'daftar');
    lapis(memuatHtml('Memuat ajuan...'));
    Promise.all([antre(), API.Pusat.kasbonSaya(sesi()).then(function (h) {
      if (h && h.login === false) return 'Sesi habis, keluar lalu masuk lagi.';
      if (h && h.ok) { LIST = Array.isArray(h.list) ? h.list : []; PIMP = Array.isArray(h.pimpinan) ? h.pimpinan : []; BOLEHACC = !!h.bolehAcc; cekAlur(LIST.concat(PIMP)); Simpan.taruh('whlKasbonSaya_' + akun(), JSON.stringify(LIST)); return ''; }
      return (h && h.pesan) || 'Daftar belum bisa dimuat.';
    }, function (e) {
      return Simpan.ambil('whlKasbonSaya_' + akun()).then(function (v) { try { LIST = JSON.parse(v || 'null') || LIST; } catch (x) { /* */ } return e.message; });
    })]).then(function (r) {
      ANTRE_TAMPIL = r[0]; GALAT_DAFTAR = r[1];
      if (!lapisEl || tab === 'baru') return; /* jangan menimpa form kalau pengguna sudah pindah ke Ajukan */
      if (tabOtomatis) { tabOtomatis = false; if (BOLEHACC && PIMP.length) tab = 'acc'; else if (tab === 'acc' && !PIMP.length) tab = 'daftar'; }
      if (tab === 'acc') gambarAcc(); else gambarDaftar(r[0], r[1]);
    });
  }
  function judulAjuan(x) { return (x.jenis === HP ? '📱 Cicilan HP · ' : '🧾 Kasbon · ') + (x.nama || ''); }
  function rinciAjuan(x) {
    if (x.jenis === HP) return esc(x.barang) + ' · ' + esc(x.tenor) + 'x ' + rp(x.perBulan) + '/bln' + (x.mulai ? ' · mulai ' + esc(bulan(x.mulai)) : '');
    return esc(x.alasan || '');
  }
  function kartuAjuan(x, acc) {
    var w = labelStatus(x), h ='<div class="kbKartu"><div class="kbAtas"><b>' + esc(judulAjuan(x)) + '</b><em class="notaSt ' + w[0] + '">' + esc(w[1]) + '</em></div>'
      + '<div class="kbNom">' + rp(x.nominal) + '</div><div class="kbRinci">' + rinciAjuan(x) + '</div>'
      + '<div class="kbRinci">' + (x.untuk === KRY ? 'Karyawan' + (x.jabatan ? ' · ' + esc(x.jabatan) : '') : 'Driver' + (x.lambung ? ' · ' + esc(x.lambung) : '')) + (x.nik ? ' · ' + esc(x.nik) : '') + '</div>'
      + '<div class="kbJejak">' + esc(x.waktu || '') + ' · ' + esc(x.id) + (acc || x.pengaju ? '<br>Diajukan <b>' + esc(x.pengaju || '') + '</b>' + (x.peranPengaju ? ' · ' + esc(x.peranPengaju) : '') : '')
      + (x.sisaGaji != null && x.sisaGaji !== '' && x.untuk !== KRY && !(AK() && !AK().bolehGaji) ? '<br>Perkiraan sisa gaji saat diajukan <b>' + rp(Math.max(0, x.sisaGaji)) + '</b>' : '')
      + (x.accAdmin ? '<br>✓ ACC admin <b>' + esc(x.accAdmin) + '</b> ' + esc(x.accAdminWaktu || '') : '')
      + (x.accPimpinan ? '<br>✓ ACC pimpinan <b>' + esc(x.accPimpinan) + '</b> ' + esc(x.accPimpinanWaktu || '') : '')
      + (x.adaBukti ? '<br>✓ Ditransfer admin <b>' + esc(x.buktiOleh || '') + '</b> ' + esc(x.buktiWaktu || '') : '') + '</div>';
    if (x.adaBukti || x.buktiUrl || x.alasanTanpaBukti) {
      h += '<div class="kbBukti">' + IK('centang') + '<span>' + (x.adaBukti || x.buktiUrl ? (x.jenis === HP ? 'Bukti pembayaran ada' : 'Bukti transfer ada') : 'Tanpa bukti: ' + esc(x.alasanTanpaBukti)) + '</span>'
        + (/^https:\/\//.test(String(x.buktiUrl || '')) ? '<button type="button" class="link" data-k="bukti:' + esc(x.id) + '">Lihat bukti transfer</button>' : '') + '</div>';
    }
    if (x.status === 'MENUNGGU ADMIN' && x.adaBukti !== undefined) h += '<div class="kbAcc biru">' + IK('alarm') + '<span>' + (x.accPimpinan ? 'Sudah di-ACC pimpinan. ' : '') + 'Menunggu transfer admin (bukti transfer diunggah admin di Input DO).</span></div>';
    else if (x.perluPimpinan && x.status !== 'DITOLAK' && x.status !== 'DISETUJUI') h += '<div class="kbAcc biru">' + IK('alarm') + '<span>Butuh ACC ' + (ALUR_BARU ? 'pimpinan' : 'Pak Fanza') + (x.alasanPimpinan ? ': ' + esc(x.alasanPimpinan) : '') + '</span></div>';
    if (x.status === 'BATAL') h += '<div class="kbTolak">' + IK('alarm') + '<span>Dibatalkan' + (x.batalOleh ? ' oleh ' + esc(x.batalOleh) : '') + (x.batalWaktu ? ' · ' + esc(x.batalWaktu) : '') + (x.alasanBatal ? '<br>Alasan: ' + esc(x.alasanBatal) : '') + '</span></div>';
    if (bisaBatal(x, BOLEHACC)) h += '<button type="button" class="tKecil kbDokumen" data-k="batalKb:' + esc(x.id) + '" style="color:var(--tMerah);margin-left:6px">⛔ Batalkan</button>';
    if (x.status === 'DITOLAK') h += '<div class="kbTolak">' + IK('alarm') + '<span>Alasan: ' + esc(x.alasanTolak || '-') + (x.ditolakOleh ? '<br><small style="font-weight:600">' + esc(x.ditolakOleh) + '</small>' : '') + '</span></div>';
    h += '<button type="button" class="tKecil kbDokumen" data-k="pdf:' + esc(x.id) + '">' + IK('dokumen') + ' Dokumen PDF' + (x.adaPdf ? '' : ' (dibuat saat dibuka)') + '</button>';
    if (acc) {
      if (tolakId === x.id) {
        h += '<label class="lb" for="kbAlasanTolak" style="margin-top:10px">Alasan penolakan <i class="wajib">wajib</i></label><textarea class="isian bnrTA" id="kbAlasanTolak" rows="2" maxlength="200" placeholder="Kenapa ditolak (dikirim ke pengaju)">' + esc(tolakAlasan) + '</textarea>'
          + '<div class="kbTombol"><button type="button" class="tKecil" data-k="batalTolak">Batal</button><button type="button" class="tUtama tMerah" data-k="kirimTolak:' + esc(x.id) + '"' + (memutus ? ' disabled' : '') + '>' + (memutus === x.id ? '<span class="putar"></span>' : '') + 'Kirim penolakan</button></div>';
      } else {
        h += '<div class="kbTombol"><button type="button" class="tKecil" data-k="tolak:' + esc(x.id) + '"' + (memutus ? ' disabled' : '') + '>Tolak</button><button type="button" class="tUtama" data-k="acc:' + esc(x.id) + '"' + (memutus ? ' disabled' : '') + '>' + (memutus === x.id ? '<span class="putar"></span> ' : '') + IK('centang') + ' ACC</button></div>';
      }
    }
    return h + '</div>';
  }
  /* v3.19 BATALKAN KASBON (KONTRAK REVISI nama-driver-satu-15nov, DASHBOARD V502): khusus Fanza/Reza, kasbon MENUNGGU PIMPINAN/ADMIN/DISETUJUI, alasan wajib (modal sendiri) */
  function bisaBatal(x, hak) { return !!hak && !!x && x.jenis === KASBON && ['MENUNGGU PIMPINAN', 'MENUNGGU ADMIN', 'DISETUJUI'].indexOf(x.status) >= 0 && !!(API.Pusat.punya && API.Pusat.punya('pusatKasbonBatal')); }
  var mdlBatal = null;
  function tutupBatal() { if (mdlBatal) { mdlBatal.remove(); mdlBatal = null; return true; } return false; }
  function batalModal(x, ctx, selesai) {
    pasangGaya(); tutupBatal();
    var c = ctx || CTX, rt = function (t) { if (c && c.roti) c.roti(t); };
    mdlBatal = document.createElement('div'); mdlBatal.className = 'kbBatalM';
    mdlBatal.setAttribute('style', 'position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center');
    mdlBatal.innerHTML = '<div style="background:var(--panel,#fff);color:var(--teks);width:100%;max-width:520px;border-radius:20px 20px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom))">'
      + '<b style="font-size:16px;display:block">⛔ Batalkan kasbon?</b><div class="kecil" style="margin:6px 0 10px;line-height:1.5">' + esc(x.nama || '') + ' · ' + rp(x.nominal) + ' · ' + esc(x.id) + '<br>Status jadi <b>BATAL</b>, tidak dipotong dari gaji. Pengaju & admin dapat notifikasi.</div>'
      + '<label class="lb" for="kbAlasanBatal">Alasan pembatalan <i class="wajib">wajib</i></label><textarea class="isian bnrTA" id="kbAlasanBatal" rows="3" maxlength="200" placeholder="mis. driver batal ambil / salah input"></textarea>'
      + '<div class="pesan" id="kbBatalPesan"></div><div class="kbTombol"><button type="button" class="tKecil" data-b="tutup">Kembali</button><button type="button" class="tUtama tMerah" data-b="kirim">Batalkan kasbon</button></div></div>';
    document.body.appendChild(mdlBatal);
    mdlBatal.addEventListener('click', function (ev) {
      if (ev.target === mdlBatal) { tutupBatal(); return; }
      var b = ev.target.closest('[data-b]'); if (!b) return;
      if (b.getAttribute('data-b') === 'tutup') { tutupBatal(); return; }
      var al = (document.getElementById('kbAlasanBatal').value || '').trim(), ps = document.getElementById('kbBatalPesan');
      if (al.length < 3) { ps.textContent = 'Tulis alasan pembatalan.'; R.bunyi && R.bunyi('gagal'); return; }
      b.disabled = true; b.innerHTML = '<span class="putar"></span> Membatalkan…';
      var S = c && c.sesi ? c.sesi() : sesi();
      API.Pusat.panggil('pusatKasbonBatal', [S && S.tokenPusat, x.id, al], 45000).then(function (h) {
        if (h && h.ok) { tutupBatal(); R.bunyi && R.bunyi('sukses'); rt('Kasbon ' + x.id + ' dibatalkan.'); if (selesai) selesai(h); return; }
        b.disabled = false; b.textContent = 'Batalkan kasbon'; ps.textContent = (h && h.pesan) || (h && h.tolak ? 'Pembatalan khusus Pak Fanza / Pak Reza.' : 'Belum bisa dibatalkan.');
      }, function (e) { b.disabled = false; b.textContent = 'Batalkan kasbon'; ps.textContent = 'Belum terkirim: ' + ((e && e.message) || 'cek sinyal'); });
    });
    setTimeout(function () { var t = document.getElementById('kbAlasanBatal'); if (t) t.focus(); }, 80);
  }
  function gambarDaftar(A, galat) {
    A = A || [];
    var h = '<button type="button" class="tUtama" data-k="tab:baru" style="margin:0 0 12px">' + IK('input') + ' Ajukan kasbon / cicilan HP</button>';
    if (galat) h += '<div class="pitaData gagal">' + IK('alarm') + '<span>' + esc(galat) + (LIST ? ' Yang tampil daftar terakhir.' : '') + '</span><button type="button" data-k="muatUlang">Coba lagi</button></div>';
    if (BOLEHACC && PIMP.length) h += '<button type="button" class="pitaData" data-k="tab:acc" style="width:100%;text-align:left">' + IK('centang') + '<span><b>' + PIMP.length + ' ajuan</b> menunggu ACC kamu.</span></button>';
    if (A.length) h += '<h2 class="bagW">Belum terkirim <span>' + A.length + '</span></h2><div class="kartu daftarKm">' + A.map(function (x, i) {
      var st = x.salah ? '<em class="notaSt merah">Ditolak server</em>' : '<em class="notaSt kuning">Menunggu sinyal</em>';
      return '<div class="notaBaris"><div class="tx"><b>' + esc(x.ringkas || '') + '</b><small>' + (x.salah ? esc(x.salah) : 'dikirim otomatis saat sinyal ada') + '</small></div>' + st
        + (x.salah ? '<button type="button" class="tKecil" data-k="ubahAntre:' + i + '">Perbaiki</button>' : '<button type="button" class="tKecil" data-k="kirimSekarang">Kirim</button>') + '</div>';
    }).join('') + '</div>';
    var L = LIST || [];
    h += '<h2 class="bagW">Ajuan saya <span>' + L.length + '</span></h2>';
    h += L.length ? '<div class="kartu notaDaftar">' + L.map(function (x) { return kartuAjuan(x, false); }).join('') + '</div>'
      : (R.kosong ? R.kosong('Belum ada ajuan', 'Kasbon & cicilan HP yang kamu ajukan tampil di sini beserta statusnya.') : '');
    h += ALUR_BARU ? '<div class="kecil" style="margin:12px 4px 20px;line-height:1.55">Alur: cicilan HP, kasbon Rp 1.000.000 ke atas, atau perkiraan sisa gaji driver sesudah ajuan di bawah Rp 1 juta → <b>Menunggu ACC pimpinan</b> (Pak Fanza / Pak Reza) dulu. Sesudah itu <b>Menunggu transfer admin</b>: admin mentransfer dan mengunggah bukti di Input DO → <b>Ditransfer</b>, mulai dipotong dari gaji.</div>'
      : '<div class="kecil" style="margin:12px 4px 20px;line-height:1.55">Alur: <b>Menunggu admin</b> (ACC/Tolak di Input DO) → kasbon biasa langsung <b>Disetujui</b>. Cicilan HP, kasbon Rp 1.000.000 ke atas, atau perkiraan sisa gaji driver sesudah ajuan di bawah Rp 1 juta → <b>Menunggu Pak Fanza</b> → Disetujui / Ditolak.</div>';
    lapis(h);
  }
  function gambarAcc() {
    var h = '';
    if (GALAT_DAFTAR) h += '<div class="pitaData gagal">' + IK('alarm') + '<span>' + esc(GALAT_DAFTAR) + '</span><button type="button" data-k="muatUlang">Coba lagi</button></div>';
    h += '<h2 class="bagW">Perlu ACC pimpinan <span>' + PIMP.length + '</span></h2>';
    h += PIMP.length ? '<div class="kartu notaDaftar">' + PIMP.map(function (x) { return kartuAjuan(x, true); }).join('') + '</div>'
      : (R.kosong ? R.kosong('Tidak ada yang menunggu', 'Ajuan yang butuh ACC pimpinan tampil di sini.') : '');
    if (ALUR_BARU) h += '<div class="kecil" style="margin:12px 4px 20px;line-height:1.55">ACC = ajuan diteruskan ke admin untuk <b>ditransfer</b>. Sesudah admin mengunggah bukti transfer, kasbon / cicilan aktif dan mulai dipotong dari gaji. Tolak wajib dengan alasan; pengaju & admin dapat notifikasi.</div>';
    else h += '<div class="kecil" style="margin:12px 4px 20px;line-height:1.55">ACC = catatan kasbon / cicilan diaktifkan dan mulai dipotong dari gaji. Tolak wajib dengan alasan; pengaju & admin dapat notifikasi.</div>';
    lapis(h);
  }
  function putus(id, keputusan, alasan) {
    memutus = id; gambarAcc();
    API.Pusat.kasbonPutus(sesi(), id, keputusan, alasan || '').then(function (h) {
      memutus = '';
      if (h && h.ok) { tolakId = ''; tolakAlasan = ''; R.bunyi && R.bunyi('sukses'); R.getar && R.getar('sukses'); roti(keputusan === 'ACC' ? (h.status === 'MENUNGGU ADMIN' ? 'Di-ACC. Menunggu transfer admin.' : 'Disetujui. Mulai dipotong dari gaji.') : 'Ajuan ditolak.'); OPSI_T = 0; daftar('acc'); return; }
      R.bunyi && R.bunyi('gagal'); roti((h && h.pesan) || 'Keputusan belum tersimpan.'); gambarAcc();
    }, function (e) { memutus = ''; R.bunyi && R.bunyi('gagal'); roti('Belum terkirim: ' + ((e && e.message) || 'cek sinyal') + ' Coba lagi.'); gambarAcc(); });
  }

  /* ---------- form ---------- */
  function formKosong() {
    var bd = bolehDrv();
    return { untuk: bd || !bolehDiri() ? DRV : KRY, driver: '', jenis: bd ? KASBON : HP, nominal: 0, alasan: '', barang: '', harga: 0, tenor: 0, mulai: (OPSI && OPSI.mulaiPilihan && OPSI.mulaiPilihan[0]) || '', foto: '', fotoDriver: '', ttd: '', drafDipulihkan: false };
  }
  function bukaForm(isi) {
    tab = 'baru'; pesanForm = '';
    lapis(memuatHtml('Memuat data driver...'));
    muatOpsi(false).then(function () {
      if (tab !== 'baru' || !lapisEl) return;
      if (isi) { F = Object.assign(formKosong(), isi); rapikan(); gambarForm(); return; }
      if (F) { rapikan(); gambarForm(); return; }
      Simpan.ambil(kunciDraf()).then(function (v) {
        var d = null; try { d = JSON.parse(v || 'null'); } catch (e) { d = null; }
        F = formKosong(); if (d && typeof d === 'object') { F = Object.assign(F, d, { drafDipulihkan: true }); }
        rapikan(); if (tab === 'baru' && lapisEl) gambarForm();
      });
    }, function (e) {
      if (tab !== 'baru' || !lapisEl) return;
      lapis('<div class="kartu kosongKm">' + IK('alarm', 'besar') + '<b>Form ajuan belum bisa dibuka</b><small>' + esc(e.message) + '</small><button type="button" class="tKecil" data-k="ulangOpsi" style="margin-top:10px">Coba lagi</button></div>');
    });
  }
  /** jaga isian tetap sah terhadap hak & aturan terbaru */
  function rapikan() {
    if (!OPSI) return;
    if (!bolehDrv()) F.untuk = KRY; else if (!bolehDiri()) F.untuk = DRV;
    if (F.untuk === KRY) { F.jenis = HP; F.driver = ''; }
    if (F.driver && !driverPilih()) F.driver = '';
    var mx = (aturan().tenorMaks || {})[F.untuk] || 3; if (F.tenor > mx) F.tenor = 0;
    if ((OPSI.mulaiPilihan || []).indexOf(F.mulai) < 0) F.mulai = (OPSI.mulaiPilihan || [])[0] || '';
  }
  var tDraf = null;
  function simpanDraf() { clearTimeout(tDraf); tDraf = setTimeout(function () { if (!F) return; var d = Object.assign({}, F); delete d.drafDipulihkan; Simpan.taruh(kunciDraf(), JSON.stringify(d)); }, 500); }
  function hapusDraf() { clearTimeout(tDraf); return Simpan.taruh(kunciDraf(), null); }
  function pilih(nama, nilai, label) { return '<button type="button" class="' + (F[nama] === nilai ? 'on' : '') + '" data-k="set:' + nama + ':' + nilai + '">' + label + '</button>'; }
  function namaOrang() { return F.untuk === KRY ? ((OPSI && OPSI.diri && OPSI.diri.nama) || 'kamu') : (F.driver || 'driver'); }
  function infoHtml() {
    var A = aturan(), d = driverPilih(), h = '', ren = F.jenis === HP && F.harga > 0 && F.tenor > 0 ? rencana(F.harga, F.tenor) : [];
    if (F.untuk === DRV && d && !angkaGaji(d)) {
      h += '<div class="kbInfo"><div class="kecil">Angka gaji driver tidak ditampilkan untuk akunmu. Server tetap memeriksa perkiraan sisa gaji sesudah ajuan untuk aturan ACC Pak Fanza.</div></div>';
    } else if (F.untuk === DRV && d) {
      var potIni = potonganIni(), stl = d.sisa - potIni;
      h += '<div class="kbInfo"><div class="br"><span>Gaji kotor ' + esc(bulan(OPSI.periode)) + '</span><b>' + rp(d.gajiKotor) + '</b></div>'
        + '<div class="br"><span>Potongan tercatat (cicilan + kasbon)</span><b>' + rp(-d.potongan) + '</b></div>'
        + (d.menunggu ? '<div class="br"><span>Kasbon ajuan masih proses</span><b>' + rp(-d.menunggu) + '</b></div>' : '')
        + '<div class="br"><span>Perkiraan sisa gaji sekarang</span><b>' + rp(Math.max(0, d.sisa)) + '</b></div>'
        + (potIni ? '<div class="br"><span>Ajuan ini ' + (F.jenis === HP ? '(cicilan ke-1)' : '') + '</span><b>' + rp(-potIni) + '</b></div>' : '')
        + '<div class="br tot"><span>Perkiraan sisa setelah ajuan</span><b class="' + (stl < A.batasSisa ? 'merah' : 'hijau') + '">' + rp(Math.max(0, stl)) + '</b></div>'
        + (stl < 0 ? '<div class="kecil" style="margin-top:4px;color:var(--tKuning)">Sisa gaji tidak minus: kekurangan ' + rp(-stl) + ' dibawa ke bulan depan (sisa kasbon terbawa).</div>' : '')
        + (F.jenis === HP && F.mulai !== OPSI.periode && F.mulai ? '<div class="kecil" style="margin-top:4px">Cicilan mulai dipotong ' + esc(bulan(F.mulai)) + ', gaji ' + esc(bulan(OPSI.periode)) + ' belum terpotong.</div>' : '')
        + '<div class="kecil" style="margin-top:4px">' + d.rit + ' rit tercatat · perkiraan, bisa berubah sampai tutup buku.</div></div>';
    } else if (F.untuk === KRY) {
      h += '<div class="kbInfo"><div class="kecil">Gaji karyawan tidak dihitung sistem. Potongan cicilan direkap untuk HRD tiap bulan.</div></div>';
    }
    var ada = F.jenis === HP ? (F.untuk === KRY ? (OPSI.diri || {}).cicilanAda : d && d.cicilanAda) : '';
    if (ada) h += '<div class="kbAcc merah">' + IK('alarm') + '<span>' + esc(namaOrang()) + ' masih punya cicilan HP: ' + esc(ada) + '. Satu orang hanya boleh 1 cicilan HP berjalan.</span></div>';
    var p = perluPimpinan();
    if (!p.length && F.untuk === DRV && d && !angkaGaji(d)) return h + '<div class="kbAcc biru">' + IK('centang') + '<span>Langsung ke admin untuk ditransfer, kecuali perkiraan sisa gaji driver sesudah ajuan di bawah ' + rp(A.batasSisa) + ' (dicek server, lalu perlu ACC pimpinan dulu).</span></div>';
    h += p.length ? '<div class="kbAcc">' + IK('alarm') + '<span>Butuh ACC pimpinan (Pak Fanza / Pak Reza) dulu, lalu admin transfer: ' + esc(p.join('; ')) + '.</span></div>'
      : '<div class="kbAcc biru">' + IK('centang') + '<span>Langsung ke admin: transfer + unggah bukti di Input DO.</span></div>';
    return h;
  }
  function rencanaHtml() {
    if (!(F.harga > 0 && F.tenor > 0)) return '<div class="kbRencana">Pilih tenor untuk melihat cicilan per bulan.</div>';
    var r = rencana(F.harga, F.tenor), sama = r.every(function (x) { return x === r[0]; });
    return '<div class="kbRencana">Tanpa DP · <b>' + r.length + 'x</b> potong gaji: ' + (sama ? '<b>' + rp(r[0]) + '</b> per bulan' : r.map(function (x) { return '<b>' + rp(x) + '</b>'; }).join(', '))
      + ' · ' + esc(bulan(F.mulai)) + (r.length > 1 ? ' – ' + esc(bulan(geser(F.mulai, r.length - 1))) : '') + (sama ? '' : '<br>Dibulatkan ke ribuan, sisa pembulatan di cicilan terakhir.') + '</div>';
  }
  function gambarForm() {
    var A = aturan(), mx = (A.tenorMaks || {})[F.untuk] || 3, bd = bolehDrv(), di = bolehDiri(), h = '';
    if (!bd && !di) { lapis('<div class="kartu kosongKm">' + IK('alarm', 'besar') + '<b>Belum ada hak mengajukan</b><small>Akunmu tidak bisa mengajukan kasbon / cicilan HP.</small></div>'); return; }
    if (F.drafDipulihkan) h += '<div class="pitaData">' + IK('dokumen') + '<span>Draf terakhir dipulihkan.</span><button type="button" data-k="buangDraf">Mulai baru</button></div>';
    h += '<div class="kartu notaForm">';
    if (bd && di) h += '<label class="lb">Ajuan untuk</label><div class="segmen">' + pilih('untuk', DRV, IK('truk') + 'Driver') + pilih('untuk', KRY, IK('profil') + 'Saya sendiri') + '</div>';
    if (F.untuk === DRV) {
      var D = (OPSI.drivers || []);
      if (window.WHL_PEMILIH && window.WHL_PEMILIH.gaya) window.WHL_PEMILIH.gaya();
      var dp = driverPilih(); /* v3.24 (Reza 10.55): pemilih yang bisa dicari (sama dengan Nota bengkel); driver tanpa lambung = SERAP */
      h += '<label class="lb" for="kbDriver">Driver <i class="wajib">wajib</i></label><button type="button" class="isian ntPilih" id="kbDriver" data-k="pilihDriver"><span class="' + (dp ? 'v' : 'ph') + '">' + esc(dp ? labelDriver(dp) : 'Pilih driver (' + D.length + ')') + '</span><i>▾</i></button>';
      h += '<label class="lb">Jenis</label><div class="segmen">' + pilih('jenis', KASBON, IK('dokumen') + 'Kasbon') + pilih('jenis', HP, '📱 Cicilan HP') + '</div>';
    } else {
      var di = OPSI.diri || {};
      h += '<div class="kbInfo" style="margin-top:0"><div class="br"><span>Nama</span><b>' + esc(di.nama || '-') + '</b></div><div class="br"><span>NRP</span><b>' + esc(di.nrp || '-') + '</b></div>' + (di.jabatan ? '<div class="br"><span>Jabatan</span><b>' + esc(di.jabatan) + '</b></div>' : '') + '</div>'
        + '<div class="kecil" style="margin:4px 2px 0">Karyawan hanya bisa mengajukan <b>cicilan HP</b> untuk dirinya sendiri (maks ' + mx + 'x potong gaji).</div>';
    }
    if (F.jenis === KASBON) {
      h += '<label class="lb" for="kbNominal">Nominal kasbon <i class="wajib">wajib</i></label><input class="isian notaRp" id="kbNominal" data-f="nominal" inputmode="numeric" placeholder="Rp 0" value="' + (F.nominal ? rp(F.nominal) : '') + '">'
        + '<label class="lb" for="kbAlasan">Alasan <i class="wajib">wajib</i></label><textarea class="isian bnrTA" id="kbAlasan" data-f="alasan" rows="2" maxlength="200" placeholder="Untuk keperluan apa">' + esc(F.alasan) + '</textarea>'
        + '<label class="lb">Foto driver <i class="wajib">wajib</i></label><div class="kbFotoDrv">'
        + (F.fotoDriver ? '<img src="' + F.fotoDriver + '" alt="Foto driver">' : '')
        + '<div class="pil"><label>' + IK('absen') + (F.fotoDriver ? 'Foto ulang (kamera depan)' : 'Kamera depan') + '<input type="file" accept="image/*" capture="user" data-fotodrv="1" hidden></label>'
        + '<label>' + IK('absen') + 'Kamera belakang<input type="file" accept="image/*" capture="environment" data-fotodrv="1" hidden></label>'
        + (F.fotoDriver ? '<button type="button" class="tKecil" data-k="hapusFotoDrv" style="margin:0;min-height:38px">Hapus foto</button>' : '') + '</div></div>'
        + '<div class="kecil" style="margin-top:4px">Foto wajah ' + esc(namaOrang()) + ' saat mengajukan, jadi lampiran ajuan.</div>';
    } else {
      h += '<label class="lb" for="kbBarang">Merk / tipe HP <i class="wajib">wajib</i></label><input class="isian kapital" id="kbBarang" data-f="barang" maxlength="80" placeholder="mis. Samsung A15 128GB" value="' + esc(F.barang) + '">'
        + '<label class="lb" for="kbHarga">Harga HP <i class="wajib">wajib</i></label><input class="isian notaRp" id="kbHarga" data-f="harga" inputmode="numeric" placeholder="Rp 0" value="' + (F.harga ? rp(F.harga) : '') + '">'
        + '<label class="lb">Tenor (kali potong gaji, maks ' + mx + ') <i class="wajib">wajib</i></label><div class="kbPil">' + Array.apply(null, Array(mx)).map(function (_, i) { var t = i + 1; return '<button type="button" class="' + (F.tenor === t ? 'on' : '') + '" data-k="tenor:' + t + '">' + t + 'x</button>'; }).join('') + '</div>'
        + '<label class="lb">Mulai potong</label><div class="kbPil">' + (OPSI.mulaiPilihan || []).map(function (m) { return '<button type="button" class="' + (F.mulai === m ? 'on' : '') + '" data-k="mulai:' + esc(m) + '">' + esc(bulan(m)) + '</button>'; }).join('') + '</div>'
        + '<div id="kbRencana">' + rencanaHtml() + '</div>'
        + '<label class="lb">Foto nota HP <i class="wajib">wajib</i></label><div class="notaFoto">'
        + (F.foto ? '<span><img src="' + F.foto + '" alt="Foto nota"><button type="button" data-k="hapusFoto" aria-label="Hapus foto">✕</button></span>' : '<label class="notaTambah notaKamera">' + IK('absen') + '<small>📷 Kamera</small><input type="file" accept="image/*" capture="environment" data-foto="1" hidden></label><label class="notaTambah notaGaleri">' + IK('kotak') + '<small>🖼️ Galeri</small><input type="file" accept="image/*" data-foto="1" hidden></label>') + '</div>';
    }
    h += '<div id="kbInfo">' + infoHtml() + '</div>';
    h += '<label class="lb">Tanda tangan ' + esc(F.untuk === KRY ? 'kamu' : 'driver') + ' <i class="wajib">wajib</i></label><div class="kbTtd">'
      + (F.ttd ? '<img src="' + F.ttd + '" alt="Tanda tangan"><button type="button" class="tKecil" data-k="ttd">Ulangi</button>' : '<button type="button" class="kbTtdKosong" data-k="ttd">✍️ Tanda tangan di HP</button>') + '</div>'
      + '<div class="kecil" style="margin-top:4px">' + esc(F.untuk === KRY ? 'Kamu' : 'Driver') + ' tanda tangan dengan jari: setuju gaji dipotong sesuai ajuan ini.</div>';
    h += '<div class="pesan" id="kbPesan">' + esc(pesanForm) + '</div><button type="button" class="tUtama" data-k="kirim"' + (mengirim ? ' disabled' : '') + '>' + (mengirim ? '<span class="putar"></span> Mengirim...' : 'Kirim ajuan') + '</button>'
      + '<div class="kecil" style="text-align:center;margin:8px 0 6px">Isian tersimpan otomatis sebagai draf. Kalau sinyal putus, ajuan disimpan di HP dan dikirim otomatis.</div></div>';
    lapis(h);
  }
  function setNilai(k, v) { if (!F) return; F[k] = (k === 'nominal' || k === 'harga') ? angka(v) : v; }
  function simpanIsian() { if (!lapisEl || !F) return; Array.prototype.forEach.call(lapisEl.querySelectorAll('[data-f]'), function (e) { setNilai(e.getAttribute('data-f'), e.value); }); }
  function segarInfo() { var a = document.getElementById('kbInfo'); if (a) a.innerHTML = infoHtml(); var b = document.getElementById('kbRencana'); if (b) b.innerHTML = rencanaHtml(); }
  function ketik(ev) {
    var e = ev.target; if (!F || !e.getAttribute) return; if (e.id === 'kbAlasanTolak') { tolakAlasan = e.value; return; }
    var k = e.getAttribute('data-f'); if (!k) return; setNilai(k, e.value); if (k === 'nominal' || k === 'harga') segarInfo(); simpanDraf();
  }
  function lepasFokus(ev) {
    var e = ev.target; if (!F || !e.getAttribute) return; var k = e.getAttribute('data-f'); if (!k) return;
    if (k === 'nominal' || k === 'harga') { var n = angka(e.value); e.value = n ? rp(n) : ''; }
    if (e.classList && e.classList.contains('kapital')) { e.value = e.value.toUpperCase().replace(/\s+/g, ' ').trim(); setNilai(k, e.value); }
    simpanDraf();
  }
  function ubah(ev) {
    var e = ev.target; if (!e.getAttribute) return;
    if (e.getAttribute('data-f')) { setNilai(e.getAttribute('data-f'), e.value); if (e.getAttribute('data-f') === 'driver') { simpanIsian(); gambarForm(); } simpanDraf(); return; }
    if (e.getAttribute('data-fotodrv') && e.files && e.files[0]) {
      var bk = e.files[0], pd = document.getElementById('kbPesan'); e.value = ''; simpanIsian(); if (pd) pd.textContent = 'Mengolah foto driver...';
      fotoKecil(bk).then(function (d) { F.fotoDriver = d; pesanForm = ''; gambarForm(); simpanDraf(); R.getar && R.getar(); }, function (x) { if (pd) pd.textContent = 'Foto driver gagal: ' + x.message; R.bunyi && R.bunyi('gagal'); });
      return;
    }
    if (e.getAttribute('data-foto') && e.files && e.files[0]) {
      var berkas = e.files[0], p = document.getElementById('kbPesan'); e.value = ''; simpanIsian(); if (p) p.textContent = 'Mengompres foto...';
      kompres(berkas).then(function (d) { F.foto = d; pesanForm = ''; gambarForm(); simpanDraf(); R.getar && R.getar(); }, function (x) { if (p) p.textContent = 'Foto gagal: ' + x.message; R.bunyi && R.bunyi('gagal'); });
    }
  }
  function periksa() {
    simpanIsian(); var A = aturan(), mx = (A.tenorMaks || {})[F.untuk] || 3, d = driverPilih();
    if (F.untuk === DRV && !d) return 'Pilih driver dulu.';
    if (F.jenis === KASBON) { if (!(F.nominal > 0)) return 'Isi nominal kasbon.'; if (!String(F.alasan || '').trim()) return 'Isi alasan kasbon.'; if (!/^data:image\/jpeg;base64,/.test(String(F.fotoDriver || ''))) return 'Ambil foto driver dulu.'; }
    else {
      if (!String(F.barang || '').trim()) return 'Isi merk / tipe HP.';
      if (!(F.harga > 0)) return 'Isi harga HP.';
      if (!(F.tenor >= 1 && F.tenor <= mx)) return 'Pilih tenor 1 sampai ' + mx + ' kali.';
      if (!F.foto) return 'Lampirkan foto nota HP.';
    }
    if (!F.ttd) return 'Tanda tangan ' + (F.untuk === KRY ? 'kamu' : 'driver') + ' belum ada.';
    return '';
  }
  function paket(cid) {
    var d = { cid: cid, untuk: F.untuk, jenis: F.jenis, ttd: F.ttd };
    if (F.untuk === DRV) d.driver = F.driver;
    if (F.jenis === KASBON) { d.nominal = F.nominal; d.alasan = String(F.alasan || '').trim(); d.fotoDriver = F.fotoDriver; }
    else { d.barang = String(F.barang || '').toUpperCase().replace(/\s+/g, ' ').trim(); d.harga = F.harga; d.tenor = F.tenor; d.mulai = F.mulai; d.foto = F.foto; }
    return d;
  }
  function ringkas(d) { return (d.jenis === HP ? 'Cicilan HP ' : 'Kasbon ') + (d.untuk === KRY ? ((OPSI && OPSI.diri && OPSI.diri.nama) || 'saya') : d.driver) + ' · ' + rp(d.jenis === HP ? d.harga : d.nominal) + (d.jenis === HP ? ' · ' + d.tenor + 'x' : ''); }
  function kirim() {
    var salah = periksa();
    if (salah) { pesanForm = salah; var p = document.getElementById('kbPesan'); if (p) p.textContent = salah; R.bunyi && R.bunyi('gagal'); R.getar && R.getar('awas'); return; }
    var cid = 'k' + idAcak(), d = paket(cid), item = { cid: cid, waktu: Date.now(), ringkas: ringkas(d), d: d, form: Object.assign({}, F, { drafDipulihkan: false, fotoDriver: '' }) }, perlu = perluPimpinan();
    mengirim = true; pesanForm = ''; gambarForm();
    antre().then(function (A) { return taruhAntre(A.concat([item])); }).then(function () { return kirimSatu(item); }).then(function (h) {
      mengirim = false;
      if (h.ok) {
        hapusDraf(); F = null; OPSI_T = 0;
        R.sukses({ judul: 'Ajuan terkirim', sub: (h.perluPimpinan != null ? h.perluPimpinan : perlu.length) ? 'Menunggu ACC pimpinan, lalu admin transfer.' : 'Menunggu admin transfer (Input DO).', rinci: [['No. ajuan', h.id], ['Untuk', d.untuk === KRY ? 'Saya sendiri' : d.driver], [d.jenis === HP ? 'Cicilan HP' : 'Kasbon', rp(d.jenis === HP ? d.harga : d.nominal)]], konfeti: false });
        daftar('daftar'); return;
      }
      if (h.ditolak) { hapusAntre(cid); pesanForm = 'Server menolak: ' + h.pesan; gambarForm(); R.bunyi && R.bunyi('gagal'); R.getar && R.getar('awas'); return; }
      hapusDraf(); F = null; roti('Sinyal lemah: ajuan disimpan di HP dan dikirim otomatis.'); daftar('daftar');
    }).catch(function (e) { mengirim = false; if (!F) return; pesanForm = 'Gagal menyimpan di HP: ' + (e && e.message); gambarForm(); });
  }
  /** kirim 1 item antrean -> {ok,id,perluPimpinan} | {ditolak,pesan} | {tunda} ; cid sama dipakai ulang -> server tidak menyimpan dobel */
  function kirimSatu(item) {
    return API.Pusat.kasbonAjukan(sesi(), item.d).then(function (h) {
      if (h && h.ok) return hapusAntre(item.cid).then(function () { return { ok: true, id: h.id, perluPimpinan: h.perluPimpinan }; });
      if (h && h.login === false) return { tunda: true };
      item.salah = (h && h.pesan) || 'ditolak server'; return ubahAntre(item).then(function () { return { ditolak: true, pesan: item.salah }; });
    }, function () { return { tunda: true }; });
  }
  function ubahAntre(item) { return antre().then(function (A) { return taruhAntre(A.map(function (x) { return x.cid === item.cid ? item : x; })); }); }
  function hapusAntre(cid) { return antre().then(function (A) { return taruhAntre(A.filter(function (x) { return x.cid !== cid; })); }); }
  var sedangAntre = false;
  function kirimAntrean() {
    if (sedangAntre || mengirim || !sesi() || !boleh() || !navigator.onLine) return Promise.resolve();
    sedangAntre = true;
    return antre().then(function (A) {
      var L = A.filter(function (x) { return !x.salah; }), terkirim = 0, ditolak = 0;
      return L.reduce(function (p, x) { return p.then(function () { return kirimSatu(x).then(function (h) { if (h.ok) terkirim++; if (h.ditolak) ditolak++; }); }); }, Promise.resolve()).then(function () {
        sedangAntre = false;
        if (terkirim || ditolak) { roti((terkirim ? terkirim + ' ajuan kasbon tertunda terkirim. ' : '') + (ditolak ? ditolak + ' ajuan ditolak server, cek "Belum terkirim".' : '')); if (lapisEl && tab === 'daftar') daftar('daftar'); }
      });
    }).catch(function () { sedangAntre = false; });
  }
  window.addEventListener('online', function () { setTimeout(kirimAntrean, 1500); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kirimAntrean(); });
  setInterval(kirimAntrean, 60000);

  /* ---------- TTD jari di kanvas -> PNG ---------- */
  function bukaTtd() {
    simpanIsian(); tutupTtd(); pasangGaya();
    ttdEl = document.createElement('div'); ttdEl.className = 'lapis ksnLapis kbTtdLapis'; document.body.appendChild(ttdEl);
    var nama = namaOrang();
    ttdEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-t="tutup" aria-label="Kembali">‹</button><div class="nm">Tanda tangan<b>' + esc(nama) + '</b></div></div>'
      + '<div class="ksnIsi"><div class="kecil" style="margin:0 2px 10px;font-size:13.5px;line-height:1.5">Berikan HP ke <b>' + esc(nama) + '</b>. Tanda tangan dengan jari di kotak putih: setuju gaji dipotong '
      + esc(F.jenis === HP ? rp(F.harga) + ' (' + (F.tenor || '?') + 'x cicilan HP ' + (F.barang || '') + ')' : rp(F.nominal) + ' (kasbon)') + '.</div>'
      + '<div class="kbKanvasB" id="kbKanvasB" style="height:min(56vh,340px)"><canvas id="kbKanvas"></canvas><div class="garis"></div><div class="x">✕</div><div class="tip" id="kbTip">Tanda tangan di sini</div></div>'
      + '<div class="pesan" id="kbTtdPesan"></div><div class="duaTombol"><button type="button" class="tKecil" data-t="hapus">Hapus</button><button type="button" class="tUtama" style="margin-top:0" data-t="simpan">Simpan tanda tangan</button></div></div>';
    requestAnimationFrame(function () { ttdEl.classList.add('tampil'); siapKanvas(); });
    ttdEl.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-t]'); if (!b) return; var n = b.getAttribute('data-t');
      if (n === 'tutup') tutupTtd();
      else if (n === 'hapus') bersihKanvas();
      else if (n === 'simpan') {
        if (PANJANG < 80) { var p = document.getElementById('kbTtdPesan'); if (p) p.textContent = 'Tanda tangan terlalu pendek. Coba lagi lebih jelas.'; R.bunyi && R.bunyi('gagal'); return; }
        F.ttd = KANVAS.toDataURL('image/png'); tutupTtd(); pesanForm = ''; gambarForm(); simpanDraf(); R.getar && R.getar('sukses');
      }
    });
  }
  var KANVAS = null, CX = null, PANJANG = 0;
  function siapKanvas() {
    var c = document.getElementById('kbKanvas'), box = document.getElementById('kbKanvasB'); if (!c || !box) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = box.clientWidth, h = box.clientHeight;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); KANVAS = c; CX = c.getContext('2d'); CX.scale(dpr, dpr);
    bersihKanvas();
    var turun = false, lx = 0, ly = 0;
    function titik(e) { var r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    c.addEventListener('pointerdown', function (e) { e.preventDefault(); try { c.setPointerCapture(e.pointerId); } catch (x) { /* */ } turun = true; var p = titik(e); lx = p[0]; ly = p[1]; CX.beginPath(); CX.arc(lx, ly, 1.3, 0, 7); CX.fill(); var t = document.getElementById('kbTip'); if (t) t.style.display = 'none'; });
    c.addEventListener('pointermove', function (e) { if (!turun) return; e.preventDefault(); var p = titik(e); CX.beginPath(); CX.moveTo(lx, ly); CX.lineTo(p[0], p[1]); CX.stroke(); PANJANG += Math.hypot(p[0] - lx, p[1] - ly); lx = p[0]; ly = p[1]; });
    var angkat = function () { turun = false; };
    c.addEventListener('pointerup', angkat); c.addEventListener('pointercancel', angkat); c.addEventListener('pointerleave', angkat);
  }
  function bersihKanvas() {
    if (!CX || !KANVAS) return; PANJANG = 0;
    CX.save(); CX.setTransform(1, 0, 0, 1, 0, 0); CX.fillStyle = '#fff'; CX.fillRect(0, 0, KANVAS.width, KANVAS.height); CX.restore();
    CX.strokeStyle = '#0b1a3a'; CX.fillStyle = '#0b1a3a'; CX.lineWidth = 2.6; CX.lineCap = 'round'; CX.lineJoin = 'round';
    var t = document.getElementById('kbTip'); if (t) t.style.display = '';
  }
  function tutupTtd() { if (!ttdEl) return; var d = ttdEl; ttdEl = null; KANVAS = null; CX = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); }

  /* ---------- klik ---------- */
  function klik(ev) {
    var b = ev.target.closest('[data-k]'); if (!b || !lapisEl || !lapisEl.contains(b)) return; var n = b.getAttribute('data-k');
    if (n === 'kembali') { if (tab === 'baru' && F) { simpanIsian(); simpanDraf(); daftar('daftar'); } else tutup(); return; }
    if (n.indexOf('tab:') === 0) { var t = n.slice(4); tabOtomatis = false; if (tab === 'baru' && F) { simpanIsian(); simpanDraf(); } tolakId = ''; if (t === 'baru') bukaForm(); else daftar(t); return; }
    if (n === 'muatUlang') { daftar(tab); return; }
    if (n === 'ulangOpsi') { bukaForm(); return; }
    if (n === 'buangDraf') { hapusDraf(); F = formKosong(); rapikan(); pesanForm = ''; gambarForm(); return; }
    if (n.indexOf('set:') === 0) { simpanIsian(); var p = n.split(':'); F[p[1]] = p.slice(2).join(':'); rapikan(); pesanForm = ''; gambarForm(); simpanDraf(); R.getar && R.getar(); return; }
    if (n.indexOf('tenor:') === 0) { simpanIsian(); F.tenor = +n.slice(6); gambarForm(); simpanDraf(); R.getar && R.getar(); return; }
    if (n.indexOf('mulai:') === 0) { simpanIsian(); F.mulai = n.slice(6); gambarForm(); simpanDraf(); return; }
    if (n === 'hapusFoto') { simpanIsian(); F.foto = ''; gambarForm(); simpanDraf(); return; }
    if (n === 'hapusFotoDrv') { simpanIsian(); F.fotoDriver = ''; gambarForm(); simpanDraf(); return; }
    if (n.indexOf('bukti:') === 0) { var ib = n.slice(6), xb = (LIST || []).concat(PIMP).filter(function (z) { return z.id === ib; })[0]; if (xb && xb.buktiUrl) bukaTautan(xb.buktiUrl); return; }
    if (n === 'ttd') { bukaTtd(); return; }
    if (n === 'pilihDriver') { simpanIsian(); bukaPilihDriver(); return; }
    if (n === 'kirim') { if (!mengirim) kirim(); return; }
    if (n === 'kirimSekarang') { kirimAntrean().then(function () { daftar('daftar'); }); return; }
    if (n.indexOf('ubahAntre:') === 0) {
      var ia = +n.slice(10); antre().then(function (A) { var it = A[ia]; if (!it) return; return hapusAntre(it.cid).then(function () { F = null; bukaForm(Object.assign({}, it.form || {}, { fotoDriver: (it.d && it.d.fotoDriver) || '' })); pesanForm = it.salah ? 'Server menolak: ' + it.salah : ''; }); });
      return;
    }
    if (n.indexOf('pdf:') === 0) {
      roti('Menyiapkan PDF…');
      API.Pusat.kasbonPdf(sesi(), n.slice(4)).then(function (h) { if (!h || !h.ok) { roti((h && h.pesan) || 'Dokumen belum bisa dibuka.'); return; } (window.WHL_GAJI && window.WHL_GAJI.bukaPdf ? window.WHL_GAJI.bukaPdf : function () { })(h.nama || 'ajuan.pdf', h.b64); }, function (e) { roti(String((e && e.message) || 'Gagal mengambil dokumen.')); });
      return;
    }
    if (n.indexOf('acc:') === 0) {
      var id = n.slice(4), x = PIMP.filter(function (z) { return z.id === id; })[0]; if (!x) return;
      (R.tanya ? R.tanya({ judul: 'ACC ' + (x.jenis === HP ? 'cicilan HP' : 'kasbon') + '?', ket: x.nama + ' · ' + rp(x.nominal) + (x.adaBukti !== undefined ? '. Sesudah ACC, admin mentransfer dan mengunggah bukti, lalu mulai dipotong dari gaji.' : '. Catatan diaktifkan dan mulai dipotong dari gaji.'), ya: 'ACC', tidak: 'Batal' }) : Promise.resolve(true)).then(function (y) { if (y) putus(id, 'ACC', ''); });
      return;
    }
    if (n.indexOf('tolak:') === 0) { tolakId = n.slice(6); tolakAlasan = ''; gambarAcc(); setTimeout(function () { var t2 = document.getElementById('kbAlasanTolak'); if (t2) t2.focus(); }, 60); return; }
    if (n === 'batalTolak') { tolakId = ''; gambarAcc(); return; }
    if (n.indexOf('batalKb:') === 0) { var ik = n.slice(8), xk = (LIST || []).concat(PIMP).filter(function (z) { return z.id === ik; })[0]; if (xk) batalModal(xk, CTX, function () { OPSI_T = 0; daftar(tab === 'acc' ? 'acc' : 'daftar'); }); return; }
    if (n.indexOf('kirimTolak:') === 0) {
      var el = document.getElementById('kbAlasanTolak'); tolakAlasan = el ? el.value : tolakAlasan;
      if (!String(tolakAlasan).trim()) { roti('Tulis alasan penolakan dulu.'); R.bunyi && R.bunyi('gagal'); if (el) el.focus(); return; }
      putus(n.slice(11), 'TOLAK', String(tolakAlasan).trim()); return;
    }
  }
  /** untuk tombol Back HP (MainActivity -> WHL_KEMBALI menekan .ksnKp .kb lapis paling atas) */
  function kembali() { if (window.WHL_PEMILIH && window.WHL_PEMILIH.tutup()) return true; if (tutupBatal()) return true; if (ttdEl) { tutupTtd(); return true; } if (!lapisEl) return false; if (tab === 'baru' && F) { simpanIsian(); simpanDraf(); daftar('daftar'); } else tutup(); return true; }
  function lupakan() { OPSI = null; OPSI_T = 0; LIST = null; PIMP = []; BOLEHACC = false; F = null; if (lapisEl) tutup(); }
  window.WHL_KASBON = { pasang: function (c) { CTX = c; }, boleh: boleh, buka: buka, kirimAntrean: kirimAntrean, kembali: kembali, lupakan: lupakan,
    batalModal: batalModal, bisaBatal: bisaBatal, tutupBatal: tutupBatal,
    _uji: { rencana: rencana, isi: function () { return F; }, setDriver: setDriver } };
})();
