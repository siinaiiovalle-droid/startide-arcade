/* ==========================================================================
   连连看 Link —— 经典连线消除
   12×8 棋盘 · 两折以内可连即消除 · 连击加分 · 限时闯关
   无解自动洗牌，全部消完进入下一关，时间耗尽结算
   ========================================================================== */
(function () {
  'use strict';

  var COLS = 12, ROWS = 8, TILE = 44;
  var DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  var ICONS = ['🍉', '🍊', '🍋', '🍏', '🍇', '🍓', '🍒', '🍑', '🥝', '🍍', '🥑', '🌽', '🍄', '🌻', '⭐', '🍀'];

  GameKit.register({
    id: 'link',
    name: { zh: '连连看', en: 'Link Link' },
    desc: { zh: '点选两张相同图案，两折以内连线消除，连击加分，限时清盘进入下一关。', en: 'Link matching tiles with up to two turns. Combo for bonus and clear levels.' },
    genre: { zh: '益智消除', en: 'Puzzle' },
    icon: '🔗', hue: '#38e1ff',
    logical: { w: 560, h: 700 },
    hot: false, isNew: true, sound: 'calm',
    controls: {
      keyboard: [
        { k: '← → ↑ ↓ / WASD', zh: '移动光标', en: 'Move cursor' },
        { k: 'Enter / Space / J', zh: '选中 / 连线', en: 'Select / Link' }
      ],
      touch: [{ k: '点击图块', zh: '选中 / 连线', en: 'Tap to link' }]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var X0 = (W - TILE * COLS) / 2, Y0 = 150;

      var grid, sel, cursor, level, score, combo, comboT, timeLeft, levelTime;
      var over, msg, msgColor, msgT, conn, floats, shake, lastT, lowWarned, prev;

      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }

      function reset() {
        score = 0; level = 1; over = false; floats = []; conn = null; prev = {};
        combo = 0; comboT = 0; shake = 0; msg = ''; msgT = 0;
        newLevel();
      }

      function newLevel() {
        levelTime = Math.max(80, 150 - (level - 1) * 10) * (diff === 'easy' ? 1.25 : (diff === 'hard' ? 0.8 : 1));
        timeLeft = levelTime;
        sel = null; combo = 0; lowWarned = false;
        cursor = { r: 0, c: 0 };
        fillBoard();
        env.hud({ score: score, lives: 1, level: level, extra: '剩余 ' + remain() + ' 对' });
      }

      function fillBoard() {
        var pool = [];
        var pairs = COLS * ROWS / 2;
        for (var i = 0; i < pairs; i++) {
          var icon = (Math.random() * ICONS.length) | 0;
          pool.push(icon, icon);
        }
        do {
          for (var k = pool.length - 1; k > 0; k--) {
            var j = (Math.random() * (k + 1)) | 0;
            var t = pool[k]; pool[k] = pool[j]; pool[j] = t;
          }
          grid = [];
          for (var r = 0; r < ROWS; r++) {
            grid.push([]);
            for (var c = 0; c < COLS; c++) grid[r].push(pool[r * COLS + c]);
          }
        } while (!findAnyPair());
      }

      function remain() {
        var n = 0;
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] >= 0) n++;
        return n / 2;
      }

      function passable(r, c, r2, c2) {
        if (r === r2 && c === c2) return true;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true; // 棋盘外是通道
        return grid[r][c] < 0;
      }

      /* 0-1 BFS：直行代价 0，转弯代价 1，最少转弯 ≤ 2 可连 */
      function findPath(r1, c1, r2, c2) {
        if (grid[r1][c1] !== grid[r2][c2]) return null;
        var SR = ROWS + 2, SC = COLS + 2;
        function idx(r, c) { return (r + 1) * SC + (c + 1); }
        var dist = [], par = [], i;
        for (i = 0; i < SR * SC * 4; i++) { dist.push(99); par.push(-1); }
        var queue = [], head = 0;
        for (var d = 0; d < 4; d++) {
          var nr = r1 + DIRS[d][0], nc = c1 + DIRS[d][1];
          if (!passable(nr, nc, r2, c2)) continue;
          var s = idx(nr, nc) * 4 + d;
          dist[s] = 0; par[s] = -1;
          queue.push({ r: nr, c: nc, d: d });
        }
        var endState = -1;
        while (head < queue.length) {
          var cur = queue[head++];
          var ci = idx(cur.r, cur.c) * 4 + cur.d;
          if (cur.r === r2 && cur.c === c2) { endState = ci; break; }
          for (var d2 = 0; d2 < 4; d2++) {
            var cost = (d2 === cur.d) ? 0 : 1;
            var nt = dist[ci] + cost;
            if (nt > 2) continue;
            var qr = cur.r + DIRS[d2][0], qc = cur.c + DIRS[d2][1];
            if (!passable(qr, qc, r2, c2)) continue;
            var si = idx(qr, qc) * 4 + d2;
            if (dist[si] <= nt) continue;
            dist[si] = nt; par[si] = ci;
            if (qr === r2 && qc === c2) { queue.push({ r: qr, c: qc, d: d2 }); continue; }
            if (qr >= 0 && qr < ROWS && qc >= 0 && qc < COLS && grid[qr][qc] >= 0) continue; // 只有空格可以继续延伸
            if (cost === 0) queue.unshift({ r: qr, c: qc, d: d2 });
            else queue.push({ r: qr, c: qc, d: d2 });
          }
        }
        if (endState < 0) return null;
        var pts = [], s = endState;
        while (s >= 0) {
          var cell = Math.floor(s / 4);
          var cc = (cell % SC) - 1, cr = Math.floor(cell / SC) - 1;
          pts.push({ r: cr, c: cc });
          s = par[s];
        }
        pts.push({ r: r1, c: c1 });
        pts.reverse();
        var corners = [pts[0]];
        for (var k = 1; k < pts.length - 1; k++) {
          var a = pts[k - 1], b = pts[k], bb = pts[k + 1];
          if ((a.r !== b.r || b.r !== bb.r) && (a.c !== b.c || b.c !== bb.c)) corners.push(b);
        }
        corners.push(pts[pts.length - 1]);
        return corners;
      }

      function findAnyPair() {
        var byIcon = {};
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
          var v = grid[r][c];
          if (v < 0) continue;
          (byIcon[v] = byIcon[v] || []).push({ r: r, c: c });
        }
        for (var key in byIcon) {
          var list = byIcon[key];
          for (var i = 0; i < list.length; i++) for (var j2 = i + 1; j2 < list.length; j2++) {
            if (findPath(list[i].r, list[i].c, list[j2].r, list[j2].c)) return { r1: list[i].r, c1: list[i].c, r2: list[j2].r, c2: list[j2].c };
          }
        }
        return null;
      }

      function shuffleRemaining() {
        var vals = [];
        for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] >= 0) vals.push(grid[r][c]);
        do {
          for (var k = vals.length - 1; k > 0; k--) {
            var j = (Math.random() * (k + 1)) | 0;
            var t = vals[k]; vals[k] = vals[j]; vals[j] = t;
          }
          var n = 0;
          for (var r2 = 0; r2 < ROWS; r2++) for (var c2 = 0; c2 < COLS; c2++) if (grid[r2][c2] >= 0) grid[r2][c2] = vals[n++];
        } while (!findAnyPair());
        sfx.play('warn');
        flashMsg('无解 · 自动洗牌', '#ffd166');
      }

      function center(r, c) { return { x: X0 + c * TILE + TILE / 2, y: Y0 + r * TILE + TILE / 2 }; }

      function tap(r, c) {
        if (over) return;
        if (grid[r][c] < 0) { sfx.play('back'); return; }
        cursor = { r: r, c: c };
        if (!sel) { sel = { r: r, c: c }; sfx.play('select'); return; }
        if (sel.r === r && sel.c === c) { sel = null; sfx.play('back'); return; }
        var path = findPath(sel.r, sel.c, r, c);
        if (path) {
          var a = sel;
          grid[a.r][a.c] = -1; grid[r][c] = -1;
          conn = { pts: path, t: 1 };
          combo = (comboT > 0) ? combo + 1 : 1;
          comboT = 4;
          var gain = 10 + Math.min(50, (combo - 1) * 5);
          score += gain;
          sfx.play(combo > 1 ? 'coin' : 'clear');
          var m = center(r, c);
          floats.push({ x: m.x, y: m.y - 14, txt: combo > 1 ? ('+' + gain + ' ×' + combo) : ('+' + gain), color: '#2ee6a8', t: 1 });
          sel = null;
          env.hud({ score: score, extra: '剩余 ' + remain() + ' 对' + (combo > 1 ? ' · 连击 ×' + combo : '') });
          if (remain() === 0) { levelClear(); return; }
          if (!findAnyPair()) shuffleRemaining();
        } else {
          sfx.play('warn');
          shake = 1;
          sel = { r: r, c: c };
        }
      }

      function levelClear() {
        var bonus = Math.round(timeLeft) * 3 + 150 + level * 50;
        score += bonus;
        sfx.play('levelup');
        flashMsg('第 ' + level + ' 关清空！+' + bonus, '#2ee6a8');
        env.hud({ score: score });
        level++;
        env.delay(function () {
          if (over) return;
          newLevel();
        }, 1200);
      }

      function flashMsg(t, color) { msg = t; msgColor = color; msgT = 1.6; }

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
          f = floats[i]; f.t -= dt / 0.9; f.y -= dt * 42;
          if (f.t <= 0) floats.splice(i, 1);
        }
        if (conn) { conn.t -= dt / 0.45; if (conn.t <= 0) conn = null; }
        shake = Math.max(0, shake - dt / 0.25);
        if (msgT > 0) msgT -= dt;
        if (over) return;

        comboT = Math.max(0, comboT - dt);
        if (comboT === 0) combo = 0;

        timeLeft -= dt;
        if (timeLeft <= 10.5 && !lowWarned) { lowWarned = true; sfx.play('warn'); }
        if (timeLeft <= 0) {
          timeLeft = 0;
          over = true;
          env.gameOver({ score: score, detail: '第 ' + level + ' 关 · 剩余 ' + remain() + ' 对' });
          return;
        }
        env.hud({ level: level });

        var act = edge();
        if (act === 'a') tap(cursor.r, cursor.c);
        else if (act === 'left') cursor.c = (cursor.c + COLS - 1) % COLS;
        else if (act === 'right') cursor.c = (cursor.c + 1) % COLS;
        else if (act === 'up') cursor.r = (cursor.r + ROWS - 1) % ROWS;
        else if (act === 'down') cursor.r = (cursor.r + 1) % ROWS;
      }

      function tile(x, y, w, h, r) {
        env.roundRect(x, y, w, h, r);
      }

      function render() {
        var i, f;
        var bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#0a1626'); bg.addColorStop(1, '#101d36');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        ctx.save();
        if (shake > 0) ctx.translate(Math.sin(shake * 40) * 4 * shake, 0);

        /* 棋盘底板 */
        ctx.fillStyle = 'rgba(56,225,255,.05)';
        tile(X0 - 10, Y0 - 10, TILE * COLS + 20, TILE * ROWS + 20, 14); ctx.fill();

        for (var r = 0; r < ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            var v = grid[r][c];
            if (v < 0) continue;
            var x = X0 + c * TILE, y = Y0 + r * TILE;
            var isSel = sel && sel.r === r && sel.c === c;
            var isCur = cursor.r === r && cursor.c === c;
            ctx.fillStyle = isSel ? 'rgba(255,209,102,.28)' : 'rgba(255,255,255,.07)';
            tile(x + 2, y + 2, TILE - 4, TILE - 4, 8); ctx.fill();
            ctx.strokeStyle = isSel ? 'rgba(255,209,102,.95)' : (isCur ? 'rgba(56,225,255,.55)' : 'rgba(255,255,255,.12)');
            ctx.lineWidth = isSel ? 2 : 1;
            tile(x + 2, y + 2, TILE - 4, TILE - 4, 8); ctx.stroke();
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.font = '22px system-ui';
            ctx.fillText(ICONS[v], x + TILE / 2, y + TILE / 2 + 1);
          }
        }

        /* 连线 */
        if (conn) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, conn.t * 1.6);
          ctx.strokeStyle = '#38e1ff'; ctx.lineWidth = 3;
          ctx.shadowColor = 'rgba(56,225,255,.8)'; ctx.shadowBlur = 10;
          ctx.beginPath();
          for (var p = 0; p < conn.pts.length; p++) {
            var pt = center(conn.pts[p].r, conn.pts[p].c);
            if (p === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
          ctx.restore();
        }

        /* 键盘光标 */
        if (!sel) {
          var cp = center(cursor.r, cursor.c);
          ctx.strokeStyle = 'rgba(56,225,255,' + (0.5 + Math.sin(performance.now() / 260) * 0.3) + ')';
          ctx.lineWidth = 2;
          tile(X0 + cursor.c * TILE + 2, Y0 + cursor.r * TILE + 2, TILE - 4, TILE - 4, 8); ctx.stroke();
        }

        for (i = 0; i < floats.length; i++) {
          f = floats[i];
          ctx.globalAlpha = Math.max(0, Math.min(1, f.t * 1.4));
          ctx.textAlign = 'center'; ctx.font = 'bold 18px system-ui';
          ctx.fillStyle = f.color; ctx.fillText(f.txt, f.x, f.y);
          ctx.globalAlpha = 1;
        }
        ctx.restore();

        /* 计时条 */
        var bw = TILE * COLS, ratio = Math.max(0, timeLeft / levelTime);
        ctx.fillStyle = 'rgba(255,255,255,.1)';
        env.roundRect(X0, 528, bw, 12, 6); ctx.fill();
        ctx.fillStyle = ratio > 0.3 ? '#2ee6a8' : '#ff5d6c';
        env.roundRect(X0, 528, Math.max(4, bw * ratio), 12, 6); ctx.fill();
        ctx.textAlign = 'center'; ctx.font = '13px system-ui';
        ctx.fillStyle = 'rgba(249,246,242,.7)';
        ctx.fillText('剩余时间 ' + Math.ceil(timeLeft) + 's', W / 2, 560);

        if (msgT > 0) {
          ctx.globalAlpha = Math.min(1, msgT);
          ctx.font = 'bold 24px system-ui';
          ctx.fillStyle = msgColor;
          ctx.fillText(msg, W / 2, 606);
          ctx.globalAlpha = 1;
        }
        if (!sel && !over && msgT <= 0) {
          ctx.fillStyle = 'rgba(249,246,242,.5)'; ctx.font = '13px system-ui';
          ctx.fillText('点击两张相同图案 · 两折以内可连', W / 2, 606);
        }

        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('得分', 24, 30);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(String(score), 24, 62);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('关卡 · ' + (diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通'), W - 24, 30);
        ctx.fillStyle = '#ffd166'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(String(level), W - 24, 62);
      }

      reset();

      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        if (e.code === 'Enter' || e.code === 'NumpadEnter') tap(cursor.r, cursor.c);
      });

      env.canvas.addEventListener('pointerdown', function (e) {
        if (over) return;
        var p = env.pointer(e);
        var c = Math.floor((p.x - X0) / TILE), r = Math.floor((p.y - Y0) / TILE);
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) tap(r, c);
      });

      env.loop(function (dt) { update(dt); render(); });

      /* 自动化/调试辅助：找可连配对、格心坐标、快速触发超时结算 */
      env.canvas.__auto = {
        pair: findAnyPair,
        center: center,
        hurry: function () { timeLeft = Math.min(timeLeft, 0.5); }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 1, level: 1, extra: '剩余 ' + remain() + ' 对' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
