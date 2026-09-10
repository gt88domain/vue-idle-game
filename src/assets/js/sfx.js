/**
 * 程序化音效（WebAudio，零素材依赖）
 *
 * 手游级的"手感"有一半来自反馈音。这里不引入任何音频文件：
 * 用振荡器 + 包络合成点击/金币/命中/暴击/胜利/强化成功失败等短音，
 * 首次用户手势时才创建 AudioContext（浏览器自动播放策略要求）。
 *
 * @author arena agent
 */

let ctx = null
let master = null
let enabled = true
let volume = 0.35

function ensure() {
  if (ctx) {
    return ctx
  }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) {
    return null
  }
  ctx = new AC()
  master = ctx.createGain()
  master.gain.value = volume
  master.connect(ctx.destination)
  return ctx
}

function tone({
  freq = 440,
  to = null,
  dur = 0.12,
  type = 'sine',
  gain = 0.5,
  delay = 0,
  sweepType = 'exp'
}) {
  const c = ensure()
  if (!c || !enabled) {
    return
  }
  if (c.state === 'suspended') {
    c.resume()
  }
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to) {
    if (sweepType === 'exp') {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur)
    } else {
      osc.frequency.linearRampToValueAtTime(Math.max(1, to), t0 + dur)
    }
  }
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function noise({
  dur = 0.18,
  gain = 0.25,
  hp = 800,
  lp = 6000
}) {
  const c = ensure()
  if (!c || !enabled) {
    return
  }
  const len = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    d[i] = (Math.random() * 2 - 1) * (1 - i / len)
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const hpf = c.createBiquadFilter()
  hpf.type = 'highpass'
  hpf.frequency.value = hp
  const lpf = c.createBiquadFilter()
  lpf.type = 'lowpass'
  lpf.frequency.value = lp
  const g = c.createGain()
  g.gain.value = gain
  src.connect(hpf)
  hpf.connect(lpf)
  lpf.connect(g)
  g.connect(master)
  src.start()
}

const LIB = {
  click: () => tone({
    freq: 660,
    to: 880,
    dur: 0.05,
    type: 'triangle',
    gain: 0.22
  }),
  tab: () => tone({
    freq: 420,
    to: 620,
    dur: 0.07,
    type: 'triangle',
    gain: 0.24
  }),
  coin: () => {
    tone({
      freq: 1180,
      dur: 0.06,
      type: 'square',
      gain: 0.14
    })
    tone({
      freq: 1560,
      dur: 0.09,
      type: 'square',
      gain: 0.11,
      delay: 0.05
    })
  },
  hit: () => {
    noise({
      dur: 0.08,
      gain: 0.16,
      hp: 1200,
      lp: 5200
    })
    tone({
      freq: 190,
      to: 90,
      dur: 0.09,
      type: 'sawtooth',
      gain: 0.2
    })
  },
  crit: () => {
    tone({
      freq: 140,
      to: 60,
      dur: 0.2,
      type: 'sawtooth',
      gain: 0.34
    })
    noise({
      dur: 0.22,
      gain: 0.3,
      hp: 600,
      lp: 4200
    })
    tone({
      freq: 1400,
      to: 300,
      dur: 0.16,
      type: 'square',
      gain: 0.12,
      delay: 0.02
    })
  },
  kill: () => tone({
    freq: 520,
    to: 120,
    dur: 0.16,
    type: 'triangle',
    gain: 0.24
  }),
  victory: () => {
    ;[523, 659, 784, 1046].forEach((f, i) => tone({
      freq: f,
      dur: 0.16,
      type: 'triangle',
      gain: 0.22,
      delay: i * 0.09
    }))
  },
  defeat: () => {
    ;[392, 330, 262, 196].forEach((f, i) => tone({
      freq: f,
      dur: 0.2,
      type: 'sine',
      gain: 0.24,
      delay: i * 0.11
    }))
  },
  enhance_ok: () => {
    tone({
      freq: 700,
      to: 1500,
      dur: 0.18,
      type: 'triangle',
      gain: 0.26
    })
    tone({
      freq: 1500,
      dur: 0.1,
      type: 'sine',
      gain: 0.16,
      delay: 0.16
    })
  },
  enhance_fail: () => tone({
    freq: 320,
    to: 110,
    dur: 0.28,
    type: 'sawtooth',
    gain: 0.24
  }),
  drop: () => {
    tone({
      freq: 900,
      to: 1700,
      dur: 0.12,
      type: 'sine',
      gain: 0.2
    })
    tone({
      freq: 1700,
      dur: 0.16,
      type: 'sine',
      gain: 0.14,
      delay: 0.1
    })
  },
  rare: () => {
    ;[660, 880, 1320, 1760, 2200].forEach((f, i) => tone({
      freq: f,
      dur: 0.22,
      type: 'sine',
      gain: 0.2,
      delay: i * 0.07
    }))
  },
  summon: () => {
    tone({
      freq: 200,
      to: 1400,
      dur: 0.5,
      type: 'sine',
      gain: 0.2
    })
    noise({
      dur: 0.5,
      gain: 0.1,
      hp: 2000,
      lp: 8000
    })
  },
  ult: () => {
    tone({
      freq: 90,
      to: 400,
      dur: 0.34,
      type: 'sawtooth',
      gain: 0.3
    })
    noise({
      dur: 0.34,
      gain: 0.22,
      hp: 300,
      lp: 3000
    })
  },
  ui_error: () => tone({
    freq: 220,
    to: 180,
    dur: 0.12,
    type: 'square',
    gain: 0.16
  })
}

export const sfx = {
  play(name, payload) {
    const fn = LIB[name]
    if (!fn) {
      return
    }
    try {
      fn(payload)
    } catch (e) {
      /* 忽略音频异常，绝不影响玩法 */
    }
  },
  setEnabled(v) {
    enabled = !!v
    if (enabled) {
      ensure()
    }
  },
  get enabled() {
    return enabled
  },
  setVolume(v) {
    volume = Math.max(0, Math.min(1, Number(v)))
    if (master) {
      master.gain.value = volume
    }
  },
  get volume() {
    return volume
  }
}

// 系统信息流的音效映射：给 sys_info 的 type/msg 打上声音
export function sfxForSysInfo(entry) {
  if (!entry) {
    return
  }
  const msg = (entry.msg || '')
  if (entry.type === 'trophy') {
    if (/独特|稀有掉落|套装掉落/.test(msg)) {
      sfx.play('rare')
    } else {
      sfx.play('drop')
    }
  } else if (entry.type === 'win') {
    if (/击杀了/.test(msg)) {
      sfx.play('kill')
    } else if (/副本探索成功|挑战成功/.test(msg)) {
      sfx.play('victory')
    } else if (/强化|达成成就/.test(msg)) {
      sfx.play('enhance_ok')
    }
  } else if (entry.type === 'warning' && /战斗失败|中断|失败/.test(msg)) {
    sfx.play('defeat')
  }
}

export default sfx
