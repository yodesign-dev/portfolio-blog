// Bộ trang trí Noel của /chill, vẽ đè lên cảnh, không sửa ảnh nào, hết mùa tắt là sạch.
//
// Chất Noel Việt: đèn nháy buộc vào đúng mớ dây điện của phố, tuyết xịt góc kính + bông gòn
// trên bậu, cây thông nhựa kiểu Hàng Mã treo quà giấy báo. Không có tuyết thật: tuyết ở đây
// là bọt từ máy của quán (tối 24–25/12) và sau mỗi phin xong.
//
// Mọi toạ độ theo px đệm 1280×720 (1 px ảnh phố 1120 = 1 px đệm, lệch 80 / 24).
// Mỗi nhịp một loại: đèn là nền, sao băng là bất ngờ, tuyết là phần thưởng.
// Đang pha phin: đèn sáng đều, không sao băng, tuyết còn 1/3 và rơi chậm một nửa.

import type {TimeOfDay, Weather} from './scene'
import type {ThemeId} from './themes'
import type {SeasonLayers} from './season'

export type NoelConfig = {
  layers: SeasonLayers
  quiet: boolean // khách chọn Yên tĩnh: trang trí đứng yên
  foam: boolean // đang trong giờ tuyết bọt
  shower: boolean // đang trong đêm mưa sao băng
  fast: boolean // xem trước: sao băng dày để soi
}

type Pt = [number, number]
type Wash = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

const W = 1280
const H = 720
const IMG_DX = 80
const IMG_DY = 24

// Dây điện từng cảnh, dò theo ảnh đêm (px ảnh 1120)
const WIRES: Record<string, Pt[][]> = {
  'hanoi-tau': [
    [[340, 114], [388, 121], [436, 128], [484, 131], [532, 136], [580, 138], [628, 141], [676, 141], [724, 143], [772, 143], [820, 143], [868, 142], [916, 139], [964, 136], [1012, 132], [1060, 128], [1116, 119]],
    [[340, 155], [388, 173], [436, 182], [484, 189], [532, 195], [580, 199], [628, 202], [676, 204], [724, 205], [772, 205], [820, 204], [868, 203], [916, 200], [964, 196], [1012, 189], [1060, 181], [1116, 167]],
  ],
  saigon: [
    [[356, 119], [404, 127], [452, 132], [500, 136], [548, 138], [596, 142], [644, 143], [692, 144], [740, 144], [788, 145], [836, 144], [884, 144], [932, 141], [980, 138], [1028, 134], [1076, 129], [1116, 122]],
    [[356, 167], [404, 180], [452, 188], [500, 195], [548, 198], [596, 204], [644, 206], [692, 208], [740, 208], [788, 208], [836, 208], [884, 205], [932, 203], [980, 198], [1028, 191], [1076, 182], [1116, 173]],
  ],
  danang: [
    [[348, 136], [396, 144], [444, 152], [492, 158], [540, 164], [588, 168], [636, 172], [684, 174], [732, 175], [780, 175], [828, 175], [876, 172], [924, 168], [972, 163], [1020, 156], [1068, 145], [1116, 136]],
  ],
  nhatrang: [
    [[348, 125], [396, 135], [444, 142], [492, 148], [540, 152], [588, 156], [636, 157], [684, 159], [732, 159], [780, 159], [828, 158], [876, 156], [924, 154], [972, 149], [1020, 144], [1068, 137], [1116, 128]],
    [[348, 136], [396, 145], [444, 153], [492, 160], [540, 165], [588, 169], [636, 172], [684, 174], [732, 175], [780, 175], [828, 174], [876, 171], [924, 168], [972, 161], [1020, 155], [1068, 145], [1116, 135]],
  ],
  cantho: [
    [[348, 124], [396, 133], [444, 141], [492, 146], [540, 152], [588, 155], [636, 157], [684, 158], [732, 158], [780, 158], [828, 157], [876, 157], [924, 153], [972, 150], [1020, 144], [1068, 139], [1116, 128]],
    [[348, 134], [396, 145], [444, 153], [492, 159], [540, 164], [588, 169], [636, 172], [684, 174], [732, 175], [780, 175], [828, 174], [876, 172], [924, 167], [972, 162], [1020, 155], [1068, 145], [1116, 135]],
  ],
  tiengiang: [
    [[352, 118], [400, 126], [448, 131], [496, 134], [544, 138], [592, 141], [640, 141], [688, 143], [736, 144], [784, 144], [832, 144], [880, 143], [928, 141], [968, 139]],
    [[352, 136], [400, 145], [448, 153], [496, 159], [544, 165], [592, 169], [640, 171], [688, 173], [736, 174], [784, 175], [832, 174], [880, 172], [928, 168], [968, 163]],
  ],
  // Huế: dây ngắn bên phải, thêm đèn dọc đỉnh tường thành hai bên cổng
  hue: [
    [[700, 171], [748, 176], [796, 179], [844, 179], [892, 179], [940, 176], [988, 171], [1036, 165], [1068, 158]],
    [[8, 305], [120, 305], [240, 305], [360, 305], [466, 305]],
    [[652, 305], [760, 305], [862, 305]],
  ],
  dalat: [[[520, 140], [568, 146], [616, 150], [664, 153], [712, 155], [760, 155], [808, 153], [856, 151], [904, 148], [952, 143], [1000, 138], [1048, 129], [1096, 121], [1112, 117]]],
  'dalat-mist': [
    [[520, 137], [568, 137], [616, 139], [664, 141], [712, 141], [760, 141], [808, 139], [856, 137], [904, 133], [952, 130], [1000, 124], [1048, 118], [1096, 110], [1112, 107]],
    // Lan can sắt mép đồi
    [[516, 322], [620, 322], [720, 318], [800, 314], [900, 308]],
  ],
  // Miền Tây không có dây điện: đèn dọc thành cầu tre
  mientay: [[[214, 296], [256, 288], [300, 284], [344, 286], [392, 292]]],
}

// Đèn nhỏ quấn tán cây: tâm, bán kính (px ảnh), số bóng
const CANOPY: Record<string, [number, number, number, number, number][]> = {
  'hanoi-tau': [[130, 135, 115, 80, 34]],
  saigon: [[130, 135, 115, 85, 34]],
  danang: [[120, 125, 110, 85, 34]],
  nhatrang: [[120, 140, 115, 85, 34]],
  cantho: [[120, 140, 115, 85, 34]],
  tiengiang: [[120, 140, 115, 85, 34]],
  hue: [[190, 125, 180, 105, 44]],
  // Thông là cây Noel có sẵn ngoài đồi
  dalat: [[118, 262, 55, 110, 24]],
  'dalat-mist': [[100, 340, 95, 60, 26]],
  mientay: [[105, 80, 62, 36, 14], [300, 60, 60, 34, 12], [1062, 236, 34, 12, 8]],
}

const WARM = '#ffd98f'
const COLORS = [WARM, WARM, WARM, '#ff6a55', '#6fe09a', WARM, '#ffc23d']

type RoomSpec = {
  panes: Pt[]
  paneY: Pt | null
  cotton: number
  tree: Pt
  garland: Pt[][]
  baked: Pt[]
}

const sag = (x0: number, x1: number, y: number, d: number): Pt[] => {
  const out: Pt[] = []
  for (let x = x0; x <= x1; x += 4) {
    const k = (x - x0) / (x1 - x0)
    out.push([x, Math.round(y + d * 4 * k * (1 - k))])
  }
  return out
}

const ROOMS: Record<ThemeId, RoomSpec> = {
  cafe: {
    panes: [[97, 404], [484, 798], [875, 1183]],
    paneY: [60, 496],
    cotton: 500,
    // Trên bàn, giữa mèo và phin: màn hẹp, điện thoại vẫn thấy, cần câu dựng tựa vào cây
    tree: [420, 588],
    garland: [sag(58, 440, 24, 26), sag(440, 838, 24, 26), sag(838, 1222, 24, 26)],
    baked: [],
  },
  desk: {
    panes: [[487, 798], [875, 1182]],
    paneY: [60, 498],
    cotton: 503,
    // Trên bậu cửa, giữa mèo và laptop
    tree: [790, 534],
    garland: [],
    // Ảnh phòng này đã vẽ sẵn dây đèn: chỉ cho bóng sáng theo giờ
    baked: [[240, 107], [287, 103], [335, 93], [373, 72], [407, 42], [232, 152], [235, 207], [230, 262], [195, 312], [157, 333], [112, 349], [66, 360], [22, 360]],
  },
  balcony: {
    panes: [],
    paneY: null,
    cotton: 0,
    // Trên ghế nhựa đỏ
    tree: [745, 634],
    garland: [sag(226, 900, 4, 18), ...[100, 240, 380, 520, 660, 800].map((x) => sag(x, x + 140, 392, 14))],
    baked: [],
  },
}

function rng(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

function lerp(pts: Pt[], x: number) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = pts[i]
    const [c, d] = pts[i + 1]
    if (x >= a && x <= c) return b + ((d - b) * (x - a)) / (c - a)
  }
  return pts[pts.length - 1][1]
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

const rgbOf = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}

// Quầng sáng dựng sẵn cho từng màu: 150 bóng mỗi khung không phải tạo gradient
const glowCache = new Map<string, HTMLCanvasElement>()
function glowSprite(color: string) {
  let c = glowCache.get(color)
  if (!c) {
    c = canvas(64, 64)
    const g = c.getContext('2d')!
    const [r, gr, b] = rgbOf(color)
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, `rgba(${r},${gr},${b},1)`)
    grad.addColorStop(0.35, `rgba(${r},${gr},${b},0.42)`)
    grad.addColorStop(1, `rgba(${r},${gr},${b},0)`)
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    glowCache.set(color, c)
  }
  return c
}

type Bulb = {x: number; y: number; c: string; p: number; s: number; tiny?: boolean}

function bulbsOf(place: string) {
  const r = rng(place.length * 977 + place.charCodeAt(0) * 31 + 7)
  const out: Bulb[] = []
  ;(WIRES[place] ?? []).forEach((w, k) => {
    for (let x = w[0][0] + (k ? 13 : 0); x <= w[w.length - 1][0]; x += 26) {
      out.push({x: x + IMG_DX, y: Math.round(lerp(w, x)) + IMG_DY + 2, c: COLORS[Math.floor(r() * COLORS.length)], p: r() * 6.28, s: 0.35 + r() * 0.35})
    }
  })
  for (const [cx, cy, rx, ry, n] of CANOPY[place] ?? []) {
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28
      const d = Math.sqrt(r())
      out.push({x: Math.round(cx + Math.cos(a) * d * rx) + IMG_DX, y: Math.round(cy + Math.sin(a) * d * ry) + IMG_DY, c: WARM, p: r() * 6.28, s: 0.3 + r() * 0.3, tiny: true})
    }
  }
  return out
}

function starSprite(R: number) {
  const S = R * 2 + 8
  const c = canvas(S, S)
  const g = c.getContext('2d')!
  const pts: Pt[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 ? R * 0.45 : R
    pts.push([S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r])
  }
  const inside = (x: number, y: number) => {
    let o = false
    for (let i = 0, j = 9; i < 10; j = i++) {
      const [a, b] = pts[i]
      const [e, f] = pts[j]
      if (b > y !== f > y && x < ((e - a) * (y - b)) / (f - b) + a) o = !o
    }
    return o
  }
  for (let y = 0; y < S; y += 2)
    for (let x = 0; x < S; x += 2) {
      if (!inside(x + 1, y + 1)) continue
      const edge = !inside(x - 1, y + 1) || !inside(x + 3, y + 1) || !inside(x + 1, y - 1) || !inside(x + 1, y + 3)
      g.fillStyle = edge ? '#c98f3a' : '#fff1c9'
      g.fillRect(x, y, 2, 2)
    }
  return c
}

// Món treo lên cây theo thứ tự: mỗi phin xong thêm một món
const ORNAMENTS: [number, number, string][] = [
  [-18, -44, 'gift'],
  [16, -36, 'red'],
  [-30, -24, 'cup'],
  [26, -16, 'gold'],
  [-4, -70, 'star'],
  [12, -90, 'red'],
  [-12, -98, 'gold'],
  [0, -24, 'gift2'],
]

// Món treo: viền tối rõ, ô 2 px, đọc được ở cỡ thật
function ornament(g: CanvasRenderingContext2D, x: number, y: number, k: string, tip: HTMLCanvasElement) {
  const c = (col: string, a: number, b: number, w: number, h: number) => {
    g.fillStyle = col
    g.fillRect(x + a, y + b, w, h)
  }
  const O = '#22120f'
  if (k === 'star') {
    g.drawImage(tip, x - 13, y - 3)
    return
  }
  c(O, 0, -4, 2, 4)
  if (k === 'red' || k === 'gold') {
    const [m, d, l] = k === 'red' ? ['#e23a33', '#a11f25', '#ffb0a0'] : ['#f4c44a', '#b8821f', '#fff0b8']
    c(O, -4, 0, 10, 12)
    c(O, -6, 2, 14, 8)
    c(m, -4, 2, 10, 8)
    c(m, -2, 0 + 2, 6, 8)
    c(d, 2, 6, 4, 4)
    c(d, -2, 8, 6, 2)
    c(l, -2, 2, 4, 2)
  } else if (k === 'cup') {
    c(O, -6, -2, 14, 14)
    c(O, 8, 0, 4, 8)
    c('#fbf6ea', -4, 0, 10, 10)
    c('#3f74c4', -4, 4, 10, 2)
    c('#fbf6ea', 8, 2, 2, 4)
  } else {
    const [m, d, l] = k === 'gift' ? ['#f6edd8', '#c9bda2', '#d8362c'] : ['#5fbf85', '#3a8a5c', '#fff1c9']
    c(O, -8, -2, 18, 16)
    c(m, -6, 0, 14, 12)
    c(d, 2, 8, 6, 4)
    c(l, 0, 0, 2, 12)
    c(l, -6, 4, 14, 2)
    c(O, -5, -6, 5, 4)
    c(O, 2, -6, 5, 4)
    c(l, -4, -4, 3, 2)
    c(l, 3, -4, 3, 2)
  }
}

// Cây thông vẽ tay theo ô 2 px: 3 tầng lá viền mép răng cưa, mỗi tầng có bóng tầng trên đổ xuống,
// sáng phía đèn, mép dưới có tuyết, dây kim tuyến chéo. `upto` = số món đã treo
const TIERS = [[-122, -80, 28], [-98, -50, 38], [-72, -18, 48]] as const

function tierEdge(x: number, bot: number, hw: number) {
  const n = hw / 3
  return bot - Math.round(Math.abs(Math.sin((x / n) * Math.PI)) * 3) * 2
}

function paintTree(g: CanvasRenderingContext2D, cx: number, base: number, upto: number, tip: HTMLCanvasElement) {
  const OUT = '#0b2019'
  const P = ['#14432f', '#1f6443', '#2f8a58', '#5cc07e']
  const SNOW = '#e8f2ea'
  const dot = (col: string, x: number, y: number, w = 2, h = 2) => {
    g.fillStyle = col
    g.fillRect(x, y, w, h)
  }
  // Chậu đất nung
  dot('#22120f', cx - 20, base - 26, 40, 8)
  dot('#d98a52', cx - 18, base - 24, 36, 4)
  dot('#22120f', cx - 17, base - 18, 34, 18)
  dot('#c0703d', cx - 15, base - 18, 30, 16)
  dot('#964f29', cx + 5, base - 18, 10, 16)
  dot('#e29c68', cx - 12, base - 16, 4, 10)
  dot('#3a2415', cx - 5, base - 34, 10, 8)
  const b = base - 24
  const inside = (x: number, y: number, top: number, bot: number, hw: number) => {
    if (y < top) return false
    const k = (y - top) / (bot - top)
    const w = hw * Math.min(1, k)
    return Math.abs(x) <= w && y <= tierEdge(x, bot, hw)
  }
  // Tầng dưới vẽ trước; viền trước rồi tới lá, tầng trên đè lên
  TIERS.slice().reverse().forEach(([top, bot, hw], idx, arr) => {
    const upper = arr[idx + 1]
    for (let y = top - 2; y <= bot + 2; y += 2) {
      for (let x = -hw - 2; x <= hw + 2; x += 2) {
        if (inside(x, y, top, bot, hw)) continue
        if ([[2, 0], [-2, 0], [0, 2], [0, -2]].some(([a, c]) => inside(x + a, y + c, top, bot, hw))) dot(OUT, cx + x, b + y)
      }
    }
    for (let y = top; y <= bot; y += 2) {
      for (let x = -hw; x <= hw; x += 2) {
        if (!inside(x, y, top, bot, hw)) continue
        const edge = tierEdge(x, bot, hw)
        const shadow = upper && y < tierEdge(x, upper[1], upper[2]) + 10
        const l = (-x / hw) * 0.55 + 0.45
        const needle = ((x + y) / 2) % 8 === 0
        let col = l > 0.62 ? P[2] : l > 0.2 ? P[1] : P[0]
        if (needle) col = l > 0.45 ? P[3] : P[1]
        if (shadow) col = P[0]
        if (y >= edge - 2) col = (x + hw) % 12 < 6 ? SNOW : P[3]
        dot(col, cx + x, b + y)
      }
    }
  })
  // Dây kim tuyến chéo qua hai tầng dưới
  for (const [x0, y0, x1] of [[-30, -60, 30], [-40, -32, 40]]) {
    for (let x = x0; x <= x1; x += 2) {
      const t = (x - x0) / (x1 - x0)
      const y = Math.round(y0 + t * 12 + Math.sin(t * Math.PI) * 6) & ~1
      dot(x % 4 === 0 ? '#ffe08a' : '#d9a640', cx + x, b + y)
    }
  }
  for (let i = 0; i < upto && i < ORNAMENTS.length; i++) ornament(g, cx + ORNAMENTS[i][0], b + ORNAMENTS[i][1] + 2, ORNAMENTS[i][2], tip)
  if (upto >= ORNAMENTS.length) {
    dot('#22120f', cx - 42, base - 14, 22, 14)
    dot('#f6edd8', cx - 40, base - 12, 18, 12)
    dot('#d8362c', cx - 32, base - 12, 3, 12)
    dot('#d8362c', cx - 40, base - 7, 18, 2)
    dot('#22120f', cx + 20, base - 12, 18, 12)
    dot('#5fbf85', cx + 22, base - 10, 14, 10)
    dot('#fff1c9', cx + 28, base - 10, 2, 10)
  }
  g.drawImage(tip, cx - 13, b - 136)
}

const TREE_DOTS = (() => {
  const r = rng(66)
  const out: {dx: number; dy: number; p: number; s: number}[] = []
  for (let i = 0; i < 16; i++) {
    const y = -116 + r() * 96
    const w = (y + 122) * 0.4
    out.push({dx: Math.round((r() * 2 - 1) * w), dy: Math.round(y), p: r() * 6.28, s: 0.3 + r() * 0.3})
  }
  return out
})()

// Tuyết bọt: ba lớp sâu cho có chiều sâu. Xa nhỏ, mờ, chậm; gần to, mềm, có quầng
type Flake = {x: number; y: number; z: 0 | 1 | 2; v: number; p: number; f: number; a: number}
const FLAKES: {z: 0 | 1 | 2; n: number}[] = [
  {z: 0, n: 130},
  {z: 1, n: 85},
  {z: 2, n: 28},
]

type Meteor = {x: number; y: number; dx: number; dy: number; len: number; t: number; dur: number}

type View = {x: number; y: number; w: number; h: number}

export type NoelFrame = {time: TimeOfDay; weather: Weather; theme: ThemeId; streetDy: number; view: View; place: string; street: HTMLImageElement | null; paused: boolean}

export class Noel {
  private cfg: NoelConfig
  private clock = 0
  private f: NoelFrame | null = null
  private brewing = false
  private bulbs = new Map<string, Bulb[]>()
  private flakes: Flake[] = []
  private snow = 0
  private burst = 0
  private count = 0
  private hangT = -1
  private spray = new Map<string, HTMLCanvasElement>()
  private cottonKey = ''
  private cotton: HTMLCanvasElement | null = null
  private treeKey = ''
  private treeLayer: HTMLCanvasElement | null = null
  private tip = starSprite(9)
  private meteor: Meteor | null = null
  private nextMeteor: number
  private trail: HTMLCanvasElement | null = null
  private sky: {src: string; mask: HTMLCanvasElement | null} | null = null
  private rand = rng(4711)

  constructor(cfg: NoelConfig) {
    this.cfg = cfg
    this.nextMeteor = cfg.fast ? 3 : 45 + this.rand() * 75
    const r = rng(55)
    for (const {z, n} of FLAKES) {
      for (let i = 0; i < n; i++) {
        this.flakes.push({x: r() * W, y: r() * H, z, v: [11, 20, 34][z] * (0.8 + r() * 0.4), p: r() * 6.28, f: 0.25 + r() * 0.45, a: 0.7 + r() * 0.3})
      }
    }
    // Trộn thứ tự để lúc tuyết thưa vẫn đủ cả ba lớp
    this.flakes.sort((a, b) => a.p - b.p)
  }

  configure(cfg: NoelConfig) {
    if (cfg.fast && !this.cfg.fast) this.nextMeteor = 3
    this.cfg = cfg
  }

  setBrewing(on: boolean) {
    this.brewing = on
  }

  setTree(count: number, animate = false) {
    if (count === this.count) return
    this.count = count
    this.treeKey = ''
    this.hangT = animate ? 0 : -1
  }

  // Phin xong: tuyết rơi 20 giây, đúng lúc khách nghỉ
  celebrate() {
    this.burst = 20
  }

  // Ông già Noel chỉ đi ngang khi khách không pha phin, không chọn Yên tĩnh
  get santaOn() {
    return this.cfg.layers.santa && !this.still
  }

  // Một đầu máy hoặc toa tàu mang dây đèn dọc mép mái, đầu máy thêm vòng nguyệt quế. Vẽ theo ô
  // lưới phố, trong hệ của drawTrain nên tàu đi ngược chiều tự lật theo
  drawTrainUnit(ctx: CanvasRenderingContext2D, loco: boolean, x: number, y: number, w: number, h: number) {
    if (!this.f || !this.cfg.layers.trainLights) return
    const lv = this.level()
    const still = this.still
    const COLORS = ['#ffc16e', '#ff5a4c', '#ffc16e', '#6ee39a']
    const top = y + h * (loco ? 0.12 : 0.145)
    const x0 = x + w * 0.04
    const x1 = x + w * (loco ? 0.84 : 0.96)
    const spans = Math.max(1, Math.round((x1 - x0) / 5))
    const step = (x1 - x0) / spans
    const sag = (u: number) => Math.sin(((u - x0) / step) * Math.PI) ** 2 * 0.9
    ctx.fillStyle = 'rgba(24,18,16,0.9)'
    for (let u = x0; u < x1; u += 0.25) ctx.fillRect(u, top + sag(u), 0.25, 0.25)
    const bulbs = spans * 2
    for (let i = 0; i <= bulbs; i++) {
      const u = x0 + (i * (x1 - x0)) / bulbs
      const v = top + sag(u) + 0.25
      const c = COLORS[i % COLORS.length]
      const breath = still ? 0.82 : 0.66 + 0.34 * Math.sin(this.clock * 1.1 + i * 2.1)
      if (lv > 0.05) {
        const R = 2.6
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = Math.min(1, 0.7 * breath * lv)
        ctx.drawImage(glowSprite(c), u - R + 0.25, v - R + 0.25, R * 2, R * 2)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
      }
      ctx.fillStyle = lv > 0.5 ? c : mixHex(c, '#6e6358', 0.3)
      ctx.fillRect(u, v, 0.5, 0.5)
    }
    if (loco) this.drawWreath(ctx, x + w * 0.865, y + h * 0.47, lv > 0.5)
  }

  private drawWreath(ctx: CanvasRenderingContext2D, cx: number, cy: number, night: boolean) {
    const q = 0.25
    const dim = (c: string) => (night ? mixHex(c, '#1a1a3a', 0.35) : c)
    const rows = ['..oooo..', '.oGGGGo.', 'oGLooGGo', 'oGo..oGo', 'oGo..oGo', 'oGGooGLo', '.oGRRGo.', '..oRRo..']
    const pal: Record<string, string> = {o: '#10261b', G: '#2f8a58', L: '#5cc07e', R: '#e23a33'}
    rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        const c = pal[r[i]]
        if (!c) continue
        ctx.fillStyle = dim(c)
        ctx.fillRect(cx + (i - 4) * q, cy + (j - 4) * q, q, q)
      }
    })
  }

  // Độ đậm quầng đèn trên người ngồi: thở chậm theo đèn dây, đứng yên khi Yên tĩnh hoặc đang pha phin
  seatGlow(t: number) {
    if (!this.cfg.layers.lights) return 0
    return this.still ? 0.85 : 0.8 + 0.2 * Math.sin(t * 0.8)
  }

  private get still() {
    return this.brewing || this.cfg.quiet || !!this.f?.paused
  }

  update(dt: number, f: NoelFrame) {
    this.f = f
    this.clock += dt
    const frozen = this.cfg.quiet || f.paused
    if (this.burst > 0 && !frozen) this.burst = Math.max(0, this.burst - dt)
    if (this.hangT >= 0) {
      this.hangT += dt
      if (this.hangT > 4) {
        this.hangT = -1
        this.treeKey = ''
      }
    }

    // Tuyết: lên xuống mềm trong vài giây, mưa thì không có
    let target = 0
    if (this.cfg.layers.snow && f.weather !== 'rain') {
      if (this.burst > 0) target = 1
      else if (this.cfg.foam) target = this.brewing || frozen ? 0.33 : 1
    }
    this.snow += (target - this.snow) * Math.min(1, dt / 2.5)
    if (!frozen && this.snow > 0.005) {
      const speed = this.brewing ? 0.5 : 1
      for (const s of this.flakes) {
        s.y += s.v * speed * dt
        if (s.y > H) {
          s.y -= H
          s.x = this.rand() * W
        }
      }
    }

    // Sao băng: đêm trời quang, không trong phin
    if (this.meteor) {
      this.meteor.t += dt
      if (this.meteor.t > this.meteor.dur) this.meteor = null
    } else if (this.cfg.layers.meteors && f.time === 'night' && f.weather === 'clear' && !this.still) {
      this.nextMeteor -= dt
      if (this.nextMeteor <= 0) this.launch(f)
    }
    if (f.time === 'night' && f.street && this.cfg.layers.meteors) this.prepareSky(f.street)
  }

  private launch(f: NoelFrame) {
    const r = this.rand
    const dir = r() < 0.75 ? -1 : 1
    const top = Math.max(f.view.y, IMG_DY + f.streetDy) + 4
    this.meteor = {
      x: f.view.x + f.view.w * (dir < 0 ? 0.35 + r() * 0.6 : r() * 0.6),
      y: top + r() * 40,
      dx: dir * (170 + r() * 110),
      dy: 42 + r() * 40,
      len: 56 + r() * 44,
      t: 0,
      dur: 0.9 + r() * 0.5,
    }
    const fast = this.cfg.fast
    const shower = this.cfg.shower
    this.nextMeteor = fast ? 8 : shower ? 25 + r() * 35 : 300 + r() * 300
  }

  // Mặt nạ vùng trời: loang từ mép trên qua các pixel màu trời, để sao băng đi sau nhà, cột điện
  private prepareSky(img: HTMLImageElement) {
    if (this.sky?.src === img.src) return
    const slot: {src: string; mask: HTMLCanvasElement | null} = {src: img.src, mask: null}
    this.sky = slot
    const cors = new Image()
    cors.crossOrigin = 'anonymous'
    cors.onload = () => {
      const w = cors.naturalWidth
      const h = cors.naturalHeight
      const c = canvas(w, h)
      const cx = c.getContext('2d', {willReadFrequently: true})!
      cx.drawImage(cors, 0, 0)
      let data: Uint8ClampedArray
      try {
        data = cx.getImageData(0, 0, w, h).data
      } catch {
        return
      }
      const sky = new Uint8Array(w * h)
      const isSky = (p: number) => {
        const i = p * 4
        return data[i + 2] - data[i] > 10 && data[i] < 120
      }
      const stack: number[] = []
      for (let x = 0; x < w; x++) if (isSky(x)) stack.push(x)
      while (stack.length) {
        const p = stack.pop()!
        if (sky[p]) continue
        sky[p] = 1
        const x = p % w
        if (x > 0 && !sky[p - 1] && isSky(p - 1)) stack.push(p - 1)
        if (x < w - 1 && !sky[p + 1] && isSky(p + 1)) stack.push(p + 1)
        if (p >= w && !sky[p - w] && isSky(p - w)) stack.push(p - w)
        if (p + w < w * h && !sky[p + w] && isSky(p + w)) stack.push(p + w)
      }
      const out = cx.createImageData(w, h)
      for (let p = 0; p < w * h; p++) out.data[p * 4 + 3] = sky[p] ? 255 : 0
      cx.putImageData(out, 0, 0)
      slot.mask = c
    }
    cors.src = img.src
  }

  private level() {
    const f = this.f!
    const base = f.time === 'night' ? 1 : f.time === 'afternoon' ? 0.3 : 0.08
    return f.weather === 'rain' && f.time !== 'night' ? Math.max(base, 0.35) : base
  }

  private drawBulb(ctx: CanvasRenderingContext2D, b: Bulb, lv: number) {
    const t = this.clock
    const still = this.still
    const breath = still ? 0.82 : 0.66 + 0.34 * Math.sin(t * b.s * 1.6 + b.p)
    if (lv > 0.05) {
      const R = (b.tiny ? 11 : 20) * (0.92 + 0.08 * breath)
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = Math.min(1, 0.62 * breath * lv)
      ctx.drawImage(glowSprite(b.c), b.x - R + 1, b.y + 2 - R, R * 2, R * 2)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }
    // Bóng nhỏ trên cây: không đui đen, ban ngày vẫn là chấm vàng
    if (b.tiny) {
      ctx.fillStyle = lv > 0.5 ? b.c : '#ffd98a'
      ctx.fillRect(b.x, b.y + 1, 2, 2)
    } else {
      ctx.fillStyle = '#231c18'
      ctx.fillRect(b.x, b.y - 1, 2, 2)
      ctx.fillStyle = lv > 0.5 ? b.c : mixHex(b.c, '#6e6358', 0.45 - lv * 0.4)
      ctx.fillRect(b.x - 1, b.y + 1, 4, 5)
      if (lv > 0.5) {
        ctx.fillStyle = '#fff6da'
        ctx.fillRect(b.x, b.y + 2, 2, 2)
      }
    }
    // Lấp lánh: thỉnh thoảng một bóng lóe chữ thập rồi tắt dần, không nháy đồng loạt
    if (!still && lv > 0.5) {
      const g = (Math.sin(t * 0.55 + b.p * 7) - (b.tiny ? 0.992 : 0.985)) / (b.tiny ? 0.008 : 0.015)
      if (g > 0) {
        const len = b.tiny ? 2 + Math.round(g * 3) : 3 + Math.round(g * 5)
        ctx.globalAlpha = Math.min(1, g * 1.4)
        ctx.fillStyle = '#fffbe8'
        ctx.fillRect(b.x - len + 1, b.y + 2, len * 2, 2)
        ctx.fillRect(b.x, b.y + 3 - len, 2, len * 2)
        ctx.globalAlpha = 1
      }
    }
  }

  // Trong khung cửa sổ, sau xe cộ và thời tiết
  drawStreet(ctx: CanvasRenderingContext2D) {
    const f = this.f
    if (!f) return
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.drawMeteor(ctx, f)
    if (this.cfg.layers.lights) {
      let list = this.bulbs.get(f.place)
      if (!list) {
        list = bulbsOf(f.place)
        this.bulbs.set(f.place, list)
      }
      ctx.translate(0, f.streetDy)
      const lv = this.level()
      for (const b of list) this.drawBulb(ctx, b, lv)
      ctx.translate(0, -f.streetDy)
    }
    this.drawSnow(ctx, f, [0, 1])
    if (f.theme !== 'balcony') this.drawSnow(ctx, f, [2])
    ctx.restore()
  }

  private drawMeteor(ctx: CanvasRenderingContext2D, f: NoelFrame) {
    const m = this.meteor
    if (!m) return
    this.trail ??= canvas(W, H)
    const g = this.trail.getContext('2d')!
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'source-over'
    g.clearRect(0, 0, W, H)
    const k = m.t / m.dur
    const e = 1 - (1 - k) * (1 - k)
    const hx = m.x + m.dx * e
    const hy = m.y + m.dy * e
    const fade = Math.min(1, k * 6) * Math.min(1, (1 - k) * 3.5)
    const n = Math.round(m.len / 2)
    const ux = m.dx / Math.hypot(m.dx, m.dy)
    const uy = m.dy / Math.hypot(m.dx, m.dy)
    for (let i = n; i >= 0; i--) {
      const a = (1 - i / n) ** 1.6 * fade
      g.fillStyle = `rgba(255,${240 - i},${215 - i * 2},${a})`
      const x = Math.round((hx - ux * i * 2) / 2) * 2
      const y = Math.round((hy - uy * i * 2) / 2) * 2
      g.fillRect(x, y, 2, i < 3 ? 4 : 2)
    }
    g.globalCompositeOperation = 'lighter'
    g.globalAlpha = 0.8 * fade
    g.drawImage(glowSprite('#fff4d0'), hx - 12, hy - 12, 24, 24)
    g.globalAlpha = 1
    if (this.sky?.mask) {
      g.globalCompositeOperation = 'destination-in'
      g.drawImage(this.sky.mask, IMG_DX, IMG_DY + f.streetDy, 1120, 476)
    } else {
      // Ảnh chưa dò xong: giữ trong dải trời trên cùng
      g.globalCompositeOperation = 'destination-in'
      g.fillStyle = '#fff'
      g.fillRect(0, 0, W, Math.max(f.view.y, IMG_DY + f.streetDy) + 70)
    }
    g.globalCompositeOperation = 'source-over'
    ctx.drawImage(this.trail, 0, 0)
  }

  private drawSnow(ctx: CanvasRenderingContext2D, f: NoelFrame, zs: number[]) {
    if (this.snow < 0.01) return
    const night = f.time === 'night'
    const n = Math.round(this.flakes.length * this.snow)
    const t = this.clock
    const col = night ? [226, 232, 255] : [255, 255, 255]
    const sway = [5, 9, 16]
    const vTop = f.view.y
    const vH = f.view.h
    for (let i = 0; i < n; i++) {
      const s = this.flakes[i]
      if (!zs.includes(s.z)) continue
      // Trôi lả lướt: hai nhịp lắc chồng nhau nên không đều như máy
      const px = s.x + Math.sin(t * s.f + s.p) * sway[s.z] + Math.sin(t * s.f * 0.37 + s.p * 2) * sway[s.z] * 0.6
      const py = vTop + (s.y / H) * vH
      if (px < f.view.x - 8 || px > f.view.x + f.view.w + 8) continue
      const x = Math.round(px / 2) * 2
      const y = Math.round(py / 2) * 2
      if (s.z === 0) {
        ctx.fillStyle = `rgba(${col},${0.55 * s.a})`
        ctx.fillRect(x, y, 2, 2)
      } else if (s.z === 1) {
        ctx.fillStyle = `rgba(${col},${0.85 * s.a})`
        ctx.fillRect(x, y, 4, 4)
      } else {
        ctx.globalCompositeOperation = 'lighter'
        ctx.globalAlpha = 0.28 * s.a
        ctx.drawImage(glowSprite(night ? '#cfd8ff' : '#ffffff'), x - 13, y - 13, 28, 28)
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
        ctx.fillStyle = `rgba(${col},${0.92 * s.a})`
        ctx.fillRect(x, y - 2, 4, 8)
        ctx.fillRect(x - 2, y, 8, 4)
      }
    }
  }

  // Tuyết xịt góc kính, trong khung cửa sổ
  drawGlass(ctx: CanvasRenderingContext2D) {
    const f = this.f
    if (!f || !this.cfg.layers.roomLights) return
    const R = ROOMS[f.theme]
    if (!R.paneY) return
    const night = f.time === 'night'
    const key = `${f.theme}:${night}`
    let c = this.spray.get(key)
    if (!c) {
      c = canvas(W, H)
      const g = c.getContext('2d')!
      const r = rng(4242)
      const [y0, y1] = R.paneY
      for (const [a, b] of R.panes) {
        // Lớp xịt mịn ở bốn góc: bo tròn, mép lượn theo nhiễu chậm, nhạt dần ra giữa kính
        const corners: [number, number, number][] = [[a, y0, 64], [b, y0, 64], [a, y1, 84], [b, y1, 84]]
        for (let y = y0; y < y1; y += 2)
          for (let x = a; x < b; x += 2) {
            const wob = 1 + 0.16 * Math.sin(x * 0.043 + y * 0.021) + 0.1 * Math.sin(y * 0.067 - x * 0.031)
            let k = 0
            for (const [cx, cy, R] of corners) k = Math.max(k, 1 - Math.hypot(x - cx, y - cy) / (R * wob))
            if (k <= 0) continue
            const al = k * k * (0.9 + r() * 0.2) * (night ? 0.72 : 0.95)
            g.fillStyle = night ? `rgba(196,206,240,${al.toFixed(3)})` : `rgba(255,255,255,${al.toFixed(3)})`
            g.fillRect(x, y, 2, 2)
          }
      }
      this.spray.set(key, c)
    }
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(c, 0, 0)
    ctx.restore()
  }

  // Bông gòn trên bậu và cây thông, trước lớp đồ vật và mèo
  drawRoomBack(ctx: CanvasRenderingContext2D, wash: Wash) {
    const f = this.f
    if (!f) return
    const R = ROOMS[f.theme]
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (this.cfg.layers.roomLights && R.paneY) {
      const key = `${f.theme}:${f.time}:${f.weather}`
      if (key !== this.cottonKey || !this.cotton) {
        this.cottonKey = key
        const c = (this.cotton ??= canvas(W, H))
        const g = c.getContext('2d')!
        g.globalCompositeOperation = 'source-over'
        g.clearRect(0, 0, W, H)
        const r = rng(77)
        for (const [a, b] of R.panes) {
          // Ô cuối của quán có người ngồi che, chỉ trải tới đó
          for (let x = a + 4; x < b - (b > 1000 ? 230 : 4); x += 6) {
            const h = 4 + Math.floor(r() * 3) * 2
            g.fillStyle = '#f6f2e8'
            g.fillRect(x, R.cotton - h, 6, h + 4)
            g.fillStyle = '#d9d6e0'
            g.fillRect(x, R.cotton + 2, 6, 2)
          }
        }
        wash(g, W, H)
      }
      ctx.drawImage(this.cotton, 0, 0)
    }
    if (this.cfg.layers.tree) this.drawTree(ctx, f, R)
    ctx.restore()
  }

  private drawTree(ctx: CanvasRenderingContext2D, f: NoelFrame, R: RoomSpec) {
    const [cx, base] = R.tree
    const b = base - 24
    const hanging = this.hangT >= 0
    const upto = hanging ? this.count - 1 : this.count
    const key = `${f.theme}:${f.time}:${f.weather}:${upto}`
    if (key !== this.treeKey || !this.treeLayer) {
      this.treeKey = key
      const c = (this.treeLayer ??= canvas(W, H))
      const g = c.getContext('2d')!
      g.globalCompositeOperation = 'source-over'
      g.clearRect(0, 0, W, H)
      paintTree(g, cx, base, upto, this.tip)
      // Cây có đèn riêng nên tối nhẹ hơn nội thất
      const wash = f.time === 'night' ? 'rgba(18,16,48,0.1)' : f.time === 'afternoon' ? 'rgba(255,140,70,0.08)' : null
      if (wash) {
        g.globalCompositeOperation = 'source-atop'
        g.fillStyle = wash
        g.fillRect(0, 0, W, H)
        g.globalCompositeOperation = 'source-over'
      }
    }
    ctx.drawImage(this.treeLayer, 0, 0)
    // Món vừa treo: rơi nhẹ vào chỗ rồi đung đưa dần tắt
    if (hanging && this.count > 0 && this.count <= ORNAMENTS.length) {
      const [dx, dy, k] = ORNAMENTS[this.count - 1]
      const t = this.hangT
      const drop = Math.round(Math.max(0, 1 - t * 2.5) * -24)
      const swing = Math.round(Math.sin(t * 5) * Math.max(0, 1 - t / 3.2) * 4)
      ornament(ctx, cx + dx + swing, b + dy + 2 + drop, k, this.tip)
    }
    const lv = this.level()
    if (lv > 0.05) {
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.22 * lv
      ctx.drawImage(glowSprite('#ffcf86'), cx - 92, b - 148, 184, 184)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }
    for (const d of TREE_DOTS) this.drawBulb(ctx, {x: cx + d.dx, y: b + d.dy, c: WARM, p: d.p, s: d.s, tiny: true}, Math.max(lv, 0.2))
    if (this.count >= ORNAMENTS.length) {
      const breath = this.still ? 0.8 : 0.72 + 0.28 * Math.sin(this.clock * 0.9)
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = Math.max(lv, 0.3) * breath
      ctx.drawImage(glowSprite('#ffe6a8'), cx - 42, b - 168, 84, 84)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.drawImage(this.tip, cx - 13, b - 136)
    }
  }

  // Dây đèn trong phòng và lớp tuyết gần ở ban công, trên cùng
  drawRoomFront(ctx: CanvasRenderingContext2D) {
    const f = this.f
    if (!f) return
    const R = ROOMS[f.theme]
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    if (this.cfg.layers.roomLights) {
      const lv = this.level()
      const t = this.clock
      const still = this.still
      if (lv > 0.05) {
        ctx.globalCompositeOperation = 'lighter'
        R.baked.forEach(([x, y], i) => {
          ctx.globalAlpha = (still ? 0.9 : 0.8 + 0.2 * Math.sin(t * 0.8 + i * 1.3)) * 0.62 * lv
          ctx.drawImage(glowSprite('#ffcf86'), x - 26, y - 26, 52, 52)
        })
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = 1
      }
      const night = f.time === 'night'
      for (const path of R.garland) {
        ctx.fillStyle = night ? '#191320' : '#3a2a1e'
        for (const [x, y] of path) ctx.fillRect(x, y, 4, 2)
        path.forEach(([x, y], i) => {
          if (i % 10 !== 5) return
          const tw = still ? 0.9 : 0.8 + 0.2 * Math.sin(t * 0.8 + i + x)
          if (lv > 0.05) {
            ctx.globalCompositeOperation = 'lighter'
            ctx.globalAlpha = 0.58 * tw * lv
            ctx.drawImage(glowSprite('#ffcf86'), x - 26, y - 20, 52, 52)
            ctx.globalCompositeOperation = 'source-over'
            ctx.globalAlpha = 1
          }
          ctx.fillStyle = '#2a1d15'
          ctx.fillRect(x - 2, y - 2, 4, 4)
          ctx.fillStyle = lv > 0.5 ? '#ffe2a8' : '#f2e3c0'
          ctx.fillRect(x - 4, y + 2, 8, 8)
          ctx.fillRect(x - 2, y + 10, 4, 2)
          ctx.fillStyle = lv > 0.5 ? '#fff7dc' : '#ffffff'
          ctx.fillRect(x - 2, y + 4, 2, 2)
        })
      }
    }
    // Ban công không có kính: tuyết gần rơi trước lan can
    if (f.theme === 'balcony') this.drawSnow(ctx, f, [2])
    ctx.restore()
  }
}

function mixHex(a: string, b: string, k: number) {
  const x = rgbOf(a)
  const y = rgbOf(b)
  return `rgb(${x.map((v, i) => Math.round(v * (1 - k) + y[i] * k)).join(',')})`
}
