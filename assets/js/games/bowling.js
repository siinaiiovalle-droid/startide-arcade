/* ==========================================================================
   保龄球 Bowling
   十格标准计分（全中/补中奖励）· 瓶阵链式物理 · 定位+蓄力两段操作 · 三难度
   ========================================================================== */
(function () {
  'use strict';

  /* 蓄力表速度（格/秒） */
  var CFG = { easy: { meter: 80 }, normal: { meter: 120 }, hard: { meter: 165 } };
  var DECK_Y = 176;          /* 瓶阵最后排 y */
  var PIN_GAP = 34;
  var BALL_R = 15, PIN_R = 8.5;
  var TOP = 150;

  GameKit.register({
    id: 'bowling',
    name: { zh: '保龄球', en: 'Bowling' },
    desc: { zh: '经典十格保龄球：左右移动选位，蓄力决定球速，链式撞倒全部 10 瓶就是全中！标准计分，全中/补中有奖励分，挑战 300 分满分！', en: 'Classic 10-frame bowling: pick your spot, charge power, knock down all 10 pins for a STRIKE! Standard scoring with strike & spare bonuses — chase that perfect 300!' },
    genre: { zh: '体育竞技', en: 'Sports' },
    icon: '🎳', hue: '#7c3aed',
    logical: { w: 560, h: 700 },
    plays: 5000, hot: false, isNew: true, sound: 'calm',
    script: 'assets/js/games/bowling.js',
    ratio: 'portrait', duration: '3-8 分钟',
    touchControls: ['up', 'down', 'left', 'right', 'a', 'b'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!CFG[diff]) diff = 'normal';
      var meterSpeed = CFG[diff].meter;

      var LANE_L = W / 2 - 92, LANE_R = W / 2 + 92;
      var BALL_Y = H - 92;
      var CX = W / 2;

      var pins, ball, phase, meter, meterDir, ballX;
      var rolls, frame, rollInFrame, needRackReset, over, settleT, msg, msgT, lastKnock;
      var prev, particles, scoreTotal;

      /* ---------- 标准十格计分（含第 10 格奖励球） ---------- */
      function scoreGame(rs) {
        var total = 0, i = 0;
        for (var f = 0; f < 10; f++) {
          var a = rs[i], b = rs[i + 1], c = rs[i + 2];
          if (a === undefined) break;
          if (a === 10) {
            if (b === undefined || c === undefined) break;
            total += 10 + b + c; i += 1;
          } else if (b === undefined) {
            break;
          } else if (a + b === 10) {
            if (c === undefined) break;
            total += 10 + c; i += 2;
          } else {
            total += a + b; i += 2;
          }
        }
        return total;
      }

      /* 每格累计分（用于记分板显示） */
      function frameCum(rs) {
        var out = [], total = 0, i = 0;
        for (var f = 0; f < 10; f++) {
          var a = rs[i], b = rs[i + 1], c = rs[i + 2];
          if (a === undefined) { out.push(null); i += 2; continue; }
          if (a === 10) {
            if (b === undefined || c === undefined) { out.push(null); i += 1; continue; }
            total += 10 + b + c; out.push(total); i += 1;
          } else if (b === undefined) { out.push(null); i += 2; continue; }
          else if (a + b === 10) {
            if (c === undefined) { out.push(null); i += 2; continue; }
            total += 10 + c; out.push(total); i += 2;
          } else {
            total += a + b; out.push(total); i += 2;
          }
        }
        return out;
      }

      function rack() {
        pins = [];
        for (var r = 0; r < 4; r++) {
          var n = r + 1;
          var y = DECK_Y + (3 - r) * 30;
          for (var i = 0; i < n; i++) {
            var x = CX + (i - (n - 1) / 2) * PIN_GAP;
            pins.push({ x: x, y: y, ox: x, oy: y, vx: 0, vy: 0, down: false, spin: env.rand(0, Math.PI * 2) });
          }
        }
      }

      function standingCount() {
        var n = 0;
        for (var i = 0; i < pins.length; i++) if (!pins[i].down) n++;
        return n;
      }

      function reset() {
        rolls = []; frame = 0; rollInFrame = 0; needRackReset = false;
        over = false; settleT = 0; msg = ''; msgT = 0; lastKnock = 0;
        prev = {}; particles = []; scoreTotal = 0;
        phase = 0; meter = 0; meterDir = 1; ballX = CX;
        rack();
        ball = null;
        env.hud({ score: 0, lives: 1, level: 1, extra: '第 1 格 · 第 1 球' });
      }

      function downedNow() {
        var n = 0;
        for (var i = 0; i < pins.length; i++) if (pins[i].down) n++;
        return n;
      }

      function settleRoll() {
        var standing = standingCount();
        var k = (10 - standing) - lastKnock; /* 本球击倒数 = 倒瓶总数增量 */
        rolls.push(k);
        msgT = 1.4;
        var isTenth = frame === 9;
        if (!isTenth) {
          if (rollInFrame === 0) {
            if (k === 10) { msg = 'STRIKE! 全中!'; sfx.play('explosion'); frame++; needRackReset = true; }
            else {
              msg = '击倒 ' + k + ' 瓶';
              if (k > 0) sfx.play('hit');
              rollInFrame = 1;
            }
          } else {
            if (lastKnock + k === 10 && lastKnock > 0) { msg = 'SPARE! 补中!'; sfx.play('win'); }
            else if (k > 0) sfx.play('hit');
            frame++; rollInFrame = 0; needRackReset = true;
          }
        } else {
          /* 第 10 格：全中/补中可加投 */
          var tenthIdx = tenthRollIndex();
          if (k === 10 && standing === 0) { msg = 'STRIKE! 全中!'; sfx.play('explosion'); needRackReset = true; }
          else if (standing === 0) { msg = 'SPARE! 补中!'; sfx.play('win'); needRackReset = true; }
          else { msg = '击倒 ' + k + ' 瓶'; if (k > 0) sfx.play('hit'); }
          var done = tenthDone(tenthIdx);
          if (done) finish(); else rollInFrame++;
        }
        lastKnock = downedNow();
        if (!isTenth && frame >= 10) finish();
      }

      /* 第 10 格已投数：rolls 里第 10 格起点 */
      function tenthRollIndex() {
        var i = 0;
        for (var f = 0; f < 9; f++) {
          if (rolls[i] === 10) i += 1; else i += 2;
        }
        return i;
      }
      function tenthDone(i) {
        var a = rolls[i], b = rolls[i + 1];
        if (a === undefined) return false;
        if (b === undefined) return false;
        if (a === 10 || a + b === 10) return rolls[i + 2] !== undefined;
        return true;
      }

      function downedBefore() { return lastKnock; }

      function finish() {
        over = true;
        scoreTotal = scoreGame(rolls);
        sfx.play(scoreTotal >= 100 ? 'win' : 'gameover');
        env.gameOver({ score: scoreTotal, detail: scoreTotal === 300 ? '完美 300 分!!' : '10 格完成 · 总分 ' + scoreTotal });
      }

      function launch(power) {
        var sp = 330 + power * 3.6;
        ball = {
          x: ballX, y: BALL_Y, vx: (CX - ballX) * 0.06 + env.rand(-5, 5), vy: -sp,
          r: BALL_R, spinning: power
        };
        phase = 2;
        sfx.play('shoot');
      }

      function update(dt) {
        var i, j;
        if (msgT > 0) msgT -= dt;

        if (phase === 0) {
          var sp = 220 * dt;
          if (env.pad.left) ballX -= sp;
          if (env.pad.right) ballX += sp;
          ballX = Math.max(LANE_L + BALL_R + 2, Math.min(LANE_R - BALL_R - 2, ballX));
          if ((env.pad.a && !prev.a) || (env.pad.b && !prev.b)) {
            phase = 1; meter = 0; meterDir = 1;
            sfx.play('select');
          }
        } else if (phase === 1) {
          meter += meterDir * meterSpeed * dt;
          if (meter >= 100) { meter = 100; meterDir = -1; }
          if (meter <= 0) { meter = 0; meterDir = 1; }
          if ((env.pad.a && !prev.a) || (env.pad.b && !prev.b)) launch(meter);
        } else if (phase === 2) {
          stepPhysics(dt);
        }
        prev.a = env.pad.a; prev.b = env.pad.b;

        /* 粒子 */
        for (i = particles.length - 1; i >= 0; i--) {
          var p = particles[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.t > 0.5) particles.splice(i, 1);
        }
      }

      function stepPhysics(dt) {
        var i, j;
        if (!ball) return;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        /* 沟槽判定 */
        var gutter = ball.x < LANE_L + 4 || ball.x > LANE_R - 4;
        if (gutter) {
          ball.x = Math.max(LANE_L - 8, Math.min(LANE_R + 8, ball.x));
        }
        /* 球撞瓶 */
        for (i = 0; i < pins.length; i++) {
          var pin = pins[i];
          if (pin.down) continue;
          var dx = pin.x - ball.x, dy = pin.y - ball.y;
          var d2 = dx * dx + dy * dy, rr = ball.r + PIN_R;
          if (d2 < rr * rr) {
            var d = Math.sqrt(d2) || 1;
            var speed = Math.abs(ball.vy);
            var nx = dx / d, ny = dy / d;
            pin.vx = nx * speed * 0.72 + env.rand(-40, 40);
            pin.vy = ny * speed * 0.72 + env.rand(-30, 30);
            ball.vx += nx * 26;
            ball.vy *= 0.93;
            sfx.play('hit');
            for (var n = 0; n < 5; n++) {
              particles.push({ x: pin.x, y: pin.y, vx: env.rand(-120, 120), vy: env.rand(-120, 60), t: 0, c: '#fef3c7' });
            }
          }
        }
        /* 瓶撞瓶（链式） */
        for (i = 0; i < pins.length; i++) {
          var a = pins[i];
          if (a.down) continue;
          var av = Math.abs(a.vx) + Math.abs(a.vy);
          if (av < 5) continue;
          a.x += a.vx * dt; a.y += a.vy * dt;
          a.vx *= (1 - 2.6 * dt); a.vy *= (1 - 2.6 * dt);
          if (Math.abs(a.x - a.ox) + Math.abs(a.y - a.oy) > 11) a.down = true;
          for (j = 0; j < pins.length; j++) {
            if (i === j) continue;
            var b2 = pins[j];
            if (b2.down) continue;
            var ddx = b2.x - a.x, ddy = b2.y - a.y;
            var dd2 = ddx * ddx + ddy * ddy, rrp = PIN_R * 2 + 2;
            if (dd2 < rrp * rrp && av > 55) {
              var dd = Math.sqrt(dd2) || 1;
              b2.vx = (ddx / dd) * av * 0.52 + env.rand(-25, 25);
              b2.vy = (ddy / dd) * av * 0.52 + env.rand(-25, 25);
              a.vx *= 0.55; a.vy *= 0.55;
            }
          }
        }
        /* 结算：球离场且瓶都停了 */
        var ballGone = ball.y < DECK_Y - 90 || Math.abs(ball.vy) < 40;
        var pinsCalm = true;
        for (i = 0; i < pins.length; i++) {
          if (!pins[i].down && Math.abs(pins[i].vx) + Math.abs(pins[i].vy) > 9) { pinsCalm = false; break; }
        }
        if (ballGone && pinsCalm) {
          settleT += dt;
          if (settleT > 0.55) {
            settleT = 0;
            /* 漏网之瓶：被撞离位但未标记倒下的补标 */
            for (i = 0; i < pins.length; i++) {
              var q = pins[i];
              if (!q.down && Math.abs(q.x - q.ox) + Math.abs(q.y - q.oy) > 11) q.down = true;
            }
            ball = null;
            phase = 3;
            settleRoll();
            setTimeout(function () {
              if (over) return;
              if (needRackReset) { rack(); needRackReset = false; lastKnock = 0; }
              phase = 0; ballX = CX; meter = 0;
              env.hud({ score: scoreGame(rolls), lives: 1, level: frame + 1, extra: '第 ' + Math.min(10, frame + 1) + ' 格 · 第 ' + (rollInFrame + 1) + ' 球' });
            }, 1100);
          }
        }
      }

      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        var K = e.code;
        if (K === 'Space' || K === 'KeyJ' || K === 'Enter' || K === 'NumpadEnter') {
          e.preventDefault();
          if (phase === 0) { phase = 1; meter = 0; meterDir = 1; sfx.play('select'); }
          else if (phase === 1) launch(meter);
        }
      });

      env.canvas.addEventListener('pointerdown', function (e) {
        if (over) return;
        var p = env.pointer(e);
        if (phase === 0) {
          if (p.y > DECK_Y + 60) {
            ballX = Math.max(LANE_L + BALL_R + 2, Math.min(LANE_R - BALL_R - 2, p.x));
          } else {
            phase = 1; meter = 0; meterDir = 1; sfx.play('select');
          }
        } else if (phase === 1) {
          launch(meter);
        }
      });
      env.canvas.addEventListener('pointermove', function (e) {
        if (over || phase !== 0) return;
        var p = env.pointer(e);
        if (p.y > DECK_Y + 60) {
          ballX = Math.max(LANE_L + BALL_R + 2, Math.min(LANE_R - BALL_R - 2, p.x));
        }
      });

      function drawPin(pin) {
        ctx.save();
        ctx.translate(pin.x, pin.y);
        if (pin.down) {
          ctx.rotate(1.15);
          ctx.globalAlpha = 0.85;
        }
        var s = PIN_R;
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = 'rgba(70,80,100,.55)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, s * 0.62, s, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.85, s * 0.34, s * 0.3, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.ellipse(0, -s * 0.92, s * 0.16, s * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      function render() {
        var i;
        var bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#1e1b4b'); bg.addColorStop(1, '#312e81');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

        /* 球道 */
        var lane = ctx.createLinearGradient(0, DECK_Y - 60, 0, H);
        lane.addColorStop(0, '#b45309'); lane.addColorStop(0.5, '#d97706'); lane.addColorStop(1, '#92400e');
        ctx.fillStyle = lane;
        ctx.beginPath();
        ctx.moveTo(LANE_L - 26, DECK_Y - 60);
        ctx.lineTo(LANE_R + 26, DECK_Y - 60);
        ctx.lineTo(LANE_R + 40, H);
        ctx.lineTo(LANE_L - 40, H);
        ctx.closePath();
        ctx.fill();
        /* 木纹 */
        ctx.strokeStyle = 'rgba(120,60,10,.35)';
        ctx.lineWidth = 1;
        for (i = 1; i < 9; i++) {
          var t = i / 9;
          ctx.beginPath();
          var xl = LANE_L - 26 + (40 - 26) * 0 + t * ((LANE_L - 40) - (LANE_L - 26));
          ctx.moveTo(xl, DECK_Y - 60 + t * (H - DECK_Y + 60));
          ctx.lineTo(LANE_R + 26 + t * 14, DECK_Y - 60 + t * (H - DECK_Y + 60));
          ctx.stroke();
        }
        /* 沟槽 */
        ctx.fillStyle = 'rgba(0,0,0,.4)';
        ctx.fillRect(LANE_L - 34, DECK_Y - 60, 8, H - DECK_Y + 60);
        ctx.fillRect(LANE_R + 26, DECK_Y - 60, 8, H - DECK_Y + 60);
        /* 箭头标 */
        ctx.fillStyle = 'rgba(80,40,10,.55)';
        for (i = -2; i <= 2; i++) {
          var ax = CX + i * 34;
          ctx.beginPath();
          ctx.moveTo(ax, BALL_Y - 150);
          ctx.lineTo(ax - 6, BALL_Y - 128);
          ctx.lineTo(ax + 6, BALL_Y - 128);
          ctx.closePath();
          ctx.fill();
        }
        /* 瓶坑 */
        ctx.fillStyle = 'rgba(0,0,0,.5)';
        ctx.fillRect(LANE_L - 26, DECK_Y - 96, (LANE_R + 26) - (LANE_L - 26), 44);

        /* 瓶 */
        for (i = 0; i < pins.length; i++) drawPin(pins[i]);

        /* 球 */
        if (ball) {
          var bg2 = ctx.createRadialGradient(ball.x - 5, ball.y - 5, 3, ball.x, ball.y, ball.r);
          bg2.addColorStop(0, '#8b5cf6'); bg2.addColorStop(1, '#4c1d95');
          ctx.fillStyle = bg2;
          ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.25)';
          ctx.beginPath(); ctx.arc(ball.x - 5, ball.y - 5, 4, 0, Math.PI * 2); ctx.fill();
        } else {
          /* 待发球位置圈 */
          ctx.strokeStyle = 'rgba(255,255,255,.5)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(ballX, BALL_Y, BALL_R, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.18)';
          ctx.fill();
        }

        /* 粒子 */
        for (i = 0; i < particles.length; i++) {
          var p = particles[i];
          ctx.globalAlpha = Math.max(0, 1 - p.t / 0.5);
          ctx.fillStyle = p.c;
          ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
          ctx.globalAlpha = 1;
        }

        /* 蓄力条 */
        if (phase === 1) {
          ctx.fillStyle = 'rgba(0,0,0,.45)';
          env.roundRect(W / 2 - 130, H - 52, 260, 22, 11); ctx.fill();
          var mc = meter > 82 ? '#ef4444' : meter > 55 ? '#f59e0b' : '#22c55e';
          ctx.fillStyle = mc;
          env.roundRect(W / 2 - 126, H - 48, 252 * meter / 100, 14, 7); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(W / 2 - 126 + 252 * 0.86, H - 52); ctx.lineTo(W / 2 - 126 + 252 * 0.86, H - 30); ctx.stroke();
        }

        /* 提示语 */
        if (msgT > 0 && msg) {
          ctx.globalAlpha = Math.min(1, msgT / 0.4);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = 'bold 34px system-ui';
          ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 5;
          ctx.strokeText(msg, W / 2, H / 2 - 60);
          ctx.fillStyle = '#fde68a';
          ctx.fillText(msg, W / 2, H / 2 - 60);
          ctx.globalAlpha = 1;
        }

        /* 记分板 */
        var cum = frameCum(rolls);
        var sbY = 24, cw = 44;
        ctx.fillStyle = 'rgba(15,23,42,.72)';
        env.roundRect(16, sbY - 8, W - 32, 74, 10); ctx.fill();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        for (var f = 0; f < 10; f++) {
          var fx = 22 + f * cw + cw / 2;
          ctx.fillStyle = 'rgba(255,255,255,.45)';
          ctx.font = '9px system-ui';
          ctx.fillText(String(f + 1), fx, sbY + 4);
          var a = idxFor(f, 0) >= 0 ? rolls[idxFor(f, 0)] : undefined;
          var b = idxFor(f, 1) >= 0 ? rolls[idxFor(f, 1)] : undefined;
          var c10 = f === 9 ? rolls[idxFor(f, 2)] : undefined;
          ctx.fillStyle = '#fef3c7';
          ctx.font = 'bold 13px Consolas, monospace';
          var txt = '';
          if (f < 9) {
            if (a === 10) txt = 'X';
            else if (a !== undefined && b !== undefined) txt = (a + b === 10) ? a + '/' : a + '' + b;
            else if (a !== undefined) txt = a === 0 ? '-' : String(a);
          } else {
            var parts10 = [];
            if (a !== undefined) parts10.push(a === 10 ? 'X' : a === 0 ? '-' : String(a));
            if (b !== undefined) parts10.push(b === 10 ? 'X' : (a !== undefined && a + b === 10 && a !== 10) ? '/' : b === 0 ? '-' : String(b));
            if (c10 !== undefined) parts10.push(c10 === 10 ? 'X' : (b !== undefined && b + c10 === 10 && b !== 10) ? '/' : c10 === 0 ? '-' : String(c10));
            txt = parts10.join(' ');
          }
          ctx.fillText(txt, fx, sbY + 22);
          ctx.fillStyle = '#7dd3fc';
          ctx.font = 'bold 13px Consolas, monospace';
          ctx.fillText(cum[f] === null || cum[f] === undefined ? '' : String(cum[f]), fx, sbY + 46);
        }
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '11px system-ui';
        ctx.fillText((diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通') + ' · ←→选位 空格蓄力再按出手 · 触屏点选位再点蓄力', 20, 108);
      }

      /* 第 f 格（0 基）第 k 球在 rolls 中的下标 */
      function idxFor(f, k) {
        if (f < 9) {
          var i = 0;
          for (var g = 0; g < f; g++) { if (rolls[i] === 10) i += 1; else i += 2; }
          if (rolls[i] === 10 && k > 0) return -1;
          var idx = i + k;
          return rolls[idx] === undefined ? -1 : idx;
        }
        var i10 = tenthRollIndex();
        var idx10 = i10 + k;
        return rolls[idx10] === undefined ? -1 : idx10;
      }

      reset();

      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        setBallX: function (x) { ballX = x; },
        beginMeter: function () { phase = 1; meter = 0; meterDir = 1; },
        launchPower: function (p) { ballX = arguments.length > 1 ? arguments[1] : ballX; launch(p); },
        state: function () {
          return { over: over, rolls: rolls.slice(), frame: frame, standing: standingCount(), score: scoreGame(rolls), phase: phase };
        },
        testScore: scoreGame,
        rack: function () { return pins.map(function (p) { return { x: p.x, y: p.y, down: p.down }; }); }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 1, level: 1, extra: '第 1 格 · 第 1 球' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
