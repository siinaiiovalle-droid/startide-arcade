async page => {
  /* 2026-09-23 三款新游验收：赛车 racer / 直升机 helicopter / 平衡栈塔 stack */
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

  /* ---------------- 赛车躲避 ---------------- */
  await open('racer');
  g.racer = {};
  g.racer.canvas = await A();
  g.racer.lane = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.setLane(0);
    return a.state();
  });
  await page.waitForTimeout(1600);
  g.racer.flow = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  /* 键盘切道（onKey 路径） */
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  g.racer.keyLane = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state().lane;
  });
  g.racer.crash = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.crash();
    return true;
  });
  g.racer.modal = await waitModal(5000);
  g.racer.best = await page.evaluate(() => localStorage.getItem('gk_racer_best'));
  if (g.racer.modal) {
    g.racer.replay = await page.evaluate(() => {
      const btn = document.querySelector('.modal__foot .btn--primary');
      if (!btn) return 'no-btn';
      btn.click();
      return 'clicked';
    });
    await page.waitForTimeout(900);
    g.racer.replayState = await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      return a ? a.state() : null;
    });
  }

  /* ---------------- 直升机 ---------------- */
  await open('helicopter');
  g.heli = {};
  g.heli.canvas = await A();
  g.heli.y0 = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  /* 按住上升（页面内按住 pad 输入源：pointer） */
  await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.setHold(true);
  });
  await page.waitForTimeout(700);
  g.heli.rising = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.setHold(false);
  });
  await page.waitForTimeout(600);
  g.heli.falling = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  /* 键盘按住空格上升（pad.a 路径） */
  await page.keyboard.down('Space');
  await page.waitForTimeout(600);
  g.heli.keyRise = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  await page.keyboard.up('Space');
  g.heli.crash = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.crash();
    return true;
  });
  g.heli.modal = await waitModal(5000);
  g.heli.best = await page.evaluate(() => localStorage.getItem('gk_helicopter_best'));

  /* ---------------- 平衡栈塔 ---------------- */
  await open('stack');
  g.stack = {};
  g.stack.canvas = await A();
  /* 三连完美（测试钩子把摆块摆在正中） */
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(320);
    await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      a.setSwingX(280);
      a.drop();
    });
  }
  await page.waitForTimeout(400);
  g.stack.perfect3 = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  /* 偏移 30 → 切除 */
  await page.waitForTimeout(320);
  g.stack.offset = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const top = a.state();
    a.setSwingX(280 + 30);
    a.drop();
    return top;
  });
  await page.waitForTimeout(400);
  g.stack.afterOffset = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  /* 键盘空格放一块 */
  await page.waitForTimeout(320);
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  g.stack.keyDrop = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  /* 落空 → 结算 */
  await page.waitForTimeout(320);
  await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.setSwingX(530);
    a.drop();
  });
  g.stack.modal = await waitModal(5000);
  g.stack.best = await page.evaluate(() => localStorage.getItem('gk_stack_best'));
  g.stack.finalState = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });

  return g;
}
