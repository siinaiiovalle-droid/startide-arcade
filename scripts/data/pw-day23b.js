async page => {
  /* 交互验证：暂停冻结 / 触屏点击 / 虚拟手柄（坑 19-21 口径） */
  const B = 'http://localhost:8820';
  const g = {};
  const open = async (id) => {
    await page.goto(B + '/play.html?g=' + id + '&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForSelector('#stage canvas', { timeout: 9000 });
    await page.waitForTimeout(500);
  };
  const frame = () => page.evaluate(() => document.querySelector('#stage canvas').toDataURL());

  /* 栈塔：暂停冻结 + 触屏点击落块 */
  await open('stack');
  await page.waitForTimeout(800);
  await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
  await page.waitForTimeout(400);
  const f1 = await frame();
  await page.waitForTimeout(1200);
  const f2 = await frame();
  g.stackPauseFrozen = f1 === f2;
  await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
  await page.waitForTimeout(300);
  g.stackBefore = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state().floors;
  });
  await page.locator('#stage canvas').first().click({ position: { x: 250, y: 300 } });
  await page.waitForTimeout(400);
  g.stackTouch = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state().floors;
  });

  /* 赛车：触屏左右半屏切道 + 虚拟手柄左键 */
  await open('racer');
  await page.waitForTimeout(600);
  g.racerLane0 = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.setLane(1);
    return a.state().lane;
  });
  /* 点击右半屏 → 切右道 */
  await page.locator('#stage canvas').first().click({ position: { x: 400, y: 500 } });
  await page.waitForTimeout(200);
  g.racerTouchRight = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state().lane;
  });
  /* 虚拟手柄 left */
  await page.evaluate(() => {
    const st = document.querySelector('.gk-stage');
    if (st) st.classList.add('show-pad');
  });
  await page.waitForTimeout(150);
  g.padInfo = await page.evaluate(() => {
    const btns = document.querySelectorAll('.gk-pad__btn');
    return { count: btns.length, ks: Array.from(btns).map((b) => b.getAttribute('data-k')) };
  });
  await page.locator('.gk-pad__btn[data-k="left"]').first().dispatchEvent('mousedown');
  await page.waitForTimeout(120);
  await page.locator('.gk-pad__btn[data-k="left"]').first().dispatchEvent('mouseup');
  await page.waitForTimeout(150);
  g.racerPadLeft = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state().lane;
  });

  /* 直升机：触屏按住上升 */
  await open('helicopter');
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => {
    const c = document.querySelector('#stage canvas');
    const rect = c.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  });
  await page.locator('#stage canvas').first().click({ position: { x: r.w / 2, y: r.h / 2 } });
  await page.waitForTimeout(500);
  g.heliHold = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });

  return g;
}
