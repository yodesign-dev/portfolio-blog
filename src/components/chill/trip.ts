// Mèo đi chơi xa trang /chill (công tắc Studio tripOpen): pha đủ `tripPhins` phin trong ngày
// thì tổng kết phin mời khách tiễn mèo đi một điểm đến. Hôm sau (từ 5:00 sáng, đi ít nhất 8
// tiếng) mèo về nằm lại trên bậu, cạnh cái ba lô và một bưu thiếp. Lật bưu thiếp: ảnh cảnh +
// tem + lời kể, nút ghé điểm đến đó, và món kệ của nơi đó nếu khách chưa có.
//
// Không phạt: khách vắng mấy ngày thì mèo vẫn ngồi đợi với bưu thiếp. Mỗi ngày tối đa 1 chuyến.
// Lúc mèo vắng: bậu còn cái gối + mẩu giấy, cần câu cất đi, phin không có món kệ (mèo về mang
// quà bù). Chỉ lưu trên máy người xem — không tài khoản. /chill/record và khung nhúng không dùng.

import type {TimeOfDay} from './scene'
import {ITEMS, type ShelfState} from './shelf'

const KEY = 'chill:trip'
const SEEN_KEY = 'chill:places-seen'

export const TRIP_PHINS_DEFAULT = 3
// Mèo về sớm nhất lúc này của ngày hôm sau, và phải đi đủ MIN_AWAY_MS
const BACK_HOUR = 5
const MIN_AWAY_MS = 8 * 3_600_000

export type Postcard = {
  place: string
  // Ngày nhận (YYYY-MM-DD giờ máy)
  at: string
  // Giờ lúc mèo đi → ảnh mặt trước bưu thiếp đúng buổi đó
  time: TimeOfDay
  // Món kệ mèo mang về cùng bưu thiếp (nếu có)
  item?: string
}

export type Trip = {place: string; leftAt: number; backAt: number; time: TimeOfDay; phins: number}

export type TripState = {
  trip?: Trip
  // Ngày đã mời mà khách bấm "Để mai" → hôm đó không mời nữa
  declined?: string
  // Ngày đã tiễn mèo đi gần nhất → mỗi ngày tối đa 1 chuyến
  lastDay?: string
  cards: Postcard[]
}

export type TripMode = 'home' | 'away' | 'back'

const EMPTY: TripState = {cards: []}
const TIMES: TimeOfDay[] = ['morning', 'afternoon', 'night']

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function loadTrip(): TripState {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<TripState> | null
    if (!saved || typeof saved !== 'object') return EMPTY
    const t = saved.trip
    const trip =
      t && typeof t.place === 'string' && Number.isFinite(t.leftAt) && Number.isFinite(t.backAt)
        ? {place: t.place, leftAt: t.leftAt, backAt: t.backAt, time: TIMES.includes(t.time) ? t.time : 'afternoon', phins: Math.max(0, Number(t.phins) || 0)}
        : undefined
    const cards = (Array.isArray(saved.cards) ? saved.cards : [])
      .filter((c) => c && typeof c.place === 'string')
      .map((c) => ({place: c.place, at: String(c.at ?? ''), time: TIMES.includes(c.time) ? c.time : 'afternoon', ...(typeof c.item === 'string' ? {item: c.item} : {})}))
    return {
      ...(trip ? {trip} : {}),
      ...(typeof saved.declined === 'string' ? {declined: saved.declined} : {}),
      ...(typeof saved.lastDay === 'string' ? {lastDay: saved.lastDay} : {}),
      cards,
    }
  } catch {
    return EMPTY
  }
}

function save(s: TripState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // Chặn storage — chuyến đi chỉ có trong lần xem này
  }
}

export const tripMode = (s: TripState, now = Date.now()): TripMode => (!s.trip ? 'home' : now < s.trip.backAt ? 'away' : 'back')

// Giờ mèo về: 5:00 sáng hôm sau, nhưng đi ít nhất 8 tiếng (tiễn lúc 23:00 thì 7:00 mới về)
export function backTime(leftAt: number) {
  const d = new Date(leftAt)
  d.setDate(d.getDate() + 1)
  d.setHours(BACK_HOUR, 0, 0, 0)
  return Math.max(d.getTime(), leftAt + MIN_AWAY_MS)
}

// Có mời đi chơi sau phin này không: mèo ở nhà, đủ phin hôm nay, hôm nay chưa đi / chưa từ chối
export function canOffer(s: TripState, phinsToday: number, need: number, now = new Date()) {
  const today = dayKey(now)
  return tripMode(s, now.getTime()) === 'home' && phinsToday >= need && s.lastDay !== today && s.declined !== today
}

// Nơi mèo muốn đi: không phải chỗ đang ngồi; ưu tiên nơi khách chưa ghé, rồi nơi chưa có bưu thiếp
export function pickPlace(s: TripState, places: string[], current: string | undefined, seen: string[], rand = Math.random) {
  const pool = places.filter((p) => p !== current)
  if (!pool.length) return null
  const got = new Set(s.cards.map((c) => c.place))
  const been = new Set(seen)
  const fresh = pool.filter((p) => !been.has(p) && !got.has(p))
  const noCard = pool.filter((p) => !got.has(p))
  const from = fresh.length ? fresh : noCard.length ? noCard : pool
  return from[Math.floor(rand() * from.length)] ?? null
}

export function sendTrip(s: TripState, place: string, time: TimeOfDay, phins: number, now = Date.now()): TripState {
  const next = {...s, trip: {place, leftAt: now, backAt: backTime(now), time, phins}, lastDay: dayKey(new Date(now))}
  save(next)
  return next
}

export function declineTrip(s: TripState, now = new Date()): TripState {
  const next = {...s, declined: dayKey(now)}
  save(next)
  return next
}

// Món kệ đi cùng bưu thiếp: món theo nơi đó mà khách chưa có (null = chỉ có bưu thiếp)
export function souvenirFor(place: string, shelf: ShelfState) {
  const have = new Set(shelf.owned.map((o) => o.id))
  return ITEMS.find((i) => i.kind === 'place' && i.places?.includes(place) && !have.has(i.id)) ?? null
}

// Nhận bưu thiếp: chuyến đi thành 1 tấm trong sổ. Nơi đã có bưu thiếp thì tấm mới thay tấm cũ
export function collectTrip(s: TripState, item: string | null, now = new Date()): TripState {
  if (!s.trip) return s
  const card: Postcard = {place: s.trip.place, at: dayKey(now), time: s.trip.time, ...(item ? {item} : {})}
  const next = {...s, trip: undefined, cards: [...s.cards.filter((c) => c.place !== card.place), card]}
  delete next.trip
  save(next)
  return next
}

// Thử nhanh (?trip=back): mèo về ngay, khỏi đợi tới sáng
export function forceBack(s: TripState, place: string, time: TimeOfDay, now = Date.now()): TripState {
  const next = {...s, trip: {place: s.trip?.place ?? place, leftAt: now - MIN_AWAY_MS, backAt: now - 1, time: s.trip?.time ?? time, phins: s.trip?.phins ?? 0}}
  save(next)
  return next
}

// ---------- Nơi khách đã ghé (để mèo ưu tiên rủ đi nơi mới) ----------

export function loadSeen(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function markPlaceSeen(place: string) {
  const seen = loadSeen()
  if (seen.includes(place)) return
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, place]))
  } catch {
    // Chặn storage — không sao, mèo chỉ chọn nơi kém khéo hơn
  }
}

// Đọc nhanh cho sự kiện "Chill Visit" lúc mở trang (trước khi state kịp nạp)
export function tripModeNow(): TripMode {
  return tripMode(loadTrip())
}

// ---------- Hình vẽ (lưới ký tự như shelf.ts, '.' = trong suốt) ----------

type Sprite = {rows: string[]; palette: Record<string, string>}
// Vẽ ×2 theo px gốc 640×360 cho cùng cỡ với mèo (atlas ×2)
export const TRIP_ART = 2
const O = '#2e211b'

// Gối mèo nằm, còn lõm một chỗ
export const CUSHION: Sprite = {
  palette: {o: O, R: '#c25b4a', r: '#9a4234', h: '#e08a72', s: '#7a3226'},
  rows: [
    '......oooooooooooooooooooooooooooooooooo......',
    '...oooRhhhhRRRRRRRRRRRRRRRRRRRRRRRhhhhRRRooo...',
    '.ooRRRRRRRRRRRrrrrrrrrrrrrrrrrRRRRRRRRRRRRRoo.',
    'oRRRRRRRRRRRRrrrrrrrrrrrrrrrrrrRRRRRRRRRRRRRRo',
    'orRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRro',
    '.orrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrro.',
    '..oosssssssssssssssssssssssssssssssssssssssoo..',
    '....oooooooooooooooooooooooooooooooooooooo....',
  ],
}

// Mẩu giấy "Đi …, mai về" dựng trên gối
export const NOTE: Sprite = {
  palette: {o: O, W: '#fbf3dc', w: '#e6d9b8', k: '#5a4030', T: '#e8b27d'},
  rows: [
    '....TTTT....',
    '.ooooTToooo.',
    '.oWWWWWWWWo.',
    '.oWkkWkkkWo.',
    '.oWWWWWWWWo.',
    '.oWkkkWkkWo.',
    '.oWWWWWWWWo.',
    '.oWkkWWWWwo.',
    '.owwwwwwwwo.',
    '.oooooooooo.',
  ],
}

// Ba lô nhỏ mèo mang về
export const BACKPACK: Sprite = {
  palette: {o: O, G: '#5f8f5a', g: '#456e42', h: '#86b57e', B: '#a8723f', b: '#7a4a24', Y: '#f2cf6b'},
  rows: [
    '.....oooo.....',
    '....oBbbBo....',
    '...ooooooooo..',
    '..oGGhhGGGGGo.',
    '.oGhGGGGGGGGgo',
    '.oGhGGGGGGGGgo',
    '.oGGooooooGGgo',
    '.oGGoBBBBoGGgo',
    '.oGGoBYYBoGGgo',
    '.oGGooooooGGgo',
    '.oGGGGGGGGGGgo',
    '.oGhGGGGGGGGgo',
    '.ogggggggggggo',
    '..oooooooooo..',
  ],
}

// Bưu thiếp dựng nghiêng cạnh ba lô
export const POSTCARD: Sprite = {
  palette: {o: O, W: '#fbf3dc', S: '#86b7d6', s: '#5f8fb3', G: '#7cbf5a', R: '#d4553a', w: '#e6d9b8'},
  rows: [
    'oooooooooooooo',
    'oSSSSSSSSWRRWo',
    'oSSSSSSSSWRRWo',
    'oSSSSSSSSWWWWo',
    'osssSSSsssWWWo',
    'oGGGsssGGGWWWo',
    'oGGGGGGGGGWwWo',
    'oooooooooooooo',
  ],
}

// ---------- Lời kể trên bưu thiếp (song ngữ, chọn theo ngày nhận) ----------

const STORIES: Record<string, {vi: string[]; en: string[]}> = {
  'hanoi-tau': {
    vi: ['Ngồi sát đường ray uống trà đá, tàu chạy qua rung cả ly. Mình giữ chặt ba lô.', 'Phố tàu sáng sớm còn ướt sương. Có bà bán xôi cho mình miếng chả.'],
    en: ['Sat right by the rails with iced tea. The train shook every glass. I held on to my backpack.', 'The train street was still damp at dawn. A lady selling sticky rice gave me a bit of pork roll.'],
  },
  hanoi: {
    vi: ['Hà Nội se lạnh, mình nằm trên bậu cửa một quán cà phê trứng cả chiều.', 'Đi một vòng hồ, gió heo may thổi bay cả ria mép.'],
    en: ['Hanoi was chilly. I spent the afternoon on the sill of an egg coffee shop.', 'Walked around the lake. The autumn wind nearly blew my whiskers off.'],
  },
  dalat: {
    vi: ['Đà Lạt sương dày quá, mình đi lạc trong rừng thông rồi theo mùi bánh căn mà về.', 'Ngủ một giấc trong vườn dâu, tỉnh dậy lông dính đầy sương.'],
    en: ['The fog in Da Lat was thick. I got lost in the pines and followed the smell of rice cakes back.', 'Napped in a strawberry garden and woke up with dew all over my fur.'],
  },
  danang: {
    vi: ['Biển Đà Nẵng xanh lắm. Mình không dám xuống nước, chỉ ngồi canh dép cho người ta.', 'Tối lên cầu Rồng xem phun lửa, giật mình chạy mất một đoạn.'],
    en: ["The sea in Da Nang is so blue. I didn't dare swim, just guarded people's sandals.", 'Watched the Dragon Bridge breathe fire at night. Ran off a little.'],
  },
  hoian: {
    vi: ['Hội An không có xe, mình đi giữa phố mà không ai bóp còi. Đèn lồng đẹp ơi là đẹp.', 'Ngồi trên mũi đò thả hoa đăng. Mình suýt rớt xuống sông.'],
    en: ['No motorbikes in Hoi An, so I walked down the middle of the street. The lanterns were lovely.', 'Rode at the front of a boat while people floated lanterns. Almost fell in.'],
  },
  hue: {
    vi: ['Huế mưa lâm thâm cả buổi. Mình ngồi dưới mái chùa nghe chuông, nhớ ly bạc xỉu ở quán.', 'Có chú xích lô chở mình qua cầu Tràng Tiền, gió sông mát rượi.'],
    en: ['It drizzled all day in Hue. I sat under a pagoda roof listening to the bell, missing the café.', 'A cyclo driver took me across Truong Tien bridge. The river breeze was cool.'],
  },
  mientay: {
    vi: ['Miền Tây gió đồng thơm mùi lúa. Mình đuổi theo con diều của tụi nhỏ cả buổi.', 'Ngủ trưa trên võng dưới hàng dừa, có cô cho mình con cá khô.'],
    en: ['The Mekong fields smell of rice. I chased the kids’ kite all afternoon.', 'Napped in a hammock under the coconut trees. A lady gave me a dried fish.'],
  },
  cantho: {
    vi: ['Dậy sớm ra chợ nổi Cái Răng. Ghe nào cũng treo trái cây, mình chỉ ngó thôi.', 'Ngồi bến Ninh Kiều nhìn đèn cầu Cần Thơ, gió sông thổi mát cả đêm.'],
    en: ['Got up early for the Cai Rang floating market. Fruit hung from every boat. I only looked.', 'Sat at Ninh Kieu wharf watching the bridge lights. A river breeze all night.'],
  },
  tiengiang: {
    vi: ['Vườn trái cây Tiền Giang nhiều chôm chôm quá. Mình không ăn được, chỉ lăn qua lăn lại.', 'Đi đò trong rạch dừa nước, con chim bói cá ngó mình hoài.'],
    en: ["So many rambutans in Tien Giang. I can't eat them, so I just rolled them around.", 'Took a boat down a palm canal. A kingfisher kept staring at me.'],
  },
  nhatrang: {
    vi: ['Nắng Nha Trang làm mình buồn ngủ. Nằm trên cát nghe sóng tới tối.', 'Có người cho mình nhìn vào giỏ hải sản. Mình cư xử rất đàng hoàng.'],
    en: ['The Nha Trang sun made me sleepy. Lay on the sand listening to the waves until dark.', 'Someone let me look in their basket of seafood. I behaved very well.'],
  },
  saigon: {
    vi: ['Sài Gòn đông vui, mình ngồi quán cóc vỉa hè nghe người ta nói chuyện tới khuya.', 'Lạc vào một con hẻm có ba con mèo khác. Tụi mình chào nhau rồi ai về nhà nấy.'],
    en: ['Saigon was busy. I sat at a sidewalk stall listening to people talk until late.', 'Wandered into an alley with three other cats. We said hi and went our own ways.'],
  },
  'xom-dao': {
    vi: ['Xóm đạo treo đèn ông sao khắp hẻm. Mình đứng xem người ta làm hang đá.', 'Nghe hát thánh ca từ xa, mình ngồi im không dám kêu.'],
    en: ['The parish lane had star lanterns everywhere. I watched people build a nativity grotto.', "Heard carols from far off and sat very still, didn't make a sound."],
  },
}

const FALLBACK = {
  vi: ['Đi xa vui lắm, nhưng vẫn nhớ chỗ nằm trên bậu cửa quán.'],
  en: ['It was a lovely trip, but I missed my spot on the café sill.'],
}

export function storyOf(place: string, lang: 'vi' | 'en', at: string) {
  const pool = (STORIES[place] ?? FALLBACK)[lang]
  let h = 0
  for (const ch of at + place) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return pool[h % pool.length]
}
