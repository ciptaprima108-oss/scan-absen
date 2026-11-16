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
    g: ['#7D8AA3', '#4A5872', '#2B3448'],   // abu ban
    u: ['#C9B8FF', '#7A5CF0', '#4B2FB8'],   // ungu (tahap1-16nov)
    k: ['#5B5F6B', '#2E323B', '#14161B']    // arang / batu bara (tahap1-16nov)
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
  /* laba-pimpinan-15nov: tumpukan koin + panah naik (menu Laba unit pimpinan) */
  B.laba = function (F, K) { return '<ellipse cx="25" cy="49" rx="16" ry="6" fill="' + F('y') + '"/><rect x="9" y="38" width="32" height="11" fill="' + F('y') + '"/><ellipse cx="25" cy="38" rx="16" ry="6" fill="' + F('y') + '"/>'
      + '<rect x="9" y="27" width="32" height="11" fill="' + F('y') + '"/><ellipse cx="25" cy="27" rx="16" ry="6" fill="' + F('y') + '"/><ellipse cx="25" cy="27" rx="16" ry="6" fill="' + K + '"/>'
      + '<path d="M18 27h14" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round"/>'
      + '<path d="M38 40L50 26" fill="none" stroke="' + F('b') + '" stroke-width="7" stroke-linecap="round"/><path d="M42 20h12v12z" fill="' + F('b') + '"/>'; };
  /* gaji-driver-app-15nov: dompet biru + uang kertas toska (Gaji driver) dan lembar ajuan + koin kuning + pena oranye (Ajuan kasbon) */
  B.gaji = function (F, K) { return '<rect x="14" y="10" width="34" height="20" rx="4" fill="' + F('t') + '" transform="rotate(-8 31 20)"/><rect x="18" y="13" width="34" height="20" rx="4" fill="' + F('t') + '" opacity=".85" transform="rotate(6 35 23)"/>'
      + '<rect x="8" y="22" width="48" height="32" rx="9" fill="' + F('b') + '"/><rect x="8" y="22" width="48" height="32" rx="9" fill="' + K + '"/>'
      + '<path d="M8 31h40a8 8 0 0 1 8 8v0" fill="none" stroke="' + F('bt') + '" stroke-width="3" stroke-opacity=".5"/>'
      + '<rect x="38" y="33" width="20" height="13" rx="6.5" fill="' + F('bt') + '"/><circle cx="45" cy="39.5" r="3.6" fill="' + F('y') + '"/>'; };
  B.kasbon = function (F, K) { return '<rect x="10" y="7" width="34" height="46" rx="7" fill="' + F('w') + '"/><rect x="10" y="7" width="34" height="46" rx="7" fill="' + K + '"/>'
      + '<path d="M17 18h20M17 25h20M17 32h12" stroke="' + F('b') + '" stroke-width="3.4" stroke-linecap="round"/>'
      + '<path d="M17 44c3-4 5 2 8-1s4-3 6 0" fill="none" stroke="' + F('bt') + '" stroke-width="2.4" stroke-linecap="round"/>'
      + '<circle cx="45" cy="44" r="13" fill="' + F('y') + '"/><circle cx="45" cy="44" r="13" fill="' + K + '"/><circle cx="45" cy="44" r="9" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>'
      + '<text x="45" y="48.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="11.5" fill="#9a5b00">Rp</text>'; };
  /* tahap1-16nov (rancangan app-beranda-poin-16nov §2): 7 ikon kembar diganti bentuk sendiri-sendiri */
  function kilau(x, y) { return '<path d="M' + x + ' ' + (y - 4) + 'l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z" fill="#fff"/>'; }
  B.notaBengkel = function (F, K) { return '<path d="M10 10a4 4 0 0 1 4-4h26a4 4 0 0 1 4 4v44l-4-2.6-4 2.6-4-2.6-4 2.6-4-2.6-4 2.6-4-2.6-4 2.6-2-1.3z" fill="' + F('w') + '"/><path d="M10 10a4 4 0 0 1 4-4h26a4 4 0 0 1 4 4v44l-4-2.6-4 2.6-4-2.6-4 2.6-4-2.6-4 2.6-4-2.6-4 2.6-2-1.3z" fill="' + K + '"/>'
      + '<path d="M16 16h18M16 23h22M16 30h14" stroke="#9CC3F2" stroke-width="3.2" stroke-linecap="round"/><path d="M16 40h10" stroke="' + F('o') + '" stroke-width="3.6" stroke-linecap="round"/>'
      + '<g transform="rotate(45 47 41)"><rect x="43.5" y="38" width="7" height="24" rx="3.5" fill="' + F('o') + '"/><circle cx="47" cy="34" r="9.5" fill="' + F('o') + '"/><rect x="44" y="23" width="6" height="10" rx="1.5" fill="' + F('w') + '"/><circle cx="47" cy="34" r="9.5" fill="' + K + '"/></g>' + kilau(54, 10); };
  B.dokKasbon = function (F, K) { return '<path d="M6 17a5 5 0 0 1 5-5h13l5 5h24a5 5 0 0 1 5 5v6H6z" fill="' + F('o') + '"/>'
      + '<rect x="13" y="13" width="34" height="26" rx="3" fill="' + F('w') + '" transform="rotate(-6 30 26)"/><path d="M18 21h18M18 27h12" stroke="#9CC3F2" stroke-width="3" stroke-linecap="round" transform="rotate(-6 30 26)"/>'
      + '<path d="M6 27h52v22a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6z" fill="' + F('y') + '"/><path d="M6 27h52v22a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6z" fill="' + K + '"/><rect x="14" y="33" width="14" height="4" rx="2" fill="#fff" opacity=".7"/>'
      + '<circle cx="47" cy="45" r="11" fill="' + F('t') + '"/><circle cx="47" cy="45" r="11" fill="' + K + '"/><circle cx="47" cy="45" r="7.6" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="1.8"/><text x="47" y="49" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="10" fill="#fff">Rp</text>'; };
  B.menuInput = function (F, K) { return '<rect x="12" y="4" width="30" height="54" rx="8" fill="' + F('bt') + '"/><rect x="12" y="4" width="30" height="54" rx="8" fill="' + K + '"/><rect x="15.5" y="10" width="23" height="40" rx="4" fill="' + F('w') + '"/>'
      + '<rect x="19" y="14" width="16" height="5" rx="2.5" fill="#B9D3F3"/><rect x="19" y="22" width="16" height="5" rx="2.5" fill="#B9D3F3"/><rect x="19" y="30" width="11" height="5" rx="2.5" fill="#B9D3F3"/><rect x="19" y="40" width="16" height="6" rx="3" fill="' + F('t') + '"/><rect x="23" y="53" width="8" height="2.4" rx="1.2" fill="#fff" opacity=".6"/>'
      + '<circle cx="47" cy="43" r="11" fill="' + F('o') + '"/><circle cx="47" cy="43" r="11" fill="' + K + '"/><path d="M47 37.5v11M41.5 43h11" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>' + kilau(52, 12); };
  B.posKontrol = function (F, K) { return '<rect x="7" y="24" width="24" height="31" rx="3" fill="' + F('b') + '"/><rect x="7" y="24" width="24" height="31" rx="3" fill="' + K + '"/><path d="M3 26L19 13l16 13z" fill="' + F('r') + '"/><path d="M3 26L19 13l16 13z" fill="' + K + '"/>'
      + '<rect x="11" y="30" width="16" height="11" rx="2" fill="#CFE7FF"/><path d="M13 31l5 9" stroke="#fff" stroke-width="2" opacity=".7"/><rect x="16" y="45" width="6" height="10" rx="1" fill="' + F('bt') + '"/>'
      + '<circle cx="19" cy="9" r="4.5" fill="' + F('y') + '"/><circle cx="19" cy="9" r="8" fill="#FFC530" opacity=".25"/>'
      + '<rect x="35" y="37" width="7" height="18" rx="2.5" fill="' + F('g') + '"/><g transform="rotate(-14 38 37)"><rect x="36" y="33" width="26" height="7" rx="3.5" fill="' + F('w') + '"/><rect x="41" y="33" width="5" height="7" fill="' + F('r') + '"/><rect x="51" y="33" width="5" height="7" fill="' + F('r') + '"/></g><circle cx="38.5" cy="37" r="3.6" fill="' + F('y') + '"/>'; };
  B.dashProduksi = function (F, K) { return '<path d="M5 42a27 27 0 0 1 54 0v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z" fill="' + F('bt') + '"/><path d="M5 42a27 27 0 0 1 54 0v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z" fill="' + K + '"/>'
      + '<g fill="none" stroke-width="5.5" stroke-linecap="round"><path d="M13 43a19 19 0 0 1 7.5-15.1" stroke="' + F('t') + '"/><path d="M25.5 25.2a19 19 0 0 1 13 0" stroke="' + F('y') + '"/><path d="M43.5 27.9A19 19 0 0 1 51 43" stroke="' + F('o') + '"/></g>'
      + '<path d="M32 43L45 29" stroke="#fff" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="43" r="5.5" fill="' + F('w') + '"/><circle cx="32" cy="43" r="2" fill="' + F('r') + '"/>'
      + '<path d="M8 60l3-6 6-1 4 3-1 4z" fill="' + F('k') + '"/><path d="M44 60l2-5 5 0 3 3-1 2z" fill="' + F('k') + '"/><path d="M11 55l3 0" stroke="#fff" stroke-opacity=".5" stroke-width="1.4"/>'; };
  B.proyeksi = function (F, K) { return '<circle cx="28" cy="36" r="22" fill="' + F('r') + '"/><circle cx="28" cy="36" r="22" fill="' + K + '"/><circle cx="28" cy="36" r="15" fill="' + F('w') + '"/><circle cx="28" cy="36" r="8.5" fill="' + F('r') + '"/><circle cx="28" cy="36" r="3.4" fill="' + F('w') + '"/>'
      + '<path d="M29 35L51 13" stroke="' + F('bt') + '" stroke-width="4" stroke-linecap="round"/><path d="M48 8l4.5 1.5L51 14l4.5 1.5L60 10 55 5z" fill="' + F('y') + '"/><path d="M48 8l7-3 5 5-4 1z" fill="' + F('o') + '"/>' + kilau(10, 12); };
  B.kuota107 = function (F, K) { return '<circle cx="29" cy="30" r="23" fill="' + F('b') + '"/><path d="M29 30V7a23 23 0 0 1 21.9 16z" fill="' + F('y') + '"/><path d="M29 30l21.9-7A23 23 0 0 1 44 47.5z" fill="' + F('o') + '"/><circle cx="29" cy="30" r="23" fill="' + K + '"/><circle cx="29" cy="30" r="9" fill="' + F('bt') + '"/>'
      + '<rect x="30" y="42" width="30" height="17" rx="8.5" fill="' + F('t') + '"/><rect x="30" y="42" width="30" height="17" rx="8.5" fill="' + K + '"/><text x="45" y="54.5" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="900" font-size="12" fill="#fff">107</text>'; };
  /* tahap2-16nov: ikon menu driver (rancangan §2): ID card, DO saya, Dokumen saya, P2H harian */
  B.idcard = function (F, K) { return '<rect x="10" y="4" width="44" height="56" rx="9" fill="' + F('b') + '"/><rect x="10" y="4" width="44" height="56" rx="9" fill="' + K + '"/><rect x="26" y="1" width="12" height="7" rx="3" fill="' + F('g') + '"/>'
      + '<circle cx="32" cy="22" r="8" fill="' + F('y') + '"/><path d="M20 38c2-6 7-8 12-8s10 2 12 8z" fill="' + F('w') + '"/>'
      + '<rect x="17" y="41" width="30" height="15" rx="3" fill="#fff"/><g fill="#0B2F6B"><rect x="19" y="43" width="5" height="5"/><rect x="40" y="43" width="5" height="5"/><rect x="19" y="49" width="5" height="5"/><rect x="26" y="44" width="3" height="3"/><rect x="31" y="47" width="3" height="3"/><rect x="35" y="43" width="3" height="3"/><rect x="27" y="50" width="3" height="3"/><rect x="34" y="51" width="3" height="3"/><rect x="40" y="50" width="3" height="3"/></g>'; };
  B.doSaya = function (F, K) { return '<path d="M12 6h32a4 4 0 0 1 4 4v44l-4-2.6-4 2.6-4-2.6-4 2.6-4-2.6-4 2.6-4-2.6-4 2.6-4-2.6z" fill="' + F('w') + '"/><path d="M12 6h32a4 4 0 0 1 4 4v44l-4-2.6-4 2.6-4-2.6-4 2.6-4-2.6-4 2.6-4-2.6-4 2.6-4-2.6z" fill="' + K + '"/>'
      + '<rect x="12" y="6" width="36" height="10" rx="4" fill="' + F('o') + '"/><text x="30" y="14.5" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="900" font-size="8" fill="#fff">DO</text>'
      + '<g fill="#2B3448"><rect x="16" y="22" width="2" height="12"/><rect x="20" y="22" width="1" height="12"/><rect x="23" y="22" width="3" height="12"/><rect x="28" y="22" width="1" height="12"/><rect x="31" y="22" width="2" height="12"/><rect x="35" y="22" width="1" height="12"/><rect x="38" y="22" width="3" height="12"/></g><path d="M16 40h18" stroke="#9CC3F2" stroke-width="3" stroke-linecap="round"/>'
      + '<circle cx="48" cy="46" r="11" fill="' + F('t') + '"/><circle cx="48" cy="46" r="11" fill="' + K + '"/><path d="M43 46l3.5 3.5 6.5-7" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>'; };
  B.dokSaya = function (F, K) { return '<rect x="14" y="8" width="38" height="28" rx="6" fill="' + F('t') + '" transform="rotate(8 33 22)"/><rect x="8" y="14" width="40" height="30" rx="6" fill="' + F('b') + '"/><rect x="8" y="14" width="40" height="30" rx="6" fill="' + K + '"/>'
      + '<circle cx="19" cy="27" r="5" fill="' + F('y') + '"/><path d="M28 24h14M28 31h10M13 38h28" stroke="#fff" stroke-opacity=".8" stroke-width="2.8" stroke-linecap="round"/>'
      + '<circle cx="46" cy="46" r="13" fill="' + F('w') + '"/><circle cx="46" cy="46" r="13" fill="none" stroke="' + F('o') + '" stroke-width="4"/><path d="M46 39v8l5 3" fill="none" stroke="' + F('o') + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>'; };
  B.p2h = function (F, K) { return '<rect x="10" y="9" width="38" height="49" rx="8" fill="' + F('w') + '"/><rect x="10" y="9" width="38" height="49" rx="8" fill="' + K + '"/><rect x="20" y="5" width="18" height="9" rx="4" fill="' + F('o') + '"/>'
      + '<path d="M17 25l3 3 5-6M17 37l3 3 5-6" fill="none" stroke="' + F('t') + '" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 25h11M30 37h9" stroke="#B9D3F3" stroke-width="3.2" stroke-linecap="round"/>'
      + '<g transform="rotate(-35 48 46)"><rect x="45" y="40" width="6" height="20" rx="3" fill="' + F('b') + '"/><circle cx="48" cy="38" r="7" fill="' + F('b') + '"/><rect x="46" y="30" width="4" height="7" fill="' + F('w') + '"/></g>'; };
  /* v3.29 katalog-unit-16nov: buku katalog biru + truk kecil di sampul + pita penanda kuning (beda dari ikon Unit) */
  B.katalog = function (F, K) { return '<rect x="14" y="6" width="40" height="50" rx="6" fill="' + F('w') + '"/><rect x="10" y="8" width="40" height="50" rx="6" fill="' + F('bt') + '"/><rect x="10" y="8" width="40" height="50" rx="6" fill="' + K + '"/><rect x="10" y="8" width="7" height="50" rx="3" fill="' + F('b') + '"/>'
      + '<g transform="translate(19 22) scale(.5)"><path d="M5 18h30l5 20H9z" fill="' + F('o') + '"/><path d="M38 22h10c2 0 3.4 1 4.4 2.6L58 34v8H38z" fill="' + F('w') + '"/><rect x="6" y="37" width="52" height="7" rx="3" fill="' + F('w') + '"/><circle cx="16" cy="46" r="7" fill="' + F('g') + '"/><circle cx="47" cy="46" r="7" fill="' + F('g') + '"/></g>'
      + '<path d="M21 46h22M21 51h14" stroke="#fff" stroke-opacity=".75" stroke-width="2.6" stroke-linecap="round"/><path d="M40 4h9v18l-4.5-3.5L40 22z" fill="' + F('y') + '"/>'; };
  /* tahap3-5 Andro-A (rancangan app-beranda-poin-16nov): kuis safety, cuaca, ulang tahun (slide banner + menu Kuis) */
  B.kuis = function (F, K) { return '<path d="M14 8h32a10 10 0 0 1 10 10v18a10 10 0 0 1-10 10H28l-11 9v-9h-3A10 10 0 0 1 4 36V18A10 10 0 0 1 14 8z" fill="' + F('t') + '"/><path d="M14 8h32a10 10 0 0 1 10 10v18a10 10 0 0 1-10 10H28l-11 9v-9h-3A10 10 0 0 1 4 36V18A10 10 0 0 1 14 8z" fill="' + K + '"/>'
      + '<text x="30" y="38" text-anchor="middle" font-family="Nunito,Arial,sans-serif" font-weight="900" font-size="27" fill="#fff">?</text><path d="M52 34l-6 11h5l-3 10 9-13h-5l3-8z" fill="' + F('y') + '"/>'; };
  B.cuaca = function (F, K) { return '<circle cx="40" cy="22" r="13" fill="' + F('y') + '"/><circle cx="40" cy="22" r="13" fill="' + K + '"/><g stroke="#FFC530" stroke-width="3" stroke-linecap="round"><path d="M40 3v3M55 9l-2 2M59 22h-3M25 9l2 2"/></g>'
      + '<path d="M16 46a10 10 0 0 1 1-20 13 13 0 0 1 24-2 9 9 0 0 1 9 11 8 8 0 0 1-3 15H16a2 2 0 0 1 0-4z" fill="' + F('w') + '"/><path d="M16 46a10 10 0 0 1 1-20 13 13 0 0 1 24-2 9 9 0 0 1 9 11 8 8 0 0 1-3 15H16z" fill="' + K + '"/>'
      + '<g stroke="' + F('b') + '" stroke-width="3.4" stroke-linecap="round"><path d="M20 54l-2 5M30 54l-2 5M40 54l-2 5"/></g>'; };
  B.ultah = function (F, K) { return '<rect x="8" y="36" width="48" height="20" rx="6" fill="' + F('u') + '"/><rect x="8" y="36" width="48" height="20" rx="6" fill="' + K + '"/><rect x="13" y="24" width="38" height="14" rx="5" fill="' + F('r') + '"/><rect x="13" y="24" width="38" height="14" rx="5" fill="' + K + '"/>'
      + '<path d="M13 30q4 5 8 0t8 0 8 0 8 0 6 0v-3H13z" fill="#fff"/><path d="M8 43q5 5 10 0t10 0 10 0 10 0 8 0v-3H8z" fill="#fff" opacity=".9"/>'
      + '<rect x="21" y="12" width="4" height="12" rx="2" fill="' + F('b') + '"/><rect x="30" y="10" width="4" height="14" rx="2" fill="' + F('t') + '"/><rect x="39" y="12" width="4" height="12" rx="2" fill="' + F('y') + '"/>'
      + '<path d="M23 5q3 4 0 6-3-2 0-6zM32 3q3 4 0 6-3-2 0-6zM41 5q3 4 0 6-3-2 0-6z" fill="' + F('o') + '"/>'; };
  /* tahap36-17nov B: Kondisi jalan (jalan + kerucut), Lapor hazard (segitiga + kamera), Validasi hazard (segitiga + centang) — dari rancangan.html */
  B.jalan = function (F, K) { return '<path d="M24 8h16l18 48H6z" fill="' + F('g') + '"/><path d="M24 8h16l18 48H6z" fill="' + K + '"/><path d="M32 12v6M32 24v8M32 38v10" stroke="#FFE58A" stroke-width="3" stroke-linecap="round"/>'
      + '<path d="M48 26l7 26H41z" fill="' + F('o') + '"/><path d="M45.5 36h5M43.8 43h8.4" stroke="#fff" stroke-width="3"/><rect x="38" y="51" width="20" height="5" rx="2" fill="' + F('o') + '"/>'; };
  B.hazard = function (F, K) { return '<path d="M32 6l25 44a4 4 0 0 1-3.5 6h-43A4 4 0 0 1 7 50z" fill="' + F('y') + '"/><path d="M32 6l25 44a4 4 0 0 1-3.5 6h-43A4 4 0 0 1 7 50z" fill="' + K + '"/><rect x="28.5" y="21" width="7" height="18" rx="3.5" fill="#3b2a00"/><circle cx="32" cy="46" r="4" fill="#3b2a00"/>'
      + '<circle cx="51" cy="14" r="9" fill="' + F('b') + '"/><rect x="46" y="11" width="10" height="7" rx="2" fill="#fff"/><circle cx="51" cy="14.5" r="2" fill="' + F('b') + '"/>'; };
  B.hazardCek = function (F, K) { return '<path d="M28 8l23 40a4 4 0 0 1-3.5 6H8.5A4 4 0 0 1 5 48z" fill="' + F('y') + '"/><path d="M28 8l23 40a4 4 0 0 1-3.5 6H8.5A4 4 0 0 1 5 48z" fill="' + K + '"/><rect x="24.8" y="21" width="6.4" height="16" rx="3.2" fill="#3b2a00"/><circle cx="28" cy="44" r="3.6" fill="#3b2a00"/>'
      + '<circle cx="47" cy="45" r="12" fill="' + F('t') + '"/><path d="M41.5 45.5l4 4 7.5-8" stroke="#fff" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'; };
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
