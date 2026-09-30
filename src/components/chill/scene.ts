// Cảnh pixel của trang /chill: góc quán cà phê nhìn qua cửa sổ ra phố Hà Nội.
//
// Art tĩnh là ảnh AI (public/chill/scenes/, tạo bằng Nano Banana 2 qua Figma
// Weave): mỗi điểm đến 3 bản phố sáng/chiều/đêm + 1 lớp nội thất dùng chung
// đã cắt trong suốt ô kính. Đổi điểm đến / giờ thì ảnh phố mờ dần sang ảnh mới.
// Mọi thứ chuyển động vẫn vẽ bằng canvas ở lưới 320×180 (mỗi "pixel" = 2px
// thật trên canvas đệm 640×360). Canvas hiển thị phóng đệm lên k lần nguyên
// (nearest) — pixel nào cũng to đều nhau — rồi trình duyệt chỉ co giãn nốt phần
// lẻ còn lại cho vừa màn hình (xem resize()).
//
// Xe cộ, người đi bộ, chó ngoài phố là sprite AI (public/chill/sprites.png,
// xem sprites.ts). Nhân vật trong quán gõ phím rồi thỉnh thoảng cầm ly cà phê
// uống: chuỗi khung cắt từ video loop AI (Kling), đã cắt nền xanh sẵn và chỉ giữ
// vùng người ngồi (public/chill/scenes/interior-loop.webp) — phần nội thất còn
// lại vẫn là ảnh tĩnh nét. Màn hình laptop khoét trống để vẽ app thiết kế
// đang chạy (screen.ts). Mèo mướp trên bậu cửa (cat.ts), bấm vào được. Mưa xem
// rain.ts.
//
// Thứ tự lớp (xa → gần):
//   ảnh phố → chim → người/chó trên vỉa hè → xe làn xa → xe làn gần → mưa/sương
//   → kính cửa (giọt nước, hơi nước) → nội thất (ảnh tĩnh, tô màu theo giờ) →
//   màn hình laptop → người ngồi → mèo → hơi cà phê, nốt nhạc → ánh đèn

import {Cat, CAT_HIT, CAT_PAW_TIP, CAT_SRC} from './cat'
import {DESTINATIONS, type Destination} from './destinations'
import {Rain} from './rain'
import {drawScreen} from './screen'
import {SPRITES, SPRITE_SRC, type SpriteName} from './sprites'
import type {StreetSound} from './audio'

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
// Sprite sheet người ngồi: 121 khung 12fps (10s) cắt từ video, mỗi ô 211×220 px
// thật, đặt tại (429, 116) trên ảnh nội thất 640×360. Ô cuối (121) là mặt nạ:
// vùng khoét khỏi ảnh tĩnh để khung chuyển động thay vào.
const CHAR = {src: '/chill/scenes/interior-loop.webp', x: 429, y: 116, w: 211, h: 220, cols: 12, frames: 121, fps: 12}
const CHAR_MASK = CHAR.frames
const CHAR_DURATION = CHAR.frames / CHAR.fps
// Mốc (giây): 0–0.75 và 6.8–hết là gõ phím, giữa là cầm ly uống.
// Khung đầu = khung cuối nên loop liền mạch.
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

type Walk = 'vendor' | 'walker' | 'dog'

type Mover = {
  sprite: SpriteName | Walk // xe: tên sprite · người/chó: loại, khung hình chọn lúc vẽ
  road: boolean // true: chạy dưới lòng đường, false: đi trên vỉa hè
  x: number // tâm theo chiều ngang (lưới 320)
  dir: 1 | -1
  cruise: number // tốc độ mong muốn (px/giây)
  speed: number // tốc độ hiện tại — đổi dần theo gia tốc, không nhảy
  lane: number
  phase: number
  braking: boolean // đang giảm tốc → đèn phanh sáng
  step: number // quãng đường đã đi — chọn khung bước chân khớp tốc độ, không trượt
  pause: number // đang dừng (giây còn lại)
  nextPause: number // bao lâu nữa thì dừng lần tới
  pose: SpriteName | null // tư thế chó khi dừng
  chase: number // chó đang đuổi xe (giây còn lại)
  crossed: boolean // đã qua giữa khung (phát tiếng "vù" 1 lần)
}

type Note = {x: number; y: number; age: number; drift: number}

const BIKES: SpriteName[] = ['bike-cub', 'bike-vespa', 'bike-flowers', 'bike-boxes', 'bike-duo']
const CARS = new Set<string>(['car-taxi', 'car-hatch', 'bus'])
// Vùng cửa kính (tỉ lệ theo sprite hướng phải) — sáng đèn bên trong lúc đêm
const WINDOWS: Record<string, [number, number, number, number]> = {
  'car-taxi': [0.28, 0.12, 0.42, 0.28],
  'car-hatch': [0.25, 0.1, 0.47, 0.3],
  bus: [0.06, 0.14, 0.76, 0.32],
}
const NEAR_SCALE = 1.08 // làn gần hơi to hơn làn xa → có chiều sâu
const DOG_POSES: SpriteName[] = ['dog-stand', 'dog-wag', 'dog-sniff', 'dog-sit']
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
  private buffer: HTMLCanvasElement
  private display: HTMLCanvasElement
  private displayCtx: CanvasRenderingContext2D
  private charSheet: HTMLImageElement
  private charTinted: HTMLCanvasElement
  private charTime = 0
  private sipping = false
  private idleLoops = 0
  private nextSip = 2 // lần uống đầu tiên đến sớm để người xem thấy
  private paused = false
  private dirty = true
  private catSheet: HTMLImageElement
  private catTinted: HTMLCanvasElement
  private cat = new Cat()
  private pawTarget: ReturnType<Rain['plant']> | null = null

  private rng = Math.random
  private movers: Mover[] = []
  private rain: Rain
  private notes: Note[] = []
  private birds: {x: number; y: number; p: number} | null = null
  private nextVehicle = 0.5
  private nextWalker = 2
  private nextBirds = 6
  private nextNote = 0
  private nextHorn = 12
  private lastWhoosh = 0
  // Âm thanh sự kiện ngoài phố (ChillRoom nối sang ChillAudio)
  onSound: ((kind: StreetSound, pan: number, dir: 1 | -1) => void) | null = null
  private last = 0
  private clock = 0

  constructor(canvas: HTMLCanvasElement) {
    this.display = canvas
    this.displayCtx = canvas.getContext('2d')!
    this.buffer = this.makeLayer()
    this.ctx = this.buffer.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false
    this.resize(SCENE_W * SCALE, SCENE_H * SCALE)

    this.street = this.image(this.destination.streets[this.time])
    this.interior = loadImage(INTERIOR_SRC, () => (this.dirty = true))
    this.interiorLayer = this.makeLayer()
    this.atlas = loadImage(SPRITE_SRC, () => (this.dirty = true))
    this.atlasTinted = document.createElement('canvas')
    this.charSheet = loadImage(CHAR.src, () => (this.dirty = true))
    this.charTinted = document.createElement('canvas')
    this.catSheet = loadImage(CAT_SRC, () => (this.dirty = true))
    this.catTinted = document.createElement('canvas')

    const px = (v: number) => v * SCALE
    this.rain = new Rain(
      {x: px(GLASS.x), y: px(GLASS.y), w: px(GLASS.w), h: px(GLASS.h)},
      PANES.map((p) => ({x: px(p.x), w: px(p.w)})),
      {top: px(SIDEWALK_Y), bottom: px(GLASS.y + GLASS.h)},
    )
    this.rain.onThunder = () => this.onSound?.('thunder', 0, 1)
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

  // Tạm dừng cảnh (nút pause / giảm chuyển động)
  setPaused(paused: boolean) {
    this.paused = paused
  }

  // Kích thước canvas trên màn hình (px thiết bị) mà cảnh cần phủ. Canvas hiển
  // thị = đệm × k (k nguyên, nearest) với k vừa đủ ≥ kích thước đó → trình duyệt
  // chỉ thu nhỏ nhẹ phần lẻ, pixel không bị to nhỏ lệch nhau / nhoè như khi
  // phóng thẳng 640×360 lên theo hệ số lẻ.
  resize(deviceW: number, deviceH: number, cover = true) {
    const fit = cover ? Math.max : Math.min
    const k = Math.min(8, Math.max(1, Math.ceil(fit(deviceW / this.buffer.width, deviceH / this.buffer.height) - 0.01)))
    const w = this.buffer.width * k
    const h = this.buffer.height * k
    if (this.display.width === w && this.display.height === h) return
    this.display.width = w
    this.display.height = h
    this.blit()
  }

  private blit() {
    const c = this.displayCtx
    c.imageSmoothingEnabled = false
    c.drawImage(this.buffer, 0, 0, this.display.width, this.display.height)
  }

  private makeLayer() {
    const c = document.createElement('canvas')
    c.width = SCENE_W * SCALE
    c.height = SCENE_H * SCALE
    return c
  }

  // Gọi mỗi frame từ requestAnimationFrame
  frame(now: number) {
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0
    this.last = now
    this.clock += dt
    if (this.dirty) this.rebuild()
    this.update(dt)
    this.draw(this.clock)
    this.blit()
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

    // Sheet người ngồi + mèo: tô sẵn cùng màu với nội thất
    this.washed(this.charSheet, this.charTinted)
    this.washed(this.catSheet, this.catTinted)

    // Lớp nội thất tô sẵn màu theo giờ/thời tiết, chỉ vẽ lại khi đổi
    const ctx = this.interiorLayer.getContext('2d')!
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, this.interiorLayer.width, this.interiorLayer.height)
    if (!ready(this.interior)) return
    ctx.drawImage(this.interior, 0, 0, this.interiorLayer.width, this.interiorLayer.height)
    // Sheet người ngồi đã tải → khoét vùng người khỏi ảnh tĩnh, khung động thay vào
    if (ready(this.charSheet)) {
      const [sx, sy] = this.charCell(CHAR_MASK)
      ctx.globalCompositeOperation = 'destination-out'
      ctx.drawImage(this.charSheet, sx, sy, CHAR.w, CHAR.h, CHAR.x, CHAR.y, CHAR.w, CHAR.h)
    }
    this.wash(ctx, this.interiorLayer.width, this.interiorLayer.height)
  }

  // Phủ màu theo giờ/thời tiết lên phần không trong suốt
  private wash(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.globalCompositeOperation = 'source-atop'
    const wash = INTERIOR_WASH[this.time]
    if (wash) {
      ctx.fillStyle = wash
      ctx.fillRect(0, 0, w, h)
    }
    if (this.weather === 'rain') {
      ctx.fillStyle = 'rgba(40,52,72,0.18)'
      ctx.fillRect(0, 0, w, h)
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  private washed(src: HTMLImageElement, out: HTMLCanvasElement) {
    if (!ready(src)) return
    out.width = src.naturalWidth
    out.height = src.naturalHeight
    const c = out.getContext('2d')!
    c.drawImage(src, 0, 0)
    this.wash(c, out.width, out.height)
  }

  private charCell(i: number): [number, number] {
    return [(i % CHAR.cols) * CHAR.w, Math.floor(i / CHAR.cols) * CHAR.h]
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
      if (m.road) this.updateVehicle(m, dt)
      else this.updateWalker(m, dt)
      m.x += m.dir * m.speed * dt
      m.step += m.speed * dt
      // Xe qua giữa khung → tiếng "vù" chạy từ loa này sang loa kia
      if (m.road && !m.crossed && (m.x - SCENE_W / 2) * m.dir > 0) {
        m.crossed = true
        if (this.clock - this.lastWhoosh > 0.9 && m.speed > 12) {
          this.lastWhoosh = this.clock
          this.onSound?.(CARS.has(m.sprite) ? 'whoosh-big' : 'whoosh', 0, m.dir)
        }
      }
    }
    this.movers = this.movers.filter((m) => m.x > -60 && m.x < SCENE_W + 60)

    // Thỉnh thoảng 1 xe máy đang trong khung bấm còi
    this.nextHorn -= dt
    if (this.nextHorn <= 0) {
      const bikes = this.movers.filter((m) => m.road && m.sprite.startsWith('bike') && m.x > 30 && m.x < SCENE_W - 30)
      const b = bikes[Math.floor(this.rng() * bikes.length)]
      if (b) this.onSound?.('horn', (b.x / SCENE_W) * 2 - 1, b.dir)
      this.nextHorn = (18 + this.rng() * 24) * (this.time === 'night' ? 1.8 : 1)
    }

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

    this.updateCharacter(dt)
    this.updateCat(dt)

    if (rainy) this.rain.update(dt)
  }

  // Xe: bám xe phía trước bằng gia tốc (tăng tốc chậm, phanh nhanh hơn) thay vì đổi tốc độ tức thì
  private updateVehicle(m: Mover, dt: number) {
    const size = this.sizeOf(m)
    let target = m.cruise
    for (const o of this.movers) {
      if (o === m || !o.road || o.lane !== m.lane) continue
      const gap = (o.x - m.x) * m.dir - (size.w + this.sizeOf(o).w) / 2
      if (gap > 0 && gap < 14) target = Math.min(target, gap < 5 ? Math.min(o.speed, 2) : o.speed)
    }
    const accel = 16
    const decel = 45
    const diff = target - m.speed
    m.speed += Math.max(-decel * dt, Math.min(accel * dt, diff))
    m.braking = diff < -0.5
  }

  // Người đi bộ / gánh hàng: thỉnh thoảng dừng lại. Chó: chạy, chạy chậm, dừng
  // với 1 tư thế (đứng, vẫy đuôi, hít ngửi, ngồi), thỉnh thoảng đuổi theo xe máy
  private updateWalker(m: Mover, dt: number) {
    if (m.chase > 0) {
      m.chase -= dt
      const bike = this.movers.find((o) => o.road && o.dir === m.dir && Math.abs(o.x - m.x) < 30 && o.sprite.startsWith('bike'))
      m.speed = Math.min(36, bike ? bike.speed : m.cruise * 1.4)
      if (m.chase <= 0 || !bike) {
        m.chase = 0
        m.pause = 1.2 + this.rng()
        m.pose = 'dog-stand'
        this.onSound?.('bark', (m.x / SCENE_W) * 2 - 1, m.dir)
      }
      return
    }
    if (m.pause > 0) {
      m.pause -= dt
      m.speed = 0
      if (m.pause <= 0) m.pose = null
      return
    }
    m.nextPause -= dt
    if (m.nextPause <= 0 && m.x > 20 && m.x < SCENE_W - 20) {
      m.nextPause = m.sprite === 'dog' ? 4 + this.rng() * 5 : 7 + this.rng() * 10
      m.pause = m.sprite === 'dog' ? 1.5 + this.rng() * 2.5 : 1.5 + this.rng() * 2
      m.pose = m.sprite === 'dog' ? pick(this.rng, DOG_POSES) : null
      m.speed = 0
      return
    }
    if (m.sprite === 'dog') {
      // Xe máy chạy ngang qua cùng chiều → đôi khi đuổi theo một đoạn
      const bike = this.movers.find((o) => o.road && o.dir === m.dir && o.sprite.startsWith('bike') && Math.abs(o.x - m.x) < 8)
      if (bike && this.rng() < dt * 1.5) {
        m.chase = 1.5 + this.rng()
        return
      }
      // Lúc chạy, lúc chạy chậm
      if (this.rng() < dt * 0.3) m.cruise = this.rng() < 0.5 ? 9 + this.rng() * 3 : 20 + this.rng() * 8
    }
    m.speed = m.cruise
  }

  private sizeOf(m: Mover) {
    if (m.sprite === 'dog') return {w: 10, h: 7}
    if (m.sprite === 'vendor' || m.sprite === 'walker') return {w: 14, h: 17}
    return spriteSize(m.sprite)
  }

  // Lặp đoạn gõ phím; cứ vài vòng mới cho phát đoạn cầm ly uống (SIP_START → SIP_END)
  private updateCharacter(dt: number) {
    if (this.paused) return
    let t = (this.charTime + dt) % CHAR_DURATION
    if (this.sipping) {
      if (t >= SIP_END) this.sipping = false
    } else if (t >= SIP_START && t < SIP_END) {
      if (this.idleLoops >= this.nextSip) {
        this.sipping = true
        this.idleLoops = 0
        this.nextSip = 5 + Math.floor(this.rng() * 4) // ~20–35s giữa 2 lần uống
      } else {
        t = SIP_END
        this.idleLoops++
      }
    }
    this.charTime = t
  }

  // Mèo: hành động ngẫu nhiên theo không khí (xem cat.ts). Lúc ngồi khều thì đặt
  // sẵn 1 giọt nước trên kính ngay chỗ chân với tới; khều trúng thì giọt trượt xuống
  private updateCat(dt: number) {
    const rain = this.weather === 'rain'
    this.cat.update(dt, {night: this.time === 'night', rain, music: this.musicOn})
    if (this.cat.action !== 'paw' || !rain) {
      this.pawTarget = null
      return
    }
    this.pawTarget ??= this.rain.plant(CAT_PAW_TIP.x, CAT_PAW_TIP.y)
    if (this.cat.pawing && !this.pawTarget.slide) this.rain.poke(this.pawTarget)
  }

  // Người xem bấm vào mèo (ChillRoom) → trả về tiếng kêu để phát
  petCat() {
    return this.cat.pet()
  }

  noticeCat() {
    this.cat.notice()
  }

  // Vùng bấm vào mèo, theo lưới canvas đệm (px thật 640×360)
  get catHitBox() {
    return CAT_HIT
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
    this.movers.push({...this.baseMover(), sprite, road: true, x: startX, dir, cruise, speed: cruise, lane})
  }

  private spawnWalker(x?: number) {
    const r = this.rng
    const dir: 1 | -1 = r() < 0.5 ? 1 : -1
    const roll = r()
    const sprite: Walk = roll < 0.35 ? 'dog' : roll < 0.65 ? 'vendor' : 'walker'
    const cruise = sprite === 'dog' ? 20 + r() * 8 : sprite === 'vendor' ? 5 + r() * 2 : 8 + r() * 3
    this.movers.push({
      ...this.baseMover(),
      sprite,
      road: false,
      x: x ?? (dir > 0 ? -14 : SCENE_W + 14),
      dir,
      cruise,
      speed: cruise,
      lane: SIDEWALK_Y,
    })
  }

  private baseMover(): Omit<Mover, 'sprite' | 'road' | 'x' | 'dir' | 'cruise' | 'speed' | 'lane'> {
    return {
      phase: this.rng(),
      braking: false,
      step: this.rng() * 20,
      pause: 0,
      nextPause: 3 + this.rng() * 8,
      pose: null,
      chase: 0,
      crossed: false,
    }
  }

  // ---------- Vẽ ----------

  private rect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.fillStyle = color
    this.ctx.fillRect(Math.round(x), Math.round(y), w, h)
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
      // Mặt đường ướt phản chiếu mờ dãy nhà (lật ngược quanh mép vỉa hè)
      if (ready(this.street)) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(GLASS.x, SIDEWALK_Y + 1, GLASS.w, GLASS.y + GLASS.h - SIDEWALK_Y - 1)
        ctx.clip()
        ctx.globalAlpha = 0.16
        ctx.translate(0, (SIDEWALK_Y + 1) * 2)
        ctx.scale(1, -1)
        ctx.drawImage(this.street, STREET_IMG.x, STREET_IMG.y, STREET_IMG.w, STREET_IMG.h)
        ctx.restore()
      }
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.rain.drawOutside(ctx, this.time === 'night')
      ctx.restore()
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
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      this.rain.drawGlass(ctx, this.buffer, this.time === 'night')
      ctx.restore()
    }
    ctx.restore()

    ctx.drawImage(this.interiorLayer, 0, 0, SCENE_W, SCENE_H)
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    // Màn hình laptop chỉ hiện khi đã khoét vùng người ngồi (sheet đã tải)
    if (this.charTinted.width) {
      drawScreen(ctx, t, this.time === 'night')
      const [sx, sy] = this.charCell(Math.min(CHAR.frames - 1, Math.floor(this.charTime * CHAR.fps)))
      ctx.drawImage(this.charTinted, sx, sy, CHAR.w, CHAR.h, CHAR.x, CHAR.y, CHAR.w, CHAR.h)
    }
    this.cat.draw(ctx, this.catTinted)
    if (this.weather === 'rain') this.rain.drawRoomFlash(ctx, this.buffer.width, this.buffer.height)
    ctx.restore()
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

  // Khung hình theo trạng thái: người đi → 4 khung bước theo quãng đường, đứng →
  // khung "chân chụm"; chó chạy → 4 khung chạy, dừng → tư thế (vẫy đuôi đổi khung)
  private frameOf(m: Mover, t: number): SpriteName {
    if (m.sprite === 'vendor' || m.sprite === 'walker') {
      const i = m.speed > 0 ? Math.floor(m.step / (m.sprite === 'vendor' ? 2.6 : 3.2)) % 4 : 1
      return `${m.sprite}-${i}` as SpriteName
    }
    if (m.sprite === 'dog') {
      if (m.speed > 0) return `dog-${Math.floor(m.step / 2.2) % 4}` as SpriteName
      const pose = m.pose ?? 'dog-stand'
      if (pose === 'dog-wag') return Math.floor(t * 6) % 2 ? 'dog-wag' : 'dog-stand'
      return pose
    }
    return m.sprite
  }

  // Nhún theo loại xe: xe máy nảy nhanh, ô tô nảy nhẹ, xe buýt lắc chậm, xích lô chòng chành
  private bobOf(m: Mover, t: number) {
    if (m.speed < 1) return 0
    const s = m.sprite
    if (!m.road) return 0
    if (s === 'bus') return Math.sin(t * 1.8 + m.phase * 6) > 0.4 ? 0.5 : 0
    if (s === 'cyclo') return Math.sin(t * 4 + m.phase * 6) > 0 ? 0.5 : 0
    if (s === 'car-taxi' || s === 'car-hatch') return (t * 1.2 + m.phase) % 1 < 0.1 ? 0.5 : 0
    return (t * 2.5 + m.phase) % 1 < 0.14 ? 0.5 : 0
  }

  private drawMover(m: Mover, t: number) {
    if (!this.atlasTinted.width) return
    const ctx = this.ctx
    const name = this.frameOf(m, t)
    const [sx, sy, sw, sh] = SPRITES[name]
    const scale = m.road && m.lane === NEAR_LANE ? NEAR_SCALE : 1
    const w = (sw / SCALE) * scale
    const h = (sh / SCALE) * scale
    const base = m.road ? this.groundY(m.lane, m.x, this.laneShift) : this.groundY(m.lane, m.x)
    const x = Math.round((m.x - w / 2) * 2) / 2
    const y = Math.round((base - h - this.bobOf(m, t)) * 2) / 2
    const night = this.time === 'night'
    const rainy = this.weather === 'rain'

    // Bóng đổ theo hướng nắng: sáng ngả phải, chiều ngả dài sang trái, đêm/mưa chỉ bóng mờ dưới chân
    const shadowDx = night || rainy ? 0 : this.time === 'afternoon' ? -9 : 3
    ctx.fillStyle = night || rainy ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.2)'
    ctx.beginPath()
    ctx.moveTo(x + w * 0.1, base)
    ctx.lineTo(x + w * 0.9, base)
    ctx.lineTo(x + w * 0.9 + shadowDx, base - 1)
    ctx.lineTo(x + w * 0.1 + shadowDx, base - 1)
    ctx.fill()

    ctx.save()
    const facesRight = !FACES_LEFT.has(name)
    if ((m.dir < 0) === facesRight) {
      ctx.translate(x * 2 + w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(this.atlasTinted, sx, sy, sw, sh, x, y, w, h)
    // Đêm: cửa kính ô tô / xe buýt sáng đèn bên trong (vẽ trong hệ toạ độ đã lật)
    const win = WINDOWS[name]
    if (night && win) {
      const [wx, wy, ww, wh] = win
      // Toạ độ theo sprite hướng phải — transform lật ở trên tự đảo cho xe đi sang trái
      const px = x + wx * w
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = 'rgba(255,205,120,0.32)'
      ctx.fillRect(px, y + wy * h, ww * w, wh * h)
      ctx.globalCompositeOperation = 'source-over'
    }
    ctx.restore()

    if (m.road && rainy && m.speed > 8) {
      // Bụi nước bắn sau bánh xe
      ctx.fillStyle = 'rgba(220,232,242,0.4)'
      const back = m.dir > 0 ? x : x + w
      for (let i = 0; i < 4; i++) {
        const k = (t * 9 + i * 0.37 + m.phase) % 1
        ctx.fillRect(back - m.dir * (1 + k * 5), base - 1 - Math.round(k * 2), 1, 1)
      }
    }

    const lightsOn = m.road && !LIGHTS_OFF.has(m.sprite) && (night || rainy)
    if (lightsOn) this.drawLights2(m, x, w, h, base)
  }

  // Đèn pha rọi thành chùm + vệt sáng trên mặt đường, đèn hậu phát sáng (sáng
  // mạnh khi phanh), mưa thì đèn phản chiếu xuống mặt đường ướt
  private drawLights2(m: Mover, x: number, w: number, h: number, base: number) {
    const ctx = this.ctx
    const big = CARS.has(m.sprite)
    const front = m.dir > 0 ? x + w - 1 : x
    const back = m.dir > 0 ? x : x + w - 1
    const ly = base - Math.max(3, h * (big ? 0.32 : 0.38))
    const reach = big ? 30 : 20

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const beam = ctx.createLinearGradient(front, ly, front + m.dir * reach, ly)
    beam.addColorStop(0, 'rgba(255,238,175,0.34)')
    beam.addColorStop(1, 'rgba(255,238,175,0)')
    ctx.fillStyle = beam
    ctx.beginPath()
    ctx.moveTo(front, ly - 1)
    ctx.lineTo(front + m.dir * reach, ly - 4)
    ctx.lineTo(front + m.dir * reach, base + 1)
    ctx.lineTo(front, ly + 1)
    ctx.fill()
    // Vệt sáng hắt xuống mặt đường phía trước
    const cx = front + m.dir * reach * 0.55
    const pool = ctx.createRadialGradient(cx, base, 0, cx, base, reach * 0.5)
    pool.addColorStop(0, 'rgba(255,230,160,0.22)')
    pool.addColorStop(1, 'rgba(255,230,160,0)')
    ctx.fillStyle = pool
    ctx.fillRect(cx - reach * 0.5, base - 3, reach, 5)
    // Đèn hậu: phanh thì to và đỏ rực hơn
    const r = m.braking ? 4 : 2.5
    const tail = ctx.createRadialGradient(back, ly, 0, back, ly, r)
    tail.addColorStop(0, m.braking ? 'rgba(255,70,50,0.8)' : 'rgba(255,60,45,0.45)')
    tail.addColorStop(1, 'rgba(255,60,45,0)')
    ctx.fillStyle = tail
    ctx.fillRect(back - r, ly - r, r * 2, r * 2)
    if (this.weather === 'rain') {
      // Phản chiếu trên đường ướt: vệt sáng kéo dài xuống dưới đèn
      for (const [lx, color] of [
        [front, 'rgba(255,238,175,0.3)'],
        [back, 'rgba(255,70,50,0.28)'],
      ] as const) {
        const g = ctx.createLinearGradient(0, base, 0, base + 7)
        g.addColorStop(0, color)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(lx - 0.5, base, 1.5, 7)
      }
    }
    ctx.restore()
    this.rect(front, ly, 1, 1, '#fff6c8')
    this.rect(back, ly, 1, 1, m.braking ? '#ff5a44' : '#e0382a')
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
