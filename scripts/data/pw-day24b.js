async page => {
  /* 2026-09-24 收尾验证：射箭 10 箭结算 / 守塔漏怪扣命 / 进阶鸟自动驾驶得分 */
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

  /* ---------------- 射箭：20 次迭代确保打完 ---------------- */
  await open('archery');
  g.archery = {};
  for (let i = 0; i < 20; i++) {
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

  /* ---------------- 守塔：不建塔，等第一波漏怪扣命 ---------------- */
  await open('towerdef');
  g.td = {};
  await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.spawnWave();
  });
  /* 分段等待，观察 lives 首次下降 */
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(6000);
    const s = await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      const st = a.state();
      return { lives: st.lives, enemies: st.enemies, wave: st.wave, over: st.over };
    });
    if (s.lives < 10 || s.over) { g.td.leak = s; break; }
    if (i === 7) g.td.leak = s;
  }
  g.td.final = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });

  /* ---------------- 进阶鸟：自动驾驶（对准缺口扑翼） ---------------- */
  await open('flappy2');
  g.f2 = {};
  await page.keyboard.down('Space');
  await page.waitForTimeout(120);
  await page.keyboard.up('Space');
  let crashed = false;
  for (let i = 0; i < 90; i++) {
    const act = await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      const s = a.state();
      if (s.over) return { over: true };
      const ps = a.list().filter((p) => p.x + 64 > 130);
      let target = 315;
      if (ps.length) target = ps[0].cy + ps[0].drift;
      const need = s.y > target + 6;
      return { over: false, need: need, y: s.y, target: Math.round(target), score: s.score };
    });
    if (act.over) { crashed = true; break; }
    if (act.need) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(80);
      await page.keyboard.up('Space');
    }
    await page.waitForTimeout(120);
  }
  g.f2.autopilot = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  g.f2.modal = await waitModal(4000);
  g.f2.best = await page.evaluate(() => localStorage.getItem('gk_flappy2_best'));

  return g;
}
