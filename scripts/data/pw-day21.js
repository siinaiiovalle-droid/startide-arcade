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
  const frame = () => page.evaluate(() => document.querySelector('#stage canvas').toDataURL());
  const pauseFrozen = async () => {
    await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
    await page.waitForTimeout(300);
    const s1 = await frame();
    await page.waitForTimeout(1300);
    const s2 = await frame();
    await page.evaluate(() => { const b = document.querySelector('#btnPause'); if (b) b.click(); });
    await page.waitForTimeout(300);
    return s1.toString() === s2.toString();
  };

  /* ---------------- 扫雷 Minesweeper ---------------- */
  {
    await page.goto(base + '/play.html?g=minesweeper&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const g = {};
    g.hud0 = await hud();
    /* 首点保护 + 泛洪 */
    g.first = await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      a.reveal(6, 6);
      return a.state();
    });
    /* 插旗 */
    g.flag = await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      a.flag(0, 0);
      return a.state().flags;
    });
    g.pausedFrozen = await pauseFrozen();
    /* 读雷位，翻开全部安全格（先取消旗子）→ 通关 */
    g.clear = await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      a.flag(0, 0); /* 取消之前插的测试旗 */
      const gr = a.grid();
      for (let r = 0; r < gr.length; r++) for (let c = 0; c < gr[0].length; c++) {
        if (gr[r][c] !== 9) a.reveal(r, c);
      }
      return a.state();
    });
    await page.waitForTimeout(600);
    g.overModal = await modalVisible();
    g.hudOver = await hud();
    g.bestAfter = await bestKey('minesweeper');
    await closeThenRestart();
    g.hudRestart = await hud();
    out.games.minesweeper = g;
  }

  /* ---------------- 推箱子 Sokoban ---------------- */
  {
    await page.goto(base + '/play.html?g=sokoban&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const g = {};
    g.hud0 = await hud();
    /* 撤销/无效移动：向墙移动不生效；推箱通关属 won 状态不允许 undo（与 freecell 同机制） */
    g.wallBlocked = await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      const p0 = a.player();
      a.move(0, -1); /* 左边是墙 */
      const p1 = a.player();
      return p1.c === p0.c && p1.r === p0.r;
    });
    g.pausedFrozen = await pauseFrozen();
    /* 逐关：读当前 li → push-only BFS（玩家域归一化）求解 → 重放 → 等过关 */
    g.solve = [];
    for (let round = 0; round < 6; round++) {
      const r = await page.evaluate(() => {
        const a = document.querySelector('#stage canvas').__auto;
        const st = a.state();
        if (st.allDone) return { done: true, state: st };
        const maps = a.levelData();
        function parse(map) {
          const walls = [], goals = new Set(), boxes = new Set();
          let player = null;
          for (let r = 0; r < map.length; r++) {
            walls.push([]);
            for (let c = 0; c < map[r].length; c++) {
              const ch = map[r][c];
              walls[r].push(ch === '#' ? 1 : 0);
              const key = r + ',' + c;
              if (ch === '.' || ch === '*' || ch === '+') goals.add(key);
              if (ch === '$' || ch === '*') boxes.add(key);
              if (ch === '@' || ch === '+') player = { r, c };
            }
          }
          return { walls, goals, boxes, player };
        }
        function solveMap(map) {
          const P = parse(map);
          const R = P.walls.length, C = P.walls[0].length;
          const isW = (r, c) => r < 0 || r >= R || c < 0 || c >= C || P.walls[r][c] === 1;
          function deadCorner(r, c) {
            if (P.goals.has(r + ',' + c)) return false;
            const wl = isW(r, c - 1), wr = isW(r, c + 1), wu = isW(r - 1, c), wd = isW(r + 1, c);
            return (wl || wr) && (wu || wd);
          }
          function region(p, boxes) {
            const seen = new Set([p.r + ',' + p.c]);
            const q = [p];
            let min = p.r * C + p.c;
            while (q.length) {
              const cur = q.pop();
              for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nr = cur.r + dr, nc = cur.c + dc, k = nr + ',' + nc;
                if (isW(nr, nc) || boxes.has(k) || seen.has(k)) continue;
                seen.add(k); q.push({ r: nr, c: nc });
                const v = nr * C + nc; if (v < min) min = v;
              }
            }
            return { min, cells: seen };
          }
          function walk(from, to, boxes) {
            if (from.r === to.r && from.c === to.c) return '';
            const prev = new Map();
            const q = [{ r: from.r, c: from.c }];
            const seen = new Set([from.r + ',' + from.c]);
            const DIRS = [[1, 0, 'D'], [-1, 0, 'U'], [0, 1, 'R'], [0, -1, 'L']];
            let found = false;
            while (q.length && !found) {
              const cur = q.shift();
              for (const [dr, dc, d] of DIRS) {
                const nr = cur.r + dr, nc = cur.c + dc, k = nr + ',' + nc;
                if (isW(nr, nc) || boxes.has(k) || seen.has(k)) continue;
                seen.add(k); prev.set(k, { p: cur.r + ',' + cur.c, d });
                q.push({ r: nr, c: nc });
                if (nr === to.r && nc === to.c) { found = true; break; }
              }
            }
            let path = '', k = to.r + ',' + to.c, guard = 0;
            while (k !== from.r + ',' + from.c && guard++ < 500) {
              const e = prev.get(k);
              if (!e) return null;
              path = e.d + path; k = e.p;
            }
            return path;
          }
          const s0 = region(P.player, P.boxes);
          const seen = new Set([...P.boxes].sort().join('|') + '#' + s0.min);
          const q = [{ boxes: P.boxes, p: P.player, hist: [] }];
          let iter = 0;
          while (q.length && iter++ < 200000) {
            const cur = q.shift();
            if ([...cur.boxes].every(k => P.goals.has(k))) {
              let s = '';
              for (const h of cur.hist) s += h.walk + h.dir;
              return s;
            }
            const reg = region(cur.p, cur.boxes);
            for (const bk of cur.boxes) {
              const parts = bk.split(',');
              const br = +parts[0], bc = +parts[1];
              for (const [dr, dc, d] of [[-1, 0, 'U'], [1, 0, 'D'], [0, -1, 'L'], [0, 1, 'R']]) {
                const pr = br - dr, pc = bc - dc;
                if (!reg.cells.has(pr + ',' + pc)) continue;
                const nr = br + dr, nc = bc + dc;
                if (isW(nr, nc) || cur.boxes.has(nr + ',' + nc)) continue;
                if (deadCorner(nr, nc)) continue;
                const nb = new Set(cur.boxes); nb.delete(bk); nb.add(nr + ',' + nc);
                const nreg = region({ r: br, c: bc }, nb);
                const key = [...nb].sort().join('|') + '#' + nreg.min;
                if (seen.has(key)) continue;
                seen.add(key);
                const w = walk(cur.p, { r: pr, c: pc }, cur.boxes);
                if (w === null) continue;
                q.push({ boxes: nb, p: { r: br, c: bc }, hist: [...cur.hist, { walk: w, dir: d }] });
              }
            }
          }
          return null;
        }
        const path = solveMap(maps[st.li]);
        if (!path) return { fail: st.li };
        for (const ch of path) {
          if (ch === 'U') a.move(-1, 0);
          else if (ch === 'D') a.move(1, 0);
          else if (ch === 'L') a.move(0, -1);
          else if (ch === 'R') a.move(0, 1);
        }
        return { li: st.li, steps: path.length, after: a.state() };
      });
      g.solve.push(r);
      if (r.done || r.fail !== undefined) break;
      await page.waitForTimeout(1400); /* 等过关过场 loadLevel */
    }
    g.overModal = await modalVisible();
    g.hudOver = await hud();
    g.bestAfter = await bestKey('sokoban');
    await closeThenRestart();
    g.hudRestart = await hud();
    out.games.sokoban = g;
  }

  /* ---------------- 空当接龙 FreeCell ---------------- */
  {
    await page.goto(base + '/play.html?g=freecell&cb=' + Date.now(), { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const g = {};
    g.hud0 = await hud();
    /* 撤销：智能移两张 → undo 一步 → 回收数回退 */
    g.undo = await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      a.dealSolvable();
      a.smart({ t: 'c', i: 0, k: 6 }); /* 顶张 ♠A */
      const h1 = a.state().home;
      a.smart({ t: 'c', i: 0, k: 5 }); /* ♠2 */
      const h2 = a.state().home;
      a.undo();
      const h3 = a.state().home;
      return { afterFirst: h1, afterSecond: h2, afterUndo: h3 };
    });
    g.pausedFrozen = await pauseFrozen();
    /* 纯回收堆通关牌局自动打完：只认「回收数增长」为进展 */
    g.solve = await page.evaluate(() => {
      const a = document.querySelector('#stage canvas').__auto;
      a.dealSolvable();
      let iter = 0, progressed = true;
      while (iter++ < 600 && progressed) {
        progressed = false;
        for (let ci = 0; ci < 8 && !progressed; ci++) {
          const col = a.board()[ci];
          if (!col.length) continue;
          const h0 = a.state().home;
          a.smart({ t: 'c', i: ci, k: col.length - 1 });
          if (a.state().home > h0) progressed = true;
        }
      }
      return a.state();
    });
    await page.waitForTimeout(600);
    g.overModal = await modalVisible();
    g.hudOver = await hud();
    g.bestAfter = await bestKey('freecell');
    await closeThenRestart();
    g.hudRestart = await hud();
    g.boardAfterRestart = await page.evaluate(() => document.querySelector('#stage canvas').__auto.state());
    out.games.freecell = g;
  }

  return JSON.stringify(out, null, 1);
}
