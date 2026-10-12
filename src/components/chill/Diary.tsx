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

import {Patrick_Hand} from 'next/font/google'
import Script from 'next/script'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {PixelIcon, TOKEN_CLASS, TokenChip, TokenLabel, TokenNewDot} from './pixel-icons'
import {trackEvent} from '@/lib/analytics'
import {useLang, useT} from './i18n'
import {KEEP_DAYS, MOODS, NOTE_MAX, NOTE_MIN, NOTES_PER_DAY, cafeNoteOf, dayOf, recentDays, type DiaryNote, type Mood} from './diary-shared'

// Chữ viết tay cho cuốn sổ (có dấu tiếng Việt). Chỉ tải khi mở sổ, không preload cho cả trang
const hand = Patrick_Hand({weight: '400', subsets: ['latin', 'vietnamese'], display: 'swap', preload: false})

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

// Kẹp gỗ giữ mẩu giấy trên dây
function Peg() {
  return <span aria-hidden className="absolute left-1/2 top-[-5px] h-[15px] w-[9px] -translate-x-1/2 rounded-[2px] border border-[#6b3f22] bg-[#d9a15c]" />
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
    const ro = new ResizeObserver(() => setBox({w: el.clientWidth, h: el.clientHeight}))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Kích thước sổ: 2 trang khi đủ rộng. Mọi số đo bám theo ô kẻ 24px để chữ nằm trên dòng
  const two = box.w >= 760
  const per = two ? 2 : 1
  const W = Math.floor(Math.min(box.w, two ? 1010 : 470))
  const H = Math.floor(Math.max(340, Math.min(box.h - (two ? 34 : 6), 672)))
  const padR = two ? 36 : 22
  // 1 trang: lò xo nằm mép trái nên lề trái rộng hơn
  const padL = two ? 36 : 40
  const gap = two ? 104 : padL + padR
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
  const dayList = days.filter((d) => d === today || has(d))

  const grid = {
    backgroundColor: '#fbf7ea',
    backgroundImage: 'linear-gradient(rgba(70,96,120,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(70,96,120,0.13) 1px, transparent 1px)',
    backgroundSize: '24px 24px',
    backgroundPosition: `${padL % 24}px ${(padT + 4) % 24}px`,
  }
  const rings = Math.max(4, Math.floor((H - 40) / 30))

  return (
    <div ref={wrap} className={`flex min-h-0 flex-1 items-center justify-center px-2 pb-2 sm:px-6 ${hand.className}`}>
      {box.w > 0 && (
        <div
          className="relative shrink-0 text-[#2c2a33] drop-shadow-[0_18px_28px_rgba(0,0,0,0.55)]"
          style={{width: W, height: H}}
          onPointerDown={(e) => (swipe.current = e.pointerType === 'mouse' ? null : e.clientX)}
          onPointerUp={(e) => {
            const from = swipe.current
            swipe.current = null
            if (from === null || Math.abs(e.clientX - from) < 56) return
            setSpread((s) => (e.clientX < from ? Math.min(s + 1, spreads - 1) : Math.max(s - 1, 0)))
          }}
        >
          {/* Cây bút nằm phía trên sổ */}
          {two && (
            <div aria-hidden className="absolute -top-[30px] left-[30%] flex h-[18px] w-[320px] -rotate-2 items-center drop-shadow-[0_6px_6px_rgba(0,0,0,0.4)]">
              <span className="h-full w-[92px] rounded-l-full bg-[#e9655a]" />
              <span className="h-full flex-1 bg-[#f5f1ea]" />
              <span className="h-[12px] w-[26px] rounded-r-full bg-[#f5f1ea]" />
            </div>
          )}

          {/* Giấy: kẻ ô, bo góc ngoài; 2 trang thì có rãnh gáy sổ ở giữa */}
          {/* overflow-clip chứ không phải hidden: ô đang gõ nhận focus cũng không kéo lệch trang */}
          <div className="absolute inset-0 overflow-clip rounded-[14px]" style={grid}>
            {two && <div aria-hidden className="absolute inset-y-0 left-1/2 w-[70px] -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(40,30,20,0.16)_35%,rgba(40,30,20,0.28)_50%,rgba(40,30,20,0.16)_65%,transparent)]" />}

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
                fontSize: 19,
                lineHeight: '24px',
              }}
            >
              {/* Trang bìa trong: tháng, tuần này, 7 ngày, mẩu của mèo quán */}
              <div className="break-inside-avoid pb-6">
                <p className="text-[46px] leading-[48px] text-[#e4574c] [-webkit-text-stroke:1px_#2c2a33] [paint-order:stroke_fill]">{cap(fmt(today, {month: 'long'}))}</p>
                <p className="mt-[10px] inline-block -rotate-1 bg-[#f6b7ae] px-2 text-[18px] leading-[24px] text-[#7a2a23]">{t.diary.week}</p>
                <ol className="mt-[14px] grid grid-cols-7 gap-1 text-center">
                  {[...days].reverse().map((d) => (
                    <li key={d}>
                      <button
                        type="button"
                        onClick={() => jumpTo(dayList.includes(d) ? d : today)}
                        disabled={!dayList.includes(d)}
                        aria-label={cap(fmt(d, {weekday: 'long', day: 'numeric', month: 'long'}))}
                        className="group/day flex w-full flex-col items-center leading-[20px] disabled:opacity-45"
                      >
                        <span className="text-[13px] text-[#8b8794]">{cap(fmt(d, {weekday: 'short'}))}</span>
                        <span className={`flex h-[26px] w-[26px] items-center justify-center rounded-full text-[17px] ${d === today ? 'bg-[#e4574c] text-white' : 'group-enabled/day:group-hover/day:bg-[#f6b7ae]/70'}`}>
                          {Number(d.slice(8, 10))}
                        </span>
                        <span aria-hidden className={`mt-0.5 h-[5px] w-[5px] rounded-full ${has(d) ? 'bg-[#e4574c]' : 'bg-transparent'}`} />
                      </button>
                    </li>
                  ))}
                </ol>
                {!filtered && (
                  <div className="relative mx-auto mt-[22px] w-[88%] rotate-[-2.5deg] bg-[#f8c9cf] px-3.5 pb-3 pt-4 text-[#5a2530] shadow-[2px_3px_0_rgba(60,30,30,0.18)]">
                    <span aria-hidden className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-2 bg-[#fff6c9]/85" />
                    <p className="text-[19px] leading-[24px]">{cafeText}</p>
                    <p className="mt-1 text-[15px] leading-[20px] text-[#a15a6a]">🐾 {t.diary.cat}</p>
                  </div>
                )}
              </div>

              {dayList.map((day) => {
                const list = notes.filter((n) => n.day === day)
                const isToday = day === today
                return (
                  <section key={day} data-day={day} className="pb-6">
                    <h3 className="flex break-after-avoid items-center gap-2 text-[30px] leading-[48px] text-[#e4574c]">
                      <span aria-hidden className="text-[20px]">▸</span>
                      {cap(fmt(day, {weekday: 'long'}))}
                      <span className="flex h-[30px] min-w-[30px] items-center justify-center rounded-full bg-[#f49b8f] px-1 text-[19px] leading-none text-[#5a1c16]">{Number(day.slice(8, 10))}</span>
                      {isToday && <span className="text-[16px] text-[#8b8794]">· {t.diary.dayToday.toLowerCase()}</span>}
                    </h3>
                    <ul>
                      {list.map((n) => (
                        <li key={n.id} data-note className="group/line break-inside-avoid pb-[24px]">
                          <p className="flex gap-2">
                            <span aria-hidden className="shrink-0 text-[#e4574c]">•</span>
                            <span className={`min-w-0 whitespace-pre-wrap break-words ${n.kind === 'book' ? 'text-[#6d6a75]' : ''}`}>{n.text}</span>
                          </p>
                          <p className="flex items-center gap-2 pl-[18px] text-[15px] text-[#8b8794]">
                            <span className="px-1.5 text-[14px] leading-[20px]" style={{background: PAPER[n.mood].bg, color: PAPER[n.mood].ink}}>
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
                        <li className="break-inside-avoid pb-[24px]">
                          {composing ? (
                            <Compose open={open} onDone={onDone} onCancel={onCancel} />
                          ) : left > 0 ? (
                            <button type="button" onClick={onCompose} className="group/write flex w-full items-baseline gap-2 text-left text-[#b9b4c0] transition-colors hover:text-[#e4574c] focus-visible:outline-2 focus-visible:outline-[#e4574c]">
                              <span aria-hidden className="text-[#e4574c]">•</span>
                              <span className="border-b-2 border-dashed border-current">✎ {t.diary.write}…</span>
                              <span className="text-[15px] text-[#8b8794] group-hover/write:text-[#e4574c]">({t.diary.left(left).toLowerCase()})</span>
                            </button>
                          ) : (
                            <p className="text-[16px] text-[#8b8794]">{t.diary.noneLeft}</p>
                          )}
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

          {/* Lò xo: giữa sổ (2 trang) hoặc mép trái (1 trang) */}
          <div aria-hidden className="pointer-events-none absolute inset-y-[22px] flex flex-col justify-between" style={two ? {left: W / 2 - 23, width: 46} : {left: -9, width: 34}}>
            {Array.from({length: rings}).map((_, i) => (
              <span key={i} className="block h-[11px] w-full rounded-full border-[3px] border-[#2f5d73] bg-[linear-gradient(#5e93ab,#2f5d73)] shadow-[0_2px_2px_rgba(0,0,0,0.35)]" />
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
    <form onSubmit={send} className="relative mt-1.5 w-full rotate-[-0.6deg] px-3.5 pb-3 pt-4 text-[16px] leading-[22px] shadow-[2px_3px_0_rgba(60,30,30,0.18)]" style={{background: paper.bg, color: paper.ink}}>
      {!scriptReady && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" onReady={() => setScriptReady(true)} />}
      <Peg />
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
