/* WHL App — POS KONTROL "setara web" (pk-app-setara-web-26nov, Posko 26 Nov 2026). Pak Fanza: layar Pos Kontrol di app harus selengkap halaman web.
 * Berkas ini MENEMPEL ke poskontrol.js lewat jembatan str() (pola poskontrol-ban.js). Tanpa berkas ini / saklar server MATI = layar seperti sebelumnya.
 * Server = DASHBOARD PkAppSetara.gs (aksi pks*) lewat pintu yang sama: pusatPosKontrol [token, aksi, data]. Hak diperiksa lagi di server.
 * TAHAP A: buat tiket Perbaikan / Service / Greasing / Storing + catat Standby / Tahan / Ready · Standby: tunjuk mekanik & akhiri -> Ready ·
 *          Cek selip 3 pilihan · gambar tiket (simpan / bagikan ke app printer) menggantikan tombol cetak yang buntu.
 * TAHAP B: Yang bertugas (tandai manual) · Belum masuk · Riwayat per tanggal · Revisi lengkap · pekerjaan storing saat selesai ·
 *          Kwitansi storing (buat / rekap / batal) · bagikan WhatsApp / salin · cari unit · peringatan · saring armada · isian tersimpan saat sinyal putus ·
 *          tampilan layar lebar (kolom).
 * Tidak dipindah: Mode TV, cetak termal Bluetooth langsung & dot matrix (butuh plugin di APK / komputer). Tanpa alert/confirm/prompt.
 */
(function () {
  'use strict';
  var A = null, PIL = null, PILmuat = false, CARI = '', ARMF = '', PT = null, RW = null, KW = null, RK = null, tUkur = null, PERB = false;
  var KD = 'whlPkDraf', KA = 'whlPkAntre';
  var JN = [['PERBAIKAN', '🔧 Perbaikan'], ['SERVICE', '🛢️ Service'], ['GREASE', '🧴 Greasing'], ['STORING', '🆘 Storing'], ['STANDBY', '⏸ Standby / Tahan'], ['READY', '✅ Ready']];
  var JL = { PERBAIKAN: 'PERBAIKAN', STORING: 'STORING', SERVICE: 'SERVICE / GANTI OLI', GREASE: 'GREASING', 'GANTI BAN': 'GANTI BAN', STANDBY: 'STANDBY', READY: 'READY' };
  var ZONA = ['POOL', 'A', 'B', 'C', 'D'];
  var PER = { ANTRI: '⏳ antre mekanik terlalu lama', CLOSE_GRUP: '💬 sudah close di grup WA, tiket belum ditutup', LAPOR_GRUP: '💬 lapor di grup, belum diinput', GANTUNG: '🪝 tiket gantung' };

  function e(s) { return A.esc(s); }
  function D() { return A.data() || {}; }
  function M() { return A.modal(); }
  function S() { return A.saya() || {}; }
  function E() { return A.el(); }
  function St() { var s = A && D().setara; return s && !s.mati && !s.galat ? s : null; }
  function nyala() { return !!St(); }
  function tahapB() { var s = St(); return !!s && s.tahap === 'AB'; }
  function q(sel) { var x = E(); return x ? x.querySelector(sel) : null; }
  function nilai(sel) { var x = q(sel); return x ? String(x.value || '').trim() : ''; }
  function kunciLb(s) { var t = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (/^\d{2,4}$/.test(t)) t = 'WHL' + t; return t; }
  function armadaLb(lb) { var k = kunciLb(lb); return /^WHL11\d{2}$/.test(k) ? 'TRONTON' : /^WHL(0\d{2}|10\d{2})$/.test(k) ? 'TRINTIN' : ''; }
  function cid() { return 'pks-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8); }
  function isoTgl(d) { var p = function (n) { return n < 10 ? '0' + n : '' + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function webKeIso(s) { var m = String(s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/); return m ? m[3] + '-' + m[2] + '-' + m[1] + (m[4] ? 'T' + m[4] + ':' + m[5] : '') : ''; }
  function rp(n) { return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID'); }
  function simpanLokal(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); return true; } catch (x) { return false; } }
  function bacaLokal(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (x) { return null; } }

  function gaya() {
    if (document.getElementById('stGaya')) return;
    var st = document.createElement('style'); st.id = 'stGaya';
    st.textContent = [
      '.stBaru{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:0;border-radius:16px;padding:12px 14px;margin-bottom:10px;background:var(--utama);color:#fff;font-size:15.5px;font-weight:900;box-shadow:var(--bayang);min-height:58px}',
      '.stBaru .ik{width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:22px;flex:none}.stBaru small{display:block;font-size:11.5px;font-weight:700;opacity:.9;margin-top:2px}',
      '.stAlat{display:grid;grid-template-columns:1fr;gap:8px;margin-bottom:10px}.pkaLebar .stAlat{grid-template-columns:minmax(0,1fr) auto}',
      '.stArm{display:flex;gap:6px}.stArm button{flex:1;min-height:44px;border-radius:12px;border:1px solid var(--garis);background:var(--panel);color:var(--teks);font-size:13px;font-weight:800;padding:0 12px;white-space:nowrap}.stArm button.on{background:rgba(21,101,192,.14);border-color:var(--utama);color:var(--utama)}',
      '.stPer{border:1px solid rgba(220,38,38,.35);background:rgba(220,38,38,.07);border-radius:14px;margin-bottom:10px;overflow:hidden}.stPer>button{display:block;width:100%;text-align:left;border:0;background:none;color:var(--teks);font-weight:900;font-size:13.5px;padding:10px 12px;min-height:44px}',
      '.stPer .b{display:flex;gap:8px;align-items:baseline;width:100%;text-align:left;border:0;border-top:1px solid rgba(220,38,38,.2);background:none;color:var(--teks);padding:9px 12px;font-size:13px;line-height:1.4;min-height:44px}.stPer .b b{font-size:15px;flex:none}',
      '.stKecil{border:1px solid var(--garis);background:var(--panel);color:var(--teks);border-radius:10px;font-size:12.5px;font-weight:800;padding:6px 10px;min-height:36px;margin:4px 4px 0 0}',
      '.stRow{display:flex;gap:8px;align-items:center;width:100%;text-align:left;background:var(--panel);border:1px solid var(--garis);border-left:5px solid var(--c,#64748b);border-radius:14px;padding:9px 11px;margin-bottom:8px;color:var(--teks);font-size:13px;line-height:1.4;min-height:48px}.stRow b{font-size:16px;flex:none;min-width:46px}.stRow .tg{margin-left:auto;font-size:10.5px;font-weight:900;border-radius:999px;padding:3px 8px;background:var(--c,#64748b);color:#fff;flex:none}.stRow span.i{flex:1;min-width:0;word-break:break-word}',
      '.stUnit{display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:6px}.stUnit button{min-height:46px;border-radius:12px;border:1px solid var(--garis);background:var(--panel);color:var(--teks);font-size:15px;font-weight:900}.stUnit button small{font-size:9.5px;color:var(--redup);margin-left:2px}',
      '.stSto{background:var(--panel);border:1px solid var(--garis);border-radius:14px;padding:10px 12px;margin-top:8px}.stSto summary{font-weight:900;font-size:13px;padding:6px 0;cursor:pointer}.stSto .tg{font-size:12.5px;font-weight:800;margin-top:6px}',
      '.stTk{display:block;margin:8px auto;max-width:100%;border:1px solid var(--garis);border-radius:6px;background:#fff}',
      '.stKw{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;background:var(--panel);border:1px solid var(--garis);border-radius:14px;padding:10px 12px;margin-bottom:8px;font-size:13px;line-height:1.45;color:var(--teks)}.stKw.on{border-color:var(--utama);box-shadow:0 0 0 2px var(--utama) inset}.stKw .ck{width:24px;height:24px;border-radius:7px;border:2px solid var(--garis);flex:none;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff}.stKw.on .ck{background:var(--utama);border-color:var(--utama)}.stKw .rp{margin-left:auto;font-weight:900;white-space:nowrap}',
      '.stTabM{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px}.stTabM button{min-height:44px;border-radius:12px;border:1px solid var(--garis);background:var(--panel);color:var(--teks);font-weight:800;font-size:13.5px}.stTabM button.on{background:var(--utama);border-color:var(--utama);color:#fff}',
      /* layar lebar: kolom per status + panel samping */
      '.pkaLapis.stLebarOn .ksnIsi{max-width:1560px}.stLebar{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:14px;align-items:start}',
      '.stKolW{display:grid;gap:12px;align-items:start}.stKol{background:var(--panel2,rgba(100,116,139,.08));border:1px solid var(--garis);border-top:4px solid var(--c);border-radius:16px;padding:10px;min-width:0}',
      '.stKol>header{display:flex;align-items:center;gap:8px;margin:0 2px 10px;font-size:13px;font-weight:900;letter-spacing:.4px;color:var(--c)}.stKol>header span{margin-left:auto;background:var(--c);color:#fff;border-radius:999px;padding:2px 10px;font-size:13px}',
      '.stKol .isi{display:flex;flex-direction:column;gap:10px;max-height:calc(100vh - 250px);overflow-y:auto;overscroll-behavior:contain;padding-right:2px}.stKol .pkaK .lb{font-size:19px}.stKol .pkaAk{flex-wrap:wrap}.stKol .pkaAk button{min-width:88px}.stKol .pkaAk button.bt{flex:0 0 46px;min-width:46px}.stKos{color:var(--redup);font-size:12.5px;text-align:center;padding:18px 6px}',
      '.stSisi{display:flex;flex-direction:column;gap:12px;min-width:0}.stSisi .kt2{background:var(--panel);border:1px solid var(--garis);border-radius:16px;padding:10px 12px}.stSisi h4{margin:0 0 8px;font-size:13px;font-weight:900}.stSisi .pkaMenu{margin-top:0}.stSisi .pkaGrid{grid-template-columns:1fr!important}',
      '.stLebarOn .pkaModal{align-items:center}.stLebarOn .pkaModal .kt{border-radius:22px;max-width:760px}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- pilihan (unit, driver, pekerjaan storing) ---------- */
  function muatPilihan(lalu) {
    if (PIL) { if (lalu) lalu(); return; }
    if (PILmuat) return; PILmuat = true;
    A.panggil('pksPilihan', {}, 45000).then(function (h) { PILmuat = false; if (h && h.ok) PIL = h; else if (M()) A.msg((h && h.pesan) || 'Pilihan belum bisa dimuat.', 'err'); if (PIL && lalu) lalu(); }, function () { PILmuat = false; if (M()) A.msg('Tidak ada sinyal — pilihan belum termuat. Tutup lalu buka lagi.', 'err'); });
  }
  function segar() { baca(); A.gambarModal(); sesudahGambar(); }
  function sesudahGambar() { var m = M(), w = q('.pkaModal'); if (m && w) sesudahModal(w, m.jenis); }

  /* ---------- papan ---------- */
  function antre() { return bacaLokal(KA); }
  function atas() {
    var x = E(); if (x) x.classList.remove('stLebarOn');
    if (!nyala()) return '';
    gaya();
    var s = St(), me = S(), h = '', an = antre();
    if (an && an.data) h += '<div class="pkaPita mrh">📡 <b>1 isian belum terkirim</b> (' + e(an.data.lambung) + ' · ' + e(an.data.jenis) + ', ' + e(an.jam || '') + ') — tersimpan di HP ini, dikirim otomatis saat sinyal kembali.<br><button type="button" class="stKecil" data-p="stAntreKirim">📡 Kirim sekarang</button><button type="button" class="stKecil" data-p="stAntreBuang">Buang</button></div>';
    if (s.buat) h += '<button type="button" class="stBaru" data-p="stBuat"><span class="ik">＋</span><span>Buat tiket / catat unit<small>Perbaikan · Service · Greasing · Storing · Standby / Tahan · Ready</small></span></button>';
    if (tahapB() && me.semua) {
      h += '<div class="stAlat"><input class="pkaIn" id="stCari" placeholder="🔍 cari unit / driver / mekanik (mis. 040)" value="' + e(CARI) + '" autocomplete="off">'
        + '<div class="stArm">' + [['', 'Semua'], ['TRINTIN', 'Trintin'], ['TRONTON', 'Tronton']].map(function (a) { return '<button type="button" data-p="stArmF:' + a[0] + '" class="' + (ARMF === a[0] ? 'on' : '') + '">' + a[1] + '</button>'; }).join('') + '</div></div>';
      var P = s.peringatan || [];
      if (P.length) {
        h += '<div class="stPer"><button type="button" data-p="stPerBuka">⚠️ ' + P.length + ' peringatan perlu ditindak ' + (PERB ? '▴' : '▾') + '</button>';
        if (PERB) h += P.map(function (p) { return '<button type="button" class="b" data-p="det:' + e((p.armada || 'TRINTIN') + '|' + (p.id || '')) + '"><b>' + e(A.lbPendek(p.lambung || p.l || '')) + '</b><span>' + e(PER[p.tipe] || p.tipe || 'peringatan') + (p.menit != null ? ' · ' + A.umur(p.menit) : '') + (p.teks || p.pesan ? ' · ' + e(String(p.teks || p.pesan).slice(0, 120)) : '') + '</span></button>'; }).join('');
        h += '</div>';
      }
    }
    return h + gsAtas(); /* pk-ganti-shift-pending-27nov */
  }
  function saring(l) {
    if (!tahapB()) return l;
    var c = CARI.trim().toUpperCase(), cn = c.replace(/[^0-9]/g, '');
    return l.filter(function (t) {
      if (ARMF && t.ar !== ARMF) return false;
      if (!c) return true;
      if (cn && cn === c && String(t.lb || '').replace(/[^0-9]/g, '').indexOf(cn) >= 0) return true;
      return [t.lb, t.drv, t.mek, t.ker].join(' ').toUpperCase().indexOf(c) >= 0;
    });
  }
  function bawahPapan() {
    var s = St(), L = (s && s.selip) || [];
    if (!S().semua || !L.length) return '';
    return '<div class="pkaJd" style="--c:#d97706;margin-top:14px"><b>📦 CEK SELIP</b>' + L.length + ' barang keluar gudang tanpa tiket</div><div class="pkaGrid">' + L.map(function (x, i) {
      return '<div class="pkaK" style="--c:#d97706" data-p="stSelip:' + i + '"><div class="a"><span class="lb">' + e(A.lbPendek(x.lb)) + '</span><span class="pkaBd">CEK SELIP</span></div><div class="ket">' + e(x.detail) + '</div><div class="inf">PIC ' + e(x.pic || '-') + ' · cek ' + e(x.slot || '') + '</div>'
        + (S().proses ? '<div class="pkaAk"><button type="button" class="tj" data-p="stSelip:' + i + '">📦 Proses</button></div>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function menu() {
    if (!tahapB()) return '';
    var s = St(), b = '';
    if (S().semua) b += '<button type="button" data-p="stPetugas">👷 Yang bertugas<small>siapa aktif · tandai manual</small></button><button type="button" data-p="stBelum">🚚 Belum masuk' + (s.belum != null ? ' (' + s.belum + ')' : '') + '<small>unit belum ada laporan hari ini</small></button>';
    b += '<button type="button" data-p="stRiwayat">📅 Riwayat<small>per tanggal · revisi tiket lama</small></button>';
    return b;
  }
  function papanLebar() { return tahapB() && !!S().semua && (window.innerWidth || 0) >= 1000; }
  function htmlLebar(x) {
    var el = E(); if (el) el.classList.add('stLebarOn');
    var TT = x.tabTampil().filter(function (c) { return c[0] !== 'selesai'; }), ban = A.ban && A.ban(), h = '';
    var semua = TT.reduce(function (a, c) { return a.concat(x.tiketDi(c[0])); }, []);
    if (ban) h += ban.saringHtml(semua);
    h += '<div class="stLebar"><div class="stKolW" style="grid-template-columns:repeat(' + TT.length + ',minmax(0,1fr))">' + TT.map(function (c) {
      var l = saring(x.tiketDi(c[0])); if (ban) l = ban.saring(l);
      if (c[0] === 'pending') l.sort(function (a, b) { return (a.jamUpdateEpoch || 0) - (b.jamUpdateEpoch || 0); });
      return '<section class="stKol" style="--c:' + c[3] + '" data-kol="' + c[0] + '"><header>' + c[2] + ' ' + c[1].toUpperCase() + '<span>' + l.length + '</span></header><div class="isi">' + (l.length ? l.map(x.kartu).join('') : '<div class="stKos">kosong</div>') + '</div></section>';
    }).join('') + '</div><aside class="stSisi">';
    var sl = saring(x.tiketDi('selesai'));
    h += '<div class="kt2"><h4>✅ Selesai hari ini (' + sl.length + ')</h4>' + (sl.length ? sl.slice(0, 40).map(function (t) { return '<button type="button" class="stRow" style="--c:#16a34a" data-p="det:' + e(t.ar + '|' + t.id) + '"><b>' + e(A.lbPendek(t.lb)) + '</b><span class="i">' + e(String(t.jamSelesai || '').slice(11)) + ' · ' + e(t.mek || '-') + '</span></button>'; }).join('') : '<div class="stKos">belum ada</div>') + '</div>';
    var cs = bawahPapan(); if (cs) h += '<div class="kt2">' + cs + '</div>';
    h += x.menuBawah() + '</aside></div>';
    h += '<div class="pkaKecil">Data server ' + e(D().serverJam || '') + ' · muat ulang otomatis tiap 20 dtk · tampilan layar lebar (kolom). Mode TV, cetak termal langsung & dot matrix tetap lewat halaman lama.</div>';
    return h;
  }
  window.addEventListener('resize', function () { clearTimeout(tUkur); tUkur = setTimeout(function () { if (A && E() && !M() && nyala()) A.gambarPapan(); }, 250); });

  /* ---------- teks bagikan ---------- */
  function teksTiket(t) {
    var st = { menunggu: '⏳ MASUK — menunggu mekanik', dikerjakan: '🔧 SEDANG DIKERJAKAN', pending: '⏸ PENDING', standby: '💤 STANDBY', selesai: '✅ SELESAI' }[t.g] || String(t.st || '');
    var b = [['Driver', t.drv], ['Jenis', JL[t.jenis] || t.jenis], ['Keterangan', t.ker], ['Yang melaporkan', t.lapor], ['Mekanik', t.mek], ['Pending', t.g === 'pending' ? t.kp : ''], ['Jam masuk', t.jamMasuk], ['Jam selesai', t.jamSelesai], ['Keterangan perbaikan', t.ks]].filter(function (x) { return String(x[1] || '').trim(); });
    return '*POS KONTROL WHL*\n*' + t.lb + '*' + (t.ar === 'TRONTON' ? ' (Tronton)' : '') + '\n' + st + '\n\n' + b.map(function (x) { return x[0] + ': ' + x[1]; }).join('\n');
  }
  function bagiTeks(t) {
    var tx = teksTiket(t);
    try { if (navigator.share) { navigator.share({ text: tx }).catch(function () { /* dibatalkan */ }); return; } } catch (x) { /* lanjut */ }
    var c = A.ctx(); if (c && c.bukaWeb) c.bukaWeb('https:' + '/' + '/wa.me/?text=' + encodeURIComponent(tx));
  }
  function salinTeks(t) {
    var tx = teksTiket(t), ok = false;
    try { var ta = document.createElement('textarea'); ta.value = tx; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (x) { ok = false; }
    if (!ok && navigator.clipboard) { navigator.clipboard.writeText(tx).then(function () { A.roti('✅ Teks tersalin — tinggal tempel di WhatsApp'); }, function () { A.roti('Gagal menyalin otomatis'); }); return; }
    A.roti(ok ? '✅ Teks tersalin — tinggal tempel di WhatsApp' : 'Gagal menyalin otomatis');
  }
  function tombolDetail(t, b) {
    var k = e(t.ar + '|' + t.id), h = gsTombol(t, k); /* pk-ganti-shift-pending-27nov */
    h += b('abu', 'cetak', t.g === 'selesai' ? '🖼️ Gambar tiket selesai (JPG)' : '🖨️ Tiket: gambar / cetak', t.g === 'selesai' || !S().proses);
    if (tahapB()) h += '<button type="button" class="pkaTombol abu" data-p="stWa:' + k + '">📤 Bagikan WhatsApp</button><button type="button" class="pkaTombol abu" data-p="stSalin:' + k + '">📋 Salin teks</button>';
    return h;
  }

  /* ---------- gambar tiket (kanvas; 58 mm = 384 px, 80 mm = 576 px @203dpi) ---------- */
  function isiTiket(t) {
    var p2 = function (n) { return n < 10 ? '0' + n : '' + n; }, d = new Date(), r = [];
    r.push({ t: 'c', s: 'WHL · TIKET POS KONTROL', z: .85, b: 1 }, { t: 'inv', s: JL[t.jenis] || String(t.jenis || 'TIKET') }, { t: 'c', s: String(t.lb || '-') + (t.ar === 'TRONTON' ? ' (TR)' : ''), z: 2.2, b: 1, fit: 1 }, { t: 'hr' });
    r.push({ t: 'kb', k: 'No Tiket', v: String(t.id || '-').slice(0, 13) }, { t: 'kb', k: 'Jam Masuk', v: t.jamMasuk || '-' }, { t: 'kb', k: 'Driver', v: t.drv || '-' }, { t: 'kb', k: 'Pelapor', v: t.lapor || '-' }, { t: 'kb', k: 'Keluhan', v: t.ker || '-' });
    if (t.gb) r.push({ t: 'kb', k: 'Posisi ban', v: ((t.gb.posPanjang && t.gb.posPanjang.length ? t.gb.posPanjang : t.gb.pos) || []).join(', ') || (t.gb.n + ' ban') }, { t: 'kb', k: 'Lokasi', v: (t.gb.lokasi || '') + (t.gb.lokasiKm ? ' ' + t.gb.lokasiKm : '') });
    if (t.mek) r.push({ t: 'kb', k: t.jenis === 'GANTI BAN' ? 'Tyreman' : 'Mekanik', v: t.mek });
    if (t.g === 'selesai') r.push({ t: 'kb', k: 'Jam Selesai', v: t.jamSelesai || '-' }, { t: 'kb', k: 'Pekerjaan', v: t.ks || '-' }, { t: 'hr' }, { t: 'c', s: 'SELESAI', z: 1.2, b: 1 });
    else r.push({ t: 'hr' }, { t: 'c', s: 'Alur: Driver > Mekanik > Pengawas', z: .8, b: 1, fit: 1 }, { t: 'c', s: 'WAJIB balik ke pengawas', z: .8, b: 1 });
    r.push({ t: 'c', s: 'Dicetak ' + p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()), z: .7 });
    return r;
  }
  function tiketKanvas(t, px) {
    var rows = isiTiket(t), pad = Math.round(px * 0.045), w = px - pad * 2, dasar = px * 0.056;
    var F = function (z, b) { return (b ? 'bold ' : '') + Math.round(dasar * (z || 1)) + 'px Arial, Helvetica, sans-serif'; };
    var pecah = function (c, s, maks) { var out = [], br = ''; String(s).split(/\s+/).forEach(function (kata) { var coba = br ? br + ' ' + kata : kata; if (c.measureText(coba).width > maks && br) { out.push(br); br = kata; } else br = coba; while (c.measureText(br).width > maks && br.length > 1) { var n = br.length - 1; while (n > 1 && c.measureText(br.slice(0, n)).width > maks) n--; out.push(br.slice(0, n)); br = br.slice(n); } }); if (br) out.push(br); return out.length ? out : ['']; };
    var tata = function (c, lukis) {
      var y = pad;
      rows.forEach(function (r) {
        if (r.t === 'hr') { y += dasar * .4; if (lukis) { c.fillStyle = '#000'; c.fillRect(pad, y, w, 2); } y += dasar * .6; return; }
        if (r.t === 'inv') { var hh = dasar * 2; c.font = F(1.25, 1); if (lukis) { c.fillStyle = '#000'; c.fillRect(pad, y, w, hh); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(r.s, px / 2, y + hh / 2); } y += hh + dasar * .3; return; }
        if (r.t === 'c') {
          var z = r.z || 1; c.font = F(z, r.b);
          if (r.fit) { while (z > .5 && c.measureText(r.s).width > w) { z -= .05; c.font = F(z, r.b); } }
          var ls = r.fit ? [r.s] : pecah(c, r.s, w), lh = dasar * z * 1.25;
          ls.forEach(function (ln) { if (lukis) { c.fillStyle = '#000'; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(ln, px / 2, y); } y += lh; });
          y += dasar * .15; return;
        }
        c.font = F(.9, 1); var kw = w * .34; c.font = F(.9, 0); var vs = pecah(c, r.v, w - kw), lh2 = dasar * 1.2;
        if (lukis) { c.fillStyle = '#000'; c.textAlign = 'left'; c.textBaseline = 'top'; c.font = F(.9, 1); c.fillText(r.k, pad, y); c.font = F(.9, 0); vs.forEach(function (ln, i) { c.fillText(ln, pad + kw, y + i * lh2); }); }
        y += vs.length * lh2 + dasar * .15;
      });
      return Math.ceil(y + pad);
    };
    var cv = document.createElement('canvas'); cv.width = px; cv.height = 10;
    var tinggi = tata(cv.getContext('2d'), false);
    cv.height = tinggi; var c2 = cv.getContext('2d'); c2.fillStyle = '#fff'; c2.fillRect(0, 0, px, tinggi); tata(c2, true);
    return cv;
  }
  function bagiGambar(t, px) {
    var jpg = t.g === 'selesai', mime = jpg ? 'image/jpeg' : 'image/png', nama = 'Tiket-' + String(t.lb || '').replace(/\s+/g, '') + '-' + String(t.id || '').slice(0, 8) + (jpg ? '.jpg' : '.png'), cv = tiketKanvas(t, px);
    var url = cv.toDataURL(mime, 0.92), b64 = url.slice(url.indexOf(',') + 1);
    var cadangan = function () {
      if (window.WHL_BERKAS && window.WHL_BERKAS.buka) { window.WHL_BERKAS.buka(nama, b64, mime).then(function () { A.roti('🖼️ Gambar tiket disimpan — buka dari app printer / galeri.'); }, function (x) { A.roti('Gambar tidak bisa disimpan: ' + ((x && x.message) || x)); }); return; }
      var a = document.createElement('a'); a.href = url; a.download = nama; document.body.appendChild(a); a.click(); a.remove(); A.roti('🖼️ Gambar tiket diunduh.');
    };
    try {
      if (cv.toBlob && navigator.canShare) {
        cv.toBlob(function (bl) {
          var f = null; try { f = new File([bl], nama, { type: mime }); } catch (x) { f = null; }
          if (f && navigator.canShare({ files: [f] })) navigator.share({ files: [f], title: nama }).catch(function () { /* dibatalkan */ }); else cadangan();
        }, mime, 0.92);
        return;
      }
    } catch (x) { /* lanjut cadangan */ }
    cadangan();
  }

  /* ---------- kotak pekerjaan storing (form buat & form selesai) ---------- */
  function kotakStoringIsi(m) {
    var P = PIL && PIL.storing;
    if (!P || !P.pekerjaan) return '<div class="pkaFotoSt">Memuat daftar pekerjaan storing…</div>';
    if (!P.nyala) return '<div class="pkaFotoSt">Target storing sedang dimatikan dari server.</div>';
    var pil = m.stPek || [], ada = function (n) { return pil.some(function (p) { return p.nama === n; }); };
    var menit = pil.reduce(function (a, p) { return a + (P.menit[p.kategori] || 0); }, 0), tempuh = m.stZona ? P.tempuh[m.stZona] : null;
    var h = '<div class="pkaLbl" style="margin-top:2px">Zona lokasi <small>kosong = dibaca dari "KM" di keterangan</small></div><div class="pkaChips">' + ZONA.map(function (z) { return '<button type="button" data-p="stZona:' + z + '" class="' + (m.stZona === z ? 'on' : '') + '">' + z + '</button>'; }).join('') + '</div>';
    (P.urut || Object.keys(P.pekerjaan)).forEach(function (kat) {
      var l = P.pekerjaan[kat] || [], n = l.filter(ada).length;
      h += '<details' + (n || (m.stBuka === kat) ? ' open' : '') + ' data-kat="' + e(kat) + '"><summary>' + e(kat) + ' · ' + (P.menit[kat] || 0) + ' mnt' + (n ? ' · <span style="color:var(--utama)">' + n + ' dipilih</span>' : '') + '</summary><div class="pkaChips">' + l.map(function (nm) { return '<button type="button" data-p="stPek:' + e(kat + '|' + nm) + '" class="' + (ada(nm) ? 'on' : '') + '">' + e(nm) + '</button>'; }).join('') + '</div></details>';
    });
    h += '<div class="tg">' + (pil.length ? '🎯 ' + pil.length + ' pekerjaan · kerja ' + A.umur(menit) + (tempuh != null ? ' + tempuh ' + A.umur(tempuh) + ' = target ' + A.umur(menit + tempuh) : ' + tempuh sesuai zona') : 'Belum ada pekerjaan dipilih = tanpa target waktu.') + '</div>';
    return h;
  }
  function kotakStoring(t) {
    var m = M(); if (m && !m.stPek) { m.stPek = []; m.stZona = ''; }
    muatPilihan(function () { var w = q('#stStoW'); if (w && M()) w.innerHTML = kotakStoringIsi(M()); });
    if (t && m && !m.stMuat) {
      m.stMuat = 1;
      A.panggil('pksStoring', { armada: t.ar, id: t.id }, 30000).then(function (h) { var mm = M(); if (mm !== m || !h || !h.ok || !h.target) return; if (!m.stPek.length) { m.stPek = h.target.pekerjaan || []; m.stZona = m.stZona || ''; var w = q('#stStoW'); if (w) w.innerHTML = kotakStoringIsi(m); } }, function () { /* tanpa isi awal */ });
    }
    return '<div class="pkaLbl">🆘 Pekerjaan storing <small>untuk target waktu & tarif kwitansi</small></div><div class="stSto" id="stStoW">' + kotakStoringIsi(m || {}) + '</div>';
  }
  function sesudahSelesai(t, h, m) {
    var pek = m && m.stPek, zona = m && m.stZona;
    A.roti('✅ ' + (h.pesan || 'Tersimpan.')); A.tutupModal(); A.muat(true);
    if (t.jenis === 'STORING' && pek && pek.length && tahapB()) {
      A.panggil('pksStoringSimpan', { armada: t.ar, id: t.id, pekerjaan: pek, zona: zona }, 45000).then(function (r) { A.roti(r && r.ok ? '🎯 ' + r.pesan : '⚠️ Tiket selesai, tapi pekerjaan storing belum tersimpan: ' + ((r && r.pesan) || 'gagal') + ' — isi lagi lewat Kwitansi storing.'); }, function () { A.roti('⚠️ Tiket selesai, tapi pekerjaan storing belum terkirim (sinyal).'); });
    }
  }

  /* ---------- foto opsional (form buat / ready) ---------- */
  function htmlFoto(m, label) {
    return '<div class="pkaLbl">📷 ' + label + ' <small>opsional</small></div><div class="pkaFoto"><button type="button" class="utama" data-p="stFoto:Kam">📷 Foto kamera</button><button type="button" data-p="stFoto:Gal">🖼️ Dari galeri</button></div>'
      + '<input type="file" id="stFileKam" accept="image/*" capture="environment" hidden><input type="file" id="stFileGal" accept="image/*" hidden>'
      + '<img class="pkaPrev' + (m.foto ? ' ada' : '') + '" id="stPrev" alt=""' + (m.foto ? ' src="' + m.foto + '"' : '') + '><div class="pkaFotoSt' + (m.foto ? ' ok' : '') + '" id="stFotoSt">' + (m.foto ? '✅ Foto siap' : 'Belum ada foto') + '</div>';
  }
  function bacaFoto(inp) {
    var f = inp.files && inp.files[0], m = M(); if (!f || !m) return;
    var st = q('#stFotoSt'); if (st) { st.className = 'pkaFotoSt'; st.textContent = 'Memproses foto…'; }
    var rd = new FileReader();
    rd.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var sk = Math.min(1, 1280 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.round(img.width * sk); cv.height = Math.round(img.height * sk); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        if (M() !== m) return; m.foto = cv.toDataURL('image/jpeg', 0.7);
        var pv = q('#stPrev'); if (pv) { pv.src = m.foto; pv.classList.add('ada'); }
        if (st) { st.className = 'pkaFotoSt ok'; st.textContent = '✅ Foto siap'; } inp.value = '';
      };
      img.onerror = function () { if (st) { st.className = 'pkaFotoSt err'; st.textContent = '⚠️ Foto gagal dibaca — coba lagi'; } };
      img.src = ev.target.result;
    };
    rd.readAsDataURL(f);
  }

  /* ---------- modal: buat tiket ---------- */
  function bukaBuat(awal) {
    var d = bacaLokal(KD), m = { ar: 'TRINTIN', lb: '', jn: '', drv: '', ket: '', lok: '', al: '', foto: '', pilih: [], bk: '', bkTulis: '', stPek: [], stZona: '', cid: cid(), setuju: false, perlu: null, selip: null, dariDraf: false };
    if (!awal && d && d.lb) { ['ar', 'lb', 'jn', 'drv', 'ket', 'lok', 'al', 'stPek', 'stZona'].forEach(function (k) { if (d[k] != null) m[k] = d[k]; }); m.dariDraf = true; }
    if (awal) Object.keys(awal).forEach(function (k) { m[k] = awal[k]; });
    A.bukaModal('stBuat', null, m);
    muatPilihan(function () { if (M() && M().jenis === 'stBuat') segar(); });
  }
  function opsiDriver(m) {
    var l = (PIL && PIL.driver) || [], k = kunciLb(m.lb), unit = l.filter(function (x) { return k && x.k === k; }), lain = l.filter(function (x) { return !(k && x.k === k); });
    if (!m.drv && unit.length === 1) m.drv = unit[0].n;
    var o = function (x) { return '<option' + (m.drv === x.n ? ' selected' : '') + '>' + e(x.n) + '</option>'; };
    var tanpa = (PIL && PIL.tanpa) || 'TIDAK ADA DRIVER', ada = !m.drv || m.drv === tanpa || l.some(function (x) { return x.n === m.drv; });
    return '<option value="">— pilih driver —</option>' + (ada ? '' : '<option selected>' + e(m.drv) + '</option>') + (unit.length ? '<optgroup label="Driver unit ini">' + unit.map(o).join('') + '</optgroup>' : '')
      + (m.jn === 'STANDBY' ? '<option value="' + e(tanpa) + '"' + (m.drv === tanpa ? ' selected' : '') + '>Tidak ada driver</option>' : '') + '<optgroup label="Semua driver">' + lain.map(o).join('') + '</optgroup>';
  }
  function htmlSetuju(m) {
    if (!m.perlu) return '';
    return '<div class="pkaPita mrh">⚠️ Unit ini punya <b>' + m.perlu.length + ' tiket terbuka</b>. READY akan menutup semuanya:<br>' + m.perlu.map(function (x) { return '• ' + e(x.teks); }).join('<br>')
      + '</div><div class="pkaChips"><button type="button" data-p="stSetuju" class="' + (m.setuju ? 'on' : '') + '">' + (m.setuju ? '☑' : '☐') + ' Ya, tutup semua tiket itu</button></div>';
  }
  function htmlBuat() {
    var m = M(), h = '<h3>＋ Buat tiket / catat unit<button type="button" class="tutupX" data-p="tutupModal" aria-label="Tutup">✕</button></h3>';
    if (!PIL) return h + '<div class="pkaKosong"><span class="putar"></span> Memuat daftar unit & driver…</div><div class="pkaMsg"></div>';
    h += '<div class="sb">Dilaporkan oleh <b>' + e(S().nama || '') + '</b> (dari login). Tiket dari driver tetap masuk sendiri lewat GASPOL — form ini untuk kasus mendesak.' + (m.dariDraf ? '<br>📝 Isian terakhir yang belum terkirim dipulihkan.' : '') + '</div>';
    if (m.selip) h += '<div class="pkaPita br">📦 Dari Cek selip' + (m.selip.mode === 'sudah' ? ': sesudah Simpan, tiket langsung ditunjuk & form <b>Selesaikan</b> terbuka (jam ' + e(String(m.selip.jam || '').replace('T', ' ')) + ').' : ': sesudah Simpan, tiket muncul di tab Menunggu.') + '</div>';
    h += '<div class="pkaLbl">Unit <span class="w">wajib</span></div><div class="stArm" style="margin-bottom:6px">' + [['TRINTIN', 'Trintin'], ['TRONTON', 'Tronton']].map(function (a) { return '<button type="button" data-p="stArm:' + a[0] + '" class="' + (m.ar === a[0] ? 'on' : '') + '">' + a[1] + '</button>'; }).join('') + '</div>';
    var U = ((PIL.unit || {})[m.ar] || []).concat(['Dan Lain-lain']);
    h += '<select class="pkaIn" id="stLb"><option value="">— pilih no lambung —</option>' + (m.lb && U.indexOf(m.lb) < 0 ? '<option selected>' + e(m.lb) + '</option>' : '') + U.map(function (u) { return '<option' + (m.lb === u ? ' selected' : '') + '>' + e(u) + '</option>'; }).join('') + '</select>';
    h += '<div class="pkaLbl">Jenis <span class="w">wajib</span></div><div class="pkaChips">' + JN.map(function (j) { return '<button type="button" data-p="stJenis:' + j[0] + '" class="' + (m.jn === j[0] ? 'on' : '') + '">' + j[1] + '</button>'; }).join('') + '<button type="button" data-p="gbBaru" class="kerja">🛞 Ban → Tiket Ganti Ban</button></div>';
    h += '<div class="pkaLbl">Nama driver <span class="w">wajib</span></div><select class="pkaIn" id="stDrv">' + opsiDriver(m) + '</select>';
    if (m.jn === 'STANDBY') {
      h += '<div class="pkaLbl">Alasan standby <span class="w">wajib</span></div><div class="pkaChips">' + (PIL.standby || []).map(function (a) { return '<button type="button" data-p="stAl:' + e(a) + '" class="' + (m.al === a ? 'on' : '') + '">' + e(a) + '</button>'; }).join('') + '</div>'
        + '<div class="pkaLbl">⛔ Tahan <small>unit & driver tidak bisa ambil uang jalan di GASPOL sampai dicatat READY</small></div><div class="pkaChips">' + (PIL.tahan || []).concat(['TAHAN: lainnya…']).map(function (a) { return '<button type="button" data-p="stAl:' + e(a) + '" class="' + (m.al === a ? 'on' : '') + '">' + e(a) + '</button>'; }).join('') + '</div>'
        + '<div class="pkaLbl">Detail <small>' + (/lainnya/i.test(m.al) ? 'wajib' : 'opsional') + '</small></div><textarea class="pkaIn" id="stKet" placeholder="mis. sakit s/d tgl 28">' + e(m.ket) + '</textarea>';
    } else if (m.jn === 'READY') {
      h += '<div class="pkaPita br">✅ READY di Pos Kontrol khusus unit habis perbaikan / greasing / ganti oli / standby (unit jalan biasa sudah READY lewat P2H driver di GASPOL). Tiket terbuka unit ini ikut ditutup.</div>'
        + '<div class="pkaLbl">Keterangan <small>opsional</small></div><textarea class="pkaIn" id="stKet" placeholder="mis. selesai ganti kampas, unit jalan lagi">' + e(m.ket) + '</textarea>';
    } else {
      h += '<div class="pkaLbl">Keterangan / keluhan <span class="w">wajib</span></div><textarea class="pkaIn" id="stKet" placeholder="' + (m.jn === 'STORING' ? 'mis. per patah, unit berhenti di Servo KM 64' : 'mis. rem blong, lampu mati') + '">' + e(m.ket) + '</textarea>';
      if (m.jn === 'STORING') h += '<div class="pkaLbl">Lokasi <small>untuk zona & target waktu · contoh "Servo KM 64", "ALR KM 9", "BSR"</small></div><input class="pkaIn" id="stLok" value="' + e(m.lok) + '" placeholder="Servo KM …">' + (tahapB() ? kotakStoring(null) : '');
    }
    h += htmlFoto(m, m.jn === 'READY' ? 'Foto unit' : 'Foto unit / kerusakan');
    if (m.jn && m.jn !== 'STANDBY' && m.jn !== 'READY' && (D().mekanik || []).length) {
      h += '<div class="pkaLbl">👷 Tunjuk petugas sekarang <small>opsional · boleh lebih dari 1</small></div>' + ((A.chipsJenis && A.chipsJenis(m.pilih, m.jn)) || A.chipsMekanik(m.pilih)) + '<div id="pkaBkW">' + A.htmlBengkel() + '</div>';
    }
    h += htmlSetuju(m);
    return h + '<button type="button" class="pkaTombol hj" data-p="stBuatYa">✅ SIMPAN' + (m.jn === 'READY' ? ' READY' : m.jn === 'STANDBY' ? ' STANDBY / TAHAN' : ' TIKET') + '</button><div class="pkaMsg"></div>';
  }
  function baca() {
    var m = M(); if (!m || !/^st/.test(m.jenis || '')) return;
    [['#stLb', 'lb'], ['#stDrv', 'drv'], ['#stKet', 'ket'], ['#stLok', 'lok'], ['#stRvMek', 'mek'], ['#stRvOleh', 'oleh'], ['#stRvJam', 'jam'], ['#stRvKet', 'ket'], ['#stRvKm', 'km'], ['#stSelipJam', 'jam'], ['#stSelipAl', 'alasan'], ['#stKwAl', 'alasan'], ['#stKwBtl', 'batalAl'], ['#stPtJam', 'ptJam']].forEach(function (p) { var x = q(p[0]); if (x) m[p[1]] = String(x.value || ''); });
    if (m.jenis === 'stBuat' && !m.selip) simpanLokal(KD, { ar: m.ar, lb: m.lb, jn: m.jn, drv: m.drv, ket: m.ket, lok: m.lok, al: m.al, stPek: m.stPek, stZona: m.stZona });
  }
  function susunBuat(m) {
    var ket = String(m.ket || '').replace(/\s+/g, ' ').trim();
    if (!m.lb) return 'Pilih no lambung.';
    if (!m.jn) return 'Pilih jenisnya.';
    if (!m.drv) return 'Pilih nama driver.';
    if (m.jn === 'STANDBY') {
      if (!m.al) return 'Pilih alasan standby / tahan.';
      if (/^TAHAN: lainnya/i.test(m.al)) { if (ket.length < 3) return 'Tulis alasan tahan-nya di Detail.'; ket = 'TAHAN: ' + ket; }
      else if (m.al === 'Lainnya') { if (ket.length < 3) return 'Tulis alasannya di Detail.'; }
      else ket = m.al + (ket ? ' · ' + ket : '');
    } else if (m.jn === 'READY') ket = ket || 'Unit ready — selesai dikerjakan';
    else if (ket.length < 3) return 'Tulis keterangan / keluhannya.';
    var mk = '';
    if (m.pilih && m.pilih.length && m.jn !== 'STANDBY' && m.jn !== 'READY') { mk = A.namaTerpilih(); if (!mk) return 'Isi nama bengkel luarnya.'; }
    if (m.selip && m.selip.mode === 'sudah' && !mk) return 'Ketuk mekanik yang mengerjakan (dari Cek selip).';
    if (m.perlu && !m.setuju) return 'Centang dulu "Ya, tutup semua tiket itu".';
    return { jenis: m.jn, lambung: m.lb, armada: m.ar, driver: m.drv, keterangan: ket, lokasi: m.jn === 'STORING' ? String(m.lok || '').trim() : '', foto: m.foto || '', cid: m.cid, setujuTutup: !!m.setuju, mekanik: mk,
      storing: m.jn === 'STORING' && m.stPek && m.stPek.length ? { pekerjaan: m.stPek, zona: m.stZona || '' } : null };
  }
  function kirimBuat() {
    baca(); var m = M(), data = susunBuat(m);
    if (typeof data === 'string') { A.msg(data, 'err'); return; }
    A.kunci(true); A.msg('Menyimpan…');
    A.panggil('pksBuat', data, 90000).then(function (h) {
      if (M() !== m) return;
      if (!h || !h.ok) { A.kunci(false); if (h && h.perluSetuju) { m.perlu = h.tiket || []; m.setuju = false; segar(); } A.msg((h && h.pesan) || 'Gagal menyimpan.', 'err'); return; }
      simpanLokal(KD, null); A.roti('✅ ' + h.pesan);
      if (m.selip && m.selip.mode === 'sudah' && h.tunjuk && h.tunjuk.ok) {
        A.bukaSelesai({ id: h.id, ar: h.armada, lb: h.lambung, jenis: h.jenis, g: 'dikerjakan', ker: data.keterangan, drv: data.driver, mek: h.tunjuk.mk, lapor: S().nama, jamMasuk: h.jamMasuk });
        var j = q('#pkaJam'); if (j && m.selip.jam) j.value = m.selip.jam; A.muat(true); return;
      }
      A.tutupModal(); if (!h.langsungSelesai) A.setTab(h.standby ? 'standby' : (h.tunjuk && h.tunjuk.ok ? 'dikerjakan' : 'menunggu')); A.muat(true);
    }, function () {
      if (M() !== m) return; A.kunci(false);
      var ok = simpanLokal(KA, { data: data, jam: new Date().toTimeString().slice(0, 5) }) || simpanLokal(KA, { data: Object.assign({}, data, { foto: '' }), jam: new Date().toTimeString().slice(0, 5), tanpaFoto: 1 });
      A.msg(ok ? '📡 Tidak ada sinyal — isian DISIMPAN di HP ini dan dikirim otomatis saat sinyal kembali. Boleh tutup form ini.' : 'Tidak ada sinyal — belum tersimpan, coba lagi.', 'err');
    });
  }
  function kirimAntre(diam) {
    var an = antre(); if (!an || !an.data || kirimAntre.jalan) return; kirimAntre.jalan = 1;
    A.panggil('pksBuat', an.data, 90000).then(function (h) {
      kirimAntre.jalan = 0;
      if (h && h.ok) { simpanLokal(KA, null); simpanLokal(KD, null); A.roti('📡 Isian tertunda terkirim: ' + h.pesan); if (E()) A.muat(true); return; }
      if (!diam || (h && h.pesan)) A.roti('Isian tertunda ditolak server: ' + ((h && h.pesan) || 'gagal') + ' — buka "Buat tiket" untuk memperbaiki, atau Buang.');
    }, function () { kirimAntre.jalan = 0; if (!diam) A.roti('Masih belum ada sinyal.'); });
  }
  window.addEventListener('online', function () { if (A && nyala()) kirimAntre(true); });

  /* ---------- modal: standby ---------- */
  function htmlSbTunjuk(t) {
    var m = M();
    return A.kepalaModal('👷 Tunjuk (standby)', t) + '<div class="sb">Unit standby langsung pindah ke <b>Dikerjakan</b> dengan mekanik ini.</div><div class="pkaLbl">Ketuk petugas <small>boleh lebih dari 1</small></div>' + A.chipsMekanik(m.pilih) + '<div id="pkaBkW">' + A.htmlBengkel() + '</div>'
      + '<button type="button" class="pkaTombol kn" data-p="stSbTunjukYa">👷 TUNJUK MEKANIK</button><div class="pkaMsg"></div>';
  }
  function htmlSbReady(t) {
    var m = M();
    return A.kepalaModal('🟢 Akhiri standby', t) + '<div class="sb">Unit dicatat <b>READY</b> (jalan lagi). Standby / tahan otomatis berakhir, dan unit bisa ambil uang jalan lagi di GASPOL.</div>'
      + '<div class="pkaLbl">Nama driver <span class="w">wajib</span></div><select class="pkaIn" id="stDrv">' + (PIL ? opsiDriver(m) : '<option>' + e(m.drv || '') + '</option>') + '</select>' + htmlFoto(m, 'Foto unit') + htmlSetuju(m)
      + '<button type="button" class="pkaTombol hj" data-p="stSbReadyYa">🟢 CATAT READY</button><div class="pkaMsg"></div>';
  }
  function kirimSbReady() {
    baca(); var m = M(), t = m.t;
    if (!m.drv || /^TIDAK ADA DRIVER$/i.test(m.drv)) { A.msg('Pilih nama driver yang membawa unit.', 'err'); return; }
    if (m.perlu && !m.setuju) { A.msg('Centang dulu "Ya, tutup semua tiket itu".', 'err'); return; }
    A.kunci(true); A.msg('Menyimpan…');
    A.panggil('pksStandbyReady', { armada: t.ar, id: t.id, driver: m.drv, foto: m.foto || '', cid: m.cid, setujuTutup: !!m.setuju }, 90000).then(function (h) {
      if (M() !== m) return;
      if (!h || !h.ok) { A.kunci(false); if (h && h.perluSetuju) { m.perlu = h.tiket || []; m.setuju = false; segar(); } A.msg((h && h.pesan) || 'Gagal menyimpan.', 'err'); if (h && h.hilang) A.muat(true); return; }
      A.roti('✅ ' + h.pesan); A.tutupModal(); A.muat(true);
    }, function (x) { if (M() !== m) return; A.kunci(false); A.msg(((x && x.message) || 'Tidak ada sinyal.') + ' — belum tersimpan, coba lagi.', 'err'); });
  }

  /* ---------- modal: cek selip ---------- */
  function htmlSelip() {
    var m = M(), x = m.x, h = '<h3>📦 Cek selip <span style="font-weight:900">' + e(x.lb) + '</span><button type="button" class="tutupX" data-p="tutupModal" aria-label="Tutup">✕</button></h3>';
    h += '<div class="sb">Barang <b>' + e(x.detail) + '</b> keluar gudang untuk unit <b>' + e(x.lb) + '</b>, tapi belum ada tiket kerja di Pos Kontrol.<br>PIC ' + e(x.pic || '-') + ' · cek ' + e(x.slot || '') + '</div>';
    if (!S().proses) return h + '<div class="pkaPita">Diproses oleh pengawas yang sudah absen / pimpinan.</div><div class="pkaMsg"></div>';
    h += '<div class="pkaBox"><div class="pkaLbl" style="margin-top:0">🔧 (a) Buat tiket & tunjuk mekanik</div><div class="sb">Form buat tiket terisi otomatis (unit + pekerjaan dari nama barang).</div><button type="button" class="pkaTombol kn" style="margin-top:0" data-p="stSelipA">🔧 BUAT TIKET</button></div>';
    h += '<div class="pkaBox"><div class="pkaLbl" style="margin-top:0">✅ (b) Tandai sudah dikerjakan</div><div class="sb">Ketuk mekanik yang mengerjakan + jam selesai. Tiket dibuat, ditunjuk, lalu form Selesaikan terbuka.</div>' + ((A.chipsJenis && A.chipsJenis(m.pilih, 'PERBAIKAN')) || A.chipsMekanik(m.pilih)) + '<div id="pkaBkW">' + A.htmlBengkel() + '</div>'
      + '<div class="pkaLbl">Jam selesai</div><input class="pkaIn" id="stSelipJam" type="datetime-local" value="' + e(m.jam || A.jamKiniLokal()) + '"><button type="button" class="pkaTombol hj" data-p="stSelipB">✅ SUDAH DIKERJAKAN</button></div>';
    h += '<div class="pkaBox"><div class="pkaLbl" style="margin-top:0">🚫 (c) Bukan perbaikan / salah catat</div><textarea class="pkaIn" id="stSelipAl" placeholder="alasan wajib (mis. barang stok cadangan, salah tulis nomor unit)">' + e(m.alasan || '') + '</textarea><button type="button" class="pkaTombol mrh" data-p="stSelipC">🚫 TANDAI BUKAN PERBAIKAN</button></div>';
    return h + '<div class="pkaMsg"></div>';
  }

  /* ---------- modal: tiket (gambar / cetak) ---------- */
  function htmlTiket(t) {
    var m = M(), buka = t.g !== 'selesai', bisaWeb = buka && !t.gb && /^(PERBAIKAN|STORING|SERVICE|GREASE)$/.test(t.jenis || '') && (t.g === 'menunggu' || t.g === 'dikerjakan' || t.g === 'pending');
    var h = A.kepalaModal(buka ? '🖨️ Tiket' : '🖼️ Tiket selesai', t);
    h += '<div class="pkaLbl" style="margin-top:0">Lebar kertas</div><div class="pkaChips">' + [['80', '80 mm'], ['58', '58 mm']].map(function (k) { return '<button type="button" data-p="stKertas:' + k[0] + '" class="' + (m.kertas === k[0] ? 'on' : '') + '">' + k[1] + '</button>'; }).join('') + '</div><div id="stTkW"></div>';
    h += '<button type="button" class="pkaTombol" data-p="stTkBagi">📤 Simpan / bagikan gambar tiket</button>';
    h += '<div class="sb" style="margin-top:8px">' + (buka ? 'Gambar pas untuk printer termal: bagikan ke app printer Bluetooth (mis. RawBT) lalu cetak.' : 'Gambar tiket selesai untuk dibagikan / arsip.') + ' Cetak langsung dari app belum bisa (butuh Bluetooth di APK).</div>';
    if (bisaWeb) h += '<button type="button" class="pkaTombol abu" data-p="stTkLama">🖥️ Cetak langsung di halaman lama (Bluetooth / dot matrix)</button>';
    return h + '<div class="pkaMsg"></div>';
  }

  /* ---------- modal: yang bertugas ---------- */
  function kerjaOrang(nama) { var N = String(nama || '').toUpperCase(); return (D().tiket || []).filter(function (t) { return (t.g === 'dikerjakan' || t.g === 'pending') && String(t.mek || '').toUpperCase().split(/[^A-Z]+/).indexOf(N) >= 0; }).map(function (t) { return A.lbPendek(t.lb); }); }
  function htmlPetugas() {
    var h = '<h3>👷 Yang bertugas<button type="button" class="tutupX" data-p="tutupModal" aria-label="Tutup">✕</button></h3>';
    if (!PT) return h + '<div class="pkaKosong"><span class="putar"></span> Memuat…</div><div class="pkaMsg"></div>';
    if (!PT.ok) return h + '<div class="pkaPita mrh">⚠️ ' + e(PT.pesan || 'Gagal memuat.') + '</div><div class="pkaMsg"></div>';
    var ms = D().ms || [], m = M();
    h += '<div class="sb">Aktif otomatis dari absen masuk di App WHL. ' + (PT.bolehTandai ? 'Ketuk nama yang <b>belum absen</b> untuk menandai bertugas manual (tekan 2x); ketuk yang bertanda <b>manual</b> untuk mencabut.' : 'Menandai manual hanya oleh pengawas yang sudah absen / pimpinan.') + '</div>';
    if (PT.pimpinan) h += '<div class="pkaLbl" style="margin-top:0">Jam lembur saat menandai <small>pimpinan · lewat jam pulang</small></div><select class="pkaIn" id="stPtJam">' + [0, 1, 2, 3, 4, 5, 6].map(function (j) { return '<option value="' + j + '"' + (String(m.ptJam || '0') === String(j) ? ' selected' : '') + '>' + (j ? j + ' jam' : 'tanpa jam lembur') + '</option>'; }).join('') + '</select>';
    [['pengawas', '🧑‍✈️ Pengawas'], ['mekanik', '🔧 Mekanik'], ['tyreman', '🛞 Tyreman'], ['admin', '🗂️ Admin']].forEach(function (g) {
      var l = (PT.grup || {})[g[0]] || []; if (!l.length) return;
      h += '<div class="pkaLbl">' + g[1] + ' <small>' + l.filter(function (x) { return x.aktif; }).length + ' aktif dari ' + l.length + '</small></div><div class="pkaChips">' + l.map(function (x) {
        var u = g[0] === 'mekanik' || g[0] === 'tyreman' ? kerjaOrang(x.nama) : [], bisa = PT.bolehTandai && (!x.aktif || x.manual);
        return '<button type="button" data-p="stPt:' + e(g[0] + '|' + x.nama) + '" class="' + (x.aktif ? 'on' : '') + (u.length ? ' kerja' : '') + '"' + (bisa ? '' : ' data-kunci="1"') + '>' + e(x.nama) + (ms.indexOf(x.nama) >= 0 ? ' 🛢️' : '') + '<small>' + e(x.ket) + (u.length ? ' · 🔧 ' + e(u.join(', ')) : x.aktif && (g[0] === 'mekanik' || g[0] === 'tyreman') ? ' · kosong' : '') + '</small></button>';
      }).join('') + '</div>';
    });
    return h + '<div class="pkaMsg"></div>';
  }
  function muatPetugas() { PT = null; A.bukaModal('stPetugas', null, { ptJam: '0' }); var m = M(); A.panggil('pksPetugas', {}, 45000).then(function (h) { PT = h || { ok: false }; if (M() === m) segar(); }, function (x) { PT = { ok: false, pesan: (x && x.message) || 'Tidak ada sinyal.' }; if (M() === m) segar(); }); }

  /* ---------- modal: belum masuk ---------- */
  function htmlBelum() {
    var m = M(), h = '<h3>🚚 Belum masuk<button type="button" class="tutupX" data-p="tutupModal" aria-label="Tutup">✕</button></h3>';
    if (!m.l) return h + '<div class="pkaKosong"><span class="putar"></span> Memuat…</div><div class="pkaMsg"></div>';
    h += '<div class="sb"><b>' + m.l.length + ' unit</b> belum punya laporan Pos Kontrol hari ini.' + (S().proses ? ' Ketuk nomor = buat tiket / catat unit itu.' : '') + '</div>';
    ['TRINTIN', 'TRONTON'].forEach(function (ar) {
      var l = m.l.filter(function (u) { return u.ar === ar; }); if (!l.length) return;
      h += '<div class="pkaLbl">' + (ar === 'TRONTON' ? 'Tronton' : 'Trintin') + ' <small>' + l.length + ' unit</small></div><div class="stUnit">' + l.map(function (u) { return '<button type="button" data-p="stBlm:' + e(u.ar + '|' + u.lb) + '">' + e(A.lbPendek(u.lb)) + '</button>'; }).join('') + '</div>';
    });
    if (!m.l.length) h += '<div class="pkaKosong">🎉 Semua unit sudah masuk Pos Kontrol hari ini.</div>';
    return h + '<div class="pkaMsg"></div>';
  }

  /* ---------- modal: riwayat & revisi lengkap ---------- */
  var WST = { 'SELESAI': '#16a34a', 'DIBATALKAN': '#dc2626', 'SEDANG DIKERJAKAN': '#1565c0', 'MENUNGGU PENUNJUKAN': '#d97706', 'STANDBY': '#64748b' };
  function muatRiwayat() { var m = M(); RW = null; segar(); A.panggil('pksRiwayat', { tanggal: m.tgl, armada: m.arm || '' }, 60000).then(function (h) { RW = h || { ok: false }; if (M() === m) segar(); }, function (x) { RW = { ok: false, pesan: (x && x.message) || 'Tidak ada sinyal.' }; if (M() === m) segar(); }); }
  function htmlRiwayat() {
    var m = M(), h = '<h3>📅 Riwayat<button type="button" class="tutupX" data-p="tutupModal" aria-label="Tutup">✕</button></h3>';
    h += '<div class="pkaDua"><input class="pkaIn" id="stRwTgl" type="date" value="' + e(m.tgl) + '" max="' + isoTgl(new Date()) + '"><div class="stArm">' + [['', 'Semua'], ['TRINTIN', 'Trintin'], ['TRONTON', 'Tronton']].map(function (a) { return '<button type="button" data-p="stRwArm:' + a[0] + '" class="' + ((m.arm || '') === a[0] ? 'on' : '') + '">' + a[1] + '</button>'; }).join('') + '</div></div><div style="height:10px"></div>';
    if (!RW) return h + '<div class="pkaKosong"><span class="putar"></span> Memuat…</div><div class="pkaMsg"></div>';
    if (!RW.ok) return h + '<div class="pkaPita mrh">⚠️ ' + e(RW.pesan || 'Gagal memuat.') + '</div><div class="pkaMsg"></div>';
    var l = RW.tiket || [];
    h += '<div class="sb">' + l.length + ' tiket masuk tanggal ini (semua status, termasuk dibatalkan). Ketuk untuk detail' + (RW.revisi ? ' / revisi.' : '.') + '</div>';
    h += l.length ? l.map(function (r, i) { return '<button type="button" class="stRow" style="--c:' + (WST[r.st] || '#64748b') + '" data-p="stRw:' + i + '"><b>' + e(A.lbPendek(r.lb)) + (r.ar === 'TRONTON' ? '<small style="font-size:9px"> TR</small>' : '') + '</b><span class="i">' + e(String(r.jamMasuk).slice(11)) + ' · ' + e(JL[r.jenis] || r.jenis) + (r.mek ? ' · 🔧 ' + e(r.mek) : '') + '<br>' + e(String(r.ker || '').slice(0, 90)) + '</span><span class="tg">' + e(r.st === 'SEDANG DIKERJAKAN' ? 'DIKERJAKAN' : r.st === 'MENUNGGU PENUNJUKAN' ? 'MENUNGGU' : r.st) + '</span></button>'; }).join('') : '<div class="pkaKosong">Tidak ada tiket masuk di tanggal ini.</div>';
    return h + '<div class="pkaMsg"></div>';
  }
  function htmlRwDet() {
    var r = M().r, h = '<h3>' + e(r.lb) + ' <span class="pkaBd" style="--c:' + (WST[r.st] || '#64748b') + ';background:' + (WST[r.st] || '#64748b') + '">' + e(r.st) + '</span><button type="button" class="tutupX" data-p="tutupModal" aria-label="Tutup">✕</button></h3>';
    h += '<div class="pkaBox">' + A.baris('Jenis', JL[r.jenis] || r.jenis) + A.baris('Driver', r.drv) + A.baris('Keterangan', r.ker) + A.baris('Dilaporkan', r.lapor) + A.baris('Mekanik', r.mek) + A.baris('Ditunjuk oleh', r.oleh) + A.baris('Jam masuk', r.jamMasuk) + A.baris('Jam selesai / batal', r.jamSelesai) + A.baris('Pending', r.kp) + A.baris('Pekerjaan', r.ks) + A.baris('Alasan batal', r.kb) + A.baris('KM', r.km) + '</div><div class="pkaAksiD">';
    if (RW && RW.revisi && /SELESAI|BATAL/.test(r.st) && r.jenis !== 'GANTI BAN') h += '<button type="button" class="pkaTombol penuh" data-p="stRev">✏️ Revisi lengkap (status, jenis, mekanik, jam)</button>';
    else if (RW && RW.revisi && !/SELESAI|BATAL/.test(r.st)) h += '<div class="pkaPita penuh">Tiket ini masih terbuka — proses dari papan.</div>';
    h += '<button type="button" class="pkaTombol abu" data-p="stRwWa">📤 Bagikan WhatsApp</button><button type="button" class="pkaTombol abu" data-p="stRwKembali">‹ Kembali ke daftar</button></div>';
    return h + '<div class="pkaMsg"></div>';
  }
  function rwKeT(r) { return { id: r.id, ar: r.ar, lb: r.lb, jenis: r.jenis, g: /SELESAI/.test(r.st) ? 'selesai' : '', st: r.st, drv: r.drv, lapor: r.lapor, mek: r.mek, ker: r.ker, jamMasuk: r.jamMasuk, jamSelesai: r.jamSelesai, ks: r.ks || r.kb, kp: r.kp }; }
  function bukaRevisi(r, dari) {
    var st = /BATAL/.test(r.st) ? 'BATAL' : 'SELESAI';
    A.bukaModal('stRevisi', null, { r: r, dari: dari, st: st, jn: r.jenis, mek: r.mek || '', oleh: r.oleh || '', jam: webKeIso(r.jamSelesai), ket: String((st === 'BATAL' ? r.kb : r.ks) || '').replace(/\s*·\s*direvisi\s+[^·]*$/, ''), km: r.km || '' });
  }
  function htmlRevisi() {
    var m = M(), r = m.r, h = '<h3>✏️ Revisi <span style="font-weight:900">' + e(r.lb) + '</span><button type="button" class="tutupX" data-p="tutupModal" aria-label="Tutup">✕</button></h3>';
    h += '<div class="sb">Masuk ' + e(r.jamMasuk) + ' · ' + e(String(r.ker || '').slice(0, 120)) + '<br>Foto & tanda tangan tidak berubah. Revisi tercatat atas nama <b>' + e(S().nama || '') + '</b>.</div>';
    h += '<div class="pkaLbl">Status</div><div class="pkaChips">' + [['SELESAI', '✅ Selesai'], ['PENDING', '⏸ Buka lagi (Pending)'], ['BATAL', '❌ Batal']].map(function (x) { return '<button type="button" data-p="stRvSt:' + x[0] + '" class="' + (m.st === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
    h += '<div class="pkaLbl">Jenis</div><div class="pkaChips">' + ['PERBAIKAN', 'STORING', 'SERVICE', 'GREASE', 'READY'].map(function (j) { return '<button type="button" data-p="stRvJn:' + j + '" class="' + (m.jn === j ? 'on' : '') + '">' + e(JL[j]) + '</button>'; }).join('') + '</div>';
    h += '<div class="pkaLbl">Yang mengerjakan <small>pisahkan dengan koma · bengkel luar = "Bengkel …"</small></div><input class="pkaIn" id="stRvMek" value="' + e(m.mek) + '">';
    h += '<div class="pkaLbl">Ditunjuk oleh <small>kosong = tidak diubah</small></div><input class="pkaIn" id="stRvOleh" value="' + e(m.oleh) + '">';
    if (m.st !== 'PENDING') h += '<div class="pkaLbl">Jam ' + (m.st === 'BATAL' ? 'batal' : 'selesai') + ' <small>kosong = tidak diubah</small></div><input class="pkaIn" id="stRvJam" type="datetime-local" value="' + e(m.jam) + '">';
    if (m.st === 'SELESAI' && m.jn === 'SERVICE') h += '<div class="pkaLbl">KM unit <span class="w">wajib (service)</span></div><input class="pkaIn" id="stRvKm" inputmode="numeric" value="' + e(m.km) + '">';
    h += '<div class="pkaLbl">' + (m.st === 'SELESAI' ? 'Keterangan perbaikan' : m.st === 'BATAL' ? 'Alasan batal' : 'Alasan dibuka lagi') + ' <span class="w">wajib</span></div><textarea class="pkaIn" id="stRvKet" style="min-height:96px">' + e(m.ket) + '</textarea>';
    return h + '<button type="button" class="pkaTombol" data-p="stRvYa">✏️ Simpan revisi</button><div class="pkaMsg"></div>';
  }

  /* ---------- modal: kwitansi storing ---------- */
  function muatKws() { var m = M(); KW = null; A.panggil('kwitansi', {}, 45000).then(function (h) { KW = h || { ok: false }; if (M() === m) segar(); }, function (x) { KW = { ok: false, pesan: (x && x.message) || 'Tidak ada sinyal.' }; if (M() === m) segar(); }); }
  function muatRekap() { var m = M(); RK = null; var d1 = new Date(), d0 = new Date(d1.getTime() - 30 * 86400000); A.panggil('pksKwsRekap', { dari: isoTgl(d0), sampai: isoTgl(d1), ikutBatal: true }, 45000).then(function (h) { RK = h || { ok: false }; if (M() === m) segar(); }, function (x) { RK = { ok: false, pesan: (x && x.message) || 'Tidak ada sinyal.' }; if (M() === m) segar(); }); }
  function htmlKws() {
    var m = M(), h = '<h3>🧾 Kwitansi storing<button type="button" class="tutupX" data-p="tutupModal" aria-label="Tutup">✕</button></h3>';
    h += '<div class="stTabM"><button type="button" data-p="stKwTab:pilih" class="' + (m.tabK === 'pilih' ? 'on' : '') + '">Pilih tiket</button><button type="button" data-p="stKwTab:rekap" class="' + (m.tabK === 'rekap' ? 'on' : '') + '">Rekap 30 hari</button></div>';
    if (m.tabK === 'rekap') {
      if (!RK) return h + '<div class="pkaKosong"><span class="putar"></span> Memuat…</div><div class="pkaMsg"></div>';
      if (!RK.ok) return h + '<div class="pkaPita mrh">⚠️ ' + e(RK.pesan || 'Gagal memuat.') + '</div><div class="pkaMsg"></div>';
      h += '<div class="pkaBox">' + A.baris('Kwitansi aktif', String(RK.jumlahKwitansi)) + A.baris('Tiket', String(RK.jumlahTiket)) + A.baris('Total', rp(RK.total)) + '</div>';
      if ((RK.perMekanik || []).length) h += '<div class="pkaLbl">Per mekanik</div><div class="pkaBox">' + RK.perMekanik.map(function (p) { return A.baris(e(p.nama) + ' (' + p.tiket + ' tiket)', rp(p.nilai)); }).join('') + '</div>';
      h += '<div class="pkaLbl">Daftar kwitansi</div>' + ((RK.daftar || []).length ? RK.daftar.map(function (k) {
        var batal = /BATAL/i.test(k.status);
        return '<div class="pkaKw"' + (batal ? ' style="opacity:.6"' : '') + '><span class="rp">' + rp(k.total) + '</span><b>' + e(k.no) + '</b> · ' + e(k.tanggal) + '<br>🔧 ' + e(k.tim || '-') + ' · ' + k.baris.length + ' tiket: ' + e(k.baris.map(function (b) { return A.lbPendek(b.lb); }).join(', ')) + '<br>'
          + (batal ? '❌ BATAL: ' + e(k.alasanBatal || '') : 'dibuat ' + e(k.oleh || '-') + ' · dicetak ' + k.cetak + 'x' + (S().kwitansi ? ' <button type="button" class="stKecil" data-p="stKwBatal:' + e(k.no) + '">Batalkan</button>' : ''))
          + (m.batalNo === k.no ? '<textarea class="pkaIn" id="stKwBtl" style="margin-top:6px" placeholder="alasan batal (wajib, min. 5 huruf)">' + e(m.batalAl || '') + '</textarea><button type="button" class="pkaTombol mrh" data-p="stKwBatalYa">❌ BATALKAN ' + e(k.no) + '</button>' : '') + '</div>';
      }).join('') : '<div class="pkaKosong">Belum ada kwitansi 30 hari terakhir.</div>');
      return h + '<button type="button" class="pkaTombol abu" data-p="lamaKws">🖨️ Cetak / cetak ulang (dot matrix) di halaman lama</button><div class="pkaMsg"></div>';
    }
    if (m.hasil) return h + '<div class="pkaPita br">✅ Kwitansi <b>' + e(m.hasil.no) + '</b> dibuat · ' + rp(m.hasil.total) + '<br>' + e(m.hasil.terbilang) + '<br>Penerima: ' + e(m.hasil.penerima) + '</div><button type="button" class="pkaTombol" data-p="lamaKws">🖨️ Cetak di halaman lama (dot matrix)</button><button type="button" class="pkaTombol abu" data-p="stKwLagi">Buat kwitansi lain</button><div class="pkaMsg"></div>';
    if (!KW) return h + '<div class="pkaKosong"><span class="putar"></span> Memuat…</div><div class="pkaMsg"></div>';
    if (!KW.ok || !KW.ada) return h + '<div class="pkaPita' + (KW.ok ? '' : ' mrh') + '">' + e(KW.pesan || 'Belum ada.') + '</div><div class="pkaMsg"></div>';
    var L = (KW.tiket || []).filter(function (x) { return !x.no; }), tot = 0, perlu = false;
    h += '<div class="sb">Tiket STORING selesai 14 hari terakhir yang <b>belum punya kwitansi</b>: ' + L.length + '. Centang 1 atau beberapa → 1 kwitansi.</div>';
    h += L.length ? L.map(function (x) {
      var k = x.ar + '|' + x.id, on = !!m.cek[k], kor = m.kor[k] || {}, kurang = x.tarif == null;
      if (on) { if (kurang && !(kor.zona && kor.kategori)) perlu = true; else if (!kurang) tot += Number(x.tarif) || 0; }
      var s = '<button type="button" class="stKw' + (on ? ' on' : '') + '" data-p="stKwC:' + e(k) + '"><span class="ck">' + (on ? '✓' : '') + '</span><span><b>' + e(A.lbPendek(x.lb)) + '</b> · ' + e(x.jamSelesai || '') + '<br>🔧 ' + e(x.tim || '-') + ' · ' + e(x.kategori || 'kategori ?') + ' · ' + e(x.lokasi || 'zona ?') + '</span><span class="rp">' + (kurang ? '<span style="color:#dc2626">perlu koreksi</span>' : rp(x.tarif)) + '</span></button>';
      if (on && kurang) s += '<div class="pkaDua" style="margin:-2px 0 8px"><select class="pkaIn" data-kz="' + e(k) + '"><option value="">— zona —</option>' + ZONA.map(function (z) { return '<option' + (kor.zona === z ? ' selected' : '') + '>' + z + '</option>'; }).join('') + '</select><select class="pkaIn" data-kk="' + e(k) + '"><option value="">— kategori —</option>' + ['RINGAN', 'ELEKTRIKAL RINGAN', 'SEDANG', 'ELEKTRIKAL BERAT', 'BERAT'].map(function (z) { return '<option' + (kor.kategori === z ? ' selected' : '') + '>' + z + '</option>'; }).join('') + '</select></div>';
      return s;
    }).join('') : '<div class="pkaKosong">Semua tiket storing sudah punya kwitansi 👍</div>';
    var n = Object.keys(m.cek).filter(function (k) { return m.cek[k]; }).length, adaKor = Object.keys(m.kor).some(function (k) { return m.cek[k] && (m.kor[k].zona || m.kor[k].kategori); });
    if (adaKor) h += '<div class="pkaLbl">Alasan koreksi <span class="w">wajib</span></div><input class="pkaIn" id="stKwAl" value="' + e(m.alasan || '') + '" placeholder="mis. KM tidak tertulis di tiket, lokasi Servo KM 80">';
    if (L.length) h += '<button type="button" class="pkaTombol" data-p="stKwBuatYa"' + (n ? '' : ' disabled') + '>🧾 BUAT KWITANSI (' + n + ' tiket' + (tot ? ' · ' + rp(tot) + (perlu || adaKor ? ' + koreksi' : '') : '') + ')</button>';
    return h + '<button type="button" class="pkaTombol abu" data-p="lamaKws">🖨️ Cetak (dot matrix) di halaman lama</button><div class="pkaMsg"></div>';
  }

  /* ---------- html & sesudah modal ---------- */
  function html(j, t) {
    if (j === 'stBuat') return htmlBuat();
    if (j === 'stSbTunjuk') return htmlSbTunjuk(t);
    if (j === 'stSbReady') return htmlSbReady(t);
    if (j === 'stSelip') return htmlSelip();
    if (j === 'stTiket') return htmlTiket(t);
    if (j === 'stPetugas') return htmlPetugas();
    if (j === 'stBelum') return htmlBelum();
    if (j === 'stRiwayat') return htmlRiwayat();
    if (j === 'stRwDet') return htmlRwDet();
    if (j === 'stRevisi') return htmlRevisi();
    if (j === 'stKws') return htmlKws();
    if (/^stGs/.test(j)) return gsHtml(j, t); /* pk-ganti-shift-pending-27nov */
    return '';
  }
  function sesudahModal(w, j) {
    ['stFileKam', 'stFileGal'].forEach(function (id) { var inp = w.querySelector('#' + id); if (inp && !inp._st) { inp._st = 1; inp.addEventListener('change', function () { bacaFoto(inp); }); } });
    if (j === 'stTiket') { var m = M(), ww = w.querySelector('#stTkW'); if (ww && m && m.t) { var cv = tiketKanvas(m.t, m.kertas === '58' ? 384 : 576); cv.className = 'stTk'; cv.style.width = (m.kertas === '58' ? 230 : 300) + 'px'; ww.innerHTML = ''; ww.appendChild(cv); } }
  }

  /* ---------- ketukan & isian ---------- */
  function ubah(ev) {
    var x = ev.target, m = M();
    if (x.id === 'stCari') { if (ev.type !== 'input') return true; CARI = x.value; A.gambarPapan(); var i = q('#stCari'); if (i) { i.focus(); try { i.setSelectionRange(CARI.length, CARI.length); } catch (z) { /* */ } } return true; }
    if (!m || !/^st/.test(m.jenis || '')) return false;
    if (x.id === 'stRwTgl' && ev.type === 'change') { m.tgl = x.value; if (m.tgl) muatRiwayat(); return true; }
    if (x.getAttribute && x.getAttribute('data-kz') && ev.type === 'change') { var k1 = x.getAttribute('data-kz'); (m.kor[k1] = m.kor[k1] || {}).zona = x.value; baca(); segar(); return true; }
    if (x.getAttribute && x.getAttribute('data-kk') && ev.type === 'change') { var k2 = x.getAttribute('data-kk'); (m.kor[k2] = m.kor[k2] || {}).kategori = x.value; baca(); segar(); return true; }
    if (x.id === 'stLb' && ev.type === 'change') { baca(); var ar = armadaLb(m.lb); if (ar && ar !== m.ar) m.ar = ar; m.drv = ''; segar(); return true; }
    if (/^st/.test(x.id || '')) { if (ev.type === 'change' || x.tagName === 'TEXTAREA' || x.tagName === 'INPUT') baca(); return false; }
    return false;
  }
  function klik(n, v, b) {
    var m = M(), t, me = S();
    if (!A || !nyala()) return false;
    if (gsKlik(n, v, b)) return true; /* pk-ganti-shift-pending-27nov */
    /* --- papan --- */
    if (n === 'stBuat') { bukaBuat(null); return true; }
    if (n === 'stAntreKirim') { kirimAntre(false); return true; }
    if (n === 'stAntreBuang') { A.duaKali(b, function () { simpanLokal(KA, null); A.gambarPapan(); }); return true; }
    if (n === 'stArmF') { ARMF = v; A.gambarPapan(); return true; }
    if (n === 'stPerBuka') { PERB = !PERB; A.gambarPapan(); return true; }
    if (n === 'sbTunjuk' || n === 'sbReady' || n === 'cetak' || n === 'stWa' || n === 'stSalin') {
      t = A.cariT(v);
      if (!t) { A.roti('Tiket belum ada di papan / sudah berubah. Papan dimuat ulang — buka dari kartunya.'); A.muat(true); return true; }
      if (n === 'sbTunjuk') { A.bukaModal('stSbTunjuk', t, { pilih: [], bk: '', bkTulis: '' }); return true; }
      if (n === 'sbReady') { A.bukaModal('stSbReady', t, { drv: /^TIDAK ADA DRIVER$/i.test(t.drv || '') ? '' : (t.drv || ''), lb: t.lb, jn: 'READY', foto: '', cid: cid(), setuju: false, perlu: null }); muatPilihan(function () { if (M() && M().jenis === 'stSbReady') segar(); }); return true; }
      if (n === 'cetak') { var kr = bacaLokal('whlPkKertas'); A.bukaModal('stTiket', t, { kertas: kr === '58' ? '58' : '80' }); sesudahGambar(); return true; }
      if (n === 'stWa') { bagiTeks(t); return true; }
      salinTeks(t); return true;
    }
    if (n === 'stSelip') { var x = ((St() || {}).selip || [])[+v]; if (x) A.bukaModal('stSelip', null, { x: x, pilih: [], bk: '', bkTulis: '', jam: '', alasan: '' }); return true; }
    if (tahapB()) {
      if (n === 'stPetugas') { muatPetugas(); return true; }
      if (n === 'stBelum') { A.bukaModal('stBelum', null, { l: null }); var mb = M(); A.panggil('pksBelum', {}, 45000).then(function (h) { if (M() !== mb) return; mb.l = h && h.ok ? h.unit : []; segar(); if (!(h && h.ok)) A.msg((h && h.pesan) || 'Gagal memuat.', 'err'); }, function () { if (M() !== mb) return; mb.l = []; segar(); A.msg('Tidak ada sinyal.', 'err'); }); return true; }
      if (n === 'stRiwayat') { A.bukaModal('stRiwayat', null, { tgl: isoTgl(new Date()), arm: '' }); muatRiwayat(); return true; }
      if (n === 'kwitansi') { KW = null; A.bukaModal('stKws', null, { tabK: 'pilih', cek: {}, kor: {}, alasan: '', hasil: null, batalNo: '', batalAl: '' }); muatKws(); return true; }
      if (n === 'revisi') { t = A.cariT(v); if (!t || t.gb) return false; bukaRevisi({ id: t.id, ar: t.ar, lb: t.lb, jenis: t.jenis, st: 'SELESAI', mek: t.mek, oleh: t.oleh, jamMasuk: t.jamMasuk, jamSelesai: t.jamSelesai, ks: t.ks, ker: t.ker, km: '', tanggal: webKeIso(t.jamMasuk).slice(0, 10) }, 'papan'); return true; }
    }
    if (!m) return false;
    /* --- kotak storing (juga dipakai form Selesaikan milik poskontrol.js) --- */
    if (n === 'stZona') { m.stZona = m.stZona === v ? '' : v; var w1 = q('#stStoW'); if (w1) w1.innerHTML = kotakStoringIsi(m); A.lepasSiap(); return true; }
    if (n === 'stPek') { var ip = v.indexOf('|'), kat = v.slice(0, ip), nm = v.slice(ip + 1); m.stPek = m.stPek || []; var ada = m.stPek.filter(function (p) { return p.nama === nm; }).length; m.stPek = ada ? m.stPek.filter(function (p) { return p.nama !== nm; }) : m.stPek.concat([{ nama: nm, kategori: kat }]); m.stBuka = kat; var w2 = q('#stStoW'); if (w2) w2.innerHTML = kotakStoringIsi(m); A.lepasSiap(); return true; }
    if (!/^st/.test(m.jenis || '')) return false;
    /* --- form buat --- */
    if (n === 'stArm') { baca(); m.ar = v; m.lb = ''; m.drv = ''; segar(); return true; }
    if (n === 'stJenis') { baca(); m.jn = v; m.perlu = null; m.setuju = false; if (v !== 'STANDBY') m.al = ''; segar(); return true; }
    if (n === 'stAl') { baca(); m.al = m.al === v ? '' : v; if (m.al === 'Tidak ada driver' && !m.drv && PIL) m.drv = PIL.tanpa; segar(); return true; }
    if (n === 'stSetuju') { baca(); m.setuju = !m.setuju; segar(); return true; }
    if (n === 'stFoto') { var fi = q('#stFile' + v); if (fi) fi.click(); return true; }
    if (n === 'stBuatYa') { A.duaKali(b, kirimBuat); return true; }
    if (n === 'stSbTunjukYa') { var mk = A.namaTerpilih(); if (!mk) { A.msg(m.pilih.length ? 'Isi nama bengkel luarnya.' : 'Ketuk dulu nama mekaniknya.', 'err'); return true; } A.duaKali(b, function () { A.kirim('pksStandbyTunjuk', { armada: m.t.ar, id: m.t.id, mekanik: mk }, function (h) { A.roti('✅ ' + h.pesan); A.tutupModal(); A.setTab('dikerjakan'); A.muat(true); }); }); return true; }
    if (n === 'stSbReadyYa') { A.duaKali(b, kirimSbReady); return true; }
    /* --- cek selip --- */
    if (n === 'stSelipA' || n === 'stSelipB') {
      baca(); var x2 = m.x, ar2 = armadaLb(x2.lb) || 'TRINTIN', awal = { ar: ar2, lb: x2.lb, jn: 'PERBAIKAN', ket: 'Cek selip gudang: ' + x2.detail, selip: { mode: 'buat' } };
      if (n === 'stSelipB') {
        if (!m.pilih.length || !A.namaTerpilih()) { A.msg('Ketuk mekanik yang mengerjakan.', 'err'); return true; }
        if (!m.jam) { A.msg('Isi jam selesai.', 'err'); return true; }
        awal.selip = { mode: 'sudah', jam: m.jam }; awal.pilih = m.pilih.slice(); awal.bk = m.bk; awal.bkTulis = m.bkTulis;
      }
      bukaBuat(awal); return true;
    }
    if (n === 'stSelipC') { baca(); if (String(m.alasan || '').trim().length < 5) { A.msg('Tulis alasannya (kenapa bukan perbaikan / salah catat).', 'err'); return true; } A.duaKali(b, function () { A.kirim('pksSelipBukan', { slot: m.x.slot, sumber: m.x.sumber, lambung: m.x.lb, alasan: String(m.alasan).trim() }); }); return true; }
    /* --- tiket --- */
    if (n === 'stKertas') { m.kertas = v; simpanLokal('whlPkKertas', v); segar(); return true; }
    if (n === 'stTkBagi') { bagiGambar(m.t, m.kertas === '58' ? 384 : 576); return true; }
    if (n === 'stTkLama') { A.bukaLama(m.t.ar, m.t.id); return true; }
    /* --- yang bertugas --- */
    if (n === 'stPt') {
      var ig = v.indexOf('|'), grup = v.slice(0, ig), nama = v.slice(ig + 1), o = ((PT && PT.grup && PT.grup[grup]) || []).filter(function (p) { return p.nama === nama; })[0];
      if (!o) return true;
      if (!PT.bolehTandai) { A.msg('Menandai manual hanya oleh pengawas yang sudah absen / pimpinan.', 'err'); return true; }
      if (o.aktif && !o.manual) { A.msg(nama + ' sudah aktif dari absen — tidak perlu ditandai.', ''); return true; }
      baca();
      A.duaKali(b, function () { A.kirim('pksPetugasSet', { grup: grup, nama: nama, aktif: !o.aktif, jam: m.ptJam || 0 }, function (h) { PT = h; A.roti('✅ ' + (h.pesan || 'Tersimpan.')); segar(); A.muat(true); }); });
      return true;
    }
    /* --- belum masuk --- */
    if (n === 'stBlm') { if (!me.proses) { A.msg('Membuat tiket hanya oleh pengawas yang sudah absen / pimpinan.', 'err'); return true; } var ib = v.indexOf('|'); bukaBuat({ ar: v.slice(0, ib), lb: v.slice(ib + 1) }); return true; }
    /* --- riwayat & revisi --- */
    if (n === 'stRwArm') { m.arm = v; muatRiwayat(); return true; }
    if (n === 'stRw') { var r = ((RW && RW.tiket) || [])[+v]; if (r) A.bukaModal('stRwDet', null, { r: r, tgl: m.tgl, arm: m.arm }); return true; }
    if (n === 'stRwKembali') { A.bukaModal('stRiwayat', null, { tgl: m.tgl, arm: m.arm }); return true; }
    if (n === 'stRwWa') { bagiTeks(rwKeT(m.r)); return true; }
    if (n === 'stRev') { var rr = Object.assign({}, m.r, { tanggal: m.tgl }); bukaRevisi(rr, 'riwayat'); return true; }
    if (n === 'stRvSt') { baca(); m.st = v; if (v === 'BATAL' && m.r.kb) m.ket = m.r.kb; segar(); return true; }
    if (n === 'stRvJn') { baca(); m.jn = v; segar(); return true; }
    if (n === 'stRvYa') {
      baca(); var ket = String(m.ket || '').trim();
      if (ket.length < 3) { A.msg('Keterangan tidak boleh kosong.', 'err'); return true; }
      if (!String(m.mek || '').trim()) { A.msg('Yang mengerjakan tidak boleh kosong.', 'err'); return true; }
      if (m.st === 'SELESAI' && m.jn === 'SERVICE' && !String(m.km || '').trim()) { A.msg('KM wajib untuk jenis Service.', 'err'); return true; }
      A.duaKali(b, function () { A.kirim('pksRevisi', { armada: m.r.ar, id: m.r.id, tanggal: m.r.tanggal, status: m.st, jenis: m.jn, mekanik: m.mek, ditunjukOleh: m.oleh, jamSelesai: m.st === 'PENDING' ? '' : m.jam, keterangan: ket, km: m.km }); });
      return true;
    }
    /* --- kwitansi --- */
    if (n === 'stKwTab') { baca(); m.tabK = v; m.batalNo = ''; if (v === 'rekap' && !RK) muatRekap(); segar(); return true; }
    if (n === 'stKwC') { baca(); m.cek[v] = !m.cek[v]; segar(); return true; }
    if (n === 'stKwLagi') { m.hasil = null; m.cek = {}; m.kor = {}; m.alasan = ''; muatKws(); segar(); return true; }
    if (n === 'stKwBuatYa') {
      baca(); var pilih = Object.keys(m.cek).filter(function (k) { return m.cek[k]; }).map(function (k) { var i2 = k.indexOf('|'); return { armada: k.slice(0, i2), id: k.slice(i2 + 1), koreksi: m.kor[k] || {} }; });
      if (!pilih.length) { A.msg('Centang dulu tiketnya.', 'err'); return true; }
      A.duaKali(b, function () { A.kirim('pksKwsBuat', { tiket: pilih, alasan: m.alasan || '' }, function (h) { A.roti('✅ ' + h.pesan); m.hasil = h.kwitansi; RK = null; segar(); }); });
      return true;
    }
    if (n === 'stKwBatal') { baca(); m.batalNo = m.batalNo === v ? '' : v; m.batalAl = ''; segar(); return true; }
    if (n === 'stKwBatalYa') { baca(); if (String(m.batalAl || '').trim().length < 5) { A.msg('Alasan batal wajib (min. 5 huruf).', 'err'); return true; } A.duaKali(b, function () { A.kirim('pksKwsBatal', { no: m.batalNo, alasan: String(m.batalAl).trim() }, function (h) { A.roti('✅ ' + h.pesan); m.batalNo = ''; muatRekap(); segar(); }); }); return true; }
    return false;
  }

  /* ---------- pk-ganti-shift-pending-27nov (Posko, 27 Nov 2026): ganti shift, serah-terima, mekanik penuh, sparepart > 3 hari.
     Server = DASHBOARD PkGantiShift.gs (aksi pgs*). Data = D().gs (hanya ada kalau saklar server PK_GANTI_SHIFT nyala; tanpa itu semua fungsi di bawah diam). ---------- */
  function gsD() { var g = A && D().gs; return g && typeof g === 'object' ? g : null; }
  function gsUmur(m) { m = Math.max(0, Math.round(Number(m) || 0)); var h = Math.floor(m / 1440), j = Math.floor(m % 1440 / 60); return h ? h + ' hari ' + j + ' jam' : (j ? j + ' jam ' + (m % 60) + ' mnt' : m + ' mnt'); }
  function gsCari(k) { var g = gsD(), out = null; if (!g) return null; ['wajib', 'segera', 'serah', 'penuh', 'bolehPenuh'].forEach(function (n) { (g[n] || []).forEach(function (t) { if (!out && (t.ar + '|' + t.id) === k) out = t; }); }); return out; }
  function gsGaya() {
    if (document.getElementById('gsGaya')) return;
    var st = document.createElement('style'); st.id = 'gsGaya';
    st.textContent = '.gsSek{border:1px solid var(--garis);border-left:6px solid var(--c,#64748b);border-radius:14px;padding:9px 11px;margin-bottom:10px;background:var(--panel)}.gsSek>b{display:block;font-size:14px;font-weight:900}.gsSek>small{display:block;font-size:11.5px;color:var(--redup);margin:1px 0 7px;line-height:1.4}'
      + '.gsK{border-top:1px solid var(--garis);padding:8px 0 4px;font-size:12.5px;line-height:1.45}.gsK b.lb{font-size:16px}.gsK .bd{display:inline-block;border-radius:999px;padding:1px 8px;font-size:10.5px;font-weight:900;color:#fff;background:#dc2626;margin-left:4px}'
      + '.gsK button,.gsKc{display:inline-block;margin:6px 6px 0 0;min-height:44px;border-radius:12px;border:1px solid var(--garis);background:var(--panel2);color:var(--teks);font-size:13px;font-weight:800;padding:0 12px}.gsK button.ut{background:#9333ea;border-color:#9333ea;color:#fff}.gsK button.kn{background:#f59e0b;border-color:#f59e0b;color:#1a1000}';
    document.head.appendChild(st);
  }
  function gsKartu(t, inf, tombol) { return '<div class="gsK"><b class="lb">' + e(A.lbPendek(t.lb)) + '</b>' + (t.ar === 'TRONTON' ? ' <span class="bd" style="background:#64748b">TRONTON</span>' : '') + ' <b>' + e(t.jenis || '') + '</b><br>' + inf + (tombol ? '<br>' + tombol : '') + '</div>'; }
  function gsSek(c, judul, kecil, isi) { return '<div class="gsSek" style="--c:' + c + '"><b>' + judul + '</b><small>' + kecil + '</small>' + isi + '</div>'; }
  function gsAtas() {
    var g = gsD(); if (!g) return '';
    gsGaya();
    var h = '', bl = !!g.boleh, k = function (t) { return e(t.ar + '|' + t.id); }, bebas = (g.bebas || []).length ? e(g.bebas.join(', ')) : 'tidak ada';
    var a = (g.wajib || []).map(function (t) { return gsKartu(t, '🔧 ' + e(t.mek) + '<br>' + e(t.ket), bl ? '<button type="button" class="ut" data-p="gsShift:' + k(t) + '">⏸ Pending · ' + e(t.usul || 'Lanjut shift') + '</button>' : ''); }).join('');
    if (a) h += gsSek('#dc2626', '🔴 Wajib Pending — ganti shift', 'mekaniknya sudah tidak bertugas, tiket masih "Sedang dikerjakan"', a);
    a = (g.segera || []).map(function (t) { return gsKartu(t, '🔧 ' + e(t.mek) + '<br>' + e(t.ket), bl ? '<button type="button" data-p="gsShift:' + k(t) + '">⏸ Pending · ' + e(t.usul || 'Lanjut shift') + '</button>' : ''); }).join('');
    if (a) h += gsSek('#f59e0b', '🟡 Shift mekanik hampir habis', 'kalau belum selesai, Pending "Lanjut shift" sebelum pulang', a);
    a = (g.serah || []).map(function (t) { return gsKartu(t, '⏸ <b>' + e(t.alasan) + '</b> sejak ' + e(String(t.sejak || '').slice(0, 5) + ' ' + String(t.sejak || '').slice(11, 16)) + ' (' + gsUmur(t.mnt) + ')' + (t.oleh ? ' · oleh ' + e(t.oleh) : '') + '<br>mekanik sebelumnya: ' + e(t.mek || '-') + (t.cat ? '<br>' + e(t.cat) : ''), bl ? '<button type="button" class="kn" data-p="gsLanjut:' + k(t) + '">👷 Tunjuk mekanik &amp; Lanjut</button>' : ''); }).join('');
    if (a) h += gsSek('#9333ea', '🔁 Serah-terima shift', 'tiket dari shift sebelumnya — tunjuk mekanik untuk melanjutkan', a);
    a = (g.penuh || []).map(function (t) { return gsKartu(t, '⏸ <b>Mekanik penuh</b> sejak ' + e(String(t.sejak || '').slice(11, 16)) + ' (' + gsUmur(t.mnt) + ')' + (t.oleh ? ' · oleh ' + e(t.oleh) : '') + '<br>' + e(t.ker) + (t.cat ? '<br><i>' + e(t.cat) + '</i>' : ''), bl ? '<button type="button" class="kn" data-p="gsLanjut:' + k(t) + '">👷 Tunjuk mekanik &amp; Lanjut</button><button type="button" data-p="gsLepas:' + k(t) + '">Lepas pending</button>' : ''); }).join('');
    if (a) h += gsSek('#0ea5e9', '⏸ Pending · Mekanik penuh', 'belum ditunjuk karena semua mekanik sedang pegang unit · mekanik bebas sekarang: ' + bebas, a);
    a = (g.part || []).map(function (t) { return gsKartu(t, '📦 tunggu sparepart total <b>' + gsUmur(t.mnt) + '</b>' + (t.logistik ? '<span class="bd">TANGGUNG JAWAB LOGISTIK</span>' : ' · ' + gsUmur(t.sisa) + ' lagi sebelum ' + e(g.batasHari) + ' hari') + '<br>🔧 ' + e(t.mek || '-') + (t.cat ? '<br>' + e(t.cat) : ''), ''); }).join('');
    if (a) h += gsSek('#b45309', '📦 Tunggu sparepart', 'lebih dari ' + e(g.batasHari) + ' x 24 jam = tanggung jawab Logistik (waktu tunggu tidak dibebankan ke mekanik)', a);
    if (bl && (g.bolehPenuh || []).length) h += gsSek('#64748b', '⏳ Menunggu penunjukan', 'mekanik sedang penuh? ketuk unitnya untuk Pending dulu · mekanik bebas sekarang: ' + bebas, (g.bolehPenuh || []).map(function (t) { return '<button type="button" class="gsKc" data-p="gsPenuh:' + k(t) + '">⏸ ' + e(A.lbPendek(t.lb)) + ' · mekanik penuh</button>'; }).join(''));
    return h;
  }
  function gsTombol(t, k) {
    var g = gsD(); if (!g || !g.boleh || t.g !== 'menunggu') return '';
    return t.gsPenuh ? '<button type="button" class="pkaTombol kn" data-p="gsLanjut:' + k + '">👷 Tunjuk mekanik &amp; Lanjut (pending mekanik penuh)</button>' : '<button type="button" class="pkaTombol ung" data-p="gsPenuh:' + k + '">⏸ Pending dulu · mekanik penuh</button>';
  }
  function gsHtml(j, t) {
    var m = M(), g = gsD() || {}, h = '';
    if (j === 'stGsShift') {
      h = A.kepalaModal('⏸ Pending ganti shift', t) + '<div class="sb">Tiket pindah ke <b>Pending</b> dan masuk antrean <b>Serah-terima shift</b>. Pengawas shift berikutnya menunjuk mekanik untuk melanjutkan.</div>'
        + '<div class="pkaLbl">Lanjut ke shift mana? <span class="w">wajib</span></div><div class="pkaChips">' + (g.alasanShift || []).map(function (a) { return '<button type="button" data-p="gsAl:' + e(a) + '" class="' + (m.alasan === a ? 'on' : '') + '">' + e(a) + '</button>'; }).join('') + '</div>'
        + '<div class="pkaLbl">Catatan <small>opsional, mis. tinggal pasang kampas</small></div><textarea class="pkaIn" id="gsCat">' + e(m.catatan || '') + '</textarea>'
        + '<button type="button" class="pkaTombol ung" data-p="gsYa">⏸ SIMPAN PENDING</button><div class="pkaMsg"></div>';
    } else if (j === 'stGsLanjut') {
      h = A.kepalaModal('👷 Tunjuk mekanik & Lanjut', t) + (t.g === 'menunggu' || !t.mek ? '' : '<div class="sb">Mekanik sebelumnya (<b>' + e(t.mek) + '</b>) tetap tercatat di tiket; jam kerjanya berhenti dihitung sejak Pending.</div>')
        + '<div class="pkaLbl">Mekanik yang melanjutkan <span class="w">wajib</span><small>boleh lebih dari 1</small></div>' + A.chipsMekanik(m.pilih) + '<div id="pkaBkW">' + A.htmlBengkel() + '</div>'
        + '<button type="button" class="pkaTombol kn" data-p="gsYa">👷 TUNJUK &amp; LANJUTKAN</button><div class="pkaMsg"></div>';
    } else if (j === 'stGsPenuh') {
      h = A.kepalaModal('⏸ Pending · Mekanik penuh', t) + '<div class="sb">Tiket tetap <b>Menunggu penunjukan</b>, tapi jam tunggunya dicatat sebagai Pending "Mekanik penuh" (terlihat sebagai kekurangan mekanik). Mekanik bebas sekarang: <b>' + ((g.bebas || []).length ? e(g.bebas.join(', ')) : 'tidak ada') + '</b>.</div>'
        + '<div class="pkaLbl">Catatan <small>opsional</small></div><textarea class="pkaIn" id="gsCat">' + e(m.catatan || '') + '</textarea>'
        + '<button type="button" class="pkaTombol ung" data-p="gsYa">⏸ SIMPAN PENDING MEKANIK PENUH</button><div class="pkaMsg"></div>';
    } else if (j === 'stGsLepas') {
      h = A.kepalaModal('Lepas Pending mekanik penuh', t) + '<div class="sb">Tiket kembali menunggu penunjukan biasa; jam pending yang sudah berjalan tetap tercatat.</div><button type="button" class="pkaTombol abu" data-p="gsYa">LEPAS PENDING</button><div class="pkaMsg"></div>';
    }
    return h;
  }
  function gsKlik(n, v, b) {
    if (!/^gs[A-Z]/.test(n)) return false;
    var m = M(), t, x;
    if (n === 'gsShift' || n === 'gsLanjut' || n === 'gsPenuh' || n === 'gsLepas') {
      t = gsCari(v); if (!t && (n === 'gsPenuh' || n === 'gsLanjut')) { x = A.cariT(v); if (x) t = { id: x.id, ar: x.ar, lb: x.lb, jenis: x.jenis, ker: x.ker, mek: x.mek, jamMasuk: x.jamMasuk, g: x.g }; }
      if (!t) { A.roti('Tiket sudah berubah. Papan dimuat ulang.'); A.muat(true); return true; }
      A.bukaModal({ gsShift: 'stGsShift', gsLanjut: 'stGsLanjut', gsPenuh: 'stGsPenuh', gsLepas: 'stGsLepas' }[n], t, { alasan: t.usul || '', catatan: '', pilih: [], bk: '', bkTulis: '', yakin: false });
      return true;
    }
    if (!m || !/^stGs/.test(m.jenis || '')) return true;
    x = q('#gsCat'); if (x) m.catatan = String(x.value || '');
    if (n === 'gsAl') { m.alasan = v; A.gambarModal(); return true; }
    if (n === 'gsYa') {
      var dasar = { armada: m.t.ar, id: m.t.id, catatan: m.catatan || '' };
      if (m.jenis === 'stGsShift') { if (!m.alasan) { A.msg('Pilih "Lanjut shift 2" atau "Lanjut shift 1".', 'err'); return true; } dasar.alasan = m.alasan; A.duaKali(b, function () { A.kirim('pgsPendingShift', dasar); }); return true; }
      if (m.jenis === 'stGsLanjut') { var mk = A.namaTerpilih(); if (!mk) { A.msg(m.pilih.length ? 'Isi nama bengkel luarnya.' : 'Ketuk dulu nama mekanik yang melanjutkan.', 'err'); return true; } dasar.mekanik = mk; A.duaKali(b, function () { A.kirim('pgsLanjutTunjuk', dasar, function (h) { A.roti('✅ ' + h.pesan); A.tutupModal(); A.setTab('dikerjakan'); A.muat(true); }); }); return true; }
      if (m.jenis === 'stGsLepas') { A.duaKali(b, function () { A.kirim('pgsLepasPenuh', dasar); }); return true; }
      A.duaKali(b, function () {
        dasar.yakin = !!m.yakin; A.kunci(true); A.msg('Menyimpan…');
        A.panggil('pgsPendingPenuh', dasar, 45000).then(function (h) {
          if (M() !== m) return; A.kunci(false);
          if (h && h.perluYakin) { m.yakin = true; A.msg(h.pesan, 'err'); return; }
          if (!h || !h.ok) { A.msg((h && h.pesan) || 'Gagal menyimpan.', 'err'); if (h && h.hilang) A.muat(true); return; }
          A.roti('✅ ' + h.pesan); A.tutupModal(); A.muat(true);
        }, function () { if (M() !== m) return; A.kunci(false); A.msg('Tidak ada sinyal — belum tersimpan, coba lagi.', 'err'); });
      });
      return true;
    }
    return true;
  }

  function lupakan() { PIL = null; PILmuat = false; CARI = ''; ARMF = ''; PT = null; RW = null; KW = null; RK = null; }

  window.WHL_PK_SETARA = { pasang: function (api) { A = api; setTimeout(function () { if (nyala() && antre()) kirimAntre(true); }, 4000); }, nyala: function () { return !!A && nyala(); }, tahapB: function () { return !!A && tahapB(); },
    atas: atas, saring: saring, bawahPapan: bawahPapan, menu: menu, papanLebar: papanLebar, htmlLebar: htmlLebar, tombolDetail: tombolDetail, kotakStoring: kotakStoring, sesudahSelesai: sesudahSelesai,
    html: html, sesudahModal: sesudahModal, klik: klik, ubah: ubah, lupakan: lupakan,
    _uji: { teks: teksTiket, kanvas: tiketKanvas, isiTiket: isiTiket, susun: susunBuat, antre: antre } };
})();
