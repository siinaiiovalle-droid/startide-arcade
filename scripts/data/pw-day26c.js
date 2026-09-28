async page => {
  /* 2026-09-26 补测 v2：canvasClick 改 locator 自动滚动；rich 防双数循环；slot 自动降注破产 */
  const B = 'http://localhost:8820';
  const g = { errors: [] };
  page.on('pageerror', (e) => g.errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') g.errors.push('console: ' + m.text().slice(0, 150)); });

  async function open(id) {
    await page.goto(B + '/play.html?g=' + id + '&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForSelector('#stage canvas', { timeout: 9000 });
    await page.waitForTimeout(500);
  }
  async function modalUp() {
    return page.evaluate(() => {
      const m = document.querySelector('.modal');
      if (!m) return false;
      const cs = getComputedStyle(m);
      return cs.display !== 'none' && +cs.opacity > 0.5;
    });
  }
  async function waitModal(ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await modalUp()) return true; await page.waitForTimeout(250); }
    return false;
  }
  async function canvasClick(lx, ly) {
    const rect = await page.evaluate(() => {
      const r = document.querySelector('#stage canvas').getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    await page.locator('#stage canvas').click({
      position: { x: lx * rect.w / 560, y: ly * rect.h / 700 },
      timeout: 5000
    });
  }

  /* ============ rich：give 注资 + 买地 → 回合耗尽必胜 → best ============ */
  await open('rich');
  g.rich = {};
  await page.evaluate(() => document.querySelector('#stage canvas').__auto.give(2500));
  g.rich.game = await page.evaluate(() => new Promise((resolve) => {
    const a = document.querySelector('#stage canvas').__auto;
    const cells = a.cells();
    const t0 = Date.now();
    let lastDbl = false;
    function targetFor(me, foe, mode) {
      const props = a.props();
      let best = -1, bd = 99;
      for (let i = 0; i < 16; i++) {
        if (cells[i] !== 'prop') continue;
        const o = props[i];
        const want = mode === 'buy' ? o === null : (mode === 'hit' ? (o && o.o === 1 - me) : (o && o.o === me));
        if (!want) continue;
        const dx = (i - foe + 16) % 16;
        if (dx >= 3 && dx <= 12 && dx < bd) { bd = dx; best = i; }
      }
      if (best < 0) return null;
      const a1 = Math.max(1, Math.min(6, bd - 1));
      return [a1, bd - a1];
    }
    const iv = setInterval(() => {
      const st = a.state();
      if (st.over) { clearInterval(iv); resolve({ done: 'over', round: st.round, cash: st.cash }); return; }
      if (Date.now() - t0 > 150000) { clearInterval(iv); resolve({ done: 'timeout', st: st }); return; }
      if (st.phase === 'idle') {
        let d;
        if (lastDbl) { d = [6, 1]; lastDbl = false; }
        else if (st.cur === 0) d = targetFor(0, st.pos[0], 'buy') || targetFor(0, st.pos[0], 'safe') || [6, 1];
        else d = targetFor(1, st.pos[1], 'hit') || targetFor(1, st.pos[1], 'buy') || [5, 1];
        lastDbl = d[0] === d[1];
        a.forceDice(d[0], d[1]);
        a.roll();
      }
    }, 130);
  }));
  g.rich.modal = await waitModal(6000);
  g.rich.end = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  g.rich.best = await page.evaluate(() => localStorage.getItem('gk_rich_best'));

  /* ============ slot：自动降注 → 破产结算 ============ */
  await open('slot');
  g.slot = {};
  await page.evaluate(() => document.querySelector('#stage canvas').__auto.give(-950)); /* 1000 -> 50 */
  await page.evaluate(() => document.querySelector('#stage canvas').__auto.spin());     /* 自动降注 50 -> 0 */
  const s1 = await page.evaluate(() => new Promise((res) => {
    const a = document.querySelector('#stage canvas').__auto;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const st = a.state();
      if (st.over || Date.now() - t0 > 15000) { clearInterval(iv); res(st); }
    }, 120);
  }));
  g.slot.brokeState = s1;
  g.slot.brokeModal = await waitModal(4000);
  g.slot.extra = await page.evaluate(() => {
    const m = document.querySelector('.modal');
    return m ? m.textContent.slice(0, 50) : null;
  });

  /* ============ guessnum：触屏键盘（自动滚动）完整输入 ============ */
  await open('guessnum');
  g.gn = {};
  const secret = await page.evaluate(() => document.querySelector('#stage canvas').__auto.secret());
  const padMap = [[1, 2, 3], [4, 5, 6], [7, 8, 9], ['del', 0, 'ok']];
  const keyRC = {};
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) keyRC[padMap[r][c]] = [80 + c * 140 + 65, 436 + r * 72 + 31];
  for (const d of secret) {
    const rc = keyRC[d];
    await canvasClick(rc[0], rc[1]);
    await page.waitForTimeout(130);
  }
  g.gn.touchCur = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().cur);
  await canvasClick(keyRC['ok'][0], keyRC['ok'][1]);
  await page.waitForTimeout(500);
  g.gn.afterTouch = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  g.gn.touchModal = await waitModal(4000);
  g.gn.best = await page.evaluate(() => localStorage.getItem('gk_guessnum_best'));
  return g;
}
