/* WHL App v3.39 — ASISTEN SAYA khusus Pak FANZA (WHL-01001) — asisten-fanza-19nov (Vanesa, 19 Nov 2026).
 *   Server DASHBOARD PusatAsistenFanza.gs: pusatAsistenFanza(token, req)
 *     req {aksi:'data'} -> {ok, hari, label, fanza, acc:[{jenis,id,nama,ringkas,sejak,menitTunggu,lama,halaman}], unit, tidakEfektif, briefing:{pagi,sore},
 *                           evaluasi:{mingguan,bulanan}, laporan:{harian,mingguan,mingguanAda,bulanan,bulananAda}, jadwal, vendorRiwayat, catatanSumber}
 *     req {aksi:'centang', tanggal, id, selesai} | {aksi:'vendor', vendor, catatan, foto:[dataUrl], cid} | {aksi:'vendorRiwayat'} | {aksi:'vendorFoto', foto}
 *   Tampil HANYA untuk akun Fanza dan HANYA kalau pusatPing memuat pusatAsistenFanza (server menolak akun lain juga).
 *   Kartu laporan direksi = laporan-direksi.js (WHL_LAPORAN_DIREKSI.buka(data.laporan.harian|mingguan|bulanan)).
 *   ACC dibuka lewat layar ACC yang SUDAH ADA (ctx.bukaNotif = bukaDariNotif app.js): kasbon_pimpinan / lembur / izin / poin.
 */
(function () {
  'use strict';
  var API = window.WHL_API, R = window.WHL_RASA || {};
  var MILIK = ['WHL01001']; /* Pak FANZA DWIYAN PRASETYA */
  var CTX = null, lapisEl = null, TAB = 'acc', SUB = { brf: 'pagi', eva: 'mingguan' }, DATA = null, DATA_T = 0, MUAT = null, GALAT = '', VENDOR = null, SIBUK = {};
  var SEGAR_MS = 180000, KUNCI = 'whlAsistenFanza1', TERBUKA = false;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sesi() { return CTX && CTX.sesi ? CTX.sesi() : null; }
  function roti(t) { if (CTX && CTX.roti) CTX.roti(t); }
  function getar() { try { if (R.getar) R.getar(); } catch (e) { /* */ } }
  function rapat(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function punya() { try { return API.Pusat.asli() && API.Pusat.punya('pusatAsistenFanza'); } catch (e) { return false; } }
  function milik(S) { S = S || sesi(); var u = S && S.user; if (!u || u.peran === 'driver') return false; return [S.idProfil, S.idKetik, u.nrp, u.id].some(function (x) { return x && MILIK.indexOf(rapat(x)) >= 0; }); }
  function boleh(S) { return milik(S) && punya(); }
  function panggil(req, ms) { var S = sesi(); return API.Pusat.panggil('pusatAsistenFanza', [S && S.tokenPusat, req], ms || 60000); }
  function angka(n) { return n == null || n === '' || !isFinite(Number(n)) ? '–' : Number(n).toLocaleString('id-ID'); }

  /* ---------- simpan di HP (tampil instan saat app dibuka) ---------- */
  function simpanLokal() { try { localStorage.setItem(KUNCI, JSON.stringify({ t: DATA_T, d: DATA })); } catch (e) { /* penuh / diblokir */ } }
  function ambilLokal() { try { var o = JSON.parse(localStorage.getItem(KUNCI) || 'null'); if (o && o.d && o.d.ok) { DATA = o.d; DATA_T = o.t || 0; } } catch (e) { /* */ } }

  function muat(paksa) {
    if (MUAT) return MUAT;
    if (!paksa && DATA && Date.now() - DATA_T < SEGAR_MS) return Promise.resolve(DATA);
    MUAT = panggil({ aksi: 'data' }).then(function (h) {
      MUAT = null;
      if (h && h.login === false) { if (CTX && CTX.sesiHabis) CTX.sesiHabis(); return null; }
      if (!h || h.ok === false) { GALAT = (h && h.pesan) || 'Asisten belum bisa dimuat.'; return DATA; }
      DATA = h; DATA_T = Date.now(); GALAT = ''; simpanLokal(); return DATA;
    }, function (e) { MUAT = null; GALAT = String((e && e.message) || e || 'Jaringan gagal').slice(0, 120); return DATA; })
      .then(function (d) { gambarUlang(); if (CTX && CTX.perbarui) CTX.perbarui(); return d; });
    return MUAT;
  }

  /* ---------- gaya ---------- */
  function gaya() {
    if (document.getElementById('afGaya')) return; var st = document.createElement('style'); st.id = 'afGaya';
    st.textContent = '.afKartu{cursor:pointer;position:relative;overflow:hidden}.afKartu .afAtas{display:flex;align-items:center;gap:10px}.afKartu .afIk{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#1565c0,#0b2f63);color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none}'
      + '.afKartu .afJd{flex:1;min-width:0}.afKartu .afJd b{display:block;font-size:15px}.afKartu .afJd small{display:block;color:var(--redup);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.afKartu .afPanah{color:var(--redup);font-size:20px}'
      + '.afStrip{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}.afStrip div{background:var(--panel2);border-radius:10px;padding:6px 4px;text-align:center}.afStrip small{display:block;font-size:10.5px;color:var(--redup);font-weight:700}.afStrip b{font-size:17px}'
      + '.afStrip .merah b{color:#dc2c2c}.afStrip .hijau b{color:#15a34a}.afStrip .kuning b{color:#d97706}'
      + '.afLapis .ksnIsi{padding-bottom:60px}.afSeg{display:flex;gap:6px;overflow-x:auto;margin:8px 0 12px;padding-bottom:2px;-webkit-overflow-scrolling:touch}.afSeg button{flex:none;min-height:40px;padding:0 14px;border-radius:99px;font-weight:800;font-size:13px;background:var(--panel2);color:var(--redup);position:relative}.afSeg button.on{background:var(--utama);color:#fff}'
      + '.afSeg button i{font-style:normal;background:#dc2c2c;color:#fff;border-radius:99px;font-size:10.5px;padding:0 6px;margin-left:5px}'
      + '.afSub{display:flex;gap:6px;margin-bottom:10px}.afSub button{flex:1;min-height:38px;border-radius:12px;font-weight:800;font-size:12.5px;background:var(--panel2);color:var(--redup)}.afSub button.on{background:var(--teks);color:var(--latar,#fff)}'
      + '.afAcc{display:flex;gap:10px;align-items:flex-start;padding:12px;border-radius:14px;background:var(--panel);box-shadow:0 0 0 1px var(--garis) inset;margin-bottom:8px}.afAcc .afJn{flex:none;width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;background:var(--panel2)}'
      + '.afAcc .afIs{flex:1;min-width:0}.afAcc .afIs b{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.afAcc .afIs small{display:block;color:var(--redup);font-size:12px;line-height:1.35;margin-top:2px}'
      + '.afLama{display:inline-block;margin-top:6px;font-size:11.5px;font-weight:800;padding:2px 8px;border-radius:99px;background:rgba(224,138,0,.15);color:#9a5b00}.afLama.lama{background:rgba(220,44,44,.14);color:#b42323}'
      + 'html[data-tema="gelap"] .afLama{color:#ffc266}html[data-tema="gelap"] .afLama.lama{color:#ff8a8a}'
      + '.afTb{flex:none;align-self:center;min-height:40px;padding:0 12px;border-radius:12px;background:var(--utama);color:#fff;font-weight:800;font-size:12.5px}'
      + '.afKosong{text-align:center;padding:26px 12px;color:var(--redup)}.afKosong b{display:block;font-size:16px;color:var(--teks);margin:6px 0 2px}'
      + '.afBrf{counter-reset:n;margin:0;padding:0;list-style:none}.afBrf li{counter-increment:n;position:relative;padding:10px 10px 10px 40px;border-radius:12px;background:var(--panel);box-shadow:0 0 0 1px var(--garis) inset;margin-bottom:6px;font-size:14px;line-height:1.45}'
      + '.afBrf li:before{content:counter(n);position:absolute;left:10px;top:10px;width:22px;height:22px;border-radius:99px;background:var(--utama);color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center}'
      + '.afH{margin:16px 2px 8px;font-size:14px;display:flex;justify-content:space-between;align-items:baseline;gap:8px}.afH small{font-size:11.5px;color:var(--redup);font-weight:700}'
      + '.afPeny{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px}.afPeny button{min-height:56px;border-radius:12px;background:var(--panel);box-shadow:0 0 0 1px var(--garis) inset;color:var(--teks)}.afPeny button b{display:block;font-size:20px}.afPeny button small{font-size:11px;color:var(--redup);font-weight:700}.afPeny button.on{box-shadow:0 0 0 2px var(--utama) inset}'
      + '.afUnit{padding:10px 12px;border-radius:12px;background:var(--panel);box-shadow:0 0 0 1px var(--garis) inset;margin-bottom:6px}.afUnit b{font-size:13.5px}.afUnit small{display:block;color:var(--redup);font-size:12px;margin-top:2px;line-height:1.35}.afChip{display:inline-block;font-size:10.5px;font-weight:800;padding:1px 7px;border-radius:6px;margin-left:6px;vertical-align:1px}'
      + '.afC-driver{background:rgba(30,136,229,.15);color:#1565c0}.afC-mekanik{background:rgba(220,44,44,.14);color:#b42323}.afC-jalan{background:rgba(224,138,0,.18);color:#9a5b00}html[data-tema="gelap"] .afC-driver{color:#9cc6fa}html[data-tema="gelap"] .afC-mekanik{color:#ff8a8a}html[data-tema="gelap"] .afC-jalan{color:#ffc266}'
      + '.afBar{height:10px;border-radius:99px;background:var(--panel2);overflow:hidden;margin:6px 0 2px}.afBar i{display:block;height:100%;background:linear-gradient(90deg,#15a34a,#22c55e);border-radius:99px}'
      + '.afItem{display:flex;gap:10px;align-items:flex-start;width:100%;text-align:left;padding:11px 12px;border-radius:12px;background:var(--panel);box-shadow:0 0 0 1px var(--garis) inset;margin-bottom:6px;color:var(--teks);font-size:14px;line-height:1.4}'
      + '.afItem .afCb{flex:none;width:24px;height:24px;border-radius:7px;box-shadow:0 0 0 2px var(--garis) inset;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:900;color:#fff;margin-top:1px}.afItem.ok .afCb{background:#15a34a;box-shadow:none}.afItem.ok .afTx{text-decoration:line-through;color:var(--redup)}'
      + '.afItem .afTx{flex:1;min-width:0}.afItem .afTx small{display:block;font-size:11.5px;color:var(--redup);margin-top:2px}.afItem.lewat{box-shadow:0 0 0 1.5px rgba(224,138,0,.6) inset}.afItem.sibuk{opacity:.55}.afItem .afVnd{flex:none;align-self:center;min-height:34px;padding:0 10px;border-radius:10px;background:var(--utama);color:#fff;font-weight:800;font-size:12px}'
      + '.afTiles{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.afTiles div{background:var(--panel);box-shadow:0 0 0 1px var(--garis) inset;border-radius:12px;padding:8px 6px;text-align:center;min-width:0}.afTiles small{display:block;font-size:10.5px;color:var(--redup);font-weight:700}.afTiles b{display:block;font-size:17px;overflow:hidden;text-overflow:ellipsis}'
      + '.afBaris{display:flex;justify-content:space-between;gap:8px;padding:8px 12px;border-bottom:1px solid var(--garis);font-size:13px}.afBaris:last-child{border-bottom:0}.afBaris span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.afBaris b{flex:none}'
      + '.afPanel{display:block;width:100%;box-sizing:border-box;border-radius:14px;background:var(--panel);box-shadow:0 0 0 1px var(--garis) inset;overflow:hidden}'
      + '.afLap{padding:14px;border-radius:16px;background:var(--panel);box-shadow:0 0 0 1px var(--garis) inset;margin-bottom:10px}.afLap h3{margin:0 0 4px;font-size:15px;display:flex;justify-content:space-between;gap:8px}.afLap h3 small{font-size:11.5px;color:var(--redup);font-weight:700}.afLap p{margin:4px 0 10px;font-size:13.5px;line-height:1.45}'
      + '.afLap .afKpi{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:10px}.afLap .afKpi div{text-align:center;border-radius:10px;padding:6px 2px;background:var(--panel2)}.afLap .afKpi small{display:block;font-size:10px;color:var(--redup);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.afLap .afKpi b{font-size:14px}'
      + '.afLap .afKpi .hijau{box-shadow:inset 0 -3px 0 #15a34a}.afLap .afKpi .kuning{box-shadow:inset 0 -3px 0 #e08a00}.afLap .afKpi .merah{box-shadow:inset 0 -3px 0 #dc2c2c}'
      + '.afBesar{width:100%;min-height:46px;border-radius:14px;background:#15a34a;color:#fff;font-weight:900;font-size:14.5px}.afBesar.abu{background:var(--panel2);color:var(--teks)}'
      + '.afForm textarea{width:100%;box-sizing:border-box;min-height:110px;border-radius:12px;border:1px solid var(--garis);background:var(--panel);color:var(--teks);padding:10px;font:inherit;font-size:14.5px;resize:vertical}'
      + '.afFoto{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.afFoto img{width:76px;height:76px;object-fit:cover;border-radius:10px}.afFoto button{min-height:40px;padding:0 12px;border-radius:12px;background:var(--panel2);color:var(--teks);font-weight:800;font-size:12.5px}'
      + '.afPita{font-size:12px;color:var(--redup);margin:4px 2px 10px;line-height:1.4}.afPita.gagal{color:#b42323}.afSegar{float:right;min-height:30px;padding:0 10px;border-radius:99px;background:var(--panel2);color:var(--teks);font-weight:800;font-size:12px}';
    document.head.appendChild(st);
  }

  /* ---------- kartu Beranda (paling atas untuk Fanza) ---------- */
  function kartuHtml(ctx) {
    CTX = ctx || CTX; if (!boleh()) return ''; gaya(); pasangKlikGlobal();
    if (!DATA) ambilLokal();
    if (!DATA || Date.now() - DATA_T > SEGAR_MS) muat();
    var d = DATA;
    if (!d) return '<div class="kartu afKartu" data-af-buka="acc"><div class="afAtas"><div class="afIk">🧭</div><div class="afJd"><b>Asisten Saya</b><small>' + (GALAT ? esc(GALAT) : 'Memuat antrean ACC & briefing…') + '</small></div><div class="afPanah">›</div></div></div>';
    var acc = d.acc || [], lama = acc.filter(function (a) { return (a.menitTunggu || 0) >= 120; }).length, U = d.unit || {}, J = d.jadwal || {};
    var sub = acc.length ? acc.length + ' ACC menunggu · paling lama ' + esc(acc[0].lama || '') : 'Tidak ada ACC menunggu ✓';
    return '<div class="kartu afKartu" data-af-buka="' + (acc.length ? 'acc' : 'brf') + '" role="button" aria-label="Buka Asisten Saya"><div class="afAtas"><div class="afIk">🧭</div><div class="afJd"><b>Asisten Saya</b><small>' + sub + '</small></div><div class="afPanah">›</div></div>'
      + '<div class="afStrip"><div class="' + (lama ? 'merah' : acc.length ? 'kuning' : 'hijau') + '"><small>ACC</small><b>' + acc.length + '</b></div><div class="hijau"><small>Ready</small><b>' + angka(U.rfu) + '</b></div><div class="' + (U.perbaikan ? 'merah' : '') + '"><small>BD</small><b>' + angka(U.perbaikan) + '</b></div><div><small>Jadwal</small><b>' + (J.aktif ? (J.selesai || 0) + '/' + (J.total || 0) : '–') + '</b></div></div></div>';
  }
  var klikGlobal = false;
  function pasangKlikGlobal() {
    if (klikGlobal) return; klikGlobal = true;
    document.addEventListener('click', function (ev) { var b = ev.target.closest && ev.target.closest('[data-af-buka]'); if (!b || (lapisEl && lapisEl.contains(b))) return; getar(); buka(CTX, b.getAttribute('data-af-buka')); });
  }

  /* ---------- lapis ---------- */
  function buka(ctx, tab) {
    CTX = ctx || CTX; if (!boleh()) { roti('Asisten Saya khusus Pak Fanza.'); return; } gaya(); pasangKlikGlobal();
    if (tab) TAB = tab; TERBUKA = true; if (!DATA) ambilLokal(); gambarUlang(); muat(!DATA || Date.now() - DATA_T > 60000);
  }
  function tutup() { TERBUKA = false; if (!lapisEl) return false; var d = lapisEl; lapisEl = null; VENDOR = null; d.classList.remove('tampil'); setTimeout(function () { d.remove(); }, 200); return true; }
  function kembali() { if (VENDOR) { VENDOR = null; gambarUlang(); return true; } return tutup(); }
  function lapisSiap() {
    if (lapisEl && !document.body.contains(lapisEl)) lapisEl = null;
    if (!lapisEl) {
      lapisEl = document.createElement('div'); lapisEl.className = 'lapis ksnLapis afLapis'; document.body.appendChild(lapisEl);
      requestAnimationFrame(function () { if (lapisEl) lapisEl.classList.add('tampil'); });
      lapisEl.addEventListener('click', klik); lapisEl.addEventListener('change', ganti);
    }
    return lapisEl;
  }
  function gambarUlang() {
    if (!TERBUKA) return;
    var el = lapisSiap(), d = DATA, acc = d ? d.acc || [] : [], J = d && d.jadwal || {};
    var tabs = [['acc', 'Antrean ACC', acc.length], ['brf', 'Briefing'], ['jdw', 'Jadwal', J.kelewat || 0], ['eva', 'Evaluasi'], ['lap', 'Laporan']];
    var seg = '<div class="afSeg" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-af="tab:' + t[0] + '" class="' + (TAB === t[0] ? 'on' : '') + '">' + t[1] + (t[2] ? '<i>' + t[2] + '</i>' : '') + '</button>'; }).join('') + '</div>';
    var pita = d ? '<div class="afPita' + (GALAT ? ' gagal' : '') + '"><button type="button" class="afSegar" data-af="gambar" style="margin-left:6px">⬇ Gambar</button><button type="button" class="afSegar" data-af="segar">' + (MUAT ? 'Memuat…' : '↻ Segarkan') + '</button>' + esc(d.label || '') + ' · data jam ' + esc(String(d.jamServer || '').replace(':', '.')) + (GALAT ? '<br>Belum bisa menyegarkan: ' + esc(GALAT) : '') + '</div>' : '';
    var isi = !d ? (GALAT ? '<div class="kartu afKosong"><b>Asisten belum bisa dimuat</b>' + esc(GALAT) + '<br><button type="button" class="tKecil" data-af="segar" style="margin-top:10px">Coba lagi</button></div>' : (R.kerangka ? R.kerangka('daftar') : '<div class="kartu"><span class="putar"></span> Memuat…</div>'))
      : VENDOR ? htmlVendor() : TAB === 'acc' ? htmlAcc(d) : TAB === 'brf' ? htmlBrf(d) : TAB === 'jdw' ? htmlJadwal(d) : TAB === 'eva' ? htmlEva(d) : htmlLap(d);
    var gulir = el.querySelector('.ksnIsi'), y = gulir ? gulir.scrollTop : 0;
    el.innerHTML = '<div class="ksnKp"><button type="button" class="kb" data-af="tutup" aria-label="Kembali">‹</button><div class="nm">Pak ' + esc(d && d.fanza ? (String(d.fanza.nama).split(' ')[0].charAt(0) + String(d.fanza.nama).split(' ')[0].slice(1).toLowerCase()) : 'Fanza') + '<b>Asisten Saya</b></div></div><div class="ksnIsi">' + (VENDOR ? '' : seg) + pita + isi + '</div>';
    var g2 = el.querySelector('.ksnIsi'); if (g2 && y) g2.scrollTop = y;
  }

  /* ---------- 1. Antrean ACC ---------- */
  var JN = { kasbon: ['💰', 'Kasbon / cicilan HP', 'Buka ACC kasbon'], lembur: ['⏰', 'Lembur', 'Buka ACC lembur'], izin: ['📝', 'Izin / sakit / cuti', 'Buka persetujuan izin'], tukar: ['🎁', 'Tukar poin', 'Buka ACC tukar poin'] };
  function htmlAcc(d) {
    var acc = d.acc || [];
    if (!acc.length) return '<div class="kartu afKosong">✅<b>Semua ACC beres</b>Tidak ada kasbon, lembur, izin, atau tukar poin yang menunggu Bapak.</div>' + gagalAcc(d);
    var h = '', grup = {};
    acc.forEach(function (a) { (grup[a.jenis] = grup[a.jenis] || []).push(a); });
    ['kasbon', 'lembur', 'izin', 'tukar'].forEach(function (j) {
      var L = grup[j]; if (!L) return; var J = JN[j];
      h += '<div class="afH"><span>' + J[0] + ' ' + J[1] + ' · ' + L.length + '</span><button type="button" class="afTb" data-af="acc:' + j + '">' + J[2] + ' ›</button></div>';
      L.forEach(function (a) {
        h += '<div class="afAcc"><div class="afJn">' + J[0] + '</div><div class="afIs"><b>' + esc(a.nama) + '</b><small>' + esc(a.ringkas) + '</small><span class="afLama' + ((a.menitTunggu || 0) >= 120 ? ' lama' : '') + '">⏳ menunggu ' + esc(a.lama || '-') + '</span></div>'
          + '<button type="button" class="afTb" data-af="acc:' + j + ':' + esc(a.id) + '" aria-label="Buka ACC ' + esc(a.nama) + '">ACC ›</button></div>';
      });
    });
    return '<div class="afPita">Yang menunggu ACC Bapak, paling lama di atas. Merah = lebih dari 2 jam. Nota pengajuan di-ACC admin Input DO (bukan antrean Bapak).</div>' + h + gagalAcc(d);
  }
  function gagalAcc(d) { var g = d.accGagal || {}, k = Object.keys(g); return k.length ? '<div class="afPita gagal">Belum terbaca: ' + esc(k.join(', ')) + ' — coba Segarkan.</div>' : ''; }
  function bukaAcc(j, id) {
    if (!CTX || !CTX.bukaNotif) { roti('Buka menu ACC dari Beranda.'); return; }
    var p = { kasbon: { jenis: 'kasbon_pimpinan' }, lembur: { jenis: 'lembur' }, izin: { jenis: 'izin', id: id || '' }, tukar: { jenis: 'poin', id: id || '' } }[j];
    if (!p) return; DATA_T = 0; CTX.bukaNotif(p);
    /* segarkan otomatis begitu layar ACC ditutup & Asisten di atas lagi */
    var n = 0, t = setInterval(function () { n++; var L = document.querySelectorAll('.lapis.tampil'), atas = L[L.length - 1]; if (!lapisEl || n > 600) { clearInterval(t); return; } if (n > 3 && atas === lapisEl) { clearInterval(t); muat(true); } }, 1000);
  }

  /* ---------- 2. Briefing ---------- */
  function htmlBrf(d) {
    var B = d.briefing || {}, L = SUB.brf === 'sore' ? B.sore || [] : B.pagi || [], U = d.unit || {}, T = d.tidakEfektif || {};
    var h = '<div class="afSub"><button type="button" data-af="brf:pagi" class="' + (SUB.brf === 'pagi' ? 'on' : '') + '">☀️ Briefing pagi</button><button type="button" data-af="brf:sore" class="' + (SUB.brf === 'sore' ? 'on' : '') + '">🌇 Briefing sore</button></div>';
    h += '<div class="afTiles" style="margin-bottom:10px"><div><small>Ready</small><b style="color:#15a34a">' + angka(U.rfu) + '</b></div><div><small>BD / perbaikan</small><b style="color:#dc2c2c">' + angka(U.perbaikan) + '</b></div><div><small>Standby</small><b>' + angka(U.standby) + '</b></div></div>';
    h += '<ol class="afBrf">' + L.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol><button type="button" class="afBesar abu" data-af="salinBrf" style="margin:4px 0 6px">📋 Salin poin briefing (untuk dibacakan / WA tim)</button>';
    if (U.bd && U.bd.length) h += '<div class="afH"><span>🔧 Unit BD sekarang</span><small>' + U.bd.length + ' unit</small></div><div class="afPanel">' + U.bd.map(function (b) { return '<div class="afBaris"><span>' + esc(b.lambung) + ' · ' + esc(b.status) + (b.storing ? ' · storing' : '') + '</span><b style="color:' + (b.lamaJam >= 24 ? '#dc2c2c' : 'inherit') + '">' + esc(b.lama) + '</b></div>'; }).join('') + '</div>';
    h += '<div class="afH"><span>Unit tidak efektif kemarin</span><small>' + esc(T.label || '') + '</small></div>';
    if (!T.total) h += '<div class="afPita">Belum ada data unit kemarin.</div>';
    else {
      var P = T.perPenyebab || {}, pil = SUB.peny || '';
      h += '<div class="afPita">' + (T.efektif || 0) + '/' + T.total + ' unit efektif (target ' + esc(T.patokan || ('≥ ' + T.kmMin + ' km dari DO per hari tambang')) + '). Ketuk penyebab untuk menyaring.</div>'
        + (T.patokan ? '<div class="afPita">Rit dari DO admin' + (T.dataJam ? ', data jam ' + esc(String(T.dataJam).replace(':', '.')) : '') + '.' + (T.tanpaDo || (T.menungguDo && T.menungguDo.length) ? ' <b>DO belum lengkap</b>: ' + esc(T.tanpaDo) + ' unit belum ada DO' + (T.menungguDo && T.menungguDo.length ? '; menunggu DO admin (tidak dinilai): ' + T.menungguDo.slice(0, 12).map(function (x) { return esc(x.lambung); }).join(', ') : '') + '.' : '') +(T.ritEstimasi ? ' Tonase estimasi untuk ' + esc(T.ritEstimasi) + ' rit tanpa tonase DO (Trintin 55 t, Tronton 35 t per rit).' : '') + (T.tidakDihitung && T.tidakDihitung.length ? ' Tidak dihitung (' + T.tidakDihitung.length + '): ' + T.tidakDihitung.slice(0, 12).map(function (x) { return esc(x.lambung) + ' ' + esc(x.alasan.split(' (')[0].split(' —')[0]); }).join(', ') + (T.tidakDihitung.length > 12 ? ' …' : '') + '.' : '') + '</div>' : ''); /* revisi2 */
      h += '<div class="afPeny">' + [['driver', '👷 Driver'], ['mekanik', '🔧 Mekanik'], ['jalan', '🛣️ Jalan']].map(function (p) { return '<button type="button" data-af="peny:' + p[0] + '" class="' + (pil === p[0] ? 'on' : '') + '"><b>' + (P[p[0]] || 0) + '</b><small>' + p[1] + '</small></button>'; }).join('') + '</div>';
      var D = (T.daftar || []).filter(function (x) { return !pil || x.penyebab === pil; });
      h += D.length ? D.map(function (x) { return '<div class="afUnit"><b>' + esc(x.lambung) + '</b><span class="afChip afC-' + esc(x.penyebab) + '">' + esc(x.penyebab) + '</span>' + (x.driver ? ' <small style="display:inline;margin:0">· ' + esc(x.driver) + '</small>' : '') + '<small>' + esc(x.alasan) + '</small><small>' + esc(x.rit) + ' rit · ' + esc(x.km) + ' km DO' + (x.gps != null ? ' · GPS ' + esc(x.gps) + ' km' : '') + (x.p2h ? ' · P2H ✓' : ' · tanpa P2H') + '</small></div>'; }).join('') : '<div class="afPita">Tidak ada unit untuk penyebab ini.</div>';
      if (T.sumberKurang && T.sumberKurang.length) h += '<div class="afPita">Sumber belum lengkap: ' + esc(T.sumberKurang.join(', ')) + '.</div>';
    }
    return h;
  }

  /* ---------- 3. Jadwal centang ---------- */
  function htmlJadwal(d) {
    var J = d.jadwal || {};
    if (!J.aktif) return '<div class="kartu afKosong"><b>Jadwal belum aktif</b>' + esc(J.pesan || '') + '</div>';
    var h = '<div class="afPanel" style="padding:12px 14px;margin-bottom:10px"><b>' + (J.selesai || 0) + ' dari ' + (J.total || 0) + ' selesai hari ini</b><div class="afBar"><i style="width:' + (J.persen || 0) + '%"></i></div><small style="color:var(--redup)">Item kelewat (oranye) ikut muncul sampai dicentang.</small></div>';
    var grup = {}; (J.item || []).forEach(function (it) { (grup[it.bagian] = grup[it.bagian] || []).push(it); });
    [['Kelewat', '⚠️ Kelewat'], ['Pagi', '☀️ Pagi'], ['Lapangan', '🚚 Lapangan'], ['Sore', '🌇 Sore'], ['Bulanan', '📅 Bulanan']].forEach(function (b) {
      var L = grup[b[0]]; if (!L) return;
      h += '<div class="afH"><span>' + b[1] + '</span><small>' + L.filter(function (x) { return x.selesai; }).length + '/' + L.length + '</small></div>';
      L.forEach(function (it) {
        var k = it.tanggal + '|' + it.id;
        h += '<div class="afItem' + (it.selesai ? ' ok' : '') + (it.kelewat ? ' lewat' : '') + (SIBUK[k] ? ' sibuk' : '') + '" role="checkbox" aria-checked="' + (it.selesai ? 'true' : 'false') + '" data-af="cek:' + esc(k) + '" tabindex="0"><span class="afCb">' + (it.selesai ? '✓' : '') + '</span><span class="afTx">' + esc(it.teks)
          + (it.dariTgl ? '<small>dari ' + esc(it.dariTgl) + '</small>' : it.waktu && it.selesai ? '<small>selesai ' + esc(String(it.waktu).replace(':', '.')) + '</small>' : '') + '</span>' + (it.vendor ? '<button type="button" class="afVnd" data-af="vendor:' + esc(it.vendor) + '">Catat</button>' : '') + '</div>';
      });
    });
    if (J.vendorHariIni === false) h += '<button type="button" class="afBesar abu" data-af="vendor:" style="margin-top:8px">🏭 Riwayat kunjungan vendor</button>';
    return h;
  }
  function centang(k) {
    var J = DATA && DATA.jadwal; if (!J || SIBUK[k]) return; var it = (J.item || []).filter(function (x) { return x.tanggal + '|' + x.id === k; })[0]; if (!it) return;
    var baru = !it.selesai; it.selesai = baru; SIBUK[k] = 1; getar(); gambarUlang();
    panggil({ aksi: 'centang', tanggal: it.tanggal, id: it.id, selesai: baru }, 30000).then(function (h) {
      delete SIBUK[k];
      if (h && h.ok && h.jadwal) { DATA.jadwal = h.jadwal; simpanLokal(); if (baru && R.bunyi) try { R.bunyi('sukses'); } catch (e) { /* */ } }
      else { it.selesai = !baru; roti((h && h.pesan) || 'Gagal menyimpan centang.'); }
      gambarUlang(); if (CTX && CTX.perbarui) CTX.perbarui();
    }, function () { delete SIBUK[k]; it.selesai = !baru; roti('Tidak tersambung. Centang belum tersimpan.'); gambarUlang(); });
  }

  /* ---------- 3b. Kunjungan vendor (Kamis) ---------- */
  function bukaVendor(v) { VENDOR = { vendor: v || '', catatan: '', foto: [], riwayat: (DATA && DATA.vendorRiwayat) || [], cid: 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), lihat: {} }; gambarUlang(); muatRiwayat(); }
  function muatRiwayat() { panggil({ aksi: 'vendorRiwayat' }, 30000).then(function (h) { if (VENDOR && h && h.ok) { VENDOR.riwayat = h.riwayat || []; gambarUlang(); } }, function () { /* */ }); }
  function htmlVendor() {
    var V = VENDOR, h = '<div class="afH"><span>🏭 Kunjungan vendor</span><small>catatan + foto per vendor</small></div><div class="afSub">' + ['TTA', 'SUN', 'MSMS'].map(function (v) { return '<button type="button" data-af="vpilih:' + v + '" class="' + (V.vendor === v ? 'on' : '') + '">' + v + '</button>'; }).join('') + '</div>';
    if (V.vendor) {
      h += '<div class="afForm"><label class="afPita" for="afVCat">Catatan kunjungan ' + esc(V.vendor) + ' (unit dicek, temuan, janji perbaikan, PIC vendor)</label><textarea id="afVCat" maxlength="1500" placeholder="Contoh: cek 2 unit di workshop, ban 1127 perlu ganti minggu ini, PIC: Pak ...">' + esc(V.catatan) + '</textarea>'
        + '<div class="afFoto">' + V.foto.map(function (f, i) { return '<img src="' + f + '" alt="foto ' + (i + 1) + '" data-af="vhapus:' + i + '">'; }).join('') + (V.foto.length < 3 ? '<button type="button" data-af="vfoto:kamera">📷 Kamera</button><button type="button" data-af="vfoto:galeri">🖼️ Galeri</button>' : '') + '</div>'
        + '<input type="file" accept="image/*" capture="environment" id="afVKam" hidden><input type="file" accept="image/*" multiple id="afVGal" hidden>'
        + '<small class="afPita" style="display:block">Maks 3 foto. Ketuk foto untuk menghapus.</small><button type="button" class="afBesar" data-af="vsimpan"' + (V.sibuk ? ' disabled' : '') + '>' + (V.sibuk ? 'Menyimpan…' : '💾 Simpan kunjungan ' + esc(V.vendor)) + '</button></div>';
    } else h += '<div class="afPita">Pilih vendor untuk mencatat kunjungan.</div>';
    h += '<div class="afH"><span>Riwayat kunjungan</span><small>' + V.riwayat.length + '</small></div>';
    h += V.riwayat.length ? V.riwayat.map(function (r) { return '<div class="afUnit"><b>' + esc(r.vendor) + '</b><small style="display:inline;margin-left:6px">' + esc(r.label || r.tanggal) + ' · ' + esc(String(r.waktu || '').slice(11, 16).replace(':', '.')) + '</small><small>' + esc(r.catatan) + '</small>'
      + (r.nFoto ? '<div class="afFoto">' + (r.foto || []).map(function (f) { return V.lihat[f] ? '<img src="' + V.lihat[f] + '" alt="foto kunjungan">' : '<button type="button" data-af="vlihat:' + esc(f) + '">🖼️ Lihat foto</button>'; }).join('') + '</div>' : '') + '</div>'; }).join('') : '<div class="afPita">Belum ada kunjungan tercatat.</div>';
    return h;
  }
  function kompres(file) {
    return new Promise(function (ok, gagal) {
      var fr = new FileReader(); fr.onerror = function () { gagal(new Error('Foto tidak terbaca')); };
      fr.onload = function () { var im = new Image(); im.onerror = function () { gagal(new Error('Foto rusak')); }; im.onload = function () {
        var s = Math.min(1, 1280 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', 0.75)); }; im.src = fr.result; };
      fr.readAsDataURL(file);
    });
  }
  function tambahFoto(files) {
    var V = VENDOR; if (!V) return; var L = Array.prototype.slice.call(files || [], 0, 3 - V.foto.length);
    L.reduce(function (p, f) { return p.then(function () { return kompres(f).then(function (u) { if (VENDOR && VENDOR.foto.length < 3) VENDOR.foto.push(u); }); }); }, Promise.resolve())
      .then(function () { gambarUlang(); }, function (e) { roti(String((e && e.message) || e)); gambarUlang(); });
  }
  function simpanVendor() {
    var V = VENDOR, ta = lapisEl && lapisEl.querySelector('#afVCat'); if (ta) V.catatan = ta.value;
    if (String(V.catatan).trim().length < 3) { roti('Tulis catatan kunjungan dulu.'); return; }
    V.sibuk = true; gambarUlang();
    panggil({ aksi: 'vendor', vendor: V.vendor, catatan: V.catatan, foto: V.foto, cid: V.cid }, 90000).then(function (h) {
      if (!VENDOR) return; VENDOR.sibuk = false;
      if (h && h.ok) { roti('Kunjungan ' + V.vendor + ' tersimpan.'); VENDOR.riwayat = h.riwayat || VENDOR.riwayat; if (h.jadwal && DATA) DATA.jadwal = h.jadwal; VENDOR.vendor = ''; VENDOR.catatan = ''; VENDOR.foto = []; VENDOR.cid = 'v' + Date.now().toString(36); simpanLokal(); }
      else roti((h && h.pesan) || 'Gagal menyimpan.');
      gambarUlang();
    }, function () { if (VENDOR) VENDOR.sibuk = false; roti('Tidak tersambung. Coba simpan lagi (data tidak dobel).'); gambarUlang(); });
  }
  function lihatFoto(fid) {
    panggil({ aksi: 'vendorFoto', foto: fid }, 45000).then(function (h) { if (VENDOR && h && h.ok) { VENDOR.lihat[fid] = 'data:' + h.mime + ';base64,' + h.b64; gambarUlang(); } else roti((h && h.pesan) || 'Foto belum bisa dibuka.'); }, function () { roti('Tidak tersambung.'); });
  }

  /* ---------- 4. Evaluasi ---------- */
  function htmlEva(d) {
    var j = SUB.eva, E = (d.evaluasi || {})[j];
    var h = '<div class="afSub"><button type="button" data-af="eva:mingguan" class="' + (j === 'mingguan' ? 'on' : '') + '">7 hari terakhir</button><button type="button" data-af="eva:bulanan" class="' + (j === 'bulanan' ? 'on' : '') + '">Bulan ini</button></div>';
    if (!E) return h + '<div class="afPita">Evaluasi belum tersedia.</div>';
    var P = E.perPenyebab || {}, tot = (P.driver || 0) + (P.mekanik || 0) + (P.jalan || 0);
    h += '<div class="afPita">' + esc(E.label) + ' · ' + E.hari + ' hari tambang</div>';
    h += '<div class="afTiles"><div><small>Ritase</small><b>' + angka(E.rit) + '</b></div><div><small>' + (E.tonEstimasi ? 'Ton (estimasi)' : 'Tonase') + '</small><b>' + angka(Math.round(E.ton)) + '</b></div><div><small>Unit efektif</small><b>' + angka(E.persenEfektif) + '%</b></div>'
      + '<div><small>Kepatuhan P2H</small><b>' + angka(E.p2hPersen) + '%</b></div><div><small>Tiket BD</small><b>' + angka(E.bdTiket) + '</b></div><div><small>Rata perbaikan</small><b>' + (E.bdRataJam != null ? angka(E.bdRataJam) + ' j' : '–') + '</b></div></div>';
    h += '<div class="afH"><span>Unit tidak efektif per penyebab</span><small>' + tot + ' unit-hari</small></div><div class="afPanel">' + [['driver', '👷 Driver'], ['mekanik', '🔧 Mekanik'], ['jalan', '🛣️ Jalan']].map(function (p) { var n = P[p[0]] || 0; return '<div class="afBaris" style="display:block"><div style="display:flex;justify-content:space-between"><span>' + p[1] + '</span><b>' + n + '</b></div><div class="afBar"><i style="width:' + (tot ? Math.round(n / tot * 100) : 0) + '%;background:' + (p[0] === 'mekanik' ? '#dc2c2c' : p[0] === 'jalan' ? '#e08a00' : '#1e88e5') + '"></i></div></div>'; }).join('') + '</div>';
    function daftar(jd, L, f) { return L && L.length ? '<div class="afH"><span>' + jd + '</span></div><div class="afPanel">' + L.map(f).join('') + '</div>' : ''; }
    h += daftar('Unit paling sering tidak efektif', E.topUnit, function (u) { return '<div class="afBaris"><span>' + esc(u.lambung) + ' <span class="afChip afC-' + esc(u.penyebab) + '">' + esc(u.penyebab) + '</span></span><b>' + u.n + ' hari</b></div>'; });
    h += daftar('Driver paling sering di bawah target', E.topDriver, function (u) { return '<div class="afBaris"><span>' + esc(u.nama) + ' · ' + esc(u.lambung) + '</span><b>' + u.n + 'x</b></div>'; });
    h += daftar('Mekanik / BD terbanyak', E.topMekanik, function (u) { return '<div class="afBaris"><span>' + esc(u.nama) + ' · ' + esc((u.unit || []).join(', ')) + '</span><b>' + u.n + 'x</b></div>'; });
    var PN = E.p2hNilai; /* revisi2: penilaian P2H driver & mekanik */
    if (PN) { h += '<div class="afH"><span>✅ Penilaian P2H</span><small>target ' + PN.target + '%</small></div><div class="afTiles" style="grid-template-columns:repeat(3,1fr)"><div><small>Driver P2H sebelum jalan</small><b style="color:' + (PN.driver.persen >= PN.target ? '#15a34a' : '#dc2c2c') + '">' + PN.driver.persen + '%</b></div><div><small>Temuan ditindak ≤ ' + PN.tindakJam + ' j</small><b>' + (PN.mekanik.persen == null ? '–' : PN.mekanik.persen + '%') + '</b></div><div><small>Kritis tetap jalan</small><b style="color:' + (PN.mekanik.kritis ? '#dc2c2c' : '#15a34a') + '">' + PN.mekanik.kritis + '</b></div></div>';
      h += daftar('Driver P2H terendah (hari P2H / hari jalan)', PN.driver.terendah, function (u) { return '<div class="afBaris"><span>' + esc(u.nama) + ' · ' + esc(u.lambung) + '</span><b>' + u.p2h + '/' + u.jalan + ' (' + u.persen + '%)</b></div>'; });
      h += daftar('Temuan P2H belum ditindak', PN.mekanik.belum, function (u) { return '<div class="afBaris" style="display:block"><div style="display:flex;justify-content:space-between;gap:8px"><span>' + esc(u.lambung) + (u.kritis ? ' <span class="afChip afC-mekanik">kritis, tetap jalan</span>' : '') + '</span><b>' + esc(u.hari.slice(8, 10) + '/' + u.hari.slice(5, 7)) + ' ' + esc(String(u.jam).replace(':', '.')) + '</b></div><small style="color:var(--redup)">' + esc(u.item) + '</small></div>'; });
      h += '<div class="afPita">' + esc(PN.aturan) + '</div>'; }
    var A = E.acc || {}, Ab = E.absen, V = E.vendor, J = E.jadwal;
    h += '<div class="afH"><span>Lain-lain</span></div><div class="afPanel">'
      + '<div class="afBaris"><span>Kasbon / lembur / izin di-ACC</span><b>' + angka(A.kasbon) + ' / ' + angka(A.lembur) + ' / ' + angka(A.izin) + '</b></div>'
      + '<div class="afBaris"><span>Diputus Bapak sendiri</span><b>' + angka(A.olehFanza) + '</b></div>'
      + '<div class="afBaris"><span>Absensi staf (rata hadir / telat)</span><b>' + (Ab ? angka(Ab.rataHadir) + ' / ' + angka(Ab.telat) : '–') + '</b></div>'
      + '<div class="afBaris"><span>Kunjungan vendor</span><b>' + (V ? V.n + (V.n ? ' (' + Object.keys(V.perVendor || {}).join(', ') + ')' : '') : '–') + '</b></div>'
      + '<div class="afBaris"><span>Jadwal centang selesai</span><b>' + (J ? J.selesai + '/' + J.total + ' (' + J.persen + '%)' : '–') + '</b></div></div>';
    if (d.catatanSumber && d.catatanSumber.length) h += '<div class="afPita" style="margin-top:10px">' + d.catatanSumber.map(esc).join('<br>') + '</div>';
    return h;
  }

  /* ---------- 5. Laporan direksi ---------- */
  function htmlLap(d) {
    var L = d.laporan || {}, h = '<div class="afPita">Kartu gambar + teks WA singkat. Bapak bisa tambah catatan sebelum bagikan — tidak dikirim otomatis.</div>';
    [['harian', 'Harian', true], ['mingguan', 'Mingguan', L.mingguanAda], ['bulanan', 'Bulanan', L.bulananAda]].forEach(function (x) {
      var o = L[x[0]]; if (!o) return;
      h += '<div class="afLap"><h3><span>📊 Laporan ' + x[1] + '</span><small>' + esc(o.periode) + (x[2] ? '' : ' · berjalan') + '</small></h3><p>' + esc(o.kesimpulan) + '</p><div class="afKpi">' + (o.kpi || []).map(function (k) { return '<div class="' + esc(k.status) + '"><small>' + esc(k.label) + '</small><b>' + angka(k.nilai) + (k.satuan === '%' ? '%' : '') + ' ' + (k.arah === 'naik' ? '▲' : k.arah === 'turun' ? '▼' : '') + '</b></div>'; }).join('') + '</div>'
        + '<button type="button" class="afBesar' + (x[2] ? '' : ' abu') + '" data-af="lap:' + x[0] + '">' + (x[2] ? '🟢 Buat gambar & bagikan ke WA' : 'Lihat (periode belum selesai)') + '</button></div>';
    });
    return h;
  }
  function bukaLap(j) {
    var o = DATA && DATA.laporan && DATA.laporan[j]; if (!o) return;
    if (!window.WHL_LAPORAN_DIREKSI || !window.WHL_LAPORAN_DIREKSI.buka) { roti('Kartu laporan belum ada di versi app ini.'); return; }
    var x = JSON.parse(JSON.stringify(o)); if (!x.nama) x.nama = 'Fanza'; window.WHL_LAPORAN_DIREKSI.buka(x);
  }
  function salin(t) {
    var jadi = function () { roti('Poin briefing disalin.'); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(jadi, cad); return; } } catch (e) { /* */ }
    cad();
    function cad() { try { var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); jadi(); } catch (e2) { roti('Tidak bisa menyalin.'); } }
  }

  /* ---------- revisi2: EKSPOR GAMBAR per tab (canvas sendiri, huruf besar, gaya laporan) ---------- */
  function modelTab() {
    var d = DATA || {}, M = { judul: '', sub: (d.label || '') + ' · data jam ' + String(d.jamServer || '').replace(':', '.'), blok: [] };
    var nmJ = { kasbon: 'Kasbon', lembur: 'Lembur', izin: 'Izin', tukar: 'Tukar poin' };
    if (TAB === 'acc') { M.judul = 'Antrean ACC'; var A = d.acc || []; M.blok.push({ t: 'kpi', item: [['Menunggu', A.length], ['> 2 jam', A.filter(function (a) { return (a.menitTunggu || 0) >= 120; }).length]] });
      M.blok.push({ t: 'daftar', j: A.length ? 'Daftar (paling lama di atas)' : 'Semua ACC beres', baris: A.map(function (a) { return [nmJ[a.jenis] + ' · ' + a.nama, a.lama, (a.menitTunggu || 0) >= 120 ? 'merah' : '', a.ringkas]; }) }); }
    else if (TAB === 'brf') { var B = d.briefing || {}, sore = SUB.brf === 'sore'; M.judul = sore ? 'Briefing Sore' : 'Briefing Pagi'; var U = d.unit || {};
      M.blok.push({ t: 'kpi', item: [['Ready', U.rfu], ['BD', U.perbaikan], ['Standby', U.standby]] }); M.blok.push({ t: 'poin', j: 'Poin briefing', item: (sore ? B.sore : B.pagi) || [] }); }
    else if (TAB === 'jdw') { var J = d.jadwal || {}; M.judul = 'Jadwal Hari Ini'; M.blok.push({ t: 'kpi', item: [['Selesai', (J.selesai || 0) + '/' + (J.total || 0)], ['Kelewat', J.kelewat || 0]] });
      M.blok.push({ t: 'daftar', j: 'Checklist', baris: (J.item || []).map(function (it) { return [(it.selesai ? '✓ ' : '☐ ') + it.teks, it.bagian, it.selesai ? 'hijau' : it.kelewat ? 'kuning' : '', it.dariTgl ? 'dari ' + it.dariTgl : '']; }) }); }
    else if (TAB === 'eva') { var E = (d.evaluasi || {})[SUB.eva] || {}, P = E.perPenyebab || {}, PN = E.p2hNilai; M.judul = 'Evaluasi ' + (SUB.eva === 'bulanan' ? 'Bulan Ini' : '7 Hari'); M.sub = (E.label || '') + ' · ' + M.sub;
      M.blok.push({ t: 'kpi', item: [['Ritase', E.rit], [E.tonEstimasi ? 'Ton (estimasi)' : 'Tonase', Math.round(E.ton || 0)], ['Unit efektif', (E.persenEfektif || 0) + '%'], ['P2H', (E.p2hPersen || 0) + '%']] });
      M.blok.push({ t: 'daftar', j: 'Tidak efektif per penyebab (unit-hari)', baris: [['Driver', P.driver || 0, ''], ['Mekanik', P.mekanik || 0, 'merah'], ['Jalan', P.jalan || 0, 'kuning']] });
      if (E.topUnit && E.topUnit.length) M.blok.push({ t: 'daftar', j: 'Unit paling sering tidak efektif', baris: E.topUnit.map(function (u) { return [u.lambung + ' · ' + u.penyebab, u.n + ' hari', '']; }) });
      if (PN) M.blok.push({ t: 'daftar', j: 'Penilaian P2H', baris: [['Driver P2H sebelum jalan', PN.driver.persen + '%', PN.driver.persen >= PN.target ? 'hijau' : 'merah'], ['Temuan P2H ditindak mekanik', PN.mekanik.persen == null ? '–' : PN.mekanik.persen + '%', ''], ['Temuan kritis unit tetap jalan', PN.mekanik.kritis, PN.mekanik.kritis ? 'merah' : 'hijau']] }); }
    else if (TAB === 'lap') { M.judul = 'Laporan'; var L = (d.laporan || {}).harian || {}; M.blok.push({ t: 'poin', j: L.periode || '', item: [L.kesimpulan || ''].concat(L.perhatian || []) }); }
    if (TAB === 'brf' || TAB === 'tdk') { var T = d.tidakEfektif || {}, pil = SUB.peny || '';
      M.blok.push({ t: 'daftar', j: 'Unit tidak efektif ' + (T.label || '') + ' · ' + (T.efektif || 0) + '/' + (T.total || 0) + ' efektif', baris: (T.daftar || []).filter(function (x) { return !pil || x.penyebab === pil; }).map(function (x) { return [x.lambung + ' · ' + x.penyebab + (x.driver ? ' · ' + x.driver : ''), x.rit + ' rit', x.penyebab === 'mekanik' ? 'merah' : x.penyebab === 'jalan' ? 'kuning' : '', x.alasan]; }) });
      if (T.patokan) M.blok.push({ t: 'catat', item: ['Target: ' + T.patokan + '. Rit dari DO admin. ' + (T.menungguDo && T.menungguDo.length ? T.menungguDo.length + ' unit menunggu DO admin (tidak dinilai). ' : '') + (T.tidakDihitung && T.tidakDihitung.length ? T.tidakDihitung.length + ' unit standby/off tidak dihitung.' : '') + (T.ritEstimasi ? ' Tonase estimasi untuk ' + T.ritEstimasi + ' rit tanpa tonase DO.' : '')] }); }
    return M;
  }
  function lukisTab(M) {
    var W = 1080, P = 56, cv = document.createElement('canvas'), c = cv.getContext('2d'), FN = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
    var WR = { merah: '#dc2c2c', kuning: '#d97706', hijau: '#15a34a' };
    function f(px, b) { c.font = (b ? '700 ' : '400 ') + px + 'px ' + FN; }
    function bungkus(t, px, b, lebar) { f(px, b); var k = String(t == null ? '' : t).split(/\s+/), L = [], s = ''; k.forEach(function (w) { var u = s ? s + ' ' + w : w; if (c.measureText(u).width > lebar && s) { L.push(s); s = w; } else s = u; }); if (s) L.push(s); return L.length ? L : ['']; }
    function jalan(gambar) {
      var y = 0; if (gambar) { c.fillStyle = '#eef3f9'; c.fillRect(0, 0, W, cv.height); c.fillStyle = '#0b2f63'; c.fillRect(0, 0, W, 190); }
      if (gambar) { c.fillStyle = '#fff'; f(56, 1); c.fillText(M.judul, P, 92); f(28); c.fillStyle = '#c9d8f0'; c.fillText(M.sub, P, 140, W - 2 * P); }
      y = 230;
      M.blok.forEach(function (b) {
        if (b.t === 'kpi') { var n = b.item.length, g = 16, w = (W - 2 * P - g * (n - 1)) / n;
          b.item.forEach(function (it, i) { var x = P + i * (w + g); if (gambar) { c.fillStyle = '#fff'; c.fillRect(x, y, w, 150); c.fillStyle = '#5b6b82'; f(28, 1); c.fillText(String(it[0]), x + 20, y + 46, w - 30); c.fillStyle = '#0f1b2d'; f(60, 1); c.fillText(it[1] == null ? '–' : String(typeof it[1] === 'number' ? it[1].toLocaleString('id-ID') : it[1]), x + 20, y + 120, w - 30); } });
          y += 180; return; }
        if (b.j) { if (gambar) { c.fillStyle = '#0b2f63'; f(36, 1); c.fillText(b.j, P, y + 36, W - 2 * P); } y += 60; }
        if (b.t === 'poin' || b.t === 'catat') { (b.item || []).forEach(function (t, i) { var px = b.t === 'catat' ? 26 : 32, L = bungkus((b.t === 'poin' ? (i + 1) + '. ' : '') + t, px, false, W - 2 * P - 20);
          if (gambar) { c.fillStyle = b.t === 'catat' ? '#5b6b82' : '#0f1b2d'; L.forEach(function (s, j) { f(px); c.fillText(s, P + 10, y + px + j * (px + 12)); }); } y += L.length * (px + 12) + 14; }); y += 10; return; }
        if (b.t === 'daftar') { (b.baris || []).slice(0, 40).forEach(function (r) { var L = bungkus(r[0], 32, true, W - 2 * P - 260), L2 = r[3] ? bungkus(r[3], 26, false, W - 2 * P - 40) : [], h = L.length * 42 + L2.length * 34 + 28;
          if (gambar) { c.fillStyle = '#fff'; c.fillRect(P, y, W - 2 * P, h - 8); if (r[2]) { c.fillStyle = WR[r[2]] || '#7a8aa3'; c.fillRect(P, y, 10, h - 8); }
            c.fillStyle = '#0f1b2d'; L.forEach(function (s, j) { f(32, 1); c.fillText(s, P + 28, y + 44 + j * 42); }); c.fillStyle = WR[r[2]] || '#0f1b2d'; f(32, 1); c.textAlign = 'right'; c.fillText(String(r[1] == null ? '' : r[1]), W - P - 20, y + 44); c.textAlign = 'left';
            c.fillStyle = '#5b6b82'; L2.forEach(function (s, j) { f(26); c.fillText(s, P + 28, y + 44 + L.length * 42 + j * 34 - 6); }); }
          y += h; }); y += 16; }
      });
      if (gambar) { c.fillStyle = '#7a8aa3'; f(24); c.fillText('Asisten Saya · Fanza · App WHL', P, y + 40); }
      return y + 80;
    }
    cv.width = W; cv.height = 400; var H = jalan(false); cv.height = Math.max(600, Math.min(H, 14000)); jalan(true); return cv;
  }
  function eksporGambar() {
    var M = modelTab(), cv; try { cv = lukisTab(M); } catch (e) { roti('Gambar gagal dibuat.'); return; }
    var nama = 'Asisten-' + M.judul.replace(/[^A-Za-z0-9]+/g, '-') + '-' + String((DATA && DATA.hari) || '') + '.png';
    cv.toBlob(function (bl) {
      if (!bl) { roti('Gambar gagal dibuat.'); return; }
      var file = null; try { file = new File([bl], nama, { type: 'image/png' }); } catch (e) { file = null; }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: M.judul }).catch(function () { /* dibatalkan */ }); return; }
      var fr = new FileReader(); fr.onload = function () { var b64 = String(fr.result).split(',')[1];
        if (window.WHL_BERKAS && window.WHL_BERKAS.buka) { window.WHL_BERKAS.buka(nama, b64, 'image/png').then(function () { roti('Gambar disimpan.'); }, function () { roti('Gambar gagal disimpan.'); }); return; }
        var a = document.createElement('a'); a.href = fr.result; a.download = nama; document.body.appendChild(a); a.click(); a.remove(); roti('Gambar diunduh.'); };
      fr.readAsDataURL(bl);
    }, 'image/png');
  }
  window.__afModelTab = modelTab; window.__afLukisTab = lukisTab;

  /* ---------- klik ---------- */
  function klik(ev) {
    var b = ev.target.closest('[data-af]'); if (!b || !lapisEl || !lapisEl.contains(b)) return;
    var n = b.getAttribute('data-af'), p = n.split(':'), a = p[0], v = p.slice(1).join(':');
    if (a === 'tutup') { kembali(); return; }
    if (a === 'segar') { muat(true); gambarUlang(); return; }
    if (a === 'gambar') { getar(); eksporGambar(); return; } /* revisi2 */
    if (a === 'tab') { TAB = v; VENDOR = null; getar(); gambarUlang(); var g = lapisEl.querySelector('.ksnIsi'); if (g) g.scrollTop = 0; return; }
    if (a === 'acc') { getar(); bukaAcc(p[1], p.slice(2).join(':')); return; }
    if (a === 'brf') { SUB.brf = v; gambarUlang(); return; }
    if (a === 'peny') { SUB.peny = SUB.peny === v ? '' : v; gambarUlang(); return; }
    if (a === 'eva') { SUB.eva = v; gambarUlang(); return; }
    if (a === 'lap') { getar(); bukaLap(v); return; }
    if (a === 'salinBrf') { var B = DATA && DATA.briefing || {}, L = SUB.brf === 'sore' ? B.sore || [] : B.pagi || []; salin((SUB.brf === 'sore' ? 'Briefing sore ' : 'Briefing pagi ') + (DATA.label || '') + '\n' + L.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n')); return; }
    if (a === 'vendor') { ev.stopPropagation(); bukaVendor(v); return; }
    if (a === 'cek') { centang(v); return; }
    if (a === 'vpilih') { simpanTeks(); VENDOR.vendor = v; gambarUlang(); return; }
    if (a === 'vfoto') { simpanTeks(); var inp = lapisEl.querySelector(v === 'kamera' ? '#afVKam' : '#afVGal'); if (inp) inp.click(); return; }
    if (a === 'vhapus') { simpanTeks(); VENDOR.foto.splice(+v, 1); gambarUlang(); return; }
    if (a === 'vsimpan') { if (!VENDOR.sibuk) simpanVendor(); return; }
    if (a === 'vlihat') { lihatFoto(v); return; }
  }
  function simpanTeks() { var ta = lapisEl && lapisEl.querySelector('#afVCat'); if (ta && VENDOR) VENDOR.catatan = ta.value; }
  function ganti(ev) { var t = ev.target; if (t.id === 'afVKam' || t.id === 'afVGal') { simpanTeks(); tambahFoto(t.files); t.value = ''; } }
  function lupakan() { DATA = null; DATA_T = 0; GALAT = ''; VENDOR = null; tutup(); try { localStorage.removeItem(KUNCI); } catch (e) { /* */ } }

  window.WHL_ASISTEN = { boleh: boleh, milik: milik, kartuHtml: kartuHtml, buka: buka, muat: muat, kembali: kembali, tutup: tutup, lupakan: lupakan,
    _uji: { data: function () { return DATA; }, atur: function (d) { DATA = d; DATA_T = Date.now(); gambarUlang(); }, tab: function (t) { TAB = t; gambarUlang(); }, sub: SUB } };
})();
