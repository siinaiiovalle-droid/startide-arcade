/* ==========================================================================
   星际战机 2 Star Raider 2 —— 续作（Boss 强化版）
   三种 BOSS：弹幕型 / 瞄准激光型 / 召唤机群型；半血狂暴阶段
   僚机 drone 新道具；击败第 9 波最终 BOSS 通关
   原版《星际战机》保留为独立游戏
   ========================================================================== */
(function () {
  'use strict';

  GameKit.register({
    id: 'shooter2',
    name: { zh: '星际战机 2', en: 'Star Raider 2' },
    desc: { zh: 'BOSS 决战版：三种 BOSS 轮番上阵——弹幕风暴、瞄准激光、召唤机群，半血狂暴！集齐僚机，击败第 9 波终极 BOSS！', en: 'Boss showdown: three rotating bosses — bullet storm, aimed beam and summoner — all raging at half health! Collect wingman drones and beat the final boss on wave 9!' },
    genre: { zh: '弹幕射击', en: 'Shoot \'em up' },
    icon: '👾', hue: '#ff5c6c',
    logical: { w: 500, h: 760 },
    hot: false, isNew: true, sound: 'battle',
    touchControls: ['left', 'right', 'up', 'down', 'a', 'b'],
    controls: {
      keyboard: [
        { k: '← → ↑ ↓ / WASD', zh: '移动战机', en: 'Move ship' },
        { k: '空格 / J / K', zh: '聚焦射击（自动开火）', en: 'Focus fire (auto-fire)' },
        { k: 'Shift / L', zh: '释放炸弹', en: 'Release bomb' }
      ],
      touch: [
        { k: '左侧方向键', zh: '移动战机', en: 'Move ship' },
        { k: 'B 键', zh: '释放炸弹', en: 'Release bomb' }
      ]
    },

    create: function (env) {
      var W = env.W, H = env.H, ctx = env.ctx, sfx = env.sfx;

      var DIFF = {
        easy: { hp: 0.8, fire: 1.25, mult: 0.8, label: '轻松' },
        normal: { hp: 1.0, fire: 1.0, mult: 1.0, label: '标准' },
        hard: { hp: 1.25, fire: 0.8, mult: 1.3, label: '困难' }
      };
      var diff = 'normal';
      try {
        var gc = window.Store && window.Store.get && window.Store.get().gameConfig;
        if (gc && gc.difficulty) diff = gc.difficulty;
      } catch (e) { }
      if (!DIFF[diff]) diff = 'normal';
      var cfg = DIFF[diff];

      var player, bullets, ebullets, enemies, parts, drops, stars, drones;
      var wave, spawnLeft, spawnTimer, between, betweenTimer, banner, bannerT;
      var score, lives, bombs, fireCd, prev, shake, t0, over, bossAlive, finished, finishT;

      function reset() {
        player = { x: W / 2, y: H - 100, r: 16, speed: 330, inv: 1.4, power: 1, alive: true };
        bullets = []; ebullets = []; enemies = []; parts = []; drops = []; drones = [];
        stars = [];
        for (var i = 0; i < 130; i++) {
          stars.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * 2 + 0.4, s: Math.random() * 1.6 + 0.4 });
        }
        wave = 1; spawnLeft = 0; spawnTimer = 0; between = false; betweenTimer = 0;
        banner = ''; bannerT = 0;
        score = 0; lives = 3; bombs = 2; fireCd = 0; prev = {};
        shake = 0; t0 = 0; over = false; bossAlive = false; finished = false; finishT = 0;
        startWave();
        env.hud({ score: 0, lives: lives, level: 1, extra: '💣 x2 · ' + cfg.label });
      }

      function startWave() {
        if (wave % 3 === 0) { spawnBoss(); }
        else {
          spawnLeft = 4 + Math.round(wave * 1.6);
          spawnTimer = 0.4;
          banner = '第 ' + wave + ' 波'; bannerT = 1.2;
        }
        env.hud({ level: wave });
      }

      function spawnEnemy() {
        var r = Math.random(), type = 'grunt';
        var maxTier = wave < 3 ? 1 : (wave < 6 ? 2 : 3);
        if (r > 0.78 && maxTier >= 2) type = 'zig';
        if (r > 0.88 && maxTier >= 3) type = 'shooter';
        if (r < 0.1 && wave > 4) type = 'tank';
        var e = {
          type: type, x: 40 + Math.random() * (W - 80), y: -40, r: 18,
          vy: 70 + Math.random() * 40 + wave * 3, vx: 0,
          hp: 2, maxhp: 2, fire: 0, phase: Math.random() * 6.28, hue: '#ff5c6c', score: 100
        };
        if (type === 'zig') { e.hp = e.maxhp = 3; e.vx = 90; e.hue = '#ffb020'; e.score = 160; }
        if (type === 'shooter') { e.hp = e.maxhp = 5; e.hue = '#ff4d9d'; e.score = 240; e.fire = 1.4; }
        if (type === 'tank') { e.hp = e.maxhp = 12; e.r = 26; e.vy = 46; e.hue = '#7a5cff'; e.score = 420; }
        enemies.push(e);
      }

      /* ---------- 三种 BOSS ---------- */
      var BOSS_NAMES = { spread: '弹幕之主', beam: '激光执政官', summon: '蜂群母舰' };
      function spawnBoss() {
        bossAlive = true;
        var no = wave / 3;                     /* 1 / 2 / 3 */
        var kind = ['spread', 'beam', 'summon'][Math.min(2, no - 1)];
        var hp = Math.round((110 + no * 55) * cfg.hp);
        enemies.push({
          type: 'boss', bossKind: kind, bossNo: no,
          x: W / 2, y: -90, r: 52, hp: hp, maxhp: hp, vx: 120, vy: 60,
          fire: 1.2, phase: 0, entering: true, rage: false,
          aimT: 0, aimAng: Math.PI / 2, summonT: 2,
          hue: kind === 'spread' ? '#ff4d9d' : kind === 'beam' ? '#ffb020' : '#7a5cff',
          score: 3000 + no * 1500
        });
        banner = 'BOSS ⚔ ' + BOSS_NAMES[kind]; bannerT = 2.0;
        sfx.play('boss');
      }

      function dropAt(x, y, forced, kind) {
        var r = Math.random();
        if (!forced && r > 0.16) return;
        var kinds = kind ? [kind] : ['power', 'power', 'shield', 'bomb'];
        if (!kind && r < 0.05) kinds = ['drone'];
        var k = kind || kinds[Math.floor(Math.random() * kinds.length)];
        drops.push({ x: x, y: y, vy: 90, kind: k, r: 14, t: 0 });
      }

      function burst(x, y, color, n, spd) {
        for (var i = 0; i < n; i++) {
          var a = Math.random() * 6.283, s = (spd || 160) * (0.3 + Math.random() * 0.9);
          parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.5, max: 0.9, c: color, r: 1.5 + Math.random() * 3 });
        }
      }

      function playerFire() {
        var lv = player.power;
        var sp = 720;
        function add(ox, oy, vx) { bullets.push({ x: player.x + ox, y: player.y + oy, vx: vx || 0, vy: -sp, r: 3.4, dmg: 1 }); }
        if (lv === 1) add(0, -20);
        else if (lv === 2) { add(-9, -14); add(9, -14); }
        else if (lv === 3) { add(0, -24); add(-13, -10, -60); add(13, -10, 60); }
        else { add(0, -26); add(-11, -14); add(11, -14); add(-17, -6, -160); add(17, -6, 160); }
        sfx.play('shoot');
      }

      function useBomb() {
        if (bombs <= 0) return;
        bombs--;
        env.hud({ extra: '💣 x' + bombs });
        sfx.play('explosion');
        shake = 16;
        ebullets.length = 0;
        enemies.forEach(function (e) { damage(e, 6); });
        for (var i = 0; i < 6; i++) burst(Math.random() * W, Math.random() * H * 0.7, '#38e1ff', 14, 260);
      }

      function damage(e, d) {
        e.hp -= d;
        e.flash = 0.12;
        if (e.type === 'boss' && !e.rage && e.hp > 0 && e.hp < e.maxhp * 0.4) {
          e.rage = true;
          banner = 'BOSS 狂暴！'; bannerT = 1.2;
          sfx.play('warn');
          burst(e.x, e.y, '#ffb020', 30, 260);
        }
        if (e.hp <= 0) {
          e.dead = true;
          score += e.score;
          sfx.play(e.type === 'boss' ? 'explosion' : 'hit');
          burst(e.x, e.y, e.hue, e.type === 'boss' ? 60 : 14, e.type === 'boss' ? 320 : 180);
          if (e.type === 'boss') {
            shake = 20;
            for (var i = 0; i < 5; i++) dropAt(e.x + (i - 2) * 40, e.y, true, i === 2 ? 'drone' : undefined);
            bossAlive = false;
            if (wave >= 9 && !finished) { finished = true; finishT = 0; banner = '最终 BOSS 击破！'; bannerT = 3; }
          }
          else dropAt(e.x, e.y);
        }
      }

      function update(dt) {
        t0 += dt;
        if (shake > 0) shake = Math.max(0, shake - dt * 40);
        if (bannerT > 0) bannerT = Math.max(0, bannerT - dt);

        if (finished) {
          finishT += dt;
          parts = parts.filter(function (p) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.life > 0; });
          if (finishT > 1.4 && !over) {
            over = true;
            env.win({ score: Math.round(score * cfg.mult), detail: '三场 BOSS 全灭' });
          }
          return;
        }

        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          s.y += (60 + s.z * 90) * dt * (between ? 1.6 : 1);
          if (s.y > H) { s.y = -2; s.x = Math.random() * W; }
        }

        /* 玩家移动 */
        var dx = (env.pad.right ? 1 : 0) - (env.pad.left ? 1 : 0);
        var dy = (env.pad.down ? 1 : 0) - (env.pad.up ? 1 : 0);
        if (dx && dy) { dx *= 0.707; dy *= 0.707; }
        player.x = env.clamp(player.x + dx * player.speed * dt, 20, W - 20);
        player.y = env.clamp(player.y + dy * player.speed * dt, 60, H - 30);
        player.inv = Math.max(0, player.inv - dt);
        player.thrust = (player.thrust || 0) + dt;

        if (env.pad.b && !prev.b) useBomb();

        fireCd -= dt;
        if (fireCd <= 0) { playerFire(); fireCd = player.power >= 3 ? 0.1 : 0.13; }

        /* 僚机跟随 + 射击 */
        drones.forEach(function (d, di) {
          var side = di === 0 ? -1 : 1;
          var tx = player.x + side * 40, ty = player.y + 12;
          d.x += (tx - d.x) * Math.min(1, dt * 8);
          d.y += (ty - d.y) * Math.min(1, dt * 8);
          d.cd -= dt;
          if (d.cd <= 0) {
            d.cd = 0.55;
            bullets.push({ x: d.x, y: d.y - 10, vx: 0, vy: -640, r: 2.8, dmg: 1 });
          }
        });

        bullets = bullets.filter(function (b) { b.x += b.vx * dt; b.y += b.vy * dt; return b.y > -20 && b.x > -20 && b.x < W + 20; });
        ebullets = ebullets.filter(function (b) { b.x += b.vx * dt; b.y += b.vy * dt; return b.y < H + 20 && b.y > -20 && b.x > -20 && b.x < W + 20; });

        /* 敌人 */
        enemies.forEach(function (e) {
          if (e.flash) e.flash = Math.max(0, e.flash - dt);
          if (e.type === 'boss') {
            var rf = e.rage ? 0.62 : 1;
            if (e.entering) { e.y += 40 * dt; if (e.y >= 110) { e.y = 110; e.entering = false; } }
            else {
              e.phase += dt;
              var spd = e.rage ? 1.5 : 1;
              e.x += e.vx * spd * dt;
              if (e.x < 70 || e.x > W - 70) { e.vx *= -1; e.x = env.clamp(e.x, 70, W - 70); }
              e.y = 110 + Math.sin(e.phase * 1.4) * 26;

              if (e.bossKind === 'spread') {
                e.fire -= dt * rf;
                if (e.fire <= 0) {
                  e.fire = Math.max(0.45, (1.25 - e.bossNo * 0.12));
                  var n = e.rage ? 11 : 7 + e.bossNo * 1, base = Math.random() * 6.283;
                  for (var k = 0; k < n; k++) {
                    var a = base + k * 6.283 / n;
                    ebullets.push({ x: e.x, y: e.y + 30, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150 + 60, r: 5, c: '#ff4d9d' });
                  }
                  sfx.play('laser');
                }
              } else if (e.bossKind === 'beam') {
                e.aimT += dt;
                if (e.aimT < 0.7) {
                  e.aimAng = Math.atan2(player.y - e.y, player.x - e.x);
                } else if (e.aimT >= 0.9) {
                  e.aimT = 0;
                  for (var q = 0; q < 8; q++) {
                    ebullets.push({
                      x: e.x, y: e.y + 26,
                      vx: Math.cos(e.aimAng) * (420 + q * 40), vy: Math.sin(e.aimAng) * (420 + q * 40),
                      r: 5.5, c: '#ffb020'
                    });
                  }
                  sfx.play('explosion');
                }
              } else {
                e.fire -= dt * rf;
                if (e.fire <= 0) {
                  e.fire = 1.1;
                  var n2 = 5, base2 = Math.random() * 6.283;
                  for (var k2 = 0; k2 < n2; k2++) {
                    var a2 = base2 + k2 * 6.283 / n2;
                    ebullets.push({ x: e.x, y: e.y + 30, vx: Math.cos(a2) * 130, vy: Math.sin(a2) * 130 + 60, r: 5, c: '#7a5cff' });
                  }
                }
                e.summonT -= dt;
                if (e.summonT <= 0 && enemies.length < 9) {
                  e.summonT = e.rage ? 1.4 : 2.4;
                  for (var m = 0; m < 2; m++) {
                    enemies.push({
                      type: 'grunt', x: e.x + (m === 0 ? -46 : 46), y: e.y, r: 16,
                      vy: 120, vx: 0, hp: 2, maxhp: 2, fire: 0, phase: 0,
                      hue: '#b0a0ff', score: 100
                    });
                  }
                  sfx.play('laser');
                }
              }
            }
          } else {
            e.y += e.vy * dt;
            if (e.type === 'zig') { e.phase += dt * 3; e.x += Math.cos(e.phase) * 120 * dt; }
            if (e.x < 24) e.x = 24; if (e.x > W - 24) e.x = W - 24;
            if (e.type === 'shooter' && e.y > 40) {
              e.fire -= dt;
              if (e.fire <= 0) {
                e.fire = 1.6;
                var ang = Math.atan2(player.y - e.y, player.x - e.x);
                ebullets.push({ x: e.x, y: e.y + 16, vx: Math.cos(ang) * 230, vy: Math.sin(ang) * 230, r: 4.5, c: '#ff4d9d' });
              }
            }
          }
        });
        enemies = enemies.filter(function (e) {
          if (e.dead) return false;
          if (e.y - e.r > H + 20 && e.type !== 'boss') return false;
          return true;
        });

        /* 子弹 × 敌人 */
        for (var bi = bullets.length - 1; bi >= 0; bi--) {
          var b = bullets[bi];
          for (var ei = 0; ei < enemies.length; ei++) {
            var e = enemies[ei];
            var d2 = (b.x - e.x) * (b.x - e.x) + (b.y - e.y) * (b.y - e.y);
            if (d2 < (e.r + b.r) * (e.r + b.r)) {
              damage(e, b.dmg);
              burst(b.x, b.y, '#ffffff', 3, 90);
              bullets.splice(bi, 1);
              break;
            }
          }
        }

        /* 玩家受击 */
        if (player.inv <= 0) {
          var hit = false;
          for (var qi = ebullets.length - 1; qi >= 0; qi--) {
            var eb = ebullets[qi];
            if (Math.hypot(eb.x - player.x, eb.y - player.y) < eb.r + 9) { ebullets.splice(qi, 1); hit = true; break; }
          }
          if (!hit) {
            for (var ei2 = 0; ei2 < enemies.length; ei2++) {
              var e2 = enemies[ei2];
              if (e2.entering) continue;
              if (Math.hypot(e2.x - player.x, e2.y - player.y) < e2.r + 12) { hit = true; damage(e2, 4); break; }
            }
          }
          if (hit) {
            lives--; player.inv = 2.0; player.power = Math.max(1, player.power - 1);
            if (drones.length > 0) drones.pop();
            shake = 14; sfx.play('explosion');
            burst(player.x, player.y, '#38e1ff', 26, 240);
            env.hud({ lives: lives });
            if (lives < 0) { over = true; env.gameOver({ score: Math.round(score * cfg.mult), detail: '第 ' + wave + ' 波坠机' }); return; }
          }
        }

        drops = drops.filter(function (d) {
          d.t += dt; d.y += d.vy * dt;
          var dd = Math.hypot(d.x - player.x, d.y - player.y);
          if (dd < d.r + 20) {
            if (d.kind === 'power') { player.power = Math.min(4, player.power + 1); sfx.play('powerup'); env.hud({ extra: '⚡ Lv' + player.power }); }
            else if (d.kind === 'shield') { player.inv = Math.max(player.inv, 4); sfx.play('life'); }
            else if (d.kind === 'bomb') { bombs = Math.min(5, bombs + 1); sfx.play('coin'); env.hud({ extra: '💣 x' + bombs }); }
            else if (d.kind === 'drone') {
              if (drones.length < 2) { drones.push({ x: player.x, y: player.y, cd: 0.3 }); sfx.play('powerup'); env.hud({ extra: '🛰 x' + drones.length }); }
              else { score += 200; sfx.play('coin'); }
            }
            else if (d.kind === 'life') { lives++; sfx.play('life'); env.hud({ lives: lives }); }
            score += 50;
            return false;
          }
          return d.y < H + 30;
        });

        parts = parts.filter(function (p) {
          p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96;
          return p.life > 0;
        });

        if (!bossAlive) {
          if (spawnLeft > 0) {
            spawnTimer -= dt;
            if (spawnTimer <= 0) { spawnEnemy(); spawnLeft--; spawnTimer = Math.max(0.22, 0.85 - wave * 0.035); }
          } else if (enemies.length === 0) {
            if (!between) { between = true; betweenTimer = 1.3; }
            else { betweenTimer -= dt; if (betweenTimer <= 0) { between = false; wave++; startWave(); } }
          }
        }

        env.score(score);
        prev = { b: env.pad.b };
      }

      function drawShip(x, y, inv) {
        ctx.save();
        ctx.translate(x, y);
        if (inv > 0 && Math.floor(t0 * 14) % 2 === 0) ctx.globalAlpha = 0.35;
        var fl = 10 + Math.sin(t0 * 40) * 4;
        var g = ctx.createLinearGradient(0, 14, 0, 22 + fl);
        g.addColorStop(0, 'rgba(56,225,255,.9)');
        g.addColorStop(1, 'rgba(56,225,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(-6, 12); ctx.lineTo(6, 12); ctx.lineTo(0, 22 + fl); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffe3e8';
        ctx.beginPath();
        ctx.moveTo(0, -20); ctx.lineTo(9, 4); ctx.lineTo(16, 14); ctx.lineTo(4, 12);
        ctx.lineTo(0, 16); ctx.lineTo(-4, 12); ctx.lineTo(-16, 14); ctx.lineTo(-9, 4);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff5c6c';
        ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(5, 2); ctx.lineTo(0, 8); ctx.lineTo(-5, 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(255,180,200,.9)'; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.restore();
        if (inv > 0.6) {
          ctx.save();
          ctx.strokeStyle = 'rgba(46,230,168,' + (0.5 + Math.sin(t0 * 12) * 0.3) + ')';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, 26, 0, 6.283); ctx.stroke();
          ctx.restore();
        }
      }

      function drawDrone(d) {
        ctx.save();
        ctx.translate(d.x, d.y);
        ctx.fillStyle = '#ffd166'; ctx.shadowColor = '#ffb020'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
        ctx.restore();
      }

      function drawEnemy(e) {
        ctx.save();
        ctx.translate(e.x, e.y);
        var c = e.flash ? '#ffffff' : (e.rage && e.type === 'boss' ? (Math.floor(t0 * 10) % 2 ? '#ffffff' : e.hue) : e.hue);
        if (e.type === 'boss') {
          ctx.shadowColor = c; ctx.shadowBlur = 26;
          ctx.fillStyle = c;
          if (e.bossKind === 'beam') {
            ctx.beginPath();
            ctx.moveTo(0, 44); ctx.lineTo(24, 10); ctx.lineTo(54, -2); ctx.lineTo(20, -34); ctx.lineTo(-20, -34); ctx.lineTo(-54, -2); ctx.lineTo(-24, 10);
            ctx.closePath(); ctx.fill();
          } else if (e.bossKind === 'summon') {
            ctx.beginPath(); ctx.ellipse(0, 0, 54, 40, 0, 0, 6.283); ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(0, 40); ctx.lineTo(50, 6); ctx.lineTo(30, -30); ctx.lineTo(-30, -30); ctx.lineTo(-50, 6);
            ctx.closePath(); ctx.fill();
          }
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#0b1224';
          ctx.beginPath(); ctx.arc(0, 0, 20, 0, 6.283); ctx.fill();
          ctx.fillStyle = e.rage ? '#ff5c6c' : '#ffd166';
          ctx.beginPath(); ctx.arc(0, 0, 10, 0, 6.283); ctx.fill();
          var p = Math.max(0, e.hp / e.maxhp);
          ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(-52, -52, 104, 8);
          ctx.fillStyle = p > 0.4 ? '#2ee6a8' : '#ff5c6c'; ctx.fillRect(-50, -50, 100 * p, 4);
          ctx.restore();

          /* 激光瞄准预警线 */
          if (e.bossKind === 'beam' && !e.entering && e.aimT > 0.15 && e.aimT < 0.9) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,176,32,' + (0.25 + 0.55 * (e.aimT / 0.9)) + ')';
            ctx.lineWidth = 2 + e.aimT * 3;
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            ctx.lineTo(e.x + Math.cos(e.aimAng) * 900, e.y + Math.sin(e.aimAng) * 900);
            ctx.stroke();
            ctx.restore();
          }
          return;
        }
        ctx.fillStyle = c;
        ctx.shadowColor = c; ctx.shadowBlur = 14;
        if (e.type === 'tank') {
          ctx.beginPath(); ctx.moveTo(0, 24); ctx.lineTo(22, 0); ctx.lineTo(14, -18); ctx.lineTo(-14, -18); ctx.lineTo(-22, 0); ctx.closePath(); ctx.fill();
        } else if (e.type === 'shooter') {
          ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(20, -6); ctx.lineTo(0, -14); ctx.lineTo(-20, -6); ctx.closePath(); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(0, 0, e.r, 0, 6.283); ctx.fill();
          ctx.fillStyle = '#0b1224'; ctx.beginPath(); ctx.arc(0, 0, e.r * 0.45, 0, 6.283); ctx.fill();
        }
        ctx.restore();
        if (e.maxhp > 2) {
          var pp = Math.max(0, e.hp / e.maxhp);
          ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - 16, e.y - e.r - 9, 32, 4);
          ctx.fillStyle = '#2ee6a8'; ctx.fillRect(e.x - 16, e.y - e.r - 9, 32 * pp, 4);
        }
      }

      function drawDrop(d) {
        ctx.save(); ctx.translate(d.x, d.y);
        var col = d.kind === 'power' ? '#38e1ff' : d.kind === 'shield' ? '#2ee6a8' : d.kind === 'bomb' ? '#ffb020' : d.kind === 'drone' ? '#ffd166' : '#ff4d9d';
        ctx.rotate(d.t * 3);
        ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.fillStyle = col;
        env.roundRect(-11, -11, 22, 22, 6); ctx.fill();
        ctx.rotate(-d.t * 3);
        ctx.shadowBlur = 0; ctx.fillStyle = '#06101c';
        ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(d.kind === 'power' ? '⚡' : d.kind === 'shield' ? '🛡' : d.kind === 'bomb' ? '💣' : d.kind === 'drone' ? '🛰' : '♥', 0, 1);
        ctx.restore();
      }

      function render() {
        ctx.save();
        if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#0d0a18'); g.addColorStop(0.5, '#1a0f30'); g.addColorStop(1, '#241040');
        ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);

        stars.forEach(function (s) {
          ctx.globalAlpha = 0.25 + s.z * 0.4;
          ctx.fillStyle = s.z > 1.6 ? '#ffd6de' : '#8f7da8';
          ctx.fillRect(s.x, s.y, s.s, s.s + s.z * 2);
        });
        ctx.globalAlpha = 1;

        drops.forEach(drawDrop);
        enemies.forEach(drawEnemy);

        bullets.forEach(function (b) {
          ctx.shadowColor = '#ff8a9a'; ctx.shadowBlur = 12;
          ctx.fillStyle = '#fff0f3';
          env.roundRect(b.x - 2, b.y - 9, 4, 14, 2); ctx.fill();
          ctx.shadowBlur = 0;
        });
        ebullets.forEach(function (b) {
          ctx.shadowColor = b.c; ctx.shadowBlur = 14; ctx.fillStyle = b.c;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.fill();
          ctx.shadowBlur = 0;
        });
        parts.forEach(function (p) {
          ctx.globalAlpha = Math.max(0, p.life / p.max);
          ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        });
        ctx.globalAlpha = 1;

        drones.forEach(drawDrone);
        if (!over && lives >= 0) drawShip(player.x, player.y, player.inv);

        ctx.restore();

        if (bannerT > 0) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, bannerT * 1.6);
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 32px system-ui';
          ctx.shadowColor = 'rgba(255,92,108,.9)'; ctx.shadowBlur = 22;
          ctx.fillText(banner, W / 2, H * 0.34);
          ctx.restore();
        }
      }

      reset();
      env.loop(function (dt) { if (over) return; update(dt); render(); });

      /* 自动化钩子 */
      env.canvas.__auto = {
        state: function () {
          var boss = null;
          enemies.forEach(function (e) { if (e.type === 'boss') boss = { kind: e.bossKind, hp: e.hp, maxhp: e.maxhp, rage: e.rage, entering: e.entering }; });
          return { score: score, lives: lives, wave: wave, bombs: bombs, drones: drones.length, px: player.x, boss: boss, over: over, finished: finished, phase: over ? 'over' : (finished ? 'win' : 'play') };
        },
        killBoss: function () {
          enemies.forEach(function (e) { if (e.type === 'boss') damage(e, 99999); });
        },
        skipWave: function (w) { wave = w - 1; between = false; enemies.length = 0; spawnLeft = 0; bossAlive = false; wave++; startWave(); },
        hurt: function () { player.inv = 0; lives--; player.inv = 2.0; env.hud({ lives: lives }); if (lives < 0) { over = true; env.gameOver({ score: Math.round(score * cfg.mult), detail: '第 ' + wave + ' 波坠机' }); } },
        giveDrone: function () { if (drones.length < 2) drones.push({ x: player.x, y: player.y, cd: 0.2 }); }
      };

      return {
        start: function () { sfx.play('start'); },
        restart: function () { reset(); },
        destroy: function () { },
        /* 自动化钩子 */
        state: function () {
          var boss = null;
          enemies.forEach(function (e) { if (e.type === 'boss') boss = { kind: e.bossKind, hp: e.hp, maxhp: e.maxhp, rage: e.rage, entering: e.entering }; });
          return { score: score, lives: lives, wave: wave, bombs: bombs, drones: drones.length, px: player.x, boss: boss, over: over, finished: finished, phase: over ? 'over' : (finished ? 'win' : 'play') };
        },
        killBoss: function () {
          enemies.forEach(function (e) { if (e.type === 'boss') damage(e, 99999); });
        },
        skipWave: function (w) { wave = w - 1; between = false; enemies.length = 0; spawnLeft = 0; bossAlive = false; wave++; startWave(); },
        hurt: function () { player.inv = 0; lives--; player.inv = 2.0; env.hud({ lives: lives }); if (lives < 0) { over = true; env.gameOver({ score: Math.round(score * cfg.mult), detail: '第 ' + wave + ' 波坠机' }); } },
        giveDrone: function () { if (drones.length < 2) drones.push({ x: player.x, y: player.y, cd: 0.2 }); }
      };
    }
  });
})();
