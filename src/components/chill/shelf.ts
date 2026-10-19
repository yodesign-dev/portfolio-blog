// Kệ sưu tầm trang /chill: xong phin thì mèo mang ra một món cho kệ (bậu cửa sổ quán, bậu
// cửa phòng học, lan can ban công). Không điểm, không bảng xếp hạng, bỏ ngày nào cũng không
// mất gì. Chỉ lưu trên máy người xem — không tài khoản. Bật/tắt ở Studio "Chill · Cài đặt".
//
// Mỗi phin xong được tối đa 1 món:
// - Phin đầu tiên: luôn là ly sứ men lam
// - Món theo dịp (điểm đến đang xem, trời mưa, sương mù, đêm) — có trước, vì hiếm
// - Món thường theo tổng số phin đã xong (REGULAR_AT). Lỡ mốc vì phin đó nhận món dịp thì
//   phin sau bù lại; khách cũ đã làm nhiều phin thì mỗi phin mới nhận dần từng món
//
// Hình vẽ bằng lưới ký tự (mỗi ký tự 1 ô, '.' = trong suốt), phóng ×ART_SCALE theo px gốc
// 640×360 như lọ tip. scene.ts vẽ vào lớp đồ vật rồi tô màu theo giờ như nội thất.

import type {TimeOfDay, Weather} from './scene'

const KEY = 'chill:shelf'
export const ART_SCALE = 2
// Kệ bày tối đa bấy nhiêu món; mỗi phòng có số ô riêng (themes.ts: shelf), thừa thì không hiện
export const SHELF_MAX = 8

type Sprite = {rows: string[]; palette: Record<string, string>}

export type ItemKind = 'regular' | 'place' | 'rain' | 'mist' | 'night'

export type ShelfItem = Sprite & {
  id: string
  kind: ItemKind
  // regular: số phin đã xong để có món này · place: id điểm đến (Studio)
  phins?: number
  places?: string[]
}

const O = '#2e211b'

export const ITEMS: ShelfItem[] = [
  // ---------- Món thường, theo số phin ----------
  {
    id: 'porcelain-cup',
    kind: 'regular',
    phins: 1,
    palette: {o: O, w: '#f4f1e8', b: '#4a78c0', s: '#e2dccd'},
    rows: [
      '.ooooooo...',
      '.owwwwwwoo.',
      '.obwwbwwo.o',
      '.owbwwbwo.o',
      '.obwwbwwoo.',
      '..owwwwwo..',
      'ossssssssso',
      '.ooooooooo.',
    ],
  },
  {
    id: 'cactus',
    kind: 'regular',
    phins: 3,
    palette: {o: O, G: '#6aa84f', g: '#3f7438', T: '#c8714a', t: '#9c5232'},
    rows: [
      '....oo....',
      '...oGgo...',
      '.o.oGgo...',
      'oGooGgo.o.',
      'oGgoGgooGo',
      '.oGGGgoGgo',
      '..ooGgGGo.',
      '...oGgoo..',
      '..oooooo..',
      '..oTTTTo..',
      '..otTTto..',
      '...oooo...',
    ],
  },
  {
    id: 'candle',
    kind: 'regular',
    phins: 5,
    palette: {o: O, Y: '#ffe08a', y: '#ff9a3c', C: '#efe3c8', c: '#d8c7a4', L: '#b5654a'},
    rows: [
      '...y....',
      '..yYy...',
      '...Y....',
      '...o....',
      '.oooooo.',
      '.oCCCCo.',
      '.oLLLLo.',
      '.oLLLLo.',
      '.occcco.',
      '.oooooo.',
    ],
  },
  {
    id: 'radio',
    kind: 'regular',
    phins: 8,
    palette: {o: O, R: '#b5543c', g: '#d9c9a3', k: '#3a2a22', K: '#e8b27d'},
    rows: [
      '..........o.',
      '.........o..',
      '.oooooooooo.',
      'oRRRRRRRRRRo',
      'oRgggRRkkkRo',
      'oRgggRRkKkRo',
      'oRgggRRkkkRo',
      'oRRRRRRRRRRo',
      '.oooooooooo.',
    ],
  },
  {
    id: 'piggy-bank',
    kind: 'regular',
    phins: 12,
    palette: {o: O, P: '#e0603e', f: '#ffd36b', n: '#f39a7a', e: O, k: '#7a2a18'},
    rows: [
      '....ooooo..',
      '..ooPPkPPo.',
      '.oPPPfPPPPo',
      'oPePPPPfPPo',
      'nnPPfPPPPPo',
      'nnPPPPPfPPo',
      'oPPPPPPPPo.',
      '.oPo..oPo..',
      '.oo....oo..',
    ],
  },
  {
    id: 'iced-tea',
    kind: 'regular',
    phins: 16,
    palette: {o: O, A: '#c98d3a', i: '#e8f2f2'},
    rows: [
      'ooooooo',
      'oiAiiAo',
      'oAiAAAo',
      'oAAAAAo',
      '.oAAAo.',
      '.oAAAo.',
      '.oAAAo.',
      '.ooooo.',
    ],
  },
  {
    id: 'alarm-clock',
    kind: 'regular',
    phins: 21,
    palette: {o: O, B: '#d9a441', w: '#f6f1e2', k: O},
    rows: [
      '.oo....oo.',
      'oBBo..oBBo',
      '.oooooooo.',
      'oBwwwwwwBo',
      'oBwwkwwwBo',
      'oBwwkkkwBo',
      'oBwwwwwwBo',
      '.oBBBBBBo.',
      '.o.o..o.o.',
    ],
  },
  {
    id: 'film-camera',
    kind: 'regular',
    phins: 27,
    palette: {o: O, S: '#c9c9c4', K: '#3a3a3e', L: '#6b8fb0', l: '#cfe3f0'},
    rows: [
      '.oo...ooo...',
      'oooooooooooo',
      'oSSSSSSSSSSo',
      'oKKKooooKKKo',
      'oKKoLLLLoKKo',
      'oKKoLlLLoKKo',
      'oKKKooooKKKo',
      'oooooooooooo',
    ],
  },
  {
    id: 'lucky-cat',
    kind: 'regular',
    phins: 34,
    palette: {o: O, W: '#f6f1e6', k: O, n: '#f08a9a', R: '#d94a3a', y: '#f2c94c', Y: '#fff0a8'},
    rows: [
      '..o....o..',
      '.oWo..oWo.',
      '.oWWWWWWo.',
      'oWWkWWkWWo',
      'oWWWnnWWWo',
      '.oWWWWWWo.',
      '.oRRRRRRo.',
      'oWWWyWWWWo',
      'oWWWWWWWWo',
      'oWWyyyyWWo',
      'oWWyYyyWWo',
      '.oooooooo.',
    ],
  },
  {
    id: 'ceramic-vase',
    kind: 'regular',
    phins: 42,
    palette: {o: O, W: '#f1ece0', B: '#3d6fb6'},
    rows: [
      '..ooooo..',
      '..oWWWo..',
      '...oWo...',
      '..oWWWo..',
      '.oWBWBWo.',
      'oWBWWWBWo',
      'oWWBWBWWo',
      'oWBWWWBWo',
      '.oWWWWWo.',
      '..oBBBo..',
      '..ooooo..',
    ],
  },
  {
    id: 'golden-phin',
    kind: 'regular',
    phins: 50,
    palette: {o: O, Y: '#e8c14a', y: '#b88a1e', j: '#cfd8d6', C: '#5a3418', c: '#e8d4a8'},
    rows: [
      '...oooo...',
      '..oYYYYo..',
      '.oooooooo.',
      '..oYyyYo..',
      '..oYyyYo..',
      'oooooooooo',
      'oYYYYYYYYo',
      '.oooooooo.',
      '..ojjjjo..',
      '..oCCCCo..',
      '..occcco..',
      '...oooo...',
    ],
  },

  // ---------- Món theo điểm đến (id điểm đến trong Studio) ----------
  {
    id: 'egg-coffee',
    kind: 'place',
    places: ['hanoi', 'hanoi-tau'],
    palette: {o: O, F: '#f3dc94', f: '#e2b85a', C: '#5a3418', B: '#f1ece0'},
    rows: [
      '.ooooo.',
      'oFFFFFo',
      'oFfFFfo',
      'oCCCCCo',
      'oCCCCCo',
      '.oCCCo.',
      'ooooooo',
      'oBBBBBo',
      '.ooooo.',
    ],
  },
  {
    id: 'strawberry-jam',
    kind: 'place',
    places: ['dalat'],
    palette: {o: O, K: '#d94a3a', w: '#f6f1e2', j: '#d7e4e6', R: '#c8323c', r: '#f2c94c'},
    rows: [
      '.ooooooo.',
      'oKwKwKwKo',
      '.ooooooo.',
      '.ojjjjjo.',
      '.oRRRRRo.',
      '.oRrRrRo.',
      '.oRRRRRo.',
      '.oRrRRRo.',
      '.ooooooo.',
    ],
  },
  {
    id: 'bag-coffee',
    kind: 'place',
    places: ['saigon'],
    palette: {o: O, S: '#e85a8a', C: '#6b3f22', i: '#e8f2f2', b: '#cfd8d6'},
    rows: [
      '.....o..',
      '.ob.oS..',
      '..bboSo.',
      '.oiibSio',
      'oiCCSCCo',
      'oCCCCCCo',
      'oCCiCCCo',
      'oCCCCCCo',
      '.oCCCCo.',
      '..oCCo..',
      '...oo...',
    ],
  },
  {
    id: 'conical-hat',
    kind: 'place',
    places: ['hue'],
    palette: {o: O, N: '#e6cf8f', n: '#c9ab62'},
    rows: [
      '.....oo.....',
      '....oNNo....',
      '...oNnNNo...',
      '..oNNNnNNo..',
      '.oNNnNNNnNo.',
      'oooooooooooo',
    ],
  },
  {
    id: 'coconut',
    kind: 'place',
    places: ['mientay', 'cantho', 'tiengiang'],
    palette: {o: O, S: '#e85a8a', G: '#6aa84f', g: '#4d8a3a', w: '#f3f0e0'},
    rows: [
      '......o...',
      '.....oS...',
      '..ooooSo..',
      '.owwwwSwo.',
      'oGGGGGGGGo',
      'oGgGGGGgGo',
      'oGGGGgGGGo',
      '.oGGGGGGo.',
      '..oGGGGo..',
      '...oooo...',
    ],
  },
  {
    id: 'seashell',
    kind: 'place',
    places: ['nhatrang'],
    palette: {o: O, P: '#f2c4b0', p: '#d9907a'},
    rows: [
      '....oo....',
      '...oPPo...',
      '..oPpPPo..',
      '.oPPpPpPo.',
      'oPpPPpPPPo',
      'oPPpPPpPPo',
      '.oPPPPPPo.',
      '..oooooo..',
    ],
  },

  // ---------- Món theo trời, theo giờ ----------
  {
    id: 'umbrella',
    kind: 'rain',
    palette: {o: O, U: '#d9534f', u: '#f08a6a', H: '#7a5230'},
    rows: [
      '.....oo.....',
      '...ooUUoo...',
      '..oUUuUUUo..',
      '.oUUuUUuUUo.',
      'oUuUUuUUuUUo',
      'oooooooooooo',
      '.....oH.....',
      '.....oH.....',
      '.....oH.o...',
      '......ooo...',
    ],
  },
  {
    id: 'teapot',
    kind: 'mist',
    palette: {o: O, T: '#7a9e8a', t: '#5b7f6b'},
    rows: [
      '.....oo.....',
      '....oTTo....',
      '..oooooooo..',
      '.ooTTTTTTo.o',
      'o.oTtTTtTooT',
      'o.oTTTTTTTo.',
      '.ooTTtTTTo..',
      '...oTTTTo...',
      '...oooooo...',
    ],
  },
  {
    id: 'oil-lamp',
    kind: 'night',
    palette: {o: O, Y: '#ffe08a', y: '#ff9a3c', j: '#dce8e8', B: '#c9a24a', R: '#d98a3a'},
    rows: [
      '...oo...',
      '..oYYo..',
      '..oyYo..',
      '.ojYYjo.',
      '.ojjjjo.',
      '..ojjo..',
      '..oBBo..',
      '.oBBBBo.',
      'oBRRRRBo',
      'oBRRRRBo',
      '.oBBBBo.',
      'oooooooo',
    ],
  },
]

export const itemById = (id: string) => ITEMS.find((i) => i.id === id)
const REGULAR = ITEMS.filter((i) => i.kind === 'regular')

// ---------- Lưu trên máy ----------

export type ShelfState = {
  // Món đã có, theo thứ tự nhận
  owned: {id: string; at: string}[]
  // Món đang bày trên kệ, trái → phải (tối đa SHELF_MAX)
  shown: string[]
}

const EMPTY: ShelfState = {owned: [], shown: []}
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function loadShelf(): ShelfState {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<ShelfState> | null
    if (!saved || !Array.isArray(saved.owned)) return EMPTY
    const owned = saved.owned.filter((o) => o && typeof o.id === 'string' && itemById(o.id)).map((o) => ({id: o.id, at: String(o.at ?? '')}))
    const have = new Set(owned.map((o) => o.id))
    const shown = (Array.isArray(saved.shown) ? saved.shown : []).filter((id) => have.has(id)).slice(0, SHELF_MAX)
    return {owned, shown}
  } catch {
    return EMPTY
  }
}

function save(s: ShelfState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // Chặn storage — kệ chỉ có trong lần xem này
  }
}

export type Moment = {phins: number; place: string | undefined; weather: Weather; time: TimeOfDay}

// Món cho phin vừa xong (`phins` = tổng số phin đã xong, tính cả phin này); null = lần này chưa có
export function pickGift(s: ShelfState, m: Moment): ShelfItem | null {
  // Phin đầu tiên luôn được ly sứ (chuyện của nó là "ly đầu tiên ở quán")
  if (!s.owned.length) return REGULAR[0]
  const have = new Set(s.owned.map((o) => o.id))
  const fresh = (i: ShelfItem) => !have.has(i.id)
  const special = ITEMS.find(
    (i) =>
      fresh(i) &&
      ((i.kind === 'place' && m.place && i.places?.includes(m.place)) ||
        (i.kind === 'rain' && m.weather === 'rain') ||
        (i.kind === 'mist' && m.weather === 'mist') ||
        (i.kind === 'night' && m.time === 'night')),
  )
  if (special) return special
  return REGULAR.find((i) => fresh(i) && (i.phins ?? 0) <= m.phins) ?? null
}

// Nhận món: kệ còn chỗ thì bày luôn
export function addItem(s: ShelfState, id: string, now = new Date()): ShelfState {
  if (s.owned.some((o) => o.id === id)) return s
  const next = {owned: [...s.owned, {id, at: dayKey(now)}], shown: s.shown.length < SHELF_MAX ? [...s.shown, id] : s.shown}
  save(next)
  return next
}

// Bày / cất một món. Kệ đầy thì cất món bày lâu nhất để nhường chỗ
export function toggleShown(s: ShelfState, id: string): ShelfState {
  if (!s.owned.some((o) => o.id === id)) return s
  const shown = s.shown.includes(id) ? s.shown.filter((x) => x !== id) : [...s.shown, id].slice(-SHELF_MAX)
  const next = {...s, shown}
  save(next)
  return next
}

// Gợi ý cho món chưa có — trả về khoá i18n kiểu món + số phin (món thường)
export const nextRegular = (s: ShelfState) => REGULAR.find((i) => !s.owned.some((o) => o.id === i.id))

// Còn mấy phin nữa thì có món thường `item` (0 = đã có). Mỗi phin mèo mang ra tối đa 1 món,
// món thường theo thứ tự (pickGift) → khách pha nhiều phin từ trước khi có kệ vẫn phải nhận
// dần các món đứng trước. Món hiếm có thể chen vào nên đây là số ít nhất
export function phinsLeft(s: ShelfState, item: ShelfItem, phins: number) {
  let left = 0
  for (const i of REGULAR) {
    const have = s.owned.some((o) => o.id === i.id)
    if (!have) left = Math.max(left + 1, (i.phins ?? 0) - phins)
    if (i.id === item.id) return have ? 0 : left
  }
  return left
}

// ---------- Vẽ ----------

export const spriteSize = (item: Sprite) => ({w: Math.max(...item.rows.map((r) => r.length)), h: item.rows.length})

// Vẽ món quanh gốc (x, y) = giữa đáy. `shadow` = tô cả hình một màu (món chưa có trong sổ)
export function drawItem(ctx: CanvasRenderingContext2D, item: Sprite, x: number, y: number, scale = ART_SCALE, shadow?: string) {
  const {w, h} = spriteSize(item)
  const left = Math.round(x - (w * scale) / 2)
  const top = y - h * scale
  item.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const color = row[i] === '.' ? null : (shadow ?? item.palette[row[i]])
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(left + i * scale, top + j * scale, scale, scale)
    }
  })
}

// Vùng bấm quanh món đặt ở (x, y) đáy giữa, theo px gốc
export function itemHitBox(item: Sprite, x: number, y: number) {
  const {w, h} = spriteSize(item)
  return {x: x - (w * ART_SCALE) / 2 - 3, y: y - h * ART_SCALE - 3, w: w * ART_SCALE + 6, h: h * ART_SCALE + 5}
}
