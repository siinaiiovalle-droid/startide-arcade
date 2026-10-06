async page => {
  const g = { pipe: {}, nonogram: {}, rhythm: {} };
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + String(e && e.message || e).slice(0, 140)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 140)); });

    const modalInfo = () => page.evaluate(() => {
    const m = document.querySelector('.modal');
    if (!m) return { up: false };
    const cs = getComputedStyle(m);
    const up = cs.display !== 'none' && +cs.opacity > 0.5;
    const txt = m.innerText || '';
    return { up, win: /成功|完成|通关|曲终|接通|胜利|win/i.test(txt), lose: /失败|出局|耗尽|用尽|重试|lose/i.test(txt) };
  });
  async function waitModal(ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const m = await modalInfo();
      if (m.up) return m;
      await page.waitForTimeout(150);
    }
    return { up: false };
  }
  async function closeModal() {
    await page.evaluate(() => {
      const b = document.querySelector('.modal__foot .btn--primary');
      if (b) b.click();
    });
    await page.waitForTimeout(600);
  }
  async function framesWhilePaused() {
    await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
    await page.waitForTimeout(350);
    const f1 = await page.evaluate(() => document.querySelector('#stage canvas').toDataURL());
    await page.waitForTimeout(350);
    const f2 = await page.evaluate(() => document.querySelector('#stage canvas').toDataURL());
    await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
    await page.waitForTimeout(250);
    return f1 === f2;
  }
  async function openGame(id) {
    await page.goto('http://localhost:8820/play.html?g=' + id, { waitUntil: 'load' });
    await page.waitForSelector('#stage canvas', { timeout: 15000 });
    await page.waitForTimeout(800);
    return await page.evaluate(() => { window.__H = () => document.querySelector('#stage canvas').__auto; return !!window.__H(); });
  }

  /* ============ pipe 水管连接 ============ */
  g.pipe.hook = await openGame('pipe');
  g.pipe.init = await page.evaluate(() => JSON.stringify(__H().state()));
  /* 键盘方向键移动光标（边沿输入须按住一帧以上，坑 6） */
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(260);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(200);
  g.pipe.keyCursor = await page.evaluate(() => __H().state().cursor.join(','));
  /* 手柄 A 旋转：键盘先把光标导航到首个可旋转格 */
  {
    const st0 = await page.evaluate(() => __H().state());
    const idx = st0.kinds.indexOf('1');
    if (idx < 0) {
      g.pipe.padA = 'no pipe cell';
    } else {
      const tr = Math.floor(idx / st0.n), tc = idx % st0.n;
      const hold = async (key, times) => {
        for (let i = 0; i < times; i++) {
          await page.keyboard.down(key);
          await page.waitForTimeout(240);
          await page.keyboard.up(key);
          await page.waitForTimeout(140);
        }
      };
      await hold('ArrowRight', tc);
      await hold('ArrowDown', tr);
      const mv0 = await page.evaluate(() => __H().state().moves);
      await page.evaluate(() => {
        const b = document.querySelector('.gk-pad__btn[data-k="a"]');
        b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        setTimeout(() => b.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })), 70);
      });
      await page.waitForTimeout(300);
      const cur = await page.evaluate(() => __H().state().cursor.join(','));
      const mv1 = await page.evaluate(() => __H().state().moves);
      g.pipe.padA = mv1 > mv0 ? 'pad-a ok @' + cur + ' moves ' + mv0 + '->' + mv1 : 'fail @' + cur + ' moves ' + mv0 + '->' + mv1;
    }
  }
  /* 画布点击旋转：逐格试探直到 moves 增长（证明 pointer 通路） */
  const preMoves = await page.evaluate(() => __H().state().moves);
  g.pipe.tapRotate = await page.evaluate((pm) => {
    const c = document.querySelector('#stage canvas');
    const rect = c.getBoundingClientRect();
    const a = __H();
    const n = a.state().n;
    for (let r = 0; r < n; r++) {
      for (let col = 0; col < n; col++) {
        const lx = 40 + (col + 0.5) * (480 / n), ly = 132 + (r + 0.5) * (480 / n);
        c.dispatchEvent(new PointerEvent('pointerdown', { clientX: rect.left + lx * rect.width / 560, clientY: rect.top + ly * rect.height / 700, bubbles: true }));
        if (a.state().moves > pm) return 'ok moves=' + a.state().moves + ' @' + r + ',' + col;
      }
    }
    return 'fail moves=' + a.state().moves;
  }, preMoves);
  /* 提示拧到接通 → win */
  await page.evaluate(() => {
    const a = __H();
    for (let i = 0; i < 60 && !a.state().connected; i++) a.hint();
  });
  await page.waitForTimeout(1400);
  g.pipe.win = await waitModal(4000);
  g.pipe.best = await page.evaluate(() => localStorage.getItem('gk_pipe_best'));
  /* 重开 → 限时 → lose */
  await closeModal();
  await page.evaluate(() => __H().setTime(2.5));
  g.pipe.lose = await waitModal(6000);
  /* 暂停冻结 */
  await closeModal();
  await page.waitForTimeout(400);
  g.pipe.pauseFreeze = await framesWhilePaused();

  /* ============ nonogram 数织 ============ */
  g.nonogram.hook = await openGame('nonogram');
  g.nonogram.init = await page.evaluate(() => JSON.stringify(__H().state()));
  /* 键盘 + 标记 */
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(260);
  await page.keyboard.up('ArrowDown');
  await page.waitForTimeout(200);
  g.nonogram.keyCursor = await page.evaluate(() => __H().state().cursor.join(','));
  g.nonogram.mark = await page.evaluate(() => {
    const a = __H();
    const ok = a.markAt(0, 0);
    return ok && a.state().marked >= 1 ? 'marks=' + a.state().marked : 'fail';
  });
  /* 全对填充 → win */
  g.nonogram.fillSteps = await page.evaluate(() => {
    const a = __H();
    let n = 0;
    while (a.fillCorrectOne() && n < 200) n++;
    return n;
  });
  await page.waitForTimeout(1400);
  g.nonogram.win = await waitModal(4000);
  g.nonogram.best = await page.evaluate(() => localStorage.getItem('gk_nonogram_best'));
  /* 三次失误 → lose */
  await closeModal();
  await page.evaluate(() => {
    const a = __H();
    let n = 0;
    while (a.makeMistake() && n < 5) n++;
    return n;
  });
  await page.waitForTimeout(500);
  g.nonogram.lose = await waitModal(4000);
  await closeModal();
  await page.waitForTimeout(400);
  g.nonogram.pauseFreeze = await framesWhilePaused();

  /* ============ rhythm 节奏点击 ============ */
  g.rhythm.hook = await openGame('rhythm');
  g.rhythm.init = await page.evaluate(() => JSON.stringify(__H().state()).slice(0, 120));
  /* 键盘 D/F/J/K 打击：冷却位翻转证明输入通路 */
  g.rhythm.kb = await page.evaluate(async () => {
    const a = __H();
    const before = a.state().cd.join(',');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', bubbles: true }));
    await new Promise(r => setTimeout(r, 80));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', bubbles: true }));
    const after = a.state().cd.join(',');
    return before !== after ? 'kb ok cd ' + before + '->' + after : 'fail cd=' + after;
  });
  /* 真实打击驱动至曲终 → win（约 30s） */
  g.rhythm.win = await page.evaluate(() => new Promise((resolve) => {
    const a = __H();
    const t0 = Date.now();
    (function step() {
      const st = a.state();
      if (st.over) { resolve({ over: true, note: st }); return; }
      if (Date.now() - t0 > 42000) { resolve({ over: false, note: st }); return; }
      const n = a.nearest();
      if (n && Math.abs(n.dt) < 0.14) a.hit(n.lane);
      setTimeout(step, 30);
    })();
  }));
  g.rhythm.winModal = await waitModal(5000);
  g.rhythm.best = await page.evaluate(() => localStorage.getItem('gk_rhythm_best'));
  /* 十次漏判 → lose */
  await closeModal();
  g.rhythm.lose = await page.evaluate(() => new Promise((resolve) => {
    const a = __H();
    const t0 = Date.now();
    (function step() {
      const st = a.state();
      if (st.over) { resolve({ over: true, misses: st.misses }); return; }
      if (Date.now() - t0 > 8000) { resolve({ over: false, st: st }); return; }
      a.forceMiss();
      setTimeout(step, 80);
    })();
  }));
  await closeModal();
  await page.waitForTimeout(400);
  g.rhythm.pauseFreeze = await framesWhilePaused();

  return JSON.stringify({ g, errors: errors.slice(0, 8) });
}
