/* ==========================================================================
   像素鸟进阶版 Flappy+
   在经典 Flappy 基础上：管道会缓慢移动（8 分后）· 管道间金币 +5 ·
   昼夜渐变背景 · 速度随分递增 · 三难度
   ========================================================================== */
(function () {
  'use strict';

  var CFG = {
    easy:   { g: 1350, flap: -400, v: 165, gap0: 215, gapMin: 175 },
    normal: { g: 1500, flap: -420, v: 195, gap0: 190, gapMin: 150 },
    hard:   { g: 1650, flap: -440, v: 230, gap0: 170, gapMin: 132 }
  };
  var TOP = 150;
  var PW = 64;

  GameKit.register({
    id: 'flappy2',
    name: { zh: '像素鸟进阶版', en: 'Flappy Plus' },
    desc: { zh: '进阶版像素鸟：管道缺口会慢慢移动！穿越管道 +1，顺手吃金币 +5，夜幕会随分数降临。看你能飞多远！', en: 'Flappy Plus: pipe gaps slowly drift! +1 per pipe, +5 per coin, and night falls as you score. How far can you fly?' },
    genre: { zh: '休闲益智', en: 'Casual' },
    icon: '🐤', hue: '#ca8a04',
    logical: { w: 560, h: 700 },
    plays: 5000, hot: false, isNew: true, sound: 'menu',
    script: 'assets/js/games/flappy2.js',
    ratio: 'portrait', duration: '1-3 分钟',
    touchControls: ['a', 'b'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!CFG[diff]) diff = 'normal';
      var cfg = CFG[diff];

      var PX = 130;
      var FLOOR = H - 56;

      var py, vy, pipes, coins, score, over, started, dist, wing, parts, prevA, pointerDown, deadT;
      var stars;

      function reset() {
        py = H * 0.42; vy = 0;
        pipes = []; coins = []; parts = [];
        score = 0; over = false; started = false; dist = 0;
        wing = 0; prevA = false; pointerDown = false; deadT = 0;
        stars = [];
        for (var i = 0; i < 26; i++) {
          stars.push({ x: env.rand(0, W), y: env.rand(TOP, FLOOR - 60), s: env.rand(0.8, 2.2), tw: env.rand(0, 6.28) });
        }
        for (i = 0; i < 3; i++) addPipe(W + 120 + i * 210);
        env.hud({ score: 0, lives: 1, level: 1, extra: '点按/空格扑翼' });
      }

      function speed() { return cfg.v * (1 + Math.min(0.55, score * 0.012)); }
      function gapNow() { return Math.max(cfg.gapMin, cfg.gap0 - Math.min(40, score * 0.8)); }

      function addPipe(x) {
        var m = 70;
        var gap = gapNow();
        var cy = env.rand(TOP + gap / 2 + m, FLOOR - gap / 2 - m);
        var p = { x: x, cy: cy, gap: gap, passed: false, drift: 0, dir: Math.random() < 0.5 ? 1 : -1, dsp: 0 };
        if (score >= 8) p.dsp = env.rand(16, 34);
        pipes.push(p);
        /* 管道金币 */
        if (Math.random() < 0.55) {
          coins.push({ x: x + PW / 2, cy: cy, got: false, t: env.rand(0, 6.28) });
        }
      }

      function boom() {
        over = true;
        sfx.play('explosion');
        for (var i = 0; i < 18; i++) {
          var a = env.rand(0, Math.PI * 2), sp = env.rand(60, 260);
          parts.push({ x: PX, y: py, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, c: i % 2 ? '#fde047' : '#fb923c' });
        }
        env.gameOver({ score: score, detail: '管道 ' + score + ' · 金币 ' + coins.filter(function (c) { return c.got; }).length });
      }

      function flap() {
        if (over) return;
        started = true;
        vy = cfg.flap;
        wing = 0.25;
        sfx.play('select');
      }

      function update(dt) {
        var i;
        wing -= dt;
        for (i = parts.length - 1; i >= 0; i--) {
          var q = parts[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt;
          if (q.t > 0.9) parts.splice(i, 1);
        }
        if (over) { deadT += dt; return; }
        /* 输入：pad.a 边沿（键盘空格/虚拟 A 均映射）——必须在 started 守卫之前 */
        var nowA = env.pad.a || env.pad.b;
        if (nowA && !prevA) flap();
        prevA = nowA;
        if (!started) return;
        dist += speed() * dt;
        vy += cfg.g * dt;
        py += vy * dt;
        /* 管道 */
        var v = speed();
        for (i = pipes.length - 1; i >= 0; i--) {
          var p = pipes[i];
          p.x -= v * dt;
          /* 进阶：缺口漂移 */
          if (p.dsp > 0) {
            p.drift += p.dir * p.dsp * dt;
            var lo = TOP + p.gap / 2 + 50, hi = FLOOR - p.gap / 2 - 50;
            if (p.cy + p.drift < lo || p.cy + p.drift > hi) p.dir *= -1;
          }
          if (!p.passed && p.x + PW < PX - 14) {
            p.passed = true;
            score++;
            sfx.play('coin');
            env.hud({ score: score, lives: 1, level: 1 + Math.floor(score / 10), extra: '持续点按上升' });
            if (score === 8) {
              /* 从现在起新管道开始漂移 */
            }
          }
          if (p.x + PW < -20) pipes.splice(i, 1);
        }
        if (pipes.length && pipes[pipes.length - 1].x < W - 210) addPipe(W + 10);
        /* 金币 */
        for (i = coins.length - 1; i >= 0; i--) {
          var c = coins[i];
          c.x -= v * dt;
          c.t += dt * 3;
          if (!c.got && Math.abs(c.x - PX) < 22 && Math.abs(c.cy - py) < 24) {
            c.got = true;
            score += 5;
            sfx.play('pick');
            env.hud({ score: score, lives: 1, level: 1 + Math.floor(score / 10), extra: '+5 金币!' });
          }
          if (c.x < -20 || c.got) coins.splice(i, 1);
        }
        /* 碰撞 */
        if (py + 13 > FLOOR || py - 13 < TOP) { py = Math.min(py, FLOOR - 13); boom(); return; }
        for (i = 0; i < pipes.length; i++) {
          var p2 = pipes[i];
          var gy2 = p2.cy + p2.drift;
          if (PX + 14 > p2.x && PX - 14 < p2.x + PW) {
            if (py - 12 < gy2 - p2.gap / 2 || py + 12 > gy2 + p2.gap / 2) { boom(); return; }
          }
        }
      }

      var unbindKey = env.onKey(function (e, type) {
        var K = e.code;
        if ((K === 'Space' || K === 'ArrowUp' || K === 'KeyW') && type === 'down') e.preventDefault();
      });

      env.canvas.addEventListener('pointerdown', function (e) { e.preventDefault(); flap(); });

      function render() {
        var i;
        var night = Math.min(1, score / 30); /* 30 分入夜 */
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, mix('#7dd3fc', '#0f172a', night));
        sky.addColorStop(0.7, mix('#bae6fd', '#1e293b', night));
        sky.addColorStop(1, mix('#fef3c7', '#334155', night));
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        /* 星星 */
        if (night > 0.15) {
          for (i = 0; i < stars.length; i++) {
            var st = stars[i];
            ctx.globalAlpha = night * (0.5 + 0.5 * Math.sin(st.tw + dist * 0.01));
            ctx.fillStyle = '#fef9c3';
            ctx.fillRect(st.x, st.y, st.s, st.s);
            ctx.globalAlpha = 1;
          }
        }
        /* 太阳/月亮 */
        ctx.fillStyle = mix('#fbbf24', '#e2e8f0', night);
        ctx.beginPath(); ctx.arc(W - 90, TOP + 60, 34, 0, Math.PI * 2); ctx.fill();
        /* 管道 */
        for (i = 0; i < pipes.length; i++) {
          var p = pipes[i];
          var gy2 = p.cy + p.drift;
          var topH = gy2 - p.gap / 2 - TOP;
          var botY = gy2 + p.gap / 2;
          drawPipe(p.x, TOP, PW, topH, true, night);
          drawPipe(p.x, botY, PW, FLOOR - botY, false, night);
        }
        /* 金币 */
        for (i = 0; i < coins.length; i++) {
          var c = coins[i];
          var bob = Math.sin(c.t) * 3;
          ctx.fillStyle = '#facc15';
          ctx.beginPath(); ctx.ellipse(c.x, c.cy + bob, 11, 13, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#b45309';
          ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('$', c.x, c.cy + bob);
        }
        /* 地面 */
        ctx.fillStyle = mix('#84cc16', '#3f3f46', night);
        ctx.fillRect(0, FLOOR, W, H - FLOOR);
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        var off = dist % 24;
        for (i = -1; i < 25; i++) ctx.fillRect(i * 24 - off, FLOOR, 12, 5);
        /* 鸟 */
        if (!over || deadT < 0.4) {
          ctx.save();
          ctx.translate(PX, Math.min(py, FLOOR - 13));
          ctx.rotate(Math.max(-0.5, Math.min(1.1, vy / 500)));
          ctx.fillStyle = '#fde047';
          ctx.beginPath(); ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath(); ctx.ellipse(-4, 4, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
          /* 翅膀 */
          var wa = wing > 0 ? -0.9 : 0.3;
          ctx.save();
          ctx.translate(-2, 0);
          ctx.rotate(wa);
          ctx.fillStyle = '#fef08a';
          ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          /* 眼睛嘴 */
          ctx.fillStyle = '#1c1917';
          ctx.beginPath(); ctx.arc(7, -4, 2.4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#f97316';
          ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(21, 2); ctx.lineTo(13, 5); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
        /* 粒子 */
        for (i = 0; i < parts.length; i++) {
          var p3 = parts[i];
          ctx.globalAlpha = Math.max(0, 1 - p3.t / 0.9);
          ctx.fillStyle = p3.c;
          ctx.fillRect(p3.x - 3, p3.y - 3, 6, 6);
          ctx.globalAlpha = 1;
        }
        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = night > 0.5 ? 'rgba(226,232,240,.7)' : 'rgba(15,23,42,.55)';
        ctx.font = '13px system-ui';
        ctx.fillText('得分', 24, 34);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 32px Consolas, monospace';
        ctx.fillText(String(score), 24, 70);
        ctx.textAlign = 'center';
        ctx.font = '13px system-ui';
        ctx.fillStyle = night > 0.5 ? 'rgba(226,232,240,.6)' : 'rgba(15,23,42,.5)';
        ctx.fillText((diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通') + ' · 空格/点按扑翼 · 缺口会漂移 · 金币 +5', W / 2, 122);
      }

      function drawPipe(x, y, w, h, isTop, night) {
        var g = ctx.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, mix('#4ade80', '#166534', night));
        g.addColorStop(0.5, mix('#86efac', '#22c55e', night));
        g.addColorStop(1, mix('#16a34a', '#14532d', night));
        ctx.fillStyle = g;
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = mix('#15803d', '#052e16', night);
        var capY = isTop ? y + h - 18 : y;
        ctx.fillRect(x - 4, capY, w + 8, 18);
      }

      function mix(a, b, t) {
        function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
        var A = hex(a), B = hex(b);
        return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
      }

      reset();

      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        flap: flap,
        list: function () { return pipes.map(function (p) { return { x: p.x, cy: p.cy, drift: p.drift, gap: p.gap }; }); },
        state: function () {
          return { over: over, score: score, y: Math.round(py), vy: Math.round(vy), n: pipes.length, started: started, coins: coins.filter(function (c) { return c.got; }).length };
        }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 1, level: 1, extra: '点按/空格扑翼' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
