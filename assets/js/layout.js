/* ==========================================================================
   星潮互动 — 公共布局（导航 / 公告条 / 页脚）
   用法：<body data-page="index"> ... <div data-nav></div> ... <div data-footer></div>
   支持：中英双语切换、登录状态、音效开关
   ========================================================================== */

(function (global) {
  'use strict';

  var NAV = [
    { key: 'index', href: 'index.html', t: 'nav.home' },
    { key: 'games', href: 'games.html', t: 'nav.games' },
    { key: 'rank', href: 'rank.html', t: 'nav.rank' },
    { key: 'dashboard', href: 'dashboard.html', t: 'nav.dashboard' },
    { key: 'admin', href: 'admin.html', t: 'nav.admin' }
  ];

  var LOGO_SVG =
    '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M12 2.6l2.5 5.1 5.6.8-4 4 .95 5.5L12 15.4 6.95 18l.95-5.5-4-4 5.6-.8L12 2.6z" fill="#06101c"/>' +
    '<circle cx="12" cy="11" r="2.4" fill="#38e1ff"/></svg>';

  var MENU_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
    '<path d="M4 7h16M4 12h16M4 17h16"/></svg>';

  var CHEV_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M6 9l6 6 6-6"/></svg>';

  function T(k) { return global.I18N ? global.I18N.t(k) : k; }
  function esc(s) { return global.UI ? global.UI.esc(s) : String(s === undefined || s === null ? '' : s); }

  function renderNav(active) {
    var links = NAV.map(function (n) {
      return '<a href="' + n.href + '"' + (n.key === active ? ' class="is-active"' : '') + '>' + esc(T(n.t)) + '</a>';
    }).join('');

    return '' +
      '<div class="nav">' +
      '  <div class="wrap nav__inner">' +
      '    <a class="brand" href="index.html">' +
      '      <span class="brand__mark">' + LOGO_SVG + '</span>' +
      '      <span class="brand__text"><span class="brand__cn">星潮互动</span><span class="brand__en">STARTIDE</span></span>' +
      '    </a>' +
      '    <nav class="nav__links">' + links + '</nav>' +
      '    <div class="nav__cta">' +
      '      <button class="iconbtn" data-langbtn title="切换语言 / Language">' +
      '        <span class="iconbtn__t">' + (global.I18N && global.I18N.isEn() ? 'EN' : '中') + '</span></button>' +
      '      <button class="iconbtn" data-soundbtn title="' + esc(T('common.sound')) + '">' +
      '        <span data-soundicon>' + (global.SFX && global.SFX.isMuted() ? '🔇' : '🔊') + '</span></button>' +
      '      <span data-userarea>' + renderUser() + '</span>' +
      '      <button class="nav__toggle" aria-label="菜单">' + MENU_SVG + '</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';
  }

  function renderUser() {
    var u = global.Auth ? global.Auth.current() : null;
    if (!u) {
      return '<a class="btn btn--primary btn--sm" href="login.html">' + esc(T('nav.login')) + '</a>';
    }
    return '' +
      '<div class="usermenu" data-usermenu>' +
      '  <button class="usermenu__btn" data-umtoggle>' +
      '    <span class="usermenu__ava">' + esc(u.avatar) + '</span>' +
      '    <span class="usermenu__name">' + esc(u.nickname) + '</span>' + CHEV_SVG +
      '  </button>' +
      '  <div class="usermenu__pop">' +
      '    <div class="usermenu__head">' +
      '      <span class="usermenu__ava usermenu__ava--lg">' + esc(u.avatar) + '</span>' +
      '      <div><b>' + esc(u.nickname) + '</b><div class="tiny muted">' + esc(T('user.level')) + ' ' + u.level + ' · 🪙 ' + u.coins + '</div></div>' +
      '    </div>' +
      '    <a href="login.html?view=profile">' + esc(T('nav.profile')) + '</a>' +
      '    <a href="rank.html">' + esc(T('nav.rank')) + '</a>' +
      '    <a href="games.html">' + esc(T('nav.games')) + '</a>' +
      '    <button data-logout>' + esc(T('nav.logout')) + '</button>' +
      '  </div>' +
      '</div>';
  }

  function renderBanner() {
    var cfg = null;
    try { cfg = global.Store ? global.Store.get().gameConfig : null; } catch (e) { }
    if (!cfg || !cfg.bannerEnabled || !cfg.bannerText) return '';
    return '<div class="annbar"><div class="wrap annbar__inner">' +
      '<span class="badge badge--amber"><i class="dot dot--pulse"></i>' + esc(T('common.online')) + '</span>' +
      '<span class="annbar__text">' + esc(cfg.bannerText) + '</span>' +
      '<a class="annbar__link" href="games.html">' + esc(T('common.play')) + ' →</a>' +
      '</div></div>';
  }

  function renderFooter() {
    var c = global.Store.get().company;
    return '' +
      '<footer class="footer">' +
      '  <div class="wrap">' +
      '    <div class="footer__grid">' +
      '      <div>' +
      '        <div class="brand mb16"><span class="brand__mark">' + LOGO_SVG + '</span>' +
      '          <span class="brand__text"><span class="brand__cn">星潮互动</span><span class="brand__en">STARTIDE INTERACTIVE</span></span>' +
      '        </div>' +
      '        <p class="muted small" style="max-width:36ch">' + esc(T('foot.desc')) + '</p>' +
      '        <div class="wrapflex">' +
      '          <span class="tag">' + esc(T('common.online')) + '</span><span class="tag">Web / H5</span><span class="tag">中 / EN</span>' +
      '        </div>' +
      '      </div>' +
      '      <div><h4>' + esc(T('foot.products')) + '</h4><ul>' +
      '        <li><a href="games.html">' + esc(T('nav.games')) + '</a></li>' +
      '        <li><a href="rank.html">' + esc(T('nav.rank')) + '</a></li>' +
      '        <li><a href="login.html">' + esc(T('nav.login')) + '</a></li>' +
      '        <li><a href="play.html?g=shooter">' + esc(T('common.play')) + ' · ' + (global.CATALOG ? global.CATALOG.get('shooter').name.zh : '星际战机') + '</a></li>' +
      '      </ul></div>' +
      '      <div><h4>' + esc(T('foot.company')) + '</h4><ul>' +
      '        <li><a href="team.html">' + esc(T('nav.about')) + '</a></li>' +
      '        <li><a href="business-plan.html">商业计划</a></li>' +
      '        <li><a href="dashboard.html">' + esc(T('nav.dashboard')) + '</a></li>' +
      '        <li><a href="admin.html">' + esc(T('nav.admin')) + '</a></li>' +
      '      </ul></div>' +
      '      <div><h4>' + esc(T('foot.contact')) + '</h4><ul>' +
      '        <li class="muted small">商务合作<br>bd@startide.example</li>' +
      '        <li class="muted small mt8">玩家支持<br>support@startide.example</li>' +
      '        <li class="muted small mt8">' + esc(c.office) + '</li>' +
      '      </ul></div>' +
      '    </div>' +
      '    <div class="footer__bottom">' +
      '      <span>© 2021-2026 ' + esc(c.legal) + ' · ' + esc(T('foot.rights')) + '</span>' +
      '      <span>' + esc(c.license) + '</span>' +
      '    </div>' +
      '    <p class="tiny muted mt16 mb0">' + esc(T('foot.demo')) + '</p>' +
      '  </div>' +
      '</footer>';
  }

  function bindNav() {
    var langBtn = document.querySelector('[data-langbtn]');
    if (langBtn) langBtn.addEventListener('click', function () { global.I18N.toggle(); });
    var soundBtn = document.querySelector('[data-soundbtn]');
    if (soundBtn) soundBtn.addEventListener('click', function () {
      if (!global.SFX) return;
      var m = global.SFX.toggleMute();
      var ic = document.querySelector('[data-soundicon]');
      if (ic) ic.textContent = m ? '🔇' : '🔊';
    });
    var popBtn = document.querySelector('[data-umtoggle]');
    var menu = document.querySelector('[data-usermenu]');
    if (popBtn && menu) {
      popBtn.addEventListener('click', function (e) { e.stopPropagation(); menu.classList.toggle('is-open'); });
      document.addEventListener('click', function () { menu.classList.remove('is-open'); });
    }
    var outBtn = document.querySelector('[data-logout]');
    if (outBtn) outBtn.addEventListener('click', function () {
      if (global.Auth) global.Auth.logout();
      if (global.UI) global.UI.toast(T('login.logoutDone'), 'ok');
      refresh();
    });
    if (global.UI) global.UI.initNav();
  }

  function refresh() {
    var page = document.body.getAttribute('data-page') || '';
    var navHost = document.querySelector('[data-nav]');
    if (navHost) navHost.innerHTML = renderNav(page) + renderBanner();
    var userArea = document.querySelector('[data-userarea]');
    if (userArea) userArea.innerHTML = renderUser();
    var footHost = document.querySelector('[data-footer]');
    if (footHost) footHost.innerHTML = renderFooter();
    bindNav();
    if (global.UI) { global.UI.initReveal(); global.UI.initCountUp(); global.UI.initBars(); }
  }

  function boot() {
    refresh();
    if (global.I18N) {
      global.addEventListener('i18n:change', function () {
        var host = document.querySelector('[data-nav]');
        if (host) host.innerHTML = renderNav(document.body.getAttribute('data-page') || '') + renderBanner();
        var footHost = document.querySelector('[data-footer]');
        if (footHost) footHost.innerHTML = renderFooter();
        var area = document.querySelector('[data-userarea]');
        if (area) area.innerHTML = renderUser();
        bindNav();
      });
    }
    global.addEventListener('auth:change', function () {
      var area = document.querySelector('[data-userarea]');
      if (area) area.innerHTML = renderUser();
      bindNav();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  global.Layout = { renderNav: renderNav, renderFooter: renderFooter, refresh: refresh, NAV: NAV, LOGO_SVG: LOGO_SVG, T: T };
})(window);
