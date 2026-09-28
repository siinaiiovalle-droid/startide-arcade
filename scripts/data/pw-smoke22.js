async page => {
  /* 线上冒烟 09-22：三款新游 JS 200 + 实页实例化 0 报错 + 大厅 30 张卡 */
  const base = 'https://siinaiiovalle-droid.github.io/startide-arcade';
  const out = {};
  const errs = [];
  const onErr = e => errs.push('PE ' + e.message.slice(0, 100));
  const onCon = m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 100)); };
  page.on('pageerror', onErr); page.on('console', onCon);

  const cat = await page.request.get(base + '/assets/js/games/catalog.js', { timeout: 25000 });
  const t = await cat.text();
  out.catalog = { status: cat.status(), balloon: t.indexOf("'balloon'") >= 0, bowling: t.indexOf("'bowling'") >= 0, duck: t.indexOf("'duck'") >= 0 };

  async function gotoRetry(url) {
    for (let i = 0; i < 5; i++) {
      try { await page.goto(url, { waitUntil: 'load', timeout: 30000 }); return true; }
      catch (e) { await page.waitForTimeout(8000); }
    }
    return false;
  }

  for (const id of ['balloon', 'bowling', 'duck']) {
    const js = await page.request.get(base + '/assets/js/games/' + id + '.js', { timeout: 25000 });
    await gotoRetry(base + '/play.html?g=' + id);
    await page.waitForTimeout(2500);
    out[id] = { js: js.status(), auto: await page.evaluate(() => {
      const c = document.querySelector('#stage canvas');
      return !!(c && c.__auto);
    }) };
  }
  await gotoRetry(base + '/games.html');
  await page.waitForTimeout(2000);
  out.acards = await page.evaluate(() => document.querySelectorAll('.acard').length);
  out.errs = errs.length ? errs.slice(0, 4) : 'ok';
  return JSON.stringify(out);
}
