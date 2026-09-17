/* ==========================================================================
   宝石消除 Gem Crush —— 交换相邻宝石，三连即消，连锁爆发加成
   键盘：方向键移动光标，Space/J/Enter 选中→再按方向交换；触屏：点选/滑动
   30 步内冲击最高分，连锁倍率越滚越高
   ========================================================================== */
(function () {
  'use strict';

  var N = 8, CELL = 56, OX = 56, OY = 126, W = 560, H = 700;
  var MOVES = 30;
  var GLYPH = ['◆', '●', '■', '▲', '★', '✚'];
  var COLORS = ['#ff5d73', '#ffc93c', '#3ec6ff', '#4ade80', '#c084fc', '#ff9f43'];

  /* 难度：读运营后台/本地配置，缺省 normal */
  function readDifficulty() {
    try {
      var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
      return (gc && gc.difficulty) || 'normal';
    } catch (e) { return 'normal'; }
  }
  function diffLabel(d) { return d === 'easy' ? '简单' : (d === 'hard' ? '困难' : '普通'); }

  GameKit.register({
    id: 'gem',
    name: { zh: '宝石消除', en: 'Gem Crush' },
    desc: { zh: '三消经典：交换相邻宝石凑成三连，连锁爆发倍率飙升，30 步内冲击最高分。', en: 'Swap adjacent gems to match 3+. Chain cascades for huge multipliers in 30 moves.' },
    genre: { zh: '益智消除', en: 'Match-3' },
    icon: '💎', hue: '#c084fc',
    logical: { w: 560, h: 700 },
    hot: false, isNew: true, sound: 'calm',
    touchControls: ['left', 'right', 'up', 'down', 'a'],
    controls: {
      keyboard: [
        { k: '↑ ↓ ← →', zh: '移动光标', en: 'Move cursor' },
        { k: 'Space / J / Enter', zh: '选中 / 交换', en: 'Select / swap' },
        { k: '滑动或点选', zh: '触屏交换相邻宝石', en: 'Swipe or tap gems' }
      ],
      touch: [{ k: '点选两颗 / 滑动', zh: '交换相邻宝石', en: 'Tap two gems or swipe' }]
    },

    create: function (env) {
      var W2 = env.W, H2 = env.H, ctx = env.ctx, sfx = env.sfx;
      var g, sel, cursor, moves, score, combo, phase, popT, over, started;
      var parts, floats, dragCell, dragPos, pointerDown, prev, shakeT, clearedTotal, unbindKey;
      var maxMoves = MOVES;

      function cellX(c) { return OX + c * CELL + CELL / 2; }
      function cellY(r) { return OY + r * CELL + CELL / 2; }

      function runAt(r, c) {
        var t = g[r][c].t, k, len = 1;
        for (k = c - 1; k >= 0 && g[r][k] && g[r][k].t === t; k--) len++;
        for (k = c + 1; k < N && g[r][k] && g[r][k].t === t; k++) len++;
        if (len >= 3) return true;
        len = 1;
        for (k = r - 1; k >= 0 && g[k][c] && g[k][c].t === t; k--) len++;
        for (k = r + 1; k < N && g[k][c] && g[k][c].t === t; k++) len++;
        return len >= 3;
      }

      function newGem(r, c) {
        var t, guard = 0;
        do {
          t = Math.floor(Math.random() * COLORS.length);
          g[r][c] = { t: t, dy: 0, pop: -1, shake: 0 };
          guard++;
        } while (runAt(r, c) && guard < 40);
      }

      function fill() {
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) newGem(r, c);
      }

      function syncHud(extra) {
        env.hud({ score: score, lives: 1, level: 1, extra: extra || ('步数 ' + moves + ' / ' + maxMoves + ' · 难度' + diffLabel(readDifficulty())) });
      }

      function reset() {
        g = []; for (var r = 0; r < N; r++) { g.push([]); }
        fill();
        sel = null; cursor = { r: 3, c: 3 };
        var diff = readDifficulty();
        maxMoves = diff === 'easy' ? 40 : (diff === 'hard' ? 24 : MOVES);
        moves = maxMoves; score = 0; combo = 1;
        phase = 'idle'; popT = 0; over = false; started = false;
        parts = []; floats = []; dragCell = null; dragPos = null; pointerDown = false;
        prev = {}; shakeT = 0; clearedTotal = 0;
        syncHud();
      }

      /* ---------- 匹配 ---------- */
      function findMatches() {
        var marks = {}, groups = [], r, c, k, run;
        for (r = 0; r < N; r++) {
          run = 1;
          for (c = 1; c <= N; c++) {
            var same = c < N && g[r][c] && g[r][c - 1] && g[r][c].t === g[r][c - 1].t;
            if (same) { run++; continue; }
            if (run >= 3) {
              var grp = [];
              for (k = c - run; k < c; k++) { grp.push([r, k]); marks[r + ',' + k] = 1; }
              groups.push(grp);
            }
            run = 1;
          }
        }
        for (c = 0; c < N; c++) {
          run = 1;
          for (r = 1; r <= N; r++) {
            var same2 = r < N && g[r][c] && g[r - 1][c] && g[r][c].t === g[r - 1][c].t;
            if (same2) { run++; continue; }
            if (run >= 3) {
              var grp2 = [];
              for (k = r - run; k < r; k++) { grp2.push([k, c]); marks[k + ',' + c] = 1; }
              groups.push(grp2);
            }
            run = 1;
          }
        }
        var list = Object.keys(marks).map(function (s) {
          var p = s.split(','); return [Number(p[0]), Number(p[1])];
        });
        return { list: list, groups: groups };
      }

      function hasMoves() {
        var r, c, tmp;
        function trySwap(r1, c1, r2, c2) {
          if (!g[r1][c1] || !g[r2][c2]) return false;
          tmp = g[r1][c1]; g[r1][c1] = g[r2][c2]; g[r2][c2] = tmp;
          var ok = runAt(r1, c1) || runAt(r2, c2);
          tmp = g[r1][c1]; g[r1][c1] = g[r2][c2]; g[r2][c2] = tmp;
          return ok;
        }
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
          if (c < N - 1 && trySwap(r, c, r, c + 1)) return true;
          if (r < N - 1 && trySwap(r, c, r + 1, c)) return true;
        }
        return false;
      }

      function reshuffle() {
        var pool = [], r, c, guard = 0;
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) pool.push(g[r][c].t);
        do {
          for (var i = pool.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
          }
          var k = 0;
          for (r = 0; r < N; r++) for (c = 0; c < N; c++) g[r][c].t = pool[k++];
          guard++;
        } while (guard < 60 && (findMatches().list.length || !hasMoves()));
        floats.push({ x: W2 / 2, y: OY + N * CELL / 2, txt: '无可消除 · 重新洗牌', life: 1.4 });
        sfx.play('warn');
      }

      function burst(x, y, t) {
        for (var i = 0; i < 6; i++) {
          parts.push({
            x: x, y: y,
            vx: env.rand(-170, 170), vy: env.rand(-230, 40),
            life: env.rand(0.3, 0.6), c: COLORS[t]
          });
        }
      }

      function resolve(m) {
        var gain = 0;
        m.groups.forEach(function (grp) {
          var bonus = grp.length >= 5 ? 60 : (grp.length === 4 ? 25 : 0);
          gain += grp.length * 10 * combo + bonus;
        });
        m.list.forEach(function (p) {
          var cell = g[p[0]][p[1]];
          if (!cell || cell.pop >= 0) return;
          cell.pop = 0;
          burst(cellX(p[1]), cellY(p[0]), cell.t);
          clearedTotal++;
        });
        score += gain;
        floats.push({ x: cellX(m.list[0][1]), y: cellY(m.list[0][0]) - 14, txt: '+' + gain + (combo > 1 ? ' ×' + combo : ''), life: 1.1 });
        sfx.play(m.list.length > 4 || combo > 1 ? 'tetris' : 'clear');
        phase = 'pop'; popT = 0;
        syncHud();
      }

      function trySwap(r1, c1, r2, c2) {
        if (phase !== 'idle' || over) return;
        if (!g[r1][c1] || !g[r2][c2]) return;
        if (!started) { started = true; }
        var a = g[r1][c1], b = g[r2][c2];
        g[r1][c1] = b; g[r2][c2] = a;
        var m = findMatches();
        if (m.list.length) {
          moves--;
          combo = 1;
          sfx.play('select');
          resolve(m);
        } else {
          g[r1][c1] = a; g[r2][c2] = b;
          a.shake = 1; b.shake = 1;
          sfx.play('block');
        }
        syncHud();
      }

      function gravity() {
        var r, c;
        for (c = 0; c < N; c++) {
          var write = N - 1;
          for (r = N - 1; r >= 0; r--) {
            if (g[r][c]) {
              if (write !== r) {
                g[write][c] = g[r][c];
                g[write][c].dy = (write - r) * CELL;
                g[r][c] = null;
              }
              write--;
            }
          }
          for (r = write; r >= 0; r--) {
            var t = Math.floor(Math.random() * COLORS.length);
            g[r][c] = { t: t, dy: (r + 1) * CELL + CELL * 0.5, pop: -1, shake: 0 };
          }
        }
        phase = 'fall';
      }

      function afterIdle() {
        if (moves <= 0) {
          over = true;
          sfx.play('gameover');
          env.delay(function () {
            env.gameOver({ score: score, detail: maxMoves + ' 步消除 ' + clearedTotal + ' 颗宝石' });
          }, 500);
          return;
        }
        if (!hasMoves()) reshuffle();
      }

      /* ---------- 键盘一次性动作：onKey 直触发 + pad 边沿，90ms 冷却去重 ---------- */
      var lastMoveT = 0;
      function moveCursor(dr, dc) {
        if (phase !== 'idle') return;
        cursor.r = env.clamp(cursor.r + dr, 0, N - 1);
        cursor.c = env.clamp(cursor.c + dc, 0, N - 1);
        if (sel && (Math.abs(sel.r - cursor.r) + Math.abs(sel.c - cursor.c) === 1)) {
          trySwap(sel.r, sel.c, cursor.r, cursor.c);
          sel = null;
        } else {
          sfx.play('rotate');
        }
      }
      function actMove(dr, dc) {
        var t = performance.now();
        if (t - lastMoveT < 90) return;
        lastMoveT = t;
        moveCursor(dr, dc);
      }

      /* ---------- 主循环 ---------- */
      function update(dt) {
        shakeT += dt;

        /* 光标（pad 边沿） */
        if (env.pad.up && !prev.up) actMove(-1, 0);
        if (env.pad.down && !prev.down) actMove(1, 0);
        if (env.pad.left && !prev.left) actMove(0, -1);
        if (env.pad.right && !prev.right) actMove(0, 1);
        if (env.pad.a && !prev.a) doSelect();
        prev.up = env.pad.up; prev.down = env.pad.down;
        prev.left = env.pad.left; prev.right = env.pad.right; prev.a = env.pad.a;

        /* 消除动画 */
        if (phase === 'pop') {
          popT += dt;
          var allDone = true;
          for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
            var cell = g[r][c];
            if (cell && cell.pop >= 0) {
              cell.pop = Math.min(1, popT / 0.22);
              if (cell.pop < 1) allDone = false;
            }
          }
          if (allDone) {
            for (r = 0; r < N; r++) for (c = 0; c < N; c++)
              if (g[r][c] && g[r][c].pop >= 1) g[r][c] = null;
            gravity();
          }
        } else if (phase === 'fall') {
          var falling = false;
          for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
            var f = g[r][c];
            if (f && f.dy > 0) {
              f.dy = Math.max(0, f.dy - 1500 * dt);
              if (f.dy > 0) falling = true;
            }
          }
          if (!falling) {
            var m = findMatches();
            if (m.list.length) { combo++; resolve(m); }
            else {
              combo = 1; phase = 'idle';
              sfx.play('bounce');
              afterIdle();
            }
          }
        }

        /* 抖动衰减 */
        for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
          var s = g[r][c];
          if (s && s.shake > 0) s.shake = Math.max(0, s.shake - dt * 4);
        }

        for (var p = parts.length - 1; p >= 0; p--) {
          var q = parts[p];
          q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 560 * dt;
          if (q.life <= 0) parts.splice(p, 1);
        }
        for (var fl = floats.length - 1; fl >= 0; fl--) {
          floats[fl].life -= dt * 0.85;
          floats[fl].y -= 24 * dt;
          if (floats[fl].life <= 0) floats.splice(fl, 1);
        }
      }

      function doSelect() {
        if (phase !== 'idle' || over) return;
        var t = performance.now();
        if (t - (doSelect.last || 0) < 120) return;
        doSelect.last = t;
        if (!sel) {
          sel = { r: cursor.r, c: cursor.c };
          sfx.play('select');
        } else if (sel.r === cursor.r && sel.c === cursor.c) {
          sel = null;
          sfx.play('back');
        } else if (Math.abs(sel.r - cursor.r) + Math.abs(sel.c - cursor.c) === 1) {
          trySwap(sel.r, sel.c, cursor.r, cursor.c);
          sel = null;
        } else {
          sel = { r: cursor.r, c: cursor.c };
          sfx.play('select');
        }
      }

      /* ---------- 触屏 ---------- */
      function hitCell(p) {
        var c = Math.floor((p.x - OX) / CELL), r = Math.floor((p.y - OY) / CELL);
        if (r < 0 || r >= N || c < 0 || c >= N) return null;
        return { r: r, c: c };
      }

      /* ---------- 绘制 ---------- */
      function drawGem(x, y, t, scale) {
        scale = scale === undefined ? 1 : scale;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        var grd = ctx.createRadialGradient(-10, -12, 4, 0, 0, 26);
        grd.addColorStop(0, '#ffffff');
        grd.addColorStop(0.25, COLORS[t]);
        grd.addColorStop(1, 'rgba(0,0,0,.42)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.moveTo(0, -21); ctx.lineTo(19, -8); ctx.lineTo(12, 19); ctx.lineTo(-12, 19); ctx.lineTo(-19, -8);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        ctx.font = 'bold 20px system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(GLYPH[t], 0, 1);
        ctx.restore();
      }

      function render() {
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#140f2e'); bg.addColorStop(0.6, '#1d1442'); bg.addColorStop(1, '#251a52');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        /* 顶栏 */
        env.text('剩余步数 ' + moves, W / 2, 56, { font: 'bold 30px system-ui', color: '#fff', align: 'center', shadow: true });
        env.text(combo > 1 ? '连锁 ×' + combo : '三连消除 · 连锁加成', W / 2, 88, {
          font: '14px system-ui', color: combo > 1 ? '#ffc93c' : 'rgba(255,255,255,.45)', align: 'center'
        });

        /* 棋盘面板 */
        ctx.fillStyle = 'rgba(255,255,255,.04)';
        env.roundRect(OX - 12, OY - 12, N * CELL + 24, N * CELL + 24, 18); ctx.fill();
        ctx.strokeStyle = 'rgba(192,132,252,.3)'; ctx.lineWidth = 2;
        env.roundRect(OX - 12, OY - 12, N * CELL + 24, N * CELL + 24, 18); ctx.stroke();

        /* 格线 */
        ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
        for (var i = 0; i <= N; i++) {
          ctx.beginPath(); ctx.moveTo(OX + i * CELL, OY); ctx.lineTo(OX + i * CELL, OY + N * CELL); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(OX, OY + i * CELL); ctx.lineTo(OX + N * CELL, OY + i * CELL); ctx.stroke();
        }

        /* 宝石 */
        ctx.save();
        ctx.beginPath(); ctx.rect(OX - 12, OY - 12, N * CELL + 24, N * CELL + 24); ctx.clip();
        for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
          var cell = g[r][c];
          if (!cell) continue;
          var x = cellX(c) + (cell.shake > 0 ? Math.sin(shakeT * 45) * 4 * cell.shake : 0);
          var y = cellY(r) - cell.dy;
          if (cell.pop >= 0) drawGem(x, y, cell.t, 1 - cell.pop);
          else drawGem(x, y, cell.t, 1);
        }
        ctx.restore();

        /* 选中 / 光标 */
        if (sel) {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
          ctx.shadowColor = '#fff'; ctx.shadowBlur = 10;
          env.roundRect(OX + sel.c * CELL + 4, OY + sel.r * CELL + 4, CELL - 8, CELL - 8, 10); ctx.stroke();
          ctx.shadowBlur = 0;
        }
        ctx.strokeStyle = 'rgba(62,198,255,.9)'; ctx.lineWidth = 2.5;
        env.roundRect(OX + cursor.c * CELL + 3, OY + cursor.r * CELL + 3, CELL - 6, CELL - 6, 10); ctx.stroke();

        /* 粒子与飘字 */
        parts.forEach(function (q) {
          ctx.globalAlpha = Math.max(0, q.life * 1.7);
          ctx.fillStyle = q.c;
          ctx.fillRect(q.x - 3, q.y - 3, 6, 6);
        });
        ctx.globalAlpha = 1;
        floats.forEach(function (f) {
          ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
          env.text(f.txt, f.x, f.y, { font: 'bold 22px system-ui', color: '#fff', align: 'center', shadow: true });
        });
        ctx.globalAlpha = 1;

        if (!started && phase === 'idle') {
          var hint = 1 + Math.sin(shakeT * 3) * 0.05;
          ctx.save();
          ctx.translate(W / 2, OY + N * CELL + 52); ctx.scale(hint, hint);
          env.text('点选两颗相邻宝石 · 或滑动交换', 0, 0, { font: 'bold 18px system-ui', color: 'rgba(255,255,255,.85)', align: 'center' });
          env.text('方向键 + 空格 也可以玩', 0, 26, { font: '13px system-ui', color: 'rgba(255,255,255,.5)', align: 'center' });
          ctx.restore();
        }
      }

      reset();

      unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        switch (e.code) {
          case 'ArrowLeft': actMove(0, -1); break;
          case 'ArrowRight': actMove(0, 1); break;
          case 'ArrowUp': actMove(-1, 0); break;
          case 'ArrowDown': actMove(1, 0); break;
          case 'Enter': case 'NumpadEnter':
          case 'Space': case 'KeyJ': case 'KeyK':
            doSelect(); break;
        }
      });

      env.canvas.addEventListener('pointerdown', function (e) {
        if (over || phase !== 'idle') return;
        pointerDown = true;
        var p = env.pointer(e);
        var cell = hitCell(p);
        if (!cell) return;
        dragCell = cell; dragPos = p;
        cursor = { r: cell.r, c: cell.c };
        if (sel && Math.abs(sel.r - cell.r) + Math.abs(sel.c - cell.c) === 1) {
          trySwap(sel.r, sel.c, cell.r, cell.c);
          sel = null; dragCell = null;
        } else if (sel && sel.r === cell.r && sel.c === cell.c) {
          sel = null;
        } else {
          sel = { r: cell.r, c: cell.c };
          sfx.play('select');
        }
      });
      window.addEventListener('pointermove', function (e) {
        if (!pointerDown || !dragCell || over || phase !== 'idle') return;
        var p = env.pointer(e);
        var dx = p.x - dragPos.x, dy = p.y - dragPos.y;
        if (Math.abs(dx) < 22 && Math.abs(dy) < 22) return;
        var r2 = dragCell.r, c2 = dragCell.c;
        if (Math.abs(dx) > Math.abs(dy)) c2 += dx > 0 ? 1 : -1;
        else r2 += dy > 0 ? 1 : -1;
        if (r2 >= 0 && r2 < N && c2 >= 0 && c2 < N) {
          cursor = { r: r2, c: c2 };
          trySwap(dragCell.r, dragCell.c, r2, c2);
          sel = null;
        }
        dragCell = null;
      });
      window.addEventListener('pointerup', function () { pointerDown = false; dragCell = null; });

      env.loop(function (dt) {
        update(dt);
        render();
      });

      return {
        start: function () {
          sfx.play('start');
          syncHud('准备就绪 · 交换相邻宝石 · 难度' + diffLabel(readDifficulty()));
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); }
      };
    }
  });
})();
