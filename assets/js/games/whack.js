/* ==========================================================================
   打地鼠 Whack-a-Mole —— 限时反应
   45 秒 · 金鼠高分 · 连击加成 · 点击敲打 / 键盘方格瞄准
   ========================================================================== */
(function () {
  'use strict';

  var TIME_LIMIT = 45;

  GameKit.register({
    id: 'whack',
    name: { zh: '打地鼠', en: 'Whack-a-Mole' },
    desc: { zh: '经典打地鼠：45 秒限时出手，金鼠高分、连击加成，挑战手速最高分。', en: 'Whack moles in 45 seconds. Golden moles and combos boost your score.' },
    genre: { zh: '休闲反应', en: 'Reflex' },
    icon: '🔨', hue: '#ffb020',
    logical: { w: 560, h: 640 },
    hot: false, isNew: true, sound: 'calm',
    touchControls: ['left', 'right', 'up', 'down', 'a'],
    controls: {
      keyboard: [
        { k: '← → ↑ ↓ / WASD', zh: '移动锤子', en: 'Move hammer' },
        { k: 'Enter / Space / J', zh: '挥锤敲打', en: 'Whack' }
      ],
      touch: [{ k: '点击地洞', zh: '挥锤敲打', en: 'Tap a hole to whack' }]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var COLS = 3, ROWS = 3, CELL = 150, GAP = 16;
      var GW = CELL * COLS + GAP * (COLS - 1);
      var X0 = (W - GW) / 2, Y0 = 212, R = 54;

      var moles, timeLeft, score, hits, combo, maxCombo, over, spawnT, cursor;
      var floats, prev, lastTick, unbindKey;

      function holePos(i) {
        var c = i % COLS, r = Math.floor(i / COLS);
        return { x: X0 + c * (CELL + GAP) + CELL / 2, y: Y0 + r * (CELL + GAP) + CELL / 2 };
      }

      function reset() {
        moles = []; timeLeft = TIME_LIMIT; score = 0; hits = 0;
        combo = 0; maxCombo = 0; over = false; spawnT = 0.4;
        cursor = 4; floats = []; prev = {}; lastTick = Math.ceil(timeLeft);
        env.hud({ score: 0, lives: 1, level: 1, extra: '限时 ' + TIME_LIMIT + 's' });
      }

      function progress() { return 1 - timeLeft / TIME_LIMIT; }

      function freeHole() {
        var used = {}, i;
        for (i = 0; i < moles.length; i++) if (moles[i].phase !== 'down') used[moles[i].hole] = 1;
        var pool = [];
        for (i = 0; i < COLS * ROWS; i++) if (!used[i]) pool.push(i);
        return pool.length ? pool[Math.floor(Math.random() * pool.length)] : -1;
      }

      function spawn() {
        var h = freeHole();
        if (h < 0) return;
        var stay = (1.15 - progress() * 0.5) * (0.85 + Math.random() * 0.3);
        moles.push({
          hole: h, phase: 'up', t: 0, rise: 0.12, fall: 0.16,
          stay: Math.max(0.45, stay), golden: Math.random() < 0.16,
          hit: false, pop: 0
        });
      }

      function addFloat(x, y, txt, color) {
        floats.push({ x: x, y: y, txt: txt, color: color || '#ffd166', t: 1 });
      }

      function whack(idx) {
        if (over || idx < 0) return;
        var target = null;
        for (var i = 0; i < moles.length; i++) {
          var m = moles[i];
          if (m.hole === idx && !m.hit && (m.phase === 'up' || m.phase === 'stay')) { target = m; break; }
        }
        if (!target) { combo = 0; sfx.play('block'); return; }
        target.hit = true; target.pop = 1; target.phase = 'down'; target.t = 0;
        combo++; maxCombo = Math.max(maxCombo, combo); hits++;
        var base = target.golden ? 50 : 10;
        var bonus = target.golden ? 0 : Math.min(30, (combo - 1) * 5);
        score += base + bonus;
        sfx.play(target.golden ? 'coin' : 'punch');
        var p = holePos(idx);
        addFloat(p.x, p.y - 44, '+' + (base + bonus) + (combo > 2 ? ' x' + combo : ''), target.golden ? '#ffd166' : '#ff4d9d');
        env.hud({ score: score, extra: combo > 1 ? '连击 x' + combo : '命中 ' + hits });
      }

      function timeUp() {
        over = true;
        env.gameOver({ score: score, detail: '命中 ' + hits + ' 只 · 最高连击 x' + maxCombo });
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
        var c = cursor % COLS, r = Math.floor(cursor / COLS);
        if (k === 'left') c = (c + COLS - 1) % COLS;
        else if (k === 'right') c = (c + 1) % COLS;
        else if (k === 'up') r = (r + ROWS - 1) % ROWS;
        else if (k === 'down') r = (r + 1) % ROWS;
        cursor = r * COLS + c;
      }

      function update(dt) {
        var i, f;
        for (i = floats.length - 1; i >= 0; i--) {
          f = floats[i]; f.t -= dt / 0.8; f.y -= dt * 52;
          if (f.t <= 0) floats.splice(i, 1);
        }
        for (i = moles.length - 1; i >= 0; i--) {
          var m = moles[i];
          if (m.pop > 0) m.pop = Math.max(0, m.pop - dt / 0.2);
          m.t += dt;
          if (m.phase === 'up') { if (m.t >= m.rise) { m.phase = 'stay'; m.t = 0; } }
          else if (m.phase === 'stay') { if (m.t >= m.stay) { m.phase = 'down'; m.t = 0; combo = 0; } }
          else if (m.phase === 'down') { if (m.t >= m.fall) { moles.splice(i, 1); continue; } }
        }
        if (over) return;

        var act = edge();
        if (act === 'a') whack(cursor);
        else if (act) moveCursor(act);

        var p = progress();
        spawnT -= dt;
        if (spawnT <= 0) {
          spawn();
          spawnT = Math.max(0.22, (0.95 - p * 0.45) * (0.7 + Math.random() * 0.5));
        }

        timeLeft -= dt;
        var tick = Math.max(0, Math.ceil(timeLeft));
        if (tick !== lastTick) {
          lastTick = tick;
          env.hud({ extra: '限时 ' + tick + 's' });
          if (tick <= 5 && tick > 0) sfx.play('warn');
        }
        if (timeLeft <= 0) { timeLeft = 0; timeUp(); }
      }

      function moleHeight(m) {
        if (m.phase === 'up') return m.t / m.rise;
        if (m.phase === 'stay') return 1;
        return Math.max(0, 1 - m.t / m.fall);
      }

      function drawMole(m) {
        var p = holePos(m.hole);
        var up = Math.min(1, moleHeight(m));
        if (up <= 0.02) return;
        ctx.save();
        ctx.translate(p.x, p.y + 26 - 70 * up);
        ctx.scale(1, m.hit ? 0.6 : 1);
        ctx.fillStyle = m.golden ? '#ffd166' : '#c8875a';
        if (m.golden) { ctx.shadowColor = 'rgba(255,209,102,.8)'; ctx.shadowBlur = 20; }
        ctx.beginPath(); ctx.ellipse(0, 0, R * 0.82, R * 0.72, 0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#2b1b12';
        ctx.beginPath(); ctx.ellipse(-14, -8, 4.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(14, -8, 4.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(0, 12, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(43,27,18,.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 18, 9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        if (m.golden) { ctx.fillStyle = '#fff8dc'; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.fillText('★', 0, -34); }
        ctx.restore();
      }

      function render() {
        var g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#1d1408'); g.addColorStop(1, '#2a1e10');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        for (var i = 0; i < COLS * ROWS; i++) {
          var p = holePos(i);
          ctx.fillStyle = 'rgba(0,0,0,.45)';
          ctx.beginPath(); ctx.ellipse(p.x, p.y + 10, R, R * 0.62, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(p.x, p.y + 10, R, R * 0.62, 0, 0, Math.PI * 2); ctx.stroke();
        }

        moles.forEach(drawMole);

        if (!over) {
          var cp = holePos(cursor);
          ctx.strokeStyle = 'rgba(56,225,255,.9)'; ctx.lineWidth = 3;
          ctx.shadowColor = 'rgba(56,225,255,.7)'; ctx.shadowBlur = 12;
          ctx.beginPath(); ctx.arc(cp.x, cp.y, R * 0.98, 0, Math.PI * 2); ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.font = '26px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('🔨', cp.x, cp.y - R - 14);
        }

        floats.forEach(function (f) {
          ctx.globalAlpha = Math.max(0, f.t);
          ctx.fillStyle = f.color; ctx.font = 'bold 22px system-ui';
          ctx.textAlign = 'center'; ctx.fillText(f.txt, f.x, f.y);
          ctx.globalAlpha = 1;
        });

        ctx.fillStyle = 'rgba(6,12,24,.4)'; ctx.fillRect(0, 0, W, 84);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('得分 · 命中 ' + hits, 24, 26);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Consolas, monospace';
        ctx.fillText(String(score), 24, 56);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(249,246,242,.7)'; ctx.font = '13px system-ui';
        ctx.fillText('剩余时间', W - 24, 26);
        ctx.fillStyle = timeLeft <= 10 ? '#ff5d6c' : '#ffd166';
        ctx.font = 'bold 28px Consolas, monospace';
        ctx.fillText(Math.ceil(Math.max(0, timeLeft)) + 's', W - 24, 56);

        ctx.fillStyle = 'rgba(255,255,255,.1)';
        env.roundRect(24, 92, W - 48, 8, 4); ctx.fill();
        ctx.fillStyle = timeLeft <= 10 ? '#ff5d6c' : '#ffb020';
        env.roundRect(24, 92, (W - 48) * Math.max(0, timeLeft / TIME_LIMIT), 8, 4); ctx.fill();
      }

      reset();

      // 方向键 / WASD / Space 已由 engine 映射进 pad（edge 处理），这里只补 Enter
      unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        if (e.code === 'Enter' || e.code === 'NumpadEnter') whack(cursor);
      });

      env.canvas.addEventListener('pointerdown', function (e) {
        var p = env.pointer(e);
        var best = -1, bestD = Infinity;
        for (var i = 0; i < COLS * ROWS; i++) {
          var h = holePos(i);
          var d = Math.pow(p.x - h.x, 2) + Math.pow(p.y - h.y, 2);
          if (d < bestD) { bestD = d; best = i; }
        }
        if (bestD <= Math.pow(CELL / 2 + GAP, 2)) whack(best);
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
