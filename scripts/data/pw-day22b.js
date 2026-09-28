async page => {
  /* 交互验证 2：暂停冻结（暂停后比对）/ 触屏点击（rect 换算）/ 虚拟手柄 A 键 */
  const B = 'http://localhost:8820';
  const g = {};
  const open = async (id) => {
    await page.goto(B + '/play.html?g=' + id + '&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForSelector('#stage canvas', { timeout: 9000 });
    await page.waitForTimeout(500);
  };
  const frame = () => page.evaluate(() => document.querySelector('#stage canvas').toDataURL());

  /* ---- 气球射击 ---- */
  await open('balloon');
  /* 暂停冻结：暂停后 1.2s 帧完全一致 */
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
  await page.waitForTimeout(400);
  const f1 = await frame();
  await page.waitForTimeout(1200);
  const f2 = await frame();
  g.pauseFrozen = f1 === f2;
  await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
  await page.waitForTimeout(300);

  /* 触屏点击：rect 换算 CSS 坐标后 locator.click */
  const info = await page.evaluate(() => {
    const c = document.querySelector('#stage canvas');
    const r = c.getBoundingClientRect();
    const a = c.__auto;
    a.spawn();
    return { rw: r.width, rh: r.height, W: 560, H: 700 };
  });
  g.canvasRect = info;
  await page.waitForTimeout(1500);
  const target = await page.evaluate(() => {
    const c = document.querySelector('#stage canvas');
    const r = c.getBoundingClientRect();
    const a = c.__auto;
    const b = a.list().find((x) => x.y > 140 && x.y < 600 && x.x > 40 && x.x < 520);
    if (!b) return null;
    return { cssX: b.x * (r.width / 560), cssY: b.y * (r.height / 700), lx: b.x, ly: b.y };
  });
  g.touchTarget = target;
  if (target) {
    await page.locator('#stage canvas').first().click({ position: { x: target.cssX, y: target.cssY } });
    await page.waitForTimeout(150);
    g.touchAfter = await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      return a.state();
    });
  }

  /* 虚拟手柄 A 键（show-pad 后可见，mousedown 绑定） */
  await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.spawn();
    const st = document.querySelector('.gk-stage');
    if (st) st.classList.add('show-pad');
  });
  await page.waitForTimeout(1500);
  g.padInfo = await page.evaluate(() => {
    const btns = document.querySelectorAll('.gk-pad__btn');
    return { count: btns.length, ks: Array.from(btns).map((b) => b.getAttribute('data-k')) };
  });
  await page.evaluate(() => {
    const c = document.querySelector('#stage canvas');
    const a = c.__auto;
    const b = a.list().find((x) => x.y > 140 && x.y < 620);
    if (b) a.setCross(b.x, b.y);
  });
  await page.locator('.gk-pad__btn--a').first().dispatchEvent('mousedown');
  await page.waitForTimeout(80);
  await page.locator('.gk-pad__btn--a').first().dispatchEvent('mouseup');
  await page.waitForTimeout(150);
  g.padAFire = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });

  return g;
}
