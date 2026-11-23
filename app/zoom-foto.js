/* v3.47 (23 Nov, keluhan Pak Fanza di iPad): penampil foto bisa di-ZOOM.
 * WHL_ZOOM.pasang(tg, kunci) -> tg = kotak berisi 1 <img>. Foto tampil UTUH (contain) di latar gelap,
 * cubit 2 jari = zoom (maks 5x), geser 1 jari saat di-zoom, ketuk 2x = zoom 2,5x / kembali, tombol + − ⟲.
 * Pakai Pointer Events + CSS transform sendiri (touch-action:none), jalan di Safari iPad/iPhone (PWA) & Android WebView.
 * kunci (mis. src foto): kalau kotak dirakit ulang (innerHTML) dengan foto yang sama, zoom terakhir dipulihkan.
 */
(function () {
  var MAKS = 5, SIMPAN = { k: '', s: 1, x: 0, y: 0 };
  function gaya() {
    if (document.getElementById('whlZoomGaya')) return;
    var st = document.createElement('style'); st.id = 'whlZoomGaya';
    st.textContent = '.whlZm{position:relative!important;flex:1 1 auto;min-height:0;overflow:hidden!important;touch-action:none;-webkit-user-select:none;user-select:none;background:#000;-webkit-touch-callout:none}'
      + '.whlZm>img{position:absolute!important;left:0;top:0;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;object-fit:contain!important;transform-origin:0 0;will-change:transform;-webkit-user-drag:none;user-select:none;pointer-events:none}'
      + '.whlZm .zmTb{position:absolute;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));display:flex;gap:6px;z-index:2}'
      + '.whlZm .zmTb button{width:42px;height:42px;border-radius:50%;border:0;background:rgba(255,255,255,.18);color:#fff;font:900 22px/1 system-ui,sans-serif;display:grid;place-items:center;padding:0;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}'
      + '.whlZm .zmTb button:active{background:rgba(255,255,255,.32)}'
      + '.whlZm .zmPr{position:absolute;left:12px;bottom:calc(18px + env(safe-area-inset-bottom));color:#fff;font:800 12px system-ui,sans-serif;background:rgba(0,0,0,.45);padding:4px 9px;border-radius:99px;z-index:2;opacity:0;transition:opacity .2s}.whlZm .zmPr.on{opacity:1}';
    document.head.appendChild(st);
  }
  function pasang(tg, kunci) {
    if (!tg) return null; var img = tg.querySelector('img'); if (!img) return null;
    gaya(); tg.classList.add('whlZm');
    var tb = document.createElement('div'); tb.className = 'zmTb';
    tb.innerHTML = '<button type="button" data-zm="kecil" aria-label="Perkecil">−</button><button type="button" data-zm="besar" aria-label="Perbesar">+</button><button type="button" data-zm="ulang" aria-label="Ukuran asli">⟲</button>';
    var pr = document.createElement('div'); pr.className = 'zmPr';
    tg.appendChild(tb); tg.appendChild(pr);
    var s = 1, x = 0, y = 0, P = {}, awal = null, ketukAkhir = 0, ketukX = 0, ketukY = 0, gerak = false, prT = 0;
    if (kunci && SIMPAN.k === kunci) { s = SIMPAN.s; x = SIMPAN.x; y = SIMPAN.y; }
    function ukuran() {
      var W = tg.clientWidth, H = tg.clientHeight, nw = img.naturalWidth || W, nh = img.naturalHeight || H;
      var r = Math.min(W / nw, H / nh) || 1, cw = nw * r, ch = nh * r;
      return { W: W, H: H, cw: cw, ch: ch, ox: (W - cw) / 2, oy: (H - ch) / 2 };
    }
    function jepit() {
      var u = ukuran();
      if (s < 1) s = 1; if (s > MAKS) s = MAKS;
      if (u.cw * s <= u.W) x = (u.W - u.cw * s) / 2 - u.ox * s; else x = Math.min(-u.ox * s, Math.max(u.W - (u.ox + u.cw) * s, x));
      if (u.ch * s <= u.H) y = (u.H - u.ch * s) / 2 - u.oy * s; else y = Math.min(-u.oy * s, Math.max(u.H - (u.oy + u.ch) * s, y));
    }
    function terap(anim) {
      jepit();
      img.style.transition = anim ? 'transform .22s ease-out' : 'none';
      img.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
      if (kunci) { SIMPAN.k = kunci; SIMPAN.s = s; SIMPAN.x = x; SIMPAN.y = y; }
      tg.setAttribute('data-skala', s.toFixed(2));
      pr.textContent = Math.round(s * 100) + '%'; pr.classList.add('on'); clearTimeout(prT); prT = setTimeout(function () { pr.classList.remove('on'); }, 900);
    }
    /* zoom ke skala ns dengan titik (px,py) relatif kotak tetap di tempat */
    function zoomKe(ns, px, py, anim) {
      ns = Math.max(1, Math.min(MAKS, ns));
      x = px - (px - x) * (ns / s); y = py - (py - y) * (ns / s); s = ns; terap(anim);
    }
    function titik(e) { var r = tg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function daftar() { return Object.keys(P).map(function (k) { return P[k]; }); }
    function mulaiGerak() {
      var a = daftar();
      if (a.length >= 2) { var d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1; awal = { jenis: 2, d: d, s: s, mx: (a[0].x + a[1].x) / 2, my: (a[0].y + a[1].y) / 2, x: x, y: y }; }
      else if (a.length === 1) awal = { jenis: 1, px: a[0].x, py: a[0].y, x: x, y: y };
      else awal = null;
    }
    tg.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('.zmTb')) return;
      try { tg.setPointerCapture(e.pointerId); } catch (er) { /* */ }
      var t = titik(e); P[e.pointerId] = { x: t.x, y: t.y, x0: t.x, y0: t.y }; if (daftar().length === 1) gerak = false; mulaiGerak(); e.preventDefault();
    });
    tg.addEventListener('pointermove', function (e) {
      if (!P[e.pointerId] || !awal) return; var t = titik(e); P[e.pointerId].x = t.x; P[e.pointerId].y = t.y;
      var a = daftar();
      if (awal.jenis === 2 && a.length >= 2) {
        gerak = true;
        var d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) || 1, mx = (a[0].x + a[1].x) / 2, my = (a[0].y + a[1].y) / 2;
        var ns = Math.max(1, Math.min(MAKS, awal.s * d / awal.d));
        /* titik awal di bawah jari tetap di bawah titik tengah jari sekarang */
        x = mx - (awal.mx - awal.x) * (ns / awal.s); y = my - (awal.my - awal.y) * (ns / awal.s); s = ns; terap(false);
      } else if (awal.jenis === 1 && a.length === 1) {
        var dx = t.x - awal.px, dy = t.y - awal.py; if (Math.abs(dx) + Math.abs(dy) > 8) gerak = true;
        if (s > 1.001) { x = awal.x + dx; y = awal.y + dy; terap(false); }
      }
      e.preventDefault();
    });
    function lepas(e) {
      var p = P[e.pointerId]; if (!p) return; delete P[e.pointerId];
      var sisa = daftar().length;
      if (!sisa && !gerak && e.type === 'pointerup') {
        var kini = Date.now(), t = titik(e);
        if (kini - ketukAkhir < 320 && Math.hypot(t.x - ketukX, t.y - ketukY) < 40) { ketukAkhir = 0; if (s > 1.05) { s = 1; x = 0; y = 0; terap(true); } else zoomKe(2.5, t.x, t.y, true); }
        else { ketukAkhir = kini; ketukX = t.x; ketukY = t.y; }
      }
      mulaiGerak();
    }
    tg.addEventListener('pointerup', lepas); tg.addEventListener('pointercancel', lepas); tg.addEventListener('lostpointercapture', lepas);
    /* Safari lama: cegah zoom halaman bawaan */
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) { tg.addEventListener(n, function (e) { e.preventDefault(); }); });
    tg.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    tg.addEventListener('dblclick', function (e) { e.preventDefault(); });
    /* laptop: roda mouse */
    tg.addEventListener('wheel', function (e) { e.preventDefault(); var t = titik(e); zoomKe(s * (e.deltaY < 0 ? 1.15 : 1 / 1.15), t.x, t.y, false); }, { passive: false });
    tb.addEventListener('click', function (e) {
      var b = e.target.closest('[data-zm]'); if (!b) return; e.stopPropagation(); e.preventDefault();
      var u = ukuran(), m = b.getAttribute('data-zm');
      if (m === 'besar') zoomKe(s * 1.6, u.W / 2, u.H / 2, true);
      else if (m === 'kecil') zoomKe(s / 1.6, u.W / 2, u.H / 2, true);
      else { s = 1; x = 0; y = 0; terap(true); }
    });
    tb.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
    function siap() { terap(false); pr.classList.remove('on'); }
    if (img.complete && img.naturalWidth) siap(); else img.addEventListener('load', siap);
    var ro = null; try { ro = new ResizeObserver(function () { terap(false); pr.classList.remove('on'); }); ro.observe(tg); } catch (er) { window.addEventListener('resize', function () { if (document.body.contains(tg)) terap(false); }); }
    return { skala: function () { return s; }, ulang: function () { s = 1; x = 0; y = 0; terap(true); } };
  }
  window.WHL_ZOOM = { pasang: pasang, lupakan: function () { SIMPAN = { k: '', s: 1, x: 0, y: 0 }; } };
})();
