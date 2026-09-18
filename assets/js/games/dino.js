/* ==========================================================================
   恐龙跑酷 Dino Run —— 无限奔跑：跳过仙人掌、下蹲躲翼龙，速度越跑越快
   键盘：Space/↑/J/Enter 跳，↓/S 下蹲；触屏：点按跳跃、按住 B 下蹲
   ========================================================================== */
(function () {
  'use strict';

  var W = 700, H = 420, GY = 344;            // 地面
  var G = 2300, JUMP_V = -840;
  var DINO_X = 84;

  function readDifficulty() {
    try {
      var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
      return (gc && gc.difficulty) || 'normal';
    } catch (e) { return 'normal'; }
  }
  function diffLabel(d) { return d === 'easy' ? '简单' : (d === 'hard' ? '困难' : '普通'); }

  GameKit.register({
    id: 'dino',
    name: { zh: '恐龙跑酷', en: 'Dino Run' },
    desc: { zh: '无限奔跑：小恐龙跳过仙人掌、下蹲躲过低飞的翼龙，速度越快分涨得越猛。', en: 'Endless runner. Leap over cacti, duck under pterodactyls, and outpace the speed-up.' },
    genre: { zh: '休闲跑酷', en: 'Runner' },
    icon: '🦖', hue: '#ffb020',
    logical: { w: 700, h: 420 },
    hot: false, isNew: true, sound: 'calm',
    touchControls: ['a', 'b'],
    controls: {
      keyboard: [
        { k: 'Space / ↑ / J / Enter', zh: '跳跃', en: 'Jump' },
        { k: '↓ / S', zh: '按住下蹲躲翼龙', en: 'Hold to duck' }
      ],
      touch: [
        { k: '点按屏幕', zh: '跳跃', en: 'Tap to jump' },
        { k: 'B 键按住', zh: '下蹲', en: 'Hold to duck' }
      ]
    },

    create: function (env) {
      var ctx = env.ctx, sfx = env.sfx;
      var dino, obs, clouds, parts, speed, dist, score, state, over;
      var prev, keyUnbind, nextGap, milestone, flash, groundOff, t, bobT;
      var minGap = 340, maxGap = 660;

      function applyDifficulty() {
        var d = readDifficulty();
        if (d === 'easy') { minGap = 430; maxGap = 800; }
        else if (d === 'hard') { minGap = 280; maxGap = 540; }
        else { minGap = 340; maxGap = 660; }
      }

      function syncHud(extra) {
        env.hud({
          score: score, lives: 0, level: Math.floor(speed / 100) - 1,
          extra: extra || ('速度 ' + Math.round(speed) + ' · 难度' + diffLabel(readDifficulty()))
        });
      }

      function jump() {
        if (over || state === 'jump') return;
        state = 'jump';
        dino.vy = JUMP_V;
        dino.duck = false;
        sfx.play('jump');
      }

      function reset() {
        applyDifficulty();
        dino = { y: GY, vy: 0, duck: false };
        obs = []; clouds = []; parts = [];
        for (var i = 0; i < 4; i++) clouds.push({ x: Math.random() * W, y: 40 + Math.random() * 130, s: 0.4 + Math.random() * 0.5 });
        speed = 320; dist = 0; score = 0; milestone = 100;
        state = 'run'; over = false;
        prev = {}; nextGap = 620; flash = 0; groundOff = 0; t = 0; bobT = 0;
        syncHud('按 Space / 点按屏幕起跳');
      }

      function spawnObstacle() {
        var bird = dist > 260 && Math.random() < 0.28;
        if (bird) {
          obs.push({
            kind: 'bird', x: W + 60, w: 42, h: 26,
            y: GY - (Math.random() < 0.5 ? 14 : 74),
            flap: 0
          });
        } else {
          var n = Math.random() < 0.35 ? 2 : 1;             // 有时一丛两棵
          var cw = n === 2 ? 52 : 26;
          var ch = 38 + Math.random() * 22 + (n === 2 ? 8 : 0);
          obs.push({ kind: 'cactus', x: W + 60, w: cw, h: ch, y: GY + 2 - ch, n: n });
        }
        nextGap = (minGap + Math.random() * (maxGap - minGap)) * (320 / speed) + speed * 0.35;
      }

      function die() {
        if (over) return;
        over = true;
        sfx.play('explosion');
        for (var i = 0; i < 20; i++) {
          var a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 240;
          parts.push({ x: DINO_X + 20, y: dino.y - 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.5 + Math.random() * 0.4 });
        }
        env.delay(function () {
          env.gameOver({ score: score, detail: '跑了 ' + Math.round(dist / 24) + ' 米' });
        }, 500);
      }

      function hitbox() {
        return dino.duck && state !== 'jump'
          ? { x: DINO_X + 4, y: dino.y - 26, w: 40, h: 24 }
          : { x: DINO_X + 8, y: dino.y - 50, w: 28, h: 48 };
      }

      function update(dt) {
        t += dt; bobT += dt;
        if (flash > 0) flash -= dt;
        speed = Math.min(700, speed + dt * 9);
        dist += speed * dt;
        var ns = Math.floor(dist / 12);
        if (ns !== score) {
          score = ns;
          if (score >= milestone) { milestone += 100; sfx.play('levelup'); flash = 0.5; }
          syncHud();
        }
        groundOff = (groundOff + speed * dt) % 48;

        /* 输入 */
        if (env.pad.a && !prev.a) jump();
        if (!env.pad.a && prev.a && state === 'jump' && dino.vy < -320) dino.vy = -320; // 松手短跳
        prev.a = env.pad.a;
        dino.duck = !!env.pad.down && state !== 'jump';

        /* 物理 */
        if (state === 'jump') {
          dino.vy += G * dt;
          dino.y += dino.vy * dt;
          if (dino.y >= GY) { dino.y = GY; state = 'run'; sfx.play('land'); }
        }

        /* 障碍 */
        nextGap -= speed * dt;
        if (nextGap <= 0) spawnObstacle();
        var hb = hitbox();
        for (var i = obs.length - 1; i >= 0; i--) {
          var o = obs[i];
          o.x -= speed * dt * (o.kind === 'bird' ? 1.25 : 1);
          if (o.kind === 'bird') o.flap += dt * 9;
          if (o.x + o.w < -20) { obs.splice(i, 1); continue; }
          if (hb.x < o.x + o.w && hb.x + hb.w > o.x && hb.y < o.y + o.h && hb.y + hb.h > o.y) { die(); return; }
        }

        clouds.forEach(function (c) {
          c.x -= speed * 0.18 * c.s * dt;
          if (c.x < -80) { c.x = W + 40; c.y = 40 + Math.random() * 130; }
        });

        for (i = parts.length - 1; i >= 0; i--) {
          var p = parts[i];
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt;
          if (p.life <= 0) parts.splice(i, 1);
        }
      }

      function render() {
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0d1b33'); bg.addColorStop(0.7, '#14335c'); bg.addColorStop(1, '#1b4a63');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        /* 星与云 */
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        for (var s = 0; s < 26; s++) {
          ctx.globalAlpha = 0.08 + (s % 5) * 0.06;
          ctx.fillRect((s * 137 + 40) % W, (s * 53 + 11) % 200, 2, 2);
        }
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = '#fff';
        clouds.forEach(function (c) {
          ctx.beginPath(); ctx.ellipse(c.x, c.y, 44 * c.s + 16, 12 * c.s + 5, 0, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        /* 地面 */
        ctx.fillStyle = '#22434f';
        ctx.fillRect(0, GY + 14, W, H - GY);
        ctx.fillStyle = '#2ee6a8';
        ctx.fillRect(0, GY + 12, W, 3);
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        for (var dsh = 0; dsh < W / 48 + 2; dsh++) ctx.fillRect(dsh * 48 - groundOff, GY + 26, 26, 3);

        /* 障碍 */
        obs.forEach(function (o) {
          if (o.kind === 'cactus') {
            ctx.fillStyle = '#3ecf78';
            if (o.n === 2) {
              ctx.fillRect(o.x, o.y + 12, 16, o.h - 12);
              ctx.fillRect(o.x + 30, o.y, 18, o.h);
            } else {
              env.roundRect(o.x, o.y, 22, o.h, 6); ctx.fill();
            }
            ctx.fillStyle = 'rgba(255,255,255,.2)';
            ctx.fillRect(o.x + 4, o.y + 4, 4, o.h - 10);
          } else {
            var up = Math.sin(o.flap) > 0;
            ctx.fillStyle = '#ff5d73';
            ctx.beginPath();
            ctx.ellipse(o.x + 21, o.y + 13, 17, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffb020';
            ctx.beginPath();
            if (up) { ctx.moveTo(o.x + 14, o.y + 12); ctx.lineTo(o.x + 30, o.y - 8); ctx.lineTo(o.x + 30, o.y + 12); }
            else { ctx.moveTo(o.x + 14, o.y + 12); ctx.lineTo(o.x + 30, o.y + 30); ctx.lineTo(o.x + 30, o.y + 12); }
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(o.x + 30, o.y + 10, 2.4, 0, Math.PI * 2); ctx.fill();
          }
        });

        /* 恐龙 */
        var dy = dino.y;
        ctx.save();
        ctx.translate(DINO_X, dy);
        if (dino.duck && state !== 'jump') {
          ctx.fillStyle = '#ffd166';
          env.roundRect(-2, -26, 46, 24, 8); ctx.fill();
          ctx.fillStyle = '#ff9f43';
          ctx.beginPath(); ctx.arc(38, -20, 9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#26221c';
          ctx.beginPath(); ctx.arc(41, -22, 2, 0, Math.PI * 2); ctx.fill();
        } else {
          var run = state === 'run' ? Math.sin(bobT * 16) * 5 : 0;
          ctx.fillStyle = '#ffd166';
          env.roundRect(0, -50, 30, 48, 9); ctx.fill();
          ctx.fillRect(6 + run, -4, 8, 6); ctx.fillRect(18 - run, -4, 8, 6);
          ctx.fillStyle = '#ff9f43';
          ctx.beginPath(); ctx.arc(24, -56, 11, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(30, -52); ctx.lineTo(44, -46); ctx.lineTo(30, -42); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#26221c';
          ctx.beginPath(); ctx.arc(28, -58, 2.2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffd166';
          ctx.beginPath(); ctx.moveTo(2, -46); ctx.quadraticCurveTo(-18, -40, -12, -18); ctx.quadraticCurveTo(-6, -30, 4, -32); ctx.closePath(); ctx.fill();
        }
        ctx.restore();

        /* 粒子 */
        parts.forEach(function (p) {
          ctx.globalAlpha = Math.max(0, p.life * 2);
          ctx.fillStyle = '#ff8a5c';
          ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
        });
        ctx.globalAlpha = 1;

        /* 里程碑闪光 */
        if (flash > 0) {
          ctx.fillStyle = 'rgba(255,209,102,' + flash * 0.35 + ')';
          ctx.fillRect(0, 0, W, H);
        }

        /* 分数 */
        ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.font = 'bold 26px Consolas, monospace';
        ctx.fillStyle = 'rgba(255,255,255,.92)';
        ctx.fillText('HI ' + env.best + '  ' + score, W - 22, 18);

        if (score === 0 && !over) {
          env.text('按 Space / 点按屏幕起跳 · ↓ 下蹲', W / 2, 120, { font: 'bold 19px system-ui', color: 'rgba(255,255,255,.85)', align: 'center', shadow: true });
        }
      }

      reset();

      keyUnbind = env.onKey(function (e, type) {
        if (over) return;
        if ((e.code === 'Enter' || e.code === 'NumpadEnter') && type === 'down') jump();
      });

      function pointerJump() { jump(); }

      env.canvas.addEventListener('pointerdown', pointerJump);
      env.canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

      env.loop(function (dt) {
        update(dt);
        render();
      });

      return {
        start: function () {
          sfx.play('start');
          syncHud('按 Space / 点按屏幕起跳 · 难度' + diffLabel(readDifficulty()));
        },
        restart: function () { reset(); },
        destroy: function () {
          if (keyUnbind) keyUnbind();
          env.canvas.removeEventListener('pointerdown', pointerJump);
        }
      };
    }
  });
})();
