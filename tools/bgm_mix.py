#!/usr/bin/env python3
"""用你自己的背景音乐（而不是 music.py 合成的原创配乐），并把曲子的两个鼓点对齐到画面。

先量出曲子的参数（可以用耳朵 + 播放器进度条，也可以跑 --analyze 看能量曲线）：
  --bpm     速度；--drop1 曲子第一个鼓点（满编进来）的秒数；--drop2 第二个鼓点的秒数（可省略）
然后（在片子目录）：
  python3 tools/music.py --sfx-only                  # 先出只有音效的 sfx.wav
  python3 tools/bgm_mix.py --bgm 曲子.mp3 --bpm 112.3 --drop1 17.43 --drop2 102.51
脚本从 timeline.json 读片名卡（card）和高潮（climax）时间：曲子从 (drop1 − card) 秒处开始播，让第一个鼓点落在片名卡；
再在第一个鼓点后第 8 小节处剪掉或重复整小节，让第二个鼓点落在高潮，打印误差。误差 > 0.3s 就调高潮前一个场景的 LEAD。
输出 score.wav（已做响度：-14 LUFS 目标，真峰值 ≤ -1.5 dBTP）。

示例参数：《We Never (Remix)》实测 112.3 BPM、F 小调，drop1=17.43、drop2=102.51，降调段约 10.8–17.4s 与 86–102.5s。
版权：别人的曲子只用于你有权使用的场合；发抖音时更稳的做法是导出无 BGM 版，在平台曲库里选同一首。
"""
import argparse, json, subprocess, sys, wave
import numpy as np

p = argparse.ArgumentParser()
p.add_argument('--bgm', required=False); p.add_argument('--bpm', type=float); p.add_argument('--drop1', type=float); p.add_argument('--drop2', type=float)
p.add_argument('--timeline', default='timeline.json'); p.add_argument('--sfx', default='sfx.wav'); p.add_argument('--sfx_gain', type=float, default=.45)
p.add_argument('--out', default='score.wav'); p.add_argument('--analyze', action='store_true', help='只打印曲子每 0.5 秒的能量，帮你找鼓点')
a = p.parse_args()
SR = 44100
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', a.bgm, '-f', 's16le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.int16).reshape(-1, 2).astype(np.float32) / 32768
if a.analyze:
    hop = SR // 2; r = [float(np.sqrt(np.mean(x[i:i + hop] ** 2))) for i in range(0, len(x) - hop, hop)]
    for i, v in enumerate(r): print(f'{i * .5:6.1f}s {"█" * int(v * 120)}')
    sys.exit(0)
if not (a.bpm and a.drop1): sys.exit('需要 --bpm 和 --drop1（先用 --analyze 找）')
tl = json.load(open(a.timeline)); TOTAL, CARD, CLIMAX = tl['total'], tl['card'], tl.get('climax')
BAR = 4 * 60 / a.bpm
ss = a.drop1 - CARD
if ss < 0: print(f'注意：片名卡在 {CARD:.2f}s，晚于曲子第一个鼓点 {a.drop1}s；从头播放，鼓点会落在 {a.drop1:.2f}s'); ss = 0.0
y = x[int(ss * SR):]
if CLIMAX and a.drop2:
    need = CLIMAX - CARD; have = a.drop2 - a.drop1; nbars = int(round((have - need) / BAR))
    i0 = int((a.drop1 + 8 * BAR - ss) * SR); xf = int(.04 * SR)
    if nbars > 0:
        i1 = i0 + int(nbars * BAR * SR); fade = np.linspace(1, 0, xf)[:, None]
        y = np.concatenate([y[:i0 - xf], y[i0 - xf:i0] * fade + y[i1 - xf:i1] * (1 - fade), y[i1:]]); note = f'剪掉 {nbars} 小节（听一下 {CARD + 8 * BAR:.1f}s 附近的接口）'
    elif nbars < 0:
        seg = y[i0:i0 + int(-nbars * BAR * SR)]; y = np.concatenate([y[:i0], seg, y[i0:]]); note = f'重复 {-nbars} 小节'
    else: note = '无需剪辑'
    print(f'高潮对齐：{note}，误差 {(have - nbars * BAR) - need:+.2f}s')
N = int(TOTAL * SR)
if len(y) < N: y = np.concatenate([y, np.zeros((N - len(y), 2), np.float32)]); print('注意：曲子比片子短，结尾会静音')
y = y[:N].copy(); fl = int(2.0 * SR); y[-fl:] *= np.linspace(1, 0, fl)[:, None] ** 1.5
try:
    w = wave.open(a.sfx); s = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32) / 32768
    s = s.reshape(-1, w.getnchannels()); s = np.repeat(s, 2, 1) if s.shape[1] == 1 else s
    if w.getframerate() != SR: print('音效采样率不是 44100，跳过音效')
    else: y[:min(N, len(s))] += s[:N] * a.sfx_gain
except FileNotFoundError: print('没找到 sfx.wav，只用音乐')
tmp = a.out + '.tmp.wav'
with wave.open(tmp, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(y / max(1e-9, np.abs(y).max()) * .9, -1, 1) * 32767).astype('<i2').tobytes())
af = ('volume=-6dB,alimiter=limit=0.7:level=false,loudnorm=I=-14:TP=-1.5:LRA=7:linear=true:measured_I=-20:measured_TP=-3:measured_LRA=2:measured_thresh=-30,'
      'volume=-1.8dB,aresample=176400,alimiter=limit=0.6:level=false:attack=1:release=60,aresample=44100')
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', tmp, '-af', af, a.out], check=True)
import os; os.unlink(tmp)
print(f'从曲子 {ss:.2f}s 处开始；第一个鼓点落在 {CARD:.2f}s；输出 {a.out}（跑 gate.py 查峰值，高于 -1 dBTP 就把 volume 改成 -2.3dB、limit 改 0.55）')
