/**
 * 深渊回廊（新模式）配置：祝福 + 祭坛永久强化
 *
 * 玩法循环：
 *  1. 用当前装备的属性进入「深渊回廊」，逐层与深渊生物打竞速（沿用原版战斗解算公式）；
 *  2. 每通过一层，从 3 个随机祝福里选 1 个，祝福可以在一层内反复叠加，越叠越强；
 *  3. 随时可以「撤退」带走本层累计的回响；如果贪心继续并且死了，只能带走一部分；
 *  4. 回响在「深渊祭坛」购买永久强化，永久强化会反馈到主世界（属性/掉率/挂机效率）。
 *
 * @author arena agent（基于 couy 的 vue-idle-game, MIT）
 */

export const BLESSINGS = [{
    id: 'power',
    name: '蛮力契约',
    rarity: 1,
    max: 20,
    desc: '攻击力提升 8%',
    mods: {
      ATKPERCENT: 8
    }
  },
  {
    id: 'vigor',
    name: '深渊体魄',
    rarity: 1,
    max: 20,
    desc: '生命值提升 10%',
    mods: {
      HPPERCENT: 10
    }
  },
  {
    id: 'stone',
    name: '黑曜皮肤',
    rarity: 1,
    max: 20,
    desc: '护甲提升 12%',
    mods: {
      DEFPERCENT: 12
    }
  },
  {
    id: 'focus',
    name: '鹰眼',
    rarity: 1,
    max: 15,
    desc: '暴击率提升 4%',
    mods: {
      CRIT: 4
    }
  },
  {
    id: 'cruel',
    name: '残忍切口',
    rarity: 1,
    max: 15,
    desc: '暴击伤害提升 18%',
    mods: {
      CRITDMG: 18
    }
  },
  {
    id: 'thorn',
    name: '倒刺外壳',
    rarity: 2,
    max: 12,
    desc: '反伤提升 15%（按怪物攻击力追加伤害）',
    mods: {
      THORNS: 15
    }
  },
  {
    id: 'mist',
    name: '迷雾步',
    rarity: 2,
    max: 10,
    desc: '闪避提升 5%，预期承伤降低',
    mods: {
      EVA: 5
    }
  },
  {
    id: 'vamp',
    name: '噬血',
    rarity: 2,
    max: 10,
    desc: '击杀后回复造成伤害的 10%',
    mods: {
      LIFESTEAL: 10
    }
  },
  {
    id: 'siphon',
    name: '深渊汲血',
    rarity: 2,
    max: 8,
    desc: '每层战斗结束后回复 6% 最大生命',
    mods: {
      REGEN: 300
    }
  },
  {
    id: 'gilded',
    name: '镀金之手',
    rarity: 1,
    max: 15,
    desc: '本层回响与金币获取提升 20%',
    mods: {
      GOLDGAIN: 20
    }
  },
  {
    id: 'fortune',
    name: '命运低语',
    rarity: 2,
    max: 10,
    desc: '幸运提升 15（影响掉落与重铸）',
    mods: {
      LUCK: 15
    }
  },
  {
    id: 'bulwark',
    name: '不动摇',
    rarity: 2,
    max: 10,
    desc: '格挡值提升 20%',
    mods: {
      BLOCPERCENT: 20
    }
  },
  {
    id: 'guardian',
    name: '骨盾',
    rarity: 3,
    max: 6,
    desc: '受到的所有伤害降低 6%',
    mods: {
      DR: 6
    }
  },
  {
    id: 'reaper',
    name: '收割者',
    rarity: 3,
    max: 4,
    desc: '怪物生命低于 8% 时直接被处决',
    mods: {
      EXECUTE: 8
    }
  },
  {
    id: 'onslaught',
    name: '狂暴连击',
    rarity: 3,
    max: 5,
    desc: '总伤害提升 12%（无视部分护甲）',
    mods: {
      PENETRATE: 12
    }
  },
  {
    id: 'greedy',
    name: '贪婪之心',
    rarity: 3,
    max: 3,
    desc: '额外获得一次祝福选择，并+25%回响',
    mods: {
      EXTRA_PICK: 1,
      GOLDGAIN: 25
    }
  },
  {
    id: 'secondwind',
    name: '二次呼吸',
    rarity: 3,
    max: 3,
    desc: '战斗中死亡时有一次免死（回复 20% 生命）',
    mods: {
      REVIVE: 1
    }
  },
  {
    id: 'bloodsight',
    name: '血腥视觉',
    rarity: 2,
    max: 8,
    desc: '暴击率 +3%，暴击伤害 +10%',
    mods: {
      CRIT: 3,
      CRITDMG: 10
    }
  },
  {
    id: 'wrath',
    name: '复仇之怒',
    rarity: 3,
    max: 5,
    desc: '生命每低于 50%，攻击力提升 10%',
    mods: {
      WRATH: 10
    }
  }
];

export const RARITY_META = {
  1: {
    name: '普通',
    color: '#fff',
    weight: 0.6
  },
  2: {
    name: '稀有',
    color: '#ff00ff',
    weight: 0.3
  },
  3: {
    name: '传说',
    color: '#f78918',
    weight: 0.1
  }
}

/**
 * 抽取本层的祝福选项
 * @param {Object} stacks 当前祝福层数 {blessingId: num}
 * @param {number} num 选项数量
 * @param {number} luck 幸运值，提高稀有/传说出现概率
 */
export function rollBlessings(stacks = {}, num = 3, luck = 0) {
  const pool = BLESSINGS.filter(b => (stacks[b.id] || 0) < b.max)
  if (!pool.length) {
    return []
  }
  const luckK = Math.min(0.35, luck / 400)
  const weighted = pool.map(b => {
    let w = RARITY_META[b.rarity].weight
    if (b.rarity === 3) {
      w *= (1 + luckK * 4)
    } else if (b.rarity === 2) {
      w *= (1 + luckK * 2)
    } else {
      w *= (1 - luckK * 0.6)
    }
    return {
      b,
      w
    }
  })
  const total = weighted.reduce((s, v) => s + v.w, 0)
  const picked = []
  const rest = weighted.slice()
  for (let i = 0; i < num && rest.length; i++) {
    let r = Math.random() * rest.reduce((s, v) => s + v.w, 0)
    let idx = 0
    for (let j = 0; j < rest.length; j++) {
      r -= rest[j].w
      if (r <= 0) {
        idx = j
        break
      }
    }
    picked.push(rest[idx].b)
    rest.splice(idx, 1)
  }
  return picked
}

/** 把祝福层数折算成总修正 */
export function aggregateBlessings(stacks = {}) {
  const mods = {}
  Object.keys(stacks).forEach(id => {
    const b = BLESSINGS.find(v => v.id === id)
    if (!b) {
      return
    }
    const num = stacks[id]
    Object.keys(b.mods).forEach(key => {
      mods[key] = (mods[key] || 0) + b.mods[key] * num
    })
  })
  return mods
}

/** 深渊祭坛：永久强化（用回响购买，跨轮回保留） */
export const ABYSS_PERKS = [{
    id: 'abyssPower',
    name: '深渊之力',
    des: '每级提升 2% 攻击力（全局生效）',
    max: 50,
    baseCost: 25,
    costK: 1.32,
    perLevel: {
      ATKPERCENT: 2
    }
  },
  {
    id: 'abyssVigor',
    name: '深渊之血',
    des: '每级提升 2% 生命值（全局生效）',
    max: 50,
    baseCost: 25,
    costK: 1.32,
    perLevel: {
      HPPERCENT: 2
    }
  },
  {
    id: 'abyssArmor',
    name: '深渊之壳',
    des: '每级提升 2% 护甲（全局生效）',
    max: 50,
    baseCost: 25,
    costK: 1.32,
    perLevel: {
      DEFPERCENT: 2
    }
  },
  {
    id: 'abyssGold',
    name: '贪婪回响',
    des: '每级提升 4% 金币获取',
    max: 30,
    baseCost: 40,
    costK: 1.4,
    perLevel: {
      GOLDGAIN: 4
    }
  },
  {
    id: 'abyssLuck',
    name: '命运馈赠',
    des: '每级提升 1 幸运：独特装备掉率、重铸品质、挂机效率',
    max: 30,
    baseCost: 55,
    costK: 1.45,
    perLevel: {
      LUCK: 1
    }
  },
  {
    id: 'abyssInsight',
    name: '深渊启蒙',
    des: '进入深渊时，每层额外 +1 个祝福可选',
    max: 2,
    baseCost: 260,
    costK: 3,
    perLevel: {
      EXTRA_PICK: 1
    }
  },
  {
    id: 'abyssMercy',
    name: '不屈回响',
    des: '深渊中死亡时保留的回响比例 +8%（基础 60%）',
    max: 5,
    baseCost: 120,
    costK: 1.7,
    perLevel: {
      DEATH_KEEP: 8
    }
  },
  {
    id: 'abyssThorns',
    name: '荆棘烙印',
    des: '每级提升 2% 反伤',
    max: 25,
    baseCost: 60,
    costK: 1.38,
    perLevel: {
      THORNS: 2
    }
  },
  {
    id: 'abyssIdle',
    name: '时空凝滞',
    des: '离线挂机收益上限 +1 小时（基础 8 小时）',
    max: 8,
    baseCost: 90,
    costK: 1.5,
    perLevel: {
      OFFLINE_CAP: 1
    }
  },
  {
    id: 'abyssHaste',
    name: '疾行符文',
    des: '每级提升 3% 副本推进/战斗速度（挂机更快）',
    max: 15,
    baseCost: 70,
    costK: 1.42,
    perLevel: {
      SPEED: 3
    }
  }
];

export function perkCost(perk, level) {
  return Math.floor(perk.baseCost * (perk.costK ** level))
}

/** 汇总祭坛永久强化 -> 全局加成 */
export function aggregatePerks(levels = {}) {
  const bonus = {}
  ABYSS_PERKS.forEach(perk => {
    const lv = levels[perk.id] || 0
    if (!lv) {
      return
    }
    Object.keys(perk.perLevel).forEach(key => {
      bonus[key] = (bonus[key] || 0) + perk.perLevel[key] * lv
    })
  })
  return bonus
}

/**
 * 深渊楼层怪物
 *
 * 关键点：楼层强度以「进入本局时玩家的面板」为锚点（anchor），之后每层按曲线放大。
 *  - monster.HP = anchorDPS * k_n         -> 输出越高，击杀越快，挨打越少
 *  - monster.ATK = anchorMAXHP /(k_n*d_n) -> 生存越高，可承受次数越多
 * 这样「打不打得动」和「扛不扛得住」两条轴都保留，而且任何进度进来都有得玩，
 * 深不深完全取决于祝福与面板；锚点在开局锁定，符合 roguelike 的完整性。
 *
 * @param {number} floor 层数
 * @param {Object} anchor {DPS, MAXHP} 开局面板快照
 */
export function createAbyssFloor(floor, anchor) {
  const dps = Math.max(1, Number(anchor && anchor.DPS) || 1)
  const maxHp = Math.max(1, Number(anchor && anchor.MAXHP) || 1)
  const f = Math.max(1, floor)
  // 期望战斗时长（秒）：越往后越肉
  const k = 2.2 * (1 + (f - 1) * 0.05)
  // 生存难度比 d = 玩家可存活时长 / 击杀时长，d 越小越危险
  const d = 4.2 * Math.pow(0.955, f - 1)
  const isBoss = f % 5 === 0
  const isElite = !isBoss && f % 3 === 0
  const hpK = isBoss ? 2.4 : isElite ? 1.6 : 1
  const atkK = isBoss ? 1.4 : isElite ? 1.15 : 1
  const monsterHp = Math.floor(dps * k * hpK)
  const monsterAtk = Math.max(1, Math.floor(maxHp / (k * d) * atkK))
  const echo = Math.floor((6 + f * 2.2) * (isBoss ? 3 : isElite ? 2 : 1))
  return {
    floor: f,
    isBoss,
    isElite,
    battleTime: k,
    difficulty: d,
    name: isBoss ? `深渊领主 · 第${f}层` : isElite ? `深渊精英 · 第${f}层` : `深渊造物 · 第${f}层`,
    attribute: {
      HP: monsterHp,
      ATK: monsterAtk
    },
    needDPS: Math.floor(monsterHp / (maxHp / monsterAtk * 0.9)),
    echo,
    gold: Math.floor((80 + f * 40) * (isBoss ? 2.6 : isElite ? 1.6 : 1))
  }
}
