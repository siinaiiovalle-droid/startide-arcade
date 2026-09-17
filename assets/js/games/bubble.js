/* ==========================================================================
   泡泡龙 Bubble Pop —— 旋转炮台发射泡泡，同色三连即爆裂
   键盘：←/→ 旋转，Space/J/Enter 发射；触屏：点击画布即瞄准发射
   ========================================================================== */
(function () {
  'use strict';

  var COLS = 10;
  var CELL = 52, R = 24;
  var TOP = 56;              // 网格顶部
  var PLAY_L = 20, PLAY_R = 540;
  var DEADLINE = 552;        // 死线：泡泡触到此线即输
  var SHOOT = { x: 280, y: 620 };
  var SPEED = 780;
  var DROP_EVERY = 7;        // 每 7 发泡泡，天花板下压一行
  var COLORS = ['#ff5d73', '#ffc93c', '#3ec6ff', '#7bffa8', '#c084fc'];

  /* 难度：读运营后台/本地配置，缺省 normal */
  function readDifficulty() {
    try {
      var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
      return (gc && gc.difficulty) || 'normal';
    } catch (e) { return 'normal'; }
  }
  function diffLabel(d) { return d === 'easy' ? '简单' : (d === 'hard' ? '困难' : '普通'); }

  function colX(c) { return 46 + c * CELL; }
  function rowY(r) { return TOP + R + r * CELL; }

  GameKit.register({
    id: 'bubble',
    name: { zh: '泡泡龙', en: 'Bubble Pop' },
    desc: { zh: '经典泡泡龙：旋转炮台发射泡泡，三只同色即爆裂，悬挂泡泡一并坠落，别让泡泡压过死线。', en: 'Aim the cannon and shoot. Pop 3+ same-color bubbles and drop the loose ones before they crush you.' },
    genre: { zh: '益智射击', en: 'Puzzle Shooter' },
    icon: '🫧', hue: '#3ec6ff',
    logical: { w: 560, h: 700 },
    hot: false, isNew: true, sound: 'menu',
    touchControls: ['left', 'right', 'a'],
    controls: {
      keyboard: [
        { k: '← / →', zh: '旋转炮台', en: 'Rotate cannon' },
        { k: 'Space / J / ↑', zh: '发射泡泡', en: 'Shoot' },
        { k: 'Enter', zh: '发射泡泡', en: 'Shoot' }
      ],
      touch: [{ k: '点击屏幕', zh: '瞄准并发射', en: 'Tap to aim & shoot' }]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var grid, cur, next, aim, fly, score, level, shots, over, state;
      var parts, floats, lastFireT, prev, bobT, unbindKey;
      var colorCount = 5, dropEvery = DROP_EVERY;

      function randColor() { return Math.floor(Math.random() * colorCount); }
      function emptyRow() { var a = [], c; for (c = 0; c < COLS; c++) a.push(null); return a; }
      function mkRow() {
        var a = [], c;
        for (c = 0; c < COLS; c++) a.push({ c: randColor() });
        return a;
      }
      function gridColors() {
        var s = {}, r, c;
        for (r = 0; r < grid.length; r++)
          for (c = 0; c < grid[r].length; c++)
            if (grid[r][c]) s[grid[r][c].c] = 1;
        var a = Object.keys(s).map(Number);
        return a.length ? a : [0, 1, 2, 3, 4].slice(0, colorCount);
      }
      function pickColor() {
        var a = gridColors();
        return a[Math.floor(Math.random() * a.length)];
      }
      function addRows(n) { for (var i = 0; i < n; i++) grid.push(mkRow()); }

      function syncHud(extra) {
        env.hud({ score: score, lives: 1, level: level, extra: extra || '' });
      }

      function reset() {
        var d = readDifficulty();
        colorCount = d === 'easy' ? 4 : 5;
        dropEvery = d === 'easy' ? 9 : (d === 'hard' ? 5 : DROP_EVERY);
        grid = [];
        addRows(5);
        cur = pickColor(); next = pickColor();
        aim = 0; fly = null;
        score = 0; level = 1; shots = 0;
        over = false; state = 'ready';
        parts = []; floats = [];
        lastFireT = 0; prev = {}; bobT = 0;
        syncHud('待命 · 难度' + diffLabel(d));
      }

      /* ---------- 发射 ---------- */
      function fire(tx, ty) {
        if (over || fly) return;
        var t = performance.now();
        if (t - lastFireT < 110) return;   // onKey 与 pad 边沿去重
        lastFireT = t;

        if (tx !== undefined) {
          var dx = tx - SHOOT.x, dy = ty - SHOOT.y;
          if (dy > -24) dy = -24;          // 只允许朝上发射
          aim = env.clamp(Math.atan2(dx, -dy), -1.25, 1.25);
        }
        if (state === 'ready') state = 'play';

        fly = { x: SHOOT.x, y: SHOOT.y, vx: Math.sin(aim) * SPEED, vy: -Math.cos(aim) * SPEED, c: cur };
        cur = next; next = pickColor();
        shots++;
        sfx.play('shoot');
        syncHud('已发射 ' + shots + ' 泡');

        if (shots % dropEvery === 0) {    // 天花板下压
          grid.unshift(mkRow());
          sfx.play('warn');
          checkLose();
        }
      }

      /* ---------- 吸附与消除 ---------- */
      function snap(f) {
        var row = Math.round((f.y - TOP - R) / CELL);
        if (row < 0) row = 0;
        var col = env.clamp(Math.round((f.x - 46) / CELL), 0, COLS - 1);
        while (grid.length <= row) grid.push(emptyRow());

        if (!grid[row][col]) { place(row, col, f.c); return; }
        var best = null, bd = 1e9, dr, dc;
        for (dr = -1; dr <= 1; dr++) for (dc = -1; dc <= 1; dc++) {
          var r2 = row + dr, c2 = col + dc;
          if (r2 < 0 || r2 >= grid.length || c2 < 0 || c2 >= COLS) continue;
          if (grid[r2][c2]) continue;
          var dx = f.x - colX(c2), dy = f.y - rowY(r2), d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = [r2, c2]; }
        }
        if (best) place(best[0], best[1], f.c);
        else {
          while (grid.length <= row + 1) grid.push(emptyRow());
          place(row + 1, col, f.c);
        }
      }

      function burst(x, y, ci) {
        for (var i = 0; i < 7; i++) {
          parts.push({
            x: x, y: y,
            vx: env.rand(-160, 160), vy: env.rand(-220, 60),
            life: env.rand(0.35, 0.7), c: COLORS[ci]
          });
        }
      }

      function matchCluster(r0, c0, color) {
        var seen = {}, out = [], queue = [[r0, c0]];
        seen[r0 + ',' + c0] = 1;
        var DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        while (queue.length) {
          var p = queue.shift();
          out.push(p);
          for (var i = 0; i < 4; i++) {
            var r = p[0] + DIR[i][0], c = p[1] + DIR[i][1];
            if (r < 0 || r >= grid.length || c < 0 || c >= COLS) continue;
            if (seen[r + ',' + c] || !grid[r][c] || grid[r][c].c !== color) continue;
            seen[r + ',' + c] = 1;
            queue.push([r, c]);
          }
        }
        return out;
      }

      function dropFloating() {
        var seen = {}, queue = [], r, c;
        for (c = 0; c < COLS; c++)
          if (grid[0][c]) { seen['0,' + c] = 1; queue.push([0, c]); }
        var DIR = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        while (queue.length) {
          var p = queue.shift();
          for (var i = 0; i < 4; i++) {
            r = p[0] + DIR[i][0]; c = p[1] + DIR[i][1];
            if (r < 0 || r >= grid.length || c < 0 || c >= COLS) continue;
            if (seen[r + ',' + c] || !grid[r][c]) continue;
            seen[r + ',' + c] = 1;
            queue.push([r, c]);
          }
        }
        var drop = 0;
        for (r = 0; r < grid.length; r++) for (c = 0; c < COLS; c++) {
          if (grid[r][c] && !seen[r + ',' + c]) {
            burst(colX(c), rowY(r), grid[r][c].c);
            grid[r][c] = null;
            drop++;
          }
        }
        if (drop) {
          score += drop * 20;
          floats.push({ x: W / 2, y: TOP + 120, txt: '坠落 +' + drop * 20, life: 1 });
          sfx.play('coinDrop');
        }
      }

      function place(r, c, color) {
        grid[r][c] = { c: color };
        var cluster = matchCluster(r, c, color);
        if (cluster.length >= 3) {
          cluster.forEach(function (p) {
            burst(colX(p[1]), rowY(p[0]), color);
            grid[p[0]][p[1]] = null;
          });
          var gain = cluster.length * 10 + (cluster.length > 3 ? 30 : 0);
          score += gain;
          floats.push({ x: colX(c), y: rowY(r) - 12, txt: '+' + gain, life: 1 });
          sfx.play(cluster.length > 4 ? 'tetris' : 'clear');
          dropFloating();
        }
        checkLose();
        checkWin();
        syncHud();
      }

      function checkLose() {
        if (over) return;
        for (var r = 0; r < grid.length; r++)
          for (var c = 0; c < COLS; c++)
            if (grid[r][c] && rowY(r) + R >= DEADLINE) { die(); return; }
      }

      function checkWin() {
        var any = false, r, c;
        for (r = 0; r < grid.length && !any; r++)
          for (c = 0; c < COLS; c++)
            if (grid[r][c]) { any = true; break; }
        if (any) return;
        score += 200 + level * 100;
        level++;
        shots = 0;
        addRows(4);
        floats.push({ x: W / 2, y: H * 0.4, txt: '第 ' + level + ' 关！', life: 1.4 });
        sfx.play('levelup');
      }

      function die() {
        if (over) return;
        over = true; state = 'dead';
        sfx.play('hit');
        sfx.play('gameover');
        env.delay(function () {
          env.gameOver({ score: score, detail: '坚持到第 ' + level + ' 关' });
        }, 600);
      }

      /* ---------- 主循环 ---------- */
      function update(dt) {
        bobT += dt;
        if (env.pad.left) aim = Math.max(-1.25, aim - 2.1 * dt);
        if (env.pad.right) aim = Math.min(1.25, aim + 2.1 * dt);
        if (env.pad.a && !prev.a) fire();
        prev.a = env.pad.a;

        if (fly) {
          var steps = Math.max(1, Math.ceil((SPEED * dt) / 9));
          for (var i = 0; i < steps && fly; i++) {
            fly.x += fly.vx * dt / steps;
            fly.y += fly.vy * dt / steps;
            if (fly.x < PLAY_L + R) { fly.x = PLAY_L + R; fly.vx = Math.abs(fly.vx); sfx.play('bounce'); }
            if (fly.x > PLAY_R - R) { fly.x = PLAY_R - R; fly.vx = -Math.abs(fly.vx); sfx.play('bounce'); }
            if (fly.y - R <= TOP) { var f = fly; fly = null; snap(f); break; }
            var hit = false, r, c;
            for (r = 0; r < grid.length && !hit; r++)
              for (c = 0; c < COLS; c++) {
                if (!grid[r][c]) continue;
                var dx = fly.x - colX(c), dy = fly.y - rowY(r);
                if (dx * dx + dy * dy < (2 * R * 0.92) * (2 * R * 0.92)) { hit = true; break; }
              }
            if (hit) { var f2 = fly; fly = null; snap(f2); break; }
          }
        }

        for (var p = parts.length - 1; p >= 0; p--) {
          var q = parts[p];
          q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 520 * dt;
          if (q.life <= 0) parts.splice(p, 1);
        }
        for (var fl = floats.length - 1; fl >= 0; fl--) {
          floats[fl].life -= dt * 0.9;
          floats[fl].y -= 26 * dt;
          if (floats[fl].life <= 0) floats.splice(fl, 1);
        }
      }

      function drawBubble(x, y, ci, r) {
        r = r || R;
        var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.28, COLORS[ci]);
        g.addColorStop(1, 'rgba(0,0,0,.35)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.4, r * 0.22, 0, Math.PI * 2); ctx.fill();
      }

      function render() {
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0a1430'); bg.addColorStop(0.65, '#122a54'); bg.addColorStop(1, '#16395f');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        /* 星空 */
        ctx.fillStyle = '#fff';
        for (var s = 0; s < 26; s++) {
          ctx.globalAlpha = 0.1 + (s % 4) * 0.08;
          ctx.fillRect((s * 89 + 23) % W, (s * 53 + 11) % (H * 0.4), 2, 2);
        }
        ctx.globalAlpha = 1;

        /* 死线 */
        ctx.setLineDash([10, 8]);
        ctx.strokeStyle = 'rgba(255,93,115,.75)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(PLAY_L, DEADLINE); ctx.lineTo(PLAY_R, DEADLINE); ctx.stroke();
        ctx.setLineDash([]);
        env.text('危险线', PLAY_L + 4, DEADLINE - 8, { font: '12px system-ui', color: 'rgba(255,93,115,.85)' });

        /* 网格泡泡 */
        for (var r = 0; r < grid.length; r++)
          for (var c = 0; c < COLS; c++)
            if (grid[r][c]) drawBubble(colX(c), rowY(r), grid[r][c].c);

        /* 飞行泡泡 */
        if (fly) drawBubble(fly.x, fly.y, fly.c);

        /* 瞄准虚线 */
        if (!fly && state !== 'dead') {
          ctx.fillStyle = 'rgba(255,255,255,.5)';
          for (var d = 1; d <= 7; d++) {
            var gx = SHOOT.x + Math.sin(aim) * 34 * d;
            var gy = SHOOT.y - Math.cos(aim) * 34 * d;
            ctx.globalAlpha = 0.55 - d * 0.06;
            ctx.beginPath(); ctx.arc(gx, gy, 4, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }

        /* 炮台 */
        ctx.save();
        ctx.translate(SHOOT.x, SHOOT.y);
        ctx.rotate(aim);
        ctx.fillStyle = '#2a3d6e';
        env.roundRect(-10, -56, 20, 56, 9); ctx.fill();
        ctx.fillStyle = '#3ec6ff';
        env.roundRect(-6, -52, 12, 30, 6); ctx.fill();
        ctx.restore();
        var base = ctx.createRadialGradient(SHOOT.x, SHOOT.y + 4, 6, SHOOT.x, SHOOT.y, 30);
        base.addColorStop(0, '#3b5697'); base.addColorStop(1, '#1b2a52');
        ctx.fillStyle = base;
        ctx.beginPath(); ctx.arc(SHOOT.x, SHOOT.y, 28, 0, Math.PI * 2); ctx.fill();
        drawBubble(SHOOT.x, SHOOT.y, cur, 20);
        /* 下一颗 */
        env.text('下一颗', SHOOT.x + 76, SHOOT.y + 18, { font: '12px system-ui', color: 'rgba(255,255,255,.5)', align: 'center' });
        drawBubble(SHOOT.x + 76, SHOOT.y - 4, next, 15);

        /* 地板 */
        var gg = ctx.createLinearGradient(0, H - 52, 0, H);
        gg.addColorStop(0, '#241f4a'); gg.addColorStop(1, '#161334');
        ctx.fillStyle = gg; ctx.fillRect(0, H - 52, W, 52);
        ctx.fillStyle = 'rgba(62,198,255,.3)'; ctx.fillRect(0, H - 52, W, 2);

        /* 粒子与飘字 */
        parts.forEach(function (q) {
          ctx.globalAlpha = Math.max(0, q.life * 1.6);
          ctx.fillStyle = q.c;
          ctx.fillRect(q.x - 3, q.y - 3, 6, 6);
        });
        ctx.globalAlpha = 1;
        floats.forEach(function (f) {
          ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
          env.text(f.txt, f.x, f.y, { font: 'bold 22px system-ui', color: '#fff', align: 'center', shadow: true });
        });
        ctx.globalAlpha = 1;

        if (state === 'ready') {
          var hint = 1 + Math.sin(bobT * 3) * 0.05;
          ctx.save();
          ctx.translate(W / 2, H * 0.62); ctx.scale(hint, hint);
          env.text('点击屏幕瞄准发射 · 或 ←→ 瞄准 + 空格', 0, 0, { font: 'bold 19px system-ui', color: 'rgba(255,255,255,.88)', align: 'center' });
          env.text('TAP to aim & shoot', 0, 28, { font: '13px system-ui', color: 'rgba(255,255,255,.5)', align: 'center' });
          ctx.restore();
        }
      }

      reset();

      unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        if (e.code === 'Enter' || e.code === 'NumpadEnter' ||
            e.code === 'Space' || e.code === 'KeyJ' ||
            e.code === 'ArrowUp' || e.code === 'KeyW') fire();
      });

      env.canvas.addEventListener('pointerdown', function (e) {
        var p = env.pointer(e);
        fire(p.x, p.y);
      });

      env.loop(function (dt) {
        update(dt);
        render();
      });

      return {
        start: function () {
          sfx.play('start');
          syncHud('准备就绪 · 点击/空格发射 · 难度' + diffLabel(readDifficulty()));
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); }
      };
    }
  });
})();
