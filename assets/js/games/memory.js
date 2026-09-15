/* ==========================================================================
   记忆翻牌 Memory Match —— 经典记忆配对
   8 对卡牌 · 连击加分 · 90 秒限时 · 键盘方向键 / 触屏点击
   ========================================================================== */
(function () {
  'use strict';

  var COLS = 4, ROWS = 4, PAIRS = 8;
  var EMOJIS = ['🍒', '🍋', '🍇', '🍉', '⭐', '🍀', '🔔', '💎'];
  var TIME_LIMIT = 90;

  GameKit.register({
    id: 'memory',
    name: { zh: '记忆翻牌', en: 'Memory Match' },
    desc: { zh: '经典记忆配对：翻开卡牌找出全部 8 对，越快越准、连击越多分越高。', en: 'Flip cards and match all 8 pairs. Faster flips and combos mean more points.' },
    genre: { zh: '益智记忆', en: 'Memory' },
    icon: '🃏', hue: '#ff4d9d',
    logical: { w: 560, h: 640 },
    hot: false, isNew: true, sound: 'calm',
    touchControls: ['left', 'right', 'up', 'down', 'a'],
    controls: {
      keyboard: [
        { k: '← → ↑ ↓ / WASD', zh: '移动选中框', en: 'Move cursor' },
        { k: 'Enter / Space / J', zh: '翻开卡牌', en: 'Flip card' }
      ],
      touch: [{ k: '点击卡牌', zh: '翻开卡牌', en: 'Tap a card to flip' }]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var MARGIN = 34, GAP = 14, TOP = 110;
      var CW = (W - MARGIN * 2 - GAP * (COLS - 1)) / COLS;
      var CH = CW;

      var cards, first, lock, score, combo, moves, matched, cursor;
      var timeLeft, started, over, lastTick, floats, unbindKey;
      var prev = {};

      function reset() {
        var pool = EMOJIS.concat(EMOJIS);
        for (var i = pool.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
        }
        cards = [];
        for (var k = 0; k < COLS * ROWS; k++) {
          cards.push({ e: pool[k], flipped: false, matched: false, pop: 0, shake: 0 });
        }
        first = -1; lock = false; score = 0; combo = 0; moves = 0; matched = 0;
        cursor = 0; timeLeft = TIME_LIMIT; started = false; over = false;
        lastTick = Math.ceil(timeLeft); floats = [];
        env.hud({ score: 0, lives: 1, level: 1, extra: '限时 ' + TIME_LIMIT + 's' });
      }

      function cardRect(i) {
        var c = i % COLS, r = Math.floor(i / COLS);
        return { x: MARGIN + c * (CW + GAP), y: TOP + r * (CH + GAP), w: CW, h: CH };
      }

      function addFloat(x, y, txt, color) {
        floats.push({ x: x, y: y, txt: txt, color: color || '#ffd166', t: 1 });
      }

      function flip(idx) {
        if (over || lock || idx < 0 || idx >= cards.length) return;
        var card = cards[idx];
        if (card.matched || card.flipped) return;
        if (!started) started = true;

        card.flipped = true; card.pop = 1;
        sfx.play('rotate');

        if (first < 0) { first = idx; return; }

        moves++;
        var a = first, b = idx;
        first = -1;
        if (cards[a].e === card.e) {
          combo++;
          var gain = 100 + (combo - 1) * 20;
          score += gain;
          cards[a].matched = card.matched = true;
          sfx.play(combo >= 3 ? 'clear' : 'coin');
          matched++;
          var r = cardRect(b);
          addFloat(r.x + r.w / 2, r.y, '+' + gain + (combo > 1 ? ' x' + combo : ''), '#2ee6a8');
          env.hud({ score: score, extra: '配对 ' + matched + '/8' + (combo > 1 ? ' · 连击 x' + combo : '') });
          if (matched === PAIRS) winRound();
        } else {
          combo = 0;
          lock = true;
          cards[a].shake = 1; cards[b].shake = 1;
          sfx.play('back');
          env.delay(function () {
            if (!over) { cards[a].flipped = false; cards[b].flipped = false; }
            lock = false;
          }, 520);
          env.hud({ score: score, extra: '配对 ' + matched + '/8' });
        }
      }

      function winRound() {
        over = true;
        var bonus = Math.round(timeLeft * 5) + Math.max(0, 400 - moves * 10);
        score += bonus;
        sfx.play('win');
        env.win({ score: score, detail: moves + ' 步完成 · 速度与步数奖励 +' + bonus });
      }

      function timeUp() {
        over = true;
        env.gameOver({ score: score, detail: '时间到，配对 ' + matched + '/' + PAIRS });
      }

      function edge() {
        var hit = null;
        ['left', 'right', 'up', 'down', 'a'].forEach(function (k) {
          if (env.pad[k] && !prev[k]) hit = k;
          prev[k] = env.pad[k];
        });
        return hit;
      }

      function moveCursor(k) {
        var c = cursor % COLS, r = Math.floor(cursor / COLS);
        if (k === 'left') c = (c + COLS - 1) % COLS;
        else if (k === 'right') c = (c + 1) % COLS;
        else if (k === 'up') r = (r + ROWS - 1) % ROWS;
        else if (k === 'down') r = (r + 1) % ROWS;
        cursor = r * COLS + c;
      }

      function update(dt) {
        cards.forEach(function (c) {
          if (c.pop > 0) c.pop = Math.max(0, c.pop - dt / 0.16);
          if (c.shake > 0) c.shake = Math.max(0, c.shake - dt / 0.4);
        });
        for (var i = floats.length - 1; i >= 0; i--) {
          var f = floats[i];
          f.t -= dt / 0.9; f.y -= dt * 46;
          if (f.t <= 0) floats.splice(i, 1);
        }
        if (over) return;

        var act = edge();
        if (act === 'a') flip(cursor);
        else if (act) moveCursor(act);

        if (started) {
          timeLeft -= dt;
          var tick = Math.max(0, Math.ceil(timeLeft));
          if (tick !== lastTick) {
            lastTick = tick;
            env.hud({ extra: '限时 ' + tick + 's' + (combo > 1 ? ' · 连击 x' + combo : '') });
            if (tick <= 10 && tick > 0) sfx.play('warn');
          }
          if (timeLeft <= 0) { timeLeft = 0; timeUp(); }
        }
      }

      function render() {
        var g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#160f1d'); g.addColorStop(1, '#241830');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        var t = performance.now() / 1000;
        cards.forEach(function (card, i) {
          var r = cardRect(i);
          var cx = r.x + r.w / 2, cy = r.y + r.h / 2;
          var scale = 1;
          if (card.pop > 0) scale = 1 + Math.sin(card.pop * Math.PI) * 0.1;
          var shakeX = card.shake > 0 ? Math.sin(t * 42) * 5 * card.shake : 0;

          ctx.save();
          ctx.globalAlpha = card.matched ? 0.42 : 1;
          ctx.translate(cx + shakeX, cy);
          ctx.scale(scale, scale);

          if (card.flipped || card.matched) {
            ctx.fillStyle = 'rgba(255,255,255,.92)';
            env.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 14); ctx.fill();
            ctx.font = Math.round(r.w * 0.5) + 'px system-ui, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(card.e, 0, 3);
          } else {
            var bg = ctx.createLinearGradient(-r.w / 2, -r.h / 2, r.w / 2, r.h / 2);
            bg.addColorStop(0, '#ff4d9d'); bg.addColorStop(1, '#7a5cff');
            ctx.fillStyle = bg;
            ctx.shadowColor = 'rgba(255,77,157,.35)'; ctx.shadowBlur = 14;
            env.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, 14); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,255,255,.85)';
            ctx.font = 'bold ' + Math.round(r.w * 0.34) + 'px system-ui, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('?', 0, 2);
          }
          ctx.restore();
        });

        // 键盘 / 手柄选中框
        if (!over && !cards[cursor].matched) {
          var cr = cardRect(cursor);
          ctx.strokeStyle = 'rgba(56,225,255,.95)'; ctx.lineWidth = 3;
          ctx.shadowColor = 'rgba(56,225,255,.8)'; ctx.shadowBlur = 12;
          env.roundRect(cr.x - 3, cr.y - 3, cr.w + 6, cr.h + 6, 15); ctx.stroke();
          ctx.shadowBlur = 0;
        }

        floats.forEach(function (f) {
          ctx.globalAlpha = Math.max(0, f.t);
          ctx.fillStyle = f.color;
          ctx.font = 'bold 20px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(f.txt, f.x, f.y);
          ctx.globalAlpha = 1;
        });

        // 顶部信息条
        ctx.fillStyle = 'rgba(6,12,24,.4)'; ctx.fillRect(0, 0, W, 84);
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('得分 · ' + moves + ' 步', 24, 26);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Consolas, monospace';
        ctx.fillText(String(score), 24, 56);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('剩余时间', W - 24, 26);
        ctx.fillStyle = timeLeft <= 15 ? '#ff5d6c' : '#ffd166';
        ctx.font = 'bold 28px Consolas, monospace';
        ctx.fillText(Math.ceil(Math.max(0, timeLeft)) + 's', W - 24, 56);

        if (!started && !over) {
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 84, W, H - 84);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 24px system-ui';
          ctx.fillText('找出全部 8 对卡牌', W / 2, H / 2 - 20);
          ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '16px system-ui';
          ctx.fillText('点击卡牌或按 Enter 开始 · 连击加分', W / 2, H / 2 + 18);
        }
      }

      reset();

      // 方向键 / WASD / Space 已由 engine 映射进 pad（edge 处理），这里只补 Enter
      unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        if (e.code === 'Enter' || e.code === 'NumpadEnter') flip(cursor);
      });

      env.canvas.addEventListener('pointerdown', function (e) {
        var p = env.pointer(e);
        for (var i = 0; i < cards.length; i++) {
          var r = cardRect(i);
          if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { flip(i); break; }
        }
      });

      env.loop(function (dt) { update(dt); render(); });

      return {
        start: function () { sfx.play('start'); },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); }
      };
    }
  });
})();
