async page => {
  /* 2026-09-24 三款新游验收（修订 2）：射箭收尾 / 守塔漏怪 / 进阶鸟开局 */
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

  /* ---------------- 射箭：打完收尾 → 结算 ---------------- */
  await open('archery');
  g.archery = {};
  for (let i = 0; i < 14; i++) {
    const st = await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      const s = a.state();
      if (s.over) return s;
      if (s.arrows > 0 && !s.charging) a.shoot(95);
      return a.state();
    });
    if (st.over) break;
    await page.waitForTimeout(450);
    await page.evaluate(() => { const a = document.querySelector('#stage canvas').__auto; a.nextRound(); });
    await page.waitForTimeout(1250);
  }
  g.archery.end = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  g.archery.modal = await waitModal(6000);
  g.archery.best = await page.evaluate(() => localStorage.getItem('gk_archery_best'));

  /* ---------------- 守塔：不建塔看漏怪扣命 → 判负 ---------------- */
  await open('towerdef');
  g.td = {};
  await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.spawnWave();
  });
  await page.waitForTimeout(9000);
  g.td.leak = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  await page.waitForTimeout(16000);
  g.td.end = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  g.td.modal = await waitModal(4000);
  g.td.best = await page.evaluate(() => localStorage.getItem('gk_towerdef_best'));

  /* ---------------- 像素鸟进阶：键盘开局 + 飞行 ---------------- */
  await open('flappy2');
  g.f2 = {};
  await page.keyboard.down('Space');
  await page.waitForTimeout(120);
  await page.keyboard.up('Space');
  await page.waitForTimeout(150);
  g.f2.flapKey = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  for (let i = 0; i < 18; i++) {
    await page.keyboard.down('Space');
    await page.waitForTimeout(100);
    await page.keyboard.up('Space');
    await page.waitForTimeout(360);
    const s = await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      return a.state().over;
    });
    if (s) break;
  }
  g.f2.flight = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(1000);
    const s = await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      return a.state().over;
    });
    if (s) break;
  }
  g.f2.end = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  g.f2.modal = await waitModal(5000);
  g.f2.best = await page.evaluate(() => localStorage.getItem('gk_flappy2_best'));

  return g;
}
