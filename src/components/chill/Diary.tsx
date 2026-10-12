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
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {PixelIcon, TOKEN_CLASS, TokenChip, TokenLabel, TokenNewDot} from './pixel-icons'
import {trackEvent} from '@/lib/analytics'
import {useLang, useT} from './i18n'
import {KEEP_DAYS, MOODS, NOTE_MAX, NOTE_MIN, NOTES_PER_DAY, cafeNoteOf, dayOf, recentDays, type DiaryNote, type Mood} from './diary-shared'

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
const PILE_MAX = 6
const PILE_MS = 7000

type Kind = 'wall' | 'book'
type MyNote = DiaryNote & {kind: Kind}
// Mẩu đang hiện trong sổ: của tường (kind trống), hoặc của mình (mine) — kể cả mẩu cất riêng
type ShownNote = DiaryNote & {kind?: Kind; mine?: boolean}
type Store = {mine: MyNote[]; hidden: string[]; seen: number}
type Room = {open: boolean; notes: DiaryNote[]; cafe: {vi: string; en: string} | null}

const EMPTY: Store = {mine: [], hidden: [], seen: 0}

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

  // Xấp giấy ghim: mẩu khách treo gần nhất nằm trên cùng, rồi tới các mẩu trước đó, cuối
  // cùng là câu của mèo quán (null). Mẩu "cất vào sổ" không lên đây.
  const pile = useMemo<(DiaryNote | null)[]>(
    () => [
      ...notes
        .filter((n) => n.kind !== 'book')
        .sort((a, b) => b.ts - a.ts)
        .slice(0, PILE_MAX),
      null,
    ],
    [notes],
  )
  const [turn, setTurn] = useState(0)
  const [held, setHeld] = useState(false)
  // Tự lật sang mẩu kế; rê chuột vào thì dừng để đọc. Giảm chuyển động → đứng yên ở mẩu mới nhất
  useEffect(() => {
    if (pile.length < 2 || held || open || hidden || slipHidden) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setInterval(() => document.visibilityState === 'visible' && setTurn((n) => n + 1), PILE_MS)
    return () => window.clearInterval(id)
  }, [pile.length, held, open, hidden, slipHidden])

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
  const top = pile[turn % pile.length]
  const topPaper = top ? PAPER[top.mood] : PIN_PAPER
  // 2 tờ ló ra phía sau = 2 mẩu kế tiếp trong xấp (màu theo tâm trạng của chính mẩu đó)
  const behind = [1, 2].filter((i) => i < pile.length).map((i) => pile[(turn + i) % pile.length])
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
            <TokenLabel>{t.diary.label}</TokenLabel>
          </button>,
          slot,
        )}

      {/* Xấp giấy ghim trên khung cửa — lối vào bảng. Tờ trên cùng là mẩu khách treo gần nhất,
          cứ vài giây lật sang mẩu trước đó, cuối xấp là câu của mèo quán; các tờ ló ra phía sau
          + hàng chấm cho biết trong xấp còn mấy mẩu. Vẽ cùng kiểu với đồ vật trong cảnh: viền
          nâu đậm 2px, bóng đổ cứng, đinh ghim pixel; giấy có dòng kẻ, góc dưới gập lên */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        onPointerEnter={() => setHeld(true)}
        onPointerLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
        aria-label={`${t.diary.title}: ${top ? top.text : cafeText}`}
        className={`group/pin absolute left-5 top-[4.75rem] z-10 hidden w-[214px] origin-top -rotate-2 text-left drop-shadow-[4px_5px_0_rgba(42,26,16,0.45)] transition duration-300 hover:rotate-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b27d] sm:block ${
          hidden || open || slipHidden ? 'pointer-events-none -translate-y-1 opacity-0' : dimmed ? 'opacity-60 hover:opacity-100' : 'opacity-100'
        }`}
      >
        {behind.map((n, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute inset-0 border-2 border-[#2a1a10] transition-colors duration-500"
            style={{background: n ? PAPER[n.mood].bg : PIN_PAPER.bg, transform: i === 0 ? 'translate(6px, 5px) rotate(2.5deg)' : 'translate(11px, 9px) rotate(5deg)', zIndex: -1 - i}}
          />
        ))}
        <PushPin />
        <span
          key={top?.id ?? 'cafe'}
          className="relative block border-2 border-[#2a1a10] [clip-path:polygon(0_0,100%_0,100%_calc(100%-16px),calc(100%-16px)_100%,0_100%)] motion-safe:animate-[chill-note-turn_0.45s_ease-out]"
          style={{background: topPaper.bg, color: topPaper.ink}}
        >
          <span
            className="flex items-center justify-between gap-2 border-b border-dashed px-3 pb-1.5 pt-3.5 font-mono text-[9px] uppercase tracking-[0.18em]"
            style={{color: topPaper.soft, borderColor: `${topPaper.soft}88`}}
          >
            <span className="truncate">{top ? `${MOOD_ICON[top.mood]} ${top.name || t.diary.guest}` : t.diary.cat}</span>
            <span className="shrink-0 tabular-nums">{top && top.day === today ? clock(top.ts) : `${(top?.day ?? today).slice(8, 10)}.${(top?.day ?? today).slice(5, 7)}`}</span>
          </span>
          {/* Dòng kẻ cách nhau đúng 1 dòng chữ (20px); luôn cao 4 dòng để lật mẩu không giật khung */}
          <span className="block h-[83px] bg-[repeating-linear-gradient(transparent_0,transparent_19px,rgba(42,26,16,0.13)_19px,rgba(42,26,16,0.13)_20px)] px-3 pt-[3px]">
            <span className="line-clamp-4 break-words text-[13px] font-semibold leading-[20px]">{top ? top.text : cafeText}</span>
          </span>
          <span className="flex items-end justify-between gap-2 px-3 pb-3 pt-2">
            {pile.length > 1 ? (
              // Mỗi chấm 1 mẩu trong xấp, chấm đậm = mẩu đang hiện
              <span aria-hidden className="flex items-center gap-[3px] pb-1">
                {pile.map((_, i) => (
                  <span key={i} className="h-[5px] w-[5px]" style={{background: topPaper.ink, opacity: i === turn % pile.length ? 0.9 : 0.25}} />
                ))}
              </span>
            ) : (
              <PawStamp />
            )}
            <span className="mr-3 shrink-0 whitespace-nowrap border border-[#2a1a10] bg-[#e8b27d] px-2 py-0.5 text-[11px] font-bold text-[#2a1a10] transition-colors group-hover/pin:bg-[#f0c294]">
              {todayCount > 0 || weekCount === 0 ? t.diary.slipCount(todayCount) : t.diary.slipWeek(weekCount)}
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
  const wrap = useRef<HTMLDivElement>(null)
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
      setBox({w, h: el.clientHeight - (w >= 760 ? 76 : 30)})
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Kích thước sổ: 2 trang khi đủ rộng. Mọi số đo bám theo ô kẻ 24px để chữ nằm trên dòng
  const two = box.w >= 760
  const per = two ? 2 : 1
  const W = Math.floor(Math.min(box.w, two ? 1010 : 470))
  const H = Math.floor(Math.max(340, Math.min(box.h, 672)))
  const padR = two ? 40 : 26
  // 1 trang: lò xo nằm mép trái nên lề trái rộng hơn
  const padL = two ? 40 : 46
  // Khe giữa 2 trang (chỗ lò xo vắt qua) + lề trong của mỗi trang
  const spine = 30
  const gap = two ? spine + 2 * 44 : padL + padR
  const colW = Math.max(160, two ? (W - padL - padR - gap) / 2 : W - padL - padR)
  const step = colW + gap
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

  const locale = lang === 'vi' ? 'vi-VN' : 'en-US'
  const dateOf = (day: string) => new Date(`${day}T12:00:00+07:00`)
  const fmt = (day: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, {timeZone: 'Asia/Ho_Chi_Minh', ...opts}).format(dateOf(day))
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const clock = (ts: number) => new Date(ts).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh'})
  const has = (day: string) => notes.some((n) => n.day === day)
  // Lịch tháng, tuần bắt đầu từ Thứ Hai: `lead` ô trống trước ngày 1, rồi từng ngày của tháng
  // (YYYY-MM-DD). Ngày còn trong hạn 7 ngày thì bấm được để lật tới trang của ngày đó
  const [yy, mm] = today.split('-').map(Number)
  const lead = today ? (new Date(Date.UTC(yy, mm - 1, 1)).getUTCDay() + 6) % 7 : 0
  const month: (string | null)[] = today
    ? [...Array.from({length: lead}, () => null), ...Array.from({length: new Date(Date.UTC(yy, mm, 0)).getUTCDate()}, (_, i) => `${today.slice(0, 8)}${String(i + 1).padStart(2, '0')}`)]
    : []
  const thisRow = Math.floor((month.indexOf(today) < 0 ? 0 : month.indexOf(today)) / 7)
  const dayList = days.filter((d) => d === today || has(d))

  // Ô kẻ không chạy sát mép giấy mà nằm trong 1 khung lùi vào `inset` px, như sổ thật
  const inset = 16
  const paper = (left: number, width: number, key: string) => (
    <div
      key={key}
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
  const pageW = two ? (W - spine) / 2 : W
  const rings = Math.max(4, Math.floor((H - 56) / 38))

  return (
    <div
      ref={wrap}
      className={`mx-2 mb-2 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[#cbeae6] sm:mx-3 sm:mb-3 ${hand.className}`}
      // Mặt bàn loang màu nước xanh ngọc
      style={{
        backgroundImage:
          'radial-gradient(60% 50% at 12% 18%, rgba(255,255,255,0.8), transparent 70%), radial-gradient(48% 44% at 88% 12%, rgba(160,219,218,0.95), transparent 70%), radial-gradient(55% 60% at 78% 88%, rgba(238,251,248,0.9), transparent 70%), radial-gradient(46% 42% at 22% 86%, rgba(146,209,212,0.8), transparent 70%), radial-gradient(34% 30% at 52% 46%, rgba(220,244,240,0.85), transparent 75%)',
      }}
    >
      {box.w > 0 && (
        <div
          className="relative shrink-0 text-[#2c2a33] drop-shadow-[0_16px_18px_rgba(40,84,92,0.32)]"
          style={{width: W, height: H}}
          onPointerDown={(e) => (swipe.current = e.pointerType === 'mouse' ? null : e.clientX)}
          onPointerUp={(e) => {
            const from = swipe.current
            swipe.current = null
            if (from === null || Math.abs(e.clientX - from) < 56) return
            setSpread((s) => (e.clientX < from ? Math.min(s + 1, spreads - 1) : Math.max(s - 1, 0)))
          }}
        >
          {/* Cây bút nắp cam nằm trên mặt bàn, phía trên sổ */}
          {two && (
            <div aria-hidden className="absolute -top-[35px] left-[32%] flex h-[24px] w-[380px] -rotate-1 items-center drop-shadow-[0_8px_6px_rgba(40,84,92,0.3)]">
              <span className="relative h-full w-[118px] rounded-l-[13px] rounded-r-[4px] bg-[linear-gradient(#f58a7c,#ec6a5c_55%,#d9564a)]">
                <span className="absolute -bottom-[7px] left-[18px] h-[9px] w-[84px] rounded-b-[6px] rounded-tl-[2px] bg-[#e4574c]" />
              </span>
              <span className="h-[22px] flex-1 bg-[linear-gradient(#ffffff,#f3f1ec_60%,#dedad2)]" />
              <span className="h-[16px] w-[30px] rounded-r-[8px] bg-[linear-gradient(#ffffff,#eeebe4_60%,#d8d4cb)]" />
            </div>
          )}

          {/* Giấy: mỗi trang 1 tờ bo góc, mép dưới + mép phải lộ xấp giấy bên dưới */}
          {two ? [paper(0, pageW, 'l'), paper(W - pageW, pageW, 'r')] : paper(0, pageW, 'p')}

          {/* overflow-clip chứ không phải hidden: ô đang gõ nhận focus cũng không kéo lệch trang */}
          <div className="absolute inset-0 overflow-clip rounded-[20px]">
            <div
              ref={flow}
              className="absolute transition-transform duration-500 ease-[cubic-bezier(.3,.7,.2,1)]"
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
              {/* Trang bìa trong: chữ tháng tô hồng viền đen, nhãn tuần, lịch tháng (hàng của tuần
                  này tô bút dạ), rồi tới mẩu của mèo quán */}
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
                <ol className="mt-[14px] grid max-w-[250px] grid-cols-7 text-center text-[16px] leading-[24px]" aria-label={cap(fmt(today, {month: 'long', year: 'numeric'}))}>
                  {month.map((d, i) => {
                    const row = Math.floor(i / 7)
                    const inWeek = row === thisRow
                    // Bút dạ kéo 1 vệt ngang cả hàng: ô đầu / cuối bo góc
                    const band = inWeek ? `bg-[#f6b7ae]/80 ${i % 7 === 0 ? 'rounded-l-[6px]' : ''} ${i % 7 === 6 ? 'rounded-r-[6px]' : ''}` : ''
                    if (!d) return <li key={i} aria-hidden className={band} />
                    const reachable = dayList.includes(d)
                    return (
                      <li key={i} className={band}>
                        {reachable ? (
                          <button
                            type="button"
                            onClick={() => jumpTo(d)}
                            aria-label={cap(fmt(d, {weekday: 'long', day: 'numeric', month: 'long'}))}
                            className={`relative w-full hover:text-[#e4574c] focus-visible:outline-2 focus-visible:outline-[#e4574c] ${d === today ? 'font-bold text-[#b3261e]' : ''}`}
                          >
                            {Number(d.slice(8, 10))}
                            {/* Chấm đỏ: ngày có mẩu giấy */}
                            {has(d) && <span aria-hidden className="absolute bottom-[1px] left-1/2 h-[4px] w-[4px] -translate-x-1/2 rounded-full bg-[#e4574c]" />}
                          </button>
                        ) : (
                          <span className={inWeek ? 'text-[#7a5a5a]' : 'text-[#8b8794]'}>{Number(d.slice(8, 10))}</span>
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
                    {/* Ảnh "chụp" cảnh quán dán kiểu polaroid, chữ của mục hôm nay chảy vòng quanh */}
                    {isToday && !filtered && (
                      <div aria-hidden className="relative float-right mb-3 ml-4 mt-1 w-[44%] max-w-[190px] rotate-[3deg] bg-white p-[7px] pb-[26px] shadow-[0_8px_14px_-8px_rgba(40,60,70,0.55),0_1px_2px_rgba(40,60,70,0.25)]">
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
                              <Compose open={open} onDone={onDone} onCancel={onCancel} />
                            ) : left > 0 ? (
                              <button
                                type="button"
                                onClick={onCompose}
                                className="group/write block w-full rounded-[10px] border-2 border-[#3a2a33] bg-white/75 px-3 pb-2 pt-1 text-left text-[#8b8794] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4574c]"
                              >
                                <span className="block border-b-2 border-dashed border-[#3a2a33]/55 leading-[30px] text-[#5d5866] group-hover/write:text-[#e4574c]">✎ {t.diary.write}…</span>
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

              <p className="break-inside-avoid text-[15px] leading-[24px] text-[#a7a2ae]">
                ☆ {t.diary.keeps}
                <br />☆ {t.diary.care}
              </p>
            </div>
          </div>

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
function Compose({open, onDone, onCancel}: {open: boolean; onDone: (note: MyNote) => void; onCancel: () => void}) {
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
        {t.diary.write}
      </label>
      <textarea
        id="chill-diary-text"
        ref={area}
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, NOTE_MAX))}
        maxLength={NOTE_MAX}
        rows={3}
        placeholder={t.diary.placeholder}
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
              className="min-w-0 flex-1 border-b bg-transparent py-0.5 text-[13px] outline-none"
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
