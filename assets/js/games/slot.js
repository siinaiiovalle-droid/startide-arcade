/* ==========================================================================
   老虎机（积分制） Lucky Slots
   三轴卷轴 · 加权概率 · 三同/两同赔付 · 筹码可调注 · 达标兑现 · 破产结算 · 三难度
   ========================================================================== */
(function () {
  'use strict';

  var SYMS = ['🍒', '🍋', '🔔', '💎', '⭐', '7️⃣'];
  var MULT = [4, 6, 10, 20, 35, 80];
  var WEIGHT = [22, 18, 14, 9, 6, 3];
  var BETS = [50, 100, 200];
  var DIFF = {
    easy:   { start: 1500, cashout: 1300, mult: 0.9,  label: '轻松' },
    normal: { start: 1000, cashout: 1500, mult: 1.0,  label: '标准' },
    hard:   { start: 700,  cashout: 1800, mult: 1.15, label: '困难' }
  };

  GameKit.register({
    id: 'slot',
    name: { zh: '幸运老虎机', en: 'Lucky Slots' },
    desc: { zh: '拉下摇杆，转出好运气！三个 7️⃣ 独得 80 倍大奖，两同也有安慰奖。筹码达标就可以见好就收，破产则血本无归——赌场里最难的永远是收手！', en: 'Pull the lever and spin your luck! Triple 7s pay 80x. Cash out when chips stack high — knowing when to stop is the real game!' },
    genre: { zh: '休闲博弈', en: 'Casino' },
    icon: '🎰', hue: '#a21caf',
    logical: { w: 560, h: 700 },
    plays: 5000, hot: false, isNew: true, sound: 'battle',
    script: 'assets/js/games/slot.js',
    ratio: 'portrait', duration: '1-3 分钟',
    touchControls: ['up', 'down', 'a'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!DIFF[diff]) diff = 'normal';
      var cfg = DIFF[diff];

      var WX = 40, WY = 120, CW = 150, CH = 180; /* 卷轴窗口：3 列 150x180 */

      var cash, betI, phase, spinT, res, disp, stops, winAmt, spins, best, over, finished, msgT, msg, settleT, flipT;

      function syncHud() {
        env.hud({ score: Math.max(0, cash), lives: 0, level: 1, extra: '押注 ' + BETS[betI] + ' · ' + cfg.label });
      }
      function setMsg(s) { msg = s; msgT = 2.2; }

      function pickSym() {
        var total = 0, i;
        for (i = 0; i < WEIGHT.length; i++) total += WEIGHT[i];
        var r = Math.random() * total;
        for (i = 0; i < WEIGHT.length; i++) { r -= WEIGHT[i]; if (r < 0) return i; }
        return 0;
      }

      function reset() {
        cash = cfg.start; betI = 1; phase = 'idle'; spinT = 0; settleT = 0;
        res = [0, 0, 0]; disp = [0, 0, 0]; stops = [true, true, true];
        winAmt = 0; spins = 0; over = false; finished = false;
        msg = ''; msgT = 0; flipT = 0; best = 0;
        syncHud();
      }

      function canSpin() { return !over && phase === 'idle' && cash >= BETS[betI]; }
      function canCashout() { return !over && phase === 'idle' && cash >= cfg.cashout; }

      function doSpin() {
        if (over || phase !== 'idle') return;
        if (cash < BETS[betI]) {
          /* 自动降到可负担的最高档位 */
          var i = BETS.length - 1;
          while (i > 0 && BETS[i] > cash) i--;
          if (BETS[i] <= cash) { betI = i; syncHud(); }
          else { setMsg('筹码不足'); return; }
        }
        cash -= BETS[betI];
        spins++;
        res = [pickSym(), pickSym(), pickSym()];
        stops = [false, false, false];
        phase = 'spin'; spinT = 0;
        sfx.play('rotate');
        syncHud();
      }
      function doBet(d) {
        if (over || phase !== 'idle') return;
        betI = Math.max(0, Math.min(BETS.length - 1, betI + d));
        sfx.play('click');
        syncHud();
      }
      function doCashout() {
        if (!canCashout()) { setMsg('筹码未达 ' + cfg.cashout + '，不能兑现'); return; }
        finish(true, '见好就收');
      }

      function settle() {
        var s = [res[0], res[1], res[2]];
        var bet = BETS[betI];
        winAmt = 0;
        if (s[0] === s[1] && s[1] === s[2]) {
          winAmt = MULT[s[0]] * bet;
          setMsg(s[0] === 5 ? '🏆 头奖 7️⃣7️⃣7️⃣！+' + winAmt : '🎉 三连 ' + SYMS[s[0]] + '！+' + winAmt);
          sfx.play('levelup');
        } else if (s[0] === s[1] || s[1] === s[2] || s[0] === s[2]) {
          winAmt = 2 * bet;
          setMsg('两同小奖 +' + winAmt);
          sfx.play('coin');
        } else if (s[0] === 5 || s[1] === 5 || s[2] === 5) {
          winAmt = bet;
          setMsg('7️⃣ 光顾 +' + winAmt);
          sfx.play('coinDrop');
        } else {
          setMsg('本局未中，再接再厉');
        }
        if (winAmt > 0) {
          cash += winAmt;
          if (winAmt > best) best = winAmt;
          syncHud();
        }
        phase = 'settle'; settleT = 0.7;
      }

      function finish(meWin, why) {
        if (finished) return;
        finished = true; over = true;
        env.gameOver({
          win: !!meWin,
          score: Math.round(cash * (meWin ? 1 : 0.5) * cfg.mult),
          level: 1,
          extra: why + ' · 结余 ' + cash
        });
      }

      /* ---- 输入：键盘 + pad 边沿 + 触屏 ---- */
      var prevPad = {};
      var unbindKey = env.onKey(function (e) {
        if (e.code === 'Enter') doCashout();
      });
      function onPointer(e) {
        if (over) return;
        var p = env.pointer(e);
        if (p.y > 452 && p.y < 532 && p.x > 165 && p.x < 395) doSpin();
        else if (p.y > 340 && p.y < 420) {
          if (p.x > 130 && p.x < 210) doBet(-1);
          else if (p.x > 350 && p.x < 430) doBet(1);
        } else if (canCashout() && p.y > 552 && p.y < 616 && p.x > 170 && p.x < 390) doCashout();
      }
      env.canvas.addEventListener('pointerdown', onPointer);

      function update(dt) {
        if (env.pad.a && !prevPad.a) doSpin();
        if (env.pad.up && !prevPad.up) doBet(1);
        if (env.pad.down && !prevPad.down) doBet(-1);
        prevPad = { a: env.pad.a, up: env.pad.up, down: env.pad.down };

        if (msgT > 0) msgT -= dt;

        if (phase === 'spin') {
          spinT += dt;
          var stopAt = [0.8, 1.2, 1.6];
          for (var c = 0; c < 3; c++) {
            if (!stops[c]) {
              flipT -= dt;
              if (flipT <= 0) { flipT = 0.055; disp[c] = Math.floor(Math.random() * 6); }
              if (spinT >= stopAt[c]) {
                stops[c] = true; disp[c] = res[c];
                sfx.play('block');
              }
            }
          }
          if (stops[0] && stops[1] && stops[2]) settle();
        } else if (phase === 'settle') {
          settleT -= dt;
          if (settleT <= 0) {
            if (cash < BETS[0]) { finish(cash >= cfg.start * 0.9, '筹码耗尽'); return; }
            phase = 'idle';
          }
        }
        if (phase === 'idle' && !over && cash < BETS[0]) finish(false, '筹码耗尽');
      }

      function drawCol(ci) {
        var x = WX + ci * (CW + 10);
        ctx.fillStyle = '#1a1226';
        ctx.fillRect(x, WY, CW, CH);
        var base = disp[ci];
        for (var r = -1; r <= 1; r++) {
          var idx = (base + r + 6) % 6;
          var cy = WY + CH / 2 + r * 60;
          var alpha = r === 0 ? 1 : 0.45;
          ctx.globalAlpha = alpha;
          ctx.font = '40px system-ui, "Segoe UI Emoji", sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fff';
          ctx.fillText(SYMS[idx], x + CW / 2, cy);
          ctx.globalAlpha = 1;
        }
        if (stops[ci] && phase !== 'idle') {
          ctx.strokeStyle = 'rgba(216,180,254,.55)'; ctx.lineWidth = 2;
          ctx.strokeRect(x + 3, WY + CH / 2 - 30, CW - 6, 60);
        }
      }

      function render() {
        ctx.fillStyle = '#120b1c'; ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        /* 顶栏 */
        ctx.fillStyle = '#d8b4fe';
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.fillText('🎰 幸运老虎机', 280, 46);
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.fillText('筹码 ¥' + cash, 280, 82);
        if (canCashout()) {
          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 14px system-ui, sans-serif';
          ctx.fillText('已达标！Enter 或点下方按钮兑现', 280, 104);
        }

        /* 卷轴窗框 */
        ctx.fillStyle = '#3b1f5e';
        env.roundRect(WX - 12, WY - 12, CW * 3 + 20 + 24, CH + 24, 14); ctx.fill();
        for (var c = 0; c < 3; c++) drawCol(c);
        /* 中线 */
        ctx.strokeStyle = 'rgba(251,191,36,.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(WX - 6, WY + CH / 2); ctx.lineTo(WX + CW * 3 + 18, WY + CH / 2); ctx.stroke();

        /* 赔付表 */
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.font = '12px system-ui, sans-serif';
        var pay = '';
        for (var i = 0; i < 6; i++) pay += SYMS[i] + '×' + MULT[i] + '  ';
        ctx.fillText(pay, 280, 324);
        ctx.fillText('两同 ×2 · 含 7️⃣ ×1 · 单线中列判定', 280, 342);

        /* 押注 */
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.fillText('押注', 280, 362);
        ctx.fillStyle = '#7c3aed';
        env.roundRect(130, 378, 80, 42, 10); ctx.fill();
        env.roundRect(350, 378, 80, 42, 10); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillText('◀', 170, 399); ctx.fillText('▶', 390, 399);
        ctx.fillStyle = '#fbbf24';
        env.roundRect(220, 378, 120, 42, 10); ctx.fill();
        ctx.fillStyle = '#1c0a2e';
        ctx.fillText('¥' + BETS[betI], 280, 399);

        /* SPIN 按钮 */
        var can = canSpin();
        ctx.fillStyle = can ? '#a21caf' : 'rgba(255,255,255,.12)';
        env.roundRect(165, 452, 230, 80, 16); ctx.fill();
        ctx.fillStyle = can ? '#fff' : 'rgba(255,255,255,.35)';
        ctx.font = 'bold 26px system-ui, sans-serif';
        ctx.fillText(phase === 'spin' ? '转动中…' : 'SPIN!', 280, 486);
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(can ? '空格 / 点击 / 手柄 A' : (phase === 'spin' ? '' : '筹码不足'), 280, 514);

        /* 兑现按钮 */
        if (canCashout()) {
          ctx.fillStyle = '#16a34a';
          env.roundRect(170, 552, 220, 64, 14); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 20px system-ui, sans-serif';
          ctx.fillText('💰 兑现离场 ' + cash, 280, 584);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,.35)';
          ctx.font = '13px system-ui, sans-serif';
          ctx.fillText('攒到 ¥' + cfg.cashout + ' 可兑现离场 · 破产即结束', 280, 584);
        }

        /* 结果消息 */
        if (msgT > 0 && msg) {
          ctx.globalAlpha = Math.min(1, msgT);
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 17px system-ui, sans-serif';
          ctx.fillText(msg, 280, 652);
          ctx.globalAlpha = 1;
        }
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        state: function () { return { phase: phase, cash: cash, bet: BETS[betI], res: res, stops: stops.slice(), winAmt: winAmt, spins: spins, over: over, cashout: cfg.cashout }; },
        spin: function () { doSpin(); },
        setBet: function (d) { doBet(d); },
        give: function (n) { cash += n; syncHud(); },
        cashout: function () { doCashout(); }
      };

      return {
        start: function () { syncHud(); },
        restart: function () { reset(); },
        destroy: function () { unbindKey(); env.canvas.removeEventListener('pointerdown', onPointer); }
      };
    }
  });
})(window);
