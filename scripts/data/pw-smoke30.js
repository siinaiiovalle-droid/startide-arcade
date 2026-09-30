async page => {
  const base = 'https://siinaiiovalle-droid.github.io/startide-arcade';
  const out = { ids: {}, errors: [] };
  page.on('pageerror', e => out.errors.push('pageerror: ' + e.message.slice(0, 120)));
  page.on('console', m => { if (m.type() === 'error') out.errors.push('console: ' + m.text().slice(0, 120)); });

  /* 列表页卡片数 */
  await page.goto(base + '/games.html', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  out.cards = await page.evaluate(() => document.querySelectorAll('.acard').length);
  out.listHasNew = await page.evaluate(() => {
    const txt = document.body.innerText;
    return ['俄罗斯方块 2', '迷宫逃脱', '弹幕躲避'].filter(t => txt.indexOf(t) >= 0);
  });

  for (const id of ['tetris2', 'maze', 'bullet']) {
    await page.goto(base + '/play.html?g=' + id, { waitUntil: 'load' });
    await page.waitForSelector('#stage canvas', { timeout: 20000 });
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const c = document.querySelector('#stage canvas');
      if (!c || !c.__auto) return { hook: false };
      const s = c.__auto.state();
      return { hook: true, keys: Object.keys(s).slice(0, 6), sample: JSON.stringify(s).slice(0, 120) };
    });
    out.ids[id] = r;
    /* 交互一次，确认线上也能跑起来（不依赖本地钩子） */
    if (r.hook) {
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(300);
      const after = await page.evaluate(() => JSON.stringify(document.querySelector('#stage canvas').__auto.state()).slice(0, 120));
      out.ids[id].moved = after !== r.sample;
    }
  }
  return JSON.stringify(out);
}
