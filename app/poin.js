/* WHL App — POIN WHL (tahap 6 rancangan Upgrade\app-beranda-poin-16nov §6–§7; server Armand app-tahap36-17nov PusatPoin.gs). Andro tim C, 17 Nov 2026.
 * Gaya "tiket mainan mall": 1 poin = Rp 100 NILAI HADIAH (bukan uang). Tidak bisa dicairkan / ditransfer / dijual. Hangus 6 bulan sejak didapat.
 * Layar: Poin saya (saldo + batas harian + "X poin hangus tgl …" + riwayat + tukar saya + foto serah terima),
 *        Katalog 7 hadiah + ajukan tukar (HANYA Selasa & Jumat; hari lain tombol mati + "berikutnya …"),
 *        ACC tukar (Fanza / Reza / Puput / Rike, salah satu cukup) -> Siap ambil -> Selesai WAJIB foto (📷 Kamera / 🖼️ Galeri),
 *        Rekap tukar admin (saring bulan / status / nama) + Excel dibuat di HP + PDF server (foto tertanam) dibuka di app (WHL_BERKAS.buka).
 * Semua fitur disembunyikan kalau pusatPing belum memuat fungsinya. Server menjawab {aktif:false} = fitur belum dibuka -> menu disembunyikan.
 * Poin dihitung SERVER (POIN_LOG); app cuma menampilkan & mengajukan.
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA, Simpan = API.Simpan;

  /* ---------- ikon 3D tambahan (gaya ilus3d.js, kode dari rancangan.html) — WHL_ILUS dibungkus, ikon lama tidak berubah ---------- */
  var WARNA = { b: ['#7CC0FF', '#1E88E5', '#1257B3'], bt: ['#4F8FE8', '#1650A8', '#0B2F6B'], w: ['#FFFFFF', '#EEF5FF', '#CFE0F7'], y: ['#FFE58A', '#FFC530', '#E99A00'], o: ['#FFB27A', '#FF7A33', '#D9480F'],
    r: ['#FF9A9A', '#F2484D', '#B71C2C'], t: ['#8DF0E4', '#20C3B4', '#0B8A80'], g: ['#7D8AA3', '#4A5872', '#2B3448'], u: ['#C9B8FF', '#7A5CF0', '#4B2FB8'] };
  function defs(u) {
    var h = '<defs>';
    Object.keys(WARNA).forEach(function (k) { var c = WARNA[k]; h += '<linearGradient id="' + u + k + '" x1="0.15" y1="0" x2="0.85" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="0.55" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></linearGradient>'; });
    h += '<radialGradient id="' + u + 'kil" cx="0.3" cy="0.22" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>';
    h += '<filter id="' + u + 'bay" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter>';
    h += '<filter id="' + u + 'jatuh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.4" flood-color="#0B2F6B" flood-opacity=".28"/></filter>';
    return h + '</defs>';
  }
  function kilau(x, y) { return '<path d="M' + x + ' ' + (y - 4) + 'l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z" fill="#fff"/>'; }
  var TIKET = 'M6 24a4 4 0 0 1 4-4h42a4 4 0 0 1 4 4v6a5.5 5.5 0 0 0 0 11v6a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-6a5.5 5.5 0 0 0 0-11z';
  var BC = {
    poin: function (F, K) { return '<g transform="rotate(10 34 30)"><path d="M10 16a4 4 0 0 1 4-4h38a4 4 0 0 1 4 4v5a5 5 0 0 0 0 10v5a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4v-5a5 5 0 0 0 0-10z" fill="' + F('y') + '"/></g>'
      + '<g transform="rotate(-12 32 34)"><path d="' + TIKET + '" fill="' + F('o') + '"/><path d="' + TIKET + '" fill="' + K + '"/>'
      + '<path d="M42 22v28" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-dasharray="3 3"/><path d="M24 26l3 6.2 6.8.9-5 4.7 1.3 6.8-6.1-3.3-6.1 3.3 1.3-6.8-5-4.7 6.8-.9z" fill="#fff"/></g>' + kilau(55, 10); },
    peringkat: function (F, K) { return '<rect x="22" y="26" width="20" height="30" rx="4" fill="' + F('y') + '"/><rect x="22" y="26" width="20" height="30" rx="4" fill="' + K + '"/><rect x="4" y="36" width="18" height="20" rx="4" fill="' + F('b') + '"/><rect x="42" y="42" width="18" height="14" rx="4" fill="' + F('o') + '"/>'
      + '<text x="32" y="46" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="900" font-size="14" fill="#9a5b00">1</text><text x="13" y="51" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="900" font-size="11" fill="#fff">2</text><text x="51" y="53" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="900" font-size="10" fill="#fff">3</text>'
      + '<path d="M22 20l3-11 7 6 7-6 3 11z" fill="' + F('y') + '"/><path d="M22 20l3-11 7 6 7-6 3 11z" fill="' + K + '"/><circle cx="25" cy="8" r="2.4" fill="' + F('r') + '"/><circle cx="39" cy="8" r="2.4" fill="' + F('r') + '"/>' + kilau(54, 26); },
    hadiah: function (F, K) { return '<rect x="8" y="26" width="48" height="30" rx="6" fill="' + F('r') + '"/><rect x="8" y="26" width="48" height="30" rx="6" fill="' + K + '"/><rect x="5" y="18" width="54" height="12" rx="5" fill="' + F('r') + '"/>'
      + '<rect x="28" y="18" width="8" height="38" fill="' + F('y') + '"/><path d="M32 18c-6-12-18-10-14-2 2 3 8 3 14 2zM32 18c6-12 18-10 14-2-2 3-8 3-14 2z" fill="' + F('y') + '"/>' + kilau(52, 10); },
    tukarAcc: function (F, K) { return '<rect x="6" y="24" width="40" height="28" rx="6" fill="' + F('o') + '"/><rect x="6" y="24" width="40" height="28" rx="6" fill="' + K + '"/><rect x="3" y="17" width="46" height="11" rx="5" fill="' + F('o') + '"/>'
      + '<rect x="22" y="17" width="8" height="35" fill="' + F('y') + '"/><path d="M26 17c-5-10-15-8-12-2 2 3 7 3 12 2zM26 17c5-10 15-8 12-2-2 3-7 3-12 2z" fill="' + F('y') + '"/>'
      + '<circle cx="47" cy="45" r="13" fill="' + F('t') + '"/><circle cx="47" cy="45" r="13" fill="' + K + '"/><path d="M41 45l4 4 8-8.5" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>'; },
    rekapTukar: function (F, K) { return '<rect x="8" y="6" width="40" height="52" rx="7" fill="' + F('w') + '"/><rect x="8" y="6" width="40" height="52" rx="7" fill="' + K + '"/><rect x="8" y="6" width="40" height="11" rx="5" fill="' + F('t') + '"/>'
      + '<g stroke="#B9D3F3" stroke-width="2"><path d="M14 25h28M14 33h28M14 41h28M24 20v28M34 20v28"/></g><rect x="15" y="27" width="7" height="4" rx="1" fill="' + F('y') + '"/>'
      + '<g transform="translate(34 32)"><path d="M2 12a4 4 0 0 1 4-4h18a4 4 0 0 1 4 4v3a3 3 0 0 0 0 6v3a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-3a3 3 0 0 0 0-6z" fill="' + F('o') + '"/><path d="M15 12l1.6 3.4 3.6.4-2.7 2.5.7 3.6-3.2-1.8-3.2 1.8.7-3.6-2.7-2.5 3.6-.4z" fill="#fff"/></g>'; },
    pulsa: function (F, K) { return '<rect x="16" y="5" width="30" height="54" rx="8" fill="' + F('bt') + '"/><rect x="19.5" y="11" width="23" height="40" rx="4" fill="' + F('b') + '"/><rect x="16" y="5" width="30" height="54" rx="8" fill="' + K + '"/><g fill="#fff"><rect x="23" y="36" width="4" height="8" rx="1.5"/><rect x="29" y="30" width="4" height="14" rx="1.5"/><rect x="35" y="23" width="4" height="21" rx="1.5"/></g>'; },
    lanyard: function (F, K) { return '<path d="M14 4l18 24 18-24" fill="none" stroke="' + F('b') + '" stroke-width="7" stroke-linejoin="round"/><circle cx="32" cy="29" r="4" fill="' + F('g') + '"/>'
      + '<rect x="15" y="32" width="34" height="28" rx="6" fill="' + F('w') + '"/><rect x="15" y="32" width="34" height="28" rx="6" fill="' + K + '"/><rect x="15" y="32" width="34" height="8" rx="4" fill="' + F('o') + '"/><text x="32" y="38.5" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="900" font-size="6" fill="#fff">KIMPER</text>'
      + '<circle cx="24" cy="49" r="5" fill="' + F('y') + '"/><path d="M32 46h11M32 52h8" stroke="#9CC3F2" stroke-width="2.6" stroke-linecap="round"/>'; },
    paketData: function (F, K) { return '<rect x="16" y="5" width="30" height="54" rx="8" fill="' + F('bt') + '"/><rect x="19.5" y="11" width="23" height="40" rx="4" fill="' + F('t') + '"/><rect x="16" y="5" width="30" height="54" rx="8" fill="' + K + '"/>'
      + '<path d="M24 28a10 10 0 0 1 14 0M27 32a5 5 0 0 1 8 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="31" cy="36" r="2.2" fill="#fff"/><text x="31" y="47" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="900" font-size="8" fill="#fff">5GB</text>'; },
    payung: function (F, K) { return '<path d="M6 32a26 24 0 0 1 52 0q-4.3-4-8.7 0-4.3-4-8.6 0-4.4-4-8.7 0-4.3-4-8.7 0-4.3-4-8.6 0-4.4-4-8.7 0z" fill="' + F('r') + '"/><path d="M6 32a26 24 0 0 1 52 0q-4.3-4-8.7 0-4.3-4-8.6 0-4.4-4-8.7 0-4.3-4-8.7 0-4.3-4-8.6 0-4.4-4-8.7 0z" fill="' + K + '"/>'
      + '<path d="M32 8v2M23 12q4 8 9 20M41 12q-4 8-9 20" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="2"/><path d="M32 30v20a5 5 0 0 1-10 0" fill="none" stroke="' + F('g') + '" stroke-width="4" stroke-linecap="round"/>'; },
    tumbler: function (F, K) { return '<rect x="20" y="4" width="24" height="9" rx="3" fill="' + F('bt') + '"/><path d="M18 12h28l-3 44a5 5 0 0 1-5 4H26a5 5 0 0 1-5-4z" fill="' + F('t') + '"/><path d="M18 12h28l-3 44a5 5 0 0 1-5 4H26a5 5 0 0 1-5-4z" fill="' + K + '"/>'
      + '<rect x="20" y="28" width="24" height="12" fill="#fff" opacity=".9"/><text x="32" y="37.5" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="900" font-size="9" fill="#0B8A80">WHL</text>'; },
    kaos: function (F, K) { return '<path d="M22 8l-16 9 6 12 6-3v30h28V26l6 3 6-12-16-9a10 6 0 0 1-20 0z" fill="' + F('r') + '"/><path d="M22 8l-16 9 6 12 6-3v30h28V26l6 3 6-12-16-9a10 6 0 0 1-20 0z" fill="' + K + '"/><text x="32" y="38" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="900" font-size="10" fill="#fff">WHL</text>'; },
    powerbank: function (F, K) { return '<rect x="14" y="6" width="36" height="52" rx="9" fill="' + F('g') + '"/><rect x="14" y="6" width="36" height="52" rx="9" fill="' + K + '"/><rect x="26" y="2" width="12" height="6" rx="2" fill="' + F('g') + '"/>'
      + '<g fill="' + F('t') + '"><rect x="20" y="40" width="24" height="7" rx="2"/><rect x="20" y="31" width="24" height="7" rx="2"/><rect x="20" y="22" width="24" height="7" rx="2" opacity=".4"/></g><path d="M35 10l-8 11h6l-3 9 9-12h-6l3-8z" fill="' + F('y') + '"/>'; }
  };
  var nIk = 0;
  function ilusC(nama) {
    var u = 'ic' + (++nIk) + '_', F = function (x) { return 'url(#' + u + x + ')'; }, K = 'url(#' + u + 'kil)';
    return '<svg class="ilus ilus3d" viewBox="0 0 64 64" aria-hidden="true">' + defs(u) + '<ellipse cx="32" cy="59" rx="19" ry="3.2" fill="#0B2F6B" opacity=".16" filter="url(#' + u + 'bay)"/><g filter="url(#' + u + 'jatuh)">' + BC[nama](F, K) + '</g></svg>';
  }
  (function () { var asli = window.WHL_ILUS; if (typeof asli !== 'function' || asli._poin) return; var bungkus = function (n) { return BC[n] ? ilusC(n) : asli(n); }; bungkus._poin = true; window.WHL_ILUS = bungkus; })();
  function ILUS(n) { return (window.WHL_ILUS || ilusC)(n); }
  /** ikon hadiah dari nama barang katalog (ID barang ditentukan server/sheet KATALOG) */
  function ikonBarang(nama) { var s = String(nama || '').toLowerCase(); return /pulsa/.test(s) ? 'pulsa' : /lanyard|kimper/.test(s) ? 'lanyard' : /data|kuota|gb/.test(s) ? 'paketData' : /payung/.test(s) ? 'payung' : /tumbler|botol/.test(s) ? 'tumbler' : /kaos|baju/.test(s) ? 'kaos' : /power ?bank/.test(s) ? 'powerbank' : 'hadiah'; }

  /* ---------- alat kecil ---------- */
  var CTX = null;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ang(n) { var v = Number(n); return isFinite(v) ? v.toLocaleString('id-ID') : '–'; }
  function rp(n) { return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID'); }
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function waktu(t) { var m = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/); if (!m) return esc(t || ''); return (+m[3]) + ' ' + BLN[+m[2] - 1] + (m[4] ? ' ' + m[4] + '.' + m[5] : ''); }
  function tglPanjang(ymd) { var m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return esc(ymd || ''); var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return HARI[d.getUTCDay()] + ' ' + (+m[3]) + ' ' + BLN[+m[2] - 1] + ' ' + m[1]; }
  function sesi() { return CTX && CTX.sesi ? CTX.sesi() : null; }
  function punya(fn) { return API.Pusat.asli() && API.Pusat.punya(fn); }
  function akun() { var S = sesi(); return String((S && (S.idProfil || S.idKetik)) || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function panggil(fn, args, ms) { var S = sesi(); if (!S || !S.tokenPusat) return Promise.reject(new Error('Belum masuk.')); return API.Pusat.panggil(fn, [S.tokenPusat].concat(args || []), ms || 30000); }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function habis(h) { if (h && h.login === false) { tutupSemua(); if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return true; } return false; }
  function sekarangWib() { return new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000); }
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  /* Hari tukar SELALU dari server (bukaTukar.hari/label; admin bisa mengubahnya lewat Properti POIN_HARI_TUKAR — kontrak C2 v2).
     LABEL_HARI = label terakhir dari server (disimpan di HP) untuk teks di layar yang tidak membawa bukaTukar. */
  var LABEL_HARI = ''; try { LABEL_HARI = localStorage.getItem('whlPoinHariTukar') || ''; } catch (e) { /* */ }
  function labelHari() { return LABEL_HARI || 'hari tukar'; }
  /** info hari tukar dari server. Server lama tanpa bukaTukar = dianggap buka (server tetap yang menolak). */
  function infoTukar(B) {
    if (B && typeof B.hariIni === 'boolean') {
      if (B.label && B.label !== LABEL_HARI) { LABEL_HARI = B.label; try { localStorage.setItem('whlPoinHariTukar', B.label); } catch (e) { /* */ } }
      return { hariIni: B.hariIni, label: B.label || labelHari(), berikut: B.berikut || '', pesan: B.pesan || '' };
    }
    return { hariIni: true, label: labelHari(), berikut: '', pesan: '' };
  }
  function pesanTutup(I) { return 'Tukar poin dibuka tiap ' + I.label + (I.berikut ? ', berikutnya ' + I.berikut : '') + '.'; }
  var ST = { DIAJUKAN: ['kuning', 'Nunggu ACC'], SIAP_AMBIL: ['biru', 'Siap ambil di kantor WHL'], SELESAI: ['hijau', 'Selesai'], DITOLAK: ['merah', 'Ditolak · poin kembali'], DIBATALKAN: ['abu', 'Dibatalkan · poin kembali'] };
  var EMO = { KUIS: '❓', P2H: '📋', ABSEN: '🕖', RIT: '🚛', KM: '🛣️', HAZARD: '⚠️', NOLINS: '🛡️', PERINGKAT: '🏆', ULTAH: '🎂', TUKAR: '🎁', BALIK: '↩️', CABUT: '✖️',
    /* v3.36 poin karyawan (API-APP.md §5) + kuesioner driver */ S_HADIR: '🗓️', S_HZ_CEK: '⚠️', S_PGW_TUNJUK: '🛠️', S_PGW_P2H: '📋', S_PGW_GANTUNG0: '⏱️', S_MEK_STD: '🔧', S_MEK_SOP: '✅', S_MEK_AWET: '💪', S_HR_IZIN: '📝', S_ADM_ACC: '💳', S_LOG_SELIP0: '📦', S_TANTANGAN: '🏆', S_BULANAN: '🏅', S_PAPAN: '🥇', KSD_ISI: '📝', KSN_NILAI: '⭐', BATAL_KURANG: '↩️' };
  /* v3.36 (Reza 17 Nov malam): pengurang poin NYALA untuk staf & driver. Baris minus di riwayat = merah + alasan (catatan) + tanggal + 'Pengurang final'.
     Pengurang baru ditulis server SESUDAH masa sanggah 48 jam habis (QA Bugi #5), jadi masa sanggah + tombol Sanggah hanya di kartu 'Akan dikurangi' (poin-staf.js).
     Sanggah = lewat orang (izin di Kehadiran / admin); tombol kartu membuka Forum. */
  function bisaSanggah(x, p) {
    if (!(p < 0) || x.sumber === 'TUKAR' || x.sumber === 'CABUT') return '';
    return '<small style="color:var(--tMerah)">Pengurang final (masa sanggah sudah lewat)</small>';
  }
  function sanggah() {
    roti('Tulis sanggahanmu ke admin di Forum: tanggal, jenis pengurang, alasan + bukti (izin/foto).');
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-ke', 'forum'); b.style.display = 'none'; document.body.appendChild(b); try { b.click(); } finally { b.remove(); }
  }
  function lencanaSt(s) { var w = ST[s] || ['abu', s || '-']; return '<em class="pnSt ' + w[0] + '">' + esc(w[1]) + '</em>'; }
  function alur(s) {
    var L = ['Diajukan', 'Nunggu ACC', 'Siap ambil', 'Selesai + foto'], k = s === 'DIAJUKAN' ? 1 : s === 'SIAP_AMBIL' ? 2 : s === 'SELESAI' ? 4 : -1;
    if (k < 0) return '';
    return '<div class="pnAlur">' + L.map(function (x, i) { return '<span class="' + (i < k ? 'on' : i === k ? 'kini' : '') + '">' + x + '</span>'; }).join('') + '</div>';
  }

  function gaya() {
    if (document.getElementById('pnGaya')) return; var st = document.createElement('style'); st.id = 'pnGaya';
    st.textContent = '.pnLapis .ksnIsi{padding-bottom:44px}'
      + '.pnTiket{position:relative;border-radius:20px;padding:16px 18px 14px;color:#3b1d00;background:linear-gradient(135deg,#FFE58A 0%,#FFC530 45%,#FF9A3D 100%);box-shadow:0 8px 22px rgba(233,154,0,.28);overflow:hidden}'
      + '.pnTiket:before,.pnTiket:after{content:"";position:absolute;top:50%;width:22px;height:22px;margin-top:-11px;border-radius:50%;background:var(--bg,#f4f7fb)}.pnTiket:before{left:-11px}.pnTiket:after{right:-11px}'
      + '.pnTiket small{font-weight:800;font-size:12.5px;opacity:.85;display:block}.pnAngka{display:flex;align-items:center;gap:10px;font-family:Nunito,sans-serif;font-weight:900;font-size:44px;line-height:1.05;margin:4px 0 2px}.pnAngka .ilus{width:52px;height:52px;flex:none}'
      + '.pnRp{font-size:12.5px;font-weight:700;opacity:.8}.pnBts{margin-top:10px;font-size:12px;font-weight:800}.pnProg{height:8px;border-radius:99px;background:rgba(59,29,0,.16);margin-top:5px;overflow:hidden}.pnProg i{display:block;height:100%;border-radius:99px;background:#3b1d00;opacity:.7}'
      + '.pnHangus{display:flex;gap:10px;align-items:center;border-radius:16px;padding:11px 13px;margin-top:12px;background:rgba(242,72,77,.12);color:var(--tMerah);font-size:13px;font-weight:700}.pnHangus b{color:var(--tMerah)}.pnHangus span:first-child{font-size:20px}'
      + '.pnAksi{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.pnAksi button{display:flex;align-items:center;gap:8px;justify-content:center;min-height:52px;border-radius:16px;background:var(--panel);box-shadow:0 0 0 1px var(--garis);font-weight:800;font-size:14px;color:var(--teks)}.pnAksi .ilus{width:30px;height:30px}'
      + '.pnChips{display:flex;flex-wrap:wrap;gap:6px}.pnChips span{font-size:11.5px;font-weight:800;padding:5px 9px;border-radius:99px;background:var(--tint);color:var(--utama)}'
      + '.pnJd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}.pnJd b{font-size:14.5px}.pnJd span{font-size:12px;color:var(--redup);font-weight:700}'
      + '.pnBrs{display:flex;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--garis)}.pnBrs:first-of-type{border-top:0}.pnBrs .em{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:var(--panel2);font-size:18px;flex:none}'
      + '.pnBrs .tx{flex:1;min-width:0}.pnBrs .tx b{display:block;font-size:14px}.pnBrs .tx small{display:block;color:var(--redup);font-size:12px;margin-top:1px}.pnNil{font-family:Nunito,sans-serif;font-weight:900;font-size:16px;flex:none}.pnNil.plus{color:#16a34a}.pnNil.min{color:var(--tMerah)}.pnNil.nol{color:var(--redup)}'
      + '.pnSt{display:inline-block;font-style:normal;font-size:11.5px;font-weight:800;padding:3px 9px;border-radius:99px;background:var(--panel2);color:var(--redup);margin-top:5px}.pnSt.hijau{background:rgba(22,163,74,.14);color:#15803d}.pnSt.kuning{background:rgba(255,197,48,.22);color:var(--tKuning)}.pnSt.merah{background:rgba(242,72,77,.14);color:var(--tMerah)}.pnSt.biru{background:var(--tint);color:var(--utama)}'
      + '.pnAlur{display:flex;gap:4px;margin-top:8px}.pnAlur span{flex:1;text-align:center;font-size:10.5px;font-weight:800;padding:5px 2px;border-radius:8px;background:var(--panel2);color:var(--redup)}.pnAlur span.on{background:rgba(22,163,74,.14);color:#15803d}.pnAlur span.kini{background:#FFC530;color:#3b1d00}'
      + '.pnTk{padding:12px 0;border-top:1px solid var(--garis)}.pnTk:first-of-type{border-top:0}.pnTkAtas{display:flex;gap:10px;align-items:center}.pnTkAtas .ilus{width:42px;height:42px;flex:none}.pnTkAtas .tx{flex:1;min-width:0}.pnTkAtas .tx b{display:block;font-size:14.5px}.pnTkAtas .tx small{display:block;color:var(--redup);font-size:12px}'
      + '.pnTb{display:flex;gap:8px;margin-top:10px}.pnTb button{flex:1;min-height:44px;border-radius:12px;font-weight:800;font-size:13.5px;background:var(--panel2);color:var(--teks)}.pnTb button.ok{background:#16a34a;color:#fff}.pnTb button.no{color:var(--tMerah)}.pnTb button.yakin{background:#0f7a36;color:#fff;box-shadow:0 0 0 3px rgba(22,163,74,.35)}.pnTb button:disabled{opacity:.45}'
      + '.pnTb button.biru{background:var(--utama);color:#fff}'
      + '.pnPeringat{border-radius:16px;padding:11px 13px;margin-bottom:12px;background:rgba(255,197,48,.2);color:var(--tKuning);font-weight:700;font-size:13px;line-height:1.45}.pnPeringat.biru{background:var(--tint);color:var(--utama)}.pnPeringat.hijau{background:rgba(22,163,74,.13);color:#15803d}'
      + '.pnKtlg{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pnHd{position:relative;border-radius:18px;padding:12px;background:var(--panel);box-shadow:0 0 0 1px var(--garis);display:flex;flex-direction:column;gap:6px;min-width:0}'
      + '.pnHd .gb{height:78px;border-radius:14px;display:grid;place-items:center;background:var(--tint)}.pnHd .gb .ilus{width:62px;height:62px}.pnHd b{font-size:13.5px;line-height:1.25;min-height:34px}.pnHd .stok{position:absolute;top:8px;right:8px;font-size:10.5px;font-weight:800;padding:2px 7px;border-radius:99px;background:var(--panel);color:var(--redup);box-shadow:0 0 0 1px var(--garis)}'
      + '.pnHd .gb.foto{height:118px;padding:0;overflow:hidden;background:#fff;cursor:zoom-in}.pnHd .gb.foto img{width:100%;height:100%;object-fit:contain;display:block}.pnHd .gb.memuat{background:var(--panel2)}.pnHd .gantiGb{min-height:36px;border-radius:10px;font-weight:800;font-size:12px;background:var(--panel2);color:var(--utama)}' /* poin-gambar-hadiah-20nov */
      + '.pnGbIsi{padding:14px 2px 28px}.pnGbPrev{height:min(56vh,340px);border-radius:16px;background:#fff;box-shadow:0 0 0 1px var(--garis);display:grid;place-items:center;overflow:hidden}.pnGbPrev img{max-width:100%;max-height:100%;object-fit:contain;display:block}.pnGbSt{text-align:center;margin-top:8px;font-size:12.5px;font-weight:800;color:var(--redup)}'
      + '.pnGbTb{display:grid;gap:10px;margin-top:14px}.pnGbTb label,.pnGbTb button{display:flex;align-items:center;justify-content:center;gap:8px;min-height:50px;border-radius:14px;font-weight:800;font-size:14.5px;cursor:pointer}.pnGbTb label{border:2px dashed var(--utama);color:var(--utama)}.pnGbTb label.mati{opacity:.45;pointer-events:none}.pnGbTb .pnGbSimpan{background:var(--utama);color:#fff}.pnGbTb .pnGbLogo{background:var(--panel2);color:var(--teks)}.pnGbTb button:disabled{opacity:.45;cursor:default}.pnGbKet{font-size:12.5px;color:var(--redup);line-height:1.5;margin-top:12px;text-align:center}'
      + '.pnHd .hrg{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px}.pnHd .hrg span{font-family:Nunito,sans-serif;font-weight:900;font-size:18px;white-space:nowrap}.pnHd .hrg span small{font-size:11px;font-weight:800;color:var(--redup);margin-left:2px}'
      + '.pnHd .hrg button{flex:1 0 auto;min-height:36px;padding:0 10px;border-radius:10px;font-weight:800;font-size:12.5px;white-space:nowrap;background:var(--utama);color:#fff}.pnHd .hrg button:disabled{background:var(--panel2);color:var(--redup)}.pnHd small.rp{color:var(--redup);font-size:11px;font-weight:700}'
      + '.pnFoto{display:flex;gap:8px;margin-top:10px}.pnFoto label{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;min-height:46px;border-radius:12px;border:2px dashed var(--garis);font-weight:800;font-size:13px;color:var(--utama);cursor:pointer}'
      + '.pnPrev{position:relative;margin-top:10px}.pnPrev img{width:100%;max-height:220px;object-fit:cover;border-radius:12px;display:block}.pnPrev button{position:absolute;top:6px;right:6px;width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-weight:900}'
      + '.pnIn{width:100%;min-height:44px;border-radius:12px;border:1px solid var(--garis);background:var(--panel);color:var(--teks);padding:8px 12px;font:inherit;font-size:14px;margin-top:8px;box-sizing:border-box}textarea.pnIn{min-height:64px;resize:vertical}'
      + '.pnSaring{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pnSaring select,.pnSaring input{margin-top:0}.pnSaring .lebar{grid-column:1/-1;display:flex;gap:8px}.pnSaring .lebar input{flex:1}.pnSaring .lebar button{min-height:44px;padding:0 14px;border-radius:12px;background:var(--utama);color:#fff;font-weight:800}'
      + '.pnTot{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.pnTot div{border-radius:14px;background:var(--panel2);padding:9px 10px}.pnTot small{display:block;font-size:11px;color:var(--redup);font-weight:700}.pnTot b{font-family:Nunito,sans-serif;font-size:17px;font-weight:900}'
      + '.pnTabel{width:100%;border-collapse:collapse;font-size:12.5px}.pnTabel th,.pnTabel td{padding:6px 4px;border-bottom:1px solid var(--garis);text-align:right}.pnTabel th:first-child,.pnTabel td:first-child{text-align:left}.pnTabel th{color:var(--redup);font-weight:800}'
      + '.pnUnduh{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}.pnUnduh button{min-height:50px;border-radius:14px;font-weight:800;font-size:14px;background:var(--panel);box-shadow:0 0 0 1px var(--garis);color:var(--teks)}'
      + '.pnLihat{position:fixed;inset:0;z-index:10001;background:#0b1220;display:flex;flex-direction:column}.pnLihat .ksnKp{background:#0f1a2e;color:#fff}.pnLihat .isiF{flex:1;display:grid;place-items:center;padding:12px;overflow:auto}.pnLihat img{max-width:100%;max-height:100%;border-radius:10px}.pnLihat .ket{color:#cbd5e1;font-size:12.5px;text-align:center;padding:0 16px 18px}'
      + '.pnBeranda{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border-radius:18px;padding:10px 14px;margin-bottom:12px;color:#3b1d00;background:linear-gradient(120deg,#FFE58A,#FFC530 60%,#FFB04D);box-shadow:0 6px 16px rgba(233,154,0,.22)}'
      + '.pnBeranda .ilus{width:40px;height:40px;flex:none}.pnBeranda .tx{flex:1;min-width:0}.pnBeranda small{display:block;font-size:11.5px;font-weight:800;opacity:.8}.pnBeranda b{font-family:Nunito,sans-serif;font-size:22px;font-weight:900;line-height:1.1}.pnBeranda .go{font-size:12px;font-weight:800;text-align:right;flex:none}.pnBeranda .go em{display:block;font-style:normal;font-size:11px;color:#9a1c1c}'
      + '.pnAccBeranda{display:flex;align-items:center;gap:10px;width:100%;text-align:left;border-radius:16px;padding:10px 13px;margin-bottom:12px;background:var(--tint);color:var(--utama);font-weight:800;font-size:13.5px}.pnAccBeranda .ilus{width:30px;height:30px;flex:none}'
      + 'html[data-tema="gelap"] .pnSt.hijau,html[data-tema="gelap"] .pnAlur span.on,html[data-tema="gelap"] .pnPeringat.hijau{color:#4ade80}html[data-tema="gelap"] .pnNil.plus{color:#4ade80}'
      + '.pnKosong{text-align:center;padding:22px 14px}.pnKosong .ilus{width:72px;height:72px}.pnKosong b{display:block;margin-top:8px;font-size:15px}.pnKosong small{display:block;color:var(--redup);margin-top:4px;line-height:1.45}';
    document.head.appendChild(st);
  }

  /* ---------- data ---------- */
  var P = null, P_JALAN = null, ADM = { acc: null, nunggu: 0, t: 0, jalan: false };
  function aktif() { return !!(P && P.d && P.d.aktif !== false && P.d.ok !== false); }
  /** muat Poin saya (cache 5 mnt di memori, salinan terakhir di HP supaya Beranda langsung tampil) */
  function muat(paksa) {
    if (!sesi() || !punya('pusatPoinSaya')) return Promise.resolve(null);
    if (P_JALAN) return P_JALAN;
    if (P && P.d && !paksa && Date.now() - P.t < 5 * 60000) return Promise.resolve(P.d);
    var awal = P ? Promise.resolve() : Simpan.ambil('whlPoin_' + akun()).then(function (v) { try { var c = JSON.parse(v || 'null'); if (c && !P) { P = { d: c, t: 0 }; perbarui(); } } catch (e) { /* */ } });
    P_JALAN = awal.then(function () { return panggil('pusatPoinSaya', []); }).then(function (h) {
      P_JALAN = null;
      if (habis(h)) return null;
      if (h && (h.ok !== false || h.aktif === false)) { P = { d: h, t: Date.now() }; Simpan.taruh('whlPoin_' + akun(), JSON.stringify({ ok: h.ok, aktif: h.aktif, saldo: h.saldo, hariIni: h.hariIni, batasHarian: h.batasHarian, akanHangus: h.akanHangus, bolehAcc: h.bolehAcc, bolehRekap: h.bolehRekap })); }
      else if (!P) P = { d: null, t: Date.now() };
      perbarui(); cekAdmin(); return P.d;
    }, function (e) { P_JALAN = null; if (P) P.t = Date.now(); throw e; });
    return P_JALAN;
  }
  /** admin tukar? Server baru mengirim bolehAcc di pusatPoinSaya; server lama: coba pusatTukarAntre (ditolak = bukan admin). Driver tidak pernah. */
  function cekAdmin(paksa) {
    var S = sesi(); if (!S || S.user.peran === 'driver' || !punya('pusatTukarAntre') || ADM.jalan) return;
    if (P && P.d && P.d.bolehAcc === false) { ADM.acc = false; return; }
    if (!paksa && ADM.acc === false) return;
    if (!paksa && ADM.acc !== null && Date.now() - ADM.t < 5 * 60000) return;
    ADM.jalan = true;
    panggil('pusatTukarAntre', ['']).then(function (h) {
      ADM.jalan = false; ADM.t = Date.now(); if (habis(h)) return;
      var lama = ADM.acc + '|' + ADM.nunggu;
      if (!h || h.ok === false || h.tolak) ADM.acc = false;
      else if (h.aktif === false) ADM.acc = null;
      else { ADM.acc = true; ADM.nunggu = (h.daftar || []).filter(function (x) { return x.status === 'DIAJUKAN'; }).length; }
      if (lama !== ADM.acc + '|' + ADM.nunggu) perbarui();
    }, function () { ADM.jalan = false; ADM.t = Date.now(); });
  }
  function bolehAcc() { return (P && P.d && P.d.bolehAcc === true) || ADM.acc === true; }
  function bolehRekap() { var S = sesi(); if (!S || !punya('pusatTukarRekap')) return false; if (P && P.d && typeof P.d.bolehRekap === 'boolean') return P.d.bolehRekap; return bolehAcc() || ['pimpinan', 'penuh'].indexOf(S.user.peran) >= 0; }
  function perbarui() { try { if (CTX && CTX.perbarui) CTX.perbarui(); } catch (e) { /* */ } }

  /* ---------- menu & Beranda ---------- */
  /** item menu [ikon, label, aksi, lencana, id] untuk grid Beranda / Lainnya / Atur ikon. */
  function menu(S) {
    var L = []; if (!S || !API.Pusat.asli()) return L;
    if (punya('pusatPoinSaya') && !(P && P.d && P.d.aktif === false)) L.push(['poin', 'Poin WHL', 'poin', 0, 'poin']);
    if (punya('pusatPeringkat') && !(window.WHL_PERINGKAT && window.WHL_PERINGKAT.mati())) L.push(['peringkat', 'Peringkat', 'peringkat', 0, 'peringkat']);
    if (window.WHL_POIN_STAF && window.WHL_POIN_STAF.boleh(S)) L.push(['kuesioner', 'Nilai rekan', 'nilaiRekan', 0, 'nilaiRekan']); /* v3.36 staf: nilai dari staf & dari driver (milik sendiri) */
    if (window.WHL_KSD) window.WHL_KSD.menu(S).forEach(function (x) { L.push(x); }); /* v3.36 driver: kuesioner menilai staf (id ksd) */
    if (bolehAcc() && punya('pusatTukarPutus')) L.push(['tukarAcc', 'ACC tukar poin', 'poinAcc', ADM.nunggu || 0, 'poinAcc']);
    if (bolehRekap()) L.push(['rekapTukar', 'Rekap tukar poin', 'poinRekap', 0, 'poinRekap']);
    return L;
  }
  /** kartu tiket poin di Beranda (semua peran). Kosong kalau server belum punya / fitur belum dibuka. */
  function berandaHtml(ctx) {
    CTX = ctx || CTX; var S = sesi(); if (!S || !punya('pusatPoinSaya')) return '';
    if (!P || Date.now() - P.t > 5 * 60000) muat().catch(function () { });
    if (!aktif()) return '';
    gaya();
    var d = P.d, h = '', ah = d.akanHangus, dekat = ah && ah.tgl && (Date.parse(ah.tgl + 'T00:00:00+07:00') - Date.now()) < 30 * 864e5;
    h += '<button type="button" class="pnBeranda" data-ke="poin" data-fitur="poin" aria-label="Poin WHL saya ' + ang(d.saldo) + '">' + ILUS('poin') + '<span class="tx"><small>Poin WHL saya</small><b>' + ang(d.saldo) + '</b></span>'
      + '<span class="go">' + (Number(d.hariIni) > 0 ? '+' + ang(d.hariIni) + ' hari ini ›' : 'Lihat ›') + (dekat ? '<em>' + esc(ah.poin) + ' poin hangus ' + waktu(ah.tgl) + '</em>' : '') + '</span></button>';
    if (bolehAcc() && ADM.nunggu > 0) h += '<button type="button" class="pnAccBeranda" data-ke="poinAcc">' + ILUS('tukarAcc') + '<span>' + ang(ADM.nunggu) + ' ajuan tukar poin nunggu ACC ›</span></button>';
    return h;
  }

  /* ---------- lapis (layar penuh di atas app, tombol ‹ = Back HP) ---------- */
  var lapisEl = null, layar = '';
  function lapis(judul, sub, isi) {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis pnLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik); lapisEl.addEventListener('change', ubah);
    }
    var g = lapisEl.querySelector('.ksnIsi'), y = g && lapisEl.getAttribute('data-layar') === layar ? g.scrollTop : 0;
    lapisEl.setAttribute('data-layar', layar);
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-p="tutup" aria-label="Kembali">‹</button><div class="nm">' + esc(sub) + '<b>' + esc(judul) + '</b></div></div><div class="ksnIsi">' + isi + '</div>';
    var g2 = lapisEl.querySelector('.ksnIsi'); if (g2 && y) g2.scrollTop = y;
  }
  function tutup() { if (!lapisEl) return false; var d = lapisEl; lapisEl = null; layar = ''; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); return true; }
  function tutupSemua() { tutupFoto(); tutupGb(); tutup(); }
  function kosong(ik, judul, ket, tombol) { return '<div class="kartu pnKosong">' + ILUS(ik) + '<b>' + esc(judul) + '</b><small>' + esc(ket || '') + '</small>' + (tombol ? '<button type="button" class="tKecil" data-p="' + tombol[0] + '" style="margin-top:12px">' + esc(tombol[1]) + '</button>' : '') + '</div>'; }
  function memuat() { return R && R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>'; }

  /** pintu dari app.js: true = aksi ini milik modul poin */
  function buka(ke, ctx) {
    if (ke !== 'poin' && ke !== 'poinKatalog' && ke !== 'poinAcc' && ke !== 'poinRekap' && ke !== 'peringkat' && ke !== 'nilaiRekan' && ke !== 'ksd' && ke !== 'poinSanggah') return false;
    CTX = ctx || CTX; gaya();
    if (ke === 'nilaiRekan') { if (window.WHL_POIN_STAF) window.WHL_POIN_STAF.buka(ke, CTX); return true; } /* v3.36 */
    if (ke === 'ksd') { if (window.WHL_KSD) window.WHL_KSD.buka(CTX); return true; }
    if (ke === 'poinSanggah') { sanggah(); return true; }
    if (ke === 'peringkat') { if (window.WHL_PERINGKAT) window.WHL_PERINGKAT.buka(CTX); return true; }
    if (ke === 'poin') bukaPoin(); else if (ke === 'poinKatalog') bukaKatalog(); else if (ke === 'poinAcc') bukaAcc(); else bukaRekap();
    return true;
  }
  /** notifikasi {jenis:'poin', id}: admin -> ACC tukar; pemilik -> Poin saya (bagian Tukar saya) */
  var dariNotif = false;
  function bukaNotif(ctx, id) {
    CTX = ctx || CTX; gaya(); id = String(id || '');
    var milik = !!(P && P.d && (P.d.tukar || []).some(function (x) { return x.id === id; })), S = sesi();
    if (!milik && (bolehAcc() || (ADM.acc === null && S && S.user.peran !== 'driver' && punya('pusatTukarAntre')))) { dariNotif = true; bukaAcc(); } /* bukan admin -> muatAcc pindah ke Poin saya */
    else bukaPoin('tukar');
  }

  /* ================= 1. POIN SAYA ================= */
  function bukaPoin(gulirKe) {
    layar = 'poin'; lapis('Poin WHL', 'Tiket hadiah WHL', P && P.d && aktif() ? gambarPoin(P.d, true) : memuat());
    muat(true).then(function (d) {
      if (!lapisEl || layar !== 'poin') return;
      if (!d) { lapis('Poin WHL', 'Tiket hadiah WHL', kosong('poin', 'Belum bisa dimuat', 'Coba lagi sebentar.', ['ulangPoin', 'Coba lagi'])); return; }
      if (d.aktif === false) { lapis('Poin WHL', 'Tiket hadiah WHL', kosong('poin', 'Poin WHL belum dibuka', d.pesan || 'Fitur ini sedang disiapkan. Poinmu tetap dicatat server.')); return; }
      if (d.ok === false) { lapis('Poin WHL', 'Tiket hadiah WHL', kosong('poin', 'Belum bisa dimuat', d.pesan || '', ['ulangPoin', 'Coba lagi'])); return; }
      lapis('Poin WHL', 'Tiket hadiah WHL', gambarPoin(d, false));
      if (gulirKe) { var el = lapisEl.querySelector('#pnTukarSaya'); if (el) el.scrollIntoView({ block: 'start' }); }
    }, function (e) { if (lapisEl && layar === 'poin' && !(P && P.d && aktif())) lapis('Poin WHL', 'Tiket hadiah WHL', kosong('poin', 'Belum bisa dimuat', e.message, ['ulangPoin', 'Coba lagi'])); });
  }
  var LABEL_CARA = [['KUIS', 'Kuis 10 tercepat', 'driver'], ['P2H', 'P2H di GASPOL', 'driver'], ['ABSEN', 'Absen tepat', 'staf'], ['KM', 'Target KM harian', 'driver'], ['HAZARD', 'Hazard valid'], ['NOLINS', 'Nol insiden / minggu']]; /* v3.30 Reza: target harian = KM dari DO (server susulan-km: aturan.poin.KM; server lama RIT) */
  function gambarPoin(d, dariSimpan) {
    var S = sesi(), drv = S && S.user.peran === 'driver', A = (d.aturan && d.aturan.poin) || { KUIS: 5, P2H: 2, ABSEN: 2, KM: 3, HAZARD: 8, NOLINS: 10, TOP: [30, 20, 10], ULTAH: 50 }; /* v3.36 kalibrasi: kuis 5, hazard 8 (maks 1/hari); server aturan.poin tetap yang dipakai */
    if (A.KM == null) A.KM = A.RIT != null ? A.RIT : 3;
    if (d.targetKmHari == null && d.aturan && d.aturan.targetKmHari != null) d.targetKmHari = d.aturan.targetKmHari;
    var bts = Number(d.batasHarian) || 25, hi = Math.max(0, Number(d.hariIni) || 0), rpp = (d.aturan && d.aturan.rpPerPoin) || 100;
    var h = '<div class="pnTiket"><small>Poin kamu</small><div class="pnAngka">' + ILUS('poin') + '<span>' + ang(d.saldo) + '</span></div>'
      + '<div class="pnRp">≈ ' + rp((Number(d.saldo) || 0) * rpp) + ' nilai hadiah · 1 poin = ' + rp(rpp) + '</div>'
      + '<div class="pnBts">Hari ini ' + ang(hi) + ' / ' + ang(bts) + ' poin (batas harian)<div class="pnProg"><i style="width:' + Math.min(100, hi / bts * 100).toFixed(0) + '%"></i></div></div></div>';
    if (d.akanHangus && d.akanHangus.poin > 0) h += '<div class="pnHangus"><span>⏳</span><span><b>' + esc(d.akanHangus.poin) + ' poin hangus tgl ' + esc(tglPanjang(d.akanHangus.tgl)) + '</b><br><span style="font-weight:600">Tukar sebelum hangus. Poin hangus 6 bulan sejak didapat.</span></span></div>';
    if (Number(d.sudahHangus) > 0) h += '<div class="kecil" style="margin:8px 4px 0">' + ang(d.sudahHangus) + ' poin sudah hangus (lewat 6 bulan).</div>';
    h += '<div class="pnAksi">' + (punya('pusatPoinKatalog') ? '<button type="button" data-p="katalog">' + ILUS('hadiah') + 'Tukar hadiah</button>' : '') + (punya('pusatPeringkat') ? '<button type="button" data-p="peringkat">' + ILUS('peringkat') + 'Peringkat</button>' : '') + '</div>';
    if (bolehAcc() || bolehRekap()) h += '<div class="pnAksi">' + (bolehAcc() ? '<button type="button" data-p="acc">' + ILUS('tukarAcc') + 'ACC tukar' + (ADM.nunggu ? ' (' + ADM.nunggu + ')' : '') + '</button>' : '') + (bolehRekap() ? '<button type="button" data-p="rekap">' + ILUS('rekapTukar') + 'Rekap tukar</button>' : '') + '</div>';
    if (window.WHL_POIN_STAF) h += window.WHL_POIN_STAF.slot(CTX); /* v3.36 staf: akan dikurangi, kriteria peran, tantangan, nilai rekan · driver: akan dikurangi (pusatPoinKurangSaya) */
    h += '<div class="kartu"><div class="pnJd"><b>Cara dapat poin</b><span>maks ' + ang(bts) + ' poin/hari</span></div><div class="pnChips">'
      + LABEL_CARA.filter(function (c) { return !c[2] || (c[2] === 'driver') === !!drv; }).map(function (c) { var lb = c[1]; if (c[0] === 'KM') { var km = Math.round(Number(d.targetKmHari) || 0); lb += (km > 0 ? ' ' + ang(km) + ' km' : '') + ' (dari DO)'; } return '<span>' + esc(lb) + ' +' + esc(A[c[0]]) + '</span>'; }).join('')
      + '<span>Top 3 peringkat +' + esc((A.TOP || [30, 20, 10]).join('/')) + '</span><span>Ulang tahun +' + esc(A.ULTAH || 50) + '</span></div>'
      + '<div class="kecil" style="margin-top:8px">Poin dihitung otomatis dari data asli (DO, P2H, absen, hazard, kuis). Bonus mingguan & ulang tahun di luar batas harian.</div>'
      + (drv && window.WHL_SETARA ? window.WHL_SETARA.html({ setara: d.setaraRit, targetKmHari: d.targetKmHari, kmHariIni: d.kmHariIni }) : '') + '</div>'; /* v3.30: setara ritase per rute (field setaraRit server; tidak ada = disembunyikan) */
    var T = Array.isArray(d.tukar) ? d.tukar : [];
    h += '<h2 class="bagW" id="pnTukarSaya">Tukar saya <span>' + T.length + '</span></h2><div class="kartu">' + (T.length ? T.map(kartuTukarSaya).join('') : '<div class="kecil">Belum pernah menukar poin.' + (LABEL_HARI ? ' Hadiah bisa ditukar tiap ' + esc(LABEL_HARI) + '.' : '') + '</div>') + '</div>';
    var Rw = Array.isArray(d.riwayat) ? d.riwayat : [];
    h += '<h2 class="bagW">Riwayat poin <span>' + (Rw.length ? Rw.length + ' terakhir' : '') + '</span></h2><div class="kartu">' + (Rw.length ? Rw.map(function (x) {
      var p = Number(x.poin) || 0, kls = p > 0 ? 'plus' : p < 0 ? 'min' : 'nol', ket = [waktu(x.waktu || x.hari)];
      if (x.catatan) ket.push(esc(String(x.catatan).split(' · ').map(function (s) { return s.split('|')[0]; }).filter(String).join(' · '))); /* P2H: "lambung|waktu" -> lambung */
      if (p > 0 && x.hangus) ket.push('hangus ' + waktu(x.hangus));
      if (Number(x.diminta) > p && p >= 0 && x.sumber !== 'TUKAR') ket.push('kena batas (minta ' + ang(x.diminta) + ')');
      return '<div class="pnBrs"><span class="em">' + (EMO[x.sumber] || (p < 0 && x.sumber !== 'TUKAR' ? '⛔' : '⭐')) + '</span><div class="tx"><b>' + esc(x.label || x.sumber) + '</b><small>' + ket.filter(String).join(' · ') + '</small>' + bisaSanggah(x, p) + '</div><span class="pnNil ' + kls + '">' + (p > 0 ? '+' : p < 0 ? '−' : '') + ang(Math.abs(p)) + '</span></div>';
    }).join('') : '<div class="kecil">Belum ada poin. Poin masuk otomatis dari kegiatan kerja harianmu.</div>') + '</div>';
    h += '<div class="kecil" style="margin:14px 6px;text-align:center;line-height:1.5">Poin = tiket hadiah, <b>bukan uang</b>. Tidak bisa dicairkan, ditransfer, atau dijual. Hangus 6 bulan sejak didapat.' + (dariSimpan ? '<br><span class="putar"></span> memperbarui…' : '') + '</div>';
    return h;
  }
  function kartuTukarSaya(x) {
    var bawah = '';
    if (x.status === 'SIAP_AMBIL') bawah = '<div class="kecil" style="margin-top:6px">Di-ACC ' + esc(x.accOleh || '') + (x.waktuAcc ? ' · ' + waktu(x.waktuAcc) : '') + '. Ambil di <b>kantor WHL</b>' + (LABEL_HARI ? ' hari ' + esc(LABEL_HARI) : '') + '.</div>';
    if (x.status === 'SELESAI') bawah = '<div class="kecil" style="margin-top:6px">Diserahkan ' + esc(x.diserahkanOleh || '') + (x.waktuSerah ? ' · ' + waktu(x.waktuSerah) : '') + '</div>' + (x.adaFoto ? '<div class="pnTb"><button type="button" data-p="foto:' + esc(x.id) + '">📷 Lihat foto serah terima</button></div>' : '');
    if (x.status === 'DITOLAK' && x.alasan) bawah = '<div class="kecil" style="margin-top:6px;color:var(--tMerah)">Alasan: ' + esc(x.alasan) + '</div>';
    if (x.status === 'DIAJUKAN' && punya('pusatPoinBatalTukar')) bawah += '<div class="pnTb"><button type="button" class="no" data-p="batal:' + esc(x.id) + '">Batalkan ajuan</button></div>';
    return '<div class="pnTk"><div class="pnTkAtas">' + ILUS(ikonBarang(x.barang)) + '<div class="tx"><b>' + esc(x.barang) + '</b><small>' + ang(x.poin) + ' poin · diajukan ' + waktu(x.waktuAjuan) + '</small>' + lencanaSt(x.status) + '</div></div>' + alur(x.status) + bawah + '</div>';
  }

  /* ================= 2. KATALOG + AJUKAN TUKAR ================= */
  var KAT = null;
  function bukaKatalog() {
    layar = 'katalog'; lapis('Tukar poin', 'Katalog hadiah WHL', KAT ? gambarKatalog(KAT) : memuat());
    panggil('pusatPoinKatalog', []).then(function (h) {
      if (habis(h) || !lapisEl || layar !== 'katalog') return;
      if (h && h.aktif === false) { lapis('Tukar poin', 'Katalog hadiah WHL', kosong('hadiah', 'Katalog belum dibuka', h.pesan || 'Poin WHL sedang disiapkan.')); return; }
      if (!h || h.ok === false) { lapis('Tukar poin', 'Katalog hadiah WHL', kosong('hadiah', 'Katalog belum bisa dimuat', (h && h.pesan) || '', ['ulangKat', 'Coba lagi'])); return; }
      KAT = h; lapis('Tukar poin', 'Saldo ' + ang(h.saldo) + ' poin · 1 poin = Rp 100', gambarKatalog(h));
    }, function (e) { if (lapisEl && layar === 'katalog' && !KAT) lapis('Tukar poin', 'Katalog hadiah WHL', kosong('hadiah', 'Katalog belum bisa dimuat', e.message, ['ulangKat', 'Coba lagi'])); });
  }
  function gambarKatalog(k) {
    var I = infoTukar(k.bukaTukar), uji = k.modeUji || k.katalogBuka === false, h = '';
    if (uji) h += '<div class="pnPeringat biru">🧪 <b>Masa uji Poin WHL.</b> Katalog belum dibuka untuk penukaran. Poinmu tetap tersimpan, bisa ditukar setelah katalog dibuka.</div>';
    else if (!I.hariIni) h += '<div class="pnPeringat">📅 <b>' + esc(pesanTutup(I)) + '</b><br>Hari ini tombol tukar belum aktif. Lihat-lihat dulu boleh.</div>';
    else h += '<div class="pnPeringat hijau">✅ <b>Hari ini hari tukar.</b> Ajukan sekarang, ambil hadiah di ' + esc(k.tempatAmbil || 'kantor WHL') + ' setelah di-ACC.</div>';
    var B = Array.isArray(k.barang) ? k.barang : [], saldo = Number(k.saldo) || 0;
    h += '<div class="pnKtlg">' + B.map(function (b) {
      var stok = b.stokSisa == null ? (/digital/i.test(b.jenis || '') ? 'digital' : '') : b.habis ? 'habis' : 'stok ' + b.stokSisa, kurang = Math.max(0, (Number(b.poin) || 0) - saldo), tb;
      if (b.habis) tb = '<button type="button" disabled>Habis</button>';
      else if (kurang > 0 || b.cukup === false) tb = '<button type="button" disabled>Kurang ' + ang(kurang || '') + '</button>';
      else if (uji) tb = '<button type="button" disabled>Belum buka</button>';
      else if (!I.hariIni) tb = '<button type="button" disabled>' + esc(I.berikut ? 'Buka ' + I.berikut.split(' ')[0] : 'Tutup') + '</button>';
      else tb = '<button type="button" data-p="tukar:' + esc(b.id) + '">Tukar</button>';
      return '<div class="pnHd">' + (stok ? '<span class="stok">' + esc(stok) + '</span>' : '') + gbBarang(b) + '<b>' + esc(b.nama) + '</b>'
        + (b.perkiraanRp ? '<small class="rp">± ' + rp(b.perkiraanRp) + '</small>' : '') + '<div class="hrg"><span>' + ang(b.poin) + '<small>poin</small></span>' + tb + '</div>'
        + (k.bolehGambar && punya('pusatPoinGambarSimpan') ? '<button type="button" class="gantiGb" data-p="gbGanti:' + esc(b.id) + '">🖼️ Ganti gambar</button>' : '') + '</div>';
    }).join('') + '</div>';
    if (!B.length) h += kosong('hadiah', 'Katalog kosong', 'Admin belum mengisi daftar hadiah.');
    h += '<div class="kecil" style="margin:14px 6px;text-align:center;line-height:1.5">Hadiah fisik diambil di <b>' + esc(k.tempatAmbil || 'kantor WHL') + '</b> tiap ' + esc(I.label) + '. Maks ' + esc(k.maksPerMinggu || 1) + 'x tukar per minggu.<br>Di-ACC salah satu: Fanza · Reza · Puput · Rike. Ditolak = poin kembali.</div>';
    setTimeout(function () { muatGambar(k); }, 0); /* poin-gambar-hadiah-20nov */
    return h;
  }
  /* ---------- gambar hadiah (poin-gambar-hadiah-20nov): KATALOG simpan Gambar ID (Drive), kosong = logo WHL; ganti khusus Reza/Fanza/Rike ---------- */
  var GBM = {}, GB_JALAN = {}, GB_LOGO = 'img/logo-hadiah.jpg', GB_LS = 'whlHdg_', GB_MAKS = 560000, GB_LEBAR = 800, GB = { el: null, id: '', baru: '', kirim: false };
  function cssId(s) { return window.CSS && CSS.escape ? CSS.escape(String(s)) : String(s).replace(/["\\]/g, ''); }
  function gbCari(id) { return KAT && (KAT.barang || []).filter(function (x) { return String(x.id) === String(id); })[0]; }
  function gbSrc(gid) { if (!gid) return ''; if (GBM[gid]) return GBM[gid]; try { var s = localStorage.getItem(GB_LS + gid); if (s) { GBM[gid] = s; return s; } } catch (e) { /* abaikan */ } return ''; }
  function gbSimpanLokal(gid, src) { GBM[gid] = src; try { localStorage.setItem(GB_LS + gid, src); } catch (e) { /* penyimpanan penuh: cukup di memori */ } }
  function gbBersih(B) { try { var pakai = {}; B.forEach(function (b) { if (b.gambarId) pakai[GB_LS + b.gambarId] = 1; }); for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (k && k.indexOf(GB_LS) === 0 && !pakai[k]) localStorage.removeItem(k); } } catch (e) { /* abaikan */ } }
  function gbBarang(b) {
    if (!b || !('gambarId' in b)) return '<div class="gb">' + ILUS(ikonBarang(b && b.nama)) + '</div>'; /* server lama: ikon lama */
    var src = b.gambarId ? gbSrc(b.gambarId) : GB_LOGO;
    return '<div class="gb foto' + (src ? '' : ' memuat') + '" data-gb="' + esc(b.id) + '" data-p="gbLihat:' + esc(b.id) + '" role="button" aria-label="Lihat gambar ' + esc(b.nama) + '">' + (src ? '<img alt="' + esc(b.nama) + '" src="' + esc(src) + '">' : ILUS(ikonBarang(b.nama))) + '</div>';
  }
  function gbPasang(id, src, nama) { if (!lapisEl) return; var el = lapisEl.querySelector('[data-gb="' + cssId(id) + '"]'); if (!el) return; el.classList.remove('memuat'); el.innerHTML = '<img alt="' + esc(nama || '') + '" src="' + esc(src) + '">'; }
  function muatGambar(k) {
    var B = k && Array.isArray(k.barang) ? k.barang : []; if (!B.some(function (b) { return 'gambarId' in b; })) return;
    gbBersih(B); if (!punya('pusatPoinGambar')) return;
    B.forEach(function (b) {
      var gid = b.gambarId; if (!gid || gbSrc(gid) || GB_JALAN[gid]) return;
      GB_JALAN[gid] = 1;
      panggil('pusatPoinGambar', [b.id], 45000).then(function (h) {
        delete GB_JALAN[gid]; if (habis(h) || !h || !h.ok) return;
        if (h.b64 && h.gambarId === gid) { var src = 'data:' + (h.mime || 'image/jpeg') + ';base64,' + h.b64; gbSimpanLokal(gid, src); gbPasang(b.id, src, b.nama); }
        else if (h.logo) gbPasang(b.id, GB_LOGO, b.nama);
      }, function () { delete GB_JALAN[gid]; });
    });
  }
  function lihatGambar(id) {
    var b = gbCari(id); if (!b) return; var src = b.gambarId ? gbSrc(b.gambarId) : GB_LOGO; if (!src) return;
    tutupFoto();
    fotoEl = document.createElement('div'); fotoEl.className = 'lapis pnLihat tampil';
    fotoEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-p="tutupFoto" aria-label="Kembali">‹</button><div class="nm">Hadiah ' + ang(b.poin) + ' poin<b>' + esc(b.nama) + '</b></div></div><div class="isiF"><img alt="' + esc(b.nama) + '" src="' + esc(src) + '"></div><div class="ket">' + esc(b.keterangan || '') + '</div>';
    fotoEl.addEventListener('click', function (ev) { if (ev.target.closest('[data-p="tutupFoto"]')) tutupFoto(); });
    document.body.appendChild(fotoEl);
  }
  function bukaGantiGb(id) {
    var b = gbCari(id); if (!b || !KAT || !KAT.bolehGambar) return;
    tutupGb(); GB = { el: document.createElement('div'), id: String(id), baru: '', kirim: false };
    GB.el.className = 'lapis ksnLapis pnLapis pnGbLapis tampil';
    GB.el.addEventListener('click', klikGb); GB.el.addEventListener('change', ubahGb);
    document.body.appendChild(GB.el); gambarGb();
  }
  function gambarGb() {
    if (!GB.el) return; var b = gbCari(GB.id); if (!b) { tutupGb(); return; }
    var src = GB.baru || (b.gambarId ? gbSrc(b.gambarId) : GB_LOGO), k = GB.kirim;
    GB.el.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-g="tutup" aria-label="Kembali">‹</button><div class="nm">Ganti gambar hadiah<b>' + esc(b.nama) + '</b></div></div>'
      + '<div class="ksnIsi"><div class="pnGbIsi"><div class="pnGbPrev">' + (src ? '<img alt="' + esc(b.nama) + '" src="' + esc(src) + '">' : '<span class="putar"></span>') + '</div>'
      + '<div class="pnGbSt">' + (GB.baru ? 'Foto baru — belum disimpan' : b.gambarId ? 'Gambar sekarang' : 'Sekarang memakai logo WHL') + '</div>'
      + '<div class="pnGbTb"><label class="pilih' + (k ? ' mati' : '') + '">🖼️ ' + (GB.baru ? 'Pilih foto lain' : 'Pilih foto dari HP') + '<input type="file" accept="image/*" data-gbfile="1" hidden' + (k ? ' disabled' : '') + '></label>'
      + '<button type="button" class="pnGbSimpan" data-g="simpan"' + (!GB.baru || k ? ' disabled' : '') + '>' + (k === 'foto' ? 'Menyimpan…' : 'Simpan gambar') + '</button>'
      + '<button type="button" class="pnGbLogo" data-g="logo"' + (k || (!b.gambarId && !GB.baru) ? ' disabled' : '') + '>' + (k === 'logo' ? 'Menyimpan…' : (!b.gambarId ? 'Batal, tetap logo WHL' : 'Pakai logo WHL')) + '</button></div>'
      + '<div class="pnGbKet">Foto dikecilkan otomatis (lebar maks 800 px) sebelum dikirim. Gambar baru terlihat semua orang saat membuka katalog. Khusus Reza · Fanza · Rike.</div></div></div>';
  }
  function klikGb(ev) {
    var t = ev.target.closest('[data-g]'); if (!t || !GB.el || t.disabled) return; var n = t.getAttribute('data-g');
    if (n === 'tutup') { tutupGb(); return; }
    if (n === 'simpan') { simpanGb(false); return; }
    if (n === 'logo') {
      var b = gbCari(GB.id); if (b && !b.gambarId) { GB.baru = ''; gambarGb(); return; }
      R.tanya({ judul: 'Pakai logo WHL?', ket: 'Gambar ' + (b ? b.nama : 'hadiah') + ' diganti logo WHL. Foto lama tetap tersimpan di Drive.', ya: 'Ya, pakai logo', tidak: 'Batal' }).then(function (y) { if (y) simpanGb(true); });
    }
  }
  function ubahGb(ev) {
    var t = ev.target; if (!t.hasAttribute('data-gbfile') || !t.files || !t.files[0]) return;
    var f = t.files[0]; t.value = ''; roti('Mengecilkan foto…');
    kompresGb(f).then(function (d) { GB.baru = d; gambarGb(); }, function (e) { roti(e.message); });
  }
  function simpanGb(logo) {
    if (!GB.el || GB.kirim) return; var id = GB.id; if (!logo && !GB.baru) return;
    var d = logo ? { idBarang: id, logo: true } : { idBarang: id, foto: GB.baru };
    GB.kirim = logo ? 'logo' : 'foto'; gambarGb();
    panggil('pusatPoinGambarSimpan', [d], 90000).then(function (h) {
      GB.kirim = false; if (habis(h)) return;
      if (!h || !h.ok) { if (R.bunyi) R.bunyi('gagal'); roti((h && h.pesan) || 'Gambar belum tersimpan.'); gambarGb(); return; }
      var b = gbCari(id); if (b) { b.gambarId = h.gambarId || ''; if (h.gambarId && d.foto) gbSimpanLokal(h.gambarId, d.foto); }
      if (R.bunyi) R.bunyi('sukses'); if (R.getar) R.getar('sukses'); roti(h.pesan || 'Gambar tersimpan.');
      tutupGb(); if (KAT && lapisEl && layar === 'katalog') lapis('Tukar poin', 'Saldo ' + ang(KAT.saldo) + ' poin · 1 poin = Rp 100', gambarKatalog(KAT));
    }, function (e) { GB.kirim = false; roti(e.message + ' — foto masih di layar, coba simpan lagi.'); gambarGb(); });
  }
  function tutupGb() { if (!GB.el) return false; GB.el.remove(); GB.el = null; GB.baru = ''; GB.kirim = false; return true; }
  function kompresGb(file) {
    return new Promise(function (ok, gagal) {
      if (!/^image\//.test(file.type || 'image/')) { gagal(new Error('Pilih file gambar (JPG/PNG).')); return; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, hh = img.naturalHeight, sk = Math.min(1, GB_LEBAR / w, 1600 / hh), q = 0.85, d = '';
        for (var i = 0; i < 10; i++) {
          var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * sk)); c.height = Math.max(1, Math.round(hh * sk));
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          d = c.toDataURL('image/jpeg', q); if (d.length <= GB_MAKS) break;
          if (q > 0.55) q -= 0.1; else sk *= 0.85;
        }
        URL.revokeObjectURL(url); if (d.length > GB_MAKS) gagal(new Error('Foto terlalu besar.')); else ok(d);
      };
      img.onerror = function () { URL.revokeObjectURL(url); gagal(new Error('Foto tidak bisa dibaca. Coba foto lain.')); };
      img.src = url;
    });
  }
  function ajukanTukar(id) {
    var k = KAT, b = k && (k.barang || []).filter(function (x) { return String(x.id) === String(id); })[0]; if (!b) return;
    var I = infoTukar(k.bukaTukar); if (!I.hariIni) { roti(pesanTutup(I)); return; }
    R.tanya({ judul: 'Tukar ' + ang(b.poin) + ' poin jadi ' + b.nama + '?', ket: 'Sisa poin jadi ' + ang((Number(k.saldo) || 0) - b.poin) + '. Di-ACC salah satu: Fanza · Reza · Puput · Rike. Hadiah diambil di kantor WHL. Ditolak = poin kembali. Poin tidak bisa dicairkan jadi uang.', ya: 'Ya, ajukan tukar', tidak: 'Batal' }).then(function (y) {
      if (!y) return;
      roti('Mengirim ajuan tukar…');
      panggil('pusatPoinTukar', [b.id], 45000).then(function (h) {
        if (habis(h)) return;
        if (!h || !h.ok) { if (R.bunyi) R.bunyi('gagal'); roti((h && h.pesan) || 'Ajuan belum bisa dikirim.'); if (h && h.bukaTukar && KAT) { KAT.bukaTukar = h.bukaTukar; if (layar === 'katalog') lapis('Tukar poin', 'Saldo ' + ang(KAT.saldo) + ' poin', gambarKatalog(KAT)); } return; }
        if (R.konfeti) R.konfeti(); if (R.bunyi) R.bunyi('sukses'); if (R.getar) R.getar('sukses');
        P = P ? { d: P.d, t: 0 } : null; KAT = null;
        R.sukses({ judul: 'Ajuan tukar terkirim', sub: h.pesan || 'Tunggu ACC admin, lalu ambil di kantor WHL.', rinci: [['Hadiah', b.nama], ['Poin', ang(b.poin)], ['Sisa poin', h.saldoSisa != null ? ang(h.saldoSisa) : ''], ['Status', 'Nunggu ACC']], konfeti: false }).then(function () { bukaPoin('tukar'); });
      }, function (e) { roti(e.message); });
    });
  }
  function batalTukar(id) {
    R.tanya({ judul: 'Batalkan ajuan tukar?', ket: 'Poin dikembalikan ke saldo. Bisa diajukan lagi di hari tukar.', ya: 'Batalkan ajuan', tidak: 'Tidak', bahaya: true }).then(function (y) {
      if (!y) return;
      panggil('pusatPoinBatalTukar', [id], 45000).then(function (h) { if (habis(h)) return; roti(h && h.ok ? 'Ajuan dibatalkan, poin kembali.' : (h && h.pesan) || 'Belum bisa dibatalkan.'); bukaPoin('tukar'); }, function (e) { roti(e.message); });
    });
  }

  /* ---------- foto serah terima (lihat) ---------- */
  var fotoEl = null;
  function lihatFoto(id, ket) {
    tutupFoto();
    fotoEl = document.createElement('div'); fotoEl.className = 'lapis pnLihat tampil';
    fotoEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-p="tutupFoto" aria-label="Kembali">‹</button><div class="nm">Bukti serah terima<b>Foto penyerahan hadiah</b></div></div><div class="isiF"><span class="putar"></span></div><div class="ket">' + esc(ket || '') + '</div>';
    fotoEl.addEventListener('click', function (ev) { if (ev.target.closest('[data-p="tutupFoto"]')) tutupFoto(); });
    document.body.appendChild(fotoEl);
    panggil('pusatTukarFoto', [id], 45000).then(function (h) {
      if (!fotoEl || habis(h)) return; var isi = fotoEl.querySelector('.isiF');
      if (!h || !h.ok || !h.b64) { isi.innerHTML = '<div style="color:#fff;text-align:center">' + esc((h && h.pesan) || 'Foto belum bisa dimuat.') + '</div>'; return; }
      isi.innerHTML = '<img alt="Foto serah terima hadiah" src="data:' + esc(h.mime || 'image/jpeg') + ';base64,' + h.b64 + '">';
    }, function (e) { if (fotoEl) fotoEl.querySelector('.isiF').innerHTML = '<div style="color:#fff;text-align:center">' + esc(e.message) + '</div>'; });
  }
  function tutupFoto() { if (!fotoEl) return false; fotoEl.remove(); fotoEl = null; return true; }

  /* ================= 3. ACC TUKAR (admin) ================= */
  var ACC = { tab: 'nunggu', d: null, selesai: null, foto: {}, catatan: {}, tolak: {}, yakin: '', kirim: '' }, yakinT = null;
  function bukaAcc() {
    layar = 'acc'; lapis('ACC tukar poin', 'Fanza · Reza · Puput · Rike', ACC.d ? gambarAcc() : memuat()); muatAcc();
  }
  function muatAcc() {
    var st = ACC.tab === 'selesai' ? 'SELESAI' : '';
    panggil('pusatTukarAntre', [st]).then(function (h) {
      if (habis(h) || !lapisEl || layar !== 'acc') return;
      if (h && h.aktif === false) { lapis('ACC tukar poin', 'Admin tukar', kosong('tukarAcc', 'Poin WHL belum dibuka', h.pesan || '')); return; }
      if (!h || h.ok === false) { ADM.acc = h && h.tolak ? false : ADM.acc; if (dariNotif && h && h.tolak) { dariNotif = false; bukaPoin('tukar'); return; } lapis('ACC tukar poin', 'Admin tukar', kosong('tukarAcc', 'Tidak bisa dibuka', (h && h.pesan) || 'Khusus admin tukar poin.')); return; }
      ADM.acc = true; ADM.t = Date.now(); dariNotif = false;
      if (st) ACC.selesai = h; else { ACC.d = h; ADM.nunggu = (h.daftar || []).filter(function (x) { return x.status === 'DIAJUKAN'; }).length; }
      gambarUlangAcc();
    }, function (e) { if (lapisEl && layar === 'acc') roti(e.message); });
  }
  function gambarUlangAcc() { if (lapisEl && layar === 'acc') lapis('ACC tukar poin', (sesi() ? String(sesi().user.nama || '').split(/\s+/)[0] + ' · ' : '') + ADM.nunggu + ' nunggu ACC', gambarAcc()); }
  function gambarAcc() {
    var D = ACC.d || { daftar: [] }, L = D.daftar || [], I = infoTukar(D.bukaTukar);
    var nunggu = L.filter(function (x) { return x.status === 'DIAJUKAN'; }), siap = L.filter(function (x) { return x.status === 'SIAP_AMBIL'; });
    var h = '<div class="segmen" style="margin-bottom:12px;grid-template-columns:repeat(3,1fr)">' + [['nunggu', 'Nunggu ' + nunggu.length], ['siap', 'Siap ambil ' + siap.length], ['selesai', 'Selesai']].map(function (t) { return '<button type="button" data-p="tab:' + t[0] + '" class="' + (ACC.tab === t[0] ? 'on' : '') + '">' + esc(t[1]) + '</button>'; }).join('') + '</div>';
    h += '<div class="pnPeringat ' + (I.hariIni ? 'hijau' : '') + '">' + (I.hariIni ? '✅ Hari ini hari tukar: serah terima hadiah boleh dilakukan.' : '📅 ACC boleh kapan saja. <b>Serah terima hadiah hanya ' + esc(I.label) + '</b>' + (I.berikut ? ' (berikutnya ' + esc(I.berikut) + ')' : '') + '.') + '</div>';
    var daftar = ACC.tab === 'nunggu' ? nunggu : ACC.tab === 'siap' ? siap : ((ACC.selesai && ACC.selesai.daftar) || null);
    if (daftar === null) return h + memuat();
    if (!daftar.length) return h + kosong('tukarAcc', ACC.tab === 'nunggu' ? 'Tidak ada ajuan baru' : ACC.tab === 'siap' ? 'Tidak ada hadiah yang menunggu diambil' : 'Belum ada yang selesai', ACC.tab === 'nunggu' ? 'Ajuan tukar poin muncul di sini dan dikirim sebagai notifikasi.' : '');
    return h + daftar.map(function (x) { return kartuAcc(x, I); }).join('');
  }
  function kartuAcc(x, I) {
    var id = esc(x.id), h = '<div class="kartu"><div class="pnTkAtas">' + ILUS(ikonBarang(x.barang)) + '<div class="tx"><b>' + esc(x.barang) + '</b><small>' + esc(x.nama) + (x.peran ? ' (' + esc(x.peran) + ')' : '') + (x.lambung ? ' · ' + esc(x.lambung) : '') + '</small><small>' + ang(x.poin) + ' poin · diajukan ' + waktu(x.waktuAjuan) + '</small>' + lencanaSt(x.status) + '</div></div>';
    if (x.status === 'DIAJUKAN') {
      if (ACC.tolak[x.id] != null) h += '<textarea class="pnIn" data-tolak="' + id + '" placeholder="Alasan ditolak (wajib), mis. stok habis / poin dari data salah">' + esc(ACC.tolak[x.id]) + '</textarea><div class="pnTb"><button type="button" data-p="tolakBatal:' + id + '">Batal</button><button type="button" class="no" data-p="tolakKirim:' + id + '"' + (ACC.kirim === x.id ? ' disabled' : '') + '>Kirim penolakan</button></div>';
      else h += '<div class="pnTb"><button type="button" class="no" data-p="tolak:' + id + '">Tolak…</button><button type="button" class="' + (ACC.yakin === x.id ? 'yakin' : 'ok') + '" data-p="acc:' + id + '"' + (ACC.kirim === x.id ? ' disabled' : '') + '>' + (ACC.kirim === x.id ? 'Mengirim…' : ACC.yakin === x.id ? 'Ketuk lagi untuk ACC' : 'ACC') + '</button></div>';
    } else if (x.status === 'SIAP_AMBIL') {
      var f = ACC.foto[x.id];
      h += '<div class="kecil" style="margin-top:8px">Di-ACC ' + esc(x.accOleh || '') + (x.waktuAcc ? ' · ' + waktu(x.waktuAcc) : '') + '</div>';
      h += '<div class="kecil" style="margin-top:8px;font-weight:800;color:var(--teks)">Foto bukti serah terima (wajib)</div>';
      h += f ? '<div class="pnPrev"><img src="' + f + '" alt="Foto serah terima"><button type="button" data-p="hapusFoto:' + id + '" aria-label="Hapus foto">✕</button></div>'
        : '<div class="pnFoto"><label>📷 Kamera<input type="file" accept="image/*" capture="environment" data-foto="' + id + '" hidden></label><label>🖼️ Galeri<input type="file" accept="image/*" data-foto="' + id + '" hidden></label></div>';
      h += '<input class="pnIn" data-cat="' + id + '" maxlength="200" placeholder="Catatan (opsional), mis. diterima langsung" value="' + esc(ACC.catatan[x.id] || '') + '">';
      h += '<div class="pnTb"><button type="button" class="biru" data-p="serah:' + id + '"' + (!f || !I.hariIni || ACC.kirim === x.id ? ' disabled' : '') + '>' + (ACC.kirim === x.id ? 'Mengunggah foto…' : !I.hariIni ? 'Serah terima ' + esc(I.label) : 'Selesai · sudah diserahkan') + '</button></div>';
    } else if (x.status === 'SELESAI') {
      h += '<div class="kecil" style="margin-top:8px">ACC ' + esc(x.accOleh || '-') + ' · diserahkan ' + esc(x.diserahkanOleh || '') + (x.waktuSerah ? ' · ' + waktu(x.waktuSerah) : '') + (x.catatan ? '<br>' + esc(x.catatan) : '') + '</div>';
      if (x.adaFoto) h += '<div class="pnTb"><button type="button" data-p="foto:' + id + '">📷 Lihat foto bukti</button></div>';
    }
    return h + '</div>';
  }
  function putus(id, setuju, alasan) {
    ACC.kirim = id; ACC.yakin = ''; gambarUlangAcc();
    panggil('pusatTukarPutus', [id, !!setuju, alasan || ''], 45000).then(function (h) {
      ACC.kirim = ''; if (habis(h)) return;
      if (!h || !h.ok) { roti((h && h.pesan) || 'Belum tersimpan.'); muatAcc(); return; }
      if (R.bunyi) R.bunyi('sukses'); if (R.getar) R.getar('sukses');
      roti(setuju ? 'Di-ACC. Penerima dapat notifikasi "siap ambil".' : 'Ditolak. Poin dikembalikan ke pemiliknya.');
      delete ACC.tolak[id]; muatAcc(); perbarui();
    }, function (e) { ACC.kirim = ''; roti(e.message); gambarUlangAcc(); });
  }
  function serah(id) {
    var f = ACC.foto[id]; if (!f) { roti('Foto bukti serah terima wajib.'); return; }
    var I = infoTukar(ACC.d && ACC.d.bukaTukar); if (!I.hariIni) { roti('Serah terima hadiah hanya hari ' + I.label + '.'); return; }
    ACC.kirim = id; gambarUlangAcc();
    panggil('pusatTukarSerah', [{ id: id, foto: f, catatan: ACC.catatan[id] || '' }], 90000).then(function (h) {
      ACC.kirim = ''; if (habis(h)) return;
      if (!h || !h.ok) { roti((h && h.pesan) || 'Belum tersimpan.'); gambarUlangAcc(); return; }
      delete ACC.foto[id]; delete ACC.catatan[id]; ACC.selesai = null;
      if (R.bunyi) R.bunyi('sukses'); if (R.getar) R.getar('sukses'); roti('Selesai. Foto bukti tersimpan, penerima bisa melihatnya.');
      muatAcc();
    }, function (e) { ACC.kirim = ''; roti(e.message + ' — foto masih tersimpan di layar, coba kirim lagi.'); gambarUlangAcc(); });
  }
  var MAKS_FOTO = 900000; /* dataURL ±650 KB; server maks 8 MB */
  function kompres(file) {
    return new Promise(function (ok, gagal) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, hh = img.naturalHeight, sk = Math.min(1, 1600 / Math.max(w, hh)), q = 0.82, d = '';
        for (var i = 0; i < 10; i++) {
          var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * sk)); c.height = Math.max(1, Math.round(hh * sk));
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          d = c.toDataURL('image/jpeg', q); if (d.length <= MAKS_FOTO) break;
          if (q > 0.5) q -= 0.12; else sk *= 0.8;
        }
        URL.revokeObjectURL(url); if (d.length > MAKS_FOTO) gagal(new Error('Foto terlalu besar.')); else ok(d);
      };
      img.onerror = function () { URL.revokeObjectURL(url); gagal(new Error('Foto tidak bisa dibaca. Coba foto lain.')); };
      img.src = url;
    });
  }

  /* ================= 4. REKAP TUKAR (admin / pimpinan) ================= */
  var REK = { bulan: '', status: '', nama: '', d: null, jalan: false };
  function bulanIni() { return ymd(sekarangWib()).slice(0, 7); }
  function labelBulan(b) { var m = String(b || '').match(/^(\d{4})-(\d{2})$/); return m ? BLN[+m[2] - 1] + ' ' + m[1] : 'Semua bulan'; }
  function bukaRekap() { layar = 'rekap'; if (!REK.bulan && REK.bulan !== 'semua') REK.bulan = bulanIni(); muatRekap(); }
  function filter() { return { bulan: REK.bulan === 'semua' ? '' : REK.bulan, status: REK.status, nama: REK.nama }; }
  function muatRekap() {
    REK.jalan = true; lapis('Rekap tukar poin', 'Admin / pimpinan', gambarRekap());
    panggil('pusatTukarRekap', [filter()], 60000).then(function (h) {
      REK.jalan = false; if (habis(h) || !lapisEl || layar !== 'rekap') return;
      if (h && h.aktif === false) { lapis('Rekap tukar poin', 'Admin / pimpinan', kosong('rekapTukar', 'Poin WHL belum dibuka', h.pesan || '')); return; }
      if (!h || h.ok === false) { lapis('Rekap tukar poin', 'Admin / pimpinan', kosong('rekapTukar', 'Tidak bisa dibuka', (h && h.pesan) || '')); return; }
      REK.d = h; lapis('Rekap tukar poin', labelBulan(REK.bulan === 'semua' ? '' : REK.bulan), gambarRekap());
    }, function (e) { REK.jalan = false; if (lapisEl && layar === 'rekap') { roti(e.message); lapis('Rekap tukar poin', 'Admin / pimpinan', gambarRekap()); } });
  }
  function kolomIdx(k, nama) { return (k || []).map(function (s) { return String(s).toLowerCase(); }).indexOf(String(nama).toLowerCase()); }
  function gambarRekap() {
    var opsiB = ['<option value="semua"' + (REK.bulan === 'semua' ? ' selected' : '') + '>Semua bulan</option>'], d0 = sekarangWib();
    for (var i = 0; i < 12; i++) { var t = new Date(d0.getFullYear(), d0.getMonth() - i, 1), v = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0'); opsiB.push('<option value="' + v + '"' + (REK.bulan === v ? ' selected' : '') + '>' + labelBulan(v) + '</option>'); }
    var ST_OPSI = [['', 'Semua status'], ['DIAJUKAN', 'Nunggu ACC'], ['SIAP_AMBIL', 'Siap ambil'], ['SELESAI', 'Selesai'], ['DITOLAK', 'Ditolak'], ['DIBATALKAN', 'Dibatalkan']];
    var h = '<div class="kartu"><div class="pnSaring"><select class="pnIn" data-r="bulan" aria-label="Bulan">' + opsiB.join('') + '</select><select class="pnIn" data-r="status" aria-label="Status">' + ST_OPSI.map(function (o) { return '<option value="' + o[0] + '"' + (REK.status === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'
      + '<div class="lebar"><input class="pnIn" data-r="nama" placeholder="Cari nama" value="' + esc(REK.nama) + '" autocomplete="off"><button type="button" data-p="cariRekap">Cari</button></div></div></div>';
    var D = REK.d;
    if (REK.jalan && !D) return h + memuat();
    if (!D) return h;
    var T = D.total || {}, K = D.kolom || [], B = D.baris || [];
    h += '<div class="pnTot"><div><small>Tukar sah</small><b>' + ang(T.jumlah) + '</b></div><div><small>Total poin</small><b>' + ang(T.poin) + '</b></div><div><small>Perkiraan</small><b style="font-size:14px">' + rp(T.rupiah) + '</b></div></div>';
    h += '<div class="pnUnduh"><button type="button" data-p="excel"' + (B.length ? '' : ' disabled') + '>📊 Excel (.xlsx)</button><button type="button" data-p="pdf"' + (B.length && punya('pusatTukarRekapPdf') ? '' : ' disabled') + '>📄 PDF + foto bukti</button></div>';
    if ((D.perBulan || []).length) h += '<div class="kartu"><div class="pnJd"><b>Per bulan</b><span>ditolak/batal tidak dihitung</span></div><table class="pnTabel"><tr><th>Bulan</th><th>Tukar</th><th>Poin</th><th>Rupiah</th></tr>' + D.perBulan.map(function (b) { return '<tr><td>' + esc(labelBulan(b.bulan)) + '</td><td>' + ang(b.jumlah) + '</td><td>' + ang(b.poin) + '</td><td>' + rp(b.rupiah) + '</td></tr>'; }).join('') + '</table></div>';
    var iN = kolomIdx(K, 'Nama'), iP = kolomIdx(K, 'Peran'), iL = kolomIdx(K, 'Lambung'), iH = kolomIdx(K, 'Hadiah'), iPo = kolomIdx(K, 'Poin'), iT = kolomIdx(K, 'Tgl ajuan'), iS = kolomIdx(K, 'Status'), iA = kolomIdx(K, 'ACC oleh'), iTs = kolomIdx(K, 'Tgl serah'), iD = kolomIdx(K, 'Diserahkan oleh'), iId = kolomIdx(K, 'ID');
    var g = function (r, i) { return i >= 0 ? r[i] : ''; };
    h += '<h2 class="bagW">Daftar tukar <span>' + B.length + '</span></h2><div class="kartu">' + (B.length ? B.slice(0, 300).map(function (r) {
      var st = g(r, iS), id = g(r, iId);
      return '<div class="pnTk"><div class="pnTkAtas">' + ILUS(ikonBarang(g(r, iH))) + '<div class="tx"><b>' + esc(g(r, iH)) + ' · ' + ang(g(r, iPo)) + ' poin</b><small>' + esc(g(r, iN)) + (g(r, iP) ? ' (' + esc(g(r, iP)) + ')' : '') + (g(r, iL) ? ' · ' + esc(g(r, iL)) : '') + '</small>'
        + '<small>Ajuan ' + waktu(g(r, iT)) + (g(r, iA) ? ' · ACC ' + esc(g(r, iA)) : '') + (g(r, iTs) ? ' · diserahkan ' + waktu(g(r, iTs)) + ' oleh ' + esc(g(r, iD)) : '') + '</small>' + lencanaSt(st) + '</div></div>'
        + (st === 'SELESAI' && id && punya('pusatTukarFoto') ? '<div class="pnTb"><button type="button" data-p="foto:' + esc(id) + '">📷 Foto bukti</button></div>' : '') + '</div>';
    }).join('') : '<div class="kecil">Tidak ada data untuk saringan ini.</div>') + '</div>';
    if (B.length > 300) h += '<div class="kecil" style="text-align:center">Tampil 300 baris pertama. Semua baris ada di Excel / PDF.</div>';
    return h;
  }
  function namaBerkas(ext) { return 'Rekap Tukar Poin WHL - ' + (REK.bulan === 'semua' ? 'Semua bulan' : labelBulan(REK.bulan)) + (REK.status ? ' - ' + REK.status : '') + '.' + ext; }
  function excel() {
    var D = REK.d; if (!D) return;
    try {
      var K = (D.kolom || []).slice(), B = D.baris || [], iS = kolomIdx(K, 'Status'), iF = -1;
      K.forEach(function (k, i) { if (/foto|link/i.test(k)) iF = i; });
      var rows = B.map(function (r) {
        var x = r.map(function (v, i) { if (typeof v === 'string' && /^https?:\/\//.test(v)) return { url: v, teks: i === iF ? 'Lihat foto' : 'Buka' }; return v; });
        if (iF < 0) x.push(iS >= 0 && r[iS] === 'SELESAI' ? 'ada (lihat PDF / app)' : '-');
        return x;
      });
      var kepala = iF < 0 ? K.concat(['Foto bukti']) : K, T = D.total || {};
      var sh = [['Tukar poin', [kepala].concat(rows)], ['Per bulan', [['Bulan', 'Jumlah tukar', 'Total poin', 'Perkiraan rupiah']].concat((D.perBulan || []).map(function (b) { return [labelBulan(b.bulan), Number(b.jumlah) || 0, Number(b.poin) || 0, Number(b.rupiah) || 0]; }), [['TOTAL', Number(T.jumlah) || 0, Number(T.poin) || 0, Number(T.rupiah) || 0]])]];
      var b64 = keB64(xlsx(sh));
      simpanBerkas(namaBerkas('xlsx'), b64, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); roti('Excel disiapkan.');
    } catch (e) { roti('Excel gagal dibuat: ' + e.message); }
  }
  function pdf() {
    roti('Menyiapkan PDF (foto bukti ikut tertanam)…');
    panggil('pusatTukarRekapPdf', [filter()], 120000).then(function (h) {
      if (habis(h)) return; if (!h || !h.ok || !h.b64) { roti((h && h.pesan) || 'PDF belum bisa dibuat.'); return; }
      simpanBerkas(h.nama || namaBerkas('pdf'), h.b64, 'application/pdf');
    }, function (e) { roti(e.message); });
  }
  function simpanBerkas(nama, b64, mime) {
    if (window.WHL_BERKAS) { window.WHL_BERKAS.buka(nama, b64, mime).catch(function (e) { roti(e.message); }); return; }
    try { var bin = atob(b64), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); var url = URL.createObjectURL(new Blob([u8], { type: mime })), l = document.createElement('a'); l.href = url; l.download = nama; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 120000); } catch (e) { roti('Berkas tidak bisa dibuka: ' + e.message); }
  }
  /* XLSX minimal (sama dengan dokumen.js): zip "stored" + CRC32, sel teks inlineStr, angka n, baris pertama tebal, sel {url,teks} = HYPERLINK */
  var CRC = null;
  function crc32(u8) { if (!CRC) { CRC = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } } var x = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) x = CRC[(x ^ u8[i]) & 255] ^ (x >>> 8); return (x ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {
    var enc = new TextEncoder(), bag = [], pusat = [], ofs = 0;
    function u16(v) { return [v & 255, (v >>> 8) & 255]; } function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
    files.forEach(function (f) {
      var nm = enc.encode(f[0]), d = enc.encode(f[1]), c = crc32(d);
      var lok = [].concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(c), u32(d.length), u32(d.length), u16(nm.length), u16(0));
      bag.push(new Uint8Array(lok), nm, d);
      pusat.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0x21), u32(c), u32(d.length), u32(d.length), u16(nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(ofs))), nm);
      ofs += lok.length + nm.length + d.length;
    });
    var cdLen = 0; pusat.forEach(function (a) { cdLen += a.length; });
    var akhir = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cdLen), u32(ofs), u16(0)));
    var semua = bag.concat(pusat, [akhir]), tot = semua.reduce(function (s, a) { return s + a.length; }, 0), out = new Uint8Array(tot), p = 0;
    semua.forEach(function (a) { out.set(a, p); p += a.length; });
    return out;
  }
  function xmlEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
  function kolomX(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function lembarX(baris) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
      + baris.map(function (r, i) { return '<row r="' + (i + 1) + '">' + r.map(function (v, j) { var ref = kolomX(j) + (i + 1), st = i === 0 ? ' s="1"' : '';
        if (v && typeof v === 'object' && v.url) { var fu = String(v.url).replace(/"/g, '""'), ft = String(v.teks || 'Buka').replace(/"/g, '""'); return '<c r="' + ref + '" t="str"><f>' + xmlEsc('HYPERLINK("' + fu + '","' + ft + '")') + '</f><v>' + xmlEsc(v.teks || 'Buka') + '</v></c>'; }
        if (v && typeof v === 'object') v = '';
        return typeof v === 'number' && isFinite(v) ? '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>' : '<c r="' + ref + '" t="inlineStr"' + st + '><is><t xml:space="preserve">' + xmlEsc(v) + '</t></is></c>'; }).join('') + '</row>'; }).join('')
      + '</sheetData></worksheet>';
  }
  function xlsx(sheets) {
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
      + sheets.map(function (s, i) { return '<sheet name="' + xmlEsc(s[0]) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>';
    var wbr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('')
      + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    var sty = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
      + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs>'
      + '<cellXfs count="2"><xf fontId="0"/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>';
    var f = [['[Content_Types].xml', ct], ['_rels/.rels', rels], ['xl/workbook.xml', wb], ['xl/_rels/workbook.xml.rels', wbr], ['xl/styles.xml', sty]];
    sheets.forEach(function (s, i) { f.push(['xl/worksheets/sheet' + (i + 1) + '.xml', lembarX(s[1])]); });
    return zip(f);
  }
  function keB64(u8) { var s = '', i; for (i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }

  /* ---------- klik & isian di lapis ---------- */
  function klik(ev) {
    var b = ev.target.closest('[data-p]'); if (!b || !lapisEl || !lapisEl.contains(b)) return; var n = b.getAttribute('data-p');
    if (n === 'tutup') { if (R.bunyi) R.bunyi('tutup'); tutup(); return; }
    if (n === 'ulangPoin') { bukaPoin(); return; }
    if (n === 'ulangKat') { bukaKatalog(); return; }
    if (n === 'katalog') { bukaKatalog(); return; }
    if (n === 'sanggah') { sanggah(); return; } /* v3.36 */
    if (n === 'peringkat') { if (window.WHL_PERINGKAT) window.WHL_PERINGKAT.buka(CTX); return; }
    if (n === 'acc') { bukaAcc(); return; }
    if (n === 'rekap') { bukaRekap(); return; }
    if (n.indexOf('gbLihat:') === 0) { lihatGambar(n.slice(8)); return; } /* poin-gambar-hadiah-20nov */
    if (n.indexOf('gbGanti:') === 0) { bukaGantiGb(n.slice(8)); return; }
    if (n.indexOf('tukar:') === 0) { ajukanTukar(n.slice(6)); return; }
    if (n.indexOf('batal:') === 0) { batalTukar(n.slice(6)); return; }
    if (n.indexOf('foto:') === 0) { lihatFoto(n.slice(5), 'Foto diambil admin saat hadiah diserahkan.'); return; }
    if (n.indexOf('tab:') === 0) { ACC.tab = n.slice(4); ACC.yakin = ''; gambarUlangAcc(); if (ACC.tab === 'selesai' && !ACC.selesai) muatAcc(); return; }
    if (n.indexOf('acc:') === 0) {
      var ia = n.slice(4); if (ACC.kirim) return;
      if (ACC.yakin !== ia) { ACC.yakin = ia; if (R.getar) R.getar(); gambarUlangAcc(); clearTimeout(yakinT); yakinT = setTimeout(function () { if (ACC.yakin === ia) { ACC.yakin = ''; gambarUlangAcc(); } }, 4000); return; } /* pola klik dua kali */
      putus(ia, true, ''); return;
    }
    if (n.indexOf('tolak:') === 0) { ACC.tolak[n.slice(6)] = ''; ACC.yakin = ''; gambarUlangAcc(); var ta = lapisEl.querySelector('[data-tolak="' + n.slice(6) + '"]'); if (ta) ta.focus(); return; }
    if (n.indexOf('tolakBatal:') === 0) { delete ACC.tolak[n.slice(11)]; gambarUlangAcc(); return; }
    if (n.indexOf('tolakKirim:') === 0) { var it = n.slice(11), al = String(ACC.tolak[it] || '').trim(); if (al.length < 3) { roti('Isi alasan penolakan dulu.'); return; } putus(it, false, al); return; }
    if (n.indexOf('hapusFoto:') === 0) { delete ACC.foto[n.slice(10)]; gambarUlangAcc(); return; }
    if (n.indexOf('serah:') === 0) { serah(n.slice(6)); return; }
    if (n === 'cariRekap') { var inp = lapisEl.querySelector('[data-r="nama"]'); REK.nama = inp ? inp.value.trim() : ''; muatRekap(); return; }
    if (n === 'excel') { excel(); return; }
    if (n === 'pdf') { pdf(); return; }
  }
  function ubah(ev) {
    var t = ev.target;
    if (t.hasAttribute('data-foto') && t.files && t.files[0]) {
      var id = t.getAttribute('data-foto'), f = t.files[0]; t.value = '';
      roti('Mengecilkan foto…');
      kompres(f).then(function (d) { ACC.foto[id] = d; gambarUlangAcc(); }, function (e) { roti(e.message); });
      return;
    }
    if (t.hasAttribute('data-r')) { var k = t.getAttribute('data-r'); if (k === 'bulan') { REK.bulan = t.value; muatRekap(); } else if (k === 'status') { REK.status = t.value; muatRekap(); } }
  }
  document.addEventListener('input', function (ev) {
    var t = ev.target; if (!lapisEl || !lapisEl.contains(t)) return;
    if (t.hasAttribute('data-tolak')) ACC.tolak[t.getAttribute('data-tolak')] = t.value;
    if (t.hasAttribute('data-cat')) ACC.catatan[t.getAttribute('data-cat')] = t.value;
  });
  document.addEventListener('keydown', function (ev) { var t = ev.target; if (ev.key === 'Enter' && lapisEl && lapisEl.contains(t) && t.getAttribute('data-r') === 'nama') { REK.nama = t.value.trim(); muatRekap(); } });

  /** tombol Back HP: foto dulu, lalu lapis (dipanggil lewat .ksnKp .kb oleh WHL_KEMBALI; ini cadangan) */
  function kembali() { if (tutupFoto()) return true; if (tutupGb()) return true; return tutup(); } /* poin-gambar-hadiah-20nov: + tutupGb */
  function lupakan() { P = null; P_JALAN = null; KAT = null; ADM = { acc: null, nunggu: 0, t: 0, jalan: false }; ACC = { tab: 'nunggu', d: null, selesai: null, foto: {}, catatan: {}, tolak: {}, yakin: '', kirim: '' }; REK = { bulan: '', status: '', nama: '', d: null, jalan: false }; tutupSemua(); if (window.WHL_POIN_STAF) window.WHL_POIN_STAF.lupakan(); if (window.WHL_KSD) window.WHL_KSD.lupakan(); }

  window.WHL_POIN = { punya: punya, menu: menu, buka: buka, berandaHtml: berandaHtml, bukaNotif: bukaNotif, muat: muat, kembali: kembali, lupakan: lupakan, ilus: ILUS,
    _uji: { infoTukar: infoTukar, ikonBarang: ikonBarang, xlsxB64: function (sh) { return keB64(xlsx(sh)); }, data: function () { return { P: P, ADM: ADM, ACC: ACC, REK: REK, KAT: KAT }; } } };
})();
