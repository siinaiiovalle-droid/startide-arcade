/* ==========================================================================
   直升机 Helicopter
   按住上升/松开下降 · 峡谷岩柱穿行 · 隧道收窄 · 距离积分 · 三难度
   ========================================================================== */
(function () {
  'use strict';

  var CFG = {
    easy:   { v: 190, gap0: 230, gapMin: 175, iv: 950,  ramp: 0.9 },
    normal: { v: 235, gap0: 200, gapMin: 145, iv: 780,  ramp: 1.3 },
    hard:   { v: 290, gap0: 175, gapMin: 125, iv: 620,  ramp: 1.8 }
  };
  var TOP = 150;

  GameKit.register({
    id: 'helicopter',
    name: { zh: '直升机', en: 'Helicopter' },
    desc: { zh: '经典直升机穿峡谷：按住上升，松开下降，穿过一道道岩柱缝隙！隧道会越来越窄，坚持得越远分越高！', en: 'Classic helicopter cave flyer: hold to rise, release to fall, thread the rock gaps! The tunnel narrows as you go.' },
    genre: { zh: '竞速躲避', en: 'Racing' },
    icon: '🚁', hue: '#0d9488',
    logical: { w: 560, h: 700 },
    plays: 5000, hot: false, isNew: true, sound: 'battle',
    script: 'assets/js/games/helicopter.js',
    ratio: 'portrait', duration: '1-4 分钟',
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

      var HX = W * 0.3, HY0 = H * 0.45;
      var CEIL = TOP + 46, FLOOR = H - 40;
      var PW = 44; /* 岩柱厚 */

      var hy, vy, holding, pillars, dist, score, time, over, spawnT, rotor, prevA, parts, crashed;
      var pointerDown;

      function reset() {
        hy = HY0; vy = -60; holding = false; pointerDown = false;
        pillars = []; dist = 0; score = 0; time = 0; over = false;
        spawnT = 900; rotor = 0; prevA = false; parts = []; crashed = false;
        env.hud({ score: 0, lives: 1, level: 1, extra: '按住 ↑ 上升' });
      }

      function gapNow() {
        return Math.max(cfg.gapMin, cfg.gap0 - time * cfg.ramp * 3);
      }

      function spawnPillar() {
        var gap = gapNow();
        var margin = 60;
        var cy = env.rand(CEIL + gap / 2 + margin, FLOOR - gap / 2 - margin);
        pillars.push({ x: W + PW, cy: cy, gap: gap, scored: false });
      }

      function boom(x, y) {
        crashed = true; over = true;
        sfx.play('explosion');
        for (var i = 0; i < 22; i++) {
          var a = env.rand(0, Math.PI * 2), sp = env.rand(60, 320);
          parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, c: i % 2 ? '#fbbf24' : '#57534e' });
        }
        env.gameOver({ score: Math.round(score), detail: '飞行 ' + Math.round(dist / 10) + '0m' });
      }

      function hitRect(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
      }

      function update(dt) {
        var i;
        rotor += dt * (holding ? 46 : 26);
        if (over) {
          for (i = parts.length - 1; i >= 0; i--) {
            var q = parts[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt;
            if (q.t > 1) parts.splice(i, 1);
          }
          return;
        }
        time += dt;
        /* 输入：按住 = 虚拟 A / 空格(pad.a) / 指针按住 */
        holding = env.pad.a || env.pad.b || pointerDown;
        /* 物理 */
        if (holding) vy -= 1500 * dt;
        vy += 760 * dt;
        vy = Math.max(-270, Math.min(340, vy));
        hy += vy * dt;
        /* 岩柱推进 */
        var v = cfg.v;
        dist += v * dt;
        score = dist / 10;
        var lv = 1 + Math.floor(time / 12);
        env.hud({ score: Math.round(score), lives: 1, level: Math.max(1, lv), extra: (holding ? '上升' : '下降') + ' · ' + Math.round(dist / 10) + '0m' });
        spawnT -= dt * 1000;
        if (spawnT <= 0) {
          spawnPillar();
          spawnT = cfg.iv * (cfg.v / v);
        }
        for (i = pillars.length - 1; i >= 0; i--) {
          var p = pillars[i];
          p.x -= v * dt;
          if (!p.scored && p.x + PW < HX - 20) {
            p.scored = true;
            sfx.play('coin');
          }
          if (p.x + PW < -10) pillars.splice(i, 1);
        }
        /* 碰撞 */
        var bx = HX - 22, by = hy - 12, bw = 44, bh = 24;
        if (hy - 12 < CEIL || hy + 12 > FLOOR) { boom(HX, hy); return; }
        for (i = 0; i < pillars.length; i++) {
          var pl = pillars[i];
          var topH = pl.cy - pl.gap / 2 - CEIL;
          var botY = pl.cy + pl.gap / 2;
          if (hitRect(bx, by, bw, bh, pl.x, CEIL, PW, topH) ||
              hitRect(bx, by, bw, bh, pl.x, botY, PW, FLOOR - botY)) {
            boom(HX, hy);
            return;
          }
        }
      }

      var unbindKey = env.onKey(function (e, type) {
        var K = e.code;
        if ((K === 'Space' || K === 'ArrowUp' || K === 'KeyW') && type === 'down') e.preventDefault();
      });

      env.canvas.addEventListener('pointerdown', function (e) { e.preventDefault(); pointerDown = true; });
      env.canvas.addEventListener('pointerup', function () { pointerDown = false; });
      env.canvas.addEventListener('pointerleave', function () { pointerDown = false; });

      function render() {
        var i;
        /* 天空 */
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#0c4a6e'); sky.addColorStop(1, '#155e75');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        /* 远景山 */
        ctx.fillStyle = 'rgba(8,47,73,.8)';
        for (i = 0; i < 5; i++) {
          var mx = ((i * 160 - dist * 0.25) % (W + 320) + W + 320) % (W + 320) - 160;
          ctx.beginPath();
          ctx.moveTo(mx, CEIL + 60);
          ctx.lineTo(mx + 90, CEIL - 30);
          ctx.lineTo(mx + 190, CEIL + 60);
          ctx.lineTo(mx + 190, H);
          ctx.lineTo(mx, H);
          ctx.closePath(); ctx.fill();
        }
        /* 岩柱 */
        for (i = 0; i < pillars.length; i++) {
          var p = pillars[i];
          var topH = p.cy - p.gap / 2 - CEIL;
          var botY = p.cy + p.gap / 2;
          ctx.fillStyle = '#57534e';
          ctx.fillRect(p.x, CEIL, PW, topH);
          ctx.fillRect(p.x, botY, PW, FLOOR - botY);
          ctx.fillStyle = 'rgba(255,255,255,.12)';
          ctx.fillRect(p.x, CEIL, 6, topH);
          ctx.fillRect(p.x, botY, 6, FLOOR - botY);
          ctx.fillStyle = 'rgba(0,0,0,.28)';
          ctx.fillRect(p.x + PW - 8, CEIL, 8, topH);
          ctx.fillRect(p.x + PW - 8, botY, 8, FLOOR - botY);
        }
        /* 顶/底岩层 */
        ctx.fillStyle = '#44403c';
        ctx.fillRect(0, 0, W, CEIL);
        ctx.fillRect(0, FLOOR, W, H - FLOOR);
        ctx.fillStyle = 'rgba(255,255,255,.1)';
        ctx.fillRect(0, CEIL - 5, W, 5);
        ctx.fillRect(0, FLOOR, W, 5);

        /* 直升机 */
        if (!crashed) {
          ctx.save();
          ctx.translate(HX, hy);
          ctx.rotate(Math.max(-0.25, Math.min(0.25, vy / 700)));
          /* 尾梁 */
          ctx.fillStyle = '#0f766e';
          ctx.fillRect(-34, -3, 26, 6);
          ctx.fillRect(-38, -10, 6, 14);
          /* 机身 */
          ctx.fillStyle = '#14b8a6';
          env.roundRect(-18, -13, 38, 26, 12); ctx.fill();
          /* 舷窗 */
          ctx.fillStyle = 'rgba(186,230,253,.9)';
          ctx.beginPath();
          ctx.ellipse(8, -2, 9, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          /* 主旋翼 */
          ctx.strokeStyle = 'rgba(220,240,240,.9)';
          ctx.lineWidth = 3;
          var wr = Math.sin(rotor) * 30;
          ctx.beginPath();
          ctx.moveTo(-wr, -20); ctx.lineTo(wr, -20);
          ctx.stroke();
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(0, -20); ctx.stroke();
          /* 尾桨 */
          var tr = Math.sin(rotor * 1.4) * 8;
          ctx.beginPath();
          ctx.moveTo(-35, -3 + tr * 0.4); ctx.lineTo(-35, -3 - tr);
          ctx.stroke();
          ctx.restore();
        }
        /* 粒子 */
        for (i = 0; i < parts.length; i++) {
          var q = parts[i];
          ctx.globalAlpha = Math.max(0, 1 - q.t);
          ctx.fillStyle = q.c;
          ctx.fillRect(q.x - 3, q.y - 3, 6, 6);
          ctx.globalAlpha = 1;
        }
        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(240,240,240,.65)'; ctx.font = '13px system-ui';
        ctx.fillText('距离', 24, 34);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(Math.round(score) + '', 24, 68);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(240,240,240,.6)'; ctx.font = '13px system-ui';
        ctx.fillText((diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通') + ' · 按住空格/A 或按住屏幕上升', W / 2, 122);
      }

      reset();

      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        setHold: function (v) { pointerDown = !!v; },
        isHold: function () { return holding; },
        spawnPillar: spawnPillar,
        crash: function () { boom(HX, hy); },
        state: function () {
          return { over: over, score: Math.round(score), dist: Math.round(dist), y: Math.round(hy), vy: Math.round(vy), n: pillars.length };
        }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 1, level: 1, extra: '按住 ↑ 上升' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
