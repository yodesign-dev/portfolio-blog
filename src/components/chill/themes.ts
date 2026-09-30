// Các "căn phòng" của trang /chill — cùng cảnh phố / điểm đến / giờ / thời tiết /
// xe cộ bên ngoài, chỉ khác chỗ người xem ngồi.
//
// Toạ độ: `view`, `panes`, `lamp`, `laptop`, `headphones`, `steam` theo lưới 320×180;
// `cat`, `notebook`, `character.at` theo px gốc 640×360.
//
// - café: ảnh nội thất 640×360 + người ngồi là sprite sheet cắt từ video (scene.ts).
// - balcony / desk: ảnh AI 1280×720 (Nano Banana 2) đã có sẵn người ngồi; khung
//   hoạt hình là vài vùng cắt từ các bản biến thể của chính ảnh đó (gõ phím, uống).

export type ThemeId = 'cafe' | 'balcony' | 'desk'

type Rect = {x: number; y: number; w: number; h: number}
type Pt = {x: number; y: number}

// Người ngồi ở theme ảnh tĩnh: vùng `at` (px gốc) được khoét khỏi ảnh nội thất
// theo ô `mask`, rồi vẽ tư thế hiện tại vào đó (ngồi yên / gõ phím / uống) — như
// cách quán cà phê làm với video, nên đổi tư thế không để lại bóng ma.
export type CharacterFrames = {
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
  character: 'video' | CharacterFrames
  screen: boolean
  cat: Pt
  notebook: Rect | null
  steam: Pt | null
  lamp: Pt
  // Đèn luôn sáng (đèn bàn, đèn lồng) hay chỉ bật khi chiều/tối/mưa (đèn thả của quán)
  lampAlways: boolean
  laptop: Pt
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
    character: 'video',
    screen: true,
    cat: {x: 112, y: 296},
    notebook: {x: 324, y: 264, w: 102, h: 44},
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
    character: {
      src: '/chill/scenes/room-balcony-pose.webp',
      at: {x: 371, y: 118, w: 269, h: 239},
      cells: {base: [0, 0], typing: [538, 0], sip: [1076, 0], mask: [1614, 0]},
      hands: {x: 458, y: 271, w: 28, h: 17},
      shoulders: 0.55,
    },
    screen: false,
    cat: {x: 60, y: 197},
    notebook: null,
    steam: null,
    lamp: {x: 44, y: 28},
    lampAlways: false,
    laptop: {x: 233, y: 120},
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
    character: {
      src: '/chill/scenes/room-desk-pose.webp',
      at: {x: 442, y: 139, w: 194, h: 205},
      cells: {base: [0, 0], typing: [388, 0], sip: [776, 0], mask: [1164, 0]},
      hands: {x: 452, y: 270, w: 30, h: 16},
      shoulders: 0.55,
    },
    screen: false,
    cat: {x: 270, y: 283},
    notebook: {x: 118, y: 258, w: 92, h: 28},
    steam: {x: 124, y: 126},
    lamp: {x: 33, y: 106},
    lampAlways: true,
    laptop: {x: 233, y: 117},
    headphones: {x: 265, y: 89},
  },
]

export const themeById = (id: string | undefined) => THEMES.find((t) => t.id === id) ?? THEMES[0]
