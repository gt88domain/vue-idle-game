<template>
  <div class="daily-root" v-show="visible">
    <div class="daily panel-card">
      <div class="title">
        <span>每日</span>
        <div class="tabs">
          <div :class="{active: tab=='quest'}" @click="switchTab('quest')">今日任务</div>
          <div :class="{active: tab=='sign'}" @click="switchTab('sign')">签到</div>
        </div>
        <div class="reset">任务刷新倒计时 <b>{{resetText}}</b></div>
        <i class="close" @click="close"></i>
      </div>

      <!-- ============ 任务 ============ -->
      <div class="body" v-show="tab=='quest'">
        <div class="q-head">
          <div class="q-progress">
            今日已完成 <b>{{doneCount}}/{{quests.length}}</b>
            <div class="bar"><i :style="{width: (quests.length ? doneCount/quests.length*100 : 0) + '%'}"></i></div>
          </div>
          <div class="q-all btn-gold btn-press" :class="{'btn-disabled': !claimable.length}" @click="claimAll()">
            一键领取（{{claimable.length}}）
          </div>
        </div>

        <div class="quests">
          <div v-for="q in quests" :key="q.id" class="quest" :class="{done: q.done, got: q.claimed}">
            <div class="q-icon"><img :src="q.icon" alt=""></div>
            <div class="q-main">
              <div class="q-name">{{q.name}}<i class="q-reward">{{rewardText(q.reward)}}</i></div>
              <div class="q-des">{{q.des}}</div>
              <div class="q-bar">
                <i :style="{width: q.pct + '%'}"></i>
                <span>{{q.cur}} / {{q.goal}}</span>
              </div>
            </div>
            <div class="q-btn btn-gold btn-press" :class="{'btn-disabled': !q.canClaim}" @click="claim(q)">
              <b v-if="q.claimed">已领取</b>
              <b v-else-if="q.done">领取</b>
              <b v-else>进行中</b>
            </div>
          </div>
        </div>

        <div class="tips">
          <p v-for="(t, i) in DAILY_TIPS" :key="i">- {{t}}</p>
        </div>
      </div>

      <!-- ============ 签到 ============ -->
      <div class="body" v-show="tab=='sign'">
        <div class="s-top">
          <div class="s-streak">
            连续签到 <b>{{daily.signStreak || 0}}</b> 天
            <i>第 {{signPlan.index + 1}} 天奖励已就绪</i>
          </div>
          <div class="s-btn btn-gold btn-press" :class="{'btn-disabled': !signPlan.can}" @click="signIn()">
            <b>{{signPlan.can ? '今日签到' : '今日已签到'}}</b>
            <i>{{signPlan.can ? '领取第 ' + (signPlan.index + 1) + ' 天奖励' : '明天再来，连签 7 天有厚礼'}}</i>
          </div>
        </div>

        <div class="sign-grid">
          <div v-for="(d, i) in signCells" :key="i" class="sign-cell"
               :class="{got: d.got, now: d.now, big: i==6}">
            <div class="day">第 {{i + 1}} 天</div>
            <div class="name">{{d.name}}</div>
            <div class="rw">{{d.text}}</div>
            <div class="mark">{{d.got ? '✓' : (d.now ? '今日' : '')}}</div>
          </div>
        </div>

        <div class="s-note">
          断签会回到第 1 天；签到奖励里的<b>招募令</b>可以代替金币抽卡，<b>碎片</b>会发给你随机的一位英雄（还没英雄时先存着，抽到立刻补发）。
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  questById,
  questText,
  questProgress,
  questDone,
  questReward,
  signPlan,
  SIGN_REWARDS,
  signRewardValue,
  dayKey,
  DAILY_TIPS
} from '../../assets/config/daily'
import sfx from '../../assets/js/sfx'

export default {
  name: 'dailyPanel',
  data() {
    return {
      visible: false,
      tab: 'quest',
      now: Date.now(),
      timer: null,
      DAILY_TIPS: DAILY_TIPS
    }
  },
  computed: {
    daily() {
      return this.$store.state.daily || {
        quests: []
      }
    },
    playerLv() {
      return this.$store.state.playerAttribute.lv || 1
    },
    quests() {
      const stats = this.$store.state.stats
      return (this.daily.quests || []).map(q => {
        const cfg = questById(q.id) || {}
        const cur = questProgress(q, stats)
        const done = q.claimed || questDone(q, stats)
        return {
          id: q.id,
          name: cfg.name || q.id,
          des: questText(cfg, q.goal),
          icon: cfg.icon || './icons/menu/quest_icon_00.png',
          goal: q.goal,
          cur: Math.min(cur, q.goal),
          pct: Math.min(100, q.goal ? cur / q.goal * 100 : 100),
          done: !!done,
          claimed: !!q.claimed,
          canClaim: !q.claimed && questDone(q, stats),
          reward: questReward(q, this.playerLv)
        }
      })
    },
    claimable() {
      return this.quests.filter(q => q.canClaim)
    },
    doneCount() {
      return this.quests.filter(q => q.claimed).length
    },
    signPlan() {
      return signPlan(this.daily, this.now)
    },
    signCells() {
      // 本轮连签里已经领过的位置标 ✓，下一格标「今日」
      const idx = this.signPlan.index
      const signedToday = !this.signPlan.can
      return SIGN_REWARDS.map((r, i) => ({
        name: r.name,
        text: this.rewardText(signRewardValue(i, this.playerLv)),
        got: i < idx || (signedToday && i === idx),
        now: !signedToday && i === idx
      }))
    },
    resetText() {
      const d = new Date(this.now)
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0)
      let s = Math.max(0, Math.floor((next.getTime() - this.now) / 1000))
      const h = Math.floor(s / 3600)
      s -= h * 3600
      const m = Math.floor(s / 60)
      return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m)
    }
  },
  methods: {
    open(tab) {
      this.$store.commit('daily_rollover')
      this.visible = true
      if (tab) {
        this.tab = tab
      }
      this.tick()
      this.timer = setInterval(this.tick, 1000)
    },
    close() {
      this.visible = false
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },
    switchTab(t) {
      this.tab = t
      sfx.play('tab')
    },
    tick() {
      this.now = Date.now()
      // 跨零点自动换一批任务
      if (this.$store.state.daily.date !== dayKey(this.now)) {
        this.$store.commit('daily_rollover')
      }
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
    rewardText(r) {
      const p = []
      if (r.gold) {
        p.push('金币 ' + this.fmt(r.gold))
      }
      if (r.echoes) {
        p.push('回响 ×' + r.echoes)
      }
      if (r.shards) {
        p.push('英雄碎片 ×' + r.shards)
      }
      if (r.tickets) {
        p.push('招募令 ×' + r.tickets)
      }
      return p.join(' · ')
    },
    grant(q) {
      const r = q.reward || {}
      this.$store.commit('grant_reward', {
        gold: r.gold,
        echoes: r.echoes,
        shards: r.shards,
        tickets: r.tickets
      })
      this.$store.commit('daily_claim', q.id)
      sfx.play('coin')
    },
    claim(q) {
      if (q.claimed) {
        this.info('这份奖励今天已经领过了')
        return
      }
      if (!q.canClaim) {
        this.info('任务还没完成（' + q.cur + '/' + q.goal + '）')
        sfx.play('ui_error')
        return
      }
      this.grant(q)
      this.info(`领取「${q.name}」奖励：${this.rewardText(q.reward)}`, 'win')
    },
    claimAll() {
      const list = this.claimable
      if (!list.length) {
        this.info('暂无可领取的奖励')
        sfx.play('ui_error')
        return
      }
      const sum = {
        gold: 0,
        echoes: 0,
        shards: 0,
        tickets: 0
      }
      list.forEach(q => {
        this.grant(q)
        sum.gold += q.reward.gold || 0
        sum.echoes += q.reward.echoes || 0
        sum.shards += q.reward.shards || 0
        sum.tickets += q.reward.tickets || 0
      })
      this.info(`一键领取 ${list.length} 份奖励：${this.rewardText(sum)}`, 'win')
    },
    signIn() {
      const plan = this.signPlan
      if (!plan.can) {
        this.info('今天已经签过了，明天再来')
        sfx.play('ui_error')
        return
      }
      const r = signRewardValue(plan.index, this.playerLv)
      this.$store.commit('grant_reward', {
        gold: r.gold,
        echoes: r.echoes,
        shards: r.shards,
        tickets: r.tickets
      })
      this.$store.commit('daily_sign', {
        date: dayKey(this.now),
        index: plan.index,
        streak: plan.streak
      })
      this.$store.commit('report', {
        key: 'signDays',
        num: 1
      })
      sfx.play(plan.index === 6 ? 'rare' : 'enhance_ok')
      this.info(`签到成功（第 ${plan.index + 1} 天）：${this.rewardText(r)}`, 'win')
    },
    info(msg, type) {
      this.$store.commit('set_sys_info', {
        msg: msg,
        type: type || 'warning'
      })
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
.daily-root {
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

.daily {
  position: relative;
  width: 6.2rem;
  max-width: 96%;
  height: 5.6rem;
  max-height: 90%;
  display: flex;
  flex-direction: column;
  color: #ddd;
  font-size: 0.12rem;

  .title {
    flex: 0 0 auto;
    height: 0.44rem;
    display: flex;
    align-items: center;
    padding: 0 0.1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    > span {
      font-size: 0.18rem;
      letter-spacing: 0.04rem;
      color: #f0dcae;
    }

    .tabs {
      display: flex;
      margin-left: 0.14rem;

      > div {
        padding: 0.02rem 0.08rem;
        margin-right: 0.04rem;
        cursor: pointer;
        color: #9c9181;
        border-bottom: 2px solid transparent;
      }

      > div.active {
        color: #ffd76a;
        border-bottom-color: #e8c874;
      }
    }

    .reset {
      margin-left: auto;
      font-size: 0.1rem;
      color: #7e776c;

      b {
        color: #cfe6ff;
        font-weight: 400;
      }
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

  .body {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 0.06rem 0.1rem;
  }
}

.q-head {
  display: flex;
  align-items: center;
  margin-bottom: 0.06rem;

  .q-progress {
    display: flex;
    align-items: center;
    font-size: 0.11rem;
    color: #91897c;

    b {
      color: #ffd76a;
      font-weight: 600;
      margin-right: 0.05rem;
    }

    .bar {
      width: 1.2rem;
      height: 0.06rem;
      background: #000;
      border: 1px solid #3a3631;

      i {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #6fbf73, #b6ff9a);
        transition: width 0.2s ease;
      }
    }
  }

  .q-all {
    margin-left: auto;
    padding: 0.03rem 0.08rem;
    font-size: 0.11rem;
    color: #ffe9b8;
    border-radius: 2px;
  }
}

.quest {
  display: flex;
  align-items: center;
  padding: 0.05rem 0.06rem;
  margin-bottom: 0.05rem;
  background: linear-gradient(180deg, rgba(28, 24, 20, 0.8), rgba(10, 9, 8, 0.86));
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 3px;

  &.done {
    border-color: rgba(125, 212, 127, 0.4);
  }

  &.got {
    opacity: 0.55;
  }

  .q-icon {
    width: 0.32rem;
    height: 0.32rem;
    flex: 0 0 auto;
    margin-right: 0.06rem;
    background: #000;
    border: 1px solid rgba(255, 255, 255, 0.14);

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  .q-main {
    flex: 1 1 auto;
    min-width: 0;

    .q-name {
      display: flex;
      align-items: baseline;
      font-size: 0.13rem;
      color: #e5dcc9;

      .q-reward {
        font-style: normal;
        font-size: 0.1rem;
        color: #7dd47f;
        margin-left: 0.05rem;
      }
    }

    .q-des {
      font-size: 0.1rem;
      color: #8b8378;
      margin: 0.01rem 0 0.03rem;
    }

    .q-bar {
      position: relative;
      height: 0.06rem;
      background: #000;
      border: 1px solid #33302b;

      i {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #a97b2c, #ffd76a);
        transition: width 0.25s ease;
      }

      span {
        position: absolute;
        right: 0.02rem;
        top: -0.01rem;
        font-size: 0.1rem;
        color: #efe6d2;
        text-shadow: 0 1px 1px #000;
      }
    }
  }

  .q-btn {
    flex: 0 0 auto;
    margin-left: 0.08rem;
    padding: 0.04rem 0.08rem;
    border-radius: 2px;

    b {
      font-size: 0.12rem;
      color: #ffe9b8;
      font-weight: 400;
    }
  }
}

.s-top {
  display: flex;
  align-items: center;
  margin-bottom: 0.06rem;

  .s-streak {
    font-size: 0.12rem;
    color: #91897c;

    b {
      color: #ffd76a;
      font-size: 0.16rem;
      margin: 0 0.02rem;
    }

    i {
      display: block;
      font-style: normal;
      font-size: 0.1rem;
      color: #7e776c;
    }
  }

  .s-btn {
    margin-left: auto;
    text-align: center;
    padding: 0.04rem 0.1rem;
    border-radius: 2px;

    b {
      display: block;
      font-size: 0.14rem;
      color: #ffe9b8;
    }

    i {
      display: block;
      font-style: normal;
      font-size: 0.1rem;
      color: #b3a68d;
    }
  }
}

.sign-grid {
  display: flex;
  flex-wrap: wrap;

  .sign-cell {
    position: relative;
    width: 1.35rem;
    margin: 0 0.04rem 0.05rem 0;
    padding: 0.05rem 0.05rem 0.06rem;
    text-align: center;
    background: linear-gradient(180deg, rgba(28, 24, 20, 0.9), rgba(10, 9, 8, 0.9));
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 3px;

    .day {
      font-size: 0.1rem;
      color: #7e776c;
    }

    .name {
      font-size: 0.12rem;
      color: #e5dcc9;
      margin: 0.02rem 0;
    }

    .rw {
      font-size: 0.1rem;
      color: #7dd47f;
      min-height: 0.13rem;
    }

    .mark {
      position: absolute;
      top: 0.02rem;
      right: 0.03rem;
      font-size: 0.1rem;
      color: #ffd76a;
    }

    &.got {
      border-color: rgba(125, 212, 127, 0.35);
      opacity: 0.75;

      .mark {
        color: #7dd47f;
      }
    }

    &.now {
      border-color: #e8c874;
      box-shadow: 0 0 0.06rem rgba(232, 200, 116, 0.35);
    }

    &.big {
      border-color: rgba(255, 176, 46, 0.45);

      .name {
        color: #ffd76a;
      }
    }
  }
}

.s-note {
  margin-top: 0.04rem;
  font-size: 0.1rem;
  color: #7e776c;
  line-height: 1.7;

  b {
    color: #cbbfa8;
    font-weight: 400;
  }
}

.tips {
  margin-top: 0.06rem;
  font-size: 0.1rem;
  color: #6f685e;
  line-height: 1.7;
}
</style>
