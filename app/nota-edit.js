/* ===== nota-edit.js — EDIT / REVISI AJUAN NOTA (nota-edit-ajuan-17nov, Dodi 17 Nov 2026). FILE BARU App WHL (www).
 * Reza: "sama di nota aku minta fitur edit ajuan jg, karena kadang mau revisi jg".
 * Server DASHBOARD PusatNotaEdit.gs: pusatNotaDetail / pusatNotaUbah / pusatNotaFotoLihat. Tombol cuma muncul kalau pusatPing memuat pusatNotaUbah.
 *  - status Menunggu ACC / Menunggu transfer -> "✏️ Edit ajuan" = langsung tersimpan.
 *  - status Di-ACC / Lunas -> "✏️ Ajukan revisi" = alasan wajib, admin Input DO cek lama vs baru lalu ACC / tolak.
 * Dipanggil dari nota.js (3 cari-ganti): tombol(G, x) di kartu "Ajuan saya", buka(id, o) dari klik data-n="edit:<id>", tutup() dari tombol Back HP.
 * Input huruf besar: CSS text-transform, nilai diubah saat focusout / kirim (bukan tiap ketikan). Tanpa alert/confirm. ===== */
(function () {
  'use strict';
  var R = window.WHL_RASA, API = window.WHL_API;
  var el = null, E = null, O = null, FOTO = {}, HARI = ['SELASA', 'JUMAT'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function IK(n) { return window.WHL_IKON ? window.WHL_IKON(n) : ''; }
  function rp(n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }
  function angka(t) { return Number(String(t || '').replace(/[^0-9]/g, '')) || 0; }
  function besar(t) { return String(t || '').toUpperCase().replace(/\s+/g, ' ').trim(); }
  function aktif() { return !!(API && API.Pusat && API.Pusat.punya && API.Pusat.punya('pusatNotaUbah')); }
  function token() { var S = O && O.ctx && O.ctx.sesi && O.ctx.sesi(); return S && S.tokenPusat; }
  function bunyi(x) { try { if (R) R.bunyi(x); } catch (e) { /* */ } }
  function roti(t) { try { O.ctx.roti(t); } catch (e) { /* */ } }
  var BISA_UBAH = ['DIAJUKAN', 'MENUNGGU TRANSFER'], BISA_REV = ['DI-ACC', 'DIBAYAR'];

  /** tombol di kartu "Ajuan saya" (G = 1 grup ajuan, x = baris pertama) */
  function tombol(G, x) {
    if (!aktif() || !x) return '';
    var st = String(x.status || '').toUpperCase(), h = '';
    var rv = G.map(function (y) { return y.revisi; }).filter(Boolean).pop();
    if (rv) {
      if (rv.status === 'DIAJUKAN') h += '<div class="notaRetur"><span class="notaSt kuning">✏️ Revisi menunggu ACC admin</span></div>';
      else if (rv.status === 'DITOLAK') h += '<div class="notaRetur"><span class="notaSt merah">✏️ Revisi ditolak: ' + esc(rv.alasanTolak || '-') + '</span></div>';
      else if (rv.status === 'DITERIMA') h += '<div class="notaRetur"><span class="notaSt hijau">✏️ Revisi diterima' + (rv.waktu ? ' · ' + esc(rv.waktu) : '') + '</span></div>';
      else if (rv.status === 'LANGSUNG') h += '<div class="notaRetur"><span class="notaSt abu">✏️ Diubah ' + esc(rv.waktu || '') + (rv.sumber === 'ADMIN' ? ' (admin)' : '') + '</span></div>';
    }
    if (BISA_UBAH.indexOf(st) >= 0) h += '<button type="button" class="tKecil notaEditT" data-n="edit:' + esc(x.id) + '">✏️ Edit ajuan</button>';
    else if (BISA_REV.indexOf(st) >= 0 && x.kode) h += '<button type="button" class="tKecil notaEditT" data-n="edit:' + esc(x.id) + '">✏️ Ajukan revisi</button>';
    return h;
  }
  function gaya() {
    if (document.getElementById('notaEditGaya')) return; var st = document.createElement('style'); st.id = 'notaEditGaya';
    st.textContent = '.notaEditT{margin-top:10px;width:100%}.neKartu{margin-bottom:12px}.neUnit{border:1px solid var(--garis,rgba(255,255,255,.12));border-radius:14px;padding:10px;margin:8px 0}'
      + '.neFoto{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 4px}.neFoto span{position:relative;width:84px;height:84px;border-radius:12px;overflow:hidden;background:rgba(127,127,127,.15);display:flex;align-items:center;justify-content:center;font-size:11px}'
      + '.neFoto img{width:100%;height:100%;object-fit:cover}.neFoto button{position:absolute;top:3px;right:3px;width:26px;height:26px;border-radius:50%;border:0;background:rgba(0,0,0,.6);color:#fff;font-size:14px}'
      + '.neFoto .baru{outline:2px solid var(--tHijau,#34d399)}.neInfo{font-size:12.5px;padding:8px 10px;border-radius:12px;background:rgba(255,214,10,.12);margin-bottom:10px}.neRiw{font-size:12px;opacity:.85;margin:4px 0}'
      + '.neKap{text-transform:uppercase}';
    document.head.appendChild(st);
  }
  function tutup() { if (!el) return false; var d = el; el = null; E = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); return true; }
  /** o = { ctx, list, opsi, kompres(file)->Promise<dataUrl>, sesudah() } */
  function buka(id, o) {
    O = o || O; if (!O) return; gaya(); tutup();
    E = { id: id, muat: true, pesan: '', kirim: false, cid: 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) };
    el = document.createElement('div'); el.className = 'lapis ksnLapis neLapis'; document.body.appendChild(el);
    requestAnimationFrame(function () { if (el) el.classList.add('tampil'); });
    el.addEventListener('click', klik); el.addEventListener('change', ubah); el.addEventListener('focusout', lepas);
    gambar(); bunyi('sheet');
    var aku = E;
    API.Pusat.panggil('pusatNotaDetail', [token(), id], 30000).then(function (h) {
      if (E !== aku) return; E.muat = false;
      if (!h || !h.ok) { E.pesan = h && h.login === false ? 'Sesi habis, masuk lagi.' : ((h && h.pesan) || 'Ajuan tidak terbaca.'); gambar(); return; }
      var a = h.a; E.a = a; E.bisa = h.bisa; E.tunggu = h.tunggu; E.riwayat = h.riwayat || []; E.maks = h.maksFoto || 3;
      E.f = { tglNota: a.tglNota, toko: a.toko, rekening: a.rekening, hariBayar: a.hariBayar, keperluan: a.keperluan, alasan: '',
        unit: a.unit.map(function (u) { return { id: u.id, lambung: u.lambung, unit: u.unit, uraian: u.uraian, total: u.total }; }),
        tetap: { foto: a.foto.slice(), kerja: a.kerja.slice(), ba: a.ba.slice() }, baru: { foto: [], kerja: [], ba: [] } };
      gambar(); muatFoto();
    }, function () { if (E !== aku) return; E.muat = false; E.pesan = 'Koneksi putus. Tutup lalu buka lagi.'; gambar(); });
  }
  function muatFoto() {
    if (!E || !E.a) return; var aku = E;
    [].concat(E.a.foto, E.a.kerja, E.a.ba).forEach(function (fid) {
      if (FOTO[fid]) return;
      API.Pusat.panggil('pusatNotaFotoLihat', [token(), E.a.id, fid], 30000).then(function (h) { if (h && h.ok && h.dataUrl) { FOTO[fid] = h.dataUrl; if (E === aku) { var im = el && el.querySelector('img[data-fid="' + fid + '"]'); if (im) im.src = h.dataUrl; } } }, function () { /* biarkan kotak kosong */ });
    });
  }
  function bagFoto(k, judul, wajib) {
    var f = E.f, n = f.tetap[k].length + f.baru[k].length, maks = E.maks;
    return '<label class="lb">' + judul + (wajib ? ' <i class="wajib">wajib</i>' : '') + ' <span class="kecil">(' + n + '/' + maks + ')</span></label><div class="neFoto">'
      + f.tetap[k].map(function (fid, i) { return '<span>' + (FOTO[fid] ? '<img data-fid="' + esc(fid) + '" src="' + FOTO[fid] + '" alt="">' : '<img data-fid="' + esc(fid) + '" alt="memuat…">') + '<button type="button" data-e="buangT:' + k + ':' + i + '" aria-label="Buang foto">✕</button></span>'; }).join('')
      + f.baru[k].map(function (d, i) { return '<span class="baru"><img src="' + d + '" alt=""><button type="button" data-e="buangB:' + k + ':' + i + '" aria-label="Buang foto">✕</button></span>'; }).join('')
      + (n < maks ? '<label class="notaTambah notaKamera">' + IK('absen') + '<small>📷 Kamera</small><input type="file" accept="image/*" capture="environment" data-efoto="' + k + '" hidden></label><label class="notaTambah notaGaleri">' + IK('kotak') + '<small>🖼️ Galeri</small><input type="file" accept="image/*" multiple data-efoto="' + k + '" hidden></label>' : '')
      + '</div>';
  }
  function gambar() {
    if (!el || !E) return;
    var judul = E.bisa === 'revisi' ? '✏️ Ajukan revisi' : '✏️ Edit ajuan', h = '<div class="ksnKp"><button type="button" class="kb" data-e="tutup" aria-label="Kembali">‹</button><div class="nm">' + esc((E.a && (E.a.kode || E.a.id)) || 'Nota bengkel') + '<b>' + judul + '</b></div></div><div class="ksnIsi notaIsi">';
    if (E.muat) { el.innerHTML = h + '<div class="kartu"><span class="putar"></span> Memuat ajuan…</div></div>'; return; }
    if (!E.a) { el.innerHTML = h + '<div class="kartu">' + esc(E.pesan || 'Ajuan tidak terbaca.') + '</div></div>'; return; }
    var a = E.a, f = E.f, mk = a.masukKe;
    if (!E.bisa) { el.innerHTML = h + '<div class="kartu">Ajuan berstatus ' + esc(a.status) + ', tidak bisa diubah.</div></div>'; return; }
    h += '<div class="neInfo">' + (E.bisa === 'revisi' ? 'Ajuan sudah ' + (a.status === 'DIBAYAR' ? 'dibayar' : 'di-ACC') + '. Perubahan dikirim sebagai <b>revisi</b>: admin cek dulu, nota & sheet admin baru berubah sesudah di-ACC.' : 'Ajuan belum diproses admin: perubahan <b>langsung tersimpan</b>.') + ' Lambung & jumlah unit tidak bisa diubah.</div>';
    if (E.tunggu) h += '<div class="neInfo">Revisi sebelumnya masih menunggu ACC: ' + esc(E.tunggu.perubahan || '') + '. Kirim lagi = menggantikan revisi itu.</div>';
    h += '<div class="kartu neKartu"><label class="lb" for="neTgl">Tanggal nota</label><input class="isian" type="date" id="neTgl" data-ef="tglNota" value="' + esc(f.tglNota) + '">';
    var af = ((O.opsi && O.opsi.bengkelAf) || []).map(besar);
    if (mk === 'BENGKEL TETAP' && af.length) h += '<label class="lb" for="neToko">Bengkel terafiliasi</label><select class="isian" id="neToko" data-ef="toko">' + af.map(function (b) { return '<option' + (b === besar(f.toko) ? ' selected' : '') + '>' + esc(b) + '</option>'; }).join('') + (af.indexOf(besar(f.toko)) < 0 ? '<option selected>' + esc(f.toko) + '</option>' : '') + '</select>';
    else h += '<label class="lb" for="neToko">Bengkel / vendor</label><input class="isian neKap" id="neToko" data-ef="toko" autocomplete="off" value="' + esc(f.toko) + '">';
    h += '<label class="lb" for="neRek">Rekening <span class="kecil">(bank nomor A.N nama)</span></label><input class="isian neKap" id="neRek" data-ef="rekening" autocomplete="off" value="' + esc(f.rekening) + '">';
    if (mk === 'BENGKEL TETAP') h += '<label class="lb" for="neHari">Hari bayar</label><select class="isian" id="neHari" data-ef="hariBayar"><option value="">-</option>' + HARI.map(function (x) { return '<option' + (besar(f.hariBayar) === x ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>';
    h += '<label class="lb" for="neKep">Keperluan / keterangan' + (mk === 'PENGAJUAN > 3 JT' ? ' <i class="wajib">wajib</i>' : '') + '</label><textarea class="isian neKap" id="neKep" data-ef="keperluan" maxlength="300">' + esc(f.keperluan) + '</textarea></div>';
    var tot = f.unit.reduce(function (s, u) { return s + Number(u.total || 0); }, 0);
    h += '<div class="kartu neKartu">' + f.unit.map(function (u, i) {
      return '<div class="neUnit"><b>' + esc(u.lambung || '-') + '</b>' + (u.unit ? ' · ' + esc(u.unit) : '') + '<label class="lb" for="neUr' + i + '">Uraian pekerjaan / barang</label><textarea class="isian neKap" id="neUr' + i + '" data-eu="' + i + ':uraian" maxlength="500">' + esc(u.uraian) + '</textarea>'
        + '<label class="lb" for="neTot' + i + '">Total (Rp)</label><input class="isian" id="neTot' + i + '" inputmode="numeric" data-eu="' + i + ':total" value="' + (u.total ? rp(u.total) : '') + '"></div>';
    }).join('') + '<div class="notaTotal">' + rp(tot) + '<small>total nota</small></div></div>';
    h += '<div class="kartu neKartu">' + bagFoto('foto', 'Foto nota', mk !== 'BENGKEL TETAP') + (mk === 'BAYAR LANGSUNG' || f.tetap.kerja.length ? bagFoto('kerja', 'Foto bukti pengerjaan', mk === 'BAYAR LANGSUNG') : '') + (mk === 'PENGAJUAN > 3 JT' || f.tetap.ba.length ? bagFoto('ba', 'Berita Acara', mk === 'PENGAJUAN > 3 JT') : '') + '</div>';
    if (E.bisa === 'revisi') h += '<div class="kartu neKartu"><label class="lb" for="neAlasan">Alasan revisi <i class="wajib">wajib</i></label><textarea class="isian neKap" id="neAlasan" data-ef="alasan" maxlength="300" placeholder="MIS. SALAH KETIK TOTAL, NOTA ASLI RP 450.000">' + esc(f.alasan) + '</textarea></div>';
    h += '<div class="pesan" id="nePesan">' + esc(E.pesan) + '</div><button type="button" class="tUtama" data-e="kirim"' + (E.kirim ? ' disabled' : '') + '>' + (E.kirim ? '<span class="putar"></span> Mengirim...' : (E.bisa === 'revisi' ? 'Kirim revisi ke admin' : 'Simpan perubahan')) + '</button>';
    if (E.riwayat && E.riwayat.length) h += '<h2 class="bagW">Riwayat edit</h2><div class="kartu">' + E.riwayat.map(function (r) { return '<div class="neRiw"><b>' + esc(r.status) + '</b> · ' + esc(r.waktu) + ' · ' + esc(r.nama || r.sumber) + '<br>' + esc(r.perubahan || '-') + (r.alasanTolak ? '<br>Ditolak: ' + esc(r.alasanTolak) : '') + '</div>'; }).join('') + '</div>';
    el.innerHTML = h + '</div>';
  }
  function baca() {
    if (!el || !E || !E.f) return; var f = E.f;
    Array.prototype.forEach.call(el.querySelectorAll('[data-ef]'), function (x) { var k = x.getAttribute('data-ef'); f[k] = k === 'tglNota' || x.tagName === 'SELECT' ? x.value : besar(x.value); });
    Array.prototype.forEach.call(el.querySelectorAll('[data-eu]'), function (x) { var p = x.getAttribute('data-eu').split(':'), u = f.unit[+p[0]]; if (u) u[p[1]] = p[1] === 'total' ? angka(x.value) : besar(x.value); });
  }
  function lepas(ev) { /* huruf besar & format rupiah saat keluar isian (bukan tiap ketikan) */
    var x = ev.target; if (!x.getAttribute || !E || !E.f) return;
    if (x.getAttribute('data-eu') && /:total$/.test(x.getAttribute('data-eu'))) { var n = angka(x.value); x.value = n ? rp(n) : ''; baca(); var t = el.querySelector('.notaTotal'); if (t) t.firstChild.nodeValue = rp(E.f.unit.reduce(function (s, u) { return s + Number(u.total || 0); }, 0)); return; }
    if (x.classList && x.classList.contains('neKap')) x.value = besar(x.value);
  }
  function pesan(t) { if (!E) return; E.pesan = t; var p = document.getElementById('nePesan'); if (p) p.textContent = t; }
  function ubah(ev) {
    var x = ev.target; if (!E || !x.getAttribute || !x.getAttribute('data-efoto') || !x.files || !x.files.length) return;
    var k = x.getAttribute('data-efoto'), L = Array.prototype.slice.call(x.files); x.value = ''; baca(); pesan('Menyiapkan foto...');
    L.reduce(function (rantai, berkas) { return rantai.then(function () { var f = E.f; if (f.tetap[k].length + f.baru[k].length >= E.maks) return; return O.kompres(berkas).then(function (d) { if (d.length < 8000) throw new Error('foto kosong / putih, ulangi'); f.baru[k].push(d); }); }); }, Promise.resolve())
      .then(function () { E.pesan = ''; gambar(); try { R.getar(); } catch (e) { /* */ } }, function (e) { gambar(); pesan('Foto gagal: ' + e.message); bunyi('gagal'); });
  }
  function klik(ev) {
    var b = ev.target.closest('[data-e]'); if (!b || !E) return; var n = b.getAttribute('data-e');
    if (n === 'tutup') { bunyi('tutup'); tutup(); return; }
    if (n.indexOf('buangT:') === 0 || n.indexOf('buangB:') === 0) { baca(); var p = n.split(':'); E.f[n.indexOf('buangT') === 0 ? 'tetap' : 'baru'][p[1]].splice(+p[2], 1); gambar(); return; }
    if (n === 'kirim' && !E.kirim) kirim();
  }
  function kirim() {
    baca(); var f = E.f, a = E.a;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.tglNota || '')) { pesan('Isi tanggal nota.'); bunyi('gagal'); return; }
    if (!f.toko) { pesan('Isi bengkel / vendor.'); bunyi('gagal'); return; }
    for (var i = 0; i < f.unit.length; i++) { if (!f.unit[i].uraian) { pesan('Isi uraian ' + (f.unit[i].lambung || '') + '.'); bunyi('gagal'); return; } if (!(f.unit[i].total > 0)) { pesan('Isi total ' + (f.unit[i].lambung || '') + '.'); bunyi('gagal'); return; } }
    if (a.masukKe === 'BAYAR LANGSUNG' && !(f.tetap.foto.length + f.baru.foto.length)) { pesan('Foto nota wajib.'); bunyi('gagal'); return; }
    if (a.masukKe === 'BAYAR LANGSUNG' && !(f.tetap.kerja.length + f.baru.kerja.length)) { pesan('Foto bukti pengerjaan wajib.'); bunyi('gagal'); return; }
    if (E.bisa === 'revisi' && !f.alasan) { pesan('Tulis alasan revisi.'); bunyi('gagal'); return; }
    var d = { id: a.id, cid: E.cid, alasan: f.alasan, tglNota: f.tglNota, toko: f.toko, rekening: f.rekening, hariBayar: f.hariBayar, keperluan: f.keperluan,
      unit: f.unit.map(function (u) { return { id: u.id, uraian: u.uraian, total: u.total }; }),
      fotoTetap: f.tetap.foto, foto: f.baru.foto, kerjaTetap: f.tetap.kerja, kerja: f.baru.kerja, baTetap: f.tetap.ba, ba: f.baru.ba };
    E.kirim = true; E.pesan = ''; gambar(); var aku = E;
    API.Pusat.panggil('pusatNotaUbah', [token(), d], 90000).then(function (h) {
      if (E !== aku) return; E.kirim = false;
      if (h && h.ok) { if (API.Pusat.lupakanSimpanan) API.Pusat.lupakanSimpanan(); tutup(); bunyi('sukses'); try { R.getar('sukses'); } catch (e) { /* */ } roti(h.dobel ? 'Sudah terkirim sebelumnya' : h.mode === 'revisi' ? 'Revisi terkirim, menunggu ACC admin' : 'Ajuan diperbarui'); if (O.sesudah) O.sesudah(); return; }
      gambar(); pesan(h && h.login === false ? 'Sesi habis, masuk lagi.' : ((h && h.pesan) || 'Ditolak server.')); bunyi('gagal');
    }, function () { if (E !== aku) return; E.kirim = false; gambar(); pesan('Koneksi putus. Ketuk kirim lagi (tidak akan tercatat dobel).'); bunyi('gagal'); });
  }
  window.WHL_NOTA_EDIT = { tombol: tombol, buka: buka, tutup: tutup, aktif: aktif };
})();
