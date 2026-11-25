/* WHL App — 🗄️ DATABASE (app-pusat-database-25nov, Vanesa 25 Nov 2026; permintaan Pak Fanza "semua database jadi 1 di dalam app WHL").
 * Satu layar untuk semua spreadsheet WHL: daftar per kelompok, cari satu kotak di semua database, lihat isi tab (saring + halaman).
 * BACA SAJA: tidak ada tombol tulis. Layar ini cuma tampilan; SEMUA hak dicek ulang di server DASHBOARD PusatDatabaseApp.gs
 *   lewat api pusat: pusatDatabase [token, aksi, data]  (aksi: daftar · tab · isi · cari).
 * Siapa yang boleh = field user.pdb ('penuh' | 'lihat') dari server (PDB_AKSES, satu tempat di server). Driver tidak pernah.
 * Kolom pribadi disamarkan di SERVER untuk level "lihat" (app tidak pernah menerima nilai aslinya).
 * Data cuma di memori selama layar terbuka; dibuang lewat lupakan() saat Keluar / ganti akun. Tanpa alert/confirm/prompt.
 */
(function () {
  'use strict';
  var API = window.WHL_API;
  var CTX = null, lapisEl = null, layar = 'utama', D = null, galat = '', memuat = false, urutan = 0, urutanCari = 0;
  var Q = '', H = null, DB = null, T = null, MODAL = null, MODE = '', BUKA = {};

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { return CTX && CTX.sesi(); }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function angka(n) { n = Number(n) || 0; try { return n.toLocaleString('id-ID'); } catch (e) { return String(n); } }
  function panggil(aksi, data, ms) { var S = sesi(); return API.Pusat.panggil('pusatDatabase', [S && S.tokenPusat, aksi, data || {}], ms || 45000); }
  function rapat(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function sempit() { return (window.innerWidth || 400) < 700; }

  /* ---------- hak (tampilan saja; server tetap menolak orang lain) ---------- */
  function level(S) { S = S || sesi(); var u = S && S.user; return u && u.peran !== 'driver' && (u.pdb === 'penuh' || u.pdb === 'lihat') ? u.pdb : ''; }
  function boleh(S) { var X = API && API.Pusat; return !!(level(S) && X && X.punya && X.punya('pusatDatabase')); }

  /* ---------- ikon menu (ilus3d.js belum punya bentuk database) ---------- */
  (function () {
    var asli = window.WHL_ILUS; if (typeof asli !== 'function' || asli._pdb) return;
    var baru = function (n) {
      if (n !== 'database') return asli.apply(this, arguments);
      return '<svg class="ilus ilus3d" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="59" rx="19" ry="3.2" fill="#0B2F6B" opacity=".16"/>'
        + '<path d="M12 14v36c0 5 9 8 20 8s20-3 20-8V14z" fill="#1E88E5"/><ellipse cx="32" cy="14" rx="20" ry="8" fill="#64B5F6"/>'
        + '<path d="M12 26c0 5 9 8 20 8s20-3 20-8M12 38c0 5 9 8 20 8s20-3 20-8" fill="none" stroke="#0D47A1" stroke-width="2.4" opacity=".55"/>'
        + '<circle cx="46" cy="44" r="11" fill="#FBBF24"/><circle cx="44.5" cy="42.5" r="4.6" fill="none" stroke="#3b2a00" stroke-width="2.6"/><path d="M48 46l4 4" stroke="#3b2a00" stroke-width="2.8" stroke-linecap="round"/></svg>';
    };
    baru._pdb = true; window.WHL_ILUS = baru;
  })();

  /* ---------- gaya (ikut variabel tema app) ---------- */
  function pasangGaya() {
    if (document.getElementById('pdbGaya')) return;
    var st = document.createElement('style'); st.id = 'pdbGaya';
    st.textContent = [
      '.pdbLapis .ksnKp .sp{flex:1}.pdbLapis .ksnKp .kb.segar.putar{animation:pdbPutar 1s linear infinite}@keyframes pdbPutar{to{transform:rotate(360deg)}}',
      '.pdbLapis.pdbLebar .ksnIsi{max-width:1100px}',
      '.pdbLv{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--redup);margin:0 2px 10px;line-height:1.4}.pdbLv b{color:var(--teks)}',
      '.pdbCari{display:flex;gap:8px;margin-bottom:10px}.pdbCari input{flex:1;min-width:0;box-sizing:border-box;font-size:16px;min-height:48px;padding:11px 14px;border-radius:14px}',
      '.pdbCari button{flex:none;min-width:72px;min-height:48px;border-radius:14px;font-size:15px;font-weight:800;background:var(--utama);color:#fff;border:0}',
      '.pdbKet{font-size:12.5px;color:var(--redup);margin:0 2px 10px;line-height:1.45}',
      '.pdbGrup{background:var(--panel);border:1px solid var(--garis);border-radius:16px;margin-bottom:8px;box-shadow:var(--bayang);overflow:hidden}',
      '.pdbGrup>button{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:12px 14px;min-height:56px;color:var(--teks);background:none;border:0}',
      '.pdbGrup>button .ik{font-size:22px;width:30px;text-align:center;flex:none}.pdbGrup>button .nm{flex:1;font-size:15px;font-weight:900;min-width:0}.pdbGrup>button .jm{font-size:12px;font-weight:800;color:var(--redup);white-space:nowrap}',
      '.pdbGrup>button .pn{font-size:18px;color:var(--redup);transition:transform .2s}.pdbGrup.buka>button .pn{transform:rotate(90deg)}',
      '.pdbLapis .pdbDb,.pdbLapis .pdbBrs{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:0}',
      '.pdbDb{width:100%;text-align:left;border:0;border-top:1px solid var(--garis);background:none;color:var(--teks);padding:11px 14px;min-height:58px}',
      '.pdbDb b{display:block;font-size:14.5px;line-height:1.3}.pdbDb small{display:block;font-size:12px;color:var(--redup);margin-top:2px;line-height:1.4}',
      '.pdbChips{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}.pdbC{font-size:11px;font-weight:800;padding:3px 8px;border-radius:999px;background:var(--panel2);color:var(--redup);white-space:nowrap}',
      '.pdbC.ok{background:rgba(31,174,105,.15);color:var(--tHijau,#1fae69)}.pdbC.kng{background:#f59e0b;color:#1a1a1a}.pdbC.mrh{background:rgba(220,76,76,.14);color:#dc4c4c}.pdbC.br{background:rgba(21,101,192,.14);color:var(--utama)}',
      '.pdbKosong{text-align:center;color:var(--redup);padding:28px 12px;font-size:14px;line-height:1.5}',
      '.pdbInfo{font-size:12.5px;line-height:1.5;border-radius:14px;padding:10px 12px;margin-bottom:10px;background:rgba(21,101,192,.09);border:1px solid rgba(21,101,192,.25)}.pdbInfo.kng{background:rgba(245,158,11,.11);border-color:rgba(245,158,11,.4)}.pdbInfo.mrh{background:rgba(220,76,76,.09);border-color:rgba(220,76,76,.35)}',
      '.pdbStat{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;margin:2px 2px 10px}.pdbStat .sp{flex:1}.pdbStat button{font-size:13px;font-weight:800;color:var(--utama);background:none;border:0;min-height:40px;padding:0 6px}',
      '.pdbPutarK{width:16px;height:16px;border-radius:50%;border:2.5px solid var(--garis);border-top-color:var(--utama);animation:pdbPutar .8s linear infinite;flex:none}',
      '.pdbBar{height:4px;border-radius:4px;background:var(--panel2);overflow:hidden;margin:0 2px 10px}.pdbBar i{display:block;height:100%;background:var(--utama);transition:width .3s}',
      '.pdbHasil{background:var(--panel);border:1px solid var(--garis);border-radius:16px;padding:11px 13px;margin-bottom:8px;box-shadow:var(--bayang)}',
      '.pdbHasil .sb{font-size:11.5px;font-weight:800;color:var(--redup);text-transform:uppercase;letter-spacing:.4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pdbHasil h4{margin:3px 0 6px;font-size:16px;font-weight:900;line-height:1.25;word-break:break-word}',
      '.pdbF{display:flex;gap:10px;font-size:13px;padding:3px 0;line-height:1.4}.pdbF span{color:var(--redup);flex:0 0 38%;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pdbF b{flex:1;min-width:0;word-break:break-word;font-weight:700}',
      '.pdbAksi{display:flex;gap:8px;margin-top:8px}.pdbAksi button{flex:1;min-height:44px;border-radius:12px;font-size:13.5px;font-weight:800;border:1px solid var(--garis);background:var(--panel2);color:var(--teks)}',
      'mark.pdbM{background:rgba(251,191,36,.45);color:inherit;border-radius:3px;padding:0 1px}',
      '.pdbKotak{background:var(--panel);border:1px solid var(--garis);border-radius:16px;padding:12px 14px;margin-bottom:10px;box-shadow:var(--bayang)}.pdbKotak h1{font-size:18px;font-weight:900;margin:0 0 4px;line-height:1.25}.pdbKotak p{margin:0;font-size:13px;color:var(--redup);line-height:1.45}',
      '.pdbBtn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:48px;border-radius:14px;font-size:15px;font-weight:800;margin:0 0 10px;border:1px solid var(--garis);background:var(--panel);color:var(--teks)}.pdbBtn.utama{background:var(--utama);color:#fff;border-color:transparent}',
      '.pdbH2{font-size:12px;text-transform:uppercase;letter-spacing:1.3px;color:var(--redup);margin:14px 4px 8px;font-weight:700}',
      '.pdbTab{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:var(--panel);border:1px solid var(--garis);border-radius:14px;padding:11px 13px;margin-bottom:8px;color:var(--teks);min-height:56px;box-shadow:var(--bayang)}',
      '.pdbTab .tx{flex:1;min-width:0}.pdbTab b{display:block;font-size:14.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pdbTab small{display:block;font-size:12px;color:var(--redup);margin-top:2px}.pdbTab .pn{color:var(--redup);font-size:18px}',
      '.pdbAlat{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.pdbSeg{display:flex;gap:3px;background:var(--panel2);border-radius:999px;padding:3px;flex:1;min-width:150px}',
      '.pdbSeg button{flex:1;font-size:12.5px;font-weight:800;padding:7px 6px;border-radius:999px;color:var(--redup);min-height:36px;background:none;border:0}.pdbSeg button.on{background:var(--panel);color:var(--teks);box-shadow:var(--bayang)}',
      '.pdbJml{font-size:12.5px;color:var(--redup);margin:0 2px 8px;line-height:1.4}',
      '.pdbBrs{display:block;width:100%;text-align:left;background:var(--panel);border:1px solid var(--garis);border-radius:14px;padding:10px 12px;margin-bottom:8px;color:var(--teks);box-shadow:var(--bayang)}',
      '.pdbBrs .no{font-size:11px;font-weight:800;color:var(--redup);margin-bottom:3px}',
      '.pdbTbl{overflow:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--garis);border-radius:14px;background:var(--panel);margin-bottom:10px;max-height:62vh}',
      '.pdbTbl table{border-collapse:separate;border-spacing:0;font-size:12.5px;min-width:100%}.pdbTbl th,.pdbTbl td{padding:8px 10px;border-bottom:1px solid var(--garis);text-align:left;white-space:nowrap;max-width:220px;overflow:hidden;text-overflow:ellipsis;vertical-align:top}',
      '.pdbTbl th{position:sticky;top:0;background:var(--panel2);font-weight:800;z-index:2}.pdbTbl td:first-child,.pdbTbl th:first-child{position:sticky;left:0;background:var(--panel);z-index:1;color:var(--redup);font-weight:800}.pdbTbl th:first-child{z-index:3;background:var(--panel2)}',
      '.pdbTbl tr{cursor:pointer}.pdbTbl tbody tr:active td{background:var(--panel2)}',
      '.pdbHal{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin:4px 0 12px}.pdbHal button{min-height:46px;border-radius:12px;font-size:14px;font-weight:800;border:1px solid var(--garis);background:var(--panel);color:var(--teks)}.pdbHal button[disabled]{opacity:.4}.pdbHal span{font-size:13px;font-weight:800;color:var(--redup);text-align:center;white-space:nowrap}',
      '.pdbS{color:var(--redup)}.pdbS::after{content:" 🔒";font-size:10px}',
      '.pdbModal{position:absolute;inset:0;z-index:5;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}.pdbModal .kt{background:var(--bg);width:100%;max-width:620px;border-radius:22px 22px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.3);max-height:86%;overflow-y:auto}',
      '.pdbModal h3{margin:0 0 2px;font-size:17px;font-weight:900}.pdbModal .sb{font-size:12px;color:var(--redup);font-weight:700;margin-bottom:10px}',
      '.pdbRow{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid var(--garis);font-size:13.5px}.pdbRow:first-of-type{border-top:0}.pdbRow span{color:var(--redup);flex:0 0 40%;word-break:break-word}.pdbRow b{text-align:right;word-break:break-word;flex:1;font-weight:700}',
      '.pdbModal .tb{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.pdbModal .tb button{min-height:50px;border-radius:14px;font-size:15px;font-weight:800;border:0}.pdbModal .tb .batal{background:var(--panel2);color:var(--teks)}.pdbModal .tb .ya{background:var(--utama);color:#fff}',
      '@media (min-width:1200px) and (hover:hover){.pdbModal{align-items:center}.pdbModal .kt{border-radius:22px}}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- lapis ---------- */
  function judul() {
    if (layar === 'db') return ['Database', DB && DB.db ? DB.db.n : 'Database'];
    if (layar === 'tab') return [T && T.dbn ? T.dbn : 'Database', T ? T.tab : ''];
    return [level() === 'penuh' ? 'Semua database WHL · baca saja' : 'Database WHL · baca saja', 'Database'];
  }
  function lapis() {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      pasangGaya();
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis pdbLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik); lapisEl.addEventListener('input', ketik); lapisEl.addEventListener('submit', kirimForm);
    }
    lapisEl.classList.toggle('pdbLebar', layar === 'tab');
    var gulir = lapisEl.querySelector('.ksnIsi'), y = gulir ? gulir.scrollTop : 0, J = judul();
    lapisEl.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-p="kembali" aria-label="Kembali">‹</button><div class="nm">' + esc(J[0]) + '<b>' + esc(J[1]) + '</b></div><span class="sp"></span>'
      + (layar === 'utama' && !H ? '<button type="button" class="kb segar' + (memuat ? ' putar' : '') + '" data-p="segar" aria-label="Muat ulang">⟳</button>' : '') + '</div>'
      + '<div class="ksnIsi">' + (layar === 'db' ? isiDb() : layar === 'tab' ? isiTab() : isiUtama()) + '</div>'
      + (MODAL ? htmlModal() : '');
    var g2 = lapisEl.querySelector('.ksnIsi'); if (g2) g2.scrollTop = y;
  }
  function keAtas() { var g = lapisEl && lapisEl.querySelector('.ksnIsi'); if (g) g.scrollTop = 0; }
  function tutup() { if (!lapisEl) return; var d = lapisEl; lapisEl = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); urutanCari++; H = null; DB = null; T = null; MODAL = null; if (CTX && CTX.perbarui) CTX.perbarui(); }
  function kembali() {
    if (!lapisEl) return false;
    if (MODAL) { MODAL = null; lapis(); return true; }
    if (layar === 'tab') { var dariCari = T && T.dariCari; T = null; layar = dariCari || !DB ? 'utama' : 'db'; lapis(); return true; }
    if (layar === 'db') { layar = 'utama'; DB = null; lapis(); return true; }
    if (H) { urutanCari++; H = null; lapis(); return true; }
    tutup(); return true;
  }

  /* ---------- buka & muat ---------- */
  function buka(ctx) {
    CTX = ctx || CTX;
    if (!boleh()) { roti('Menu Database khusus pimpinan yang ditunjuk.'); return; }
    layar = 'utama'; lapis(); if (!D) muat(false);
  }
  function muat() {
    var saya = ++urutan; memuat = true; galat = ''; if (lapisEl) lapis();
    return panggil('daftar', {}, 45000).then(function (h) {
      if (saya !== urutan) return; memuat = false;
      if (!h || !h.ok) { galat = (h && h.pesan) || 'Daftar database belum bisa dimuat.'; if (h && h.login === false && CTX && CTX.sesiHabis) CTX.sesiHabis(); }
      else D = h;
      if (lapisEl) lapis();
    }).catch(function (e) { if (saya !== urutan) return; memuat = false; galat = (e && e.message) || 'Sinyal putus. Coba lagi.'; if (lapisEl) lapis(); });
  }
  function cariDb(k) { return D && (D.db || []).filter(function (x) { return x.k === k; })[0] || null; }
  function bukaSheet(url) {
    if (!url) return; if (navigator.onLine === false) { roti('Tidak ada internet.'); return; }
    var ios = false; try { ios = !!(window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() === 'ios'); } catch (e) { /* */ }
    var w = null;
    if (!ios) { try { w = window.open(url, '_blank'); if (w) { try { w.opener = null; } catch (e2) { /* */ } } } catch (e) { w = null; } } /* APK: jendela baru -> app Google Sheets / Chrome dengan akun Google HP */
    if (!w && CTX && CTX.bukaWeb) CTX.bukaWeb(url);
  }

  /* ---------- UTAMA: cari + daftar per kelompok ---------- */
  function htmlLevel() {
    var lv = level();
    return '<div class="pdbLv">' + (lv === 'penuh' ? '🔓 <span><b>Akses penuh</b> · semua kolom tampil · tidak bisa mengubah data</span>' : '🔒 <span><b>Akses lihat</b> · kolom pribadi (NIK KTP, alamat, rekening, gaji, no HP) disamarkan</span>') + '</div>';
  }
  function chipSt(x) {
    if (x.st === 'belum') return '<span class="pdbC">Belum terhubung</span>';
    if (x.st === 'kunci') return '<span class="pdbC mrh">🔒 Khusus akses penuh</span>';
    if (x.st === 'file') return '<span class="pdbC kng">Excel · buka di Drive</span>';
    return (x.sens ? '<span class="pdbC mrh">Sensitif</span>' : '') + (x.cari ? '<span class="pdbC ok">Ikut dicari</span>' : '<span class="pdbC">Buka saja</span>');
  }
  function isiDaftar() {
    if (!D) return galat ? '<div class="pdbInfo mrh">' + esc(galat) + '</div><button type="button" class="pdbBtn utama" data-p="segar">Coba lagi</button>' : '<div class="pdbKosong">Memuat daftar database…</div>';
    var ok = (D.db || []).filter(function (x) { return x.st === 'ok'; }).length;
    return '<div class="pdbKet">' + (D.db || []).length + ' database · ' + ok + ' bisa dibuka di app. Ketuk kelompok untuk melihat isinya.</div>'
      + (D.grup || []).map(function (g) {
        var L = (D.db || []).filter(function (x) { return x.g === g.k; }); if (!L.length) return '';
        var b = !!BUKA[g.k];
        return '<div class="pdbGrup' + (b ? ' buka' : '') + '"><button type="button" data-p="grup:' + esc(g.k) + '" aria-expanded="' + b + '"><span class="ik">' + esc(g.ik) + '</span><span class="nm">' + esc(g.n) + '</span><span class="jm">' + L.length + '</span><span class="pn">›</span></button>'
          + (b ? L.map(function (x) { return '<button type="button" class="pdbDb" data-p="db:' + esc(x.k) + '"><b>' + esc(x.n) + '</b><small>' + esc(x.ket) + (x.pm ? ' · ' + esc(x.pm) : '') + '</small><span class="pdbChips">' + chipSt(x) + '</span></button>'; }).join('') : '') + '</div>';
      }).join('')
      + '<div class="pdbKet" style="margin-top:12px">Semua data dibaca langsung dari Google Sheet aslinya (baca saja). Menambah / mengubah data tetap lewat aplikasi masing-masing.</div>';
  }
  function isiUtama() {
    return htmlLevel()
      + '<form class="pdbCari" id="pdbForm" autocomplete="off"><input type="search" class="isian" id="pdbQ" placeholder="Lambung, nama, ID / NIK, no DO, tiket…" value="' + esc(Q) + '" enterkeyhint="search" aria-label="Cari di semua database"><button type="submit">Cari</button></form>'
      + (H ? '<div id="pdbHasil">' + htmlHasil() + '</div>' : '<div class="pdbKet">Contoh: <b>1127</b> · <b>WHL-01003</b> · nama driver · nomor DO / tiket. Dicari di semua database bertanda "Ikut dicari".</div>' + isiDaftar());
  }

  /* ---------- HASIL CARI ---------- */
  function hl(teks, q) {
    var t = String(teks == null ? '' : teks), tok = String(q || '').trim().split(/\s+/).filter(function (w) { return w.length >= 2; });
    if (!tok.length) return esc(t);
    var re = new RegExp('(' + tok.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'gi');
    return t.split(re).map(function (p, i) { return i % 2 ? '<mark class="pdbM">' + esc(p) + '</mark>' : esc(p); }).join(''); /* sorot di teks asli lalu escape: entity tidak rusak */
  }
  function htmlHasil() {
    var h = H, pr = h.target ? Math.min(100, Math.round(100 * h.dicari / h.target)) : 4;
    var dbAda = {}; h.list.forEach(function (x) { dbAda[x.db] = 1; });
    var st = h.selesai
      ? '<div class="pdbStat"><span>' + (h.list.length ? '<b>' + h.list.length + ' hasil</b> di ' + Object.keys(dbAda).length + ' database' : 'Tidak ada yang cocok') + ' untuk “' + esc(h.q) + '”</span><span class="sp"></span><button type="button" data-p="tutupHasil">Tutup</button></div>'
      : '<div class="pdbStat"><span class="pdbPutarK"></span><span>Mencari… ' + (h.target ? h.dicari + '/' + h.target + ' tab' : '') + ' · ' + h.list.length + ' hasil</span><span class="sp"></span><button type="button" data-p="batalCari">Berhenti</button></div><div class="pdbBar"><i style="width:' + pr + '%"></i></div>';
    return st + (h.galat ? '<div class="pdbInfo mrh">' + esc(h.galat) + '</div>' : '')
      + h.list.map(function (x, i) {
        return '<div class="pdbHasil"><div class="sb">' + esc(x.dbn) + ' · ' + esc(x.tab) + ' · baris ' + esc(x.r) + '</div><h4>' + hl(x.judul || '(tanpa judul)', h.q) + '</h4>'
          + (x.isi || []).map(function (f) { return '<div class="pdbF"><span>' + esc(f[0]) + '</span><b>' + hl(f[1], h.q) + '</b></div>'; }).join('')
          + '<div class="pdbAksi"><button type="button" data-p="hTab:' + i + '">📋 Lihat di tab</button><button type="button" data-p="hSheet:' + i + '">📄 Buka sheet</button></div></div>';
      }).join('')
      + (h.selesai && !h.list.length && !h.galat ? '<div class="pdbKosong">Coba kata lain (mis. angka lambung saja), atau buka database-nya lalu saring per tab.</div>' : '')
      + (h.penuh ? '<div class="pdbInfo kng">Hasil dibatasi ' + (h.maks || 60) + '. Ketik lebih lengkap supaya lebih tepat.</div>' : '')
      + (h.gagal.length ? '<div class="pdbInfo kng">Tidak bisa dibuka: ' + esc(h.gagal.join(', ')) + '</div>' : '')
      + (h.selesai ? '<div class="pdbKet">Dicari di ' + angka(h.baris || 3000) + ' baris terbaru tiap tab. Data lebih lama: buka database → tab → saring.</div>' : '');
  }
  function gambarHasil() { var el = lapisEl && lapisEl.querySelector('#pdbHasil'); if (el && H) el.innerHTML = htmlHasil(); else if (lapisEl) lapis(); }
  function cari(q) {
    q = String(q || '').trim(); Q = q;
    if (rapat(q).length < 3) { roti('Ketik minimal 3 huruf / angka.'); return; }
    var saya = ++urutanCari; H = { q: q, list: [], selesai: false, dicari: 0, target: 0, gagal: [], galat: '' }; layar = 'utama'; lapis(); keAtas();
    var inp = lapisEl && lapisEl.querySelector('#pdbQ'); if (inp) inp.blur();
    (function langkah(mulai, n) {
      panggil('cari', { q: q, mulai: mulai, sudah: H.list.length }, 60000).then(function (h) {
        if (saya !== urutanCari || !H) return;
        if (!h || !h.ok) { H.galat = (h && h.pesan) || 'Pencarian gagal.'; H.selesai = true; gambarHasil(); if (h && h.login === false && CTX && CTX.sesiHabis) CTX.sesiHabis(); return; }
        H.list = H.list.concat(h.hasil || []); H.gagal = H.gagal.concat(h.gagal || []); H.dicari = h.dicari; H.target = h.target; H.penuh = h.penuh; H.maks = h.maks; H.baris = h.baris;
        if (h.selesai || n >= 20 || h.lanjut < 0) H.selesai = true;
        gambarHasil();
        if (!H.selesai) langkah(h.lanjut, n + 1);
      }).catch(function (e) { if (saya !== urutanCari || !H) return; H.galat = ((e && e.message) || 'Sinyal putus.') + ' Hasil di bawah belum lengkap.'; H.selesai = true; gambarHasil(); });
    })(0, 1);
  }

  /* ---------- DB: daftar tab ---------- */
  function isiDb() {
    if (!DB || DB.memuat) return '<div class="pdbKosong">Memuat daftar tab…</div>';
    if (DB.galat) return '<div class="pdbInfo mrh">' + esc(DB.galat) + '</div>' + (DB.x && DB.x.url ? '<button type="button" class="pdbBtn" data-p="dbSheet">📄 Buka sheet asli</button>' : '');
    var d = DB.db, L = DB.tabs || [];
    return '<div class="pdbKotak"><h1>' + esc(d.n) + '</h1><p>' + esc(d.ket) + (d.pm ? ' · pemilik ' + esc(d.pm) : '') + '</p></div>'
      + '<button type="button" class="pdbBtn utama" data-p="dbSheet">📄 Buka sheet asli</button>'
      + '<div class="pdbH2">' + L.length + ' tab</div>'
      + (L.length ? L.map(function (t, i) { return '<button type="button" class="pdbTab" data-p="tab:' + i + '"><span class="tx"><b>' + esc(t.n) + '</b><small>' + angka(t.baris) + ' baris · ' + angka(t.kolom) + ' kolom</small></span><span class="pn">›</span></button>'; }).join('') : '<div class="pdbKosong">Tidak ada tab yang bisa dibuka.</div>');
  }
  function bukaDb(k) {
    var x = cariDb(k); if (!x) return;
    if (x.st === 'file') { bukaSheet(x.url); return; }
    if (x.st === 'kunci') { roti('Database ini khusus akses penuh.'); return; }
    if (x.st === 'belum') { roti('Database ini belum terhubung di server.'); return; }
    DB = { memuat: true, x: x }; layar = 'db'; lapis(); keAtas();
    panggil('tab', { k: k }, 45000).then(function (h) {
      if (!DB || DB.x !== x) return;
      if (!h || !h.ok) { DB = { galat: (h && h.pesan) || 'Tab belum bisa dimuat.', x: x }; if (h && h.login === false && CTX && CTX.sesiHabis) CTX.sesiHabis(); }
      else DB = { x: x, db: h.db, tabs: h.tabs || [] };
      if (lapisEl && layar === 'db') lapis();
    }).catch(function (e) { if (DB && DB.x === x) { DB = { galat: (e && e.message) || 'Sinyal putus.', x: x }; if (lapisEl) lapis(); } });
  }

  /* ---------- TAB: isi tabel (saring, halaman) ---------- */
  function bukaTab(k, tab, dbn, cari, dariCari) {
    T = { k: k, tab: tab, dbn: dbn, cari: cari || '', ketik: cari || '', hal: 0, lama: false, data: null, memuat: true, galat: '', dariCari: !!dariCari, urut: 0 };
    if (!MODE) MODE = sempit() ? 'kartu' : 'tabel';
    layar = 'tab'; lapis(); keAtas(); muatTab();
  }
  function muatTab() {
    if (!T) return; var t = T, saya = ++t.urut; t.memuat = true; t.galat = ''; if (lapisEl) lapis();
    panggil('isi', { k: t.k, tab: t.tab, hal: t.hal, cari: t.cari, lama: t.lama }, 60000).then(function (h) {
      if (T !== t || saya !== t.urut) return; t.memuat = false;
      if (!h || !h.ok) { t.galat = (h && h.pesan) || 'Isi tab belum bisa dimuat.'; if (h && h.login === false && CTX && CTX.sesiHabis) CTX.sesiHabis(); }
      else { t.data = h; t.hal = h.hal; }
      if (lapisEl && layar === 'tab') { lapis(); keAtas(); }
    }).catch(function (e) { if (T !== t) return; t.memuat = false; t.galat = (e && e.message) || 'Sinyal putus. Coba lagi.'; if (lapisEl) lapis(); });
  }
  function kolomTerisi(d) { var ada = d.kolom.map(function () { return false; }); d.baris.forEach(function (b) { b.v.forEach(function (s, i) { if (String(s || '').trim()) ada[i] = true; }); }); return ada; }
  function isiTab() {
    var t = T; if (!t) return '';
    var d = t.data;
    var alat = '<form class="pdbCari" id="pdbFormTab" autocomplete="off"><input type="search" class="isian" id="pdbQTab" placeholder="Saring di tab ini…" value="' + esc(t.ketik) + '" enterkeyhint="search" aria-label="Saring isi tab"><button type="submit">Saring</button></form>'
      + '<div class="pdbAlat"><div class="pdbSeg"><button type="button" data-p="urut:baru" class="' + (!t.lama ? 'on' : '') + '">Terbaru</button><button type="button" data-p="urut:lama" class="' + (t.lama ? 'on' : '') + '">Terlama</button></div>'
      + '<div class="pdbSeg"><button type="button" data-p="mode:kartu" class="' + (MODE === 'kartu' ? 'on' : '') + '">Kartu</button><button type="button" data-p="mode:tabel" class="' + (MODE === 'tabel' ? 'on' : '') + '">Tabel</button></div></div>';
    if (t.galat) return alat + '<div class="pdbInfo mrh">' + esc(t.galat) + '</div><button type="button" class="pdbBtn utama" data-p="ulangTab">Coba lagi</button>';
    if (!d) return alat + '<div class="pdbKosong">Memuat isi tab…</div>';
    var awal = d.total ? d.hal * d.per + 1 : 0, akhir = Math.min(d.total, (d.hal + 1) * d.per);
    var info = '<div class="pdbJml">' + (t.memuat ? 'Memuat… · ' : '') + (d.cari ? 'Cocok “' + esc(d.cari) + '”: ' : '') + (d.total ? 'baris ' + angka(awal) + '–' + angka(akhir) + ' dari ' + angka(d.total) : 'tidak ada baris') + (d.terpotong ? ' · saringan di ' + angka(5000) + ' baris terbaru' : '') + (d.kolomLebih ? ' · 40 kolom pertama' : '') + '</div>';
    var ada = kolomTerisi(d), isi;
    if (!d.baris.length) isi = '<div class="pdbKosong">' + (d.cari ? 'Tidak ada baris yang cocok.' : 'Tab ini kosong.') + '</div>';
    else if (MODE === 'tabel') {
      isi = '<div class="pdbTbl"><table><thead><tr><th>#</th>' + d.kolom.map(function (k, i) { return ada[i] ? '<th title="' + esc(k.n) + '">' + esc(k.n) + (k.s ? ' 🔒' : '') + '</th>' : ''; }).join('') + '</tr></thead><tbody>'
        + d.baris.map(function (b, j) { return '<tr data-p="baris:' + j + '"><td>' + esc(b.r) + '</td>' + b.v.map(function (s, i) { return ada[i] ? '<td' + (d.kolom[i].s ? ' class="pdbS"' : '') + '>' + (d.cari ? hl(s, d.cari) : esc(s)) + '</td>' : ''; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
    } else {
      isi = d.baris.map(function (b, j) {
        var f = [], n = 0;
        for (var i = 0; i < b.v.length && n < 5; i++) if (String(b.v[i] || '').trim()) { f.push('<div class="pdbF"><span>' + esc(d.kolom[i].n) + '</span><b' + (d.kolom[i].s ? ' class="pdbS"' : '') + '>' + (d.cari ? hl(b.v[i], d.cari) : esc(b.v[i])) + '</b></div>'); n++; }
        return '<button type="button" class="pdbBrs" data-p="baris:' + j + '"><div class="no">Baris ' + esc(b.r) + ' · ketuk untuk semua kolom</div>' + f.join('') + '</button>';
      }).join('');
    }
    var pager = d.jmlHal > 1 ? '<div class="pdbHal"><button type="button" data-p="hal:-1"' + (d.hal <= 0 || t.memuat ? ' disabled' : '') + '>‹ Sebelumnya</button><span>Hal ' + (d.hal + 1) + ' / ' + angka(d.jmlHal) + '</span><button type="button" data-p="hal:1"' + (d.hal >= d.jmlHal - 1 || t.memuat ? ' disabled' : '') + '>Berikutnya ›</button></div>' : '';
    return alat + info + isi + pager + '<button type="button" class="pdbBtn" data-p="tabSheet">📄 Buka tab ini di sheet</button>';
  }

  /* ---------- MODAL detail baris ---------- */
  function htmlModal() {
    var m = MODAL, d = T && T.data, b = d && d.baris[m.j]; if (!b) return '';
    return '<div class="pdbModal" data-p="latarModal"><div class="kt" role="dialog" aria-modal="true"><h3>Baris ' + esc(b.r) + '</h3><div class="sb">' + esc(T.dbn) + ' · ' + esc(T.tab) + '</div>'
      + d.kolom.map(function (k, i) { var s = String(b.v[i] || ''); return s.trim() ? '<div class="pdbRow"><span>' + esc(k.n) + '</span><b' + (k.s ? ' class="pdbS"' : '') + '>' + esc(s) + '</b></div>' : ''; }).join('')
      + '<div class="tb"><button type="button" class="batal" data-p="tutupModal">Tutup</button><button type="button" class="ya" data-p="barisSheet">📄 Buka di sheet</button></div></div></div>';
  }
  function urlBaris(r) { var d = T && T.data; return d && d.url ? d.url + '&range=A' + r : ''; }

  /* ---------- event ---------- */
  function kirimForm(ev) {
    ev.preventDefault();
    var f = ev.target;
    if (f.id === 'pdbForm') { var i = f.querySelector('#pdbQ'); cari(i ? i.value : Q); return; }
    if (f.id === 'pdbFormTab' && T) { var j = f.querySelector('#pdbQTab'); T.cari = String(j ? j.value : T.ketik).trim(); T.ketik = T.cari; T.hal = 0; if (j) j.blur(); muatTab(); }
  }
  function ketik(ev) { var t = ev.target; if (t.id === 'pdbQ') Q = t.value; else if (t.id === 'pdbQTab' && T) T.ketik = t.value; } /* nilai kolom tidak diubah saat mengetik (aman di keyboard HP) */
  function klik(ev) {
    var b = ev.target.closest('[data-p]'); if (!b || !lapisEl || !lapisEl.contains(b)) return;
    var d = b.getAttribute('data-p'), i = d.indexOf(':'), n = i < 0 ? d : d.slice(0, i), v = i < 0 ? '' : d.slice(i + 1);
    if (n === 'latarModal') { if (ev.target === b) { MODAL = null; lapis(); } return; }
    if (n === 'kembali') { kembali(); return; }
    if (n === 'segar') { muat(true); return; }
    if (n === 'grup') { BUKA[v] = !BUKA[v]; lapis(); return; }
    if (n === 'db') { bukaDb(v); return; }
    if (n === 'dbSheet') { bukaSheet((DB && DB.db && DB.db.url) || (DB && DB.x && DB.x.url)); return; }
    if (n === 'tab') { var tb = DB && DB.tabs && DB.tabs[Number(v)]; if (tb) bukaTab(DB.db.k, tb.n, DB.db.n, '', false); return; }
    if (n === 'tutupHasil' || n === 'batalCari') { urutanCari++; if (n === 'tutupHasil') H = null; else if (H) { H.selesai = true; H.galat = H.galat || 'Pencarian dihentikan. Hasil belum lengkap.'; } lapis(); return; }
    if (n === 'hTab') { var x = H && H.list[Number(v)]; if (x) bukaTab(x.db, x.tab, x.dbn, H.q, true); return; }
    if (n === 'hSheet') { var y = H && H.list[Number(v)]; if (y) bukaSheet(y.url); return; }
    if (n === 'urut' && T) { T.lama = v === 'lama'; T.hal = 0; muatTab(); return; }
    if (n === 'mode') { MODE = v === 'tabel' ? 'tabel' : 'kartu'; lapis(); return; }
    if (n === 'hal' && T && T.data && !T.memuat) { T.hal = Math.max(0, Math.min(T.data.jmlHal - 1, T.data.hal + Number(v))); muatTab(); return; }
    if (n === 'ulangTab') { muatTab(); return; }
    if (n === 'tabSheet') { bukaSheet(T && T.data && T.data.url); return; }
    if (n === 'baris') { MODAL = { j: Number(v) }; lapis(); return; }
    if (n === 'tutupModal') { MODAL = null; lapis(); return; }
    if (n === 'barisSheet') { var bb = T && T.data && T.data.baris[MODAL ? MODAL.j : -1]; if (bb) bukaSheet(urlBaris(bb.r)); return; }
  }
  /** Keluar / ganti akun: buang semua data dari memori. */
  function lupakan() { urutan++; urutanCari++; D = null; H = null; DB = null; T = null; MODAL = null; Q = ''; galat = ''; BUKA = {}; if (lapisEl) { try { lapisEl.remove(); } catch (e) { /* */ } lapisEl = null; } }

  window.WHL_PDB = { boleh: boleh, level: level, buka: buka, kembali: kembali, lupakan: lupakan,
    _uji: { hl: hl, isi: function (d) { D = d; }, html: function () { return isiUtama(); }, hasil: function (h) { H = h; return htmlHasil(); }, tab: function (t) { T = t; MODE = MODE || 'kartu'; return isiTab(); }, mode: function (m) { MODE = m; } } };
})();
