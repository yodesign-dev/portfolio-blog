// Lớp sông của cảnh phố cổ (/chill, điểm đến kiểu "oldtown"), vẽ chồng lên ảnh phố, dưới người đi bộ:
//
// - Mặt nước: các vệt sáng lăn tăn, đêm ấm theo đèn, mưa thành vòng nước li ti.
// - Đò: sprite boats.webp (2 loại, 4 khung chèo, nhìn sang phải), đi qua vài chục giây một lần,
//   có bóng dưới nước và vệt sóng phía sau. Đêm / mưa thì đèn mũi đò sáng và in xuống nước.
// - Đèn lồng: chỉ đêm. Đèn đã vẽ sẵn trong ảnh, lớp này cho chúng thở (quầng sáng) và lấp lánh.
// - Đèn hoa đăng trôi: chỉ đêm không mưa.
//
// Cùng lớp này cho Cần Thơ chợ nổi (công tắc Studio marketOpen, bộ ảnh cantho-river-*): bến
// Ninh Kiều nhìn ra chợ nổi, ghe đi ngang ở luồng gần bến; đêm thêm dải đèn LED cầu đi bộ đổi
// màu chầm chậm theo làn sóng dọc cầu (cả bóng đèn in dưới nước).
//
// Toạ độ theo px ảnh 1120×476. Chỉ bộ ảnh có trong RIVER (tra theo artOf) mới có lớp này.

import type {Destination} from './destinations'
import type {TimeOfDay, Weather} from './scene'

type Config = {
  water: {top: number; bottom: number}
  // Mép nước của các luồng đò, từ xa tới gần
  lanes: number[]
  // Đèn lớn phía gần [x, y, bán kính quầng]
  lanterns: [number, number, number][]
  // Đèn nhỏ, cửa sáng bờ bên kia (dò từ ảnh đêm)
  sparks: [number, number][]
  // Bóng LED trên cầu và bóng in dưới nước (dò từ ảnh đêm): đêm đổi màu theo làn sóng
  leds?: [number, number][]
  // Vùng có ghe vẽ sẵn (x0, y0, x1, y1): không gợn sáng, không vòng mưa, không hoa đăng trôi qua
  still?: [number, number, number, number][]
  // false: không thả hoa đăng
  drifts?: boolean
  // Bến ghé (thay cho luồng chạy ngang): đò vào từ một mép, chèo tới chỗ đậu, đậu một lúc rồi
  // quay mũi chèo ra lại mép đó — cho cảnh có ghe vẽ sẵn giữa sông, đò không đi xuyên qua.
  // line: mép nước; from: 1 = vào từ trái; stop: tâm đò lúc đậu (khoảng ngẫu nhiên); scale: đò xa nhỏ
  docks?: Dock[]
}

type Dock = {line: number; from: 1 | -1; stop: [number, number]; scale?: number}

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
  // Bến Ninh Kiều nhìn ra chợ nổi (ảnh hd/cantho-river-*). Ghe chợ vẽ sẵn giữa sông, đò chạy
  // ngang sẽ đâm xuyên qua, nên đò chỉ ghé chợ: vào từ mép trái trên mặt nước trống ô kính trái,
  // đậu chờ gần cụm ghe (mũi đò dừng trước x 240, khung hẹp vẫn thấy) rồi quay ra; xa xa dưới gầm cầu
  // bên phải thỉnh thoảng một xuồng nhỏ vào từ mép phải, đậu rồi quay ra (chỉ nước trống x > 925)
  'cantho-river': {
    water: {top: 226, bottom: 370},
    lanes: [],
    docks: [
      {line: 352, from: 1, stop: [115, 170]},
      {line: 282, from: -1, stop: [995, 1045], scale: 0.5},
    ],
    still: [[305, 228, 920, 372], [740, 190, 1120, 262]],
    drifts: false,
    lanterns: [
      // Đèn bến hai bên
      [89, 113, 40],
      [1027, 113, 40],
      // Trụ đèn búp sen trên cầu đi bộ, xa nhỏ gần lớn
      [760, 185, 18],
      [798, 168, 20],
      [836, 169, 20],
      [858, 149, 22],
      [913, 150, 22],
      [983, 134, 24],
      [1043, 139, 24],
      [1103, 138, 26],
      // Cửa sổ nhà sàn bờ bên kia
      [455, 214, 16],
      [569, 210, 14],
      [590, 209, 14],
      [630, 214, 16],
      [681, 218, 16],
      // Đèn dầu trên ghe chợ
      [421, 304, 20],
      [645, 308, 20],
      [511, 330, 18],
      // Bóng đèn bến in dưới nước
      [1042, 354, 22],
      [1104, 362, 22],
    ],
    sparks: [[21,172],[50,172],[80,172],[109,172],[137,172],[166,172],[207,172],[277,172],[322,172],[352,172],[236,173],[4,179],[10,179],[15,179],[21,179],[27,179],[48,179],[56,179],[61,179],[74,179],[81,179],[88,179],[95,179],[99,179],[104,179],[111,179],[116,179],[119,179],[128,180],[133,179],[147,179],[152,179],[157,179],[166,179],[171,179],[178,179],[185,179],[217,179],[228,179],[233,179],[239,179],[244,179],[250,179],[256,179],[263,179],[268,179],[274,179],[281,179],[287,179],[302,179],[307,179],[325,179],[331,179],[337,179],[343,179],[349,179],[361,179],[367,179],[520,212],[524,212],[495,214],[498,214],[693,214],[698,214],[4,242],[16,242],[44,242],[57,242],[63,242],[79,242],[84,242],[92,242],[96,242],[106,242],[109,242],[116,242],[121,242],[131,242],[137,242],[153,242],[173,242],[191,242],[206,242],[224,242],[20,246],[50,246],[80,246],[109,246],[137,246],[166,246],[206,246],[494,279],[495,282],[627,284],[499,283],[494,285],[421,298],[642,298],[635,300],[639,300],[646,301],[426,301],[430,304],[434,302],[643,302],[416,306],[637,305],[657,308],[526,309],[638,309],[511,324],[420,337],[420,340],[421,343],[647,346],[644,350],[875,352],[877,355],[512,355],[863,355],[512,359],[1048,358],[1043,362]],
    leds: [[758,224],[761,229],[763,228],[765,222],[766,226],[769,221],[770,224],[772,220],[774,222],[778,218],[779,222],[781,217],[784,224],[785,216],[788,215],[790,226],[792,214],[795,213],[796,222],[798,220],[800,219],[801,212],[805,217],[806,211],[811,210],[818,209],[822,213],[823,208],[826,208],[830,206],[836,205],[836,214],[842,215],[843,204],[846,217],[849,204],[850,218],[853,220],[855,202],[856,220],[860,202],[861,277],[862,219],[865,216],[869,214],[872,212],[874,211],[875,201],[879,210],[886,208],[894,208],[897,201],[904,208],[906,291],[908,208],[910,200],[911,292],[913,293],[924,200],[929,296],[931,208],[937,209],[937,295],[946,201],[946,210],[946,295],[951,307],[952,295],[953,211],[959,297],[960,214],[962,216],[964,201],[965,294],[966,218],[970,220],[971,293],[973,222],[974,292],[975,202],[976,225],[976,341],[978,277],[979,230],[979,339],[983,339],[984,204],[986,339],[988,340],[990,313],[990,343],[992,232],[992,291],[996,204],[996,230],[999,228],[1001,227],[1003,314],[1004,296],[1006,224],[1007,205],[1008,300],[1011,315],[1012,301],[1014,223],[1014,303],[1016,207],[1020,304],[1022,220],[1022,316],[1027,209],[1029,308],[1032,317],[1036,210],[1036,317],[1043,221],[1044,211],[1044,309],[1048,318],[1052,214],[1057,318],[1059,215],[1060,224],[1060,310],[1067,319],[1070,216],[1070,226],[1072,227],[1074,320],[1077,311],[1094,222],[1095,310],[1096,232],[1100,310],[1102,225],[1102,320],[1104,236],[1107,227],[1110,320],[1112,308],[1114,240],[1116,229],[1117,318],[1118,242],[1118,304],[1118,306]],
  },
}

// Điểm đến có bộ ảnh sông riêng sau công tắc Studio: id → mã bộ ảnh
export const RIVER_ART: Record<string, string> = {cantho: 'cantho-river'}

// Bật "Cần Thơ chợ nổi": Cần Thơ dùng bộ ảnh bến sông (public/chill/scenes/hd), thành cảnh ven
// sông kiểu phố cổ (cấm xe, người đi dạo trên bến). Bảng hiệu Studio của ảnh cũ không còn đúng
// chỗ nên bỏ, dùng SIGN_DEFAULTS của bộ ảnh mới
export function withRiverArt(list: Destination[], on: boolean): Destination[] {
  if (!on) return list
  return list.map((d) => {
    const art = RIVER_ART[d.id]
    if (!art) return d
    const streets = {
      morning: `/chill/scenes/hd/${art}-morning.webp`,
      afternoon: `/chill/scenes/hd/${art}-afternoon.webp`,
      night: `/chill/scenes/hd/${art}-night.webp`,
    }
    return {...d, art, streets, streetsHd: streets, scenery: 'oldtown', signs: undefined, tilt: undefined, laneShift: undefined}
  })
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

// line: mép nước; scale: đò xa nhỏ; dock: đò ghé bến (đang vào / đậu / ra) — đậu thì mái chèo nghỉ
type Boat = {x: number; dir: 1 | -1; speed: number; line: number; kind: 0 | 1; clock: number; scale: number; dock?: {i: number; stop: number; wait: number; phase: 'in' | 'wait' | 'out'}}
type Drift = {x: number; y: number; speed: number; phase: number; warm: number}

const seeded = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return s - Math.floor(s)
}
const between = ([a, b]: readonly number[]) => a + Math.random() * (b - a)
const WAIT = [8, 15] // đò ghé bến đậu bao lâu (giây)

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
      // (bến ghé: một chiếc đang đậu sẵn ở bến đầu)
      this.boats = !cfg
        ? []
        : cfg.docks
          ? [this.dockBoat(cfg.docks[0], 0, 'wait')]
          : [280, 760].map((x, i) => ({x, dir: (i ? -1 : 1) as 1 | -1, speed: between(SPEED), line: cfg.lanes[i ? 0 : 2], kind: (i ? 1 : 0) as 0 | 1, clock: i, scale: 1}))
      this.nextBoat = between(FIRST)
      this.drifts = cfg && cfg.drifts !== false
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

  // Đò ghé bến: phase 'in' vào từ mép, 'wait' đang đậu ở stop, 'out' quay mũi ra lại mép cũ
  private dockBoat(d: Dock, i: number, phase: 'in' | 'wait'): Boat {
    const scale = d.scale ?? 1
    const stop = between(d.stop)
    const x = phase === 'wait' ? stop : d.from > 0 ? (-CELL_W * scale) / 2 - 4 : 1120 + (CELL_W * scale) / 2 + 4
    const wait = phase === 'wait' ? between([3, 9]) : between(WAIT)
    return {x, dir: d.from, speed: between(SPEED) * (0.6 + 0.4 * scale), line: d.line, kind: Math.random() < 0.5 ? 1 : 0, clock: Math.random() * 3, scale, dock: {i, stop, wait, phase}}
  }

  // onBoat: đò vừa vào khung, len = số giây đò đi hết khung (cho tiếng mái chèo)
  update(dt: number, onBoat?: (dir: 1 | -1, len: number) => void) {
    if (!this.cfg) return
    this.clock += dt
    for (const b of this.boats) {
      b.clock += dt
      const dock = b.dock
      if (dock?.phase === 'wait') {
        if ((dock.wait -= dt) <= 0) {
          dock.phase = 'out'
          b.dir = -b.dir as 1 | -1
        }
        continue
      }
      b.x += b.dir * b.speed * dt
      if (dock?.phase === 'in' && b.dir * (b.x - dock.stop) >= 0) {
        b.x = dock.stop
        dock.phase = 'wait'
      }
    }
    this.boats = this.boats.filter((b) => b.x > -CELL_W && b.x < 1120 + CELL_W)
    this.nextBoat -= dt
    if (this.nextBoat <= 0) {
      this.nextBoat = between(EVERY) * (this.weather === 'rain' ? 2 : 1)
      const docks = this.cfg.docks
      if (docks) {
        // Mỗi bến một chiếc: bến còn trống thì có đò ghé
        const free = docks.map((_, i) => i).filter((i) => !this.boats.some((b) => b.dock?.i === i))
        if (free.length) {
          const i = free[Math.floor(Math.random() * free.length)]
          const b = this.dockBoat(docks[i], i, 'in')
          this.boats.push(b)
          if (b.scale === 1 && this.clock >= this.soundFree) {
            this.soundFree = this.clock + SOUND_GAP
            onBoat?.(b.dir, Math.abs(b.dock!.stop - b.x) / b.speed)
          }
        }
      } else {
      const lane = Math.floor(Math.random() * this.cfg.lanes.length)
      const dir = (Math.random() < 0.5 ? 1 : -1) as 1 | -1
      const from = dir > 0 ? 0 : 1120
      // Luồng đó có đò ở gần chỗ vào khung thì để lượt sau
      const line = this.cfg.lanes[lane]
      if (this.boats.length < MAX_BOATS && !this.boats.some((b) => b.line === line && Math.abs(b.x - from) < CELL_W * 2)) {
        const speed = between(SPEED)
        this.boats.push({x: dir > 0 ? -CELL_W / 2 - 4 : 1120 + CELL_W / 2 + 4, dir, speed, line, kind: Math.random() < 0.5 ? 1 : 0, clock: Math.random() * 3, scale: 1})
        if (this.clock >= this.soundFree) {
          this.soundFree = this.clock + SOUND_GAP
          onBoat?.(dir, (1120 + CELL_W) / speed)
        }
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
    if (this.time === 'night' && cfg.leds) this.drawLeds(ctx, cfg.leds)
    ctx.imageSmoothingEnabled = false
    for (const b of [...this.boats].sort((a, c) => a.line - c.line)) this.drawBoat(ctx, cfg, b)
    ctx.imageSmoothingEnabled = true
    if (this.time === 'night') this.drawLanterns(ctx, cfg)
    ctx.imageSmoothingEnabled = smooth
    ctx.restore()
  }

  private drawWater(ctx: CanvasRenderingContext2D, cfg: Config) {
    const {top, bottom} = cfg.water
    const t = this.clock
    const h = bottom - top
    const still = (x: number, y: number) => !!cfg.still?.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1)
    ctx.fillStyle = this.time === 'night' ? '#ffc27a' : this.time === 'afternoon' ? '#ffdcaa' : '#ffffff'
    const base = this.time === 'night' ? 0.34 : 0.2
    for (let i = 0; i < 64; i++) {
      const y = Math.round(top + 2 + seeded(i, 7) * (h - 4))
      const x = seeded(i, 8) * 1120 + Math.sin(t * 0.25 + i) * 10
      const a = Math.sin(t * (0.5 + seeded(i, 9)) + i * 2.1)
      if (a <= 0.15 || still(x, y)) continue
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
        if (still(x, y)) continue
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
    const k = b.scale
    const moored = b.dock?.phase === 'wait'
    // Đậu thì mái chèo nghỉ (khung đầu), chỉ còn nhấp nhô theo sóng
    const frame = moored ? 0 : FRAMES[Math.floor(b.clock * FPS) % FRAMES.length]
    const line = b.line + Math.round(Math.sin(b.clock * 1.4) * k)
    const w = Math.round(CELL_W * k)
    const keel = Math.round(spec.keel * k)
    const left = Math.round(b.x - w / 2)
    const top = line - keel
    const sx = frame * CELL_W
    // Bóng dưới nước, cắt theo mặt sông
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, line, 1120, cfg.water.bottom - line)
    ctx.clip()
    ctx.globalAlpha = this.alpha * (this.time === 'night' ? 0.22 : 0.28)
    ctx.translate(left + (b.dir < 0 ? w : 0), line)
    ctx.scale(b.dir, -1)
    ctx.drawImage(sheet, sx, spec.y, CELL_W, spec.keel, 0, 0, w, keel)
    ctx.restore()
    // Sóng sau đuôi (đậu thì không)
    ctx.fillStyle = this.time === 'night' ? '#b8c6e8' : '#ffffff'
    ctx.globalAlpha = this.alpha * 0.4
    const stern = b.x - (b.dir * w) / 2
    if (!moored)
      for (let i = 0; i < 3; i++) {
        const wobble = Math.sin(b.clock * 2 + i) * 2 * k
        ctx.fillRect(Math.round(stern - b.dir * (8 + i * 14) * k + wobble), line + 1 + i, Math.max(2, Math.round((12 - i * 3) * k)), 1)
      }
    ctx.globalAlpha = this.alpha
    ctx.save()
    ctx.translate(left + (b.dir < 0 ? w : 0), top)
    ctx.scale(b.dir, 1)
    ctx.drawImage(sheet, sx, spec.y, CELL_W, spec.h, 0, 0, w, Math.round(spec.h * k))
    ctx.restore()
    // Đèn mũi đò
    if (this.time === 'night' || this.weather === 'rain') {
      const lx = b.dir > 0 ? left + spec.lamp[0] * k : left + w - spec.lamp[0] * k
      const ly = top + spec.lamp[1] * k
      const g = 16 * k
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = this.alpha * 0.9
      ctx.drawImage(this.glowSprite(), lx - g, ly - g, g * 2, g * 2)
      ctx.fillStyle = '#ffb060'
      ctx.globalAlpha = this.alpha * 0.5
      ctx.fillRect(lx - 1, line + 2, Math.max(1, Math.round(3 * k)), Math.min(14 * k, cfg.water.bottom - line - 2))
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = this.alpha
    }
  }

  // LED cầu đi bộ: mỗi bóng một màu theo làn sóng chạy dọc cầu, đổi chầm chậm (hồng → tím →
  // xanh ngọc → vàng…). Bóng in dưới nước (dưới mép cầu) nhạt hơn và lăn tăn
  private drawLeds(ctx: CanvasRenderingContext2D, leds: [number, number][]) {
    const t = this.clock
    leds.forEach(([x, y], i) => {
      const hue = (((300 + t * 8 - x * 0.5) % 360) + 360) % 360
      const water = y > 250
      const color = `hsl(${hue.toFixed(0)},75%,72%)`
      const k = water ? 0.45 + 0.25 * Math.sin(t * 3 + i * 1.3) : 0.95
      ctx.globalAlpha = this.alpha * k
      ctx.fillStyle = color
      ctx.fillRect(x - 1, y - 1, 2, 2)
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = this.alpha * k * 0.28
      ctx.fillRect(x - 2, y - 2, 4, 4)
      ctx.globalCompositeOperation = 'source-over'
    })
    ctx.globalAlpha = this.alpha
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
