/* ==========================================================================
   数独 Sudoku —— 9×9 唯一解数独
   回溯生成终盘 → 对称挖洞（唯一解校验）→ 填满即胜
   错误即时标红计错，难度决定挖洞数量，时间越短通关分越高
   ========================================================================== */
(function () {
  'use strict';

  var N = 9, CELL = 46;
  var BOARD_W = CELL * N; // 414

  GameKit.register({
    id: 'sudoku',
    name: { zh: '数独', en: 'Sudoku' },
    desc: { zh: '经典数独：每行每列每宫都是 1-9 不重复，唯一解谜题，错填即时标红，通关越快分越高。', en: 'Classic Sudoku with unique solutions. Wrong digits turn red instantly — solve fast for bonus points.' },
    genre: { zh: '益智解谜', en: 'Puzzle' },
    icon: '🔣', hue: '#c084fc',
    tags: [{ zh: '新品', en: 'New' }, { zh: '烧脑', en: 'Brainy' }],
    plays: 4000, hot: false, isNew: true,
    script: 'assets/js/games/sudoku.js',
    ratio: 'portrait', duration: '3-15 分钟'
  });

  GameKit.register({
    id: 'sudoku',
    name: { zh: '数独', en: 'Sudoku' },
    desc: { zh: '行、列、宫内 1-9 不重复。错填标红计错，填满全部正确即通关。', en: 'Fill 1-9 without repeats in rows, columns and boxes. Wrong digits turn red.' },
    genre: { zh: '益智解谜', en: 'Puzzle' },
    icon: '🔣', hue: '#c084fc',
    logical: { w: 560, h: 700 },
    hot: false, isNew: true, sound: 'calm',
    controls: {
      keyboard: [
        { k: '← → ↑ ↓ / WASD', zh: '移动选择', en: 'Move selection' },
        { k: '1-9 / 退格', zh: '填数 / 擦除', en: 'Place / Erase' }
      ],
      touch: [
        { k: '点击格子', zh: '选择', en: 'Pick cell' },
        { k: '数字键盘', zh: '填数', en: 'Place digit' }
      ]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var X0 = (W - BOARD_W) / 2, Y0 = 96;
      var PAD_Y = Y0 + BOARD_W + 30;      // 数字键盘起始 y
      var ERASE_Y = PAD_Y + 48;

      var solution, fixed, board, sel, mistakes, time, level, score, msg, msgT, msgColor, floats, prev, won;

      var diff = 'normal', givens = 36, baseScore = 500;
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty === 'easy') { diff = 'easy'; givens = 45; baseScore = 300; }
        else if (gc && gc.difficulty === 'hard') { diff = 'hard'; givens = 28; baseScore = 800; }
      } catch (e) { }

      /* ---------- 生成：回溯造终盘 ---------- */
      function candidates(b, idx) {
        var r = Math.floor(idx / N), c = idx % N, used = {};
        for (var k = 0; k < N; k++) {
          used[b[r * N + k]] = 1;
          used[b[k * N + c]] = 1;
        }
        var br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
        for (var dr = 0; dr < 3; dr++) for (var dc = 0; dc < 3; dc++) used[b[(br + dr) * N + bc + dc]] = 1;
        var out = [];
        for (var d = 1; d <= 9; d++) if (!used[d]) out.push(d);
        return out;
      }

      function generateFull() {
        var b = [];
        for (var i = 0; i < 81; i++) b.push(0);
        function fill(pos) {
          if (pos === 81) return true;
          var cands = candidates(b, pos);
          for (var k = cands.length - 1; k > 0; k--) {
            var j = (Math.random() * (k + 1)) | 0;
            var t = cands[k]; cands[k] = cands[j]; cands[j] = t;
          }
          for (var m = 0; m < cands.length; m++) {
            b[pos] = cands[m];
            if (fill(pos + 1)) return true;
            b[pos] = 0;
          }
          return false;
        }
        fill(0);
        return b;
      }

      /* 唯一解计数（上限 2 即停） */
      function countSolutions(b, limit) {
        if (limit <= 0) return 0;
        var best = -1, bestC = null;
        for (var i = 0; i < 81; i++) {
          if (b[i]) continue;
          var cs = candidates(b, i);
          if (!cs.length) return 0;
          if (bestC === null || cs.length < bestC.length) { best = i; bestC = cs; if (cs.length === 1) break; }
        }
        if (bestC === null) return 1;
        var total = 0;
        for (var m = 0; m < bestC.length; m++) {
          b[best] = bestC[m];
          total += countSolutions(b, limit - total);
          b[best] = 0;
          if (total >= limit) break;
        }
        return total;
      }

      function generatePuzzle() {
        solution = generateFull();
        board = solution.slice();
        fixed = [];
        for (var i = 0; i < 81; i++) fixed.push(true);
        var order = [];
        for (i = 0; i < 81; i++) order.push(i);
        for (var k = order.length - 1; k > 0; k--) {
          var j = (Math.random() * (k + 1)) | 0;
          var t = order[k]; order[k] = order[j]; order[j] = t;
        }
        var removed = 0, target = 81 - givens;
        for (i = 0; i < order.length && removed < target; i++) {
          var idx = order[i];
          var keep = board[idx];
          board[idx] = 0;
          if (countSolutions(board.slice(), 2) === 1) { fixed[idx] = false; removed++; }
          else board[idx] = keep;
        }
        for (i = 0; i < 81; i++) if (board[i]) fixed[i] = true;
      }

      /* ---------- 玩法 ---------- */
      function reset() {
        score = 0; mistakes = 0; time = 0; won = false; level = 1; prev = {};
        floats = []; msg = ''; msgT = 0; msgColor = '';
        generatePuzzle();
        sel = -1;
        /* 找一个空格做初始选择 */
        for (var i = 0; i < 81; i++) if (!board[i]) { sel = i; break; }
        syncHud();
      }

      function syncHud() {
        var mm = Math.floor(time / 60), ss = Math.floor(time % 60);
        env.hud({
          score: score, lives: 1, level: level,
          extra: '用时 ' + mm + ':' + (ss < 10 ? '0' : '') + ss + ' · 错误 ' + mistakes + ' · ' + diffName()
        });
      }
      function diffName() { return diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通'; }

      function center(idx) {
        return { x: X0 + (idx % N) * CELL + CELL / 2, y: Y0 + Math.floor(idx / N) * CELL + CELL / 2 };
      }

      function place(d) {
        if (won || sel < 0 || fixed[sel]) return;
        if (board[sel] === d) d = 0; /* 再按同数字 = 擦除 */
        board[sel] = d;
        if (d === 0) { sfx.play('back'); return; }
        if (d !== solution[sel]) {
          mistakes++;
          sfx.play('warn');
          var m = center(sel);
          floats.push({ x: m.x, y: m.y - 12, txt: '✗', color: '#ff5d6c', t: 1 });
          score = Math.max(0, score - 10);
        } else {
          sfx.play('click');
          score = Math.max(0, score + 5);
          /* 小奖励：填完一行 / 一列 / 一宫 */
          var r = Math.floor(sel / N), c = sel % N, done = [];
          var rowOK = true, colOK = true;
          for (var k = 0; k < N; k++) {
            if (board[r * N + k] !== solution[r * N + k]) rowOK = false;
            if (board[k * N + c] !== solution[k * N + c]) colOK = false;
          }
          if (rowOK) done.push('整行 +30');
          if (colOK) done.push('整列 +30');
          var br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3, boxOK = true;
          for (var dr = 0; dr < 3; dr++) for (var dc = 0; dc < 3; dc++) {
            var bi = (br + dr) * N + bc + dc;
            if (board[bi] !== solution[bi]) boxOK = false;
          }
          if (boxOK) done.push('整宫 +30');
          if (done.length) {
            score += 30 * done.length;
            sfx.play('coin');
            var cm = center(sel);
            floats.push({ x: cm.x, y: cm.y - 20, txt: done.join(' '), color: '#ffd166', t: 1.2 });
          }
        }
        syncHud();
        checkWin();
      }

      function checkWin() {
        for (var i = 0; i < 81; i++) if (board[i] !== solution[i]) return;
        won = true;
        var bonus = Math.max(0, 400 - Math.floor(time) * 2);
        var total = baseScore + bonus - mistakes * 25;
        total = Math.max(50, total);
        score += total;
        sfx.play('win');
        env.hud({ score: score, extra: '通关！用时 ' + Math.floor(time) + 's · ' + diffName() });
        env.win({ score: score, detail: diffName() + '难度 · 用时 ' + Math.floor(time) + ' 秒 · 错误 ' + mistakes + ' 次' });
      }

      /* ---------- 数字键盘 ---------- */
      var padRects = [];
      (function buildPad() {
        var bw = 42, gap = 4;
        var total = bw * 9 + gap * 8;
        var px = (W - total) / 2;
        for (var i = 0; i < 9; i++) padRects.push({ x: px + i * (bw + gap), y: PAD_Y, w: bw, h: 44, d: i + 1 });
        padRects.push({ x: (W - 150) / 2, y: ERASE_Y, w: 150, h: 42, d: 0 });
      })();

      function hitPad(p) {
        for (var i = 0; i < padRects.length; i++) {
          var b = padRects[i];
          if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b.d;
        }
        return -1;
      }

      function hitCell(p) {
        var c = Math.floor((p.x - X0) / CELL), r = Math.floor((p.y - Y0) / CELL);
        if (r < 0 || r >= N || c < 0 || c >= N) return -1;
        return r * N + c;
      }

      function moveSel(dc, dr) {
        if (sel < 0) sel = 0;
        var r = Math.floor(sel / N), c = sel % N;
        r = (r + dr + N) % N; c = (c + dc + N) % N;
        sel = r * N + c;
      }

      function edge() {
        var hit = null;
        ['left', 'right', 'up', 'down', 'a'].forEach(function (k) {
          if (env.pad[k] && !prev[k]) hit = k;
          prev[k] = env.pad[k];
        });
        return hit;
      }

      function update(dt) {
        var i, f;
        for (i = floats.length - 1; i >= 0; i--) {
          f = floats[i]; f.t -= dt / 0.9; f.y -= dt * 40;
          if (f.t <= 0) floats.splice(i, 1);
        }
        if (msgT > 0) msgT -= dt;
        if (won) return;

        time += dt;
        if (Math.floor(time * 2) % 2 === 0) syncHud(); /* 半秒一次刷新计时 */

        var act = edge();
        if (act === 'a') place(0); /* Space：擦除当前格 */
        else if (act === 'left') moveSel(-1, 0);
        else if (act === 'right') moveSel(1, 0);
        else if (act === 'up') moveSel(0, -1);
        else if (act === 'down') moveSel(0, 1);
      }

      function render() {
        var i, f;
        var bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#120f24'); bg.addColorStop(1, '#1b1436');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        /* 棋盘 */
        ctx.fillStyle = 'rgba(255,255,255,.04)';
        env.roundRect(X0 - 8, Y0 - 8, BOARD_W + 16, BOARD_W + 16, 12); ctx.fill();

        /* 选中 / 同数高亮 */
        if (sel >= 0 && board[sel]) {
          ctx.fillStyle = 'rgba(192,132,252,.12)';
          for (var i = 0; i < 81; i++) if (board[i] === board[sel]) {
            ctx.fillRect(X0 + (i % N) * CELL, Y0 + Math.floor(i / N) * CELL, CELL, CELL);
          }
        }
        if (sel >= 0) {
          ctx.fillStyle = 'rgba(192,132,252,.22)';
          ctx.fillRect(X0 + (sel % N) * CELL, Y0 + Math.floor(sel / N) * CELL, CELL, CELL);
        }

        /* 数字 */
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
          var idx = r * N + c, v = board[idx];
          var x = X0 + c * CELL, y = Y0 + r * CELL;
          if (v) {
            var wrong = !fixed[idx] && v !== solution[idx];
            ctx.font = fixed[idx] ? 'bold 22px system-ui' : '22px system-ui';
            ctx.fillStyle = fixed[idx] ? '#f2ecff' : (wrong ? '#ff5d6c' : '#8fd0ff');
            ctx.fillText(String(v), x + CELL / 2, y + CELL / 2 + 1);
          }
        }

        /* 网格线 */
        for (var k = 0; k <= N; k++) {
          var bold = k % 3 === 0;
          ctx.strokeStyle = bold ? 'rgba(192,132,252,.6)' : 'rgba(192,132,252,.18)';
          ctx.lineWidth = bold ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(X0 + k * CELL, Y0); ctx.lineTo(X0 + k * CELL, Y0 + BOARD_W);
          ctx.moveTo(X0, Y0 + k * CELL); ctx.lineTo(X0 + BOARD_W, Y0 + k * CELL);
          ctx.stroke();
        }
        /* 当前选中外框 */
        if (sel >= 0) {
          ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2.5;
          ctx.strokeRect(X0 + (sel % N) * CELL + 1, Y0 + Math.floor(sel / N) * CELL + 1, CELL - 2, CELL - 2);
        }

        /* 浮动文字 */
        for (i = 0; i < floats.length; i++) {
          f = floats[i];
          ctx.globalAlpha = Math.max(0, Math.min(1, f.t * 1.4));
          ctx.font = 'bold 16px system-ui'; ctx.fillStyle = f.color;
          ctx.fillText(f.txt, f.x, f.y);
          ctx.globalAlpha = 1;
        }

        /* 数字键盘 */
        for (i = 0; i < padRects.length; i++) {
          var b = padRects[i];
          var isErase = b.d === 0;
          ctx.fillStyle = isErase ? 'rgba(255,93,108,.16)' : 'rgba(255,255,255,.08)';
          env.roundRect(b.x, b.y, b.w, b.h, 8); ctx.fill();
          ctx.strokeStyle = isErase ? 'rgba(255,93,108,.6)' : 'rgba(255,255,255,.18)';
          ctx.lineWidth = 1;
          env.roundRect(b.x, b.y, b.w, b.h, 8); ctx.stroke();
          ctx.fillStyle = '#f2ecff'; ctx.font = 'bold 20px system-ui';
          ctx.fillText(isErase ? '⌫ 擦除' : String(b.d), b.x + b.w / 2, b.y + b.h / 2 + 1);
        }

        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('进度', 24, 28);
        var filled = 0;
        for (i = 0; i < 81; i++) if (board[i] === solution[i] && !fixed[i]) filled++;
        ctx.fillStyle = '#fff'; ctx.font = 'bold 26px Consolas, monospace';
        ctx.fillText(filled + '/' + (81 - givens), 24, 56);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText(diffName() + ' · ' + Math.floor(time) + 's', W - 24, 28);
        ctx.fillStyle = mistakes ? '#ff5d6c' : '#2ee6a8'; ctx.font = 'bold 26px Consolas, monospace';
        ctx.fillText('✗ ' + mistakes, W - 24, 56);
      }

      reset();

      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || won) return;
        var code = e.code;
        if (code.indexOf('Digit') === 0 || code.indexOf('Numpad') === 0) {
          var d = parseInt(code.slice(-1), 10);
          if (d >= 1 && d <= 9) place(d);
          else if (d === 0) place(0);
        } else if (code === 'Backspace' || code === 'Delete') {
          place(0);
        }
      });

      env.canvas.addEventListener('pointerdown', function (e) {
        if (won) return;
        var p = env.pointer(e);
        var cell = hitCell(p);
        if (cell >= 0) { sel = cell; sfx.play('select'); return; }
        var d = hitPad(p);
        if (d >= 0) place(d === 0 ? 0 : d);
      });

      env.loop(function (dt) { update(dt); render(); });

      /* 自动化/调试辅助：解、固定格视图、按输入路径填数 */
      env.canvas.__auto = {
        solution: function () { return solution.slice(); },
        fixed: function () { return fixed.slice(); },
        set: function (i, d) { sel = i; place(d); }
      };

      return {
        start: function () {
          sfx.play('start');
          level = 1;
          syncHud();
        },
        restart: function () { reset(); level = 1; },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
