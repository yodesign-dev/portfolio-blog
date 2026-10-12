'use client'

// Wishlist trang /chill: người xem gợi ý tính năng / nhạc / điểm đến cho quán,
// thả ❤️ cho ý tưởng người khác. Góp ý mới chờ Bin duyệt trong Studio rồi mới
// hiện (xem src/app/api/chill-wish/route.ts).
//
// Nút mở là pill nổi góc phải dưới (luôn thấy, kể cả lúc giao diện tự ẩn — chỉ
// mờ bớt), có badge số ý tưởng. Lần đầu vào trang: vòng sáng lan ra + lời mời.

import Script from 'next/script'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {PixelIcon, TOKEN_CLASS, TokenChip, TokenLabel} from './pixel-icons'
import {trackEvent} from '@/lib/analytics'
import {Donate} from './Donate'
import {hasDonate, loadIntent, saveIntent} from './donate-config'
import {tServer, useLang, useT, type Lang} from './i18n'

type Wish = {
  id: string
  text: string
  category: string
  name: string
  createdAt: string
  hearts: number
  status: string
  reply?: string
}

const CATEGORIES = [
  {value: 'feature', icon: '💡'},
  {value: 'music', icon: '🎵'},
  {value: 'place', icon: '📍'},
  {value: 'bug', icon: '🐞'},
  {value: 'other', icon: '💬'},
]

// Nhãn "chờ duyệt" (t.wish.pending) cho góp ý của chính mình
const PENDING_CLASS = 'border-white/15 text-[#a79e94]'

// Tab = trạng thái Bin đặt trong Studio; trong mỗi tab xếp theo ❤️ rồi mới nhất
type Tab = 'considering' | 'planned' | 'shipped'
const TABS: Tab[] = ['considering', 'planned', 'shipped']

const AVATAR_BG = ['#f6d2bd', '#f7e2a0', '#fbf1d2', '#d5e8d4', '#d7dcf5', '#f4c7d0']
const HEARTS_KEY = 'chill:wish-hearts'
const MINE_KEY = 'chill:my-wishes'
const SEEN_KEY = 'chill:wish-seen'
// Số lần đã hiện lời mời "Got an idea…" — chỉ mời vài lần đầu, mỗi lần vài giây
// Chỉ tự mở lại bước QR nếu người xem vừa rời trang chưa lâu
const REOPEN_WITHIN = 30 * 60 * 1000
const HINT_KEY = 'chill:wish-hint'
const HINT_TIMES = 3
const HINT_DELAY = 2000
const HINT_MS = 7000
const MAX = 300

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Chặn storage — chỉ mất phần "nhớ", tính năng vẫn chạy
  }
}

function ago(iso: string, t: ReturnType<typeof useT>, lang: Lang) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return t.wish.agoNow
  if (s < 3600) return t.wish.agoMin(Math.floor(s / 60))
  if (s < 86400) return t.wish.agoHour(Math.floor(s / 3600))
  if (s < 86400 * 30) return t.wish.agoDay(Math.floor(s / 86400))
  return new Date(iso).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en', lang === 'vi' ? {month: 'numeric', day: 'numeric'} : {month: 'short', day: 'numeric'})
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

export function Wishlist({
  open,
  onOpenChange,
  dimmed,
  hidden,
  context,
  onThanks,
  donateRequest,
  slot,
  ready = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Giao diện đang tự ẩn → pill mờ đi nhưng vẫn thấy
  dimmed: boolean
  // Bảng cài đặt đang mở → nhường chỗ
  hidden: boolean
  // Bối cảnh gửi kèm (điểm đến, giờ, thời tiết, bài nhạc)
  context: string
  // Người xem bấm "đã chuyển" ở màn donate → cảnh ăn mừng (mèo gừ gừ, tim bay)
  onThanks: () => void
  // Tăng lên mỗi lần nơi khác (bảng cảm ơn) muốn mở thẳng màn "mời Bin 1 ly"
  donateRequest: number
  // Ô trong hàng nút góc phải dưới (Wishlist · Mời bạn · Chat) — nút mở được đặt vào đây
  slot: HTMLElement | null
  // Chưa qua màn chào → chưa hiện lời mời lần đầu (nút còn đang ẩn)
  ready?: boolean
}) {
  const t = useT()
  const [wishes, setWishes] = useState<Wish[]>([])
  const [loaded, setLoaded] = useState(false)
  const [mine, setMine] = useState<Wish[]>([])
  const [hearted, setHearted] = useState<string[]>([])
  const [seen, setSeen] = useState(true)
  const [hint, setHint] = useState(false)
  const [tab, setTab] = useState<Tab>('considering')
  // Người xem đã tự chọn tab (hoặc vừa gửi góp ý) → thôi tự chuyển
  const tabPicked = useRef(false)
  const [view, setView] = useState<'wishes' | 'donate'>('wishes')
  const donate = hasDonate()
  const showDonate = () => {
    setView('donate')
    trackEvent({name: 'Chill Donate Open'})
  }

  useEffect(() => {
    if (!donateRequest || !hasDonate()) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView('donate')
    trackEvent({name: 'Chill Donate Open', props: {from: 'board'}})
  }, [donateRequest])

  // Đang ủng hộ dở (vừa sang app ngân hàng, trang tải lại) → mở lại đúng bước QR,
  // nhưng chỉ 1 lần và chỉ trong 30 phút — không bật panel mỗi lần vào trang.
  // Mở Wishlist → "Mời Bin 1 ly" thủ công thì vẫn về đúng bước QR (Donate tự đọc intent).
  const reopen = useRef(onOpenChange)
  useEffect(() => {
    const intent = hasDonate() ? loadIntent() : null
    if (!intent || intent.reopened || Date.now() - intent.at > REOPEN_WITHIN) return
    saveIntent({...intent, reopened: true})
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView('donate')
    reopen.current(true)
  }, [])

  const refresh = useCallback(() => {
    fetch('/api/chill-wish')
      .then((r) => r.json())
      .then((d: {wishes?: Wish[]}) => setWishes(d.wishes ?? []))
      .catch(() => {})
      .finally(() => setLoaded(true))
    // Góp ý mình gửi mà Bin đã ẩn / xoá thì bỏ bản "Awaiting review" trên máy mình
    const local = load<Wish[]>(MINE_KEY, [])
    if (!local.length) return
    fetch(`/api/chill-wish?mine=${local.map((w) => w.id).join(',')}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: {statuses?: Record<string, string>} | null) => {
        if (!d?.statuses) return
        const keep = local.filter((w) => {
          const status = d.statuses![w.id]
          return status !== 'hidden' && status !== 'deleted'
        })
        if (keep.length === local.length) return
        setMine(keep)
        save(MINE_KEY, keep)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setMine(load<Wish[]>(MINE_KEY, []))
    setHearted(load<string[]>(HEARTS_KEY, []))
    setSeen(load<boolean>(SEEN_KEY, false))
    /* eslint-enable react-hooks/set-state-in-effect */
    refresh()
  }, [refresh])

  // Lời mời: hiện sau 2s, tự ẩn sau 7s, tối đa 3 lần vào trang (chưa từng mở Wishlist)
  useEffect(() => {
    if (seen || !ready) return
    const shown = load<number>(HINT_KEY, 0)
    if (shown >= HINT_TIMES) return
    save(HINT_KEY, shown + 1)
    const on = window.setTimeout(() => setHint(true), HINT_DELAY)
    const off = window.setTimeout(() => setHint(false), HINT_DELAY + HINT_MS)
    return () => {
      window.clearTimeout(on)
      window.clearTimeout(off)
    }
  }, [seen, ready])

  useEffect(() => {
    if (!open) return
    refresh()
    if (!seen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeen(true)
      save(SEEN_KEY, true)
    }
  }, [open, seen, refresh])

  // Esc đóng
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onOpenChange(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  // Góp ý của chính mình đang chờ duyệt: hiện ở đầu danh sách (chỉ trên máy mình)
  const pendingMine = useMemo(() => mine.filter((m) => !wishes.some((w) => w.id === m.id)), [mine, wishes])

  const list = useMemo(() => {
    const byNew = (a: Wish, b: Wish) => b.createdAt.localeCompare(a.createdAt)
    const sorted = wishes.filter((w) => w.status === tab).sort((a, b) => b.hearts - a.hearts || byNew(a, b))
    // Góp ý của mình đang chờ duyệt hiện đầu tab Considering
    return tab === 'considering' ? [...pendingMine, ...sorted] : sorted
  }, [wishes, pendingMine, tab])
  const tabCount = (tb: Tab) => wishes.filter((w) => w.status === tb).length + (tb === 'considering' ? pendingMine.length : 0)
  // Mở ra ở tab đầu tiên có nội dung (Considering → Planned → Shipped) thay vì 1 tab trống
  const firstFilled = TABS.find((tb) => wishes.some((w) => w.status === tb) || (tb === 'considering' && pendingMine.length > 0))
  useEffect(() => {
    if (!loaded || tabPicked.current || !firstFilled) return
    setTab(firstFilled)
  }, [loaded, firstFilled])
  const pickTab = (tb: Tab) => {
    tabPicked.current = true
    setTab(tb)
  }

  const toggleHeart = (w: Wish) => {
    const on = !hearted.includes(w.id)
    const next = on ? [...hearted, w.id] : hearted.filter((id) => id !== w.id)
    setHearted(next)
    save(HEARTS_KEY, next)
    setWishes((all) => all.map((x) => (x.id === w.id ? {...x, hearts: Math.max(0, x.hearts + (on ? 1 : -1))} : x)))
    void fetch('/api/chill-wish', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'heart', id: w.id, on}),
    }).catch(() => {})
  }

  const onSent = (w: Wish) => {
    const next = [w, ...mine].slice(0, 20)
    setMine(next)
    save(MINE_KEY, next)
    pickTab('considering')
  }

  const count = wishes.filter((w) => w.status !== 'shipped').length + pendingMine.length

  return (
    <>
      {/* Nút mở: pill trong hàng nút góc phải dưới (ChillRoom: dock xã hội), luôn thấy */}
      {slot &&
        createPortal(
          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            aria-expanded={open}
            aria-controls="chill-wishlist"
            aria-label={t.wish.openAria(count)}
            title={t.wish.openTitle}
            className={`${TOKEN_CLASS} ${open ? 'border-[#e8b27d]/60' : 'border-white/[0.13]'} ${
              hidden || open ? 'pointer-events-none translate-y-2 opacity-0' : dimmed ? 'opacity-60 hover:opacity-100' : 'opacity-100'
            }`}
          >
            {/* Lần đầu: vòng sáng lan ra để mắt chú ý tới */}
            {hint && !open && (
              <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#f08a5d]/60 motion-safe:animate-ping motion-safe:[animation-duration:2.2s]" />
            )}
            <PixelIcon name="bulb" />
            {loaded && count > 0 && <TokenChip>{count}</TokenChip>}
            <TokenLabel>{t.wish.label}</TokenLabel>
          </button>,
          slot,
        )}

      {/* Lời mời lần đầu, cạnh nút */}
      {!seen && !open && !hidden && (
        <p
          aria-hidden
          className={`pointer-events-none absolute right-3 z-30 transition-opacity duration-500 ${hint ? 'opacity-100' : 'opacity-0'} rounded-lg border border-[#e8b27d]/30 bg-black/65 px-3 py-1.5 text-xs text-[#f3cfa8] backdrop-blur ${
            'bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+160px)] sm:right-5 sm:bottom-[180px] lg:bottom-[196px]'
          }`}
        >
          {t.wish.invite}
        </p>
      )}

      <section
        id="chill-wishlist"
        role="dialog"
        aria-label={t.wish.title}
        inert={!open}
        className={`absolute inset-x-0 bottom-0 z-40 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl border border-white/12 bg-[#1b1a21]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all duration-300 ease-out lg:inset-x-auto lg:bottom-5 lg:right-5 lg:max-h-[min(680px,calc(100dvh-96px))] lg:w-[410px] lg:rounded-3xl ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
        }`}
      >
        {/* Đầu bảng chỉ có tiêu đề (1 dòng, dài thì cắt "…") + nút ly cà phê + nút đóng — chữ
            tiếng Việt dài hơn tiếng Anh nên không nhét thêm nhãn / số đếm vào hàng này
            (số đếm đã có trên từng tab) */}
        <header className="flex items-center gap-2 border-b border-white/[0.07] px-5 py-4">
          {view === 'donate' ? (
            <>
              <button
                type="button"
                onClick={() => setView('wishes')}
                aria-label={t.wish.backAria}
                className="-ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-[#c9c0b6] hover:bg-white/[0.06] hover:text-[#ede6dd]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <h2 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-[#f3ece4]">{t.wish.buyCoffee} ☕</h2>
            </>
          ) : (
            <h2 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-[#f3ece4]">{t.wish.title}</h2>
          )}
          {donate && view === 'wishes' && (
            <button
              type="button"
              onClick={showDonate}
              aria-label={t.wish.buyCoffee}
              title={t.wish.buyCoffee}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e8b27d]/40 bg-[#e8b27d]/10 text-base text-[#f3cfa8] transition hover:bg-[#e8b27d]/20 focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
            >
              <SteamingCup />
              <Sparkles />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={t.wish.close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#ede6dd] transition hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {view === 'donate' ? (
          <Donate onThanks={onThanks} context={context} />
        ) : (
          <>
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap px-5 pt-3 [scrollbar-width:none]" role="tablist" aria-label={t.wish.tabsAria}>
              {TABS.map((tb) => (
                <button
                  key={tb}
                  type="button"
                  role="tab"
                  aria-selected={tab === tb}
                  onClick={() => pickTab(tb)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] outline-none transition focus-visible:ring-2 focus-visible:ring-[#e8b27d]/70 ${
                    tab === tb ? 'bg-[#e8b27d]/15 text-[#f3cfa8]' : 'text-[#a79e94] hover:text-[#ede6dd]'
                  }`}
                >
                  {t.wish.tabs[tb]}
                  {tabCount(tb) > 0 && <span className="tabular-nums opacity-70">{tabCount(tb)}</span>}
                </button>
              ))}
            </div>

            <ol className="min-h-40 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
              {list.length === 0 && (
                <li className="py-10 text-center text-sm text-[#a79e94]">
                  {!loaded
                    ? t.wish.brewing
                    : tab === 'shipped'
                      ? t.wish.emptyShipped
                      : tab === 'planned'
                        ? t.wish.emptyPlanned
                        : t.wish.emptyConsidering}
                </li>
              )}
              {list.map((w) => (
                <WishItem key={w.id} wish={w} hearted={hearted.includes(w.id)} onHeart={() => toggleHeart(w)} />
              ))}
            </ol>

            <Composer open={open} context={context} onSent={onSent} />
          </>
        )}
      </section>
    </>
  )
}

// Tách cà phê bốc hơi + thỉnh thoảng nghiêng (luôn chạy, trừ khi giảm chuyển động)
function SteamingCup({className = ''}: {className?: string}) {
  return (
    <span aria-hidden className={`relative inline-flex ${className}`}>
      <span className="chill-cup">☕</span>
      {[0, 0.7, 1.4].map((delay, i) => (
        <span
          key={delay}
          className="chill-steam absolute bottom-[80%] h-[0.45em] w-[2px] rounded-full bg-[#f3cfa8]"
          style={{left: `${28 + i * 16}%`, animationDelay: `${delay}s`}}
        />
      ))}
    </span>
  )
}

// 2 ngôi sao nhỏ lấp lánh thay phiên ở góc nút
function Sparkles() {
  return (
    <>
      <span aria-hidden className="chill-twinkle pointer-events-none absolute -left-1 -top-2 text-[11px] text-[#ffe3b8]" style={{animationDelay: '0.3s'}}>
        ✦
      </span>
      <span aria-hidden className="chill-twinkle pointer-events-none absolute -bottom-2 right-3 text-[10px] text-[#ffe3b8]" style={{animationDelay: '1.5s'}}>
        ✦
      </span>
    </>
  )
}

function WishItem({wish: w, hearted, onHeart}: {wish: Wish; hearted: boolean; onHeart: () => void}) {
  const t = useT()
  const lang = useLang()
  const cat = CATEGORIES.find((c) => c.value === w.category) ?? CATEGORIES[0]
  const name = w.name || t.wish.guest
  const pending = w.status === 'pending'
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[#2a1a10]"
        style={{background: AVATAR_BG[hash(name) % AVATAR_BG.length]}}
      >
        {name[0]!.toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold text-[#f3cf7a]">{name}</span>
          <span className="rounded border border-white/15 px-1.5 font-mono text-[10px] uppercase tracking-wider text-[#c9c0b6]">
            {cat.icon} {t.wish.categories[cat.value]}
          </span>
          <span className="font-mono text-[11px] text-[#8d857c]">{ago(w.createdAt, t, lang)}</span>
        </p>
        <p className={`mt-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[15px] leading-relaxed text-[#ede6dd] ${pending ? 'border-dashed opacity-80' : ''}`}>
          {w.text}
        </p>
        {w.reply && (
          <p className="mt-1.5 pl-1 text-sm text-[#e8b27d]">
            <span aria-hidden>☕ </span>
            <span className="font-semibold">Bin:</span> {w.reply}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          {!pending && (
            <button
              type="button"
              onClick={onHeart}
              aria-pressed={hearted}
              aria-label={t.wish.heartAria(hearted, w.hearts)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs tabular-nums transition ${
                hearted ? 'border-rose-400/50 bg-rose-400/15 text-rose-200' : 'border-white/10 text-[#c9c0b6] hover:border-rose-300/40 hover:text-rose-200'
              }`}
            >
              <span aria-hidden>{hearted ? '❤️' : '🤍'}</span>
              {w.hearts}
            </button>
          )}
          {/* Trạng thái đã thể hiện qua tab — chỉ còn nhãn "chờ duyệt" cho góp ý của chính mình */}
          {pending && <span className={`rounded-full border px-2 py-0.5 text-[11px] ${PENDING_CLASS}`}>{t.wish.pending}</span>}
        </div>
      </div>
    </li>
  )
}

// Ô nhập góp ý: gõ vào thì mới mở thêm tên / email (không bắt buộc) + captcha
function Composer({open, context, onSent}: {open: boolean; context: string; onSent: (w: Wish) => void}) {
  const t = useT()
  const lang = useLang()
  const [text, setText] = useState('')
  const [category, setCategory] = useState('feature')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<string | undefined>(undefined)
  const expanded = text.trim().length > 0

  useEffect(() => {
    // Script có thể đã tải sẵn (form Contact) → dùng luôn
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.turnstile) setScriptReady(true)
  }, [expanded])

  useEffect(() => {
    if (!open || !expanded || !scriptReady || !box.current || !window.turnstile) return
    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!sitekey) return
    widget.current = window.turnstile.render(box.current, {
      sitekey,
      callback: (t: string) => {
        setToken(t)
        setError('')
      },
      'error-callback': () => {
        setToken(null)
        setError(t.wish.captchaError)
      },
    })
    return () => {
      if (window.turnstile && widget.current) window.turnstile.remove(widget.current)
      widget.current = undefined
      setToken(null)
    }
  }, [open, expanded, scriptReady, t])

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (state === 'sending') return
    setState('sending')
    setError('')
    try {
      const res = await fetch('/api/chill-wish', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'submit', text, category, name, email, context, captchaToken: token, company}),
      })
      const data = (await res.json()) as {id?: string | null; error?: string}
      if (!res.ok) throw new Error(data.error ? tServer(data.error, lang) : t.wish.sendError)
      if (data.id) {
        onSent({id: data.id, text: text.trim(), category, name: name.trim(), createdAt: new Date().toISOString(), hearts: 0, status: 'pending'})
      }
      setText('')
      setState('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.wish.sendError)
      setState('idle')
      if (window.turnstile && widget.current) window.turnstile.reset(widget.current)
      setToken(null)
    }
  }

  const canSend = text.trim().length >= 5 && !!token && state !== 'sending'

  return (
    <form onSubmit={send} className="border-t border-white/[0.07] bg-black/20 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
      {expanded && (
        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" onReady={() => setScriptReady(true)} />
      )}
      {state === 'sent' && !expanded && (
        <p role="status" className="mb-2 rounded-xl bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
          {t.wish.thanks}
        </p>
      )}
      <div className="mb-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none]" role="radiogroup" aria-label={t.wish.typeAria}>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={category === c.value}
            onClick={() => setCategory(c.value)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs transition ${
              category === c.value ? 'border-[#e8b27d]/60 bg-[#e8b27d]/15 text-[#f3cfa8]' : 'border-white/10 text-[#a79e94] hover:text-[#ede6dd]'
            }`}
          >
            {c.icon} {t.wish.categories[c.value]}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <label className="relative flex-1">
          <span className="sr-only">{t.wish.yourWish}</span>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value.slice(0, MAX))
              if (state === 'sent') setState('idle')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && canSend) {
                e.preventDefault()
                e.currentTarget.form?.requestSubmit()
              }
            }}
            rows={expanded ? 3 : 1}
            placeholder={t.wish.placeholder}
            className="block w-full resize-none rounded-3xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[15px] text-[#ede6dd] placeholder:text-[#8d857c] focus:border-[#e8b27d]/50 focus:outline-none"
          />
          {expanded && <span className="pointer-events-none absolute bottom-2 right-4 font-mono text-[10px] text-[#8d857c]">{text.length}/{MAX}</span>}
        </label>
        <button
          type="submit"
          disabled={!canSend}
          aria-label={t.wish.sendAria}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e8b27d] text-[#2a1a10] transition hover:bg-[#f0c294] disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
        >
          {state === 'sending' ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2a1a10]/30 border-t-[#2a1a10]" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M2 8h11M9 3.5L13.5 8 9 12.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
      {expanded && (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 30))}
              placeholder={t.wish.name}
              aria-label={t.wish.nameAria}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#ede6dd] placeholder:text-[#8d857c] focus:border-[#e8b27d]/50 focus:outline-none"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.slice(0, 120))}
              placeholder={t.wish.email}
              aria-label={t.wish.emailAria}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#ede6dd] placeholder:text-[#8d857c] focus:border-[#e8b27d]/50 focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-[#8d857c]">{t.wish.emailNote}</p>
          {/* Honeypot: người thật không thấy field này */}
          <input
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />
          <div ref={box} className="min-h-[65px]" />
          {!token && !error && text.trim().length >= 5 && (
            <p className="text-[11px] text-[#8d857c]">{t.wish.checking}</p>
          )}
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
        </div>
      )}
    </form>
  )
}
