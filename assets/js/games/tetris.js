/* ==========================================================================
   霓虹俄罗斯方块 Neon Tetris —— 经典俄罗斯方块
   7 种方块 · 幽灵落点 · 下一块预览 · 消行升级
   ========================================================================== */
(function () {
  'use strict';

  var COLS = 10, ROWS = 20, TILE = 30;
  var OFFX = 40, OFFY = 20;

  var SHAPES = {
    I: [[1, 1, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    T: [[0, 1, 0], [1, 1, 1]],
    Z: [[1, 1, 0], [0, 1, 1]]
  };
  var COLORS = {
    I: '#38e1ff', J: '#7a5cff', L: '#ffb020', O: '#ffd166',
    S: '#2ee6a8', T: '#ff4d9d', Z: '#ff5c6c'
  };
  var KEYS = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

  function rot(m, dir) {
    var R = m.length, C = m[0].length, out = [];
    for (var c = 0; c < C; c++) {
      out.push([]);
      for (var r = 0; r < R; r++) out[c].push(dir > 0 ? m[R - 1 - r][c] : m[r][C - 1 - c]);
    }
    return out;
  }

  GameKit.register({
    id: 'tetris',
    name: { zh: '霓虹俄罗斯方块', en: 'Neon Tetris' },
    desc: { zh: '经典俄罗斯方块：幽灵落点、下一块预览、消行升级。', en: 'Classic Tetris with ghost piece, next preview and level progression.' },
    genre: { zh: '益智消除', en: 'Puzzle' },
    icon: '🧊', hue: '#38e1ff',
    logical: { w: 620, h: 640 },
    hot: true, isNew: true, sound: 'menu',
    touchControls: ['left', 'right', 'down', 'a', 'b'],
    controls: {
      keyboard: [
        { k: '← →', zh: '左右移动', en: 'Move' },
        { k: '↓', zh: '加速下落', en: 'Soft drop' },
        { k: '↑ / K / 空格', zh: '旋转', en: 'Rotate' },
        { k: 'Shift / L', zh: '瞬降', en: 'Hard drop' }
      ],
      touch: [
        { k: '◀ ▶ ▼', zh: '移动 / 下落', en: 'Move / drop' },
        { k: 'A', zh: '旋转', en: 'Rotate' },
        { k: 'B', zh: '瞬降', en: 'Hard drop' }
      ]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;

      var board, cur, next, bag, score, lines, level, gravity, dropAcc, lockT, state, over, clearAnim, tAcc, prevKeys;

      function emptyBoard() {
        var b = [];
        for (var y = 0; y < ROWS; y++) { var row = []; for (var x = 0; x < COLS; x++) row.push(null); b.push(row); }
        return b;
      }
      function refillBag() {
        bag = KEYS.slice();
        for (var i = bag.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp; }
      }
      function nextType() { if (!bag || !bag.length) refillBag(); return bag.pop(); }
      function mkPiece(type) {
        var m = SHAPES[type].map(function (r) { return r.slice(); });
        return { type: type, m: m, x: Math.floor((COLS - m[0].length) / 2), y: 0, rotCount: 0 };
      }
      function spawn() {
        cur = next || mkPiece(nextType());
        next = mkPiece(nextType());
        cur.x = Math.floor((COLS - cur.m[0].length) / 2);
        cur.y = -topPad(cur.m);
        if (collide(cur.m, cur.x, cur.y)) { gameOver(); }
      }
      function topPad(m) {
        for (var y = 0; y < m.length; y++) for (var x = 0; x < m[0].length; x++) if (m[y][x]) return y;
        return 0;
      }
      function collide(m, px, py) {
        for (var y = 0; y < m.length; y++) for (var x = 0; x < m[0].length; x++) {
          if (!m[y][x]) continue;
          var bx = px + x, by = py + y;
          if (bx < 0 || bx >= COLS || by >= ROWS) return true;
          if (by >= 0 && board[by][bx]) return true;
        }
        return false;
      }

      function reset() {
        board = emptyBoard(); bag = null; next = null;
        score = 0; lines = 0; level = 1; gravity = 0.82; dropAcc = 0; lockT = 0;
        state = 'play'; over = false; clearAnim = null; tAcc = 0; prevKeys = {};
        spawn();
        env.hud({ score: 0, lives: 1, level: 1, extra: '消行 0' });
      }

      function gameOver() {
        over = true; state = 'over'; sfx.play('gameover');
        env.gameOver({ score: score, level: level, detail: '消除 ' + lines + ' 行' });
      }

      function lock() {
        for (var y = 0; y < cur.m.length; y++) for (var x = 0; x < cur.m[0].length; x++) {
          if (!cur.m[y][x]) continue;
          var bx = cur.x + x, by = cur.y + y;
          if (by < 0) { gameOver(); return; }
          board[by][bx] = cur.type;
        }
        sfx.play('block');
        var full = [];
        for (var r = 0; r < ROWS; r++) {
          var ok = true;
          for (var c = 0; c < COLS; c++) if (!board[r][c]) { ok = false; break; }
          if (ok) full.push(r);
        }
        if (full.length) {
          clearAnim = { rows: full, t: 0 };
          sfx.play(full.length >= 4 ? 'tetris' : 'clear');
          var base = [0, 100, 300, 500, 800][full.length];
          score += base * level;
          lines += full.length;
          var newLevel = 1 + Math.floor(lines / 10);
          if (newLevel > level) { level = newLevel; sfx.play('levelup'); }
          gravity = Math.max(0.08, 0.82 - (level - 1) * 0.07);
          env.hud({ score: score, level: level, extra: '消行 ' + lines });
        } else {
          spawn();
        }
      }

      function finishClear() {
        clearAnim.rows.sort(function (a, b) { return a - b; });
        clearAnim.rows.forEach(function (r) { board.splice(r, 1); });
        for (var i = 0; i < clearAnim.rows.length; i++) {
          var row = []; for (var x = 0; x < COLS; x++) row.push(null);
          board.unshift(row);
        }
        clearAnim = null;
        spawn();
      }

      function move(dx, dy) {
        if (!collide(cur.m, cur.x + dx, cur.y + dy)) { cur.x += dx; cur.y += dy; return true; }
        return false;
      }
      function rotate(dir) {
        var m = rot(cur.m, dir);
        var kicks = [0, -1, 1, -2, 2];
        for (var i = 0; i < kicks.length; i++) {
          if (!collide(m, cur.x + kicks[i], cur.y)) { cur.m = m; cur.x += kicks[i]; cur.rotCount++; sfx.play('rotate'); return; }
        }
      }
      function hardDrop() {
        var d = 0;
        while (!collide(cur.m, cur.x, cur.y + 1)) { cur.y++; d++; }
        score += d * 2;
        sfx.play('land');
        lock();
      }
      function ghostY() {
        var y = cur.y;
        while (!collide(cur.m, cur.x, y + 1)) y++;
        return y;
      }

      function update(dt) {
        tAcc += dt;
        if (clearAnim) {
          clearAnim.t += dt;
          if (clearAnim.t > 0.24) finishClear();
          return;
        }
        if (over) return;

        var pad = env.pad, press = env.keys;
        // 左右（带重复）
        if (pad.left) { if (!prevKeys.l) { move(-1, 0); prevKeys.l = 0.13; } else { prevKeys.l -= dt; if (prevKeys.l <= 0) { move(-1, 0); prevKeys.l = 0.06; } } }
        else prevKeys.l = 0;
        if (pad.right) { if (!prevKeys.r) { move(1, 0); prevKeys.r = 0.13; } else { prevKeys.r -= dt; if (prevKeys.r <= 0) { move(1, 0); prevKeys.r = 0.06; } } }
        else prevKeys.r = 0;
        if (pad.down) { if (!prevKeys.d) { move(0, 1); prevKeys.d = 0.05; score += 1; } else { prevKeys.d -= dt; if (prevKeys.d <= 0) { move(0, 1); prevKeys.d = 0.045; score += 1; } } }
        else prevKeys.d = 0;

        if (pad.a && !prevKeys.a) { rotate(1); prevKeys.a = true; } if (!pad.a) prevKeys.a = false;
        if (pad.b && !prevKeys.b) { hardDrop(); prevKeys.b = true; } if (!pad.b) prevKeys.b = false;

        // 自动下落
        dropAcc += dt;
        if (dropAcc >= gravity) {
          dropAcc = 0;
          if (!move(0, 1)) {
            lockT += gravity;
            if (lockT > 0.35) { lockT = 0; lock(); }
          } else lockT = 0;
        }
        env.score(score);
      }

      /* ---------- 渲染 ---------- */
      function block(px, py, size, color, alpha, ghost) {
        ctx.save();
        ctx.globalAlpha = alpha === undefined ? 1 : alpha;
        if (!ghost) { ctx.shadowColor = color; ctx.shadowBlur = 12; }
        ctx.fillStyle = color;
        env.roundRect(px + 1, py + 1, size - 2, size - 2, 5); ctx.fill();
        ctx.shadowBlur = 0;
        if (!ghost) {
          ctx.fillStyle = 'rgba(255,255,255,.3)';
          env.roundRect(px + 4, py + 4, size - 8, size * 0.22, 3); ctx.fill();
          ctx.fillStyle = 'rgba(0,0,0,.16)';
          env.roundRect(px + 4, py + size - 4 - size * 0.18, size - 8, size * 0.18, 3); ctx.fill();
        } else {
          ctx.strokeStyle = color; ctx.lineWidth = 2;
          env.roundRect(px + 2, py + 2, size - 4, size - 4, 5); ctx.stroke();
        }
        ctx.restore();
      }

      function render() {
        var g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#070d1c'); g.addColorStop(1, '#0e1730');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        // 棋盘
        ctx.fillStyle = 'rgba(4,8,18,.75)';
        env.roundRect(OFFX - 6, OFFY - 6, COLS * TILE + 12, ROWS * TILE + 12, 12); ctx.fill();
        ctx.strokeStyle = 'rgba(56,225,255,.3)'; ctx.lineWidth = 2;
        env.roundRect(OFFX - 6, OFFY - 6, COLS * TILE + 12, ROWS * TILE + 12, 12); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
        for (var y = 0; y < ROWS; y++) for (var x = 0; x < COLS; x++) {
          ctx.strokeRect(OFFX + x * TILE + 0.5, OFFY + y * TILE + 0.5, TILE - 1, TILE - 1);
        }

        // 已固定方块
        var clearing = clearAnim ? clearAnim.rows : [];
        for (var r = 0; r < ROWS; r++) {
          var isClearing = clearing.indexOf(r) >= 0;
          for (var c = 0; c < COLS; c++) {
            var t = board[r][c];
            if (!t) continue;
            var a = isClearing ? Math.max(0, 1 - (clearAnim ? clearAnim.t / 0.24 : 1)) : 1;
            block(OFFX + c * TILE, OFFY + r * TILE, TILE, isClearing ? '#ffffff' : COLORS[t], a);
          }
        }

        if (!over && cur && !clearAnim) {
          // 幽灵
          var gy = ghostY();
          for (var yy = 0; yy < cur.m.length; yy++) for (var xx = 0; xx < cur.m[0].length; xx++) {
            if (!cur.m[yy][xx]) continue;
            if (gy + yy >= 0) block(OFFX + (cur.x + xx) * TILE, OFFY + (gy + yy) * TILE, TILE, COLORS[cur.type], 0.5, true);
          }
          // 当前方块
          for (var y2 = 0; y2 < cur.m.length; y2++) for (var x2 = 0; x2 < cur.m[0].length; x2++) {
            if (!cur.m[y2][x2]) continue;
            if (cur.y + y2 >= 0) block(OFFX + (cur.x + x2) * TILE, OFFY + (cur.y + y2) * TILE, TILE, COLORS[cur.type], 1);
          }
        }

        /* 右侧面板 */
        var px = OFFX + COLS * TILE + 26, py = OFFY + 6;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('NEXT', px, py);
        // 下一个预览
        var boxW = 120, boxH = 100;
        ctx.fillStyle = 'rgba(4,8,18,.7)';
        env.roundRect(px, py + 24, boxW, boxH, 10); ctx.fill();
        ctx.strokeStyle = 'rgba(56,225,255,.25)'; ctx.lineWidth = 1.5;
        env.roundRect(px, py + 24, boxW, boxH, 10); ctx.stroke();
        if (next) {
          var cell = 22;
          var mw = next.m[0].length * cell, mh = next.m.length * cell;
          var ox = px + (boxW - mw) / 2, oy = py + 24 + (boxH - mh) / 2;
          for (var ny = 0; ny < next.m.length; ny++) for (var nx = 0; nx < next.m[0].length; nx++) {
            if (!next.m[ny][nx]) continue;
            block(ox + nx * cell, oy + ny * cell, cell, COLORS[next.type], 1);
          }
        }

        // 数据
        var stats = [['得分', score], ['消行', lines], ['等级', level]];
        var sy = py + 24 + boxH + 22;
        stats.forEach(function (s) {
          ctx.fillStyle = 'rgba(125,143,179,1)'; ctx.font = '13px system-ui';
          ctx.fillText(s[0], px, sy);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Consolas, monospace';
          ctx.fillText(String(s[1]), px, sy + 18);
          sy += 62;
        });

        // 操作提示
        ctx.fillStyle = 'rgba(125,143,179,.85)'; ctx.font = '12.5px system-ui';
        ctx.fillText('← → 移动   ↓ 加速', px, sy + 6);
        ctx.fillText('↑/空格 旋转   Shift 瞬降', px, sy + 26);

        if (over) {
          ctx.fillStyle = 'rgba(6,12,24,.7)';
          env.roundRect(OFFX - 6, OFFY - 6, COLS * TILE + 12, ROWS * TILE + 12, 12); ctx.fill();
          ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 34px system-ui';
          ctx.shadowColor = 'rgba(56,225,255,.9)'; ctx.shadowBlur = 20;
          ctx.fillText('游戏结束', OFFX + COLS * TILE / 2, OFFY + ROWS * TILE / 2 - 10);
          ctx.font = 'bold 18px system-ui'; ctx.shadowBlur = 0; ctx.fillStyle = '#bfe9ff';
          ctx.fillText('得分 ' + score, OFFX + COLS * TILE / 2, OFFY + ROWS * TILE / 2 + 30);
          ctx.shadowBlur = 0;
        }
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      return {
        start: function () { sfx.play('start'); },
        restart: function () { reset(); },
        destroy: function () { }
      };
    }
  });
})();
