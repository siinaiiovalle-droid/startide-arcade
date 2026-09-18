/* ==========================================================================
   坦克大战 Tank Battle —— 经典砖墙地形：消灭全部敌军坦克、逐波推进
   键盘：方向键/WASD 移动，Space/J 开火，Enter 同开火
   触屏：虚拟手柄移动 + A 键开火
   ========================================================================== */
(function () {
  'use strict';

  var CELL = 40, COLS = 14, ROWS = 17;      // 560 x 700
  var TANK = 36, OFF = 2;                   // 车体 36，格内偏移 2
  var EMPTY = 0, BRICK = 1, STEEL = 2;
  var DIRS = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }]; // 上右下左

  function readDifficulty() {
    try {
      var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
      return (gc && gc.difficulty) || 'normal';
    } catch (e) { return 'normal'; }
  }
  function diffLabel(d) { return d === 'easy' ? '简单' : (d === 'hard' ? '困难' : '普通'); }

  GameKit.register({
    id: 'tank',
    name: { zh: '坦克大战', en: 'Tank Battle' },
    desc: { zh: '经典坦克大战：砖墙可被打碎、钢墙挡子弹，逐波消灭敌军，波次越深火力越猛。', en: 'Classic tank battle. Blast brick walls, dodge steel, and wipe out enemy waves.' },
    genre: { zh: '射击对战', en: 'Shooter' },
    icon: '🪖', hue: '#ff5d73',
    logical: { w: 560, h: 700 },
    hot: false, isNew: true, sound: 'battle',
    touchControls: ['up', 'down', 'left', 'right', 'a'],
    controls: {
      keyboard: [
        { k: '↑↓←→ / WASD', zh: '移动（自动对齐网格）', en: 'Move (grid-snapped)' },
        { k: 'Space / J / Enter', zh: '开火', en: 'Fire' }
      ],
      touch: [{ k: '虚拟手柄', zh: '方向移动 + A 开火', en: 'D-pad move + A fire' }]
    },

    create: function (env) {
      var W2 = env.W, H2 = env.H, ctx = env.ctx, sfx = env.sfx;
      var grid, player, enemies, bullets, parts, floats;
      var score, lives, wave, toSpawn, spawnT, fireCool, state, over;
      var prev, invT, keyUnbind, waveBanner, shake;

      var cfg = { maxOnField: 4, enemySpeed: 74, enemyFire: 2.1, pSpeed: 168, pCool: 0.34 };
      function applyDifficulty() {
        var d = readDifficulty();
        if (d === 'easy') { cfg.maxOnField = 3; cfg.enemySpeed = 60; cfg.enemyFire = 2.6; cfg.pSpeed = 182; cfg.pCool = 0.28; }
        else if (d === 'hard') { cfg.maxOnField = 5; cfg.enemySpeed = 92; cfg.enemyFire = 1.6; cfg.pSpeed = 156; cfg.pCool = 0.42; }
        else { cfg.maxOnField = 4; cfg.enemySpeed = 74; cfg.enemyFire = 2.1; cfg.pSpeed = 168; cfg.pCool = 0.34; }
      }

      function inGrid(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS; }
      function cellAt(px, py) {
        var c = Math.floor(px / CELL), r = Math.floor(py / CELL);
        return inGrid(c, r) ? grid[r][c] : STEEL;
      }

      function buildTerrain() {
        grid = [];
        for (var r = 0; r < ROWS; r++) { grid.push([]); for (var c = 0; c < COLS; c++) grid[r].push(EMPTY); }
        var spawns = [[0, 0], [Math.floor(COLS / 2), 0], [COLS - 1, 0], [Math.floor(COLS / 2), ROWS - 1]];
        function clearAround(c, r) {
          for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
            if (inGrid(c + dc, r + dr)) grid[r + dr][c + dc] = EMPTY;
          }
        }
        spawns.forEach(function (s) { clearAround(s[0], s[1]); });
        for (var rr = 1; rr < ROWS - 1; rr++) {
          for (var cc = 0; cc < COLS; cc++) {
            if (grid[rr][cc] !== EMPTY) continue;
            if ((cc === 0 || cc === COLS - 1) && rr % 3 === 0) { grid[rr][cc] = BRICK; continue; }
            var v = Math.random();
            if (v < 0.16) grid[rr][cc] = BRICK;
            else if (v < 0.20) grid[rr][cc] = STEEL;
          }
        }
        spawns.forEach(function (s) { clearAround(s[0], s[1]); });
      }

      function spawnPos() {
        return { x: OFF, y: OFF, c: 0, r: 0 };
      }
      function lane(v) { return Math.round((v - OFF) / CELL) * CELL + OFF; }

      function makeTank(px, py, dir, isPlayer) {
        return {
          x: px, y: py, dir: dir, isPlayer: isPlayer,
          speed: isPlayer ? cfg.pSpeed : cfg.enemySpeed,
          cool: isPlayer ? 0 : 0.8 + Math.random(), moving: false
        };
      }

      function resetPlayer() {
        player = makeTank(lane(COLS / 2 * CELL), lane((ROWS - 1) * CELL), 0, true);
        invT = 1.6;
      }

      function rect(t) { return { x: t.x + 1, y: t.y + 1, w: TANK - 2, h: TANK - 2 }; }

      function hitsTerrain(t) {
        var r = rect(t);
        return cellAt(r.x, r.y) !== EMPTY || cellAt(r.x + r.w, r.y) !== EMPTY ||
               cellAt(r.x, r.y + r.h) !== EMPTY || cellAt(r.x + r.w, r.y + r.h) !== EMPTY;
      }
      function hitsTank(t, self) {
        var a = rect(t), list = enemies.concat([player]);
        for (var i = 0; i < list.length; i++) {
          var o = list[i]; if (!o || o === self) continue;
          var b = rect(o);
          if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) return o;
        }
        return null;
      }

      function moveTank(t, dt) {
        var d = DIRS[t.dir];
        var nx = t.x + d.x * t.speed * dt;
        var ny = t.y + d.y * t.speed * dt;
        var cand = { x: t.x, y: t.y, dir: t.dir, isPlayer: t.isPlayer, speed: t.speed };
        if (d.x !== 0) cand.y = lane(t.y); else cand.x = lane(t.x);
        cand.x = nx; cand.y = ny;
        cand.x = Math.max(OFF, Math.min(W2 - TANK - OFF, cand.x));
        cand.y = Math.max(OFF, Math.min(H2 - TANK - OFF, cand.y));
        var old = { x: t.x, y: t.y };
        t.x = cand.x; t.y = cand.y;
        cand.x = t.x; cand.y = t.y;
        if (hitsTerrain(t) || hitsTank(t, t)) { t.x = old.x; t.y = old.y; return false; }
        return true;
      }

      function turnTank(t, dir) {
        if (t.dir === dir) return;
        t.dir = dir;
        if (DIRS[dir].x !== 0) t.y = lane(t.y); else t.x = lane(t.x);
      }

      function fire(t) {
        var d = DIRS[t.dir];
        bullets.push({
          x: t.x + TANK / 2 + d.x * 20 - 3, y: t.y + TANK / 2 + d.y * 20 - 3,
          dir: t.dir, speed: t.isPlayer ? 430 : 300, fromPlayer: t.isPlayer
        });
        sfx.play(t.isPlayer ? 'shoot' : 'laser');
      }

      function explode(x, y, big) {
        sfx.play('explosion');
        for (var i = 0; i < (big ? 26 : 14); i++) {
          var a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * (big ? 260 : 160);
          parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.4 + Math.random() * 0.4, col: Math.random() < 0.5 ? '#ffcf5c' : '#ff5d73' });
        }
      }

      function syncHud(extra) {
        env.hud({
          score: score, lives: lives, level: wave,
          extra: extra || ('第 ' + wave + ' 波 · 敌军余 ' + (toSpawn + enemies.length) + ' · 难度' + diffLabel(readDifficulty()))
        });
      }

      function reset() {
        applyDifficulty();
        buildTerrain();
        enemies = []; bullets = []; parts = []; floats = [];
        score = 0; lives = 3; wave = 1; invT = 0;
        toSpawn = 5 + wave * 2; spawnT = 0.6; fireCool = 0; prev = {}; shake = 0;
        waveBanner = 2;
        resetPlayer();
        syncHud();
      }

      function playerDie() {
        if (invT > 0) return;
        explode(player.x + TANK / 2, player.y + TANK / 2, true);
        lives--;
        if (lives <= 0) {
          over = true;
          env.gameOver({ score: score, level: wave, detail: '坚持到第 ' + wave + ' 波' });
          return;
        }
        sfx.play('life');
        resetPlayer();
      }

      function update(dt) {
        var i, j;
        shake = Math.max(0, shake - dt * 3);
        invT = Math.max(0, invT - dt);
        if (waveBanner > 0) waveBanner -= dt;

        /* ---- 玩家 ---- */
        var want = -1;
        if (env.pad.up) want = 0; else if (env.pad.right) want = 1;
        else if (env.pad.down) want = 2; else if (env.pad.left) want = 3;
        if (want >= 0) { turnTank(player, want); moveTank(player, dt); }
        fireCool -= dt;
        if ((env.pad.a && !prev.a) && fireCool <= 0) { fire(player); fireCool = cfg.pCool; }
        prev.a = env.pad.a;

        /* ---- 敌军生成 ---- */
        if (toSpawn > 0 && enemies.length < cfg.maxOnField) {
          spawnT -= dt;
          if (spawnT <= 0) {
            var cols = [0, Math.floor(COLS / 2), COLS - 1];
            var sc = cols[Math.floor(Math.random() * 3)];
            enemies.push(makeTank(lane(sc * CELL), OFF, 2, false));
            toSpawn--; spawnT = Math.max(1.1, 2.4 - wave * 0.15);
          }
        }

        /* ---- 敌军 AI ---- */
        enemies.forEach(function (e) {
          e.cool -= dt;
          if (e.cool <= 0) {
            e.cool = 0.7 + Math.random() * 1.2;
            var dc = (player.x - e.x), dr = (player.y - e.y);
            var dir;
            if (Math.random() < 0.62) dir = Math.abs(dc) > Math.abs(dr) ? (dc > 0 ? 1 : 3) : (dr > 0 ? 2 : 0);
            else dir = Math.floor(Math.random() * 4);
            turnTank(e, dir);
            if (Math.random() < 0.55) fire(e);
          }
          if (!moveTank(e, dt)) {
            e.cool = Math.min(e.cool, 0.25); // 被挡住尽快换向
          }
        });

        /* ---- 子弹 ---- */
        for (i = bullets.length - 1; i >= 0; i--) {
          var b = bullets[i], d = DIRS[b.dir];
          b.x += d.x * b.speed * dt; b.y += d.y * b.speed * dt;
          if (b.x < 0 || b.y < 0 || b.x > W2 || b.y > H2) { bullets.splice(i, 1); continue; }
          /* 地形 */
          var hitCell = false;
          [[b.x, b.y], [b.x + 6, b.y], [b.x, b.y + 6], [b.x + 6, b.y + 6]].forEach(function (p) {
            var c = Math.floor(p[0] / CELL), r = Math.floor(p[1] / CELL);
            if (!inGrid(c, r)) return;
            if (grid[r][c] === BRICK) { grid[r][c] = EMPTY; hitCell = true; sfx.play('brick'); }
            else if (grid[r][c] === STEEL && !hitCell) { hitCell = true; sfx.play('block'); }
          });
          if (hitCell) {
            for (j = 0; j < 6; j++) parts.push({ x: b.x + 3, y: b.y + 3, vx: env.rand(-90, 90), vy: env.rand(-90, 90), life: 0.3, col: '#ffb27a' });
            bullets.splice(i, 1); continue;
          }
          /* 命中坦克 */
          var hit = null;
          if (b.fromPlayer) {
            for (j = 0; j < enemies.length; j++) {
              var er = rect(enemies[j]);
              if (b.x + 6 > er.x && b.x < er.x + er.w && b.y + 6 > er.y && b.y < er.y + er.h) { hit = enemies[j]; break; }
            }
            if (hit) {
              enemies.splice(j, 1);
              var gain = 100 + wave * 10;
              score += gain;
              floats.push({ x: hit.x + TANK / 2, y: hit.y, txt: '+' + gain, life: 0.9 });
              explode(hit.x + TANK / 2, hit.y + TANK / 2, false);
              shake = 0.6;
              bullets.splice(i, 1);
              syncHud();
              continue;
            }
          } else {
            var pr = rect(player);
            if (invT <= 0 && b.x + 6 > pr.x && b.x < pr.x + pr.w && b.y + 6 > pr.y && b.y < pr.y + pr.h) {
              bullets.splice(i, 1);
              playerDie();
              if (over) return;
              continue;
            }
          }
        }

        /* ---- 波次 ---- */
        if (toSpawn === 0 && enemies.length === 0) {
          wave++;
          score += 200;
          sfx.play('levelup');
          waveBanner = 2;
          toSpawn = 5 + wave * 2;
          buildTerrain();
          syncHud('第 ' + wave + ' 波来袭 +200');
        }

        /* ---- 粒子 / 飘字 ---- */
        for (i = parts.length - 1; i >= 0; i--) {
          var p = parts[i];
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt;
          if (p.life <= 0) parts.splice(i, 1);
        }
        for (i = floats.length - 1; i >= 0; i--) {
          floats[i].life -= dt; floats[i].y -= 34 * dt;
          if (floats[i].life <= 0) floats.splice(i, 1);
        }
      }

      function drawTank(t, body, barrel) {
        var d = DIRS[t.dir], cx = t.x + TANK / 2, cy = t.y + TANK / 2;
        ctx.save();
        ctx.translate(cx, cy);
        if (t.isPlayer && invT > 0 && Math.floor(invT * 8) % 2 === 0) ctx.globalAlpha = 0.35;
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        ctx.fillRect(-TANK / 2 + 3, -TANK / 2 + 4, TANK, TANK);
        ctx.fillStyle = body;
        env.roundRect(-TANK / 2, -TANK / 2, TANK, TANK, 6); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.fillRect(-TANK / 2 + 4, -TANK / 2 + 4, TANK - 8, 5);
        ctx.fillStyle = barrel;
        if (d.x !== 0) ctx.fillRect(d.x > 0 ? TANK / 2 - 2 : -TANK / 2 - 10, -3, 12, 6);
        else ctx.fillRect(-3, d.y > 0 ? TANK / 2 - 2 : -TANK / 2 - 10, 6, 12);
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      function render() {
        ctx.save();
        if (shake > 0) ctx.translate(env.rand(-1, 1) * shake * 6, env.rand(-1, 1) * shake * 6);

        var bg = ctx.createLinearGradient(0, 0, 0, H2);
        bg.addColorStop(0, '#101b12'); bg.addColorStop(1, '#1c2b18');
        ctx.fillStyle = bg; ctx.fillRect(-8, -8, W2 + 16, H2 + 16);
        ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
        for (var c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, H2); ctx.stroke(); }
        for (var r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W2, r * CELL); ctx.stroke(); }

        /* 地形 */
        for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
          var v = grid[r][c]; if (v === EMPTY) continue;
          var x = c * CELL, y = r * CELL;
          if (v === BRICK) {
            ctx.fillStyle = '#b4552d'; ctx.fillRect(x, y, CELL, CELL);
            ctx.fillStyle = '#8f3f1f';
            ctx.fillRect(x, y + 9, CELL, 3); ctx.fillRect(x, y + 19, CELL, 3); ctx.fillRect(x, y + 29, CELL, 3);
            ctx.fillRect(x + 12, y, 3, 9); ctx.fillRect(x + 25, y + 12, 3, 7); ctx.fillRect(x + 8, y + 22, 3, 7);
          } else {
            ctx.fillStyle = '#9aa7b8'; ctx.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
            ctx.fillStyle = '#d5dee9'; ctx.fillRect(x + 6, y + 6, CELL - 12, CELL - 12);
          }
        }

        /* 坦克 */
        enemies.forEach(function (e) {
          var col = (e.x + e.y) % 2 < 1 ? '#e05252' : '#d98e2b';
          drawTank(e, col, '#2c2c34');
        });
        drawTank(player, '#4fae52', '#263238');

        /* 子弹 */
        ctx.fillStyle = '#ffe9a8';
        bullets.forEach(function (b) { ctx.fillRect(b.x, b.y, 6, 6); });

        /* 粒子 / 飘字 */
        parts.forEach(function (p) {
          ctx.globalAlpha = Math.max(0, p.life * 2);
          ctx.fillStyle = p.col;
          ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        });
        ctx.globalAlpha = 1;
        floats.forEach(function (f) {
          ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
          env.text(f.txt, f.x, f.y, { font: 'bold 20px system-ui', color: '#fff', align: 'center', shadow: true });
        });
        ctx.globalAlpha = 1;

        if (waveBanner > 0) {
          ctx.globalAlpha = Math.min(1, waveBanner);
          env.text('WAVE ' + wave, W2 / 2, H2 / 2 - 40, { font: 'bold 46px Consolas, monospace', color: '#ffcf5c', align: 'center', shadow: true });
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }

      reset();

      keyUnbind = env.onKey(function (e, type) {
        if (over) return;
        if ((e.code === 'Enter' || e.code === 'NumpadEnter') && type === 'down' && fireCool <= 0) {
          fire(player); fireCool = cfg.pCool;
        }
      });

      env.loop(function (dt) {
        update(dt);
        if (!over) render();
      });

      return {
        start: function () {
          sfx.play('start');
          syncHud('消灭全部敌军 · 难度' + diffLabel(readDifficulty()));
        },
        restart: function () { reset(); },
        destroy: function () { if (keyUnbind) keyUnbind(); }
      };
    }
  });
})();
