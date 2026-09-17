/* ==========================================================================
   跳一跳 Jump Master —— 按住蓄力、松手起跳，踩中平台中心拿连击加分
   键盘：Space/J/↑/Enter 按住蓄力松开起跳；触屏：按住屏幕蓄力
   ========================================================================== */
(function () {
  'use strict';

  var W = 560, H = 700;
  var GY = 470;              // 平台表面高度
  var ANCHOR = 185;          // 玩家在屏幕上的锚点
  var T_JUMP = 0.55;         // 起跳滞空时间
  var CHARGE_TIME = 0.85;    // 蓄满耗时
  var H_MAX = 135;           // 跳跃最高点
  var PERFECT = 10;          // 完美判定半径

  /* 难度：读运营后台/本地配置，缺省 normal */
  function readDifficulty() {
    try {
      var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
      return (gc && gc.difficulty) || 'normal';
    } catch (e) { return 'normal'; }
  }
  function diffLabel(d) { return d === 'easy' ? '简单' : (d === 'hard' ? '困难' : '普通'); }

  GameKit.register({
    id: 'jump',
    name: { zh: '跳一跳', en: 'Jump Master' },
    desc: { zh: '按住蓄力、松手起跳：踩中平台中心有连击加分，力道差一点就踏空出局。', en: 'Hold to charge, release to leap. Nail the center for combo bonuses — miss and you fall.' },
    genre: { zh: '休闲反应', en: 'Reflex' },
    icon: '🐸', hue: '#7bffa8',
    logical: { w: 560, h: 700 },
    hot: false, isNew: true, sound: 'calm',
    touchControls: ['a'],
    controls: {
      keyboard: [
        { k: 'Space / J / ↑ / Enter', zh: '按住蓄力，松开起跳', en: 'Hold to charge, release to jump' }
      ],
      touch: [{ k: '按住屏幕', zh: '蓄力，松手起跳', en: 'Hold & release to jump' }]
    },

    create: function (env) {
      var W2 = env.W, H2 = env.H, ctx = env.ctx, sfx = env.sfx;
      var plats, idx, player, camX, score, combo, state, over;
      var power, jt, x0, D, prev, bobT, unbindKey, floats;
      var hwBase = 32, hwSpan = 26, perfect = PERFECT, chargeTime = CHARGE_TIME;

      function nextPlat() {
        var last = plats[plats.length - 1];
        plats.push({
          x: last.x + 150 + Math.random() * 210,
          hw: hwBase + Math.random() * hwSpan
        });
      }

      function syncHud(extra) {
        env.hud({ score: score, lives: 1, level: 1, extra: extra || (combo > 1 ? '连击 ×' + combo : '蓄力越久跳越远') });
      }

      function applyDifficulty() {
        var d = readDifficulty();
        if (d === 'easy') { hwBase = 44; hwSpan = 26; perfect = 16; chargeTime = CHARGE_TIME * 1.15; }
        else if (d === 'hard') { hwBase = 26; hwSpan = 20; perfect = 7; chargeTime = CHARGE_TIME * 0.8; }
        else { hwBase = 32; hwSpan = 26; perfect = PERFECT; chargeTime = CHARGE_TIME; }
      }

      function reset() {
        applyDifficulty();
        plats = [{ x: 0, hw: 48 }];
        var i;
        for (i = 0; i < 4; i++) nextPlat();
        idx = 0;
        player = { x: 0, y: GY, sy: 1, face: 1 };
        camX = -ANCHOR;
        score = 0; combo = 0;
        state = 'ready'; over = false;
        power = 0; jt = 0; x0 = 0; D = 0;
        prev = {}; bobT = 0; floats = [];
        syncHud('待命 · 按住蓄力 · 难度' + diffLabel(readDifficulty()));
      }

      function beginCharge() {
        if (over || state === 'air' || state === 'fall' || state === 'charge') return;
        state = 'charge';
        power = 0;
        sfx.play('select');
      }

      function release() {
        if (over || state !== 'charge') return;
        D = 100 + power * 470;
        x0 = player.x;
        jt = 0;
        state = 'air';
        player.sy = 1.25;
        sfx.play('jumpBig');
      }

      function land() {
        var landX = x0 + D;
        var t = plats[idx + 1];
        var d = landX - t.x;
        player.x = landX;
        player.y = GY;
        player.sy = 0.8;

        if (Math.abs(d) <= t.hw) {
          idx++;
          var isPerfect = Math.abs(d) <= perfect;
          if (isPerfect) {
            combo++;
            var gain = 1 + combo;
            score += gain;
            floats.push({ x: landX - camX, y: GY - 96, txt: '完美 +' + gain, life: 1 });
            sfx.play('coin');
            if (combo > 0 && combo % 3 === 0) sfx.play('levelup');
          } else {
            combo = 0;
            score += 1;
            floats.push({ x: landX - camX, y: GY - 96, txt: '+1', life: 0.8 });
            sfx.play('land');
          }
          syncHud();
          while (plats.length < idx + 4) nextPlat();
          while (plats.length > 2 && plats[0].x < camX - 160) { plats.shift(); idx--; }
        } else {
          state = 'fall';
          sfx.play('hit');
          env.delay(function () {
            if (over) return;
            over = true;
            sfx.play('gameover');
            env.gameOver({ score: score, detail: '跳过 ' + idx + ' 个平台' });
          }, 650);
        }
      }

      function update(dt) {
        bobT += dt;
        player.sy += (1 - player.sy) * Math.min(1, dt * 10);

        if (env.pad.a && !prev.a) beginCharge();
        if (!env.pad.a && prev.a) release();
        prev.a = env.pad.a;

        if (state === 'charge') {
          power = Math.min(1, power + dt / chargeTime);
          player.sy = 1 - power * 0.28;
          syncHud('蓄力 ' + Math.round(power * 100) + '%');
        } else if (state === 'air') {
          jt += dt;
          var u = Math.min(1, jt / T_JUMP);
          player.x = x0 + D * u;
          player.y = GY - 4 * H_MAX * u * (1 - u);
          if (u >= 1) land();
        } else if (state === 'fall') {
          player.y += 860 * dt;
          player.sy = 0.7;
        }

        /* 相机跟随 */
        camX += (player.x - ANCHOR - camX) * Math.min(1, dt * 5);

        for (var i = floats.length - 1; i >= 0; i--) {
          floats[i].life -= dt * 0.9;
          floats[i].y -= 30 * dt;
          if (floats[i].life <= 0) floats.splice(i, 1);
        }
      }

      function drawBox(sx, hw, topColor, sideColor) {
        ctx.fillStyle = sideColor;
        ctx.fillRect(sx - hw, GY + 14, hw * 2, 90);
        ctx.fillStyle = topColor;
        env.roundRect(sx - hw, GY - 4, hw * 2, 20, 8); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        ctx.fillRect(sx - hw + 5, GY + 1, hw * 2 - 10, 3);
      }

      function render() {
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#0b1230'); bg.addColorStop(0.55, '#14335c'); bg.addColorStop(1, '#1b4a63');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        /* 太阳与云 */
        ctx.fillStyle = 'rgba(255,209,102,.16)';
        ctx.beginPath(); ctx.arc(W - 110, 120, 64, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        for (var s = 0; s < 20; s++) {
          ctx.globalAlpha = 0.1 + (s % 4) * 0.08;
          ctx.fillRect((s * 101 + 37) % W, (s * 47 + 13) % 260, 2, 2);
        }
        ctx.globalAlpha = 0.1;
        for (var cl = 0; cl < 3; cl++) {
          var cx = ((cl * 260 - camX * 0.12) % (W + 200) + W + 200) % (W + 200) - 100;
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.ellipse(cx, 90 + cl * 46, 52, 15, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        /* 远山 */
        ctx.fillStyle = 'rgba(20,40,80,.85)';
        for (var m = 0; m < 7; m++) {
          var mx = ((m * 220 - camX * 0.25) % 1540 + 1540) % 1540 - 100;
          ctx.beginPath();
          ctx.moveTo(mx, GY + 14); ctx.lineTo(mx + 110, 250 + (m % 3) * 34); ctx.lineTo(mx + 220, GY + 14);
          ctx.closePath(); ctx.fill();
        }

        /* 平台 */
        for (var i = 0; i < plats.length; i++) {
          var p = plats[i];
          var sx = p.x - camX;
          if (sx < -160 || sx > W + 160) continue;
          var isTarget = (i === idx + 1);
          var hue = (i % 3 === 0) ? '#2ee6a8' : ((i % 3 === 1) ? '#38e1ff' : '#c084fc');
          drawBox(sx, p.hw, hue, 'rgba(15,25,55,.92)');
          /* 完美区 */
          if (isTarget) {
            var pulse = 0.5 + Math.sin(bobT * 5) * 0.3;
            ctx.fillStyle = 'rgba(255,209,102,' + (0.45 + pulse * 0.4) + ')';
            ctx.fillRect(sx - perfect, GY - 4, perfect * 2, 20);
            ctx.fillStyle = 'rgba(255,209,102,.9)';
            ctx.fillRect(sx - 1.5, GY - 26, 3, 22);
          }
        }

        /* 蓄力箭头 */
        var px = player.x - camX;
        if (state === 'charge') {
          var len = 44 + power * 150;
          var col = power < 0.4 ? '#7bffa8' : (power < 0.75 ? '#ffc93c' : '#ff5d73');
          ctx.strokeStyle = col; ctx.lineWidth = 7; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(px + 22, GY - 30); ctx.lineTo(px + 22 + len, GY - 30); ctx.stroke();
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(px + 22 + len + 14, GY - 30);
          ctx.lineTo(px + 22 + len, GY - 40);
          ctx.lineTo(px + 22 + len, GY - 20);
          ctx.closePath(); ctx.fill();
        }

        /* 角色 */
        ctx.save();
        ctx.translate(px, player.y);
        var sy = player.sy, sx2 = 2 - sy;
        /* 影子 */
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        ctx.beginPath(); ctx.ellipse(0, 6, 16 * sx2, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.scale(sx2, sy);
        ctx.fillStyle = '#ffd166';
        env.roundRect(-11, -34, 22, 30, 9); ctx.fill();
        ctx.fillStyle = '#ff9f43';
        ctx.beginPath(); ctx.arc(0, -42, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#26221c';
        ctx.beginPath(); ctx.arc(4, -44, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-3, -44, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        /* 飘字 */
        floats.forEach(function (f) {
          ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
          env.text(f.txt, f.x, f.y, { font: 'bold 22px system-ui', color: '#fff', align: 'center', shadow: true });
        });
        ctx.globalAlpha = 1;

        /* 大分数 */
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = 'bold 48px Consolas, monospace';
        ctx.fillStyle = 'rgba(255,255,255,.92)';
        ctx.shadowColor = 'rgba(123,255,168,.5)'; ctx.shadowBlur = 14;
        ctx.fillText(String(score), W / 2, 78);
        ctx.shadowBlur = 0;

        if (state === 'ready') {
          var hint = 1 + Math.sin(bobT * 3) * 0.05;
          ctx.save();
          ctx.translate(W / 2, H * 0.62); ctx.scale(hint, hint);
          env.text('按住 蓄力 · 松开 起跳', 0, 0, { font: 'bold 21px system-ui', color: 'rgba(255,255,255,.9)', align: 'center' });
          env.text('HOLD & RELEASE to jump', 0, 28, { font: '13px system-ui', color: 'rgba(255,255,255,.5)', align: 'center' });
          ctx.restore();
          ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(px, GY - 36, 34 + Math.sin(bobT * 4) * 4, 0, Math.PI * 2); ctx.stroke();
        }
      }

      reset();

      /* Enter 直触发（Space/J/↑ 走 pad 边沿，状态机天然去重） */
      unbindKey = env.onKey(function (e, type) {
        if (over) return;
        if (e.code === 'Enter' || e.code === 'NumpadEnter') {
          if (type === 'down') beginCharge();
          else if (type === 'up') release();
        }
      });

      env.canvas.addEventListener('pointerdown', function () { beginCharge(); });
      env.canvas.addEventListener('pointerup', function () { release(); });
      env.canvas.addEventListener('pointercancel', function () { release(); });
      env.canvas.addEventListener('pointerleave', function () { release(); });

      env.loop(function (dt) {
        update(dt);
        render();
      });

      return {
        start: function () {
          sfx.play('start');
          syncHud('准备就绪 · 按住蓄力 · 难度' + diffLabel(readDifficulty()));
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); }
      };
    }
  });
})();
