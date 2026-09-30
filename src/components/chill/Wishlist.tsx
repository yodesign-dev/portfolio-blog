'use client'

// Wishlist trang /chill: người xem gợi ý tính năng / nhạc / điểm đến cho quán,
// thả ❤️ cho ý tưởng người khác. Góp ý mới chờ Bin duyệt trong Studio rồi mới
// hiện (xem src/app/api/chill-wish/route.ts).
//
// Nút mở là pill nổi góc phải dưới (luôn thấy, kể cả lúc giao diện tự ẩn — chỉ
// mờ bớt), có badge số ý tưởng. Lần đầu vào trang: vòng sáng lan ra + lời mời.

import Script from 'next/script'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {trackEvent} from '@/lib/analytics'
import {Donate} from './Donate'
import {hasDonate} from './donate-config'

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
  {value: 'feature', label: 'Feature', icon: '💡'},
  {value: 'music', label: 'Music', icon: '🎵'},
  {value: 'place', label: 'Place', icon: '📍'},
  {value: 'bug', label: 'Bug', icon: '🐞'},
  {value: 'other', label: 'Other', icon: '💬'},
]

const STATUS: Record<string, {label: string; className: string}> = {
  pending: {label: 'Awaiting review', className: 'border-white/15 text-[#a79e94]'},
  considering: {label: 'Considering', className: 'border-sky-300/30 text-sky-200'},
  planned: {label: 'Planned', className: 'border-amber-300/40 text-amber-200'},
  shipped: {label: 'Shipped ✓', className: 'border-emerald-300/40 bg-emerald-400/10 text-emerald-200'},
}

type Tab = 'hot' | 'new' | 'shipped'
const TABS: {value: Tab; label: string}[] = [
  {value: 'hot', label: 'Hot'},
  {value: 'new', label: 'New'},
  {value: 'shipped', label: 'Shipped'},
]

const AVATAR_BG = ['#f6d2bd', '#f7e2a0', '#fbf1d2', '#d5e8d4', '#d7dcf5', '#f4c7d0']
const HEARTS_KEY = 'chill:wish-hearts'
const MINE_KEY = 'chill:my-wishes'
const SEEN_KEY = 'chill:wish-seen'
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

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d`
  return new Date(iso).toLocaleDateString('en', {month: 'short', day: 'numeric'})
}

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

export function Wishlist({
  open,
  onOpenChange,
  dimmed,
  hidden,
  context,
  onThanks,
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
}) {
  const [wishes, setWishes] = useState<Wish[]>([])
  const [loaded, setLoaded] = useState(false)
  const [mine, setMine] = useState<Wish[]>([])
  const [hearted, setHearted] = useState<string[]>([])
  const [seen, setSeen] = useState(true)
  const [tab, setTab] = useState<Tab>('hot')
  const [view, setView] = useState<'wishes' | 'donate'>('wishes')
  const donate = hasDonate()
  const showDonate = () => {
    setView('donate')
    trackEvent({name: 'Chill Donate Open'})
  }

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
    if (tab === 'shipped') return wishes.filter((w) => w.status === 'shipped').sort(byNew)
    const open = wishes.filter((w) => w.status !== 'shipped')
    return tab === 'new' ? [...pendingMine, ...open.sort(byNew)] : [...pendingMine, ...open.sort((a, b) => b.hearts - a.hearts || byNew(a, b))]
  }, [wishes, pendingMine, tab])

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
    setTab('new')
  }

  const count = wishes.filter((w) => w.status !== 'shipped').length + pendingMine.length

  return (
    <>
      {/* Nút mở: pill nổi góc phải dưới, luôn thấy */}
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls="chill-wishlist"
        aria-label={`Wishlist — ${count} ideas`}
        title="Suggest something for the café (W)"
        className={`group absolute right-3 z-30 flex items-center gap-2.5 rounded-full border py-2 pl-3 pr-2 shadow-[0_12px_40px_-10px_rgba(0,0,0,0.85)] backdrop-blur-md transition-all duration-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+104px)] sm:right-5 sm:bottom-[124px] xl:bottom-5 ${
          open ? 'border-[#e8b27d]/60 bg-[#2a2320]/95' : 'border-white/15 bg-[#1e2030]/90 hover:border-white/30 hover:bg-[#262a3d]/95'
        } ${hidden || open ? 'pointer-events-none translate-y-2 opacity-0' : dimmed ? 'opacity-60 hover:opacity-100' : 'opacity-100'}`}
      >
        {/* Lần đầu: vòng sáng lan ra để mắt chú ý tới */}
        {!seen && !open && <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full motion-safe:animate-ping motion-safe:[animation-duration:2.2s] border-2 border-[#f08a5d]/60" />}
        <span aria-hidden className="text-lg leading-none">
          💡
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-[#f3ece4]">Wishlist</span>
        <span className="min-w-7 rounded-full bg-gradient-to-b from-[#f59a6c] to-[#d9603b] px-2 py-0.5 text-center text-sm font-bold tabular-nums text-white shadow-[0_0_18px_rgba(240,120,80,0.55)]">
          {loaded ? count : '·'}
        </span>
      </button>

      {/* Lời mời lần đầu, cạnh nút */}
      {!seen && !open && !hidden && (
        <p
          aria-hidden
          className="pointer-events-none absolute right-3 z-30 rounded-lg border border-[#e8b27d]/30 bg-black/65 px-3 py-1.5 text-xs text-[#f3cfa8] backdrop-blur bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+156px)] sm:right-5 sm:bottom-[176px] xl:bottom-[76px]"
        >
          Got an idea for the café? Tell us ☕
        </p>
      )}

      <section
        id="chill-wishlist"
        role="dialog"
        aria-label="Café wishlist"
        inert={!open}
        className={`absolute inset-x-0 bottom-0 z-40 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl border border-white/12 bg-[#1b1a21]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all duration-300 ease-out lg:inset-x-auto lg:bottom-5 lg:right-5 lg:max-h-[min(680px,calc(100dvh-96px))] lg:w-[410px] lg:rounded-3xl ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
        }`}
      >
        <header className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
          {view === 'donate' ? (
            <>
              <button
                type="button"
                onClick={() => setView('wishes')}
                aria-label="Back to wishlist"
                className="-ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-[#c9c0b6] hover:bg-white/[0.06] hover:text-[#ede6dd]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                  <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold tracking-tight text-[#f3ece4]">Buy Bin a coffee ☕</h2>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold tracking-tight text-[#f3ece4]">Café wishlist</h2>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-0.5 font-mono text-xs tabular-nums text-emerald-200">
                💡 {count}
              </span>
            </>
          )}
          {donate && view === 'wishes' && (
            <button
              type="button"
              onClick={showDonate}
              title="Buy Bin a coffee"
              className="relative ml-auto flex h-9 items-center gap-1.5 rounded-xl border border-[#e8b27d]/40 bg-[#e8b27d]/10 px-2.5 text-sm font-semibold text-[#f3cfa8] transition hover:bg-[#e8b27d]/20 focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
            >
              <SteamingCup /> Support
              <Sparkles />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close wishlist (Esc)"
            className={`${donate && view === 'wishes' ? '' : 'ml-auto'} flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#ede6dd] transition hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-[#e8b27d]`}
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
            <div className="flex items-center gap-1 px-5 pt-3" role="tablist" aria-label="Sort wishes">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.value}
                  onClick={() => setTab(t.value)}
                  className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] transition ${
                    tab === t.value ? 'bg-[#e8b27d]/15 text-[#f3cfa8]' : 'text-[#a79e94] hover:text-[#ede6dd]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <ol className="min-h-40 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
              {list.length === 0 && (
                <li className="py-10 text-center text-sm text-[#a79e94]">
                  {!loaded ? 'Brewing…' : tab === 'shipped' ? 'Nothing shipped yet — soon!' : 'No wishes yet. Be the first ☕'}
                </li>
              )}
              {list.map((w) => (
                <WishItem key={w.id} wish={w} hearted={hearted.includes(w.id)} onHeart={() => toggleHeart(w)} />
              ))}
            </ol>

            {donate && (
              <button
                type="button"
                onClick={showDonate}
                className="relative mx-4 mb-3 flex items-center gap-3 rounded-2xl border border-[#e8b27d]/25 bg-gradient-to-r from-[#e8b27d]/12 to-transparent px-4 py-2.5 text-left transition hover:border-[#e8b27d]/50"
              >
                <SteamingCup className="text-xl" />
                <span className="min-w-0 flex-1 text-sm text-[#ede6dd]">
                  Enjoying the café? <span className="font-semibold text-[#f3cfa8]">Buy Bin a coffee</span>
                </span>
                <span aria-hidden className="text-[#e8b27d]">
                  →
                </span>
              </button>
            )}

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
  const cat = CATEGORIES.find((c) => c.value === w.category) ?? CATEGORIES[0]
  const name = w.name || 'Guest'
  const status = STATUS[w.status]
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
            {cat.icon} {cat.label}
          </span>
          <span className="font-mono text-[11px] text-[#8d857c]">{ago(w.createdAt)}</span>
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
              aria-label={`${hearted ? 'Remove heart' : 'I want this too'} — ${w.hearts} hearts`}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs tabular-nums transition ${
                hearted ? 'border-rose-400/50 bg-rose-400/15 text-rose-200' : 'border-white/10 text-[#c9c0b6] hover:border-rose-300/40 hover:text-rose-200'
              }`}
            >
              <span aria-hidden>{hearted ? '❤️' : '🤍'}</span>
              {w.hearts}
            </button>
          )}
          {status && <span className={`rounded-full border px-2 py-0.5 text-[11px] ${status.className}`}>{status.label}</span>}
        </div>
      </div>
    </li>
  )
}

// Ô nhập góp ý: gõ vào thì mới mở thêm tên / email (không bắt buộc) + captcha
function Composer({open, context, onSent}: {open: boolean; context: string; onSent: (w: Wish) => void}) {
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
        setError("Couldn't verify you're human — refresh the page and try again.")
      },
    })
    return () => {
      if (window.turnstile && widget.current) window.turnstile.remove(widget.current)
      widget.current = undefined
      setToken(null)
    }
  }, [open, expanded, scriptReady])

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
      if (!res.ok) throw new Error(data.error ?? 'Could not send, please try again.')
      if (data.id) {
        onSent({id: data.id, text: text.trim(), category, name: name.trim(), createdAt: new Date().toISOString(), hearts: 0, status: 'pending'})
      }
      setText('')
      setState('sent')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send, please try again.')
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
          Thanks! Your wish will show up after a quick review ☕
        </p>
      )}
      <div className="mb-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none]" role="radiogroup" aria-label="Type of wish">
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
            {c.icon} {c.label}
          </button>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Your wish</span>
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
            placeholder="What should the café add next?"
            className="block w-full resize-none rounded-3xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[15px] text-[#ede6dd] placeholder:text-[#8d857c] focus:border-[#e8b27d]/50 focus:outline-none"
          />
          {expanded && <span className="pointer-events-none absolute bottom-2 right-4 font-mono text-[10px] text-[#8d857c]">{text.length}/{MAX}</span>}
        </label>
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send wish"
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
              placeholder="Name (optional)"
              aria-label="Your name (optional)"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#ede6dd] placeholder:text-[#8d857c] focus:border-[#e8b27d]/50 focus:outline-none"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.slice(0, 120))}
              placeholder="Email (optional)"
              aria-label="Email (optional) — we'll let you know when it ships"
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#ede6dd] placeholder:text-[#8d857c] focus:border-[#e8b27d]/50 focus:outline-none"
            />
          </div>
          <p className="text-[11px] text-[#8d857c]">Leave an email to hear back when it ships. It&apos;s never shown publicly.</p>
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
            <p className="text-[11px] text-[#8d857c]">Checking you&apos;re human… the send button unlocks in a moment.</p>
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
