'use client'

// Đồng hồ phin + thẻ khách quen trang /chill — nút trên thanh trên, ngay cạnh giờ điểm đến.
// Điện thoại: chưa chạy thì chỉ hiện biểu tượng phin, đang chạy hiện giờ còn lại.
//
// - Đồng hồ: chọn 15 / 25 / 45 phút, phin "nhỏ giọt" tới khi hết giờ thì chuông kêu, mèo
//   báo xong (ChillRoom: onDone). Giờ kết thúc lưu trên máy nên tải lại trang vẫn chạy
//   tiếp; hết giờ trong lúc đóng trang thì bỏ qua, không tính phin
// - Thẻ khách quen: mỗi ngày ghé 1 dấu chân mèo, 10 dấu đầy 1 thẻ (xem regular.ts)

import {useEffect, useRef, useState} from 'react'
import {trackEvent} from '@/lib/analytics'
import {useT} from './i18n'
import {CARD_SLOTS, cardOf, levelOf, streakOf, type Regular} from './regular'

const FOCUS_KEY = 'chill:focus'
const MINUTES_KEY = 'chill:focus-min'
const OPTIONS = [15, 25, 45]
// Sau khi xong, nút giữ chữ "Xong 1 phin" một lúc rồi về bình thường
const DONE_MS = 60_000

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function store(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Chặn storage — đồng hồ vẫn chạy, chỉ không qua được lần tải lại trang
  }
}

export function Focus({
  regular,
  onPrime,
  onDone,
  onTick,
  onOpenChange,
}: {
  regular: Regular
  // Bấm "Bắt đầu" → mở sẵn đường tiếng cho chuông lúc hết giờ
  onPrime: () => void
  // Làm xong 1 phin
  onDone: () => void
  // Thời gian còn lại (mm:ss) cho tiêu đề tab; null = không đếm
  onTick: (label: string | null) => void
  // Bảng đang mở → thanh trên đừng tự ẩn
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [minutes, setMinutes] = useState(25)
  const [session, setSession] = useState<{endsAt: number; minutes: number} | null>(null)
  const [now, setNow] = useState(0)
  const [doneAt, setDoneAt] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  // Khôi phục sau khi hydrate: phút đã chọn + phiên đang chạy dở
  useEffect(() => {
    try {
      /* eslint-disable react-hooks/set-state-in-effect */
      const savedMin = Number(localStorage.getItem(MINUTES_KEY))
      if (OPTIONS.includes(savedMin)) setMinutes(savedMin)
      const saved = JSON.parse(localStorage.getItem(FOCUS_KEY) ?? 'null') as {endsAt?: number; minutes?: number} | null
      if (saved?.endsAt && saved.endsAt > Date.now() && saved.minutes) {
        setSession({endsAt: saved.endsAt, minutes: saved.minutes})
        setNow(Date.now())
      } else if (saved) store(FOCUS_KEY, null)
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // Chặn storage → bắt đầu từ đầu
    }
  }, [])

  // Đếm theo đồng hồ thật (timer bị bóp khi tab chạy nền vẫn không lệch giờ)
  useEffect(() => {
    if (!session) return
    const tick = () => {
      const at = Date.now()
      if (at < session.endsAt) return setNow(at)
      setSession(null)
      store(FOCUS_KEY, null)
      setDoneAt(at)
      trackEvent({name: 'Chill Focus', props: {action: 'done'}})
      onDone()
    }
    const id = window.setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [session, onDone])

  const left = session ? Math.max(0, session.endsAt - now) : 0
  const label = session ? clock(left) : null
  useEffect(() => onTick(label), [label, onTick])
  useEffect(() => () => onTick(null), [onTick])

  useEffect(() => {
    if (!doneAt) return
    const id = window.setTimeout(() => setDoneAt(0), DONE_MS)
    return () => window.clearTimeout(id)
  }, [doneAt])

  useEffect(() => onOpenChange(open), [open, onOpenChange])
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (m: number) => {
    setMinutes(m)
    store(MINUTES_KEY, m)
  }

  const start = () => {
    const at = Date.now()
    const next = {endsAt: at + minutes * 60_000, minutes}
    onPrime()
    setNow(at)
    setDoneAt(0)
    setSession(next)
    store(FOCUS_KEY, next)
    trackEvent({name: 'Chill Focus', props: {action: 'start'}})
  }

  const stop = () => {
    setSession(null)
    store(FOCUS_KEY, null)
    trackEvent({name: 'Chill Focus', props: {action: 'stop'}})
  }

  const progress = session ? 1 - left / (session.minutes * 60_000) : 0
  const {stamps, card} = cardOf(regular.total)
  const streak = streakOf(regular)
  const done = doneAt > 0 && !session

  return (
    // Điện thoại: bảng neo theo cả thanh trên (sát mép phải màn hình) cho khỏi tràn mép trái
    <div ref={ref} className="sm:relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="chill-focus"
        aria-label={session ? t.focus.runningAria(clock(left)) : t.focus.open}
        title={t.focus.title}
        className={`flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs backdrop-blur transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] ${
          session || open || done
            ? 'border-[#e8b27d]/60 bg-[#2a1f18]/85 text-[#f6dcbd]'
            : 'border-[#e8b27d]/45 bg-[#2a1f18]/75 text-[#f6dcbd] hover:border-[#e8b27d]/80 hover:text-white'
        }`}
      >
        <PhinIcon dripping={Boolean(session)} />
        {session ? <span className="font-mono text-[11px] tabular-nums">{clock(left)}</span> : <span className="hidden font-medium sm:inline">{done ? t.focus.doneChip : t.focus.chip}</span>}
      </button>

      {open && (
        <div
          id="chill-focus"
          role="dialog"
          aria-label={t.focus.title}
          className="absolute right-3 top-full z-40 mt-2 w-[min(300px,calc(100vw-24px))] sm:right-0 rounded-2xl border border-white/10 bg-[#1b1a21]/95 p-4 text-left text-[#ede6dd] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#e8b27d]">{t.focus.title}</p>

          {session ? (
            <>
              <p className="mt-2 font-mono text-4xl tabular-nums tracking-tight text-[#f3ece4]" aria-live="off">
                {clock(left)}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                <div className="h-full rounded-full bg-[#e8b27d] transition-[width] duration-1000 ease-linear" style={{width: `${progress * 100}%`}} />
              </div>
              <p className="mt-2 text-xs text-[#a79e94]">{t.focus.dripping}</p>
              <button
                type="button"
                onClick={stop}
                className="mt-3 w-full rounded-full border border-white/15 py-2 text-sm text-[#c9c0b6] transition hover:bg-white/[0.06] hover:text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
              >
                {t.focus.stop}
              </button>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm leading-relaxed text-[#ede6dd]" role={done ? 'status' : undefined}>
                {done ? t.focus.doneBody : t.focus.pitch}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl border border-white/10 p-1" role="radiogroup" aria-label={t.focus.length}>
                {OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={minutes === m}
                    onClick={() => choose(m)}
                    className={`rounded-lg py-2 text-[13px] transition focus-visible:outline-2 focus-visible:outline-[#e8b27d] ${
                      minutes === m ? 'bg-[#e8b27d]/15 text-[#f3cfa8]' : 'text-[#a79e94] hover:bg-white/[0.04] hover:text-[#ede6dd]'
                    }`}
                  >
                    {t.focus.minutes(m)}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={start}
                className="mt-3 w-full rounded-full bg-[#e8b27d] py-2.5 text-sm font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
              >
                {done ? t.focus.again : t.focus.start}
              </button>
            </>
          )}

          <div className="mt-4 border-t border-white/[0.08] pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#a79e94]">{t.regular.card(card)}</p>
              <span className="rounded-full border border-[#e8b27d]/40 bg-[#e8b27d]/10 px-2 py-0.5 text-[11px] font-medium text-[#f3cfa8]">
                {t.regular.levels[levelOf(regular.total)]}
              </span>
            </div>
            <ol className="mt-2 grid grid-cols-10 gap-1" aria-label={t.regular.stampsAria(stamps, CARD_SLOTS)}>
              {Array.from({length: CARD_SLOTS}).map((_, i) => (
                <li
                  key={i}
                  aria-hidden
                  className={`flex aspect-square items-center justify-center rounded-full border ${
                    i < stamps ? 'border-[#e8b27d] bg-[#e8b27d] text-[#2a1a10]' : 'border-dashed border-white/20 text-transparent'
                  }`}
                >
                  <PawIcon />
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs leading-relaxed text-[#a79e94]">
              {t.regular.summary(regular.total, streak, regular.phins)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Phin nhôm trên ly thuỷ tinh; đang đếm giờ thì có giọt rơi
function PhinIcon({dripping}: {dripping: boolean}) {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" aria-hidden>
      <path d="M3 1.5h8M2 3.5h10M4 3.5v3h6v-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 8.5v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4.2 12h5.6v1.4a.4.4 0 0 1-.4.4H4.6a.4.4 0 0 1-.4-.4V12Z" fill="currentColor" opacity=".7" />
      {dripping && <circle className="chill-drip" cx="7" cy="7.6" r="0.9" fill="currentColor" />}
    </svg>
  )
}

function PawIcon() {
  return (
    <svg width="60%" height="60%" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <ellipse cx="8" cy="11" rx="3.6" ry="3" />
      <circle cx="3.4" cy="6.6" r="1.6" />
      <circle cx="6.2" cy="3.8" r="1.6" />
      <circle cx="9.8" cy="3.8" r="1.6" />
      <circle cx="12.6" cy="6.6" r="1.6" />
    </svg>
  )
}
