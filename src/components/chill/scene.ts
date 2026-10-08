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
// Nhân vật nhìn chính diện (AI, đã cắt nền xanh + mặt bàn): 6 cột (thứ tự như
// CHARACTERS trong table-view.ts) × 3 hàng khung — 0 bình thường, 1 nhắm mắt (chớp /
// ngủ gật), 2 nâng ly uống. Ô 187×185 px canvas đệm; neo: tâm người cách mép trái ô
// 82 px, mép bàn cách mép trên ô 167 px (px đệm = 2 × px gốc).
const GROUP_CHARS = {src: '/chill/scenes/group/group-chars.webp', w: 187, h: 185, ax: 82, ay: 167}
// Khung hình người ngồi bàn nhóm theo thời gian: thỉnh thoảng chớp mắt, lâu lâu nhấp
// ngụm cà phê (trạng thái "uống cà phê" thì nhấp dày hơn), ngủ gật thì nhắm mắt luôn.
// `k` lệch nhịp từng ghế để cả bàn không chớp / uống cùng lúc.
function groupFrame(status: string, t: number, k: number) {
  if (status === 'sleep') return 1
  const sipEvery = status === 'coffee' ? 8 : 24 + (k % 3) * 6
  if ((t + k * 5.3) % sipEvery < 2.8) return 2
  const blinkEvery = 3.4 + (k % 4) * 0.6
  return (t + k * 1.7) % blinkEvery < 0.14 ? 1 : 0
}

const GROUP = {
  tableTop: 270,
  window: {x: 70, y: 80, w: 92, h: 95},
  lamp: {x: 320, y: 86},
}

// Phía sau bàn nhóm: tường gạch (mặc định) hoặc vách kính nhìn ra con phố đang chọn.
// Nền vách kính cùng khung với nền gạch (bàn, 4 ghế, đèn thả đúng chỗ cũ), chỉ khác
// phần tường phía trên ốp gỗ: ô kính khoét trong suốt → code vẽ phố, mưa, sương,
// đèn đêm ra sau; nắng sáng / chiều rọi lên bàn vẽ đè lên trên.
export type GroupWall = 'brick' | 'glass'
const GROUP_GLASS_SRC = '/chill/scenes/group/group-bg-glass.webp'
const GLASS = {
  // Vùng kính (px gốc) — từ dưới xà trần tới mép trên ốp gỗ
  x: 0,
  y: 20,
  w: 640,
  h: 208,
  // Ảnh phố phủ hết bề ngang kính (giữ đúng tỉ lệ); cropY = phần trên ảnh bị bỏ
  // để vỉa hè + làn xa nằm ngay trên bậu cửa, làn gần khuất sau ốp gỗ
  cropY: 0.22,
  cropYCountry: 0.08,
  // Song cửa gỗ — chỉ dùng khi ảnh vách kính chưa tải xong (vẽ tạm)
  mullions: [0, 158, 316, 474, 634],
  transom: 64,
}
// Cảnh nhỏ sau vách kính: mỗi lần 1 cảnh, cách nhau 30–50 giây, chỉ khi đang nhìn
// vách kính và trời không mưa. Sprite AI cùng tỉ lệ atlas phố (1 ô lưới = 4 px ảnh),
// tất cả hướng sang PHẢI (đi sang trái thì lật).
//   src/w/h: sheet + kích thước 1 khung · anchor: x trong khung giữ đứng yên khi đổi
//   khung (bánh trước / giữa người) · walk: khung khi di chuyển, đổi theo quãng đường
//   `stride` (0 = không đổi) · stops: chỗ dừng (anchor, lưới phố 320) — những khoảng
//   kính không bị đầu các bạn ngồi bàn lẫn song cửa group-bg-glass.webp che (đo trên
//   màn 1280×720; bỏ 2 mép: chậu cây che + bị cắt trên màn 4:3) · beats: lúc dừng,
//   khung nào tới giây nào (`alt` = xen kẽ với khung này, `fps` nhịp xen kẽ; `bob` =
//   nhún lên 1/4 ô theo nhịp đó)
type VignetteBeat = {until: number; frame: number; alt?: number; fps?: number; bob?: boolean}
type VignetteSpec = {
  src: string
  w: number
  h: number
  anchor: number
  walk: number[]
  stride: number
  speed: number
  exitSpeed: number
  brake: number
  dir: 1 | -1
  ground: number
  ride?: boolean
  stops: number[]
  beats: VignetteBeat[]
}
const VIGNETTES = {
  // Anh shipper áo cam chạy làn xa (phải → trái), tấp vào lề, nghe điện thoại, cười ngả
  // đầu rồi chạy tiếp. 4 khung: chạy · dừng chống chân · nghe điện thoại · cười
  shipper: {
    src: '/chill/scenes/group/shipper.webp',
    w: 56,
    h: 87,
    anchor: 47.5,
    walk: [0],
    stride: 0,
    speed: 28,
    exitSpeed: 30,
    brake: 18,
    dir: -1,
    ground: SIDEWALK_Y + 4,
    ride: true,
    stops: [97, 216],
    beats: [
      {until: 0.9, frame: 1},
      {until: 4.4, frame: 2, fps: 1.6, bob: true},
      {until: 6.0, frame: 3, fps: 5, bob: true},
      {until: 8.4, frame: 2, fps: 1.6, bob: true},
      {until: 9.2, frame: 1},
    ],
  },
  // Mẹ dắt bé gái đi ngang; bé đứng lại kéo tay mẹ chỉ về tiệm bánh, nhảy cẫng lên khi mẹ
  // gật đầu, rồi kéo mẹ đi nhanh. 5 khung: đi ×3 · kéo tay chỉ trỏ · nhảy cẫng
  mom: {
    src: '/chill/scenes/group/mom.webp',
    w: 41,
    h: 68,
    anchor: 20.5,
    walk: [0, 1, 2, 1],
    stride: 3,
    speed: 8,
    exitSpeed: 12,
    brake: 40,
    dir: 1,
    ground: SIDEWALK_Y,
    stops: [103],
    beats: [
      {until: 2.6, frame: 3, alt: 3, fps: 3, bob: true},
      {until: 4.6, frame: 4, alt: 4, fps: 4, bob: true},
      {until: 5.4, frame: 3},
    ],
  },
  // Cặp đôi đi ngang (phải → trái), dừng trước bảng menu dựng trên vỉa hè, đọc, nhìn nhau
  // cười nhún vai, rồi đi tiếp. 6 khung: đi ×4 · chỉ vào menu · nhún vai cười
  couple: {
    src: '/chill/scenes/group/couple.webp',
    w: 66,
    h: 66,
    anchor: 33,
    walk: [0, 1, 2, 3],
    stride: 3.2,
    speed: 7.5,
    exitSpeed: 7.5,
    brake: 40,
    dir: -1,
    ground: SIDEWALK_Y,
    stops: [225],
    beats: [
      {until: 3.4, frame: 4},
      {until: 6.2, frame: 5, fps: 2.5, bob: true},
      {until: 6.8, frame: 4},
    ],
  },
} satisfies Record<string, VignetteSpec>
type VignetteKind = keyof typeof VIGNETTES
// Bảng menu (chữ A) trên vỉa hè bên kia đường, bên trái chỗ cặp đôi dừng lại đọc
const MENU_BOARD_X = 214

// Hạt giả ngẫu nhiên cố định theo chỉ số (vệt mưa, đèn phố đêm không nhảy chỗ mỗi khung)
const seeded = (i: number, k = 0) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
  return s - Math.floor(s)
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
// Đường đất ven đồng (điểm đến "Đồng quê"): chỉ xe máy, xe đạp — không ô tô, xe buýt, xích lô
const COUNTRY_BIKES: SpriteName[] = ['bike-cub', 'bike-flowers', 'bike-boxes', 'bike-duo', 'cyclist']
// Lúa lắc lư theo gió: chỉ các pixel "lúa" (vàng / xanh lúa, tự dò trên ảnh) trong dải
// ruộng giữa chân trời và đường đất, ruộng gần lắc mạnh hơn ruộng xa. Tính lại ~24 lần/giây.
const WIND = {top: 0.45, bottom: 0.9, fps: 24}
// Trẻ thả diều chạy qua lại trên bờ ruộng giữa đồng (cảnh đồng quê, trời không mưa,
// không phải ban đêm; chiều có 2 bé). Sprite: kid-run.webp — n khung chạy cắt từ video
// Kling, ô w×h px (4 px = 1 ô lưới phố); hand = tay cầm dây trong ô (hướng phải);
// kid-run-2.webp = cùng bé, đổi màu áo. Diều, dây, đuôi vẽ bằng code.
const KIDS = {
  srcs: ['/chill/scenes/kid-run.webp', '/chill/scenes/kid-run-2.webp'],
  w: 24,
  h: 40,
  n: 10,
  hand: {x: 18.5, y: 3},
  ground: 86, // chân trên bờ ruộng ngang giữa đồng (lưới phố)
  minX: 128,
  maxX: 292,
  stride: 0.8, // quãng đường (ô lưới) mỗi khung chạy — 10 khung ≈ 12 khung/giây
}
// Chú quăng chài trên bờ kênh (cảnh đồng quê, không mưa; đêm thì về nhà).
// fisher.webp: n khung cắt từ video Kling (quăng → chài xòe → kéo về), ô w×h px;
// feet = điểm giữa hai bàn chân trong ô (hướng phải). Mặt quay về kênh bên trái → lật.
// Quăng xong nghỉ 8–16 giây (đứng khung 0) rồi quăng tiếp.
const FISHER = {
  src: '/chill/scenes/fisher.webp',
  w: 84,
  h: 47,
  n: 60,
  fps: 12,
  feet: {x: 19.4, y: 46.5},
  x: 92, // trong ô cửa trái ở quầy (x≈104 rơi đúng thanh gỗ giữa 2 ô)
  ground: 95.3,
  dir: -1 as 1 | -1,
}
const KITE_COLORS = [
  ['#d9483b', '#f2d24b'],
  ['#3e7cc9', '#f4f1ea'],
]
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
  // Lúc bóng đèn của 1 người bạn nháy sáng (người đó vừa nhắn trong chat)
  private bulbFlash = [-9, -9, -9, -9]
  // Cảnh bàn nhóm: lia máy ngang từ quầy (0) vào trong quán (1)
  private groupOn = false
  private pan = 0
  private seated: SeatedFriend[] = []
  private panLayer: HTMLCanvasElement | null = null
  private groupLayer: HTMLCanvasElement | null = null
  private groupBg: HTMLImageElement | null = null
  private groupBgTinted: HTMLCanvasElement | null = null
  private groupBgKey = ''
  private groupWall: GroupWall = 'brick'
  private glassBg: HTMLImageElement | null = null
  private glassBgTinted: HTMLCanvasElement | null = null
  private glassBgKey = ''
  // Phố nhoè như tranh màu nước khi mưa (thu nhỏ rồi phóng lại có làm mịn)
  private softStreet: HTMLCanvasElement | null = null
  private softStreetOf: HTMLImageElement | null = null
  // Ảnh phố đồng quê đã "thổi gió" (cùng kích thước ảnh gốc) — vẽ thay cho ảnh gốc
  private kids: {x: number; dir: 1 | -1; speed: number; step: number}[] = []
  private kites: {x: number; y: number; vx: number; vy: number; tail: {x: number; y: number}[]}[] = []
  private fisher = {playing: false, t: 0, wait: 3}
  private fisherImg: HTMLImageElement | null = null
  private fisherTinted: HTMLCanvasElement | null = null
  private fisherKey = ''
  private kidImgs: (HTMLImageElement | null)[] = [null, null]
  private kidTinted: (HTMLCanvasElement | null)[] = [null, null]
  private kidKeys = ['', '']
  private wind: {
    of: HTMLImageElement
    canvas: HTMLCanvasElement
    base: ImageData | null
    out: ImageData | null
    mask: Uint8Array | null
    rows: [number, number]
    acc: number
    t: number
  } | null = null
  private vignette: {kind: VignetteKind; x: number; target: number; speed: number; step: number; stopT: number; leaving: boolean} | null =
    null
  private nextVignette = 10
  private lastVignette: VignetteKind | null = null
  private vignetteImgs: Partial<Record<VignetteKind, {img: HTMLImageElement; tinted: HTMLCanvasElement | null; key: string}>> = {}
  private groupChars: HTMLImageElement | null = null
  private groupCharsTinted: HTMLCanvasElement | null = null
  private groupCharsKey = ''
  private pawTarget: ReturnType<Rain['plant']> | null = null

  private rng = Math.random
  private movers: Mover[] = []
  private rain: Rain
  private notes: Note[] = []
  // Đàn chim bay ngang trời: phố = én nâu xám vỗ nhanh; đồng quê = cò trắng vỗ chậm, lâu
  // lâu dang cánh lượn. Mỗi con lệch vị trí + nhịp vỗ để không đều tăm tắp
  private birds: {x: number; y: number; p: number; egret: boolean; flock: {dx: number; dy: number; ph: number}[]} | null = null
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
    // Sang đồng quê: ô tô, xe buýt, xích lô đang chạy trên phố cũ biến mất luôn
    if (destination.scenery === 'countryside') this.movers = this.movers.filter((m) => !m.road || COUNTRY_BIKES.includes(m.sprite as SpriteName) || m.sprite === 'bike-poncho')
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

  private get countryside() {
    return this.destination.scenery === 'countryside'
  }

  // Ảnh để vẽ phố: cảnh đồng quê đã có lớp gió → dùng bản đã lắc
  private streetSource(img: HTMLImageElement): CanvasImageSource {
    const w = this.wind
    return w && w.of === img && w.out ? w.canvas : img
  }

  // Chuẩn bị + cập nhật lúa lắc lư. Đọc pixel ảnh cần CORS → tải lại ảnh với
  // crossOrigin (Sanity CDN cho phép); lỗi thì thôi, ảnh vẫn hiện tĩnh như cũ
  private updateWind(dt: number) {
    const img = this.street
    if (!this.countryside || !ready(img)) {
      this.wind = null
      return
    }
    let w = this.wind
    if (!w || w.of !== img) {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      w = this.wind = {of: img, canvas, base: null, out: null, mask: null, rows: [0, 0], acc: 1, t: 0}
      const slot = w
      const cors = new Image()
      cors.crossOrigin = 'anonymous'
      cors.onload = () => {
        if (this.wind !== slot) return
        const c = slot.canvas.getContext('2d', {willReadFrequently: true})!
        c.drawImage(cors, 0, 0, slot.canvas.width, slot.canvas.height)
        try {
          slot.base = c.getImageData(0, 0, slot.canvas.width, slot.canvas.height)
        } catch {
          return
        }
        const {width, height, data} = slot.base
        const y0 = Math.round(height * WIND.top)
        const y1 = Math.round(height * WIND.bottom)
        slot.rows = [y0, y1]
        slot.mask = new Uint8Array(width * height)
        for (let y = y0; y < y1; y++)
          for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            // Lúa chín (vàng → hổ phách) hoặc lúa non (xanh vàng); bỏ đất, nước, thân cây
            const golden = r > g && g > b && r - b > 45 && r > 70
            const green = g > r && g > b + 25 && r > b && g > 70
            if (golden || green) slot.mask[y * width + x] = 1
          }
        slot.out = new ImageData(new Uint8ClampedArray(data), width, height)
      }
      cors.src = img.src
    }
    if (!w.base || !w.mask || !w.out) return
    w.t += dt
    w.acc += dt
    if (w.acc < 1 / WIND.fps) return
    w.acc = 0
    const {width, data} = w.base
    const out = w.out.data
    const [y0, y1] = w.rows
    const t = w.t
    // Mưa gió mạnh, sương gần như lặng
    const force = this.weather === 'rain' ? 1.5 : this.weather === 'mist' ? 0.35 : 1
    const sheen = this.weather === 'clear' && this.time !== 'night'
    const bx = ((t * 70) % (width + 300)) - 150
    for (let y = y0; y < y1; y++) {
      const depth = (y - y0) / (y1 - y0)
      const amp = (0.4 + 1.8 * depth * depth) * force
      for (let x = 0; x < width; x++) {
        const p = y * width + x
        if (!w.mask[p]) continue
        const gust = 0.6 + 0.4 * Math.sin(x * 0.013 - t * 0.7)
        const dx = Math.round(amp * gust * Math.sin(x * 0.09 - t * 2.4 + y * 0.11))
        const sx = Math.min(width - 1, Math.max(0, x - dx))
        const q = (w.mask[y * width + sx] ? y * width + sx : p) * 4
        const k = sheen ? 1 + 0.12 * Math.exp(-(((x - bx - (y - y0) * 0.5) / 38) ** 2)) : 1
        out[p * 4] = data[q] * k
        out[p * 4 + 1] = data[q + 1] * k
        out[p * 4 + 2] = data[q + 2] * k
      }
    }
    w.canvas.getContext('2d')!.putImageData(w.out, 0, 0, 0, y0, width, y1 - y0)
  }

  private get kidsOut() {
    return this.countryside && this.weather !== 'rain' && this.time !== 'night'
  }

  private kidLayer(i: number) {
    this.kidImgs[i] ??= loadImage(KIDS.srcs[i], () => (this.kidKeys[i] = ''))
    const img = this.kidImgs[i]!
    if (!ready(img)) return null
    const key = this.tint ?? 'none'
    if (this.kidTinted[i] && this.kidKeys[i] === key) return this.kidTinted[i]
    this.kidTinted[i] = this.tinted(img, this.kidTinted[i])
    this.kidKeys[i] = key
    return this.kidTinted[i]
  }

  // Bé chạy qua lại trên bờ ruộng, tới mép thì quay đầu; diều đuổi theo một điểm phía
  // sau – phía trên tay bé, có quán tính + gió nên chao lượn, bị kéo lệch khi bé quay đầu
  private updateKids(dt: number) {
    if (!this.kidsOut) {
      this.kids = []
      this.kites = []
      return
    }
    const want = this.time === 'afternoon' ? 2 : 1
    while (this.kids.length < want) {
      const i = this.kids.length
      this.kidLayer(i)
      const x = i === 0 ? 170 : 250
      this.kids.push({x, dir: i === 0 ? 1 : -1, speed: i === 0 ? 9.5 : 8, step: i * 3})
      this.kites.push({x: x - 20, y: 24 + i * 8, vx: 0, vy: 0, tail: Array.from({length: 7}, () => ({x: x - 20, y: 30}))})
    }
    this.kids.length = want
    this.kites.length = want
    const t = this.clock
    const gust = this.weather === 'mist' ? 0.5 : 1
    this.kids.forEach((k, i) => {
      k.x += k.dir * k.speed * dt
      k.step += k.speed * dt
      if (k.x > KIDS.maxX) k.dir = -1
      if (k.x < KIDS.minX) k.dir = 1
      const kite = this.kites[i]
      const hand = this.kidHand(k)
      const tx = hand.x - k.dir * 30 + Math.sin(t * 0.4 + i * 2) * 10
      const ty = Math.max(18, hand.y - 50 + Math.sin(t * 0.6 + i) * 5 + i * 6)
      const ax = (tx - kite.x) * 1.4 + Math.sin(t * 1.3 + i) * 12 * gust
      const ay = (ty - kite.y) * 1.4 + Math.cos(t * 1.7 + i * 1.3) * 7 * gust
      kite.vx = (kite.vx + ax * dt) * Math.pow(0.4, dt)
      kite.vy = (kite.vy + ay * dt) * Math.pow(0.4, dt)
      kite.x += kite.vx * dt
      kite.y += kite.vy * dt
      // Đuôi diều: mỗi đốt bám theo đốt trước, gió thổi lệch nhẹ
      let px = kite.x
      let py = kite.y + 2.5
      for (const seg of kite.tail) {
        seg.x += (px - seg.x + Math.sin(t * 3 + seg.y) * 0.6) * Math.min(1, dt * 9)
        seg.y += (py + 1.8 - seg.y) * Math.min(1, dt * 9)
        px = seg.x
        py = seg.y
      }
    })
  }

  private get fisherOut() {
    return this.countryside && this.weather !== 'rain' && this.time !== 'night'
  }

  private fisherLayer() {
    this.fisherImg ??= loadImage(FISHER.src, () => (this.fisherKey = ''))
    if (!ready(this.fisherImg)) return null
    const key = this.tint ?? 'none'
    if (this.fisherTinted && this.fisherKey === key) return this.fisherTinted
    this.fisherTinted = this.tinted(this.fisherImg, this.fisherTinted)
    this.fisherKey = key
    return this.fisherTinted
  }

  private updateFisher(dt: number) {
    if (!this.fisherOut) return
    this.fisherLayer()
    const f = this.fisher
    if (f.playing) {
      f.t += dt
      if (f.t >= FISHER.n / FISHER.fps) {
        f.playing = false
        f.wait = 8 + this.rng() * 8
      }
    } else {
      f.wait -= dt
      if (f.wait <= 0) {
        f.playing = true
        f.t = 0
      }
    }
  }

  private drawFisher() {
    if (!this.fisherOut) return
    const img = this.fisherLayer()
    if (!img) return
    const ctx = this.ctx
    const snap = SCALE * SPRITE_SCALE
    const f = this.fisher
    const frame = f.playing ? Math.min(FISHER.n - 1, Math.floor(f.t * FISHER.fps)) : 0
    const w = FISHER.w / snap
    const h = FISHER.h / snap
    const feet = FISHER.dir > 0 ? FISHER.feet.x : FISHER.w - FISHER.feet.x
    const left = Math.round((FISHER.x - feet / snap) * snap) / snap
    const top = Math.round((FISHER.ground - FISHER.feet.y / snap) * snap) / snap
    ctx.save()
    if (FISHER.dir < 0) {
      ctx.translate(left * 2 + w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(img, frame * FISHER.w, 0, FISHER.w, FISHER.h, left, top, w, h)
    ctx.restore()
  }

  // Tay cầm dây (lưới phố) — sprite hướng phải, chạy sang trái thì lật
  private kidHand(k: {x: number; dir: 1 | -1}) {
    const snap = SCALE * SPRITE_SCALE
    const hx = (KIDS.hand.x - KIDS.w / 2) / snap
    return {x: k.x + hx * k.dir, y: KIDS.ground - (KIDS.h - KIDS.hand.y) / snap}
  }

  // Vẽ trong hệ lưới phố (ctx hiện tại: cửa sổ quầy hoặc lớp kính đã phóng)
  private drawKids() {
    if (!this.kids.length) return
    const ctx = this.ctx
    const o = this.o
    const snap = SCALE * SPRITE_SCALE
    const q = 0.75 // 1 "pixel" diều = 3 px buffer
    this.kids.forEach((k, i) => {
      const kite = this.kites[i]
      const hand = this.kidHand(k)
      const [c1, c2] = KITE_COLORS[i % KITE_COLORS.length]
      // Dây: đường cong võng xuống giữa, chấm 1 px buffer, màu sáng để thấy cả trên nền cây
      ctx.fillStyle = this.time === 'afternoon' ? 'rgba(255,236,214,0.55)' : 'rgba(250,246,236,0.6)'
      const mx = (kite.x + hand.x) / 2
      const my = (kite.y + hand.y) / 2 + 6
      for (let s = 0; s <= 1; s += 0.012) {
        const x = (1 - s) * (1 - s) * kite.x + 2 * (1 - s) * s * mx + s * s * hand.x
        const y = (1 - s) * (1 - s) * (kite.y + 1.5) + 2 * (1 - s) * s * my + s * s * hand.y
        ctx.fillRect(Math.round(x * 4) / 4, Math.round(y * 4) / 4, 0.25, 0.25)
      }
      // Đuôi: dải nối liền từ thân diều qua từng đốt, mỗi đốt 1 chiếc nơ xen 2 màu
      let ax = kite.x
      let ay = kite.y + 3 * q
      kite.tail.forEach((seg, j) => {
        ctx.fillStyle = o('#5a3820')
        const steps = Math.max(1, Math.ceil(Math.hypot(seg.x - ax, seg.y - ay) / 0.25))
        for (let k2 = 0; k2 <= steps; k2++) {
          const f = k2 / steps
          ctx.fillRect(Math.round((ax + (seg.x - ax) * f) * 4) / 4, Math.round((ay + (seg.y - ay) * f) * 4) / 4, 0.25, 0.25)
        }
        ctx.fillStyle = o(j % 2 ? c2 : c1)
        const bx = Math.round(seg.x / 0.25) * 0.25
        const by = Math.round(seg.y / 0.25) * 0.25
        ctx.fillRect(bx - 0.75, by - 0.25, 0.5, 0.5)
        ctx.fillRect(bx + 0.25, by - 0.25, 0.5, 0.5)
        ax = seg.x
        ay = seg.y
      })
      // Thân diều hình thoi, nghiêng theo vận tốc ngang
      const kx = Math.round(kite.x / q) * q
      const ky = Math.round(kite.y / q) * q
      const lean = Math.max(-1, Math.min(1, kite.vx / 12))
      const rows = [1, 3, 5, 7, 5, 3, 1]
      rows.forEach((wd, r) => {
        const shift = Math.round(lean * (r - 3) * 0.35) * q
        for (let c = 0; c < wd; c++) {
          const left = c < wd / 2
          ctx.fillStyle = o(left === r < 3 ? c1 : c2)
          ctx.fillRect(kx + (c - (wd - 1) / 2) * q + shift, ky + (r - 3) * q, q, q)
        }
      })
      ctx.fillStyle = o('#5a3820')
      ctx.fillRect(kx, ky - 3 * q, q, 7 * q)
      // Bé chạy
      const img = this.kidLayer(i)
      if (!img) return
      const frame = Math.floor(k.step / KIDS.stride + i * 5) % KIDS.n
      const w = KIDS.w / snap
      const h = KIDS.h / snap
      const left = Math.round((k.x - w / 2) * snap) / snap
      const top = Math.round((KIDS.ground - h) * snap) / snap
      ctx.save()
      if (k.dir < 0) {
        ctx.translate(left * 2 + w, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(img, frame * KIDS.w, 0, KIDS.w, KIDS.h, left, top, w, h)
      ctx.restore()
    })
  }

  private update(dt: number) {
    const rainy = this.weather === 'rain'
    this.updateWind(dt)
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
      this.nextVehicle = (1.3 + this.rng() * 2.6) * busy * (rainy ? 1.5 : 1) * (this.countryside ? 2.5 : 1)
    }
    this.updateVignette(dt)
    this.updateKids(dt)
    this.updateFisher(dt)
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
      const egret = this.countryside
      const n = egret ? 3 + Math.floor(this.rng() * 3) : 2 + Math.floor(this.rng() * 2)
      // Hình chữ V lỏng: con đầu đi trước, các con sau lùi dần, so le trên / dưới
      const flock = Array.from({length: n}, (_, i) => ({
        dx: -i * (egret ? 7 : 6) + this.rng() * 2,
        dy: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (egret ? 2.5 : 2) + this.rng(),
        ph: this.rng(),
      }))
      this.birds = {x: this.theme.view.x - 6, y: this.theme.view.y + 8 + this.rng() * 12, p: 0, egret, flock}
      this.nextBirds = (egret ? 18 : 14) + this.rng() * 20
    }
    if (this.birds) {
      this.birds.x += dt * (this.birds.egret ? 9 : 16)
      this.birds.y += Math.sin(this.birds.p * 0.8) * dt * 0.6
      this.birds.p += dt
      if (this.birds.x - (this.birds.flock.length - 1) * 7 > this.theme.view.x + this.theme.view.w + 6) this.birds = null
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
  // Đỉnh đầu người ngồi ở quầy (px gốc) — để đặt bong bóng lời thoại của chính mình
  get headBox() {
    const at = this.theme.character.at
    return {x: Math.round(at.x + at.w * 0.45) - 1, y: at.y + 6, w: 2, h: 2}
  }

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

  // Người bạn thứ `i` (theo thứ tự trong bàn) vừa nhắn → bóng của họ nháy sáng 1 nhịp
  flashBulb(i: number) {
    this.bulbFlash[Math.max(0, Math.min(this.bulbFlash.length - 1, i))] = this.clock
  }

  // 0…1, tắt dần trong 1,2 giây sau khi nháy
  private flashBoost(i: number) {
    return Math.max(0, 1 - (this.clock - this.bulbFlash[i]) / 1.2) * 1.4
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

  // Đổi phía sau bàn nhóm (lựa chọn của từng người, lưu trong prefs)
  setGroupWall(wall: GroupWall) {
    this.groupWall = wall
    if (wall === 'glass') this.glassBgLayer()
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

  private glassBgLayer() {
    this.glassBg ??= loadImage(GROUP_GLASS_SRC, () => (this.glassBgKey = ''))
    if (!ready(this.glassBg)) return null
    const key = this.tint ?? 'none'
    if (this.glassBgTinted && this.glassBgKey === key) return this.glassBgTinted
    this.glassBgTinted = this.tinted(this.glassBg, this.glassBgTinted)
    this.glassBgKey = key
    return this.glassBgTinted
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
    if (this.countryside) {
      sprite = rainy && r() < 0.7 ? 'bike-poncho' : pick(r, COUNTRY_BIKES)
      cruise = sprite === 'cyclist' ? 12 + r() * 4 : 22 + r() * 12
    } else if (roll < 0.6) {
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
    const sprite: Walk = roll < (this.countryside ? 0.5 : 0.35) ? 'dog' : roll < (this.countryside ? 0.75 : 0.65) ? 'vendor' : 'walker'
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
    // Vách kính: drawGlassWall tự vẽ phố + nền.
    const glass = this.groupWall === 'glass'
    const bg = glass ? this.drawGlassWall(gc, t) : this.groupBgLayer()
    if (!glass) {
      const win = GROUP.window
      if (ready(this.street)) {
        const img = this.street
        gc.drawImage(img, img.width * 0.38, img.height * 0.04, img.width * 0.22, img.height * 0.5, win.x, win.y, win.w, win.h)
        if (this.weather === 'mist') R(win.x, win.y, win.w, win.h, night ? 'rgba(150,160,190,0.35)' : 'rgba(236,238,240,0.45)')
        if (this.weather === 'rain') R(win.x, win.y, win.w, win.h, 'rgba(120,130,150,0.25)')
      } else R(win.x, win.y, win.w, win.h, '#e8b48a')
      if (bg) gc.drawImage(bg, 0, 0, 640, 360)
      else R(0, 0, 640, 360, o('#6a4630'))
    }

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
        const row = groupFrame(f.status, t, i + sx * 0.37)
        gc.drawImage(chars, sx * w, row * h, w, h, cx - ax / RES, top - ay / RES, w / RES, h / RES)
        if (f.status === 'sleep') this.drawZ(gc, cx + 18, top - 96, t, i)
      }
      if (glass) this.drawGlassLight(gc, t)
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

    if (glass) this.drawGlassLight(gc, t)
    this.drawGroupGlow(gc, t, x0, x1, wireY, lamp, night)
  }

  // Vách kính: phố đang chọn (nhoè khi mưa) + vệt nước / sương / đèn phố đêm trên kính,
  // rồi đặt nền vách kính lên. Trả về nền (để vẽ lại phần mặt bàn khi chưa có sprite).
  // Ảnh vách kính chưa tải xong → vẽ tạm: phần dưới của nền gạch + song cửa bằng code.
  private drawGlassWall(gc: CanvasRenderingContext2D, t: number) {
    const {x, y, w, h} = GLASS
    const night = this.time === 'night'
    const rain = this.weather === 'rain'
    const R = (rx: number, ry: number, rw: number, rh: number, c: string) => {
      gc.fillStyle = c
      gc.fillRect(rx, ry, rw, rh)
    }
    if (ready(this.street)) {
      const img = this.street
      // Phóng đúng hệ lưới phố ở quầy (320×180) ra vùng kính → xe, người, chó đang
      // chạy ngoài phố vẽ bằng chính drawMover, khớp vỉa hè / làn đường của ảnh
      const k = w / STREET_IMG.w
      // Đồng quê: lấy nhiều trời hơn để thấy diều (đường đất khuất sau ốp gỗ cũng không sao)
      const top = STREET_IMG.y + (this.countryside ? GLASS.cropYCountry : GLASS.cropY) * STREET_IMG.h
      gc.save()
      gc.beginPath()
      gc.rect(x, y, w, h)
      gc.clip()
      gc.setTransform(RES * k, 0, 0, RES * k, RES * (x - STREET_IMG.x * k), RES * (y - top * k))
      gc.drawImage(this.streetSource(img), STREET_IMG.x, STREET_IMG.y, STREET_IMG.w, STREET_IMG.h)
      const counter = this.ctx
      this.ctx = gc
      // Vỉa hè (bảng menu, người đi bộ) → cảnh nhỏ → làn xa (xe chạy qua che trước mặt)
      if (!this.countryside) this.drawMenuBoard()
      if (this.birds) this.drawBirds(this.birds)
      this.drawKids()
      this.drawFisher()
      for (const m of this.movers) if (!m.road) this.drawMover(m, t)
      this.drawVignette(t)
      for (const m of [...this.movers].filter((m) => m.road).sort((a, b) => a.lane - b.lane)) this.drawMover(m, t)
      this.ctx = counter
      if (rain) {
        // Màu nước: lớp phố đã làm mịn phủ lên, nét gốc chỉ còn thấp thoáng
        if (this.softStreetOf !== img) {
          const s = (this.softStreet ??= document.createElement('canvas'))
          s.width = Math.round(img.width / 5)
          s.height = Math.round(img.height / 5)
          const sc = s.getContext('2d')!
          sc.imageSmoothingEnabled = true
          sc.drawImage(img, 0, 0, s.width, s.height)
          this.softStreetOf = img
        }
        gc.imageSmoothingEnabled = true
        gc.globalAlpha = 0.75
        gc.drawImage(this.softStreet!, STREET_IMG.x, STREET_IMG.y, STREET_IMG.w, STREET_IMG.h)
      }
      gc.restore()
      if (rain) R(x, y, w, h, night ? 'rgba(40,46,70,0.25)' : 'rgba(120,132,150,0.22)')
    } else R(x, y, w, h, '#e8b48a')

    // Đèn phố, bảng hiệu hắt lên kính ban đêm (nhoè to hơn khi mưa)
    if (night) {
      gc.save()
      gc.globalCompositeOperation = 'lighter'
      const hues = ['255,190,110', '255,140,90', '140,200,255', '255,220,150']
      for (let i = 0; i < 14; i++) {
        const bx = x + seeded(i, 1) * w
        const by = y + h * (0.35 + seeded(i, 2) * 0.55)
        const r = (rain ? 10 : 6) + seeded(i, 3) * 8
        const a = 0.22 + 0.08 * Math.sin(t * (0.4 + seeded(i, 4)) + i)
        const g = gc.createRadialGradient(bx, by, 0, bx, by, r)
        g.addColorStop(0, `rgba(${hues[i % hues.length]},${a.toFixed(3)})`)
        g.addColorStop(1, `rgba(${hues[i % hues.length]},0)`)
        gc.fillStyle = g
        gc.fillRect(bx - r, by - r, r * 2, r * 2)
      }
      gc.restore()
    }

    if (this.weather === 'mist') {
      const m = gc.createLinearGradient(0, y, 0, y + h)
      const c = night ? '150,160,190' : '236,238,240'
      m.addColorStop(0, `rgba(${c},0.55)`)
      m.addColorStop(1, `rgba(${c},0.3)`)
      gc.fillStyle = m
      gc.fillRect(x, y, w, h)
    }

    // Vệt nước chảy dài trên kính + vài giọt đọng; thỉnh thoảng một giọt lớn trượt xuống
    if (rain) {
      for (let i = 0; i < 46; i++) {
        const sx = Math.round(x + seeded(i, 5) * w)
        const len = 6 + Math.round(seeded(i, 6) * 18)
        const speed = 18 + seeded(i, 7) * 40
        const sy = Math.round(y + ((t * speed + seeded(i, 8) * 400) % (h + len)) - len)
        R(sx, sy, 1, len, 'rgba(220,230,245,0.18)')
        R(sx, sy + len - 2, 1, 2, 'rgba(240,246,255,0.45)')
      }
      for (let i = 0; i < 70; i++) R(Math.round(x + seeded(i, 9) * w), Math.round(y + seeded(i, 10) * h), 1, 1, 'rgba(235,242,255,0.35)')
      for (let i = 0; i < 3; i++) {
        const cyc = 9 + i * 4
        const p = ((t + i * 5.1) % cyc) / cyc
        if (p > 0.45) continue
        const dx = Math.round(x + seeded(Math.floor((t + i * 5.1) / cyc), 11 + i) * w)
        const dy = Math.round(y + 10 + (p / 0.45) ** 1.6 * (h - 16))
        R(dx, y + 10, 1, dy - y - 10, 'rgba(225,235,250,0.22)')
        R(dx - 1, dy, 3, 3, 'rgba(240,246,255,0.5)')
      }
    }

    const bg = this.glassBgLayer()
    if (bg) {
      gc.drawImage(bg, 0, 0, 640, 360)
      return bg
    }
    // Vẽ tạm: phần dưới nền gạch (ốp gỗ, ghế, bàn, sàn) + khung, song cửa gỗ
    const brick = this.groupBgLayer()
    const wood = this.o('#5a3820')
    const cut = y + h
    if (brick) gc.drawImage(brick, 0, cut * RES, brick.width, brick.height - cut * RES, 0, cut, 640, 360 - cut)
    else R(0, cut, 640, 360 - cut, this.o('#6a4630'))
    R(0, 0, 640, y, this.o('#3f2a1c'))
    for (const mx of GLASS.mullions) R(mx, y, 6, h, wood)
    R(0, y + GLASS.transom, 640, 4, wood)
    R(0, cut - 6, 640, 6, wood)
    return brick
  }

  private updateVignette(dt: number) {
    // Đổi sang cảnh đồng quê giữa chừng → cảnh nhỏ của phố biến mất
    if (this.countryside) this.vignette = null
    const v = this.vignette
    if (!v) {
      if (this.pan < 1 || this.groupWall !== 'glass' || this.weather === 'rain' || this.countryside) return
      for (const kind of Object.keys(VIGNETTES) as VignetteKind[]) this.vignetteLayer(kind)
      this.nextVignette -= dt
      if (this.nextVignette > 0) return
      this.nextVignette = 30 + this.rng() * 20
      // Không lặp lại cảnh vừa xem
      const kinds = (Object.keys(VIGNETTES) as VignetteKind[]).filter((k) => k !== this.lastVignette)
      const kind = pick(this.rng, kinds)
      this.lastVignette = kind
      const spec: VignetteSpec = VIGNETTES[kind]
      const x = spec.dir > 0 ? -12 : SCENE_W + 12
      this.vignette = {kind, x, target: pick(this.rng, spec.stops), speed: spec.speed, step: 0, stopT: -1, leaving: false}
      return
    }
    const spec: VignetteSpec = VIGNETTES[v.kind]
    if (v.leaving) {
      v.speed = Math.min(spec.exitSpeed, v.speed + 20 * dt)
    } else if (v.stopT >= 0) {
      v.stopT += dt
      if (v.stopT >= spec.beats[spec.beats.length - 1].until) v.leaving = true
      return
    } else {
      // Phanh đều để dừng đúng chỗ
      const dist = (v.target - v.x) * spec.dir
      v.speed = Math.min(spec.speed, Math.sqrt(2 * spec.brake * Math.max(0, dist)))
      if (dist < 0.3 || v.speed < 0.5) {
        v.x = v.target
        v.speed = 0
        v.stopT = 0
        return
      }
    }
    v.x += spec.dir * v.speed * dt
    v.step += v.speed * dt
    if (v.x < -40 || v.x > SCENE_W + 40) this.vignette = null
  }

  private vignetteLayer(kind: VignetteKind) {
    const slot = (this.vignetteImgs[kind] ??= {img: loadImage(VIGNETTES[kind].src, () => (slot.key = '')), tinted: null, key: ''})
    if (!ready(slot.img)) return null
    const key = this.tint ?? 'none'
    if (slot.tinted && slot.key === key) return slot.tinted
    slot.tinted = this.tinted(slot.img, slot.tinted)
    slot.key = key
    return slot.tinted
  }

  // Vẽ trong hệ lưới phố (this.ctx đang là lớp kính, đã phóng theo vùng kính)
  private drawVignette(t: number) {
    const v = this.vignette
    if (!v) return
    const spec: VignetteSpec = VIGNETTES[v.kind]
    const img = this.vignetteLayer(v.kind)
    if (!img) return
    const ctx = this.ctx
    const base = this.groundY(spec.ground, v.x)
    const snap = SCALE * SPRITE_SCALE
    let frame: number
    let bob = 0
    if (v.stopT < 0 || v.leaving) {
      frame = spec.stride ? spec.walk[Math.floor(v.step / spec.stride) % spec.walk.length] : spec.walk[0]
      if (spec.ride && v.speed > 1 && (t * 2.5) % 1 < 0.14) bob = 0.5
    } else {
      const beat = spec.beats.find((b) => v.stopT < b.until) ?? spec.beats[spec.beats.length - 1]
      const on = beat.fps ? Math.floor(v.stopT * beat.fps) % 2 === 1 : false
      frame = on && beat.alt !== undefined ? beat.alt : beat.frame
      if (on && beat.bob) bob = 0.25
    }
    const w = spec.w / snap
    const h = spec.h / snap
    // Giữ điểm neo (bánh trước / giữa người) tại v.x; đi sang trái thì lật
    const anchor = spec.dir > 0 ? spec.anchor : spec.w - spec.anchor
    const left = Math.round((v.x - anchor / snap) * snap) / snap
    const y = Math.round((base - h - bob) * snap) / snap
    ctx.fillStyle = this.time === 'night' ? 'rgba(0,0,0,0.14)' : 'rgba(0,0,0,0.2)'
    ctx.fillRect(left + w * 0.1, base - 1, w * 0.8, 1)
    ctx.save()
    if (spec.dir < 0) {
      ctx.translate(left * 2 + w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(img, frame * spec.w, 0, spec.w, spec.h, left, y, w, h)
    ctx.restore()
  }

  // Bảng menu chữ A bằng gỗ, mặt bảng đen viết phấn (vẽ khối pixel, lưới phố)
  private drawMenuBoard() {
    const ctx = this.ctx
    const o = this.o
    const x = MENU_BOARD_X
    const base = this.groundY(SIDEWALK_Y, x)
    const R = (rx: number, ry: number, rw: number, rh: number, c: string) => {
      ctx.fillStyle = c
      ctx.fillRect(rx, ry, rw, rh)
    }
    const q = 0.25 // 1 px ảnh atlas
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.fillRect(x - 2.5, base - 0.5, 6, 0.5)
    R(x - 2.25, base - 7.5, 0.5, 7.5, o('#5a3820'))
    R(x + 2.25, base - 7.5, 0.5, 7.5, o('#5a3820'))
    R(x - 2.25, base - 7.75, 5, 5.5, o('#2a1d15'))
    R(x - 2, base - 7.5, 4.5, 5, o('#2f3b33'))
    // Dòng phấn: tiêu đề + 3 món
    R(x - 1.25, base - 7, 3, q, o('#f1e6cf'))
    for (let i = 0; i < 3; i++) R(x - 1.5, base - 6 + i * 1.1, 2 + (i % 2) * 1, q, o(i === 1 ? '#f2b8a0' : '#e8dfcf'))
    R(x - 2.25, base - 2.25, 5, q, o('#2a1d15'))
  }

  // Nắng qua vách kính: sáng xiên trắng ngà, chiều vàng mật ong, dài và thấp hơn.
  // Vệt sáng rọi lên mặt bàn làm ly cà phê ánh màu caramel. Mưa / sương / đêm thì thôi.
  private drawGlassLight(gc: CanvasRenderingContext2D, t: number) {
    if (this.weather !== 'clear' || this.time === 'night') return
    const morning = this.time === 'morning'
    const c = morning ? '255,236,190' : '255,178,90'
    const top = GROUP.tableTop
    gc.save()
    gc.globalCompositeOperation = 'lighter'
    // Mỗi vệt là 1 hình bình hành: từ ô kính xuống tới mặt bàn / sàn
    const slant = morning ? 70 : 150
    const beams = morning
      ? [{x: 40, w: 46}, {x: 200, w: 36}, {x: 360, w: 52}, {x: 520, w: 30}]
      : [{x: 10, w: 64}, {x: 230, w: 50}, {x: 430, w: 70}]
    beams.forEach((b, i) => {
      const a = (morning ? 0.13 : 0.12) * (0.85 + 0.15 * Math.sin(t * 0.35 + i * 1.3))
      const y0 = GLASS.y + 20
      const y1 = top + 70
      const g = gc.createLinearGradient(0, y0, 0, y1)
      g.addColorStop(0, `rgba(${c},0)`)
      g.addColorStop(0.35, `rgba(${c},${a.toFixed(3)})`)
      g.addColorStop(1, `rgba(${c},${(a * 0.4).toFixed(3)})`)
      gc.fillStyle = g
      gc.beginPath()
      gc.moveTo(b.x, y0)
      gc.lineTo(b.x + b.w, y0)
      gc.lineTo(b.x + b.w + slant, y1)
      gc.lineTo(b.x + slant, y1)
      gc.closePath()
      gc.fill()
    })
    // Vũng nắng trên mặt bàn, ánh lên chỗ ly của từng ghế
    for (let i = 0; i < GROUP_SEATS.length; i++) {
      const cx = GROUP_SEATS[i] + 26
      const g = gc.createRadialGradient(cx, top + 2, 1, cx, top + 2, morning ? 20 : 26)
      g.addColorStop(0, `rgba(${morning ? '255,214,150' : '255,170,80'},${morning ? 0.16 : 0.2})`)
      g.addColorStop(1, 'rgba(255,190,110,0)')
      gc.fillStyle = g
      gc.fillRect(cx - 28, top - 26, 56, 56)
    }
    gc.restore()
    // Chiều muộn: cả phòng ngả vàng
    if (!morning) {
      gc.save()
      gc.globalCompositeOperation = 'soft-light'
      gc.fillStyle = 'rgba(255,170,70,0.35)'
      gc.fillRect(0, 0, 640, 360)
      gc.restore()
    }
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
        const boost = this.flashBoost(i)
        const g = gc.createRadialGradient(bx, by + 4, 1, bx, by + 4, 22 * (1 + boost * 0.4))
        g.addColorStop(0, `rgba(255,200,120,${Math.min(1, 0.5 * glow * flicker * (1 + boost)).toFixed(3)})`)
        g.addColorStop(1, 'rgba(255,200,120,0)')
        gc.fillStyle = g
        gc.fillRect(bx - 32, by - 28, 64, 64)
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
    this.drawKids()
    this.drawFisher()
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
        const boost = this.flashBoost(i)
        const g = ctx.createRadialGradient(bx, by + 4, 1, bx, by + 4, 18 * (1 + boost * 0.4))
        g.addColorStop(0, `rgba(255,200,120,${Math.min(1, 0.45 * glow * flicker * (1 + boost)).toFixed(3)})`)
        g.addColorStop(1, 'rgba(255,200,120,0)')
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.fillStyle = g
        ctx.fillRect(bx - 26, by - 22, 52, 52)
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
    const src = this.streetSource(img)
    // 1 hàng pixel của ảnh
    const sy = img.naturalHeight / r.h
    ctx.drawImage(src, r.x, r.y, r.w, r.h)
    if (view.y < r.y) ctx.drawImage(src, 0, 0, img.naturalWidth, sy, r.x, view.y, r.w, r.y - view.y)
    const bottom = r.y + r.h
    if (view.y + view.h > bottom) {
      ctx.drawImage(src, 0, img.naturalHeight - sy, img.naturalWidth, sy, r.x, bottom, r.w, view.y + view.h - bottom)
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

  // Chim nhìn ngang, bay sang phải, vẽ bằng "pixel" 0,5 ô lưới (= 1 px ảnh phố) cho cùng độ
  // mịn với cảnh. Cánh 4 nhịp: giơ cao → ngang → cụp xuống → ngang; cò lâu lâu dang cánh lượn
  private drawBirds(b: NonNullable<ChillScene['birds']>) {
    const egret = b.egret
    // Cò to hơn én (bay thấp, gần hơn): 1 "pixel" = 3 px buffer; én 2 px
    const q = egret ? 0.75 : 0.5
    const ctx = this.ctx
    const body = this.o(egret ? '#f4f1ea' : '#4a4038')
    const shade = this.o(egret ? '#c9c4b8' : '#2e2824')
    const beak = this.o(egret ? '#e8b23a' : '#2e2824')
    const legs = this.o('#3a3530')
    for (const m of b.flock) {
      const x = Math.round((b.x + m.dx) / q) * q
      const y = Math.round((b.y + m.dy + Math.sin(b.p * 2 + m.ph * 6) * 0.4) / q) * q
      // Vẽ thẳng (this.rect làm tròn về nguyên ô → pixel nửa ô bị hở / chồng)
      const P = (dx: number, dy: number, c: string) => {
        ctx.fillStyle = c
        ctx.fillRect(x + dx * q, y + dy * q, q, q)
      }
      const rate = egret ? 2.2 : 5
      const t = b.p + m.ph * 3
      // Cò: cứ ~5 giây lại dang cánh lượn chừng 1,5 giây (khung ngang)
      const glide = egret && t % 5 > 3.5
      const f = glide ? 1 : Math.floor(t * rate * 4) % 4
      if (egret) {
        // Thân, cổ rụt chữ S, đầu + mỏ vàng, chân thả dài phía sau
        for (let k = -2; k <= 1; k++) P(k, 0, body)
        P(2, -1, body)
        P(3, -1, body)
        P(4, -1, beak)
        P(-3, 0, legs)
        P(-4, 0, legs)
        P(-1, 1, shade)
      } else {
        // Én: thân ngắn, đuôi chẻ
        P(0, 0, body)
        P(1, 0, body)
        P(2, 0, beak)
        P(-1, 0, body)
        P(-2, -1, shade)
        P(-2, 1, shade)
      }
      // Cánh (thấy 1 bên): giơ cao / ngang / cụp — cò cánh dài, đầu cánh xám
      const wings = egret
        ? [
            [[0, -1], [-1, -1], [-1, -2], [-2, -2], [-2, -3], [-3, -4]],
            [[1, -1], [0, -1], [-1, -1], [-2, -1], [-3, -1]],
            [[0, 1], [-1, 1], [-1, 2], [-2, 3]],
            [[1, -1], [0, -1], [-1, -1], [-2, -1], [-3, -1]],
          ]
        : [
            [[0, -1], [-1, -2], [-1, -3]],
            [[0, -1], [-1, -1]],
            [[0, 1], [-1, 2]],
            [[0, -1], [-1, -1]],
          ]
      const wing = wings[f]
      wing.forEach(([dx, dy], k) => P(dx, dy, k >= wing.length - 1 ? shade : body))
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
