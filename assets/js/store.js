/* ==========================================================================
   星潮互动 — 本地数据层（Store）
   纯前端实现：使用 localStorage 模拟服务端数据库。
   官网、游戏、运营后台三者共享同一份数据，后台的修改会实时影响
   游戏难度配置与看板统计。
   ========================================================================== */

(function (global) {
  'use strict';

  var KEY = 'startide_db_v1';
  var SESSION_KEY = 'startide_session_v1';

  /* ---------- 可复现随机数（保证每次生成的数据一致） ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function dayStr(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function round(n, p) {
    var m = Math.pow(10, p || 0);
    return Math.round(n * m) / m;
  }

  /* ---------- 种子数据 ---------- */
  function buildSeed() {
    var rnd = mulberry32(20260914);
    var now = new Date();

    /* --- 近 30 天运营指标 --- */
    var dates = [], dau = [], neu = [], revenue = [], arpu = [], payRate = [];
    var d1 = [], d3 = [], d7 = [], d30 = [];
    for (var i = 29; i >= 0; i--) {
      var d = new Date(now.getTime() - i * 86400000);
      dates.push(dayStr(d));
      var weekendBoost = (d.getDay() === 0 || d.getDay() === 6) ? 1.28 : 1;
      var trend = 1 + (29 - i) * 0.011;
      var base = 42800 * trend * weekendBoost * (0.94 + rnd() * 0.12);
      dau.push(Math.round(base));
      neu.push(Math.round(base * (0.075 + rnd() * 0.025)));
      var rev = base * (0.62 + rnd() * 0.16) * weekendBoost;
      revenue.push(Math.round(rev));
      arpu.push(round(rev / base, 2));
      payRate.push(round(3.4 + rnd() * 1.3, 2));
      d1.push(round(41 + rnd() * 5, 1));
      d3.push(round(26 + rnd() * 4, 1));
      d7.push(round(15.5 + rnd() * 3.4, 1));
      d30.push(round(6.2 + rnd() * 2.1, 1));
    }

    /* --- 产品矩阵 --- */
    var games = [
      {
        id: 'G-1001', name: '星域突围', en: 'Stellar Breakthrough', genre: '科幻 / 弹幕 Roguelite',
        status: '已上线', icon: '🚀', hue: '#38e1ff', platform: ['Web', '微信小游戏', 'H5'],
        online: true, releaseDate: '2024-11-08',
        dau: 26400, mau: 486000, revenueMonth: 3860000, retention7: 17.4, rating: 4.8,
        tags: ['Roguelite', '弹幕射击', '局内成长', '排行榜'],
        desc: '自研引擎驱动的科幻弹幕 Roguelite，每局随机强化组合，单局 3-6 分钟，主打快节奏碎片化体验。'
      },
      {
        id: 'G-1002', name: '幻境三国', en: 'Phantom Kingdoms', genre: '国风 / 卡牌放置',
        status: '已上线', icon: '🐉', hue: '#ffb020', platform: ['Web', 'H5', 'App 包壳'],
        online: true, releaseDate: '2023-06-20',
        dau: 41200, mau: 712000, revenueMonth: 5240000, retention7: 19.2, rating: 4.6,
        tags: ['卡牌', '放置', '国风', '长线养成'],
        desc: '国风美术 + 放置卡牌，离线挂机收益与赛季制阵容博弈，长线 LTV 表现稳定，是公司现金牛产品。'
      },
      {
        id: 'G-1003', name: '糖果工坊', en: 'Candy Factory', genre: '休闲 / 三消',
        status: '已上线', icon: '🍬', hue: '#ff4d9d', platform: ['Web', '微信小游戏'],
        online: true, releaseDate: '2025-02-14',
        dau: 18600, mau: 298000, revenueMonth: 1420000, retention7: 12.8, rating: 4.5,
        tags: ['三消', '女性向', '轻量', '广告变现'],
        desc: '面向泛用户的三消产品，以激励视频为主变现，买量 ROI 1.42，主攻下沉市场与短视频渠道。'
      },
      {
        id: 'G-1004', name: '深空指挥官', en: 'Deep Space Commander', genre: '策略 / SLG',
        status: '内测中', icon: '🛰️', hue: '#7a5cff', platform: ['Web', 'H5'],
        online: false, releaseDate: '2026-10-01',
        dau: 3200, mau: 46000, revenueMonth: 210000, retention7: 22.6, rating: 4.9,
        tags: ['SLG', '联盟', '赛季', '重付费'],
        desc: '在研重点产品，联盟赛季制星际 SLG，瞄准高 ARPU 核心策略用户，内测次留 46.8%。'
      },
      {
        id: 'G-1005', name: '像素农场', en: 'Pixel Harvest', genre: '模拟经营',
        status: '研发中', icon: '🌾', hue: '#2ee6a8', platform: ['Web', '微信小游戏'],
        online: false, releaseDate: '2027-03-15',
        dau: 0, mau: 0, revenueMonth: 0, retention7: 0, rating: 0,
        tags: ['模拟经营', 'UGC', '社交'],
        desc: '轻社交模拟经营，主打好友互访与 UGC 装扮，处于原型验证阶段，已完成核心循环 Demo。'
      },
      {
        id: 'G-1006', name: '极速弯道', en: 'Apex Corner', genre: '竞速 / 休闲竞技',
        status: '已下线', icon: '🏎️', hue: '#8da0c4', platform: ['Web'],
        online: false, releaseDate: '2022-03-11',
        dau: 0, mau: 0, revenueMonth: 0, retention7: 0, rating: 4.2,
        tags: ['竞速', 'PVP', '已停运'],
        desc: '首款自研竞速产品，因引擎性能瓶颈于 2024 年 8 月平稳停运，用户已迁移至《星域突围》。'
      }
    ];

    /* --- 渠道分布 --- */
    var channels = [
      { name: '自然流量 / 口碑', users: 132400, share: 26.8, cac: 0, roi: 0, ltv: 18.6 },
      { name: '微信小游戏中心', users: 118600, share: 24.0, cac: 4.2, roi: 2.31, ltv: 22.4 },
      { name: '抖音 / 短视频买量', users: 96400, share: 19.5, cac: 9.6, roi: 1.42, ltv: 21.8 },
      { name: 'B 站 / KOL 内容投放', users: 58500, share: 11.8, cac: 7.1, roi: 1.86, ltv: 24.2 },
      { name: '渠道联运（4399 / 7k7k）', users: 49200, share: 10.0, cac: 5.4, roi: 1.68, ltv: 16.9 },
      { name: '海外 / Web 站点 SEO', users: 39100, share: 7.9, cac: 1.8, roi: 2.94, ltv: 12.4 }
    ];

    /* --- 玩家账号 --- */
    var nicknames = ['夜航星', '量子布丁', '孤舟蓑笠', 'NeonRider', '三月的风', '钢铁咸鱼', '薄荷汽水',
      'SilentOrbit', '白鹭不眠', '像素老张', '雾都行者', 'KernelPanic', '糖分超标', '半匙月光',
      'AzureFox', '铁皮罐头', '落霞与孤鹜', '深海回声', 'Ctrl_Z', '蒲公英计划', '孤影横斜',
      'Nova_7', '会飞的面条', '凌晨四点半', '纸鹤千只', 'Vector_0', '南风知我意', '数据流',
      '柠檬不酸', '老式收音机', 'Horizon_X', '银河邮差', '守夜人', '雾中灯', 'PixelWitch',
      '断线风筝', '小满未满', 'ZeroPoint', '橘子汽水', '雪落无声', 'Carbon_Copy', '山有木兮'];
    var chanNames = ['微信小游戏中心', '抖音买量', 'B站内容投放', '自然流量', '渠道联运', '海外Web'];
    var vipTiers = ['非付费', '非付费', '非付费', '非付费', '非付费', '月卡', '月卡', '月卡', '通行证', '大R'];

    var users = [];
    for (var u = 0; u < 42; u++) {
      var reg = new Date(now.getTime() - Math.floor(rnd() * 400) * 86400000);
      var last = new Date(now.getTime() - Math.floor(rnd() * 26) * 86400000);
      var vip = vipTiers[Math.floor(rnd() * vipTiers.length)];
      var spendMap = { '非付费': 0, '月卡': 30, '通行证': 128, '大R': Math.round(1800 + rnd() * 12000) };
      var badge = rnd();
      users.push({
        id: 'U' + (100000 + u * 37 + Math.floor(rnd() * 30)),
        nickname: nicknames[u % nicknames.length],
        level: 8 + Math.floor(rnd() * 72),
        vip: vip,
        spend: spendMap[vip],
        status: badge > 0.94 ? '封禁' : (badge > 0.86 ? '沉默' : '正常'),
        channel: chanNames[Math.floor(rnd() * chanNames.length)],
        regDate: dayStr(reg),
        lastActive: dayStr(last),
        device: rnd() > 0.42 ? '移动端' : 'PC Web'
      });
    }
    users.sort(function (a, b) { return a.regDate < b.regDate ? 1 : -1; });

    /* --- 公告 --- */
    var announcements = [
      {
        id: 'A-3001', title: '《星域突围》V2.4「深空回响」版本更新公告', type: '版本更新',
        status: '已发布', priority: '高', channel: '全渠道',
        publishAt: dayStr(new Date(now.getTime() - 2 * 86400000)),
        content: '新增第 5 章「深空回响」共 12 个关卡、新增 3 把武器与 8 种局内强化；平衡性调整：敌方弹速下调 6%，护盾拾取权重提升。维护时间 09-12 04:00-06:00。'
      },
      {
        id: 'A-3002', title: '中秋限定活动「月宴」9 月 20 日开启', type: '活动预告',
        status: '已发布', priority: '高', channel: '全渠道',
        publishAt: dayStr(new Date(now.getTime() - 5 * 86400000)),
        content: '累计登录领限定皮肤「广寒」；活动期间通关任意章节可获月饼道具，用于兑换限定称号与头像框。'
      },
      {
        id: 'A-3003', title: '关于打击第三方代充与账号买卖的说明', type: '规则公告',
        status: '已发布', priority: '中', channel: '官网 / 游戏内',
        publishAt: dayStr(new Date(now.getTime() - 12 * 86400000)),
        content: '平台已上线风控模型 3.0，近 30 天封禁异常账号 1,284 个。请通过官方渠道充值，因第三方代充造成的损失不予补偿。'
      },
      {
        id: 'A-3004', title: '服务器例行维护（9 月 18 日 04:00-07:00）', type: '维护公告',
        status: '待发布', priority: '中', channel: '游戏内',
        publishAt: dayStr(new Date(now.getTime() + 4 * 86400000)),
        content: '为提升稳定性将进行机房扩容维护，维护期间全服不可登录，结束后发放补偿：钻石 x200、体力 x60。'
      },
      {
        id: 'A-3005', title: '《深空指挥官》先锋测试招募中', type: '测试招募',
        status: '草稿', priority: '低', channel: '官网 / B站',
        publishAt: '',
        content: '面向核心 SLG 玩家招募 500 名先锋测试官，参与即可获得正式上线后的专属称号与首充双倍资格。'
      }
    ];

    /* --- 运营活动 --- */
    var activities = [
      { id: 'AC-01', name: '中秋限定「月宴」', game: '幻境三国', type: '节日限定', status: '进行中', start: dayStr(new Date(now.getTime() - 3 * 86400000)), end: dayStr(new Date(now.getTime() + 11 * 86400000)), budget: 180000, participants: 128400, conv: 12.6, roi: 2.14 },
      { id: 'AC-02', name: '开学季新用户 7 日礼', game: '星域突围', type: '拉新召回', status: '进行中', start: dayStr(new Date(now.getTime() - 8 * 86400000)), end: dayStr(new Date(now.getTime() + 6 * 86400000)), budget: 260000, participants: 214600, conv: 9.8, roi: 1.87 },
      { id: 'AC-03', name: '通行证 S6「轨道远征」', game: '星域突围', type: '赛季通行证', status: '进行中', start: dayStr(new Date(now.getTime() - 24 * 86400000)), end: dayStr(new Date(now.getTime() + 36 * 86400000)), budget: 90000, participants: 96400, conv: 21.4, roi: 3.42 },
      { id: 'AC-04', name: '回归玩家「星火计划」', game: '全产品', type: '召回', status: '已结束', start: dayStr(new Date(now.getTime() - 46 * 86400000)), end: dayStr(new Date(now.getTime() - 16 * 86400000)), budget: 150000, participants: 74200, conv: 16.2, roi: 2.36 },
      { id: 'AC-05', name: '国庆预热·组队冲榜', game: '星域突围', type: '排位赛', status: '待开始', start: dayStr(new Date(now.getTime() + 12 * 86400000)), end: dayStr(new Date(now.getTime() + 26 * 86400000)), budget: 320000, participants: 0, conv: 0, roi: 0 },
      { id: 'AC-06', name: '糖果工坊×品牌联名', game: '糖果工坊', type: '品牌联动', status: '规划中', start: '', end: '', budget: 450000, participants: 0, conv: 0, roi: 0 }
    ];

    /* --- 团队 --- */
    var team = [
      { name: '陈砚舟', en: 'Yanzhou Chen', role: '创始人 / CEO', dept: '管理层', avatar: '陈', hue: '#38e1ff', exp: '12 年', bio: '前头部页游发行平台制作人，主导过 3 款月流水过亿的页游产品，负责公司战略与资本。', tags: ['战略', '发行', '资本'] },
      { name: '林清越', en: 'Qingyue Lin', role: '联合创始人 / CTO', dept: '管理层', avatar: '林', hue: '#7a5cff', exp: '10 年', bio: '自研 2D 渲染引擎 StarCore 作者，专注 Web 端高性能渲染与跨端方案，主导技术中台建设。', tags: ['引擎', '架构', '性能'] },
      { name: '苏念', en: 'Nian Su', role: '首席运营官 COO', dept: '管理层', avatar: '苏', hue: '#ff4d9d', exp: '9 年', bio: '搭建过千万级 DAU 产品的运营体系，擅长用户分层、赛季节奏与商业化设计。', tags: ['运营', '增长', '商业化'] },
      { name: '周慕白', en: 'Mubai Zhou', role: '美术总监', dept: '美术中心', avatar: '周', hue: '#ffb020', exp: '11 年', bio: '国风与科幻双风格主美，作品多次获站酷首页推荐，负责美术标准与外包管理。', tags: ['主美', '国风', '科幻'] },
      { name: '何知远', en: 'Zhiyuan He', role: '制作人《幻境三国》', dept: '制作中心', avatar: '何', hue: '#2ee6a8', exp: '8 年', bio: '卡牌品类资深制作人，擅长长线数值与经济系统调优，产品三年流水复合增速 34%。', tags: ['制作人', '数值', '长线'] },
      { name: '郑小满', en: 'Xiaoman Zheng', role: '制作人《星域突围》', dept: '制作中心', avatar: '郑', hue: '#38e1ff', exp: '7 年', bio: 'Roguelite 重度玩家出身，主导单局循环与随机强化设计，追求「三分钟一局、每局不重样」。', tags: ['Roguelite', '关卡', '手感'] },
      { name: '吴岸', en: 'An Wu', role: '数据负责人', dept: '数据中心', avatar: '吴', hue: '#7a5cff', exp: '6 年', bio: '负责埋点体系、用户分层模型与买量 ROI 归因，推动公司决策全面数据化。', tags: ['数据分析', '归因', 'AB测试'] },
      { name: '孙启铭', en: 'Qiming Sun', role: '技术中台负责人', dept: '技术中心', avatar: '孙', hue: '#ff4d9d', exp: '9 年', bio: '负责账号、支付、风控、跨端发布等公共中台能力，支撑多产品并行研发。', tags: ['中台', '支付', '风控'] },
      { name: '许安然', en: 'Anran Xu', role: '用户增长负责人', dept: '发行中心', avatar: '许', hue: '#ffb020', exp: '8 年', bio: '操盘过多个千万级投放预算项目，覆盖短视频、私域与 KOL 内容投放全链路。', tags: ['买量', '增长', '渠道'] },
      { name: '罗一鸣', en: 'Yiming Luo', role: '社区与客服负责人', dept: '运营中心', avatar: '罗', hue: '#2ee6a8', exp: '5 年', bio: '建立玩家社区自治体系与 24 小时工单响应机制，社区活跃度提升 2.3 倍。', tags: ['社区', '客服', '舆情'] },
      { name: '叶未央', en: 'Weiyang Ye', role: '剧情主笔', dept: '制作中心', avatar: '叶', hue: '#38e1ff', exp: '6 年', bio: '负责世界观与叙事内容，构建了覆盖 5 个纪元的产品宇宙设定集。', tags: ['世界观', '叙事'] },
      { name: '黄泽宇', en: 'Zeyu Huang', role: '安全与合规经理', dept: '数据中心', avatar: '黄', hue: '#8da0c4', exp: '7 年', bio: '负责版号合规、内容安全、防沉迷与数据隐私合规，保障业务稳健运营。', tags: ['合规', '风控', '版号'] }
    ];

    /* --- 部门人效 --- */
    var departments = [
      { name: '制作中心', headcount: 34, budget: 4200000, output: '4 款在营产品 + 2 款在研' },
      { name: '技术中心', headcount: 28, budget: 3600000, output: '自研引擎 StarCore 3.0 + 技术中台' },
      { name: '美术中心', headcount: 22, budget: 2400000, output: '年产能 3200+ 美术资产' },
      { name: '发行中心', headcount: 18, budget: 2800000, output: '月均买量预算 480 万' },
      { name: '运营中心', headcount: 24, budget: 1600000, output: '支撑 4 款产品全生命周期运营' },
      { name: '数据中心', headcount: 12, budget: 1200000, output: '埋点体系 + 归因模型 + 风控 3.0' },
      { name: '职能支持', headcount: 15, budget: 1100000, output: '人力 / 财务 / 法务 / 行政' }
    ];

    /* --- 游戏运行时配置（运营后台可改，游戏实时读取） --- */
    var gameConfig = {
      difficulty: 'normal',        // easy | normal | hard
      spawnRate: 1.0,              // 敌人生成倍率 0.5 - 2
      dropRate: 1.0,               // 掉落倍率 0.5 - 2
      baseSpeed: 1.0,              // 基础速度倍率 0.7 - 1.5
      comboEnabled: true,          // 连击加成
      bossEnabled: true,           // 每 5 波出 Boss
      leaderboardEnabled: true,    // 排行榜开关
      bannerText: '中秋限定「月宴」活动进行中 — 登录即领限定皮肤「广寒」',
      bannerEnabled: true,
      maintenance: false,          // 维护模式
      version: 'v2.4.1'
    };

    /* --- 排行榜初始数据 --- */
    var leaderboard = [
      { name: 'Nova_7', score: 386400, wave: 32, date: dayStr(new Date(now.getTime() - 1 * 86400000)) },
      { name: 'KernelPanic', score: 342800, wave: 29, date: dayStr(new Date(now.getTime() - 1 * 86400000)) },
      { name: '夜航星', score: 318500, wave: 27, date: dayStr(new Date(now.getTime() - 2 * 86400000)) },
      { name: 'SilentOrbit', score: 276100, wave: 24, date: dayStr(new Date(now.getTime() - 2 * 86400000)) },
      { name: '量子布丁', score: 244900, wave: 22, date: dayStr(new Date(now.getTime() - 3 * 86400000)) },
      { name: 'AzureFox', score: 218300, wave: 20, date: dayStr(new Date(now.getTime() - 3 * 86400000)) },
      { name: '三月的风', score: 196700, wave: 19, date: dayStr(new Date(now.getTime() - 4 * 86400000)) },
      { name: 'Vector_0', score: 172400, wave: 17, date: dayStr(new Date(now.getTime() - 4 * 86400000)) },
      { name: '薄荷汽水', score: 148900, wave: 15, date: dayStr(new Date(now.getTime() - 5 * 86400000)) },
      { name: 'PixelWitch', score: 121600, wave: 13, date: dayStr(new Date(now.getTime() - 5 * 86400000)) }
    ];

    return {
      meta: { version: 1, createdAt: dayStr(now), updatedAt: new Date().toISOString() },
      company: {
        name: '星潮互动',
        en: 'STARTIDE INTERACTIVE',
        legal: '星潮互动网络科技（深圳）有限公司',
        slogan: '让每一分钟，都值得在线',
        founded: '2021-04',
        headcount: 153,
        office: '深圳市南山区科技园 · 星潮大厦 18F',
        license: '粤 ICP 备 2021XXXXXX 号 · 增值电信业务经营许可证 · 网络文化经营许可证'
      },
      metrics: { dates: dates, dau: dau, newUsers: neu, revenue: revenue, arpu: arpu, payRate: payRate, d1: d1, d3: d3, d7: d7, d30: d30 },
      games: games,
      channels: channels,
      users: users,
      announcements: announcements,
      activities: activities,
      team: team,
      departments: departments,
      gameConfig: gameConfig,
      leaderboard: leaderboard,
      auditLog: [
        { time: new Date(now.getTime() - 3600000).toISOString(), actor: 'system', action: '初始化演示数据库' }
      ],
      playStats: { totalPlays: 1284, bestScore: 386400, totalKills: 96420 }
    };
  }

  /* ---------- 读写 ---------- */
  var cache = null;

  function load() {
    if (cache) return cache;
    try {
      var raw = global.localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.meta && parsed.meta.version === 1) { cache = parsed; return cache; }
      }
    } catch (e) {
      console.warn('[Store] 读取本地数据失败，使用种子数据', e);
    }
    cache = buildSeed();
    save();
    return cache;
  }

  function save() {
    try {
      if (cache) {
        cache.meta.updatedAt = new Date().toISOString();
        global.localStorage.setItem(KEY, JSON.stringify(cache));
      }
    } catch (e) {
      console.warn('[Store] 写入本地数据失败', e);
    }
  }

  function reset() {
    cache = buildSeed();
    save();
    return cache;
  }

  function log(actor, action) {
    var db = load();
    db.auditLog.unshift({ time: new Date().toISOString(), actor: actor || 'admin', action: action });
    if (db.auditLog.length > 120) db.auditLog.length = 120;
    save();
  }

  /* ---------- 聚合查询 ---------- */
  function sum(arr) { return arr.reduce(function (a, b) { return a + b; }, 0); }
  function avg(arr) { return arr.length ? sum(arr) / arr.length : 0; }
  function last(arr, n) { return arr.slice(-n); }

  var Store = {
    KEY: KEY,
    mulberry32: mulberry32,
    dayStr: dayStr,
    round: round,
    sum: sum,
    avg: avg,
    last: last,

    get: function () { return load(); },
    save: save,
    reset: reset,
    log: log,

    /* 核心汇总指标 */
    summary: function () {
      var db = load(), m = db.metrics;
      var dauNow = m.dau[m.dau.length - 1];
      var dauPrev = m.dau[m.dau.length - 2] || dauNow;
      var onlineGames = db.games.filter(function (g) { return g.online; });
      return {
        dau: dauNow,
        dauDelta: dauPrev ? ((dauNow - dauPrev) / dauPrev) * 100 : 0,
        mau: onlineGames.reduce(function (a, g) { return a + g.mau; }, 0),
        revenueMonth: sum(last(m.revenue, 30)),
        revenueToday: m.revenue[m.revenue.length - 1],
        newUsers: m.newUsers[m.newUsers.length - 1],
        newUsersWeek: sum(last(m.newUsers, 7)),
        arpu: avg(last(m.arpu, 7)),
        payRate: avg(last(m.payRate, 7)),
        d7: avg(last(m.d7, 7)),
        onlineGames: onlineGames.length,
        totalGames: db.games.length,
        headcount: db.company.headcount,
        users: db.users.length
      };
    },

    /* 排行榜 */
    getLeaderboard: function () {
      var db = load();
      return db.leaderboard.slice().sort(function (a, b) { return b.score - a.score; });
    },

    submitScore: function (name, score, wave) {
      var db = load();
      db.leaderboard.push({
        name: String(name || '匿名玩家').slice(0, 12),
        score: Math.round(score),
        wave: wave,
        date: dayStr(new Date())
      });
      db.leaderboard.sort(function (a, b) { return b.score - a.score; });
      if (db.leaderboard.length > 50) db.leaderboard.length = 50;
      save();
      return db.leaderboard.indexOf(db.leaderboard.filter(function (r) { return r.score === Math.round(score) && r.wave === wave; })[0]);
    },

    /* 游戏存档 */
    SAVE_KEY: 'startide_save_v1',
    readSave: function () {
      try {
        var raw = global.localStorage.getItem('startide_save_v1');
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    writeSave: function (obj) {
      try { global.localStorage.setItem('startide_save_v1', JSON.stringify(obj)); } catch (e) { }
      return obj;
    },
    clearSave: function () {
      try { global.localStorage.removeItem('startide_save_v1'); } catch (e) { }
    },

    /* 会话（运营后台登录态） */
    getSession: function () {
      try {
        var raw = global.localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    setSession: function (s) {
      try { global.localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch (e) { }
    },
    clearSession: function () {
      try { global.localStorage.removeItem(SESSION_KEY); } catch (e) { }
    }
  };

  global.Store = Store;
})(window);
