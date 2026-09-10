<template>
  <div class="achv" v-show="visible">
    <div class="achv-panel">
      <div class="title">
        <span>成就 · 称号</span>
        <i class="close" @click="close"></i>
      </div>
      <div class="tabs">
        <div v-for="t in tabs" :key="t.id" :class="{active:tab==t.id}" @click="tab=t.id">
          {{t.name}}<i class="dot" v-if="t.id=='achv' && newCount"></i>
        </div>
      </div>

      <!-- 成就 -->
      <div class="body" v-show="tab=='achv'">
        <div class="progress-line">
          已达成 {{doneCount}} / {{achievements.length}} · 每达成一条可获得 {{ACHIEVEMENT_ECHO}} 回响与称号
        </div>
        <div class="a-item" v-for="a in achievements" :key="a.id" :class="{done:a.done}">
          <img :src="a.icon" alt="">
          <div class="a-mid">
            <div class="a-name">{{a.name}}<span class="a-title" v-if="a.titleName">称号：{{a.titleName}}</span></div>
            <div class="a-des">{{a.des}}</div>
            <div class="a-bar">
              <i :style="{width:Math.min(100,a.progress/a.goal*100)+'%'}"></i>
              <span>{{a.show}} / {{a.showGoal}}</span>
            </div>
          </div>
          <div class="a-state" :class="{done:a.done}">{{a.done?'已达成':'进行中'}}</div>
        </div>
      </div>

      <!-- 称号 -->
      <div class="body" v-show="tab=='title'">
        <div class="t-cur">
          当前佩戴：<b v-if="curTitle" :style="{color:curTitle.color||'#8dff9e'}">{{curTitle.name}}</b>
          <span v-else>无</span>
          <i class="clear" @click="takeOff" v-if="curTitle">卸下</i>
        </div>
        <div class="t-tip">称号是全局被动，同时只能佩戴一个 —— 想换玩法就得做取舍。</div>
        <div class="t-list">
          <div class="t-item" v-for="t in titles" :key="t.id" :class="{locked:!t.unlocked,active:curTitleId==t.id}" @click="wear(t)">
            <div class="t-name">{{t.name}}</div>
            <div class="t-des">{{t.des}}</div>
            <div class="t-mods">
              <span v-for="(v,k) in t.mods" :key="k">{{modName(k)}} +{{v}}{{unitOf(k)}}</span>
            </div>
            <div class="t-lock" v-if="!t.unlocked">未解锁</div>
          </div>
        </div>
      </div>

      <!-- 统计 & 设置 -->
      <div class="body" v-show="tab=='more'">
        <div class="stat-grid">
          <div class="s-item" v-for="s in statList" :key="s.k">
            <span>{{s.name}}</span>
            <b>{{s.val}}</b>
          </div>
        </div>
        <div class="set-line">
          <h3>玩法开关</h3>
          <label><input type="checkbox" :checked="settings.offlineGain" @change="toggle('offlineGain')"> 离线挂机收益（关闭页面也在赚金币）</label>
          <label><input type="checkbox" :checked="settings.autoFarm" @change="toggle('autoFarm')"> 自动征战（副本成功后自动重复挑战，死亡或背包满停止）</label>
          <label><input type="checkbox" :checked="settings.autoKeepSet" @change="toggle('autoKeepSet')"> 自动出售时保护套装部件</label>
          <p class="hint">
            「自动征战」需要在副本信息面板里勾选，这里只是全局开关；<br>
            套装保护默认开启，避免把关键部件当垃圾卖掉。
          </p>
        </div>
        <div class="set-line">
          <h3>当前生效的全局加成</h3>
          <div class="bonus-chips">
            <span v-for="(v,k) in bonus" :key="k">{{modName(k)}} +{{v | fix}}%</span>
            <i v-if="!hasBonus">暂无（打套装、戴称号、进深渊都会给）</i>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ACHIEVEMENTS, TITLES, ACHIEVEMENT_ECHO } from '../../assets/config/achievements'
import { SETS } from '../../assets/config/sets'

const MOD_NAMES = {
  ATKPERCENT: '攻击力',
  DEFPERCENT: '护甲',
  HPPERCENT: '生命值',
  BLOCPERCENT: '格挡',
  CRIT: '暴击率',
  CRITDMG: '暴击伤害',
  THORNS: '反伤',
  LIFESTEAL: '吸血',
  EVA: '闪避',
  DR: '减伤',
  PENETRATE: '穿透',
  GOLDGAIN: '金币获取',
  REGEN: '回血速度',
  LUCK: '幸运',
  ENCHANT: '强化成功率',
  SPEED: '征战速度',
  EXTRA_PICK: '祝福选项',
  DEATH_KEEP: '死亡保留',
  OFFLINE_CAP: '离线上限',
  EXECUTE: '处决',
  REVIVE: '免死',
  WRATH: '复仇之怒'
}

export default {
  name: 'achievementsPanel',
  filters: {
    fix(v) {
      return Math.round(Number(v) * 10) / 10
    }
  },
  data() {
    return {
      visible: false,
      tab: 'achv',
      tabs: [{
          id: 'achv',
          name: '成就'
        },
        {
          id: 'title',
          name: '称号'
        },
        {
          id: 'more',
          name: '统计 / 设置'
        }
      ],
      ACHIEVEMENT_ECHO
    };
  },
  computed: {
    snapshot() {
      const st = this.$store.state
      return {
        stats: st.stats,
        attribute: st.playerAttribute.attribute,
        playerAttribute: st.playerAttribute,
        reincarnation: st.reincarnation,
        abyss: st.abyss,
        setDetail: st.setDetail
      }
    },
    achievements() {
      const unlocked = this.$store.state.unlockedAchievements
      return ACHIEVEMENTS.map(a => {
        let cur = 0
        try {
          cur = Number(a.metric(this.snapshot)) || 0
        } catch (e) {
          cur = 0
        }
        const fmt = v => a.format ? a.format(v) : v
        return Object.assign({}, a, {
          done: !!unlocked[a.id],
          progress: cur,
          show: fmt(Math.min(cur, a.goal)),
          showGoal: fmt(a.goal),
          titleName: a.title && TITLES[a.title] ? TITLES[a.title].name : ''
        })
      }).sort((x, y) => (y.done - x.done) || (y.progress / y.goal - x.progress / x.goal))
    },
    doneCount() {
      return this.achievements.filter(v => v.done).length
    },
    newCount() {
      return 0
    },
    titles() {
      const unlocked = this.$store.state.unlockedAchievements
      const achByTitle = {}
      ACHIEVEMENTS.forEach(a => {
        if (a.title) {
          achByTitle[a.title] = a
        }
      })
      return Object.keys(TITLES).map(id => ({
        id,
        name: TITLES[id].name,
        des: TITLES[id].des,
        mods: TITLES[id].mods,
        unlocked: !achByTitle[id] || !!unlocked[achByTitle[id].id]
      }))
    },
    curTitleId() {
      return this.$store.state.title
    },
    curTitle() {
      return TITLES[this.curTitleId] || null
    },
    bonus() {
      return this.$store.state.bonus
    },
    hasBonus() {
      return Object.keys(this.bonus).length > 0
    },
    settings() {
      return this.$store.state.settings
    },
    statList() {
      const s = this.$store.state.stats
      const a = this.$store.state.abyss
      return [{
          k: 'kills',
          name: '击杀怪物',
          val: s.kills
        },
        {
          k: 'bossKills',
          name: '击杀首领',
          val: s.bossKills
        },
        {
          k: 'dungeons',
          name: '通关次数',
          val: s.dungeons
        },
        {
          k: 'deaths',
          name: '挑战失败',
          val: s.deaths
        },
        {
          k: 'goldEarned',
          name: '累计金币',
          val: this.bigNum(s.goldEarned)
        },
        {
          k: 'uniqueDrops',
          name: '独特装备',
          val: s.uniqueDrops
        },
        {
          k: 'setDrops',
          name: '套装部件',
          val: s.setDrops
        },
        {
          k: 'maxEnchant',
          name: '最高强化',
          val: '+' + s.maxEnchant
        },
        {
          k: 'recasts',
          name: '重铸次数',
          val: s.recasts
        },
        {
          k: 'abyssBest',
          name: '深渊最深',
          val: a.bestFloor + ' 层'
        },
        {
          k: 'abyssFloors',
          name: '深渊总层数',
          val: a.totalEchoes ? s.abyssFloors : 0
        },
        {
          k: 'echoes',
          name: '回响存量',
          val: a.echoes
        }
      ]
    }
  },
  methods: {
    bigNum(v) {
      v = Number(v) || 0
      if (v >= 100000000) {
        return (v / 100000000).toFixed(2) + '亿'
      }
      if (v >= 10000) {
        return (v / 10000).toFixed(1) + '万'
      }
      return v
    },
    modName(k) {
      return MOD_NAMES[k] || k
    },
    unitOf(k) {
      return ['OFFLINE_CAP', 'EXTRA_PICK', 'DEATH_KEEP', 'LUCK', 'REGEN'].indexOf(k) > -1 ? '' : '%'
    },
    open(tab) {
      this.visible = true
      if (tab) {
        this.tab = tab
      }
      this.$store.commit('check_achievements')
    },
    close() {
      this.visible = false
    },
    wear(t) {
      if (!t.unlocked) {
        this.$store.commit('set_sys_info', {
          msg: `还没解锁这个称号呢，先去成就页看看条件。`,
          type: 'warning'
        });
        return
      }
      this.$store.commit('set_title', this.curTitleId == t.id ? '' : t.id)
      this.$store.commit('set_sys_info', {
        msg: this.curTitleId == t.id ? `卸下了称号「${t.name}」。` : `佩戴称号「${t.name}」，${t.des}`,
        type: 'win'
      });
    },
    takeOff() {
      this.$store.commit('set_title', '')
    },
    toggle(key) {
      const val = !this.$store.state.settings[key]
      this.$store.commit('set_settings', {
        [key]: val
      })
      if (key == 'autoFarm' && !val) {
        this.$store.commit('set_sys_info', {
          msg: `自动征战已关闭。`,
          type: 'warning'
        });
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.achv {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 29;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);

  .achv-panel {
    position: relative;
    width: 6.4rem;
    max-width: 94%;
    height: 6rem;
    max-height: 90%;
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

      .close {
        width: 0.24rem;
        height: 0.24rem;
        margin-left: auto;
        cursor: pointer;
        background: #ccc;
        clip-path: polygon(20% 0, 50% 30%, 80% 0, 100% 20%, 70% 50%, 100% 80%, 80% 100%, 50% 70%, 20% 100%, 0 80%, 30% 50%, 0 20%);
      }
    }

    .tabs {
      display: flex;
      padding: 0.1rem 0.15rem;
      border-bottom: 1px solid #444;
      font-size: 0.18rem;

      &>div {
        padding: 0.05rem 0.2rem;
        border: 2px solid #555;
        margin-right: 0.1rem;
        cursor: pointer;
        position: relative;

        &.active {
          border-color: #8dff9e;
          color: #8dff9e;
        }

        .dot {
          position: absolute;
          right: 0.04rem;
          top: 0.04rem;
          width: 0.08rem;
          height: 0.08rem;
          border-radius: 50%;
          background: #ff5b5b;
        }
      }
    }

    .body {
      flex: 1;
      overflow: auto;
      padding: 0.12rem 0.15rem;
    }

    .progress-line {
      font-size: 0.15rem;
      color: #999;
      margin-bottom: 0.1rem;
    }

    .a-item {
      display: flex;
      align-items: center;
      border: 1px solid #3a3a44;
      padding: 0.08rem 0.1rem;
      margin-bottom: 0.06rem;
      opacity: 0.75;

      &.done {
        opacity: 1;
        border-color: #8dff9e55;
      }

      img {
        width: 0.42rem;
        height: 0.42rem;
        margin-right: 0.12rem;
        image-rendering: pixelated;
        background: #22222a;
      }

      .a-mid {
        flex: 1;

        .a-name {
          font-size: 0.18rem;

          .a-title {
            font-size: 0.13rem;
            color: #ffd76b;
            margin-left: 0.08rem;
          }
        }

        .a-des {
          font-size: 0.14rem;
          color: #999;
        }

        .a-bar {
          position: relative;
          height: 0.12rem;
          background: #22222a;
          margin-top: 0.04rem;

          i {
            display: block;
            height: 100%;
            background: linear-gradient(90deg, #4b7bec, #8dff9e);
          }

          span {
            position: absolute;
            right: 0.04rem;
            top: -0.02rem;
            font-size: 0.12rem;
            color: #bbb;
          }
        }
      }

      .a-state {
        font-size: 0.14rem;
        color: #666;

        &.done {
          color: #8dff9e;
        }
      }
    }

    .t-cur {
      font-size: 0.18rem;

      b {
        margin-left: 0.06rem;
      }

      .clear {
        font-size: 0.14rem;
        color: #888;
        margin-left: 0.12rem;
        cursor: pointer;
        text-decoration: underline;
      }
    }

    .t-tip {
      font-size: 0.14rem;
      color: #999;
      margin: 0.06rem 0 0.12rem;
    }

    .t-list {
      display: flex;
      flex-wrap: wrap;

      .t-item {
        width: 48%;
        border: 1px solid #3a3a44;
        padding: 0.08rem 0.1rem;
        margin: 0 1% 0.1rem 0;
        cursor: pointer;
        position: relative;

        &.locked {
          opacity: 0.45;
          cursor: not-allowed;
        }

        &.active {
          border-color: #8dff9e;
        }

        .t-name {
          font-size: 0.18rem;
        }

        .t-des {
          font-size: 0.13rem;
          color: #999;
        }

        .t-mods {
          margin-top: 0.04rem;

          span {
            display: inline-block;
            font-size: 0.13rem;
            color: #ffd76b;
            border: 1px solid #ffd76b44;
            padding: 0 0.05rem;
            margin: 0.02rem 0.03rem 0 0;
          }
        }

        .t-lock {
          position: absolute;
          right: 0.08rem;
          top: 0.08rem;
          font-size: 0.12rem;
          color: #777;
        }
      }
    }

    .stat-grid {
      display: flex;
      flex-wrap: wrap;

      .s-item {
        width: 25%;
        border: 1px solid #33333c;
        padding: 0.06rem 0.08rem;
        margin: 0 0 0.06rem -1px;
        font-size: 0.14rem;

        span {
          display: block;
          color: #888;
        }

        b {
          color: #ddd;
          font-size: 0.17rem;
        }
      }
    }

    .set-line {
      margin-top: 0.14rem;
      border-top: 1px dashed #444;
      padding-top: 0.1rem;

      h3 {
        font-size: 0.17rem;
        margin-bottom: 0.06rem;
        color: #ccc;
      }

      label {
        display: block;
        font-size: 0.15rem;
        color: #bbb;
        cursor: pointer;
        line-height: 0.26rem;
      }

      .hint {
        font-size: 0.13rem;
        color: #777;
        margin-top: 0.04rem;
      }

      .bonus-chips {
        display: flex;
        flex-wrap: wrap;

        span {
          font-size: 0.14rem;
          color: #8dff9e;
          border: 1px solid #8dff9e44;
          padding: 0.02rem 0.07rem;
          margin: 0 0.05rem 0.05rem 0;
        }

        i {
          font-size: 0.14rem;
          color: #777;
        }
      }
    }
  }
}
</style>
