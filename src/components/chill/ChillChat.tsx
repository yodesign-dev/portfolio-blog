'use client'

// Phòng chat trang /chill (API: /api/chill-chat, dữ liệu trên Upstash Redis).
//
// - Nút nhỏ ngay trên nút Wishlist: số người online + số tin chưa đọc
// - Khung chat cùng chỗ panel Wishlist (góc phải dưới / sheet trên điện thoại),
//   không có nền tối — vẫn nghe nhạc, ngắm cảnh trong lúc chat
// - Tên ngẫu nhiên kiểu Việt, đổi được; không tài khoản. Tin tự xoá sau 24 giờ
// - Hỏi tin mới mỗi 3s khi đang có người nhắn, 10s khi phòng im, 30s khi khung
//   đóng (chỉ để đếm tin chưa đọc), dừng hẳn khi chuyển tab
// - Tin đầu tiên cần Turnstile → server cấp "vé chat" 24h

import Script from 'next/script'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {PixelIcon, TOKEN_CLASS, TokenChip, TokenLabel} from './pixel-icons'
import {NOTO, NotoEmoji, withNoto} from './noto-emoji'

export type ChatMessage = {id: string; kind: 'msg' | 'event' | 'cat'; name?: string; color?: number; text: string; ts: number; who?: string}
type Message = ChatMessage
type Room = {open: boolean; online: number; messages: Message[]; reactions: Record<string, Record<string, number>>; typing?: string[]}
type Me = {uid: string; name: string; color: number}

const ME_KEY = 'chill:chat-me'
const PASS_KEY = 'chill:chat-pass'
const MINE_KEY = 'chill:chat-mine'
const RX_KEY = 'chill:chat-rx'
const READ_KEY = 'chill:chat-read'

const REACTIONS = ['☕', '❤️', '😂', '🐱']
// Hàng chèn nhanh = đúng 16 emoji động Noto (noto-emoji.tsx)
const QUICK = NOTO.map((e) => e.char)
const COLORS = ['#f08a5d', '#e8b27d', '#7bb98a', '#7fa6d6', '#c98bd6', '#e39bb0', '#6fc2c0', '#d6c26f']
const NAMES = [
  'Mây Chiều', 'Phin Đen', 'Mèo Mướp', 'Gió Heo May', 'Bạc Xỉu', 'Hoa Sữa', 'Mưa Phùn', 'Đèn Lồng', 'Lá Me', 'Trà Đá',
  'Hạt Mưa', 'Ly Nâu', 'Phố Cổ', 'Sương Sớm', 'Cà Phê Muối', 'Hoàng Hôn', 'Bánh Mì', 'Nắng Nhạt', 'Hẻm Nhỏ', 'Trăng Khuyết',
]
const MAX = 200

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
const timeOf = (ts: number) => new Date(ts).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})

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
    // Chặn storage — vẫn chat được, chỉ không nhớ tên / tin của mình
  }
}

const post = (body: Record<string, unknown>) =>
  fetch('/api/chill-chat', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})

export function ChillChat({
  open,
  onOpenChange,
  hidden,
  dimmed,
  onAvailable,
  slot,
  onMessages,
  fastPoll = false,
  shareTyping = false,
  onSentText,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Bảng cài đặt đang mở → ẩn nút
  hidden: boolean
  // Giao diện đang tự ẩn khi không đụng chuột
  dimmed: boolean
  // Phòng chat có mở không (Studio có thể tắt) — để Wishlist xếp lại chỗ
  onAvailable: (available: boolean) => void
  // Ô trong hàng nút góc phải dưới — nút mở được đặt vào đây
  slot: HTMLElement | null
  // Mỗi lần tải tin → báo lên trang (bàn nhóm hiện bong bóng lời thoại trên đầu bạn bè)
  // typing = mã ẩn danh `who` của những người đang gõ (chỉ người ở bàn nhóm mới gửi)
  onMessages?: (messages: ChatMessage[], typing: string[]) => void
  // Đang có bạn ở bàn nhóm → hỏi tin dày hơn cho bong bóng hiện kịp, dù chat đang đóng
  fastPoll?: boolean
  // Đang ngồi bàn có bạn bè → báo "đang gõ" để bạn cùng bàn thấy "• • •" trên đầu mình
  shareTyping?: boolean
  // Mình vừa gửi tin → trang hiện bong bóng trên đầu nhân vật của mình ở quầy
  onSentText?: (text: string) => void
}) {
  const [me, setMe] = useState<Me | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [mine, setMine] = useState<string[]>([])
  const [myRx, setMyRx] = useState<Record<string, boolean>>({})
  const [readAt, setReadAt] = useState(0)
  const [visible, setVisible] = useState(true)
  const listRef = useRef<HTMLOListElement>(null)
  const nearBottom = useRef(true)
  const [newBelow, setNewBelow] = useState(false)

  // Danh tính trên máy này (tạo lần đầu)
  useEffect(() => {
    let saved = load<Me | null>(ME_KEY, null)
    if (!saved || !/^[a-z0-9]{8,32}$/i.test(saved.uid)) {
      // Đã có danh tính ở bàn nhóm → dùng chung uid (bong bóng lời thoại nhận ra đúng người)
      const table = load<{uid?: string} | null>('chill:table-me', null)
      const uid = table?.uid && /^[a-z0-9]{8,32}$/i.test(table.uid) ? table.uid : crypto.randomUUID().replace(/-/g, '').slice(0, 20)
      saved = {uid, name: pick(NAMES), color: Math.floor(Math.random() * COLORS.length)}
      save(ME_KEY, saved)
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    setMe(saved)
    setMine(load<string[]>(MINE_KEY, []))
    setMyRx(load<Record<string, boolean>>(RX_KEY, {}))
    // Lần đầu vào: chỉ tính tin chưa đọc từ lúc này
    let read = load<number | null>(READ_KEY, null)
    if (read === null) {
      read = Date.now()
      save(READ_KEY, read)
    }
    setReadAt(read)
    setVisible(document.visibilityState === 'visible')
    /* eslint-enable react-hooks/set-state-in-effect */
    const onVis = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const refresh = useCallback(async (fresh = false) => {
    try {
      const res = await fetch(`/api/chill-chat${fresh ? `?fresh=${Date.now()}` : ''}`)
      if (!res.ok) return
      const data = (await res.json()) as Room
      setRoom(data)
    } catch {
      // Mạng chập chờn — lần sau hỏi lại
    }
  }, [])

  useEffect(() => {
    onAvailable(room?.open ?? false)
  }, [room?.open, onAvailable])

  // Nhịp "đang ở quán" mỗi phút (đếm online, báo khách mới)
  useEffect(() => {
    if (!me || !visible) return
    const hello = () => void post({action: 'hello', uid: me.uid}).catch(() => {})
    hello()
    const t = window.setInterval(hello, 60_000)
    return () => window.clearInterval(t)
  }, [me, visible])

  // Hỏi tin mới: nhanh khi đang mở + phòng đang rôm rả, thưa khi im, dừng khi ẩn tab
  const lastTs = room?.messages.at(-1)?.ts ?? 0
  useEffect(() => {
    if (!visible) return
    const first = window.setTimeout(() => void refresh(), 0)
    const busy = Date.now() - lastTs < 120_000
    const every = open ? (busy ? 3000 : 10_000) : fastPoll ? 6000 : 30_000
    const t = window.setInterval(() => void refresh(), every)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(t)
    }
  }, [visible, open, lastTs, refresh, fastPoll])

  const messages = useMemo(() => room?.messages ?? [], [room])
  useEffect(() => {
    if (room?.open) onMessages?.(room.messages, room.typing ?? [])
  }, [room, onMessages])
  const mineSet = useMemo(() => new Set(mine), [mine])
  const unread = open ? 0 : messages.filter((m) => m.kind === 'msg' && m.ts > readAt && !mineSet.has(m.id)).length

  // Đang mở → coi như đã đọc hết
  useEffect(() => {
    if (!open || !lastTs || lastTs <= readAt) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReadAt(lastTs)
    save(READ_KEY, lastTs)
  }, [open, lastTs, readAt])

  // Tự cuộn xuống khi có tin mới nếu đang ở cuối; không thì hiện "Tin mới ↓"
  useEffect(() => {
    const el = listRef.current
    if (!el || !open) return
    if (nearBottom.current) {
      el.scrollTop = el.scrollHeight
      setNewBelow(false)
    } else setNewBelow(true)
  }, [lastTs, open, messages.length])

  const scrollDown = () => {
    const el = listRef.current
    if (el) el.scrollTo({top: el.scrollHeight, behavior: 'smooth'})
    setNewBelow(false)
  }

  // "Đang gõ": tối đa 1 lần / 3 giây, chỉ khi đang ở bàn có bạn bè
  const lastTyping = useRef(0)
  const onTyping = () => {
    if (!shareTyping || !me) return
    const now = Date.now()
    if (now - lastTyping.current < 3000) return
    lastTyping.current = now
    void post({action: 'typing', uid: me.uid}).catch(() => {})
  }

  const onSent = (m: Message) => {
    onSentText?.(m.text)
    lastTyping.current = 0
    const next = [...mine, m.id].slice(-60)
    setMine(next)
    save(MINE_KEY, next)
    nearBottom.current = true
    setRoom((r) => (r ? {...r, messages: [...r.messages.filter((x) => x.id !== m.id), m]} : r))
    void refresh(true)
  }

  const toggleReaction = (id: string, emoji: string) => {
    if (!me) return
    const key = `${id}|${emoji}`
    const on = !myRx[key]
    const next = {...myRx}
    if (on) next[key] = true
    else delete next[key]
    setMyRx(next)
    save(RX_KEY, next)
    setRoom((r) => {
      if (!r) return r
      const counts = {...(r.reactions[id] ?? {})}
      counts[emoji] = Math.max(0, (counts[emoji] ?? 0) + (on ? 1 : -1))
      return {...r, reactions: {...r.reactions, [id]: counts}}
    })
    void post({action: 'react', uid: me.uid, id, emoji, on}).catch(() => {})
  }

  const reportMessage = (id: string) => {
    if (!window.confirm('Báo cáo tin này? 3 người báo cáo thì tin sẽ tự ẩn.')) return
    void post({action: 'report', id}).catch(() => {})
    setRoom((r) => (r ? {...r, messages: r.messages.filter((m) => m.id !== id)} : r))
  }

  const rename = (name: string) => {
    if (!me) return
    const next = {...me, name}
    setMe(next)
    save(ME_KEY, next)
  }

  if (!room?.open || !me) return null
  const online = Math.max(1, room.online)

  return (
    <>
      {/* Nút mở: nhỏ, ngay trên nút Wishlist */}
      {/* Nút mở: ô cuối trong hàng nút góc phải dưới (Wishlist · Mời bạn · Chat) */}
      {slot &&
        createPortal(
          <button
            type="button"
            onClick={() => onOpenChange(!open)}
            aria-expanded={open}
            aria-controls="chill-chat"
            aria-label={`Trò chuyện ở quán — ${online} người online${unread ? `, ${unread} tin chưa đọc` : ''} (C)`}
            title="Trò chuyện ở quán (C)"
            className={`${TOKEN_CLASS} border-white/[0.13] ${
              hidden || open ? 'pointer-events-none translate-y-2 opacity-0' : dimmed ? 'opacity-60 hover:opacity-100' : 'opacity-100'
            }`}
          >
            {/* Có tin chưa đọc: bong bóng sau đổi cam + số cam; không thì chấm xanh + số người online */}
            <PixelIcon name={unread > 0 ? 'chatUnread' : 'chat'} />
            {unread > 0 ? (
              <TokenChip hot>{unread > 9 ? '9+' : unread}</TokenChip>
            ) : (
              <TokenChip>
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {online}
              </TokenChip>
            )}
            <TokenLabel>Chat · {online} online</TokenLabel>
          </button>,
          slot,
        )}

      <section
        id="chill-chat"
        role="dialog"
        aria-label="Trò chuyện ở quán"
        inert={!open}
        className={`absolute inset-x-0 bottom-0 z-40 flex h-[78dvh] flex-col overflow-hidden rounded-t-3xl border border-white/12 bg-[#1b1a21]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all duration-300 ease-out lg:inset-x-auto lg:bottom-5 lg:right-5 lg:h-[min(620px,calc(100dvh-96px))] lg:w-[400px] lg:rounded-3xl ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
        }`}
      >
        <header className="border-b border-white/[0.07] px-5 pb-3 pt-4">
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            <h2 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-[#ede6dd]">Trò chuyện ở quán</h2>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs tabular-nums text-emerald-200">
              {online} online
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Đóng chat (Esc)"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#ede6dd] transition hover:bg-white/10"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden>
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <NameRow me={me} onRename={rename} />
        </header>

        <div className="relative min-h-0 flex-1">
          <ol
            ref={listRef}
            onScroll={(e) => {
              const el = e.currentTarget
              nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
              if (nearBottom.current) setNewBelow(false)
            }}
            className="h-full space-y-1 overflow-y-auto overscroll-contain px-4 py-4"
            aria-live="polite"
          >
            <li className="pb-2 text-center text-[11px] text-[#7d756d]">Tin nhắn tự xoá sau 24 giờ · Nhẹ nhàng với nhau nha ☕</li>
            {messages.length === 0 && <li className="py-10 text-center text-sm text-[#a79e94]">Quán đang yên, chào một câu nhé {withNoto('👋')}</li>}
            {messages.map((m, i) => {
              if (m.kind !== 'msg') {
                return (
                  <li key={m.id} className="py-1.5 text-center text-xs text-[#8d857c]">
                    {m.kind === 'cat' ? withNoto('🐱 ', 16) : '· '}
                    {withNoto(m.text, 16)}
                    {m.kind === 'event' ? ' ·' : ''}
                  </li>
                )
              }
              const prev = messages[i - 1]
              const grouped = prev?.kind === 'msg' && prev.name === m.name && prev.color === m.color && m.ts - prev.ts < 180_000
              return (
                <Bubble
                  key={m.id}
                  m={m}
                  own={mineSet.has(m.id)}
                  grouped={grouped}
                  reactions={room.reactions[m.id] ?? {}}
                  myRx={myRx}
                  onReact={toggleReaction}
                  onReport={reportMessage}
                />
              )
            })}
          </ol>
          {newBelow && (
            <button
              type="button"
              onClick={scrollDown}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-[#e8b27d]/40 bg-[#2a2320]/95 px-3 py-1 text-xs text-[#f3cfa8] shadow-lg"
            >
              Tin mới ↓
            </button>
          )}
        </div>

        <Composer me={me} open={open} onSent={onSent} onTyping={onTyping} />
      </section>
    </>
  )
}

function NameRow({me, onRename}: {me: Me; onRename: (name: string) => void}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(me.name)
  if (editing) {
    return (
      <form
        className="mt-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const name = value.replace(/\s+/g, ' ').trim().slice(0, 24)
          if (name) onRename(name)
          setEditing(false)
        }}
      >
        <input
          autoFocus
          value={value}
          maxLength={24}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Tên của bạn"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 text-sm text-[#ede6dd] outline-none focus:border-[#e8b27d]/60"
        />
        <button type="submit" className="rounded-lg bg-[#e8b27d] px-2.5 py-1 text-xs font-semibold text-[#2a1a10]">
          Lưu
        </button>
      </form>
    )
  }
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#a79e94]">
      Bạn là
      <span className="font-semibold" style={{color: COLORS[me.color] ?? COLORS[0]}}>
        {me.name}
      </span>
      <button
        type="button"
        onClick={() => {
          setValue(me.name)
          setEditing(true)
        }}
        className="text-[#f3cfa8] underline-offset-2 hover:underline"
      >
        đổi tên
      </button>
    </p>
  )
}

function Bubble({
  m,
  own,
  grouped,
  reactions,
  myRx,
  onReact,
  onReport,
}: {
  m: Message
  own: boolean
  grouped: boolean
  reactions: Record<string, number>
  myRx: Record<string, boolean>
  onReact: (id: string, emoji: string) => void
  onReport: (id: string) => void
}) {
  // Điện thoại: chạm vào tin để hiện thanh cảm xúc
  const [active, setActive] = useState(false)
  const color = COLORS[m.color ?? 0] ?? COLORS[0]
  const counts = Object.entries(reactions).filter(([, n]) => n > 0)

  return (
    <li className={`group flex gap-2.5 ${own ? 'flex-row-reverse' : ''} ${grouped ? 'pt-0.5' : 'pt-3'}`}>
      <span
        aria-hidden
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-[#1b1a21] ${grouped ? 'invisible' : ''}`}
        style={{background: color}}
      >
        {(m.name ?? '?').trim().charAt(0).toUpperCase()}
      </span>
      <div className={`flex min-w-0 max-w-[78%] flex-col ${own ? 'items-end' : 'items-start'}`}>
        {!grouped && (
          <p className="mb-1 flex items-baseline gap-2 text-xs">
            <span className="font-semibold" style={{color}}>
              {own ? 'Bạn' : m.name}
            </span>
            <time dateTime={new Date(m.ts).toISOString()} className="font-mono text-[10px] text-[#7d756d]">
              {timeOf(m.ts)}
            </time>
          </p>
        )}
        <div className="relative">
          <p
            onClick={() => setActive((a) => !a)}
            className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
              own ? 'rounded-tr-md bg-[#4a3428] text-[#f7ece0]' : 'rounded-tl-md border border-white/[0.07] bg-white/[0.05] text-[#e6ddd2]'
            }`}
          >
            {withNoto(m.text)}
          </p>
          {/* Thanh cảm xúc: rê chuột (desktop) / chạm (điện thoại) */}
          <div
            className={`absolute -top-8 z-10 items-center gap-0.5 rounded-full border border-white/10 bg-[#24222b] px-1 py-0.5 shadow-lg ${own ? 'right-0' : 'left-0'} ${
              active ? 'flex' : 'hidden group-hover:flex group-focus-within:flex'
            }`}
          >
            {REACTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onReact(m.id, e)
                  setActive(false)
                }}
                aria-label={`Thả ${e}`}
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm transition hover:scale-125 hover:bg-white/10"
              >
                <NotoEmoji char={e} size={20} />
              </button>
            ))}
            {!own && (
              <button
                type="button"
                onClick={() => onReport(m.id)}
                aria-label="Báo cáo tin này"
                title="Báo cáo"
                className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-full text-xs text-[#a79e94] transition hover:bg-white/10 hover:text-[#f08a5d]"
              >
                ⚑
              </button>
            )}
          </div>
        </div>
        {counts.length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${own ? 'justify-end' : ''}`}>
            {counts.map(([e, n]) => {
              const on = myRx[`${m.id}|${e}`]
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => onReact(m.id, e)}
                  aria-label={`${e} ${n}${on ? ', bạn đã thả' : ''}`}
                  aria-pressed={!!on}
                  className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs tabular-nums transition ${
                    on ? 'border-[#e8b27d]/50 bg-[#e8b27d]/15 text-[#f3cfa8]' : 'border-white/10 bg-white/[0.04] text-[#c9c0b6] hover:bg-white/10'
                  }`}
                >
                  <NotoEmoji char={e} size={16} />
                  {n}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </li>
  )
}

function Composer({me, open, onSent, onTyping}: {me: Me; open: boolean; onSent: (m: Message) => void; onTyping: () => void}) {
  const [text, setText] = useState('')
  const [company, setCompany] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [needCaptcha, setNeedCaptcha] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<string | undefined>(undefined)

  // Chưa có vé chat còn hạn → cần Turnstile cho tin đầu tiên
  useEffect(() => {
    const pass = load<{pass: string; until: number} | null>(PASS_KEY, null)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNeedCaptcha(!pass || pass.until < Date.now())
    if (window.turnstile) setScriptReady(true)
  }, [open])

  const wantCaptcha = open && needCaptcha && text.trim().length > 0
  useEffect(() => {
    if (!wantCaptcha || !scriptReady || !box.current || !window.turnstile) return
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
        setError('Chưa xác minh được — tải lại trang rồi thử lại nha.')
      },
    })
    return () => {
      if (window.turnstile && widget.current) window.turnstile.remove(widget.current)
      widget.current = undefined
      setToken(null)
    }
  }, [wantCaptcha, scriptReady])

  const insert = (emoji: string) => {
    const el = input.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const next = (text.slice(0, start) + emoji + text.slice(end)).slice(0, MAX)
    setText(next)
    requestAnimationFrame(() => {
      el?.focus()
      const pos = Math.min(next.length, start + emoji.length)
      el?.setSelectionRange(pos, pos)
    })
  }

  const send = async () => {
    const body = text.trim()
    if (!body || sending) return
    if (needCaptcha && !token) {
      setError('Đợi xác minh xong một chút nha…')
      return
    }
    setSending(true)
    setError('')
    try {
      const pass = load<{pass: string; until: number} | null>(PASS_KEY, null)
      const res = await post({
        action: 'send',
        uid: me.uid,
        name: me.name,
        color: me.color,
        text: body,
        pass: pass && pass.until > Date.now() ? pass.pass : undefined,
        captchaToken: token ?? undefined,
        company,
      })
      const data = (await res.json()) as {message?: Message; pass?: string; error?: string; needCaptcha?: boolean}
      if (data.pass) {
        save(PASS_KEY, {pass: data.pass, until: Date.now() + 23 * 60 * 60 * 1000})
        setNeedCaptcha(false)
      }
      if (data.needCaptcha) {
        save(PASS_KEY, null)
        setNeedCaptcha(true)
      }
      if (!res.ok || !data.message) throw new Error(data.error ?? 'Chưa gửi được, thử lại nha.')
      setText('')
      onSent(data.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chưa gửi được, thử lại nha.')
      if (window.turnstile && widget.current) window.turnstile.reset(widget.current)
      setToken(null)
    } finally {
      setSending(false)
      input.current?.focus()
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void send()
      }}
      className="border-t border-white/[0.07] bg-black/20 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5"
    >
      {wantCaptcha && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" onReady={() => setScriptReady(true)} />}
      <div className="mb-2 flex gap-0.5 overflow-x-auto" role="group" aria-label="Chèn emoji">
        {QUICK.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => insert(e)}
            aria-label={`Chèn ${e}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition hover:scale-110 hover:bg-white/10"
          >
            <NotoEmoji char={e} size={22} />
          </button>
        ))}
      </div>
      {wantCaptcha && !token && <div ref={box} className="mb-2 min-h-[65px]" />}
      {/* Honeypot: người thật không thấy ô này */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <div className="flex items-end gap-2">
        <textarea
          ref={input}
          rows={1}
          value={text}
          maxLength={MAX}
          onChange={(e) => {
            setText(e.target.value)
            if (e.target.value.trim()) onTyping()
            if (error) setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void send()
            }
          }}
          placeholder="Nhắn gì đó cho cả quán…"
          aria-label="Tin nhắn"
          className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-[#ede6dd] outline-none placeholder:text-[#7d756d] focus:border-[#e8b27d]/60"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="Gửi"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e8b27d] text-[#2a1a10] transition hover:bg-[#f0c294] disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="M2.5 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="mt-1 flex min-h-4 justify-between px-1 text-[11px]">
        <span className="text-[#f08a5d]" role="alert">
          {error}
        </span>
        {text.length > MAX - 40 && <span className="tabular-nums text-[#7d756d]">{MAX - text.length}</span>}
      </div>
    </form>
  )
}
