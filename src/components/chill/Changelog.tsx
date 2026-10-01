'use client'

// Nhật ký thay đổi trang /chill (Studio: "Chill · Nhật ký thay đổi").
//
// - Nút "Có gì mới" trên thanh trên cùng; chấm cam khi bản mới nhất có "Báo cho
//   người xem" mà máy này chưa xem
// - Lần đầu quay lại sau bản đó: thông báo nhỏ ngay dưới nút, tự ẩn — không tự bật
//   popup (người xem đang tập trung)
// - Popup giữa màn (desktop) / sheet từ dưới lên (điện thoại), cùng kiểu bảng cảm ơn.
//   Mỗi bản có nút "Thử ngay" đưa thẳng tới tính năng (ChillRoom: runAction)

import {useEffect, useRef, useState} from 'react'

export type ChillUpdate = {
  id: string
  title: string
  date: string // YYYY-MM-DD
  kind?: 'new' | 'improved' | 'fixed'
  version?: string
  announce?: boolean
  action?: string
  actionLabel?: string
  items: {icon?: string; text: string}[]
  image: {src: string; w: number; h: number} | null
  imageAlt?: string
}

// Bản đã xem gần nhất trên máy này (id của bản mới nhất lúc mở popup)
const SEEN_KEY = 'chill:update-seen'
// Đã hiện thông báo nhỏ cho bản này
const TOAST_KEY = 'chill:update-toast'
const TOAST_DELAY = 3000
const TOAST_MS = 8000
// Lúc đầu chỉ hiện vài bản gần nhất
const FIRST = 3

const KIND: Record<string, {label: string; className: string}> = {
  new: {label: 'Mới', className: 'border-[#e8b27d]/50 bg-[#e8b27d]/15 text-[#f3cfa8]'},
  improved: {label: 'Cải thiện', className: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'},
  fixed: {label: 'Sửa lỗi', className: 'border-sky-400/40 bg-sky-400/10 text-sky-200'},
}

const formatDate = (d: string) => d.split('-').reverse().join('/')

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Chặn storage — chấm cam sẽ hiện lại lần sau, không sao
  }
}

// Trạng thái đã xem. `returning` = máy này từng vào /chill trước khi có nhật ký
// (đã có prefs) → vẫn báo bản mới; người mới vào lần đầu thì không báo gì.
export function useUpdatesSeen(updates: ChillUpdate[], returning: boolean | null) {
  const latest = updates[0]
  const [seen, setSeen] = useState<string | null | undefined>(undefined)
  const [toast, setToast] = useState(false)
  // Đã mở popup trong phiên này → tắt chấm cam; nhãn "Chưa xem" giữ tới lần sau
  const [opened, setOpened] = useState(false)
  const [holdToast, setHoldToast] = useState(false)

  useEffect(() => {
    if (returning === null || !latest) return
    let saved = read(SEEN_KEY)
    if (saved === null && !returning) {
      // Khách mới: coi như đã xem hết
      saved = latest.id
      write(SEEN_KEY, saved)
    }
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setSeen(saved)
    const fresh = latest.announce !== false && saved !== latest.id
    if (!fresh || read(TOAST_KEY) === latest.id) return
    // Đợi cảnh hiện lên rồi mới báo
    const t = window.setTimeout(() => {
      write(TOAST_KEY, latest.id)
      setToast(true)
    }, TOAST_DELAY)
    return () => window.clearTimeout(t)
  }, [latest, returning])

  // Tự ẩn, trừ lúc người xem đang rê chuột / focus vào thông báo
  useEffect(() => {
    if (!toast || holdToast) return
    const t = window.setTimeout(() => setToast(false), TOAST_MS)
    return () => window.clearTimeout(t)
  }, [toast, holdToast])

  // Các bản chưa xem: đứng trước bản `seen` (danh sách mới nhất trước). Chưa đọc
  // xong storage hoặc bản `seen` đã bị xoá → không đánh dấu gì
  const seenIndex = seen === undefined ? 0 : seen === null ? updates.length : Math.max(0, updates.findIndex((u) => u.id === seen))
  const unseen = new Set(updates.slice(0, seenIndex).map((u) => u.id))
  const dot = Boolean(!opened && latest && latest.announce !== false && unseen.has(latest.id))

  const markSeen = () => {
    if (!latest) return
    write(SEEN_KEY, latest.id)
    setOpened(true)
    setToast(false)
  }

  return {unseen, dot, toast, closeToast: () => setToast(false), holdToast: setHoldToast, markSeen}
}

export function WhatsNewButton({
  dot,
  toast,
  latest,
  open,
  onOpen,
  onCloseToast,
  onHoldToast,
}: {
  dot: boolean
  toast: boolean
  latest: ChillUpdate | undefined
  open: boolean
  onOpen: (from: 'button' | 'toast') => void
  onCloseToast: () => void
  onHoldToast: (hold: boolean) => void
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpen('button')}
        aria-label={dot ? "What's new — unseen update" : "What's new"}
        aria-expanded={open}
        aria-controls="chill-updates"
        title="What's new"
        className="relative flex h-9 items-center gap-1.5 rounded-md bg-black/45 px-2.5 text-xs text-white/90 backdrop-blur transition hover:bg-black/65 focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
      >
        <SparkIcon />
        <span className="hidden sm:inline">What&apos;s new</span>
        {dot && (
          <span aria-hidden className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#f08a5d] opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-black/40 bg-[#f08a5d]" />
          </span>
        )}
      </button>

      {/* Thông báo nhỏ ngay dưới nút, 1 lần cho mỗi bản lớn */}
      {latest && (
        <div
          role="status"
          onPointerEnter={() => onHoldToast(true)}
          onPointerLeave={() => onHoldToast(false)}
          onFocus={() => onHoldToast(true)}
          onBlur={() => onHoldToast(false)}
          className={`absolute right-0 top-full mt-2 w-[min(300px,calc(100vw-24px))] transition duration-300 ${
            toast ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0'
          }`}
        >
          {toast && (
            <div className="flex items-start gap-2 rounded-xl border border-[#e8b27d]/30 bg-[#1b1a21]/95 p-3 text-left shadow-[0_16px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md">
              <span aria-hidden className="mt-0.5 text-sm leading-none">
                ✨
              </span>
              <button type="button" onClick={() => onOpen('toast')} className="min-w-0 flex-1 text-left">
                <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[#e8b27d]">Mới ở quán</span>
                <span className="mt-0.5 block text-sm leading-snug text-[#ede6dd]">{latest.title}</span>
                <span className="mt-1 block text-xs text-[#f3cfa8] underline-offset-2 hover:underline">Xem có gì mới →</span>
              </button>
              <button
                type="button"
                onClick={onCloseToast}
                aria-label="Ẩn thông báo"
                className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#a79e94] transition hover:bg-white/10 hover:text-[#ede6dd]"
              >
                <CloseIcon size={10} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function Changelog({
  open,
  onClose,
  updates,
  unseen,
  onAction,
}: {
  open: boolean
  onClose: () => void
  updates: ChillUpdate[]
  unseen: Set<string>
  onAction: (action: string) => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [all, setAll] = useState(false)
  useEffect(() => {
    if (open) closeRef.current?.focus({preventScroll: true})
  }, [open])

  const shown = all ? updates : updates.slice(0, FIRST)

  return (
    <section
      id="chill-updates"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chill-updates-title"
      inert={!open}
      onKeyDown={(e) => {
        // Giữ Tab trong popup khi đang mở
        if (e.key !== 'Tab') return
        const items = e.currentTarget.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])')
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }}
      className={`absolute inset-x-0 bottom-0 z-40 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl border border-white/12 bg-[#1b1a21]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all duration-300 ease-out lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:max-h-[min(720px,calc(100dvh-120px))] lg:w-[520px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl ${
        open ? 'translate-y-0 opacity-100 lg:scale-100' : 'pointer-events-none translate-y-6 opacity-0 lg:scale-95'
      }`}
    >
      <header className="flex items-start gap-3 border-b border-white/[0.07] px-5 pb-4 pt-5 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#e8b27d]">Nhật ký thay đổi</p>
          <h2 id="chill-updates-title" className="mt-1.5 text-xl font-semibold tracking-tight text-[#ede6dd]">
            Có gì mới ở quán
          </h2>
          <p className="mt-1 text-sm text-[#a79e94]">Những thay đổi gần đây ở góc chill này.</p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Đóng nhật ký (Esc)"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#ede6dd] transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
        >
          <CloseIcon size={14} />
        </button>
      </header>

      <div className="min-h-40 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
        {updates.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#a79e94]">Chưa có cập nhật nào.</p>
        ) : (
          <ol className="space-y-4">
            {shown.map((u, i) => {
              const kind = KIND[u.kind ?? 'new'] ?? KIND.new
              const fresh = unseen.has(u.id)
              return (
                <li
                  key={u.id}
                  className={`rounded-2xl border p-4 sm:p-5 ${i === 0 ? 'border-[#e8b27d]/25 bg-[#e8b27d]/[0.05]' : 'border-white/[0.07] bg-white/[0.02]'}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <time dateTime={u.date} className="font-mono text-xs tabular-nums text-[#a79e94]">
                      {formatDate(u.date)}
                    </time>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${kind.className}`}>{kind.label}</span>
                    {fresh && (
                      <span className="flex items-center gap-1 text-[11px] text-[#f08a5d]">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#f08a5d]" />
                        Chưa xem
                      </span>
                    )}
                    {u.version && <span className="ml-auto font-mono text-[11px] text-[#6f6862]">v{u.version.replace(/^v/i, '')}</span>}
                  </div>
                  <h3 className="mt-2 text-base font-semibold leading-snug text-[#ede6dd]">{u.title}</h3>

                  {u.image && (
                    // eslint-disable-next-line @next/next/no-img-element -- ảnh / GIF từ Sanity CDN, đã thu nhỏ
                    <img
                      src={u.image.src}
                      alt={u.imageAlt ?? ''}
                      width={u.image.w}
                      height={u.image.h}
                      loading="lazy"
                      className="mt-3 aspect-video w-full rounded-xl border border-white/[0.07] object-cover [image-rendering:pixelated]"
                    />
                  )}

                  <ul className="mt-3 space-y-2">
                    {u.items.map((item, k) => (
                      <li key={k} className="flex gap-2.5 text-sm leading-relaxed text-[#c9c0b6]">
                        <span aria-hidden className="w-5 shrink-0 text-center">
                          {item.icon || '·'}
                        </span>
                        <span className="min-w-0">{item.text}</span>
                      </li>
                    ))}
                  </ul>

                  {u.action && (
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onAction(u.action!)}
                        className="rounded-full border border-[#e8b27d]/50 bg-[#e8b27d]/10 px-4 py-1.5 text-sm font-medium text-[#f3cfa8] transition hover:bg-[#e8b27d]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
                      >
                        {u.actionLabel || 'Thử ngay'} →
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}

        {!all && updates.length > FIRST && (
          <button
            type="button"
            onClick={() => setAll(true)}
            className="mt-4 w-full rounded-xl border border-white/[0.07] py-2.5 text-sm text-[#a79e94] transition hover:bg-white/[0.04] hover:text-[#ede6dd]"
          >
            Xem {updates.length - FIRST} bản cũ hơn
          </button>
        )}
      </div>
    </section>
  )
}

function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1.5l1.4 3.8 3.8 1.4-3.8 1.4L8 11.9 6.6 8.1 2.8 6.7l3.8-1.4L8 1.5z" fill="currentColor" />
      <path d="M12.5 10.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6z" fill="currentColor" opacity=".7" />
    </svg>
  )
}

function CloseIcon({size}: {size: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
