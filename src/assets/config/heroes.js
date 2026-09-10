/**
 * 英雄系统配置（新增玩法）
 *
 * 原版只有"纸娃娃"：玩家本身不存在，成长全在装备上。这里补上手游最核心的那条
 * 收集线 —— 召唤 / 升星 / 编队 / 阵营共鸣 / 大招，并且全部数值都汇入
 * store.set_player_attribute 的加成池，因此"未拥有任何英雄"时各项贡献为 0，
 * 复刻版公式（npm run fidelity）不受影响。
 *
 * @author arena agent
 */

// 阵营：2 人共鸣为全队 buff，4 人为满共鸣
export const FACTIONS = {
  holy: {
    name: '圣殿',
    color: '#f2d185',
    desc: '2人：受到伤害额外减少 6%；满编：每场战斗附带圣盾',
   共鸣2: {
      key: 'BLOCPERCENT',
      value: 30
    },
    共鸣4: {
      key: 'SHIELD',
      value: 12
    }
  },
  arcane: {
    name: '秘法',
    color: '#8fd3ff',
    desc: '2人：暴击伤害 +10%；满编：大招充能速度 +1',
    共鸣2: {
      key: 'CRITDMG',
      value: 15
    },
    共鸣4: {
      key: 'ULTCHARGE',
      value: 1
    }
  },
  wild: {
    name: '兽部',
    color: '#9ede7c',
    desc: '2人：攻击 +5%；满编：击杀后立即回复 3% 生命',
    共鸣2: {
      key: 'ATKPERCENT',
      value: 5
    },
    共鸣4: {
      key: 'KILLHEAL',
      value: 3
    }
  },
  abyss: {
    name: '深渊',
    color: '#d78cff',
    desc: '2人：吸血 +3%；满编：生命低于 35% 时伤害提高 25%',
    共鸣2: {
      key: 'LIFESTEAL',
      value: 3
    },
    共鸣4: {
      key: 'WRATH',
      value: 25
    }
  }
}

// 大招类型说明：
// burst   立即造成 DPS×X 的开场伤害（直接压缩击杀时间）
// shield  本场承受伤害降低 X%
// rage    本场 DPS 提高 X%
// heal    战斗结束后回复最大生命 X%
// execute 怪物剩余血量低于 X% 时直接斩杀
// 所有百分比都会随星级 / 技能等级放大，cost 为所需充能点数（每场胜利 +1）
export const HEROES = [{
    id: 'aiden',
    name: '艾登 · 晨刃',
    title: '圣殿骑士',
    faction: 'holy',
    rarity: 4,
    base: {
      ATK: 12,
      HP: 180,
      DEF: 8
    },
    grow: {
      ATK: 3.2,
      HP: 46,
      DEF: 2.1
    },
    entry: {
      BLOCPERCENT: 1.6,
      REGEN: 0.5
    },
    ult: {
      kind: 'shield',
      name: '圣壁宣告',
      text: '开战时展开圣壁，本场承受伤害 -{v}%',
      base: 14,
      perStar: 5,
      perLevel: 0.6,
      cost: 4
    },
    story: '城门失守那夜，他是唯一没有回头的人。'
  },
  {
    id: 'violet',
    name: '薇尔莉特',
    title: '星陨术士',
    faction: 'arcane',
    rarity: 5,
    base: {
      ATK: 20,
      HP: 110,
      DEF: 3
    },
    grow: {
      ATK: 5.4,
      HP: 26,
      DEF: 0.9
    },
    entry: {
      CRIT: 1.2,
      CRITDMG: 4
    },
    ult: {
      kind: 'burst',
      name: '星陨术',
      text: '召唤星陨，立即造成相当于 {v}% 每秒伤害的爆发',
      base: 260,
      perStar: 90,
      perLevel: 12,
      cost: 5
    },
    story: '她用法杖敲开过一次天穹，从此再没睡过一个整夜。'
  },
  {
    id: 'kagus',
    name: '卡格斯',
    title: '血牙酋长',
    faction: 'wild',
    rarity: 3,
    base: {
      ATK: 14,
      HP: 200,
      DEF: 5
    },
    grow: {
      ATK: 3.6,
      HP: 52,
      DEF: 1.3
    },
    entry: {
      THORNS: 1.4,
      HPPERCENT: 0.7
    },
    ult: {
      kind: 'rage',
      name: '血怒图腾',
      text: '图腾插地，本场每秒伤害 +{v}%',
      base: 26,
      perStar: 10,
      perLevel: 1.4,
      cost: 3
    },
    story: '他只用一场架就说服了四个部落。'
  },
  {
    id: 'liana',
    name: '莉安娜',
    title: '风语游侠',
    faction: 'wild',
    rarity: 4,
    base: {
      ATK: 16,
      HP: 130,
      DEF: 4
    },
    grow: {
      ATK: 4.3,
      HP: 31,
      DEF: 1.1
    },
    entry: {
      SPEED: 0.6,
      EVA: 1.4
    },
    ult: {
      kind: 'burst',
      name: '穿云一箭',
      text: '无视护甲的一箭，立即造成 {v}% 每秒伤害',
      base: 180,
      perStar: 65,
      perLevel: 9,
      cost: 4
    },
    story: '她射落过龙，也射偏过，但从不多带箭。'
  },
  {
    id: 'mordred',
    name: '莫德雷克',
    title: '堕落骑士',
    faction: 'abyss',
    rarity: 5,
    base: {
      ATK: 22,
      HP: 150,
      DEF: 6
    },
    grow: {
      ATK: 5.8,
      HP: 38,
      DEF: 1.6
    },
    entry: {
      LIFESTEAL: 2.2,
      ATKPERCENT: 1.6
    },
    ult: {
      kind: 'execute',
      name: '血之契约',
      text: '撕开伤口：立即削减目标 {v}% 最大生命',
      base: 9,
      perStar: 3,
      perLevel: 0.4,
      cost: 5
    },
    story: '铠甲内侧还刻着旧主人的名字，他没磨掉。'
  },
  {
    id: 'naglin',
    name: '纳格林',
    title: '焚天龙裔',
    faction: 'abyss',
    rarity: 5,
    base: {
      ATK: 24,
      HP: 165,
      DEF: 5
    },
    grow: {
      ATK: 6.4,
      HP: 41,
      DEF: 1.4
    },
    entry: {
      PENETRATE: 2.4,
      ATKPERCENT: 2
    },
    ult: {
      kind: 'heal',
      name: '龙焰吐息',
      text: '烈焰席卷战场，造成 {v}% 每秒伤害并回复生命',
      base: 200,
      perStar: 70,
      perLevel: 10,
      cost: 6
    },
    story: '它记得每一个在自己鳞片上留下刻痕的名字。'
  }
]

export const HERO_MAP = {}
HEROES.forEach(h => {
  HERO_MAP[h.id] = h
})

// 升星：需要碎片 + 金币，碎片来自重复召唤与深渊/成就奖励
export const STAR_UP = {
  // 索引 i 表示 升到 i+1 星 的消耗
  shards: [2, 4, 8, 14, 22],
  goldMul: [60, 120, 240, 480, 900] // 金币 = mul × 玩家等级 × 30
}

/**
 * 大招数值封顶（%）：升星/等级/技能会把大招推得很高，这里给一条硬上限，
 * 避免"一个大招把整个副本秒掉"导致战斗判定失去意义。
 */
export const ULT_CAP = {
  burst: 460,
  shield: 62,
  rage: 85,
  heal: 26,
  execute: 22
}

export const STAR_MUL = star => 1 + 0.18 * (star - 1) // 属性倍率
export const ULT_MUL = star => 1 + 0.35 * (star - 1) // 大招倍率

// 英雄升级：金币消耗随等级与稀有度上升
export const heroLevelCost = (lv, rarity) => Math.floor((lv + 1) * 900 * (1 + 0.35 * (rarity - 3)) * Math.pow(1.03, lv))
export const heroMaxLevel = playerLv => Math.max(10, Math.min(400, playerLv + 10))

// 召唤
export const SUMMON = {
  single: 30000,
  ten: 270000,
  // 稀有度权重（未触发保底时）
  weights: {
    3: 55,
    4: 33,
    5: 12
  },
  softPity: 18, // 从第 18 抽起 5★ 概率逐抽提升
  hardPity: 40, // 40 抽必出 5★
  tenPity: 1 // 每 10 抽保底一个 4★ 及以上
}

export const dupToShards = rarity => ({
  3: 6,
  4: 10,
  5: 20
})[rarity] || 5

/**
 * 单英雄战力（用于列表排序与展示）
 */
export function heroPower(st) {
  const cfg = HERO_MAP[st.id]
  if (!cfg) {
    return 0
  }
  const mul = STAR_MUL(st.star || 1)
  const lv = st.lv || 1
  const flat = (cfg.base.ATK + cfg.grow.ATK * lv) * 3 +
    (cfg.base.HP + cfg.grow.HP * lv) * 0.5 +
    (cfg.base.DEF + cfg.grow.DEF * lv) * 2
  const entry = Object.keys(cfg.entry || {}).reduce((a, k) => a + cfg.entry[k] * lv * 4, 0)
  return Math.floor((flat + entry) * mul * (1 + 0.06 * ((st.skill || 0))))
}

/**
 * 把队伍（最多 3 人）折算成一份"装备式"词条，供 set_player_attribute 汇入加成池。
 * 返回 0 贡献时上层可视为完全空位。
 */
export function partyBonus(party, ownedMap) {
  const out = {
    ATK: 0,
    HP: 0,
    DEF: 0,
    BLOC: 0,
    entries: {},
    ult: {
      burst: 0,
      shield: 0,
      rage: 0,
      heal: 0,
      execute: 0,
      cost: 99
    },
    charge: 0,
    shield: 0,
    killHeal: 0,
    factions: {}
  }
  const list = (party || []).map(id => ownedMap && ownedMap[id]).filter(h => !!h)
  if (!list.length) {
    out.ult.cost = 4
    return out
  }
  list.forEach(st => {
    const cfg = HERO_MAP[st.id]
    if (!cfg) {
      return
    }
    const mul = STAR_MUL(st.star || 1)
    const lv = st.lv || 1
    out.ATK += (cfg.base.ATK + cfg.grow.ATK * lv) * mul
    out.HP += (cfg.base.HP + cfg.grow.HP * lv) * mul
    out.DEF += (cfg.base.DEF + cfg.grow.DEF * lv) * mul
    Object.keys(cfg.entry || {}).forEach(k => {
      out.entries[k] = (out.entries[k] || 0) + cfg.entry[k] * lv * mul * 0.1
    })
    const u = cfg.ult
    const um = ULT_MUL(st.star || 1) * (1 + 0.05 * (st.skill || 0))
    const val = (u.base + u.perStar * ((st.star || 1) - 1) + u.perLevel * lv) * um
    const cap = ULT_CAP[u.kind] || 999
    out.ult[u.kind] = Math.min(cap, (out.ult[u.kind] || 0) + val)
    out.ult.cost = Math.min(out.ult.cost === 99 ? u.cost : out.ult.cost, u.cost)
    out.factions[cfg.faction] = (out.factions[cfg.faction] || 0) + 1
  })
  // 阵营共鸣
  Object.keys(out.factions).forEach(f => {
    const n = out.factions[f]
    const cfg = FACTIONS[f]
    if (!cfg) {
      return
    }
    const two = cfg['共鸣2']
    const four = cfg['共鸣4']
    if (n >= 2 && two) {
      if (two.key === 'BLOCPERCENT' || two.key === 'ATKPERCENT' || two.key === 'CRITDMG') {
        out.entries[two.key] = (out.entries[two.key] || 0) + two.value
      }
    }
    if (n >= 3 && four) { //满编（3 人）即触发第二档共鸣
      if (four.key === 'SHIELD') {
        out.shield += four.value
      } else if (four.key === 'ULTCHARGE') {
        out.charge += four.value
      } else if (four.key === 'KILLHEAL') {
        out.killHeal += four.value
      } else if (four.key === 'WRATH' || four.key === 'LIFESTEAL') {
        out.entries[four.key] = (out.entries[four.key] || 0) + four.value
      }
    }
  })
  out.ATK = Math.floor(out.ATK)
  out.HP = Math.floor(out.HP)
  out.DEF = Math.floor(out.DEF)
  Object.keys(out.entries).forEach(k => {
    out.entries[k] = Math.round(out.entries[k] * 100) / 100
  })
  out.ult.cost = Math.max(2, out.ult.cost - out.charge)
  return out
}

export default {
  FACTIONS,
  HEROES,
  HERO_MAP,
  ULT_CAP,
  partyBonus
}
