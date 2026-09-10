/**
 * 每日任务 + 签到（新增玩法）
 *
 * 挂机游戏最怕的是"没有理由上线"。这里补上每日循环，并且刻意让它**吃现有统计**：
 * 任务进度全部读 store.stats（击杀/金币/强化/深渊/召唤…），所以不需要为每个玩法再埋点，
 * 也不存在"任务系统偷偷改数值"的风险 —— 零值恒等这条底线对这里同样成立。
 *
 * 任务列表按日期用固定种子挑选，同一天刷新页面不会重刷任务（防止刷新卡随机），
 * 进度按"当日增量"计算（接上当天已经打过的一段不会重复计数，也不会在第二天累计）。
 *
 * @author arena agent
 */

// 奖励里的 gold 字段是「金币系数」，实际金币 = 系数 × 玩家等级 × 30（与原版卖装公式同量纲）
export const QUEST_POOL = [{
    id: 'd_hunt', need: 1,
   
    name: '猎杀时刻',
    des: '今日击杀 {goal} 个敌人',
    icon: './icons/map/monster.png',
    key: 'kills',
    goal: 15,
    reward: {
      gold: 22
    }
  },
  {
    id: 'd_boss', need: 1,
   
    name: '首领讨伐',
    des: '今日击杀 {goal} 个首领',
    icon: './icons/map/boss.png',
    key: 'bossKills',
    goal: 2,
    reward: {
      gold: 28,
      echoes: 8
    }
  },
  {
    id: 'd_run', need: 1,
   
    name: '地图巡逻',
    des: '今日通关 {goal} 次副本',
    icon: './icons/map/chest.png',
    key: 'dungeons',
    goal: 6,
    reward: {
      gold: 20
    }
  },
  {
    id: 'd_rich', need: 1,
   
    name: '财富积累',
    des: '今日入账 {goal} 金币',
    icon: './icons/menu/icon_80.png',
    key: 'goldEarned',
    goal: 60000,
    reward: {
      echoes: 10
    }
  },
  {
    id: 'd_forge', need: 1,
   
    name: '强化手感',
    des: '今日强化成功 {goal} 次',
    icon: './icons/menu/NEW.png',
    key: 'enchantOk',
    goal: 8,
    reward: {
      gold: 24,
      shards: 3
    }
  },
  {
    id: 'd_recast', need: 3,
   
    name: '重铸工匠',
    des: '今日重铸 {goal} 次',
    icon: './icons/menu/refresh_de.png',
    key: 'recasts',
    goal: 5,
    reward: {
      gold: 20,
      shards: 3
    }
  },
  {
    id: 'd_abyss', need: 20,
   
    name: '深渊来客',
    des: '今日在深渊通过 {goal} 层',
    icon: './icons/menu/d3.png',
    key: 'abyssFloors',
    goal: 8,
    reward: {
      echoes: 14
    }
  },
  {
    id: 'd_gacha', need: 1,
   
    name: '祈愿之夜',
    des: '今日召唤 {goal} 次',
    icon: './icons/menu/icon_85.png',
    key: 'summons',
    goal: 5,
    reward: {
      shards: 6,
      gold: 12
    }
  },
  {
    id: 'd_hero', need: 5,
   
    name: '英雄养成',
    des: '今日给英雄升级 {goal} 次',
    icon: './icons/menu/icon_save.png',
    key: 'heroLevels',
    goal: 10,
    reward: {
      gold: 26,
      echoes: 6
    }
  },
  {
    id: 'd_chapter', need: 1,
   
    name: '章节推进',
    des: '今日通过 {goal} 个章节关卡',
    icon: './icons/menu/d1.png',
    key: 'campaignClears',
    goal: 3,
    reward: {
      gold: 26,
      tickets: 1
    }
  },
  {
    id: 'd_sweep', need: 12,
   
    name: '扫荡大师',
    des: '今日扫荡 {goal} 次',
    icon: './icons/menu/d2.png',
    key: 'sweeps',
    goal: 10,
    reward: {
      gold: 22,
      echoes: 6
    }
  },
  {
    id: 'd_unique', need: 5,
   
    name: '独特收藏',
    des: '今日捡到 {goal} 件独特装备',
    icon: './icons/U_Sword02.png',
    key: 'uniqueDrops',
    goal: 1,
    reward: {
      gold: 30,
      shards: 5
    }
  },
  {
    id: 'd_offline', need: 2,
   
    name: '离线也干活',
    des: '今日领取 {goal} 次离线收益',
    icon: './icons/menu/extras.png',
    key: 'offlineCount',
    goal: 1,
    reward: {
      gold: 16
    }
  },
  {
    id: 'd_set', need: 1,
   
    name: '套装部件',
    des: '今日获得 {goal} 件套装装备',
    icon: './icons/U_Armor07.png',
    key: 'setDrops',
    goal: 1,
    reward: {
      echoes: 10,
      gold: 10
    }
  }
]

export const QUEST_PER_DAY = 4

/** 本地日期键 YYYY-MM-DD */
export function dayKey(ts = Date.now()) {
  const d = new Date(ts)
  const p = n => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

const dayNum = key => Number(String(key).replace(/-/g, '')) || 1

function lcg(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/**
 * 按日期确定性地抽今日任务（同一天恒定，不会靠刷新重roll）
 * @param {String} key 日期键
 * @param {Number} playerLv 用于给目标数做温和缩放
 */
export function rollQuests(key, playerLv = 1) {
  const rnd = lcg(dayNum(key))
  const lv = Math.max(1, Number(playerLv) || 1)
  // 只抽「这个等级做得动」的任务：扫荡要先有 3★ 章节、深渊高层也要有底子，
  // 否则新号会拿到永远做不完的任务，红点就纯属骗人
  let pool = QUEST_POOL.filter(q => (q.need || 1) <= lv)
  if (pool.length < QUEST_PER_DAY) {
    const extra = QUEST_POOL.filter(q => pool.indexOf(q) < 0).slice(0, QUEST_PER_DAY - pool.length)
    pool = pool.concat(extra)
  }
  pool = pool.slice()
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const t = pool[i]
    pool[i] = pool[j]
    pool[j] = t
  }
  // 高等级玩家的目标适度放大（避免 5 秒做完）
  const k = 1 + Math.max(0, Math.min(3, Math.floor(playerLv / 35)))
  return pool.slice(0, QUEST_PER_DAY).map(q => ({
    id: q.id,
    key: q.key,
    base: 0,
    goal: q.key === 'goldEarned' ? q.goal * k : (q.goal > 4 ? Math.round(q.goal * (1 + 0.25 * (k - 1))) : q.goal),
    claimed: false
  }))
}

export const questById = id => QUEST_POOL.find(q => q.id === id) || null

/** 大数字用「万」，避免任务描述里出现 240000 这种看不清的长串 */
export function fmtGoal(v) {
  v = Math.floor(Number(v) || 0)
  if (v >= 1e8) {
    return (Math.floor(v / 1e8 * 10) / 10) + '亿'
  }
  if (v >= 1e4) {
    const w = v / 1e4
    return (w >= 10 ? Math.floor(w) : Math.round(w * 10) / 10) + '万'
  }
  return '' + v
}

/** 任务文案：把实际目标（会随等级放大）填回描述里 */
export function questText(q, goal) {
  const des = (q && q.des) || ''
  const g = goal === undefined || goal === null ? (q && q.goal) : goal
  return des.replace('{goal}', fmtGoal(g))
}

/** 进度（当日增量） */
export function questProgress(q, stats) {
  const cur = Number((stats || {})[q.key] || 0)
  return Math.max(0, cur - Number(q.base || 0))
}

export function questDone(q, stats) {
  return questProgress(q, stats) >= q.goal
}

/** 任务奖励折算（gold 用玩家等级缩放，与其它系统同量纲） */
export function questReward(item, playerLv = 1) {
  const q = questById(item.id)
  const r = (q && q.reward) || {}
  return {
    gold: r.gold ? Math.floor(r.gold * Math.max(1, playerLv) * 30) : 0,
    echoes: r.echoes || 0,
    shards: r.shards || 0,
    tickets: r.tickets || 0
  }
}

// ---------- 签到 ----------
export const SIGN_REWARDS = [{
    name: '出发资金',
    gold: 120
  },
  {
    name: '回响结晶',
    echoes: 12
  },
  {
    name: '英雄碎片',
    shards: 6
  },
  {
    name: '招募令',
    tickets: 1,
    gold: 60
  },
  {
    name: '远征补给',
    gold: 260
  },
  {
    name: '深渊回响',
    echoes: 24
  },
  {
    name: '七日厚礼',
    tickets: 2,
    shards: 12,
    echoes: 20,
    gold: 320
  }
]

export const signRewardOf = index => SIGN_REWARDS[((index % SIGN_REWARDS.length) + SIGN_REWARDS.length) % SIGN_REWARDS.length]

export function signRewardValue(index, playerLv = 1) {
  const r = signRewardOf(index)
  return {
    gold: r.gold ? Math.floor(r.gold * Math.max(1, playerLv) * 30) : 0,
    echoes: r.echoes || 0,
    shards: r.shards || 0,
    tickets: r.tickets || 0
  }
}

/** 今天能不能签到（同一天只能签 1 次） */
export function canSign(daily, nowTs = Date.now()) {
  return (daily || {}).signDate !== dayKey(nowTs)
}

/**
 * 两个日期键相差几天（用于判断连签是否续上）
 */
export function dayGap(a, b) {
  const toMs = k => {
    const p = String(k).split('-').map(Number)
    return new Date(p[0], (p[1] || 1) - 1, p[2] || 1).getTime()
  }
  return Math.round((toMs(b) - toMs(a)) / 86400000)
}

export const DAILY_TIPS = [
  '任务进度按「当日增量」计算，今天已经打过的一段不会被重复计入。',
  '任务列表按日期固定，刷页面不会重roll。',
  '连续签到第 7 天给招募令 ×2 —— 比单抽划算得多。'
]

export default {
  QUEST_POOL,
  rollQuests,
  questProgress,
  questDone,
  questReward,
  SIGN_REWARDS,
  signRewardOf,
  signRewardValue,
  canSign,
  dayKey,
  dayGap,
  signPlan
}

/**
 * 签到计划：连签则往后走一格，断签回到第 1 天
 * @param {Object} daily store 里的 daily 状态
 */
export function signPlan(daily, nowTs = Date.now()) {
  const key = dayKey(nowTs)
  const d = daily || {}
  const idx = Number(d.signIndex)
  if (d.signDate === key) {
    return {
      can: false,
      index: isNaN(idx) ? 0 : idx,
      streak: Number(d.signStreak || 0)
    }
  }
  if (!d.signDate || isNaN(idx) || dayGap(d.signDate, key) !== 1) {
    return {
      can: true,
      index: 0,
      streak: 1
    }
  }
  return {
    can: true,
    index: (idx + 1) % SIGN_REWARDS.length,
    streak: Number(d.signStreak || 0) + 1
  }
}
