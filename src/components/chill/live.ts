// Buổi live YouTube của /chill: Studio giữ link + giờ bắt đầu / kết thúc ("Chill · Live"), máy
// khách tự so giờ mỗi phút như theme mùa (season.ts): đúng giờ là đổi, kể cả tab đang mở.
//
// Xem trước trên link: ?live=1 đang live, ?live=soon sắp live, ?live=0 tắt.

export type ChillLive = {id: string; url: string; start: string; end: string}
export type LiveState = 'on' | 'soon'
export type LiveStatus = {live: ChillLive; state: LiveState}

// Báo trước trong 24 giờ cuối, sớm hơn thì khách chưa cần biết
const SOON_MS = 24 * 3_600_000
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'])

// Link đi thẳng ra tab mới, nên chỉ nhận đúng YouTube
export function isLiveUrl(url: string) {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && HOSTS.has(u.hostname)
  } catch {
    return false
  }
}

export function liveStatus(lives: ChillLive[], now: number): LiveStatus | null {
  const on = lives.find((l) => Date.parse(l.start) <= now && now < Date.parse(l.end))
  if (on) return {live: on, state: 'on'}
  const next = lives
    .filter((l) => {
      const start = Date.parse(l.start)
      return start > now && start - now <= SOON_MS
    })
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0]
  return next ? {live: next, state: 'soon'} : null
}

// undefined = không ép, theo lịch · null = ép tắt
export function readLivePreview(search: string, url: string, now: number): LiveStatus | null | undefined {
  const key = new URLSearchParams(search).get('live')
  if (key === null) return undefined
  if (key !== '1' && key !== 'soon') return null
  const start = key === '1' ? now - 600_000 : now + 3 * 3_600_000
  return {
    live: {id: 'preview', url, start: new Date(start).toISOString(), end: new Date(start + 7_200_000).toISOString()},
    state: key === '1' ? 'on' : 'soon',
  }
}
