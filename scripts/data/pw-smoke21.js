async page => {
  const base = 'https://siinaiiovalle-droid.github.io/startide-arcade';
  const out = {};
  const cat = await page.request.get(base + '/assets/js/games/catalog.js', { timeout: 25000 });
  const t = await cat.text();
  out.catalog = { status: cat.status(), minesweeper: t.indexOf("'minesweeper'") >= 0, sokoban: t.indexOf("'sokoban'") >= 0, freecell: t.indexOf("'freecell'") >= 0 };
  /* 实际打开扫雷页，收集报错并确认游戏实例化 */
  const errs = [];
  const onErr = e => errs.push('PE ' + e.message.slice(0, 100));
  const onCon = m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 100)); };
  page.on('pageerror', onErr); page.on('console', onCon);
  await page.goto(base + '/play.html?g=minesweeper', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2500);
  out.minesweeper = await page.evaluate(() => {
    const c = document.querySelector('#stage canvas');
    return { auto: !!(c && c.__auto), state: c && c.__auto ? c.__auto.state() : null };
  });
  out.errs = errs.length ? errs.slice(0, 3) : 'ok';
  return JSON.stringify(out);
}
