/* WHL App v2.16 — ikon garis seragam (24x24, garis 2 px, ujung membulat). Digambar sendiri, bukan aset app lain.
   Pakai: WHL_IKON('truk')  -> string <svg>. Warna mengikuti currentColor. */
(function () {
  var P = {
    beranda: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
    aktivitas: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4V3h6v1"/><path d="M8.5 11h7M8.5 15h4.5"/>',
    forum: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4h0A2.5 2.5 0 0 1 4 13.5z"/><path d="M8.5 8.5h7M8.5 11.5h4.5"/>',
    kotak: '<path d="M4 13.5 6.2 5.6A2 2 0 0 1 8.1 4h7.8a2 2 0 0 1 1.9 1.6L20 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M4 13.5h4.5l1.5 2.5h4l1.5-2.5H20"/>',
    lonceng: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    akun: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c.9-3.6 3.8-5.5 7.5-5.5s6.6 1.9 7.5 5.5"/>',
    absen: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="10.5" r="2.6"/><path d="M8 17c.7-1.9 2.2-3 4-3s3.3 1.1 4 3"/>',
    truk: '<path d="M2.5 6.5h11v9h-11z"/><path d="M13.5 9.5h4l3 3.2v2.8h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    input: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/>',
    kuesioner: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4V3h6v1"/><path d="m8.5 10.5 1.3 1.3 2.4-2.4M8.5 16l1.3 1.3 2.4-2.4M14 11h1.5M14 16.5h1.5"/>',
    profil: '<circle cx="12" cy="9" r="5"/><path d="m9 13.3-1.5 7.2 4.5-2.4 4.5 2.4-1.5-7.2"/>',
    lainnya: '<rect x="4" y="4" width="6" height="6" rx="1.8"/><rect x="14" y="4" width="6" height="6" rx="1.8"/><rect x="4" y="14" width="6" height="6" rx="1.8"/><rect x="14" y="14" width="6" height="6" rx="1.8"/>',
    cari: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    peta: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
    solar: '<path d="M5 20V5.5A1.5 1.5 0 0 1 6.5 4h6A1.5 1.5 0 0 1 14 5.5V20"/><path d="M4 20h11M7.5 8h4"/><path d="M14 10h2a1.5 1.5 0 0 1 1.5 1.5v4.5a1.5 1.5 0 0 0 3 0V8.5L18 6"/>',
    insiden: '<path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.1 7.5 9.5 4.4-1.4 7.5-5.1 7.5-9.5V6z"/><path d="M12 8.5v4M12 15.8v.2"/>',
    dokumen: '<path d="M7 3h7l5 5v11.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 19.5v-15A1.5 1.5 0 0 1 7 3z"/><path d="M13.5 3v5H19M9 13h6M9 16.5h4"/>',
    lokasi: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    grafik: '<path d="M4 19h16"/><path d="m5 15 4.5-4.5 3.5 3L19 7.5"/><path d="M15 7.5h4v4"/>',
    centang: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8.5 12.2 2.4 2.4 4.8-5"/>',
    monitor: '<rect x="3" y="4.5" width="18" height="12" rx="2"/><path d="M9 20h6M12 16.5V20"/><path d="m7 12 2.5-2.5 2 2L16 7"/>',
    kartuId: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16c.5-1.4 1.7-2.2 3.2-2.2s2.7.8 3.2 2.2M14.5 10h4M14.5 13.5h3"/>',
    kreatif: '<path d="M12 3.5 13.8 9l5.7 1.5-5.7 1.5L12 17.5 10.2 12 4.5 10.5 10.2 9z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    jam: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    kanan: '<path d="m9.5 6 6 6-6 6"/>',
    segar: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
    alarm: '<path d="M12 4.5 2.8 19.5h18.4z"/><path d="M12 10v4.2M12 17v.2"/>',
    kunci: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    web: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5s1.1-6.1 3.4-8.5z"/>',
    tutup: '<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>',
    rumahWeb: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9.5 14.5h5"/>',
    gudang: '<path d="M3 9 12 4l9 5v11H3z"/><path d="M7 20v-7h10v7M7 16h10"/>',
    pengumuman: '<path d="M4 10v4h3l7 4V6l-7 4z"/><path d="M17.5 9.5a3.5 3.5 0 0 1 0 5"/>',
    keluar: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M9.5 16.5 5 12l4.5-4.5M5 12h10.5"/>'
  };
  /* v3.0 ikon ILUSTRASI berwarna (lembar Lainnya & grid layanan): kotak membulat biru muda + bentuk putih bergaris biru tua + titik aksen.
     Gambar sendiri dari ikon garis di atas, palet WHL (biru/putih) + 1 aksen per layanan. */
  var AKSEN = { absen: '#14B8A6', truk: '#F59E0B', forum: '#38BDF8', input: '#6366F1', kuesioner: '#F97316', profil: '#FBBF24', kotak: '#38BDF8', grafik: '#22C55E', insiden: '#EF4444',
    akun: '#6366F1', monitor: '#F97316', lokasi: '#EF4444', peta: '#14B8A6', dokumen: '#8B5CF6', solar: '#F59E0B', centang: '#22C55E', kartuId: '#14B8A6', kreatif: '#EC4899', web: '#38BDF8', rumahWeb: '#F59E0B', lainnya: '#94A3B8', gudang: '#F59E0B' };
  window.WHL_ILUS = function (n) {
    var a = AKSEN[n] || '#38BDF8';
    return '<svg class="ilus" viewBox="0 0 56 56" aria-hidden="true"><rect x="1" y="1" width="54" height="54" rx="19" fill="var(--ilBg,#E3EFFD)"/><circle cx="42" cy="14" r="8.5" fill="' + a + '"/><circle cx="14" cy="45" r="3.2" fill="' + a + '" opacity=".55"/>'
      + '<g transform="translate(12 12) scale(1.333)" fill="var(--ilIsi,#fff)" stroke="var(--ilGaris,#0D47A1)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (P[n] || P.lainnya) + '</g></svg>';
  };
  window.WHL_IKON = function (n, kelas) { return '<svg class="ikn' + (kelas ? ' ' + kelas : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || P.lainnya) + '</svg>'; };
})();
