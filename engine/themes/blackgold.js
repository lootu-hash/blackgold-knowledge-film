// =====================================================================
// 画风：黑金夜路（blackgold）—— 深夜黑金极简线条插画
// 母题：两排路灯延伸的透视夜路、戴红围巾的剪影小人（背对镜头、没有五官）、金箔大字、羊皮纸卡
// 色板：底 #0B0906 / 暖金 #E8B15A→#F6D79A / 高亮 #F0C373 / 暗红 #B8322A。不用蓝紫、不用霓虹
// =====================================================================
const GOLD = '#E8B15A', GOLD2 = '#F6D79A', RED = '#B8322A', HL = '#F0C373';
const SERIF = "'Noto Serif CJK SC','Source Han Serif SC','Songti SC','STSong',serif", ROMAN = "'Cormorant Garamond','Times New Roman',serif";

function glowDot(c, x, y, r, a, halo = 6, colr = '#FFE7B0') {
  if (a <= 0) return;
  c.save(); c.globalAlpha = clamp(a);
  const g = c.createRadialGradient(x, y, 0, x, y, r * halo);
  g.addColorStop(0, 'rgba(246,215,154,0.45)'); g.addColorStop(.3, 'rgba(232,177,90,0.12)'); g.addColorStop(1, 'rgba(232,177,90,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * halo, 0, 7); c.fill();
  c.fillStyle = colr; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.restore();
}
// 金箔大字：纵向渐变 + 发光 + 移动扫光带
function goldText(c, s, x, y, size, a, t, o = {}) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = clamp(a); c.font = o.font || `900 ${size}px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = (o.ls || 0) + 'px';
  const g = c.createLinearGradient(0, y - size * .55, 0, y + size * .55);
  g.addColorStop(0, '#FFF0C8'); g.addColorStop(.42, '#F6D79A'); g.addColorStop(.62, '#E8B15A'); g.addColorStop(1, '#9C7432');
  c.shadowColor = 'rgba(198,138,58,0.45)'; c.shadowBlur = size * .12;
  c.fillStyle = g; c.fillText(s, x, y); c.shadowBlur = 0;
  const w = c.measureText(s).width, sh = ((t * 0.35) % 1.6) - 0.3, bx = x - w / 2 + sh * w;
  const g2 = c.createLinearGradient(bx - 140, 0, bx + 140, 0);
  g2.addColorStop(0, 'rgba(255,246,220,0)'); g2.addColorStop(.5, 'rgba(255,246,220,0.9)'); g2.addColorStop(1, 'rgba(255,246,220,0)');
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = clamp(a) * 0.35; c.fillStyle = g2; c.fillText(s, x, y);
  c.restore();
}
function sparkles(c, seed, cx, cy, w, h, n, t, a) {
  if (a <= 0) return; const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const px = cx + (r() - .5) * w, py0 = cy + (r() - .5) * h, sp = 6 + r() * 14, ph = r() * 7, fr = 1 + r() * 2.5, sz = .8 + r() * 1.8;
    const py = py0 - ((t * sp) % h * 0.15), tw = .35 + .65 * Math.max(0, Math.sin(t * fr + ph));
    c.save(); c.globalAlpha = a * tw; c.fillStyle = GOLD2; c.beginPath(); c.arc(px, py, sz, 0, 7); c.fill(); c.restore();
  }
}
function starfield(c, t, a, seed = 77, n = 420, ymax = VERT ? 900 : 560) {
  if (a <= 0) return; const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = Math.pow(r(), 1.3) * ymax, s = .5 + Math.pow(r(), 3) * 2.4, ph = r() * 7, f = .6 + r() * 2;
    const tw = .45 + .55 * Math.sin(t * f + ph);
    c.globalAlpha = a * clamp(tw) * (s > 2 ? 1 : .7); c.fillStyle = s > 1.8 ? '#FFE7B0' : GOLD2;
    c.beginPath(); c.arc(x, y, s, 0, 7); c.fill();
    if (s > 2.1) glowDot(c, x, y, s * .6, a * tw * .6, 6);
  }
  c.globalAlpha = 1;
}
// 光爆（大字出现时配一次）
function burst(c, x, y, k, rmax = 880) {
  if (k <= 0 || k >= 1) return; const r = 120 + k * rmax, al = (1 - k) * (1 - k) * .55;
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(252,232,190,${al})`); g.addColorStop(.55, `rgba(232,177,90,${al * .35})`); g.addColorStop(1, 'rgba(232,177,90,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
}
// 剪影小人：纯黑、无五官、红围巾、淡金轮廓光、背对镜头。o.lantern 提灯；o.elder 不戴围巾的长辈
function figure(c, x, y, h, t, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  c.save(); c.globalAlpha = clamp(a);
  const pool = o.pool ?? 1;
  if (pool > 0) { const g = c.createRadialGradient(x, y, 0, x, y, h * 1.4); g.addColorStop(0, `rgba(246,215,154,${0.22 * pool})`); g.addColorStop(1, 'rgba(246,215,154,0)'); c.fillStyle = g; c.save(); c.translate(x, y); c.scale(1, 0.22); c.translate(-x, -y); c.beginPath(); c.arc(x, y, h * 1.4, 0, 7); c.fill(); c.restore(); }
  const body = () => {
    c.beginPath(); c.arc(x, y - h + h * .1, h * .1, 0, 7);
    c.moveTo(x - h * .15, y - h * .76); c.lineTo(x + h * .15, y - h * .76); c.lineTo(x + h * .13, y - h * .42); c.lineTo(x - h * .13, y - h * .42); c.closePath();
    c.rect(x - h * .12, y - h * .44, h * .105, h * .44); c.rect(x + h * .015, y - h * .44, h * .105, h * .44);
    c.moveTo(x - h * .15, y - h * .75); c.lineTo(x - h * .2, y - h * .4); c.lineTo(x - h * .155, y - h * .4); c.lineTo(x - h * .11, y - h * .7); c.closePath();
    c.moveTo(x + h * .15, y - h * .75); c.lineTo(x + h * .2, y - h * .4); c.lineTo(x + h * .155, y - h * .4); c.lineTo(x + h * .11, y - h * .7); c.closePath();
  };
  c.strokeStyle = 'rgba(246,215,154,0.35)'; c.lineWidth = 2.2; body(); c.stroke(); c.fillStyle = '#050403'; body(); c.fill();
  if (!o.elder) {
    const fl = Math.sin(t * 2.3) * h * .02; c.fillStyle = RED; c.beginPath(); c.rect(x - h * .12, y - h * .8, h * .24, h * .055); c.fill();
    c.beginPath(); c.moveTo(x + h * .06, y - h * .76); c.lineTo(x + h * .14 + fl, y - h * .6); c.lineTo(x + h * .09 + fl, y - h * .58); c.lineTo(x + h * .02, y - h * .74); c.closePath(); c.fill();
  }
  c.restore();
  if (o.lantern > 0) { const la = clamp(o.lantern * a), lx = x + h * .26, ly = y - h * .3; c.save(); c.globalAlpha = la; c.strokeStyle = 'rgba(246,215,154,0.6)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + h * .19, y - h * .41); c.lineTo(lx, ly - h * .05); c.stroke(); c.restore(); glowDot(c, lx, ly, h * .045, la, 9); glowDot(c, lx, ly, h * .02, la, 30); }
}
// 透视夜路：两排路灯延伸到消失点。o.cam 前进距离；o.lamp(L) 每盏灯亮度；o.rise(L) 路灯升空成星（片尾）
const RF = VERT ? 900 : 1100, LH = 5.0, NL = 30, SP = 7, VP = VERT ? 640 : 470, HC = 1.7, RW = 2.4, LX = 3.0;
function road(c, t, o = {}) {
  const vpY = o.vpY ?? VP, hc = o.hc ?? HC, cam = o.cam ?? 0;
  const gy = z => vpY + RF * hc / z, px = (z, X) => CX + RF * X / z, ly = z => vpY - RF * (LH - hc) / z;
  let g = c.createRadialGradient(CX, vpY, 0, CX, vpY, 330); g.addColorStop(0, `rgba(246,215,154,${0.20 * (o.vg ?? 1)})`); g.addColorStop(1, 'rgba(246,215,154,0)'); c.fillStyle = g; c.fillRect(0, vpY - 330, W, 660);
  g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(232,177,90,0)'); g.addColorStop(.5, `rgba(232,177,90,${0.28 * (o.vg ?? 1)})`); g.addColorStop(1, 'rgba(232,177,90,0)'); c.fillStyle = g; c.fillRect(0, vpY - .5, W, 1);
  const z0 = 0.9, z1 = 4000;
  c.beginPath(); c.moveTo(px(z0, -RW), gy(z0)); c.lineTo(px(z1, -RW), gy(z1)); c.lineTo(px(z1, RW), gy(z1)); c.lineTo(px(z0, RW), gy(z0)); c.closePath();
  g = c.createLinearGradient(0, H, 0, vpY); g.addColorStop(0, `rgba(222,182,122,${0.10 * (o.ra ?? 1)})`); g.addColorStop(1, `rgba(222,182,122,${0.02 * (o.ra ?? 1)})`); c.fillStyle = g; c.fill();
  c.strokeStyle = `rgba(232,177,90,${0.30 * (o.ra ?? 1)})`; c.lineWidth = 1.2;
  for (const X of [-RW, RW]) { c.beginPath(); c.moveTo(px(z0, X), gy(z0)); c.lineTo(px(z1, X), gy(z1)); c.stroke(); }
  const lamps = [], span = NL * SP;
  for (let i = 0; i < NL; i++) for (const side of [-1, 1]) lamps.push({ i, side, z: 6 + (((i * SP + (side > 0 ? SP / 2 : 0) - cam) % span) + span) % span });
  lamps.sort((a, b) => b.z - a.z);
  for (const Lp of lamps) {
    const z = Lp.z; if (z < 2.4) continue;
    const df = clamp(1 - (z - 150) / 60) * clamp((z - 2.4) / 2);
    const b = o.lamp ? o.lamp(Lp) : 1;
    const x = px(z, Lp.side * LX), y0 = gy(z);
    let hy = ly(z), hx = x - Lp.side * RF * 0.4 / z;
    const rise = o.rise ? o.rise(Lp) : 0;
    if (rise > 0) { const r2 = rng(Lp.i * 31 + (Lp.side > 0 ? 7 : 0)); hy = lerp(hy, 40 + r2() * (VERT ? 520 : 300), eo(rise)); hx = lerp(hx, r2() * W, io(rise) * .6); }
    const pa = df * (1 - clamp(rise * 2));
    if (pa > 0) { c.strokeStyle = `rgba(200,160,100,${0.22 * pa})`; c.lineWidth = Math.max(.5, RF * .03 / z); c.beginPath(); c.moveTo(x, y0); c.lineTo(x, ly(z)); c.lineTo(x - Lp.side * RF * 0.4 / z, ly(z)); c.stroke(); }
    const r = Math.max(1.2, RF * .12 / z);
    if (b > 0.01) {
      if (pa > 0) {
        c.save(); c.globalAlpha = .9 * b * pa * clamp((z - 9) / 25);
        const cg = c.createLinearGradient(0, hy, 0, y0); cg.addColorStop(0, 'rgba(246,215,154,0.10)'); cg.addColorStop(1, 'rgba(246,215,154,0.0)');
        c.fillStyle = cg; c.beginPath(); c.moveTo(hx - r, hy); c.lineTo(hx + r, hy); c.lineTo(hx + RF * 1.1 / z, y0); c.lineTo(hx - RF * 1.1 / z, y0); c.closePath(); c.fill(); c.restore();
      }
      glowDot(c, hx, hy, r, b * Math.max(df, clamp(rise * 3)), 7);
    } else if (pa > 0) { c.strokeStyle = `rgba(200,160,100,${0.3 * pa})`; c.lineWidth = 1; c.beginPath(); c.arc(hx, hy, r, 0, 7); c.stroke(); }
  }
}
// 羊皮纸卡（画在不加光晕的层上）；o.dark 暗色卡
function parchment(c0, x, y, w, h, a, fn, o = {}) {
  if (a <= 0) return;
  noGlow(c0, c => {
    c.save(); c.globalAlpha = clamp(a); c.translate(x, y); c.rotate(o.rot || 0);
    c.shadowColor = 'rgba(0,0,0,0.7)'; c.shadowBlur = 44; c.shadowOffsetY = 16;
    const g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    if (o.dark) { g.addColorStop(0, '#1d150d'); g.addColorStop(1, '#120c07'); } else { g.addColorStop(0, '#cdb993'); g.addColorStop(.6, '#bba57a'); g.addColorStop(1, '#9c845a'); }
    c.fillStyle = g; c.fillRect(-w / 2, -h / 2, w, h); c.shadowColor = 'transparent';
    if (!o.dark) { const e = c.createRadialGradient(0, 0, Math.min(w, h) * .3, 0, 0, Math.max(w, h) * .7); e.addColorStop(0, 'rgba(90,60,25,0)'); e.addColorStop(1, 'rgba(90,60,25,0.35)'); c.fillStyle = e; c.fillRect(-w / 2, -h / 2, w, h); c.strokeStyle = 'rgba(80,55,25,0.45)'; c.lineWidth = 1; c.strokeRect(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32); }
    else { c.strokeStyle = rgba(GOLD, .8); c.lineWidth = 1.5; c.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24); }
    fn && fn(c, w, h); c.restore();
  });
}

const NOISE_BG = (() => { const c = mk(512, 512), x = c.getContext('2d'), d = x.createImageData(512, 512), r = rng(1); for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 14; } x.putImageData(d, 0, 0); return c; })();

window.THEME = {
  id: 'blackgold', name: '黑金夜路',
  C: { bg: '#0B0906', ink: '#F4EEE4', soft: '#B9AC97', accent: GOLD, accent2: GOLD2, hl: HL, neg: '#D0574C', pos: GOLD2, panel: '#1A140D' },
  F: { cjk: SERIF, heavy: SERIF, en: ROMAN, num: ROMAN, mono: "'JetBrains Mono','DejaVu Sans Mono',monospace" },
  sub: { fill: '#F4EEE4', hl: HL, neg: '#D0574C', en: '#E9DCC6', weight: 700, shadow: 'rgba(0,0,0,0.92)', shadowBlur: 14 },
  glow: [.5, .42, .4],
  preload: [`900 120px ${SERIF}`, `600 40px ${SERIF}`, `500 40px ${SERIF}`, `600 40px ${ROMAN}`, `500 30px ${ROMAN}`],
  bg(c) {
    c.fillStyle = '#0B0906'; c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(CX, L.VC + 140, 0, CX, L.VC + 140, Math.max(W, H) * .62); g.addColorStop(0, 'rgba(70,45,22,0.32)'); g.addColorStop(1, 'rgba(70,45,22,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  },
  post(c) {
    let g = c.createRadialGradient(CX, L.VC + 140, Math.min(W, H) * .43, CX, L.VC + 140, Math.max(W, H) * .67); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.72)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    g = c.createLinearGradient(0, L.SUB_Y - 220, 0, L.SUB_Y + 140); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); c.fillStyle = g; c.fillRect(0, L.SUB_Y - 220, W, H);
  },
  grain(c) { c.save(); c.globalAlpha = 1; for (let y = 0; y < H; y += 512) for (let x = 0; x < W; x += 512) c.drawImage(NOISE_BG, x, y); c.restore(); },  // 静态噪点
  flash: a => `rgba(255,244,225,${a})`,
  bigWord(c, s, x, y, size, a, lt, o) { goldText(c, s, x, y, size, a, lt, o); },
  counter(c, s, x, y, size, a, o) { c.save(); c.shadowColor = 'rgba(246,215,154,0.5)'; c.shadowBlur = size * .3; T(c, s, x, y, `600 ${size}px ${ROMAN}`, o.color ? col(o.color) : '#FFE7B0', o.align || 'center', o.ls || 0, a); c.restore(); },
  panel(c, x, y, w, h, a, fn, o) { parchment(c, x, y, w, h, a, fn, o); },
  // 片名卡：金箔大字 + 光爆 + 金线 + 英文。对齐第一个鼓点
  card(c, lt, s) {
    const y = L.VC - 40, a = pr(lt, .10, .62), sc = lerp(1.12, 1, eo(pr(lt, .10, .95)));
    burst(c, CX, y, pr(lt, .05, .85)); sparkles(c, 55, CX, y, W * .87, 520, 90, lt, a * .9);
    const size = Math.min(180, (W - 2 * L.MX) / Math.max(2, [...FILM.title].length) * .92);
    c.save(); c.translate(CX, y); c.scale(sc, sc); goldText(c, FILM.title, 0, 0, size, a, lt, { ls: 8 }); c.restore();
    const la = pr(lt, .62, 1.55); c.fillStyle = rgba(GOLD, .62 * la); c.fillRect(CX - 250 * eo(la), y + size * .62, 500 * eo(la), 1.4);
    if (FILM.en) T(c, FILM.en.split('').join(' ').replace(/   /g, '  '), CX, y + size * .62 + 66, `600 32px ${ROMAN}`, GOLD2, 'center', 6, la * .9);
  },
  // 片尾：星空 + 路灯升空成星 + 金箔片名 + 英文 + 署名 + 一句话 + 出处
  ending(c, lt) {
    starfield(c, lt + 100, .9);
    road(c, lt, { cam: lt * .4, hc: 3.6, vg: .5, ra: .7, lamp: () => 0, rise: () => 2 });
    const y = VERT ? 548 : 330, a = pr(lt, .35, 1.5), sc = lerp(1.10, 1, eo(pr(lt, .35, 1.9)));
    c.save(); c.translate(CX, y); c.scale(sc, sc); goldText(c, FILM.title, 0, 0, Math.min(172, (W - 160) / [...FILM.title].length), a, lt, { ls: 20 }); c.restore();
    sparkles(c, 33, CX, y, 880, 400, 90, lt, a);
    const la = pr(lt, 1.0, 2.0); c.fillStyle = rgba(GOLD, .6 * la); c.fillRect(CX - 250 * eo(la), y + 128, 500 * eo(la), 1);
    let yy = y + 210;
    if (FILM.en) { T(c, FILM.en, CX, yy, `600 40px ${ROMAN}`, GOLD2, 'center', 9, pr(lt, 1.3, 2.4) * .9); yy += 72; }
    if (FILM.sign) { T(c, FILM.sign.toUpperCase().split('').join(' '), CX, yy, `600 30px ${ROMAN}`, GOLD2, 'center', 8, pr(lt, 1.7, 2.7) * .95); yy += 76; }
    if (FILM.sub) { T(c, FILM.sub, CX, yy, `500 30px ${SERIF}`, rgba(GOLD2, .84), 'center', 6, pr(lt, 1.75, 2.65) * .92); yy += 74; }
    (FILM.refs || []).slice(0, 3).forEach((r, i) => T(c, r, CX, yy + i * 28, `500 18px ${ROMAN}`, rgba(GOLD, .6), 'center', 1, pr(lt, 2.05, 2.9) * .8));
    if (FILM.credit) T(c, FILM.credit, CX, yy + 3 * 28 + 30, `500 17px ${SERIF}`, rgba(GOLD, .5), 'center', 4, pr(lt, 2.25, 3.1) * .6);
  },
  chapter(c, txt, a) { T(c, txt, L.CH_X, L.CH_Y, `500 ${L.CH_FS}px ${SERIF}`, '#E9DCC6', 'left', 3, a); },
  sign(c, txt) {
    c.save(); c.font = `600 24px ${ROMAN}`; c.letterSpacing = '3px'; const bw = c.measureText(txt).width; c.restore();
    T(c, txt, W - 56, L.SIGN_Y, `600 24px ${ROMAN}`, GOLD, 'right', 3, .6);
    c.save(); c.globalAlpha = .6; c.fillStyle = RED; c.beginPath(); c.arc(W - 56 - bw - 16, L.SIGN_Y - 8, 6, 0, 7); c.fill(); c.restore();
  },
  hud(c, t, h) {   // 右上角两行小字：地点·年份 / 补充
    const a = .55; h.cur.forEach((s, i) => T(c, s, W - 64, L.CH_Y + i * 34, `${i ? 500 : 600} ${i ? 22 : 26}px ${i ? ROMAN : SERIF}`, i ? GOLD : '#E9DCC6', 'right', 2, a * (h.prev ? h.k : 1)));
  },
};
