#!/bin/bash
# 一键出片（在片子目录）：bash tools/make.sh [--bgm]
#   1 文案体检 lint（红灯就停）→ 2 并行渲染 silent.mp4 → 3 配乐（默认 music.py 原创配乐；--bgm 表示你已经用 bgm_mix.py 生成了 score.wav，跳过）
#   → 4 合成 final.mp4 → 5 门禁 gate（红灯就停）→ 6 每 3 秒抽一帧拼联系表 qc/sheet_*.png（用 Read 逐张看）
set -e
cd "$(dirname "$0")/.."
echo "== 1/6 文案体检"; node tools/lint.mjs || { echo "lint 有红灯，先改"; exit 1; }
echo "== 2/6 渲染"; bash tools/render_all.sh
if [ "$1" != "--bgm" ]; then echo "== 3/6 原创配乐"; python3 tools/music.py; else echo "== 3/6 用现成的 score.wav"; fi
echo "== 4/6 合成"
ffmpeg -y -v error -i silent.mp4 -i score.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 44100 -shortest -movflags +faststart final.mp4
echo "== 5/6 门禁"; python3 tools/gate.py final.mp4 || { echo "门禁红灯，不交付"; exit 1; }
echo "== 6/6 联系表"; mkdir -p qc; rm -f qc/f_*.png
TOTAL=$(python3 -c "import json;print(json.load(open('timeline.json'))['total'])")
ffmpeg -v error -i final.mp4 -vf "fps=1/3" qc/f_%03d.png
ls qc/f_*.png | split -l 8 - qc/batch_
for b in qc/batch_*; do bash tools/sheet.sh "qc/sheet_$(basename $b).png" 8 $(cat $b) > /dev/null; rm $b; done
ls qc/sheet_*.png
echo "完成：final.mp4（${TOTAL}s）"
