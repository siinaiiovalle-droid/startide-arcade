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
    }
  ];

  var byId = {};
  LIST.forEach(function (g) { byId[g.id] = g; });

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

  global.CATALOG = {
    all: LIST,
    get: function (id) { return byId[id]; },
    script: function (id) { var g = byId[id]; return g ? g.script : null; },
    get list() { return enabled(); },
    sorted: function (by) {
      var arr = enabled();
      if (by === 'hot') arr.sort(function (a, b) { return b.plays - a.plays; });
      else if (by === 'new') arr.sort(function (a, b) { return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) || b.plays - a.plays; });
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
