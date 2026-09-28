// 纯 Node 版 BFS 基准：L2 / L3 求解耗时
const L2 = [
  { id: 'cao', x: 1, y: 0, w: 2, h: 2 },
  { id: 'v1', x: 0, y: 0, w: 1, h: 2 }, { id: 'v2', x: 3, y: 0, w: 1, h: 2 },
  { id: 'v3', x: 0, y: 2, w: 1, h: 2 }, { id: 'v4', x: 3, y: 2, w: 1, h: 2 },
  { id: 'h1', x: 1, y: 2, w: 2, h: 1 },
  { id: 's1', x: 1, y: 3, w: 1, h: 1 }, { id: 's2', x: 2, y: 3, w: 1, h: 1 },
  { id: 's3', x: 0, y: 4, w: 1, h: 1 }, { id: 's4', x: 3, y: 4, w: 1, h: 1 }
];
const L3 = [
  { id: 'cao', x: 1, y: 0, w: 2, h: 2 },
  { id: 'v1', x: 0, y: 0, w: 1, h: 2 }, { id: 'v2', x: 3, y: 1, w: 1, h: 2 },
  { id: 'v3', x: 0, y: 2, w: 1, h: 2 }, { id: 'v4', x: 2, y: 3, w: 1, h: 2 },
  { id: 'h1', x: 1, y: 2, w: 2, h: 1 },
  { id: 's1', x: 1, y: 3, w: 1, h: 1 }, { id: 's2', x: 3, y: 4, w: 1, h: 1 },
  { id: 's3', x: 3, y: 3, w: 1, h: 1 }, { id: 's4', x: 0, y: 4, w: 1, h: 1 }
];
function solve(start) {
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const key = ps => ps.map(p => p.id + p.x + ',' + p.y).sort().join('|');
  const done = ps => { const c = ps.find(p => p.id === 'cao'); return c.x === 1 && c.y === 3; };
  const seen = new Set([key(start)]);
  const queue = [{ ps: start, path: [] }];
  let head = 0, pops = 0;
  const t0 = Date.now();
  while (head < queue.length) {
    const { ps, path } = queue[head++];
    if (done(ps)) return { len: path.length, ms: Date.now() - t0, pops: pops };
    if (++pops > 300000) return { err: 'pop cap', ms: Date.now() - t0 };
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
        const k = key(nps);
        if (seen.has(k)) continue;
        seen.add(k);
        queue.push({ ps: nps, path: [...path, { id: p.id, dx, dy }] });
      }
    }
  }
  return { err: 'unsolvable' };
}
console.log('L2:', JSON.stringify(solve(L2.map(p => ({ ...p })))));
console.log('L3:', JSON.stringify(solve(L3.map(p => ({ ...p })))));
