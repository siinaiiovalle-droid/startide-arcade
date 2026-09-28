async page => {
  /* 修复复测：赛车手柄切道 + 直升机鼠标按住（真 hold） */
  const B = 'http://localhost:8820';
  const g = {};
  const open = async (id) => {
    await page.goto(B + '/play.html?g=' + id + '&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForSelector('#stage canvas', { timeout: 9000 });
    await page.waitForTimeout(500);
  };

  /* 赛车：虚拟手柄 left/right 边沿 */
  await open('racer');
  await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.setLane(1);
    const st = document.querySelector('.gk-stage');
    if (st) st.classList.add('show-pad');
  });
  await page.waitForTimeout(150);
  await page.locator('.gk-pad__btn[data-k="left"]').first().dispatchEvent('mousedown');
  await page.waitForTimeout(120);
  await page.locator('.gk-pad__btn[data-k="left"]').first().dispatchEvent('mouseup');
  await page.waitForTimeout(150);
  g.padLeft = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state().lane;
  });
  await page.locator('.gk-pad__btn[data-k="right"]').first().dispatchEvent('mousedown');
  await page.waitForTimeout(120);
  await page.locator('.gk-pad__btn[data-k="right"]').first().dispatchEvent('mouseup');
  await page.waitForTimeout(150);
  g.padRight = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state().lane;
  });

  /* 直升机：鼠标按住 700ms 再松开 */
  await open('helicopter');
  await page.waitForTimeout(400);
  await page.mouse.move(250, 350);
  await page.mouse.down();
  await page.waitForTimeout(700);
  g.heliRise = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const s = a.state();
    return { y: s.y, vy: s.vy, over: s.over };
  });
  await page.mouse.up();
  await page.waitForTimeout(500);
  g.heliFall = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const s = a.state();
    return { y: s.y, vy: s.vy, over: s.over };
  });

  return g;
}
