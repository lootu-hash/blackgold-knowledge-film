---
name: "blackgold-knowledge-film"
description: "给一个选题，做中文知识短片（默认 9:16 竖屏、55–75 秒、代码渲染 MP4、原创合成配乐、中英字幕）和配套抖音封面。两种画风：黑金夜路（默认）、赌场记录牌（LED 点阵）。先按留存规则写文案分镜让用户确认，确认后一口气生成并过门禁。用于“做个视频 / 知识短片 / 做封面”。"
metadata:
  version: "2.0.0"
  origin: "QonLabs 黑金知识短片（2026-10）分享版"
---

# 黑金知识短片（代码生成）

用代码一帧一帧画出来的中文知识短片：反常识的问题开场 → 片名卡卡在鼓点上 → 用动画当场证明 → 结尾把问题还给观众。画面、动效、配乐、音效全部由代码生成，不用视频模型、图库或网图。

**用的人只要给一个选题**（可以顺带说画风）。没给选题就先给 2–3 个满足「选题四条件」的选题让他挑。

## 两种画风（一片只用一种）

| `FILM.style` | 名称 | 适合 | 样子 | 配乐 |
|---|---|---|---|---|
| `blackgold`（默认） | 黑金夜路 | 心理学、认知偏差、人生、社会、哲学、通用知识 | 深夜黑金线条插画：两排路灯的透视夜路、红围巾剪影小人、金箔大字、羊皮纸卡 | 112 BPM F 小调，低频八分律动 |
| `led` | 赌场记录牌 | 赌博、彩票、随机、连胜连败、计数类 | 近黑底灯珠网格、LED 点阵大字、红白记录牌、荧光绿只标"真相" | 107 BPM A 小调，小球"哒"作节拍 |

画风配方（色板、专属母题函数、HUD、镜头基调、坑）：`references/styles/<id>.md`。同题样片《生日悖论》（约 30 秒）在 `examples/<id>/`。

## 先分档

- **开阔档**（Opus 级或更强）：全文适用；场景可以自由设计、加新组件，但交付照样过 `lint.mjs` 和 `gate.py`，红灯不交付。
- **轨道档**（其它模型）：只走下面这条路。
  1. 读 `references/01-选题与留存.md`、`02-文案分镜.md`、`styles/<画风>.md`。
  2. 写文案分镜表发给用户确认（见「流程」）。确认前不写代码。
  3. `python3 <skill>/tools/new_film.py <片子目录> --style <画风>`，得到一个能直接出片的样片工程。
  4. 只改 `script.js`（文案和设置）和 `scenes.js`（每个场景画什么）。场景只用 `references/03-引擎API.md` 和画风卡里列出的函数；照 `examples/<画风>/scenes.js` 抄结构，不抄内容。
  5. `node tools/lint.mjs` 红灯清零 → `node tools/shot.mjs snaps <场景+秒>…` → `bash tools/sheet.sh sheet.png 8 snaps/*.png` → 用 Read 看联系表，对照「五种做坏方式」改。
  6. `bash tools/make.sh`（渲染 → 配乐 → 合成 → 门禁 → 联系表）。门禁红灯就改，不交付。
  7. 封面：`node cover/cover.mjs cover_spec.json <片名>_抖音封面`（`references/05-封面.md`）。
  8. 按「交付」交付。

## 默认设置（分享前在这里改成自己的）

- **署名**：`FILM.sign` 留空 = 不显示；填了出现在右下角角标、片尾、封面右下角。（原作者用 `QonLabs`。）
- **画幅**：1080×1920 竖屏。用户说"横屏""16:9"才加 `--horizontal`。
- **片长**：55–75 秒，约 18–24 句；用户要"2 分钟""加长"才做长版（上限 2:45）。
- **配乐**：`tools/music.py` 按画风合成原创配乐，鼓点自动落在片名卡和高潮上，没有版权问题。用户有自己的 BGM 时走 `tools/bgm_mix.py`（04 号）。
- **字幕**：中文 + 一行英文；用户只要中文就把英文留空。
- **每支片子配一张封面。**

## 流程（先确认文案，再一口气做完）

### 第 1 步：写文案分镜表，等用户确认
1. 按 01 号「选题四条件」检查；不满足就说哪里弱，给改法或替代选题。
2. **核实事实**：数字、年份、人名、出处、研究结论都用 WebSearch 查，再用 WebFetch 打开原文确认，记下来源。查不到的不写；网传说法写"有一种说法"；模拟结果写明种子和次数。
3. 按 02 号模板写表（段落｜时间码｜画面｜中文字幕｜English），表头写画风、画幅、预计片长；时间码用 `node tools/timecode.mjs` 算。
4. 表后列：片名（中文 + 英文）、事实来源（带链接）、自己补写的部分、发布建议（提问式标题、封面字、置顶评论）。
5. 用 AskUserQuestion 问：文案可以 / 要改几处 / 调整时长 / 换画风。用户改了结构就重发再确认。

### 第 2 步：确认后直接生成，中途不再提问
建任务清单：搭工程 → 逐场景写画面并抽帧自检 → 渲染与配乐 → 门禁 → 封面 → 交付。开渲时告诉用户大概多久（2 核约 0.15 秒/帧，70 秒片子约 5 分钟）。

## 导演的要求

- **第 0 帧就有画面、问题和音乐。**第一句字幕就是钩子。
- **每 2–2.5 秒画面状态变一次**，每句字幕配一个真实演示（数字在滚、点在亮、柱在长）。证明用 `simulate()` 真实跑模拟，屏上的数字就是跑出来的数。
- **镜头是标点**：`window.CAM` 每个场景选 `still` / `in` / `out` / `drift` / `snap`；相邻场景换动作，不连推三次，`snap` 只给揭晓和反转。
- **有具体的物**：每个场景先定一个能画的物（一张登记单、一扇门、一块记录牌）和它的动作。
- **强调色每屏最多一处**（黑金是红，记录牌是绿）。

## 五种做坏方式（开工前、交付前各对一遍）

1. **慢热**：黑场淡入、空镜头、先出片名。→ lint 查第一句是否在 0 秒；gate 查第 0 帧是不是空的。
2. **答案先说**：标题、封面、第一句先亮答案。→ 只给问题，答案在片名卡之后。
3. **翻页 PPT**：一场一张卡一行字、每场同一种镜头。→ lint 查镜头重复。
4. **没有具体的物**：概念只写成字和图标。
5. **数字是编的**：模拟、年份、比例凭印象写。→ 模拟真跑、事实带出处、字幕数字 = 画面数字。

## 窄桥：照字面做

- 不许 `Math.random()`，用 `rng(seed)` / `simulate()`（lint 会查）。
- 画面元素不低于 `L.SAFE`（竖屏 y=1420），左右留 `L.MX`。
- 黑金画风的大面积亮色块用 `panel()`，否则会被光晕糊掉。
- 用户确认文案之前不写代码；确认之后不再停下来问。
- 我听不到声音、看不到实时运动：交付时如实说做了哪些检查，哪些要用户自己看和听。

## 工程

```
<skill>/
  SKILL.md
  references/   01 选题与留存 · 02 文案分镜 · 03 引擎API · 04 配乐与音效 · 05 封面 · styles/{blackgold,led}.md
  engine/       core.js（时间轴、字幕、合成器）· comp.js（通用组件）· themes/{blackgold,led}.js · fonts/ · index.html
  tools/        new_film.py · timecode.mjs · lint.mjs · shot.mjs · render.mjs · render_all.sh · music.py · bgm_mix.py · gate.py · make.sh · sheet.sh · pw.mjs
  cover/        cover.html + cover.mjs
  examples/     blackgold/、led/：同题《生日悖论》样片的 script.js + scenes.js
```

依赖：Node 18+、Python 3 + numpy、ffmpeg、Playwright Chromium（`npm i playwright && npx playwright install chromium`）、中文字体 Noto Serif CJK SC / Noto Sans CJK SC（或思源宋体 / 思源黑体）。

```sh
python3 <skill>/tools/new_film.py ~/video/20261021_生日悖论 --style blackgold
cd ~/video/20261021_生日悖论
node tools/timecode.mjs                          # 算时间码（写确认表用）
node tools/lint.mjs                              # 文案体检
node tools/shot.mjs snaps s1+0 s3+1.5 title+3    # 抽帧
bash tools/make.sh                               # 一键出片
node cover/cover.mjs cover_spec.json 生日悖论_抖音封面
```

## 验收

1. `lint.mjs` 红灯清零。
2. 每个场景中间帧的联系表：字幕区没被压住、元素没出画、句子对应的动画已经出现、颜色没越出画风。
3. `make.sh` 内的 `gate.py`：规格、时长、第 0 帧、中段空画面、长时间不动、响度（-14～-16 LUFS）、真峰值（≤ -1 dBTP）。红灯不交付。
4. 用 Read 看 `qc/sheet_*.png`。
5. 封面 `problems` 为空，并看一遍成图。

## 交付

- 片子目录留下 `final.mp4`、`timeline.json`、两档封面 PNG、`cover_spec.json`、`script.js`、`scenes.js`。
- 写入前检查目标文件夹是否已存在，存在就换名，绝不覆盖。
- 用户电脑连着就写回他的文件夹并给可点击的文件夹链接；没连就用 SendUserFile 发成片和封面。超过 30MB 的文件切片传，再在电脑上拼回并比对哈希。
- 几句话说明：片长、画风、做了哪些检查、哪些是推测或补写的、哪些要用户自己看和听；封面说三件事（05 号）；附发布建议。不复述制作过程。

## 回流

好用的新组件放进 `engine/comp.js` 或画风文件并写进 03 号/画风卡；新坑写进画风卡；发布后的数据写进 01 号。
