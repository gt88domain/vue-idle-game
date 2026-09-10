/**
 * sprite sheet 切图脚本（美术资产准备，不参与构建）
 *
 * 生成的 sheet 网格并不统一：武器/防具是 4×4，饰品是 6×3（前 10 格戒指、后 8 格项链），
 * 而且都是横图。若按「单元格 = 长方形」直接切，图标会被横向压扁，
 * 因此这里在每个网格里取**以物品为中心的方形裁切**（必要时向上下借用邻格的黑色留白），
 * 再统一缩到 128×128。
 *
 * 用法：
 *   npm i -D jimp@0.22      # 只为了跑这个脚本，可选
 *   node tools/slice-icons.js
 * 产物：src/assets/art/icons/{weapon,armor,ring,neck}_NN.png
 * 之后在 src/assets/config/artMap.js 里按底材名登记映射即可。
 *
 * @author arena agent
 */
const fs = require('fs')
const path = require('path')

let Jimp
try {
  Jimp = require('jimp')
} catch (e) {
  console.error('需要 jimp：先执行  npm i -D jimp@0.22')
  process.exit(1)
}

const ROOT = path.resolve(__dirname, '..')
const ART = path.join(ROOT, 'src/assets/art')
const OUT = path.join(ART, 'icons')

const SHEETS = [{
  file: 'sheet_weapons.png',
  cols: 4,
  rows: 4,
  side: null, // 方形网格：直接用单元格
  name: i => `weapon_${String(i).padStart(2, '0')}.png`,
  count: 16
}, {
  file: 'sheet_armor.png',
  cols: 4,
  rows: 4,
  side: 210, // 单元格 352×192，取 210 见方（竖向借邻格留白）
  name: i => `armor_${String(i).padStart(2, '0')}.png`,
  count: 16
}, {
  file: 'sheet_acc.png',
  cols: 6,
  rows: 3,
  side: 224,
  count: 18,
  // 前 10 格是戒指，后 8 格是项链
  name: i => (i < 10 ? `ring_${String(i).padStart(2, '0')}.png` : `neck_${String(i - 10).padStart(2, '0')}.png`)
}]

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  for (const sh of SHEETS) {
    const src = path.join(ART, sh.file)
    if (!fs.existsSync(src)) {
      console.warn('跳过（缺源图）：', sh.file)
      continue
    }
    const img = await Jimp.read(src)
    const cw = img.bitmap.width / sh.cols
    const ch = img.bitmap.height / sh.rows
    for (let i = 0; i < sh.count; i++) {
      const c = i % sh.cols
      const r = Math.floor(i / sh.cols)
      const S = sh.side || Math.min(cw, ch)
      const cx = cw * c + cw / 2
      const cy = ch * r + ch / 2
      const x = Math.max(0, Math.min(img.bitmap.width - S, Math.round(cx - S / 2)))
      const y = Math.max(0, Math.min(img.bitmap.height - S, Math.round(cy - S / 2)))
      const cell = img.clone().crop(x, y, S, S).background(0x000000ff).resize(128, 128)
      await cell.writeAsync(path.join(OUT, sh.name(i)))
    }
    console.log('sliced', sh.file, '->', sh.count, 'icons')
  }
  console.log('done. icons at', path.relative(ROOT, OUT))
})().catch(e => {
  console.error(e)
  process.exit(1)
})
