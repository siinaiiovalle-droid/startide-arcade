/* ==========================================================================
   迷宫逃脱 Maze Escape
   递归回溯生成完美迷宫 · 集齐 3 把钥匙开启出口 · 限时逃脱
   输入：方向键/WASD/手柄移动（支持按住连走）· 触屏点目标格自动寻路
   ========================================================================== */
(function () {
  'use strict';

  var DIFF = {
    easy:   { n: 13, time: 90, mult: 0.8,  label: '轻松 13×13' },
    normal: { n: 17, time: 75, mult: 1.0,  label: '标准 17×17' },
    hard:   { n: 21, time: 60, mult: 1.3,  label: '困难 21×21' }
  };
  /* 墙位掩码：上1 右2 下4 左8 */
  var DIRS = [
    { dx: 0, dy: -1, w: 1, o: 4, k: 'up' },
    { dx: 1, dy: 0, w: 2, o: 8, k: 'right' },
    { dx: 0, dy: 1, w: 4, o: 1, k: 'down' },
    { dx: -1, dy: 0, w: 8, o: 2, k: 'left' }
  ];

  GameKit.register({
    id: 'maze',
    name: { zh: '迷宫逃脱', en: 'Maze Escape' },
    desc: { zh: '深入回溯迷宫，集齐 3 把黄金钥匙，赶在倒计时归零前冲向出口！路越短、走得越快，得分越高。迷路可点击目标自动寻路。', en: 'Dive into a perfect maze, collect 3 golden keys and reach the exit before time runs out! Fewer steps and faster runs score higher.' },
    genre: { zh: '益智解谜', en: 'Brain' },
    icon: '🗝️', hue: '#d97706',
    tags: [{ zh: '解谜', en: 'Puzzle' }, { zh: '限时', en: 'Timed' }],
    plays: 5000, hot: false, isNew: true, sound: 'calm',
    script: 'assets/js/games/maze.js',
    ratio: 'portrait', duration: '1-3 分钟',
    logical: { w: 560, h: 700 },
    touchControls: ['up', 'down', 'left', 'right'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!DIFF[diff]) diff = 'normal';
      var cfg = DIFF[diff];

      var n = cfg.n;
      var CELL = Math.floor(520 / n);
      var MX = Math.round((W - n * CELL) / 2), MY = 128;
      var walls, px, py, keys, keyCells, exitCell, steps, timeLeft;
      var won, lost, over, finished, autoPath, autoT, prev, hint, hintT;

      function idx(x, y) { return y * n + x; }
      function reset() {
        walls = [];
        var i, x, y, d;
        for (i = 0; i < n * n; i++) walls.push(15);
        /* 递归回溯挖墙 */
        var stack = [[0, 0]], seen = {};
        seen[idx(0, 0)] = true;
        while (stack.length) {
          var cur = stack[stack.length - 1];
          var cands = [];
          for (d = 0; d < 4; d++) {
            var nx = cur[0] + DIRS[d].dx, ny = cur[1] + DIRS[d].dy;
            if (nx >= 0 && nx < n && ny >= 0 && ny < n && !seen[idx(nx, ny)]) cands.push(d);
          }
          if (!cands.length) { stack.pop(); continue; }
          d = cands[Math.floor(Math.random() * cands.length)];
          var qx = cur[0] + DIRS[d].dx, qy = cur[1] + DIRS[d].dy;
          walls[idx(cur[0], cur[1])] &= ~DIRS[d].w;
          walls[idx(qx, qy)] &= ~DIRS[d].o;
          seen[idx(qx, qy)] = true;
          stack.push([qx, qy]);
        }
        /* 加几个环路让迷宫不那么「一条道」 */
        for (i = 0; i < Math.floor(n * n * 0.03); i++) {
          x = 1 + Math.floor(Math.random() * (n - 2));
          y = 1 + Math.floor(Math.random() * (n - 2));
          d = Math.floor(Math.random() * 4);
          var ax = x + DIRS[d].dx, ay = y + DIRS[d].dy;
          if (ax >= 0 && ax < n && ay >= 0 && ay < n) {
            walls[idx(x, y)] &= ~DIRS[d].w;
            walls[idx(ax, ay)] &= ~DIRS[d].o;
          }
        }
        px = 0; py = 0;
        steps = 0; timeLeft = cfg.time;
        won = false; lost = false; over = false; finished = false;
        autoPath = null; autoT = 0; hint = ''; hintT = 0;
        prev = { up: false, down: false, left: false, right: false };
        placeKeys();
        syncHud();
      }
      /* 钥匙放 BFS 远端死区：距起点排序后取前 40% 内随机三点 */
      function placeKeys() {
        var dist = bfsDist(0, 0), i, cand = [];
        for (i = 0; i < n * n; i++) if (dist[i] > n) cand.push(i);
        cand.sort(function (a, b) { return dist[b] - dist[a]; });
        cand = cand.slice(0, Math.max(6, Math.floor(cand.length * 0.4)));
        keyCells = [];
        var pool = cand.slice();
        while (keyCells.length < 3 && pool.length) {
          var pick = Math.floor(Math.random() * pool.length);
          keyCells.push(pool.splice(pick, 1)[0]);
        }
        while (keyCells.length < 3) keyCells.push(n * n - 1 - keyCells.length);
        keys = 0;
        exitCell = idx(n - 1, n - 1);
      }
      function bfsDist(sx, sy) {
        var dist = [], q = [[sx, sy]], i;
        for (i = 0; i < n * n; i++) dist.push(-1);
        dist[idx(sx, sy)] = 0;
        while (q.length) {
          var c = q.shift(), d;
          for (d = 0; d < 4; d++) {
            if (walls[idx(c[0], c[1])] & DIRS[d].w) continue;
            var nx = c[0] + DIRS[d].dx, ny = c[1] + DIRS[d].dy;
            if (nx < 0 || nx >= n || ny < 0 || ny >= n || dist[idx(nx, ny)] >= 0) continue;
            dist[idx(nx, ny)] = dist[idx(c[0], c[1])] + 1;
            q.push([nx, ny]);
          }
        }
        return dist;
      }
      function neighbors(ci) {
        var r = [], d, x = ci % n, y = Math.floor(ci / n);
        for (d = 0; d < 4; d++) {
          if (walls[ci] & DIRS[d].w) continue;
          var nx = x + DIRS[d].dx, ny = y + DIRS[d].dy;
          if (nx >= 0 && nx < n && ny >= 0 && ny < n) r.push(idx(nx, ny));
        }
        return r;
      }
      /* 从当前格到目标的 BFS 路径（方向序列） */
      function pathTo(tx, ty) {
        var start = idx(px, py), goal = idx(tx, ty);
        if (start === goal) return [];
        var from = {}, q = [start], seen = {};
        seen[start] = true;
        while (q.length) {
          var c = q.shift(), nb = neighbors(c), i;
          for (i = 0; i < nb.length; i++) {
            if (seen[nb[i]]) continue;
            seen[nb[i]] = true;
            from[nb[i]] = c;
            if (nb[i] === goal) {
              var path = [], cur = goal;
              while (cur !== start) {
                var prevC = from[cur];
                var dx = (cur % n) - (prevC % n), dy = Math.floor(cur / n) - Math.floor(prevC / n);
                var d;
                for (d = 0; d < 4; d++) if (DIRS[d].dx === dx && DIRS[d].dy === dy) path.unshift(DIRS[d].k);
                cur = prevC;
              }
              return path;
            }
            q.push(nb[i]);
          }
        }
        return null;
      }
      /* 规划：依次去最近钥匙，最后去出口 */
      function plan() {
        var dirs = [], sx = px, sy = py, remain = keyCells.slice(), guard = 0;
        while (remain.length && guard++ < 10) {
          var best = null, bestPath = null, i;
          for (i = 0; i < remain.length; i++) {
            var p = bfsPath(sx, sy, remain[i] % n, Math.floor(remain[i] / n));
            if (p && (!bestPath || p.length < bestPath.length)) { best = remain[i]; bestPath = p; }
          }
          if (!bestPath) break;
          dirs = dirs.concat(bestPath);
          sx = best % n; sy = Math.floor(best / n);
          remain.splice(remain.indexOf(best), 1);
        }
        var last = bfsPath(sx, sy, n - 1, n - 1);
        if (!last) return null;
        return dirs.concat(last);
      }
      function bfsPath(sx, sy, tx, ty) {
        var start = idx(sx, sy), goal = idx(tx, ty);
        if (start === goal) return [];
        var from = {}, q = [start], seen = {};
        seen[start] = true;
        while (q.length) {
          var c = q.shift(), nb = neighbors(c), i;
          for (i = 0; i < nb.length; i++) {
            if (seen[nb[i]]) continue;
            seen[nb[i]] = true;
            from[nb[i]] = c;
            if (nb[i] === goal) {
              var path = [], cur = goal;
              while (cur !== start) {
                var p = from[cur];
                var dx = (cur % n) - (p % n), dy = Math.floor(cur / n) - Math.floor(p / n);
                var d;
                for (d = 0; d < 4; d++) if (DIRS[d].dx === dx && DIRS[d].dy === dy) path.unshift(DIRS[d].k);
                cur = p;
              }
              return path;
            }
            q.push(nb[i]);
          }
        }
        return null;
      }
      function syncHud() {
        env.hud({
          score: 0, lives: 0, level: keys,
          extra: cfg.label + ' · 🔑 ' + keys + '/3 · ' + Math.ceil(timeLeft) + 's'
        });
      }
      function step(k) {
        if (over || won || lost) return false;
        var ci = idx(px, py), d, moved = false;
        for (d = 0; d < 4; d++) {
          if (DIRS[d].k !== k) continue;
          if (walls[ci] & DIRS[d].w) return false;
          px += DIRS[d].dx; py += DIRS[d].dy;
          moved = true;
          break;
        }
        if (!moved) return false;
        steps++;
        var here = idx(px, py);
        var ki = keyCells.indexOf(here);
        if (ki >= 0) {
          keys++;
          keyCells.splice(ki, 1);
          sfx.play('coin');
          hint = '捡到钥匙 ' + keys + '/3！'; hintT = 1.6;
          if (keys === 3) { hint = '钥匙集齐！出口已开启！'; hintT = 2.4; sfx.play('powerup'); }
        } else {
          sfx.play('click');
        }
        if (here === exitCell) {
          if (keys >= 3) finish(true);
          else { hint = '还差 ' + (3 - keys) + ' 把钥匙才能开门！'; hintT = 1.6; sfx.play('back'); }
        }
        syncHud();
        return true;
      }
      function finish(win) {
        if (finished) return;
        finished = true;
        won = !!win; lost = !win; over = true;
        var sc = win ? Math.max(100, Math.round((800 + timeLeft * 12 - steps * 3) * cfg.mult)) : 0;
        env.gameOver({
          win: win,
          score: sc,
          level: keys,
          extra: win ? cfg.label + ' · ' + steps + ' 步 · 剩 ' + Math.ceil(timeLeft) + 's' : '超时 · 集齐 ' + keys + '/3 把钥匙'
        });
      }

      /* ---- 输入 ---- */
      var unbindKey = env.onKey(function (e) {
        var c = e.code, d = null;
        if (c === 'ArrowUp' || c === 'KeyW') d = 'up';
        else if (c === 'ArrowDown' || c === 'KeyS') d = 'down';
        else if (c === 'ArrowLeft' || c === 'KeyA') d = 'left';
        else if (c === 'ArrowRight' || c === 'KeyD') d = 'right';
        if (d) {
          autoPath = null;
          step(d);
        }
      });
      function onPointer(e) {
        if (over) return;
        var p = env.pointer(e);
        var cx = Math.floor((p.x - MX) / CELL), cy = Math.floor((p.y - MY) / CELL);
        if (cx < 0 || cx >= n || cy < 0 || cy >= n) return;
        var path = bfsPath(px, py, cx, cy);
        if (path && path.length) {
          autoPath = path;
          autoT = 0;
          sfx.play('click');
        }
      }
      env.canvas.addEventListener('pointerdown', onPointer);

      function update(dt) {
        var i;
        if (over) return;
        timeLeft -= dt;
        if (hintT > 0) hintT -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          finish(false);
          syncHud();
          return;
        }
        /* pad 边沿立即 + 按住 0.13s 连走 */
        for (i = 0; i < 4; i++) {
          var k = DIRS[i].k;
          if (env.pad[k] && !prev[k]) {
            autoPath = null;
            step(k);
            prev[k] = true;
          } else if (!env.pad[k]) {
            prev[k] = false;
          }
        }
        var held = env.pad.up || env.pad.down || env.pad.left || env.pad.right;
        if (held) autoPath = null;
        /* 点击寻路：0.055s 一步自动走 */
        if (autoPath && autoPath.length) {
          autoT += dt;
          if (autoT > 0.055) {
            autoT = 0;
            if (!step(autoPath.shift())) autoPath = null;
          }
        } else if (autoPath) {
          autoPath = null;
        }
      }

      function render() {
        var i, x, y;
        ctx.fillStyle = '#171321'; ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fcd34d';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillText('🗝️ 迷宫逃脱', 280, 40);
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText(cfg.label + ' · 集齐 3 把钥匙 → 右下角出口 · 方向键或点击目标', 280, 66);

        /* 地板 */
        ctx.fillStyle = '#2a2140';
        ctx.fillRect(MX - 8, MY - 8, n * CELL + 16, n * CELL + 16);
        ctx.fillStyle = '#372b55';
        for (i = 0; i < n * n; i++) {
          ctx.fillRect(MX + (i % n) * CELL + 1, MY + Math.floor(i / n) * CELL + 1, CELL - 2, CELL - 2);
        }
        /* 钥匙 */
        for (i = 0; i < keyCells.length; i++) {
          x = MX + (keyCells[i] % n) * CELL + CELL / 2;
          y = MY + Math.floor(keyCells[i] / n) * CELL + CELL / 2;
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold ' + Math.round(CELL * 0.62) + 'px system-ui, sans-serif';
          ctx.fillText('🔑', x, y + 1);
        }
        /* 出口 */
        x = MX + (n - 1) * CELL + CELL / 2;
        y = MY + (n - 1) * CELL + CELL / 2;
        ctx.fillStyle = keys >= 3 ? '#2ee6a8' : '#6b7280';
        if (keys >= 3) {
          ctx.beginPath(); ctx.arc(x, y, CELL * 0.42, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#064e3b';
          ctx.font = 'bold ' + Math.round(CELL * 0.5) + 'px system-ui, sans-serif';
          ctx.fillText('出', x, y + 1);
        } else {
          ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, CELL * 0.4, 0, Math.PI * 2); ctx.stroke();
        }
        /* 墙 */
        ctx.strokeStyle = '#c4b5fd'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (i = 0; i < n * n; i++) {
          var wl = walls[i];
          x = MX + (i % n) * CELL; y = MY + Math.floor(i / n) * CELL;
          ctx.beginPath();
          if (wl & 1) { ctx.moveTo(x, y); ctx.lineTo(x + CELL, y); }
          if (wl & 2) { ctx.moveTo(x + CELL, y); ctx.lineTo(x + CELL, y + CELL); }
          if (wl & 4) { ctx.moveTo(x, y + CELL); ctx.lineTo(x + CELL, y + CELL); }
          if (wl & 8) { ctx.moveTo(x, y); ctx.lineTo(x, y + CELL); }
          ctx.stroke();
        }
        /* 玩家 */
        x = MX + px * CELL + CELL / 2;
        y = MY + py * CELL + CELL / 2;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath(); ctx.arc(x, y, CELL * 0.32, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0b1220';
        ctx.beginPath(); ctx.arc(x, y - 2, CELL * 0.1, 0, Math.PI * 2); ctx.fill();

        /* 底部信息 */
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.font = 'bold 16px system-ui, sans-serif';
        var danger = timeLeft < 15;
        ctx.fillStyle = danger ? '#f87171' : 'rgba(255,255,255,.75)';
        ctx.fillText('⏱ ' + Math.ceil(timeLeft) + 's · 🔑 ' + keys + '/3 · 步数 ' + steps, 280, MY + n * CELL + 40);
        if (hintT > 0 && hint) {
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 15px system-ui, sans-serif';
          ctx.fillText(hint, 280, MY + n * CELL + 68);
        }
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        state: function () {
          return { x: px, y: py, keys: keys, steps: steps, timeLeft: timeLeft, over: over, won: won, lost: lost, exit: [n - 1, n - 1], keyCells: keyCells.slice() };
        },
        move: function (k) { return step(k); },
        plan: function () { return plan(); },
        pathTo: function (tx, ty) { return bfsPath(px, py, tx, ty); },
        open: function (k) {
          var ci = idx(px, py), d;
          for (d = 0; d < 4; d++) if (DIRS[d].k === k) return !(walls[ci] & DIRS[d].w);
          return false;
        },
        cellAt: function (lx, ly) { return [Math.floor((lx - MX) / CELL), Math.floor((ly - MY) / CELL)]; },
        geom: function () { return { n: n, cell: CELL, mx: MX, my: MY }; },
        setTime: function (t) { timeLeft = t; }
      };

      return {
        start: function () { syncHud(); },
        restart: function () { reset(); },
        destroy: function () { unbindKey(); env.canvas.removeEventListener('pointerdown', onPointer); }
      };
    }
  });
})(window);
