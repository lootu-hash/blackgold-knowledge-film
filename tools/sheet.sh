#!/bin/bash
# 联系表：bash tools/sheet.sh 输出.png 列数 图1 图2 …（每张缩到宽 270，竖横屏都行）
out="$1"; cols="$2"; shift 2; n=$#; rows=$(( (n + cols - 1) / cols ))
dim=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$1"); iw=${dim%x*}; ih=${dim#*x}
th=$(( 270 * ih / iw / 2 * 2 ))
args=(); fc=""; i=0
for f in "$@"; do args+=( -i "$f" ); fc="${fc}[$i]scale=270:${th},setsar=1[v$i];"; i=$((i+1)); done
while [ $i -lt $((rows*cols)) ]; do args+=( -f lavfi -i "color=c=0x333333:s=270x${th}" ); fc="${fc}[$i]setsar=1[v$i];"; i=$((i+1)); done
vr=""; for r in $(seq 0 $((rows-1))); do row=""; for c in $(seq 0 $((cols-1))); do row="${row}[v$((r*cols+c))]"; done
  if [ $cols -eq 1 ]; then fc="${fc}${row}null[r$r];"; else fc="${fc}${row}hstack=$cols[r$r];"; fi; vr="${vr}[r$r]"; done
if [ $rows -eq 1 ]; then fc="${fc}${vr}null[o]"; else fc="${fc}${vr}vstack=$rows[o]"; fi
ffmpeg -y -loglevel error "${args[@]}" -filter_complex "$fc" -map "[o]" -frames:v 1 "$out" && echo "$out"
