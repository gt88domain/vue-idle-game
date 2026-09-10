/**
 * 美术资源注册表
 *
 * 原版图标是 34×34 的免费像素素材，缩放后发糊、品质之间也没有视觉差异。
 * 这里做三件事：
 *  1) 把 generate 出的 sprite sheet 切好的图标（src/assets/art/icons/*.png）按**装备底材名**
 *     映射上去；表里没写的底材自动回落原版 iconSrc，所以可以随时增删而不影响数据。
 *  2) 集中登记场景图 / 英雄立绘。
 *  3) 提供「品质 → 发光色」常量，供主题层统一外框。
 *
 * 关键约束：**只做渲染期映射**。装备的 iconSrc 仍然原样写在 4 份 config 里、也原样进存档，
 * 因此不影响存档结构，也不影响 `npm run fidelity`（该脚本对比的是生成与属性数学，不碰渲染层）。
 *
 * 切图来源（可用 tools/slice-icons.js 重新生成）：
 *   sheet_weapons.png 4×4 / sheet_armor.png 4×4 / sheet_acc.png 6×3（前 10 格戒指，后 8 格项链）
 *
 * @author arena agent
 */

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

const ARMOR_ICONS = {
  '哈皮毛毛连身衣': 0, // 破布长袍（搞笑底材就该像个抹布）
  '天权轻甲': 1, // 皮甲
  '剑豪盔甲': 4, // 钢鳞甲
  '战士重铠': 5, // 白银板甲
  '隐武士铠甲': 6, // 黑铁板甲（红缨）
  '肃清者戎衣': 7, // 白金圣骑士甲
  '先代狂龙战士盔甲': 9, // 龙皮尖刺甲
  '芬撒里尔追踪者': 10, // 骨制部落甲
  '紫金守护胸甲': 11, // 金色圣日甲
  '红月的夜行衣': 13, // 暗影紫焰皮衣
  '赤柳血铠': 14, // 赤红角甲
  '争执连身衣': 15 // 独特 → 传说金光甲
}

const RING_ICONS = {
  '毛毛指环': 0,
  '生命指环': 1,
  '御魂之戒': 7, // 紫色符文戒
  '真·毛毛指环': 9, // 「真·」版本当然是闪光金币戒
  '死神名片戒指': 3, // 骷髅+骨坠
  '先驱者戒指': 6, // 蓝宝印章戒
  '素盏呜尊的意志': 8, // 双蛇缠绕（八岐大蛇梗）
  '月夜见尊的意志': 5 // 金戒嵌瞳
}

const NECK_ICONS = {
  '十字军项链': 3, // 银十字链
  '冰龙凝雪': 0, // 蓝涡法球
  '银魂之眼': 4, // 祖母绿水滴
  '十字旅团降魔项链': 6, // 圣日勋章
  '进阶黑暗龙王项链': 7, // 龙瞳
  '伟大单身成员的项链': 2, // 牙坠皮绳（朴素得恰到好处）
  '魔族之翼展': 5, // 黑曜石紫烟
  '伊帕娅之项链': 1 // 诅咒黑曜坠
}

// 底材名 -> [前缀, 序号]
const ICON_TABLE = {}
const feed = (map, prefix) => {
  Object.keys(map).forEach(name => {
    ICON_TABLE[name] = [prefix, map[name]]
  })
}
feed(WEAPON_ICONS, 'weapon')
feed(ARMOR_ICONS, 'armor')
feed(RING_ICONS, 'ring')
feed(NECK_ICONS, 'neck')

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

/**
 * 取装备渲染用图标：命中新美术则用切片，否则回落到原版 iconSrc。
 * 用 require 的静态上下文（webpack 会把 icons/ 目录打成 context map），
 * 缺文件时不抛错、直接回落，因此删图不会让 UI 崩。
 * @param {Object} type 装备 type（含 name / iconSrc）
 */
const NEW_ICON_CACHE = Object.create(null)
function resolveIcon(type) {
  if (!type) {
    return ''
  }
  const name = type.name
  if (!name) {
    return type.iconSrc || ''
  }
  if (name in NEW_ICON_CACHE) {
    return NEW_ICON_CACHE[name]
  }
  let src = type.iconSrc || ''
  const hit = ICON_TABLE[name]
  if (hit) {
    try {
      src = require(`../art/icons/${hit[0]}_${String(hit[1]).padStart(2, '0')}.png`)
    } catch (e) {
      /* 图没生成/被删：保持原版图标 */
    }
  }
  NEW_ICON_CACHE[name] = src
  return src
}

/** 该底材是否已有新手游美术（面板可用于标记「已重制」） */
export function hasNewArt(type) {
  return !!(type && type.name && ICON_TABLE[type.name])
}

export {
  HERO_PORTRAITS,
  SCENE,
  QUALITY_GLOW,
  WEAPON_ICONS,
  ARMOR_ICONS,
  RING_ICONS,
  NECK_ICONS,
  resolveIcon
}

export default {
  resolveIcon,
  hasNewArt,
  HERO_PORTRAITS,
  SCENE,
  QUALITY_GLOW
}
