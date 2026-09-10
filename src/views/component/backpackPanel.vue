<template>
  <div class="backpackPanel">
    <!-- ==== 新增：筛选栏 ==== -->
    <div class="bp-filter">
      <span class="fl">类型</span>
      <i v-for="t in typeFilters" :key="t.key" :class="{on:filterType==t.key}" @click="filterType = filterType==t.key?'':t.key">{{t.name}}</i>
      <span class="fl">品质</span>
      <i v-for="q in qualityFilters" :key="q" :class="{on:filterQuality==q}" @click="filterQuality = filterQuality==q?'':q">{{q||'全部'}}</i>
      <i class="set-flag" :class="{on:onlySet}" @click="onlySet=!onlySet">只看套装</i>
      <i class="sort" @click="sortByScore">按评分排序</i>
    </div>
    <div class="bp-count" v-if="filterType||filterQuality||onlySet">
      匹配 {{matchedNum}} 件<span @click="clearFilter">清除筛选</span>
    </div>
    <div v-for="(v, k) in grid" :key="k" v-show="matches(v)">
      <div class="grid">
        <div class="title" v-if="v.lv" @contextmenu.prevent="openMenu(k,$event)" @touchstart.stop.prevent="openMenu(k,$event)" @mouseover="showItemInfo($event,v.itemType,v)" @mouseleave="closeItemInfo">
          <div class="icon" :class="{'red-flash':v.enchantlvl>=13}"  :style="{ 'box-shadow': 'inset 0 0 7px 2px ' + v.quality.color }">
            <img :src="v.type.iconSrc" alt="" />
          </div>
          <div class="title-lock" v-if="v.locked">
            <img src="../../assets/icons/lock.png" alt="">
          </div>
          <!-- ==== 新增：套装角标 + 评分 ==== -->
          <div class="set-badge" v-if="v.setId" :style="{background:v.setColor}"></div>
          <div class="item-score" v-if="v.lv">{{score(v)}}</div>
        </div>
      </div>
    </div>
    <div class="backpack-capacity" :class="{'height-capacity':itemNum/grid.length>0.8}">{{itemNum}}/{{grid.length}}</div>
    <div class="handle">
      <div class="handle-checkbox">
        <!-- <input type="checkbox" name="" v-model="autoSell"> -->
        <span  @click.stop="autoSellPanel = !autoSellPanel">
          自动出售设置
          <i class="icon icon-setting"></i>
        </span>
        <div class="autoSellSetting" v-if="autoSellPanel">
          若勾选会在副本获得该品质装备时自动出售
          <div>
            <span @click="setAutoSell(0)"><input type="checkbox" name="" v-model="autoSell[0]">破旧</span>
            <span @click="setAutoSell(1)"><input type="checkbox" name="" v-model="autoSell[1]">普通</span>
          </div>
          <div>
            <span @click="setAutoSell(2)"><input type="checkbox" name="" v-model="autoSell[2]">神器</span>
            <span @click="setAutoSell(3)"><input type="checkbox" name="" v-model="autoSell[3]">史诗</span>
          </div>

        </div>
      </div>
      <div class="button" @click="neaten">一键整理</div>
      <div class="button" @click="sell">一键出售</div>
    </div>
    <ul v-show="visible" :style="{left:left+'px',top:top+'px'}" class="contextmenu">
      <li @click="showItemInfo($event,currentItem.itemType,currentItem,'touch')" v-if="$store.state.operatorSchemaIsMobile">查看</li>
      <li @click="equipTheEquipment()">装备</li>
      <li @click="strengthenEquipment()">强化</li>
      <li @click="strengthenEquipment()">重铸</li>
      <li @click="lockTheEquipment(true)" v-if="!currentItem.locked">锁定</li>
      <li @click="lockTheEquipment(false)" v-if="currentItem.locked">解锁</li>
      <li @click="sellTheEquipment()">出售</li>
    </ul>
  </div>
</template>
<script>
import { assist } from '../../assets/js/assist';
import { scoreEquipment } from '../../assets/js/battle';
import { SETS } from '../../assets/config/sets';
export default {
  name: "backpackPanel",
  data() {
    return {
      filterType: '',
      filterQuality: '',
      onlySet: false,
      typeFilters: [{
          key: 'weapon',
          name: '武器'
        },
        {
          key: 'armor',
          name: '防具'
        },
        {
          key: 'ring',
          name: '戒指'
        },
        {
          key: 'neck',
          name: '项链'
        }
      ],
      qualityFilters: ['', '破旧', '普通', '神器', '史诗', '独特'],
      grid: [],
      left: '',
      top: '',
      visible: false,
      currentItem: {},
      currentItemIndex: '',
      autoSellPanel: false,
      autoSell:[false,false,false,false]
    };
  },
  mixins: [assist],
  created() {
    this.grid = new Array(32).fill({});
  },
  watch: {
    visible(value) {
      if (value) {
        document.body.addEventListener("click", this.closeMenu);
      } else {
        document.body.removeEventListener("click", this.closeMenu);
      }
    },
  },
  computed: {
    matchedNum() {
      return this.grid.filter(v => this.matches(v)).length
    },
    setProgress() {
      // 每个套装在当前背包+身上共有几件
      const owned = {}
      this.grid.forEach(v => {
        if (v && v.setId) {
          owned[v.setId] = (owned[v.setId] || 0) + 1
        }
      })
      const p = this.$store.state.playerAttribute
      ;[p.weapon, p.armor, p.ring, p.neck].forEach(v => {
        if (v && v.setId) {
          owned[v.setId] = (owned[v.setId] || 0) + 1
        }
      })
      return SETS.map(set => ({
        id: set.id,
        name: set.name,
        color: set.color,
        num: owned[set.id] || 0
      }))
    },
    itemNum() {
      let count = 0
      this.grid.map((item) => {
        if (JSON.stringify(item) != '{}') {
          count++
        }
      })
      if (count / this.grid.length > 0.8) {
        this.$store.commit("set_sys_info", {
          msg: `
              背包快满了，请注意及时清理！
            `,
          type: 'warning',
        });
      }
      return count
    }
  },
  mounted() {
    var item = {
      lv: 30,
      itemType: 'armor',
      quality: {
        name: "神器",
        qualityCoefficient: 1.5,
        probability: "0.15",
        color: "#ff00ff",
        extraEntryNum: 3,
      },
      type: {
        name: "赤柳血铠",
        des: "似乎会给使用者提供生命气息",
        iconSrc: "./icons/A_A3.png",
        entry: [
          {
            valCoefficient: 0.9,
            value: 51,
            showVal: "+51",
            type: "DEF",
            name: "防御力",
          },
          {
            type: "HP",
            valCoefficient: 1.4,
            value: 634,
            showVal: "+634",
            name: "生命值",
          },
        ],
      },
      extraEntry: [
        { type: "HP", value: 99, showVal: "+99", name: "生命值" },
        { type: "HP", value: 93, showVal: "+93", name: "生命值" },
        { type: "HP", value: 97, showVal: "+97", name: "生命值" },
      ],
    };
    // this.$set(this.grid,0,item)
    // try {
    //   var p = this.findComponentUpward(this, 'index')
    //   if (JSON.stringify(p.saveData) != '{}') {
    //     this.grid = p.saveData.backpackEquipment
    //   }
    // } catch (error) {
    //   console.log(error)
    //   this.$store.commit("set_sys_info", {
    //     msg: `
    //           糟糕，存档坏了！
    //         `,
    //     type: 'warning'
    //   });
    // }

  },
  methods: {
    // ==== 新增：筛选 / 评分 / 排序 ====
    matches(v) {
      if (!v || !v.lv) {
        return !(this.filterType || this.filterQuality || this.onlySet)
      }
      if (this.filterType && v.itemType != this.filterType) {
        return false
      }
      if (this.filterQuality && (!v.quality || v.quality.name != this.filterQuality)) {
        return false
      }
      if (this.onlySet && !v.setId) {
        return false
      }
      return true
    },
    clearFilter() {
      this.filterType = ''
      this.filterQuality = ''
      this.onlySet = false
    },
    score(v) {
      return scoreEquipment(v)
    },
    sortByScore() {
      var items = this.grid.filter(v => v && JSON.stringify(v) != '{}')
      items.sort((a, b) => scoreEquipment(b) - scoreEquipment(a))
      var tem = new Array(this.grid.length).fill({})
      items.map((item, index) => {
        tem[index] = item
      })
      this.grid = this.$deepCopy(tem)
      this.$store.commit('set_sys_info', {
        msg: `背包已按装备评分从高到低排好。`,
        type: 'win'
      });
    },
    // 点击span仍然可以设置input的值，操作的是数组，所以需要$set来实现双向绑定
    setAutoSell(index){
      this.$set(this.autoSell,index,!this.autoSell[index])
    },
    // 整理
    neaten() {
      var tem = new Array(32).fill({}),
        temIndex = 0
      this.grid.map((item, index) => {
        if (JSON.stringify(item) != '{}') {
          tem[temIndex] = item
          temIndex++
        }
      })
      this.grid = this.$deepCopy(tem)
      tem = []
    },
    clear(){
      this.grid = new Array(32).fill({});
    },
    // 一键出售
    sell() {
      // 新增：批量出售前给套装部件一次确认机会
      var setNum = this.grid.filter(v => v && v.setId && !v.locked).length
      if (setNum && !this._sellConfirmed) {
        this.$message({
          message: `背包里有 ${setNum} 件套装部件，真的要一起卖掉吗？`,
          title: '再确认一下',
          closeBtnText: '手滑了',
          confirmBtnText: '全卖掉',
          onClose: () => {
            this._sellConfirmed = true
            this.sell()
            this._sellConfirmed = false
          }
        })
        return
      }
      this.grid.map((item, index) => {
        if (JSON.stringify(item) != '{}') {
          this.currentItemIndex = index
          this.currentItem = item
          this.sellTheEquipment(true)
        }
      })
    },
    openMenu(k, e) {
      this.currentItemIndex = k
      this.currentItem = this.grid[k]
      this.$store.commit('set_need_strengthen_equipment', this.currentItem)
      const menuMinWidth = 105;
      const offsetLeft = this.$el.getBoundingClientRect().left; // container margin left
      const offsetWidth = this.$el.offsetWidth; // container width
      const maxLeft = offsetWidth - menuMinWidth; // left boundary
      if (e.type == 'touchstart') {
        var left = e.changedTouches[0].clientX - offsetLeft + 15; // 15: margin right
      } else {
        var left = e.clientX - offsetLeft + 15; // 15: margin right
      }


      if (left > maxLeft) {
        this.left = maxLeft;
      } else {
        this.left = left;
      }

      this.top = e.offsetY;
      this.visible = true;
    },
    closeMenu() {
      this.visible = false;
    },
    showItemInfo($event, type, item, SchemaIsMobile) {
      if (SchemaIsMobile != 'touch' && this.$store.state.operatorSchemaIsMobile) {
        return
      }
      var p = this.findComponentUpward(this, 'index')
      p.showItemInfo($event, type, item)
    },
    closeItemInfo() {
      var p = this.findComponentUpward(this, 'index')
      p.weaponShow = p.armorShow = p.ringShow  =p.neckShow = false
    },
    lockTheEquipment(v) {
      this.currentItem.locked = v;
    },
    equipTheEquipment() {
      switch (this.currentItem.itemType) {
        case 'weapon':
          this.grid[this.currentItemIndex] = this.$store.state.playerAttribute.weapon
          this.$store.commit('set_player_weapon', this.currentItem)
          break;
        case 'armor':
          this.grid[this.currentItemIndex] = this.$store.state.playerAttribute.armor
          this.$store.commit('set_player_armor', this.currentItem)
          break;
        case 'ring':
          this.grid[this.currentItemIndex] = this.$store.state.playerAttribute.ring
          this.$store.commit('set_player_ring', this.currentItem)
          break;
        case 'neck':
          this.grid[this.currentItemIndex] = this.$store.state.playerAttribute.neck
          this.$store.commit('set_player_neck', this.currentItem)
          break;
        default:
          break;
      }

    },
    strengthenEquipment(v) {
      var p = this.findComponentUpward(this, 'index')
      p.closePanel()
      p.strengthenEquipmentPanelOpened = true
    },
    sellTheEquipment(withoutWarning, sellMsg) {
      if (this.currentItem.locked) {

        !withoutWarning && this.$store.commit("set_sys_info", {
          msg: `
              装备已锁定，请先解锁再出售。
            `,
          type: 'warning',
        });
        return
      }
      this.$set(this.grid, this.currentItemIndex, {});
      var gold = this.currentItem.lv * this.currentItem.quality.qualityCoefficient * 30
      this.$store.commit("set_player_gold", parseInt(gold));
      this.$store.commit("set_sys_info", {
        msg: `
              ${sellMsg ? sellMsg : ''}出售装备获得金币${parseInt(gold)}
            `,
        type: 'trophy',
      });
    }
  },
};
</script>
<style lang="scss" scoped>
.backpackPanel {
  width: 5.02rem;
  height: 3.66rem;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  padding: 0.5rem 0.14rem 0.14rem; // 顶部留出筛选栏位置（新增）
  justify-items: flex-start;
  align-items: flex-start;
  position: relative;
}
.handle {
  padding-top: 0.1rem;
  justify-content: flex-end;
  display: flex;
  align-items: center;
  width: 100%;
  height: 0.5rem;
  .handle-checkbox {
    display: flex;
    align-items: center;
    cursor: pointer;
    position: relative;
    span {
      display: flex;
      align-items: center;
    }
    input {
      width: 0.17rem;
      height: 0.17rem;
      margin-right: 2px;
      margin-top: 1px;
    }
  }
}
.grid {
  width: 0.6rem;
  height: 0.6rem;
  border: 1px solid #ccc;
  margin-left: -1px;
  margin-top: -1px;
  box-shadow: inset 0 0 6px 6px rgba($color: #000000, $alpha: 0.5);
  .title {
    display: flex;
    width: 100%;
    cursor: pointer;
    position: relative;
    .icon {
      width: 0.56rem;
      height: 0.56rem;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.04rem;
      img {
        width: 80%;
        height: 80%;
        max-width: 0.32rem;
        max-height: 0.32rem;
      }
    }
  }
  .title-lock {
    position: absolute;
    // width: 0.2rem;
    // height: 0.2rem;
    // background: red;
    top: -0.03rem;
    right: -0.11rem;
    width: 0;
    height: 0;
    border-left: 0.24rem solid transparent;
    border-right: 0.24rem solid transparent;
    border-bottom: 0.24rem solid rgba(255, 0, 0, 0.658);
    font-size: 0;
    line-height: 0;
    transform: rotate(45deg);
    img {
      width: 0.16rem;
      height: 0.16rem;
      transform: rotate(-45deg) translate(-50%, -0%);
      position: absolute;
      top: 50%;
      left: 50%;
    }
  }
}
.contextmenu {
  margin: 0;
  background: #000;
  border: 1px solid #fff;
  z-index: 3000;
  position: absolute;
  list-style-type: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 400;
  color: #fff;
  box-shadow: 2px 2px 3px 0 rgba(0, 0, 0, 0.3);

  li {
    margin: 0;
    padding: 9px 16px;
    cursor: pointer;
    border-top: 1px solid #ccc;
    margin-top: -1px;
    font-size: 14px;
    letter-spacing: 6px;
    &:hover {
      color: #ccc;
    }
  }
}
.backpack-capacity {
  position: absolute;
  bottom: 0.2rem;
  left: 0.2rem;
  font-size: 0.2rem;
}
.height-capacity {
  color: red;
}
.autoSellSetting {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.1rem;
  border-radius: 4px;
  bottom: 0.3rem;
  right:0rem;
  width: 1.7rem;
  div{
    display: flex;
    align-items: center;
    justify-content: space-around;
  }
  span {
    display: flex;
    align-items: center;
    padding: 0.06rem;
    cursor: pointer;
  }
  input{
    cursor: pointer;
  }
}
/* ==== 新增：筛选栏 / 套装角标 / 评分 ==== */
.bp-filter {
  position: absolute;
  top: 0.06rem;
  left: 0.06rem;
  right: 0.06rem;
  z-index: 4;
  font-size: 0.13rem;
  color: #999;
  .fl { margin: 0 0.04rem; }
  i {
    display: inline-block;
    padding: 0 0.06rem;
    margin-right: 0.04rem;
    border: 1px solid #555;
    cursor: pointer;
    &.on { color: #111; background: #8dff9e; border-color: #8dff9e; }
  }
  .set-flag.on { background: #ffd76b; border-color: #ffd76b; }
  .sort { border-color: #68d5ed; color: #68d5ed; margin-left: 0.08rem; }
}
.bp-count {
  position: absolute;
  top: 0.32rem;
  left: 0.08rem;
  z-index: 4;
  font-size: 0.12rem;
  color: #8dff9e;
  span { color: #888; text-decoration: underline; cursor: pointer; margin-left: 0.08rem; }
}
.grid .title {
  position: relative;
  .set-badge {
    position: absolute;
    right: -0.03rem;
    top: -0.03rem;
    width: 0.1rem;
    height: 0.1rem;
    border-radius: 50%;
    box-shadow: 0 0 4px 0 currentColor;
  }
  .item-score {
    position: absolute;
    left: 0;
    bottom: -0.02rem;
    right: 0;
    text-align: center;
    font-size: 0.11rem;
    color: #cfd8dc;
    text-shadow: 0 0 3px #000;
  }
}

</style>
