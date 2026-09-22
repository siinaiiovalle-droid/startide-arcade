/* ==========================================================================
   打鸭子 Duck Hunt
   横向飞鸭 · 三条命 · 金鸭双倍 · 连击倍率 · 速度递增波次 · 三难度
   ========================================================================== */
(function () {
  'use strict';

  var CFG = {
    easy:   { ivLo: 1100, ivHi: 1600, vLo: 70,  vHi: 120, ramp: 0.5 },
    normal: { ivLo: 800,  ivHi: 1250, vLo: 100, vHi: 160, ramp: 0.8 },
    hard:   { ivLo: 550,  ivHi: 950,  vLo: 140, vHi: 215, ramp: 1.2 }
  };
  var TOP = 150;

  GameKit.register({
    id: 'duck',
    name: { zh: '打鸭子', en: 'Duck Hunt' },
    desc: { zh: '经典打鸭子：野鸭成群掠过天空，移动准星射击！鸭子飞走扣一条命，三条命用完结束。金色鸭子双倍分，连击提升倍率，看你能守几波！', en: 'Classic Duck Hunt: shoot flying ducks with your crosshair! Missed ducks cost a life — 3 lives total. Golden ducks are worth double!' },
    genre: { zh: '休闲射击', en: 'Shooting' },
    icon: '🦆', hue: '#0284c7',
    logical: { w: 560, h: 700 },
    plays: 5000, hot: false, isNew: true, sound: 'calm',
    script: 'assets/js/games/duck.js',
    ratio: 'portrait', duration: '2-6 分钟',
    touchControls: ['up', 'down', 'left', 'right', 'a', 'b'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!CFG[diff]) diff = 'normal';
      var cfg = CFG[diff];

      var ducks, parts, cross, prev, clouds;
      var time, score, combo, bestCombo, hits, escapedN, lives, spawnT, over, fireCd, spawned;

      function mult() { return 1 + Math.min(4, Math.floor(combo / 3)); }

      function reset() {
        ducks = []; parts = [];
        cross = { x: W / 2, y: H * 0.45 };
        prev = {}; time = 0; score = 0; combo = 0; bestCombo = 0;
        hits = 0; escapedN = 0; lives = 3; spawnT = 600; over = false; fireCd = 0; spawned = 0;
        clouds = [];
        for (var i = 0; i < 5; i++) clouds.push({ x: env.rand(0, W), y: env.rand(30, 240), s: env.rand(0.5, 1.2) });
        env.hud({ score: 0, lives: 3, level: 1, extra: '连击 x1' });
      }

      function spawn(dir, gold, spd) {
        spawned++;
        if (gold === undefined) gold = env.rand(0, 1) < 0.05;
        if (dir === undefined) dir = env.rand(0, 1) < 0.5 ? 1 : -1;
        var prog = Math.min(1, spawned / 40);
        var v = spd || env.rand(cfg.vLo, cfg.vHi) * (1 + prog * cfg.ramp);
        if (gold) v *= 1.25;
        ducks.push({
          x: dir > 0 ? -40 : W + 40,
          y: env.rand(TOP + 40, H - 190),
          vx: dir * v, gold: gold,
          ph: env.rand(0, Math.PI * 2), amp: env.rand(8, 22),
          falling: false, fy: 0, rot: 0, flap: env.rand(0, Math.PI * 2)
        });
      }

      function fire(x, y) {
        if (over || fireCd > 0) return;
        fireCd = 0.12;
        sfx.play('laser');
        var hit = null;
        for (var i = ducks.length - 1; i >= 0; i--) {
          var d = ducks[i];
          if (d.falling) continue;
          var dx = x - d.x, dy = y - d.y;
          if (dx * dx + dy * dy <= 32 * 32) { hit = d; break; }
        }
        if (hit) {
          hit.falling = true; hit.fy = 0;
          combo++; bestCombo = Math.max(bestCombo, combo);
          var pts = hit.gold ? 60 : 25 + Math.round(Math.abs(hit.vx) / 8);
          var gain = pts * mult();
          score += gain; hits++;
          for (var j = 0; j < 8; j++) {
            parts.push({ x: hit.x, y: hit.y, vx: env.rand(-140, 140), vy: env.rand(-140, 40), t: 0, c: hit.gold ? '#fde68a' : '#d1a054' });
          }
          parts.push({ x: hit.x, y: hit.y, vx: 0, vy: -70, t: 0, c: '#fff', txt: '+' + gain });
          sfx.play(hit.gold ? 'coin' : 'hit');
          env.hud({ score: score, lives: lives, level: 1, extra: '连击 x' + mult() });
        } else {
          combo = 0;
          env.hud({ score: score, lives: lives, level: 1, extra: '连击 x1' });
        }
      }

      function update(dt) {
        var i, d;
        if (over) {
          for (i = parts.length - 1; i >= 0; i--) {
            var q = parts[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt;
            if (q.t > 0.8) parts.splice(i, 1);
          }
          return;
        }
        time += dt; fireCd -= dt;
        /* 生成 */
        spawnT -= dt * 1000;
        if (spawnT <= 0) {
          spawn();
          spawnT = env.rand(cfg.ivLo, cfg.ivHi) * (1 - Math.min(0.5, spawned / 50));
        }
        /* 鸭子运动 */
        for (i = ducks.length - 1; i >= 0; i--) {
          d = ducks[i];
          d.flap += dt * 14;
          if (d.falling) {
            d.fy += 900 * dt;
            d.rot += dt * 6;
            d.y += d.fy * dt;
            if (d.y > H - 44) {
              ducks.splice(i, 1);
              sfx.play('land');
            }
            continue;
          }
          d.x += d.vx * dt;
          d.y += Math.sin(time * 2.2 + d.ph) * d.amp * dt;
          if ((d.vx > 0 && d.x > W + 50) || (d.vx < 0 && d.x < -50)) {
            ducks.splice(i, 1);
            lives--; escapedN++;
            sfx.play('warn');
            env.hud({ score: score, lives: lives, level: 1, extra: '连击 x' + mult() });
            if (lives <= 0) {
              over = true;
              sfx.play('gameover');
              env.gameOver({ score: score, detail: '击落 ' + hits + ' 只 · 飞走 ' + escapedN + ' · 最高连击 ' + bestCombo });
              return;
            }
          }
        }
        /* 粒子/云 */
        for (i = parts.length - 1; i >= 0; i--) {
          var p = parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt;
          if (p.t > 0.8) parts.splice(i, 1);
        }
        for (i = 0; i < clouds.length; i++) {
          clouds[i].x += clouds[i].s * 14 * dt;
          if (clouds[i].x > W + 80) clouds[i].x = -80;
        }
        /* 键盘准星 */
        var sp = 430 * dt;
        if (env.pad.left) cross.x -= sp;
        if (env.pad.right) cross.x += sp;
        if (env.pad.up) cross.y -= sp;
        if (env.pad.down) cross.y += sp;
        cross.x = Math.max(14, Math.min(W - 14, cross.x));
        cross.y = Math.max(TOP * 0.55, Math.min(H - 14, cross.y));
        if (env.pad.a && !prev.a) fire(cross.x, cross.y);
        if (env.pad.b && !prev.b) fire(cross.x, cross.y);
        prev.a = env.pad.a; prev.b = env.pad.b;
      }

      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        var K = e.code;
        if (K === 'Space' || K === 'KeyJ' || K === 'Enter' || K === 'NumpadEnter') {
          e.preventDefault();
          fire(cross.x, cross.y);
        }
      });

      env.canvas.addEventListener('pointermove', function (e) {
        var p = env.pointer(e);
        cross.x = Math.max(14, Math.min(W - 14, p.x));
        cross.y = Math.max(TOP * 0.55, Math.min(H - 14, p.y));
      });
      env.canvas.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        var p = env.pointer(e);
        cross.x = Math.max(14, Math.min(W - 14, p.x));
        cross.y = Math.max(TOP * 0.55, Math.min(H - 14, p.y));
        fire(cross.x, cross.y);
      });

      function drawDuck(d) {
        ctx.save();
        ctx.translate(d.x, d.y);
        if (d.falling) ctx.rotate(d.rot);
        var dir = d.vx > 0 ? 1 : -1;
        ctx.scale(dir, 1);
        /* 身体 */
        ctx.fillStyle = d.gold ? '#f59e0b' : '#78350f';
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        /* 头颈 */
        ctx.beginPath();
        ctx.ellipse(14, -12, 8, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(6, -2); ctx.quadraticCurveTo(12, -10, 12, -12);
        ctx.quadraticCurveTo(8, -6, 4, -1);
        ctx.closePath(); ctx.fill();
        /* 嘴 */
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(21, -13); ctx.lineTo(30, -11); ctx.lineTo(21, -8);
        ctx.closePath(); ctx.fill();
        /* 眼 */
        ctx.fillStyle = '#1c1917';
        ctx.beginPath(); ctx.arc(16, -14, 1.8, 0, Math.PI * 2); ctx.fill();
        /* 翅膀（扇动） */
        var wing = Math.sin(d.flap) * 0.9;
        ctx.fillStyle = d.gold ? '#fbbf24' : '#57534e';
        ctx.save();
        ctx.translate(-2, -4);
        ctx.rotate(-0.4 + wing);
        ctx.beginPath();
        ctx.ellipse(-4, -2, 13, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.restore();
      }

      function render() {
        var i;
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#38bdf8'); sky.addColorStop(0.55, '#bae6fd'); sky.addColorStop(1, '#fef9c3');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        /* 太阳 */
        ctx.fillStyle = 'rgba(253,224,71,.9)';
        ctx.beginPath(); ctx.arc(W - 70, 80, 30, 0, Math.PI * 2); ctx.fill();
        /* 云 */
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        for (i = 0; i < clouds.length; i++) {
          var c = clouds[i];
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, 40 * c.s, 14 * c.s, 0, 0, Math.PI * 2);
          ctx.ellipse(c.x + 24 * c.s, c.y - 7 * c.s, 26 * c.s, 12 * c.s, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        /* 远山 */
        ctx.fillStyle = 'rgba(22,101,52,.35)';
        ctx.beginPath();
        ctx.moveTo(0, H - 60);
        ctx.lineTo(90, H - 170); ctx.lineTo(210, H - 60);
        ctx.lineTo(330, H - 200); ctx.lineTo(460, H - 60);
        ctx.lineTo(560, H - 140); ctx.lineTo(560, H); ctx.lineTo(0, H);
        ctx.closePath(); ctx.fill();
        /* 草地 */
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(0, H - 56, W, 56);
        ctx.fillStyle = '#22c55e';
        for (i = 0; i < 12; i++) {
          var gx = i * 50 + 10;
          ctx.beginPath();
          ctx.moveTo(gx, H - 56); ctx.lineTo(gx + 7, H - 74); ctx.lineTo(gx + 14, H - 56);
          ctx.closePath(); ctx.fill();
        }
        /* 树 */
        ctx.fillStyle = '#92400e';
        ctx.fillRect(56, H - 120, 14, 66);
        ctx.fillStyle = '#16a34a';
        ctx.beginPath(); ctx.arc(63, H - 138, 34, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(40, H - 118, 24, 0, Math.PI * 2); ctx.fill();

        for (i = 0; i < ducks.length; i++) drawDuck(ducks[i]);

        /* 粒子 */
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (i = 0; i < parts.length; i++) {
          var p = parts[i];
          ctx.globalAlpha = Math.max(0, 1 - p.t / 0.8);
          if (p.txt) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 17px system-ui';
            ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3;
            ctx.strokeText(p.txt, p.x, p.y);
            ctx.fillText(p.txt, p.x, p.y);
          } else {
            ctx.fillStyle = p.c;
            ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
          }
          ctx.globalAlpha = 1;
        }

        /* 准星 */
        if (!over) {
          ctx.strokeStyle = 'rgba(185,28,28,.92)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cross.x, cross.y, 16, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cross.x - 24, cross.y); ctx.lineTo(cross.x - 9, cross.y);
          ctx.moveTo(cross.x + 9, cross.y); ctx.lineTo(cross.x + 24, cross.y);
          ctx.moveTo(cross.x, cross.y - 24); ctx.lineTo(cross.x, cross.y - 9);
          ctx.moveTo(cross.x, cross.y + 9); ctx.lineTo(cross.x, cross.y + 24);
          ctx.stroke();
        }

        /* 顶部信息 */
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(30,50,70,.6)'; ctx.font = '13px system-ui';
        ctx.fillText('得分', 24, 34);
        ctx.fillStyle = '#0f2a44'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(String(score), 24, 68);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(30,50,70,.6)'; ctx.font = '13px system-ui';
        ctx.fillText('命数', W - 24, 34);
        ctx.font = 'bold 26px system-ui';
        ctx.fillText(lives > 0 ? '❤'.repeat(lives) : '—', W - 24, 66);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(30,50,70,.55)'; ctx.font = '13px system-ui';
        ctx.fillText((diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通') + ' · 移动准星 点击/空格射击 · 飞走 3 只结束', W / 2, 120);
      }

      reset();

      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        spawn: spawn,
        fire: fire,
        setCross: function (x, y) { cross.x = x; cross.y = y; },
        list: function () { return ducks.map(function (d) { return { x: d.x, y: d.y, falling: d.falling, gold: d.gold }; }); },
        state: function () {
          return { over: over, score: score, hits: hits, escaped: escapedN, lives: lives, n: ducks.length, combo: combo };
        }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 3, level: 1, extra: '连击 x1' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
