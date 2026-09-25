/* ==========================================================================
   反应力测试 Reflex Test
   5 轮反应测试：红灯等待 → 绿灯亮起的瞬间点击/按空格，测出毫秒级反应。
   抢跑罚 300ms，超窗算脱靶。平均越快分越高。
   ========================================================================== */
(function () {
  'use strict';

  var ROUNDS = 5;
  var WINDOW = { easy: 1200, normal: 900, hard: 650 };

  GameKit.register({
    id: 'reflex',
    name: { zh: '反应力测试', en: 'Reflex Test' },
    desc: { zh: '红灯转绿的瞬间，用最快的速度点击或按空格！5 轮测试取平均，抢跑会被罚 0.3 秒。看看你的反应是猎豹级还是树懒级！', en: 'Tap or press Space the instant red turns green! 5 rounds, false starts cost 0.3s. Are you cheetah-fast or sloth-slow?' },
    genre: { zh: '休闲益智', en: 'Casual' },
    icon: '⚡', hue: '#16a34a',
    tags: [{ zh: '反应', en: 'Reflex' }, { zh: '竞速', en: 'Speed' }],
    plays: 5000, hot: false, isNew: true, sound: 'menu',
    script: 'assets/js/games/reflex.js',
    ratio: 'portrait', duration: '1 分钟',
    touchControls: ['a', 'b'],
    logical: { w: 560, h: 700 },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty && WINDOW[gc.difficulty]) diff = gc.difficulty;
      } catch (e) { }
      var WIN = WINDOW[diff] || 900;

      var state, round, times, waitT, goT, doneT, ms, fouls, over, flashT, gen, lastPress;

      function reset() {
        state = 'ready'; round = 0; times = []; waitT = 0; goT = 0; doneT = 0;
        ms = 0; fouls = 0; over = false; flashT = 0; gen = (gen || 0) + 1; lastPress = 0;
        syncHud();
      }

      function avg() {
        if (!times.length) return 0;
        var s = 0;
        for (var i = 0; i < times.length; i++) s += times[i];
        return Math.round(s / times.length);
      }

      function syncHud() {
        env.hud({ score: state === 'over' ? total() : times.length ? Math.max(0, 900 - avg()) * times.length : 0, lives: ROUNDS - round, level: round + 1, extra: (diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通') + ' · 上次 ' + (ms || '--') + 'ms' });
      }

      function total() {
        var s = 0;
        for (var i = 0; i < times.length; i++) s += Math.max(0, 900 - times[i]);
        return s;
      }

      function beginWait() {
        state = 'wait';
        waitT = 1.2 + Math.random() * 2.2;
      }

      function press() {
        var now = performance.now();
        if (now - lastPress < 150) return;   /* 去重：onKey 与 pad 边沿同源触发 */
        lastPress = now;
        if (over) return;
        if (state === 'ready') { beginWait(); sfx.play('select'); syncHud(); return; }
        if (state === 'wait') {
          /* 抢跑 */
          fouls++;
          flashT = 0.35;
          sfx.play('explosion');
          beginWait();
          return;
        }
        if (state === 'go') {
          ms = Math.round((WIN - goT));
          times.push(ms);
          sfx.play('coin');
          state = 'done'; doneT = 0.95;
          syncHud();
        }
      }

      function update(dt) {
        var i;
        if (flashT > 0) flashT -= dt;
        if (over) return;
        if (state === 'wait') {
          waitT -= dt;
          if (waitT <= 0) { state = 'go'; goT = WIN / 1000; sfx.play('pick'); }
        } else if (state === 'go') {
          goT -= dt;
          if (goT <= 0) {
            /* 脱靶 */
            ms = WIN + 500;
            times.push(ms);
            fouls++;
            flashT = 0.35;
            sfx.play('explosion');
            state = 'done'; doneT = 0.95;
            syncHud();
          }
        } else if (state === 'done') {
          doneT -= dt;
          if (doneT <= 0) {
            round++;
            ms = 0;
            if (round >= ROUNDS) {
              over = true; state = 'over';
              syncHud();
              sfx.play('explosion');
              env.gameOver({ score: total(), detail: '平均 ' + avg() + 'ms · 抢跑/脱靶 ' + fouls + ' 次' });
            } else {
              beginWait();
              syncHud();
            }
          }
        }
        /* pad 边沿（A/B）→ press；onKey Space 已直触发，靠 lastPress 去重 */
        if ((env.pad.a || env.pad.b) && !env.canvas.__prevPadA) press();
        env.canvas.__prevPadA = !!(env.pad.a || env.pad.b);
      }

      function render() {
        var i;
        var bg = '#0f172a';
        if (state === 'go') bg = '#14532d';
        if (state === 'wait') bg = '#450a0a';
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        if (flashT > 0) {
          ctx.fillStyle = 'rgba(248,113,113,' + (flashT * 0.9) + ')';
          ctx.fillRect(0, 0, W, H);
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        /* 大圆信号灯 */
        var cx = W / 2, cy = 290, r = 120;
        var col = state === 'go' ? '#22c55e' : state === 'wait' ? '#ef4444' : '#475569';
        if (state === 'go') {
          r = 120 + Math.sin(performance.now() / 60) * 4;
        }
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.35, r * 0.28, 0, Math.PI * 2); ctx.fill();
        /* 状态文字 */
        ctx.font = 'bold 30px system-ui';
        if (state === 'ready') {
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText('准备好了吗?', cx, cy);
          ctx.font = '16px system-ui'; ctx.fillStyle = '#94a3b8';
          ctx.fillText('点击 / 空格开始第 ' + (round + 1) + ' 轮', cx, cy + 44);
        } else if (state === 'wait') {
          ctx.fillStyle = '#fecaca';
          ctx.fillText('等待…', cx, cy);
          ctx.font = '15px system-ui'; ctx.fillStyle = 'rgba(254,202,202,.8)';
          ctx.fillText('变绿前点击 = 抢跑罚 300ms', cx, cy + 44);
        } else if (state === 'go') {
          ctx.fillStyle = '#bbf7d0';
          ctx.fillText('现在!', cx, cy);
        } else if (state === 'done') {
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(ms + ' ms', cx, cy);
          ctx.font = '16px system-ui';
          ctx.fillStyle = ms <= 250 ? '#4ade80' : ms <= 400 ? '#fde047' : '#f87171';
          ctx.fillText(ms <= 250 ? '猎豹级!' : ms <= 400 ? '反应不错' : ms > WIN ? '脱靶…' : '还可以更快', cx, cy + 44);
        } else {
          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 40px system-ui';
          ctx.fillText('测试完成', cx, cy - 26);
          ctx.font = 'bold 30px Consolas, monospace';
          ctx.fillStyle = '#fff';
          ctx.fillText('平均 ' + avg() + ' ms', cx, cy + 24);
        }
        /* 顶部轮次与历史 */
        ctx.textAlign = 'left'; ctx.font = '14px system-ui'; ctx.fillStyle = 'rgba(226,232,240,.85)';
        ctx.fillText('第 ' + Math.min(round + 1, ROUNDS) + ' / ' + ROUNDS + ' 轮 · 窗口 ' + WIN + 'ms', 24, 36);
        ctx.font = '13px system-ui'; ctx.fillStyle = '#94a3b8';
        for (i = 0; i < times.length; i++) {
          ctx.fillText('R' + (i + 1) + ': ' + times[i] + 'ms', 24, 62 + i * 20);
        }
        ctx.textAlign = 'right';
        ctx.fillStyle = fouls ? '#f87171' : '#64748b';
        ctx.fillText('抢跑/脱靶 ' + fouls, W - 24, 36);
      }

      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down') return;
        if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); press(); }
      });
      env.canvas.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        press();
      });

      reset();
      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        state: function () { return { state: state, round: round, times: times.slice(), fouls: fouls, over: over, avg: avg(), win: WIN }; },
        press: function () { lastPress = 0; press(); }
      };

      return {
        start: function () { sfx.play('start'); syncHud(); },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; delete env.canvas.__prevPadA; }
      };
    }
  });
})();
