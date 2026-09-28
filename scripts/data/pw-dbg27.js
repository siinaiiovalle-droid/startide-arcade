async page => {
  await page.goto('http://localhost:8820/play.html?g=sumo&cb=' + Date.now(), { waitUntil: 'load' });
  await page.waitForSelector('#stage canvas', { timeout: 9000 });
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const before = a.state().stam;
    /* 页面内合成 keydown（走 engine 的 window 监听） */
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', key: 'ArrowLeft', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
    return new Promise((res) => setTimeout(() => {
      const mid = a.state().stam;
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft', key: 'ArrowLeft', bubbles: true }));
      res({ before: before, mid: mid, pos: a.state().me });
    }, 300));
  });
  /* 再测手柄 A 按钮 mousedown */
  const r2 = await page.evaluate(() => {
    const a = document.querySelector('#stage canvas').__auto;
    const before = a.state().stam;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }));
    const btn = document.querySelector('.gk-stage .gk-pad__btn[data-k="a"]');
    if (btn) {
      btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      setTimeout(() => btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })), 120);
    }
    return new Promise((res) => setTimeout(() => {
      const after = a.state().stam;
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true }));
      res({ before: before, after: after, btnFound: !!btn, padVisible: !!document.querySelector('.gk-stage.show-pad') });
    }, 300));
  });
  return JSON.stringify({ keyDash: r, padDash: r2 });
}
