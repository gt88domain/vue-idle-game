<template>
  <div class="ring">
    <!-- <div class="btn" style="position:relative;z-index:999;">
      <button @click="createNewring">随机生成</button>
    </div> -->
    <div class="ringPanel" :style="{'box-shadow':' 0 0 5px 5px '+((ring.quality||{}).color||'#a1a1a1')+'b8'}" v-if="JSON.stringify(ring)!='{}'">
      <div class="title">
        <div class='icon' :class="{'red-flash':ring.enchantlvl>=13,unique:ring.quality.name=='独特'}" :style="{'box-shadow':'inset 0 0 7px 2px '+((ring.quality||{}).color||'#a1a1a1')}">
          <img :src="iconOf(ring)" alt="">
        </div>
        <div class='name' :style="{color:ring.quality.color}">{{ring.type.name}} {{ring.enchantlvl?'(+'+ring.enchantlvl+')':''}}</div>
      </div>
      <div class='type'>
        <div :style="{color:ring.quality.color}">{{ring.quality.name}}</div>
        <div>戒指</div>
      </div>
      <div class='lv'>
        <div>lv{{ring.lv}}</div>
      </div>
      <div class="entry">
        <div v-for="v in ring.type.entry" :key="v.id">
          <!-- <div>{{v.name}} : {{v.showVal}}</div> -->
          <div>{{v.name}} : {{v.showVal}} <span style="color:#68d5ed" v-if="ring.enchantlvl">(+{{Math.round(v.value*(1.05**(ring.enchantlvl)**1.1)-v.value)}})</span></div>
        </div>
      </div>
      <div class="extraEntry">
        <div v-for="v in ring.extraEntry" :key="v.id">
          <div>{{v.name}} : {{v.showVal}}</div>
        </div>
      </div>
      <!-- ==== 新增：套装身份与装备评分 ==== -->
      <div class="setInfo" v-if="ring.setId" :style="{color:ring.setColor,borderColor:ring.setColor}">
        <span>套装：{{ring.setName}}</span>
        <i class="setnum">已穿 {{setActiveNum(ring.setId)}}/4</i>
      </div>
      <div class="score">装备评分：{{score(ring)}}</div>
      <div class="des">
        <div>
          {{ring.type.des}}
        </div>
      </div>
    </div>

  </div>
</template>
<script>
import { equiAttributeRing } from '@/assets/config/equiAttributeRing'
import { matchSetPiece, getSetById } from '@/assets/config/sets'
import { scoreEquipment } from '@/assets/js/battle'
import { resolveIcon } from '@/assets/config/artMap'

export default {
  name: "ringPanel",
  mixins: [equiAttributeRing],
  data() {
    return {
      ring: {},
      qualityProbability: [0.25, 0.55, 0.15, 0.05,],
    };
  },
  props: ['item'],
  mounted() {
  },
  watch: {
    item() {
      this.ring = this.$deepCopy(this.item)
    }
  },
  methods: {
    iconOf(item) {
      return resolveIcon((item || {}).type)
    },
    // ==== 新增：评分与套装激活层数（给 tooltip 用） ====
    score(item) {
      return scoreEquipment(item)
    },
    setActiveNum(id) {
      var d = this.$store.state.setDetail.filter(v => v.id == id)[0]
      return d ? d.num : 0
    },
    setNameOf(id) {
      var set = getSetById(id)
      return set ? set.name : ''
    },
    createNewItem(qualityIndex, lv, forceTypeName) {
      var ring = {}
      ring.itemType = 'ring'
      ring.quality = qualityIndex > -1 ? this.quality[qualityIndex] : this.createQua()
      ring.lv = lv || this.createLv()
      ring.type = this.createType(ring, forceTypeName)
      ring.extraEntry = this.createExtraEntry(ring)
      // 新增：标记套装部件（部件身份来自装备底材本身，困难/极难副本会定向掉落套装底材）
      var setPiece = matchSetPiece('ring', ring.type.name)
      if (setPiece) {
        ring.setId = setPiece.id
        ring.setName = setPiece.name
        ring.setColor = setPiece.color
      }
      return JSON.stringify(ring)
    },
    createLv(Max) {
      return parseInt(Math.random() * (Max || 39)) + 1
    },
    createType(ring, forceTypeName) {
      if (ring.quality.name == '独特') {
        var index = Math.floor((Math.random() * this.uniqueCategory.length));
        var type = this.uniqueCategory[index], lv = ring.lv
      } else {
        var index = Math.floor((Math.random() * this.category.length));
        var type = this.category[index], lv = ring.lv
      }
      // 新增：定向生成指定底材（套装掉落用）
      if (forceTypeName) {
        var list = ring.quality.name == '独特' ? this.uniqueCategory : this.category
        var found = list.filter(t => t.name == forceTypeName)[0]
        if (found) {
          type = found
        }
      }
      type.entry.map(item => {
        switch (item.type) {
          case 'ATK':
            var random = parseInt(lv * item.valCoefficient + (Math.random() * lv / 2 + 1))
            random = parseInt(random * ring.quality.qualityCoefficient)
            random = random || 1
            item.value = random
            item.showVal = '+' + random
            break;
          case 'DEF':
            var random = parseInt((lv * item.valCoefficient + (Math.random() * lv / 2 + 1)))
            random = parseInt(random * ring.quality.qualityCoefficient)
            random = random || 1
            item.value = random
            item.showVal = '+' + random
            break;
          case 'HP':
            var random = parseInt((lv * item.valCoefficient * 10 + (Math.random() * lv / 2 + 1)))
            random = parseInt(random * ring.quality.qualityCoefficient)
            random = random || 1
            item.value = random
            item.showVal = '+' + random
            break;
          case 'CRIT':
            var random = parseInt(Math.random() * 5 + 10)
            random = parseInt(random * ring.quality.qualityCoefficient * item.valCoefficient)
            item.value = random
            item.showVal = '+' + random + '%'
            break;
          case 'CRITDMG':
            var random = parseInt(Math.random() * 20 + 30)
            random = parseInt(random * ring.quality.qualityCoefficient * item.valCoefficient)
            item.value = random
            item.showVal = '+' + random + '%'
            break;
          default:
            break;
        }
      })
      return type
    },
    createQua() {
      var index = Math.floor((Math.random() * this.qualityProbability.length));
      var a = this.qualityProbability[index], b = this.qualityProbability, quality
      switch (a) {
        case b[0]:
          quality = this.quality[0]
          break;
        case b[1]:
          quality = this.quality[1]
          break;
        case b[2]:
          quality = this.quality[2]
          break;
        case b[3]:
          quality = this.quality[3]
          break;
        default:
          break;
      }
      return quality
    },
    createExtraEntry(ring) {
      var n = ring.quality.extraEntryNum, extraEntry = [], lv = ring.lv
      for (let i = 0; i < n; i++) {
        var index = Math.floor((Math.random() * this.extraEntry.length));
        extraEntry.push(this.extraEntry[index])
      }
      var b = this.$deepCopy(extraEntry)
      b.map(item => {
        switch (item.type) {
          case 'ATK':
            var random = parseInt(lv * 0.3 + (Math.random() * lv / 2))
            random = parseInt(random * ring.quality.qualityCoefficient) + 1
            random = random || 1
            item.value = random
            item.showVal = '+' + random
            break;
          case 'DEF':
            var random = parseInt((lv * 0.2 + (Math.random() * lv / 2)))
            random = parseInt(random * ring.quality.qualityCoefficient) + 1
            random = random || 1
            item.value = random
            item.showVal = '+' + random
            break;
          case 'HP':
            var random = parseInt((lv * 0.2 * 10 + (Math.random() * lv / 2)))
            random = parseInt(random * ring.quality.qualityCoefficient) + 1
            random = random || 1
            item.value = random
            item.showVal = '+' + random
            break;
          case 'CRIT':
            var random = parseInt(Math.random() * 5 + 5)
            random = parseInt(random * ring.quality.qualityCoefficient)
            item.value = random
            item.showVal = '+' + random + '%'
            break;
          case 'CRITDMG':
            var random = parseInt(Math.random() * 12 + 20)
            random = parseInt(random * ring.quality.qualityCoefficient)
            item.value = random
            item.showVal = '+' + random + '%'
            break;
          default:
            break;
        }
      })
      extraEntry = b
      return extraEntry
    }
  }
};


</script>
<style lang="scss" scoped>
* {
  box-sizing: border-box;
}
.ringPanel {
  color: #f1f1f1;
  width: 3rem;
  height: auto;
  background: rgba(0, 0, 0, 0.8);
  border: #393839;
  border-radius: 0.05rem;
  padding: 0.16rem;
  box-sizing: border-box;
  .title {
    display: flex;
    padding-bottom: 0.1rem;
    border-bottom: 1px solid #777;
    .icon {
      width: 0.5rem;
      height: 0.5rem;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.04rem;
    }
    .name {
      height: 0.46rem;
      margin-left: 0.2rem;
      line-height: 0.46rem;
    }
  }
  .type {
    padding: 0.1rem;
    display: flex;
    width: 100%;
    align-content: center;
    justify-content: space-between;
  }
  .lv {
    padding-right: 0.1rem;
    display: flex;
    width: 100%;
    align-content: center;
    justify-content: flex-end;
  }
  .entry {
    width: 100%;
    padding-left: 0.2rem;
    padding-bottom: 0.1rem;
    border-bottom: 1px solid #777;
    div {
      text-align: left;
    }
  }
  .extraEntry {
    width: 100%;
    padding-left: 0.2rem;
    margin-top: 0.1rem;
    padding-bottom: 0.1rem;
    color: #68d5ed;
    border-bottom: 1px solid #777;
    div {
      text-align: left;
    }
  }
}
.des {
  color: #777;
  font-size: 0.12rem;
  margin-top: 0.1rem;
  text-align: left;
  text-indent: 0.24rem;
}
.btn {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0.2rem;
  button {
    padding: 0.06rem 0.12rem;
  }
}
/* ==== 新增：套装与评分 ==== */
.setInfo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid;
  padding: 0 0.06rem;
  margin-top: 0.06rem;
  font-size: 0.13rem;
  .setnum {
    opacity: 0.8;
  }
}
.score {
  font-size: 0.13rem;
  color: #68d5ed;
  margin-top: 0.04rem;
}
</style>
