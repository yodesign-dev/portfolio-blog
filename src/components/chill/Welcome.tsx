'use client'

// Màn chào kiểu onboarding của /chill (công tắc Studio welcomeObOpen, ?ob=1 / ?ob=0 ghi đè).
// - Khách mới: mỗi màn 1 câu hỏi. Bước 1 "Ai ngồi ở quầy?" (chỉ khi phòng có bản nữ), chạm là
//   cảnh đổi theo và sang bước 2 "Bạn đến quán để…": Nghe nhạc / ChromoTime / Chỉ ngắm cảnh.
// - Khách quay lại: 1 nút chính làm lại việc lần trước, 2 nút phụ, các thiết lập gom vào 1 dòng
//   tóm tắt có nút Sửa (chỉ đổi người ngồi; phòng và điểm đến vẫn ở Cài đặt).
// Không hỏi tên ở đây: tên chỉ cần khi ngồi bàn nhóm hoặc viết sổ quán.
import {useEffect, useState, type ReactNode} from 'react'
import {trackEvent} from '@/lib/analytics'
import {useT} from './i18n'
import {useMyName} from './identity'
import {SEATS, type Seat} from './themes'

export type WelcomeGoal = 'music' | 'focus' | 'look'

const GOAL_KEY = 'chill:welcome-goal'
const MINUTES_KEY = 'chill:focus-min'

// Mặt người ngồi cắt từ ảnh nội thất (giống nút chọn trong Cài đặt)
const FACES: Record<Seat, string> = {boy: '/chill/scenes/interior.webp', girl: '/chill/scenes/interior-girl.webp'}
function Face({seat, size}: {seat: Seat; size: number}) {
  const k = size / 28
  return (
    <span
      aria-hidden
      className="block shrink-0 rounded-full bg-[#c4d6e2] bg-no-repeat [image-rendering:pixelated]"
      style={{width: size, height: size, backgroundImage: `url(${FACES[seat]})`, backgroundSize: `${224 * k}px ${126 * k}px`, backgroundPosition: `${-171 * k}px ${-47 * k}px`}}
    />
  )
}

const NoteIcon = ({className = ''}: {className?: string}) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
)
const TimerIcon = ({className = ''}: {className?: string}) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2 2M9 2h6" />
  </svg>
)
const EyeIcon = ({className = ''}: {className?: string}) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const ring = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b27d]'

export function Welcome({
  entered,
  onGone,
  returning,
  visitDay,
  level,
  canPickSeat,
  seat,
  onSeat,
  room,
  place,
  station,
  loaded,
  onGoal,
  top,
  legal,
}: {
  entered: boolean
  onGone: () => void
  // null = chưa đọc xong localStorage
  returning: boolean | null
  visitDay: number
  level: string
  // Studio bật seatPickOpen và phòng đang chọn có bản nữ
  canPickSeat: boolean
  seat: Seat
  onSeat: (seat: Seat) => void
  room: string
  place: string
  station: string
  loaded: boolean
  onGoal: (goal: WelcomeGoal) => void
  // Hàng trên cùng (về trang Bin + EN/VI) và dòng điều khoản
  top: ReactNode
  legal: ReactNode
}) {
  const t = useT()
  const w = t.welcome.ob
  const name = useMyName()
  const [last, setLast] = useState<WelcomeGoal | null>(null)
  const [minutes, setMinutes] = useState(25)
  // Khách quay lại bấm Sửa → chọn lại người ngồi ngay trong dòng tóm tắt
  const [editing, setEditing] = useState(false)
  // Khách mới: bước 1 chọn người ngồi (bỏ qua khi phòng không có bản nữ), bước 2 chọn việc
  const [step, setStep] = useState<1 | 2>(1)
  useEffect(() => {
    try {
      /* eslint-disable react-hooks/set-state-in-effect -- đọc localStorage sau khi hydrate */
      const g = localStorage.getItem(GOAL_KEY)
      if (g === 'music' || g === 'focus' || g === 'look') setLast(g)
      const m = Number(localStorage.getItem(MINUTES_KEY))
      if (m >= 5 && m <= 120) setMinutes(m)
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // Chặn storage → mặc định nghe nhạc, 25 phút
    }
  }, [])

  const choose = (goal: WelcomeGoal) => {
    if (!loaded) return
    try {
      localStorage.setItem(GOAL_KEY, goal)
    } catch {
      // bỏ qua
    }
    trackEvent({name: 'Chill Welcome', props: {goal, visitor: returning ? 'returning' : 'new'}})
    onGoal(goal)
  }
  const pickSeat = (s: Seat) => {
    onSeat(s)
    setStep(2)
  }

  const showSeatStep = canPickSeat && step === 1
  const steps = canPickSeat ? 2 : 1
  const busy = loaded ? '' : 'cursor-progress opacity-60'
  const seatName = t.room.seats[seat]

  // Khách quay lại: nút chính làm lại việc lần trước (chưa có thì nghe nhạc)
  const focusFirst = last === 'focus'
  const primary = focusFirst
    ? {goal: 'focus' as const, icon: <TimerIcon className="size-7" />, title: w.continueFocus, desc: w.continueFocusDesc(minutes)}
    : {goal: 'music' as const, icon: <NoteIcon className="size-7" />, title: w.continueMusic, desc: w.continueMusicDesc(station)}
  const second = focusFirst
    ? {goal: 'music' as const, icon: <NoteIcon className="size-5 text-[#e8b27d]" />, label: w.onlyMusic}
    : {goal: 'focus' as const, icon: <TimerIcon className="size-5 text-[#e8b27d]" />, label: w.startFocus}

  return (
    <div
      inert={entered}
      onTransitionEnd={(e) => entered && e.target === e.currentTarget && onGone()}
      className={`absolute inset-0 z-50 flex flex-col items-center justify-end bg-gradient-to-t from-black/90 via-black/50 to-black/10 px-4 pb-[max(2rem,7dvh)] text-[#ede6dd] transition-opacity duration-500 portrait:bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55),transparent_22%,transparent_40%,rgba(0,0,0,0.6)_56%)] portrait:px-0 portrait:pb-0 ${
        entered ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3 sm:p-5">{top}</div>

      {returning === null ? null : !returning ? (
        // ——— PA 1 · Khách mới: mỗi màn 1 câu hỏi ———
        <div className="flex w-full max-w-3xl flex-col items-center gap-6 text-center portrait:rounded-t-3xl portrait:bg-[#1b1511]/95 portrait:px-5 portrait:pb-[max(1.5rem,env(safe-area-inset-bottom))] portrait:gap-4 portrait:pt-5 portrait:backdrop-blur sm:gap-7">
          {steps > 1 && (
            <div className="flex items-center gap-2" aria-label={w.steps(showSeatStep ? 1 : 2, steps)}>
              <span className="h-1.5 w-7 rounded-full bg-[#e8b27d]" />
              <span className={`h-1.5 w-7 rounded-full ${showSeatStep ? 'bg-white/25' : 'bg-[#e8b27d]'}`} />
              <span className="ml-1.5 font-mono text-[11px] text-white/70">{showSeatStep ? '1' : '2'}/{steps}</span>
            </div>
          )}
          {showSeatStep ? (
            <>
              <div className="flex flex-col items-center gap-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e8b27d] portrait:hidden">Chill for work</p>
                <h2 className="text-balance text-2xl font-bold leading-tight tracking-tight text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.7)] sm:text-4xl">{t.welcome.seat}</h2>
                <p className="text-sm text-[#d8cfc5] sm:text-base">{w.seatSub}</p>
              </div>
              <div className="flex gap-3 sm:gap-5" role="radiogroup" aria-label={t.welcome.seat}>
                {SEATS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={s === seat}
                    onClick={() => pickSeat(s)}
                    className={`flex size-36 flex-col items-center justify-center gap-3 rounded-2xl border-2 bg-black/60 backdrop-blur transition hover:border-[#e8b27d] motion-safe:hover:-translate-y-0.5 sm:size-48 ${ring} ${
                      s === seat ? 'border-[#e8b27d]' : 'border-white/15'
                    }`}
                  >
                    <span className="sm:hidden"><Face seat={s} size={72} /></span>
                    <span className="hidden sm:block"><Face seat={s} size={100} /></span>
                    <span className="text-lg font-bold sm:text-xl">{t.room.seats[s]}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/60 sm:text-sm">{w.later}</p>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3">
                {canPickSeat && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className={`flex h-9 items-center gap-2 rounded-full border border-white/20 bg-black/50 pl-1 pr-3.5 text-sm backdrop-blur transition hover:border-[#e8b27d] ${ring}`}
                  >
                    <Face seat={seat} size={26} />
                    {w.seatChip(seatName)}
                  </button>
                )}
                {!canPickSeat && <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e8b27d]">Chill for work</p>}
                <h2 className="text-balance text-2xl font-bold leading-tight tracking-tight text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.7)] sm:text-4xl">{w.goal}</h2>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-5">
                <button
                  type="button"
                  onClick={() => choose('music')}
                  aria-busy={!loaded}
                  className={`flex items-center gap-4 rounded-2xl bg-[#e8b27d] px-4 py-3.5 text-left text-[#1a1410] shadow-[0_16px_40px_-12px_rgba(232,178,125,0.7)] transition hover:bg-[#f0c294] motion-safe:hover:-translate-y-0.5 sm:w-80 sm:flex-col sm:items-start sm:gap-2 sm:p-6 ${ring} ${busy}`}
                >
                  <NoteIcon className="size-7 shrink-0 sm:size-8" />
                  <span className="flex flex-col gap-0.5 sm:gap-2">
                    <span className="text-lg font-extrabold sm:text-[22px]">{w.music}</span>
                    <span className="text-[13px] leading-snug sm:text-[15px]">{w.musicDesc}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => choose('focus')}
                  aria-busy={!loaded}
                  className={`flex items-center gap-4 rounded-2xl border-2 border-[#e8b27d]/55 bg-black/70 px-4 py-3.5 text-left backdrop-blur transition hover:border-[#e8b27d] motion-safe:hover:-translate-y-0.5 sm:w-80 sm:flex-col sm:items-start sm:gap-2 sm:p-6 ${ring} ${busy}`}
                >
                  <TimerIcon className="size-7 shrink-0 text-[#e8b27d] sm:size-8" />
                  <span className="flex flex-col gap-0.5 sm:gap-2">
                    <span className="flex items-center gap-2 text-lg font-extrabold sm:text-[22px]">
                      {w.focus}
                      <span className="rounded-md bg-[#e8b27d]/20 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[#f3cfa8]">{w.isNew}</span>
                    </span>
                    <span className="text-[13px] leading-snug text-[#d8cfc5] sm:text-[15px]">{w.focusDesc(minutes)}</span>
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => choose('look')}
                className={`flex min-h-11 items-center px-3 text-sm text-white/85 underline underline-offset-4 transition hover:text-white ${ring}`}
              >
                {w.look}
              </button>
            </>
          )}
          <div className="text-[10px] text-white/45">{legal}</div>
        </div>
      ) : (
        // ——— PA 2 · Khách quay lại: 1 chạm ———
        <div className="flex w-full max-w-xl flex-col items-center gap-6 text-center portrait:items-stretch portrait:gap-4 portrait:rounded-t-3xl portrait:bg-[#1b1511]/95 portrait:px-5 portrait:pb-[max(1.5rem,env(safe-area-inset-bottom))] portrait:pt-6 portrait:text-left portrait:backdrop-blur">
          <div className="flex flex-col items-center gap-2 portrait:items-start">
            {visitDay >= 2 && <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#e8b27d]">{w.day(visitDay, level)}</p>}
            <h2 className="text-balance text-2xl font-bold leading-tight tracking-tight text-white [text-shadow:0_2px_16px_rgba(0,0,0,0.7)] sm:text-4xl">{name ? w.back(name) : w.backNoName}</h2>
          </div>
          <div className="flex w-full flex-col items-center gap-3 portrait:items-stretch">
            <button
              type="button"
              onClick={() => choose(primary.goal)}
              aria-busy={!loaded}
              className={`flex w-full max-w-md items-center gap-4 rounded-2xl bg-[#e8b27d] px-5 py-4 text-left text-[#1a1410] shadow-[0_16px_40px_-12px_rgba(232,178,125,0.7)] transition hover:bg-[#f0c294] motion-safe:hover:-translate-y-0.5 portrait:max-w-none sm:px-6 ${ring} ${busy}`}
            >
              {primary.icon}
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-lg font-extrabold sm:text-xl">{primary.title}</span>
                <span className="truncate text-sm">{primary.desc}</span>
              </span>
            </button>
            <div className="grid w-full max-w-md grid-cols-2 gap-3 portrait:max-w-none">
              <button
                type="button"
                onClick={() => choose(second.goal)}
                className={`flex h-12 items-center justify-center gap-2 rounded-xl border border-[#e8b27d]/55 bg-black/60 text-[15px] font-bold backdrop-blur transition hover:border-[#e8b27d] ${ring} ${busy}`}
              >
                {second.icon}
                {second.label}
              </button>
              <button
                type="button"
                onClick={() => choose('look')}
                className={`flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/60 text-[15px] font-bold backdrop-blur transition hover:border-white/40 ${ring}`}
              >
                <EyeIcon className="size-5 text-[#c9bfb4]" />
                {w.lookShort}
              </button>
            </div>
          </div>
          {/* Dòng tóm tắt: khách biết mình đang vào chỗ nào, Sửa chỉ đổi người ngồi */}
          <div className="flex max-w-full items-center gap-3 rounded-full border border-white/10 bg-black/60 py-1.5 pl-1.5 pr-1.5 text-sm backdrop-blur portrait:rounded-2xl">
            {editing && canPickSeat ? (
              <div className="flex gap-1" role="radiogroup" aria-label={t.welcome.seat}>
                {SEATS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={s === seat}
                    onClick={() => {
                      onSeat(s)
                      setEditing(false)
                    }}
                    className={`flex h-9 items-center gap-2 rounded-full pl-1 pr-3.5 font-semibold transition ${ring} ${s === seat ? 'bg-[#e8b27d] text-[#1a1410]' : 'text-white/85 hover:bg-white/10'}`}
                  >
                    <Face seat={s} size={28} />
                    {t.room.seats[s]}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <Face seat={canPickSeat ? seat : 'boy'} size={32} />
                <span className="min-w-0 truncate pr-1 text-[#e6ddd3]">
                  {[canPickSeat ? w.summarySeat(seatName) : null, room, place].filter(Boolean).join(' · ')}
                </span>
                {canPickSeat && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    aria-label={w.editAria}
                    className={`ml-auto h-9 shrink-0 rounded-full bg-[#e8b27d]/15 px-3.5 font-bold text-[#f3cfa8] transition hover:bg-[#e8b27d]/25 ${ring}`}
                  >
                    {w.edit}
                  </button>
                )}
              </>
            )}
          </div>
          <div className="text-[10px] text-white/45 portrait:text-center">{legal}</div>
        </div>
      )}
    </div>
  )
}
