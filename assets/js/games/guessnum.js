/* ==========================================================================
   猜数字 Mastermind Guess Number
   不重复数字谜题 · A/B 双反馈 · 有限次数 · 数字键盘 / 键盘双输入 · 三难度
   ========================================================================== */
(function () {
  'use strict';

  var DIFF = {
    easy:   { len: 4, tries: 8, mult: 0.8,  label: '轻松' },
    normal: { len: 4, tries: 6, mult: 1.0,  label: '标准' },
    hard:   { len: 5, tries: 6, mult: 1.3,  label: '困难' }
  };

  GameKit.register({
    id: 'guessnum',
    name: { zh: '猜数字', en: 'Guess Number' },
    desc: { zh: '经典 Mastermind！破解一串不重复的神秘数字：● 表示数字和位置都对，○ 表示数字对但位置错。用最少的次数推理出答案，剩余次数越多分数越高！', en: 'Classic Mastermind! Crack the secret code: ● = right digit right place, ○ = right digit wrong place. Fewer guesses, higher score!' },
    genre: { zh: '益智解谜', en: 'Brain' },
    icon: '🔢', hue: '#0369a1',
    logical: { w: 560, h: 700 },
    plays: 5000, hot: false, isNew: true, sound: 'calm',
    script: 'assets/js/games/guessnum.js',
    ratio: 'portrait', duration: '1-4 分钟',
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

      var secret, cur, hist, left, over, finished, msg, msgT, shakeT;

      function makeSecret() {
        var pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], i, j, t;
        for (i = pool.length - 1; i > 0; i--) {
          j = Math.floor(Math.random() * (i + 1));
          t = pool[i]; pool[i] = pool[j]; pool[j] = t;
        }
        return pool.slice(0, cfg.len);
      }

      function syncHud() {
        env.hud({
          score: 0, lives: left, level: 1,
          extra: '剩余 ' + left + '/' + cfg.tries + ' 次 · ' + cfg.len + ' 位数 · ' + cfg.label
        });
      }
      function setMsg(s, bad) { msg = s; msgT = 2; if (bad) shakeT = 0.3; }

      function reset() {
        secret = makeSecret();
        cur = []; hist = []; left = cfg.tries;
        over = false; finished = false;
        msg = '输入 ' + cfg.len + ' 个不重复数字开始推理'; msgT = 3; shakeT = 0;
        syncHud();
      }

      function pushDigit(d) {
        if (over) return;
        if (cur.length >= cfg.len) { setMsg('位数已满，Enter 提交', true); return; }
        if (cur.indexOf(d) >= 0) { setMsg('数字 ' + d + ' 已经用过了', true); sfx.play('back'); return; }
        cur.push(d);
        sfx.play('click');
      }
      function popDigit() {
        if (over || cur.length === 0) return;
        cur.pop();
        sfx.play('back');
      }
      function judge(guess) {
        var a = 0, b = 0, i, k;
        for (i = 0; i < cfg.len; i++) {
          if (guess[i] === secret[i]) a++;
          else for (k = 0; k < cfg.len; k++) if (guess[i] === secret[k]) { b++; break; }
        }
        return { a: a, b: b };
      }
      function submit() {
        if (over) return;
        if (cur.length < cfg.len) { setMsg('还差 ' + (cfg.len - cur.length) + ' 位', true); return; }
        var r = judge(cur);
        hist.unshift({ n: cur.slice(), a: r.a, b: r.b });
        left--;
        if (r.a === cfg.len) {
          sfx.play('levelup');
          finish(true, cfg.tries - left + ' 次猜中');
          return;
        }
        sfx.play(r.a > 0 ? 'coin' : 'block');
        if (left <= 0) { finish(false, '次数用尽，答案是 ' + secret.join('')); return; }
        cur = [];
        setMsg('●' + r.a + ' ○' + r.b + ' —— 继续推理！');
        syncHud();
      }
      function finish(meWin, why) {
        if (finished) return;
        finished = true; over = true;
        var sc = meWin ? Math.round((left * 80 + 220) * cfg.mult) : 0;
        env.gameOver({
          win: !!meWin,
          score: sc,
          level: 1,
          extra: why
        });
      }

      /* ---- 输入：键盘 + pad 边沿 + 触屏数字键盘 ---- */
      var prevPad = {};
      var unbindKey = env.onKey(function (e) {
        var c = e.code, i;
        if (c.indexOf('Digit') === 0 || c.indexOf('Numpad') === 0) {
          var d = +c[c.length - 1];
          if (!isNaN(d)) pushDigit(d);
        } else if (c === 'Backspace') popDigit();
        else if (c === 'Enter') submit();
      });
      function onPointer(e) {
        if (over) return;
        var p = env.pointer(e);
        /* 键盘区：3 列 x 4 行，起点 (80,436) 格 130x62 间距 10 */
        var row = Math.floor((p.y - 436) / 72), col = Math.floor((p.x - 80) / 140);
        if (row < 0 || row > 3 || col < 0 || col > 2) return;
        var padMap = [
          [1, 2, 3], [4, 5, 6], [7, 8, 9], ['del', 0, 'ok']
        ];
        var v = padMap[row][col];
        if (v === 'del') popDigit();
        else if (v === 'ok') submit();
        else pushDigit(v);
      }
      env.canvas.addEventListener('pointerdown', onPointer);

      function update(dt) {
        if (env.pad.a && !prevPad.a) submit();
        if (env.pad.b && !prevPad.b) popDigit();
        prevPad = { a: env.pad.a, b: env.pad.b };
        if (msgT > 0) msgT -= dt;
        if (shakeT > 0) shakeT -= dt;
      }

      function render() {
        var i, k;
        var sx = shakeT > 0 ? Math.sin(shakeT * 60) * 5 : 0;
        ctx.fillStyle = '#0e1620'; ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        ctx.fillStyle = '#7dd3fc';
        ctx.font = 'bold 24px system-ui, sans-serif';
        ctx.fillText('🔢 猜数字 · ' + cfg.len + ' 位数', 280 + sx, 40);
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText('● = 数字对位置也对　○ = 数字对位置错', 280 + sx, 66);

        /* 当前输入 */
        var bx = 280 - cfg.len * 35 + 10 + sx;
        for (i = 0; i < cfg.len; i++) {
          var cx = bx + i * 70;
          var filled = i < cur.length;
          ctx.fillStyle = filled ? '#0ea5e9' : 'rgba(255,255,255,.06)';
          env.roundRect(cx, 92, 60, 60, 12); ctx.fill();
          if (filled) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 34px Consolas, monospace';
            ctx.fillText('' + cur[i], cx + 30, 123);
          } else {
            ctx.strokeStyle = 'rgba(125,211,252,.3)'; ctx.lineWidth = 2;
            env.roundRect(cx, 92, 60, 60, 12); ctx.stroke();
          }
        }

        /* 历史记录 */
        var hy = 196;
        var show = hist.slice(0, 5);
        if (show.length === 0) {
          ctx.fillStyle = 'rgba(255,255,255,.25)';
          ctx.font = '14px system-ui, sans-serif';
          ctx.fillText('还没有记录，先来一发！', 280 + sx, hy + 60);
        }
        for (k = 0; k < show.length; k++) {
          var h = show[k];
          ctx.fillStyle = k === 0 ? 'rgba(14,165,233,.16)' : 'rgba(255,255,255,.05)';
          env.roundRect(70 + sx, hy + k * 44, 420, 38, 9); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 20px Consolas, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(h.n.join(' '), 96 + sx, hy + k * 44 + 19);
          ctx.textAlign = 'right';
          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 15px system-ui, sans-serif';
          ctx.fillText('● ' + h.a, 380 + sx, hy + k * 44 + 19);
          ctx.fillStyle = '#fbbf24';
          ctx.fillText('○ ' + h.b, 460 + sx, hy + k * 44 + 19);
          ctx.textAlign = 'center';
        }

        /* 消息 */
        if (msgT > 0 && msg) {
          ctx.globalAlpha = Math.min(1, msgT);
          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 15px system-ui, sans-serif';
          ctx.fillText(msg, 280 + sx, hy + 5 * 44 + 8);
          ctx.globalAlpha = 1;
        }

        /* 数字键盘 */
        var padMap = [[1, 2, 3], [4, 5, 6], [7, 8, 9], ['⌫', 0, '✓']];
        for (var r = 0; r < 4; r++) {
          for (var c = 0; c < 3; c++) {
            var v = padMap[r][c];
            var kx = 80 + c * 140, ky = 436 + r * 72;
            var isOk = v === '✓', isDel = v === '⌫';
            ctx.fillStyle = isOk ? '#16a34a' : (isDel ? '#dc2626' : 'rgba(255,255,255,.1)');
            env.roundRect(kx, ky, 130, 62, 10); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = (isOk || isDel) ? 'bold 24px system-ui, sans-serif' : 'bold 26px Consolas, monospace';
            ctx.fillText('' + v, kx + 65, ky + 31);
          }
        }
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        state: function () { return { cur: cur.slice(), hist: hist.slice(0, 3), left: left, over: over }; },
        secret: function () { return secret.slice(); },
        push: function (d) { pushDigit(d); },
        del: function () { popDigit(); },
        submit: function () { submit(); }
      };

      return {
        start: function () { syncHud(); },
        restart: function () { reset(); },
        destroy: function () { unbindKey(); env.canvas.removeEventListener('pointerdown', onPointer); }
      };
    }
  });
})(window);
