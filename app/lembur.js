/* WHL App — LEMBUR (v3.15, Andro 15 Nov 2026). Reza: "absen, cuti, lembur sekalian di sana aja" + "tombolnya dekatan dengan absen".
 * Server lembur sedang dibuat Hesti (sesi lain). Selama pusatPing belum memuat fungsi berawalan "pusatLembur", semua pintu lembur
 * menampilkan "Fitur lembur segera hadir". Begitu server live: cukup tutup-buka app (ping ulang) — tanpa build ulang,
 * ASAL nama fungsi & bentuk data cocok dengan USULAN di bawah. Kalau Hesti memakai nama lain, ubah NAMA saja (1 tempat).
 *
 * USULAN KONTRAK (api "pusat" DASHBOARD, argumen 1 = token; tanpa objek Date, jam 'HH:mm', tanggal 'yyyy-MM-dd'):
 *   status : [token] -> { ok, bolehAju, bolehAcc, hariIni:{id, tanggal, mulai, sampai, alasan, status:'MENUNGGU'|'DISETUJUI'|'DITOLAK', alasanTolak}|null, menunggu:<jumlah ajuan menunggu ACC saya> }
 *   ajukan : [token, {cid, tanggal, mulai, sampai, alasan}] -> { ok, id, dobel? }
 *   saya   : [token] -> { ok, list:[{id, tanggal, mulai, sampai, jam, alasan, status, oleh, waktuPutus, alasanTolak}] }   (30 terbaru)
 *   antre  : [token] -> { ok, list:[{id, nama, nrp, jabatan, tanggal, mulai, sampai, jam, alasan, waktu}] }             (khusus bolehAcc)
 *   putus  : [token, id, 'ACC'|'TOLAK', alasan] -> { ok, id, status }                                                    (TOLAK wajib alasan)
 * Hasil ok:false + login:false = sesi habis; tolak:true = tidak berhak.
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA || {};
  var NAMA = { status: 'pusatLemburStatus', ajukan: 'pusatLemburAjukan', saya: 'pusatLemburSaya', antre: 'pusatLemburAntre', putus: 'pusatLemburPutus' };
  var CTX = null, ST = null, lapisEl = null, mode = 'aju', LIST = null, ANTRE = null, galat = '', sibuk = false, yakin = '', tolakId = '', urutan = 0;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { return CTX && CTX.sesi(); }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function perbarui() { if (CTX && CTX.perbarui) CTX.perbarui(); }
  function fnServer() { var X = API.Pusat; return X.daftar ? X.daftar() : []; }
  /** true = server sudah punya fungsi lembur apa pun (awalan pusatLembur) */
  function aktif() { return fnServer().some(function (f) { return /^pusatLembur/.test(f); }); }
  function punya(k) { return API.Pusat.punya(NAMA[k]); }
  function panggil(k, args, ms) { var S = sesi(); return API.Pusat.panggil(NAMA[k], [S && S.tokenPusat].concat(args || []), ms || 30000); }
  function wib() { return new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000); }
  function p2(n) { return ('0' + n).slice(-2); }
  function hariIni() { var d = wib(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function jamTitik(j) { return String(j || '').replace(':', '.'); }
  function tglTampil(t) { var m = String(t || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] : String(t || ''); }
  function bolehAcc() { var S = sesi(); return !!(ST && ST.bolehAcc) || (!ST && S && S.user && (S.user.peran === 'pimpinan' || S.user.peran === 'penuh')); }

  /* ---------- ringkasan untuk kotak absen Beranda & hub Kehadiran ---------- */
  function muat(ctx) {
    CTX = ctx || CTX; var S = sesi();
    if (!S || !S.user || S.user.peran === 'driver' || !aktif() || !punya('status')) { ST = null; return Promise.resolve(null); }
    var saya = ++urutan;
    return panggil('status', [], 20000).then(function (h) {
      if (saya !== urutan) return ST;
      ST = h && h.ok ? h : null; perbarui(); return ST;
    }, function () { return ST; });
  }
  /** {aktif, status, sampai, menunggu, bolehAcc} — dipakai app.js untuk tombol di kotak absen */
  function ringkas() {
    var a = aktif(), h = ST && ST.hariIni;
    return { aktif: a, status: h ? h.status : '', mulai: h ? h.mulai : '', sampai: h ? h.sampai : '', menunggu: ST ? Number(ST.menunggu) || 0 : 0, bolehAcc: a && bolehAcc() };
  }
  function segera() { if (R.getar) R.getar(); roti('Fitur lembur segera hadir.'); }

  /* ---------- layar ---------- */
  function gaya() {
    if (document.getElementById('lbGaya')) return;
    var st = document.createElement('style'); st.id = 'lbGaya';
    st.textContent = '.lbLapis .ksnIsi{padding-bottom:40px}.lbForm label{display:block;font-size:12.5px;font-weight:800;color:var(--redup);margin:12px 4px 5px}.lbJam{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lbJam input{width:100%}'
      + '.lbKartu{padding:12px 2px}.lbKartu + .lbKartu{border-top:1px solid var(--garis)}.lbAtas{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.lbAtas b{font-size:14.5px}'
      + '.lbKecil{font-size:12.5px;color:var(--redup);line-height:1.5}.lbKecil b{color:var(--teks)}.lbTombol{display:flex;gap:8px;margin-top:10px}.lbTombol button{flex:1;margin:0;min-height:44px}'
      + '.lbTombol .tolak{background:var(--panel2);color:var(--tMerah);font-weight:800;border-radius:14px}.lbTombol .yakin{background:#15803d;color:#fff}.lbKosong{text-align:center;padding:22px 12px;color:var(--redup);font-size:13.5px}';
    document.head.appendChild(st);
  }
  function lapis() {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) { gaya(); lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis lbLapis'; document.body.appendChild(lapisEl); requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); }); lapisEl.addEventListener('click', klik); }
    var g = lapisEl.querySelector('.ksnIsi'), y = g ? g.scrollTop : 0, simpan = isianLama();
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-l="kembali" aria-label="Kembali">‹</button><div class="nm">Kehadiran<b>' + (mode === 'acc' ? 'Persetujuan lembur' : 'Ajukan lembur') + '</b></div></div><div class="ksnIsi">' + (mode === 'acc' ? isiAcc() : isiAju()) + '</div>';
    kembalikanIsian(simpan);
    var g2 = lapisEl.querySelector('.ksnIsi'); if (g2) g2.scrollTop = y;
  }
  function isianLama() { var o = {}; if (lapisEl) ['lbTgl', 'lbMulai', 'lbSampai', 'lbAlasan', 'lbTolak'].forEach(function (id) { var e = document.getElementById(id); if (e) o[id] = e.value; }); return o; }
  function kembalikanIsian(o) { Object.keys(o).forEach(function (id) { var e = document.getElementById(id); if (e && o[id] != null) e.value = o[id]; }); }
  function tutup() { if (!lapisEl) return; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); perbarui(); }
  var WARNA = { MENUNGGU: ['kuning', 'Menunggu ACC'], DISETUJUI: ['hijau', 'Disetujui'], DITOLAK: ['merah', 'Ditolak'] };
  function isiAju() {
    var h = '', hi = ST && ST.hariIni;
    if (hi) { var w = WARNA[hi.status] || ['abu', hi.status]; h += '<div class="kartu"><div class="lbAtas"><b>Lembur hari ini</b><em class="notaSt ' + w[0] + '">' + esc(w[1]) + '</em></div><div class="lbKecil">' + esc(jamTitik(hi.mulai)) + ' s/d <b>' + esc(jamTitik(hi.sampai)) + '</b>' + (hi.alasan ? ' · ' + esc(hi.alasan) : '') + (hi.status === 'DITOLAK' && hi.alasanTolak ? '<br>Alasan ditolak: ' + esc(hi.alasanTolak) : '') + '</div></div>'; }
    if (punya('ajukan') && !(ST && ST.bolehAju === false)) {
      h += '<div class="kartu lbForm"><b>Ajuan baru</b><div class="lbKecil">Diajukan ke pimpinan. Kamu dapat kabar setelah di-ACC atau ditolak.</div>'
        + '<label for="lbTgl">Tanggal</label><input id="lbTgl" class="isian" type="date" value="' + esc(hariIni()) + '">'
        + '<div class="lbJam"><div><label for="lbMulai">Mulai</label><input id="lbMulai" class="isian" type="time" value="18:00"></div><div><label for="lbSampai">Sampai</label><input id="lbSampai" class="isian" type="time" value="21:00"></div></div>'
        + '<label for="lbAlasan">Pekerjaan / alasan</label><textarea id="lbAlasan" class="isian" rows="3" maxlength="300" placeholder="Contoh: kawal unit storing di KM 40 sampai selesai"></textarea>'
        + '<button type="button" class="tUtama" data-l="kirim" style="margin-top:14px"' + (sibuk ? ' disabled' : '') + '>' + (sibuk ? 'Mengirim…' : 'Ajukan lembur') + '</button></div>';
    } else if (!punya('ajukan')) h += '<div class="kartu lbKosong">Pengajuan lembur dari app belum dibuka di server.</div>';
    if (punya('saya')) {
      h += '<h2 class="bagW">Lembur saya <span>' + (LIST ? LIST.length : '') + '</span></h2>';
      if (galat && !LIST) h += '<div class="kartu lbKosong">' + esc(galat) + '<br><button type="button" class="tKecil" data-l="ulang" style="margin-top:10px">Coba lagi</button></div>';
      else if (!LIST) h += '<div class="kartu lbKosong"><span class="putar"></span> Memuat…</div>';
      else if (!LIST.length) h += '<div class="kartu lbKosong">Belum ada ajuan lembur.</div>';
      else h += '<div class="kartu">' + LIST.map(function (a) { var w = WARNA[a.status] || ['abu', a.status]; return '<div class="lbKartu"><div class="lbAtas"><b>' + esc(tglTampil(a.tanggal)) + ' · ' + esc(jamTitik(a.mulai)) + '–' + esc(jamTitik(a.sampai)) + (a.jam ? ' <small class="lbKecil">(' + esc(a.jam) + ' jam)</small>' : '') + '</b><em class="notaSt ' + w[0] + '">' + esc(w[1]) + '</em></div><div class="lbKecil">' + esc(a.alasan || '') + (a.oleh ? '<br>Oleh <b>' + esc(a.oleh) + '</b> ' + esc(a.waktuPutus || '') : '') + (a.status === 'DITOLAK' && a.alasanTolak ? '<br>Alasan: ' + esc(a.alasanTolak) : '') + '</div></div>'; }).join('') + '</div>';
    }
    if (bolehAcc() && punya('antre')) h += '<button type="button" class="tKecil" data-l="keAcc" style="width:100%;margin-top:12px">Persetujuan lembur tim' + (ST && ST.menunggu ? ' (' + ST.menunggu + ')' : '') + '</button>';
    return h;
  }
  function isiAcc() {
    var h = '';
    if (galat && !ANTRE) return '<div class="kartu lbKosong">' + esc(galat) + '<br><button type="button" class="tKecil" data-l="ulang" style="margin-top:10px">Coba lagi</button></div>';
    if (!ANTRE) return '<div class="kartu lbKosong"><span class="putar"></span> Memuat ajuan lembur…</div>';
    h += '<h2 class="bagW">Menunggu ACC <span>' + ANTRE.length + '</span></h2>';
    if (!ANTRE.length) return h + '<div class="kartu lbKosong">Tidak ada ajuan lembur yang menunggu.</div>';
    return h + '<div class="kartu">' + ANTRE.map(function (a) {
      var id = esc(a.id), t = tolakId === a.id;
      return '<div class="lbKartu"><div class="lbAtas"><b>' + esc(a.nama) + '</b><small class="lbKecil">' + esc(a.jabatan || '') + '</small></div><div class="lbKecil">' + esc(tglTampil(a.tanggal)) + ' · <b>' + esc(jamTitik(a.mulai)) + '–' + esc(jamTitik(a.sampai)) + '</b>' + (a.jam ? ' (' + esc(a.jam) + ' jam)' : '') + '<br>' + esc(a.alasan || '') + (a.waktu ? '<br>Diajukan ' + esc(a.waktu) : '') + '</div>'
        + (t ? '<textarea id="lbTolak" class="isian" rows="2" maxlength="200" placeholder="Alasan ditolak (wajib)" style="margin-top:8px"></textarea><div class="lbTombol"><button type="button" class="tKecil" data-l="batalTolak">Batal</button><button type="button" class="tolak" data-l="tolakKirim:' + id + '">Kirim penolakan</button></div>'
          : '<div class="lbTombol"><button type="button" class="tolak" data-l="tolak:' + id + '">Tolak</button><button type="button" class="tUtama' + (yakin === a.id ? ' yakin' : '') + '" data-l="acc:' + id + '"' + (sibuk ? ' disabled' : '') + '>' + (yakin === a.id ? 'Ketuk lagi untuk ACC' : 'ACC') + '</button></div>') + '</div>';
    }).join('') + '</div>';
  }
  function muatList() {
    if (!punya('saya')) return; LIST = null; galat = ''; lapis();
    panggil('saya', [], 30000).then(function (h) { if (h && h.login === false) { galat = 'Sesi habis. Keluar lalu masuk lagi.'; } else if (!h || !h.ok) galat = (h && h.pesan) || 'Belum bisa dimuat.'; else LIST = h.list || []; if (lapisEl) lapis(); }, function (e) { galat = e.message; if (lapisEl) lapis(); });
  }
  function muatAntre() {
    ANTRE = null; galat = ''; lapis();
    panggil('antre', [], 30000).then(function (h) { if (h && h.login === false) galat = 'Sesi habis. Keluar lalu masuk lagi.'; else if (h && h.tolak) galat = h.pesan || 'Persetujuan lembur khusus pimpinan.'; else if (!h || !h.ok) galat = (h && h.pesan) || 'Belum bisa dimuat.'; else ANTRE = h.list || []; if (lapisEl) lapis(); }, function (e) { galat = e.message; if (lapisEl) lapis(); });
  }
  function bukaAju(ctx) { CTX = ctx || CTX; if (!aktif()) { segera(); return; } mode = 'aju'; LIST = null; lapis(); muatList(); muat(); }
  function bukaAcc(ctx) { CTX = ctx || CTX; if (!aktif() || !punya('antre')) { segera(); return; } mode = 'acc'; yakin = ''; tolakId = ''; lapis(); muatAntre(); }
  function cid() { var a = new Uint8Array(8); try { crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < 8; i++) a[i] = Math.random() * 256; } return 'LB' + Date.now().toString(36) + Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  var CID = '';
  function kirim() {
    var t = document.getElementById('lbTgl').value, m = document.getElementById('lbMulai').value, s = document.getElementById('lbSampai').value, al = document.getElementById('lbAlasan').value.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) { roti('Isi tanggal lembur.'); return; }
    if (!/^\d{2}:\d{2}$/.test(m) || !/^\d{2}:\d{2}$/.test(s)) { roti('Isi jam mulai dan jam selesai.'); return; }
    if (m === s) { roti('Jam mulai dan selesai tidak boleh sama.'); return; }
    if (al.length < 5) { roti('Tulis pekerjaan / alasan lembur (minimal 5 huruf).'); return; }
    if (!CID) CID = cid();
    sibuk = true; lapis();
    panggil('ajukan', [{ cid: CID, tanggal: t, mulai: m, sampai: s, alasan: al }], 45000).then(function (h) {
      sibuk = false;
      if (h && h.login === false) { roti('Sesi habis. Keluar lalu masuk lagi.'); lapis(); return; }
      if (!h || !h.ok) { if (R.bunyi) R.bunyi('gagal'); roti((h && h.pesan) || 'Ajuan lembur ditolak server.'); lapis(); return; }
      CID = ''; if (R.bunyi) R.bunyi('sukses'); if (R.getar) R.getar('sukses'); roti('Lembur diajukan' + (h.id ? ' (' + h.id + ')' : '') + '. Tunggu ACC pimpinan.');
      var e = document.getElementById('lbAlasan'); if (e) e.value = '';
      muat(); muatList();
    }, function (e) { sibuk = false; roti(e.message + ' Ketuk Ajukan lagi (tidak akan dobel).'); lapis(); });
  }
  function putus(id, kep, alasan) {
    sibuk = true; lapis();
    panggil('putus', [id, kep, alasan || ''], 45000).then(function (h) {
      sibuk = false; yakin = ''; tolakId = '';
      if (!h || !h.ok) { roti((h && h.pesan) || 'Belum bisa disimpan.'); lapis(); return; }
      if (R.bunyi) R.bunyi('sukses'); roti(kep === 'ACC' ? 'Lembur di-ACC.' : 'Lembur ditolak.');
      ANTRE = (ANTRE || []).filter(function (a) { return a.id !== id; }); if (ST) ST.menunggu = ANTRE.length; lapis(); muat();
    }, function (e) { sibuk = false; roti(e.message); lapis(); });
  }
  function klik(ev) {
    var b = ev.target.closest('[data-l]'); if (!b || !lapisEl || !lapisEl.contains(b)) return; var n = b.getAttribute('data-l');
    if (n === 'kembali') { if (mode === 'acc' && LIST !== null && lapisEl.getAttribute('data-dari') === 'aju') { mode = 'aju'; lapisEl.removeAttribute('data-dari'); lapis(); return; } tutup(); return; }
    if (n === 'kirim') { if (!sibuk) kirim(); return; }
    if (n === 'ulang') { if (mode === 'acc') muatAntre(); else muatList(); return; }
    if (n === 'keAcc') { mode = 'acc'; lapisEl.setAttribute('data-dari', 'aju'); yakin = ''; tolakId = ''; muatAntre(); return; }
    if (n.indexOf('acc:') === 0) { var id = n.slice(4); if (sibuk) return; if (yakin !== id) { yakin = id; tolakId = ''; if (R.getar) R.getar(); lapis(); setTimeout(function () { if (yakin === id) { yakin = ''; if (lapisEl) lapis(); } }, 4000); return; } putus(id, 'ACC', ''); return; }
    if (n.indexOf('tolak:') === 0) { tolakId = n.slice(6); yakin = ''; lapis(); var e = document.getElementById('lbTolak'); if (e) e.focus(); return; }
    if (n === 'batalTolak') { tolakId = ''; lapis(); return; }
    if (n.indexOf('tolakKirim:') === 0) { var al = (document.getElementById('lbTolak') || {}).value || ''; if (al.trim().length < 3) { roti('Tulis alasan penolakan.'); return; } putus(n.slice(11), 'TOLAK', al.trim()); return; }
  }
  function kembali() { if (!lapisEl) return false; var k = lapisEl.querySelector('[data-l="kembali"]'); if (k) k.click(); return true; }
  function lupakan() { ST = null; LIST = null; ANTRE = null; CID = ''; urutan++; if (lapisEl) tutup(); }
  window.WHL_LEMBUR = { NAMA: NAMA, aktif: aktif, muat: muat, ringkas: ringkas, segera: segera, bukaAju: bukaAju, bukaAcc: bukaAcc, kembali: kembali, lupakan: lupakan };
})();
