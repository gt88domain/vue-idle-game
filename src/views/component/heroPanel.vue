<template>
  <div class="hero-root" v-show="visible">
    <div class="hero-panel panel-card">
      <div class="title">
        <span>英雄</span>
        <div class="res">
          <i class="k">图鉴</i><b>{{ownedCount}}/{{total}}</b>
          <i class="k">队伍</i><b>{{heroes.party.length}}/3</b>
          <i class="k">招募令</i><b>{{heroes.tickets}}</b>
          <i class="k">回响</i><b>{{echoes}}</b>
        </div>
        <i class="close" @click="close"></i>
      </div>

      <div class="tabs">
        <div :class="{active: tab==='roster'}" @click="switchTab('roster')">英雄图鉴</div>
        <div :class="{active: tab==='summon'}" @click="switchTab('summon')">祈愿召唤</div>
        <div class="record">
          共鸣：<span v-for="f in factionStat" :key="f.id" :class="['fac', {on: f.on2}, {on4: f.on4}]" :style="{color: f.on2 ? f.color : ''}">{{f.name}} {{f.count}}</span>
        </div>
      </div>

      <!-- ================= 图鉴 ================= -->
      <div class="body" v-show="tab==='roster'">
        <div class="grid">
          <div v-for="h in list" :key="h.id"
               :class="['hero-card', 'rarity-'+h.rarity, {sel: picked===h.id, locked: !h.owned}]"
               @click="pick(h.id)">
            <div class="pic">
              <img v-if="h.owned" :src="h.portrait" alt="">
              <div v-else class="silhouette">?</div>
              <div class="own" v-if="h.owned && inParty(h.id)">出战</div>
            </div>
            <div class="meta">
              <div class="nm">{{h.owned ? h.name : '？？？'}}</div>
              <div class="stars">
                <i v-for="n in 6" :key="n" :class="['st', {on: n <= (h.star||0)}]">★</i>
                <span class="rar">{{'· '+rarName(h.rarity)}}</span>
              </div>
              <div class="lv" v-if="h.owned">Lv.{{h.lv}} · 战力 {{h.power}}</div>
              <div class="lv" v-else>未获得 · 碎片 {{h.shards}}</div>
            </div>
          </div>
        </div>

        <!-- 详情抽屉 -->
        <div class="detail" v-if="pickedHero">
          <div class="d-bg" :style="{backgroundImage:'url('+pickedHero.portrait+')'}"></div>
          <div class="d-inner">
            <div class="d-head">
              <div>
                <div class="d-name">{{pickedHero.name}}<i class="d-title">{{pickedHero.title}}</i></div>
                <div class="d-sub">
                  <span :style="{color: pickedHero.facColor}">{{pickedHero.facName}}</span> ·
                  {{'★'.repeat(pickedHero.star)}} · Lv.{{pickedHero.lv}} / {{lvCap}}
                </div>
              </div>
              <div class="d-power">战力 <b>{{pickedHero.power}}</b></div>
            </div>

            <p class="d-story">“{{pickedHero.story}}”</p>

            <div class="d-stats">
              <div class="row"><span>攻击</span><b>{{pickedHero.stats.ATK}}</b><i>+{{pickedHero.grow.ATK}}/级</i></div>
              <div class="row"><span>生命</span><b>{{pickedHero.stats.HP}}</b><i>+{{pickedHero.grow.HP}}/级</i></div>
              <div class="row"><span>防御</span><b>{{pickedHero.stats.DEF}}</b><i>+{{pickedHero.grow.DEF}}/级</i></div>
              <div class="row" v-for="(v,k) in pickedHero.entry" :key="k">
                <span>{{attrName(k)}}</span><b>{{v}}</b><i>被动词条</i>
              </div>
            </div>

            <div class="d-ult">
              <div class="u-name">{{pickedHero.ultName}} <i>Lv.{{pickedHero.skill + 1}}</i></div>
              <div class="u-text">{{pickedHero.ultText}}</div>
              <div class="u-cost">充能 {{heroUltCost(pickedHero)}} 点 · 每场胜利 +1</div>
            </div>

            <div class="d-btns">
              <div class="b btn-gold btn-press" @click="doLevel(1)">
                <b>升级</b><i>{{fmt(pickedHero.lvCost)}} 金币</i>
              </div>
              <div class="b btn-gold btn-press" @click="doLevel(10)">
                <b>连升×10</b><i>约 {{fmt(pickedHero.lvCost10)}}</i>
              </div>
              <div class="b btn-gold btn-press" :class="{'btn-disabled': !pickedHero.canStar}" @click="doStar">
                <b>升星</b><i>碎片 {{pickedHero.shards}}/{{pickedHero.needShards}}</i>
              </div>
              <div class="b btn-gold btn-press" :class="{'btn-disabled': !pickedHero.canSkill}" @click="doSkill">
                <b>大招强化</b><i>{{pickedHero.skillCost}} 回响</i>
              </div>
              <div class="b btn-gold btn-press" @click="doShardBuy">
                <b>回响换碎片</b><i>3 回响 → 1 碎片</i>
              </div>
              <div class="b btn-ghost btn-press" @click="doParty">
                <b>{{inParty(pickedHero.id) ? '下阵' : '上阵'}}</b>
                <i>{{inParty(pickedHero.id) ? '移出当前队伍' : '出战可获得全部属性与大招'}}</i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= 召唤 ================= -->
      <div class="body" v-show="tab==='summon'">
        <div class="summon-stage" v-if="!rolling.length">
          <div class="beam"></div>
          <div class="pool">
            <div class="pool-title">当前卡池</div>
            <div class="pool-list">
              <div v-for="h in HEROES" :key="h.id" class="pool-item">
                <img v-if="heroes.owned[h.id]" :src="portrait(h.id)" alt="">
                <div v-else class="silhouette sm">{{h.rarity}}</div>
                <span>{{h.name}}</span>
                <i class="pr" :class="'r'+h.rarity">{{h.rarity}}★ · {{poolRate(h.rarity)}}%</i>
              </div>
            </div>
          </div>
          <div class="pity">
            <div class="pity-row">
              <span>5★ 保底</span>
              <div class="pity-bar"><i :style="{width: pity5Pct + '%'}"></i></div>
              <b>{{hardPity - heroes.pity5}} 抽后必定出 5★</b>
            </div>
            <div class="pity-row">
              <span>10 抽保底</span>
              <div class="pity-bar"><i class="b4" :style="{width: pity4Pct + '%'}"></i></div>
              <b>累计 {{heroes.pity4}} 抽未出 4★ 以上</b>
            </div>
            <div class="pity-note">
              已抽 {{heroes.total}} 次 · 重复英雄自动转为该英雄碎片（{{'3★/4★/5★ → 6/10/20'}}片）
            </div>
          </div>
          <div class="acts">
            <div class="a btn-gold btn-press" @click="doSummon(1)">
              <b>祈愿 ×1</b>
              <i>{{tickets > 0 ? '可用招募令 ' + tickets + ' 张' : fmt(singleCost) + ' 金币'}}</i>
            </div>
            <div class="a big btn-gold btn-press" @click="doSummon(10)">
              <b>祈愿 ×10</b>
              <i>{{fmt(tenCost)}} 金币 · 必得 4★ 以上</i>
            </div>
            <div class="a ghost btn-press" @click="doExchange">
              <b>回响兑招募令</b>
              <i>10 回响 → 1 张</i>
            </div>
          </div>
        </div>

        <!-- 抽卡结果 -->
        <div class="result" v-else>
          <div class="r-title">
            {{bestRarity >= 5 ? '命运回响 —— 传说降临！' : (bestRarity >= 4 ? '稀有英雄登场' : '召唤结果')}}
          </div>
          <div class="r-grid">
            <div v-for="(x, i) in rolling" :key="i"
                 class="r-card flip-in" :class="'rarity-'+x.rarity"
                 :style="{animationDelay: (i * 0.07) + 's'}">
              <img :src="portrait(x.id)" alt="">
              <div class="r-nm">{{name(x.id)}}</div>
              <div class="r-tag" :class="{isNew: x.isNew}">{{x.isNew ? 'NEW' : '+' + x.shards + ' 碎片'}}</div>
              <div class="r-stars">{{'★'.repeat(x.rarity)}}</div>
            </div>
          </div>
          <div class="r-btns">
            <div class="btn-gold btn-press" @click="rolling=[]">确认</div>
            <div class="btn-ghost btn-press" @click="doSummon(10)">再来十连（{{fmt(tenCost)}}）</div>
          </div>
        </div>
      </div>

      <div class="foot">
        英雄属性直接进入面板计算（攻击/生命/防御/词条），大招在战斗中自动释放；未上阵英雄仅提供 {{idleShare}}% 的“待命加成”。
      </div>
    </div>
  </div>
</template>

<script>
import {
  HEROES,
  HERO_MAP,
  FACTIONS,
  SUMMON,
  STAR_UP,
  HERO_MAX_STAR,
  HERO_SKILL_MAX,
  heroSkillCost,
  heroLevelCost,
  heroMaxLevel,
  heroPower,
  rollSummon,
  levelUpHero,
  starUpHero,
  skillUpHero,
  toggleParty
} from '@/assets/js/heroes'
import {
  HERO_PORTRAITS
} from '@/assets/config/artMap'
import sfx from '@/assets/js/sfx'

const RAR_NAME = {
  3: '稀有',
  4: '史诗',
  5: '传说'
}
const ATTR_NAME = {
  BLOCPERCENT: '格挡加成 %',
  REGEN: '生命回复 %',
  CRIT: '暴击率 %',
  CRITDMG: '暴击伤害 %',
  THORNS: '反伤 %',
  HP: '生命',
  SPEED: '战斗速度 %',
  EVA: '闪避 %',
  LIFESTEAL: '吸血 %',
  ATKPERCENT: '攻击 %',
  PENETRATE: '护甲穿透 %'
}
const ULT_TEXT = {
  burst: v => `立即造成 ${(v / 100).toFixed(2)} 倍每秒伤害的开场爆发`,
  shield: v => `本场战斗承受伤害减少 ${v.toFixed(1)}%`,
  rage: v => `本场战斗每秒伤害提高 ${v.toFixed(1)}%`,
  heal: v => `战斗结束回复 ${v.toFixed(1)}% 最大生命，并附加 ${(v * 2) | 0}% 每秒伤害`,
  execute: v => `血之契约：立即削减目标最大生命的 ${v.toFixed(1)}%`
}

export default {
  name: 'HeroPanel',
  data() {
    return {
      visible: false,
      tab: 'roster',
      picked: '',
      rolling: [],
      HEROES
    }
  },
  computed: {
    heroes() {
      return this.$store.state.heroes
    },
    echoes() {
      return this.$store.state.abyss.echoes
    },
    gold() {
      return this.$store.state.playerAttribute.GOLD
    },
    playerLv() {
      return this.$store.state.playerAttribute.lv || 1
    },
    idleShare() {
      return 10
    },
    tickets() {
      return this.heroes.tickets
    },
    total() {
      return HEROES.length
    },
    ownedCount() {
      return Object.keys(this.heroes.owned || {}).length
    },
    singleCost() {
      return SUMMON.single
    },
    tenCost() {
      return SUMMON.ten
    },
    hardPity() {
      return SUMMON.hardPity
    },
    pity5Pct() {
      return Math.min(100, this.heroes.pity5 / SUMMON.hardPity * 100)
    },
    pity4Pct() {
      return Math.min(100, this.heroes.pity4 / (SUMMON.tenPity * 10) * 100)
    },
    bestRarity() {
      return this.rolling.reduce((a, b) => Math.max(a, b.rarity), 0)
    },
    list() {
      const owned = this.heroes.owned || {}
      return HEROES.map(h => {
        const rec = owned[h.id]
        return {
          id: h.id,
          rarity: h.rarity,
          owned: !!rec,
          portrait: this.portrait(h.id),
          name: rec ? h.name : '未招募 · ' + h.title,
          lv: rec ? rec.lv : 0,
          star: rec ? rec.star : 0,
          shards: rec ? rec.shards : (rec && rec.shards) || 0,
          power: rec ? heroPower(rec) : 0
        }
      }).sort((a, b) => (b.owned - a.owned) || (b.power - a.power) || (b.rarity - a.rarity))
    },
    factionStat() {
      const cnt = {}
      ;
      (this.heroes.party || []).forEach(id => {
        const h = HERO_MAP[id]
        if (h) {
          cnt[h.faction] = (cnt[h.faction] || 0) + 1
        }
      })
      return Object.keys(FACTIONS).map(k => ({
        id: k,
        name: FACTIONS[k].name,
        color: FACTIONS[k].color,
        count: cnt[k] || 0,
        on2: (cnt[k] || 0) >= 2,
        on4: (cnt[k] || 0) >= 3
      }))
    },
    lvCap() {
      return heroMaxLevel(this.playerLv)
    },
    pickedHero() {
      const id = this.picked
      const cfg = HERO_MAP[id]
      const rec = this.heroes.owned[id]
      if (!cfg || !rec) {
        return null
      }
      const mul = 1 + 0.18 * (rec.star - 1)
      const stats = {
        ATK: Math.floor((cfg.base.ATK + cfg.grow.ATK * rec.lv) * mul),
        HP: Math.floor((cfg.base.HP + cfg.grow.HP * rec.lv) * mul),
        DEF: Math.floor((cfg.base.DEF + cfg.grow.DEF * rec.lv) * mul)
      }
      const entry = {}
      Object.keys(cfg.entry || {}).forEach(k => {
        entry[ATTR_NAME[k] || k] = Math.round(cfg.entry[k] * rec.lv * mul * 0.1 * 100) / 100
      })
      const um = (1 + 0.35 * (rec.star - 1)) * (1 + 0.05 * rec.skill)
      const ultVal = (cfg.ult.base + cfg.ult.perStar * (rec.star - 1) + cfg.ult.perLevel * rec.lv) * um
      const need = rec.star >= HERO_MAX_STAR ? 0 : STAR_UP.shards[rec.star - 1]
      const gold = Math.floor(STAR_UP.goldMul[Math.min(4, rec.star - 1)] * this.playerLv * 30)
      return {
        id,
        name: cfg.name,
        title: cfg.title,
        story: cfg.story,
        rarity: cfg.rarity,
        portrait: this.portrait(id),
        facName: FACTIONS[cfg.faction].name,
        facColor: FACTIONS[cfg.faction].color,
        lv: rec.lv,
        star: rec.star,
        shards: rec.shards,
        skill: rec.skill,
        stats,
        entry,
        grow: cfg.grow,
        ultText: (ULT_TEXT[cfg.ult.kind] || (v => v))(ultVal),
        ultKind: cfg.ult.kind,
        ultName: cfg.ult.name,
        power: heroPower(rec),
        lvCost: heroLevelCost(rec.lv, cfg.rarity),
        lvCost10: this.previewTen(rec.lv, cfg.rarity),
        canStar: rec.star < HERO_MAX_STAR && rec.shards >= need && this.gold >= gold,
        needShards: need,
        starGold: gold,
        canSkill: rec.skill < HERO_SKILL_MAX && this.echoes >= heroSkillCost(rec.skill),
        skillCost: heroSkillCost(rec.skill)
      }
    }
  },
  methods: {
    open(tab) {
      this.visible = true
      if (tab) {
        this.tab = tab
      }
    },
    close() {
      this.visible = false
      this.rolling = []
    },
    switchTab(t) {
      this.tab = t
      sfx.play('tab')
    },
    fmt(v) {
      return (this.$options.filters && this.$options.filters.num) ? this.$options.filters.num(v) : this.num(v)
    },
    num(v) {
      v = Math.floor(v || 0)
      if (v >= 1e8) {
        return (v / 1e8).toFixed(2) + '亿'
      }
      if (v >= 1e4) {
        return (v / 1e4).toFixed(2) + '万'
      }
      return v + ''
    },
    rarName(r) {
      return RAR_NAME[r] || (r + '★')
    },
    attrName(k) {
      return ATTR_NAME[k] || k
    },
    poolRate(r) {
      return SUMMON.weights[r]
    },
    portrait(id) {
      return HERO_PORTRAITS[id]
    },
    name(id) {
      return (HERO_MAP[id] || {}).name || id
    },
    inParty(id) {
      return (this.heroes.party || []).indexOf(id) >= 0
    },
    pick(id) {
      if (!this.heroes.owned[id]) {
        this.$message({
          type: 'info',
          msg: `尚未获得 ${this.name(id)}，去「祈愿召唤」试试手气`
        })
        sfx.play('ui_error')
        return
      }
      this.picked = this.picked === id ? '' : id
      sfx.play('click')
    },
    heroUltCost(h) {
      return Math.max(2, ((HERO_MAP[h.id] || {}).ult || {}).cost || 4)
    },
    previewTen(lv, rarity) {
      let sum = 0
      for (let i = 0; i < 10; i++) {
        sum += heroLevelCost(lv + i, rarity)
      }
      return sum
    },
    commit(next) {
      this.$store.commit('set_heroes', next)
    },
    doLevel(times) {
      const r = levelUpHero(this.heroes, this.picked, this.gold, this.playerLv, times)
      if (!r.ok) {
        this.$message({
          type: 'info',
          msg: r.reason
        })
        sfx.play('ui_error')
        return
      }
      this.$store.commit('set_player_gold', -r.spent)
      this.commit(r.heroes)
      sfx.play('enhance_ok')
      this.$store.commit('report', {
        key: 'heroLevels',
        num: times
      })
    },
    doStar() {
      const r = starUpHero(this.heroes, this.picked, this.gold, this.playerLv)
      if (!r.ok) {
        this.$message({
          type: 'info',
          msg: r.reason
        })
        sfx.play('ui_error')
        return
      }
      this.$store.commit('set_player_gold', -r.spent)
      this.commit(r.heroes)
      sfx.play('rare')
      this.$store.commit('set_sys_info', {
        type: 'trophy',
        msg: `${this.name(this.picked)} 升至 ${r.star} 星！属性与大招同步增强`
      })
    },
    doSkill() {
      const r = skillUpHero(this.heroes, this.picked, this.echoes)
      if (!r.ok) {
        this.$message({
          type: 'info',
          msg: r.reason
        })
        sfx.play('ui_error')
        return
      }
      this.$store.commit('add_echoes', -r.spent)
      this.commit(r.heroes)
      sfx.play('enhance_ok')
    },
    doShardBuy() {
      if (this.echoes < 3) {
        this.$message({
          type: 'info',
          msg: '回响不足（需要 3）'
        })
        sfx.play('ui_error')
        return
      }
      const next = JSON.parse(JSON.stringify(this.heroes))
      const rec = next.owned[this.picked]
      if (!rec) {
        return
      }
      rec.shards += 1
      this.$store.commit('add_echoes', -3)
      this.commit(next)
      sfx.play('click')
    },
    doParty() {
      const r = toggleParty(this.heroes, this.picked, 3)
      if (!r.ok) {
        this.$message({
          type: 'info',
          msg: r.reason
        })
        sfx.play('ui_error')
        return
      }
      this.commit(r.heroes)
      sfx.play(this.inParty(this.picked) ? 'tab' : 'summon')
      this.$store.commit('report', {
        key: 'heroParty',
        num: r.heroes.party.length
      })
    },
    doSummon(count) {
      const r = rollSummon(this.heroes, count, this.gold, Math.random)
      if (!r.ok) {
        this.$message({
          type: 'info',
          msg: (r.reason || '金币不足') + '（也可以先打深渊换回响，再兑招募令）'
        })
        sfx.play('ui_error')
        return
      }
      this.$store.commit('set_player_gold', -r.spentGold)
      this.commit(r.heroes)
      this.rolling = r.results
      const isNew5 = r.results.filter(x => x.isNew && x.rarity >= 5).length
      if (isNew5) {
        sfx.play('rare')
      } else {
        sfx.play('summon')
      }
      const news = r.results.filter(x => x.isNew).length
      this.$store.commit('set_sys_info', {
        type: news ? 'trophy' : 'win',
        msg: `祈愿 ×${count}：新英雄 ${news} 位，${(r.usedTickets ? r.usedTickets + ' 张招募令' : '花费 ' + this.fmt(r.spentGold) + ' 金币')}`
      })
      this.$store.commit('report', {
        key: 'summons',
        num: count
      })
      this.$store.commit('report', {
        key: 'heroesOwned',
        num: Object.keys(r.heroes.owned).length,
        check: 'max'
      })
    },
    doExchange() {
      if (this.echoes < 10) {
        this.$message({
          type: 'info',
          msg: '需要 10 个深渊回响'
        })
        sfx.play('ui_error')
        return
      }
      const next = JSON.parse(JSON.stringify(this.heroes))
      next.tickets = (next.tickets || 0) + 1
      this.$store.commit('add_echoes', -10)
      this.commit(next)
      sfx.play('coin')
      this.$message({
        type: 'success',
        msg: '招募令 +1（深渊回响 → 招募令，永久可用）'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.hero-root {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 31;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
}

.hero-panel {
  position: relative;
  width: 8.4rem;
  max-width: 97%;
  height: 6.8rem;
  max-height: 94%;
  display: flex;
  flex-direction: column;
  color: #ddd;
  font-size: 0.12rem;

  .title {
    height: 0.42rem;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    padding: 0 0.12rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    > span {
      font-size: 0.18rem;
      letter-spacing: 0.04rem;
      color: #f0dcae;
    }

    .res {
      margin-left: auto;
      display: flex;
      align-items: center;

      .k {
        font-style: normal;
        color: #8b8378;
        margin: 0 0.02rem 0 0.08rem;
      }

      b {
        color: #ffd76a;
        font-weight: 600;
      }
    }

    .close {
      width: 0.2rem;
      height: 0.2rem;
      margin-left: 0.12rem;
      cursor: pointer;
      color: #999;
      text-align: center;
      line-height: 0.2rem;
    }

    .close:before {
      content: '✕';
    }
  }

  .tabs {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    padding: 0.04rem 0.12rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    > div:not(.record) {
      padding: 0.02rem 0.1rem;
      margin-right: 0.06rem;
      cursor: pointer;
      color: #9c9181;
      border-bottom: 2px solid transparent;
    }

    > div.active {
      color: #ffd76a;
      border-bottom-color: #e8c874;
    }

    .record {
      margin-left: auto;
      color: #7e776c;
      font-size: 0.11rem;
    }

    .fac {
      margin-left: 0.06rem;
      color: #6b6459;
    }

    .fac.on {
      text-shadow: 0 0 0.06rem currentColor;
    }

    .fac.on4 {
      font-weight: 700;
    }
  }

  .body {
    flex: 1 1 auto;
    display: flex;
    overflow: hidden;
  }

  .foot {
    flex: 0 0 auto;
    padding: 0.04rem 0.12rem;
    font-size: 0.1rem;
    color: #7e776c;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
}

.grid {
  width: 4.3rem;
  padding: 0.08rem;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;

  .hero-card {
    width: 1.32rem;
    margin: 0.03rem;
    cursor: pointer;
    transition: transform 0.12s ease;

    &:hover {
      transform: translateY(-0.01rem);
    }

    .pic {
      position: relative;
      overflow: hidden;
      background: #000;

      img {
        width: 100%;
        height: 1.32rem;
        object-fit: cover;
        object-position: 50% 18%;
        display: block;
      }

      .silhouette {
        height: 1.32rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.4rem;
        color: #3a3631;
        background: radial-gradient(circle at 50% 30%, #1d1a17, #050505);
      }

      .silhouette.sm {
        height: 0.4rem;
        font-size: 0.16rem;
      }

      .own {
        position: absolute;
        right: 0;
        top: 0;
        background: linear-gradient(180deg, #8a6d31, #3a2d13);
        color: #ffe9b8;
        font-size: 0.1rem;
        padding: 0.01rem 0.03rem;
      }
    }

    .meta {
      padding: 0.03rem 0.04rem 0.05rem;

      .nm {
        font-size: 0.11rem;
        color: #e5dcc9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .stars {
        display: flex;
        align-items: center;
        margin-top: 0.01rem;

        .st {
          font-style: normal;
          color: #4a4640;
          font-size: 0.1rem;
        }

        .st.on {
          color: #ffb02e;
          text-shadow: 0 0 0.04rem rgba(255, 176, 46, 0.7);
        }

        .rar {
          margin-left: auto;
          font-size: 0.1rem;
          color: #8b8378;
        }
      }

      .lv {
        font-size: 0.1rem;
        color: #847c70;
        margin-top: 0.01rem;
      }
    }
  }

  .hero-card.locked {
    opacity: 0.72;
    filter: saturate(0.5);
  }
}

.detail {
  position: relative;
  flex: 1 1 auto;
  overflow-y: auto;
  border-left: 1px solid rgba(255, 255, 255, 0.08);

  .d-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1.7rem;
    background-size: cover;
    background-position: 50% 15%;
    opacity: 0.34;
    filter: blur(1px);
    pointer-events: none;
  }

  .d-inner {
    position: relative;
    padding: 0.08rem 0.1rem;
  }

  .d-head {
    display: flex;
    align-items: flex-start;

    .d-name {
      font-size: 0.16rem;
      color: #f5e9cc;

      .d-title {
        font-style: normal;
        font-size: 0.11rem;
        color: #9c9181;
        margin-left: 0.04rem;
      }
    }

    .d-sub {
      font-size: 0.11rem;
      color: #a89e90;
      margin-top: 0.02rem;
    }

    .d-power {
      margin-left: auto;
      font-size: 0.11rem;
      color: #9c9181;

      b {
        color: #ffd76a;
        font-size: 0.16rem;
      }
    }
  }

  .d-story {
    margin: 0.05rem 0 0.02rem;
    font-size: 0.11rem;
    color: #8b8378;
    font-style: italic;
  }

  .d-stats {
    display: flex;
    flex-wrap: wrap;
    margin: 0.06rem 0;

    .row {
      width: 50%;
      display: flex;
      align-items: baseline;
      padding: 0.02rem 0.04rem;
      background: rgba(255, 255, 255, 0.03);
      margin: 0.01rem;

      span {
        color: #91897c;
      }

      b {
        margin-left: auto;
        color: #e8dcc2;
      }

      i {
        font-style: normal;
        font-size: 0.1rem;
        color: #6f685e;
        margin-left: 0.04rem;
      }
    }
  }

  .d-ult {
    border: 1px solid rgba(232, 200, 116, 0.25);
    background: linear-gradient(180deg, rgba(60, 46, 18, 0.5), rgba(10, 9, 8, 0.6));
    padding: 0.05rem 0.07rem;

    .u-name {
      color: #ffd76a;
      font-size: 0.14rem;

      i {
        font-style: normal;
        font-size: 0.11rem;
        color: #9c9181;
        margin-left: 0.04rem;
      }
    }

    .u-text {
      margin-top: 0.02rem;
      color: #d9cfbc;
      line-height: 1.5;
    }

    .u-cost {
      margin-top: 0.03rem;
      font-size: 0.1rem;
      color: #8b8378;
    }
  }

  .d-btns {
    display: flex;
    flex-wrap: wrap;
    margin-top: 0.06rem;

    .b {
      width: 1.42rem;
      margin: 0.02rem;
      padding: 0.04rem 0.05rem;
      text-align: center;

      b {
        display: block;
        font-size: 0.12rem;
        color: #ffe9b8;
      }

      i {
        display: block;
        font-style: normal;
        font-size: 0.1rem;
        color: #b3a68d;
        margin-top: 0.01rem;
      }
    }

    .btn-ghost {
      background: rgba(12, 11, 10, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 2px;
    }
  }
}

/* ---------- 召唤 ---------- */
.summon-stage {
  position: relative;
  flex: 1 1 auto;
  padding: 0.1rem 0.14rem;
  overflow-y: auto;
  display: block;
}

.beam {
  left: 22%;
}

.pool {
  position: relative;

  .pool-title {
    color: #f0dcae;
    font-size: 0.14rem;
    margin-bottom: 0.04rem;
  }

  .pool-list {
    display: flex;
    flex-wrap: wrap;
  }

  .pool-item {
    width: 2.05rem;
    display: flex;
    align-items: center;
    margin: 0.02rem 0.04rem 0.02rem 0;
    padding: 0.02rem 0.04rem;
    background: rgba(255, 255, 255, 0.03);
    border-left: 2px solid #3a3631;

    img {
      width: 0.4rem;
      height: 0.4rem;
      object-fit: cover;
      object-position: 50% 18%;
      margin-right: 0.05rem;
    }

    span {
      font-size: 0.11rem;
      color: #dcd3c4;
    }

    .pr {
      margin-left: auto;
      font-style: normal;
      font-size: 0.1rem;
      color: #8b8378;
    }

    .pr.r5 {
      color: #ffb02e;
    }

    .pr.r4 {
      color: #b06be6;
    }
  }
}

.pity {
  margin-top: 0.08rem;
  position: relative;

  .pity-row {
    display: flex;
    align-items: center;
    margin-bottom: 0.03rem;
    font-size: 0.11rem;
    color: #a89e90;

    > span {
      width: 0.6rem;
      flex: 0 0 auto;
    }

    .pity-bar {
      flex: 1 1 auto;
      height: 0.06rem;
      margin: 0 0.06rem;
      background: #000;
      border: 1px solid #3a3631;
      position: relative;

      i {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #ffb02e, #ffe9b8);
        transition: width 0.2s ease;
      }

      i.b4 {
        background: linear-gradient(90deg, #6f4fa8, #b06be6);
      }
    }

    b {
      flex: 0 0 auto;
      font-weight: 400;
      color: #d9cfbc;
    }
  }

  .pity-note {
    font-size: 0.1rem;
    color: #7e776c;
  }
}

.acts {
  display: flex;
  justify-content: center;
  margin-top: 0.1rem;
  position: relative;

  .a {
    min-width: 1.7rem;
    margin: 0 0.04rem;
    padding: 0.06rem 0.08rem;
    text-align: center;
    border-radius: 2px;

    b {
      display: block;
      font-size: 0.15rem;
      color: #ffe9b8;
      letter-spacing: 0.02rem;
    }

    i {
      display: block;
      font-style: normal;
      font-size: 0.1rem;
      color: #bdae90;
      margin-top: 0.02rem;
    }
  }

  .a.big {
    background: linear-gradient(180deg, #8a5f1c 0%, #3a2d13 100%);
    border-color: #ffd76a;
  }

  .a.ghost {
    background: rgba(12, 11, 10, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 2px;
  }
}

.result {
  flex: 1 1 auto;
  padding: 0.1rem;
  overflow-y: auto;
  text-align: center;

  .r-title {
    font-size: 0.16rem;
    color: #ffd76a;
    letter-spacing: 0.04rem;
    margin-bottom: 0.06rem;
  }

  .r-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }

  .r-card {
    width: 1.3rem;
    margin: 0.03rem;
    background: linear-gradient(180deg, #1b1713, #0a0908);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
    animation-fill-mode: both;

    img {
      width: 100%;
      height: 1.2rem;
      object-fit: cover;
      object-position: 50% 18%;
    }

    .r-nm {
      font-size: 0.11rem;
      color: #e5dcc9;
      padding: 0.02rem 0.02rem 0;
    }

    .r-tag {
      font-size: 0.1rem;
      color: #8b8378;

      &.isNew {
        color: #7dd47f;
      }
    }

    .r-stars {
      font-size: 0.1rem;
      color: #ffb02e;
      padding-bottom: 0.02rem;
    }
  }

  .r-card.rarity-5 {
    border-color: #ffb02e;
    box-shadow: 0 0 0.1rem rgba(255, 176, 46, 0.45);
  }

  .r-card.rarity-4 {
    border-color: #b06be6;
  }

  .r-btns {
    display: flex;
    justify-content: center;
    margin-top: 0.08rem;

    > div {
      padding: 0.04rem 0.1rem;
      margin: 0 0.04rem;
      font-size: 0.12rem;
      color: #ffe9b8;
      border-radius: 2px;
    }

    .btn-ghost {
      background: rgba(12, 11, 10, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #cfc7b8;
    }
  }
}
</style>
