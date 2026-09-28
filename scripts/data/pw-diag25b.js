async page => {
  const B = 'http://localhost:8820';
  const g = {};

  /* ---------- 拼图 ---------- */
  await page.goto(B + '/play.html?g=puzzle&cb=' + Date.now(), { waitUntil: 'load' });
  await page.waitForSelector('#stage canvas', { timeout: 9000 });
  await page.waitForTimeout(600);
  /* 方向键（loop 修好后应生效） */
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(150);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(120);
  const sel1 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().sel);
  /* 渲染确认：画面非纯黑 */
  const px = await page.evaluate(() => {
    const c = document.querySelector('#stage canvas');
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let lit = 0;
    for (let i = 0; i < d.length; i += 40) if (d[i] + d[i + 1] + d[i + 2] > 30) lit++;
    return lit;
  });
  /* scramble 双向一致性 */
  const cons = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const order0 = a.state().order.slice();
    const log = a.scramble();
    const fwd = [];
    for (let i = 0; i < order0.length; i++) fwd.push(i);       /* 恒等 */
    for (const [x, y] of log) { const t = fwd[x]; fwd[x] = fwd[y]; fwd[y] = t; }
    let fwdEq = true;
    for (let i = 0; i < fwd.length; i++) if (fwd[i] !== order0[i]) { fwdEq = false; break; }
    /* 反向重放 */
    for (const [x, y] of log) a.swapIdx(x, y);
    const real = a.state().order;
    const solved = real.every((v, i) => v === i);
    return { fwdEq: fwdEq, solved: solved, over: a.state().over };
  });
  g.puzzle = { sel1: sel1, litPx: px, cons: cons };
  await page.waitForTimeout(400);
  g.puzzle.modal = await page.evaluate(() => {
    const m = document.querySelector('.modal');
    if (!m) return false;
    const cs = getComputedStyle(m);
    return cs.display !== 'none' && +cs.opacity > 0.5;
  });
  g.puzzle.best = await page.evaluate(() => localStorage.getItem('gk_puzzle_best'));

  /* ---------- 反应力 ---------- */
  await page.goto(B + '/play.html?g=reflex&cb=' + Date.now(), { waitUntil: 'load' });
  await page.waitForSelector('#stage canvas', { timeout: 9000 });
  await page.waitForTimeout(500);
  await page.keyboard.down('Space');
  await page.waitForTimeout(100);
  await page.keyboard.up('Space');
  await page.waitForTimeout(150);
  /* 5 轮：页面内轮询等 go（30ms 间隔，最多 8s），命中立即 press */
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => new Promise((res) => {
      const a = document.querySelector('#stage canvas').__auto;
      const t0 = Date.now();
      const iv = setInterval(() => {
        const st = a.state();
        if (st.state === 'go' || Date.now() - t0 > 8000) { clearInterval(iv); res(st.state); }
      }, 30);
    }));
    await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      if (a.state().state === 'go') a.press();
    });
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(1500);
  g.reflex = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  g.reflexModal = await page.evaluate(() => {
    const m = document.querySelector('.modal');
    if (!m) return false;
    const cs = getComputedStyle(m);
    return cs.display !== 'none' && +cs.opacity > 0.5;
  });
  g.reflexBest = await page.evaluate(() => localStorage.getItem('gk_reflex_best'));
  return g;
}
