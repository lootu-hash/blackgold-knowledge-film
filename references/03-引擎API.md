# 03 · 引擎 API（写 scenes.js 用）

## 场景函数

```js
SCN.s4 = (c, lt, s) => { … };
```
- `c`：画布上下文（已经套好镜头变换）；`lt`：场景内秒数（从 0 开始）；`s.ls[i]` / `s.le[i]`：第 i 句字幕在场景内的开始 / 结束秒；`s.dur`：场景时长。
- 场景前后各有 0.3s 交叉溶解，场景从 `lt=0` 就要有完整画面（第一个场景尤其如此：第 0 帧不许是空的）。
- 动画写法：`const k = eo(pr(lt, s.ls[1] + .2, s.ls[1] + .8));` 然后用 k 做位置、透明度、数值。所有东西都是 `lt` 的纯函数。
- `CARD` 场景不写 `SCN` 就用主题的片名卡；片尾 `title` 场景由主题自动画（片名、英文、sub、署名、refs、credit）。

## 版式常量 `L`

| 常量 | 竖屏 | 横屏 | 含义 |
|---|---|---|---|
| `W, H, CX` | 1080, 1920, 540 | 1920, 1080, 960 | 画布 |
| `L.VC` | 800 | 470 | 画面主体的垂直中心（镜头推拉的中心） |
| `L.SAFE` | 1420 | 900 | 画面元素不要低于这条线（下面是字幕） |
| `L.MX` | 60 | 90 | 左右边距 |
| `L.GROUND` | 1320 | 900 | 人物脚底 |
| `L.CH_X, L.CH_Y` | 64, 150 | 72, 84 | 左上角章节/HUD 位置 |
| `VERT` | true | false | 是否竖屏 |

## 工具函数（core.js）

| 函数 | 用途 |
|---|---|
| `pr(t, a, b)` | t 在 [a,b] 的进度 0..1 |
| `eo(x)` `io(x)` `ei(x)` `back(x)` | 快出慢停 / 缓入缓出 / 缓入 / 回弹 |
| `fade(t, a, b, c, d)` | a→b 淡入、c→d 淡出 |
| `lerp(a, b, k)` `clamp(x)` | 插值、截断 |
| `rng(seed)` | 可复现随机数生成器（**不要用 Math.random**） |
| `simulate(key, seed, r => …)` | 跑一次模拟并缓存（结果用来画、也用来写字幕数字） |
| `memo(key, fn)` | 通用缓存 |
| `rgba('#hex', a)` `mixHex(a, b, k)` | 颜色 |
| `T(c, 文字, x, y, font, color, align, 字距, a)` | 写字 |
| `TV(c, 文字, x, y, 字号, 'font 模板 {s}', color, a, k)` | 竖排逐字出现 |
| `F(字重, 字号, 字体族)` | 拼 font 字符串，字体族用 `THEME.F.cjk / heavy / en / num / mono` |
| `noGlow(c, c2 => …)` | 在不加光晕的层上画（大面积亮色块） |
| `typed(s, k)` | 打字机：返回前 k 比例的字符 |

## 通用组件（comp.js，颜色自动跟画风走）

颜色参数写色名：`'ink'`（主文字/线）`'soft'`（次要）`'accent'`（强调）`'accent2'`（亮强调）`'neg'`（负面/错误）`'pos'`（正面），也可以写 `'#hex'`。

| 组件 | 说明 |
|---|---|
| `bigWord(c, s, x, y, size, a, lt, o)` | 大字（黑金是金箔字，记录牌是点阵字）。`o.color`、`o.ls` 字距；`led` 支持 `o.k` 从左往右点亮 |
| `counter(c, x, y, size, value, a, o)` | 数字计数器：`o.dec` 小数位、`o.pre`/`o.suf` 前后缀、`o.align`、`o.color` |
| `bar(c, x, y, w, h, frac, a, o)` | 横向进度条：`o.mark` 参考线（0..1）、`o.label`、`o.value` |
| `bars(c, x, baseY, w, h, values, k, a, o)` | 柱状图依次长出：`o.labels`、`o.texts`、`o.colors` |
| `grid(c, cx, cy, cols, rows, cell, state, a, o)` | 点阵：`state(i)` 返回 -1 不画 / 0 暗 / 1 强调 / 2 负面 / 3 空心负面 / 4 正面；`o.k(i)` 每点显现进度；`o.r` 半径；`o.plain` 不用画风的点样式；`o.dimA` 暗点透明度 |
| `lineChart(c, x, y, w, h, ys, k, a, o)` | 折线长出来：`ys` 是 0..1；`o.ref` 参考线、`o.refLabel`；返回线头坐标 |
| `tag(c, x, y, txt, a, o)` | 胶囊标签，`o.fill` 实心 |
| `bubble(c, x, y, w, txt, a, o)` | 对话框，`o.strike` 划线删除进度，`o.side` |
| `arrow(c, x1, y1, x2, y2, k, a, o)` | 箭头画出来，`o.dash` |
| `mark(c, x, y, r, k, 'check' / 'cross', color)` | 对勾 / 叉（线画，不靠字体） |
| `circleMark(c, x, y, rx, ry, k, color)` | 手绘圈注 |
| `panel(c, x, y, w, h, a, (c, w, h) => …, o)` | 卡片（黑金是羊皮纸卡，记录牌是点阵屏），回调里以卡片中心为原点画内容；`o.head` 标题、`o.rot` |
| `stamp(c, x, y, r, txt, a, rot, k)` | 圆形红印章 |
| `pawn(c, x, y, h, color, a)` | 人形图标（数据图里代表"一个人"，不画五官） |
| `particleText(c, s, size, cx, cy, k, a, o)` | 文字粒子：k=0 散开、k=1 聚成字；`o.out` 吹散 |

各画风专属母题（黑金的 `road` `figure` `goldText` …，记录牌的 `ledText` `lamp` …）见对应画风卡。**换画风时，这些专属函数要换成新画风的**；通用组件不用改。

## 写场景的套路

```js
// 1 模拟放在文件顶部，只算一次
const ROOMS = simulate('rooms', 23, r => { /* 用 r() 代替 Math.random() */ });

SCN.s4 = (c, lt, s) => {
  // 2 用字幕时间驱动动画：第二句出现后 0.2 秒开始
  const k = eo(pr(lt, s.ls[1] + .2, s.ls[1] + 1.0));
  // 3 第 0 帧就有东西：底图常亮，只让"变化"随时间出现
  grid(c, CX, 680, 100, 100, 9, i => ROOMS[i] ? 1 : 0, 1, { k: i => i < k * 10000 ? 1 : 0 });
  // 4 数字跟画面同步
  counter(c, CX, 1290, 90, hitRate(k), 1, { dec: 1, suf: '%', color: 'accent' });
};
```

## 坑

- 场景里画东西前 `c.save()`，结束 `c.restore()`；改了 `globalAlpha`、`filter`、`letterSpacing`、`globalCompositeOperation` 不还原会漏到后面。
- 竖屏点阵 100×100 用 cell≈9；更密会糊。
- 黑金画风光晕会把大面积亮色糊成一片：大卡片走 `panel()`（内部用 `noGlow`）。
- 中文特殊符号（✓ ✗ ★）字体里可能没有：用 `mark()` 画。
- `particleText` 每个字符串第一次调用要采样（慢一点），之后缓存。
- `ledText` 第一次画某个字符串时会缓存位图；字号、颜色变了会重新缓存，所以动画里不要逐帧改字号，改 `c.scale`。
- 页面报错时 `shot.mjs` 会打印 `[页面报错]` 并以非零码退出；`lint.mjs` 会标红。
