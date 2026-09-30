// Cảnh pixel của trang /chill: góc quán cà phê nhìn qua cửa sổ ra phố Hà Nội.
//
// Art tĩnh là ảnh AI (public/chill/scenes/, tạo bằng Nano Banana 2 qua Figma
// Weave): mỗi điểm đến 3 bản phố sáng/chiều/đêm + 1 lớp nội thất dùng chung
// đã cắt trong suốt ô kính. Đổi điểm đến / giờ thì ảnh phố mờ dần sang ảnh mới.
// Mọi thứ chuyển động vẫn vẽ bằng canvas ở lưới 320×180 (mỗi "pixel" = 2px
// thật trên canvas 640×360), rồi CSS phóng to bằng `image-rendering: pixelated`.
//
// Xe cộ, người đi bộ, chó ngoài phố là sprite AI (public/chill/sprites.png,
// xem sprites.ts). Nhân vật trong quán là video loop AI (Kling) — gõ phím rồi
// thỉnh thoảng cầm ly cà phê uống; nền xanh ô kính được cắt trên từng khung.
//
// Thứ tự lớp (xa → gần):
//   ảnh phố → chim → người/chó trên vỉa hè → xe làn xa → xe làn gần → mưa/sương
//   → kính cửa → nội thất (video hoặc ảnh tĩnh, tô màu theo giờ) → hơi cà phê,
//   nốt nhạc → ánh đèn

import {DESTINATIONS, type Destination} from './destinations'
import {SPRITES, SPRITE_SRC, type SpriteName} from './sprites'

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
const HEADPHONES = {x: 262, y: 90}

const FADE_SECONDS = 1.2
const INTERIOR_SRC = '/chill/scenes/interior.webp'
const INTERIOR_VIDEO_SRC = '/chill/scenes/interior-loop.mp4'
// Mốc trong video (giây): 0–0.75 và 6.8–hết là gõ phím, giữa là cầm ly uống.
// Khung đầu = khung cuối nên video tự loop liền mạch.
const SIP_START = 0.75
const SIP_END = 6.8

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

type Mover = {
  sprite: SpriteName | 'dog'
  road: boolean // true: chạy dưới lòng đường, false: đi trên vỉa hè
  x: number // tâm theo chiều ngang (lưới 320)
  dir: 1 | -1
  cruise: number // tốc độ mong muốn (px/giây)
  speed: number
  lane: number
  phase: number
  rest: number // chó dừng lại ngó nghiêng (giây còn lại)
}

type Drop = {x: number; y: number; len: number; speed: number}
type GlassDrop = {x: number; y: number; r: number; v: number}
type Note = {x: number; y: number; age: number; drift: number}

const BIKES: SpriteName[] = ['bike-cub', 'bike-vespa', 'bike-flowers', 'bike-boxes', 'bike-duo']
const LIGHTS_OFF = new Set<string>(['cyclist', 'cyclo'])
// Sprite AI vẽ hướng sang TRÁI (còn lại đều hướng sang phải) — lật ngược lại khi vẽ
const FACES_LEFT = new Set<string>(['cyclo'])
const spriteSize = (name: SpriteName) => {
  const [, , w, h] = SPRITES[name]
  return {w: w / SCALE, h: h / SCALE}
}

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
  private atlas: HTMLImageElement
  private atlasTinted: HTMLCanvasElement
  private video: HTMLVideoElement | null = null
  private videoLayer: HTMLCanvasElement
  private videoFrameTime = -1
  private videoReady = false
  private sipping = false
  private idleLoops = 0
  private nextSip = 2 // lần uống đầu tiên đến sớm để người xem thấy
  private paused = false
  private dirty = true

  private rng = Math.random
  private movers: Mover[] = []
  private rain: Drop[] = []
  private glass: GlassDrop[] = []
  private notes: Note[] = []
  private birds: {x: number; y: number; p: number} | null = null
  private nextVehicle = 0.5
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
    this.interiorLayer = this.makeLayer()
    this.videoLayer = this.makeLayer()
    this.atlas = loadImage(SPRITE_SRC, () => (this.dirty = true))
    this.atlasTinted = document.createElement('canvas')
    this.setupVideo()

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
    for (let i = 0; i < 3; i++) this.spawnVehicle(50 + i * 90)
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

  // Tạm dừng cảnh (nút pause / giảm chuyển động): dừng luôn video nhân vật
  setPaused(paused: boolean) {
    this.paused = paused
    if (!this.video) return
    if (paused) this.video.pause()
    else void this.video.play().catch(() => {})
  }

  private makeLayer() {
    const c = document.createElement('canvas')
    c.width = SCENE_W * SCALE
    c.height = SCENE_H * SCALE
    return c
  }

  private setupVideo() {
    const v = document.createElement('video')
    v.src = INTERIOR_VIDEO_SRC
    v.muted = true
    v.loop = true
    v.playsInline = true
    v.preload = 'auto'
    v.addEventListener('loadeddata', () => {
      this.videoReady = true
      if (!this.paused) void v.play().catch(() => {})
    })
    // Lỗi tải / trình duyệt không hỗ trợ → giữ ảnh tĩnh
    v.addEventListener('error', () => (this.video = null))
    this.video = v
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

    // Atlas sprite tô sẵn màu theo giờ/thời tiết (nhân màu rồi giữ lại alpha gốc)
    if (ready(this.atlas)) {
      const a = this.atlasTinted
      a.width = this.atlas.naturalWidth
      a.height = this.atlas.naturalHeight
      const ac = a.getContext('2d')!
      ac.drawImage(this.atlas, 0, 0)
      if (this.tint) {
        ac.globalCompositeOperation = 'multiply'
        ac.fillStyle = this.tint
        ac.fillRect(0, 0, a.width, a.height)
        ac.globalCompositeOperation = 'destination-in'
        ac.drawImage(this.atlas, 0, 0)
        ac.globalCompositeOperation = 'source-over'
      }
    }

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

    this.nextVehicle -= dt
    if (this.nextVehicle <= 0) {
      this.spawnVehicle()
      const busy = this.time === 'night' ? 2 : 1
      this.nextVehicle = (1.3 + this.rng() * 2.6) * busy * (rainy ? 1.5 : 1)
    }
    this.nextWalker -= dt
    if (this.nextWalker <= 0) {
      if (!rainy) this.spawnWalker()
      this.nextWalker = 6 + this.rng() * 8
    }

    for (const m of this.movers) {
      if (m.road) {
        // Xe phía trước chậm hơn thì bám theo, không chạy xuyên qua nhau
        const size = m.sprite === 'dog' ? {w: 10} : spriteSize(m.sprite)
        let speed = m.cruise
        for (const o of this.movers) {
          if (o === m || !o.road || o.lane !== m.lane) continue
          const gap = (o.x - m.x) * m.dir
          const other = o.sprite === 'dog' ? {w: 10} : spriteSize(o.sprite)
          if (gap > 0 && gap < (size.w + other.w) / 2 + 6) speed = Math.min(speed, o.speed)
        }
        m.speed = speed
      } else if (m.sprite === 'dog') {
        if (m.rest > 0) m.rest -= dt
        else if (this.rng() < dt * 0.12) m.rest = 0.8 + this.rng() * 1.2
        m.speed = m.rest > 0 ? 0 : m.cruise
      }
      m.x += m.dir * m.speed * dt
    }
    this.movers = this.movers.filter((m) => m.x > -60 && m.x < SCENE_W + 60)

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

    this.updateVideo()

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

  // Lặp đoạn gõ phím; cứ vài vòng mới cho phát đoạn cầm ly uống (SIP_START → SIP_END)
  private updateVideo() {
    const v = this.video
    if (!v || !this.videoReady || this.paused) return
    const t = v.currentTime
    if (this.sipping) {
      if (t >= SIP_END) this.sipping = false
    } else if (t >= SIP_START && t < SIP_END) {
      if (this.idleLoops >= this.nextSip) {
        this.sipping = true
        this.idleLoops = 0
        this.nextSip = 5 + Math.floor(this.rng() * 4) // ~20–35s giữa 2 lần uống
      } else {
        v.currentTime = SIP_END
        this.idleLoops++
      }
    }
  }

  private spawnVehicle(x?: number) {
    const r = this.rng
    const dir: 1 | -1 = r() < 0.5 ? 1 : -1
    const lane = dir > 0 ? NEAR_LANE : FAR_LANE
    const rainy = this.weather === 'rain'
    const roll = r()
    let sprite: SpriteName
    let cruise: number
    if (roll < 0.6) {
      sprite = rainy && r() < 0.7 ? 'bike-poncho' : pick(r, BIKES)
      cruise = 26 + r() * 18
    } else if (roll < 0.8) {
      sprite = r() < 0.55 ? 'car-taxi' : 'car-hatch'
      cruise = 32 + r() * 14
    } else if (roll < 0.87) {
      sprite = 'bus'
      cruise = 22 + r() * 6
    } else if (roll < 0.93 && !rainy) {
      sprite = 'cyclo'
      cruise = 9 + r() * 3
    } else {
      sprite = rainy ? 'bike-poncho' : 'cyclist'
      cruise = rainy ? 28 : 12 + r() * 4
    }
    const {w} = spriteSize(sprite)
    const startX = x ?? (dir > 0 ? -w / 2 - 2 : SCENE_W + w / 2 + 2)
    // Không sinh xe chồng lên xe khác vừa vào cùng làn
    if (x === undefined && this.movers.some((m) => m.road && m.lane === lane && Math.abs(m.x - startX) < w + 8)) return
    this.movers.push({sprite, road: true, x: startX, dir, cruise, speed: cruise, lane, phase: r(), rest: 0})
  }

  private spawnWalker(x?: number) {
    const r = this.rng
    const dir: 1 | -1 = r() < 0.5 ? 1 : -1
    const roll = r()
    const sprite: SpriteName | 'dog' = roll < 0.35 ? 'dog' : roll < 0.65 ? 'vendor' : 'walker'
    const cruise = sprite === 'dog' ? 20 + r() * 8 : sprite === 'vendor' ? 5 + r() * 2 : 8 + r() * 3
    this.movers.push({
      sprite,
      road: false,
      x: x ?? (dir > 0 ? -14 : SCENE_W + 14),
      dir,
      cruise,
      speed: cruise,
      lane: SIDEWALK_Y,
      phase: r(),
      rest: 0,
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
    // Vỉa hè → làn xa → làn gần (gần hơn vẽ sau, đè lên trên)
    const order = (m: Mover) => (m.road ? m.lane : 0)
    for (const m of [...this.movers].sort((a, b) => order(a) - order(b))) this.drawMover(m, t)

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

    ctx.drawImage(this.interiorFrame(), 0, 0, SCENE_W, SCENE_H)
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

  // Nội thất: khung video hiện tại (đã cắt nền xanh + tô màu), chưa có video thì ảnh tĩnh
  private interiorFrame(): HTMLCanvasElement {
    const v = this.video
    if (!v || !this.videoReady || v.readyState < 2) return this.interiorLayer
    if (v.currentTime !== this.videoFrameTime) {
      this.videoFrameTime = v.currentTime
      this.keyVideoFrame(v)
    }
    return this.videoLayer
  }

  private keyVideoFrame(v: HTMLVideoElement) {
    const c = this.videoLayer.getContext('2d', {willReadFrequently: true})!
    const {width: W, height: H} = this.videoLayer
    c.globalCompositeOperation = 'source-over'
    c.drawImage(v, 0, 0, W, H)
    const img = c.getImageData(0, 0, W, H)
    const d = img.data
    const keyed = new Uint8Array(W * H)
    for (let i = 0, p = 0; p < keyed.length; i += 4, p++) {
      const r = d[i]
      const g = d[i + 1]
      const b = d[i + 2]
      if (g > 150 && r < 140 && b < 140 && g > r * 1.4 && g > b * 1.4) {
        keyed[p] = 1
        d[i + 3] = 0
      }
    }
    // Viền ám xanh do nén video (2 lượt):
    // 1) pixel hơi xanh sát vùng đã cắt → bỏ luôn
    // 2) pixel còn lại cách vùng cắt ≤ 2px mà vẫn ngả xanh → kéo kênh G về mức R/B
    const near = (p: number, m: Uint8Array) => m[p - 1] || m[p + 1] || m[p - W] || m[p + W]
    const edge = keyed.slice()
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const p = y * W + x
        if (keyed[p] || !near(p, keyed)) continue
        const i = p * 4
        const r = d[i]
        const g = d[i + 1]
        const b = d[i + 2]
        if (g > 100 && g > Math.max(r, b) * 1.2) {
          edge[p] = 1
          d[i + 3] = 0
        }
      }
    }
    for (let pass = 0; pass < 2; pass++) {
      const grown = edge.slice()
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const p = y * W + x
          if (edge[p] || !near(p, edge)) continue
          const i = p * 4
          const m = Math.max(d[i], d[i + 2])
          if (d[i + 1] > m) d[i + 1] = m
          grown[p] = 1
        }
      }
      edge.set(grown)
    }
    c.putImageData(img, 0, 0)
    c.globalCompositeOperation = 'source-atop'
    const wash = INTERIOR_WASH[this.time]
    if (wash) {
      c.fillStyle = wash
      c.fillRect(0, 0, W, H)
    }
    if (this.weather === 'rain') {
      c.fillStyle = 'rgba(40,52,72,0.18)'
      c.fillRect(0, 0, W, H)
    }
    c.globalCompositeOperation = 'source-over'
  }

  private drawMover(m: Mover, t: number) {
    if (!this.atlasTinted.width) return
    const ctx = this.ctx
    const name: SpriteName =
      m.sprite === 'dog' ? (`dog-${m.speed > 0 ? Math.floor(t * 10 + m.phase * 4) % 4 : 0}` as SpriteName) : m.sprite
    const [sx, sy, sw, sh] = SPRITES[name]
    const w = sw / SCALE
    const h = sh / SCALE
    const base = m.road ? this.groundY(m.lane, m.x, this.laneShift) : this.groundY(m.lane, m.x)
    // Xe nhún theo mặt đường, người nhún theo bước chân
    const bob = m.sprite === 'dog' ? 0 : (t * (m.road ? 2 : 3) + m.phase) % 1 < (m.road ? 0.12 : 0.5) ? 0.5 : 0
    const x = Math.round((m.x - w / 2) * 2) / 2
    const y = Math.round((base - h - bob) * 2) / 2

    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(x + w * 0.1, base - 0.5, w * 0.8, 1)

    ctx.save()
    const facesRight = !FACES_LEFT.has(name)
    if ((m.dir < 0) === facesRight) {
      ctx.translate(x * 2 + w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(this.atlasTinted, sx, sy, sw, sh, x, y, w, h)
    ctx.restore()

    const lightsOn = m.road && !LIGHTS_OFF.has(m.sprite) && (this.time === 'night' || this.weather === 'rain')
    if (lightsOn) {
      const front = m.dir > 0 ? x + w - 1 : x
      const back = m.dir > 0 ? x : x + w - 1
      const ly = base - Math.max(3, h * 0.35)
      this.rect(front, ly, 1, 1, '#fff2b0')
      this.rect(back, ly, 1, 1, '#ff4a3a')
      ctx.fillStyle = 'rgba(255,240,180,0.16)'
      ctx.beginPath()
      ctx.moveTo(front + (m.dir > 0 ? 1 : 0), ly)
      ctx.lineTo(front + m.dir * 18, ly - 4)
      ctx.lineTo(front + m.dir * 18, ly + 6)
      ctx.fill()
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
