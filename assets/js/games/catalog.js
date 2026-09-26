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
    },
    {
      id: 'link',
      name: { zh: '连连看', en: 'Link Link' },
      desc: { zh: '经典连连看：点选两张相同图案，两折以内连线消除，连击加分，限时清盘进入下一关。', en: 'Link matching tiles with up to two turns. Combo for bonus and clear levels.' },
      genre: { zh: '益智消除', en: 'Puzzle' },
      icon: '🔗', hue: '#38e1ff',
      tags: [{ zh: '新品', en: 'New' }, { zh: '轻松', en: 'Relaxing' }],
      plays: 4000, hot: false, isNew: true,
      script: 'assets/js/games/link.js',
      ratio: 'portrait', duration: '2-6 分钟'
    },
    {
      id: 'sudoku',
      name: { zh: '数独', en: 'Sudoku' },
      desc: { zh: '经典数独：行、列、宫内 1-9 不重复，唯一解谜题，错填即时标红，通关越快分越高。', en: 'Classic Sudoku with unique solutions. Solve fast for bonus points.' },
      genre: { zh: '益智解谜', en: 'Puzzle' },
      icon: '🔣', hue: '#c084fc',
      tags: [{ zh: '新品', en: 'New' }, { zh: '烧脑', en: 'Brainy' }],
      plays: 4000, hot: false, isNew: true,
      script: 'assets/js/games/sudoku.js',
      ratio: 'portrait', duration: '3-15 分钟'
    },
    {
      id: 'klotski',
      name: { zh: '华容道', en: 'Klotski' },
      desc: { zh: '经典华容道：拖动武将与士兵腾出通路，护送曹操抵达下方出口，三关递进，步数越少分越高。', en: 'Slide blocks to escort Cao Cao to the exit. Three levels, fewer moves = more points.' },
      genre: { zh: '益智解谜', en: 'Puzzle' },
      icon: '🀄', hue: '#ff5d73',
      tags: [{ zh: '新品', en: 'New' }, { zh: '烧脑', en: 'Brainy' }],
      plays: 4000, hot: false, isNew: true,
      script: 'assets/js/games/klotski.js',
      ratio: 'portrait', duration: '2-10 分钟'
    },
    {
      id: 'pool',
      name: { zh: '台球', en: 'Pool' },
      desc: { zh: '拖拽瞄准、松手击球：把彩球撞入袋中得分，白球落袋要罚分，清空球台进入下一阵，限时冲击高分。', en: 'Aim by dragging and release to shoot. Pocket balls, clear racks, chase the high score.' },
      genre: { zh: '休闲体育', en: 'Sports' },
      icon: '🎱', hue: '#2ee6a8',
      tags: [{ zh: '新品', en: 'New' }, { zh: '手感', en: 'Skill' }],
      plays: 4000, hot: false, isNew: true,
      script: 'assets/js/games/pool.js',
      ratio: 'portrait', duration: '2-4 分钟'
    },
    {
      id: 'fishing',
      name: { zh: '钓鱼', en: 'Fishing' },
      desc: { zh: '钩子左右摆动，看准时机下钩：鱼越大分越高，金鱼 300 分，河豚扣分扣时，60 秒钓王挑战。', en: 'Time your cast as the hook swings. Big fish big points; dodge puffers. 60s challenge.' },
      genre: { zh: '休闲街机', en: 'Arcade' },
      icon: '🎣', hue: '#5ab7ff',
      tags: [{ zh: '新品', en: 'New' }, { zh: '轻松', en: 'Relaxing' }],
      plays: 4000, hot: false, isNew: true,
      script: 'assets/js/games/fishing.js',
      ratio: 'portrait', duration: '1-2 分钟'
    },
    {
      id: 'suika',
      name: { zh: '合成大西瓜', en: 'Suika' },
      desc: { zh: '投放水果，两个相同水果相碰即合成更大的水果，一路合成大西瓜！堆过警戒线就结束。', en: 'Drop and merge identical fruits into a watermelon. Don\'t stack past the line!' },
      genre: { zh: '物理合成', en: 'Merge' },
      icon: '🍉', hue: '#ff9d5c',
      tags: [{ zh: '新品', en: 'New' }, { zh: '上头', en: 'Addictive' }],
      plays: 4000, hot: false, isNew: true,
      script: 'assets/js/games/suika.js',
      ratio: 'portrait', duration: '3-10 分钟'
    },
    {
      id: 'minesweeper',
      name: { zh: '扫雷', en: 'Minesweeper' },
      desc: { zh: '经典扫雷：点击翻开格子，数字提示周围雷数，右键/长按插旗。全部安全格翻开即胜利，越快分越高！首次点击必有安全区。', en: 'Classic Minesweeper: reveal cells, flag mines with right click / long press. Clear all safe cells fast!' },
      genre: { zh: '益智经典', en: 'Puzzle' },
      icon: '💣', hue: '#64748b',
      tags: [{ zh: '经典', en: 'Classic' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/minesweeper.js',
      ratio: 'portrait', duration: '2-8 分钟'
    },
    {
      id: 'sokoban',
      name: { zh: '推箱子', en: 'Sokoban' },
      desc: { zh: '经典推箱子 5 关：把所有箱子推到目标点。箱子只能推不能拉，卡死角可按 Z 撤销。步数越少分越高，通关全部 5 关！', en: 'Classic Sokoban, 5 levels: push all crates onto goals. Z to undo. Fewer moves, higher score!' },
      genre: { zh: '益智经典', en: 'Puzzle' },
      icon: '📦', hue: '#b45309',
      tags: [{ zh: '经典', en: 'Classic' }, { zh: '动脑', en: 'Brain' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/sokoban.js',
      ratio: 'portrait', duration: '3-10 分钟'
    },
    {
      id: 'freecell',
      name: { zh: '空当接龙', en: 'FreeCell' },
      desc: { zh: '经典空当接龙：把 52 张牌全部按花色 A→K 收进回收堆。点击牌自动找最佳去处，也可点选后手动放置，Z 撤销。', en: 'Classic FreeCell: move all 52 cards to the foundations. Tap for a smart move, Z to undo.' },
      genre: { zh: '牌桌经典', en: 'Card' },
      icon: '🃏', hue: '#166534',
      tags: [{ zh: '经典', en: 'Classic' }, { zh: '动脑', en: 'Brain' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/freecell.js',
      ratio: 'portrait', duration: '5-20 分钟'
    },
    {
      id: 'balloon',
      name: { zh: '气球射击', en: 'Balloon Shoot' },
      desc: { zh: '五彩气球不断升空，移动准星点击射击！连击提升倍率，金色气球 5 倍分，限时内尽可能多击破。', en: 'Balloons keep rising — aim and shoot! Combo for multipliers, golden balloons worth 5x.' },
      genre: { zh: '休闲射击', en: 'Shooting' },
      icon: '🎈', hue: '#e11d48',
      tags: [{ zh: '射击', en: 'Shooting' }, { zh: '手速', en: 'Speed' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/balloon.js',
      ratio: 'portrait', duration: '1-3 分钟'
    },
    {
      id: 'bowling',
      name: { zh: '保龄球', en: 'Bowling' },
      desc: { zh: '经典十格保龄球：左右移动选位，蓄力决定球速，链式撞倒全部 10 瓶就是全中！标准计分，挑战 300 分满分！', en: 'Classic 10-frame bowling: pick your spot, charge power, strike all 10 pins! Standard scoring — chase the perfect 300!' },
      genre: { zh: '体育竞技', en: 'Sports' },
      icon: '🎳', hue: '#7c3aed',
      tags: [{ zh: '体育', en: 'Sports' }, { zh: '物理', en: 'Physics' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/bowling.js',
      ratio: 'portrait', duration: '3-8 分钟'
    },
    {
      id: 'duck',
      name: { zh: '打鸭子', en: 'Duck Hunt' },
      desc: { zh: '经典打鸭子：野鸭成群掠过天空，移动准星射击！鸭子飞走扣命，三条命用完结束。金色鸭子双倍分，连击提升倍率！', en: 'Classic Duck Hunt: shoot flying ducks with your crosshair! Missed ducks cost a life — 3 lives total. Golden ducks worth double!' },
      genre: { zh: '休闲射击', en: 'Shooting' },
      icon: '🦆', hue: '#0284c7',
      tags: [{ zh: '射击', en: 'Shooting' }, { zh: '经典', en: 'Classic' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/duck.js',
      ratio: 'portrait', duration: '2-6 分钟'
    },
    {
      id: 'racer',
      name: { zh: '赛车躲避', en: 'Racer' },
      desc: { zh: '三车道公路狂飙：左右切换车道躲避车流，车速越来越快！与邻车擦肩而过有「惊险超车」加分，看看你能跑多远！', en: 'Dodge traffic on a 3-lane highway! Speed keeps rising. Near-miss overtakes give bonus points.' },
      genre: { zh: '竞速躲避', en: 'Racing' },
      icon: '🏎️', hue: '#dc2626',
      tags: [{ zh: '竞速', en: 'Racing' }, { zh: '手速', en: 'Speed' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/racer.js',
      ratio: 'portrait', duration: '1-4 分钟'
    },
    {
      id: 'helicopter',
      name: { zh: '直升机', en: 'Helicopter' },
      desc: { zh: '经典直升机穿峡谷：按住上升，松开下降，穿过一道道岩柱缝隙！隧道会越来越窄，坚持得越远分越高！', en: 'Classic helicopter cave flyer: hold to rise, release to fall, thread the rock gaps! The tunnel narrows as you go.' },
      genre: { zh: '竞速躲避', en: 'Racing' },
      icon: '🚁', hue: '#0d9488',
      tags: [{ zh: '飞行', en: 'Flying' }, { zh: '操控', en: 'Skill' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/helicopter.js',
      ratio: 'portrait', duration: '1-4 分钟'
    },
    {
      id: 'stack',
      name: { zh: '平衡栈塔', en: 'Stack' },
      desc: { zh: '摆动的积木在塔顶来回移动，点击让它们精准落下！对不齐的部分会被切掉；连续完美对齐有奖励还会加宽，看看你能堆多高！', en: 'Tap to drop swinging blocks precisely! Overhangs get sliced off. Chain perfect drops for bonus and width regen.' },
      genre: { zh: '休闲益智', en: 'Casual' },
      icon: '🏗️', hue: '#b45309',
      tags: [{ zh: '堆叠', en: 'Stacking' }, { zh: '反应', en: 'Reflex' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/stack.js',
      ratio: 'portrait', duration: '1-4 分钟'
    },
    {
      id: 'archery',
      name: { zh: '射箭', en: 'Archery' },
      desc: { zh: '观风辨位，拉弓放箭！注意风向对箭的影响，靶子越远越偏分越高，正中十环有大奖。十支箭，看看你能拿多少环！', en: 'Watch the wind, draw and release! Farther targets score more — nail the bullseye for big points.' },
      genre: { zh: '体育竞技', en: 'Sports' },
      icon: '🏹', hue: '#65a30d',
      tags: [{ zh: '体育', en: 'Sports' }, { zh: '精准', en: 'Precision' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/archery.js',
      ratio: 'portrait', duration: '2-5 分钟'
    },
    {
      id: 'towerdef',
      name: { zh: '守塔', en: 'Tower Defense' },
      desc: { zh: '简版塔防：敌人沿蛇形小路进攻，点击空地建箭塔、点击箭塔升级！守住全部波次进攻。金币靠击杀赚，漏怪扣命！', en: 'Mini tower defense: enemies march along a snake path. Tap tiles to build, tap towers to upgrade! Survive all waves.' },
      genre: { zh: '策略塔防', en: 'Strategy' },
      icon: '🗼', hue: '#7c2d12',
      tags: [{ zh: '策略', en: 'Strategy' }, { zh: '塔防', en: 'TD' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/towerdef.js',
      ratio: 'portrait', duration: '4-10 分钟'
    },
    {
      id: 'flappy2',
      name: { zh: '像素鸟进阶版', en: 'Flappy Plus' },
      desc: { zh: '进阶版像素鸟：管道缺口会慢慢移动！穿越管道 +1，顺手吃金币 +5，夜幕会随分数降临。看你能飞多远！', en: 'Flappy Plus: pipe gaps slowly drift! +1 per pipe, +5 per coin, and night falls as you score.' },
      genre: { zh: '休闲益智', en: 'Casual' },
      icon: '🐤', hue: '#ca8a04',
      tags: [{ zh: '飞行', en: 'Flying' }, { zh: '经典', en: 'Classic' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/flappy2.js',
      ratio: 'portrait', duration: '1-3 分钟'
    },
    {
      id: 'puzzle',
      name: { zh: '拼图', en: 'Picture Puzzle' },
      desc: { zh: '风景画被打散成方块！点击或用方向键+空格选中两块交换位置，把图画复原。步数越少、用时越短，分数越高！', en: 'The painting is scrambled into tiles! Select two tiles to swap and restore the picture. Fewer moves and less time mean higher scores!' },
      genre: { zh: '益智休闲', en: 'Puzzle' },
      icon: '🧩', hue: '#0d9488',
      tags: [{ zh: '益智', en: 'Puzzle' }, { zh: '拼图', en: 'Tiles' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/puzzle.js',
      ratio: 'portrait', duration: '2-5 分钟'
    },
    {
      id: 'spotdiff',
      name: { zh: '找不同', en: 'Spot the Difference' },
      desc: { zh: '上下两幅画有几处不一样！眼疾手快点出所有不同之处，点错会扣时间。限时找到全部不同才能拿高分！', en: 'The two pictures differ in several spots! Tap all differences before time runs out — wrong taps cost time.' },
      genre: { zh: '益智休闲', en: 'Puzzle' },
      icon: '🔍', hue: '#be185d',
      tags: [{ zh: '益智', en: 'Puzzle' }, { zh: '观察', en: 'Observe' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/spotdiff.js',
      ratio: 'portrait', duration: '1-3 分钟'
    },
    {
      id: 'reflex',
      name: { zh: '反应力测试', en: 'Reflex Test' },
      desc: { zh: '红灯转绿的瞬间，用最快的速度点击或按空格！5 轮测试取平均，抢跑会被罚 0.3 秒。看看你的反应是猎豹级还是树懒级！', en: 'Tap or press Space the instant red turns green! 5 rounds, false starts cost 0.3s. Are you cheetah-fast or sloth-slow?' },
      genre: { zh: '休闲益智', en: 'Casual' },
      icon: '⚡', hue: '#16a34a',
      tags: [{ zh: '反应', en: 'Reflex' }, { zh: '竞速', en: 'Speed' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/reflex.js',
      ratio: 'portrait', duration: '1 分钟'
    },
    {
      id: 'rich',
      name: { zh: '掷骰大富翁', en: 'Dice Rich' },
      desc: { zh: '掷骰环游棋盘！买地、收租、升级地产，小心税务和随机机会事件，双数还能再掷一次。回合结束时资产更高的一方获胜！', en: 'Roll dice and travel the board! Buy properties, collect rent, upgrade estates, dodge taxes — higher assets when rounds end wins!' },
      genre: { zh: '棋类桌游', en: 'Board' },
      icon: '🎲', hue: '#b45309',
      tags: [{ zh: '桌游', en: 'Board' }, { zh: '策略', en: 'Strategy' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/rich.js',
      ratio: 'portrait', duration: '2-5 分钟'
    },
    {
      id: 'slot',
      name: { zh: '幸运老虎机', en: 'Lucky Slots' },
      desc: { zh: '三轴卷轴转出好运！三个 7️⃣ 独得 80 倍大奖，两同也有安慰奖。筹码达标见好就收，破产血本无归——最难的永远是收手！', en: 'Spin the reels for fortune! Triple 7s pay 80x, pairs pay small. Cash out while ahead — knowing when to stop is the real game!' },
      genre: { zh: '休闲博弈', en: 'Casino' },
      icon: '🎰', hue: '#a21caf',
      tags: [{ zh: '运气', en: 'Luck' }, { zh: '休闲', en: 'Casual' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/slot.js',
      ratio: 'portrait', duration: '1-3 分钟'
    },
    {
      id: 'guessnum',
      name: { zh: '猜数字', en: 'Guess Number' },
      desc: { zh: '经典推理游戏 Mastermind！破解一串不重复的神秘数字：● 表示数字位置全对，○ 表示数字对但位置错。次数越少分越高！', en: 'Classic Mastermind! Crack the secret code of unique digits: ● = right spot, ○ = wrong spot. Fewer guesses, higher score!' },
      genre: { zh: '益智解谜', en: 'Brain' },
      icon: '🔢', hue: '#0369a1',
      tags: [{ zh: '推理', en: 'Logic' }, { zh: '益智', en: 'Puzzle' }],
      plays: 5000, hot: false, isNew: true,
      script: 'assets/js/games/guessnum.js',
      ratio: 'portrait', duration: '1-4 分钟'
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
