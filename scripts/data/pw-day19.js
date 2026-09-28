async page => {
  const out = { errs: [], games: {} };
  page.on('console', m => { if (m.type() === 'error') out.errs.push('CONSOLE ' + m.text().slice(0, 120)); });
  page.on('pageerror', e => out.errs.push('PAGEERROR ' + e.message.slice(0, 120)));
  const base = 'http://localhost:8820';
  const hud = () => page.locator('#hud').innerText().then(t => t.replace(/\s+/g, ' ').slice(0, 70));
  const scoreFromHud = async () => { const m = (await hud()).match(/得分 (\d+)/); return m ? +m[1] : -1; };
  const modalVisible = () => page.evaluate(() => {
    const m = document.querySelector('.modal');
    if (!m) return false;
    const cs = getComputedStyle(m);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.5;
  });
  const clickLogical = async (lx, ly) => {
    const b = await page.locator('#stage canvas').boundingBox();
    const scale = b.width / 560;
    await page.locator('#stage canvas').click({ position: { x: lx * scale, y: ly * scale } });
  };
  const bestKey = (id) => page.evaluate((k) => localStorage.getItem(k), 'gk_' + id + '_best');
  const closeThenRestart = async () => {
    await page.evaluate(() => {
      const m = document.querySelector('.modal');
      const btn = m && m.querySelector('.modal__foot .btn--primary');
      if (btn) btn.click();
    });
    await page.waitForTimeout(600);
    await page.evaluate(() => { const b = document.querySelector('#btnRestart'); if (b) b.click(); });
    await page.waitForTimeout(700);
  };

  /* ---------------- 连连看 ---------------- */
  {
    await page.goto(base + '/play.html?g=link&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1400);
    const g = {};
    g.hud0 = await hud();
    let matched = false;
    for (let k = 0; k < 12 && !matched; k++) {
      const pair = await page.evaluate(() => {
        const a = document.querySelector('#stage canvas').__auto;
        return a ? a.pair() : null;
      });
      if (!pair) break;
      const c1 = await page.evaluate(([r, c]) => document.querySelector('#stage canvas').__auto.center(r, c), [pair.r1, pair.c1]);
      const c2 = await page.evaluate(([r, c]) => document.querySelector('#stage canvas').__auto.center(r, c), [pair.r2, pair.c2]);
      await clickLogical(c1.x, c1.y);
      await page.waitForTimeout(220);
      await clickLogical(c2.x, c2.y);
      await page.waitForTimeout(500);
      if ((await scoreFromHud()) > 0) matched = true;
    }
    g.matched = matched;
    g.hudAfter = await hud();
    // 暂停冻结
    await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
    await page.waitForTimeout(300);
    const s1 = await page.locator('#stage canvas').screenshot();
    await page.waitForTimeout(800);
    const s2 = await page.locator('#stage canvas').screenshot();
    g.pauseFrozen = s1.toString('base64') === s2.toString('base64');
    await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
    await page.waitForTimeout(300);
    // 超时结算路径
    await page.evaluate(() => document.querySelector('#stage canvas').__auto.hurry());
    await page.waitForTimeout(2000);
    g.timeoutModal = await modalVisible();
    g.bestBefore = await bestKey('link');
    out.games.link = g;
  }

  /* ---------------- 数独 ---------------- */
  {
    await page.goto(base + '/play.html?g=sudoku&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1400);
    const g = {};
    g.hud0 = await hud();
    const sol = await page.evaluate(() => document.querySelector('#stage canvas').__auto.solution());
    const fixedMask = await page.evaluate(() => document.querySelector('#stage canvas').__auto.fixed());
    // 真实键盘输入：光标默认在第一个空格，输入该格正确数字
    let firstEmpty = fixedMask.findIndex(f => !f);
    await page.keyboard.press('Digit' + sol[firstEmpty]);
    await page.waitForTimeout(250);
    g.scoreAfterKey = await scoreFromHud();
    // 故意填错一个非固定格，验证错误计数
    const wrongDigit = sol[firstEmpty] === 9 ? 1 : 9;
    await page.evaluate(([i, d]) => document.querySelector('#stage canvas').__auto.set(i, d), [firstEmpty, wrongDigit]);
    await page.waitForTimeout(300);
    g.hudWrong = await hud();
    // 纠正为正确答案
    await page.evaluate(([i, d]) => document.querySelector('#stage canvas').__auto.set(i, d), [firstEmpty, sol[firstEmpty]]);
    await page.waitForTimeout(200);
    // 填完整盘 → win 结算（先擦再填，避免「同数=擦除」误伤）
    await page.evaluate((solution) => {
      const a = document.querySelector('#stage canvas').__auto;
      for (let i = 0; i < 81; i++) { a.set(i, 0); a.set(i, solution[i]); }
    }, sol);
    await page.waitForTimeout(900);
    g.winModal = await modalVisible();
    g.hudWin = await hud();
    g.bestAfter = await bestKey('sudoku');
    await closeThenRestart();
    g.hudRestart = await hud();
    out.games.sudoku = g;
  }

  /* ---------------- 华容道 ---------------- */
  {
    await page.goto(base + '/play.html?g=klotski&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1400);
    const g = {};
    g.hud0 = await hud();
    // 先真实点击验证交互通路：选中曹操再点下方空位 → 下滑一步（L1 直接过关进 L2）
    await clickLogical(280, 420);
    await page.waitForTimeout(250);
    await clickLogical(280, 570);
    await page.waitForTimeout(300);
    g.caoPosAfterL1 = await page.evaluate(() => {
      const p = document.querySelector('#stage canvas').__auto.pieces().find(x => x.id === 'cao');
      return { x: p.x, y: p.y };
    });
    await page.waitForTimeout(1700); // 等待过场进入第 2 关

    // 用 BFS 求解器逐关通关（按形状归一的规范空间求解，重放时维护形状→棋子id映射，
    // 全部走 __auto.select/__auto.slide 真实滑动路径）
    const solveLevel = async () => {
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      // 规范状态：形状名占格（cao/v/h/s），同形棋子不可区分
      const normKey = ps => {
        const g = Array.from({ length: 20 }, () => '.');
        for (const p of ps) for (let dy = 0; dy < p.h; dy++) for (let dx = 0; dx < p.w; dx++) g[(p.y + dy) * 4 + (p.x + dx)] = p.id[0] === 'c' ? 'C' : p.w > p.h ? 'h' : (p.w === 1 && p.h === 2 ? 'v' : p.w === 1 && p.h === 1 ? 's' : 'h');
        return g.join('');
      };
      const done = ps => { const c = ps.find(p => p.id[0] === 'c'); return c.x === 1 && c.y === 3; };
      let start = await page.evaluate(() => document.querySelector('#stage canvas').__auto.pieces());
      // 棋子 id 形状归一：cao 开头视为 C，其余按 w/h 分类（用临时 name 字段做规范 key）
      const canon = ps => ps.map(p => ({ ...p, id: p.id === 'cao' ? 'cao' : (p.w > p.h ? 'H' + p.id : (p.w === 1 && p.h === 2 ? 'V' + p.id : 'S' + p.id)) }));
      // 规范 BFS 用同形等价 key：所有 V* 视作一类 —— 用占格字符做 key
      const keyOf = ps => {
        const g = Array.from({ length: 20 }, () => '.');
        for (const p of ps) {
          const ch = p.id === 'cao' ? 'C' : (p.id[0] === 'V' ? 'v' : p.id[0] === 'H' ? 'h' : 's');
          for (let dy = 0; dy < p.h; dy++) for (let dx = 0; dx < p.w; dx++) g[(p.y + dy) * 4 + (p.x + dx)] = ch;
        }
        return g.join('');
      };
      const cs = canon(start);
      if (done(cs)) return [];
      const seen = new Set([keyOf(cs)]);
      const queue = [{ ps: cs, path: [] }];
      let head = 0;
      while (head < queue.length) {
        const { ps, path } = queue[head++];
        if (done(ps)) return path;
        for (let i = 0; i < ps.length; i++) {
          for (const [dx, dy] of dirs) {
            const p = ps[i]; const nx = p.x + dx, ny = p.y + dy;
            if (nx < 0 || ny < 0 || nx + p.w > 4 || ny + p.h > 5) continue;
            let ok = true;
            for (let yy = 0; yy < p.h && ok; yy++) for (let xx = 0; xx < p.w && ok; xx++) {
              for (let j = 0; j < ps.length; j++) {
                if (j === i) continue;
                const q = ps[j];
                if (nx + xx >= q.x && nx + xx < q.x + q.w && ny + yy >= q.y && ny + yy < q.y + q.h) { ok = false; break; }
              }
            }
            if (!ok) continue;
            const nps = ps.map((q, j) => j === i ? { ...q, x: nx, y: ny } : q);
            const k = keyOf(nps);
            if (seen.has(k)) continue;
            seen.add(k);
            queue.push({ ps: nps, path: [...path, { id: p.id, dx, dy }] });
          }
        }
      }
      return null;
    };
    g.solvedLevels = 0;
    for (let lv = 2; lv <= 3; lv++) {
      const path = await solveLevel();
      if (!path) break;
      await page.evaluate((moves) => {
        const a = document.querySelector('#stage canvas').__auto;
        const sh = p => (p.id === 'cao') ? 'cao' : (p.w > p.h ? 'h' : (p.h > p.w ? 'v' : 's'));
        let n = 0;
        for (const mv of moves) {
          const gid = mv.id === 'cao' ? 'cao' : mv.id.slice(1);
          let ok = a.select(gid) && a.slide(mv.dx, mv.dy);
          if (!ok) {
            const all = a.pieces();
            const me = all.find(p => p.id === gid);
            if (me) {
              for (const p of all) {
                if (p.id === gid || sh(p) !== sh(me)) continue;
                if (a.select(p.id) && a.slide(mv.dx, mv.dy)) { ok = true; break; }
              }
            }
          }
          if (ok) n++;
        }
        return n;
      }, path).then(n => console.error('klotski replay ' + lv + ': ' + n + '/' + path.length));
      g.solvedLevels++;
      await page.waitForTimeout(1700); // 过场
      if (await modalVisible()) break;
    }
    g.winModal = await modalVisible();
    g.hudWin = await hud();
    g.bestAfter = await bestKey('klotski');
    await closeThenRestart();
    g.hudRestart = await hud();
    out.games.klotski = g;
  }

  return JSON.stringify(out, null, 1);
}
