// Cảnh pixel của trang /chill: góc quán cà phê nhìn qua cửa sổ ra phố Hà Nội.
//
// Art tĩnh là ảnh AI (public/chill/scenes/, tạo bằng Nano Banana 2 qua Figma
// Weave): mỗi điểm đến 3 bản phố sáng/chiều/đêm + 1 lớp nội thất dùng chung
// đã cắt trong suốt ô kính. Đổi điểm đến / giờ thì ảnh phố mờ dần sang ảnh mới.
// Mọi thứ chuyển động vẫn vẽ bằng canvas ở lưới 320×180 (mỗi "pixel" = 2px
// thật trên canvas 640×360), rồi CSS phóng to bằng `image-rendering: pixelated`.
//
// Thứ tự lớp (xa → gần):
//   ảnh phố → chim → người đi bộ → xe máy → mưa/sương → kính cửa
//   → ảnh nội thất (đã tô màu theo giờ) → hơi cà phê, nốt nhạc → ánh đèn

import {DESTINATIONS, type Destination} from './destinations'

export type TimeOfDay = 'morning' | 'afternoon' | 'night'
export type Weather = 'clear' | 'rain' | 'mist'

export const SCENE_W = 320
export const SCENE_H = 180
const SCALE = 2

// Vị trí đo từ ảnh nội thất (lưới 320×180)
const PANES = [
  {x: 25, w: 76},
  {x: 122, w: 77},
  {x: 219, w: 76},
]
const GLASS = {x: 24, y: 15, w: 272, h: 109}
const STREET_IMG = {x: 20, y: 6, w: 280, h: 119}
const SIDEWALK_Y = 113 // chân người đi bộ
const FAR_LANE = 119 // đáy bánh xe làn xa
const NEAR_LANE = 124 // làn gần (bị bậu cửa che mép dưới)
const PHIN = {x: 127, y: 113}
const LAMP = {x: 63, y: 42}
const LAPTOP = {x: 235, y: 119}
const HEADPHONES = {x: 256, y: 94}

const FADE_SECONDS = 1.2
const INTERIOR_SRC = '/chill/scenes/interior.webp'

// Màu nhân cho sprite ngoài phố để hợp ánh sáng của ảnh nền
const SPRITE_TINT: Record<TimeOfDay, string | null> = {
  morning: null,
  afternoon: '#ffd6b4',
  night: '#5a60a0',
}

// Phủ lên lớp nội thất (chỉ tô phần không trong suốt)
const INTERIOR_WASH: Record<TimeOfDay, string | null> = {
  morning: null,
  afternoon: 'rgba(255,140,70,0.14)',
  night: 'rgba(18,16,48,0.58)',
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

const pick = <T>(rng: () => number, list: T[]) => list[Math.floor(rng() * list.length)]

function loadImage(src: string, onLoad: () => void) {
  const img = new Image()
  img.decoding = 'async'
  img.onload = onLoad
  img.src = src
  return img
}

const ready = (img: HTMLImageElement | null): img is HTMLImageElement => !!img && img.complete && img.naturalWidth > 0

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

type Drop = {x: number; y: number; len: number; speed: number}
type GlassDrop = {x: number; y: number; r: number; v: number}
type Note = {x: number; y: number; age: number; drift: number}

const BIKE_COLORS = ['#c7362f', '#2f5fa8', '#e8e4dc', '#1f1f24', '#6f8f3a', '#d98a2b']
const SHIRTS = ['#f2f0ea', '#2f5fa8', '#d9534f', '#e6b03a', '#3f7d5a', '#7a5ca8', '#5a6470']
const HELMETS = ['#f2c230', '#e8e4dc', '#c7362f', '#2f5fa8', '#1f1f24', '#e87aa0']
const PONCHOS = ['#3b82c4', '#e8c33a', '#d9534f', '#58a55c', '#8a5cc4']

export class ChillScene {
  private ctx: CanvasRenderingContext2D
  private time: TimeOfDay = 'morning'
  private weather: Weather = 'clear'
  private destination: Destination = DESTINATIONS[0]
  private tilt = 0
  private laneShift = 0
  private musicOn = false
  private tint: string | null = null

  private images = new Map<string, HTMLImageElement>()
  private street: HTMLImageElement
  private prevStreet: HTMLImageElement | null = null
  private fade = 1
  private interior: HTMLImageElement
  private interiorLayer: HTMLCanvasElement
  private dirty = true

  private rng = Math.random
  private bikes: Bike[] = []
  private walkers: Walker[] = []
  private rain: Drop[] = []
  private glass: GlassDrop[] = []
  private notes: Note[] = []
  private birds: {x: number; y: number; p: number} | null = null
  private nextBike = 0.5
  private nextWalker = 2
  private nextBirds = 6
  private nextNote = 0
  private last = 0
  private clock = 0

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = SCENE_W * SCALE
    canvas.height = SCENE_H * SCALE
    this.ctx = canvas.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false

    this.street = this.image(this.destination.streets[this.time])
    this.interior = loadImage(INTERIOR_SRC, () => (this.dirty = true))
    this.interiorLayer = document.createElement('canvas')
    this.interiorLayer.width = SCENE_W * SCALE
    this.interiorLayer.height = SCENE_H * SCALE

    for (let i = 0; i < 140; i++) {
      this.rain.push({
        x: GLASS.x + Math.random() * (GLASS.w + 40),
        y: GLASS.y + Math.random() * GLASS.h,
        len: 3 + Math.floor(Math.random() * 3),
        speed: 150 + Math.random() * 60,
      })
    }
    for (let i = 0; i < 36; i++) this.glass.push(this.randomGlassDrop())
    // Mở trang ra đã có sẵn vài chiếc xe trên đường, không phải chờ
    for (let i = 0; i < 3; i++) this.spawnBike(50 + i * 90)
    this.spawnWalker(140)
  }

  setAtmosphere(time: TimeOfDay, weather: Weather, destination = this.destination) {
    if (time === this.time && weather === this.weather && destination.id === this.destination.id && !this.dirty) return
    const next = this.image(destination.streets[time])
    if (next !== this.street) {
      this.prevStreet = ready(this.street) ? this.street : this.prevStreet
      this.street = next
      this.fade = 0
    }
    this.time = time
    this.weather = weather
    this.destination = destination
    this.tilt = destination.tilt ?? 0
    this.laneShift = destination.laneShift ?? 0
    this.dirty = true
  }

  // Cao độ mặt đường tại x (cảnh phố dốc thì làn xe nghiêng theo)
  private groundY(base: number, x: number, shift = 0) {
    return Math.round(base + shift + this.tilt * (x - SCENE_W / 2))
  }

  // Tải trước ảnh của 1 điểm đến (vd điểm kế tiếp) để lúc chuyển không bị trống
  preload(destination: Destination) {
    for (const src of Object.values(destination.streets)) this.image(src)
  }

  private image(src: string) {
    let img = this.images.get(src)
    if (!img) {
      img = loadImage(src, () => {})
      this.images.set(src, img)
    }
    return img
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
    this.tint = combine(SPRITE_TINT[this.time], this.weather === 'rain' ? '#aab3be' : null)

    // Lớp nội thất tô sẵn màu theo giờ/thời tiết, chỉ vẽ lại khi đổi
    const ctx = this.interiorLayer.getContext('2d')!
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, this.interiorLayer.width, this.interiorLayer.height)
    if (!this.interior.complete || !this.interior.naturalWidth) return
    ctx.drawImage(this.interior, 0, 0, this.interiorLayer.width, this.interiorLayer.height)
    ctx.globalCompositeOperation = 'source-atop'
    const wash = INTERIOR_WASH[this.time]
    if (wash) {
      ctx.fillStyle = wash
      ctx.fillRect(0, 0, this.interiorLayer.width, this.interiorLayer.height)
    }
    if (this.weather === 'rain') {
      ctx.fillStyle = 'rgba(40,52,72,0.18)'
      ctx.fillRect(0, 0, this.interiorLayer.width, this.interiorLayer.height)
    }
  }

  private randomGlassDrop(top = false): GlassDrop {
    const pane = PANES[Math.floor(Math.random() * PANES.length)]
    return {
      x: pane.x + 1 + Math.random() * (pane.w - 2),
      y: GLASS.y + 2 + Math.random() * (top ? 30 : GLASS.h - 6),
      r: Math.random() < 0.3 ? 2 : 1,
      v: 0,
    }
  }

  private update(dt: number) {
    const rainy = this.weather === 'rain'
    // Chỉ bắt đầu mờ dần khi ảnh mới đã tải xong
    if (this.fade < 1 && ready(this.street)) {
      this.fade = Math.min(1, this.fade + dt / FADE_SECONDS)
      if (this.fade === 1) this.prevStreet = null
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
      this.birds = {x: GLASS.x - 10, y: 20 + this.rng() * 10, p: 0}
      this.nextBirds = 14 + this.rng() * 20
    }
    if (this.birds) {
      this.birds.x += dt * 16
      this.birds.p += dt
      if (this.birds.x > GLASS.x + GLASS.w + 10) this.birds = null
    }

    // Nốt nhạc bay lên từ tai nghe khi đang phát nhạc
    this.nextNote -= dt
    if (this.musicOn && this.nextNote <= 0) {
      this.notes.push({x: HEADPHONES.x, y: HEADPHONES.y, age: 0, drift: this.rng() < 0.5 ? -1 : 1})
      this.nextNote = 1.6 + this.rng() * 1.4
    }
    for (const n of this.notes) {
      n.age += dt
      n.y -= dt * 7
      n.x += Math.sin(n.age * 2.5) * dt * 4 + n.drift * dt * 2
    }
    this.notes = this.notes.filter((n) => n.age < 3)

    if (rainy) {
      for (const d of this.rain) {
        d.y += d.speed * dt
        d.x -= d.speed * dt * 0.25
        if (d.y > GLASS.y + GLASS.h) {
          d.y = GLASS.y - d.len
          d.x = GLASS.x + this.rng() * (GLASS.w + 40)
        }
      }
      for (const g of this.glass) {
        // Thỉnh thoảng 1 giọt trên kính trượt xuống
        if (g.v === 0 && this.rng() < dt * 0.05) g.v = 8 + this.rng() * 20
        if (g.v > 0) {
          g.y += g.v * dt
          if (g.y > GLASS.y + GLASS.h - 3) Object.assign(g, this.randomGlassDrop(true))
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

  private rect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.fillStyle = color
    this.ctx.fillRect(Math.round(x), Math.round(y), w, h)
  }

  private disc(cx: number, cy: number, r: number, color: string) {
    this.ctx.fillStyle = color
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3)
      this.ctx.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2 + 1, 1)
    }
  }

  private o = (hex: string) => multiply(hex, this.tint)

  private draw(t: number) {
    const ctx = this.ctx
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#1a1520'
    ctx.fillRect(0, 0, SCENE_W, SCENE_H)

    ctx.save()
    ctx.beginPath()
    ctx.rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h)
    ctx.clip()

    if (ready(this.prevStreet) && this.fade < 1) {
      ctx.drawImage(this.prevStreet, STREET_IMG.x, STREET_IMG.y, STREET_IMG.w, STREET_IMG.h)
    }
    if (ready(this.street)) {
      ctx.globalAlpha = this.prevStreet ? this.fade : 1
      ctx.drawImage(this.street, STREET_IMG.x, STREET_IMG.y, STREET_IMG.w, STREET_IMG.h)
      ctx.globalAlpha = 1
    }
    if (this.birds) this.drawBirds(this.birds)
    for (const w of this.walkers) this.drawWalker(w, t)
    for (const b of this.bikes) this.drawBike(b, t)

    if (this.weather === 'rain') {
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = this.time === 'night' ? '#8a90a8' : '#9ea6b2'
      ctx.fillRect(GLASS.x, GLASS.y, GLASS.w, GLASS.h)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgba(210,222,235,0.45)'
      for (const d of this.rain) {
        for (let k = 0; k < d.len; k++) ctx.fillRect(Math.round(d.x + k * 0.25), Math.round(d.y + k), 1, 1)
      }
      // Hạt mưa bắn trên mặt đường
      ctx.fillStyle = 'rgba(220,230,240,0.5)'
      for (let i = 0; i < 10; i++) {
        const x = GLASS.x + (Math.floor(((t * 97 + i * 37) % 1) * GLASS.w + i * 31) % GLASS.w)
        ctx.fillRect(x, FAR_LANE - 4 + (i % 8), 1, 1)
      }
    } else if (this.weather === 'mist') {
      ctx.fillStyle = this.time === 'night' ? 'rgba(150,160,190,0.35)' : 'rgba(236,238,240,0.5)'
      ctx.fillRect(GLASS.x, GLASS.y, GLASS.w, GLASS.h)
    }

    // Kính cửa: vệt phản chiếu chéo + giọt nước khi mưa
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    for (const pane of PANES) {
      ctx.beginPath()
      ctx.moveTo(pane.x + 20, GLASS.y)
      ctx.lineTo(pane.x + 34, GLASS.y)
      ctx.lineTo(pane.x + 4, GLASS.y + GLASS.h)
      ctx.lineTo(pane.x - 10, GLASS.y + GLASS.h)
      ctx.fill()
    }
    if (this.weather === 'rain') {
      for (const g of this.glass) {
        if (g.v > 0) this.rect(g.x, g.y - 6, 1, 6, 'rgba(220,235,255,0.18)')
        this.disc(g.x, g.y, g.r - 1, 'rgba(225,238,255,0.55)')
        this.rect(g.x - (g.r - 1), g.y - (g.r - 1), 1, 1, 'rgba(255,255,255,0.8)')
      }
    }
    ctx.restore()

    ctx.drawImage(this.interiorLayer, 0, 0, SCENE_W, SCENE_H)
    this.drawSteam(t)
    this.drawNotes()
    this.drawLights()
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
      this.rect(x, y, 1, 1, col)
      this.rect(x - 2, up ? y - 1 : y + 1, 2, 1, col)
      this.rect(x + 1, up ? y - 1 : y + 1, 2, 1, col)
    }
  }

  private drawBike(b: Bike, t: number) {
    const ctx = this.ctx
    const o = this.o
    const W = 14
    const x0 = Math.round(b.x)
    const bump = (t * 2 + b.phase) % 1 < 0.12 ? 1 : 0
    const top = this.groundY(b.lane, b.x + W / 2, this.laneShift) - 14 - bump
    const px = (dx: number, w: number) => (b.dir > 0 ? x0 + dx : x0 + (W - dx - w))
    const r = (dx: number, dy: number, w: number, h: number, c: string) => this.rect(px(dx, w), top + dy, w, h, c)
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
    const top = this.groundY(SIDEWALK_Y, w.x + W / 2) - 12
    const step = Math.floor(t * 4 + x0) % 2
    const px = (dx: number, rw: number) => (w.dir > 0 ? x0 + dx : x0 + (W - dx - rw))
    const r = (dx: number, dy: number, rw: number, rh: number, c: string) => this.rect(px(dx, rw), top + dy, rw, rh, c)

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

  // Hơi nước bốc lên từ nắp phin
  private drawSteam(t: number) {
    const cold = this.weather !== 'clear' || this.time === 'morning'
    for (let i = 0; i < 3; i++) {
      for (let s = 0; s < 12; s++) {
        const y = PHIN.y - s * 2 - Math.floor((t * 5 + i * 1.3) % 2)
        const x = PHIN.x + (i - 1) * 2 + Math.round(Math.sin(s * 0.55 + t * 1.4 + i * 2.1) * 2)
        const a = (1 - s / 12) * (cold ? 0.4 : 0.25)
        this.rect(x, y, 1, 1, `rgba(255,255,255,${a.toFixed(2)})`)
      }
    }
  }

  // Nốt nhạc pixel (móc đơn) bay lên, mờ dần
  private drawNotes() {
    for (const n of this.notes) {
      const a = Math.max(0, 1 - n.age / 3) * 0.85
      const c = `rgba(255,236,200,${a.toFixed(2)})`
      const x = Math.round(n.x)
      const y = Math.round(n.y)
      this.rect(x, y + 3, 2, 2, c)
      this.rect(x + 1, y, 1, 4, c)
      this.rect(x + 2, y, 1, 1, c)
      this.rect(x + 3, y + 1, 1, 1, c)
    }
  }

  // Ánh sáng cộng thêm (đèn thả, màn hình, nắng xuyên cửa) + viền tối
  private drawLights() {
    const ctx = this.ctx
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    if (this.time === 'morning' && this.weather === 'clear') {
      ctx.fillStyle = 'rgba(255,236,200,0.05)'
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

    const lampOn = this.time !== 'morning' || this.weather === 'rain'
    if (lampOn) {
      const g = ctx.createRadialGradient(LAMP.x, LAMP.y, 1, LAMP.x, LAMP.y, 110)
      g.addColorStop(0, 'rgba(255,190,110,0.38)')
      g.addColorStop(1, 'rgba(255,190,110,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, SCENE_W, SCENE_H)
      this.rect(LAMP.x - 3, LAMP.y - 1, 7, 2, 'rgba(255,231,168,0.9)')
    }
    const screen = this.time === 'night' ? 0.28 : 0.1
    const g = ctx.createRadialGradient(LAPTOP.x, LAPTOP.y, 1, LAPTOP.x, LAPTOP.y, 40)
    g.addColorStop(0, `rgba(130,175,255,${screen})`)
    g.addColorStop(1, 'rgba(130,175,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(LAPTOP.x - 40, LAPTOP.y - 40, 80, 80)
    ctx.restore()

    const v = ctx.createRadialGradient(SCENE_W / 2, SCENE_H / 2, 90, SCENE_W / 2, SCENE_H / 2, 200)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, 'rgba(10,6,4,0.3)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, SCENE_W, SCENE_H)
  }
}
