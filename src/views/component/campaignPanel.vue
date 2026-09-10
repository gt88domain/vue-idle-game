<template>
  <div class="camp-root" v-show="visible">
    <div class="camp panel-card">
      <div class="title">
        <span>章节远征</span>
        <div class="stamina" :class="{full: stamina.value>=STAMINA.max, empty: stamina.value<STAMINA.cost}">
          <i>体力</i>
          <div class="sbar"><b :style="{width: staminaPct + '%'}"></b></div>
          <span>{{stamina.value}}/{{STAMINA.max}}</span>
          <em v-if="stamina.nextSec">+1 / {{secText}}</em>
          <em v-else>已满</em>
        </div>
        <div class="sum">★ <b>{{starTotal}}</b>/{{CHAPTER_COUNT*STAGES_PER_CHAPTER*3}} · 通关 <b>{{campaign.clears}}</b> 关 · 扫荡 <b>{{campaign.sweeps}}</b> 次</div>
        <i class="close" @click="close"></i>
      </div>

      <div class="body">
        <!-- 章节列表 -->
        <div class="chapters">
          <div v-for="c in chapterList" :key="c.id" class="chapter" :class="{on: c.id==cur, lock: !c.unlocked, done: c.full3==c.total}">
            <div class="c-lv">{{c.lv}}</div>
            <div class="c-main" @click="pick(c)">
              <div class="c-name">{{c.unlocked ? c.name : '？？？'}}</div>
              <div class="c-star">
                <i v-for="n in c.total*3" :key="n" :class="{on: n <= c.sum}"></i>
                <span>{{c.cleared}}/{{c.total}} 关</span>
              </div>
            </div>
            <div class="c-lock" v-if="!c.unlocked">🔒</div>
            <div class="c-perfect" v-else-if="c.full3==c.total">全3★</div>
          </div>
        </div>

        <!-- 关卡 -->
        <div class="stage-area">
          <div class="ch-head">
            <div>
              <b>{{chapter.name}}</b>
              <i>推荐等级 lv{{chapter.lv}} · 需 DPS ≈ {{chapterNeedDPS}}</i>
            </div>
            <div class="mydps">我的 DPS <b>{{myEff.DPS}}</b> · 生命 <b>{{myEff.MAXHP}}</b> · 减伤 <b>{{myEff.DR}}%</b></div>
            <div class="sweepall btn-gold btn-press" :class="{'btn-disabled': !canSweepAll}" @click="sweepChapter()">一键扫荡本章（{{sweepAllCost}} 体力）</div>
          </div>
          <p class="ch-desc">{{chapter.desc}}</p>

          <div class="stages">
            <div v-for="s in stages" :key="s.stage" class="node" :class="{boss: s.isBoss, locked: !s.unlocked, clear: s.stars>0, star3: s.stars>=3}">
              <div class="n-head">
                <i class="n-idx">{{s.stage}}</i>
                <span>{{s.name}}</span>
                <em v-if="s.first">已首通</em>
              </div>
              <div class="n-mon">
                <div class="row"><span>怪物</span><b>{{s.monName}}</b></div>
                <div class="row"><span>生命</span><b>{{fmt(s.hp)}}</b></div>
                <div class="row"><span>攻击</span><b>{{fmt(s.atk)}}</b></div>
                <div class="row"><span>预计耗时</span><b :class="{bad: !s.canWin}">{{s.canWin ? s.tKill.toFixed(1) + 's' : '打不动'}}</b></div>
                <div class="row"><span>预计剩余</span><b :class="s.pct>=0.8?'gold':''">{{s.canWin ? Math.round(s.pct*100) + '%' : '-'}}</b></div>
              </div>
              <div class="n-stars">
                <i v-for="n in 3" :key="n" :class="{on: n<=s.stars}">★</i>
                <em>≥80% 血量得 3★</em>
              </div>
              <div class="n-btns">
                <div class="b btn-gold btn-press" :class="{'btn-disabled': !s.canFight}" @click="challenge(s.stage)">
                  <b>挑战</b><i>{{STAMINA.cost}} 体力{{s.stars?(' · '+s.stars+'★'):''}}</i>
                </div>
                <div class="b btn-ghost btn-press" :class="{'btn-disabled': !s.canSweep}" @click="sweep(s.stage)">
                  <b>扫荡</b><i>{{SWEEP.cost}} 体力 · 需3★</i>
                </div>
              </div>
            </div>
          </div>

          <!-- 战斗报告 -->
          <div class="report" v-if="report">
            <div class="r-title">{{report.title}}</div>
            <div class="r-grid">
              <div class="cell"><span>击杀耗时</span><b>{{report.t ? report.t.toFixed(2) + 's' : '-'}}</b></div>
              <div class="cell"><span>承受伤害</span><b>{{fmt(report.dmg)}}</b></div>
              <div class="cell"><span>剩余生命</span><b>{{report.pct}}%</b></div>
              <div class="cell"><span>获得</span><b class="gold">{{report.gain}}</b></div>
              <div class="cell"><span>星级</span><b>{{'★'.repeat(report.stars) || '—'}}</b></div>
              <div class="cell" v-if="report.drop"><span>掉落</span><b :style="{color: report.dropColor}">{{report.drop}}</b></div>
            </div>
          </div>

          <div class="tips">
            <p v-for="(t, i) in CAMPAIGN_TIPS" :key="i">- {{t}}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { assist } from '../../assets/js/assist'
import { resolveBattle } from '../../assets/js/battle'
import {
  CHAPTERS,
  CHAPTER_COUNT,
  STAGES_PER_CHAPTER,
  STAGE_NAMES,
  STAGE_MUL,
  STAMINA,
  SWEEP,
  stageMonster,
  starsFor,
  stageReward,
  rollQuality,
  sweepReward,
  staminaNow,
  chapterUnlocked,
  chapterStars,
  totalStars,
  CAMPAIGN_TIPS
} from '../../assets/config/campaign'
import { rollSetPiece } from '../../assets/config/sets'
import sfx from '../../assets/js/sfx'

export default {
  name: 'campaignPanel',
  mixins: [assist],
  data() {
    return {
      visible: false,
      cur: 1,
      report: null,
      now: Date.now(),
      timer: null,
      STAMINA: STAMINA,
      SWEEP: SWEEP,
      CHAPTER_COUNT: CHAPTER_COUNT,
      STAGES_PER_CHAPTER: STAGES_PER_CHAPTER,
      CAMPAIGN_TIPS: CAMPAIGN_TIPS
    }
  },
  computed: {
    campaign() {
      return this.$store.state.campaign
    },
    attribute() {
      return this.$store.state.playerAttribute.attribute
    },
    playerLv() {
      return this.$store.state.playerAttribute.lv || 1
    },
    stamina() {
      return staminaNow(this.campaign, this.now)
    },
    staminaPct() {
      return Math.min(100, this.stamina.value / STAMINA.max * 100)
    },
    secText() {
      const s = Math.max(0, this.stamina.nextSec | 0)
      const m = Math.floor(s / 60)
      return (m > 0 ? m + '分' : '') + (s % 60) + '秒'
    },
    starTotal() {
      return totalStars(this.campaign.stars)
    },
    chapterList() {
      const out = []
      for (let c = 1; c <= CHAPTER_COUNT; c++) {
        const st = chapterStars(this.campaign.stars, c)
        out.push({
          id: c,
          name: CHAPTERS[c - 1].name,
          lv: CHAPTERS[c - 1].lv,
          unlocked: chapterUnlocked(this.campaign.stars, c),
          sum: st.sum,
          cleared: st.cleared,
          full3: st.full3,
          total: STAGES_PER_CHAPTER
        })
      }
      return out
    },
    chapter() {
      const c = CHAPTERS[this.cur - 1] || CHAPTERS[0]
      return {
        name: c.name,
        lv: c.lv,
        desc: c.desc
      }
    },
    chapterNeedDPS() {
      return this.fmt(stageMonster(this.cur, STAGES_PER_CHAPTER).needDPS)
    },
    // 与主世界同一套数字：装备/套装/称号/祭坛/英雄都已折进 attribute
    myEff() {
      const a = this.attribute
      return {
        DPS: Math.round(a.DPS || 0),
        MAXHP: this.fmt(a.MAXHP.value),
        DR: ((1 - (a.REDUCDMG === undefined ? 1 : Number(a.REDUCDMG))) * 100).toFixed(1)
      }
    },
    eff() {
      const a = this.attribute
      const pen = Number(a.PENETRATE || 0)
      return {
        DPS: (Number(a.DPS || 0)) * (1 + pen / 100),
        MAXHP: Number(a.MAXHP.value || 0),
        BLOC: Number(a.BLOC.value || 0),
        REDUCDMG: Number(a.REDUCDMG === undefined ? 1 : a.REDUCDMG) || 1,
        THORNS: Number(a.THORNS || 0),
        LIFESTEAL: Number(a.LIFESTEAL || 0),
        EXECUTE: Number(a.EXECUTE || 0),
        REVIVE: Number(a.REVIVE || 0),
        WRATH: Number(a.WRATH || 0),
        // EVA/DR 已在 store 的 REDUCDMG 内折算过，这里置 0 避免重复计算
        EVA: 0,
        DR: 0,
        GOLDGAIN: Number(a.GOLDGAIN || 0),
        LUCK: Number(a.LUCK || 0)
      }
    },
    stages() {
      const eff = this.eff
      const unlocked = chapterUnlocked(this.campaign.stars, this.cur)
      const out = []
      for (let s = 1; s <= STAGES_PER_CHAPTER; s++) {
        const m = stageMonster(this.cur, s)
        const r = resolveBattle(eff, m.attribute, {
          curHp: Number(this.attribute.CURHP.value || eff.MAXHP)
        })
        const key = this.cur + '-' + s
        const stars = this.campaign.stars[key] || 0
        const prevKey = this.cur + '-' + (s - 1)
        const stageOpen = unlocked && (s === 1 || (this.campaign.stars[prevKey] || 0) > 0)
        out.push({
          stage: s,
          name: s === STAGES_PER_CHAPTER ? '首领 · ' + m.name.split('·').pop() : STAGE_NAMES[s - 1],
          monName: m.name,
          isBoss: m.isBoss,
          hp: m.attribute.HP,
          atk: m.attribute.ATK,
          needDPS: m.needDPS,
          stars: stars,
          first: !!this.campaign.first[key],
          unlocked: stageOpen,
          canWin: r.win,
          tKill: r.monsterDeadTime,
          pct: r.win ? Math.max(0, (Number(this.attribute.CURHP.value || eff.MAXHP) - r.damageTaken) / Math.max(1, eff.MAXHP)) : 0,
          canFight: stageOpen && this.stamina.value >= STAMINA.cost,
          canSweep: stageOpen && stars >= SWEEP.requireStars && this.stamina.value >= SWEEP.cost
        })
      }
      return out
    },
    sweepTargets() {
      return this.stages.filter(s => s.canSweep).map(s => s.stage)
    },
    canSweepAll() {
      return this.sweepTargets.length > 0 && this.stamina.value >= SWEEP.cost * this.sweepTargets.length
    },
    sweepAllCost() {
      return SWEEP.cost * this.sweepTargets.length
    }
  },
  methods: {
    open(c) {
      this.visible = true
      if (c) {
        this.cur = Math.min(CHAPTER_COUNT, Math.max(1, c))
      }
      this.tick()
      this.timer = setInterval(this.tick, 1000)
      this.$store.commit('daily_rollover')
    },
    close() {
      this.visible = false
      this.report = null
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    tick() {
      this.now = Date.now()
    },
    pick(c) {
      if (!c.unlocked) {
        this.info('先通关第 ' + (c.id - 1) + ' 章才能解锁这里')
        return
      }
      this.cur = c.id
      this.report = null
      sfx.play('tab')
    },
    info(msg, type) {
      this.$store.commit('set_sys_info', {
        msg: msg,
        type: type || 'warning'
      })
    },
    fmt(v) {
      v = Math.floor(Number(v) || 0)
      if (v >= 1e8) {
        return (v / 1e8).toFixed(2) + '亿'
      }
      if (v >= 1e4) {
        return (v / 1e4).toFixed(2) + '万'
      }
      return '' + v
    },
    /* ---------- 挑战 ---------- */
    challenge(stage) {
      const s = this.stages[stage - 1]
      if (!s.unlocked) {
        this.info('这一关还没解锁')
        return
      }
      if (this.stamina.value < STAMINA.cost) {
        this.info('体力不足（需要 ' + STAMINA.cost + ' 点，每 ' + STAMINA.regenSec + ' 秒回 1 点）')
        sfx.play('ui_error')
        return
      }
      const m = stageMonster(this.cur, stage)
      const eff = this.eff
      const curHp = Math.max(1, Number(this.attribute.CURHP.value || eff.MAXHP))
      const res = resolveBattle(eff, m.attribute, {
        curHp: curHp
      })
      this.$store.commit('spend_stamina', STAMINA.cost)
      const key = this.cur + '-' + stage
      const before = this.campaign.stars[key] || 0
      const firstClear = !this.campaign.first[key]
      let stars = 0
      let gainText = ''
      let dropName = ''
      let dropColor = ''

      if (res.win) {
        const pctLeft = Math.max(0, (curHp - res.damageTaken) / Math.max(1, eff.MAXHP))
        stars = starsFor(true, pctLeft)
        // 生命结算（战败不会死，见 CAMPAIGN_TIPS）
        let hpDelta = -res.damageTaken
        if (res.heal) {
          hpDelta += res.heal
        }
        if (res.revived) {
          hpDelta = -Math.max(0, curHp - 1)
        }
        this.$store.commit('set_player_curhp', hpDelta)

        const rew = stageReward(this.cur, stage, stars, firstClear)
        const gold = Math.floor(rew.gold * (1 + Math.min(100, eff.GOLDGAIN) / 100))
        gainText = '金币 ' + this.fmt(gold) + (rew.echoes ? ' · 回响 ' + rew.echoes : '') + (rew.shards ? ' · 碎片 ' + rew.shards : '')
        this.$store.commit('grant_reward', {
          gold: gold,
          echoes: rew.echoes,
          shards: rew.shards
        })
        dropName = this.rollDrops(stage, stars, m.lv)
        const newStars = Math.max(before, stars)
        const starsMap = Object.assign({}, this.campaign.stars, {
          [key]: newStars
        })
        const firstMap = firstClear ? Object.assign({}, this.campaign.first, {
          [key]: 1
        }) : this.campaign.first
        this.$store.commit('set_campaign', {
          stars: starsMap,
          first: firstMap,
          clears: firstClear ? (this.campaign.clears || 0) + 1 : (this.campaign.clears || 0),
          best: Math.max(this.campaign.best || 0, this.cur * 10 + stage)
        })
        this.$store.commit('report', {
          key: 'stageStars',
          num: Math.max(0, newStars - before),
          check: false
        })
        if (firstClear) {
          this.$store.commit('report', {
            key: 'campaignClears',
            num: 1
          })
        } else {
          this.$store.commit('check_achievements')
        }
        sfx.play(stars >= 3 ? 'rare' : 'victory')
        if (stage === STAGES_PER_CHAPTER) {
          // 与原版一致：打通首领可提升玩家等级
          this.evenLvUp(m.lv)
        }
      } else {
        this.$store.commit('set_player_curhp', -Math.max(0, curHp - 1))
        sfx.play('defeat')
        this.info(`第 ${this.cur}-${stage} 关挑战失败：伤害不够或太脆（剩余 ${(res.playerSurviveTime || 0).toFixed(1)}s 就会被击杀）`)
      }

      this.report = {
        title: (res.win ? '胜利' : '失败') + ` · 第 ${this.cur}-${stage} 关 ${m.name}`,
        t: res.monsterDeadTime,
        dmg: res.damageTaken,
        pct: res.win ? Math.round(Math.max(0, (curHp - res.damageTaken) / Math.max(1, eff.MAXHP) * 100)) : 0,
        stars: stars,
        gain: gainText || '—',
        drop: dropName,
        dropColor: dropColor
      }
    },
    /* ---------- 掉落：复用四个部位面板的生成器（与原版同一函数）---------- */
    rollDrops(stage, stars, lv) {
      const names = ['weaponPanel', 'armorPanel', 'ringPanel', 'neckPanel']
      const results = []
      const rolls = 1 + (stars >= 3 ? 1 : 0) + (stage === STAGES_PER_CHAPTER ? 1 : 0)
      for (let i = 0; i < rolls; i++) {
        const isBossLast = stage === STAGES_PER_CHAPTER
        let qua = rollQuality(Math.random, stars)
        if (isBossLast && Math.random() < 0.12) {
          qua = 4 // 章节首领 12% 出独特
        }
        const slotName = names[Math.floor(Math.random() * 4)]
        const b = this.findBrothersComponents(this, slotName, false)[0]
        if (!b) {
          continue
        }
        let force = null
        if (stage >= 3 && Math.random() < 0.25) {
          const r = rollSetPiece(slotName.replace('Panel', '').toLowerCase(), qua == 4)
          if (r) {
            force = r.typeName
          }
        }
        const item = JSON.parse(b.createNewItem(Math.min(4, qua), Math.max(1, lv + Math.floor(Math.random() * 6)), force))
        results.push(item)
      }
      if (!results.length) {
        return ''
      }
      const backpack = this.findBrothersComponents(this, 'backpackPanel', false)[0]
      results.forEach(item => {
        let placed = false
        if (backpack) {
          for (let i = 0; i < backpack.grid.length; i++) {
            if (JSON.stringify(backpack.grid[i]).length < 3) {
              this.$set(backpack.grid, i, item)
              placed = true
              break
            }
          }
        }
        if (!placed) {
          // 背包满了就折成金币
          this.$store.commit('set_player_gold', Math.floor(item.lv * item.quality.qualityCoefficient * 30))
        }
      })
      const first = results[0]
      this.$store.commit('set_sys_info', {
        msg: `章节掉落：${first.quality.name} · ${first.type.name}${results.length > 1 ? ' 等 ' + results.length + ' 件' : ''}`,
        type: 'trophy',
        equip: results
      })
      this.$store.commit('report', {
        key: first.quality.name === '独特' ? 'uniqueDrops' : 'epicDrops',
        num: 1,
        check: false
      })
      return results.map(x => x.type.name).join('、')
    },
    /* ---------- 扫荡 ---------- */
    sweep(stage) {
      const s = this.stages[stage - 1]
      if (!s.canSweep) {
        this.info('扫荡需要先 3★ 通关这一关')
        sfx.play('ui_error')
        return
      }
      if (this.stamina.value < SWEEP.cost) {
        this.info('体力不足')
        sfx.play('ui_error')
        return
      }
      const m = stageMonster(this.cur, stage)
      const rew = sweepReward(this.cur, stage, 1)
      this.$store.commit('spend_stamina', SWEEP.cost)
      const gold = Math.floor(rew.gold * (1 + Math.min(100, Number(this.eff.GOLDGAIN || 0)) / 100))
      this.$store.commit('grant_reward', {
        gold: gold,
        echoes: rew.echoes
      })
      let drop = ''
      if (Math.random() < SWEEP.dropChance) {
        const names = ['weaponPanel', 'armorPanel', 'ringPanel', 'neckPanel']
        const slotName = names[Math.floor(Math.random() * 4)]
        const b = this.findBrothersComponents(this, slotName, false)[0]
        if (b) {
          const item = JSON.parse(b.createNewItem(Math.min(3, rollQuality(Math.random, 3)), m.lv))
          const backpack = this.findBrothersComponents(this, 'backpackPanel', false)[0]
          let placed = false
          if (backpack) {
            for (let i = 0; i < backpack.grid.length; i++) {
              if (JSON.stringify(backpack.grid[i]).length < 3) {
                this.$set(backpack.grid, i, item)
                placed = true
                break
              }
            }
          }
          if (!placed) {
            this.$store.commit('set_player_gold', Math.floor(item.lv * item.quality.qualityCoefficient * 30))
          }
          drop = item.type.name
        }
      }
      this.$store.commit('set_campaign', {
        sweeps: (this.campaign.sweeps || 0) + 1
      })
      this.$store.commit('report', {
        key: 'sweeps',
        num: 1
      })
      sfx.play('coin')
      this.report = {
        title: `扫荡 · 第 ${this.cur}-${stage} 关 ${m.name}`,
        t: 0,
        dmg: 0,
        pct: 100,
        stars: s.stars,
        gain: '金币 ' + this.fmt(gold) + (rew.echoes ? ' · 回响 ' + rew.echoes : '') + (drop ? ' · 掉了 ' + drop : ''),
        drop: drop
      }
    },
    sweepChapter() {
      const targets = this.sweepTargets
      if (!targets.length) {
        this.info('本章还没有可扫荡的 3★ 关卡')
        return
      }
      if (!this.canSweepAll) {
        this.info('体力不够（需要 ' + SWEEP.cost * targets.length + ' 点）')
        sfx.play('ui_error')
        return
      }
      let gold = 0
      let echoes = 0
      targets.forEach(st => {
        const rew = sweepReward(this.cur, st, 1)
        gold += rew.gold
        echoes += rew.echoes
      })
      gold = Math.floor(gold * (1 + Math.min(100, Number(this.eff.GOLDGAIN || 0)) / 100))
      this.$store.commit('spend_stamina', SWEEP.cost * targets.length)
      this.$store.commit('grant_reward', {
        gold: gold,
        echoes: echoes
      })
      this.$store.commit('set_campaign', {
        sweeps: (this.campaign.sweeps || 0) + targets.length
      })
      this.$store.commit('report', {
        key: 'sweeps',
        num: targets.length
      })
      sfx.play('coin')
      this.info(`扫荡 ${targets.length} 关：金币 ${this.fmt(gold)}，回响 ${echoes}`, 'win')
      this.report = {
        title: `一键扫荡 · ${this.chapter.name}`,
        t: 0,
        dmg: 0,
        pct: 100,
        stars: 3,
        gain: '金币 ' + this.fmt(gold) + ' · 回响 ' + echoes,
        drop: ''
      }
    },
    evenLvUp(lv) {
      // 保留给 index.vue 的等级提升逻辑（章节首领同样能推等级）
      if (lv > this.playerLv) {
        this.$store.commit('set_player_lv', lv)
      }
    }
  },
  beforeDestroy() {
    if (this.timer) {
      clearInterval(this.timer)
    }
  }
}
</script>

<style lang="scss" scoped>
.camp-root {
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

.camp {
  position: relative;
  width: 9.4rem;
  max-width: 98%;
  height: 7rem;
  max-height: 94%;
  display: flex;
  flex-direction: column;
  color: #ddd;
  font-size: 0.12rem;

  .title {
    flex: 0 0 auto;
    height: 0.46rem;
    display: flex;
    align-items: center;
    padding: 0 0.12rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    > span {
      font-size: 0.18rem;
      letter-spacing: 0.04rem;
      color: #f0dcae;
    }

    .close {
      width: 0.2rem;
      height: 0.2rem;
      margin-left: 0.1rem;
      cursor: pointer;
      color: #999;
      text-align: center;
      line-height: 0.2rem;
    }

    .close:before {
      content: '✕';
    }
  }

  .stamina {
    display: flex;
    align-items: center;
    margin-left: 0.16rem;

    i {
      font-style: normal;
      color: #91897c;
      margin-right: 0.04rem;
    }

    .sbar {
      width: 1.1rem;
      height: 0.07rem;
      background: #000;
      border: 1px solid #3a3631;
      position: relative;

      b {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #6fbf73, #b6ff9a);
        transition: width 0.25s linear;
      }
    }

    span {
      margin-left: 0.04rem;
      color: #d9cfbc;
    }

    em {
      font-style: normal;
      font-size: 0.1rem;
      color: #8b8378;
      margin-left: 0.05rem;
    }

    &.full .sbar b {
      background: linear-gradient(90deg, #d9b45f, #ffe9b8);
    }

    &.empty .sbar b {
      background: linear-gradient(90deg, #a33b2c, #ff8f7a);
    }
  }

  .sum {
    margin-left: auto;
    color: #8b8378;
    font-size: 0.11rem;

    b {
      color: #ffd76a;
      font-weight: 600;
    }
  }

  .body {
    flex: 1 1 auto;
    display: flex;
    overflow: hidden;
  }
}

.chapters {
  width: 2.1rem;
  flex: 0 0 auto;
  overflow-y: auto;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.04rem 0;

  .chapter {
    display: flex;
    align-items: center;
    padding: 0.04rem 0.06rem;
    cursor: pointer;
    border-left: 2px solid transparent;

    &:hover {
      background: rgba(255, 255, 255, 0.03);
    }

    .c-lv {
      width: 0.3rem;
      height: 0.3rem;
      flex: 0 0 auto;
      margin-right: 0.05rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.12rem;
      color: #1a1408;
      font-weight: 700;
      background: linear-gradient(180deg, #cbbfa8, #7e7466);
      border-radius: 2px;
    }

    .c-main {
      min-width: 0;
    }

    .c-name {
      font-size: 0.12rem;
      color: #ddd3c0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .c-star {
      display: flex;
      align-items: center;
      margin-top: 0.01rem;

      i {
        width: 0.03rem;
        height: 0.05rem;
        background: #35322d;
        margin-right: 1px;
      }

      i.on {
        background: #ffb02e;
        box-shadow: 0 0 0.02rem rgba(255, 176, 46, 0.7);
      }

      span {
        font-size: 0.1rem;
        color: #7e776c;
        margin-left: 0.03rem;
      }
    }

    .c-lock {
      margin-left: auto;
      font-size: 0.12rem;
      opacity: 0.6;
    }

    .c-perfect {
      margin-left: auto;
      font-size: 0.1rem;
      color: #ffd76a;
      border: 1px solid rgba(255, 215, 106, 0.4);
      border-radius: 2px;
      padding: 0 0.02rem;
    }
  }

  .chapter.on {
    background: linear-gradient(90deg, rgba(232, 200, 116, 0.14), transparent);
    border-left-color: #e8c874;
  }

  .chapter.lock {
    opacity: 0.5;
    cursor: default;
  }
}

.stage-area {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 0.06rem 0.1rem;
}

.ch-head {
  display: flex;
  align-items: center;

  > div:first-child b {
    font-size: 0.16rem;
    color: #f0dcae;
  }

  > div:first-child i {
    display: block;
    font-style: normal;
    font-size: 0.1rem;
    color: #8b8378;
  }

  .mydps {
    margin-left: 0.12rem;
    font-size: 0.11rem;
    color: #91897c;

    b {
      color: #cfe6ff;
      font-weight: 600;
    }
  }

  .sweepall {
    margin-left: auto;
    padding: 0.03rem 0.07rem;
    font-size: 0.11rem;
    border-radius: 2px;
    color: #ffe9b8;
  }
}

.ch-desc {
  margin: 0.03rem 0 0.06rem;
  font-size: 0.11rem;
  color: #8b8378;
  font-style: italic;
}

.stages {
  display: flex;
  flex-wrap: wrap;
}

.node {
  width: 1.62rem;
  margin: 0 0.05rem 0.06rem 0;
  padding: 0.05rem;
  background: linear-gradient(180deg, rgba(28, 24, 20, 0.85), rgba(10, 9, 8, 0.9));
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  position: relative;

  &.boss {
    border-color: rgba(255, 120, 90, 0.35);
  }

  &.clear {
    border-color: rgba(120, 200, 130, 0.35);
  }

  &.star3 {
    box-shadow: 0 0 0.06rem rgba(255, 200, 90, 0.25);
  }

  &.locked {
    opacity: 0.45;
  }

  .n-head {
    display: flex;
    align-items: center;
    margin-bottom: 0.04rem;

    .n-idx {
      font-style: normal;
      width: 0.18rem;
      height: 0.18rem;
      line-height: 0.18rem;
      text-align: center;
      color: #1a1408;
      background: linear-gradient(180deg, #ffe9b8, #c9a44f);
      border-radius: 50%;
      font-size: 0.11rem;
      font-weight: 700;
      margin-right: 0.03rem;
    }

    span {
      font-size: 0.12rem;
      color: #e5dcc9;
    }

    em {
      margin-left: auto;
      font-style: normal;
      font-size: 0.1rem;
      color: #7dd47f;
    }
  }

  .n-mon {
    .row {
      display: flex;
      font-size: 0.1rem;
      line-height: 1.6;
      color: #8b8378;

      b {
        margin-left: auto;
        color: #d9cfbc;
        font-weight: 400;

        &.bad {
          color: #ff6b5e;
        }

        &.gold {
          color: #ffd76a;
        }
      }
    }
  }

  .n-stars {
    display: flex;
    align-items: center;
    margin: 0.03rem 0;

    i {
      font-style: normal;
      color: #4a4640;
      font-size: 0.14rem;

      &.on {
        color: #ffb02e;
        text-shadow: 0 0 0.04rem rgba(255, 176, 46, 0.8);
      }
    }

    em {
      margin-left: auto;
      font-style: normal;
      font-size: 0.1rem;
      color: #6f685e;
    }
  }

  .n-btns {
    display: flex;

    .b {
      flex: 1 1 0;
      min-width: 0;
      text-align: center;
      padding: 0.03rem 0.02rem;
      margin-right: 0.03rem;
      border-radius: 2px;

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
      }
    }

    .b:last-child {
      margin-right: 0;
    }

    .btn-ghost {
      background: rgba(12, 11, 10, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 2px;
    }
  }
}

.report {
  margin-top: 0.04rem;
  padding: 0.05rem 0.07rem;
  border: 1px solid rgba(232, 200, 116, 0.25);
  background: linear-gradient(180deg, rgba(60, 46, 18, 0.4), rgba(10, 9, 8, 0.6));

  .r-title {
    color: #ffd76a;
    font-size: 0.13rem;
    margin-bottom: 0.03rem;
  }

  .r-grid {
    display: flex;
    flex-wrap: wrap;

    .cell {
      width: 33%;
      display: flex;
      font-size: 0.11rem;

      span {
        color: #91897c;
      }

      b {
        margin-left: auto;
        color: #e8dcc2;
        font-weight: 400;

        &.gold {
          color: #ffd76a;
        }
      }
    }
  }
}

.tips {
  margin-top: 0.06rem;
  font-size: 0.1rem;
  color: #6f685e;
  line-height: 1.7;
}
</style>
