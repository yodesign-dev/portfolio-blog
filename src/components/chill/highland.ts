// Đà Lạt sương mù (/chill, sau công tắc Studio highlandOpen): ảnh phố mới + lớp vẽ chồng.
//
// - Ảnh: phố trên mép đồi nhìn ra toàn cảnh thành phố (public/chill/scenes/hd/dalat-mist-*).
// - Sương: vài dải sương mỏng trôi chậm ngang thung lũng phía sau lan can (sáng dày,
//   chiều mỏng, đêm xanh lạnh). Vẽ bằng ô vuông mờ theo lưới phố cho hợp pixel.
// - Khói: ống khói biệt thự nhả từng cụm khói bay lên, nở ra, nghiêng theo gió (sáng, tối).
// - Đèn đường: đêm / sương thì có quầng sương quanh bóng đèn.
// - Kính quán: mép kính mờ hơi nước, lâu lâu một giọt chảy xuống (trời mưa thì đã có mưa).
//
// Chỉ điểm đến có trong HIGHLAND mới có lớp này. Toạ độ theo px ảnh 1120×476.

import type {TimeOfDay, Weather} from './scene'

type Spot = {x: number; y: number}
type Config = {
  // Dải sương: y giữa dải, độ dày (px ảnh), chỉ vẽ trong khoảng [y0, y1] (trên lan can)
  fog: {y: number; h: number}[]
  fogClip: [number, number]
  // Khoảng ngang có sương (thung lũng sau lan can), mép mờ dần — không phủ lên nhà, thông gần
  fogX: [number, number]
  chimneys: Spot[]
  lamps: Spot[]
}

export const HIGHLAND: Record<string, Config> = {
  dalat: {
    fog: [
      {y: 262, h: 34},
      {y: 222, h: 26},
      {y: 300, h: 26},
    ],
    fogClip: [150, 334],
    fogX: [470, 1120],
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

  set(id: string, time: TimeOfDay, weather: Weather) {
    const cfg = HIGHLAND[id] ?? null
    if (cfg !== this.cfg) this.puffs = []
    this.cfg = cfg
    this.time = time
    this.weather = weather
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
  draw(ctx: CanvasRenderingContext2D, r: {x: number; y: number; w: number; h: number}, wind: number) {
    const cfg = this.cfg
    if (!cfg) return
    const s = r.w / 1120
    const night = this.time === 'night'
    // 1 ô sương = 8 px ảnh (2 ô lưới phố) → khối mềm nhưng vẫn ra pixel
    const cell = 8
    const [c0, c1] = cfg.fogClip
    const base = this.weather === 'mist' ? 1.4 : this.time === 'morning' ? 1 : this.time === 'afternoon' ? 0.5 : 0.65
    const rgb = night ? '150,165,200' : this.time === 'afternoon' ? '246,226,222' : '240,244,247'
    cfg.fog.forEach((band, i) => {
      const speed = (3 + i * 1.6) * (wind || 1)
      const off = this.clock * speed + i * 300
      for (let y = Math.max(c0, band.y - band.h); y < Math.min(c1, band.y + band.h); y += cell) {
        const fy = 1 - Math.abs(y + cell / 2 - band.y) / band.h
        const [x0, x1] = cfg.fogX
        for (let x = x0; x < x1; x += cell) {
          const edge = Math.min(1, (x - x0) / 80, x1 >= 1120 ? 1 : (x1 - x) / 80)
          // Mật độ dải dao động theo x (2 sóng chồng nhau) → sương thành từng cụm trôi
          const u = (x - off) / 1120
          const wave = 0.55 + 0.3 * Math.sin(u * Math.PI * 2 * 1.3 + i) + 0.15 * Math.sin(u * Math.PI * 2 * 3.7 + i * 2)
          let a = fy * wave * edge * 0.5 * base
          if (a <= 0.02) continue
          // Lượng tử hoá độ mờ 4 bậc cho hợp pixel art
          a = Math.round(a * 16) / 16
          ctx.fillStyle = `rgba(${rgb},${a.toFixed(3)})`
          ctx.fillRect(r.x + x * s, r.y + y * s, cell * s + 0.01, cell * s + 0.01)
        }
      }
    })
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

  // Kính quán mờ hơi nước: viền mờ ở mép kính (dày nhất ở góc dưới) + vài giọt chảy.
  // Gọi sau khi vẽ phố, trong vùng clip của khung kính; v = khung nhìn ra phố (lưới cảnh)
  drawGlass(ctx: CanvasRenderingContext2D, v: {x: number; y: number; w: number; h: number}) {
    if (!this.cfg || this.weather === 'rain') return
    const night = this.time === 'night'
    const k = this.time === 'afternoon' ? 0.55 : 1
    const rgb = night ? '170,180,205' : '236,240,244'
    const cell = 2
    for (let y = v.y; y < v.y + v.h; y += cell)
      for (let x = v.x; x < v.x + v.w; x += cell) {
        // Khoảng cách tới mép (đáy nặng hơn: hơi nước đọng dưới)
        const d = Math.min((x - v.x) / 16, (v.x + v.w - x) / 16, (y - v.y) / 22, (v.y + v.h - y) / 12)
        if (d >= 1) continue
        // Rìa lổn nhổn như hơi thở trên kính, không phải viền thẳng
        const noise = seeded(Math.floor(x / 3), Math.floor(y / 3))
        const a = (1 - d) * (1 - d) * 0.42 * k - noise * 0.12
        if (a <= 0.02) continue
        ctx.fillStyle = `rgba(${rgb},${(Math.round(a * 12) / 12).toFixed(3)})`
        ctx.fillRect(x, y, cell, cell)
      }
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
