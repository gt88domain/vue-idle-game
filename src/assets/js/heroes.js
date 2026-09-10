/**
 * 英雄系统的纯逻辑层（召唤 / 升级 / 升星 / 技能 / 编队）
 *
 * 全部写成不依赖 Vue 的纯函数：入参是当前 heroes 状态，返回新的状态与结算结果，
 * 组件只负责调用 + commit('set_heroes')。好处是可以在 node 里直接跑单测，
 * 也让"保底""碎片"这类容易写出副作用的规则保持可验证。
 *
 * @author arena agent
 */
import {
  HEROES,
  HERO_MAP,
  SUMMON,
  STAR_UP,
  dupToShards,
  heroLevelCost,
  heroMaxLevel,
  partyBonus
} from '../config/heroes'

const clone = o => JSON.parse(JSON.stringify(o))

export const HERO_SKILL_MAX = 5

export function newHeroState() {
  return {
    owned: {},
    party: [],
    total: 0,
    pity5: 0,
    pity4: 0,
    tickets: 0,
    dupes: 0,
    // 还没拥有英雄时领到的碎片先进这里，抽到新英雄后自动补发
    pendingShards: 0
  }
}

export function heroRecord(id) {
  return {
    id,
    lv: 1,
    star: 1,
    shards: 0,
    skill: 0,
    pulls: 0
  }
}

export const heroSkillCost = skill => 4 * (skill + 1) // 消耗深渊回响
export const HERO_MAX_STAR = 6

/** 按稀有度抽一个英雄 id */
function pickRarity(heroes, rng) {
  // 硬保底：40 抽必出 5★
  if (heroes.pity5 + 1 >= SUMMON.hardPity) {
    return 5
  }
  // 软保底：超过 softPity 后逐抽提升 5★ 概率
  const over = heroes.pity5 + 1 - SUMMON.softPity
  const p5 = SUMMON.weights[5] + (over > 0 ? over * 4 : 0)
  const w = {
    3: SUMMON.weights[3],
    4: SUMMON.weights[4],
    5: p5
  }
  const r = rng() * (w[3] + w[4] + w[5])
  let rarity = r < w[3] ? 3 : (r < w[3] + w[4] ? 4 : 5)
  // 每 10 抽保底 4★ 以上
  if (heroes.pity4 + 1 > SUMMON.tenPity * 10 && rarity < 4) {
    rarity = 4
  }
  return rarity
}

function randomIdOf(rarity, rng) {
  const pool = HEROES.filter(h => h.rarity === rarity)
  const list = pool.length ? pool : HEROES
  return list[Math.floor(rng() * list.length) % list.length].id
}

/**
 * 执行一次召唤
 * @param {Object} heroes 当前英雄状态
 * @param {Number} count 次数（1 / 10）
 * @param {Number} gold 可用金币
 * @param {Function} rng () => [0,1)
 */
export function rollSummon(heroes, count, gold, rng = Math.random) {
  const next = clone(heroes || newHeroState())
  const results = []
  let spentGold = 0
  let usedTickets = 0
  // 十连九折（按单抽价的 90% × 10）
  const single = SUMMON.single
  for (let i = 0; i < count; i++) {
    if (next.tickets > 0) {
      next.tickets--
      usedTickets++
    } else {
      if (spentGold + single > gold) {
        break
      }
      spentGold += single
    }
    next.pity5++
    next.pity4++
    const rarity = pickRarity(next, rng)
    const id = randomIdOf(rarity, rng)
    if (rarity >= 5) {
      next.pity5 = 0
      next.pity4 = 0
    } else if (rarity >= 4) {
      next.pity4 = 0
    }
    next.total++
    const rec = next.owned[id]
    if (rec) {
      const sh = dupToShards(rarity)
      rec.shards += sh
      next.dupes++
      results.push({
        id,
        rarity,
        isNew: false,
        shards: sh
      })
    } else {
      next.owned[id] = heroRecord(id)
      results.push({
        id,
        rarity,
        isNew: true,
        shards: 0
      })
    }
    next.owned[id].pulls++
  }
  // 「无主碎片」补发：新英雄到手后一次性给他
  if (next.pendingShards > 0) {
    const fresh = results.filter(x => x.isNew)
    if (fresh.length) {
      next.owned[fresh[0].id].shards += next.pendingShards
      results.forEach(x => {
        if (x.id === fresh[0].id) {
          x.shards += next.pendingShards
          x.bonus = next.pendingShards
        }
      })
      next.pendingShards = 0
    }
  }
  return {
    ok: results.length > 0,
    results,
    heroes: next,
    spentGold,
    usedTickets,
    reason: results.length ? '' : '金币不足'
  }
}

export function levelUpHero(heroes, id, gold, playerLv, times = 1) {
  const next = clone(heroes || newHeroState())
  const rec = next.owned[id]
  const cfg = HERO_MAP[id]
  if (!rec || !cfg) {
    return {
      ok: false,
      reason: '尚未拥有该英雄'
    }
  }
  const cap = heroMaxLevel(playerLv)
  let spent = 0
  let n = 0
  for (let i = 0; i < times; i++) {
    if (rec.lv >= cap) {
      break
    }
    const c = heroLevelCost(rec.lv, cfg.rarity)
    if (spent + c > gold) {
      break
    }
    spent += c
    rec.lv++
    n++
  }
  if (!n) {
    return {
      ok: false,
      reason: rec.lv >= cap ? `英雄等级上限 ${cap}（随玩家等级提升）` : '金币不足',
      cost: heroLevelCost(rec.lv, cfg.rarity)
    }
  }
  return {
    ok: true,
    heroes: next,
    spent,
    lv: rec.lv
  }
}

export function starUpHero(heroes, id, gold, playerLv) {
  const next = clone(heroes || newHeroState())
  const rec = next.owned[id]
  if (!rec) {
    return {
      ok: false,
      reason: '尚未拥有该英雄'
    }
  }
  if (rec.star >= HERO_MAX_STAR) {
    return {
      ok: false,
      reason: '已满星'
    }
  }
  const i = rec.star - 1
  const need = STAR_UP.shards[i]
  const cost = Math.floor(STAR_UP.goldMul[i] * Math.max(1, playerLv) * 30)
  if (rec.shards < need) {
    return {
      ok: false,
      reason: `碎片不足（${rec.shards}/${need}）`
    }
  }
  if (gold < cost) {
    return {
      ok: false,
      reason: '金币不足'
    }
  }
  rec.shards -= need
  rec.star++
  return {
    ok: true,
    heroes: next,
    star: rec.star,
    spent: cost
  }
}

export function skillUpHero(heroes, id, echoes) {
  const next = clone(heroes || newHeroState())
  const rec = next.owned[id]
  if (!rec) {
    return {
      ok: false,
      reason: '尚未拥有该英雄'
    }
  }
  if (rec.skill >= HERO_SKILL_MAX) {
    return {
      ok: false,
      reason: '大招已满级'
    }
  }
  const cost = heroSkillCost(rec.skill)
  if (echoes < cost) {
    return {
      ok: false,
      reason: `深渊回响不足（${echoes}/${cost}）`
    }
  }
  rec.skill++
  return {
    ok: true,
    heroes: next,
    skill: rec.skill,
    spent: cost
  }
}

export function toggleParty(heroes, id, max = 3) {
  const next = clone(heroes || newHeroState())
  if (!next.owned[id]) {
    return {
      ok: false,
      reason: '尚未拥有该英雄'
    }
  }
  const i = next.party.indexOf(id)
  if (i >= 0) {
    next.party.splice(i, 1)
  } else {
    if (next.party.length >= max) {
      return {
        ok: false,
        reason: `队伍最多 ${max} 人，先下阵一位`
      }
    }
    next.party.push(id)
  }
  return {
    ok: true,
    heroes: next
  }
}

/** 给英雄状态兜底（读档时老存档没有这个字段） */
export function normalizeHeroes(raw) {
  const base = newHeroState()
  if (!raw) {
    return base
  }
  Object.keys(base).forEach(k => {
    if (raw[k] !== undefined && raw[k] !== null) {
      base[k] = raw[k]
    }
  })
  if (!base.owned || typeof base.owned !== 'object') {
    base.owned = {}
  }
  Object.keys(base.owned).forEach(id => {
    if (!HERO_MAP[id] || !base.owned[id] || typeof base.owned[id] !== 'object') {
      delete base.owned[id]
      return
    }
    const rec = base.owned[id]
    const d = heroRecord(id)
    Object.keys(d).forEach(k => {
      const v = rec[k]
      if (v === undefined || v === null || (k !== 'id' && isNaN(Number(v)))) {
        rec[k] = d[k]
      }
    })
    rec.lv = Math.max(1, Math.floor(Number(rec.lv) || 1))
    rec.shards = Math.max(0, Math.floor(Number(rec.shards) || 0))
    rec.star = Math.min(HERO_MAX_STAR, Math.max(1, rec.star))
    rec.skill = Math.min(HERO_SKILL_MAX, Math.max(0, rec.skill))
  })
  base.party = (Array.isArray(base.party) ? base.party : []).filter(id => !!base.owned[id]).slice(0, 3)
  return base
}

/** 供 store 使用：当前队伍的完整加成（含大招、阵营共鸣） */
export function partyBonusOf(heroes) {
  const h = normalizeHeroes(heroes)
  return partyBonus(h.party, h.owned)
}

// 配置里的全部常量/纯函数直接透出，组件只需从本模块引入
export * from '../config/heroes'

export default {
  newHeroState,
  rollSummon,
  levelUpHero,
  starUpHero,
  skillUpHero,
  toggleParty,
  partyBonusOf
}
