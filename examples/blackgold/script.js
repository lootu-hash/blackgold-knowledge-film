// 《生日悖论》· 黑金样片（约 25 秒，只为演示画风；正片按 references/02 写 18–24 句）
window.FILM = {
  title: '生日悖论', en: 'THE BIRTHDAY PARADOX',
  sub: '不是你和谁撞，是任意两个人撞',          // 片尾一句话：指向机制，不复述标题
  sign: '',                                      // 你的署名（右下角角标 + 片尾），留空就不显示
  style: 'blackgold',                           // blackgold 黑金夜路 / led 赌场记录牌
  aspect: 'vertical',                           // vertical 竖屏 1080×1920 / horizontal 横屏 1920×1080
  refs: ['模拟：10,000 个房间 × 23 人，种子 23，代码真实运行'],
  credit: '画面 · 文案 · 配乐 全部由代码生成',
};
// [场景id, 显示时长(秒), 中文（【金色】〖红色〗）, English]
window.LINES = [
  ['s1', 2.3, '一个房间，要几个人——', 'A room. How many people —'],
  ['s1', 2.9, '才有一半概率，有人同一天生日？', 'before two share a birthday, half the time?'],
  ['s2', 2.6, '大多数人猜：【183】个。', 'Most people guess 183.'],
  ['s3', 2.4, '答案是：【23】个。', 'The answer: 23.'],
  ['s4', 2.9, '电脑排了【一万】个房间，每间23人。', 'We simulated 10,000 rooms of 23.'],
  ['s4', 2.6, '撞生日的房间：【50.7%】。', 'Shared birthdays: 50.7%.'],
  ['s5', 2.9, '因为23个人，能凑出【253】对。', '23 people make 253 pairs.'],
  ['s6', 3.0, '你身边，有人和你同一天生日吗？', 'Does anyone share your birthday?'],
];
window.LEAD = { s1: 0, s2: .2, s3: .2, s4: .3, s5: .3, s6: .3 };
window.TITLE_DUR = 5;
window.CARD = 's3';          // 片名卡场景（没写 SCN.s3 时自动用主题自带的片名卡）；配乐第一个鼓点落在这里
window.CLIMAX = 's5';        // 高潮：白闪 + 配乐第二个鼓点
window.CAM = { s1: 'in', s4: 'still', s5: 'out', s6: 'drift' };   // 镜头：in 推 / out 拉 / drift 横移 / snap 重音 / still 不动
window.CHAPTERS = { s1: '01 · 一个房间', s2: '02 · 直觉', s4: '03 · 一万个房间', s5: '04 · 253 对', s6: '05 · 你' };
window.SFX = [['s4', .2, 'tick'], ['s5', .3, 'whoosh']];   // 额外音效（场景开头和片名卡、白闪的音效会自动加）
