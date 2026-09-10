/**
 * 复刻保真度校验（fidelity check）
 *
 * 目的：证明「在原版之上加新玩法」没有改坏原版数值管线。
 * 做法：把 HEAD（=上游 034b1e4 原版）与当前工作区的两套实现，
 *      在同一个种子随机数下跑同样的流程，逐字段对比结果。
 *
 * 覆盖：
 *  1) 四个部位装备生成（createQua / createLv / createType / createExtraEntry / createNewItem）
 *  2) 角色属性聚合（store.set_player_attribute：ATK/DEF/HP/CRIT/CRITDMG/BLOC/DPS/REDUCDMG）
 *  3) 副本生成、词条生成、强化曲线（handle.js —— 断言文件未被修改）
 *
 * 用法：node tools/fidelity-check.js   （或 npm run fidelity）
 */
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

/**
 * 对比基准：上游原版提交（而不是 HEAD，否则改完代码就变成"自己和自己比"了）
 * 优先级：环境变量 FIDELITY_BASE > 与 master 的 merge-base > master > HEAD
 */
function resolveBase() {
  const tries = [
    process.env.FIDELITY_BASE,
    execSync('git merge-base HEAD master', { cwd: ROOT }).toString().trim(),
    'master'
  ]
  for (const t of tries) {
    if (!t) continue
    try {
      execSync(`git cat-file -e ${t}:src/store.js`, { cwd: ROOT })
      return t
    } catch (e) { /* try next */ }
  }
  return 'HEAD'
}
const BASE = resolveBase()
const compiler = require(path.join(ROOT, 'node_modules/vue-template-compiler'))

/** 可复现随机数（mulberry32） */
function rng(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6D2B79F5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function ref(rev, file) {
  return execSync(`git show ${rev}:${file}`, { cwd: ROOT, maxBuffer: 1 << 26 }).toString('utf8')
}
const UPSTREAM = BASE
function cur(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8')
}

/** 把 .vue 的 <script> 抽出来，抹掉 import，返回可执行的模块对象 */
function loadScript(code, inject) {
  const parts = compiler.parseComponent(code)
  let js = (parts.script && parts.script.content) || ''
  js = js.replace(/^\s*import[^;]*?from\s*['"][^'"]+['"];?\s*$/gm, '')
  js = js.replace(/^\s*import\s*['"][^'"]+['"];?\s*$/gm, '')
  js = js.replace(/^\s*export default/m, 'module.exports = ')
  const Module = require('module')
  const m = new Module('fidelity-inline')
  m._compile = null
  const factory = new Function('module', 'exports', 'require', '__inj', `
    ${Object.keys(inject || {}).map(k => `var ${k} = __inj[${JSON.stringify(k)}];`).join('\n')}
    ${js}
  `)
  const obj = { exports: {} }
  factory(obj, obj.exports, require, inject || {})
  return obj.exports
}

function evalConfig(code) {
  // config 文件形如 export const xxx = {...}，直接转成可执行
  const src = code.replace(/export\s+const/g, 'const') + '\nmodule.exports = {' +
    (code.match(/export\s+const\s+(\w+)/g) || []).map(v => v.replace(/export\s+const\s+/, '')).join(',') + '}'
  const out = { exports: {} }
  new Function('module', 'exports', src)(out, out.exports)
  return out.exports
}

const IGNORED_KEYS = new Set(['setId', 'setName', 'setColor'])

function normalize(obj) {
  if (Array.isArray(obj)) return obj.map(normalize)
  if (obj && typeof obj === 'object') {
    const o = {}
    Object.keys(obj).sort().forEach(k => {
      if (IGNORED_KEYS.has(k)) return
      o[k] = normalize(obj[k])
    })
    return o
  }
  return obj
}

const results = []
function check(name, pass, detail) {
  results.push({ name, pass, detail })
  console.log(`${pass ? '  ✓' : '  ✗'} ${name}${detail ? '  ' + detail : ''}`)
}

// ---------------------------------------------------------------- 1) 装备生成
console.log(`对比基准：${BASE.split('\n')[0].slice(0,12)}（上游原版）`)
console.log('\n[1] 装备生成器（4 部位 × 5 品质 × 多种等级）')
const SLOTS = ['weapon', 'armor', 'ring', 'neck']
const PANEL = {
  weapon: 'src/views/component/weaponPanel.vue',
  armor: 'src/views/component/armorPanel.vue',
  ring: 'src/views/component/ringPanel.vue',
  neck: 'src/views/component/neckPanel.vue'
}
const CFG = {
  weapon: 'src/assets/config/equiAttributeWeapon.js',
  armor: 'src/assets/config/equiAttributeArmor.js',
  ring: 'src/assets/config/equiAttributeRing.js',
  neck: 'src/assets/config/equiAttributeNeck.js'
}

function makePanel(code, cfgMod, extraInject) {
  const mixin = cfgMod[Object.keys(cfgMod)[0]]
  const def = loadScript(code, Object.assign({
    [Object.keys(cfgMod)[0]]: mixin
  }, extraInject || {}))
  const base = typeof mixin.data === 'function' ? mixin.data() : {}
  const ctx = Object.assign({}, base, def.methods || {}, def.data ? def.data() : {}, {
    $deepCopy: d => JSON.parse(JSON.stringify(d)),
    $store: { state: { setDetail: [] } }
  })
  // 把 mixin 的 methods 也带上（若有）
  Object.assign(ctx, mixin.methods || {})
  return ctx
}

const setsMod = (() => {
  const code = cur('src/assets/config/sets.js').replace(/export (const|function)/g, '$1')
  const o = { exports: {} }
  new Function('module','exports', code + '\nmodule.exports={SETS:SETS,matchSetPiece:matchSetPiece,getSetById:getSetById};')(o, o.exports)
  return o.exports
})()
const STUBS = {
  matchSetPiece: setsMod.matchSetPiece,
  getSetById: setsMod.getSetById,
  SETS: setsMod.SETS,
  scoreEquipment: () => 0,
  assist: { methods: {} }
}
let genMismatch = 0
let genRuns = 0
SLOTS.forEach(slot => {
  const cfgOrig = evalConfig(ref(UPSTREAM, CFG[slot]))
  const cfgCur = evalConfig(cur(CFG[slot]))
  for (let round = 0; round < 2; round++) {
    const seed = 1000 + round * 7 + slot.length
    Math.random = rng(seed)
    const a = makePanel(ref(UPSTREAM, PANEL[slot]), cfgOrig)
    Math.random = rng(seed)
    const b = makePanel(cur(PANEL[slot]), cfgCur, STUBS)
    for (let q = 0; q <= 4; q++) {
      for (const lv of [1, 7, 23, 60, 110]) {
        if (q === 4 && slot === 'weapon') { /* 独特走 uniqueCategory，也测 */ }
        Math.random = rng(seed + q * 131 + lv)
        let ia, ib
        try { ia = a.createNewItem(q, lv) } catch (e) { ia = 'ERR:' + e.message }
        Math.random = rng(seed + q * 131 + lv)
        try { ib = b.createNewItem(q, lv) } catch (e) { ib = 'ERR:' + e.message }
        genRuns++
        const na = normalize(JSON.parse(String(ia).startsWith('{') ? ia : '{}'))
        const nb = normalize(JSON.parse(String(ib).startsWith('{') ? ib : '{}'))
        const same = ia.startsWith('ERR') === ib.startsWith('ERR') && JSON.stringify(na) === JSON.stringify(nb)
        if (!same) {
          genMismatch++
          if (genMismatch <= 3) {
            console.log(`    ✗ ${slot} q${q} lv${lv}\n      HEAD: ${JSON.stringify(na).slice(0, 300)}\n      CUR : ${JSON.stringify(nb).slice(0, 300)}`)
          }
        }
      }
    }
  }
})
check(`装备生成结果与原版一致（${genRuns} 组，忽略套装标记字段）`, genMismatch === 0, genMismatch ? `${genMismatch} 处不同` : '0 差异')

// ---------------------------------------------------------------- 2) 属性聚合
console.log('\n[2] 角色属性聚合 store.set_player_attribute')

function extractMutation(code, name) {
  const i = code.indexOf(name + '(state, data) {')
  if (i < 0) throw new Error('mutation not found: ' + name)
  let depth = 0
  let j = code.indexOf('{', i)
  const start = j
  for (; j < code.length; j++) {
    if (code[j] === '{') depth++
    else if (code[j] === '}') {
      depth--
      if (depth === 0) break
    }
  }
  return code.slice(i + (name + '(state, data) ').length, start) + code.slice(start, j + 1)
}

const handle = (() => {
  const code = cur('src/assets/js/handle.js').replace(/export default \{/, 'module.exports = {')
  const o = { exports: {} }
  new Function('module', 'exports', code)(o, o.exports)
  return o.exports
})()

// 新增玩法模块用「真实实现」而不是桩函数：这样才能证明新系统在零值时与原版逐位一致
const realCfg = (() => {
  const load = f => {
    try {
      return require(path.join(ROOT, f))
    } catch (e) {
      return null
    }
  }
  return {
    sets: load('src/assets/config/sets.js'),
    abyss: load('src/assets/config/abyss.js'),
    ach: load('src/assets/config/achievements.js'),
    heroes: load('src/assets/config/heroes.js')
  }
})()

const ZERO_HERO = {
  ATK: 0, HP: 0, DEF: 0, BLOC: 0, entries: {},
  ult: { burst: 0, shield: 0, rage: 0, heal: 0, execute: 0, cost: 4 },
  charge: 0, shield: 0, killHeal: 0, factions: {}
}

// 与 store.js 同名实现保持一致（内联，避免依赖打包器）
function mergeBonusImpl(target, src) {
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

// store.js 里是 partyBonusOf(state.heroes)，因此这里接收的就是 heroes 本身
function partyBonusOfImpl(heroes) {
  const h = heroes || {}
  if (!realCfg.heroes || !(h.party || []).length) {
    return JSON.parse(JSON.stringify(ZERO_HERO))
  }
  return realCfg.heroes.partyBonus(h.party, h.owned || {})
}

function pickAttr(st) {
  const a = st.playerAttribute.attribute
  return {
    MAXHP: a.MAXHP.value, CURHP: a.CURHP.value, ATK: a.ATK.value, DEF: a.DEF.value,
    CRIT: a.CRIT.value, CRITDMG: a.CRITDMG.value, BLOC: a.BLOC.value, DPS: a.DPS,
    REDUCDMG: a.REDUCDMG, EVA: a.EVA.value
  }
}

function buildState(items) {
  const initialAttr = {
    CURHP: { value: 0, showValue: '' },
    MAXHP: { value: 0, showValue: '' },
    ATK: { value: 0, showValue: '' },
    DEF: { value: 0, showValue: '' },
    REDUCDMG: { value: 0, showValue: '' },
    CRIT: { value: 0, showValue: '' },
    CRITDMG: { value: 0, showValue: '' },
    BLOC: { value: 0, showValue: '0' },
    EVA: { value: 0, showValue: '' }
  }
  return {
    playerAttribute: {
      lv: 1, GOLD: 0, healthRecoverySpeed: 1, endlessLv: 0,
      attribute: JSON.parse(JSON.stringify(initialAttr)),
      weapon: items[0], armor: items[1], ring: items[2], neck: items[3]
    },
    reincarnationAttribute: { HP: 0, ATK: 0, CRIT: 0, CRITDMG: 0, DEF: 0, BLOC: 0, MOVESPEED: 0, BATTLESPEED: 0 },
    reincarnation: { count: 0, point: 0 },
    // 新增字段：保持全 0 / 空，模拟「未使用新玩法」的原版场景
    bonus: {},
    setDetail: [],
    title: '',
    abyss: { echoes: 0, perks: {} },
    heroes: { owned: {}, party: [], tickets: 0, pity5: 0, pity4: 0, total: 0, dupes: 0 }
  }
}

function runMutation(code, items, extraInject, statePatch) {
  const body = extractMutation(code, 'set_player_attribute')
  const state = Object.assign(buildState(items), statePatch || {})
  const vueInstance = {
    $deepCopy: d => JSON.parse(JSON.stringify(d)),
    $store: { commit: () => {} }
  }
  const inject = Object.assign({
    handle,
    vueInstance,
    aggregateSetBonus: realCfg.sets ? realCfg.sets.aggregateSetBonus : () => ({ bonus: {}, detail: [], count: {} }),
    TITLES: realCfg.ach ? realCfg.ach.TITLES : {},
    ABYSS_PERKS: realCfg.abyss ? realCfg.abyss.ABYSS_PERKS : [],
    aggregatePerks: realCfg.abyss ? realCfg.abyss.aggregatePerks : () => ({}),
    mergeBonus: mergeBonusImpl,
    partyBonusOf: partyBonusOfImpl
  }, extraInject || {})
  const keys = Object.keys(inject)
  const fn = new Function('state', 'data', keys.map(k => `var ${k} = __inj[${JSON.stringify(k)}];`).join('\n') +
    `var self = {state: state, commit: function(){}, _vm:null};\n` +
    `with (self) { (function(state, data){ ${body} }).call(self, state, data); }`)
  fn.__inject = inject
  // 用 Function 的第二个参数传注入
  const caller = new Function('state', '__inj', keys.map(k => `var ${k} = __inj[${JSON.stringify(k)}];`).join('\n') +
    `var self = {state: state, commit: function(){}, _vm:null};\n` +
    `(function(state, data){ ${body} }).call(self, state, undefined);\nreturn state;`)
  return caller(state, inject)
}

// 用原版生成器造一批随机装备，然后两边跑同一段聚合逻辑
let attrMismatch = 0
let attrRuns = 0
for (let t = 0; t < 60; t++) {
  const seed = 5000 + t
  const panels = {}
  SLOTS.forEach(s => { panels[s] = makePanel(ref(UPSTREAM, PANEL[s]), evalConfig(ref(UPSTREAM, CFG[s])), STUBS) })
  Math.random = rng(seed)
  const items = SLOTS.map(s => {
    const q = Math.floor(Math.random() * 4)
    const lv = 1 + Math.floor(Math.random() * 120)
    return JSON.parse(panels[s].createNewItem(q, lv))
  })
  const A = runMutation(ref(UPSTREAM, 'src/store.js'), items.map(i => JSON.parse(JSON.stringify(i))))
  const B = runMutation(cur('src/store.js'), items.map(i => JSON.parse(JSON.stringify(i))))
  const pick = pickAttr
  const pa = JSON.stringify(pick(A)), pb = JSON.stringify(pick(B))
  attrRuns++
  if (pa !== pb) {
    attrMismatch++
    if (attrMismatch <= 2) console.log(`    ✗ 第 ${t} 组\n      HEAD: ${pa}\n      CUR : ${pb}`)
  }
}
check(`属性聚合与原版完全一致（${attrRuns} 组随机装备）`, attrMismatch === 0, attrMismatch ? `${attrMismatch} 处不同` : '0 差异')

// ---------------------------------------------------------------- 3) 未改动的核心
console.log('\n[3] 核心随机管线是否被改动')
const untouched = ['src/assets/js/handle.js', 'src/assets/config/equiAttributeWeapon.js', 'src/assets/config/equiAttributeArmor.js', 'src/assets/config/equiAttributeRing.js', 'src/assets/config/equiAttributeNeck.js']
untouched.forEach(f => {
  let same = true
  try {
    const d = execSync(`git diff --stat ${BASE} -- ${f}`, { cwd: ROOT }).toString().trim()
    same = d === ''
  } catch (e) { same = false }
  check(`${f} 与原版一致`, same, same ? '' : '已被修改')
})

// ---------------------------------------------------------------- 4) 战斗解算公式
console.log('\n[4] 战斗解算（新增属性为 0 时应等价于原版竞速公式）')
{
  const { computeEffectiveAttribute, resolveBattle } = (() => {
    const code = cur('src/assets/js/battle.js')
      .replace(/export function/g, 'function')
      .replace(/export const/g, 'const')
      .replace(/export \{[\s\S]*?\}/g, '')
    const o = { exports: {} }
    new Function('module', 'exports', code + '\nmodule.exports={computeEffectiveAttribute,resolveBattle};')(o, o.exports)
    return o.exports
  })()
  let bad = 0, n = 0
  for (let t = 0; t < 500; t++) {
    Math.random = rng(9000 + t)
    const R = Math.random
    const atk = 1 + Math.floor(R() * 4000)
    const def = Math.floor(R() * 900)
    const hp = 200 + Math.floor(R() * 9000)
    const crit = Math.floor(R() * 100)
    const critdmg = 150 + Math.floor(R() * 200)
    const bloc = Math.floor(R() * 300)
    const mHp = 1 + Math.floor(R() * 40000)
    const mAtk = 1 + Math.floor(R() * 2000)
    const attr = {
      ATK: { value: atk }, DEF: { value: def }, MAXHP: { value: hp }, BLOC: { value: bloc },
      CRIT: { value: crit }, CRITDMG: { value: critdmg }
    }
    // 原版公式（直接照抄 dungeons.vue 的解算）
    const oDps = (1 - crit / 100) * atk * 1 + crit / 100 * (critdmg) / 100 * atk * 1
    const oRed = 1 - 0.05 * def / (1 + (0.0525 * def))
    const oPdt = (hp + bloc) / oRed / mAtk
    const oMdt = mHp / oDps
    const oWin = oMdt < oPdt
    let oTake = 0
    if (oWin) {
      let td = -oMdt * mAtk
      td = parseInt(td * oRed)
      td = td + bloc
      td = td > -1 ? -1 : td
      oTake = Math.abs(td)
    }
    // 新模块（无加成）
    const eff = computeEffectiveAttribute(attr, {})
    const r = resolveBattle(eff, { HP: mHp, ATK: mAtk }, { curHp: hp })
    n++
    const sameWin = r.win === oWin
    const sameDmg = !oWin || Math.abs(r.damageTaken - oTake) <= 1
    const sameRed = Math.abs(eff.REDUCDMG - oRed) < 1e-9
    const sameDps = Math.abs(eff.DPS - oDps) < 1e-9
    if (!(sameWin && sameDmg && sameRed && sameDps)) {
      bad++
      if (bad <= 3) console.log(`    ✗ t=${t} win=${sameWin} dmg=${sameDmg}(${r.damageTaken} vs ${oTake}) red=${sameRed} dps=${sameDps}`)
    }
  }
  check(`battle.js 在无新增属性时与原版解算等价（${n} 组随机战斗）`, bad === 0, bad ? `${bad} 处不同` : '0 差异')
}

// --------------------------------------------- 5) 新增玩法：零值恒等 + 真实增益
console.log('\n[5] 新增玩法（英雄 / 套装 / 祭坛）与原版属性的关系')
{
  const panels = {}
  SLOTS.forEach(x => {
    panels[x] = makePanel(ref(UPSTREAM, PANEL[x]), evalConfig(ref(UPSTREAM, CFG[x])), STUBS)
  })
  Math.random = rng(9100)
  const items = SLOTS.map(x => {
    const q = Math.floor(Math.random() * 4)
    const lv = 1 + Math.floor(Math.random() * 120)
    return JSON.parse(panels[x].createNewItem(q, lv))
  })
  const up = runMutation(ref(UPSTREAM, 'src/store.js'), items.map(i => JSON.parse(JSON.stringify(i))))
  const zero = runMutation(cur('src/store.js'), items.map(i => JSON.parse(JSON.stringify(i))))
  const sameJSON = JSON.stringify(pickAttr(up)) === JSON.stringify(pickAttr(zero))
  check('空英雄/空套装/空祭坛时属性结果与原版逐位一致', sameJSON, sameJSON ? '' : JSON.stringify(pickAttr(up)) + ' != ' + JSON.stringify(pickAttr(zero)))

  let gainOk = false, detail = '缺少 src/assets/config/heroes.js'
  if (realCfg.heroes) {
    const owned = {}
    const party = realCfg.heroes.HEROES.slice(0, 3).map(h => {
      owned[h.id] = { id: h.id, lv: 80, star: 5, shards: 0, skill: 3 }
      return h.id
    })
    const withHero = runMutation(cur('src/store.js'), items.map(i => JSON.parse(JSON.stringify(i))), null, {
      heroes: { owned, party, tickets: 0, pity5: 0, pity4: 0, total: 3, dupes: 0 }
    })
    const a = pickAttr(zero), b = pickAttr(withHero)
    gainOk = b.ATK > a.ATK && b.MAXHP > a.MAXHP && b.DEF >= a.DEF && b.DPS > a.DPS
    detail = `ATK ${a.ATK}→${b.ATK}，MAXHP ${a.MAXHP}→${b.MAXHP}，DPS ${Math.round(a.DPS)}→${Math.round(b.DPS)}`
  }
  check('上阵 3 名英雄后面板确实提升（证明接进了属性管线）', gainOk, detail)
}

// ---------------------------------------------------------------- 汇总
const failed = results.filter(r => !r.pass)
console.log(`\n==== ${results.length - failed.length}/${results.length} 通过 ====`)
if (failed.length) {
  console.log('失败项：\n' + failed.map(f => ' - ' + f.name).join('\n'))
  process.exit(1)
}
console.log('结论：新增玩法没有改变原版的装备、属性、战斗与随机管线（新系统在不用时恒等，用时确有增益）。')
