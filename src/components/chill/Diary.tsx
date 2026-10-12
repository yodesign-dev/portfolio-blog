'use client'

// Bảng nhật ký của quán (/chill): mỗi ngày mỗi khách viết tối đa 2 mẩu giấy tâm trạng.
// "Treo lên tường" thì cả quán đọc được trong 7 ngày (api/chill-diary), "cất vào sổ" thì
// chỉ nằm trên máy người viết. Xem diary-shared.ts.
//
// - Mẩu giấy ghim ở góc trái trên cảnh (từ sm trở lên): câu của quán hôm nay + số mẩu —
//   bấm vào là mở bảng. Điện thoại chật nên chỉ có nút tròn ở hàng nút góc phải dưới.
// - Bảng: mỗi ngày 1 sợi dây, giấy kẹp lệch nhau, màu theo tâm trạng, càng cũ càng ngả
//   vàng. Không tim, không xếp hạng, không cuộn vô tận — cố ý không giống danh sách bài.
// - Mặc định xem "Hôm nay" (vắng thì kèm sợi dây hôm qua cho đỡ trống), đổi được sang
//   "Tuần này"; lọc thêm theo tâm trạng.
// - Studio tắt "Mở bảng nhật ký" (mặc định) thì component này không hiện gì.

import Script from 'next/script'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {PixelIcon, TOKEN_CLASS, TokenChip, TokenLabel, TokenNewDot} from './pixel-icons'
import {trackEvent} from '@/lib/analytics'
import {useLang, useT} from './i18n'
import {KEEP_DAYS, MOODS, NOTE_MAX, NOTE_MIN, NOTES_PER_DAY, cafeNoteOf, dayOf, recentDays, type DiaryNote, type Mood} from './diary-shared'

const STORE_KEY = 'chill:diary'
// Cùng danh tính với phòng chat (ChillChat tạo lần đầu)
const ME_KEY = 'chill:chat-me'
// Sổ riêng giữ tối đa bấy nhiêu mẩu gần nhất
const BOOK_MAX = 400
// "Hôm nay" ít hơn ngần này mẩu thì hiện kèm sợi dây hôm qua cho bảng đỡ trống
const QUIET_DAY = 6

type Kind = 'wall' | 'book'
type MyNote = DiaryNote & {kind: Kind}
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
const KRAFT = {bg: '#dcbd8f', ink: '#3a2412', soft: '#7a5632'}

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

// Góc nghiêng cố định theo id (−3°…3°) — mẩu nào cũng lệch 1 kiểu, tải lại không nhảy
function tiltOf(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return ((Math.abs(h) % 61) - 30) / 10
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
  const [range, setRange] = useState<'today' | 'week'>('today')
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
    const byId = new Map<string, DiaryNote & {kind?: Kind; mine?: boolean}>()
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
  const shown = notes.filter((n) => !mood || n.mood === mood)
  const todayShown = shown.filter((n) => n.day === today)
  const visibleDays = range === 'week' ? days : todayShown.length < QUIET_DAY ? days.slice(0, 2) : days.slice(0, 1)
  const dayLabel = (i: number) => (i === 0 ? t.diary.dayToday : i === 1 ? t.diary.dayYesterday : t.diary.daysAgo(i))

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

      {/* Mẩu giấy của quán ghim trên khung cửa — vừa là lời chào đầu ngày, vừa là lối vào bảng */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${t.diary.title}: ${cafeText}`}
        className={`absolute left-5 top-[4.75rem] z-10 hidden w-[196px] -rotate-2 px-3 pb-2.5 pt-4 text-left shadow-[0_10px_24px_-10px_rgba(0,0,0,0.8)] transition duration-300 hover:rotate-0 hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] sm:block ${
          hidden || open || slipHidden ? 'pointer-events-none -translate-y-1 opacity-0' : dimmed ? 'opacity-60 hover:opacity-100' : 'opacity-100'
        }`}
        style={{background: KRAFT.bg, color: KRAFT.ink}}
      >
        <Peg />
        <span className="line-clamp-3 block text-[13px] font-medium leading-snug">{cafeText}</span>
        <span className="mt-1.5 block text-[11px]" style={{color: KRAFT.soft}}>
          🐾 {t.diary.cat}
        </span>
        <span className="mt-0.5 block text-right text-[11px] font-semibold">{t.diary.slipCount(todayCount)}</span>
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
          <div role="radiogroup" aria-label={t.diary.filterAria} className="flex rounded-full border border-white/10 p-0.5">
            {(['today', 'week'] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={range === r}
                onClick={() => setRange(r)}
                className={`rounded-full px-3 py-1 text-[13px] transition focus-visible:outline-2 focus-visible:outline-[#e8b27d] ${
                  range === r ? 'bg-[#e8b27d] font-semibold text-[#2a1a10]' : 'text-[#c9c0b6] hover:text-[#ede6dd]'
                }`}
              >
                {t.diary[r]}
              </button>
            ))}
          </div>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-2 sm:px-7">
          {visibleDays.map((day, i) => {
            const list = shown.filter((n) => n.day === day)
            const isToday = day === today
            // Hôm qua hiện kèm lúc quán vắng → nhạt hơn để biết không phải của hôm nay
            const faded = range === 'today' && !isToday
            if (!isToday && list.length === 0) return null
            return (
              <section key={day} aria-label={dayLabel(i)} className={`pt-5 ${faded ? 'opacity-70' : ''}`}>
                <h3 className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#e8b27d]">
                  {dayLabel(i)}
                  <span className="text-[#8a8177]">{list.length > 0 ? list.length : ''}</span>
                </h3>
                {/* Sợi dây: mẩu giấy kẹp ngay dưới, mỗi mẩu lệch 1 kiểu */}
                <div aria-hidden className="h-px bg-[#b98a52]/70" />
                <ul className="flex flex-wrap items-start gap-x-3 gap-y-4 px-1">
                  {isToday && !mood && (
                    <li>
                      <Slip paper={KRAFT} tilt={-1.5} age={0}>
                        <p className="text-[14px] font-medium leading-snug">{cafeText}</p>
                        <p className="mt-2 text-[11px]" style={{color: KRAFT.soft}}>
                          🐾 {t.diary.cat}
                        </p>
                      </Slip>
                    </li>
                  )}
                  {list.map((n) => (
                    <li key={n.id}>
                      <Slip paper={PAPER[n.mood]} tilt={tiltOf(n.id)} age={i}>
                        <NoteBody note={n} onReport={report} onRemove={removeMine} />
                      </Slip>
                    </li>
                  ))}
                  {isToday && (
                    <li className={composing ? 'w-full sm:w-auto' : ''}>
                      {composing ? (
                        <Compose open={open} onDone={addMine} onCancel={() => setComposing(false)} />
                      ) : left > 0 ? (
                        <button
                          type="button"
                          onClick={() => setComposing(true)}
                          className="relative mt-1.5 flex h-[104px] w-[150px] rotate-1 flex-col items-center justify-center gap-1 border border-dashed border-[#e8b27d]/50 bg-white/[0.03] px-3 text-center text-[#f3cfa8] transition hover:rotate-0 hover:border-[#e8b27d] hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
                        >
                          <span className="text-sm font-semibold">✎ {t.diary.write}</span>
                          <span className="text-[11px] text-[#a79e94]">{t.diary.left(left)}</span>
                        </button>
                      ) : (
                        <p className="mt-1.5 flex h-[104px] w-[170px] items-center border border-dashed border-white/15 px-3 text-center text-xs leading-relaxed text-[#a79e94]">
                          {t.diary.noneLeft}
                        </p>
                      )}
                    </li>
                  )}
                </ul>
                {isToday && list.length === 0 && mood && <p className="mt-4 px-1 text-sm text-[#a79e94]">{t.diary.emptyMood}</p>}
              </section>
            )
          })}
          <p className="mt-8 px-1 text-xs leading-relaxed text-[#8a8177]">
            {t.diary.keeps} {t.diary.care}
          </p>
        </div>
      </section>
    </>
  )
}

// Kẹp gỗ giữ mẩu giấy trên dây
function Peg() {
  return <span aria-hidden className="absolute left-1/2 top-[-5px] h-[15px] w-[9px] -translate-x-1/2 rounded-[2px] border border-[#6b3f22] bg-[#d9a15c]" />
}

// 1 mẩu giấy: nghiêng theo `tilt`, càng cũ (age = số ngày) càng ngả vàng
function Slip({paper, tilt, age, children}: {paper: {bg: string; ink: string}; tilt: number; age: number; children: React.ReactNode}) {
  return (
    <div
      className="group/slip relative mt-1.5 w-[150px] px-3 pb-2.5 pt-4 shadow-[0_8px_18px_-10px_rgba(0,0,0,0.85)] transition-transform duration-200 hover:z-10 hover:scale-[1.04] sm:w-[168px]"
      style={{background: paper.bg, color: paper.ink, transform: `rotate(${tilt}deg)`, filter: age > 0 ? `sepia(${Math.min(0.6, age * 0.1)}) brightness(${1 - Math.min(0.18, age * 0.03)})` : undefined}}
    >
      <Peg />
      {children}
    </div>
  )
}

function NoteBody({
  note,
  onReport,
  onRemove,
}: {
  note: DiaryNote & {kind?: Kind; mine?: boolean}
  onReport: (id: string) => void
  onRemove: (id: string) => void
}) {
  const t = useT()
  const [asking, setAsking] = useState(false)
  const paper = PAPER[note.mood]
  const time = new Date(note.ts).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh'})
  return (
    <>
      <p className="whitespace-pre-wrap break-words text-[14px] leading-snug">{note.text}</p>
      <p className="mt-2 flex items-center justify-between gap-2 text-[11px]" style={{color: paper.soft}}>
        <span className="truncate">
          {MOOD_ICON[note.mood]} {t.diary.moods[note.mood]}
        </span>
        <span className="shrink-0 tabular-nums">{time}</span>
      </p>
      <p className="mt-0.5 flex min-h-[18px] items-center justify-between gap-2 text-[11px]" style={{color: paper.soft}}>
        <span className="truncate">{note.kind === 'book' ? `🔒 ${t.diary.onlyHere}` : note.mine ? t.diary.mine : note.name}</span>
        {note.kind === 'book' ? (
          <button type="button" onClick={() => onRemove(note.id)} aria-label={t.diary.remove} title={t.diary.remove} className="shrink-0 px-1 opacity-60 hover:opacity-100 focus-visible:opacity-100">
            ✕
          </button>
        ) : note.mine ? null : asking ? (
          <span className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={() => onReport(note.id)} className="font-semibold underline underline-offset-2">
              {t.diary.reportYes}
            </button>
            <button type="button" onClick={() => setAsking(false)} className="opacity-70">
              {t.diary.cancel}
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAsking(true)}
            aria-label={t.diary.report}
            title={t.diary.report}
            className="shrink-0 px-1 opacity-0 transition group-hover/slip:opacity-60 hover:!opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-50"
          >
            ⚑
          </button>
        )}
      </p>
    </>
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
    area.current?.focus()
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
    <form onSubmit={send} className="relative mt-1.5 w-full px-3.5 pb-3 pt-4 shadow-[0_8px_18px_-10px_rgba(0,0,0,0.85)] sm:w-[340px]" style={{background: paper.bg, color: paper.ink}}>
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
