async page => {
  /* 2026-09-25 三款新游验收：拼图 puzzle / 找不同 spotdiff / 反应力测试 reflex */
  const B = 'http://localhost:8820';
  const g = { errors: [] };
  page.on('pageerror', (e) => g.errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') g.errors.push('console: ' + m.text().slice(0, 150)); });

  async function open(id) {
    await page.goto(B + '/play.html?g=' + id + '&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForSelector('#stage canvas', { timeout: 9000 });
    await page.waitForTimeout(500);
  }
  async function waitModal(ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const up = await page.evaluate(() => {
        const m = document.querySelector('.modal');
        if (!m) return false;
        const cs = getComputedStyle(m);
        return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.5;
      });
      if (up) return true;
      await page.waitForTimeout(200);
    }
    return false;
  }
  const A = () => page.evaluate(() => {
    const c = document.querySelector('#stage canvas');
    return c && c.__auto ? 'hooked' : 'no-hook';
  });
  /* 逻辑坐标 → 画布 CSS 坐标点击（坑 20） */
  async function canvasClick(lx, ly) {
    const rect = await page.evaluate(() => {
      const r = document.querySelector('#stage canvas').getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await page.mouse.click(rect.x + lx * rect.w / 560, rect.y + ly * rect.h / 700);
  }

  /* ---------------- 拼图 puzzle ---------------- */
  await open('puzzle');
  g.puzzle = {};
  g.puzzle.canvas = await A();
  g.puzzle.init = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const s = a.state();
    return { n: s.n, moves: s.moves, scrambled: !s.solved, scrambleLen: a.scramble().length };
  });
  /* 键盘：方向键移动选中 + 空格两步交换 */
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(120);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(150);
  await page.keyboard.down('Space');
  await page.waitForTimeout(120);
  await page.keyboard.up('Space');
  await page.waitForTimeout(150);
  g.puzzle.afterKey = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const s = a.state();
    return { sel: s.sel, pick: s.pick, moves: s.moves };
  });
  /* 真实触屏：点击两块交换 */
  const c0 = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.tileCenter(0);
  });
  const c1 = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.tileCenter(1);
  });
  await canvasClick(c0.x, c0.y);
  await page.waitForTimeout(150);
  g.puzzle.touchPick = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state().pick;
  });
  await canvasClick(c1.x, c1.y);
  await page.waitForTimeout(150);
  g.puzzle.touchSwap = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  /* 复原：重放打乱记录（含撤销验证） */
  g.puzzle.solve = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const log = a.scramble();
    for (const [x, y] of log) a.swapIdx(x, y);
    const s1 = a.state();
    /* 若上述重放后已解，直接返回；否则再放一次打乱（偶发） */
    return { moves: s1.moves, solved: s1.solved, over: s1.over };
  });
  await page.waitForTimeout(400);
  g.puzzle.end = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  g.puzzle.modal = await waitModal(5000);
  g.puzzle.best = await page.evaluate(() => localStorage.getItem('gk_puzzle_best'));

  /* ---------------- 找不同 spotdiff ---------------- */
  await open('spotdiff');
  g.sd = {};
  g.sd.canvas = await A();
  g.sd.init = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  /* 故意误点一处空白（左上角天空，通常无差异） */
  await canvasClick(60, 200);
  await page.waitForTimeout(150);
  g.sd.afterMiss = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  /* 键盘光标：方向键移动 + 空格（点到差异算找到，点不到算误点，都算通路验证） */
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(100);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(100);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down('Space');
  await page.waitForTimeout(100);
  await page.keyboard.up('Space');
  await page.waitForTimeout(150);
  g.sd.afterKey = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return { cur: a.cursorState(), s: a.state() };
  });
  /* 逐个点击差异（真实点击路径） */
  const hints = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.hints();
  });
  g.sd.hintCount = hints.length;
  for (const h of hints) {
    const ly = h.img === 0 ? 26 + h.y : 384 + h.y;
    await canvasClick(30 + h.x, ly);
    await page.waitForTimeout(180);
  }
  g.sd.end = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  g.sd.modal = await waitModal(5000);
  g.sd.best = await page.evaluate(() => localStorage.getItem('gk_spotdiff_best'));

  /* ---------------- 反应力测试 reflex ---------------- */
  await open('reflex');
  g.rx = {};
  g.rx.canvas = await A();
  g.rx.init = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  /* 键盘空格开局 */
  await page.keyboard.down('Space');
  await page.waitForTimeout(100);
  await page.keyboard.up('Space');
  await page.waitForTimeout(200);
  g.rx.started = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  /* 5 轮：等 go → 点击 */
  for (let i = 0; i < 5; i++) {
    try {
      await page.waitForFunction(() => {
        const c = document.querySelector('#stage canvas');
        return c && c.__auto && c.__auto.state().state === 'go';
      }, { timeout: 9000 });
    } catch (e) { /* 可能脱靶跳轮，继续 */ }
    await page.waitForTimeout(60);
    await canvasClick(280, 290);
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1500);
  g.rx.end = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  g.rx.modal = await waitModal(5000);
  g.rx.best = await page.evaluate(() => localStorage.getItem('gk_reflex_best'));
  /* 抢跑路径：重开后立刻二次按键 */
  await page.evaluate(() => {
    const btn = document.querySelector('.modal__foot .btn--primary');
    if (btn) btn.click();
  });
  await page.waitForTimeout(900);
  await page.keyboard.down('Space');
  await page.waitForTimeout(100);
  await page.keyboard.up('Space');
  await page.waitForTimeout(150);
  await page.keyboard.down('Space');
  await page.waitForTimeout(100);
  await page.keyboard.up('Space');
  await page.waitForTimeout(150);
  g.rx.foul = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });

  return g;
}
