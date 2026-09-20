/* ==========================================================================
   钓鱼 Fishing —— 钩摆钓场
   钩子左右摆动 · 时机点击下钩 · 大鱼高分 · 河豚扣分扣时 · 限时挑战
   ========================================================================== */
(function () {
  'use strict';

  var PIVOT = { x: 280, y: 168 };
  var WATER = { top: 210, bottom: 655 };
  var KINDS = [
    { id: 'sm', r: 13, pts: 20, speed: 210, hue: '#5ab7ff', label: '小鱼' },
    { id: 'md', r: 19, pts: 50, speed: 150, hue: '#4dd07c', label: '中鱼' },
    { id: 'lg', r: 27, pts: 120, speed: 105, hue: '#ff9d5c', label: '大鱼' },
    { id: 'gold', r: 17, pts: 300, speed: 250, hue: '#ffd166', label: '金鱼' },
    { id: 'bomb', r: 15, pts: -60, speed: 90, hue: '#ff5d6c', label: '河豚' }
  ];

  GameKit.register({
    id: 'fishing',
    name: { zh: '钓鱼', en: 'Fishing' },
    desc: { zh: '钩子左右摆动，看准时机下钩：鱼越大分越高，金鱼 300 分，河豚扣分扣时，60 秒内成为钓王。', en: 'Time your cast as the hook swings. Bigger fish score more; avoid puffers. 60s challenge.' },
    genre: { zh: '休闲街机', en: 'Arcade' },
    icon: '🎣', hue: '#5ab7ff',
    logical: { w: 560, h: 700 },
    hot: false, isNew: true, sound: 'calm',
    controls: {
      keyboard: [
        { k: 'Space / J / Enter', zh: '下钩 / 收线', en: 'Cast / Reel' }
      ],
      touch: [{ k: '点击水面', zh: '下钩 / 收线', en: 'Tap to cast' }]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }

      var fishes, score, timeLeft, levelTime, over, phase, swingT, hookLen, hookAngle, hooked;
      var floats, msg, msgT, msgColor, rippleT, spawnT, prev, caught, lowWarned;

      function reset() {
        fishes = []; score = 0; over = false; caught = 0;
        phase = 'swing'; swingT = 0; hookLen = 0; hookAngle = 0; hooked = null;
        floats = []; msg = ''; msgT = 0; prev = {}; lowWarned = false;
        levelTime = Math.round(60 * (diff === 'easy' ? 1.25 : diff === 'hard' ? 0.8 : 1));
        timeLeft = levelTime;
        for (var i = 0; i < 9; i++) spawnFish(true);
        env.hud({ score: 0, lives: 1, level: 1, extra: '点击下钩' });
      }

      function spawnFish(init) {
        var roll = Math.random();
        var kind = roll < 0.34 ? KINDS[0] : roll < 0.6 ? KINDS[1] : roll < 0.82 ? KINDS[2] : roll < 0.92 ? KINDS[3] : KINDS[4];
        var dir = Math.random() < 0.5 ? 1 : -1;
        fishes.push({
          kind: kind,
          x: init ? env.rand(40, W - 40) : (dir > 0 ? -50 : W + 50),
          y: env.rand(WATER.top + 30, WATER.bottom - 30),
          vx: kind.speed * dir * (diff === 'hard' ? 1.2 : 1),
          wob: Math.random() * 6.28
        });
      }

      function cast() {
        if (over || phase !== 'swing') return;
        phase = 'down';
        hookAngle = swingAngle();
        hookLen = 24;
        sfx.play('shoot');
      }

      function swingAngle() { return Math.sin(swingT * 2.1) * 1.3; }

      function hookTip() {
        return { x: PIVOT.x + Math.sin(hookAngle) * hookLen, y: PIVOT.y + Math.cos(hookAngle) * hookLen };
      }

      function finishCatch() {
        if (hooked) {
          caught++;
          var k = hooked.kind;
          if (k.pts < 0) {
            score = Math.max(0, score + k.pts);
            timeLeft = Math.max(0, timeLeft - 5);
            sfx.play('warn');
            flashMsg('河豚！-60 分 · -5s', '#e23c4c');
          } else {
            score += k.pts;
            sfx.play(k.pts >= 300 ? 'coin' : 'eat');
            floats.push({ x: PIVOT.x, y: PIVOT.y + 40, txt: '+' + k.pts + ' ' + k.label, color: k.pts >= 300 ? '#b45309' : '#0d8f63', t: 1.1 });
          }
          env.hud({ score: score });
          hooked = null;
        }
        phase = 'swing';
        hookLen = 0;
      }

      function flashMsg(t, color) { msg = t; msgColor = color; msgT = 1.6; }

      function update(dt) {
        var i;
        for (i = floats.length - 1; i >= 0; i--) {
          var f = floats[i]; f.t -= dt / 0.9; f.y -= dt * 36;
          if (f.t <= 0) floats.splice(i, 1);
        }
        if (msgT > 0) msgT -= dt;
        if (over) return;

        timeLeft -= dt;
        if (timeLeft <= 10.5 && !lowWarned) { lowWarned = true; sfx.play('warn'); }
        if (timeLeft <= 0) {
          timeLeft = 0;
          over = true;
          env.gameOver({ score: score, detail: '钓上 ' + caught + ' 条鱼' });
          return;
        }

        /* 鱼群（碰边折返，鱼群规模恒定） */
        spawnT -= dt;
        if (spawnT <= 0) { spawnT = env.rand(1.4, 2.6); if (fishes.length < 14) spawnFish(false); }
        for (i = 0; i < fishes.length; i++) {
          var fish = fishes[i];
          fish.x += fish.vx * dt;
          fish.wob += dt * 3;
          fish.y += Math.sin(fish.wob) * 8 * dt;
          if (fish.x < 26 && fish.vx < 0) { fish.vx = Math.abs(fish.vx); fish.x = 26; }
          else if (fish.x > W - 26 && fish.vx > 0) { fish.vx = -Math.abs(fish.vx); fish.x = W - 26; }
        }

        /* 钩子状态机 */
        if (phase === 'swing') {
          swingT += dt;
        } else if (phase === 'down') {
          hookLen += 360 * dt;
          var tip = hookTip();
          if (tip.y > WATER.bottom + 8 || tip.x < 6 || tip.x > W - 6) { phase = 'up'; }
          else {
            for (i = 0; i < fishes.length; i++) {
              var fh = fishes[i];
              if (Math.hypot(tip.x - fh.x, tip.y - fh.y) < fh.kind.r + 12) {
                hooked = fh;
                fishes.splice(i, 1);
                phase = 'up';
                sfx.play('select');
                rippleT = 0.4;
                break;
              }
            }
          }
        } else if (phase === 'up') {
          hookLen -= (hooked ? 430 - hooked.kind.r * 4 : 620) * dt;
          if (hooked) { hooked.x = hookTip().x; hooked.y = hookTip().y + 10; }
          if (hookLen <= 24) finishCatch();
        }

        var act = null;
        if (env.pad.a && !prev.a) act = 'a';
        prev.a = env.pad.a;
        if (act === 'a') cast();
      }

      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        if (e.code === 'Space' || e.code === 'KeyJ' || e.code === 'Enter' || e.code === 'NumpadEnter') cast();
      });

      env.canvas.addEventListener('pointerdown', function () { cast(); });

      /* ---------- 渲染 ---------- */
      function drawFish(fh) {
        var k = fh.kind, dir = fh.vx >= 0 ? 1 : -1;
        ctx.save();
        ctx.translate(fh.x, fh.y);
        ctx.scale(dir, 1);
        ctx.fillStyle = k.hue;
        ctx.beginPath(); ctx.ellipse(0, 0, k.r, k.r * 0.62, 0, 0, 7); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-k.r * 0.9, 0);
        ctx.lineTo(-k.r * 1.5, -k.r * 0.55);
        ctx.lineTo(-k.r * 1.5, k.r * 0.55);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = k.id === 'bomb' ? '#fff' : 'rgba(10,30,50,.85)';
        ctx.beginPath(); ctx.arc(k.r * 0.45, -k.r * 0.15, 2.6, 0, 7); ctx.fill();
        if (k.id === 'bomb') {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(k.r * 0.2, -k.r * 0.5); ctx.lineTo(k.r * 0.7, k.r * 0.2);
          ctx.moveTo(k.r * 0.7, -k.r * 0.5); ctx.lineTo(k.r * 0.2, k.r * 0.2);
          ctx.stroke();
        }
        if (k.id === 'gold') {
          ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.ellipse(0, 0, k.r, k.r * 0.62, 0, 0, 7); ctx.stroke();
        }
        ctx.restore();
      }

      function render() {
        /* 天空 */
        var sky = ctx.createLinearGradient(0, 0, 0, 190);
        sky.addColorStop(0, '#bfe8ff'); sky.addColorStop(1, '#e8f7ff');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 190);
        /* 水面 */
        var sea = ctx.createLinearGradient(0, 190, 0, H);
        sea.addColorStop(0, '#2e7fc2'); sea.addColorStop(1, '#0d3f6e');
        ctx.fillStyle = sea; ctx.fillRect(0, 190, W, H - 190);
        /* 水面波浪 */
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
        ctx.beginPath();
        for (var x = 0; x <= W; x += 14) ctx.lineTo(x, 190 + Math.sin(x / 40 + performance.now() / 420) * 3);
        ctx.stroke();

        /* 小船 */
        ctx.fillStyle = '#8a5a30';
        ctx.beginPath();
        ctx.moveTo(PIVOT.x - 70, 176); ctx.quadraticCurveTo(PIVOT.x, 196, PIVOT.x + 70, 176);
        ctx.lineTo(PIVOT.x + 56, 158); ctx.lineTo(PIVOT.x - 56, 158); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#b07644';
        env.roundRect(PIVOT.x - 50, 146, 100, 14, 6); ctx.fill();
        ctx.strokeStyle = '#5d3c1e'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(PIVOT.x, 146); ctx.lineTo(PIVOT.x, PIVOT.y); ctx.stroke();

        /* 鱼群 */
        var i;
        for (i = 0; i < fishes.length; i++) drawFish(fishes[i]);
        if (hooked) drawFish(hooked);

        /* 钓线与钩 */
        if (phase !== 'swing') {
          var tip = hookTip();
          ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(PIVOT.x, PIVOT.y); ctx.lineTo(tip.x, tip.y); ctx.stroke();
          ctx.strokeStyle = '#dfe8ee'; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.arc(tip.x, tip.y + 4, 6, -0.6, 2.4); ctx.stroke();
        } else {
          var a = swingAngle();
          var hx = PIVOT.x + Math.sin(a) * 24, hy = PIVOT.y + Math.cos(a) * 24;
          ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(PIVOT.x, PIVOT.y); ctx.lineTo(hx, hy); ctx.stroke();
          /* 预瞄虚线 */
          ctx.save();
          ctx.setLineDash([5, 9]);
          ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(PIVOT.x, PIVOT.y);
          ctx.lineTo(PIVOT.x + Math.sin(a) * 470, PIVOT.y + Math.cos(a) * 470);
          ctx.stroke();
          ctx.restore();
        }

        for (i = 0; i < floats.length; i++) {
          var f = floats[i];
          ctx.globalAlpha = Math.max(0, Math.min(1, f.t * 1.4));
          ctx.textAlign = 'center'; ctx.font = 'bold 17px system-ui';
          ctx.fillStyle = f.color; ctx.fillText(f.txt, f.x, f.y);
          ctx.globalAlpha = 1;
        }

        if (msgT > 0) {
          ctx.globalAlpha = Math.min(1, msgT);
          ctx.textAlign = 'center'; ctx.font = 'bold 21px system-ui';
          ctx.fillStyle = msgColor || '#fff';
          ctx.fillText(msg, W / 2, 236);
          ctx.globalAlpha = 1;
        }

        /* 时间条 */
        var bw = 340, ratio = Math.max(0, timeLeft / levelTime);
        ctx.fillStyle = 'rgba(255,255,255,.2)';
        env.roundRect(W / 2 - bw / 2, 60, bw, 10, 5); ctx.fill();
        ctx.fillStyle = ratio > 0.3 ? '#8fe06a' : '#ff5d6c';
        env.roundRect(W / 2 - bw / 2, 60, Math.max(3, bw * ratio), 10, 5); ctx.fill();

        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '13px system-ui';
        ctx.fillText('得分', 24, 34);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Consolas, monospace';
        ctx.fillText(String(score), 24, 66);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = '13px system-ui';
        ctx.fillText(Math.ceil(timeLeft) + 's · ' + (diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通'), W - 24, 34);
      }

      reset();

      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        release: cast,
        angle: function () { return phase === 'swing' ? swingAngle() : null; },
        state: function () { return { phase: phase, score: score, timeLeft: timeLeft, fishes: fishes.length }; },
        fishes: function () { return fishes.map(function (f) { return { x: f.x, y: f.y, id: f.kind.id }; }); },
        hurry: function () { timeLeft = Math.min(timeLeft, 0.5); }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 1, level: 1, extra: '点击下钩' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
