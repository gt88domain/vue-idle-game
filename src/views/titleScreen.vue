<template>
  <div class="title-screen" :style="bgStyle">
    <div class="scrim"></div>
    <div class="content">
      <div class="logo">
        <div class="logo-sub on-art">IDLE · ROGUELIKE · DEMON HUNTER</div>
        <div class="logo-main on-art">无尽远征</div>
        <div class="logo-line">
          <span></span><i>◆</i><span></span>
        </div>
        <div class="logo-cn on-art">讨伐魔神 · 深渊回响 · 英雄集结</div>
      </div>

      <div class="btns">
        <div class="go btn-gold btn-press" @click="enter(false)">
          <b>{{ hasSave ? '继续远征' : '开始远征' }}</b>
          <i>{{ hasSave ? '读取本地存档，离线收益会自动结算' : '新的人生，从第一把铁剑开始' }}</i>
        </div>
        <div class="go ghost btn-press" v-if="hasSave" @click="enter(true)">
          <b>重新开始</b>
          <i>丢弃当前进度（会先备份到导出口令）</i>
        </div>
      </div>

      <div class="foot on-art">
        <span class="tag">v1.5.0</span>
        <span class="sep">|</span>
        <span>复刻开源 Vue-Idle-Game（MIT）+ 新增 套装 / 深渊 / 英雄 / 成就 玩法</span>
      </div>
    </div>
    <div class="hint on-art" v-if="!clicked">点击任意处进入</div>
  </div>
</template>

<script>
import {
  SCENE
} from '@/assets/config/artMap'

export default {
  name: 'TitleScreen',
  data() {
    return {
      clicked: false
    }
  },
  computed: {
    bgStyle() {
      return {
        backgroundImage: `url(${SCENE.splash})`
      }
    },
    hasSave() {
      return !!localStorage.getItem('_sd')
    }
  },
  methods: {
    enter(fresh) {
      this.clicked = true
      this.$emit('enter', {
        fresh: !!fresh
      })
    }
  }
}
</script>

<style scoped lang="scss">
.title-screen {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background-size: cover;
  background-position: 50% 38%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: titleFade 0.4s ease-out;
}

@keyframes titleFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.scrim {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.25) 34%, rgba(0, 0, 0, 0.9) 100%);
}

.content {
  position: relative;
  width: 100%;
  padding-bottom: 0.24rem;
  text-align: center;
}

.logo {
  margin-bottom: 0.22rem;

  .logo-sub {
    font-family: Courier, sans-serif;
    font-size: 0.1rem;
    letter-spacing: 0.04rem;
    color: #b8a67e;
  }

  .logo-main {
    font-size: 0.44rem;
    font-weight: 700;
    letter-spacing: 0.1rem;
    line-height: 1.25;
    color: #f7e9c6;
    text-shadow: 0 0.02rem 0 #241a08, 0 0 0.14rem rgba(255, 196, 90, 0.35);
    margin-top: 0.02rem;
  }

  .logo-line {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0.04rem 0;

    span {
      display: block;
      height: 1px;
      width: 0.8rem;
      background: linear-gradient(90deg, transparent, #e8c874);
    }

    span:last-child {
      background: linear-gradient(90deg, #e8c874, transparent);
    }

    i {
      color: #e8c874;
      font-size: 0.08rem;
      font-style: normal;
      padding: 0 0.04rem;
    }
  }

  .logo-cn {
    font-size: 0.12rem;
    color: #cbb894;
    letter-spacing: 0.02rem;
  }
}

.btns {
  width: 1.9rem;
  margin: 0 auto;
}

.go {
  display: block;
  padding: 0.07rem 0.1rem;
  margin-bottom: 0.06rem;
  text-align: center;

  b {
    display: block;
    font-size: 0.16rem;
    letter-spacing: 0.04rem;
    color: #ffe9b8;
  }

  i {
    display: block;
    font-style: normal;
    font-size: 0.1rem;
    color: #bdae90;
    margin-top: 0.02rem;
  }
}

.go.ghost {
  background: rgba(12, 11, 10, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.16);

  b {
    color: #cfc7b8;
  }
}

.foot {
  margin-top: 0.1rem;
  font-size: 0.1rem;
  color: #9a8f7d;

  .tag {
    color: #e8c874;
    border: 1px solid rgba(232, 200, 116, 0.3);
    border-radius: 2px;
    padding: 0 0.03rem;
    margin-right: 0.02rem;
  }

  .sep {
    color: #4d463d;
    margin: 0 0.03rem;
  }
}

.hint {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0.06rem;
  font-size: 0.1rem;
  color: #7d7466;
  animation: blink 1.8s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.9; }
}
</style>
