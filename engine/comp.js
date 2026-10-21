// =====================================================================
// 通用组件 · comp.js —— 所有画风共用，颜色和字体取自 THEME（换风格不用改场景代码）
// 约定：x,y 是像素；a 是不透明度 0..1；k 是动画进度 0..1（用 pr()/eo() 算出来再传进来）
// 颜色参数可以写 THEME 色名（'ink' 'soft' 'accent' 'accent2' 'neg' 'pos'）或 '#hex'
// =====================================================================
const col = v => (THEME.C[v] || v || THEME.C.ink);

// 大字（片名、关键数字、"换不换？"）：每个主题有自己的写法（金箔、点阵、粉笔、墨迹…）
function bigWord(c, s, x, y, size, a, lt, o = {}) {
  if (a <= 0) return;
  if (THEME.bigWord) return THEME.bigWord(c, s, x, y, size, a, lt, o);
  T(c, s, x, y + size * .35, F(900, size, THEME.F.heavy), col(o.color || 'accent'), 'center', o.ls || 0, a);
}
// 数字计数器：value 可以是小数；o.dec 小数位，o.pre / o.suf 前后缀
function counter(c, x, y, size, value, a, o = {}) {
  if (a <= 0) return;
  const s = (o.pre || '') + (o.dec ? value.toFixed(o.dec) : Math.round(value).toLocaleString('en-US')) + (o.suf || '');
  if (THEME.counter && !o.plain) return THEME.counter(c, s, x, y, size, a, o);
  T(c, s, x, y, F(o.w || 600, size, o.font || THEME.F.num), col(o.color || 'accent2'), o.align || 'center', o.ls || 0, a);
}
// 单根进度条（横向）：frac 0..1
function bar(c, x, y, w, h, frac, a, o = {}) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= clamp(a);
  c.fillStyle = rgba(col(o.track || 'ink'), o.trackA ?? .08); c.fillRect(x, y, w, h);
  c.fillStyle = col(o.color || 'accent'); c.fillRect(x, y, w * clamp(frac), h);
  if (o.mark != null) { c.fillStyle = col(o.markColor || 'neg'); c.fillRect(x + w * o.mark - 1.5, y - 8, 3, h + 16); }
  c.strokeStyle = rgba(col(o.color || 'accent'), .55); c.lineWidth = 1.4; c.strokeRect(x, y, w, h);
  c.restore();
  if (o.label) T(c, o.label, x, y - 16, F(600, o.fs || 28, THEME.F.cjk), col(o.labelColor || 'ink'), 'left', 3, a);
  if (o.value) T(c, o.value, x + w, y - 16, F(600, o.fs || 28, THEME.F.num), col(o.color || 'accent'), 'right', 1, a);
}
// 柱状图（从底向上长）：values 0..1，k 生长进度；o.labels / o.texts / o.colors
function bars(c, x, baseY, w, h, values, k, a, o = {}) {
  if (a <= 0) return;
  const n = values.length, gap = o.gap ?? 24, bw = (w - gap * (n - 1)) / n;
  c.save(); c.globalAlpha *= clamp(a);
  c.fillStyle = rgba(col('ink'), .25); c.fillRect(x - 10, baseY, w + 20, 1.5);
  values.forEach((v, i) => {
    const kk = eo(clamp(k * (1 + n * .15) - i * .15)); const bh = h * v * kk, bx = x + i * (bw + gap);
    const cc = col((o.colors && o.colors[i]) || 'accent');
    if (THEME.barFill) THEME.barFill(c, bx, baseY - bh, bw, bh, cc); else { c.fillStyle = rgba(cc, .9); c.fillRect(bx, baseY - bh, bw, bh); }
    if (o.texts && kk > .2) T(c, o.texts[i], bx + bw / 2, baseY - bh - 18, F(600, o.fs || 30, THEME.F.num), cc, 'center', 0, kk);
    if (o.labels) T(c, o.labels[i], bx + bw / 2, baseY + 44, F(500, o.lfs || 26, THEME.F.cjk), col('soft'), 'center', 2, 1);
  });
  c.restore();
}
// 点阵：cols×rows；state(i) 返回 0 暗 / 1 强调 / 2 负面 / 3 空心负面 / 4 正面；k(i) 返回该点的显现进度
function grid(c, cx, cy, cols, rows, cell, state, a, o = {}) {
  if (a <= 0) return;
  const r = o.r ?? cell * .32, x0 = cx - (cols - 1) * cell / 2, y0 = cy - (rows - 1) * cell / 2;
  c.save(); c.globalAlpha *= clamp(a);
  for (let i = 0; i < cols * rows; i++) {
    const q = i % cols, row = (i - q) / cols, x = x0 + q * cell, y = y0 + row * cell;
    const st = state(i), kk = o.k ? o.k(i) : 1; if (kk <= 0) continue;
    if (THEME.dot && !o.plain) { THEME.dot(c, x, y, r, st, kk); continue; }
    c.globalAlpha = clamp(a) * kk;
    if (st === 3) { c.strokeStyle = col('neg'); c.lineWidth = Math.max(1.5, r * .3); c.beginPath(); c.arc(x, y, r * .82, 0, 7); c.stroke(); continue; }
    c.fillStyle = st === 1 ? col('accent') : st === 2 ? col('neg') : st === 4 ? col('pos') : rgba(col('ink'), o.dimA ?? .22);
    c.beginPath(); if (o.square) c.rect(x - r, y - r, r * 2, r * 2); else c.arc(x, y, r, 0, 7); c.fill();
  }
  c.restore();
}
// 折线（从左往右长出来）：ys 是 0..1 的数组；o.ref 参考线（0..1），o.refLabel
function lineChart(c, x, y, w, h, ys, k, a, o = {}) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= clamp(a);
  c.strokeStyle = rgba(col('ink'), .3); c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + h); c.lineTo(x + w, y + h); c.stroke();
  if (o.ref != null) {
    const ry = y + h * (1 - o.ref); c.setLineDash([10, 10]); c.strokeStyle = rgba(col(o.refColor || 'neg'), .7); c.beginPath(); c.moveTo(x, ry); c.lineTo(x + w, ry); c.stroke(); c.setLineDash([]);
    if (o.refLabel) T(c, o.refLabel, x + w, ry - 14, F(600, 26, THEME.F.num), col(o.refColor || 'neg'), 'right', 1, 1);
  }
  const n = ys.length, m = Math.max(2, Math.floor(n * clamp(k)));
  c.strokeStyle = col(o.color || 'accent'); c.lineWidth = o.lw || 4; c.lineJoin = 'round'; c.beginPath();
  for (let i = 0; i < m; i++) { const px = x + w * i / (n - 1), py = y + h * (1 - ys[i]); i ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.stroke();
  const lx = x + w * (m - 1) / (n - 1), ly = y + h * (1 - ys[m - 1]);
  c.fillStyle = col(o.color || 'accent'); c.beginPath(); c.arc(lx, ly, (o.lw || 4) * 1.8, 0, 7); c.fill();
  c.restore();
  return { x: lx, y: ly };
}
// 标签（小胶囊）
function tag(c, x, y, txt, a, o = {}) {
  if (a <= 0) return;
  const fs = o.fs || 30; c.save(); c.font = F(600, fs, THEME.F.cjk); c.letterSpacing = '2px';
  const w = c.measureText(txt).width + fs * 1.2, h = fs * 1.7, x0 = o.align === 'left' ? x : x - w / 2;
  c.globalAlpha *= clamp(a); c.strokeStyle = col(o.color || 'accent'); c.lineWidth = 2;
  if (o.fill) { c.fillStyle = col(o.color || 'accent'); c.fillRect(x0, y - h / 2, w, h); }
  c.strokeRect(x0, y - h / 2, w, h);
  c.fillStyle = o.fill ? col('bg') : col(o.color || 'accent'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, x0 + w / 2, y + 1);
  c.restore();
}
// 对话框：o.strike = 划线删除进度；o.side 'l'|'r'
function bubble(c, x, y, w, txt, a, o = {}) {
  if (a <= 0) return;
  const fs = o.fs || 36, h = fs * 2.1, x0 = x - w / 2;
  c.save(); c.globalAlpha *= clamp(a);
  c.fillStyle = rgba(col(o.fill || 'ink'), o.fillA ?? .07); c.strokeStyle = rgba(col(o.color || 'ink'), .6); c.lineWidth = 2;
  const r = 18; c.beginPath(); c.roundRect(x0, y - h / 2, w, h, r); c.fill(); c.stroke();
  const tx = o.side === 'r' ? x0 + w - 60 : x0 + 60; c.beginPath(); c.moveTo(tx - 14, y + h / 2 - 1); c.lineTo(tx + (o.side === 'r' ? 18 : -18), y + h / 2 + 22); c.lineTo(tx + 14, y + h / 2 - 1); c.fill();
  c.restore();
  T(c, txt, x, y + fs * .36, F(600, fs, THEME.F.cjk), col(o.textColor || 'ink'), 'center', 2, a);
  if (o.strike > 0) { c.save(); c.globalAlpha *= a; c.strokeStyle = col('neg'); c.lineWidth = 4; c.beginPath(); c.moveTo(x0 + 30, y); c.lineTo(x0 + 30 + (w - 60) * eo(o.strike), y); c.stroke(); c.restore(); }
}
function arrow(c, x1, y1, x2, y2, k, a, o = {}) {
  if (a <= 0 || k <= 0) return;
  const xe = lerp(x1, x2, eo(k)), ye = lerp(y1, y2, eo(k)), ang = Math.atan2(y2 - y1, x2 - x1), hs = o.head || 18;
  c.save(); c.globalAlpha *= clamp(a); c.strokeStyle = c.fillStyle = col(o.color || 'accent'); c.lineWidth = o.lw || 3; c.lineCap = 'round';
  if (o.dash) c.setLineDash(o.dash);
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(xe, ye); c.stroke(); c.setLineDash([]);
  c.beginPath(); c.moveTo(xe, ye); c.lineTo(xe - hs * Math.cos(ang - .45), ye - hs * Math.sin(ang - .45)); c.lineTo(xe - hs * Math.cos(ang + .45), ye - hs * Math.sin(ang + .45)); c.closePath(); c.fill();
  c.restore();
}
// 对勾 / 叉（用线画，不依赖字体里的 ✓ ✗）
function mark(c, x, y, r, k, kind = 'check', color = 'accent') {
  if (k <= 0) return; c.save(); c.strokeStyle = col(color); c.lineWidth = Math.max(3, r * .18); c.lineCap = 'round'; c.lineJoin = 'round';
  if (kind === 'check') { const p = [[x - r * .55, y], [x - r * .12, y + r * .45], [x + r * .62, y - r * .5]]; const k1 = clamp(k * 2), k2 = clamp(k * 2 - 1);
    c.beginPath(); c.moveTo(...p[0]); c.lineTo(lerp(p[0][0], p[1][0], k1), lerp(p[0][1], p[1][1], k1)); if (k2 > 0) c.lineTo(lerp(p[1][0], p[2][0], k2), lerp(p[1][1], p[2][1], k2)); c.stroke(); }
  else { const k1 = clamp(k * 2), k2 = clamp(k * 2 - 1); c.beginPath(); c.moveTo(x - r * .5, y - r * .5); c.lineTo(x - r * .5 + r * k1, y - r * .5 + r * k1); if (k2 > 0) { c.moveTo(x + r * .5, y - r * .5); c.lineTo(x + r * .5 - r * k2, y - r * .5 + r * k2); } c.stroke(); }
  c.restore();
}
// 手绘圈注（批注感）：k 画圈进度
function circleMark(c, x, y, rx, ry, k, color = 'neg', lw = 4, seed = 3) {
  if (k <= 0) return; const r = rng(seed); const n = 64, m = Math.floor(n * 1.12 * clamp(k)), off = r() * 6;
  c.save(); c.strokeStyle = col(color); c.lineWidth = lw; c.lineCap = 'round'; c.beginPath();
  for (let i = 0; i <= m; i++) { const th = off + i / n * Math.PI * 2, j = 1 + .05 * Math.sin(i * .7 + off) + i / n * .06; const px = x + Math.cos(th) * rx * j, py = y + Math.sin(th) * ry * j; i ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.stroke(); c.restore();
}
// 卡片：每个主题有自己的卡（羊皮纸 / 化验单 / 点阵屏 / 宣纸 / 档案纸 / 黑板框）。fn(c, w, h) 在卡片坐标系（中心为原点）里画内容
function panel(c, x, y, w, h, a, fn, o = {}) {
  if (a <= 0) return;
  if (THEME.panel) return THEME.panel(c, x, y, w, h, a, fn, o);
  c.save(); c.globalAlpha *= clamp(a); c.translate(x, y); c.rotate(o.rot || 0);
  c.fillStyle = col('panel'); c.fillRect(-w / 2, -h / 2, w, h); c.strokeStyle = rgba(col('ink'), .4); c.strokeRect(-w / 2, -h / 2, w, h);
  fn && fn(c, w, h); c.restore();
}
// 印章（红）
function stamp(c, x, y, r, txt, a, rot = -0.2, k = 1) {
  if (a <= 0) return; const s = lerp(1.6, 1, back(k));
  c.save(); c.globalAlpha *= clamp(a) * clamp(k * 3) * .9; c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.strokeStyle = col('neg'); c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke();
  c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, r - 6, 0, 7); c.stroke();
  T(c, txt, 0, r * .18, F(900, r * .5, THEME.F.heavy), col('neg')); c.restore();
}
// 人形图标（数据图里代表"一个人"，不是角色；不要给它画五官）
function pawn(c, x, y, h, color = 'ink', a = 1) {
  if (a <= 0) return; c.save(); c.globalAlpha *= clamp(a); c.fillStyle = col(color);
  c.beginPath(); c.arc(x, y - h * .78, h * .2, 0, 7); c.fill();
  c.beginPath(); c.moveTo(x - h * .34, y); c.quadraticCurveTo(x - h * .34, y - h * .52, x, y - h * .54); c.quadraticCurveTo(x + h * .34, y - h * .52, x + h * .34, y); c.closePath(); c.fill();
  c.restore();
}
// 文字粒子：k=0 散开，k=1 聚成字；o.out>0 再被吹散
function particleText(c, s, size, cx, cy, k, a, o = {}) {
  if (a <= 0) return;
  const pts = memo(`pt:${s}:${size}:${cy}`, () => {
    const cc = mk(W, H), x = cc.getContext('2d'); x.font = F(900, size, THEME.F.heavy); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText(s, CX, cy);
    const d = x.getImageData(0, 0, W, H).data, p = [], st = o.step || 7;
    for (let y = 0; y < H; y += st) for (let xx = (y / st % 2) * 3; xx < W; xx += st) if (d[(y * W + xx) * 4 + 3] > 140) p.push([xx, y]);
    return p;
  });
  const r = rng(o.seed || 9); c.save(); c.globalAlpha *= clamp(a); c.fillStyle = col(o.color || 'accent2');
  for (const [px, py] of pts) {
    const sx0 = r() * W, sy0 = r() * H * .8, d = r() * .35, kk = eo(clamp((k - d) / .65)), out = o.out ? eo(clamp((o.out - d * .5) / .7)) : 0;
    const x = lerp(sx0, px + cx - CX, kk) + out * (180 + r() * 400), y = lerp(sy0, py, kk) - out * (60 + r() * 200);
    c.globalAlpha = clamp(a) * (1 - out) * (.5 + .5 * kk); c.fillRect(x - 1.6, y - 1.6, 3.2, 3.2);
  }
  c.restore();
}
// 打字机（逐字出现）：返回已显示的字符串
function typed(s, k) { const ch = [...s]; return ch.slice(0, Math.floor(ch.length * clamp(k))).join(''); }
// 跑一次可复现的模拟（种子固定）。fn(rand) 返回结果，只算一次
function simulate(key, seed, fn) { return memo('sim:' + key, () => fn(rng(seed))); }
