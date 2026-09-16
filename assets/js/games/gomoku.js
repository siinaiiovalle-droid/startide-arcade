/* ==========================================================================
   五子棋 Gomoku —— 人机对战
   15 路棋盘 · 启发式攻防 AI · 先连五子者胜
   连胜积分：赢一场基础 100 分，连胜越多单场加分越高，输掉立即结算
   ========================================================================== */
(function () {
  'use strict';

  var N = 15;
  var EMPTY = 0, BLACK = 1, WHITE = 2;
  var DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

  GameKit.register({
    id: 'gomoku',
    name: { zh: '五子棋', en: 'Gomoku' },
    desc: { zh: '人机对战五子棋：先连成五子者胜，连胜越多单场加分越高，输掉立即结算。', en: 'Gomoku vs AI. Connect five in a row to win; streaks boost each round\'s score.' },
    genre: { zh: '棋类对战', en: 'Board' },
    icon: '⚫', hue: '#ffd166',
    logical: { w: 560, h: 640 },
    hot: false, isNew: true, sound: 'calm',
    touchControls: ['left', 'right', 'up', 'down', 'a'],
    controls: {
      keyboard: [
        { k: '← → ↑ ↓ / WASD', zh: '移动落子光标', en: 'Move cursor' },
        { k: 'Enter / Space / J', zh: '落子', en: 'Place stone' }
      ],
      touch: [{ k: '点击棋盘', zh: '落子', en: 'Tap to place' }]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var STEP = 36;
      var X0 = (W - STEP * (N - 1)) / 2;   // 28
      var Y0 = 104;
      var R = 15;

      var board, turn, roundOver, roundT, over, roundNum;
      var score, wins, draws, streak, cursor, msg, msgColor, aiTimer, lastMove;
      var floats = [], prev = {}, flash = 0;

      var aiSlip = 0.1;
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty === 'easy') aiSlip = 0.4;
        else if (gc && gc.difficulty === 'hard') aiSlip = 0;
      } catch (e) { }

      function pt(i, j) { return { x: X0 + i * STEP, y: Y0 + j * STEP }; }

      function inside(i, j) { return i >= 0 && i < N && j >= 0 && j < N; }

      function reset() {
        score = 0; wins = 0; draws = 0; streak = 0; over = false; roundNum = 0;
        floats = [];
        newRound();
      }

      function newRound() {
        board = [];
        for (var k = 0; k < N * N; k++) board.push(0);
        roundOver = false; roundT = 0; aiTimer = 0.5; lastMove = null;
        msg = ''; msgColor = '';
        roundNum++;
        cursor = 112; // 天元 (7,7)
        turn = (roundNum % 2 === 1) ? BLACK : WHITE; // 先手轮换
        if (turn === WHITE) msg = '本局 AI 先手（白）', msgColor = 'rgba(255,255,255,.6)';
        env.hud({ score: score, lives: 1, level: wins + 1, extra: '连胜 ' + streak + ' · 平局 ' + draws });
      }

      function addFloat(x, y, txt, color) {
        floats.push({ x: x, y: y, txt: txt, color: color || '#ffd166', t: 1 });
      }

      /* ---------- 规则 ---------- */
      function fiveAt(i, j, p) {
        for (var d = 0; d < 4; d++) {
          var dx = DIRS[d][0], dy = DIRS[d][1], cnt = 1;
          for (var s = 1; s < 5; s++) { if (inside(i + dx * s, j + dy * s) && board[(j + dy * s) * N + (i + dx * s)] === p) cnt++; else break; }
          for (var t = 1; t < 5; t++) { if (inside(i - dx * t, j - dy * t) && board[(j - dy * t) * N + (i - dx * t)] === p) cnt++; else break; }
          if (cnt >= 5) return true;
        }
        return false;
      }

      function boardFull() {
        for (var k = 0; k < N * N; k++) if (!board[k]) return false;
        return true;
      }

      /* ---------- AI：启发式攻防评估 ---------- */
      function lineScore(cnt, open) {
        if (cnt >= 5) return 10000000;
        if (cnt === 4) return open === 2 ? 1200000 : (open === 1 ? 120000 : 0);
        if (cnt === 3) return open === 2 ? 16000 : (open === 1 ? 1200 : 0);
        if (cnt === 2) return open === 2 ? 450 : (open === 1 ? 60 : 0);
        return open === 2 ? 24 : 6;
      }

      function evalCell(i, j, p) {
        var total = 0;
        for (var d = 0; d < 4; d++) {
          var dx = DIRS[d][0], dy = DIRS[d][1];
          var cnt = 1, open = 0, s, ii, jj;
          for (s = 1; s <= 4; s++) {
            ii = i + dx * s; jj = j + dy * s;
            if (!inside(ii, jj)) break;
            var c1 = board[jj * N + ii];
            if (c1 === p) cnt++; else { if (c1 === EMPTY) open++; break; }
          }
          if (s > 4) open++; // 冲到边界外无阻挡
          for (s = 1; s <= 4; s++) {
            ii = i - dx * s; jj = j - dy * s;
            if (!inside(ii, jj)) break;
            var c2 = board[jj * N + ii];
            if (c2 === p) cnt++; else { if (c2 === EMPTY) open++; break; }
          }
          if (s > 4) open++;
          total += lineScore(cnt, open);
        }
        return total;
      }

      function candidates() {
        var list = [];
        for (var j = 0; j < N; j++) {
          for (var i = 0; i < N; i++) {
            if (board[j * N + i]) continue;
            var near = false;
            for (var dj = -2; dj <= 2 && !near; dj++) {
              for (var di = -2; di <= 2; di++) {
                if (!di && !dj) continue;
                if (inside(i + di, j + dj) && board[(j + dj) * N + (i + di)]) { near = true; break; }
              }
            }
            if (near) list.push({ i: i, j: j });
          }
        }
        return list;
      }

      function aiMove() {
        var cands = candidates();
        if (!cands.length) { place(7, 7, WHITE); return; }
        if (Math.random() < aiSlip) {
          var r = cands[Math.floor(Math.random() * cands.length)];
          place(r.i, r.j, WHITE);
          return;
        }
        var best = null, pool = [];
        for (var k = 0; k < cands.length; k++) {
          var c = cands[k];
          var s = evalCell(c.i, c.j, WHITE) * 1.06 + evalCell(c.i, c.j, BLACK);
          if (!best || s > best.s) { best = { s: s }; pool = [c]; }
          else if (s === best.s) pool.push(c);
        }
        var pick = pool[Math.floor(Math.random() * pool.length)];
        place(pick.i, pick.j, WHITE);
      }

      /* ---------- 落子与回合 ---------- */
      function place(i, j, who) {
        if (over || roundOver || !inside(i, j) || board[j * N + i]) return false;
        board[j * N + i] = who;
        lastMove = { i: i, j: j };
        flash = 1;
        (who === BLACK ? sfx.play('select') : sfx.play('click'));
        var p = pt(i, j);
        addFloat(p.x, p.y - 22, who === BLACK ? '⚫' : '⚪', 'rgba(0,0,0,0)');
        if (fiveAt(i, j, who)) { endRound(who); return true; }
        if (boardFull()) { endRound(EMPTY); return true; }
        turn = (who === BLACK) ? WHITE : BLACK;
        if (turn === WHITE) aiTimer = 0.4 + Math.random() * 0.35;
        env.hud({ extra: turn === BLACK ? '轮到你了（黑棋）' : 'AI 思考中…' });
        return true;
      }

      function endRound(result) {
        roundOver = true; turn = 0; roundT = 0;
        if (result === BLACK) {
          streak++; wins++;
          var gain = 100 + (streak - 1) * 40;
          score += gain;
          sfx.play('win');
          msg = '你赢了！+' + gain; msgColor = '#2ee6a8';
          var c = pt(7, 7);
          addFloat(c.x, c.y - 30, '+' + gain, '#2ee6a8');
        } else if (result === WHITE) {
          sfx.play('gameover');
          msg = 'AI 五连 · 本局结束'; msgColor = '#ff5d6c';
          env.delay(function () {
            if (over) return;
            over = true;
            env.gameOver({ score: score, detail: '胜 ' + wins + ' 场 · 平 ' + draws + ' 场' });
          }, 1100);
          return;
        } else {
          draws++; streak = 0;
          score += 30;
          sfx.play('warn');
          msg = '棋盘已满 · 平局 +30'; msgColor = '#ffd166';
        }
        env.hud({ score: score, level: wins + 1, extra: '连胜 ' + streak + ' · 平局 ' + draws });
      }

      function edge() {
        var hit = null;
        ['left', 'right', 'up', 'down', 'a'].forEach(function (k) {
          if (env.pad[k] && !prev[k]) hit = k;
          prev[k] = env.pad[k];
        });
        return hit;
      }

      function moveCursor(k) {
        var c = cursor % N, r = Math.floor(cursor / N);
        if (k === 'left') c = (c + N - 1) % N;
        else if (k === 'right') c = (c + 1) % N;
        else if (k === 'up') r = (r + N - 1) % N;
        else if (k === 'down') r = (r + 1) % N;
        cursor = r * N + c;
      }

      function update(dt) {
        for (var i = floats.length - 1; i >= 0; i--) {
          var f = floats[i]; f.t -= dt / 0.9; f.y -= dt * 40;
          if (f.t <= 0) floats.splice(i, 1);
        }
        flash = Math.max(0, flash - dt / 0.35);
        if (over) return;

        if (roundOver) {
          roundT += dt;
          if (roundT > 1.2) { newRound(); }
          return;
        }
        if (turn === BLACK) {
          var act = edge();
          if (act === 'a') place(cursor % N, Math.floor(cursor / N), BLACK);
          else if (act) moveCursor(act);
        } else if (turn === WHITE) {
          aiTimer -= dt;
          if (aiTimer <= 0) aiMove();
        }
      }

      /* ---------- 渲染 ---------- */
      function drawStone(i, j, v) {
        var p = pt(i, j);
        var g = ctx.createRadialGradient(p.x - 4, p.y - 5, 2, p.x, p.y, R + 2);
        if (v === BLACK) { g.addColorStop(0, '#5a6b8c'); g.addColorStop(1, '#0d1420'); }
        else { g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#b9c4d6'); }
        ctx.fillStyle = g;
        ctx.shadowColor = v === BLACK ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.35)';
        ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }

      function render() {
        var bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#141210'); bg.addColorStop(1, '#1e1a14');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        /* 棋盘面板 */
        ctx.fillStyle = 'rgba(255,209,102,.06)';
        env.roundRect(X0 - 22, Y0 - 22, STEP * (N - 1) + 44, STEP * (N - 1) + 44, 14); ctx.fill();

        /* 网格 */
        ctx.strokeStyle = 'rgba(233,222,190,.28)'; ctx.lineWidth = 1;
        for (var k = 0; k < N; k++) {
          var a = pt(0, k), b = pt(N - 1, k);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          var c = pt(k, 0), d = pt(k, N - 1);
          ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
        }
        /* 外框加粗 */
        ctx.strokeStyle = 'rgba(233,222,190,.5)'; ctx.lineWidth = 2;
        ctx.strokeRect(X0, Y0, STEP * (N - 1), STEP * (N - 1));
        /* 星位 */
        [[7, 7], [3, 3], [3, 11], [11, 3], [11, 11]].forEach(function (s) {
          var p = pt(s[0], s[1]);
          ctx.fillStyle = 'rgba(233,222,190,.6)';
          ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
        });

        for (var j = 0; j < N; j++) {
          for (var i = 0; i < N; i++) {
            var v = board[j * N + i];
            if (v) drawStone(i, j, v);
          }
        }

        /* 最后一手标记 */
        if (lastMove) {
          var lp = pt(lastMove.i, lastMove.j);
          ctx.strokeStyle = flash > 0 ? 'rgba(255,80,80,' + (0.4 + flash * 0.6) + ')' : 'rgba(255,120,120,.8)';
          ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.arc(lp.x, lp.y, R * 0.45, 0, Math.PI * 2); ctx.stroke();
        }

        /* 键盘光标 */
        if (turn === BLACK && !roundOver && !over) {
          var cp = pt(cursor % N, Math.floor(cursor / N));
          var pulse = 2 + Math.sin(performance.now() / 240) * 2;
          ctx.strokeStyle = 'rgba(255,209,102,.95)'; ctx.lineWidth = 2.5;
          ctx.shadowColor = 'rgba(255,209,102,.7)'; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.arc(cp.x, cp.y, R + 4 + pulse, 0, Math.PI * 2); ctx.stroke();
          ctx.shadowBlur = 0;
        }

        if (msg) {
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = msgColor; ctx.font = 'bold 24px system-ui';
          ctx.fillText(msg, W / 2, Y0 + STEP * (N - 1) + 40);
          if (roundOver && !over) {
            ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '14px system-ui';
            ctx.fillText('即将开始下一局…', W / 2, Y0 + STEP * (N - 1) + 66);
          }
        }

        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('总分', 24, 28);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(String(score), 24, 58);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('连胜', W - 24, 28);
        ctx.fillStyle = '#2ee6a8'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(String(streak), W - 24, 58);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(249,246,242,.75)'; ctx.font = '14px system-ui';
        var turnMsg = over || roundOver ? '' : (turn === BLACK ? '● 轮到你了' : '○ AI 思考中…');
        ctx.fillText(turnMsg, W / 2, 44);
      }

      reset();

      /* Space 已由 engine 映射进 pad（edge 处理），这里只补 Enter */
      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        if (e.code === 'Enter' || e.code === 'NumpadEnter') place(cursor % N, Math.floor(cursor / N), BLACK);
      });

      env.canvas.addEventListener('pointerdown', function (e) {
        if (over || roundOver || turn !== BLACK) return;
        var p = env.pointer(e);
        var i = Math.round((p.x - X0) / STEP), j = Math.round((p.y - Y0) / STEP);
        if (!inside(i, j)) return;
        var c = pt(i, j);
        var d = Math.pow(p.x - c.x, 2) + Math.pow(p.y - c.y, 2);
        /* 触屏友好：点击吸附到最近交叉点（覆盖整格，不用精确命中小圆） */
        if (d <= Math.pow(STEP * 0.85, 2)) {
          cursor = j * N + i;
          place(i, j, BLACK);
        }
      });

      env.loop(function (dt) { update(dt); render(); });

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 1, level: 1, extra: '轮到你了（黑棋）' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); }
      };
    }
  });
})();
