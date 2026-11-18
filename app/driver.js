/* WHL App v3.29 — MENU DRIVER (tahap 2 rancangan Upgrade\app-beranda-poin-16nov §2; kontrak server Armand Upgrade\app-tahap12-16nov\KONTRAK-APP.md REVISI 1).
 * - Kartu "Hari ini" driver di Beranda: ritase, KM (dari DO), tonase hari tambang ini + progres KM BULANAN ke 2 target bonus (angka dari server) + peringatan DO belum lapor.
 * - Layar Profil & ID card (QR untuk ditunjukkan di pos / portal), Dokumen saya (Kimper / SIMPER / MCU / SIM), DO saya (1–14 hari, foto DO, status lapor).
 * Semua RPC baca saja: pusatHariIniDriver / pusatProfilDriver / pusatDoSaya (args [token, ..., idKartu=null]). Fitur yang fungsinya belum ada di pusatPing disembunyikan.
 * Tanpa gaji / kasbon / uang (satu-satunya rupiah = nilai bonus target KM, keputusan Reza 16 Nov).
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA, Simpan = API.Simpan;
  var CTX = null, HI = null, HI_JALAN = false, lapisEl = null, jenisL = '', PROF = null, DOS = null, nHari = 7, P2HS = null, nP2h = 30; /* v3.37 P2H saya */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function IK(n) { return window.WHL_IKON ? window.WHL_IKON(n) : ''; }
  function ang(n, des) { var v = Number(n); if (!isFinite(v)) return '–'; return v.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: des == null ? 1 : des }); }
  function uangPendek(n) { n = Number(n) || 0; return n >= 1e6 ? 'Rp ' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : 'Rp ' + n.toLocaleString('id-ID'); }
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], HR = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  function tgl(t, hari) { var m = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return esc(t || ''); var d = new Date(+m[1], +m[2] - 1, +m[3]); return (hari ? HR[d.getDay()] + ', ' : '') + (+m[3]) + ' ' + BLN[+m[2] - 1] + (hari ? '' : ' ' + m[1]); }
  function sesi() { return CTX && CTX.sesi(); }
  function driver(S) { S = S || sesi(); return !!(S && S.user && S.user.peran === 'driver'); }
  function punya(fn) { return API.Pusat.asli() && API.Pusat.punya(fn); }
  /** server sudah siap untuk driver (dipakai juga untuk membuka blokir login driver) */
  function siap() { return punya('pusatHariIniDriver') || punya('pusatProfilDriver') || punya('pusatDoSaya'); }
  function akun() { var S = sesi(); return String((S && (S.idProfil || S.idKetik)) || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function panggil(fn, args) { return API.Pusat.panggil(fn, [sesi().tokenPusat].concat(args || []), 30000); }
  function gaya() {
    if (document.getElementById('drvGaya')) return; var st = document.createElement('style'); st.id = 'drvGaya';
    st.textContent = '.drvHi .hiStrip{grid-template-columns:repeat(3,1fr)}.drvBln{margin-top:9px;padding-top:9px;border-top:1px solid var(--garis)}.drvBlnAtas{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:12px;color:var(--redup);font-weight:700}.drvBlnAtas b{color:var(--teks);font-size:12.5px}.drvBlnAtas span b{font-family:Nunito,sans-serif;font-size:16px;font-weight:900}'
      + '.drvBar{position:relative;height:10px;border-radius:99px;background:var(--panel2);margin:12px 0 14px}.drvBar>i{position:absolute;left:0;top:0;bottom:0;border-radius:99px;background:linear-gradient(90deg,#20C3B4,#1E88E5)}.drvBar>em{position:absolute;top:-4px;width:3px;height:18px;margin-left:-1.5px;border-radius:2px;background:var(--redup)}.drvBar>em.ok{background:#16a34a}.drvTk{display:flex;flex-wrap:wrap;gap:5px;margin:-8px 0 8px}.drvTk span{font-size:11px;font-weight:800;padding:3px 8px;border-radius:99px;background:var(--panel2);color:var(--redup)}.drvTk span.ok{background:rgba(22,163,74,.14);color:#15803d}'
      + '.drvTeks{font-size:12.5px;font-weight:700}.drvTeks.ok{color:#16a34a}.drvKet{font-size:11.5px;color:var(--redup);margin-top:3px}'
      + '.drvPeringat{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border-radius:16px;padding:11px 13px;margin-bottom:12px;background:rgba(255,197,48,.18);color:var(--tKuning);font-weight:700;font-size:13.5px}.drvPeringat.merah{background:rgba(242,72,77,.14);color:var(--tMerah)}.drvPeringat small{display:block;font-weight:600;opacity:.85}.drvPeringat .ikn{width:22px;height:22px;flex:none}'
      + '.drvLapis .ksnIsi{padding-bottom:40px}.drvKartuId{text-align:center;padding:18px 16px}.drvFoto{width:84px;height:84px;border-radius:50%;margin:0 auto 10px;object-fit:cover;display:grid;place-items:center;background:var(--tint);color:var(--utama);font-size:28px;font-weight:900}'
      + '.drvKartuId h2{margin:0;font-size:19px}.drvKartuId .jab{color:var(--redup);font-weight:700;font-size:13px}.drvQr{width:min(230px,70vw);margin:14px auto 6px;padding:10px;background:#fff;border-radius:16px;box-shadow:0 0 0 1px var(--garis)}.drvQr svg{display:block;width:100%;height:auto}.drvIdTeks{font-family:Nunito,sans-serif;font-weight:900;font-size:18px;letter-spacing:.04em}'
      + '.drvData{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;text-align:left;font-size:13.5px;margin-top:12px}.drvData span{color:var(--redup)}.drvData b{text-align:right}'
      + '.drvDok{display:flex;align-items:center;gap:10px;padding:10px 2px;border-top:1px solid var(--garis)}.drvDok:first-child{border-top:0}.drvDok .tx{flex:1;min-width:0}.drvDok .tx b{display:block;font-size:14.5px}.drvDok .tx small{color:var(--redup);font-size:12px}'
      + '.drvSt{flex:none;font-style:normal;font-size:11.5px;font-weight:800;padding:4px 9px;border-radius:99px;background:var(--panel2);color:var(--redup)}.drvSt.hijau{background:rgba(22,163,74,.14);color:#15803d}.drvSt.kuning{background:rgba(255,197,48,.22);color:var(--tKuning)}.drvSt.merah{background:rgba(242,72,77,.14);color:var(--tMerah)}'
      + '.drvHari{margin:16px 4px 6px;display:flex;justify-content:space-between;align-items:baseline;font-size:14px;font-weight:800}.drvHari span{font-size:12px;color:var(--redup);font-weight:700}'
      + '.drvTrip{display:flex;gap:10px;padding:10px 2px;border-top:1px solid var(--garis)}.drvTrip:first-child{border-top:0}.drvTrip .jm{font-family:Nunito,sans-serif;font-weight:900;font-size:14px;width:44px;flex:none}.drvTrip .tx{flex:1;min-width:0}.drvTrip .tx b{display:block;font-size:14px}.drvTrip .tx small{display:block;color:var(--redup);font-size:12px}'
      + '.drvTrip img{width:46px;height:46px;border-radius:10px;object-fit:cover;flex:none}.drvRingkas{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}';
    document.head.appendChild(st);
  }

  /* ---------- Hari ini (Beranda) ---------- */
  function muat(ctx, paksa) {
    CTX = ctx || CTX; if (!driver() || !punya('pusatHariIniDriver') || HI_JALAN) return Promise.resolve();
    if (HI && HI.d && !paksa && Date.now() - HI.t < 5 * 60000) return Promise.resolve();
    HI_JALAN = true;
    var awal = HI ? Promise.resolve() : Simpan.ambil('whlDrvHi_' + akun()).then(function (v) { try { var c = JSON.parse(v || 'null'); if (c && !HI) { HI = { d: c, t: 0 }; if (CTX.perbarui) CTX.perbarui(); } } catch (e) { /* */ } });
    return awal.then(function () { return panggil('pusatHariIniDriver', [null]); }).then(function (h) {
      HI_JALAN = false;
      if (h && h.login === false) { if (CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (h && h.ok !== false) { HI = { d: h, t: Date.now() }; Simpan.taruh('whlDrvHi_' + akun(), JSON.stringify(h)); } else if (!HI || !HI.d) HI = { d: null, t: Date.now() };
      if (CTX.perbarui) CTX.perbarui();
    }, function () { HI_JALAN = false; if (HI) HI.t = Date.now(); });
  }
  function hariIniHtml() {
    if (!driver() || !punya('pusatHariIniDriver')) return '';
    if (!HI || Date.now() - HI.t > 5 * 60000) muat();
    var d = HI && HI.d; if (!d) return HI ? '' : '<div class="kartu hiKartu drvHi"><div class="hiBar"><b>Hari ini</b><span><span class="putar"></span></span></div></div>';
    gaya();
    var h = '';
    if (Number(d.doBelumLapor) > 0) h += '<button type="button" class="drvPeringat' + (Number(d.doNyangkut) > 0 ? ' merah' : '') + '" data-ke="drvDo">' + IK('alarm') + '<span>' + ang(d.doBelumLapor, 0) + ' DO belum lapor' + (Number(d.doNyangkut) > 0 ? ' · ' + ang(d.doNyangkut, 0) + ' nyangkut' : '') + '<small>Ketuk untuk lihat DO saya</small></span></button>';
    var S = [['Ritase', ang(d.ritase, 0), 'biru', ''], ['KM (dari DO)', ang(d.km, 0), 'toska', ''], ['Tonase', ang(d.tonase, 1), 'kuning', ' t']];
    h += '<div class="kartu hiKartu drvHi" data-ke="drvDo" role="group" aria-label="Kerja saya hari ini"><div class="hiBar"><b>Hari ini</b><span>' + (d.lambung ? esc(d.lambung) + ' · ' : '') + (d.diperbarui ? 'update ' + esc(String(d.diperbarui).replace(':', '.')) : '') + ' ›</span></div>'
      + '<div class="hiStrip">' + S.map(function (x) { return '<div class="hs ' + x[2] + '"><small>' + x[0] + '</small><b>' + x[1] + (x[3] && x[1] !== '–' ? '<em>' + x[3] + '</em>' : '') + '</b></div>'; }).join('') + '</div>'
      + (Number(d.tonaseBelumAda) > 0 ? '<div class="drvKet">' + ang(d.tonaseBelumAda, 0) + ' tiket hari ini belum ada tonase bongkar.</div>' : '')
      + setaraHtml({ setara: d.setaraRit, targetKmHari: d.targetKmHari != null ? d.targetKmHari : d.setaraRit && d.setaraRit.targetKmHari, kmHariIni: d.km, target: d.target, kmBulan: d.kmBulan }) /* v3.30 setara ritase per rute */
      + targetHtml(d) + '</div>';
    return h;
  }
  function targetHtml(d) {
    var T = d.target, L = T && Array.isArray(T.tingkat) ? T.tingkat.filter(function (x) { return Number(x.km) > 0; }) : [];
    var km = Number(d.kmBulan) || 0, ket = 'Ritase bulan ini ' + ang(d.ritaseBulan, 0) + ' · tonase ' + ang(d.tonaseBulan, 1) + ' t';
    var tanpa = Array.isArray(d.ruteTanpaJarak) && d.ruteTanpaJarak.length ? '<div class="drvKet">Jarak rute ' + esc(d.ruteTanpaJarak.join(', ')) + ' belum diisi admin (dihitung 0 km).</div>' : '';
    if (!L.length) return '<div class="drvBln"><div class="drvBlnAtas"><b>KM bulan ini (dari DO)</b><span><b>' + ang(km, 0) + '</b> km</span></div><div class="drvKet">' + ket + '</div>' + tanpa + '</div>';
    var maks = Math.max.apply(null, L.map(function (x) { return Number(x.km); })), B = T.berikut, isi = Math.min(100, km / maks * 100);
    var teks = B ? ang(km, 0) + ' / ' + ang(B.km, 0) + ' km · kurang ' + ang(T.sisaKm != null ? T.sisaKm : Math.max(0, B.km - km), 0) + ' km ke bonus ' + uangPendek(B.bonus) : 'Semua target bonus bulan ini tercapai: ' + uangPendek(T.bonusTercapai || L[L.length - 1].bonus) + ' 🎉';
    return '<div class="drvBln"><div class="drvBlnAtas"><b>KM bulan ini (dari DO)</b><span><b>' + ang(km, 0) + '</b> km</span></div>'
      + '<div class="drvBar" role="img" aria-label="Progres KM bulan ini ' + ang(km, 0) + ' dari ' + ang(maks, 0) + ' km"><i style="width:' + isi.toFixed(1) + '%"></i>'
      + L.map(function (x) { var ok = x.tercapai || km >= Number(x.km); return '<em class="' + (ok ? 'ok' : '') + '" style="left:' + (Number(x.km) / maks * 100).toFixed(1) + '%"></em>'; }).join('') + '</div>'
      + '<div class="drvTk">' + L.map(function (x, i) { var ok = x.tercapai || km >= Number(x.km); return '<span class="' + (ok ? 'ok' : '') + '">' + (ok ? '✓ ' : 'Target ' + (i + 1) + ': ') + ang(x.km, 0) + ' km · ' + uangPendek(x.bonus) + '</span>'; }).join('') + '</div>'
      + '<div class="drvTeks' + (B ? '' : ' ok') + '">' + teks + '</div><div class="drvKet">' + ket + '</div>' + tanpa + '</div>';
  }

  /* ---------- lapis ---------- */
  function lapis(judul, sub, isi) {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis drvLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik);
    }
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-d="tutup" aria-label="Kembali">‹</button><div class="nm">' + esc(sub) + '<b>' + esc(judul) + '</b></div></div><div class="ksnIsi">' + isi + '</div>';
  }
  function tutup() { if (!lapisEl) return false; var d = lapisEl; lapisEl = null; jenisL = ''; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); return true; }
  function gagal(pesan) { return '<div class="kartu kosongKm">' + IK('alarm', 'besar') + '<b>Belum bisa dimuat</b><small>' + esc(pesan) + '</small><button type="button" class="tKecil" data-d="ulang" style="margin-top:10px">Coba lagi</button></div>'; }
  function buka(ctx, jenis) {
    CTX = ctx || CTX; gaya(); jenisL = jenis;
    if (jenis === 'do') return bukaDo();
    if (jenis === 'p2h') return bukaP2h(); /* v3.37 */
    lapis(jenis === 'dok' ? 'Dokumen saya' : 'Profil & ID card', 'Driver WHL', R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>');
    panggil('pusatProfilDriver', [null]).then(function (h) {
      if (!lapisEl || jenisL !== jenis) return;
      if (h && h.login === false) { tutup(); if (CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (!h || h.ok === false) { lapis('Profil & ID card', 'Driver WHL', gagal((h && h.pesan) || 'Profil belum tersedia.')); return; }
      PROF = h; gambarProfil(jenis);
    }, function (e) { if (lapisEl && jenisL === jenis) lapis('Profil & ID card', 'Driver WHL', gagal(e.message)); });
  }
  var ST_DOK = { aman: ['hijau', 'Aman'], segera: ['kuning', 'Segera habis'], habis: ['merah', 'Habis'] };
  function gambarProfil(jenis) {
    var p = PROF, nama = p.namaLengkap || (sesi() && sesi().namaLengkap) || '', qr = p.qr || p.idKartu || '';
    var foto = p.foto ? '<img class="drvFoto" src="' + esc(p.foto) + '" alt="" referrerpolicy="no-referrer">' : '<span class="drvFoto">' + esc(String(nama).split(/\s+/).slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase()) + '</span>';
    var qrSvg = ''; try { qrSvg = qr && window.WHL_QR ? window.WHL_QR.svg(qr) : ''; } catch (e) { qrSvg = ''; }
    var kartu = '<div class="kartu drvKartuId">' + foto + '<h2>' + esc(nama) + '</h2><div class="jab">' + esc(p.jabatan || 'DRIVER') + ' · PT Whale Holder Logistic</div>'
      + (p.kartuAktif === false ? '<div style="margin-top:8px"><span class="drvSt merah">Kartu nonaktif</span></div>' : '')
      + (qrSvg ? '<div class="drvQr">' + qrSvg + '</div><div class="drvIdTeks">' + esc(p.idKartu || qr) + '</div><div class="kecil">Tunjukkan QR ini di pos / portal kalau kartu fisik ketinggalan.</div>' : '')
      + '<div class="drvData"><span>ID kartu</span><b>' + esc(p.idKartu || '-') + '</b><span>NRP</span><b>' + esc(p.nrp || '-') + '</b><span>Lambung utama</span><b>' + esc(p.lambungUtama || '-') + '</b>'
      + (p.lambungHariIni && p.lambungHariIni !== p.lambungUtama ? '<span>Lambung hari ini</span><b>' + esc(p.lambungHariIni) + '</b>' : '') + (p.grup ? '<span>Grup</span><b>' + esc(p.grup) + '</b>' : '') + '</div></div>';
    var D = Array.isArray(p.dokumen) ? p.dokumen : [];
    var dok = '<h2 class="bagW" id="drvDok">Dokumen saya</h2><div class="kartu">' + (D.length ? D.map(function (x) {
      var w = ST_DOK[x.status] || ['', x.status || 'Tidak ada data'], sisa = x.sisaHari == null ? '' : x.sisaHari < 0 ? 'lewat ' + (-x.sisaHari) + ' hari' : 'sisa ' + x.sisaHari + ' hari';
      return '<div class="drvDok"><div class="tx"><b>' + esc(x.jenis) + (x.nomor ? ' · ' + esc(x.nomor) : '') + '</b><small>' + (x.berlaku ? 'Berlaku s/d ' + tgl(x.berlaku) + (sisa ? ' · ' + sisa : '') : 'Tanggal belum ada di data') + '</small></div><em class="drvSt ' + w[0] + '">' + esc(w[1]) + '</em></div>';
    }).join('') : '<div class="kecil">Belum ada data dokumen.</div>') + '</div>'
      + (p.dokumenCatatan ? '<div class="kecil" style="margin:8px 4px">' + esc(p.dokumenCatatan) + '</div>' : '');
    lapis(jenis === 'dok' ? 'Dokumen saya' : 'Profil & ID card', 'Driver WHL', jenis === 'dok' ? dok + kartu : kartu + dok);
  }
  var ST_DO = { 'BELUM LAPOR': 'kuning', 'SUDAH LAPOR': 'hijau', RETUR: 'merah' };
  function bukaDo() {
    lapis('DO saya', 'Driver WHL', R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>');
    var n0 = nHari;
    panggil('pusatDoSaya', [nHari, null]).then(function (h) {
      if (!lapisEl || jenisL !== 'do' || n0 !== nHari) return;
      if (h && h.login === false) { tutup(); if (CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (!h || h.ok === false) { lapis('DO saya', 'Driver WHL', gagal((h && h.pesan) || 'Data DO belum tersedia.')); return; }
      DOS = h; gambarDo();
    }, function (e) { if (lapisEl && jenisL === 'do') lapis('DO saya', 'Driver WHL', gagal(e.message)); });
  }
  function gambarDo() {
    var d = DOS, K = d.ringkas || {}, P = Array.isArray(d.peringatan) ? d.peringatan : [], H = Array.isArray(d.hari) ? d.hari : [];
    var h = '<div class="segmen" style="margin-bottom:12px">' + [7, 14].map(function (n) { return '<button type="button" data-d="hari:' + n + '" class="' + (nHari === n ? 'on' : '') + '">' + n + ' hari</button>'; }).join('') + '</div>'
      + '<div class="drvRingkas"><span class="drvSt">' + ang(K.trip, 0) + ' trip</span>' + (K.belumLapor ? '<span class="drvSt kuning">' + ang(K.belumLapor, 0) + ' belum lapor</span>' : '<span class="drvSt hijau">Semua sudah lapor</span>') + (K.nyangkut ? '<span class="drvSt merah">' + ang(K.nyangkut, 0) + ' nyangkut</span>' : '') + '</div>';
    if (P.length) h += P.map(function (x) { return '<div class="drvPeringat' + (x.tingkat === 'merah' ? ' merah' : '') + '">' + IK('alarm') + '<span>' + esc(x.pesan || ('DO ' + x.id)) + '<small>Lapor DO ke admin / Pos secepatnya.</small></span></div>'; }).join('');
    h += H.map(function (x) {
      var T = Array.isArray(x.trip) ? x.trip : [];
      return '<div class="drvHari">' + tgl(x.hari, true) + '<span>' + ang(x.rit, 0) + ' rit' + (x.ton ? ' · ' + ang(x.ton, 1) + ' t' : '') + (x.km != null ? ' · ' + ang(x.km, 0) + ' km' : '') + '</span></div>'
        + '<div class="kartu">' + (T.length ? T.map(function (t) {
          var w = ST_DO[t.statusLapor] || '';
          return '<div class="drvTrip"><span class="jm">' + esc(String(t.jam || '').replace(':', '.')) + '</span><div class="tx"><b>' + esc(t.rute || '-') + '</b><small>' + esc(t.lambung || '') + (t.sjb ? ' · SJB ' + esc(t.sjb) : '') + (t.ton != null ? ' · ' + ang(t.ton, 2) + ' t' : '') + (t.km != null ? ' · ' + ang(t.km, 0) + ' km' : ' · jarak rute belum ada') + '</small>'
            + '<em class="drvSt ' + w + '" style="display:inline-block;margin-top:5px">' + esc(t.statusLapor || t.status || '-') + '</em></div>' + (t.foto ? '<button type="button" data-d="foto:' + esc(t.foto) + '" aria-label="Lihat foto DO" style="padding:0;background:none"><img src="' + esc(t.foto) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></button>' : '') + '</div>';
        }).join('') : '<div class="kecil">Tidak ada trip.</div>') + '</div>';
    }).join('');
    h += '<div class="kecil" style="margin:12px 4px;text-align:center">Data dari tiket Input DO' + (d.diperbarui ? ' · update ' + esc(String(d.diperbarui).replace(':', '.')) : '') + '.</div>';
    lapis('DO saya', 'Driver WHL · ' + tgl(d.dari) + ' – ' + tgl(d.sampai), h);
  }
  /* ---------- v3.37 P2H SAYA (p2h-gaspol-18nov, Reza 18 Nov: "P2H tetap di GASPOL Tab, di app driver cuma bisa lihat riwayatnya") ----------
   * RPC pusatP2hSaya(token, hari 7|30, idKartu=null) -> {hari:[{hari, jumlah, temuan, p2h:[{jam, lambung, status, dibatalkan, hasil, rusak[], catatan, jmlItem}]}],
   * ringkas:{hariP2h, totalP2h, temuan, hariIniSudah, hariIniJam, hariIniLambung}, items[], formIsi, keterangan, diperbarui}. Tanpa tombol isi P2H
   * (kecuali server menyalakan formIsi = tombol cadangan ke form P2H Harian, keputusan Reza). */
  var ST_REQ = { SELESAI: ['hijau', 'UJ selesai'], DITANDATANGANI: ['hijau', 'UJ ditandatangani'], DISETUJUI: ['hijau', 'UJ disetujui'], MENUNGGU: ['kuning', 'Menunggu admin'], MEMPROSES: ['kuning', 'Diproses admin'], DITOLAK: ['merah', 'UJ ditolak'], DIBATALKAN: ['', 'Dibatalkan'] };
  function gayaP2h() {
    if (document.getElementById('drvGayaP2h')) return; var st = document.createElement('style'); st.id = 'drvGayaP2h';
    st.textContent = '.p2hHi{display:flex;align-items:center;gap:12px;border-radius:16px;padding:12px 14px;margin-bottom:12px;font-weight:700;font-size:14px}.p2hHi.ok{background:rgba(22,163,74,.13);color:#15803d}.p2hHi.belum{background:rgba(255,197,48,.18);color:var(--tKuning)}.p2hHi small{display:block;font-weight:600;font-size:12px;opacity:.9}.p2hHi .ikn{width:24px;height:24px;flex:none}'
      + '.p2hBrs{display:flex;gap:10px;padding:11px 2px;border-top:1px solid var(--garis)}.p2hBrs:first-child{border-top:0}.p2hBrs .jm{font-family:Nunito,sans-serif;font-weight:900;font-size:14px;width:44px;flex:none;padding-top:1px}.p2hBrs .tx{flex:1;min-width:0}.p2hBrs .tx b{display:block;font-size:14px}'
      + '.p2hHasil{display:inline-block;margin-top:4px;font-size:12px;font-weight:800;padding:3px 9px;border-radius:99px}.p2hHasil.baik{background:rgba(22,163,74,.14);color:#15803d}.p2hHasil.temuan{background:rgba(242,72,77,.14);color:var(--tMerah)}'
      + '.p2hRusak{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px}.p2hRusak span{font-size:12px;font-weight:800;padding:4px 9px;border-radius:10px;background:rgba(242,72,77,.14);color:var(--tMerah);border:1px solid rgba(242,72,77,.35)}'
      + '.p2hCat{display:block;margin-top:5px;font-size:12px;color:var(--redup);overflow-wrap:anywhere}.p2hBrs.batal{opacity:.55}.p2hBrs.batal .tx b{text-decoration:line-through}.p2hBrs .drvSt{align-self:flex-start;margin-top:1px}'
      + '.p2hItem{margin-top:6px;font-size:12px;color:var(--redup);line-height:1.5}'
      + 'html[data-tema="gelap"] .p2hHi.ok,html[data-tema="gelap"] .p2hHasil.baik{color:#4ade80}html[data-tema="gelap"] .p2hHasil.temuan,html[data-tema="gelap"] .p2hRusak span{color:#fca5a5}';
    document.head.appendChild(st);
  }
  function bukaP2h() {
    gayaP2h(); lapis('P2H saya', 'Driver WHL · dari tablet GASPOL', R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>');
    var n0 = nP2h;
    panggil('pusatP2hSaya', [nP2h, null]).then(function (h) {
      if (!lapisEl || jenisL !== 'p2h' || n0 !== nP2h) return;
      if (h && h.login === false) { tutup(); if (CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (!h || h.ok === false) { lapis('P2H saya', 'Driver WHL', gagal((h && h.pesan) || 'Riwayat P2H belum tersedia.')); return; }
      P2HS = h; gambarP2h();
    }, function (e) { if (lapisEl && jenisL === 'p2h') lapis('P2H saya', 'Driver WHL', gagal(e.message)); });
  }
  function gambarP2h() {
    var d = P2HS, K = d.ringkas || {}, H = Array.isArray(d.hari) ? d.hari : [], nItem = Array.isArray(d.items) ? d.items.length : 0;
    var h = '<div class="segmen" style="margin-bottom:12px">' + [7, 30].map(function (n) { return '<button type="button" data-d="p2hHari:' + n + '" class="' + (nP2h === n ? 'on' : '') + '">' + n + ' hari</button>'; }).join('') + '</div>';
    h += K.hariIniSudah
      ? '<div class="p2hHi ok" role="status">' + IK('centang') + '<span>Sudah P2H hari ini' + (K.hariIniJam ? ' · ' + esc(String(K.hariIniJam).replace(':', '.')) : '') + (K.hariIniLambung ? ' · ' + esc(K.hariIniLambung) : '') + '<small>Hari tambang ' + tgl(d.hariTambang || d.sampai) + ' (06.00–06.00)</small></span></div>'
      : '<div class="p2hHi belum" role="status">' + IK('alarm') + '<span>Belum ada P2H hari ini<small>P2H diisi di tablet GASPOL sebelum minta uang jalan.</small></span></div>';
    h += '<div class="drvRingkas"><span class="drvSt">' + ang(K.hariP2h, 0) + ' hari P2H</span><span class="drvSt">' + ang(K.totalP2h, 0) + ' kali P2H</span>'
      + (Number(K.temuan) > 0 ? '<span class="drvSt merah">' + ang(K.temuan, 0) + ' ada temuan</span>' : Number(K.totalP2h) > 0 ? '<span class="drvSt hijau">Tanpa temuan</span>' : '') + '</div>';
    if (!H.length) h += '<div class="kartu kosongKm">' + IK('dokumen', 'besar') + '<b>Belum ada P2H</b><small>Tidak ada P2H GASPOL dalam ' + nP2h + ' hari terakhir.</small></div>';
    h += H.map(function (x) {
      var L = Array.isArray(x.p2h) ? x.p2h : [];
      return '<div class="drvHari">' + tgl(x.hari, true) + '<span>' + ang(x.jumlah, 0) + ' P2H' + (Number(x.temuan) > 0 ? ' · ' + ang(x.temuan, 0) + ' temuan' : '') + '</span></div>'
        + '<div class="kartu">' + L.map(function (p) {
          var R2 = Array.isArray(p.rusak) ? p.rusak : [], w = ST_REQ[String(p.status || '').toUpperCase()] || ['', p.status || '-'];
          return '<div class="p2hBrs' + (p.dibatalkan ? ' batal' : '') + '"><span class="jm">' + esc(String(p.jam || '').replace(':', '.')) + '</span><div class="tx"><b>' + esc(p.lambung || '-') + '</b>'
            + (R2.length ? '<span class="p2hHasil temuan">Ada temuan: ' + R2.length + ' item TIDAK BAIK</span><div class="p2hRusak">' + R2.map(function (r) { return '<span>✕ ' + esc(r) + '</span>'; }).join('') + '</div>'
              : '<span class="p2hHasil baik">Semua baik' + (p.jmlItem ? ' · ' + ang(p.jmlItem, 0) + ' item' : '') + '</span>')
            + (p.catatan ? '<span class="p2hCat">Catatan: ' + esc(p.catatan) + '</span>' : '') + '</div><em class="drvSt ' + w[0] + '">' + esc(w[1]) + '</em></div>';
        }).join('') + '</div>';
    }).join('');
    if (nItem) h += '<div class="p2hItem"><b>Item yang diperiksa (' + nItem + '):</b> ' + d.items.map(esc).join(' · ') + '</div>';
    if (d.formIsi && CTX && CTX.formP2h) h += '<button type="button" class="tKecil" data-d="p2hForm" style="width:100%;margin-top:14px">Isi P2H Harian (form Pos Kontrol)</button>';
    h += '<div class="kecil" style="margin:12px 4px;text-align:center">' + esc(d.keterangan || 'P2H diisi di tablet GASPOL.') + (d.diperbarui ? ' · update ' + esc(String(d.diperbarui).replace(':', '.')) : '') + '</div>';
    lapis('P2H saya', 'Driver WHL · ' + tgl(d.dari) + ' – ' + tgl(d.sampai), h);
  }
  function klik(ev) {
    var b = ev.target.closest('[data-d]'); if (!b) return; var n = b.getAttribute('data-d');
    if (n === 'tutup') { R.bunyi('tutup'); tutup(); }
    else if (n === 'ulang') buka(CTX, jenisL);
    else if (n.indexOf('hari:') === 0) { nHari = +n.slice(5) || 7; bukaDo(); }
    else if (n.indexOf('p2hHari:') === 0) { nP2h = +n.slice(8) || 30; bukaP2h(); } /* v3.37 */
    else if (n === 'p2hForm' && CTX.formP2h) CTX.formP2h();
    else if (n.indexOf('foto:') === 0 && CTX.bukaWeb) CTX.bukaWeb(n.slice(5));
  }
  function lupakan() { HI = null; PROF = null; DOS = null; P2HS = null; tutup(); }

  /* ---------- v3.30 SETARA RITASE per rute (Reza 17 Nov) ----------
   * Field server `setaraRit` (pusatHariIniDriver & pusatPoinSaya, Armand). Bentuk yang diterima (longgar):
   *   setaraRit: [ {rute:'107-PORT', kmRit:107}, ... ]   ATAU   { rute:[...], targetKmHari, kmHariIni, kurangKmHari }
   *   tiap rute: nama = rute|nama, km 1 rit = kmRit|km|jarak; opsional hitungan server: ritHari, ritKurang, ritBulan ([per tingkat] / angka).
   * Urutan rute = urutan server (2 teratas tampil ringkas, ketuk = semua rute + per bulan ke target bonus). Field tidak ada = tidak tampil. */
  var SETARA = null, setaraEl = null;
  function setaraDaftar(s) {
    var L = Array.isArray(s) ? s : (s && (s.rute || s.daftar)) || [];
    var pilih = function () { for (var i = 0; i < arguments.length; i++) if (arguments[i] != null && arguments[i] !== '') return arguments[i]; return null; };
    return (Array.isArray(L) ? L : []).map(function (x) {
      if (!x) return null; /* server V522: {rute, kmPerRit, ritPerHari, ritPerBulan, sisaRitHariIni, dipakaiBulanIni}; hitungan server dipakai, hitung lokal = cadangan */
      var n = { ritHari: pilih(x.ritHari, x.ritPerHari), ritKurang: pilih(x.ritKurang, x.sisaRitHariIni), ritBulan: pilih(x.ritBulan, x.ritPerBulan) };
      ['ritHari', 'ritKurang'].forEach(function (k) { if (n[k] != null && !isFinite(Number(n[k]))) n[k] = null; });
      if (n.ritBulan != null && !Array.isArray(n.ritBulan) && isFinite(Number(n.ritBulan))) n.ritBulan = Number(n.ritBulan); else if (!Array.isArray(n.ritBulan)) n.ritBulan = null;
      return { rute: String(x.rute || x.nama || x.jalur || '').trim(), km: Number(pilih(x.kmPerRit, x.kmRit, x.km, x.jarak)) || 0, x: n };
    })
      .filter(function (o) { return o && o.rute && o.km > 0; });
  }
  function setaraData(opt) {
    var s = opt && opt.setara, L = setaraDaftar(s); if (!L.length) return null;
    var hi = (HI && HI.d) || {}, so = Array.isArray(s) ? {} : (s || {});
    var num = function () { for (var i = 0; i < arguments.length; i++) { var v = arguments[i]; if (v != null && v !== '' && isFinite(Number(v))) return Number(v); } return null; };
    var tKm = num(so.targetKmHari, opt.targetKmHari, hi.targetKmHari, hi.setaraRit && hi.setaraRit.targetKmHari);
    var kmHi = num(so.kmHariIni, opt.kmHariIni, hi.km);
    var kurang = num(so.kurangKmHari, tKm != null && kmHi != null ? Math.max(0, tKm - kmHi) : null);
    var T = opt.target || hi.target, tingkat = T && Array.isArray(T.tingkat) ? T.tingkat.filter(function (x) { return Number(x.km) > 0; }) : [];
    return { L: L, tKm: tKm, kmHi: kmHi, kurang: kurang, tingkat: tingkat, sisaBln: T && T.sisaKm != null ? Number(T.sisaKm) : null, berikut: T && T.berikut, kmBulan: num(opt.kmBulan, hi.kmBulan) };
  }
  function rit(km, o) { return ang(Math.round(km / o.km * 10) / 10, 1) + ' rit ' + esc(o.rute); }
  function setaraHtml(opt) {
    var D = setaraData(opt); if (!D) return ''; SETARA = D; gaya(); setaraGaya();
    var dua = D.L.slice(0, 2), b1, b2 = '';
    if (D.tKm != null && D.tKm > 0) {
      b1 = 'Target hari ini <b>' + ang(D.tKm, 0) + ' km</b> ≈ ' + dua.map(function (o) { return o.x.ritHari != null ? ang(o.x.ritHari, 1) + ' rit ' + esc(o.rute) : rit(D.tKm, o); }).join(' · ');
      if (D.kurang != null) b2 = D.kurang > 0 ? 'Kurang <b>' + ang(D.kurang, 0) + ' km</b> ≈ ' + dua.map(function (o) { return o.x.ritKurang != null ? ang(o.x.ritKurang, 1) + ' rit ' + esc(o.rute) : rit(D.kurang, o); }).join(' · ') : '<b class="ok">Target KM hari ini tercapai ✓</b>';
    } else b1 = 'Setara: ' + dua.map(function (o) { return '1 rit ' + esc(o.rute) + ' = ' + ang(o.km, 0) + ' km'; }).join(' · ');
    return '<button type="button" class="drvSetara" data-ke="setaraRit"><span>' + b1 + (b2 ? '<br>' + b2 : '') + '</span><i>' + (D.L.length > 2 ? 'Semua rute' : 'Rinci') + ' ›</i></button>';
  }
  function setaraGaya() {
    if (document.getElementById('drvSetaraGaya')) return; var st = document.createElement('style'); st.id = 'drvSetaraGaya';
    st.textContent = '.drvSetara{display:flex;align-items:center;gap:8px;width:100%;text-align:left;margin-top:9px;padding:9px 11px;border-radius:12px;background:var(--panel2);color:var(--teks);font:inherit;font-size:12.5px;font-weight:600;line-height:1.45;border:0}.drvSetara span{flex:1;min-width:0}.drvSetara b.ok{color:#16a34a}.drvSetara i{flex:none;font-style:normal;font-size:11.5px;font-weight:800;color:var(--utama)}'
      + '.stRute{padding:12px 14px;margin-bottom:10px}.stRute h3{margin:0 0 6px;font-size:15px;display:flex;justify-content:space-between;gap:8px}.stRute h3 small{color:var(--redup);font-size:12px;font-weight:700}.stBrs{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-top:1px solid var(--garis);font-size:13px}.stBrs:first-of-type{border-top:0}.stBrs span{color:var(--redup)}.stBrs b{text-align:right}.stBrs b.ok{color:#16a34a}';
    document.head.appendChild(st);
  }
  function setaraBuka() {
    var D = SETARA; if (!D) return; gaya(); setaraGaya();
    var h = '<div class="kecil" style="margin:0 4px 10px;line-height:1.5">KM dihitung dari DO (tiket Input DO × jarak 1 rit rute). Angka rit = perkiraan kalau semua trip di rute itu.</div>';
    h += D.L.map(function (o) {
      var r = '<div class="kartu stRute"><h3>' + esc(o.rute) + '<small>1 rit = ' + ang(o.km, 0) + ' km</small></h3>';
      if (D.tKm != null && D.tKm > 0) r += '<div class="stBrs"><span>Target hari ini (' + ang(D.tKm, 0) + ' km)</span><b>≈ ' + (o.x.ritHari != null ? ang(o.x.ritHari, 1) : ang(Math.round(D.tKm / o.km * 10) / 10, 1)) + ' rit</b></div>';
      if (D.kurang != null && D.tKm) r += '<div class="stBrs"><span>Kurang hari ini' + (D.kurang > 0 ? ' (' + ang(D.kurang, 0) + ' km)' : '') + '</span>' + (D.kurang > 0 ? '<b>≈ ' + (o.x.ritKurang != null ? ang(o.x.ritKurang, 1) : ang(Math.round(D.kurang / o.km * 10) / 10, 1)) + ' rit</b>' : '<b class="ok">Tercapai ✓</b>') + '</div>';
      var RB = o.x.ritBulan;
      D.tingkat.forEach(function (t, i) { var n = Array.isArray(RB) && RB[i] != null ? Number(RB[i]) : (typeof RB === 'number' && i === 0 ? RB : Math.ceil(Number(t.km) / o.km)); r += '<div class="stBrs"><span>Sebulan untuk bonus ' + uangPendek(t.bonus) + ' (' + ang(t.km, 0) + ' km)</span><b>' + ang(n, 0) + ' rit</b></div>'; });
      if (D.berikut && D.sisaBln > 0) r += '<div class="stBrs"><span>Sisa bulan ini ke bonus ' + uangPendek(D.berikut.bonus) + ' (' + ang(D.sisaBln, 0) + ' km)</span><b>' + ang(Math.ceil(D.sisaBln / o.km), 0) + ' rit</b></div>';
      return r + '</div>';
    }).join('');
    if (setaraEl && !document.body.contains(setaraEl)) setaraEl = null;
    if (!setaraEl) {
      setaraEl = document.createElement('div'); setaraEl.className = 'lapis ksnLapis drvLapis'; document.body.appendChild(setaraEl);
      requestAnimationFrame(function () { if (setaraEl) setaraEl.classList.add('tampil'); });
      setaraEl.addEventListener('click', function (ev) { if (ev.target.closest('[data-d="tutup"]')) { R.bunyi('tutup'); setaraTutup(); } });
    }
    setaraEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-d="tutup" aria-label="Kembali">‹</button><div class="nm">Target KM dari DO<b>Setara ritase per rute</b></div></div><div class="ksnIsi">' + h + '</div>';
  }
  function setaraTutup() { if (!setaraEl) return false; var d = setaraEl; setaraEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); return true; }
  document.addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('[data-ke="setaraRit"]'); if (!b) return; ev.stopPropagation(); ev.preventDefault(); if (R.getar) R.getar(); setaraBuka(); }, true);
  window.WHL_SETARA = { html: setaraHtml, buka: setaraBuka, tutup: setaraTutup, _daftar: setaraDaftar };

  window.WHL_DRIVER = { siap: siap, driver: driver, punya: punya, muat: muat, hariIniHtml: hariIniHtml, buka: buka, tutup: tutup, lupakan: lupakan };
})();
