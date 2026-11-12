// Bài của tôi (/chill, công tắc Studio favOpen, thử bằng ?fav=1): khách thả tim bài mình thương
// rồi nghe lại cả bộ từ tab "Của tôi". Chỉ lưu trên máy khách, không tài khoản.
//
// Lưu dạng {id: thời điểm thả tim (ms)}. Bài bị ẩn / gỡ trong Studio vẫn giữ trong bộ nhớ
// (biết đâu bật lại), chỉ không hiện ra — favList() lọc theo kho nhạc đang có.
//
// Kèm sổ "máy này đã nghe bài này chưa" để gắn `again` vào sự kiện Chill Play: kiểm chứng
// khách có hay nghe đi nghe lại bài cũ không. Sổ này ghi cả khi công tắc tắt, để có số so sánh.
//
// Kiểm thử: node --test scripts/chill-favs.test.mjs

export type Favs = Record<string, number>

export const FAVS_KEY = 'chill:favs'
const PLAYED_KEY = 'chill:played'
export const MAX_FAVS = 300
const MAX_PLAYED = 500

// Giữ những mục hợp lệ, quá MAX_FAVS thì bỏ bớt bài thả tim lâu nhất
export function parseFavs(raw: unknown): Favs {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const entries = Object.entries(raw as Record<string, unknown>).filter(
    (e): e is [string, number] => e[0].length > 0 && e[0].length <= 200 && typeof e[1] === 'number' && Number.isFinite(e[1]) && e[1] > 0
  )
  return Object.fromEntries(entries.sort((a, b) => b[1] - a[1]).slice(0, MAX_FAVS))
}

// Thả / bỏ tim. Thả mới đứng đầu danh sách; đã đầy thì bài thả lâu nhất nhường chỗ
export function toggleFav(favs: Favs, id: string, now = Date.now()): Favs {
  if (Object.hasOwn(favs, id)) {
    const next = {...favs}
    delete next[id]
    return next
  }
  return parseFavs({...favs, [id]: now})
}

// Id các bài đã thả tim còn trong kho nhạc, mới nhất trước
export function favList(favs: Favs, trackIds: readonly string[]): string[] {
  const have = new Set(trackIds)
  return Object.entries(favs)
    .filter(([id]) => have.has(id))
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
}

export function loadFavs(): Favs {
  try {
    return parseFavs(JSON.parse(localStorage.getItem(FAVS_KEY) ?? 'null'))
  } catch {
    return {}
  }
}

export function saveFavs(favs: Favs) {
  try {
    if (Object.keys(favs).length === 0) localStorage.removeItem(FAVS_KEY)
    else localStorage.setItem(FAVS_KEY, JSON.stringify(favs))
  } catch {
    // Chặn storage: tim chỉ giữ trong lần xem này
  }
}

// Ghi bài vào sổ đã nghe; trả về true nếu máy này từng nghe bài đó trước đây.
// null = không đọc được bộ nhớ (chặn storage) → không gắn `again`
export function markPlayed(id: string): boolean | null {
  try {
    const raw = JSON.parse(localStorage.getItem(PLAYED_KEY) ?? '[]') as unknown
    const played = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []
    const again = played.includes(id)
    const next = [...played.filter((x) => x !== id), id].slice(-MAX_PLAYED)
    localStorage.setItem(PLAYED_KEY, JSON.stringify(next))
    return again
  } catch {
    return null
  }
}
