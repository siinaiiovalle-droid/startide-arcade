/* ==========================================================================
   水管连接 Pipe Connect
   点击/方向键选中水管，A 或单击旋转 90°，把水从左上源头接到右下出口
   限时完成；步数越少、剩时越多分越高；卡住可用提示（扣分）
   ========================================================================== */
(function () {
  'use strict';

  var DIFF = {
    easy:   { n: 5, time: 180, mult: 0.9, label: '轻松 · 5×5' },
    normal: { n: 6, time: 140, mult: 1.0, label: '标准 · 6×6' },
    hard:   { n: 7, time: 110, mult: 1.25, label: '困难 · 7×7' }
  };
  var DIRS = [
    { dr: -1, dc: 0, bit: 1, opp: 4 },
    { dr: 0, dc: 1, bit: 2, opp: 8 },
    { dr: 1, dc: 0, bit: 4, opp: 1 },
    { dr: 0, dc: -1, bit: 8, opp: 2 }
  ];
  function rotCW(m) { return ((m << 1) | (m >>> 3)) & 15; }

  GameKit.register({
    id: 'pipe',
    name: { zh: '水管连接', en: 'Pipe Connect' },
    desc: { zh: '点击旋转水管，把水从左上源头一路接到右下出口！限时完成，步数越少分越高，卡住了就按 B 或点「提示」让老师傅帮你拧一段。', en: 'Tap pipes to rotate them and route water from the source to the drain before time runs out! Fewer moves score higher — stuck? Call the hint!' },
    genre: { zh: '益智解谜', en: 'Brain' },
    icon: '🔧', hue: '#38bdf8',
    tags: [{ zh: '旋转', en: 'Rotate' }, { zh: '接水', en: 'Plumb' }],
    plays: 5000, hot: false, isNew: true,
    script: 'assets/js/games/pipe.js',
    ratio: 'portrait', duration: '1-3 分钟',
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
      var BX = 40, BY = 132, BS = W - 80, cell = BS / N;

      var grid, moves, hints, timeLeft, score, over, ended, winT, loseT;
      var cr, cc, reach, connected, lastSec, prevPad, flashT, waterAnim;
      var btnHint = { x: W / 2 - 110, y: H - 64, w: 220, h: 44 };

      function idx(r, c) { return r * N + c; }

      function genBoard() {
        var i;
        grid = [];
        for (i = 0; i < N * N; i++) grid.push({ mask: 0, correct: 0, kind: 0 });
        /* 随机 DFS（偏向目标方向）生成一条从 (0,0) 到 (N-1,N-1) 的路径 */
        var vis = {}, path = [[0, 0]];
        vis[0] = true;
        var guard = 0;
        while ((path[path.length - 1][0] !== N - 1 || path[path.length - 1][1] !== N - 1) && guard++ < 900) {
          var cur = path[path.length - 1];
          var opts = [], d;
          for (d = 0; d < 4; d++) {
            var nr = cur[0] + DIRS[d].dr, nc = cur[1] + DIRS[d].dc;
            if (nr >= 0 && nr < N && nc >= 0 && nc < N && !vis[idx(nr, nc)]) opts.push(d);
          }
          if (!opts.length) {
            var rm = path.pop();
            vis[idx(rm[0], rm[1])] = false;
            continue;
          }
          /* 60% 概率挑缩短曼哈顿距离的方向，路径不会绕成盘丝 */
          var best = null;
          for (i = 0; i < opts.length; i++) {
            var dd = opts[i];
            var tr = cur[0] + DIRS[dd].dr, tc = cur[1] + DIRS[dd].dc;
            var dist = (N - 1 - tr) + (N - 1 - tc);
            if (best === null || dist < best.dist) best = { d: dd, dist: dist };
          }
          var pick = (Math.random() < 0.6 && best) ? best.d : opts[Math.floor(Math.random() * opts.length)];
          var nr2 = cur[0] + DIRS[pick].dr, nc2 = cur[1] + DIRS[pick].dc;
          vis[idx(nr2, nc2)] = true;
          path.push([nr2, nc2]);
        }
        /* 路径管线：相邻格互开接口 */
        for (i = 0; i < path.length - 1; i++) {
          var a = path[i], b = path[i + 1];
          var d2 = -1;
          for (var k = 0; k < 4; k++) {
            if (a[0] + DIRS[k].dr === b[0] && a[1] + DIRS[k].dc === b[1]) { d2 = k; break; }
          }
          grid[idx(a[0], a[1])].mask |= DIRS[d2].bit;
          grid[idx(b[0], b[1])].mask |= DIRS[d2].opp;
        }
        for (i = 0; i < N * N; i++) {
          if (grid[i].mask) { grid[i].kind = 1; grid[i].correct = grid[i].mask; }
        }
        grid[0].kind = 2;                 /* 源头（固定） */
        grid[idx(N - 1, N - 1)].kind = 3; /* 出口（固定） */
        /* 空格撒些干扰管 */
        var pieces = [5, 10, 3, 6, 12, 9];
        for (i = 0; i < N * N; i++) {
          if (grid[i].kind === 0 && Math.random() < 0.42) {
            grid[i].kind = 1;
            grid[i].mask = pieces[Math.floor(Math.random() * pieces.length)];
            grid[i].correct = grid[i].mask;
          }
        }
        /* 打乱路径管朝向（源头/出口固定） */
        for (i = 1; i < path.length - 1; i++) {
          var t = Math.floor(Math.random() * 4);
          while (t-- > 0) grid[idx(path[i][0], path[i][1])].mask = rotCW(grid[idx(path[i][0], path[i][1])].mask);
        }
        /* 开局即通的小概率：再拧一段 */
        flow();
        if (connected) {
          var mid = path[Math.floor(path.length / 2)];
          grid[idx(mid[0], mid[1])].mask = rotCW(grid[idx(mid[0], mid[1])].mask);
          flow();
        }
      }

      function flow() {
        reach = [];
        var i;
        for (i = 0; i < N * N; i++) reach.push(false);
        connected = false;
        if (!grid[0].mask) return;
        var q = [0], seen = {};
        seen[0] = true;
        reach[0] = true;
        while (q.length) {
          var cur = q.shift();
          var r = Math.floor(cur / N), c = cur % N;
          for (var d = 0; d < 4; d++) {
            if (!(grid[cur].mask & DIRS[d].bit)) continue;
            var nr = r + DIRS[d].dr, nc = c + DIRS[d].dc;
            if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue;
            var ni = idx(nr, nc);
            if (seen[ni]) continue;
            if (!(grid[ni].mask & DIRS[d].opp)) continue;
            seen[ni] = true;
            reach[ni] = true;
            q.push(ni);
          }
        }
        connected = reach[idx(N - 1, N - 1)];
      }

      function curScore() {
        return Math.max(100, Math.round((500 + N * 60 + timeLeft * 5 - moves * 2 - hints * 60) * cfg.mult));
      }
      function syncHud() {
        env.hud({
          score: score, level: 1,
          extra: cfg.label + ' · 步数 ' + moves + (hints ? ' · 提示 ' + hints : '') + ' · ⏱ ' + Math.ceil(timeLeft) + 's'
        });
      }

      function finish(win) {
        if (ended) return;
        ended = true;
        over = true;
        if (win) {
          score = curScore();
          env.win({ score: score, level: 1, extra: cfg.label + ' · ' + moves + ' 步接通' + (hints ? ' · 提示×' + hints : '') });
        } else {
          env.gameOver({ win: false, score: score, level: 1, extra: cfg.label + ' · 时间耗尽 · 还差一段管' });
        }
      }

      function rotate(r, c) {
        if (over) return;
        if (r < 0 || r >= N || c < 0 || c >= N) return;
        var g = grid[idx(r, c)];
        if (g.kind === 0) { sfx.play('block'); return; }
        if (g.kind === 2 || g.kind === 3) { sfx.play('block'); flashT = 0.3; return; }
        g.mask = rotCW(g.mask);
        moves++;
        sfx.play('rotate');
        flow();
        waterAnim = 0.25;
        if (connected) { winT = 0.55; sfx.play('clear'); }
        syncHud();
      }

      function hint() {
        if (over) return;
        var i;
        for (i = 0; i < N * N; i++) {
          var g = grid[i];
          if (g.kind === 1 && g.mask !== g.correct) {
            g.mask = g.correct;
            hints++;
            sfx.play('select');
            flow();
            waterAnim = 0.25;
            if (connected) { winT = 0.55; sfx.play('clear'); }
            syncHud();
            return true;
          }
        }
        sfx.play('block');
        return false;
      }

      function reset() {
        moves = 0; hints = 0; timeLeft = cfg.time;
        score = curScoreBase();
        over = false; ended = false; winT = 0; loseT = 0;
        cr = 0; cc = 0; lastSec = -1; prevPad = {}; flashT = 0; waterAnim = 0;
        genBoard();
        flow();
        syncHud();
      }
      function curScoreBase() { return Math.max(100, Math.round((500 + N * 60 + cfg.time * 5) * cfg.mult)); }

      /* ---- 输入 ---- */
      function onDown(e) {
        if (over) return;
        var p = env.pointer(e);
        if (p.x >= btnHint.x && p.x <= btnHint.x + btnHint.w && p.y >= btnHint.y && p.y <= btnHint.y + btnHint.h) {
          hint();
          return;
        }
        var c = Math.floor((p.x - BX) / cell), r = Math.floor((p.y - BY) / cell);
        if (r >= 0 && r < N && c >= 0 && c < N) {
          cr = r; cc = c;
          rotate(r, c);
        }
      }
      env.canvas.addEventListener('pointerdown', onDown);

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
        if (padEdge('a')) rotate(cr, cc);
        if (padEdge('b')) hint();
      }

      function update(dt) {
        var i;
        if (over) return;
        updateInput();
        timeLeft -= dt;
        if (flashT > 0) flashT -= dt;
        if (waterAnim > 0) waterAnim -= dt;
        var sec = Math.ceil(timeLeft);
        if (sec !== lastSec) {
          lastSec = sec;
          score = curScore();
          syncHud();
          if (sec <= 10 && sec > 0) sfx.play('warn');
        }
        if (timeLeft <= 0) {
          timeLeft = 0;
          if (connected) { finish(true); } else { finish(false); }
          return;
        }
        if (winT > 0) {
          winT -= dt;
          if (winT <= 0) { finish(true); return; }
        }
        /* 出口连通后的水流粒子闪烁由 render 处理 */
        i = 0;
      }

      function drawPipe(g, x, y, m, wet) {
        var cx = x + cell / 2, cy = y + cell / 2, half = cell / 2;
        ctx.lineCap = 'round';
        ctx.lineWidth = cell * 0.32;
        ctx.strokeStyle = wet ? '#7dd3fc' : '#54627d';
        var b;
        for (b = 0; b < 4; b++) {
          if (!(m & DIRS[b].bit)) continue;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + DIRS[b].dc * half, cy + DIRS[b].dr * half);
          ctx.stroke();
        }
        ctx.fillStyle = wet ? '#38bdf8' : '#64748b';
        ctx.beginPath();
        ctx.arc(cx, cy, cell * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }

      function render() {
        var i, r, c;
        ctx.fillStyle = '#0b1526';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#7dd3fc';
        ctx.font = 'bold 24px system-ui, sans-serif';
        ctx.fillText('🔧 水管连接', W / 2, 42);
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText('点水管旋转 · 接通源头到出口 · B 键提示', W / 2, 68);

        ctx.fillStyle = 'rgba(255,255,255,.03)';
        ctx.fillRect(BX - 8, BY - 8, BS + 16, BS + 16);
        for (r = 0; r < N; r++) {
          for (c = 0; c < N; c++) {
            var x = BX + c * cell, y = BY + r * cell;
            var g = grid[idx(r, c)];
            ctx.fillStyle = 'rgba(255,255,255,.05)';
            ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
            if (g.kind === 2) {
              ctx.fillStyle = '#22c55e';
              ctx.fillRect(x + 3, y + 3, cell - 6, cell - 6);
              ctx.font = Math.floor(cell * 0.5) + 'px system-ui';
              ctx.fillText('🚰', x + cell / 2, y + cell / 2);
            } else if (g.kind === 3) {
              ctx.fillStyle = reach[idx(r, c)] && connected ? '#fbbf24' : '#7c3aed';
              ctx.fillRect(x + 3, y + 3, cell - 6, cell - 6);
              ctx.font = Math.floor(cell * 0.5) + 'px system-ui';
              ctx.fillText('🏁', x + cell / 2, y + cell / 2);
            } else if (g.kind === 1) {
              drawPipe(g, x, y, g.mask, reach[idx(r, c)]);
            }
          }
        }
        /* 键盘光标 */
        if (flashT > 0) {
          ctx.strokeStyle = 'rgba(248,113,113,.9)';
        } else {
          ctx.strokeStyle = 'rgba(125,211,252,.85)';
        }
        ctx.lineWidth = 3;
        ctx.strokeRect(BX + cc * cell + 2, BY + cr * cell + 2, cell - 4, cell - 4);

        /* 提示按钮 */
        ctx.fillStyle = 'rgba(56,189,248,.16)';
        ctx.fillRect(btnHint.x, btnHint.y, btnHint.w, btnHint.h);
        ctx.strokeStyle = 'rgba(56,189,248,.5)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(btnHint.x, btnHint.y, btnHint.w, btnHint.h);
        ctx.fillStyle = '#7dd3fc';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillText('💡 提示（-60 分）', W / 2, btnHint.y + btnHint.h / 2);

        /* 限时条 */
        var frac = Math.max(0, timeLeft / cfg.time);
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.fillRect(60, H - 22, 440, 8);
        ctx.fillStyle = frac < 0.25 ? '#f87171' : '#38bdf8';
        ctx.fillRect(60, H - 22, 440 * frac, 8);
        if (connected && winT > 0) {
          ctx.fillStyle = 'rgba(251,191,36,.9)';
          ctx.font = 'bold 20px system-ui, sans-serif';
          ctx.fillText('💧 接通！', W / 2, BY - 22);
        }
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        state: function () {
          var kindsS = '', ki;
          for (ki = 0; ki < N * N; ki++) kindsS += String(grid[ki].kind);
          return {
            moves: moves, hints: hints, timeLeft: timeLeft, score: score,
            over: over, connected: connected, cursor: [cr, cc], n: N, kinds: kindsS
          };
        },
        rotate: function (r, c) { rotate(r, c); },
        hint: function () { return hint(); },
        setTime: function (t) { timeLeft = t; },
        open: function (d) {
          /* 返回光标当前格该方向是否可走（供测试选真通路） */
          var g = grid[idx(cr, cc)];
          return !!(g && (g.mask & DIRS[d].bit));
        }
      };

      return {
        start: function () { syncHud(); },
        restart: function () { reset(); },
        destroy: function () {
          env.canvas.removeEventListener('pointerdown', onDown);
        }
      };
    }
  });
})(window);
