/* ==========================================================================
   星潮互动 — 通用 UI 工具（导航 / 提示 / 弹窗 / 格式化 / 滚动入场）
   ========================================================================== */

(function (global) {
  'use strict';

  /* ---------- 数值格式化 ---------- */
  function fmtNum(n, digits) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    var d = digits === undefined ? 0 : digits;
    return Number(n).toFixed(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function fmtCompact(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    var abs = Math.abs(n);
    if (abs >= 1e8) return (n / 1e8).toFixed(2) + ' 亿';
    if (abs >= 1e4) return (n / 1e4).toFixed(1) + ' 万';
    return fmtNum(n);
  }

  function fmtMoney(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    if (Math.abs(n) >= 1e4) return '¥' + (n / 1e4).toFixed(1) + ' 万';
    return '¥' + fmtNum(n);
  }

  function fmtPct(n, digits) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return (n > 0 ? '+' : '') + Number(n).toFixed(digits === undefined ? 1 : digits) + '%';
  }

  function fmtDate(s) {
    if (!s) return '—';
    return String(s).replace(/-/g, '/');
  }

  function fmtTime(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.getFullYear() + '/' + p2(d.getMonth() + 1) + '/' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
  }

  function p2(n) { return n < 10 ? '0' + n : '' + n; }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function relTime(dateStr) {
    if (!dateStr) return '—';
    var then = new Date(String(dateStr).replace(/-/g, '/')).getTime();
    if (isNaN(then)) return dateStr;
    var diff = Date.now() - then;
    var day = Math.floor(diff / 86400000);
    if (day <= 0) return '今天';
    if (day === 1) return '昨天';
    if (day < 30) return day + ' 天前';
    if (day < 365) return Math.floor(day / 30) + ' 个月前';
    return Math.floor(day / 365) + ' 年前';
  }

  /* ---------- Toast ---------- */
  function toastHost() {
    var host = document.querySelector('.toast-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'toast-host';
      document.body.appendChild(host);
    }
    return host;
  }

  function toast(msg, type) {
    var t = type || 'ok';
    var icon = t === 'ok' ? '✓' : (t === 'warn' ? '!' : '×');
    var el = document.createElement('div');
    el.className = 'toast toast--' + t;
    el.innerHTML = '<span class="toast__icon">' + icon + '</span><span>' + esc(msg) + '</span>';
    toastHost().appendChild(el);
    setTimeout(function () {
      el.classList.add('is-out');
      setTimeout(function () { el.remove(); }, 240);
    }, 2600);
  }

  /* ---------- 弹窗 ---------- */
  function modal(opts) {
    var o = opts || {};
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal__head"><h3>' + esc(o.title || '提示') + '</h3>' +
      '<button class="x-btn" data-close aria-label="关闭">×</button></div>' +
      '<div class="modal__body">' + (o.html || esc(o.text || '')) + '</div>' +
      (o.footer === false ? '' : '<div class="modal__foot">' +
        '<button class="btn btn--ghost" data-close>' + esc(o.cancelText || '取消') + '</button>' +
        '<button class="btn ' + (o.danger ? 'btn--danger' : 'btn--primary') + '" data-ok>' + esc(o.okText || '确定') + '</button>' +
        '</div>') +
      '</div>';

    function close() {
      mask.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }

    mask.addEventListener('click', function (e) {
      if (e.target === mask) return close();
      if (e.target.closest('[data-close]')) return close();
      if (e.target.closest('[data-ok]')) {
        var proceed = true;
        if (typeof o.onOk === 'function') proceed = o.onOk(mask) !== false;
        if (proceed !== false) close();
      }
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(mask);
    var f = mask.querySelector('input,select,textarea,button[data-ok]');
    if (f) setTimeout(function () { f.focus(); }, 60);
    return { close: close, el: mask };
  }

  function confirmDialog(title, text, onOk) {
    modal({ title: title, html: '<p class="mb0">' + esc(text) + '</p>', okText: '确认', cancelText: '取消', danger: true, onOk: onOk });
  }

  /* ---------- 导航 ---------- */
  function initNav() {
    var path = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav__links a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (href === path || (path === '' && href === 'index.html')) a.classList.add('is-active');
    });
    var toggle = document.querySelector('.nav__toggle');
    var links = document.querySelector('.nav__links');
    if (toggle && links) {
      toggle.addEventListener('click', function () { links.classList.toggle('is-open'); });
      links.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') links.classList.remove('is-open');
      });
    }
    var nav = document.querySelector('.nav');
    if (nav) {
      var onScroll = function () {
        nav.style.boxShadow = window.scrollY > 8 ? '0 12px 40px -22px rgba(0,0,0,.95)' : 'none';
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  /* ---------- 滚动入场 ---------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var d = en.target.getAttribute('data-delay');
          if (d) en.target.style.transitionDelay = d + 'ms';
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 滚动数字 ---------- */
  function countUp(el, target, opts) {
    var o = opts || {};
    var dur = o.duration || 1100;
    var digits = o.digits === undefined ? 0 : o.digits;
    var prefix = o.prefix || '', suffix = o.suffix || '';
    var start = performance.now();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = prefix + fmtNum(target, digits) + suffix; return; }
    function tick(t) {
      var p = Math.min(1, (t - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + fmtNum(target * eased, digits) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initCountUp() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { countUp(el, parseFloat(el.getAttribute('data-count'))); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var el = en.target;
          countUp(el, parseFloat(el.getAttribute('data-count')), {
            digits: parseInt(el.getAttribute('data-digits') || '0', 10),
            prefix: el.getAttribute('data-prefix') || '',
            suffix: el.getAttribute('data-suffix') || ''
          });
          io.unobserve(el);
        }
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 进度条入场 ---------- */
  function initBars() {
    var els = document.querySelectorAll('.bar[data-fill]');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { var i = el.querySelector('i'); if (i) i.style.width = el.getAttribute('data-fill') + '%'; });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var el = en.target;
          var inner = el.querySelector('i');
          if (inner) inner.style.width = el.getAttribute('data-fill') + '%';
          io.unobserve(el);
        }
      });
    }, { threshold: 0.3 });
    els.forEach(function (el) { io.observe(el); });
  }

  function boot() {
    initNav();
    initReveal();
    initCountUp();
    initBars();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.UI = {
    fmtNum: fmtNum, fmtCompact: fmtCompact, fmtMoney: fmtMoney, fmtPct: fmtPct,
    fmtDate: fmtDate, fmtTime: fmtTime, relTime: relTime, esc: esc, p2: p2,
    toast: toast, modal: modal, confirm: confirmDialog, countUp: countUp,
    initReveal: initReveal, initCountUp: initCountUp, initBars: initBars
  };
})(window);
