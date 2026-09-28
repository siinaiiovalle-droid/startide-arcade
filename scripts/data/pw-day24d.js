async page => {
  /* 手柄 A 建塔复测：选格避开路径 */
  const B = 'http://localhost:8820';
  const g = {};
  await page.goto(B + '/play.html?g=towerdef&cb=' + Date.now(), { waitUntil: 'load' });
  await page.waitForSelector('#stage canvas', { timeout: 9000 });
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    a.addGold(200);
    const st = document.querySelector('.gk-stage');
    if (st) st.classList.add('show-pad');
  });
  await page.waitForTimeout(150);
  /* sel 初始 null → 第一次 right 设为 (0,0)? moveSel: !sel → (0,0) 再 +1 → (1,0)。row0 是路径！ */
  /* 改：先 right(→(1,0) 路径格但只是选中不建造)，再 down 两次 → (1,2)? (1,2) 也是路径。 down 一次 → (1,1) 空地 */
  await page.locator('.gk-pad__btn[data-k="right"]').first().dispatchEvent('mousedown');
  await page.waitForTimeout(100);
  await page.locator('.gk-pad__btn[data-k="right"]').first().dispatchEvent('mouseup');
  await page.waitForTimeout(150);
  await page.locator('.gk-pad__btn[data-k="down"]').first().dispatchEvent('mousedown');
  await page.waitForTimeout(100);
  await page.locator('.gk-pad__btn[data-k="down"]').first().dispatchEvent('mouseup');
  await page.waitForTimeout(150);
  await page.locator('.gk-pad__btn[data-k="a"]').first().dispatchEvent('mousedown');
  await page.waitForTimeout(120);
  await page.locator('.gk-pad__btn[data-k="a"]').first().dispatchEvent('mouseup');
  await page.waitForTimeout(250);
  g.after = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    return a.state();
  });
  return g;
}
