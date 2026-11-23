/* v3.48 pasangan laptop.css — hanya aktif di layar lebar (>= 1200 px) dengan mouse/touchpad. Di HP/tablet tidak melakukan apa-apa.
 *  1. Menu samping diklik saat layar modul (lapis) masih terbuka -> modul ditutup dulu lewat tombol Kembali app (WHL_KEMBALI),
 *     sama seperti tombol Back Android (diulang s/d 10x untuk layar dalam), jadi draf isian modul tetap disimpan modul seperti biasa.
 *     Kalau modul membuka pertanyaan/konfirmasi atau tetap terbuka, klik menu dibatalkan supaya pertanyaan modul terlihat.
 *  2. Tombol Esc = Kembali (hanya kalau ada lapis / lembar terbuka; di layar utama Esc tidak berbuat apa-apa).
 *  3. html.laptop dipasang (penanda saja, untuk uji).
 */
(function () {
  'use strict';
  var mq; try { mq = window.matchMedia('(min-width:1200px) and (hover:hover) and (pointer:fine)'); } catch (e) { return; }
  function aktif() { return !!(mq && mq.matches); }
  function tanda() { document.documentElement.classList.toggle('laptop', aktif()); }
  tanda(); try { mq.addEventListener('change', tanda); } catch (e) { try { mq.addListener(tanda); } catch (x) { /* */ } }
  function terbuka() { return document.querySelectorAll('body > .lapis.tampil:not(.pinLapis):not(.kgSpesial), .tirai.buka').length; }
  function tutupSemua() {
    if (typeof window.WHL_KEMBALI !== 'function') return true;
    for (var i = 0; i < 10; i++) {
      var n = terbuka(); if (!n) return true;
      window.WHL_KEMBALI();
      if (terbuka() > n) return false; /* modul membuka pertanyaan/konfirmasi -> biarkan orangnya menjawab */
    } /* jumlah sama = mundur dari layar dalam (mis. rincian unit -> daftar), lanjut sampai modul tertutup */
    return !terbuka();
  }
  document.addEventListener('click', function (ev) {
    if (!aktif() || !ev.target || !ev.target.closest) return;
    var b = ev.target.closest('#layarApp .nav button'); if (!b || !terbuka()) return;
    if (!tutupSemua()) { ev.preventDefault(); ev.stopPropagation(); }
  }, true);
  document.addEventListener('keydown', function (ev) {
    if (!aktif() || ev.key !== 'Escape' || ev.defaultPrevented) return;
    if (!terbuka() || typeof window.WHL_KEMBALI !== 'function') return;
    ev.preventDefault(); window.WHL_KEMBALI();
  });
})();
