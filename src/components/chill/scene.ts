// Cảnh pixel của trang /chill: góc quán cà phê nhìn qua cửa sổ ra phố Việt Nam.
//
// Vẽ hoàn toàn bằng canvas ở độ phân giải thấp (320×180) rồi phóng to bằng
// CSS `image-rendering: pixelated` — đây là bản tạm của giai đoạn 1. Khi có
// art AI, thay các hàm drawOutsideStatic / drawInteriorStatic bằng drawImage.
//
// Thứ tự lớp (xa → gần):
//   trời → sao/mây/chim → [cache: skyline, nhà ống, cây, cột điện, vỉa hè]
//   → xe máy/người đi bộ → mưa → kính cửa → [cache: khung cửa, bàn, cây cảnh]
//   → phin cà phê + hơi nước → người ngồi → ánh đèn

export type TimeOfDay = 'morning' | 'afternoon' | 'night'
export type Weather = 'clear' | 'rain' | 'mist'

export const SCENE_W = 320
export const SCENE_H = 180

const STREET_Y = 100 // mép trên vỉa hè
const SILL_Y = 114 // bậu cửa sổ
const TABLE_Y = 118
const FAR_LANE = 109
const NEAR_LANE = 114

type Palette = {
  skyTop: string
  skyBottom: string
  far: string
  cloud: string
  outside: string | null // màu nhân (multiply) cho mọi thứ ngoài phố
  inside: string | null // màu nhân cho đồ trong quán
  lights: number // tỉ lệ cửa sổ sáng đèn
  stars: boolean
  sun: {x: number; y: number; r: number; color: string; halo: string}
  lamp: boolean
}

const PALETTES: Record<TimeOfDay, Palette> = {
  morning: {
    skyTop: '#8fc4e8',
    skyBottom: '#fde7c4',
    far: '#b7c6d3',
    cloud: '#fffaf0',
    outside: null,
    inside: '#f7ece0',
    lights: 0.04,
    stars: false,
    sun: {x: 84, y: 30, r: 8, color: '#fff5d8', halo: 'rgba(255,236,190,0.35)'},
    lamp: false,
  },
  afternoon: {
    skyTop: '#e98f6f',
    skyBottom: '#ffd08a',
    far: '#c98f86',
    cloud: '#ffd7b0',
    outside: '#ffd2ae',
    inside: '#f2c49c',
    lights: 0.25,
    stars: false,
    sun: {x: 262, y: 62, r: 10, color: '#ffe0a0', halo: 'rgba(255,170,100,0.35)'},
    lamp: true,
  },
  night: {
    skyTop: '#0b1030',
    skyBottom: '#2a2c58',
    far: '#1c2144',
    cloud: '#2b3160',
    outside: '#3b4280',
    inside: '#5d4f70',
    lights: 0.7,
    stars: true,
    sun: {x: 262, y: 24, r: 6, color: '#f3f0dc', halo: 'rgba(220,225,255,0.18)'},
    lamp: true,
  },
}

// ---------- Tiện ích màu ----------

const rgbCache = new Map<string, [number, number, number]>()
function rgb(hex: string): [number, number, number] {
  let v = rgbCache.get(hex)
  if (!v) {
    const n = parseInt(hex.slice(1), 16)
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    rgbCache.set(hex, v)
  }
  return v
}

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')

function mix(a: string, b: string, k: number) {
  const [r1, g1, b1] = rgb(a)
  const [r2, g2, b2] = rgb(b)
  return toHex(r1 + (r2 - r1) * k, g1 + (g2 - g1) * k, b1 + (b2 - b1) * k)
}

function multiply(hex: string, tint: string | null) {
  if (!tint) return hex
  const [r1, g1, b1] = rgb(hex)
  const [r2, g2, b2] = rgb(tint)
  return toHex((r1 * r2) / 255, (g1 * g2) / 255, (b1 * b2) / 255)
}

function combine(a: string | null, b: string | null) {
  if (!a) return b
  if (!b) return a
  return multiply(a, b)
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T>(rng: () => number, list: T[]) => list[Math.floor(rng() * list.length)]

// ---------- Nhân vật chuyển động ----------

type Bike = {
  x: number
  dir: 1 | -1
  speed: number
  lane: number
  color: string
  shirt: string
  helmet: string
  passenger: {shirt: string; helmet: string} | null
  cargo: 'none' | 'flowers' | 'boxes'
  phase: number
}

type Walker = {
  x: number
  dir: 1 | -1
  speed: number
  shirt: string
  pants: string
  hat: boolean
  baskets: boolean
}

type Cloud = {x: number; y: number; s: number}
type Drop = {x: number; y: number; len: number; speed: number}
type GlassDrop = {x: number; y: number; r: number; v: number}

const BIKE_COLORS = ['#c7362f', '#2f5fa8', '#e8e4dc', '#1f1f24', '#6f8f3a', '#d98a2b']
const SHIRTS = ['#f2f0ea', '#2f5fa8', '#d9534f', '#e6b03a', '#3f7d5a', '#7a5ca8', '#5a6470']
const HELMETS = ['#f2c230', '#e8e4dc', '#c7362f', '#2f5fa8', '#1f1f24', '#e87aa0']
const PONCHOS = ['#3b82c4', '#e8c33a', '#d9534f', '#58a55c', '#8a5cc4']

export class ChillScene {
  private ctx: CanvasRenderingContext2D
  private time: TimeOfDay = 'morning'
  private weather: Weather = 'clear'
  private musicOn = false
  private palette = PALETTES.morning
  private tintOut: string | null = null
  private tintIn: string | null = null
  private skyTop = ''
  private skyBottom = ''
  private cloudColor = ''

  private outsideCache: HTMLCanvasElement
  private interiorCache: HTMLCanvasElement
  private dirty = true

  private rng = Math.random
  private bikes: Bike[] = []
  private walkers: Walker[] = []
  private clouds: Cloud[] = []
  private rain: Drop[] = []
  private glass: GlassDrop[] = []
  private stars: {x: number; y: number; p: number}[] = []
  private birds: {x: number; y: number; p: number} | null = null
  private nextBike = 0.5
  private nextWalker = 2
  private nextBirds = 6
  private last = 0
  private clock = 0

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = SCENE_W
    canvas.height = SCENE_H
    this.ctx = canvas.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false
    this.outsideCache = this.makeLayer()
    this.interiorCache = this.makeLayer()

    const r = mulberry32(42)
    for (let i = 0; i < 5; i++) this.clouds.push({x: r() * SCENE_W, y: 6 + r() * 30, s: 0.7 + r() * 0.8})
    for (let i = 0; i < 60; i++) this.stars.push({x: r() * SCENE_W, y: r() * 60, p: r() * 6})
    for (let i = 0; i < 140; i++) {
      this.rain.push({x: r() * SCENE_W, y: r() * SILL_Y, len: 3 + Math.floor(r() * 3), speed: 150 + r() * 60})
    }
    for (let i = 0; i < 36; i++) this.glass.push({x: 4 + r() * 312, y: 6 + r() * 104, r: r() < 0.3 ? 2 : 1, v: 0})
    // Mở trang ra đã có sẵn vài chiếc xe trên đường, không phải chờ
    for (let i = 0; i < 3; i++) this.spawnBike(40 + i * 100)
    this.spawnWalker(120)
  }

  setAtmosphere(time: TimeOfDay, weather: Weather) {
    if (time === this.time && weather === this.weather && !this.dirty) return
    this.time = time
    this.weather = weather
    this.dirty = true
  }

  setMusic(on: boolean) {
    this.musicOn = on
  }

  // Gọi mỗi frame từ requestAnimationFrame
  frame(now: number) {
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0
    this.last = now
    this.clock += dt
    if (this.dirty) this.rebuild()
    this.update(dt)
    this.draw(this.clock)
  }

  // ---------- Cập nhật ----------

  private rebuild() {
    this.dirty = false
    const p = PALETTES[this.time]
    this.palette = p
    const rainy = this.weather === 'rain'
    this.tintOut = combine(p.outside, rainy ? '#aab3be' : this.weather === 'mist' ? '#eceae6' : null)
    this.tintIn = combine(p.inside, rainy ? '#dfe2e6' : null)
    const grey = this.time === 'night' ? '#1a1f33' : '#8e96a0'
    this.skyTop = rainy ? mix(p.skyTop, grey, 0.65) : p.skyTop
    this.skyBottom = rainy ? mix(p.skyBottom, grey, 0.55) : p.skyBottom
    this.cloudColor = rainy ? mix(p.cloud, grey, 0.6) : p.cloud
    this.drawOutsideStatic()
    this.drawInteriorStatic()
  }

  private update(dt: number) {
    const rainy = this.weather === 'rain'
    for (const c of this.clouds) {
      c.x += dt * (rainy ? 3 : 1.5) * c.s
      if (c.x > SCENE_W + 40) c.x = -40
    }

    this.nextBike -= dt
    if (this.nextBike <= 0) {
      this.spawnBike()
      const busy = this.time === 'night' ? 2.2 : 1
      this.nextBike = (1.2 + this.rng() * 2.8) * busy * (rainy ? 1.6 : 1)
    }
    for (const b of this.bikes) b.x += b.dir * b.speed * dt
    this.bikes = this.bikes.filter((b) => b.x > -30 && b.x < SCENE_W + 30)

    this.nextWalker -= dt
    if (this.nextWalker <= 0) {
      if (!rainy) this.spawnWalker()
      this.nextWalker = 7 + this.rng() * 9
    }
    for (const w of this.walkers) w.x += w.dir * w.speed * dt
    this.walkers = this.walkers.filter((w) => w.x > -20 && w.x < SCENE_W + 20)

    this.nextBirds -= dt
    if (this.nextBirds <= 0 && !this.birds && this.time !== 'night' && !rainy) {
      this.birds = {x: -10, y: 14 + this.rng() * 20, p: 0}
      this.nextBirds = 14 + this.rng() * 20
    }
    if (this.birds) {
      this.birds.x += dt * 16
      this.birds.p += dt
      if (this.birds.x > SCENE_W + 10) this.birds = null
    }

    if (rainy) {
      for (const d of this.rain) {
        d.y += d.speed * dt
        d.x -= d.speed * dt * 0.25
        if (d.y > SILL_Y) {
          d.y = -d.len
          d.x = this.rng() * (SCENE_W + 40)
        }
      }
      for (const g of this.glass) {
        // Thỉnh thoảng 1 giọt trên kính trượt xuống
        if (g.v === 0 && this.rng() < dt * 0.05) g.v = 8 + this.rng() * 20
        if (g.v > 0) {
          g.y += g.v * dt
          if (g.y > SILL_Y - 2) {
            g.y = 4 + this.rng() * 40
            g.x = 4 + this.rng() * 312
            g.v = 0
          }
        }
      }
    }
  }

  private spawnBike(x?: number) {
    const r = this.rng
    const dir: 1 | -1 = r() < 0.5 ? 1 : -1
    const rainy = this.weather === 'rain'
    const cargoRoll = r()
    this.bikes.push({
      x: x ?? (dir > 0 ? -20 : SCENE_W + 20),
      dir,
      speed: 24 + r() * 20,
      lane: dir > 0 ? NEAR_LANE : FAR_LANE,
      color: pick(r, BIKE_COLORS),
      shirt: rainy ? pick(r, PONCHOS) : pick(r, SHIRTS),
      helmet: pick(r, HELMETS),
      passenger: r() < 0.3 ? {shirt: pick(r, SHIRTS), helmet: pick(r, HELMETS)} : null,
      cargo: cargoRoll < 0.12 ? 'flowers' : cargoRoll < 0.2 ? 'boxes' : 'none',
      phase: r(),
    })
    this.bikes.sort((a, b) => a.lane - b.lane)
  }

  private spawnWalker(x?: number) {
    const r = this.rng
    const dir: 1 | -1 = r() < 0.5 ? 1 : -1
    const vendor = r() < 0.55
    this.walkers.push({
      x: x ?? (dir > 0 ? -14 : SCENE_W + 14),
      dir,
      speed: vendor ? 5 + r() * 2 : 8 + r() * 4,
      shirt: pick(r, SHIRTS),
      pants: pick(r, ['#2d2d38', '#3f4a5c', '#5a4636']),
      hat: vendor || r() < 0.3,
      baskets: vendor,
    })
  }

  // ---------- Vẽ ----------

  private makeLayer() {
    const c = document.createElement('canvas')
    c.width = SCENE_W
    c.height = SCENE_H
    return c
  }

  private rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
    ctx.fillStyle = color
    ctx.fillRect(Math.round(x), Math.round(y), w, h)
  }

  private disc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
    ctx.fillStyle = color
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3)
      ctx.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2 + 1, 1)
    }
  }

  private o = (hex: string) => multiply(hex, this.tintOut)
  private n = (hex: string) => multiply(hex, this.tintIn)

  private draw(t: number) {
    const ctx = this.ctx
    const p = this.palette

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, SCENE_W, SILL_Y)
    ctx.clip()

    // Trời — vẽ thành dải màu để giữ cảm giác pixel
    const bands = 12
    for (let i = 0; i < bands; i++) {
      const y0 = Math.floor((i * STREET_Y) / bands)
      const y1 = Math.floor(((i + 1) * STREET_Y) / bands)
      this.rect(ctx, 0, y0, SCENE_W, y1 - y0, mix(this.skyTop, this.skyBottom, i / (bands - 1)))
    }

    if (p.stars && this.weather === 'clear') {
      for (const s of this.stars) {
        if (Math.sin(t * 1.5 + s.p) > -0.4) this.rect(ctx, s.x, s.y, 1, 1, 'rgba(255,255,240,0.8)')
      }
    }
    if (this.weather !== 'rain') {
      this.disc(ctx, p.sun.x, p.sun.y, p.sun.r + 5, p.sun.halo)
      this.disc(ctx, p.sun.x, p.sun.y, p.sun.r, p.sun.color)
      if (this.time === 'night') this.disc(ctx, p.sun.x + 3, p.sun.y - 2, p.sun.r - 1, this.skyTop)
    }

    for (const c of this.clouds) this.drawCloud(c)
    if (this.birds) this.drawBirds(this.birds)

    ctx.drawImage(this.outsideCache, 0, 0)

    for (const w of this.walkers) this.drawWalker(w, t)
    for (const b of this.bikes) this.drawBike(b, t)

    if (this.weather === 'rain') {
      ctx.fillStyle = 'rgba(210,222,235,0.45)'
      for (const d of this.rain) {
        for (let k = 0; k < d.len; k++) ctx.fillRect(Math.round(d.x + k * 0.25), Math.round(d.y + k), 1, 1)
      }
      // Hạt mưa bắn trên mặt đường
      ctx.fillStyle = 'rgba(220,230,240,0.5)'
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(((t * 97 + i * 37) % 1) * SCENE_W + i * 31) % SCENE_W
        ctx.fillRect(x, 105 + (i % 8), 1, 1)
      }
    }

    // Kính cửa: vệt phản chiếu chéo + giọt nước khi mưa
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    for (const px of [10, 118, 226]) {
      ctx.beginPath()
      ctx.moveTo(px + 30, 0)
      ctx.lineTo(px + 46, 0)
      ctx.lineTo(px + 6, SILL_Y)
      ctx.lineTo(px - 10, SILL_Y)
      ctx.fill()
    }
    if (this.weather === 'rain') {
      for (const g of this.glass) {
        if (g.v > 0) this.rect(ctx, g.x, g.y - 6, 1, 6, 'rgba(220,235,255,0.18)')
        this.disc(ctx, g.x, g.y, g.r - 1, 'rgba(225,238,255,0.55)')
        this.rect(ctx, g.x - (g.r - 1), g.y - (g.r - 1), 1, 1, 'rgba(255,255,255,0.8)')
      }
    }
    ctx.restore()

    ctx.drawImage(this.interiorCache, 0, 0)
    this.drawCoffee(t)
    this.drawPerson(t)
    this.drawLights()
  }

  private drawCloud(c: Cloud) {
    const ctx = this.ctx
    const s = c.s
    const col = this.cloudColor
    this.disc(ctx, c.x, c.y + 3 * s, Math.round(5 * s), col)
    this.disc(ctx, c.x + 7 * s, c.y, Math.round(7 * s), col)
    this.disc(ctx, c.x + 15 * s, c.y + 3 * s, Math.round(5 * s), col)
    this.rect(ctx, c.x - 2 * s, c.y + 5 * s, Math.round(22 * s), Math.round(3 * s), col)
  }

  private drawBirds(b: {x: number; y: number; p: number}) {
    const up = Math.floor(b.p * 5) % 2 === 0
    const col = this.o('#2e3440')
    for (const [dx, dy] of [
      [0, 0],
      [9, 4],
    ]) {
      const x = b.x + dx
      const y = b.y + dy
      this.rect(this.ctx, x, y, 1, 1, col)
      this.rect(this.ctx, x - 2, up ? y - 1 : y + 1, 2, 1, col)
      this.rect(this.ctx, x + 1, up ? y - 1 : y + 1, 2, 1, col)
    }
  }

  // Phần tĩnh ngoài phố: vẽ 1 lần mỗi khi đổi thời điểm/thời tiết
  private drawOutsideStatic() {
    const ctx = this.outsideCache.getContext('2d')!
    ctx.clearRect(0, 0, SCENE_W, SCENE_H)
    const o = this.o
    const p = this.palette
    const night = this.time === 'night'
    const r = mulberry32(7)

    // Skyline xa (toà nhà cao tầng mờ trong sương)
    const far = this.weather === 'rain' ? mix(p.far, this.skyBottom, 0.4) : p.far
    for (let x = -4; x < SCENE_W; ) {
      const w = 8 + Math.floor(r() * 12)
      const h = 18 + Math.floor(r() * 30)
      const shade = mix(far, this.skyTop, r() * 0.2)
      this.rect(ctx, x, STREET_Y - 18 - h, w, h, shade)
      if (night) {
        for (let i = 0; i < 4; i++) {
          if (r() < 0.6) this.rect(ctx, x + 1 + Math.floor(r() * (w - 2)), STREET_Y - 16 - Math.floor(r() * h), 1, 1, 'rgba(255,214,140,0.7)')
        }
      } else {
        r()
        r()
        r()
        r()
      }
      x += w
    }
    // 1 toà tháp cao làm điểm nhấn
    this.rect(ctx, 196, STREET_Y - 90, 12, 72, mix(far, this.skyTop, 0.15))
    this.rect(ctx, 199, STREET_Y - 96, 6, 6, mix(far, this.skyTop, 0.15))
    this.rect(ctx, 201, STREET_Y - 104, 1, 8, mix(far, this.skyTop, 0.2))
    if (night) this.rect(ctx, 201, STREET_Y - 105, 1, 1, '#ff5a4a')

    if (this.weather === 'mist') {
      ctx.fillStyle = 'rgba(236,238,240,0.55)'
      ctx.fillRect(0, 0, SCENE_W, STREET_Y)
    }

    // Dãy nhà ống bên kia đường
    const pastel = ['#f2d27a', '#a8d8c8', '#f4b8a8', '#b8cfe8', '#efe6d2', '#f0c090', '#c8d8a0', '#e8a8b8']
    const shutters = ['#3f7d5a', '#2f6b8a', '#8a4b3a', '']
    const signs = ['#c8372d', '#1f5fa8', '#e0a526', '#2f8f5b', '#d4553a', '#6a3fa0']
    for (let x = -6; x < SCENE_W + 6; ) {
      const w = 22 + Math.floor(r() * 18)
      const h = 30 + Math.floor(r() * 34)
      const base = pick(r, pastel)
      const color = o(base)
      const trim = o(mix(base, '#000000', 0.25))
      const shutter = pick(r, shutters)
      const top = STREET_Y - h
      const floors = Math.max(1, Math.floor((h - 14) / 11))
      const balcony = r() < 0.55
      const tank = r() < 0.4
      const shopOpen = this.time === 'morning' ? r() < 0.6 : r() < 0.85
      const sign = pick(r, signs)
      const awning = r() < 0.5 ? pick(r, ['#d9534f', '#3f7d5a', '#2f5fa8', '#e6b03a']) : ''

      this.rect(ctx, x, top, w, h, color)
      this.rect(ctx, x + w - 1, top, 1, h, trim)
      this.rect(ctx, x - 1, top - 2, w + 2, 2, trim)
      if (tank) {
        this.rect(ctx, x + w - 10, top - 8, 7, 5, o('#c9ced3'))
        this.rect(ctx, x + w - 10, top - 8, 7, 1, o('#e6eaee'))
        this.rect(ctx, x + w - 9, top - 3, 1, 1, trim)
        this.rect(ctx, x + w - 5, top - 3, 1, 1, trim)
      } else if (r() < 0.4) {
        this.rect(ctx, x + 4, top - 7, 1, 5, trim) // ăng-ten
        this.rect(ctx, x + 2, top - 6, 5, 1, trim)
      }

      const cols = w >= 32 ? 3 : 2
      const gap = Math.floor((w - cols * 5) / (cols + 1))
      for (let f = 0; f < floors; f++) {
        const fy = top + 3 + f * 11
        if (fy + 8 > STREET_Y - 14) break
        for (let c = 0; c < cols; c++) {
          const wx = x + gap + c * (5 + gap)
          const lit = r() < p.lights
          this.rect(ctx, wx, fy, 5, 6, lit ? '#ffd27a' : o('#3b4a5a'))
          if (!lit) this.rect(ctx, wx, fy, 1, 3, o('#8fa6b8'))
          if (shutter) {
            this.rect(ctx, wx - 1, fy, 1, 6, o(shutter))
            this.rect(ctx, wx + 5, fy, 1, 6, o(shutter))
          }
        }
        if (balcony) {
          this.rect(ctx, x + 1, fy + 7, w - 2, 1, trim)
          for (let bx = x + 1; bx < x + w - 1; bx += 2) this.rect(ctx, bx, fy + 8, 1, 2, trim)
          for (let i = 0; i < 3; i++) {
            if (r() < 0.6) this.disc(ctx, x + 3 + Math.floor(r() * (w - 6)), fy + 6, 1, o(pick(r, ['#4f8a3c', '#6aa84f', '#e05a7a'])))
            else r()
          }
        }
      }

      // Tầng trệt: biển hiệu + mái hiên + cửa hàng
      const gy = STREET_Y - 14
      this.rect(ctx, x + 2, gy, w - 4, 4, o(sign))
      for (let i = 0; i < w - 8; i += 2) {
        if (r() < 0.65) this.rect(ctx, x + 4 + i, gy + 1, 1, 2, o('#f6efe0'))
      }
      if (awning) {
        for (let i = 0; i < w - 2; i++) {
          this.rect(ctx, x + 1 + i, gy + 4, 1, 2, o(Math.floor(i / 3) % 2 ? '#f4efe6' : awning))
        }
      }
      const doorY = gy + (awning ? 6 : 4)
      if (shopOpen) {
        this.rect(ctx, x + 3, doorY, w - 6, STREET_Y - doorY, night ? '#6a4a30' : o('#2a211d'))
        if (night) this.rect(ctx, x + 3, doorY, w - 6, 1, '#e9b872')
        for (let i = 0; i < 4; i++) {
          this.rect(ctx, x + 4 + Math.floor(r() * (w - 9)), STREET_Y - 3 - Math.floor(r() * 3), 2, 2, o(pick(r, ['#e6b03a', '#d9534f', '#6aa84f', '#f2f0ea'])))
        }
      } else {
        // Cửa cuốn còn đóng (sáng sớm chưa mở hàng)
        this.rect(ctx, x + 3, doorY, w - 6, STREET_Y - doorY, o('#9aa0a6'))
        for (let yy = doorY + 1; yy < STREET_Y; yy += 2) this.rect(ctx, x + 3, yy, w - 6, 1, o('#80868c'))
        for (let i = 0; i < 4; i++) r()
      }
      x += w
    }

    if (this.weather === 'mist') {
      ctx.fillStyle = 'rgba(236,238,240,0.22)'
      ctx.fillRect(0, 0, SCENE_W, STREET_Y)
    }

    // Vỉa hè + lòng đường
    this.rect(ctx, 0, STREET_Y, SCENE_W, 4, o('#b8b1a6'))
    for (let x = 2; x < SCENE_W; x += 6) this.rect(ctx, x, STREET_Y, 1, 4, o('#a39c91'))
    this.rect(ctx, 0, STREET_Y + 4, SCENE_W, 1, o('#8d877e'))
    this.rect(ctx, 0, STREET_Y + 5, SCENE_W, SILL_Y - STREET_Y - 5, this.weather === 'rain' ? o('#4c4e56') : o('#5c5d63'))
    for (let x = 0; x < SCENE_W; x += 12) this.rect(ctx, x, 109, 6, 1, o('#cfcac0'))
    if (this.weather === 'rain') {
      // Mặt đường ướt phản chiếu ánh đèn/biển hiệu
      for (let x = 0; x < SCENE_W; x += 3) this.rect(ctx, x, 111 + (x % 2), 2, 1, o('#7d8594'))
    }

    // Quán trà đá vỉa hè dưới gốc cây: bàn thấp + ghế nhựa
    this.rect(ctx, 58, 99, 14, 2, o('#3a6fb8'))
    this.rect(ctx, 59, 101, 1, 3, o('#2f5fa0'))
    this.rect(ctx, 70, 101, 1, 3, o('#2f5fa0'))
    this.rect(ctx, 62, 97, 2, 2, o('#e8e4dc'))
    this.rect(ctx, 66, 97, 2, 2, o('#e8e4dc'))
    for (const [sx, sc] of [
      [50, '#d9443a'],
      [76, '#2f6fc0'],
      [86, '#d9443a'],
    ] as const) {
      this.rect(ctx, sx, 101, 4, 1, o(sc))
      this.rect(ctx, sx, 102, 1, 2, o(sc))
      this.rect(ctx, sx + 3, 102, 1, 2, o(sc))
    }
    if (this.weather !== 'rain') {
      // Bác ngồi uống trà
      this.rect(ctx, 77, 95, 3, 6, o('#f2f0ea'))
      this.rect(ctx, 77, 92, 3, 3, o('#c9946f'))
      this.rect(ctx, 76, 91, 5, 1, o('#3a3a44'))
      this.rect(ctx, 79, 101, 3, 1, o('#3f4a5c'))
    }

    // Cây sao đen bên trái
    const trunk = o('#5a3f2e')
    this.rect(ctx, 26, 56, 4, 48, trunk)
    this.rect(ctx, 30, 62, 8, 2, trunk)
    this.rect(ctx, 18, 68, 8, 2, trunk)
    const leaves: [number, number, number, string][] = [
      [14, 30, 15, '#3d6b3a'],
      [40, 22, 13, '#3d6b3a'],
      [56, 38, 10, '#3d6b3a'],
      [4, 50, 12, '#3d6b3a'],
      [30, 46, 13, '#4a7a40'],
      [12, 26, 9, '#58894a'],
      [36, 18, 8, '#58894a'],
      [52, 32, 6, '#58894a'],
      [8, 22, 4, '#7fae5c'],
      [32, 12, 4, '#7fae5c'],
      [26, 40, 5, '#58894a'],
    ]
    for (const [cx, cy, rad, col] of leaves) this.disc(ctx, cx, cy, rad, o(col))

    // Cột điện + mớ dây điện rối
    const pole = o('#4a4a50')
    const wire = o('#26262b')
    this.rect(ctx, 158, 30, 3, 74, pole)
    this.rect(ctx, 150, 36, 19, 2, pole)
    this.rect(ctx, 152, 44, 15, 2, pole)
    this.rect(ctx, 161, 32, 8, 1, pole)
    this.rect(ctx, 168, 33, 3, 2, night ? '#ffe3a1' : o('#d8d4cc'))
    const sag = (x0: number, y0: number, x1: number, y1: number, depth: number) => {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
        const k = (x - x0) / (x1 - x0)
        this.rect(ctx, x, y0 + (y1 - y0) * k + depth * 4 * k * (1 - k), 1, 1, wire)
      }
    }
    sag(0, 30, 151, 37, 10)
    sag(0, 40, 153, 45, 8)
    sag(167, 37, SCENE_W, 26, 12)
    sag(166, 45, SCENE_W, 42, 9)
    sag(0, 46, 152, 47, 14)
    for (let i = 0; i < 26; i++) this.rect(ctx, 150 + Math.floor(r() * 20), 46 + Math.floor(r() * 8), 2, 1, wire)
  }

  private drawBike(b: Bike, t: number) {
    const ctx = this.ctx
    const o = this.o
    const W = 14
    const x0 = Math.round(b.x)
    const bump = (t * 2 + b.phase) % 1 < 0.12 ? 1 : 0
    const top = b.lane - 14 - bump
    const px = (dx: number, w: number) => (b.dir > 0 ? x0 + dx : x0 + (W - dx - w))
    const r = (dx: number, dy: number, w: number, h: number, c: string) => this.rect(ctx, px(dx, w), top + dy, w, h, c)
    const rainy = this.weather === 'rain'

    r(1, 11 + bump, 3, 3, o('#1c1c20'))
    r(10, 11 + bump, 3, 3, o('#1c1c20'))
    r(2, 12 + bump, 1, 1, o('#8a8a90'))
    r(11, 12 + bump, 1, 1, o('#8a8a90'))
    r(3, 9, 8, 3, o(b.color))
    r(9, 8, 2, 2, o(b.color))
    r(11, 6, 1, 5, o('#333338'))
    r(3, 8, 5, 1, o('#2b2b2b'))

    if (b.cargo === 'flowers') {
      r(-2, 5, 5, 4, o('#9a6a3a'))
      for (let i = 0; i < 5; i++) r(-2 + i, 3 + (i % 2), 1, 2, o(['#f07aa0', '#f2d24a', '#ffffff', '#f07aa0', '#e05a5a'][i]))
    } else if (b.cargo === 'boxes') {
      r(-2, 2, 5, 7, o('#c9a36a'))
      r(-2, 5, 5, 1, o('#a8844e'))
    }

    if (b.passenger) {
      r(3, 4, 3, 5, o(rainy ? b.shirt : b.passenger.shirt))
      r(3, 1, 3, 3, o(b.passenger.helmet))
    }
    if (rainy) {
      // Áo mưa cánh dơi trùm cả xe
      r(4, 3, 8, 7, o(b.shirt))
      r(3, 9, 10, 1, o(mix(b.shirt, '#000000', 0.2)))
    } else {
      r(6, 3, 3, 6, o(b.shirt))
      r(8, 5, 3, 1, o(b.shirt))
      r(7, 8, 2, 2, o('#3a3a4a'))
    }
    r(6, 0, 3, 3, o(b.helmet))
    r(8, 2, 1, 1, o('#c9946f'))

    if (this.time === 'night' || rainy) {
      r(12, 7, 1, 1, '#fff2b0')
      r(0, 9, 1, 1, '#ff4a3a')
      ctx.fillStyle = 'rgba(255,240,180,0.16)'
      const hx = px(13, 1)
      ctx.beginPath()
      ctx.moveTo(hx, top + 7)
      ctx.lineTo(hx + b.dir * 16, top + 3)
      ctx.lineTo(hx + b.dir * 16, top + 14)
      ctx.fill()
    }
  }

  private drawWalker(w: Walker, t: number) {
    const o = this.o
    const W = 13
    const x0 = Math.round(w.x)
    const top = STREET_Y + 4 - 12
    const step = Math.floor(t * 4 + x0) % 2
    const px = (dx: number, rw: number) => (w.dir > 0 ? x0 + dx : x0 + (W - dx - rw))
    const r = (dx: number, dy: number, rw: number, rh: number, c: string) => this.rect(this.ctx, px(dx, rw), top + dy, rw, rh, c)

    if (w.hat) {
      r(5, 0, 3, 1, o('#e8d9a8'))
      r(4, 1, 5, 1, o('#e8d9a8'))
      r(3, 2, 7, 1, o('#d9c590'))
    } else {
      r(5, 1, 3, 2, o('#2b1d18'))
    }
    r(5, 3, 3, 2, o('#c9946f'))
    r(5, 5, 3, 4, o(w.shirt))
    if (step) {
      r(5, 9, 1, 3, o(w.pants))
      r(7, 9, 1, 3, o(w.pants))
    } else {
      r(4, 9, 1, 3, o(w.pants))
      r(8, 9, 1, 3, o(w.pants))
    }
    if (w.baskets) {
      // Đòn gánh + 2 thúng hoa quả
      r(0, 5, 13, 1, o('#8a6a45'))
      r(0, 6, 1, 2, o('#8a6a45'))
      r(12, 6, 1, 2, o('#8a6a45'))
      r(-1, 8 + step, 3, 3, o('#a07040'))
      r(11, 8 + (1 - step), 3, 3, o('#a07040'))
      r(-1, 7 + step, 3, 1, o('#e6b03a'))
      r(11, 7 + (1 - step), 3, 1, o('#6aa84f'))
    }
  }

  // Phần tĩnh trong quán: khung cửa, bàn gỗ, chậu cây, sổ tay, laptop, ghế
  private drawInteriorStatic() {
    const ctx = this.interiorCache.getContext('2d')!
    ctx.clearRect(0, 0, SCENE_W, SCENE_H)
    const n = this.n
    const r = mulberry32(11)

    const wood = n('#6b4430')
    const woodHi = n('#8a5a3e')
    this.rect(ctx, 0, 0, SCENE_W, 4, wood)
    this.rect(ctx, 0, 4, SCENE_W, 1, woodHi)
    this.rect(ctx, 0, 0, 4, SILL_Y, wood)
    this.rect(ctx, SCENE_W - 4, 0, 4, SILL_Y, wood)
    for (const mx of [104, 212]) {
      this.rect(ctx, mx, 0, 4, SILL_Y, wood)
      this.rect(ctx, mx, 0, 1, SILL_Y, woodHi)
    }
    this.rect(ctx, 0, SILL_Y, SCENE_W, 4, n('#9a6848'))
    this.rect(ctx, 0, SILL_Y, SCENE_W, 1, n('#b88560'))

    // Mặt bàn gỗ sát cửa sổ
    this.rect(ctx, 0, TABLE_Y, SCENE_W, 3, n('#c28a5a'))
    this.rect(ctx, 0, TABLE_Y, SCENE_W, 1, n('#d9a472'))
    // Mặt trước quầy: ván gỗ chạy xuống tới đáy khung, tối dần về phía dưới
    const front = ['#8a5636', '#804f32', '#76492e', '#6a4029']
    const bandH = Math.ceil((SCENE_H - TABLE_Y - 3) / front.length)
    front.forEach((c, i) => this.rect(ctx, 0, TABLE_Y + 3 + i * bandH, SCENE_W, bandH, n(c)))
    this.rect(ctx, 0, TABLE_Y + 3, SCENE_W, 1, n('#5e3a26'))
    for (let x = 20; x < SCENE_W; x += 40) this.rect(ctx, x, TABLE_Y + 4, 1, SCENE_H, n('#5e3a26'))
    for (let i = 0; i < 24; i++) {
      this.rect(ctx, Math.floor(r() * SCENE_W), TABLE_Y + 6 + Math.floor(r() * 54), 6 + Math.floor(r() * 18), 1, n('#6e432b'))
    }

    // Chậu cây nhỏ
    this.rect(ctx, 14, 106, 14, 12, n('#c0673f'))
    this.rect(ctx, 13, 104, 16, 2, n('#d27a4f'))
    this.rect(ctx, 25, 106, 3, 12, n('#a8573a'))
    for (const [cx, cy, rad, col] of [
      [18, 96, 6, '#3f7a44'],
      [26, 92, 5, '#4f8a4c'],
      [11, 90, 5, '#4f8a4c'],
      [21, 86, 4, '#5f9a58'],
      [15, 99, 3, '#6aa860'],
    ] as const) {
      this.disc(ctx, cx, cy, rad, n(col))
    }

    // Sổ tay + bút
    this.rect(ctx, 42, 115, 34, 3, n('#f2ead8'))
    this.rect(ctx, 42, 117, 34, 1, n('#d8cdb4'))
    this.rect(ctx, 58, 115, 1, 3, n('#c9bfa8'))
    this.rect(ctx, 66, 113, 16, 1, n('#2d4b8a'))
    this.rect(ctx, 81, 113, 2, 1, n('#c9a040'))

    // Laptop (nhìn từ phía sau màn hình)
    this.rect(ctx, 252, 94, 32, 23, n('#c9ced4'))
    this.rect(ctx, 252, 94, 32, 1, n('#e3e6ea'))
    this.rect(ctx, 283, 94, 1, 23, n('#aab0b7'))
    this.disc(ctx, 268, 104, 2, n('#e3e6ea'))
    this.rect(ctx, 246, 117, 42, 1, n('#9aa0a8'))

  }

  private drawCoffee(t: number) {
    const ctx = this.ctx
    const n = this.n

    // Ly cà phê sữa + phin nhôm
    this.rect(ctx, 118, 117, 20, 1, n('#e9e4da'))
    this.rect(ctx, 122, 105, 12, 12, 'rgba(235,240,245,0.35)')
    this.rect(ctx, 123, 108, 10, 5, n('#3b2418'))
    this.rect(ctx, 123, 113, 10, 4, n('#efe0c0'))
    this.rect(ctx, 122, 105, 1, 12, n('#e6e9ec'))
    this.rect(ctx, 133, 105, 1, 12, n('#c8cdd2'))
    this.rect(ctx, 120, 103, 16, 2, n('#aeb2b7'))
    this.rect(ctx, 123, 96, 10, 7, n('#c7cbd0'))
    this.rect(ctx, 124, 96, 1, 7, n('#e6e9ec'))
    this.rect(ctx, 131, 96, 1, 7, n('#9a9ea4'))
    this.rect(ctx, 122, 94, 12, 2, n('#b3b7bc'))
    this.rect(ctx, 127, 92, 2, 2, n('#8d9095'))

    // Giọt cà phê nhỏ xuống
    const k = (t % 1.4) / 0.3
    if (k < 1) this.rect(ctx, 128, 105 + Math.floor(k * 3), 1, 1, n('#3b2418'))

    // Hơi nước bốc lên
    const cold = this.weather !== 'clear' || this.time === 'morning'
    for (let i = 0; i < 3; i++) {
      for (let s = 0; s < 12; s++) {
        const y = 90 - s * 2 - Math.floor((t * 5 + i * 1.3) % 2)
        const x = 128 + (i - 1) * 2 + Math.round(Math.sin(s * 0.55 + t * 1.4 + i * 2.1) * 2)
        const a = (1 - s / 12) * (cold ? 0.4 : 0.25)
        this.rect(ctx, x, y, 1, 1, `rgba(255,255,255,${a.toFixed(2)})`)
      }
    }
    this.rect(ctx, 138, 116, 6, 1, n('#c9cdd2'))
  }

  private drawPerson(t: number) {
    const ctx = this.ctx
    const n = this.n
    const breathe = Math.sin((t * Math.PI * 2) / 4.5) > 0.2 ? 1 : 0
    // Gật gù theo nhạc khi đang phát
    const nod = this.musicOn && Math.sin(t * Math.PI * 2.5) > 0.55 ? 1 : 0
    const cx = 228
    const hy = 78 + nod - breathe

    // Áo len
    const sweater = n('#d8a24a')
    const sweaterDark = n('#b98434')
    const rim = this.time === 'night' ? n('#e2b560') : n('#f6d28c')
    for (let y = 98 - breathe; y < SCENE_H; y++) {
      const d = y - (98 - breathe)
      const half = d === 0 ? 18 : d === 1 ? 22 : d === 2 ? 24 : Math.min(32, 26 + Math.floor(d / 8))
      this.rect(ctx, cx - half, y, half * 2, 1, sweater)
      this.rect(ctx, cx - half, y, 3, 1, sweaterDark)
      if (d < 3) this.rect(ctx, cx - half, y, half * 2, 1, d === 0 ? rim : sweater)
    }
    this.rect(ctx, cx - 31, 112 - breathe, 4, 16, sweaterDark)
    this.rect(ctx, cx + 27, 112 - breathe, 4, 16, sweaterDark)
    this.rect(ctx, cx - 1, 104 - breathe, 1, 30, sweaterDark)

    // Cổ + tóc + búi tóc
    this.rect(ctx, cx - 4, 89 - breathe, 8, 10, n('#d9a57f'))
    this.rect(ctx, cx - 4, 89 - breathe, 8, 2, n('#b9845f'))
    const hair = n('#2b1d18')
    this.disc(ctx, cx, hy, 12, hair)
    this.disc(ctx, cx, hy - 15, 5, hair)
    this.rect(ctx, cx - 4, hy - 11, 8, 1, n('#c9574a'))
    this.rect(ctx, cx - 7, hy - 9, 4, 1, n('#4a342b'))
    this.rect(ctx, cx - 9, hy - 6, 2, 3, n('#4a342b'))
    this.rect(ctx, cx + 5, hy + 10, 1, 4, hair)
    this.rect(ctx, cx - 6, hy + 10, 1, 3, hair)

    // Tai nghe chụp tai
    const band = n('#ece6dc')
    for (let a = Math.PI * 1.08; a <= Math.PI * 1.92; a += 0.08) {
      this.rect(ctx, cx + Math.cos(a) * 13, hy - 1 + Math.sin(a) * 13, 2, 2, band)
    }
    this.rect(ctx, cx - 16, hy - 3, 5, 11, band)
    this.rect(ctx, cx + 11, hy - 3, 5, 11, band)
    this.rect(ctx, cx - 15, hy - 2, 1, 9, n('#c9c1b5'))
    this.rect(ctx, cx + 14, hy - 2, 1, 9, n('#c9c1b5'))
    if (this.musicOn) this.rect(ctx, cx + 13, hy + 5, 1, 1, '#7cf0a8')

    // Lưng ghế gỗ — nằm trước người ngồi nên vẽ sau cùng
    this.rect(ctx, cx - 32, 146, 64, 4, n('#5b3a28'))
    this.rect(ctx, cx - 32, 146, 64, 1, n('#7a5038'))
    for (const dx of [-26, -12, 2, 16]) {
      this.rect(ctx, cx + dx, 150, 8, SCENE_H - 150, n('#6b4530'))
      this.rect(ctx, cx + dx, 150, 1, SCENE_H - 150, n('#7a5038'))
    }
  }

  // Ánh sáng cộng thêm (đèn thả, màn hình, nắng xuyên cửa) + viền tối
  private drawLights() {
    const ctx = this.ctx
    const p = this.palette
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    if (this.time === 'morning' && this.weather === 'clear') {
      ctx.fillStyle = 'rgba(255,236,200,0.06)'
      for (const [x, w] of [
        [30, 40],
        [140, 50],
      ]) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + w, 0)
        ctx.lineTo(x + w + 60, SCENE_H)
        ctx.lineTo(x + 60, SCENE_H)
        ctx.fill()
      }
    }

    const lampOn = p.lamp || this.weather === 'rain'
    const n = this.n
    this.rect(ctx, 62, 0, 1, 14, n('#222222'))
    ctx.globalCompositeOperation = 'source-over'
    for (let i = 0; i < 6; i++) this.rect(ctx, 59 - i, 14 + i, 7 + i * 2, 1, n('#2f4a3f'))
    this.rect(ctx, 60, 20, 5, 1, lampOn ? '#ffe7a8' : n('#e8e2d0'))
    ctx.globalCompositeOperation = 'lighter'

    if (lampOn) {
      const g = ctx.createRadialGradient(62, 24, 2, 62, 24, 110)
      g.addColorStop(0, 'rgba(255,190,110,0.32)')
      g.addColorStop(1, 'rgba(255,190,110,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, SCENE_W, SCENE_H)
    }
    if (this.time === 'night') {
      const g = ctx.createRadialGradient(262, 104, 2, 262, 104, 46)
      g.addColorStop(0, 'rgba(120,170,255,0.22)')
      g.addColorStop(1, 'rgba(120,170,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(200, 50, 120, 110)
    }
    ctx.restore()

    const v = ctx.createRadialGradient(SCENE_W / 2, SCENE_H / 2, 90, SCENE_W / 2, SCENE_H / 2, 200)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, 'rgba(10,6,4,0.35)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, SCENE_W, SCENE_H)
  }
}
