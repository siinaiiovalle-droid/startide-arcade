/* ==========================================================================
   空当接龙 FreeCell Solitaire
   52 张牌 · 8 列牌堆 · 4 自由格 · 4 回收堆
   点击智能移动（回收堆 > 牌列 > 自由格）· 点选后手动放置 · Z 撤销 · 死局判定
   ========================================================================== */
(function () {
  'use strict';

  var SUITS = ['♠', '♥', '♦', '♣'];
  var RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var CW = 60, CH = 84, GAP = 6;

  GameKit.register({
    id: 'freecell',
    name: { zh: '空当接龙', en: 'FreeCell' },
    desc: { zh: '经典空当接龙：把 52 张牌全部按花色 A→K 收进回收堆。点击牌自动找最佳去处，也可点选后手动放置，Z 撤销。红黑相间叠牌，所有牌都可以看到！', en: 'Classic FreeCell: move all 52 cards to the foundations. Tap a card for a smart move, or select then place. Z to undo. Every card is visible!' },
    genre: { zh: '牌桌经典', en: 'Card' },
    icon: '🃏', hue: '#166534',
    logical: { w: 560, h: 700 },
    plays: 5000, hot: false, isNew: true, sound: 'calm',
    script: 'assets/js/games/freecell.js',
    ratio: 'portrait', duration: '5-20 分钟',

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var X0 = (W - (8 * CW + 7 * GAP)) / 2, TOP_Y = 96, CAS_Y = 232;

      var casc, free, found, sel, moves, score, time, over, win, undoStack, dealing;

      function newCard(r, s) { return { r: r, s: s }; }
      function isRed(c) { return c.s === 1 || c.s === 2; }

      function deal() {
        var deck = [];
        for (var s = 0; s < 4; s++) for (var r = 1; r <= 13; r++) deck.push(newCard(r, s));
        /* Fisher-Yates */
        for (var i = deck.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = deck[i]; deck[i] = deck[j]; deck[j] = t;
        }
        applyDeal(deck, [7, 7, 7, 7, 6, 6, 6, 6]);
      }

      function applyDeal(deck, lens) {
        casc = []; free = [null, null, null, null]; found = [[], [], [], []];
        var k = 0;
        for (var c = 0; c < 8; c++) {
          var col = [];
          for (var i = 0; i < lens[c]; i++) col.push(deck[k++]);
          casc.push(col);
        }
        sel = null; moves = 0; score = 0; time = 0; over = false; win = false; undoStack = [];
        env.hud({ score: 0, lives: 1, level: 1, extra: '回收 0/52 · 0 步' });
      }

      function snapshot() {
        undoStack.push(JSON.stringify({ casc: casc, free: free, found: found, score: score }));
        if (undoStack.length > 200) undoStack.shift();
      }

      function undo() {
        if (!undoStack.length || over) return;
        var st = JSON.parse(undoStack.pop());
        casc = st.casc; free = st.free; found = st.found; score = st.score;
        sel = null;
        sfx.play('rotate');
        env.hud({ score: score, extra: '回收 ' + homeCount() + '/52 · ' + moves + ' 步' });
      }

      function homeCount() {
        return found[0].length + found[1].length + found[2].length + found[3].length;
      }

      function freeEmpty() {
        var n = 0; for (var i = 0; i < 4; i++) if (!free[i]) n++; return n;
      }
      function emptyCasc() {
        var n = 0; for (var i = 0; i < 8; i++) if (!casc[i].length) n++; return n;
      }

      /* 从 casc[idx] 的第 cardIdx 张到列底是否为合法红黑降序串 */
      function runFrom(ci, cardIdx) {
        var col = casc[ci];
        for (var i = cardIdx; i < col.length - 1; i++) {
          var a = col[i], b = col[i + 1];
          if (a.r !== b.r + 1 || isRed(a) === isRed(b)) return false;
        }
        return true;
      }

      function foundationFor(card) {
        for (var f = 0; f < 4; f++) {
          var pile = found[f];
          if (pile.length === card.r - 1 && (pile.length === 0 ? true : pile[0].s === card.s)) return f;
        }
        return -1;
      }

      function canDrop(card, ci, ignoreEmptyCount) {
        var col = casc[ci];
        if (!col.length) return true;
        var top = col[col.length - 1];
        return card.r === top.r - 1 && isRed(card) !== isRed(top);
      }

      function popSource(loc) {
        /* loc: {t:'c', i, k} 或 {t:'f', i}；返回被取出的牌数组 */
        if (loc.t === 'f') { var c = free[loc.i]; free[loc.i] = null; return [c]; }
        var col = casc[loc.i], out = col.splice(loc.k);
        return out;
      }

      function finishMove() {
        moves++;
        var home = homeCount();
        env.hud({ score: score, extra: '回收 ' + home + '/52 · ' + moves + ' 步' });
        if (home === 52) {
          win = true; over = true;
          score += 1000 + Math.max(0, 600 - moves * 2) + Math.max(0, 400 - Math.floor(time) * 2);
          sfx.play('win');
          env.gameOver({ score: score, detail: '通关 · ' + moves + ' 步 · ' + Math.floor(time) + 's' });
          return;
        }
        if (deadEnd()) {
          over = true;
          sfx.play('gameover');
          env.gameOver({ score: score, detail: '无路可走 · 已回收 ' + home + ' 张' });
        }
      }

      function deadEnd() {
        var i, k;
        if (freeEmpty() > 0) {
          /* 有空自由格且任何顶牌可入回收堆或任意牌列（非空）就有活路 */
          for (i = 0; i < 8; i++) {
            if (!casc[i].length) continue;
            var top = casc[i][casc[i].length - 1];
            if (foundationFor(top) >= 0) return false;
            for (k = 0; k < 8; k++) if (k !== i && casc[k].length && canDrop(top, k)) return false;
          }
          for (i = 0; i < 4; i++) {
            if (!free[i]) continue;
            if (foundationFor(free[i]) >= 0) return false;
            for (k = 0; k < 8; k++) if (casc[k].length && canDrop(free[i], k)) return false;
          }
          /* 自由格全空 + 全部列顶都无处可放也仍可能还能整串挪 → 保守：还有空自由格就不判死 */
          return false;
        }
        /* 无空自由格 */
        for (i = 0; i < 8; i++) {
          if (!casc[i].length) return false; /* 空列本身是活路 */
          var top2 = casc[i][casc[i].length - 1];
          if (foundationFor(top2) >= 0) return false;
          for (k = 0; k < 8; k++) if (k !== i && casc[k].length && canDrop(top2, k)) return false;
          /* 检查列内串是否能整体移动 */
          for (k = 0; k < casc[i].length - 1; k++) {
            if (runFrom(i, k)) {
              var need = casc[i].length - k;
              var cap = (1 + freeEmpty()) * (1 + emptyCasc());
              if (need <= cap) {
                for (var d = 0; d < 8; d++) if (d !== i && casc[d].length && canDrop(casc[i][k], d)) return false;
              }
            }
          }
        }
        for (i = 0; i < 4; i++) if (free[i] && foundationFor(free[i]) >= 0) return false;
        return true;
      }

      /* 智能移动：优先回收堆 → 牌列 → 自由格 */
      function smartMove(loc) {
        if (over) return;
        var card, runLen = 1, runOk = true;
        if (loc.t === 'f') { card = free[loc.i]; runOk = false; }
        else { card = casc[loc.i][loc.k]; runOk = runFrom(loc.i, loc.k); runLen = casc[loc.i].length - loc.k; }
        if (!card) return;

        /* 1) 回收堆（只允许顶牌/自由格单张） */
        if (runLen === 1) {
          var fi = foundationFor(card);
          if (fi >= 0) {
            snapshot();
            popSource(loc);
            found[fi].push(card);
            score += 20;
            sfx.play('coin');
            sel = null;
            finishMove();
            return;
          }
        }
        /* 2) 牌列 */
        if (runOk) {
          var cap = (1 + freeEmpty()) * (1 + emptyCasc());
          if (runLen <= cap) {
            /* 先找非空可叠目标，再找空列 */
            var best = -1;
            for (var ci = 0; ci < 8; ci++) {
              if (loc.t === 'c' && ci === loc.i) continue;
              if (casc[ci].length && canDrop(card, ci)) { best = ci; break; }
            }
            if (best < 0) {
              for (var ce = 0; ce < 8; ce++) {
                if (loc.t === 'c' && ce === loc.i) continue;
                if (!casc[ce].length) { best = ce; break; }
              }
            }
            if (best >= 0) {
              snapshot();
              var cards = popSource(loc);
              for (var m = 0; m < cards.length; m++) casc[best].push(cards[m]);
              sfx.play('select');
              sel = null;
              finishMove();
              return;
            }
          }
        }
        /* 3) 自由格（只允许单张顶牌） */
        if (runLen === 1) {
          for (var f2 = 0; f2 < 4; f2++) {
            if (!free[f2]) {
              snapshot();
              popSource(loc);
              free[f2] = card;
              sfx.play('select');
              sel = null;
              finishMove();
              return;
            }
          }
        }
        sfx.play('block');
        sel = (loc.t === 'c') ? { t: 'c', i: loc.i, k: loc.k } : { t: 'f', i: loc.i };
      }

      function manualMove(loc, dest) {
        if (over) return;
        var card, runLen = 1, runOk;
        if (loc.t === 'f') { card = free[loc.i]; runOk = false; }
        else { card = casc[loc.i][loc.k]; runOk = runFrom(loc.i, loc.k); runLen = casc[loc.i].length - loc.k; }
        if (!card) return;

        if (dest.t === 'fo') {
          if (runLen === 1) {
            var fi = foundationFor(card);
            if (fi === dest.i || (fi < 0 && found[dest.i].length === card.r - 1 && (found[dest.i].length === 0 || true))) {
              /* 点到哪个回收堆就放哪个（花色自动匹配更友好） */
              if (fi < 0) fi = foundationFor(card);
              if (fi >= 0) {
                snapshot();
                popSource(loc);
                found[fi].push(card);
                score += 20;
                sfx.play('coin'); sel = null; finishMove(); return;
              }
            }
          }
          sfx.play('block'); return;
        }
        if (dest.t === 'fr') {
          if (runLen === 1 && !free[dest.i]) {
            snapshot();
            popSource(loc);
            free[dest.i] = card;
            sfx.play('select'); sel = null; finishMove(); return;
          }
          sfx.play('block'); return;
        }
        /* dest.t === 'c' */
        var cap = (1 + freeEmpty()) * (1 + (casc[dest.i].length ? emptyCasc() : emptyCasc() - 1));
        if (runOk && runLen <= cap && (casc[dest.i].length ? canDrop(card, dest.i) : true)) {
          snapshot();
          var cards = popSource(loc);
          for (var m = 0; m < cards.length; m++) casc[dest.i].push(cards[m]);
          sfx.play('select'); sel = null; finishMove(); return;
        }
        sfx.play('block');
      }

      /* ---------- 命中检测 ---------- */
      function cascStep(ci) {
        var len = casc[ci].length;
        var avail = H - CAS_Y - 96;
        return len > 1 ? Math.min(CH * 0.32, avail / (len - 1)) : 0;
      }
      function hitFreeFound(x, y) {
        for (var i = 0; i < 4; i++) {
          var fx = X0 + i * (CW + GAP);
          if (x >= fx && x <= fx + CW && y >= TOP_Y && y <= TOP_Y + CH) return { t: 'fr', i: i };
        }
        for (i = 0; i < 4; i++) {
          var ox = X0 + (4 + i) * (CW + GAP);
          if (x >= ox && x <= ox + CW && y >= TOP_Y && y <= TOP_Y + CH) return { t: 'fo', i: i };
        }
        return null;
      }
      function hitCard(x, y) {
        if (y < CAS_Y - 6) return null;
        for (var ci = 0; ci < 8; ci++) {
          var cx = X0 + ci * (CW + GAP);
          if (x < cx || x > cx + CW) continue;
          var col = casc[ci];
          if (!col.length) {
            if (y <= CAS_Y + CH) return { t: 'c', i: ci, k: -1, empty: true };
            continue;
          }
          var step = cascStep(ci);
          for (var k = col.length - 1; k >= 0; k--) {
            var cy = CAS_Y + k * step;
            if (y >= cy && y <= cy + CH) return { t: 'c', i: ci, k: k };
          }
        }
        return null;
      }
      function hitUndo(x, y) {
        return x >= W / 2 - 70 && x <= W / 2 + 70 && y >= H - 36 && y <= H - 10;
      }

      env.canvas.addEventListener('pointerdown', function (e) {
        if (over) return;
        var p = env.pointer(e), x = p.x, y = p.y;
        if (hitUndo(x, y)) { undo(); return; }
        var ff = hitFreeFound(x, y);
        var hc = hitCard(x, y);
        if (sel) {
          var dest = null;
          if (ff && ff.t === 'fo') dest = { t: 'fo', i: ff.i };
          else if (ff) dest = { t: 'fr', i: ff.i };
          else if (hc) dest = { t: 'c', i: hc.i };
          if (dest) {
            manualMove(sel, dest);
            return;
          }
          sel = null;
        }
        if (hc) {
          if (hc.empty || hc.k === -1) { sfx.play('block'); return; }
          smartMove({ t: 'c', i: hc.i, k: hc.k });
          return;
        }
        if (ff && ff.t === 'fr' && free[ff.i]) smartMove({ t: 'f', i: ff.i });
      });

      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        if (e.code === 'KeyZ' || e.code === 'Backspace') undo();
      });

      /* ---------- 渲染 ---------- */
      function drawCard(c, x, y, opts) {
        opts = opts || {};
        ctx.fillStyle = '#ffffff';
        env.roundRect(x, y, CW, CH, 7); ctx.fill();
        ctx.strokeStyle = opts.sel ? '#f59e0b' : (opts.dim ? 'rgba(0,0,0,.18)' : 'rgba(30,40,60,.45)');
        ctx.lineWidth = opts.sel ? 3 : 1.4;
        env.roundRect(x, y, CW, CH, 7); ctx.stroke();
        var col = isRed(c) ? '#c0392b' : '#1a2433';
        ctx.fillStyle = col;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.font = 'bold 17px Consolas, monospace';
        ctx.fillText(RANKS[c.r], x + 6, y + 5);
        ctx.font = '15px system-ui';
        ctx.fillText(SUITS[c.s], x + 6, y + 24);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '34px system-ui';
        ctx.fillText(SUITS[c.s], x + CW / 2, y + CH * 0.68);
      }

      function render() {
        var i;
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#e7f3ea'); bg.addColorStop(1, '#cfe6d4');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        /* 桌沿 */
        ctx.fillStyle = 'rgba(22,101,52,.14)';
        env.roundRect(X0 - 12, TOP_Y - 12, 8 * CW + 7 * GAP + 24, CH + 24, 12); ctx.fill();

        /* 自由格 */
        for (i = 0; i < 4; i++) {
          var fx = X0 + i * (CW + GAP);
          ctx.strokeStyle = 'rgba(22,101,52,.35)'; ctx.lineWidth = 1.6;
          ctx.setLineDash([5, 4]);
          env.roundRect(fx, TOP_Y, CW, CH, 7); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(22,101,52,.4)'; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('暂存', fx + CW / 2, TOP_Y + CH / 2);
          if (free[i]) drawCard(free[i], fx, TOP_Y, { sel: sel && sel.t === 'f' && sel.i === i });
        }
        /* 回收堆 */
        for (i = 0; i < 4; i++) {
          var ox = X0 + (4 + i) * (CW + GAP);
          ctx.strokeStyle = 'rgba(22,101,52,.5)'; ctx.lineWidth = 1.6;
          env.roundRect(ox, TOP_Y, CW, CH, 7); ctx.stroke();
          ctx.fillStyle = 'rgba(22,101,52,.4)'; ctx.font = '11px system-ui';
          ctx.fillText('回收', ox + CW / 2, TOP_Y + CH / 2);
          var pile = found[i];
          if (pile.length) {
            drawCard(pile[pile.length - 1], ox, TOP_Y, {});
          } else {
            ctx.fillStyle = 'rgba(22,101,52,.55)'; ctx.font = '20px system-ui';
            ctx.fillText('A', ox + CW / 2, TOP_Y + CH * 0.78);
          }
        }

        /* 牌列 */
        for (i = 0; i < 8; i++) {
          var cx = X0 + i * (CW + GAP);
          var col = casc[i];
          if (!col.length) {
            ctx.strokeStyle = 'rgba(22,101,52,.3)'; ctx.lineWidth = 1.4;
            ctx.setLineDash([5, 4]);
            env.roundRect(cx, CAS_Y, CW, CH, 7); ctx.stroke();
            ctx.setLineDash([]);
          }
          var step = cascStep(i);
          for (var k = 0; k < col.length; k++) {
            var isSel = sel && sel.t === 'c' && sel.i === i && k >= sel.k;
            drawCard(col[k], cx, CAS_Y + k * step, { sel: isSel });
          }
        }

        /* 撤销按钮 */
        ctx.fillStyle = 'rgba(22,101,52,.75)';
        env.roundRect(W / 2 - 70, H - 36, 140, 26, 13); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('↩ 撤销 (Z)', W / 2, H - 23);

        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(15,50,30,.65)'; ctx.font = '13px system-ui';
        ctx.fillText('得分', 24, 34);
        ctx.fillStyle = '#0f3d22'; ctx.font = 'bold 26px Consolas, monospace';
        ctx.fillText(String(score), 24, 62);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(15,50,30,.65)'; ctx.font = '13px system-ui';
        ctx.fillText(Math.floor(time) + 's · ' + moves + ' 步', W - 24, 34);
      }

      reset();

      function reset() {
        deal();
        time = 0;
      }

      var lastSec = -1;
      env.loop(function (dt) {
        if (!over) {
          time += dt;
          var sec = Math.floor(time);
          if (sec !== lastSec) {
            lastSec = sec;
            env.hud({ extra: '回收 ' + homeCount() + '/52 · ' + moves + ' 步' });
          }
        }
        render();
      });

      env.canvas.__auto = {
        state: function () { return { over: over, win: win, home: homeCount(), moves: moves, score: score, freeEmpty: freeEmpty() }; },
        undo: undo,
        board: function () { return casc.map(function (c) { return c.map(function (x) { return x.r + SUITS[x.s]; }); }); },
        smart: smartMove,
        dealCustom: function (deck, lens) { applyDeal(deck, lens); },
        /* 构造一个「纯回收堆即可通关」的测试牌局：每花色拆两列，底→顶降序 */
        dealSolvable: function () {
          var deck = [], lens = [7, 6, 7, 6, 7, 6, 7, 6];
          for (var s = 0; s < 4; s++) {
            for (var hi = 7; hi >= 1; hi--) deck.push(newCard(hi, s));
            for (var lo = 13; lo >= 8; lo--) deck.push(newCard(lo, s));
          }
          applyDeal(deck, lens);
        }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 1, level: 1, extra: '回收 0/52 · 0 步' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
