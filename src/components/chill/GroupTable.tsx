'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {trackEvent} from '@/lib/analytics'

// Bàn nhóm (thử nghiệm) — phía quầy cửa sổ: nút "Mời bạn" trên thanh trên,
// chọn nhân vật, danh sách bạn đang ở bàn. Backend: /api/chill-table.
//
// Studio tắt "Mở bàn nhóm" → GET trả {open: false} → component không hiện gì,
// không gửi nhịp, link `?table=` mở như trang thường.
//
// Bàn vẽ 4 ghế; ai vào sau 4 người đầu là "+n". Người xem luôn ngồi ở quầy nên
// trong danh sách "bạn bè" không tính chính mình.

const SEATS = 4
const ME_KEY = 'chill:table-me'
const TABLE_KEY = 'chill:table-id'
const CHAT_ME_KEY = 'chill:chat-me'
const POLL_MS = 20_000
const BEAT_MS = 60_000

// 6 nhân vật có sẵn — tạm vẽ bằng khối màu, sẽ thay bằng sprite nhìn chính diện
export const CHARACTERS = [
  {name: 'Áo đỏ', shirt: '#b85f5a', hair: '#2b1d16', skin: '#e8b98f'},
  {name: 'Áo xanh lá', shirt: '#56785a', hair: '#3a2618', skin: '#d9a77c'},
  {name: 'Áo tím', shirt: '#6a5fa0', hair: '#1f1a17', skin: '#f0c7a0'},
  {name: 'Áo xanh dương', shirt: '#3e6a8a', hair: '#5a3a22', skin: '#c99068'},
  {name: 'Áo vàng', shirt: '#b08a3e', hair: '#2b1d16', skin: '#e8b98f'},
  {name: 'Áo hồng', shirt: '#9a4e78', hair: '#3a2618', skin: '#d9a77c'},
]
const NAMES = ['Mây Chiều', 'Phin Đen', 'Bạc Xỉu', 'Hoa Sữa', 'Mưa Phùn', 'Lá Me', 'Trà Đá', 'Sương Sớm', 'Hẻm Nhỏ', 'Nắng Nhạt']
const STATUS_LABEL: Record<string, string> = {work: 'đang làm', coffee: 'uống cà phê', sleep: 'ngủ gật', away: 'đi vắng'}

type Me = {uid: string; name: string; character: number | null}
export type TableMember = {name: string; character: number; status: string; seat: number; you: boolean}

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
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Chặn storage — vẫn ngồi bàn được, chỉ không nhớ khi tải lại trang
  }
}

const post = async (body: Record<string, unknown>) => {
  const res = await fetch('/api/chill-table', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)})
  return {status: res.status, data: (await res.json().catch(() => ({}))) as Record<string, unknown>}
}

const inviteUrl = (id: string) => `${window.location.origin}/chill?table=${id}`

export function GroupTable({visible, onFriends}: {visible: boolean; onFriends?: (friends: TableMember[]) => void}) {
  const [available, setAvailable] = useState(false)
  const [me, setMe] = useState<Me | null>(null)
  const [tableId, setTableId] = useState<string | null>(null)
  const [members, setMembers] = useState<TableMember[]>([])
  const [open, setOpen] = useState(false)
  // Mở màn chọn nhân vật để làm gì: tạo bàn mới hay vào bàn được mời
  const [picker, setPicker] = useState<null | {mode: 'create'} | {mode: 'join'; id: string; host?: string}>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Tính năng có bật không + đọc link mời / bàn đang ngồi
  useEffect(() => {
    let alive = true
    void (async () => {
      const res = await fetch('/api/chill-table').then((r) => r.json()).catch(() => ({open: false}))
      if (!alive || !res.open) return
      setAvailable(true)
      let saved = load<Me | null>(ME_KEY, null)
      if (!saved || !/^[a-z0-9]{8,32}$/i.test(saved.uid)) {
        const chat = load<{uid?: string; name?: string} | null>(CHAT_ME_KEY, null)
        saved = {
          uid: chat?.uid && /^[a-z0-9]{8,32}$/i.test(chat.uid) ? chat.uid : crypto.randomUUID().replace(/-/g, '').slice(0, 20),
          name: chat?.name || NAMES[Math.floor(Math.random() * NAMES.length)],
          character: null,
        }
        save(ME_KEY, saved)
      }
      setMe(saved)

      const params = new URLSearchParams(window.location.search)
      const invited = params.get('table')
      if (invited) {
        params.delete('table')
        const q = params.toString()
        window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}`)
      }
      const current = load<string | null>(TABLE_KEY, null)
      if (invited && /^[a-z0-9]{8}$/.test(invited) && invited !== current) {
        const peek = await fetch(`/api/chill-table?id=${invited}`).then((r) => r.json()).catch(() => null)
        if (!alive) return
        if (!peek?.members) return setNotice('Bàn này đã giải tán rồi.')
        if (peek.members.length >= peek.max) return setNotice('Bàn đã đủ người.')
        setPicker({mode: 'join', id: invited, host: peek.members[0]?.name})
      } else if (current) {
        setTableId(current)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const leaveLocal = useCallback((message?: string) => {
    save(TABLE_KEY, null)
    setTableId(null)
    setMembers([])
    if (message) setNotice(message)
  }, [])

  const join = useCallback(
    async (id: string, who: Me) => {
      const {status, data} = await post({action: 'join', id, uid: who.uid, name: who.name, character: who.character ?? 0})
      if (status === 200 && Array.isArray(data.members)) {
        save(TABLE_KEY, id)
        setTableId(id)
        setMembers(data.members as TableMember[])
        return true
      }
      leaveLocal(typeof data.error === 'string' ? data.error : 'Chưa vào được bàn, thử lại nha.')
      return false
    },
    [leaveLocal],
  )

  // Xem ai đang ở bàn + gửi nhịp giữ ghế
  useEffect(() => {
    if (!tableId || !me) return
    let alive = true
    const refresh = async () => {
      const res = await fetch(`/api/chill-table?id=${tableId}&uid=${me.uid}`).then((r) => r.json()).catch(() => null)
      if (!alive || !res) return
      if (!res.open) return leaveLocal()
      if (res.gone) return leaveLocal('Bàn đã giải tán.')
      if (Array.isArray(res.members)) setMembers(res.members)
    }
    const beat = async () => {
      const {status, data} = await post({action: 'beat', id: tableId, uid: me.uid, status: document.hidden ? 'away' : 'work'}).catch(() => ({status: 0, data: {} as Record<string, unknown>}))
      if (!alive) return
      // Máy ngủ quá lâu nên bị tính là đã rời → vào lại
      if (status === 410) await join(tableId, me)
      else if (status === 403) leaveLocal()
      else if (Array.isArray(data.members)) setMembers(data.members as TableMember[])
    }
    void beat()
    const poll = window.setInterval(() => void refresh(), POLL_MS)
    const pulse = window.setInterval(() => void beat(), BEAT_MS)
    return () => {
      alive = false
      window.clearInterval(poll)
      window.clearInterval(pulse)
    }
  }, [tableId, me, join, leaveLocal])

  const friends = members.filter((m) => !m.you)
  useEffect(() => onFriends?.(friends), [members]) // eslint-disable-line react-hooks/exhaustive-deps

  // Đóng menu khi bấm ra ngoài / Esc
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(t)
  }, [notice])

  if (!available || !me) return null

  const confirmPicker = async (name: string, character: number) => {
    if (!picker) return
    const next = {...me, name, character}
    save(ME_KEY, next)
    setMe(next)
    setBusy(true)
    if (picker.mode === 'create') {
      const {status, data} = await post({action: 'create', uid: next.uid, name, character})
      if (status === 200 && typeof data.id === 'string') {
        save(TABLE_KEY, data.id)
        setTableId(data.id)
        setMembers(data.members as TableMember[])
        setOpen(true)
        trackEvent({name: 'Chill Table', props: {action: 'create'}})
      } else setNotice(typeof data.error === 'string' ? data.error : 'Chưa tạo được bàn, thử lại nha.')
    } else {
      // Đang ngồi bàn khác mà mở link mời mới → rời bàn cũ cho khỏi giữ ghế
      if (tableId && tableId !== picker.id) void post({action: 'leave', id: tableId, uid: next.uid}).catch(() => {})
      if (await join(picker.id, next)) trackEvent({name: 'Chill Table', props: {action: 'join'}})
    }
    setBusy(false)
    setPicker(null)
  }

  const copy = () => {
    if (!tableId) return
    void navigator.clipboard?.writeText(inviteUrl(tableId)).then(() => {
      setCopied(true)
      trackEvent({name: 'Chill Table', props: {action: 'copy'}})
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const leave = async () => {
    if (!tableId) return
    void post({action: 'leave', id: tableId, uid: me.uid}).catch(() => {})
    trackEvent({name: 'Chill Table', props: {action: 'leave'}})
    leaveLocal()
    setOpen(false)
  }

  const onButton = () => {
    if (tableId) setOpen((o) => !o)
    else setPicker({mode: 'create'})
  }

  return (
    <>
      {visible && (
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={onButton}
            aria-label={tableId ? `Bàn nhóm: ${friends.length} người bạn đang ở đây` : 'Mời bạn ngồi cùng'}
            aria-expanded={tableId ? open : undefined}
            title={tableId ? 'Bàn nhóm' : 'Mời bạn ngồi cùng'}
            className="flex h-9 items-center gap-1.5 rounded-md border border-[#e8b27d]/45 bg-[#2a1f18]/75 px-2.5 text-xs font-medium text-[#f6dcbd] shadow-[0_4px_14px_-6px_rgba(0,0,0,0.8)] backdrop-blur transition hover:border-[#e8b27d]/80 hover:bg-[#3a2a1e]/85 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
          >
            {tableId && friends.length > 0 ? (
              <>
                {/* Màn hẹp: thanh trên đã chật → chỉ icon + số người */}
                <span className="hidden -space-x-1.5 sm:flex" aria-hidden>
                  {friends.slice(0, 3).map((f, i) => (
                    <Avatar key={i} character={f.character} size={18} ring />
                  ))}
                </span>
                <PeopleIcon className="sm:hidden" />
                <span className="tabular-nums">{friends.length}</span>
              </>
            ) : (
              <>
                <PeopleIcon plus />
                <span className="hidden sm:inline">{tableId ? 'Bàn nhóm' : 'Mời bạn'}</span>
              </>
            )}
          </button>

          {open && tableId && (
            // Điện thoại: nút nằm giữa thanh trên → menu căn theo màn hình cho khỏi tràn mép
            <div className="fixed inset-x-3 top-16 z-50 rounded-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64 border border-white/10 bg-[#1b1a21]/95 p-3 text-sm text-[#ede6dd] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-xl">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#a79e94]">
                {friends.length ? `${friends.length} người bạn đang ở bàn` : 'Bàn đang chờ bạn bè'}
              </p>
              {friends.length === 0 && <p className="mt-2 text-[13px] text-[#a79e94]">Gửi link cho bạn bè. Ai mở link sẽ ngồi vào bàn trong quán.</p>}
              <ul className="mt-2 space-y-1.5">
                {friends.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Avatar character={f.character} size={22} />
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <span className="text-[11px] text-[#a79e94]">{f.seat < 0 ? 'bàn bên' : STATUS_LABEL[f.status] ?? ''}</span>
                  </li>
                ))}
              </ul>
              {friends.length > SEATS && (
                <p className="mt-2 text-[11px] text-[#a79e94]">Bàn có {SEATS} ghế, {friends.length - SEATS} người còn lại hiện thành “+{friends.length - SEATS}”.</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={copy}
                  className="flex-1 rounded-md bg-[#e8b27d] px-3 py-2 text-xs font-semibold text-[#2a1a10] transition hover:bg-[#f0c08f]"
                >
                  {copied ? 'Đã copy link ✓' : 'Copy link mời'}
                </button>
                <button type="button" onClick={leave} className="rounded-md px-3 py-2 text-xs text-[#a79e94] transition hover:bg-white/[0.08] hover:text-white">
                  Rời bàn
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {picker && (
        <CharacterPicker
          key={picker.mode}
          title={picker.mode === 'join' ? (picker.host ? `${picker.host} mời bạn vào bàn` : 'Bạn được mời vào bàn') : 'Tạo bàn cho nhóm bạn'}
          action={picker.mode === 'join' ? 'Vào bàn' : 'Tạo bàn'}
          name={me.name}
          character={me.character}
          busy={busy}
          onConfirm={confirmPicker}
          onClose={() => setPicker(null)}
        />
      )}

      {notice && (
        <div role="status" className="pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-lg bg-black/75 px-4 py-2 text-sm text-[#f6dcbd] backdrop-blur">
          {notice}
        </div>
      )}
    </>
  )
}

function PeopleIcon({plus, className}: {plus?: boolean; className?: string}) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className={className}>
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M1.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {plus ? (
        <path d="M12.5 5v4M10.5 7h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <path d="M11 3.2a2.5 2.5 0 010 4.6M12.5 9.8c1.2.5 2 1.8 2 3.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  )
}

// Tạm thời: đầu + vai bằng khối màu. Khi có sprite chính diện sẽ thay bằng ảnh cắt từ sheet.
function Avatar({character, size, ring}: {character: number; size: number; ring?: boolean}) {
  const c = CHARACTERS[character] ?? CHARACTERS[0]
  return (
    <span
      className={`relative inline-block overflow-hidden rounded-full ${ring ? 'ring-2 ring-[#2a1f18]' : ''}`}
      style={{width: size, height: size, background: '#4a3426'}}
    >
      <span className="absolute left-1/2 -translate-x-1/2 rounded-t-full" style={{bottom: 0, width: size * 0.8, height: size * 0.36, background: c.shirt}} />
      <span className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{top: size * 0.16, width: size * 0.46, height: size * 0.46, background: c.skin}} />
      <span className="absolute left-1/2 -translate-x-1/2 rounded-t-full" style={{top: size * 0.12, width: size * 0.5, height: size * 0.2, background: c.hair}} />
    </span>
  )
}

function CharacterPicker({
  title,
  action,
  name: initialName,
  character: initialCharacter,
  busy,
  onConfirm,
  onClose,
}: {
  title: string
  action: string
  name: string
  character: number | null
  busy: boolean
  onConfirm: (name: string, character: number) => void
  onClose: () => void
}) {
  const [name, setName] = useState(initialName)
  const [character, setCharacter] = useState(() => initialCharacter ?? Math.floor(Math.random() * CHARACTERS.length))
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.replace(/\s+/g, ' ').trim()
    if (!n) return setError('Bạn đặt tên trước nha.')
    onConfirm(n.slice(0, 24), character)
  }

  const random = () => {
    setCharacter((c) => (c + 1 + Math.floor(Math.random() * (CHARACTERS.length - 1))) % CHARACTERS.length)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onSubmit={submit}
        // Phím tắt của quán (S cài đặt, C chat…) không được bật khi đang chọn nhân vật
        onKeyDown={(e) => e.key !== 'Escape' && e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1b1a21] p-5 text-[#ede6dd] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]"
      >
        <h2 className="text-lg font-semibold tracking-tight text-[#f3ece4]">{title}</h2>
        <p className="mt-1 text-[13px] text-[#a79e94]">Bạn vẫn ngồi ở quầy cửa sổ. Bạn bè sẽ thấy nhân vật này ngồi ở bàn nhóm trong quán.</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[#a79e94]">Nhân vật</span>
          <button type="button" onClick={random} className="rounded-md px-2 py-1 text-xs text-[#f6dcbd] transition hover:bg-white/[0.08]">
            🎲 Ngẫu nhiên
          </button>
        </div>
        <div className="mt-2 grid grid-cols-6 gap-2" role="radiogroup" aria-label="Nhân vật">
          {CHARACTERS.map((c, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={character === i}
              aria-label={c.name}
              onClick={() => setCharacter(i)}
              className={`flex aspect-square items-center justify-center rounded-lg border transition ${
                character === i ? 'border-[#e8b27d] bg-[#e8b27d]/15' : 'border-white/10 hover:border-white/30'
              }`}
            >
              <Avatar character={i} size={34} />
            </button>
          ))}
        </div>

        <label className="mt-4 block text-[11px] uppercase tracking-[0.14em] text-[#a79e94]" htmlFor="table-name">
          Tên hiển thị
        </label>
        <input
          id="table-name"
          value={name}
          maxLength={24}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          className="mt-1.5 h-10 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-[#f3ece4] outline-none focus:border-[#e8b27d]/70"
        />
        {error && <p className="mt-1 text-xs text-[#f09595]">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-2 text-sm text-[#a79e94] transition hover:bg-white/[0.08] hover:text-white">
            Để sau
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-[#e8b27d] px-4 py-2 text-sm font-semibold text-[#2a1a10] transition hover:bg-[#f0c08f] disabled:opacity-60"
          >
            {busy ? '…' : action}
          </button>
        </div>
      </form>
    </div>
  )
}
