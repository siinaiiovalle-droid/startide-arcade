async page => {
  /* 交互验证：暂停冻结 / 触屏点击（rect 换算）/ 虚拟手柄 A 边沿 */
  const B = 'http://localhost:8820';
  const g = {};
  const open = async (id) => {
    await page.goto(B + '/play.html?g=' + id + '&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForSelector('#stage canvas', { timeout: 9000 });
    await page.waitForTimeout(500);
  };
  const frame = () => page.evaluate(() => document.querySelector('#stage canvas').toDataURL());

  /* 守塔：暂停冻结 + 触屏建塔 + 手柄方向选格/A 建塔 */
  await open('towerdef');
  await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.addGold(200);
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
  await page.waitForTimeout(400);
  const f1 = await frame();
  await page.waitForTimeout(1100);
  const f2 = await frame();
  g.tdPauseFrozen = f1 === f2;
  await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
  await page.waitForTimeout(200);
  /* 触屏点击空地 (col1,row1) → 逻辑(130,270) → CSS 换算 */
  g.tdRect = await page.evaluate(() => {
    const c = document.querySelector('#stage canvas');
    const r = c.getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  const cx = 130 * (g.tdRect.w / 560), cy = 270 * (g.tdRect.h / 700);
  await page.locator('#stage canvas').first().click({ position: { x: Math.round(cx), y: Math.round(cy) } });
  await page.waitForTimeout(200);
  g.tdTouchBuild = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state().towers;
  });
  /* 手柄：方向键选格 + A 建塔 */
  await page.evaluate(() => {
    const st = document.querySelector('.gk-stage');
    if (st) st.classList.add('show-pad');
  });
  await page.waitForTimeout(120);
  g.tdPadInfo = await page.evaluate(() => document.querySelectorAll('.gk-pad__btn').length);
  await page.locator('.gk-pad__btn[data-k="right"]').first().dispatchEvent('mousedown');
  await page.waitForTimeout(100);
  await page.locator('.gk-pad__btn[data-k="right"]').first().dispatchEvent('mouseup');
  await page.waitForTimeout(150);
  await page.locator('.gk-pad__btn[data-k="down"]').first().dispatchEvent('mousedown');
  await page.waitForTimeout(100);
  await page.locator('.gk-pad__btn[data-k="down"]').first().dispatchEvent('mouseup');
  await page.waitForTimeout(150);
  await page.locator('.gk-pad__btn[data-k="a"]').first().dispatchEvent('mousedown');
  await page.waitForTimeout(100);
  await page.locator('.gk-pad__btn[data-k="a"]').first().dispatchEvent('mouseup');
  await page.waitForTimeout(200);
  g.tdPadBuild = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state().towers;
  });

  /* 射箭：触屏按住蓄力 → 松开发射；暂停冻结 */
  await open('archery');
  await page.waitForTimeout(400);
  await page.mouse.move(250, 400);
  await page.mouse.down();
  await page.waitForTimeout(500);
  g.archCharging = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state().charging;
  });
  await page.mouse.up();
  await page.waitForTimeout(200);
  g.archFired = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const s = a.state();
    return { charging: s.charging, arrows: s.arrows };
  });
  await page.waitForTimeout(1600);
  await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
  await page.waitForTimeout(400);
  const f3 = await frame();
  await page.waitForTimeout(1100);
  const f4 = await frame();
  g.archPauseFrozen = f3 === f4;
  await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });

  /* 进阶鸟：触屏点按扑翼 */
  await open('flappy2');
  await page.locator('#stage canvas').first().click({ position: { x: 250, y: 350 } });
  await page.waitForTimeout(150);
  g.f2TouchStart = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state().started;
  });

  return g;
}
