/**
 * 套装配置（新增玩法）
 *
 * 原版在副本信息里写着「困难，极难下有几率出现套装装备(下个版本加入)」，
 * 但作者并没有实现它。这里把它补齐：
 *  - 套装部件直接复用原版已有的装备类型（保留原名字/图标/基础词条），
 *    被标记为套装部件后才会附带套装效果；
 *  - 只有在「困难 / 极难」副本中掉落时才会随机附带套装身份，越难概率越高；
 *  - 2 件 / 4 件激活对应加成，加成来自同一份属性管线（store -> set_player_attribute）。
 *
 * @author arena agent（基于 couy 的 vue-idle-game, MIT）
 */

// 新增属性类型说明：
// THORNS    反伤（按怪物攻击力的百分比追加为额外 DPS）
// LIFESTEAL 吸血（击杀后按造成伤害的百分比回复生命）
// EVA       闪避（降低预期承伤）
// GOLDGAIN  金币获取加成 %
// REGEN     每秒回血速度加成 %
// LUCK      幸运（提升独特装备掉率与重铸出高品质词条的概率）
export const SETS = [{
    id: 'berserk',
    name: '狂战之怒',
    color: '#ff5b5b',
    des: '以伤换伤的狂徒，越打越疯。',
    pieces: {
      weapon: '狱岩石太刀',
      armor: '战士重铠',
      ring: '御魂之戒',
      neck: '十字军项链'
    },
    bonus: {
      2: {
        ATKPERCENT: 12,
        CRITDMG: 15
      },
      4: {
        THORNS: 18,
        CRITDMG: 25,
        ATKPERCENT: 10
      }
    }
  },
  {
    id: 'shadow',
    name: '影袭之约',
    color: '#7ce8ff',
    des: '刀尖舔血，却总能在致命一击前消失。',
    pieces: {
      weapon: '冰晶之刃',
      armor: '天权轻甲',
      ring: '毛毛指环',
      neck: '冰龙凝雪'
    },
    bonus: {
      2: {
        EVA: 6,
        CRIT: 5
      },
      4: {
        EVA: 8,
        LIFESTEAL: 12,
        CRIT: 7
      }
    }
  },
  {
    id: 'sanctuary',
    name: '圣殿守卫',
    color: '#ffd76b',
    des: '只要还没倒下，就还能再挡一下。',
    pieces: {
      weapon: '战士长剑',
      armor: '紫金守护胸甲',
      ring: '生命指环',
      neck: '银魂之眼'
    },
    bonus: {
      2: {
        DEFPERCENT: 25,
        BLOCPERCENT: 15
      },
      4: {
        HPPERCENT: 20,
        REGEN: 60,
        DEFPERCENT: 15
      }
    }
  },
  {
    id: 'greed',
    name: '贪婪之旅',
    color: '#8dff9e',
    des: '钱就是万能的，这在原版里是句实话。',
    pieces: {
      weapon: '毛毛的爪子',
      armor: '哈皮毛毛连身衣',
      ring: '真·毛毛指环',
      neck: '伟大单身成员的项链'
    },
    bonus: {
      2: {
        GOLDGAIN: 30
      },
      4: {
        GOLDGAIN: 45,
        LUCK: 60,
        REGEN: 100
      }
    }
  }
];

const SET_BY_ID = SETS.reduce((acc, set) => (acc[set.id] = set, acc), {})

/** 通过 item type 名称反查它属于哪个套装部件 */
export function matchSetPiece(itemType, typeName) {
  for (let i = 0; i < SETS.length; i++) {
    if (SETS[i].pieces[itemType] === typeName) {
      return SETS[i]
    }
  }
  return null
}

export function getSetById(id) {
  return SET_BY_ID[id] || null
}

export function getSetByName(name) {
  return SETS.find(v => v.name === name) || null
}

/** 某职业槽位下所有可作为套装部件的装备名（用于掉落时定向生成） */
export function getPieceNamesBySlot(itemType) {
  const list = []
  SETS.forEach(set => {
    if (set.pieces[itemType]) {
      list.push(set.pieces[itemType])
    }
  })
  return list
}

// 这些部件在原版配置里属于 uniqueCategory，只有「独特」品质才能作为底材出现
const UNIQUE_ONLY_PIECES = ['真·毛毛指环', '伟大单身成员的项链']

/**
 * 为该槽位随机一个可用的套装部件（品质要匹配底材所在的分类，否则会掉不成套装）
 * @param {string} itemType weapon|armor|ring|neck
 * @param {boolean} isUnique 本次掉落是否为「独特」品质
 */
export function rollSetPiece(itemType, isUnique) {
  const candidates = SETS
    .map(set => ({
      set,
      typeName: set.pieces[itemType]
    }))
    .filter(v => !!v.typeName)
    .filter(v => isUnique ? UNIQUE_ONLY_PIECES.indexOf(v.typeName) > -1 : UNIQUE_ONLY_PIECES.indexOf(v.typeName) == -1)
  if (!candidates.length) {
    return null
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  return {
    setId: pick.set.id,
    setName: pick.set.name,
    typeName: pick.typeName
  }
}

/**
 * 汇总已穿装备的套装层数 -> 加成对象
 * @param {Array} equippedList [{setId,...}]
 */
export function aggregateSetBonus(equippedList) {
  const count = {}
  equippedList.forEach(item => {
    if (item && item.setId) {
      count[item.setId] = (count[item.setId] || 0) + 1
    }
  })
  const bonus = {}
  const detail = []
  Object.keys(count).forEach(id => {
    const set = getSetById(id)
    if (!set) {
      return
    }
    const tiers = []
    Object.keys(set.bonus).forEach(tier => {
      if (count[id] >= Number(tier)) {
        tiers.push(Number(tier))
        const map = set.bonus[tier]
        Object.keys(map).forEach(key => {
          bonus[key] = (bonus[key] || 0) + map[key]
        })
      }
    })
    detail.push({
      id,
      name: set.name,
      color: set.color,
      des: set.des,
      num: count[id],
      tiers
    })
  })
  return {
    bonus,
    detail,
    count
  }
}
