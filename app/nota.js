/* WHL App — NOTA BENGKEL untuk PENGAWAS.
 * v3.10 (14 Nov): 1 nota per kirim (bengkel terafiliasi bayar Selasa/Jumat / pengajuan > 3 jt). Admin Input DO: ACC (kode nota) / TOLAK (alasan).
 * v3.11 (15 Nov, Reza: "BISA AJUKAN BANYAK NOTA LANGSUNG DAN VIDEO PERBAIKAN"):
 *   - mode "Banyak nota": isian bersama sekali + banyak baris (tanggal, lambung/unit, uraian, total, foto, video) -> pusatNotaAjukanBanyak.
 *     Kiriman besar dipecah per kelompok baris (cid berbeda); satu baris salah di server = kelompok itu tidak tersimpan (pesan "Baris n: ...").
 *   - video perbaikan (maks 2 per nota, maks 50 MB / ±2 menit): disimpan di HP (IndexedDB), diunggah per potongan 4 MB
 *     (pusatNotaVideoMulai / Potong / Selesai) dengan progres; sinyal putus -> lanjut dari potongan terakhir. Ajuan baru dikirim
 *     sesudah semua videonya punya fileId.
 *   - anti-dobel pakai cid (id klien) yang diterima server: kirim ulang dengan cid sama -> server mengembalikan id lama.
 * KONTRAK (DASHBOARD api pusat, Dodi): pusatNotaOpsi [token]; pusatNotaAjukan [token, d]; pusatNotaAjukanBanyak [token, d];
 *   pusatNotaSaya [token]; pusatNotaVideoMulai [token, {nama, mime, ukuran}] -> upId; pusatNotaVideoPotong [token, upId, ke, base64];
 *   pusatNotaVideoSelesai [token, upId] -> fileId.
 */
(function () {
  'use strict';
  var R = window.WHL_RASA, API = window.WHL_API, Simpan = API.Simpan;
  var CTX = null, OPSI = null, LIST = null, lapisEl = null, F = null, mengirim = false, tab = 'daftar', mode = 'satu';
  var BENGKEL = 'BENGKEL TETAP', AJU = 'PENGAJUAN > 3 JT', MAKS_B64 = 409600;
  var POTONG = 4 * 1024 * 1024, MAKS_VIDEO = 50 * 1024 * 1024, MAKS_DETIK = 135, MAKS_VIDEO_NOTA = 2, BATAS_KIRIM = 6 * 1024 * 1024;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function IK(n) { return window.WHL_IKON ? window.WHL_IKON(n) : ''; }
  function rp(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }
  function mb(b) { return (Math.round(b / 104857.6) / 10).toLocaleString('id-ID') + ' MB'; }
  function angka(t) { return Number(String(t || '').replace(/[^0-9]/g, '')) || 0; }
  function hariIni() { var d = new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000), p = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function idAcak() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function sesi() { return CTX && CTX.sesi(); }
  /* server lama (belum dipasang paket v3.11) -> sembunyikan Banyak nota & video supaya tidak menggantung di antrean */
  function fiturBaru() { var P = API.Pusat; return !(P.dikenal && P.dikenal()) || P.punya('pusatNotaAjukanBanyak'); }
  function boleh(S) { S = S || sesi(); if (!S || !S.user) return false; return !!S.user.admin || ['pengawas', 'pimpinan', 'penuh', 'admin'].indexOf(S.user.peran) >= 0; }
  function akun() { var S = sesi(); return String((S && (S.idProfil || S.idKetik)) || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function kunciAntre() { return 'whlNotaAntre_' + akun(); }
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

  /* ---------- VIDEO: simpan di HP (IndexedDB) + unggah per potongan 4 MB, bisa lanjut ---------- */
  var VDB = null, VURL = {}, PROGRES = {};
  function vdb() { if (VDB) return VDB; VDB = new Promise(function (ok, gagal) { var r = indexedDB.open('whl-nota-video', 1); r.onupgradeneeded = function () { r.result.createObjectStore('blob'); r.result.createObjectStore('unggah'); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { gagal(r.error); }; }); return VDB; }
  function vtx(toko, mode2, fn) { return vdb().then(function (d) { return new Promise(function (ok, gagal) { var t = d.transaction(toko, mode2), s = t.objectStore(toko), r = fn(s); t.oncomplete = function () { ok(r && r.result); }; t.onerror = function () { gagal(t.error); }; }); }); }
  function vSimpanBlob(vid, b) { return vtx('blob', 'readwrite', function (s) { return s.put(b, vid); }); }
  function vBlob(vid) { return vtx('blob', 'readonly', function (s) { return s.get(vid); }); }
  function vInfo(vid) { return vtx('unggah', 'readonly', function (s) { return s.get(vid); }); }
  function vTaruhInfo(vid, x) { return vtx('unggah', 'readwrite', function (s) { return s.put(x, vid); }); }
  function vHapus(vid) { return vtx('blob', 'readwrite', function (s) { return s.delete(vid); }).then(function () { return vtx('unggah', 'readwrite', function (s) { return s.delete(vid); }); }); }
  function durasi(file) {
    return new Promise(function (ok) {
      var v = document.createElement('video'), u = URL.createObjectURL(file), t = setTimeout(function () { ok(null); }, 6000);
      v.preload = 'metadata'; v.muted = true; v.onloadedmetadata = function () { clearTimeout(t); var d = v.duration; URL.revokeObjectURL(u); ok(isFinite(d) ? d : null); };
      v.onerror = function () { clearTimeout(t); URL.revokeObjectURL(u); ok(null); }; v.src = u;
    });
  }
  /** pilih video -> {vid, nama, ukuran, mime, dur} (blob disimpan di HP) */
  function tambahVideo(file) {
    var mime = file.type || (/\.mov$/i.test(file.name) ? 'video/quicktime' : /\.webm$/i.test(file.name) ? 'video/webm' : 'video/mp4');
    if (['video/mp4', 'video/quicktime', 'video/webm'].indexOf(mime.split(';')[0]) < 0) return Promise.reject(new Error('format video belum didukung (pakai MP4 / MOV / WEBM)'));
    if (file.size > MAKS_VIDEO) return Promise.reject(new Error('video terlalu besar (' + mb(file.size) + ', maks 50 MB). Rekam lebih pendek / resolusi lebih kecil.'));
    return durasi(file).then(function (dur) {
      if (dur && dur > MAKS_DETIK) throw new Error('video terlalu panjang (' + Math.round(dur) + ' dtk, maks ±2 menit). Rekam lebih pendek.');
      var x = { vid: 'v' + idAcak(), nama: file.name || 'video.mp4', ukuran: file.size, mime: mime.split(';')[0], dur: dur };
      return vSimpanBlob(x.vid, file).then(function () { return vTaruhInfo(x.vid, { ke: 0, upId: '', fileId: '', total: Math.ceil(file.size / POTONG) }); }).then(function () { VURL[x.vid] = URL.createObjectURL(file); return x; });
    });
  }
  function keBase64(b) { return new Promise(function (ok, gagal) { var r = new FileReader(); r.onload = function () { var s = String(r.result); ok(s.slice(s.indexOf(',') + 1)); }; r.onerror = function () { gagal(r.error); }; r.readAsDataURL(b); }); }
  /** unggah 1 video sampai selesai (lanjut dari potongan terakhir) -> fileId */
  function unggahVideo(v) {
    return vInfo(v.vid).then(function (st) {
      st = st || { ke: 0, upId: '', fileId: '' }; if (st.fileId) return st.fileId;
      return vBlob(v.vid).then(function (blob) {
        if (!blob) throw new Error('berkas video hilang dari HP, pilih ulang');
        var total = Math.ceil(blob.size / POTONG);
        var mulai = st.upId ? Promise.resolve(st.upId) : API.Pusat.notaVideoMulai(sesi(), { nama: v.nama, mime: v.mime, ukuran: blob.size }).then(function (h) {
          if (!h || !h.ok) throw tolak((h && h.pesan) || 'unggah video ditolak'); st.upId = h.upId; return vTaruhInfo(v.vid, st).then(function () { return h.upId; });
        });
        return mulai.then(function (upId) {
          var lanjut = function () {
            PROGRES[v.vid] = st.ke / total; segarProgres();
            if (st.ke >= total) return API.Pusat.notaVideoSelesai(sesi(), upId).then(function (h) {
              if (!h || !h.ok) throw tolak((h && h.pesan) || 'video gagal diselesaikan'); st.fileId = h.fileId; PROGRES[v.vid] = 1; segarProgres();
              return vTaruhInfo(v.vid, st).then(function () { return vtx('blob', 'readwrite', function (s) { return s.delete(v.vid); }); }).then(function () { return h.fileId; });
            });
            return keBase64(blob.slice(st.ke * POTONG, Math.min(blob.size, (st.ke + 1) * POTONG))).then(function (b64) { return API.Pusat.notaVideoPotong(sesi(), upId, st.ke, b64); }).then(function (h) {
              if (!h || !h.ok) throw tolak((h && h.pesan) || 'potongan video ditolak'); st.ke++; return vTaruhInfo(v.vid, st).then(lanjut);
            });
          };
          return lanjut();
        });
      });
    });
  }
  function tolak(pesan) { var e = new Error(pesan); e.server = true; return e; }
  function segarProgres() {
    if (!lapisEl) return;
    Object.keys(PROGRES).forEach(function (vid) { var el = lapisEl.querySelector('[data-prog="' + vid + '"]'); if (el) { var p = Math.round(PROGRES[vid] * 100); el.querySelector('i').style.width = p + '%'; el.querySelector('em').textContent = p >= 100 ? 'terunggah' : 'mengunggah ' + p + '%'; } });
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
    segarProgres();
  }
  function tutup() { if (!lapisEl) return; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); if (CTX && CTX.perbarui) CTX.perbarui(); }

  function buka(ctx, keTab, keMode) {
    CTX = ctx || CTX; if (!boleh()) { CTX.roti('Nota bengkel khusus pengawas.'); return; }
    tab = keTab || 'daftar'; mode = keMode || 'satu'; F = null; lapis('<div class="kecil" style="text-align:center;padding:24px"><span class="putar"></span> Memuat...</div>');
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
    Promise.all([antre(), API.Pusat.notaSaya(sesi()).then(function (h) { if (h && h.ok) { LIST = h.list || []; Simpan.taruh('whlNotaSaya_' + akun(), JSON.stringify(LIST)); return null; } return (h && h.pesan) || 'Daftar belum bisa dimuat.'; }, function (e) {
      return Simpan.ambil('whlNotaSaya_' + akun()).then(function (v) { try { LIST = JSON.parse(v || 'null') || LIST; } catch (x) { /* */ } return e.message; });
    })]).then(function (r) { if (tab === 'daftar' && lapisEl) gambarDaftar(r[0], r[1]); }); /* jangan menimpa form kalau pengguna sudah pindah ke Ajukan nota */
  }
  function ringkasAntre(x) { var d = x.d; if (x.jenis === 'banyak') return d.toko + ' · ' + d.nota.length + ' nota · ' + rp(d.nota.reduce(function (s, n) { return s + Number(n.total || 0); }, 0)); return d.toko + ' · ' + d.lambung + ' · ' + rp(d.total); }
  function jumlahVideo(x) { var d = x.d; return x.jenis === 'banyak' ? d.nota.reduce(function (s, n) { return s + (n.videoVid || []).length; }, 0) : (d.videoVid || []).length; }
  function gambarDaftar(A, galat) {
    var h = !fiturBaru() ? '' : '<div class="baris" style="gap:8px;margin-bottom:12px"><button type="button" class="tUtama" data-n="baru:satu" style="margin:0;flex:1">' + IK('input') + ' 1 nota</button><button type="button" class="tUtama notaBanyakT" data-n="baru:banyak" style="margin:0;flex:1">📚 Banyak nota</button></div>';
    if (galat) h += '<div class="pitaData gagal">' + IK('alarm') + '<span>' + esc(galat) + (LIST ? ' Yang tampil daftar terakhir.' : '') + '</span><button type="button" data-n="tab:daftar">Coba lagi</button></div>';
    if (A.length) h += '<h2 class="bagW">Belum terkirim <span>' + A.length + '</span></h2><div class="kartu daftarKm">' + A.map(function (x, i) {
      var nv = jumlahVideo(x), st = x.salah ? '<em class="notaSt merah">Ditolak server</em>' : '<em class="notaSt kuning">' + (nv ? 'Menunggu unggah video' : 'Menunggu sinyal') + '</em>';
      return '<div class="notaBaris"><div class="tx"><b>' + esc(ringkasAntre(x)) + (nv ? ' · 🎥 ' + nv : '') + '</b><small>' + esc(x.d.masukKe) + (x.salah ? ' · ' + esc(x.salah) : ' · dikirim otomatis saat sinyal ada') + '</small>'
        + (x.d.nota || [x.d]).map(function (n) { return (n.videoVid || []).map(function (vid) { return '<span class="notaProg" data-prog="' + vid + '"><i></i><em>menunggu</em></span>'; }).join(''); }).join('') + '</div>' + st
        + (x.salah ? '<button type="button" class="tKecil" data-n="ubahAntre:' + i + '">Perbaiki</button>' : '<button type="button" class="tKecil" data-n="kirimSekarang">Kirim</button>') + '</div>';
    }).join('') + '</div>';
    var L = LIST || [];
    h += '<h2 class="bagW">Ajuan saya <span>' + L.length + '</span></h2>';
    h += L.length ? '<div class="kartu notaDaftar">' + L.map(function (x) {
      var w = WARNA[x.status] || ['abu', x.status], vid = Array.isArray(x.video) ? x.video.length : Number(x.video) || 0;
      return '<div class="notaKartu ' + w[0] + '"><div class="notaAtas"><b>' + esc(x.toko) + (vid ? ' <span class="notaVidT" title="ada video perbaikan">🎥' + (vid > 1 ? ' ' + vid : '') + '</span>' : '') + '</b><em class="notaSt ' + w[0] + '">' + esc(w[1]) + '</em></div>'
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
  function barisKosong() { return { tglNota: hariIni(), lambung: '', unit: '', uraian: '', total: 0, foto: [], video: [], unitManual: false }; }
  function formBaru(isi, keMode) {
    tab = 'baru'; if (keMode) mode = keMode;
    F = Object.assign({ masukKe: BENGKEL, jenisNota: 'JASA', tglNota: hariIni(), lambung: '', unit: '', toko: '', rekening: '', hariBayar: '', uraian: '', total: 0, keperluan: '', foto: [], wa: [], ba: [], video: [], baris: [barisKosong()] }, isi || {});
    gambarForm();
  }
  function pilih(nama, nilai, label) { return '<button type="button" class="' + (F[nama] === nilai ? 'on' : '') + '" data-n="set:' + nama + ':' + nilai + '">' + label + '</button>'; }
  /* lampiran foto: tempat = 'foto' | 'wa' | 'ba' | 'b3:foto' (baris 3) */
  function ambilTempat(t) { if (t.indexOf('b') === 0 && t.indexOf(':') > 0) { var p = t.split(':'); return F.baris[+p[0].slice(1)][p[1]]; } return F[t]; }
  function taruhTempat(t, v) { if (t.indexOf('b') === 0 && t.indexOf(':') > 0) { var p = t.split(':'); F.baris[+p[0].slice(1)][p[1]] = v; } else F[t] = v; }
  function lampiran(tempat, judul, wajib) {
    var L = ambilTempat(tempat) || [], maks = (OPSI && OPSI.maksFoto) || 3;
    return '<label class="lb">' + judul + (wajib ? ' <i class="wajib">wajib</i>' : '') + ' <span class="kecil">(' + L.length + '/' + maks + ')</span></label><div class="notaFoto">'
      + L.map(function (d, i) { return '<span><img src="' + d + '" alt=""><button type="button" data-n="hapusFoto:' + tempat + ':' + i + '" aria-label="Hapus foto">✕</button></span>'; }).join('')
      + (L.length < maks ? '<label class="notaTambah">' + IK('absen') + '<small>Kamera / galeri</small><input type="file" accept="image/*" data-foto="' + tempat + '" hidden></label>' : '') + '</div>';
  }
  function bagianVideo(tempat) {
    var L = ambilTempat(tempat) || [];
    return '<label class="lb">Video perbaikan <span class="kecil">(' + L.length + '/' + MAKS_VIDEO_NOTA + ', maks 50 MB / ±2 menit)</span></label><div class="notaVid">'
      + L.map(function (v, i) { return '<div class="notaVidK"><video src="' + (VURL[v.vid] || '') + '" muted playsinline preload="metadata"></video><div class="tx"><b>🎥 ' + esc(v.nama) + '</b><small>' + mb(v.ukuran) + (v.dur ? ' · ' + Math.round(v.dur) + ' dtk' : '') + '</small><span class="notaProg" data-prog="' + v.vid + '"><i></i><em>belum diunggah</em></span></div><button type="button" class="tKecil" data-n="hapusVideo:' + tempat + ':' + i + '" aria-label="Hapus video">✕</button></div>'; }).join('')
      + (L.length < MAKS_VIDEO_NOTA ? '<div class="notaVidTombol"><label class="tKecil">' + IK('absen') + ' Rekam video<input type="file" accept="video/*" capture="environment" data-video="' + tempat + '" hidden></label><label class="tKecil">' + IK('kotak') + ' Dari galeri<input type="file" accept="video/*" data-video="' + tempat + '" hidden></label></div>' : '')
      + '</div>';
  }
  function bersama(b, af) {
    return '<div class="segmen notaJenis">' + pilih('masukKe', BENGKEL, IK('monitor') + 'Bengkel terafiliasi') + pilih('masukKe', AJU, IK('dokumen') + 'Pengajuan &gt; 3 jt') + '</div>'
      + '<div class="kecil" style="margin:-4px 2px 6px">' + (b ? 'Bengkel tetap, dibayar hari Selasa / Jumat.' : 'Nota di atas Rp 3 juta: wajib keperluan, berita acara (BA), dan foto nota.') + '</div>'
      + '<label class="lb">Jenis nota</label><div class="segmen kecilSeg">' + pilih('jenisNota', 'JASA', 'Jasa') + pilih('jenisNota', 'KAS', 'Kas') + '</div>'
      + (b ? '<label class="lb" for="ntToko">Bengkel <i class="wajib">wajib</i></label><select class="isian" id="ntToko" data-f="toko"><option value="">Pilih bengkel terafiliasi</option>' + af.map(function (x) { return '<option' + (F.toko === x ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('') + '</select>'
        + '<label class="lb" for="ntRek">Rekening</label><input class="isian" id="ntRek" data-f="rekening" placeholder="Bank · nomor · atas nama" value="' + esc(F.rekening) + '">'
        + '<label class="lb">Hari bayar <i class="wajib">wajib</i></label><div class="segmen kecilSeg">' + pilih('hariBayar', 'SELASA', 'Selasa') + pilih('hariBayar', 'JUMAT', 'Jumat') + '</div>'
        : '<label class="lb" for="ntToko">Vendor <i class="wajib">wajib</i></label><input class="isian kapital" id="ntToko" data-f="toko" placeholder="Nama vendor / toko" value="' + esc(F.toko) + '">'
        + '<label class="lb" for="ntKep">Keperluan / alasan <i class="wajib">wajib</i></label><textarea class="isian bnrTA" id="ntKep" data-f="keperluan" rows="3" placeholder="Kenapa perlu pengajuan ini">' + esc(F.keperluan) + '</textarea>');
  }
  function lbUnit(idL, idU, fL, fU, vL, vU) {
    return '<div class="baris"><div style="flex:1.2;min-width:0"><label class="lb" for="' + idL + '">Lambung</label><input class="isian kapital" id="' + idL + '" data-f="' + fL + '" list="ntLbDaftar" placeholder="mis. WHL 1012" autocomplete="off" value="' + esc(vL) + '"></div>'
      + '<div style="flex:1;min-width:0"><label class="lb" for="' + idU + '">Unit</label><input class="isian kapital" id="' + idU + '" data-f="' + fU + '" placeholder="otomatis" value="' + esc(vU) + '"></div></div>';
  }
  function gambarForm() {
    var b = F.masukKe === BENGKEL, af = (OPSI && OPSI.bengkelAf) || [];
    var dl = '<datalist id="ntLbDaftar">' + ((OPSI && OPSI.lambung) || []).map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>';
    if (!fiturBaru()) mode = 'satu';
    var h = !fiturBaru() ? '' : '<div class="segmen notaMode"><button type="button" class="' + (mode === 'satu' ? 'on' : '') + '" data-n="mode:satu">1 nota</button><button type="button" class="' + (mode === 'banyak' ? 'on' : '') + '" data-n="mode:banyak">📚 Banyak nota</button></div>';
    if (mode === 'banyak') {
      var sub = F.baris.reduce(function (s, n) { return s + Number(n.total || 0); }, 0);
      h += '<div class="kartu notaForm"><b class="notaJudulB">Isian bersama</b>' + bersama(b, af) + lampiran('wa', 'Screenshot WA', false) + (b ? '' : lampiran('ba', 'Berita acara (BA)', true)) + '</div>' + dl
        + F.baris.map(function (n, i) {
          return '<div class="kartu notaForm notaBarisK"><div class="notaAtas"><b>Nota ' + (i + 1) + '</b>' + (F.baris.length > 1 ? '<button type="button" class="tKecil notaHapusB" data-n="hapusBaris:' + i + '">Hapus</button>' : '') + '</div>'
            + '<label class="lb">Tanggal nota</label><input class="isian" type="date" data-f="b' + i + ':tglNota" value="' + esc(n.tglNota) + '">'
            + lbUnit('ntLb' + i, 'ntUnit' + i, 'b' + i + ':lambung', 'b' + i + ':unit', n.lambung, n.unit)
            + '<label class="lb">Uraian</label><textarea class="isian bnrTA" data-f="b' + i + ':uraian" rows="2" placeholder="Barang / pekerjaan">' + esc(n.uraian) + '</textarea>'
            + '<label class="lb">Total <i class="wajib">wajib</i></label><input class="isian notaRp" data-f="b' + i + ':total" inputmode="numeric" placeholder="Rp 0" value="' + (n.total ? rp(n.total) : '') + '">'
            + lampiran('b' + i + ':foto', 'Foto nota', !b) + bagianVideo('b' + i + ':video') + '</div>';
        }).join('')
        + '<button type="button" class="tKecil notaTambahB" data-n="tambahBaris">+ Nota berikutnya</button>'
        + '<div class="kartu notaSub"><span>' + F.baris.length + ' nota</span><b id="ntSub">' + rp(sub) + '</b></div>'
        + '<div class="pesan" id="ntPesan"></div><button type="button" class="tUtama" data-n="kirim"' + (mengirim ? ' disabled' : '') + '>' + (mengirim ? '<span class="putar"></span> Mengirim...' : 'Kirim ' + F.baris.length + ' nota ke admin') + '</button>'
        + '<div class="kecil" style="text-align:center;margin:8px 0 20px">Video diunggah dulu (bisa lanjut kalau sinyal putus), lalu semua nota dikirim. Kiriman besar dipecah otomatis.</div>';
      lapis(h); return;
    }
    h += (F.idUlang ? '<div class="pitaData">' + IK('alarm') + '<span>Memperbaiki ajuan ' + esc(F.idUlang) + '. Lampirkan ulang foto, lalu kirim.</span></div>' : '')
      + '<div class="kartu notaForm">' + bersama(b, af)
      + '<label class="lb" for="ntTgl">Tanggal nota</label><input class="isian" type="date" id="ntTgl" data-f="tglNota" value="' + esc(F.tglNota) + '">'
      + lbUnit('ntLb', 'ntUnit', 'lambung', 'unit', F.lambung, F.unit) + dl
      + '<label class="lb" for="ntUraian">Uraian</label><textarea class="isian bnrTA" id="ntUraian" data-f="uraian" rows="3" placeholder="Barang / pekerjaan">' + esc(F.uraian) + '</textarea>'
      + '<label class="lb" for="ntTotal">Total <i class="wajib">wajib</i></label><input class="isian notaRp" id="ntTotal" data-f="total" inputmode="numeric" placeholder="Rp 0" value="' + (F.total ? rp(F.total) : '') + '"><div class="kecil" id="ntTerbilang">' + (F.total > 3000000 && b ? '<b style="color:var(--tKuning)">Total di atas Rp 3 juta: biasanya lewat Pengajuan &gt; 3 jt.</b>' : '') + '</div>'
      + lampiran('foto', 'Foto nota', !b) + lampiran('wa', 'Screenshot WA', false) + (b ? '' : lampiran('ba', 'Berita acara (BA)', true)) + (fiturBaru() ? bagianVideo('video') : '')
      + '<div class="pesan" id="ntPesan"></div><button type="button" class="tUtama" data-n="kirim"' + (mengirim ? ' disabled' : '') + '>' + (mengirim ? '<span class="putar"></span> Mengirim...' : 'Kirim ke admin') + '</button>'
      + '<div class="kecil" style="text-align:center;margin-top:8px">Admin di Input DO memberi kode nota (ACC) atau menolak dengan alasan. Kalau sinyal putus, ajuan disimpan di HP dan dikirim otomatis.</div></div>';
    lapis(h);
  }
  function setNilai(k, v) { if (k.indexOf('b') === 0 && k.indexOf(':') > 0) { var p = k.split(':'), n = F.baris[+p[0].slice(1)]; if (n) n[p[1]] = p[1] === 'total' ? angka(v) : v; } else F[k] = k === 'total' ? angka(v) : v; }
  function simpanIsian() { if (!lapisEl || !F) return; Array.prototype.forEach.call(lapisEl.querySelectorAll('[data-f]'), function (e) { setNilai(e.getAttribute('data-f'), e.value); }); }
  function isiUnit(kL, nilai) {
    var u = unitDari(nilai); if (!u) return;
    var kU = kL.replace('lambung', 'unit'), el = lapisEl.querySelector('[data-f="' + kU + '"]'), manual = kL.indexOf(':') > 0 ? F.baris[+kL.split(':')[0].slice(1)].unitManual : F.unitManual;
    if (el && !manual) { el.value = u; setNilai(kU, u); }
  }
  function ketik(ev) {
    var e = ev.target; if (!e.getAttribute || !F) return; var k = e.getAttribute('data-f'); if (!k) return;
    setNilai(k, e.value);
    if (/total$/.test(k)) {
      if (mode === 'banyak') { var s = document.getElementById('ntSub'); if (s) s.textContent = rp(F.baris.reduce(function (a, n) { return a + Number(n.total || 0); }, 0)); }
      else { var t = document.getElementById('ntTerbilang'); if (t) t.innerHTML = F.total ? rp(F.total) + (F.total > 3000000 && F.masukKe === BENGKEL ? ' · <b style="color:var(--tKuning)">di atas Rp 3 juta: biasanya lewat Pengajuan &gt; 3 jt</b>' : '') : ''; }
      return;
    }
    if (/lambung$/.test(k)) isiUnit(k, e.value);
    if (/unit$/.test(k)) { if (k.indexOf(':') > 0) F.baris[+k.split(':')[0].slice(1)].unitManual = !!e.value; else F.unitManual = !!e.value; }
  }
  /* huruf besar & format Rp hanya saat kolom ditinggalkan (keyboard HP tidak terganggu) */
  function lepasFokus(ev) {
    var e = ev.target; if (!e.getAttribute || !F) return; var k = e.getAttribute('data-f'); if (!k) return;
    if (/total$/.test(k)) { var n = angka(e.value); e.value = n ? rp(n) : ''; }
    if (e.classList && e.classList.contains('kapital')) { e.value = e.value.toUpperCase().replace(/\s+/g, ' ').trim(); setNilai(k, e.value); if (/lambung$/.test(k)) isiUnit(k, e.value); }
  }
  function ubah(ev) {
    var e = ev.target; if (!e.getAttribute) return;
    if (e.getAttribute('data-f')) { setNilai(e.getAttribute('data-f'), e.value); return; }
    var p = document.getElementById('ntPesan');
    var j = e.getAttribute('data-foto');
    if (j && e.files && e.files[0]) {
      var berkas = e.files[0]; e.value = ''; simpanIsian(); if (p) p.textContent = 'Mengompres foto...';
      kompres(berkas).then(function (d) { taruhTempat(j, (ambilTempat(j) || []).concat([d]).slice(0, (OPSI && OPSI.maksFoto) || 3)); gambarForm(); R.getar(); }, function (x) { if (p) p.textContent = 'Foto gagal: ' + x.message; R.bunyi('gagal'); });
      return;
    }
    var v = e.getAttribute('data-video');
    if (v && e.files && e.files[0]) {
      var fv = e.files[0]; e.value = ''; simpanIsian(); if (p) p.textContent = 'Memeriksa video...';
      tambahVideo(fv).then(function (x) { taruhTempat(v, (ambilTempat(v) || []).concat([x]).slice(0, MAKS_VIDEO_NOTA)); gambarForm(); R.getar(); }, function (x) { if (p) p.textContent = 'Video: ' + x.message; R.bunyi('gagal'); R.getar('awas'); });
    }
  }
  function periksaNota(n, b, label) {
    if (!n.tglNota) return label + 'isi tanggal nota.';
    if (!String(n.lambung || '').trim()) return label + 'isi lambung unit.';
    if (!(Number(n.total) > 0)) return label + 'isi total nota.';
    if (!b && !(n.foto || []).length) return label + 'lampirkan foto nota.';
    return '';
  }
  function periksa() {
    simpanIsian(); var b = F.masukKe === BENGKEL;
    if (!F.toko.trim()) return b ? 'Pilih bengkel terafiliasi.' : 'Isi nama vendor.';
    if (b && !F.hariBayar) return 'Pilih hari bayar: Selasa atau Jumat.';
    if (!b && !F.keperluan.trim()) return 'Isi keperluan / alasan pengajuan.';
    if (!b && !F.ba.length) return 'Lampirkan berita acara (BA).';
    if (mode === 'banyak') { for (var i = 0; i < F.baris.length; i++) { var s = periksaNota(F.baris[i], b, 'Nota ' + (i + 1) + ': '); if (s) return s; } return ''; }
    return periksaNota(F, b, '');
  }
  function vidRingkas(L) { return (L || []).map(function (v) { return { vid: v.vid, nama: v.nama, mime: v.mime, ukuran: v.ukuran }; }); }
  function paketBersama(b) { return { masukKe: F.masukKe, jenisNota: F.jenisNota, toko: F.toko.trim(), rekening: b ? F.rekening.trim() : '', hariBayar: b ? F.hariBayar : '', keperluan: b ? '' : F.keperluan.trim(), wa: F.wa.slice(), ba: b ? [] : F.ba.slice() }; }
  /** -> daftar item antrean (1 untuk "1 nota"; banyak dipecah per kelompok <= ±6 MB foto) */
  function buatItem() {
    var b = F.masukKe === BENGKEL, cid = 'c' + idAcak();
    if (mode !== 'banyak') {
      var d = Object.assign(paketBersama(b), { tglNota: F.tglNota, lambung: F.lambung.trim().toUpperCase(), unit: (F.unit || '').trim().toUpperCase(), uraian: F.uraian.trim(), total: Number(F.total), foto: F.foto.slice(), videoVid: vidRingkas(F.video), cid: cid });
      if (F.idUlang) d.idUlang = F.idUlang;
      return [{ cid: cid, jenis: 'satu', waktu: Date.now(), d: d }];
    }
    var dasar = paketBersama(b), ukDasar = dasar.wa.concat(dasar.ba).reduce(function (s, x) { return s + x.length; }, 0), kel = [], kini = [], uk = ukDasar;
    F.baris.forEach(function (n, i) {
      var r = { tglNota: n.tglNota, lambung: String(n.lambung).trim().toUpperCase(), unit: String(n.unit || '').trim().toUpperCase(), uraian: String(n.uraian || '').trim(), total: Number(n.total), kode: '', foto: n.foto.slice(), videoVid: vidRingkas(n.video), _baris: i + 1 };
      var ukR = r.foto.reduce(function (s, x) { return s + x.length; }, 0);
      if (kini.length && uk + ukR > ((window.WHL_KONFIG && window.WHL_KONFIG.BATAS_KIRIM_NOTA) || BATAS_KIRIM)) { kel.push(kini); kini = []; uk = ukDasar; }
      kini.push(r); uk += ukR;
    });
    if (kini.length) kel.push(kini);
    return kel.map(function (rows, g) { var c = cid + '-' + (g + 1); return { cid: c, jenis: 'banyak', waktu: Date.now(), kelompok: (g + 1) + '/' + kel.length, d: Object.assign({}, dasar, { nota: rows, cid: c }) }; });
  }
  function kirim() {
    var salah = periksa(), p = document.getElementById('ntPesan');
    if (salah) { if (p) p.textContent = salah; R.bunyi('gagal'); R.getar('awas'); return; }
    var items = buatItem(); mengirim = true; gambarForm();
    antre().then(function (A) { return taruhAntre(A.concat(items)); }).then(function () {
      var hasil = []; return items.reduce(function (pr, it) { return pr.then(function () { return kirimSatu(it).then(function (h) { hasil.push({ it: it, h: h }); }); }); }, Promise.resolve()).then(function () { return hasil; });
    }).then(function (hasil) {
      mengirim = false;
      var ok = hasil.filter(function (x) { return x.h.ok; }), tolak2 = hasil.filter(function (x) { return x.h.ditolak; }), tunda = hasil.filter(function (x) { return x.h.tunda; });
      var ids = [].concat.apply([], ok.map(function (x) { return [].concat(x.h.id); }));
      if (!tolak2.length && !tunda.length) { R.sukses({ judul: ids.length > 1 ? ids.length + ' nota terkirim' : 'Nota terkirim', sub: 'Menunggu admin memberi kode nota (ACC) atau menolak.', rinci: [['No. ajuan', ids.join(', ')], ['Toko', items[0].d.toko]], konfeti: false }); F = null; daftar(); return; }
      if (tolak2.length && !ok.length && !tunda.length && items.length === 1) { hapusAntre(items[0].cid); gambarForm(); var q = document.getElementById('ntPesan'); if (q) q.textContent = 'Server menolak: ' + tolak2[0].h.pesan; R.bunyi('gagal'); return; }
      CTX.roti((ids.length ? ids.length + ' nota terkirim. ' : '') + (tunda.length ? tunda.length + ' kiriman menunggu sinyal / unggah video (otomatis). ' : '') + (tolak2.length ? tolak2.length + ' kiriman ditolak server, cek "Belum terkirim".' : ''));
      F = null; daftar();
    }).catch(function (e) { mengirim = false; if (!F) return; gambarForm(); var q = document.getElementById('ntPesan'); if (q) q.textContent = 'Gagal menyimpan di HP: ' + (e && e.message); });
  }
  /** kirim 1 item antrean: unggah videonya dulu, lalu ajuan dengan cid -> {ok,id} | {ditolak,pesan} | {tunda} */
  function kirimSatu(item) {
    var rows = item.jenis === 'banyak' ? item.d.nota : [item.d], semua = [];
    rows.forEach(function (n) { (n.videoVid || []).forEach(function (v) { semua.push(v); }); });
    return semua.reduce(function (pr, v) { return pr.then(function (peta) { return unggahVideo(v).then(function (fid) { peta[v.vid] = fid; return peta; }); }); }, Promise.resolve({})).then(function (peta) {
      var d = JSON.parse(JSON.stringify(item.d));
      (item.jenis === 'banyak' ? d.nota : [d]).forEach(function (n) { n.video = (n.videoVid || []).map(function (v) { return peta[v.vid]; }); delete n.videoVid; delete n._baris; });
      return (item.jenis === 'banyak' ? API.Pusat.notaAjukanBanyak(sesi(), d) : API.Pusat.notaAjukan(sesi(), d)).then(function (h) {
        if (h && h.ok) return Promise.all(semua.map(function (v) { return vHapus(v.vid).catch(function () { }); })).then(function () { return hapusAntre(item.cid); }).then(function () { return { ok: true, id: h.id }; });
        if (h && h.login === false) return { tunda: true };
        item.salah = (h && h.pesan) || 'ditolak server'; return ubahAntre(item).then(function () { return { ditolak: true, pesan: item.salah }; });
      }, function () { return { tunda: true }; }); // jaringan: kirim ulang nanti dengan cid yang SAMA -> server tidak menyimpan dobel
    }, function (e) {
      if (e && e.server) { item.salah = 'Video: ' + e.message; return ubahAntre(item).then(function () { return { ditolak: true, pesan: item.salah }; }); }
      return { tunda: true }; // video belum selesai terunggah (sinyal putus) -> lanjut nanti dari potongan terakhir
    });
  }
  function ubahAntre(item) { return antre().then(function (A) { A = A.map(function (x) { return x.cid === item.cid ? item : x; }); return taruhAntre(A); }); }
  function hapusAntre(cid) { return antre().then(function (A) { return taruhAntre(A.filter(function (x) { return x.cid !== cid; })); }); }
  var sedangAntre = false;
  function kirimAntrean() {
    if (sedangAntre || mengirim || !sesi() || !boleh() || !navigator.onLine) return Promise.resolve();
    sedangAntre = true;
    return antre().then(function (A) {
      var L = A.filter(function (x) { return !x.salah; }), terkirim = 0;
      return L.reduce(function (p, x) { return p.then(function () { return kirimSatu(x).then(function (h) { if (h.ok) terkirim += [].concat(h.id).length; }); }); }, Promise.resolve()).then(function () {
        sedangAntre = false; if (terkirim) { CTX && CTX.roti(terkirim + ' nota tertunda berhasil dikirim.'); if (lapisEl && tab === 'daftar') daftar(); }
      });
    }).catch(function () { sedangAntre = false; });
  }
  window.addEventListener('online', function () { setTimeout(kirimAntrean, 1500); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kirimAntrean(); });
  setInterval(kirimAntrean, 60000);

  function klik(ev) {
    var b = ev.target.closest('[data-n]'); if (!b) return; var n = b.getAttribute('data-n');
    if (n === 'kembali') { if (tab === 'baru' && F) { simpanIsian(); daftar(); } else tutup(); return; }
    if (n === 'ulangBuka') { buka(CTX, tab, mode); return; }
    if (n.indexOf('tab:') === 0) { var t = n.slice(4); if (t === 'baru') formBaru(); else daftar(); return; }
    if (n.indexOf('baru:') === 0) { formBaru(null, n.slice(5)); return; }
    if (n.indexOf('mode:') === 0) { simpanIsian(); mode = n.slice(5); if (mode === 'banyak' && F.baris.length === 1 && !F.baris[0].lambung && F.lambung) F.baris[0] = { tglNota: F.tglNota, lambung: F.lambung, unit: F.unit, uraian: F.uraian, total: F.total, foto: F.foto.slice(), video: F.video.slice() }; gambarForm(); return; }
    if (n.indexOf('set:') === 0) { simpanIsian(); var p = n.split(':'); F[p[1]] = p.slice(2).join(':'); if (p[1] === 'masukKe' && F.masukKe === BENGKEL && F.toko && (OPSI.bengkelAf || []).indexOf(F.toko) < 0) F.toko = ''; gambarForm(); R.getar(); return; }
    if (n.indexOf('hapusFoto:') === 0) { simpanIsian(); var q = n.slice(10), i0 = q.lastIndexOf(':'), tp = q.slice(0, i0); var L0 = ambilTempat(tp); L0.splice(+q.slice(i0 + 1), 1); gambarForm(); return; }
    if (n.indexOf('hapusVideo:') === 0) { simpanIsian(); var qv = n.slice(11), iv = qv.lastIndexOf(':'), tv = qv.slice(0, iv), Lv = ambilTempat(tv), x = Lv.splice(+qv.slice(iv + 1), 1)[0]; if (x) vHapus(x.vid).catch(function () { }); gambarForm(); return; }
    if (n === 'tambahBaris') { simpanIsian(); var akhir = F.baris[F.baris.length - 1] || barisKosong(); var nb = barisKosong(); nb.tglNota = akhir.tglNota || hariIni(); F.baris.push(nb); gambarForm(); setTimeout(function () { var k = lapisEl && lapisEl.querySelectorAll('.notaBarisK'); if (k && k.length) k[k.length - 1].scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60); return; }
    if (n.indexOf('hapusBaris:') === 0) { simpanIsian(); var hb = F.baris.splice(+n.slice(11), 1)[0]; (hb && hb.video || []).forEach(function (v) { vHapus(v.vid).catch(function () { }); }); gambarForm(); return; }
    if (n === 'kirim') { if (!mengirim) kirim(); return; }
    if (n === 'kirimSekarang') { kirimAntrean().then(function () { daftar(); }); return; }
    if (n.indexOf('ulang:') === 0) {
      var id = n.slice(6), xu = (LIST || []).filter(function (y) { return y.id === id; })[0]; if (!xu) return;
      formBaru({ idUlang: id, masukKe: xu.masukKe, toko: xu.toko, lambung: xu.lambung, unit: xu.unit, total: Number(xu.total) || 0, uraian: xu.uraian || '' }, 'satu'); return;
    }
    if (n.indexOf('ubahAntre:') === 0) {
      var ia = +n.slice(10); antre().then(function (A) {
        var it = A[ia]; if (!it) return;
        return hapusAntre(it.cid).then(function () {
          var d = it.d, pulih = function (L) { return (L || []).map(function (v) { return Object.assign({}, v); }); };
          if (it.jenis === 'banyak') formBaru(Object.assign({}, d, { baris: d.nota.map(function (r) { return { tglNota: r.tglNota, lambung: r.lambung, unit: r.unit, uraian: r.uraian, total: r.total, foto: r.foto || [], video: pulih(r.videoVid) }; }) }), 'banyak');
          else formBaru(Object.assign({}, d, { video: pulih(d.videoVid) }), 'satu');
        });
      });
    }
  }
  /** untuk tombol Back HP */
  function kembali() { if (!lapisEl) return false; if (tab === 'baru' && F) { simpanIsian(); daftar(); } else tutup(); return true; }
  window.WHL_NOTA = { pasang: function (c) { CTX = c; }, boleh: boleh, buka: buka, kirimAntrean: kirimAntrean, kembali: kembali, _uji: { form: function (isi, m) { formBaru(isi, m); }, isi: function () { return F; } } };
})();
