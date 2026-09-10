<template>
  <div class="abyss" v-show="visible">
    <div class="abyss-panel">
      <div class="title">
        <span>深渊回廊</span>
        <div class="echoes">
          回响：<b>{{abyss.echoes}}</b>
          <i class="tip" title="回响通过深渊回廊获得，可在祭坛购买永久强化，强化对主世界同样生效">?</i>
        </div>
        <i class="close" @click="close"></i>
      </div>

      <!-- 顶部标签 -->
      <div class="tabs">
        <div :class="{active:tab=='corridor'}" @click="tab='corridor'">回廊</div>
        <div :class="{active:tab=='altar'}" @click="tab='altar'">深渊祭坛</div>
        <div class="record">
          最深 <b>{{abyss.bestFloor}}</b> 层 · 总局数 <b>{{abyss.runs}}</b> · 累计回响 <b>{{abyss.totalEchoes}}</b>
        </div>
      </div>

      <!-- ============ 回廊 ============ -->
      <div class="body" v-show="tab=='corridor'">
        <div class="corridor" v-if="!run">
          <div class="preview">
            <div class="preview-left">
              <div class="power">
                <div class="row"><span>面板 DPS</span><b>{{effPreview.DPS}}</b></div>
                <div class="row"><span>生命值</span><b>{{effPreview.MAXHP}}</b></div>
                <div class="row"><span>减伤</span><b>{{effPreview.DR}}%</b></div>
                <div class="row"><span>反伤</span><b>{{effPreview.THORNS}}%</b></div>
                <div class="row"><span>闪避</span><b>{{effPreview.EVA}}%</b></div>
                <div class="row"><span>祝福选项</span><b>{{pickCount}}</b></div>
              </div>
              <p class="note">
                - 强度以「进入时的面板」为锚点，之后每层按固定曲线变强<br>
                - 每通过一层选一个祝福，可反复叠加，越叠越离谱<br>
                - 第 3 层为精英，每 5 层为首领（回满血）<br>
                - 随时可以「带着回响撤退」，死了只能带走 {{keepPct}}%<br>
                - 深渊使用独立的深渊生命，不会影响主世界的血量
              </p>
            </div>
            <div class="preview-right">
              <div class="floor-preview" v-for="f in previewFloors" :key="f.floor">
                <div class="fp-name" :class="{boss:f.isBoss,elite:f.isElite}">{{f.name}}</div>
                <div class="fp-row">生命 {{f.HP}} / 攻击 {{f.ATK}}</div>
                <div class="fp-row">回响 +{{f.echo}} · 金币 +{{f.gold}}</div>
              </div>
              <div class="btn start" @click="startRun()">进入深渊</div>
            </div>
          </div>
        </div>

        <div class="corridor running" v-else>
          <div class="run-head">
            <div class="floor">第 <b>{{run.floor}}</b> 层</div>
            <div class="hpbar">
              <div class="bar"><i :style="{width:run.hp/run.maxHp*100+'%'}"></i></div>
              <span>{{run.hp}} / {{run.maxHp}}</span>
            </div>
            <div class="gain">本局回响 <b>{{run.echo}}</b> · 金币 <b>{{run.gold}}</b></div>
          </div>

          <div class="run-main">
            <div class="monster">
              <div class="m-name" :class="{boss:nextFloor.isBoss,elite:nextFloor.isElite}">{{nextFloor.name}}</div>
              <div class="m-attr">
                <div>生命 {{nextFloor.attribute.HP}}</div>
                <div>攻击 {{nextFloor.attribute.ATK}}</div>
                <div>预计战斗 {{nextFloor.battleTime.toFixed(1)}}s</div>
                <div>危险度 {{(1/nextFloor.difficulty*100).toFixed(0)}}%</div>
              </div>
              <div class="m-handle">
                <div class="btn" @click="fight">开战</div>
                <div class="btn gray" @click="retreat">带着回响撤退</div>
              </div>
              <div class="log">
                <p v-for="(l,i) in run.log" :key="i" :class="l.type">{{l.msg}}</p>
              </div>
            </div>
            <div class="blessings">
              <div class="b-title">祝福（{{blessingCount}}）</div>
              <div class="b-list">
                <div class="b-item" v-for="b in ownedBlessings" :key="b.id" :style="{borderColor:b.color}">
                  <span class="bn" :style="{color:b.color}">{{b.name}}</span>
                  <span class="bs">×{{b.num}}</span>
                  <span class="bd">{{b.desc}}</span>
                </div>
                <div class="b-empty" v-if="!ownedBlessings.length">还没有任何祝福，先打赢一层吧。</div>
              </div>
            </div>
          </div>

          <!-- 祝福选择 -->
          <div class="pick-mask" v-if="choices.length">
            <div class="pick-title">选择一份祝福 · 第 {{run.floor}} 层</div>
            <div class="pick-list">
              <div class="card" v-for="c in choices" :key="c.id" :style="{'box-shadow':'0 0 6px 2px '+c.color+'99',borderColor:c.color}"
                @click="pick(c)">
                <div class="c-r" :style="{color:c.color}">{{rarityName(c.rarity)}}</div>
                <div class="c-n">{{c.name}}</div>
                <div class="c-d">{{c.desc}}</div>
                <div class="c-s">已有 {{run.stacks[c.id]||0}} / {{c.max}} 层</div>
              </div>
            </div>
            <div class="pick-skip" @click="skipPick">跳过（获得 20 回响）</div>
          </div>
        </div>
      </div>

      <!-- ============ 祭坛 ============ -->
      <div class="body" v-show="tab=='altar'">
        <div class="altar">
          <div class="a-tip">
            回响是深渊的通货，祭坛的强化<b>永久生效</b>（转生也不会消失），并且会反馈到主世界。
          </div>
          <div class="perk" v-for="p in perks" :key="p.id">
            <div class="p-info">
              <div class="p-name">{{p.name}} <span class="p-lv">Lv {{p.lv}}/{{p.max}}</span></div>
              <div class="p-des">{{p.des}}</div>
            </div>
            <div class="p-buy" :class="{disable:abyss.echoes<p.cost||p.lv>=p.max, max:p.lv>=p.max}" @click="buy(p)">
              <span v-if="p.lv>=p.max">已满级</span>
              <span v-else>{{p.cost}} 回响</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computeEffectiveAttribute, resolveBattle } from '../../assets/js/battle'
import {
  BLESSINGS,
  RARITY_META,
  rollBlessings,
  aggregateBlessings,
  aggregatePerks,
  ABYSS_PERKS,
  perkCost,
  createAbyssFloor
} from '../../assets/config/abyss'

export default {
  name: 'abyssPanel',
  data() {
    return {
      visible: false,
      tab: 'corridor',
      choices: [],
      preview: null
    };
  },
  computed: {
    attribute() {
      return this.$store.state.playerAttribute.attribute
    },
    abyss() {
      return this.$store.state.abyss
    },
    run() {
      return this.abyss.run
    },
    bonus() {
      return this.$store.state.bonus
    },
    // 局外面板预览：祝福之外的一切加成都已生效
    eff() {
      const mods = this.run ? this.run.mods : {}
      return computeEffectiveAttribute(this.attribute, mods)
    },
    effPreview() {
      const e = this.eff
      return {
        DPS: Math.round(e.DPS),
        MAXHP: Math.round(e.MAXHP),
        DR: ((1 - e.REDUCDMG) * 100).toFixed(1),
        THORNS: Math.round(e.THORNS),
        EVA: Math.round(e.EVA * 10) / 10
      }
    },
    pickCount() {
      return 3 + Number(this.bonus.EXTRA_PICK || 0)
    },
    keepPct() {
      return Math.round((60 + Number(this.bonus.DEATH_KEEP || 0)) / 1)
    },
    nextFloor() {
      if (this.run) {
        return this.run.nextFloor
      }
      return this.previewFloors[0]
    },
    previewFloors() {
      if (this._pv && this._pvKey === this.keyOf()) {
        return this._pv
      }
      const anchor = {
        DPS: this.eff.DPS,
        MAXHP: this.eff.MAXHP
      }
      const arr = []
      for (let f = 1; f <= 5; f++) {
        const floor = createAbyssFloor(f, anchor)
        arr.push({
          floor: f,
          name: floor.name,
          isBoss: floor.isBoss,
          isElite: floor.isElite,
          HP: floor.attribute.HP,
          ATK: floor.attribute.ATK,
          echo: floor.echo,
          gold: floor.gold
        })
      }
      this._pv = arr
      this._pvKey = this.keyOf()
      return arr
    },
    ownedBlessings() {
      if (!this.run) {
        return []
      }
      return Object.keys(this.run.stacks).map(id => {
        const b = BLESSINGS.find(v => v.id === id) || {}
        return Object.assign({}, b, {
          num: this.run.stacks[id],
          color: (RARITY_META[b.rarity] || {}).color
        })
      }).sort((a, b) => b.rarity - a.rarity)
    },
    blessingCount() {
      return this.ownedBlessings.reduce((s, v) => s + v.num, 0)
    },
    perks() {
      const levels = this.abyss.perks || {}
      return ABYSS_PERKS.map(p => ({
        id: p.id,
        name: p.name,
        des: p.des,
        max: p.max,
        lv: levels[p.id] || 0,
        cost: perkCost(p, levels[p.id] || 0)
      }))
    }
  },
  methods: {
    keyOf() {
      return [this.attribute.DPS, this.attribute.MAXHP.value, JSON.stringify(this.bonus)].join('|')
    },
    rarityName(r) {
      return (RARITY_META[r] || {}).name
    },
    open() {
      this.visible = true
      this._pv = null
    },
    close() {
      this.visible = false
    },
    buildMods(stacks) {
      // 闪避 / 固定减伤在 store 中已折进 REDUCDMG，这里要合并而不是重算，避免重复计算
      const bMod = aggregateBlessings(stacks)
      const mods = Object.assign({}, bMod, {
        EVA: Number(this.attribute.EVA.value || 0) + Number(bMod.EVA || 0),
        DR: Number(this.attribute.DR || 0) + Number(bMod.DR || 0),
        ATKPERCENT: Number(bMod.ATKPERCENT || 0),
        DEFPERCENT: Number(bMod.DEFPERCENT || 0),
        HPPERCENT: Number(bMod.HPPERCENT || 0),
        BLOCPERCENT: Number(bMod.BLOCPERCENT || 0)
      })
      return mods
    },
    startRun() {
      this._pv = null
      const eff = this.eff
      const maxHp = Math.floor(eff.MAXHP)
      const stacks = {}
      const mods = this.buildMods(stacks)
      const e2 = computeEffectiveAttribute(this.attribute, mods)
      const run = {
        floor: 1,
        maxHp: maxHp,
        hp: maxHp,
        stacks,
        mods,
        echo: 0,
        gold: 0,
        log: [],
        anchor: {
          DPS: e2.DPS,
          MAXHP: maxHp
        },
        nextFloor: createAbyssFloor(1, {
          DPS: e2.DPS,
          MAXHP: maxHp
        })
      }
      this.$store.commit('set_abyss', {
        run
      })
      this.$store.commit('set_sys_info', {
        msg: `你踏入了深渊回廊，回响在低语：再深一点，就再深一点。`,
        type: 'warning'
      });
    },
    refreshFloor() {
      const run = this.run
      run.nextFloor = createAbyssFloor(run.floor, run.anchor)
    },
    fight() {
      const run = this.run
      if (!run) {
        return
      }
      const eff = this.eff
      const res = resolveBattle(eff, run.nextFloor.attribute, {
        curHp: run.hp
      })
      const fl = run.nextFloor
      if (res.win) {
        // 奖励
        const goldK = 1 + Number(eff.GOLDGAIN || 0) / 100 + Math.min(100, Number(eff.LUCK || 0)) / 200
        const echo = Math.floor(fl.echo * goldK)
        run.echo += echo
        run.gold += Math.floor(fl.gold * goldK)
        run.hp = Math.max(1, run.hp - res.damageTaken)
        let healMsg = ''
        if (res.heal > 0) {
          run.hp = Math.min(run.maxHp, run.hp + res.heal)
          healMsg = `，吸血回复${res.heal}`
        }
        // 层间回复：受 REGEN 影响
        const healPct = Math.min(30, 8 + Number(eff.REGEN || 0) * 0.03) / 100
        const healed = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * healPct))
        if (healed > run.hp) {
          healMsg += `，深渊的呼吸让你回复${healed - run.hp}`
        }
        run.hp = healed
        if (fl.isBoss) {
          run.hp = run.maxHp
          healMsg += `，首领倒下后深渊短暂平静（生命回满）`
        }
        if (res.revived) {
          run.hp = Math.min(run.maxHp, run.hp + (res.heal > 0 ? 0 : 0))
        }
        this.pushLog(`击败${fl.name}：受到 ${res.damageTaken} 伤害${healMsg}，回响 +${echo}`, 'win')
        run.floor++
        this.refreshFloor()
        this.openChoices()
      } else {
        this.pushLog(`${fl.name}击溃了你（承受 ${res.damageTaken} 伤害）`, 'warning')
        this.endRun(false)
        return
      }
      this.$forceUpdate()
    },
    openChoices() {
      const run = this.run
      const num = this.pickCount + Object.keys(run.stacks).reduce((s, id) => {
        const b = BLESSINGS.find(v => v.id === id)
        return s + ((b && b.mods.EXTRA_PICK) ? b.mods.EXTRA_PICK * run.stacks[id] : 0)
      }, 0)
      this.choices = rollBlessings(run.stacks, num, Number(this.eff.LUCK || 0))
      if (!this.choices.length) {
        this.choices = []
      }
    },
    pick(c) {
      const run = this.run
      this.$set(run.stacks, c.id, (run.stacks[c.id] || 0) + 1)
      run.mods = this.buildMods(run.stacks)
      run.maxHp = Math.floor(this.eff.MAXHP)
      run.hp = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * Number(this.eff.mods.HPPERCENT || 0) / 400))
      this.pushLog(`获得祝福「${c.name}」×${run.stacks[c.id]}`, 'trophy')
      this.choices = []
      this.$forceUpdate()
    },
    skipPick() {
      const run = this.run
      run.echo += 20
      this.choices = []
      this.$forceUpdate()
    },
    retreat() {
      this.endRun(true)
    },
    endRun(voluntary) {
      const run = this.run
      if (!run) {
        return
      }
      const keepK = voluntary ? 1 : Math.min(1, (60 + Number(this.bonus.DEATH_KEEP || 0)) / 100)
      const echo = Math.floor(run.echo * keepK)
      const gold = Math.floor(run.gold * keepK)
      const depth = run.floor - 1
      this.$store.commit('add_echoes', echo)
      if (gold > 0) {
        this.$store.commit('set_player_gold', gold)
      }
      if (depth > this.abyss.bestFloor) {
        this.$store.commit('set_abyss', {
          bestFloor: depth
        })
      }
      this.$store.commit('set_abyss', {
        run: null,
        runs: this.abyss.runs + 1,
        wins: this.abyss.wins + (voluntary && depth > 0 ? 1 : 0)
      })
      if (voluntary) {
        this.$store.commit('report', {
          key: 'dungeons',
          num: 1,
          check: false
        })
      }
      this.$store.commit('report', {
        key: 'abyssFloors',
        num: depth,
        check: false
      })
      this.$store.commit('check_achievements')
      this.choices = []
      this.$store.commit('set_sys_info', {
        msg: voluntary ?
          `你从深渊第 ${depth} 层撤退，带走 ${echo} 回响、${gold} 金币。` :
          `深渊吞掉了你（第 ${depth} 层），只带回了 ${echo} 回响（保留 ${Math.round(keepK * 100)}%）。`,
        type: voluntary ? 'win' : 'warning'
      });
    },
    pushLog(msg, type) {
      this.run.log.unshift({
        msg,
        type
      })
      if (this.run.log.length > 30) {
        this.run.log.pop()
      }
    },
    buy(p) {
      if (p.lv >= p.max || this.abyss.echoes < p.cost) {
        return
      }
      this.$store.commit('buy_abyss_perk', p.id)
      this._pv = null
    }
  },
  watch: {
    visible(v) {
      if (!v) {
        this.$emit('closed')
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.abyss {
  position: absolute;
  inset: 0;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);

  .abyss-panel {
    position: relative;
    width: 7.4rem;
    max-width: 96%;
    height: 6.4rem;
    max-height: 92%;
    background: #16161c;
    border: 2px solid #ccc;
    display: flex;
    flex-direction: column;
    color: #eee;

    .title {
      height: 0.5rem;
      display: flex;
      align-items: center;
      padding: 0 0.15rem;
      border-bottom: 2px solid #ccc;
      font-size: 0.24rem;
      font-weight: bold;

      .echoes {
        margin-left: auto;
        font-size: 0.16rem;
        font-weight: normal;
        display: flex;
        align-items: center;

        b {
          color: #8dff9e;
          margin: 0 0.06rem;
        }

        .tip {
          width: 0.18rem;
          height: 0.18rem;
          line-height: 0.16rem;
          text-align: center;
          border: 1px solid #888;
          border-radius: 50%;
          font-size: 0.12rem;
          color: #888;
          cursor: help;
        }
      }

      .close {
        width: 0.24rem;
        height: 0.24rem;
        margin-left: 0.15rem;
        cursor: pointer;
        background: #ccc;
        clip-path: polygon(20% 0, 50% 30%, 80% 0, 100% 20%, 70% 50%, 100% 80%, 80% 100%, 50% 70%, 20% 100%, 0 80%, 30% 50%, 0 20%);
      }
    }

    .tabs {
      display: flex;
      align-items: center;
      padding: 0.1rem 0.15rem;
      font-size: 0.18rem;
      border-bottom: 1px solid #444;

      &>div:not(.record) {
        padding: 0.05rem 0.2rem;
        border: 2px solid #555;
        margin-right: 0.1rem;
        cursor: pointer;

        &.active {
          border-color: #8dff9e;
          color: #8dff9e;
        }
      }

      .record {
        margin-left: auto;
        font-size: 0.14rem;
        color: #999;
      }
    }

    .body {
      flex: 1;
      overflow: auto;
      padding: 0.15rem;
    }

    .btn {
      display: inline-block;
      padding: 0.08rem 0.25rem;
      border: 2px solid #8dff9e;
      color: #8dff9e;
      cursor: pointer;
      font-size: 0.18rem;
      text-align: center;

      &:hover {
        background: #8dff9e;
        color: #111;
      }

      &.gray {
        border-color: #888;
        color: #ccc;

        &:hover {
          background: #888;
          color: #111;
        }
      }
    }

    .preview {
      display: flex;
      gap: 0.2rem;
      height: 100%;

      .preview-left,
      .preview-right {
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      .power {
        border: 1px solid #444;
        padding: 0.1rem;

        .row {
          display: flex;
          justify-content: space-between;
          font-size: 0.16rem;
          line-height: 0.28rem;

          b {
            color: #8dff9e;
          }
        }
      }

      .note {
        font-size: 0.14rem;
        color: #999;
        margin-top: 0.12rem;
        line-height: 0.24rem;
      }

      .floor-preview {
        border: 1px solid #444;
        padding: 0.06rem 0.1rem;
        margin-bottom: 0.06rem;
        font-size: 0.14rem;

        .fp-name {
          color: #ddd;
        }

        .fp-name.elite {
          color: #ff00ff;
        }

        .fp-name.boss {
          color: #f78918;
        }

        .fp-row {
          color: #888;
        }
      }

      .start {
        margin-top: auto;
        align-self: center;
      }
    }

    .running {
      display: flex;
      flex-direction: column;
      height: 100%;

      .run-head {
        display: flex;
        align-items: center;
        font-size: 0.18rem;

        .floor b {
          color: #8dff9e;
          font-size: 0.24rem;
        }

        .hpbar {
          flex: 1;
          margin: 0 0.2rem;
          display: flex;
          align-items: center;

          .bar {
            flex: 1;
            height: 0.14rem;
            border: 1px solid #666;
            margin-right: 0.1rem;

            i {
              display: block;
              height: 100%;
              background: linear-gradient(90deg, #ff5b5b, #ffd76b);
            }
          }

          span {
            font-size: 0.14rem;
            color: #bbb;
          }
        }

        .gain b {
          color: #8dff9e;
        }
      }

      .run-main {
        flex: 1;
        display: flex;
        gap: 0.2rem;
        margin-top: 0.12rem;
        min-height: 0;

        .monster,
        .blessings {
          border: 1px solid #444;
          padding: 0.1rem;
          overflow: auto;
        }

        .monster {
          flex: 1.1;

          .m-name {
            font-size: 0.2rem;

            &.elite {
              color: #ff00ff;
            }

            &.boss {
              color: #f78918;
            }
          }

          .m-attr {
            display: flex;
            flex-wrap: wrap;
            font-size: 0.14rem;
            color: #999;
            margin: 0.06rem 0 0.1rem;

            div {
              margin-right: 0.16rem;
            }
          }

          .m-handle {
            display: flex;
            margin-bottom: 0.1rem;

            .btn {
              margin-right: 0.12rem;
            }
          }

          .log {
            font-size: 0.14rem;
            color: #888;
            border-top: 1px dashed #444;
            padding-top: 0.06rem;

            p {
              line-height: 0.22rem;

              &.win {
                color: #8dff9e;
              }

              &.warning {
                color: #ff7875;
              }

              &.trophy {
                color: #f78918;
              }
            }
          }
        }

        .blessings {
          flex: 1;

          .b-title {
            font-size: 0.18rem;
            margin-bottom: 0.08rem;
          }

          .b-item {
            border: 1px solid #666;
            border-left-width: 3px;
            padding: 0.05rem 0.08rem;
            margin-bottom: 0.05rem;
            font-size: 0.14rem;

            .bs {
              color: #ffd76b;
              margin-left: 0.06rem;
            }

            .bd {
              display: block;
              color: #888;
            }
          }

          .b-empty {
            color: #666;
            font-size: 0.14rem;
          }
        }
      }

      .pick-mask {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        top: 0;
        background: rgba(6, 6, 10, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0.2rem;

        .pick-title {
          font-size: 0.2rem;
          margin-bottom: 0.16rem;
          color: #ccc;
        }

        .pick-list {
          display: flex;
          gap: 0.16rem;
          flex-wrap: wrap;
          justify-content: center;

          .card {
            width: 2rem;
            min-height: 1.6rem;
            border: 2px solid #666;
            padding: 0.1rem;
            cursor: pointer;
            background: #101018;

            &:hover {
              transform: translateY(-3px);
            }

            .c-r {
              font-size: 0.13rem;
            }

            .c-n {
              font-size: 0.19rem;
              margin: 0.04rem 0;
            }

            .c-d {
              font-size: 0.14rem;
              color: #bbb;
              line-height: 0.2rem;
            }

            .c-s {
              font-size: 0.12rem;
              color: #777;
              margin-top: 0.08rem;
            }
          }
        }

        .pick-skip {
          margin-top: 0.18rem;
          font-size: 0.14rem;
          color: #888;
          cursor: pointer;
          text-decoration: underline;
        }
      }
    }

    .altar {
      .a-tip {
        font-size: 0.15rem;
        color: #999;
        margin-bottom: 0.1rem;

        b {
          color: #8dff9e;
        }
      }

      .perk {
        display: flex;
        align-items: center;
        border: 1px solid #444;
        padding: 0.08rem 0.12rem;
        margin-bottom: 0.06rem;

        .p-info {
          flex: 1;

          .p-name {
            font-size: 0.18rem;

            .p-lv {
              font-size: 0.14rem;
              color: #8dff9e;
              margin-left: 0.06rem;
            }
          }

          .p-des {
            font-size: 0.14rem;
            color: #999;
          }
        }

        .p-buy {
          padding: 0.05rem 0.16rem;
          border: 1px solid #8dff9e;
          color: #8dff9e;
          cursor: pointer;
          font-size: 0.15rem;

          &.disable {
            border-color: #555;
            color: #666;
            cursor: not-allowed;
          }

          &.max {
            border-color: #ffd76b;
            color: #ffd76b;
          }
        }
      }
    }
  }
}
</style>
