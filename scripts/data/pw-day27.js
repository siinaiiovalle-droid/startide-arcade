async page => {
  /* 2026-09-27 三款验收：乒乓 pong / 相扑 sumo / 滑块拼图 fifteen */
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
    await page.waitForTimeout(700);
  }
  async function frame() {
    return page.evaluate(() => document.querySelector('#stage canvas').toDataURL());
  }
  async function pauseToggle() {
    await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
    await page.waitForTimeout(300);
  }
  /* 画布内拖动（CSS 坐标自动换算 + 滚动） */
  async function canvasDrag(lx1, ly1, lx2, ly2) {
    const rect = await page.evaluate(() => {
      const r = document.querySelector('#stage canvas').getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    const x1 = lx1 * rect.w / 560, y1 = ly1 * rect.h / 700;
    const x2 = lx2 * rect.w / 560, y2 = ly2 * rect.h / 700;
    await page.mouse.move(x1, y1);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(x1 + (x2 - x1) * i / 6, y1 + (y2 - y1) * i / 6);
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    await page.waitForTimeout(150);
  }
  async function canvasClick(lx, ly) {
    const rect = await page.evaluate(() => {
      const r = document.querySelector('#stage canvas').getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    await page.locator('#stage canvas').click({ position: { x: lx * rect.w / 560, y: ly * rect.h / 700 }, timeout: 5000 });
  }
  async function padTap(k) {
    await page.locator('.gk-pad__btn[data-k="' + k + '"]').first().dispatchEvent('mousedown');
    await page.waitForTimeout(90);
    await page.locator('.gk-pad__btn[data-k="' + k + '"]').first().dispatchEvent('mouseup');
    await page.waitForTimeout(150);
  }
  async function showPad() {
    await page.evaluate(() => {
      const st = document.querySelector('.gk-stage');
      if (st) st.classList.add('show-pad');
    });
    await page.waitForTimeout(120);
  }

  /* ================= 乒乓 pong ================= */
  await open('pong');
  g.pong = {};
  g.pong.canvas = await A();
  g.pong.init = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());

  /* 手柄左右移动桨 */
  await showPad();
  const px0 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().px);
  await padTap('left');
  await padTap('left');
  const px1 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().px);
  g.pong.padMove = px1 < px0 ? 'moves' : ('fail ' + px0 + '->' + px1);

  /* 触屏拖动桨 */
  await canvasDrag(280, 640, 140, 640);
  const px2 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().px);
  g.pong.touchMove = px2 < px1 - 60 ? 'moves' : ('fail ' + px1 + '->' + px2);

  /* win 路径：注入球 7 次直冲 AI 打不到的角落（监听双方得分重置注入标志） */
  g.pong.win = await page.evaluate(() => new Promise((resolve) => {
    const a = document.querySelector('#stage canvas').__auto;
    const t0 = Date.now();
    let lastPs = a.state().ps, lastAs = a.state().as, injected = false;
    function step() {
      const st = a.state();
      if (st.over) { resolve({ over: true, ps: st.ps, as: st.as, pts: st.pts }); return; }
      if (Date.now() - t0 > 60000) { resolve({ over: false, st: st }); return; }
      if (st.ps !== lastPs || st.as !== lastAs) { lastPs = st.ps; lastAs = st.as; injected = false; }
      if (st.phase === 'play' && !injected) {
        a.setPad(280);
        a.setBall(530, 350, 0, -720); /* 右上死角高速直上，AI 追不及 */
        injected = true;
      }
      setTimeout(step, 100);
    }
    step();
  }));
  g.pong.winModal = await waitModal(5000);
  g.pong.best = await page.evaluate(() => localStorage.getItem('gk_pong_best'));

  /* lose 路径：重开后注入 7 次直落 */
  await closeModal();
  await page.waitForTimeout(400);
  const pongSt = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  if (!pongSt.over) {
    g.pong.lose = await page.evaluate(() => new Promise((resolve) => {
      const a = document.querySelector('#stage canvas').__auto;
      const t0 = Date.now();
      let lastPs = a.state().ps, lastAs = a.state().as, injected = false;
      function step() {
        const st = a.state();
        if (st.over) { resolve({ over: true, ps: st.ps, as: st.as }); return; }
        if (Date.now() - t0 > 60000) { resolve({ over: false, st: st }); return; }
        if (st.ps !== lastPs || st.as !== lastAs) { lastPs = st.ps; lastAs = st.as; injected = false; }
        if (st.phase === 'play' && !injected) {
          a.setPad(64);
          a.setBall(500, 340, 0, 580); /* 直落我方打不到 */
          injected = true;
        }
        setTimeout(step, 100);
      }
      step();
    }));
    g.pong.loseModal = await waitModal(5000);
    if (await modalUp()) await closeModal();
  } else g.pong.lose = 'skipped';

  /* 暂停冻结（球在动时暂停） */
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#stage canvas').__auto.setBall(100, 300, 240, 400));
  await page.waitForTimeout(150);
  await pauseToggle();
  const f1 = await frame();
  await page.waitForTimeout(1100);
  const f2 = await frame();
  g.pong.pauseFrozen = f1 === f2;
  await pauseToggle();

  /* ================= 相扑 sumo ================= */
  await open('sumo');
  g.sumo = {};
  g.sumo.canvas = await A();
  g.sumo.init = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());

  /* 键盘方向移动 */
  const mx0 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().me.x);
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowLeft');
  const mx1 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().me.x);
  g.sumo.keyMove = mx1 < mx0 - 40 ? 'moves' : ('fail ' + mx0 + '->' + mx1);

  /* 键盘冲刺：归位后移动中按 Space，按下期间 dashT>0 即生效 */
  await page.evaluate(() => {
    return new Promise((res) => {
      const a = document.querySelector('#stage canvas').__auto;
      const iv = setInterval(() => {
        a.move(280, 430);
        if (a.state().phase === 'play') { clearInterval(iv); res(); }
      }, 120);
    });
  });
  await page.waitForTimeout(300);
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(120);
  await page.keyboard.down('Space');
  await page.waitForTimeout(60);
  const kd = await page.evaluate(() => {
    const s = document.querySelector('#stage canvas').__auto.state();
    return { dashT: s.dashT, stam: s.stam };
  });
  await page.keyboard.up('Space');
  await page.keyboard.up('ArrowLeft');
  g.sumo.keyDash = kd.dashT > 0 ? ('dashes (stam ' + kd.stam.toFixed(0) + ')') : ('fail dashT=' + kd.dashT);

  /* 手柄 A 冲刺：等 play 态后键盘移动 + 手柄 A，mousedown 期间 dashT>0 即生效 */
  await showPad();
  await page.evaluate(() => {
    return new Promise((res) => {
      const a = document.querySelector('#stage canvas').__auto;
      const iv = setInterval(() => {
        a.move(280, 430);
        if (a.state().phase === 'play') { clearInterval(iv); res(); }
      }, 120);
    });
  });
  await page.waitForTimeout(300);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(120);
  await page.locator('.gk-pad__btn[data-k="a"]').first().dispatchEvent('mousedown');
  await page.waitForTimeout(70);
  const pd = await page.evaluate(() => {
    const s = document.querySelector('#stage canvas').__auto.state();
    return { dashT: s.dashT, padA: s.pad.a };
  });
  await page.locator('.gk-pad__btn[data-k="a"]').first().dispatchEvent('mouseup');
  await page.keyboard.up('ArrowRight');
  g.sumo.padDash = (pd.dashT > 0 && pd.padA) ? 'dashes' : ('fail dashT=' + pd.dashT + ' padA=' + pd.padA);

  /* 触屏摇杆：合成 pointer 事件（手柄 DOM 会覆盖画布中央截获 pointerdown） */
  const mx2 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().me.x);
  await page.evaluate(() => {
    const c = document.querySelector('#stage canvas');
    const r = c.getBoundingClientRect();
    const ev = (type, lx, ly) => c.dispatchEvent(new PointerEvent(type, {
      clientX: r.left + lx * r.width / 560, clientY: r.top + ly * r.height / 700,
      bubbles: true, pointerId: 7, pointerType: 'touch'
    }));
    window.__sumoEv = ev;
    ev('pointerdown', 280, 560);
    ev('pointermove', 200, 560);
    ev('pointermove', 160, 560);
  });
  await page.waitForTimeout(350);
  await page.evaluate(() => {
    window.__sumoEv('pointerup', 160, 560);
    delete window.__sumoEv;
  });
  await page.waitForTimeout(100);
  const mx3 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().me.x);
  g.sumo.touchStick = mx3 < mx2 - 40 ? 'moves' : ('fail ' + mx2 + '->' + mx3);

  /* win 路径：把对手放到环外 8 次 */
  g.sumo.win = await page.evaluate(() => new Promise((resolve) => {
    const a = document.querySelector('#stage canvas').__auto;
    const t0 = Date.now();
    function step() {
      const st = a.state();
      if (st.over) { resolve({ over: true, wave: st.wave, score: st.score, lives: st.lives }); return; }
      if (Date.now() - t0 > 70000) { resolve({ over: false, st: st }); return; }
      if (st.phase === 'play') {
        a.placeFoe(280, 30); /* 距环心 290 > 252 → 出界 */
      }
      setTimeout(step, 180);
    }
    step();
  }));
  g.sumo.winModal = await waitModal(5000);
  g.sumo.best = await page.evaluate(() => localStorage.getItem('gk_sumo_best'));

  /* lose 路径：重开后把自己移出环 3 次 */
  await closeModal();
  await page.waitForTimeout(400);
  const sumoSt = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  if (!sumoSt.over) {
    g.sumo.lose = await page.evaluate(() => new Promise((resolve) => {
      const a = document.querySelector('#stage canvas').__auto;
      const t0 = Date.now();
      function step() {
        const st = a.state();
        if (st.over) { resolve({ over: true, lives: st.lives, wave: st.wave, score: st.score }); return; }
        if (Date.now() - t0 > 60000) { resolve({ over: false, st: st }); return; }
        if (st.phase === 'play') {
          a.move(280, 30); /* 我方出界 */
        }
        setTimeout(step, 180);
      }
      step();
    }));
    g.sumo.loseModal = await waitModal(5000);
    if (await modalUp()) await closeModal();
  } else g.sumo.lose = 'skipped';

  /* 暂停冻结 */
  await page.waitForTimeout(300);
  await pauseToggle();
  const f3 = await frame();
  await page.waitForTimeout(1100);
  const f4 = await frame();
  g.sumo.pauseFrozen = f3 === f4;
  await pauseToggle();

  /* ================= 滑块拼图 fifteen ================= */
  await open('fifteen');
  g.fifteen = {};
  g.fifteen.canvas = await A();
  const fInit = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  g.fifteen.init = { moves: fInit.moves, correct: fInit.correct, empty: fInit.empty };
  const n = fInit.tiles.length === 9 ? 3 : (fInit.tiles.length === 16 ? 4 : 5);
  const CS = n === 3 ? 128 : (n === 4 ? 104 : 84);
  const GX = Math.round((560 - n * CS) / 2), GY = 150;

  /* 触屏点块：点空格相邻块一格 */
  const t1b = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const st = a.state();
    const e = st.empty, nn = Math.sqrt(st.tiles.length) | 0;
    return (e % nn < nn - 1) ? e + 1 : e - 1;
  });
  const cc = t1b % n, cr = Math.floor(t1b / n);
  const mv0 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().moves);
  await canvasClick(GX + cc * CS + CS / 2, GY + cr * CS + CS / 2);
  await page.waitForTimeout(200);
  const mv1 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().moves);
  g.fifteen.touchSlide = mv1 === mv0 + 1 ? 'slides' : ('fail ' + mv0 + '->' + mv1);

  /* 方向键滑动 */
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(80);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(150);
  const mv2 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().moves);
  g.fifteen.keySlide = mv2 === mv1 + 1 ? 'slides' : ('fail ' + mv1 + '->' + mv2);

  /* 手柄方向滑动 */
  await showPad();
  await padTap('left');
  const mv3 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().moves);
  g.fifteen.padSlide = mv3 === mv2 + 1 ? 'slides' : ('fail ' + mv2 + '->' + mv3);

  /* win 路径：先 restart 撤销测试滑动，再逆序重放打乱序列（坑 24 教训） */
  await page.evaluate(() => { const b = document.querySelector('#btnRestart'); if (b) b.click(); });
  await page.waitForTimeout(600);
  g.fifteen.win = await page.evaluate(() => new Promise((resolve) => {
    const a = document.querySelector('#stage canvas').__auto;
    const moves = a.shuffles();
    const t0 = Date.now();
    let k = moves.length - 1;
    function step() {
      if (a.state().solved) { resolve({ solved: true, moves: a.state().moves }); return; }
      if (Date.now() - t0 > 90000) { resolve({ solved: false, k: k, st: a.state() }); return; }
      for (let t = 0; t < 4 && k >= 0; t++, k--) {
        a.slide(moves[k].e);
      }
      if (k < 0) {
        /* 兜底：逐块归位（把每个非空错位的块用 slideDir 慢慢解太慢，这里只检查是否恰好解出） */
        setTimeout(function () { resolve({ solved: a.state().solved, moves: a.state().moves, correct: a.state().correct }); }, 500);
        return;
      }
      setTimeout(step, 20);
    }
    step();
  }));
  g.fifteen.winModal = await waitModal(5000);
  g.fifteen.best = await page.evaluate(() => localStorage.getItem('gk_fifteen_best'));

  /* 暂停冻结（若还在游戏中） */
  if (!(await modalUp())) {
    await pauseToggle();
    const f5 = await frame();
    await page.waitForTimeout(1100);
    const f6 = await frame();
    g.fifteen.pauseFrozen = f5 === f6;
    await pauseToggle();
  } else g.fifteen.pauseFrozen = 'game-over-during-test';

  return g;
}
