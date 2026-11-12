/* DATA TIRUAN (CONTOH) untuk layar Pusat WHL di app v2.
 * Dipakai HANYA selama DASHBOARD belum punya pintu API {api:"pusat"} (lihat ENDPOINT-DIBUTUHKAN.txt).
 * Semua angka & nama di sini KARANGAN, bukan data WHL. Layar yang memakainya diberi pita "DATA CONTOH".
 * Bentuk objek SENGAJA sama dengan balasan ringkasanPusat / pusatAbsenRiwayat di Pusat.gs supaya begitu API asli ada,
 * layar tidak perlu diubah. File ini juga dimuat server uji (uji/server-tiruan.mjs).
 */
(function (akar) {
  var UNIT = [];
  var st = ['siap', 'siap', 'siap', 'siap', 'belum', 'siap', 'nunggu', 'siap', 'dikerjakan', 'siap', 'siap', 'standby', 'siap', 'belum', 'siap', 'siap', 'dikerjakan', 'siap'];
  var ket = { siap: 'Cek pagi oke', belum: '', nunggu: 'Rem angin bocor', dikerjakan: 'Ganti kampas kopling', standby: 'Tunggu ban' };
  for (var i = 0; i < st.length; i++) UNIT.push({ l: 'CONTOH ' + ('0' + (i + 1)).slice(-2), a: i < 12 ? 'TRINTIN' : 'TRONTON', s: st[i], k: ket[st[i]], u: st[i] === 'nunggu' ? '2 jam' : st[i] === 'dikerjakan' ? '5 jam' : '', lw: st[i] === 'nunggu' ? 1 : 0 });
  var hit = {}; UNIT.forEach(function (u) { hit[u.s] = (hit[u.s] || 0) + 1; });

  var RINGKAS = {
    pos: { ok: true, jam: '07:42', total: UNIT.length, hit: hit, sudahMasuk: UNIT.length - (hit.belum || 0), perluTindak: 2,
      tiket: { nunggu: 1, dikerjakan: 2, standby: 1, selesai: 6, lewat: 1 }, armada: { total: 18, trintin: 12, tronton: 6 },
      units: UNIT, tindak: [{ d: 'pos', s: 'nunggu', judul: 'CONTOH 07 nunggu mekanik', ket: 'Rem angin bocor', umur: '2 jam', lw: 1 }, { d: 'pos', s: 'dikerjakan', judul: 'CONTOH 17 lagi diperbaiki', ket: 'Ganti kampas kopling', umur: '5 jam', lw: 0 }],
      tanggal: 'contoh' },
    target: { ok: true, jam: '07:40', bulan: 'contoh', target: 250000, kmMtd: 91250, persen: 36.5, ritMtd: 2680, ritHariIni: 41, kmHariIni: 1394, hariKe: 12, jmlHari: 30, hariSisa: 18, butuhRitHari: 259, sisaKm: 158750 },
    gps: { ok: true, jam: '07:41', hariIni: 'contoh', totalRit: 41, unitGps: 16, sudahMuat: 11, belumMuat: 5, jalanMuat: 4, rute: [['BSR-107', 28], ['107-PORT', 13]] },
    subcon: { ok: true, jam: '07:30', bulan: 'contoh', vendor: 6, adaData: true },
    insiden: { ok: true, jam: '07:30', tahun: 2026, tahunIni: 7, total: 33, belumClose: 2, hariSejak: 9,
      terakhir: { id: 'CONTOH-1', tgl: 'contoh', jenis: 'Unit amblas', lokasi: 'KM contoh', unit: 'CONTOH 03', status: 'OPEN' }, terbuka: [] },
    'do': { ok: true, jam: '07:39', hari: 'contoh', hariIni: { tiket: 38, menunggu: 21, lengkap: 17, retur: 0, kejadian: 1, solar: 2470, voucher: 38 }, hariKemarin: { tiket: 92, menunggu: 6, lengkap: 86 }, menungguSemua: 27, menunggu3hari: 3 },
    solar: { ok: true, jam: '07:39', kini: { sisa: 8420, masuk: 16000, keluar: 7580, sampai: 'contoh' }, trip: { liter: 2470, voucher: 38 } },
    absen: { ok: true, jam: '07:42', hadir: 19, telat: 2, belum: 4, tidakMasuk: 1, lemburMenunggu: 1, roster: true },
    bertugas: { ok: true, jam: '07:42', petugas: [
      { nama: 'Contoh Pengawas', jabatan: 'SUPERVISOR', kelompok: 'pengawas', sejak: '06:02', sampai: '18:00' },
      { nama: 'Contoh Mekanik A', jabatan: 'MECHANIC', kelompok: 'mekanik', sejak: '05:55', sampai: '18:00' },
      { nama: 'Contoh Mekanik B', jabatan: 'MECHANIC', kelompok: 'mekanik', sejak: '06:10', sampai: '18:00' },
      { nama: 'Contoh Admin', jabatan: 'ADMIN', kelompok: 'admin', sejak: '07:01', sampai: '17:00' }] }
  };

  /* Hak per peran: salinan tabel di pusat.html / Pusat.gs (PUSAT_KARTU, PUSAT_APPS_PERAN, PUSAT_RINCI) */
  var KARTU_UMUM = ['ritase', 'subcon', 'insiden'];
  var KARTU_PERAN = { pimpinan: ['pos', 'gps', 'do', 'solar', 'gudang', 'input', 'kreatif', 'absensi', 'apps'], penuh: ['pos', 'gps', 'do', 'solar', 'gudang', 'input', 'kreatif', 'absensi', 'apps'],
    pengawas: ['pos', 'input', 'apps'], admin: ['do', 'input', 'apps'], adminhse: ['absensi', 'input', 'apps'], mekanik: ['pos', 'input', 'apps'], hse: ['pos', 'input', 'apps'],
    logistik: ['gudang', 'apps'], fuelman: ['solar', 'apps'], kreatif: ['kreatif'], driver: [] };
  var APPS_PERAN = { pimpinan: ['*'], penuh: ['*'], pengawas: ['pos', 'dash'], admin: ['inputdo'], adminhse: ['absensi', 'insiden', 'dash', 'generator'], mekanik: ['pos'], hse: ['pos', 'dash', 'analisa'], logistik: ['gudang'], fuelman: ['solar'], kreatif: [], driver: [] };
  var UNIT_PERAN = ['pimpinan', 'penuh', 'pengawas', 'admin', 'adminhse', 'mekanik', 'hse'];
  var NAMA_PERAN = { pimpinan: 'Pimpinan', penuh: 'Akses penuh', pengawas: 'Pengawas', mekanik: 'Mekanik', admin: 'Admin', adminhse: 'Admin HR & HSE', hse: 'HSE', logistik: 'Logistik', fuelman: 'Fuelman', kreatif: 'Kreatif', driver: 'Driver' };

  function tebakPeran(jabatan) {
    var j = String(jabatan || '').toUpperCase();
    if (/MANAGER|DIRECTOR|DIREKTUR|PJO|OWNER/.test(j)) return 'pimpinan';
    if (/SUPERVISOR|PENGAWAS|FOREMAN/.test(j)) return 'pengawas';
    if (/MECHANIC|MEKANIK|WELDER|TYRE|ELECTRIC/.test(j)) return 'mekanik';
    if (/HR/.test(j)) return 'adminhse';
    if (/HSE|SAFETY/.test(j)) return 'hse';
    if (/LOGISTI|WAREHOUSE|GUDANG/.test(j)) return 'logistik';
    if (/FUEL/.test(j)) return 'fuelman';
    if (/ADMIN|FINANCE/.test(j)) return 'admin';
    if (/DRIVER|OPERATOR/.test(j)) return 'driver';
    return 'driver';
  }
  function infoUser(nama, peran) {
    return { nama: nama, peran: peran, rinci: UNIT_PERAN.indexOf(peran) >= 0 ? ['unit'] : [], kartu: KARTU_UMUM.concat(KARTU_PERAN[peran] || []), apps: APPS_PERAN[peran] || [],
      admin: peran === 'pimpinan' || peran === 'penuh', kelola: false, khusus: [] };
  }
  function ringkasan(bagian, user) {
    var out = { serverJam: 'contoh', hariTambang: 'contoh', user: user };
    String(bagian || Object.keys(RINGKAS).join(',')).split(',').forEach(function (b) { if (RINGKAS[b]) out[b] = JSON.parse(JSON.stringify(RINGKAS[b])); });
    return out;
  }
  function riwayat(nama, jabatan) {
    var bulan = [], d = new Date();
    for (var i = 1; i <= Math.min(d.getDate(), 12); i++) bulan.push({ tgl: i, masuk: i % 7 === 0 ? '' : (i % 5 === 0 ? '07:14' : '06:5' + (i % 8)), pulang: i % 7 === 0 ? '' : '17:0' + (i % 6), status: i % 7 === 0 ? 'OFF' : (i % 5 === 0 ? 'Telat' : 'Tepat') });
    return { ok: true, tgl: 'contoh', lingkup: 'diri', hadir: [{ nama: nama, jabatan: jabatan, masuk: '06:54', pulang: '', status: 'Tepat', lembur: '' }], belum: [], hariDiri: bulan };
  }
  akar.WHL_TIRUAN = { RINGKAS: RINGKAS, KARTU_UMUM: KARTU_UMUM, KARTU_PERAN: KARTU_PERAN, APPS_PERAN: APPS_PERAN, UNIT_PERAN: UNIT_PERAN, NAMA_PERAN: NAMA_PERAN,
    tebakPeran: tebakPeran, infoUser: infoUser, ringkasan: ringkasan, riwayat: riwayat };
})(typeof window !== 'undefined' ? window : globalThis);
