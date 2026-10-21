// 文案与工程体检：node tools/lint.mjs
// 红灯 = 必须改完才能渲染；黄灯 = 想清楚理由再保留。规则来自 references/01-选题与留存.md
import fs from 'fs';
import { launch, openFilm } from './pw.mjs';

const R = [], Y = [], G = [];
const red = s => R.push(s), yel = s => Y.push(s);
const scenesSrc = fs.existsSync('scenes.js') ? fs.readFileSync('scenes.js', 'utf8') : '';
if (/Math\.random/.test(scenesSrc)) red('scenes.js 用了 Math.random：每帧会不一样，改用 rng(seed) 或 simulate()');

const br = await launch(); const { page, info, errs } = await openFilm(br);
if (errs.length) red('页面报错：' + errs.join(' / '));
const rep = await page.evaluate(() => {
  const out = { film: window.FILM, lines: [], scenes: window.TIMELINE.scenes, card: window.CARD, climax: window.CLIMAX, cam: window.CAM || {}, lead: window.LEAD || {}, raw: window.LINES, scn: Object.keys(SCN), vert: VERT, maxw: L.SUB_MAXW, theme: THEME.id };
  const NS = '，。：；、！？—…,.!?;:）」』】》”’', NE = '（「『【《“‘';
  for (const L0 of LINES) {
    const { chars, fs, lay, el } = window.subLayout(L0); const txt = [];
    let wmax = 0; lay.lines.forEach(idx => { let w = 0, s = ''; for (const k of idx) { w += lay.w[k]; s += chars[k].ch; } wmax = Math.max(wmax, w); txt.push(s); });
    const bad = [];
    txt.forEach((s, i) => { if (i > 0 && NS.includes(s[0])) bad.push(`第${i + 1}行以「${s[0]}」开头`); if (NE.includes(s[s.length - 1])) bad.push(`第${i + 1}行以「${s[s.length - 1]}」结尾`); });
    out.lines.push({ zh: L0.zh, sid: L0.sid, start: L0.start, end: L0.end, rows: lay.lines.length, fs, wmax, txt, enRows: el.length, bad });
  }
  return out;
});
await br.close();

const F = rep.film, total = info.total;
if (!F.title || F.title === '片名') red('FILM.title 没填');
// 1 开头
const first = rep.lines[0];
if (!first || first.start > .05) red('第一句字幕不在第 0 秒出现：把第一个场景的 LEAD 设为 0');
const hook = rep.lines.filter(l => l.end <= 3.6).map(l => l.zh).join('');
if (!/[？?]/.test(rep.lines.slice(0, 2).map(l => l.zh).join(''))) yel('前两句里没有问号：开头 3 秒要把问题抛出来（"换不换？""要几个人？"）');
// 2 片名卡
if (!rep.card) red('没设 window.CARD（片名卡场景）');
else { const s = rep.scenes.find(x => x.id === rep.card); if (!s) red(`CARD='${rep.card}' 不是 LINES 里的场景`); else if (s.start > 17.4) yel(`片名卡在 ${s.start.toFixed(1)}s，晚于 17.4s：前 20 秒是流失最多的时段，核心大字要更早`); }
if (rep.climax && !rep.scenes.find(x => x.id === rep.climax)) red(`CLIMAX='${rep.climax}' 不是 LINES 里的场景`);
// 3 场景实现
for (const s of rep.scenes) if (s.id !== 'title' && s.id !== rep.card && !rep.scn.includes(s.id)) red(`场景 ${s.id} 在 LINES 里出现了，但 scenes.js 里没有 SCN.${s.id}`);
// 4 字幕
const limit = rep.vert ? 20 : 26;
for (const l of rep.lines) {
  const n = [...l.zh.replace(/[【】〖〗]/g, '')].length, d = (l.end - l.start) / .93, rec = Math.min(3.6, Math.max(2.2, 1.3 + .12 * n));
  if (l.rows > 2) red(`「${l.zh}」排成 ${l.rows} 行：拆成两句`);
  if (n > limit) red(`「${l.zh}」${n} 字，超过 ${limit} 字：拆开`); else if (n > limit - 2) yel(`「${l.zh}」${n} 字，偏长`);
  if (d < rec - .45) yel(`「${l.zh}」显示 ${d.toFixed(1)}s，按字数建议 ${rec.toFixed(1)}s，可能读不完`);
  if (l.bad.length) yel(`「${l.zh}」换行：${l.bad.join('，')}`);
  if (l.enRows > 2) yel(`「${l.zh}」英文超过两行，缩短英文`);
}
const hlByScene = {}; for (const l of rep.raw) hlByScene[l[0]] = (hlByScene[l[0]] || 0) + (l[2].match(/【/g) || []).length;
for (const [k, v] of Object.entries(hlByScene)) if (v > 2) yel(`场景 ${k} 有 ${v} 个金色高亮：每段 1–2 个，多了就不亮了`);
// 5 结尾
const last = rep.lines[rep.lines.length - 1];
if (last && !/[？?]/.test(last.zh)) yel('最后一句不是问题：结尾要回到观众，给一个能站队或晒答案的问题');
// 6 节奏与镜头
for (const s of rep.scenes) { const d = s.end - s.start; if (s.id !== 'title' && d > 12) yel(`场景 ${s.id} 长 ${d.toFixed(1)}s：每 2–2.5 秒画面状态要变一次，检查这段有没有足够多的动作`); }
const cams = rep.scenes.filter(s => s.id !== 'title').map(s => rep.cam[s.id] || 'still');
for (let i = 2; i < cams.length; i++) if (cams[i] === 'in' && cams[i - 1] === 'in' && cams[i - 2] === 'in') { yel('连续三个场景都在往里推：推进去要拉出来或横移'); break; }
if (cams.length > 4 && new Set(cams).size === 1 && cams[0] !== 'still') yel(`所有场景都是同一种镜头（${cams[0]}）：像放 PPT`);
if (cams.filter(c => c === 'snap').length > 3) yel('snap 重音超过 3 次：重音要数得过来');
// 7 片长
if (total > 165) red(`片长 ${total.toFixed(1)}s 超过 2:45`);
else if (total > 95) yel(`片长 ${total.toFixed(1)}s：默认 55–75 秒（人均只看 16 秒，2 分钟片子完播 1–2%）。用户要长版才保留`);
else if (total < 40) yel(`片长 ${total.toFixed(1)}s：偏短，只适合样片`);
G.push(`片长 ${total.toFixed(1)}s · ${rep.lines.length} 句 · ${rep.scenes.length - 1} 个场景 · 片名卡 ${info.timeline.card?.toFixed(2)}s` + (info.timeline.climax ? ` · 高潮 ${info.timeline.climax.toFixed(2)}s` : ''));

console.log('\n' + G.join('\n'));
for (const s of R) console.log('🔴 ' + s);
for (const s of Y) console.log('🟡 ' + s);
if (!R.length && !Y.length) console.log('🟢 全部通过');
console.log(`\n红灯 ${R.length} · 黄灯 ${Y.length}`);
fs.writeFileSync('timeline.json', JSON.stringify(info.timeline, null, 1));
process.exit(R.length ? 1 : 0);
