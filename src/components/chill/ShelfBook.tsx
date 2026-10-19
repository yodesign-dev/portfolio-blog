'use client'

// Sổ sưu tầm trang /chill — mở khi bấm một món trên kệ, nút "Xem kệ" trong tổng kết phin
// hoặc dòng kệ dưới thẻ khách quen. Cùng khung gỗ với bảng cảm ơn: popup giữa màn
// (desktop) / sheet từ dưới lên (điện thoại).
//
// Lưới đủ 20 món: món đã có hiện hình, món chưa có là bóng tối + gợi ý cách có
// (kiểu Spirit City). Chọn 1 món để đọc chuyện của nó và bày lên / cất khỏi kệ.

import {useEffect, useRef} from 'react'
import {useT} from './i18n'
import {ITEMS, drawItem, itemById, spriteSize, type ShelfItem, type ShelfState} from './shelf'

// Hình món vẽ lên canvas nhỏ, phóng nguyên ô cho sắc nét
export function ItemIcon({id, scale = 3, shadow = false, className = ''}: {id: string; scale?: number; shadow?: boolean; className?: string}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const item = itemById(id)
  useEffect(() => {
    const c = ref.current
    if (!c || !item) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    drawItem(ctx, item, c.width / 2, c.height, scale, shadow ? 'rgba(20,10,4,0.55)' : undefined)
  }, [item, scale, shadow])
  if (!item) return null
  const {w, h} = spriteSize(item)
  return <canvas ref={ref} width={w * scale} height={h * scale} aria-hidden className={`[image-rendering:pixelated] ${className}`} />
}

export function Shelf({
  open,
  onClose,
  state,
  selected,
  onSelect,
  onToggle,
  slots,
  placeName,
}: {
  open: boolean
  onClose: () => void
  state: ShelfState
  selected: string | null
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  // Số ô của kệ trong phòng đang chọn
  slots: number
  // id điểm đến → tên hiển thị (Studio), cho gợi ý món theo điểm đến
  placeName: (id: string) => string
}) {
  const t = useT()
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (open) closeRef.current?.focus({preventScroll: true})
  }, [open])

  const owned = new Map(state.owned.map((o) => [o.id, o.at]))
  const pick = selected ? itemById(selected) : undefined
  const hint = (item: ShelfItem) =>
    item.kind === 'regular'
      ? t.shelf.hint.regular(item.phins ?? 0)
      : item.kind === 'place'
        ? t.shelf.hint.place((item.places ?? []).map(placeName).join(' / '))
        : t.shelf.hint[item.kind]
  const shownAt = (id: string) => state.shown.indexOf(id)

  return (
    <section
      id="chill-shelf"
      role="dialog"
      aria-label={t.shelf.title}
      inert={!open}
      aria-modal="true"
      onKeyDown={(e) => {
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
      className={`absolute inset-x-0 bottom-0 z-40 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl border-2 border-[#3a2414] bg-[#5e3d22] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] transition-all duration-300 ease-out lg:inset-x-auto lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:max-h-[min(680px,calc(100dvh-140px))] lg:w-[460px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl ${
        open ? 'translate-y-0 opacity-100 lg:scale-100' : 'pointer-events-none translate-y-6 opacity-0 lg:scale-95'
      }`}
      style={{
        backgroundImage:
          'repeating-linear-gradient(180deg, rgba(0,0,0,0) 0 46px, rgba(30,16,6,0.55) 46px 48px), repeating-linear-gradient(90deg, rgba(255,220,170,0.035) 0 3px, rgba(0,0,0,0.03) 3px 9px)',
      }}
    >
      <header className="flex items-start gap-3 border-b-2 border-[#3a2414] bg-[#6b4527] px-5 py-4 shadow-[inset_0_-2px_0_rgba(255,220,170,0.08)]">
        <ItemIcon id="porcelain-cup" scale={2} className="mt-1 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight text-[#fbf1d2]">{t.shelf.title}</h2>
          <p className="mt-0.5 text-xs text-[#e6cfae]">{t.shelf.count(owned.size, ITEMS.length)}</p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t.shelf.close}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#fbf1d2]/20 bg-black/15 text-[#fbf1d2] transition hover:bg-black/30 focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        <p className="text-xs leading-relaxed text-[#e6cfae]">{t.shelf.intro}</p>

        {/* Món đang chọn */}
        {pick && (
          <div className="mt-3 flex gap-4 rounded-sm bg-[#fbf1d2] px-4 py-3 text-[#2a1a10] shadow-[0_6px_14px_-6px_rgba(0,0,0,0.7)]" aria-live="polite">
            <div className="flex h-[60px] w-[60px] shrink-0 items-end justify-center">
              <ItemIcon id={pick.id} scale={4} shadow={!owned.has(pick.id)} />
            </div>
            <div className="min-w-0 flex-1">
              {owned.has(pick.id) ? (
                <>
                  <p className="font-semibold">{t.shelf.items[pick.id]?.name}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-[#5a4030]">{t.shelf.items[pick.id]?.story}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="mr-auto font-mono text-[10px] uppercase tracking-wider text-[#8a6a50]">{t.shelf.got(owned.get(pick.id) ?? '')}</span>
                    <button
                      type="button"
                      onClick={() => onToggle(pick.id)}
                      aria-pressed={shownAt(pick.id) >= 0}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a5a2b] ${
                        shownAt(pick.id) >= 0 ? 'border border-[#8a6a50]/50 text-[#5a4030] hover:bg-black/5' : 'bg-[#8a5a2b] text-[#fbf1d2] hover:bg-[#9c6a36]'
                      }`}
                    >
                      {shownAt(pick.id) >= 0 ? t.shelf.takeDown : t.shelf.putUp}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-semibold text-[#8a6a50]">{t.shelf.unknown}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-[#5a4030]">{hint(pick)}</p>
                </>
              )}
            </div>
          </div>
        )}

        <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {ITEMS.map((item) => {
            const have = owned.has(item.id)
            const at = shownAt(item.id)
            const hidden = at >= slots
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-pressed={selected === item.id}
                  aria-label={have ? t.shelf.items[item.id]?.name : `${t.shelf.unknown} — ${hint(item)}`}
                  className={`relative flex h-[72px] w-full flex-col items-center justify-end gap-1 rounded-lg border px-1 pb-1.5 transition focus-visible:outline-2 focus-visible:outline-[#e8b27d] ${
                    selected === item.id ? 'border-[#e8b27d] bg-black/30' : 'border-[#fbf1d2]/10 bg-black/15 hover:bg-black/25'
                  }`}
                >
                  <ItemIcon id={item.id} scale={3} shadow={!have} />
                  {at >= 0 && (
                    <span
                      aria-hidden
                      title={t.shelf.onShelf}
                      className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${hidden ? 'border border-[#e8b27d]/70' : 'bg-[#e8b27d]'}`}
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        {state.shown.length > slots && <p className="mt-3 text-xs text-[#e6cfae]">{t.shelf.slots(slots)}</p>}
      </div>
    </section>
  )
}
