/* ==========================================================================
   平衡栈塔 Stack
   摆动积木精确堆叠 · 溢出切除 · 完美对齐连击奖励 · 视角跟随 · 三难度
   ========================================================================== */
(function () {
  'use strict';

  var CFG = { easy: { v: 150 }, normal: { v: 215 }, hard: { v: 295 } };
  var BASE_W = 150, BLOCK_H = 26;
  var TOP = 150;

  GameKit.register({
    id: 'stack',
    name: { zh: '平衡栈塔', en: 'Stack' },
    desc: { zh: '摆动的积木在塔顶来回移动，点击让它们精准落下！对不齐的部分会被切掉，塔越堆越窄；连续完美对齐有奖励还会加宽，看看你能堆多高！', en: 'Tap to drop swinging blocks precisely! Overhangs get sliced off. Chain perfect drops for bonus and width regen — how tall can you build?' },
    genre: { zh: '休闲益智', en: 'Casual' },
    icon: '🏗️', hue: '#b45309',
    logical: { w: 560, h: 700 },
    plays: 5000, hot: false, isNew: true, sound: 'calm',
    script: 'assets/js/games/stack.js',
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
      var swingV0 = CFG[diff].v;

      var CX = W / 2;
      var BASE_Y = H - 110; /* 基座顶面 y */

      var tower, sx, dir, phase, dropT, dropFrom, dropTo, floors;
      var score, combo, bestCombo, perfects, over, camera, ringT, fallBlock, gen;

      function hue(i) { return (200 + i * 26) % 360; }

      function topY() { return BASE_Y - (tower.length - 1) * BLOCK_H; }

      function reset() {
        tower = [{ x: CX, w: BASE_W }];
        sx = 80; dir = 1;
        phase = 'swing'; dropT = 0; dropFrom = 0; dropTo = 0;
        floors = 0; score = 0; combo = 0; bestCombo = 0; perfects = 0;
        over = false; camera = 0; ringT = 0; fallBlock = null; gen = (gen || 0) + 1;
        env.hud({ score: 0, lives: 1, level: 1, extra: '连击 0' });
      }

      function swingSpeed() { return swingV0 * (1 + Math.min(0.8, floors * 0.03)); }

      function drop() {
        if (over || phase !== 'swing') return;
        var top = tower[tower.length - 1];
        var dx = sx - top.x;
        var overlap = top.w - Math.abs(dx);
        var myGen = gen;
        if (overlap <= 0) {
          /* 完全落空 */
          phase = 'fall';
          fallBlock = { x: sx, y: topY() - BLOCK_H, w: top.w };
          sfx.play('warn');
          env.delay(function () {
            if (gen !== myGen || over) return;
            over = true;
            sfx.play('gameover');
            env.gameOver({ score: Math.round(score), detail: '堆到 ' + floors + ' 层 · 完美 ' + perfects + ' 次' });
          }, 650);
          return;
        }
        var nx, nw, bonus = 0;
        if (Math.abs(dx) <= 5) {
          /* 完美对齐 */
          nx = top.x; nw = top.w;
          combo++; perfects++;
          bestCombo = Math.max(bestCombo, combo);
          bonus = 25 + combo * 5;
          if (combo % 3 === 0) nw = Math.min(BASE_W, nw + 8);
          ringT = 0.5;
          sfx.play('coin');
        } else {
          nx = top.x + dx / 2;
          nw = overlap;
          combo = 0;
          sfx.play('land');
        }
        dropFrom = topY() - BLOCK_H;
        dropTo = topY();
        tower.push({ x: nx, w: nw });
        floors++;
        score += 10 + bonus;
        phase = 'drop'; dropT = 0;
        env.hud({ score: Math.round(score), lives: 1, level: floors + 1, extra: '连击 ' + combo });
      }

      function update(dt) {
        if (ringT > 0) ringT -= dt;
        if (over) return;
        if (phase === 'swing') {
          sx += dir * swingSpeed() * dt;
          var half = tower[tower.length - 1].w / 2 + 30;
          if (sx > W - half) { sx = W - half; dir = -1; sfx.play('select'); }
          if (sx < half) { sx = half; dir = 1; sfx.play('select'); }
        } else if (phase === 'drop') {
          dropT += dt * 6;
          if (dropT >= 1) {
            dropT = 1;
            phase = 'swing';
            sx = dir > 0 ? 60 : W - 60;
          }
        } else if (phase === 'fall' && fallBlock) {
          fallBlock.y += 900 * dt;
        }
        /* 视角跟随 */
        var targetCam = Math.max(0, 350 - topY());
        camera += (targetCam - camera) * Math.min(1, dt * 6);
      }

      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        var K = e.code;
        if (K === 'Space' || K === 'KeyJ' || K === 'Enter' || K === 'NumpadEnter') {
          e.preventDefault();
          drop();
        }
      });

      env.canvas.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        drop();
      });

      function drawBlock(x, y, w, i, alpha) {
        var h = hue(i);
        ctx.globalAlpha = alpha === undefined ? 1 : alpha;
        ctx.fillStyle = 'hsl(' + h + ',62%,52%)';
        ctx.fillRect(x - w / 2, y, w, BLOCK_H);
        ctx.fillStyle = 'hsl(' + h + ',62%,40%)';
        ctx.fillRect(x - w / 2, y + BLOCK_H - 6, w, 6);
        ctx.fillStyle = 'hsl(' + h + ',70%,68%)';
        ctx.fillRect(x - w / 2, y, w, 5);
        ctx.globalAlpha = 1;
      }

      function render() {
        var i;
        var sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#1e3a5f'); sky.addColorStop(0.6, '#3b6ea5'); sky.addColorStop(1, '#a8c6e0');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        /* 星/云点缀 */
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        for (i = 0; i < 8; i++) {
          var sx2 = (i * 97 + 40) % W;
          var sy2 = (i * 63 + 30) % 260 + 20;
          ctx.fillRect(sx2, sy2, 3, 3);
        }
        ctx.save();
        ctx.translate(0, camera);

        /* 基座 */
        ctx.fillStyle = '#57534e';
        ctx.fillRect(CX - 110, BASE_Y + BLOCK_H, 220, 60);
        ctx.fillStyle = '#44403c';
        ctx.fillRect(CX - 110, BASE_Y + BLOCK_H, 220, 8);

        /* 塔身 */
        for (i = 0; i < tower.length; i++) {
          var b = tower[i];
          drawBlock(b.x, BASE_Y - i * BLOCK_H, b.w, i);
        }
        /* 下落中的积木 */
        if (phase === 'drop' && dropT < 1) {
          var nb = tower[tower.length - 1];
          drawBlock(nb.x, dropFrom + (dropTo - dropFrom) * dropT, nb.w, tower.length - 1);
        }
        /* 完美光圈 */
        if (ringT > 0 && tower.length > 1) {
          var pb = tower[tower.length - 1];
          ctx.globalAlpha = ringT / 0.5;
          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 3;
          ctx.strokeRect(pb.x - pb.w / 2 - 6, BASE_Y - (tower.length - 1) * BLOCK_H - 6, pb.w + 12, BLOCK_H + 12);
          ctx.globalAlpha = 1;
        }
        /* 悬摆积木 */
        if (phase === 'swing' && !over) {
          var tw = tower[tower.length - 1].w;
          var sy2 = topY() - BLOCK_H;
          /* 吊绳 */
          ctx.strokeStyle = 'rgba(255,255,255,.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(sx, TOP - 10 - camera);
          ctx.lineTo(sx, sy2);
          ctx.stroke();
          drawBlock(sx, sy2, tw, tower.length);
        }
        /* 落空坠落的积木 */
        if (fallBlock) {
          drawBlock(fallBlock.x, fallBlock.y, fallBlock.w, tower.length, 0.9);
        }
        ctx.restore();

        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(240,240,240,.65)'; ctx.font = '13px system-ui';
        ctx.fillText('层数', 24, 34);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(String(floors), 24, 68);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(240,240,240,.65)'; ctx.font = '13px system-ui';
        ctx.fillText('连击', W - 24, 34);
        ctx.fillStyle = combo >= 3 ? '#fde047' : '#fff';
        ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText('x' + combo, W - 24, 68);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(240,240,240,.6)'; ctx.font = '13px system-ui';
        ctx.fillText((diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通') + ' · 点击/空格放积木 · 完美对齐 +25', W / 2, 122);
      }

      reset();

      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        drop: drop,
        setSwingX: function (x) { sx = x; },
        state: function () {
          return { over: over, score: Math.round(score), floors: floors, combo: combo, w: Math.round(tower[tower.length - 1].w), phase: phase, sx: Math.round(sx) };
        }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 1, level: 1, extra: '连击 0' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
