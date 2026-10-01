// Các "căn phòng" của trang /chill — cùng cảnh phố / điểm đến / giờ / thời tiết /
// xe cộ bên ngoài, chỉ khác chỗ người xem ngồi.
//
// Toạ độ: `view`, `panes`, `lamp`, `laptop`, `headphones`, `steam` theo lưới 320×180;
// `cat`, `notebook`, `tipJar`, `character.at` theo px gốc 640×360.
//
// - café: ảnh nội thất 640×360 + người ngồi là sprite sheet cắt từ video (scene.ts).
// - desk: ảnh AI 1280×720 (Nano Banana 2) + người ngồi là video loop Kling như quán.
// - balcony: ảnh AI 1280×720 (người đọc sách, không laptop) + video loop Kling như quán.

export type ThemeId = 'cafe' | 'balcony' | 'desk'

type Rect = {x: number; y: number; w: number; h: number}
type Pt = {x: number; y: number}

// Người ngồi ở theme ảnh tĩnh: vùng `at` (px gốc) được khoét khỏi ảnh nội thất
// theo ô `mask`, rồi vẽ tư thế hiện tại vào đó (ngồi yên / gõ phím / uống) — như
// cách quán cà phê làm với video, nên đổi tư thế không để lại bóng ma.
export type SheetSpec = {src: string; scale: number; cols: number; frames: number; fps: number}

// Người ngồi là sprite sheet cắt từ 1 video loop (Kling): vùng `at` (px gốc) được
// khoét khỏi ảnh nội thất theo ô mặt nạ (ô cuối sheet), khung video vẽ vào đó.
// Bản `hi` (×2) cho màn rộng, `lo` cho điện thoại.
export type CharacterVideo = {
  kind: 'video'
  at: Rect
  hi: SheetSpec
  lo: SheetSpec
  duration: number
  // Đoạn cầm ly uống trong video (giây); ngoài đoạn này là gõ phím, lặp nhiều vòng
  // rồi mới phát đoạn uống
  sip: [number, number]
}

export type CharacterFrames = {
  kind: 'frames'
  src: string
  at: Rect
  // Góc trái trên của từng ô trong atlas (px atlas = px gốc × 2)
  cells: {base: [number, number]; typing: [number, number]; sip: [number, number]; mask: [number, number]}
  // Hai bàn tay trên bàn phím (px gốc) — gõ phím = vùng này nhún lên 1px, tay
  // không rời bàn phím (ô `typing` AI vẽ tay giơ cao quá nên không dùng)
  hands: Rect
  // Phần trên của người (tỉ lệ chiều cao ô, từ trên xuống) nhô lên khi hít thở
  shoulders: number
}

export type Theme = {
  id: ThemeId
  name: string
  // Ảnh nội thất (vùng nhìn ra phố trong suốt) và số px ảnh cho mỗi px gốc
  interior: string
  interiorScale: 1 | 2
  // Ảnh thu nhỏ cho thẻ chọn trong bảng cài đặt
  thumb: string
  // Vùng thấy cảnh phố (clip) — theo lưới 320×180
  view: Rect
  // Ô kính (vệt phản chiếu, giọt mưa đọng). Ban công để trống = không có kính
  panes: {x: number; w: number}[]
  // Dời cả con phố (ảnh + làn xe) xuống — ban công tầng 2 nhìn xuống phố
  streetDy: number
  // Café: người ngồi là sprite sheet từ video + màn hình laptop vẽ bằng code
  character: CharacterVideo | CharacterFrames
  screen: boolean
  cat: Pt
  notebook: Rect | null
  // Lọ tip (đáy, giữa lọ) — bấm vào mở bảng cảm ơn. Ly cà phê của người vừa mời
  // đặt cạnh lọ, lệch `cupDx`. Tránh vùng mèo (cat.x - 6 … cat.x + 90)
  tipJar: Pt & {cupDx: number}
  steam: Pt | null
  lamp: Pt
  // Đèn luôn sáng (đèn bàn, đèn lồng) hay chỉ bật khi chiều/tối/mưa (đèn thả của quán)
  lampAlways: boolean
  // Quầng sáng màn laptop (null = không có laptop)
  laptop: Pt | null
  headphones: Pt
}

export const THEMES: Theme[] = [
  {
    id: 'cafe',
    name: 'Café window',
    interior: '/chill/scenes/interior.webp',
    interiorScale: 1,
    thumb: '/chill/scenes/room-cafe-thumb.webp',
    view: {x: 24, y: 15, w: 272, h: 109},
    panes: [
      {x: 25, w: 76},
      {x: 122, w: 77},
      {x: 219, w: 76},
    ],
    streetDy: 0,
    character: {
      kind: 'video',
      at: {x: 429, y: 116, w: 211, h: 220},
      hi: {src: '/chill/scenes/interior-loop@2x.webp', scale: 2, cols: 10, frames: 81, fps: 8},
      lo: {src: '/chill/scenes/interior-loop.webp', scale: 1, cols: 12, frames: 121, fps: 12},
      duration: 121 / 12,
      sip: [0.75, 6.8],
    },
    screen: true,
    cat: {x: 112, y: 296},
    notebook: {x: 324, y: 264, w: 102, h: 44},
    // Cạnh trái cuốn sổ, ly của người mời đứng giữa phin và lọ
    tipJar: {x: 310, y: 294, cupDx: -22},
    steam: {x: 127, y: 113},
    lamp: {x: 63, y: 42},
    lampAlways: false,
    laptop: {x: 235, y: 119},
    headphones: {x: 262, y: 90},
  },
  {
    // Ban công tầng 2 phố cổ: không kính, nhìn xuống phố qua lan can sắt
    id: 'balcony',
    name: 'Balcony',
    interior: '/chill/scenes/room-balcony.webp',
    interiorScale: 2,
    thumb: '/chill/scenes/room-balcony-thumb.webp',
    view: {x: 0, y: 0, w: 320, h: 156},
    panes: [],
    streetDy: 18,
    // Video loop Kling (O1 Pro, 10s): đọc sách, lật trang, cầm ly cà phê đá uống rồi đặt lại
    character: {
      kind: 'video',
      at: {x: 371, y: 118, w: 269, h: 239},
      hi: {src: '/chill/scenes/room-balcony-loop@2x.webp', scale: 2, cols: 10, frames: 81, fps: 8},
      lo: {src: '/chill/scenes/room-balcony-loop.webp', scale: 1, cols: 12, frames: 121, fps: 12},
      duration: 121 / 12,
      sip: [1.1, 9.1],
    },
    screen: false,
    cat: {x: 60, y: 197},
    notebook: null,
    // Trên bàn nhỏ, giữa ly cà phê đá và quyển sách; ly của người mời đứng mép trái bàn
    tipJar: {x: 440, y: 293, cupDx: -46},
    steam: null,
    lamp: {x: 44, y: 28},
    lampAlways: false,
    laptop: null,
    headphones: {x: 256, y: 80},
  },
  {
    // Góc học trong phòng: đèn bàn luôn sáng, cửa sổ 2 ô nhìn ra phố
    id: 'desk',
    name: 'Night desk',
    interior: '/chill/scenes/room-desk.webp',
    interiorScale: 2,
    thumb: '/chill/scenes/room-desk-thumb.webp',
    view: {x: 121, y: 10, w: 181, h: 121},
    panes: [
      {x: 121, w: 79},
      {x: 216, w: 86},
    ],
    streetDy: 0,
    // Video loop Kling (O1 Pro, 10s): gõ phím, thở, cầm ly cà phê đá uống rồi đặt lại
    character: {
      kind: 'video',
      at: {x: 437, y: 136, w: 203, h: 202},
      hi: {src: '/chill/scenes/room-desk-loop@2x.webp', scale: 2, cols: 10, frames: 81, fps: 8},
      lo: {src: '/chill/scenes/room-desk-loop.webp', scale: 1, cols: 12, frames: 121, fps: 12},
      duration: 121 / 12,
      sip: [1.62, 8.3],
    },
    screen: false,
    cat: {x: 270, y: 283},
    notebook: {x: 118, y: 258, w: 92, h: 28},
    // Mép trước bàn, giữa sổ mở và cốc cà phê nóng — ngay dưới ánh đèn bàn
    tipJar: {x: 222, y: 304, cupDx: 24},
    steam: {x: 124, y: 126},
    lamp: {x: 33, y: 106},
    lampAlways: true,
    laptop: {x: 233, y: 117},
    headphones: {x: 265, y: 89},
  },
]

export const themeById = (id: string | undefined) => THEMES.find((t) => t.id === id) ?? THEMES[0]
