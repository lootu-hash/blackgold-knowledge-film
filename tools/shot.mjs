// 预览帧：node tools/shot.mjs 输出目录 s3+2.5 s10+6 12.5 …   （场景id+秒，或绝对秒）
// 同时写出 timeline.json（配乐、音效、字幕都从它取时间）
import fs from 'fs';
import { launch, openFilm } from './pw.mjs';
const [out, ...ts] = process.argv.slice(2);
if (!out) { console.log('用法：node tools/shot.mjs 输出目录 s1+0.5 s3+1.2 …'); process.exit(0); }
fs.mkdirSync(out, { recursive: true });
const br = await launch(); const { page, info, errs } = await openFilm(br);
console.log('总长', info.total.toFixed(2), '秒');
for (const raw of ts) {
  const t = await page.evaluate(r => { const m = r.match(/^(\w+)\+([\d.]+)$/); if (m) { const s = window.TIMELINE.scenes.find(x => x.id === m[1]); return s ? s.start + parseFloat(m[2]) : NaN; } return parseFloat(r); }, raw);
  if (isNaN(t)) { console.log('跳过（没有这个场景）', raw); continue; }
  await page.evaluate(t => window.seekTo(t), t);
  await page.screenshot({ path: `${out}/${raw.replace('+', '_')}.png` });
  console.log(raw, '→', t.toFixed(2) + 's');
}
fs.writeFileSync('timeline.json', JSON.stringify(info.timeline, null, 1));
await br.close();
if (errs.length) process.exit(2);
