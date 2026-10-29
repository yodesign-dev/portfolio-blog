// Đà Lạt sương mù (/chill, sau công tắc Studio highlandOpen): ảnh phố mới + lớp vẽ chồng.
//
// - Ảnh: phố trên mép đồi nhìn ra toàn cảnh thành phố (public/chill/scenes/hd/dalat-mist-*).
// - Sương: nằm trong thung lũng sau lan can và bám theo độ sâu của ảnh — chỗ xa, sáng
//   (thị trấn, sườn đồi) phủ dày, vật gần, tối (cột điện, thông, mái nhà) gần như không phủ.
//   Sáng: biển sương trắng ấm; tối: sương mỏng xanh lạnh dưới thung lũng, đèn đường hắt
//   vàng vào; chiều: không sương. 2 tầng nhiễu trôi khác tốc độ → sương thành cụm cuộn
//   chậm. Ô 2 px ảnh, mờ 4 bậc (đêm 8 bậc) có chấm lưới Bayer → mềm mà vẫn ra pixel.
// - Khói: ống khói biệt thự nhả từng cụm khói bay lên, nở ra, nghiêng theo gió (sáng, tối).
// - Đèn đường: đêm / sương thì có quầng sương quanh bóng đèn.
// - Kính quán: mép kính mờ hơi nước, lâu lâu một giọt chảy xuống (trời mưa thì đã có mưa).
//
// Chỉ điểm đến có trong HIGHLAND mới có lớp này. Toạ độ theo px ảnh 1120×476.

import type {TimeOfDay, Weather} from './scene'

type Spot = {x: number; y: number}
// Dải sương theo chiều dọc: y giữa dải, độ dày (px ảnh), độ đậm; top = không có sương phía
// trên (đêm: chừa bầu trời sau đồi khỏi lộ chấm)
type Band = {y: number; h: number; k: number; top?: number}
type Config = {
  fog: {
    morning: Band[]
    night: Band[]
    // Sương tắt dần trong 14 px quanh mép lan can (y ảnh) — dưới đó là quán, đường
    floor: number
    // Vật gần không phủ sương (x0, y0, x1, y1): mái nhà, cột…
    near: [number, number, number, number][]
  }
  chimneys: Spot[]
  lamps: Spot[]
}

export const HIGHLAND: Record<string, Config> = {
  dalat: {
    fog: {
      morning: [
        {y: 268, h: 46, k: 1},
        {y: 200, h: 60, k: 0.35},
      ],
      night: [{y: 288, h: 30, k: 1, top: 236}],
      floor: 318,
      near: [[248, 232, 500, 476]],
    },
    chimneys: [{x: 311, y: 230}],
    lamps: [
      {x: 813, y: 193},
      {x: 1102, y: 183},
      {x: 542, y: 208},
    ],
  },
}

export const highlandStreets = (id: string): Record<TimeOfDay, string> => ({
  morning: `/chill/scenes/hd/${id}-mist-morning.webp`,
  afternoon: `/chill/scenes/hd/${id}-mist-afternoon.webp`,
  night: `/chill/scenes/hd/${id}-mist-night.webp`,
})

type Puff = {x: number; y: number; age: number; life: number; r: number}

// Ảnh 1120×476 tính sương ở lưới 2 px (560×238)
const GW = 560
const GH = 238
const FOG_FPS = 12
// Kính quán: số px đệm cho 1 ô lưới cảnh (SCALE × RES của scene)
const MIST_PX = 4
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16)
const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
// Value noise mượt
function noise(x: number, y: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const u = (x - xi) * (x - xi) * (3 - 2 * (x - xi))
  const v = (y - yi) * (y - yi) * (3 - 2 * (y - yi))
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

const seeded = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return s - Math.floor(s)
}

export class Highland {
  private cfg: Config | null = null
  private time: TimeOfDay = 'morning'
  private weather: Weather = 'clear'
  private clock = 0
  private puffs: Puff[] = []
  private nextPuff = 0
  // Độ sâu từng ô (0 = gần / không sương … 1 = xa), tính từ ảnh buổi sáng (3 ảnh cùng bố cục)
  private depthOf = ''
  private depth: Float32Array | null = null
  private fogCanvas: HTMLCanvasElement | null = null
  private fogData: ImageData | null = null
  private fogAcc = 1
  private fogKey = ''
  private fogShown = false
  private wind = 1

  set(id: string, time: TimeOfDay, weather: Weather) {
    const cfg = HIGHLAND[id] ?? null
    if (cfg !== this.cfg) this.puffs = []
    this.cfg = cfg
    this.time = time
    this.weather = weather
    if (cfg && this.depthOf !== id) this.loadDepth(id, cfg)
  }

  // Mặt nạ độ sâu: sáng + nhạt (xa, mù không khí) → 1; tối (cột, thông, mái gần) → 0
  private loadDepth(id: string, cfg: Config) {
    this.depthOf = id
    this.depth = null
    const img = new Image()
    img.onload = () => {
      if (this.depthOf !== id) return
      const c = document.createElement('canvas')
      c.width = GW
      c.height = GH
      const cx = c.getContext('2d', {willReadFrequently: true})!
      cx.drawImage(img, 0, 0, GW, GH)
      let data: Uint8ClampedArray
      try {
        data = cx.getImageData(0, 0, GW, GH).data
      } catch {
        return
      }
      const depth = new Float32Array(GW * GH)
      const {floor, near} = cfg.fog
      for (let y = 0; y < GH; y++)
        for (let x = 0; x < GW; x++) {
          const i = (y * GW + x) * 4
          const l = (data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11) / 255
          let d = Math.min(1, Math.max(0, (l - 0.4) / 0.28))
          const xi = x * 2
          const yi = y * 2
          if (yi > floor) d *= Math.max(0, 1 - (yi - floor) / 14)
          for (const [x0, y0, x1, y1] of near) if (xi > x0 && xi < x1 && yi > y0 && yi < y1) d *= 0.15
          depth[y * GW + x] = d
        }
      this.depth = depth
      this.fogKey = ''
    }
    img.src = highlandStreets(id).morning
  }

  // Sáng dày, tối mỏng, chiều không; trời sương dày hơn, mưa thì thôi
  private fogStrength() {
    if (this.weather === 'rain' || this.time === 'afternoon') return 0
    const k = this.time === 'night' ? 0.65 : 1.25
    return this.weather === 'mist' ? k * 1.3 : k
  }

  // Tính lại lớp sương (12 lần/giây là đủ — sương trôi rất chậm)
  private paintFog() {
    const cfg = this.cfg
    const depth = this.depth
    const strength = this.fogStrength()
    this.fogShown = !!cfg && !!depth && strength > 0
    if (!this.fogShown || !cfg || !depth) return
    const night = this.time === 'night'
    if (!this.fogCanvas) {
      this.fogCanvas = document.createElement('canvas')
      this.fogCanvas.width = GW
      this.fogCanvas.height = GH
    }
    const fx = this.fogCanvas.getContext('2d')!
    const img = (this.fogData ??= fx.createImageData(GW, GH))
    const d = img.data
    const bands = night ? cfg.fog.night : cfg.fog.morning
    const col = night ? [126, 142, 182] : [246, 243, 238]
    const lvls = night ? 8 : 4
    const breath = 0.85 + 0.15 * Math.sin(this.clock * 0.1)
    const t = this.clock
    for (let y = 0; y < GH; y++) {
      const yi = y * 2
      let band = 0
      for (const b of bands) if (b.top === undefined || yi > b.top) band += Math.exp(-(((yi - b.y) / b.h) ** 2)) * b.k
      for (let x = 0; x < GW; x++) {
        const p = y * GW + x
        const i = p * 4
        const dp = depth[p]
        if (dp <= 0.01 || band <= 0.01) {
          d[i + 3] = 0
          continue
        }
        // Trôi theo hướng gió
        const n1 = noise(x / 46 - t * 0.09 * this.wind, y / 14)
        const n2 = noise(x / 19 - t * 0.22 * this.wind + 40, y / 8 + 10)
        let a = band * dp * (0.35 + 0.65 * (n1 * 0.7 + n2 * 0.3)) * strength * breath
        let r = col[0]
        let g = col[1]
        let b = col[2]
        // Đêm: đèn đường hắt vàng vào sương quanh nó
        if (night)
          for (const l of cfg.lamps) {
            const k = Math.max(0, 1 - Math.hypot(x * 2 - l.x, (y * 2 - l.y) * 1.3) / 120)
            if (k <= 0) continue
            r += (255 - r) * k * 0.5
            g += (214 - g) * k * 0.45
            b += (150 - b) * k * 0.25
          }
        const lv = a * lvls + BAYER[(y % 4) * 4 + (x % 4)] - 0.5
        a = (Math.max(0, Math.min(lvls, Math.round(lv))) / lvls) * 0.86
        d[i] = r
        d[i + 1] = g
        d[i + 2] = b
        d[i + 3] = a * 255
      }
    }
    fx.putImageData(img, 0, 0)
  }

  get active() {
    return this.cfg !== null
  }

  private smoky() {
    return this.time !== 'afternoon' && this.weather !== 'rain'
  }

  update(dt: number, wind: number) {
    if (!this.cfg) return
    this.clock += dt
    this.wind = wind || 1
    const key = `${this.time}|${this.weather}|${this.depth ? 1 : 0}`
    this.fogAcc += dt
    if (this.fogAcc >= 1 / FOG_FPS || key !== this.fogKey) {
      this.fogAcc = 0
      this.fogKey = key
      this.paintFog()
    }
    if (this.smoky() && (this.nextPuff -= dt) <= 0) {
      this.nextPuff = 0.35 + Math.random() * 0.4
      for (const c of this.cfg.chimneys) this.puffs.push({x: c.x, y: c.y, age: 0, life: 6 + Math.random() * 3, r: 3})
    }
    for (const p of this.puffs) {
      p.age += dt
      p.y -= dt * 9
      p.x += dt * (4 + p.age * 1.5) * (wind || 1)
      p.r = 3 + p.age * 2.2
    }
    this.puffs = this.puffs.filter((p) => p.age < p.life)
  }

  // Vẽ chồng lên ảnh phố ở rect r (lưới phố). Gọi ngay sau Facade.draw
  draw(ctx: CanvasRenderingContext2D, r: {x: number; y: number; w: number; h: number}) {
    const cfg = this.cfg
    if (!cfg) return
    const s = r.w / 1120
    const night = this.time === 'night'
    if (this.fogShown && this.fogCanvas) ctx.drawImage(this.fogCanvas, r.x, r.y, r.w, r.h)
    // Khói ống khói: cụm vuông mờ, càng lên càng nở và nhạt
    if (this.puffs.length) {
      // Trời sáng gần trắng: khói ngày phải xám hơn nền mới thấy
      const smoke = night ? '170,175,195' : '168,164,168'
      for (const p of this.puffs) {
        const k = p.age / p.life
        const a = Math.round((1 - k) * (k < 0.1 ? k * 10 : 1) * 0.7 * 16) / 16
        if (a <= 0) continue
        const q = Math.max(2, Math.round(p.r / 2) * 2)
        ctx.fillStyle = `rgba(${smoke},${a.toFixed(3)})`
        ctx.fillRect(r.x + (p.x - q / 2) * s, r.y + (p.y - q / 2) * s, q * s, q * s)
      }
    }
    // Quầng sương quanh đèn đường
    if (night || this.weather === 'mist') {
      const breathe = 0.85 + 0.15 * Math.sin(this.clock * 0.8)
      for (const l of cfg.lamps) {
        const cx = r.x + l.x * s
        const cy = r.y + l.y * s
        const rad = 46 * s
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
        g.addColorStop(0, `rgba(255,214,150,${(0.32 * breathe).toFixed(3)})`)
        g.addColorStop(0.5, `rgba(255,214,150,${(0.1 * breathe).toFixed(3)})`)
        g.addColorStop(1, 'rgba(255,214,150,0)')
        ctx.fillStyle = g
        ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2)
      }
    }
  }

  // Lớp mờ hơi nước vẽ sẵn (chỉ đổi khi đổi khung kính / giờ): ô 2 px đệm (½ ô lưới), mờ 8 bậc
  // có chấm lưới Bayer → rìa mềm, không lộ khối vuông như ô 8 px. Đêm nhạt hơn vì nền trời tối
  // dễ lộ hạt. Toạ độ theo lưới cảnh, 1 ô = MIST_PX px đệm
  private mist: {key: string; canvas: HTMLCanvasElement} | null = null
  private mistLayer(v: {x: number; y: number; w: number; h: number}, night: boolean) {
    const k = this.time === 'afternoon' ? 0.55 : night ? 0.6 : 1
    const key = `${v.x},${v.y},${v.w},${v.h},${night},${k}`
    if (this.mist?.key === key) return this.mist.canvas
    const canvas = this.mist?.canvas ?? document.createElement('canvas')
    canvas.width = Math.ceil(v.w * MIST_PX)
    canvas.height = Math.ceil(v.h * MIST_PX)
    const c = canvas.getContext('2d')!
    const img = c.createImageData(canvas.width, canvas.height)
    const [r, g, b] = night ? [170, 180, 205] : [236, 240, 244]
    const cell = 2
    for (let py = 0; py < canvas.height; py += cell)
      for (let px = 0; px < canvas.width; px += cell) {
        const x = px / MIST_PX
        const y = py / MIST_PX
        // Khoảng cách tới mép (đáy nặng hơn: hơi nước đọng dưới)
        const d = Math.min(x / 16, (v.w - x) / 16, y / 22, (v.h - y) / 12)
        if (d >= 1) continue
        // Rìa lổn nhổn như hơi thở trên kính: nhiễu mượt 2 tầng thay vì ô 3×3 cứng
        const n = 0.65 * noise(x / 3.5, y / 3.5) + 0.35 * noise(x / 1.2 + 50, y / 1.2)
        const a = (1 - d) * (1 - d) * 0.42 * k - n * 0.14
        if (a <= 0.01) continue
        const cx = px / cell
        const cy = py / cell
        const lv = Math.max(0, Math.min(8, Math.round(a * 8 + BAYER[(cy % 4) * 4 + (cx % 4)] - 0.5))) / 8
        if (lv <= 0) continue
        for (let yy = 0; yy < cell && py + yy < canvas.height; yy++)
          for (let xx = 0; xx < cell && px + xx < canvas.width; xx++) {
            const i = ((py + yy) * canvas.width + px + xx) * 4
            img.data[i] = r
            img.data[i + 1] = g
            img.data[i + 2] = b
            img.data[i + 3] = lv * 255
          }
      }
    c.putImageData(img, 0, 0)
    this.mist = {key, canvas}
    return canvas
  }

  // Kính quán mờ hơi nước: viền mờ ở mép kính (dày nhất ở góc dưới) + vài giọt chảy.
  // Gọi sau khi vẽ phố, trong vùng clip của khung kính; v = khung nhìn ra phố (lưới cảnh)
  drawGlass(ctx: CanvasRenderingContext2D, v: {x: number; y: number; w: number; h: number}) {
    if (!this.cfg || this.weather === 'rain') return
    const night = this.time === 'night'
    const rgb = night ? '170,180,205' : '236,240,244'
    ctx.drawImage(this.mistLayer(v, night), v.x, v.y, v.w, v.h)
    // Giọt nước: mỗi giọt có chu kỳ riêng, trượt xuống để lại vệt trong
    for (let i = 0; i < 3; i++) {
      const cyc = 14 + i * 5
      const n = Math.floor((this.clock + i * 4.3) / cyc)
      const p = ((this.clock + i * 4.3) % cyc) / cyc
      if (p > 0.5) continue
      const dx = Math.round(v.x + 6 + seeded(n, 20 + i) * (v.w - 12))
      const y0 = v.y + v.h - 14
      const dy = Math.round(y0 + (p / 0.5) ** 1.5 * 12)
      ctx.fillStyle = `rgba(${rgb},0.25)`
      ctx.fillRect(dx, y0, 1, dy - y0)
      ctx.fillStyle = `rgba(${night ? '220,228,245' : '250,252,255'},0.6)`
      ctx.fillRect(dx, dy, 1, 2)
    }
  }
}
