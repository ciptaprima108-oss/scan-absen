/* DISALIN OTOMATIS dari pusat.html (DASHBOARD, sumber ca1e9198) oleh alat/salin-skema.mjs — JANGAN diedit di sini.
 * Skema Rute = panel "Jalur hauling sekarang · GPS nyata" Pusat WHL web. Data: ringkasanPusat bagian gps.skema (u[], f[]). */
(function () {
  "use strict";
  var D = { gps: {} };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); }
  var SK_RUAS = [["BSR", "107", 34], ["MIP", "107", 29], ["107", "PORT", 107], ["107", "POOL", 2]];
  var SK_RANK = { BSR: 0, MIP: 0, POOL: 0.5, "107": 1, PORT: 2 };
  var SK_SP = { POOL: { ic: "🅿️", nama: "POOL", rgb: "100,116,139", ket: "parkir / workshop" }, BSR: { ic: "⛏️", nama: "BSR", rgb: "167,139,250", ket: "pit — loading" },
    MIP: { ic: "⛏️", nama: "MIP", rgb: "244,114,182", ket: "pit — loading" }, "107": { ic: "🔄", nama: "107", rgb: "0,229,255", ket: "stockpile — bongkar/muat" },
    PORT: { ic: "⚓", nama: "PORT", rgb: "59,130,246", ket: "pelabuhan — bongkar" } };
  var SK_JALAN = { MUAT: { lbl: "Bermuatan", warna: "#22c55e" }, KOSONG: { lbl: "Kosong", warna: "#cbd5e1" }, "CEK ARAH": { lbl: "Cek arah", warna: "#ffb020" }, "?": { lbl: "Belum jelas", warna: "#94a3b8" } };
  var SK_TATA = {
    lebar: { W: 1000, H: 490, kol: 5, cw: 40, ch: 18, fs: 1, BSR: { x: 150, y: 118, chip: "bawah" }, MIP: { x: 150, y: 352, chip: "bawah" }, "107": { x: 500, y: 235, chip: "atas" }, POOL: { x: 500, y: 398, chip: "kanan" }, PORT: { x: 875, y: 235, chip: "bawah" } },
    tegak: { W: 460, H: 1040, kol: 3, cw: 46, ch: 21, fs: 1.25, BSR: { x: 105, y: 178, chip: "atas" }, MIP: { x: 355, y: 178, chip: "atas" }, "107": { x: 230, y: 500, chip: "kanan" }, POOL: { x: 88, y: 670, chip: "bawah" }, PORT: { x: 300, y: 850, chip: "bawah" } }
  };
  function skPendek(l) { var m = String(l).match(/(\d+)\s*$/); return m ? m[1] : String(l); }
  function skKmH(u) { return u.kh == null ? "–" : String(u.kh < 10 ? Math.round(u.kh * 10) / 10 : Math.round(u.kh)).replace(".", ","); }
  function skKmXY(lat, lng, lat0) { return { x: lng * 111.32 * Math.cos(lat0 * Math.PI / 180), y: lat * 110.57 }; }
  function skLetak(u, fB) {
    var best = null;
    if (u.lat && u.lng) SK_RUAS.forEach(function (r) {
      var A = fB[r[0]], B = fB[r[1]]; if (!A || !B) return;
      var a = skKmXY(A.lat, A.lng, A.lat), b = skKmXY(B.lat, B.lng, A.lat), p = skKmXY(u.lat, u.lng, A.lat);
      var vx = b.x - a.x, vy = b.y - a.y, L2 = (vx * vx + vy * vy) || 1, t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / L2; t = Math.max(0, Math.min(1, t));
      var dx = p.x - (a.x + t * vx), dy = p.y - (a.y + t * vy), d = Math.sqrt(dx * dx + dy * dy);
      if (!best || d < best.d) best = { r: r, t: t, d: d };
    });
    if (!best) { /* tebakan tanpa GPS */
      var km = u.km || 0;
      if (u.asal === "BSR" || u.asal === "MIP") best = { r: [u.asal, "107", u.asal === "BSR" ? 34 : 29], t: Math.min(1, km / (u.asal === "BSR" ? 34 : 29)) };
      else if (u.asal === "PORT") best = { r: ["107", "PORT", 107], t: Math.max(0, 1 - km / 107) };
      else if (u.asal === "POOL") best = { r: ["107", "POOL", 2], t: Math.max(0, 1 - km / 2) };
      else if (u.asal === "107") best = (u.muatan === "MUAT") ? { r: ["107", "PORT", 107], t: Math.min(1, km / 107) } : { r: ["BSR", "107", 34], t: Math.max(0, 1 - km / 34) };
    }
    if (!best) return null;
    var r = best.r, dir;
    if (u.asal === r[0]) dir = 1; else if (u.asal === r[1]) dir = -1;
    else { var naik = SK_RANK[r[1]] > SK_RANK[r[0]]; dir = (u.muatan === "MUAT") ? (naik ? 1 : -1) : (naik ? -1 : 1); }
    return { r: r, t: best.t, dir: dir };
  }
  function skemaSvg(mode) {
    var T = SK_TATA[mode] || SK_TATA.lebar, S = D.gps.skema || {}, fB = {}, W = T.W, H = T.H, fs = T.fs, o = [];
    (S.f || []).forEach(function (f) { if (f.la && f.lo) fB[f.k] = { lat: f.la, lng: f.lo }; });
    var units = (S.u || []).map(function (x) {
      var p = String(x.p || ""), u = { lambung: x.l, pendek: skPendek(x.l), lat: x.la, lng: x.lo, update: x.up || "", kh: x.kh, kat: "NONE" };
      if (p.indexOf("DI ") === 0) { u.kat = "DI"; u.sp = p.slice(3); u.akt = x.mu || ""; }
      else if (p === "JALAN") { u.kat = "JALAN"; u.muatan = SK_JALAN[x.mu] ? x.mu : "?"; u.asal = x.t || ""; u.km = Number(x.km) || 0; u.jam = x.j || ""; }
      return u;
    });
    var mono = 'font-family="ui-monospace,Consolas,monospace"';
    o.push('<svg class="skm skm-' + mode + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Skema rute hauling dan posisi unit (sama dengan halaman GPS)">');
    o.push('<defs><pattern id="skDot" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(160,210,220,.10)"/></pattern>'
      + '<filter id="skGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>');
    o.push('<rect width="' + W + '" height="' + H + '" fill="url(#skDot)"/>');
    /* jalan */
    SK_RUAS.forEach(function (r) {
      var A = T[r[0]], B = T[r[1]]; if (!A || !B) return;
      var dx = B.x - A.x, dy = B.y - A.y, L = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / L, ny = dx / L, naik = SK_RANK[r[1]] > SK_RANK[r[0]];
      var ln = function (off, dari) { var s = dari === "A" ? A : B, e = dari === "A" ? B : A; return "M" + (s.x + nx * off).toFixed(1) + " " + (s.y + ny * off).toFixed(1) + " L" + (e.x + nx * off).toFixed(1) + " " + (e.y + ny * off).toFixed(1); };
      var kecil = r[2] < 5;
      o.push('<path d="' + ln(0, "A") + '" stroke="#0f1b20" stroke-width="' + (kecil ? 18 : 30) + '" stroke-linecap="round"/>');
      o.push('<path d="' + ln(0, "A") + '" stroke="#1a2a31" stroke-width="' + (kecil ? 14 : 24) + '" stroke-linecap="round"/>');
      if (!kecil) {
        o.push('<path class="flow" d="' + (naik ? ln(6, "A") : ln(-6, "B")) + '" stroke="rgba(34,197,94,.75)" stroke-width="3" stroke-dasharray="12 24" stroke-linecap="round" fill="none"/>');
        o.push('<path class="flow lambat" d="' + (naik ? ln(-6, "B") : ln(6, "A")) + '" stroke="rgba(203,213,225,.45)" stroke-width="3" stroke-dasharray="12 24" stroke-linecap="round" fill="none"/>');
        o.push('<path d="' + ln(0, "A") + '" stroke="rgba(255,255,255,.10)" stroke-width="1" stroke-dasharray="4 6"/>');
      } else o.push('<path class="flow lambat" d="' + ln(0, "A") + '" stroke="rgba(203,213,225,.35)" stroke-width="2" stroke-dasharray="6 10" fill="none"/>');
      var mx = (A.x + B.x) / 2 + nx * (kecil ? -34 : 0), my = (A.y + B.y) / 2 + ny * (kecil ? -34 : 0);
      o.push('<g transform="translate(' + mx.toFixed(1) + "," + my.toFixed(1) + ')"><rect x="' + (-24 * fs) + '" y="' + (-10 * fs) + '" width="' + (48 * fs) + '" height="' + (19 * fs) + '" rx="' + (9.5 * fs) + '" fill="rgba(7,11,13,.85)" stroke="rgba(255,255,255,.12)"/>'
        + '<text y="' + (4 * fs) + '" text-anchor="middle" ' + mono + ' font-size="' + (10.5 * fs) + '" font-weight="700" fill="#9fb3c8">' + r[2] + " km</text></g>");
    });
    /* stasiun + chip unit di area */
    var di = {}; units.forEach(function (u) { if (u.kat === "DI") (di[u.sp] = di[u.sp] || []).push(u); });
    ["BSR", "MIP", "107", "POOL", "PORT"].forEach(function (k) {
      var P = T[k], c = SK_SP[k], col = "rgb(" + c.rgb + ")", list = di[k] || [];
      if (list.length) o.push('<circle class="stGlow" cx="' + P.x + '" cy="' + P.y + '" r="50" fill="rgba(' + c.rgb + ',.22)"/>');
      o.push('<circle cx="' + P.x + '" cy="' + P.y + '" r="36" fill="#0b1417" stroke="' + col + '" stroke-width="3" filter="url(#skGlow)"/>');
      o.push('<circle cx="' + P.x + '" cy="' + P.y + '" r="29" fill="rgba(' + c.rgb + ',.16)"/>');
      o.push('<text x="' + P.x + '" y="' + (P.y + 8) + '" text-anchor="middle" font-size="22">' + c.ic + "</text>");
      o.push('<g transform="translate(' + (P.x + 28) + "," + (P.y - 27) + ')"><circle r="14" fill="' + col + '" stroke="#0b1417" stroke-width="2.5"/><text y="4.5" text-anchor="middle" ' + mono + ' font-size="13" font-weight="800" fill="#061014">' + list.length + "</text></g>");
      var lblY = P.chip === "atas" ? P.y - 50 : (P.chip === "kanan" ? P.y - 6 : P.y + 56), lblX = P.chip === "kanan" ? P.x + 50 : P.x, anc = P.chip === "kanan" ? "start" : "middle";
      o.push('<text x="' + lblX + '" y="' + lblY + '" text-anchor="' + anc + '" ' + mono + ' font-size="' + (14 * fs) + '" font-weight="800" letter-spacing="1.5" fill="#e6f1f3">' + esc(c.nama) + "</text>");
      o.push('<text class="pk-sub" x="' + lblX + '" y="' + (lblY + 14 * fs) + '" text-anchor="' + anc + '" font-size="' + (10.5 * fs) + '" fill="#6f9391">' + esc(c.ket) + "</text>");
      var kol = T.kol, cw = T.cw, ch = T.ch, gap = 4, maks = kol * 3, tampil = list.slice(0, maks);
      tampil.forEach(function (u, i) {
        var row = Math.floor(i / kol), cl = i % kol, nRow = Math.min(kol, tampil.length - row * kol), x0, y0;
        if (P.chip === "kanan") { x0 = P.x + 50 + cl * (cw + gap); y0 = P.y + 14 + (fs - 1) * 12 + row * (ch + gap); }
        else { x0 = P.x - (nRow * (cw + gap) - gap) / 2 + cl * (cw + gap); y0 = P.chip === "atas" ? (P.y - 94 - row * (ch + gap)) : (P.y + 82 + (fs - 1) * 24 + row * (ch + gap)); }
        var aw = { LOADING: "#00e5ff", BONGKAR: "#ffb020", PARKIR: "#64748b" }[u.akt] || col;
        o.push('<g class="trk" data-info="' + esc(u.lambung + " · " + (u.akt ? u.akt.toLowerCase() + " di " : "di ") + k + " · update " + u.update) + '" style="cursor:pointer">'
          + '<rect class="tb" x="' + x0 + '" y="' + y0 + '" width="' + cw + '" height="' + ch + '" rx="5" fill="#132228" stroke="rgba(' + c.rgb + ',.55)"/>'
          + '<rect x="' + (x0 + 3) + '" y="' + (y0 + ch - 3) + '" width="' + (cw - 6) + '" height="2" rx="1" fill="' + aw + '"/>'
          + '<text x="' + (x0 + cw / 2) + '" y="' + (y0 + ch / 2 + 3.6 * fs) + '" text-anchor="middle" ' + mono + ' font-size="' + (10.5 * fs) + '" font-weight="700" fill="#e6f1f3">' + esc(u.pendek) + "</text></g>");
      });
      if (list.length > maks) { var yy = P.chip === "atas" ? P.y - 94 - 3 * (ch + gap) + 6 : (P.chip === "kanan" ? P.y + 14 + (fs - 1) * 12 + 3 * (ch + gap) + 12 : P.y + 82 + (fs - 1) * 24 + 3 * (ch + gap) + 12); o.push('<text x="' + (P.chip === "kanan" ? P.x + 50 : P.x) + '" y="' + yy + '" text-anchor="' + (P.chip === "kanan" ? "start" : "middle") + '" font-size="' + (10.5 * fs) + '" fill="#9fb3c8">+' + (list.length - maks) + " unit lagi</text>"); }
    });
    /* truk di jalan */
    var placed = [], tdk = [], nJalan = 0, nMuat = 0, nKosong = 0;
    units.filter(function (u) { return u.kat === "JALAN"; }).sort(function (a, b) { return b.km - a.km; }).forEach(function (u) {
      nJalan++; if (u.muatan === "MUAT") nMuat++; else if (u.muatan === "KOSONG") nKosong++;
      var pos = skLetak(u, fB); if (!pos || !T[pos.r[0]] || !T[pos.r[1]]) { tdk.push(u); return; }
      var A = T[pos.r[0]], B = T[pos.r[1]], dx = B.x - A.x, dy = B.y - A.y, L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
      var pendek = pos.r[2] < 5, t = pendek ? Math.max(0.38, Math.min(0.62, pos.t)) : Math.max(0.14, Math.min(0.86, pos.t)); /* jangan nabrak lingkaran stasiun */
      var bx = A.x + dx * t, by = A.y + dy * t, off = 24 * pos.dir, x = bx + nx * off, y = by + ny * off, k = 0;
      while (k < 5 && placed.some(function (p) { return Math.abs(p.x - x) < 46 && Math.abs(p.y - y) < 24; })) { k++; x += nx * 24 * pos.dir; y += ny * 24 * pos.dir; if (k === 3) { x = bx + nx * off + ux * 48; y = by + ny * off + uy * 48; } }
      placed.push({ x: x, y: y });
      var J = SK_JALAN[u.muatan] || SK_JALAN["?"], warna = J.warna;
      var ang = Math.atan2(uy * pos.dir, ux * pos.dir) * 180 / Math.PI, fx = ux * pos.dir * 29, fy = uy * pos.dir * 29;
      o.push('<g class="trk' + (u.muatan === "MUAT" ? " trukMuat" : "") + '" data-info="' + esc(u.lambung + " · " + J.lbl.toLowerCase() + " · dari " + (u.asal || "?") + " · keluar " + u.jam + " · KM hari ini " + skKmH(u) + " km · update " + u.update) + '" style="cursor:pointer" transform="translate(' + x.toFixed(1) + "," + y.toFixed(1) + ')">'
        + '<line x1="0" y1="0" x2="' + (-nx * off * 0.55).toFixed(1) + '" y2="' + (-ny * off * 0.55).toFixed(1) + '" stroke="' + warna + '" stroke-opacity=".35" stroke-width="1.5"/>'
        + '<g transform="translate(' + fx.toFixed(1) + "," + fy.toFixed(1) + ") rotate(" + ang.toFixed(1) + ')"><path d="M-2 -6 L7 0 L-2 6 Z" fill="' + warna + '" stroke="#0a0d0f" stroke-width="1"/></g>'
        + '<rect class="tb" x="-22" y="-11" width="44" height="22" rx="7" fill="' + warna + '" stroke="#0a0d0f" stroke-width="1.5"/>'
        + '<text y="4" text-anchor="middle" ' + mono + ' font-size="11" font-weight="800" fill="#061014">' + esc(u.pendek) + "</text>"
        + '<text y="24" text-anchor="middle" ' + mono + ' font-size="9" font-weight="700" fill="#9fb3c8">' + skKmH(u) + " km</text></g>");
    });
    o.push("</svg>");
    return { svg: o.join(""), jalan: nJalan, muat: nMuat, kosong: nKosong, tdk: tdk, unit: units.length };
  }
  window.WHL_SKEMA = { gambar: function (gps, mode) { D.gps = gps || {}; return skemaSvg(mode); }, JALAN: SK_JALAN, RUAS: SK_RUAS };
})();
