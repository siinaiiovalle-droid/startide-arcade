/* ==========================================================================
   星潮互动 · 多语言 i18n（简体中文 / English）
   --------------------------------------------------------------------------
   用法：
     I18N.t('nav.games')                 取词
     <span data-i18n="nav.games"></span>  自动替换文本（I18N.apply()）
     <input data-i18n-ph="login.account"> 替换 placeholder
   切换：I18N.set('en')，会触发 window 事件 'i18n:change'
   ========================================================================== */

(function (global) {
  'use strict';

  var KEY = 'startide_lang_v1';
  var lang = 'zh';
  try { lang = global.localStorage.getItem(KEY) || 'zh'; } catch (e) { }

  var DICT = {
    zh: {
      'nav.home': '首页',
      'nav.games': '游戏大厅',
      'nav.rank': '排行榜',
      'nav.about': '公司简介',
      'nav.dashboard': '数据看板',
      'nav.admin': '管理后台',
      'nav.login': '登录 / 注册',
      'nav.logout': '退出',
      'nav.profile': '个人中心',
      'nav.play': '开始游戏',
      'nav.menu': '菜单',

      'common.play': '开始游戏',
      'common.playing': '继续游戏',
      'common.pause': '暂停',
      'common.resume': '继续',
      'common.restart': '重开',
      'common.retry': '再来一局',
      'common.replay': '再来一局',
      'common.back': '返回',
      'common.close': '关闭',
      'common.cancel': '取消',
      'common.confirm': '确定',
      'common.save': '保存',
      'common.search': '搜索',
      'common.all': '全部',
      'common.score': '得分',
      'common.best': '最高分',
      'common.level': '关卡',
      'common.lives': '生命',
      'common.time': '用时',
      'common.loading': '加载中…',
      'common.sound': '音效',
      'common.on': '开',
      'common.off': '关',
      'common.online': '在线',
      'common.new': '新',
      'common.hot': '热门',
      'common.more': '更多',
      'common.empty': '暂无内容',

      'game.control': '操作说明',
      'game.tips': '提示',
      'game.over': '游戏结束',
      'game.win': '通关！',
      'game.paused': '已暂停',
      'game.startTip': '点击「开始游戏」立即开玩',
      'game.scoreSubmitted': '成绩已记录',
      'game.replay': '再来一局',
      'game.fullscreen': '全屏',
      'game.toHall': '返回大厅',
      'game.keyboard': '键盘',
      'game.touch': '触屏',
      'game.newRecord': '新纪录！',
      'game.guestTip': '登录后可保存成绩与排行',

      'hall.title': '游戏大厅',
      'hall.sub': '打开即玩，无需下载。支持键盘与触屏，全球同服。',
      'hall.all': '全部游戏',
      'hall.popular': '最受欢迎',
      'hall.new': '最新上架',
      'hall.playing': '正在玩',
      'hall.plays': '次游玩',
      'hall.duration': '单局',

      'login.title': '登录 / 注册',
      'login.sub': '首次登录自动创建账号，无需单独注册',
      'login.tabPwd': '账号密码',
      'login.tabPhone': '手机号',
      'login.account': '账号 / 昵称 / 手机号',
      'login.password': '密码',
      'login.phone': '手机号',
      'login.code': '验证码',
      'login.sendCode': '获取验证码',
      'login.resend': '秒后重发',
      'login.submit': '登录并开始游戏',
      'login.tipPwd': '账号不存在时将自动为你注册，下次用同样账号密码登录即可。',
      'login.tipPhone': '手机号未注册时将自动创建账号。演示环境验证码固定为 6 位任意数字。',
      'login.agree': '登录即代表同意《用户协议》与《隐私政策》',
      'login.welcome': '欢迎回来',
      'login.created': '账号已创建，欢迎加入',
      'login.errAccount': '请输入 2-20 位账号',
      'login.errPwd': '密码至少 6 位',
      'login.errPhone': '请输入正确的手机号',
      'login.errCode': '请输入 6 位验证码',
      'login.errPwdWrong': '密码错误，请重新输入',
      'login.banned': '该账号已被封禁，请联系客服',
      'login.codeSent': '验证码已发送（演示码 888888）',
      'login.logoutDone': '已退出登录',

      'user.level': '等级',
      'user.coins': '金币',
      'user.plays': '游戏局数',
      'user.joined': '注册时间',
      'user.records': '我的战绩',
      'user.noRecords': '还没有游戏记录，快去玩一局吧',
      'user.nickname': '昵称',
      'user.save': '保存资料',
      'user.saved': '资料已更新',
      'user.boundPhone': '已绑定手机',

      'foot.products': '游戏',
      'foot.company': '关于',
      'foot.support': '支持',
      'foot.contact': '联系',
      'foot.desc': '打开即玩 · 无需下载 · 全球同服',
      'foot.rights': '保留所有权利',
      'foot.demo': '本站为演示项目，全部数据由本地生成，不涉及真实业务与个人信息。',

      'admin.title': '管理后台',
      'admin.login': '管理员登录',
      'admin.account': '管理员账号',
      'admin.password': '密码',
      'admin.enter': '进入后台',
      'admin.err': '账号或密码错误',
      'admin.hint': '默认账号 admin / admin888',
      'admin.logout': '退出后台',
      'admin.overview': '总览',
      'admin.users': '用户管理',
      'admin.gamesTab': '游戏管理',
      'admin.news': '公告管理',
      'admin.records': '游戏记录',
      'admin.logs': '操作日志',
      'admin.welcome': '欢迎回来'
    },
    en: {
      'nav.home': 'Home',
      'nav.games': 'Arcade',
      'nav.rank': 'Leaderboard',
      'nav.about': 'About',
      'nav.dashboard': 'Dashboard',
      'nav.admin': 'Admin',
      'nav.login': 'Sign in',
      'nav.logout': 'Sign out',
      'nav.profile': 'Profile',
      'nav.play': 'Play',
      'nav.menu': 'Menu',

      'common.play': 'Play',
      'common.playing': 'Resume',
      'common.pause': 'Pause',
      'common.resume': 'Resume',
      'common.restart': 'Restart',
      'common.retry': 'Play again',
      'common.replay': 'Play again',
      'common.back': 'Back',
      'common.close': 'Close',
      'common.cancel': 'Cancel',
      'common.confirm': 'Confirm',
      'common.save': 'Save',
      'common.search': 'Search',
      'common.all': 'All',
      'common.score': 'Score',
      'common.best': 'Best',
      'common.level': 'Level',
      'common.lives': 'Lives',
      'common.time': 'Time',
      'common.loading': 'Loading…',
      'common.sound': 'Sound',
      'common.on': 'On',
      'common.off': 'Off',
      'common.online': 'Online',
      'common.new': 'New',
      'common.hot': 'Hot',
      'common.more': 'More',
      'common.empty': 'Nothing here yet',

      'game.control': 'Controls',
      'game.tips': 'Tips',
      'game.over': 'Game Over',
      'game.win': 'Level Clear!',
      'game.paused': 'Paused',
      'game.startTip': 'Press "Play" to start',
      'game.scoreSubmitted': 'Score saved',
      'game.replay': 'Play again',
      'game.fullscreen': 'Fullscreen',
      'game.toHall': 'Back to arcade',
      'game.keyboard': 'Keyboard',
      'game.touch': 'Touch',
      'game.newRecord': 'New record!',
      'game.guestTip': 'Sign in to save scores & rank',

      'hall.title': 'Arcade',
      'hall.sub': 'Play instantly, no download. Keyboard & touch friendly, worldwide.',
      'hall.all': 'All games',
      'hall.popular': 'Most played',
      'hall.new': 'New arrivals',
      'hall.playing': 'Playing now',
      'hall.plays': 'plays',
      'hall.duration': 'Session',

      'login.title': 'Sign in / Sign up',
      'login.sub': 'First sign-in creates your account automatically',
      'login.tabPwd': 'Account',
      'login.tabPhone': 'Phone',
      'login.account': 'Account / Nickname / Phone',
      'login.password': 'Password',
      'login.phone': 'Phone number',
      'login.code': 'Code',
      'login.sendCode': 'Send code',
      'login.resend': 's to resend',
      'login.submit': 'Sign in and play',
      'login.tipPwd': 'If the account does not exist it will be created automatically.',
      'login.tipPhone': 'An unregistered phone number will create a new account. Demo code is any 6 digits.',
      'login.agree': 'By signing in you agree to the Terms and Privacy Policy',
      'login.welcome': 'Welcome back',
      'login.created': 'Account created. Welcome!',
      'login.errAccount': 'Enter a 2-20 char account',
      'login.errPwd': 'Password needs at least 6 chars',
      'login.errPhone': 'Enter a valid phone number',
      'login.errCode': 'Enter the 6-digit code',
      'login.errPwdWrong': 'Wrong password, please try again',
      'login.banned': 'This account is banned. Please contact support.',
      'login.codeSent': 'Code sent (demo code 888888)',
      'login.logoutDone': 'Signed out',

      'user.level': 'Level',
      'user.coins': 'Coins',
      'user.plays': 'Games played',
      'user.joined': 'Joined',
      'user.records': 'My records',
      'user.noRecords': 'No records yet, go play a game!',
      'user.nickname': 'Nickname',
      'user.save': 'Save profile',
      'user.saved': 'Profile updated',
      'user.boundPhone': 'Phone bound',

      'foot.products': 'Games',
      'foot.company': 'Company',
      'foot.support': 'Support',
      'foot.contact': 'Contact',
      'foot.desc': 'Play instantly · No download · Worldwide',
      'foot.rights': 'All rights reserved',
      'foot.demo': 'This is a demo project. All data is generated locally and involves no real business or personal information.',

      'admin.title': 'Admin Console',
      'admin.login': 'Admin sign in',
      'admin.account': 'Admin account',
      'admin.password': 'Password',
      'admin.enter': 'Enter console',
      'admin.err': 'Wrong account or password',
      'admin.hint': 'Default account admin / admin888',
      'admin.logout': 'Sign out',
      'admin.overview': 'Overview',
      'admin.users': 'Users',
      'admin.gamesTab': 'Games',
      'admin.news': 'Announcements',
      'admin.records': 'Records',
      'admin.logs': 'Audit log',
      'admin.welcome': 'Welcome back'
    }
  };

  var LISTENERS = [];

  function t(key, fallback) {
    var d = DICT[lang] || DICT.zh;
    if (d[key] !== undefined) return d[key];
    if (DICT.zh[key] !== undefined) return DICT.zh[key];
    return fallback !== undefined ? fallback : key;
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      var v = t(k);
      if (v !== undefined) el.textContent = v;
    });
    root.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    root.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
    if (document.documentElement) document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  }

  function set(next) {
    lang = next === 'en' ? 'en' : 'zh';
    try { global.localStorage.setItem(KEY, lang); } catch (e) { }
    apply();
    try { global.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang: lang } })); } catch (e) { }
  }

  function toggle() { set(lang === 'en' ? 'zh' : 'en'); return lang; }
  function get() { return lang; }
  function isEn() { return lang === 'en'; }
  /** 取双语对象（如 {zh,en}）中当前语言的文本 */
  function pick(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj.zh || obj.en || '';
  }

  global.I18N = { t: t, apply: apply, set: set, get: get, toggle: toggle, isEn: isEn, pick: pick, dict: DICT };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { apply(); });
  else apply();
})(window);
