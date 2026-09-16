/* ==========================================================================
   飞鸟过管 Flappy Wings —— 一键飞行
   点击 / 空格拍翅，穿越管道阵，碰管即坠 · 分数随速度递增
   ========================================================================== */
(function () {
  'use strict';

  var GRAVITY = 1500;
  var FLAP_V = -430;
  var PIPE_W = 76;
  var GAP = 178;
  var SPACING = 250;
  var GROUND_H = 72;

  GameKit.register({
    id: 'flappy',
    name: { zh: '飞鸟过管', en: 'Flappy Wings' },
    desc: { zh: '一键飞行：轻点拍翅穿越管道阵，手一抖就坠机，看你能飞多远。', en: 'One-tap flying. Flap through the pipes — how far can you go?' },
    genre: { zh: '休闲反应', en: 'Reflex' },
    icon: '🐤', hue: '#38e1ff',
    logical: { w: 560, h: 640 },
    hot: false, isNew: true, sound: 'calm',
    touchControls: ['a'],
    controls: {
      keyboard: [
        { k: 'Space / ↑ / J', zh: '拍打翅膀', en: 'Flap' },
        { k: 'Enter', zh: '拍打翅膀', en: 'Flap' }
      ],
      touch: [{ k: '点击屏幕', zh: '拍打翅膀', en: 'Tap to flap' }]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var FLOOR = H - GROUND_H;

      var state, bird, pipes, score, speed, groundX, cloudX, bobT, over, unbindKey;
      var prev = {}, lastFlapT = 0;

      function reset() {
        state = 'ready';
        bird = { x: 160, y: H * 0.42, vy: 0, r: 15, rot: 0, wing: 0 };
        pipes = [];
        score = 0;
        speed = 155;
        groundX = 0; cloudX = 0; bobT = 0;
        over = false; lastFlapT = 0; prev = {};
        spawnPipe(W + 140);
        env.hud({ score: 0, lives: 1, level: 1, extra: '待命 · 拍翅起飞' });
      }

      function spawnPipe(x) {
        var margin = 64;
        var top = margin + Math.random() * (FLOOR - GAP - margin * 2);
        pipes.push({ x: x, top: top, passed: false });
      }

      function flap() {
        if (over) return;
        if (state === 'ready') {
          state = 'play';
          bird.vy = FLAP_V * 0.8;
          lastFlapT = performance.now();
          sfx.play('jump');
          env.hud({ score: 0, extra: '飞行中' });
          return;
        }
        if (state !== 'play') return;
        bird.vy = FLAP_V;
        bird.wing = 1;
        lastFlapT = performance.now();
        sfx.play('jump');
      }

      /* 键盘 / 触屏统一入口：80ms 冷却去重（防止 onKey 与 pad 边沿重复触发） */
      function doFlap() {
        var now = performance.now();
        if (now - lastFlapT < 80) return;
        flap();
      }

      function die() {
        if (state === 'dead') return;
        state = 'dead';
        sfx.play('hit');
        sfx.play('gameover');
        env.delay(function () {
          if (over) return;
          over = true;
          env.gameOver({ score: score, detail: '穿越 ' + score + ' 根管道' });
        }, 650);
      }

      function circleRect(cx, cy, r, rx, ry, rw, rh) {
        var nx = Math.max(rx, Math.min(cx, rx + rw));
        var ny = Math.max(ry, Math.min(cy, ry + rh));
        var dx = cx - nx, dy = cy - ny;
        return dx * dx + dy * dy < r * r;
      }

      function update(dt) {
        bobT += dt;
        bird.wing = Math.max(0, bird.wing - dt / 0.22);

        if (state === 'ready') {
          bird.y = H * 0.42 + Math.sin(bobT * 3.2) * 9;
          bird.rot = Math.sin(bobT * 3.2) * 0.12;
          groundX = (groundX - speed * dt * 0.5) % 48;
          cloudX = (cloudX - 18 * dt) % W;
          return;
        }

        if (state === 'dead') {
          bird.vy += GRAVITY * dt;
          bird.y = Math.min(FLOOR - bird.r, bird.y + bird.vy * dt);
          bird.rot = Math.min(1.5, bird.rot + dt * 4);
          return;
        }

        /* ---- 飞行中 ---- */
        bird.vy += GRAVITY * dt;
        bird.y += bird.vy * dt;
        bird.rot = Math.max(-0.5, Math.min(1.4, bird.vy / 620));
        if (bird.y < bird.r) { bird.y = bird.r; bird.vy = Math.max(bird.vy, 0); }

        groundX = (groundX - speed * dt) % 48;
        cloudX = (cloudX - (12 + speed * 0.08) * dt) % W;

        var i, p;
        for (i = 0; i < pipes.length; i++) {
          p = pipes[i];
          p.x -= speed * dt;
          if (!p.passed && p.x + PIPE_W < bird.x - bird.r) {
            p.passed = true;
            score++;
            speed = 155 + Math.min(90, score * 3.2);
            sfx.play('coin');
            env.hud({ score: score, extra: '速度 ' + Math.round(speed / 155 * 10) / 10 + 'x' });
          }
        }
        while (pipes.length && pipes[0].x < -PIPE_W - 20) pipes.shift();
        var lastX = pipes.length ? pipes[pipes.length - 1].x : 0;
        if (lastX < W - SPACING) spawnPipe(Math.max(W + 60, lastX + SPACING));

        /* 碰撞：管道 / 地面 */
        for (i = 0; i < pipes.length; i++) {
          p = pipes[i];
          if (circleRect(bird.x, bird.y, bird.r - 2, p.x, -40, PIPE_W, p.top + 40) ||
              circleRect(bird.x, bird.y, bird.r - 2, p.x, p.top + GAP, PIPE_W, FLOOR - p.top - GAP)) {
            die(); return;
          }
        }
        if (bird.y + bird.r >= FLOOR) { bird.y = FLOOR - bird.r; die(); }
      }

      function drawBird() {
        ctx.save();
        ctx.translate(bird.x, bird.y);
        ctx.rotate(bird.rot);
        ctx.shadowColor = 'rgba(255,209,102,.55)'; ctx.shadowBlur = 14;
        ctx.fillStyle = '#ffd166';
        ctx.beginPath(); ctx.ellipse(0, 0, 17, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        /* 翅膀 */
        var wy = bird.wing > 0 ? -10 - bird.wing * 8 : -4;
        ctx.fillStyle = '#ffb020';
        ctx.beginPath(); ctx.ellipse(-4, wy, 9, 6, bird.wing > 0 ? -0.5 : 0.2, 0, Math.PI * 2); ctx.fill();
        /* 眼睛 */
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(7, -5, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#26221c';
        ctx.beginPath(); ctx.arc(8.5, -5, 2.4, 0, Math.PI * 2); ctx.fill();
        /* 喙 */
        ctx.fillStyle = '#ff7b54';
        ctx.beginPath(); ctx.moveTo(14, -1); ctx.lineTo(24, 2); ctx.lineTo(14, 6); ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      function drawPipe(p) {
        var g = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        g.addColorStop(0, '#2ee6a8'); g.addColorStop(0.5, '#59f0c0'); g.addColorStop(1, '#17b381');
        ctx.fillStyle = g;
        ctx.shadowColor = 'rgba(46,230,168,.35)'; ctx.shadowBlur = 12;
        env.roundRect(p.x, -20, PIPE_W, p.top + 20, 8); ctx.fill();
        env.roundRect(p.x, p.top + GAP, PIPE_W, FLOOR - p.top - GAP + 20, 8); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        env.roundRect(p.x + 8, -20, 10, p.top + 20, 5); ctx.fill();
        env.roundRect(p.x + 8, p.top + GAP, 10, FLOOR - p.top - GAP + 20, 5); ctx.fill();
        /* 管口加粗 */
        ctx.fillStyle = '#0f9d72';
        env.roundRect(p.x - 5, p.top - 20, PIPE_W + 10, 20, 6); ctx.fill();
        env.roundRect(p.x - 5, p.top + GAP, PIPE_W + 10, 20, 6); ctx.fill();
      }

      function render() {
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#0c1631'); sky.addColorStop(0.6, '#123058'); sky.addColorStop(1, '#1a3f63');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

        /* 星空 + 云 */
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        for (var s = 0; s < 22; s++) {
          var sx = (s * 97 + 31) % W, sy = (s * 61 + 17) % (H * 0.5);
          ctx.globalAlpha = 0.15 + (s % 4) * 0.1;
          ctx.fillRect(sx, sy, 2, 2);
        }
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#ffffff';
        for (var c = 0; c < 4; c++) {
          var cx = ((cloudX + c * 180) % (W + 120)) - 60, cy = 70 + (c % 3) * 80;
          ctx.beginPath(); ctx.ellipse(cx, cy, 54, 17, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        pipes.forEach(drawPipe);

        /* 地面 */
        var gg = ctx.createLinearGradient(0, FLOOR, 0, H);
        gg.addColorStop(0, '#2b2352'); gg.addColorStop(1, '#191538');
        ctx.fillStyle = gg; ctx.fillRect(0, FLOOR, W, GROUND_H);
        ctx.fillStyle = 'rgba(56,225,255,.35)'; ctx.fillRect(0, FLOOR, W, 2);
        ctx.fillStyle = 'rgba(255,255,255,.06)';
        for (var gx = groundX; gx < W; gx += 48) {
          ctx.beginPath(); ctx.moveTo(gx, FLOOR); ctx.lineTo(gx + 22, FLOOR); ctx.lineTo(gx + 10, H); ctx.lineTo(gx - 12, H); ctx.closePath(); ctx.fill();
        }

        drawBird();

        /* 大分数 */
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 54px Consolas, monospace';
        ctx.fillStyle = 'rgba(255,255,255,.92)';
        ctx.shadowColor = 'rgba(56,225,255,.5)'; ctx.shadowBlur = 16;
        ctx.fillText(String(score), W / 2, 78);
        ctx.shadowBlur = 0;

        if (state === 'ready') {
          var hint = 1 + Math.sin(bobT * 3) * 0.06;
          ctx.save();
          ctx.translate(W / 2, H * 0.62); ctx.scale(hint, hint);
          ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = 'bold 22px system-ui';
          ctx.fillText('点击 / 空格 拍翅起飞', 0, 0);
          ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '14px system-ui';
          ctx.fillText('TAP or SPACE to start', 0, 30);
          ctx.restore();
          /* 起飞手势提示 */
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(W / 2, H * 0.42, 34 + Math.sin(bobT * 4) * 4, 0, Math.PI * 2); ctx.stroke();
        }
      }

      reset();

      /* Space/J/K 已由 engine 映射进 pad（loop 边沿处理），Enter 在此直触发；
         doFlap 的冷却保证两条通道不会重复拍翅 */
      unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        if (e.code === 'Enter' || e.code === 'NumpadEnter' ||
            e.code === 'Space' || e.code === 'KeyJ' || e.code === 'KeyK' ||
            e.code === 'ArrowUp' || e.code === 'KeyW') doFlap();
      });

      env.canvas.addEventListener('pointerdown', function () { doFlap(); });

      env.loop(function (dt) {
        if (env.pad.a && !prev.a) doFlap();
        prev.a = env.pad.a;
        update(dt);
        render();
      });

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 1, level: 1, extra: '准备就绪 · 点击/空格起飞' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); }
      };
    }
  });
})();
