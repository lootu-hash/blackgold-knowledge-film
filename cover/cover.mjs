// 封面：node cover/cover.mjs spec.json 输出前缀   → 前缀_1080x1920.png、前缀_2160x3840.png，并打印核对结果
// spec 里 "style" 选配色（blackgold / led），骨架位置相同。规范见 references/05-封面.md
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const { launch } = await import(path.join(here, '..', 'tools', 'pw.mjs'));
const [specPath, out] = process.argv.slice(2);
if (!specPath || !out) { console.log('用法：node cover/cover.mjs spec.json 输出前缀'); process.exit(0); }
const S = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const b = await launch();
for (const sc of [2, 1]) {
  const p = await b.newPage({ viewport: { width: 1080 * sc, height: 1920 * sc } });
  await p.goto('file://' + path.join(here, 'cover.html'));
  await p.evaluate(() => Promise.all(["500 100px 'Noto Serif CJK SC'", "400 56px 'Noto Serif CJK SC'", "500 100px 'Noto Sans CJK SC'", "400 56px 'Noto Sans CJK SC'", '500 30px Inter'].map(f => document.fonts.load(f, '封面A'))));
  const rep = await p.evaluate(([S, sc]) => window.draw(S, sc), [S, sc]);
  const buf = await p.evaluate(() => document.getElementById('cv').toDataURL('image/png'));
  fs.writeFileSync(`${out}_${1080 * sc}x${1920 * sc}.png`, Buffer.from(buf.split(',')[1], 'base64'));
  if (sc === 1) { console.log(JSON.stringify(rep)); if (rep.problems.length) console.log('🔴 有问题，改到 problems 为空'); }
  await p.close();
}
await b.close();
