/**
 * 战斗解算（新增玩法共用）
 *
 * 原版的战斗是「解析式竞速」而非逐帧模拟：
 *   playerDeadTime = (CURHP + BLOC) / REDUCDMG / monsterATK
 *   monsterDeadTime = monsterHP / playerDPS
 *   先手者胜，伤害 = 战斗时长 * monsterATK * REDUCDMG - BLOC
 * 深渊回廊 / 自动挂机沿用同一套公式，因此新增属性（反伤、闪避、处决等）
 * 只需要在这套模型里以期望值的形式接入，主世界手感与原版完全一致。
 *
 * @author arena agent（基于 couy 的 vue-idle-game, MIT）
 */

const PERCENT_STATS = ['ATKPERCENT', 'DEFPERCENT', 'HPPERCENT', 'BLOCPERCENT']

/**
 * 把「百分比词条 + 套装/称号/祭坛加成」折算进角色面板
 * @param {Object} attribute store 里已经算好的基础面板（含装备与转生）
 * @param {Object} mods 附加修正（ATKPERCENT/THORNS/EVA/...）
 */
export function computeEffectiveAttribute(attribute, mods = {}) {
  const m = mods || {}
  const g = key => Number(m[key] || 0)
  const baseAtk = Number(attribute.ATK.value || 0)
  const baseDef = Number(attribute.DEF.value || 0)
  const baseHp = Number(attribute.MAXHP.value || 0)
  const baseBloc = Number(attribute.BLOC.value || 0)

  const atk = baseAtk * (1 + g('ATKPERCENT') / 100)
  const def = baseDef * (1 + g('DEFPERCENT') / 100)
  const maxHp = baseHp * (1 + g('HPPERCENT') / 100)
  const bloc = baseBloc * (1 + g('BLOCPERCENT') / 100)

  let crit = Number(attribute.CRIT.value || 0) + g('CRIT')
  crit = Math.max(0, Math.min(100, crit))
  const critDmg = Number(attribute.CRITDMG.value || 150) + g('CRITDMG')

  // 与 store 中 DPS 公式保持一致
  let dps = (1 - crit / 100) * atk + crit / 100 * critDmg / 100 * atk
  // 穿透：无视部分怪物减伤（这里当作纯增伤处理，怪物无护甲）
  dps *= (1 + g('PENETRATE') / 100)

  let reduceDmg = 1 - 0.05 * def / (1 + 0.0525 * def)
  // 闪避：期望承伤降低（非线性，收益递减，上限 60%）
  const eva = Math.min(100, g('EVA'))
  const evaReduce = 0.6 * eva / (eva + 45)
  // 固定减伤（传说祝福/称号）
  const dr = Math.min(70, g('DR'))
  reduceDmg *= (1 - evaReduce) * (1 - dr / 100)
  reduceDmg = Math.max(0.05, reduceDmg)

  return {
    ATK: atk,
    DEF: def,
    MAXHP: maxHp,
    BLOC: bloc,
    CRIT: crit,
    CRITDMG: critDmg,
    DPS: dps,
    REDUCDMG: reduceDmg,
    // 新增属性原样透出，供战斗与 UI 使用
    THORNS: g('THORNS'),
    LIFESTEAL: g('LIFESTEAL'),
    EVA: eva,
    DR: dr,
    PENETRATE: g('PENETRATE'),
    EXECUTE: g('EXECUTE'),
    REVIVE: g('REVIVE'),
    WRATH: g('WRATH'),
    LUCK: g('LUCK'),
    GOLDGAIN: g('GOLDGAIN'),
    REGEN: g('REGEN'),
    EXTRA_PICK: g('EXTRA_PICK'),
    mods: m
  }
}

/**
 * 解析式战斗
 * @param {Object} eff computeEffectiveAttribute 的结果
 * @param {Object} monster {HP, ATK}
 * @param {Object} opt {curHp, onKill}
 */
export function resolveBattle(eff, monster, opt = {}) {
  const curHp = Math.max(1, Number(opt.curHp || eff.MAXHP || 1))
  const mHp = Math.max(1, Number(monster.HP || 1))
  const mAtk = Math.max(1, Number(monster.ATK || 1))

  // 反伤：按怪物自身攻击力追加到玩家的等效 DPS
  const thornsDps = eff.THORNS / 100 * mAtk
  const playerDps = eff.DPS + thornsDps

  // 复仇之怒：生命越低越痛
  const hpPct = curHp / Math.max(1, eff.MAXHP)
  const wrathMul = 1 + (hpPct < 0.5 ? (0.5 - hpPct) / 0.5 * eff.WRATH / 100 : 0)
  const finalDps = playerDps * wrathMul

  let monsterDeadTime = mHp / finalDps
  // 处决：如果 0.6 秒内可以把怪物打到斩杀线，则直接结束战斗
  if (eff.EXECUTE > 0 && mHp - finalDps * 0.6 <= mHp * eff.EXECUTE / 100) {
    monsterDeadTime = Math.min(monsterDeadTime, 0.6)
  }
  // 生存时间：(当前生命 + 格挡) / 实际承伤比例 / 怪物攻击
  const playerSurviveTime = (curHp + eff.BLOC) / eff.REDUCDMG / mAtk

  let win = monsterDeadTime < playerSurviveTime
  let damageTaken = 0
  let heal = 0
  let revived = false
  let reviveHp = 0

  if (win) {
    damageTaken = Math.floor(monsterDeadTime * mAtk * eff.REDUCDMG) - eff.BLOC
    damageTaken = damageTaken < 1 ? 1 : damageTaken
    damageTaken = damageTaken > curHp ? curHp : damageTaken
    if (eff.LIFESTEAL > 0) {
      heal = Math.floor(mHp * eff.LIFESTEAL / 100)
      heal = Math.min(heal, Math.max(0, Math.floor(eff.MAXHP - curHp)))
    }
  } else {
    damageTaken = Math.floor(playerSurviveTime * mAtk * eff.REDUCDMG) - eff.BLOC
    damageTaken = damageTaken < 1 ? 1 : damageTaken
    // 二次呼吸：算出「刚好能赢」所需的生命，把它补上后继续打
    if (eff.REVIVE > 0) {
      const needHp = monsterDeadTime * mAtk * eff.REDUCDMG - eff.BLOC
      if (needHp > 1 && needHp < eff.MAXHP) {
        revived = true
        win = true
        reviveHp = Math.floor(needHp) + 1
        heal = Math.floor(reviveHp - curHp) + Math.floor(mHp * eff.LIFESTEAL / 100)
        heal = Math.min(heal, Math.max(0, Math.floor(eff.MAXHP - reviveHp)))
        damageTaken = Math.max(1, Math.floor(reviveHp - 1))
      }
    }
  }
  return {
    win,
    monsterDeadTime,
    playerSurviveTime,
    damageTaken,
    heal,
    revived,
    reviveHp,
    playerDps: finalDps
  }
}

/** 装备评分：把面板折算成单一数值，方便比较与一键整理 */
export function scoreEquipment(item) {
  if (!item || !item.type) {
    return 0
  }
  const q = (item.quality && item.quality.qualityCoefficient) || 1
  const calc = list => (list || []).reduce((sum, e) => sum + entryWeight(e), 0)
  const base = calc(item.type.entry) + calc(item.extraEntry)
  const str = item.enchantlvl ? 1 + (Math.pow(1.055, Math.pow(item.enchantlvl, 1.1)) - 1) * 0.9 : 1
  const setBonus = item.setId ? 60 : 0
  return Math.round((base * str + setBonus) * 1)
}

function entryWeight(e) {
  const v = Number(e.value || 0)
  switch (e.type) {
    case 'ATK':
      return v * 3
    case 'DEF':
      return v * 2.4
    case 'HP':
      return v * 0.5
    case 'CRIT':
      return v * 14
    case 'CRITDMG':
      return v * 5
    case 'BLOC':
      return v * 1.6
    case 'ATKPERCENT':
      return v * 3.2
    case 'DEFPERCENT':
      return v * 2.6
    case 'HPPERCENT':
      return v * 1.5
    case 'BLOCPERCENT':
      return v * 1.4
    default:
      return v
  }
}

/** 挂机/离线收益：把「刷本效率」折算成每小时金币 */
export function estimateGoldPerHour(attribute, playerLv, endlessLv, mods = {}) {
  const eff = computeEffectiveAttribute(attribute, mods)
  // 用无尽/最高等级的怪物体量估算：每场战斗耗时与金币
  const lv = Math.max(1, endlessLv * 5 || playerLv)
  const df = 1.4
  const monsterGold = Math.pow(lv, 1.16) * 13 * df
  const monsterHp = lv * Math.pow(lv, 1.1) * 18 * df
  const battleTime = Math.max(0.35, monsterHp / Math.max(1, eff.DPS))
  // 一场副本 5 个事件：战斗 + 行进（原版 battleTime 2000ms + move 50ms * 100 步）
  const perEvent = 2 + battleTime * 0.25 + 0.05
  const eventsPerRun = 5
  const runsPerHour = 3600 / (perEvent * eventsPerRun + 6)
  const goldPerRun = monsterGold * (4 + 3.8)
  const goldMul = 1 + Number(mods.GOLDGAIN || 0) / 100
  return Math.floor(goldPerRun * runsPerHour * goldMul)
}

export {
  PERCENT_STATS
}
