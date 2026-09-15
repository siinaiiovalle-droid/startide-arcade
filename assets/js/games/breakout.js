/* ==========================================================================
   霓虹打砖块 Neon Breaker —— 经典打砖块
   多关卡 · 道具掉落 · 多彩砖块 · 鼠标 / 触屏 / 键盘三种操控
   ========================================================================== */
(function () {
  'use strict';

  GameKit.register({
    id: 'breakout',
    name: { zh: '霓虹打砖块', en: 'Neon Breaker' },
    desc: { zh: '经典打砖块：多关卡、随机道具、支持鼠标 / 触屏拖动。', en: 'Classic brick breaker with levels, power-ups and mouse/touch drag.' },
    genre: { zh: '休闲益智', en: 'Casual' },
    icon: '🧱', hue: '#7a5cff',
    logical: { w: 720, h: 540 },
    hot: true, isNew: false, sound: 'menu',
    touchControls: ['left', 'right', 'a'],
    controls: {
      keyboard: [
        { k: '← → / A D', zh: '移动挡板', en: 'Move paddle' },
        { k: '空格 / K', zh: '发射小球', en: 'Launch ball' },
        { k: '鼠标 / 触屏', zh: '直接拖动挡板', en: 'Drag paddle' }
      ],
      touch: [
        { k: '拖动屏幕', zh: '移动挡板', en: 'Drag paddle' },
        { k: 'A', zh: '发射小球', en: 'Launch ball' }
      ]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;

      var COLS = 11, ROWS = 6, BW = 58, BH = 24, GAP = 4, TOP = 74, LEFT = (720 - (COLS * (BW + GAP) - GAP)) / 2;
      var COLORS = ['#ff4d9d', '#ffb020', '#2ee6a8', '#38e1ff', '#7a5cff', '#ff5c6c'];

      var paddle, balls, bricks, drops, parts, score, lives, level, launched, shake, tAcc, state, winT, over, combo;

      function mkBall(x, y, spd, ang) {
        var a = ang === undefined ? -Math.PI / 2 + (Math.random() - 0.5) * 0.7 : ang;
        return { x: x, y: y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 7, stuck: false, trail: [] };
      }

      function buildLevel(n) {
        bricks = [];
        var hpMax = Math.min(3, 1 + Math.floor((n - 1) / 2));
        for (var r = 0; r < ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            if (n > 1 && Math.random() < 0.08) continue;
            var hp = 1;
            if (r < 2) hp = Math.min(3, hpMax + 1);
            else if (r < 4) hp = hpMax;
            bricks.push({
              x: LEFT + c * (BW + GAP), y: TOP + r * (BH + GAP), w: BW, h: BH,
              hp: hp, maxhp: hp, c: COLORS[r % COLORS.length], flash: 0
            });
          }
        }
      }

      function reset(full) {
        if (full) { score = 0; lives = 3; level = 1; }
        paddle = { x: W / 2, y: H - 46, w: 118, h: 14, targetW: 118 };
        balls = [mkBall(W / 2, H - 60, 340)];
        balls[0].stuck = true;
        bricks = []; drops = []; parts = [];
        launched = false; shake = 0; tAcc = 0; state = 'play'; winT = 0; over = false; combo = 0;
        buildLevel(level);
        env.hud({ score: 0, lives: lives, level: level, extra: '道具 0' });
      }

      function spawnDrop(x, y) {
        var r = Math.random();
        if (r > 0.2) return;
        var kinds = ['wide', 'wide', 'multi', 'slow', 'life'];
        var kind = r < 0.03 ? 'life' : kinds[Math.floor(Math.random() * kinds.length)];
        drops.push({ x: x, y: y, vy: 170, kind: kind, r: 14, t: 0 });
      }

      function burst(x, y, c, n) {
        for (var i = 0; i < n; i++) {
          var a = Math.random() * 6.283, s = 60 + Math.random() * 220;
          parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.4, c: c, s: 2 + Math.random() * 4 });
        }
      }

      function loseLife() {
        lives--; sfx.play('gameover'); shake = 14;
        env.hud({ lives: lives });
        if (lives < 0) { over = true; state = 'over'; env.gameOver({ score: score, detail: '到达第 ' + level + ' 关' }); return; }
        balls = [mkBall(paddle.x, paddle.y - 22, 340)];
        balls[0].stuck = true;
        launched = false;
        paddle.w = paddle.targetW = 118;
      }

      function hitBrick(b, i) {
        b.hp--; b.flash = 0.12;
        if (b.hp <= 0) {
          bricks.splice(i, 1);
          combo++;
          var gain = 50 + Math.min(200, combo * 10);
          score += gain;
          sfx.play('brick');
          burst(b.x + b.w / 2, b.y + b.h / 2, b.c, 10);
          spawnDrop(b.x + b.w / 2, b.y + b.h / 2);
        } else {
          sfx.play('block');
          burst(b.x + b.w / 2, b.y + b.h / 2, b.c, 4);
        }
        shake = Math.max(shake, 3);
      }

      function update(dt) {
        tAcc += dt;
        if (shake > 0) shake = Math.max(0, shake - dt * 40);

        if (state === 'clear') {
          winT += dt;
          if (winT > 1.6) { level++; reset(false); }
          return;
        }
        if (state === 'over') return;

        /* 挡板 */
        var pw = paddle.w, cx = (env.pad.right ? 1 : 0) - (env.pad.left ? 1 : 0);
        if (cx) paddle.x += cx * 620 * dt;
        if (pointerActive) paddle.x += (pointerX - paddle.x) * Math.min(1, dt * 18);

        paddle.w += (paddle.targetW - paddle.w) * Math.min(1, dt * 8);
        paddle.x = env.clamp(paddle.x, paddle.w / 2, W - paddle.w / 2);

        /* 发射 */
        var aDown = env.pad.a;
        if (aDown && !prevA) {
          balls.forEach(function (b) { if (b.stuck) { b.stuck = false; b.vx = (Math.random() - 0.5) * 260; b.vy = -Math.sqrt(Math.max(0, 340 * 340 - b.vx * b.vx)); sfx.play('laser'); } });
          launched = true;
        }
        prevA = aDown;

        /* 小球 */
        for (var i = balls.length - 1; i >= 0; i--) {
          var b = balls[i];
          if (b.stuck) { b.x = paddle.x; b.y = paddle.y - 16; continue; }
          b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 7) b.trail.shift();
          b.x += b.vx * dt; b.y += b.vy * dt;

          if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); sfx.play('bounce'); }
          if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); sfx.play('bounce'); }
          if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); sfx.play('bounce'); }

          // 挡板
          if (b.vy > 0 && b.y + b.r > paddle.y && b.y - b.r < paddle.y + paddle.h &&
            b.x > paddle.x - paddle.w / 2 && b.x < paddle.x + paddle.w / 2) {
            var off = (b.x - paddle.x) / (paddle.w / 2);
            var ang = -Math.PI / 2 + off * 1.05;
            var spd = Math.min(620, Math.hypot(b.vx, b.vy) * 1.015);
            b.vx = Math.cos(ang) * spd; b.vy = Math.sin(ang) * spd;
            b.y = paddle.y - b.r - 1;
            sfx.play('bounce');
            combo = 0;
            burst(b.x, paddle.y, '#38e1ff', 5);
          }

          // 砖块
          for (var j = 0; j < bricks.length; j++) {
            var br = bricks[j];
            if (b.x + b.r > br.x && b.x - b.r < br.x + br.w && b.y + b.r > br.y && b.y - b.r < br.y + br.h) {
              // 判定反弹方向
              var overlapX = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r));
              var overlapY = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r));
              if (overlapX < overlapY) b.vx = -b.vx; else b.vy = -b.vy;
              hitBrick(br, j);
              break;
            }
          }

          if (b.y - b.r > H) { balls.splice(i, 1); }
        }
        if (balls.length === 0 && state === 'play') { loseLife(); return; }

        /* 道具 */
        for (var d = drops.length - 1; d >= 0; d--) {
          var dr = drops[d];
          dr.t += dt; dr.y += dr.vy * dt;
          if (dr.y + dr.r > paddle.y && dr.y - dr.r < paddle.y + paddle.h &&
            dr.x > paddle.x - paddle.w / 2 - 10 && dr.x < paddle.x + paddle.w / 2 + 10) {
            applyDrop(dr.kind);
            drops.splice(d, 1);
            continue;
          }
          if (dr.y > H + 30) drops.splice(d, 1);
        }

        /* 粒子 */
        parts = parts.filter(function (q) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300 * dt; return q.life > 0; });

        /* 过关 */
        if (bricks.length === 0 && state === 'play') {
          state = 'clear'; winT = 0; score += 500; sfx.play('win');
          env.hud({ score: score });
        }

        env.score(score);
      }

      var prevA = false, pointerActive = false, pointerX = W / 2;

      function applyDrop(kind) {
        if (kind === 'wide') { paddle.targetW = Math.min(230, paddle.targetW + 44); sfx.play('powerup'); }
        else if (kind === 'multi') {
          sfx.play('powerup');
          var extra = [];
          balls.forEach(function (b) {
            if (b.stuck) return;
            extra.push(mkBall(b.x, b.y, 360, Math.atan2(b.vy, b.vx) - 0.5));
            extra.push(mkBall(b.x, b.y, 360, Math.atan2(b.vy, b.vx) + 0.5));
          });
          balls = balls.concat(extra);
        } else if (kind === 'slow') {
          sfx.play('coin');
          balls.forEach(function (b) { b.vx *= 0.78; b.vy *= 0.78; });
        } else if (kind === 'life') { lives++; sfx.play('life'); env.hud({ lives: lives }); }
        env.hud({ extra: '多球 ' + balls.length });
      }

      /* ---------- 渲染 ---------- */
      function render() {
        ctx.save();
        if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        var g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#080d1c'); g.addColorStop(1, '#121a38');
        ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);

        // 网格背景
        ctx.strokeStyle = 'rgba(122,92,255,.09)'; ctx.lineWidth = 1;
        for (var x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (var y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        // 砖块
        bricks.forEach(function (b) {
          ctx.save();
          ctx.shadowColor = b.c; ctx.shadowBlur = b.flash > 0 ? 26 : 10;
          ctx.fillStyle = b.flash > 0 ? '#fff' : b.c;
          env.roundRect(b.x, b.y, b.w, b.h, 6); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,.22)';
          env.roundRect(b.x + 3, b.y + 3, b.w - 6, 6, 3); ctx.fill();
          if (b.maxhp > 1) {
            ctx.fillStyle = 'rgba(0,0,0,.4)';
            ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(b.hp, b.x + b.w - 11, b.y + b.h - 9);
          }
          ctx.restore();
        });

        // 道具
        drops.forEach(function (d) {
          var col = d.kind === 'wide' ? '#2ee6a8' : d.kind === 'multi' ? '#38e1ff' : d.kind === 'slow' ? '#7a5cff' : '#ff4d9d';
          ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(Math.sin(d.t * 3) * 0.3);
          ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.fillStyle = col;
          env.roundRect(-12, -12, 24, 24, 7); ctx.fill();
          ctx.shadowBlur = 0; ctx.fillStyle = '#06101c'; ctx.font = 'bold 13px system-ui';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(d.kind === 'wide' ? 'W' : d.kind === 'multi' ? '3' : d.kind === 'slow' ? 'S' : '♥', 0, 1);
          ctx.restore();
        });

        // 粒子
        parts.forEach(function (q) {
          ctx.globalAlpha = Math.max(0, q.life * 2);
          ctx.fillStyle = q.c;
          ctx.beginPath(); ctx.arc(q.x, q.y, q.s, 0, 6.283); ctx.fill();
        });
        ctx.globalAlpha = 1;

        // 挡板
        var pg = ctx.createLinearGradient(paddle.x - paddle.w / 2, 0, paddle.x + paddle.w / 2, 0);
        pg.addColorStop(0, '#38e1ff'); pg.addColorStop(0.5, '#7a5cff'); pg.addColorStop(1, '#ff4d9d');
        ctx.shadowColor = '#38e1ff'; ctx.shadowBlur = 18;
        ctx.fillStyle = pg;
        env.roundRect(paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h, 7); ctx.fill();
        ctx.shadowBlur = 0;

        // 小球
        balls.forEach(function (b) {
          b.trail.forEach(function (tp, k) {
            ctx.globalAlpha = (k / b.trail.length) * 0.4;
            ctx.fillStyle = '#bfe9ff';
            ctx.beginPath(); ctx.arc(tp.x, tp.y, b.r * (k / b.trail.length), 0, 6.283); ctx.fill();
          });
          ctx.globalAlpha = 1;
          ctx.shadowColor = '#fff'; ctx.shadowBlur = 16;
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill();
          ctx.shadowBlur = 0;
        });

        ctx.restore();

        // HUD
        ctx.fillStyle = 'rgba(6,12,24,.45)'; ctx.fillRect(0, 0, W, 52);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('🧱 第 ' + level + ' 关', 18, 26);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#bfe9ff'; ctx.fillText('❤ '.repeat(Math.max(0, lives)) || '—', W / 2, 26);
        ctx.textAlign = 'right'; ctx.fillStyle = '#fff';
        ctx.fillText('得分 ' + score, W - 18, 26);

        if (state === 'clear') {
          ctx.fillStyle = 'rgba(6,12,24,.6)'; ctx.fillRect(0, 0, W, H);
          ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 46px system-ui';
          ctx.shadowColor = 'rgba(122,92,255,.9)'; ctx.shadowBlur = 26;
          ctx.fillText('第 ' + level + ' 关通过！', W / 2, H / 2 - 6);
          ctx.font = 'bold 19px system-ui'; ctx.shadowBlur = 0; ctx.fillStyle = '#bfe9ff';
          ctx.fillText('准备进入下一关…', W / 2, H / 2 + 38);
        }
      }

      reset(true);
      env.loop(function (dt) { update(dt); render(); });

      // 指针控制
      function onDown(e) { pointerActive = true; pointerX = env.pointer(e).x; }
      function onMove(e) { if (pointerActive) { pointerX = env.pointer(e).x; e.preventDefault && e.preventDefault(); } }
      function onUp() { pointerActive = false; }
      env.canvas.addEventListener('mousedown', onDown);
      env.canvas.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      env.canvas.addEventListener('touchstart', function (e) { onDown(e); e.preventDefault(); }, { passive: false });
      env.canvas.addEventListener('touchmove', function (e) { onMove(e); e.preventDefault(); }, { passive: false });
      env.canvas.addEventListener('touchend', onUp);

      return {
        start: function () { sfx.play('start'); },
        restart: function () { reset(true); },
        destroy: function () {
          window.removeEventListener('mouseup', onUp);
        }
      };
    }
  });
})();
