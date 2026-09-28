// 从横刀立马随机游走生成一个中等难度可解关卡（带进度与安全上限）
const W = 4, H = 5;
function key(pieces) {
  const g = Array.from({ length: W * H }, () => '.');
  for (const p of pieces) for (let dy = 0; dy < p.h; dy++) for (let dx = 0; dx < p.w; dx++) g[(p.y + dy) * W + (p.x + dx)] = p.id;
  return g.join('');
}
function solved(pieces) { const c = pieces.find(p => p.name === 'cao'); return c.x === 1 && c.y === 3; }
function legal(pieces, i, dx, dy) {
  const p = pieces[i]; const nx = p.x + dx, ny = p.y + dy;
  if (nx < 0 || ny < 0 || nx + p.w > W || ny + p.h > H) return false;
  const g = Array.from(key(pieces));
  for (let yy = 0; yy < p.h; yy++) for (let xx = 0; xx < p.w; xx++) {
    const idx = (ny + yy) * W + (nx + xx);
    if (g[idx] !== '.' && g[idx] !== p.id) return false;
  }
  return true;
}
function solveCount(start, cap) {
  const seen = new Set([key(start)]);
  const queue = [{ ps: start.map(p => ({ ...p })), d: 0 }];
  let head = 0, pops = 0;
  while (head < queue.length) {
    const { ps, d } = queue[head++];
    if (solved(ps)) return d;
    if (++pops > 400000) return -3;
    if (d >= cap) continue;
    const occ = key(ps);
    for (let i = 0; i < ps.length; i++) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const p = ps[i]; const nx = p.x + dx, ny = p.y + dy;
        if (nx < 0 || ny < 0 || nx + p.w > W || ny + p.h > H) continue;
        const g = Array.from(occ); let ok = true;
        for (let yy = 0; yy < p.h && ok; yy++) for (let xx = 0; xx < p.w; xx++) {
          const idx = (ny + yy) * W + (nx + xx);
          if (g[idx] !== '.' && g[idx] !== p.id) { ok = false; break; }
        }
        if (!ok) continue;
        const np = ps.map((q, j) => j === i ? { ...q, x: nx, y: ny } : q);
        const k = key(np);
        if (!seen.has(k)) { seen.add(k); queue.push({ ps: np, d: d + 1 }); }
      }
    }
  }
  return -1;
}
const L2 = [
  { id: 'C', name: 'cao', x: 1, y: 0, w: 2, h: 2 },
  { id: 'a', name: 'v', x: 0, y: 0, w: 1, h: 2 }, { id: 'b', name: 'v', x: 3, y: 0, w: 1, h: 2 },
  { id: 'c', name: 'v', x: 0, y: 2, w: 1, h: 2 }, { id: 'd', name: 'v', x: 3, y: 2, w: 1, h: 2 },
  { id: 'e', name: 'h', x: 1, y: 2, w: 2, h: 1 },
  { id: 's', name: 's', x: 1, y: 3, w: 1, h: 1 }, { id: 't', name: 's', x: 2, y: 3, w: 1, h: 1 },
  { id: 'u', name: 's', x: 0, y: 4, w: 1, h: 1 }, { id: 'v2', name: 's', x: 3, y: 4, w: 1, h: 1 }
];
console.log('L2 check:', solveCount(L2, 90));
function rnd(n) { return Math.floor(Math.random() * n); }
let cur = L2.map(p => ({ ...p }));
for (let step = 0; step < 60; step++) {
  const moves = [];
  for (let i = 0; i < cur.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (legal(cur, i, dx, dy)) moves.push([i, dx, dy]);
  const [i, dx, dy] = moves[rnd(moves.length)];
  cur[i].x += dx; cur[i].y += dy;
}
const m0 = solveCount(cur, 90);
let best = { m: m0, cur: cur };
for (let att = 0; att < 80 && !(best.m >= 30 && best.m <= 80); att++) {
  let c2 = L2.map(p => ({ ...p }));
  const steps = 150 + Math.floor(Math.random() * 150);
  for (let step = 0; step < steps; step++) {
    const moves = [];
    for (let i = 0; i < c2.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (legal(c2, i, dx, dy)) moves.push([i, dx, dy]);
    if (!moves.length) break;
    const [i, dx, dy] = moves[rnd(moves.length)];
    c2[i].x += dx; c2[i].y += dy;
  }
  const m = solveCount(c2, 90);
  if (m > best.m) best = { m: m, cur: c2 };
}
console.log('best minMoves=', best.m);
console.log(JSON.stringify(best.cur.map(p => ({ id: p.id, name: p.name, x: p.x, y: p.y, w: p.w, h: p.h }))));
