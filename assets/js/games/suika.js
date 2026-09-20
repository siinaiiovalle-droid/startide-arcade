/* ==========================================================================
   合成大西瓜 Suika —— 物理合成
   顶部投果 · 同级相碰合成升级 · 堆过警戒线游戏结束
   自研圆形刚体：重力 + 迭代分离 + 等效质量碰撞
   ========================================================================== */
(function () {
  'use strict';

  var WALL_L = 36, WALL_R = 524, GROUND = 648, DROP_Y = 132, DANGER = 218;
  var RADII = [15, 21, 28, 36, 45, 55, 66, 78, 91, 105, 118];
  var FRUITS = [
    { c1: '#ff8a8a', c2: '#e23c4c', emoji: '🍒' },
    { c1: '#ffb37a', c2: '#e2662c', emoji: '🍓' },
    { c1: '#ffe08a', c2: '#e2a72c', emoji: '🍇' },
    { c1: '#c6f08a', c2: '#8bc22c', emoji: '🍋' },
    { c1: '#a8e6a1', c2: '#4caf50', emoji: '🍊' },
    { c1: '#ffb3c7', c2: '#e26a93', emoji: '🍎' },
    { c1: '#ffd9a1', c2: '#e2924c', emoji: '🍑' },
    { c1: '#c3e8f7', c2: '#5aa8d8', emoji: '🥝' },
    { c1: '#e8c3f7', c2: '#a45ad8', emoji: '🍍' },
    { c1: '#f7e3c3', c2: '#d8a85a', emoji: '🥭' },
    { c1: '#a1e6d8', c2: '#2caf8f', emoji: '🍉' }
  ];

  GameKit.register({
    id: 'suika',
    name: { zh: '合成大西瓜', en: 'Suika' },
    desc: { zh: '投放水果，两个相同的水果相碰即合成更大的水果，一步步合成大西瓜！堆过警戒线就结束，合成越高级分越高。', en: 'Drop and merge identical fruits into bigger ones. Make a watermelon! Don\'t stack past the line.' },
    genre: { zh: '物理合成', en: 'Merge' },
    icon: '🍉', hue: '#ff9d5c',
    logical: { w: 560, h: 700 },
    hot: false, isNew: true, sound: 'menu',
    controls: {
      keyboard: [
        { k: '← → / A D', zh: '移动落点', en: 'Move drop x' },
        { k: 'Space / J / Enter', zh: '投放', en: 'Drop' }
      ],
      touch: [{ k: '拖动选择落点 · 松手投放', zh: '投放水果', en: 'Drag and drop' }]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }

      var balls, score, over, aimX, nextLv, cool, floats, particles, prev, overT, started, bestLv;

      function reset() {
        balls = []; score = 0; over = false; cool = 0; floats = []; particles = [];
        prev = {}; overT = 0; started = false; bestLv = 0;
        aimX = W / 2;
        nextLv = spawnLv();
        env.hud({ score: 0, lives: 1, level: 1, extra: '合成出大西瓜！' });
      }

      /* 难度：简单更低级开局，困难初始更高级 */
      function spawnLv() {
        var r = Math.random();
        if (diff === 'easy') return r < 0.55 ? 0 : r < 0.9 ? 1 : 2;
        if (diff === 'hard') return r < 0.2 ? 0 : r < 0.62 ? 1 : r < 0.9 ? 2 : 3;
        return r < 0.38 ? 0 : r < 0.78 ? 1 : 2;
      }

      function drop(x) {
        if (over || cool > 0) return;
        x = Math.max(WALL_L + RADII[nextLv], Math.min(WALL_R - RADII[nextLv], x));
        balls.push({ x: x, y: DROP_Y, vx: 0, vy: 0, lv: nextLv, age: 0 });
        sfx.play('land');
        cool = diff === 'hard' ? 0.62 : 0.48;
        nextLv = spawnLv();
        started = true;
        env.hud({ extra: '下一个：' + FRUITS[nextLv].emoji });
      }

      function merge(a, b) {
        var nl = Math.min(RADII.length - 1, a.lv + 1);
        var nx = (a.x + b.x) / 2, ny = (a.y + b.y) / 2;
        var gain = nl * (nl + 1) / 2;
        score += gain;
        bestLv = Math.max(bestLv, nl);
        a.dead = true; b.dead = true;
        balls.push({ x: nx, y: ny, vx: (a.vx + b.vx) * 0.3, vy: Math.min(-60, (a.vy + b.vy) * 0.3), lv: nl, age: 0, fresh: true });
        sfx.play(nl >= 8 ? 'levelup' : 'grow');
        floats.push({ x: nx, y: ny - RADII[nl] - 6, txt: '+' + gain, color: '#b45309', t: 0.9 });
        for (var i = 0; i < 8; i++) {
          particles.push({ x: nx, y: ny, vx: Math.cos(i / 8 * 6.28) * env.rand(40, 140), vy: Math.sin(i / 8 * 6.28) * env.rand(40, 140) - 60, t: 0.5, c: FRUITS[nl].c2 });
        }
        env.hud({ score: score });
        if (nl === 10) {
          score += 1000;
          floats.push({ x: nx, y: ny - RADII[nl] - 30, txt: '大西瓜 +1000!', color: '#e23c4c', t: 1.4 });
          env.hud({ score: score });
        }
      }

      function step(dt) {
        var i, j;
        for (i = 0; i < balls.length; i++) {
          var b = balls[i];
          b.age += dt;
          b.vy += 1500 * dt;
          b.vx *= Math.max(0, 1 - 0.28 * dt);
          b.x += b.vx * dt; b.y += b.vy * dt;
          var r = RADII[b.lv];
          if (b.x < WALL_L + r) { b.x = WALL_L + r; b.vx = Math.abs(b.vx) * 0.3; }
          if (b.x > WALL_R - r) { b.x = WALL_R - r; b.vx = -Math.abs(b.vx) * 0.3; }
          if (b.y > GROUND - r) { b.y = GROUND - r; b.vy = -Math.abs(b.vy) * 0.18; if (Math.abs(b.vy) < 30) b.vy = 0; }
        }
        /* 碰撞分离 + 合成（两轮迭代增强稳定性） */
        for (var iter = 0; iter < 2; iter++) {
          for (i = 0; i < balls.length; i++) {
            var a = balls[i];
            if (a.dead) continue;
            for (j = i + 1; j < balls.length; j++) {
              var c = balls[j];
              if (c.dead) continue;
              var dx = c.x - a.x, dy = c.y - a.y;
              var rs = RADII[a.lv] + RADII[c.lv];
              var d2 = dx * dx + dy * dy;
              if (d2 >= rs * rs) continue;
              var d = Math.sqrt(d2) || 0.001;
              if (a.lv === c.lv && a.lv < RADII.length - 1 && a.age > 0.12 && c.age > 0.12 && !a.mergedNow && !c.mergedNow) {
                a.mergedNow = c.mergedNow = true;
                merge(a, c);
                continue;
              }
              var nx = dx / d, ny = dy / d;
              var overlap = (rs - d);
              var ma = RADII[a.lv] * RADII[a.lv], mc = RADII[c.lv] * RADII[c.lv];
              var tot = ma + mc;
              a.x -= nx * overlap * (mc / tot); a.y -= ny * overlap * (mc / tot);
              c.x += nx * overlap * (ma / tot); c.y += ny * overlap * (ma / tot);
              var rv = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
              if (rv < 0) {
                var jimp = -(1 + 0.12) * rv / (1 / ma + 1 / mc);
                a.vx -= jimp * nx / ma; a.vy -= jimp * ny / ma;
                c.vx += jimp * nx / mc; c.vy += jimp * ny / mc;
              }
            }
          }
        }
        var out = [];
        for (i = 0; i < balls.length; i++) {
          if (!balls[i].dead) { balls[i].mergedNow = false; out.push(balls[i]); }
        }
        balls = out;
      }

      function update(dt) {
        var i;
        for (i = floats.length - 1; i >= 0; i--) {
          var f = floats[i]; f.t -= dt; f.y -= dt * 34;
          if (f.t <= 0) floats.splice(i, 1);
        }
        for (i = particles.length - 1; i >= 0; i--) {
          var p = particles[i]; p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 700 * dt;
          if (p.t <= 0) particles.splice(i, 1);
        }
        if (over) return;
        cool = Math.max(0, cool - dt);

        var sub = 3, sdt = dt / sub;
        for (i = 0; i < sub; i++) step(sdt);

        /* 危险线判定：非刚投放的球在线上方滞留 */
        var danger = false;
        for (i = 0; i < balls.length; i++) {
          var b = balls[i];
          if (b.age > 1 && b.y - RADII[b.lv] < DANGER && Math.abs(b.vy) < 220) danger = true;
        }
        overT = danger ? overT + dt : 0;
        if (overT > 1.2 && started) {
          over = true;
          sfx.play('gameover');
          env.gameOver({ score: score, detail: '最大合成 ' + (bestLv >= 10 ? '大西瓜！' : FRUITS[bestLv].emoji + ' Lv.' + (bestLv + 1)) });
          return;
        }

        /* 键盘移动落点 */
        var moved = false;
        if (env.pad.left) { aimX -= 340 * dt; moved = true; }
        if (env.pad.right) { aimX += 340 * dt; moved = true; }
        aimX = Math.max(WALL_L + 20, Math.min(WALL_R - 20, aimX));
        var act = null;
        if (env.pad.a && !prev.a) act = 'a';
        prev.a = env.pad.a;
        if (act === 'a') drop(aimX);
      }

      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'Enter' || e.code === 'NumpadEnter') drop(aimX);
      });

      /* 触屏：按下/拖动定落点，松手投放 */
      env.canvas.addEventListener('pointerdown', function (e) {
        if (over) return;
        aimX = env.pointer(e).x;
      });
      env.canvas.addEventListener('pointermove', function (e) {
        if (over || !(e.buttons || e.pressure > 0)) return;
        aimX = env.pointer(e).x;
      });
      env.canvas.addEventListener('pointerup', function (e) {
        if (over) return;
        drop(env.pointer(e).x);
      });

      /* ---------- 渲染 ---------- */
      function render() {
        var i;
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#fff3e0'); bg.addColorStop(1, '#ffe3c2');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        /* 容器 */
        ctx.fillStyle = 'rgba(120,72,20,.18)';
        env.roundRect(WALL_L - 10, DANGER - 10, WALL_R - WALL_L + 20, GROUND - DANGER + 20, 18); ctx.fill();
        ctx.fillStyle = '#c98a4b';
        env.roundRect(WALL_L - 14, GROUND, WALL_R - WALL_L + 28, 26, 10); ctx.fill();

        /* 警戒线 */
        ctx.save();
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = overT > 0 ? 'rgba(226,60,76,.9)' : 'rgba(226,60,76,.4)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(WALL_L, DANGER); ctx.lineTo(WALL_R, DANGER); ctx.stroke();
        ctx.restore();

        /* 落点预览 */
        if (!over && cool <= 0) {
          var fr = FRUITS[nextLv];
          ctx.save();
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = fr.c1;
          ctx.beginPath(); ctx.arc(aimX, DROP_Y, RADII[nextLv], 0, 7); ctx.fill();
          ctx.font = Math.round(RADII[nextLv] * 1.2) + 'px system-ui';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(fr.emoji, aimX, DROP_Y + 1);
          ctx.restore();
          ctx.strokeStyle = 'rgba(120,72,20,.3)'; ctx.setLineDash([3, 7]);
          ctx.beginPath(); ctx.moveTo(aimX, DROP_Y + RADII[nextLv]); ctx.lineTo(aimX, GROUND); ctx.stroke();
          ctx.setLineDash([]);
        }

        /* 水果 */
        for (i = 0; i < balls.length; i++) {
          var b = balls[i], fr2 = FRUITS[b.lv], r = RADII[b.lv];
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
          var g = ctx.createRadialGradient(b.x - r * 0.3, b.y - r * 0.35, r * 0.2, b.x, b.y, r);
          g.addColorStop(0, fr2.c1); g.addColorStop(1, fr2.c2);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.fill();
          ctx.restore();
          ctx.font = Math.round(r * 1.15) + 'px system-ui';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(fr2.emoji, b.x, b.y + 1);
        }

        for (i = 0; i < particles.length; i++) {
          var p = particles[i];
          ctx.globalAlpha = Math.max(0, p.t * 2);
          ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill();
          ctx.globalAlpha = 1;
        }

        for (i = 0; i < floats.length; i++) {
          var f = floats[i];
          ctx.globalAlpha = Math.max(0, Math.min(1, f.t * 1.6));
          ctx.textAlign = 'center'; ctx.font = 'bold 17px system-ui';
          ctx.fillStyle = f.color; ctx.fillText(f.txt, f.x, f.y);
          ctx.globalAlpha = 1;
        }

        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(90,50,10,.75)'; ctx.font = '13px system-ui';
        ctx.fillText('得分', 24, 34);
        ctx.fillStyle = '#5a3208'; ctx.font = 'bold 28px Consolas, monospace';
        ctx.fillText(String(score), 24, 66);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(90,50,10,.75)'; ctx.font = '13px system-ui';
        ctx.fillText('下一个 ' + FRUITS[nextLv].emoji + ' · ' + (diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通'), W - 24, 34);
        ctx.textAlign = 'center';
        ctx.font = '13px system-ui';
        ctx.fillStyle = 'rgba(90,50,10,.55)';
        ctx.fillText('点击 / 拖动投放 · 相同水果相碰合成', W / 2, 686);
      }

      reset();

      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        dropAt: function (x, lv) { if (lv !== undefined) nextLv = lv; drop(x); },
        balls: function () { return balls.map(function (b) { return { x: Math.round(b.x), y: Math.round(b.y), lv: b.lv }; }); },
        state: function () { return { score: score, over: over, nextLv: nextLv }; }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 1, level: 1, extra: '合成出大西瓜！' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
