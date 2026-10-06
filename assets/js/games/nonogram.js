/* ==========================================================================
   数织 Nonogram Picross
   按行/列数字提示填色还原像素画：左键/点按=填色，B/右键=标记✘
   填错扣一颗心（自动改为✘），3 颗心用完或超时失败
   ========================================================================== */
(function () {
  'use strict';

  var DIFF = {
    easy:   { n: 5, time: 150, mult: 0.9,  label: '轻松 · 5×5' },
    normal: { n: 7, time: 210, mult: 1.0,  label: '标准 · 7×7' },
    hard:   { n: 9, time: 270, mult: 1.25, label: '困难 · 9×9' }
  };

  GameKit.register({
    id: 'nonogram',
    name: { zh: '数织', en: 'Nonogram' },
    desc: { zh: '按行列数字提示填色，还原隐藏的像素画！点按填色、长按格或按 B 标记✘；填错扣心，三颗心用完前把画完成！', en: 'Fill cells using row & column number clues to reveal the pixel art! Tap to fill, B or right-click to mark ✘. Three mistakes and it\'s over!' },
    genre: { zh: '益智解谜', en: 'Brain' },
    icon: '🧩', hue: '#34d399',
    tags: [{ zh: '逻辑', en: 'Logic' }, { zh: '填色', en: 'Paint' }],
    plays: 5000, hot: false, isNew: true,
    script: 'assets/js/games/nonogram.js',
    ratio: 'portrait', duration: '2-5 分钟',
    logical: { w: 560, h: 700 },
    touchControls: ['a', 'b'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!DIFF[diff]) diff = 'normal';
      var cfg = DIFF[diff];
      var N = cfg.n;
      var cell = N <= 5 ? 74 : (N <= 7 ? 54 : 44);
      var maxRuns = Math.ceil(N / 2) + 1;
      var clueW = maxRuns * 17 + 10, clueH = maxRuns * 17 + 10;
      var BX = 46 + clueW, BY = 128 + clueH;

      var sol, marks, solCount, filled, mistakes, lives;
      var timeLeft, score, over, ended, winT, lastSec, prevPad;
      var cr, cc, markMode, flashCell, flashT;
      var btnMode = { x: 46, y: H - 64, w: 200, h: 44 };
      var btnUndo = { x: W - 246, y: H - 64, w: 200, h: 44 };

      function idx(r, c) { return r * N + c; }

      function runsOf(cells) {
        var out = [], run = 0, i;
        for (i = 0; i < cells.length; i++) {
          if (cells[i]) run++;
          else if (run) { out.push(run); run = 0; }
        }
        if (run) out.push(run);
        return out.length ? out : [0];
      }

      function genSol() {
        var i;
        sol = [];
        for (i = 0; i < N * N; i++) sol.push(Math.random() < 0.52 ? 1 : 0);
        /* 保证每行每列至少一格，提示不出现全 0 行 */
        var r, c;
        for (r = 0; r < N; r++) {
          var rowEmpty = true;
          for (c = 0; c < N; c++) if (sol[idx(r, c)]) { rowEmpty = false; break; }
          if (rowEmpty) sol[idx(r, Math.floor(Math.random() * N))] = 1;
        }
        for (c = 0; c < N; c++) {
          var colEmpty = true;
          for (r = 0; r < N; r++) if (sol[idx(r, c)]) { colEmpty = false; break; }
          if (colEmpty) sol[idx(Math.floor(Math.random() * N), c)] = 1;
        }
        solCount = 0;
        for (i = 0; i < N * N; i++) if (sol[i]) solCount++;
      }

      function curScore() {
        return Math.max(80, Math.round((solCount * 22 + lives * 180 + timeLeft * 3) * cfg.mult));
      }
      function syncHud() {
        env.hud({
          score: score, lives: lives, level: 1,
          extra: cfg.label + ' · ' + filled + '/' + solCount + ' 格' + (markMode ? ' · ❌标记模式' : '') + ' · ⏱ ' + Math.ceil(timeLeft) + 's'
        });
      }

      function finish(win) {
        if (ended) return;
        ended = true;
        over = true;
        if (win) {
          score = curScore();
          env.win({ score: score, level: 1, extra: cfg.label + ' · 完成！' + mistakes + ' 次失误' });
        } else {
          env.gameOver({ win: false, score: score, level: 1, extra: cfg.label + (lives <= 0 ? ' · 三心用尽' : ' · 时间耗尽') });
        }
      }

      function setCell(r, c, mode) {
        /* mode: 1=填色 2=标记 0=清空 */
        if (over) return false;
        var m = marks[idx(r, c)];
        if (m === 2 && mode === 1) return false; /* ✘ 格不能直接填，先清 */
        if (mode === 1) {
          if (m === 1) return false;
          if (!sol[idx(r, c)]) {
            mistakes++;
            lives--;
            marks[idx(r, c)] = 2;
            flashCell = [r, c]; flashT = 0.5;
            sfx.play('hit');
            syncHud();
            if (lives <= 0) { finish(false); }
            return true;
          }
          marks[idx(r, c)] = 1;
          filled++;
          sfx.play('coin');
          syncHud();
          if (filled >= solCount) { winT = 0.5; sfx.play('clear'); }
          return true;
        }
        if (mode === 2) {
          if (m === 1) return false;
          marks[idx(r, c)] = (m === 2 ? 0 : 2);
          sfx.play('select');
          return true;
        }
        if (m !== 2 || sol[idx(r, c)]) marks[idx(r, c)] = 0;
        sfx.play('click');
        return true;
      }

      function reset() {
        var i;
        genSol();
        marks = [];
        for (i = 0; i < N * N; i++) marks.push(0);
        filled = 0; mistakes = 0; lives = 3;
        timeLeft = cfg.time;
        score = curScore();
        over = false; ended = false; winT = 0;
        cr = 0; cc = 0; markMode = false; lastSec = -1;
        prevPad = {}; flashT = 0; flashCell = null;
        syncHud();
      }

      /* ---- 输入 ---- */
      function cellAt(p) {
        var c = Math.floor((p.x - BX) / cell), r = Math.floor((p.y - BY) / cell);
        if (r >= 0 && r < N && c >= 0 && c < N) return [r, c];
        return null;
      }
      function inBtn(b, p) { return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }

      function onDown(e) {
        if (over) return;
        var p = env.pointer(e);
        if (inBtn(btnMode, p)) { markMode = !markMode; sfx.play('click'); syncHud(); return; }
        if (inBtn(btnUndo, p)) {
          var cleared = 0, k;
          for (k = 0; k < N * N; k++) {
            if (marks[k] === 2 && !sol[k]) { marks[k] = 0; cleared++; }
          }
          sfx.play('back');
          syncHud();
          return;
        }
        var cell = cellAt(p);
        if (cell) {
          cr = cell[0]; cc = cell[1];
          setCell(cr, cc, markMode ? 2 : 1);
        }
      }
      function onCtx(e) {
        e.preventDefault();
        if (over) return;
        var cell = cellAt(env.pointer(e));
        if (cell) setCell(cell[0], cell[1], 2);
      }
      env.canvas.addEventListener('pointerdown', onDown);
      env.canvas.addEventListener('contextmenu', onCtx);

      function padEdge(k) {
        var v = !!env.pad[k], p = !!prevPad[k];
        prevPad[k] = v;
        return v && !p;
      }
      function updateInput() {
        if (padEdge('left')) { cc = Math.max(0, cc - 1); sfx.play('click'); }
        if (padEdge('right')) { cc = Math.min(N - 1, cc + 1); sfx.play('click'); }
        if (padEdge('up')) { cr = Math.max(0, cr - 1); sfx.play('click'); }
        if (padEdge('down')) { cr = Math.min(N - 1, cr + 1); sfx.play('click'); }
        if (padEdge('a')) setCell(cr, cc, markMode ? 2 : 1);
        if (padEdge('b')) setCell(cr, cc, 2);
      }

      function update(dt) {
        if (over) return;
        updateInput();
        timeLeft -= dt;
        if (flashT > 0) flashT -= dt;
        var sec = Math.ceil(timeLeft);
        if (sec !== lastSec) {
          lastSec = sec;
          score = curScore();
          syncHud();
          if (sec <= 10 && sec > 0) sfx.play('warn');
        }
        if (timeLeft <= 0) {
          timeLeft = 0;
          finish(filled >= solCount);
          return;
        }
        if (winT > 0) {
          winT -= dt;
          if (winT <= 0) { finish(true); return; }
        }
      }

      function render() {
        var r, c;
        ctx.fillStyle = '#0a1a14';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#6ee7b7';
        ctx.font = 'bold 24px system-ui, sans-serif';
        ctx.fillText('🧩 数织', W / 2, 42);
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText('按行列提示填色 · 点错扣心 · 右键/B 标记✘', W / 2, 68);

        /* 心 */
        for (var h = 0; h < 3; h++) {
          ctx.font = '18px system-ui';
          ctx.fillText(h < lives ? '❤️' : '🖤', 470 + h * 24, 42);
        }

        /* 行列提示 */
        ctx.font = 'bold 12px Consolas, monospace';
        for (r = 0; r < N; r++) {
          var rr = runsOfRow(r);
          for (var i = 0; i < rr.length; i++) {
            ctx.fillStyle = '#a7f3d0';
            ctx.fillText(String(rr[i]), BX - clueW + i * 17 + 8, BY + r * cell + cell / 2);
          }
        }
        for (c = 0; c < N; c++) {
          var cc2 = runsOfCol(c);
          for (var j = 0; j < cc2.length; j++) {
            ctx.fillStyle = '#a7f3d0';
            ctx.fillText(String(cc2[j]), BX + c * cell + cell / 2, BY - clueH + j * 17 + 8);
          }
        }

        /* 格子 */
        for (r = 0; r < N; r++) {
          for (c = 0; c < N; c++) {
            var x = BX + c * cell, y = BY + r * cell;
            var m = marks[idx(r, c)];
            ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.045)';
            ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
            if (m === 1) {
              ctx.fillStyle = '#34d399';
              ctx.fillRect(x + 4, y + 4, cell - 8, cell - 8);
            } else if (m === 2) {
              ctx.strokeStyle = flashCell && flashT > 0 && flashCell[0] === r && flashCell[1] === c ? '#f87171' : 'rgba(255,255,255,.55)';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.moveTo(x + 7, y + 7); ctx.lineTo(x + cell - 7, y + cell - 7);
              ctx.moveTo(x + cell - 7, y + 7); ctx.lineTo(x + 7, y + cell - 7);
              ctx.stroke();
            }
          }
        }
        /* 光标 */
        ctx.strokeStyle = 'rgba(110,231,183,.9)';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(BX + cc * cell + 1, BY + cr * cell + 1, cell - 2, cell - 2);

        /* 模式 / 重置标记 按钮 */
        drawBtn(btnMode, markMode ? '❌ 标记模式' : '✏️ 填色模式', markMode ? '#fbbf24' : '#6ee7b7');
        drawBtn(btnUndo, '↩ 清除标记', '#94a3b8');

        /* 时间条 */
        var frac = Math.max(0, timeLeft / cfg.time);
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.fillRect(60, H - 20, 440, 8);
        ctx.fillStyle = frac < 0.25 ? '#f87171' : '#34d399';
        ctx.fillRect(60, H - 20, 440 * frac, 8);
      }
      function runsOfRow(r) {
        var cells = [], c;
        for (c = 0; c < N; c++) cells.push(sol[idx(r, c)]);
        return runsOf(cells);
      }
      function runsOfCol(c) {
        var cells = [], r;
        for (r = 0; r < N; r++) cells.push(sol[idx(r, c)]);
        return runsOf(cells);
      }
      function drawBtn(b, txt, color) {
        ctx.fillStyle = 'rgba(255,255,255,.07)';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = color;
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.fillText(txt, b.x + b.w / 2, b.y + b.h / 2);
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        state: function () {
          var markedN = 0, mi;
          for (mi = 0; mi < N * N; mi++) if (marks[mi] === 2) markedN++;
          return {
            mistakes: mistakes, lives: lives, filled: filled, solCount: solCount,
            marked: markedN,
            timeLeft: timeLeft, over: over, cursor: [cr, cc], n: N, markMode: markMode
          };
        },
        /* 测试驱动：把一个未填的答案格正确填上 */
        fillCorrectOne: function () {
          for (var i = 0; i < N * N; i++) {
            if (sol[i] && marks[i] !== 1) {
              var r = Math.floor(i / N), c = i % N;
              cr = r; cc = c;
              return setCell(r, c, 1);
            }
          }
          return false;
        },
        /* 测试驱动：故意填错一格（触发扣心） */
        makeMistake: function () {
          for (var i = 0; i < N * N; i++) {
            if (!sol[i] && marks[i] === 0) {
              var r = Math.floor(i / N), c = i % N;
              cr = r; cc = c;
              return setCell(r, c, 1);
            }
          }
          return false;
        },
        markAt: function (r, c) { return setCell(r, c, 2); },
        setTime: function (t) { timeLeft = t; }
      };

      return {
        start: function () { syncHud(); },
        restart: function () { reset(); },
        destroy: function () {
          env.canvas.removeEventListener('pointerdown', onDown);
          env.canvas.removeEventListener('contextmenu', onCtx);
        }
      };
    }
  });
})(window);
