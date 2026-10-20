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

import {useEffect, useRef, useState, type ReactNode} from 'react'
import {trackEvent} from '@/lib/analytics'
import {useT} from './i18n'
import {CARD_SLOTS, cardOf, levelOf, streakOf, todayOf, type Regular} from './regular'
import {GiftReveal} from './ShelfBook'
import {ITEMS} from './shelf'
import {addTodo, doneTodayOf, loadTodos, removeTodo, setTodoDone, type Todo} from './todo'
import {TodoList} from './TodoList'

const FOCUS_KEY = 'chill:focus'
const MINUTES_KEY = 'chill:focus-min'
// Đã mở bảng phin từ khi có việc cần làm → thôi chấm "mới" trên nút
const TODO_SEEN_KEY = 'chill:todo-seen'
const OPTIONS = [15, 25, 45]

type Session = {endsAt: number; minutes: number; todo?: string}

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
  hint,
  openSignal = 0,
  gift = null,
  shelfCount = null,
  onOpenShelf,
  onStart,
  quest = null,
}: {
  regular: Regular
  // Bấm "Bắt đầu" → mở sẵn đường tiếng cho chuông lúc hết giờ
  onPrime: () => void
  // Làm xong 1 phin dài `minutes` phút
  onDone: (minutes: number) => void
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
  const ref = useRef<HTMLDivElement>(null)

  // Khôi phục sau khi hydrate: phút đã chọn + phiên đang chạy dở
  useEffect(() => {
    try {
      /* eslint-disable react-hooks/set-state-in-effect */
      setTodoSeen(Boolean(localStorage.getItem(TODO_SEEN_KEY) || localStorage.getItem('chill:todo')))
      const savedMin = Number(localStorage.getItem(MINUTES_KEY))
      if (OPTIONS.includes(savedMin)) setMinutes(savedMin)
      const saved = JSON.parse(localStorage.getItem(FOCUS_KEY) ?? 'null') as Partial<Session> | null
      if (saved?.endsAt && saved.endsAt > Date.now() && saved.minutes) {
        setSession({endsAt: saved.endsAt, minutes: saved.minutes, ...(typeof saved.todo === 'string' ? {todo: saved.todo} : {})})
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
    /* eslint-enable react-hooks/set-state-in-effect */
    try {
      localStorage.setItem(TODO_SEEN_KEY, '1')
    } catch {
      // Chặn storage — lần sau chấm hiện lại, không sao
    }
  }, [open])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => openSignal > 0 ? setOpen(true) : undefined, [openSignal])

  // Đếm theo đồng hồ thật (timer bị bóp khi tab chạy nền vẫn không lệch giờ)
  useEffect(() => {
    if (!session) return
    const tick = () => {
      const at = Date.now()
      if (at < session.endsAt) return setNow(at)
      setSession(null)
      store(FOCUS_KEY, null)
      setFinished({minutes: session.minutes, todo: session.todo})
      setAskSkipped(false)
      setOpen(true)
      trackEvent({name: 'Chill Focus', props: {action: 'done'}})
      onDone(session.minutes)
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

  const close = () => {
    setOpen(false)
    setFinished(null)
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

  const start = () => {
    const at = Date.now()
    const todo = picked && todos.some((t) => t.id === picked && !t.doneDay) ? picked : undefined
    const next: Session = {endsAt: at + minutes * 60_000, minutes, ...(todo ? {todo} : {})}
    onPrime()
    setNow(at)
    setFinished(null)
    setSession(next)
    setPicked(null)
    store(FOCUS_KEY, next)
    onStart?.()
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
  const done = finished !== null && !session
  const today = todayOf(regular)
  const sessionTodo = session?.todo ? todos.find((t) => t.id === session.todo) : undefined
  const finishedTodo = done && finished.todo ? todos.find((t) => t.id === finished.todo) : undefined
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

  return (
    // Điện thoại: bảng neo theo cả thanh trên (sát mép phải màn hình) cho khỏi tràn mép trái
    <div ref={ref} className="sm:relative">
      <div className="relative">
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls="chill-focus"
        aria-label={session ? t.focus.runningAria(clock(left)) : t.focus.open}
        title={t.focus.title}
        className={`relative flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-xs backdrop-blur transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] ${
          session || open || done
            ? 'border-[#e8b27d]/60 bg-[#2a1f18]/85 text-[#f6dcbd]'
            : 'border-[#e8b27d]/45 bg-[#2a1f18]/75 text-[#f6dcbd] hover:border-[#e8b27d]/80 hover:text-white'
        }`}
      >
        <PhinIcon dripping={Boolean(session)} />
        {!todoSeen && !hint && !session && (
          <span aria-hidden className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#f08a5d] opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-black/40 bg-[#f08a5d]" />
          </span>
        )}
        {session ? <span className="font-mono text-[11px] tabular-nums">{clock(left)}</span> : <span className="font-medium">{done ? t.focus.doneChip : t.focus.chip}</span>}
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

          {session ? (
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
          ) : (
            <>
              {done ? (
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
                  <p className="mt-3 text-sm leading-relaxed text-[#ede6dd]">{t.focus.doneBody}</p>
                </div>
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
              <button
                type="button"
                onClick={start}
                className="mt-3 w-full rounded-full bg-[#e8b27d] py-2.5 text-sm font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
              >
                {done ? t.focus.again : t.focus.start}
              </button>
            </>
          )}

          {quest}

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
