# 每日小游戏生产流水线

从 **2026-09-15** 开始，每天开发 **2–3 款**小游戏并推送上线。本文档是执行手册，每天照着走。

---

## 一、每日流程（SOP）

```
09:00  选题   从下方「排期表 / 待选池」取当日 2–3 款，登记到 catalog
09:20  开发   按 engine.js 接口实现：init / update / render / input / reset
11:00  打磨   音效（sfx.js）、手感（帧率、输入延迟、难度曲线）、移动端触屏
12:00  自测   跑一遍「上线验收清单」
12:30  上线   git commit → push → GitHub Pages 自动构建（约 40–60 秒）
12:40  冒烟   线上打开 3 款新游戏各玩 1 分钟，确认无报错
13:00  记录   更新 docs/dev-log/YYYY-MM-DD.md，写下明日选题
```

单款游戏目标工时：**60–90 分钟**（含音效与移动端）。

---

## 二、上线验收清单（每款必过）

- [ ] 在 `assets/js/games/catalog.js` 中登记：id、名称、封面 emoji、标签、简介、最高分 key
- [ ] 键盘 + 触屏都能玩，且触屏有可点控件（方向 / 暂停 / 重开）
- [ ] 有开始、暂停、结算（分数）三个状态，结算分数写入 `Store` 并进入排行榜
- [ ] 接入音效：移动、得分、失败、通关（不得刺耳，可静音）
- [ ] 窗口缩放 / 手机竖屏不崩版，画面自适应
- [ ] 无 console 报错，无内存泄漏（重开多次帧率稳定）
- [ ] 中文 / 英文双语名称与说明齐全（`i18n.js`）
- [ ] 后台「游戏管理」中可见并可上下架
- [ ] 提交信息格式：`game: 新增 XX 游戏`
- [ ] 推送后线上实测通过

---

## 三、14 天排期表（2026-09-15 起）

| 日期 | 游戏 |
|---|---|
| 09-15 | 记忆翻牌 Memory · 井字棋 Tic-Tac-Toe · 打地鼠 Whack-a-Mole |
| 09-16 | 弹球 Pinball · 五子棋 Gomoku · 飞鸟过管 Flappy |
| 09-17 | 泡泡龙 Puzzle Bobble · 宝石消除 Match-3 · 跳一跳 Jump |
| 09-18 | 坦克大战 Tank · 恐龙跑酷 Dino Run · 切水果 Fruit Slice |
| 09-19 | 连连看 Link · 数独 Sudoku · 华容道 Klotski |
| 09-20 | 台球 Pool · 钓鱼 Fishing · 合成大西瓜 Suika |
| 09-21 | 扫雷 Minesweeper · 推箱子 Sokoban · 空当接龙 Solitaire |
| 09-22 | 气球射击 Balloon Shoot · 保龄球 Bowling · 打鸭子 Duck Hunt |
| 09-23 | 赛车躲避 Racer · 直升机 Helicopter · 平衡栈塔 Stack |
| 09-24 | 射箭 Archery · 守塔 Tower Defense（简版） · 像素鸟进阶版 |
| 09-25 | 拼图 Puzzle · 找不同 Spot Diff · 反应力测试 Reflex |
| 09-26 | 掷骰大富翁（简版） · 老虎机（积分制） · 猜数字 Mastermind |
| 09-27 | 乒乓球 Pong · 相扑推挤 Sumo · 滑块拼图 15-Puzzle |
| 09-28 | 打砖块 2（道具版） · 超级玛丽 2（新关卡） · 打飞机 2（Boss 版） |

> 排期是滚动的：数据表现好的品类加做续作，表现差的直接下架或改版。

---

## 四、待选池（后续补充）

消消乐 · 俄罗斯方块 2 · 三消农场 · 泡泡射击 · 拔河 · 剪纸 • 变色龙 · 叠汉堡 · 扔纸团 · 抓娃娃
· 摩天大楼 · 跳棋 · 军棋 · 斗地主（单机 AI） · 麻将连连看 · 猜歌 · 记忆数字 · 打字练习
· 迷宫逃脱 · 旋转忍者 · 弹幕躲避 · 气球塔防 · 抓鬼 · 谁是卧底（本地版） · 你画我猜（本地版）

---

## 五、发布命令（备忘）

```bash
git add -A
git commit -m "game: add XX / YY games"      # 提交信息若含中文在部分终端会报编码错误，可用英文
git push origin main
# 若报 403 "denied to <其他账号>"，说明 git 用了错误凭据，改用 token 直连：
# git push https://<owner>:<token>@github.com/siinaiiovalle-droid/startide-arcade.git main
# 约 40–60 秒后 GitHub Pages 自动部署
curl -s -o /dev/null -w "%{http_code}" https://siinaiiovalle-droid.github.io/startide-arcade/games.html
# 期望输出 200
```

---

## 六、质量红线

1. 不允许「能跑就上线」：卡顿、无音效、无结算的游戏一律打回。
2. 不允许破坏已有 6 款游戏：任何修改后必须回归测试。
3. 不允许跳过线上冒烟：push 完必须线上实测再收工。
4. 每天至少 2 款，最多 3 款，不为凑数牺牲质量。
