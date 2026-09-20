/* ==========================================================================
   台球 Pool —— 简化 10 球台球
   拖拽/键盘瞄准击球 · 进球 +100 · 白球落袋罚分 · 清台进入下一杆阵
   ========================================================================== */
(function () {
  'use strict';

  var BALL_R = 12, POCKET_R = 21;
  var T = { L: 24, R: 536, T: 132, B: 666 }; /* 桌面区域 */
  var CX = (T.L + T.R) / 2;
  var POCKETS = [
    { x: T.L + 4, y: T.T + 4 }, { x: T.R - 4, y: T.T + 4 },
    { x: T.L + 4, y: T.B - 4 }, { x: T.R - 4, y: T.B - 4 },
    { x: CX, y: T.T + 2 }, { x: CX, y: T.B - 2 }
  ];

  GameKit.register({
    id: 'pool',
    name: { zh: '台球', en: 'Pool' },
    desc: { zh: '拖拽瞄准、松手击球：把彩球撞入袋中得分，白球落袋要罚分，清空球台进入下一阵，限时内冲击高分。', en: 'Aim by dragging and release to shoot. Pocket balls for points, clear the table for bonus.' },
    genre: { zh: '休闲体育', en: 'Sports' },
    icon: '🎱', hue: '#2ee6a8',
    logical: { w: 560, h: 700 },
    hot: false, isNew: true, sound: 'calm',
    controls: {
      keyboard: [
        { k: '← → / A D', zh: '旋转瞄准', en: 'Rotate aim' },
        { k: 'Space / J 按住蓄力', zh: '松开击球', en: 'Hold to charge, release to shoot' }
      ],
      touch: [{ k: '拖拽瞄准 · 松手击球', zh: '瞄准击球', en: 'Drag to aim, release to shoot' }]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }

      var balls, white, score, level, timeLeft, levelTime, shots;
      var over, phase, aimA, aimP, keyP, charging, floats, msg, msgT, msgColor, prev, rackPocketed, flashT;

      function reset() {
        score = 0; level = 1; over = false; shots = 0;
        floats = []; prev = {}; aimA = -Math.PI / 2; aimP = 0; keyP = 0; charging = false;
        msg = ''; msgT = 0; rackPocketed = 0; flashT = 0;
        levelTime = Math.round(150 * (diff === 'easy' ? 1.25 : diff === 'hard' ? 0.8 : 1));
        timeLeft = levelTime;
        rack(true);
      }

      function rack(first) {
        balls = [];
        /* 三角阵：1-2-3-4 共 10 球，摆在桌面上部 */
        var cols = 0, n = 0;
        for (var c = 0; c < 4; c++) {
          cols = c + 1;
          for (var r = 0; r < cols; r++) {
            n++;
            balls.push({
              x: CX + 30 + c * BALL_R * 2.15,
              y: T.T + 90 + (c * BALL_R * 2.15) / 2 - (cols - 1) * BALL_R * 1.08 + r * BALL_R * 2.16,
              vx: 0, vy: 0,
              color: 'hsl(' + ((n * 47) % 360) + ',72%,56%)',
              pocketed: false
            });
          }
        }
        white = { x: CX, y: T.B - 90, vx: 0, vy: 0, color: '#f6f3ee', pocketed: false, isWhite: true };
        if (!first) flashMsg('第 ' + level + ' 阵 · 清台 +奖', '#0d8f63');
        env.hud({ score: score, lives: 1, level: level, extra: '剩余 ' + remain() + ' 球' });
      }

      function remain() {
        var n = 0;
        for (var i = 0; i < balls.length; i++) if (!balls[i].pocketed) n++;
        return n;
      }

      function flashMsg(t, color) { msg = t; msgColor = color; msgT = 1.8; }

      /* ---------- 物理 ---------- */
      function allBalls() { return balls.concat([white]); }

      function step(dt) {
        var list = allBalls();
        var i, j, b;
        for (i = 0; i < list.length; i++) {
          b = list[i];
          if (b.pocketed) continue;
          b.x += b.vx * dt; b.y += b.vy * dt;
          var sp = Math.hypot(b.vx, b.vy);
          if (sp > 0) {
            var f = Math.max(0, 1 - 1.15 * dt);
            b.vx *= f; b.vy *= f;
            if (sp < 9) { b.vx = 0; b.vy = 0; }
          }
          /* 袋口 */
          for (var p = 0; p < POCKETS.length; p++) {
            var pk = POCKETS[p];
            if (Math.hypot(b.x - pk.x, b.y - pk.y) < POCKET_R - 3) { sink(b); break; }
          }
          if (b.pocketed) continue;
          /* 库边 */
          if (b.x < T.L + BALL_R) { b.x = T.L + BALL_R; b.vx = Math.abs(b.vx) * 0.82; if (sp > 60) sfx.play('bounce'); }
          else if (b.x > T.R - BALL_R) { b.x = T.R - BALL_R; b.vx = -Math.abs(b.vx) * 0.82; if (sp > 60) sfx.play('bounce'); }
          if (b.y < T.T + BALL_R) { b.y = T.T + BALL_R; b.vy = Math.abs(b.vy) * 0.82; if (sp > 60) sfx.play('bounce'); }
          else if (b.y > T.B - BALL_R) { b.y = T.B - BALL_R; b.vy = -Math.abs(b.vy) * 0.82; if (sp > 60) sfx.play('bounce'); }
        }
        /* 球-球弹性碰撞（等质量） */
        for (i = 0; i < list.length; i++) {
          var a = list[i];
          if (a.pocketed) continue;
          for (j = i + 1; j < list.length; j++) {
            b = list[j];
            if (b.pocketed) continue;
            var dx = b.x - a.x, dy = b.y - a.y;
            var d = Math.hypot(dx, dy) || 0.001;
            if (d >= BALL_R * 2) continue;
            var nx = dx / d, ny = dy / d;
            var overlap = BALL_R * 2 - d;
            a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
            b.x += nx * overlap / 2; b.y += ny * overlap / 2;
            var rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv < 0) {
              var jimp = -(1 + 0.94) * rv / 2;
              a.vx -= jimp * nx; a.vy -= jimp * ny;
              b.vx += jimp * nx; b.vy += jimp * ny;
              if (Math.abs(rv) > 140) sfx.play('hit');
            }
          }
        }
      }

      function sink(b) {
        b.pocketed = true; b.vx = 0; b.vy = 0;
        if (b.isWhite) {
          sfx.play('warn');
          flashMsg('白球落袋 -50', '#e23c4c');
          score = Math.max(0, score - 50);
          env.hud({ score: score });
          env.delay(function () {
            white.pocketed = false;
            white.x = CX; white.y = T.B - 90; white.vx = 0; white.vy = 0;
          }, 600);
        } else {
          rackPocketed++;
          var gain = 100 + Math.min(100, (rackPocketed - 1) * 50);
          score += gain;
          sfx.play(rackPocketed > 1 ? 'coin' : 'punch');
          floats.push({ x: b.x, y: b.y, txt: '+' + gain, color: '#0d8f63', t: 1 });
          env.hud({ score: score });
        }
      }

      function strike(angle, power) {
        if (over || phase !== 'aim' || white.pocketed) return;
        power = Math.max(0.08, Math.min(1, power));
        white.vx = Math.cos(angle) * (360 + 640 * power);
        white.vy = Math.sin(angle) * (360 + 640 * power);
        phase = 'sim';
        shots++;
        sfx.play('shoot');
        rackPocketed = 0;
        env.hud({ extra: '击球中…' });
      }

      function settle() {
        phase = 'aim';
        if (remain() === 0) {
          var bonus = 200 + level * 60;
          score += bonus;
          sfx.play('levelup');
          flashMsg('清台！+' + bonus, '#0d8f63');
          level++;
          env.hud({ score: score, level: level });
          env.delay(function () { if (!over) rack(false); }, 900);
        } else {
          env.hud({ extra: '剩余 ' + remain() + ' 球' });
        }
      }

      /* ---------- 输入 ---------- */
      var dragging = false, lastPt = null;

      env.canvas.addEventListener('pointerdown', function (e) {
        if (over || phase !== 'aim') return;
        dragging = true;
        lastPt = env.pointer(e);
        updateAimFromPt();
      });
      window.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        lastPt = env.pointer(e);
        updateAimFromPt();
      });
      window.addEventListener('pointerup', function () {
        if (!dragging) return;
        dragging = false;
        if (aimP > 0.06) strike(aimA, aimP);
        aimP = 0;
      });
      function updateAimFromPt() {
        if (!lastPt) return;
        var dx = lastPt.x - white.x, dy = lastPt.y - white.y;
        if (Math.hypot(dx, dy) > 6) {
          aimA = Math.atan2(dy, dx);
          aimP = Math.min(1, Math.hypot(dx, dy) / 300);
        }
      }

      var unbindKey = env.onKey(function (e, type) {
        if (over || phase !== 'aim') return;
        if (type === 'up' && (e.code === 'Space' || e.code === 'KeyJ')) {
          if (keyP > 0.06) strike(aimA, keyP);
          keyP = 0; charging = false;
        }
        if (type === 'down' && (e.code === 'Space' || e.code === 'KeyJ')) charging = true;
      });

      function edge() {
        var hit = null;
        ['left', 'right', 'a'].forEach(function (k) {
          if (env.pad[k] && !prev[k]) hit = k;
          prev[k] = env.pad[k];
        });
        return hit;
      }

      function update(dt) {
        var i;
        for (i = floats.length - 1; i >= 0; i--) {
          var f = floats[i]; f.t -= dt / 0.9; f.y -= dt * 40;
          if (f.t <= 0) floats.splice(i, 1);
        }
        if (msgT > 0) msgT -= dt;
        if (over) return;

        timeLeft -= dt;
        if (timeLeft <= 10.5 && timeLeft + dt > 10.5) sfx.play('warn');
        if (timeLeft <= 0) {
          timeLeft = 0;
          over = true;
          env.gameOver({ score: score, detail: '清台 ' + (level - 1) + ' 阵 · 出杆 ' + shots + ' 次' });
          return;
        }
        env.hud({ level: level });

        if (phase === 'aim') {
          var e2 = edge();
          if (e2 === 'left') aimA -= 1.9 * dt;
          else if (e2 === 'right') aimA += 1.9 * dt;
          else if (e2 === 'a') { charging = true; }
          if (charging && env.pad.a) {
            keyP = Math.min(1, keyP + dt / 1.15);
            aimP = keyP;
          }
        } else {
          var sub = 4, sdt = dt / sub;
          for (i = 0; i < sub; i++) step(sdt);
          var list = allBalls(), moving = false;
          for (i = 0; i < list.length; i++) if (!list[i].pocketed && (list[i].vx || list[i].vy)) moving = true;
          if (!moving) settle();
        }
      }

      /* ---------- 渲染 ---------- */
      function drawBall(b) {
        if (b.pocketed) return;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
        var g = ctx.createRadialGradient(b.x - 4, b.y - 5, 2, b.x, b.y, BALL_R);
        g.addColorStop(0, b.isWhite ? '#ffffff' : shade(b.color, 1.35));
        g.addColorStop(1, b.color);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, 7); ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.arc(b.x - 4, b.y - 5, 2.4, 0, 7); ctx.fill();
      }
      function shade(hcol, k) {
        /* hsl 串直接亮化：解析简单情况失败则原样返回 */
        var m = /hsl\((\d+),(\d+)%,(\d+)%\)/.exec(hcol);
        if (!m) return hcol;
        return 'hsl(' + m[1] + ',' + m[2] + '%,' + Math.min(92, Math.round(+m[3] * k)) + '%)';
      }

      function render() {
        var i;
        /* 背景 */
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#17240f'); bg.addColorStop(1, '#0e1809');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        /* 桌面 */
        ctx.fillStyle = '#5a3d24';
        env.roundRect(T.L - 12, T.T - 12, T.R - T.L + 24, T.B - T.T + 24, 20); ctx.fill();
        var cloth = ctx.createRadialGradient(CX, (T.T + T.B) / 2, 60, CX, (T.T + T.B) / 2, 420);
        cloth.addColorStop(0, '#1d7a4f'); cloth.addColorStop(1, '#12593a');
        ctx.fillStyle = cloth;
        env.roundRect(T.L, T.T, T.R - T.L, T.B - T.T, 12); ctx.fill();

        /* 袋口 */
        for (i = 0; i < POCKETS.length; i++) {
          ctx.fillStyle = '#08120b';
          ctx.beginPath(); ctx.arc(POCKETS[i].x, POCKETS[i].y, POCKET_R, 0, 7); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2; ctx.stroke();
        }

        /* 瞄准线 */
        if (phase === 'aim' && !over && !white.pocketed) {
          ctx.save();
          ctx.setLineDash([7, 8]);
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + aimP * 0.4) + ')';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(white.x, white.y);
          ctx.lineTo(white.x + Math.cos(aimA) * (60 + aimP * 320), white.y + Math.sin(aimA) * (60 + aimP * 320));
          ctx.stroke();
          ctx.restore();
          /* 力度条 */
          var bw = 240, bx = CX - bw / 2, by = T.B + 0;
          ctx.fillStyle = 'rgba(0,0,0,.35)';
          env.roundRect(bx, by + 14, bw, 10, 5); ctx.fill();
          ctx.fillStyle = aimP > 0.7 ? '#ff9d3b' : '#8fe06a';
          env.roundRect(bx, by + 14, Math.max(3, bw * aimP), 10, 5); ctx.fill();
        }

        var list = allBalls();
        for (i = 0; i < list.length; i++) drawBall(list[i]);

        for (i = 0; i < floats.length; i++) {
          var f = floats[i];
          ctx.globalAlpha = Math.max(0, Math.min(1, f.t * 1.4));
          ctx.textAlign = 'center'; ctx.font = 'bold 17px system-ui';
          ctx.fillStyle = f.color; ctx.fillText(f.txt, f.x, f.y);
          ctx.globalAlpha = 1;
        }

        if (msgT > 0) {
          ctx.globalAlpha = Math.min(1, msgT);
          ctx.textAlign = 'center'; ctx.font = 'bold 22px system-ui';
          ctx.fillStyle = msgColor || '#f6f3ee';
          ctx.fillText(msg, CX, T.T - 34);
          ctx.globalAlpha = 1;
        } else if (phase === 'aim' && !over) {
          ctx.textAlign = 'center'; ctx.font = '13px system-ui';
          ctx.fillStyle = 'rgba(246,243,238,.65)';
          ctx.fillText('拖拽瞄准 · 拖得越远力越大 · 松手击球', CX, T.T - 34);
        }

        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(246,243,238,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('得分', 24, 34);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Consolas, monospace';
        ctx.fillText(String(score), 24, 66);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(246,243,238,.7)'; ctx.font = '13px system-ui';
        ctx.fillText(Math.ceil(timeLeft) + 's · ' + (diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通'), CX, 34);
        ctx.textAlign = 'right';
        ctx.fillText('阵', W - 24, 34);
        ctx.fillStyle = '#8fe06a'; ctx.font = 'bold 28px Consolas, monospace';
        ctx.fillText(String(level), W - 24, 66);
      }

      reset();
      phase = 'aim';

      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        strike: strike,
        balls: function () {
          return { white: { x: white.x, y: white.y }, phase: phase, score: score,
            targets: balls.filter(function (b) { return !b.pocketed; }).map(function (b) { return { x: b.x, y: b.y }; }) };
        },
        hurry: function () { timeLeft = Math.min(timeLeft, 0.5); }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 1, level: 1, extra: '剩余 ' + remain() + ' 球' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
