// Nhạc cho Bàn pha phin (BrewMusic.tsx): khách để quán chọn giúp, tự chọn danh sách, hoặc giữ
// nhạc đang nghe. Tất cả chỉ lưu trên máy khách, không tài khoản. Gợi ý là hàm chạy ngay trên
// máy, không gọi máy chủ.
//
// Kiểm thử: node --test scripts/chill-playlist.test.mjs

import type {StationId, Track} from './tracks'

export const MOODS = ['deep', 'gentle', 'melodic', 'surprise'] as const
export type Mood = (typeof MOODS)[number]

// null ở `surprise` = mọi trạm trừ trạm ngủ
const MOOD_STATIONS: Record<Mood, StationId[] | null> = {
  deep: ['focus', 'lofi'],
  gentle: ['study', 'lofi'],
  melodic: ['acoustic', 'sax', 'noel'],
  surprise: null,
}

export const SOURCES = ['suggest', 'list', 'current'] as const
export type MusicSource = (typeof SOURCES)[number]
export const SESSION_MIXES = ['scene', 'busy', 'rainyNight', 'quiet'] as const
export type SessionMix = (typeof SESSION_MIXES)[number]
export const BREAK_MODES = ['duck', 'keep', 'ambient'] as const
export type BreakMode = (typeof BREAK_MODES)[number]

export const LIST_SLOTS = 3
export const MAX_LIST_TRACKS = 60
export const MAX_LIST_NAME = 24
const MAX_RECENT = 30
const MAX_SKIPS = 200

export type MusicList = {name: string; ids: string[]}

export type BrewMusicPrefs = {
  // null = chưa chọn lần nào: đang nghe nhạc thì giữ nguyên, chưa nghe thì quán chọn giúp
  source: MusicSource | null
  mood: Mood
  lists: MusicList[]
  active: number
  mix: SessionMix
  breakMode: BreakMode
  // Mở cửa sổ nổi ngay khi bấm bắt đầu phin
  miniOnStart: boolean
  // Báo bằng thông báo hệ thống khi hết giờ mà khách đang ở tab khác
  notify: boolean
}

const PREFS_KEY = 'chill:brew-music'
const RECENT_KEY = 'chill:brew-recent'
const SKIPS_KEY = 'chill:brew-skips'
const QUEUE_KEY = 'chill:brew-queue'

export const defaultPrefs = (listNames: readonly string[] = []): BrewMusicPrefs => ({
  source: null,
  mood: 'deep',
  lists: Array.from({length: LIST_SLOTS}, (_, i) => ({name: listNames[i] ?? `${i + 1}`, ids: []})),
  active: 0,
  mix: 'scene',
  breakMode: 'duck',
  miniOnStart: false,
  notify: false,
})

const oneOf = <T extends string>(all: readonly T[], v: unknown, fallback: T): T => (all.includes(v as T) ? (v as T) : fallback)

export function parsePrefs(raw: unknown, listNames: readonly string[] = []): BrewMusicPrefs {
  const base = defaultPrefs(listNames)
  if (!raw || typeof raw !== 'object') return base
  const o = raw as Record<string, unknown>
  const savedLists = Array.isArray(o.lists) ? o.lists : []
  const lists = base.lists.map((fallback, i) => {
    const l = savedLists[i] as Partial<MusicList> | undefined
    if (!l || typeof l !== 'object') return fallback
    const name = typeof l.name === 'string' && l.name.trim() ? l.name.slice(0, MAX_LIST_NAME) : fallback.name
    const ids = Array.isArray(l.ids) ? l.ids.filter((id): id is string => typeof id === 'string').slice(0, MAX_LIST_TRACKS) : []
    return {name, ids}
  })
  const active = Number(o.active)
  return {
    source: SOURCES.includes(o.source as MusicSource) ? (o.source as MusicSource) : null,
    mood: oneOf(MOODS, o.mood, base.mood),
    lists,
    active: Number.isInteger(active) && active >= 0 && active < LIST_SLOTS ? active : 0,
    mix: oneOf(SESSION_MIXES, o.mix, base.mix),
    breakMode: oneOf(BREAK_MODES, o.breakMode, base.breakMode),
    miniOnStart: o.miniOnStart === true,
    notify: o.notify === true,
  }
}

function readJson(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Chặn storage: chỉ giữ trong lần xem này
  }
}

export const loadPrefs = (listNames: readonly string[]) => parsePrefs(readJson(PREFS_KEY), listNames)
export const savePrefs = (prefs: BrewMusicPrefs) => writeJson(PREFS_KEY, prefs)

export function loadRecent(): string[] {
  const v = readJson(RECENT_KEY)
  return Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string').slice(-MAX_RECENT) : []
}

export function pushRecent(id: string) {
  const next = [...loadRecent().filter((x) => x !== id), id].slice(-MAX_RECENT)
  writeJson(RECENT_KEY, next)
}

export function loadSkips(): Record<string, number> {
  const v = readJson(SKIPS_KEY)
  if (!v || typeof v !== 'object') return {}
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).filter(([, n]) => typeof n === 'number')) as Record<string, number>
}

export function addSkip(id: string) {
  const skips = loadSkips()
  skips[id] = (skips[id] ?? 0) + 1
  // Giữ gọn: bỏ bớt mục ít bị bỏ qua nhất khi quá dài
  const entries = Object.entries(skips).sort((a, b) => b[1] - a[1]).slice(0, MAX_SKIPS)
  writeJson(SKIPS_KEY, Object.fromEntries(entries))
}

// Hàng đợi đang phát, để tải lại trang vẫn đi tiếp đúng bộ nhạc
export type MusicQueue = {key: string; label: string; ids: string[]}

export function loadQueue(): MusicQueue | null {
  const v = readJson(QUEUE_KEY) as Partial<MusicQueue> | null
  if (!v || typeof v.key !== 'string' || typeof v.label !== 'string' || !Array.isArray(v.ids)) return null
  return {key: v.key, label: v.label, ids: v.ids.filter((id): id is string => typeof id === 'string')}
}

export const saveQueue = (queue: MusicQueue | null) => writeJson(QUEUE_KEY, queue)

const stationOf = (t: Track): StationId => t.station ?? 'lofi'
const SOFT = /slow|gentle|late|ambient|night|mellow|soft|felt|piano|dusk|midnight|drone|ballad/i

export type SuggestInput = {
  tracks: Track[]
  mood: Mood
  minutes: number
  // Vừa nghe, cũ → mới
  recent?: string[]
  skips?: Record<string, number>
  // Không lấy các bài này (bộ đang có, khi đổi bộ / đổi 1 bài)
  exclude?: string[]
  time?: string
  weather?: string
  rand?: () => number
}

export function moodPool(tracks: Track[], mood: Mood): Track[] {
  const stations = MOOD_STATIONS[mood]
  return tracks.filter((t) => (stations ? stations.includes(stationOf(t)) : stationOf(t) !== 'night'))
}

function weightOf(t: Track, {mood, recent = [], skips = {}, time, weather}: SuggestInput): number {
  let w = 1
  if (recent.includes(t.id)) w *= 0.05
  const skipped = skips[t.id] ?? 0
  if (skipped) w *= Math.max(0.05, 0.4 ** skipped)
  if (mood === 'surprise') return w
  if (t.isNew) w *= 1.3
  if ((time === 'night' || weather === 'rain') && SOFT.test(t.mood)) w *= 1.6
  return w
}

// Bốc 1 bài theo trọng số
function draw<T>(items: {item: T; weight: number}[], rand: () => number): number {
  const total = items.reduce((sum, x) => sum + x.weight, 0)
  let at = rand() * total
  for (let i = 0; i < items.length; i++) {
    at -= items[i].weight
    if (at <= 0) return i
  }
  return items.length - 1
}

// Một bộ nhạc vừa đủ độ dài phin. Thư viện không đủ thì trả hết (hàng đợi tự lặp lại).
// `exclude` chỉ bị bỏ qua khi không còn bài nào khác
export function suggestQueue(input: SuggestInput): string[] {
  const {tracks, mood, minutes, exclude = [], rand = Math.random} = input
  const all = moodPool(tracks, mood)
  const fresh = all.filter((t) => !exclude.includes(t.id))
  const pool = (fresh.length ? fresh : all).map((item) => ({item, weight: weightOf(item, input)}))
  const out: string[] = []
  const need = Math.max(1, minutes) * 60
  let total = 0
  while (pool.length && total < need) {
    const [{item}] = pool.splice(draw(pool, rand), 1)
    out.push(item.id)
    total += item.duration || 180
  }
  return out
}

// Đổi 1 bài trong bộ gợi ý, giữ nguyên các bài khác
export function swapOne(ids: string[], at: number, input: Omit<SuggestInput, 'minutes' | 'exclude'>): string[] {
  const {tracks, mood, rand = Math.random} = input
  const pool = moodPool(tracks, mood).filter((t) => !ids.includes(t.id))
  if (!pool.length || at < 0 || at >= ids.length) return ids
  const items = pool.map((item) => ({item, weight: weightOf(item, {...input, minutes: 0})}))
  const next = [...ids]
  next[at] = items[draw(items, rand)].item.id
  return next
}

export const totalSeconds = (ids: string[], byId: Map<string, Track>) => ids.reduce((sum, id) => sum + (byId.get(id)?.duration ?? 0), 0)
