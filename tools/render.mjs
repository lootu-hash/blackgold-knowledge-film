// 渲染一段帧并直接编码成交付质量：node tools/render.mjs 起始帧 结束帧 out.mp4
// 页面内 canvas.toDataURL 取帧（比截图快约 3 倍），经管道一次编码（libx264 veryfast crf21），不出中间片
import { spawn } from 'child_process';
import { launch, openFilm } from './pw.mjs';
const [a, b, out] = process.argv.slice(2);
const t0 = Date.now();
const br = await launch(); const { page } = await openFilm(br);
const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', '30', '-i', '-',
  '-vf', 'scale=in_range=full:out_range=limited', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
  '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', '30', out], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let f = +a; f < +b; f++) {
  const d = await page.evaluate(t => { window.seekTo(t); return document.getElementById('cv').toDataURL('image/jpeg', .93); }, f / 30);
  if (!ff.stdin.write(Buffer.from(d.slice(23), 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  if ((f - a) % 300 === 0) console.log(out, f, ((Date.now() - t0) / 1000).toFixed(0) + 's');
}
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await br.close();
console.log('DONE', out, ((Date.now() - t0) / 1000).toFixed(0) + 's');
