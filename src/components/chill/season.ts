// Mùa của /chill (Noel, Tết…): Studio giữ ngày bắt đầu / kết thúc ("Chill · Mùa"), trang gửi
// cấu hình xuống máy khách và máy khách tự so giờ mỗi phút. Giờ bật / tắt vì thế không phụ
// thuộc cache của trang: đúng giờ là đổi, kể cả tab đang mở, không cần deploy.
//
// Ngày lưu dạng thời điểm tuyệt đối, Studio nhập theo giờ Việt Nam: quán ở Việt Nam nên mùa
// đến theo giờ của quán, mọi khách cùng một lúc.
//
// Xem trước trên link (cả /chill lẫn /chill/record): ?season=noel bật, ?season=0 tắt,
// &at=2026-12-24T20:00 giả giờ (giờ Việt Nam) để thử khoảnh khắc, &fx=fast sao băng dày để soi.

export type SeasonPack = 'noel'
export type SeasonMomentKind = 'foam' | 'meteors'
export type SeasonMoment = {kind: SeasonMomentKind; start: string; end: string}

export type SeasonLayers = {
  lights: boolean
  roomLights: boolean
  snow: boolean
  meteors: boolean
  tree: boolean
  catHat: boolean
  shelf: boolean
}

export type Season = {
  id: string
  pack: SeasonPack
  start: string
  end: string
  layers: SeasonLayers
  moments: SeasonMoment[]
}

export const ALL_LAYERS: SeasonLayers = {lights: true, roomLights: true, snow: true, meteors: true, tree: true, catHat: true, shelf: true}

// Bật trước Noel 2 tuần, tắt sau 1 tuần: 11/12/2026 00:00 → hết 1/1/2027 (giờ Việt Nam).
// Tuyết bọt tối 24–25/12, mưa sao băng đêm 13–14/12 (đỉnh Song Tử)
export const NOEL_2026: Season = {
  id: 'noel-2026',
  pack: 'noel',
  start: '2026-12-11T00:00:00+07:00',
  end: '2027-01-02T00:00:00+07:00',
  layers: ALL_LAYERS,
  moments: [
    {kind: 'meteors', start: '2026-12-13T19:00:00+07:00', end: '2026-12-14T05:00:00+07:00'},
    {kind: 'meteors', start: '2026-12-14T19:00:00+07:00', end: '2026-12-15T05:00:00+07:00'},
    {kind: 'foam', start: '2026-12-24T19:00:00+07:00', end: '2026-12-24T22:00:00+07:00'},
    {kind: 'foam', start: '2026-12-25T19:00:00+07:00', end: '2026-12-25T22:00:00+07:00'},
  ],
}

// Bộ art có trong code. Mùa mới (Tết) cần deploy một lần cho bộ art, sau đó chỉ đổi ở Studio
const PREVIEW: Record<string, Season> = {noel: NOEL_2026}

export function activeSeason(seasons: Season[], now: number) {
  return seasons.find((s) => Date.parse(s.start) <= now && now < Date.parse(s.end)) ?? null
}

export const momentOn = (season: Season, kind: SeasonMomentKind, now: number) =>
  season.moments.some((m) => m.kind === kind && Date.parse(m.start) <= now && now < Date.parse(m.end))

export type SeasonPreview = {season: Season | null | undefined; at: number | null; fast: boolean}

// undefined = không ép, theo lịch · null = ép tắt
export function readSeasonPreview(search: string): SeasonPreview {
  const p = new URLSearchParams(search)
  const key = p.get('season')
  const raw = p.get('at')
  // Không ghi múi giờ thì hiểu là giờ Việt Nam
  const at = raw ? Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(raw) ? raw : `${raw}+07:00`) : NaN
  return {
    season: key === null ? undefined : key && PREVIEW[key] ? PREVIEW[key] : null,
    at: Number.isFinite(at) ? at : null,
    fast: p.get('fx') === 'fast',
  }
}

// Khách tự chọn: Bật / Yên tĩnh (trang trí đứng yên) / Tắt. Lưu theo mùa trên máy, tắt Noel
// không kéo theo tắt Tết
export type SeasonPref = 'on' | 'quiet' | 'off'
const prefKey = (id: string) => `chill:season:${id}:pref`
const treeKey = (id: string) => `chill:season:${id}:tree`

export function loadSeasonPref(id: string): SeasonPref {
  try {
    const v = localStorage.getItem(prefKey(id))
    return v === 'quiet' || v === 'off' ? v : 'on'
  } catch {
    return 'on'
  }
}

export function saveSeasonPref(id: string, pref: SeasonPref) {
  try {
    localStorage.setItem(prefKey(id), pref)
  } catch {
    // Chặn storage — lựa chọn chỉ giữ trong lần xem này
  }
}

// Số món đã treo lên cây trong mùa này (mỗi phin xong thêm một món)
export const TREE_MAX = 8

export function loadTree(id: string) {
  try {
    const n = Number(localStorage.getItem(treeKey(id)))
    return Number.isFinite(n) ? Math.min(TREE_MAX, Math.max(0, Math.floor(n))) : 0
  } catch {
    return 0
  }
}

export function saveTree(id: string, n: number) {
  try {
    localStorage.setItem(treeKey(id), String(n))
  } catch {
    // Chặn storage — cây chỉ giữ trong lần xem này
  }
}
