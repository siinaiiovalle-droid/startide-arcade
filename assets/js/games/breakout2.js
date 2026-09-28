/* ==========================================================================
   霓虹打砖块 2 Neon Breaker 2 —— 续作（道具加强版）
   3 关通关制 · 图案化砖阵 · 爆炸砖链爆 · 激光炮 / 磁力底座 新道具
   原版《霓虹打砖块》保留为独立游戏，本作在其玩法上加料
   ========================================================================== */
(function () {
  'use strict';

  GameKit.register({
    id: 'breakout2',
    name: { zh: '霓虹打砖块 2', en: 'Neon Breaker 2' },
    desc: { zh: '打砖块完全体：3 关通关制、爆炸砖链式爆破、激光炮与磁力底座两大新道具！', en: 'Ultimate brick breaker: 3-level campaign, chain-explosion bricks, plus new Laser and Magnet power-ups!' },
    genre: { zh: '休闲益智', en: 'Casual' },
    icon: '🧨', hue: '#ff5c6c',
    logical: { w: 720, h: 540 },
    hot: false, isNew: true, sound: 'menu',
    touchControls: ['left', 'right', 'a'],
    controls: {
      keyboard: [
        { k: '← → / A D', zh: '移动挡板', en: 'Move paddle' },
        { k: '空格 / K', zh: '发射小球 / 激光', en: 'Launch / Fire laser' },
        { k: '鼠标 / 触屏', zh: '直接拖动挡板', en: 'Drag paddle' }
      ],
      touch: [
        { k: '拖动屏幕', zh: '移动挡板', en: 'Drag paddle' },
        { k: 'A', zh: '发射 / 激光', en: 'Launch / Laser' }
      ]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;

      var DIFF = {
        easy: { ball: 300, mult: 0.8, label: '轻松' },
        normal: { ball: 350, mult: 1.0, label: '标准' },
        hard: { ball: 400, mult: 1.3, label: '困难' }
      };
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!DIFF[diff]) diff = 'normal';
      var cfg = DIFF[diff];

      var COLS = 11, BW = 58, BH = 24, GAP = 4, TOP = 74, LEFT = (720 - (COLS * (BW + GAP) - GAP)) / 2;
      var COLORS = ['#ff4d9d', '#ffb020', '#2ee6a8', '#38e1ff', '#7a5cff', '#ff5c6c'];

      var paddle, balls, bricks, drops, beams, parts, score, lives, level, launched, shake, tAcc, state, winT, over, combo;
      var laserT, magnetT, mult, prevA, pointerActive, pointerX;

      function mkBall(x, y, spd, ang) {
        var a = ang === undefined ? -Math.PI / 2 + (Math.random() - 0.5) * 0.7 : ang;
        return { x: x, y: y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 7, stuck: false, trail: [] };
      }

      /* ---------- 三关图案化砖阵 ---------- */
      function put(g, c, r, hp, bomb) {
        bricks.push({
          x: LEFT + c * (BW + GAP), y: TOP + r * (BH + GAP), w: BW, h: BH,
          hp: hp, maxhp: hp, c: COLORS[(r + (g || 0)) % COLORS.length], flash: 0, bomb: !!bomb
        });
      }
      function buildLevel(n) {
        bricks = [];
        var r, c;
        if (n === 1) {
          /* 标准阵 + 四角炸弹 */
          for (r = 0; r < 6; r++) for (c = 0; c < COLS; c++) {
            var hp = r < 2 ? 2 : 1;
            put(0, r, c, hp, (r === 0 && (c === 2 || c === 8)));
          }
          put(0, 2, 5, 1, true);
        } else if (n === 2) {
          /* 金字塔 */
          var rows = 7;
          for (r = 0; r < rows; r++) {
            var half = r + 2;
            for (c = COLS / 2 - half; c <= COLS / 2 - 1 + half; c++) {
              if (c < 0 || c >= COLS) continue;
              put(2, r, c, r < 2 ? 2 : 1, r === 3 && c === 5);
            }
          }
          for (c = 1; c < COLS - 1; c += 3) put(2, 7, c, 1, c === 4);
        } else {
          /* 终局棋盘：厚砖 + 密集炸弹 */
          for (r = 0; r < 8; r++) for (c = 0; c < COLS; c++) {
            if ((r + c) % 2 === 1 && r > 1) continue;
            put(4, r, c, r < 2 ? 3 : (r < 5 ? 2 : 1), r < 4 && (r + c) % 3 === 0);
          }
        }
      }

      function reset(full) {
        if (full) { score = 0; lives = 3; level = 1; }
        paddle = { x: W / 2, y: H - 46, w: 118, h: 14, targetW: 118 };
        balls = [mkBall(W / 2, H - 60, cfg.ball)];
        balls[0].stuck = true;
        bricks = []; drops = []; beams = []; parts = [];
        launched = false; shake = 0; tAcc = 0; state = 'play'; winT = 0; over = false; combo = 0;
        laserT = 0; magnetT = 0;
        buildLevel(level);
        env.hud({ score: score, lives: lives, level: level, extra: cfg.label });
      }

      function spawnDrop(x, y) {
        var r = Math.random();
        if (r > 0.22) return;
        var kinds = ['wide', 'multi', 'slow', 'laser', 'magnet', 'laser'];
        var kind = kinds[Math.floor(Math.random() * kinds.length)];
        drops.push({ x: x, y: y, vy: 170, kind: kind, r: 14, t: 0 });
      }

      function burst(x, y, c, n) {
        for (var i = 0; i < n; i++) {
          var a = Math.random() * 6.283, s = 60 + Math.random() * 220;
          parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.4, c: c, s: 2 + Math.random() * 4 });
        }
      }

      /* 爆炸砖：3×3 链式爆破（队列防递归爆炸） */
      function explode(startIdx) {
        var queue = [bricks[startIdx]];
        bricks.splice(startIdx, 1);
        var guard = 0;
        while (queue.length && guard++ < 64) {
          var b = queue.shift();
          score += 80;
          burst(b.x + b.w / 2, b.y + b.h / 2, '#ffb020', 16);
          shake = Math.max(shake, 9);
          for (var i = bricks.length - 1; i >= 0; i--) {
            var nb = bricks[i];
            if (Math.abs(nb.x - b.x) <= BW + GAP && Math.abs(nb.y - b.y) <= BH + GAP) {
              if (nb.bomb) { bricks.splice(i, 1); queue.push(nb); }
              else { bricks.splice(i, 1); score += 50; burst(nb.x + nb.w / 2, nb.y + nb.h / 2, nb.c, 8); }
            }
          }
        }
        sfx.play('explosion');
      }

      function hitBrick(b, i) {
        b.hp--; b.flash = 0.12;
        if (b.hp <= 0) {
          if (b.bomb) { explode(i); combo += 2; }
          else {
            bricks.splice(i, 1);
            combo++;
            score += 50 + Math.min(200, combo * 10);
            sfx.play('brick');
            burst(b.x + b.w / 2, b.y + b.h / 2, b.c, 10);
            spawnDrop(b.x + b.w / 2, b.y + b.h / 2);
          }
        } else {
          sfx.play('block');
          burst(b.x + b.w / 2, b.y + b.h / 2, b.c, 4);
        }
        shake = Math.max(shake, 3);
      }

      function loseLife() {
        lives--; sfx.play('gameover'); shake = 14;
        env.hud({ lives: lives });
        if (lives < 0) { over = true; state = 'over'; env.gameOver({ score: Math.round(score * cfg.mult), detail: '第 ' + level + ' 关止步' }); return; }
        balls = [mkBall(paddle.x, paddle.y - 22, cfg.ball)];
        balls[0].stuck = true;
        launched = false;
        paddle.w = paddle.targetW = 118;
      }

      function applyDrop(kind) {
        if (kind === 'wide') { paddle.targetW = Math.min(230, paddle.targetW + 44); sfx.play('powerup'); }
        else if (kind === 'multi') {
          sfx.play('powerup');
          var extra = [];
          balls.forEach(function (b) {
            if (b.stuck) return;
            extra.push(mkBall(b.x, b.y, cfg.ball + 20, Math.atan2(b.vy, b.vx) - 0.5));
            extra.push(mkBall(b.x, b.y, cfg.ball + 20, Math.atan2(b.vy, b.vx) + 0.5));
          });
          balls = balls.concat(extra);
        } else if (kind === 'slow') {
          sfx.play('coin');
          balls.forEach(function (b) { b.vx *= 0.78; b.vy *= 0.78; });
        } else if (kind === 'laser') { laserT = 9; sfx.play('powerup'); }
        else if (kind === 'magnet') { magnetT = 12; sfx.play('powerup'); }
        var ex = [];
        if (laserT > 0) ex.push('🔫');
        if (magnetT > 0) ex.push('🧲');
        env.hud({ extra: ex.length ? ex.join(' ') : cfg.label });
      }

      function fireLaser() {
        beams.push({ x: paddle.x - paddle.w * 0.3, y: paddle.y - 6 });
        beams.push({ x: paddle.x + paddle.w * 0.3, y: paddle.y - 6 });
        sfx.play('laser');
      }

      function update(dt) {
        tAcc += dt;
        if (shake > 0) shake = Math.max(0, shake - dt * 40);
        if (laserT > 0) laserT -= dt;
        if (magnetT > 0) magnetT -= dt;

        if (state === 'clear') {
          winT += dt;
          if (winT > 1.6) {
            if (level >= 3) { state = 'won'; winT = 0; sfx.play('win'); }
            else { level++; reset(false); }
          }
          return;
        }
        if (state === 'won') {
          winT += dt;
          if (winT > 1.1 && !over) {
            over = true;
            env.win({ score: Math.round(score * cfg.mult), detail: '三关全破' });
          }
          return;
        }
        if (state === 'over') return;

        /* 挡板 */
        var cx = (env.pad.right ? 1 : 0) - (env.pad.left ? 1 : 0);
        if (cx) paddle.x += cx * 620 * dt;
        if (pointerActive) paddle.x += (pointerX - paddle.x) * Math.min(1, dt * 18);
        paddle.w += (paddle.targetW - paddle.w) * Math.min(1, dt * 8);
        paddle.x = env.clamp(paddle.x, paddle.w / 2, W - paddle.w / 2);

        /* 发射 / 激光（A 边沿） */
        var aDown = env.pad.a;
        if (aDown && !prevA) {
          var didLaunch = false;
          balls.forEach(function (b) {
            if (b.stuck) {
              b.stuck = false;
              b.vx = (Math.random() - 0.5) * 260;
              b.vy = -Math.sqrt(Math.max(0, cfg.ball * cfg.ball - b.vx * b.vx));
              sfx.play('laser');
              didLaunch = true;
            }
          });
          if (didLaunch) launched = true;
          else if (laserT > 0) fireLaser();
        }
        prevA = aDown;

        /* 小球 */
        for (var i = balls.length - 1; i >= 0; i--) {
          var b = balls[i];
          if (b.stuck) { b.x = paddle.x; b.y = paddle.y - 16; continue; }
          b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 7) b.trail.shift();
          b.x += b.vx * dt; b.y += b.vy * dt;

          if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); sfx.play('bounce'); }
          if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); sfx.play('bounce'); }
          if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); sfx.play('bounce'); }

          /* 磁力底座：底线救援（每球 0.9s 冷却） */
          if (magnetT > 0 && b.vy > 0 && b.y + b.r > H - 12) {
            if (!b.magCd || b.magCd <= 0) {
              b.vy = -Math.abs(b.vy); b.magCd = 0.9;
              sfx.play('life');
              burst(b.x, H - 12, '#2ee6a8', 6);
            }
          }
          if (b.magCd) b.magCd -= dt;

          // 挡板
          if (b.vy > 0 && b.y + b.r > paddle.y && b.y - b.r < paddle.y + paddle.h &&
            b.x > paddle.x - paddle.w / 2 && b.x < paddle.x + paddle.w / 2) {
            var off = (b.x - paddle.x) / (paddle.w / 2);
            var ang = -Math.PI / 2 + off * 1.05;
            var spd = Math.min(620, Math.hypot(b.vx, b.vy) * 1.015);
            b.vx = Math.cos(ang) * spd; b.vy = Math.sin(ang) * spd;
            b.y = paddle.y - b.r - 1;
            sfx.play('bounce');
            combo = 0;
            burst(b.x, paddle.y, '#38e1ff', 5);
          }

          // 砖块
          for (var j = 0; j < bricks.length; j++) {
            var br = bricks[j];
            if (b.x + b.r > br.x && b.x - b.r < br.x + br.w && b.y + b.r > br.y && b.y - b.r < br.y + br.h) {
              var overlapX = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r));
              var overlapY = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r));
              if (overlapX < overlapY) b.vx = -b.vx; else b.vy = -b.vy;
              hitBrick(br, j);
              break;
            }
          }

          if (b.y - b.r > H) { balls.splice(i, 1); }
        }
        if (balls.length === 0 && state === 'play') { loseLife(); return; }

        /* 激光束 */
        for (var bi = beams.length - 1; bi >= 0; bi--) {
          var bm = beams[bi];
          bm.y -= 900 * dt;
          for (var bj = bricks.length - 1; bj >= 0; bj--) {
            var tb = bricks[bj];
            if (bm.x > tb.x && bm.x < tb.x + tb.w && bm.y < tb.y + tb.h && bm.y > tb.y) {
              hitBrick(tb, bj);
              beams.splice(bi, 1);
              break;
            }
          }
          if (bm && bm.y < -20) beams.splice(bi, 1);
        }

        /* 道具 */
        for (var d = drops.length - 1; d >= 0; d--) {
          var dr = drops[d];
          dr.t += dt; dr.y += dr.vy * dt;
          if (dr.y + dr.r > paddle.y && dr.y - dr.r < paddle.y + paddle.h &&
            dr.x > paddle.x - paddle.w / 2 - 10 && dr.x < paddle.x + paddle.w / 2 + 10) {
            applyDrop(dr.kind);
            score += 30;
            drops.splice(d, 1);
            continue;
          }
          if (dr.y > H + 30) drops.splice(d, 1);
        }

        parts = parts.filter(function (q) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 300 * dt; return q.life > 0; });

        /* 过关 */
        if (bricks.length === 0 && state === 'play') {
          state = 'clear'; winT = 0; score += 500; sfx.play('levelup');
          env.hud({ score: score });
        }

        env.score(score);
      }

      /* ---------- 渲染 ---------- */
      function render() {
        ctx.save();
        if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        var g = ctx.createLinearGradient(0, 0, W, H);
        g.addColorStop(0, '#0d0a1c'); g.addColorStop(1, '#1c1238');
        ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);

        ctx.strokeStyle = 'rgba(255,92,108,.08)'; ctx.lineWidth = 1;
        for (var x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (var y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        bricks.forEach(function (b) {
          ctx.save();
          if (b.bomb) {
            ctx.shadowColor = '#ffb020'; ctx.shadowBlur = b.flash > 0 ? 30 : 16;
            ctx.fillStyle = b.flash > 0 ? '#fff' : '#3a2a10';
            env.roundRect(b.x, b.y, b.w, b.h, 6); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffb020'; ctx.lineWidth = 2;
            env.roundRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4, 5); ctx.stroke();
            ctx.fillStyle = '#ffb020'; ctx.font = 'bold 14px system-ui';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('💣', b.x + b.w / 2, b.y + b.h / 2 + 1);
          } else {
            ctx.shadowColor = b.c; ctx.shadowBlur = b.flash > 0 ? 26 : 10;
            ctx.fillStyle = b.flash > 0 ? '#fff' : b.c;
            env.roundRect(b.x, b.y, b.w, b.h, 6); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,255,255,.22)';
            env.roundRect(b.x + 3, b.y + 3, b.w - 6, 6, 3); ctx.fill();
            if (b.maxhp > 1) {
              ctx.fillStyle = 'rgba(0,0,0,.4)';
              ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText(b.hp, b.x + b.w - 11, b.y + b.h - 9);
            }
          }
          ctx.restore();
        });

        drops.forEach(function (d) {
          var col = d.kind === 'wide' ? '#2ee6a8' : d.kind === 'multi' ? '#38e1ff' : d.kind === 'slow' ? '#7a5cff' : d.kind === 'laser' ? '#ff5c6c' : '#ffb020';
          ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(Math.sin(d.t * 3) * 0.3);
          ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.fillStyle = col;
          env.roundRect(-12, -12, 24, 24, 7); ctx.fill();
          ctx.shadowBlur = 0; ctx.fillStyle = '#06101c'; ctx.font = 'bold 13px system-ui';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(d.kind === 'wide' ? 'W' : d.kind === 'multi' ? '3' : d.kind === 'slow' ? 'S' : d.kind === 'laser' ? 'L' : 'M', 0, 1);
          ctx.restore();
        });

        /* 磁力底座光环 */
        if (magnetT > 0) {
          ctx.strokeStyle = 'rgba(255,176,32,' + (0.4 + Math.sin(tAcc * 8) * 0.25) + ')';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(6, H - 8); ctx.lineTo(W - 6, H - 8); ctx.stroke();
        }

        parts.forEach(function (q) {
          ctx.globalAlpha = Math.max(0, q.life * 2);
          ctx.fillStyle = q.c;
          ctx.beginPath(); ctx.arc(q.x, q.y, q.s, 0, 6.283); ctx.fill();
        });
        ctx.globalAlpha = 1;

        var pg = ctx.createLinearGradient(paddle.x - paddle.w / 2, 0, paddle.x + paddle.w / 2, 0);
        pg.addColorStop(0, '#38e1ff'); pg.addColorStop(0.5, '#ff5c6c'); pg.addColorStop(1, '#ffb020');
        ctx.shadowColor = laserT > 0 ? '#ff5c6c' : '#38e1ff'; ctx.shadowBlur = 18;
        ctx.fillStyle = pg;
        env.roundRect(paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h, 7); ctx.fill();
        ctx.shadowBlur = 0;

        /* 激光炮炮口 */
        if (laserT > 0) {
          ctx.fillStyle = '#ff5c6c';
          ctx.fillRect(paddle.x - paddle.w * 0.3 - 3, paddle.y - 10, 6, 10);
          ctx.fillRect(paddle.x + paddle.w * 0.3 - 3, paddle.y - 10, 6, 10);
        }
        beams.forEach(function (bm) {
          ctx.shadowColor = '#ff5c6c'; ctx.shadowBlur = 12;
          ctx.fillStyle = '#ffd6de';
          ctx.fillRect(bm.x - 2, bm.y - 18, 4, 18);
          ctx.shadowBlur = 0;
        });

        balls.forEach(function (b) {
          b.trail.forEach(function (tp, k) {
            ctx.globalAlpha = (k / b.trail.length) * 0.4;
            ctx.fillStyle = '#bfe9ff';
            ctx.beginPath(); ctx.arc(tp.x, tp.y, b.r * (k / b.trail.length), 0, 6.283); ctx.fill();
          });
          ctx.globalAlpha = 1;
          ctx.shadowColor = '#fff'; ctx.shadowBlur = 16;
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill();
          ctx.shadowBlur = 0;
        });

        ctx.restore();

        ctx.fillStyle = 'rgba(6,12,24,.45)'; ctx.fillRect(0, 0, W, 52);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('🧨 第 ' + level + '/3 关', 18, 26);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffd6de'; ctx.fillText('❤ '.repeat(Math.max(0, lives)) || '—', W / 2, 26);
        ctx.textAlign = 'right'; ctx.fillStyle = '#fff';
        ctx.fillText('得分 ' + Math.round(score * cfg.mult), W - 18, 26);

        if (state === 'clear' || state === 'won') {
          ctx.fillStyle = 'rgba(6,12,24,.6)'; ctx.fillRect(0, 0, W, H);
          ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 46px system-ui';
          ctx.shadowColor = 'rgba(255,92,108,.9)'; ctx.shadowBlur = 26;
          ctx.fillText(state === 'won' ? '三关全破！' : '第 ' + level + ' 关通过！', W / 2, H / 2 - 6);
          ctx.font = 'bold 19px system-ui'; ctx.shadowBlur = 0; ctx.fillStyle = '#ffd6de';
          ctx.fillText(state === 'won' ? '你是打砖块大师' : '准备进入下一关…', W / 2, H / 2 + 38);
        }
      }

      reset(true);
      env.loop(function (dt) { update(dt); render(); });

      /* 自动化钩子 */
      env.canvas.__auto = {
        state: function () {
          return { score: score, lives: lives, level: level, balls: balls.length, bricks: bricks.length, laserT: laserT, magnetT: magnetT, over: over, phase: state, paddleX: paddle.x };
        },
        setPaddle: function (x) { paddle.x = env.clamp(x, paddle.w / 2, W - paddle.w / 2); },
        giveDrop: function (kind) { applyDrop(kind); },
        clear: function () { bricks.length = 0; },
        kill: function () { lives = 0; }
      };

      function onDown(e) { pointerActive = true; pointerX = env.pointer(e).x; }
      function onMove(e) { if (pointerActive) { pointerX = env.pointer(e).x; e.preventDefault && e.preventDefault(); } }
      function onUp() { pointerActive = false; }
      env.canvas.addEventListener('mousedown', onDown);
      env.canvas.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      env.canvas.addEventListener('touchstart', function (e) { onDown(e); e.preventDefault(); }, { passive: false });
      env.canvas.addEventListener('touchmove', function (e) { onMove(e); e.preventDefault(); }, { passive: false });
      env.canvas.addEventListener('touchend', onUp);

      return {
        start: function () { sfx.play('start'); },
        restart: function () { reset(true); },
        destroy: function () { window.removeEventListener('mouseup', onUp); },
        /* 自动化钩子 */
        state: function () {
          return { score: score, lives: lives, level: level, balls: balls.length, bricks: bricks.length, laserT: laserT, magnetT: magnetT, over: over, phase: state, paddleX: paddle.x };
        },
        setPaddle: function (x) { paddle.x = env.clamp(x, paddle.w / 2, W - paddle.w / 2); },
        giveDrop: function (kind) { applyDrop(kind); },
        clear: function () { bricks.length = 0; },
        kill: function () { lives = 0; },
        launch: function () { prevA = false; env.pad.a = false; }
      };
    }
  });
})();
