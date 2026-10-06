// Icon pixel art 16×16 cho hàng nút góc phải dưới (Wishlist · Mời bạn · Chat) — cùng
// kiểu với cảnh quán: viền nâu đậm 1px, đổ bóng 3 sắc độ, màu lấy từ bảng màu của cảnh.
// Luôn vẽ đúng 2× (32px) để pixel vuông, sắc; mỗi icon tự căn giữa theo phần có hình
// (không theo khung 16×16) để 3 icon cân nhau dù hình dáng khác nhau.

import type {ReactNode} from 'react'

const O = '#2a1d15'

const PALETTE: Record<string, string> = {
  o: O,
  // bóng đèn
  a: '#FFE7A3',
  b: '#FAC775',
  c: '#EF9F27',
  d: '#BA7517',
  h: '#FFFDF5',
  f: '#FFF3C4',
  m: '#D3D1C7',
  n: '#888780',
  p: '#5F5E5A',
  r: 'rgba(250,199,117,0.55)',
  // hai ly cà phê
  s: 'rgba(255,255,255,0.6)',
  x: '#FAC775',
  K: '#6b3f22',
  C: '#F4EEE2',
  D: '#CFC6B6',
  A: '#D85A30',
  B: '#1D9E75',
  g: '#888780',
}

const BULB = [
  '................',
  '.r..ooaaaaoo..r.',
  '...oahabbbbbo...',
  '..oahabbbbbbco..',
  '..ohabbfbfbcco..',
  'r.oabbbfffbcco.r',
  '..obbbbbfbccdo..',
  '...obbbbfbcdo...',
  '....obcfccdo....',
  '.....ocddo......',
  '.....omnnmo.....',
  '.....onppno.....',
  '.....omnnmo.....',
  '......opno......',
  '.......oo.......',
  '................',
]

const CUPS = [
  '................',
  '....s.......s...',
  '....s.......s...',
  '...s.......s....',
  '.......xx.......',
  '.oooooo..oooooo.',
  '.oKKKKo..oKKKKo.',
  'ooCCCCo..oCCCCoo',
  'ooAAAAo..oBBBBoo',
  'ooCCCCo..oCCCCoo',
  'ooCCCDo..oCCCDoo',
  '.oCCCDo..oCCCDo.',
  '.oCCCDo..oCCCDo.',
  '..oooo....oooo..',
  '.gggggg..gggggg.',
  '................',
]

type Grid = (string | null)[][]

const toGrid = (rows: string[]): Grid => rows.map((r) => [...r].map((ch) => (ch === '.' ? null : (PALETTE[ch] ?? null))))

// Ô vuông bo góc 2 lớp pixel: viền ngoài cắt góc, góc trong tô viền
function roundRect(g: Grid, x0: number, y0: number, x1: number, y1: number, fill: string) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      if ((x === x0 || x === x1) && (y === y0 || y === y1)) continue
      g[y][x] = O
    }
  for (let y = y0 + 1; y <= y1 - 1; y++)
    for (let x = x0 + 1; x <= x1 - 1; x++) {
      const corner = (x === x0 + 1 || x === x1 - 1) && (y === y0 + 1 || y === y1 - 1)
      g[y][x] = corner ? O : fill
    }
}

// Hai bong bóng hội thoại: sau (xanh ngọc như chấm online; cam khi có tin chưa đọc),
// trước màu kem với 3 chấm nâu cà phê
function chatGrid(unread: boolean): Grid {
  const back = unread ? {fill: '#F0997B', hi: '#F5C4B3', shade: '#D85A30'} : {fill: '#5DCAA5', hi: '#9FE1CB', shade: '#1D9E75'}
  const g: Grid = Array.from({length: 16}, () => Array(16).fill(null))
  roundRect(g, 7, 2, 15, 8, back.fill)
  g[3][10] = back.hi
  g[3][11] = back.hi
  g[4][9] = back.hi
  for (let x = 9; x <= 13; x++) g[7][x] = back.shade
  g[9][13] = O
  g[9][14] = O
  g[10][14] = O
  roundRect(g, 0, 6, 11, 12, '#FBF6EC')
  g[7][3] = '#FFFFFF'
  g[7][4] = '#FFFFFF'
  g[8][2] = '#FFFFFF'
  for (let x = 2; x <= 9; x++) g[11][x] = '#E2D8C6'
  // 3 chấm 2×2 cách đều, căn giữa lòng bong bóng (cột 1…10, hàng 7…11)
  for (const x of [2, 3, 5, 6, 8, 9]) for (const y of [8, 9]) g[y][x] = '#9a6a45'
  g[12][3] = '#E2D8C6'
  g[13][2] = O
  g[13][3] = '#E2D8C6'
  g[13][4] = O
  g[14][2] = O
  g[14][3] = O
  return g
}

const GRIDS = {bulb: toGrid(BULB), cups: toGrid(CUPS), chat: chatGrid(false), chatUnread: chatGrid(true)}
export type PixelIconName = keyof typeof GRIDS

// Lệch để đưa tâm phần có hình về giữa khung (tính 1 lần cho mỗi icon)
const OFFSETS = Object.fromEntries(
  Object.entries(GRIDS).map(([name, g]) => {
    let minX = 16,
      minY = 16,
      maxX = -1,
      maxY = -1
    g.forEach((row, y) =>
      row.forEach((c, x) => {
        if (!c) return
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }),
    )
    // Làm tròn tới nửa ô: vẽ 2× nên nửa ô = đúng 1px, vẫn sắc
    const dx = Math.round(((16 - (maxX - minX + 1)) / 2 - minX) * 2) / 2
    const dy = Math.round(((16 - (maxY - minY + 1)) / 2 - minY) * 2) / 2
    return [name, {dx, dy}]
  }),
) as Record<PixelIconName, {dx: number; dy: number}>

export function PixelIcon({name, size = 32}: {name: PixelIconName; size?: number}) {
  const g = GRIDS[name]
  const {dx, dy} = OFFSETS[name]
  const rects: ReactNode[] = []
  g.forEach((row, y) =>
    row.forEach((c, x) => {
      if (c) rects.push(<rect key={`${x}-${y}`} x={x + dx} y={y + dy} width={1} height={1} fill={c} />)
    }),
  )
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden className="block">
      {rects}
    </svg>
  )
}

// Nút tròn ("token") dùng chung cho Wishlist · Mời bạn · Chat: cùng kích thước, cùng nền,
// chỉ khác icon. Nhãn trượt ra bên trái khi rê chuột / focus (máy tính); điện thoại
// không có rê chuột nên chỉ dựa vào icon + aria-label.
export const TOKEN_CLASS =
  'group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-[radial-gradient(circle_at_50%_35%,#352c3c_0%,#211b28_70%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_10px_28px_-10px_rgba(0,0,0,0.85)] transition duration-300 hover:-translate-y-px hover:border-white/30 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] lg:h-12 lg:w-12'

export function TokenLabel({children}: {children: ReactNode}) {
  return (
    <span className="pointer-events-none absolute right-full top-1/2 mr-2 hidden -translate-y-1/2 translate-x-1 whitespace-nowrap rounded-full border border-white/15 bg-[#16141c]/95 px-3 py-1 text-xs text-[#ede6dd] opacity-0 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.8)] transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 lg:block">
      {children}
    </span>
  )
}

// Số đếm ở góc dưới phải: trung tính; `hot` (cam đặc) chỉ cho việc cần xem ngay (tin chưa đọc)
export function TokenChip({children, hot = false}: {children: ReactNode; hot?: boolean}) {
  return (
    <span
      className={`absolute -bottom-1 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center gap-1 rounded-full border-2 border-[#1d1824] px-1 text-[11px] font-medium tabular-nums ${
        hot ? 'bg-[#d9603b] text-white' : 'bg-[#2c2838] text-[#ede6dd]'
      }`}
    >
      {children}
    </span>
  )
}

// Chấm cam "tính năng mới" ở góc trên phải
export function TokenNewDot() {
  return (
    <span aria-hidden className="absolute right-0 top-0 flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full rounded-full bg-[#f08a5d] opacity-60 motion-safe:animate-ping" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-[#1d1824] bg-[#f08a5d]" />
    </span>
  )
}
