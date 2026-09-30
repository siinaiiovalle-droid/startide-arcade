/* ==========================================================================
   俄罗斯方块 2 Tetris Sprint
   完全体：7-bag 随机 · 幽灵落点 · 暂存 Hold · 软降/硬降 · 连击与 TETRIS 奖励
   输入：方向键移动（DAS）/↑旋转/↓软降/Space 硬降/C 暂存 · 触屏虚拟手柄
   ========================================================================== */
(function () {
  'use strict';

  var DIFF = {
    easy:   { grav: 1.45, mult: 0.8,  label: '轻松' },
    normal: { grav: 1.0,  mult: 1.0,  label: '标准' },
    hard:   { grav: 0.7,  mult: 1.3,  label: '困难' }
  };
  var COLS = 10, ROWS = 20, CELL = 28;
  var SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[1, 1, 1], [0, 1, 0]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
  };
  var COLORS = { I: '#38e1ff', O: '#ffd23e', T: '#c084fc', S: '#2ee6a8', Z: '#ff5c6c', J: '#5c8dff', L: '#ff9d3e' };
  var TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  var CLEAR_SCORE = [0, 100, 300, 500, 800];

  GameKit.register({
    id: 'tetris2',
    name: { zh: '俄罗斯方块 2', en: 'Tetris Sprint' },
    desc: { zh: '方块完全体：7-Bag 随机、幽灵落点、暂存 Hold、硬降冲刺！四连消 TETRIS 狂赚 800 分，每 10 行提速升级！', en: 'The full package: 7-Bag randomizer, ghost piece, Hold and hard drop! Score 800 for a TETRIS and level up every 10 lines!' },
    genre: { zh: '益智消除', en: 'Puzzle' },
    icon: '🧊', hue: '#38bdf8',
    tags: [{ zh: '经典', en: 'Classic' }, { zh: '续作', en: 'Sequel' }],
    plays: 5000, hot: false, isNew: true, sound: 'calm',
    script: 'assets/js/games/tetris2.js',
    ratio: 'portrait', duration: '2-6 分钟',
    logical: { w: 560, h: 700 },
    touchControls: ['up', 'down', 'left', 'right', 'a', 'b'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!DIFF[diff]) diff = 'normal';
      var cfg = DIFF[diff];

      var FW = COLS * CELL, FH = ROWS * CELL;
      var FX = 152, FY = 116;
      var grid, cur, nextQ, hold, canHold, bag, score, lines, level, combo;
      var over, gravT, dropInt, time, msg, msgT, dasT, repT;
      var prev;

      function mkMat(t) {
        var m = SHAPES[t], r, out = [];
        for (r = 0; r < m.length; r++) out.push(m[r].slice());
        return out;
      }
      function reset() {
        grid = [];
        var r, c;
        for (r = 0; r < ROWS; r++) { grid.push([]); for (c = 0; c < COLS; c++) grid[r].push(null); }
        bag = []; nextQ = [];
        hold = null; canHold = true;
        score = 0; lines = 0; level = 1; combo = 0;
        over = false; time = 0; gravT = 0; dasT = 0; repT = 0;
        msg = ''; msgT = 0;
        prev = { left: false, right: false, up: false, down: false, a: false, b: false };
        dropInt = gravInterval();
        nextQ.push(pullBag(), pullBag(), pullBag());
        spawn();
        syncHud();
      }
      function pullBag() {
        if (!bag.length) {
          var i, j, t;
          bag = TYPES.slice();
          for (i = bag.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            t = bag[i]; bag[i] = bag[j]; bag[j] = t;
          }
        }
        return bag.pop();
      }
      function gravInterval() {
        return Math.max(0.055, 0.8 * Math.pow(0.82, level - 1)) * cfg.grav;
      }
      function syncHud() {
        env.hud({
          score: score, lives: 0, level: level,
          extra: cfg.label + ' · 行 ' + lines + ' · 连击 x' + combo
        });
      }
      function spawn() {
        cur = { t: nextQ.shift(), m: mkMat(nextQ.length ? 'T' : 'T'), x: 0, y: 0 };
        cur.m = mkMat(cur.t);
        cur.x = Math.floor((COLS - cur.m[0].length) / 2);
        cur.y = 0;
        canHold = true;
        if (hit(cur.m, cur.x, cur.y)) {
          merge();
          finish(false);
        }
      }
      function hit(m, px, py) {
        var r, c;
        for (r = 0; r < m.length; r++) {
          for (c = 0; c < m[r].length; c++) {
            if (!m[r][c]) continue;
            var x = px + c, y = py + r;
            if (x < 0 || x >= COLS || y >= ROWS) return true;
            if (y >= 0 && grid[y][x]) return true;
          }
        }
        return false;
      }
      function merge() {
        var r, c;
        for (r = 0; r < cur.m.length; r++) {
          for (c = 0; c < cur.m[r].length; c++) {
            if (!cur.m[r][c]) continue;
            var y = cur.y + r;
            if (y >= 0) grid[y][cur.x + c] = cur.t;
          }
        }
      }
      function rotCW(m) {
        var R = m.length, C = m[0].length, out = [], r, c;
        for (r = 0; r < C; r++) { out.push([]); for (c = 0; c < R; c++) out[r].push(m[R - 1 - c][r]); }
        return out;
      }
      function rotate() {
        if (over) return;
        var m = rotCW(cur.m);
        var kicks = [0, -1, 1, -2, 2], k;
        for (k = 0; k < kicks.length; k++) {
          if (!hit(m, cur.x + kicks[k], cur.y)) {
            cur.m = m; cur.x += kicks[k];
            sfx.play('click');
            return;
          }
        }
        sfx.play('back');
      }
      function move(dx) {
        if (over) return false;
        if (!hit(cur.m, cur.x + dx, cur.y)) {
          cur.x += dx;
          return true;
        }
        return false;
      }
      function lockPiece() {
        merge();
        var cleared = 0, r, c, full;
        for (r = ROWS - 1; r >= 0; r--) {
          full = true;
          for (c = 0; c < COLS; c++) if (!grid[r][c]) { full = false; break; }
          if (full) {
            grid.splice(r, 1);
            grid.unshift([]);
            for (c = 0; c < COLS; c++) grid[0].push(null);
            cleared++; r++;
          }
        }
        if (cleared > 0) {
          combo++;
          score += CLEAR_SCORE[cleared] * level + (combo > 1 ? 50 * combo : 0);
          lines += cleared;
          level = 1 + Math.floor(lines / 10);
          dropInt = gravInterval();
          msg = cleared === 4 ? 'TETRIS! +' + (CLEAR_SCORE[4] * level) : (cleared + ' 行消除！');
          msgT = 1.4;
          sfx.play(cleared === 4 ? 'levelup' : 'coin');
        } else {
          combo = 0;
          sfx.play('click');
        }
        spawn();
        syncHud();
      }
      function gravity(dt, soft) {
        gravT += dt * (soft ? 22 : 1);
        while (gravT >= dropInt) {
          gravT -= dropInt;
          if (!hit(cur.m, cur.x, cur.y + 1)) cur.y++;
          else { lockPiece(); return; }
        }
      }
      function hardDrop() {
        if (over) return;
        var cells = 0;
        while (!hit(cur.m, cur.x, cur.y + 1)) { cur.y++; cells++; }
        score += cells * 2;
        sfx.play('hit');
        lockPiece();
      }
      function doHold() {
        if (over || !canHold) { sfx.play('back'); return; }
        var t = cur.t;
        if (hold) {
          cur = { t: hold, m: mkMat(hold), x: 0, y: 0 };
          cur.x = Math.floor((COLS - cur.m[0].length) / 2);
        } else {
          cur = { t: nextQ.shift(), m: mkMat('T'), x: 0, y: 0 };
          cur.m = mkMat(cur.t);
          cur.x = Math.floor((COLS - cur.m[0].length) / 2);
          nextQ.push(pullBag());
        }
        hold = t;
        canHold = false;
        if (hit(cur.m, cur.x, cur.y)) finish(false);
        sfx.play('powerup');
      }
      function finish(win) {
        if (over) return;
        over = true;
        env.gameOver({
          win: !!win,
          score: Math.round(score * cfg.mult),
          level: level,
          extra: cfg.label + ' · ' + lines + ' 行 · 等级 ' + level
        });
      }

      /* ---- 输入 ---- */
      var unbindKey = env.onKey(function (e) {
        var c = e.code;
        if (c === 'Space') { hardDrop(); e.preventDefault(); }
        else if (c === 'KeyC' || c === 'ShiftLeft') { doHold(); }
        else if (c === 'ArrowUp' || c === 'KeyW') { rotate(); }
      });
      function onPointer(e) {
        if (over) return;
        var p = env.pointer(e);
        var lx = p.x - FX, ly = p.y - FY;
        if (lx < 0 || lx >= FW || ly < 0 || ly >= FH) return;
        var col = Math.floor(lx / CELL);
        var dx = col - (cur.x + Math.floor(cur.m[0].length / 2));
        if (dx !== 0) move(dx > 0 ? 1 : -1);
      }
      env.canvas.addEventListener('pointerdown', onPointer);

      function update(dt) {
        if (over) return;
        time += dt;
        if (msgT > 0) msgT -= dt;
        /* 左右移动：边沿立即 + DAS 0.22s 后 0.06s 连发 */
        var l = env.pad.left, r = env.pad.right;
        if (l && !prev.left) { move(-1); dasT = 0; }
        else if (r && !prev.right) { move(1); dasT = 0; }
        else if (l || r) {
          dasT += dt;
          if (dasT > 0.22) {
            repT += dt;
            if (repT > 0.06) { repT = 0; move(l ? -1 : 1); }
          }
        }
        prev.left = l; prev.right = r;
        /* 旋转 / 硬降 / 暂存：pad 边沿 */
        if (env.pad.up && !prev.up) rotate();
        prev.up = env.pad.up;
        if (env.pad.a && !prev.a) hardDrop();
        prev.a = env.pad.a;
        if (env.pad.b && !prev.b) doHold();
        prev.b = env.pad.b;
        /* 重力 + 软降 */
        gravity(dt, env.pad.down);
        prev.down = env.pad.down;
      }

      function drawCell(x, y, color, alpha) {
        ctx.globalAlpha = alpha === undefined ? 1 : alpha;
        ctx.fillStyle = color;
        ctx.fillRect(FX + x * CELL + 1, FY + y * CELL + 1, CELL - 2, CELL - 2);
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        ctx.fillRect(FX + x * CELL + 1, FY + y * CELL + 1, CELL - 2, 4);
        ctx.globalAlpha = 1;
      }
      function drawMat(m, px, py, color, alpha) {
        var r, c;
        for (r = 0; r < m.length; r++) {
          for (c = 0; c < m[r].length; c++) {
            if (m[r][c] && py + r >= 0) drawCell(px + c, py + r, color, alpha);
          }
        }
      }
      function ghostY() {
        var gy = cur.y;
        while (!hit(cur.m, cur.x, gy + 1)) gy++;
        return gy;
      }
      function mini(t, cx, cy) {
        var m = SHAPES[t], r, c;
        for (r = 0; r < m.length; r++) {
          for (c = 0; c < m[r].length; c++) {
            if (!m[r][c]) continue;
            ctx.fillStyle = COLORS[t];
            ctx.fillRect(cx + c * 16, cy + r * 16, 14, 14);
          }
        }
      }

      function render() {
        var r, c;
        ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#7dd3fc';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillText('🧊 俄罗斯方块 2', 280, 40);
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText(cfg.label + ' · ←→移动 ↑旋转 ↓软降 Space硬降 C暂存', 280, 66);

        /* 井底与边框 */
        ctx.fillStyle = '#0e1830';
        ctx.fillRect(FX, FY, FW, FH);
        ctx.strokeStyle = 'rgba(125,211,252,.5)'; ctx.lineWidth = 2;
        ctx.strokeRect(FX - 3, FY - 3, FW + 6, FH + 6);
        ctx.strokeStyle = 'rgba(255,255,255,.05)';
        for (r = 1; r < COLS; r++) { ctx.beginPath(); ctx.moveTo(FX + r * CELL, FY); ctx.lineTo(FX + r * CELL, FY + FH); ctx.stroke(); }
        for (r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(FX, FY + r * CELL); ctx.lineTo(FX + FW, FY + r * CELL); ctx.stroke(); }

        /* 已锁定 */
        for (r = 0; r < ROWS; r++) {
          for (c = 0; c < COLS; c++) if (grid[r][c]) drawCell(c, r, COLORS[grid[r][c]]);
        }
        if (!over) {
          /* 幽灵 */
          var gy = ghostY();
          drawMat(cur.m, cur.x, gy, COLORS[cur.t], 0.22);
          drawMat(cur.m, cur.x, cur.y, COLORS[cur.t], 1);
        }

        /* HOLD 面板 */
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.fillText('暂存 C', 78, FY + 10);
        ctx.strokeStyle = 'rgba(255,255,255,.18)';
        ctx.strokeRect(30, FY + 26, 96, 60);
        if (hold) mini(hold, 64, 42);

        /* NEXT 面板 */
        ctx.fillText('下一块', 486, FY + 10);
        ctx.strokeRect(438, FY + 26, 96, 60);
        if (nextQ[0]) mini(nextQ[0], 472, 42);
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.font = '13px system-ui, sans-serif';
        if (nextQ[1]) ctx.fillText('→ ' + nextQ[1], 486, FY + 106);

        /* 底部统计 */
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.font = 'bold 17px system-ui, sans-serif';
        ctx.fillText('分数 ' + score, 280, FY + FH + 30);
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText('行 ' + lines + ' · 等级 ' + level + ' · 连击 x' + combo, 280, FY + FH + 56);
        if (msgT > 0 && msg) {
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 18px system-ui, sans-serif';
          ctx.fillText(msg, 280, FY + FH + 80);
        }
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        state: function () {
          return { score: score, lines: lines, level: level, combo: combo, over: over, hold: hold, next: nextQ.slice(), t: cur.t, x: cur.x, y: cur.y };
        },
        move: function (dx) { return move(dx); },
        rot: function () { rotate(); },
        hard: function () { hardDrop(); },
        hold: function () { doHold(); },
        setPiece: function (t) { cur = { t: t, m: mkMat(t), x: Math.floor((COLS - SHAPES[t][0].length) / 2), y: 0 }; },
        setGrid: function (bottomRows, gapCol) {
          var r, c;
          for (r = ROWS - bottomRows; r < ROWS; r++) {
            for (c = 0; c < COLS; c++) grid[r][c] = (c === gapCol ? null : (c % 2 ? 'L' : 'J'));
          }
        },
        finish: function (w) { finish(w); }
      };

      return {
        start: function () { syncHud(); },
        restart: function () { reset(); },
        destroy: function () { unbindKey(); env.canvas.removeEventListener('pointerdown', onPointer); }
      };
    }
  });
})(window);
