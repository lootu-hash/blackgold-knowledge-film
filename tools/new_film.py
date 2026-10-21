#!/usr/bin/env python3
"""新建一支片子的工程。

用法：
  python3 <skill>/tools/new_film.py <片子目录> [--style blackgold|led] [--horizontal]

做的事：把引擎（engine/）、工具（tools/）、入口 index.html 拷进片子目录；
如果目录里还没有 script.js / scenes.js，就从 examples/<style>/ 拷一份同题样片（《生日悖论》）当起点。
换画风：改 script.js 里的 FILM.style，并把 scenes.js 里该画风专属的母题函数换掉（见 references/styles/）。
"""
import argparse, pathlib, re, shutil, sys

SKILL = pathlib.Path(__file__).resolve().parent.parent
STYLES = sorted(p.stem for p in (SKILL / 'engine' / 'themes').glob('*.js'))

ap = argparse.ArgumentParser()
ap.add_argument('dir')
ap.add_argument('--style', default='blackgold', choices=STYLES, help='blackgold 黑金夜路 / led 赌场记录牌')
ap.add_argument('--horizontal', action='store_true')
a = ap.parse_args()
d = pathlib.Path(a.dir).expanduser().resolve()

d.mkdir(parents=True, exist_ok=True)
shutil.copytree(SKILL / 'engine', d / 'engine', dirs_exist_ok=True, ignore=shutil.ignore_patterns('index.html'))
shutil.copytree(SKILL / 'tools', d / 'tools', dirs_exist_ok=True, ignore=shutil.ignore_patterns('new_film.py', '__pycache__'))
shutil.copy(SKILL / 'engine' / 'index.html', d / 'index.html')
ex = SKILL / 'examples' / a.style
for f in ('script.js', 'scenes.js'):
    if not (d / f).exists():
        shutil.copy(ex / f, d / f)
        print(f'从样片 examples/{a.style}/{f} 拷了一份起点')
if a.horizontal:
    sj = d / 'script.js'; t = sj.read_text(encoding='utf-8')
    sj.write_text(re.sub(r"aspect:\s*'\w+'", "aspect: 'horizontal'", t, count=1), encoding='utf-8')
(d / 'cover').mkdir(exist_ok=True)
for f in ('cover.html', 'cover.mjs'):
    shutil.copy(SKILL / 'cover' / f, d / 'cover' / f)
print(f'工程就绪：{d}\n  改 script.js（文案）和 scenes.js（画面），然后：\n'
      f'  node tools/lint.mjs            # 文案体检\n  node tools/shot.mjs snaps s1+0.5 …   # 抽帧\n'
      f'  bash tools/make.sh             # 渲染 + 配乐 + 合成 + 门禁')
