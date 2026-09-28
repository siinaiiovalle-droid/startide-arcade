async page => {
  const out = { errs: [], games: {} };
  page.on('console', m => { if (m.type() === 'error') out.errs.push('CONSOLE ' + m.text().slice(0, 120)); });
  page.on('pageerror', e => out.errs.push('PAGEERROR ' + e.message.slice(0, 120)));
  const base = 'http://localhost:8820';
  const hud = () => page.locator('#hud').innerText().then(t => t.replace(/\s+/g, ' ').slice(0, 70));
  const scoreFromHud = async () => { const m = (await hud()).match(/得分 (\d+)/); return m ? +m[1] : -1; };
  const modalVisible = () => page.evaluate(() => {
    const m = document.querySelector('.modal');
    if (!m) return false;
    const cs = getComputedStyle(m);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.5;
  });
  const clickLogical = async (lx, ly) => {
    const b = await page.locator('#stage canvas').boundingBox();
    const scale = b.width / 560;
    await page.locator('#stage canvas').click({ position: { x: lx * scale, y: ly * scale } });
  };
  const bestKey = (id) => page.evaluate((k) => localStorage.getItem(k), 'gk_' + id + '_best');

  /* 连连看 */
  {
    await page.goto(base + '/play.html?g=link&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1400);
    const g = {};
    g.hud0 = await hud();
    let matched = false;
    for (let k = 0; k < 12 && !matched; k++) {
      const pair = await page.evaluate(() => {
        const a = document.querySelector('#stage canvas').__auto;
        return a ? a.pair() : null;
      });
      if (!pair) break;
      const c1 = await page.evaluate(([r, c]) => document.querySelector('#stage canvas').__auto.center(r, c), [pair.r1, pair.c1]);
      const c2 = await page.evaluate(([r, c]) => document.querySelector('#stage canvas').__auto.center(r, c), [pair.r2, pair.c2]);
      await clickLogical(c1.x, c1.y);
      await page.waitForTimeout(220);
      await clickLogical(c2.x, c2.y);
      await page.waitForTimeout(500);
      if ((await scoreFromHud()) > 0) matched = true;
    }
    g.matched = matched;
    g.hudAfter = await hud();
    await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
    await page.waitForTimeout(300);
    const s1 = await page.locator('#stage canvas').screenshot();
    await page.waitForTimeout(800);
    const s2 = await page.locator('#stage canvas').screenshot();
    g.pauseFrozen = s1.toString('base64') === s2.toString('base64');
    await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('#stage canvas').__auto.hurry());
    await page.waitForTimeout(2000);
    g.timeoutModal = await modalVisible();
    g.best = await bestKey('link');
    out.games.link = g;
  }

  /* 数独 */
  {
    await page.goto(base + '/play.html?g=sudoku&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1400);
    const g = {};
    g.hud0 = await hud();
    const sol = await page.evaluate(() => document.querySelector('#stage canvas').__auto.solution());
    await page.keyboard.press('Digit' + sol[0]);
    await page.waitForTimeout(250);
    g.scoreAfterKey = await scoreFromHud();
    let firstEmpty = 0;
    for (let i = 0; i < 81; i++) { firstEmpty = i; break; }
    const want = sol[firstEmpty];
    const wrongDigit = want === 9 ? 1 : 9;
    await page.evaluate(([i, d]) => document.querySelector('#stage canvas').__auto.set(i, d), [firstEmpty, wrongDigit]);
    await page.waitForTimeout(300);
    g.hudWrong = await hud();
    await page.evaluate(([i, d]) => document.querySelector('#stage canvas').__auto.set(i, d), [firstEmpty, want]);
    await page.waitForTimeout(200);
    await page.evaluate((solution) => {
      const a = document.querySelector('#stage canvas').__auto;
      for (let i = 0; i < 81; i++) a.set(i, solution[i]);
    }, sol);
    await page.waitForTimeout(900);
    g.winModal = await modalVisible();
    g.hudWin = await hud();
    g.best = await bestKey('sudoku');
    out.games.sudoku = g;
  }

  return JSON.stringify(out, null, 1);
}
