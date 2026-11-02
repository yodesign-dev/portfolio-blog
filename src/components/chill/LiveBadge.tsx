'use client'

import {useEffect, useState} from 'react'
import {trackEvent} from '@/lib/analytics'
import {YOUTUBE_URL} from '@/lib/site'
import {useT} from './i18n'
import {liveStatus, readLivePreview, type ChillLive, type LiveStatus} from './live'

// Huy hiệu buổi live YouTube trên thanh trên cùng: sắp live thì báo giờ theo đồng hồ của khách,
// đang live thì chấm đỏ nhấp nháy. Bấm khi đang live thì nhạc quán dừng (onJoin) để khỏi chồng
// tiếng với YouTube; bấm khi chưa live thì nhạc vẫn chạy vì trang chờ không có tiếng.
const pad = (n: number) => String(n).padStart(2, '0')

export function LiveBadge({lives, onJoin}: {lives: ChillLive[]; onJoin: () => void}) {
  const t = useT()
  const [list, setList] = useState(lives)
  const [status, setStatus] = useState<LiveStatus | null>(null)

  // So giờ mỗi phút: đúng giờ là đổi, kể cả tab đang mở. ?live= để xem trước
  useEffect(() => {
    const tick = () => {
      const now = Date.now()
      const preview = readLivePreview(window.location.search, YOUTUBE_URL, now)
      setStatus(preview !== undefined ? preview : liveStatus(list, now))
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [list])

  // Tab mở lâu: 10 phút hỏi lại lịch để thấy buổi live mới tạo và nút tắt trong Studio
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return
      fetch('/api/chill-live')
        .then((r) => (r.ok ? r.json() : null))
        .then((d: {lives?: ChillLive[]} | null) => {
          if (d?.lives) setList(d.lives)
        })
        .catch(() => {})
    }, 10 * 60_000)
    return () => clearInterval(id)
  }, [])

  const liveId = status?.live.id
  const state = status?.state
  useEffect(() => {
    if (liveId && state) trackEvent({name: 'Chill Live', props: {id: liveId, state, action: 'view'}})
  }, [liveId, state])

  if (!status) return null

  const on = status.state === 'on'
  const start = new Date(status.live.start)
  const time = `${pad(start.getHours())}:${pad(start.getMinutes())}`
  const day = start.toDateString() === new Date().toDateString() ? t.live.today : t.live.tomorrow

  return (
    <a
      href={status.live.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={on ? t.live.onAria : t.live.soonAria(day, time)}
      title={on ? t.live.onAria : t.live.soonAria(day, time)}
      onClick={() => {
        if (on) onJoin()
        trackEvent({name: 'Chill Live', props: {id: status.live.id, state: status.state, action: 'click'}})
      }}
      // Điện thoại: hàng nút trên đã chật → nằm cuối dòng chú thích (điểm đến · giờ), đối diện phía phải
      className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border border-[#ff6b5e]/45 bg-black/55 px-2.5 font-mono max-sm:absolute max-sm:right-3 max-sm:top-[3.1rem] max-sm:h-7 max-sm:px-2 text-[10px] uppercase tracking-[0.18em] text-white backdrop-blur transition hover:bg-black/75 focus-visible:outline-2 focus-visible:outline-[#e8b27d] sm:text-[11px]"
    >
      <span aria-hidden className="relative flex h-2 w-2">
        {on && <span className="absolute inset-0 rounded-full bg-[#ff6b5e] opacity-70 motion-safe:animate-ping" />}
        <span className={`relative h-2 w-2 rounded-full ${on ? 'bg-[#ff6b5e]' : 'border border-[#ff6b5e]'}`} />
      </span>
      {on ? (
        <>
          {t.live.on}
          <span className="hidden normal-case tracking-normal text-white/80 lg:inline">· {t.live.watch} ↗</span>
        </>
      ) : (
        <>
          {t.live.soon}
          <span className="hidden sm:inline">{day}</span>
          <span className="tabular-nums">{time}</span>
        </>
      )}
    </a>
  )
}
