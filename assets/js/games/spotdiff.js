/* ==========================================================================
   找不同 Spot the Difference
   上下两幅程序生成的风景画，其中一幅被动了 N 处手脚（只做加画，保证两图对齐）。
   点击/键盘光标找出全部不同；点错扣时。限时制，找齐得分。
   ========================================================================== */
(function () {
  'use strict';

  var LIMIT = {
    easy: { k: 4, t: 90 },
    normal: { k: 5, t: 75 },
    hard: { k: 7, t: 60 }
  };

  GameKit.register({
    id: 'spotdiff',
    name: { zh: '找不同', en: 'Spot the Difference' },
    desc: { zh: '上下两幅画有 ' + '几处不一样！眼疾手快点出所有不同之处，点错会扣时间。限时找到全部不同才能拿高分！', en: 'The two pictures differ in several spots! Tap all differences before time runs out — wrong taps cost time.' },
    genre: { zh: '益智休闲', en: 'Puzzle' },
    icon: '🔍', hue: '#be185d',
    tags: [{ zh: '益智', en: 'Puzzle' }, { zh: '观察', en: 'Observe' }],
    plays: 5000, hot: false, isNew: true, sound: 'menu',
    script: 'assets/js/games/spotdiff.js',
    ratio: 'portrait', duration: '1-3 分钟',
    touchControls: ['left', 'right', 'up', 'down', 'a', 'b'],
    logical: { w: 560, h: 700 },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty && LIMIT[gc.difficulty]) diff = gc.difficulty;
      } catch (e) { }
      var K = LIMIT[diff].k, TL = LIMIT[diff].t;

      var SW = 500, SH = 290;
      var SX = (W - SW) / 2;            /* 30 */
      var TOPY = 26, BOTY = 384;        /* 上图 y / 下图 y */

      var over, win, found, wrong, timeLeft, shakeT, gen;
      var diffs = [];                    /* {x,y,r} 场景坐标 */
      var cursor = { img: 0, x: SW / 2, y: SH / 2 }; /* 键盘光标 */

      /* ---------- 基础场景绘制（两图共用） ---------- */
      function drawBase(p) {
        var i;
        var sky = p.createLinearGradient(0, 0, 0, SH);
        sky.addColorStop(0, '#93c5fd'); sky.addColorStop(1, '#fef9c3');
        p.fillStyle = sky; p.fillRect(0, 0, SW, SH);
        /* 太阳 */
        p.fillStyle = '#fbbf24';
        p.beginPath(); p.arc(450, 48, 26, 0, Math.PI * 2); p.fill();
        /* 云 */
        function cloud(x, y, s) {
          p.fillStyle = '#fff';
          p.beginPath();
          p.arc(x, y, 16 * s, 0, Math.PI * 2);
          p.arc(x + 18 * s, y - 8 * s, 13 * s, 0, Math.PI * 2);
          p.arc(x + 34 * s, y, 15 * s, 0, Math.PI * 2);
          p.fill();
        }
        cloud(180, 44, 1); cloud(330, 96, 0.8);
        /* 山 */
        p.fillStyle = '#86a39a';
        p.beginPath(); p.moveTo(0, 215); p.lineTo(120, 130); p.lineTo(250, 215); p.closePath(); p.fill();
        p.fillStyle = '#6b8a80';
        p.beginPath(); p.moveTo(160, 215); p.lineTo(300, 115); p.lineTo(430, 215); p.closePath(); p.fill();
        /* 草地 */
        p.fillStyle = '#65bb61'; p.fillRect(0, 215, SW, SH - 215);
        /* 树 */
        p.fillStyle = '#8b5a2b'; p.fillRect(140, 168, 16, 52);
        p.fillStyle = '#2f9e44';
        p.beginPath(); p.arc(148, 150, 36, 0, Math.PI * 2); p.fill();
        /* 房子 */
        p.fillStyle = '#fcd34d'; p.fillRect(356, 140, 108, 76);
        p.fillStyle = '#dc2626';
        p.beginPath(); p.moveTo(344, 140); p.lineTo(410, 100); p.lineTo(476, 140); p.closePath(); p.fill();
        p.fillStyle = '#7c2d12'; p.fillRect(400, 168, 26, 48);
        p.fillStyle = '#1f2937'; p.fillRect(368, 152, 22, 22);   /* 窗（暗） */
        /* 栅栏 */
        p.fillStyle = '#e7e5e4';
        for (i = 0; i < 7; i++) p.fillRect(28 + i * 28, 238, 8, 26);
        p.fillRect(28, 246, 196, 5);
        /* 花 */
        for (i = 0; i < 6; i++) {
          var fx = 250 + i * 40;
          p.strokeStyle = '#15803d'; p.lineWidth = 2.5;
          p.beginPath(); p.moveTo(fx, 268); p.lineTo(fx, 254); p.stroke();
          p.fillStyle = i % 2 ? '#f472b6' : '#facc15';
          p.beginPath(); p.arc(fx, 251, 6, 0, Math.PI * 2); p.fill();
        }
      }

      /* ---------- 差异候选（全部为“只在 B 图加画”，天然对齐） ---------- */
      var CANDS = [
        { x: 120, y: 62, r: 30, draw: function (p) { /* 小鸟 */
            p.fillStyle = '#334155';
            p.beginPath(); p.ellipse(120, 62, 12, 7, 0, 0, Math.PI * 2); p.fill();
            p.beginPath(); p.moveTo(120, 62); p.lineTo(108, 52); p.lineTo(116, 62); p.closePath(); p.fill();
            p.beginPath(); p.moveTo(120, 62); p.lineTo(132, 52); p.lineTo(124, 62); p.closePath(); p.fill();
            p.fillStyle = '#f97316'; p.beginPath(); p.moveTo(131, 62); p.lineTo(138, 64); p.lineTo(131, 66); p.closePath(); p.fill();
          } },
        { x: 396, y: 58, r: 26, draw: function (p) { /* 气球 */
            p.fillStyle = '#ef4444';
            p.beginPath(); p.ellipse(396, 56, 13, 16, 0, 0, Math.PI * 2); p.fill();
            p.strokeStyle = '#7f1d1d'; p.lineWidth = 1.5;
            p.beginPath(); p.moveTo(396, 72); p.quadraticCurveTo(392, 84, 398, 94); p.stroke();
          } },
        { x: 379, y: 163, r: 24, draw: function (p) { /* 窗亮灯 */
            p.fillStyle = '#fde047'; p.fillRect(368, 152, 22, 22);
            p.strokeStyle = '#b45309'; p.lineWidth = 2; p.strokeRect(368, 152, 22, 22);
          } },
        { x: 148, y: 148, r: 24, draw: function (p) { /* 树上苹果 */
            p.fillStyle = '#dc2626';
            p.beginPath(); p.arc(148, 148, 8, 0, Math.PI * 2); p.fill();
          } },
        { x: 66, y: 254, r: 22, draw: function (p) { /* 多一朵花 */
            p.strokeStyle = '#15803d'; p.lineWidth = 2.5;
            p.beginPath(); p.moveTo(66, 268); p.lineTo(66, 254); p.stroke();
            p.fillStyle = '#a78bfa';
            p.beginPath(); p.arc(66, 251, 6, 0, Math.PI * 2); p.fill();
          } },
        { x: 280, y: 46, r: 32, draw: function (p) { /* 多一朵云 */
            p.fillStyle = '#fff';
            p.beginPath();
            p.arc(268, 48, 14, 0, Math.PI * 2);
            p.arc(284, 40, 12, 0, Math.PI * 2);
            p.arc(298, 48, 13, 0, Math.PI * 2);
            p.fill();
          } },
        { x: 250, y: 254, r: 20, draw: function (p) { /* 多一根栅栏 */
            p.fillStyle = '#e7e5e4'; p.fillRect(246, 238, 8, 26);
          } },
        { x: 352, y: 82, r: 22, draw: function (p) { /* 炊烟 */
            p.fillStyle = 'rgba(148,163,184,.9)';
            p.beginPath(); p.arc(352, 84, 7, 0, Math.PI * 2); p.fill();
            p.beginPath(); p.arc(357, 72, 5, 0, Math.PI * 2); p.fill();
          } }
      ];

      var imgs = [];

      function build() {
        var i;
        /* 随机挑 K 处差异 */
        var pool = CANDS.slice();
        for (i = pool.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
        }
        diffs = pool.slice(0, K);

        imgs = [];
        for (i = 0; i < 2; i++) {
          var c = document.createElement('canvas');
          c.width = SW; c.height = SH;
          var p = c.getContext('2d');
          drawBase(p);
          if (i === 1) { for (var d = 0; d < diffs.length; d++) diffs[d].draw(p); }
          imgs.push(c);
        }
      }

      function reset() {
        over = false; win = false; found = []; wrong = 0;
        timeLeft = TL; shakeT = 0;
        cursor = { img: 0, x: SW / 2, y: SH / 2 };
        build();
        syncHud();
      }

      function syncHud() {
        env.hud({ score: found.length, lives: K - found.length, level: 1, extra: (diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通') + ' · 剩 ' + Math.ceil(timeLeft) + 's' });
      }

      /* 场景坐标 → 是否命中未找到差异 */
      function hitTest(sx, sy) {
        for (var i = 0; i < diffs.length; i++) {
          var d = diffs[i];
          if (found.indexOf(i) >= 0) continue;
          var dx = sx - d.x, dy = sy - d.y;
          if (dx * dx + dy * dy < (d.r + 8) * (d.r + 8)) return i;
        }
        return -1;
      }

      function tap(imgIdx, sx, sy) {
        if (over) return;
        var h = hitTest(sx, sy);
        if (h >= 0) {
          found.push(h);
          sfx.play('pick');
          syncHud();
          if (found.length === K) {
            win = true; over = true;
            sfx.play('coin');
            var score = Math.max(50, K * 100 + Math.round(timeLeft) * 5 - wrong * 30);
            env.gameOver({ score: score, detail: K + ' 处全找到 · 剩 ' + Math.ceil(timeLeft) + 's · 误点 ' + wrong });
          }
        } else {
          wrong++;
          timeLeft = Math.max(0, timeLeft - 3);
          shakeT = 0.3;
          sfx.play('explosion');
          syncHud();
          if (timeLeft <= 0) finishLose();
        }
      }

      function finishLose() {
        if (over) return;
        over = true; win = false;
        sfx.play('explosion');
        env.gameOver({ score: found.length * 50, detail: '找到 ' + found.length + '/' + K + ' 处' });
      }

      /* ---------- 输入 ---------- */
      function toScene(lx, ly) {
        if (ly >= TOPY && ly < TOPY + SH) return { img: 0, x: lx - SX, y: ly - TOPY };
        if (ly >= BOTY && ly < BOTY + SH) return { img: 1, x: lx - SX, y: ly - BOTY };
        return null;
      }
      env.canvas.addEventListener('pointerdown', function (e) {
        var rect = env.canvas.getBoundingClientRect();
        var lx = (e.clientX - rect.left) * W / rect.width;
        var ly = (e.clientY - rect.top) * H / rect.height;
        var s = toScene(lx, ly);
        if (s && !over) { lastAct = performance.now(); cursor = { img: s.img, x: s.x, y: s.y }; tap(s.img, s.x, s.y); }
      });

      var prevPad = {};
      var lastAct = 0;
      function actNow() {
        var now = performance.now();
        if (now - lastAct < 120) return;
        lastAct = now;
        if (!over) tap(cursor.img, cursor.x, cursor.y);
      }
      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down') return;
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); actNow(); }
      });

      function update(dt) {
        var i;
        if (shakeT > 0) shakeT -= dt;
        if (!over) {
          timeLeft -= dt;
          if (Math.floor(timeLeft) % 5 === 0) syncHud(); /* 轻量同步倒计时 */
          if (timeLeft <= 0) { timeLeft = 0; finishLose(); }
        }
        /* pad 边沿：光标移动 + 确认 */
        var STEP = 25;
        if (env.pad.left && !prevPad.left) cursor.x = Math.max(8, cursor.x - STEP);
        if (env.pad.right && !prevPad.right) cursor.x = Math.min(SW - 8, cursor.x + STEP);
        if (env.pad.up && !prevPad.up) {
          if (cursor.y - STEP < 6) { cursor.img = cursor.img === 0 ? 1 : 0; cursor.y = SH - 10; }
          else cursor.y -= STEP;
        }
        if (env.pad.down && !prevPad.down) {
          if (cursor.y + STEP > SH - 6) { cursor.img = cursor.img === 0 ? 1 : 0; cursor.y = 10; }
          else cursor.y += STEP;
        }
        if ((env.pad.a || env.pad.b) && !prevPad.a && !prevPad.b) actNow();
        prevPad = { left: env.pad.left, right: env.pad.right, up: env.pad.up, down: env.pad.down, a: env.pad.a, b: env.pad.b };
      }

      function render() {
        var i, d;
        ctx.save();
        if (shakeT > 0) ctx.translate(Math.sin(shakeT * 60) * 4, 0);
        ctx.fillStyle = '#111827';
        ctx.fillRect(-8, 0, W + 16, H);
        /* 两幅画 */
        ctx.drawImage(imgs[0], SX, TOPY);
        ctx.drawImage(imgs[1], SX, BOTY);
        ctx.strokeStyle = '#374151'; ctx.lineWidth = 2;
        ctx.strokeRect(SX - 1, TOPY - 1, SW + 2, SH + 2);
        ctx.strokeRect(SX - 1, BOTY - 1, SW + 2, SH + 2);
        /* 找到的差异：两图同位置画圈 */
        for (i = 0; i < found.length; i++) {
          d = diffs[found[i]];
          ctx.strokeStyle = '#f0abfc'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(SX + d.x, TOPY + d.y, d.r + 4, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(SX + d.x, BOTY + d.y, d.r + 4, 0, Math.PI * 2); ctx.stroke();
        }
        /* 中间状态条 */
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(SX, TOPY + SH + 12, SW, 40);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f9a8d4'; ctx.font = 'bold 18px system-ui';
        ctx.fillText('找到 ' + found.length + ' / ' + K + ' 处', SX + 110, TOPY + SH + 32);
        ctx.fillStyle = timeLeft < 10 ? '#f87171' : '#e2e8f0';
        ctx.font = 'bold 20px Consolas, monospace';
        ctx.fillText(Math.ceil(timeLeft) + 's', SX + 250, TOPY + SH + 32);
        ctx.fillStyle = '#9ca3af'; ctx.font = '13px system-ui';
        ctx.fillText('误点 ' + wrong, SX + 390, TOPY + SH + 32);
        /* 键盘光标（十字） */
        var cy = cursor.img === 0 ? TOPY + cursor.y : BOTY + cursor.y;
        ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(SX + cursor.x - 12, cy); ctx.lineTo(SX + cursor.x + 12, cy);
        ctx.moveTo(SX + cursor.x, cy - 12); ctx.lineTo(SX + cursor.x, cy + 12);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(SX + cursor.x, cy, 8, 0, Math.PI * 2); ctx.stroke();
        /* 提示 */
        ctx.font = '13px system-ui'; ctx.fillStyle = '#6b7280';
        ctx.fillText('点击两幅画中的不同处 · 方向键移动光标 · 空格确认', W / 2, BOTY + SH + 26);
        /* 结束覆盖 */
        if (over) {
          ctx.fillStyle = 'rgba(17,24,39,.6)';
          ctx.fillRect(SX, TOPY, SW, BOTY + SH - TOPY);
          ctx.fillStyle = win ? '#4ade80' : '#f87171';
          ctx.font = 'bold 40px system-ui';
          ctx.fillText(win ? '火眼金睛!' : '时间到', W / 2, (TOPY + BOTY + SH) / 2 - 16);
          ctx.fillStyle = '#e2e8f0'; ctx.font = '17px system-ui';
          ctx.fillText(win ? '全部 ' + K + ' 处都找到了' : '找到 ' + found.length + ' / ' + K + ' 处', W / 2, (TOPY + BOTY + SH) / 2 + 22);
        }
        ctx.restore();
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        state: function () { return { k: K, found: found.length, wrong: wrong, timeLeft: Math.round(timeLeft * 10) / 10, over: over, win: win }; },
        hints: function () {
          var out = [];
          for (var i = 0; i < diffs.length; i++) {
            if (found.indexOf(i) < 0) out.push({ img: 0, x: diffs[i].x, y: diffs[i].y });
          }
          return out;
        },
        cursorState: function () { return { img: cursor.img, x: Math.round(cursor.x), y: Math.round(cursor.y) }; },
        tap: function (imgIdx, x, y) { tap(imgIdx, x, y); }
      };

      return {
        start: function () { sfx.play('start'); syncHud(); },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
