# 自动化执行记忆：每日小游戏生产与上线

## 稳定做法（复用）

- 排期表在 `docs/game-pipeline.md`，按当日主题取 2-3 款；日志写入 `docs/dev-log/YYYY-MM-DD.md`。
- 新游戏只需：`assets/js/games/<id>.js` + `catalog.js` 登记；大厅 / 后台 / 排行榜均走 CATALOG 通用渲染。最高分 key 为 `gk_<id>_best`。
- 输入约定：`engine` 已把方向键 / WASD / Space 映射进 `pad`，游戏里 `env.onKey` 只处理 `Enter`，方向用 `pad` 边沿检测，否则一次按键移动两格。**一次性动作（拍翅/发射/落子）必须再补 `onKey` 直触发 + 冷却去重（80-120ms）**，否则自动化/极快按键会在两帧之间丢输入（pad 边沿整帧错过）。
- **必查**：`pad` 边沿用的 `prev` 对象一定要初始化（`var prev = {}`，并在 reset 中重置）。未初始化时每帧抛 TypeError，会被 `engine` 的 try/catch 吞成 `console.error`，表现为「能点击、HUD 会变，但物体不动、永不结算」。
- 验收实测链路：本地 `python -m http.server` + 浏览器自动化。首选 `playwright-cli`（`run-code --filename <js文件>` 最稳，可 `keyboard.down/up` 精确控制按键时长）；`agent-browser`（`open / eval -b <base64> / errors --json / press`，PowerShell 传 JS 必须 base64）可用，但读完大量 console 后守护进程易卡死（连旧端口报 10060），卡死时要么等几分钟，要么换 playwright-cli。**不要**用页面内合成 `KeyboardEvent` 只发 keydown——会让 pad 永久卡 true、后续边沿全部失效。
- **测试坑**：Python http.server 无 Cache-Control，Chromium 会缓存旧 JS；验证修复要换端口（换 origin）重开页面，否则误判未修复。
- 提交用 node 写 UTF-8 提交信息文件再 `git commit -F`（PowerShell 直接 -m 中文会乱码）；`git push origin main` 当前账号可直连（未再出现 403）。
- GitHub Pages：`https://siinaiiovalle-droid.github.io/startide-arcade/`，推送后约 1 分钟生效。

## 执行历史

- 2026-09-14：完成 打飞机 Shooter、超级玛丽 Mario（平台跳跃）两款，提交 `0e50d0f`；修复排行榜串号与音画不同步；日志 `docs/dev-log-2026-09-14.md`。遗留：super-mario 与 mario 重复、dashboard.html 无图表脚本。
- 2026-09-15：完成 记忆翻牌 Memory、井字棋 Tic-Tac-Toe（极小极大 AI）、打地鼠 Whack-a-Mole 三款，提交 `70e2d91` 并推送；线上 200 且浏览器实测 0 报错。顺带修复 4 个既存问题：`layout.js` 调用未导出的 `UI.initNav` 报错、`breakout.js` 误用 `global` 导致游戏完全无法启动、贪吃蛇开局 1.6 秒撞墙（新增待机态）、补齐 i18n `common.replay`。遗留：≤390px 导航 `.nav__cta` 造成约 7px 横向溢出（既存，未修）。明日选题：扫雷 / 数独 / 泡泡龙（3-6 备选）。
- 2026-09-16：按排期完成 霓虹弹珠台 pinball、五子棋 gomoku、飞鸟过管 flappy 三款，提交 `2ddcfb7` 推送 main；线上 200 且三款浏览器实测可玩、0 报错（仅既存 favicon 404）。自查修复 5 个新引入问题：flappy `prev` 未初始化导致主循环每帧抛错（能点但不结算）、pinball `loseBall` 未停机导致每帧丢一球（3 秒丢 3 球）、pinball 发射道导流线段方向反了导致球从不进入主战场（Bumper 恒 0）、gomoku 点击吸附半径过严（触屏点不中，放宽到 STEP*0.85）、`play.html` 会用 `renderHud({score:0})` 覆盖开局 HUD（三款改在 `start()` 补同步）。回归六款旧游戏全部正常。遗留：`favicon.ico` 404、≤390px 横向溢出（均既存）。明日选题：泡泡龙 / 宝石消除 / 跳一跳。
