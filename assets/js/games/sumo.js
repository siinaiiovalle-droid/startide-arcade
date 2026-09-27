/* ==========================================================================
   相扑推挤 Sumo
   环形擂台 · 把 AI 推出场获胜 · 冲刺爆发（体力条）· 波次递增 · 3 命
   输入：方向键/WASD/手柄移动 + Space/A 冲刺 + 触屏虚拟摇杆
   ========================================================================== */
(function () {
  'use strict';

  var DIFF = {
    easy:   { aiV: 170, dash: 430, gain: 0.9,  mult: 0.8,  label: '轻松' },
    normal: { aiV: 230, dash: 500, gain: 1.0,  mult: 1.0,  label: '标准' },
    hard:   { aiV: 290, dash: 580, gain: 1.12, mult: 1.3,  label: '困难' }
  };

  GameKit.register({
    id: 'sumo',
    name: { zh: '相扑推挤', en: 'Sumo Push' },
    desc: { zh: '土俵对决！用身体和冲刺把对手推出圆环。注意体力条——冲刺能爆发推力但会耗尽。每推倒一位对手，下一场对手更快更重，连赢 8 场称霸！', en: 'Dohyo duel! Shove your rival out of the ring with body and dash. Watch your stamina bar — dash gives burst power. Beat 8 ever-stronger rivals to rule!' },
    genre: { zh: '街机竞技', en: 'Arcade' },
    icon: '🤼', hue: '#b91c1c',
    tags: [{ zh: '对战', en: 'Versus' }, { zh: '物理', en: 'Physics' }],
    plays: 5000, hot: false, isNew: true, sound: 'crisp',
    script: 'assets/js/games/sumo.js',
    ratio: 'portrait', duration: '2-4 分钟',
    logical: { w: 560, h: 700 },
    touchControls: ['up', 'down', 'left', 'right', 'a'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!DIFF[diff]) diff = 'normal';
      var cfg = DIFF[diff];

      var CX = 280, CY = 320, RING = 262, PR = 30;
      var me, foe, stam, lives, wave, score, pauseT, over, finished, msg, msgT;
      var prev = {};
      /* 触屏虚拟摇杆 */
      var stick = { on: false, ox: 0, oy: 0, dx: 0, dy: 0 };

      function reset() {
        me = { x: CX, y: CY + 110, vx: 0, vy: 0, dashT: 0, dx: 0, dy: -1 };
        foe = { x: CX, y: CY - 110, vx: 0, vy: 0, m: 1, dashT: 0, think: 0, sd: 0, sr: 0 };
        stam = 100; lives = 3; wave = 1; score = 0;
        pauseT = 0; over = false; finished = false;
        msg = '把对手推出圆环！连赢 8 场称霸'; msgT = 2.5;
        stick.on = false;
        spawnFoe();
        syncHud();
      }
      function syncHud() {
        env.hud({
          score: score, lives: lives, level: wave,
          extra: '第 ' + wave + ' 场 · 命 ' + lives + ' · ' + cfg.label
        });
      }
      function spawnFoe() {
        var w = wave - 1;
        foe.m = 0.85 + w * 0.06 * cfg.gain;
        foe.v = cfg.aiV * (1 + w * 0.13);
        foe.dashV = cfg.dash * (1 + w * 0.08);
        foe.dashCd = Math.max(0.9, 2.6 - w * 0.22);
        foe.think = 0.8; foe.dashT = 0;
        foe.x = CX; foe.y = CY - 110;
        foe.vx = 0; foe.vy = 0;
      }

      function finish(meWin) {
        if (finished) return;
        finished = true; over = true;
        var sc = Math.round((score + (meWin ? lives * 120 : 0)) * cfg.mult);
        env.gameOver({
          win: !!meWin,
          score: sc,
          level: wave,
          extra: meWin ? '连赢 ' + wave + ' 场称霸！' : '止步第 ' + wave + ' 场'
        });
      }
      function roundEnd(playerOut) {
        if (playerOut) {
          lives--;
          sfx.play('explosion');
          msg = '被推出场外！剩 ' + lives + ' 命'; msgT = 1.6;
          if (lives <= 0) { finish(false); return; }
          score = Math.max(0, score - 60);
        } else {
          score += 150 * wave;
          sfx.play('levelup');
          msg = '对手出场！+' + (150 * wave) + ' 分'; msgT = 1.6;
          wave++;
          if (wave > 8) { finish(true); return; }
        }
        syncHud();
        pauseT = 1.2;
        me.x = CX; me.y = CY + 110; me.vx = 0; me.vy = 0; me.dashT = 0;
        stam = 100;
        spawnFoe();
      }

      function knock(a, b, boost) { /* a 撞 b：沿法线把动量给 b */
        var dx = b.x - a.x, dy = b.y - a.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var nx = dx / d, ny = dy / d;
        var impulse = boost;
        b.vx += nx * impulse / b.m;
        b.vy += ny * impulse / b.m;
        a.vx -= nx * impulse * 0.25;
        a.vy -= ny * impulse * 0.25;
      }

      function update(dt) {
        if (over) return;
        if (msgT > 0) msgT -= dt;

        if (pauseT > 0) { pauseT -= dt; return; }

        /* ---- 玩家输入向量 ---- */
        var ix = 0, iy = 0;
        if (env.pad.left) ix -= 1;
        if (env.pad.right) ix += 1;
        if (env.pad.up) iy -= 1;
        if (env.pad.down) iy += 1;
        if (stick.on) {
          var sl = Math.sqrt(stick.dx * stick.dx + stick.dy * stick.dy);
          if (sl > 0.18) { ix = stick.dx / Math.max(sl, 1); iy = stick.dy / Math.max(sl, 1); }
        }
        var il = Math.sqrt(ix * ix + iy * iy);
        if (il > 1) { ix /= il; iy /= il; }

        /* 冲刺：Space 手柄 A，边沿触发 */
        var dashPressed = (env.pad.a && !prev.a);
        if (dashPressed && stam > 12 && il > 0.15) {
          me.dashT = 0.28;
          me.dx = ix; me.dy = iy;
          stam -= 30;
          sfx.play('powerup');
        }
        prev.a = env.pad.a;

        stam = Math.min(100, stam + 22 * dt);

        /* ---- 玩家运动 ---- */
        var sp = 300;
        if (me.dashT > 0) {
          me.dashT -= dt;
          me.vx = me.dx * 740; me.vy = me.dy * 740;
        } else {
          me.vx = ix * sp; me.vy = iy * sp;
        }
        me.x += me.vx * dt;
        me.y += me.vy * dt;

        /* ---- AI ---- */
        foe.think -= dt;
        if (foe.dashCd > 0) foe.dashCd -= dt;
        if (foe.dashT > 0) {
          foe.dashT -= dt;
          foe.vx = foe.sd * foe.dashV;
          foe.vy = foe.sr * foe.dashV;
        } else {
          if (foe.think <= 0) {
            foe.think = 0.24 + Math.random() * 0.2;
            var ang = Math.atan2(me.y - foe.y, me.x - foe.x) + (Math.random() * 0.7 - 0.35);
            /* 波次 2+ 偶尔绕侧蓄力 */
            if (wave >= 2 && foe.dashCd <= 0 && Math.random() < 0.014 + wave * 0.006) {
              foe.dashT = 0.3;
              foe.sd = Math.cos(ang); foe.sr = Math.sin(ang);
              foe.dashCd = Math.max(0.9, 2.6 - wave * 0.22) + Math.random();
            } else {
              foe.vx = Math.cos(ang) * foe.v;
              foe.vy = Math.sin(ang) * foe.v;
            }
          }
        }
        foe.x += foe.vx * dt;
        foe.y += foe.vy * dt;

        /* ---- 碰撞 ---- */
        var ddx = foe.x - me.x, ddy = foe.y - me.y;
        var dd = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dd < PR * 2) {
          var nx = ddx / (dd || 1), ny = ddy / (dd || 1);
          /* 分离 */
          var ov = PR * 2 - dd;
          me.x -= nx * ov * 0.5 * (foe.m / (1 + foe.m));
          me.y -= ny * ov * 0.5 * (foe.m / (1 + foe.m));
          foe.x += nx * ov * 0.5 / (1 + foe.m);
          foe.y += ny * ov * 0.5 / (1 + foe.m);
          /* 沿法线相对速度：接近则交换（弹性 0.85） */
          var rvn = (foe.vx - me.vx) * nx + (foe.vy - me.vy) * ny;
          if (rvn < 0) {
            var e = 0.85;
            var j = -(1 + e) * rvn / (1 / 1 + 1 / foe.m);
            me.vx -= j * nx; me.vy -= j * ny;
            foe.vx += j * nx / foe.m; foe.vy += j * ny / foe.m;
            if (Math.abs(rvn) > 190) sfx.play('hit');
            if (me.dashT > 0) { knock(me, foe, 340); me.dashT = 0; sfx.play('hit'); }
            if (foe.dashT > 0) { knock(foe, me, 300 * foe.m); foe.dashT = 0; }
          }
        }

        /* ---- 出界判定 ---- */
        function out(o) {
          var ddx2 = o.x - CX, ddy2 = o.y - CY;
          return Math.sqrt(ddx2 * ddx2 + ddy2 * ddy2) > RING - 6;
        }
        var meOut = out(me), foeOut = out(foe);
        if (meOut && foeOut) { if (me.dashT > 0 || me.x === CX) roundEnd(true); else roundEnd(false); }
        else if (foeOut) roundEnd(false);
        else if (meOut) roundEnd(true);
      }

      function render() {
        var i;
        ctx.fillStyle = '#1c1917'; ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        /* 土俵 */
        ctx.fillStyle = '#d6b28a';
        ctx.beginPath(); ctx.arc(CX, CY, RING + 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8cfa8';
        ctx.beginPath(); ctx.arc(CX, CY, RING, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(120,80,40,.4)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(CX, CY, RING - 26, 0, Math.PI * 2); ctx.stroke();
        /* 中心线 */
        ctx.strokeStyle = 'rgba(120,80,40,.5)'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(CX - 34, CY - 8); ctx.lineTo(CX + 34, CY - 8);
        ctx.moveTo(CX - 34, CY + 8); ctx.lineTo(CX + 34, CY + 8);
        ctx.stroke();

        /* 对手 */
        ctx.fillStyle = '#ef4444';
        ctx.beginPath(); ctx.arc(foe.x, foe.y, PR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText('x' + foe.m.toFixed(2), foe.x, foe.y - PR - 14);

        /* 玩家 + 冲刺方向 */
        ctx.fillStyle = me.dashT > 0 ? '#fde047' : '#2563eb';
        ctx.beginPath(); ctx.arc(me.x, me.y, PR, 0, Math.PI * 2); ctx.fill();

        /* 体力条 */
        var bx = 140, by = 640;
        ctx.fillStyle = 'rgba(255,255,255,.15)';
        env.roundRect(bx, by, 280, 14, 7); ctx.fill();
        ctx.fillStyle = stam > 30 ? '#22c55e' : '#f97316';
        env.roundRect(bx, by, 280 * stam / 100, 14, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText('体力（Space / A 冲刺）', 280, by - 14);

        /* 摇杆可视化 */
        if (stick.on) {
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(stick.ox, stick.oy, 46, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.4)';
          ctx.beginPath(); ctx.arc(stick.ox + stick.dx * 30, stick.oy + stick.dy * 30, 16, 0, Math.PI * 2); ctx.fill();
        }

        /* 比分/波次 */
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText('第 ' + Math.min(wave, 8) + ' / 8 场 · ⚫ ' + lives, 280, 36);

        if (msgT > 0 && msg) {
          ctx.globalAlpha = Math.min(1, msgT);
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 17px system-ui, sans-serif';
          ctx.fillText(msg, 280, 66);
          ctx.globalAlpha = 1;
        }
        if (pauseT > 0 && !over) {
          ctx.fillStyle = 'rgba(255,255,255,.75)';
          ctx.font = 'bold 22px system-ui, sans-serif';
          ctx.fillText('准备…', 280, CY);
        }
      }

      /* ---- 触屏摇杆：画布下半区拖动 ---- */
      function onDown(e) {
        var p = env.pointer(e);
        if (p.y > 420) {
          stick.on = true; stick.ox = p.x; stick.oy = p.y;
          stick.dx = 0; stick.dy = 0;
        }
      }
      function onMove(e) {
        if (!stick.on) return;
        var p = env.pointer(e);
        stick.dx = p.x - stick.ox; stick.dy = p.y - stick.oy;
        var l = Math.sqrt(stick.dx * stick.dx + stick.dy * stick.dy);
        if (l > 46) { stick.dx = stick.dx / l * 46; stick.dy = stick.dy / l * 46; }
        if (l > 0) { stick.dx /= 46; stick.dy /= 46; }
      }
      function onUp() { stick.on = false; stick.dx = 0; stick.dy = 0; }
      env.canvas.addEventListener('pointerdown', onDown);
      env.canvas.addEventListener('pointermove', onMove);
      env.canvas.addEventListener('pointerup', onUp);
      env.canvas.addEventListener('pointercancel', onUp);

      reset();
      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        state: function () {
          return { me: { x: me.x, y: me.y }, foe: { x: foe.x, y: foe.y }, stam: stam, lives: lives, wave: wave, score: score, over: over, phase: over ? 'over' : (pauseT > 0 ? 'pause' : 'play'), pad: { a: env.pad.a, right: env.pad.right, left: env.pad.left }, dashT: me.dashT };
        },
        move: function (x, y) { me.x = x; me.y = y; },
        placeFoe: function (x, y) { foe.x = x; foe.y = y; pauseT = 0; },
        dash: function (dx, dy) { if (stam > 12) { me.dashT = 0.28; me.dx = dx; me.dy = dy; stam -= 30; } }
      };

      return {
        start: function () { syncHud(); },
        restart: function () { reset(); },
        destroy: function () {
          env.canvas.removeEventListener('pointerdown', onDown);
          env.canvas.removeEventListener('pointermove', onMove);
          env.canvas.removeEventListener('pointerup', onUp);
          env.canvas.removeEventListener('pointercancel', onUp);
        }
      };
    }
  });
})(window);
