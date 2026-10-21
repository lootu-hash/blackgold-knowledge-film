#!/usr/bin/env python3
"""原创配乐 + 音效（只用 numpy + ffmpeg）。读 timeline.json，按画风预设按画风合成配乐（黑金 112 BPM F 小调 / 记录牌 107 BPM A 小调），鼓点对齐画面。

用法（在片子目录）：
  python3 tools/music.py                 # 读 timeline.json → score.wav（音乐+音效，已做响度）
  python3 tools/music.py --sfx-only      # 只出音效 sfx.wav（配合自带 BGM 用 tools/bgm_mix.py）

结构（符合留存规则）：
  0 秒就有律动（不从安静慢慢起）→ 片名卡前一小节"抽空"+ 上升音 → 【片名卡 = 第一个鼓点】满编
  → 高潮前约 6–8 秒降成安静段（放"可以截图的那句"）→ 【高潮白闪 = 第二个鼓点】更满 → 片尾标题卡只留铺底和动机 → 淡出
节拍网格以片名卡、高潮两个时间点为锚，所以鼓点永远准确落在画面上，不用剪曲子。
"""
import argparse, json, os, subprocess, sys, tempfile
import numpy as np

SR = 44100
P = argparse.ArgumentParser()
P.add_argument('--timeline', default='timeline.json')
P.add_argument('--out', default='score.wav')
P.add_argument('--sfx-only', action='store_true'); P.add_argument('--no-master', action='store_true')
P.add_argument('--lufs', type=float, default=-14.0)
A = P.parse_args()

# ---------------- 预设：速度、调、和弦、配器 ----------------
# chords：每个和弦用 MIDI 根音 + 类型（m 小三 / M 大三），每个和弦 2 小节
PRESETS = {
    'blackgold': dict(bpm=112, root=41, chords=[(41, 'm'), (37, 'M'), (44, 'M'), (39, 'M')], lead='pluck', perc='pop', sig=None,
                      desc='112 BPM F 小调，低频重的八分音符律动，深夜感'),
    'led':       dict(bpm=107, root=45, chords=[(45, 'm'), (41, 'M'), (48, 'M'), (43, 'M')], lead='pluck', perc='pop', sig='ball',
                      desc='107 BPM A 小调，轮盘小球"哒"作节拍，紧张'),
}

tl = json.load(open(A.timeline, encoding='utf-8'))
style = tl.get('film', {}).get('style', 'blackgold')
PR = PRESETS.get(style, PRESETS['blackgold'])
TOTAL = tl['total']; N = int(SR * (TOTAL + .5))
CARD = tl.get('card') or 2.0
CLIMAX = tl.get('climax')
TITLE = next((s['start'] for s in tl['scenes'] if s['id'] == 'title'), TOTAL - 5)
BEAT = 60.0 / PR['bpm']; BAR = BEAT * 4
rs = np.random.RandomState(7)
mus = np.zeros((N, 2)); sfx = np.zeros((N, 2))


def midi(m): return 440.0 * 2 ** ((m - 69) / 12.0)
def tt(n): return np.arange(n) / SR


def add(buf, t, sig, pan=0.0, g=1.0):
    i = int(round(t * SR))
    if i >= len(buf) or i + len(sig) <= 0: return
    if i < 0: sig = sig[-i:]; i = 0
    sig = sig[:len(buf) - i]
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(sig), 0] += sig * l * g * 1.414; buf[i:i + len(sig), 1] += sig * r * g * 1.414


def fft_filter(x, lo=None, hi=None):
    """频域滤波（不依赖 scipy）：lo 高通截止，hi 低通截止，带 1/3 倍频程软边"""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = np.ones_like(f)
    if hi: m *= 1 / (1 + (f / hi) ** 4)
    if lo: m *= 1 - 1 / (1 + (f / lo) ** 4)
    return np.fft.irfft(X * m, len(x))


def env(n, a, d):
    t = tt(n); return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(d, 1e-4))


# ---------------- 乐器 ----------------
def kick(v=.8):
    n = int(SR * .45); t = tt(n); f = 48 + 90 * np.exp(-t / .03)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .16) + .25 * rs.randn(n) * np.exp(-t / .004)) * v
def clap(v=.4):
    n = int(SR * .25); s = rs.randn(n) * env(n, .001, .05); return fft_filter(s, 900, 5000) * v
def hat(v=.15):
    n = int(SR * .08); return fft_filter(rs.randn(n) * env(n, .0005, .018), 6000) * v
def bass(m, dur, v=.5):
    n = int(SR * dur); t = tt(n); f = midi(m)
    s = np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t) + .12 * np.sin(6 * np.pi * f * t)
    return np.tanh(1.6 * s) * env(n, .006, dur * .55) * v
def pluck(m, dur=.7, v=.3, bright=1.0):
    n = int(SR * dur); t = tt(n); f = midi(m); s = np.zeros(n)
    for k, a in [(1, 1), (2, .45 * bright), (3, .22 * bright), (4, .12 * bright), (5, .06 * bright)]: s += a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (3 + k * 2.5))
    return s * np.minimum(1, t / .003) * v
def piano(m, dur=1.4, v=.3):
    n = int(SR * dur); t = tt(n); f = midi(m); s = np.zeros(n)
    for k, a in [(1, 1), (2, .5), (3, .25), (4, .14), (6, .05)]: s += a * np.sin(2 * np.pi * f * k * (1 + .0004 * k * k) * t) * np.exp(-t * (1.2 + k * .9))
    return s * np.minimum(1, t / .004) * v
def pad(ms, dur, v=.12, hi=1800):
    n = int(SR * dur); t = tt(n); s = np.zeros(n)
    for m in ms:
        for det in (-.07, 0, .07):
            f = midi(m + det)
            for k in range(1, 7): s += np.sin(2 * np.pi * f * k * t + rs.rand() * 6) / k
    s = fft_filter(s, 60, hi); a = min(.6, dur * .3)
    e = np.minimum(1, t / a) * np.minimum(1, (dur - t) / a); return s / (len(ms) * 3) * e * v
def taiko(v=.7):
    n = int(SR * .9); t = tt(n); f = 70 + 60 * np.exp(-t / .05)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .3) + .2 * fft_filter(rs.randn(n), None, 900) * np.exp(-t / .05)) * v
def beep(v=.12, f=1000):
    n = int(SR * .09); t = tt(n); return np.sin(2 * np.pi * f * t) * np.minimum(1, t / .002) * np.minimum(1, (n / SR - t) / .01) * v
def click(v=.25, lo=2500):
    n = int(SR * .03); return fft_filter(rs.randn(n) * env(n, .0003, .004), lo) * v
def thump(v=.5):
    n = int(SR * .3); t = tt(n); f = 55 + 30 * np.exp(-t / .03); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .09) * v
def riser(dur, v=.25):
    n = int(SR * dur); t = tt(n); s = fft_filter(rs.randn(n), 400, 6000) * (t / dur) ** 2.2
    return (s + .4 * np.sin(2 * np.pi * np.cumsum(200 + 1400 * (t / dur) ** 2) / SR) * (t / dur) ** 3) * v
def boom(v=.55):
    n = int(SR * 2.2); t = tt(n); f = 38 + 50 * np.exp(-t / .08)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .6) + .3 * fft_filter(rs.randn(n), None, 300) * np.exp(-t / .4)) * v
def whoosh(v=.18, dur=.55):
    n = int(SR * dur); t = tt(n); s = rs.randn(n) * np.sin(np.pi * t / dur) ** 2; return fft_filter(s, 500, 3500) * v
def chime(m=84, v=.12):
    n = int(SR * 2.5); t = tt(n); f = midi(m)
    return (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 2)) * np.exp(-t * 1.3) * v


def chord_notes(root, kind): return [root, root + (3 if kind == 'm' else 4), root + 7]
LEAD = {'pluck': pluck, 'piano': piano}[PR['lead']]


def beats(t0, t1, anchor, step):
    """以 anchor 为锚，返回 [t0,t1) 里所有间隔 step 的时间点及其序号"""
    k0 = int(np.ceil((t0 - anchor) / step - 1e-9)); out = []
    k = k0
    while anchor + k * step < t1 - 1e-6: out.append((anchor + k * step, k)); k += 1
    return out


def chord_at(k_beat):
    bar = k_beat // 4; return PR['chords'][(bar // 2) % len(PR['chords'])]


def scale_notes(root, kind):
    return chord_notes(root, kind)


# ---------------- 段落 ----------------
quiet_len = min(8.0, max(4.0, (CLIMAX - CARD) * .25)) if CLIMAX else 0
sections = []  # (t0, t1, 模式, 锚点)
sections.append((0.0, max(0, CARD - BAR), 'intro', CARD))
sections.append((max(0, CARD - BAR), CARD, 'dip', CARD))
if CLIMAX and CLIMAX > CARD + 6:
    sections.append((CARD, CLIMAX - quiet_len, 'full', CARD))
    sections.append((CLIMAX - quiet_len, CLIMAX, 'quiet', CLIMAX))
    sections.append((CLIMAX, TITLE, 'full2', CLIMAX))
else:
    sections.append((CARD, TITLE, 'full', CARD))
sections.append((TITLE, TOTAL, 'outro', CLIMAX or CARD))

if not A.sfx_only:
    for (t0, t1, mode, anc) in sections:
        if t1 - t0 < .05: continue
        # 铺底：每两小节一个和弦
        pts = beats(t0, t1, anc, BAR * 2)
        if not pts or pts[0][0] > t0 + .1: pts = [(t0, (pts[0][1] - 1) if pts else int(np.floor((t0 - anc) / (BAR * 2))))] + pts   # 段首一定有和弦，0 秒就有声
        for (tb, kb) in pts:
            nxt = next((p2[0] for p2 in pts if p2[0] > tb), t1)
            r, kind = chord_at(kb * 8); dur = min(nxt - tb + .6, t1 - tb + .8)
            hi = 900 if mode in ('quiet', 'dip', 'outro') else 2200
            add(mus, tb, pad([n + 12 for n in chord_notes(r, kind)], dur, .13 if mode != 'intro' else .1, hi), 0)
        for (tb, kb) in beats(t0, t1, anc, BEAT / 2):   # 八分音符网格
            ib = kb % 8; kbeat = kb // 2; r, kind = chord_at(kbeat); on_beat = ib % 2 == 0
            if mode in ('intro', 'full', 'full2'):
                add(mus, tb, bass(r - 12, BEAT * .45, .42 if mode != 'intro' else .32), 0)
            if mode in ('full', 'full2'):
                if on_beat: add(mus, tb, kick(.7))
                if ib in (2, 6): add(mus, tb, clap(.32), .1)
                add(mus, tb, hat(.08 if on_beat else .12), .3)
            # 动机：和弦音级进
            notes = scale_notes(r + 24, kind)
            if mode in ('intro', 'full', 'full2', 'quiet', 'outro'):
                dens = {'intro': (0, 3, 4, 6), 'full': (0, 2, 3, 4, 6, 7), 'full2': tuple(range(8)), 'quiet': (0, 6), 'outro': (0,)}[mode]
                if ib in dens:
                    nn = notes[(kb * 3 + kb // 8) % len(notes)] + (12 if (mode == 'full2' and ib % 3 == 0) else 0)
                    add(mus, tb, LEAD(nn, BEAT * 2.5, .2 if mode != 'quiet' else .16), .25 * np.sin(kb))
            # 画风签名声
            if PR['sig'] == 'ball' and mode in ('intro', 'full', 'full2'): add(mus, tb, click(.12 if on_beat else .07, 3000), -.3)
        if mode == 'intro':   # 第 0 帧就有低音和动机
            r0, k0 = chord_at(int(np.floor((t0 - anc) / BEAT))); add(mus, t0, bass(r0 - 12, BEAT * .9, .4)); add(mus, t0, LEAD(scale_notes(r0 + 24, k0)[0], BEAT * 2, .22))
        if mode == 'dip':
            add(mus, t0, riser(t1 - t0, .22)); add(mus, t0, bass(PR['chords'][0][0] - 12, t1 - t0, .25))
    # 尾部淡出
    fl = int(SR * 2.2); mus[N - fl:] *= np.linspace(1, 0, fl)[:, None] ** 1.6

# ---------------- 音效 ----------------
SFXF = {'tick': lambda: click(.3, 2000), 'click': lambda: click(.3, 2500), 'whoosh': lambda: whoosh(.22), 'boom': lambda: boom(.5),
        'pop': lambda: pluck(84, .3, .25), 'ding': lambda: chime(88, .16), 'beep': lambda: beep(.18), 'stamp': lambda: thump(.7),
        'drum': lambda: taiko(.6), 'type': lambda: click(.3, 1500), 'tap': lambda: click(.3, 700), 'riser': lambda: riser(1.2, .25)}
first = True
for sc in tl['scenes']:
    if first: first = False; continue
    if sc['id'] == 'title': add(sfx, sc['start'] + .3, chime(84, .1)); continue
    add(sfx, sc['start'] - .15, whoosh(.1), rs.uniform(-.4, .4))
if tl.get('card') is not None: add(sfx, tl['card'], boom(.32))
for ft in tl.get('flashes', []): add(sfx, ft, boom(.3)); add(sfx, ft - 1.2, riser(1.2, .18))
for e in tl.get('sfx', []):
    f = SFXF.get(e['kind'])
    if f: add(sfx, e['t'], f(), 0, e.get('gain', 1))
    else: print('未知音效', e['kind'], '可用：', ' '.join(SFXF))

# ---------------- 混音与响度 ----------------
out = sfx * 1.0 if A.sfx_only else mus * 1.0 + sfx * 0.9
# 简易混响：两条反馈延迟
for d, g in ((.031, .18), (.047, .14), (.089, .1)):
    k = int(d * SR); out[k:, 0] += out[:-k, 1] * g; out[k:, 1] += out[:-k, 0] * g
pk = np.max(np.abs(out)) or 1; out = out / pk * .7
tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
def wwav(path, x):
    import wave
    y = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())
target = A.out if not A.sfx_only or A.out != 'score.wav' else 'sfx.wav'
if A.no_master or A.sfx_only:
    wwav(target, out); print('写出', target, f'{TOTAL:.2f}s'); sys.exit(0)
wwav(tmp, out)
# 两遍 loudnorm：先测量，再按测量值线性归一，最后 4 倍过采样限幅压住真峰值
meas = subprocess.run(['ffmpeg', '-hide_banner', '-i', tmp, '-af', f'acompressor=threshold=-20dB:ratio=3:attack=4:release=90:makeup=2,loudnorm=I={A.lufs}:TP=-2:LRA=9:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
js = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
af = ("acompressor=threshold=-20dB:ratio=3:attack=4:release=90:makeup=2," f"loudnorm=I={A.lufs}:TP=-2:LRA=9:linear=true:measured_I={js['input_i']}:measured_TP={js['input_tp']}:measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']},"
      f"aresample=176400,alimiter=limit=0.72:level=false:attack=1:release=60,aresample={SR}")
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', tmp, '-af', af, '-ar', str(SR), target], check=True); os.unlink(tmp)
def measure(path):
    st = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return json.loads(st[st.rindex('{'):st.rindex('}') + 1])
# AAC 编码会把峰值顶高：先试编码一次量真峰值，高于 -1.2 dBTP 就整体降一点再量，最多 4 次
for _ in range(4):
    m4a = tempfile.NamedTemporaryFile(suffix='.m4a', delete=False).name
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', target, '-c:a', 'aac', '-b:a', '192k', m4a], check=True)
    tp = float(measure(m4a)['input_tp']); os.unlink(m4a)
    if tp <= -1.2: break
    t2 = target + '.tmp.wav'; os.replace(target, t2)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', t2, '-af', f'volume={-(tp + 1.6):.2f}dB', target], check=True); os.unlink(t2)
cj = measure(target)
print(f'写出 {target}：{PR["desc"]}，片名卡 {CARD:.2f}s' + (f'，高潮 {CLIMAX:.2f}s' if CLIMAX else '') +
      f'；响度 {cj["input_i"]} LUFS，真峰值 {cj["input_tp"]} dBTP（AAC 后 {tp:.1f}）')
