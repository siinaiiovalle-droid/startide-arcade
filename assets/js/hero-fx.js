/* ==========================================================================
   星潮互动 — 首页 Hero 动态视觉（Canvas 星域引擎演示）
   纯装饰性动画：星空视差 + 舰船 + 弹幕 + 雷达环
   ========================================================================== */

(function (global) {
  'use strict';

  function initHeroFx() {
    var canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var W = 0, H = 0, raf = null, running = true;
    var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var stars = [], shots = [], enemies = [], parts = [];
    var t = 0, last = 0, shotAcc = 0, enemyAcc = 0;

    function resize() {
      var r = canvas.getBoundingClientRect();
      W = Math.max(200, r.width); H = Math.max(150, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    }

    function buildStars() {
      stars = [];
      var n = Math.round((W * H) / 5200);
      for (var i = 0; i < n; i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random(), s: Math.random() * 1.6 + 0.35, v: Math.random() * 26 + 8 });
      }
    }

    function spawnEnemy() {
      enemies.push({
        x: 40 + Math.random() * (W - 80), y: -30,
        v: 42 + Math.random() * 46, r: 9 + Math.random() * 7,
        hue: Math.random() > 0.6 ? '#ff4d9d' : '#7a5cff', phase: Math.random() * 6.28
      });
    }

    function draw(dt) {
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#050a15'); g.addColorStop(0.55, '#070d1c'); g.addColorStop(1, '#0b0f22');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      var neb = ctx.createRadialGradient(W * 0.2, H * 0.15, 0, W * 0.2, H * 0.15, W * 0.7);
      neb.addColorStop(0, 'rgba(56,225,255,.16)'); neb.addColorStop(1, 'rgba(56,225,255,0)');
      ctx.fillStyle = neb; ctx.fillRect(0, 0, W, H);
      var neb2 = ctx.createRadialGradient(W * 0.85, H * 0.85, 0, W * 0.85, H * 0.85, W * 0.65);
      neb2.addColorStop(0, 'rgba(255,77,157,.13)'); neb2.addColorStop(1, 'rgba(255,77,157,0)');
      ctx.fillStyle = neb2; ctx.fillRect(0, 0, W, H);

      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.y += s.v * dt * (0.5 + s.z);
        if (s.y > H + 2) { s.y = -2; s.x = Math.random() * W; }
        ctx.globalAlpha = 0.25 + s.z * 0.75;
        ctx.fillStyle = s.z > 0.82 ? '#a8ecff' : '#e9effc';
        ctx.fillRect(s.x, s.y, s.s, s.s * (1 + s.z * 1.6));
      }
      ctx.globalAlpha = 1;

      t += dt;
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.strokeStyle = 'rgba(56,225,255,.10)';
      ctx.lineWidth = 1;
      for (var rr = 1; rr <= 3; rr++) {
        ctx.beginPath();
        ctx.arc(0, 0, (Math.min(W, H) * 0.16) * rr, 0, Math.PI * 2);
        ctx.stroke();
      }
      var sweep = (t * 0.9) % (Math.PI * 2);
      var sg = ctx.createLinearGradient(0, 0, Math.cos(sweep) * W * 0.4, Math.sin(sweep) * W * 0.4);
      sg.addColorStop(0, 'rgba(56,225,255,.34)'); sg.addColorStop(1, 'rgba(56,225,255,0)');
      ctx.strokeStyle = sg; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(sweep) * Math.min(W, H) * 0.48, Math.sin(sweep) * Math.min(W, H) * 0.48);
      ctx.stroke();
      ctx.restore();

      enemyAcc += dt;
      if (enemyAcc > 0.78 && enemies.length < 5) { enemyAcc = 0; spawnEnemy(); }
      for (var e = enemies.length - 1; e >= 0; e--) {
        var en = enemies[e];
        en.y += en.v * dt;
        en.phase += dt * 2.4;
        var ex = en.x + Math.sin(en.phase) * 16;
        ctx.save();
        ctx.translate(ex, en.y);
        ctx.rotate(t * 1.2);
        ctx.beginPath();
        ctx.moveTo(0, -en.r); ctx.lineTo(en.r * 0.9, 0); ctx.lineTo(0, en.r); ctx.lineTo(-en.r * 0.9, 0);
        ctx.closePath();
        ctx.fillStyle = en.hue;
        ctx.shadowColor = en.hue; ctx.shadowBlur = 14;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.restore();
        if (en.y > H + 40) enemies.splice(e, 1);
      }
      ctx.globalAlpha = 1;

      shotAcc += dt;
      if (shotAcc > 0.22) {
        shotAcc = 0;
        shots.push({ x: W * 0.5 + Math.sin(t * 1.1) * Math.min(60, W * 0.14) + (Math.random() - 0.5) * 8, y: H * 0.74, v: -(320 + Math.random() * 180) });
      }
      ctx.save();
      ctx.shadowColor = '#38e1ff'; ctx.shadowBlur = 12;
      ctx.fillStyle = '#bff3ff';
      for (var k = shots.length - 1; k >= 0; k--) {
        var sh = shots[k];
        sh.y += sh.v * dt;
        ctx.fillRect(sh.x - 1.6, sh.y, 3.2, 15);
        if (sh.y < -20) shots.splice(k, 1);
      }
      ctx.restore();

      for (var p = parts.length - 1; p >= 0; p--) {
        var pt = parts[p];
        pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 60 * dt; pt.life -= dt * 1.5;
        if (pt.life <= 0) { parts.splice(p, 1); continue; }
        ctx.globalAlpha = Math.max(0, pt.life);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, 2.6, 2.6);
      }
      ctx.globalAlpha = 1;

      var px = W * 0.5 + Math.sin(t * 1.1) * Math.min(60, W * 0.14);
      var py = H * 0.78 + Math.cos(t * 0.9) * 5;
      ctx.save();
      ctx.translate(px, py);
      var flame = 14 + Math.sin(t * 26) * 5;
      var fg = ctx.createLinearGradient(0, 8, 0, 8 + flame);
      fg.addColorStop(0, 'rgba(56,225,255,.95)'); fg.addColorStop(1, 'rgba(56,225,255,0)');
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.moveTo(-5, 8); ctx.lineTo(5, 8); ctx.lineTo(0, 8 + flame); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -17); ctx.lineTo(12, 9); ctx.lineTo(4, 6); ctx.lineTo(0, 12); ctx.lineTo(-4, 6); ctx.lineTo(-12, 9);
      ctx.closePath();
      var hg = ctx.createLinearGradient(0, -17, 0, 12);
      hg.addColorStop(0, '#e9fbff'); hg.addColorStop(0.5, '#38e1ff'); hg.addColorStop(1, '#1a6ea8');
      ctx.fillStyle = hg;
      ctx.shadowColor = '#38e1ff'; ctx.shadowBlur = 20;
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = 'rgba(56,225,255,.03)';
      ctx.fillRect(0, (t * 90) % H, W, 2);
    }

    function frame(ts) {
      if (!running) return;
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts;
      draw(dt);
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!raf && running) raf = requestAnimationFrame(frame); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } last = 0; }

    resize();
    global.addEventListener('resize', function () { setTimeout(resize, 120); });
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running) start(); else stop();
    });

    if (reduce) { draw(0.016); return; }
    start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHeroFx);
  else initHeroFx();
})(window);
