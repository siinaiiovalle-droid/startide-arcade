/* ==========================================================================
   射箭 Archery
   角度微调 + 按住蓄力（往复条）+ 风偏弹道 · 10 箭制 · 靶位距离渐远 · 三难度
   ========================================================================== */
(function () {
  'use strict';

  var CFG = {
    easy:   { wind: 2.2, vMul: 6.6, rounds: 10 },
    normal: { wind: 3.2, vMul: 6.2, rounds: 10 },
    hard:   { wind: 4.4, vMul: 5.8, rounds: 10 }
  };
  var TOP = 150;
  var AX = 86, AY = 470; /* 弓箭手位置 */
  var G = 820;

  GameKit.register({
    id: 'archery',
    name: { zh: '射箭', en: 'Archery' },
    desc: { zh: '观风辨位，拉弓放箭！注意风向对箭的影响，靶子越远越偏分越高，正中十环有大奖。十支箭，看看你能拿多少环！', en: 'Watch the wind, draw and release! Farther targets score more — nail the bullseye for big points. 10 arrows!' },
    genre: { zh: '体育竞技', en: 'Sports' },
    icon: '🏹', hue: '#65a30d',
    logical: { w: 560, h: 700 },
    plays: 5000, hot: false, isNew: true, sound: 'calm',
    script: 'assets/js/games/archery.js',
    ratio: 'portrait', duration: '2-5 分钟',
    touchControls: ['left', 'right', 'a', 'b'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!CFG[diff]) diff = 'normal';
      var cfg = CFG[diff];

      var angle, charging, chargeT, power, arrows, round, score, bulls;
      var arrow, wind, tx, ty, result, resultT, over, prevA, pointerDown, parts, trail;
      var ringMsg;

      function reset() {
        angle = 45; charging = false; chargeT = 0; power = 0;
        arrows = cfg.rounds; round = 1; score = 0; bulls = 0;
        arrow = null; result = ''; resultT = 0; over = false;
        prevA = false; pointerDown = false; parts = []; trail = []; ringMsg = '';
        newRound();
        env.hud({ score: 0, lives: cfg.rounds, level: 1, extra: '第 1/10 箭' });
      }

      function newRound() {
        var prog = Math.min(1, (round - 1) / (cfg.rounds - 1));
        tx = 330 + prog * 190 + env.rand(-20, 20);
        ty = env.rand(TOP + 90, TOP + 260);
        wind = env.rand(-cfg.wind, cfg.wind);
        arrow = null; trail = []; charging = false; chargeT = 0;
        env.hud({ score: Math.round(score), lives: arrows, level: round, extra: '风 ' + Math.abs(wind).toFixed(1) + (wind >= 0 ? ' →' : ' ←') });
      }

      function ringOf(d) {
        if (d <= 13) return 10;
        return Math.max(0, 10 - Math.ceil((d - 13) / 13));
      }

      function fire() {
        if (over || arrow || resultT > 0) return;
        var a = angle * Math.PI / 180;
        var v = power * cfg.vMul;
        arrow = {
          x: AX + 26, y: AY - 6,
          vx: Math.cos(a) * v,
          vy: -Math.sin(a) * v
        };
        charging = false;
        sfx.play('laser');
      }

      function land() {
        var d = Math.sqrt((arrow.x - tx) * (arrow.x - tx) + (arrow.y - ty) * (arrow.y - ty));
        var ring = ringOf(d);
        arrows--;
        if (ring > 0) {
          var distBonus = 1 + Math.max(0, (tx - 330)) / 240;
          var pts = Math.round(ring * 10 * distBonus);
          if (ring === 10) { pts += 50; bulls++; sfx.play('win'); ringMsg = '十环! +' + pts; }
          else { sfx.play(ring >= 7 ? 'coin' : 'hit'); ringMsg = ring + ' 环 +' + pts; }
          score += pts;
          for (var i = 0; i < 10; i++) {
            parts.push({ x: arrow.x, y: arrow.y, vx: env.rand(-120, 120), vy: env.rand(-140, 40), t: 0, c: '#fde047' });
          }
        } else {
          ringMsg = '脱靶';
          sfx.play('ig');
        }
        result = ringMsg;
        resultT = 1.1;
        arrow = null;
        env.hud({ score: Math.round(score), lives: arrows, level: round, extra: ringMsg });
      }

      function update(dt) {
        var i;
        /* 粒子 */
        for (i = parts.length - 1; i >= 0; i--) {
          var q = parts[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 500 * dt;
          if (q.t > 0.7) parts.splice(i, 1);
        }
        if (over) return;
        /* 结算间隔 */
        if (resultT > 0) {
          resultT -= dt;
          if (resultT <= 0) {
            if (arrows <= 0) {
              over = true;
              sfx.play('gameover');
              env.gameOver({ score: Math.round(score), detail: '十环 ' + bulls + ' 次 · 用箭 ' + cfg.rounds });
              return;
            }
            round++;
            newRound();
          }
          return;
        }
        /* 瞄准：pad 边沿步进 + 持续按住微调 */
        if (env.pad.left && !prevL) angle = Math.max(15, angle - 4);
        if (env.pad.right && !prevR) angle = Math.min(80, angle + 4);
        if (env.pad.left) angle = Math.max(15, angle - 34 * dt);
        if (env.pad.right) angle = Math.min(80, angle + 34 * dt);
        prevL = env.pad.left; prevR = env.pad.right;
        /* 蓄力：A 键或按住屏幕 */
        var nowA = env.pad.a || pointerDown;
        if (nowA && !prevA) { charging = true; chargeT = 0; }
        if (!nowA && prevA && charging) fire();
        prevA = nowA;
        if (charging) {
          chargeT += dt * 1.5;
          power = 100 * Math.abs(Math.sin(chargeT * 1.35));
        }
        /* 箭飞行 */
        if (arrow) {
          arrow.vy += G * dt;
          arrow.vx += wind * 42 * dt;
          arrow.x += arrow.vx * dt;
          arrow.y += arrow.vy * dt;
          trail.push({ x: arrow.x, y: arrow.y });
          if (trail.length > 22) trail.shift();
          /* 接近靶面即插靶（避免高速穿越） */
          var dxa = arrow.x - tx, dya = arrow.y - ty;
          if (dxa * dxa + dya * dya < 3600) { land(); }
          else if (arrow.y > H + 20 || arrow.x > W + 30 || arrow.x < -30) land();
        }
      }
      var prevL = false, prevR = false;

      var unbindKey = env.onKey(function (e, type) {
        var K = e.code;
        if ((K === 'Space' || K === 'KeyJ') && type === 'down') e.preventDefault();
      });

      env.canvas.addEventListener('pointerdown', function (e) { e.preventDefault(); pointerDown = true; });
      env.canvas.addEventListener('pointerup', function () { if (pointerDown && charging) { pointerDown = false; fire(); } else pointerDown = false; });
      env.canvas.addEventListener('pointerleave', function () { pointerDown = false; });

      function drawTarget(x, y, r) {
        var cols = ['#f8fafc', '#dc2626', '#f8fafc', '#dc2626', '#f8fafc', '#dc2626', '#f8fafc', '#dc2626', '#fde047'];
        for (var i = 0; i < 9; i++) {
          ctx.fillStyle = cols[i];
          ctx.beginPath();
          ctx.arc(x, y, r - i * 13, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#92400e';
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      }

      function render() {
        var i;
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#365314'); sky.addColorStop(0.55, '#4d7c0f'); sky.addColorStop(1, '#84cc16');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        /* 远山 */
        ctx.fillStyle = 'rgba(63,98,18,.8)';
        ctx.beginPath();
        ctx.moveTo(0, TOP + 40);
        ctx.lineTo(140, TOP - 40);
        ctx.lineTo(300, TOP + 50);
        ctx.lineTo(460, TOP - 20);
        ctx.lineTo(W, TOP + 40);
        ctx.lineTo(W, H); ctx.lineTo(0, H);
        ctx.closePath(); ctx.fill();
        /* 地面 */
        ctx.fillStyle = '#3f6212';
        ctx.fillRect(0, AY + 26, W, H - AY - 26);
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.fillRect(0, AY + 26, W, 4);
        /* 草 */
        ctx.fillStyle = 'rgba(190,242,100,.5)';
        for (i = 0; i < 14; i++) {
          var gx = (i * 47 + 20) % W;
          ctx.fillRect(gx, AY + 34 + (i % 3) * 8, 3, 9);
        }
        /* 箭靶 */
        drawTarget(tx, ty, 117);
        /* 弓箭手 */
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(AX, AY - 14, 22, Math.PI * 0.62, Math.PI * 1.38, false); /* 弓 */
        ctx.stroke();
        var a = angle * Math.PI / 180;
        var px = Math.cos(a) * 24, py = -Math.sin(a) * 24;
        ctx.strokeStyle = 'rgba(253,224,71,.75)'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(AX, AY - 14 - 22); ctx.lineTo(AX, AY - 14 + 22);
        ctx.stroke();
        /* 箭（搭在弦上 / 飞行中） */
        ctx.strokeStyle = '#fef3c7'; ctx.lineWidth = 3;
        if (arrow) {
          var va = Math.atan2(arrow.vy, arrow.vx);
          ctx.beginPath();
          ctx.moveTo(arrow.x - Math.cos(va) * 16, arrow.y - Math.sin(va) * 16);
          ctx.lineTo(arrow.x + Math.cos(va) * 16, arrow.y + Math.sin(va) * 16);
          ctx.stroke();
          /* 轨迹 */
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
          ctx.beginPath();
          for (i = 0; i < trail.length; i++) {
            if (i === 0) ctx.moveTo(trail[i].x, trail[i].y);
            else ctx.lineTo(trail[i].x, trail[i].y);
          }
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(AX - 4, AY - 6);
          ctx.lineTo(AX + 26 + px * 0.4, AY - 6 + py * 0.4);
          ctx.stroke();
        }
        /* 瞄准虚线 */
        ctx.strokeStyle = 'rgba(255,255,255,.25)';
        ctx.setLineDash([4, 8]); ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(AX + 28, AY - 6);
        ctx.lineTo(AX + 28 + Math.cos(a) * 190, AY - 6 - Math.sin(a) * 190);
        ctx.stroke();
        ctx.setLineDash([]);
        /* 粒子 */
        for (i = 0; i < parts.length; i++) {
          var p = parts[i];
          ctx.globalAlpha = Math.max(0, 1 - p.t / 0.7);
          ctx.fillStyle = p.c;
          ctx.fillRect(p.x - 2, p.y - 2, 5, 5);
          ctx.globalAlpha = 1;
        }
        /* 蓄力条 */
        if (charging) {
          ctx.fillStyle = 'rgba(0,0,0,.4)';
          env.roundRect(AX - 40, AY + 60, 160, 16, 8); ctx.fill();
          var pw = 156 * power / 100;
          ctx.fillStyle = power > 88 ? '#f87171' : power > 55 ? '#fde047' : '#a3e635';
          env.roundRect(AX - 37, AY + 63, Math.max(4, pw), 10, 5); ctx.fill();
        }
        /* 风指示 */
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 20px system-ui';
        ctx.fillStyle = Math.abs(wind) > cfg.wind * 0.7 ? '#fca5a5' : 'rgba(255,255,255,.85)';
        ctx.fillText(wind >= 0 ? '风 → ' + Math.abs(wind).toFixed(1) : '风 ← ' + Math.abs(wind).toFixed(1), W / 2, TOP + 16);
        /* 结果 */
        if (resultT > 0) {
          ctx.font = 'bold 30px system-ui';
          ctx.fillStyle = ringMsg === '脱靶' ? '#fca5a5' : '#fef08a';
          ctx.fillText(result, W / 2, TOP + 60);
        }
        /* 顶部信息 */
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(240,240,240,.65)'; ctx.font = '13px system-ui';
        ctx.fillText('得分', 24, 34);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(Math.round(score) + '', 24, 68);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(240,240,240,.65)'; ctx.font = '13px system-ui';
        ctx.fillText('剩余箭', W - 24, 34);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(String(arrows), W - 24, 68);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(240,240,240,.6)'; ctx.font = '13px system-ui';
        ctx.fillText((diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通') + ' · ←→ 调角度 · 按住空格/屏幕蓄力松开放箭', W / 2, 122);
      }

      reset();

      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        setAim: function (a) { angle = a; },
        shoot: function (pw) { power = pw === undefined ? 80 : pw; fire(); },
        forceLand: function () { if (arrow) { arrow.x = tx; arrow.y = ty; } },
        nextRound: function () { if (resultT > 0) resultT = 0.01; },
        newRound: newRound,
        setWind: function (v) { wind = v; },
        state: function () {
          return { over: over, score: Math.round(score), arrows: arrows, round: round, angle: angle, charging: charging, power: Math.round(power), wind: Math.round(wind * 10) / 10, tx: Math.round(tx), ty: Math.round(ty), bulls: bulls };
        }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: cfg.rounds, level: 1, extra: '第 1/10 箭' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
