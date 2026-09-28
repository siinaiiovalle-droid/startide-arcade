async page => {
  const out = { errs: [], games: {} };
  page.on('console', m => { if (m.type() === 'error') out.errs.push('CONSOLE ' + m.text().slice(0, 120)); });
  page.on('pageerror', e => out.errs.push('PAGEERROR ' + e.message.slice(0, 120)));
  const base = 'http://localhost:8820';
  const hud = () => page.locator('#hud').innerText().then(t => t.replace(/\s+/g, ' ').slice(0, 80));
  const scoreFromHud = async () => { const m = (await hud()).match(/得分 (\d+)/); return m ? +m[1] : -1; };
  const modalVisible = () => page.evaluate(() => {
    const m = document.querySelector('.modal');
    if (!m) return false;
    const cs = getComputedStyle(m);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.5;
  });
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
  const pauseFrozen = async () => {
    await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
    await page.waitForTimeout(300);
    const s1 = await page.locator('#stage canvas').screenshot();
    await page.waitForTimeout(800);
    const s2 = await page.locator('#stage canvas').screenshot();
    await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
    await page.waitForTimeout(300);
    return s1.toString('base64') === s2.toString('base64');
  };
  const auto = () => page.evaluate(() => !!document.querySelector('#stage canvas').__auto);

  /* ---------------- 台球 Pool ---------------- */
  {
    await page.goto(base + '/play.html?g=pool&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const g = {};
    g.hud0 = await hud();
    g.autoReady = await auto();
    g.scored = 0; g.shots = 0;
    for (let k = 0; k < 10 && g.scored === 0; k++) {
      const shot = await page.evaluate(() => {
        const a = document.querySelector('#stage canvas').__auto;
        const st = a.balls();
        if (st.phase !== 'aim' || !st.targets.length) return null;
        const w = st.white;
        const pockets = [{ x: 28, y: 136 }, { x: 532, y: 136 }, { x: 28, y: 662 }, { x: 532, y: 662 }, { x: 280, y: 134 }, { x: 280, y: 664 }];
        let best = null, bestDot = -1;
        for (const t of st.targets) {
          const dx = t.x - w.x, dy = t.y - w.y, dl = Math.hypot(dx, dy) || 1;
          const ux = dx / dl, uy = dy / dl;
          for (const p of pockets) {
            const px = p.x - t.x, py = p.y - t.y, pl = Math.hypot(px, py) || 1;
            const dot = (px / pl) * ux + (py / pl) * uy;
            if (dot > bestDot) { bestDot = dot; best = { a: Math.atan2(dy, dx), p: { x: p.x, y: p.y }, t: t }; }
          }
        }
        a.strike(best.a, 0.85);
        return { dot: +bestDot.toFixed(2) };
      });
      g.shots++;
      if (shot) g.lastDot = shot.dot;
      await page.waitForTimeout(2600);
      g.scored = await scoreFromHud();
    }
    g.pausedFrozen = await pauseFrozen();
    await page.evaluate(() => document.querySelector('#stage canvas').__auto.hurry());
    await page.waitForTimeout(2000);
    g.overModal = await modalVisible();
    g.hudOver = await hud();
    g.bestAfter = await bestKey('pool');
    await closeThenRestart();
    g.hudRestart = await hud();
    out.games.pool = g;
  }

  /* ---------------- 钓鱼 Fishing ---------------- */
  {
    await page.goto(base + '/play.html?g=fishing&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const g = {};
    g.hud0 = await hud();
    g.scored = 0; g.tries = 0; g.lastHit = null;
    for (let k = 0; k < 14 && g.scored <= 0; k++) {
      const hit = await page.evaluate(() => new Promise(res => {
        const a = document.querySelector('#stage canvas').__auto;
        const st = a.state();
        if (st.phase !== 'swing') { res('busy'); return; }
        const fs = a.fishes();
        if (!fs.length) { res('nofish'); return; }
        const pv = { x: 280, y: 168 };
        let target = null, bd = 1e9;
        for (const f of fs) {
          if (f.id === 'bomb') continue;
          const dx = f.x - pv.x, dy = f.y - pv.y;
          const at = Math.atan2(dx, dy); /* 钩方向 = (sin a, cos a) */
          if (at < -1.22 || at > 1.22) continue;
          const d = Math.hypot(dx, dy);
          if (d < bd) { bd = d; target = at; }
        }
        if (target === null) { res('outofrange'); return; }
        const t0 = performance.now();
        const iv = setInterval(() => {
          const cur = a.angle();
          if (cur === null) return;
          if (Math.abs(cur - target) < 0.07) {
            clearInterval(iv); a.release(); res('released');
          } else if (performance.now() - t0 > 4200) {
            clearInterval(iv); res('timeout');
          }
        }, 16);
      }));
      g.lastHit = hit;
      if (hit === 'released') { g.tries++; await page.waitForTimeout(2800); g.scored = await scoreFromHud(); }
      else if (hit === 'busy') await page.waitForTimeout(600);
      else await page.waitForTimeout(700);
    }
    g.pausedFrozen = await pauseFrozen();
    await page.evaluate(() => document.querySelector('#stage canvas').__auto.hurry());
    await page.waitForTimeout(2000);
    g.overModal = await modalVisible();
    g.hudOver = await hud();
    g.bestAfter = await bestKey('fishing');
    await closeThenRestart();
    g.hudRestart = await hud();
    out.games.fishing = g;
  }

  /* ---------------- 合成大西瓜 Suika ---------------- */
  {
    await page.goto(base + '/play.html?g=suika&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const g = {};
    g.hud0 = await hud();
    await page.evaluate(() => document.querySelector('#stage canvas').__auto.dropAt(280, 0));
    await page.waitForTimeout(700);
    await page.evaluate(() => document.querySelector('#stage canvas').__auto.dropAt(280, 0));
    await page.waitForTimeout(1400);
    g.afterMerge = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
    g.ballsLv = await page.evaluate(() => document.querySelector('#stage canvas').__auto.balls().map(b => b.lv));
    g.pausedFrozen = await pauseFrozen();
    // 堆大球触发警戒线结算：lv8/lv9 交替防互合，叠三层必过 DANGER=218
    const seq = [[150, 9], [410, 8], [280, 9], [215, 8], [345, 9], [280, 8], [150, 8], [410, 9]];
    for (const [x, lv] of seq) {
      await page.evaluate(([xx, l]) => document.querySelector('#stage canvas').__auto.dropAt(xx, l), [x, lv]);
      await page.waitForTimeout(750);
    }
    await page.waitForTimeout(5000);
    g.overModal = await modalVisible();
    g.hudOver = await hud();
    g.bestAfter = await bestKey('suika');
    await closeThenRestart();
    g.hudRestart = await hud();
    out.games.suika = g;
  }

  /* ---------------- 大厅 ---------------- */
  {
    await page.goto(base + '/games.html?cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    out.lobby = await page.evaluate(() => document.querySelectorAll('.acard').length);
  }

  return JSON.stringify(out, null, 1);
}
