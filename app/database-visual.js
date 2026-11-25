/* WHL App — DATABASE VISUAL (app-database-visual-25nov, Vanesa 25 Nov 2026; masukan Pak Fanza:
 * "database ini memvisualkan data yang ada di sheet-nya, jadi kita tidak harus buka sheet, langsung lihat").
 * Dipakai database.js: hasil aksi server 'lihat' (PusatDatabaseVisual.gs) digambar seperti sheet:
 *   kartu angka + grafik ringkas (dipilih server per jenis blok) di atas, lalu tabel dengan header ASLI bertingkat (colspan dari sel gabung),
 *   kolom pertama beku, gulir samping di dalam kotak tabel, warna latar ikut sheet, baris TOTAL di bawah tabel terpisah.
 * Grafik: SVG sendiri (tanpa pustaka), satu sumbu, warna kategori tetap berurutan (biru, oranye, hijau toska, kuning; tervalidasi CVD
 *   terang & gelap), legenda untuk >= 2 seri, ketuk / arahkan batang = angka. Tabel di bawahnya = tampilan data lengkap.
 * Semua teks di-escape. Tanpa alert/confirm/prompt. Baca saja.
 */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function angka(n) { n = Number(n) || 0; var r = Math.round(n * 100) / 100; try { return r.toLocaleString('id-ID'); } catch (e) { return String(r); } }

  function pasangGaya() {
    if (document.getElementById('pdbVisGaya')) return;
    var st = document.createElement('style'); st.id = 'pdbVisGaya';
    st.textContent = [
      '.pdbLapis{--pdbS1:#2a78d6;--pdbS2:#eb6834;--pdbS3:#1baf7a;--pdbS4:#eda100}',
      'html[data-tema="gelap"] .pdbLapis{--pdbS1:#3987e5;--pdbS2:#d95926;--pdbS3:#199e70;--pdbS4:#c98500}',
      '.pdbVJdl{font-size:15px;font-weight:900;margin:2px 2px 8px;line-height:1.3}.pdbVSub{font-size:12px;color:var(--redup);font-weight:700;margin:-4px 2px 10px}',
      '.pdbVBlok{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:10px;-webkit-overflow-scrolling:touch}.pdbVBlok button{flex:none;font-size:12.5px;font-weight:800;padding:8px 12px;border-radius:999px;border:1px solid var(--garis);background:var(--panel);color:var(--redup);min-height:38px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pdbVBlok button.on{background:var(--utama);color:#fff;border-color:transparent}',
      '.pdbKpi{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:10px}@media (min-width:700px){.pdbKpi{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}}',
      '.pdbKpi div{background:var(--panel);border:1px solid var(--garis);border-radius:14px;padding:10px 12px;box-shadow:var(--bayang);min-width:0}',
      '.pdbKpi small{display:block;font-size:11.5px;font-weight:800;color:var(--redup);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pdbKpi b{display:block;font-size:21px;font-weight:900;line-height:1.2;margin-top:2px;word-break:break-word}.pdbKpi i{display:block;font-style:normal;font-size:11px;color:var(--redup);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.pdbGraf{background:var(--panel);border:1px solid var(--garis);border-radius:16px;padding:12px 12px 8px;margin-bottom:10px;box-shadow:var(--bayang)}',
      '.pdbGraf h5{margin:0 0 6px;font-size:13.5px;font-weight:900}.pdbGraf svg{display:block;width:100%;height:auto;overflow:visible}',
      '.pdbLeg{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:11.5px;font-weight:700;color:var(--redup);margin-bottom:6px}.pdbLeg span{display:inline-flex;align-items:center;gap:5px}.pdbLeg i{width:10px;height:10px;border-radius:3px;display:inline-block}',
      '.pdbCap{font-size:12px;font-weight:700;color:var(--teks);min-height:18px;margin-top:4px}',
      '.pdbGraf .ax{fill:var(--redup);font-size:10px}.pdbGraf .gl{stroke:var(--garis);stroke-width:1}.pdbGraf .bs{stroke:var(--redup);stroke-width:1;opacity:.6}.pdbGraf .lb{fill:var(--teks);font-size:10.5px;font-weight:700}.pdbGraf rect.br{cursor:pointer}',
      '.pdbVTbl{overflow:auto;-webkit-overflow-scrolling:touch;border:1px solid var(--garis);border-radius:14px;background:var(--panel);margin-bottom:10px;max-height:70vh}',
      '.pdbVTbl table{border-collapse:separate;border-spacing:0;font-size:12.5px;min-width:100%}',
      '.pdbVTbl th,.pdbVTbl td{padding:6px 8px;border-bottom:1px solid var(--garis);border-right:1px solid var(--garis);white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis}',
      '.pdbVTbl thead th{position:sticky;background:var(--panel2);font-weight:800;text-align:center;z-index:2;font-size:12px}',
      '.pdbVTbl td:not([data-w]){color:var(--teks)}.pdbVTbl th.lebar{text-align:left}.pdbVTbl th.lebar span{position:sticky;left:120px;display:inline-block}',
      '.pdbVTbl td.n{text-align:right;font-variant-numeric:tabular-nums}.pdbVTbl td.k,.pdbVTbl th.k{position:sticky;left:0;z-index:1;background:var(--panel);font-weight:800;text-align:left}.pdbVTbl thead th.k{z-index:3;background:var(--panel2)}',
      '.pdbVTbl tbody tr{cursor:pointer}.pdbVTbl tr.sorot td{box-shadow:inset 0 0 0 9999px rgba(251,191,36,.28)}.pdbVTbl tfoot td{font-weight:900;background:var(--panel2);position:sticky;bottom:0}.pdbVTbl tfoot td.k{z-index:2}',
      'html[data-tema="gelap"] .pdbVTbl td[data-w],html[data-tema="gelap"] .pdbVTbl th[data-w]{filter:saturate(.8)}',
      '.pdbVCat{font-size:12.5px;color:var(--redup);line-height:1.5;margin:0 2px 10px;white-space:pre-wrap}'
    ].join('');
    document.head.appendChild(st);
  }

  /* ---------- warna sel dari sheet: teks hitam/putih menurut terang latar; gelap = dicampur ke panel ---------- */
  function gayaW(vis, w) {
    if (w == null || w < 0 || !vis.warna || !vis.warna[w]) return '';
    var c = String(vis.warna[w]), m = c.match(/^#([0-9a-f]{6})$/i); if (!m) return '';
    var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, L = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    var gelap = document.documentElement.getAttribute('data-tema') === 'gelap';
    if (gelap) return ' data-w="1" style="background:color-mix(in srgb,' + c + ' 38%,var(--panel));' + (L < 0.45 ? 'color:#fff' : '') + '"';
    return ' data-w="1" style="background:' + c + ';color:' + (L < 0.5 ? '#fff' : '#111') + '"';
  }

  /* ---------- grafik ---------- */
  function lebarSvg() { return Math.round(Math.min(640, Math.max(300, (window.innerWidth || 640) - 60))); } /* HP: viewBox selebar layar supaya huruf tetap terbaca */
  function langkah(maks) { if (maks <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log(maks / 3) / Math.LN10)), k = maks / 3 / p; return (k <= 1 ? 1 : k <= 2 ? 2 : k <= 5 ? 5 : 10) * p; }
  function legenda(g) { return g.seri.length > 1 ? '<div class="pdbLeg">' + g.seri.map(function (s, i) { return '<span><i style="background:var(--pdbS' + (i + 1) + ')"></i>' + esc(s.n) + '</span>'; }).join('') + '</div>' : ''; }
  function batang(g, gi) {
    var n = g.x.length, W = lebarSvg(), H = W < 500 ? 170 : 200, kiri = 34, bawah = 22, atas = 8, lebar = W - kiri - 6, tinggi = H - bawah - atas;
    var tot = g.x.map(function (x, i) { return g.seri.reduce(function (a, s) { return a + (Number(s.d[i]) || 0); }, 0); }), maks = Math.max.apply(null, tot.concat([0]));
    var st = langkah(maks), atasNilai = Math.max(st, Math.ceil(maks / st) * st), lb = lebar / Math.max(n, 1), bw = Math.max(2, Math.min(28, lb * 0.72));
    var y = function (v) { return atas + tinggi - (v / atasNilai) * tinggi; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(g.j) + '">';
    for (var t = 0; t <= atasNilai + 1e-9; t += st) s += '<line class="gl" x1="' + kiri + '" x2="' + (W - 6) + '" y1="' + y(t) + '" y2="' + y(t) + '"/><text class="ax" x="' + (kiri - 5) + '" y="' + (y(t) + 3) + '" text-anchor="end">' + esc(angka(t)) + '</text>';
    var iMaks = tot.indexOf(maks);
    g.x.forEach(function (x, i) {
      var cx = kiri + lb * i + (lb - bw) / 2, dasar = 0;
      g.seri.forEach(function (se, k) {
        var v = Number(se.d[i]) || 0; if (!v) return;
        var y1 = y(dasar + v), y0 = y(dasar); dasar += v;
        s += '<rect class="br" data-p="vgraf:' + gi + ':' + i + '" x="' + cx.toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0.5, y0 - y1 - (k < g.seri.length - 1 ? 0 : 0)).toFixed(1) + '" fill="var(--pdbS' + (k + 1) + ')" stroke="var(--panel)" stroke-width="1"><title>' + esc(x + ' · ' + se.n + ': ' + angka(v)) + '</title></rect>';
      });
      var mk = Math.max(4, Math.floor(W / 40)), tamp = n <= mk || i % Math.ceil(n / mk) === 0 || i === n - 1;
      if (tamp) s += '<text class="ax" x="' + (cx + bw / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(String(x).slice(0, 6)) + '</text>';
      s += '<rect data-p="vgraf:' + gi + ':' + i + '" x="' + (kiri + lb * i).toFixed(1) + '" y="' + atas + '" width="' + lb.toFixed(1) + '" height="' + tinggi + '" fill="transparent"/>'; /* sasaran ketuk lebih besar dari batang */
    });
    if (maks > 0 && iMaks >= 0) s += '<text class="lb" x="' + (kiri + lb * iMaks + lb / 2).toFixed(1) + '" y="' + (y(maks) - 4).toFixed(1) + '" text-anchor="middle">' + esc(angka(maks)) + '</text>';
    s += '<line class="bs" x1="' + kiri + '" x2="' + (W - 6) + '" y1="' + y(0) + '" y2="' + y(0) + '"/></svg>';
    return s;
  }
  function mendatar(g, gi) {
    var n = g.x.length, W = lebarSvg(), baris = 24, H = n * baris + 6, kiri = Math.round(W * 0.3), kanan = 44, lebar = W - kiri - kanan;
    var d = g.seri[0].d, maks = Math.max.apply(null, d.map(Number).concat([0])) || 1;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(g.j) + '">';
    g.x.forEach(function (x, i) {
      var v = Number(d[i]) || 0, w = Math.max(1, v / maks * lebar), yy = 3 + i * baris;
      s += '<text class="ax" x="' + (kiri - 8) + '" y="' + (yy + 15) + '" text-anchor="end" style="font-size:11px">' + esc(String(x).length > Math.floor(kiri / 7) ? String(x).slice(0, Math.floor(kiri / 7) - 1) + '…' : x) + '</text>'
        + '<rect class="br" data-p="vgraf:' + gi + ':' + i + '" x="' + kiri + '" y="' + (yy + 4) + '" width="' + w.toFixed(1) + '" height="' + (baris - 9) + '" rx="3" fill="var(--pdbS1)"><title>' + esc(x + ': ' + angka(v)) + '</title></rect>'
        + '<text class="lb" x="' + (kiri + w + 6).toFixed(1) + '" y="' + (yy + 15) + '">' + esc(angka(v)) + '</text>';
    });
    return s + '<line class="bs" x1="' + kiri + '" x2="' + kiri + '" y1="0" y2="' + H + '"/></svg>';
  }
  function grafikHtml(blk, T) {
    return (blk.grafik || []).map(function (g, gi) {
      return '<div class="pdbGraf"><h5>' + esc(g.j) + (g.sat ? ' <span style="color:var(--redup);font-weight:700">(' + esc(g.sat) + ')</span>' : '') + '</h5>' + legenda(g) + (g.t === 'mendatar' ? mendatar(g, gi) : batang(g, gi))
        + '<div class="pdbCap" id="pdbCap' + gi + '">' + (T && T.vCap && T.vCap.g === gi ? esc(T.vCap.t) : '<span style="color:var(--redup)">Ketuk batang untuk melihat angkanya.</span>') + '</div></div>';
    }).join('');
  }
  function kpiHtml(blk) { return blk.kpi && blk.kpi.length ? '<div class="pdbKpi">' + blk.kpi.map(function (k) { return '<div><small title="' + esc(k.l) + '">' + esc(k.l) + '</small><b>' + esc(k.n) + '</b>' + (k.k ? '<i>' + esc(k.k) + '</i>' : '') + '</div>'; }).join('') + '</div>' : ''; }

  /* ---------- tabel seperti sheet ---------- */
  function cocok(row, q) {
    if (!q) return true; var T = row.v.join(' ').toUpperCase(), R = T.replace(/[^A-Z0-9]/g, ''), Q = String(q).toUpperCase().trim();
    return Q.split(/\s+/).every(function (w) { return T.indexOf(w) >= 0; }) || (Q.replace(/[^A-Z0-9]/g, '').length >= 3 && R.indexOf(Q.replace(/[^A-Z0-9]/g, '')) >= 0);
  }
  function tabel(vis, T) {
    var bi = T.vb || 0, blk = vis.blok[bi]; if (!blk || !blk.kol.length) return '';
    var q = T.vSaring || '', L = blk.baris.map(function (b, j) { return [b, j]; }).filter(function (p) { return cocok(p[0], q); });
    var head = (blk.lev && blk.lev.length ? blk.lev : [blk.kol.map(function (k) { return { t: k.n, s: 1 }; })]).map(function (lv, li, semua) {
      var pos = 0;
      return '<tr>' + lv.map(function (c) { var k = pos === 0; pos += c.s; return '<th colspan="' + c.s + '"' + (k ? ' class="k"' : c.s > 6 ? ' class="lebar"' : '') + ' style="top:' + (li * 29) + 'px"' + gayaW(vis, c.w) + '><span>' + esc(c.t) + '</span></th>'; /* judul bentang lebar: teks menempel kiri saat digulir */ }).join('') + '</tr>';
    }).join('');
    var sel = function (b, i, w) { var k = blk.kol[i], an = k.a || /^-?[\d.,]+$/.test(String(b.v[i] || '').trim()); return '<td class="' + (i === 0 ? 'k' : '') + (an ? ' n' : '') + '"' + (w ? gayaW(vis, w[i]) : '') + (k.s ? ' title="disamarkan"' : '') + '>' + esc(b.v[i]) + '</td>'; };
    var body = L.map(function (p) { var b = p[0]; return '<tr data-p="vbaris:' + bi + ':' + p[1] + '"' + (T.sorot === b.r ? ' class="sorot"' : '') + '>' + b.v.map(function (x, i) { return sel(b, i, b.w); }).join('') + '</tr>'; }).join('');
    var foot = (blk.rekap || []).map(function (b) { return '<tr>' + b.v.map(function (x, i) { return sel(b, i, null); }).join('') + '</tr>'; }).join('');
    return '<div class="pdbJml">' + (q ? L.length + ' dari ' : '') + angka(blk.jmlBaris) + ' baris' + (blk.terpotong ? ' (tampil 600 pertama)' : '') + ' · ' + blk.kol.length + ' kolom · ketuk baris untuk rincian</div>'
      + '<div class="pdbVTbl"><table><thead>' + head + '</thead><tbody>' + (body || '<tr><td colspan="' + blk.kol.length + '" style="text-align:center;color:var(--redup);padding:18px">Tidak ada baris yang cocok.</td></tr>') + '</tbody>' + (foot ? '<tfoot>' + foot + '</tfoot>' : '') + '</table></div>';
  }
  function bisaDilihat(blk) { return blk && (blk.kol.length || (blk.catatan || []).length); }
  /** Bagian atas (pilih blok + judul + kartu + grafik). pakaiIsi = daftar panjang: tabel dari aksi 'isi' (database.js). */
  function atas(vis, T) {
    pasangGaya();
    var B = vis.blok.filter(bisaDilihat); if (!B.length) return '<div class="pdbKosong">Tab ini kosong.</div>';
    if (T.vb == null || !vis.blok[T.vb] || !bisaDilihat(vis.blok[T.vb])) T.vb = vis.blok.indexOf(B[0]);
    var blk = vis.blok[T.vb];
    var pil = B.length > 1 ? '<div class="pdbVBlok">' + vis.blok.map(function (b, i) { return bisaDilihat(b) && b.kol.length ? '<button type="button" data-p="vblok:' + i + '" class="' + (i === T.vb ? 'on' : '') + '">' + esc(b.judul || ('Tabel ' + (i + 1))) + '</button>' : ''; }).join('') + '</div>' : '';
    return pil + (blk.judul ? '<div class="pdbVJdl">' + esc(blk.judul) + '</div>' : '') + (vis.dariCache ? '' : '') + kpiHtml(blk) + grafikHtml(blk, T);
  }
  function bawah(vis, T) {
    var blk = vis.blok[T.vb || 0]; if (!blk) return '';
    return (blk.kol.length && !blk.pakaiIsi ? '<form class="pdbCari" id="pdbFormVis" autocomplete="off"><input type="search" class="isian" id="pdbQVis" placeholder="Saring baris di tabel ini…" value="' + esc(T.vSaring || '') + '" enterkeyhint="search" aria-label="Saring tabel"><button type="submit">Saring</button></form><div id="pdbVisTbl">' + tabel(vis, T) + '</div>' : '')
      + ((blk.catatan || []).length ? '<div class="pdbVCat">' + esc(blk.catatan.join('\n')) + '</div>' : '')
      + (vis.kolomLebih ? '<div class="pdbKet">Tab ini lebih dari 160 kolom; yang tampil 160 kolom pertama.</div>' : '');
  }
  /** Ketukan di layar visual. true = sudah ditangani (database.js menggambar ulang). */
  function klik(n, v, T) {
    if (!T || !T.vis) return false;
    if (n === 'vblok') { T.vb = Number(v) || 0; T.vSaring = ''; T.vCap = null; return true; }
    if (n === 'vgraf') {
      var p = v.split(':'), gi = Number(p[0]), i = Number(p[1]), g = T.vis.blok[T.vb || 0].grafik[gi]; if (!g) return false;
      var t = (/per hari/.test(g.j) && /^\d{1,2}$/.test(g.x[i]) ? 'Tgl ' : '') + g.x[i] + ' — ' + g.seri.map(function (s) { return (g.seri.length > 1 ? s.n + ': ' : '') + angka(s.d[i]); }).join(' · ') + (g.seri.length > 1 ? ' · total ' + angka(g.seri.reduce(function (a, s) { return a + (Number(s.d[i]) || 0); }, 0)) : '') + (g.sat ? ' ' + g.sat : '');
      T.vCap = { g: gi, t: t }; var el = document.getElementById('pdbCap' + gi); if (el) { el.textContent = t; return 'diam'; } return true;
    }
    return false;
  }
  /** Rincian 1 baris (untuk lembar detail database.js). */
  function rincian(vis, bi, j) { var blk = vis.blok[bi], b = blk && blk.baris[j]; return b ? { r: b.r, kol: blk.kol, v: b.v } : null; }

  window.WHL_PDB_VIS = { atas: atas, bawah: bawah, tabel: tabel, klik: klik, rincian: rincian, _uji: { batang: batang, mendatar: mendatar, cocok: cocok, gayaW: gayaW } };
})();
