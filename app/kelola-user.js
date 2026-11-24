/* WHL App — KELOLA USER (app-kelola-user-24nov, Vanesa 24 Nov 2026; permintaan Pak Fanza "pimpinan bisa kelola user").
 * Menu khusus pengelola akun (server KU_PENGELOLA = Pak Fanza WHL-01001, Reza WHL-01003, Rike WHL-01010). Layar ini cuma tampilan:
 * SEMUA hak dicek ulang di server DASHBOARD KelolaUser.gs lewat api pusat: pusatKelolaUser [token, aksi, data].
 *   daftar · ubah (peran/divisi/izin Nota bengkel) · buatAkun (orang dari data karyawan yang belum punya akun) · resetPin (sistem / sendiri)
 *   · nonaktif (alasan wajib, tanpa hapus permanen) · aktifkan · riwayat (log siapa-kapan-apa).
 * Konfirmasi pakai lembar sendiri di halaman (bukan alert/confirm bawaan). PIN lama tidak pernah tampil; PIN buatan sistem tampil sekali.
 * Data orang lain cuma di memori selama layar terbuka; dibuang lewat lupakan() saat Keluar / ganti akun.
 */
(function () {
  'use strict';
  var API = window.WHL_API;
  var CTX = null, lapisEl = null, layar = 'daftar', D = null, galat = '', memuat = false, urutan = 0, sibukAksi = false;
  var F = { cari: '', status: 'SEMUA', jenis: 'SEMUA', peran: '', divisi: '' };
  var U = null, FORM = null, MODAL = null, LOG = null, LOG_SAYA = null, TCARI = '';
  var IZIN = ['WHL01001', 'WHL01003', 'WHL01010']; /* Fanza, Reza, Rike (revisi 24 Nov); server KU_PENGELOLA yang menentukan */
  var STATUS = { aktif: ['Aktif', 'ok'], belum: ['Belum punya PIN', 'blm'], nonaktif: ['Nonaktif', 'mati'] };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { return CTX && CTX.sesi(); }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function panggil(aksi, data, ms) { var S = sesi(); return API.Pusat.panggil('pusatKelolaUser', [S && S.tokenPusat, aksi, data || {}], ms || 45000); }
  function inisial(n) { return String(n || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join('').toUpperCase(); }
  function namaPeran(k) { var p = D && (D.peran || []).filter(function (x) { return x.k === k; })[0]; return p ? p.n : k; }

  /* ---------- hak (tampilan saja; server tetap menolak orang lain) ---------- */
  function boleh(S) {
    S = S || sesi(); var u = S && S.user, X = API && API.Pusat;
    var k = function (x) { return String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); };
    return !!(u && u.peran !== 'driver' && [S.idProfil, S.idKetik, u.nrp, u.id].some(function (x) { return x && IZIN.indexOf(k(x)) >= 0; }) && X && X.punya && X.punya('pusatKelolaUser'));
  }

  /* ---------- gaya (ikut variabel tema app) ---------- */
  function pasangGaya() {
    if (document.getElementById('kuGaya')) return;
    var st = document.createElement('style'); st.id = 'kuGaya';
    st.textContent = [
      '.kuLapis .ksnKp .sp{flex:1}.kuLapis .ksnKp .kb.segar.putar{animation:kuPutar 1s linear infinite}@keyframes kuPutar{to{transform:rotate(360deg)}}',
      '.kuRk{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}.kuRk button{background:var(--panel);border:1px solid var(--garis);border-radius:14px;padding:8px 4px;text-align:center;color:var(--teks);min-height:58px;box-shadow:var(--bayang)}',
      '.kuRk b{display:block;font-size:20px;font-weight:900;line-height:1.1}.kuRk small{display:block;font-size:11px;font-weight:700;color:var(--redup);margin-top:2px;line-height:1.2}.kuRk button.on{border-color:var(--utama);box-shadow:0 0 0 2px var(--utama) inset}',
      '.kuBaru{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:50px;border-radius:14px;margin:0 0 10px;font-size:15.5px;font-weight:800}',
      '.kuCari input,.kuF select,.kuF textarea,.kuF input{width:100%;box-sizing:border-box;font-size:16px;min-height:46px;padding:11px 14px;border-radius:14px}',
      '.kuCari{margin:2px 0 8px}.kuSeg{display:flex;gap:4px;background:var(--panel2);border-radius:999px;padding:3px;margin-bottom:8px}',
      '.kuSeg button{flex:1;font-size:13px;font-weight:800;padding:8px 6px;border-radius:999px;color:var(--redup);min-height:38px}.kuSeg button.on{background:var(--panel);color:var(--teks);box-shadow:var(--bayang)}',
      '.kuSaring{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px}.kuSaring select{width:100%;min-height:44px;font-size:15px;border-radius:12px;padding:8px 10px}',
      '.kuJml{font-size:12.5px;color:var(--redup);margin:0 2px 8px}',
      '.kuBrs{display:flex;gap:10px;align-items:center;width:100%;text-align:left;background:var(--panel);border:1px solid var(--garis);border-radius:16px;padding:10px 12px;margin-bottom:8px;color:var(--teks);box-shadow:var(--bayang);min-height:64px}',
      '.kuAv{width:42px;height:42px;border-radius:13px;flex:none;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;background:var(--panel2);color:var(--redup)}.kuAv.drv{background:rgba(124,58,237,.14);color:#7c3aed}',
      '.kuBrs .tx{flex:1;min-width:0}.kuBrs .nm{font-size:15px;font-weight:900;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.kuBrs .sb{font-size:12px;color:var(--redup);font-weight:700;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.kuChips{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}.kuC{font-size:11px;font-weight:800;padding:3px 8px;border-radius:999px;background:var(--panel2);color:var(--redup);white-space:nowrap}',
      '.kuC.ok{background:#1fae69;color:#fff}.kuC.blm{background:#f59e0b;color:#1a1a1a}.kuC.mati{background:#dc4c4c;color:#fff}.kuC.pr{background:rgba(21,101,192,.14);color:var(--utama)}.kuC.ung{background:rgba(124,58,237,.14);color:#7c3aed}',
      '.kuKosong{text-align:center;color:var(--redup);padding:30px 12px;font-size:14px;line-height:1.5}',
      '.kuKotak{background:var(--panel);border:1px solid var(--garis);border-radius:16px;padding:12px 14px;margin-bottom:10px;box-shadow:var(--bayang)}',
      '.kuAtas{display:flex;gap:12px;align-items:center}.kuAtas .kuAv{width:58px;height:58px;font-size:20px;border-radius:17px}.kuAtas h1{font-size:19px;font-weight:900;margin:0;line-height:1.2}.kuAtas .sb{font-size:13px;color:var(--redup);font-weight:700;margin-top:3px}',
      '.kuRow{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid var(--garis);font-size:14px}.kuRow:first-child{border-top:0}.kuRow span{color:var(--redup)}.kuRow b{text-align:right;word-break:break-word}',
      '.kuH2{font-size:12px;text-transform:uppercase;letter-spacing:1.3px;color:var(--redup);margin:16px 4px 8px;font-weight:700}',
      '.kuF label{display:block;font-size:13px;font-weight:800;margin:10px 0 5px}.kuF .ket{font-size:12px;color:var(--redup);margin-top:4px;line-height:1.45}',
      '.kuTgl{display:flex;align-items:center;gap:10px;min-height:48px;font-size:14.5px;font-weight:700}.kuTgl input{width:24px;height:24px;min-height:0;flex:none}',
      '.kuAksi{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}.kuAksi button{min-height:48px;border-radius:14px;font-size:14px;font-weight:800;border:1px solid var(--garis);background:var(--panel);color:var(--teks)}',
      '.kuAksi button.bahaya{color:#dc4c4c;border-color:rgba(220,76,76,.45)}.kuAksi button.hijau{color:var(--tHijau);border-color:rgba(31,174,105,.45)}.kuAksi button[disabled]{opacity:.45}',
      '.kuInfo{font-size:12.5px;line-height:1.5;border-radius:14px;padding:10px 12px;margin-bottom:10px;background:rgba(21,101,192,.09);border:1px solid rgba(21,101,192,.25)}.kuInfo.kng{background:rgba(245,158,11,.11);border-color:rgba(245,158,11,.4)}.kuInfo.mrh{background:rgba(220,76,76,.09);border-color:rgba(220,76,76,.35)}',
      '.kuPilih{display:block;width:100%;text-align:left;border:1px solid var(--garis);background:var(--panel);border-radius:14px;padding:11px 12px;margin-bottom:8px;color:var(--teks);min-height:56px}.kuPilih.on{border-color:var(--utama);box-shadow:0 0 0 2px var(--utama) inset}.kuPilih b{display:block;font-size:14.5px}.kuPilih small{display:block;font-size:12px;color:var(--redup);margin-top:2px;line-height:1.4}',
      '.kuLog{font-size:13px;padding:9px 0;border-top:1px solid var(--garis);line-height:1.45}.kuLog:first-child{border-top:0}.kuLog small{display:block;color:var(--redup);font-weight:700;font-size:11.5px}',
      '.kuModal{position:absolute;inset:0;z-index:5;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}.kuModal .kt{background:var(--bg);width:100%;max-width:560px;border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.3);max-height:88%;overflow-y:auto}',
      '.kuModal h3{margin:0 0 8px;font-size:18px;font-weight:900}.kuModal p{margin:0 0 10px;font-size:14px;line-height:1.5}.kuModal .tb{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.kuModal .tb button{min-height:50px;border-radius:14px;font-size:15px;font-weight:800}',
      '.kuModal .tb .batal{background:var(--panel2);color:var(--teks)}.kuModal .tb .ya{background:var(--utama);color:#fff}.kuModal .tb .ya.bahaya{background:#dc4c4c}',
      '.kuPin{font-size:44px;font-weight:900;letter-spacing:14px;text-align:center;padding:14px 0 10px;font-variant-numeric:tabular-nums}',
      '@media (min-width:1200px) and (hover:hover){.kuModal{align-items:center}.kuModal .kt{border-radius:22px}}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- lapis ---------- */
  function lapis() {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      pasangGaya();
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis kuLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik); lapisEl.addEventListener('input', ketik); lapisEl.addEventListener('change', ubah);
    }
    var gulir = lapisEl.querySelector('.ksnIsi'), y = gulir ? gulir.scrollTop : 0;
    var J = { daftar: ['Khusus pengelola akun', 'Kelola user'], detail: ['Kelola user', U ? U.nama : 'Detail'], tambah: ['Kelola user', 'Tambah user'],
      buat: ['Tambah user', FORM && FORM.u ? FORM.u.nama : 'Akun baru'], riwayat: ['Kelola user', 'Riwayat perubahan'] }[layar] || ['Kelola user', ''];
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-l="kembali" aria-label="Kembali">‹</button><div class="nm">' + esc(J[0]) + '<b>' + esc(J[1]) + '</b></div><span class="sp"></span>'
      + (layar === 'daftar' ? '<button type="button" class="kb segar' + (memuat ? ' putar' : '') + '" data-l="segar" aria-label="Muat ulang">⟳</button>' : '') + '</div>'
      + '<div class="ksnIsi">' + (layar === 'daftar' ? isiDaftar() : layar === 'detail' ? isiDetail() : layar === 'tambah' ? isiTambah() : layar === 'buat' ? isiBuat() : isiRiwayat()) + '</div>'
      + (MODAL ? htmlModal() : '');
    var g2 = lapisEl.querySelector('.ksnIsi'); if (g2) g2.scrollTop = y;
  }
  function tutup() { if (!lapisEl) return; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); U = null; FORM = null; MODAL = null; LOG = null; LOG_SAYA = null; if (CTX && CTX.perbarui) CTX.perbarui(); }
  function kembali() {
    if (!lapisEl) return false;
    if (MODAL) { if (!sibukAksi) { MODAL = null; lapis(); } return true; }
    if (layar === 'buat') { layar = 'tambah'; FORM = null; lapis(); return true; }
    if (layar === 'detail' || layar === 'tambah' || layar === 'riwayat') { layar = 'daftar'; U = null; LOG_SAYA = null; lapis(); return true; }
    tutup(); return true;
  }

  /* ---------- buka & muat ---------- */
  function buka(ctx) {
    CTX = ctx || CTX;
    if (!boleh()) { roti('Kelola user khusus Pak Fanza, Reza & Rike.'); return; }
    layar = 'daftar'; lapis(); muat(false);
  }
  function muat(paksa) {
    var saya = ++urutan; memuat = true; galat = ''; if (lapisEl) lapis();
    return panggil('daftar', { paksa: !!paksa }, 60000).then(function (h) {
      if (saya !== urutan) return; memuat = false;
      if (!h || !h.ok) { galat = (h && h.pesan) || 'Daftar user belum bisa dimuat.'; if (h && h.login === false && CTX && CTX.sesiHabis) CTX.sesiHabis(); }
      else { D = h; if (U) U = cariRef(U.ref) || U; }
      if (lapisEl) lapis();
    }).catch(function (e) { if (saya !== urutan) return; memuat = false; galat = (e && e.message) || 'Sinyal putus. Coba lagi.'; if (lapisEl) lapis(); });
  }
  function cariRef(ref) { return D && (D.users || []).filter(function (x) { return x.ref === ref; })[0] || null; }
  function ganti(baru) { if (!D || !baru) return; D.users = D.users.map(function (x) { return x.ref === baru.ref ? baru : x; }); hitungUlang(); if (U && U.ref === baru.ref) U = baru; }
  function hitungUlang() { var R = { total: 0, aktif: 0, belum: 0, nonaktif: 0, driver: 0, staf: 0 }; D.users.forEach(function (x) { R.total++; R[x.status]++; R[x.jenis === 'DRIVER' ? 'driver' : 'staf']++; }); D.ringkas = R; }

  /* ---------- DAFTAR ---------- */
  function cocok(p, f) {
    f = f || F;
    if (f.status !== 'SEMUA' && p.status !== f.status) return false;
    if (f.jenis !== 'SEMUA' && p.jenis !== f.jenis) return false;
    if (f.peran && p.peran !== f.peran) return false;
    if (f.divisi && p.divisi !== f.divisi) return false;
    var q = String(f.cari || '').trim().toUpperCase(); if (!q) return true;
    return q.split(/\s+/).every(function (w) { return [p.nama, p.jabatan, p.idSamar, namaPeran(p.peran), p.divisi].join(' ').toUpperCase().indexOf(w) >= 0; });
  }
  function chipStatus(p) { var s = STATUS[p.status] || [p.status, '']; return '<span class="kuC ' + s[1] + '">' + esc(s[0]) + '</span>'; }
  function baris(p, aksi) {
    return '<button type="button" class="kuBrs" data-l="' + (aksi || 'orang') + ':' + esc(p.ref) + '"><span class="kuAv' + (p.jenis === 'DRIVER' ? ' drv' : '') + '">' + esc(inisial(p.nama)) + '</span>'
      + '<span class="tx"><span class="nm">' + esc(p.nama) + (p.saya ? ' (kamu)' : '') + '</span><span class="sb">' + esc(p.jabatan || '-') + ' · ' + esc(p.idSamar) + '</span>'
      + '<span class="kuChips">' + chipStatus(p) + '<span class="kuC pr">' + esc(namaPeran(p.peran)) + '</span><span class="kuC">' + esc(p.divisi) + '</span>'
      + (p.pinSementara ? '<span class="kuC blm">PIN dari admin</span>' : '') + (p.pengelola ? '<span class="kuC ung">Pengelola</span>' : '') + '</span>'
      + '<span class="sb">' + (p.terakhir ? 'Terakhir: ' + esc(p.terakhir) + ' (' + esc(p.terakhirJenis) + ')' : 'Terakhir masuk: belum tercatat') + '</span></span></button>';
  }
  function daftarHtml() {
    var L = (D.users || []).filter(function (p) { return cocok(p); });
    return '<div class="kuJml">' + L.length + ' dari ' + D.users.length + ' orang</div>'
      + (L.length ? L.slice(0, 300).map(function (p) { return baris(p); }).join('') + (L.length > 300 ? '<div class="kuKosong">Ketik nama untuk mempersempit (tampil 300 pertama).</div>' : '') : '<div class="kuKosong">Tidak ada yang cocok dengan saringan ini.</div>');
  }
  function isiDaftar() {
    if (!D) return galat ? '<div class="kuInfo mrh">' + esc(galat) + '</div><button type="button" class="tUtama" data-l="segar">Coba lagi</button>' : '<div class="kuKosong">Memuat daftar user…</div>';
    var R = D.ringkas || {}, rk = function (st, ang, lb) { return '<button type="button" data-l="status:' + st + '" class="' + (F.status === st ? 'on' : '') + '"><b>' + (ang || 0) + '</b><small>' + lb + '</small></button>'; };
    var peranAda = {}, divAda = {}; D.users.forEach(function (x) { peranAda[x.peran] = 1; divAda[x.divisi] = 1; });
    return (galat ? '<div class="kuInfo mrh">' + esc(galat) + '</div>' : '') + (D.sumberGagal ? '<div class="kuInfo kng">' + esc(D.sumberGagal) + '</div>' : '')
      + '<div class="kuRk">' + rk('SEMUA', R.total, 'Semua') + rk('aktif', R.aktif, 'Aktif') + rk('belum', R.belum, 'Belum PIN') + rk('nonaktif', R.nonaktif, 'Nonaktif') + '</div>'
      + '<button type="button" class="tUtama kuBaru" data-l="tambah">➕ Tambah user</button>'
      + '<div class="kuCari"><input type="search" class="isian" id="kuCari" placeholder="Cari nama / jabatan" value="' + esc(F.cari) + '" autocomplete="off" enterkeyhint="search"></div>'
      + '<div class="kuSeg">' + ['SEMUA', 'STAF', 'DRIVER'].map(function (j) { return '<button type="button" data-l="jenis:' + j + '" class="' + (F.jenis === j ? 'on' : '') + '">' + (j === 'SEMUA' ? 'Semua' : j === 'STAF' ? 'Staf' : 'Driver') + '</button>'; }).join('') + '</div>'
      + '<div class="kuSaring"><select class="isian" id="kuSarPeran" aria-label="Saring peran"><option value="">Semua peran</option>' + (D.peran || []).filter(function (p) { return peranAda[p.k]; }).map(function (p) { return '<option value="' + esc(p.k) + '"' + (F.peran === p.k ? ' selected' : '') + '>' + esc(p.n) + '</option>'; }).join('') + '</select>'
      + '<select class="isian" id="kuSarDiv" aria-label="Saring divisi"><option value="">Semua divisi</option>' + (D.divisi || []).filter(function (d) { return divAda[d]; }).map(function (d) { return '<option' + (F.divisi === d ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') + '</select></div>'
      + '<div id="kuList">' + daftarHtml() + '</div>'
      + '<button type="button" class="kuPilih" data-l="riwayat"><b>🕘 Riwayat perubahan</b><small>Siapa mengubah akun siapa, kapan, apa</small></button>'
      + (D.wajibAktivasi ? '' : '<div class="kuInfo">Orang yang ada di data karyawan bisa membuat PIN sendiri saat pertama masuk. Supaya tidak didahului orang lain, pakai <b>PIN dibuat sistem</b> untuk akun baru.</div>');
  }

  /* ---------- DETAIL ---------- */
  function opsiPeran(pilih, ikut) {
    return '<option value=""' + (!pilih ? ' selected' : '') + '>Ikut jabatan (' + esc(namaPeran(ikut)) + ')</option>' + (D.peran || []).map(function (p) { return '<option value="' + esc(p.k) + '"' + (pilih === p.k ? ' selected' : '') + '>' + esc(p.n) + '</option>'; }).join('');
  }
  function opsiDivisi(pilih) { return '<option value=""' + (!pilih ? ' selected' : '') + '>Ikut jabatan</option>' + (D.divisi || []).map(function (d) { return '<option' + (pilih === d ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join(''); }
  function ketPeran(k) { var p = (D.peran || []).filter(function (x) { return x.k === k; })[0]; return p ? p.ket : ''; }
  function htmlNota(u, nilai) {
    if (!u.nota) return '';
    var dis = u.nota.viaPeran || u.nota.tetap;
    return '<label class="kuTgl"><input type="checkbox" id="kuNota"' + ((dis ? u.nota.boleh : nilai) ? ' checked' : '') + (dis ? ' disabled' : '') + '> Boleh ajukan Nota bengkel</label>'
      + (dis ? '<div class="ket">' + (u.nota.tetap ? 'Selalu boleh (ditetapkan di server).' : 'Sudah boleh karena perannya.') + '</div>' : '');
  }
  function isiDetail() {
    var u = U; if (!u) return '<div class="kuKosong">Pilih orang dari daftar.</div>';
    var kunci = u.saya || u.pengelola, pin = u.status === 'belum' ? 'Belum punya PIN' : u.pinSementara ? 'PIN dari admin (' + esc(u.pinOleh) + '), belum diganti orangnya' : 'Sudah dibuat sendiri' + (u.pinDibuat ? ' · ' + esc(u.pinDibuat) : '');
    var h = '<div class="kuKotak"><div class="kuAtas"><span class="kuAv' + (u.jenis === 'DRIVER' ? ' drv' : '') + '">' + esc(inisial(u.nama)) + '</span><div><h1>' + esc(u.nama) + '</h1><div class="sb">' + esc(u.jabatan || '-') + ' · ' + esc(u.idSamar) + '</div><div class="kuChips">' + chipStatus(u) + '<span class="kuC pr">' + esc(namaPeran(u.peran)) + '</span></div></div></div></div>'
      + (u.status === 'nonaktif' && u.nonaktif ? '<div class="kuInfo mrh"><b>Nonaktif</b>' + (u.nonaktif.alasan ? ': ' + esc(u.nonaktif.alasan) : '') + (u.nonaktif.oleh ? '<br>oleh ' + esc(u.nonaktif.oleh) + ' · ' + esc(u.nonaktif.waktu) : '') + '<br>Tidak bisa masuk app / Pusat WHL sampai diaktifkan lagi.</div>' : '')
      + '<div class="kuKotak"><div class="kuRow"><span>PIN</span><b>' + pin + '</b></div><div class="kuRow"><span>Terakhir</span><b>' + (u.terakhir ? esc(u.terakhir) + ' (' + esc(u.terakhirJenis) + ')' : 'Belum tercatat') + '</b></div>'
      + '<div class="kuRow"><span>Divisi</span><b>' + esc(u.divisi) + (u.divisiDiatur ? ' (diatur)' : '') + '</b></div><div class="kuRow"><span>Jenis</span><b>' + esc(u.jenis === 'DRIVER' ? 'Driver' : 'Staf') + '</b></div>' + (u.dibuat ? '<div class="kuRow"><span>Akun dibuat</span><b>' + esc(u.dibuat) + '</b></div>' : '') + '</div>';
    if (u.saya) h += '<div class="kuInfo">Ini akun kamu sendiri. Ganti PIN lewat menu <b>Akun &gt; Ganti PIN</b>.</div>';
    else if (u.pengelola) h += '<div class="kuInfo">Akun pengelola lain: peran & status tidak bisa diubah dari sini (supaya tidak saling mengunci). Reset PIN tetap bisa.</div>';
    if (!kunci) {
      var pr = u.peranDiatur ? u.peran : '', dv = u.divisiDiatur ? u.divisi : '';
      h += '<div class="kuH2">Peran & akses</div><div class="kuKotak kuF"><label for="kuPeran">Peran</label><select class="isian" id="kuPeran">' + opsiPeran(pr, u.peranJabatan) + '</select><div class="ket" id="kuKetPeran">' + esc(ketPeran(pr || u.peranJabatan)) + '</div>'
        + '<label for="kuDivisi">Divisi</label><select class="isian" id="kuDivisi">' + opsiDivisi(dv) + '</select>' + htmlNota(u, u.nota && u.nota.boleh)
        + '<button type="button" class="tUtama" style="margin-top:12px" data-l="simpan">Simpan perubahan</button></div>';
    }
    if (!u.saya) {
      h += '<div class="kuH2">Akun</div><div class="kuAksi"><button type="button" data-l="resetPin">🔑 Reset PIN</button>'
        + (u.pengelola ? '' : u.status === 'nonaktif' ? '<button type="button" class="hijau" data-l="aktifkan">✅ Aktifkan lagi</button>' : '<button type="button" class="bahaya" data-l="nonaktif">⛔ Nonaktifkan</button>') + '</div>';
    }
    h += '<div class="kuH2">Riwayat orang ini</div><div class="kuKotak">' + (LOG_SAYA ? (LOG_SAYA.length ? LOG_SAYA.map(htmlLog).join('') : '<div class="kuKosong" style="padding:12px">Belum ada perubahan lewat Kelola user.</div>') : '<div class="kuKosong" style="padding:12px">Memuat…</div>') + '</div>';
    return h;
  }
  function htmlLog(x) { return '<div class="kuLog"><small>' + esc(x.w) + ' · ' + esc(x.o) + '</small><b>' + esc(labelAksi(x.a)) + '</b> ' + esc(x.t || '') + (x.x ? ' — ' + esc(x.x) : '') + '</div>'; }
  function labelAksi(a) { return { ubah: 'Ubah', buatAkun: 'Akun baru', resetPin: 'Reset PIN', nonaktif: 'Nonaktifkan', aktifkan: 'Aktifkan' }[a] || a; }
  function bukaOrang(ref) {
    U = cariRef(ref); if (!U) return; layar = 'detail'; LOG_SAYA = null; lapis();
    var r0 = U.ref;
    panggil('riwayat', { ref: r0 }, 30000).then(function (h) { if (U && U.ref === r0 && h && h.ok) { LOG_SAYA = h.log || []; if (lapisEl && layar === 'detail') lapis(); } }).catch(function () { LOG_SAYA = []; if (lapisEl && layar === 'detail') lapis(); });
  }

  /* ---------- TAMBAH (orang dari data karyawan yang belum punya akun) ---------- */
  function calon() { return (D && D.users || []).filter(function (p) { return p.status === 'belum' && !p.saya; }); }
  function isiTambah() {
    if (!D) return '<div class="kuKosong">Memuat…</div>';
    var C = calon(), q = TCARI.trim().toUpperCase(), L = C.filter(function (p) { return !q || [p.nama, p.jabatan].join(' ').toUpperCase().indexOf(q) >= 0; });
    var adaKaryawan = window.WHL_KARYAWAN && window.WHL_KARYAWAN.boleh && window.WHL_KARYAWAN.boleh(sesi());
    return '<div class="kuInfo">Pilih orang dari <b>data karyawan</b> (KARTU DRIVER, daftar staf, karyawan baru) yang <b>belum punya akun</b>. Nama tidak diketik bebas.</div>'
      + '<div class="kuCari"><input type="search" class="isian" id="kuTCari" placeholder="Cari nama / jabatan" value="' + esc(TCARI) + '" autocomplete="off"></div>'
      + '<div id="kuTList">' + tambahList(L, C.length) + '</div>'
      + '<div class="kuInfo kng">Orangnya belum ada di daftar? Tambahkan dulu lewat menu <b>Data karyawan</b> (karyawan baru), lalu kembali ke sini.' + (adaKaryawan ? '<br><button type="button" class="tUtama" style="margin-top:8px" data-l="keKaryawan">Buka Data karyawan</button>' : '') + '</div>';
  }
  function tambahList(L, n) { return '<div class="kuJml">' + L.length + ' dari ' + n + ' orang belum punya akun</div>' + (L.length ? L.slice(0, 200).map(function (p) { return baris(p, 'pilihBaru'); }).join('') : '<div class="kuKosong">Tidak ada.</div>'); }
  function isiBuat() {
    var f = FORM, u = f && f.u; if (!u) return '';
    return '<div class="kuKotak"><div class="kuAtas"><span class="kuAv' + (u.jenis === 'DRIVER' ? ' drv' : '') + '">' + esc(inisial(u.nama)) + '</span><div><h1>' + esc(u.nama) + '</h1><div class="sb">' + esc(u.jabatan || '-') + ' · ' + esc(u.idSamar) + '</div></div></div></div>'
      + '<div class="kuKotak kuF"><label for="kuPeran">Peran</label><select class="isian" id="kuPeran">' + opsiPeran(f.peran, u.peranJabatan) + '</select><div class="ket" id="kuKetPeran">' + esc(ketPeran(f.peran || u.peranJabatan)) + '</div>'
      + '<label for="kuDivisi">Divisi</label><select class="isian" id="kuDivisi">' + opsiDivisi(f.divisi) + '</select>' + htmlNota(u, f.nota) + '</div>'
      + '<div class="kuH2">PIN pertama</div>'
      + '<button type="button" class="kuPilih' + (f.cara === 'sistem' ? ' on' : '') + '" data-l="cara:sistem"><b>🔐 PIN dibuat sistem (disarankan)</b><small>4 angka acak tampil sekali di layar ini. Sampaikan langsung ke orangnya, minta dia ganti di Akun &gt; Ganti PIN.</small></button>'
      + '<button type="button" class="kuPilih' + (f.cara === 'sendiri' ? ' on' : '') + '" data-l="cara:sendiri"><b>✍️ Orangnya buat PIN sendiri</b><small>Saat pertama masuk dengan nomor ID card. Siapa pun yang tahu nomornya bisa membuat PIN duluan, jadi minta orangnya segera masuk.</small></button>'
      + '<button type="button" class="tUtama" style="margin-top:6px" data-l="buatAkun">Buat akun</button>';
  }

  /* ---------- RIWAYAT ---------- */
  function isiRiwayat() {
    if (!LOG) return '<div class="kuKosong">Memuat…</div>';
    return '<div class="kuKotak">' + (LOG.length ? LOG.map(htmlLog).join('') : '<div class="kuKosong">Belum ada perubahan lewat Kelola user.</div>') + '</div><div class="kecil" style="text-align:center;color:var(--redup)">40 catatan terakhir. Arsip lengkap di tab LOG KELOLA USER (DATA KARYAWAN WHL).</div>';
  }
  function bukaRiwayat() { layar = 'riwayat'; LOG = null; lapis(); panggil('riwayat', {}, 30000).then(function (h) { LOG = h && h.ok ? h.log || [] : []; if (!h || !h.ok) roti((h && h.pesan) || 'Riwayat belum bisa dimuat.'); if (lapisEl && layar === 'riwayat') lapis(); }).catch(function (e) { LOG = []; roti(e.message || 'Sinyal putus.'); if (lapisEl) lapis(); }); }

  /* ---------- MODAL konfirmasi (pengganti confirm/prompt bawaan) ---------- */
  function htmlModal() {
    var m = MODAL;
    if (m.pin) return '<div class="kuModal"><div class="kt" role="dialog" aria-modal="true"><h3>PIN baru ' + esc(m.nama) + '</h3><p>Sampaikan langsung ke orangnya (jangan lewat grup). PIN ini <b>tidak bisa dilihat lagi</b> sesudah ditutup.</p><div class="kuPin">' + esc(m.pin) + '</div><p class="kecil">Minta dia masuk lalu ganti di Akun &gt; Ganti PIN. Daftar akan menandai "PIN dari admin" sampai diganti.</p><div class="tb"><button type="button" class="batal" data-l="salinPin">Salin</button><button type="button" class="ya" data-l="tutupModal">Sudah dicatat</button></div></div></div>';
    return '<div class="kuModal" data-l="latarModal"><div class="kt" role="dialog" aria-modal="true"><h3>' + esc(m.judul) + '</h3><p>' + m.isi + '</p>' + (m.alasan ? '<div class="kuF"><label for="kuAlasan">Alasan (wajib)</label><textarea class="isian" id="kuAlasan" rows="2" maxlength="120" placeholder="mis. KELUAR / PINDAH SITE / CUTI PANJANG"></textarea></div>' : '')
      + (m.pilihan ? m.pilihan.map(function (p) { return '<button type="button" class="kuPilih' + (m.pilih === p[0] ? ' on' : '') + '" data-l="mPilih:' + p[0] + '"><b>' + esc(p[1]) + '</b><small>' + esc(p[2]) + '</small></button>'; }).join('') : '')
      + '<div class="tb"><button type="button" class="batal" data-l="tutupModal"' + (sibukAksi ? ' disabled' : '') + '>Batal</button><button type="button" class="ya' + (m.bahaya ? ' bahaya' : '') + '" data-l="yaModal"' + (sibukAksi ? ' disabled' : '') + '>' + (sibukAksi ? 'Menyimpan…' : esc(m.tombol || 'Ya')) + '</button></div></div></div>';
  }
  function tanya(m) { MODAL = m; lapis(); }

  /* ---------- aksi ke server ---------- */
  function kirim(aksi, data, ok) {
    if (sibukAksi) return; sibukAksi = true; if (lapisEl) lapis();
    panggil(aksi, data, 45000).then(function (h) {
      sibukAksi = false;
      if (!h || !h.ok) { MODAL = null; roti((h && h.pesan) || 'Gagal disimpan.'); if (h && h.login === false && CTX && CTX.sesiHabis) { CTX.sesiHabis(); return; } if (h && h.muatUlang) muat(true); if (lapisEl) lapis(); return; }
      if (h.user) ganti(h.user);
      MODAL = null; ok(h); if (lapisEl) lapis();
      if (U && layar === 'detail') bukaOrang(U.ref);
    }).catch(function (e) { sibukAksi = false; MODAL = null; roti((e && e.message) || 'Sinyal putus. Belum tersimpan, coba lagi.'); if (lapisEl) lapis(); });
  }
  function nilaiForm() {
    var q = function (id) { return lapisEl && lapisEl.querySelector('#' + id); }, n = q('kuNota');
    return { peran: q('kuPeran') ? q('kuPeran').value : '', divisi: q('kuDivisi') ? q('kuDivisi').value : '', nota: n && !n.disabled ? !!n.checked : null };
  }
  function simpan() {
    var u = U, v = nilaiForm(), beda = [];
    var prLama = u.peranDiatur ? u.peran : '', dvLama = u.divisiDiatur ? u.divisi : '';
    if (v.peran !== prLama) beda.push('Peran: <b>' + esc(namaPeran(prLama || u.peranJabatan)) + '</b> → <b>' + esc(v.peran ? namaPeran(v.peran) : 'ikut jabatan (' + namaPeran(u.peranJabatan) + ')') + '</b>');
    if (v.divisi !== dvLama) beda.push('Divisi: <b>' + esc(u.divisi) + '</b> → <b>' + esc(v.divisi || 'ikut jabatan') + '</b>');
    if (v.nota !== null && u.nota && v.nota !== u.nota.boleh) beda.push('Nota bengkel: <b>' + (v.nota ? 'diizinkan' : 'dicabut') + '</b>');
    if (!beda.length) { roti('Tidak ada yang berubah.'); return; }
    var data = { ref: u.ref }; if (v.peran !== prLama) data.peran = v.peran; if (v.divisi !== dvLama) data.divisi = v.divisi; if (v.nota !== null) data.nota = v.nota;
    var kuat = v.peran === 'pimpinan' || v.peran === 'penuh';
    tanya({ judul: 'Simpan perubahan ' + u.nama + '?', isi: beda.join('<br>') + (kuat ? '<br><br>⚠️ Peran ini bisa melihat semua data termasuk angka uang.' : '') + '<br><br>Berlaku saat app orangnya dibuka lagi (≤ 5 menit).', tombol: 'Simpan', bahaya: kuat,
      jalan: function () { kirim('ubah', data, function (h) { roti(h.sama ? 'Tidak ada yang berubah.' : 'Tersimpan.'); }); } });
  }
  function resetPin() {
    var u = U;
    tanya({ judul: 'Reset PIN ' + u.nama + '?', isi: 'PIN lama tidak ditampilkan dan langsung tidak berlaku. Semua HP yang sedang masuk dengan akun ini akan keluar. Hitungan salah PIN juga dibuka.', tombol: 'Reset PIN', bahaya: true, pilih: 'sistem',
      pilihan: [['sistem', '🔐 PIN baru dibuat sistem', 'Tampil sekali di layar ini untuk disampaikan ke orangnya.'], ['sendiri', '✍️ Orangnya buat PIN sendiri', 'Saat masuk berikutnya dengan nomor ID card.']],
      jalan: function () { var cara = MODAL.pilih; kirim('resetPin', { ref: u.ref, cara: cara }, function (h) { if (h.pin) { MODAL = { pin: h.pin, nama: u.nama }; } else roti('PIN dikosongkan. Minta orangnya masuk & buat PIN baru.'); }); } });
  }
  function nonaktif() {
    var u = U;
    tanya({ judul: 'Nonaktifkan ' + u.nama + '?', isi: 'Orangnya tidak bisa masuk App WHL / Pusat WHL, sesi di semua HP-nya langsung keluar. Data tidak dihapus dan akun bisa diaktifkan lagi kapan saja.', alasan: true, tombol: 'Nonaktifkan', bahaya: true,
      jalan: function () { var t = lapisEl.querySelector('#kuAlasan'), al = t ? t.value.trim() : ''; if (al.length < 3) { roti('Tulis alasan dulu (min. 3 huruf).'); return false; } kirim('nonaktif', { ref: u.ref, alasan: al.toUpperCase() }, function () { roti('Akun dinonaktifkan.'); }); } });
  }
  function aktifkan() {
    var u = U;
    tanya({ judul: 'Aktifkan lagi ' + u.nama + '?', isi: 'Orangnya bisa masuk lagi dengan PIN lamanya (kalau sudah punya). Kalau lupa PIN, pakai Reset PIN.', tombol: 'Aktifkan',
      jalan: function () { kirim('aktifkan', { ref: u.ref }, function () { roti('Akun aktif lagi.'); }); } });
  }
  function pilihBaru(ref) { var u = cariRef(ref); if (!u) return; FORM = { u: u, peran: '', divisi: '', nota: !!(u.nota && u.nota.boleh), cara: 'sistem' }; layar = 'buat'; lapis(); }
  function buatAkun() {
    var f = FORM, u = f.u, v = nilaiForm(); f.peran = v.peran; f.divisi = v.divisi; if (v.nota !== null) f.nota = v.nota;
    var data = { ref: u.ref, peran: f.peran, divisi: f.divisi, cara: f.cara }; if (v.nota !== null) data.nota = v.nota;
    var kuat = f.peran === 'pimpinan' || f.peran === 'penuh';
    tanya({ judul: 'Buat akun ' + u.nama + '?', isi: 'Peran: <b>' + esc(f.peran ? namaPeran(f.peran) : 'ikut jabatan (' + namaPeran(u.peranJabatan) + ')') + '</b><br>Divisi: <b>' + esc(f.divisi || 'ikut jabatan') + '</b><br>PIN: <b>' + (f.cara === 'sistem' ? 'dibuat sistem, tampil sekali' : 'dibuat orangnya sendiri') + '</b>' + (kuat ? '<br><br>⚠️ Peran ini bisa melihat semua data termasuk angka uang.' : ''), tombol: 'Buat akun', bahaya: kuat,
      jalan: function () { kirim('buatAkun', data, function (h) { var nm = u.nama; FORM = null; U = cariRef(u.ref); layar = U ? 'detail' : 'daftar'; if (h.pin) MODAL = { pin: h.pin, nama: nm }; else roti('Akun dibuat. Minta orangnya masuk & buat PIN.'); }); } });
  }

  /* ---------- event ---------- */
  function klik(ev) {
    var b = ev.target.closest('[data-l]'); if (!b || !lapisEl || !lapisEl.contains(b)) return;
    var d = b.getAttribute('data-l'), i = d.indexOf(':'), n = i < 0 ? d : d.slice(0, i), v = i < 0 ? '' : d.slice(i + 1);
    if (n === 'latarModal') { if (ev.target === b && !sibukAksi && !MODAL.pin) { MODAL = null; lapis(); } return; }
    if (n === 'kembali') { kembali(); return; }
    if (n === 'segar') { muat(true); return; }
    if (n === 'status') { F.status = v; lapis(); return; }
    if (n === 'jenis') { F.jenis = v; lapis(); return; }
    if (n === 'orang') { bukaOrang(v); return; }
    if (n === 'tambah') { TCARI = ''; layar = 'tambah'; lapis(); return; }
    if (n === 'pilihBaru') { pilihBaru(v); return; }
    if (n === 'cara') { if (FORM) { var nv = nilaiForm(); FORM.peran = nv.peran; FORM.divisi = nv.divisi; if (nv.nota !== null) FORM.nota = nv.nota; FORM.cara = v; } lapis(); return; }
    if (n === 'buatAkun') { buatAkun(); return; }
    if (n === 'simpan') { simpan(); return; }
    if (n === 'resetPin') { resetPin(); return; }
    if (n === 'nonaktif') { nonaktif(); return; }
    if (n === 'aktifkan') { aktifkan(); return; }
    if (n === 'riwayat') { bukaRiwayat(); return; }
    if (n === 'keKaryawan') { var c = CTX; tutup(); if (window.WHL_KARYAWAN) window.WHL_KARYAWAN.buka(c, 'baru'); return; }
    if (n === 'mPilih') { if (MODAL) { MODAL.pilih = v; lapis(); } return; }
    if (n === 'tutupModal') { if (!sibukAksi) { MODAL = null; lapis(); } return; }
    if (n === 'yaModal') { if (MODAL && MODAL.jalan && !sibukAksi) MODAL.jalan(); return; }
    if (n === 'salinPin') { var p = MODAL && MODAL.pin; if (p && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(p).then(function () { roti('PIN disalin.'); }, function () { roti('Catat manual: ' + p); }); return; }
  }
  function ketik(ev) {
    var t = ev.target;
    if (t.id === 'kuCari') { F.cari = t.value; var L = lapisEl.querySelector('#kuList'); if (L && D) L.innerHTML = daftarHtml(); return; } /* cuma daftar yang digambar ulang: kolom ketik tidak kehilangan fokus */
    if (t.id === 'kuTCari') { TCARI = t.value; var C = calon(), q = TCARI.trim().toUpperCase(), T = lapisEl.querySelector('#kuTList'); if (T) T.innerHTML = tambahList(C.filter(function (p) { return !q || [p.nama, p.jabatan].join(' ').toUpperCase().indexOf(q) >= 0; }), C.length); }
  }
  function ubah(ev) {
    var t = ev.target;
    if (t.id === 'kuSarPeran') { F.peran = t.value; lapis(); return; }
    if (t.id === 'kuSarDiv') { F.divisi = t.value; lapis(); return; }
    if (t.id === 'kuPeran') { var k = lapisEl.querySelector('#kuKetPeran'), u = layar === 'buat' ? FORM && FORM.u : U; if (k && u) k.textContent = ketPeran(t.value || u.peranJabatan); }
  }
  /** Keluar / ganti akun: buang semua data orang lain dari memori. */
  function lupakan() { D = null; U = null; FORM = null; MODAL = null; LOG = null; LOG_SAYA = null; F.cari = ''; TCARI = ''; galat = ''; if (lapisEl) { try { lapisEl.remove(); } catch (e) { /* */ } lapisEl = null; } }

  window.WHL_KU = { boleh: boleh, buka: buka, kembali: kembali, lupakan: lupakan, _uji: { cocok: cocok, F: F, isi: function (d) { D = d; }, daftarHtml: function () { return daftarHtml(); }, isiDetail: function (u) { U = u; return isiDetail(); }, modal: function (m) { MODAL = m; return htmlModal(); } } };
})();
