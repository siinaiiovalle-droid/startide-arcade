async page => {
  /* 2026-09-22 三款新游验收：气球射击 balloon / 保龄球 bowling / 打鸭子 duck */
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

  /* ---------------- 气球射击 ---------------- */
  await open('balloon');
  g.balloon = {};
  g.balloon.canvas = await A();
  g.balloon.hit = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.spawn(); a.spawn(); a.spawn();
    const b = a.list()[0];
    a.fire(b.x, b.y);
    const s1 = a.state();
    return { popped: s1.popped, score: s1.score, combo: s1.combo, n: s1.n };
  });
  await page.waitForTimeout(250);
  g.balloon.miss = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.fire(10, 10);
    return a.state();
  });
  await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    for (let i = 0; i < 6; i++) a.spawn();
  });
  await page.waitForTimeout(2600);
  g.balloon.afterEsc = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  g.balloon.endNow = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.endNow();
    return a.state();
  });
  g.balloon.modal = await waitModal(6000);
  g.balloon.best = await page.evaluate(() => localStorage.getItem('gk_balloon_best'));
  if (g.balloon.modal) {
    g.balloon.replay = await page.evaluate(() => {
      const btn = document.querySelector('.modal__foot .btn--primary');
      if (!btn) return 'no-btn';
      btn.click();
      return 'clicked';
    });
    await page.waitForTimeout(900);
    g.balloon.replayState = await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      return a ? a.state() : null;
    });
  }

  /* ---------------- 保龄球 ---------------- */
  await open('bowling');
  g.bowling = {};
  g.bowling.canvas = await A();
  g.bowling.score300 = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.testScore(Array(12).fill(10));
  });
  g.bowling.score190 = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const rs = [];
    for (let i = 0; i < 10; i++) { rs.push(9, 1); }
    rs.push(9);
    return a.testScore(rs);
  });
  g.bowling.score90 = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const rs = [];
    for (let i = 0; i < 10; i++) { rs.push(4, 5); }
    return a.testScore(rs);
  });
  g.bowling.roll1 = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.launchPower(97, 280);
    return a.state().phase;
  });
  try {
    await page.waitForFunction(() => {
      const a = document.querySelector('#stage canvas').__auto;
      return a && a.state().phase === 0;
    }, { timeout: 14000 });
    g.bowling.roll1Settled = true;
  } catch (e) { g.bowling.roll1Settled = false; }
  g.bowling.roll1State = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  g.bowling.roll2 = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.launchPower(85, 250);
    return true;
  });
  try {
    await page.waitForFunction(() => {
      const a = document.querySelector('#stage canvas').__auto;
      return a && a.state().phase === 0;
    }, { timeout: 14000 });
    g.bowling.roll2Settled = true;
  } catch (e) { g.bowling.roll2Settled = false; }
  g.bowling.roll2State = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });

  /* ---------------- 打鸭子 ---------------- */
  await open('duck');
  g.duck = {};
  g.duck.canvas = await A();
  g.duck.hit = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.spawn(1, false, 120);
    a.spawn(-1, false, 120);
    const d = a.list().find((x) => !x.falling);
    a.fire(d.x, d.y);
    return a.state();
  });
  await page.waitForTimeout(200);
  g.duck.goldAndMiss = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const s0 = a.state().score;
    a.spawn(1, true, 100);
    const d = a.list().find((x) => x.gold && !x.falling);
    a.fire(d.x, d.y);
    const s1 = a.state();
    return { before: s0, after: s1.score, hits: s1.hits, combo: s1.combo };
  });
  await page.waitForTimeout(200);
  g.duck.miss = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.fire(10, 10);
    return a.state();
  });
  await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.spawn(1, false, 520);
    a.spawn(1, false, 520);
    a.spawn(1, false, 520);
  });
  g.duck.modal = await waitModal(9000);
  g.duck.finalState = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  g.duck.best = await page.evaluate(() => localStorage.getItem('gk_duck_best'));

  return g;
}
