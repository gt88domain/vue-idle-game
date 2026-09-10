/**
 * 离线挂机收益（新增玩法）
 *
 * 原版是「关掉页面就暂停」的：后台只停掉回血，收益完全为 0。
 * 挂机放置游戏的正字应该是「不玩也在前进」，所以这里补上离线结算：
 *  - 用你当前最强的挂机场景（无尽层数优先，其次人物等级对应的副本体量）估算金币/小时；
 *  - 离线效率为在线的 45%（比手动刷本略低，避免离线取代游玩）；
 *  - 默认最多累计 8 小时，可用深渊祭坛「时空凝滞」延长到 16 小时；
 *  - 同时结算离线期间的生命恢复（原版的每秒回血在后台是停摆的）。
 *
 * @author arena agent（基于 couy 的 vue-idle-game, MIT）
 */

const OFFLINE_EFFICIENCY = 0.45
const BASE_CAP_HOURS = 8

/** 单位：金币/小时（在线）——与副本内单场战斗的掉落曲线保持一致 */
export function estimateOnlineGoldPerHour(playerLv, endlessLv, attribute, bonus) {
  const lv = Math.max(1, parseInt(endlessLv) ? parseInt(endlessLv) * 5 : parseInt(playerLv) || 1)
  const isEndless = !!parseInt(endlessLv)
  const df = isEndless ? 1.4 : 1
  // 怪物金币：parseInt(lv**1.16 * (rand*5+11) * df)，取期望 13.5；首领约为 33
  const goldPerKill = Math.pow(lv, 1.16) * (isEndless ? 33 : 13.5) * df
  const killsPerRun = 5
  const runGold = goldPerKill * (killsPerRun - 1) + goldPerKill * 2.45
  // 单场耗时：2s 战斗 + 推进；无尽金币倍率 2.6
  const monsterHp = lv * Math.pow(lv, 1.1) * 18 * df
  const dps = Math.max(1, (attribute && attribute.DPS) || 1)
  const battleSec = Math.max(0.3, monsterHp / dps)
  const runSec = battleSec * killsPerRun + killsPerRun * 0.25 + 4
  const runsPerHour = 3600 / runSec
  const goldMul = (1 + Number((bonus && bonus.GOLDGAIN) || 0) / 100) * (isEndless ? 2.6 : 1)
  return {
    lv,
    isEndless,
    goldPerHour: Math.floor(runGold * runsPerHour * goldMul),
    battleSec
  }
}

/**
 * 结算离线收益
 * @param {number} lastTime 上次保存时间戳
 * @param {Object} ctx {playerLv, endlessLv, attribute, bonus, abyssPerks, settings}
 */
export function calcOfflineGain(lastTime, ctx) {
  const now = Date.now()
  if (!lastTime || !ctx || !ctx.settings || ctx.settings.offlineGain === false) {
    return null
  }
  const capHours = BASE_CAP_HOURS + Number((ctx.bonus && ctx.bonus.OFFLINE_CAP) || 0)
  let elapsed = (now - lastTime) / 3600000
  if (!(elapsed > 0)) {
    return null
  }
  // 1 分钟以内不结算，避免刷新页面反复弹窗
  if (elapsed * 60 < 1) {
    return null
  }
  const capped = Math.min(elapsed, capHours)
  const est = estimateOnlineGoldPerHour(ctx.playerLv, ctx.endlessLv, ctx.attribute, ctx.bonus)
  const gold = Math.floor(est.goldPerHour * capped * OFFLINE_EFFICIENCY)
  if (gold <= 0) {
    return null
  }
  return {
    gold,
    hours: capped,
    realHours: elapsed,
    capped: elapsed > capHours,
    capHours,
    dungeonLv: est.lv,
    endless: est.isEndless,
    // 离线回血：按 healthRecoverySpeed 折算，直接视为满血（长时间离开）
    fullHeal: capped > 0.05
  }
}
