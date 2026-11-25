/* WHL App — 🛞 GANTI BAN di layar Pos Kontrol (poskontrol-ganti-ban-25nov, Posko 25 Nov 2026).
 * Tiket "GANTI BAN" untuk TYREMAN (boleh juga mekanik): buat tiket (unit -> peta posisi roda -> alasan -> POOL/STORING -> driver -> tunjuk),
 * ▶ MULAI, ⏸ Tunggu ban (pending), ▶ Lanjutkan, ✅ Selesaikan per posisi (GANTI / TUKAR, no seri + foto ban lama & baru, Baru/Lelesan, merk),
 * ringkasan "Tersambung ke Data Ban", tindak lanjut pengawas (seri PERLU CEK, sambung ulang).
 * Server: DASHBOARD GantiBan.gs lewat pusatPosKontrol [token, 'gb...', data]. Dipasang ke poskontrol.js lewat jembatan ban() (WHL_PK_BAN.pasang).
 * Tanpa alert/confirm/prompt, tanpa localStorage. Foto diunggah satu-satu begitu diambil (tidak lewat batas 4 MB).
 */
(function () {
  'use strict';
  var A = null, P = null, P_MUAT = false, SARING = 'semua', CHS = {}, TTD = {};
  var ALASAN_P = ['Tunggu ban dari gudang', 'Tunggu alat', 'Tunggu unit', 'Lainnya'];
  var BARIS_AS = [['AS DEPAN', 't', [['Depan Kiri', 'KIRI'], ['Depan Kanan', 'KANAN']]], ['AS TRINTIN', 't', [['Trintin Kiri', 'KIRI'], ['Trintin Kanan', 'KANAN']]],
    ['AS BELAKANG 1', 'g', [['Belakang 1 Kiri Luar', 'KI LUAR'], ['Belakang 1 Kiri Dalam', 'KI DLM'], ['Belakang 1 Kanan Dalam', 'KA DLM'], ['Belakang 1 Kanan Luar', 'KA LUAR']]],
    ['AS BELAKANG 2', 'g', [['Belakang 2 Kiri Luar', 'KI LUAR'], ['Belakang 2 Kiri Dalam', 'KI DLM'], ['Belakang 2 Kanan Dalam', 'KA DLM'], ['Belakang 2 Kanan Luar', 'KA LUAR']]]];

  function e(s) { return A.esc(s); }
  function singkat(p) { return String(p || '').replace(/^Belakang (\d) /, 'B$1 ').replace(/^Ban Serap$/, 'Serap'); }
  function baku(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function cekSeri(s) {
    var b = baku(s), n = (b.match(/\d/g) || []).length;
    if (!b) return { ok: false, seri: b, pesan: 'No seri kosong.' };
    if (b.length < 8 || b.length > 14) return { ok: false, seri: b, pesan: 'No seri harus 8-14 huruf/angka (sekarang ' + b.length + ').' };
    if (n < 6) return { ok: false, seri: b, pesan: 'No seri minimal berisi 6 angka.' };
    return { ok: true, seri: b, awas: /\d[OI]+\d/.test(b) || /\d{3}[OI]$/.test(b) ? 'Ada huruf O / I di antara angka — maksudnya 0 / 1?' : '' };
  }
  function angkaLb(s) { var m = String(s || '').match(/(\d+)/); return m ? parseInt(m[1], 10) : -1; }
  function S() { return A.saya() || {}; }
  function D() { return A.data() || {}; }
  function M() { return A.modal(); }
  function el() { return A.el(); }
  function q(sel) { var w = el(); return w ? w.querySelector(sel) : null; }

  /* ---------- gaya ---------- */
  function gaya() {
    if (document.getElementById('gbGaya')) return;
    var st = document.createElement('style'); st.id = 'gbGaya';
    st.textContent = [
      '.pkaBd.ban{background:#0f766e}.pkaBd.pool{background:#475569}.pkaBd.lel{background:#a16207}.pkaBd.baru{background:#15803d}',
      '.gbBaru{display:flex;align-items:center;gap:12px;width:100%;min-height:58px;border-radius:16px;border:0;background:linear-gradient(135deg,#0f766e,#0d9488);color:#fff;font-size:16px;font-weight:900;padding:8px 14px;margin-bottom:10px;box-shadow:var(--bayang);text-align:left}',
      '.gbBaru .ik{font-size:26px}.gbBaru small{display:block;font-size:11.5px;font-weight:700;opacity:.9}',
      '.gbSaring{display:flex;gap:6px;margin:-4px 0 10px;flex-wrap:wrap}.gbSaring button{border:1px solid var(--garis);background:var(--panel);color:var(--teks);border-radius:999px;padding:6px 12px;font-size:12.5px;font-weight:800;min-height:36px}.gbSaring button.on{background:rgba(15,118,110,.14);border-color:#0f766e;color:#0f766e}',
      '.gbPos{font-size:12.5px;line-height:1.4;background:rgba(15,118,110,.09);border-radius:10px;padding:6px 8px}.gbPos b{color:#0f766e}',
      '.gbJam{display:flex;gap:6px;flex-wrap:wrap;font-size:11.5px;font-weight:800}.gbJam span{background:var(--panel2);border-radius:8px;padding:3px 7px;color:var(--redup)}.gbJam span.on{background:rgba(22,163,74,.13);color:var(--tHijau,#0f7a45)}.gbJam span.blm{background:rgba(245,158,11,.15);color:#b45309}',
      '.pkaAk button.mu{background:#0f766e;border-color:#0f766e;color:#fff}',
      '.gbPeta{background:var(--panel);border:1px solid var(--garis);border-radius:18px;padding:10px 10px 12px;position:relative}',
      '.gbPeta .kab{margin:0 auto 6px;width:62%;height:28px;border-radius:14px 14px 6px 6px;background:linear-gradient(180deg,#1e3a5f,#2c5a85);color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;letter-spacing:.6px}',
      '.gbPeta .as{margin-top:8px}.gbPeta .as .jd{font-size:10.5px;font-weight:900;color:var(--redup);letter-spacing:.6px;text-align:center;margin-bottom:3px}',
      '.gbPeta .rw{display:grid;grid-template-columns:1fr 1fr 22px 1fr 1fr;gap:5px;align-items:stretch}',
      '.gbPeta .hub{display:flex;align-items:center}.gbPeta .hub i{display:block;width:100%;height:6px;background:#94a3b8;border-radius:3px}',
      '.gbPeta .bn{border:2px solid #334155;background:#1f2937;color:#e5e7eb;border-radius:10px;min-height:54px;padding:4px 2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;position:relative;font-family:inherit;text-align:center;background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 4px,transparent 4px 9px)}',
      '.gbPeta .bn.tg{grid-column:span 2}.gbPeta .bn .s{font-size:10px;font-weight:900;opacity:.85}.gbPeta .bn .n{font-size:11px;font-weight:900}.gbPeta .bn .k{font-size:10px;font-weight:800;color:#86efac}',
      '.gbPeta .bn.segera{border-color:#f59e0b}.gbPeta .bn.segera .k{color:#fcd34d}.gbPeta .bn.wajib{border-color:#ef4444}.gbPeta .bn.wajib .k{color:#fca5a5}',
      '.gbPeta .bn.kosong{background:transparent;border-style:dashed;border-color:#94a3b8;color:var(--redup)}',
      '.gbPeta .bn.pilih{outline:3px solid #0ea5e9;outline-offset:2px}.gbPeta .bn.pilih:after{content:attr(data-no);position:absolute;top:-9px;right:-7px;width:20px;height:20px;border-radius:50%;background:#0ea5e9;color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center}',
      '.gbPeta .bn.baru{border-color:#16a34a;background:#14532d}.gbPeta .bn.baru .k{color:#bbf7d0}.gbPeta .bn.lel{border-color:#d97706;background:#78350f}.gbPeta .bn.lel .k{color:#fde68a}',
      '.gbPeta .serap{display:flex;justify-content:center;margin-top:8px}.gbPeta .serap .bn{width:44%;border-radius:999px;min-height:42px}',
      '.gbPeta .leg{display:flex;flex-wrap:wrap;gap:6px 12px;justify-content:center;margin-top:8px;font-size:11px;font-weight:800;color:var(--redup)}',
      '.gbKp{background:var(--panel);border:1px solid var(--garis);border-radius:18px;padding:12px;margin-bottom:12px;box-shadow:var(--bayang)}',
      '.gbKp .hd{display:flex;align-items:center;gap:8px;margin-bottom:6px}.gbKp .hd .no{width:26px;height:26px;border-radius:50%;background:#0ea5e9;color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;font-size:13px}.gbKp .hd b{font-size:16px}.gbKp .hd .ok{margin-left:auto;font-size:12px;font-weight:900}',
      '.gbSisi .hd{display:flex;align-items:center;gap:8px;margin-bottom:6px}.gbSisi .hd .no{width:24px;height:24px;border-radius:50%;background:#0ea5e9;color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;font-size:12.5px}.gbSisi .hd b{font-size:15px}',
      '.gbSisi{border-radius:14px;padding:10px;margin-top:8px}.gbSisi.lm{background:rgba(220,38,38,.06);border:1px solid rgba(220,38,38,.25)}.gbSisi.br{background:rgba(22,163,74,.07);border:1px solid rgba(22,163,74,.3)}',
      '.gbSisi .jd{font-size:12.5px;font-weight:900;letter-spacing:.6px;margin-bottom:6px}.gbSisi.lm .jd{color:#b91c1c}.gbSisi.br .jd{color:var(--tHijau,#0f7a45)}',
      '.gbSeri{font-family:ui-monospace,Consolas,monospace!important;font-weight:800;letter-spacing:1px;text-transform:uppercase}',
      '.gbCek{font-size:12px;margin-top:5px;line-height:1.4;font-weight:700;color:var(--redup)}.gbCek.ok{color:var(--tHijau,#0f7a45)}.gbCek.wr{color:#b45309}.gbCek.er{color:#dc2626}',
      '.gbFt{display:grid;grid-template-columns:88px 1fr;gap:10px;margin-top:8px;align-items:center}',
      '.gbFt .th{width:88px;height:66px;border-radius:10px;overflow:hidden;background:#0b1220;display:flex;align-items:center;justify-content:center;position:relative}.gbFt .th img{width:100%;height:100%;object-fit:cover}',
      '.gbFt .th.kosong{background:transparent;border:2px dashed #94a3b8;color:var(--redup);font-size:22px}.gbFt .th em{position:absolute;bottom:3px;right:4px;font-style:normal;font-size:10px;font-weight:900;color:#fff;background:rgba(22,163,74,.9);border-radius:6px;padding:1px 4px}',
      '.gbFt button{min-height:46px;border-radius:12px;border:1px solid var(--garis);background:var(--panel);font-weight:800;font-size:13.5px;color:var(--teks);width:100%}.gbFt button.utama{background:var(--utama);border-color:var(--utama);color:#fff}',
      '.gbDua2{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.gbDua2 button{min-height:54px;border-radius:14px;border:1px solid var(--garis);background:var(--panel);font-weight:900;font-size:14px;color:var(--teks);line-height:1.2}.gbDua2 button small{display:block;font-size:10.5px;font-weight:700;color:var(--redup)}',
      '.gbDua2 button.on.b{background:rgba(22,163,74,.14);border:2px solid #16a34a;color:var(--tHijau,#0f7a45)}.gbDua2 button.on.l{background:rgba(217,119,6,.13);border:2px solid #d97706;color:#b45309}',
      '.gbInfo{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-bottom:10px}.gbInfo div{background:var(--panel);border:1px solid var(--garis);border-radius:12px;padding:7px 8px;font-size:11px;color:var(--redup);font-weight:700}.gbInfo b{display:block;font-size:15px;color:var(--teks);font-weight:900}',
      '.gbSambung{border-radius:18px;padding:12px;background:linear-gradient(180deg,rgba(15,118,110,.12),rgba(15,118,110,.04));border:1.5px solid rgba(15,118,110,.45);margin:10px 0}.gbSambung.gagal{background:rgba(220,38,38,.07);border-color:rgba(220,38,38,.45)}',
      '.gbSambung h4{margin:0 0 8px;font-size:15px;font-weight:900;color:#0f766e}.gbSambung.gagal h4{color:#b91c1c}.gbSambung .li{display:flex;gap:8px;font-size:13px;line-height:1.4;padding:6px 0;border-top:1px solid rgba(15,118,110,.2)}.gbSambung .li:first-of-type{border-top:0}',
      '.gbTbl{width:100%;border-collapse:collapse;font-size:12.5px}.gbTbl th{font-size:10.5px;text-align:left;color:var(--redup);font-weight:900;padding:4px}.gbTbl td{padding:6px 4px;border-top:1px solid var(--garis);vertical-align:top;word-break:break-word}.gbTbl .m{font-family:ui-monospace,Consolas,monospace;font-weight:800;font-size:12px}',
      '.gbBesar{text-align:center;padding:10px 8px 4px}.gbBesar .c{font-size:42px;line-height:1}.gbBesar h2{margin:6px 0 2px;font-size:20px;font-weight:900}.gbBesar p{margin:0;color:var(--redup);font-size:13px}',
      '.gbKpi{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:10px 0}.gbKpi div{background:linear-gradient(180deg,rgba(15,118,110,.12),transparent);border:1px solid rgba(15,118,110,.35);border-radius:14px;padding:8px;text-align:center;font-size:10.5px;font-weight:800;color:var(--redup)}.gbKpi b{display:block;font-size:18px;color:#0f766e;font-weight:900}',
      '.gbCat{font-size:11.5px;color:var(--redup);line-height:1.45;margin-top:6px}',
      '.gbTd{background:var(--panel);border:1px solid var(--garis);border-radius:14px;padding:10px 12px;margin-bottom:8px;font-size:13px;line-height:1.45}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- data pilihan (unit, merk, driver, tyreman) ---------- */
  function muatPilihan(lalu) {
    if (P) { if (lalu) lalu(); return; }
    if (P_MUAT) return; P_MUAT = true;
    A.panggil('gbPilihan', {}, 45000).then(function (h) { P_MUAT = false; if (h && h.ok) { P = h; if (lalu) lalu(); } else A.msg((h && h.pesan) || 'Pilihan belum termuat.', 'err'); },
      function (x) { P_MUAT = false; A.msg(((x && x.message) || 'Tidak ada sinyal.') + ' Coba lagi.', 'err'); });
  }
  function muatChassis(lb, lalu) {
    if (CHS[lb]) { lalu(CHS[lb]); return; }
    A.panggil('gbChassis', { lambung: lb }, 60000).then(function (h) { if (h && h.ok) { CHS[lb] = h; lalu(h); } else lalu({ ok: false, pesan: (h && h.pesan) || 'Ban unit belum termuat.' }); },
      function (x) { lalu({ ok: false, pesan: ((x && x.message) || 'Tidak ada sinyal.') }); });
  }

  /* ---------- peta posisi roda ---------- */
  function petaHtml(ch, pilih, opsi) {
    opsi = opsi || {};
    var tr = ch && ch.armada === 'TRONTON', slot = {};
    ((ch && ch.slots) || []).forEach(function (s) { slot[s.posisi] = s; });
    var bn = function (p, lbl, tg) {
      var s = slot[p] || {}, i = pilih.indexOf(p), st = s.ada ? (/WAJIB/.test(s.status) ? 'wajib' : /SEGERA/.test(s.status) ? 'segera' : 'aman') : 'kosong', cls = 'bn ' + st + (tg ? ' tg' : '');
      var sesudah = opsi.sesudah && opsi.sesudah[p];
      if (sesudah) cls = 'bn ' + (sesudah.jenis === 'LELESAN' ? 'lel' : 'baru') + (tg ? ' tg' : '');
      else if (i >= 0) cls += ' pilih';
      var isi = '<span class="s">' + e(lbl) + '</span>' + (sesudah ? '<span class="n">…' + e(String(sesudah.seri).slice(-5)) + '</span><span class="k">' + (sesudah.jenis === 'LELESAN' ? '♻️ LELESAN' : sesudah.jenis === 'BARU' ? '🆕 BARU' : '↔ TUKAR') + '</span>'
        : s.ada ? '<span class="n">…' + e(String(s.seri).slice(-5)) + '</span><span class="k">' + (st === 'wajib' ? '⛔ ' : st === 'segera' ? '⚠ ' : '') + (s.serap ? 'serap' : (Math.round((s.km || 0) / 100) / 10) + 'k') + '</span>' : '<span class="n">＋ kosong</span>');
      return '<button type="button" class="' + cls + '" data-no="' + (i + 1) + '"' + (opsi.klik ? ' data-p="' + opsi.klik + ':' + e(p) + '"' : ' disabled') + '>' + isi + '</button>';
    };
    var h = '<div class="gbPeta"><div class="kab">KABIN · ' + (tr ? 'TRONTON 10 + 1 serap' : 'TRINTIN 12 + 1 serap') + '</div>';
    BARIS_AS.forEach(function (as) {
      if (tr && as[0] === 'AS TRINTIN') return;
      h += '<div class="as"><div class="jd">' + as[0] + '</div><div class="rw">';
      if (as[1] === 't') h += bn(as[2][0][0], as[2][0][1], true) + '<div class="hub"><i></i></div>' + bn(as[2][1][0], as[2][1][1], true);
      else h += bn(as[2][0][0], as[2][0][1]) + bn(as[2][1][0], as[2][1][1]) + '<div class="hub"><i></i></div>' + bn(as[2][2][0], as[2][2][1]) + bn(as[2][3][0], as[2][3][1]);
      h += '</div></div>';
    });
    h += '<div class="serap">' + bn('Ban Serap', '🛟 SERAP') + '</div>';
    h += '<div class="leg">' + (opsi.sesudah ? '<span>🟩 baru</span><span>🟧 lelesan</span><span>⬛ tidak diganti</span>' : '<span>🔵 dipilih</span><span>🟥 wajib ganti</span><span>🟨 segera</span><span>⬜ kosong</span>') + '</div>';
    return h + '</div>';
  }

  /* ---------- papan ---------- */
  function atas() {
    gaya();
    var s = S(), d = D(), h = '';
    if (s.proses && !(d.gb && d.gb.mati)) h += '<button type="button" class="gbBaru" data-p="gbBaru"><span class="ik">🛞</span><span>＋ Tiket Ganti Ban<small>unit → posisi ban → lokasi → tunjuk tyreman</small></span></button>';
    if (s.g === 'tyreman') h += '<div class="pkaPita br">🛞 Tiket ganti ban yang ditunjuk ke kamu. Waktu dihitung sejak ditunjuk. Ketuk <b>✅ Selesaikan ganti ban</b> waktu ban terpasang, <b>⏸ Tunggu ban</b> kalau menunggu ban / alat.</div>';
    if (s.proses && d.gb && (d.gb.cek || d.gb.belum)) h += '<button type="button" class="pkaPita" style="display:block;width:100%;text-align:left;font-weight:800" data-p="gbTindak">⚠️ Ganti ban perlu tindak lanjut: ' + (d.gb.cek ? d.gb.cek + ' seri ban PERLU CEK' : '') + (d.gb.cek && d.gb.belum ? ' · ' : '') + (d.gb.belum ? d.gb.belum + ' belum tersambung ke Data Ban' : '') + ' ›</button>';
    return h;
  }
  function saringHtml(l) {
    var nb = l.filter(function (t) { return t.gb; }).length;
    if (!nb || nb === l.length) return '';
    var c = function (k, t) { return '<button type="button" data-p="gbSaring:' + k + '" class="' + (SARING === k ? 'on' : '') + '">' + t + '</button>'; };
    return '<div class="gbSaring">' + c('semua', 'Semua (' + l.length + ')') + c('lain', '🔧 Perbaikan dll (' + (l.length - nb) + ')') + c('ban', '🛞 Ganti ban (' + nb + ')') + '</div>';
  }
  function saring(l) {
    var nb = l.filter(function (t) { return t.gb; }).length;
    if (!nb || nb === l.length || SARING === 'semua') return l;
    return l.filter(function (t) { return SARING === 'ban' ? !!t.gb : !t.gb; });
  }
  function bisaKerja() { var s = S(); return !!(s.proses || s.mekanik); }
  function kartu(t) {
    gaya();
    var g = t.gb || {}, tr = t.ar === 'TRONTON', k = e(t.ar + '|' + t.id), s = S();
    var tm = t.g === 'selesai' ? '✓ ' + String(t.jamSelesai || '').slice(11) : '⏱ ' + A.umur(t.mnt);
    var h = '<div class="pkaK" style="--c:#0f766e" data-p="det:' + k + '"><div class="a"><span class="lb">' + e(A.lbPendek(t.lb)) + (tr ? '<small>TR</small>' : '') + '</span><span class="pkaBd ban">🛞 GANTI BAN</span>'
      + (g.lokasi === 'STORING' ? '<span class="pkaBd sto">🆘 STORING</span>' : '<span class="pkaBd pool">🏠 POOL</span>') + (t.g === 'pending' ? '<span class="pkaBd" style="background:#9333ea">⏸</span>' : '')
      + '<span class="tm' + (t.g !== 'selesai' && g.sisa != null && g.sisa < 0 ? ' lama' : '') + '">' + e(tm) + '</span></div>';
    h += '<div class="gbPos">🛞 <b>' + (g.n || 1) + ' ban</b> · ' + (g.belumPasti || !g.pos || !g.pos.length ? 'posisi ditentukan tyreman' : e(g.pos.join(', '))) + (g.alasan ? ' · ' + e(g.alasan) : '') + '</div>';
    if (g.lokasi === 'STORING' && g.lokasiKm) h += '<div class="inf">📍 ' + e(g.lokasiKm) + (g.zona ? ' · zona ' + e(g.zona) : ' · zona belum terbaca') + '</div>';
    if (t.g === 'menunggu') h += '<div class="inf">👤 ' + e(t.drv || '-') + ' · belum ditunjuk</div>';
    else h += '<div class="inf">🛞 <b>' + e(t.mek || '-') + '</b>' + (t.oleh ? ' · ditunjuk ' + e(t.oleh) : '') + '</div>';
    if (t.g === 'dikerjakan' || t.g === 'pending') h += '<div class="gbJam"><span class="on">👷 ditunjuk ' + e(String(t.jamTunjuk || '').slice(11)) + ' = mulai dihitung</span>' + (g.menitPending ? '<span>⏸ ' + A.umur(g.menitPending) + ' tidak dihitung</span>' : '') + '</div>';
    if (t.g === 'pending') h += '<div class="pd">⏸ ' + e(String(t.kp || '').replace(/\s*·\s*diproses\s+[^·]*$/, '')) + '</div>';
    if (t.g === 'selesai' && t.ks) h += '<div class="inf">✅ ' + e(String(t.ks).slice(0, 140)) + '</div>';
    if ((t.g === 'dikerjakan' || t.g === 'pending') && g.target != null) h += '<div class="st" style="color:' + (g.sisa < 0 ? '#dc2626' : '#16a34a') + '">🎯 target ' + A.umur(g.target) + ' · ' + (g.sisa < 0 ? 'lewat ' + A.umur(-g.sisa) : 'sisa ' + A.umur(g.sisa)) + '</div>';
    var b = function (cls, n, txt) { return '<button type="button" class="' + cls + '" data-p="' + n + ':' + k + '">' + txt + '</button>'; }, ak = '';
    if (t.g === 'menunggu' && s.proses) ak = b('mu', 'gbTunjukBuka', '🛞 Tunjuk tyreman') + b('bt', 'batal', '❌');
    if (t.g === 'dikerjakan' && bisaKerja()) ak = b('sl', 'gbSelesaiBuka', '✅ Selesaikan ganti ban') + b('pd', 'gbPendingBuka', '⏸ Tunggu ban') + (s.proses ? b('bt', 'batal', '❌') : '');
    if (t.g === 'pending' && bisaKerja()) ak = b('ln', 'gbLanjut', '▶ Lanjutkan') + b('sl', 'gbSelesaiBuka', '✅ Selesaikan') + (s.proses ? b('bt', 'batal', '❌') : '');
    if (t.g === 'selesai') ak = b('', 'cetak', '🖨️ Cetak tiket');
    if (ak) h += '<div class="pkaAk">' + ak + '</div>';
    return h + '</div>';
  }
  function menu() { return ''; }

  /* ---------- modal: html ---------- */
  function html(j, t) {
    gaya();
    if (j === 'detail') return htmlDetail(t);
    if (j === 'gbBuat') return htmlBuat();
    if (j === 'gbTunjuk') return htmlTunjuk(t);
    if (j === 'gbPending') return htmlPending(t);
    if (j === 'gbSelesai') return htmlSelesai(t);
    if (j === 'gbRingkas') return htmlRingkas();
    if (j === 'gbTindak') return htmlTindak();
    return '';
  }
  function kepala(judul, t) { return A.kepalaModal(judul, t); }
  function htmlDetail(t) {
    var g = t.gb || {}, h = kepala('🛞', t), s = S();
    h += '<div class="pkaBox">' + A.baris('Jenis', 'GANTI BAN · ' + (g.lokasi || 'POOL')) + A.baris('Posisi', g.belumPasti ? 'ditentukan tyreman (' + (g.n || 1) + ' ban)' : (g.pos || []).join(', ')) + A.baris('Lokasi', g.lokasiKm ? g.lokasiKm + (g.zona ? ' · zona ' + g.zona : '') : '')
      + A.baris('Driver', t.drv) + A.baris('Dibuat', t.lapor) + A.baris('Tyreman', t.mek) + A.baris('Ditunjuk oleh', t.oleh) + A.baris('Jam tunjuk', t.jamTunjuk) + A.baris('Target', g.target != null ? A.umur(g.target) : '')
      + A.baris('Jam selesai', t.jamSelesai) + A.baris('Pekerjaan', t.ks) + '</div>';
    var k = e(t.ar + '|' + t.id), b = function (cls, n, txt, penuh) { return '<button type="button" class="pkaTombol ' + cls + (penuh ? ' penuh' : '') + '" data-p="' + n + ':' + k + '">' + txt + '</button>'; }, X = '';
    if (t.g === 'menunggu' && s.proses) X += b('', 'gbTunjukBuka', '🛞 Tunjuk tyreman', true);
    if (t.g === 'dikerjakan' && bisaKerja()) X += b('hj', 'gbSelesaiBuka', '✅ Selesaikan ganti ban') + b('ung', 'gbPendingBuka', '⏸ Tunggu ban');
    if (t.g === 'pending' && bisaKerja()) X += b('', 'gbLanjut', '▶ Lanjutkan', true) + b('hj', 'gbSelesaiBuka', '✅ Selesaikan', true);
    X += b('abu', 'cetak', '🖨️ Cetak tiket (halaman lama)', true);
    if (s.proses && t.g !== 'selesai') X += b('abu', 'batal', '❌ Batalkan tiket', true);
    return h + '<div class="pkaAksiD">' + X + '</div><div class="pkaMsg"></div>';
  }
  function chipsOrang(pilih) {
    var mk = function (l, ik) { return (l || []).map(function (x) { return '<button type="button" data-p="gbOrang:' + e(x.nama) + '"' + (x.aktif ? '' : ' disabled') + ' class="' + (pilih.indexOf(x.nama) >= 0 ? 'on' : '') + '">' + ik + ' ' + e(x.nama) + '<small>' + e(x.ket || '') + '</small></button>'; }).join(''); };
    var ty = P ? P.tyreman : [], mek = P ? P.mekanik : [];
    return '<div class="pkaChips" id="gbOrang">' + (ty.length ? mk(ty, '🛞') : '<span class="gbCat">Belum ada tyreman di daftar (peran tyreman).</span>') + '</div>'
      + '<details style="margin-top:6px"><summary class="gbCat" style="font-weight:800">🔧 Atau mekanik (kalau tyreman tidak ada)</summary><div class="pkaChips" style="margin-top:6px">' + mk(mek, '🔧') + '</div></details>';
  }
  function htmlBuat() {
    var m = M(), h = '<h3>🛞 Tiket Ganti Ban<button type="button" class="tutupX" data-p="tutupModal" aria-label="Tutup">✕</button></h3><div class="sb">Isi ban dibaca dari DATA BAN (sama dengan Umur Ban). Tekan 2x untuk simpan.</div>';
    if (!P) return h + '<div class="pkaKosong"><span class="putar"></span> Memuat daftar unit…</div><div class="pkaMsg"></div>';
    h += '<div class="pkaLbl">1 · Unit <span class="w">wajib</span></div><select class="pkaIn" id="gbUnit"><option value="">— pilih unit —</option>'
      + ['TRINTIN', 'TRONTON'].map(function (ar) { return '<optgroup label="' + ar + '">' + (P.unit[ar] || []).map(function (u) { return '<option' + (m.lb === u ? ' selected' : '') + '>' + e(u) + '</option>'; }).join('') + '</optgroup>'; }).join('') + '</select>';
    h += '<div id="gbPetaW">' + petaBuat() + '</div>';
    h += '<div class="pkaLbl">Alasan <span class="w">wajib</span></div><div class="pkaChips">' + P.alasan.map(function (a) { return '<button type="button" data-p="gbAl:' + e(a) + '" class="' + (m.alasan === a ? 'on' : '') + '">' + e(a) + '</button>'; }).join('') + '</div>';
    h += '<div class="pkaLbl">3 · Lokasi <span class="w">wajib</span></div><div class="gbDua2"><button type="button" data-p="gbLok:POOL" class="' + (m.lokasi === 'POOL' ? 'on b' : '') + '">🏠 POOL<small>unit di pool / bengkel</small></button><button type="button" data-p="gbLok:STORING" class="' + (m.lokasi === 'STORING' ? 'on l' : '') + '">🆘 STORING<small>di lapangan</small></button></div>';
    h += '<div id="gbLokKmW"' + (m.lokasi === 'STORING' ? '' : ' hidden') + '><input class="pkaIn" id="gbLokKm" style="margin-top:8px" placeholder="lokasi, mis. Servo KM 64 / BSR / ALR KM 12" value="' + e(m.lokKm || '') + '"><div class="gbCat">Zona & target dihitung sama dengan storing mekanik (A 30 · B 60 · C 90 · D 150 mnt) + 40 mnt per ban.</div></div>';
    h += '<div class="pkaLbl">Driver unit <span class="w">wajib</span><small>tanda tangan driver wajib saat selesai</small></div><select class="pkaIn" id="gbDrv">' + opsiDriver(m) + '</select>';
    h += '<div class="pkaLbl">Catatan <small>opsional</small></div><textarea class="pkaIn" id="gbCatB" placeholder="mis. ban B1 kiri luar benjol, driver lapor bunyi">' + e(m.cat || '') + '</textarea>';
    h += '<div class="pkaLbl">4 · Tunjuk tyreman <span class="w">wajib</span><small>boleh lebih dari 1 · hanya yang sudah absen</small></div>' + chipsOrang(m.peng);
    h += '<div class="pkaBox" style="margin-top:10px" id="gbRingB">' + ringkasBuat() + '</div>';
    return h + '<button type="button" class="pkaTombol" style="background:#0f766e" data-p="gbBuatYa">🛞 Buat tiket & tunjuk</button><div class="pkaMsg"></div>';
  }
  function opsiDriver(m) {
    var l = (P && P.driver) || [], n = angkaLb(m.lb), unit = l.filter(function (x) { return n >= 0 && angkaLb(x.k) === n; });
    return '<option value="">— pilih driver —</option>' + (unit.length ? '<optgroup label="Driver unit ini">' + unit.map(function (x) { return '<option' + (m.driver === x.n ? ' selected' : '') + '>' + e(x.n) + '</option>'; }).join('') + '</optgroup>' : '')
      + '<optgroup label="Semua driver">' + l.filter(function (x) { return unit.indexOf(x) < 0; }).map(function (x) { return '<option' + (m.driver === x.n ? ' selected' : '') + '>' + e(x.n) + '</option>'; }).join('') + '</optgroup>';
  }
  function petaBuat() {
    var m = M();
    if (!m.lb) return '<div class="gbCat" style="margin-top:8px">Pilih unit dulu → peta posisi roda muncul.</div>';
    if (!m.ch) return '<div class="pkaKosong" style="margin-top:8px"><span class="putar"></span> Membaca ban ' + e(m.lb) + ' dari Data Ban…</div>';
    if (!m.ch.ok) return '<div class="pkaPita mrh" style="margin-top:8px">⚠️ ' + e(m.ch.pesan) + '</div>';
    return '<div class="pkaLbl">2 · Ketuk posisi ban yang diganti <span class="w">wajib</span><small>boleh lebih dari 1</small></div>' + (m.belum ? '' : petaHtml(m.ch, m.pos, { klik: 'gbPos' }))
      + '<div class="pkaChips" style="margin-top:8px"><button type="button" data-p="gbWajib">⛔ Pilih semua yang WAJIB</button><button type="button" data-p="gbBelum" class="' + (m.belum ? 'on' : '') + '">❓ Posisi belum pasti<small>tyreman tentukan di lokasi</small></button></div>'
      + (m.belum ? '<div class="pkaLbl">Jumlah ban</div><input class="pkaIn" id="gbJml" inputmode="numeric" value="' + e(m.jml || 1) + '">' : '');
  }
  function ringkasBuat() {
    var m = M(), n = m.belum ? (parseInt(m.jml, 10) || 0) : m.pos.length, tg = '';
    if (P && m.lokasi === 'POOL') tg = (P.target.responPool + P.target.perBanPool * Math.max(1, n)) + ' mnt';
    if (P && m.lokasi === 'STORING') tg = 'tempuh zona + ' + P.target.perBanStoring + ' × ' + Math.max(1, n) + ' mnt';
    return A.baris('Jenis tiket', '🛞 GANTI BAN' + (m.lokasi ? ' · ' + m.lokasi : '')) + A.baris('Jumlah ban', String(n)) + A.baris('Posisi', m.belum ? 'ditentukan tyreman' : m.pos.map(singkat).join(', '))
      + A.baris('Tyreman', m.peng.join(', ')) + A.baris('Target', tg) + A.baris('Dibuat oleh', (S().nama || '') + ' (login)');
  }
  function htmlTunjuk(t) {
    var m = M();
    if (!P) return kepala('🛞 Tunjuk', t) + '<div class="pkaKosong"><span class="putar"></span> Memuat…</div><div class="pkaMsg"></div>';
    return kepala('🛞 Tunjuk', t) + '<div class="pkaLbl">Ketuk tyreman <small>boleh lebih dari 1</small></div>' + chipsOrang(m.peng) + '<button type="button" class="pkaTombol" style="background:#0f766e" data-p="gbTunjukYa">🛞 TUNJUK</button><div class="pkaMsg"></div>';
  }
  function htmlPending(t) {
    var m = M();
    return kepala('⏸ Tunggu ban', t) + '<div class="sb">Waktu pending <b>tidak dihitung</b> ke kecepatan ganti ban.</div><div class="pkaLbl">Alasan <span class="w">wajib</span></div><div class="pkaChips">'
      + ALASAN_P.map(function (a) { return '<button type="button" data-p="gbAlP:' + e(a) + '" class="' + (m.alasan === a ? 'on' : '') + '">' + e(a) + '</button>'; }).join('') + '</div>'
      + '<div class="pkaLbl">Catatan <small>' + (m.alasan === 'Lainnya' ? 'wajib' : 'opsional') + '</small></div><textarea class="pkaIn" id="gbCatP" placeholder="mis. ban AOTELI belum datang dari gudang">' + e(m.catatan || '') + '</textarea>'
      + '<button type="button" class="pkaTombol ung" data-p="gbPendingYa">⏸ Simpan pending</button><div class="pkaMsg"></div>';
  }

  /* ---------- form SELESAIKAN ---------- */
  function itemBaru(p, ch) {
    var s = ((ch && ch.slots) || []).filter(function (x) { return x.posisi === p; })[0] || {};
    return { posisi: p, aksi: 'GANTI', tukar: '', seriData: s.ada ? s.seri : '', kmLama: s.ada ? s.km : '', seriLama: s.ada ? s.seri : '', lamaBeda: '', alasan: (M().t.gb || {}).alasan || '', fl: {}, seriBaru: '', cb: null, fb: {}, jenis: '', merk: '', merkLain: '' };
  }
  function htmlSelesai(t) {
    var m = M(), g = t.gb || {};
    var h = kepala('✅ Ganti ban', t);
    h += '<div class="gbInfo"><div>Lokasi<b>' + (g.lokasi === 'STORING' ? '🆘 STORING' : '🏠 POOL') + '</b></div><div>Ditunjuk<b>' + e(String(t.jamTunjuk || '').slice(11) || '-') + '</b></div><div>Target<b>' + (g.target != null ? A.umur(g.target) : '-') + '</b></div></div>';
    h += '<div class="pkaPita br">🛞 ' + e(t.mek || '-') + ' · diproses oleh <b>' + e(S().nama || '') + '</b>. 1 orang simpan = selesai untuk semua; jumlah ban dibagi rata.</div>';
    if (!m.ch || !P) return h + '<div class="pkaKosong"><span class="putar"></span> Membaca ban unit dari Data Ban…</div><div class="pkaMsg"></div>';
    if (!m.ch.ok) return h + '<div class="pkaPita mrh">⚠️ ' + e(m.ch.pesan) + '</div><div class="pkaMsg"></div>';
    h += '<div class="pkaLbl">Posisi yang dikerjakan <small>ketuk peta untuk tambah / buang posisi</small></div><div id="gbPetaS">' + petaHtml(m.ch, m.urut, { klik: 'gbPosS' }) + '</div>';
    h += '<div id="gbKartu">' + isiBagian() + '</div>';
    h += '<div class="pkaLbl">KM unit <small>opsional · odometer</small></div><input class="pkaIn" id="gbKm" inputmode="numeric" value="' + e(m.km || '') + '" placeholder="mis. 184230">';
    h += '<div class="pkaLbl">🕒 Jam selesai <small>ubah kalau selesainya lebih awal</small></div><input class="pkaIn" id="gbJamS" type="datetime-local" value="' + e(m.jam || A.jamKiniLokal()) + '">';
    h += '<div class="pkaLbl">✍️ Tanda tangan driver <span class="w">wajib</span><small>' + e(t.drv || '') + '</small></div><div class="pkaTtd"><canvas id="gbTtdD"></canvas><button type="button" class="hp" data-p="gbTtdHapus:D">Hapus</button><span class="ph">tanda tangan di sini</span></div>';
    h += '<div class="pkaLbl">✍️ Tanda tangan tyreman <span class="w">wajib</span></div><div class="pkaTtd"><canvas id="gbTtdT"></canvas><button type="button" class="hp" data-p="gbTtdHapus:T">Hapus</button><span class="ph">tanda tangan di sini</span></div>';
    h += '<input type="file" id="gbFile" accept="image/*" capture="environment" hidden><input type="file" id="gbFileGal" accept="image/*" hidden>';
    return h + '<div id="gbKonflik"></div><button type="button" class="pkaTombol hj" data-p="gbSelesaiYa">✅ Selesai & sambungkan ke Data Ban</button><div class="pkaMsg"></div>';
  }
  function fotoHtml(i, sisi, f) {
    var ok = f && f.url, sibuk = f && f.st === 'unggah', gagal = f && f.st === 'gagal';
    return '<div class="gbFt"><div class="th' + (f && f.data ? '' : ' kosong') + '">' + (f && f.data ? '<img alt="" src="' + f.data + '">' + (ok ? '<em>✓</em>' : '') : '📷') + '</div><div>'
      + '<button type="button" class="' + (ok ? '' : 'utama') + '" data-p="gbFoto:' + i + '|' + sisi + '">📷 ' + (ok ? 'Foto ulang' : 'Foto') + ' ban ' + (sisi === 'LAMA' ? 'lama' : 'baru') + '</button>'
      + '<div class="gbCat"' + (gagal ? ' style="color:#dc2626;font-weight:800"' : ok ? ' style="color:var(--tHijau,#0f7a45);font-weight:800"' : '') + '>' + (sibuk ? '⏳ Mengunggah…' : gagal ? '⚠️ ' + e(f.pesan || 'Gagal unggah') + ' — ketuk untuk ulang' : ok ? 'Terunggah ✓' : 'Wajib — no seri kelihatan') + '</div>'
      + '<button type="button" style="min-height:34px;margin-top:4px;font-size:12px" data-p="gbGaleri:' + i + '|' + sisi + '">🖼️ dari galeri</button></div></div>';
  }
  /* Revisi Pak Fanza 25 Nov: form per BAGIAN — (1) Ganti/Tukar semua posisi, (2) BAN LAMA semua posisi, (3) BAN BARU semua posisi. */
  function noPos(i, p) { return '<div class="hd"><span class="no">' + (i + 1) + '</span><b>' + e(p) + '</b>'; }
  function blokAksi(i) {
    var m = M(), it = m.item[m.urut[i]], p = it.posisi, kurang = kurangItem(it);
    var h = '<div class="gbKp" id="gbA' + i + '">' + noPos(i, p) + '<span class="ok" style="color:' + (kurang.length ? '#dc2626' : 'var(--tHijau,#0f7a45)') + '">' + (kurang.length ? kurang.length + ' belum' : '✓ lengkap') + '</span></div>';
    h += '<div class="gbDua2" style="margin-top:0"><button type="button" data-p="gbAksi:' + i + '|GANTI" class="' + (it.aksi === 'GANTI' ? 'on b' : '') + '">🔁 GANTI ban<small>lepas lama, pasang ban lain</small></button><button type="button" data-p="gbAksi:' + i + '|TUKAR" class="' + (it.aksi === 'TUKAR' ? 'on l' : '') + '">↔ TUKAR posisi<small>rotasi di unit ini</small></button></div>';
    if (it.aksi === 'TUKAR') {
      var bisa = (m.ch.slots || []).filter(function (s) { return s.ada && s.posisi !== p; });
      h += '<div class="pkaLbl">Ditukar dengan</div><select class="pkaIn" data-gb="tukar:' + i + '"><option value="">— pilih posisi —</option>' + bisa.map(function (s) { return '<option value="' + e(s.posisi) + '"' + (it.tukar === s.posisi ? ' selected' : '') + '>' + e(s.posisi) + ' · …' + e(String(s.seri).slice(-5)) + '</option>'; }).join('') + '</select>';
      h += '<div class="gbCat">Ban + umurnya ikut pindah (seperti Tukar di Form Ban), tanpa ban baru. Kalau Data Ban salah, pakai GANTI.</div>';
    }
    return h + '</div>';
  }
  function blokLama(i) {
    var m = M(), it = m.item[m.urut[i]];
    if (it.aksi !== 'GANTI') return '';
    var h = '<div class="gbSisi lm" id="gbL' + i + '">' + noPos(i, it.posisi) + '</div><input class="pkaIn gbSeri" data-gb="lama:' + i + '" value="' + e(it.seriLama) + '" placeholder="no seri ban lama" autocomplete="off">';
    h += '<div id="gbCekL' + i + '">' + cekLamaHtml(i) + '</div>' + fotoHtml(i, 'LAMA', it.fl);
    h += '<div class="pkaLbl" style="margin-top:8px">Alasan dilepas <span class="w">wajib</span></div><div class="pkaChips">' + P.alasan.map(function (a) { return '<button type="button" data-p="gbAlS:' + i + '|' + e(a) + '" class="' + (it.alasan === a ? 'on' : '') + '">' + e(a) + '</button>'; }).join('') + '</div>';
    return h + '</div>';
  }
  function blokBaru(i) {
    var m = M(), it = m.item[m.urut[i]];
    if (it.aksi !== 'GANTI') return '';
    var h = '<div class="gbSisi br" id="gbB' + i + '">' + noPos(i, it.posisi) + '</div><input class="pkaIn gbSeri" data-gb="baru:' + i + '" value="' + e(it.seriBaru) + '" placeholder="no seri ban baru" autocomplete="off">';
    h += '<div id="gbCekB' + i + '">' + cekBaruHtml(i) + '</div>' + fotoHtml(i, 'BARU', it.fb);
    h += '<div class="pkaLbl" style="margin-top:8px">Jenis ban <span class="w">wajib</span></div><div class="gbDua2"><button type="button" data-p="gbJenis:' + i + '|BARU" class="' + (it.jenis === 'BARU' ? 'on b' : '') + '">🆕 Ban Baru<small>baru dari gudang</small></button><button type="button" data-p="gbJenis:' + i + '|LELESAN" class="' + (it.jenis === 'LELESAN' ? 'on l' : '') + '">♻️ Ban Lelesan<small>vulkanisir / bekas</small></button></div>';
    var mk = (P.merk || []).slice(); if (it.merk && mk.indexOf(it.merk) < 0 && it.merk !== '__lain') mk.push(it.merk);
    h += '<div class="pkaLbl">Merk <span class="w">wajib</span><small>pilihan dari DATA BAN</small></div><div class="pkaChips">' + mk.map(function (x) { return '<button type="button" data-p="gbMerk:' + i + '|' + e(x) + '" class="' + (it.merk === x ? 'on' : '') + '">' + e(x) + '</button>'; }).join('')
      + '<button type="button" data-p="gbMerk:' + i + '|__lain" class="' + (it.merk === '__lain' ? 'on' : '') + '">✏️ Lainnya</button></div>'
      + (it.merk === '__lain' ? '<input class="pkaIn" data-gb="merk:' + i + '" style="margin-top:6px;text-transform:uppercase" placeholder="tulis merk" value="' + e(it.merkLain) + '">' : '');
    return h + '</div>';
  }
  function isiBagian() {
    var m = M(), ix = m.urut.map(function (p, i) { return i; }), ganti = ix.filter(function (i) { return m.item[m.urut[i]].aksi === 'GANTI'; });
    var h = '<div class="pkaLbl">① Ganti atau tukar posisi <small>per posisi</small></div>' + ix.map(blokAksi).join('');
    if (ganti.length) {
      h += '<div class="pkaLbl" style="font-size:15px;color:#b91c1c;margin-top:16px">② ⬇️ BAN LAMA — dilepas <small>' + ganti.length + ' posisi berurutan</small></div>' + ganti.map(blokLama).join('');
      h += '<div class="pkaLbl" style="font-size:15px;color:var(--tHijau,#0f7a45);margin-top:16px">③ ⬆️ BAN BARU — dipasang <small>' + ganti.length + ' posisi berurutan</small></div>' + ganti.map(blokBaru).join('');
    }
    return h;
  }
  function cekLamaHtml(i) {
    var m = M(), it = m.item[m.urut[i]], b = baku(it.seriLama);
    if (!it.seriData) return '<div class="gbCek">' + (b ? 'Posisi ini kosong di Data Ban → seri lama dicatat PERLU CEK.' : 'Posisi ini kosong di Data Ban (tidak ada ban lama tercatat). Kalau memang ada ban lama, isi seri + foto.') + '</div>';
    if (b === baku(it.seriData)) return '<div class="gbCek ok">✓ cocok dengan Data Ban' + (it.kmLama !== '' ? ' · ' + Math.round(it.kmLama).toLocaleString('id-ID') + ' km' : '') + '</div>';
    return '<div class="gbCek wr">⚠ Data Ban mencatat <b>' + e(it.seriData) + '</b> di posisi ini. Seri yang diketik beda.</div><div class="pkaChips" style="margin-top:6px"><button type="button" data-p="gbBeda:' + i + '|fisik" class="' + (it.lamaBeda === 'fisik' ? 'on' : '') + '">Fisik benar, Data Ban salah</button><button type="button" data-p="gbBeda:' + i + '|ketik">Saya salah ketik (pakai seri Data Ban)</button></div>';
  }
  function cekBaruHtml(i) {
    var m = M(), it = m.item[m.urut[i]];
    if (!it.seriBaru) return '<div class="gbCek">Format: huruf besar & angka, 8–14 karakter (contoh 22403405760, A551762130).</div>';
    var f = cekSeri(it.seriBaru);
    if (!f.ok) return '<div class="gbCek er">✕ ' + e(f.pesan) + '</div>';
    var t = (f.seri !== String(it.seriBaru).toUpperCase() ? 'dibakukan jadi <b>' + e(f.seri) + '</b> · ' : '') + (f.awas ? '<span style="color:#b45309">⚠ ' + e(f.awas) + '</span> · ' : '');
    var c = it.cb;
    if (!c || c.seri !== f.seri) return '<div class="gbCek">' + t + '⏳ cek ke Data Ban…</div>';
    if (c.galat) return '<div class="gbCek wr">' + t + 'belum bisa dicek (' + e(c.galat) + ') — server cek lagi saat simpan.</div>';
    if (c.dipakai) return '<div class="gbCek wr">' + t + '⚠ tercatat terpasang di <b>' + e(c.dipakai) + '</b> → posisi itu akan dikosongkan (ban dipindah ke sini).</div>';
    return '<div class="gbCek ok">' + t + '✓ format benar · belum terpasang di unit lain' + (c.riwayat ? ' · ' + e(c.riwayat) : '') + '</div>';
  }
  function kurangItem(it) {
    var k = [];
    if (it.aksi === 'TUKAR') { if (!it.tukar) k.push('pasangan tukar'); return k; }
    if (it.seriData || baku(it.seriLama)) {
      if (!baku(it.seriLama)) k.push('seri lama');
      if (!(it.fl && it.fl.url)) k.push('foto ban lama');
      if (it.seriData && baku(it.seriLama) && baku(it.seriLama) !== baku(it.seriData) && it.lamaBeda !== 'fisik') k.push('konfirmasi seri lama');
    }
    if (!it.alasan) k.push('alasan dilepas');
    if (!cekSeri(it.seriBaru).ok) k.push('seri baru');
    if (!(it.fb && it.fb.url)) k.push('foto ban baru');
    if (!it.jenis) k.push('Baru / Lelesan');
    if (!it.merk || (it.merk === '__lain' && !String(it.merkLain || '').trim())) k.push('merk');
    return k;
  }
  function gambarKartu(i) { [['#gbA', blokAksi], ['#gbL', blokLama], ['#gbB', blokBaru]].forEach(function (x) { var w = q(x[0] + i); if (w) w.outerHTML = x[1](i); }); var mg = q('.pkaModal .pkaMsg'); if (mg && /belum lengkap|wajib|Tunggu, foto/.test(mg.textContent)) A.msg(''); }
  function gambarSemuaKartu() { var m = M(), w = q('#gbKartu'); if (w) w.innerHTML = isiBagian(); var pt = q('#gbPetaS'); if (pt) pt.innerHTML = petaHtml(m.ch, m.urut, { klik: 'gbPosS' }); }
  function htmlRingkas() {
    var m = M(), r = m.r || {}, s = r.sambung || {};
    var h = '<h3>✅ Ganti ban selesai<button type="button" class="tutupX" data-p="tutupModal" aria-label="Tutup">✕</button></h3>';
    h += '<div class="gbBesar"><div class="c">' + (s.ok ? '✅' : '⚠️') + '</div><h2>' + e(r.lambung) + ' · ' + (r.lokasi === 'STORING' ? '🆘 STORING' : '🏠 POOL') + '</h2><p>' + e(r.pengerja) + ' · ' + e(r.jamSelesai) + '</p></div>';
    h += '<div class="gbKpi"><div><b>' + (r.menitBersih == null ? '-' : A.umur(r.menitBersih)) + '</b>tunjuk→selesai<br>pending ' + A.umur(r.menitPending || 0) + '</div><div><b>' + (r.menitKerja == null ? '-' : A.umur(r.menitKerja)) + '</b>mulai→selesai</div><div><b>' + (r.tepat === 'YA' ? '✓ tepat' : r.tepat === 'TIDAK' ? 'lewat' : '-') + '</b>target ' + (r.target == null ? 'tidak dinilai' : A.umur(r.target)) + '</div></div>';
    h += '<div class="pkaBox"><table class="gbTbl"><tr><th>POSISI</th><th>LAMA</th><th>BARU</th></tr>' + (r.baris || []).map(function (b) {
      if (b.aksi === 'TUKAR') return '<tr><td><b>' + e(singkat(b.posisi)) + '</b></td><td colspan="2">↔ ditukar dengan ' + e(singkat(b.tukarDengan)) + '</td></tr>';
      return '<tr><td><b>' + e(singkat(b.posisi)) + '</b><br><span style="color:var(--redup)">' + e(b.alasan) + '</span></td><td class="m">' + e(b.seriLama || '(kosong)') + (b.perluCek ? '<br><span style="color:#b45309;font-family:inherit">⚠ Data Ban: ' + e(b.seriData || 'kosong') + '</span>' : '') + '</td>'
        + '<td class="m">' + e(b.seriBaru) + '<br><span class="pkaBd ' + (b.jenis === 'LELESAN' ? 'lel' : 'baru') + '">' + (b.jenis === 'LELESAN' ? '♻️ LELESAN' : '🆕 BARU') + '</span> ' + e(b.merk) + (b.jenis === 'LELESAN' ? '<br><span style="font-family:inherit;color:var(--redup)">asal: ' + e(b.asal) + '</span>' : '') + '</td></tr>';
    }).join('') + '</table></div>';
    var ses = {}; (r.baris || []).forEach(function (b) { ses[b.posisi] = { seri: b.seriBaru, jenis: b.aksi === 'TUKAR' ? 'TUKAR' : b.jenis }; });
    if (m.ch && m.ch.ok) h += '<div class="pkaLbl">Ban unit sekarang</div>' + petaHtml(m.ch, [], { sesudah: ses });
    var cek = (r.baris || []).filter(function (b) { return b.perluCek; }).length, lel = (r.baris || []).filter(function (b) { return b.jenis === 'LELESAN'; }).length;
    h += '<div class="gbSambung' + (s.ok ? '' : ' gagal') + '"><h4>' + (s.ok ? '🔗 Tersambung ke Data Ban' : '⚠️ Belum tersambung ke Data Ban') + '</h4>'
      + (s.ok ? '<div class="li">✅ <div><b>DATA BAN</b> diperbarui: no seri baru, tanggal pasang hari ini, ritase mulai 0 → umur ban dihitung dari sekarang. Merk ikut ditulis.</div></div>'
        + '<div class="li">✅ <div><b>LOG INPUT BAN</b> tercatat (jenis, merk, foto di keterangan)' + (lel ? '; ban lelesan diberi catatan asal di riwayat ban' : '') + '.</div></div>'
        + '<div class="li">🕘 <div><b>RIWAYAT BAN</b> tercatat otomatis waktu Umur Ban dibuka berikutnya.</div></div>'
        : '<div class="li">⚠️ <div>' + e(s.pesan || '') + '<br>Tiket sudah SELESAI. Pengawas bisa tekan "Sambungkan ulang" di papan (⚠️ tindak lanjut).</div></div>')
      + '<div class="li">📊 <div><b>KPI</b>: ' + String(r.nilai).replace('.', ',') + ' ban' + (r.jumlahOrang > 1 ? ' dibagi ' + r.jumlahOrang + ' orang = ' + String(r.perOrang).replace('.', ',') + ' per orang' : '') + ' (' + e(r.idPengerja) + ').</div></div>'
      + (cek ? '<div class="li">⚠️ <div>' + cek + ' seri lama beda dengan Data Ban → ditandai <b>PERLU CEK</b> untuk pengawas.</div></div>' : '') + '</div>';
    return h + '<div class="pkaAksiD"><button type="button" class="pkaTombol abu" data-p="cetak:' + e(r.armada + '|' + r.id) + '">🖨️ Cetak tiket</button><button type="button" class="pkaTombol" data-p="tutupModal">Kembali ke papan</button></div><div class="pkaMsg"></div>';
  }
  function htmlTindak() {
    var m = M(), h = '<h3>⚠️ Ganti ban: tindak lanjut<button type="button" class="tutupX" data-p="tutupModal" aria-label="Tutup">✕</button></h3><div class="sb">Seri lama yang beda dengan Data Ban (cek fisik / foto, betulkan di Form Ban kalau perlu) dan tiket yang belum tersambung ke Data Ban.</div>';
    if (!m.l) return h + '<div class="pkaKosong"><span class="putar"></span> Memuat…</div><div class="pkaMsg"></div>';
    if (!m.l.length) return h + '<div class="pkaKosong">Tidak ada yang perlu ditindak 👍</div><div class="pkaMsg"></div>';
    return h + m.l.map(function (x, i) {
      return '<div class="gbTd"><b>' + e(A.lbPendek(x.lb)) + ' · ' + e(x.posisi) + '</b> · ' + e(x.jam) + '<br>🛞 ' + e(x.pengerja) + '<br>'
        + (x.cek ? '⚠️ Seri lama lapangan <b>' + e(x.seriLama) + '</b>, Data Ban <b>' + e(x.seriData || 'kosong') + '</b>' + (x.fotoLama ? ' · <a href="' + e(x.fotoLama) + '" target="_blank" rel="noopener">foto ban lama</a>' : '')
          + '<input class="pkaIn" id="gbCekC' + i + '" style="margin-top:6px" placeholder="hasil cek (mis. fisik benar, Data Ban dibetulkan)"><button type="button" class="pkaTombol abu" style="margin-top:6px" data-p="gbCekYa:' + i + '">✓ Sudah dicek</button>' : '')
        + (x.belum ? '<div style="margin-top:6px;color:#b91c1c;font-weight:800">Belum tersambung: ' + e(x.pesan || '-') + '</div><button type="button" class="pkaTombol abu" style="margin-top:6px" data-p="gbSambungYa:' + i + '">🔁 Sambungkan ulang ke Data Ban</button>' : '') + '</div>';
    }).join('') + '<div class="pkaMsg"></div>';
  }

  /* ---------- sesudah modal digambar: TTD, file foto ---------- */
  function sesudahModal(w, jenis) {
    if (jenis !== 'gbSelesai') return;
    pasangTtd(w);
  }
  function pasangTtd(w) {
    TTD = {};
    ['D', 'T'].forEach(function (k) {
      var cv = w.querySelector('#gbTtd' + k); if (!cv) return;
      var p = TTD[k] = { cv: cv, isi: false };
      var ukur = function () { var dpr = Math.min(2, window.devicePixelRatio || 1), wd = cv.clientWidth || 300, hg = cv.clientHeight || 130; cv.width = Math.round(wd * dpr); cv.height = Math.round(hg * dpr); var c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); c.scale(dpr, dpr); c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#111'; p.isi = false; };
      p.ukur = ukur; setTimeout(ukur, 0);
      var gb = false, xy = function (ev) { var r = cv.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
      cv.addEventListener('pointerdown', function (ev) { ev.preventDefault(); try { cv.setPointerCapture(ev.pointerId); } catch (x) { /* */ } gb = true; var c = cv.getContext('2d'), a = xy(ev); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + 0.1, a[1] + 0.1); c.stroke(); p.isi = true; var ph = cv.parentNode.querySelector('.ph'); if (ph) ph.style.display = 'none'; });
      cv.addEventListener('pointermove', function (ev) { if (!gb) return; ev.preventDefault(); var c = cv.getContext('2d'), a = xy(ev); c.lineTo(a[0], a[1]); c.stroke(); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { cv.addEventListener(n, function () { gb = false; }); });
    });
    ['gbFile', 'gbFileGal'].forEach(function (id) { var inp = w.querySelector('#' + id); if (inp) inp.addEventListener('change', function () { fotoDipilih(inp); }); });
  }
  function ttdData(k) { var p = TTD[k]; return p && p.isi ? p.cv.toDataURL('image/png') : ''; }
  function kecilkan(f, lalu, gagal) {
    var rd = new FileReader();
    rd.onload = function (ev) { var img = new Image(); img.onload = function () { var sk = Math.min(1, 1280 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = Math.round(img.width * sk); cv.height = Math.round(img.height * sk); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); lalu(cv.toDataURL('image/jpeg', 0.7)); }; img.onerror = gagal; img.src = ev.target.result; };
    rd.onerror = gagal; rd.readAsDataURL(f);
  }
  function fotoDipilih(inp) {
    var m = M(), f = inp.files && inp.files[0], tg = m && m.fotoTarget; inp.value = '';
    if (!f || !tg) return;
    var it = m.item[m.urut[tg.i]]; if (!it) return;
    var kunci = tg.sisi === 'LAMA' ? 'fl' : 'fb';
    it[kunci] = { st: 'unggah', data: '' }; gambarKartu(tg.i);
    kecilkan(f, function (data) { it[kunci] = { st: 'unggah', data: data }; gambarKartu(tg.i); unggah(tg.i, tg.sisi, it, kunci); }, function () { it[kunci] = { st: 'gagal', pesan: 'Foto gagal dibaca' }; gambarKartu(tg.i); });
  }
  function unggah(i, sisi, it, kunci) {
    var m = M(), t = m.t, data = it[kunci].data;
    A.panggil('gbFoto', { armada: t.ar, id: t.id, posisi: it.posisi, sisi: sisi, foto: data }, 90000).then(function (h) {
      if (!M() || M() !== m) return;
      if (h && h.ok && h.url) it[kunci] = { st: 'ok', data: data, url: h.url }; else it[kunci] = { st: 'gagal', data: data, pesan: (h && h.pesan) || 'Gagal unggah' };
      var j = m.urut.indexOf(it.posisi); if (j >= 0) gambarKartu(j);
    }, function (x) { if (M() !== m) return; it[kunci] = { st: 'gagal', data: data, pesan: (x && x.message) || 'Tidak ada sinyal' }; var j = m.urut.indexOf(it.posisi); if (j >= 0) gambarKartu(j); });
  }
  var tCek = {};
  function cekSeriServer(i) {
    var m = M(), it = m.item[m.urut[i]], f = cekSeri(it.seriBaru);
    if (!f.ok) return;
    clearTimeout(tCek[i]);
    tCek[i] = setTimeout(function () {
      A.panggil('gbCekSeri', { seri: f.seri, lambung: m.t.lb, posisi: it.posisi }, 45000).then(function (h) {
        if (M() !== m) return;
        it.cb = h && h.ok ? { seri: f.seri, dipakai: h.dipakai || '', riwayat: h.riwayat || '' } : { seri: f.seri, galat: (h && h.pesan) || 'gagal' };
        var w = q('#gbCekB' + m.urut.indexOf(it.posisi)); if (w) w.innerHTML = cekBaruHtml(m.urut.indexOf(it.posisi));
      }, function () { if (M() !== m) return; it.cb = { seri: f.seri, galat: 'tidak ada sinyal' }; var w = q('#gbCekB' + m.urut.indexOf(it.posisi)); if (w) w.innerHTML = cekBaruHtml(m.urut.indexOf(it.posisi)); });
    }, 600);
  }

  /* ---------- kirim ---------- */
  function kirim(aksi, data, ms, sukses) {
    A.kunci(true); A.msg('Menyimpan…');
    return A.panggil(aksi, data, ms || 45000).then(function (h) {
      if (!h || !h.ok) { A.kunci(false); A.msg((h && h.pesan) || 'Gagal menyimpan.', 'err'); if (h && h.hilang) A.muat(true); if (sukses && h && h.konflik) sukses(h); return; }
      try { if (window.WHL_RASA) { window.WHL_RASA.bunyi && window.WHL_RASA.bunyi('sukses'); window.WHL_RASA.getar && window.WHL_RASA.getar('sukses'); } } catch (x) { /* */ }
      if (sukses) sukses(h); else { A.roti('✅ ' + (h.pesan || 'Tersimpan.')); A.tutupModal(); A.muat(true); }
    }, function (x) { A.kunci(false); A.msg(((x && x.message) || 'Tidak ada sinyal.') + ' — belum tersimpan, coba lagi.', 'err'); });
  }
  function aksiKartu(aksi, t, pesanSibuk) {
    A.roti(pesanSibuk);
    A.panggil(aksi, { armada: t.ar, id: t.id }, 45000).then(function (h) { A.roti(((h && h.ok) ? '✅ ' : '⚠️ ') + ((h && h.pesan) || 'Gagal.')); A.muat(true); }, function (x) { A.roti('⚠️ ' + ((x && x.message) || 'Tidak ada sinyal.') + ' Coba lagi.'); });
  }
  function kirimBuat() {
    var m = M();
    m.cat = String((q('#gbCatB') || {}).value || ''); m.lokKm = String((q('#gbLokKm') || {}).value || ''); m.driver = String((q('#gbDrv') || {}).value || '');
    if (m.belum) m.jml = String((q('#gbJml') || {}).value || '');
    var salah = !m.lb ? 'Pilih unit.' : (!m.belum && !m.pos.length) ? 'Ketuk minimal 1 posisi ban di peta (atau "Posisi belum pasti").' : (m.belum && !(parseInt(m.jml, 10) > 0)) ? 'Isi jumlah ban.' : !m.alasan ? 'Pilih alasan.'
      : !m.lokasi ? 'Pilih lokasi POOL / STORING.' : (m.lokasi === 'STORING' && m.lokKm.trim().length < 3) ? 'Isi lokasi storing (mis. Servo KM 64).' : !m.driver ? 'Pilih driver unit.' : !m.peng.length ? 'Ketuk tyreman yang ditunjuk.' : '';
    if (salah) { A.msg(salah, 'err'); return; }
    kirim('gbBuat', { lambung: m.lb, posisi: m.belum ? [] : m.pos.slice(), belumPasti: !!m.belum, jumlah: m.jml, alasan: m.alasan, lokasi: m.lokasi, lokasiKm: m.lokKm, driver: m.driver, pengerja: m.peng.slice(), catatan: m.cat, cid: m.cid }, 90000, function (h) {
      A.roti((h.tunjuk ? '✅ ' : '⚠️ ') + h.pesan); A.tutupModal(); A.setTab(h.tunjuk ? 'dikerjakan' : 'menunggu'); SARING = 'semua'; A.muat(true);
    });
  }
  function kirimSelesai(pindahkan) {
    var m = M(), t = m.t;
    m.km = String((q('#gbKm') || {}).value || ''); m.jam = String((q('#gbJamS') || {}).value || '');
    if (!m.urut.length) { A.msg('Ketuk minimal 1 posisi di peta.', 'err'); return; }
    for (var i = 0; i < m.urut.length; i++) { var k = kurangItem(m.item[m.urut[i]]); if (k.length) { A.msg('Posisi ' + (i + 1) + ' (' + singkat(m.urut[i]) + ') belum lengkap: ' + k.join(', ') + '.', 'err'); var w = q('#gbA' + i); if (w) w.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; } }
    if (m.urut.some(function (p) { var x = m.item[p]; return (x.fl && x.fl.st === 'unggah') || (x.fb && x.fb.st === 'unggah'); })) { A.msg('Tunggu, foto masih diunggah…', 'err'); return; }
    var dD = ttdData('D'), dT = ttdData('T');
    if (!dD) { A.msg('Tanda tangan DRIVER wajib.', 'err'); return; }
    if (!dT) { A.msg('Tanda tangan TYREMAN wajib.', 'err'); return; }
    var fs = ''; m.urut.forEach(function (p) { var x = m.item[p]; if (!fs && x.aksi === 'GANTI' && x.fb && x.fb.data) fs = x.fb.data; });
    if (!fs) m.urut.forEach(function (p) { var x = m.item[p]; if (!fs && x.fl && x.fl.data) fs = x.fl.data; });
    var tukarSudah = {};
    var pos = m.urut.filter(function (p) { var x = m.item[p]; if (x.aksi === 'TUKAR') { if (tukarSudah[p]) return false; tukarSudah[x.tukar] = 1; } return true; }).map(function (p) {
      var x = m.item[p];
      if (x.aksi === 'TUKAR') return { posisi: p, aksi: 'TUKAR', tukarDengan: x.tukar };
      return { posisi: p, aksi: 'GANTI', seriLama: baku(x.seriLama), lamaBeda: x.lamaBeda, fotoLama: (x.fl && x.fl.url) || '', alasan: x.alasan, seriBaru: baku(x.seriBaru), fotoBaru: x.fb.url, jenisBan: x.jenis, merk: x.merk === '__lain' ? String(x.merkLain).toUpperCase().trim() : x.merk };
    });
    if (!fs) { A.msg('Ambil minimal 1 foto ban (untuk foto selesai tiket).', 'err'); return; }
    kirim('gbSelesai', { armada: t.ar, id: t.id, posisi: pos, kmUnit: m.km, jamSelesai: m.jam, ttdDriver: dD, ttdTyreman: dT, fotoSelesai: fs, pindahkan: !!pindahkan }, 180000, function (h) {
      if (h.konflik) {
        A.kunci(false);
        var w = q('#gbKonflik'); if (w) w.innerHTML = '<div class="pkaPita">⚠️ ' + A.esc(h.pesan) + '</div><button type="button" class="pkaTombol kn" data-p="gbPindahYa">Ya, pindahkan ban itu ke sini & simpan</button>';
        return;
      }
      A.roti('✅ ' + h.pesan); var ch = m.ch; A.muat(true);
      P = null; /* ganti-ban-merk-lainnya-25nov: pilihan (merk) dimuat ulang -> merk Lainnya yang baru tersimpan langsung ada di daftar berikutnya */
      delete CHS[t.lb];
      A.bukaModal('gbRingkas', null, { r: h.ringkas || {}, ch: ch });
    });
  }

  /* ---------- ketukan ---------- */
  function bukaSelesai(t) {
    var g = t.gb || {}, m;
    A.bukaModal('gbSelesai', t, { ch: null, urut: [], item: {}, km: '', jam: '' });
    m = M();
    muatPilihan(function () {
      muatChassis(t.lb, function (ch) {
        if (M() !== m) return;
        m.ch = ch;
        if (ch.ok) (g.posPanjang || []).forEach(function (p) { if (m.urut.indexOf(p) < 0) { m.urut.push(p); m.item[p] = itemBaru(p, ch); } });
        var w = el().querySelector('.pkaModal .kt'); if (w) { w.innerHTML = htmlSelesai(t); pasangTtd(w); }
      });
    });
  }
  function klik(n, v, b, ev) {
    var t, m = M();
    if (n === 'gbSaring') { SARING = v; A.gambarPapan(); return true; }
    if (n === 'gbBaru') { A.bukaModal('gbBuat', null, { lb: '', ch: null, pos: [], belum: false, jml: 1, alasan: '', lokasi: '', lokKm: '', driver: '', peng: [], cat: '', cid: 'gb-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) }); muatPilihan(function () { if (M() && M().jenis === 'gbBuat') A.gambarModal(); }); return true; }
    if (n === 'gbTindak') { A.bukaModal('gbTindak', null, { l: null }); var mm = M(); A.panggil('gbTindak', {}, 45000).then(function (h) { if (M() !== mm) return; mm.l = h && h.ok ? h.daftar : []; if (!(h && h.ok)) A.msg((h && h.pesan) || 'Gagal memuat.', 'err'); A.gambarModal(); }, function () { mm.l = []; A.gambarModal(); }); return true; }
    /* kartu / detail: tombol tiket */
    if (/^(gbTunjukBuka|gbMulai|gbPendingBuka|gbLanjut|gbSelesaiBuka)$/.test(n) || (/^(tunjuk|selesai|pending|lanjut|lanjutYa|ganti)$/.test(n) && v && (A.cariT(v) || {}).gb)) {
      t = A.cariT(v);
      if (!t) { A.roti('Tiket sudah berubah. Papan dimuat ulang.'); A.muat(true); return true; }
      if (n === 'gbTunjukBuka' || n === 'tunjuk' || n === 'ganti') { A.bukaModal('gbTunjuk', t, { peng: [] }); muatPilihan(function () { if (M() && M().jenis === 'gbTunjuk') A.gambarModal(); }); return true; }
      if (n === 'gbMulai') { A.duaKali(b, function () { aksiKartu('gbMulai', t, '▶ Menyimpan jam mulai…'); }); return true; }
      if (n === 'gbLanjut' || n === 'lanjut' || n === 'lanjutYa') { A.duaKali(b, function () { aksiKartu('gbLanjut', t, '▶ Melanjutkan…'); }); return true; }
      if (n === 'gbPendingBuka' || n === 'pending') { A.bukaModal('gbPending', t, { alasan: '', catatan: '' }); return true; }
      if (n === 'gbSelesaiBuka' || n === 'selesai') { bukaSelesai(t); return true; }
    }
    if (!/^gb/.test(n) || !m) return false;
    /* buat tiket */
    if (n === 'gbPos') { var i = m.pos.indexOf(v); if (i >= 0) m.pos.splice(i, 1); else m.pos.push(v); var pw = q('#gbPetaW'); if (pw) pw.innerHTML = petaBuat(); var rb = q('#gbRingB'); if (rb) rb.innerHTML = ringkasBuat(); return true; }
    if (n === 'gbWajib') { m.belum = false; ((m.ch && m.ch.slots) || []).forEach(function (s) { if (s.ada && /WAJIB/.test(s.status) && m.pos.indexOf(s.posisi) < 0) m.pos.push(s.posisi); }); var pw2 = q('#gbPetaW'); if (pw2) pw2.innerHTML = petaBuat(); var rb2 = q('#gbRingB'); if (rb2) rb2.innerHTML = ringkasBuat(); return true; }
    if (n === 'gbBelum') { m.belum = !m.belum; var pw3 = q('#gbPetaW'); if (pw3) pw3.innerHTML = petaBuat(); var rb3 = q('#gbRingB'); if (rb3) rb3.innerHTML = ringkasBuat(); return true; }
    if (n === 'gbAl') { m.alasan = v; simpanIsianBuat(); A.gambarModal(); return true; }
    if (n === 'gbLok') { m.lokasi = v; simpanIsianBuat(); A.gambarModal(); return true; }
    if (n === 'gbOrang') { var k = m.peng.indexOf(v); if (k >= 0) m.peng.splice(k, 1); else m.peng.push(v); b.classList.toggle('on', k < 0); var rb4 = q('#gbRingB'); if (rb4) rb4.innerHTML = ringkasBuat(); A.lepasSiap(); return true; }
    if (n === 'gbBuatYa') { A.duaKali(b, kirimBuat); return true; }
    if (n === 'gbTunjukYa') { if (!m.peng.length) { A.msg('Ketuk tyreman dulu.', 'err'); return true; } A.duaKali(b, function () { kirim('gbTunjuk', { armada: m.t.ar, id: m.t.id, pengerja: m.peng.slice() }, 60000, function (h) { A.roti('✅ ' + h.pesan); A.tutupModal(); A.setTab('dikerjakan'); A.muat(true); }); }); return true; }
    if (n === 'gbAlP') { m.catatan = String((q('#gbCatP') || {}).value || ''); m.alasan = v; A.gambarModal(); return true; }
    if (n === 'gbPendingYa') { var c = String((q('#gbCatP') || {}).value || '').trim(); if (!m.alasan) { A.msg('Pilih alasan.', 'err'); return true; } if (m.alasan === 'Lainnya' && c.length < 3) { A.msg('Tulis alasannya.', 'err'); return true; } A.duaKali(b, function () { kirim('gbPending', { armada: m.t.ar, id: m.t.id, alasan: m.alasan, catatan: c }); }); return true; }
    /* selesaikan */
    var pr = String(v).split('|'), ix = parseInt(pr[0], 10), it = m.urut ? m.item[m.urut[ix]] : null;
    if (n === 'gbPosS') {
      var j = m.urut.indexOf(v);
      if (j >= 0) { m.urut.splice(j, 1); delete m.item[v]; } else { m.urut.push(v); m.item[v] = itemBaru(v, m.ch); }
      gambarSemuaKartu(); return true;
    }
    if (n === 'gbAksi' && it) { it.aksi = pr[1]; gambarSemuaKartu(); return true; }
    if (n === 'gbAlS' && it) { it.alasan = pr.slice(1).join('|'); gambarKartu(ix); return true; }
    if (n === 'gbBeda' && it) { if (pr[1] === 'ketik') { it.seriLama = it.seriData; it.lamaBeda = ''; } else it.lamaBeda = 'fisik'; gambarKartu(ix); return true; }
    if (n === 'gbJenis' && it) { it.jenis = pr[1]; gambarKartu(ix); return true; }
    if (n === 'gbMerk' && it) { it.merk = pr.slice(1).join('|'); gambarKartu(ix); return true; }
    if ((n === 'gbFoto' || n === 'gbGaleri') && it) { m.fotoTarget = { i: ix, sisi: pr[1] }; var fi = q(n === 'gbFoto' ? '#gbFile' : '#gbFileGal'); if (fi) fi.click(); return true; }
    if (n === 'gbTtdHapus') { var p = TTD[v]; if (p && p.ukur) { p.ukur(); var ph = p.cv.parentNode.querySelector('.ph'); if (ph) ph.style.display = ''; } return true; }
    if (n === 'gbSelesaiYa') { A.duaKali(b, function () { kirimSelesai(false); }); return true; }
    if (n === 'gbPindahYa') { A.duaKali(b, function () { kirimSelesai(true); }); return true; }
    /* tindak lanjut */
    if (n === 'gbCekYa' && m.l) { var x = m.l[parseInt(v, 10)], ct = String((q('#gbCekC' + v) || {}).value || '').trim(); if (!x) return true; if (ct.length < 3) { A.msg('Tulis hasil cek dulu.', 'err'); return true; } kirim('gbCekBeres', { baris: x.baris, catatan: ct }, 45000, function (h) { A.roti('✅ ' + h.pesan); m.l.splice(parseInt(v, 10), 1); A.kunci(false); A.gambarModal(); A.muat(true); }); return true; }
    if (n === 'gbSambungYa' && m.l) { var y = m.l[parseInt(v, 10)]; if (!y) return true; A.duaKali(b, function () { kirim('gbSambungUlang', { armada: y.ar, id: y.id }, 150000, function (h) { A.roti('✅ ' + h.pesan); m.l = m.l.filter(function (z) { return !(z.id === y.id && z.ar === y.ar && !z.cek); }); A.kunci(false); A.gambarModal(); A.muat(true); }); }); return true; }
    return false;
  }
  function simpanIsianBuat() { var m = M(); if (!m || m.jenis !== 'gbBuat') return; m.cat = String((q('#gbCatB') || {}).value || m.cat || ''); m.lokKm = String((q('#gbLokKm') || {}).value || m.lokKm || ''); m.driver = String((q('#gbDrv') || {}).value || m.driver || ''); if (q('#gbJml')) m.jml = q('#gbJml').value; }
  function ubah(ev) {
    var x = ev.target, m = M();
    if (!m || !/^gb/.test(m.jenis || '')) return false;
    if (x.id === 'gbUnit' && ev.type === 'change') {
      simpanIsianBuat(); m.lb = x.value; m.ch = null; m.pos = []; m.driver = ''; A.gambarModal();
      if (m.lb) { var lb = m.lb; muatChassis(lb, function (ch) { if (M() !== m || m.lb !== lb) return; m.ch = ch; var pw = q('#gbPetaW'); if (pw) pw.innerHTML = petaBuat(); }); }
      return true;
    }
    if (x.id === 'gbJml') { m.jml = x.value; var rb = q('#gbRingB'); if (rb) rb.innerHTML = ringkasBuat(); return true; }
    var a = x.getAttribute && x.getAttribute('data-gb'); if (!a) return false;
    var pr = a.split(':'), i = parseInt(pr[1], 10), it = m.item && m.item[m.urut[i]]; if (!it) return true;
    if (pr[0] === 'lama') { it.seriLama = x.value; if (ev.type === 'change') { it.seriLama = baku(x.value); x.value = it.seriLama; } var w = q('#gbCekL' + i); if (w) w.innerHTML = cekLamaHtml(i); }
    if (pr[0] === 'baru') { it.seriBaru = x.value; if (ev.type === 'change') { var f = cekSeri(x.value); if (f.ok) { it.seriBaru = f.seri; x.value = f.seri; } cekSeriServer(i); } var w2 = q('#gbCekB' + i); if (w2) w2.innerHTML = cekBaruHtml(i); }
    if (pr[0] === 'merk') { it.merkLain = x.value; if (ev.type === 'change') { it.merkLain = String(x.value || '').toUpperCase().replace(/\s+/g, ' ').trim(); x.value = it.merkLain; } } /* ganti-ban-merk-lainnya-25nov: merk Lainnya jadi HURUF BESAR saat keluar kotak (bukan tiap ketikan) */
    if (pr[0] === 'tukar') { it.tukar = x.value; }
    return true;
  }
  function lupakan() { P = null; CHS = {}; TTD = {}; SARING = 'semua'; }

  window.WHL_PK_BAN = { pasang: function (api) { A = api; }, atas: atas, saringHtml: saringHtml, saring: saring, kartu: kartu, html: html, sesudahModal: sesudahModal, klik: klik, ubah: ubah, menu: menu, lupakan: lupakan,
    _uji: { cekSeri: cekSeri, baku: baku, singkat: singkat, petaHtml: function (ch, p, o) { return petaHtml(ch, p, o); } } };
})();
