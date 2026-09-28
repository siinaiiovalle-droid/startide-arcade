async page => {
  await page.goto('http://localhost:8820/play.html?g=sumo&cb=' + Date.now(), { waitUntil: 'load' });
  await page.waitForSelector('#stage canvas', { timeout: 9000 });
  await page.waitForTimeout(600);
  const out = {};
  /* playwright 真实键盘：ArrowRight 120ms 后 Space，逐帧观察 pad/dashT/stam */
  out.playwright = await (async () => {
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(120);
    const s1 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
    await page.keyboard.down('Space');
    await page.waitForTimeout(60);
    const s2 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
    await page.keyboard.up('Space');
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(200);
    const s3 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
    return { s1: { pad: s1.pad, stam: s1.stam }, s2: { pad: s2.pad, stam: s2.stam, dashT: s2.dashT }, s3: { stam: s3.stam, dashT: s3.dashT, x: s3.me.x } };
  })();
  /* 手柄 A：padTap 同款 dispatchEvent */
  out.padBtn = await (async () => {
    await page.evaluate(() => document.querySelector('#stage canvas').__auto.move(280, 430));
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      const st = document.querySelector('.gk-stage');
      if (st) st.classList.add('show-pad');
    });
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(120);
    const s0 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
    await page.locator('.gk-pad__btn[data-k="a"]').first().dispatchEvent('mousedown');
    await page.waitForTimeout(80);
    const s1 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
    await page.locator('.gk-pad__btn[data-k="a"]').first().dispatchEvent('mouseup');
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(200);
    const s2 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
    return { s0: { pad: s0.pad, stam: s0.stam }, s1: { pad: s1.pad, stam: s1.stam, dashT: s1.dashT }, s2: { stam: s2.stam } };
  })();
  return JSON.stringify(out);
}
