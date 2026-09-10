/**
 * 美术资源注册表
 *
 * 原版图标是 34×34 的免费像素素材，缩放后发糊、品质之间也没有视觉差异。
 * 这里做两件事：
 *  1) 用 generate 出的 4×4 sprite sheet 切片替换武器图标（src/assets/art/icons/weapon_XX.png），
 *     并按「品质 → 发光颜色」统一所有图标的外框；
 *  2) 集中登记场景图 / 英雄立绘，方便后续把防具与饰品的 sheet 接上（生成额度用完后补）。
 *
 * 注意：装备的 iconSrc 仍然写在 4 份 config 里（保持原版数据），这里只做「渲染期映射」，
 * 因此不影响存档结构与保真度校验。
 */

// 武器底材名 -> 切片图标（按 sheet 中的顺序：短剑/长剑/太刀/巨剑/冰刃/血晶/兽爪/战矛/
// 双匕/锈剑/符文剑/骨剑/波刃/骑士剑/黑铁/圣辉）
const WEAPON_ICONS = {
  '普通长剑': 0,
  '战士长剑': 1,
  '狱岩石太刀': 2,
  '紫炎波刃剑': 3,
  '冰晶之刃': 4,
  '赤柳血刃': 5,
  '毛毛的爪子': 6,
  '无名剑': 7,
  '死亡之刃': 8,
  '大师大冒险家之剑': 9,
  '霜龙利刃': 10,
  '数珠丸恒次': 11,
  '六翼天使武刃': 12,
  '埃苏莱布斯军刀': 13,
  '创世亡命剑': 14,
  '阿加雷斯血色巨剑': 15,
  '神龙纳格林之刃': 15
}

const HERO_PORTRAITS = {
  aiden: require('../art/hero_aiden.jpg'),
  violet: require('../art/hero_violet.jpg'),
  kagus: require('../art/hero_kagus.jpg'),
  liana: require('../art/hero_liana.jpg'),
  mordred: require('../art/hero_mordred.jpg'),
  naglin: require('../art/hero_naglin.jpg')
}

const SCENE = {
  splash: require('../art/splash.jpg'),
  map: require('../art/map.jpg'),
  arena: require('../art/arena.jpg')
}

// 品质发光色（用于统一外框，让 34px 像素图也有品质辨识度）
const QUALITY_GLOW = {
  '破旧': '#6f6f6f',
  '普通': '#cfd8dc',
  '神器': '#c04de0',
  '史诗': '#f78918',
  '独特': '#ff4d4d'
}

let weaponIconsReady = true
const weaponIcon = i => {
  try {
    return require(`../art/icons/weapon_${String(i).padStart(2, '0')}.png`)
  } catch (e) {
    weaponIconsReady = false
    return null
  }
}
const WEAPON_ICON_CACHE = {}
for (const k in WEAPON_ICONS) {
  WEAPON_ICON_CACHE[k] = weaponIcon(WEAPON_ICONS[k])
}

/**
 * 取装备渲染用图标：命中新美术则用切片，否则回落到原版 iconSrc
 * @param {Object} type 装备 type（含 name / iconSrc）
 */
export function resolveIcon(type) {
  if (!type) {
    return ''
  }
  const mapped = WEAPON_ICON_CACHE[type.name]
  if (mapped) {
    return mapped
  }
  return type.iconSrc
}

export {
  HERO_PORTRAITS,
  SCENE,
  QUALITY_GLOW,
  WEAPON_ICONS
}

export default {
  resolveIcon,
  HERO_PORTRAITS,
  SCENE,
  QUALITY_GLOW
}
