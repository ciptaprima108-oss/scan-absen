/* WHL App v3.10 — NOTA BENGKEL untuk PENGAWAS (revisi Reza 14 Nov malam).
 * Pengawas (plus admin / pimpinan) menginput nota "Bengkel terafiliasi" (bayar Selasa/Jumat) dan "Pengajuan > 3 jt" dari app.
 * Admin di Input DO hanya ACC (memberi kode nota) atau TOLAK (alasan); pengawas bisa perbaiki lalu ajukan ulang.
 * Server (DASHBOARD api pusat, dikerjakan Dodi) — KONTRAK:
 *   pusatNotaOpsi(token)      -> { ok, bengkelAf[], tipeUnit[[dari, sampai, nama]], lambung[], maksFoto }
 *   pusatNotaAjukan(token, d) -> { ok, id } | { ok:false, pesan }   d = { masukKe, jenisNota, tglNota, lambung, unit, toko, rekening, hariBayar,
 *                                 uraian, total, keperluan, foto[], wa[], ba[], idUlang? }  (foto = dataUrl JPEG <= 300 KB)
 *   pusatNotaSaya(token)      -> { ok, list[{ id, waktu, masukKe, toko, lambung, unit, total, status DIAJUKAN|DITOLAK|DI-ACC, alasan, kode, uraian }] }
 * Sinyal putus: ajuan disimpan di HP (antrean per akun) lalu dikirim ulang otomatis. Kontrak tidak punya id klien, jadi sebelum
 * mengirim ulang ajuan yang jawabannya tidak pasti (waktu habis), app memeriksa "Ajuan saya" dulu supaya tidak dobel.
 */
(function () {
  'use strict';
  var R = window.WHL_RASA, API = window.WHL_API, Simpan = API.Simpan;
  var CTX = null, OPSI = null, LIST = null, lapisEl = null, F = null, mengirim = false, tab = 'daftar';
  var BENGKEL = 'BENGKEL TETAP', AJU = 'PENGAJUAN > 3 JT', MAKS_B64 = 409600;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function IK(n) { return window.WHL_IKON ? window.WHL_IKON(n) : ''; }
  function rp(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }
  function angka(t) { return Number(String(t || '').replace(/[^0-9]/g, '')) || 0; }
  function hariIni() { var d = new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000), p = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function sesi() { return CTX && CTX.sesi(); }
  function boleh(S) { S = S || sesi(); if (!S || !S.user) return false; return !!S.user.admin || ['pengawas', 'pimpinan', 'penuh', 'admin'].indexOf(S.user.peran) >= 0; }
  function kunciAntre() { var S = sesi(); return 'whlNotaAntre_' + String((S && (S.idProfil || S.idKetik)) || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function antre() { return Simpan.ambil(kunciAntre()).then(function (v) { try { var a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }); }
  function taruhAntre(a) { return Simpan.taruh(kunciAntre(), a.length ? JSON.stringify(a) : null); }
  function unitDari(lambung) {
    var n = Number(String(lambung || '').replace(/^\D+/, '').replace(/\D.*$/, '')); if (!n || !OPSI) return '';
    var t = (OPSI.tipeUnit || []).filter(function (x) { return n >= x[0] && n <= x[1]; })[0]; return t ? t[2] : '';
  }

  /* ---------- foto: kamera/galeri -> JPEG <= 300 KB (dataUrl) ---------- */
  function kompres(file) {
    return new Promise(function (ok, gagal) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, sk = Math.min(1, 1600 / Math.max(w, h)), q = 0.82, d = '';
        for (var i = 0; i < 10; i++) {
          var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * sk)); c.height = Math.max(1, Math.round(h * sk));
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          d = c.toDataURL('image/jpeg', q); if (d.length <= MAKS_B64) break;
          if (q > 0.5) q -= 0.12; else sk *= 0.8;
        }
        URL.revokeObjectURL(url);
        if (d.length > MAKS_B64) gagal(new Error('foto terlalu besar')); else ok(d);
      };
      img.onerror = function () { URL.revokeObjectURL(url); gagal(new Error('gambar tidak bisa dibaca')); };
      img.src = url;
    });
  }

  /* ---------- lapis ---------- */
  function lapis(h) {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis notaLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik); lapisEl.addEventListener('change', ubah); lapisEl.addEventListener('input', ketik); lapisEl.addEventListener('focusout', lepasFokus);
    }
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-n="kembali" aria-label="Kembali">‹</button><div class="nm">Pengawas<b>Nota bengkel</b></div></div>'
      + '<div class="ksnIsi notaIsi"><div class="segmen notaSeg"><button type="button" data-n="tab:daftar" class="' + (tab === 'daftar' ? 'on' : '') + '">' + IK('kotak') + 'Ajuan saya</button><button type="button" data-n="tab:baru" class="' + (tab === 'baru' ? 'on' : '') + '">' + IK('input') + 'Ajukan nota</button></div>' + h + '</div>';
  }
  function tutup() { if (!lapisEl) return; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); if (CTX && CTX.perbarui) CTX.perbarui(); }

  function buka(ctx, keTab) {
    CTX = ctx || CTX; if (!boleh()) { CTX.roti('Nota bengkel khusus pengawas.'); return; }
    tab = keTab || 'daftar'; F = null; lapis('<div class="kecil" style="text-align:center;padding:24px"><span class="putar"></span> Memuat...</div>');
    var siapOpsi = OPSI ? Promise.resolve(OPSI) : API.Pusat.notaOpsi(sesi()).then(function (o) {
      if (o && o.login === false) throw new Error('Sesi habis, masuk lagi.');
      if (!o || !o.ok) throw new Error((o && o.pesan) || 'Opsi nota belum tersedia.');
      OPSI = o; Simpan.taruh('whlNotaOpsi', JSON.stringify(o)); return o;
    }).catch(function (e) { return Simpan.ambil('whlNotaOpsi').then(function (v) { var c = null; try { c = JSON.parse(v || 'null'); } catch (x) { c = null; } if (c) { OPSI = c; return c; } throw e; }); });
    siapOpsi.then(function () { if (tab === 'baru') { if (F) { simpanIsian(); gambarForm(); } else formBaru(); } else daftar(); kirimAntrean(); }, function (e) {
      lapis('<div class="kartu kosongKm">' + IK('alarm', 'besar') + '<b>Menu nota belum bisa dibuka</b><small>' + esc(e.message) + '</small><button type="button" class="tKecil" data-n="ulangBuka" style="margin-top:10px">Coba lagi</button></div>');
    });
  }

  /* ---------- daftar "Ajuan saya" + antrean di HP ---------- */
  var WARNA = { DIAJUKAN: ['abu', 'Menunggu admin'], 'DI-ACC': ['hijau', 'Di-ACC'], DITOLAK: ['merah', 'Ditolak'] };
  function daftar() {
    tab = 'daftar';
    lapis('<div class="kecil" style="text-align:center;padding:20px"><span class="putar"></span> Memuat ajuan...</div>');
    Promise.all([antre(), API.Pusat.notaSaya(sesi()).then(function (h) { if (h && h.ok) { LIST = h.list || []; Simpan.taruh('whlNotaSaya_' + kunciAntre(), JSON.stringify(LIST)); return null; } return (h && h.pesan) || 'Daftar belum bisa dimuat.'; }, function (e) {
      return Simpan.ambil('whlNotaSaya_' + kunciAntre()).then(function (v) { try { LIST = JSON.parse(v || 'null') || LIST; } catch (x) { /* */ } return e.message; });
    })]).then(function (r) { if (tab === 'daftar' && lapisEl) gambarDaftar(r[0], r[1]); }); /* jangan menimpa form kalau pengguna sudah pindah ke Ajukan nota */
  }
  function gambarDaftar(A, galat) {
    var h = '<button type="button" class="tUtama" data-n="tab:baru" style="margin:0 0 12px">' + IK('input') + ' Ajukan nota baru</button>';
    if (galat) h += '<div class="pitaData gagal">' + IK('alarm') + '<span>' + esc(galat) + (LIST ? ' Yang tampil daftar terakhir.' : '') + '</span><button type="button" data-n="tab:daftar">Coba lagi</button></div>';
    if (A.length) h += '<h2 class="bagW">Belum terkirim <span>' + A.length + '</span></h2><div class="kartu daftarKm">' + A.map(function (x, i) {
      var st = x.salah ? '<em class="notaSt merah">Ditolak server</em>' : '<em class="notaSt kuning">Menunggu sinyal</em>';
      return '<div class="notaBaris"><div class="tx"><b>' + esc(x.d.toko) + ' · ' + esc(x.d.lambung) + '</b><small>' + esc(x.d.masukKe) + ' · ' + rp(x.d.total) + (x.salah ? ' · ' + esc(x.salah) : ' · dikirim otomatis saat sinyal ada') + '</small></div>' + st
        + (x.salah ? '<button type="button" class="tKecil" data-n="ubahAntre:' + i + '">Perbaiki</button>' : '<button type="button" class="tKecil" data-n="kirimSekarang">Kirim</button>') + '</div>';
    }).join('') + '</div>';
    var L = LIST || [];
    h += '<h2 class="bagW">Ajuan saya <span>' + L.length + '</span></h2>';
    h += L.length ? '<div class="kartu notaDaftar">' + L.map(function (x) {
      var w = WARNA[x.status] || ['abu', x.status];
      return '<div class="notaKartu ' + w[0] + '"><div class="notaAtas"><b>' + esc(x.toko) + '</b><em class="notaSt ' + w[0] + '">' + esc(w[1]) + '</em></div>'
        + '<div class="notaRinci">' + esc(x.lambung) + (x.unit ? ' · ' + esc(x.unit) : '') + ' · ' + esc(x.masukKe) + '</div>'
        + '<div class="notaTotal">' + rp(x.total) + '<small>' + esc(x.waktu || '') + ' · ' + esc(x.id) + '</small></div>'
        + (x.uraian ? '<div class="kecil notaUraian">' + esc(x.uraian) + '</div>' : '')
        + (x.status === 'DI-ACC' ? '<div class="notaKode">' + IK('centang') + 'Kode nota <b>' + esc(x.kode || '-') + '</b></div>' : '')
        + (x.status === 'DITOLAK' ? '<div class="notaTolak">' + IK('alarm') + '<span>Alasan: ' + esc(x.alasan || '-') + '</span></div><button type="button" class="tUtama notaUlang" data-n="ulang:' + esc(x.id) + '">Perbaiki &amp; ajukan ulang</button>' : '')
        + '</div>';
    }).join('') + '</div>' : (R.kosong ? R.kosong('Belum ada ajuan', 'Nota yang kamu ajukan tampil di sini beserta status dari admin.') : '');
    lapis(h);
  }

  /* ---------- form ---------- */
  function formBaru(isi) {
    tab = 'baru';
    F = Object.assign({ masukKe: BENGKEL, jenisNota: 'JASA', tglNota: hariIni(), lambung: '', unit: '', toko: '', rekening: '', hariBayar: '', uraian: '', total: 0, keperluan: '', foto: [], wa: [], ba: [] }, isi || {});
    gambarForm();
  }
  function pilih(nama, nilai, label) { return '<button type="button" class="' + (F[nama] === nilai ? 'on' : '') + '" data-n="set:' + nama + ':' + nilai + '">' + label + '</button>'; }
  function lampiran(jenis, judul, wajib) {
    var L = F[jenis] || [], maks = (OPSI && OPSI.maksFoto) || 3;
    return '<label class="lb">' + judul + (wajib ? ' <i class="wajib">wajib</i>' : '') + ' <span class="kecil">(' + L.length + '/' + maks + ')</span></label><div class="notaFoto">'
      + L.map(function (d, i) { return '<span><img src="' + d + '" alt=""><button type="button" data-n="hapusFoto:' + jenis + ':' + i + '" aria-label="Hapus foto">✕</button></span>'; }).join('')
      + (L.length < maks ? '<label class="notaTambah">' + IK('absen') + '<small>Kamera / galeri</small><input type="file" accept="image/*" data-foto="' + jenis + '" hidden></label>' : '') + '</div>';
  }
  function gambarForm() {
    var b = F.masukKe === BENGKEL, af = (OPSI && OPSI.bengkelAf) || [];
    var h = (F.idUlang ? '<div class="pitaData">' + IK('alarm') + '<span>Memperbaiki ajuan ' + esc(F.idUlang) + '. Lampirkan ulang foto, lalu kirim.</span></div>' : '')
      + '<div class="kartu notaForm"><div class="segmen notaJenis">' + pilih('masukKe', BENGKEL, IK('monitor') + 'Bengkel terafiliasi') + pilih('masukKe', AJU, IK('dokumen') + 'Pengajuan &gt; 3 jt') + '</div>'
      + '<div class="kecil" style="margin:-4px 2px 6px">' + (b ? 'Bengkel tetap, dibayar hari Selasa / Jumat.' : 'Nota di atas Rp 3 juta: wajib keperluan, berita acara (BA), dan foto nota.') + '</div>'
      + '<label class="lb">Jenis nota</label><div class="segmen kecilSeg">' + pilih('jenisNota', 'JASA', 'Jasa') + pilih('jenisNota', 'KAS', 'Kas') + '</div>'
      + '<div class="baris"><div style="flex:1;min-width:0"><label class="lb" for="ntTgl">Tanggal nota</label><input class="isian" type="date" id="ntTgl" data-f="tglNota" value="' + esc(F.tglNota) + '"></div></div>'
      + '<div class="baris"><div style="flex:1.2;min-width:0"><label class="lb" for="ntLb">Lambung</label><input class="isian kapital" id="ntLb" data-f="lambung" list="ntLbDaftar" placeholder="mis. WHL 1012" autocomplete="off" value="' + esc(F.lambung) + '"><datalist id="ntLbDaftar">' + ((OPSI && OPSI.lambung) || []).map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist></div>'
      + '<div style="flex:1;min-width:0"><label class="lb" for="ntUnit">Unit</label><input class="isian kapital" id="ntUnit" data-f="unit" placeholder="otomatis" value="' + esc(F.unit) + '"></div></div>'
      + (b ? '<label class="lb" for="ntToko">Bengkel <i class="wajib">wajib</i></label><select class="isian" id="ntToko" data-f="toko"><option value="">Pilih bengkel terafiliasi</option>' + af.map(function (x) { return '<option' + (F.toko === x ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>'
        + '<label class="lb" for="ntRek">Rekening</label><input class="isian" id="ntRek" data-f="rekening" placeholder="Bank · nomor · atas nama" value="' + esc(F.rekening) + '">'
        + '<label class="lb">Hari bayar <i class="wajib">wajib</i></label><div class="segmen kecilSeg">' + pilih('hariBayar', 'SELASA', 'Selasa') + pilih('hariBayar', 'JUMAT', 'Jumat') + '</div>'
        : '<label class="lb" for="ntToko">Vendor <i class="wajib">wajib</i></label><input class="isian kapital" id="ntToko" data-f="toko" placeholder="Nama vendor / toko" value="' + esc(F.toko) + '">'
        + '<label class="lb" for="ntKep">Keperluan / alasan <i class="wajib">wajib</i></label><textarea class="isian bnrTA" id="ntKep" data-f="keperluan" rows="3" placeholder="Kenapa perlu pengajuan ini">' + esc(F.keperluan) + '</textarea>')
      + '<label class="lb" for="ntUraian">Uraian</label><textarea class="isian bnrTA" id="ntUraian" data-f="uraian" rows="3" placeholder="Barang / pekerjaan">' + esc(F.uraian) + '</textarea>'
      + '<label class="lb" for="ntTotal">Total <i class="wajib">wajib</i></label><input class="isian notaRp" id="ntTotal" data-f="total" inputmode="numeric" placeholder="Rp 0" value="' + (F.total ? rp(F.total) : '') + '"><div class="kecil" id="ntTerbilang">' + (F.total > 3000000 && b ? '<b style="color:var(--tKuning)">Total di atas Rp 3 juta: biasanya lewat Pengajuan &gt; 3 jt.</b>' : '') + '</div>'
      + lampiran('foto', 'Foto nota', !b) + lampiran('wa', 'Screenshot WA', false) + (b ? '' : lampiran('ba', 'Berita acara (BA)', true))
      + '<div class="pesan" id="ntPesan"></div><button type="button" class="tUtama" data-n="kirim"' + (mengirim ? ' disabled' : '') + '>' + (mengirim ? '<span class="putar"></span> Mengirim...' : 'Kirim ke admin') + '</button>'
      + '<div class="kecil" style="text-align:center;margin-top:8px">Admin di Input DO memberi kode nota (ACC) atau menolak dengan alasan. Kalau sinyal putus, ajuan disimpan di HP dan dikirim otomatis.</div></div>';
    lapis(h);
  }
  function simpanIsian() { if (!lapisEl) return; Array.prototype.forEach.call(lapisEl.querySelectorAll('[data-f]'), function (e) { var k = e.getAttribute('data-f'); F[k] = k === 'total' ? angka(e.value) : e.value; }); }
  function ketik(ev) {
    var e = ev.target; if (!e.getAttribute || !F) return; var k = e.getAttribute('data-f'); if (!k) return;
    if (k === 'total') { F.total = angka(e.value); var t = document.getElementById('ntTerbilang'); if (t) t.innerHTML = F.total ? rp(F.total) + (F.total > 3000000 && F.masukKe === BENGKEL ? ' · <b style="color:var(--tKuning)">di atas Rp 3 juta: biasanya lewat Pengajuan &gt; 3 jt</b>' : '') : ''; return; }
    F[k] = e.value;
    if (k === 'lambung') { var u = unitDari(e.value), ue = document.getElementById('ntUnit'); if (u && ue && (!F.unitManual)) { ue.value = u; F.unit = u; } }
    if (k === 'unit') F.unitManual = !!e.value;
  }
  /* huruf besar & format Rp hanya saat kolom ditinggalkan (keyboard HP tidak terganggu) */
  function lepasFokus(ev) {
    var e = ev.target; if (!e.getAttribute) return; var k = e.getAttribute('data-f');
    if (k === 'total') { e.value = F.total ? rp(F.total) : ''; }
    if (e.classList && e.classList.contains('kapital') && k) { e.value = e.value.toUpperCase().replace(/\s+/g, ' ').trim(); F[k] = e.value; if (k === 'lambung') { var u = unitDari(e.value), ue = document.getElementById('ntUnit'); if (u && ue && !F.unitManual) { ue.value = u; F.unit = u; } } }
  }
  function ubah(ev) {
    var e = ev.target;
    if (e.getAttribute && e.getAttribute('data-f')) { F[e.getAttribute('data-f')] = e.value; return; }
    var j = e.getAttribute && e.getAttribute('data-foto'); if (!j || !e.files || !e.files[0]) return;
    var berkas = e.files[0]; e.value = ''; simpanIsian();
    var p = document.getElementById('ntPesan'); if (p) p.textContent = 'Mengompres foto...';
    kompres(berkas).then(function (d) { F[j] = (F[j] || []).concat([d]).slice(0, (OPSI && OPSI.maksFoto) || 3); gambarForm(); R.getar(); }, function (x) { if (p) p.textContent = 'Foto gagal: ' + x.message; R.bunyi('gagal'); });
  }
  function periksa() {
    simpanIsian(); var b = F.masukKe === BENGKEL;
    if (!F.tglNota) return 'Isi tanggal nota.';
    if (!F.lambung.trim()) return 'Isi lambung unit.';
    if (!F.toko.trim()) return b ? 'Pilih bengkel terafiliasi.' : 'Isi nama vendor.';
    if (b && !F.hariBayar) return 'Pilih hari bayar: Selasa atau Jumat.';
    if (!(F.total > 0)) return 'Isi total nota.';
    if (!b && !F.keperluan.trim()) return 'Isi keperluan / alasan pengajuan.';
    if (!b && !F.ba.length) return 'Lampirkan berita acara (BA).';
    if (!b && !F.foto.length) return 'Lampirkan foto nota.';
    return '';
  }
  function paket() {
    var b = F.masukKe === BENGKEL;
    var d = { masukKe: F.masukKe, jenisNota: F.jenisNota, tglNota: F.tglNota, lambung: F.lambung.trim().toUpperCase(), unit: (F.unit || '').trim().toUpperCase(), toko: F.toko.trim(),
      rekening: b ? F.rekening.trim() : '', hariBayar: b ? F.hariBayar : '', uraian: F.uraian.trim(), total: Number(F.total), keperluan: b ? '' : F.keperluan.trim(), foto: F.foto.slice(), wa: F.wa.slice(), ba: b ? [] : F.ba.slice() };
    if (F.idUlang) d.idUlang = F.idUlang;
    return d;
  }
  function kirim() {
    var salah = periksa(), p = document.getElementById('ntPesan');
    if (salah) { if (p) p.textContent = salah; R.bunyi('gagal'); R.getar('awas'); return; }
    var item = { cid: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), waktu: Date.now(), d: paket(), coba: 0 };
    mengirim = true; gambarForm();
    antre().then(function (A) { A.push(item); return taruhAntre(A); }).then(function () { return kirimSatu(item); }).then(function (h) {
      mengirim = false;
      if (h.ok) { R.sukses({ judul: 'Nota terkirim', sub: 'Menunggu admin memberi kode nota (ACC) atau menolak.', rinci: [['No. ajuan', h.id], ['Total', rp(item.d.total)], ['Toko', item.d.toko]], konfeti: false }); F = null; daftar(); }
      else if (h.ditolak) { hapusAntre(item.cid); gambarForm(); var q = document.getElementById('ntPesan'); if (q) q.textContent = 'Server menolak: ' + h.pesan; R.bunyi('gagal'); }
      else { CTX.roti('Sinyal lemah: ajuan disimpan di HP dan dikirim otomatis.'); F = null; daftar(); }
    });
  }
  /** kirim 1 item antrean -> {ok,id} | {ditolak,pesan} | {tunda} ; antrean diperbarui */
  function kirimSatu(item) {
    var cekDobel = item.tidakPasti ? API.Pusat.notaSaya(sesi()).then(function (h) {
      var L = (h && h.ok && h.list) || [], d = item.d;
      return L.filter(function (x) { return x.toko === d.toko && Number(x.total) === Number(d.total) && x.lambung === d.lambung && x.masukKe === d.masukKe && x.status !== 'DITOLAK'; })[0] || null;
    }, function () { return 'tunda'; }) : Promise.resolve(null);
    return cekDobel.then(function (sudah) {
      if (sudah === 'tunda') return { tunda: true };
      if (sudah) return hapusAntre(item.cid).then(function () { return { ok: true, id: sudah.id }; }); // ternyata sudah masuk server sebelumnya
      item.coba++; item.tidakPasti = true; return ubahAntre(item).then(function () { return API.Pusat.notaAjukan(sesi(), item.d); }).then(function (h) {
        if (h && h.ok) return hapusAntre(item.cid).then(function () { return { ok: true, id: h.id }; });
        if (h && h.login === false) { item.tidakPasti = false; return ubahAntre(item).then(function () { return { tunda: true }; }); }
        item.tidakPasti = false; item.salah = (h && h.pesan) || 'ditolak server'; return ubahAntre(item).then(function () { return { ditolak: true, pesan: item.salah }; });
      }, function () { return { tunda: true }; }); // jaringan: biarkan tidakPasti=true -> cek dobel dulu sebelum kirim ulang
    });
  }
  function ubahAntre(item) { return antre().then(function (A) { A = A.map(function (x) { return x.cid === item.cid ? item : x; }); return taruhAntre(A); }); }
  function hapusAntre(cid) { return antre().then(function (A) { return taruhAntre(A.filter(function (x) { return x.cid !== cid; })); }); }
  var sedangAntre = false;
  function kirimAntrean() {
    if (sedangAntre || !sesi() || !boleh() || !navigator.onLine) return Promise.resolve();
    sedangAntre = true;
    return antre().then(function (A) {
      var L = A.filter(function (x) { return !x.salah; }), terkirim = 0;
      return L.reduce(function (p, x) { return p.then(function () { return kirimSatu(x).then(function (h) { if (h.ok) terkirim++; }); }); }, Promise.resolve()).then(function () {
        sedangAntre = false; if (terkirim) { CTX && CTX.roti(terkirim + ' ajuan nota tertunda berhasil dikirim.'); if (lapisEl && tab === 'daftar') daftar(); }
      });
    }).catch(function () { sedangAntre = false; });
  }
  window.addEventListener('online', function () { setTimeout(kirimAntrean, 1500); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kirimAntrean(); });
  setInterval(kirimAntrean, 60000);

  function klik(ev) {
    var b = ev.target.closest('[data-n]'); if (!b) return; var n = b.getAttribute('data-n');
    if (n === 'kembali') { if (tab === 'baru' && F) { simpanIsian(); daftar(); } else tutup(); return; }
    if (n === 'ulangBuka') { buka(CTX, tab); return; }
    if (n.indexOf('tab:') === 0) { var t = n.slice(4); if (t === 'baru') formBaru(); else daftar(); return; }
    if (n.indexOf('set:') === 0) { simpanIsian(); var p = n.split(':'); F[p[1]] = p.slice(2).join(':'); if (p[1] === 'masukKe' && F.masukKe === BENGKEL && F.toko && (OPSI.bengkelAf || []).indexOf(F.toko) < 0) F.toko = ''; gambarForm(); R.getar(); return; }
    if (n.indexOf('hapusFoto:') === 0) { simpanIsian(); var q = n.split(':'); F[q[1]].splice(+q[2], 1); gambarForm(); return; }
    if (n === 'kirim') { if (!mengirim) kirim(); return; }
    if (n === 'kirimSekarang') { kirimAntrean().then(function () { daftar(); }); return; }
    if (n.indexOf('ulang:') === 0) {
      var id = n.slice(6), x = (LIST || []).filter(function (y) { return y.id === id; })[0]; if (!x) return;
      formBaru({ idUlang: id, masukKe: x.masukKe, toko: x.toko, lambung: x.lambung, unit: x.unit, total: Number(x.total) || 0, uraian: x.uraian || '' }); return;
    }
    if (n.indexOf('ubahAntre:') === 0) {
      var i = +n.slice(10); antre().then(function (A) { var it = A[i]; if (!it) return; return hapusAntre(it.cid).then(function () { formBaru(Object.assign({}, it.d)); }); });
    }
  }
  /** untuk tombol Back HP */
  function kembali() { if (!lapisEl) return false; if (tab === 'baru' && F) { simpanIsian(); daftar(); } else tutup(); return true; }
  window.WHL_NOTA = { pasang: function (c) { CTX = c; }, boleh: boleh, buka: buka, kirimAntrean: kirimAntrean, kembali: kembali, _uji: { form: function (isi) { formBaru(isi); }, isi: function () { return F; } } };
})();
