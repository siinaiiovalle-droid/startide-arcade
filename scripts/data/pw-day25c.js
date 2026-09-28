async page => {
  /* 2026-09-25 完整验收：拼图闭环 + 三款交互（暂停/触屏/手柄） */
  const B = 'http://localhost:8820';
  const g = { errors: [] };
  page.on('pageerror', (e) => g.errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') g.errors.push('console: ' + m.text().slice(0, 150)); });

  async function open(id) {
    await page.goto(B + '/play.html?g=' + id + '&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForSelector('#stage canvas', { timeout: 9000 });
    await page.waitForTimeout(500);
  }
  async function frame() {
    return page.evaluate(() => document.querySelector('#stage canvas').toDataURL());
  }
  async function pauseToggle() {
    await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
    await page.waitForTimeout(300);
  }
  async function modalUp() {
    return page.evaluate(() => {
      const m = document.querySelector('.modal');
      if (!m) return false;
      const cs = getComputedStyle(m);
      return cs.display !== 'none' && +cs.opacity > 0.5;
    });
  }
  async function canvasClick(lx, ly) {
    const rect = await page.evaluate(() => {
      const r = document.querySelector('#stage canvas').getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await page.mouse.click(rect.x + lx * rect.w / 560, rect.y + ly * rect.h / 700);
  }
  async function padTap(k) {
    await page.locator('.gk-pad__btn[data-k="' + k + '"]').first().dispatchEvent('mousedown');
    await page.waitForTimeout(90);
    await page.locator('.gk-pad__btn[data-k="' + k + '"]').first().dispatchEvent('mouseup');
    await page.waitForTimeout(120);
  }

  /* ---------------- 拼图：触屏 swap + 手柄 + 暂停 + 逆序重放复原 ---------------- */
  await open('puzzle');
  g.puzzle = {};
  await page.evaluate(() => {
    const st = document.querySelector('.gk-stage');
    if (st) st.classList.add('show-pad');
  });
  await page.waitForTimeout(100);
  /* 触屏两次点击完成一次交换 */
  const tc = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return [a.tileCenter(0), a.tileCenter(1)];
  });
  await canvasClick(tc[0].x, tc[0].y);
  await page.waitForTimeout(150);
  const pickMid = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().pick);
  await canvasClick(tc[1].x, tc[1].y);
  await page.waitForTimeout(150);
  g.puzzle.touch = await page.evaluate((pm) => {
    const a = document.querySelector('#stage canvas').__auto;
    return { pickMid: pm, moves: a.state().moves, pick: a.state().pick };
  }, pickMid);
  /* 手柄：right 移动光标 + A 选块（不指望命中，只验证通路让 pick 变化） */
  await padTap('right');
  await page.waitForTimeout(100);
  const selAfterPad = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().sel);
  await padTap('a');
  await page.waitForTimeout(100);
  g.puzzle.pad = await page.evaluate((sp) => {
    const a = document.querySelector('#stage canvas').__auto;
    return { selAfterPad: sp, pick: a.state().pick, moves: a.state().moves };
  }, selAfterPad);
  /* 暂停冻结（坑 19：先暂停再抓帧） */
  await pauseToggle();
  const f1 = await frame();
  await page.waitForTimeout(1100);
  const f2 = await frame();
  g.puzzle.pauseFrozen = f1 === f2;
  await pauseToggle();
  await page.waitForTimeout(200);
  /* 复原：逆序重放打乱序列（撤销测试期间的扰动），再用归位排序兜底到恒等 */
  await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const log = a.scramble();
    for (let i = log.length - 1; i >= 0; i--) a.swapIdx(log[i][0], log[i][1]);
    const order = a.state().order;
    for (let i = 0; i < order.length; i++) {
      if (order[i] !== i) {
        const j = order.indexOf(i);
        a.swapIdx(i, j);
        const t = order[i]; order[i] = order[j]; order[j] = t;
      }
    }
  });
  await page.waitForTimeout(400);
  g.puzzle.end = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  for (let i = 0; i < 20 && !(await modalUp()); i++) await page.waitForTimeout(200);
  g.puzzle.modal = await modalUp();
  g.puzzle.best = await page.evaluate(() => localStorage.getItem('gk_puzzle_best'));

  /* ---------------- 找不同：暂停冻结 ---------------- */
  await open('spotdiff');
  g.sd = {};
  await pauseToggle();
  const f3 = await frame();
  await page.waitForTimeout(1100);
  const f4 = await frame();
  g.sd.pauseFrozen = f3 === f4;
  await pauseToggle();
  await page.waitForTimeout(200);
  g.sd.stillAlive = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });

  /* ---------------- 反应力：触屏点击启动 + 暂停冻结 ---------------- */
  await open('reflex');
  g.rx = {};
  await canvasClick(280, 290);
  await page.waitForTimeout(200);
  g.rx.touchStart = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state().state;
  });
  await pauseToggle();
  const f5 = await frame();
  await page.waitForTimeout(1100);
  const f6 = await frame();
  g.rx.pauseFrozen = f5 === f6;
  await pauseToggle();
  await page.waitForTimeout(150);
  /* 手柄 A 启动一局（触屏/键盘外的第三通路） */
  await page.evaluate(() => {
    const st = document.querySelector('.gk-stage');
    if (st) st.classList.add('show-pad');
  });
  await page.waitForTimeout(100);
  /* 若暂停期间状态被冻结，先确认当前状态再按 A */
  const stBefore = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  await padTap('a');
  await page.waitForTimeout(200);
  const stAfter = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  g.rx.padStart = { before: stBefore.state, after: stAfter.state, foulsBefore: stBefore.fouls, foulsAfter: stAfter.fouls };

  return g;
}
