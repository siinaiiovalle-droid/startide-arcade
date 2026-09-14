/* ==========================================================================
   超级冒险 Super Adventure —— 经典横版闯关（致敬超级玛丽）
   大地图关卡 · 顶砖块 · 吃蘑菇变大 · 踩敌人 · 终点旗杆通关
   ========================================================================== */
(function () {
  'use strict';

  var TILE = 32, ROWS = 15;
  var GRAV = 2100, JUMP_V = -700, WALK = 168, RUN = 268, MAXFALL = 780;
  var SOLID = '#B?pXuH';

  function solidChar(c) { return SOLID.indexOf(c) >= 0; }

  /* ---------------- 关卡构造 ---------------- */
  function newGrid(w) {
    var rows = [];
    for (var y = 0; y < ROWS; y++) { var a = []; for (var x = 0; x < w; x++) a.push(' '); rows.push(a); }
    return {
      w: w, rows: rows,
      set: function (x, y, c) { if (x >= 0 && x < w && y >= 0 && y < ROWS) rows[y][x] = c; },
      get: function (x, y) { if (x < 0 || x >= w || y < 0 || y >= ROWS) return ' '; return rows[y][x]; },
      rect: function (x1, y1, x2, y2, c) { for (var y = y1; y <= y2; y++) for (var x = x1; x <= x2; x++) this.set(x, y, c); },
      text: function (x, y, s) { for (var i = 0; i < s.length; i++) if (s[i] !== '.') this.set(x + i, y, s[i]); }
    };
  }

  /* 关卡 1：草原入门 */
  function buildLevel1() {
    var W = 168, g = newGrid(W);
    g.rect(0, 13, 43, 14, '#');
    g.rect(47, 13, 82, 14, '#');
    g.rect(86, 13, W - 1, 14, '#');

    g.set(9, 9, '?');
    g.set(10, 9, 'B'); g.set(11, 9, '?'); g.set(12, 9, 'B'); g.set(13, 9, '?');
    g.text(11, 5, '?');
    g.text(10, 6, 'o.o'); g.text(12, 6, 'o.o');

    g.rect(20, 11, 20, 12, 'p');
    g.rect(28, 10, 28, 12, 'p');
    g.text(33, 9, 'oo');
    g.rect(36, 12, 38, 12, 'B');
    g.text(37, 8, '?');

    g.rect(41, 12, 41, 12, 'X');
    g.fill = null;
    g.text(52, 9, '?B?');
    g.rect(58, 10, 58, 12, 'p');
    g.text(62, 6, 'o.o.o');
    g.text(66, 9, 'B?B');
    g.rect(72, 12, 74, 12, 'B');
    g.text(73, 8, 'o');

    g.rect(90, 11, 90, 12, 'p');
    g.text(94, 9, '?'); g.text(95, 9, 'B'); g.text(96, 9, '?');
    g.rect(100, 12, 104, 12, 'B'); g.rect(100, 11, 104, 11, 'B');
    g.rect(112, 12, 114, 12, 'X');
    g.text(118, 9, 'o.o');
    g.rect(122, 12, 126, 12, 'B');
    g.text(130, 6, 'o.o.o');

    // 台阶金字塔
    for (var i = 0; i < 5; i++) g.rect(140 + i, 12 - i, 140 + i, 12, 'X');
    g.rect(136, 12, 139, 12, 'X');

    // 旗杆
    g.set(158, 12, 'F'); g.rect(158, 6, 158, 12, 'H');
    return g;
  }

  /* 关卡 2：旅人试炼 */
  function buildLevel2() {
    var W = 190, g = newGrid(W);
    g.rect(0, 13, 30, 14, '#');
    g.rect(34, 13, 60, 14, '#');
    g.rect(66, 13, 96, 14, '#');
    g.rect(101, 13, 132, 14, '#');
    g.rect(137, 13, W - 1, 14, '#');

    g.text(6, 9, '?B?B?');
    g.text(7, 5, 'o.o.o');
    g.rect(14, 10, 14, 12, 'p');
    g.rect(20, 12, 22, 12, 'B');
    g.text(24, 8, '?');

    g.rect(38, 11, 38, 12, 'p');
    g.text(42, 9, 'B?B?B');
    g.text(43, 4, 'o.o.o.o');
    g.rect(50, 12, 52, 12, 'X');
    g.text(56, 10, '?');

    g.rect(70, 10, 70, 12, 'p');
    g.text(74, 6, 'o.o.o.o');
    g.text(76, 9, '?B?');
    g.rect(84, 12, 88, 12, 'B');
    g.rect(88, 11, 88, 12, 'X');
    g.text(90, 8, 'o');

    g.rect(105, 11, 105, 12, 'p');
    g.text(109, 9, 'B?B?B?B');
    g.text(110, 5, 'o.o.o.o');
    g.rect(122, 12, 126, 12, 'X');
    g.text(128, 8, '?');

    for (var i = 0; i < 6; i++) g.rect(146 + i, 12 - i, 146 + i, 12, 'X');
    g.text(156, 6, 'o.o.o');

    g.rect(168, 12, 170, 12, 'B');
    g.set(180, 12, 'F'); g.rect(180, 6, 180, 12, 'H');
    return g;
  }

  var LEVELS = [buildLevel1, buildLevel2];

  GameKit.register({
    id: 'mario',
    name: { zh: '超级冒险', en: 'Super Adventure' },
    desc: { zh: '经典横版闯关：顶砖块、吃蘑菇变大、踩敌人、冲向终点旗杆。', en: 'Classic platformer: hit blocks, grab mushrooms, stomp foes and reach the flag.' },
    genre: { zh: '横版闯关', en: 'Platformer' },
    icon: '🍄', hue: '#2ee6a8',
    logical: { w: 960, h: 480 },
    hot: true, isNew: false, sound: 'calm',
    touchControls: ['left', 'right', 'a', 'b'],
    controls: {
      keyboard: [
        { k: '← → / A D', zh: '左右移动', en: 'Move' },
        { k: '空格 / ↑ / K', zh: '跳跃（长按跳更高）', en: 'Jump (hold higher)' },
        { k: 'Shift / L', zh: '加速奔跑', en: 'Run' }
      ],
      touch: [
        { k: '◀ ▶', zh: '左右移动', en: 'Move' },
        { k: 'A', zh: '跳跃', en: 'Jump' },
        { k: 'B', zh: '加速', en: 'Run' }
      ]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;

      var level, levelIdx, camX, tiles, items, enemies, parts, coinsFx, floats;
      var p, score, lives, coins, timeLeft, tSec, tAcc, state, deadT, flagX, flagAnim, winT;
      var prevPad;

      function resetLevel(idx) {
        levelIdx = idx;
        level = LEVELS[idx]();
        tiles = level.rows.map(function (r) { return r.slice(); });
        items = []; enemies = []; parts = []; coinsFx = []; floats = [];
        camX = 0; timeLeft = 320; tSec = 0; tAcc = 0;
        deadT = 0; flagAnim = 0; winT = 0; state = 'play'; prevPad = {};
        flagX = level.w - 10;

        // 扫描生成初始敌人与旗杆
        for (var y = 0; y < ROWS; y++) {
          for (var x = 0; x < level.w; x++) {
            var c = tiles[y][x];
            if (c === 'g') { tiles[y][x] = ' '; enemies.push(mkGoomba(x * TILE + 16, y * TILE)); }
            if (c === 'F') { tiles[y][x] = ' '; flagX = x; }
          }
        }
        p = { x: 3 * TILE, y: 11 * TILE, w: 22, h: 27, vx: 0, vy: 0, onGround: false, face: 1, big: false, inv: 0, growT: 0, run: false, jumpHold: 0 };
        env.hud({ score: score || 0, lives: lives, level: idx + 1, extra: '🪙 x' + coins });
      }

      function mkGoomba(x, y) {
        return { type: 'goomba', x: x, y: y, w: 26, h: 26, vx: -48, vy: 0, dead: 0, squash: 0, onGround: false };
      }
      function mkMushroom(x, y) {
        return { type: 'mush', x: x, y: y, w: 26, h: 26, vx: 78, vy: 0, emerge: 22 };
      }

      function tileAt(px, py) {
        var tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
        if (tx < 0 || tx >= level.w || ty < 0 || ty >= ROWS) return (ty >= ROWS ? ' ' : '#');
        return tiles[ty][tx];
      }
      function solidAt(tx, ty) {
        if (tx < 0 || tx >= level.w) return true;
        if (ty < 0) return false;
        if (ty >= ROWS) return false;
        return solidChar(tiles[ty][tx]);
      }

      function addScore(n, wx, wy) {
        score += n;
        floats.push({ x: wx, y: wy, t: 0, txt: '+' + n });
        env.hud({ score: score });
      }

      function popCoin(wx, wy) {
        coins++;
        sfx.play('coin');
        addScore(100, wx, wy);
        coinsFx.push({ x: wx, y: wy, vy: -300, t: 0 });
        env.hud({ extra: '🪙 x' + coins });
      }

      function burst(x, y, c, n) {
        for (var i = 0; i < n; i++) {
          parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 260, life: 0.5 + Math.random() * 0.4, c: c, s: 3 + Math.random() * 4 });
        }
      }

      /* 顶砖块 */
      function bump(tx, ty) {
        var c = tiles[ty][tx];
        if (c === '?') {
          tiles[ty][tx] = 'u';
          // 出蘑菇（若玩家小）或金币
          var isMush = Math.random() < 0.45 && !p.big;
          if (isMush) { items.push(mkMushroom(tx * TILE + 3, ty * TILE - 26)); sfx.play('powerup'); }
          else { popCoin(tx * TILE + 16, ty * TILE - 6); }
          parts.push({ x: tx * TILE + 16, y: ty * TILE + 8, vx: 0, vy: -60, life: 0.2, c: '#ffd166', s: 10, block: true });
        } else if (c === 'B') {
          if (p.big) {
            tiles[ty][tx] = ' ';
            sfx.play('brick');
            burst(tx * TILE + 16, ty * TILE + 16, '#c96b3a', 12);
            addScore(50, tx * TILE + 16, ty * TILE + 10);
          } else {
            sfx.play('block');
          }
        } else if (c === 'X' || c === '#' || c === 'u') {
          sfx.play('block');
        }
      }

      /* ---------------- 玩家物理 ---------------- */
      function moveX(o, dt) {
        o.x += o.vx * dt;
        var top = Math.floor(o.y / TILE), bot = Math.floor((o.y + o.h - 1) / TILE);
        if (o.vx > 0) {
          var tx = Math.floor((o.x + o.w) / TILE);
          for (var ty = top; ty <= bot; ty++) if (solidAt(tx, ty)) { o.x = tx * TILE - o.w; o.vx = 0; o.hitWall = 1; break; }
        } else if (o.vx < 0) {
          var tx2 = Math.floor(o.x / TILE);
          for (var ty2 = top; ty2 <= bot; ty2++) if (solidAt(tx2, ty2)) { o.x = (tx2 + 1) * TILE; o.vx = 0; o.hitWall = -1; break; }
        }
        if (o.x < 0) { o.x = 0; o.vx = 0; }
      }
      function moveY(o, dt, isPlayer) {
        o.vy = Math.min(MAXFALL, o.vy + GRAV * dt);
        o.y += o.vy * dt;
        o.onGround = false;
        var l = Math.floor(o.x / TILE), r = Math.floor((o.x + o.w - 1) / TILE);
        if (o.vy > 0) {
          var ty = Math.floor((o.y + o.h) / TILE);
          for (var tx = l; tx <= r; tx++) if (solidAt(tx, ty)) { o.y = ty * TILE - o.h; o.vy = 0; o.onGround = true; break; }
        } else if (o.vy < 0) {
          var ty2 = Math.floor(o.y / TILE);
          var hit = -1;
          for (var tx2 = l; tx2 <= r; tx2++) if (solidAt(tx2, ty2)) { hit = tx2; break; }
          if (hit >= 0) { o.y = (ty2 + 1) * TILE; o.vy = 0; if (isPlayer) bump(hit, ty2); }
        }
      }

      function hurtPlayer() {
        if (p.inv > 0 || state !== 'play') return;
        if (p.big) {
          p.big = false; p.h = 27; p.y += 17; p.inv = 1.6;
          sfx.play('punch');
          burst(p.x + 11, p.y + 10, '#ff5c6c', 10);
        } else {
          die();
        }
      }
      function die() {
        if (state !== 'play') return;
        state = 'dead'; deadT = 0; p.vy = -520; p.vx = 0;
        sfx.play('gameover');
        env.hud({ lives: Math.max(0, lives - 1) });
      }
      function nextLevel() {
        if (levelIdx + 1 < LEVELS.length) { resetLevel(levelIdx + 1); }
        else { env.win({ score: score, detail: '完成全部关卡' }); }
      }

      /* ---------------- 更新 ---------------- */
      function update(dt) {
        if (state === 'dead') {
          deadT += dt;
          p.vy = Math.min(MAXFALL, p.vy + GRAV * dt);
          p.y += p.vy * dt;
          if (deadT > 2.2) {
            lives -= 1;
            if (lives < 0) { env.gameOver({ score: score, detail: '第 ' + (levelIdx + 1) + ' 关倒下' }); return; }
            resetLevel(levelIdx);
          }
          return;
        }
        if (state === 'win') {
          winT += dt;
          flagAnim = Math.min(1, flagAnim + dt * 1.4);
          if (winT > 2.4) nextLevel();
          return;
        }

        // 计时
        tAcc += dt; tSec += dt;
        if (tSec >= 1) { tSec -= 1; timeLeft--; if (timeLeft <= 0) { die(); return; } }

        /* 输入 */
        var left = env.pad.left, right = env.pad.right;
        var run = env.pad.b;
        var accel = 1500;
        var maxSpd = run ? RUN : WALK;
        if (left && !right) { p.vx -= accel * dt; p.face = -1; }
        else if (right && !left) { p.vx += accel * dt; p.face = 1; }
        else { p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx), 1800 * dt); }
        if (Math.abs(p.vx) > maxSpd) p.vx = Math.sign(p.vx) * maxSpd;

        var jumpPressed = (env.pad.a || env.pad.up);
        var jumpJust = jumpPressed && !prevPad.jump;
        if (jumpJust && p.onGround) { p.vy = JUMP_V; p.onGround = false; p.jumpHold = 1; sfx.play('jump'); }
        if (jumpPressed && p.jumpHold > 0 && p.vy < 0) p.jumpHold = Math.min(1, p.jumpHold + dt * 6);
        if (!jumpPressed && p.vy < -160) { p.vy = Math.max(p.vy, -180); p.jumpHold = 0; }

        moveX(p, dt);
        moveY(p, dt, true);
        if (p.onGround && Math.abs(p.vx) < 8 && p.growT <= 0) p.vx *= 0.4;

        p.inv = Math.max(0, p.inv - dt);
        p.growT = Math.max(0, p.growT - dt);

        // 掉进坑里
        if (p.y > H + 40) { die(); return; }

        /* 金币 */
        var l = Math.floor(p.x / TILE), r = Math.floor((p.x + p.w - 1) / TILE);
        var t = Math.floor(p.y / TILE), b = Math.floor((p.y + p.h - 1) / TILE);
        for (var ty = t; ty <= b; ty++) for (var tx = l; tx <= r; tx++) {
          if (tiles[ty] && tiles[ty][tx] === 'o') { tiles[ty][tx] = ' '; popCoin(tx * TILE + 16, ty * TILE + 16); }
        }

        /* 旗杆 */
        if (p.x + p.w > flagX * TILE + 8 && state === 'play') {
          state = 'win'; winT = 0; sfx.play('levelup'); addScore(1000, p.x, p.y);
        }

        /* 敌人 */
        enemies.forEach(function (e) {
          if (e.squash > 0) { e.squash -= dt; return; }
          moveX(e, dt);
          if (e.hitWall) { e.vx = -e.vx; e.hitWall = 0; }
          moveY(e, dt, false);
          if (e.x < 0) e.vx = Math.abs(e.vx);
          if (e.x + e.w > level.w * TILE) e.vx = -Math.abs(e.vx);

          if (e.y > H + 60) { e.gone = true; return; }

          if (state === 'play' && p.x + p.w > e.x + 3 && p.x < e.x + e.w - 3 &&
            p.y + p.h > e.y + 4 && p.y < e.y + e.h - 2) {
            if (p.vy > 60 && p.y + p.h < e.y + e.h * 0.7) {
              e.squash = 0.5; e.squashStop = true; e.vx = 0;
              p.vy = -420;
              sfx.play('stomp');
              addScore(200, e.x, e.y);
            } else {
              hurtPlayer();
            }
          }
        });
        enemies = enemies.filter(function (e) { return !e.gone && e.squash <= 0; });

        /* 道具 */
        items.forEach(function (it) {
          if (it.emerge > 0) { it.emerge -= dt * 60; it.y -= dt * 60; return; }
          moveX(it, dt);
          if (it.hitWall) { it.vx = -it.vx; it.hitWall = 0; }
          moveY(it, dt, false);
          if (it.y > H + 60) it.gone = true;
          if (p.x + p.w > it.x && p.x < it.x + it.w && p.y + p.h > it.y && p.y < it.y + it.h) {
            it.gone = true;
            if (it.type === 'mush') {
              if (!p.big) { p.big = true; p.h = 44; p.y -= 17; sfx.play('grow'); }
              else sfx.play('coin');
              p.growT = 0.5;
              addScore(1000, it.x, it.y);
            }
          }
        });
        items = items.filter(function (i) { return !i.gone; });

        /* 特效 */
        parts.forEach(function (q) { q.life -= dt; q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.block) q.vy = 0; });
        parts = parts.filter(function (q) { return q.life > 0; });
        coinsFx.forEach(function (c) { c.t += dt; c.vy += 900 * dt; c.y += c.vy * dt; });
        coinsFx = coinsFx.filter(function (c) { return c.t < 0.6; });
        floats.forEach(function (f) { f.t += dt; f.y -= 30 * dt; });
        floats = floats.filter(function (f) { return f.t < 0.9; });

        /* 相机 */
        var target = p.x + p.w / 2 - W * 0.42;
        camX += (target - camX) * Math.min(1, dt * 8);
        camX = env.clamp(camX, 0, Math.max(0, level.w * TILE - W));

        env.score(score);
        prevPad = { jump: jumpPressed };
      }

      /* ---------------- 渲染 ---------------- */
      function drawTiles() {
        var x0 = Math.floor(camX / TILE) - 1, x1 = x0 + Math.ceil(W / TILE) + 3;
        for (var tx = x0; tx <= x1; tx++) {
          for (var ty = 0; ty < ROWS; ty++) {
            var c = (tx >= 0 && tx < level.w) ? tiles[ty][tx] : ' ';
            if (c === ' ' || c === 'g' || c === 'F') continue;
            var px = tx * TILE - camX, py = ty * TILE;
            if (c === '#') {
              var g2 = ctx.createLinearGradient(0, py, 0, py + TILE);
              g2.addColorStop(0, '#4fd18a'); g2.addColorStop(0.28, '#2fa76b'); g2.addColorStop(1, '#1e7d4f');
              ctx.fillStyle = g2; ctx.fillRect(px, py, TILE, TILE);
              ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(px, py, TILE, 4);
              ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
            } else if (c === 'B') {
              ctx.fillStyle = '#c96b3a'; ctx.fillRect(px, py, TILE, TILE);
              ctx.fillStyle = 'rgba(0,0,0,.22)';
              ctx.fillRect(px, py + TILE / 2 - 1, TILE, 2); ctx.fillRect(px + TILE / 2 - 1, py, 2, TILE / 2); ctx.fillRect(px, py + TILE / 2, TILE, 0);
              ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
              ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(px, py, TILE, 3);
            } else if (c === '?') {
              var pulse = 0.5 + Math.sin(tAcc * 6 + tx) * 0.5;
              ctx.fillStyle = '#f0a52a'; ctx.fillRect(px, py, TILE, TILE);
              ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + pulse * 0.2) + ')'; ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
              ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
              ctx.fillStyle = '#7a4a00'; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText('?', px + TILE / 2, py + TILE / 2 + 1);
            } else if (c === 'u') {
              ctx.fillStyle = '#8a6a3a'; ctx.fillRect(px, py, TILE, TILE);
              ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
            } else if (c === 'X') {
              ctx.fillStyle = '#8b93a8'; ctx.fillRect(px, py, TILE, TILE);
              ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(px, py, TILE, 4);
              ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
            } else if (c === 'H') {
              ctx.fillStyle = '#c9d4e6'; ctx.fillRect(px + TILE / 2 - 3, py, 6, TILE);
            } else if (c === 'p') {
              var pg = ctx.createLinearGradient(px, 0, px + TILE, 0);
              pg.addColorStop(0, '#3fae5a'); pg.addColorStop(0.4, '#69d97f'); pg.addColorStop(1, '#2b8a44');
              ctx.fillStyle = pg; ctx.fillRect(px, py, TILE, TILE);
              ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(px + 3, py, 4, TILE);
            } else if (c === 'o') {
              var bob = Math.sin(tAcc * 5 + tx) * 2;
              ctx.save(); ctx.translate(px + TILE / 2, py + TILE / 2 + bob);
              ctx.scale(Math.abs(Math.cos(tAcc * 4 + tx * 0.5)) * 0.5 + 0.5, 1);
              ctx.fillStyle = '#ffd166'; ctx.shadowColor = '#ffb020'; ctx.shadowBlur = 12;
              ctx.beginPath(); ctx.arc(0, 0, 10, 0, 6.283); ctx.fill();
              ctx.shadowBlur = 0; ctx.fillStyle = '#f0a52a';
              ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, 6.283); ctx.fill();
              ctx.restore();
            }
          }
        }
      }

      function drawGoomba(e) {
        var px = e.x - camX, py = e.y, sq = e.squash > 0 ? 0.35 : 1;
        ctx.save();
        ctx.translate(px + e.w / 2, py + e.h);
        if (e.squash > 0) ctx.scale(1.25, 0.4);
        ctx.fillStyle = '#7b4a2d';
        ctx.beginPath(); ctx.ellipse(0, -e.h * 0.5, e.w * 0.5, e.h * 0.55, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#f4d9b0';
        ctx.beginPath(); ctx.ellipse(0, -e.h * 0.42, e.w * 0.34, e.h * 0.3, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-5, -e.h * 0.58, 4.2, 0, 6.283); ctx.arc(5, -e.h * 0.58, 4.2, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#111';
        var look = e.vx < 0 ? -1.6 : 1.6;
        ctx.beginPath(); ctx.arc(-5 + look, -e.h * 0.58, 2, 0, 6.283); ctx.arc(5 + look, -e.h * 0.58, 2, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#3a2416';
        ctx.beginPath(); ctx.ellipse(-7, 0, 7, 4, 0, 0, 6.283); ctx.ellipse(7, 0, 7, 4, 0, 0, 6.283); ctx.fill();
        ctx.restore();
      }

      function drawMushroom(it) {
        var px = it.x - camX, py = it.y;
        ctx.save(); ctx.translate(px + 13, py + 26);
        ctx.fillStyle = '#e8e2d6'; env.roundRect(-6, -10, 12, 10, 3); ctx.fill();
        ctx.fillStyle = '#ff4d4d';
        ctx.beginPath(); ctx.arc(0, -12, 14, Math.PI, 0); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-6, -18, 3.4, 0, 6.283); ctx.arc(6, -18, 3.4, 0, 6.283); ctx.arc(0, -22, 3, 0, 6.283); ctx.fill();
        ctx.restore();
      }

      function drawPlayer() {
        if (state === 'dead' && deadT > 0) { /* 下落中仍绘制 */ }
        var px = p.x - camX, py = p.y;
        var w = p.w, h = p.h;
        if (p.inv > 0 && Math.floor(tAcc * 16) % 2 === 0 && p.growT <= 0) return;
        ctx.save();
        ctx.translate(px + w / 2, py + h);
        var sc = p.growT > 0 ? (1 + Math.sin(p.growT * 20) * 0.12) : 1;
        ctx.scale(sc * (p.face < 0 ? -1 : 1), sc);
        var walk = Math.abs(p.vx) > 12 ? Math.sin(tAcc * 18) : 0;

        // 腿
        ctx.fillStyle = '#2b4fd0';
        ctx.fillRect(-w / 2 + 1 + walk * 3, -h * 0.32, w * 0.36, h * 0.32);
        ctx.fillRect(w / 2 - 1 - w * 0.36 - walk * 3, -h * 0.32, w * 0.36, h * 0.32);
        // 鞋
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(-w / 2, -4, w * 0.42, 4);
        ctx.fillRect(w / 2 - w * 0.42, -4, w * 0.42, 4);
        // 背带裤
        ctx.fillStyle = '#2b4fd0';
        ctx.fillRect(-w / 2, -h * 0.62, w, h * 0.32);
        // 上衣
        ctx.fillStyle = '#e63946';
        ctx.fillRect(-w / 2, -h * 0.74, w, h * 0.2);
        // 背带
        ctx.fillStyle = '#2b4fd0';
        ctx.fillRect(-w * 0.22, -h * 0.74, w * 0.14, h * 0.14);
        ctx.fillRect(w * 0.08, -h * 0.74, w * 0.14, h * 0.14);
        // 手
        ctx.fillStyle = '#f2c795';
        ctx.beginPath(); ctx.arc(-w / 2 - 1, -h * 0.6, 3.4, 0, 6.283); ctx.fill();
        ctx.beginPath(); ctx.arc(w / 2 + 1, -h * 0.6, 3.4, 0, 6.283); ctx.fill();
        // 头
        ctx.fillStyle = '#f2c795';
        ctx.beginPath(); ctx.arc(0, -h * 0.86, w * 0.3, 0, 6.283); ctx.fill();
        // 胡子
        ctx.fillStyle = '#3a2416';
        ctx.fillRect(-w * 0.28, -h * 0.82, w * 0.56, h * 0.07);
        // 眼
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(w * 0.06, -h * 0.9, 1.7, 0, 6.283); ctx.fill();
        // 帽子
        ctx.fillStyle = '#e63946';
        ctx.beginPath(); ctx.arc(0, -h * 0.9, w * 0.32, Math.PI, 0); ctx.fill();
        ctx.fillRect(-w * 0.34, -h * 0.9, w * 0.68, h * 0.06);
        if (p.face > 0) ctx.fillRect(w * 0.1, -h * 0.9, w * 0.3, h * 0.055);
        ctx.restore();
      }

      function drawFlag() {
        var px = flagX * TILE - camX + 16;
        ctx.fillStyle = '#c9d4e6'; ctx.fillRect(px - 3, 6 * TILE, 6, 6 * TILE);
        ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(px, 6 * TILE - 4, 7, 0, 6.283); ctx.fill();
        var fy = 6 * TILE + 8 + flagAnim * (5.4 * TILE);
        ctx.fillStyle = '#2ee6a8';
        ctx.beginPath();
        ctx.moveTo(px, fy); ctx.lineTo(px + 34, fy + 11); ctx.lineTo(px, fy + 22); ctx.closePath();
        ctx.fill();
      }

      function render() {
        // 天空
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#5ec4ff'); sky.addColorStop(0.6, '#9fe0ff'); sky.addColorStop(1, '#d6f2ff');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

        // 远景山
        ctx.fillStyle = 'rgba(64,170,120,.45)';
        for (var i = -1; i < 10; i++) {
          var hx = i * 220 - (camX * 0.28) % 220;
          ctx.beginPath(); ctx.moveTo(hx, H - 96); ctx.lineTo(hx + 110, H - 220); ctx.lineTo(hx + 220, H - 96); ctx.closePath(); ctx.fill();
        }
        // 云
        ctx.fillStyle = 'rgba(255,255,255,.92)';
        for (var c = -1; c < 12; c++) {
          var cx = c * 260 - (camX * 0.14) % 260, cy = 60 + (c % 3) * 42;
          ctx.beginPath();
          ctx.arc(cx, cy, 24, 0, 6.283); ctx.arc(cx + 26, cy - 8, 30, 0, 6.283);
          ctx.arc(cx + 58, cy, 22, 0, 6.283); ctx.arc(cx + 30, cy + 10, 24, 0, 6.283);
          ctx.fill();
        }
        // 近景灌木
        ctx.fillStyle = 'rgba(40,140,90,.55)';
        for (var b = -1; b < 16; b++) {
          var bx = b * 160 - (camX * 0.55) % 160;
          ctx.beginPath(); ctx.arc(bx, H - 92, 42, Math.PI, 0); ctx.arc(bx + 60, H - 92, 34, Math.PI, 0); ctx.fill();
        }

        drawTiles();
        drawFlag();
        enemies.forEach(drawGoomba);
        items.forEach(drawMushroom);
        drawPlayer();

        // 金币特效
        coinsFx.forEach(function (c) {
          ctx.save(); ctx.translate(c.x - camX, c.y);
          ctx.globalAlpha = 1 - c.t / 0.6;
          ctx.fillStyle = '#ffd166'; ctx.shadowColor = '#ffb020'; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(0, 0, 8, 0, 6.283); ctx.fill();
          ctx.restore();
        });
        // 碎块
        parts.forEach(function (q) {
          ctx.globalAlpha = Math.max(0, q.life * 2);
          ctx.fillStyle = q.c;
          ctx.fillRect(q.x - camX - q.s / 2, q.y - q.s / 2, q.s, q.s);
        });
        ctx.globalAlpha = 1;
        // 飘字
        floats.forEach(function (f) {
          ctx.globalAlpha = Math.max(0, 1 - f.t / 0.9);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 6;
          ctx.fillText(f.txt, f.x - camX, f.y);
        });
        ctx.globalAlpha = 1;

        // 顶部状态
        ctx.fillStyle = 'rgba(6,12,24,.5)'; ctx.fillRect(0, 0, W, 40);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('🪙 ' + coins + '   ❤ ' + Math.max(0, lives) + '   🚩 Lv.' + (levelIdx + 1), 16, 20);
        ctx.textAlign = 'right';
        ctx.fillText('⏱ ' + Math.max(0, timeLeft) + '   得分 ' + score, W - 16, 20);

        // 通关横幅
        if (state === 'win') {
          ctx.globalAlpha = Math.min(1, winT * 2);
          ctx.fillStyle = 'rgba(6,12,24,.55)'; ctx.fillRect(0, 0, W, H);
          ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 48px system-ui';
          ctx.shadowColor = 'rgba(46,230,168,.9)'; ctx.shadowBlur = 26;
          ctx.fillText('关卡通过！', W / 2, H / 2 - 10);
          ctx.font = 'bold 20px system-ui'; ctx.fillStyle = '#bfe9ff';
          ctx.fillText('得分 ' + score + ' · 正在进入下一关…', W / 2, H / 2 + 40);
          ctx.globalAlpha = 1;
        }
      }

      /* ---------------- 生命周期 ---------------- */
      score = 0; lives = 3; coins = 0;
      resetLevel(0);
      env.loop(function (dt) { update(dt); render(); });

      return {
        start: function () { sfx.play('start'); },
        restart: function () { score = 0; lives = 3; coins = 0; resetLevel(0); },
        destroy: function () { }
      };
    }
  });
})();
