/* ==========================================================================
   乒乓对决 Pong
   竖屏桨球对战 · 玩家 vs AI · 先得 7 分 · 击球位置变角 · 球速递增
   输入：手柄/键盘左右 + 触屏拖动 · 三难度（AI 反应/球速）
   ========================================================================== */
(function () {
  'use strict';

  var DIFF = {
    easy:   { ball: 330, ai: 240, aim: 0.75, mult: 0.8,  label: '轻松' },
    normal: { ball: 400, ai: 330, aim: 0.85, mult: 1.0,  label: '标准' },
    hard:   { ball: 470, ai: 430, aim: 0.95, mult: 1.3,  label: '困难' }
  };
  var WIN_PT = 7, ACC = 1.045, MAX_V = 760;

  GameKit.register({
    id: 'pong',
    name: { zh: '乒乓对决', en: 'Pong' },
    desc: { zh: '最古老的电子游戏对决！控制底部球拍，用击球点控制回球角度，球速会越来越快。先得 7 分者获胜——AI 可不会手下留情！', en: 'The classic duel! Control the bottom paddle, use the hit point to angle your returns as the ball speeds up. First to 7 points wins!' },
    genre: { zh: '街机竞技', en: 'Arcade' },
    icon: '🏓', hue: '#0f766e',
    tags: [{ zh: '对战', en: 'Versus' }, { zh: '街机', en: 'Arcade' }],
    plays: 5000, hot: false, isNew: true, sound: 'crisp',
    script: 'assets/js/games/pong.js',
    ratio: 'portrait', duration: '1-3 分钟',
    logical: { w: 560, h: 700 },
    touchControls: ['left', 'right'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!DIFF[diff]) diff = 'normal';
      var cfg = DIFF[diff];

      var PW = 112, PH = 14, BR = 9;
      var px, ax, ball, ps, as, pts, serveT, over, finished, msg, msgT, aiErr, dragging, touchX;

      function reset() {
        px = W / 2; ax = W / 2;
        ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, sp: cfg.ball };
        ps = 0; as = 0; pts = 0;
        serveT = 1.2; over = false; finished = false;
        msg = '先得 ' + WIN_PT + ' 分获胜 · ' + cfg.label + '难度'; msgT = 2.5; aiErr = 0;
        dragging = false; touchX = 0;
        syncHud();
      }
      function syncHud() {
        env.hud({
          score: pts * 100, lives: ps, level: 1,
          extra: '比分 ' + ps + ' : ' + as + ' · 先到 ' + WIN_PT + ' · ' + cfg.label
        });
      }

      function serve(toBottom) {
        ball.sp = cfg.ball;
        var ang = (Math.random() * 0.5 - 0.25);
        ball.vx = Math.sin(ang) * ball.sp * 0.8;
        ball.vy = (toBottom ? 1 : -1) * ball.sp * 0.85;
        ball.x = W / 2 + (Math.random() * 160 - 80);
        ball.y = H / 2;
        aiErr = (Math.random() * 80 - 40) * (2 - cfg.aim);
      }
      function paddleHit(cx, isPlayer) {
        var off = (ball.x - cx) / (PW / 2);           /* -1..1 击球点 */
        off = Math.max(-1, Math.min(1, off));
        ball.sp = Math.min(MAX_V, ball.sp * ACC);
        var speed = ball.sp;
        var ang = off * 1.05;
        ball.vx = Math.sin(ang) * speed * 0.82;
        ball.vy = (isPlayer ? -1 : 1) * Math.cos(ang) * speed;
        ball.y = isPlayer ? H - 60 - PH / 2 - BR : 60 + PH / 2 + BR;
        sfx.play('hit');
        if (isPlayer) aiErr = (Math.random() * 90 - 45) * (2 - cfg.aim);
      }
      function point(playerScored) {
        if (playerScored) {
          ps++; pts++;
          sfx.play('levelup');
          msg = '好球！' + ps + ' : ' + as; msgT = 1.5;
        } else {
          as++;
          sfx.play('explosion');
          msg = '失分 ' + ps + ' : ' + as; msgT = 1.5;
        }
        syncHud();
        if (ps >= WIN_PT || as >= WIN_PT) {
          finish(ps >= WIN_PT);
          return;
        }
        serveT = 1.1;
        ball.vx = 0; ball.vy = 0;
        ball.x = W / 2; ball.y = H / 2;
      }
      function finish(meWin) {
        if (finished) return;
        finished = true; over = true;
        var sc = Math.round((pts * 100 + (meWin ? 300 : 0)) * cfg.mult);
        env.gameOver({
          win: !!meWin,
          score: sc,
          level: 1,
          extra: '最终比分 ' + ps + ' : ' + as
        });
      }

      /* ---- 输入 ---- */
      var unbindKey = env.onKey(function () { });
      function onDown(e) { dragging = true; touchX = env.pointer(e).x; }
      function onMove(e) { if (dragging) touchX = env.pointer(e).x; }
      function onUp() { dragging = false; }
      env.canvas.addEventListener('pointerdown', onDown);
      env.canvas.addEventListener('pointermove', onMove);
      env.canvas.addEventListener('pointerup', onUp);
      env.canvas.addEventListener('pointercancel', onUp);

      function update(dt) {
        if (over) return;
        var i;
        /* 玩家桨：手柄/键盘 连续移动 或 触屏拖动 */
        if (dragging) {
          px += (touchX - px) * Math.min(1, dt * 14);
        }
        if (env.pad.left) px -= 480 * dt;
        if (env.pad.right) px += 480 * dt;
        px = Math.max(PW / 2 + 8, Math.min(W - PW / 2 - 8, px));

        if (serveT > 0) {
          serveT -= dt;
          if (serveT <= 0) serve(as > ps || as === ps ? Math.random() < 0.5 : as > ps);
          if (msgT > 0) msgT -= dt;
          return;
        }

        /* AI 桨 */
        var target = (ball.vy < 0) ? ball.x + aiErr : W / 2;
        var dx = target - ax;
        var vmax = cfg.ai * dt;
        ax += Math.max(-vmax, Math.min(vmax, dx));
        ax = Math.max(PW / 2 + 8, Math.min(W - PW / 2 - 8, ax));

        /* 球 */
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        if (ball.x < BR) { ball.x = BR; ball.vx = Math.abs(ball.vx); sfx.play('block'); }
        if (ball.x > W - BR) { ball.x = W - BR; ball.vx = -Math.abs(ball.vx); sfx.play('block'); }

        if (ball.vy > 0 && ball.y + BR >= H - 60 - PH / 2 && ball.y - BR < H - 60 + PH / 2) {
          if (ball.x > px - PW / 2 - BR && ball.x < px + PW / 2 + BR) paddleHit(px, true);
        }
        if (ball.vy < 0 && ball.y - BR <= 60 + PH / 2 && ball.y + BR > 60 - PH / 2) {
          if (ball.x > ax - PW / 2 - BR && ball.x < ax + PW / 2 + BR) paddleHit(ax, false);
        }
        if (ball.y > H + 30) point(false);
        else if (ball.y < -30) point(true);

        if (msgT > 0) msgT -= dt;
      }

      function render() {
        var i;
        ctx.fillStyle = '#0d1b1e'; ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        /* 球场装饰 */
        ctx.strokeStyle = 'rgba(45,212,191,.25)'; ctx.lineWidth = 2;
        ctx.setLineDash([10, 12]);
        ctx.beginPath(); ctx.moveTo(20, H / 2); ctx.lineTo(W - 20, H / 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeRect(10, 40, W - 20, H - 80);

        /* 比分 */
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.font = 'bold 34px Consolas, monospace';
        ctx.fillText(as + '   :   ' + ps, W / 2, 100);
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText('电脑 ' + cfg.label, W / 2, 30);
        ctx.fillText('你', W / 2, H - 16);

        /* 桨 */
        ctx.fillStyle = '#2dd4bf';
        env.roundRect(px - PW / 2, H - 60 - PH / 2, PW, PH, 7); ctx.fill();
        ctx.fillStyle = '#f87171';
        env.roundRect(ax - PW / 2, 60 - PH / 2, PW, PH, 7); ctx.fill();

        /* 球 / 发球倒计时 */
        if (serveT > 0) {
          ctx.fillStyle = 'rgba(255,255,255,.8)';
          ctx.font = 'bold 26px system-ui, sans-serif';
          ctx.fillText(Math.ceil(serveT) + '', W / 2, H / 2 - 40);
          ctx.fillStyle = 'rgba(251,191,36,.9)';
          ctx.font = 'bold 15px system-ui, sans-serif';
          if (msgT > 0 && msg) ctx.fillText(msg, W / 2, H / 2 + 8);
        } else {
          ctx.fillStyle = '#fde047';
          ctx.beginPath(); ctx.arc(ball.x, ball.y, BR, 0, Math.PI * 2); ctx.fill();
          /* 拖尾 */
          ctx.fillStyle = 'rgba(253,224,71,.25)';
          ctx.beginPath(); ctx.arc(ball.x - ball.vx * 0.014, ball.y - ball.vy * 0.014, BR * 0.7, 0, Math.PI * 2); ctx.fill();
        }
        if (msgT > 0 && msg && serveT <= 0) {
          ctx.globalAlpha = Math.min(1, msgT);
          ctx.fillStyle = 'rgba(255,255,255,.9)';
          ctx.font = 'bold 18px system-ui, sans-serif';
          ctx.fillText(msg, W / 2, 140);
          ctx.globalAlpha = 1;
        }
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        state: function () {
          return { px: px, ax: ax, ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy }, ps: ps, as: as, pts: pts, serveT: serveT, over: over, phase: over ? 'over' : (serveT > 0 ? 'serve' : 'play') };
        },
        setBall: function (x, y, vx, vy) { ball.x = x; ball.y = y; ball.vx = vx; ball.vy = vy; serveT = 0; },
        setPad: function (x) { px = x; },
        serve: function (toBottom) { serveT = 0; serve(!!toBottom); }
      };

      return {
        start: function () { syncHud(); },
        restart: function () { reset(); },
        destroy: function () {
          unbindKey();
          env.canvas.removeEventListener('pointerdown', onDown);
          env.canvas.removeEventListener('pointermove', onMove);
          env.canvas.removeEventListener('pointerup', onUp);
          env.canvas.removeEventListener('pointercancel', onUp);
        }
      };
    }
  });
})(window);
