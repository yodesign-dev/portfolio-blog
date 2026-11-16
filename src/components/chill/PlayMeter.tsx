// Lượt nghe trên danh sách nhạc (/chill, công tắc Studio playCountsOpen): số chung cả quán
// từ /api/chill-plays. Quán còn vắng thì số nhỏ trông lạnh, nên:
// - Dưới PLAY_COUNT_SHOW lượt: không hiện gì (trước đây là 3 vạch mức nghe, nhưng trông giống hệt
//   sóng nhạc của bài đang phát nên khách tưởng nhiều bài cùng phát — đã bỏ)
// - Từ PLAY_COUNT_SHOW lượt: hiện số "1,2k lượt nghe"
// - 3 bài nhiều nhất mỗi trạm (từ PLAY_HOT_MIN lượt) có nhãn "Nghe nhiều"
// Kèm nhãn "Mới" cho bài upload chưa quá NEW_TRACK_DAYS ngày (không cần công tắc)
// Dùng chung cho danh sách điện thoại, tab Nhạc máy tính và cửa sổ nổi (MiniPlayer).

import {useLang, useT, type Lang} from './i18n'
import {stationOf, type Track} from './tracks'

export const PLAY_COUNT_SHOW = 50
const PLAY_HOT_MIN = 3
const PLAY_HOT_TOP = 3

export type PlayStat = {n: number; hot: boolean}

// Lượt nghe + nhãn "Nghe nhiều" của từng bài, so trong cùng trạm
export function playStats(tracks: Track[], counts: Record<string, number>) {
  const stats = new Map<string, PlayStat>()
  const byStation = new Map<string, Track[]>()
  for (const tr of tracks) {
    const st = stationOf(tr)
    byStation.set(st, [...(byStation.get(st) ?? []), tr])
  }
  for (const list of byStation.values()) {
    const hot = new Set(
      list
        .filter((tr) => (counts[tr.id] ?? 0) >= PLAY_HOT_MIN)
        .sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
        .slice(0, PLAY_HOT_TOP)
        .map((tr) => tr.id),
    )
    for (const tr of list) {
      stats.set(tr.id, {n: counts[tr.id] ?? 0, hot: hot.has(tr.id)})
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

// Cột phải dưới thời lượng: số lượt, chỉ khi bài đã có từ PLAY_COUNT_SHOW lượt
export function PlayMeter({stat}: {stat?: PlayStat}) {
  const t = useT()
  const lang = useLang()
  if (!stat || stat.n < PLAY_COUNT_SHOW) return null
  return <span className="whitespace-nowrap text-[11px] tabular-nums text-[#a79e94]/80">{t.room.plays(formatPlays(stat.n, lang))}</span>
}

// Nhãn nhỏ cạnh tên / dòng phụ của bài nằm trong top trạm
// Màu bạc hà để khác nhãn "Nghe nhiều" (cam)
// `quiet`: bài trong trạm mới mở — tab trạm đã ghi "Mới" rồi
export function NewBadge({track, quiet}: {track: Track; quiet?: boolean}) {
  const t = useT()
  if (!track.isNew || quiet) return null
  return (
    <span className="shrink-0 rounded-full border border-[#9fdcbc]/35 bg-[#9fdcbc]/10 px-1.5 text-[10.5px] leading-4 text-[#9fdcbc]">{t.room.newTrack}</span>
  )
}

// Chữ "Mới" trên tab trạm mới mở (cùng màu bạc hà với nhãn bài mới)
export function NewStationBadge() {
  const t = useT()
  return (
    <>
      <span aria-hidden className="ml-1.5 inline-block rounded-full border border-[#9fdcbc]/40 bg-[#9fdcbc]/15 px-1.5 align-[1px] text-[10px] font-medium uppercase leading-4 tracking-[0.06em] text-[#9fdcbc]">
        {t.room.newTrack}
      </span>
      <span className="sr-only">, {t.room.newStation}</span>
    </>
  )
}

// Bài có giọng hát (Studio: "Có lời") — màu tím nhạt, khác "Mới" (bạc hà) và "Nghe nhiều" (cam)
// `quiet`: đang xem trạm mà bài nào cũng có lời (Memories), nhãn ở từng bài thành thừa
export function VocalBadge({track, quiet}: {track: Track; quiet?: boolean}) {
  const t = useT()
  if (!track.vocals || quiet) return null
  return (
    <span title={t.room.vocalsTitle} className="shrink-0 rounded-full border border-[#cdb6ee]/35 bg-[#cdb6ee]/10 px-1.5 text-[10.5px] leading-4 text-[#cdb6ee]">
      {t.room.vocals}
    </span>
  )
}

export function HotBadge({stat}: {stat?: PlayStat}) {
  const t = useT()
  if (!stat?.hot) return null
  return (
    <span className="shrink-0 rounded-full border border-[#e8b27d]/35 bg-[#e8b27d]/10 px-1.5 text-[10.5px] leading-4 text-[#e8b27d]">{t.room.hot}</span>
  )
}

// Sóng nhạc của bài đang phát. Mỗi vạch có chiều cao riêng: giảm chuyển động thì hiệu ứng tắt,
// sóng đứng yên ở 3 mức cao thấp (không có chiều cao riêng thì vạch về 0, sóng biến mất).
// `small`: bản nhỏ trên chip trạm đang phát. Dùng chung cho danh sách nhạc và cửa sổ nổi (MiniPlayer)
export function EqualizerIcon({small}: {small?: boolean}) {
  const t = useT()
  return (
    <span role="img" className={`flex items-end gap-[2px] ${small ? 'ml-1.5 h-2.5' : 'h-3'}`} aria-label={small ? `, ${t.room.playing}` : t.room.playing}>
      {[
        [0, '45%'],
        [150, '100%'],
        [300, '70%'],
      ].map(([delay, height]) => (
        <span
          key={delay}
          className={`animate-[chill-eq_0.9s_ease-in-out_infinite] rounded-full bg-[#e8b27d] ${small ? 'w-[2px]' : 'w-[3px]'}`}
          style={{animationDelay: `${delay}ms`, height}}
        />
      ))}
    </span>
  )
}
