import Vue from 'vue'
import Vuex from 'vuex'
import vueInstance from './main'
import handle from './assets/js/handle'
import {
  aggregateSetBonus
} from './assets/config/sets'
import {
  ABYSS_PERKS,
  aggregatePerks
} from './assets/config/abyss'
import {
  ACHIEVEMENTS,
  TITLES,
  ACHIEVEMENT_ECHO
} from './assets/config/achievements'
Vue.use(Vuex)

/** 加成池：装备百分比、套装、称号、深渊祭坛都汇入这里 */
const BONUS_KEYS = ['ATKPERCENT', 'DEFPERCENT', 'HPPERCENT', 'BLOCPERCENT', 'CRIT', 'CRITDMG',
  'THORNS', 'LIFESTEAL', 'EVA', 'DR', 'PENETRATE', 'EXECUTE', 'REVIVE', 'WRATH',
  'GOLDGAIN', 'REGEN', 'LUCK', 'ENCHANT', 'SPEED', 'EXTRA_PICK', 'DEATH_KEEP', 'OFFLINE_CAP'
]

function mergeBonus(target, src) {
  if (!src) {
    return target
  }
  Object.keys(src).forEach(k => {
    if (!isNaN(Number(src[k]))) {
      target[k] = (target[k] || 0) + Number(src[k])
    }
  })
  return target
}

export const initial_abyss = {
  echoes: 0,
  totalEchoes: 0,
  runs: 0,
  bestFloor: 0,
  wins: 0,
  perks: {},
  // 单局状态（不落盘，刷新即结束，避免刷存档卡祝福）
  run: null
}

export const initial_stats = {
  kills: 0,
  bossKills: 0,
  dungeons: 0,
  deaths: 0,
  goldEarned: 0,
  uniqueDrops: 0,
  epicDrops: 0,
  maxEnchant: 0,
  recasts: 0,
  setDrops: 0,
  offlineCount: 0,
  abyssFloors: 0,
  playTime: 0
}

var initial_weapon = {
    "lv": 1,
    itemType: 'weapon',
    "quality": {
      name: '破旧',
      qualityCoefficient: 0.7,
      probability: '0.25',
      color: '#a1a1a1',
      extraEntryNum: 1,
    },
    "type": {
      "name": "新手短剑",
      "des": "新手菜鸡使用的短剑",
      "iconSrc": "./icons/W_Sword001.png",
      "entry": [{
        "valCoefficient": 0.9,
        "value": 1,
        "showVal": "+1",
        "type": "ATK",
        "name": "攻击力"
      }]
    },
    "extraEntry": [{
      "value": 1,
      "showVal": "+1",
      "type": "ATK",
      "name": "攻击力"
    }]
  },
  initial_armor = {
    "lv": 1,
    itemType: 'armor',
    "quality": {
      name: '破旧',
      qualityCoefficient: 0.7,
      probability: '0.25',
      color: '#a1a1a1',
      extraEntryNum: 1,
    },
    "type": {
      "name": "新手布衣",
      "des": "新手菜鸡穿的普通衣物",
      "iconSrc": "./icons/A_A3.png",
      "entry": [{
        "valCoefficient": 0.9,
        "value": 1,
        "showVal": "+1",
        "type": "DEF",
        "name": "防御力"
      }]
    },
    "extraEntry": [{
      "type": "HP",
      "value": 10,
      "showVal": "+10",
      "name": "生命值"
    }, ]
  },
  initial_neck = {
    "lv": 1,
    itemType: 'neck',
    "quality": {
      name: '破旧',
      qualityCoefficient: 0.7,
      probability: '0.25',
      color: '#a1a1a1',
      extraEntryNum: 1,
    },
    "type": {
      "name": "新手项坠",
      "des": "一个普通的指环",
      "iconSrc": "./icons/Ac_3.png",
      "entry": [{
        "valCoefficient": 0.9,
        "value": 20,
        "showVal": "+20",
        "type": "HP",
        "name": "生命值"
      }]
    },
    "extraEntry": [{
      "type": "CRIT",
      "value": 10,
      "showVal": "+10%",
      "name": "暴击率"
    }]
  },
  initial_ring = {
    "lv": 1,
    itemType: 'ring',
    "quality": {
      name: '破旧',
      qualityCoefficient: 0.7,
      probability: '0.25',
      color: '#a1a1a1',
      extraEntryNum: 1,
    },
    "type": {
      "name": "新手指环",
      "des": "一个普通的指环",
      "iconSrc": "./icons/Ac_10.png",
      "entry": [{
        "valCoefficient": 0.9,
        "value": 20,
        "showVal": "+20",
        "type": "HP",
        "name": "生命值"
      }]
    },
    "extraEntry": [{
      "type": "CRIT",
      "value": 10,
      "showVal": "+10%",
      "name": "暴击率"
    }]
  };

export default new Vuex.Store({
  state: {
    bonus: {}, //套装 + 称号 + 深渊祭坛的聚合加成
    setDetail: [], //套装激活明细（UI 用）
    title: '', //当前佩戴的称号 id
    unlockedAchievements: {}, //已解锁成就
    abyss: JSON.parse(JSON.stringify(initial_abyss)), //深渊回廊
    stats: JSON.parse(JSON.stringify(initial_stats)), //统计数据
    settings: {
      autoFarm: false, //自动征战（挂机刷本）
      offlineGain: true, //离线收益
      autoKeepSet: true, //自动出售时保护套装部件
      compactSys: false
    },
    lastSaveTime: 0,
    needStrengthenEquipment: {}, //设定当前需要强化的装备
    sysInfo: [{
      type: '',
      msg: "欢迎你勇士，点击地图上的副本开始战斗。"
    }, {
      type: '',
      msg: "菜单栏可以刷新当前世界副本。"
    }],
    reincarnationAttribute: {
      'HP': 0,
      'ATK': 0,
      'CRIT': 0,
      'CRITDMG': 0,
      'DEF': 0,
      'BLOC': 0,
      'MOVESPEED': 0,
      'BATTLESPEED': 0,
    },
    reincarnation: {
      count: 0,
      point: 0,
    },
    playerAttribute: {
      lv: 1,
      GOLD: 0,
      healthRecoverySpeed: 1,
      endlessLv: 0,
      attribute: {
        CURHP: {
          value: 0,
          showValue: '',
        },
        MAXHP: {
          value: 0,
          showValue: '',
        },
        ATK: {
          value: 0,
          showValue: '',
        },
        DEF: {
          value: 0,
          showValue: '',
        },
        REDUCDMG: { //根据护甲计算的减伤比例
          value: 0,
          showValue: '',
        },
        CRIT: {
          value: 0,
          showValue: '',
        },
        CRITDMG: {
          value: 0,
          showValue: '',
        },
        BLOC: {
          value: 0,
          showValue: '0',
        },
        EVA: {
          value: 0,
          showValue: '',
        },
      },
      weapon: initial_weapon,
      armor: initial_armor,
      ring: initial_ring,
      neck: initial_neck,
    }
  },
  mutations: {
    set_player_weapon(state, data) {
      this.state.playerAttribute.weapon = data
      vueInstance.$store.commit('set_player_attribute')
    },
    set_player_armor(state, data) {
      this.state.playerAttribute.armor = data
      vueInstance.$store.commit('set_player_attribute')
    },
    set_player_ring(state, data) {
      this.state.playerAttribute.ring = data
      vueInstance.$store.commit('set_player_attribute')
    },
    set_player_neck(state, data) {
      this.state.playerAttribute.neck = data || initial_neck
      vueInstance.$store.commit('set_player_attribute')
    },
    set_player_rein_attribute(state, data) {
      this.state.reincarnationAttribute = data
      vueInstance.$store.commit('set_player_attribute')
    },
    set_player_rein(state, data) {
      this.state.reincarnation = data
    },
    set_player_attribute(state, data) {
      var p = state.playerAttribute
      // ==== 新增：聚合套装 / 称号 / 深渊祭坛加成（全部为 0 时与原版完全一致）====
      const equipped = [p.weapon, p.armor, p.ring, p.neck].filter(v => v && JSON.stringify(v) != '{}')
      const setAgg = aggregateSetBonus(equipped)
      const bonus = {}
      mergeBonus(bonus, setAgg.bonus)
      mergeBonus(bonus, TITLES[state.title] ? TITLES[state.title].mods : null)
      mergeBonus(bonus, aggregatePerks(state.abyss.perks))
      state.bonus = bonus
      state.setDetail = setAgg.detail
      var warpon = p.weapon,
        armor = p.armor,
        ring = p.ring,
        neck = p.neck,
        entry = [],
        chp = state.playerAttribute.attribute.CURHP.value,
        mhp = state.playerAttribute.attribute.MAXHP.value,
        rA = state.reincarnationAttribute,
        hpP;
      if (chp && mhp) {
        hpP = chp / mhp
      }

      var attribute = {
        CURHP: {
          value: 0,
          showValue: '',
        },
        MAXHP: {
          value: 0 + rA.HP,
          showValue: '',
        },
        ATK: {
          value: 0 + rA.ATK,
          showValue: 0 + rA.ATK,
        },
        DEF: {
          value: 0 + rA.DEF,
          showValue: 0 + rA.DEF,
        },
        CRIT: {
          value: 0 + rA.CRIT,
          showValue: '+' + 0 + rA.CRIT + '%',
        },
        CRITDMG: {
          value: 0 + rA.CRITDMG,
          showValue: '+' + 0 + rA.CRITDMG + '%',
        },
        EVA: {
          value: 0,
          showValue: '',
        },
        BLOC: {
          value: 0 + rA.BLOC,
          showValue: 0 + rA.BLOC,
        },
      }


      let warponStrEntry = vueInstance.$deepCopy(warpon.type.entry)
      let armorStrEntry = vueInstance.$deepCopy(armor.type.entry)
      let ringStrEntry = vueInstance.$deepCopy(ring.type.entry)
      let neckStrEntry = vueInstance.$deepCopy(neck.type.entry)
      handle.CalculateStrAttr(warponStrEntry, warpon.enchantlvl || 0)
      handle.CalculateStrAttr(armorStrEntry, armor.enchantlvl || 0)
      handle.CalculateStrAttr(ringStrEntry, ring.enchantlvl || 0)
      handle.CalculateStrAttr(neckStrEntry, neck.enchantlvl || 0)

      entry = [].concat(warponStrEntry).concat(warpon.extraEntry).concat(armorStrEntry).concat(armor.extraEntry).concat(ringStrEntry).concat(ring.extraEntry).concat(neckStrEntry).concat(neck.extraEntry)

      // 命中几率初始为100%，用来计算最终的闪避几率
      let HitChance = 1
      entry.map(item => {
        switch (item.type) {
          case 'ATK':
            attribute.ATK.value += Number(item.value)
            attribute.ATK.showValue = '+' + (attribute.ATK.value)
            break;
          case 'DEF':
            attribute.DEF.value += Number(item.value)
            attribute.DEF.showValue = '+' + (attribute.DEF.value)
            break;
          case 'HP':
            attribute.MAXHP.value += Number(item.value)
            attribute.MAXHP.showValue = '+' + (attribute.MAXHP.value)
            break;
          case 'CRIT':
            attribute.CRIT.value += Number(item.value)
            attribute.CRIT.showValue = '+' + attribute.CRIT.value + '%'
            break;
          case 'CRITDMG':
            attribute.CRITDMG.value += Number(item.value)
            attribute.CRITDMG.showValue = '+' + attribute.CRITDMG.value + '%'
            break;
          case 'EVA':
            HitChance = HitChance * (1 - item.value / 100)
            break;
          case 'BLOC':
            attribute.BLOC.value += Number(item.value)
            attribute.BLOC.showValue = (attribute.BLOC.value)
            break;
          default:
            break;
        }
      })
      var ATKPERCENT = 0,
        DEFPERCENT = 0,
        HPPERCENT = 0,
      BLOCPERCENT = 0
      entry.map(item => {
        switch (item.type) {
          case 'ATKPERCENT':
            ATKPERCENT += Number(item.value)
            break;
          case 'DEFPERCENT':
            DEFPERCENT += Number(item.value)
            break;
          case 'HPPERCENT':
            HPPERCENT += Number(item.value)
            break;
          case 'BLOCPERCENT':
            BLOCPERCENT += Number(item.value)
            break;
          default:
            break;
        }
      })
      // ==== 新增：套装/称号/祭坛的百分比并入同一套池子（沿用原版「先加总再乘算」的规则）====
      ATKPERCENT += Number(bonus.ATKPERCENT || 0)
      DEFPERCENT += Number(bonus.DEFPERCENT || 0)
      HPPERCENT += Number(bonus.HPPERCENT || 0)
      BLOCPERCENT += Number(bonus.BLOCPERCENT || 0)
      attribute.ATK.value = parseInt(attribute.ATK.value * (100 + ATKPERCENT) / 100)
      attribute.ATK.showValue = '+' + (attribute.ATK.value)
      attribute.DEF.value = parseInt(attribute.DEF.value * (100 + DEFPERCENT) / 100)
      attribute.DEF.showValue = '+' + (attribute.DEF.value)
      attribute.MAXHP.value = parseInt(attribute.MAXHP.value * (100 + HPPERCENT) / 100)
      attribute.MAXHP.showValue = '+' + (attribute.MAXHP.value)
      attribute.BLOC.value = parseInt(attribute.BLOC.value * (100 + BLOCPERCENT) / 100)
      attribute.BLOC.showValue = '+' + (attribute.BLOC.value)
      attribute.EVA.value = ((1 - HitChance) * 100).toFixed(1)
      attribute.EVA.showValue = ((1 - HitChance) * 100).toFixed(1) + '%'

      // console.log(vueInstance.$store.state)
      attribute.MAXHP.value += 200
      if (hpP) {

        attribute.CURHP.value = parseInt(attribute.MAXHP.value * hpP)
        attribute.CURHP.showValue = '+' + (attribute.CURHP.value)
      } else {
        attribute.CURHP = vueInstance.$deepCopy(attribute.MAXHP)
      }

      // ==== 新增：暴击/爆伤附加（套装、祝福称号等）====
      attribute.CRIT.value += Number(bonus.CRIT || 0)
      attribute.CRIT.showValue = '+' + attribute.CRIT.value + '%'
      // 初始暴击伤害150%
      attribute.CRITDMG.value += 150 + Number(bonus.CRITDMG || 0)
      attribute.CRITDMG.showValue = '+' + attribute.CRITDMG.value + '%'

      // 回血速度加成（原版固定 2%/s，这里按 REGEN% 放大）
      state.playerAttribute.healthRecoverySpeed = 1 + Number(bonus.REGEN || 0) / 100
      var atk = attribute.ATK.value,
        crit = attribute.CRIT.value,
        critdmg = attribute.CRITDMG.value
      // 暴击率最多100%
      if (crit > 100) {
        crit = 100
      }
      attribute.DPS = parseFloat((1 - crit / 100) * atk * 1 + crit / 100 * (critdmg) / 100 * atk * 1)
      var armor = attribute.DEF.value

      //承受伤害比例
      // attribute.REDUCDMG = 1 - 0.06 * armor / (1 + (0.06 * armor))
      attribute.REDUCDMG = 1 - 0.05 * armor / (1 + (0.0525 * armor))

      // ==== 新增：闪避 + 固定减伤 参与承伤计算（非线性，收益递减）====
      const evaTotal = Math.min(75, Number(attribute.EVA.value || 0) + Number(bonus.EVA || 0))
      attribute.EVA.value = evaTotal.toFixed(1)
      attribute.EVA.showValue = evaTotal.toFixed(1) + '%'
      attribute.EVA.bonus = Number(bonus.EVA || 0)
      const drTotal = Math.min(70, Number(bonus.DR || 0))
      attribute.DR = drTotal
      if (evaTotal > 0 || drTotal > 0) {
        attribute.REDUCDMG = attribute.REDUCDMG * (1 - 0.6 * evaTotal / (evaTotal + 45)) * (1 - drTotal / 100)
      }
      // 新属性透出给战斗解算使用
      attribute.THORNS = Number(bonus.THORNS || 0)
      attribute.LIFESTEAL = Number(bonus.LIFESTEAL || 0)
      attribute.PENETRATE = Number(bonus.PENETRATE || 0)
      attribute.WRATH = Number(bonus.WRATH || 0)
      attribute.GOLDGAIN = Number(bonus.GOLDGAIN || 0)
      attribute.LUCK = Number(bonus.LUCK || 0)
      attribute.ENCHANT = Number(bonus.ENCHANT || 0)
      attribute.SPEED = Number(bonus.SPEED || 0)
      // DPS 计入反伤/穿透期望（反伤按怪物攻击力换算，战斗中再精确处理）
      attribute.DPSBASE = attribute.DPS

      // state.playerAttribute.attribute=attribute
      // vueInstance.$store.commit("set_player_attribute", attribute);
      this.state.playerAttribute.attribute = attribute
    },
    set_sys_info(state, data) {
      this.state.sysInfo.push(data);
      var time = +new Date()
      var date = new Date(time + 8 * 3600 * 1000); // 增加8小时
      this.state.sysInfo[this.state.sysInfo.length - 1].time = date.toJSON().substr(11, 8).replace('T', ' ')
      if (this.state.sysInfo.length > 50) {
        this.state.sysInfo.shift()
      }
    },
    clear_sys_info(state, data) {
      this.state.sysInfo.splice(1, this.state.sysInfo.length)
    },
    set_player_gold(state, data) {
      this.state.playerAttribute.GOLD += parseInt(data);
    },
    reset_player_gold(state, data) {
      this.state.playerAttribute.GOLD = parseInt(data);
    },
    reset_player_equi() {
      vueInstance.$store.commit('set_player_weapon', initial_weapon)
      vueInstance.$store.commit('set_player_armor', initial_armor)
      vueInstance.$store.commit('set_player_ring', initial_ring)
      vueInstance.$store.commit('set_player_neck', initial_neck)
      vueInstance.$store.commit('set_player_lv', 1)
    },
    set_endless_lv(state, data) {
      this.state.playerAttribute.endlessLv = parseInt(data) < 1 ? 1 : parseInt(data);
    },
    set_player_lv(state, data) {
      data = data < 1 ? 1 : data
      this.state.playerAttribute.lv = parseInt(data || 1);
    },
    set_operator_schema(state, data) {
      this.state.operatorSchemaIsMobile = data;
    },
    set_need_strengthen_equipment(state, data) {
      this.state.needStrengthenEquipment = data;
    },
    // ===================== 新增玩法相关 mutations =====================
    // 佩戴/卸下称号
    set_title(state, data) {
      state.title = data || ''
      this.commit('set_player_attribute')
    },
    // 深渊：通用写入
    set_abyss(state, data) {
      Object.assign(state.abyss, data || {})
      this.commit('set_player_attribute')
    },
    buy_abyss_perk(state, perkId) {
      const perk = ABYSS_PERKS.find(v => v.id === perkId)
      if (!perk) {
        return
      }
      const lv = state.abyss.perks[perkId] || 0
      if (lv >= perk.max) {
        return
      }
      const cost = Math.floor(perk.baseCost * Math.pow(perk.costK, lv))
      if (state.abyss.echoes < cost) {
        return
      }
      state.abyss.echoes -= cost
      this.state.abyss.perks = Object.assign({}, state.abyss.perks, {
        [perkId]: lv + 1
      })
      this.commit('set_player_attribute')
      this.commit('set_sys_info', {
        msg: `祭坛回应了你：「${perk.name}」提升到 ${lv + 1} 级。`,
        type: 'win'
      })
    },
    add_echoes(state, num) {
      num = parseInt(num) || 0
      state.abyss.echoes += num
      if (num > 0) {
        state.abyss.totalEchoes += num
      }
    },
    // 统计与成就：所有玩法事件都通过 report 上报
    report(state, data) {
      const {
        key,
        num = 1,
        check = true
      } = data || {}
      if (key && state.stats.hasOwnProperty(key)) {
        if (key == 'maxEnchant' || key == 'playTime') {
          state.stats[key] = Math.max(state.stats[key], Number(num))
        } else {
          state.stats[key] = state.stats[key] + Number(num)
        }
      }
      check && this.commit('check_achievements')
    },
    check_achievements(state, force) {
      const snapshot = {
        stats: state.stats,
        attribute: state.playerAttribute.attribute,
        playerAttribute: state.playerAttribute,
        reincarnation: state.reincarnation,
        abyss: state.abyss,
        setDetail: state.setDetail
      }
      const newly = []
      ACHIEVEMENTS.forEach(item => {
        if (state.unlockedAchievements[item.id]) {
          return
        }
        let cur = 0
        try {
          cur = Number(item.metric(snapshot)) || 0
        } catch (e) {
          cur = 0
        }
        if (cur >= item.goal) {
          state.unlockedAchievements = Object.assign({}, state.unlockedAchievements, {
            [item.id]: Date.now()
          })
          newly.push(item)
        }
      })
      if (!newly.length) {
        return
      }
      newly.forEach(item => {
        this.commit('add_echoes', ACHIEVEMENT_ECHO)
        this.commit('set_sys_info', {
          msg: `达成成就「${item.name}」，获得 ${ACHIEVEMENT_ECHO} 回响${item.title ? '，并解锁称号「' + TITLES[item.title].name + '」' : ''}`,
          type: 'win'
        })
      })
      return newly
    },
    // 设置开关
    set_settings(state, data) {
      state.settings = Object.assign({}, state.settings, data || {})
    },
    set_last_save_time(state, data) {
      state.lastSaveTime = Number(data) || 0
    },
    set_player_curhp(state, data) {
      var CURHP = this.state.playerAttribute.attribute.CURHP,
        MAXHP = this.state.playerAttribute.attribute.MAXHP
      if (data == 'dead') {
        CURHP.value = 1
      }else if(data == 'full'){
        CURHP.value = MAXHP.value
      }
       else {
        CURHP.value += Number(data);
        CURHP.value = parseInt(CURHP.value)
        if (CURHP.value > MAXHP.value) {
          CURHP.value = MAXHP.value
        }
      }

    }
  },
})