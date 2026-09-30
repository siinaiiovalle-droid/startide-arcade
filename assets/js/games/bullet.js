/* ==========================================================================
   弹幕躲避 Bullet Bloom
   纯走位生存：躲开三类弹幕（瞄准弹流 / 侧向横雨 / 环形爆散），捡星屑加分
   输入：方向键/WASD/手柄持续移动 · 触屏按住拖动跟随
   存活 60 秒胜利；3 命耗尽失败
   ========================================================================== */
(function () {
  'use strict';

  var DIFF = {
    easy:   { dens: 0.7,  spd: 0.85, mult: 0.8,  label: '轻松' },
    normal: { dens: 1.0,  spd: 1.0,  mult: 1.0,  label: '标准' },
    hard:   { dens: 1.35, spd: 1.2,  mult: 1.3,  label: '困难' }
  };

  GameKit.register({
    id: 'bullet',
    name: { zh: '弹幕躲避', en: 'Bullet Bloom' },
    desc: { zh: '东方系走位生存！瞄准弹流、侧向横雨、环形爆散三种弹幕交织成花海，活过 60 秒！捡星屑加分，被击中会清屏续命。', en: 'Danmaku survival! Weave through aimed streams, cross rain and ring bursts for 60 seconds. Grab stars for points — getting hit clears the screen!' },
    genre: { zh: '弹幕射击', en: 'Shoot \'em up' },
    icon: '🌸', hue: '#f472b6',
    tags: [{ zh: '走位', en: 'Dodge' }, { zh: '生存', en: 'Survival' }],
    plays: 5000, hot: false, isNew: true,
    script: 'assets/js/games/bullet.js',
    ratio: 'portrait', duration: '1-2 分钟',
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
      var SURVIVE = 60;

      var px, py, PR, lives, inv, score, stars, timeLeft, over, finished;
      var bullets, starDrops, aimT, rainT, ringT, starT, shakeT;
      var pointerActive, pointerX, pointerY;

      function reset() {
        px = W / 2; py = H - 110; PR = 9;
        lives = 3; inv = 1.2;
        score = 0; stars = 0; timeLeft = SURVIVE;
        over = false; finished = false;
        bullets = []; starDrops = [];
        aimT = 0.4; rainT = 1.6; ringT = 3.2; starT = 1.0; shakeT = 0;
        pointerActive = false; pointerX = px; pointerY = py;
        syncHud();
      }
      function syncHud() {
        env.hud({
          score: Math.floor(score), lives: lives, level: 1,
          extra: cfg.label + ' · 存活 ' + Math.ceil(timeLeft) + 's · ✦ ' + stars
        });
      }
      function spawnAimed() {
        var sx = 40 + Math.random() * (W - 80);
        var sy = -14;
        var ang = Math.atan2(py - sy, px - sx);
        var spread = (Math.random() - 0.5) * 0.5;
        ang += spread;
        var v = (150 + Math.random() * 60) * cfg.spd;
        bullets.push({ x: sx, y: sy, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, r: 7, c: '#f472b6' });
      }
      function spawnRain() {
        var left = Math.random() < 0.5;
        var y = 60 + Math.random() * (H - 260);
        var v = (130 + Math.random() * 70) * cfg.spd;
        bullets.push({
          x: left ? -12 : W + 12, y: y,
          vx: (left ? 1 : -1) * v, vy: (Math.random() - 0.5) * 30, r: 6, c: '#a78bfa'
        });
      }
      function spawnRing() {
        var sx = 80 + Math.random() * (W - 160);
        var sy = 60 + Math.random() * 180;
        var cnt = 12, i, v = 120 * cfg.spd;
        for (i = 0; i < cnt; i++) {
          var ang = (i / cnt) * Math.PI * 2 + Math.random() * 0.2;
          bullets.push({ x: sx, y: sy, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, r: 5, c: '#67e8f9' });
        }
      }
      function hurt() {
        if (over || inv > 0) return;
        lives--;
        inv = 1.6;
        bullets.length = 0; /* 受击清屏续命 */
        shakeT = 0.4;
        sfx.play('hit');
        syncHud();
        if (lives < 0) finish(false);
      }
      function finish(win) {
        if (finished) return;
        finished = true;
        over = true;
        var sc = Math.round((win ? (score + timeLeft * 15 + 500) : score) * cfg.mult);
        env.gameOver({
          win: win,
          score: sc,
          level: 1,
          extra: win ? cfg.label + ' · 存活成功 · ✦ ' + stars : '被击落 · ✦ ' + stars
        });
      }

      /* ---- 输入 ---- */
      function onDown(e) {
        var p = env.pointer(e);
        pointerActive = true;
        pointerX = p.x; pointerY = p.y;
      }
      function onMove(e) {
        if (!pointerActive) return;
        var p = env.pointer(e);
        pointerX = p.x; pointerY = p.y;
      }
      function onUp() { pointerActive = false; }
      env.canvas.addEventListener('pointerdown', onDown);
      env.canvas.addEventListener('pointermove', onMove);
      env.canvas.addEventListener('pointerup', onUp);
      env.canvas.addEventListener('pointercancel', onUp);

      function update(dt) {
        var i;
        if (over) return;
        timeLeft -= dt;
        if (inv > 0) inv -= dt;
        if (shakeT > 0) shakeT -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          finish(true);
          return;
        }
        /* 移动：手柄持续 + 触屏跟随 */
        var sp = 350;
        var mx = (env.pad.right ? 1 : 0) - (env.pad.left ? 1 : 0);
        var my = (env.pad.down ? 1 : 0) - (env.pad.up ? 1 : 0);
        if (mx && my) { mx *= 0.7071; my *= 0.7071; }
        px += mx * sp * dt;
        py += my * sp * dt;
        if (pointerActive) {
          var dx = pointerX - px, dy = pointerY - py;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 4) {
            var step = Math.min(dist, sp * 1.15 * dt);
            px += dx / dist * step;
            py += dy / dist * step;
          }
        }
        px = Math.max(PR + 4, Math.min(W - PR - 4, px));
        py = Math.max(PR + 4, Math.min(H - PR - 4, py));

        /* 弹幕生成 */
        aimT -= dt; rainT -= dt; ringT -= dt; starT -= dt;
        if (aimT <= 0) {
          aimT = Math.max(0.14, (0.4 - Math.min(0.18, (SURVIVE - timeLeft) * 0.003)) / cfg.dens);
          spawnAimed();
        }
        if (rainT <= 0) {
          rainT = Math.max(0.3, 0.55 / cfg.dens);
          spawnRain();
          if (Math.random() < 0.3) spawnRain();
        }
        if (ringT <= 0) {
          ringT = Math.max(2.4, 3.6 - (SURVIVE - timeLeft) * 0.02) / cfg.dens;
          spawnRing();
          sfx.play('back');
        }
        if (starT <= 0) {
          starT = 2.6 + Math.random() * 1.6;
          starDrops.push({ x: 40 + Math.random() * (W - 80), y: -16, vy: 90 + Math.random() * 50, ph: Math.random() * 6.28 });
        }

        /* 星屑 */
        for (i = starDrops.length - 1; i >= 0; i--) {
          var st = starDrops[i];
          st.y += st.vy * dt;
          st.ph += dt * 4;
          if (st.y > H + 20) { starDrops.splice(i, 1); continue; }
          var ddx = st.x - px, ddy = st.y - py;
          if (ddx * ddx + ddy * ddy < 26 * 26) {
            stars++;
            score += 50;
            starDrops.splice(i, 1);
            sfx.play('coin');
            syncHud();
          }
        }

        /* 弹幕运动与碰撞 */
        for (i = bullets.length - 1; i >= 0; i--) {
          var b = bullets[i];
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) {
            bullets.splice(i, 1);
            continue;
          }
          var dx2 = b.x - px, dy2 = b.y - py;
          var rr = b.r + PR;
          if (dx2 * dx2 + dy2 * dy2 < rr * rr) {
            hurt();
            break;
          }
        }
        score += dt * 15;
      }

      function render() {
        var i;
        ctx.save();
        if (shakeT > 0) {
          ctx.translate((Math.random() - 0.5) * 8 * shakeT, (Math.random() - 0.5) * 8 * shakeT);
        }
        ctx.fillStyle = '#140b1e'; ctx.fillRect(-10, -10, W + 20, H + 20);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f9a8d4';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillText('🌸 弹幕躲避', 280, 40);
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText(cfg.label + ' · 活过 ' + SURVIVE + ' 秒 · 方向键移动或按住拖动', 280, 66);

        /* 星屑 */
        for (i = 0; i < starDrops.length; i++) {
          var st = starDrops[i];
          var sx = st.x + Math.sin(st.ph) * 10;
          ctx.save();
          ctx.translate(sx, st.y);
          ctx.rotate(st.ph * 0.6);
          ctx.fillStyle = '#fde047';
          ctx.fillRect(-7, -2, 14, 4);
          ctx.fillRect(-2, -7, 4, 14);
          ctx.restore();
        }
        /* 弹幕 */
        for (i = 0; i < bullets.length; i++) {
          var b = bullets[i];
          ctx.fillStyle = b.c;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          ctx.beginPath(); ctx.arc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.4, 0, Math.PI * 2); ctx.fill();
        }
        /* 玩家 */
        var blink = inv > 0 && Math.floor(inv * 10) % 2 === 0;
        if (!blink) {
          ctx.fillStyle = inv > 0 ? '#fca5a5' : '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(px, py - 14);
          ctx.lineTo(px + 11, py + 11);
          ctx.lineTo(px, py + 5);
          ctx.lineTo(px - 11, py + 11);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(px, py - 1, 3, 0, Math.PI * 2); ctx.fill();
        }
        /* 生命 */
        for (i = 0; i < Math.max(0, lives); i++) {
          ctx.fillStyle = '#f87171';
          ctx.beginPath();
          ctx.arc(30 + i * 22, H - 34, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        /* 时间条 */
        var frac = timeLeft / SURVIVE;
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        ctx.fillRect(60, H - 40, 380, 10);
        ctx.fillStyle = frac < 0.25 ? '#f87171' : '#2ee6a8';
        ctx.fillRect(60, H - 40, 380 * frac, 10);
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.fillText(Math.ceil(timeLeft) + 's', 490, H - 34);
        ctx.restore();
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        state: function () {
          return { x: px, y: py, lives: lives, inv: inv, score: Math.floor(score), stars: stars, timeLeft: timeLeft, over: over, won: finished && lives >= 0, bullets: bullets.length };
        },
        hurt: function () { inv = 0; hurt(); },
        setTime: function (t) { timeLeft = t; },
        setPos: function (x, y) { px = x; py = y; },
        bulletsCount: function () { return bullets.length; }
      };

      return {
        start: function () { syncHud(); },
        restart: function () { reset(); },
        destroy: function () {
          env.canvas.removeEventListener('pointerdown', onDown);
          env.canvas.removeEventListener('pointermove', onMove);
          env.canvas.removeEventListener('pointerup', onUp);
          env.canvas.removeEventListener('pointercancel', onUp);
        }
      };
    }
  });
})(window);
