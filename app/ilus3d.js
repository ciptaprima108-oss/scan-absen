/* WHL App v3.8 — IKON ILUSTRASI 3D LEMBUT untuk layanan (grid Beranda, lembar Lainnya, Kotak masuk, Aplikasi).
 * Digambar sendiri sebagai SVG berlapis gradien: badan berwarna penuh, sorot cahaya putih di kiri atas, bayangan jatuh halus.
 * Palet WHL: biru (#1565C0 / #1E88E5 / #64B5F6) + putih, aksen kuning, oranye, merah, toska seperlunya. Tidak memakai aset app lain.
 * Pakai: WHL_ILUS('truk') -> string <svg>. Menggantikan WHL_ILUS versi datar di ikon.js (nama sama).
 */
(function () {
  'use strict';
  var n = 0;
  var WARNA = {
    b: ['#7CC0FF', '#1E88E5', '#1257B3'],   // biru WHL
    bt: ['#4F8FE8', '#1650A8', '#0B2F6B'],  // biru tua
    w: ['#FFFFFF', '#EEF5FF', '#CFE0F7'],   // putih
    y: ['#FFE58A', '#FFC530', '#E99A00'],   // kuning
    o: ['#FFB27A', '#FF7A33', '#D9480F'],   // oranye
    r: ['#FF9A9A', '#F2484D', '#B71C2C'],   // merah
    t: ['#8DF0E4', '#20C3B4', '#0B8A80'],   // toska
    g: ['#7D8AA3', '#4A5872', '#2B3448']    // abu ban
  };
  function defs(u) {
    var h = '<defs>';
    Object.keys(WARNA).forEach(function (k) { var c = WARNA[k]; h += '<linearGradient id="' + u + k + '" x1="0.15" y1="0" x2="0.85" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="0.55" stop-color="' + c[1] + '"/><stop offset="1" stop-color="' + c[2] + '"/></linearGradient>'; });
    h += '<radialGradient id="' + u + 'kil" cx="0.3" cy="0.22" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>';
    h += '<filter id="' + u + 'bay" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6"/></filter>';
    h += '<filter id="' + u + 'jatuh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.4" flood-color="#0B2F6B" flood-opacity=".28"/></filter>';
    return h + '</defs>';
  }
  /* bentuk: f(u) -> isi svg. F(k) = url gradien; K = sorot cahaya */
  var B = {
    absen: function (F, K) { return '<rect x="11" y="8" width="42" height="46" rx="13" fill="' + F('b') + '"/><rect x="11" y="8" width="42" height="46" rx="13" fill="' + K + '"/>'
      + '<circle cx="32" cy="27" r="9" fill="' + F('w') + '"/><path d="M17.5 47.5c3-8 8.5-11.5 14.5-11.5s11.5 3.5 14.5 11.5" fill="' + F('w') + '"/>'
      + '<g fill="none" stroke="' + F('y') + '" stroke-width="3.6" stroke-linecap="round"><path d="M7 17V12a6 6 0 0 1 6-6h5M46 6h5a6 6 0 0 1 6 6v5M57 45v5a6 6 0 0 1-6 6h-5M18 56h-5a6 6 0 0 1-6-6v-5"/></g>'; },
    truk: function (F, K) { return '<path d="M5 18h30l5 20H9z" fill="' + F('o') + '"/><path d="M5 18h30l5 20H9z" fill="' + K + '"/><path d="M9 24h26" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>'
      + '<path d="M38 22h10c2 0 3.4 1 4.4 2.6L58 34v8H38z" fill="' + F('b') + '"/><path d="M41 25h7l4.4 6.5H41z" fill="' + F('w') + '"/><rect x="6" y="37" width="52" height="7" rx="3" fill="' + F('bt') + '"/>'
      + '<circle cx="16" cy="46" r="7" fill="' + F('g') + '"/><circle cx="16" cy="46" r="2.8" fill="#DCE6F5"/><circle cx="47" cy="46" r="7" fill="' + F('g') + '"/><circle cx="47" cy="46" r="2.8" fill="#DCE6F5"/>'; },
    forum: function (F, K) { return '<path d="M26 12h24a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8h-2v7l-8-7H26a8 8 0 0 1-8-8V20a8 8 0 0 1 8-8z" fill="' + F('y') + '"/>'
      + '<path d="M14 20h24a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8H23l-9 7v-7a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8z" fill="' + F('b') + '"/><path d="M14 20h24a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8H23l-9 7v-7a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8z" fill="' + K + '"/>'
      + '<circle cx="17" cy="34" r="2.8" fill="#fff"/><circle cx="26" cy="34" r="2.8" fill="#fff"/><circle cx="35" cy="34" r="2.8" fill="#fff"/>'; },
    input: function (F, K) { return '<rect x="9" y="9" width="40" height="44" rx="12" fill="' + F('b') + '"/><rect x="9" y="9" width="40" height="44" rx="12" fill="' + K + '"/>'
      + '<path d="M29 21v20M19 31h20" stroke="#fff" stroke-width="5.5" stroke-linecap="round"/>'
      + '<g transform="rotate(40 49 41)"><rect x="45" y="22" width="8" height="26" rx="2.5" fill="' + F('y') + '"/><path d="M45 48h8l-4 7z" fill="#FFE2B8"/><path d="M47.6 52.6 49 55l1.4-2.4z" fill="#4A5872"/><rect x="45" y="22" width="8" height="5" rx="2" fill="' + F('o') + '"/></g>'; },
    kuesioner: function (F, K) { return '<rect x="11" y="10" width="38" height="46" rx="8" fill="' + F('w') + '"/><rect x="21" y="6" width="18" height="9" rx="4" fill="' + F('b') + '"/>'
      + '<path d="M18 26l3 3 5-6M18 38l3 3 5-6" fill="none" stroke="#1E88E5" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 26h11M31 38h8" stroke="#B9D3F3" stroke-width="3.4" stroke-linecap="round"/>'
      + '<path d="M47 36l3.2 6.5 7.2 1-5.2 5 1.2 7.1L47 52.3l-6.4 3.3 1.2-7.1-5.2-5 7.2-1z" fill="' + F('y') + '"/><path d="M47 36l3.2 6.5 7.2 1-5.2 5 1.2 7.1L47 52.3l-6.4 3.3 1.2-7.1-5.2-5 7.2-1z" fill="' + K + '"/>'; },
    profil: function (F, K) { return '<path d="M20 9h24v14a12 12 0 0 1-24 0z" fill="' + F('y') + '"/><path d="M20 9h24v14a12 12 0 0 1-24 0z" fill="' + K + '"/>'
      + '<path d="M20 13h-6a7 7 0 0 0 7 9M44 13h6a7 7 0 0 1-7 9" fill="none" stroke="' + F('y') + '" stroke-width="3.4" stroke-linecap="round"/>'
      + '<rect x="28" y="34" width="8" height="8" fill="' + F('o') + '"/><rect x="18" y="42" width="28" height="12" rx="4" fill="' + F('b') + '"/><rect x="24" y="46" width="16" height="3.4" rx="1.7" fill="#fff" opacity=".85"/>'
      + '<path d="M32 13l2 4 4.4.6-3.2 3.1.8 4.4-4-2.1-4 2.1.8-4.4-3.2-3.1 4.4-.6z" fill="#fff" opacity=".9"/>'; },
    grafik: function (F, K) { return '<rect x="8" y="34" width="12" height="20" rx="4" fill="' + F('b') + '"/><rect x="25" y="24" width="12" height="30" rx="4" fill="' + F('b') + '"/><rect x="42" y="14" width="12" height="40" rx="4" fill="' + F('bt') + '"/>'
      + '<rect x="8" y="34" width="12" height="20" rx="4" fill="' + K + '"/><rect x="25" y="24" width="12" height="30" rx="4" fill="' + K + '"/>'
      + '<path d="M8 27l13-10 9 6 16-14" fill="none" stroke="' + F('o') + '" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M41 7h8v8" fill="none" stroke="' + F('o') + '" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>'; },
    lainnya: function (F, K) { return '<rect x="8" y="8" width="21" height="21" rx="7" fill="' + F('b') + '"/><rect x="35" y="8" width="21" height="21" rx="7" fill="' + F('y') + '"/><rect x="8" y="35" width="21" height="21" rx="7" fill="' + F('o') + '"/><rect x="35" y="35" width="21" height="21" rx="7" fill="' + F('bt') + '"/>'
      + '<rect x="8" y="8" width="21" height="21" rx="7" fill="' + K + '"/><rect x="35" y="8" width="21" height="21" rx="7" fill="' + K + '"/><rect x="8" y="35" width="21" height="21" rx="7" fill="' + K + '"/><rect x="35" y="35" width="21" height="21" rx="7" fill="' + K + '"/>'; },
    kotak: function (F, K) { return '<path d="M15 14h34l8 22v12a6 6 0 0 1-6 6H13a6 6 0 0 1-6-6V36z" fill="' + F('b') + '"/><path d="M15 14h34l8 22v12a6 6 0 0 1-6 6H13a6 6 0 0 1-6-6V36z" fill="' + K + '"/>'
      + '<rect x="18" y="6" width="28" height="24" rx="3" fill="' + F('w') + '"/><path d="M18 9l14 10 14-10" fill="none" stroke="#7FB2EE" stroke-width="2.6" stroke-linejoin="round"/>'
      + '<path d="M7 36h14l3 6h16l3-6h14v12a6 6 0 0 1-6 6H13a6 6 0 0 1-6-6z" fill="' + F('bt') + '"/>'; },
    lonceng: function (F, K) { return '<path d="M16 42V30a16 16 0 0 1 32 0v12l4 5H12z" fill="' + F('y') + '"/><path d="M16 42V30a16 16 0 0 1 32 0v12l4 5H12z" fill="' + K + '"/>'
      + '<circle cx="32" cy="11" r="4" fill="' + F('o') + '"/><path d="M25 50a7 7 0 0 0 14 0z" fill="' + F('o') + '"/><circle cx="48" cy="16" r="7" fill="' + F('r') + '"/><circle cx="48" cy="16" r="7" fill="' + K + '"/>'; },
    pengumuman: function (F, K) { return '<path d="M10 26h10l22-13v38L20 38H10a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4z" fill="' + F('o') + '"/><path d="M10 26h10l22-13v38L20 38H10a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4z" fill="' + K + '"/>'
      + '<rect x="40" y="10" width="8" height="44" rx="4" fill="' + F('b') + '"/><path d="M14 38l4 14h7l-3-14z" fill="' + F('bt') + '"/>'
      + '<path d="M53 24q4 8 0 16" fill="none" stroke="' + F('y') + '" stroke-width="3.6" stroke-linecap="round"/>'; },
    jadwal: function (F, K) { return '<rect x="8" y="12" width="48" height="44" rx="10" fill="' + F('w') + '"/><path d="M8 22a10 10 0 0 1 10-10h28a10 10 0 0 1 10 10v4H8z" fill="' + F('b') + '"/><path d="M8 22a10 10 0 0 1 10-10h28a10 10 0 0 1 10 10v4H8z" fill="' + K + '"/>'
      + '<rect x="18" y="6" width="5" height="12" rx="2.5" fill="' + F('r') + '"/><rect x="41" y="6" width="5" height="12" rx="2.5" fill="' + F('r') + '"/>'
      + '<g fill="#B9D3F3"><rect x="15" y="32" width="8" height="7" rx="2"/><rect x="28" y="32" width="8" height="7" rx="2"/><rect x="15" y="43" width="8" height="7" rx="2"/><rect x="28" y="43" width="8" height="7" rx="2"/></g><rect x="41" y="32" width="8" height="7" rx="2" fill="' + F('o') + '"/>'; },
    peta: function (F, K) { return '<path d="M6 16l16-6 20 6 16-6v38l-16 6-20-6-16 6z" fill="' + F('w') + '"/><path d="M22 10v38l20 6V16z" fill="#D6E7FB"/>'
      + '<path d="M10 40c8-2 10-10 20-10s12 8 22 4" fill="none" stroke="' + F('b') + '" stroke-width="3" stroke-dasharray="1 5" stroke-linecap="round"/>'
      + '<path d="M44 8a9 9 0 0 1 9 9c0 7-9 15-9 15s-9-8-9-15a9 9 0 0 1 9-9z" fill="' + F('r') + '"/><path d="M44 8a9 9 0 0 1 9 9c0 7-9 15-9 15s-9-8-9-15a9 9 0 0 1 9-9z" fill="' + K + '"/><circle cx="44" cy="17" r="3.4" fill="#fff"/>'; },
    lokasi: function (F, K) { return '<ellipse cx="32" cy="52" rx="12" ry="4" fill="' + F('b') + '" opacity=".45"/><path d="M32 6a16 16 0 0 1 16 16c0 13-16 28-16 28S16 35 16 22A16 16 0 0 1 32 6z" fill="' + F('r') + '"/><path d="M32 6a16 16 0 0 1 16 16c0 13-16 28-16 28S16 35 16 22A16 16 0 0 1 32 6z" fill="' + K + '"/><circle cx="32" cy="22" r="6" fill="#fff"/>'; },
    insiden: function (F, K) { return '<path d="M32 6l21 8v14c0 13-9 22-21 27-12-5-21-14-21-27V14z" fill="' + F('b') + '"/><path d="M32 6l21 8v14c0 13-9 22-21 27-12-5-21-14-21-27V14z" fill="' + K + '"/>'
      + '<rect x="28.5" y="17" width="7" height="20" rx="3.5" fill="' + F('y') + '"/><circle cx="32" cy="44" r="4" fill="' + F('y') + '"/>'; },
    dokumen: function (F, K) { return '<path d="M14 6h24l12 12v34a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6z" fill="' + F('w') + '"/><path d="M38 6v8a4 4 0 0 0 4 4h8z" fill="' + F('y') + '"/>'
      + '<path d="M15 24h18M15 31h24M15 38h14" stroke="#9CC3F2" stroke-width="3.4" stroke-linecap="round"/>'
      + '<g transform="translate(28 38)"><path d="M0 4h14l2 8H2z" fill="' + F('o') + '"/><path d="M16 6h5l4 4v4h-9z" fill="' + F('b') + '"/><rect x="1" y="11" width="25" height="4" rx="2" fill="' + F('bt') + '"/><circle cx="7" cy="17" r="3.4" fill="' + F('g') + '"/><circle cx="21" cy="17" r="3.4" fill="' + F('g') + '"/></g>'; },
    monitor: function (F, K) { return '<g transform="rotate(-40 32 32)"><rect x="28" y="20" width="8" height="36" rx="4" fill="' + F('b') + '"/><rect x="29.5" y="6" width="5" height="16" rx="1.6" fill="#C7D3E6"/><rect x="28" y="20" width="8" height="36" rx="4" fill="' + K + '"/></g>'
      + '<g transform="rotate(40 32 32)"><rect x="28.5" y="24" width="7" height="32" rx="3.5" fill="' + F('o') + '"/><path d="M24 8a10 10 0 0 0 16 0v9a8 8 0 0 1-16 0z" fill="' + F('o') + '"/><rect x="28.5" y="24" width="7" height="32" rx="3.5" fill="' + K + '"/></g>'; },
    solar: function (F, K) { return '<path d="M14 14h22l10 10v26a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6z" fill="' + F('o') + '"/><path d="M14 14h22l10 10v26a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6z" fill="' + K + '"/>'
      + '<rect x="14" y="8" width="14" height="8" rx="3" fill="' + F('bt') + '"/><path d="M16 30l14 14M30 30L16 44" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>'
      + '<path d="M50 26c4 6 7 10 7 14a7 7 0 0 1-14 0c0-4 3-8 7-14z" fill="' + F('b') + '"/><path d="M50 26c4 6 7 10 7 14a7 7 0 0 1-14 0c0-4 3-8 7-14z" fill="' + K + '"/>'; },
    centang: function (F, K) { return '<rect x="9" y="9" width="44" height="44" rx="14" fill="' + F('b') + '"/><rect x="9" y="9" width="44" height="44" rx="14" fill="' + K + '"/><path d="M20 31l8 8 15-16" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="50" cy="14" r="7" fill="' + F('y') + '"/>'; },
    kartuId: function (F, K) { return '<rect x="6" y="14" width="52" height="38" rx="9" fill="' + F('w') + '"/><path d="M6 23a9 9 0 0 1 9-9h34a9 9 0 0 1 9 9v2H6z" fill="' + F('b') + '"/>'
      + '<circle cx="21" cy="36" r="6" fill="' + F('y') + '"/><path d="M12 48c1.6-5 5-7.5 9-7.5s7.4 2.5 9 7.5" fill="' + F('o') + '"/><path d="M35 33h15M35 40h11" stroke="#9CC3F2" stroke-width="3.4" stroke-linecap="round"/><rect x="26" y="8" width="12" height="10" rx="3" fill="' + F('bt') + '"/>'; },
    kreatif: function (F, K) { return '<path d="M27 8l5 14 14 5-14 5-5 14-5-14-14-5 14-5z" fill="' + F('y') + '"/><path d="M27 8l5 14 14 5-14 5-5 14-5-14-14-5 14-5z" fill="' + K + '"/>'
      + '<path d="M47 36l2.8 7.2L57 46l-7.2 2.8L47 56l-2.8-7.2L37 46l7.2-2.8z" fill="' + F('b') + '"/><circle cx="49" cy="14" r="4" fill="' + F('o') + '"/>'; },
    web: function (F, K) { return '<circle cx="32" cy="32" r="23" fill="' + F('b') + '"/><circle cx="32" cy="32" r="23" fill="' + K + '"/>'
      + '<g fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="2.6"><ellipse cx="32" cy="32" rx="10" ry="23"/><path d="M9 32h46M12 21h40M12 43h40"/></g>'; },
    rumahWeb: function (F, K) { return '<path d="M12 30L32 12l20 18v20a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6z" fill="' + F('w') + '"/><path d="M6 31L32 8l26 23" fill="none" stroke="' + F('o') + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<rect x="26" y="38" width="12" height="18" rx="3" fill="' + F('b') + '"/><rect x="26" y="38" width="12" height="18" rx="3" fill="' + K + '"/>'; },
    gudang: function (F, K) { return '<path d="M6 24L32 10l26 14v26a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6z" fill="' + F('b') + '"/><path d="M6 24L32 10l26 14v26a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6z" fill="' + K + '"/>'
      + '<rect x="18" y="32" width="28" height="24" rx="2" fill="' + F('o') + '"/><path d="M18 39h28M18 46h28" stroke="#fff" stroke-opacity=".55" stroke-width="2.4"/>'; },
    akun: function (F, K) { return '<circle cx="32" cy="32" r="24" fill="' + F('y') + '" opacity=".9"/><circle cx="32" cy="25" r="9" fill="' + F('b') + '"/><path d="M15 48c3-9 9.5-13 17-13s14 4 17 13a24 24 0 0 1-34 0z" fill="' + F('b') + '"/><circle cx="32" cy="32" r="24" fill="' + K + '"/>'; },
    alarm: function (F, K) { return '<path d="M32 7l25 44a4 4 0 0 1-3.5 6h-43A4 4 0 0 1 7 51z" fill="' + F('r') + '"/><path d="M32 7l25 44a4 4 0 0 1-3.5 6h-43A4 4 0 0 1 7 51z" fill="' + K + '"/><rect x="28.5" y="22" width="7" height="18" rx="3.5" fill="#fff"/><circle cx="32" cy="47" r="4" fill="#fff"/>'; },
    jam: function (F, K) { return '<circle cx="32" cy="33" r="23" fill="' + F('w') + '"/><circle cx="32" cy="33" r="23" fill="none" stroke="' + F('b') + '" stroke-width="5"/><path d="M32 20v14l9 6" fill="none" stroke="' + F('o') + '" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>'; }
  };
  B.monitorPos = B.monitor;
  var AKA = { notif: 'lonceng', unit: 'truk', skema: 'peta', storing: 'truk', pos: 'monitor', banner: 'pengumuman', kalender: 'jadwal', semua: 'lainnya', kpi: 'profil', ritase: 'grafik', inventaris: 'centang', absensi: 'kartuId' };
  function ilus(nama) {
    var k = B[nama] ? nama : (AKA[nama] || 'lainnya'), u = 'i3' + (++n) + '_';
    var F = function (x) { return 'url(#' + u + x + ')'; }, K = 'url(#' + u + 'kil)';
    return '<svg class="ilus ilus3d" viewBox="0 0 64 64" aria-hidden="true">' + defs(u)
      + '<ellipse cx="32" cy="59" rx="19" ry="3.2" fill="#0B2F6B" opacity=".16" filter="url(#' + u + 'bay)"/>'
      + '<g filter="url(#' + u + 'jatuh)">' + B[k](F, K) + '</g></svg>';
  }
  window.WHL_ILUS = ilus;
  window.WHL_ILUS_DAFTAR = Object.keys(B).filter(function (x) { return x !== 'monitorPos'; });
})();
