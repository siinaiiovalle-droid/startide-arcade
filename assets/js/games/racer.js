/* ==========================================================================
   赛车躲避 Racer
   三车道切换 · 车流递增 · 惊险超车加分 · 碰撞即炸 · 三难度
   ========================================================================== */
(function () {
  'use strict';

  var CFG = {
    easy:   { v0: 240, vMax: 460, ramp: 9,  ivLo: 900,  ivHi: 1400 },
    normal: { v0: 280, vMax: 560, ramp: 13, ivLo: 700,  ivHi: 1100 },
    hard:   { v0: 330, vMax: 660, ramp: 18, ivLo: 520,  ivHi: 880 }
  };
  var CAR_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6'];
  var TOP = 150;

  GameKit.register({
    id: 'racer',
    name: { zh: '赛车躲避', en: 'Racer' },
    desc: { zh: '三车道公路狂飙：左右切换车道躲避车流，车速越来越快！与邻车擦肩而过有「惊险超车」加分，看看你能跑多远！', en: 'Dodge traffic on a 3-lane highway! Speed keeps rising. Near-miss overtakes give bonus points — how far can you go?' },
    genre: { zh: '竞速躲避', en: 'Racing' },
    icon: '🏎️', hue: '#dc2626',
    logical: { w: 560, h: 700 },
    plays: 5000, hot: false, isNew: true, sound: 'battle',
    script: 'assets/js/games/racer.js',
    ratio: 'portrait', duration: '1-4 分钟',
    touchControls: ['left', 'right', 'a', 'b'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!CFG[diff]) diff = 'normal';
      var cfg = CFG[diff];

      var ROAD_W = 372, LANE_N = 3;
      var ROAD_L = (W - ROAD_W) / 2, ROAD_R = ROAD_L + ROAD_W;
      var LANE_W = ROAD_W / LANE_N;
      var CAR_W = 52, CAR_H = 92;
      var PY = H - 130;

      var cars, lane, carX, dist, score, speed, nearMiss, time, over, spawnT, dashes, parts, prev, lastWave;
      var explosionT;

      function laneX(i) { return ROAD_L + LANE_W * (i + 0.5); }

      function reset() {
        cars = []; parts = [];
        lane = 1; carX = laneX(1);
        dist = 0; score = 0; speed = cfg.v0; nearMiss = 0;
        time = 0; over = false; spawnT = 800; lastWave = -1; explosionT = 0;
        dashes = [];
        for (var i = 0; i < 9; i++) dashes.push({ y: i * 90, laneLine: i % 2 });
        prev = {};
        env.hud({ score: 0, lives: 1, level: 1, extra: Math.round(speed / 3) + ' km/h' });
      }

      /* 一波：随机 1-2 条车道放车，保证至少一条空 */
      function spawnWave() {
        var lanes = [0, 1, 2];
        var n = env.rand(0, 1) < Math.min(0.55, 0.2 + time / 90) ? 2 : 1;
        /* 打乱后取 n 条 */
        for (var i = lanes.length - 1; i > 0; i--) {
          var j = (env.rand(0, i + 1)) | 0;
          var t = lanes[i]; lanes[i] = lanes[j]; lanes[j] = t;
        }
        for (i = 0; i < n; i++) {
          cars.push({
            lane: lanes[i], x: laneX(lanes[i]), y: -CAR_H - 20,
            w: CAR_W, h: CAR_H,
            color: CAR_COLORS[(env.rand(0, CAR_COLORS.length)) | 0],
            passed: false, truck: env.rand(0, 1) < 0.25
          });
        }
      }

      function crash(x, y) {
        over = true;
        sfx.play('explosion');
        for (var i = 0; i < 26; i++) {
          var a = env.rand(0, Math.PI * 2), sp = env.rand(80, 380);
          parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, t: 0, c: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#ef4444' : '#57534e' });
        }
        var s = Math.round(score);
        env.gameOver({ score: s, detail: '狂飙 ' + Math.round(dist / 10) + '0m · 惊险超车 ' + nearMiss + ' 次' });
      }

      function hitTest(a, b) {
        return Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 6 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 10;
      }

      function update(dt) {
        var i;
        if (over) {
          explosionT += dt;
          for (i = parts.length - 1; i >= 0; i--) {
            var q = parts[i]; q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 420 * dt;
            if (q.t > 1.2) parts.splice(i, 1);
          }
          return;
        }
        time += dt;
        speed = Math.min(cfg.vMax, cfg.v0 + cfg.ramp * time);
        dist += speed * dt;
        score = dist / 8;
        var lv = 1 + Math.floor(speed - cfg.v0) / 60;
        env.hud({ score: Math.round(score), lives: 1, level: Math.max(1, Math.round(lv)), extra: Math.round(speed / 3) + ' km/h · 超车 +' + nearMiss * 15 });

        /* 虚拟手柄 / 键盘方向的 pad 边沿（触屏手柄不触发 onKey） */
        if (env.pad.left && !prev.pl) move(-1);
        if (env.pad.right && !prev.pr) move(1);
        prev.pl = env.pad.left; prev.pr = env.pad.right;

        /* 车道平滑切换 */
        var target = laneX(lane);
        var dxx = target - carX;
        carX += Math.max(-520 * dt, Math.min(520 * dt, dxx * 12 * dt + Math.sign(dxx) * 40 * dt));
        if (Math.abs(target - carX) < 2) carX = target;

        /* 路面虚线滚动 */
        for (i = 0; i < dashes.length; i++) {
          dashes[i].y += speed * dt;
          if (dashes[i].y > H + 40) dashes[i].y -= dashes.length * 90;
        }

        /* 敌车 */
        spawnT -= dt * 1000;
        if (spawnT <= 0) {
          spawnWave();
          spawnT = env.rand(cfg.ivLo, cfg.ivHi) * (cfg.v0 / speed) * 1.05;
        }
        var me = { x: carX, y: PY, w: CAR_W, h: CAR_H };
        for (i = cars.length - 1; i >= 0; i--) {
          var c = cars[i];
          c.y += speed * dt;
          if (!c.passed && c.y > PY + CAR_H / 2) {
            c.passed = true;
            /* 惊险超车：与玩家车道相邻且横向距离近 */
            if (Math.abs(c.lane - lane) <= 0.9 && Math.abs(c.x - carX) < LANE_W * 0.85) {
              nearMiss++;
              score += 15;
              sfx.play('coin');
            } else {
              sfx.play('ig');
            }
          }
          if (hitTest(me, c)) { crash((carX + c.x) / 2, (PY + c.y) / 2); return; }
          if (c.y > H + 120) cars.splice(i, 1);
        }
      }

      function move(dir) {
        if (over) return;
        var nl = Math.max(0, Math.min(LANE_N - 1, lane + dir));
        if (nl !== lane) { lane = nl; sfx.play('select'); }
      }

      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        var K = e.code;
        if (K === 'ArrowLeft' || K === 'KeyA') { move(-1); e.preventDefault(); }
        else if (K === 'ArrowRight' || K === 'KeyD') { move(1); e.preventDefault(); }
      });

      env.canvas.addEventListener('pointerdown', function (e) {
        if (over) return;
        var p = env.pointer(e);
        move(p.x < W / 2 ? -1 : 1);
      });

      function drawCar(x, y, w, h, color, isMe) {
        var r = 9;
        ctx.fillStyle = color;
        env.roundRect(x - w / 2, y - h / 2, w, h, r); ctx.fill();
        /* 车窗 */
        ctx.fillStyle = 'rgba(20,30,50,.72)';
        env.roundRect(x - w / 2 + 7, y - h / 2 + (isMe ? 16 : 12), w - 14, h * 0.26, 4); ctx.fill();
        env.roundRect(x - w / 2 + 7, y + h / 2 - (isMe ? 26 : 30), w - 14, h * 0.2, 4); ctx.fill();
        /* 车灯 */
        ctx.fillStyle = isMe ? '#fef08a' : '#fecaca';
        ctx.fillRect(x - w / 2 + 6, y + (isMe ? h / 2 - 6 : -h / 2 + 2), 10, 4);
        ctx.fillRect(x + w / 2 - 16, y + (isMe ? h / 2 - 6 : -h / 2 + 2), 10, 4);
      }

      function render() {
        var i;
        /* 草地 */
        ctx.fillStyle = '#166534';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#15803d';
        for (i = 0; i < 12; i++) {
          var gy = (i * 70 + (dist * 0.6) % 70) % (H + 70) - 35;
          ctx.fillRect(20, gy, 26, 8);
          ctx.fillRect(W - 46, (gy + 35) % H, 26, 8);
        }
        /* 路面 */
        var road = ctx.createLinearGradient(ROAD_L, 0, ROAD_R, 0);
        road.addColorStop(0, '#3f3f46'); road.addColorStop(0.5, '#52525b'); road.addColorStop(1, '#3f3f46');
        ctx.fillStyle = road;
        ctx.fillRect(ROAD_L, 0, ROAD_W, H);
        ctx.fillStyle = '#f4f4f5';
        ctx.fillRect(ROAD_L - 6, 0, 6, H);
        ctx.fillRect(ROAD_R, 0, 6, H);
        /* 车道虚线 */
        ctx.fillStyle = 'rgba(250,250,250,.85)';
        for (i = 0; i < dashes.length; i++) {
          var dy = dashes[i].y;
          if (dy > -30 && dy < H) {
            ctx.fillRect(ROAD_L + LANE_W - 3, dy, 6, 44);
            ctx.fillRect(ROAD_L + LANE_W * 2 - 3, dy, 6, 44);
          }
        }
        /* 敌车 */
        for (i = 0; i < cars.length; i++) {
          var c = cars[i];
          drawCar(c.x, c.y, c.w, c.truck ? c.h * 1.15 : c.h, c.color, false);
        }
        /* 玩家 */
        if (!over) drawCar(carX, PY, CAR_W, CAR_H, '#facc15', true);
        else {
          drawCar(carX, PY, CAR_W, CAR_H, '#3f3f46', true);
        }
        /* 粒子 */
        for (i = 0; i < parts.length; i++) {
          var p = parts[i];
          ctx.globalAlpha = Math.max(0, 1 - p.t / 1.2);
          ctx.fillStyle = p.c;
          ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
          ctx.globalAlpha = 1;
        }
        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(240,240,240,.65)'; ctx.font = '13px system-ui';
        ctx.fillText('里程', 24, 34);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(Math.round(score) + '', 24, 68);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(240,240,240,.65)'; ctx.font = '13px system-ui';
        ctx.fillText('车速', W - 24, 34);
        ctx.fillStyle = '#fde047'; ctx.font = 'bold 30px Consolas, monospace';
        ctx.fillText(Math.round(speed / 3) + ' km/h', W - 24, 68);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(240,240,240,.6)'; ctx.font = '13px system-ui';
        ctx.fillText((diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通') + ' · ←→/A D 切道 · 触屏点左/右半屏', W / 2, 122);
      }

      reset();

      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        setLane: function (l) { lane = l; carX = laneX(l); },
        spawnWave: spawnWave,
        crash: function () { crash(carX, PY); },
        state: function () {
          return { over: over, score: Math.round(score), dist: Math.round(dist), speed: Math.round(speed), lane: lane, n: cars.length, nearMiss: nearMiss };
        }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: 1, level: 1, extra: Math.round(speed / 3) + ' km/h' });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
