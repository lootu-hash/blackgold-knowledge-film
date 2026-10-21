// =====================================================================
// 画风：赌场记录牌 / LED 点阵（led）—— 概率、赌博、彩票、记录、计数类选题
// 母题：近黑底上的 LED 灯珠网格、点阵大字（每个像素是一颗灯珠）、记录牌（红/白/绿灯珠排成长龙）、
//       左上台号/局号 HUD、右上压力表（被一道绿线归零 = 真相）
// 色板：底 #0C0C0D / 红 #FF3B3B（负面、红格）/ 骨白 #EDE8DF（主文字、白格）/ 荧光绿 #3DFF8A（专门标"真相"）
// =====================================================================
const LSANS = "'Noto Sans CJK SC','Source Han Sans SC','PingFang SC','Microsoft YaHei',sans-serif";
const LMONO = "'JetBrains Mono','SF Mono','Menlo','DejaVu Sans Mono',monospace";
const LED = { bg: '#0C0C0D', red: '#FF3B3B', bone: '#EDE8DF', green: '#3DFF8A', dim: '#2A2826' };

// 把任意文字光栅化成点阵（缓存）。rows = 字高占几颗灯
function ledBitmap(s, rows, heavy) {
  return memo(`led:${s}:${rows}:${heavy}`, () => {
    const fs = rows, cc = mk(Math.ceil(fs * [...s].length * 1.3 + 8), Math.ceil(fs * 1.4)), x = cc.getContext('2d');
    x.font = `${heavy ? 900 : 700} ${fs}px ${/[一-鿿]/.test(s) ? LSANS : "'Inter','DejaVu Sans',sans-serif"}`;
    x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText(s, 2, cc.height / 2);
    const d = x.getImageData(0, 0, cc.width, cc.height).data, pts = []; let maxx = 0;
    for (let y = 0; y < cc.height; y++) for (let xx = 0; xx < cc.width; xx++) if (d[(y * cc.width + xx) * 4 + 3] > 110) { pts.push([xx, y]); maxx = Math.max(maxx, xx); }
    return { pts, w: maxx + 1, h: cc.height };
  });
}
// 点阵字：size = 字高像素；k = 从左往右点亮的进度；o.rows 灯珠行数
function ledText(c, s, x, y, size, colr, a = 1, o = {}) {
  if (a <= 0) return;
  const rows = o.rows || (/[一-鿿]/.test(s) ? 18 : 12), bm = ledBitmap(s, rows, o.heavy), p = size / rows;
  const x0 = o.align === 'left' ? x : o.align === 'right' ? x - bm.w * p : x - bm.w * p / 2, y0 = y - bm.h * p / 2, k = o.k ?? 1;
  c.save(); c.globalAlpha *= clamp(a); c.fillStyle = colr;
  for (const [px, py] of bm.pts) { if (px / bm.w > k) continue; c.beginPath(); c.arc(x0 + px * p + p / 2, y0 + py * p + p / 2, p * .4, 0, 7); c.fill(); }
  c.restore();
  return bm.w * p;
}
// 灯珠：on 0..1
function lamp(c, x, y, r, colr, on = 1, hollow = false) {
  c.save();
  if (hollow) { c.strokeStyle = rgba(colr, .35 + .65 * on); c.lineWidth = Math.max(1.5, r * .3); c.beginPath(); c.arc(x, y, r * .78, 0, 7); c.stroke(); }
  else { c.fillStyle = on > 0 ? colr : LED.dim; c.globalAlpha *= on > 0 ? .25 + .75 * on : .7; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  c.restore();
}
const LED_GRID = (() => { const c = mk(240, 240), x = c.getContext('2d'); x.fillStyle = 'rgba(237,232,223,0.045)'; for (let i = 6; i < 240; i += 12) for (let j = 6; j < 240; j += 12) { x.beginPath(); x.arc(i, j, 1.6, 0, 7); x.fill(); } return c; })();

window.THEME = {
  id: 'led', name: '赌场记录牌',
  C: { bg: LED.bg, ink: LED.bone, soft: '#8E8981', accent: LED.green, accent2: LED.bone, hl: LED.green, neg: LED.red, pos: LED.green, panel: '#141415' },
  F: { cjk: LSANS, heavy: LSANS, en: "'Cormorant Garamond',serif", num: LMONO, mono: LMONO },
  sub: { fill: LED.bone, hl: LED.green, neg: LED.red, en: '#BDB7AD', weight: 700, shadow: 'rgba(0,0,0,0.9)', shadowBlur: 10, enA: .7 },
  glow: [.42, .34, .3],
  preload: [`900 120px ${LSANS}`, `700 40px ${LSANS}`, `700 40px ${LMONO}`, `700 20px Inter`],
  bg(c) { c.fillStyle = LED.bg; c.fillRect(0, 0, W, H); const p = c.createPattern(LED_GRID, 'repeat'); c.fillStyle = p; c.fillRect(0, 0, W, H); },
  post(c) {
    let g = c.createRadialGradient(CX, L.VC, Math.min(W, H) * .4, CX, L.VC, Math.max(W, H) * .7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    g = c.createLinearGradient(0, L.SUB_Y - 200, 0, L.SUB_Y + 100); g.addColorStop(0, 'rgba(12,12,13,0)'); g.addColorStop(1, 'rgba(12,12,13,0.85)'); c.fillStyle = g; c.fillRect(0, L.SUB_Y - 200, W, H);
  },
  flash: a => `rgba(61,255,138,${a * .5})`,
  bigWord(c, s, x, y, size, a, lt, o) { ledText(c, s, x, y, size, o.color ? col(o.color) : LED.bone, a, { k: o.k ?? 1, heavy: true }); },
  counter(c, s, x, y, size, a, o) { ledText(c, s, x, y - size * .35, size, o.color ? col(o.color) : LED.bone, a, { align: o.align, rows: 11 }); },
  dot(c, x, y, r, st, k) {
    c.save(); c.globalAlpha *= k;
    if (st === 1) lamp(c, x, y, r, LED.green); else if (st === 2) lamp(c, x, y, r, LED.red); else if (st === 3) lamp(c, x, y, r, LED.bone, 1, true);
    else if (st === 4) lamp(c, x, y, r, LED.bone); else if (st >= 0) lamp(c, x, y, r, LED.bone, 0);
    c.restore();
  },
  barFill(c, x, y, w, h, cc) { c.fillStyle = cc; for (let yy = y + h - 8; yy >= y; yy -= 12) for (let xx = x + 6; xx < x + w; xx += 12) { c.beginPath(); c.arc(xx, yy + 4, 4, 0, 7); c.fill(); } },
  panel(c, x, y, w, h, a, fn, o) {
    c.save(); c.globalAlpha *= clamp(a); c.translate(x, y); c.rotate(o.rot || 0);
    c.fillStyle = '#121213'; c.fillRect(-w / 2, -h / 2, w, h); c.strokeStyle = rgba(LED.bone, .25); c.lineWidth = 2; c.strokeRect(-w / 2, -h / 2, w, h);
    c.strokeStyle = rgba(LED.bone, .1); c.strokeRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16);
    if (o.head) T(c, o.head, -w / 2 + 24, -h / 2 + 36, `700 20px ${LMONO}`, rgba(LED.bone, .6), 'left', 4, 1);
    fn && fn(c, w, h); c.restore();
  },
  card(c, lt, s) {   // 片名卡：一块点阵屏，片名从左往右亮起
    const y = L.VC - 40, n = [...FILM.title].length, size = Math.min(200, (W - 2 * L.MX - 60) / n * .95);
    this.panel(c, CX, y, W - 2 * L.MX, size * 1.9, 1, null, {});
    ledText(c, FILM.title, CX, y, size, LED.bone, 1, { k: eo(pr(lt, .05, .55)), heavy: true });
    if (FILM.en) ledText(c, FILM.en, CX, y + size * 1.25, 34, LED.green, pr(lt, .5, .9), { k: pr(lt, .5, 1.2) });
  },
  ending(c, lt) {
    const y = VERT ? 560 : 330, n = [...FILM.title].length, size = Math.min(170, (W - 200) / n);
    ledText(c, FILM.title, CX, y, size, LED.bone, 1, { k: eo(pr(lt, .2, 1)), heavy: true });
    let yy = y + size + 30;
    if (FILM.en) { ledText(c, FILM.en, CX, yy, 30, LED.green, pr(lt, .8, 1.3), { k: pr(lt, .8, 1.6) }); yy += 80; }
    if (FILM.sub) { T(c, FILM.sub, CX, yy, `700 32px ${LSANS}`, LED.bone, 'center', 3, pr(lt, 1.2, 2)); yy += 70; }
    if (FILM.sign) { T(c, FILM.sign, CX, yy, `700 26px ${LMONO}`, LED.red, 'center', 6, pr(lt, 1.5, 2.3)); yy += 66; }
    (FILM.refs || []).slice(0, 4).forEach((r, i) => T(c, r, CX, yy + i * 30, `400 19px ${LSANS}`, '#8E8981', 'center', 0, pr(lt, 1.8, 2.6)));
    if (FILM.credit) T(c, FILM.credit, CX, yy + 4 * 30 + 20, `400 18px ${LSANS}`, '#6E6A63', 'center', 2, pr(lt, 2, 2.8));
  },
  chapter(c, txt, a) { T(c, txt, W - L.MX, L.CH_Y - 6, `500 ${L.CH_FS}px ${LSANS}`, LED.bone, 'right', 2, a * 1.6); },
  hud(c, t, h) {   // HUD = { s1: ['TABLE 07', 'SPIN #0027'] }
    T(c, h.cur[0], L.CH_X, L.CH_Y - 20, `700 22px ${LMONO}`, rgba(LED.bone, .75), 'left', 3, 1);
    T(c, h.cur[1] || '', L.CH_X, L.CH_Y + 8, `700 22px ${LMONO}`, h.cur[2] ? col(h.cur[2]) : LED.red, 'left', 3, h.prev ? .4 + .6 * h.k : 1);
  },
  sign(c, txt) { T(c, txt, W - 56, L.SIGN_Y, `700 22px ${LMONO}`, rgba(LED.bone, .55), 'right', 3, 1); },
};
