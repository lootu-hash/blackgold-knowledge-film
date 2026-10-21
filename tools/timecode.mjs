// 算时间码（不开浏览器）：node tools/timecode.mjs [script.js]
// 写确认表之前先把文案写进 script.js 的 LINES，跑它得到每句的起止时间、片名卡和高潮时间、总片长（和引擎算法完全一致）
import fs from 'fs'; import vm from 'vm';
const f = process.argv[2] || 'script.js';
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
const w = ctx.window, LEAD = w.LEAD || {}; let t = 0, prev = null; const sc = {}, out = [];
for (const [sid, d0, zh, en] of w.LINES) {
  const d = d0 * .93;
  if (sid !== prev) { if (prev) t += .4; sc[sid] = t; t += LEAD[sid] || 0; prev = sid; }
  const n = [...zh.replace(/[【】〖〗]/g, '')].length, rec = Math.min(3.6, Math.max(2.2, 1.3 + .12 * n));
  out.push(`${sid.padEnd(5)} ${t.toFixed(1).padStart(5)}–${(t + d).toFixed(1).padEnd(5)} ${String(n).padStart(2)}字 ${d0.toFixed(2)}${Math.abs(d0 - rec) > .45 ? `（建议${rec.toFixed(1)}）` : ''}  ${zh}`);
  t += d + .15;
}
t += .8; const total = t + (w.TITLE_DUR || 5);
console.log(out.join('\n'));
console.log(`\n片尾标题卡 ${t.toFixed(1)}s 起 · 总长 ${total.toFixed(1)}s（${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')}）`);
if (w.CARD) console.log(`片名卡 ${w.CARD} = ${(sc[w.CARD] + .12).toFixed(2)}s（第一个鼓点，要 ≤ 17.4s）`);
if (w.CLIMAX) console.log(`高潮 ${w.CLIMAX} = ${(sc[w.CLIMAX] + .25).toFixed(2)}s（白闪 + 第二个鼓点）`);
