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
//   màn hình laptop → người ngồi → lọ tip (+ ly của người vừa mời) → mèo → hơi
//   cà phê, nốt nhạc → ánh đèn

import {Cat, CAT_SRC} from './cat'
import {DESTINATIONS, type Destination} from './destinations'
import {Rain} from './rain'
import {drawScreen} from './screen'
import {themeById, type CharacterVideo, type SheetSpec, type Theme, type ThemeId} from './themes'
import {SPRITES, SPRITE_SCALE, SPRITE_SRC, type SpriteName} from './sprites'
import {drawCoinDrop, drawIcedCoffee, drawTipJar, jarHitBox} from './tipjar'
import {CHARACTERS, type SeatedFriend} from './table-view'
import type {StreetSound} from './audio'

export type TimeOfDay = 'morning' | 'afternoon' | 'night'
export type Weather = 'clear' | 'rain' | 'mist'

export const SCENE_W = 320
export const SCENE_H = 180
// Lưới 320×180 → "px gốc" 640×360 (mọi toạ độ px trong code, ảnh nội thất) →
// canvas đệm thật 1280×720 (RES = 2) để sprite / nhân vật / mèo ở độ chi tiết ×2
// không bị nhoè. Ảnh nền vẫn 640 rộng, phóng nearest ×2 nên trông y như cũ.
const SCALE = 2
const RES = 2

// Con phố (ảnh + làn xe) theo lưới 320×180 — giống nhau ở mọi theme, chỉ dời
// xuống `theme.streetDy` (ban công nhìn xuống phố)
const STREET_IMG = {x: 20, y: 6, w: 280, h: 119}
const SIDEWALK_Y = 113 // chân người đi bộ
const FAR_LANE = 119 // đáy bánh xe làn xa
const NEAR_LANE = 124 // làn gần

const FADE_SECONDS = 1.2
// Bàn nhóm: nền AI public/chill/scenes/group/group-bg.webp (1280×720, ô kính trong
// suốt). Toạ độ px gốc 640×360 đo trên ảnh: tâm 4 ghế, mép xa mặt bàn, ô kính, bóng đèn.
const GROUP_BG_SRC = '/chill/scenes/group/group-bg.webp'
const GROUP_SEATS = [135, 264, 392, 522]
// Nhân vật nhìn chính diện (AI, đã cắt nền xanh + mặt bàn): 1 hàng 6 ô 187×185 px
// canvas đệm, thứ tự như CHARACTERS (table-view.ts). Neo: tâm người cách mép trái
// ô 82 px, mép bàn cách mép trên ô 167 px (px đệm = 2 × px gốc).
const GROUP_CHARS = {src: '/chill/scenes/group/group-chars.webp', w: 187, h: 185, ax: 82, ay: 167}
const GROUP = {
  tableTop: 270,
  window: {x: 70, y: 80, w: 92, h: 95},
  lamp: {x: 320, y: 86},
}
// Sprite sheet người ngồi: 121 khung 12fps (10s) cắt từ video, mỗi ô 211×220 px
// thật, đặt tại (429, 116) trên ảnh nội thất 640×360. Ô cuối (121) là mặt nạ:
// vùng khoét khỏi ảnh tĩnh để khung chuyển động thay vào.
// Người ngồi dạng video (quán, …): cấu hình trong themes.ts (CharacterVideo)

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
const DOG_POSES: SpriteName[] = ['dog-stand', 'dog-wag', 'dog-sniff', 'dog-sit']
const LIGHTS_OFF = new Set<string>(['cyclist', 'cyclo'])
// Kích thước sprite theo lưới 320×180 (atlas vẽ SPRITE_SCALE px cho mỗi px gốc)
const spriteSize = (name: SpriteName) => {
  const [, , w, h] = SPRITES[name]
  return {w: w / SCALE / SPRITE_SCALE, h: h / SCALE / SPRITE_SCALE}
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
  private charCfg: CharacterVideo | null = null
  private charSpec: SheetSpec | null = null
  // Khung người ngồi hiện tại đã tô màu theo giờ (vẽ lại khi đổi khung)
  private charFrame: HTMLCanvasElement
  private charFrameKey = ''
  private charTime = 0
  private sipping = false
  private idleLoops = 0
  private nextSip = 2 // lần uống đầu tiên đến sớm để người xem thấy
  private paused = false
  private dirty = true
  private catSheet: HTMLImageElement
  private catTinted: HTMLCanvasElement
  private theme: Theme = themeById('cafe')
  // Theme ảnh tĩnh: atlas các vùng biến thể của người ngồi (gõ phím, uống)
  private poseSheet: HTMLImageElement | null = null
  // Nhịp gõ phím: gõ liên tục vài giây rồi dừng đọc màn hình; tay nhún khi gõ
  private typing = true
  private typingLeft = 3
  private tap = false
  private tapLeft = 0
  // Uống: -1 = không uống, ≥0 = số giây từ lúc bắt đầu (chuyển mờ vào / ra)
  private sipT = -1
  private sipFor = 3
  private nextPoseSip = 15
  private cat = new Cat()
  // Lọ tip: số ly Bin đã xác nhận + ly của chính người xem (vừa mời trên máy này).
  // Vẽ vào lớp riêng, chỉ vẽ lại khi đổi → tô màu theo giờ giống nội thất
  private tip = {cups: 0, cup: false}
  private propsLayer: HTMLCanvasElement
  private propsKey = ''
  private coinAt = -1
  // Bàn nhóm (thử nghiệm): null = không ở bàn nào → không vẽ dây đèn.
  // Có bàn → dây 4 bóng trên ô cửa giữa, mỗi người bạn đang ở bàn sáng 1 bóng.
  private friendLights: number | null = null
  private bulbGlow = [0, 0, 0, 0]
  // Cảnh bàn nhóm: lia máy ngang từ quầy (0) vào trong quán (1)
  private groupOn = false
  private pan = 0
  private seated: SeatedFriend[] = []
  private panLayer: HTMLCanvasElement | null = null
  private groupLayer: HTMLCanvasElement | null = null
  private groupBg: HTMLImageElement | null = null
  private groupBgTinted: HTMLCanvasElement | null = null
  private groupBgKey = ''
  private groupChars: HTMLImageElement | null = null
  private groupCharsTinted: HTMLCanvasElement | null = null
  private groupCharsKey = ''
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
    this.resize(this.buffer.width, this.buffer.height)

    this.street = this.image(this.destination.streets[this.time])
    this.interior = loadImage(this.theme.interior, () => (this.dirty = true))
    this.interiorLayer = this.makeLayer()
    this.propsLayer = this.makeLayer()
    this.atlas = loadImage(SPRITE_SRC, () => (this.dirty = true))
    this.atlasTinted = document.createElement('canvas')
    this.charSheet = new Image()
    this.charFrame = document.createElement('canvas')
    this.loadCharacter()
    this.catSheet = loadImage(CAT_SRC, () => (this.dirty = true))
    this.catTinted = document.createElement('canvas')

    this.rain = this.makeRain()
    // Mở trang ra đã có sẵn vài chiếc xe trên đường, không phải chờ
    for (let i = 0; i < 3; i++) this.spawnVehicle(50 + i * 90)
    this.spawnWalker(140)
  }

  // Người ngồi của theme hiện tại: sheet video (bản ×2 cho màn rộng) hoặc atlas tư thế
  private loadCharacter() {
    const c = this.theme.character
    this.charFrameKey = ''
    if (c.kind === 'video') {
      this.charCfg = c
      this.charSpec = window.matchMedia('(min-width: 1024px)').matches ? c.hi : c.lo
      this.charSheet = loadImage(this.charSpec.src, () => (this.dirty = true))
      this.charFrame.width = c.at.w * this.charSpec.scale
      this.charFrame.height = c.at.h * this.charSpec.scale
      this.charTime = 0
      this.sipping = false
      this.poseSheet = null
    } else {
      this.charCfg = null
      this.charSpec = null
      this.poseSheet = loadImage(c.src, () => (this.dirty = true))
    }
  }

  private makeRain() {
    const {view, panes, streetDy} = this.theme
    const px = (v: number) => v * SCALE
    const rain = new Rain(
      {x: px(view.x), y: px(view.y), w: px(view.w), h: px(view.h)},
      panes.map((p) => ({x: px(p.x), w: px(p.w)})),
      {top: px(SIDEWALK_Y + streetDy), bottom: px(Math.min(view.y + view.h, NEAR_LANE + streetDy + 1))},
    )
    rain.onThunder = () => this.onSound?.('thunder', 0, 1)
    return rain
  }

  // Đổi "căn phòng" (quán cà phê / ban công / góc học đêm) — phố bên ngoài giữ nguyên
  setTheme(id: ThemeId) {
    if (id === this.theme.id) return
    this.theme = themeById(id)
    this.interior = loadImage(this.theme.interior, () => (this.dirty = true))
    this.loadCharacter()
    this.sipT = -1
    this.cat.setRear(this.theme.cat)
    this.pawTarget = null
    this.rain = this.makeRain()
    this.dirty = true
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
    return Math.round(base + shift + this.theme.streetDy + this.tilt * (x - SCENE_W / 2))
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
    c.width = SCENE_W * SCALE * RES
    c.height = SCENE_H * SCALE * RES
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

    // Mèo: tô sẵn cùng màu với nội thất. Người ngồi tô theo từng khung lúc vẽ
    // (sheet ×2 rất lớn — không giữ thêm 1 bản tô màu cả sheet trong bộ nhớ)
    this.washed(this.catSheet, this.catTinted)
    this.charFrameKey = ''
    this.propsKey = ''

    // Lớp nội thất tô sẵn màu theo giờ/thời tiết, chỉ vẽ lại khi đổi
    const ctx = this.interiorLayer.getContext('2d')!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, this.interiorLayer.width, this.interiorLayer.height)
    if (!ready(this.interior)) return
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(this.interior, 0, 0, this.interiorLayer.width, this.interiorLayer.height)
    // Theme ảnh tĩnh: khoét vùng người ngồi theo ô mặt nạ, tư thế vẽ vào lúc draw
    const frames = this.theme.character
    if (frames.kind === 'frames' && ready(this.poseSheet)) {
      const [mx, my] = frames.cells.mask
      const {at} = frames
      ctx.globalCompositeOperation = 'destination-out'
      ctx.drawImage(this.poseSheet, mx, my, at.w * 2, at.h * 2, at.x * RES, at.y * RES, at.w * RES, at.h * RES)
      ctx.globalCompositeOperation = 'source-over'
    }
    // Quán: sheet người ngồi đã tải → khoét vùng người khỏi ảnh tĩnh, khung động thay vào
    if (frames.kind === 'video' && this.charSpec && ready(this.charSheet)) {
      const [sx, sy, sw, sh] = this.charCell(this.charSpec.frames)
      const at = frames.at
      ctx.globalCompositeOperation = 'destination-out'
      ctx.drawImage(this.charSheet, sx, sy, sw, sh, at.x * RES, at.y * RES, at.w * RES, at.h * RES)
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

  // Ô thứ i trong sheet người ngồi (px của sheet)
  private charCell(i: number): [number, number, number, number] {
    const {cols, scale} = this.charSpec!
    const w = this.charCfg!.at.w * scale
    const h = this.charCfg!.at.h * scale
    return [(i % cols) * w, Math.floor(i / cols) * h, w, h]
  }

  // Khung người ngồi ở thời điểm hiện tại, đã tô màu theo giờ/thời tiết
  private charFrameCanvas() {
    const {frames, fps} = this.charSpec!
    const i = Math.min(frames - 1, Math.floor(this.charTime * fps))
    const key = `${i}`
    if (key !== this.charFrameKey) {
      this.charFrameKey = key
      const c = this.charFrame.getContext('2d')!
      c.globalCompositeOperation = 'source-over'
      c.clearRect(0, 0, this.charFrame.width, this.charFrame.height)
      const [sx, sy, sw, sh] = this.charCell(i)
      c.drawImage(this.charSheet, sx, sy, sw, sh, 0, 0, sw, sh)
      this.wash(c, this.charFrame.width, this.charFrame.height)
    }
    return this.charFrame
  }

  private update(dt: number) {
    const rainy = this.weather === 'rain'
    // Lia máy ~1,2 giây mỗi chiều
    this.pan = Math.max(0, Math.min(1, this.pan + (this.groupOn ? 1 : -1) * (dt / 1.2)))
    // Bóng đèn bạn bè sáng / tắt dần trong ~1 giây
    for (let i = 0; i < this.bulbGlow.length; i++) {
      const on = (this.friendLights ?? 0) > i ? 1 : 0
      this.bulbGlow[i] += Math.sign(on - this.bulbGlow[i]) * Math.min(Math.abs(on - this.bulbGlow[i]), dt)
    }
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
      this.birds = {x: this.theme.view.x - 10, y: this.theme.view.y + 5 + this.rng() * 10, p: 0}
      this.nextBirds = 14 + this.rng() * 20
    }
    if (this.birds) {
      this.birds.x += dt * 16
      this.birds.p += dt
      if (this.birds.x > this.theme.view.x + this.theme.view.w + 10) this.birds = null
    }

    // Nốt nhạc bay lên từ tai nghe khi đang phát nhạc
    this.nextNote -= dt
    if (this.musicOn && this.nextNote <= 0) {
      this.notes.push({x: this.theme.headphones.x, y: this.theme.headphones.y, age: 0, drift: this.rng() < 0.5 ? -1 : 1})
      this.nextNote = 1.6 + this.rng() * 1.4
    }
    for (const n of this.notes) {
      n.age += dt
      n.y -= dt * 7
      n.x += Math.sin(n.age * 2.5) * dt * 4 + n.drift * dt * 2
    }
    this.notes = this.notes.filter((n) => n.age < 3)

    if (this.theme.character.kind === 'video') this.updateCharacter(dt)
    else this.updatePose(dt)
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

  // Theme ảnh tĩnh: gõ phím từng đợt 2–5 giây rồi dừng 1–3 giây như đang đọc,
  // lúc gõ thì bàn tay nhún 1px không đều; khoảng mỗi phút cầm ly lên uống
  private updatePose(dt: number) {
    if (this.paused) return
    if (this.sipT >= 0) {
      this.sipT += dt
      if (this.sipT >= this.sipFor) this.sipT = -1
      return
    }
    this.nextPoseSip -= dt
    if (this.nextPoseSip <= 0) {
      this.sipT = 0
      this.sipFor = 2.8 + this.rng() * 0.9
      this.nextPoseSip = 45 + this.rng() * 30
      this.tap = false
      return
    }
    this.typingLeft -= dt
    if (this.typingLeft <= 0) {
      this.typing = !this.typing
      this.typingLeft = this.typing ? 2 + this.rng() * 3 : 1 + this.rng() * 2
      this.tap = false
    }
    if (!this.typing) return
    this.tapLeft -= dt
    if (this.tapLeft <= 0) {
      this.tap = !this.tap
      this.tapLeft = this.tap ? 0.07 + this.rng() * 0.06 : 0.08 + this.rng() * 0.16
    }
  }

  // Độ đậm của tư thế uống (0–1): mờ dần vào / ra trong 0.25s
  private get sipAlpha() {
    if (this.sipT < 0) return 0
    const fade = 0.25
    return Math.min(1, this.sipT / fade, (this.sipFor - this.sipT) / fade)
  }

  // Lặp đoạn gõ phím; cứ vài vòng mới cho phát đoạn cầm ly uống (charCfg.sip)
  private updateCharacter(dt: number) {
    if (this.paused) return
    if (!this.charCfg) return
    const [SIP_START, SIP_END] = this.charCfg.sip
    let t = (this.charTime + dt) % this.charCfg.duration
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
    // Chỉ khều được khi có kính (ban công không có kính)
    if (!this.theme.panes.length) return
    this.pawTarget ??= this.rain.plant(this.cat.pawTip.x, this.cat.pawTip.y)
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
    return this.cat.hitBox
  }

  // Số ly trong lọ tip (GET /api/chill-support) + ly của người vừa mời trên máy này
  setTipJar(cups: number, cup: boolean) {
    this.tip = {cups, cup}
  }

  // Số người bạn đang ở bàn nhóm (null = không ở bàn) — chỉ quán cà phê có dây đèn
  setFriendLights(friends: number | null) {
    this.friendLights = friends
    // Đang ở bàn → tải sẵn nền + nhân vật bàn nhóm để lúc lia máy vào đã có ảnh
    if (friends !== null) {
      this.groupBgLayer()
      this.groupCharsLayer()
    }
    // Cảnh đang dừng (hoặc giảm chuyển động) → không có frame nào để sáng dần, bật luôn
    if (this.paused) this.bulbGlow = this.bulbGlow.map((_, i) => ((friends ?? 0) > i ? 1 : 0))
  }

  // Bạn bè đang ngồi ở 4 ghế (đã xếp sẵn: table-view.ts arrangeFriends)
  setSeated(seated: SeatedFriend[]) {
    this.seated = seated
  }

  // Đứng dậy nhìn vào bàn nhóm / quay về quầy. Cảnh đang dừng → chuyển ngay
  setGroupView(on: boolean) {
    this.groupOn = on
    if (this.paused) this.pan = on ? 1 : 0
  }

  get groupView() {
    return this.pan > 0
  }

  // Vùng từng ghế ở cảnh bàn nhóm (px gốc 640×360) — để đặt bảng tên lên trên đầu
  groupSeatBox(i: number) {
    const cx = GROUP_SEATS[i]
    // Đỉnh đầu sprite ≈ mép bàn − 81 px gốc → bảng tên đặt sát trên đầu
    return {x: cx - 40, y: GROUP.tableTop - 84, w: 80, h: 84}
  }

  // Chỗ nhãn "+n" — giữa mặt bàn (mép phải bàn bị cắt mất trên màn 4:3)
  get groupMoreBox() {
    return {x: 304, y: GROUP.tableTop + 10, w: 32, h: 18}
  }

  // Nền + nhân vật bàn nhóm đã tô màu theo giờ (giống nội thất quầy), chỉ tô lại khi
  // đổi giờ / thời tiết
  private groupBgLayer() {
    this.groupBg ??= loadImage(GROUP_BG_SRC, () => (this.groupBgKey = ''))
    if (!ready(this.groupBg)) return null
    const key = this.tint ?? 'none'
    if (this.groupBgTinted && this.groupBgKey === key) return this.groupBgTinted
    this.groupBgTinted = this.tinted(this.groupBg, this.groupBgTinted)
    this.groupBgKey = key
    return this.groupBgTinted
  }

  private groupCharsLayer() {
    this.groupChars ??= loadImage(GROUP_CHARS.src, () => (this.groupCharsKey = ''))
    if (!ready(this.groupChars)) return null
    const key = this.tint ?? 'none'
    if (this.groupCharsTinted && this.groupCharsKey === key) return this.groupCharsTinted
    this.groupCharsTinted = this.tinted(this.groupChars, this.groupCharsTinted)
    this.groupCharsKey = key
    return this.groupCharsTinted
  }

  // Nhân màu giờ lên ảnh, giữ nguyên vùng trong suốt (ô kính, nền quanh nhân vật)
  private tinted(img: HTMLImageElement, reuse: HTMLCanvasElement | null) {
    const c = reuse ?? document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const cc = c.getContext('2d')!
    cc.clearRect(0, 0, c.width, c.height)
    cc.drawImage(img, 0, 0)
    if (this.tint) {
      cc.globalCompositeOperation = 'multiply'
      cc.fillStyle = this.tint
      cc.fillRect(0, 0, c.width, c.height)
      cc.globalCompositeOperation = 'destination-in'
      cc.drawImage(img, 0, 0)
      cc.globalCompositeOperation = 'source-over'
    }
    return c
  }

  // Người xem vừa bấm "I've sent it" → đồng xu rơi vào lọ, ly của họ hiện trên bàn
  dropCoin() {
    this.coinAt = this.clock
    this.tip = {...this.tip, cup: true}
  }

  // Lọ tip → mở bảng cảm ơn, theo px gốc 640×360 (như cuốn sổ)
  get tipJarHitBox() {
    const {x, y} = this.theme.tipJar
    return jarHitBox(x, y)
  }

  // Cuốn sổ mở trên bàn → mở Wishlist (theme không có sổ → null)
  get notebookHitBox() {
    return this.theme.notebook
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
    if (this.pan <= 0) return this.drawCounter(t)
    // Lia máy: quầy trượt sang trái, bàn nhóm trượt vào từ phải (cùng 1 quán)
    const e = this.pan < 1 ? this.pan * this.pan * (3 - 2 * this.pan) : 1
    const w = this.buffer.width
    this.groupLayer ??= this.makeLayer()
    this.drawGroup(this.groupLayer.getContext('2d')!, t)
    const ctx = this.ctx
    if (e < 1) {
      this.drawCounter(t)
      this.panLayer ??= this.makeLayer()
      const pc = this.panLayer.getContext('2d')!
      pc.clearRect(0, 0, w, this.buffer.height)
      pc.drawImage(this.buffer, 0, 0)
    }
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#16131a'
    ctx.fillRect(0, 0, w, this.buffer.height)
    if (e < 1 && this.panLayer) ctx.drawImage(this.panLayer, Math.round(-e * w), 0)
    ctx.drawImage(this.groupLayer, Math.round((1 - e) * w), 0)
    ctx.restore()
  }

  // Bàn nhóm nhìn chính diện (px gốc 640×360). Tạm vẽ bằng khối pixel cho tới khi
  // có ảnh nền + sprite AI: tường, cửa sổ nhỏ bên trái nhìn ra đúng con phố đang
  // chọn, dây đèn (cùng dây với quầy), đèn thả, bàn dài 4 ghế.
  private drawGroup(gc: CanvasRenderingContext2D, t: number) {
    gc.setTransform(RES, 0, 0, RES, 0, 0)
    gc.imageSmoothingEnabled = false
    const o = this.o
    const night = this.time === 'night'
    const R = (x: number, y: number, w: number, h: number, c: string) => {
      gc.fillStyle = c
      gc.fillRect(x, y, w, h)
    }

    // Nền AI (gạch, kệ, đèn thả, tranh, bàn dài 4 ghế trống). Ô kính cửa sổ bên trái
    // đã khoét trong suốt → vẽ con phố đang chọn ra sau trước, rồi mới đặt nền lên.
    const bg = this.groupBgLayer()
    const win = GROUP.window
    if (ready(this.street)) {
      const img = this.street
      gc.drawImage(img, img.width * 0.38, img.height * 0.04, img.width * 0.22, img.height * 0.5, win.x, win.y, win.w, win.h)
      if (this.weather === 'mist') R(win.x, win.y, win.w, win.h, night ? 'rgba(150,160,190,0.35)' : 'rgba(236,238,240,0.45)')
      if (this.weather === 'rain') R(win.x, win.y, win.w, win.h, 'rgba(120,130,150,0.25)')
    } else R(win.x, win.y, win.w, win.h, '#e8b48a')
    if (bg) gc.drawImage(bg, 0, 0, 640, 360)
    else R(0, 0, 640, 360, o('#6a4630'))

    // Dây đèn bạn bè chạy dọc tường gạch phía trên (cùng độ sáng với dây ở quầy)
    const lamp = GROUP.lamp
    const x0 = 200
    const x1 = 600
    const wireY = (x: number) => 30 + 14 * (1 - ((x - (x0 + x1) / 2) / ((x1 - x0) / 2)) ** 2)
    gc.fillStyle = '#2a1d15'
    for (let x = x0; x <= x1; x++) gc.fillRect(x, Math.round(wireY(x)), 1, 1)

    const top = GROUP.tableTop
    const chars = this.groupCharsLayer()
    if (chars) {
      // Sprite đã gồm laptop + ly trên mặt bàn, cắt ngang đúng mép bàn → đặt lên là xong
      const {w, h, ax, ay} = GROUP_CHARS
      for (let i = 0; i < GROUP_SEATS.length; i++) {
        const f = this.seated.find((s) => s.display === i)
        if (!f || f.status === 'away') continue
        const cx = GROUP_SEATS[i]
        const sx = ((f.character % CHARACTERS.length) + CHARACTERS.length) % CHARACTERS.length
        gc.drawImage(chars, sx * w, 0, w, h, cx - ax / RES, top - ay / RES, w / RES, h / RES)
        if (f.status === 'sleep') this.drawZ(gc, cx + 18, top - 96, t, i)
      }
      this.drawGroupGlow(gc, t, x0, x1, wireY, lamp, night)
      return
    }

    // Chưa tải xong sprite → người khối tạm (che lưng ghế), rồi vẽ lại phần mặt bàn
    // của nền đè lên cho người "ngồi sau bàn"
    for (let i = 0; i < GROUP_SEATS.length; i++) {
      const cx = GROUP_SEATS[i]
      const f = this.seated.find((s) => s.display === i)
      if (!f || f.status === 'away') continue
      const c = CHARACTERS[f.character] ?? CHARACTERS[0]
      const sleep = f.status === 'sleep'
      const bob = sleep ? 8 : Math.round(Math.sin(t * 2.4 + i * 1.9))
      const hy = top - 88 + bob
      R(cx - 28, top - 50, 56, 52, o(c.shirt))
      R(cx - 24, top - 54, 48, 6, o(c.shirt))
      R(cx - 6, top - 58 + bob, 12, 8, o(c.skin))
      R(cx - 15, hy, 30, 34, o(c.skin))
      R(cx - 16, hy - 4, 32, 12, o(c.hair))
      R(cx - 16, hy + 8, 4, 10, o(c.hair))
      R(cx + 12, hy + 8, 4, 10, o(c.hair))
      if (sleep) {
        R(cx - 8, hy + 19, 5, 1, '#2a1d15')
        R(cx + 3, hy + 19, 5, 1, '#2a1d15')
        this.drawZ(gc, cx + 18, hy - 6, t, i)
      } else {
        const blink = (t + i * 0.7) % 4 < 0.12
        R(cx - 8, hy + 17, 3, blink ? 1 : 3, '#2a1d15')
        R(cx + 5, hy + 17, 3, blink ? 1 : 3, '#2a1d15')
      }
      if (f.status === 'coffee') {
        // Cầm ly lên ngang miệng
        R(cx + 8, hy + 22, 11, 12, '#f3ece4')
        R(cx + 19, hy + 25, 3, 6, '#f3ece4')
        R(cx + 9, hy + 22, 9, 2, o('#6b3f22'))
      }
    }
    if (bg) gc.drawImage(bg, 0, top * RES, bg.width, bg.height - top * RES, 0, top, 640, 360 - top)

    // Laptop (nhìn mặt lưng) + ly của từng người; người vắng thì gập máy
    for (let i = 0; i < GROUP_SEATS.length; i++) {
      const cx = GROUP_SEATS[i]
      const f = this.seated.find((s) => s.display === i)
      if (!f) continue
      if (f.status === 'away') {
        R(cx - 18, top + 4, 36, 3, o('#9aa1ab'))
        continue
      }
      const sleep = f.status === 'sleep'
      R(cx - 20, top - 22, 40, 28, o('#9aa1ab'))
      R(cx - 20, top - 22, 40, 2, o('#b7bdc6'))
      R(cx - 1, top - 10, 3, 3, o('#d7dbe1'))
      // Ánh màn hình hắt lên mặt (trừ người ngủ gật)
      if (!sleep) {
        const g = gc.createRadialGradient(cx, top - 30, 2, cx, top - 30, 30)
        g.addColorStop(0, `rgba(130,175,255,${night ? 0.22 : 0.08})`)
        g.addColorStop(1, 'rgba(130,175,255,0)')
        gc.save()
        gc.globalCompositeOperation = 'lighter'
        gc.fillStyle = g
        gc.fillRect(cx - 30, top - 60, 60, 60)
        gc.restore()
      }
      if (f.status !== 'coffee') {
        R(cx + 26, top - 4, 9, 10, '#f3ece4')
        R(cx + 27, top - 4, 7, 2, o('#6b3f22'))
      }
    }

    this.drawGroupGlow(gc, t, x0, x1, wireY, lamp, night)
  }

  // "z z" bay lên trên đầu người ngủ gật
  private drawZ(gc: CanvasRenderingContext2D, x: number, y: number, t: number, i: number) {
    const zt = (t * 0.6 + i) % 1
    gc.fillStyle = `rgba(255,240,210,${(0.9 * (1 - zt)).toFixed(2)})`
    const zx = x + Math.round(zt * 8)
    const zy = y - Math.round(zt * 18)
    gc.fillRect(zx, zy, 5, 1)
    gc.fillRect(zx + 3, zy + 1, 1, 1)
    gc.fillRect(zx + 2, zy + 2, 1, 1)
    gc.fillRect(zx + 1, zy + 3, 1, 1)
    gc.fillRect(zx, zy + 4, 5, 1)
  }

  // Bóng đèn dây + quầng sáng, đèn thả, tối dần ở góc (lớp trên cùng của bàn nhóm)
  private drawGroupGlow(
    gc: CanvasRenderingContext2D,
    t: number,
    x0: number,
    x1: number,
    wireY: (x: number) => number,
    lamp: {x: number; y: number},
    night: boolean,
  ) {
    const R = (x: number, y: number, w: number, h: number, c: string) => {
      gc.fillStyle = c
      gc.fillRect(x, y, w, h)
    }
    gc.save()
    gc.globalCompositeOperation = 'lighter'
    this.bulbGlow.forEach((glow, i) => {
      const bx = Math.round(x0 + ((i + 1) * (x1 - x0)) / (this.bulbGlow.length + 1))
      const by = Math.round(wireY(bx)) + 1
      if (glow > 0) {
        const flicker = 0.9 + 0.1 * Math.sin(t * 2.3 + i * 1.7)
        const g = gc.createRadialGradient(bx, by + 4, 1, bx, by + 4, 22)
        g.addColorStop(0, `rgba(255,200,120,${(0.5 * glow * flicker).toFixed(3)})`)
        g.addColorStop(1, 'rgba(255,200,120,0)')
        gc.fillStyle = g
        gc.fillRect(bx - 22, by - 18, 44, 44)
      }
    })
    const lampOn = night || this.weather === 'rain' || this.time === 'afternoon'
    const lg = gc.createRadialGradient(lamp.x, lamp.y + 6, 2, lamp.x, lamp.y + 6, 230)
    lg.addColorStop(0, `rgba(255,190,110,${lampOn ? 0.36 : 0.16})`)
    lg.addColorStop(1, 'rgba(255,190,110,0)')
    gc.fillStyle = lg
    gc.fillRect(0, 0, 640, 360)
    gc.restore()
    this.bulbGlow.forEach((glow, i) => {
      const bx = Math.round(x0 + ((i + 1) * (x1 - x0)) / (this.bulbGlow.length + 1))
      const by = Math.round(wireY(bx)) + 1
      const mix = (a: number[], b: number[]) => `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * glow)).join(',')})`
      R(bx - 1, by, 3, 2, '#2a1d15')
      R(bx - 1, by + 2, 3, 4, mix([92, 78, 64], [255, 214, 138]))
      R(bx, by + 3, 1, 2, mix([128, 112, 96], [255, 245, 205]))
    })
    if (night) R(0, 0, 640, 360, 'rgba(20,14,30,0.28)')
    const v = gc.createRadialGradient(320, 180, 180, 320, 180, 400)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, 'rgba(10,6,4,0.35)')
    gc.fillStyle = v
    gc.fillRect(0, 0, 640, 360)
  }

  private drawCounter(t: number) {
    const ctx = this.ctx
    ctx.setTransform(SCALE * RES, 0, 0, SCALE * RES, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#1a1520'
    ctx.fillRect(0, 0, SCENE_W, SCENE_H)

    const {view, panes, streetDy} = this.theme
    const street = {...STREET_IMG, y: STREET_IMG.y + streetDy}
    ctx.save()
    ctx.beginPath()
    ctx.rect(view.x, view.y, view.w, view.h)
    ctx.clip()

    if (ready(this.prevStreet) && this.fade < 1) this.drawStreet(this.prevStreet, street, view)
    if (ready(this.street)) {
      ctx.globalAlpha = this.prevStreet ? this.fade : 1
      this.drawStreet(this.street, street, view)
      ctx.globalAlpha = 1
    }
    if (this.birds) this.drawBirds(this.birds)
    // Vỉa hè → làn xa → làn gần (gần hơn vẽ sau, đè lên trên)
    const order = (m: Mover) => (m.road ? m.lane : 0)
    for (const m of [...this.movers].sort((a, b) => order(a) - order(b))) this.drawMover(m, t)

    if (this.weather === 'rain') {
      ctx.globalCompositeOperation = 'multiply'
      ctx.fillStyle = this.time === 'night' ? '#8a90a8' : '#9ea6b2'
      ctx.fillRect(view.x, view.y, view.w, view.h)
      ctx.globalCompositeOperation = 'source-over'
      // Mặt đường ướt phản chiếu mờ dãy nhà (lật ngược quanh mép vỉa hè)
      if (ready(this.street)) {
        const edge = SIDEWALK_Y + streetDy + 1
        ctx.save()
        ctx.beginPath()
        ctx.rect(view.x, edge, view.w, Math.max(0, street.y + street.h - edge))
        ctx.clip()
        ctx.globalAlpha = 0.16
        ctx.translate(0, edge * 2)
        ctx.scale(1, -1)
        ctx.drawImage(this.street, street.x, street.y, street.w, street.h)
        ctx.restore()
      }
      ctx.save()
      ctx.setTransform(RES, 0, 0, RES, 0, 0)
      this.rain.drawOutside(ctx, this.time === 'night')
      ctx.restore()
    } else if (this.weather === 'mist') {
      ctx.fillStyle = this.time === 'night' ? 'rgba(150,160,190,0.35)' : 'rgba(236,238,240,0.5)'
      ctx.fillRect(view.x, view.y, view.w, view.h)
    }

    // Kính cửa: vệt phản chiếu chéo + giọt nước khi mưa (ban công không có kính)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    for (const pane of panes) {
      ctx.beginPath()
      ctx.moveTo(pane.x + 20, view.y)
      ctx.lineTo(pane.x + 34, view.y)
      ctx.lineTo(pane.x + 4, view.y + view.h)
      ctx.lineTo(pane.x - 10, view.y + view.h)
      ctx.fill()
    }
    if (this.weather === 'rain' && panes.length) {
      ctx.save()
      ctx.setTransform(RES, 0, 0, RES, 0, 0)
      this.rain.drawGlass(ctx, this.buffer, this.time === 'night')
      ctx.restore()
    }
    ctx.restore()

    ctx.drawImage(this.interiorLayer, 0, 0, SCENE_W, SCENE_H)
    ctx.save()
    // Lớp vẽ theo px gốc 640×360
    ctx.setTransform(RES, 0, 0, RES, 0, 0)
    const character = this.theme.character
    if (character.kind === 'video') {
      // Màn hình laptop chỉ hiện khi nội thất đã tải và đã khoét vùng người ngồi
      if (ready(this.charSheet) && ready(this.interior)) {
        if (this.theme.screen) drawScreen(ctx, t, this.time === 'night')
        const {at} = character
        ctx.drawImage(this.charFrameCanvas(), at.x, at.y, at.w, at.h)
      }
    } else if (ready(this.poseSheet) && ready(this.interior)) {
      this.drawPose(character)
    }
    if (ready(this.interior)) this.drawTip(ctx, t)
    this.cat.draw(ctx, this.catTinted)
    if (this.friendLights !== null && this.theme.id === 'cafe') this.drawFriendLights(ctx, t)
    if (this.weather === 'rain') this.rain.drawRoomFlash(ctx, SCENE_W * SCALE, SCENE_H * SCALE)
    ctx.restore()
    this.drawSteam(t)
    this.drawNotes()
    this.drawLights()
  }

  // Dây đèn bạn bè: võng ngang ô cửa giữa (2 đầu buộc vào 2 thanh khung), 4 bóng.
  // Bóng tắt là thuỷ tinh mờ; bóng sáng có quầng ấm và chập chờn rất nhẹ.
  // ctx đang ở px gốc 640×360 — ô cửa giữa nằm trong vùng luôn thấy ở mọi tỉ lệ màn.
  private drawFriendLights(ctx: CanvasRenderingContext2D, t: number) {
    const x0 = 226
    const x1 = 414
    const y0 = 30
    const sag = 16
    const wireY = (x: number) => y0 + sag * (1 - ((x - (x0 + x1) / 2) / ((x1 - x0) / 2)) ** 2)
    ctx.fillStyle = '#2a1d15'
    for (let x = x0; x <= x1; x++) ctx.fillRect(x, Math.round(wireY(x)), 1, 1)

    this.bulbGlow.forEach((glow, i) => {
      const bx = Math.round(x0 + ((i + 1) * (x1 - x0)) / (this.bulbGlow.length + 1))
      const by = Math.round(wireY(bx)) + 1
      ctx.fillStyle = '#2a1d15'
      ctx.fillRect(bx - 1, by, 3, 2)
      const flicker = 0.9 + 0.1 * Math.sin(t * 2.3 + i * 1.7)
      if (glow > 0) {
        const g = ctx.createRadialGradient(bx, by + 4, 1, bx, by + 4, 18)
        g.addColorStop(0, `rgba(255,200,120,${(0.45 * glow * flicker).toFixed(3)})`)
        g.addColorStop(1, 'rgba(255,200,120,0)')
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = g
        ctx.fillRect(bx - 18, by - 14, 36, 36)
        ctx.restore()
      }
      // Thân bóng 3×4: pha giữa màu tắt và màu sáng theo độ sáng hiện tại
      const mix = (a: number[], b: number[]) => `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * glow)).join(',')})`
      ctx.fillStyle = mix([92, 78, 64], [255, 214, 138])
      ctx.fillRect(bx - 1, by + 2, 3, 4)
      ctx.fillStyle = mix([128, 112, 96], [255, 245, 205])
      ctx.fillRect(bx, by + 3, 1, 2)
    })
  }

  // Lọ tip + ly cà phê (lớp tô sẵn màu) + đồng xu đang rơi. ctx đang ở px gốc 640×360
  private drawTip(ctx: CanvasRenderingContext2D, t: number) {
    const jar = this.theme.tipJar
    const key = `${this.theme.id}:${this.tip.cups}:${this.tip.cup}`
    if (key !== this.propsKey) {
      this.propsKey = key
      const layer = this.propsLayer
      const c = layer.getContext('2d')!
      c.setTransform(1, 0, 0, 1, 0, 0)
      c.clearRect(0, 0, layer.width, layer.height)
      c.setTransform(RES, 0, 0, RES, 0, 0)
      drawTipJar(c, jar.x, jar.y, this.tip.cups)
      if (this.tip.cup) drawIcedCoffee(c, jar.x + jar.cupDx, jar.y)
      c.setTransform(1, 0, 0, 1, 0, 0)
      this.wash(c, layer.width, layer.height)
    }
    ctx.drawImage(this.propsLayer, 0, 0, SCENE_W * SCALE, SCENE_H * SCALE)
    if (this.coinAt >= 0 && !drawCoinDrop(ctx, jar.x, jar.y, t - this.coinAt)) this.coinAt = -1
  }

  // Ảnh phố + kéo dài hàng pixel trên cùng (trời) / dưới cùng (mặt đường) khi vùng
  // nhìn cao hơn ảnh (ban công)
  private drawStreet(img: HTMLImageElement, r: {x: number; y: number; w: number; h: number}, view: {y: number; h: number}) {
    const ctx = this.ctx
    // 1 hàng pixel của ảnh
    const sy = img.naturalHeight / r.h
    ctx.drawImage(img, r.x, r.y, r.w, r.h)
    if (view.y < r.y) ctx.drawImage(img, 0, 0, img.naturalWidth, sy, r.x, view.y, r.w, r.y - view.y)
    const bottom = r.y + r.h
    if (view.y + view.h > bottom) {
      ctx.drawImage(img, 0, img.naturalHeight - sy, img.naturalWidth, sy, r.x, bottom, r.w, view.y + view.h - bottom)
    }
  }

  // Người ngồi ở theme ảnh tĩnh (vẽ theo px gốc, ctx đã scale RES).
  // Ngồi: tư thế gốc + thở (nửa trên nhô 1px) + tay nhún khi gõ. Uống: chuyển mờ
  // sang ô `sip` (hai tư thế vẽ cùng độ mờ bù nhau → không lộ bóng ma khi đã uống hẳn)
  private drawPose(c: Extract<Theme['character'], {kind: 'frames'}>) {
    const ctx = this.ctx
    const {at, hands} = c
    const base = this.poseCanvas(c, 'base')
    const sip = this.sipAlpha
    const half = 1 / RES // 1 px của canvas đệm
    if (sip < 1) {
      ctx.globalAlpha = 1 - sip
      ctx.drawImage(base, at.x, at.y, at.w, at.h)
      // Thở: ~4s một nhịp, hít vào 1.6s
      if (this.clock % 4.2 < 1.6) {
        const h = Math.round(at.h * c.shoulders)
        ctx.drawImage(base, 0, 0, base.width, h * 2, at.x, at.y - half, at.w, h)
      }
      // Gõ phím: vùng bàn tay nhún lên 1px
      if (this.tap && sip === 0) {
        ctx.drawImage(base, (hands.x - at.x) * 2, (hands.y - at.y) * 2, hands.w * 2, hands.h * 2, hands.x, hands.y - half, hands.w, hands.h)
      }
    }
    if (sip > 0) {
      ctx.globalAlpha = sip
      ctx.drawImage(this.poseCanvas(c, 'sip'), at.x, at.y, at.w, at.h)
    }
    ctx.globalAlpha = 1
  }

  // Ô tư thế trong atlas, đã tô màu theo giờ/thời tiết (giữ lại tới khi đổi)
  private poseCanvases = new Map<string, HTMLCanvasElement>()
  private poseCanvas(c: Extract<Theme['character'], {kind: 'frames'}>, pose: 'base' | 'sip') {
    const key = `${this.theme.id}:${pose}:${this.time}:${this.weather}`
    let canvas = this.poseCanvases.get(key)
    if (!canvas && this.poseSheet) {
      // Giờ / thời tiết đổi thì bỏ các bản tô màu cũ
      for (const k of this.poseCanvases.keys()) if (!k.endsWith(`:${this.time}:${this.weather}`)) this.poseCanvases.delete(k)
      canvas = document.createElement('canvas')
      const [sx, sy] = c.cells[pose]
      canvas.width = c.at.w * 2
      canvas.height = c.at.h * 2
      const g = canvas.getContext('2d')!
      g.drawImage(this.poseSheet, sx, sy, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
      this.wash(g, canvas.width, canvas.height)
      this.poseCanvases.set(key, canvas)
    }
    return canvas!
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
    const {w, h} = spriteSize(name)
    const base = m.road ? this.groundY(m.lane, m.x, this.laneShift) : this.groundY(m.lane, m.x)
    // Bám lưới pixel của atlas → sprite không bị lệch nửa pixel, nét đều
    const snap = SCALE * SPRITE_SCALE
    const x = Math.round((m.x - w / 2) * snap) / snap
    const y = Math.round((base - h - this.bobOf(m, t)) * snap) / snap
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
    // Mọi sprite đều vẽ hướng sang phải → đi sang trái thì lật
    if (m.dir < 0) {
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

  // Hơi nước bốc lên từ nắp phin / cốc cà phê (theme không có đồ nóng thì thôi)
  private drawSteam(t: number) {
    const at = this.theme.steam
    if (!at) return
    const cold = this.weather !== 'clear' || this.time === 'morning'
    for (let i = 0; i < 3; i++) {
      for (let s = 0; s < 12; s++) {
        const y = at.y - s * 2 - Math.floor((t * 5 + i * 1.3) % 2)
        const x = at.x + (i - 1) * 2 + Math.round(Math.sin(s * 0.55 + t * 1.4 + i * 2.1) * 2)
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

    const {lamp, lampAlways, laptop} = this.theme
    const lampOn = lampAlways || this.time !== 'morning' || this.weather === 'rain'
    if (lampOn) {
      const g = ctx.createRadialGradient(lamp.x, lamp.y, 1, lamp.x, lamp.y, 110)
      g.addColorStop(0, 'rgba(255,190,110,0.38)')
      g.addColorStop(1, 'rgba(255,190,110,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, SCENE_W, SCENE_H)
      // Bóng đèn thả của quán
      if (this.theme.id === 'cafe') this.rect(lamp.x - 3, lamp.y - 1, 7, 2, 'rgba(255,231,168,0.9)')
    }
    if (laptop) {
      const screen = this.time === 'night' ? 0.28 : 0.1
      const g = ctx.createRadialGradient(laptop.x, laptop.y, 1, laptop.x, laptop.y, 40)
      g.addColorStop(0, `rgba(130,175,255,${screen})`)
      g.addColorStop(1, 'rgba(130,175,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(laptop.x - 40, laptop.y - 40, 80, 80)
    }
    ctx.restore()

    const v = ctx.createRadialGradient(SCENE_W / 2, SCENE_H / 2, 90, SCENE_W / 2, SCENE_H / 2, 200)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, 'rgba(10,6,4,0.3)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, SCENE_W, SCENE_H)
  }
}
