/* ==========================================================================
   霓虹贪吃蛇 Neon Snake —— 经典贪吃蛇
   平滑移动 · 速度递增 · 金色果实 · 触屏滑动操控
   ========================================================================== */
(function () {
  'use strict';

  GameKit.register({
    id: 'snake',
    name: { zh: '霓虹贪吃蛇', en: 'Neon Snake' },
    desc: { zh: '经典贪吃蛇：平滑移动、越吃越快，挑战最长身躯。', en: 'Classic snake with smooth motion. Eat, grow and speed up.' },
    genre: { zh: '休闲街机', en: 'Arcade' },
    icon: '🐍', hue: '#2ee6a8',
    logical: { w: 600, h: 600 },
    hot: true, isNew: false, sound: 'menu',
    touchControls: ['left', 'right', 'up', 'down'],
    controls: {
      keyboard: [
        { k: '← → ↑ ↓ / WASD', zh: '控制方向', en: 'Change direction' },
        { k: '触屏滑动', zh: '滑动改变方向', en: 'Swipe to steer' }
      ],
      touch: [
        { k: '方向键 / 滑动', zh: '控制方向', en: 'Steer' }
      ]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var COLS = 20, TILE = W / COLS;
      var MARGIN = 0;

      var snake, prev, dir, queue, food, golden, interval, acc, score, alive, eatFx, tAcc, particles, lastDir, growPending, armed;

      function reset() {
        snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
        prev = snake.map(function (s) { return { x: s.x, y: s.y }; });
        dir = { x: 1, y: 0 }; queue = []; lastDir = { x: 1, y: 0 };
        interval = 0.16; acc = 0; score = 0; alive = true; tAcc = 0;
        eatFx = []; particles = []; growPending = 0;
        // 待机：等玩家给出第一个方向再开跑，避免开局直接撞墙
        armed = false;
        food = randFood(); golden = null;
        env.hud({ score: 0, lives: 1, level: 1, extra: '长度 3' });
      }

      function steer(d) {
        queue.push(d);
        if (queue.length > 2) queue = queue.slice(-2);
        armed = true;
      }

      function occupied(x, y) {
        return snake.some(function (s) { return s.x === x && s.y === y; });
      }
      function randFood() {
        var tries = 0, x, y;
        do { x = Math.floor(Math.random() * COLS); y = Math.floor(Math.random() * COLS); tries++; }
        while (occupied(x, y) && tries < 500);
        return { x: x, y: y, t: 0 };
      }

      function step() {
        if (queue.length) {
          var nd = queue.shift();
          if (!(nd.x === -dir.x && nd.y === -dir.y)) dir = nd;
        }
        var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= COLS) { die(); return; }
        for (var i = 0; i < snake.length - 1; i++) if (snake[i].x === head.x && snake[i].y === head.y) { die(); return; }

        prev = snake.map(function (s) { return { x: s.x, y: s.y }; });
        snake.unshift(head);

        var ate = false;
        if (head.x === food.x && head.y === food.y) {
          ate = true; addScore(10); sfx.play('eat');
          eatFx.push({ x: food.x, y: food.y, t: 0 });
          burst(food.x, food.y, '#ff5c6c');
          food = randFood();
          if (Math.random() < 0.18 && !golden) golden = { x: randFood().x, y: randFood().y, t: 0, life: 6 };
        } else if (golden && head.x === golden.x && head.y === golden.y) {
          ate = true; addScore(50); sfx.play('powerup');
          burst(golden.x, golden.y, '#ffd166');
          golden = null;
        }

        if (!ate) snake.pop();
        else interval = Math.max(0.062, interval * 0.985);

        env.hud({ extra: '长度 ' + snake.length, level: 1 + Math.floor(score / 100) });
      }

      function addScore(n) { score += n; env.hud({ score: score }); }
      function burst(cx, cy, c) {
        for (var i = 0; i < 12; i++) {
          var a = Math.random() * 6.283, s = 40 + Math.random() * 160;
          particles.push({ x: (cx + 0.5) * TILE, y: (cy + 0.5) * TILE, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, c: c, s: 2 + Math.random() * 3 });
        }
      }
      function die() {
        alive = false;
        sfx.play('gameover');
        burst(snake[0].x, snake[0].y, '#38e1ff');
        env.gameOver({ score: score, detail: '蛇身长度 ' + snake.length });
      }

      function update(dt) {
        tAcc += dt;
        if (!alive) {
          particles = particles.filter(function (p) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.life > 0; });
          return;
        }
        /* 输入 */
        if (env.pad.left) steer({ x: -1, y: 0 });
        else if (env.pad.right) steer({ x: 1, y: 0 });
        else if (env.pad.up) steer({ x: 0, y: -1 });
        else if (env.pad.down) steer({ x: 0, y: 1 });

        // 待机时不推进，给玩家反应时间
        if (!armed) { acc = 0; return; }

        acc += dt;
        while (acc >= interval && alive) { acc -= interval; step(); }

        if (food) food.t += dt;
        if (golden) { golden.t += dt; golden.life -= dt; if (golden.life <= 0) golden = null; }
        eatFx = eatFx.filter(function (f) { f.t += dt; return f.t < 0.4; });
        particles = particles.filter(function (p) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; return p.life > 0; });
      }

      function cellPos(i, t) {
        var a = prev[Math.min(i, prev.length - 1)] || snake[i];
        var b = snake[i];
        return { x: (a.x + (b.x - a.x) * t + 0.5) * TILE, y: (a.y + (b.y - a.y) * t + 0.5) * TILE };
      }

      function render() {
        var g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#07101f'); g.addColorStop(1, '#0d1a33');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        // 棋盘
        for (var y = 0; y < COLS; y++) for (var x = 0; x < COLS; x++) {
          if ((x + y) % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,.022)'; ctx.fillRect(x * TILE, y * TILE, TILE, TILE); }
        }

        // 金色果实
        if (golden) {
          var gp = { x: (golden.x + 0.5) * TILE, y: (golden.y + 0.5) * TILE };
          ctx.save();
          ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 22;
          ctx.fillStyle = '#ffd166';
          ctx.beginPath(); ctx.arc(gp.x, gp.y, TILE * 0.32 + Math.sin(golden.t * 6) * 2, 0, 6.283); ctx.fill();
          ctx.restore();
          if (golden.life < 2) { ctx.globalAlpha = 0.5 + Math.sin(golden.t * 20) * 0.5; ctx.globalAlpha = 1; }
        }

        // 果实
        if (food) {
          var fp = { x: (food.x + 0.5) * TILE, y: (food.y + 0.5) * TILE };
          ctx.save();
          ctx.shadowColor = '#ff5c6c'; ctx.shadowBlur = 18;
          ctx.fillStyle = '#ff5c6c';
          ctx.beginPath(); ctx.arc(fp.x, fp.y, TILE * 0.3 + Math.sin(food.t * 5) * 1.6, 0, 6.283); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,.7)';
          ctx.beginPath(); ctx.arc(fp.x - 3, fp.y - 4, 2.4, 0, 6.283); ctx.fill();
          ctx.restore();
        }

        // 蛇身
        var t = alive ? Math.min(1, acc / interval) : 1;
        for (var i = snake.length - 1; i >= 0; i--) {
          var pos = cellPos(i, t);
          var f = 1 - i / Math.max(1, snake.length);
          var r = TILE * (0.42 - f * 0.1);
          var hue = 160 + i * 2.2;
          ctx.save();
          if (i === 0) { ctx.shadowColor = '#2ee6a8'; ctx.shadowBlur = 18; }
          var gg = ctx.createLinearGradient(pos.x - r, pos.y - r, pos.x + r, pos.y + r);
          gg.addColorStop(0, 'hsl(' + (hue + 20) + ',80%,62%)');
          gg.addColorStop(1, 'hsl(' + hue + ',75%,48%)');
          ctx.fillStyle = gg;
          env.roundRect(pos.x - r, pos.y - r, r * 2, r * 2, r * 0.7); ctx.fill();
          ctx.restore();
        }
        // 眼睛
        if (snake.length) {
          var hp = cellPos(0, t);
          var perp = { x: -dir.y, y: dir.x };
          ctx.fillStyle = '#06101c';
          [-1, 1].forEach(function (s) {
            var ex = hp.x + dir.x * 5 + perp.x * (s * 5.5);
            var ey = hp.y + dir.y * 5 + perp.y * (s * 5.5);
            ctx.beginPath(); ctx.arc(ex, ey, 2.6, 0, 6.283); ctx.fill();
          });
        }

        // 粒子 / 波纹
        particles.forEach(function (p) {
          ctx.globalAlpha = Math.max(0, p.life * 2);
          ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.283); ctx.fill();
        });
        ctx.globalAlpha = 1;
        eatFx.forEach(function (f) {
          ctx.globalAlpha = 1 - f.t / 0.4;
          ctx.strokeStyle = '#ff5c6c'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc((f.x + 0.5) * TILE, (f.y + 0.5) * TILE, TILE * (0.3 + f.t * 1.6), 0, 6.283); ctx.stroke();
        });
        ctx.globalAlpha = 1;

        // HUD
        ctx.fillStyle = 'rgba(6,12,24,.5)'; ctx.fillRect(0, 0, W, 46);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('🐍 长度 ' + snake.length, 16, 23);
        ctx.textAlign = 'center'; ctx.fillStyle = '#bfe9ff';
        ctx.fillText('速度 ' + Math.round(1 / interval) + '/s', W / 2, 23);
        ctx.textAlign = 'right'; ctx.fillStyle = '#fff';
        ctx.fillText('得分 ' + score, W - 16, 23);

        // 边框
        ctx.strokeStyle = 'rgba(56,225,255,.35)'; ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, W - 3, H - 3);

        // 待机提示：等待玩家给出第一个方向
        if (!armed && alive) {
          ctx.fillStyle = 'rgba(4,10,20,.55)'; ctx.fillRect(0, 46, W, H - 46);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fff'; ctx.font = 'bold 26px system-ui';
          ctx.fillText('准备出发', W / 2, H / 2 - 18);
          ctx.fillStyle = 'rgba(191,233,255,.85)'; ctx.font = '16px system-ui';
          ctx.fillText('按方向键 / WASD，或滑动屏幕开始', W / 2, H / 2 + 16);
          ctx.globalAlpha = 1;
        }
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      // 触屏滑动
      var sx = 0, sy = 0, swiping = false;
      env.canvas.addEventListener('touchstart', function (e) {
        swiping = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      }, { passive: true });
      env.canvas.addEventListener('touchmove', function (e) {
        if (!swiping) return;
        var dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
        if (Math.abs(dx) > 24 || Math.abs(dy) > 24) {
          if (Math.abs(dx) > Math.abs(dy)) steer({ x: dx > 0 ? 1 : -1, y: 0 });
          else steer({ x: 0, y: dy > 0 ? 1 : -1 });
          swiping = false;
        }
      }, { passive: true });
      env.canvas.addEventListener('touchend', function () { swiping = false; }, { passive: true });

      return {
        start: function () { sfx.play('start'); },
        restart: function () { reset(); },
        destroy: function () { }
      };
    }
  });
})();
