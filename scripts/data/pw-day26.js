async page => {
  /* 2026-09-26 三款验收：大富翁 rich / 老虎机 slot / 猜数字 guessnum */
  const B = 'http://localhost:8820';
  const g = { errors: [] };
  page.on('pageerror', (e) => g.errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') g.errors.push('console: ' + m.text().slice(0, 150)); });

  async function open(id) {
    await page.goto(B + '/play.html?g=' + id + '&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForSelector('#stage canvas', { timeout: 9000 });
    await page.waitForTimeout(500);
  }
  async function A() {
    return page.evaluate(() => {
      const c = document.querySelector('#stage canvas');
      return c && c.__auto ? 'hooked' : 'no-hook';
    });
  }
  async function modalUp() {
    return page.evaluate(() => {
      const m = document.querySelector('.modal');
      if (!m) return false;
      const cs = getComputedStyle(m);
      return cs.display !== 'none' && +cs.opacity > 0.5;
    });
  }
  async function waitModal(ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { if (await modalUp()) return true; await page.waitForTimeout(250); }
    return false;
  }
  async function closeModal() {
    await page.evaluate(() => {
      const b = document.querySelector('.modal__foot .btn--primary');
      if (b) b.click();
    });
    await page.waitForTimeout(600);
  }
  async function frame() {
    return page.evaluate(() => document.querySelector('#stage canvas').toDataURL());
  }
  async function pauseToggle() {
    await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
    await page.waitForTimeout(300);
  }
  async function canvasClick(lx, ly) {
    const rect = await page.evaluate(() => {
      const r = document.querySelector('#stage canvas').getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    await page.mouse.click(rect.x + lx * rect.w / 560, rect.y + ly * rect.h / 700);
  }
  async function padTap(k) {
    await page.locator('.gk-pad__btn[data-k="' + k + '"]').first().dispatchEvent('mousedown');
    await page.waitForTimeout(90);
    await page.locator('.gk-pad__btn[data-k="' + k + '"]').first().dispatchEvent('mouseup');
    await page.waitForTimeout(120);
  }

  /* ================= 大富翁 rich ================= */
  await open('rich');
  g.rich = {};
  g.rich.canvas = await A();
  g.rich.init = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());

  /* 键盘 Space 掷骰，等本回合结束（回到 idle） */
  await page.keyboard.down('Space');
  await page.waitForTimeout(100);
  await page.keyboard.up('Space');
  await page.waitForTimeout(200);
  g.rich.rolling = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().phase);
  const r1 = await page.evaluate(() => new Promise((res) => {
    const a = document.querySelector('#stage canvas').__auto;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const st = a.state();
      if (st.phase === 'idle' || st.over || Date.now() - t0 > 20000) { clearInterval(iv); res(st); }
    }, 120);
  }));
  g.rich.afterKeyRoll = { phase: r1.phase, dice: r1.dice, cash: r1.cash, round: r1.round, log: r1.logs[0] };

  /* 触屏点掷骰按钮 + 手柄 A 各掷一次 */
  await canvasClick(280, 650);
  await page.waitForTimeout(300);
  const r2 = await page.evaluate(() => new Promise((res) => {
    const a = document.querySelector('#stage canvas').__auto;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const st = a.state();
      if (st.phase === 'idle' && st.cur === 0 || st.over || Date.now() - t0 > 20000) { clearInterval(iv); res(st); }
    }, 120);
  }));
  g.rich.afterTouch = { phase: r2.phase, round: r2.round };
  await page.evaluate(() => {
    const st = document.querySelector('.gk-stage');
    if (st) st.classList.add('show-pad');
  });
  await page.waitForTimeout(100);
  await padTap('a');
  await page.waitForTimeout(300);
  g.rich.afterPad = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().phase);

  /* 暂停冻结（坑 19：先暂停再抓帧） */
  await pauseToggle();
  const f1 = await frame();
  await page.waitForTimeout(1100);
  const f2 = await frame();
  g.rich.pauseFrozen = f1 === f2;
  await pauseToggle();
  await page.waitForTimeout(200);

  /* 完整对局：evaluate 驱动 12 回合（玩家踩电脑地收租+买地 → 资产领先获胜） */
  g.rich.game = await page.evaluate(() => new Promise((resolve) => {
    const a = document.querySelector('#stage canvas').__auto;
    const cells = a.cells();
    const t0 = Date.now();
    function pickDx(dx) { /* 掷出总点数 dx（2-12 可达，其余走 2 步） */
      if (dx >= 2 && dx <= 12) return [Math.max(1, Math.min(6, dx - 1)), Math.max(1, dx - Math.max(1, Math.min(6, dx - 1)))];
      return [1, 1];
    }
    function targetFor(me, foe) {
      const props = a.props();
      /* 先找对手的地产（去收租），再找无主地产（prop 格且无人拥有） */
      const cands = [];
      for (let i = 0; i < 16; i++) {
        if (cells[i] === 'prop') cands.push({ i: i, o: props[i] });
      }
      let best = -1, bd = 99;
      for (const c of cands) {
        const want = (c.o === null) || (c.o.o === 1 - me);
        if (!want) continue;
        let dx = (c.i - foe + 16) % 16;
        if (dx === 0) dx = 16;
        if (dx >= 2 && dx <= 12 && dx < bd) { bd = dx; best = c.i; }
      }
      if (best < 0) return pickDx(7);
      return pickDx((best - foe + 16) % 16);
    }
    const iv = setInterval(() => {
      const st = a.state();
      if (st.over) { clearInterval(iv); resolve({ done: 'over', round: st.round, cash: st.cash }); return; }
      if (Date.now() - t0 > 170000) { clearInterval(iv); resolve({ done: 'timeout', st: st }); return; }
      if (st.phase === 'idle') {
        if (st.cur === 0) {
          const d = targetFor(0, st.pos[0]);
          a.forceDice(d[0], d[1]);
          a.roll();
        } else {
          a.forceDice(0, 1); /* 电脑每次走 1 步 */
          a.roll();
        }
      }
    }, 130);
  }));
  g.rich.modal = await waitModal(6000);
  g.rich.end = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  g.rich.best = await page.evaluate(() => localStorage.getItem('gk_rich_best'));

  /* ================= 老虎机 slot ================= */
  await open('slot');
  g.slot = {};
  g.slot.canvas = await A();
  g.slot.init = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());

  /* 键盘 Space 转一次 */
  await page.keyboard.down('Space');
  await page.waitForTimeout(100);
  await page.keyboard.up('Space');
  await page.waitForTimeout(200);
  g.slot.spinning = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().phase);
  const s1 = await page.evaluate(() => new Promise((res) => {
    const a = document.querySelector('#stage canvas').__auto;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const st = a.state();
      if (st.phase === 'idle' || st.over || Date.now() - t0 > 15000) { clearInterval(iv); res(st); }
    }, 120);
  }));
  g.slot.afterKey = { phase: s1.phase, cash: s1.cash, spins: s1.spins, res: s1.res };

  /* 触屏注额 + SPIN */
  await canvasClick(390, 399);
  await page.waitForTimeout(150);
  g.slot.betUp = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().bet);
  await canvasClick(280, 490);
  await page.waitForTimeout(300);
  const s2 = await page.evaluate(() => new Promise((res) => {
    const a = document.querySelector('#stage canvas').__auto;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const st = a.state();
      if (st.phase === 'idle' || st.over || Date.now() - t0 > 15000) { clearInterval(iv); res(st); }
    }, 120);
  }));
  g.slot.afterTouch = { phase: s2.phase, spins: s2.spins, bet: s2.bet };

  /* 手柄 A */
  await page.evaluate(() => {
    const st = document.querySelector('.gk-stage');
    if (st) st.classList.add('show-pad');
  });
  await page.waitForTimeout(100);
  await padTap('a');
  await page.waitForTimeout(300);
  g.slot.afterPad = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().spins);

  /* 暂停冻结：先 spin 再暂停 */
  await page.evaluate(() => document.querySelector('#stage canvas').__auto.spin());
  await page.waitForTimeout(300);
  await pauseToggle();
  const f3 = await frame();
  await page.waitForTimeout(1100);
  const f4 = await frame();
  g.slot.pauseFrozen = f3 === f4;
  await pauseToggle();
  const s3 = await page.evaluate(() => new Promise((res) => {
    const a = document.querySelector('#stage canvas').__auto;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const st = a.state();
      if (st.phase === 'idle' || st.over || Date.now() - t0 > 15000) { clearInterval(iv); res(st); }
    }, 120);
  }));
  g.slot.afterPauseResume = { phase: s3.phase, spins: s3.spins };

  /* 兑现路径：give 达标 → Enter 兑现 → win 结算 */
  await page.evaluate(() => document.querySelector('#stage canvas').__auto.give(900));
  await page.keyboard.down('Enter');
  await page.waitForTimeout(100);
  await page.keyboard.up('Enter');
  await page.waitForTimeout(500);
  g.slot.cashoutModal = await waitModal(4000);
  g.slot.cashoutState = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  g.slot.best = await page.evaluate(() => localStorage.getItem('gk_slot_best'));
  await closeModal();

  /* 破产路径：give 扣光 → spin → 结束 */
  await page.evaluate(() => document.querySelector('#stage canvas').__auto.give(-1800));
  await page.evaluate(() => document.querySelector('#stage canvas').__auto.spin());
  await page.waitForTimeout(300);
  const s4 = await page.evaluate(() => new Promise((res) => {
    const a = document.querySelector('#stage canvas').__auto;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const st = a.state();
      if (st.over || Date.now() - t0 > 15000) { clearInterval(iv); res(st); }
      else if (st.phase === 'idle') { clearInterval(iv); res({ over: false, st: st }); }
    }, 120);
  }));
  g.slot.brokeModal = await waitModal(4000);
  g.slot.brokeState = s4;

  /* ================= 猜数字 guessnum ================= */
  await open('guessnum');
  g.gn = {};
  g.gn.canvas = await A();
  g.gn.init = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  const secret = await page.evaluate(() => document.querySelector('#stage canvas').__auto.secret());

  /* 键盘输入答案 → win */
  for (const d of secret) {
    await page.keyboard.down('Digit' + d);
    await page.waitForTimeout(60);
    await page.keyboard.up('Digit' + d);
    await page.waitForTimeout(80);
  }
  g.gn.cur = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().cur);
  await page.keyboard.down('Enter');
  await page.waitForTimeout(100);
  await page.keyboard.up('Enter');
  await page.waitForTimeout(500);
  g.gn.winModal = await waitModal(4000);
  g.gn.best = await page.evaluate(() => localStorage.getItem('gk_guessnum_best'));
  await closeModal();

  /* 手柄 A/B 通路：输入两位 → pad.b 删一位 → 补满 → pad.a 提交 */
  await page.waitForTimeout(400);
  const st2 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  if (!st2.over) {
    const sec2 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.secret());
    for (const d of [sec2[0], (sec2[1] + 1) % 10]) {
      await page.keyboard.down('Digit' + d);
      await page.waitForTimeout(60);
      await page.keyboard.up('Digit' + d);
      await page.waitForTimeout(80);
    }
    await padTap('b');
    const curAfterDel = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().cur.length);
    for (let i = curAfterDel; i < sec2.length; i++) {
      await page.keyboard.down('Digit' + sec2[i]);
      await page.waitForTimeout(60);
      await page.keyboard.up('Digit' + sec2[i]);
      await page.waitForTimeout(80);
    }
    await padTap('a');
    await page.waitForTimeout(400);
    g.gn.padPath = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  }

  /* 触屏数字键盘通路 */
  await page.waitForTimeout(400);
  const st3 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  if (!st3.over) {
    const sec3 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.secret());
    const keyRC = {};
    const padMap = [[1, 2, 3], [4, 5, 6], [7, 8, 9], ['del', 0, 'ok']];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) keyRC[padMap[r][c]] = [80 + c * 140 + 65, 436 + r * 72 + 31];
    for (const d of sec3) {
      const rc = keyRC[d];
      await canvasClick(rc[0], rc[1]);
      await page.waitForTimeout(120);
    }
    g.gn.touchCur = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().cur);
    await canvasClick(keyRC['ok'][0], keyRC['ok'][1]);
    await page.waitForTimeout(400);
    g.gn.touchSubmit = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  }

  /* lose 路径：连续错误猜满 */
  await page.waitForTimeout(400);
  const gnLose = await page.evaluate(() => new Promise((resolve) => {
    const a = document.querySelector('#stage canvas').__auto;
    const secret = a.secret();
    const L = secret.length;
    function wrongGuess() {
      /* 构造一个与 secret 不同的不重复序列 */
      let g = secret.slice();
      for (let t = 0; t < 40; t++) {
        const i = Math.floor(Math.random() * L), j = Math.floor(Math.random() * L);
        const tmp = g[i]; g[i] = g[j]; g[j] = tmp;
        if (g.join('') !== secret.join('')) return g;
      }
      g = []; let used = {};
      for (let i = 0; i < L; i++) { let d = (secret[i] + 1 + i) % 10; while (used[d]) d = (d + 1) % 10; used[d] = 1; g.push(d); }
      return g;
    }
    const t0 = Date.now();
    function step() {
      const st = a.state();
      if (st.over) { resolve({ over: true, left: st.left, hist: st.hist.length }); return; }
      if (Date.now() - t0 > 60000) { resolve({ over: false, st: st }); return; }
      if (st.cur.length === 0 && st.left > 0) {
        const gg = wrongGuess();
        for (const d of gg) a.push(d);
        a.submit();
      }
      setTimeout(step, 250);
    }
    step();
  }));
  g.gn.lose = gnLose;
  g.gn.loseModal = await waitModal(4000);
  await closeModal();

  /* 暂停冻结 */
  await page.waitForTimeout(300);
  const st4 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  if (!st4.over) {
    await pauseToggle();
    const f5 = await frame();
    await page.waitForTimeout(1100);
    const f6 = await frame();
    g.gn.pauseFrozen = f5 === f6;
    await pauseToggle();
  } else g.gn.pauseFrozen = 'skipped-over';

  return g;
}
