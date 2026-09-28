async page => {
  const B = 'http://localhost:8820';
  const g = {};
  await page.goto(B + '/play.html?g=slot&cb=' + Date.now(), { waitUntil: 'load' });
  await page.waitForSelector('#stage canvas', { timeout: 9000 });
  await page.waitForTimeout(500);
  /* 直接清到 0 触发 idle 破产兜底（cash < 最低注 50 即结算） */
  await page.evaluate(() => document.querySelector('#stage canvas').__auto.give(-1000));
  await page.waitForTimeout(400);
  g.state = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  const t0 = Date.now();
  while (Date.now() - t0 < 6000) {
    const up = await page.evaluate(() => {
      const m = document.querySelector('.modal');
      if (!m) return false;
      const cs = getComputedStyle(m);
      return cs.display !== 'none' && +cs.opacity > 0.5;
    });
    if (up) { g.modal = true; break; }
    await page.waitForTimeout(200);
  }
  g.modalText = await page.evaluate(() => {
    const m = document.querySelector('.modal');
    return m ? m.textContent.slice(0, 60) : null;
  });
  return g;
}
