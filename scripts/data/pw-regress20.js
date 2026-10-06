async page => {
  const out = { errs: {}, regress: {} };
  const base = 'http://localhost:8820';
  const ids = ['shooter', 'mario', 'breakout', 'snake', 'tetris', 'g2048', 'memory', 'ttt', 'pinball', 'gomoku', 'flappy', 'whack', 'bubble', 'gem', 'jump', 'tank', 'dino', 'fruit', 'link', 'sudoku', 'klotski', 'pool', 'fishing', 'suika', 'minesweeper', 'sokoban', 'freecell', 'balloon', 'bowling', 'duck', 'racer', 'helicopter', 'stack', 'archery', 'towerdef', 'flappy2', 'puzzle', 'spotdiff', 'reflex', 'rich', 'slot', 'guessnum', 'pong', 'sumo', 'fifteen', 'breakout2', 'mario2', 'shooter2', 'tetris2', 'maze', 'bullet', 'pipe', 'nonogram', 'rhythm'];

  /* 全量加载冒烟：每款收集 pageerror/console.error */
  for (const id of ids) {
    const errs = [];
    const onErr = e => errs.push('PE ' + e.message.slice(0, 100));
    const onCon = m => { if (m.type() === 'error') errs.push('CE ' + m.text().slice(0, 100)); };
    page.on('pageerror', onErr); page.on('console', onCon);
    await page.goto(base + '/play.html?g=' + id + '&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1300);
    out.errs[id] = errs.length ? errs.slice(0, 3) : 'ok';
    page.off('pageerror', onErr); page.off('console', onCon);
  }

  /* 六款旧游按键响应：按住方向键 700ms 后画面必须变化（坑 6：瞬发按键会整帧漏采） */
  const frame = () => page.evaluate(() => document.querySelector('#stage canvas').toDataURL());
  const keyCheck = async (id, key) => {
    await page.goto(base + '/play.html?g=' + id + '&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1400);
    await page.keyboard.down(key);
    await page.waitForTimeout(700);
    await page.keyboard.up(key);
    await page.waitForTimeout(150);
    const s2 = await frame();
    await page.waitForTimeout(250);
    const s3 = await frame();
    return s2 !== s3 ? 'moves' : 'frozen';
  };
  out.regress.mario = await keyCheck('mario', 'ArrowRight');
  out.regress.shooter = await keyCheck('shooter', 'ArrowLeft');
  out.regress.snake = await keyCheck('snake', 'ArrowUp');
  out.regress.tetris = await keyCheck('tetris', 'ArrowLeft');
  /* breakout 有待机态（球吸在挡板），先 Space 发射再判帧差 */
  await page.goto(base + '/play.html?g=breakout&cb=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  await page.keyboard.down('Space'); await page.waitForTimeout(200); await page.keyboard.up('Space');
  await page.waitForTimeout(500);
  const b1 = await frame(); await page.waitForTimeout(300); const b2 = await frame();
  out.regress.breakout = b1 !== b2 ? 'moves' : 'frozen';
  /* g2048 离散滑动：按键前后帧对比 */
  await page.goto(base + '/play.html?g=g2048&cb=' + Date.now(), { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  const g1 = await frame();
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(120); await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(500);
  const g2 = await frame();
  out.regress.g2048 = g1 !== g2 ? 'moves' : 'frozen';

  return JSON.stringify(out, null, 1);
}
