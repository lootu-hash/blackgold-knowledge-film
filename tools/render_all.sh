#!/bin/bash
# 全片并行渲染：bash tools/render_all.sh [进程数]   → silent.mp4（无声）
# 进程数默认 = CPU 核数（最多 6）。每个进程渲一段，最后无损拼接。
set -e
cd "$(dirname "$0")/.."
node tools/shot.mjs .snaps s1+0 > /dev/null
TOTAL=$(python3 -c "import json;print(json.load(open('timeline.json'))['total'])")
FRAMES=$(python3 -c "print(round($TOTAL*30))")
N=${1:-$(python3 -c "import os;print(min(6,os.cpu_count() or 2))")}
mkdir -p part; rm -f part/p*.mp4
step=$(( (FRAMES + N - 1) / N ))
echo "共 $FRAMES 帧（${TOTAL}s），$N 个进程"
pids=()
for i in $(seq 0 $((N-1))); do
  a=$(( i * step )); b=$(( a + step )); [ $b -gt $FRAMES ] && b=$FRAMES; [ $a -ge $b ] && continue
  node tools/render.mjs $a $b part/p$i.mp4 > part/p$i.log 2>&1 & pids+=($!)
done
for p in "${pids[@]}"; do wait $p; done
: > part/list.txt; for i in $(seq 0 $((N-1))); do [ -f part/p$i.mp4 ] && echo "file 'p$i.mp4'" >> part/list.txt; done
ffmpeg -y -v error -f concat -safe 0 -i part/list.txt -c copy silent.mp4
echo "silent.mp4 完成"
