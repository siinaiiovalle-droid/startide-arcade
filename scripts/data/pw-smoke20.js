async page => {
  const out = {};
  const base = 'https://siinaiiovalle-droid.github.io/startide-arcade';
  /* 部署生效检查：新游戏脚本是否存在 */
  for (const id of ['pool', 'fishing', 'suika']) {
    const errs = [];
    const onErr = e => errs.push('PE ' + e.message.slice(0, 100));
    const onCon = m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 100)); };
    page.on('pageerror', onErr); page.on('console', onCon);
    const resp = await page.goto(base + '/play.html?g=' + id, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2200);
    const hasAuto = await page.evaluate(() => !!document.querySelector('#stage canvas') && !!document.querySelector('#stage canvas').__auto);
    const jsStatus = (await page.request.get(base + '/assets/js/games/' + id + '.js')).status();
    out[id] = { http: resp.status(), js: jsStatus, auto: hasAuto, errs: errs.length ? errs.slice(0, 3) : 'ok' };
    page.off('pageerror', onErr); page.off('console', onCon);
  }
  await page.goto(base + '/games.html', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(1500);
  out.cards = await page.evaluate(() => document.querySelectorAll('.acard').length);
  return JSON.stringify(out, null, 1);
}
