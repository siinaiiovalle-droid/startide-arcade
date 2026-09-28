async page => {
  const out = { errs: [] };
  page.on('console', m => { if (m.type() === 'error') out.errs.push('CONSOLE ' + m.text().slice(0, 120)); });
  page.on('pageerror', e => out.errs.push('PAGEERROR ' + e.message.slice(0, 120)));
  const base = 'http://localhost:8820';
  const hud = () => page.locator('#hud').innerText().then(t => t.replace(/\s+/g, ' ').slice(0, 70));
  const clickLogical = async (lx, ly) => {
    const b = await page.locator('#stage canvas').boundingBox();
    const scale = b.width / 560;
    await page.locator('#stage canvas').click({ position: { x: lx * scale, y: ly * scale } });
  };
  await page.goto(base + '/play.html?g=klotski&cb=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  out.hud0 = await hud();
  await clickLogical(280, 420);
  await page.waitForTimeout(250);
  out.pieces0 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.pieces());
  await clickLogical(280, 570);
  await page.waitForTimeout(300);
  out.hud1 = await hud();
  out.pieces1 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.pieces());
  await page.waitForTimeout(1800);
  out.hud2 = await hud();
  // 用 auto 试滑一步：选中 v1 下移
  out.slideTest = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const ok = a.select('v1');
    const moved = ok ? a.slide(0, 1) : false;
    return { ok: ok, moved: moved };
  });
  await page.waitForTimeout(300);
  out.hud3 = await hud();
  return JSON.stringify(out, null, 1);
}
