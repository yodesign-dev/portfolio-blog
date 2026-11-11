'use client'

// Màn chào kiểu onboarding của /chill (công tắc Studio welcomeObOpen, ?ob=1 / ?ob=0 ghi đè).
// Một bố cục cho mọi khách, vào quán bằng 1 chạm:
// - 1 nút chính: khách quay lại làm lại việc lần trước, khách mới thì Nghe nhạc (tên trạm + bài nằm
//   ngay trong nút)
// - 2 nút phụ: Tập trung (ChromoTime, bắt đầu ngay 1 phin với số phút đã lưu) và Ngắm cảnh
// - Người ngồi quầy là công tắc Anh/Chị (chỉ khi phòng có bản nữ), không phải câu hỏi
// Màn ngang: 1 thanh trên dải quầy gỗ dưới cùng, đúng chỗ máy nghe nhạc sẽ hiện sau khi vào quán.
// Màn dọc: chữ nằm trên cảnh, nút nằm dưới cảnh, không gì đè lên dải cảnh.
// Không hỏi tên ở đây: tên chỉ cần khi ngồi bàn nhóm hoặc viết sổ quán.
import {useEffect, useEffectEvent, useState, type ReactNode} from 'react'
import {trackEvent} from '@/lib/analytics'
import {CUSTOM_MAX, CUSTOM_MIN} from './BrewDesk'
import {OPTIONS as FOCUS_OPTIONS} from './Focus'
import {useT} from './i18n'
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
// Màn thấp (điện thoại xoay ngang): ẩn các dòng phụ
const short = '[@media(max-height:500px)]:hidden'

type Goal = {goal: WelcomeGoal; icon: (className: string) => ReactNode; title: string; sub: string}

// Nút chính: việc + dòng phụ (tên trạm và bài, hoặc ChromoTime)
function PrimaryButton({item, busy, onChoose, className = ''}: {item: Goal; busy: boolean; onChoose: (goal: WelcomeGoal) => void; className?: string}) {
  return (
    <button
      type="button"
      onClick={() => onChoose(item.goal)}
      // Trang chưa tải xong script thì bấm chưa có tác dụng → nút mờ + con trỏ chờ
      aria-busy={busy}
      className={`flex h-16 min-w-0 items-center gap-3.5 rounded-[18px] bg-[#e8b27d] pl-5 pr-7 text-left text-[#1a1410] shadow-[0_16px_40px_-12px_rgba(232,178,125,0.7)] transition hover:bg-[#f0c294] motion-safe:hover:-translate-y-0.5 ${ring} ${busy ? 'cursor-progress opacity-60' : ''} ${className}`}
    >
      {item.icon('size-[26px] shrink-0')}
      <span className="flex min-w-0 flex-col">
        <span className="text-[17px] font-extrabold leading-tight">{item.title}</span>
        <span className="truncate text-[12.5px] font-semibold leading-snug text-[#4a3524]">{item.sub}</span>
      </span>
    </button>
  )
}

// Nút phụ. `tall` (thanh màn ngang): cao bằng nút chính, có dòng phụ. Màn dọc: 1 dòng
function SecondaryButton({item, quiet = false, tall = false, busy, onChoose, className = ''}: {item: Goal; quiet?: boolean; tall?: boolean; busy: boolean; onChoose: (goal: WelcomeGoal) => void; className?: string}) {
  return (
    <button
      type="button"
      onClick={() => onChoose(item.goal)}
      aria-busy={busy}
      className={`flex min-w-0 items-center gap-2.5 border-[1.5px] bg-black/60 text-left font-bold backdrop-blur transition ${ring} ${
        tall ? 'h-16 rounded-[18px] px-[18px] [@media(max-height:500px)]:h-[52px]' : 'h-[52px] justify-center rounded-[14px] px-2'
      } ${quiet ? 'border-white/20 hover:border-white/45' : 'border-[#e8b27d]/55 hover:border-[#e8b27d]'} ${busy ? 'cursor-progress opacity-60' : ''} ${className}`}
    >
      {item.icon(`size-5 shrink-0 ${quiet ? 'text-[#c9bfb4]' : 'text-[#e8b27d]'}`)}
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[15px] leading-tight">{item.title}</span>
        {tall && <span className={`truncate text-[11.5px] font-semibold leading-snug text-[#b9aea2] ${short}`}>{item.sub}</span>}
      </span>
    </button>
  )
}

// Công tắc người ngồi quầy. Rê chuột / chạm là tải sẵn người kia để đổi tức thì; mạng chậm thì
// nút vừa chọn hiện vòng xoay tới khi người mới hiện ra
function SeatToggle({
  seat,
  onSeat,
  onWarm,
  loading,
  label,
  names,
  touch = false,
}: {
  seat: Seat
  onSeat: (seat: Seat) => void
  onWarm: (seat: Seat) => void
  loading: Seat | null
  label: string
  names: Record<Seat, string>
  // Màn dọc: nút cao 44px cho ngón tay
  touch?: boolean
}) {
  return (
    <div className="flex shrink-0 gap-1 rounded-full border border-white/10 bg-black/55 p-1 backdrop-blur" role="radiogroup" aria-label={label}>
      {SEATS.map((s) => {
        const active = s === seat
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            aria-busy={loading === s}
            onPointerEnter={() => onWarm(s)}
            onPointerDown={() => onWarm(s)}
            onFocus={() => onWarm(s)}
            onClick={() => onSeat(s)}
            className={`flex items-center gap-2 rounded-full pl-1 pr-3.5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] ${touch ? 'h-11' : 'h-10'} ${
              active ? 'bg-[#e8b27d] text-[#2a1a10]' : 'text-white/85 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span className="relative block size-8 shrink-0">
              <Face seat={s} size={32} />
              {loading === s && <span aria-hidden className="absolute inset-0 animate-spin rounded-full border-2 border-[#2a1a10]/25 border-t-[#2a1a10] motion-reduce:animate-none" />}
            </span>
            {names[s]}
          </button>
        )
      })}
    </div>
  )
}

export function Welcome({
  entered,
  onGone,
  returning,
  visitDay,
  level,
  canPickSeat,
  seat,
  onSeat,
  onWarmSeat,
  seatLoading,
  station,
  track,
  customMinutes,
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
  onWarmSeat: (seat: Seat) => void
  seatLoading: Seat | null
  // Trạm và bài sẽ phát khi bấm nút nghe nhạc
  station: string
  track: string
  // Bàn pha phin đang bật: đồng hồ phin nhận số phút tuỳ chỉnh, không chỉ 15 / 25 / 45
  customMinutes: boolean
  loaded: boolean
  onGoal: (goal: WelcomeGoal) => void
  // Hàng trên cùng (về trang Bin + EN/VI) và dòng điều khoản
  top: ReactNode
  legal: ReactNode
}) {
  const t = useT()
  const w = t.welcome.ob
  const [last, setLast] = useState<WelcomeGoal | null>(null)
  const [minutes, setMinutes] = useState(25)
  useEffect(() => {
    try {
      /* eslint-disable react-hooks/set-state-in-effect -- đọc localStorage sau khi hydrate */
      const g = localStorage.getItem(GOAL_KEY)
      if (g === 'music' || g === 'focus' || g === 'look') setLast(g)
      // Cùng điều kiện với Focus.tsx, để số phút ghi trên nút đúng là số phút phin sẽ chạy
      const m = Number(localStorage.getItem(MINUTES_KEY))
      setMinutes(FOCUS_OPTIONS.includes(m) || (customMinutes && m >= CUSTOM_MIN && m <= CUSTOM_MAX) ? m : 25)
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // Chặn storage → mặc định nghe nhạc, 25 phút
    }
  }, [customMinutes])

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

  // Nút chính: khách quay lại lần trước hẹn giờ thì là Tập trung, còn lại là nghe nhạc
  const focusFirst = returning === true && last === 'focus'
  const music: Goal = {goal: 'music', icon: (c) => <NoteIcon className={c} />, title: returning && !focusFirst ? w.continueMusic : w.music, sub: focusFirst ? station : `${station} · ${track}`}
  const focus: Goal = {goal: 'focus', icon: (c) => <TimerIcon className={c} />, title: focusFirst ? w.continueFocus(minutes) : w.focusMin(minutes), sub: w.focus}
  const look: Goal = {goal: 'look', icon: (c) => <EyeIcon className={c} />, title: w.lookShort, sub: w.lookSub}
  const primary = focusFirst ? focus : music
  const second = focusFirst ? music : focus

  // Enter khi chưa có nút nào được focus = bấm nút chính (bàn phím cũng vào quán bằng 1 phím)
  const onEnterKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== 'Enter' || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
    const active = document.activeElement
    if (active && active !== document.body) return
    choose(primary.goal)
  })
  useEffect(() => {
    if (entered || returning === null) return
    const onKey = (e: KeyboardEvent) => onEnterKey(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [entered, returning])

  const busy = !loaded
  const eyebrow = returning ? (visitDay >= 2 ? w.day(visitDay, level) : null) : 'Chill for work'
  const title = returning ? w.backNoName : t.welcome.title
  const seatToggle = (touch: boolean) =>
    canPickSeat && <SeatToggle seat={seat} onSeat={onSeat} onWarm={onWarmSeat} loading={seatLoading} label={t.welcome.seat} names={t.room.seats} touch={touch} />

  return (
    <div
      inert={entered}
      onTransitionEnd={(e) => entered && e.target === e.currentTarget && onGone()}
      className={`absolute inset-0 z-50 bg-[linear-gradient(to_top,rgba(0,0,0,0.72),rgba(0,0,0,0.28)_16%,transparent_32%)] text-[#ede6dd] transition-opacity duration-500 portrait:bg-none ${
        entered ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3 sm:p-5">{top}</div>

      {/* Chưa đọc xong máy khách (returning === null, gồm cả HTML từ máy chủ) thì vẽ như khách mới,
          để trang vừa mở đã có tiêu đề và nút thay vì nền trống. Nút mờ tới khi trang tải xong */}
      {/* ——— Màn ngang: 1 thanh trên dải quầy. Hẹp hơn 1280px thì dòng chữ lên trên hàng nút;
          màn thấp (điện thoại xoay ngang) thì bỏ các dòng phụ cho thanh mỏng lại ——— */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2.5 px-4 pb-3 portrait:hidden">
        <div className="flex w-fit max-w-full flex-col items-center gap-3 rounded-[26px] border border-white/10 bg-[#18120e]/90 p-3 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.85)] backdrop-blur-md xl:flex-row xl:pl-6">
          <div className="flex flex-col gap-1 px-2 pt-1 text-center xl:mr-2 xl:p-0 xl:text-left">
            <h2 className="text-balance text-[17px] font-extrabold leading-tight text-white xl:whitespace-nowrap">{title}</h2>
            {returning ? (
              eyebrow && <p className={`font-mono text-[11px] uppercase tracking-[0.16em] text-[#e8b27d] xl:whitespace-nowrap ${short}`}>{eyebrow}</p>
            ) : (
              <p className={`text-[13px] text-[#cfc5ba] xl:whitespace-nowrap ${short}`}>{w.sub}</p>
            )}
          </div>
          <div className="flex max-w-full flex-wrap items-center justify-center gap-3 xl:flex-nowrap">
            <PrimaryButton item={primary} busy={busy} onChoose={choose} className="max-w-[20rem]" />
            <SecondaryButton item={second} tall busy={busy} onChoose={choose} />
            <SecondaryButton item={look} quiet tall busy={busy} onChoose={choose} />
            {canPickSeat && <span aria-hidden className="mx-1 hidden h-10 w-px bg-white/15 xl:block" />}
            {seatToggle(false)}
          </div>
        </div>
        <div className="text-[11px] text-white/60">{legal}</div>
      </div>

      {/* ——— Màn dọc: khung này trùng đúng khung cảnh (xem ChillRoom: cảnh 16:9 nằm giữa khoảng
          top-[6.5rem]…bottom-[11rem]). Hàng giữa để trống cho cảnh, chữ ở trên, nút ở dưới ——— */}
      <div className="absolute inset-x-0 bottom-[11rem] top-[6.5rem] hidden grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)] portrait:grid max-sm:top-[5.25rem]">
        <div className="flex min-h-0 flex-col items-center justify-end gap-2 px-5 pb-4 text-center">
          {eyebrow && <p className={`font-mono text-[11px] uppercase tracking-[0.2em] text-[#e8b27d] ${returning ? '' : '[@media(max-height:700px)]:hidden'}`}>{eyebrow}</p>}
          {/* Màn rất thấp (điện thoại 320×568): chữ nhỏ lại và bỏ dòng mô tả, để không chạm thanh trên */}
          <h2 className="text-balance text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl [@media(max-height:600px)]:text-xl">{title}</h2>
          {!returning && <p className="text-pretty text-sm text-[#ded5cb] sm:text-base [@media(max-height:600px)]:hidden">{w.sub}</p>}
        </div>
        <div aria-hidden className="aspect-video w-full" />
        <div className="flex min-h-0 flex-col items-center px-4 pt-[clamp(0.75rem,5dvh,3.5rem)]">
          {/* Màn dọc mà rộng (tablet, cửa sổ hẹp trên máy tính): 3 nút nằm 1 hàng cho đỡ cao.
              Dòng điều khoản đi liền dưới cùng trong luồng, để không bao giờ bị nút đè lên */}
          <div className="flex w-full max-w-md flex-col gap-3 sm:max-w-2xl [@media(max-height:600px)]:gap-2">
            <div className="flex flex-col gap-3 sm:flex-row [@media(max-height:600px)]:gap-2">
              <PrimaryButton item={primary} busy={busy} onChoose={choose} className="w-full justify-center sm:w-auto sm:flex-1" />
              <div className="grid grid-cols-2 gap-2.5 sm:flex sm:gap-3">
                <SecondaryButton item={second} busy={busy} onChoose={choose} className="sm:h-16 sm:rounded-[18px] sm:px-[18px]" />
                <SecondaryButton item={look} quiet busy={busy} onChoose={choose} className="sm:h-16 sm:rounded-[18px] sm:px-[18px]" />
              </div>
            </div>
            {canPickSeat && <div className="flex justify-center">{seatToggle(true)}</div>}
            <div className="text-center text-[11px] text-white/60">{legal}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
