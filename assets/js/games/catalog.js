/* ==========================================================================
   游戏目录 —— 游戏大厅与游玩页共用的展示元数据
   （lat 每个游戏的玩法逻辑在各自的 games/*.js 中，通过 GameKit.register 注册）
   ========================================================================== */
(function (global) {
  'use strict';

  var LIST = [
    {
      id: 'shooter',
      name: { zh: '星际战机', en: 'Star Raider' },
      desc: { zh: '经典打飞机：无尽波次、武器强化、每 5 波迎战 BOSS。', en: 'Classic shoot-em-up with endless waves and boss battles.' },
      genre: { zh: '弹幕射击', en: 'Shoot \'em up' },
      icon: '🛸', hue: '#38e1ff',
      tags: [{ zh: '热门', en: 'Hot' }, { zh: '单人', en: '1P' }],
      plays: 156200, hot: true, isNew: false,
      script: 'assets/js/games/shooter.js',
      ratio: 'portrait', duration: '3-8 分钟'
    },
    {
      id: 'mario',
      name: { zh: '超级冒险', en: 'Super Adventure' },
      desc: { zh: '经典横版闯关：顶砖块、吃蘑菇变大、踩敌人、冲向旗杆。', en: 'Classic platformer with blocks, mushrooms and a final flag.' },
      genre: { zh: '横版闯关', en: 'Platformer' },
      icon: '🍄', hue: '#2ee6a8',
      tags: [{ zh: '热门', en: 'Hot' }, { zh: '经典', en: 'Classic' }],
      plays: 128400, hot: true, isNew: false,
      script: 'assets/js/games/mario.js',
      ratio: 'landscape', duration: '5-12 分钟'
    },
    {
      id: 'breakout',
      name: { zh: '霓虹打砖块', en: 'Neon Breaker' },
      desc: { zh: '经典打砖块：多关卡、随机道具、支持鼠标与触屏拖动。', en: 'Brick breaker with levels and power-ups. Mouse & touch ready.' },
      genre: { zh: '休闲益智', en: 'Casual' },
      icon: '🧱', hue: '#7a5cff',
      tags: [{ zh: '经典', en: 'Classic' }, { zh: '休闲', en: 'Casual' }],
      plays: 92300, hot: false, isNew: false,
      script: 'assets/js/games/breakout.js',
      ratio: 'landscape', duration: '3-6 分钟'
    },
    {
      id: 'snake',
      name: { zh: '霓虹贪吃蛇', en: 'Neon Snake' },
      desc: { zh: '经典贪吃蛇：平滑移动、越吃越快，挑战最长身躯。', en: 'Smooth classic snake. Eat, grow and speed up.' },
      genre: { zh: '休闲街机', en: 'Arcade' },
      icon: '🐍', hue: '#2ee6a8',
      tags: [{ zh: '经典', en: 'Classic' }, { zh: '耐玩', en: 'Endless' }],
      plays: 88400, hot: false, isNew: false,
      script: 'assets/js/games/snake.js',
      ratio: 'square', duration: '2-5 分钟'
    },
    {
      id: 'tetris',
      name: { zh: '霓虹俄罗斯方块', en: 'Neon Tetris' },
      desc: { zh: '经典俄罗斯方块：幽灵落点、下一块预览、消行升级。', en: 'Classic Tetris with ghost piece and level progression.' },
      genre: { zh: '益智消除', en: 'Puzzle' },
      icon: '🧊', hue: '#38e1ff',
      tags: [{ zh: '新品', en: 'New' }, { zh: '烧脑', en: 'Brainy' }],
      plays: 76100, hot: false, isNew: true,
      script: 'assets/js/games/tetris.js',
      ratio: 'portrait', duration: '5-15 分钟'
    },
    {
      id: 'g2048',
      name: { zh: '2048 数字合并', en: '2048 Merge' },
      desc: { zh: '经典 2048：滑动合并相同数字，挑战 2048 方块。', en: 'Slide and merge numbers to reach the 2048 tile.' },
      genre: { zh: '益智休闲', en: 'Puzzle' },
      icon: '🔢', hue: '#ffb020',
      tags: [{ zh: '新品', en: 'New' }, { zh: '轻松', en: 'Relaxing' }],
      plays: 64200, hot: false, isNew: true,
      script: 'assets/js/games/g2048.js',
      ratio: 'portrait', duration: '3-10 分钟'
    },
    {
      id: 'memory',
      name: { zh: '记忆翻牌', en: 'Memory Match' },
      desc: { zh: '经典记忆配对：翻开卡牌找出全部 8 对，越快越准、连击越多分越高。', en: 'Flip cards and match all 8 pairs. Faster flips and combos mean more points.' },
      genre: { zh: '益智记忆', en: 'Memory' },
      icon: '🃏', hue: '#ff4d9d',
      tags: [{ zh: '新品', en: 'New' }, { zh: '轻松', en: 'Relaxing' }],
      plays: 5200, hot: false, isNew: true,
      script: 'assets/js/games/memory.js',
      ratio: 'portrait', duration: '2-4 分钟'
    },
    {
      id: 'ttt',
      name: { zh: '井字棋', en: 'Tic-Tac-Toe' },
      desc: { zh: '人机对战井字棋：赢一场得基础分，连胜越多单场加分越高，输掉立即结算。', en: 'Tic-tac-toe vs AI. Win streaks boost each round\'s score.' },
      genre: { zh: '棋类对战', en: 'Board' },
      icon: '⭕', hue: '#2ee6a8',
      tags: [{ zh: '新品', en: 'New' }, { zh: '烧脑', en: 'Brainy' }],
      plays: 4600, hot: false, isNew: true,
      script: 'assets/js/games/ttt.js',
      ratio: 'portrait', duration: '1-5 分钟'
    },
    {
      id: 'pinball',
      name: { zh: '霓虹弹珠台', en: 'Neon Pinball' },
      desc: { zh: '街机弹珠：挡板翻转弹射、Bumper 连击得分，3 球机会挑战最高分。', en: 'Arcade pinball. Flip, bounce and rack up bumper combos with 3 balls.' },
      genre: { zh: '街机弹珠', en: 'Arcade' },
      icon: '🎱', hue: '#ff4d9d',
      tags: [{ zh: '新品', en: 'New' }, { zh: '手速', en: 'Reflex' }],
      plays: 4200, hot: false, isNew: true,
      script: 'assets/js/games/pinball.js',
      ratio: 'portrait', duration: '2-5 分钟'
    },
    {
      id: 'gomoku',
      name: { zh: '五子棋', en: 'Gomoku' },
      desc: { zh: '人机对战五子棋：先连成五子者胜，连胜越多单场加分越高，输掉立即结算。', en: 'Gomoku vs AI. Connect five in a row; streaks boost each round\'s score.' },
      genre: { zh: '棋类对战', en: 'Board' },
      icon: '⚫', hue: '#ffd166',
      tags: [{ zh: '新品', en: 'New' }, { zh: '烧脑', en: 'Brainy' }],
      plays: 4400, hot: false, isNew: true,
      script: 'assets/js/games/gomoku.js',
      ratio: 'portrait', duration: '2-8 分钟'
    },
    {
      id: 'flappy',
      name: { zh: '飞鸟过管', en: 'Flappy Wings' },
      desc: { zh: '一键飞行：轻点拍翅穿越管道阵，手一抖就坠机，看你能飞多远。', en: 'One-tap flying. Flap through the pipes — how far can you go?' },
      genre: { zh: '休闲反应', en: 'Reflex' },
      icon: '🐤', hue: '#38e1ff',
      tags: [{ zh: '新品', en: 'New' }, { zh: '手速', en: 'Reflex' }],
      plays: 5100, hot: false, isNew: true,
      script: 'assets/js/games/flappy.js',
      ratio: 'portrait', duration: '1-4 分钟'
    },
    {
      id: 'whack',
      name: { zh: '打地鼠', en: 'Whack-a-Mole' },
      desc: { zh: '经典打地鼠：45 秒限时出手，金鼠高分、连击加成，挑战手速最高分。', en: 'Whack moles in 45 seconds. Golden moles and combos boost your score.' },
      genre: { zh: '休闲反应', en: 'Reflex' },
      icon: '🔨', hue: '#ffb020',
      tags: [{ zh: '新品', en: 'New' }, { zh: '手速', en: 'Reflex' }],
      plays: 4800, hot: false, isNew: true,
      script: 'assets/js/games/whack.js',
      ratio: 'portrait', duration: '1 分钟'
    },
    {
      id: 'bubble',
      name: { zh: '泡泡龙', en: 'Bubble Pop' },
      desc: { zh: '经典泡泡龙：旋转炮台发射泡泡，三只同色即爆裂，悬挂泡泡一并坠落，别让泡泡压过死线。', en: 'Aim the cannon and shoot. Pop 3+ same-color bubbles and drop the loose ones before they crush you.' },
      genre: { zh: '益智射击', en: 'Puzzle Shooter' },
      icon: '🫧', hue: '#3ec6ff',
      tags: [{ zh: '新品', en: 'New' }, { zh: '休闲', en: 'Casual' }],
      plays: 3900, hot: false, isNew: true,
      script: 'assets/js/games/bubble.js',
      ratio: 'portrait', duration: '2-6 分钟'
    },
    {
      id: 'gem',
      name: { zh: '宝石消除', en: 'Gem Crush' },
      desc: { zh: '三消经典：交换相邻宝石凑成三连，连锁爆发倍率飙升，30 步内冲击最高分。', en: 'Swap adjacent gems to match 3+. Chain cascades for huge multipliers in 30 moves.' },
      genre: { zh: '益智消除', en: 'Match-3' },
      icon: '💎', hue: '#c084fc',
      tags: [{ zh: '新品', en: 'New' }, { zh: '烧脑', en: 'Brainy' }],
      plays: 4100, hot: false, isNew: true,
      script: 'assets/js/games/gem.js',
      ratio: 'portrait', duration: '3-8 分钟'
    },
    {
      id: 'jump',
      name: { zh: '跳一跳', en: 'Jump Master' },
      desc: { zh: '按住蓄力、松手起跳：踩中平台中心有连击加分，力道差一点就踏空出局。', en: 'Hold to charge, release to leap. Nail the center for combo bonuses — miss and you fall.' },
      genre: { zh: '休闲反应', en: 'Reflex' },
      icon: '🐸', hue: '#7bffa8',
      tags: [{ zh: '新品', en: 'New' }, { zh: '手速', en: 'Reflex' }],
      plays: 4300, hot: false, isNew: true,
      script: 'assets/js/games/jump.js',
      ratio: 'portrait', duration: '1-5 分钟'
    },
    {
      id: 'tank',
      name: { zh: '坦克大战', en: 'Tank Battle' },
      desc: { zh: '经典坦克大战：砖墙可被打碎、钢墙挡子弹，逐波消灭敌军，波次越深火力越猛。', en: 'Classic tank battle. Blast brick walls, dodge steel, and wipe out enemy waves.' },
      genre: { zh: '射击对战', en: 'Shooter' },
      icon: '🪖', hue: '#ff5d73',
      tags: [{ zh: '新品', en: 'New' }, { zh: '手速', en: 'Reflex' }],
      plays: 4400, hot: false, isNew: true,
      script: 'assets/js/games/tank.js',
      ratio: 'portrait', duration: '3-8 分钟'
    },
    {
      id: 'dino',
      name: { zh: '恐龙跑酷', en: 'Dino Run' },
      desc: { zh: '无限奔跑：小恐龙跳过仙人掌、下蹲躲过低飞的翼龙，速度越快分涨得越猛。', en: 'Endless runner. Leap over cacti, duck under pterodactyls, and outpace the speed-up.' },
      genre: { zh: '休闲跑酷', en: 'Runner' },
      icon: '🦖', hue: '#ffb020',
      tags: [{ zh: '新品', en: 'New' }, { zh: '耐玩', en: 'Endless' }],
      plays: 4200, hot: false, isNew: true,
      script: 'assets/js/games/dino.js',
      ratio: 'landscape', duration: '2-6 分钟'
    },
    {
      id: 'fruit',
      name: { zh: '切水果', en: 'Fruit Slice' },
      desc: { zh: '一刀切起满屏水果：连切多个有 combo 加分，小心别碰炸弹，漏三个直接出局。', en: 'Slice flying fruit for combo bonuses — avoid bombs, drop three and it is over.' },
      genre: { zh: '休闲反应', en: 'Reflex' },
      icon: '🍉', hue: '#ff4d9d',
      tags: [{ zh: '新品', en: 'New' }, { zh: '手速', en: 'Reflex' }],
      plays: 3900, hot: false, isNew: true,
      script: 'assets/js/games/fruit.js',
      ratio: 'portrait', duration: '1-5 分钟'
    }
  ];

  var byId = {};
  /* seq = 在 LIST 中的声明序号：越靠后越是近期上架的新游戏。
     新游戏一律追加到 LIST 末尾，所以序号天然等价于上架时间。 */
  LIST.forEach(function (g, i) { g.seq = i; byId[g.id] = g; });

  /* 后台配置覆盖（上架 / 推荐 / 新品 / 游玩量） */
  var OV_KEY = 'startide_gamecfg_v1';
  function readOverrides() {
    try { return JSON.parse(localStorage.getItem(OV_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function applyOverrides() {
    var ov = readOverrides();
    LIST.forEach(function (g) {
      var o = ov[g.id]; if (!o) return;
      if (o.disabled !== undefined) g.disabled = !!o.disabled;
      if (o.hot !== undefined) g.hot = !!o.hot;
      if (o.isNew !== undefined) g.isNew = !!o.isNew;
      if (o.plays !== undefined) g.plays = o.plays;
      if (o.sort !== undefined) g.sort = o.sort;
    });
  }
  applyOverrides();

  function enabled() { return LIST.filter(function (g) { return !g.disabled; }); }

  /* 最新上架优先（seq 大在前），同批次按游玩量降序 */
  function newestFirst(a, b) { return b.seq - a.seq || b.plays - a.plays; }
  /* 默认排序：新品整体置顶（内部最新优先），其余按玩得多优先 */
  function defaultOrder(a, b) {
    return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || (a.isNew ? newestFirst(a, b) : b.plays - a.plays);
  }

  global.CATALOG = {
    all: LIST,
    get: function (id) { return byId[id]; },
    script: function (id) { var g = byId[id]; return g ? g.script : null; },
    get list() { return enabled().sort(defaultOrder); },
    sorted: function (by) {
      var arr = enabled();
      if (by === 'hot') arr.sort(function (a, b) { return b.plays - a.plays; });
      else if (by === 'new') arr.sort(newestFirst);
      else arr.sort(defaultOrder);
      return arr;
    },
    genres: function () {
      var set = {};
      enabled().forEach(function (g) { set[g.genre.zh] = g.genre; });
      return Object.keys(set).map(function (k) { return set[k]; });
    },
    overrides: readOverrides,
    setOverride: function (id, patch) {
      var ov = readOverrides();
      ov[id] = Object.assign({}, ov[id] || {}, patch);
      try { localStorage.setItem(OV_KEY, JSON.stringify(ov)); } catch (e) { }
      applyOverrides();
      return ov[id];
    },
    resetOverrides: function () {
      try { localStorage.removeItem(OV_KEY); } catch (e) { }
    }
  };
})(window);
