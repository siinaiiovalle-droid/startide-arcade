/* ==========================================================================
   星潮互动 · 账号系统 (Auth)
   --------------------------------------------------------------------------
   纯前端演示实现（localStorage 持久化），用于展示完整玩法闭环：
   - 登录即注册：账号不存在时自动创建
   - 手机号注册：验证码（演示固定 888888 或任意 6 位数字）自动建号
   - 战绩记录、金币 / 等级、排行榜
   - 管理后台接口：用户管理、封禁、记录查询、数据统计
   注意：生产环境必须由后端完成鉴权、验证码校验与密码加密存储。
   ========================================================================== */

(function (global) {
  'use strict';

  var K_ACC = 'startide_accounts_v2';
  var K_SES = 'startide_session_v2';
  var K_ADM = 'startide_admin_v2';
  var K_REC = 'startide_records_v2';
  var K_SEED = 'startide_seeded_v2';

  var ADMIN = { account: 'admin', password: 'admin888', name: '超级管理员' };

  function read(key, def) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; }
  }
  function write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { }
  }
  function uid(p) { return (p || 'u_') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function hash(s) {
    // 演示用轻量散列（非安全哈希）
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return 'h' + h.toString(16) + '_' + s.length;
  }
  function nowISO() { return new Date().toISOString(); }
  function climb(n) { // 模拟在线人数曲线的基准
    var t = new Date();
    return n + Math.round(180 * Math.sin((t.getHours() * 60 + t.getMinutes()) / 1440 * Math.PI * 2) * 0.5 + 120);
  }

  function accounts() { return read(K_ACC, []); }
  function saveAccounts(list) { write(K_ACC, list); }
  function records() { return read(K_REC, []); }
  function saveRecords(list) { write(K_REC, list.slice(-4000)); }

  function findByAccount(acc) {
    acc = (acc || '').trim().toLowerCase();
    return accounts().filter(function (u) {
      return (u.username || '').toLowerCase() === acc || (u.phone && u.phone === acc) || (u.nickname || '').toLowerCase() === acc;
    })[0];
  }
  function findById(id) { return accounts().filter(function (u) { return u.id === id; })[0]; }

  function publicUser(u) {
    if (!u) return null;
    return {
      id: u.id, username: u.username, nickname: u.nickname, phone: u.phone || '',
      avatar: u.avatar || '🎮', coins: u.coins || 0, exp: u.exp || 0,
      level: Math.max(1, Math.floor((u.exp || 0) / 120) + 1),
      plays: u.plays || 0, createdAt: u.createdAt, banned: !!u.banned
    };
  }

  function createUser(opts) {
    var list = accounts();
    var u = {
      id: uid(),
      username: opts.username,
      nickname: opts.nickname || opts.username,
      phone: opts.phone || '',
      pass: opts.password ? hash(opts.password) : '',
      avatar: opts.avatar || ['🎮', '🚀', '🐉', '👾', '🦊', '🐼', '🌟', '🎯'][Math.floor(Math.random() * 8)],
      coins: 100, exp: 0, plays: 0, banned: false,
      createdAt: nowISO(), lastLogin: nowISO(), provider: opts.provider || 'account'
    };
    list.push(u);
    saveAccounts(list);
    return u;
  }

  /* ---------------- 登录 / 注册 ---------------- */

  function loginWithPassword(account, password) {
    account = (account || '').trim();
    if (account.length < 2 || account.length > 20) return { ok: false, error: 'login.errAccount' };
    if (!password || password.length < 6) return { ok: false, error: 'login.errPwd' };
    var u = findByAccount(account);
    var created = false;
    if (!u) { u = createUser({ username: account, password: password }); created = true; }
    else {
      if (u.banned) return { ok: false, error: 'login.banned' };
      if (u.pass && u.pass !== hash(password)) return { ok: false, error: 'login.errPwdWrong' };
      if (!u.pass) { /* 手机号注册后首次用密码登录：设置密码 */ var l = accounts(); l.forEach(function (x) { if (x.id === u.id) x.pass = hash(password); }); saveAccounts(l); }
    }
    touchLogin(u.id);
    write(K_SES, u.id);
    return { ok: true, user: publicUser(findById(u.id)), created: created };
  }

  function loginWithPhone(phone, code) {
    phone = (phone || '').replace(/\s|-/g, '');
    if (!/^1[3-9]\d{9}$/.test(phone)) return { ok: false, error: 'login.errPhone' };
    if (!/^\d{6}$/.test(code || '')) return { ok: false, error: 'login.errCode' };
    var u = accounts().filter(function (x) { return x.phone === phone; })[0];
    var created = false;
    if (!u) { u = createUser({ username: 'player' + phone.slice(-6), phone: phone, provider: 'phone', nickname: '玩家' + phone.slice(-4) }); created = true; }
    if (u.banned) return { ok: false, error: 'login.banned' };
    touchLogin(u.id);
    write(K_SES, u.id);
    return { ok: true, user: publicUser(findById(u.id)), created: created };
  }

  function touchLogin(id) {
    var list = accounts();
    list.forEach(function (x) { if (x.id === id) x.lastLogin = nowISO(); });
    saveAccounts(list);
  }

  function sendCode(phone) {
    if (!/^1[3-9]\d{9}$/.test((phone || '').replace(/\s|-/g, ''))) return { ok: false, error: 'login.errPhone' };
    // 演示环境：验证码固定 888888，任意 6 位数字均可通过
    try { sessionStorage.setItem('startide_code', '888888'); } catch (e) { }
    return { ok: true, code: '888888' };
  }

  function logout() { try { localStorage.removeItem(K_SES); } catch (e) { } }

  function current() {
    var id = read(K_SES, null);
    if (!id) return null;
    var u = findById(id);
    if (!u || u.banned) { logout(); return null; }
    return publicUser(u);
  }
  function currentRaw() {
    var id = read(K_SES, null);
    return id ? findById(id) : null;
  }

  function update(patch) {
    var u = currentRaw();
    if (!u) return null;
    var list = accounts();
    list.forEach(function (x) {
      if (x.id === u.id) {
        if (patch.nickname !== undefined && patch.nickname.trim()) x.nickname = patch.nickname.trim().slice(0, 16);
        if (patch.avatar !== undefined) x.avatar = patch.avatar;
        if (patch.phone !== undefined) x.phone = patch.phone;
      }
    });
    saveAccounts(list);
    return publicUser(currentRaw());
  }

  /* ---------------- 战绩 ---------------- */

  function addRecord(info) {
    var u = currentRaw();
    var rec = {
      id: uid('r_'),
      uid: u ? u.id : '',
      username: u ? u.nickname : (info.guestName || '游客'),
      gameId: info.gameId, gameName: info.gameName,
      score: Math.round(info.score || 0),
      duration: Math.round(info.duration || 0),
      detail: info.detail || '',
      createdAt: nowISO()
    };
    var rs = records(); rs.push(rec); saveRecords(rs);

    if (u) {
      var list = accounts();
      list.forEach(function (x) {
        if (x.id === u.id) {
          x.plays = (x.plays || 0) + 1;
          x.exp = (x.exp || 0) + Math.max(5, Math.round(rec.score / 12));
          x.coins = (x.coins || 0) + Math.max(1, Math.round(rec.score / 60));
        }
      });
      saveAccounts(list);
    }
    return rec;
  }

  function myRecords(gameId) {
    var u = currentRaw();
    if (!u) return [];
    return records().filter(function (r) { return r.uid === u.id && (!gameId || r.gameId === gameId); })
      .sort(function (a, b) { return b.score - a.score; });
  }

  function bestOf(gameId) {
    var u = currentRaw();
    if (!u) return Number(localStorage.getItem('gk_' + gameId + '_best') || 0);
    var mine = records().filter(function (r) { return r.uid === u.id && r.gameId === gameId; });
    return mine.reduce(function (m, r) { return Math.max(m, r.score); }, 0);
  }

  function ranking(gameId, limit) {
    var best = {};
    records().forEach(function (r) {
      if (gameId && r.gameId !== gameId) return;
      var k = r.uid || r.username;
      if (!best[k] || r.score > best[k].score) best[k] = r;
    });
    return Object.keys(best).map(function (k) { return best[k]; })
      .sort(function (a, b) { return b.score - a.score; }).slice(0, limit || 20);
  }

  function allRecords() { return records().slice().reverse(); }

  /* ---------------- 管理接口 ---------------- */
  function adminLogin(account, password) {
    if ((account || '').trim() === ADMIN.account && password === ADMIN.password) {
      write(K_ADM, { account: ADMIN.account, name: ADMIN.name, at: nowISO() });
      logAdmin('登录后台', account);
      return { ok: true };
    }
    return { ok: false, error: 'admin.err' };
  }
  function adminSession() { return read(K_ADM, null); }
  function adminLogout() { try { localStorage.removeItem(K_ADM); } catch (e) { } }

  var K_LOG = 'startide_adminlog_v2';
  function logAdmin(action, target) {
    var logs = read(K_LOG, []);
    logs.push({ id: uid('l_'), action: action, target: target || '', at: nowISO() });
    write(K_LOG, logs.slice(-500));
  }
  function adminLogs() { return read(K_LOG, []).slice().reverse(); }

  function listUsers() { return accounts().map(publicUser).sort(function (a, b) { return (b.createdAt || '') < (a.createdAt || '') ? -1 : 1; }); }
  function setBanned(id, v) {
    var list = accounts();
    list.forEach(function (x) { if (x.id === id) x.banned = !!v; });
    saveAccounts(list);
    logAdmin(v ? '封禁用户' : '解封用户', id);
    var u = currentRaw(); if (u && u.id === id && v) logout();
  }
  function removeUser(id) {
    saveAccounts(accounts().filter(function (x) { return x.id !== id; }));
    saveRecords(records().filter(function (r) { return r.uid !== id; }));
    logAdmin('删除用户', id);
  }
  function resetUserPassword(id) {
    var list = accounts();
    list.forEach(function (x) { if (x.id === id) x.pass = ''; });
    saveAccounts(list);
    logAdmin('重置密码', id);
  }
  function clearRecords() { saveRecords([]); logAdmin('清空战绩', '全部'); }
  function removeRecord(id) {
    saveRecords(records().filter(function (r) { return r.id !== id; }));
    logAdmin('删除记录', id);
  }

  function stats() {
    var as = accounts(), rs = records();
    var today = new Date().toISOString().slice(0, 10);
    var todayNew = as.filter(function (u) { return (u.createdAt || '').slice(0, 10) === today; });
    var todayPlays = rs.filter(function (r) { return (r.createdAt || '').slice(0, 10) === today; });
    var byGame = {};
    rs.forEach(function (r) { byGame[r.gameId] = (byGame[r.gameId] || 0) + 1; });
    return {
      users: as.length,
      banned: as.filter(function (u) { return u.banned; }).length,
      todayNew: todayNew.length,
      plays: rs.length,
      todayPlays: todayPlays.length,
      totalScore: rs.reduce(function (s, r) { return s + (r.score || 0); }, 0),
      online: climb(60 + as.length * 3),
      byGame: byGame
    };
  }

  /* ---------------- 演示数据 ---------------- */
  function seed() {
    if (read(K_SEED, false)) return;
    write(K_SEED, true);
    var names = ['风一样的少年', 'NeoStar', 'PixelKing', '夜雨微凉', 'ArcadeFox', '星橙', 'LunaByte', '老玩家阿凯', 'MarioFan88', 'CloudRunner'];
    var list = accounts();
    if (list.length === 0) {
      names.forEach(function (n, i) {
        list.push({
          id: uid('u_seed'), username: 'player' + (100 + i), nickname: n,
          phone: i % 3 === 0 ? '138' + String(10000000 + i * 12345).slice(0, 8) : '',
          pass: hash('123456'), avatar: ['🎮', '🚀', '🐉', '👾', '🦊', '🐼', '🌟', '🎯'][i % 8],
          coins: 100 + i * 37, exp: 120 * (1 + i), plays: 4 + i * 3,
          banned: false, createdAt: new Date(Date.now() - (i + 1) * 86400000 * 2).toISOString(),
          lastLogin: new Date(Date.now() - i * 3600000).toISOString(), provider: i % 3 === 0 ? 'phone' : 'account'
        });
      });
      saveAccounts(list);
    }
    var rs = [];
    var gameIds = ['shooter', 'mario', 'breakout', 'snake', 'tetris', 'g2048'];
    var gameNames = { shooter: '星际战机', mario: '超级冒险', breakout: '霓虹打砖块', snake: '霓虹贪吃蛇', tetris: '霓虹俄罗斯方块', g2048: '2048 数字合并' };
    var accs = accounts();
    for (var d = 20; d >= 0; d--) {
      var cnt = 6 + Math.floor(Math.random() * 10);
      for (var k = 0; k < cnt; k++) {
        var u = accs[Math.floor(Math.random() * accs.length)];
        var gid = gameIds[Math.floor(Math.random() * gameIds.length)];
        rs.push({
          id: uid('r_seed'), uid: u.id, username: u.nickname, gameId: gid, gameName: gameNames[gid],
          score: Math.round(200 + Math.random() * 9800), duration: 60 + Math.round(Math.random() * 400),
          detail: '', createdAt: new Date(Date.now() - d * 86400000 - Math.random() * 80000000).toISOString()
        });
      }
    }
    saveRecords(records().concat(rs).slice(-2000));
  }

  function setRecordScore() { }

  global.Auth = {
    ADMIN: { account: ADMIN.account },
    current: current, currentRaw: currentRaw, update: update,
    loginWithPassword: loginWithPassword, loginWithPhone: loginWithPhone,
    sendCode: sendCode, logout: logout,
    addRecord: addRecord, myRecords: myRecords, bestOf: bestOf, ranking: ranking, allRecords: allRecords,
    adminLogin: adminLogin, adminSession: adminSession, adminLogout: adminLogout,
    listUsers: listUsers, setBanned: setBanned, removeUser: removeUser,
    resetUserPassword: resetUserPassword, clearRecords: clearRecords, removeRecord: removeRecord,
    adminLogs: adminLogs, logAdmin: logAdmin, stats: stats, seed: seed
  };

  seed();
})(window);
