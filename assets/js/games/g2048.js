/* ==========================================================================
   2048 数字合并 —— 经典 2048
   滑动合并 · 数字动画 · 最高分记录 · 键盘 / 触屏滑动
   ========================================================================== */
(function () {
  'use strict';

  var N = 4, GAP = 14, TILE = 112, MARGIN = 21, TOP = 96;

  var COLORS = {
    2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f',
    64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850',
    1024: '#edc53f', 2048: '#edc22e'
  };
  function tileColor(v) { return COLORS[v] || '#3c3a32'; }
  function textColor(v) { return v <= 4 ? '#776e65' : '#f9f6f2'; }
  function fontSize(v) { return v >= 1024 ? 30 : v >= 128 ? 38 : 46; }

  var DIRS = { left: { dx: -1, dy: 0 }, right: { dx: 1, dy: 0 }, up: { dx: 0, dy: -1 }, down: { dx: 0, dy: 1 } };
  function easeOut(t) { return 1 - Math.pow(1 - Math.min(1, t), 3); }

  GameKit.register({
    id: 'g2048',
    name: { zh: '2048 数字合并', en: '2048 Merge' },
    desc: { zh: '经典 2048：滑动合并相同数字，挑战 2048 方块。', en: 'Classic 2048: slide and merge numbers, reach the 2048 tile.' },
    genre: { zh: '益智休闲', en: 'Puzzle' },
    icon: '🔢', hue: '#ffb020',
    logical: { w: 560, h: 640 },
    hot: false, isNew: true, sound: 'calm',
    touchControls: ['left', 'right', 'up', 'down'],
    controls: {
      keyboard: [
        { k: '← → ↑ ↓ / WASD', zh: '滑动合并', en: 'Slide' },
        { k: '触屏滑动', zh: '滑动合并', en: 'Swipe to slide' }
      ],
      touch: [{ k: '滑动屏幕', zh: '滑动合并', en: 'Swipe' }]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;

      var grid, tiles, score, phase, phaseT, won, over, tAcc, nextId, dirCooldown, sw;

      function gp(g) { return MARGIN + g * (TILE + GAP); }

      function reset() {
        grid = []; tiles = [];
        for (var y = 0; y < N; y++) { var row = []; for (var x = 0; x < N; x++) row.push(null); grid.push(row); }
        score = 0; phase = 'idle'; phaseT = 0; won = false; over = false; tAcc = 0; nextId = 1;
        dirCooldown = 0; sw = false;
        spawn(); spawn();
        env.hud({ score: 0, lives: 1, level: 1, extra: '目标 2048' });
      }

      function addTile(gx, gy, v, pop) {
        var t = { id: nextId++, v: v, gx: gx, gy: gy, ogx: gx, ogy: gy, pop: pop ? 1 : 0 };
        grid[gy][gx] = t;
        tiles.push(t);
        return t;
      }

      function emptyCells() {
        var out = [];
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (!grid[y][x]) out.push({ x: x, y: y });
        return out;
      }
      function spawn() {
        var cells = emptyCells();
        if (!cells.length) return;
        var c = cells[Math.floor(Math.random() * cells.length)];
        addTile(c.x, c.y, Math.random() < 0.9 ? 2 : 4, true);
      }

      function lineCoords(D, i) {
        var arr = [];
        for (var k = 0; k < N; k++) arr.push(D.dx !== 0 ? { x: k, y: i } : { x: i, y: k });
        if (D.dx > 0 || D.dy > 0) arr.reverse();
        return arr;
      }
      function slotPos(D, i, slot) {
        if (D.dx > 0) return { x: N - 1 - slot, y: i };
        if (D.dx < 0) return { x: slot, y: i };
        if (D.dy > 0) return { x: i, y: N - 1 - slot };
        return { x: i, y: slot };
      }

      function maxTile() {
        var m = 0;
        tiles.forEach(function (t) { if (!t.dying) m = Math.max(m, t.v); });
        return m;
      }
      function canMove() {
        if (emptyCells().length) return true;
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
          var t = grid[y][x];
          if (!t) return true;
          if (x < N - 1 && grid[y][x + 1] && grid[y][x + 1].v === t.v) return true;
          if (y < N - 1 && grid[y + 1][x] && grid[y + 1][x].v === t.v) return true;
        }
        return false;
      }

      function move(dirName) {
        if (phase !== 'idle' || over) return;
        var D = DIRS[dirName], moved = false, gained = 0;

        for (var i = 0; i < N; i++) {
          var coords = lineCoords(D, i), list = [];
          coords.forEach(function (c) { var t = grid[c.y][c.x]; if (t) list.push(t); });

          var out = [];
          list.forEach(function (t) {
            var last = out[out.length - 1];
            if (last && last.v === t.v && !last.merged) {
              last.merged = true; last.v *= 2; gained += last.v;
              // 被吞并的方块：动画滑到目标格后消失
              var tgt = slotPos(D, i, last.slot);
              t.ogx = t.gx; t.ogy = t.gy; t.gx = tgt.x; t.gy = tgt.y; t.dying = true;
              grid[t.ogy][t.ogx] = null;
              if (last.tile) last.tile.mergedPop = 1;
              if (t.v * 2 === 2048 && !won) won = true;
            } else {
              out.push({ v: t.v, tile: t, slot: out.length, merged: false });
            }
          });

          for (var s = 0; s < out.length; s++) {
            var o = out[s], pos = slotPos(D, i, o.slot), tile = o.tile;
            tile.ogx = tile.gx; tile.ogy = tile.gy;
            if (grid[tile.gy][tile.gx] === tile) grid[tile.gy][tile.gx] = null;
            tile.gx = pos.x; tile.gy = pos.y; tile.v = o.v;
            grid[pos.y][pos.x] = tile;
            if (tile.ogx !== pos.x || tile.ogy !== pos.y) moved = true;
          }
        }

        if (!moved) {
          if (!canMove()) gameOver();
          return;
        }

        if (gained) { score += gained; sfx.play(gained >= 128 ? 'powerup' : 'eat'); }
        else sfx.play('rotate');

        phase = 'slide'; phaseT = 0;
        spawn();
        env.hud({ score: score, extra: '最大 ' + maxTile(), level: Math.max(1, Math.log2(Math.max(2, maxTile()))) });
        if (!canMove()) env.delay(function () { if (!over) gameOver(); }, 240);
      }

      function gameOver() {
        over = true; sfx.play('gameover');
        env.gameOver({ score: score, detail: '最大方块 ' + maxTile() });
      }

      function update(dt) {
        tAcc += dt;
        if (dirCooldown > 0) dirCooldown -= dt;
        if (phase === 'slide') {
          phaseT += dt / 0.11;
          if (phaseT >= 1) {
            phase = 'idle'; phaseT = 1;
            tiles = tiles.filter(function (t) { return !t.dying; });
          }
        }
        tiles.forEach(function (t) {
          if (t.pop > 0) t.pop = Math.max(0, t.pop - dt / 0.14);
          if (t.mergedPop > 0) t.mergedPop = Math.max(0, t.mergedPop - dt / 0.16);
        });
        if (over) return;

        if (env.pad.left) tryMove('left');
        else if (env.pad.right) tryMove('right');
        else if (env.pad.up) tryMove('up');
        else if (env.pad.down) tryMove('down');
      }

      function tryMove(d) {
        if (dirCooldown > 0 || phase !== 'idle') return;
        dirCooldown = 0.12;
        move(d);
      }

      function render() {
        var g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#141019'); g.addColorStop(1, '#241a2e');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = 'rgba(255,255,255,.07)';
        env.roundRect(MARGIN - GAP / 2, TOP - GAP / 2, N * TILE + (N + 1) * GAP, N * TILE + (N + 1) * GAP, 16); ctx.fill();
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
          ctx.fillStyle = 'rgba(255,255,255,.055)';
          env.roundRect(gp(x), TOP + y * (TILE + GAP), TILE, TILE, 10); ctx.fill();
        }

        var p = easeOut(phase === 'slide' ? phaseT : 1);
        tiles.forEach(function (tl) {
          if (!tl.dying && phase === 'idle') { tl.ogx = tl.gx; tl.ogy = tl.gy; }
          var x = tl.ogx + (tl.gx - tl.ogx) * (tl.dying ? p : p);
          var y = tl.ogy + (tl.gy - tl.ogy) * (tl.dying ? p : p);
          var px = gp(x), py = TOP + y * (TILE + GAP);
          var scale = 1;
          if (tl.pop > 0) scale = 0.4 + 0.6 * (1 - tl.pop) + Math.sin((1 - tl.pop) * 3.14) * 0.12;
          if (tl.mergedPop > 0) scale = 1 + Math.sin(tl.mergedPop * 3.14) * 0.16;

          ctx.save();
          ctx.globalAlpha = tl.dying ? Math.max(0, 1 - p) : 1;
          ctx.translate(px + TILE / 2, py + TILE / 2);
          ctx.scale(scale, scale);
          ctx.translate(-TILE / 2, -TILE / 2);
          if (tl.v >= 128) { ctx.shadowColor = tileColor(tl.v); ctx.shadowBlur = 22; }
          ctx.fillStyle = tileColor(tl.v);
          env.roundRect(0, 0, TILE, TILE, 10); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = textColor(tl.v);
          ctx.font = 'bold ' + fontSize(tl.v) + 'px system-ui';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(tl.v), TILE / 2, TILE / 2 + 2);
          ctx.restore();
        });

        ctx.fillStyle = 'rgba(6,12,24,.35)'; ctx.fillRect(0, 0, W, 78);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('得分', 24, 26);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Consolas, monospace';
        ctx.fillText(String(score), 24, 54);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('最大方块', W - 24, 26);
        ctx.fillStyle = '#ffd166'; ctx.font = 'bold 28px Consolas, monospace';
        ctx.fillText(String(maxTile()), W - 24, 54);

        if (won && !over) {
          ctx.textAlign = 'center'; ctx.fillStyle = '#ffd166'; ctx.font = 'bold 24px system-ui';
          ctx.shadowColor = 'rgba(255,209,102,.9)'; ctx.shadowBlur = 20;
          ctx.fillText('🎉 达成 2048！继续挑战更大数字', W / 2, TOP - 24);
          ctx.shadowBlur = 0;
        }
        if (over) {
          ctx.fillStyle = 'rgba(10,8,16,.75)';
          env.roundRect(MARGIN - GAP / 2, TOP - GAP / 2, N * TILE + (N + 1) * GAP, N * TILE + (N + 1) * GAP, 16); ctx.fill();
          ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 34px system-ui';
          ctx.fillText('无路可走', W / 2, TOP + 230);
          ctx.font = 'bold 20px system-ui'; ctx.fillStyle = '#ffd166';
          ctx.fillText('得分 ' + score, W / 2, TOP + 278);
        }
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      var sx = 0, sy = 0, skipNext = false;
      env.canvas.addEventListener('touchstart', function (e) {
        if (skipNext) { skipNext = false; return; }
        sw = true; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      }, { passive: true });
      env.canvas.addEventListener('touchmove', function (e) {
        if (!sw) return;
        var dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
        if (Math.abs(dx) > 26 || Math.abs(dy) > 26) {
          tryMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
          sw = false; skipNext = true;
        }
      }, { passive: true });
      env.canvas.addEventListener('touchend', function () { sw = false; }, { passive: true });

      return {
        start: function () { sfx.play('start'); },
        restart: function () { reset(); },
        destroy: function () { }
      };
    }
  });
})();
