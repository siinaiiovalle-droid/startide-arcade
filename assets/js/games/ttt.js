/* ==========================================================================
   井字棋 Tic-Tac-Toe —— 人机对战
   极小极大 AI · 难度跟随后台配置 · 连胜积分 · 输掉即结算
   ========================================================================== */
(function () {
  'use strict';

  var LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  var PLAYER = 1, AI = 2;

  function winnerOf(b) {
    for (var i = 0; i < LINES.length; i++) {
      var L = LINES[i];
      if (b[L[0]] && b[L[0]] === b[L[1]] && b[L[1]] === b[L[2]]) return { p: b[L[0]], line: L };
    }
    return b.indexOf(0) < 0 ? { p: 0, line: null } : null; // p=0 平局
  }

  function minimax(b, player) {
    var r = winnerOf(b);
    if (r) return { score: r.p === AI ? 10 : (r.p === PLAYER ? -10 : 0) };
    var best = null;
    for (var i = 0; i < 9; i++) {
      if (b[i]) continue;
      b[i] = player;
      var s = minimax(b, player === AI ? PLAYER : AI).score;
      b[i] = 0;
      if (!best || (player === AI ? s > best.score : s < best.score)) best = { score: s, move: i };
    }
    return best;
  }

  GameKit.register({
    id: 'ttt',
    name: { zh: '井字棋', en: 'Tic-Tac-Toe' },
    desc: { zh: '人机对战井字棋：赢一场得基础分，连胜越多单场加分越高，输掉立即结算。', en: 'Tic-tac-toe vs AI. Win streaks boost each round\'s score; one loss ends the run.' },
    genre: { zh: '棋类对战', en: 'Board' },
    icon: '⭕', hue: '#2ee6a8',
    logical: { w: 560, h: 640 },
    hot: false, isNew: true, sound: 'calm',
    touchControls: ['left', 'right', 'up', 'down', 'a'],
    controls: {
      keyboard: [
        { k: '← → ↑ ↓ / WASD', zh: '移动选中格', en: 'Move cursor' },
        { k: 'Enter / Space / J', zh: '落子', en: 'Place mark' }
      ],
      touch: [{ k: '点击棋盘', zh: '落子', en: 'Tap to place' }]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var CELL = 130, GAP = 12;
      var BW = CELL * 3 + GAP * 2;
      var X0 = (W - BW) / 2, Y0 = 176;

      var board, turn, roundOver, roundT, over;
      var score, wins, draws, streak, cursor, msg, msgColor, aiTimer, winLine;
      var floats = [], prev = {};

      var aiSlip = 0.12;
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty === 'easy') aiSlip = 0.45;
        else if (gc && gc.difficulty === 'hard') aiSlip = 0;
      } catch (e) { }

      function firstEmpty() {
        for (var i = 0; i < 9; i++) if (!board[i]) return i;
        return 4;
      }

      function newRound() {
        board = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        turn = PLAYER; roundOver = false; roundT = 0; aiTimer = 0.42;
        winLine = null; msg = ''; msgColor = '';
        cursor = firstEmpty();
        env.hud({ score: score, lives: 1, level: wins + 1, extra: '连胜 ' + streak + ' · 平局 ' + draws });
      }

      function reset() {
        score = 0; wins = 0; draws = 0; streak = 0; over = false;
        floats = [];
        newRound();
      }

      function cellRect(i) {
        var c = i % 3, r = Math.floor(i / 3);
        return { x: X0 + c * (CELL + GAP), y: Y0 + r * (CELL + GAP), w: CELL, h: CELL };
      }

      function addFloat(x, y, txt, color) {
        floats.push({ x: x, y: y, txt: txt, color: color || '#ffd166', t: 1 });
      }

      function moveCursor(k) {
        var c = cursor % 3, r = Math.floor(cursor / 3);
        if (k === 'left') c = (c + 2) % 3;
        else if (k === 'right') c = (c + 1) % 3;
        else if (k === 'up') r = (r + 2) % 3;
        else if (k === 'down') r = (r + 1) % 3;
        cursor = r * 3 + c;
      }

      function place(idx, who) {
        if (over || roundOver || board[idx]) return false;
        board[idx] = who;
        (who === PLAYER ? sfx.play('select') : sfx.play('click'));
        checkRound();
        return true;
      }

      function aiMove() {
        var empties = [];
        for (var i = 0; i < 9; i++) if (!board[i]) empties.push(i);
        if (!empties.length) return;
        var chosen;
        if (Math.random() < aiSlip) {
          chosen = empties[Math.floor(Math.random() * empties.length)];
        } else {
          var best = minimax(board.slice(), AI);
          // 收集同分落点，随机取一个，避免每局一模一样
          var cands = [];
          empties.forEach(function (m) {
            var b = board.slice(); b[m] = AI;
            if (minimax(b, PLAYER).score === best.score) cands.push(m);
          });
          chosen = cands.length ? cands[Math.floor(Math.random() * cands.length)] : best.move;
        }
        place(chosen, AI);
      }

      function checkRound() {
        var r = winnerOf(board);
        if (!r) return;
        roundOver = true; turn = 0;
        if (r.p === AI) {
          winLine = r.line;
          sfx.play('gameover');
          msg = 'AI 获胜 · 本局结束'; msgColor = '#ff5d6c';
          runOverDelay();
        } else if (r.p === PLAYER) {
          winLine = r.line;
          streak++; wins++;
          var gain = 100 + (streak - 1) * 30;
          score += gain;
          sfx.play('win');
          msg = '你赢了！+' + gain; msgColor = '#2ee6a8';
          var rc = cellRect(4);
          addFloat(rc.x + rc.w / 2, rc.y, '+' + gain, '#2ee6a8');
          env.hud({ score: score, level: wins + 1, extra: '连胜 ' + streak + ' · 平局 ' + draws });
        } else {
          draws++; streak = 0;
          score += 25;
          sfx.play('warn');
          msg = '平局 +25'; msgColor = '#ffd166';
          var rd = cellRect(4);
          addFloat(rd.x + rd.w / 2, rd.y, '+25', '#ffd166');
          env.hud({ score: score, level: wins + 1, extra: '连胜 ' + streak + ' · 平局 ' + draws });
        }
      }

      function runOverDelay() {
        env.delay(function () {
          over = true;
          env.gameOver({ score: score, detail: '连胜 ' + wins + ' 场 · 平局 ' + draws + ' 场' });
        }, 900);
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
        for (var i = floats.length - 1; i >= 0; i--) {
          var f = floats[i]; f.t -= dt / 0.9; f.y -= dt * 44;
          if (f.t <= 0) floats.splice(i, 1);
        }
        if (over) return;

        if (roundOver) {
          roundT += dt;
          if (roundT > 1.1) { newRound(); return; }
        } else if (turn === PLAYER) {
          var act = edge();
          if (act === 'a') place(cursor, PLAYER);
          else if (act) moveCursor(act);
        } else if (turn === AI) {
          aiTimer -= dt;
          if (aiTimer <= 0) { turn = 0; aiMove(); if (!roundOver) turn = PLAYER; }
        }
      }

      function drawMark(i) {
        var v = board[i];
        if (!v) return;
        var r = cellRect(i), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        var s = Math.min(r.w, r.h) * 0.28;
        ctx.lineWidth = 9; ctx.lineCap = 'round';
        if (v === PLAYER) {
          ctx.strokeStyle = '#38e1ff';
          ctx.shadowColor = 'rgba(56,225,255,.7)'; ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s);
          ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s);
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#2ee6a8';
          ctx.shadowColor = 'rgba(46,230,168,.7)'; ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.arc(cx, cy, s * 0.92, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }

      function render() {
        var g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#0f1a18'); g.addColorStop(1, '#12202c');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,.72)'; ctx.font = '14px system-ui';
        ctx.fillText(turn === AI && !roundOver ? 'AI 思考中…' : '轮到你了（✕）', W / 2, 60);

        for (var i = 0; i < 9; i++) {
          var r = cellRect(i);
          ctx.fillStyle = 'rgba(255,255,255,.05)';
          env.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fill();
        }
        for (var j = 0; j < 9; j++) drawMark(j);

        if (!roundOver && !over) {
          var cr = cellRect(cursor);
          ctx.strokeStyle = 'rgba(255,209,102,.95)'; ctx.lineWidth = 3;
          ctx.shadowColor = 'rgba(255,209,102,.7)'; ctx.shadowBlur = 12;
          env.roundRect(cr.x - 3, cr.y - 3, cr.w + 6, cr.h + 6, 16); ctx.stroke();
          ctx.shadowBlur = 0;
        }

        if (winLine && roundOver) {
          var a = cellRect(winLine[0]), z = cellRect(winLine[2]);
          ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 6;
          ctx.shadowColor = 'rgba(255,255,255,.8)'; ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.moveTo(a.x + a.w / 2, a.y + a.h / 2);
          ctx.lineTo(z.x + z.w / 2, z.y + z.h / 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        if (msg) {
          ctx.fillStyle = msgColor; ctx.font = 'bold 26px system-ui';
          ctx.fillText(msg, W / 2, Y0 + BW + 26);
          if (roundOver && !over) {
            ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '14px system-ui';
            ctx.fillText('即将开始下一局…', W / 2, Y0 + BW + 58);
          }
        }

        floats.forEach(function (f) {
          ctx.globalAlpha = Math.max(0, f.t);
          ctx.fillStyle = f.color; ctx.font = 'bold 22px system-ui';
          ctx.fillText(f.txt, f.x, f.y);
          ctx.globalAlpha = 1;
        });

        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('总分', 24, 30);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(String(score), 24, 60);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('连胜', W - 24, 30);
        ctx.fillStyle = '#2ee6a8'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(String(streak), W - 24, 60);
      }

      reset();

      // 方向键 / WASD / Space 已由 engine 映射进 pad（edge 处理），这里只补 Enter
      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        if (e.code === 'Enter' || e.code === 'NumpadEnter') place(cursor, PLAYER);
      });

      env.canvas.addEventListener('pointerdown', function (e) {
        var p = env.pointer(e);
        for (var i = 0; i < 9; i++) {
          var r = cellRect(i);
          if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { place(i, PLAYER); break; }
        }
      });

      env.loop(function (dt) { update(dt); render(); });

      return {
        start: function () { sfx.play('start'); },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); }
      };
    }
  });
})();
