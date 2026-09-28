async page => {
  const B = 'http://localhost:8820';
  const g = {};
  await page.goto(B + '/play.html?g=puzzle&cb=' + Date.now(), { waitUntil: 'load' });
  await page.waitForSelector('#stage canvas', { timeout: 9000 });
  await page.waitForTimeout(600);

  /* 1) 方向键诊断：记录 window 收到的 keydown 数 + hold 期间 sel 采样 */
  await page.evaluate(() => {
    window.__kd = 0; window.__ku = 0;
    window.addEventListener('keydown', () => window.__kd++);
    window.addEventListener('keyup', () => window.__ku++);
  });
  const selSamples = [];
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(60);
    selSamples.push(await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().sel));
  }
  await page.keyboard.up('ArrowRight');
  g.arrow = { kd: await page.evaluate(() => window.__kd), ku: await page.evaluate(() => window.__ku), selSamples: selSamples };

  /* 2) scramble 一致性：模拟重放 vs 真实 swapIdx */
  g.consist = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const s = a.state();
    const log = a.scramble();
    const sim = s.order.slice();
    for (const [x, y] of log) { const t = sim[x]; sim[x] = sim[y]; sim[y] = t; }
    /* 真实重放 */
    for (const [x, y] of log) a.swapIdx(x, y);
    const real = a.state().order;
    let same = true;
    for (let i = 0; i < sim.length; i++) if (sim[i] !== real[i]) { same = false; break; }
    return { simSolved: sim.every((v, i) => v === i), realSolved: real.every((v, i) => v === i), simEqReal: same, sim: sim.slice(0, 8), real: real.slice(0, 8), moves: a.state().moves };
  });
  return g;
}
