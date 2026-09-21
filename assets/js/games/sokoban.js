/* ==========================================================================
   推箱子 Sokoban
   5 关渐进 · 撤销(Z) · 步数/推动计分 · 键盘方向键 + 触屏滑动/虚拟手柄
   ========================================================================== */
(function () {
  'use strict';

  /* # 墙  . 目标  $ 箱  * 箱在目标  @ 玩家  空格 地板 */
  var LEVELS = [
    {
      name: '入门',
      map: [
        '#####',
        '#@$.#',
        '#####'
      ]
    },
    {
      name: '双箱',
      map: [
        '######',
        '#@ $.#',
        '######'
      ]
    },
    {
      name: '两路',
      map: [
        '#######',
        '#     #',
        '# $ . #',
        '# @   #',
        '# $ . #',
        '#     #',
        '#######'
      ]
    },
    {
      name: '转弯',
      map: [
        '#######',
        '#.    #',
        '#  $  #',
        '#  @  #',
        '#  $  #',
        '#.    #',
        '#######'
      ]
    },
    {
      name: '四方',
      map: [
        '########',
        '# .  . #',
        '#      #',
        '# $$$$ #',
        '#      #',
        '#      #',
        '# .  . #',
        '#  @   #',
        '########'
      ]
    }
  ];

  GameKit.register({
    id: 'sokoban',
    name: { zh: '推箱子', en: 'Sokoban' },
    desc: { zh: '经典推箱子 5 关：把所有箱子推到目标点。箱子只能推不能拉，卡死角可按 Z 撤销。步数越少分越高，通关全部 5 关！', en: 'Classic Sokoban, 5 levels: push all crates onto goals. Boxes can only be pushed — use Z to undo. Fewer moves, higher score!' },
    genre: { zh: '益智经典', en: 'Puzzle' },
    icon: '📦', hue: '#b45309',
    logical: { w: 560, h: 700 },
    plays: 5000, hot: false, isNew: true, sound: 'calm',
    script: 'assets/js/games/sokoban.js',
    ratio: 'portrait', duration: '3-10 分钟',
    touchControls: ['up', 'down', 'left', 'right', 'b'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var LV = LEVELS;

      var li, walls, goals, boxes, player, moves, pushes, totalScore, undoStack, won, allDone, swipe;

      function parse(idx) {
        var m = LV[idx].map;
        walls = []; goals = []; boxes = [];
        for (var r = 0; r < m.length; r++) {
          walls.push([]);
          for (var c = 0; c < m[r].length; c++) {
            var ch = m[r][c];
            walls[r].push(ch === '#' ? 1 : 0);
            if (ch === '.' || ch === '*' || ch === '+') goals.push({ r: r, c: c });
            if (ch === '$' || ch === '*') boxes.push({ r: r, c: c });
            if (ch === '@' || ch === '+') player = { r: r, c: c };
          }
        }
      }

      function isGoal(r, c) {
        for (var i = 0; i < goals.length; i++) if (goals[i].r === r && goals[i].c === c) return true;
        return false;
      }
      function boxAt(r, c) {
        for (var i = 0; i < boxes.length; i++) if (boxes[i].r === r && boxes[i].c === c) return i;
        return -1;
      }
      function isWall(r, c) {
        return r < 0 || r >= walls.length || c < 0 || c >= walls[r].length || walls[r][c] === 1;
      }
      function onGoalCount() {
        var n = 0;
        for (var i = 0; i < boxes.length; i++) if (isGoal(boxes[i].r, boxes[i].c)) n++;
        return n;
      }

      function loadLevel(idx) {
        li = idx;
        parse(idx);
        moves = 0; pushes = 0; undoStack = []; won = false; allDone = false;
        env.hud({ score: totalScore, lives: 1, level: li + 1, extra: '第 ' + (li + 1) + ' 关 · ' + LV[li].name });
      }

      function reset() {
        totalScore = 0;
        loadLevel(0);
      }

      function snapshot() {
        undoStack.push({
          boxes: boxes.map(function (b) { return { r: b.r, c: b.c }; }),
          player: { r: player.r, c: player.c },
          moves: moves, pushes: pushes
        });
        if (undoStack.length > 300) undoStack.shift();
      }

      function tryMove(dr, dc) {
        if (won || allDone) return;
        var nr = player.r + dr, nc = player.c + dc;
        if (isWall(nr, nc)) return;
        var bi = boxAt(nr, nc);
        if (bi >= 0) {
          var br = nr + dr, bc = nc + dc;
          if (isWall(br, bc) || boxAt(br, bc) >= 0) { sfx.play('block'); return; }
          snapshot();
          boxes[bi].r = br; boxes[bi].c = bc;
          pushes++;
          sfx.play('land');
        } else {
          snapshot();
          sfx.play('select');
        }
        player.r = nr; player.c = nc;
        moves++;

        if (onGoalCount() === boxes.length) {
          won = true;
          var bonus = Math.max(100, 1200 - moves * 8) + li * 200;
          totalScore += 500 + bonus;
          sfx.play('levelup');
          if (li + 1 >= LV.length) {
            allDone = true;
            sfx.play('win');
            env.gameOver({ score: totalScore, detail: '5 关全通 · ' + moves + ' 步/关均 ' + Math.round(totalScore / LV.length) + ' 分' });
          } else {
            setTimeout(function () { if (won) loadLevel(li + 1); }, 900);
          }
          env.hud({ score: totalScore, level: li + 1 });
        }
      }

      function undo() {
        if (!undoStack.length || won) return;
        var s = undoStack.pop();
        boxes = s.boxes.map(function (b) { return { r: b.r, c: b.c }; });
        player = { r: s.player.r, c: s.player.c };
        moves = s.moves; pushes = s.pushes;
        sfx.play('rotate');
      }

      function update(dt) {
        var act = null;
        if (env.pad.up && !prev.up) act = 'up';
        else if (env.pad.down && !prev.down) act = 'down';
        else if (env.pad.left && !prev.left) act = 'left';
        else if (env.pad.right && !prev.right) act = 'right';
        if (env.pad.b && !prev.b) undo();
        prev.up = env.pad.up; prev.down = env.pad.down;
        prev.left = env.pad.left; prev.right = env.pad.right; prev.b = env.pad.b;
        if (act === 'up') tryMove(-1, 0);
        else if (act === 'down') tryMove(1, 0);
        else if (act === 'left') tryMove(0, -1);
        else if (act === 'right') tryMove(0, 1);
      }

      var prev = {};
      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down') return;
        var K = e.code;
        if (K === 'ArrowUp' || K === 'KeyW') { tryMove(-1, 0); e.preventDefault(); }
        else if (K === 'ArrowDown' || K === 'KeyS') { tryMove(1, 0); e.preventDefault(); }
        else if (K === 'ArrowLeft' || K === 'KeyA') { tryMove(0, -1); e.preventDefault(); }
        else if (K === 'ArrowRight' || K === 'KeyD') { tryMove(0, 1); e.preventDefault(); }
        else if (K === 'KeyZ' || K === 'Backspace') undo();
      });

      /* 触屏滑动 */
      env.canvas.addEventListener('pointerdown', function (e) {
        var p = env.pointer(e);
        swipe = { x: p.x, y: p.y };
      });
      env.canvas.addEventListener('pointerup', function (e) {
        if (!swipe) return;
        var p = env.pointer(e);
        var dx = p.x - swipe.x, dy = p.y - swipe.y;
        swipe = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) tryMove(0, dx > 0 ? 1 : -1);
        else tryMove(dy > 0 ? 1 : -1, 0);
      });

      /* ---------- 渲染 ---------- */
      function geo() {
        var rows = walls.length, cols = walls[0].length;
        var cell = Math.min(Math.floor((W - 48) / cols), Math.floor((H - 210) / rows));
        return { rows: rows, cols: cols, cell: cell, gx: (W - cols * cell) / 2, gy: 210 + (H - 210 - rows * cell) / 2 };
      }

      function render() {
        var g = geo(), cs = g.cell, i, j;
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#f6efe2'); bg.addColorStop(1, '#eadfc8');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        /* 地板 */
        ctx.fillStyle = '#d9c9a3';
        for (i = 0; i < g.rows; i++) for (j = 0; j < g.cols; j++) {
          if (!walls[i][j]) ctx.fillRect(g.gx + j * cs, g.gy + i * cs, cs, cs);
        }
        /* 墙 */
        for (i = 0; i < g.rows; i++) for (j = 0; j < g.cols; j++) {
          if (!walls[i][j]) continue;
          var wx = g.gx + j * cs, wy = g.gy + i * cs;
          ctx.fillStyle = '#8a6f4d';
          ctx.fillRect(wx, wy, cs, cs);
          ctx.fillStyle = 'rgba(255,255,255,.14)';
          ctx.fillRect(wx, wy, cs, cs * 0.35);
          ctx.strokeStyle = 'rgba(60,42,22,.5)'; ctx.lineWidth = 1;
          ctx.strokeRect(wx + 0.5, wy + 0.5, cs - 1, cs - 1);
        }
        /* 目标 */
        for (i = 0; i < goals.length; i++) {
          var txx = g.gx + goals[i].c * cs, tyy = g.gy + goals[i].r * cs;
          ctx.strokeStyle = 'rgba(180,83,9,.75)'; ctx.lineWidth = Math.max(2, cs * 0.08);
          ctx.beginPath();
          ctx.arc(txx + cs / 2, tyy + cs / 2, cs * 0.26, 0, 7);
          ctx.stroke();
        }
        /* 箱子 */
        for (i = 0; i < boxes.length; i++) {
          var b = boxes[i];
          var bx = g.gx + b.c * cs, by = g.gy + b.r * cs;
          var on = isGoal(b.r, b.c);
          ctx.fillStyle = on ? '#d98324' : '#a8763e';
          env.roundRect(bx + cs * 0.1, by + cs * 0.1, cs * 0.8, cs * 0.8, cs * 0.12); ctx.fill();
          ctx.strokeStyle = on ? '#8a4d0b' : '#6e4a24'; ctx.lineWidth = 2;
          env.roundRect(bx + cs * 0.1, by + cs * 0.1, cs * 0.8, cs * 0.8, cs * 0.12); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(bx + cs * 0.1, by + cs * 0.1); ctx.lineTo(bx + cs * 0.9, by + cs * 0.9);
          ctx.moveTo(bx + cs * 0.9, by + cs * 0.1); ctx.lineTo(bx + cs * 0.1, by + cs * 0.9);
          ctx.stroke();
        }
        /* 玩家 */
        var px = g.gx + player.c * cs, py = g.gy + player.r * cs;
        ctx.fillStyle = '#2b6cb0';
        ctx.beginPath(); ctx.arc(px + cs / 2, py + cs / 2, cs * 0.32, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.arc(px + cs * 0.42, py + cs * 0.44, cs * 0.06, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(px + cs * 0.58, py + cs * 0.44, cs * 0.06, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px + cs / 2, py + cs * 0.56, cs * 0.13, 0.15, Math.PI - 0.15); ctx.stroke();

        if (won && !allDone) {
          ctx.fillStyle = 'rgba(255,255,255,.85)';
          env.roundRect(W / 2 - 150, H / 2 - 40, 300, 80, 14); ctx.fill();
          ctx.fillStyle = '#b45309'; ctx.textAlign = 'center'; ctx.font = 'bold 22px system-ui';
          ctx.fillText('通过！进入下一关…', W / 2, H / 2 + 8);
        }

        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(80,55,20,.65)'; ctx.font = '13px system-ui';
        ctx.fillText('得分', 24, 34);
        ctx.fillStyle = '#4a2f10'; ctx.font = 'bold 28px Consolas, monospace';
        ctx.fillText(String(totalScore), 24, 66);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(80,55,20,.65)'; ctx.font = '13px system-ui';
        ctx.fillText('第 ' + (li + 1) + '/' + LV.length + ' 关 · ' + LV[li].name, W - 24, 34);
        ctx.fillStyle = '#4a2f10'; ctx.font = 'bold 28px Consolas, monospace';
        ctx.fillText('步 ' + moves + ' / 推 ' + pushes, W - 24, 66);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(80,55,20,.55)'; ctx.font = '13px system-ui';
        ctx.fillText('方向键移动 · Z 撤销 · 触屏滑动', W / 2, 108);
      }

      reset();

      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        move: tryMove, undo: undo,
        state: function () { return { li: li, moves: moves, totalScore: totalScore, on: onGoalCount(), boxes: boxes.length, allDone: allDone }; },
        levelData: function () { return LV.map(function (l) { return l.map; }); },
        player: function () { return { r: player.r, c: player.c }; }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 1, level: 1, extra: '第 1 关 · ' + LV[0].name });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
