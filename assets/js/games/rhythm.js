/* ==========================================================================
   节奏点击 Rhythm Tap
   四轨下落式音击：D F J K / 触屏点轨道 / 手柄方向键
   Perfect(±90ms) 300 · Good(±180ms) 120 · 连击加成；Miss 满 10 次出局
   曲长 26 拍前奏后 ~27 秒，撑到曲终即胜利
   ========================================================================== */
(function () {
  'use strict';

  var DIFF = {
    easy:   { dens: 0.5,  approach: 1.9,  mult: 0.9,  label: '轻松' },
    normal: { dens: 0.62, approach: 1.55, mult: 1.0,  label: '标准' },
    hard:   { dens: 0.78, approach: 1.25, mult: 1.25, label: '困难' }
  };
  var BPM = 104, BEAT = 60 / BPM, LEAD_BEATS = 6, CHART_BEATS = 44, MISS_MAX = 10;
  var LANES = 4, LANE_W = 120, LX = 40, HIT_Y = 620;
  var LANE_KEYS = ['D', 'F', 'J', 'K'];
  var LANE_COLORS = ['#f472b6', '#fbbf24', '#34d399', '#38bdf8'];

  GameKit.register({
    id: 'rhythm',
    name: { zh: '节奏点击', en: 'Rhythm Tap' },
    desc: { zh: '四轨下落式音击！D F J K 对应四条轨道，触屏直接点轨道，Perfect 判定攒连击加成；Miss 满 10 次出局，撑到曲终就是胜利！', en: '4-lane falling-note rhythm game! Hit D F J K or tap the lanes — chain Perfects for combo bonus. 10 misses and you\'re out; survive till the song ends to win!' },
    genre: { zh: '音乐节奏', en: 'Music' },
    icon: '🎵', hue: '#fbbf24',
    tags: [{ zh: '节奏', en: 'Rhythm' }, { zh: '反应', en: 'Reflex' }],
    plays: 5000, hot: false, isNew: true,
    script: 'assets/js/games/rhythm.js',
    ratio: 'portrait', duration: '1-2 分钟',
    logical: { w: 560, h: 700 },
    touchControls: ['left', 'up', 'down', 'right'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!DIFF[diff]) diff = 'normal';
      var cfg = DIFF[diff];
      var SONG_END = (LEAD_BEATS + CHART_BEATS + 2) * BEAT;
      var FALL = (HIT_Y + 30) / cfg.approach; /* px/s */

      var notes, songTime, score, combo, maxCombo, misses, judged;
      var over, ended, lastSec, prevPad, laneCd, pops, shakeT;

      function genChart() {
        notes = [];
        var b, lastLane = -1, lastLast = -1;
        for (b = LEAD_BEATS; b < LEAD_BEATS + CHART_BEATS; b++) {
          if (Math.random() < cfg.dens) {
            var lane = Math.floor(Math.random() * LANES);
            if (lane === lastLane && lane === lastLast) lane = (lane + 1) % LANES;
            notes.push({ time: b * BEAT, lane: lane, done: 0 });
            lastLast = lastLane; lastLane = lane;
            if (diff === 'hard' && Math.random() < 0.16) {
              var lane2 = (lane + 1 + Math.floor(Math.random() * (LANES - 1))) % LANES;
              notes.push({ time: b * BEAT, lane: lane2, done: 0 });
            }
          }
        }
        notes.sort(function (a, b2) { return a.time - b2.time; });
      }

      function syncHud() {
        env.hud({
          score: score, lives: MISS_MAX - misses, level: 1,
          extra: cfg.label + ' · 连击 ' + combo + (maxCombo > combo ? '' : '!') + ' · Miss ' + misses + '/' + MISS_MAX
        });
      }

      function finish(win) {
        if (ended) return;
        ended = true;
        over = true;
        if (win) {
          env.win({
            score: score + maxCombo * 8,
            level: 1,
            extra: cfg.label + ' · 曲终！最大连击 ' + maxCombo + ' · Miss ' + misses
          });
        } else {
          env.gameOver({
            win: false, score: score, level: 1,
            extra: cfg.label + ' · Miss 满 ' + MISS_MAX + ' 次 · 最大连击 ' + maxCombo
          });
        }
      }

      /* 判定：所有输入通路都汇到这里 */
      function tryHit(lane) {
        if (over || lane < 0 || lane >= LANES) return null;
        var t = performance.now() / 1000;
        if (t - (laneCd[lane] || 0) < 0.07) return null; /* onKey 与 pad 边沿去重 */
        laneCd[lane] = t;
        var best = null, bestDt = 1e9, i;
        for (i = 0; i < notes.length; i++) {
          var n = notes[i];
          if (n.lane !== lane || n.done) continue;
          var dt = Math.abs(songTime - n.time);
          if (dt < bestDt) { bestDt = dt; best = n; }
          if (n.time - songTime > 0.5) break;
        }
        pops.push({ lane: lane, t: 0, txt: null, c: '#f87171' });
        var pop = pops[pops.length - 1];
        if (!best || bestDt > 0.28) { pop.txt = '…'; sfx.play('click'); return null; }
        best.done = 1;
        judged++;
        if (bestDt <= 0.09) {
          score += Math.round(300 * cfg.mult * (1 + Math.min(0.5, combo * 0.01)));
          combo++;
          pop.txt = 'PERFECT'; pop.c = '#fde047';
          sfx.play('stomp');
        } else if (bestDt <= 0.18) {
          score += Math.round(120 * cfg.mult);
          combo++;
          pop.txt = 'GOOD'; pop.c = '#7dd3fc';
          sfx.play('bounce');
        } else {
          combo = 0;
          pop.txt = 'BAD'; pop.c = '#94a3b8';
          sfx.play('block');
        }
        if (combo > maxCombo) maxCombo = combo;
        syncHud();
        return pop.txt;
      }
      function forceMiss() {
        if (over) return false;
        var i;
        for (i = 0; i < notes.length; i++) {
          var n = notes[i];
          if (!n.done) {
            n.done = 2;
            judged++;
            misses++;
            combo = 0;
            pops.push({ lane: n.lane, t: 0, txt: 'MISS', c: '#f87171' });
            sfx.play('warn');
            syncHud();
            if (misses >= MISS_MAX) { finish(false); }
            return true;
          }
        }
        return false;
      }

      function reset() {
        genChart();
        songTime = -2;
        score = 0; combo = 0; maxCombo = 0; misses = 0; judged = 0;
        over = false; ended = false; lastSec = -1;
        prevPad = {}; laneCd = [0, 0, 0, 0]; pops = []; shakeT = 0;
        syncHud();
      }

      /* ---- 输入 ---- */
      function laneAt(p) {
        if (p.y < 380) return -1;
        var l = Math.floor((p.x - LX) / LANE_W);
        return (l >= 0 && l < LANES) ? l : -1;
      }
      function onDown(e) {
        if (over) return;
        var l = laneAt(env.pointer(e));
        if (l >= 0) tryHit(l);
      }
      env.canvas.addEventListener('pointerdown', onDown);

      var offKey = env.onKey(function (e) {
        if (over) return;
        var map = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3 };
        var l = map[e.code];
        if (l !== undefined) tryHit(l);
      });

      function padEdge(k) {
        var v = !!env.pad[k], p = !!prevPad[k];
        prevPad[k] = v;
        return v && !p;
      }
      function updateInput() {
        if (padEdge('left')) tryHit(0);
        if (padEdge('up')) tryHit(1);
        if (padEdge('down')) tryHit(2);
        if (padEdge('right')) tryHit(3);
      }

      function update(dt) {
        var i;
        if (over) return;
        updateInput();
        songTime += dt;
        if (shakeT > 0) shakeT -= dt;
        for (i = pops.length - 1; i >= 0; i--) {
          pops[i].t += dt;
          if (pops[i].t > 0.6) pops.splice(i, 1);
        }
        /* 漏判 */
        for (i = 0; i < notes.length; i++) {
          var n = notes[i];
          if (n.done) continue;
          if (songTime - n.time > 0.18) {
            n.done = 2;
            judged++;
            misses++;
            combo = 0;
            pops.push({ lane: n.lane, t: 0, txt: 'MISS', c: '#f87171' });
            shakeT = 0.25;
            sfx.play('warn');
            syncHud();
            if (misses >= MISS_MAX) { finish(false); return; }
          }
          if (n.time - songTime > 1) break;
        }
        var sec = Math.floor(songTime);
        if (sec !== lastSec) {
          lastSec = sec;
          if (sec > 0 && sec % 10 === 0) sfx.play('coin');
        }
        if (songTime >= SONG_END) { finish(true); return; }
      }

      function render() {
        var i;
        ctx.fillStyle = '#161022';
        ctx.fillRect(0, 0, W, H);
        /* 轨道 */
        for (i = 0; i < LANES; i++) {
          var x = LX + i * LANE_W;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,.045)' : 'rgba(255,255,255,.02)';
          ctx.fillRect(x, 90, LANE_W, HIT_Y - 90);
          ctx.strokeStyle = 'rgba(255,255,255,.08)';
          ctx.strokeRect(x, 90, LANE_W, HIT_Y - 90);
        }
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fde047';
        ctx.font = 'bold 24px system-ui, sans-serif';
        ctx.fillText('🎵 节奏点击', W / 2, 42);
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText('D F J K / 点轨道 / 手柄方向键 · Miss ' + misses + '/' + MISS_MAX, W / 2, 68);

        /* 判定线与键帽 */
        for (i = 0; i < LANES; i++) {
          var x2 = LX + i * LANE_W;
          ctx.fillStyle = 'rgba(255,255,255,.1)';
          ctx.fillRect(x2 + 8, HIT_Y - 14, LANE_W - 16, 28);
          ctx.fillStyle = LANE_COLORS[i];
          ctx.font = 'bold 16px system-ui, sans-serif';
          ctx.fillText(LANE_KEYS[i], x2 + LANE_W / 2, HIT_Y);
        }
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        ctx.fillRect(LX, HIT_Y - 2, LANES * LANE_W, 3);

        /* 音符 */
        for (i = 0; i < notes.length; i++) {
          var n = notes[i];
          if (n.done) continue;
          var dy = (n.time - songTime) * FALL;
          if (dy < -40) continue;
          if (n.time - songTime > cfg.approach + 0.4) break;
          var y = HIT_Y - dy;
          var nx = LX + n.lane * LANE_W;
          ctx.fillStyle = LANE_COLORS[n.lane];
          ctx.fillRect(nx + 10, y - 9, LANE_W - 20, 18);
          ctx.fillStyle = 'rgba(255,255,255,.35)';
          ctx.fillRect(nx + 10, y - 9, LANE_W - 20, 5);
        }

        /* 判定气泡 */
        for (i = 0; i < pops.length; i++) {
          var pp = pops[i];
          ctx.globalAlpha = Math.max(0, 1 - pp.t / 0.6);
          ctx.fillStyle = pp.c;
          ctx.font = 'bold 15px system-ui, sans-serif';
          ctx.fillText(pp.txt, LX + pp.lane * LANE_W + LANE_W / 2, HIT_Y - 46 - pp.t * 46);
          ctx.globalAlpha = 1;
        }
        /* 连击 */
        if (combo > 1) {
          ctx.fillStyle = combo >= 10 ? '#fde047' : 'rgba(255,255,255,.75)';
          ctx.font = 'bold 30px system-ui, sans-serif';
          ctx.fillText(combo + ' COMBO', W / 2, 140);
        }
        /* 进度条 */
        var frac = Math.max(0, Math.min(1, songTime / SONG_END));
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.fillRect(60, H - 20, 440, 8);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(60, H - 20, 440 * frac, 8);
      }

      reset();
      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        state: function () {
          return {
            songTime: songTime, score: score, combo: combo, maxCombo: maxCombo,
            misses: misses, judged: judged, notesLeft: notes.length - judged,
            over: over, total: notes.length, cd: laneCd.slice()
          };
        },
        hit: function (l) { return tryHit(l); },
        nearest: function () {
          var best = null, bestDt = 1e9;
          for (var i = 0; i < notes.length; i++) {
            var n = notes[i];
            if (n.done) continue;
            var dt = Math.abs(songTime - n.time);
            if (dt < bestDt) { bestDt = dt; best = n; }
            if (n.time - songTime > 1) break;
          }
          return best ? { lane: best.lane, dt: songTime - best.time } : null;
        },
        forceMiss: function () { return forceMiss(); },
        skipTo: function (t) { songTime = t; }
      };

      return {
        start: function () { syncHud(); },
        restart: function () { reset(); },
        destroy: function () {
          env.canvas.removeEventListener('pointerdown', onDown);
          if (offKey) offKey();
        }
      };
    }
  });
})(window);
