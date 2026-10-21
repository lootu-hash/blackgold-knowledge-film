// 《生日悖论》LED 记录牌样片 · 场景
const ROOMS = simulate('rooms', 23, r => { const out = []; for (let i = 0; i < 10000; i++) { const s = new Set(); let h = false; for (let k = 0; k < 23; k++) { const b = Math.floor(r() * 365); if (s.has(b)) h = true; s.add(b); } out.push(h); } return out; });
const ROOM1 = simulate('room1', 5, r => Array.from({ length: 23 }, () => Math.floor(r() * 365)));

SCN.s1 = (c, lt, s) => {
  // 365 颗灯 = 一年；进来一个人，他的生日那颗亮红
  panel(c, CX, 700, W - 2 * L.MX, 1000, 1, (c, w, h) => {
    const lit = Math.floor(clamp(lt / (s.ls[1] + 1.2)) * 23), days = new Set(ROOM1.slice(0, lit));
    grid(c, 0, 30, 19, 20, 46, i => i >= 365 ? -1 : days.has(i) ? 2 : 0, 1, { r: 13, k: i => i >= 365 ? 0 : 1 });
  }, { head: '365 DAYS' });
  counter(c, W - L.MX - 30, 250, 60, Math.floor(clamp(lt / (s.ls[1] + 1.2)) * 23), 1, { align: 'right', color: 'neg' });
  const kq = pr(lt, s.ls[1] + .3, s.ls[1] + .8);
  if (kq > 0) bigWord(c, '?', CX, 1300, 170, kq, lt, { color: 'accent', k: kq });
};

SCN.s2 = (c, lt, s) => {
  counter(c, CX, 760, 260, lerp(0, 183, eo(pr(lt, .1, 1.5))), 1);
  T(c, '365 ÷ 2', CX, 860, `700 44px ${LMONO}`, '#8E8981', 'center', 4, pr(lt, 1.2, 1.8));
  bubble(c, CX, 1060, 560, '要一半的天数吧？', pr(lt, .4, .8), { strike: pr(lt, s.le[0] - .5, s.le[0]) });
};

SCN.s4 = (c, lt, s) => {
  const N = 100, cell = VERT ? 9 : 7, gy = 680, shown = Math.floor(clamp(lt / (s.ls[1] + .4)) * 10000);
  grid(c, CX, gy, N, N, cell, i => ROOMS[i] ? 1 : 0, 1, { plain: true, r: cell * .36, dimA: .12, k: i => i < shown ? 1 : 0 });
  let hit = 0; for (let i = 0; i < shown; i++) if (ROOMS[i]) hit++;
  const pct = shown ? hit / shown * 100 : 0;
  counter(c, CX, 1290, 90, pct, 1, { dec: 1, suf: '%', color: 'accent' });
};

SCN.s5 = (c, lt, s) => {
  const R = 330, cy = 680, k = pr(lt, .4, 2.6);
  const P = Array.from({ length: 23 }, (_, i) => { const th = -Math.PI / 2 + i / 23 * Math.PI * 2; return [CX + Math.cos(th) * R, cy + Math.sin(th) * R]; });
  let n = 0; const total = Math.floor(253 * eo(k));
  c.save(); c.lineWidth = 1; c.strokeStyle = rgba(LED.green, .13);
  for (let i = 0; i < 23; i++) for (let j = i + 1; j < 23; j++) { if (n++ >= total) break; c.beginPath(); c.moveTo(...P[i]); c.lineTo(...P[j]); c.stroke(); }
  c.restore();
  P.forEach(([x, y], i) => lamp(c, x, y, 12, LED.bone, pr(lt, i * .02, i * .02 + .3)));
  c.save(); c.fillStyle = LED.bg; c.beginPath(); c.arc(CX, cy, 150, 0, 7); c.fill(); c.restore();
  counter(c, CX, cy + 60, 150, total, 1, { color: 'accent' });
};

SCN.s6 = (c, lt, s) => {
  lamp(c, CX - 140, 700, 90, LED.red, pr(lt, .2, .6)); lamp(c, CX + 140, 700, 90, LED.red, pr(lt, .7, 1.1));
  ledText(c, '同一天？', CX, 960, 80, LED.bone, pr(lt, 1, 1.4), { k: pr(lt, 1, 1.8) });
};
