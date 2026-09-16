/* ==========================================================================
   霓虹弹珠台 Neon Pinball —— 街机弹珠
   自制轻量物理：线段碰撞 + 挡板动量传递 + 多子步积分
   ← → 挡板 · Space 发射 · 3 球机会 · Bumper 连击得分
   ========================================================================== */
(function () {
  'use strict';

  var G = 1050;           // 重力
  var BALL_R = 11;
  var MAX_V = 1500;

  /* 战场墙体（封闭顶部，底部开放为漏斗） */
  var SEGS = [
    { x1: 36, y1: 140, x2: 36, y2: 500 },      // 左墙
    { x1: 36, y1: 140, x2: 150, y2: 64 },      // 左上斜坡
    { x1: 150, y1: 64, x2: 455, y2: 64 },      // 顶棚
    { x1: 455, y1: 64, x2: 524, y2: 118 },     // 发射道导流（左上→右下，把球折进主战场）
    { x1: 524, y1: 64, x2: 524, y2: 690 },     // 右外墙
    { x1: 455, y1: 118, x2: 455, y2: 500 },    // 发射道内壁
    { x1: 455, y1: 690, x2: 524, y2: 690 },    // 发射道底
    { x1: 36, y1: 500, x2: 150, y2: 592 },     // 左下坡
    { x1: 455, y1: 500, x2: 410, y2: 592 }     // 右下坡
  ];

  /* 弹射器（三角，踢球加分） */
  var SLINGS = [
    { ax: 168, ay: 468, bx: 226, by: 552, cx: 168, cy: 552, x1: 168, y1: 468, x2: 226, y2: 552 },
    { ax: 392, ay: 552, bx: 334, by: 468, cx: 392, cy: 468, x1: 392, y1: 552, x2: 334, y2: 468 }
  ];

  var BUMPERS = [
    { x: 210, y: 240, r: 27, pts: 30 },
    { x: 350, y: 240, r: 27, pts: 30 },
    { x: 280, y: 338, r: 24, pts: 50 }
  ];

  GameKit.register({
    id: 'pinball',
    name: { zh: '霓虹弹珠台', en: 'Neon Pinball' },
    desc: { zh: '街机弹珠：挡板翻转弹射，Bumper 连击得分，3 球机会挑战最高分。', en: 'Arcade pinball. Flip, bounce and rack up bumper combos with 3 balls.' },
    genre: { zh: '街机弹珠', en: 'Arcade' },
    icon: '🎱', hue: '#ff4d9d',
    logical: { w: 560, h: 720 },
    hot: false, isNew: true, sound: 'battle',
    touchControls: ['left', 'right', 'a'],
    controls: {
      keyboard: [
        { k: '← / →', zh: '左 / 右挡板', en: 'Left / right flipper' },
        { k: 'Space / ↓', zh: '发射弹珠', en: 'Launch ball' }
      ],
      touch: [
        { k: '点左半屏', zh: '左挡板', en: 'Left flipper' },
        { k: '点右半屏', zh: '右挡板', en: 'Right flipper' },
        { k: '点击发射区', zh: '发射弹珠', en: 'Tap to launch' }
      ]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;

      var ball, flippers, state, balls, score, msg, msgColor;
      var bumpHits, stillT, over, prev, leftPulse, rightPulse, floats, plungerC;
      var bumpFlash = [0, 0, 0], slingFlash = [0, 0];

      function makeFlippers() {
        return [
          { px: 150, py: 592, len: 98, rest: 0.56, up: -0.45, a: 0.56, omega: 0, side: 'left' },
          { px: 410, py: 592, len: 98, rest: Math.PI - 0.56, up: Math.PI + 0.45, a: Math.PI - 0.56, omega: 0, side: 'right' }
        ];
      }

      function reset() {
        ball = { x: 490, y: 654, vx: 0, vy: 0 };
        flippers = makeFlippers();
        state = 'ready'; balls = 3; score = 0; bumpHits = 0;
        stillT = 0; over = false; prev = {};
        leftPulse = 0; rightPulse = 0; plungerC = 0;
        floats = [];
        bumpFlash = [0, 0, 0]; slingFlash = [0, 0];
        msg = 'Space / ↓ 或点击发射'; msgColor = 'rgba(255,209,102,.9)';
        env.hud({ score: 0, lives: 3, level: 1, extra: '第 1 球 · 待发射' });
      }

      function addFloat(x, y, txt, color) {
        floats.push({ x: x, y: y, txt: txt, color: color || '#ff4d9d', t: 1 });
      }

      function launch() {
        if (over || state !== 'ready') return;
        state = 'play';
        ball.vx = -20 - Math.random() * 45;
        ball.vy = -(1380 + Math.random() * 220);
        plungerC = 1;
        msg = ''; sfx.play('shoot');
        env.hud({ score: score, lives: balls, extra: '第 ' + (4 - balls) + ' 球' });
      }

      function loseBall() {
        if (over || state === 'lost') return;
        /* 立刻停机，否则球停在界外会被逐帧重复判丢 */
        state = 'lost';
        balls--;
        sfx.play('explosion');
        env.hud({ score: score, lives: Math.max(0, balls) });
        if (balls > 0) {
          msg = '球丢失 · 剩 ' + balls + ' 球'; msgColor = '#ff5d6c';
          env.delay(function () {
            if (over) return;
            ball.x = 490; ball.y = 654; ball.vx = 0; ball.vy = 0;
            flippers = makeFlippers();
            state = 'ready';
            msg = 'Space / ↓ 或点击发射';
            env.hud({ extra: '第 ' + (4 - balls) + ' 球 · 待发射' });
          }, 600);
        } else {
          over = true;
          env.gameOver({ score: score, detail: '3 球用尽 · Bumper 撞击 ' + bumpHits + ' 次' });
        }
      }

      /* ---------- 碰撞 ---------- */
      function collideSeg(s, e, kick, kickIdx) {
        var dx = s.x2 - s.x1, dy = s.y2 - s.y1;
        var len2 = dx * dx + dy * dy || 1;
        var t = ((ball.x - s.x1) * dx + (ball.y - s.y1) * dy) / len2;
        t = t < 0 ? 0 : (t > 1 ? 1 : t);
        var qx = s.x1 + dx * t, qy = s.y1 + dy * t;
        var nx = ball.x - qx, ny = ball.y - qy;
        var d2 = nx * nx + ny * ny;
        if (d2 > BALL_R * BALL_R) return false;
        var d = Math.sqrt(d2) || 0.001;
        nx /= d; ny /= d;
        ball.x = qx + nx * (BALL_R + 0.5);
        ball.y = qy + ny * (BALL_R + 0.5);
        var vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) {
          ball.vx -= (1 + e) * vn * nx;
          ball.vy -= (1 + e) * vn * ny;
        }
        if (kick) {
          ball.vx += nx * 640; ball.vy += ny * 640;
          score += 10; slingFlash[kickIdx] = 1;
          sfx.play('punch');
          addFloat(qx, qy - 16, '+10', '#ffb020');
          env.hud({ score: score });
        }
        return true;
      }

      function collideFlipper(f, dt) {
        var tx = f.px + Math.cos(f.a) * f.len;
        var ty = f.py + Math.sin(f.a) * f.len;
        var dx = tx - f.px, dy = ty - f.py;
        var len2 = dx * dx + dy * dy;
        var t = ((ball.x - f.px) * dx + (ball.y - f.py) * dy) / len2;
        t = t < 0 ? 0 : (t > 1 ? 1 : t);
        var qx = f.px + dx * t, qy = f.py + dy * t;
        var nx = ball.x - qx, ny = ball.y - qy;
        var d2 = nx * nx + ny * ny;
        if (d2 > BALL_R * BALL_R) return;
        var d = Math.sqrt(d2) || 0.001;
        nx /= d; ny /= d;
        ball.x = qx + nx * (BALL_R + 0.5);
        ball.y = qy + ny * (BALL_R + 0.5);
        /* 挡板表面速度（旋转动量传递） */
        var rx = qx - f.px, ry = qy - f.py;
        var svx = -ry * f.omega, svy = rx * f.omega;
        var rvx = ball.vx - svx, rvy = ball.vy - svy;
        var vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          ball.vx -= (1 + 0.45) * vn * nx;
          ball.vy -= (1 + 0.45) * vn * ny;
        }
        /* 保证最低弹出速度，手感更弹 */
        var out = ball.vx * nx + ball.vy * ny;
        if (out < 230) { ball.vx += (230 - out) * nx; ball.vy += (230 - out) * ny; }
        sfx.play('bounce');
      }

      function collideBumper(b, idx) {
        var nx = ball.x - b.x, ny = ball.y - b.y;
        var d2 = nx * nx + ny * ny;
        var rr = b.r + BALL_R;
        if (d2 > rr * rr) return;
        var d = Math.sqrt(d2) || 0.001;
        nx /= d; ny /= d;
        ball.x = b.x + nx * (rr + 0.5);
        ball.y = b.y + ny * (rr + 0.5);
        var vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) {
          ball.vx -= (1 + 1.1) * vn * nx;
          ball.vy -= (1 + 1.1) * vn * ny;
        }
        var out = ball.vx * nx + ball.vy * ny;
        if (out < 420) { ball.vx += (420 - out) * nx; ball.vy += (420 - out) * ny; }
        bumpHits++;
        bumpFlash[idx] = 1;
        score += b.pts;
        sfx.play(b.pts >= 50 ? 'coin' : 'bounce');
        addFloat(b.x, b.y - b.r - 10, '+' + b.pts, b.pts >= 50 ? '#ffd166' : '#ff4d9d');
        env.hud({ score: score, extra: 'Bumper x' + bumpHits });
      }

      /* ---------- 物理步进 ---------- */
      function physics(dt) {
        var SUB = 5, sdt = dt / SUB;
        for (var s = 0; s < SUB; s++) {
          ball.vy += G * sdt;
          var sp = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          if (sp > MAX_V) { ball.vx *= MAX_V / sp; ball.vy *= MAX_V / sp; }
          ball.x += ball.vx * sdt;
          ball.y += ball.vy * sdt;

          for (var i = 0; i < SEGS.length; i++) collideSeg(SEGS[i], 0.55, false);
          for (i = 0; i < SLINGS.length; i++) collideSeg(SLINGS[i], 0.5, true, i);
          for (i = 0; i < flippers.length; i++) collideFlipper(flippers[i], dt);
          for (i = 0; i < BUMPERS.length; i++) collideBumper(BUMPERS[i], i);
        }

        /* 出界兜底 → 按丢球处理 */
        if (ball.y - BALL_R > H + 24 || ball.x < -40 || ball.x > W + 40 || ball.y < -80) { loseBall(); return; }

        /* 卡球自动救援 */
        sp = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        var inLane = ball.x > 460 && ball.y > 600;
        if (sp < 30 && !inLane) {
          stillT += dt;
          if (stillT > 2.5) {
            ball.vx += (Math.random() - 0.5) * 320;
            ball.vy -= 240;
            stillT = 0;
            sfx.play('warn');
          }
        } else stillT = 0;

        /* 回到发射道底部可再发射 */
        if (inLane && sp < 80 && state === 'play') {
          state = 'ready';
          msg = 'Space / ↓ 或点击发射';
          env.hud({ extra: '待发射' });
        }
      }

      function edge(keys) {
        var hit = null;
        keys.forEach(function (k) {
          if (env.pad[k] && !prev[k]) hit = k;
          prev[k] = env.pad[k];
        });
        return hit;
      }

      function update(dt) {
        /* 挡板角度 */
        var actL = env.pad.left || leftPulse > 0;
        var actR = env.pad.right || rightPulse > 0;
        leftPulse = Math.max(0, leftPulse - dt);
        rightPulse = Math.max(0, rightPulse - dt);
        for (var i = 0; i < flippers.length; i++) {
          var f = flippers[i];
          var target = (f.side === 'left' ? actL : actR) ? f.up : f.rest;
          var diff = target - f.a;
          var maxStep = 15 * dt;
          var step = diff > 0 ? Math.min(diff, maxStep) : Math.max(diff, -maxStep);
          f.omega = dt > 0 ? step / dt : 0;
          f.a += step;
        }
        plungerC = Math.max(0, plungerC - dt * 2.4);

        for (i = floats.length - 1; i >= 0; i--) {
          var fl = floats[i]; fl.t -= dt / 0.8; fl.y -= dt * 46;
          if (fl.t <= 0) floats.splice(i, 1);
        }
        for (i = 0; i < 3; i++) bumpFlash[i] = Math.max(0, bumpFlash[i] - dt * 3);
        for (i = 0; i < 2; i++) slingFlash[i] = Math.max(0, slingFlash[i] - dt * 3);

        if (over) return;

        /* 发射输入 */
        var act = edge(['a', 'down']);
        if (act === 'a' || act === 'down') doLaunch();

        if (state === 'play') physics(dt);

        /* 挡板音效只在击球时触发（collideFlipper 内），这里不重复 */
      }

      /* ---------- 渲染 ---------- */
      function drawWalls() {
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(255,77,157,.55)'; ctx.shadowBlur = 12;
        ctx.strokeStyle = 'rgba(255,77,157,.9)'; ctx.lineWidth = 5;
        for (var i = 0; i < SEGS.length; i++) {
          var s = SEGS[i];
          ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }

      function drawSling(s, idx) {
        var f = slingFlash[idx];
        ctx.fillStyle = f > 0 ? 'rgba(255,209,102,' + (0.6 + f * 0.4) + ')' : 'rgba(255,176,32,.75)';
        ctx.shadowColor = 'rgba(255,176,32,.6)'; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(s.ax, s.ay); ctx.lineTo(s.bx, s.by); ctx.lineTo(s.cx, s.cy);
        ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0;
      }

      function drawBumper(b, idx) {
        var f = bumpFlash[idx];
        var pulse = 1 + Math.sin(performance.now() / 220 + idx) * 0.05;
        var r = b.r * pulse;
        ctx.fillStyle = f > 0 ? '#ffffff' : 'rgba(255,77,157,.22)';
        ctx.shadowColor = f > 0 ? 'rgba(255,255,255,.9)' : 'rgba(255,77,157,.7)';
        ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = f > 0 ? '#ffffff' : 'rgba(255,77,157,.9)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(b.x, b.y, r - 4, 0, Math.PI * 2); ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = 'bold 13px system-ui';
        ctx.fillText(String(b.pts), b.x, b.y + 1);
      }

      function drawFlipper(f) {
        var tx = f.px + Math.cos(f.a) * f.len;
        var ty = f.py + Math.sin(f.a) * f.len;
        ctx.strokeStyle = '#38e1ff';
        ctx.lineWidth = 17; ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(56,225,255,.75)'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.moveTo(f.px, f.py); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.arc(f.px, f.py, 4, 0, Math.PI * 2); ctx.fill();
      }

      function drawBall() {
        var g = ctx.createRadialGradient(ball.x - 3, ball.y - 4, 2, ball.x, ball.y, BALL_R);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#8fa3c8');
        ctx.fillStyle = g;
        ctx.shadowColor = 'rgba(255,255,255,.6)'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      function drawPlunger() {
        var baseY = 700, topY = 672 + plungerC * 16;
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2.5;
        for (var i = 0; i < 4; i++) {
          var y1 = baseY - i * 7, y2 = y1 - 5;
          ctx.beginPath();
          ctx.moveTo(482, y1); ctx.lineTo(498, y2);
          ctx.stroke();
        }
        ctx.fillStyle = '#ffb020';
        env.roundRect(476, topY, 28, 10, 4); ctx.fill();
        if (state === 'ready') {
          var pulse = 0.5 + Math.sin(performance.now() / 200) * 0.5;
          ctx.fillStyle = 'rgba(255,209,102,' + (0.35 + pulse * 0.5) + ')';
          ctx.beginPath();
          ctx.moveTo(490, 618); ctx.lineTo(500, 634); ctx.lineTo(480, 634);
          ctx.closePath(); ctx.fill();
        }
      }

      function render() {
        var bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#180a1e'); bg.addColorStop(0.55, '#26092b'); bg.addColorStop(1, '#150618');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        /* 漏斗底部警示 */
        var dg = ctx.createLinearGradient(0, 600, 0, H);
        dg.addColorStop(0, 'rgba(255,93,108,0)'); dg.addColorStop(1, 'rgba(255,93,108,.16)');
        ctx.fillStyle = dg; ctx.fillRect(0, 600, W, H - 600);

        drawWalls();
        SLINGS.forEach(drawSling);
        BUMPERS.forEach(drawBumper);
        flippers.forEach(drawFlipper);
        drawPlunger();
        if (state !== 'lost') drawBall();

        floats.forEach(function (f) {
          ctx.globalAlpha = Math.max(0, f.t);
          ctx.fillStyle = f.color; ctx.font = 'bold 20px system-ui';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(f.txt, f.x, f.y);
          ctx.globalAlpha = 1;
        });

        if (msg) {
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = msgColor; ctx.font = 'bold 20px system-ui';
          ctx.fillText(msg, W / 2, 560);
        }

        /* HUD */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('得分', 20, 22);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 26px Consolas, monospace';
        ctx.fillText(String(score), 20, 46);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('弹珠', W - 20, 22);
        var icon = '';
        for (var i = 0; i < Math.max(0, balls); i++) icon += '●';
        for (i = 0; i < Math.max(0, 3 - balls); i++) icon += '○';
        ctx.fillStyle = '#38e1ff'; ctx.font = 'bold 20px system-ui';
        ctx.fillText(icon, W - 20, 46);
      }

      reset();

      /* 键盘 / 触屏统一入口：冷却去重，避免 onKey 与 pad 边沿重复发射 */
      var lastLaunchT = 0;
      function doLaunch() {
        var now = performance.now();
        if (over || state !== 'ready' || now - lastLaunchT < 120) return;
        lastLaunchT = now;
        launch();
      }

      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        if (e.code === 'Enter' || e.code === 'NumpadEnter' ||
            e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK' ||
            e.code === 'ArrowDown' || e.code === 'KeyS') doLaunch();
      });

      env.canvas.addEventListener('pointerdown', function (e) {
        if (over) return;
        var p = env.pointer(e);
        if (state === 'ready') { doLaunch(); return; }
        if (p.x < W / 2) leftPulse = 0.18;
        else rightPulse = 0.18;
      });

      env.loop(function (dt) { update(dt); render(); });

      return {
        start: function () {
          sfx.play('start');
          /* play.html 启动时会用 renderHud({score:0}) 覆盖一次 HUD，这里补同步 */
          env.hud({ score: score, lives: balls, level: 1, extra: '第 ' + (4 - balls) + ' 球 · 待发射' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); }
      };
    }
  });
})();
