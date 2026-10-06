async page => {
  const base = 'https://siinaiiovalle-droid.github.io/startide-arcade';
  const out = { ids: {}, errors: [] };
  page.on('pageerror', e => out.errors.push('pageerror: ' + String(e && e.message || e).slice(0, 120)));
  page.on('console', m => { if (m.type() === 'error') out.errors.push('console: ' + m.text().slice(0, 120)); });

  await page.goto(base + '/games.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  out.cards = await page.evaluate(() => document.querySelectorAll('.acard').length);
  out.listHasNew = await page.evaluate(() => {
    const txt = document.body.innerText;
    return ['水管连接', '数织', '节奏点击'].filter(t => txt.indexOf(t) >= 0);
  });

  for (const id of ['pipe', 'nonogram', 'rhythm']) {
    await page.goto(base + '/play.html?g=' + id, { waitUntil: 'load' });
    await page.waitForSelector('#stage canvas', { timeout: 20000 });
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const c = document.querySelector('#stage canvas');
      if (!c || !c.__auto) return { hook: false };
      const s = c.__auto.state();
      return { hook: true, sample: JSON.stringify(s).slice(0, 110) };
    });
    out.ids[id] = r;
    if (r.hook) {
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(260);
      await page.keyboard.up('ArrowRight');
      await page.waitForTimeout(250);
      const after = await page.evaluate(() => JSON.stringify(document.querySelector('#stage canvas').__auto.state()).slice(0, 110));
      out.ids[id].moved = after !== r.sample;
    }
  }
  return JSON.stringify(out);
}
