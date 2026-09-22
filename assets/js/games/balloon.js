/* ==========================================================================
   气球射击 Balloon Shoot
   升空气球 · 十字准星 · 连击倍率 · 金球奖励 · 限时挑战 · 三难度
   ========================================================================== */
(function () {
  'use strict';

  var CFG = {
    easy:   { dur: 45, ivLo: 850,  ivHi: 1250, vLo: 55,  vHi: 95,  ramp: 0.35 },
    normal: { dur: 60, ivLo: 620,  ivHi: 980,  vLo: 70,  vHi: 130, ramp: 0.5 },
    hard:   { dur: 60, ivLo: 460,  ivHi: 800,  vLo: 95,  vHi: 175, ramp: 0.7 }
  };
  var PALETTE = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'];
  var TOP = 150;

  GameKit.register({
    id: 'balloon',
    name: { zh: '气球射击', en: 'Balloon Shoot' },
    desc: { zh: '五彩气球不断升空，移动准星点击射击！连击提升倍率，金色气球 5 倍分，限时内尽可能多击破。漏掉的气球越多越可惜！', en: 'Balloons keep rising — aim and shoot! Combo for multipliers, golden balloons worth 5x. Pop as many as you can in time!' },
    genre: { zh: '休闲射击', en: 'Shooting' },
    icon: '🎈', hue: '#e11d48',
    logical: { w: 560, h: 700 },
    plays: 5000, hot: false, isNew: true, sound: 'calm',
    script: 'assets/js/games/balloon.js',
    ratio: 'portrait', duration: '1-3 分钟',
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

      var balloons, parts, cross, prev;
      var time, score, combo, bestCombo, popped, escaped, spawnT, over, fireCd;

      function mult() { return 1 + Math.min(4, Math.floor(combo / 3)); }

      function reset() {
        balloons = []; parts = [];
        cross = { x: W / 2, y: H * 0.62 };
        prev = {}; time = 0; score = 0; combo = 0; bestCombo = 0;
        popped = 0; escaped = 0; spawnT = 500; over = false; fireCd = 0;
        env.hud({ score: 0, lives: 1, level: 1, extra: '限时 ' + cfg.dur + 's · 连击 x1' });
      }

      function spawn() {
        var gold = env.rand(0, 1) < 0.06;
        var r = gold ? 17 : env.rand(20, 34);
        var prog = Math.min(1, time / cfg.dur);
        var v = env.rand(cfg.vLo, cfg.vHi) * (1 + prog * cfg.ramp);
        if (gold) v *= 1.35;
        balloons.push({
          x: env.rand(46, W - 46), y: H + r + 10,
          r: r, vy: v, gold: gold,
          color: gold ? '#fbbf24' : PALETTE[(env.rand(0, PALETTE.length)) | 0],
          ph: env.rand(0, Math.PI * 2), amp: env.rand(8, 24)
        });
      }

      function burst(b, gain) {
        for (var i = 0; i < 10; i++) {
          var a = env.rand(0, Math.PI * 2), sp = env.rand(60, 240);
          parts.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, t: 0, c: b.color });
        }
        if (gain > 0) {
          for (i = 0; i < 5; i++) {
            parts.push({ x: b.x, y: b.y, vx: env.rand(-60, 60), vy: env.rand(-160, -80), t: 0, c: '#fde68a', txt: '+' + gain });
            break;
          }
        }
      }

      function fire(x, y) {
        if (over || fireCd > 0) return;
        fireCd = 0.11;
        sfx.play('laser');
        var hit = null;
        for (var i = balloons.length - 1; i >= 0; i--) {
          var b = balloons[i];
          var dx = x - b.x, dy = y - b.y;
          if (dx * dx + dy * dy <= (b.r + 8) * (b.r + 8)) { hit = b; break; }
        }
        if (hit) {
          balloons.splice(balloons.indexOf(hit), 1);
          combo++; bestCombo = Math.max(bestCombo, combo);
          var pts = hit.gold ? 50 : (hit.r < 24 ? 15 : 10);
          var gain = pts * mult();
          score += gain; popped++;
          burst(hit, gain);
          sfx.play(hit.gold ? 'coin' : 'hit');
          env.hud({ score: score, lives: 1, level: 1, extra: '限时 ' + Math.max(0, Math.ceil(cfg.dur - time)) + 's · 连击 x' + mult() });
        } else {
          combo = 0;
          env.hud({ score: score, lives: 1, level: 1, extra: '限时 ' + Math.max(0, Math.ceil(cfg.dur - time)) + 's · 连击 x1' });
        }
      }

      function update(dt) {
        var i, b;
        if (over) {
          for (i = parts.length - 1; i >= 0; i--) {
            var q = parts[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt;
          }
          return;
        }
        time += dt; fireCd -= dt;
        if (time >= cfg.dur) {
          over = true;
          sfx.play(score >= 300 ? 'win' : 'gameover');
          env.gameOver({ score: score, detail: '击破 ' + popped + ' · 逃脱 ' + escaped + ' · 最高连击 ' + bestCombo });
          return;
        }
        /* 生成 */
        spawnT -= dt * 1000;
        if (spawnT <= 0) {
          spawn();
          spawnT = env.rand(cfg.ivLo, cfg.ivHi) * (1 - Math.min(0.45, time / cfg.dur * 0.45));
        }
        /* 气球上升 */
        for (i = balloons.length - 1; i >= 0; i--) {
          b = balloons[i];
          b.y -= b.vy * dt;
          b.x += Math.cos(time * 1.6 + b.ph) * b.amp * dt;
          if (b.y < -b.r - 14) {
            balloons.splice(i, 1);
            escaped++;
            sfx.play('warn');
          }
        }
        /* 粒子 */
        for (i = parts.length - 1; i >= 0; i--) {
          var p = parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt;
          if (p.t > 0.8) parts.splice(i, 1);
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

      function drawBalloon(b) {
        ctx.strokeStyle = 'rgba(80,90,110,.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + b.r);
        ctx.quadraticCurveTo(b.x + 6, b.y + b.r + 16, b.x, b.y + b.r + 30);
        ctx.stroke();
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, b.r * 0.86, b.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.beginPath();
        ctx.ellipse(b.x - b.r * 0.28, b.y - b.r * 0.34, b.r * 0.26, b.r * 0.4, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + b.r);
        ctx.lineTo(b.x - 4, b.y + b.r + 7);
        ctx.lineTo(b.x + 4, b.y + b.r + 7);
        ctx.closePath();
        ctx.fillStyle = b.color;
        ctx.fill();
        if (b.gold) {
          ctx.font = 'bold ' + Math.round(b.r) + 'px system-ui';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#78350f';
          ctx.fillText('$', b.x, b.y + 1);
        }
      }

      function render() {
        var i;
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#bfdbfe'); sky.addColorStop(0.6, '#dbeafe'); sky.addColorStop(1, '#fef3c7');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        /* 云 */
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        for (i = 0; i < 4; i++) {
          var cy = 90 + i * 130 + Math.sin(time * 0.3 + i) * 6;
          var cx2 = (i * 173 + time * 12) % (W + 160) - 80;
          ctx.beginPath();
          ctx.ellipse(cx2, cy, 46, 16, 0, 0, Math.PI * 2);
          ctx.ellipse(cx2 + 30, cy - 8, 30, 14, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        /* 地面 */
        ctx.fillStyle = '#86efac';
        ctx.fillRect(0, H - 26, W, 26);
        ctx.fillStyle = '#4ade80';
        for (i = 0; i < 10; i++) ctx.fillRect(i * 60 + 8, H - 30, 4, 8);

        for (i = 0; i < balloons.length; i++) drawBalloon(balloons[i]);

        /* 粒子 */
        for (i = 0; i < parts.length; i++) {
          var p = parts[i];
          if (p.txt) {
            ctx.globalAlpha = Math.max(0, 1 - p.t / 0.8);
            ctx.fillStyle = p.c;
            ctx.font = 'bold 17px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(p.txt, p.x, p.y);
            ctx.globalAlpha = 1;
          } else {
            ctx.globalAlpha = Math.max(0, 1 - p.t / 0.8);
            ctx.fillStyle = p.c;
            ctx.fillRect(p.x - 2.5, p.y - 2.5, 5, 5);
            ctx.globalAlpha = 1;
          }
        }

        /* 准星 */
        if (!over) {
          ctx.strokeStyle = 'rgba(220,38,38,.9)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cross.x, cross.y, 15, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cross.x - 22, cross.y); ctx.lineTo(cross.x - 8, cross.y);
          ctx.moveTo(cross.x + 8, cross.y); ctx.lineTo(cross.x + 22, cross.y);
          ctx.moveTo(cross.x, cross.y - 22); ctx.lineTo(cross.x, cross.y - 8);
          ctx.moveTo(cross.x, cross.y + 8); ctx.lineTo(cross.x, cross.y + 22);
          ctx.stroke();
          ctx.fillStyle = 'rgba(220,38,38,.9)';
          ctx.beginPath(); ctx.arc(cross.x, cross.y, 2.5, 0, Math.PI * 2); ctx.fill();
        }

        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(30,50,70,.6)'; ctx.font = '13px system-ui';
        ctx.fillText('得分', 24, 34);
        ctx.fillStyle = '#0f2a44'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(String(score), 24, 68);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(30,50,70,.6)'; ctx.font = '13px system-ui';
        ctx.fillText('剩余时间', W - 24, 34);
        ctx.fillStyle = '#0f2a44'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(Math.max(0, Math.ceil(cfg.dur - time)) + 's', W - 24, 68);
        /* 时间条 */
        var frac = Math.max(0, 1 - time / cfg.dur);
        ctx.fillStyle = 'rgba(15,42,68,.15)';
        env.roundRect(24, 96, W - 48, 8, 4); ctx.fill();
        ctx.fillStyle = frac > 0.3 ? '#0ea5e9' : '#ef4444';
        env.roundRect(24, 96, (W - 48) * frac, 8, 4); ctx.fill();
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(30,50,70,.55)'; ctx.font = '13px system-ui';
        ctx.fillText((diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通') + ' · 移动准星 点击/空格射击 · 金球 x5', W / 2, 126);
      }

      reset();

      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        spawn: spawn,
        fire: fire,
        setCross: function (x, y) { cross.x = x; cross.y = y; },
        list: function () { return balloons.map(function (b) { return { x: b.x, y: b.y, r: b.r, gold: b.gold }; }); },
        endNow: function () { time = cfg.dur - 0.01; },
        state: function () {
          return { over: over, score: score, popped: popped, escaped: escaped, n: balloons.length, time: time, combo: combo };
        }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 1, level: 1, extra: '限时 ' + cfg.dur + 's · 连击 x1' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
