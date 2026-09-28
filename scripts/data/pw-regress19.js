async page => {
  const out = { errors: [], games: {}, hall: null };
  page.on('console', m => { if (m.type() === 'error') out.errors.push(m.text().slice(0, 110)); });
  page.on('pageerror', e => out.errors.push('PAGEERROR ' + e.message.slice(0, 110)));
  const base = 'http://localhost:8820';

  const ids = ['shooter', 'mario', 'breakout', 'snake', 'tetris', 'g2048', 'memory', 'ttt', 'pinball', 'gomoku', 'flappy', 'whack', 'bubble', 'gem', 'jump', 'tank', 'dino', 'fruit', 'link', 'sudoku', 'klotski'];
  for (const id of ids) {
    await page.goto(base + '/play.html?g=' + id + '&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    out.games[id] = {
      canvases: await page.locator('#stage canvas').count(),
      hud: (await page.locator('#hud').innerText()).replace(/\s+/g, ' ').slice(0, 40)
    };
  }

  // 旧游按键响应复测（按住键，规避瞬发漏采）
  const holdTest = async (id, keys) => {
    await page.goto(base + '/play.html?g=' + id + '&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1300);
    const s0 = (await page.locator('#stage canvas').screenshot()).toString('base64');
    for (const k of keys) {
      await page.keyboard.down(k);
      await page.waitForTimeout(650);
      await page.keyboard.up(k);
      await page.waitForTimeout(200);
    }
    const s1 = (await page.locator('#stage canvas').screenshot()).toString('base64');
    return s0 !== s1;
  };
  out.hold = {
    snake: await holdTest('snake', ['ArrowUp', 'ArrowLeft']),
    g2048: await holdTest('g2048', ['ArrowLeft', 'ArrowUp']),
    breakout: await holdTest('breakout', ['Space', 'ArrowLeft'])
  };
  // ttt 点击响应
  await page.goto(base + '/play.html?g=ttt&cb=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(1300);
  const t0 = (await page.locator('#stage canvas').screenshot()).toString('base64');
  const tb = await page.locator('#stage canvas').boundingBox();
  await page.locator('#stage canvas').click({ position: { x: tb.width / 2, y: tb.height / 2 } });
  await page.waitForTimeout(600);
  out.hold.ttt = t0 !== (await page.locator('#stage canvas').screenshot()).toString('base64');

  // 大厅
  await page.goto(base + '/games.html?cb=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  out.hall = await page.evaluate(() => ({
    total: document.querySelectorAll('#hall .acard').length,
    first9: [...document.querySelectorAll('#hall .acard__name')].slice(0, 9).map(n => n.textContent.trim())
  }));
  await page.goto(base + '/index.html?cb=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(900);
  out.home = await page.evaluate(() => document.querySelectorAll('#featured .acard').length);
  out.errorCount = out.errors.length;
  return JSON.stringify(out, null, 1);
}
