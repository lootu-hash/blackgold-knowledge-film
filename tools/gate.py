#!/usr/bin/env python3
"""成片门禁：python3 tools/gate.py final.mp4
红灯不交付。查：规格与时长、第 0 帧有没有画面、中段空画面、画面停太久、响度与真峰值。
抽帧看不出运镜顺不顺，红绿灯只是底线；交付前仍要把成片按正常速度看一遍（看不了就如实说明）。"""
import json, subprocess, sys
import numpy as np

f = sys.argv[1] if len(sys.argv) > 1 else 'final.mp4'
R, Y, G = [], [], []
pj = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', f], capture_output=True, text=True).stdout)
v = next((s for s in pj['streams'] if s['codec_type'] == 'video'), None)
a = next((s for s in pj['streams'] if s['codec_type'] == 'audio'), None)
dur = float(pj['format']['duration'])
if not v: sys.exit('🔴 没有视频流')
w, h = int(v['width']), int(v['height']); fps = eval(v['r_frame_rate'])
G.append(f'{w}×{h} · {fps:.0f}fps · {dur:.2f}s · 视频 {v["codec_name"]}' + (f' · 音频 {a["codec_name"]} {a.get("sample_rate")}Hz' if a else ''))
if (w, h) not in ((1080, 1920), (1920, 1080)): Y.append(f'分辨率 {w}×{h} 不是 1080×1920 / 1920×1080')
if abs(fps - 30) > .01: R.append(f'帧率 {fps}，应为 30')
if not a: R.append('没有音轨')
try:
    tl = json.load(open('timeline.json'));
    if abs(tl['total'] - dur) > .4: R.append(f'时长 {dur:.2f}s 和时间轴 {tl["total"]:.2f}s 对不上（渲染漏帧或合成截断）')
except FileNotFoundError: pass

# 抽灰度小图：每 0.25s 一帧，108 宽
sw, sh = (108, 192) if h > w else (192, 108)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', f'fps=4,scale={sw}:{sh},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, sh, sw).astype(np.float32)
std = fr.reshape(len(fr), -1).std(1)
edge = np.abs(np.diff(fr, axis=2)).mean((1, 2))
if std[0] < 4 or edge[0] < .6: R.append(f'第 0 帧几乎是空的（对比度 {std[0]:.1f}）：开头不许黑场或空镜，第一帧就要有画面和问题')
blank = (std < 4) | (edge < .5)
end_i = len(fr) - int(2.5 * 4)
run = 0
for i in range(1, end_i):
    run = run + 1 if blank[i] else 0
    if run == 2: R.append(f'{(i - 1) / 4:.2f}s 起连续空画面：中段不能只剩纯色'); break
diff = np.abs(np.diff(fr, axis=0)).mean((1, 2))
run = 0; worst = 0; wt = 0
for i, d in enumerate(diff[:end_i]):
    run = run + 1 if d < .35 else 0
    if run > worst: worst, wt = run, (i - run + 1) / 4
if worst / 4 > 4: Y.append(f'{wt:.1f}s 起约 {worst / 4:.1f}s 画面几乎不动：每 2–2.5 秒要有新的画面状态')
G.append(f'画面：平均帧间变化 {diff.mean():.2f}，最长静止 {worst / 4:.1f}s')

if a:
    st = subprocess.run(['ffmpeg', '-hide_banner', '-i', f, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    j = json.loads(st[st.rindex('{'):st.rindex('}') + 1]); I, TP = float(j['input_i']), float(j['input_tp'])
    G.append(f'响度 {I:.1f} LUFS · 真峰值 {TP:.1f} dBTP')
    if TP > -.5: R.append(f'真峰值 {TP:.1f} dBTP，会在平台转码后削波：重跑 music.py（或把限幅压低）')
    elif TP > -1: Y.append(f'真峰值 {TP:.1f} dBTP，略高（目标 ≤ -1）')
    if I < -19: Y.append(f'响度 {I:.1f} LUFS 偏轻（目标 -14 到 -16）')
    if I > -11: Y.append(f'响度 {I:.1f} LUFS 偏响')
    # 开头 0.5 秒有没有声音
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-t', '0.6', '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], capture_output=True).stdout
    x = np.frombuffer(pcm, '<i2').astype(float) / 32768
    if len(x) and np.sqrt(np.mean(x ** 2)) < .01: Y.append('前 0.6 秒几乎没声音：音乐要从第 0 秒就在')

print('\n'.join(G))
for s in R: print('🔴 ' + s)
for s in Y: print('🟡 ' + s)
if not R and not Y: print('🟢 门禁通过')
print(f'红灯 {len(R)} · 黄灯 {len(Y)}')
sys.exit(1 if R else 0)
