# 自动化执行记忆：每日小游戏生产与上线

## 稳定做法（复用）

- 排期表在 `docs/game-pipeline.md`，按当日主题取 2-3 款；日志写入 `docs/dev-log/YYYY-MM-DD.md`。
- 新游戏只需：`assets/js/games/<id>.js` + `catalog.js` 登记；大厅 / 后台 / 排行榜均走 CATALOG 通用渲染。最高分 key 为 `gk_<id>_best`。
- 输入约定：`engine` 已把方向键 / WASD / Space 映射进 `pad`，游戏里 `env.onKey` 只处理 `Enter`，方向用 `pad` 边沿检测，否则一次按键移动两格。**一次性动作（拍翅/发射/落子）必须再补 `onKey` 直触发 + 冷却去重（80-120ms）**，否则自动化/极快按键会在两帧之间丢输入（pad 边沿整帧错过）。
- **必查**：`pad` 边沿用的 `prev` 对象一定要初始化（`var prev = {}`，并在 reset 中重置）。未初始化时每帧抛 TypeError，会被 `engine` 的 try/catch 吞成 `console.error`，表现为「能点击、HUD 会变，但物体不动、永不结算」。
- 验收实测链路：本地 `python -m http.server` + 浏览器自动化。首选 `playwright-cli`（`run-code --filename <js文件>` 最稳，可 `keyboard.down/up` 精确控制按键时长）；`agent-browser`（`open / eval -b <base64> / errors --json / press`，PowerShell 传 JS 必须 base64）可用，但读完大量 console 后守护进程易卡死（连旧端口报 10060），卡死时要么等几分钟，要么换 playwright-cli。**不要**用页面内合成 `KeyboardEvent` 只发 keydown——会让 pad 永久卡 true、后续边沿全部失效。
- **测试坑**：Python http.server 无 Cache-Control，Chromium 会缓存旧 JS；验证修复要换端口（换 origin）重开页面，否则误判未修复。
- **测试坑 2**：同一浏览器会话会缓存静态资源，给 HTML 加 `?cb=<ts>` 只能击穿 HTML、击穿不了 `.js` 子资源。改完游戏脚本后复测必须 `playwright-cli close` 再 `open` 重开会话，否则一直看到旧逻辑。
- **测试坑 3**：不要用 `page.mouse.click(pageX, pageY)` 手算坐标（画布不在视口内会报 `Invalid parameters`）。统一用 `locator('#stage canvas').click({ position: {...} })`，Playwright 会自动滚动与裁剪。
- **测试坑 4**：结算弹窗 `.modal` 会遮住 `#btnRestart` 导致点击超时。先关弹窗（点 `.modal__foot .btn--primary`），且按钮点击统一改 `page.evaluate(() => el.click())` 绕开遮挡。
- **测试坑 5**：验证游戏真伪不要只看画面在动。判冻结用 `canvas.toDataURL()` 前后帧比对；判玩法闭环要真的操作到得分/结算弹窗出现。
- **选择器口径**：大厅游戏卡片是 `.acard`；`.card` 是首页 `features` 区的介绍卡（只有 3 张）。统计游戏数量必须用 `.acard`，否则数字虚大（今日 15 款）。
- **线上冒烟**：本机 `curl` / `Invoke-WebRequest` 出不去（代理 `127.0.0.1:7897` 命令行侧 TLS 握手 EOF，返回 000）。命令行不通时改用 `playwright-cli` 直接 `goto` 线上地址做冒烟，浏览器走系统代理可正常访问。
- **新游戏必须追加到 `catalog.js` 的 `LIST` 末尾**：`seq`（声明序号）即上架先后，大厅默认排序为「新品置顶（组内最新优先）+ 其余按 `plays` 降序」；插到中间会让 seq 失真。`CATALOG.sorted` 三口径：`all` 默认、`new` 最新优先、`hot` 纯游玩量（首页「现在最受欢迎」走 hot）。应读 `Store.get().gameConfig.difficulty`（easy/normal/hard）并在 HUD 明示难度；每个对用户可见的 HTML 页面都要有 `<link rel="icon">`（缺了每次加载刷一条 favicon 404），纯 `location.replace` 跳转页如 `game.html` 例外。
- 提交用 node 写 UTF-8 提交信息文件再 `git commit -F`（PowerShell 直接 -m 中文会乱码）；`git push origin main` 当前账号可直连（未再出现 403）。
- GitHub Pages：`https://siinaiiovalle-droid.github.io/startide-arcade/`，推送后约 1 分钟生效。

## 执行历史

- 2026-09-14：完成 打飞机 Shooter、超级玛丽 Mario（平台跳跃）两款，提交 `0e50d0f`；修复排行榜串号与音画不同步；日志 `docs/dev-log-2026-09-14.md`。遗留：super-mario 与 mario 重复、dashboard.html 无图表脚本。
- 2026-09-15：完成 记忆翻牌 Memory、井字棋 Tic-Tac-Toe（极小极大 AI）、打地鼠 Whack-a-Mole 三款，提交 `70e2d91` 并推送；线上 200 且浏览器实测 0 报错。顺带修复 4 个既存问题：`layout.js` 调用未导出的 `UI.initNav` 报错、`breakout.js` 误用 `global` 导致游戏完全无法启动、贪吃蛇开局 1.6 秒撞墙（新增待机态）、补齐 i18n `common.replay`。遗留：≤390px 导航 `.nav__cta` 造成约 7px 横向溢出（既存，未修）。明日选题：扫雷 / 数独 / 泡泡龙（3-6 备选）。
- 2026-09-16：按排期完成 霓虹弹珠台 pinball、五子棋 gomoku、飞鸟过管 flappy 三款，提交 `2ddcfb7` 推送 main；线上 200 且三款浏览器实测可玩、0 报错（仅既存 favicon 404）。自查修复 5 个新引入问题：flappy `prev` 未初始化导致主循环每帧抛错（能点但不结算）、pinball `loseBall` 未停机导致每帧丢一球（3 秒丢 3 球）、pinball 发射道导流线段方向反了导致球从不进入主战场（Bumper 恒 0）、gomoku 点击吸附半径过严（触屏点不中，放宽到 STEP*0.85）、`play.html` 会用 `renderHud({score:0})` 覆盖开局 HUD（三款改在 `start()` 补同步）。回归六款旧游戏全部正常。遗留：`favicon.ico` 404、≤390px 横向溢出（均既存）。明日选题：泡泡龙 / 宝石消除 / 跳一跳。
- 2026-09-17：按排期完成 泡泡龙 bubble、宝石消除 gem、跳一跳 jump 三款，提交 `58fff2e` 推送 main；线上 15 张 `.acard`、三款页面 0 报错。玩法规约：bubble 六边形阵 + 洪水填充同色清除 + 悬空脱落，gem 点击/方向键/拖拽三种交换方式 + 连锁 combo，jump 蓄力跳 + 中心完美连击。三款均接入 `Store.gameConfig.difficulty` 并在 HUD 明示。自查修复：五个页面缺 favicon 声明导致每次加载 404（已补，`game.html` 跳转页例外）；gem 重开后 HUD 不显示难度（显式 extra 覆盖了默认值）。六款旧游戏 + 大厅回归全部 0 报错。遗留：dashboard.html 表格横向滚动（处于自身 `overflow-x:auto` 容器内，属预期，不修）。明日选题：坦克大战 tank / 恐龙跑酷 dino / 切水果 fruit。
- 2026-09-18：按排期完成 坦克大战 tank、恐龙跑酷 dino、切水果 fruit 三款，提交 `8ad8aca` 推送 main；线上大厅 18 张 `.acard`、三款页面 200 且 0 报错。玩法规约：tank 网格砖墙+钢墙挡弹、逐波清敌；dino 无限跑酷（速度 320→700，跳仙人掌/蹲翼龙，距离积分）；fruit 抛起水果挥刀切割 + combo 加分，炸弹即死、漏 3 个出局。三款均接入 difficulty 并在 HUD 明示。自查修复：fruit 初速过低导致水果只在屏幕底部 220px 内活动（切成不了也影响手感），调 `vy∈[-1240,-1080]`、重力 1180、半径 30-42 后覆盖整屏。回归：18 款全量冒烟 0 报错，六款旧游按住方向键复测均响应。遗留：无。明日选题：连连看 Link / 数独 Sudoku / 华容道 Klotski（时间紧则优先连连看 + 数独）。
- **测试坑 6**：`page.keyboard.press()` 是瞬发（down/up 几乎同帧），持续型输入（贪吃蛇转向、2048 滑动）会被整帧漏采，误判成"游戏冻结"。验证这类游戏必须用 `keyboard.down(key)` → 等 700ms → `keyboard.up(key)`。
- **测试坑 7**：等待结算弹窗期间不要在画布上继续操作，鼠标按到弹窗遮罩会把弹窗关掉，导致 `gameOverModal` 误报 false。循环条件里加 `!(await modalUp())`，弹窗一出立刻停手。
- **测试坑 8**：跑酷类分数随距离自动增长，"重开后分数归零"天然不成立，判定要改成"回到低位（如 < 40）"。抛射类游戏同理要先算好初速/重力，保证目标活动区覆盖整屏，否则测试划不到（也是真实手感问题）。
- **测试坑 9**：本地静态服务进程可能被系统清理，测试中途出现 `ERR_CONNECTION_REFUSED` 先重启 `python -m http.server` 再判断，不要当成代码问题。
