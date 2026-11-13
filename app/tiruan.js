/* DATA TIRUAN (CONTOH) untuk layar Pusat WHL di app v2.
 * Dipakai HANYA selama DASHBOARD belum punya pintu API {api:"pusat"} (lihat ENDPOINT-DIBUTUHKAN.txt).
 * Semua angka & nama di sini KARANGAN, bukan data WHL. Layar yang memakainya diberi pita "DATA CONTOH".
 * Bentuk objek SENGAJA sama dengan balasan ringkasanPusat / pusatAbsenRiwayat di Pusat.gs supaya begitu API asli ada,
 * layar tidak perlu diubah. File ini juga dimuat server uji (uji/server-tiruan.mjs).
 */
(function (akar) {
  var UNIT = [];
  var st = ['siap', 'siap', 'siap', 'siap', 'belum', 'siap', 'nunggu', 'siap', 'dikerjakan', 'siap', 'siap', 'standby', 'siap', 'belum', 'siap', 'siap', 'dikerjakan', 'siap'];
  var ket = { siap: 'Tercatat READY jam 06.10', belum: 'Belum ada catatan Pos Kontrol hari ini', nunggu: 'PERBAIKAN: Rem angin bocor', dikerjakan: 'PERBAIKAN: Ganti kampas kopling', standby: 'STANDBY: Tunggu ban' };
  for (var i = 0; i < st.length; i++) UNIT.push({ l: 'CONTOH ' + ('0' + (i + 1)).slice(-2), a: i < 12 ? 'TRINTIN' : 'TRONTON', s: st[i], k: ket[st[i]], u: st[i] === 'nunggu' ? '2 jam' : st[i] === 'dikerjakan' ? '5 jam' : '', lw: st[i] === 'nunggu' ? 1 : 0 });
  /* contoh keadaan prioritas: 1 storing belum ada mekanik (3 jam), 1 storing sedang ditangani, 1 tiket baru 35 mnt, 1 gantung dikerjakan 9 jam */
  UNIT[4] = { l: 'CONTOH 05', a: 'TRINTIN', s: 'nunggu', k: 'STORING: Mogok di tanjakan KM 71, kopling habis', u: '3 jam 10 mnt', lw: 1 };
  UNIT[10] = { l: 'CONTOH 11', a: 'TRINTIN', s: 'dikerjakan', k: 'STORING: Ban belakang pecah di KM 96', u: '1 jam 5 mnt', lw: 0 };
  UNIT[13] = { l: 'CONTOH 14', a: 'TRONTON', s: 'nunggu', k: 'PERBAIKAN: Lampu rem mati', u: '35 mnt', lw: 0 };
  UNIT[16].u = '9 jam'; UNIT[16].lw = 1; UNIT[6].u = '2 jam 20 mnt';
  var hit = { siap: 0, belum: 0, nunggu: 0, dikerjakan: 0, standby: 0 }; UNIT.forEach(function (u) { hit[u.s] = (hit[u.s] || 0) + 1; }); hit.rfu = UNIT.length - hit.nunggu - hit.dikerjakan;
  var ZONA = ['DI POOL', 'DI BSR', 'JALAN', 'DI 107', 'JALAN', 'DI PORT', 'JALAN', 'DI BSR', 'JALAN', 'DI POOL', 'JALAN', 'DI 107', 'JALAN', 'DI POOL', 'DI BSR', 'JALAN'];
  var F = { BSR: [-3.400, 103.600], MIP: [-3.520, 103.580], '107': [-3.560, 103.840], POOL: [-3.575, 103.842], PORT: [-3.900, 104.450] };
  var SKEMA = { f: Object.keys(F).map(function (k) { return { k: k, la: F[k][0], lo: F[k][1] }; }), u: [] };
  var antara = function (a, b, t) { return [F[a][0] + (F[b][0] - F[a][0]) * t, F[a][1] + (F[b][1] - F[a][1]) * t]; };
  [['01', 'DI BSR', 'BSR', 'LOADING'], ['02', 'DI BSR', 'BSR', 'PARKIR'], ['03', 'JALAN', 'BSR', 'MUAT', antara('BSR', '107', 0.55), 19], ['04', 'DI 107', '107', 'BONGKAR'], ['05', 'JALAN', '107', 'MUAT', antara('107', 'PORT', 0.4), 43],
   ['06', 'DI PORT', 'PORT', 'BONGKAR'], ['07', 'JALAN', 'PORT', 'KOSONG', antara('107', 'PORT', 0.7), 30], ['08', 'DI POOL', 'POOL', 'PARKIR'], ['09', 'JALAN', '107', 'KOSONG', antara('BSR', '107', 0.3), 22], ['10', 'DI MIP', 'MIP', 'LOADING'],
   ['11', 'JALAN', 'MIP', 'MUAT', antara('MIP', '107', 0.6), 17], ['12', 'DI POOL', 'POOL', 'PARKIR'], ['13', 'JALAN', '107', 'CEK ARAH', antara('107', 'PORT', 0.15), 9], ['14', 'DI 107', '107', ''], ['15', 'DI BSR', 'BSR', 'LOADING'], ['16', 'JALAN', '107', 'MUAT', antara('107', 'PORT', 0.85), 92]]
    .forEach(function (x) { SKEMA.u.push({ l: 'CONTOH ' + x[0], p: x[1], t: x[2], mu: x[3], km: x[5] || 0, j: '12/11 06:40', up: '12/11 07:40', la: x[4] ? Math.round(x[4][0] * 1e5) / 1e5 : null, lo: x[4] ? Math.round(x[4][1] * 1e5) / 1e5 : null, kh: 40 + Number(x[0]) * 7 }); });
  var PETA = [], PERUNIT = {}; ZONA.forEach(function (z, i) { var m = z === 'JALAN' ? (i % 4 === 2 ? 'MUAT' : 'KOSONG') : (z === 'DI 107' || z === 'DI PORT' ? 'MUAT' : 'KOSONG'); PETA.push({ l: UNIT[i].l, z: z, m: m, a: 'BSR', mnt: 10 + i * 3, rit: i % 4 }); PERUNIT[UNIT[i].l.replace(/[^A-Z0-9]/g, '')] = { rit: i % 4, pos: z === 'JALAN' ? (m === 'MUAT' ? 'Jalan bermuatan' : 'Jalan kosong') : 'Di ' + z.slice(3), sejak: '' }; });

  var RINGKAS = {
    pos: { ok: true, jam: '07:42', total: UNIT.length, hit: hit, sudahMasuk: UNIT.length - (hit.belum || 0), perluTindak: 2,
      tiket: { nunggu: hit.nunggu, dikerjakan: hit.dikerjakan, standby: hit.standby, selesai: 6, lewat: 3 }, armada: { total: 18, trintin: 12, tronton: 6 },
      units: UNIT, tindak: [{ d: 'pos', s: 'tindak', judul: 'CONTOH 09 dilapor di grup WA, belum ada tiket', ket: 'Lapor di grup jam 05:40 · catat Unit Masuk di Pos Kontrol', umur: '2 jam 2 mnt' }, { d: 'pos', s: 'tindak', judul: 'CONTOH 05 kelamaan nunggu mekanik', ket: 'Belum ada mekanik · STORING: Mogok di tanjakan KM 71', umur: '3 jam 10 mnt' }, { d: 'pos', s: 'nunggu', lw: 1, judul: 'CONTOH 07 nunggu mekanik', ket: 'PERBAIKAN: Rem angin bocor', umur: '2 jam 20 mnt' }, { d: 'pos', s: 'dikerjakan', lw: 1, judul: 'CONTOH 17 lagi diperbaiki', ket: 'PERBAIKAN: Ganti kampas kopling', umur: '9 jam' }],
      tanggal: 'contoh' },
    target: { ok: true, jam: '07:40', bulan: 'contoh', target: 250000, kmMtd: 91250, persen: 36.5, ritMtd: 2680, ritHariIni: 41, kmHariIni: 1394, hariKe: 12, jmlHari: 30, hariSisa: 18, butuhRitHari: 259, sisaKm: 158750, ritSheetMtd: 333, targetRit: 1500, targetTon: 71300, tonMtd: 10411,
      ritTon: { ok: true, armada: 'TRINTIN', hariBerjalan: 12, jmlHari: 30, sisaHari: 18, rit: { target: 1500, realisasi: 333, persen: 22.2, rataHari: 27.75, proyeksi: 832.5, proyeksiPersen: 55.5, status: 'MELESET', sisa: 1167, butuhPerHari: 64.8, seharusnya: 600, selisih: -267 }, ton: { target: 71300, realisasi: 10411, persen: 14.6, status: 'MELESET' } } },
    gps: { ok: true, jam: '07:41', hariIni: 'contoh', totalRit: 41, unitGps: 16, sudahMuat: 11, belumMuat: 5, jalanMuat: 2, rute: [['BSR-107', 28], ['107-PORT', 13]], peta: PETA, perUnit: PERUNIT, skema: SKEMA, updated: '12/11 07:40' },
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
  akar.WHL_TIRUAN = { RINGKAS: RINGKAS, KARTU_UMUM: KARTU_UMUM, KARTU_PERAN: KARTU_PERAN, APPS_PERAN: APPS_PERAN, UNIT_PERAN: UNIT_PERAN, NAMA_PERAN: NAMA_PERAN,
    tebakPeran: tebakPeran, infoUser: infoUser, ringkasan: ringkasan };
})(typeof window !== 'undefined' ? window : globalThis);
