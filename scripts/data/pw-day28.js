async page => {
  /* 2026-09-28 三款续作验收：打砖块2 breakout2 / 超级玛丽2 mario2 / 星际战机2 shooter2 */
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
  /* 画布内拖动（lw/lh 为游戏逻辑尺寸） */
  async function canvasDrag(lx1, ly1, lx2, ly2, lw, lh) {
    const rect = await page.evaluate(() => {
      const r = document.querySelector('#stage canvas').getBoundingClientRect();
      return { w: r.width, h: r.height };
    });
    const x1 = lx1 * rect.w / lw, y1 = ly1 * rect.h / lh;
    const x2 = lx2 * rect.w / lw, y2 = ly2 * rect.h / lh;
    await page.mouse.move(x1, y1);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(x1 + (x2 - x1) * i / 6, y1 + (y2 - y1) * i / 6);
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    await page.waitForTimeout(150);
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

  /* ================= 打砖块2 breakout2（720x540） ================= */
  await open('breakout2');
  g.breakout2 = {};
  g.breakout2.canvas = await A();
  g.breakout2.init = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());

  /* 键盘移动挡板 */
  const bp0 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().paddleX);
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowLeft');
  const bp1 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().paddleX);
  g.breakout2.keyMove = bp1 < bp0 - 60 ? 'moves' : ('fail ' + bp0 + '->' + bp1);

  /* 触屏拖动挡板：画布内合成鼠标事件（手柄 DOM 会截获真实 pointer，坑 30 同款） */
  await page.evaluate(() => {
    const c = document.querySelector('#stage canvas');
    const r = c.getBoundingClientRect();
    const ev = (type, lx, ly) => c.dispatchEvent(new MouseEvent(type, { clientX: r.left + lx * r.width / 720, clientY: r.top + ly * r.height / 540, bubbles: true }));
    ev('mousedown', 360, 400);
    for (let i = 1; i <= 10; i++) ev('mousemove', 360 - i * 12, 400);
  });
  await page.waitForTimeout(250);
  const bp2 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().paddleX);
  await page.evaluate(() => document.querySelector('#stage canvas').dispatchEvent(new MouseEvent('mouseup', { bubbles: true })));
  g.breakout2.touchMove = bp2 > 200 ? 'moves (' + Math.round(bp2) + ')' : ('fail ' + bp2);

  /* 手柄移动 */
  await showPad();
  await padTap('right');
  await padTap('right');
  const bp3 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().paddleX);
  g.breakout2.padMove = bp3 > bp2 + 20 ? 'moves' : ('fail ' + bp2 + '->' + bp3);

  /* 激光道具：拾取后 A 发射，砖块减少 */
  await page.evaluate(() => document.querySelector('#stage canvas').__auto.giveDrop('laser'));
  const brk0 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().bricks);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.down('Space');
    await page.waitForTimeout(80);
    await page.keyboard.up('Space');
    await page.waitForTimeout(420);
  }
  const brk1 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().bricks);
  g.breakout2.laser = brk1 < brk0 ? 'fires (' + brk0 + '->' + brk1 + ')' : ('fail ' + brk0 + '->' + brk1);

  /* 发球（让球动起来，供暂停冻结用） */
  await page.keyboard.down('Space');
  await page.waitForTimeout(80);
  await page.keyboard.up('Space');
  await page.waitForTimeout(200);

  /* win 路径：三关逐次清砖 */
  g.breakout2.win = await page.evaluate(() => new Promise((resolve) => {
    const a = document.querySelector('#stage canvas').__auto;
    const t0 = Date.now();
    function step() {
      const st = a.state();
      if (st.over) { resolve({ over: true, score: st.score, level: st.level, phase: st.phase }); return; }
      if (Date.now() - t0 > 30000) { resolve({ over: false, st: st }); return; }
      if (st.phase === 'play' && st.bricks > 0) a.clear();
      setTimeout(step, 120);
    }
    step();
  }));
  g.breakout2.winModal = await waitModal(6000);
  g.breakout2.best = await page.evaluate(() => localStorage.getItem('gk_breakout2_best'));

  /* lose 路径：重开后命清零 */
  await closeModal();
  await page.waitForTimeout(500);
  const b2st = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  if (!b2st.over) {
    /* 发球并移开挡板，让球必然坠落触发结算 */
    await page.keyboard.down('Space');
    await page.waitForTimeout(80);
    await page.keyboard.up('Space');
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('#stage canvas').__auto.setPaddle(60));
    g.breakout2.lose = await page.evaluate(() => new Promise((resolve) => {
      const a = document.querySelector('#stage canvas').__auto;
      const t0 = Date.now();
      function step() {
        const st = a.state();
        if (st.over) { resolve({ over: true, score: st.score }); return; }
        if (Date.now() - t0 > 15000) { resolve({ over: false, st: st }); return; }
        setTimeout(step, 150);
      }
      step();
    }));
    g.breakout2.loseModal = await waitModal(5000);
    if (await modalUp()) await closeModal();
  } else g.breakout2.lose = 'skipped';

  /* 暂停冻结 */
  await page.waitForTimeout(200);
  await page.keyboard.down('Space');
  await page.waitForTimeout(80);
  await page.keyboard.up('Space');
  await page.waitForTimeout(200);
  await pauseToggle();
  const bf1 = await frame();
  await page.waitForTimeout(1100);
  const bf2 = await frame();
  g.breakout2.pauseFrozen = bf1 === bf2;
  await pauseToggle();

  /* ================= 超级玛丽2 mario2（960x480） ================= */
  await open('mario2');
  g.mario2 = {};
  g.mario2.canvas = await A();
  g.mario2.init = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());

  /* 键盘右移 */
  const mp0 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().x);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(350);
  await page.keyboard.up('ArrowRight');
  const mp1 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().x);
  g.mario2.keyMove = mp1 > mp0 + 40 ? 'moves' : ('fail ' + mp0 + '->' + mp1);

  /* 手柄 A 跳跃：按住 250ms 期间读高度（短按会被可变跳跃高度截断落地） */
  await showPad();
  const my0 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().y);
  await page.locator('.gk-pad__btn[data-k="a"]').first().dispatchEvent('mousedown');
  await page.waitForTimeout(250);
  const my1 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().y);
  await page.locator('.gk-pad__btn[data-k="a"]').first().dispatchEvent('mouseup');
  await page.waitForTimeout(600);
  g.mario2.padJump = my1 < my0 - 40 ? 'jumps (' + Math.round(my1) + ')' : ('fail ' + my0 + '->' + Math.round(my1));

  /* 弹簧砖：第 3 关弹簧上方落下，被弹到高位 */
  await page.evaluate(() => document.querySelector('#stage canvas').__auto.skipTo(2));
  await page.waitForTimeout(300);
  const spr = await page.evaluate(() => new Promise((resolve) => {
    const a = document.querySelector('#stage canvas').__auto;
    a.teleport(40 * 32 + 3, 9 * 32);
    let minY = 9 * 32, t0 = Date.now();
    (function poll() {
      const st = a.state();
      if (st.y < minY) minY = st.y;
      if (Date.now() - t0 > 700) { resolve({ minY: minY, start: 288, sprung: minY < 210 }); return; }
      requestAnimationFrame(poll);
    })();
  }));
  g.mario2.spring = spr.sprung ? ('springs (minY ' + Math.round(spr.minY) + ')') : ('fail minY=' + Math.round(spr.minY));

  /* 刺球伤害：第 2 关刺球处受伤（3 命 -> 2） */
  await page.evaluate(() => document.querySelector('#stage canvas').__auto.skipTo(1));
  await page.waitForTimeout(300);
  g.mario2.spiky = await page.evaluate(() => new Promise((resolve) => {
    const a = document.querySelector('#stage canvas').__auto;
    a.teleport(12 * 32, 10 * 32 - 34);
    const t0 = Date.now();
    (function poll() {
      const st = a.state();
      if (st.state === 'dead' || st.lives < 3) { resolve({ hurt: true, lives: st.lives, phase: st.state }); return; }
      if (Date.now() - t0 > 6000) { resolve({ hurt: false, st: st }); return; }
      setTimeout(poll, 120);
    })();
  }));
  /* 等复活流程走完 */
  await page.waitForTimeout(2800);

  /* win 路径：第 3 关直达旗杆（全通） */
  await page.evaluate(() => document.querySelector('#stage canvas').__auto.skipTo(2));
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#stage canvas').__auto.teleport(180 * 32 - 8, 11.6 * 32));
  const mwin = await page.evaluate(() => new Promise((resolve) => {
    const a = document.querySelector('#stage canvas').__auto;
    const t0 = Date.now();
    (function poll() {
      const st = a.state();
      const m = document.querySelector('.modal');
      const up = m && getComputedStyle(m).display !== 'none' && +getComputedStyle(m).opacity > 0.5;
      if (up) { resolve({ win: true, score: st.score, levelIdx: st.levelIdx }); return; }
      if (Date.now() - t0 > 12000) { resolve({ win: false, st: st }); return; }
      setTimeout(poll, 150);
    })();
  }));
  g.mario2.win = mwin;
  g.mario2.winModal = mwin.win === true;
  g.mario2.best = await page.evaluate(() => localStorage.getItem('gk_mario2_best'));

  /* lose 路径：重开后命清零（死亡动画 -> 结算） */
  await closeModal();
  await page.waitForTimeout(500);
  const m2st = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  if (!m2st.over) {
    await page.evaluate(() => document.querySelector('#stage canvas').__auto.kill());
    g.mario2.lose = await page.evaluate(() => new Promise((resolve) => {
      const a = document.querySelector('#stage canvas').__auto;
      const t0 = Date.now();
      (function poll() {
        const st = a.state();
        const m = document.querySelector('.modal');
        const up = m && getComputedStyle(m).display !== 'none' && +getComputedStyle(m).opacity > 0.5;
        if (up) { resolve({ lose: true, score: st.score }); return; }
        if (Date.now() - t0 > 15000) { resolve({ lose: false, st: st }); return; }
        setTimeout(poll, 150);
      })();
    }));
    g.mario2.loseModal = g.mario2.lose.lose === true;
    if (await modalUp()) await closeModal();
  } else g.mario2.lose = 'skipped';

  /* 暂停冻结（跑动中暂停） */
  await page.waitForTimeout(200);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(120);
  await pauseToggle();
  await page.keyboard.up('ArrowRight');
  const mf1 = await frame();
  await page.waitForTimeout(1100);
  const mf2 = await frame();
  g.mario2.pauseFrozen = mf1 === mf2;
  await pauseToggle();

  /* ================= 星际战机2 shooter2（500x760） ================= */
  await open('shooter2');
  g.shooter2 = {};
  g.shooter2.canvas = await A();
  g.shooter2.init = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());

  /* 键盘移动 */
  const sp0 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().px);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  const sp1 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().px);
  g.shooter2.keyMove = sp1 > sp0 + 50 ? 'moves' : ('fail ' + sp0 + '->' + sp1);

  /* 手柄方向移动 */
  await showPad();
  await padTap('left');
  await padTap('left');
  const sp2 = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().px);
  g.shooter2.padMove = sp2 < sp1 - 30 ? 'moves' : ('fail ' + sp1 + '->' + sp2);

  /* 僚机 */
  await page.evaluate(() => document.querySelector('#stage canvas').__auto.giveDrone());
  const dr = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state().drones);
  g.shooter2.drone = dr >= 1 ? 'orbiting' : 'fail';

  /* 三场 BOSS 全灭 -> win：skipWave 直达 3/6/9 波（自然推进 40s 预算不够） */
  g.shooter2.win = await page.evaluate(() => new Promise((resolve) => {
    const a = document.querySelector('#stage canvas').__auto;
    const t0 = Date.now();
    const seen = [];
    function step() {
      const st = a.state();
      const m = document.querySelector('.modal');
      const up = m && getComputedStyle(m).display !== 'none' && +getComputedStyle(m).opacity > 0.5;
      if (up) { resolve({ win: true, score: st.score, bosses: seen }); return; }
      if (Date.now() - t0 > 30000) { resolve({ win: false, st: st, bosses: seen }); return; }
      if (st.wave === 3 && !seen.includes(3)) {
        if (st.boss && !st.boss.entering) { seen.push(3); a.killBoss(); }
      } else if (st.wave < 3) { a.skipWave(3); }
      else if (st.wave > 3 && st.wave < 6) { a.skipWave(6); }
      else if (st.wave === 6 && !seen.includes(6)) {
        if (st.boss && !st.boss.entering) { seen.push(6); a.killBoss(); }
      } else if (st.wave > 6 && st.wave < 9) { a.skipWave(9); }
      else if (st.wave === 9 && !seen.includes(9)) {
        if (st.boss && !st.boss.entering) { seen.push(9); a.killBoss(); }
      }
      setTimeout(step, 150);
    }
    step();
  }));
  g.shooter2.winModal = g.shooter2.win.win === true;
  g.shooter2.best = await page.evaluate(() => localStorage.getItem('gk_shooter2_best'));

  /* lose 路径：重开后连吃 4 发 */
  await closeModal();
  await page.waitForTimeout(500);
  const s2st = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
  if (!s2st.over) {
    g.shooter2.lose = await page.evaluate(() => new Promise((resolve) => {
      const a = document.querySelector('#stage canvas').__auto;
      for (let i = 0; i < 4; i++) a.hurt();
      const t0 = Date.now();
      (function poll() {
        const st = a.state();
        const m = document.querySelector('.modal');
        const up = m && getComputedStyle(m).display !== 'none' && +getComputedStyle(m).opacity > 0.5;
        if (up) { resolve({ lose: true, score: st.score }); return; }
        if (Date.now() - t0 > 8000) { resolve({ lose: false, st: st }); return; }
        setTimeout(poll, 150);
      })();
    }));
    g.shooter2.loseModal = g.shooter2.lose.lose === true;
    if (await modalUp()) await closeModal();
  } else g.shooter2.lose = 'skipped';

  /* 暂停冻结（弹幕中暂停） */
  await page.waitForTimeout(300);
  await pauseToggle();
  const sf1 = await frame();
  await page.waitForTimeout(1100);
  const sf2 = await frame();
  g.shooter2.pauseFrozen = sf1 === sf2;
  await pauseToggle();

  return g;
}
