/* ==========================================================================
   掷骰大富翁（简版） Dice Rich
   16 格环形棋盘 · 买地收租 · 机会事件 · 双数再掷 · 回合终局比资产 · 三难度
   ========================================================================== */
(function () {
  'use strict';

  var DIFF = {
    easy:   { start: 1600, go: 250, rounds: 12, mult: 0.8,  label: '轻松' },
    normal: { start: 1200, go: 200, rounds: 20, mult: 1.0,  label: '标准' },
    hard:   { start: 900,  go: 150, rounds: 30, mult: 1.3,  label: '困难' }
  };

  var CELLS = [
    { t: 'go' },
    { t: 'prop', name: 'A1', price: 80,  rent: 14 },
    { t: 'chance' },
    { t: 'prop', name: 'A2', price: 120, rent: 24 },
    { t: 'tax', v: 60 },
    { t: 'prop', name: 'B1', price: 160, rent: 34 },
    { t: 'jail' },
    { t: 'prop', name: 'B2', price: 200, rent: 46 },
    { t: 'bonus', v: 160 },
    { t: 'prop', name: 'C1', price: 240, rent: 58 },
    { t: 'chance' },
    { t: 'prop', name: 'C2', price: 280, rent: 72 },
    { t: 'tax', v: 100 },
    { t: 'prop', name: 'D1', price: 340, rent: 96 },
    { t: 'park' },
    { t: 'prop', name: 'D2', price: 420, rent: 130 }
  ];
  var CHANCES = [
    { v: 120, s: '拾金不昧获奖励 +120' },
    { v: 100, s: '彩票中奖 +100' },
    { v: -80, s: '手机送修 -80' },
    { v: -60, s: '网购踩雷 -60' },
    { v: 200, s: '股票大涨 +200' },
    { v: -40, s: '违章停车罚单 -40' }
  ];
  var PCOLOR = ['#22c55e', '#f97316'];

  GameKit.register({
    id: 'rich',
    name: { zh: '掷骰大富翁', en: 'Dice Rich' },
    desc: { zh: '环形棋盘掷骰前进！买地、收租、升级，机会与税务随机出没，双数还能再掷一次。回合结束时资产更多的一方获胜，让电脑见识你的经营头脑！', en: 'Roll the dice around the board! Buy properties, collect rent and upgrade. Higher total assets when rounds end wins — outplay the AI tycoon!' },
    genre: { zh: '棋类桌游', en: 'Board' },
    icon: '🎲', hue: '#b45309',
    logical: { w: 560, h: 700 },
    plays: 5000, hot: false, isNew: true, sound: 'calm',
    script: 'assets/js/games/rich.js',
    ratio: 'portrait', duration: '2-5 分钟',
    touchControls: ['a', 'b'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!DIFF[diff]) diff = 'normal';
      var cfg = DIFF[diff];

      var BX = 18, BY = 18, BRD = 524, CS = BRD / 5;
      var players, own, phase, rollT, walkT, resT, d1, d2, diceFace1, diceFace2, dbl, stepsLeft, round, cur, logs, over, finished, pendingDice;

      function cellRC(i) {
        if (i <= 4) return { r: 0, c: i };
        if (i <= 8) return { r: i - 4, c: 4 };
        if (i <= 12) return { r: 4, c: 12 - i };
        return { r: 16 - i, c: 0 };
      }
      function cellXY(i) {
        var rc = cellRC(i);
        return { x: BX + rc.c * CS, y: BY + rc.r * CS };
      }
      function assets(pl) {
        var a = pl.cash;
        for (var i = 0; i < CELLS.length; i++) if (own[i] && own[i].o === pl.id) a += CELLS[i].price;
        return Math.max(0, Math.round(a));
      }
      function who(i) { return i === 0 ? '你' : '电脑'; }

      function syncHud() {
        env.hud({
          score: Math.round(assets(players[0]) * cfg.mult),
          lives: 0, level: 1,
          extra: '回合 ' + Math.min(round, cfg.rounds) + '/' + cfg.rounds + ' · ' + cfg.label
        });
      }
      function setLog(s) { logs.unshift(s); if (logs.length > 3) logs.length = 3; }

      function reset() {
        players = [
          { id: 0, cash: cfg.start, pos: 0 },
          { id: 1, cash: cfg.start, pos: 0 }
        ];
        own = [];
        for (var i = 0; i < CELLS.length; i++) own.push(null);
        phase = 'idle'; cur = 0; round = 1;
        d1 = 1; d2 = 1; diceFace1 = 1; diceFace2 = 1;
        dbl = false; stepsLeft = 0; over = false; finished = false;
        rollT = 0; walkT = 0; resT = 0; pendingDice = null;
        logs = ['你的回合，掷骰子出发！'];
        syncHud();
      }

      function canRoll() { return !over && phase === 'idle' && cur === 0; }

      function startRoll() {
        phase = 'roll'; rollT = 0.85; dbl = false;
        sfx.play('select');
      }
      function doRoll() { if (canRoll()) startRoll(); }

      function resolveCell() {
        var pl = players[cur];
        var i = pl.pos, cell = CELLS[i];
        if (cell.t === 'prop') {
          var o = own[i];
          if (!o) {
            if (pl.cash >= cell.price * 2) {
              pl.cash -= cell.price;
              own[i] = { o: pl.id, lv: 1 };
              sfx.play('powerup');
              setLog(who(cur) + '买下 ' + cell.name + '（' + cell.price + ' 元）');
            } else setLog(who(cur) + '资金不足，跳过 ' + cell.name);
          } else if (o.o === pl.id) {
            var cost = Math.ceil(cell.price / 2);
            if (o.lv < 3 && pl.cash >= cost * 2) {
              pl.cash -= cost; o.lv++;
              sfx.play('levelup');
              setLog(cell.name + ' 升到 ' + o.lv + ' 级（租金 ×' + o.lv + '）');
            } else setLog(cell.name + ' 暂不升级');
          } else {
            var r = cell.rent * o.lv;
            pl.cash -= r;
            players[o.o].cash += r;
            sfx.play('hit');
            setLog(who(cur) + '付租金 ' + r + ' 元给 ' + who(o.o));
          }
        } else if (cell.t === 'tax') {
          pl.cash -= cell.v; sfx.play('hit');
          setLog(who(cur) + '缴税 ' + cell.v + ' 元');
        } else if (cell.t === 'bonus') {
          pl.cash += cell.v; sfx.play('coin');
          setLog(who(cur) + '领年终奖 +' + cell.v);
        } else if (cell.t === 'chance') {
          var ev = CHANCES[Math.floor(Math.random() * CHANCES.length)];
          pl.cash += ev.v;
          sfx.play(ev.v >= 0 ? 'coin' : 'hit');
          setLog('机会：' + ev.s);
        }
        syncHud();
      }

      function finish(meWin, why) {
        if (finished) return;
        finished = true; over = true;
        var total = assets(players[0]);
        env.gameOver({
          win: !!meWin,
          score: meWin ? Math.round(total * cfg.mult) : 0,
          level: 1,
          extra: why || (meWin ? '总资产 ' + total + ' 元' : '经营失败')
        });
      }

      function afterResolve() {
        var i;
        for (i = 0; i < 2; i++) {
          if (players[i].cash < 0) { finish(i === 1, who(i) + '破产！'); return; }
        }
        if (dbl) {
          if (cur === 0) { phase = 'idle'; setLog('双数奖励：再掷一次！'); }
          else { phase = 'idle'; startRoll(); setLog('电脑掷出双数，再掷！'); }
          return;
        }
        if (cur === 1) round++;
        if (round > cfg.rounds) {
          finish(assets(players[0]) >= assets(players[1]), '回合结束，比资产');
          return;
        }
        cur = 1 - cur;
        syncHud();
        if (cur === 1) { phase = 'idle'; startRoll(); }
        else { phase = 'idle'; setLog('你的回合，掷骰子！'); }
      }

      /* ---- 输入：键盘（onKey 直触发）+ pad 边沿 + 触屏 ---- */
      var prevPad = {};
      var unbindKey = env.onKey(function (e) {
        if (e.code === 'Space' || e.code === 'Enter') doRoll();
      });
      function onPointer(e) {
        if (over) return;
        var p = env.pointer(e);
        if (p.y > 606 && p.y < 690 && p.x > 165 && p.x < 395) doRoll();
      }
      env.canvas.addEventListener('pointerdown', onPointer);

      function update(dt) {
        if (env.pad.a && !prevPad.a) doRoll();
        prevPad = { a: env.pad.a, b: env.pad.b };
        if (over) return;

        if (phase === 'roll') {
          rollT -= dt;
          diceFace1 = 1 + Math.floor(Math.random() * 6);
          diceFace2 = 1 + Math.floor(Math.random() * 6);
          if (rollT <= 0) {
            if (pendingDice) { d1 = pendingDice[0]; d2 = pendingDice[1]; pendingDice = null; }
            else { d1 = 1 + Math.floor(Math.random() * 6); d2 = 1 + Math.floor(Math.random() * 6); }
            diceFace1 = d1; diceFace2 = d2;
            dbl = d1 === d2;
            stepsLeft = d1 + d2;
            setLog(who(cur) + '掷出 ' + d1 + ' + ' + d2 + (dbl ? '（双数！）' : ''));
            phase = 'walk'; walkT = 0.13;
          }
        } else if (phase === 'walk') {
          walkT -= dt;
          if (walkT <= 0) {
            walkT = 0.13;
            var pl = players[cur];
            pl.pos = (pl.pos + 1) % 16;
            sfx.play('click');
            if (pl.pos === 0) { pl.cash += cfg.go; sfx.play('coinDrop'); }
            stepsLeft--;
            if (stepsLeft <= 0) { phase = 'resolve'; resT = 0.6; resolveCell(); }
          }
        } else if (phase === 'resolve') {
          resT -= dt;
          if (resT <= 0) afterResolve();
        }
      }

      function drawDice(x, y, n, hi) {
        ctx.save();
        ctx.fillStyle = hi ? '#fff' : '#e2e8f0';
        env.roundRect(x, y, 44, 44, 8); ctx.fill();
        ctx.fillStyle = '#0f172a';
        var d = 6, cx = x + 22, cy = y + 22;
        var spots = {
          1: [[cx, cy]],
          2: [[x + 12, y + 12], [x + 32, y + 32]],
          3: [[x + 11, y + 11], [cx, cy], [x + 33, y + 33]],
          4: [[x + 12, y + 12], [x + 32, y + 12], [x + 12, y + 32], [x + 32, y + 32]],
          5: [[x + 12, y + 12], [x + 32, y + 12], [cx, cy], [x + 12, y + 32], [x + 32, y + 32]],
          6: [[x + 12, y + 11], [x + 32, y + 11], [x + 12, cy], [x + 32, cy], [x + 12, y + 33], [x + 32, y + 33]]
        };
        var sp = spots[n] || spots[1];
        for (var k = 0; k < sp.length; k++) {
          ctx.beginPath(); ctx.arc(sp[k][0], sp[k][1], d / 2, 0, 7); ctx.fill();
        }
        ctx.restore();
      }

      function render() {
        var i, k, xy, cell;
        ctx.fillStyle = '#141019'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(BX, BY, BRD, BRD);

        /* 棋盘格 */
        for (i = 0; i < 16; i++) {
          xy = cellXY(i); cell = CELLS[i];
          var isCur = (players && players[cur] && players[cur].pos === i);
          ctx.fillStyle = i === players[0].pos || (players[1].pos === i) ? '#2b2337' : '#241d2e';
          env.roundRect(xy.x + 2, xy.y + 2, CS - 4, CS - 4, 10); ctx.fill();
          if (isCur) { ctx.strokeStyle = PCOLOR[cur]; ctx.lineWidth = 2; env.roundRect(xy.x + 2, xy.y + 2, CS - 4, CS - 4, 10); ctx.stroke(); }

          var label = '', price = '';
          if (cell.t === 'go') label = '🏁 起点';
          else if (cell.t === 'tax') { label = '💸 税务'; price = '-' + cell.v; }
          else if (cell.t === 'chance') label = '❓ 机会';
          else if (cell.t === 'bonus') { label = '🎁 奖金'; price = '+' + cell.v; }
          else if (cell.t === 'jail') label = '⛓ 监狱';
          else if (cell.t === 'park') label = '🌳 公园';
          else { label = cell.name; price = cell.price + ''; }

          if (cell.t === 'prop') {
            var o = own[i];
            var lvColor = o ? PCOLOR[o.o] : 'rgba(255,255,255,.18)';
            ctx.fillStyle = lvColor;
            ctx.fillRect(xy.x + 12, xy.y + 10, CS - 24, 6);
            ctx.fillStyle = o ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.4)';
            for (k = 0; k < (o ? o.lv : 0); k++) ctx.fillRect(xy.x + 12 + k * 9, xy.y + 10, 6, 6);
          }

          ctx.fillStyle = 'rgba(255,255,255,.85)';
          ctx.font = 'bold 13px system-ui, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(label, xy.x + CS / 2, xy.y + CS / 2 - 6);
          if (price) {
            ctx.fillStyle = 'rgba(255,255,255,.5)';
            ctx.font = '11px system-ui, sans-serif';
            ctx.fillText(price, xy.x + CS / 2, xy.y + CS / 2 + 14);
          }
        }

        /* 棋子 */
        for (k = 0; k < 2; k++) {
          xy = cellXY(players[k].pos);
          var ox = k === 0 ? -12 : 12;
          ctx.beginPath();
          ctx.arc(xy.x + CS / 2 + ox, xy.y + CS / 2 + 18, 11, 0, 7);
          ctx.fillStyle = PCOLOR[k]; ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 10px system-ui, sans-serif';
          ctx.fillText(k === 0 ? '你' : 'AI', xy.x + CS / 2 + ox, xy.y + CS / 2 + 18);
        }

        /* 面板 */
        var py = 552;
        ctx.textAlign = 'left'; ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.fillStyle = PCOLOR[0];
        ctx.fillText('你 ¥' + Math.max(0, players[0].cash) + '（地' + (function () { var c = 0; for (i = 0; i < 16; i++) if (own[i] && own[i].o === 0) c++; return c; })() + '）', 22, py);
        ctx.textAlign = 'right';
        ctx.fillStyle = PCOLOR[1];
        ctx.fillText('电脑 ¥' + Math.max(0, players[1].cash) + '（地' + (function () { var c = 0; for (i = 0; i < 16; i++) if (own[i] && own[i].o === 1) c++; return c; })() + '）', 538, py);

        /* 日志 */
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText(logs[0] || '', 280, py + 26);
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(logs[1] || '', 280, py + 44);

        /* 骰子 */
        drawDice(206, py + 56, diceFace1, phase === 'roll');
        drawDice(310, py + 56, diceFace2, phase === 'roll');

        /* 掷骰按钮 */
        var can = canRoll();
        ctx.fillStyle = can ? '#f59e0b' : 'rgba(255,255,255,.12)';
        env.roundRect(165, 612, 230, 72, 14); ctx.fill();
        ctx.fillStyle = can ? '#1c1206' : 'rgba(255,255,255,.4)';
        ctx.font = 'bold 22px system-ui, sans-serif';
        var btn = phase === 'roll' ? '骰子滚动中…' : (cur === 1 ? '电脑行动中…' : '🎲 掷骰子');
        ctx.fillText(btn, 280, 652);
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        state: function () {
          return { phase: phase, cur: cur, round: round, dice: [d1, d2], dbl: dbl, over: over, cash: [players[0].cash, players[1].cash], pos: [players[0].pos, players[1].pos], logs: logs.slice(0, 2) };
        },
        cells: function () { return CELLS.map(function (c) { return c.t; }); },
        roll: function () { doRoll(); },
        forceDice: function (a, b) { pendingDice = [a, b]; },
        give: function (n) { players[0].cash += n; syncHud(); },
        cellPos: function (i) { var xy = cellXY(i); return { x: xy.x + CS / 2, y: xy.y + CS / 2 }; },
        props: function () { return own.map(function (o) { return o ? { o: o.o, lv: o.lv } : null; }); }
      };

      return {
        start: function () { syncHud(); },
        restart: function () { reset(); },
        destroy: function () { unbindKey(); env.canvas.removeEventListener('pointerdown', onPointer); }
      };
    }
  });
})(window);
