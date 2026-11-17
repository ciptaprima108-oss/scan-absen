/* WHL App v3.31 — IKON GABUNGAN (Reza 17 Nov: "ikon depan terlalu banyak") — Andro.
 * 3 kelompok jadi 1 ikon masing-masing di Beranda / Lainnya / Atur ikon:
 *   Hazard        = Lapor · Laporan saya · Validasi (hanya yang boleh validasi)          id hubHazard
 *   Gaji & Kasbon = Gaji driver / Cicilan karyawan · Kasbon · Dokumen (sesuai hak)       id hubGaji
 *   Poin WHL      = Poin & katalog · Peringkat · ACC (hak ACC) · Rekap (hak rekap)       id hubPoin
 * Cara kerja: app.js tetap membuat menu lama (id gaji/kasbon/dokkas/hazard/hazardCek/poin/peringkat/poinAcc/poinRekap) lalu memanggil
 * WHL_HUB.gabung(daftar) -> anggota diganti 1 ikon gabungan di posisi anggota pertama (lencana dijumlah). Ketuk ikon = tab pertama yang boleh.
 * Layar tiap modul tetap milik modulnya; hub.js menempelkan bilah tab di bawah kepala layar (juga kalau layar dibuka dari notifikasi /
 * deep link / kartu Beranda). Cuma 1 tab yang boleh = tanpa bilah (langsung layarnya). Pindah tab = buka modul tujuan lewat [data-ke] yang sama
 * dengan menu lama (jadi notifikasi & deep link lama tetap jalan), layar modul lain di kelompok yang sama ditutup.
 * Atur ikon: id lama yang tersimpan (whlBerandaIkon_<akun>) dimigrasi ke id gabungan (WHL_HUB.migrasi).
 */
(function () {
  'use strict';
  var HUB = [
    { k: 'hazard', id: 'hubHazard', ik: 'hazard', nama: 'Hazard', tab: [
      { k: 'lapor', nm: 'Lapor', dari: 'hazard', ke: 'hazard', kls: 'hzLapis' },
      { k: 'saya', nm: 'Laporan saya', dari: 'hazard', ke: 'hazard', kls: 'hzLapis', gulir: '#hzSaya' },
      { k: 'val', nm: 'Validasi', dari: 'hazardCek', ke: 'hazardCek', kls: 'hzLapis' }] },
    { k: 'gaji', id: 'hubGaji', ik: 'gaji', nama: 'Gaji & Kasbon', tab: [
      { k: 'gaji', nm: '', dari: 'gaji', ke: 'gaji', kls: 'gjiLapis' },
      { k: 'kasbon', nm: 'Kasbon', dari: 'kasbon', ke: 'kasbon', kls: 'kbLapis' },
      { k: 'dokkas', nm: 'Dokumen', dari: 'dokkas', ke: 'dokkas', kls: 'dkLapis' }] },
    { k: 'poin', id: 'hubPoin', ik: 'poin', nama: 'Poin WHL', tab: [
      { k: 'poin', nm: 'Poin & katalog', dari: 'poin', ke: 'poin', kls: 'pnLapis' },
      { k: 'peringkat', nm: 'Peringkat', dari: 'peringkat', ke: 'peringkat', kls: 'prkLapis' },
      { k: 'acc', nm: 'ACC', dari: 'poinAcc', ke: 'poinAcc', kls: 'pnLapis' },
      { k: 'rekap', nm: 'Rekap', dari: 'poinRekap', ke: 'poinRekap', kls: 'pnLapis' }] }
  ];
  var ADA = {}, PINDAH = 0, GULIR = null;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function hubDari(id) { for (var i = 0; i < HUB.length; i++) for (var j = 0; j < HUB[i].tab.length; j++) if (HUB[i].tab[j].dari === id) return HUB[i]; return null; }
  function hubK(k) { for (var i = 0; i < HUB.length; i++) if (HUB[i].k === k) return HUB[i]; return null; }

  /** daftar menu [ikon, label, ke, lencana, id] -> anggota kelompok diganti 1 ikon gabungan */
  function gabung(L) {
    var out = [], sudah = {};
    (L || []).forEach(function (x) {
      var h = x && hubDari(x[4]); if (!h) { out.push(x); return; }
      if (sudah[h.k]) return; sudah[h.k] = true;
      var anggota = L.filter(function (y) { return y && hubDari(y[4]) === h; }), tabs = [];
      h.tab.forEach(function (t) { var it = anggota.filter(function (y) { return y[4] === t.dari; })[0]; if (it) tabs.push({ t: t, it: it }); });
      ADA[h.k] = tabs;
      var badge = anggota.reduce(function (s, y) { return s + (Number(y[3]) || 0); }, 0);
      /* cuma 1 anggota (mis. Poin dimatikan server tapi Peringkat jalan; staf cuma Kasbon): ikon & nama anggota itu, ketuk langsung layarnya */
      var satu = tabs.length === 1 ? tabs[0].it : null;
      out.push([satu ? satu[0] : h.ik, satu ? satu[1] : h.nama, 'hub:' + h.k, badge, h.id]);
    });
    HUB.forEach(function (h) { if (!sudah[h.k]) ADA[h.k] = []; });
    return out;
  }
  /** id simpanan Atur ikon lama -> id gabungan; null kalau tidak ada yang berubah */
  function migrasi(ids) {
    if (!Array.isArray(ids)) return null; var b = [], ubah = false;
    ids.forEach(function (id) { var h = hubDari(id); if (h) { id = h.id; ubah = true; } if (b.indexOf(id) < 0) b.push(id); else ubah = true; });
    return ubah ? b : null;
  }

  /* ---------- buka & pindah tab ---------- */
  function klikKe(ke) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-ke', ke); b.style.display = 'none'; document.body.appendChild(b); try { b.click(); } finally { b.remove(); } }
  function lapisHub(k) { var h = hubK(k), kls = {}; if (!h) return []; h.tab.forEach(function (t) { kls[t.kls] = 1; }); return [].slice.call(document.querySelectorAll('body > .lapis')).filter(function (el) { return Object.keys(kls).some(function (c) { return el.classList.contains(c); }); }); }
  function tutupModul(el) {
    if (el.classList.contains('hzLapis') && window.WHL_HAZARD && window.WHL_HAZARD.tutup) { window.WHL_HAZARD.tutup(); return; }
    if (el.classList.contains('prkLapis') && window.WHL_PERINGKAT && window.WHL_PERINGKAT.tutup) { window.WHL_PERINGKAT.tutup(); return; }
    el.remove(); /* modul lain memeriksa document.body.contains(lapisEl) -> buat layar baru saat dibuka lagi */
  }
  function bukaTab(k, i) {
    var tabs = ADA[k] || [], x = tabs[i]; if (!x) return;
    lapisHub(k).forEach(function (el) { if (!el.classList.contains(x.t.kls)) tutupModul(el); });
    PINDAH = Date.now(); GULIR = x.t.gulir ? { sel: x.t.gulir, t: Date.now() } : null;
    klikKe(x.t.ke);
    if (x.t.gulir) [500, 1300].forEach(function (ms) { setTimeout(gulirKe, ms); });
    setTimeout(function () { lapisHub(k).forEach(pasangBilah); }, 30);
  }
  function gulirKe() { if (!GULIR || Date.now() - GULIR.t > 2500) return; var el = document.querySelector('body > .lapis.hzLapis ' + GULIR.sel); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function bukaHub(k) { var tabs = ADA[k] || []; if (!tabs.length) return; bukaTab(k, 0); }

  /* ---------- bilah tab di layar modul ---------- */
  function kenali(el) {
    if (!el || !el.classList || !el.classList.contains('lapis')) return null;
    var j = (el.querySelector('.ksnKp .nm b') || {}).textContent || el.getAttribute('data-j') || '';
    if (el.classList.contains('hzLapis')) return { k: 'hazard', tab: /Validasi/i.test(j) ? 'val' : (GULIR && Date.now() - GULIR.t < 2500 ? 'saya' : 'lapor') };
    if (el.classList.contains('gjiLapis')) return { k: 'gaji', tab: 'gaji' };
    if (el.classList.contains('kbLapis')) return { k: 'gaji', tab: 'kasbon' };
    if (el.classList.contains('dkLapis')) return { k: 'gaji', tab: 'dokkas' };
    if (el.classList.contains('prkLapis')) return { k: 'poin', tab: 'peringkat' };
    if (el.classList.contains('pnLapis')) return { k: 'poin', tab: /^ACC tukar/i.test(j) ? 'acc' : /^Rekap tukar/i.test(j) ? 'rekap' : 'poin' };
    return null;
  }
  function bilahHtml(k, aktif) {
    var tabs = ADA[k] || [];
    return '<div class="hubTab" role="tablist" aria-label="' + esc((hubK(k) || {}).nama || '') + '">' + tabs.map(function (x, i) {
      var nm = x.t.nm || x.it[1], b = Number(x.it[3]) || 0, on = x.t.k === aktif || (aktif === 'saya' && false);
      return '<button type="button" role="tab" aria-selected="' + on + '" class="' + (on ? 'on' : '') + '" data-hubtab="' + k + ':' + i + '">' + esc(nm) + (b ? '<i>' + (b > 9 ? '9+' : b) + '</i>' : '') + '</button>';
    }).join('') + '</div>';
  }
  function pasangBilah(el) {
    var x = kenali(el); if (!x) return; var tabs = ADA[x.k] || [];
    var lama = el.querySelector(':scope > .hubTab');
    if (tabs.length < 2 || !tabs.some(function (y) { return y.t.k === x.tab || (x.tab === 'lapor' && y.t.k === 'lapor'); })) { if (lama) lama.remove(); return; }
    var kp = el.querySelector(':scope > .ksnKp'); if (!kp) return;
    var h = bilahHtml(x.k, x.tab); if (lama && lama.outerHTML === h) return;
    if (lama) lama.remove(); kp.insertAdjacentHTML('afterend', h);
    var on = el.querySelector('.hubTab button.on'); if (on && on.scrollIntoView) try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { /* */ }
  }
  function gaya() {
    if (document.getElementById('hubGaya')) return; var st = document.createElement('style'); st.id = 'hubGaya';
    st.textContent = '.hubTab{flex:none;display:flex;gap:6px;overflow-x:auto;padding:10px 14px 2px;max-width:560px;width:100%;margin:0 auto;box-sizing:border-box;scrollbar-width:none}.hubTab::-webkit-scrollbar{display:none}'
      + '.hubTab button{flex:none;display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:7px 14px;border-radius:99px;border:1px solid var(--garis);background:var(--panel);color:var(--redup);font:inherit;font-size:13.5px;font-weight:800;white-space:nowrap}'
      + '.hubTab button.on{background:var(--utama);border-color:var(--utama);color:#fff}.hubTab button i{font-style:normal;min-width:18px;height:18px;padding:0 5px;border-radius:99px;background:#F2484D;color:#fff;font-size:11px;line-height:18px;text-align:center}'
      + '.lapis.hubLangsung{transition:none!important}';
    document.head.appendChild(st);
  }
  var amati = new MutationObserver(function (M) {
    M.forEach(function (m) {
      if (m.target === document.body) {
        [].forEach.call(m.addedNodes, function (n) {
          if (!kenali(n)) return; gaya();
          if (Date.now() - PINDAH < 1500) n.classList.add('hubLangsung', 'tampil');
          pasangBilah(n); amatiLapis.observe(n, { childList: true });
        });
      }
    });
  });
  var amatiLapis = new MutationObserver(function (M) { var sudah = []; M.forEach(function (m) { if (sudah.indexOf(m.target) < 0) { sudah.push(m.target); pasangBilah(m.target); } }); });
  function mulai() { if (document.body) amati.observe(document.body, { childList: true }); else document.addEventListener('DOMContentLoaded', mulai); }
  mulai();
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-hubtab]');
    if (b) { var p = b.getAttribute('data-hubtab').split(':'); if (b.classList.contains('on') && p[0] !== 'hazard') return; if (window.WHL_RASA && window.WHL_RASA.getar) window.WHL_RASA.getar(); bukaTab(p[0], +p[1]); return; }
    var h = e.target.closest && e.target.closest('[data-ke^="hub:"]'); if (!h) return;
    bukaHub(h.getAttribute('data-ke').slice(4)); /* app.js menutup lembar Lainnya sendiri (cabang [data-ke]) */
  });
  window.WHL_HUB = { gabung: gabung, migrasi: migrasi, buka: bukaHub, bukaTab: bukaTab, tab: function (k) { return (ADA[k] || []).map(function (x) { return x.t.k; }); }, _kenali: kenali };
})();
