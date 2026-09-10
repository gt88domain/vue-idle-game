<template>
  <div class="dungeons" :class="{shake: shake}">
    <!-- 新增：出战队伍 + 大招充能 -->
    <div class="squad" v-if="partyHeroes.length">
      <div class="squad-slot" v-for="(h, i) in partyHeroes" :key="h.id"
           :class="{ulting: ultFlash == h.id}" :style="{'--qc': h.color}">
        <img :src="h.portrait" alt="">
        <span>{{h.short}}</span>
      </div>
      <div class="ult-charge" :title="'大招充能：每场胜利 +1，满 ' + ultCost + ' 点自动释放'">
        <div class="pips">
          <i v-for="n in ultCost" :key="n" :class="{on: n <= ultCharge}"></i>
        </div>
        <span>{{ultCharge}}/{{ultCost}} · {{ultName}}</span>
      </div>
    </div>

    <!-- 新增：战斗飘字层（纯表现层，不参与任何结算） -->
    <div class="fx-layer">
      <div v-for="f in fx" :key="f.id" class="fx-num" :class="'fx-' + f.kind" :style="{left: f.left + '%', top: f.top + '%'}">{{f.text}}</div>
    </div>

    <div class="progress-bar"></div>
    <div class="icon-bar">
      <div class="player" :class="{hit: hitFlash == 'player'}" :style="{left:left+'%','backgroundPosition':parseInt(left%4)*32+'px 96px'}">
        <!-- <img src="../../assets/icons/map/player-s.png" alt=""> -->
        <!-- :style="{background-position:}" -->
      </div>
      <div class="monster" :class="{hit: hitFlash == 'm' + k}" v-for="(v,k) in dungeons.eventType" :key="k" :style="{left:(100/dungeons.eventNum)*(k+1)+'%'}">
        <img :src="'./icons/map/'+v.type+'.png'" alt="">
      </div>
    </div>
  </div>
</template>
<script>
import { assist } from '../../assets/js/assist';
import { rollSetPiece } from '../../assets/config/sets';
import { HERO_MAP, FACTIONS } from '../../assets/config/heroes'
import { HERO_PORTRAITS } from '../../assets/config/artMap'
import sfx from '../../assets/js/sfx'
export default {
  name: "dungeons",
  mixins: [assist],
  data() {
    return {
      left: 0,
      pro: {},
      timeOut: {},
      battleComTime: {},
      nextEvent: 1,
      battleTime:2000,
      fx: [],
      fxSeq: 0,
      hitFlash: '',
      ultFlash: '',
      shake: false,
      moveTime:50,
      dungeons: {
        battleTime: 2000,
        name: '史莱姆森林',
        time: '60',
        id: '1',
        eventNum: '5',
        lv: 1,
        eventType: [{
          name: '小史莱姆', type: 'monster',
          eventType: 'battle',
          attribute: {
            HP: 20,
            ATK: 1,
          },
          trophy: {
            gold: 30,
            equip: [
              1, 0, 0, 0
            ],
          }
        }, {
          name: '小史莱姆', type: 'monster', eventType: 'battle',
          attribute: {
            HP: 20,
            ATK: 1,
          },
          trophy: {
            gold: 30,
            equip: [
              0.2, 0.1, 0.05, 0
            ],
          }
        }, {
          name: '小史莱姆',
          type: 'monster', eventType: 'battle',
          attribute: {
            HP: 20,
            ATK: 1,
          },
          trophy: {
            gold: 30,
            equip: [
              0.2, 0.1, 0.05, 0
            ],
          }
        }, {
          name: '小史莱姆',
          type: 'monster', eventType: 'battle',
          attribute: {
            HP: 20,
            ATK: 1,
          },
          trophy: {
            gold: 30,
            equip: [
              0.2, 0.1, 0.05, 0
            ],
          }
        }, {
          name: '史莱姆王',
          type: 'boss', eventType: 'battle',
          attribute: {
            HP: 40,
            ATK: 2,
          },
          trophy: {
            gold: 30,
            equip: [
              0.25, 0.55, 0.15, 0.05
            ],
          }
        },]
      }
    };
  },
  computed: {
    reincarnationAttribute() { return this.$store.state.reincarnationAttribute },
    // 新增：祭坛「疾行符文」带来的推进/战斗加速（最多 -60%）
    speedK() {
      // 祭坛「疾行符文」+ 玩家手动倍速（倍速只影响真实时间，不影响任何结算）
      var sp = Number(this.$store.state.bonus.SPEED || 0)
      var manual = Number(this.$store.state.settings.speed || 1)
      return Math.max(0.1, Math.max(0.4, 1 - sp / 100) / Math.max(1, manual))
    },
    ultCharge() {
      return Number(this.$store.state.ultCharge || 0)
    },
    ultCost() {
      return Math.max(2, Number((this.$store.state.heroBonus.ult || {}).cost || 4))
    },
    ultName() {
      var h = this.partyHeroes[0]
      return h ? h.ultName : ''
    },
    partyHeroes() {
      var heroes = this.$store.state.heroes || {}
      return (heroes.party || []).map(id => {
        var cfg = HERO_MAP[id]
        if (!cfg) {
          return null
        }
        return {
          id: id,
          short: cfg.name.split(' ')[0],
          portrait: HERO_PORTRAITS[id],
          color: (FACTIONS[cfg.faction] || {}).color,
          ultName: cfg.ult.name
        }
      }).filter(v => !!v)
    },
    goldMul() {
      // 新增：金币获取加成（套装「贪婪之旅」/祭坛「贪婪回响」/称号）
      return 1 + Number(this.$store.state.playerAttribute.attribute.GOLDGAIN || 0) / 100
    },
  },
  mounted() {
    // this.evenHandle()

  },
  methods: {
    evenHandle() {
      let startEnent = () => {
        if (this.left >= this.nextEvent * 100 / this.dungeons.eventNum) {
          this.evenInExecution()
          this.nextEvent++
          if (this.nextEvent <= this.dungeons.eventNum) {
            this.timeOut = setTimeout(() => {
              this.pro = setInterval(() => {
                startEnent()
              }, Math.max(8, (this.moveTime + this.reincarnationAttribute.MOVESPEED) * this.speedK))
            }, Math.max(60, (this.battleTime + this.reincarnationAttribute.BATTLESPEED) * this.speedK))
          } else {
            setTimeout(() => {
              this.eventEnd()
            }, Math.max(60, (this.battleTime + this.reincarnationAttribute.BATTLESPEED) * this.speedK))
          }

          clearInterval(this.pro)
        }

        this.left += 0.5
      }
      this.eventBegin()
      this.pro = setInterval(() => {
        startEnent()
      }, Math.max(8, (this.moveTime + this.reincarnationAttribute.MOVESPEED) * this.speedK))
    },
    eventBegin() {
      this.$store.commit("set_sys_info", {
        msg: "你已进入" + (this.dungeons.type=="endless"?'无尽（lv'+this.dungeons.lv+'）':this.dungeons.name),
        type: 'warning'
      });
      if (this.dungeons.name == '黑色火山') {
        this.$store.commit("set_sys_info", {
          msg: "似乎这就是最后的挑战了",
          type: 'battle'
        });
        this.$store.commit("set_sys_info", {
          msg: "加油吧",
          type: 'battle'
        });
      }
    },
    evenInExecution() {
      var event = this.dungeons.eventType[this.nextEvent - 1]
      switch (event.eventType) {
        case 'battle':
          this.$store.commit("set_sys_info", {
            msg: `
              你遭遇了${event.name}(lv${this.dungeons.lv}),正在战斗中...
            `,
            type: 'battle'
          });
          this.battleComTime = setTimeout(() => {
            this.battleCom(event)
          }, Math.max(60, (this.battleTime + this.reincarnationAttribute.BATTLESPEED) * this.speedK))
          break;

        default:
          break;
      }

    },
    forcedToStopEvent() {
      clearInterval(this.pro)
      clearTimeout(this.timeOut)
      clearTimeout(this.battleComTime)
      this.pro = {}
      this.left = 0
      this.nextEvent = 1
      this.dungeons = {}
    },
    eventEnd() {

      setTimeout(() => {
        // this.battleCom(event)
        if (this.dungeons.type == "endless") {
          this.$store.commit("set_sys_info", {
            msg: `
                挑战成功，可以挑战下一层了
              `,
            type: "win",
          });
          this.$store.commit("set_endless_lv", this.$store.state.playerAttribute.endlessLv + 1);
          this.$store.commit("set_player_curhp", 'full');
        } else {
          this.$store.commit("set_sys_info", {
            msg: `
                副本探索成功！
              `,
            type: "win",
          });
          // 新增：通关次数统计（成就）
          this.$store.commit('report', {
            key: 'dungeons',
            num: 1
          });
        }

        let p = this.findComponentUpward(this, 'index')
        let backpackPanel = this.findBrothersComponents(this, 'backpackPanel', false)[0]

        if (this.dungeons.name == '黑色火山' && !this.$store.state.playerAttribute.endlessLv) {

          this.$store.commit("set_sys_info", {
            msg: "击败了最后的boss，你通关了！",
            type: 'warning'
          });
        }

        if(this.dungeons.lv>=10&&!this.$store.state.playerAttribute.endlessLv){
          this.$store.commit("set_sys_info", {
            msg: "开启了无尽挑战，可点击地图右上角副本图标进入",
            type: 'warning'
          });
          this.$store.commit("set_sys_info", {
            msg: "试试你的极限吧",
            type: 'warning'
          });
          this.$store.commit('set_endless_lv', 1)
        }
        this.forcedToStopEvent()
        let backpackPanelSign = backpackPanel.itemNum / backpackPanel.grid.length < 0.8
        // ==== 新增：自动挂机征战（刷本到死或背包满为止）====
        var autoFarmOn = this.$store.state.settings.autoFarm
        var autoFarmGo = autoFarmOn && (p.dungeons.difficulty == 1 || p.dungeons.type == 'endless')
        if (p.reChallenge && backpackPanelSign) {
          p.eventBegin()
        } else if (autoFarmGo && p.dungeons.type == 'endless') {
          // 无尽：自动推进到下一层
          p.endlessLv = this.$store.state.playerAttribute.endlessLv
          p.dungeons.lv = this.$store.state.playerAttribute.endlessLv
          p.showEndlessDungeonsInfo()
          p.eventBegin()
        } else if (autoFarmGo && backpackPanelSign) {
          // 普通副本：原地重复挑战
          setTimeout(() => {
            p.eventBegin()
          }, 400)
        } else if (p.reEChallenge&&p.dungeons.type=='endless') {
          this.$store.commit("set_endless_lv", this.$store.state.playerAttribute.endlessLv - 1);
          p.eventBegin()
        } else if (p.upEChallenge&&p.dungeons.type=='endless') {
          p.endlessLv = this.$store.state.playerAttribute.endlessLv
          p.dungeons.lv = this.$store.state.playerAttribute.endlessLv
          p.showEndlessDungeonsInfo()
          p.eventBegin()
        } else {
          if (autoFarmOn && !backpackPanelSign) {
            this.$store.commit('set_settings', {
              autoFarm: false
            })
            this.$store.commit("set_sys_info", {
              msg: `背包快满了，自动挂机已停止。`,
              type: 'warning'
            });
          }
          p.dungeons = ''
          p.inDungeons = false
        }

        // if(p.reEChallenge){
        //   this.$store.commit("set_endless_lv", this.$store.state.playerAttribute.endlessLv - 1);
        // }
        // if(p.upEChallenge){
        // }

      }, 100)
    },
    // 计算战斗过程
    spawnFx(kind, text, left, top) {
      var id = ++this.fxSeq
      this.fx.push({
        id: id,
        kind: kind,
        text: text,
        left: (left === undefined ? 50 : left),
        top: (top === undefined ? 34 : top)
      })
      setTimeout(() => {
        var i = this.fx.findIndex(v => v.id === id)
        if (i >= 0) {
          this.fx.splice(i, 1)
        }
      }, 950)
      if (this.fx.length > 14) {
        this.fx.splice(0, this.fx.length - 14)
      }
    },
    flash(target) {
      this.hitFlash = target
      setTimeout(() => {
        this.hitFlash = ''
      }, 150)
    },
    doShake() {
      this.shake = true
      setTimeout(() => {
        this.shake = false
      }, 280)
    },
    battleCom(event) {
      let playerAttribute = this.$store.state.playerAttribute.attribute,
        battleTime,
        healthRecoverySpeed = this.$store.state.playerAttribute.healthRecoverySpeed,
        reducedDamage = this.$store.state.playerAttribute.attribute.REDUCDMG,
        playerDPS = playerAttribute.DPS,
        playerBLOC = playerAttribute.BLOC.value,
        monsterAttribute = this.$deepCopy(event.attribute), //HP: 100,ATK: 1,
        p = this.findComponentUpward(this, 'index')

      // ==== 新增：反伤与穿透并入竞速解算（闪避/固定减伤已在 REDUCDMG 内折算）====
      var thornsDps = Number(playerAttribute.THORNS || 0) / 100 * Number(monsterAttribute.ATK)
      var penetrateK = 1 + Number(playerAttribute.PENETRATE || 0) / 100
      var realPlayerDps = playerDPS * penetrateK + thornsDps

      // ==== 新增：英雄大招（充能满时自动释放；未编队英雄时整段不参与计算）====
      var hb = this.$store.state.heroBonus || {}
      var ult = hb.ult || {}
      var ultPower = (ult.burst || 0) + (ult.shield || 0) + (ult.rage || 0) + (ult.execute || 0)
      var ultReady = this.partyHeroes.length > 0 && this.ultCharge >= this.ultCost && ultPower > 0
      var ultLabel = ''
      if (ultReady) {
        if (ult.burst) {
          var burstDmg = Math.floor(realPlayerDps * ult.burst / 100)
          monsterAttribute.HP = Math.max(0, monsterAttribute.HP - burstDmg)
          ultLabel += ' 爆发' + burstDmg
        }
        if (ult.execute) {
          var burn = Math.floor(monsterAttribute.HP * ult.execute / 100)
          monsterAttribute.HP = Math.max(0, monsterAttribute.HP - burn)
          ultLabel += ' 处决-' + burn
        }
        if (ult.rage) {
          realPlayerDps = realPlayerDps * (1 + ult.rage / 100)
        }
        var dr = Math.min(85, (ult.shield || 0) + (hb.shield || 0))
        if (dr > 0) {
          reducedDamage = reducedDamage * (1 - dr / 100)
        }
        this.$store.commit('set_ult_charge', 0)
        this.ultFlash = this.partyHeroes[0].id
        setTimeout(() => {
          this.ultFlash = ''
        }, 700)
        this.spawnFx('ult', (ultLabel ? '大招！' + ultLabel : '大招！'), 50, 16)
        this.doShake()
        sfx.play('ult')
      }

      var playerDeadTime = (playerAttribute.CURHP.value+playerBLOC) / reducedDamage / monsterAttribute.ATK,
        monsterDeadTime = (monsterAttribute.HP / realPlayerDps)

      // 战斗获胜
      if (monsterDeadTime < playerDeadTime) {
        battleTime = monsterDeadTime
        var takeDmg = -battleTime * Number(monsterAttribute.ATK)
        takeDmg = parseInt(takeDmg * reducedDamage)
        takeDmg = takeDmg + playerBLOC
        takeDmg = takeDmg>-1?-1:takeDmg
        this.$store.commit('set_player_curhp', takeDmg)

        // ==== 新增：战斗表现（飘字 / 受击闪白 / 充能）====
        var mLeft = (100 / this.dungeons.eventNum) * this.nextEvent
        this.spawnFx('dmg', '-' + Math.floor(monsterAttribute.HP), mLeft, 30)
        this.spawnFx('taken', '-' + Math.abs(takeDmg), this.left, 62)
        this.flash('m' + (this.nextEvent - 1))
        this.flash('player')
        if (Number(playerAttribute.CRIT.value) >= 45) {
          this.spawnFx('crit', '暴击 ' + Math.floor(playerAttribute.CRIT.value) + '%', mLeft, 20)
          this.doShake()
        }
        if (this.partyHeroes.length) {
          this.$store.commit('set_ult_charge', Math.min(this.ultCost * 2, this.ultCharge + 1 + (hb.charge || 0)))
        }
        if (hb.killHeal > 0) {
          var kh = Math.floor(playerAttribute.MAXHP.value * hb.killHeal / 100)
          if (kh > 0) {
            this.$store.commit('set_player_curhp', kh)
            this.spawnFx('heal', '+' + kh, this.left, 70)
          }
        }
        sfx.play(event.type == 'boss' ? 'crit' : 'hit')

        // 新增：击杀统计（成就系统）
        this.$store.commit('report', {
          key: 'kills',
          num: 1
        })
        if (event.type == 'boss') {
          this.$store.commit('report', {
            key: 'bossKills',
            num: 1,
            check: false
          })
        }

        // ==== 新增：吸血回复（按本场造成的伤害比例）====
        var stealPct = Number(playerAttribute.LIFESTEAL || 0)
        if (stealPct > 0) {
          var steal = Math.floor(Math.abs(takeDmg) * stealPct / 100)
          if (steal > 0) {
            this.$store.commit('set_player_curhp', steal)
            this.$store.commit("set_sys_info", {
              msg: `吸血效果回复了${steal}点生命`,
              type: 'win'
            });
          }
        }

        if (this.dungeons.type == 'endless') {
          this.$store.commit("set_sys_info", {
            msg: `
              击杀了${event.name}(无尽层数：${this.dungeons.lv})，受到了${Math.abs(takeDmg)}点伤害
            `,
            type: 'win'
          });
        } else {
          this.$store.commit("set_sys_info", {
            msg: `
              击杀了${event.name}(lv${this.dungeons.lv})，受到了${Math.abs(takeDmg)}点伤害
            `,
            type: 'win'
          });
        }
        // 计算战利品获取
        this.caculateTrophy(event)
        // 副本战斗成功时提升玩家等级
        if(this.dungeons.lv>this.$store.state.playerAttribute.lv&&event.type=='boss'){
          this.$store.commit("set_sys_info", {
            msg: `
              你升级了，可以刷新出更高等级的副本了。
            `,
            type: 'win'
          });
          this.$store.commit('set_player_lv', this.dungeons.lv)
        }
        // 高难度副本只可以挑战一次
        if(this.dungeons.difficulty!=1){
          p.dungeonsArr = p.dungeonsArr.filter(({ id }) => id !== this.dungeons.id);
        }
      } else {
        // 玩家死亡
        this.$store.commit('report', {
          key: 'deaths',
          num: 1
        });
        // 新增：死亡时中断自动挂机
        if (this.$store.state.settings.autoFarm) {
          this.$store.commit('set_settings', {
            autoFarm: false
          })
          this.$store.commit("set_sys_info", {
            msg: `挑战失败，自动挂机已停止。`,
            type: 'warning'
          });
        }
        this.spawnFx('taken', '战败…', this.left, 58)
        this.doShake()
        sfx.play('defeat')
        this.$store.commit('set_player_curhp', 'dead')
        clearInterval(this.pro)
        clearTimeout(this.timeOut)
        this.pro = {}
        this.timeOut = {}
        this.left = 0
        this.nextEvent = 1
        p.inDungeons = false
        this.dungeons = {}
        var takeDmg = monsterDeadTime * Number(monsterAttribute.ATK)
        takeDmg = parseInt(takeDmg * reducedDamage)
        takeDmg = takeDmg - playerBLOC
        takeDmg = takeDmg<1?1:takeDmg
        this.$store.commit("set_sys_info", {
          msg: `
              战斗失败！受到了${takeDmg}点伤害
            `,
          type: 'warning'
        });
        this.$store.commit("set_sys_info", {
          msg: `
              你可以尝试强化或者重铸装备之后在来挑战哦
            `,
          type: 'warning'
        });


      }
    },
    //战利品计算
    caculateTrophy(event) {
      var items = []
      var lv = this.dungeons.lv
      var playerAttr = this.$store.state.playerAttribute.attribute
      // 新增：幸运提高独特装备掉率（祭坛「命运馈赠」/称号/贪婪4件套）
      var luckK = 1 + Math.min(200, Number(playerAttr.LUCK || 0)) / 100
      // 获取独特装备
      if (event.type == 'boss' && this.dungeons.type != 'endless') {
        var randow = 1 - 0.02*((this.dungeons.difficulty-1)*2+1) * luckK
        if (Math.random() > randow) {
          var random = Math.random()
          if (random <= 0.3 && random > 0) {
            var b = this.findBrothersComponents(this, 'weaponPanel', false)[0]
            var item = b.createNewItem(4, parseInt(lv + Math.random() * 6))
            items.push(JSON.parse(item))
          } else if (random <= 0.5 && random > 0.3) {
            var b = this.findBrothersComponents(this, 'armorPanel', false)[0]
            var item = b.createNewItem(4, parseInt(lv + Math.random() * 6))
            items.push(JSON.parse(item))
          }else if (random <= 0.75 && random > 0.5) {
            var b = this.findBrothersComponents(this, 'ringPanel', false)[0]
            var item = b.createNewItem(4, parseInt(lv + Math.random() * 6))
            items.push(JSON.parse(item))
          } else {
            var b = this.findBrothersComponents(this, 'neckPanel', false)[0]
            var item = b.createNewItem(4, parseInt(lv + Math.random() * 6))
            items.push(JSON.parse(item))
          }
          // 新增：独特装备统计
          this.$store.commit('report', {
            key: 'uniqueDrops',
            num: 1
          });

        }
      }
      var trophy = event.trophy
      var equip = [
        0.25, 0.25, 0.25, 0.25
      ]
      var equip = trophy.equip
      var equipQua = -1;
      var r = Math.random()
      if (r <= equip[0]) {
        // 获得破旧装备
        equipQua = 0
      } else if (r < equip[1] + equip[0] && r >= equip[0]) {
        // 获得普通装备
        equipQua = 1
      }
      else if (r < equip[2] + equip[1] + equip[0] && r >= equip[1] + equip[0]) {
        // 获得神器装备
        equipQua = 2
      }
      else if (r < equip[3] + equip[2] + equip[1] + equip[0] && r >= equip[2] + equip[1] + equip[0]) {
        // 获得史诗装备
        equipQua = 3
      } else {
        // 未获得装备
      }
      //获得装备时
      if (equipQua != -1) {
        // this.createEquip(equipQua,lv)
        var index = Math.floor((Math.random() * 4));
        var slotName = ['weapon', 'armor', 'ring', 'neck'][index]
        // ==== 新增：困难/极难副本有几率定向掉出套装底材（补完原版预告的套装玩法）====
        var forceTypeName = null
        if (this.dungeons.difficulty > 1 && this.dungeons.type != 'endless') {
          var setChance = (this.dungeons.difficulty == 2 ? 0.3 : 0.45) * (1 + Math.min(100, Number(playerAttr.LUCK || 0)) / 200)
          if (Math.random() < setChance) {
            var rolled = rollSetPiece(slotName, equipQua == 4)
            if (rolled) {
              forceTypeName = rolled.typeName
            }
          }
        }
        if (index == 0) {
          var b = this.findBrothersComponents(this, 'weaponPanel', false)[0]
          var item = b.createNewItem(equipQua, lv, forceTypeName)
        } else if (index == 1) {
          var b = this.findBrothersComponents(this, 'armorPanel', false)[0]
          var item = b.createNewItem(equipQua, lv, forceTypeName)
        }else if (index == 2) {
          var b = this.findBrothersComponents(this, 'ringPanel', false)[0]
          var item = b.createNewItem(equipQua, lv, forceTypeName)
        } else {
          var b = this.findBrothersComponents(this, 'neckPanel', false)[0]
          var item = b.createNewItem(equipQua, lv, forceTypeName)
        }
        items.push(JSON.parse(item))
        // 新增：掉落统计
        if (equipQua == 3) {
          this.$store.commit('report', {
            key: 'epicDrops',
            num: 1,
            check: false
          });
        }
        if (items[items.length - 1].setId) {
          this.$store.commit('report', {
            key: 'setDrops',
            num: 1
          });
          this.$store.commit("set_sys_info", {
            msg: `套装掉落：${items[items.length - 1].setName}·${items[items.length - 1].type.name}`,
            type: 'trophy'
          });
        }
        var backpackPanel = this.findBrothersComponents(this, 'backpackPanel', false)[0]
        var goldObtainRatio = 1
        if (this.dungeons.type == 'endless') {
          var endlessLv = this.$store.state.playerAttribute.endlessLv
          goldObtainRatio = 1.5
          items = []
        }
        this.$store.commit("set_sys_info", {
          msg: `
              获得了:金币${parseInt(event.trophy.gold * goldObtainRatio)}
            `,
          type: 'trophy',
          equip: items
        });
        // 新增：金币获取加成
        var goldGot = parseInt(event.trophy.gold * goldObtainRatio * this.goldMul)
        this.$store.commit("set_player_gold", goldGot);
        this.$store.commit('report', {
          key: 'goldEarned',
          num: goldGot,
          check: false
        });
        if(this.dungeons.type == 'endless'){
          return
        }
        items.map(item => {
          // 当开启了自动出售并且新获得的装备品质低于史诗时，自动出售
          var keepSet = this.$store.state.settings.autoKeepSet
          if (backpackPanel.autoSell[equipQua]&&item.quality.name!="独特"&&!(keepSet&&item.setId)) {
            var gold = item.lv * item.quality.qualityCoefficient * 30
            this.$store.commit("set_player_gold", parseInt(gold * this.goldMul));
            this.$store.commit("set_sys_info", {
              msg: `
                自动出售装备获得金币：${parseInt(gold * this.goldMul)}
              `,
              type: 'trophy',
            });
          } else {
            for (let i = 0; i < backpackPanel.grid.length; i++) {
              if (JSON.stringify(backpackPanel.grid[i]).length < 3) {
                this.$set(backpackPanel.grid, i, item)
                break;
              }
            }
          }
        })
      } else {
        //金币获取倍率
        var goldObtainRatio = 1
        if (this.dungeons.type == 'endless') {
          var endlessLv = this.$store.state.playerAttribute.endlessLv
          goldObtainRatio = 2.6
        }
        this.$store.commit("set_sys_info", {
          msg: `
              获得了:金币${parseInt(event.trophy.gold * goldObtainRatio)}
            `,
          type: 'trophy',
          equip: []
        });
        var goldGot = parseInt(event.trophy.gold * goldObtainRatio * this.goldMul)
        this.$store.commit("set_player_gold", goldGot);
        this.$store.commit('report', {
          key: 'goldEarned',
          num: goldGot
        });
      }

    }
  }
};


</script>
<style lang="scss" scoped>
.dungeons {
  width: 100%;
  height: 100%;
  position: relative;

  /* 新增：战斗舞台底图（英雄 vs 怪物不再飘在黑底上） */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: url('../../assets/art/arena.jpg') no-repeat center 40%;
    background-size: cover;
    opacity: 0.28;
    pointer-events: none;
  }

  .squad {
    position: absolute;
    top: 0.06rem;
    left: 0.1rem;
    display: flex;
    align-items: flex-end;
    z-index: 3;

    .squad-slot {
      position: relative;
      width: 0.44rem;
      margin-right: 0.05rem;
      text-align: center;

      img {
        width: 0.44rem;
        height: 0.44rem;
        object-fit: cover;
        object-position: 50% 16%;
        border: 1px solid rgba(255, 255, 255, 0.22);
        border-radius: 2px;
        background: #000;
        filter: saturate(1.05);
        transition: transform 0.15s ease;
      }

      span {
        display: block;
        font-size: 0.1rem;
        color: #cbbfa8;
        text-shadow: 0 1px 2px #000;
      }
    }

    .squad-slot.ulting img {
      transform: translateY(-0.03rem) scale(1.08);
      border-color: var(--qc);
      box-shadow: 0 0 0.1rem var(--qc);
    }

    .ult-charge {
      margin-left: 0.04rem;
      padding-bottom: 0.02rem;

      .pips {
        display: flex;

        i {
          display: block;
          width: 0.07rem;
          height: 0.07rem;
          margin-right: 0.02rem;
          border: 1px solid #6b6055;
          background: #14120f;
          border-radius: 1px;
        }

        i.on {
          background: linear-gradient(180deg, #ffe9b8, #d9a13c);
          border-color: #ffd76a;
          box-shadow: 0 0 0.04rem rgba(255, 200, 90, 0.8);
        }
      }

      span {
        font-size: 0.1rem;
        color: #a89e90;
        text-shadow: 0 1px 2px #000;
      }
    }
  }

  .fx-layer {
    z-index: 4;
  }

  .icon-bar .hit {
    animation: fxHit 0.16s ease-out;
  }
  .progress-bar {
    position: absolute;
    bottom: 5px;
    left: 10px;
    right: 10px;
    border: 1px solid #fff;
  }
  .icon-bar {
    margin: 0 30px;
    width: calc(100% - 60px);
    height: 100%;
    position: relative;
    & > div {
      position: absolute;
      height: 34px;
      width: 34px;
      top: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      img {
        height: 34px;
        width: 34px;
      }
    }
    .player {
      z-index: 2;
      height: 48px;
      width: 32px;
      // background-position: -0px 96px !important;
      background-repeat: no-repeat;
      background: url(../../assets/icons/map/player-s.png);
    }
    .monster {
      left: 20%;
    }
  }
}
</style>
