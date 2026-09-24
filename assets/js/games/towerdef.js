/* ==========================================================================
   守塔 Tower Defense（简版）
   蛇形路径 · 点击格建塔/升级 · 三种敌型 · 20 波 · 金币经济 · 三难度
   ========================================================================== */
(function () {
  'use strict';

  var CFG = {
    easy:   { hpMul: 0.85, gold0: 150, waves: 15 },
    normal: { hpMul: 1.0,  gold0: 120, waves: 20 },
    hard:   { hpMul: 1.25, gold0: 100, waves: 20 }
  };
  var TOP = 150;
  var COLS = 8, ROWS = 8, CELL = 60;
  var GX = (560 - COLS * CELL) / 2, GY = TOP + 30;
  var BUILD_COST = 50, UP_COST = 80, MAXLVL = 3;

  /* 蛇形路径（col,row） */
  var PATH = [
    [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0],
    [7, 1], [7, 2],
    [6, 2], [5, 2], [4, 2], [3, 2], [2, 2], [1, 2],
    [1, 3], [1, 4],
    [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4],
    [7, 5], [7, 6],
    [6, 6], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6],
    [1, 7]
  ];
  var PATHSET = {};
  PATH.forEach(function (c) { PATHSET[c[0] + ',' + c[1]] = true; });

  function wp(ci) {
    var c = PATH[ci];
    return { x: GX + c[0] * CELL + CELL / 2, y: GY + c[1] * CELL + CELL / 2 };
  }

  GameKit.register({
    id: 'towerdef',
    name: { zh: '守塔', en: 'Tower Defense' },
    desc: { zh: '简版塔防：敌人沿蛇形小路进攻，点击空地建箭塔、点击箭塔升级！守住 20 波进攻。金币靠击杀赚，漏怪扣命！', en: 'Mini tower defense: enemies march along a snake path. Tap empty tiles to build, tap towers to upgrade! Survive all waves.' },
    genre: { zh: '策略塔防', en: 'Strategy' },
    icon: '🗼', hue: '#7c2d12',
    logical: { w: 560, h: 700 },
    plays: 5000, hot: false, isNew: true, sound: 'battle',
    script: 'assets/js/games/towerdef.js',
    ratio: 'portrait', duration: '4-10 分钟',
    touchControls: ['left', 'right', 'up', 'down', 'a', 'b'],

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!CFG[diff]) diff = 'normal';
      var cfg = CFG[diff];

      var towers, enemies, bullets, floats;
      var gold, lives, wave, kills, waveTimer, spawnQueue, spawnT, betweenWaves;
      var over, win, sel, shootCd, gen, prevA, prevPL, prevPR, prevPU, prevPD;

      function cellAt(x, y) {
        var c = Math.floor((x - GX) / CELL), r = Math.floor((y - GY) / CELL);
        if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return null;
        return { c: c, r: r };
      }

      function reset() {
        towers = {}; enemies = []; bullets = []; floats = [];
        gold = cfg.gold0; lives = 10; wave = 0; kills = 0;
        waveTimer = 3000; spawnQueue = []; spawnT = 0; betweenWaves = true;
        over = false; win = false; sel = null; shootCd = 0; gen = (gen || 0) + 1; prevA = false; prevPL = false; prevPR = false; prevPU = false; prevPD = false;
        env.hud({ score: 0, lives: lives, level: 1, extra: '金币 ' + gold });
      }

      function towerAt(c, r) { return towers[c + ',' + r] || null; }

      function build(c, r) {
        var key = c + ',' + r;
        if (PATHSET[key]) { float('这里是怪物的路', '#fca5a5'); return false; }
        if (towers[key]) { upgrade(c, r); return true; }
        if (gold < BUILD_COST) { float('金币不足', '#fca5a5'); sfx.play('ig'); return false; }
        gold -= BUILD_COST;
        towers[key] = { c: c, r: r, lvl: 1, cd: 0, flash: 0 };
        sfx.play('select');
        env.hud({ score: kills * 10 + wave * 50, lives: lives, level: Math.max(1, wave), extra: '金币 ' + gold });
        return true;
      }

      function upgrade(c, r) {
        var t = towers[c + ',' + r];
        if (!t) return false;
        if (t.lvl >= MAXLVL) { float('已满级', '#fca5a5'); return false; }
        if (gold < UP_COST) { float('金币不足', '#fca5a5'); sfx.play('ig'); return false; }
        gold -= UP_COST;
        t.lvl++;
        t.flash = 0.4;
        sfx.play('coin');
        float('Lv.' + t.lvl, '#fde047');
        env.hud({ score: kills * 10 + wave * 50, lives: lives, level: Math.max(1, wave), extra: '金币 ' + gold });
        return true;
      }

      function float(msg, color) {
        floats.push({ msg: msg, color: color || '#fff', t: 0, x: sel ? GX + sel.c * CELL + CELL / 2 : W / 2, y: sel ? GY + sel.r * CELL : H / 2 });
      }

      function startWave() {
        wave++;
        betweenWaves = false;
        spawnQueue = [];
        var n = 4 + Math.min(10, Math.floor(wave * 1.2));
        for (var i = 0; i < n; i++) {
          var roll = Math.random();
          var type = roll < 0.55 ? 'grunt' : roll < 0.82 ? 'runner' : 'tank';
          spawnQueue.push(type);
        }
        spawnT = 400;
        sfx.play('start');
        env.hud({ score: kills * 10 + wave * 50, lives: lives, level: wave, extra: '第 ' + wave + '/' + cfg.waves + ' 波 · 金币 ' + gold });
      }

      function statOf(type) {
        var m = 1 + (wave - 1) * 0.16;
        if (type === 'runner') return { hp: 18 * m, v: 105, r: 9, gold: 6 };
        if (type === 'tank') return { hp: 95 * m, v: 42, r: 14, gold: 16 };
        return { hp: 32 * m, v: 62, r: 11, gold: 9 };
      }

      function towerStat(lvl) {
        return { dmg: 10 + lvl * 7, range: 120 + lvl * 26, rate: 0.85 - lvl * 0.12 };
      }

      function update(dt) {
        var i, j;
        for (i = floats.length - 1; i >= 0; i--) {
          var f = floats[i]; f.t += dt; f.y -= 26 * dt;
          if (f.t > 1.1) floats.splice(i, 1);
        }
        if (over) return;
        /* 虚拟手柄边沿 → 选格 + 建塔/升级（键盘走 onKey，此处补 pad 边沿） */
        if (env.pad.left && !prevPL) moveSel(-1, 0);
        if (env.pad.right && !prevPR) moveSel(1, 0);
        if (env.pad.up && !prevPU) moveSel(0, -1);
        if (env.pad.down && !prevPD) moveSel(0, 1);
        prevPL = env.pad.left; prevPR = env.pad.right; prevPU = env.pad.up; prevPD = env.pad.down;
        var nowA = env.pad.a || env.pad.b;
        if (nowA && !prevA && sel) build(sel.c, sel.r);
        prevA = nowA;
        /* 波次调度 */
        if (betweenWaves) {
          waveTimer -= dt * 1000;
          if (waveTimer <= 0) {
            if (wave >= cfg.waves) {
              over = true; win = true;
              sfx.play('win');
              env.gameOver({ win: true, score: kills * 10 + cfg.waves * 50 + lives * 20, detail: '守住全部 ' + cfg.waves + ' 波！剩余 ' + lives + ' 命' });
              return;
            }
            startWave();
          }
        } else if (spawnQueue.length) {
          spawnT -= dt * 1000;
          if (spawnT <= 0) {
            var tp = spawnQueue.shift();
            var st = statOf(tp);
            enemies.push({ type: tp, wp: 0, x: wp(0).x - 24, y: wp(0).y, hp: st.hp * cfg.hpMul, hp0: st.hp * cfg.hpMul, v: st.v, r: st.r, gold: st.gold, slow: 0 });
            spawnT = 700;
          }
        } else if (!enemies.length) {
          betweenWaves = true;
          waveTimer = 2600;
          gold += 30;
          float('第 ' + wave + ' 波清空 +30', '#a3e635');
          sfx.play('coin');
          if (wave >= cfg.waves) {
            over = true; win = true;
            sfx.play('win');
            env.gameOver({ win: true, score: kills * 10 + cfg.waves * 50 + lives * 20, detail: '守住全部 ' + cfg.waves + ' 波！剩余 ' + lives + ' 命' });
            return;
          }
        }
        /* 敌人移动 */
        for (i = enemies.length - 1; i >= 0; i--) {
          var e = enemies[i];
          var tgt = wp(Math.min(e.wp + 1, PATH.length - 1));
          var dx = tgt.x - e.x, dy = tgt.y - e.y;
          var dd = Math.sqrt(dx * dx + dy * dy);
          var sp = e.v * (e.slow > 0 ? 0.55 : 1);
          if (e.slow > 0) e.slow -= dt;
          if (dd < 4) {
            e.wp++;
            if (e.wp >= PATH.length - 1) {
              enemies.splice(i, 1);
              lives--;
              sfx.play('warn');
              env.hud({ score: kills * 10 + wave * 50, lives: lives, level: Math.max(1, wave), extra: '金币 ' + gold });
              if (lives <= 0) {
                over = true;
                sfx.play('gameover');
                env.gameOver({ score: kills * 10 + wave * 50, detail: '守到第 ' + wave + ' 波 · 击杀 ' + kills });
                return;
              }
              continue;
            }
          } else {
            e.x += dx / dd * sp * dt;
            e.y += dy / dd * sp * dt;
          }
        }
        /* 塔攻击 */
        shootCd -= dt;
        for (var key in towers) {
          var t = towers[key];
          if (t.cd > 0) t.cd -= dt;
          if (t.flash > 0) t.flash -= dt;
          if (t.cd > 0) continue;
          var ts = towerStat(t.lvl);
          var tcx = GX + t.c * CELL + CELL / 2, tcy = GY + t.r * CELL + CELL / 2;
          var best = null, bd = 1e9;
          for (i = 0; i < enemies.length; i++) {
            var en = enemies[i];
            var d = Math.sqrt((en.x - tcx) * (en.x - tcx) + (en.y - tcy) * (en.y - tcy));
            if (d <= ts.range && d < bd) { bd = d; best = en; }
          }
          if (best) {
            t.cd = ts.rate;
            bullets.push({ x: tcx, y: tcy, tx: best, dmg: ts.dmg, sp: 460 });
            if (shootCd <= 0) { sfx.play('ig'); shootCd = 0.18; }
          }
        }
        /* 子弹 */
        for (i = bullets.length - 1; i >= 0; i--) {
          var b = bullets[i];
          var e2 = b.tx;
          if (!e2 || enemies.indexOf(e2) < 0) { bullets.splice(i, 1); continue; }
          var dx2 = e2.x - b.x, dy2 = e2.y - b.y;
          var d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (d2 < 10) {
            e2.hp -= b.dmg;
            e2.slow = 0.3;
            bullets.splice(i, 1);
            if (e2.hp <= 0) {
              enemies.splice(enemies.indexOf(e2), 1);
              kills++;
              gold += e2.gold;
              sfx.play('hit');
              env.hud({ score: kills * 10 + wave * 50, lives: lives, level: Math.max(1, wave), extra: '金币 ' + gold });
            }
            continue;
          }
          b.x += dx2 / d2 * b.sp * dt;
          b.y += dy2 / d2 * b.sp * dt;
        }
      }

      /* ---- 输入 ---- */
      function act(c, r) {
        if (over) return;
        sel = { c: c, r: r };
        build(c, r);
      }
      env.canvas.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        var p = env.pointer(e);
        var cell = cellAt(p.x, p.y);
        if (cell) act(cell.c, cell.r);
      });

      var unbindKey = env.onKey(function (e, type) {
        if (type !== 'down' || over) return;
        var K = e.code;
        if (K === 'Space' || K === 'KeyJ') { e.preventDefault(); if (sel) build(sel.c, sel.r); return; }
        if (K === 'ArrowLeft' || K === 'KeyA') { moveSel(-1, 0); e.preventDefault(); }
        else if (K === 'ArrowRight' || K === 'KeyD') { moveSel(1, 0); e.preventDefault(); }
        else if (K === 'ArrowUp' || K === 'KeyW') { moveSel(0, -1); e.preventDefault(); }
        else if (K === 'ArrowDown' || K === 'KeyS') { moveSel(0, 1); e.preventDefault(); }
      });
      function moveSel(dc, dr) {
        if (!sel) sel = { c: 0, r: 0 };
        sel.c = Math.max(0, Math.min(COLS - 1, sel.c + dc));
        sel.r = Math.max(0, Math.min(ROWS - 1, sel.r + dr));
        sfx.play('select');
      }

      function drawTower(t, hl) {
        var x = GX + t.c * CELL + CELL / 2, y = GY + t.r * CELL + CELL / 2;
        ctx.fillStyle = t.flash > 0 ? '#fde047' : '#a8a29e';
        env.roundRect(x - 16, y - 10, 32, 24, 4); ctx.fill();
        ctx.fillStyle = t.lvl >= 3 ? '#f97316' : t.lvl === 2 ? '#60a5fa' : '#e7e5e4';
        ctx.beginPath(); ctx.arc(x, y - 14, 8 + t.lvl, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Lv' + t.lvl, x, y + 4);
        if (hl) {
          ctx.strokeStyle = '#fde047'; ctx.lineWidth = 2;
          ctx.strokeRect(GX + t.c * CELL + 2, GY + t.r * CELL + 2, CELL - 4, CELL - 4);
        }
      }

      function render() {
        var i;
        /* 背景 */
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(0, 0, W, H);
        /* 网格 */
        for (var r = 0; r < ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            var key = c + ',' + r;
            var x = GX + c * CELL, y = GY + r * CELL;
            if (PATHSET[key]) {
              ctx.fillStyle = '#57534e';
              ctx.fillRect(x, y, CELL, CELL);
            } else {
              ctx.fillStyle = '#292524';
              ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
            }
          }
        }
        /* 路径中心虚线 */
        ctx.strokeStyle = 'rgba(250,250,250,.2)';
        ctx.setLineDash([6, 10]); ctx.lineWidth = 3;
        ctx.beginPath();
        for (i = 0; i < PATH.length; i++) {
          var p2 = wp(i);
          if (i === 0) ctx.moveTo(p2.x, p2.y); else ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        /* 起点/终点 */
        var s0 = wp(0), s1 = wp(PATH.length - 1);
        ctx.fillStyle = '#a3e635'; ctx.font = '16px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('营', s0.x, s0.y);
        ctx.fillStyle = '#f87171';
        ctx.fillText('城', s1.x, s1.y);
        /* 选中格 */
        if (sel) {
          ctx.strokeStyle = 'rgba(253,224,71,.9)'; ctx.lineWidth = 2;
          ctx.strokeRect(GX + sel.c * CELL + 2, GY + sel.r * CELL + 2, CELL - 4, CELL - 4);
        }
        /* 塔 */
        for (var key2 in towers) drawTower(towers[key2], sel && +key2.split(',')[0] === sel.c && +key2.split(',')[1] === sel.r);
        /* 敌人 */
        for (i = 0; i < enemies.length; i++) {
          var e3 = enemies[i];
          ctx.fillStyle = e3.type === 'runner' ? '#f472b6' : e3.type === 'tank' ? '#78716c' : '#fb923c';
          ctx.beginPath(); ctx.arc(e3.x, e3.y, e3.r, 0, Math.PI * 2); ctx.fill();
          /* 血条 */
          var hw = e3.r * 2;
          ctx.fillStyle = 'rgba(0,0,0,.5)';
          ctx.fillRect(e3.x - hw / 2, e3.y - e3.r - 8, hw, 4);
          ctx.fillStyle = '#f87171';
          ctx.fillRect(e3.x - hw / 2, e3.y - e3.r - 8, hw * Math.max(0, e3.hp / e3.hp0), 4);
        }
        /* 子弹 */
        ctx.fillStyle = '#fde047';
        for (i = 0; i < bullets.length; i++) {
          ctx.beginPath(); ctx.arc(bullets[i].x, bullets[i].y, 3.4, 0, Math.PI * 2); ctx.fill();
        }
        /* 浮字 */
        for (i = 0; i < floats.length; i++) {
          var f2 = floats[i];
          ctx.globalAlpha = Math.max(0, 1 - f2.t / 1.1);
          ctx.fillStyle = f2.color;
          ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
          ctx.fillText(f2.msg, f2.x, f2.y);
          ctx.globalAlpha = 1;
        }
        /* 顶部信息 */
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(240,240,240,.65)'; ctx.font = '13px system-ui';
        ctx.fillText('战功', 24, 34);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 28px Consolas, monospace';
        ctx.fillText(String(kills * 10 + wave * 50), 24, 66);
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(240,240,240,.65)'; ctx.font = '13px system-ui';
        ctx.fillText('金币', W - 84, 34);
        ctx.fillStyle = '#fde047'; ctx.font = 'bold 28px Consolas, monospace';
        ctx.fillText(String(gold), W - 84, 66);
        ctx.fillStyle = lives > 3 ? '#a3e635' : '#f87171'; ctx.font = 'bold 22px system-ui';
        ctx.fillText('❤' + lives, W - 28, 66);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(240,240,240,.6)'; ctx.font = '13px system-ui';
        ctx.fillText((diff === 'easy' ? '轻松' : diff === 'hard' ? '困难' : '普通') + ' · ' + (betweenWaves ? '下一波 ' + Math.ceil(waveTimer / 1000) + 's · 第 ' + (wave + 1) + '/' + cfg.waves + ' 波' : '第 ' + wave + '/' + cfg.waves + ' 波') + ' · 点空地建塔(' + BUILD_COST + ') 点塔升级(' + UP_COST + ')', W / 2, 122);
      }

      reset();

      env.loop(function (dt) { update(dt); render(); });

      env.canvas.__auto = {
        build: build,
        buildAt: function (c, r) { sel = { c: c, r: r }; return build(c, r); },
        addGold: function (n) { gold += n; },
        spawnWave: startWave,
        cellFree: function (c, r) { return !PATHSET[c + ',' + r] && !towers[c + ',' + r]; },
        state: function () {
          return { over: over, win: win, gold: gold, lives: lives, wave: wave, kills: kills, enemies: enemies.length, towers: Object.keys(towers).length, betweenWaves: betweenWaves, waves: cfg.waves };
        }
      };

      return {
        start: function () {
          sfx.play('start');
          env.hud({ score: 0, lives: lives, level: 1, extra: '金币 ' + gold });
        },
        restart: function () { reset(); },
        destroy: function () { if (unbindKey) unbindKey(); delete env.canvas.__auto; }
      };
    }
  });
})();
