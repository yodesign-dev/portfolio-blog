'use client'

// Đồng hồ phin + thẻ khách quen trang /chill — nút trên thanh trên, ngay trước giờ điểm đến.
// Điện thoại: chưa chạy thì chỉ hiện biểu tượng phin, đang chạy hiện giờ còn lại.
//
// - Đồng hồ: chọn 15 / 25 / 45 phút, phin "nhỏ giọt" tới khi hết giờ thì chuông kêu, mèo
//   báo xong (ChillRoom: onDone) và bảng tự mở với tổng kết: phin vừa xong, hôm nay được
//   mấy phin / bao nhiêu phút, chuỗi ngày ghé. Tổng kết ở yên tới khi người xem đóng bảng
//   (đa số đang ở tab khác lúc hết giờ). Giờ kết thúc lưu trên máy nên tải lại trang vẫn
//   chạy tiếp; hết giờ trong lúc đóng trang thì bỏ qua, không tính phin
// - Việc cần làm: chạm 1 việc để dành phin sắp pha cho nó (bỏ qua cũng được); xong phin thì
//   tổng kết hỏi "xong việc này chưa?" để gạch luôn (xem todo.ts)
// - Thẻ khách quen: mỗi ngày ghé 1 dấu chân mèo, 10 dấu đầy 1 thẻ (xem regular.ts)
// - Giờ nghỉ kiểu Pomodoro: xong phin thì nghỉ 5 phút, cứ 4 phin liền mạch thì nghỉ dài 15 phút.
//   Hết giờ nghỉ chuông khác kêu (ChillRoom: onBreakDone), bảng mở mời pha tiếp. Công tắc "tự
//   chạy vòng" nối phin → nghỉ → phin không cần bấm. Giờ nghỉ không tính vào phin/phút/thử thách

import {useEffect, useEffectEvent, useRef, useState, type ReactNode} from 'react'
import {trackEvent} from '@/lib/analytics'
import {useT} from './i18n'
import {CARD_SLOTS, cardOf, levelOf, streakOf, todayOf, type Regular} from './regular'
import {GiftReveal} from './ShelfBook'
import {ITEMS} from './shelf'
import {addTodo, doneTodayOf, loadTodos, removeTodo, setTodoDone, type Todo} from './todo'
import {TodoList} from './TodoList'
import {NameField} from './NameField'

const FOCUS_KEY = 'chill:focus'
const MINUTES_KEY = 'chill:focus-min'
// Đã mở bảng phin từ khi có việc cần làm → thôi chấm "mới" trên nút
const TODO_SEEN_KEY = 'chill:todo-seen'
const OPTIONS = [15, 25, 45]
const AUTO_KEY = 'chill:focus-auto'
const CHAIN_KEY = 'chill:focus-chain'
const BREAK_MIN = 5
const LONG_BREAK_MIN = 15
const LONG_EVERY = 4
// Phin mới bắt đầu trong vòng 30 phút sau phin trước (nghỉ dài 15 phút vẫn lọt) thì còn cùng 1 vòng
const CHAIN_GAP = 30 * 60_000

type Session = {endsAt: number; minutes: number; todo?: string; kind?: 'break'; long?: boolean}
// Vòng phin liền mạch: số phin đã xong + lúc phin gần nhất xong
type Chain = {count: number; lastAt: number}

const chainCount = (chain: Chain | null, at: number) => (chain && at - chain.lastAt <= CHAIN_GAP ? chain.count : 0)

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
  onBreakDone,
  onTick,
  onOpenChange,
  hint,
  openSignal = 0,
  gift = null,
  shelfCount = null,
  onOpenShelf,
  onStart,
  quest = null,
  contrib = null,
}: {
  regular: Regular
  // Bấm "Bắt đầu" → mở sẵn đường tiếng cho chuông lúc hết giờ
  onPrime: () => void
  // Làm xong 1 phin dài `minutes` phút
  onDone: (minutes: number) => void
  // Hết giờ nghỉ giữa 2 phin
  onBreakDone?: () => void
  // Thời gian còn lại (mm:ss) cho tiêu đề tab; null = không đếm
  onTick: (label: string | null) => void
  // Bảng đang mở → thanh trên đừng tự ẩn
  onOpenChange: (open: boolean) => void
  // Lời mời pha phin cho người chưa thử (xem guide.ts) — bong bóng ngay dưới nút
  hint?: string | null
  // Tăng 1 = mở bảng (nút "Thử ngay" trong Có gì mới, hành động `phin`)
  openSignal?: number
  // Món mèo vừa mang ra cho kệ sau phin này (shelf.ts) — hiện trong tổng kết
  gift?: string | null
  // Số món đã có trên kệ; null = kệ đang tắt ở Studio
  shelfCount?: number | null
  onOpenShelf?: () => void
  // Bấm "Bắt đầu" 1 phin (thử thách chung ghi lúc bắt đầu, xem ChillRoom)
  onStart?: () => void
  // Thẻ "Cả quán cùng pha phin" (QuestCard); null = thử thách đang tắt
  quest?: ReactNode
  // Dòng "phin của bạn đã góp cho quán" + tên trên bảng, hiện trong tổng kết phin
  contrib?: ReactNode
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [minutes, setMinutes] = useState(25)
  const [session, setSession] = useState<Session | null>(null)
  const [now, setNow] = useState(0)
  // Phin vừa xong (số phút + việc đã dành cho nó) — còn giữ thì bảng hiện tổng kết; đóng bảng là xoá
  const [finished, setFinished] = useState<{minutes: number; todo?: string} | null>(null)
  const [todos, setTodos] = useState<Todo[]>([])
  // Việc dành cho phin sắp pha
  const [picked, setPicked] = useState<string | null>(null)
  // Tổng kết: khách bấm "Chưa" thì thôi hỏi
  const [askSkipped, setAskSkipped] = useState(false)
  // Chấm "mới" cho khách chưa thấy danh sách việc; mặc định ẩn tới khi đọc được storage
  const [todoSeen, setTodoSeen] = useState(true)
  // 2 tab: Pha phin (hẹn giờ, việc, tổng kết) · Khách quen (Của bạn / Cả quán)
  const [tab, setTab] = useState<'brew' | 'regulars'>('brew')
  const [sub, setSub] = useState<'mine' | 'cafe'>('mine')
  const [auto, setAuto] = useState(false)
  const [chain, setChain] = useState<Chain | null>(null)
  // Vừa hết giờ nghỉ (không tự chạy) → bảng mời pha phin tiếp
  const [rested, setRested] = useState(false)
  // Phiên vừa kết thúc — chặn interval + visibilitychange cùng báo hết giờ 2 lần
  const endedRef = useRef(0)
  const ref = useRef<HTMLDivElement>(null)

  // Khôi phục sau khi hydrate: phút đã chọn + phiên đang chạy dở
  useEffect(() => {
    try {
      /* eslint-disable react-hooks/set-state-in-effect */
      setTodoSeen(Boolean(localStorage.getItem(TODO_SEEN_KEY) || localStorage.getItem('chill:todo')))
      const savedMin = Number(localStorage.getItem(MINUTES_KEY))
      if (OPTIONS.includes(savedMin)) setMinutes(savedMin)
      setAuto(localStorage.getItem(AUTO_KEY) === '1')
      const savedChain = JSON.parse(localStorage.getItem(CHAIN_KEY) ?? 'null') as Partial<Chain> | null
      if (Number(savedChain?.count) > 0 && Number(savedChain?.lastAt) > 0) setChain({count: Number(savedChain!.count), lastAt: Number(savedChain!.lastAt)})
      const saved = JSON.parse(localStorage.getItem(FOCUS_KEY) ?? 'null') as Partial<Session> | null
      if (saved?.endsAt && saved.endsAt > Date.now() && saved.minutes) {
        setSession({
          endsAt: saved.endsAt,
          minutes: saved.minutes,
          ...(typeof saved.todo === 'string' ? {todo: saved.todo} : {}),
          ...(saved.kind === 'break' ? {kind: 'break' as const, ...(saved.long ? {long: true} : {})} : {}),
        })
        setNow(Date.now())
      } else if (saved) store(FOCUS_KEY, null)
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // Chặn storage → bắt đầu từ đầu
    }
  }, [])

  // Mở bảng thì đọc lại danh sách — qua nửa đêm việc đã gạch hôm qua tự đi
  useEffect(() => {
    if (!open) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setTodos(loadTodos())
    setTodoSeen(true)
    setNow(Date.now())
    /* eslint-enable react-hooks/set-state-in-effect */
    try {
      localStorage.setItem(TODO_SEEN_KEY, '1')
    } catch {
      // Chặn storage — lần sau chấm hiện lại, không sao
    }
  }, [open])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => openSignal > 0 ? setOpen(true) : undefined, [openSignal])

  // Bắt đầu 1 phin hoặc 1 giờ nghỉ. Nghỉ dài khi vừa xong phin thứ 4, 8… của vòng
  const begin = (kind: 'phin' | 'break', at = Date.now(), round = chainCount(chain, at)) => {
    let next: Session
    if (kind === 'break') {
      const long = round > 0 && round % LONG_EVERY === 0
      next = {endsAt: at + (long ? LONG_BREAK_MIN : BREAK_MIN) * 60_000, minutes: long ? LONG_BREAK_MIN : BREAK_MIN, kind: 'break', ...(long ? {long} : {})}
      // Nghỉ dài là hết 1 vòng — phin sau đếm lại từ 1
      if (long) {
        const reset = {count: 0, lastAt: at}
        setChain(reset)
        store(CHAIN_KEY, reset)
      }
      trackEvent({name: 'Chill Focus', props: {action: 'break-start', break: long ? 'long' : 'short'}})
    } else {
      const todo = picked && todos.some((t) => t.id === picked && !t.doneDay) ? picked : undefined
      next = {endsAt: at + minutes * 60_000, minutes, ...(todo ? {todo} : {})}
      setFinished(null)
      setPicked(null)
      onStart?.()
      trackEvent({name: 'Chill Focus', props: {action: 'start'}})
    }
    onPrime()
    setNow(at)
    setRested(false)
    setSession(next)
    store(FOCUS_KEY, next)
  }

  const onEnd = useEffectEvent((s: Session) => {
    if (endedRef.current === s.endsAt) return
    endedRef.current = s.endsAt
    const at = Date.now()
    setSession(null)
    store(FOCUS_KEY, null)
    if (s.kind === 'break') {
      trackEvent({name: 'Chill Focus', props: {action: 'break-done', break: s.long ? 'long' : 'short'}})
      onBreakDone?.()
      if (auto) return begin('phin', at)
      setRested(true)
      setTab('brew')
      setOpen(true)
      return
    }
    const nextChain = {count: chainCount(chain, s.endsAt - s.minutes * 60_000) + 1, lastAt: at}
    setChain(nextChain)
    store(CHAIN_KEY, nextChain)
    setFinished({minutes: s.minutes, todo: s.todo})
    setAskSkipped(false)
    // Việc chưa gạch thì giữ cho phin sau
    if (s.todo) setPicked(s.todo)
    setTab('brew')
    setOpen(true)
    trackEvent({name: 'Chill Focus', props: {action: 'done'}})
    onDone(s.minutes)
    if (auto) begin('break', at, nextChain.count)
  })

  // Đếm theo đồng hồ thật (timer bị bóp khi tab chạy nền vẫn không lệch giờ)
  useEffect(() => {
    if (!session) return
    const tick = () => {
      const at = Date.now()
      if (at < session.endsAt) return setNow(at)
      onEnd(session)
    }
    const id = window.setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [session])

  const onBreak = session?.kind === 'break'
  const left = session ? Math.max(0, session.endsAt - now) : 0
  const label = session ? `${onBreak ? '☕ ' : ''}${clock(left)}` : null
  useEffect(() => onTick(label), [label, onTick])
  useEffect(() => () => onTick(null), [onTick])

  const close = () => {
    setOpen(false)
    setFinished(null)
    setRested(false)
  }

  useEffect(() => onOpenChange(open), [open, onOpenChange])
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
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

  const stop = () => {
    setSession(null)
    store(FOCUS_KEY, null)
    trackEvent({name: 'Chill Focus', props: onBreak ? {action: 'break-skip', break: session?.long ? 'long' : 'short'} : {action: 'stop'}})
  }

  const skipBreak = () => {
    trackEvent({name: 'Chill Focus', props: {action: 'break-skip', break: session?.long ? 'long' : 'short'}})
    begin('phin')
  }

  const toggleAuto = () => {
    const value = !auto
    setAuto(value)
    store(AUTO_KEY, value ? 1 : null)
    trackEvent({name: 'Chill Focus', props: {action: value ? 'auto-on' : 'auto-off'}})
  }

  const progress = session ? 1 - left / (session.minutes * 60_000) : 0
  const {stamps, card} = cardOf(regular.total)
  const streak = streakOf(regular)
  const done = finished !== null && !session && !rested
  const today = todayOf(regular)
  const sessionTodo = session?.todo ? todos.find((t) => t.id === session.todo) : undefined
  const finishedTodo = finished?.todo ? todos.find((t) => t.id === finished.todo) : undefined
  // Vòng phin đang đi: số phin đã xong (0 = chưa có / đã ngắt quá lâu), số chấm sáng trên 4
  const round = chainCount(chain, now)
  const roundDots = round > 0 ? ((round - 1) % LONG_EVERY) + 1 : 0
  const nextBreakLong = round > 0 && round % LONG_EVERY === 0
  const doneToday = doneTodayOf(todos)

  const add = (text: string) => {
    const next = addTodo(todos, text)
    if (next === todos) return
    setTodos(next)
    trackEvent({name: 'Chill Todo', props: {action: 'add'}})
  }
  const check = (id: string, value: boolean) => {
    setTodos(setTodoDone(todos, id, value))
    if (value && picked === id) setPicked(null)
    if (value) trackEvent({name: 'Chill Todo', props: {action: 'done'}})
  }
  const drop = (id: string) => {
    setTodos(removeTodo(todos, id))
    if (picked === id) setPicked(null)
  }

  // Tổng kết phin vừa xong — hiện sau phin, và vẫn giữ trong giờ nghỉ (tự chạy vòng thì vào nghỉ ngay)
  const summary = finished && (
    <div role="status">
      <p className="mt-2 text-lg font-semibold tracking-tight text-[#f3ece4]">{t.focus.doneTitle(finished.minutes)}</p>
      {finishedTodo && (finishedTodo.doneDay || !askSkipped) && (
        <div className="mt-3 rounded-xl border border-[#e8b27d]/30 bg-[#e8b27d]/[0.07] px-3 py-2.5">
          <p className={`break-words text-sm leading-snug ${finishedTodo.doneDay ? 'text-[#a79e94] line-through' : 'text-[#f3ece4]'}`}>{finishedTodo.text}</p>
          {finishedTodo.doneDay ? (
            <p className="mt-1 text-xs text-[#f3cfa8]">{t.todo.crossed}</p>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <span className="mr-auto text-xs text-[#c9c0b6]">{t.todo.ask}</span>
              <button
                type="button"
                onClick={() => setAskSkipped(true)}
                className="rounded-full px-2.5 py-1 text-xs text-[#a79e94] transition hover:text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
              >
                {t.todo.notYet}
              </button>
              <button
                type="button"
                onClick={() => check(finishedTodo.id, true)}
                className="rounded-full bg-[#e8b27d] px-3 py-1 text-xs font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
              >
                {t.todo.markDone}
              </button>
            </div>
          )}
        </div>
      )}
      <dl className="mt-3 grid grid-cols-3 gap-1.5">
        {[
          {value: today.phins, label: t.focus.todayPhins(today.phins)},
          {value: today.minutes, label: t.focus.todayMinutes},
          {value: streak, label: t.focus.streakDays(streak)},
        ].map((s) => (
          <div key={s.label} className="flex flex-col-reverse rounded-xl border border-white/10 bg-white/[0.03] px-2 py-2 text-center">
            <dt className="mt-0.5 text-[11px] leading-tight text-[#a79e94]">{s.label}</dt>
            <dd className="font-mono text-xl tabular-nums text-[#f3cfa8]">{s.value}</dd>
          </div>
        ))}
      </dl>
      {contrib}
      {gift && (
        <GiftReveal
          key={gift}
          id={gift}
          onSeeShelf={() => {
            close()
            onOpenShelf?.()
          }}
        />
      )}
      {doneToday > 0 && <p className="mt-2 text-xs text-[#a79e94]">{t.todo.doneToday(doneToday)}</p>}
      {!onBreak && <p className="mt-3 text-sm leading-relaxed text-[#ede6dd]">{t.focus.doneBody}</p>}
    </div>
  )

  return (
    // Điện thoại: bảng neo theo cả thanh trên (sát mép phải màn hình) cho khỏi tràn mép trái
    <div ref={ref} className="sm:relative">
      <div className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="chill-focus"
        aria-label={session ? (onBreak ? t.focus.breakAria(clock(left)) : t.focus.runningAria(clock(left))) : t.focus.open}
        title={t.focus.title}
        className={`relative flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs backdrop-blur transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] ${
          session || open || done
            ? 'border-[#e8b27d]/60 bg-[#2a1f18]/85 text-[#f6dcbd]'
            : 'border-[#e8b27d]/45 bg-[#2a1f18]/75 text-[#f6dcbd] hover:border-[#e8b27d]/80 hover:text-white'
        }`}
      >
        {onBreak ? <CupIcon /> : <PhinIcon dripping={Boolean(session)} />}
        {!todoSeen && !hint && !session && (
          <span aria-hidden className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#f08a5d] opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-black/40 bg-[#f08a5d]" />
          </span>
        )}
        {session ? <span className={`font-mono text-[11px] tabular-nums ${onBreak ? 'text-[#bfe3c4]' : ''}`}>{clock(left)}</span> : <span className="font-medium">{done ? t.focus.doneChip : t.focus.chip}</span>}
      </button>
      {hint && !open && !session && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute -right-10 top-full z-10 mt-3 whitespace-nowrap rounded-lg bg-[#e8b27d] after:right-[3.25rem] sm:right-0 sm:after:right-3 px-3 py-2 text-xs font-semibold text-[#2a1a10] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] motion-safe:animate-[chill-pop_0.35s_ease-out] after:absolute after:bottom-full after:border-[6px] after:border-transparent after:border-b-[#e8b27d] after:content-['']"
        >
          {hint}
        </button>
      )}
      </div>

      {open && (
        <div
          id="chill-focus"
          role="dialog"
          aria-label={t.focus.title}
          className="absolute right-3 top-full z-40 mt-2 max-h-[calc(100dvh-5rem)] w-[min(300px,calc(100vw-24px))] overflow-y-auto overscroll-contain sm:right-0 rounded-2xl border border-white/10 bg-[#1b1a21]/95 p-4 text-left text-[#ede6dd] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#e8b27d]">{t.focus.title}</p>
          {/* Đang chạy phin thì chỉ có đồng hồ, không tab */}
          {!session && (
            <Tabs
              className="mt-2.5"
              value={tab}
              onChange={setTab}
              items={[
                {id: 'brew', label: t.focus.tabs.brew},
                {id: 'regulars', label: t.focus.tabs.regulars},
              ]}
            />
          )}

          {session && onBreak ? (
            <>
              <p className="mt-2 text-sm font-medium text-[#bfe3c4]">{t.focus.breakTitle(Boolean(session.long))}</p>
              <p className="mt-0.5 font-mono text-4xl tabular-nums tracking-tight text-[#e3f2e5]" aria-live="off">
                {clock(left)}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                <div className="h-full rounded-full bg-[#9fd4a8] transition-[width] duration-1000 ease-linear" style={{width: `${progress * 100}%`}} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-[#a79e94]">{t.focus.breakBody}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={stop}
                  className="rounded-full border border-white/15 py-2 text-sm text-[#c9c0b6] transition hover:bg-white/[0.06] hover:text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
                >
                  {t.focus.stop}
                </button>
                <button
                  type="button"
                  onClick={skipBreak}
                  className="rounded-full bg-[#e8b27d] px-2 py-2 text-sm font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
                >
                  {t.focus.skipBreak}
                </button>
              </div>
              {summary && <div className="mt-4 border-t border-white/[0.08] pt-1">{summary}</div>}
            </>
          ) : session ? (
            <>
              <p className="mt-2 font-mono text-4xl tabular-nums tracking-tight text-[#f3ece4]" aria-live="off">
                {clock(left)}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                <div className="h-full rounded-full bg-[#e8b27d] transition-[width] duration-1000 ease-linear" style={{width: `${progress * 100}%`}} />
              </div>
              {sessionTodo && (
                <p className="mt-3 rounded-xl border border-[#e8b27d]/30 bg-[#e8b27d]/[0.07] px-3 py-2 text-sm leading-snug text-[#f3ece4]">
                  <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-[#e8b27d]">{t.todo.forPhin}</span>
                  <span className="break-words">{sessionTodo.text}</span>
                </p>
              )}
              <p className="mt-2 text-xs text-[#a79e94]">{t.focus.dripping}</p>
              <button
                type="button"
                onClick={stop}
                className="mt-3 w-full rounded-full border border-white/15 py-2 text-sm text-[#c9c0b6] transition hover:bg-white/[0.06] hover:text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
              >
                {t.focus.stop}
              </button>
            </>
          ) : tab === 'brew' ? (
            <>
              {rested ? (
                <div role="status">
                  <p className="mt-2 text-lg font-semibold tracking-tight text-[#f3ece4]">{t.focus.restedTitle}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#c9c0b6]">{t.focus.restedBody}</p>
                </div>
              ) : done ? (
                summary
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-[#ede6dd]">{t.focus.pitch}</p>
              )}
              <TodoList todos={todos} picked={picked} onPick={setPicked} onAdd={add} onCheck={check} onRemove={drop} />
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
              {round > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-[#a79e94]">
                  <span className="flex gap-1" role="img" aria-label={t.focus.chainAria(roundDots, LONG_EVERY)}>
                    {Array.from({length: LONG_EVERY}).map((_, i) => (
                      <span key={i} className={`h-2 w-2 rounded-full ${i < roundDots ? 'bg-[#e8b27d]' : 'border border-white/25'}`} />
                    ))}
                  </span>
                  <span>{t.focus.chainLeft(roundDots, LONG_EVERY)}</span>
                </div>
              )}
              {done && (
                <button
                  type="button"
                  onClick={() => begin('break')}
                  className="mt-3 w-full rounded-full bg-[#9fd4a8] py-2.5 text-sm font-semibold text-[#14261a] transition hover:bg-[#b3dfba] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd4a8]"
                >
                  {t.focus.takeBreak(nextBreakLong ? LONG_BREAK_MIN : BREAK_MIN, nextBreakLong)}
                </button>
              )}
              <button
                type="button"
                onClick={() => begin('phin')}
                className={
                  done
                    ? 'mt-2 w-full rounded-full border border-[#e8b27d]/50 py-2 text-sm text-[#f3cfa8] transition hover:bg-[#e8b27d]/10 focus-visible:outline-2 focus-visible:outline-[#e8b27d]'
                    : 'mt-3 w-full rounded-full bg-[#e8b27d] py-2.5 text-sm font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]'
                }
              >
                {done ? t.focus.again : t.focus.start}
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={auto}
                onClick={toggleAuto}
                className="mt-3 flex w-full items-start gap-2.5 rounded-lg px-1 py-1 text-left focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
              >
                <span aria-hidden className={`relative mt-0.5 h-4 w-7 shrink-0 rounded-full transition ${auto ? 'bg-[#9fd4a8]' : 'bg-white/15'}`}>
                  <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-[#1b1a21] transition-[left] ${auto ? 'left-3.5' : 'left-0.5'}`} />
                </span>
                <span>
                  <span className="block text-xs text-[#ede6dd]">{t.focus.auto}</span>
                  <span className="block text-[11px] leading-snug text-[#7d756d]">{t.focus.autoHint}</span>
                </span>
              </button>
            </>
          ) : (
            <>
              {quest && (
                <Tabs
                  small
                  className="mt-3"
                  value={sub}
                  onChange={setSub}
                  items={[
                    {id: 'mine', label: t.focus.tabs.mine},
                    {id: 'cafe', label: t.focus.tabs.cafe},
                  ]}
                />
              )}
              {quest && sub === 'cafe' ? (
                quest
              ) : (
                <div className="mt-3">
                  <NameField label={t.name.label} />
                  <p className="mt-0.5 text-[11px] leading-snug text-[#7d756d]">{t.name.shared}</p>
                  <div className="mt-3 border-t border-white/[0.08] pt-3">
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
                    {shelfCount !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          close()
                          onOpenShelf?.()
                        }}
                        className="mt-2 flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-xs text-[#c9c0b6] transition hover:bg-white/[0.04] hover:text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
                      >
                        <span>
                          {t.shelf.title} · {t.shelf.count(shelfCount, ITEMS.length)}
                        </span>
                        <span aria-hidden>→</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
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

// Cốc bốc hơi — đang giờ nghỉ
function CupIcon() {
  return (
    <svg width="15" height="16" viewBox="0 0 15 16" fill="none" aria-hidden>
      <path d="M2.5 7.5h8v3.5a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V7.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10.5 8.5h1a1.5 1.5 0 0 1 0 3h-1" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5 2.2c-.6.7.6 1.3 0 2.2M8 2.2c-.6.7.6 1.3 0 2.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
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

// Hàng tab dạng nút gạt (radiogroup đơn giản, bấm là đổi)
function Tabs<T extends string>({items, value, onChange, small = false, className = ''}: {items: {id: T; label: string}[]; value: T; onChange: (id: T) => void; small?: boolean; className?: string}) {
  return (
    <div role="tablist" className={`grid gap-1 rounded-xl border border-white/10 p-1 ${className}`} style={{gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`}}>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={value === it.id}
          onClick={() => onChange(it.id)}
          className={`rounded-lg transition focus-visible:outline-2 focus-visible:outline-[#e8b27d] ${small ? 'py-1 text-xs' : 'py-1.5 text-[13px] font-medium'} ${
            value === it.id ? 'bg-[#e8b27d]/15 text-[#f3cfa8]' : 'text-[#a79e94] hover:bg-white/[0.04] hover:text-[#ede6dd]'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}
