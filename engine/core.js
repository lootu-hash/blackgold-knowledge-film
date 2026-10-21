// =====================================================================
// 知识短片引擎 · core.js
// 读 script.js 里的 FILM / LINES / LEAD / CARD / CLIMAX …，算时间轴，
// 提供工具函数、字幕排版、合成器。画风（配色、母题、片名卡、片尾）在 engine/themes/<style>.js（window.THEME）：blackgold 黑金夜路 / led 赌场记录牌。
// render(t) 是时间的纯函数：同一个 t 永远画出同一帧（不许用 Math.random）。
// =====================================================================
'use strict';
const FILM = Object.assign({ title: '片名', en: '', sub: '', sign: '', style: 'blackgold', aspect: 'vertical', refs: [], credit: '' }, window.FILM || {});
window.FILM = FILM;

// ---------- 画幅与版式 ----------
const VERT = FILM.aspect !== 'horizontal';
const W = VERT ? 1080 : 1920, H = VERT ? 1920 : 1080, FPS = 30, CX = W / 2;
// L：版式常量。场景里用 L.VC（画面主体垂直中心）、L.SAFE（画面元素不要低于这条线，下面是字幕区）
const L = VERT
  ? { VC: 800, SAFE: 1420, SUB_Y: 1500, EN_DY: 58, SUB_FS: 54, EN_FS: 27, SUB_MAXW: 940, EN_MAXW: 960, CH_X: 64, CH_Y: 150, CH_FS: 22, MX: 60, SIGN_Y: 1726, GROUND: 1320 }
  : { VC: 470, SAFE: 900, SUB_Y: 968, EN_DY: 44, SUB_FS: 46, EN_FS: 25, SUB_MAXW: 1500, EN_MAXW: 1500, CH_X: 72, CH_Y: 84, CH_FS: 18, MX: 90, SIGN_Y: 1040, GROUND: 900 };

// ---------- 画布与图层 ----------
const cv = document.getElementById('cv'); cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const sharp = mk(W, H), sx = sharp.getContext('2d');     // 会加光晕的清晰层
const scA = mk(W, H), scAx = scA.getContext('2d');       // 当前场景（加光晕）
const scB = mk(W, H), scBx = scB.getContext('2d');       // 当前场景（不加光晕：大面积亮色卡片）
const nb = mk(W, H), nbx = nb.getContext('2d');          // 不加光晕层合计
const b1 = mk(W / 2, H / 2), b1x = b1.getContext('2d');
const b2 = mk(W / 4, H / 4), b2x = b2.getContext('2d');
const b3 = mk(W / 8, H / 8), b3x = b3.getContext('2d');

// ---------- 数学工具 ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, k) => a + (b - a) * k;
const io = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };   // 缓入缓出
const eo = x => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };                                   // 快出慢停
const ei = x => { x = clamp(x); return x * x * x; };
const back = x => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const pr = (t, a, b) => clamp((t - a) / (b - a));                                                   // t 在 [a,b] 的进度
const fade = (t, a, b, c, d) => Math.min(pr(t, a, b), 1 - pr(t, c, d));                             // 淡入后淡出
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rgba(hex, a) { if (hex.startsWith('rgb')) return hex; const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function mixHex(h1, h2, k) { const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16); const f = s => Math.round(lerp((a >> s) & 255, (b >> s) & 255, k)); return `rgb(${f(16)},${f(8)},${f(0)})`; }
// 缓存：模拟、采样等只算一次（key 相同就复用）
const MEMO = {}; function memo(key, fn) { return key in MEMO ? MEMO[key] : (MEMO[key] = fn()); }

// ---------- 时间轴 ----------
// LINES 每项：[场景id, 显示时长(秒), 中文(【金色】〖红色〗), English]
// 句子真实显示时长 = 时长 × 0.93；句间 0.15s；换场景 +0.4s，再加该场景 LEAD；最后 +0.8s 进片尾
const S = {}; const ORDER = []; const LINES = [];
(function build() {
  let t = 0, prev = null;
  const LEAD = window.LEAD || {};
  for (const [sid, dur0, zh, en] of window.LINES) {
    const dur = dur0 * 0.93;
    if (sid !== prev) {
      if (prev) t += 0.4;
      S[sid] = { id: sid, start: t, ls: [], le: [] }; ORDER.push(sid);
      t += (LEAD[sid] || 0);
      prev = sid;
    }
    const Ln = { sid, start: t, end: t + dur, zh, en: en || '' };
    LINES.push(Ln); S[sid].ls.push(t - S[sid].start); S[sid].le.push(t + dur - S[sid].start);
    t += dur + 0.15;
  }
  t += 0.8;
  S.title = { id: 'title', start: t, ls: [], le: [] }; ORDER.push('title');
  window.TOTAL = t + (window.TITLE_DUR || 5);
  const XF = 0.30;
  for (let i = 0; i < ORDER.length; i++) {
    const s = S[ORDER[i]];
    s.end = i < ORDER.length - 1 ? S[ORDER[i + 1]].start + XF : window.TOTAL;
    s.dur = s.end - s.start;
  }
})();
// "s3+0.4" → 绝对秒
function at(ref) { if (typeof ref === 'number') return ref; const m = String(ref).match(/^(\w+)(?:\+([\d.]+))?$/); if (!m || !S[m[1]]) return NaN; return S[m[1]].start + parseFloat(m[2] || 0); }
const CARD_T = window.CARD && S[window.CARD] ? S[window.CARD].start + 0.12 : null;       // 片名卡 = 第一个鼓点
const CLIMAX_T = window.CLIMAX && S[window.CLIMAX] ? S[window.CLIMAX].start + 0.25 : null; // 高潮白闪 = 第二个鼓点
const FLASHES = (window.FLASH || (CLIMAX_T != null ? [CLIMAX_T] : [])).map(at).filter(x => !isNaN(x));
window.TIMELINE = {
  film: FILM, total: +window.TOTAL.toFixed(3), card: CARD_T, climax: CLIMAX_T, flashes: FLASHES,
  scenes: ORDER.map(id => ({ id, start: +S[id].start.toFixed(3), end: +S[id].end.toFixed(3) })),
  lines: LINES.map(l => ({ scene: l.sid, start: +l.start.toFixed(3), end: +l.end.toFixed(3), zh: l.zh.replace(/[【】〖〗]/g, ''), en: l.en, highlight: (l.zh.match(/【(.*?)】/g) || []).map(s => s.slice(1, -1)) })),
  sfx: (window.SFX || []).map(([sid, off, kind, gain]) => ({ t: +(at(sid) + off).toFixed(3), kind, gain: gain ?? 1 })).filter(x => !isNaN(x.t)),
};

// ---------- 基础绘制 ----------
function T(c, s, x, y, font, color, align = 'center', ls = 0, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= clamp(a); c.font = font; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'alphabetic';
  c.letterSpacing = ls + 'px'; c.fillText(s, x, y); c.restore();
}
// 竖排文字（自上而下），k = 显现进度 0..1（逐字）
function TV(c, s, x, y, size, font, color, a = 1, k = 1, gap = 1.12) {
  const chars = [...s]; const n = chars.length;
  chars.forEach((ch, i) => {
    const ca = clamp(k * n - i); if (ca <= 0) return;
    T(c, ch, x, y + i * size * gap + size * .86, `${font.replace('{s}', size)}`, color, 'center', 0, a * ca);
  });
}
function F(w, size, fam) { return `${w} ${size}px ${fam}`; }
// 在"不加光晕"的层上画（大面积亮色块用，否则会糊成一片）
function noGlow(c, fn) { const n = scBx; n.save(); n.setTransform(c.getTransform()); n.globalAlpha = c.globalAlpha; fn(n); n.restore(); }

// ---------- 字幕：自动换行 + 逐字显现 ----------
function splitHL(zh) {
  const out = []; let mode = 0;
  for (const ch of zh) {
    if (ch === '【') { mode = 1; continue; } if (ch === '】') { mode = 0; continue; }
    if (ch === '〖') { mode = 2; continue; } if (ch === '〗') { mode = 0; continue; }
    out.push({ ch, mode });
  }
  return out;
}
const brkCh = s => '，。：；、！？—…,.!?;:'.indexOf(s) >= 0;
const noEndCh = s => '（「『【《“‘'.indexOf(s) >= 0;
function subFont(fs) { return `${THEME.sub.weight || 700} ${fs}px ${THEME.F.sub || THEME.F.cjk}`; }
function layoutZh(chars, maxW, fs) {
  ctx.font = subFont(fs); ctx.letterSpacing = '1px';
  const w = chars.map(o => ctx.measureText(o.ch).width);
  const rw = (a, b) => { let s = 0; for (let k = a; k < b; k++) s += w[k]; return s; };
  const seq = (a, b) => { const o = []; for (let k = a; k < b; k++) o.push(k); return o; };
  const lines = []; let i = 0;
  while (i < chars.length) {
    let j = i, cw = 0, lastBrk = -1;
    while (j < chars.length && cw + w[j] <= maxW) { cw += w[j]; j++; if (brkCh(chars[j - 1].ch)) lastBrk = j; }
    if (j >= chars.length) { lines.push(seq(i, chars.length)); break; }
    let cut = j;
    if (lastBrk > i + 1 && rw(i, lastBrk) >= rw(i, j) * .45) cut = lastBrk;
    if (cut < chars.length && brkCh(chars[cut].ch)) cut++;
    if (cut > i + 1 && cut < chars.length && noEndCh(chars[cut - 1].ch)) cut--;
    lines.push(seq(i, cut)); i = cut;
  }
  if (lines.length === 2) {   // 孤行过短 → 回中平衡
    const a = lines[0][0], m = lines[1][0], b = lines[1][lines[1].length - 1] + 1;
    const w1 = rw(a, m), w2 = rw(m, b);
    if (Math.min(w1, w2) < Math.max(w1, w2) * .42) {
      let best = -1, bd = Infinity;
      for (let c = a + 2; c <= b - 2; c++) {
        if (brkCh(chars[c].ch) || noEndCh(chars[c - 1].ch)) continue;
        const x = rw(a, c), y = rw(c, b); if (x > maxW || y > maxW) continue;
        const d = Math.abs(x - y) - (brkCh(chars[c - 1].ch) ? maxW * .08 : 0);
        if (d < bd) { bd = d; best = c; }
      }
      if (best > 0) { lines[0] = seq(a, best); lines[1] = seq(best, b); }
    }
  }
  return { lines, w };
}
function layoutEn(s, fs, maxW) {
  const words = s.split(' '); const out = []; let cur = '';
  ctx.font = `italic 500 ${fs}px ${THEME.F.en}`; ctx.letterSpacing = '0px';
  for (const wd of words) { const tv = cur ? cur + ' ' + wd : wd; if (ctx.measureText(tv).width > maxW && cur) { out.push(cur); cur = wd; } else cur = tv; }
  if (cur) out.push(cur); return out;
}
function subLayout(L0) {
  const chars = splitHL(L0.zh);
  let fs = L.SUB_FS, lay = layoutZh(chars, L.SUB_MAXW, fs), g = 0;
  while (lay.lines.length > 2 && fs > 34 && g++ < 20) { fs -= 2; lay = layoutZh(chars, L.SUB_MAXW, fs); }
  let efs = L.EN_FS, el = layoutEn(L0.en, efs, L.EN_MAXW);
  while (el.length > 2 && efs > 19) { efs -= 1; el = layoutEn(L0.en, efs, L.EN_MAXW); }
  return { chars, fs, lay, efs, el };
}
window.splitHL = splitHL; window.layoutZh = layoutZh; window.layoutEn = layoutEn; window.subLayout = subLayout;
function drawSub(t) {
  const st = THEME.sub;
  for (const L0 of LINES) {
    if (t < L0.start - .02 || t > L0.end + .05 || !L0.zh) continue;
    const a = pr(t, L0.start, L0.start + .16) * (1 - pr(t, L0.end - .3, L0.end));
    if (a <= 0) continue;
    const { chars, fs, lay, efs, el } = subLayout(L0);
    const n = lay.lines.length, lh = fs * 1.22, y0 = L.SUB_Y - (n - 1) * lh;
    const per = st.perChar ?? .014, rv = st.reveal ?? .12;
    ctx.save(); ctx.font = subFont(fs); ctx.letterSpacing = '1px'; ctx.textBaseline = 'alphabetic';
    if (st.plate) st.plate(ctx, y0 - fs, (n - 1) * lh + fs * 1.5 + (L0.en ? efs * el.length + L.EN_DY * .6 : 0), a);
    ctx.shadowColor = st.shadow || 'transparent'; ctx.shadowBlur = st.shadowBlur ?? 0;
    lay.lines.forEach((idx, li) => {
      const baseY = y0 + li * lh; const tw = idx.reduce((s, k) => s + lay.w[k], 0); let x = CX - tw / 2;
      for (const k of idx) {
        const o = chars[k]; const ca = clamp((t - (L0.start + k * per)) / rv);
        if (ca > 0) {
          ctx.globalAlpha = a * ca; ctx.fillStyle = o.mode === 1 ? st.hl : (o.mode === 2 ? st.neg : st.fill);
          if (st.blurIn && ca < 1) ctx.filter = `blur(${((1 - ca) * st.blurIn).toFixed(1)}px)`;
          ctx.fillText(o.ch, x, baseY - (1 - ca) * (1 - ca) * (st.rise ?? 12));
          ctx.filter = 'none';
        }
        x += lay.w[k];
      }
    });
    ctx.restore();
    const ey = L.SUB_Y + L.EN_DY;
    el.forEach((s, i) => T(ctx, s, CX, ey + i * (efs + 8), `italic 500 ${efs}px ${THEME.F.en}`, st.en, 'center', 1, a * (st.enA ?? .55)));
  }
}

// ---------- 章节、HUD、署名 ----------
function sceneAt(t) { let id = ORDER[0]; for (const k of ORDER) if (S[k].start <= t) id = k; return id; }
function hudState(t) {
  // HUD = { 场景id: [第一行, 第二行] }，切换时给出上一组和切换进度 k（主题可做滚动计数动画）
  const H0 = window.HUD || {}; let cur = null, prev = null, since = -1;
  for (const id of ORDER) { if (S[id].start > t) break; if (H0[id]) { prev = cur; cur = H0[id]; since = S[id].start; } }
  return cur ? { cur, prev, k: pr(t, since, since + .45), since } : null;
}

// ---------- 合成器 ----------
function render(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.filter = 'none';
  THEME.bg(ctx, t);
  sx.clearRect(0, 0, W, H); nbx.clearRect(0, 0, W, H);
  const CAM = window.CAM || {};
  for (const id of ORDER) {
    const s = S[id]; if (t < s.start || t > s.end) continue;
    const lt = t - s.start; const a = Math.min(pr(t, s.start, s.start + .30), 1 - pr(t, s.end - .30, s.end));
    for (const x of [scAx, scBx]) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; }
    scAx.save();
    const mode = CAM[id] || 'still', k = io(lt / s.dur);
    let z = 1, dx = 0;
    if (mode === 'in') z = 1 + .05 * k; else if (mode === 'out') z = 1.06 - .06 * k; else if (mode === 'drift') { z = 1.02; dx = lerp(18, -18, k); }
    else if (mode === 'snap') z = 1 + .12 * eo(pr(lt, 0, .35)) - .08 * eo(pr(lt, .35, 1.2));
    if (z !== 1 || dx) { scAx.translate(CX + dx, L.VC); scAx.scale(z, z); scAx.translate(-CX, -L.VC); }
    const fn = SCN[id] || (id === window.CARD ? (c, lt, s) => THEME.card(c, lt, s) : id === 'title' ? (c, lt, s) => THEME.ending(c, lt, s) : null);
    if (fn) fn(scAx, lt, s);
    scAx.restore();
    sx.globalAlpha = id === ORDER[0] ? 1 : a; sx.drawImage(scA, 0, 0); sx.globalAlpha = 1;
    nbx.globalAlpha = id === ORDER[0] ? 1 : a; nbx.drawImage(scB, 0, 0); nbx.globalAlpha = 1;
  }
  ctx.drawImage(sharp, 0, 0);
  const G = THEME.glow;
  if (G) {   // 光晕：1/2、1/4、1/8 缩小再模糊，用 lighter 叠回去
    b1x.clearRect(0, 0, W / 2, H / 2); b1x.filter = 'blur(4px)'; b1x.drawImage(sharp, 0, 0, W / 2, H / 2); b1x.filter = 'none';
    b2x.clearRect(0, 0, W / 4, H / 4); b2x.filter = 'blur(6px)'; b2x.drawImage(sharp, 0, 0, W / 4, H / 4); b2x.filter = 'none';
    b3x.clearRect(0, 0, W / 8, H / 8); b3x.filter = 'blur(8px)'; b3x.drawImage(sharp, 0, 0, W / 8, H / 8); b3x.filter = 'none';
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = G[0]; ctx.drawImage(b1, 0, 0, W, H); ctx.globalAlpha = G[1]; ctx.drawImage(b2, 0, 0, W, H); ctx.globalAlpha = G[2]; ctx.drawImage(b3, 0, 0, W, H);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(nb, 0, 0);
  THEME.post(ctx, t);
  for (const ft of FLASHES) {
    const fa = t < ft ? .86 * ei(pr(t, ft - .22, ft)) : .86 * Math.pow(1 - pr(t, ft, ft + .7), 3);
    if (fa > 0) { ctx.fillStyle = THEME.flash(fa); ctx.fillRect(0, 0, W, H); }
  }
  const hs = hudState(t); if (hs && THEME.hud && t < S.title.start + .3) THEME.hud(ctx, t, hs);
  drawSub(t);
  if (FILM.sign && THEME.sign) THEME.sign(ctx, FILM.sign);
  const id = sceneAt(t), ch = (window.CHAPTERS || {})[id];
  if (ch && THEME.chapter) THEME.chapter(ctx, ch, .42 * pr(t, S[id].start + .3, S[id].start + 1.2), id);
  if (THEME.grain) THEME.grain(ctx, t);
  const ga = pr(t, window.TOTAL - 1.6, window.TOTAL - .15);   // 只在结尾渐黑；开头第 0 帧就有画面
  if (ga > 0) { ctx.globalAlpha = 1; ctx.fillStyle = THEME.endFade ? THEME.endFade(ga) : `rgba(0,0,0,${ga})`; ctx.fillRect(0, 0, W, H); }
}
window.seekTo = t => render(t);
function boot() {
  const fonts = (THEME.preload || []).concat([`italic 500 25px ${THEME.F.en}`, `${THEME.sub.weight || 700} 40px ${THEME.F.sub || THEME.F.cjk}`]);
  window.READY = (async () => {
    await Promise.all(fonts.map(f => document.fonts.load(f, '知识短片Aa0123')));
    if (THEME.init) THEME.init();
    render(0); return { total: window.TOTAL, timeline: window.TIMELINE };
  })();
}
const SCN = {};
