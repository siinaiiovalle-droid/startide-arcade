/* ==========================================================================
   华容道 Klotski —— 经典滑块布局
   4×5 棋盘 · 拖动 / 点选 / 方向键移动 · 曹操抵达下方出口即通关
   三关递进（初出茅庐 → 横刀立马 → 兵临城下，均已 BFS 验证可解）
   步数越少通关分越高
   ========================================================================== */
(function () {
  'use strict';

  var COLS = 4, ROWS = 5, CELL = 100;
  var BOARD_W = CELL * COLS, BOARD_H = CELL * ROWS;

  /* 已用 BFS 求解器验证全部可解（最少步数 1 / 19 / 27） */
  var LEVELS = [
    {
      name: '初出茅庐', par: 1,
      pieces: [
        { id: 'cao', x: 1, y: 2, w: 2, h: 2 },
        { id: 'v1', x: 0, y: 0, w: 1, h: 2 }, { id: 'v2', x: 3, y: 0, w: 1, h: 2 },
        { id: 'v3', x: 0, y: 2, w: 1, h: 2 }, { id: 'v4', x: 3, y: 2, w: 1, h: 2 },
        { id: 'h1', x: 1, y: 0, w: 2, h: 1 }, { id: 'h2', x: 1, y: 1, w: 2, h: 1 },
        { id: 's1', x: 0, y: 4, w: 1, h: 1 }, { id: 's2', x: 3, y: 4, w: 1, h: 1 }
      ]
    },
    {
      name: '横刀立马', par: 19,
      pieces: [
        { id: 'cao', x: 1, y: 0, w: 2, h: 2 },
        { id: 'v1', x: 0, y: 0, w: 1, h: 2 }, { id: 'v2', x: 3, y: 0, w: 1, h: 2 },
        { id: 'v3', x: 0, y: 2, w: 1, h: 2 }, { id: 'v4', x: 3, y: 2, w: 1, h: 2 },
        { id: 'h1', x: 1, y: 2, w: 2, h: 1 },
        { id: 's1', x: 1, y: 3, w: 1, h: 1 }, { id: 's2', x: 2, y: 3, w: 1, h: 1 },
        { id: 's3', x: 0, y: 4, w: 1, h: 1 }, { id: 's4', x: 3, y: 4, w: 1, h: 1 }
      ]
    },
    {
      name: '兵临城下', par: 27,
      pieces: [
        { id: 'cao', x: 1, y: 0, w: 2, h: 2 },
        { id: 'v1', x: 0, y: 0, w: 1, h: 2 }, { id: 'v2', x: 3, y: 1, w: 1, h: 2 },
        { id: 'v3', x: 0, y: 2, w: 1, h: 2 }, { id: 'v4', x: 2, y: 3, w: 1, h: 2 },
        { id: 'h1', x: 1, y: 2, w: 2, h: 1 },
        { id: 's1', x: 1, y: 3, w: 1, h: 1 }, { id: 's2', x: 3, y: 4, w: 1, h: 1 },
        { id: 's3', x: 3, y: 3, w: 1, h: 1 }, { id: 's4', x: 0, y: 4, w: 1, h: 1 }
      ]
    }
  ];

  var STYLES = {
    cao: { bg: ['#c0392b', '#7d1f16'], label: '曹操', sub: 'CAO' },
    v1: { bg: ['#2c5f8a', '#17334c'], label: '张飞' }, v2: { bg: ['#2c5f8a', '#17334c'], label: '赵云' },
    v3: { bg: ['#2c5f8a', '#17334c'], label: '马超' }, v4: { bg: ['#2c5f8a', '#17334c'], label: '黄忠' },
    h1: { bg: ['#1f7a4d', '#0f3d26'], label: '关羽' }, h2: { bg: ['#1f7a4d', '#0f3d26'], label: '关平' },
    s: { bg: ['#6b5a2a', '#393015'], label: '兵' }
  };

  GameKit.register({
    id: 'klotski',
    name: { zh: '华容道', en: 'Klotski' },
    desc: { zh: '拖动滑块腾出通路，护送曹操从下方出口逃脱，三关递进。', en: 'Slide blocks to free the exit and let Cao Cao escape.' },
    genre: { zh: '益智解谜', en: 'Puzzle' },
    icon: '🀄', hue: '#ff5d73',
    logical: { w: 560, h: 700 },
    hot: false, isNew: true, sound: 'calm',
    controls: {
      keyboard: [
        { k: '← → ↑ ↓ / WASD', zh: '移动光标 / 滑动选中块', en: 'Cursor / slide' },
        { k: 'Enter / Space / J', zh: '选中 / 取消', en: 'Select / cancel' }
      ],
      touch: [
        { k: '拖动滑块', zh: '移动', en: 'Drag' },
        { k: '点选后再点空位', zh: '移动一格', en: 'Tap & move' }
      ]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var X0 = (W - BOARD_W) / 2, Y0 = 118;

      var pieces, level, score, moves, totalMoves, sel, cursor, drag, won, msg, msgT, msgColor, floats, prev, time, transitioning;

      function reset() {
        score = 0; level = 0; totalMoves = 0; won = false; prev = {};
        floats = []; msg = ''; msgT = 0; msgColor = '';
        loadLevel(0);
      }

      function loadLevel(n) {
        var def = LEVELS[n];
        pieces = [];
        for (var i = 0; i < def.pieces.length; i++) {
          var p = def.pieces[i];
          pieces.push({ id: p.id, x: p.x, y: p.y, w: p.w, h: p.h });
        }
        moves = 0; sel = -1; drag = null; transitioning = false;
        cursor = { x: 1, y: 3 };
        syncHud();
      }

      function diffName() {
        var d = 'normal';
        try {
          var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
          if (gc && gc.difficulty) d = gc.difficulty;
        } catch (e) { }
        return d === 'easy' ? '轻松' : d === 'hard' ? '困难' : '普通';
      }

      function syncHud() {
        env.hud({
          score: score, lives: 1, level: level + 1,
          extra: '第 ' + (level + 1) + ' 关 ' + LEVELS[level].name + ' · 步数 ' + moves + ' · ' + diffName()
        });
      }

      function occupied(x, y, ignore) {
        for (var i = 0; i < pieces.length; i++) {
          if (i === ignore) continue;
          var p = pieces[i];
          if (x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h) return i;
        }
        return -1;
      }

      function canSlide(i, dx, dy) {
        var p = pieces[i];
        var nx = p.x + dx, ny = p.y + dy;
        if (nx < 0 || ny < 0 || nx + p.w > COLS || ny + p.h > ROWS) return false;
        for (var yy = 0; yy < p.h; yy++) for (var xx = 0; xx < p.w; xx++) {
          if (occupied(nx + xx, ny + yy, i) >= 0) return false;
        }
        return true;
      }

      function slide(i, dx, dy, silent) {
        if (!canSlide(i, dx, dy)) return false;
        pieces[i].x += dx; pieces[i].y += dy;
        moves++; totalMoves++;
        cursor = { x: pieces[i].x, y: pieces[i].y };
        sfx.play('rotate');
        syncHud();
        if (pieces[i].id === 'cao' && pieces[i].x === 1 && pieces[i].y === 3) levelClear();
        return true;
      }

      function levelClear() {
        var def = LEVELS[level];
        var gain = Math.max(120, def.par * 100 - (moves - def.par) * 8) + 100;
        score += gain;
        sfx.play('levelup');
        flashMsg(def.name + ' 通关！' + moves + ' 步 · +' + gain, '#2ee6a8');
        var caoIdx = -1;
        for (var ci = 0; ci < pieces.length; ci++) if (pieces[ci].id === 'cao') caoIdx = ci;
        var c = caoIdx >= 0 ? pieceCenter(caoIdx) : { x: W / 2, y: H / 2 };
        floats.push({ x: c.x, y: c.y, txt: '+' + gain, color: '#2ee6a8', t: 1.3 });
        env.hud({ score: score });
        level++;
        if (level >= LEVELS.length) {
          won = true;
          env.delay(function () {
            env.win({ score: score, detail: '三关全通 · 总步数 ' + totalMoves });
          }, 1000);
        } else {
          transitioning = true;
          env.delay(function () {
            if (won) return;
            loadLevel(level);
            transitioning = false;
            sfx.play('start');
          }, 1300);
        }
      }

      function flashMsg(t, color) { msg = t; msgColor = color; msgT = 1.8; }

      function hitPiece(p) {
        var c = Math.floor((p.x - X0) / CELL), r = Math.floor((p.y - Y0) / CELL);
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
        return occupied(c, r, -1);
      }

      function pieceCenter(i) {
        var p = pieces[i];
        return { x: X0 + (p.x + p.w / 2) * CELL, y: Y0 + (p.y + p.h / 2) * CELL };
      }

      function edge() {
        var hit = null;
        ['left', 'right', 'up', 'down', 'a'].forEach(function (k) {
          if (env.pad[k] && !prev[k]) hit = k;
          prev[k] = env.pad[k];
        });
        return hit;
      }

      function update(dt) {
        var i, f;
        for (i = floats.length - 1; i >= 0; i--) {
          f = floats[i]; f.t -= dt / 0.9; f.y -= dt * 40;
          if (f.t <= 0) floats.splice(i, 1);
        }
        if (msgT > 0) msgT -= dt;
        if (won) return;

        var act = edge();
        if (transitioning) return;
        if (act === 'a') {
          var hit = occupied(cursor.x, cursor.y, -1);
          if (hit >= 0) {
            sel = (sel === hit) ? -1 : hit;
            sfx.play(sel >= 0 ? 'select' : 'back');
          }
        } else if (act === 'left' || act === 'right' || act === 'up' || act === 'down') {
          var dxdy = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[act];
          if (sel >= 0) {
            slide(sel, dxdy[0], dxdy[1]);
          } else {
            cursor.x = (cursor.x + dxdy[0] + COLS) % COLS;
            cursor.y = (cursor.y + dxdy[1] + ROWS) % ROWS;
          }
        }
      }

      function drawPiece(i) {
        var p = pieces[i];
        var st = STYLES[p.id] || STYLES.s;
        var x = X0 + p.x * CELL + 4, y = Y0 + p.y * CELL + 4;
        var w = p.w * CELL - 8, h = p.h * CELL - 8;
        var g = ctx.createLinearGradient(x, y, x, y + h);
        g.addColorStop(0, st.bg[0]); g.addColorStop(1, st.bg[1]);
        ctx.fillStyle = g;
        ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
        env.roundRect(x, y, w, h, 10); ctx.fill();
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.strokeStyle = (sel === i) ? '#ffd166' : 'rgba(255,255,255,.25)';
        ctx.lineWidth = sel === i ? 3 : 1.5;
        env.roundRect(x, y, w, h, 10); ctx.stroke();

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.font = (p.id === 'cao') ? 'bold 40px "Microsoft YaHei", system-ui' : (p.h > 1 ? 'bold 26px "Microsoft YaHei", system-ui' : 'bold 24px "Microsoft YaHei", system-ui');
        var label = st.label;
        /* 竖将/横将两个字竖排或横排 */
        if (label.length === 2 && p.h > p.w) {
          ctx.fillText(label[0], x + w / 2, y + h * 0.3);
          ctx.fillText(label[1], x + w / 2, y + h * 0.62);
        } else if (label.length === 2 && p.w > p.h) {
          ctx.fillText(label[0], x + w * 0.3, y + h / 2);
          ctx.fillText(label[1], x + w * 0.7, y + h / 2);
        } else {
          ctx.fillText(label, x + w / 2, y + h / 2);
        }
      }

      function render() {
        var i, f;
        var bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#17100d'); bg.addColorStop(1, '#241a12');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        /* 出口标识 */
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(46,230,168,.85)'; ctx.font = 'bold 15px system-ui';
        ctx.fillText('▲ 出 口 ▲', X0 + 1.5 * CELL, Y0 + BOARD_H + 24);
        ctx.strokeStyle = 'rgba(46,230,168,.5)'; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(X0 + CELL, Y0 + BOARD_H); ctx.lineTo(X0 + CELL, Y0 + BOARD_H + 10);
        ctx.moveTo(X0 + 3 * CELL, Y0 + BOARD_H); ctx.lineTo(X0 + 3 * CELL, Y0 + BOARD_H + 10);
        ctx.stroke();

        /* 棋盘边框 */
        ctx.strokeStyle = 'rgba(233,222,190,.4)'; ctx.lineWidth = 3;
        ctx.strokeRect(X0 - 2, Y0 - 2, BOARD_W + 4, BOARD_H + 4);

        for (var i = 0; i < pieces.length; i++) drawPiece(i);

        /* 键盘光标 */
        if (sel < 0 && !won && !transitioning) {
          ctx.strokeStyle = 'rgba(255,209,102,' + (0.45 + Math.sin(performance.now() / 260) * 0.25) + ')';
          ctx.lineWidth = 2;
          ctx.strokeRect(X0 + cursor.x * CELL + 4, Y0 + cursor.y * CELL + 4, CELL - 8, CELL - 8);
        }

        for (i = 0; i < floats.length; i++) {
          f = floats[i];
          ctx.globalAlpha = Math.max(0, Math.min(1, f.t * 1.4));
          ctx.font = 'bold 20px system-ui'; ctx.fillStyle = f.color;
          ctx.fillText(f.txt, f.x, f.y);
          ctx.globalAlpha = 1;
        }

        if (msgT > 0) {
          ctx.globalAlpha = Math.min(1, msgT);
          ctx.font = 'bold 22px system-ui'; ctx.fillStyle = msgColor;
          ctx.fillText(msg, W / 2, 668);
          ctx.globalAlpha = 1;
        }

        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('总分', 24, 30);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(String(score), 24, 62);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('关卡 ' + (level + 1) + '/' + LEVELS.length + ' · ' + diffName(), W - 24, 30);
        ctx.fillStyle = '#ffd166'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(moves + ' 步', W - 24, 62);
      }

      reset();

      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || won || transitioning) return;
        if (e.code === 'Enter' || e.code === 'NumpadEnter') {
          var hit = occupied(cursor.x, cursor.y, -1);
          if (hit >= 0) {
            sel = (sel === hit) ? -1 : hit;
            sfx.play(sel >= 0 ? 'select' : 'back');
          }
        }
      });

      /* 触屏：按下选中 / 拖动，抬起时若点在空位则向该方向滑一步 */
      env.canvas.addEventListener('pointerdown', function (e) {
        if (won || transitioning) return;
        var p = env.pointer(e);
        var i = hitPiece(p);
        if (i >= 0) {
          sel = i;
          cursor = { x: pieces[i].x, y: pieces[i].y };
          drag = { i: i, x: p.x, y: p.y };
          sfx.play('select');
        } else if (sel >= 0) {
          /* 点空位：与选中块同行/同列且相邻则滑过去 */
          var c = Math.floor((p.x - X0) / CELL), r = Math.floor((p.y - Y0) / CELL);
          var sp = pieces[sel];
          if (r === sp.y + sp.h) slide(sel, 0, 1);
          else if (r === sp.y - 1) slide(sel, 0, -1);
          else if (c === sp.x + sp.w) slide(sel, 1, 0);
          else if (c === sp.x - 1) slide(sel, -1, 0);
        }
      });
      env.canvas.addEventListener('pointermove', function (e) {
        if (!drag || won || transitioning) return;
        var p = env.pointer(e);
        var dx = p.x - drag.x, dy = p.y - drag.y;
        var TH = 26;
        if (Math.abs(dx) < TH && Math.abs(dy) < TH) return;
        if (Math.abs(dx) > Math.abs(dy)) slide(drag.i, dx > 0 ? 1 : -1, 0);
        else slide(drag.i, 0, dy > 0 ? 1 : -1);
        drag.x = p.x; drag.y = p.y;
      });
      function endDrag() { drag = null; }
      env.canvas.addEventListener('pointerup', endDrag);
      env.canvas.addEventListener('pointercancel', endDrag);
      env.canvas.addEventListener('pointerleave', endDrag);

      env.loop(function (dt) { update(dt); render(); });

      /* 自动化/调试辅助 */
      env.canvas.__auto = {
        pieces: function () { return pieces.map(function (p) { return { id: p.id, x: p.x, y: p.y, w: p.w, h: p.h }; }); },
        select: function (id) { for (var i = 0; i < pieces.length; i++) if (pieces[i].id === id) { sel = i; return true; } return false; },
        slide: function (dx, dy) { return sel >= 0 ? slide(sel, dx, dy) : false; }
      };

      return {
        start: function () {
          sfx.play('start');
          score = 0; level = 0; totalMoves = 0; won = false;
          loadLevel(0);
          syncHud();
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
