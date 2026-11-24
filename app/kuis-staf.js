/* WHL App — KUIS SAFETY KARYAWAN + PENGINGAT 15 MENIT (kuis-karyawan-24nov, Vanesa 24 Nov 2026; permintaan Pak Fanza).
 * Server (PusatKuisStaf.gs, lewat RPC yang sama dengan driver): pusatKuisStatus(token) · pusatKuisBuka(token, sesiId) · pusatKuisJawab(token, sesiId + '#' + nomor, pilihan 0..3 urutan TAMPIL).
 * Karyawan: 5 soal per sesi, 30 detik PER SOAL (dihitung server), sekali jawab per soal, tidak bisa mundur. +1 poin tiap benar,
 *   10 nilai sempurna tercepat bonus +5. Kunci & penjelasan muncul sesudah sesi ditutup. Driver tetap di kuis.js (1 soal).
 * Pengingat: 15 menit sebelum sesi (09.00 / 16.00) app yang sedang terbuka membunyikan suara perempuan "Saatnya kuis, We Ha El!"
 *   (suara/whl_kuis.mp3; cadangan speechSynthesis id-ID) sekali per sesi per HP. Notif push dengan data.pra juga lewat sini (app.js).
 * Lapis memakai kelas kuis.js / kegiatan.css yang sama (kgKuisKp, kgOpsi, kgHasil, ...). Tanpa alert/confirm/prompt.
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA;
  var CTX = null, lapisEl = null, SOAL = null, JAWAB = null, tik = null, sibuk = false, catatan = '';
  var PRA_MENIT = 15, PRA_KUNCI = 'whlKuisPra';
  function KG() { return window.WHL_KEGIATAN; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { var c = CTX || (KG() && KG().ctx()); return c && c.sesi ? c.sesi() : null; }
  function boleh(S) { S = S || sesi(); return !!(S && S.user && S.user.peran && S.user.peran !== 'driver'); }
  function panggil(fn, args, ms) { return API.Pusat.panggil(fn, [sesi().tokenPusat].concat(args || []), ms || 25000); }
  function kini() { return KG() ? KG().kini() : Date.now(); }
  function msWib(iso) { return KG() ? KG().msWib(iso) : 0; }
  function jamT(s) { return String(s || '').replace(':', '.'); }
  var BLN = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
  function tglPendek(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (+m[3]) + ' ' + BLN[+m[2] - 1] : ''; }
  function lagi(ms) { var m = Math.max(0, Math.round(ms / 60000)); if (m < 1) return 'sebentar lagi'; if (m < 60) return m + ' menit lagi'; var j = Math.floor(m / 60), s = m % 60; return j + ' jam' + (s ? ' ' + s + ' mnt' : '') + ' lagi'; }
  function roti(t) { var c = CTX || (KG() && KG().ctx()); if (c && c.roti) c.roti(t); }
  function koma(x) { return String(x).replace('.', ','); }

  /* ---------- lapis ---------- */
  function lapis(isi, sub) {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis kgLapis kgKuisLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik);
    }
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-ks="tutup" aria-label="Kembali">‹</button><div class="nm">' + esc(sub || 'Karyawan WHL') + '<b>Kuis safety</b></div></div><div class="ksnIsi">' + isi + '</div>';
  }
  function berhenti() { clearInterval(tik); tik = null; }
  function tutup() { berhenti(); if (!lapisEl) return false; var d = lapisEl; lapisEl = null; SOAL = null; JAWAB = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); try { if (CTX && CTX.perbarui) CTX.perbarui(); } catch (e) { /* */ } return true; }
  function gagalHtml(p) { return '<div class="kartu kosongKm"><b>Belum bisa dimuat</b><small>' + esc(p) + '</small><button type="button" class="tKecil" data-ks="ulang" style="margin-top:10px">Coba lagi</button></div>'; }
  function titik(n, isi, kini2) { var h = ''; for (var i = 1; i <= n; i++) h += '<i class="' + (i <= isi ? 'on' : '') + (i === kini2 ? ' saya' : '') + '">' + i + '</i>'; return '<div class="kgSlot">' + h + '</div>'; }

  /* ---------- status ---------- */
  function buka(ctx) {
    if (ctx) CTX = ctx; if (!sesi()) return;
    SOAL = null; JAWAB = null; berhenti();
    lapis(R && R.kerangka ? R.kerangka('daftar') : '<span class="putar"></span>');
    panggil('pusatKuisStatus', []).then(function (h) {
      if (!lapisEl) return;
      if (h && h.login === false) { tutup(); if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (!h || h.ok === false) { lapis(gagalHtml((h && h.pesan) || 'Cek sinyal, lalu coba lagi.')); return; }
      if (h.aktif === false || h.tampil === false || !h.staf) { lapis(gagalHtml(h.pesan || 'Kuis karyawan belum dibuka admin.')); return; }
      gambarStatus(h);
    }, function (e) { if (lapisEl) lapis(gagalHtml((e && e.message) || 'Cek sinyal, lalu coba lagi.')); });
  }
  function aturanHtml(h) {
    var T = h.bulan || [{ min: 40, poin: 50 }, { min: 20, poin: 30 }], a = T[T.length - 1], b = T[0];
    return '<div class="kartu"><div class="hiBar"><b>Aturan poin karyawan</b><span>jam server</span></div><div class="kecil" style="line-height:1.6">'
      + '⭐ +' + esc(h.poinPerBenar || 1) + ' poin tiap soal benar (' + esc(h.jumlahSoal || 5) + ' soal, ' + esc(h.batasDetik || 30) + ' detik per soal)<br>'
      + '🏆 10 nilai sempurna tercepat bonus +' + esc(h.poin || 5) + ' poin<br>'
      + '📅 Lulus (benar ≥ ' + esc(h.lulusStaf || 4) + ') ' + esc(a.min) + ' sesi sebulan +' + esc(a.poin) + ' poin, ' + esc(b.min) + ' sesi +' + esc(b.poin) + ' poin</div></div>';
  }
  function hasilHtml(s, tutupJam) {
    if (!s || !s.sudahJawab) return '';
    var ik = s.sempurna ? '🎉' : s.skor >= (s.total || 5) - 1 ? '✅' : '📘';
    return '<div class="kgHasil ' + (s.skor ? 'benar' : 'salah') + '"><span class="ik">' + ik + '</span><div><b>Skor ' + esc(s.skor) + '/' + esc(s.total) + (s.poin ? ' → +' + esc(s.poin) + ' poin' : '') + '</b><small>'
      + (s.sempurna && s.urutan ? 'Nilai sempurna urutan ke-' + esc(s.urutan) + '. ' : '') + (s.detik != null ? 'Total ' + esc(koma(s.detik)) + ' detik. ' : '')
      + (tutupJam ? 'Kunci & penjelasan muncul jam ' + esc(tutupJam) + '.' : '') + '</small></div></div>';
  }
  function gambarStatus(h) {
    var s = h.sekarang, l = h.lalu, out = '';
    if (s && s.terbuka) {
      var tj = jamT(String(s.tutup || '').slice(11, 16)), n = s.jumlahSoal || h.jumlahSoal || 5, terisi = 10 - (Number(s.slotTersisa) >= 0 ? Number(s.slotTersisa) : 10), saya = s.saya || {};
      out += '<div class="kgKuisKp"><div class="atas"><span>SESI ' + esc(jamT(s.jam)) + ' · ' + esc(tglPendek(s.mulai)) + '</span><span>tutup ' + esc(tj) + '</span></div>';
      if (saya.sudahJawab) out += '<h3>Kamu sudah menyelesaikan sesi ini.</h3><p>' + esc(s.penjawab || 0) + ' karyawan sudah selesai.</p></div>' + hasilHtml(saya, tj);
      else out += '<h3>Siap? ' + esc(n) + ' soal safety, ' + esc(h.batasDetik || 30) + ' detik per soal.</h3><p>Waktu tiap soal berjalan begitu soal tampil. Sekali pilih langsung terkirim, tidak bisa mundur. +' + esc(h.poinPerBenar || 1) + ' poin tiap benar, nilai sempurna tercepat bonus <b>+' + esc(h.poin || 5) + '</b>.</p>'
        + (saya.sudahBuka ? titik(n, saya.dijawab || 0, (saya.dijawab || 0) + 1) : '')
        + '<button type="button" class="kgMulai" data-ks="mulai:' + esc(s.id) + '">' + (saya.sudahBuka ? 'Lanjutkan soal ke-' + esc(saya.nomor || 1) : 'Mulai ' + esc(n) + ' soal') + '</button></div>';
      out += '<div class="kartu"><div class="hiBar"><b>10 nilai sempurna tercepat</b><span>' + (Number(s.slotTersisa) > 0 ? esc(s.slotTersisa) + ' jatah lagi' : 'jatah habis') + '</span></div>' + titik(10, terisi, saya.sempurna ? saya.urutan : 0) + '</div>';
    } else if (h.berikut) {
      out += '<div class="kgKuisKp tunggu"><div class="atas"><span>SESI BERIKUT</span><span>' + esc(tglPendek(h.berikut.mulai)) + '</span></div><h3>Kuis ' + esc(jamT(h.berikut.jam)) + ' dibuka ' + esc(lagi((h.berikut.mulaiMs || msWib(h.berikut.mulai)) - kini())) + '</h3><p>Jadwal tiap hari: ' + esc((h.jadwal || []).map(jamT).join(' & ')) + ' WIB. Pengingat "Saatnya Kuis WHL" 15 menit sebelumnya.</p></div>';
    }
    out += aturanHtml(h);
    if (l && l.id && (!s || l.id !== s.id)) {
      var sy = l.saya || {};
      out += '<h2 class="bagW">Sesi ' + esc(jamT(l.jam)) + ' · ' + esc(tglPendek(l.mulai)) + '</h2><div class="kartu kgLalu">'
        + (sy.sudahJawab ? hasilHtml(sy) : sy.sudahBuka ? '<div class="kecil">Sesi ini belum kamu selesaikan.</div>' : '<div class="kecil">Kamu tidak ikut sesi ini.</div>')
        + (sy.rinci || []).map(function (r, i) {
          if (!r) return '';
          return '<div style="margin-top:12px"><div class="kgLaluSoal">' + (i + 1) + '. ' + esc(r.soal) + '</div>'
            + '<div class="kgOpsi benar statis"><span class="h">✓</span><span>' + esc(r.kunciTeks) + '</span></div>'
            + (r.benar ? '' : '<div class="kgOpsi salah statis"><span class="h">' + (r.habis ? '⏱' : '✗') + '</span><span>' + (r.habis ? 'Waktu habis' : 'Jawabanmu: ' + esc(r.jawabTeks)) + '</span></div>')
            + (r.penjelasan ? '<div class="kgJelas"><b>Penjelasan</b>' + esc(r.penjelasan) + '</div>' : '') + '</div>';
        }).join('')
        + ((l.pemenang || []).length ? '<div class="hiBar" style="margin-top:12px"><b>10 nilai sempurna tercepat</b><span>' + esc(l.penjawab || 0) + ' selesai</span></div><div class="kgJuara">' + l.pemenang.map(function (p) { return '<div><span class="no">' + esc(p.urut) + '</span><b>' + esc(KG() ? KG().namaTampil(p.nama) : p.nama) + '</b><em>' + esc(koma(p.detik)) + ' dtk' + (p.poin ? ' · +' + esc(p.poin) : '') + '</em></div>'; }).join('') + '</div>' : '')
        + '</div>';
    }
    out += '<div class="kecil" style="margin:12px 4px;text-align:center">Waktu dihitung server, bukan jam HP. Soal karyawan = K3 & SOP WHL, sebagian khusus peranmu.</div>';
    lapis(out);
  }

  /* ---------- soal ---------- */
  function terimaSoal(h) { SOAL = h; SOAL.batas = Date.now() + Math.max(0, Number(h.sisaMs) || 0); JAWAB = null; gambarSoal(); mulaiTik(); }
  function selesaiLayar(h) {
    berhenti(); SOAL = null; JAWAB = null;
    if (h.poin) { R.bunyi('achievement'); R.getar('sukses'); if (R.konfeti) R.konfeti(); } else if (h.skor) { R.bunyi('sukses'); R.getar('sukses'); } else { R.bunyi('gagal'); R.getar('gagal'); }
    if (KG()) KG().muat(null, true);
    var tj = h.kunciMuncul ? jamT(String(h.kunciMuncul).slice(11, 16)) : '';
    lapis('<div class="kgKuisKp"><div class="atas"><span>SELESAI</span><span>' + esc(h.total || 5) + ' soal</span></div><h3>Skor kamu ' + esc(h.skor) + '/' + esc(h.total) + '</h3><p>' + esc(h.pesan || '') + '</p></div>'
      + hasilHtml({ sudahJawab: true, skor: h.skor, total: h.total, poin: h.poin, sempurna: h.sempurna, urutan: h.urutan, detik: h.detik }, tj)
      + '<button type="button" class="tUtama" data-ks="selesai" style="margin-top:12px">Selesai</button>');
  }
  function mulai(id) {
    if (sibuk) return; sibuk = true; R.getar('sedang');
    var b = lapisEl && lapisEl.querySelector('.kgMulai'); if (b) { b.disabled = true; b.innerHTML = '<span class="putar"></span> Membuka soal…'; }
    panggil('pusatKuisBuka', [id], 25000).then(function (h) {
      sibuk = false; if (!lapisEl) return;
      if (h && h.login === false) { tutup(); if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (!h || h.ok === false) { R.bunyi('gagal'); lapis(gagalHtml((h && h.pesan) || 'Soal belum bisa dibuka.')); return; }
      if (h.selesai) { selesaiLayar(h); return; }
      if (h.sudahJawab) { buka(); return; }
      catatan = h.habisTadi ? 'Soal sebelumnya lewat 30 detik (tidak dihitung).' : '';
      terimaSoal(h);
    }, function (e) { sibuk = false; if (lapisEl) { R.bunyi('gagal'); lapis(gagalHtml((e && e.message) || 'Cek sinyal, lalu coba lagi.')); } });
  }
  function gambarSoal() {
    var h = SOAL, sisa = Math.max(0, h.batas - Date.now()), habis = sisa <= 0 && !JAWAB, j = JAWAB || {}, n = h.total || 5;
    var kls = function (i) { return j.dipilih === i ? ' dipilih' : (j.dipilih != null || habis ? ' redup' : ''); };
    var out = '<div class="kgKuisKp soal' + (sisa <= 10000 && !JAWAB ? ' genting' : '') + '"><div class="atas"><span>SOAL ' + esc(h.nomor) + '/' + esc(n) + ' · ' + esc(String(h.topik || 'SAFETY').toUpperCase()) + '</span><span class="kgDetik">⏱ <b id="ksDetik">' + Math.ceil(sisa / 1000) + '</b> dtk</span></div>'
      + '<h3>' + esc(h.soal) + '</h3><div class="kgWaktu"><i id="ksWaktuBar" style="width:' + (sisa / ((h.batasDetik || 30) * 10)).toFixed(1) + '%"></i></div>' + titik(n, h.nomor - 1, h.nomor) + '</div>'
      + (h.pilihan || []).map(function (p, i) { return '<button type="button" class="kgOpsi' + kls(i) + '" data-ks="jawab:' + i + '"' + (j.dipilih != null || habis ? ' disabled' : '') + '><span class="h">' + 'ABCD'.charAt(i) + '</span><span>' + esc(p) + '</span></button>'; }).join('');
    if (j.kirim) out += '<div class="kgHasil tunggu"><span class="putar"></span><div><b>Mengirim jawaban…</b><small>Jangan tutup layar ini.</small></div></div>';
    else if (j.galat) out += '<div class="kgHasil salah"><span class="ik">!</span><div><b>Jawaban belum terkirim</b><small>' + esc(j.galat) + '</small><button type="button" class="tKecil" data-ks="kirimUlang" style="margin-top:8px">Kirim ulang jawaban</button></div></div>';
    else if (habis) out += '<div class="kgHasil tunggu"><span class="putar"></span><div><b>Waktu habis</b><small>Lanjut ke soal berikutnya…</small></div></div>';
    else out += '<div class="kecil" style="margin:10px 4px;text-align:center">' + (catatan ? esc(catatan) + ' ' : '') + 'Pilih satu jawaban. Sekali pilih langsung terkirim.</div>';
    lapis(out, 'Karyawan · Sesi ' + jamT(String(h.sesiId || '').slice(12, 14)) + '.00');
  }
  function mulaiTik() {
    berhenti();
    tik = setInterval(function () {
      if (!lapisEl || !SOAL) { berhenti(); return; }
      var sisa = Math.max(0, SOAL.batas - Date.now()), el = document.getElementById('ksDetik'), bar = document.getElementById('ksWaktuBar');
      if (el) el.textContent = Math.ceil(sisa / 1000); if (bar) bar.style.width = (sisa / ((SOAL.batasDetik || 30) * 10)).toFixed(1) + '%';
      var kp = lapisEl.querySelector('.kgKuisKp'); if (kp && !JAWAB) kp.classList.toggle('genting', sisa <= 10000);
      if (sisa <= 0 && !JAWAB) { berhenti(); R.bunyi('gagal'); R.getar('gagal'); gambarSoal(); var id = SOAL.sesiId; setTimeout(function () { if (lapisEl && SOAL && SOAL.sesiId === id && !JAWAB) mulai(id); }, 3600); } /* > 3 dtk toleransi server -> server mencatat "T" & memberi soal berikut */
    }, 200);
  }
  function jawab(i) { if (!SOAL || JAWAB || SOAL.batas - Date.now() <= 0) return; JAWAB = { dipilih: i, kirim: true }; R.getar('sedang'); berhenti(); gambarSoal(); kirim(); }
  function kirim() {
    JAWAB.kirim = true; JAWAB.galat = null; var s0 = SOAL;
    panggil('pusatKuisJawab', [s0.sesiId + '#' + s0.nomor, JAWAB.dipilih], 30000).then(function (h) {
      if (!JAWAB || SOAL !== s0) return; JAWAB.kirim = false;
      if (h && h.login === false) { tutup(); if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return; }
      if (!h || h.ok === false) { JAWAB.galat = (h && h.pesan) || 'Server menolak.'; R.bunyi('gagal'); gambarSoal(); return; }
      if (h.selesai) { selesaiLayar(h); return; }
      if (h.sudah) { buka(); return; }
      if (h.lanjut || h.ulang) { R.bunyi('ketuk'); catatan = h.terlambatTadi ? 'Jawaban tadi lewat 30 detik (tidak dihitung).' : 'Jawaban soal ' + s0.nomor + ' tercatat ✓'; terimaSoal(h); return; }
      buka();
    }, function (e) { if (!JAWAB) return; JAWAB.kirim = false; JAWAB.galat = (e && e.message) || 'Sinyal putus.'; R.bunyi('gagal'); gambarSoal(); });
  }
  function klik(ev) {
    var b = ev.target.closest('[data-ks]'); if (!b || b.disabled) return; var n = b.getAttribute('data-ks');
    if (n === 'tutup') { R.bunyi('tutup'); tutup(); }
    else if (n === 'selesai' || n === 'ulang') buka();
    else if (n.indexOf('mulai:') === 0) mulai(n.slice(6));
    else if (n.indexOf('jawab:') === 0) jawab(+n.slice(6));
    else if (n === 'kirimUlang' && JAWAB) { kirim(); gambarSoal(); }
  }

  /* ---------- pengingat 15 menit (driver & karyawan) ---------- */
  function slotDari(id) { var m = String(id || '').match(/(\d{8})-(\d{2})/); return m ? m[1] + '-' + m[2] : ''; }
  function sudahPra(slot) { try { return localStorage.getItem(PRA_KUNCI) === slot; } catch (e) { return false; } }
  function tandaPra(slot) { try { localStorage.setItem(PRA_KUNCI, slot); } catch (e) { /* mode privat: bisa bunyi 2x, tidak apa */ } }
  /** dari app.js (notif push data.pra) atau pemeriksa berkala. Balas true kalau suara dibunyikan. */
  function pra(d) {
    var slot = slotDari(d && (d.sesi || d.id)); if (!slot || sudahPra(slot)) return false;
    tandaPra(slot); R.bunyi('kuisWhl'); R.getar('awas'); return true;
  }
  function periksaPra() {
    if (document.hidden) return;
    var S = sesi(); if (!S || !S.user) return;
    var d = KG() && KG().data(), r = d && d.kuis; if (!r || r.terbuka || !r.berikut || !r.berikut.mulai) return;
    var sisa = msWib(r.berikut.mulai) - kini(); if (sisa <= 0 || sisa > PRA_MENIT * 60000) return;
    if (pra({ sesi: r.berikut.id })) roti('⏰ Saatnya Kuis WHL! Sesi ' + jamT(r.berikut.jam) + ' dibuka ' + lagi(sisa) + '.');
  }
  setInterval(periksaPra, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(periksaPra, 1500); });

  /* menu & kartu ditangani kuis.js (WHL_KUIS.buka -> WHL_KUIS_STAF.buka untuk akun non-driver) */
  function lupakan() { berhenti(); tutup(); }
  window.WHL_KUIS_STAF = { boleh: boleh, buka: buka, tutup: tutup, pra: pra, periksaPra: periksaPra, lupakan: lupakan };
})();
