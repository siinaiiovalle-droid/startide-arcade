/* ==========================================================================
   星潮互动 · 音效引擎 (SFX)
   --------------------------------------------------------------------------
   使用 Web Audio API 实时合成音效与背景音乐（Chiptune），
   不依赖任何外部音频文件 —— 首包更小、全球访问都不会出现音效加载失败。
   - SFX.play('jump')      播放一次音效
   - SFX.bgm('menu')       播放循环背景音乐（'menu' | 'battle' | 'calm' | null）
   - SFX.setMuted(bool)    静音开关（状态写入 localStorage）
   - SFX.unlock()          在用户手势中调用以解锁移动端自动播放限制
   ========================================================================== */

(function (global) {
  'use strict';

  var MUTE_KEY = 'startide_muted_v1';
  var ctx = null;
  var master = null;   // 总线
  var sfxBus = null;   // 音效
  var musicBus = null; // 音乐
  var muted = false;

  try { muted = global.localStorage.getItem(MUTE_KEY) === '1'; } catch (e) { }

  function AC() {
    return global.AudioContext || global.webkitAudioContext;
  }

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { } }
      return ctx;
    }
    var Ctor = AC();
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch (e) { return null; }
    master = ctx.createGain();
    master.gain.value = muted ? 0.0001 : 0.9;
    master.connect(ctx.destination);

    // 轻微压缩，避免多个音效叠加时削波
    var comp = ctx.createBiquadFilter();
    comp.type = 'highpass';
    comp.frequency.value = 55;
    master.connect(comp);
    comp.connect(ctx.destination);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.62;
    sfxBus.connect(master);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.22;
    musicBus.connect(master);
    return ctx;
  }

  /* ---------------- 基础发声单元 ---------------- */

  // 单个振荡器音符
  function note(o) {
    var c = ensure();
    if (!c || muted) return;
    var t0 = c.currentTime + (o.delay || 0);
    var dur = o.dur || 0.12;
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = o.wave || 'square';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) {
      if (o.expo !== false) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + dur);
      else osc.frequency.linearRampToValueAtTime(Math.max(1, o.to), t0 + dur);
    }
    var peak = o.gain === undefined ? 0.5 : o.gain;
    var atk = o.attack === undefined ? 0.005 : o.attack;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    if (o.lowpass) {
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lowpass;
      osc.connect(f); f.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(o.bus || sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // 噪声（爆炸 / 打击）
  function noise(o) {
    var c = ensure();
    if (!c || muted) return;
    var t0 = c.currentTime + (o.delay || 0);
    var dur = o.dur || 0.25;
    var len = Math.ceil(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = c.createBufferSource();
    src.buffer = buf;
    var g = c.createGain();
    var peak = o.gain === undefined ? 0.5 : o.gain;
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    var f = c.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 1600, t0);
    if (o.freqTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.freqTo), t0 + dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  /* ---------------- 音效配方 ---------------- */
  var RECIPES = {
    // 通用 UI
    click: function () { note({ wave: 'square', freq: 660, to: 880, dur: 0.06, gain: 0.28 }); },
    select: function () { note({ wave: 'triangle', freq: 520, to: 990, dur: 0.12, gain: 0.34 }); },
    back: function () { note({ wave: 'triangle', freq: 520, to: 260, dur: 0.12, gain: 0.3 }); },
    coin: function () {
      note({ wave: 'square', freq: 988, dur: 0.07, gain: 0.34 });
      note({ wave: 'square', freq: 1319, dur: 0.16, gain: 0.32, delay: 0.07 });
    },
    powerup: function () {
      [523, 659, 784, 1047].forEach(function (f, i) {
        note({ wave: 'square', freq: f, dur: 0.11, gain: 0.34, delay: i * 0.06 });
      });
    },
    levelup: function () {
      [440, 554, 659, 880, 1109].forEach(function (f, i) {
        note({ wave: 'triangle', freq: f, dur: 0.16, gain: 0.34, delay: i * 0.075 });
      });
    },
    // 动作
    jump: function () { note({ wave: 'square', freq: 300, to: 720, dur: 0.16, gain: 0.32 }); },
    jumpBig: function () { note({ wave: 'square', freq: 220, to: 900, dur: 0.24, gain: 0.34 }); },
    land: function () { note({ wave: 'triangle', freq: 180, to: 90, dur: 0.08, gain: 0.24 }); },
    shoot: function () { note({ wave: 'square', freq: 1180, to: 420, dur: 0.09, gain: 0.24 }); },
    laser: function () { note({ wave: 'sawtooth', freq: 1600, to: 320, dur: 0.13, gain: 0.2 }); },
    hit: function () { noise({ dur: 0.1, freq: 2200, freqTo: 400, gain: 0.32, filter: 'bandpass' }); },
    block: function () { note({ wave: 'square', freq: 420, to: 180, dur: 0.09, gain: 0.3 }); },
    bounce: function () { note({ wave: 'square', freq: 300, to: 620, dur: 0.06, gain: 0.3 }); },
    brick: function () { noise({ dur: 0.12, freq: 3200, freqTo: 900, gain: 0.3, filter: 'highpass' }); },
    explosion: function () {
      noise({ dur: 0.5, freq: 1400, freqTo: 60, gain: 0.5 });
      note({ wave: 'sawtooth', freq: 160, to: 40, dur: 0.4, gain: 0.22 });
    },
    punch: function () {
      noise({ dur: 0.12, freq: 900, freqTo: 120, gain: 0.36, filter: 'lowpass' });
    },
    stomp: function () { note({ wave: 'square', freq: 240, to: 540, dur: 0.12, gain: 0.34 }); },
    coinDrop: function () { note({ wave: 'triangle', freq: 1600, to: 2400, dur: 0.14, gain: 0.24 }); },
    life: function () {
      [784, 1047, 1319].forEach(function (f, i) { note({ wave: 'square', freq: f, dur: 0.14, gain: 0.34, delay: i * 0.09 }); });
    },
    eat: function () { note({ wave: 'square', freq: 520, to: 1040, dur: 0.08, gain: 0.28 }); },
    grow: function () { note({ wave: 'triangle', freq: 400, to: 1200, dur: 0.2, gain: 0.28 }); },
    rotate: function () { note({ wave: 'square', freq: 700, to: 900, dur: 0.05, gain: 0.22 }); },
    clear: function () {
      [659, 880, 1175].forEach(function (f, i) { note({ wave: 'square', freq: f, dur: 0.14, gain: 0.32, delay: i * 0.07 }); });
    },
    tetris: function () {
      [523, 659, 784, 1047, 1319].forEach(function (f, i) { note({ wave: 'triangle', freq: f, dur: 0.2, gain: 0.34, delay: i * 0.1 }); });
    },
    start: function () {
      [392, 523, 659, 784].forEach(function (f, i) { note({ wave: 'square', freq: f, dur: 0.18, gain: 0.34, delay: i * 0.1 }); });
    },
    gameover: function () {
      [660, 550, 440, 330, 220].forEach(function (f, i) { note({ wave: 'triangle', freq: f, dur: 0.26, gain: 0.34, delay: i * 0.16 }); });
    },
    win: function () {
      [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { note({ wave: 'square', freq: f, dur: 0.2, gain: 0.32, delay: i * 0.12 }); });
    },
    warn: function () { note({ wave: 'sawtooth', freq: 300, to: 300, dur: 0.12, gain: 0.28 }); note({ wave: 'sawtooth', freq: 300, dur: 0.12, gain: 0.28, delay: 0.18 }); },
    boss: function () {
      [110, 98, 87, 110].forEach(function (f, i) { note({ wave: 'sawtooth', freq: f, dur: 0.3, gain: 0.3, delay: i * 0.18, lowpass: 900 }); });
    }
  };

  function play(name) {
    ensure();
    if (muted) return;
    var r = RECIPES[name];
    if (r) { try { r(); } catch (e) { } }
  }

  /* ---------------- 背景音乐（Chiptune 循环） ---------------- */
  var BGM = {
    menu: {
      bpm: 104,
      // 简易和弦琶音 loop（音名 -> 频率）
      lead: [523, 659, 784, 659, 587, 698, 880, 698],
      bass: [131, 131, 147, 147, 165, 165, 147, 147],
      waveL: 'square', waveB: 'triangle'
    },
    battle: {
      bpm: 146,
      lead: [440, 523, 659, 523, 587, 494, 440, 392],
      bass: [110, 110, 123, 123, 131, 131, 123, 123],
      waveL: 'square', waveB: 'sawtooth'
    },
    calm: {
      bpm: 88,
      lead: [523, 587, 659, 784, 659, 587, 523, 494],
      bass: [131, 131, 165, 165, 147, 147, 131, 131],
      waveL: 'triangle', waveB: 'sine'
    }
  };
  var bgmTimer = null, bgmName = null, step = 0;

  function stopBgm() {
    if (bgmTimer) { clearInterval(bgmTimer); bgmTimer = null; }
    bgmName = null; step = 0;
  }

  function bgm(name) {
    if (name === bgmName) return;
    stopBgm();
    if (!name) return;
    var cfg = BGM[name];
    if (!cfg) return;
    ensure();
    bgmName = name;
    step = 0;
    var beat = 60000 / cfg.bpm / 2; // 八分音符
    function ticker() {
      if (muted) return;
      var i = step % cfg.lead.length;
      note({ wave: cfg.waveL, freq: cfg.lead[i], dur: beat / 1000 * 1.7, gain: 0.16, bus: musicBus, lowpass: 2600 });
      if (i % 2 === 0) note({ wave: cfg.waveB, freq: cfg.bass[i], dur: beat / 1000 * 3.2, gain: 0.2, bus: musicBus, lowpass: 700 });
      step++;
    }
    ticker();
    bgmTimer = setInterval(ticker, beat);
  }

  /* ---------------- 开关 ---------------- */
  function setMuted(v) {
    muted = !!v;
    try { global.localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) { }
    if (master) master.gain.value = muted ? 0.0001 : 0.9;
    // 恢复时重新拉起点声音
    if (!muted) { ensure(); note({ wave: 'triangle', freq: 660, to: 990, dur: 0.1, gain: 0.2 }); }
    try { global.dispatchEvent(new CustomEvent('sfx:mute', { detail: { muted: muted } })); } catch (e) { }
  }
  function toggleMute() { setMuted(!muted); return muted; }
  function isMuted() { return muted; }

  function unlock() {
    var c = ensure();
    if (c && c.state === 'suspended') { try { c.resume(); } catch (e) { } }
    return c;
  }

  global.SFX = {
    play: play, bgm: bgm, stopBgm: stopBgm,
    setMuted: setMuted, toggleMute: toggleMute, isMuted: isMuted,
    unlock: unlock, recipes: RECIPES
  };
})(window);
