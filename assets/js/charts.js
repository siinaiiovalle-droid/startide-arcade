/* ==========================================================================
   星潮互动 — 轻量 Canvas 图表引擎（零依赖）
   支持：面积折线图 / 柱状图 / 环形图 / 横向条形图 / 雷达图
   特性：DPR 高清、入场动画、hover 提示、自适应重绘
   ========================================================================== */

(function (global) {
  'use strict';

  var C = {
    cyan: '#38e1ff', violet: '#7a5cff', pink: '#ff4d9d',
    amber: '#ffb020', green: '#2ee6a8', red: '#ff5c6c', muted: '#7d8fb3'
  };

  function getCtx(canvas) {
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    var w = rect.width || canvas.clientWidth || 600;
    var h = rect.height || canvas.clientHeight || 240;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx: ctx, w: w, h: h };
  }

  function niceMax(v) {
    if (v <= 0) return 10;
    var exp = Math.floor(Math.log10(v));
    var base = Math.pow(10, exp);
    var n = v / base;
    var step = n <= 1 ? 1 : n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 3 ? 3 : n <= 5 ? 5 : n <= 7.5 ? 7.5 : 10;
    return step * base;
  }

  function hexA(hex, a) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return 'rgba(' + parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16) + ',' + a + ')';
  }

  function boxOf(w, h, pad) {
    var p = pad || { top: 18, right: 20, bottom: 30, left: 52 };
    return { left: p.left, top: p.top, width: Math.max(10, w - p.left - p.right), height: Math.max(10, h - p.top - p.bottom) };
  }

  function drawGrid(ctx, box, maxV, minV, ticks, labels, opts) {
    var o = opts || {};
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.07)';
    ctx.fillStyle = C.muted;
    ctx.font = '11px "SFMono-Regular",Consolas,monospace';
    ctx.lineWidth = 1;
    for (var i = 0; i <= ticks; i++) {
      var y = box.top + (box.height * i) / ticks;
      ctx.beginPath();
      ctx.moveTo(box.left, Math.round(y) + .5);
      ctx.lineTo(box.left + box.width, Math.round(y) + .5);
      ctx.stroke();
      var val = maxV - ((maxV - minV) * i) / ticks;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(o.fmtY ? o.fmtY(val) : String(Math.round(val)), box.left - 10, y);
    }
    if (labels && labels.length) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      var n = labels.length;
      var step = Math.max(1, Math.ceil(n / 7));
      for (var j = 0; j < n; j += step) {
        var x = box.left + (box.width * j) / Math.max(1, n - 1);
        ctx.fillText(labels[j], x, box.top + box.height + 8);
      }
    }
    ctx.restore();
  }

  function attachHover(canvas, redraw, hitTest) {
    if (canvas.__hoverBound) { canvas.__hoverData = { redraw: redraw, hitTest: hitTest }; return; }
    canvas.__hoverBound = true;
    canvas.__hoverData = { redraw: redraw, hitTest: hitTest };

    var tip = document.createElement('div');
    tip.style.cssText = 'position:absolute;pointer-events:none;z-index:20;padding:8px 11px;border-radius:9px;' +
      'background:rgba(10,17,32,.97);border:1px solid rgba(255,255,255,.16);box-shadow:0 14px 34px -14px #000;' +
      'font-size:12px;line-height:1.6;color:#e9effc;white-space:nowrap;opacity:0;transition:opacity .14s;';
    var parent = canvas.parentElement;
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    parent.appendChild(tip);

    canvas.addEventListener('mousemove', function (e) {
      var d = canvas.__hoverData;
      var rect = canvas.getBoundingClientRect();
      var x = e.clientX - rect.left, y = e.clientY - rect.top;
      var info = d.hitTest ? d.hitTest(x, y) : null;
      if (info && info.html) {
        tip.innerHTML = info.html;
        tip.style.opacity = '1';
        tip.style.left = Math.min(Math.max(4, x + 14), rect.width - tip.offsetWidth - 4) + 'px';
        tip.style.top = Math.max(4, y - tip.offsetHeight - 12) + 'px';
      } else {
        tip.style.opacity = '0';
      }
      if (d.redraw) d.redraw(info);
    });
    canvas.addEventListener('mouseleave', function () {
      tip.style.opacity = '0';
      if (canvas.__hoverData.redraw) canvas.__hoverData.redraw(null);
    });
  }

  function animateTo(render, dur) {
    var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { render(1); return; }
    var start = performance.now();
    (function tick(t) {
      var p = Math.min(1, (t - start) / (dur || 800));
      render(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }

  /* ============================================================
     面积折线图（多序列）
     ============================================================ */
  function areaChart(canvas, opt) {
    var o = opt || {};
    var series = o.series || [];
    var labels = o.labels || [];
    var p = 0, focus = null;

    function render(hoverIdx) {
      var g = getCtx(canvas), ctx = g.ctx, w = g.w, h = g.h;
      var box = boxOf(w, h, o.padding);
      var allVals = [];
      series.forEach(function (s) { allVals = allVals.concat(s.data); });
      var maxV = niceMax((Math.max.apply(null, allVals) || 1) * 1.12);
      var minV = o.min === undefined ? 0 : o.min;
      var n = labels.length || 1;

      drawGrid(ctx, box, maxV, minV, o.ticks || 4, labels, { fmtY: o.fmtY });

      if (hoverIdx !== null && hoverIdx !== undefined && hoverIdx >= 0) {
        var hx = box.left + (box.width * hoverIdx) / Math.max(1, n - 1);
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,.22)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(hx, box.top); ctx.lineTo(hx, box.top + box.height); ctx.stroke();
        ctx.restore();
      }

      series.forEach(function (s) {
        var data = s.data;
        if (!data || !data.length) return;
        var pts = data.map(function (v, i) {
          return [box.left + (box.width * i) / Math.max(1, n - 1),
            box.top + box.height - ((v - minV) / (maxV - minV)) * box.height];
        });
        var cutoff = Math.max(1, Math.round(pts.length * p));
        var drawn = pts.slice(0, cutoff);

        ctx.save();
        var grad = ctx.createLinearGradient(0, box.top, 0, box.top + box.height);
        grad.addColorStop(0, hexA(s.color, o.fillAlpha === undefined ? 0.34 : o.fillAlpha));
        grad.addColorStop(1, hexA(s.color, 0));
        ctx.beginPath();
        ctx.moveTo(drawn[0][0], box.top + box.height);
        for (var i = 0; i < drawn.length; i++) {
          if (i === 0) ctx.lineTo(drawn[0][0], drawn[0][1]);
          else {
            var cxx = (drawn[i - 1][0] + drawn[i][0]) / 2;
            ctx.bezierCurveTo(cxx, drawn[i - 1][1], cxx, drawn[i][1], drawn[i][0], drawn[i][1]);
          }
        }
        ctx.lineTo(drawn[drawn.length - 1][0], box.top + box.height);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = s.width || 2.2;
        ctx.lineJoin = 'round';
        ctx.shadowColor = hexA(s.color, .5);
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(drawn[0][0], drawn[0][1]);
        for (var k = 1; k < drawn.length; k++) {
          var cx2 = (drawn[k - 1][0] + drawn[k][0]) / 2;
          ctx.bezierCurveTo(cx2, drawn[k - 1][1], cx2, drawn[k][1], drawn[k][0], drawn[k][1]);
        }
        ctx.stroke();
        ctx.restore();

        if (p >= 0.99) {
          var last = pts[pts.length - 1];
          ctx.save();
          ctx.beginPath(); ctx.arc(last[0], last[1], 5, 0, Math.PI * 2);
          ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = 14; ctx.fill();
          ctx.beginPath(); ctx.arc(last[0], last[1], 2.2, 0, Math.PI * 2);
          ctx.fillStyle = '#fff'; ctx.shadowBlur = 0; ctx.fill();
          ctx.restore();
        }
      });

      if (focus !== null && focus >= 0) {
        series.forEach(function (s) {
          var v = s.data[focus];
          if (v === undefined) return;
          var x = box.left + (box.width * focus) / Math.max(1, n - 1);
          var y = box.top + box.height - ((v - minV) / (maxV - minV)) * box.height;
          ctx.save();
          ctx.beginPath(); ctx.arc(x, y, 4.6, 0, Math.PI * 2);
          ctx.fillStyle = '#0a1120'; ctx.strokeStyle = s.color; ctx.lineWidth = 2.4; ctx.fill(); ctx.stroke();
          ctx.restore();
        });
      }
      canvas.__geom = { box: box, n: n };
    }

    attachHover(canvas, function (info) {
      var idx = info ? info.idx : null;
      if (idx === focus) return;
      focus = idx;
      render(idx);
    }, function (x) {
      var geo = canvas.__geom;
      if (!geo) return null;
      var idx = Math.round(((x - geo.box.left) / geo.box.width) * Math.max(1, geo.n - 1));
      if (idx < 0 || idx >= geo.n) return null;
      var rows = series.map(function (s) {
        return '<div style="color:' + s.color + '">● ' + (s.name || '') + ' <b>' + (o.tipFmt ? o.tipFmt(s.data[idx], s) : s.data[idx]) + '</b></div>';
      }).join('');
      return { idx: idx, html: '<div style="color:#7d8fb3;margin-bottom:4px">' + (labels[idx] || '') + '</div>' + rows };
    });

    render();
    animateTo(function (v) { p = v; render(focus); }, o.duration || 850);
    canvas.__reRender = function () { render(focus); };
    canvas.__data = o;
    return canvas;
  }

  /* ============================================================
     柱状图
     ============================================================ */
  function barChart(canvas, opt) {
    var o = opt || {};
    var labels = o.labels || [];
    var data = o.data || [];
    var color = o.color || C.cyan;
    var p = 0, focus = null;

    function roundRect(ctx, x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h));
      ctx.beginPath();
      ctx.moveTo(x, y + h);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
    }

    function render(hIdx) {
      var g = getCtx(canvas), ctx = g.ctx, w = g.w, h = g.h;
      var box = boxOf(w, h, o.padding);
      var maxV = niceMax((Math.max.apply(null, data) || 1) * 1.12);
      drawGrid(ctx, box, maxV, 0, o.ticks || 4, labels, { fmtY: o.fmtY });
      var n = data.length || 1;
      var slot = box.width / n;
      var bw = Math.min(o.maxBarWidth || 26, slot * 0.62);
      var shown = Math.round(n * p);

      for (var i = 0; i < n; i++) {
        if (i >= shown) continue;
        var v = data[i];
        var bh = Math.max(1, (v / maxV) * box.height);
        var x = box.left + slot * i + (slot - bw) / 2;
        var y = box.top + box.height - bh;
        var c = typeof color === 'function' ? color(i) : color;
        var isHover = hIdx === i;
        ctx.save();
        var grad = ctx.createLinearGradient(0, y, 0, box.top + box.height);
        grad.addColorStop(0, hexA(c, isHover ? 1 : .85));
        grad.addColorStop(1, hexA(c, .18));
        ctx.fillStyle = grad;
        if (isHover) { ctx.shadowColor = hexA(c, .7); ctx.shadowBlur = 16; }
        roundRect(ctx, x, y, bw, bh, Math.min(6, bw / 2));
        ctx.fill();
        ctx.restore();
      }
      canvas.__geom = { box: box, n: n, slot: slot };
    }

    attachHover(canvas, function (info) {
      var idx = info ? info.idx : null;
      if (idx === focus) return;
      focus = idx;
      render(idx);
    }, function (x) {
      var geo = canvas.__geom;
      if (!geo) return null;
      var idx = Math.floor((x - geo.box.left) / geo.slot);
      if (idx < 0 || idx >= geo.n) return null;
      return { idx: idx, html: '<div style="color:#7d8fb3;margin-bottom:4px">' + (labels[idx] || '') + '</div><b>' + (o.tipFmt ? o.tipFmt(data[idx]) : data[idx]) + '</b>' };
    });

    render();
    animateTo(function (v) { p = v; render(focus); }, o.duration || 700);
    canvas.__reRender = function () { render(focus); };
    canvas.__data = o;
    return canvas;
  }

  /* ============================================================
     环形图
     ============================================================ */
  function donutChart(canvas, opt) {
    var o = opt || {};
    var items = o.items || [];
    var p = 0, focus = -1;

    function render(hIdx) {
      var g = getCtx(canvas), ctx = g.ctx, w = g.w, h = g.h;
      var cx = w / 2, cy = h / 2;
      var R = Math.min(w, h) / 2 - 8;
      var r = R * (o.innerRatio || 0.62);
      var total = items.reduce(function (a, b) { return a + b.value; }, 0) || 1;
      var start = -Math.PI / 2;

      items.forEach(function (it, i) {
        var sweep = (it.value / total) * Math.PI * 2 * p;
        var isHover = hIdx === i;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, isHover ? R + 4 : R, start, start + sweep);
        ctx.arc(cx, cy, r, start + sweep, start, true);
        ctx.closePath();
        var col = typeof it.color === 'function' ? it.color(it) : (it.color || C.cyan);
        ctx.fillStyle = col;
        if (isHover) { ctx.shadowColor = hexA(col, .8); ctx.shadowBlur = 18; }
        ctx.fill();
        ctx.restore();
        start += sweep;
      });

      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#080d19'; ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e9effc';
      ctx.font = '700 ' + Math.round(R * 0.3) + 'px "SFMono-Regular",Consolas,monospace';
      var center = hIdx >= 0 ? items[hIdx] : null;
      var mainTxt = center ? (o.centerFmt ? o.centerFmt(center.value) : center.value) : (o.centerText || '');
      ctx.fillText(String(mainTxt), cx, cy + R * 0.08);
      ctx.fillStyle = C.muted;
      ctx.font = '500 11.5px "PingFang SC",sans-serif';
      ctx.fillText(String(center ? center.label : (o.centerSub || '')).slice(0, 14), cx, cy + R * 0.34);
      ctx.restore();

      canvas.__geo = { cx: cx, cy: cy, R: R, r: r, items: items, total: total };
    }

    attachHover(canvas, function (info) {
      var idx = info ? info.idx : -1;
      if (idx === focus) return;
      focus = idx;
      render(idx);
    }, function (x, y) {
      var geo = canvas.__geo;
      if (!geo) return null;
      var dx = x - geo.cx, dy = y - geo.cy;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > geo.R + 6 || dist < geo.r) return null;
      var ang = Math.atan2(dy, dx);
      if (ang < -Math.PI / 2) ang += Math.PI * 2;
      var acc = 0;
      for (var i = 0; i < geo.items.length; i++) {
        var s = -Math.PI / 2 + acc;
        var e = s + (geo.items[i].value / geo.total) * Math.PI * 2;
        acc += (geo.items[i].value / geo.total) * Math.PI * 2;
        if (ang >= s && ang < e) {
          var it = geo.items[i];
          return { idx: i, html: '<div style="color:' + (it.color || '#38e1ff') + '">● ' + it.label + '</div><b>' + (o.tipFmt ? o.tipFmt(it.value) : it.value) + '</b><div style="color:#7d8fb3">占比 ' + ((it.value / geo.total) * 100).toFixed(1) + '%</div>' };
        }
      }
      return null;
    });

    render();
    animateTo(function (v) { p = v; render(focus); }, o.duration || 850);
    canvas.__reRender = function () { render(focus); };
    canvas.__data = o;
    return canvas;
  }

  /* ============================================================
     横向条形图
     ============================================================ */
  function hBarChart(canvas, opt) {
    var o = opt || {};
    var items = o.items || [];
    var p = 0;

    function rr(ctx, x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function render() {
      var g = getCtx(canvas), ctx = g.ctx, w = g.w, h = g.h;
      var padL = o.labelWidth || 132;
      var padR = 66;
      var box = { left: padL, top: 4, width: Math.max(10, w - padL - padR), height: Math.max(10, h - 8) };
      var maxV = (Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]))) * 1.04;
      var n = items.length || 1;
      var gap = o.gap === undefined ? 8 : o.gap;
      var bh = Math.max(6, (box.height - gap * (n - 1)) / n);

      items.forEach(function (it, i) {
        var y = box.top + i * (bh + gap);
        var bw = Math.max(2, (it.value / maxV) * box.width * p);
        var col = typeof it.color === 'function' ? it.color(it) : (it.color || C.cyan);

        ctx.save();
        ctx.fillStyle = C.muted;
        ctx.font = '12px "PingFang SC",sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(it.label).slice(0, 13), padL - 12, y + bh / 2);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,.055)';
        rr(ctx, box.left, y, box.width, bh, Math.min(bh / 2, 6));
        ctx.fill();
        ctx.restore();

        ctx.save();
        var grad = ctx.createLinearGradient(box.left, 0, box.left + box.width, 0);
        grad.addColorStop(0, hexA(col, .5));
        grad.addColorStop(1, col);
        ctx.fillStyle = grad;
        ctx.shadowColor = hexA(col, .45); ctx.shadowBlur = 12;
        rr(ctx, box.left, y, bw, bh, Math.min(bh / 2, 6));
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#e9effc';
        ctx.font = '700 12px "SFMono-Regular",Consolas,monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(o.valueFmt ? o.valueFmt(it.value, it) : String(it.value), box.left + bw + 8, y + bh / 2);
        ctx.restore();
      });
    }

    render();
    animateTo(function (v) { p = v; render(); }, o.duration || 750);
    canvas.__reRender = function () { render(); };
    canvas.__data = o;
    return canvas;
  }

  /* ============================================================
     雷达图
     ============================================================ */
  function radarChart(canvas, opt) {
    var o = opt || {};
    var axes = o.axes || [];
    var sets = o.sets || [];
    var p = 0;

    function render() {
      var g = getCtx(canvas), ctx = g.ctx, w = g.w, h = g.h;
      var cx = w / 2, cy = h / 2 + 6;
      var R = Math.min(w, h) / 2 - 36;
      var n = axes.length || 1;

      for (var ring = 1; ring <= 4; ring++) {
        ctx.save();
        ctx.beginPath();
        for (var i = 0; i < n; i++) {
          var a = -Math.PI / 2 + (Math.PI * 2 * i) / n;
          var rr2 = (R * ring) / 4;
          var x = cx + Math.cos(a) * rr2, y = cy + Math.sin(a) * rr2;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = 'rgba(255,255,255,' + (ring === 4 ? 0.16 : 0.07) + ')';
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = C.muted;
      ctx.font = '11.5px "PingFang SC",sans-serif';
      for (var k = 0; k < n; k++) {
        var ang = -Math.PI / 2 + (Math.PI * 2 * k) / n;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
        ctx.strokeStyle = 'rgba(255,255,255,.07)';
        ctx.stroke();
        ctx.textAlign = Math.cos(ang) > 0.3 ? 'left' : (Math.cos(ang) < -0.3 ? 'right' : 'center');
        ctx.textBaseline = Math.sin(ang) > 0.3 ? 'top' : (Math.sin(ang) < -0.3 ? 'bottom' : 'middle');
        ctx.fillText(axes[k], cx + Math.cos(ang) * (R + 16), cy + Math.sin(ang) * (R + 14));
      }
      ctx.restore();

      sets.forEach(function (s) {
        var col = s.color || C.cyan;
        ctx.save();
        ctx.beginPath();
        for (var i = 0; i < n; i++) {
          var a = -Math.PI / 2 + (Math.PI * 2 * i) / n;
          var v = Math.max(0, Math.min(1, (s.values[i] || 0) * p));
          var x = cx + Math.cos(a) * R * v, y = cy + Math.sin(a) * R * v;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = hexA(col, .16);
        ctx.fill();
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.shadowColor = hexA(col, .5); ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        for (var j = 0; j < n; j++) {
          var ang2 = -Math.PI / 2 + (Math.PI * 2 * j) / n;
          var v2 = Math.max(0, Math.min(1, (s.values[j] || 0) * p));
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ang2) * R * v2, cy + Math.sin(ang2) * R * v2, 3, 0, Math.PI * 2);
          ctx.fillStyle = col; ctx.fill();
        }
        ctx.restore();
      });
    }

    render();
    animateTo(function (v) { p = v; render(); }, o.duration || 900);
    canvas.__reRender = function () { render(); };
    canvas.__data = o;
    return canvas;
  }

  /* ---------- 注册与自适应重绘 ---------- */
  var registry = [];
  function register(c) { if (registry.indexOf(c) < 0) registry.push(c); }

  function render(canvas, type, opt) {
    if (!canvas) return null;
    var map = { area: areaChart, bar: barChart, donut: donutChart, hbar: hBarChart, radar: radarChart };
    var fn = map[type];
    if (!fn) { console.warn('[Charts] 未知图表类型:', type); return null; }
    fn(canvas, opt);
    register(canvas);
    return canvas;
  }

  var rt = null;
  global.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      registry.slice().forEach(function (c) {
        if (c.isConnected && c.__reRender) c.__reRender();
        else registry.splice(registry.indexOf(c), 1);
      });
    }, 160);
  });

  global.Charts = {
    colors: C, hexA: hexA,
    area: areaChart, bar: barChart, donut: donutChart, hbar: hBarChart, radar: radarChart,
    render: render
  };
})(window);
