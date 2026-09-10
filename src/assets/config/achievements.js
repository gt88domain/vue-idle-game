/**
 * 成就 & 称号（新增玩法）
 *
 * 成就不再只是「数字」：每条成就解锁一个称号，称号是全局被动，同时只能佩戴一个。
 * 这让「刷」这件事有了方向感：想要某个称号，就得按它要求的方式去玩。
 *
 * @author arena agent（基于 couy 的 vue-idle-game, MIT）
 */

export const TITLES = {
  rookie: {
    id: 'rookie',
    name: '新手勇者',
    des: '万事开头难。',
    mods: {
      GOLDGAIN: 5
    }
  },
  hunter: {
    id: 'hunter',
    name: '副本猎人',
    des: '地图上的每一个光点都被你踏平过。',
    mods: {
      ATKPERCENT: 5,
      GOLDGAIN: 5
    }
  },
  slayer: {
    id: 'slayer',
    name: '屠夫',
    des: '你杀的东西比种的地还多。',
    mods: {
      ATKPERCENT: 8
    }
  },
  dragon: {
    id: 'dragon',
    name: '屠龙者',
    des: '首领在你面前和杂兵没有区别。',
    mods: {
      CRIT: 5,
      CRITDMG: 15
    }
  },
  tank: {
    id: 'tank',
    name: '不倒之壁',
    des: '活下来，才有输出。',
    mods: {
      HPPERCENT: 10,
      DEFPERCENT: 15
    }
  },
  collector: {
    id: 'collector',
    name: '收藏家',
    des: '独特装备就该像收藏品一样摆满背包。',
    mods: {
      LUCK: 25,
      GOLDGAIN: 10
    }
  },
  smith: {
    id: 'smith',
    name: '锻造大师',
    des: '+13 只是起点。',
    mods: {
      ENCHANT: 8,
      ATKPERCENT: 4
    }
  },
  abyssal: {
    id: 'abyssal',
    name: '深渊行者',
    des: '深渊也记住了你的味道。',
    mods: {
      THORNS: 10,
      LIFESTEAL: 6,
      REGEN: 50
    }
  },
  endless: {
    id: 'endless',
    name: '无尽之敌',
    des: '数字已经没有意义了。',
    mods: {
      ATKPERCENT: 12,
      CRIT: 5
    }
  },
  tycoon: {
    id: 'tycoon',
    name: '富可敌国',
    des: '钱就是万能的。',
    mods: {
      GOLDGAIN: 40,
      LUCK: 10
    }
  },
  scholar: {
    id: 'scholar',
    name: '轮回贤者',
    des: '每一次重来都让你更强。',
    mods: {
      ATKPERCENT: 6,
      HPPERCENT: 6,
      DEFPERCENT: 6,
      REGEN: 60
    }
  },
  muster: {
    id: 'muster',
    name: '点将台',
    des: '一个人走得快，一支队伍走得远。',
    mods: {
      ATKPERCENT: 4,
      REGEN: 4
    }
  },
  vanguard: {
    id: 'vanguard',
    name: '三英战戟',
    des: '三人同阵，气势压人。',
    mods: {
      ATKPERCENT: 6,
      LUCK: 5
    }
  },
  loyal: {
    id: 'loyal',
    name: '全勤勇者',
    des: '每天都来的人，运气不会太差。',
    mods: {
      LUCK: 6,
      GOLDGAIN: 8,
      OFFLINE_CAP: 2
    }
  },
  grandmaster: {
    id: 'grandmaster',
    name: '一代宗师',
    des: '套装齐身，登峰造极。',
    mods: {
      ATKPERCENT: 10,
      CRITDMG: 30,
      DR: 6,
      GOLDGAIN: 25
    }
  }
}

/**
 * require: 传入统计快照与状态，返回进度数值（done 表示达成的判定阈值）
 */
export const ACHIEVEMENTS = [{
    id: 'firstBlood',
    name: '第一滴血',
    des: '首次击杀副本首领',
    icon: './icons/map/boss.png',
    goal: 1,
    metric: s => s.stats.bossKills,
    title: null
  },
  {
    id: 'rookie',
    name: '初出茅庐',
    des: '首次通关任意副本',
    icon: './icons/map/chest.png',
    goal: 1,
    metric: s => s.stats.dungeons,
    title: 'rookie'
  },
  {
    id: 'hunter',
    name: '清图强迫症',
    des: '累计通关 50 次副本',
    icon: './icons/map/chest.png',
    goal: 50,
    metric: s => s.stats.dungeons,
    title: 'hunter'
  },
  {
    id: 'slayer',
    name: '万人斩',
    des: '累计击杀 1000 只怪物',
    icon: './icons/map/monster.png',
    goal: 1000,
    metric: s => s.stats.kills,
    title: 'slayer'
  },
  {
    id: 'dragon',
    name: '首领克星',
    des: '累计击杀 100 只首领',
    icon: './icons/map/boss.png',
    goal: 100,
    metric: s => s.stats.bossKills,
    title: 'dragon'
  },
  {
    id: 'tank',
    name: '铁壁',
    des: '防御力带来的减伤达到 60%',
    icon: './icons/icon_11.png',
    goal: 60,
    metric: s => Math.round((1 - s.attribute.REDUCDMG) * 100),
    title: 'tank',
    format: v => v + '%'
  },
  {
    id: 'collector',
    name: '独特收藏家',
    des: '累计获得 10 件独特装备',
    icon: './icons/U_Sword02.png',
    goal: 10,
    metric: s => s.stats.uniqueDrops,
    title: 'collector'
  },
  {
    id: 'smith',
    name: '强化 +13',
    des: '任意装备强化到 +13',
    icon: './icons/menu/NEW.png',
    goal: 13,
    metric: s => s.stats.maxEnchant,
    title: 'smith'
  },
  {
    id: 'recaster',
    name: '词条赌徒',
    des: '累计重铸词条 100 次',
    icon: './icons/menu/refresh_de.png',
    goal: 100,
    metric: s => s.stats.recasts,
    title: null
  },
  {
    id: 'endless',
    name: '无尽之下',
    des: '无尽挑战达到 30 层',
    icon: './icons/endless.png',
    goal: 30,
    metric: s => s.playerAttribute.endlessLv,
    title: 'endless'
  },
  {
    id: 'abyssal',
    name: '深渊来客',
    des: '深渊回廊单局达到 10 层',
    icon: './icons/menu/d2.png',
    goal: 10,
    metric: s => s.abyss.bestFloor,
    title: 'abyssal'
  },
  {
    id: 'abyssLord',
    name: '深渊征服者',
    des: '深渊回廊单局达到 25 层',
    icon: './icons/menu/d3.png',
    goal: 25,
    metric: s => s.abyss.bestFloor,
    title: null
  },
  {
    id: 'tycoon',
    name: '富可敌国',
    des: '累计获得 1,000,000 金币',
    icon: './icons/menu/icon_80.png',
    goal: 1000000,
    metric: s => s.stats.goldEarned,
    title: 'tycoon',
    format: v => v >= 10000 ? (v / 10000).toFixed(1) + '万' : v
  },
  {
    id: 'scholar',
    name: '轮回贤者',
    des: '转生 3 次',
    icon: './icons/menu/quest_icon_00.png',
    goal: 3,
    metric: s => s.reincarnation.count,
    title: 'scholar'
  },
  {
    id: 'grandmaster',
    name: '套装大师',
    des: '同时激活一套 4 件套效果',
    icon: './icons/U_Armor07.png',
    goal: 4,
    metric: s => Math.max(0, ...s.setDetail.map(v => v.num)),
    title: 'grandmaster'
  },
  {
    id: 'recruit',
    name: '英雄集结',
    des: '图鉴中收录 3 位英雄',
    icon: './icons/menu/icon_85.png',
    goal: 3,
    metric: s => Object.keys(s.heroes.owned || {}).length,
    title: 'muster'
  },
  {
    id: 'banner',
    name: '十连祈愿',
    des: '累计召唤 20 次',
    icon: './icons/menu/quest_icon_02.png',
    goal: 20,
    metric: s => s.stats.summons,
    title: null
  },
  {
    id: 'vanguard',
    name: '三英战戟',
    des: '同时上阵 3 位英雄',
    icon: './icons/menu/d3.png',
    goal: 3,
    metric: s => (s.heroes.party || []).length,
    title: 'vanguard'
  },
  {
    id: 'starcaller',
    name: '唤星者',
    des: '任意英雄升到 4 星',
    icon: './icons/menu/quest_icon_03.png',
    goal: 4,
    metric: s => Math.max(0, ...Object.keys(s.heroes.owned || {}).map(k => s.heroes.owned[k].star || 0)),
    title: null
  },
  {
    id: 'firstChapter',
    name: '第一章',
    des: '通关任意 5 个章节关卡',
    icon: './icons/menu/d1.png',
    goal: 5,
    metric: s => s.campaign.clears,
    title: 'vanguard'
  },
  {
    id: 'starCollector',
    name: '追星者',
    des: '章节累计获得 30 颗星',
    icon: './icons/menu/d2.png',
    goal: 30,
    metric: s => Object.keys(s.campaign.stars || {}).reduce((a, k) => a + (s.campaign.stars[k] || 0), 0),
    title: 'muster'
  },
  {
    id: 'sweepKing',
    name: '扫荡机器',
    des: '累计扫荡 50 次',
    icon: './icons/menu/refresh_de.png',
    goal: 50,
    metric: s => s.stats.sweeps,
    title: null
  },
  {
    id: 'punctual',
    name: '风雨无阻',
    des: '连续签到 7 天',
    icon: './icons/menu/icon_save.png',
    goal: 7,
    metric: s => s.daily.signStreak,
    title: 'loyal'
  },
  {
    id: 'survivor',
    name: '不屈',
    des: '死亡 20 次仍然没有放弃',
    icon: './icons/menu/clear.png',
    goal: 20,
    metric: s => s.stats.deaths,
    title: null
  }
]

/** 达成成就时可获得的回响奖励 */
export const ACHIEVEMENT_ECHO = 15
