'use client'

// Mèo đi chơi xa (trip.ts): lời mời tiễn mèo trong tổng kết phin, bưu thiếp lật hai mặt khi
// mèo về, và sổ bưu thiếp trong Kệ sưu tầm. Mặt trước là ảnh phố thật của điểm đến (đúng
// buổi lúc mèo đi) + tem + dấu bưu điện vẽ bằng code, mặt sau là lời mèo kể.

import {useEffect, useRef, useState} from 'react'
import {useLang, useT} from './i18n'
import {ItemIcon} from './ShelfBook'
import type {TimeOfDay} from './scene'
import {storyOf, type Postcard} from './trip'

// Lời mời trong tổng kết phin (Focus.tsx): Tiễn mèo đi / Để mai
// `sent` = mèo đã lên đường (chuyến đi đã lưu) → thay lời mời bằng lời chào tạm biệt
export function TripOffer({place, sent, onSend, onLater}: {place: string; sent: boolean; onSend: () => void; onLater: () => void}) {
  const t = useT()
  return (
    <div className="mt-3 rounded-xl border border-[#86b7d6]/35 bg-[#86b7d6]/[0.07] px-3 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#a9cde6]">{t.trip.offerTag}</p>
      {sent ? (
        <p className="mt-1 text-sm leading-relaxed text-[#ede6dd] motion-safe:animate-[chill-pop_0.35s_ease-out]">{t.trip.sent(place)}</p>
      ) : (
        <>
          <p className="mt-1 text-sm leading-relaxed text-[#ede6dd]">{t.trip.offer(place)}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSend}
              className="rounded-full bg-[#e8b27d] px-3.5 py-1.5 text-xs font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
            >
              {t.trip.send}
            </button>
            <button
              type="button"
              onClick={onLater}
              className="rounded-full border border-white/15 px-3.5 py-1.5 text-xs text-[#d8cfc4] transition hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
            >
              {t.trip.later}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// Tem góc trên phải mặt trước
function Stamp() {
  return (
    <span aria-hidden className="absolute right-2 top-2 flex rotate-[4deg] flex-col items-center">
      <span className="flex h-[46px] w-[38px] items-center justify-center bg-[#fbf3dc] p-[3px] [mask-image:radial-gradient(circle_at_3px_3px,transparent_1.6px,#000_1.8px)] [mask-position:-3px_-3px] [mask-size:6px_6px]">
        <span className="flex h-full w-full flex-col items-center justify-center gap-0.5 bg-[#d4553a] text-[#fbf3dc]">
          <svg width="18" height="14" viewBox="0 0 9 7" shapeRendering="crispEdges">
            <path d="M1 0h1v1H1zM6 0h1v1H6zM1 1h6v1H1zM0 2h8v3H0zM1 5h6v1H1zM2 6h1v1H2zM5 6h1v1H5z" fill="#fbf3dc" />
            <path d="M2 3h1v1H2zM5 3h1v1H5z" fill="#d4553a" />
          </svg>
          <span className="font-mono text-[7px] font-bold leading-none">VN</span>
        </span>
      </span>
    </span>
  )
}

export function PostcardDialog({
  card,
  fresh,
  placeName,
  img,
  onVisit,
  onClose,
}: {
  card: Postcard | null
  // Vừa nhận (mèo mới về): hiện dấu MỚI + món kệ đi kèm
  fresh: boolean
  placeName: (id: string) => string
  img: (place: string, time: TimeOfDay) => string | null
  onVisit: (place: string) => void
  onClose: () => void
}) {
  const t = useT()
  const lang = useLang()
  const [back, setBack] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBack(false)
    if (card) closeRef.current?.focus({preventScroll: true})
  }, [card])
  useEffect(() => {
    if (!card) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [card, onClose])
  if (!card) return null
  const name = placeName(card.place) || card.place
  const src = img(card.place, card.time)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={t.trip.postcardAria(name)} onClick={(e) => e.stopPropagation()} className="w-full max-w-[420px] motion-safe:animate-[chill-pop_0.35s_ease-out]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#f3cfa8]">{fresh ? t.trip.backTitle : t.trip.album}</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t.trip.close}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-black/40 text-[#fbf1d2] transition hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden>
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setBack((b) => !b)}
          aria-label={back ? t.trip.flipFront : t.trip.flipBack}
          className="group block w-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b27d]"
        >
          {/* Lật: đổi mặt, mặt mới bật ra (bản 3D backface không ổn định trên Safari / Chrome) */}
          <span key={back ? 'back' : 'front'} className="relative block aspect-[3/2] w-full motion-safe:animate-[chill-pop_0.35s_ease-out]">
            {!back ? (
              <span className="absolute inset-0 overflow-hidden rounded-md border-[6px] border-[#fbf3dc] bg-[#2a1a10] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]">
                {src && <img src={src} alt={t.trip.frontAlt(name)} className="h-full w-full object-cover [image-rendering:pixelated]" />}
                <span className="absolute bottom-2 left-2 rounded-sm bg-black/45 px-1.5 py-0.5 font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-[#fbf3dc]">{t.trip.greetings(name)}</span>
                <Stamp />
                {fresh && <span className="absolute left-2 top-2 rotate-[-6deg] rounded-sm bg-[#d4553a] px-1.5 font-mono text-[10px] font-bold leading-[18px] text-white shadow-[0_1px_0_#7d2a1c]">{t.trip.newStamp}</span>}
              </span>
            ) : (
              <span className="absolute inset-0 flex rounded-md bg-[#fbf3dc] p-4 text-left shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]">
                <span className="flex min-w-0 flex-1 flex-col gap-2 pr-3">
                  <span className="text-[15px] italic leading-snug text-[#3a2414]">“{storyOf(card.place, lang, card.at)}”</span>
                  <span className="mt-auto font-mono text-[10px] uppercase tracking-wider text-[#7a5a40]">{t.trip.signed}</span>
                </span>
                <span className="flex w-[38%] shrink-0 flex-col gap-1.5 border-l border-dashed border-[#a8784a]/50 pl-3 font-mono text-[10px] uppercase leading-relaxed tracking-wider text-[#7a5a40]">
                  <span>{t.trip.from(name)}</span>
                  <span>{card.at.split('-').reverse().join('/')}</span>
                  <span className="mt-1 h-px bg-[#a8784a]/40" />
                  <span className="h-px bg-[#a8784a]/40" />
                  <span className="h-px bg-[#a8784a]/40" />
                </span>
              </span>
            )}
          </span>
        </button>
        <p className="mt-2 text-center text-[11px] text-[#d8cfc4]">{back ? t.trip.flipFront : t.trip.flipBack}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#16131a]/90 px-3 py-2.5">
          {card.item && (
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <ItemIcon id={card.item} scale={2} className="shrink-0" />
              <span className="min-w-0 text-xs leading-snug text-[#ede6dd]">{fresh ? t.trip.souvenir(t.shelf.items[card.item]?.name ?? '') : t.shelf.items[card.item]?.name}</span>
            </span>
          )}
          {!card.item && <span className="min-w-0 flex-1 text-xs text-[#a79e94]">{t.trip.onlyCard}</span>}
          <button
            type="button"
            onClick={() => onVisit(card.place)}
            className="shrink-0 rounded-full bg-[#e8b27d] px-3 py-1.5 text-xs font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]"
          >
            {t.trip.visit(name)}
          </button>
        </div>
      </section>
    </div>
  )
}

// Sổ bưu thiếp trong Kệ sưu tầm: mọi điểm đến đang mở, tấm chưa có là bóng mờ
export function PostcardAlbum({
  places,
  cards,
  placeName,
  img,
  onOpen,
}: {
  places: string[]
  cards: Postcard[]
  placeName: (id: string) => string
  img: (place: string, time: TimeOfDay) => string | null
  onOpen: (card: Postcard) => void
}) {
  const t = useT()
  const got = new Map(cards.map((c) => [c.place, c]))
  // Tấm đã có của nơi nay đã ẩn vẫn giữ trong sổ
  const all = [...places, ...cards.map((c) => c.place).filter((p) => !places.includes(p))]
  return (
    <div className="mt-5 border-t-2 border-[#3a2414] pt-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-[#fbf1d2]">{t.trip.album}</h3>
        <span className="font-mono text-[11px] text-[#e6cfae]">{t.trip.albumCount(got.size, all.length)}</span>
      </div>
      <p className="mt-0.5 text-xs text-[#e6cfae]">{t.trip.albumHint}</p>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {all.map((place) => {
          const card = got.get(place)
          const name = placeName(place) || place
          const src = card ? img(place, card.time) : img(place, 'afternoon')
          return (
            <li key={place}>
              <button
                type="button"
                disabled={!card}
                onClick={() => card && onOpen(card)}
                aria-label={card ? t.trip.postcardAria(name) : t.trip.missing(name)}
                className={`group relative block aspect-[3/2] w-full overflow-hidden rounded-[3px] border-[3px] text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d] ${
                  card ? 'border-[#fbf3dc] hover:-rotate-2 hover:scale-105' : 'border-dashed border-[#fbf1d2]/20 bg-black/20'
                }`}
              >
                {src && <img src={src} alt="" loading="lazy" className={`h-full w-full object-cover [image-rendering:pixelated] ${card ? '' : 'opacity-15 grayscale'}`} />}
                <span className={`absolute inset-x-0 bottom-0 truncate px-1 py-0.5 text-[10px] font-medium ${card ? 'bg-black/45 text-[#fbf3dc]' : 'text-[#e6cfae]/70'}`}>{name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
