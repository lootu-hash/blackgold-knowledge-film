// 找 Playwright：优先项目自己的 node_modules，其次 PW_MODULES，再其次全局 npm 目录
import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
export async function launch() {
  const cands = [process.cwd() + '/node_modules/', process.env.PW_MODULES, '/opt/npm-tools/node_modules/'];
  try { cands.push(execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() + '/'); } catch (e) { }
  let pw = null;
  for (const m of cands.filter(Boolean)) {
    for (const name of ['playwright', 'playwright-core']) {
      try { pw = createRequire(m.endsWith('/') ? m : m + '/')(name); break; } catch (e) { }
    }
    if (pw) break;
  }
  if (!pw) { console.error('找不到 Playwright。在项目目录运行：npm i playwright && npx playwright install chromium'); process.exit(1); }
  const opts = { args: ['--no-sandbox', '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'] };
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) opts.executablePath = process.env.CHROME_PATH;
  return pw.chromium.launch(opts);
}
export async function openFilm(browser) {
  const film = path.resolve('index.html');
  if (!fs.existsSync(film)) { console.error('请在片子目录（有 index.html 的地方）运行'); process.exit(1); }
  const probe = await browser.newPage({ viewport: { width: 400, height: 400 } });
  await probe.goto('file://' + film);
  const aspect = await probe.evaluate(() => (window.FILM && window.FILM.aspect) || 'vertical');
  await probe.close();
  const [w, h] = aspect === 'horizontal' ? [1920, 1080] : [1080, 1920];
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => { errs.push(e.message); console.log('[页面报错]', e.message); });
  page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });
  await page.goto('file://' + film);
  const info = await page.evaluate(() => window.READY);
  return { page, info, w, h, errs };
}
