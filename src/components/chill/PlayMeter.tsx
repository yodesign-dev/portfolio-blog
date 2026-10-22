// Lượt nghe trên danh sách nhạc (/chill, công tắc Studio playCountsOpen): số chung cả quán
// từ /api/chill-plays. Quán còn vắng thì số nhỏ trông lạnh, nên:
// - Dưới PLAY_COUNT_SHOW lượt: 3 vạch mức nghe so với bài nhiều nhất cùng trạm, không lộ số
// - Từ PLAY_COUNT_SHOW lượt: hiện số "1,2k lượt nghe"
// - 3 bài nhiều nhất mỗi trạm (từ PLAY_HOT_MIN lượt) có nhãn "Nghe nhiều"
// Dùng chung cho danh sách điện thoại, tab Nhạc máy tính và cửa sổ nổi (MiniPlayer).

import {useLang, useT, type Lang} from './i18n'
import {stationOf, type Track} from './tracks'

export const PLAY_COUNT_SHOW = 50
const PLAY_HOT_MIN = 3
const PLAY_HOT_TOP = 3

export type PlayStat = {n: number; level: 0 | 1 | 2 | 3; hot: boolean}

// Mức nghe + nhãn của từng bài, so trong cùng trạm
export function playStats(tracks: Track[], counts: Record<string, number>) {
  const stats = new Map<string, PlayStat>()
  const byStation = new Map<string, Track[]>()
  for (const tr of tracks) {
    const st = stationOf(tr)
    byStation.set(st, [...(byStation.get(st) ?? []), tr])
  }
  for (const list of byStation.values()) {
    const max = Math.max(0, ...list.map((tr) => counts[tr.id] ?? 0))
    const hot = new Set(
      list
        .filter((tr) => (counts[tr.id] ?? 0) >= PLAY_HOT_MIN)
        .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
        .slice(0, PLAY_HOT_TOP)
        .map((tr) => tr.id),
    )
    for (const tr of list) {
      const n = counts[tr.id] ?? 0
      const level = n <= 0 || max <= 0 ? 0 : (Math.max(1, Math.ceil((n / max) * 3)) as 1 | 2 | 3)
      stats.set(tr.id, {n, level, hot: hot.has(tr.id)})
    }
  }
  return stats
}

// 846 · 1.2k (en) / 1,2k (vi)
export function formatPlays(n: number, lang: Lang) {
  if (n < 1000) return String(n)
  const k = (Math.floor(n / 100) / 10).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')
  return `${lang === 'vi' ? k.replace('.', ',') : k}k`
}

// Cột phải dưới thời lượng: số lượt (từ 50) hoặc 3 vạch mức nghe
export function PlayMeter({stat}: {stat?: PlayStat}) {
  const t = useT()
  const lang = useLang()
  if (!stat || stat.n <= 0) return null
  if (stat.n >= PLAY_COUNT_SHOW) {
    return <span className="whitespace-nowrap text-[11px] tabular-nums text-[#a79e94]/80">{t.room.plays(formatPlays(stat.n, lang))}</span>
  }
  return (
    <span role="img" aria-label={t.room.playLevel(stat.level)} title={t.room.playLevel(stat.level)} className="flex h-2.5 items-end gap-[2px]">
      {[4, 7, 10].map((h, k) => (
        <i key={h} className={`block w-[3px] rounded-[1px] ${k < stat.level ? 'bg-[#e8b27d]' : 'bg-[#a79e94]/35'}`} style={{height: h}} />
      ))}
    </span>
  )
}

// Nhãn nhỏ cạnh tên / dòng phụ của bài nằm trong top trạm
export function HotBadge({stat}: {stat?: PlayStat}) {
  const t = useT()
  if (!stat?.hot) return null
  return (
    <span className="shrink-0 rounded-full border border-[#e8b27d]/35 bg-[#e8b27d]/10 px-1.5 text-[10.5px] leading-4 text-[#e8b27d]">{t.room.hot}</span>
  )
}
