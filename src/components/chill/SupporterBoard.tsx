'use client'

// Bảng cảm ơn trang /chill — tấm bảng gỗ ghim giấy note, mở khi bấm lọ tip trên bàn.
//
// Dữ liệu từ GET /api/chill-support: chỉ người Bin đã tick "Đã nhận tiền" trong
// Studio VÀ tự chọn hiện tên. Người không muốn hiện tên vẫn được đếm vào lọ tip
// (dòng "+ N người bạn giấu tên").

import {useEffect, useRef} from 'react'

export type Supporter = {
  id: string
  name: string
  message: string
  drink: {icon: string; label: string}
  at: string
}

export type Board = {cups: number; supporters: Supporter[]}

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 3600) return 'vừa xong'
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} ngày trước`
  return new Date(iso).toLocaleDateString('vi-VN', {day: 'numeric', month: 'numeric', year: 'numeric'})
}

// Giấy note hơi xiêu vẹo, cố định theo id
const TILTS = ['-rotate-1', 'rotate-[0.6deg]', '-rotate-[0.4deg]', 'rotate-1']
const PINS = ['bg-[#d9534f]', 'bg-[#e8b27d]', 'bg-[#6fae7a]', 'bg-[#7fa6d6]']
const pick = <T,>(list: T[], id: string) => list[[...id].reduce((h, c) => h + c.charCodeAt(0), 0) % list.length]

export function SupporterBoard({
  open,
  onClose,
  board,
  myCup,
  onDonate,
}: {
  open: boolean
  onClose: () => void
  board: Board | null
  // Người xem vừa mời trên máy này (bảng chưa có tên họ cho tới khi Bin đối chiếu)
  myCup: boolean
  onDonate: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (open) closeRef.current?.focus({preventScroll: true})
  }, [open])

  const cups = board?.cups ?? 0
  const shown = board?.supporters ?? []
  const hidden = Math.max(0, cups - shown.length)

  return (
    <section
      id="chill-board"
      role="dialog"
      aria-label="Thank-you board"
      inert={!open}
      className={`absolute inset-x-0 bottom-0 z-40 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl border-2 border-[#3a2414] bg-[#5e3d22] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] transition-all duration-300 ease-out lg:inset-x-auto lg:bottom-5 lg:left-5 lg:max-h-[min(640px,calc(100dvh-96px))] lg:w-[380px] lg:rounded-2xl ${
        open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
      }`}
      style={{
        // Vân ván gỗ ghép ngang
        backgroundImage:
          'repeating-linear-gradient(180deg, rgba(0,0,0,0) 0 46px, rgba(30,16,6,0.55) 46px 48px), repeating-linear-gradient(90deg, rgba(255,220,170,0.035) 0 3px, rgba(0,0,0,0.03) 3px 9px)',
      }}
    >
      <header className="flex items-start gap-3 border-b-2 border-[#3a2414] bg-[#6b4527] px-5 py-4 shadow-[inset_0_-2px_0_rgba(255,220,170,0.08)]">
        <span aria-hidden className="text-2xl leading-none">
          🫙
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight text-[#fbf1d2]">Bảng cảm ơn</h2>
          <p className="mt-0.5 text-xs text-[#e6cfae]">
            {board ? (cups ? `☕ ${cups} ly đã được mời — cảm ơn mọi người!` : 'Chưa có ly nào trong lọ.') : 'Đang đếm ly…'}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close thank-you board (Esc)"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#fbf1d2]/20 bg-black/15 text-[#fbf1d2] transition hover:bg-black/30 focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="min-h-40 flex-1 space-y-3 overflow-y-auto overscroll-contain px-5 py-5">
        {myCup && (
          <p className="rounded-lg border border-[#e8b27d]/40 bg-black/25 px-3 py-2 text-xs leading-relaxed text-[#f3cfa8]">
            Ly của bạn đang trên bàn rồi ☕ Tên bạn sẽ lên bảng sau khi Bin kiểm tra chuyển khoản.
          </p>
        )}

        {board && cups === 0 && (
          <p className="py-8 text-center text-sm text-[#e6cfae]">Bảng còn trống — bạn muốn là người đầu tiên?</p>
        )}

        <ol className="space-y-3">
          {shown.map((s) => (
            <li key={s.id} className={`relative rounded-sm bg-[#fbf1d2] px-4 pb-3 pt-4 text-[#2a1a10] shadow-[0_6px_14px_-6px_rgba(0,0,0,0.7)] ${pick(TILTS, s.id)}`}>
              <span aria-hidden className={`absolute left-1/2 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full shadow-[0_1px_0_rgba(0,0,0,0.4)] ${pick(PINS, s.id)}`} />
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate font-semibold">{s.name || 'Một người bạn'}</p>
                <p className="shrink-0 text-[11px] text-[#8a6a4a]">{ago(s.at)}</p>
              </div>
              <p className="mt-0.5 text-xs text-[#7a5a3a]">
                mời Bin {s.drink.icon} {s.drink.label.toLowerCase()}
              </p>
              {s.message && <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed">“{s.message}”</p>}
            </li>
          ))}
        </ol>

        {hidden > 0 && <p className="pt-1 text-center text-xs text-[#e6cfae]">+ {hidden} người bạn giấu tên ☕</p>}
      </div>

      <div className="border-t-2 border-[#3a2414] bg-[#6b4527] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <button
          type="button"
          onClick={onDonate}
          className="w-full rounded-full bg-[#e8b27d] py-3 font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
        >
          Mời Bin 1 ly cà phê ☕
        </button>
      </div>
    </section>
  )
}
