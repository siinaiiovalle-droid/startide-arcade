/* ==========================================================================
   扫雷 Minesweeper
   首点保护 · 泛洪展开 · 右键/长插旗 · 计时挑战 · 三难度（易9x9/中12x12/难16x16）
   ========================================================================== */
(function () {
  'use strict';

  var DIFFS = {
    easy: { cols: 9, rows: 9, mines: 10 },
    normal: { cols: 12, rows: 12, mines: 24 },
    hard: { cols: 16, rows: 16, mines: 48 }
  };
  var NUM_COLORS = ['', '#1d4ed8', '#15803d', '#b91c1c', '#1e3a8a', '#7c2d12', '#0f766e', '#374151', '#6b7280'];
  var TOP = 150;

  GameKit.register({
    id: 'minesweeper',
    name: { zh: '扫雷', en: 'Minesweeper' },
    desc: { zh: '经典扫雷：点击翻开格子，数字提示周围雷数，右键/长按插旗。全部安全格翻开即胜利，越快分越高！首次点击必有安全区。', en: 'Classic Minesweeper: reveal cells, flag mines with right click / long press. Clear all safe cells fast for a high score!' },
    genre: { zh: '益智经典', en: 'Puzzle' },
    icon: '💣', hue: '#64748b',
    logical: { w: 560, h: 700 },
    plays: 5000, hot: false, isNew: true, sound: 'calm',
    script: 'assets/js/games/minesweeper.js',
    ratio: 'portrait', duration: '2-8 分钟',
    touchControls: ['up', 'down', 'left', 'right', 'a', 'b'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!DIFFS[diff]) diff = 'normal';
      var cfg = DIFFS[diff];

      var cols = cfg.cols, rows = cfg.rows, minesN = cfg.mines;
      var cell = Math.min(Math.floor((W - 32) / cols), Math.floor((H - TOP - 24) / rows));
      var gw = cell * cols, gh = cell * rows, gx = (W - gw) / 2, gy = TOP + (H - TOP - 24 - gh) / 2;

      var grid, state, flags, opened, firstClick, time, timerOn, over, win;
      var cursor, prev, longPress, lpTimer, score;

      function reset() {
        grid = []; state = []; /* state: 0 hidden, 1 open, 2 flag */
        for (var r = 0; r < rows; r++) {
          grid.push(new Array(cols).fill(0));
          state.push(new Array(cols).fill(0));
        }
        flags = 0; opened = 0; firstClick = true; time = 0; timerOn = false;
        over = false; win = false; cursor = { r: Math.floor(rows / 2), c: Math.floor(cols / 2) };
        prev = {}; score = 0;
        env.hud({ score: 0, lives: 1, level: 1, extra: '雷 ' + minesN + ' · 长按插旗' });
      }

      function around(r, c, fn) {
        for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          var nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) fn(nr, nc);
        }
      }

      function plant(fr, fc) {
        var placed = 0;
        while (placed < minesN) {
          var r = env.rand(0, rows) | 0, c = env.rand(0, cols) | 0;
          var safe = (r === fr && c === fc);
          around(fr, fc, function (nr, nc) { if (nr === r && nc === c) safe = true; });
          if (safe || grid[r][c] === 9) continue;
          grid[r][c] = 9; placed++;
        }
        for (r = 0; r < rows; r++) for (var c2 = 0; c2 < cols; c2++) {
          if (grid[r][c2] === 9) continue;
          var n = 0;
          around(r, c2, function (nr, nc) { if (grid[nr][nc] === 9) n++; });
          grid[r][c2] = n;
        }
      }

      function reveal(r, c) {
        if (over || state[r][c] !== 0) return;
        if (firstClick) { plant(r, c); firstClick = false; timerOn = true; sfx.play('start'); }
        if (grid[r][c] === 9) {
          state[r][c] = 1;
          over = true; timerOn = false;
          sfx.play('explosion');
          for (var i = 0; i < rows; i++) for (var j = 0; j < cols; j++) if (grid[i][j] === 9 && state[i][j] === 2) state[i][j] = 1;
          env.gameOver({ score: 0, detail: '踩雷 · 已翻 ' + opened + ' 格' });
          return;
        }
        /* 泛洪 */
        var stack = [[r, c]];
        while (stack.length) {
          var p = stack.pop();
          if (state[p[0]][p[1]] !== 0 || grid[p[0]][p[1]] === 9) continue;
          state[p[0]][p[1]] = 1; opened++;
          if (grid[p[0]][p[1]] === 0) around(p[0], p[1], function (nr, nc) { if (state[nr][nc] === 0) stack.push([nr, nc]); });
        }
        sfx.play('select');
        if (opened === cols * rows - minesN) {
          over = true; win = true; timerOn = false;
          score = minesN * 40 + Math.max(100, 1200 - Math.floor(time) * 10) + (diff === 'hard' ? 800 : diff === 'normal' ? 300 : 0);
          sfx.play('win');
          env.gameOver({ score: score, detail: '扫雷成功 · ' + Math.floor(time) + 's · ' + (diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通') });
        }
      }

      function toggleFlag(r, c) {
        if (over || state[r][c] === 1) return;
        if (state[r][c] === 2) { state[r][c] = 0; flags--; }
        else { state[r][c] = 2; flags++; }
        sfx.play('rotate');
      }

      function update(dt) {
        if (timerOn && !over) {
          time += dt;
          env.hud({ extra: '雷 ' + (minesN - flags) + ' · ' + Math.floor(time) + 's' });
        }
        /* 键盘光标 */
        var step = 0;
        if (env.pad.up) { cursor.r = Math.max(0, cursor.r - 1); step = 1; }
        else if (env.pad.down) { cursor.r = Math.min(rows - 1, cursor.r + 1); step = 1; }
        else if (env.pad.left) { cursor.c = Math.max(0, cursor.c - 1); step = 1; }
        else if (env.pad.right) { cursor.c = Math.min(cols - 1, cursor.c + 1); step = 1; }
        if (step && !prev.step) sfx.play('select');
        prev.step = step;
        var act = null;
        if (env.pad.a && !prev.a) act = 'a';
        if (env.pad.b && !prev.b) act = 'b';
        prev.a = env.pad.a; prev.b = env.pad.b;
        if (act === 'a') reveal(cursor.r, cursor.c);
        else if (act === 'b') toggleFlag(cursor.r, cursor.c);
      }

      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        var K = e.code;
        if (K === 'ArrowUp' || K === 'KeyW') { cursor.r = Math.max(0, cursor.r - 1); e.preventDefault(); }
        else if (K === 'ArrowDown' || K === 'KeyS') { cursor.r = Math.min(rows - 1, cursor.r + 1); e.preventDefault(); }
        else if (K === 'ArrowLeft' || K === 'KeyA') { cursor.c = Math.max(0, cursor.c - 1); e.preventDefault(); }
        else if (K === 'ArrowRight' || K === 'KeyD') { cursor.c = Math.min(cols - 1, cursor.c + 1); e.preventDefault(); }
        else if (K === 'Space' || K === 'KeyJ' || K === 'Enter' || K === 'NumpadEnter') reveal(cursor.r, cursor.c);
        else if (K === 'KeyF') toggleFlag(cursor.r, cursor.c);
      });

      /* 鼠标/触屏：左键翻开，右键/长按插旗 */
      function cellAt(e) {
        var p = env.pointer(e);
        var c = Math.floor((p.x - gx) / cell), r = Math.floor((p.y - gy) / cell);
        if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
        return { r: r, c: c };
      }

      env.canvas.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        var cl = cellAt(e);
        if (cl) toggleFlag(cl.r, cl.c);
      });
      env.canvas.addEventListener('pointerdown', function (e) {
        if (over) return;
        var cl = cellAt(e);
        if (!cl) return;
        cursor = { r: cl.r, c: cl.c };
        longPress = { r: cl.r, c: cl.c, done: false };
        clearTimeout(lpTimer);
        lpTimer = setTimeout(function () {
          if (longPress && !longPress.done) { longPress.done = true; toggleFlag(longPress.r, longPress.c); }
        }, 420);
      });
      env.canvas.addEventListener('pointerup', function (e) {
        clearTimeout(lpTimer);
        if (over || !longPress) return;
        if (!longPress.done) {
          var cl = cellAt(e);
          if (cl && cl.r === longPress.r && cl.c === longPress.c) reveal(cl.r, cl.c);
        }
        longPress = null;
      });
      env.canvas.addEventListener('pointerleave', function () { clearTimeout(lpTimer); });

      function render() {
        var i, j;
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#eef2f7'); bg.addColorStop(1, '#dde6ef');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        /* 棋盘底 */
        ctx.fillStyle = 'rgba(100,116,139,.14)';
        env.roundRect(gx - 10, gy - 10, gw + 20, gh + 20, 12); ctx.fill();

        for (i = 0; i < rows; i++) for (j = 0; j < cols; j++) {
          var x = gx + j * cell, y = gy + i * cell;
          var st = state[i][j], mine = grid[i][j] === 9;
          var isCur = cursor.r === i && cursor.c === j && !over;
          if (st === 0) {
            ctx.fillStyle = isCur ? '#bfe3ff' : '#c8d3de';
            env.roundRect(x + 1.5, y + 1.5, cell - 3, cell - 3, Math.max(3, cell * 0.14)); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.6)';
            env.roundRect(x + 3, y + 3, cell - 6, (cell - 6) * 0.4, Math.max(2, cell * 0.1)); ctx.fill();
          } else {
            ctx.fillStyle = mine ? '#f5c6c6' : '#f7fafc';
            ctx.fillRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
            if (mine) {
              ctx.font = Math.round(cell * 0.55) + 'px system-ui';
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText('💥', x + cell / 2, y + cell / 2 + 1);
            } else if (grid[i][j] > 0) {
              ctx.fillStyle = NUM_COLORS[grid[i][j]];
              ctx.font = 'bold ' + Math.round(cell * 0.52) + 'px Consolas, monospace';
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText(String(grid[i][j]), x + cell / 2, y + cell / 2 + 1);
            }
          }
          if (st === 2) {
            ctx.font = Math.round(cell * 0.55) + 'px system-ui';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('🚩', x + cell / 2, y + cell / 2 + 1);
          }
        }

        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(30,50,70,.6)'; ctx.font = '13px system-ui';
        ctx.fillText('剩余雷数', 24, 34);
        ctx.fillStyle = '#0f2a44'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(String(minesN - flags), 24, 68);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(30,50,70,.6)'; ctx.font = '13px system-ui';
        ctx.fillText('用时', W - 24, 34);
        ctx.fillStyle = '#0f2a44'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(Math.floor(time) + 's', W - 24, 68);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(30,50,70,.55)'; ctx.font = '13px system-ui';
        ctx.fillText((diff === 'easy' ? '轻松 9×9' : diff === 'hard' ? '困难 16×16' : '普通 12×12') + ' · 方向键+空格 / 长按插旗', W / 2, 120);
      }

      reset();

      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        reveal: reveal, flag: toggleFlag,
        state: function () { return { over: over, win: win, opened: opened, flags: flags, score: score }; },
        grid: function () { return grid; },
        cellGeom: function () { return { gx: gx, gy: gy, cell: cell }; }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 1, level: 1, extra: '雷 ' + minesN + ' · 长按插旗' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); clearTimeout(lpTimer); delete env.canvas.__auto; }
      };
    }
  });
})();
