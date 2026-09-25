/* ==========================================================================
   拼图 Picture Puzzle
   风景画切成 N×N 方块并随机对换打乱；点击/键盘选块两两交换复原。
   步数越少、用时越短分越高。三难度：3×3 / 4×4 / 5×5。
   ========================================================================== */
(function () {
  'use strict';

  var N_OF = { easy: 3, normal: 4, hard: 5 };

  GameKit.register({
    id: 'puzzle',
    name: { zh: '拼图', en: 'Picture Puzzle' },
    desc: { zh: '风景画被打散成方块！点击或用方向键+空格选中两块交换位置，把图画复原。步数越少、用时越短，分数越高！', en: 'The painting is scrambled into tiles! Select two tiles to swap and restore the picture. Fewer moves and less time mean higher scores!' },
    genre: { zh: '益智休闲', en: 'Puzzle' },
    icon: '🧩', hue: '#0d9488',
    tags: [{ zh: '益智', en: 'Puzzle' }, { zh: '拼图', en: 'Tiles' }],
    plays: 5000, hot: false, isNew: true, sound: 'menu',
    script: 'assets/js/games/puzzle.js',
    ratio: 'portrait', duration: '2-5 分钟',
    touchControls: ['left', 'right', 'up', 'down', 'a', 'b'],
    logical: { w: 560, h: 700 },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty && N_OF[gc.difficulty]) diff = gc.difficulty;
      } catch (e) { }
      var N = N_OF[diff] || 4;

      var BS = 500;                 /* 棋盘边长（逻辑像素） */
      var BX = (W - BS) / 2, BY = 96;
      var TW = BS / N;

      var tiles, sel, pick, moves, elapsed, over, solvedF, scramLog, flashT, gen;

      /* ---------- 离屏风景画 ---------- */
      var pic = document.createElement('canvas');
      pic.width = BS; pic.height = BS;
      (function paint() {
        var p = pic.getContext('2d');
        var sky = p.createLinearGradient(0, 0, 0, BS);
        sky.addColorStop(0, '#7dd3fc'); sky.addColorStop(0.65, '#bae6fd'); sky.addColorStop(1, '#fef3c7');
        p.fillStyle = sky; p.fillRect(0, 0, BS, BS);
        /* 太阳与光芒 */
        p.fillStyle = '#fbbf24';
        p.beginPath(); p.arc(120, 100, 44, 0, Math.PI * 2); p.fill();
        p.strokeStyle = 'rgba(251,191,36,.55)'; p.lineWidth = 6;
        for (var i = 0; i < 8; i++) {
          var a = i * Math.PI / 4;
          p.beginPath();
          p.moveTo(120 + Math.cos(a) * 56, 100 + Math.sin(a) * 56);
          p.lineTo(120 + Math.cos(a) * 74, 100 + Math.sin(a) * 74);
          p.stroke();
        }
        /* 远山 */
        p.fillStyle = '#94a3b8';
        p.beginPath(); p.moveTo(0, 330); p.lineTo(140, 190); p.lineTo(300, 330); p.closePath(); p.fill();
        p.fillStyle = '#64748b';
        p.beginPath(); p.moveTo(180, 330); p.lineTo(360, 160); p.lineTo(BS, 330); p.closePath(); p.fill();
        /* 湖面 */
        p.fillStyle = '#38bdf8'; p.fillRect(0, 330, BS, 110);
        p.strokeStyle = 'rgba(255,255,255,.5)'; p.lineWidth = 3;
        for (i = 0; i < 6; i++) {
          var y = 350 + i * 16;
          p.beginPath(); p.moveTo(30 + i * 60, y); p.lineTo(120 + i * 60, y); p.stroke();
        }
        /* 草地 */
        p.fillStyle = '#4ade80'; p.fillRect(0, 440, BS, BS - 440);
        /* 树 */
        p.fillStyle = '#92400e'; p.fillRect(96, 400, 18, 62);
        p.fillStyle = '#16a34a';
        p.beginPath(); p.arc(105, 380, 42, 0, Math.PI * 2); p.fill();
        p.beginPath(); p.arc(70, 402, 28, 0, Math.PI * 2); p.fill();
        p.beginPath(); p.arc(140, 402, 28, 0, Math.PI * 2); p.fill();
        /* 房子 */
        p.fillStyle = '#fda4af'; p.fillRect(330, 396, 130, 92);
        p.fillStyle = '#b91c1c';
        p.beginPath(); p.moveTo(316, 396); p.lineTo(395, 344); p.lineTo(474, 396); p.closePath(); p.fill();
        p.fillStyle = '#7c2d12'; p.fillRect(378, 430, 34, 58);
        p.fillStyle = '#fde68a'; p.fillRect(340, 416, 24, 24); p.fillRect(428, 416, 24, 24);
        /* 花 */
        for (i = 0; i < 7; i++) {
          var fx = 30 + i * 68, fy = 470 + (i % 2) * 14;
          p.strokeStyle = '#15803d'; p.lineWidth = 3;
          p.beginPath(); p.moveTo(fx, fy + 14); p.lineTo(fx, fy); p.stroke();
          p.fillStyle = i % 2 ? '#f472b6' : '#facc15';
          p.beginPath(); p.arc(fx, fy, 8, 0, Math.PI * 2); p.fill();
        }
      })();

      function tileXY(i) {
        return { x: BX + (i % N) * TW, y: BY + Math.floor(i / N) * TW };
      }

      function reset() {
        var i;
        tiles = [];
        for (i = 0; i < N * N; i++) tiles.push(i);
        sel = N % 2 ? (N * N - 1) / 2 : 0; /* 初始高亮：中心或左上 */
        pick = -1; moves = 0; elapsed = 0; over = false; solvedF = false; flashT = 0; gen = (gen || 0) + 1;
        /* 记录式打乱：随机对换，保证结果非复原 */
        scramLog = [];
        var tries = 0;
        do {
          scramLog.length = 0;
          tiles = [];
          for (i = 0; i < N * N; i++) tiles.push(i);
          for (i = 0; i < N * N * 3; i++) {
            var a = Math.floor(Math.random() * N * N), b = Math.floor(Math.random() * N * N);
            if (a !== b) { var t = tiles[a]; tiles[a] = tiles[b]; tiles[b] = t; scramLog.push([a, b]); }
          }
          tries++;
        } while (isSolved() && tries < 40);
        syncHud();
      }

      function isSolved() {
        for (var i = 0; i < tiles.length; i++) if (tiles[i] !== i) return false;
        return true;
      }

      function syncHud() {
        env.hud({ score: moves, lives: 1, level: N, extra: (diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通') + ' ' + N + '×' + N + ' · 步数 ' + moves });
      }

      function doSwap(a, b) {
        if (over || a === b || a < 0 || b < 0 || a >= tiles.length || b >= tiles.length) return false;
        var t = tiles[a]; tiles[a] = tiles[b]; tiles[b] = t;
        moves++; flashT = 0.18;
        syncHud();
        if (isSolved()) {
          solvedF = true;
          over = true;
          sfx.play('coin');
          var score = Math.max(100, Math.round(2200 - moves * 20 - elapsed * 8));
          env.gameOver({ score: score, detail: N + '×' + N + ' · ' + moves + ' 步 · ' + Math.round(elapsed) + ' 秒' });
        } else {
          sfx.play('select');
        }
        return true;
      }

      /* 选中/交换的两步式激活（触屏与键盘共用） */
      function activate(i) {
        if (over) return;
        if (i < 0 || i >= tiles.length) return;
        sel = i;
        if (pick === -1) { pick = i; sfx.play('select'); }
        else if (pick === i) { pick = -1; sfx.play('select'); }
        else { doSwap(pick, i); pick = -1; }
      }

      function moveSel(dx, dy) {
        if (over) return;
        if (sel < 0) { sel = 0; return; }
        var r = Math.floor(sel / N), c = sel % N;
        c = Math.max(0, Math.min(N - 1, c + dx));
        r = Math.max(0, Math.min(N - 1, r + dy));
        var ns = r * N + c;
        if (ns !== sel) { sel = ns; sfx.play('select'); }
      }

      /* ---------- 输入：onKey 直触发 + pad 边沿双通路 ---------- */
      var prevPad = {};
      var lastAct = 0;
      function actNow() {
        var now = performance.now();
        if (now - lastAct < 120) return;
        lastAct = now;
        if (sel < 0) sel = 0;
        activate(sel);
      }
      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down') return;
        var K = e.code;
        if (K === 'Space' || K === 'Enter') { e.preventDefault(); actNow(); }
      });

      function hitTile(lx, ly) {
        if (lx < BX || ly < BY || lx >= BX + BS || ly >= BY + BS) return -1;
        var c = Math.floor((lx - BX) / TW), r = Math.floor((ly - BY) / TW);
        return r * N + c;
      }

      function onPointer(e) {
        var rect = env.canvas.getBoundingClientRect();
        var lx = (e.clientX - rect.left) * W / rect.width;
        var ly = (e.clientY - rect.top) * H / rect.height;
        var t = hitTile(lx, ly);
        if (t >= 0 && !over) { lastAct = performance.now(); activate(t); }
      }
      env.canvas.addEventListener('pointerdown', onPointer);

      function update(dt) {
        var i;
        if (flashT > 0) flashT -= dt;
        if (!over) elapsed += dt;
        /* pad 边沿 */
        if (env.pad.left && !prevPad.left) moveSel(-1, 0);
        if (env.pad.right && !prevPad.right) moveSel(1, 0);
        if (env.pad.up && !prevPad.up) moveSel(0, -1);
        if (env.pad.down && !prevPad.down) moveSel(0, 1);
        if ((env.pad.a || env.pad.b) && !prevPad.a && !prevPad.b) actNow();
        prevPad = { left: env.pad.left, right: env.pad.right, up: env.pad.up, down: env.pad.down, a: env.pad.a, b: env.pad.b };
      }

      function render() {
        var i;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, W, H);
        /* 标题 */
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#5eead4'; ctx.font = 'bold 26px system-ui';
        ctx.fillText(N + '×' + N + ' 拼图复原', W / 2, 42);
        ctx.font = '14px system-ui'; ctx.fillStyle = 'rgba(226,232,240,.75)';
        ctx.fillText('选两块交换 · 步数越少分越高', W / 2, 70);
        /* 底板 */
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(BX - 6, BY - 6, BS + 12, BS + 12);
        /* 拼图块 */
        for (i = 0; i < tiles.length; i++) {
          var id = tiles[i];
          var pos = tileXY(i);
          var sx = (id % N) * BS / N, sy = Math.floor(id / N) * BS / N;
          ctx.drawImage(pic, sx, sy, BS / N, BS / N, pos.x, pos.y, TW, TW);
          ctx.strokeStyle = 'rgba(15,23,42,.5)'; ctx.lineWidth = 1.5;
          ctx.strokeRect(pos.x + 0.5, pos.y + 0.5, TW - 1, TW - 1);
          /* 正确位置的小角标 */
          if (id === i) {
            ctx.fillStyle = 'rgba(74,222,128,.85)';
            ctx.beginPath(); ctx.arc(pos.x + TW - 9, pos.y + 9, 5, 0, Math.PI * 2); ctx.fill();
          }
        }
        /* 选中 / 待交换高亮 */
        var t2 = flashT > 0 ? 3 : 0;
        if (sel >= 0) {
          var p1 = tileXY(sel);
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 + t2;
          ctx.strokeRect(p1.x + 1.5, p1.y + 1.5, TW - 3, TW - 3);
        }
        if (pick >= 0) {
          var p2 = tileXY(pick);
          var pul = 2 + Math.sin(elapsed * 8) * 1.5;
          ctx.strokeStyle = '#fde047'; ctx.lineWidth = 4 + pul;
          ctx.strokeRect(p2.x + 2, p2.y + 2, TW - 4, TW - 4);
        }
        /* 状态行 */
        ctx.font = '15px system-ui'; ctx.fillStyle = '#cbd5e1';
        ctx.fillText(pick >= 0 ? '已选一块，再选一块交换（再点自己取消）' : '点击或方向键选择一块', W / 2, BY + BS + 38);
        ctx.font = '13px system-ui'; ctx.fillStyle = '#64748b';
        ctx.fillText('用时 ' + Math.round(elapsed) + 's · 方向键移动 · 空格确认', W / 2, BY + BS + 64);
        /* 完成 */
        if (solvedF) {
          ctx.fillStyle = 'rgba(15,23,42,.55)';
          ctx.fillRect(BX, BY, BS, BS);
          ctx.fillStyle = '#4ade80'; ctx.font = 'bold 44px system-ui';
          ctx.fillText('复原完成!', W / 2, BY + BS / 2 - 20);
          ctx.fillStyle = '#e2e8f0'; ctx.font = '18px system-ui';
          ctx.fillText(moves + ' 步 · ' + Math.round(elapsed) + ' 秒', W / 2, BY + BS / 2 + 26);
        }
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        state: function () { return { n: N, moves: moves, sel: sel, pick: pick, solved: solvedF, over: over, order: tiles.slice() }; },
        scramble: function () { return scramLog.slice(); },
        swapIdx: function (a, b) { return doSwap(a, b); },
        activate: activate,
        tileCenter: function (i) { var p = tileXY(i); return { x: p.x + TW / 2, y: p.y + TW / 2 }; }
      };

      return {
        start: function () { sfx.play('start'); syncHud(); },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
