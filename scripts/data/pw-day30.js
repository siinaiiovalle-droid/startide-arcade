async page => {
  const base = 'http://localhost:8820';
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message.slice(0, 120)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 120)); });
  const out = { tetris2: {}, maze: {}, bullet: {} };

  const st = () => page.evaluate(() => window.__A().state());
  const call = (fn, ...args) => page.evaluate(fn, ...args);
  async function openGame(id) {
    await page.goto(base + '/play.html?g=' + id + '&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForSelector('#stage canvas', { timeout: 15000 });
    await page.waitForTimeout(700);
    return page.evaluate(() => {
      const c = document.querySelector('#stage canvas');
      if (!c || !c.__auto) return false;
      window.__A = function () { return c.__auto; };
      return true;
    });
  }
  async function modalUp() {
    return page.evaluate(() => {
      const m = document.querySelector('.modal');
      return !!(m && getComputedStyle(m).display !== 'none' && +getComputedStyle(m).opacity > 0.5);
    });
  }
  async function waitModal(sec) {
    const t0 = Date.now();
    while (Date.now() - t0 < sec) {
      if (await modalUp()) return true;
      await page.waitForTimeout(150);
    }
    return false;
  }
  async function closeModal() {
    await page.evaluate(() => { const b = document.querySelector('.modal__foot .btn--primary'); if (b) b.click(); });
    await page.waitForTimeout(450);
  }
  /* 坑 19：先点暂停再抓两帧 */
  async function pauseFreeze() {
    await page.evaluate(() => document.getElementById('btnPause').click());
    await page.waitForTimeout(150);
    const f1 = await page.evaluate(() => document.querySelector('#stage canvas').toDataURL());
    await page.waitForTimeout(400);
    const f2 = await page.evaluate(() => document.querySelector('#stage canvas').toDataURL());
    await page.evaluate(() => document.getElementById('btnPause').click());
    await page.waitForTimeout(150);
    return f1 === f2 ? 'frozen' : 'moving';
  }

  /* ---------------- tetris2 ---------------- */
  if (await openGame('tetris2')) {
    const t = out.tetris2;
    t.canvas = 'hooked';
    const s0 = await st();
    t.init = { score: s0.score, lines: s0.lines, over: s0.over, t: s0.t };
    /* 键盘移动（DAS） */
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(130);
    await page.keyboard.up('ArrowLeft');
    const s1 = await st();
    t.keyMove = s1.x < s0.x ? 'moves' : ('fail ' + s0.x + '->' + s1.x);
    /* 旋转 + TETRIS：竖直 I 落入 9 列缝 */
    await page.evaluate(() => {
      const a = window.__A();
      a.setGrid(4, 0);
      a.setPiece('I');
      a.rot();
      for (let i = 0; i < 5; i++) a.move(-1);
      a.hard();
    });
    await page.waitForTimeout(400);
    const s2 = await st();
    t.tetris = s2.lines === 4 ? ('tetris ok score=' + s2.score + ' level=' + s2.level) : ('fail lines=' + s2.lines);
    /* 暂存 Hold */
    const pre = await st();
    await page.evaluate(() => window.__A().hold());
    const s3 = await st();
    t.hold = s3.hold === pre.t ? 'holds (' + s3.hold + ')' : ('fail hold=' + s3.hold + ' pre=' + pre.t);
    /* 暂停冻结 */
    t.pauseFrozen = await pauseFreeze();
    /* lose：顶到天花板 */
    await page.evaluate(() => { window.__A().setGrid(19, 0); window.__A().hard(); });
    await page.waitForTimeout(500);
    const s4 = await st();
    t.lose = s4.over ? 'over' : ('fail over=false lines=' + s4.lines);
    t.loseModal = await waitModal(4000);
    t.best = await page.evaluate(() => localStorage.getItem('gk_tetris2_best'));
    await closeModal();
  } else { out.tetris2.canvas = 'NO HOOK'; }

  /* ---------------- maze ---------------- */
  if (await openGame('maze')) {
    const m = out.maze;
    m.canvas = 'hooked';
    const s0 = await st();
    m.init = { x: s0.x, y: s0.y, keys: s0.keys, timeLeft: Math.round(s0.timeLeft), exit: s0.exit };
    /* 键盘单步：按几何真值选一条通路（起点右侧/下方本可能是墙） */
    m.geom = await page.evaluate(() => window.__A().geom());
    const dirs = ['right', 'down', 'up', 'left'];
    const openDir = await page.evaluate((ds) => ds.find(d => window.__A().open(d)), dirs);
    m.openDir = openDir;
    await page.evaluate((d) => window.__A().move(d), openDir);
    const s1 = await st();
    const stepOk = openDir === 'right' ? s1.x === 1 : (openDir === 'left' ? s1.x < 0 : (openDir === 'down' ? s1.y === 1 : s1.y < 0));
    m.stepMove = stepOk ? ('moves ' + openDir) : ('fail ' + openDir + ' at ' + s1.x + ',' + s1.y);
    /* 触屏点击目标格自动寻路：合成 pointer（与游戏同一套 rect→logical 映射） */
    await page.evaluate(() => {
      const a = window.__A(), g = a.geom();
      const c = document.querySelector('#stage canvas');
      const r = c.getBoundingClientRect();
      /* 目标格选 BFS 距离 3 的格（保证是通路而非自身） */
      const steps = a.pathTo(0, 0) && null;
      const tx = g.mx + 2.5 * g.cell, ty = g.my + 0.5 * g.cell;
      window.__cellInfo = a.cellAt(tx, ty);
      c.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: r.left + tx * r.width / 560, clientY: r.top + ty * r.height / 700,
        bubbles: true, pointerId: 9, pointerType: 'touch'
      }));
    });
    const cellInfo = await page.evaluate(() => window.__cellInfo);
    /* 完美迷宫走廊绕远路，等自动寻路真正走到目标格（轮询，最长 9s） */
    let reached = false, s2 = null;
    const tw0 = Date.now();
    while (Date.now() - tw0 < 9000) {
      s2 = await st();
      if (s2.x === cellInfo[0] && s2.y === cellInfo[1]) { reached = true; break; }
      await page.waitForTimeout(200);
    }
    m.cellAt = cellInfo;
    m.touchPath = reached ? ('reaches (' + cellInfo[0] + ',' + cellInfo[1] + ')') : ('fail at ' + s2.x + ',' + s2.y);
    /* 手柄方向键：选当前格另一条通路 */
    await page.evaluate(() => document.getElementById('btnPad').click());
    await page.waitForTimeout(150);
    const pA = await st();
    const padDir = await page.evaluate((ds) => ds.find(d => window.__A().open(d)), ['down', 'up', 'left', 'right']);
    await page.locator('.gk-pad__btn[data-k="' + padDir + '"]').first().dispatchEvent('mousedown');
    await page.waitForTimeout(260);
    await page.locator('.gk-pad__btn[data-k="' + padDir + '"]').first().dispatchEvent('mouseup');
    const pB = await st();
    const moved = pA.x !== pB.x || pA.y !== pB.y;
    m.padMove = moved ? ('moves ' + padDir + ' ' + pA.x + ',' + pA.y + '->' + pB.x + ',' + pB.y) : ('fail ' + padDir);
    await page.evaluate(() => document.getElementById('btnPad').click());
    /* win：BFS 规划（拾钥→出口）批量重放（坑 12） */
    const plan = await page.evaluate(() => window.__A().plan());
    m.planLen = plan ? plan.length : null;
    if (plan && plan.length) {
      await page.evaluate((p) => new Promise((res) => {
        const a = window.__A();
        let i = 0;
        const iv = setInterval(() => {
          if (i >= p.length) { clearInterval(iv); res(true); return; }
          a.move(p[i++]);
        }, 14);
      }), plan);
      await page.waitForTimeout(700);
      const s3 = await st();
      m.win = (s3.over && s3.won) ? ('win steps=' + s3.steps) : ('fail over=' + s3.over + ' keys=' + s3.keys + ' at ' + s3.x + ',' + s3.y);
      m.winModal = await waitModal(4000);
      m.best = await page.evaluate(() => localStorage.getItem('gk_maze_best'));
      await closeModal();
    }
    /* lose：超时 */
    await page.evaluate(() => window.__A().setTime(0.6));
    await page.waitForTimeout(1400);
    const s4 = await st();
    m.lose = (s4.over && s4.lost) ? 'over' : ('fail over=' + s4.over + ' lost=' + s4.lost);
    m.loseModal = await waitModal(4000);
    await closeModal();
    m.pauseFrozen = await pauseFreeze();
  } else { out.maze.canvas = 'NO HOOK'; }

  /* ---------------- bullet ---------------- */
  if (await openGame('bullet')) {
    const b = out.bullet;
    b.canvas = 'hooked';
    const s0 = await st();
    b.init = { lives: s0.lives, timeLeft: Math.round(s0.timeLeft), x: Math.round(s0.x) };
    /* 键盘持续移动 */
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(300);
    await page.keyboard.up('ArrowRight');
    const s1 = await st();
    b.keyMove = s1.x > s0.x + 40 ? 'moves' : ('fail ' + Math.round(s0.x) + '->' + Math.round(s1.x));
    /* 手柄方向键 */
    await page.evaluate(() => document.getElementById('btnPad').click());
    await page.waitForTimeout(150);
    const pA = await st();
    await page.locator('.gk-pad__btn[data-k="left"]').first().dispatchEvent('mousedown');
    await page.waitForTimeout(320);
    await page.locator('.gk-pad__btn[data-k="left"]').first().dispatchEvent('mouseup');
    const pB = await st();
    b.padMove = pB.x < pA.x - 40 ? 'moves' : ('fail ' + Math.round(pA.x) + '->' + Math.round(pB.x));
    await page.evaluate(() => document.getElementById('btnPad').click());
    /* 触屏拖动跟随（合成 pointer，坑 30） */
    await page.evaluate(() => {
      const c = document.querySelector('#stage canvas');
      const r = c.getBoundingClientRect();
      const ev = (type, cx, cy) => c.dispatchEvent(new PointerEvent(type, { clientX: cx, clientY: cy, bubbles: true, pointerId: 7, pointerType: 'touch' }));
      ev('pointerdown', r.left + r.width * 0.5, r.top + r.height * 0.75);
      ev('pointermove', r.left + r.width * 0.2, r.top + r.height * 0.75);
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const c = document.querySelector('#stage canvas');
      const r = c.getBoundingClientRect();
      c.dispatchEvent(new PointerEvent('pointerup', { clientX: r.left + r.width * 0.2, clientY: r.top + r.height * 0.75, bubbles: true, pointerId: 7, pointerType: 'touch' }));
    });
    const pC = await st();
    b.touchMove = pC.x < pB.x - 40 ? 'moves' : ('fail ' + Math.round(pB.x) + '->' + Math.round(pC.x));
    /* 弹幕在飞 + 分数在涨 */
    b.bullets = await page.evaluate(() => window.__A().bulletsCount());
    await page.waitForTimeout(1200);
    const s2 = await st();
    b.alive = { score: s2.score, stars: s2.stars, timeLeft: Math.round(s2.timeLeft) };
    b.scoreGrowing = s2.score > 0 ? 'grows' : 'fail';
    /* 暂停冻结 */
    b.pauseFrozen = await pauseFreeze();
    /* win：存活到底 */
    await page.evaluate(() => window.__A().setTime(1.5));
    await page.waitForTimeout(2300);
    const s3 = await st();
    b.win = (s3.over && s3.won) ? ('win score=' + s3.score) : ('fail over=' + s3.over + ' won=' + s3.won);
    b.winModal = await waitModal(4000);
    b.best = await page.evaluate(() => localStorage.getItem('gk_bullet_best'));
    await closeModal();
    /* lose：4 连击坠机 */
    await page.evaluate(() => { const a = window.__A(); a.hurt(); a.hurt(); a.hurt(); a.hurt(); });
    await page.waitForTimeout(500);
    const s4 = await st();
    b.lose = (s4.over && !s4.won) ? 'over' : ('fail over=' + s4.over + ' lives=' + s4.lives);
    b.loseModal = await waitModal(4000);
    await closeModal();
  } else { out.bullet.canvas = 'NO HOOK'; }

  out.errors = errors.slice(0, 10);
  return JSON.stringify(out);
}
