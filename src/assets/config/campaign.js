/**
 * 章节关卡（新增玩法）
 *
 * 设计目标：把"地图上一堆随机副本"变成手游那种「一章一章推关、拿星、扫荡」的主线。
 * 三条硬约束：
 *  1) 数值不另起炉灶 —— 怪物血量/攻击/金币全部沿用原版 handle.createRandomDungeons 的曲线，
 *     只是把随机系数取中位数变成**确定性**关卡（这样才能用"剩余血量"评价星级，而不是比谁运气好）；
 *  2) 不碰装备生成 —— 掉落复用四个部位面板的 createNewItem（与原版同一函数），
 *     所以装备数值仍然受 `npm run fidelity` 的第 [1] 项约束；
 *  3) 零值恒等 —— 玩家不打章节，就不会消耗体力、也不会产生任何属性/金币变化。
 *
 * @author arena agent
 */

// 每章 5 关：前哨 / 巡逻 / 精英 / 魔潮 / 首领
export const STAGE_NAMES = ['前哨', '巡逻', '精英', '魔潮', '首领']
export const STAGE_MUL = [1, 1.08, 1.16, 1.26, 1.4]
export const STAGES_PER_CHAPTER = 5

// 原版怪物公式里的随机区间取中位数：HP rand*5+16 → 18.5，ATK rand*1+2 → 2.5，金币 rand*5+11 → 13.5
const HP_K = 18.5
const ATK_K = 2.5
const GOLD_K = 13.5

// 12 章主线：等级区间与原版装备等级上限（110）对齐
export const CHAPTERS = [{
  lv: 5,
  name: '晨风林地',
  boss: '林中的巨熊',
  desc: '史莱姆与野熊的领地，适合检查装备是否穿齐。'
}, {
  lv: 15,
  name: '灰岩矿道',
  boss: '矿道监工',
  desc: '废弃矿道里有比矿工更危险的东西。'
}, {
  lv: 25,
  name: '血月庄园',
  boss: '赤柳男爵',
  desc: '庄园主人喜欢用客人的血酿酒。'
}, {
  lv: 35,
  name: '风嚎峡口',
  boss: '双头风狼',
  desc: '风大得能把护甲吹歪，幸好运算是公平的。'
}, {
  lv: 45,
  name: '沉沙古墓',
  boss: '先代狂龙遗蜕',
  desc: '墓道里的铠甲已经空了，但还在巡逻。'
}, {
  lv: 55,
  name: '霜语雪原',
  boss: '冰龙凝雪',
  desc: '冷到血条都冻住的地方，堆点生命回复再来。'
}, {
  lv: 65,
  name: '熔罪熔炉',
  boss: '熔炉看守长',
  desc: '装备强化失败的心理阴影就是这里造出来的。'
}, {
  lv: 75,
  name: '低语沼泽',
  boss: '芬撒里尔母巢',
  desc: '每走一步都有东西在数你的词条。'
}, {
  lv: 85,
  name: '断罪圣殿',
  boss: '肃清者首领',
  desc: '他们说这里只接待穿白金套的人。'
}, {
  lv: 95,
  name: '深渊裂隙',
  boss: '裂隙守望者',
  desc: '通往深渊回廊的侧门，祝福在这里同样有效。'
}, {
  lv: 105,
  name: '王座回廊',
  boss: '无名的前任',
  desc: '尽头是一把空王座和一段你不该读的记忆。'
}, {
  lv: 115,
  name: '终焉之门',
  boss: '魔神残影',
  desc: '最终一战：全 3 星才能点亮门上的十二枚徽记。'
}]

export const CHAPTER_COUNT = CHAPTERS.length

/** 章节等级（用于副本/装备等级换算） */
export const chapterLevel = c => (CHAPTERS[Math.min(CHAPTERS.length, Math.max(1, c)) - 1] || {}).lv || 1

/**
 * 单关怪物属性：完全确定性，随章节/关卡线性放大
 * @param {Number} chapter 1..12
 * @param {Number} stage 1..5
 */
export function stageMonster(chapter, stage) {
  const c = Math.min(CHAPTER_COUNT, Math.max(1, chapter | 0))
  const s = Math.min(STAGES_PER_CHAPTER, Math.max(1, stage | 0))
  const lv = chapterLevel(c)
  const mul = STAGE_MUL[s - 1]
  const isBoss = s === STAGES_PER_CHAPTER
  const hp = Math.floor(lv * Math.pow(lv, 1.1) * HP_K * mul * (isBoss ? 1.9 : 1))
  const atk = Math.floor(lv * Math.pow(lv, 1.1) * ATK_K * mul * (isBoss ? 1.25 : 1))
  return {
    name: isBoss ? CHAPTERS[c - 1].boss : `${CHAPTERS[c - 1].name}·${STAGE_NAMES[s - 1]}`,
    type: isBoss ? 'boss' : 'monster',
    isBoss: isBoss,
    lv: lv,
    attribute: {
      HP: hp,
      ATK: atk
    },
    needDPS: Math.floor(lv * Math.pow(lv, 1.3) * 2 * mul * (isBoss ? 1.9 : 1) / 1),
    gold: Math.floor(Math.pow(lv, 1.16) * GOLD_K * mul * (isBoss ? 2.2 : 1))
  }
}

/**
 * 星级：按"剩余血量比例"评。这让"变强"直接体现在星数上，比"打赢/打输"更有反馈。
 * 3★ 需要 80% 以上血量存活（也是扫荡的门槛）。
 */
export function starsFor(win, hpLeftPct) {
  if (!win) {
    return 0
  }
  if (hpLeftPct >= 0.8) {
    return 3
  }
  if (hpLeftPct >= 0.45) {
    return 2
  }
  return 1
}

export const STAR_REWARD = {
  // 每关基础奖励 ×(1 + 星数加成)
  goldPerStar: 0.15,
  echo: 4,
  echoFirst: 6,
  shardsFirst: 4,
  shardsPerStar: 2
}

/**
 * 结算一关的奖励（星级越高越多；首通额外给碎片 + 回响）
 */
export function stageReward(chapter, stage, stars, firstClear) {
  const m = stageMonster(chapter, stage)
  const k = 1 + STAR_REWARD.goldPerStar * stars
  const gold = Math.floor(m.gold * k)
  const echoes = STAR_REWARD.echo + (firstClear ? STAR_REWARD.echoFirst : 0) + stars
  const shards = firstClear ? STAR_REWARD.shardsFirst + stars : 0
  return {
    gold,
    echoes,
    shards,
    // 掉落品质档位（0..4）按星级往上抬一档，3★ 有额外一次掉落
    extraRoll: stars >= 3 ? 1 : 0
  }
}

/** 掉落品质权重：与原版掉落表同源（0.25/0.55/0.15/0.05），3★ 时向高档偏移 */
export function rollQuality(rnd, stars) {
  const boost = Math.min(2, stars - 1) // 1★→0, 2★→1, 3★→2
  const table = [0.25, 0.55, 0.15, 0.05].map((v, i) => v * (i >= 2 ? 1 + 0.55 * boost : 1))
  const sum = table.reduce((a, b) => a + b, 0)
  let r = rnd() * sum
  for (let i = 0; i < 4; i++) {
    if (r < table[i]) {
      return i
    }
    r -= table[i]
  }
  return 3
}

// ---------- 体力 ----------
export const STAMINA = {
  max: 120,
  cost: 5, // 一次挑战的体力消耗（扫荡更便宜，见 SWEEP）
  // 回复速度：每 150 秒 1 点（≈ 24 小时 576 点，足够 115 次挑战）
  regenSec: 150
}

/**
 * 懒算体力：不做全局计时器，读的时候按时间戳补算，天然支持离线回复
 * @param {Object} st { stamina, staminaAt }
 * @param {Number} now Date.now()
 */
export function staminaNow(st, now = Date.now()) {
  const v = Math.max(0, Number((st && st.stamina) || 0))
  const at = Number((st && st.staminaAt) || now)
  const gained = Math.floor(Math.max(0, now - at) / (STAMINA.regenSec * 1000))
  const value = Math.min(STAMINA.max, v + gained)
  return {
    value: value,
    // 距下一点体力的秒数（满则为 0）
    nextSec: value >= STAMINA.max ? 0 : STAMINA.regenSec - Math.floor((now - at) / 1000) % STAMINA.regenSec
  }
}

// ---------- 扫荡 ----------
export const SWEEP = {
  goldK: 0.6, // 扫荡金币 = 挑战的 60%
  dropChance: 0.3, // 仍有机会掉装备（但不出独特）
  requireStars: 3, // 必须先 3★ 通关
  cost: 3, // 扫荡比手打便宜一档，鼓励「一键扫荡本章」
  maxTimes: 10
}

/**
 * 扫荡收益：不进入战斗、不改血量，只发金币/回响/概率掉落
 */
export function sweepReward(chapter, stage, times) {
  const n = Math.max(1, Math.min(SWEEP.maxTimes, times | 0))
  const m = stageMonster(chapter, stage)
  const gold = Math.floor(m.gold * SWEEP.goldK * n * (1 + STAR_REWARD.goldPerStar * 3))
  return {
    times: n,
    gold: gold,
    echoes: Math.floor((STAR_REWARD.echo + 3) * n * 0.5)
  }
}

// ---------- 解锁 / 进度 ----------
/**
 * @param {Object} stars { 'c-s': 0..3 }
 */
export function chapterStars(stars, c) {
  let sum = 0
  let full = 0
  for (let s = 1; s <= STAGES_PER_CHAPTER; s++) {
    const v = (stars || {})[c + '-' + s] || 0
    sum += v
    if (v >= 3) {
      full++
    }
  }
  return {
    sum: sum,
    max: STAGES_PER_CHAPTER * 3,
    cleared: [...Array(STAGES_PER_CHAPTER)].filter((_, i) => ((stars || {})[c + '-' + (i + 1)] || 0) > 0).length,
    full3: full
  }
}

export function chapterUnlocked(stars, c) {
  if (c <= 1) {
    return true
  }
  return chapterStars(stars, c - 1).cleared >= STAGES_PER_CHAPTER
}

/** 全部 3★ 的总星数（用于成就/称号） */
export function totalStars(stars) {
  return Object.keys(stars || {}).reduce((a, k) => a + (stars[k] || 0), 0)
}

/** 章节全 3★ 的章数 */
export function perfectChapters(stars) {
  let n = 0
  for (let c = 1; c <= CHAPTER_COUNT; c++) {
    if (chapterStars(stars, c).full3 >= STAGES_PER_CHAPTER) {
      n++
    }
  }
  return n
}

export const CAMPAIGN_TIPS = [
  '怪物数值是固定的：同样面板打同一关，结果永远一样，星级只反映你有多强。',
  '剩余血量 ≥80% 拿 3★；3★ 之后才能扫荡。',
  '战败不会死，只会把血打到 1 点 —— 章节不会毁掉你在主世界的进度。',
  '体力每 150 秒回 1 点（离线也回），上限 120。',
  '首通给英雄碎片 + 回响：这是抽卡之外第二条稳定获取英雄养成的路。'
]

export default {
  CHAPTERS,
  stageMonster,
  starsFor,
  stageReward,
  rollQuality,
  staminaNow,
  sweepReward,
  chapterUnlocked,
  chapterStars,
  totalStars,
  perfectChapters
}
