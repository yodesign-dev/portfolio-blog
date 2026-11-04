// Lớp sông của cảnh phố cổ (/chill, điểm đến kiểu "oldtown"), vẽ chồng lên ảnh phố, dưới người đi bộ:
//
// - Mặt nước: các vệt sáng lăn tăn, đêm ấm theo đèn, mưa thành vòng nước li ti.
// - Đò: sprite boats.webp (2 loại, 4 khung chèo, nhìn sang phải), đi qua vài chục giây một lần,
//   có bóng dưới nước và vệt sóng phía sau. Đêm / mưa thì đèn mũi đò sáng và in xuống nước.
// - Đèn lồng: chỉ đêm. Đèn đã vẽ sẵn trong ảnh, lớp này cho chúng thở (quầng sáng) và lấp lánh.
// - Đèn hoa đăng trôi: chỉ đêm không mưa.
//
// Toạ độ theo px ảnh 1120×476. Chỉ điểm đến có trong RIVER mới có lớp này.

import type {TimeOfDay, Weather} from './scene'

type Config = {
  water: {top: number; bottom: number}
  // Mép nước của các luồng đò, từ xa tới gần
  lanes: number[]
  // Đèn lớn phía gần [x, y, bán kính quầng]
  lanterns: [number, number, number][]
  // Đèn nhỏ, cửa sáng bờ bên kia (dò từ ảnh đêm)
  sparks: [number, number][]
}

export const RIVER: Record<string, Config> = {
  hoian: {
    water: {top: 296, bottom: 371},
    lanes: [316, 334, 354],
    lanterns: [
      [80, 154, 46],
      [133, 170, 44],
      [190, 185, 40],
      [239, 187, 40],
      [287, 186, 38],
      [331, 190, 36],
      [833, 188, 38],
      [882, 187, 40],
      [933, 181, 40],
      [988, 170, 44],
      [1040, 151, 46],
    ],
    sparks: [[348,171],[667,241],[442,181],[762,240],[538,240],[859,227],[367,233],[597,238],[371,171],[489,220],[369,222],[442,201],[344,225],[410,236],[387,225],[426,225],[457,221],[693,231],[641,230],[879,237],[471,216],[303,225],[654,195],[705,192],[835,220],[888,248],[272,223],[667,226],[97,227],[168,231],[85,224],[750,186],[441,213],[777,186],[134,231],[404,236],[330,236],[215,217],[319,236],[400,236],[50,179],[403,219],[72,220],[9,179],[10,228],[307,181],[917,234],[939,229],[149,185],[161,185],[928,232],[1006,231],[987,237],[241,225],[257,221],[541,228],[1065,231],[892,232],[914,205],[944,219],[406,250],[953,219],[368,248],[326,250],[904,202],[948,213],[681,194],[744,243],[789,243],[796,186],[116,229],[283,219],[731,185],[599,227],[738,240],[792,232],[924,204],[1109,209],[744,232],[783,238]],
  },
}

const BOATS_SRC = '/chill/scenes/boats.webp'
const CELL_W = 128
// row: y trong sheet, h: cao 1 khung, keel: mép nước trong khung, lamp: đèn mũi đò trong khung
const BOATS = [
  {y: 0, h: 62, keel: 56, lamp: [113, 27]},
  {y: 62, h: 51, keel: 45, lamp: [117, 16]},
] as const
const FRAMES = [0, 1, 2, 3, 2, 1]
const FPS = 2.5
const SPEED = [18, 26] // px ảnh / giây
const FIRST = [5, 12] // chuyến đầu (giây), vừa tới nơi đã có đò
const EVERY = [7, 16]
const MAX_BOATS = 5
// Không để tiếng chèo chồng nhau: đò khác đi qua trong lúc này thì im
const SOUND_GAP = 30
// Nhuộm đò theo giờ cho khớp ảnh (ảnh phố đã vẽ sẵn ánh sáng từng giờ)
const TINT: Record<TimeOfDay, string | null> = {morning: null, afternoon: '#ffe0c0', night: '#5f6a99'}

type Boat = {x: number; dir: 1 | -1; speed: number; lane: number; kind: 0 | 1; clock: number}
type Drift = {x: number; y: number; speed: number; phase: number; warm: number}

const seeded = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const between = ([a, b]: readonly number[]) => a + Math.random() * (b - a)

export class River {
  private cfg: Config | null = null
  private time: TimeOfDay = 'morning'
  private weather: Weather = 'clear'
  private clock = 0
  private boats: Boat[] = []
  private nextBoat = 0
  private soundFree = 0
  private drifts: Drift[] = []
  private img: HTMLImageElement | null = null
  private tinted: HTMLCanvasElement | null = null
  private tintKey = ''
  private glow: HTMLCanvasElement | null = null
  private alpha = 1

  set(id: string, time: TimeOfDay, weather: Weather) {
    const cfg = RIVER[id] ?? null
    if (cfg !== this.cfg) {
      // Vừa tới nơi: trên sông đã có sẵn vài chiếc đang đi
      this.boats = cfg
        ? [280, 760].map((x, i) => ({x, dir: (i ? -1 : 1) as 1 | -1, speed: between(SPEED), lane: i ? 0 : 2, kind: (i ? 1 : 0) as 0 | 1, clock: i}))
        : []
      this.nextBoat = between(FIRST)
      this.drifts = cfg
        ? Array.from({length: 6}, (_, i) => ({
            x: seeded(i, 1) * 1120,
            y: cfg.water.top + 12 + seeded(i, 2) * (cfg.water.bottom - cfg.water.top - 20),
            speed: 3 + seeded(i, 3) * 4,
            phase: seeded(i, 4) * 6,
            warm: seeded(i, 5),
          }))
        : []
    }
    this.cfg = cfg
    this.time = time
    this.weather = weather
    if (cfg && !this.img) {
      const img = new Image()
      img.onload = () => (this.tintKey = '')
      img.src = BOATS_SRC
      this.img = img
    }
  }

  // onBoat: đò vừa vào khung, len = số giây đò đi hết khung (cho tiếng mái chèo)
  update(dt: number, onBoat?: (dir: 1 | -1, len: number) => void) {
    if (!this.cfg) return
    this.clock += dt
    for (const b of this.boats) {
      b.x += b.dir * b.speed * dt
      b.clock += dt
    }
    this.boats = this.boats.filter((b) => b.x > -CELL_W && b.x < 1120 + CELL_W)
    this.nextBoat -= dt
    if (this.nextBoat <= 0) {
      this.nextBoat = between(EVERY) * (this.weather === 'rain' ? 2 : 1)
      const lane = Math.floor(Math.random() * this.cfg.lanes.length)
      const dir = (Math.random() < 0.5 ? 1 : -1) as 1 | -1
      const from = dir > 0 ? 0 : 1120
      // Luồng đó có đò ở gần chỗ vào khung thì để lượt sau
      if (this.boats.length < MAX_BOATS && !this.boats.some((b) => b.lane === lane && Math.abs(b.x - from) < CELL_W * 2)) {
        const speed = between(SPEED)
        this.boats.push({x: dir > 0 ? -CELL_W / 2 - 4 : 1120 + CELL_W / 2 + 4, dir, speed, lane, kind: Math.random() < 0.5 ? 1 : 0, clock: Math.random() * 3})
        if (this.clock >= this.soundFree) {
          this.soundFree = this.clock + SOUND_GAP
          onBoat?.(dir, (1120 + CELL_W) / speed)
        }
      }
    }
    for (const d of this.drifts) {
      d.x += d.speed * dt
      if (d.x > 1130) d.x = -10
    }
  }

  private sheet() {
    const img = this.img
    if (!img || !img.complete || !img.naturalWidth) return null
    const key = TINT[this.time] ?? 'none'
    if (this.tinted && this.tintKey === key) return this.tinted
    const c = this.tinted ?? document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const cc = c.getContext('2d')!
    cc.drawImage(img, 0, 0)
    if (TINT[this.time]) {
      cc.globalCompositeOperation = 'multiply'
      cc.fillStyle = TINT[this.time]!
      cc.fillRect(0, 0, c.width, c.height)
      cc.globalCompositeOperation = 'destination-in'
      cc.drawImage(img, 0, 0)
      cc.globalCompositeOperation = 'source-over'
    }
    this.tinted = c
    this.tintKey = key
    return c
  }

  // Quầng sáng dùng chung, vẽ sẵn 1 lần
  private glowSprite() {
    if (this.glow) return this.glow
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const cc = c.getContext('2d')!
    const g = cc.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(255,190,110,0.9)')
    g.addColorStop(0.35, 'rgba(255,140,70,0.35)')
    g.addColorStop(1, 'rgba(255,100,40,0)')
    cc.fillStyle = g
    cc.fillRect(0, 0, 64, 64)
    this.glow = c
    return c
  }

  draw(ctx: CanvasRenderingContext2D, r: {x: number; y: number; w: number; h: number}) {
    const cfg = this.cfg
    if (!cfg) return
    const s = r.w / 1120
    // Đang chuyển cảnh thì lớp phố đang mờ dần: mọi độ mờ bên dưới nhân với mức này
    this.alpha = ctx.globalAlpha
    ctx.save()
    ctx.translate(r.x, r.y)
    ctx.scale(s, s)
    const smooth = ctx.imageSmoothingEnabled
    this.drawWater(ctx, cfg)
    ctx.imageSmoothingEnabled = false
    for (const b of [...this.boats].sort((a, c) => a.lane - c.lane)) this.drawBoat(ctx, cfg, b)
    ctx.imageSmoothingEnabled = true
    if (this.time === 'night') this.drawLanterns(ctx, cfg)
    ctx.imageSmoothingEnabled = smooth
    ctx.restore()
  }

  private drawWater(ctx: CanvasRenderingContext2D, cfg: Config) {
    const {top, bottom} = cfg.water
    const t = this.clock
    const h = bottom - top
    ctx.fillStyle = this.time === 'night' ? '#ffc27a' : this.time === 'afternoon' ? '#ffdcaa' : '#ffffff'
    const base = this.time === 'night' ? 0.34 : 0.2
    for (let i = 0; i < 64; i++) {
      const y = Math.round(top + 2 + seeded(i, 7) * (h - 4))
      const x = seeded(i, 8) * 1120 + Math.sin(t * 0.25 + i) * 10
      const a = Math.sin(t * (0.5 + seeded(i, 9)) + i * 2.1)
      if (a <= 0.15) continue
      ctx.globalAlpha = this.alpha * (a * base)
      ctx.fillRect(Math.round(x), y, 6 + Math.round(seeded(i, 10) * 18), 1)
    }
    if (this.weather === 'rain') {
      // Vòng nước: mỗi ô sống 0,7 giây rồi hiện chỗ khác
      ctx.fillStyle = '#e6f2f6'
      for (let i = 0; i < 46; i++) {
        const p = t / 0.7 + seeded(i, 11)
        const n = Math.floor(p)
        const k = p - n
        const x = seeded(i, n + 12) * 1120
        const y = top + 3 + seeded(i, n + 13) * (h - 6)
        const w = 2 + k * 9
        ctx.globalAlpha = this.alpha * ((1 - k) * 0.5)
        ctx.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w), 1)
      }
    }
    if (this.time === 'night' && this.weather !== 'rain') {
      const glow = this.glowSprite()
      for (const d of this.drifts) {
        const y = Math.round(d.y + Math.sin(t * 0.8 + d.phase))
        ctx.globalAlpha = this.alpha
        ctx.fillStyle = d.warm > 0.5 ? '#ffe2a0' : '#ffb98a'
        ctx.fillRect(Math.round(d.x), y, 4, 3)
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = this.alpha * (0.5 + 0.12 * Math.sin(t * 1.7 + d.phase))
        ctx.drawImage(glow, d.x - 8, y - 9, 20, 20)
        ctx.globalCompositeOperation = 'source-over'
      }
    }
    ctx.globalAlpha = this.alpha
  }

  private drawBoat(ctx: CanvasRenderingContext2D, cfg: Config, b: Boat) {
    const sheet = this.sheet()
    if (!sheet) return
    const spec = BOATS[b.kind]
    const frame = FRAMES[Math.floor(b.clock * FPS) % FRAMES.length]
    const line = cfg.lanes[b.lane] + Math.round(Math.sin(b.clock * 1.4))
    const left = Math.round(b.x - CELL_W / 2)
    const top = line - spec.keel
    const sx = frame * CELL_W
    // Bóng dưới nước, cắt theo mặt sông
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, line, 1120, cfg.water.bottom - line)
    ctx.clip()
    ctx.globalAlpha = this.alpha * (this.time === 'night' ? 0.22 : 0.28)
    ctx.translate(left + (b.dir < 0 ? CELL_W : 0), line)
    ctx.scale(b.dir, -1)
    ctx.drawImage(sheet, sx, spec.y, CELL_W, spec.keel, 0, 0, CELL_W, spec.keel)
    ctx.restore()
    // Sóng sau đuôi
    ctx.fillStyle = this.time === 'night' ? '#b8c6e8' : '#ffffff'
    ctx.globalAlpha = this.alpha * 0.4
    const stern = b.x - (b.dir * CELL_W) / 2
    for (let i = 0; i < 3; i++) {
      const wobble = Math.sin(b.clock * 2 + i) * 2
      ctx.fillRect(Math.round(stern - b.dir * (8 + i * 14) + wobble), line + 1 + i, 12 - i * 3, 1)
    }
    ctx.globalAlpha = this.alpha
    ctx.save()
    ctx.translate(left + (b.dir < 0 ? CELL_W : 0), top)
    ctx.scale(b.dir, 1)
    ctx.drawImage(sheet, sx, spec.y, CELL_W, spec.h, 0, 0, CELL_W, spec.h)
    ctx.restore()
    // Đèn mũi đò
    if (this.time === 'night' || this.weather === 'rain') {
      const lx = b.dir > 0 ? left + spec.lamp[0] : left + CELL_W - spec.lamp[0]
      const ly = top + spec.lamp[1]
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = this.alpha * 0.9
      ctx.drawImage(this.glowSprite(), lx - 16, ly - 16, 32, 32)
      ctx.fillStyle = '#ffb060'
      ctx.globalAlpha = this.alpha * 0.5
      ctx.fillRect(lx - 1, line + 2, 3, Math.min(14, cfg.water.bottom - line - 2))
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = this.alpha
    }
  }

  private drawLanterns(ctx: CanvasRenderingContext2D, cfg: Config) {
    const t = this.clock
    const glow = this.glowSprite()
    ctx.globalCompositeOperation = 'lighter'
    cfg.lanterns.forEach(([x, y, g], i) => {
      ctx.globalAlpha = this.alpha * (0.22 + 0.08 * Math.sin(t * 1.1 + i * 1.7) + 0.03 * Math.sin(t * 3.7 + i))
      ctx.drawImage(glow, x - g, y - g, g * 2, g * 2)
    })
    ctx.fillStyle = '#ffd890'
    cfg.sparks.forEach(([x, y], i) => {
      const a = 0.5 + 0.5 * Math.sin(t * (0.7 + seeded(i, 21) * 1.4) + i * 2.3)
      ctx.globalAlpha = this.alpha * (a * a * 0.5)
      ctx.fillRect(x - 1, y - 1, 3, 3)
    })
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = this.alpha
  }
}
