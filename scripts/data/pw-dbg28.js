async page => {
  const out = { };
  for (const id of ['breakout2', 'mario2', 'shooter2']) {
    const errs = [];
    page.on('pageerror', e => errs.push('PE ' + e.message.slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 200)); });
    await page.goto('http://localhost:8820/play.html?g=' + id + '&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(2000);
    out[id] = {
      canvas: await page.evaluate(() => !!document.querySelector('#stage canvas')),
      auto: await page.evaluate(() => !!(document.querySelector('#stage canvas') && document.querySelector('#stage canvas').__auto)),
      errs: errs.slice(0, 5)
    };
  }
  return JSON.stringify(out);
}
