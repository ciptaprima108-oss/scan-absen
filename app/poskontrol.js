/* WHL App — 🔧 POS KONTROL (app-poskontrol-25nov, Posko 25 Nov 2026). Tahap 2 rencana pindah ke App WHL.
 * Papan tiket Pos Kontrol di dalam app: Menunggu / Dikerjakan / Pending / Standby / Selesai hari ini.
 *   Tunjuk mekanik (boleh lebih dari 1, bengkel luar) · Selesaikan (pekerjaan + sparepart + FOTO WAJIB dari kamera + TTD driver & mekanik) ·
 *   Pending (alasan) · Lanjutkan · Tambah / ganti mekanik · Batalkan (alasan) · Revisi tiket selesai hari ini · info kwitansi storing.
 * Server = DASHBOARD PusatPosKontrolApp.gs lewat api pusat: pusatPosKontrol [token, aksi, data]. Semua aturan (bertugas/absen, foto wajib,
 *   TTD wajib, multi-mekanik, lock) tetap dicek di SERVER oleh fungsi Pos Kontrol yang lama; layar ini cuma tampilan + pengisi.
 * "Diproses oleh" = orang yang login (dari token), bukan pilihan di layar.
 * Cetak tiket thermal & kwitansi dot matrix: tombol membuka halaman lama (Bluetooth di app belum ada).
 * Sakelar mundur: server user.pk.mati = true -> menu langsung membuka halaman lama. Tanpa alert/confirm/prompt.
 */
(function () {
  'use strict';
  var API = window.WHL_API, K = window.WHL_KONFIG || {};
  var CTX = null, el = null, D = null, galat = '', memuat = false, urut = 0, TAB = '', M = null, tPoll = null, SENTUH = 0, BENGKEL = null, KWS = null;
  var PEK_UMUM = ['Las', 'Tambal / ganti ban', 'Setel / ganti kampas rem', 'Kelistrikan / lampu', 'Ganti oli', 'Ganti filter', 'Greasing', 'Ganti selang', 'Bocor angin', 'Bocor oli / solar', 'Radiator', 'Kopling', 'Per / pegas', 'Baut roda', 'Body / pintu', 'Pengecekan'];
  var SP_UMUM = ['Tidak ada', 'Oli mesin', 'Filter oli', 'Filter solar', 'Filter udara', 'Ban', 'Kampas rem', 'Selang', 'Baut / mur', 'Lampu', 'Aki', 'Per / pegas', 'Grease', 'Kawat las'];
  var ALASAN_P = ['Tunggu sparepart', 'Tunggu mekanik', 'Tunggu unit lain', 'Lainnya'];
  var ALASAN_B = ['Laporan dobel', 'Salah input unit', 'Tidak jadi dikerjakan', 'Lainnya'];
  var TABS = [['menunggu', 'Menunggu', '👷', '#d97706'], ['dikerjakan', 'Dikerjakan', '🔧', '#1565c0'], ['pending', 'Pending', '⏸', '#9333ea'], ['standby', 'Standby', '💤', '#64748b'], ['selesai', 'Selesai', '✅', '#16a34a']];
  var PERAN = ['pimpinan', 'penuh', 'pengawas', 'mekanik', 'admin', 'adminhse', 'hse'];
  var POLL_MS = 20000;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { return CTX && CTX.sesi(); }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function getar() { try { if (window.WHL_RASA && window.WHL_RASA.getar) window.WHL_RASA.getar(); } catch (e) { /* */ } }
  function panggil(aksi, data, ms) { var S = sesi(); return API.Pusat.panggil('pusatPosKontrol', [S && S.tokenPusat, aksi, data || {}], ms || 30000); }
  function umur(m) { m = Math.max(0, Math.round(Number(m) || 0)); var h = Math.floor(m / 1440), j = Math.floor(m % 1440 / 60), n = m % 60; return h ? h + 'h ' + j + 'j' : (j ? j + 'j ' + n + 'm' : n + 'm'); }
  function jamPendek(s) { s = String(s || ''); return s.length >= 16 ? s.slice(0, 5) + ' ' + s.slice(11, 16) : s; }
  function lbPendek(s) { return String(s || '').replace(/^WHL\s*/i, ''); }
  function bersihPd(k) { k = String(k || '').trim(); var m = k.match(/·\s*diproses\s+([^·]+?)\s*$/), a = k.replace(/\s*·\s*diproses\s+[^·]*/g, '').trim(); return { a: a || k, o: m ? m[1].trim() : '' }; }
  function tglId(s) { var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(s || ''); }
  function lebar() { return (window.innerWidth || 400) >= 700; }
  function urlLama(ar, id) { var u = K.DASH + '?mode=maintenance'; if (id) u += '&armada=' + encodeURIComponent(ar || 'TRINTIN') + '&tiket=' + encodeURIComponent(id); return u; }
  function bukaLama(ar, id) { if (CTX && CTX.bukaWeb) CTX.bukaWeb(urlLama(ar, id)); }

  /* ---------- hak (tampilan saja; server menolak lagi kalau tidak boleh) ---------- */
  function info(S) { S = S || sesi(); return (S && S.user && S.user.pk) || null; }
  function boleh(S) {
    S = S || sesi(); var u = S && S.user, X = API && API.Pusat;
    if (!u || u.peran === 'driver' || !X || !X.punya || !X.punya('pusatPosKontrol')) return false;
    return u.pk ? !!u.pk.g : PERAN.indexOf(u.peran) >= 0;
  }
  function saya() { return (D && D.saya) || {}; }
  function bisaProses() { return !!saya().proses; }
  function bisaKerja(t) { var s = saya(); return !!(s.proses || (s.mekanik && t)); } /* mekanik: server cuma mengirim tiket miliknya */

  /* ---------- gaya (ikut variabel tema app) ---------- */
  function pasangGaya() {
    if (document.getElementById('pkaGaya')) return;
    var st = document.createElement('style'); st.id = 'pkaGaya';
    st.textContent = [
      '.pkaLapis .ksnKp .sp{flex:1}.pkaLapis .ksnKp .kb.segar.putar{animation:pkaPutar 1s linear infinite}@keyframes pkaPutar{to{transform:rotate(360deg)}}',
      '.pkaLapis.pkaLebar .ksnIsi{max-width:1120px}',
      '.pkaLapis button{touch-action:manipulation;-webkit-tap-highlight-color:transparent;font-family:inherit}',
      '.pkaSaya{display:flex;align-items:center;gap:10px;background:var(--panel);border:1px solid var(--garis);border-radius:16px;padding:10px 12px;margin-bottom:10px;box-shadow:var(--bayang)}',
      '.pkaSaya .tt{width:12px;height:12px;border-radius:50%;flex:none;background:#16a34a;box-shadow:0 0 0 4px rgba(22,163,74,.18)}.pkaSaya .tt.mati{background:#dc2626;box-shadow:0 0 0 4px rgba(220,38,38,.16)}',
      '.pkaSaya .tx{flex:1;min-width:0;font-size:13px;line-height:1.4;color:var(--redup)}.pkaSaya b{color:var(--teks);font-size:14.5px}',
      '.pkaPita{font-size:12.5px;line-height:1.45;border-radius:14px;padding:10px 12px;margin-bottom:10px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.4)}.pkaPita.mrh{background:rgba(220,38,38,.09);border-color:rgba(220,38,38,.35)}.pkaPita.br{background:rgba(21,101,192,.09);border-color:rgba(21,101,192,.3)}',
      '.pkaTab{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-bottom:12px}',
      '.pkaTab button{border:1px solid var(--garis);background:var(--panel);color:var(--teks);border-radius:14px;padding:8px 2px 7px;min-height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;position:relative;box-shadow:var(--bayang)}',
      '.pkaTab button b{font-size:21px;font-weight:900;line-height:1;color:var(--c)}.pkaTab button span{font-size:11px;font-weight:800;color:var(--redup);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}',
      '.pkaTab button.on{border-color:var(--c);box-shadow:0 0 0 2px var(--c) inset}.pkaTab button.on span{color:var(--teks)}.pkaTab button.kosong b{opacity:.35}',
      '.pkaTab button span i{font-style:normal}@media (max-width:430px){.pkaTab button span i{display:none}.pkaTab button span{font-size:10.5px;letter-spacing:-.2px}}',
      '.pkaTab button i.lm{position:absolute;top:5px;right:6px;width:8px;height:8px;border-radius:50%;background:#dc2626}',
      '.pkaJd{display:flex;align-items:baseline;gap:8px;margin:2px 4px 8px;font-size:12.5px;color:var(--redup)}.pkaJd b{font-size:13px;letter-spacing:.8px;color:var(--c)}',
      '.pkaGrid{display:grid;grid-template-columns:1fr;gap:10px}.pkaLebar .pkaGrid{grid-template-columns:repeat(auto-fill,minmax(310px,1fr))}',
      '.pkaK{background:var(--panel);border:1px solid var(--garis);border-left:5px solid var(--c);border-radius:16px;padding:11px 12px 10px;box-shadow:var(--bayang);display:flex;flex-direction:column;gap:5px;text-align:left;color:var(--teks)}',
      '.pkaK .a{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.pkaK .lb{font-size:21px;font-weight:900;letter-spacing:.3px}.pkaK .lb small{font-size:10px;font-weight:800;color:var(--redup);margin-left:3px}',
      '.pkaBd{font-size:10.5px;font-weight:900;padding:3px 7px;border-radius:999px;background:var(--c);color:#fff;letter-spacing:.4px}.pkaBd.sto{background:#dc2626}.pkaBd.drv{background:rgba(8,145,178,.15);color:#0e7490}',
      '.pkaK .tm{margin-left:auto;font-size:12px;font-weight:800;color:var(--redup);white-space:nowrap}.pkaK .tm.lama{color:#dc2626}',
      '.pkaK .ket{font-size:13.5px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}',
      '.pkaK .inf{font-size:12.5px;color:var(--redup);line-height:1.4;word-break:break-word}.pkaK .inf b{color:var(--teks)}',
      '.pkaK .pd{font-size:12.5px;line-height:1.4;background:rgba(147,51,234,.09);border-radius:10px;padding:6px 8px}.pkaK .st{font-size:12px;font-weight:800}',
      '.pkaAk{display:flex;gap:6px;margin-top:4px}.pkaAk button{flex:1;min-height:44px;border-radius:12px;font-size:13.5px;font-weight:800;border:1px solid var(--garis);background:var(--panel2);color:var(--teks);padding:0 6px}',
      '.pkaAk button.tj{background:#f59e0b;border-color:#f59e0b;color:#1a1000}.pkaAk button.sl{background:rgba(22,163,74,.14);border-color:#16a34a;color:var(--tHijau,#0f7a45)}.pkaAk button.pd{background:rgba(147,51,234,.1);border-color:#9333ea;color:#7e22ce}.pkaAk button.ln{background:#1565c0;border-color:#1565c0;color:#fff}',
      '.pkaAk button.bt{flex:0 0 46px;color:var(--tMerah,#c62828)}',
      'button.pkaSiap{animation:pkaKedip .8s steps(2) infinite;outline:2px solid #dc2626;outline-offset:1px}@keyframes pkaKedip{50%{opacity:.6}}',
      '.pkaKosong{text-align:center;color:var(--redup);padding:28px 12px;font-size:14px;line-height:1.5;background:var(--panel);border:1px dashed var(--garis);border-radius:16px}',
      '.pkaMenu{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.pkaMenu button{min-height:52px;border-radius:14px;border:1px solid var(--garis);background:var(--panel);color:var(--teks);font-size:13.5px;font-weight:800;padding:6px 10px;box-shadow:var(--bayang)}.pkaMenu button small{display:block;font-size:11px;font-weight:700;color:var(--redup)}',
      '.pkaKecil{font-size:12px;color:var(--redup);margin:12px 4px 0;line-height:1.5}',
      '.pkaModal{position:absolute;inset:0;z-index:6;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}',
      '.pkaModal .kt{background:var(--bg);width:100%;max-width:640px;border-radius:22px 22px 0 0;padding:16px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.3);max-height:92%;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}',
      '.pkaModal h3{margin:0;font-size:19px;font-weight:900;display:flex;align-items:center;gap:8px;flex-wrap:wrap}.pkaModal .sb{font-size:12.5px;color:var(--redup);margin:3px 0 10px;line-height:1.45}',
      '.pkaModal .tutupX{margin-left:auto;width:40px;height:40px;border-radius:12px;background:var(--panel2);border:0;font-size:18px;font-weight:900;color:var(--teks)}',
      '.pkaRow{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid var(--garis);font-size:13.5px}.pkaRow:first-of-type{border-top:0}.pkaRow span{color:var(--redup);flex:0 0 36%}.pkaRow b{text-align:right;word-break:break-word;flex:1;font-weight:700}',
      '.pkaBox{background:var(--panel);border:1px solid var(--garis);border-radius:16px;padding:10px 12px;margin-bottom:10px}',
      '.pkaLbl{font-size:13px;font-weight:900;margin:12px 2px 6px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}.pkaLbl small{font-weight:700;color:var(--redup);font-size:11.5px}.pkaLbl .w{color:#dc2626}',
      '.pkaChips{display:flex;flex-wrap:wrap;gap:6px}.pkaChips button{border:1px solid var(--garis);background:var(--panel);color:var(--teks);border-radius:999px;padding:8px 12px;font-size:13px;font-weight:700;min-height:40px}',
      '.pkaChips button.on{background:rgba(21,101,192,.14);border-color:var(--utama);color:var(--utama);font-weight:900}.pkaChips button[disabled]{opacity:.42}',
      '.pkaChips button small{font-size:10.5px;font-weight:700;opacity:.8;margin-left:4px}.pkaChips button.kerja{border-style:dashed}',
      '.pkaIn{width:100%;box-sizing:border-box;font-size:16px;min-height:46px;padding:10px 12px;border-radius:12px;border:1px solid var(--garis);background:var(--isian,var(--panel));color:var(--teks);font-family:inherit}textarea.pkaIn{min-height:72px;resize:vertical}',
      '.pkaDua{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      '.pkaFoto{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pkaFoto button{min-height:52px;border-radius:14px;font-size:14px;font-weight:800;border:1px solid var(--garis);background:var(--panel);color:var(--teks)}.pkaFoto button.utama{background:var(--utama);border-color:var(--utama);color:#fff}',
      '.pkaPrev{display:none;margin-top:8px;border-radius:12px;max-width:100%;max-height:220px;object-fit:contain;background:#000}.pkaPrev.ada{display:block}',
      '.pkaFotoSt{font-size:12.5px;margin-top:6px;color:var(--redup)}.pkaFotoSt.ok{color:var(--tHijau,#0f7a45);font-weight:800}.pkaFotoSt.err{color:#dc2626;font-weight:800}',
      '.pkaTtd{border:1.5px dashed var(--garis);border-radius:12px;background:#fff;position:relative}.pkaTtd canvas{display:block;width:100%;height:130px;touch-action:none;border-radius:12px}',
      '.pkaTtd .hp{position:absolute;top:6px;right:6px;border:0;background:#eef2f7;color:#334155;border-radius:10px;font-size:12px;font-weight:800;padding:6px 10px;min-height:32px}',
      '.pkaTtd .ph{position:absolute;left:12px;bottom:8px;font-size:12px;color:#94a3b8;pointer-events:none}',
      '.pkaTombol{display:block;width:100%;min-height:54px;border-radius:16px;font-size:16px;font-weight:900;border:0;margin-top:12px;background:var(--utama);color:#fff}',
      '.pkaTombol.hj{background:#16a34a}.pkaTombol.ung{background:#9333ea}.pkaTombol.mrh{background:#dc2626}.pkaTombol.kn{background:#f59e0b;color:#1a1000}.pkaTombol.abu{background:var(--panel2);color:var(--teks);border:1px solid var(--garis);font-size:14px;min-height:48px}',
      '.pkaTombol[disabled]{opacity:.5}',
      '.pkaMsg{font-size:13px;margin-top:8px;min-height:1em;line-height:1.45}.pkaMsg.err{color:#dc2626;font-weight:800}.pkaMsg.ok{color:var(--tHijau,#0f7a45);font-weight:800}',
      '.pkaAksiD{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px}.pkaAksiD .pkaTombol{margin-top:0}.pkaAksiD .penuh{grid-column:1/-1}',
      '.pkaKw{background:var(--panel);border:1px solid var(--garis);border-radius:14px;padding:10px 12px;margin-bottom:8px;font-size:13px;line-height:1.45}.pkaKw b{font-size:15px}.pkaKw .rp{float:right;font-weight:900}',
      '@media (min-width:1200px) and (hover:hover){.pkaModal{align-items:center}.pkaModal .kt{border-radius:22px}}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- lapis ---------- */
  function lapis() {
    if (el && !document.body.contains(el)) el = null;
    if (!el) {
      pasangGaya();
      el = document.createElement('div'); el.className = 'lapis ksnLapis pkaLapis'; document.body.appendChild(el);
      requestAnimationFrame(function () { if (el) el.classList.add('tampil'); });
      el.addEventListener('click', klik);
      el.addEventListener('pointerdown', function () { SENTUH = Date.now(); }, true);
      el.addEventListener('change', ubah); el.addEventListener('input', ubah);
    }
    el.classList.toggle('pkaLebar', lebar());
    var s = saya();
    var kepala = '<div class="ksnKp"><button type="button" class="kb" data-p="kembali" aria-label="Kembali">‹</button><div class="nm">' + esc(s.nama ? s.nama + ' · ' + namaGrup(s.g) : 'Tiket mekanik') + '<b>Pos Kontrol</b></div><span class="sp"></span>'
      + '<button type="button" class="kb segar' + (memuat ? ' putar' : '') + '" data-p="segar" aria-label="Muat ulang">⟳</button></div>';
    var g = el.querySelector('.ksnIsi'), y = g ? g.scrollTop : 0;
    if (!el.querySelector('.ksnKp')) el.innerHTML = kepala + '<div class="ksnIsi"></div>';
    else el.querySelector('.ksnKp').outerHTML = kepala; /* pop-up (.pkaModal) = saudara, tidak ikut diganti */
    el.querySelector('.ksnIsi').innerHTML = isiPapan();
    var g2 = el.querySelector('.ksnIsi'); if (g2) g2.scrollTop = y;
  }
  function namaGrup(g) { return { pimpinan: 'pimpinan', pengawas: 'pengawas', mekanik: 'mekanik', tyreman: 'tyreman', admin: 'admin', lain: 'HSE' }[g] || ''; } /* + tyreman */
  function tutup() {
    if (!el) return; var d = el; el = null; M = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200);
    berhentiPoll(); urut++; if (CTX && CTX.perbarui) CTX.perbarui();
  }
  function kembali() {
    if (!el) return false;
    if (M) { tutupModal(); return true; }
    tutup(); return true;
  }

  /* ---------- buka & muat ---------- */
  var CARI_LB = ''; /* pk-4-jenis-petugas-26nov */
  function bukaLambung(lb) {
    var n = String(lb || '').replace(/[^0-9]/g, ''), urutG = ['menunggu', 'dikerjakan', 'pending', 'standby'];
    var l = ((D && D.tiket) || []).filter(function (t) { return n && String(t.lb || '').replace(/[^0-9]/g, '') === n && urutG.indexOf(t.g) >= 0; }).sort(function (a, b) { return urutG.indexOf(a.g) - urutG.indexOf(b.g); });
    if (!l.length) { roti('Belum ada tiket terbuka untuk ' + lb + ' di papan ini.'); return false; }
    TAB = l[0].g; lapis(); bukaModal('detail', l[0]); return true;
  }
  function buka(ctx, opsi) {
    CTX = ctx || CTX; CARI_LB = String((opsi && opsi.lb) || '');
    var pk = info();
    if (pk && pk.mati) { roti('Pos Kontrol di app sedang dimatikan dari server — membuka halaman lama.'); bukaLama(); return; }
    if (!boleh()) { roti('Pos Kontrol khusus pengawas, mekanik, admin & pimpinan.'); return; }
    lapis(); muat(); mulaiPoll();
  }
  function muat(diam) {
    var aku = ++urut; memuat = true; if (!diam) galat = ''; if (el) segarkanKepala();
    return panggil('papan', {}, 30000).then(function (h) {
      if (aku !== urut) return; memuat = false;
      if (!h || !h.ok) {
        galat = (h && h.pesan) || 'Papan belum bisa dimuat.';
        if (h && h.login === false && CTX && CTX.sesiHabis) { tutup(); CTX.sesiHabis(); return; }
        if (h && h.mati) { tutup(); roti(galat); bukaLama(); return; }
      } else { D = h; galat = ''; if (!TAB) TAB = tabAwal(); }
      if (CARI_LB && D === h) { var cl = CARI_LB; CARI_LB = ''; if (bukaLambung(cl)) return; } /* pk-4-jenis-petugas-26nov */
      gambarPapan();
    }, function (e) {
      if (aku !== urut) return; memuat = false;
      galat = (e && e.message) || 'Tidak ada sinyal. Coba lagi.';
      gambarPapan();
    });
  }
  function segarkanKepala() { var b = el && el.querySelector('.ksnKp .segar'); if (b) b.classList.toggle('putar', memuat); }
  function sibuk() { return !!M || Date.now() - SENTUH < 2500 || (el && el.querySelector('.pkaSiap')); }
  function gambarPapan() { if (!el) return; if (M) { segarkanKepala(); return; } lapis(); } /* pop-up terbuka: papan tidak digambar ulang (ketukan tidak hilang); digambar saat pop-up ditutup */
  function mulaiPoll() {
    berhentiPoll();
    tPoll = setInterval(function () {
      if (!el) { berhentiPoll(); return; }
      if (document.hidden || memuat || sibuk()) return;
      muat(true);
    }, POLL_MS);
  }
  function berhentiPoll() { if (tPoll) clearInterval(tPoll); tPoll = null; }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && el && !M && !memuat) muat(true); });

  /* ---------- papan ---------- */
  function tiketDi(g) { return ((D && D.tiket) || []).filter(function (t) { return t.g === g; }); }
  function tabAwal() {
    var s = saya(), urutan = s.semua ? ['menunggu', 'dikerjakan', 'pending', 'standby', 'selesai'] : ['dikerjakan', 'pending', 'selesai'];
    for (var i = 0; i < urutan.length; i++) if (tiketDi(urutan[i]).length) return urutan[i];
    return urutan[0];
  }
  function tabTampil() { return saya().semua ? TABS : TABS.filter(function (x) { return x[0] === 'dikerjakan' || x[0] === 'pending' || x[0] === 'selesai'; }); }
  function isiPapan() {
    if (!D) return galat ? '<div class="pkaPita mrh">⚠️ ' + esc(galat) + '</div><button type="button" class="pkaTombol" data-p="segar">Coba lagi</button>' + menuBawah()
      : '<div class="pkaKosong"><span class="putar"></span> Memuat papan Pos Kontrol…</div>';
    var s = saya(), h = '';
    h += '<div class="pkaSaya"><span class="tt' + (s.aktif ? '' : ' mati') + '"></span><div class="tx"><b>' + esc(s.nama) + '</b> · ' + esc(namaGrup(s.g)) + ' · ' + esc(s.ket || '') + '<br>'
      + (s.proses ? 'Kamu bisa tunjuk mekanik, selesaikan, pending & batalkan tiket.' : s.mekanik ? 'Tampil tiket yang ditunjuk ke kamu. Kamu bisa selesaikan / pending tiket milikmu.' : s.g === 'pengawas' ? 'Absen masuk dulu di menu Kehadiran supaya bisa memproses tiket.' : 'Lihat saja.') + '</div></div>';
    if (ban()) h += ban().atas(); /* poskontrol-ganti-ban-25nov */
    if (str()) h += str().atas(); /* pk-app-setara-web-26nov */
    if (galat) h += '<div class="pkaPita mrh">⚠️ ' + esc(galat) + ' · data terakhir ditampilkan.</div>';
    if (D.galat) h += '<div class="pkaPita">Sebagian data server: ' + esc(D.galat) + '</div>';
    if (!s.semua && D.jml && D.jml.menunggu) h += '<div class="pkaPita br">👷 ' + D.jml.menunggu + ' unit menunggu ditunjuk pengawas.</div>';
    if (str() && str().papanLebar()) return h + str().htmlLebar({ kartu: kartu, tiketDi: tiketDi, tabTampil: tabTampil, menuBawah: menuBawah }); /* pk-app-setara-web-26nov: layar lebar = kolom */
    var TT = tabTampil();
    if (!TT.some(function (x) { return x[0] === TAB; })) TAB = TT[0][0];
    h += '<div class="pkaTab" style="grid-template-columns:repeat(' + TT.length + ',minmax(0,1fr))">' + TT.map(function (x) {
      var l = tiketDi(x[0]), n = s.semua ? (D.jml && D.jml[x[0]] != null ? D.jml[x[0]] : l.length) : l.length, lama = x[0] !== 'standby' && x[0] !== 'selesai' && l.some(function (t) { return t.mnt >= 120; });
      return '<button type="button" data-p="tab:' + x[0] + '" style="--c:' + x[3] + '" class="' + (TAB === x[0] ? 'on' : '') + (n ? '' : ' kosong') + '">' + (lama && TAB !== x[0] ? '<i class="lm"></i>' : '') + '<b>' + n + '</b><span><i>' + x[2] + ' </i>' + x[1] + '</span></button>';
    }).join('') + '</div>';
    var T = TABS.filter(function (x) { return x[0] === TAB; })[0], l = tiketDi(TAB);
    if (ban()) { h += ban().saringHtml(l); l = ban().saring(l); } /* poskontrol-ganti-ban-25nov: saring Semua / Perbaikan / Ganti ban */
    if (str()) l = str().saring(l); /* pk-app-setara-web-26nov: cari unit + saring armada */
    if (TAB === 'pending') l.sort(function (a, b) { return (a.jamUpdateEpoch || 0) - (b.jamUpdateEpoch || 0); });
    var ket = { menunggu: 'tunjuk mekanik', dikerjakan: 'selesaikan / pending', pending: 'lanjutkan / selesaikan', standby: str() && str().nyala() ? 'tunjuk mekanik / akhiri → Ready' : 'tunjuk & ready lewat halaman lama', selesai: 'selesai hari ini (06.00–06.00)' }[TAB];
    h += '<div class="pkaJd" style="--c:' + T[3] + '"><b>' + T[2] + ' ' + T[1].toUpperCase() + '</b>' + esc(ket) + '</div>';
    h += l.length ? '<div class="pkaGrid">' + l.map(kartu).join('') + '</div>' : '<div class="pkaKosong">' + (TAB === 'pending' ? 'Tidak ada tiket pending 👍' : TAB === 'selesai' ? 'Belum ada yang selesai hari ini.' : 'Kosong — tidak ada yang perlu ditindak di sini.') + '</div>';
    if (str() && str().nyala()) h += str().bawahPapan(); /* pk-app-setara-web-26nov: cek selip bisa diproses */
    else if (s.semua && D.jml && D.jml.cekSelip) h += '<div class="pkaPita" style="margin-top:12px">📦 <b>' + D.jml.cekSelip + ' cek selip</b> (barang keluar gudang tanpa tiket) — diproses di halaman lama.</div>';
    h += menuBawah();
    h += '<div class="pkaKecil">Data server ' + esc(D.serverJam || '') + ' · muat ulang otomatis tiap 20 dtk. Cetak tiket thermal & kwitansi dot matrix tetap lewat halaman lama.</div>';
    return h;
  }
  function menuBawah() {
    var s = saya(), b = '<div class="pkaMenu"' + (s.kwitansi || (str() && str().tahapB()) ? '' : ' style="grid-template-columns:1fr"') + '>';
    if (s.kwitansi) b += '<button type="button" data-p="kwitansi">🧾 Kwitansi storing<small>' + (str() && str().tahapB() ? 'buat · rekap · batal' : 'info · cetak di halaman lama') + '</small></button>';
    if (str()) b += str().menu(); /* pk-app-setara-web-26nov */
    b += '<button type="button" data-p="lama">🖥️ Pakai halaman lama<small>form Pos Kontrol web</small></button>';
    return b + '</div>';
  }
  function kartu(t) {
    if (t.gb && ban()) return ban().kartu(t); /* poskontrol-ganti-ban-25nov */
    var T = TABS.filter(function (x) { return x[0] === t.g; })[0] || TABS[0], c = T[3], tr = t.ar === 'TRONTON';
    var bd = { menunggu: 'MENUNGGU', dikerjakan: 'DIKERJAKAN', pending: 'PENDING', standby: /^\s*TAHAN/i.test(t.ker || '') ? 'DITAHAN' : 'STANDBY', selesai: 'SELESAI' }[t.g];
    var tm = t.g === 'standby' ? 'sejak ' + jamPendek(t.jamMasuk) : t.g === 'selesai' ? '✓ ' + String(t.jamSelesai || '').slice(11) : '⏱ ' + umur(t.mnt);
    var h = '<div class="pkaK" style="--c:' + c + '" data-p="det:' + esc(t.ar + '|' + t.id) + '"><div class="a"><span class="lb">' + esc(lbPendek(t.lb)) + (tr ? '<small>TR</small>' : '') + '</span><span class="pkaBd">' + bd + '</span>'
      + (t.jenis === 'STORING' ? '<span class="pkaBd sto">🆘 STORING</span>' : t.jenis === 'SERVICE' ? '<span class="pkaBd" style="background:#0891b2">🛢 OLI</span>' : '') + (t.dariDriver ? '<span class="pkaBd drv">📱</span>' : '')
      + '<span class="tm' + (t.g !== 'standby' && t.g !== 'selesai' && t.mnt >= 120 ? ' lama' : '') + '">' + esc(tm) + '</span></div>';
    h += '<div class="ket">' + esc(t.ker || '-') + '</div>';
    if (t.g === 'menunggu' || t.g === 'standby') h += '<div class="inf">👤 ' + esc(t.drv || '-') + (t.dariDriver ? ' · 📱 dari driver' : ' · lapor ' + esc(t.lapor || '-')) + (t.gantung ? ' · masuk ' + esc(t.tgl || '') : '') + '</div>';
    else h += '<div class="inf">🔧 <b>' + esc(t.mek || '-') + '</b>' + (t.oleh ? ' · ditunjuk ' + esc(t.oleh) : '') + '</div>';
    if (t.g === 'pending') { var b = bersihPd(t.kp); h += '<div class="pd">⏸ <b>' + esc(b.a) + '</b>' + (b.o ? ' · oleh ' + esc(b.o) : '') + (t.jamUpdateEpoch ? ' · ' + umur((Date.now() - t.jamUpdateEpoch) / 60000) : '') + '</div>'; }
    if (t.g === 'dikerjakan' && /^\s*▶\s*LANJUT/i.test(t.kp || '')) h += '<div class="inf">▶ dilanjutkan ' + esc(jamPendek(t.jamUpdate)) + '</div>';
    if (t.g === 'selesai' && t.ks) h += '<div class="inf">✅ ' + esc(String(t.ks).slice(0, 120)) + '</div>';
    if (t.sto && t.g !== 'standby' && t.g !== 'selesai') h += '<div class="st" style="color:' + (t.sto.sisa < 0 ? '#dc2626' : '#16a34a') + '">🎯 target ' + umur(t.sto.target) + ' · ' + (t.sto.sisa < 0 ? 'lewat ' + umur(-t.sto.sisa) : 'sisa ' + umur(t.sto.sisa)) + '</div>';
    var ak = tombolKartu(t);
    if (ak) h += '<div class="pkaAk">' + ak + '</div>';
    return h + '</div>';
  }
  function tombolKartu(t) {
    var s = saya(), k = esc(t.ar + '|' + t.id), b = function (cls, n, txt) { return '<button type="button" class="' + cls + '" data-p="' + n + ':' + k + '">' + txt + '</button>'; };
    if (t.g === 'menunggu') return s.proses ? b('tj', 'tunjuk', '👷 Tunjuk mekanik') + b('bt', 'batal', '❌') : '';
    if (t.g === 'dikerjakan') return bisaKerja(t) ? b('sl', 'selesai', '✅ Selesaikan') + b('pd', 'pending', '⏸ Pending') + (s.proses ? b('bt', 'batal', '❌') : '') : '';
    if (t.g === 'pending') return bisaKerja(t) ? b('ln', 'lanjut', '▶ Lanjutkan') + b('sl', 'selesai', '✅ Selesaikan') + (s.proses ? b('bt', 'batal', '❌') : '') : '';
    if (t.g === 'standby') return s.proses ? (str() && str().nyala() ? b('tj', 'sbTunjuk', '👷 Tunjuk') + b('sl', 'sbReady', '🟢 Ready') : b('', 'lamaT', '🖥️ Tunjuk / Ready (halaman lama)')) + b('bt', 'batal', '❌') : ''; /* pk-app-setara-web-26nov */
    if (t.g === 'selesai') return (s.proses ? b('', 'revisi', '✏️ Revisi') : '') + (str() && str().nyala() ? b('', 'cetak', '🖼️ Gambar tiket') : ''); /* pk-app-setara-web-26nov: tombol cetak tiket selesai dulu buntu (Bugi #1) */
    return '';
  }
  function cariT(k) { var p = String(k || '').split('|'); return ((D && D.tiket) || []).filter(function (t) { return t.ar === p[0] && String(t.id) === p[1]; })[0] || null; }

  /* ---------- tekan 2x untuk simpan (tanpa confirm bawaan) ---------- */
  function duaKali(btn, fn) {
    var t = +(btn.getAttribute('data-siap') || 0), kini = Date.now();
    if (t && kini < t) { if (kini < t - 5000 + 450) return; btn.removeAttribute('data-siap'); btn.classList.remove('pkaSiap'); btn.textContent = btn.getAttribute('data-asli'); fn(); return; }
    if (!btn.getAttribute('data-asli')) btn.setAttribute('data-asli', btn.textContent);
    btn.setAttribute('data-siap', String(kini + 5000)); btn.classList.add('pkaSiap'); btn.textContent = '⚠️ Tekan sekali lagi — ' + btn.getAttribute('data-asli');
    getar();
    setTimeout(function () { if (btn.getAttribute('data-siap') && Date.now() >= +btn.getAttribute('data-siap')) { btn.removeAttribute('data-siap'); btn.classList.remove('pkaSiap'); btn.textContent = btn.getAttribute('data-asli'); } }, 5200);
  }

  /* ---------- modal ---------- */
  function bukaModal(jenis, t, extra) {
    M = Object.assign({ jenis: jenis, t: t }, extra || {});
    var lama = el.querySelector('.pkaModal'); if (lama) lama.remove();
    var w = document.createElement('div'); w.className = 'pkaModal'; w.setAttribute('data-p', 'latar');
    w.innerHTML = '<div class="kt">' + htmlModal() + '</div>';
    el.appendChild(w);
    if (jenis === 'selesai') pasangSelesai(w);
    if (str() && /^st/.test(jenis)) str().sesudahModal(w, jenis); /* pk-app-setara-web-26nov */
    if (ban() && /^gb/.test(jenis)) ban().sesudahModal(w, jenis); /* poskontrol-ganti-ban-25nov */
  }
  function tutupModal() { M = null; var w = el && el.querySelector('.pkaModal'); if (w) w.remove(); if (el) lapis(); }
  function gambarModal() { var w = el && el.querySelector('.pkaModal .kt'); if (w) { var y = w.scrollTop; w.innerHTML = htmlModal(); w.scrollTop = y; } }
  function msg(t, cls) { var m = el && el.querySelector('.pkaModal .pkaMsg'); if (m) { m.className = 'pkaMsg' + (cls ? ' ' + cls : ''); m.textContent = t; } }
  function kepalaModal(judul, t) {
    return '<h3>' + judul + ' <span style="font-weight:900">' + esc(t ? t.lb : '') + '</span>' + (t && t.ar === 'TRONTON' ? '<span class="pkaBd" style="--c:#64748b;background:#64748b">TRONTON</span>' : '') + '<button type="button" class="tutupX" data-p="tutupModal" aria-label="Tutup">✕</button></h3>'
      + (t ? '<div class="sb">' + esc(t.ker || '-') + '<br>Masuk ' + esc(t.jamMasuk || '-') + (t.dariDriver ? ' · 📱 dari driver' : '') + (t.mek ? ' · 🔧 ' + esc(t.mek) : '') + '</div>' : '');
  }
  function htmlModal() {
    var t = M.t, j = M.jenis;
    if (ban() && (/^gb/.test(j) || (j === 'detail' && t && t.gb))) return ban().html(j, t); /* poskontrol-ganti-ban-25nov */
    if (str() && /^st/.test(j)) return str().html(j, t); /* pk-app-setara-web-26nov */
    if (j === 'detail') return htmlDetail(t);
    if (j === 'tunjuk') return htmlTunjuk(t);
    if (j === 'selesai') return htmlSelesai(t);
    if (j === 'pending') return htmlPending(t);
    if (j === 'batal') return htmlBatal(t);
    if (j === 'revisi') return htmlRevisi(t);
    if (j === 'kwitansi') return htmlKwitansi();
    return '';
  }
  function baris(a, b) { return b ? '<div class="pkaRow"><span>' + a + '</span><b>' + esc(b) + '</b></div>' : ''; }
  function htmlDetail(t) {
    var s = saya(), h = kepalaModal({ menunggu: '👷', dikerjakan: '🔧', pending: '⏸', standby: '💤', selesai: '✅' }[t.g] || '', t);
    h += '<div class="pkaBox">' + baris('Jenis', t.jenis) + baris('Driver', t.drv) + baris('Dilaporkan', t.lapor) + baris('Mekanik', t.mek) + baris('Ditunjuk oleh', t.oleh) + baris('Jam tunjuk', t.jamTunjuk)
      + (t.g === 'pending' ? baris('Pending', bersihPd(t.kp).a) + baris('Sejak', t.jamUpdate) : '') + baris('Jam selesai', t.jamSelesai) + baris('Pekerjaan', t.ks)
      + (t.g !== 'selesai' && t.g !== 'standby' ? baris('Lama', umur(t.mnt)) : '') + '</div>';
    var b = function (cls, n, txt, penuh) { return '<button type="button" class="pkaTombol ' + cls + (penuh ? ' penuh' : '') + '" data-p="' + n + ':' + t.ar + '|' + t.id + '">' + txt + '</button>'; };
    var A = '';
    if (t.g === 'menunggu' && s.proses) A += b('kn', 'tunjuk', '👷 Tunjuk mekanik', true);
    if ((t.g === 'dikerjakan' || t.g === 'pending') && bisaKerja(t)) {
      if (t.g === 'pending') A += '<button type="button" class="pkaTombol penuh" data-p="lanjutYa:' + t.ar + '|' + t.id + '">▶ LANJUTKAN — kerja lagi</button>';
      A += b('hj', 'selesai', '✅ Selesaikan') + b('ung', 'pending', '⏸ Pending');
      if (s.proses) A += b('abu', 'ganti', '👷 Tambah / ganti mekanik', true);
    }
    if (t.g === 'standby' && s.proses) A += str() && str().nyala() ? b('kn', 'sbTunjuk', '👷 Tunjuk mekanik') + b('hj', 'sbReady', '🟢 Akhiri → Ready') : b('abu', 'lamaT', '🖥️ Tunjuk / Ready di halaman lama', true); /* pk-app-setara-web-26nov */
    if (t.g === 'selesai' && s.proses) A += b('abu', 'revisi', '✏️ Revisi pekerjaan / mekanik', true);
    A += str() && str().nyala() ? str().tombolDetail(t, b) : (t.g === 'selesai' ? '' : b('abu', 'cetak', '🖨️ Cetak tiket (halaman lama)', !s.proses)); /* pk-app-setara-web-26nov (Bugi #1) */
    if (s.proses && t.g !== 'selesai') A += b('abu', 'batal', '❌ Batalkan tiket');
    return h + '<div class="pkaAksiD">' + A + '</div><div class="pkaMsg"></div>';
  }
  function unitMekanik(nama) {
    var N = String(nama || '').toUpperCase();
    return ((D && D.tiket) || []).filter(function (t) { return (t.g === 'dikerjakan' || t.g === 'pending') && String(t.mek || '').toUpperCase().split(/[^A-Z]+/).indexOf(N) >= 0; }).map(function (t) { return lbPendek(t.lb); });
  }
  /* pk-4-jenis-petugas-26nov: petugas utama jenis tiket paling atas (+ sedang kerja di unit mana), petugas lain selalu tampil di bawahnya. Tanpa data server (D.urutPetugas) = daftar lama. */
  var JNS_PENDEK = { PERBAIKAN: 'perbaikan', STORING: 'storing', SERVICE: 'service', GREASE: 'greasing', 'GANTI BAN': 'ban' };
  function kerjaOrang(nama) {
    var N = String(nama || '').toUpperCase();
    return ((D && D.tiket) || []).filter(function (t) { return (t.g === 'dikerjakan' || t.g === 'pending') && String(t.mek || '').toUpperCase().split(/[^A-Z]+/).indexOf(N) >= 0; }).map(function (t) { return lbPendek(t.lb) + (JNS_PENDEK[t.jenis] ? ' (' + JNS_PENDEK[t.jenis] + ')' : ''); });
  }
  function kelompokPetugas(jenis) {
    var U = D && D.urutPetugas; if (!U || !U.jenis || !Array.isArray(D.ms)) return null;
    var a = U.jenis[jenis] || U.jenis[U.bawaan] || { urut: ['mekanik', 'ms', 'tyreman'] }, ms = D.ms, mek = D.mekanik || [];
    var isi = { mekanik: mek.filter(function (x) { return ms.indexOf(x.nama) < 0; }), ms: mek.filter(function (x) { return ms.indexOf(x.nama) >= 0; }), tyreman: D.tyreman || [] };
    return a.urut.map(function (k, i) { var K = (U.kelompok || {})[k] || { label: k, ik: '' }; return { k: k, label: K.label, ik: K.ik, utama: i === 0, jenisLabel: a.label || jenis, l: isi[k] || [] }; });
  }
  function chipsJenis(pilih, jenis, aksi) {
    var G = kelompokPetugas(jenis || (M && M.t && M.t.jenis) || ''); if (!G) return null;
    aksi = aksi || 'mek';
    var h = '<div id="' + (aksi === 'mek' ? 'pkaMek' : 'gbOrang') + '">';
    G.forEach(function (g, i) {
      if (i === 1) h += '<div style="margin-top:14px;padding-top:10px;border-top:1px dashed var(--garis,#cbd5e1);font-size:11px;font-weight:800;letter-spacing:.05em;color:var(--redup,#64748b)">PETUGAS LAIN · boleh ditunjuk juga</div>';
      h += '<div class="pkaLbl" style="margin-top:' + (g.utama ? 2 : 8) + 'px">' + g.ik + ' ' + esc(g.label) + (g.utama ? ' <span style="background:#0f7a45;color:#fff;border-radius:999px;padding:1px 8px;font-size:10.5px;font-weight:800">UTAMA</span><small>petugas ' + esc(g.jenisLabel) + '</small>' : '') + '</div>';
      if (!g.l.length) { h += '<div style="font-size:12.5px;color:#b45309">Belum ada ' + esc(g.label) + ' di daftar petugas.</div>'; return; }
      h += '<div class="pkaChips">' + g.l.map(function (x) { return { x: x, u: kerjaOrang(x.nama) }; }).sort(function (p, q) { return (p.x.aktif ? (p.u.length ? 1 : 0) : 2) - (q.x.aktif ? (q.u.length ? 1 : 0) : 2); }).map(function (o) {
        var x = o.x, ket = x.aktif ? (o.u.length ? '🔧 ' + o.u.join(', ') : 'siap') : (x.ket || 'belum absen');
        return '<button type="button" data-p="' + aksi + ':' + esc(x.nama) + '"' + (x.aktif ? '' : ' disabled') + ' class="' + (pilih.indexOf(x.nama) >= 0 ? 'on' : '') + (o.u.length ? ' kerja' : '') + '">' + esc(x.nama) + '<small>' + esc(ket) + '</small></button>';
      }).join('') + '</div>';
    });
    if (aksi === 'mek') h += '<div class="pkaChips" style="margin-top:10px"><button type="button" data-p="mek:__luar" class="' + (pilih.indexOf('__luar') >= 0 ? 'on' : '') + '">🏭 Bengkel luar…</button></div>';
    return h + '</div>';
  }
  function chipsMekanik(pilih) {
    var kj = chipsJenis(pilih); if (kj) return kj; /* pk-4-jenis-petugas-26nov */
    var l = ((D && D.mekanik) || []).slice().sort(function (a, b) { return (b.aktif ? 1 : 0) - (a.aktif ? 1 : 0); });
    return '<div class="pkaChips" id="pkaMek">' + l.map(function (x) {
      var u = unitMekanik(x.nama), ket = x.aktif ? (u.length ? '🔧 ' + u.join(', ') : 'siap') : x.ket;
      return '<button type="button" data-p="mek:' + esc(x.nama) + '"' + (x.aktif ? '' : ' disabled') + ' class="' + (pilih.indexOf(x.nama) >= 0 ? 'on' : '') + (u.length ? ' kerja' : '') + '">' + esc(x.nama) + '<small>' + esc(ket) + '</small></button>';
    }).join('') + '<button type="button" data-p="mek:__luar" class="' + (pilih.indexOf('__luar') >= 0 ? 'on' : '') + '">🏭 Bengkel luar…</button></div>';
  }
  function htmlBengkel() {
    if (M.pilih.indexOf('__luar') < 0) return '';
    var l = BENGKEL || [];
    return '<div style="margin-top:8px"><select class="pkaIn" id="pkaBk"><option value="">— pilih bengkel luar —</option>' + l.map(function (n) { return '<option' + (M.bk === n ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('')
      + '<option value="__lain"' + (M.bk === '__lain' ? ' selected' : '') + '>✏️ Lainnya (tulis)</option></select>'
      + (M.bk === '__lain' ? '<input class="pkaIn" id="pkaBkTulis" style="margin-top:6px" placeholder="nama bengkel (mis. Laga)" value="' + esc(M.bkTulis || '') + '">' : '') + '</div>';
  }
  function namaTerpilih() {
    var out = [];
    for (var i = 0; i < M.pilih.length; i++) {
      var n = M.pilih[i];
      if (n === '__luar') { var v = M.bk && M.bk !== '__lain' ? M.bk : String(M.bkTulis || '').trim(); if (!v) return ''; n = /^bengkel\s/i.test(v) ? v : 'Bengkel ' + v; }
      if (out.indexOf(n) < 0) out.push(n);
    }
    return out.join(', ');
  }
  function htmlTunjuk(t) {
    return kepalaModal('👷 Tunjuk', t) + '<div class="pkaLbl">Ketuk petugas yang mengerjakan <small>boleh lebih dari 1 · ketuk lagi untuk lepas</small></div>' + chipsMekanik(M.pilih) + '<div id="pkaBkW">' + htmlBengkel() + '</div>'
      + '<div class="pkaMsg" id="pkaMekInfo">' + (M.pilih.length > 1 ? '👷 ' + M.pilih.length + ' mekanik dipilih — 1 tiket; siapa pun yang SELESAI, tiket selesai untuk semua.' : '') + '</div>'
      + '<button type="button" class="pkaTombol kn" data-p="tunjukYa">👷 TUNJUK MEKANIK</button>'
      + '<div class="pkaDua"><button type="button" class="pkaTombol hj" data-p="tunjukLanjut:selesai">✅ Langsung selesaikan</button><button type="button" class="pkaTombol ung" data-p="tunjukLanjut:pending">⏸ Langsung pending</button></div>'
      + '<div class="pkaMsg"></div>';
  }
  function htmlPending(t) {
    var A = M.ganti ? ['Ganti mekanik'] : ((D && D.alasanPending && D.alasanPending.length) ? D.alasanPending : ALASAN_P); /* pk-ganti-shift-pending-27nov */
    var h = kepalaModal(M.ganti ? '👷 Ganti mekanik' : '⏸ Pending', t);
    if (M.ganti) h += '<div class="pkaLbl">Mekanik tiket ini <small>ketuk untuk tambah / lepas · nama lama tetap terpilih</small></div>' + chipsMekanik(M.pilih) + '<div id="pkaBkW">' + htmlBengkel() + '</div>';
    else h += '<div class="pkaLbl">Alasan pending <span class="w">wajib</span></div><div class="pkaChips">' + A.map(function (a) { return '<button type="button" data-p="al:' + esc(a) + '" class="' + (M.alasan === a ? 'on' : '') + '">' + esc(a) + '</button>'; }).join('') + '</div>';
    h += '<div class="pkaLbl">Catatan <small>' + (M.alasan === 'Lainnya' ? 'wajib' : 'opsional') + '</small></div><textarea class="pkaIn" id="pkaCat" placeholder="mis. nunggu kampas rem dari gudang">' + esc(M.catatan || '') + '</textarea>';
    return h + '<button type="button" class="pkaTombol ung" data-p="pendingYa">' + (M.ganti ? '👷 Simpan mekanik' : '⏸ Simpan PENDING') + '</button><div class="pkaMsg"></div>';
  }
  function htmlBatal(t) {
    return kepalaModal('❌ Batalkan', t) + '<div class="sb">Tiket batal <b>tidak dihitung selesai</b> & hilang dari papan. Kalau unitnya sudah beres, pakai ✅ Selesaikan.</div>'
      + '<div class="pkaLbl">Alasan batal <span class="w">wajib</span></div><div class="pkaChips">' + ALASAN_B.map(function (a) { return '<button type="button" data-p="al:' + esc(a) + '" class="' + (M.alasan === a ? 'on' : '') + '">' + esc(a) + '</button>'; }).join('') + '</div>'
      + '<div class="pkaLbl">Catatan <small>' + (M.alasan === 'Lainnya' ? 'wajib, min. 5 huruf' : 'opsional') + '</small></div><textarea class="pkaIn" id="pkaCat" placeholder="mis. dobel dengan tiket jam 08:10">' + esc(M.catatan || '') + '</textarea>'
      + '<button type="button" class="pkaTombol mrh" data-p="batalYa">❌ BATALKAN TIKET ' + esc(t.lb) + '</button><div class="pkaMsg"></div>';
  }
  function htmlRevisi(t) {
    return kepalaModal('✏️ Revisi', t) + '<div class="sb">Betulkan salah ketik pekerjaan / nama mekanik. Jam selesai, foto & tanda tangan tidak berubah.</div>'
      + '<div class="pkaLbl">Keterangan perbaikan</div><textarea class="pkaIn" id="pkaRevKs" style="min-height:96px">' + esc(String(t.ks || '').replace(/\s*·\s*direvisi\s+[^·]*$/, '')) + '</textarea>'
      + '<div class="pkaLbl">Yang mengerjakan <small>pisahkan dengan koma</small></div><input class="pkaIn" id="pkaRevMek" value="' + esc(t.mek || '') + '">'
      + '<button type="button" class="pkaTombol" data-p="revisiYa">✏️ Simpan revisi</button><div class="pkaMsg"></div>';
  }
  function htmlKwitansi() {
    var h = '<h3>🧾 Kwitansi storing<button type="button" class="tutupX" data-p="tutupModal" aria-label="Tutup">✕</button></h3>';
    if (!KWS) return h + '<div class="pkaKosong"><span class="putar"></span> Memuat…</div>';
    if (!KWS.ok) return h + '<div class="pkaPita mrh">⚠️ ' + esc(KWS.pesan || 'Gagal memuat.') + '</div>';
    if (!KWS.ada) return h + '<div class="pkaPita">' + esc(KWS.pesan || 'Belum ada.') + '</div>';
    h += '<div class="sb">Tiket STORING selesai ' + esc(tglId(KWS.dari)) + ' s/d ' + esc(tglId(KWS.sampai)) + ' · <b>' + KWS.belum + ' belum punya kwitansi</b>. Buat & cetak kwitansi (dot matrix) tetap di halaman lama.</div>';
    h += '<button type="button" class="pkaTombol" data-p="lamaKws">🖨️ Buat / cetak kwitansi di halaman lama</button><div style="height:10px"></div>';
    h += (KWS.tiket || []).length ? KWS.tiket.map(function (x) {
      return '<div class="pkaKw"><span class="rp">' + (x.tarif == null ? '<span style="color:#dc2626">perlu koreksi</span>' : 'Rp ' + Number(x.tarif).toLocaleString('id-ID')) + '</span><b>' + esc(lbPendek(x.lb)) + '</b> · ' + esc(x.jamSelesai || '') + '<br>'
        + '🔧 ' + esc(x.tim || '-') + ' · ' + esc(x.kategori || 'kategori ?') + ' · ' + esc(x.lokasi || '') + '<br>'
        + (x.no ? '✅ ' + esc(x.no) : '<span style="color:#d97706;font-weight:800">⏳ belum ada kwitansi</span>') + (x.pek ? ' · ' + esc(String(x.pek).slice(0, 80)) : '') + '</div>';
    }).join('') : '<div class="pkaKosong">Tidak ada tiket storing selesai 14 hari terakhir.</div>';
    return h;
  }

  /* ---------- form SELESAIKAN: foto wajib (kamera), TTD driver & mekanik ---------- */
  function jamKiniLokal() { var d = new Date(), p = function (n) { return n < 10 ? '0' + n : '' + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function htmlSelesai(t) {
    var h = kepalaModal('✅ Selesaikan', t);
    if (t.jenis === 'STORING') h += str() && str().tahapB() ? str().kotakStoring(t) /* pk-app-setara-web-26nov */ : '<div class="pkaPita br">🆘 Tiket STORING: kategori pekerjaan storing (untuk tarif kwitansi) bisa dikoreksi nanti di panel kwitansi halaman lama.</div>';
    h += '<div class="pkaLbl">🧰 Pekerjaan yang dikerjakan <span class="w">wajib</span><small>ketuk atau tulis</small></div><div class="pkaChips">' + PEK_UMUM.map(function (p) { return '<button type="button" data-p="pek:' + esc(p) + '" class="' + (M.pek.indexOf(p) >= 0 ? 'on' : '') + '">' + esc(p) + '</button>'; }).join('') + '</div>'
      + '<textarea class="pkaIn" id="pkaPekLain" style="margin-top:8px" placeholder="detail perbaikan (mis. ganti kampas rem roda belakang kiri)">' + esc(M.pekLain || '') + '</textarea>';
    h += '<div class="pkaLbl">🔩 Sparepart dipakai <span class="w">wajib</span><small>boleh "Tidak ada"</small></div><div class="pkaChips" id="pkaSp">' + chipsSp() + '</div>'
      + '<div class="pkaDua" style="grid-template-columns:1fr auto;margin-top:8px"><input class="pkaIn" id="pkaSpLain" placeholder="sparepart lain (ketik)"><button type="button" class="pkaTombol abu" style="margin:0;padding:0 14px" data-p="spTambah">+ Tambah</button></div>';
    if (t.jenis === 'SERVICE') h += '<div class="pkaLbl">🛢 KM unit <span class="w">wajib (ganti oli)</span></div><input class="pkaIn" id="pkaKm" inputmode="numeric" value="' + esc(M.km || '') + '" placeholder="mis. 125400">';
    h += '<div class="pkaLbl">🕒 Jam selesai <small>ubah kalau selesainya lebih awal</small></div><input class="pkaIn" id="pkaJam" type="datetime-local" value="' + esc(M.jam || jamKiniLokal()) + '">';
    h += '<div class="pkaLbl">📷 Foto hasil pekerjaan <span class="w">wajib</span><small>foto unit sesudah dikerjakan</small></div>'
      + '<div class="pkaFoto"><button type="button" class="utama" data-p="foto:kamera">📷 Foto kamera</button><button type="button" data-p="foto:galeri">🖼️ Dari galeri</button></div>'
      + '<input type="file" id="pkaFileKam" accept="image/*" capture="environment" hidden><input type="file" id="pkaFileGal" accept="image/*" hidden>'
      + '<img class="pkaPrev' + (M.foto ? ' ada' : '') + '" id="pkaPrev" alt=""' + (M.foto ? ' src="' + M.foto + '"' : '') + '><div class="pkaFotoSt' + (M.foto ? ' ok' : '') + '" id="pkaFotoSt">' + (M.foto ? '✅ Foto siap — ketuk Foto kamera untuk ganti' : 'Belum ada foto') + '</div>';
    h += '<div class="pkaLbl">✍️ Tanda tangan driver <span class="w">wajib</span></div><div class="pkaTtd"><canvas id="pkaTtdD"></canvas><button type="button" class="hp" data-p="ttdHapus:D">Hapus</button><span class="ph">tanda tangan di sini</span></div>'
      + '<div class="pkaLbl">✍️ Tanda tangan mekanik <span class="w">wajib</span></div><div class="pkaTtd"><canvas id="pkaTtdM"></canvas><button type="button" class="hp" data-p="ttdHapus:M">Hapus</button><span class="ph">tanda tangan di sini</span></div>';
    return h + '<button type="button" class="pkaTombol hj" data-p="selesaiYa">✅ SIMPAN SELESAI</button><div class="pkaMsg"></div>';
  }
  function chipsSp() {
    return SP_UMUM.map(function (p) { return '<button type="button" data-p="sp:' + esc(p) + '" class="' + (M.sp.indexOf(p) >= 0 ? 'on' : '') + '">' + esc(p) + '</button>'; }).join('')
      + M.sp.filter(function (x) { return SP_UMUM.indexOf(x) < 0; }).map(function (p) { return '<button type="button" data-p="sp:' + esc(p) + '" class="on">' + esc(p) + ' ✕</button>'; }).join('');
  }
  var TTD = {};
  function pasangSelesai(w) {
    ['D', 'M'].forEach(function (k) {
      var cv = w.querySelector('#pkaTtd' + k); if (!cv) return;
      var p = TTD[k] = { cv: cv, isi: false };
      var ukur = function () { var dpr = Math.min(2, window.devicePixelRatio || 1), wd = cv.clientWidth || 300, hg = cv.clientHeight || 130; cv.width = Math.round(wd * dpr); cv.height = Math.round(hg * dpr); var c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#fff'; c.fillRect(0, 0, cv.width, cv.height); c.scale(dpr, dpr); c.lineWidth = 2.4; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#111'; p.isi = false; };
      p.ukur = ukur; setTimeout(ukur, 0);
      var gambar = false, xy = function (e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.addEventListener('pointerdown', function (e) { e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { /* */ } gambar = true; var c = cv.getContext('2d'), a = xy(e); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(a[0] + 0.1, a[1] + 0.1); c.stroke(); p.isi = true; var ph = cv.parentNode.querySelector('.ph'); if (ph) ph.style.display = 'none'; });
      cv.addEventListener('pointermove', function (e) { if (!gambar) return; e.preventDefault(); var c = cv.getContext('2d'), a = xy(e); c.lineTo(a[0], a[1]); c.stroke(); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { cv.addEventListener(n, function () { gambar = false; }); });
    });
    ['pkaFileKam', 'pkaFileGal'].forEach(function (id) { var inp = w.querySelector('#' + id); if (inp) inp.addEventListener('change', function () { bacaFoto(inp); }); });
  }
  function ttdData(k) { var p = TTD[k]; return p && p.isi ? p.cv.toDataURL('image/png') : ''; }
  function bacaFoto(inp) {
    var f = inp.files && inp.files[0]; if (!f || !M) return;
    var st = el.querySelector('#pkaFotoSt'); if (st) { st.className = 'pkaFotoSt'; st.textContent = 'Memproses foto…'; }
    var rd = new FileReader();
    rd.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var sk = Math.min(1, 1280 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
        cv.width = Math.round(img.width * sk); cv.height = Math.round(img.height * sk);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        if (!M) return;
        M.foto = cv.toDataURL('image/jpeg', 0.7);
        var pv = el.querySelector('#pkaPrev'); if (pv) { pv.src = M.foto; pv.classList.add('ada'); }
        if (st) { st.className = 'pkaFotoSt ok'; st.textContent = '✅ Foto siap — ketuk Foto kamera untuk ganti'; }
        inp.value = '';
      };
      img.onerror = function () { if (st) { st.className = 'pkaFotoSt err'; st.textContent = '⚠️ Foto gagal dibaca — coba lagi'; } };
      img.src = e.target.result;
    };
    rd.readAsDataURL(f);
  }
  function teksPekerjaan() {
    var lain = String((el.querySelector('#pkaPekLain') || {}).value || '').replace(/\s+/g, ' ').trim();
    return M.pek.concat(lain ? [lain] : []).join('; ');
  }

  /* ---------- kirim ---------- */
  function kunci(on) { var w = el && el.querySelector('.pkaModal'); if (w) Array.prototype.slice.call(w.querySelectorAll('button')).forEach(function (b) { if (!b.classList.contains('tutupX')) b.disabled = on; }); }
  function kirim(aksi, data, sukses) {
    kunci(true); msg('Menyimpan…');
    return panggil(aksi, data, aksi === 'selesai' ? 90000 : 45000).then(function (h) {
      if (!h || !h.ok) {
        kunci(false); msg((h && h.pesan) || 'Gagal menyimpan.', 'err');
        if (h && h.login === false && CTX && CTX.sesiHabis) { tutup(); CTX.sesiHabis(); }
        if (h && h.hilang) muat(true);
        return;
      }
      try { if (window.WHL_RASA) { window.WHL_RASA.bunyi && window.WHL_RASA.bunyi('sukses'); window.WHL_RASA.getar && window.WHL_RASA.getar('sukses'); } } catch (e) { /* */ }
      if (sukses) sukses(h); else { roti('✅ ' + (h.pesan || 'Tersimpan.')); tutupModal(); muat(true); }
    }, function (e) { kunci(false); msg(((e && e.message) || 'Tidak ada sinyal.') + ' — belum tersimpan, coba lagi.', 'err'); });
  }
  function kirimTunjuk(lanjut) {
    var mk = namaTerpilih(); if (!mk) { msg(M.pilih.length ? 'Isi nama bengkel luarnya.' : 'Ketuk dulu nama mekaniknya (atau bengkel luar).', 'err'); return; }
    var t = M.t;
    kirim('tunjuk', { armada: t.ar, id: t.id, mekanik: mk }, function (h) {
      roti('✅ ' + h.pesan);
      var t2 = Object.assign({}, t, { g: 'dikerjakan', mek: h.yangMengerjakan || mk });
      if (lanjut === 'selesai') { bukaSelesai(t2); muat(true); }
      else if (lanjut === 'pending') { bukaModal('pending', t2, { alasan: '', catatan: '', ganti: false, pilih: [] }); muat(true); }
      else { tutupModal(); TAB = 'dikerjakan'; muat(true); }
    });
  }
  function bukaSelesai(t) { TTD = {}; bukaModal('selesai', t, { pek: [], pekLain: '', sp: [], km: '', jam: '', foto: '' }); }
  function kirimSelesai() {
    var t = M.t, pek = teksPekerjaan(), km = String((el.querySelector('#pkaKm') || {}).value || '').trim(), jam = String((el.querySelector('#pkaJam') || {}).value || '').trim();
    var dD = ttdData('D'), dM = ttdData('M');
    var salah = !pek ? 'Isi pekerjaan yang dikerjakan (ketuk atau tulis).' : !M.sp.length ? 'Pilih sparepart yang dipakai (atau "Tidak ada").' : (t.jenis === 'SERVICE' && !km) ? 'KM wajib untuk ganti oli.'
      : !M.foto ? '📷 Foto hasil pekerjaan wajib — ketuk "Foto kamera".' : !dD ? 'Tanda tangan DRIVER wajib.' : !dM ? 'Tanda tangan MEKANIK wajib.' : '';
    if (salah) { msg(salah, 'err'); if (!M.foto) { var f = el.querySelector('#pkaFotoSt'); if (f) { f.className = 'pkaFotoSt err'; f.scrollIntoView({ block: 'center', behavior: 'smooth' }); } } return; }
    kirim('selesai', { armada: t.ar, id: t.id, pekerjaan: pek, sparepart: M.sp.slice(), km: km, jamSelesai: jam, foto: M.foto, ttdDriver: dD, ttdMekanik: dM }, str() && str().tahapB() ? function (h) { str().sesudahSelesai(t, h, M); } : null); /* pk-app-setara-web-26nov: pekerjaan storing disimpan sesudah tiket selesai */
  }
  function kirimPending() {
    var t = M.t, cat = String((el.querySelector('#pkaCat') || {}).value || '').trim();
    if (M.ganti) {
      var mk = namaTerpilih(); if (!mk) { msg('Pilih minimal 1 mekanik (atau isi bengkel luar).', 'err'); return; }
      kirim('pending', { armada: t.ar, id: t.id, alasan: 'Ganti mekanik', catatan: cat, mekanik: mk }); return;
    }
    if (!M.alasan) { msg('Pilih alasan pending.', 'err'); return; }
    if (M.alasan === 'Lainnya' && cat.length < 3) { msg('Tulis alasan pending-nya.', 'err'); return; }
    kirim('pending', { armada: t.ar, id: t.id, alasan: M.alasan, catatan: cat });
  }
  function kirimBatal() {
    var t = M.t, cat = String((el.querySelector('#pkaCat') || {}).value || '').trim();
    if (!M.alasan) { msg('Pilih alasan batal.', 'err'); return; }
    if (M.alasan === 'Lainnya' && cat.length < 5) { msg('Tulis alasannya (min. 5 huruf).', 'err'); return; }
    kirim('batal', { armada: t.ar, id: t.id, alasan: M.alasan, catatan: cat });
  }
  function kirimRevisi() {
    var t = M.t, ks = String((el.querySelector('#pkaRevKs') || {}).value || '').trim(), mk = String((el.querySelector('#pkaRevMek') || {}).value || '').trim();
    if (!ks) { msg('Keterangan perbaikan tidak boleh kosong.', 'err'); return; }
    if (!mk) { msg('Yang mengerjakan tidak boleh kosong.', 'err'); return; }
    kirim('revisi', { armada: t.ar, id: t.id, keteranganSelesai: ks, mekanik: mk });
  }
  function muatBengkel() {
    if (BENGKEL) return;
    BENGKEL = [];
    panggil('pilihan', {}, 30000).then(function (h) { if (h && h.ok) { BENGKEL = h.bengkel || []; var w = el && el.querySelector('#pkaBkW'); if (w && M) w.innerHTML = htmlBengkel(); } }, function () { BENGKEL = null; });
  }
  function bukaKwitansi() {
    KWS = null; bukaModal('kwitansi', null);
    panggil('kwitansi', {}, 45000).then(function (h) { KWS = h || { ok: false }; if (M && M.jenis === 'kwitansi') gambarModal(); }, function (e) { KWS = { ok: false, pesan: (e && e.message) || 'Tidak ada sinyal.' }; if (M && M.jenis === 'kwitansi') gambarModal(); });
  }

  /* ---------- ketukan ---------- */
  function ubah(ev) {
    var x = ev.target; if (str() && str().ubah(ev)) return; /* pk-app-setara-web-26nov */ if (ban() && ban().ubah(ev)) return; if (!M) return; /* poskontrol-ganti-ban-25nov */
    if (x.id === 'pkaBk' && ev.type === 'change') { M.bk = x.value; var w = el.querySelector('#pkaBkW'); if (w) { w.innerHTML = htmlBengkel(); var i = el.querySelector('#pkaBkTulis'); if (i) i.focus(); } }
    if (x.id === 'pkaBkTulis') M.bkTulis = x.value;
  }
  function klik(ev) {
    var b = ev.target.closest('[data-p]'); if (!b || !el || !el.contains(b)) return;
    if (b.disabled) return;
    var d = b.getAttribute('data-p'), i = d.indexOf(':'), n = i < 0 ? d : d.slice(0, i), v = i < 0 ? '' : d.slice(i + 1);
    if (n === 'latar') { if (ev.target === b) tutupModal(); return; }
    if (n === 'kembali') { kembali(); return; }
    if (n === 'tutupModal') { tutupModal(); return; }
    if (n === 'segar') { muat(); return; }
    if (n === 'tab') { TAB = v; lapis(); return; }
    if (str() && str().klik(n, v, b, ev)) return; /* pk-app-setara-web-26nov */
    if (n === 'lama') { bukaLama(); return; }
    if (n === 'lamaKws') { if (CTX && CTX.bukaWeb) CTX.bukaWeb(K.DASH + '?mode=maintenance&buka=kws'); return; } /* pk-app-setara-web-26nov: langsung panel Kwitansi storing (Bugi #3) */
    if (n === 'kwitansi') { bukaKwitansi(); return; }
    if (ban() && ban().klik(n, v, b, ev)) return; /* poskontrol-ganti-ban-25nov */
    var bi = ev.target.closest('.pkaK button[data-p]');
    if (n === 'det') { if (bi && bi !== b) return; var td = cariT(v); if (td) bukaModal('detail', td); return; }
    if (bi || /^(tunjuk|selesai|pending|ganti|batal|revisi|cetak|lamaT|lanjut|lanjutYa)$/.test(n) && v) {
      var t = cariT(v);
      if (!t && /^(tunjuk|selesai|pending|ganti|batal|revisi|cetak|lamaT|lanjut|lanjutYa)$/.test(n)) { roti('Tiket sudah berubah. Papan dimuat ulang.'); muat(true); return; }
      if (n === 'tunjuk') { bukaModal('tunjuk', t, { pilih: [], bk: '', bkTulis: '' }); return; }
      if (n === 'selesai') { bukaSelesai(t); return; }
      if (n === 'pending') { bukaModal('pending', t, { alasan: '', catatan: '', ganti: false, pilih: [] }); return; }
      if (n === 'ganti') { var awal = String(t.mek || '').split(/\s*,\s*/).filter(String); var dikenal = ((D && D.mekanik) || []).concat((D && D.tyreman) || []).map(function (x) { return x.nama; }); /* pk-4-jenis-petugas-26nov */ var luar = awal.filter(function (x) { return dikenal.indexOf(x) < 0; }); bukaModal('pending', t, { alasan: 'Ganti mekanik', catatan: '', ganti: true, pilih: awal.filter(function (x) { return dikenal.indexOf(x) >= 0; }).concat(luar.length ? ['__luar'] : []), bk: luar.length ? '__lain' : '', bkTulis: luar.join(', ').replace(/^Bengkel\s+/i, '') }); if (luar.length) muatBengkel(); return; }
      if (n === 'batal') { bukaModal('batal', t, { alasan: '', catatan: '' }); return; }
      if (n === 'revisi') { bukaModal('revisi', t); return; }
      if (n === 'cetak' || n === 'lamaT') { bukaLama(t.ar, t.id); return; }
      if (n === 'lanjut') { bukaModal('detail', t); return; }
      if (n === 'lanjutYa') { M = M || { jenis: 'detail', t: t }; duaKali(b, function () { kirim('lanjut', { armada: t.ar, id: t.id }); }); return; }
    }
    if (!M) return;
    if (n === 'mek') {
      var k = M.pilih.indexOf(v); if (k >= 0) M.pilih.splice(k, 1); else M.pilih.push(v);
      b.classList.toggle('on', M.pilih.indexOf(v) >= 0);
      var w = el.querySelector('#pkaBkW'); if (w) w.innerHTML = htmlBengkel();
      if (v === '__luar' && M.pilih.indexOf('__luar') >= 0) muatBengkel();
      var mi = el.querySelector('#pkaMekInfo'); if (mi) mi.textContent = M.pilih.length > 1 ? '👷 ' + M.pilih.length + ' mekanik dipilih — 1 tiket; siapa pun yang SELESAI, tiket selesai untuk semua.' : '';
      lepasSiap(); return;
    }
    if (n === 'al') { M.catatan = String((el.querySelector('#pkaCat') || {}).value || ''); M.alasan = M.alasan === v ? '' : v; gambarModal(); return; }
    if (n === 'pek') { var j = M.pek.indexOf(v); if (j >= 0) M.pek.splice(j, 1); else M.pek.push(v); b.classList.toggle('on', j < 0); return; }
    if (n === 'sp') {
      var q = M.sp.indexOf(v);
      if (v === 'Tidak ada') M.sp = q >= 0 ? [] : ['Tidak ada'];
      else { M.sp = M.sp.filter(function (x) { return x !== 'Tidak ada'; }); q = M.sp.indexOf(v); if (q >= 0) M.sp.splice(q, 1); else M.sp.push(v); }
      var sp = el.querySelector('#pkaSp'); if (sp) sp.innerHTML = chipsSp(); return;
    }
    if (n === 'spTambah') { var inp = el.querySelector('#pkaSpLain'), tx = String(inp && inp.value || '').replace(/[;|]/g, ' ').replace(/\s+/g, ' ').trim(); if (!tx) { if (inp) inp.focus(); return; } M.sp = M.sp.filter(function (x) { return x !== 'Tidak ada'; }); if (M.sp.indexOf(tx) < 0) M.sp.push(tx.slice(0, 60)); inp.value = ''; var sp2 = el.querySelector('#pkaSp'); if (sp2) sp2.innerHTML = chipsSp(); return; }
    if (n === 'foto') { var fi = el.querySelector(v === 'kamera' ? '#pkaFileKam' : '#pkaFileGal'); if (fi) fi.click(); return; }
    if (n === 'ttdHapus') { var p = TTD[v]; if (p && p.ukur) { p.ukur(); var ph = p.cv.parentNode.querySelector('.ph'); if (ph) ph.style.display = ''; } return; }
    if (n === 'tunjukYa') { duaKali(b, function () { kirimTunjuk(''); }); return; }
    if (n === 'tunjukLanjut') { duaKali(b, function () { kirimTunjuk(v); }); return; }
    if (n === 'selesaiYa') { M.pekLain = String((el.querySelector('#pkaPekLain') || {}).value || ''); duaKali(b, kirimSelesai); return; }
    if (n === 'pendingYa') { duaKali(b, kirimPending); return; }
    if (n === 'batalYa') { duaKali(b, kirimBatal); return; }
    if (n === 'revisiYa') { duaKali(b, kirimRevisi); return; }
  }
  function lepasSiap() { if (!el) return; Array.prototype.slice.call(el.querySelectorAll('.pkaSiap')).forEach(function (b) { b.removeAttribute('data-siap'); b.classList.remove('pkaSiap'); if (b.getAttribute('data-asli')) b.textContent = b.getAttribute('data-asli'); }); }

  /** Keluar / ganti akun: buang semua data dari memori. */
  function lupakan() { if (STR && STR.lupakan) STR.lupakan(); /* pk-app-setara-web-26nov */ if (BAN && BAN.lupakan) BAN.lupakan(); urut++; berhentiPoll(); D = null; M = null; TAB = ''; galat = ''; BENGKEL = null; KWS = null; TTD = {}; if (el) { try { el.remove(); } catch (e) { /* */ } el = null; } }

  /* poskontrol-ganti-ban-25nov: jembatan ke poskontrol-ban.js (tiket GANTI BAN). Tanpa berkas itu = layar seperti sebelumnya. */
  var BAN = null;
  function ban() {
    if (!BAN && window.WHL_PK_BAN && window.WHL_PK_BAN.pasang) {
      BAN = window.WHL_PK_BAN;
      BAN.pasang({ esc: esc, panggil: panggil, roti: roti, umur: umur, lbPendek: lbPendek, saya: saya, data: function () { return D; }, modal: function () { return M; }, el: function () { return el; },
        bukaModal: bukaModal, tutupModal: tutupModal, gambarModal: gambarModal, msg: msg, kunci: kunci, muat: muat, duaKali: duaKali, lepasSiap: lepasSiap, kepalaModal: kepalaModal, baris: baris,
        cariT: cariT, jamKiniLokal: jamKiniLokal, chipsJenis: chipsJenis /* pk-4-jenis-petugas-26nov */, setTab: function (x) { TAB = x; }, gambarPapan: function () { lapis(); } });
    }
    return BAN;
  }
  /* pk-app-setara-web-26nov: jembatan ke poskontrol-setara.js (fitur setara web). Tanpa berkas itu / saklar server pksSaklar('MATI') = layar seperti sebelumnya. */
  var STR = null;
  function str() {
    if (!STR && window.WHL_PK_SETARA && window.WHL_PK_SETARA.pasang) {
      STR = window.WHL_PK_SETARA;
      STR.pasang({ esc: esc, panggil: panggil, roti: roti, umur: umur, lbPendek: lbPendek, saya: saya, data: function () { return D; }, modal: function () { return M; }, el: function () { return el; }, ctx: function () { return CTX; },
        bukaModal: bukaModal, tutupModal: tutupModal, gambarModal: gambarModal, msg: msg, kunci: kunci, kirim: kirim, muat: muat, duaKali: duaKali, lepasSiap: lepasSiap, kepalaModal: kepalaModal, baris: baris, cariT: cariT,
        jamKiniLokal: jamKiniLokal, chipsJenis: chipsJenis, chipsMekanik: chipsMekanik, htmlBengkel: htmlBengkel, namaTerpilih: namaTerpilih, bukaSelesai: bukaSelesai, bukaLama: bukaLama, ban: ban,
        setTab: function (x) { TAB = x; }, gambarPapan: function () { lapis(); } });
    }
    return STR;
  }
  window.WHL_PK = { boleh: boleh, buka: buka, kembali: kembali, lupakan: lupakan, urlLama: urlLama,
    _uji: { isi: function (d) { D = d; TAB = ''; }, papan: function () { return isiPapan(); }, kartu: kartu, kelompok: kelompokPetugas, tab: function (t) { TAB = t; }, modal: function () { return M; }, nama: function () { return M ? namaTerpilih() : ''; } } };
})();
