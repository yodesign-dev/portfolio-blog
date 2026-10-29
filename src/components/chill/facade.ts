// Mặt phố sống động (/chill, sau công tắc Studio facadeOpen): lớp vẽ chồng lên ảnh phố.
//
// - Đêm: tự dò ô cửa sổ đang sáng trên ảnh (pixel vàng ấm, trên vỉa hè, gom theo 8
//   hướng) — không cần đánh dấu tay. Khoảng một nửa số phòng có người tắt đèn rồi bật
//   lại, 1 ô xem TV (ánh xanh chập chờn), 1–2 ô đèn tuýp nháy mấy lần mới sáng hẳn,
//   quầng sáng quanh ô thở chậm.
// - Đêm: bảng hiệu neon chữ pixel 3×5 có dấu tiếng Việt, đặt trong Studio ("Mặt phố" của
//   từng điểm đến) hoặc theo SIGN_DEFAULTS bên dưới.
// - Ngày trời quang: bóng mây trôi chậm qua mặt phố; chiều thì thỉnh thoảng một vệt nắng
//   lóe quét qua các mảng sáng (kính, tường trắng).
//
// Đọc pixel ảnh cần CORS → tải lại ảnh với crossOrigin (Sanity CDN cho phép, ảnh trong
// /public cùng nguồn); lỗi thì thôi, chỉ còn bóng mây + neon.
// Mọi toạ độ vẽ theo lưới phố (rect r = chỗ ảnh nằm trên canvas); toạ độ dò theo px ảnh.

import type {TimeOfDay, Weather} from './scene'

export type NeonColor = 'pink' | 'cyan' | 'red' | 'green' | 'yellow'
export type NeonMode = 'sweep' | 'steady' | 'blink'
// x, y: % chiều ngang / dọc của ảnh phố, là góc trái trên của hàng chữ (không tính dấu)
export type NeonSign = {text: string; x: number; y: number; color?: NeonColor; mode?: NeonMode}

// Bảng hiệu mặc định khi điểm đến chưa đặt trong Studio (id = mã điểm đến)
export const SIGN_DEFAULTS: Record<string, NeonSign[]> = {
  // Bảng hiệu tối trên tầng trệt nhà hồng
  saigon: [{text: 'CÀ PHÊ', x: 55.7, y: 61.3, color: 'pink', mode: 'sweep'}],
  // Chữ PHỞ vẽ sẵn trên bảng hiệu nhà xanh ngọc — đêm thì sáng neon đè đúng chỗ
  'hanoi-tau': [{text: 'PHỞ', x: 38, y: 60.5, color: 'yellow', mode: 'steady'}],
}

// Đồ vật động treo trên mặt phố (sprite AI, Nano Banana 2.1): props.webp, mỗi món 1 hàng
// 4 khung, px theo ảnh phố 1120 px. ax/ay = điểm neo trong khung (cờ: chân cán; dây phơi:
// đầu dây trái; đèn lồng: đỉnh, dây treo vẽ bằng code)
const PROPS_SRC = '/chill/scenes/props.webp'
const PROPS = {
  flag: {y: 0, w: 24, h: 25, ax: 8, ay: 24, fps: 6},
  laundry: {y: 25, w: 52, h: 23, ax: 0, ay: 1, fps: 2.5},
  lantern: {y: 48, w: 12, h: 21, ax: 5, ay: 3, fps: 0},
} as const
export type PropKind = keyof typeof PROPS
// x, y: điểm neo trên ảnh phố 1120×476 (ảnh 560 px thì nhân đôi toạ độ); string = dây treo (px)
export type PropSpot = {kind: PropKind; x: number; y: number; string?: number; flip?: boolean}
export const PROP_SPOTS: Record<string, PropSpot[]> = {
  // Dây phơi giăng ngang ban công nhà cam bên phải, quần áo vắt trên lan can
  saigon: [{kind: 'laundry', x: 1034, y: 244}],
  // Đèn lồng treo dưới mái dưới của cổng thành
  hue: [
    {kind: 'lantern', x: 462, y: 268, string: 6},
    {kind: 'lantern', x: 648, y: 268, string: 6},
  ],
  // Cờ cắm ở trụ phải ban công nhà vàng, bay về phía cửa sổ (lật)
  'hanoi-tau': [{kind: 'flag', x: 590, y: 275, flip: true}],
  // Dây phơi dưới hiên nhà gỗ bên trái
  tiengiang: [{kind: 'laundry', x: 196, y: 344}],
}
// Nhuộm đồ vật theo giờ cho khớp ảnh phố (ảnh phố đã vẽ sẵn ánh sáng từng giờ)
const PROP_TINT: Record<TimeOfDay, string | null> = {morning: null, afternoon: '#ffe0c0', night: '#58628f'}

const NEON_RGB: Record<NeonColor, [number, number, number]> = {
  pink: [255, 92, 170],
  cyan: [70, 220, 255],
  red: [255, 70, 60],
  green: [90, 255, 140],
  yellow: [255, 205, 80],
}

// Chữ 3×5, từng hàng từ trên xuống ('#' = ống neon)
const GLYPHS: Record<string, string> = {
  A: '.#. #.# ### #.# #.#', B: '##. #.# ##. #.# ##.', C: '### #.. #.. #.. ###', D: '##. #.# #.# #.# ##.', E: '### #.. ##. #.. ###',
  F: '### #.. ##. #.. #..', G: '### #.. #.# #.# ###', H: '#.# #.# ### #.# #.#', I: '### .#. .#. .#. ###', J: '..# ..# ..# #.# ###',
  K: '#.# #.# ##. #.# #.#', L: '#.. #.. #.. #.. ###', M: '#.# ### #.# #.# #.#', N: '##. #.# #.# #.# #.#', O: '### #.# #.# #.# ###',
  P: '### #.# ### #.. #..', Q: '### #.# #.# ### ..#', R: '### #.# ##. #.# #.#', S: '### #.. ### ..# ###', T: '### .#. .#. .#. .#.',
  U: '#.# #.# #.# #.# ###', V: '#.# #.# #.# #.# .#.', W: '#.# #.# #.# ### #.#', X: '#.# #.# .#. #.# #.#', Y: '#.# #.# .#. .#. .#.',
  Z: '### ..# .#. #.. ###', '0': '### #.# #.# #.# ###', '1': '.#. ##. .#. .#. ###', '2': '### ..# ### #.. ###', '3': '### ..# ### ..# ###',
  '4': '#.# #.# ### ..# ..#', '5': '### #.. ### ..# ###', '6': '### #.. ### #.# ###', '7': '### ..# ..# ..# ..#', '8': '### #.# ### #.# ###',
  '9': '### #.# ### ..# ###', '&': '.#. #.# .#. #.# .##', '-': '... ... ### ... ...', '.': '... ... ... ... .#.', '!': '.#. .#. .#. ... .#.',
}
// Dấu (NFD): toạ độ [x, y] so với góc trái trên thân chữ; y âm = phía trên
const HAT: Record<string, [number, number][]> = {
  '̂': [[1, -2], [0, -1], [2, -1]], // mũ: Â Ê Ô
  '̆': [[0, -2], [2, -2], [1, -1]], // trăng: Ă
}
const TONE: Record<string, [number, number][]> = {
  '́': [[1, -1], [2, -2]], // sắc
  '̀': [[1, -1], [0, -2]], // huyền
  '̉': [[0, -2], [1, -2], [1, -1]], // hỏi
  '̃': [[0, -1], [1, -2], [2, -1]], // ngã
  '̣': [[1, 6]], // nặng
}
const HORN: [number, number][] = [
  [3, -1],
  [3, 0],
] // móc: Ơ Ư

// Ô pixel của 1 dòng chữ: [x, y, chữ thứ i]; y từ -3 (dấu trên cùng) tới 6 (dấu nặng)
function layout(text: string) {
  const px: [number, number, number][] = []
  let x = 0
  let i = 0
  for (const ch of text.normalize('NFD').toUpperCase().replace(/[^\S ]/g, ' ').match(/\P{M}\p{M}*/gu) ?? []) {
    const base = ch[0] === 'Đ' ? 'D' : ch[0]
    const marks = ch.slice(1)
    if (base === ' ') {
      x += 3
      continue
    }
    const g = GLYPHS[base]?.replace(/ /g, '')
    if (!g) continue
    for (let p = 0; p < 15; p++) if (g[p] === '#') px.push([x + (p % 3), Math.floor(p / 3), i])
    // Đ: thêm gạch ngang chìa sang trái
    if (ch[0] === 'Đ') px.push([x - 1, 2, i])
    let hat = false
    for (const m of marks) {
      if (HAT[m]) {
        hat = true
        for (const [dx, dy] of HAT[m]) px.push([x + dx, dy, i])
      }
      if (m === '̛') for (const [dx, dy] of HORN) px.push([x + dx, dy, i])
    }
    for (const m of marks) {
      // Có mũ / trăng thì dấu thanh dời sang phải, lên trên (kiểu chữ Việt)
      if (TONE[m]) for (const [dx, dy] of TONE[m]) px.push(m === '̣' ? [x + dx, dy, i] : hat ? [x + dx + 2, dy - 1, i] : [x + dx, dy, i])
    }
    x += 4
    i++
  }
  return {px, letters: i, width: Math.max(0, x - 1)}
}

type Blob = {
  x0: number
  y0: number
  x1: number
  y1: number
  role: 'still' | 'toggle' | 'tv' | 'tube'
  on: boolean
  level: number
  next: number
  ph: number
  sputter: number
}

type Analysis = {
  img: HTMLImageElement
  w: number
  h: number
  blobs: Blob[]
  dark: HTMLCanvasElement | null // các ô cửa sổ lúc tắt đèn (chỉ có pixel của ô, còn lại trong suốt)
  tv: HTMLCanvasElement | null // các ô nhuộm ánh TV
  glint: HTMLCanvasElement | null // mảng sáng để vệt nắng lóe (trắng, còn lại trong suốt)
}

export class Facade {
  private rng: () => number
  private a: Analysis | null = null
  private time: TimeOfDay = 'morning'
  private weather: Weather = 'clear'
  private signs: NeonSign[] = []
  private clock = 0
  private tvLevel = 1
  private tvNext = 0
  private nextGlint = 4
  private glintT = -1
  private band: HTMLCanvasElement | null = null
  private props: PropSpot[] = []
  private sweep = true
  private propsImg: HTMLImageElement | null = null
  private propsTinted: HTMLCanvasElement | null = null
  private propsKey = ''

  constructor(rng: () => number) {
    this.rng = rng
  }

  // Gọi khi đổi ảnh phố / giờ / thời tiết / điểm đến
  // sweep = false: cảnh toàn cảnh đồi (Đà Lạt sương mù) — không bóng mây / vệt nắng quét,
  // vì phủ cả thung lũng lẫn quán cùng lúc trông như đèn chiếu chạy ngang
  set(img: HTMLImageElement, time: TimeOfDay, weather: Weather, signs: NeonSign[], props: PropSpot[] = [], sweep = true) {
    this.time = time
    this.weather = weather
    this.signs = signs
    this.props = props
    this.sweep = sweep
    if (this.a?.img === img) return
    const slot: Analysis = {img, w: 0, h: 0, blobs: [], dark: null, tv: null, glint: null}
    this.a = slot
    const cors = new Image()
    cors.crossOrigin = 'anonymous'
    cors.onload = () => {
      if (this.a !== slot) return
      this.analyze(slot, cors)
    }
    cors.src = img.src
  }

  private analyze(slot: Analysis, img: HTMLImageElement) {
    const w = img.naturalWidth
    const h = img.naturalHeight
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const cx = c.getContext('2d', {willReadFrequently: true})!
    cx.drawImage(img, 0, 0)
    let data: Uint8ClampedArray
    try {
      data = cx.getImageData(0, 0, w, h).data
    } catch {
      return
    }
    slot.w = w
    slot.h = h
    // Ngưỡng diện tích theo ảnh 560 px, ảnh lớn hơn nhân theo diện tích
    const k2 = (w / 560) ** 2
    const lim = Math.round(h * 0.84) // trên vỉa hè
    if (this.time === 'night') {
      const lit = new Uint8Array(w * h)
      for (let y = 0; y < lim; y++)
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          if (data[i] > 195 && data[i + 1] > 175 && data[i] - data[i + 2] > 25) lit[y * w + x] = 1
        }
      const seen = new Uint8Array(w * h)
      const dark = cx.createImageData(w, h)
      const tv = cx.createImageData(w, h)
      const blobs: (Blob & {pts: number[]})[] = []
      for (let p = 0; p < w * h; p++) {
        if (!lit[p] || seen[p]) continue
        const stack = [p]
        const pts: number[] = []
        seen[p] = 1
        while (stack.length) {
          const q = stack.pop()!
          pts.push(q)
          const x = q % w
          const y = (q / w) | 0
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx
              const ny = y + dy
              const n = ny * w + nx
              if (nx >= 0 && nx < w && ny >= 0 && ny < h && lit[n] && !seen[n]) {
                seen[n] = 1
                stack.push(n)
              }
            }
        }
        if (pts.length < 4 * k2 || pts.length > 300 * k2) continue
        let x0 = w
        let y0 = h
        let x1 = 0
        let y1 = 0
        for (const q of pts) {
          const x = q % w
          const y = (q / w) | 0
          x0 = Math.min(x0, x)
          x1 = Math.max(x1, x)
          y0 = Math.min(y0, y)
          y1 = Math.max(y1, y)
        }
        // Chỉ ô đủ to, gần chữ nhật mới là "phòng" (bỏ bóng đèn đường, tượng, biển hiệu)
        const fill = pts.length / ((x1 - x0 + 1) * (y1 - y0 + 1))
        const room = pts.length >= 10 * k2 && fill > 0.45
        blobs.push({pts, x0, y0, x1, y1, role: room ? 'toggle' : 'still', on: true, level: 1, next: 0, ph: this.rng() * 6, sputter: -1})
      }
      const rooms = blobs.filter((b) => b.role === 'toggle')
      for (const b of rooms) if (this.rng() > 0.55) b.role = 'still'
      const big = [...rooms].sort((p, q) => q.pts.length - p.pts.length)
      if (big.length >= 6) big[3].role = 'tv'
      for (const b of [big[1], big[5]]) if (b) b.role = 'tube'
      for (const b of blobs) {
        // Lần đổi đầu tiên đến sớm để khách vừa vào đã thấy phố sống
        b.next = b.role === 'tube' ? 6 + this.rng() * 20 : 3 + this.rng() * 40
        for (const q of b.pts) {
          const i = q * 4
          // Tắt đèn: lòng cửa sổ về xanh tối của đêm
          dark.data[i] = data[i] * 0.18
          dark.data[i + 1] = data[i + 1] * 0.2
          dark.data[i + 2] = data[i + 2] * 0.36 + 18
          dark.data[i + 3] = 255
          // Ánh TV: xanh lạnh
          tv.data[i] = data[i] * 0.4 + 20
          tv.data[i + 1] = data[i + 1] * 0.62 + 30
          tv.data[i + 2] = Math.min(255, data[i + 2] * 1.1 + 70)
          tv.data[i + 3] = 255
        }
      }
      // Bỏ danh sách pixel (đã nằm trong 2 canvas) cho nhẹ bộ nhớ
      for (const b of blobs) b.pts = []
      slot.blobs = blobs
      slot.dark = canvasOf(dark)
      slot.tv = canvasOf(tv)
    }
    if (this.time === 'afternoon') {
      // Mảng sáng (kính lóa, tường trắng) dưới bầu trời, trên vỉa hè
      const glint = cx.createImageData(w, h)
      for (let y = Math.round(h * 0.2); y < lim; y++)
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          if (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11 > 175) {
            glint.data[i] = glint.data[i + 1] = glint.data[i + 2] = 255
            glint.data[i + 3] = 255
          }
        }
      slot.glint = canvasOf(glint)
    }
  }

  update(dt: number) {
    this.clock += dt
    const a = this.a
    if (this.time === 'night' && a) {
      for (const b of a.blobs) {
        if (b.role === 'still') continue
        if (b.role !== 'tv') {
          b.next -= dt
          if (b.next <= 0) {
            b.on = !b.on
            // Tắt 8–30 giây, sáng 25–90 giây — nhiều phòng cùng đổi nên cứ vài giây lại có 1 nhà
            b.next = b.on ? 25 + this.rng() * 65 : 8 + this.rng() * 22
            if (b.on && b.role === 'tube') b.sputter = this.clock
          }
        }
        let target = b.on ? 1 : 0
        if (b.on && b.role === 'tube' && b.sputter >= 0) {
          const s = this.clock - b.sputter
          if (s < 0.56) target = [1, 0, 1, 0, 0, 1, 0.4, 1][Math.floor(s / 0.07)] ?? 1
        }
        // Bóng sợi đốt sáng / tắt mất ~0,15 giây; đèn tuýp tức thì
        const rate = b.role === 'tube' ? 99 : 7
        b.level += Math.max(-rate * dt, Math.min(rate * dt, target - b.level))
      }
      this.tvNext -= dt
      if (this.tvNext <= 0) {
        this.tvLevel = 0.35 + this.rng() * 0.65
        this.tvNext = 0.08 + this.rng() * 0.35
      }
    }
    if (this.time === 'afternoon' && this.weather === 'clear') {
      if (this.glintT >= 0) {
        this.glintT += dt
        if (this.glintT > 2.6) this.glintT = -1
      } else if ((this.nextGlint -= dt) <= 0) {
        this.glintT = 0
        this.nextGlint = 10 + this.rng() * 15
      }
    }
  }

  // Vẽ chồng lên ảnh phố vừa vẽ ở rect r (lưới phố). wind = hướng gió (bóng mây trôi theo)
  draw(ctx: CanvasRenderingContext2D, r: {x: number; y: number; w: number; h: number}, wind: number) {
    const night = this.time === 'night'
    const a = this.a?.w ? this.a : null
    this.drawProps(ctx, r)
    if (night) {
      if (a) this.drawLights(ctx, a, r)
      this.drawSigns(ctx, r)
      return
    }
    if (this.weather !== 'clear' || !this.sweep) return
    this.drawClouds(ctx, r, wind)
    if (a?.glint && this.glintT >= 0 && this.time === 'afternoon') this.drawGlint(ctx, a, r)
  }

  // Cờ phấp phới, quần áo phơi đung đưa, đèn lồng lắc 1 px quanh dây treo (đêm thì sáng)
  private drawProps(ctx: CanvasRenderingContext2D, r: {x: number; y: number; w: number; h: number}) {
    if (!this.props.length) return
    if (!this.propsImg) {
      const img = new Image()
      img.onload = () => (this.propsKey = '')
      img.src = PROPS_SRC
      this.propsImg = img
    }
    const img = this.propsImg
    if (!img.complete || !img.naturalWidth) return
    const tint = this.weather === 'rain' ? (this.time === 'night' ? '#4c5578' : '#b4bcc8') : PROP_TINT[this.time]
    const key = tint ?? 'none'
    if (this.propsKey !== key || !this.propsTinted) {
      const c = (this.propsTinted ??= document.createElement('canvas'))
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      const cx = c.getContext('2d')!
      cx.globalCompositeOperation = 'source-over'
      cx.drawImage(img, 0, 0)
      if (tint) {
        cx.globalCompositeOperation = 'multiply'
        cx.fillStyle = tint
        cx.fillRect(0, 0, c.width, c.height)
        cx.globalCompositeOperation = 'destination-in'
        cx.drawImage(img, 0, 0)
      }
      this.propsKey = key
    }
    const sheet = this.propsTinted!
    const s = r.w / 1120
    const night = this.time === 'night'
    this.props.forEach((p, i) => {
      const spec = PROPS[p.kind]
      const t = this.clock + i * 0.9
      // Dây phơi: 4 khung đi tới rồi lui (0 1 2 3 2 1)
      const seq = p.kind === 'laundry' ? [0, 1, 2, 3, 2, 1] : [0, 1, 2, 3]
      const f = spec.fps ? seq[Math.floor(t * spec.fps) % seq.length] : 0
      const sway = p.kind === 'lantern' ? Math.round(Math.sin(t * 1.7)) : 0
      const x = r.x + (p.x - (p.flip ? spec.w - 1 - spec.ax : spec.ax) + sway) * s
      const y = r.y + (p.y - spec.ay) * s
      if (p.string) {
        ctx.fillStyle = night ? '#1c1a24' : '#3a2c26'
        ctx.fillRect(r.x + p.x * s, r.y + (p.y - p.string) * s, s, p.string * s)
      }
      if (p.flip) {
        ctx.save()
        ctx.translate(x * 2 + spec.w * s, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(sheet, f * spec.w, spec.y, spec.w, spec.h, x, y, spec.w * s, spec.h * s)
      if (p.flip) ctx.restore()
      if (night && p.kind === 'lantern') {
        // Đèn lồng thắp sáng: lõi ấm + quầng đỏ cam
        const cx = x + (spec.w / 2) * s
        const cy = y + spec.h * 0.45 * s
        const rad = spec.w * 1.6 * s
        ctx.globalCompositeOperation = 'lighter'
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
        g.addColorStop(0, `rgba(255,140,70,${(0.42 + 0.06 * Math.sin(t * 2.3)).toFixed(3)})`)
        g.addColorStop(1, 'rgba(255,90,40,0)')
        ctx.fillStyle = g
        ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2)
        ctx.globalCompositeOperation = 'source-over'
      }
    })
  }

  private drawLights(ctx: CanvasRenderingContext2D, a: Analysis, r: {x: number; y: number; w: number; h: number}) {
    const sx = r.w / a.w
    const sy = r.h / a.h
    const alpha = ctx.globalAlpha
    for (const b of a.blobs) {
      const bw = b.x1 - b.x0 + 1
      const bh = b.y1 - b.y0 + 1
      const dx = r.x + b.x0 * sx
      const dy = r.y + b.y0 * sy
      if (b.role === 'tv' && a.tv) {
        ctx.globalAlpha = alpha * (0.55 + 0.45 * this.tvLevel)
        ctx.drawImage(a.tv, b.x0, b.y0, bw, bh, dx, dy, bw * sx, bh * sy)
      } else if (b.level < 1 && a.dark) {
        ctx.globalAlpha = alpha * (1 - b.level)
        ctx.drawImage(a.dark, b.x0, b.y0, bw, bh, dx, dy, bw * sx, bh * sy)
      }
    }
    // Quầng sáng quanh ô đang sáng, thở chậm
    ctx.globalCompositeOperation = 'lighter'
    for (const b of a.blobs) {
      const k = b.role === 'tv' ? 0.6 * this.tvLevel : b.level
      if (k < 0.05) continue
      const cx = r.x + ((b.x0 + b.x1 + 1) / 2) * sx
      const cy = r.y + ((b.y0 + b.y1 + 1) / 2) * sy
      const rad = Math.max(b.x1 - b.x0, b.y1 - b.y0, 4) * sx * 2
      const breath = 0.75 + 0.25 * Math.sin(this.clock * 0.9 + b.ph)
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
      g.addColorStop(0, b.role === 'tv' ? `rgba(120,160,255,${(0.3 * k).toFixed(3)})` : `rgba(255,205,120,${(0.18 * k * breath).toFixed(3)})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.globalAlpha = alpha
      ctx.fillStyle = g
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2)
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = alpha
  }

  // Chữ neon: 1 pixel chữ = 1 px của ảnh 560 (½ ô lưới), viền ống tối khi tắt
  private drawSigns(ctx: CanvasRenderingContext2D, r: {x: number; y: number; w: number; h: number}) {
    if (!this.signs.length) return
    const p = r.w / 560
    const alpha = ctx.globalAlpha
    this.signs.forEach((s, si) => {
      const {px, letters, width} = layout(s.text)
      if (!letters) return
      const [cr, cg, cb] = NEON_RGB[s.color ?? 'pink']
      const ox = r.x + Math.round((s.x / 100) * 560) * p
      const oy = r.y + Math.round((s.y / 100) * 238) * (r.h / 238)
      const t = this.clock + si * 2.3
      const mode = s.mode ?? 'sweep'
      let lit = (i: number) => i >= 0
      let any = true
      if (mode === 'sweep') {
        // Bật từng chữ → giữ → chớp 2 lần → tắt nghỉ
        const cyc = t % 7
        const shown = cyc < 2 ? Math.floor(cyc / (2 / letters)) : letters
        const blink = cyc >= 4.4 && cyc < 5.2 && Math.floor((cyc - 4.4) / 0.2) % 2 === 0
        any = !blink && cyc < 6.2
        lit = (i) => any && i < shown
      } else if (mode === 'blink') {
        any = t % 1.5 < 1
        lit = () => any
      } else {
        // Sáng đều, thỉnh thoảng 1 chữ chập chờn
        const flick = t % 23 < 0.5 ? Math.floor(t / 23) % letters : -1
        lit = (i) => i !== flick || Math.floor(t * 14) % 2 === 0
      }
      ctx.fillStyle = `rgb(${Math.round(cr * 0.3)},${Math.round(cg * 0.25)},${Math.round(cb * 0.35)})`
      for (const [x, y, i] of px) if (!lit(i)) ctx.fillRect(ox + x * p, oy + y * p, p, p)
      // Quầng ống neon: mỗi pixel sáng loang 1 pixel ra xung quanh (vẽ trước, nằm dưới lõi)
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.22)`
      for (const [x, y, i] of px) if (lit(i)) ctx.fillRect(ox + (x - 1) * p, oy + (y - 1) * p, p * 3, p * 3)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = `rgb(${Math.min(255, cr + 40)},${Math.min(255, cg + 110)},${Math.min(255, cb + 70)})`
      for (const [x, y, i] of px) if (lit(i)) ctx.fillRect(ox + x * p, oy + y * p, p, p)
      if (!any) return
      ctx.globalCompositeOperation = 'lighter'
      const cx = ox + (width / 2) * p
      const cy = oy + 2.5 * p
      const rad = Math.max(width * p * 1.1, 12)
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
      g.addColorStop(0, `rgba(${cr},${cg},${cb},0.4)`)
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
      ctx.fillStyle = g
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = alpha
    })
  }

  // 3 đám bóng mây mềm trôi theo gió; trời (¼ trên ảnh) không có bóng
  private drawClouds(ctx: CanvasRenderingContext2D, r: {x: number; y: number; w: number; h: number}, wind: number) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(r.x, r.y + r.h * 0.3, r.w, r.h * 0.7)
    ctx.clip()
    for (let i = 0; i < 3; i++) {
      const span = r.w * 2.2
      const along = (this.clock * 5 + i * span * 0.34) % span
      const cx = wind > 0 ? r.x - r.w * 0.6 + along : r.x + r.w * 1.6 - along
      const cy = r.y + r.h * (0.5 + 0.1 * i)
      const rx = r.w * (0.26 + 0.06 * i)
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(1, 0.45)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
      g.addColorStop(0, 'rgba(30,36,70,0.22)')
      g.addColorStop(0.6, 'rgba(30,36,70,0.12)')
      g.addColorStop(1, 'rgba(30,36,70,0)')
      ctx.fillStyle = g
      ctx.fillRect(-rx, -rx, rx * 2, rx * 2)
      ctx.restore()
    }
    ctx.restore()
  }

  // Vệt nắng chéo quét trái → phải trong 2,6 giây, chỉ sáng lên ở các mảng sáng
  private drawGlint(ctx: CanvasRenderingContext2D, a: Analysis, r: {x: number; y: number; w: number; h: number}) {
    const band = (this.band ??= document.createElement('canvas'))
    if (band.width !== a.w || band.height !== a.h) {
      band.width = a.w
      band.height = a.h
    }
    const bc = band.getContext('2d')!
    bc.globalCompositeOperation = 'source-over'
    bc.clearRect(0, 0, a.w, a.h)
    const e = this.glintT / 2.6
    const bx = -a.w * 0.2 + e * a.w * 1.4
    const half = a.w * 0.05
    const g = bc.createLinearGradient(bx - half, 0, bx + half, a.h * 0.25)
    const peak = Math.sin(Math.PI * e)
    g.addColorStop(0, 'rgba(255,240,200,0)')
    g.addColorStop(0.5, `rgba(255,240,200,${(0.75 * peak).toFixed(3)})`)
    g.addColorStop(1, 'rgba(255,240,200,0)')
    bc.fillStyle = g
    bc.fillRect(0, 0, a.w, a.h)
    bc.globalCompositeOperation = 'destination-in'
    bc.drawImage(a.glint!, 0, 0)
    ctx.globalCompositeOperation = 'lighter'
    ctx.drawImage(band, r.x, r.y, r.w, r.h)
    ctx.globalCompositeOperation = 'source-over'
  }
}

function canvasOf(img: ImageData) {
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  c.getContext('2d')!.putImageData(img, 0, 0)
  return c
}
