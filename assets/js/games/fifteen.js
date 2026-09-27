/* ==========================================================================
   滑块拼图 15-Puzzle
   经典数字华容道 · 3×3 / 4×4 / 5×5 · 随机走步打乱（天然可解）
   输入：点击滑块 + 方向键/WASD/手柄（块滑动方向）· 步数与用时计分
   ========================================================================== */
(function () {
  'use strict';

  var DIFF = {
    easy:   { n: 3, steps: 40,  mult: 0.8,  label: '轻松 3×3' },
    normal: { n: 4, steps: 110, mult: 1.0,  label: '标准 4×4' },
    hard:   { n: 5, steps: 150, mult: 1.3,  label: '困难 5×5' }
  };

  GameKit.register({
    id: 'fifteen',
    name: { zh: '滑块拼图', en: '15-Puzzle' },
    desc: { zh: '百年经典数字华容道！滑动方块把数字排回 1→n 的顺序，空格是唯一的帮手。步数越少、用时越短，分数越高！', en: 'The century-old classic! Slide tiles to restore 1→n order using the single empty slot. Fewer moves and less time mean higher scores!' },
    genre: { zh: '益智解谜', en: 'Brain' },
    icon: '🧩', hue: '#7c3aed',
    tags: [{ zh: '益智', en: 'Puzzle' }, { zh: '经典', en: 'Classic' }],
    plays: 5000, hot: false, isNew: true, sound: 'calm',
    script: 'assets/js/games/fifteen.js',
    ratio: 'portrait', duration: '1-5 分钟',
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

      var n = cfg.n, total = n * n;
      var CS = n === 3 ? 128 : (n === 4 ? 104 : 84);
      var GX = Math.round((W - n * CS) / 2), GY = 150;
      var tiles, empty, moves, time, solved, finished, shuffles, lastSlideT, msg, msgT, prev, keyDirs;

      function reset() {
        tiles = [];
        for (var i = 0; i < total; i++) tiles.push((i + 1) % total);
        empty = total - 1;
        moves = 0; time = 0; solved = false; finished = false;
        lastSlideT = 0; msg = ''; msgT = 0;
        prev = { up: false, down: false, left: false, right: false };
        shuffle();
        syncHud();
      }
      function syncHud() {
        env.hud({
          score: 0, lives: 0, level: 1,
          extra: cfg.label + ' · 步数 ' + moves + ' · ' + Math.floor(time) + 's'
        });
      }

      function shuffle() {
        shuffles = [];
        var lastP = -1, k, cand, pick;
        for (k = 0; k < cfg.steps; k++) {
          cand = neighborsOf(empty).filter(function (p) { return p !== lastP; });
          pick = cand[Math.floor(Math.random() * cand.length)];
          shuffles.push({ p: pick, e: empty });
          tiles[empty] = tiles[pick];
          tiles[pick] = 0;
          lastP = empty;
          empty = pick;
        }
      }
      function neighborsOf(p) {
        var r = [], i;
        var x = p % n, y = Math.floor(p / n);
        if (x > 0) r.push(p - 1);
        if (x < n - 1) r.push(p + 1);
        if (y > 0) r.push(p - n);
        if (y < n - 1) r.push(p + n);
        return r;
      }
      /* 点击 idx：与空格相邻则滑入 */
      function slideAt(idx) {
        if (solved || finished) return false;
        var nb = neighborsOf(empty);
        for (var i = 0; i < nb.length; i++) {
          if (nb[i] === idx) {
            tiles[empty] = tiles[idx];
            tiles[idx] = 0;
            empty = idx;
            moves++;
            lastSlideT = time;
            sfx.play('click');
            checkWin();
            return true;
          }
        }
        return false;
      }
      /* dir: 'up' = 空格下方的块向上滑（块移动方向）；键盘/手柄统一 120ms 节流 */
      function slideDir(dir) {
        if (solved || finished) return;
        if (time - lastSlideT < 0.12) return;
        var x = empty % n, y = Math.floor(empty / n);
        var p = -1;
        if (dir === 'up' && y < n - 1) p = empty + n;
        else if (dir === 'down' && y > 0) p = empty - n;
        else if (dir === 'left' && x < n - 1) p = empty + 1;
        else if (dir === 'right' && x > 0) p = empty - 1;
        if (p >= 0) slideAt(p);
        else sfx.play('back');
      }
      function checkWin() {
        var i;
        for (i = 0; i < total - 1; i++) {
          if (tiles[i] !== i + 1) return;
        }
        solved = true;
        if (finished) return;
        finished = true;
        sfx.play('levelup');
        var sc = Math.max(100, Math.round((1200 - moves * 6 - time * 2) * cfg.mult));
        env.gameOver({
          win: true,
          score: sc,
          level: 1,
          extra: cfg.label + ' · ' + moves + ' 步 · ' + Math.floor(time) + ' 秒'
        });
      }

      /* ---- 输入 ---- */
      function onPointer(e) {
        if (solved || finished) return;
        var p = env.pointer(e);
        var c = Math.floor((p.x - GX) / CS), r = Math.floor((p.y - GY) / CS);
        if (c < 0 || c >= n || r < 0 || r >= n) return;
        slideAt(r * n + c);
      }
      env.canvas.addEventListener('pointerdown', onPointer);
      var unbindKey = env.onKey(function (e) {
        var c = e.code, d = null;
        if (c === 'ArrowUp' || c === 'KeyW') d = 'up';
        else if (c === 'ArrowDown' || c === 'KeyS') d = 'down';
        else if (c === 'ArrowLeft' || c === 'KeyA') d = 'left';
        else if (c === 'ArrowRight' || c === 'KeyD') d = 'right';
        if (d) { slideDir(d); }
      });

      function update(dt) {
        var i;
        if (solved || finished) return;
        time += dt;
        if (msgT > 0) msgT -= dt;
        /* pad 边沿 + 节流 */
        var dirs = ['up', 'down', 'left', 'right'];
        for (i = 0; i < 4; i++) {
          var d = dirs[i];
          if (env.pad[d] && !prev[d] && time - lastSlideT > 0.1) {
            slideDir(d);
            prev[d] = true;
          } else if (!env.pad[d]) {
            prev[d] = false;
          }
        }
      }

      function render() {
        var i, r, c;
        ctx.fillStyle = '#171321'; ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        ctx.fillStyle = '#c4b5fd';
        ctx.font = 'bold 24px system-ui, sans-serif';
        ctx.fillText('🧩 滑块拼图', 280, 44);
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText(cfg.label + ' · 点滑块或用方向键把数字排回顺序', 280, 72);

        /* 盘底 */
        ctx.fillStyle = '#2a2140';
        env.roundRect(GX - 10, GY - 10, n * CS + 20, n * CS + 20, 14); ctx.fill();

        for (i = 0; i < total; i++) {
          var v = tiles[i];
          if (v === 0) continue;
          var x = GX + (i % n) * CS, y = GY + Math.floor(i / n) * CS;
          var good = v === i + 1;
          ctx.fillStyle = good ? '#059669' : (v === empty + 1 ? '#7c3aed' : '#4c3a8f');
          env.roundRect(x + 4, y + 4, CS - 8, CS - 8, 10); ctx.fill();
          if (good) {
            ctx.strokeStyle = '#6ee7b7'; ctx.lineWidth = 2;
            env.roundRect(x + 4, y + 4, CS - 8, CS - 8, 10); ctx.stroke();
          }
          ctx.fillStyle = '#fff';
          ctx.font = 'bold ' + Math.round(CS * 0.4) + 'px Consolas, monospace';
          ctx.fillText('' + v, x + CS / 2, y + CS / 2 + 2);
        }

        /* 底部信息 */
        ctx.fillStyle = 'rgba(255,255,255,.65)';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText('步数 ' + moves + ' · 用时 ' + Math.floor(time) + 's · 归位 ' + correctCount() + '/' + (total - 1), 280, GY + n * CS + 44);
        if (msgT > 0 && msg) {
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 15px system-ui, sans-serif';
          ctx.fillText(msg, 280, GY + n * CS + 76);
        }
      }
      function correctCount() {
        var c = 0;
        for (var i = 0; i < total - 1; i++) if (tiles[i] === i + 1) c++;
        return c;
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        state: function () {
          return { tiles: tiles.slice(), empty: empty, moves: moves, time: Math.floor(time), solved: solved, correct: correctCount() };
        },
        shuffles: function () { return shuffles.map(function (m) { return { p: m.p, e: m.e }; }); },
        slide: function (i) { return slideAt(i); },
        dir: function (d) { slideDir(d); }
      };

      return {
        start: function () { syncHud(); },
        restart: function () { reset(); },
        destroy: function () {
          unbindKey();
          env.canvas.removeEventListener('pointerdown', onPointer);
        }
      };
    }
  });
})(window);
