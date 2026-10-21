// 《生日悖论》黑金样片 · 场景。每个场景 SCN.id = (c, lt, s) => {…}
// c 画布；lt 场景内秒数；s.ls[i] 第 i 句字幕相对场景开头的时间；s.dur 场景时长
// 画面元素不要低于 L.SAFE（下面是字幕区）；左右留 L.MX

// 模拟：一万个房间，每间 23 人（种子 23 → 50.74%）
const ROOMS = simulate('rooms', 23, r => { const out = []; for (let i = 0; i < 10000; i++) { const s = new Set(); let h = false; for (let k = 0; k < 23; k++) { const b = Math.floor(r() * 365); if (s.has(b)) h = true; s.add(b); } out.push(h); } return out; });
// 一个房间里 23 人的生日（用来点亮 365 格）
const ROOM1 = simulate('room1', 5, r => Array.from({ length: 23 }, () => Math.floor(r() * 365)));

SCN.s1 = (c, lt, s) => {
  road(c, lt, { cam: lt * 1.2, vg: .8 });
  figure(c, CX, L.GROUND, 150, lt, { lantern: 0 });
  // 365 天日历点阵：人一个个进门，点亮他的生日
  const cols = 19, cell = 46, cy = 380;
  const lit = Math.floor(clamp(lt / (s.ls[1] + 1.2)) * 23);
  const days = new Set(ROOM1.slice(0, lit));
  grid(c, CX, cy, cols, 20, cell, i => i >= 365 ? -1 : days.has(i) ? 1 : 0, 1, { k: i => i >= 365 ? 0 : pr(lt, i * .002, i * .002 + .3), r: 7 });
  counter(c, W - L.MX, 160, 76, lit, 1, { align: 'right' });
  T(c, 'PEOPLE', W - L.MX, 196, `500 20px ${ROMAN}`, rgba(GOLD2, .55), 'right', 6, 1);
  const kq = eo(pr(lt, s.ls[1] + .3, s.ls[1] + .9));
  if (kq > 0) bigWord(c, '?', CX, 900, 220 * lerp(1.3, 1, kq), kq, lt);
};

SCN.s2 = (c, lt, s) => {
  road(c, lt, { cam: 8 + lt, vg: .5, ra: .6 });
  const k = eo(pr(lt, .1, 1.6));
  counter(c, CX, 700, 260, lerp(0, 183, k), 1);
  T(c, '365 ÷ 2', CX, 800, `600 44px ${ROMAN}`, rgba(GOLD2, .6), 'center', 6, pr(lt, 1.2, 1.8));
  bubble(c, CX, 1000, 560, '要一半的天数吧？', pr(lt, .4, .8), { strike: pr(lt, s.le[0] - .5, s.le[0]) });
};

SCN.s4 = (c, lt, s) => {
  // 100×100 = 一万个房间，逐行填满；金色 = 有人撞生日
  const N = 100, cell = VERT ? 9.2 : 7.2, gy = 640;
  const fill = clamp(lt / (s.ls[1] + .4));
  const shown = Math.floor(fill * 10000);
  grid(c, CX, gy, N, N, cell, i => ROOMS[i] ? 1 : 0, 1, { plain: true, square: true, r: cell * .38, k: i => i < shown ? 1 : 0 });
  let hit = 0; for (let i = 0; i < shown; i++) if (ROOMS[i]) hit++;
  const pct = shown ? hit / shown * 100 : 0;
  counter(c, CX, 230, 120, pct, pr(lt, .2, .6), { dec: 1, suf: '%' });
  T(c, `${shown.toLocaleString('en-US')} / 10,000 ROOMS`, CX, 290, `500 24px ${ROMAN}`, rgba(GOLD2, .6), 'center', 5, pr(lt, .2, .6));
  bar(c, L.MX + 60, 1180, W - 2 * L.MX - 120, 26, pct / 100, pr(lt, .3, .8), { mark: .5, label: '撞生日', value: pct.toFixed(1) + '%' });
};

SCN.s5 = (c, lt, s) => {
  // 23 人围成一圈，两两连线：253 对
  const R = 330, cy = 680, k = pr(lt, .4, 2.6);
  const P = Array.from({ length: 23 }, (_, i) => { const th = -Math.PI / 2 + i / 23 * Math.PI * 2; return [CX + Math.cos(th) * R, cy + Math.sin(th) * R]; });
  let n = 0; const total = Math.floor(253 * eo(k));
  c.save(); c.lineWidth = 1;
  for (let i = 0; i < 23; i++) for (let j = i + 1; j < 23; j++) { if (n++ >= total) break; c.strokeStyle = rgba(GOLD, .16); c.beginPath(); c.moveTo(...P[i]); c.lineTo(...P[j]); c.stroke(); }
  c.restore();
  P.forEach(([x, y], i) => glowDot(c, x, y, 7, pr(lt, i * .02, i * .02 + .3), 5));
  counter(c, CX, cy + 40, 150, total, 1);
  T(c, 'PAIRS', CX, cy + 100, `500 26px ${ROMAN}`, rgba(GOLD2, .6), 'center', 8, 1);
};

SCN.s6 = (c, lt, s) => {
  starfield(c, lt, .6);
  road(c, lt, { cam: 20 + lt * .8, vg: .9 });
  figure(c, CX - 120, L.GROUND, 150, lt, { lantern: pr(lt, .3, 1.2) });
  figure(c, CX + 120, L.GROUND, 150, lt + 1, { lantern: pr(lt, 1.0, 1.9), a: pr(lt, .6, 1.4) });
};
