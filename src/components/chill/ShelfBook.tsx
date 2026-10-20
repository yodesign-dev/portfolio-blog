'use client'

// Sổ sưu tầm trang /chill — mở khi bấm một món trên kệ, nút "Xem kệ" trong tổng kết phin
// hoặc dòng kệ dưới thẻ khách quen. Cùng khung gỗ với bảng cảm ơn: popup giữa màn
// (desktop) / sheet từ dưới lên (điện thoại).
//
// Lưới đủ 20 món: món đã có hiện hình, món chưa có là bóng tối + điều kiện ngắn ngay dưới
// (kiểu Spirit City). Chọn 1 món để đọc chuyện của nó và bày lên / cất khỏi kệ.
// Đầu bảng: 3 bước "pha phin → mèo mang món → bày lên bậu cửa", món tiếp theo kèm thanh
// tiến độ (mặc định chọn sẵn món này) và nút "Pha một phin" mở thẳng đồng hồ phin.
// Độ hiếm (shelf.ts: rarityOf) quyết định khung: gỗ (thường), đồng + vệt sáng (theo dịp),
// vàng + lớp hologram (rất hiếm). Món đang chọn hiện thành thẻ sưu tầm: số thứ tự, đế gỗ,
// món lơ lửng, dòng ngữ cảnh lúc nhận (trời / nơi / phin thứ mấy).
// GiftReveal: túi giấy mèo mang ra trong tổng kết phin (Focus.tsx) — bấm thì mở, món bật lên.

import {useEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react'
import {useT} from './i18n'
import {ITEMS, drawItem, itemById, nextRegular, phinsLeft, rarityOf, spriteSize, type GiftContext, type Rarity, type ShelfItem, type ShelfState} from './shelf'

// Màu khung theo độ hiếm
const RARITY_COLOR: Record<Rarity, string> = {common: '#a8784a', place: '#d0864c', rare: '#f2cf6b'}

// Biểu tượng điều kiện 7×7 vẽ bằng ô vuông (emoji 🌫 không có trên mọi máy)
const COND_ICONS: Record<'cup' | 'pin' | 'rain' | 'mist' | 'night', {rows: string[]; palette: Record<string, string>}> = {
  cup: {rows: ['.......', '.ooooo.', '.oooooo', '.ooooo.o', '.oooooo', '..ooo..', '.......'], palette: {o: '#e6cfae'}},
  pin: {rows: ['..ooo..', '.orrro.', '.orrro.', '..ooo..', '...o...', '...o...', '...o...'], palette: {o: '#e6cfae', r: '#d4553a'}},
  rain: {rows: ['...b...', '..bbb..', '.bbbbb.', '.bbbbb.', '..bbb..', '.......', '.......'], palette: {b: '#8fc4ff'}},
  mist: {rows: ['.......', '.ggggg.', '.......', 'ggggg..', '.......', '..ggggg', '.......'], palette: {g: '#d8d2c6'}},
  night: {rows: ['..yyy..', '.yy....', 'yy.....', 'yy.....', 'yy.....', '.yy....', '..yyy..'], palette: {y: '#f2cf6b'}},
}
function CondIcon({item}: {item: ShelfItem}) {
  const icon = COND_ICONS[item.kind === 'regular' ? 'cup' : item.kind === 'place' ? 'pin' : item.kind]
  return (
    <svg aria-hidden width="10" height="10" viewBox="0 0 8 7" shapeRendering="crispEdges" className="shrink-0">
      {icon.rows.flatMap((row, y) => [...row].map((ch, x) => (icon.palette[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={icon.palette[ch]} /> : null)))}
    </svg>
  )
}

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
  phins,
  onBrew,
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
  // Tổng số phin đã xong (thẻ khách quen) — cho thanh tiến độ món tiếp theo
  phins: number
  // Nút "Pha một phin": đóng kệ, mở đồng hồ phin
  onBrew: () => void
}) {
  const t = useT()
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (open) closeRef.current?.focus({preventScroll: true})
  }, [open])

  const owned = new Map(state.owned.map((o) => [o.id, o.at]))
  const next = nextRegular(state)
  // Chưa chọn gì → chọn sẵn món tiếp theo để khách biết mình đang nhắm tới gì
  const pick = selected ? itemById(selected) : next
  const left = pick?.kind === 'regular' ? phinsLeft(state, pick, phins) : 0
  // Tên điểm đến của món (bỏ điểm đã ẩn trong Studio, bỏ tên trùng như 2 bản Hà Nội)
  const places = (item: ShelfItem) => [...new Set((item.places ?? []).map(placeName).filter(Boolean))]
  const tag = (item: ShelfItem) =>
    item.kind === 'regular'
      ? t.shelf.tag.regular(item.phins ?? 0)
      : item.kind === 'place'
        ? t.shelf.tag.place(places(item)[0] ?? '')
        : t.shelf.tag[item.kind]
  const hint = (item: ShelfItem) =>
    item.kind === 'regular'
      ? t.shelf.hint.regular(item.phins ?? 0)
      : item.kind === 'place'
        ? t.shelf.hint.place(places(item).join(' / '))
        : t.shelf.hint[item.kind]
  const ctxOf = (id: string) => state.owned.find((o) => o.id === id)?.ctx
  const ctxLine = (c: GiftContext | undefined) =>
    c
      ? [c.place ? placeName(c.place) : '', c.weather && c.weather !== 'clear' ? t.shelf.ctx.weather[c.weather] : c.time ? t.shelf.ctx.time[c.time] : '', c.phin ? t.shelf.ctx.phin(c.phin) : ''].filter(Boolean)
      : []
  const unseen = new Set(state.unseen ?? [])
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
        <ItemIcon id="porcelain-cup" scale={1} className="mt-1 shrink-0" />
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
        <ol className="grid grid-cols-3 gap-1.5 text-center" aria-label={t.shelf.intro}>
          {t.shelf.steps.map((step, i) => (
            <li key={step} className="flex flex-col items-center gap-1 rounded-lg border border-[#fbf1d2]/10 bg-black/15 px-1.5 py-2 text-[11px] leading-snug text-[#f3e3c3]">
              <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e8b27d] font-mono text-[11px] font-bold text-[#2a1a10]">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        {/* Món đang chọn = thẻ sưu tầm */}
        {pick && (
          <CollectorCard
            item={pick}
            have={owned.has(pick.id)}
            number={ITEMS.indexOf(pick) + 1}
            label={owned.has(pick.id) ? t.shelf.items[pick.id]?.name : pick.id === next?.id ? t.shelf.next : t.shelf.unknown}
          >
            {owned.has(pick.id) ? (
              <>
                <p className="mt-0.5 text-[13px] leading-snug text-[#5a4030]">{t.shelf.items[pick.id]?.story}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[t.shelf.got(owned.get(pick.id) ?? ''), ...ctxLine(ctxOf(pick.id))].map((c) => (
                    <span key={c} className="rounded border border-[#2a1a10]/15 bg-[#2a1a10]/[0.06] px-1.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#5a4030]">
                      {c}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onToggle(pick.id)}
                  aria-pressed={shownAt(pick.id) >= 0}
                  className={`mt-3 w-full rounded-full py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a5a2b] ${
                    shownAt(pick.id) >= 0 ? 'border border-[#8a6a50]/50 text-[#5a4030] hover:bg-black/5' : 'bg-[#8a5a2b] text-[#fbf1d2] hover:bg-[#9c6a36]'
                  }`}
                >
                  {shownAt(pick.id) >= 0 ? t.shelf.takeDown : t.shelf.putUp}
                </button>
              </>
            ) : (
              <>
                <p className="mt-0.5 text-[13px] font-medium leading-snug text-[#5a4030]">{hint(pick)}</p>
                {pick.kind === 'regular' && (
                  <>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#8a6a50]/20" role="progressbar" aria-valuemin={0} aria-valuemax={phins + left} aria-valuenow={phins}>
                      <div className="h-full rounded-full bg-[#8a5a2b]" style={{width: `${(phins / (phins + left || 1)) * 100}%`}} />
                    </div>
                    <p className="mt-1 text-xs text-[#8a6a50]">{t.shelf.left(left)}</p>
                  </>
                )}
              </>
            )}
          </CollectorCard>
        )}

        <button
          type="button"
          onClick={onBrew}
          className="mt-3 w-full rounded-full bg-[#e8b27d] py-2.5 text-sm font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fbf1d2]"
        >
          {t.shelf.brew}
        </button>
        <p className="mt-2 text-[11px] leading-snug text-[#e6cfae]/80">{t.shelf.rare}</p>

        <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {ITEMS.map((item) => {
            const have = owned.has(item.id)
            const at = shownAt(item.id)
            const hidden = at >= slots
            const r = rarityOf(item)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-pressed={pick?.id === item.id}
                  aria-label={have ? t.shelf.items[item.id]?.name : `${t.shelf.unknown} — ${hint(item)}`}
                  style={{'--frame': RARITY_COLOR[r]} as CSSProperties}
                  className={`group relative flex h-[88px] w-full flex-col items-center justify-end gap-1 overflow-hidden rounded-lg border-2 px-1 pb-1.5 transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-[#e8b27d] ${
                    pick?.id === item.id ? 'shadow-[0_0_0_2px_#fbf1d2]' : ''
                  } ${
                    !have
                      ? r === 'common'
                        ? 'border-[#fbf1d2]/10 bg-black/20'
                        : 'border-[color-mix(in_srgb,var(--frame)_40%,transparent)] bg-black/20'
                      : r === 'common'
                        ? 'border-[color-mix(in_srgb,var(--frame)_55%,transparent)] bg-black/15'
                        : 'border-[var(--frame)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--frame)_24%,transparent),rgba(0,0,0,0.2))]'
                  }`}
                >
                  {/* Món rất hiếm: lớp màu hologram chạy chậm */}
                  {have && r === 'rare' && (
                    <span
                      aria-hidden
                      className="chill-motion pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,120,180,0.14),rgba(120,200,255,0.14),rgba(255,230,120,0.16),rgba(160,255,190,0.14))] bg-[length:300%_300%] [animation:chill-holo_5s_ease_infinite]"
                    />
                  )}
                  {/* Theo dịp + rất hiếm: vệt sáng quét qua khi rê chuột */}
                  {have && r !== 'common' && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(115deg,transparent_35%,rgba(255,240,200,0.35)_50%,transparent_65%)] transition-transform duration-700 group-hover:translate-x-full"
                    />
                  )}
                  <span aria-hidden className="absolute left-1.5 top-1 font-mono text-[9px] text-[#fbf1d2]/40">
                    {String(ITEMS.indexOf(item) + 1).padStart(2, '0')}
                  </span>
                  {r !== 'common' && <span aria-hidden className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rotate-45 bg-[var(--frame)]" />}
                  {unseen.has(item.id) && (
                    <span className="absolute left-1/2 top-1 -translate-x-1/2 rotate-[-6deg] rounded-sm bg-[#d4553a] px-1 font-mono text-[8px] font-bold leading-[13px] text-white shadow-[0_1px_0_#7d2a1c]">
                      {t.shelf.newStamp}
                    </span>
                  )}
                  <ItemIcon id={item.id} scale={2} shadow={!have} className={have ? 'chill-motion relative [animation:chill-float_3.2s_ease-in-out_infinite]' : 'relative'} />
                  {!have && (
                    <span className="relative flex max-w-full items-center gap-1 truncate text-[10px] leading-none text-[#e6cfae]/85">
                      <CondIcon item={item} />
                      {tag(item)}
                    </span>
                  )}
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

// Thẻ sưu tầm của món đang chọn: số thứ tự, nhãn độ hiếm, món lơ lửng trên đế gỗ (rất hiếm có
// tia sáng xoay phía sau). Món chưa có thì hiện bóng tối
function CollectorCard({item, have, number, label, children}: {item: ShelfItem; have: boolean; number: number; label?: string; children: ReactNode}) {
  const t = useT()
  const r = rarityOf(item)
  const stage =
    r === 'rare'
      ? 'bg-[radial-gradient(circle_at_50%_62%,#fff8d2,transparent_60%),linear-gradient(#f6e3a0,#e2c06a)]'
      : r === 'place'
        ? 'bg-[radial-gradient(circle_at_50%_65%,#ffdcb4,transparent_62%),linear-gradient(#f1d3b0,#dcae80)]'
        : 'bg-[radial-gradient(circle_at_50%_70%,rgba(255,255,255,0.9),transparent_60%),linear-gradient(#efe0bb,#e2cf9f)]'
  return (
    <div
      className="mt-3 overflow-hidden rounded-xl border-[3px] bg-[#fbf1d2] p-3 text-[#2a1a10] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.8)]"
      style={{borderColor: RARITY_COLOR[r]}}
      aria-live="polite"
    >
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#8a6a50]">
        <span>{t.shelf.number(number, ITEMS.length)}</span>
        <span className="rounded-full px-2 py-0.5 font-bold text-[#2a1a10]" style={{background: RARITY_COLOR[r]}}>
          {t.shelf.rarity[r]}
        </span>
      </div>
      <div className={`relative mt-2 flex h-[150px] items-end justify-center overflow-hidden rounded-lg ${stage}`}>
        {have && r === 'rare' && (
          <span
            aria-hidden
            className="chill-motion absolute inset-[-40%] bg-[repeating-conic-gradient(rgba(255,255,255,0.45)_0_5deg,transparent_5deg_20deg)] [animation:chill-spin_14s_linear_infinite] [mask-image:radial-gradient(#000_15%,transparent_60%)]"
          />
        )}
        <span aria-hidden className="relative mb-4 h-5 w-32 rounded-[50%] bg-[radial-gradient(#7a4f2c_40%,#4a2f1a)] shadow-[0_8px_14px_-6px_rgba(0,0,0,0.5)]" />
        <span className={`absolute bottom-7 left-1/2 -translate-x-1/2 ${have ? '' : 'opacity-60'}`}>
          <ItemIcon
            id={item.id}
            scale={4}
            shadow={!have}
            className={have ? 'chill-motion [animation:chill-float_3.6s_ease-in-out_infinite] drop-shadow-[0_6px_0_rgba(0,0,0,0.18)]' : ''}
          />
        </span>
      </div>
      <p className={`mt-2.5 text-lg font-semibold leading-tight ${have ? '' : 'text-[#8a6a50]'}`}>{label}</p>
      {children}
    </div>
  )
}

// Túi giấy mèo mang ra sau phin: lắc nhẹ chờ khách bấm, bấm thì túi xẹp, món bật lên với vầng
// sáng theo độ hiếm, chùm sao pixel và vài nốt "ting" (Web Audio, nhỏ). Giảm chuyển động →
// mở ngay, không chùm sao
export function GiftReveal({id, onSeeShelf}: {id: string; onSeeShelf: () => void}) {
  const t = useT()
  const item = itemById(id)
  const [open, setOpen] = useState(false)
  if (!item) return null
  const r = rarityOf(item)
  const color = RARITY_COLOR[r]
  const unwrap = () => {
    setOpen(true)
    ting(r)
  }
  return (
    <div className="relative mt-3 overflow-hidden rounded-xl border px-3 py-3" style={{borderColor: `${color}66`, background: `${color}14`}}>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e8b27d]">{t.shelf.gift}</p>
      <div className="relative mt-1 flex h-[112px] items-end justify-center">
        {!open ? (
          <button
            type="button"
            onClick={unwrap}
            aria-label={t.shelf.openBagAria}
            className="group flex flex-col items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
          >
            <span className="rounded-md border border-[#e8b27d]/50 bg-black/50 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#fbf1d2]">{t.shelf.openBag}</span>
            <PaperBag />
          </button>
        ) : (
          <>
            <span aria-hidden className="chill-motion absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 [animation:chill-glow_2s_ease-in-out_infinite]" style={{background: `radial-gradient(${color}, transparent 65%)`}} />
            {r === 'rare' && (
              <span aria-hidden className="chill-motion absolute left-1/2 top-1/2 -ml-[110px] -mt-[110px] h-[220px] w-[220px] rounded-full opacity-25 [animation:chill-spin_9s_linear_infinite] [mask-image:radial-gradient(#000_20%,transparent_70%)]" style={{background: `repeating-conic-gradient(${color} 0 6deg, transparent 6deg 24deg)`}} />
            )}
            <Burst rarity={r} />
            <span className="chill-motion relative mb-1 [animation:chill-rise_0.7s_cubic-bezier(0.2,1.6,0.4,1)_both]">
              <ItemIcon id={item.id} scale={3} />
            </span>
          </>
        )}
      </div>
      {open && (
        <div className="relative mt-2 flex items-center gap-2 motion-safe:animate-[chill-pop_0.35s_ease-out]">
          <span className="rotate-[-6deg] rounded-sm bg-[#d4553a] px-1.5 font-mono text-[10px] font-bold leading-[18px] text-white shadow-[0_1px_0_#7d2a1c]">{t.shelf.newStamp}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#f3ece4]">{t.shelf.items[item.id]?.name}</p>
            <p className="font-mono text-[10px] uppercase tracking-wider" style={{color}}>
              {t.shelf.rarity[r]}
            </p>
          </div>
          <button
            type="button"
            onClick={onSeeShelf}
            className="shrink-0 rounded-full border border-[#e8b27d]/50 px-2.5 py-1 text-xs text-[#f3cfa8] transition hover:bg-[#e8b27d]/10 focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
          >
            {t.shelf.seeShelf}
          </button>
        </div>
      )}
    </div>
  )
}

const BAG = {
  rows: ['....oooooo....', '...okkkkkko...', '..okKkkkKkko..', '..oooooooooo..', '..okkkkkkkko..', '.okkkkkkkkkko.', '.okkkkppkkkko.', '.okkkpppPkkko.', '.okkkkppkkkko.', '.okkkkkkkkkko.', '.okkkkkkkkkko.', '.oKkkkkkkkkKo.', '..oooooooooo..'],
  palette: {o: '#4a2f1a', k: '#c99a62', K: '#a87a48', p: '#7a4f2c', P: '#8a5a2b'} as Record<string, string>,
}
function PaperBag() {
  return (
    <svg aria-hidden width={56} height={52} viewBox="0 0 14 13" shapeRendering="crispEdges" className="chill-motion origin-bottom [animation:chill-wiggle_1.4s_ease-in-out_infinite] group-hover:[animation-duration:0.7s]">
      {BAG.rows.flatMap((row, y) => [...row].map((ch, x) => (BAG.palette[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={BAG.palette[ch]} /> : null)))}
    </svg>
  )
}

// Chùm sao bay ra khi mở túi, nhiều + to hơn theo độ hiếm
function Burst({rarity}: {rarity: Rarity}) {
  const [stars] = useState(() => {
    const n = rarity === 'rare' ? 26 : rarity === 'place' ? 16 : 10
    const colors = rarity === 'rare' ? ['#fff3c4', '#f2cf6b', '#ffd6f0', '#c8f1ff'] : rarity === 'place' ? ['#fff3c4', '#f0b27a'] : ['#fff3c4']
    return Array.from({length: n}, (_, i) => {
      const a = Math.random() * Math.PI * 2
      const d = 50 + Math.random() * (rarity === 'rare' ? 90 : 60)
      return {dx: Math.cos(a) * d, dy: Math.sin(a) * d - 20, size: 6 + Math.round(Math.random() * (rarity === 'rare' ? 7 : 4)), delay: Math.random() * 0.15, color: colors[i % colors.length]}
    })
  })
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 motion-reduce:hidden">
      {stars.map((s, i) => (
        <svg
          key={i}
          width={s.size}
          height={s.size}
          viewBox="0 0 5 5"
          shapeRendering="crispEdges"
          className="absolute [animation:chill-fly_0.9s_ease-out_both]"
          style={{'--dx': `${s.dx}px`, '--dy': `${s.dy}px`, animationDelay: `${s.delay}s`} as CSSProperties}
        >
          <path d="M2 0h1v2h2v1H3v2H2V3H0V2h2z" fill={s.color} />
        </svg>
      ))}
    </span>
  )
}

// Vài nốt chuông nhỏ khi mở túi (không cần file nhạc). Lỗi / bị chặn âm thanh thì thôi
let giftAudio: AudioContext | null = null
function ting(rarity: Rarity) {
  try {
    giftAudio ??= new AudioContext()
    const notes = rarity === 'rare' ? [1318.5, 1568, 1975.5, 2637] : rarity === 'place' ? [1318.5, 1975.5, 2349.3] : [1318.5, 1975.5]
    notes.forEach((f, i) => {
      const ac = giftAudio!
      const o = ac.createOscillator()
      const g = ac.createGain()
      const at = ac.currentTime + i * 0.09
      o.type = 'triangle'
      o.frequency.value = f
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(0.06, at + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.6)
      o.connect(g).connect(ac.destination)
      o.start(at)
      o.stop(at + 0.65)
    })
  } catch {
    // Trình duyệt chặn âm thanh — mở túi vẫn chạy
  }
}
