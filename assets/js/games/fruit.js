/* ==========================================================================
   切水果 Fruit Slice —— 挥出刀光切开抛起的水果，一刀多个有连击加分
   键盘：Space/Enter 居中纵斩（1 秒冷却）；触屏/鼠标：划动切
   切到炸弹立刻结束，漏掉水果扣一条命，共 3 条命
   ========================================================================== */
(function () {
  'use strict';

  var W = 560, H = 700, GY = H + 90, GRAV = 1180;
  var FRUITS = ['🍉', '🍊', '🍋', '🍎', '🍇', '🍓', '🥝', '🍑'];

  function readDifficulty() {
    try {
      var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
      return (gc && gc.difficulty) || 'normal';
    } catch (e) { return 'normal'; }
  }
  function diffLabel(d) { return d === 'easy' ? '简单' : (d === 'hard' ? '困难' : '普通'); }

  GameKit.register({
    id: 'fruit',
    name: { zh: '切水果', en: 'Fruit Slice' },
    desc: { zh: '一刀切起满屏水果：连切多个有 combo 加分，小心别碰炸弹，漏三个直接出局。', en: 'Slice flying fruit for combo bonuses — avoid bombs, drop three and it is over.' },
    genre: { zh: '休闲反应', en: 'Reflex' },
    icon: '🍉', hue: '#ff4d9d',
    logical: { w: 560, h: 700 },
    hot: false, isNew: true, sound: 'calm',
    touchControls: ['a'],
    controls: {
      keyboard: [
        { k: 'Space / Enter', zh: '居中纵斩（1 秒冷却）', en: 'Center slash (1s cooldown)' }
      ],
      touch: [{ k: '划动屏幕', zh: '挥刀切水果', en: 'Swipe to slice' }]
    },

    create: function (env) {
      var ctx = env.ctx, sfx = env.sfx;
      var items, parts, floats, trail, score, lives, combo, comboT;
      var state, over, spawnT, sweepCool, prev, keyUnbind, bobT, toss, misses;

      var cfg = { interval: 1.15, bombRate: 0.16, burst: 1 };
      function applyDifficulty() {
        var d = readDifficulty();
        if (d === 'easy') { cfg.interval = 1.35; cfg.bombRate = 0.1; cfg.burst = 1; }
        else if (d === 'hard') { cfg.interval = 0.9; cfg.bombRate = 0.24; cfg.burst = 2; }
        else { cfg.interval = 1.15; cfg.bombRate = 0.16; cfg.burst = 1; }
      }

      function syncHud(extra) {
        env.hud({
          score: score, lives: lives, level: 1,
          extra: extra || (combo > 1 ? '连切 ×' + combo : '难度' + diffLabel(readDifficulty()))
        });
      }

      function spawnOne(isBomb) {
        var x = env.rand(70, W - 70);
        items.push({
          bomb: !!isBomb,
          ch: isBomb ? '💣' : FRUITS[Math.floor(Math.random() * FRUITS.length)],
          x: x, y: GY,
          vx: (W / 2 - x) * env.rand(0.18, 0.42) + env.rand(-50, 50),
          vy: env.rand(-1240, -1080),      // 抛到屏幕上部（顶点约 y=200），保证整个画面都是有效切割区
          r: env.rand(30, 42),
          rot: 0, vr: env.rand(-2.4, 2.4)
        });
      }

      function spawnWave() {
        var n = 1 + (Math.random() < 0.4 ? 1 : 0) + (Math.random() < cfg.burst - 1 ? 1 : 0);
        for (var i = 0; i < n; i++) {
          spawnOne(Math.random() < cfg.bombRate);
        }
      }

      function reset() {
        applyDifficulty();
        items = []; parts = []; floats = []; trail = [];
        score = 0; lives = 3; combo = 0; comboT = 0; misses = 0;
        state = 'play'; over = false;
        spawnT = 0.7; sweepCool = 0; prev = {}; bobT = 0;
        syncHud('划动 / Space 斩 · 难度' + diffLabel(readDifficulty()));
      }

      /* 线段与圆相交 */
      function segHitsCircle(x1, y1, x2, y2, cx, cy, r) {
        var dx = x2 - x1, dy = y2 - y1;
        var len2 = dx * dx + dy * dy;
        var t = len2 ? ((cx - x1) * dx + (cy - y1) * dy) / len2 : 0;
        t = Math.max(0, Math.min(1, t));
        var px = x1 + dx * t, py = y1 + dy * t;
        var ex = cx - px, ey = cy - py;
        return ex * ex + ey * ey <= r * r;
      }

      function juice(x, y, bomb) {
        for (var i = 0; i < (bomb ? 30 : 16); i++) {
          var a = Math.random() * Math.PI * 2, sp = 80 + Math.random() * 260;
          parts.push({
            x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
            life: 0.5 + Math.random() * 0.45,
            col: bomb ? (Math.random() < 0.5 ? '#ff5d73' : '#ffb020') : 'hsl(' + Math.floor(Math.random() * 360) + ',80%,62%)',
            r: 3 + Math.random() * 4
          });
        }
      }

      function sliceAt(x1, y1, x2, y2) {
        var hitAny = false;
        for (var i = items.length - 1; i >= 0; i--) {
          var f = items[i];
          if (f.dead) continue;
          if (segHitsCircle(x1, y1, x2, y2, f.x, f.y, f.r + 4)) {
            items.splice(i, 1);
            hitAny = true;
            if (f.bomb) {
              sfx.play('explosion');
              juice(f.x, f.y, true);
              boom();
              return;
            }
            combo++; comboT = 0.55;
            var gain = 1 + (combo - 1) * 2;
            score += gain;
            juice(f.x, f.y, false);
            sfx.play('punch');
            if (combo > 1) {
              floats.push({ x: f.x, y: f.y - 30, txt: '×' + combo + '  +' + gain, life: 0.9 });
              sfx.play('coin');
            }
            syncHud();
          }
        }
        if (!hitAny) sfx.play('click');
      }

      function boom() {
        if (over) return;
        over = true;
        env.delay(function () {
          env.gameOver({ score: score, detail: '切到炸弹，本次 ' + score + ' 分' });
        }, 450);
      }

      function loseLife() {
        lives--;
        misses++;
        sfx.play('warn');
        if (lives <= 0) {
          over = true;
          env.delay(function () {
            env.gameOver({ score: score, detail: '漏掉 ' + misses + ' 个水果' });
          }, 300);
        }
        syncHud(lives > 0 ? '漏掉一个！剩余 ' + lives + ' 命' : '');
      }

      function update(dt) {
        bobT += dt;
        if (comboT > 0) { comboT -= dt; if (comboT <= 0 && combo > 1) syncHud(); if (comboT <= 0) combo = 0; }
        sweepCool -= dt;

        /* 键盘纵斩 */
        if ((env.pad.a && !prev.a) && sweepCool <= 0 && !over) {
          sweepCool = 1;
          sliceAt(W / 2, -30, W / 2, H + 30);
        }
        prev.a = env.pad.a;

        /* 指针轨迹 */
        var now = performance.now();
        while (trail.length && now - trail[0].t > 110) trail.shift();
        if (trail.length >= 2) {
          var a = trail[trail.length - 2], b = trail[trail.length - 1];
          sliceAt(a.x, a.y, b.x, b.y);
        }

        /* 水果运动 */
        if (!over) {
          spawnT -= dt;
          if (spawnT <= 0) { spawnWave(); spawnT = cfg.interval * env.rand(0.8, 1.25); }
        }
        for (var i = items.length - 1; i >= 0; i--) {
          var f = items[i];
          f.vy += GRAV * dt;
          f.x += f.vx * dt; f.y += f.vy * dt;
          f.rot += f.vr * dt;
          if (f.y > H + 90 && f.vy > 0) {
            items.splice(i, 1);
            if (!f.bomb && !over) loseLife();
          }
        }

        /* 粒子 / 飘字 */
        for (i = parts.length - 1; i >= 0; i--) {
          var p = parts[i];
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 700 * dt; p.life -= dt;
          if (p.life <= 0) parts.splice(i, 1);
        }
        for (i = floats.length - 1; i >= 0; i--) {
          floats[i].life -= dt; floats[i].y -= 40 * dt;
          if (floats[i].life <= 0) floats.splice(i, 1);
        }
      }

      function render() {
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#1b0f33'); bg.addColorStop(0.6, '#33174d'); bg.addColorStop(1, '#12233f');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = 'rgba(255,255,255,.45)';
        for (var s = 0; s < 24; s++) {
          ctx.globalAlpha = 0.08 + (s % 4) * 0.07;
          ctx.fillRect((s * 113 + 29) % W, (s * 61 + 17) % 300, 2, 2);
        }
        ctx.globalAlpha = 1;

        /* 水果 */
        items.forEach(function (f) {
          ctx.save();
          ctx.translate(f.x, f.y);
          ctx.rotate(f.rot);
          ctx.fillStyle = 'rgba(0,0,0,.28)';
          ctx.beginPath(); ctx.arc(3, 4, f.r, 0, Math.PI * 2); ctx.fill();
          ctx.font = Math.round(f.r * 1.7) + 'px system-ui, "Segoe UI Emoji"';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(f.ch, 0, 2);
          ctx.restore();
        });

        /* 刀光 */
        if (trail.length >= 2) {
          ctx.save();
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          for (var w = 0; w < trail.length - 1; w++) {
            var p1 = trail[w], p2 = trail[w + 1];
            ctx.strokeStyle = 'rgba(255,255,255,' + (0.15 + 0.8 * (w / trail.length)) + ')';
            ctx.lineWidth = 2 + 5 * (w / trail.length);
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
          }
          ctx.restore();
        }

        /* 纵斩提示 */
        if (sweepCool > 0.75) {
          ctx.strokeStyle = 'rgba(255,255,255,' + (sweepCool - 0.75) * 3 + ')';
          ctx.lineWidth = 8;
          ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
        }

        /* 果汁粒子 */
        parts.forEach(function (p) {
          ctx.globalAlpha = Math.max(0, p.life * 1.6);
          ctx.fillStyle = p.col;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        /* 飘字 */
        floats.forEach(function (f) {
          ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
          env.text(f.txt, f.x, f.y, { font: 'bold 22px system-ui', color: '#fff', align: 'center', shadow: true });
        });
        ctx.globalAlpha = 1;

        /* 提示 */
        if (score === 0 && items.length === 0 && !over) {
          var hint = 1 + Math.sin(bobT * 3) * 0.05;
          ctx.save();
          ctx.translate(W / 2, H * 0.42); ctx.scale(hint, hint);
          env.text('划动屏幕切开水果', 0, 0, { font: 'bold 22px system-ui', color: 'rgba(255,255,255,.9)', align: 'center', shadow: true });
          env.text('SWIPE TO SLICE · 别碰炸弹 💣', 0, 30, { font: '14px system-ui', color: 'rgba(255,255,255,.55)', align: 'center' });
          ctx.restore();
        }
      }

      reset();

      keyUnbind = env.onKey(function (e, type) {
        if (over) return;
        if ((e.code === 'Enter' || e.code === 'NumpadEnter') && type === 'down' && sweepCool <= 0) {
          sweepCool = 1;
          sliceAt(W / 2, -30, W / 2, H + 30);
        }
      });

      var pdown = false;
      function onDown(e) {
        pdown = true;
        var p = env.pointer(e);
        trail.length = 0;
        trail.push({ x: p.x, y: p.y, t: performance.now() });
      }
      function onMove(e) {
        if (!pdown || !trail.length) return;
        var p = env.pointer(e);
        trail.push({ x: p.x, y: p.y, t: performance.now() });
        if (trail.length > 8) trail.shift();
      }
      function onUp() { pdown = false; trail.length = 0; }

      env.canvas.addEventListener('pointerdown', onDown);
      env.canvas.addEventListener('pointermove', onMove);
      env.canvas.addEventListener('pointerup', onUp);
      env.canvas.addEventListener('pointerleave', onUp);
      env.canvas.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });

      env.loop(function (dt) {
        update(dt);
        render();
      });

      return {
        start: function () {
          sfx.play('start');
          syncHud('划动 / Space 斩 · 难度' + diffLabel(readDifficulty()));
        },
        restart: function () { reset(); },
        destroy: function () {
          if (keyUnbind) keyUnbind();
          env.canvas.removeEventListener('pointerdown', onDown);
          env.canvas.removeEventListener('pointermove', onMove);
          env.canvas.removeEventListener('pointerup', onUp);
          env.canvas.removeEventListener('pointerleave', onUp);
        }
      };
    }
  });
})();
