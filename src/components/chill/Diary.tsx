'use client'

// Bảng nhật ký của quán (/chill): mỗi ngày mỗi khách viết tối đa 2 mẩu giấy tâm trạng.
// "Treo lên tường" thì cả quán đọc được trong 7 ngày (api/chill-diary), "cất vào sổ" thì
// chỉ nằm trên máy người viết. Xem diary-shared.ts.
//
// - Mẩu giấy ghim ở góc trái trên cảnh (từ sm trở lên): câu của quán hôm nay + số mẩu —
//   bấm vào là mở bảng. Điện thoại chật nên chỉ có nút tròn ở hàng nút góc phải dưới.
// - Bảng = 1 cuốn sổ lò xo mở trên bàn (kiểu bullet journal): giấy kẻ ô, chữ viết tay, mỗi
//   ngày 1 mục, mỗi mẩu của khách là 1 gạch đầu dòng. Không tim, không xếp hạng, không
//   cuộn vô tận — cố ý không giống danh sách bài.
// - Mở ra ở trang hôm nay; nhiều thì lật trang để xem các ngày trước trong tuần. Lọc thêm
//   theo tâm trạng.
// - Studio tắt "Mở bảng nhật ký" (mặc định) thì component này không hiện gì.

import {Mynerve, Sedgwick_Ave} from 'next/font/google'
import Script from 'next/script'
import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {PixelIcon, TOKEN_CLASS, TokenChip, TokenLabel, TokenNewDot} from './pixel-icons'
import {trackEvent} from '@/lib/analytics'
import {useLang, useT} from './i18n'
import {DRINKS, chooseDrink, useDrink, type Drink} from './drink'
import {KEEP_DAYS, MOODS, NOTE_MAX, NOTE_MIN, NOTES_PER_DAY, cafeNoteOf, cafeQuestionOf, dayOf, recentDays, type DiaryNote, type Mood} from './diary-shared'

// Chữ cho cuốn sổ, đều có dấu tiếng Việt: nét bút bi viết tay cho nội dung, nét bút dạ cho
// tiêu đề (tháng, thứ). Chỉ tải khi mở sổ, không preload cho cả trang
const hand = Mynerve({weight: '400', subsets: ['latin', 'vietnamese'], display: 'swap', preload: false})
const marker = Sedgwick_Ave({weight: '400', subsets: ['latin', 'vietnamese'], display: 'swap', preload: false})

const STORE_KEY = 'chill:diary'
// Cùng danh tính với phòng chat (ChillChat tạo lần đầu)
const ME_KEY = 'chill:chat-me'
// Sổ riêng giữ tối đa bấy nhiêu mẩu gần nhất
const BOOK_MAX = 400
// Xấp giấy ghim trên khung cửa: lật qua bấy nhiêu mẩu mới nhất, mỗi mẩu hiện chừng này lâu
// Mẩu "người trước để lại" đã chọn cho lần ghé này (tải lại trang vẫn giữ mẩu đó)
const PICK_KEY = 'chill:diary-pick'
// Chọn trong bấy nhiêu mẩu mới nhất mà khách chưa đọc
const PICK_POOL = 5
// Mẩu chưa từng thấy thì lấp lánh bấy lâu từ lúc mẩu giấy hiện ra
const SPARKLE_MS = 9000

type Kind = 'wall' | 'book'
type MyNote = DiaryNote & {kind: Kind}
// Mẩu đang hiện trong sổ: của tường (kind trống), hoặc của mình (mine) — kể cả mẩu cất riêng
type ShownNote = DiaryNote & {kind?: Kind; mine?: boolean}
// `read` = id các mẩu quán đã đưa cho khách này đọc (mẩu "người trước để lại")
type Store = {mine: MyNote[]; hidden: string[]; seen: number; read: string[]}
type Room = {open: boolean; notes: DiaryNote[]; cafe: {vi: string; en: string} | null}

const EMPTY: Store = {mine: [], hidden: [], seen: 0, read: []}

const MOOD_ICON: Record<Mood, string> = {calm: '☕', drive: '🔥', heavy: '🌧', sleepy: '😴', grateful: '✨'}
// Giấy theo tâm trạng: nền · chữ · chữ phụ
const PAPER: Record<Mood, {bg: string; ink: string; soft: string}> = {
  calm: {bg: '#f6ead2', ink: '#3b2a17', soft: '#8a6a3f'},
  drive: {bg: '#dff2e6', ink: '#12382a', soft: '#3f7a61'},
  heavy: {bg: '#dfe6f1', ink: '#1d2b44', soft: '#566b8f'},
  sleepy: {bg: '#e9e4f6', ink: '#2b2350', soft: '#6c62a3'},
  grateful: {bg: '#fbe3e6', ink: '#4b1f2a', soft: '#a15a6a'},
}
// Giấy kem của mẩu mèo quán trên khung cửa
const PIN_PAPER = {bg: '#fbf1d2', ink: '#2a1a10', soft: '#9a6a45'}

function loadStore(): Store {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null') as Partial<Store> | null
    if (!raw) return EMPTY
    return {
      mine: Array.isArray(raw.mine) ? raw.mine.filter((n) => n && typeof n.id === 'string' && typeof n.text === 'string') : [],
      hidden: Array.isArray(raw.hidden) ? raw.hidden.filter((id) => typeof id === 'string').slice(-200) : [],
      seen: Number(raw.seen) || 0,
      read: Array.isArray(raw.read) ? raw.read.filter((id) => typeof id === 'string').slice(-400) : [],
    }
  } catch {
    return EMPTY
  }
}

function saveStore(store: Store) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store))
  } catch {
    // Chặn storage — sổ chỉ có trong lần xem này
  }
}

function loadMe(): {uid: string; name: string} {
  try {
    const me = JSON.parse(localStorage.getItem(ME_KEY) ?? 'null') as {uid?: string; name?: string} | null
    if (me?.uid && /^[a-z0-9]{8,32}$/i.test(me.uid)) return {uid: me.uid, name: me.name ?? ''}
  } catch {
    // Chặn storage → danh tính tạm cho lần xem này
  }
  return {uid: crypto.randomUUID().replace(/-/g, '').slice(0, 20), name: ''}
}

export function Diary({
  slot,
  open,
  onOpenChange,
  hidden,
  dimmed,
  slipHidden,
  hint,
  onAvailable,
}: {
  // Ô trong hàng nút góc phải dưới — nút mở được đặt vào đây
  slot: HTMLElement | null
  open: boolean
  onOpenChange: (open: boolean) => void
  // Bảng cài đặt đang mở / chưa vào quán → ẩn nút + mẩu giấy ghim
  hidden: boolean
  // Giao diện đang tự ẩn khi không đụng chuột
  dimmed: boolean
  // Chỗ góc trái trên đang có thứ khác (nút "Về chỗ cửa sổ" của bàn nhóm)
  slipHidden: boolean
  // Lời mời viết nhật ký cho người chưa mở sổ lần nào (xem guide.ts) — bong bóng cạnh nút
  hint?: string | null
  // Studio có đang mở bảng nhật ký không
  onAvailable?: (available: boolean) => void
}) {
  const t = useT()
  const lang = useLang()
  const [room, setRoom] = useState<Room | null>(null)
  const [store, setStore] = useState<Store>(EMPTY)
  const [now, setNow] = useState(0)
  const [mood, setMood] = useState<Mood | null>(null)
  const [composing, setComposing] = useState(false)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setStore(loadStore())
    setNow(Date.now())
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const update = useCallback((fn: (s: Store) => Store) => {
    setStore((s) => {
      const next = fn(s)
      saveStore(next)
      return next
    })
  }, [])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/chill-diary')
      const data = (await res.json()) as Room
      setRoom({open: data.open === true, notes: data.notes ?? [], cafe: data.cafe ?? null})
      setNow(Date.now())
    } catch {
      // Mạng chập chờn — lần sau hỏi lại
    }
  }, [])

  // Đang mở bảng thì hỏi mẩu mới mỗi phút, đóng thì 5 phút (chỉ để cập nhật số đếm)
  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0)
    const id = window.setInterval(() => document.visibilityState === 'visible' && void refresh(), open ? 60_000 : 300_000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(id)
    }
  }, [open, refresh])

  useEffect(() => {
    if (!open) return
    trackEvent({name: 'Chill Diary', props: {action: 'open'}})
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onOpenChange(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const today = now ? dayOf(now) : ''
  const days = useMemo(() => (now ? recentDays(KEEP_DAYS, now) : []), [now])

  // Tường + sổ của mình (mẩu vừa treo có thể chưa kịp có trong bản CDN đang giữ)
  const notes = useMemo(() => {
    const gone = new Set(store.hidden)
    const byId = new Map<string, ShownNote>()
    for (const n of room?.notes ?? []) if (!gone.has(n.id)) byId.set(n.id, n)
    const fresh = now - 60_000
    for (const n of store.mine) {
      if (!days.includes(n.day)) continue
      if (n.kind === 'book' || byId.has(n.id) || n.ts > fresh) byId.set(n.id, {...n, mine: true})
    }
    return [...byId.values()].sort((a, b) => a.ts - b.ts)
  }, [room, store, days, now])

  const usedToday = store.mine.filter((n) => n.day === today).length
  const left = Math.max(0, NOTES_PER_DAY - usedToday)
  const todayCount = notes.filter((n) => n.day === today && n.kind !== 'book').length
  const unseen = (room?.notes ?? []).some((n) => n.ts > store.seen && !store.mine.some((m) => m.id === n.id))

  // Mẩu "người ngồi trước để lại cho bạn": mỗi lần ghé quán đưa đúng 1 mẩu, không phải mẩu
  // của chính mình. Ưu tiên mẩu khách chưa đọc (bốc ngẫu nhiên trong vài mẩu mới nhất), đọc
  // hết rồi thì bốc ngẫu nhiên trong cả tuần; quán chưa có mẩu nào → câu của mèo quán (null).
  // Mẩu "cất vào sổ" không lên đây.
  const others = useMemo(() => notes.filter((n) => n.kind !== 'book' && !n.mine).sort((a, b) => b.ts - a.ts), [notes])
  const [pick, setPick] = useState<{id: string | null; fresh: boolean} | null>(null)
  useEffect(() => {
    if (!room?.open) return
    if (pick && (pick.id === null ? others.length === 0 : others.some((n) => n.id === pick.id))) return
    let id: string | null = null
    let fresh = false
    try {
      const kept = sessionStorage.getItem(PICK_KEY)
      if (kept && others.some((n) => n.id === kept)) id = kept
    } catch {
      // Chặn storage → mỗi lần tải lại bốc mẩu khác, không sao
    }
    if (!id && others.length) {
      const unread = others.filter((n) => !store.read.includes(n.id)).slice(0, PICK_POOL)
      const from = unread.length ? unread : others
      id = from[Math.floor(Math.random() * from.length)].id
      fresh = unread.length > 0
      try {
        sessionStorage.setItem(PICK_KEY, id)
      } catch {
        // bỏ qua
      }
      const picked = id
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ghi nhớ mẩu đã đưa cho khách đọc
      update((s) => (s.read.includes(picked) ? s : {...s, read: [...s.read, picked].slice(-400)}))
    }
    setPick({id, fresh})
  }, [room?.open, others, pick, store.read, update])
  // Mẩu chưa từng thấy → lấp lánh 1 lúc kể từ khi mẩu giấy hiện ra trước mắt khách
  const [sparkle, setSparkle] = useState(false)
  const slipShown = Boolean(pick?.fresh) && !hidden && !slipHidden && !open
  useEffect(() => {
    if (!slipShown) return
    const on = window.setTimeout(() => setSparkle(true), 600)
    const off = window.setTimeout(() => setSparkle(false), 600 + SPARKLE_MS)
    return () => {
      window.clearTimeout(on)
      window.clearTimeout(off)
    }
  }, [slipShown, pick?.id])

  useEffect(() => {
    onAvailable?.(room?.open ?? false)
  }, [room?.open, onAvailable])

  const setOpen = (next: boolean) => {
    if (next) update((s) => ({...s, seen: Date.now()}))
    else setComposing(false)
    onOpenChange(next)
  }

  const addMine = (note: MyNote) => {
    // Bấm đúp nút gửi cũng không lọt mẩu thứ 3 trong ngày
    update((s) => (s.mine.filter((n) => n.day === note.day).length >= NOTES_PER_DAY ? s : {...s, mine: [...s.mine, note].slice(-BOOK_MAX)}))
    setNow(Date.now())
    setComposing(false)
  }
  const removeMine = (id: string) => update((s) => ({...s, mine: s.mine.filter((n) => n.id !== id)}))
  const report = (id: string) => {
    update((s) => ({...s, hidden: [...s.hidden, id].slice(-200)}))
    void fetch('/api/chill-diary', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'report', id})}).catch(() => {})
    trackEvent({name: 'Chill Diary', props: {action: 'report'}})
  }

  if (!room?.open || !now) return null

  const cafe = room.cafe ?? cafeNoteOf(today)
  const cafeText = cafe[lang] || cafe.vi
  const top = others.find((n) => n.id === pick?.id) ?? null
  const topPaper = top ? PAPER[top.mood] : PIN_PAPER
  // Câu hỏi của quán mà mẩu này trả lời (mẩu của những ngày quán chưa hỏi thì không có)
  const topQuestion = top ? cafeQuestionOf(top.day) : null
  // Tờ ló ra phía sau = trong sổ còn mẩu khác (màu theo tâm trạng của chính mẩu đó)
  const behind = others.filter((n) => n.id !== top?.id).slice(0, 2)
  const weekCount = notes.filter((n) => n.kind !== 'book').length
  const clock = (ts: number) => new Date(ts).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh'})
  const shown = notes.filter((n) => !mood || n.mood === mood)

  return (
    <>
      {slot &&
        createPortal(
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="chill-diary"
            aria-label={t.diary.openAria(todayCount)}
            title={t.diary.title}
            className={`${TOKEN_CLASS} ${open ? 'border-[#e8b27d]/60' : 'border-white/[0.13]'} ${
              hidden || open ? 'pointer-events-none translate-y-2 opacity-0' : dimmed ? 'opacity-60 hover:opacity-100' : 'opacity-100'
            }`}
          >
            <PixelIcon name="note" />
            {unseen && <TokenNewDot />}
            {todayCount > 0 && <TokenChip>{todayCount > 99 ? '99+' : todayCount}</TokenChip>}
            {hint ? (
              <span className="pointer-events-none absolute bottom-full right-0 mb-3 whitespace-nowrap rounded-lg bg-[#e8b27d] px-3 py-2 text-xs font-semibold text-[#2a1a10] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] motion-safe:animate-[chill-pop_0.35s_ease-out] after:absolute after:right-4 after:top-full after:border-[6px] after:border-transparent after:border-t-[#e8b27d] after:content-[''] lg:bottom-auto lg:right-full lg:top-1/2 lg:mb-0 lg:mr-3 lg:-translate-y-1/2 lg:after:hidden">
                {hint}
              </span>
            ) : (
              <TokenLabel>{t.diary.label}</TokenLabel>
            )}
          </button>,
          slot,
        )}

      {/* Mẩu giấy ghim trên khung cửa: mẩu "người ngồi trước để lại cho bạn" — mỗi lần ghé 1 mẩu,
          kèm câu hỏi của quán mà mẩu đó trả lời; bấm vào là mở sổ để viết lại cho người sau.
          Các tờ ló ra phía sau cho biết trong sổ còn mẩu khác. Vẽ cùng kiểu với đồ vật trong
          cảnh: viền nâu đậm 2px, bóng đổ cứng, đinh ghim pixel; giấy có dòng kẻ, góc dưới gập lên */}
      <button
        type="button"
        onClick={() => {
          setOpen(true)
          if (left > 0) setComposing(true)
        }}
        aria-label={`${t.diary.slipAria}: ${top ? top.text : cafeText}`}
        className={`group/pin absolute left-5 top-[4.75rem] z-10 hidden w-[214px] origin-top -rotate-2 text-left drop-shadow-[4px_5px_0_rgba(42,26,16,0.45)] transition duration-300 hover:rotate-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b27d] sm:block ${
          hidden || open || slipHidden || !pick ? 'pointer-events-none -translate-y-1 opacity-0' : dimmed ? 'opacity-60 hover:opacity-100' : 'opacity-100'
        }`}
      >
        {behind.map((n, i) => (
          <span
            key={n.id}
            aria-hidden
            className="absolute inset-0 border-2 border-[#2a1a10]"
            style={{background: PAPER[n.mood].bg, transform: i === 0 ? 'translate(6px, 5px) rotate(2.5deg)' : 'translate(11px, 9px) rotate(5deg)', zIndex: -1 - i}}
          />
        ))}
        <PushPin />
        {sparkle && <Sparkles />}
        <span
          key={top?.id ?? 'cafe'}
          className="relative block border-2 border-[#2a1a10] [clip-path:polygon(0_0,100%_0,100%_calc(100%-16px),calc(100%-16px)_100%,0_100%)] motion-safe:animate-[chill-note-turn_0.45s_ease-out]"
          style={{background: topPaper.bg, color: topPaper.ink}}
        >
          <span
            className="flex items-center justify-between gap-2 border-b border-dashed px-3 pb-1.5 pt-3.5 font-mono text-[9px] uppercase tracking-[0.18em]"
            style={{color: topPaper.soft, borderColor: `${topPaper.soft}88`}}
          >
            <span className="truncate">{top ? t.diary.slipFrom : t.diary.slipFromCat}</span>
            <span className="shrink-0 tabular-nums">{top && top.day === today ? clock(top.ts) : `${(top?.day ?? today).slice(8, 10)}.${(top?.day ?? today).slice(5, 7)}`}</span>
          </span>
          {/* Dòng kẻ cách nhau đúng 1 dòng chữ (20px); luôn cao 4 dòng. Dòng đầu là câu hỏi của
              quán (nếu mẩu này trả lời 1 câu), phần còn lại là lời người trước */}
          <span className="block h-[83px] bg-[repeating-linear-gradient(transparent_0,transparent_19px,rgba(42,26,16,0.13)_19px,rgba(42,26,16,0.13)_20px)] px-3 pt-[3px]">
            {topQuestion && (
              <span className="block truncate text-[11px] italic leading-[20px]" style={{color: topPaper.soft}}>
                {topQuestion[lang] || topQuestion.vi}
              </span>
            )}
            <span className={`${topQuestion ? 'line-clamp-3' : 'line-clamp-4'} break-words text-[13px] font-semibold leading-[20px]`}>{top ? top.text : cafeText}</span>
          </span>
          <span className="flex items-end justify-between gap-2 px-3 pb-3 pt-2">
            {top ? (
              <span className="min-w-0 truncate pb-0.5 text-[11px] font-semibold" style={{color: topPaper.soft}}>
                — {top.name || t.diary.guest} {MOOD_ICON[top.mood]}
              </span>
            ) : (
              <PawStamp />
            )}
            <span className="mr-3 shrink-0 whitespace-nowrap border border-[#2a1a10] bg-[#e8b27d] px-2 py-0.5 text-[11px] font-bold text-[#2a1a10] transition-colors group-hover/pin:bg-[#f0c294]">
              {left > 0 ? t.diary.slipLeave : t.diary.slipWeek(weekCount)}
            </span>
          </span>
          {/* Góc giấy gập: ô vuông nhỏ bị cắt chéo cùng với tờ giấy */}
          <span aria-hidden className="absolute bottom-0 right-0 h-4 w-4 border-l-2 border-t-2 border-[#2a1a10] bg-black/15" />
        </span>
      </button>

      <section
        id="chill-diary"
        role="dialog"
        aria-label={t.diary.title}
        inert={!open}
        className={`absolute inset-x-0 bottom-0 z-40 flex h-[90dvh] flex-col overflow-hidden rounded-t-3xl border border-[#e8b27d]/20 bg-[#231913]/[0.97] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all duration-300 ease-out lg:inset-x-[max(2rem,calc(50%-37rem))] lg:bottom-6 lg:top-[4.5rem] lg:h-auto lg:rounded-3xl ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
        }`}
      >
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/[0.07] px-5 py-3.5">
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-[#f3ece4]">{t.diary.title}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t.diary.close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#c9c0b6] transition hover:bg-white/[0.06] hover:text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
          >
            <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden>
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <div role="radiogroup" aria-label={t.diary.moodAria} className="-mx-1 flex w-full gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]">
            {[null, ...MOODS].map((m) => (
              <button
                key={m ?? 'all'}
                type="button"
                role="radio"
                aria-checked={mood === m}
                onClick={() => setMood(m)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs transition focus-visible:outline-2 focus-visible:outline-[#e8b27d] ${
                  mood === m ? 'border-[#e8b27d]/70 bg-[#e8b27d]/15 text-[#f3cfa8]' : 'border-white/10 text-[#a79e94] hover:border-white/25 hover:text-[#ede6dd]'
                }`}
              >
                {m ? `${MOOD_ICON[m]} ${t.diary.moods[m]}` : t.diary.allMoods}
              </button>
            ))}
          </div>
        </header>

        <Book
          open={open}
          notes={shown}
          days={days}
          today={today}
          cafeText={cafeText}
          left={left}
          filtered={mood !== null}
          composing={composing}
          onCompose={() => setComposing(true)}
          onDone={addMine}
          onCancel={() => setComposing(false)}
          onReport={report}
          onRemove={removeMine}
        />
      </section>
    </>
  )
}

// Tia lấp lánh pixel quanh mẩu giấy khách chưa từng thấy (tắt khi giảm chuyển động)
function Sparkles() {
  // [trái %, trên %, cỡ px, trễ s]
  const stars: [number, number, number, number][] = [
    [-4, 6, 12, 0],
    [97, -3, 10, 0.5],
    [103, 52, 14, 1.1],
    [-6, 70, 10, 1.6],
    [58, 101, 12, 0.8],
    [22, -6, 8, 1.9],
  ]
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-20">
      {stars.map(([left, top, size, delay], i) => (
        <svg key={i} className="chill-twinkle absolute" style={{left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s`}} width={size} height={size} viewBox="0 0 5 5" shapeRendering="crispEdges">
          <path d="M2 0h1v2h2v1H3v2H2V3H0V2h2z" fill="#fff3c4" />
          <rect x="2" y="2" width="1" height="1" fill="#ffffff" />
        </svg>
      ))}
    </span>
  )
}

// Đinh ghim đỏ kiểu pixel (cùng màu với icon nút Nhật ký)
function PushPin() {
  const O = '#2a1d15'
  const rows = ['..ooo..', '.oHAAo.', 'oHAAAAo', 'oAAAADo', '.oADDo.', '..ooo..', '...n...', '...n...']
  const fill: Record<string, string> = {o: O, A: '#D85A30', H: '#F5C4B3', D: '#993C1D', n: '#5F5E5A'}
  return (
    <svg aria-hidden width="21" height="24" viewBox="0 0 7 8" shapeRendering="crispEdges" className="absolute left-1/2 top-[-11px] z-10 -translate-x-1/2">
      {rows.flatMap((row, y) => [...row].map((ch, x) => (fill[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill[ch]} /> : null)))}
    </svg>
  )
}

// Dấu chân mèo đóng mộc ở góc giấy
function PawStamp() {
  const rows = ['.x.x.x.', '.x.x.x.', '.......', '..xxx..', '.xxxxx.', '.xxxxx.', '..x.x..']
  return (
    <span aria-hidden className="flex h-7 w-7 -rotate-12 items-center justify-center rounded-full border border-dashed border-[#b3552f]/70">
      <svg width="14" height="14" viewBox="0 0 7 7" shapeRendering="crispEdges">
        {rows.flatMap((row, y) => [...row].map((ch, x) => (ch === 'x' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#b3552f" opacity="0.8" /> : null)))}
      </svg>
    </span>
  )
}

// Bảng nhật ký = 1 cuốn sổ lò xo mở ra trên mặt bàn (kiểu bullet journal): giấy kẻ ô,
// chữ viết tay, mỗi ngày 1 mục "▸ Thứ Hai ⑦", mỗi mẩu của khách là 1 gạch đầu dòng.
// Nội dung tự chảy sang trang kế bằng CSS multi-column (mỗi cột = 1 trang), nhiều thì
// lật trang: máy tính xem 2 trang 1 lượt, điện thoại 1 trang.
function Book({
  open,
  notes,
  days,
  today,
  cafeText,
  left,
  filtered,
  composing,
  onCompose,
  onDone,
  onCancel,
  onReport,
  onRemove,
}: {
  open: boolean
  notes: ShownNote[]
  days: string[]
  today: string
  cafeText: string
  left: number
  // Đang lọc theo tâm trạng → ẩn mẩu của mèo quán + báo khi không có mẩu nào khớp
  filtered: boolean
  composing: boolean
  onCompose: () => void
  onDone: (note: MyNote) => void
  onCancel: () => void
  onReport: (id: string) => void
  onRemove: (id: string) => void
}) {
  const t = useT()
  const lang = useLang()
  // Câu hỏi của quán cho 1 ngày, theo ngôn ngữ đang xem (null = ngày đó quán chưa hỏi)
  const question = (day: string) => {
    const q = cafeQuestionOf(day)
    return q ? q[lang] || q.vi : null
  }
  const wrap = useRef<HTMLDivElement>(null)
  const book = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const flow = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({w: 0, h: 0})
  const [pages, setPages] = useState(1)
  const [spread, setSpread] = useState(0)
  const swipe = useRef<number | null>(null)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    // Chừa lề cho mặt bàn quanh sổ; 2 trang thì chừa thêm phía trên cho cây bút
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth - (el.clientWidth >= 640 ? 72 : 20)
      setBox({w, h: el.clientHeight - (w >= 760 ? 84 : 96)})
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Kích thước sổ: 2 trang khi đủ rộng. Mọi số đo bám theo ô kẻ 24px để chữ nằm trên dòng
  const two = box.w >= 760
  const per = two ? 2 : 1
  // Bàn đủ rộng thì sổ nhỏ lại 1 chút và lùi sang trái, nhường góc phải cho tách cà phê
  const roomy = two && box.w >= 1030
  const W = Math.floor(Math.min(box.w, two ? (roomy ? 940 : 1010) : 470))
  const H = Math.floor(Math.max(340, Math.min(box.h, 672)))
  const padR = two ? 40 : 26
  // 1 trang: lò xo nằm mép trái nên lề trái rộng hơn
  const padL = two ? 40 : 46
  // Khe giữa 2 trang (chỗ lò xo vắt qua) + lề trong của mỗi trang
  const spine = 30
  const gap = two ? spine + 2 * 44 : padL + padR
  const colW = Math.max(160, two ? (W - padL - padR - gap) / 2 : W - padL - padR)
  const step = colW + gap
  // Bề rộng 1 tờ giấy
  const pageW = two ? (W - spine) / 2 : W
  const padT = 34
  const padB = 46

  const spreads = Math.max(1, Math.ceil(pages / per))
  const at = Math.min(spread, spreads - 1)

  // Đếm số trang (cột) sau mỗi lần nội dung / cỡ sổ đổi, và khi font viết tay tải xong
  useEffect(() => {
    const el = flow.current
    if (!el || !box.w) return
    const measure = () => setPages(Math.max(1, Math.round((el.scrollWidth + gap) / step)))
    measure()
    let alive = true
    void document.fonts?.ready.then(() => alive && measure())
    return () => {
      alive = false
    }
  }, [notes, composing, filtered, lang, box.w, box.h, gap, step, cafeText, left])

  // Trang chứa 1 phần tử trong sổ (đo theo vị trí thật, không phụ thuộc đang lật tới đâu)
  const spreadOf = useCallback(
    (el: Element | null) => {
      const f = flow.current
      if (!el || !f) return 0
      const col = Math.round((el.getBoundingClientRect().left - f.getBoundingClientRect().left) / step)
      return Math.max(0, Math.floor(col / per))
    },
    [step, per],
  )
  const jumpTo = (day: string) => setSpread(spreadOf(flow.current?.querySelector(`[data-day="${day}"]`) ?? null))

  // Bấm "Viết vài dòng" → lật tới đúng trang có mẩu đang viết; viết xong (hoặc thôi) → về
  // trang có dòng mới nhất của hôm nay
  const wasComposing = useRef(false)
  useEffect(() => {
    if (!composing && !wasComposing.current) return
    wasComposing.current = composing
    const id = window.setTimeout(() => {
      const lines = flow.current?.querySelectorAll(`[data-day="${today}"] [data-note]`)
      setSpread(spreadOf(composing ? (flow.current?.querySelector('form') ?? null) : (lines?.[lines.length - 1] ?? null)))
    }, 60)
    return () => window.clearTimeout(id)
  }, [composing, spreadOf, today])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest('input, textarea')) return
      if (e.key === 'ArrowRight') setSpread((s) => Math.min(s + 1, spreads - 1))
      if (e.key === 'ArrowLeft') setSpread((s) => Math.max(s - 1, 0))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, spreads])

  // Lật trang như lật giấy thật: tờ giấy xoay quanh gáy lò xo, mặt trước là trang cũ, mặt sau
  // là trang mới. Nội dung thật (flow) nhảy thẳng tới trang mới và tạm ẩn; trong lúc lật, các
  // trang cũ / mới là bản chụp (cloneNode) của flow đặt vào từng ô trang. Người bật "giảm
  // chuyển động" thì đổi trang tức thì.
  const layoutKey = `${W}x${H}x${per}`
  const turned = useRef({at: 0, key: ''})
  useLayoutEffect(() => {
    const prev = turned.current
    turned.current = {at, key: layoutKey}
    const f = flow.current
    const st = stage.current
    const bk = book.current
    if (!f || !st || !bk || prev.key !== layoutKey || prev.at === at) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const fwd = at > prev.at
    const lo = Math.min(prev.at, at)
    const hi = Math.max(prev.at, at)
    const div = (css: string) => {
      const el = document.createElement('div')
      el.style.cssText = css
      return el
    }
    // Bản chụp của flow, đẩy sao cho cột `col` nằm đúng chỗ chữ của ô trang (x = lề trong ô)
    const snap = (col: number, x: number) => {
      const c = f.cloneNode(true) as HTMLElement
      c.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'))
      c.style.cssText += `;left:${x}px;transform:translateX(${-col * step}px);visibility:visible`
      c.inert = true
      return c
    }
    const page = (left: number, width: number, col: number, x: number) => {
      const w = div(`position:absolute;top:0;left:${left}px;width:${width}px;height:${H}px;overflow:clip;border-radius:20px`)
      w.append(snap(col, x))
      return w
    }
    const sheet = (key: string, left: number) => {
      const s = bk.querySelector<HTMLElement>(`[data-paper="${key}"]`)?.cloneNode(true) as HTMLElement | undefined
      if (s) s.style.left = `${left}px`
      return s ?? div('')
    }
    const shade = (gradient: string) => div(`position:absolute;inset:0;border-radius:20px;background:${gradient};opacity:0`)
    const timing = {duration: 640, easing: 'cubic-bezier(.45,.05,.3,1)', fill: 'both' as const}
    const fade = (el: HTMLElement, frames: number[]) => el.animate(frames.map((opacity) => ({opacity})), timing)
    const order = <T,>(frames: T[]) => (fwd ? frames : [...frames].reverse())
    const face = 'position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden'
    let turn: Animation

    if (two) {
      // Lề chữ của trang phải, tính từ mép trái tờ giấy bên phải
      const xr = padL + step - (W + spine) / 2
      const under = [page(0, pageW, lo * 2, padL), page(W - pageW, pageW, hi * 2 + 1, xr)]
      const dim = [shade('linear-gradient(270deg, rgba(40,25,10,0.38), transparent 70%)'), shade('linear-gradient(90deg, rgba(40,25,10,0.38), transparent 70%)')]
      under[0].append(dim[0])
      under[1].append(dim[1])
      // Tờ đang lật: chiếm nửa phải, xoay quanh gáy (mép trái của nó)
      const leaf = div(`position:absolute;top:0;left:${W / 2}px;width:${W / 2}px;height:${H}px;transform-origin:left center;transform-style:preserve-3d`)
      const front = div(face)
      const frontShade = shade('linear-gradient(90deg, rgba(40,25,10,0.3), transparent 45%)')
      front.append(sheet('r', spine / 2), page(spine / 2, pageW, lo * 2 + 1, xr), frontShade)
      const back = div(`${face};transform:rotateY(180deg)`)
      const backShade = shade('linear-gradient(270deg, rgba(40,25,10,0.3), transparent 45%)')
      back.append(sheet('l', 0), page(0, pageW, hi * 2, padL), backShade)
      leaf.append(front, back)
      st.replaceChildren(...under, leaf)
      turn = leaf.animate(order([{transform: 'rotateY(0deg)'}, {transform: 'rotateY(-180deg)'}]), timing)
      // Trang bị tờ giấy che thì tối, tờ giấy dựng đứng thì 2 mặt của nó sẫm lại
      fade(dim[1], order([0.9, 0.35, 0]))
      fade(dim[0], order([0, 0.35, 0.9]))
      fade(frontShade, order([0, 1, 1]))
      fade(backShade, order([1, 1, 0]))
    } else {
      // 1 trang (điện thoại): tờ giấy xoay quanh lò xo ở mép trái rồi khuất hẳn; lật lùi thì ngược lại.
      // Lật tới: trang mới chính là flow nằm bên dưới. Lật lùi: bên dưới là bản chụp trang cũ.
      const under = fwd ? [] : [page(0, pageW, prev.at, padL)]
      const leaf = div(`position:absolute;top:0;left:0;width:${W}px;height:${H}px;transform-origin:left center;backface-visibility:hidden;-webkit-backface-visibility:hidden`)
      const leafShade = shade('linear-gradient(90deg, rgba(40,25,10,0.35), transparent 60%)')
      leaf.append(sheet('p', 0), page(0, pageW, fwd ? prev.at : at, padL), leafShade)
      st.replaceChildren(...under, leaf)
      turn = leaf.animate(order([{transform: 'rotateY(0deg)', opacity: 1}, {transform: 'rotateY(-78deg)', opacity: 1, offset: 0.85}, {transform: 'rotateY(-90deg)', opacity: 0}]), timing)
      fade(leafShade, order([0, 1, 1]))
    }
    if (two || !fwd) f.style.visibility = 'hidden'

    const done = () => {
      st.replaceChildren()
      f.style.visibility = ''
    }
    turn.onfinish = done
    return () => {
      turn.cancel()
      done()
    }
    // Chỉ lật khi đổi trang; đổi cỡ sổ (layoutKey) thì bỏ qua lượt đó
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, layoutKey])

  const locale = lang === 'vi' ? 'vi-VN' : 'en-US'
  const dateOf = (day: string) => new Date(`${day}T12:00:00+07:00`)
  const fmt = (day: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, {timeZone: 'Asia/Ho_Chi_Minh', ...opts}).format(dateOf(day))
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const clock = (ts: number) => new Date(ts).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh'})
  const has = (day: string) => notes.some((n) => n.day === day)
  // Tuần này theo lịch, Thứ Hai → Chủ nhật (YYYY-MM-DD). Ngày còn trong hạn 7 ngày và có mẩu
  // thì bấm được để lật tới trang của ngày đó; các ngày của tuần trước còn hạn thì lật trang là thấy
  const [yy, mm, dd] = today.split('-').map(Number)
  const noon = today ? Date.UTC(yy, mm - 1, dd, 5) : 0
  const mondayOffset = today ? (new Date(noon).getUTCDay() + 6) % 7 : 0
  const week = today ? Array.from({length: 7}, (_, i) => dayOf(noon + (i - mondayOffset) * 86_400_000)) : []
  // Tuần thứ mấy của tháng (tuần tính từ Thứ Hai)
  const lead = today ? (new Date(Date.UTC(yy, mm - 1, 1)).getUTCDay() + 6) % 7 : 0
  const dayList = days.filter((d) => d === today || has(d))

  // Ô kẻ không chạy sát mép giấy mà nằm trong 1 khung lùi vào `inset` px, như sổ thật
  const inset = 16
  const paper = (left: number, width: number, key: string) => (
    <div
      key={key}
      data-paper={key}
      aria-hidden
      className="absolute inset-y-0 rounded-[20px] bg-[#f8f4e6] shadow-[0_1px_0_#dcd5bf,0_3px_0_#f1ecdc,0_4px_0_#d6cfb8,0_6px_0_#efe9d8,0_7px_0_#cfc7af,1px_0_0_#e3dcc6,3px_0_0_#f1ecdc,4px_0_0_#d9d2bb]"
      style={{left, width}}
    >
      <div
        className="absolute border border-[#5b6b73]/35"
        style={{
          inset,
          backgroundImage: 'linear-gradient(rgba(70,84,92,0.26) 1px, transparent 1px), linear-gradient(90deg, rgba(70,84,92,0.26) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: `-1px ${((padT + 4 - inset) % 24) - 1}px`,
        }}
      />
    </div>
  )
  const rings = Math.max(4, Math.floor((H - 56) / 38))

  return (
    <div
      ref={wrap}
      className={`relative mx-2 mb-2 flex min-h-0 flex-1 items-center justify-center overflow-clip rounded-2xl bg-[#b9682f] sm:mx-3 sm:mb-3 ${hand.className}`}
      // Mặt quầy gỗ của quán nhìn từ trên xuống (màu lấy từ mặt quầy trong tranh cảnh): ván chạy
      // ngang, mỗi tấm 1 khe tối + 1 mép sáng, vân gỗ là các vệt mảnh — tô nét cứng kiểu pixel
      style={{
        backgroundImage: [
          'repeating-linear-gradient(180deg, #4d1c08 0 3px, #e6944b 3px 6px, transparent 6px 132px)',
          'repeating-linear-gradient(180deg, transparent 0 23px, rgba(93,41,13,0.16) 23px 26px, transparent 26px 61px, rgba(230,148,75,0.2) 61px 63px, transparent 63px 97px, rgba(93,41,13,0.12) 97px 99px, transparent 99px 132px)',
          'repeating-linear-gradient(180deg, #cd7b35 0 66px, #b96a2e 66px 132px)',
        ].join(', '),
      }}
    >
      {/* Nắng từ cửa sổ quán hắt chéo qua mặt bàn (3 ô kính), 4 góc tối dần */}
      <div aria-hidden className="pointer-events-none absolute -left-[12%] -top-[30%] h-[170%] w-[70%] -skew-x-[24deg] bg-[linear-gradient(90deg,rgba(255,228,170,0.22)_0,rgba(255,228,170,0.22)_29%,transparent_29%,transparent_35%,rgba(255,228,170,0.2)_35%,rgba(255,228,170,0.2)_64%,transparent_64%,transparent_70%,rgba(255,228,170,0.15)_70%,rgba(255,228,170,0.15)_100%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_35%_35%,transparent_45%,rgba(40,14,2,0.5)_100%)]" />
      {/* Ly cà phê của khách ở góc bàn, nhìn từ trên xuống — bấm vào để chọn món. Bàn rộng thì ly
          nằm trọn trong khung; hẹp hơn thì ly nhỏ lại và ló ra ở góc */}
      {box.w > 0 && <DeskCoffee size={roomy ? 150 : two ? 116 : 80} top={roomy ? -24 : two ? -30 : -18} right={roomy ? 6 : two ? -24 : -8} />}
      {box.w > 0 && (
        <div
          ref={book}
          className="relative z-10 shrink-0 text-[#2c2a33] drop-shadow-[0_18px_18px_rgba(40,14,2,0.55)]"
          style={{width: W, height: H, marginRight: roomy ? 64 : 0}}
          onPointerDown={(e) => (swipe.current = e.pointerType === 'mouse' ? null : e.clientX)}
          onPointerUp={(e) => {
            const from = swipe.current
            swipe.current = null
            if (from === null || Math.abs(e.clientX - from) < 56) return
            setSpread((s) => (e.clientX < from ? Math.min(s + 1, spreads - 1) : Math.max(s - 1, 0)))
          }}
        >
          {/* Cây bút nắp cam nằm trên mặt bàn, phía trên sổ */}
          {two && <DeskPen />}

          {/* Giấy: mỗi trang 1 tờ bo góc, mép dưới + mép phải lộ xấp giấy bên dưới */}
          {two ? [paper(0, pageW, 'l'), paper(W - pageW, pageW, 'r')] : paper(0, pageW, 'p')}

          {/* overflow-clip chứ không phải hidden: ô đang gõ nhận focus cũng không kéo lệch trang */}
          <div className="absolute inset-0 overflow-clip rounded-[20px]">
            <div
              ref={flow}
              className="absolute"
              style={{
                left: padL,
                top: padT,
                height: H - padT - padB,
                width: two ? colW * 2 + gap : colW,
                columnWidth: colW,
                columnGap: gap,
                columnFill: 'auto',
                transform: `translateX(${-at * per * step}px)`,
                fontSize: 20,
                lineHeight: '24px',
              }}
            >
              {/* Trang bìa trong: chữ tháng tô hồng viền đen, nhãn tuần, dải 7 ngày của tuần này,
                  rồi tới mẩu của mèo quán */}
              <div className="break-inside-avoid pb-6">
                <div className="relative inline-block pr-9">
                  <p className={`${marker.className} text-[50px] leading-[52px] text-[#f7a79d] [-webkit-text-stroke:5px_#2c2a33] [paint-order:stroke_fill]`}>
                    {cap(fmt(today, {month: 'long'}))}
                  </p>
                  {/* Mấy ngôi sao + chấm bút dạ quanh chữ */}
                  <span aria-hidden className="absolute -top-1 right-1 text-[18px] leading-none text-[#e4574c]">✦</span>
                  <span aria-hidden className="absolute right-5 top-5 text-[11px] leading-none text-[#e4574c]">✦</span>
                  <span aria-hidden className="absolute -left-2 -top-2 h-[6px] w-[6px] rounded-full bg-[#e4574c]" />
                  <span aria-hidden className="absolute bottom-0 right-0 h-[5px] w-[5px] rounded-full bg-[#f49b8f]" />
                </div>
                <p>
                  <span className={`${marker.className} mt-[8px] inline-block -rotate-1 bg-[#f6b7ae] px-2.5 text-[17px] leading-[24px] text-[#7a2a23]`}>{t.diary.weekN(Math.floor((Number(today.slice(8, 10)) + lead - 1) / 7) + 1)}</span>
                </p>
                {/* Tuần này, Thứ 2 → CN: 1 vệt bút dạ kéo ngang, hôm nay khoanh tròn, chấm đỏ = ngày có mẩu */}
                <ol className="mt-[16px] grid grid-cols-7 rounded-[8px] bg-[#f6b7ae]/55 px-1 py-[5px] text-center" aria-label={t.diary.week}>
                  {week.map((d) => {
                    const reachable = dayList.includes(d)
                    const label = cap(fmt(d, {weekday: 'long', day: 'numeric', month: 'long'}))
                    const cell = (
                      <>
                        <span className="block text-[14px] leading-[18px] text-[#8a5f5a]">{cap(fmt(d, {weekday: 'short'}))}</span>
                        <span className={`mx-auto flex h-[28px] w-[28px] items-center justify-center rounded-full text-[18px] leading-none ${d === today ? 'bg-[#e4574c] text-white' : ''}`}>
                          {Number(d.slice(8, 10))}
                        </span>
                        <span aria-hidden className={`mx-auto mt-[2px] block h-[5px] w-[5px] rounded-full ${has(d) ? 'bg-[#e4574c]' : 'bg-transparent'}`} />
                      </>
                    )
                    return (
                      <li key={d}>
                        {reachable ? (
                          <button type="button" onClick={() => jumpTo(d)} aria-label={label} className="w-full rounded-[6px] hover:bg-white/50 focus-visible:outline-2 focus-visible:outline-[#e4574c]">
                            {cell}
                          </button>
                        ) : (
                          <span aria-label={label} className="block opacity-45">
                            {cell}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </div>

              {/* Mẩu của mèo quán: khối riêng để cột thấp thì cả tờ note nhảy sang trang kế, không bị cắt đôi */}
              {!filtered && (
                <div className="break-inside-avoid">
                  <div className="relative mx-auto mb-[36px] mt-[6px] w-[88%] -rotate-2">
                    {/* Giấy note: góc dưới phải cong lên, bóng mềm như đang nằm trên trang */}
                    <div className="relative rounded-[5px_5px_22px_5px] bg-[linear-gradient(165deg,#ffe6ea_0%,#fbd0d7_70%,#f6c0c9_100%)] px-4 pb-3.5 pt-6 text-[#5a2530] shadow-[0_14px_18px_-12px_rgba(110,50,60,0.6),0_2px_3px_rgba(110,50,60,0.18)]">
                      <p className="text-[20px] leading-[24px]">{cafeText}</p>
                      <p className="mt-1.5 text-[16px] leading-[20px] text-[#a15a6a]">🐾 {t.diary.cat}</p>
                      <span aria-hidden className="absolute bottom-0 right-0 h-[22px] w-[22px] rounded-[14px_0_22px_0] bg-[linear-gradient(315deg,transparent_42%,#eeb0bb_44%,#fde9ec_100%)] shadow-[-2px_-2px_4px_rgba(110,50,60,0.14)]" />
                    </div>
                    {/* Sticker mèo mướp của quán (khung "ngủ" trong atlas cat.webp), viền trắng cắt bế */}
                    <span
                      aria-hidden
                      className="absolute -bottom-[34px] -right-[12px] block h-[46px] w-[84px] rotate-[-6deg] bg-no-repeat [filter:drop-shadow(2px_0_0_#fff)_drop-shadow(-2px_0_0_#fff)_drop-shadow(0_2px_0_#fff)_drop-shadow(0_-2px_0_#fff)_drop-shadow(0_3px_3px_rgba(60,40,30,0.3))] [image-rendering:pixelated]"
                      style={{backgroundImage: 'url(/chill/cat.webp)', backgroundSize: '1492px 84px', backgroundPosition: '0 -38px'}}
                    />
                    {/* Băng keo washi sọc, 2 đầu xé răng cưa, hơi trong */}
                    <span
                      aria-hidden
                      className="absolute -top-[10px] left-1/2 h-[22px] w-[92px] -translate-x-1/2 rotate-[4deg] bg-[repeating-linear-gradient(135deg,rgba(255,236,170,0.92)_0,rgba(255,236,170,0.92)_7px,rgba(255,214,140,0.92)_7px,rgba(255,214,140,0.92)_14px)] shadow-[0_1px_2px_rgba(90,60,20,0.25)] [clip-path:polygon(0_0,3%_25%,0_50%,3%_75%,0_100%,100%_100%,97%_75%,100%_50%,97%_25%,100%_0)]"
                    />
                  </div>
                </div>
              )}

              {dayList.map((day) => {
                const list = notes.filter((n) => n.day === day)
                const isToday = day === today
                return (
                  <section key={day} data-day={day} className="pb-6">
                    <h3 className={`${marker.className} flex break-after-avoid items-center gap-2 text-[27px] leading-[48px] text-[#e4574c]`}>
                      <span aria-hidden className="text-[20px]">▸</span>
                      {cap(fmt(day, {weekday: 'long'}))}
                      <span className="flex h-[30px] min-w-[30px] items-center justify-center rounded-full bg-[#f49b8f] px-1 text-[19px] leading-none text-[#5a1c16]">{Number(day.slice(8, 10))}</span>
                      {isToday && <span className={`${hand.className} text-[17px] text-[#8b8794]`}>· {t.diary.dayToday.toLowerCase()}</span>}
                    </h3>
                    {/* Câu hỏi quán hỏi cả quán ngày hôm đó — các mẩu bên dưới là câu trả lời */}
                    {question(day) && (
                      <p className={`${marker.className} break-after-avoid pb-[24px] text-[19px] leading-[24px] text-[#3a6ea5]`}>
                        <span aria-hidden>“</span>
                        {question(day)}
                        <span aria-hidden>”</span>
                      </p>
                    )}
                    {/* Ảnh "chụp" cảnh quán dán kiểu polaroid, chữ của mục hôm nay chảy vòng quanh */}
                    {isToday && !filtered && (
                      <div aria-hidden className="relative float-right mb-3 ml-4 mt-1 w-[44%] max-w-[190px] break-inside-avoid rotate-[3deg] bg-white p-[7px] pb-[26px] shadow-[0_8px_14px_-8px_rgba(40,60,70,0.55),0_1px_2px_rgba(40,60,70,0.25)]">
                        {/* eslint-disable-next-line @next/next/no-img-element -- pixel art 320×180 phóng nguyên điểm ảnh */}
                        <img src="/chill/scenes/room-cafe-thumb.webp" alt="" width={320} height={180} loading="lazy" className="block w-full [image-rendering:pixelated]" />
                        <span className="absolute inset-x-0 bottom-[3px] text-center text-[15px] leading-[20px] text-[#6d6a75]">{t.diary.photo}</span>
                        <span className="absolute -top-[9px] left-1/2 h-[18px] w-[58px] -translate-x-1/2 -rotate-3 bg-[rgba(170,222,214,0.85)] shadow-[0_1px_2px_rgba(40,80,80,0.25)]" />
                      </div>
                    )}
                    <ul>
                      {list.map((n) => (
                        <li key={n.id} data-note className="group/line break-inside-avoid pb-[24px]">
                          <p className="flex gap-2">
                            <span aria-hidden className="shrink-0 text-[#e4574c]">•</span>
                            <span className={`min-w-0 whitespace-pre-wrap break-words ${n.kind === 'book' ? 'text-[#6d6a75]' : ''}`}>{n.text}</span>
                          </p>
                          <p className="flex items-center gap-2 pl-[18px] text-[15px] text-[#8b8794]">
                            <span className="shrink-0 whitespace-nowrap px-1.5 text-[14px] leading-[20px]" style={{background: PAPER[n.mood].bg, color: PAPER[n.mood].ink}}>
                              {MOOD_ICON[n.mood]} {t.diary.moods[n.mood]}
                            </span>
                            <span className="min-w-0 truncate">{n.kind === 'book' ? `🔒 ${t.diary.onlyHere}` : n.mine ? t.diary.mine : n.name || t.diary.guest}</span>
                            <span className="shrink-0 tabular-nums">{clock(n.ts)}</span>
                            <LineAction note={n} onReport={onReport} onRemove={onRemove} />
                          </p>
                        </li>
                      ))}
                      {isToday && list.length === 0 && !composing && <li className="pb-[24px] text-[#8b8794]">{filtered ? t.diary.emptyMood : t.diary.emptyDay}</li>}
                      {isToday && (
                        <li className="clear-both break-inside-avoid pb-[24px] pt-1">
                          {/* Thẻ caro hồng "Ghi chú": chỗ khách viết mẩu của mình */}
                          <div className="relative rotate-[-1deg] bg-[#fbe4ea] bg-[linear-gradient(rgba(240,160,185,0.38)_50%,transparent_50%),linear-gradient(90deg,rgba(240,160,185,0.38)_50%,transparent_50%)] bg-[length:22px_22px] px-3.5 pb-3.5 pt-2 shadow-[0_8px_14px_-9px_rgba(110,50,70,0.55),0_1px_2px_rgba(110,50,70,0.2)]">
                            <p className={`${marker.className} text-center text-[17px] uppercase leading-[30px] tracking-[0.08em] text-[#3a2a33]`}>
                              <span aria-hidden>☆ </span>
                              {t.diary.noteCard}
                              <span aria-hidden> ☆</span>
                            </p>
                            {composing ? (
                              <Compose open={open} question={question(today)} onDone={onDone} onCancel={onCancel} />
                            ) : left > 0 ? (
                              <button
                                type="button"
                                onClick={onCompose}
                                className="group/write block w-full rounded-[10px] border-2 border-[#3a2a33] bg-white/75 px-3 pb-2 pt-1 text-left text-[#8b8794] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4574c]"
                              >
                                <span className="block border-b-2 border-dashed border-[#3a2a33]/55 leading-[30px] text-[#5d5866] group-hover/write:text-[#e4574c]">✎ {question(today) ?? `${t.diary.write}…`}</span>
                                <span aria-hidden className="block h-[26px] border-b-2 border-dashed border-[#3a2a33]/55" />
                                <span className="mt-1.5 block text-right text-[15px] leading-[20px]">{t.diary.left(left)}</span>
                              </button>
                            ) : (
                              <p className="rounded-[10px] border-2 border-[#3a2a33] bg-white/75 px-3 py-2 text-[17px] text-[#5d5866]">{t.diary.noneLeft}</p>
                            )}
                          </div>
                        </li>
                      )}
                    </ul>
                  </section>
                )
              })}

            </div>
          </div>

          {/* Sân khấu cho tờ giấy đang lật (xem effect lật trang) — nằm trên trang, dưới lò xo */}
          <div ref={stage} aria-hidden className="pointer-events-none absolute inset-0" style={{perspective: W * 2.4}} />

          {/* Lò xo đôi vắt qua khe giữa 2 trang (hoặc mép trái nếu 1 trang), mỗi vòng 2 sợi,
              luồn qua lỗ đục trên giấy */}
          <div aria-hidden className="pointer-events-none absolute inset-y-[26px] flex flex-col justify-between" style={two ? {left: W / 2 - 31, width: 62} : {left: -13, width: 44}}>
            {Array.from({length: rings}).map((_, i) => (
              <span key={i} className="relative block h-[19px] w-full">
                {two && <span className="absolute left-[3px] top-[4px] h-[11px] w-[7px] rounded-[2px] bg-[#3a3f44]" />}
                <span className="absolute right-[3px] top-[4px] h-[11px] w-[7px] rounded-[2px] bg-[#3a3f44]" />
                <span className="absolute inset-x-[6px] top-0 h-[9px] rounded-full border-[2.5px] border-[#2f6f95] border-b-[#1f5373] shadow-[0_1px_1px_rgba(0,0,0,0.3)]" />
                <span className="absolute inset-x-[6px] top-[9px] h-[9px] rounded-full border-[2.5px] border-[#3b82ab] border-b-[#1f5373] shadow-[0_2px_2px_rgba(0,0,0,0.3)]" />
              </span>
            ))}
          </div>

          {/* Ghi chú của quán viết trên mặt bàn, dưới mép sổ — để trong sổ thì nó tự chiếm riêng
              1 trang gần như trống */}
          <p className="pointer-events-none absolute inset-x-0 top-full pt-[12px] text-center text-[14px] leading-[18px] text-[#fbe6cb] [text-shadow:0_1px_2px_rgba(40,14,2,0.7)] sm:text-[15px]">
            ☆ {t.diary.keeps} <span className="inline-block">☆ {t.diary.care}</span>
          </p>

          {/* Lật trang */}
          <div className="absolute inset-x-0 bottom-[10px] flex items-center justify-between px-5 text-[17px] leading-[24px] text-[#e4574c]">
            <button type="button" onClick={() => setSpread(Math.max(at - 1, 0))} disabled={at === 0} className="px-1 transition-opacity hover:underline disabled:opacity-0 focus-visible:outline-2 focus-visible:outline-[#e4574c]">
              ← {t.diary.prevPage}
            </button>
            {/* Số trang nằm cạnh nút lật (giữa sổ là lò xo) */}
            <span className="flex items-center gap-3">
              <span aria-live="polite" className="text-[15px] tabular-nums text-[#8b8794]">
                {t.diary.pageOf(at + 1, spreads)}
              </span>
              <button type="button" onClick={() => setSpread(Math.min(at + 1, spreads - 1))} disabled={at >= spreads - 1} className="px-1 transition-opacity hover:underline disabled:opacity-0 focus-visible:outline-2 focus-visible:outline-[#e4574c]">
                {t.diary.nextPage} →
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Cây bút dạ thân trắng nắp cam nằm trên bàn: thân trụ có vệt sáng dọc, nắp có kẹp cài
function DeskPen() {
  return (
    <svg
      aria-hidden
      width="430"
      height="40"
      viewBox="0 0 430 40"
      className="absolute -top-[42px] left-[30%] -rotate-[2deg] drop-shadow-[0_9px_6px_rgba(40,14,2,0.5)]"
    >
      <defs>
        <linearGradient id="chill-pen-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffa598" />
          <stop offset="0.35" stopColor="#f47c6d" />
          <stop offset="0.75" stopColor="#e2584d" />
          <stop offset="1" stopColor="#b9433a" />
        </linearGradient>
        <linearGradient id="chill-pen-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#f6f3ee" />
          <stop offset="0.8" stopColor="#dedad1" />
          <stop offset="1" stopColor="#bdb8ad" />
        </linearGradient>
      </defs>
      {/* Thân bút + đuôi bo tròn có nút cam */}
      <rect x="118" y="9" width="262" height="22" rx="4" fill="url(#chill-pen-body)" />
      <rect x="372" y="11" width="30" height="18" rx="9" fill="url(#chill-pen-body)" />
      <rect x="398" y="13" width="14" height="14" rx="7" fill="url(#chill-pen-cap)" />
      <rect x="128" y="13" width="240" height="2.5" rx="1.25" fill="#ffffff" opacity="0.95" />
      {/* Vài dòng chữ in trên thân */}
      <rect x="196" y="19" width="74" height="2" rx="1" fill="#b9b3a7" />
      <rect x="278" y="19" width="30" height="2" rx="1" fill="#cfc9be" />
      {/* Nắp: đầu trái bo tròn, vòng nối với thân, kẹp cài nằm trên */}
      <path d="M22 6 H120 a4 4 0 0 1 4 4 V30 a4 4 0 0 1 -4 4 H22 a14 14 0 0 1 0 -28 Z" fill="url(#chill-pen-cap)" />
      <rect x="119" y="7" width="6" height="26" rx="2" fill="#a83a32" />
      <rect x="20" y="11" width="92" height="3" rx="1.5" fill="#ffffff" opacity="0.45" />
      <path d="M30 3 H108 a4 4 0 0 1 4 4 v3 a2 2 0 0 1 -2 2 H34 a6 6 0 0 1 -6 -6 v-1 a2 2 0 0 1 2 -2 Z" fill="#d94f44" />
      <rect x="34" y="4.5" width="70" height="2" rx="1" fill="#ffb4a9" opacity="0.8" />
    </svg>
  )
}

// Ly cà phê của khách ở góc bàn: bấm vào thì hiện 3 món để chọn, chọn xong ly đổi theo
function DeskCoffee({size, top, right}: {size: number; top: number; right: number}) {
  const t = useT()
  // Cùng 1 món với ly dưới phin ngoài cảnh quán (drink.ts)
  const drink = useDrink()
  const [picking, setPicking] = useState(false)
  const menu = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!picking) return
    const onDown = (e: PointerEvent) => !menu.current?.contains(e.target as Node) && setPicking(false)
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [picking])

  const choose = (d: Drink) => {
    chooseDrink(d)
    setPicking(false)
    trackEvent({name: 'Chill Drink', props: {drink: d}})
  }

  return (
    <div ref={menu} className="absolute z-20" style={{top, right}}>
      <button
        type="button"
        onClick={() => setPicking((p) => !p)}
        aria-expanded={picking}
        aria-label={drink ? `${t.diary.drinkAria}: ${t.diary.drinks[drink]}` : t.diary.drinkAria}
        title={t.diary.drinkAria}
        className="block rounded-full transition-transform duration-200 hover:scale-[1.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fbe6cb]"
      >
        <CoffeeArt drink={drink} size={size} />
      </button>
      {/* Chưa chọn món: mẩu nhắc viết tay cạnh ly (chỉ khi bàn rộng) */}
      {!drink && !picking && size >= 150 && (
        <p aria-hidden className="pointer-events-none absolute right-full top-[58%] mr-1 w-max -rotate-6 text-[15px] leading-[18px] text-[#fbe6cb] [text-shadow:0_1px_2px_rgba(40,14,2,0.8)]">
          {t.diary.drinkHint} →
        </p>
      )}
      {picking && (
        <div
          role="dialog"
          aria-label={t.diary.drinkTitle}
          className="absolute right-5 top-full mt-1 w-[min(292px,calc(100vw-48px))] rotate-[1deg] rounded-[6px] bg-[#fbf3e0] p-3 text-[#3a2412] shadow-[0_14px_22px_-8px_rgba(40,14,2,0.7),0_0_0_2px_#2a1a10] motion-safe:animate-[chill-pop_0.2s_ease-out]"
        >
          <p className={`${marker.className} text-center text-[19px] leading-[26px] text-[#e4574c]`}>{t.diary.drinkTitle}</p>
          <div role="radiogroup" aria-label={t.diary.drinkTitle} className="mt-1 grid grid-cols-3 gap-1">
            {DRINKS.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={drink === d}
                onClick={() => choose(d)}
                className={`flex flex-col items-center rounded-[10px] border-2 px-1 pb-1.5 pt-1 transition focus-visible:outline-2 focus-visible:outline-[#e4574c] ${
                  drink === d ? 'border-[#e4574c] bg-[#f6b7ae]/45' : 'border-transparent hover:bg-[#f6b7ae]/30'
                }`}
              >
                <CoffeeArt drink={d} size={76} />
                <span className="mt-0.5 text-[17px] leading-[20px]">{t.diary.drinks[d]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Hình ly nhìn từ trên xuống. null = tách đen nóng trên đĩa lót (mặc định); còn lại là ly đá
// trên đế lót tre: đen đá (nước đen, ống hút xanh), sữa đá (nâu có vệt sữa, thìa khuấy),
// bạc xỉu (sữa kem, vệt cà phê chưa khuấy, ống hút cam)
function CoffeeArt({drink, size}: {drink: Drink | null; size: number}) {
  const shadow = 'drop-shadow-[0_10px_8px_rgba(40,14,2,0.5)]'
  if (!drink)
    return (
      <svg aria-hidden width={size} height={size} viewBox="0 0 170 170" className={`block ${shadow}`}>
        <defs>
          <radialGradient id="chill-cup-saucer" cx="0.4" cy="0.35" r="0.75">
            <stop offset="0" stopColor="#fffdf7" />
            <stop offset="0.7" stopColor="#f1eadb" />
            <stop offset="1" stopColor="#d6cbb6" />
          </radialGradient>
          <radialGradient id="chill-cup-coffee" cx="0.38" cy="0.34" r="0.8">
            <stop offset="0" stopColor="#7a4420" />
            <stop offset="0.55" stopColor="#4a2610" />
            <stop offset="1" stopColor="#241006" />
          </radialGradient>
          <linearGradient id="chill-cup-spoon" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f4f6f7" />
            <stop offset="1" stopColor="#9aa3aa" />
          </linearGradient>
        </defs>
        {/* Đĩa lót: vành ngoài + lòng đĩa */}
        <circle cx="82" cy="86" r="72" fill="url(#chill-cup-saucer)" stroke="#c9bea8" strokeWidth="1.5" />
        <circle cx="82" cy="86" r="54" fill="none" stroke="#e1d8c6" strokeWidth="3" />
        {/* Thìa gác trên đĩa */}
        <g transform="rotate(38 40 132)">
          <rect x="36" y="96" width="6" height="52" rx="3" fill="url(#chill-cup-spoon)" stroke="#8a939a" strokeWidth="0.8" />
          <ellipse cx="39" cy="92" rx="9" ry="13" fill="url(#chill-cup-spoon)" stroke="#8a939a" strokeWidth="0.8" />
          <ellipse cx="37" cy="89" rx="3" ry="6" fill="#ffffff" opacity="0.6" />
        </g>
        {/* Quai tách chĩa về phía dưới phải */}
        <g transform="rotate(40 82 86)">
          <rect x="118" y="74" width="34" height="24" rx="12" fill="none" stroke="#ffffff" strokeWidth="9" />
          <rect x="118" y="74" width="34" height="24" rx="12" fill="none" stroke="#cfc6b4" strokeWidth="1.2" />
        </g>
        {/* Thành tách + mặt cà phê */}
        <circle cx="82" cy="86" r="45" fill="#ffffff" stroke="#cfc6b4" strokeWidth="1.5" />
        <circle cx="82" cy="86" r="38" fill="url(#chill-cup-coffee)" stroke="#e9e2d3" strokeWidth="2" />
        <path d="M58 78 q14 -18 36 -10" fill="none" stroke="#c98d55" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
        <path d="M66 100 q16 12 34 0" fill="none" stroke="#8a5126" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
        <ellipse cx="68" cy="72" rx="9" ry="4" fill="#ffffff" opacity="0.35" transform="rotate(-28 68 72)" />
      </svg>
    )

  const look = {
    den: {from: '#5a3218', to: '#1c0c04', ice: 'rgba(255,255,255,0.2)', edge: 'rgba(255,255,255,0.5)', straw: ['#3fbf99', '#157a5c']},
    sua: {from: '#cf975d', to: '#8a5326', ice: 'rgba(255,244,226,0.34)', edge: 'rgba(255,250,240,0.75)', straw: null},
    bacxiu: {from: '#f8ead0', to: '#dcc097', ice: 'rgba(255,255,255,0.55)', edge: '#ffffff', straw: ['#ff8f6b', '#c94f2c']},
  }[drink]
  const id = `chill-drink-${drink}`
  // Viên đá: [x, y, cạnh, góc xoay]
  const cubes: [number, number, number, number][] = drink === 'bacxiu' ? [[52, 84, 26, -12], [96, 96, 24, 20], [92, 54, 22, 34]] : [[54, 58, 27, -14], [90, 54, 24, 18], [68, 92, 27, 9], [100, 90, 22, -22]]
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 170 170" className={`block ${shadow}`}>
      <defs>
        <radialGradient id={`${id}-coaster`} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#ecd3a6" />
          <stop offset="0.7" stopColor="#d6b480" />
          <stop offset="1" stopColor="#b48d58" />
        </radialGradient>
        <radialGradient id={`${id}-liquid`} cx="0.38" cy="0.34" r="0.85">
          <stop offset="0" stopColor={look.from} />
          <stop offset="1" stopColor={look.to} />
        </radialGradient>
        {look.straw && (
          <linearGradient id={`${id}-straw`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={look.straw[0]} />
            <stop offset="1" stopColor={look.straw[1]} />
          </linearGradient>
        )}
      </defs>
      {/* Đế lót tre */}
      <circle cx="85" cy="88" r="74" fill={`url(#${id}-coaster)`} stroke="#9c774a" strokeWidth="1.5" />
      <circle cx="85" cy="88" r="64" fill="none" stroke="#c19c66" strokeWidth="2" />
      <circle cx="85" cy="88" r="57" fill="none" stroke="#c9a672" strokeWidth="1.2" />
      {/* Thành ly thuỷ tinh + nước */}
      <circle cx="85" cy="86" r="53" fill="#f3f7f7" stroke="#b9c5c8" strokeWidth="1.5" />
      <circle cx="85" cy="86" r="46" fill={`url(#${id}-liquid)`} stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
      {drink === 'sua' && <path d="M52 96 q20 -34 50 -16 q14 10 22 -8" fill="none" stroke="#f3dcb8" strokeWidth="8" strokeLinecap="round" opacity="0.7" />}
      {drink === 'bacxiu' && (
        <>
          <path d="M64 56 q24 -12 38 6 q9 15 -9 22 q-20 7 -30 -6 q-9 -13 1 -22z" fill="#8f5e36" opacity="0.85" />
          <path d="M56 104 q16 14 38 7 q16 -5 22 -19" fill="none" stroke="#c39664" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
        </>
      )}
      {cubes.map(([x, y, w, r], i) => (
        <g key={i} transform={`rotate(${r} ${x + w / 2} ${y + w / 2})`}>
          <rect x={x} y={y} width={w} height={w} rx="6" fill={look.ice} stroke={look.edge} strokeWidth="1.5" />
          <path d={`M${x + 5} ${y + 6} h${w - 14}`} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
        </g>
      ))}
      {look.straw ? (
        <g transform="rotate(30 85 86)">
          <rect x="80" y="8" width="11" height="80" rx="5.5" fill={`url(#${id}-straw)`} stroke={look.straw[1]} strokeWidth="1" />
          <rect x="82.5" y="12" width="2.5" height="70" rx="1.25" fill="#ffffff" opacity="0.45" />
        </g>
      ) : (
        // Thìa khuấy cán dài cắm trong ly
        <g transform="rotate(-36 85 86)">
          <rect x="81" y="6" width="7" height="78" rx="3.5" fill="#dfe3e6" stroke="#8a939a" strokeWidth="1" />
          <ellipse cx="84.5" cy="90" rx="9" ry="12" fill="#cfd5da" stroke="#8a939a" strokeWidth="1" />
          <rect x="83" y="10" width="2" height="68" rx="1" fill="#ffffff" opacity="0.7" />
        </g>
      )}
      {/* Vệt sáng trên vành ly */}
      <path d="M46 70 q8 -22 28 -28" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  )
}

// Cuối mỗi dòng: báo cáo (mẩu của người khác) hoặc bỏ khỏi sổ (mẩu riêng của mình)
function LineAction({note, onReport, onRemove}: {note: ShownNote; onReport: (id: string) => void; onRemove: (id: string) => void}) {
  const t = useT()
  const [asking, setAsking] = useState(false)
  if (note.kind === 'book')
    return (
      <button type="button" onClick={() => onRemove(note.id)} aria-label={t.diary.remove} title={t.diary.remove} className="shrink-0 px-1 opacity-50 hover:opacity-100 focus-visible:opacity-100">
        ✕
      </button>
    )
  if (note.mine) return null
  if (asking)
    return (
      <span className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={() => onReport(note.id)} className="text-[#e4574c] underline underline-offset-2">
          {t.diary.reportYes}
        </button>
        <button type="button" onClick={() => setAsking(false)}>
          {t.diary.cancel}
        </button>
      </span>
    )
  return (
    <button
      type="button"
      onClick={() => setAsking(true)}
      aria-label={t.diary.report}
      title={t.diary.report}
      className="shrink-0 px-1 opacity-0 transition group-hover/line:opacity-60 hover:!opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-40"
    >
      ⚑
    </button>
  )
}

// Mẩu giấy đang viết: chữ, tâm trạng, treo lên tường hay cất vào sổ
function Compose({open, question, onDone, onCancel}: {open: boolean; question: string | null; onDone: (note: MyNote) => void; onCancel: () => void}) {
  const t = useT()
  const [text, setText] = useState('')
  const [mood, setMood] = useState<Mood>('calm')
  const [kind, setKind] = useState<Kind>('wall')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const me = useRef<{uid: string; name: string} | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<string | undefined>(undefined)
  const area = useRef<HTMLTextAreaElement>(null)
  // Chặn bấm đúp: `busy` chỉ đổi sau lần vẽ kế tiếp
  const sending = useRef(false)

  useEffect(() => {
    me.current = loadMe()
    setName(me.current.name)
    // Script có thể đã tải sẵn (sổ góp ý, form Contact) → dùng luôn
    if (window.turnstile) setScriptReady(true)
    area.current?.focus({preventScroll: true})
  }, [])

  // Chỉ mẩu treo lên tường mới cần xác minh người thật
  useEffect(() => {
    if (!open || kind !== 'wall' || !scriptReady || !box.current || !window.turnstile) return
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!sitekey) return
    widget.current = window.turnstile.render(box.current, {
      sitekey,
      callback: (tk: string) => {
        setToken(tk)
        setError('')
      },
      'error-callback': () => {
        setToken(null)
        setError(t.diary.errors.captcha)
      },
    })
    return () => {
      if (window.turnstile && widget.current) window.turnstile.remove(widget.current)
      widget.current = undefined
      setToken(null)
    }
  }, [open, kind, scriptReady, t])

  const body = text.replace(/\s+/g, ' ').trim()
  const ready = body.length >= NOTE_MIN && !busy && (kind === 'book' || Boolean(token))

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready || sending.current) return
    sending.current = true
    const ts = Date.now()
    if (kind === 'book') {
      trackEvent({name: 'Chill Diary', props: {action: 'keep'}})
      return onDone({id: `book-${ts}`, text: body, mood, name: '', day: dayOf(ts), ts, kind: 'book'})
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/chill-diary', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'post', uid: me.current?.uid, name: name.trim(), text: body, mood, captchaToken: token, company}),
      })
      const data = (await res.json().catch(() => ({}))) as {note?: DiaryNote | null; code?: keyof typeof t.diary.errors}
      if (!res.ok || !data.note) {
        setError((data.code && t.diary.errors[data.code]) || t.diary.errors.send)
        if (window.turnstile && widget.current) window.turnstile.reset(widget.current)
        setToken(null)
        return
      }
      trackEvent({name: 'Chill Diary', props: {action: 'pin'}})
      onDone({...data.note, kind: 'wall'})
    } catch {
      setError(t.diary.errors.send)
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  const paper = PAPER[mood]
  return (
    <form onSubmit={send} className="relative w-full rounded-[10px] border-2 border-[#3a2a33] px-3.5 pb-3 pt-3 text-[16px] leading-[22px]" style={{background: paper.bg, color: paper.ink}}>
      {!scriptReady && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" onReady={() => setScriptReady(true)} />}
      <label className="sr-only" htmlFor="chill-diary-text">
        {question ?? t.diary.write}
      </label>
      <textarea
        id="chill-diary-text"
        ref={area}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, NOTE_MAX))}
        maxLength={NOTE_MAX}
        rows={3}
        placeholder={question ?? t.diary.placeholder}
        className="block w-full resize-none bg-transparent text-[15px] leading-snug outline-none placeholder:opacity-50"
        style={{color: paper.ink}}
      />
      <p className="text-right text-[11px] tabular-nums" style={{color: paper.soft}}>
        {text.length}/{NOTE_MAX}
      </p>

      <div role="radiogroup" aria-label={t.diary.moodAria} className="mt-1 flex flex-wrap gap-1.5">
        {MOODS.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mood === m}
            onClick={() => setMood(m)}
            className="rounded-full border px-2 py-0.5 text-xs transition focus-visible:outline-2 focus-visible:outline-current"
            style={mood === m ? {background: paper.ink, color: paper.bg, borderColor: paper.ink} : {borderColor: `${paper.soft}66`, color: paper.ink}}
          >
            {MOOD_ICON[m]} {t.diary.moods[m]}
          </button>
        ))}
      </div>

      <div role="radiogroup" aria-label={t.diary.toWall} className="mt-3 grid grid-cols-2 gap-1.5">
        {(['wall', 'book'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className="border px-2 py-1.5 text-left transition focus-visible:outline-2 focus-visible:outline-current"
            style={kind === k ? {borderColor: paper.ink, background: `${paper.ink}12`} : {borderColor: `${paper.soft}55`}}
          >
            <span className="block text-[13px] font-semibold">{k === 'wall' ? t.diary.toWall : `🔒 ${t.diary.toBook}`}</span>
            <span className="block text-[11px] leading-tight" style={{color: paper.soft}}>
              {k === 'wall' ? t.diary.toWallDesc : t.diary.toBookDesc}
            </span>
          </button>
        ))}
      </div>

      {kind === 'wall' && (
        <>
          <label className="mt-2.5 flex items-center gap-2 text-xs" style={{color: paper.soft}}>
            <span className="shrink-0">{t.diary.yourName}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 24))}
              maxLength={24}
              placeholder={t.diary.namePlaceholder}
              className="min-w-0 flex-1 border-b bg-transparent py-0.5 text-[13px] outline-none placeholder:opacity-50"
              style={{borderColor: `${paper.soft}66`, color: paper.ink}}
            />
          </label>
          {/* Honeypot: người thật không thấy ô này */}
          <input tabIndex={-1} autoComplete="off" aria-hidden value={company} onChange={(e) => setCompany(e.target.value)} className="absolute h-0 w-0 opacity-0" />
          <div ref={box} className="mt-2 min-h-0 empty:hidden" />
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-[#a32d2d]">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-2 py-1.5 text-[13px] opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current">
          {t.diary.cancel}
        </button>
        <button
          type="submit"
          disabled={!ready}
          className="px-4 py-1.5 text-[13px] font-semibold transition disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          style={{background: paper.ink, color: paper.bg}}
        >
          {kind === 'wall' ? t.diary.send : t.diary.keep}
        </button>
      </div>
    </form>
  )
}
