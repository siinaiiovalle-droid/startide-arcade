/* ==========================================================================
   星潮互动 · 小游戏运行时 (GameKit)
   --------------------------------------------------------------------------
   - GameKit.register(def)   注册一款游戏
   - GameKit.run(def, mount, hooks)  在容器中运行游戏，返回控制器
   每款游戏只需专注玩法本身，缩放 / 输入 / 暂停 / 音效 / 存档由运行时统一处理。

   def 结构：
   {
     id, name:{zh,en}, desc:{zh,en}, genre:{zh,en}, icon, hue,
     logical:{w,h},                      // 逻辑分辨率（游戏按此坐标系绘制）
     controls:{ keyboard:[...], touch:[...] }, // 仅用于展示
     hot:bool, isNew:bool, sound:'battle'|'menu'|'calm'|null,
     create(env) -> { start, pause, resume, restart, destroy }
   }

   env 提供：
     canvas / ctx / W / H      画布与逻辑尺寸（ctx 已按 DPR 缩放）
     sfx                       音效模块
     best                      历史最高分
     pad                       实时输入 {left,right,up,down,a,b}
     keys                      原始按键集合
     onKey(fn)                 键盘事件订阅（返回取消函数）
     pointer(e)                客户端坐标 → 逻辑坐标
     isPaused()
     hud(obj)                  更新 HUD（score/lives/level/extra）
     score(n)                  仅更新分数
     gameOver(info) / win(info)
     storage.get/set/remove    单游戏本地存档
     loop(fn)                  注册主循环回调 fn(dt, t)，自动暂停
     delay(fn, ms) / clearDelay(id)
     raf(fn)
     image(src) / ready         资源加载辅助
   ========================================================================== */

(function (global) {
  'use strict';

  var registry = {};
  var order = [];

  function register(def) {
    if (!def || !def.id) return;
    if (!registry[def.id]) order.push(def.id);
    registry[def.id] = def;
    return def;
  }
  function get(id) { return registry[id]; }
  function all() { return order.map(function (id) { return registry[id]; }); }

  function now() { return (global.performance && global.performance.now) ? global.performance.now() : Date.now(); }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ---------------- 运行时 ---------------- */
  function run(def, mount, hooks) {
    hooks = hooks || {};
    var W = def.logical.w, H = def.logical.h;
    var dpr = Math.min(2, global.devicePixelRatio || 1);

    // 舞台
    var stage = document.createElement('div');
    stage.className = 'gk-stage';
    stage.style.aspectRatio = W + ' / ' + H;
    stage.style.maxWidth = (W / H >= 1.2 ? '' : '520px');
    stage.style.margin = W / H >= 1.2 ? '' : '0 auto';

    var canvas = document.createElement('canvas');
    canvas.className = 'gk-canvas';
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 触屏虚拟手柄
    var touchPad = buildTouchPad(def);
    stage.appendChild(canvas);
    if (touchPad) stage.appendChild(touchPad.el);
    mount.innerHTML = '';
    mount.appendChild(stage);

    /* ---- 输入 ---- */
    var pad = { left: false, right: false, up: false, down: false, a: false, b: false };
    var keys = {};
    var keySubs = [];

    var MAP = {
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'up', KeyW: 'up',
      ArrowDown: 'down', KeyS: 'down',
      Space: 'a', KeyJ: 'a', KeyK: 'a',
      ShiftLeft: 'b', KeyL: 'b', KeyI: 'b'
    };

    function onKeyDown(e) {
      var k = e.code || e.key;
      if (MAP[k]) { pad[MAP[k]] = true; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault(); }
      keys[k] = true; keys[e.key] = true;
      keySubs.forEach(function (fn) { fn(e, 'down'); });
    }
    function onKeyUp(e) {
      var k = e.code || e.key;
      if (MAP[k]) pad[MAP[k]] = false;
      keys[k] = false; keys[e.key] = false;
      keySubs.forEach(function (fn) { fn(e, 'up'); });
    }
    function onBlur() { for (var k in pad) pad[k] = false; }

    global.addEventListener('keydown', onKeyDown);
    global.addEventListener('keyup', onKeyUp);
    global.addEventListener('blur', onBlur);

    if (touchPad) touchPad.bind(pad);

    /* ---- 状态 ---- */
    var state = { running: false, paused: false, over: false, rafId: 0, last: 0, hud: { score: 0, lives: 0, level: 1, extra: '' } };
    var loopCb = null;
    var delays = [];
    var timers = [];
    var game = null;
    var destroyed = false;

    /* ---- env ---- */
    var env = {
      canvas: canvas, ctx: ctx, W: W, H: H, dpr: dpr,
      sfx: global.SFX || { play: function () { }, bgm: function () { } },
      best: def.__best || 0,
      pad: pad,
      keys: keys,
      isPaused: function () { return state.paused || !state.running; },
      isRunning: function () { return state.running && !state.paused; },
      onKey: function (fn) { keySubs.push(fn); return function () { var i = keySubs.indexOf(fn); if (i >= 0) keySubs.splice(i, 1); }; },
      pointer: function (e) {
        var r = canvas.getBoundingClientRect();
        var cx = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
        var cy = (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY);
        return { x: (cx - r.left) * (W / r.width), y: (cy - r.top) * (H / r.height) };
      },
      clamp: clamp,
      rand: function (a, b) { if (b === undefined) { b = a; a = 0; } return a + Math.random() * (b - a); },
      randInt: function (a, b) { if (b === undefined) { b = a; a = 0; } return Math.floor(a + Math.random() * (b - a + 1)); },
      pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
      hud: function (o) { for (var k in o) state.hud[k] = o[k]; hooks.onHud && hooks.onHud(state.hud); },
      score: function (n) { state.hud.score = Math.max(0, Math.round(n)); hooks.onHud && hooks.onHud(state.hud); },
      summary: function () { return state.hud; },

      gameOver: function (info) {
        info = info || {};
        state.over = true; state.running = false;
        stopLoop();
        if (def.sound) env.sfx.bgm(null);
        env.sfx.play(info.win ? 'win' : 'gameover');
        hooks.onGameOver && hooks.onGameOver({
          win: !!info.win,
          score: Math.round(info.score !== undefined ? info.score : state.hud.score),
          level: info.level !== undefined ? info.level : state.hud.level,
          extra: info.extra || '',
          detail: info.detail || ''
        });
      },
      win: function (info) { info = info || {}; info.win = true; env.gameOver(info); },

      storage: {
        get: function (k, d) {
          try { var v = global.localStorage.getItem('gk_' + def.id + '_' + k); return v === null ? d : JSON.parse(v); }
          catch (e) { return d; }
        },
        set: function (k, v) { try { global.localStorage.setItem('gk_' + def.id + '_' + k, JSON.stringify(v)); } catch (e) { } },
        remove: function (k) { try { global.localStorage.removeItem('gk_' + def.id + '_' + k); } catch (e) { } }
      },

      loop: function (fn) { loopCb = fn; return function () { if (loopCb === fn) loopCb = null; }; },
      delay: function (fn, ms) { var id = global.setTimeout(fn, ms); timers.push(id); return id; },
      clearDelay: function (id) { global.clearTimeout(id); var i = timers.indexOf(id); if (i >= 0) timers.splice(i, 1); },
      raf: function (fn) { return global.requestAnimationFrame(fn); },

      image: function (src) {
        var img = new Image();
        img.__ready = false;
        img.onload = function () { img.__ready = true; };
        img.src = src;
        return img;
      },

      // 常用绘图辅助
      text: function (str, x, y, opt) {
        opt = opt || {};
        ctx.save();
        ctx.font = opt.font || ('bold 20px ' + (opt.mono ? 'Consolas, monospace' : 'system-ui, sans-serif'));
        ctx.fillStyle = opt.color || '#fff';
        ctx.textAlign = opt.align || 'left';
        ctx.textBaseline = opt.baseline || 'alphabetic';
        if (opt.shadow) { ctx.shadowColor = opt.shadowColor || 'rgba(0,0,0,.6)'; ctx.shadowBlur = opt.shadowBlur || 6; ctx.shadowOffsetY = 2; }
        if (opt.stroke) { ctx.lineWidth = opt.strokeWidth || 3; ctx.strokeStyle = opt.stroke; ctx.strokeText(str, x, y); }
        ctx.fillText(str, x, y);
        ctx.restore();
      },
      roundRect: function (x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      }
    };

    function frame(t) {
      if (destroyed) return;
      if (!state.last) state.last = t;
      var dt = Math.min(0.05, (t - state.last) / 1000);
      state.last = t;
      if (state.running && !state.paused) {
        if (loopCb) { try { loopCb(dt, t / 1000); } catch (e) { console.error('[GameKit]', def.id, e); } }
      }
      state.rafId = global.requestAnimationFrame(frame);
    }

    function startLoop() { if (!state.rafId) { state.last = 0; state.rafId = global.requestAnimationFrame(frame); } }
    function stopLoop() { if (state.rafId) { global.cancelAnimationFrame(state.rafId); state.rafId = 0; } }

    /* ---- 对外控制器 ---- */
    var controller = {
      def: def,
      env: env,
      state: state,
      start: function () {
        if (!game) return controller;
        if (def.sound) env.sfx.bgm(def.sound);
        state.over = false; state.paused = false;
        state.running = true;
        game.start && game.start();
        startLoop();
        return controller;
      },
      restart: function () {
        stopAllTimers();
        state.hud = { score: 0, lives: 0, level: 1, extra: '' };
        hooks.onHud && hooks.onHud(state.hud);
        state.over = false; state.paused = false;
        if (game && game.restart) { game.restart(); }
        else if (game && game.destroy) { game.destroy(); game = def.create(env); }
        state.running = true;
        if (def.sound) env.sfx.bgm(def.sound);
        startLoop();
        return controller;
      },
      pause: function () { if (state.running && !state.paused) { state.paused = true; state.last = 0; } return controller; },
      resume: function () { if (state.running && state.paused) { state.paused = false; state.last = 0; } return controller; },
      togglePause: function () { state.paused ? controller.resume() : controller.pause(); return controller; },
      destroy: function () {
        destroyed = true;
        stopLoop(); stopAllTimers();
        if (game && game.destroy) { try { game.destroy(); } catch (e) { } }
        global.removeEventListener('keydown', onKeyDown);
        global.removeEventListener('keyup', onKeyUp);
        global.removeEventListener('blur', onBlur);
        if (global.SFX) global.SFX.bgm(null);
        mount.innerHTML = '';
      }
    };

    function stopAllTimers() { timers.forEach(function (t) { global.clearTimeout(t); }); timers.length = 0; }

    game = def.create(env);
    def.__best = env.best;
    return controller;
  }

  /* ---------------- 触屏虚拟手柄 ---------------- */
  function isTouch() {
    return ('ontouchstart' in global) || (global.matchMedia && global.matchMedia('(pointer: coarse)').matches);
  }
  function buildTouchPad(def) {
    if (!def.touchControls) return null;
    var el = document.createElement('div');
    el.className = 'gk-pad' + (isTouch() ? '' : ' gk-pad--optional');
    var ctrl = def.touchControls; // ['left','right','a','b'] 等
    var html = '<div class="gk-pad__dpad">';
    if (ctrl.indexOf('left') >= 0) html += '<button class="gk-pad__btn" data-k="left" aria-label="left">◀</button>';
    if (ctrl.indexOf('up') >= 0) html += '<button class="gk-pad__btn" data-k="up" aria-label="up">▲</button>';
    if (ctrl.indexOf('down') >= 0) html += '<button class="gk-pad__btn" data-k="down" aria-label="down">▼</button>';
    if (ctrl.indexOf('right') >= 0) html += '<button class="gk-pad__btn" data-k="right" aria-label="right">▶</button>';
    html += '</div><div class="gk-pad__acts">';
    if (ctrl.indexOf('b') >= 0) html += '<button class="gk-pad__btn gk-pad__btn--b" data-k="b">B</button>';
    if (ctrl.indexOf('a') >= 0) html += '<button class="gk-pad__btn gk-pad__btn--a" data-k="a">A</button>';
    html += '</div>';
    el.innerHTML = html;

    function bind(pad) {
      var btns = el.querySelectorAll('[data-k]');
      function down(e) {
        var k = this.getAttribute('data-k');
        pad[k] = true; this.classList.add('is-on');
        e.preventDefault();
      }
      function up(e) {
        var k = this.getAttribute('data-k');
        pad[k] = false; this.classList.remove('is-on');
        e.preventDefault();
      }
      btns.forEach(function (b) {
        b.addEventListener('touchstart', down, { passive: false });
        b.addEventListener('touchend', up, { passive: false });
        b.addEventListener('touchcancel', up, { passive: false });
        b.addEventListener('mousedown', down);
        b.addEventListener('mouseup', up);
        b.addEventListener('mouseleave', up);
      });
      // 触屏时禁止页面滚动
      el.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
      el.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    }
    return { el: el, bind: bind };
  }

  /* ---------------- 音效便捷封装（供游戏内调用） ---------------- */
  function sfx(name) { if (global.SFX) global.SFX.play(name); }

  global.GameKit = {
    register: register, get: get, all: all, run: run,
    sfx: sfx, now: now, clamp: clamp, isTouch: isTouch
  };
})(window);
