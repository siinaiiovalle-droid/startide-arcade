async page => {
  const base = 'https://siinaiiovalle-droid.github.io/startide-arcade';
  const out = { http: {}, pages: {} };
  for (const f of ['assets/js/games/catalog.js', 'assets/js/games/breakout2.js', 'assets/js/games/mario2.js', 'assets/js/games/shooter2.js']) {
    try {
      const r = await page.request.get(base + '/' + f + '?cb=' + Date.now());
      out.http[f] = r.status();
    } catch (e) { out.http[f] = 'ERR ' + e.message.slice(0, 80); }
  }
  for (const id of ['breakout2', 'mario2', 'shooter2']) {
    const errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 120)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
    await page.goto(base + '/play.html?g=' + id + '&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForSelector('#stage canvas', { timeout: 15000 });
    await page.waitForTimeout(2500);
    out.pages[id] = {
      auto: await page.evaluate(() => !!(document.querySelector('#stage canvas') && document.querySelector('#stage canvas').__auto)),
      errs: errs.slice(0, 4)
    };
  }
  return JSON.stringify(out);
}
