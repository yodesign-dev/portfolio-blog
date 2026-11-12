'use client'

// Bàn pha phin của /chill (công tắc Studio brewDeskOpen, ?brew=1): tấm đồng hồ thay chỗ thanh
// nhạc trong lúc pha. Phần đếm giờ vẫn nằm ở Focus.tsx, file này chỉ vẽ.
//
// - Chữ số và phin vẽ bằng ô vuông SVG để nét như pixel art của quán ở mọi cỡ, không cần font
// - Mỗi ô dưới đồng hồ là 1 phút (phin dài hơn 60 phút thì mỗi ô là 2 phút)
// - Phin trên tấm đồng hồ cũng đầy dần: điện thoại cắt tranh dọc không thấy phin trên quầy,
//   và 2 phòng không có ly trong (xem themes.ts) chỉ có phin này

import {useEffect, useRef, useState, type ReactNode} from 'react'
import {useT} from './i18n'

// Phin ngắn hơn chừng này chỉ tính phút, không tính phin / quà kệ / thử thách chung
export const MIN_FULL_PHIN = 15
export const CUSTOM_MIN = 5
export const CUSTOM_MAX = 120
export const CUSTOM_STEP = 5

const GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ':': ['0', '1', '0', '0', '0', '1', '0'],
}

// Vẽ cùng bộ chữ số lên canvas (cửa sổ nổi dạng video của Safari). Trả về chiều rộng
export function drawPixelClock(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, px: number) {
  let at = 0
  for (const char of Array.from(text)) {
    const glyph = GLYPHS[char]
    if (!glyph) continue
    glyph.forEach((row, r) =>
      Array.from(row).forEach((on, c) => {
        if (on === '1') ctx.fillRect(x + (at + c) * px, y + r * px, px, px)
      })
    )
    at += glyph[0].length + 1
  }
  return (at - 1) * px
}

// Trạng thái phin gửi ra ngoài Focus cho cửa sổ nổi, màn hình khoá, giữ màn hình
export type BrewInfo = {
  clock: string
  leftMin: number
  progress: number
  minutes: number
  paused: boolean
  rest: boolean
  long: boolean
  running: boolean
  roundNow: number
  roundDots: number
  roundOf: number
  task?: string
  // Phin vừa xong, chưa bắt đầu gì tiếp
  finished: {minutes: number; task?: string; taskDone: boolean} | null
  rested: boolean
  nextBreak: number
  nextMinutes: number
}

export type BrewControls = {
  togglePause: () => void
  skipBreak: () => void
  takeBreak: () => void
  brewAgain: () => void
  finishTask: () => void
}

export function PixelClock({text, className = ''}: {text: string; className?: string}) {
  const cells: ReactNode[] = []
  let x = 0
  for (const [i, char] of Array.from(text).entries()) {
    const glyph = GLYPHS[char]
    if (!glyph) continue
    glyph.forEach((row, y) =>
      Array.from(row).forEach((on, col) => {
        if (on === '1') cells.push(<rect key={`${i}-${y}-${col}`} x={x + col} y={y} width={1.02} height={1.02} />)
      })
    )
    x += glyph[0].length + 1
  }
  return (
    <svg aria-hidden viewBox={`0 0 ${Math.max(1, x - 1)} 7`} fill="currentColor" shapeRendering="crispEdges" className={`block w-auto ${className}`}>
      {cells}
    </svg>
  )
}

// Phin nhôm trên ly, lưới 16×24. level 0…1 = cà phê trong ly
export function PhinSprite({level, dripping, className = ''}: {level: number; dripping: boolean; className?: string}) {
  const coffee = Math.round(Math.min(1, Math.max(0, level)) * 11)
  return (
    <svg aria-hidden viewBox="0 0 16 24" shapeRendering="crispEdges" className={`block w-auto shrink-0 ${className}`}>
      <rect x={5} y={0} width={6} height={1} fill="#b9bcc2" />
      <rect x={3} y={1} width={10} height={1} fill="#d5d7db" />
      <rect x={4} y={2} width={8} height={5} fill="#9a9da5" />
      <rect x={4} y={2} width={2} height={5} fill="#c2c4ca" />
      <rect x={1} y={7} width={14} height={1} fill="#d5d7db" />
      <rect x={2} y={8} width={12} height={1} fill="#7b7e86" />
      <rect x={6} y={9} width={4} height={1} fill="#7b7e86" />
      <rect x={3} y={10} width={10} height={13} fill="#574a44" />
      <rect x={4} y={10} width={8} height={12} fill="#2c2523" />
      {coffee > 0 && (
        <>
          <rect x={4} y={22 - coffee} width={8} height={coffee} fill="#7a4a24" />
          <rect x={4} y={22 - coffee} width={8} height={1} fill="#c98f55" />
        </>
      )}
      <rect x={3} y={23} width={10} height={1} fill="#8e8279" />
      {dripping && (
        <>
          <rect className="chill-brew-drop" x={7.5} y={10} width={1} height={1} fill="#c98f55" />
          <rect className="chill-brew-drop [animation-delay:0.55s]" x={7.5} y={10} width={1} height={1} fill="#c98f55" />
        </>
      )}
    </svg>
  )
}

export function BrewPlate({
  clock,
  ariaLabel,
  progress,
  minutes,
  paused,
  rest,
  long,
  task,
  roundNow,
  roundDots,
  roundOf,
  nextMinutes,
  compact,
  zen,
  dimmed,
  music,
  onPause,
  onDrop,
  onSkipBreak,
  onCompact,
  lite = false,
}: {
  clock: string
  ariaLabel: string
  progress: number
  minutes: number
  paused: boolean
  rest: boolean
  long: boolean
  task?: string
  roundNow: number
  roundDots: number
  roundOf: number
  nextMinutes: number
  compact: boolean
  zen: boolean
  dimmed: boolean
  music: ReactNode
  onPause: () => void
  // Bỏ phin / dừng nghỉ. Trong phút đầu của phin thì khỏi hỏi lại
  onDrop: () => void
  onSkipBreak: () => void
  onCompact: (compact: boolean) => void
  // Tập trung một chạm: hàng phin (giờ, việc, Tạm dừng, ⋯) và hàng nhạc riêng bên dưới
  lite?: boolean
}) {
  const t = useT()
  const [asking, setAsking] = useState(false)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menu) return
    const onDown = (e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      setMenu(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [menu])
  const count = minutes > 60 ? Math.ceil(minutes / 2) : minutes
  const doneBlocks = Math.floor(progress * count)
  const elapsedMin = Math.round(progress * minutes)
  const digitColor = rest ? 'text-[#e3f2e5] [filter:drop-shadow(0_0_10px_rgba(159,212,168,0.35))]' : 'text-[#f3cfa8] [filter:drop-shadow(0_0_10px_rgba(232,178,125,0.42))]'
  const frame = `pointer-events-auto rounded-2xl border bg-[#16131a]/90 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md transition-opacity duration-700 ${rest ? 'border-[#9fd4a8]/45' : 'border-[#e8b27d]/35'} ${dimmed ? 'opacity-70 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'}`
  const dots = (
    <span className="flex gap-1" role="img" aria-label={t.focus.chainAria(roundDots, roundOf)}>
      {Array.from({length: roundOf}).map((_, i) => (
        <span key={i} className={`size-2 ${i < roundDots ? (rest ? 'bg-[#9fd4a8]' : 'bg-[#e8b27d]') : 'border border-white/30'}`} />
      ))}
    </span>
  )
  const pauseButton = (
    <button
      type="button"
      onClick={onPause}
      className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#e8b27d] px-3.5 touch:h-11 text-[13px] font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]`}
    >
      <svg width="13" height="13" viewBox="0 0 15 15" fill="currentColor" aria-hidden>
        <path d={paused ? 'M3 1.5v12l10-6z' : 'M3 1.5h3.2v12H3zM8.8 1.5H12v12H8.8z'} />
      </svg>
      {paused ? t.focus.resume : t.focus.pause}
    </button>
  )
  const quiet = 'flex h-10 shrink-0 items-center justify-center rounded-full border border-white/15 px-3.5 touch:h-11 touch:min-w-11 text-[13px] text-[#c9c0b6] transition hover:bg-white/[0.06] hover:text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d]'

  if (compact || zen) {
    return (
      <div role="timer" aria-label={ariaLabel} className={`${frame} flex items-center gap-3 px-3 py-2`}>
        <PhinSprite level={rest ? 1 : progress} dripping={!rest && !paused} className="h-8" />
        <span className={`${digitColor} ${paused ? 'opacity-50' : ''}`}>
          <PixelClock text={clock} className="h-[21px]" />
        </span>
        {dots}
        {zen ? (
          !rest && (
            <button type="button" onClick={onPause} className={`${quiet} !h-9`}>
              {paused ? t.focus.resume : t.focus.pause}
            </button>
          )
        ) : (
          <button type="button" onClick={() => onCompact(false)} className={`${quiet} !h-9`}>
            {t.focus.expand}
          </button>
        )}
      </div>
    )
  }

  const askDrop = () => (rest || elapsedMin < 1 ? onDrop() : setAsking(true))
  const dropDialog = asking && (
    <div role="alertdialog" aria-label={t.focus.drop} className="absolute inset-x-0 bottom-full mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#24222b] px-3 py-2.5 text-sm text-[#ede6dd] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)]">
      <span className="mr-auto min-w-0">{t.focus.dropAsk(elapsedMin)}</span>
      <button type="button" autoFocus onClick={() => setAsking(false)} className={`${quiet} !h-9`}>
        {t.focus.resume}
      </button>
      <button type="button" onClick={onDrop} className={`${quiet} !h-9 !border-[#e8b27d]/50 !text-[#f3cfa8]`}>
        {t.focus.drop}
      </button>
    </div>
  )
  const progressBar = (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} className="mt-2.5 flex h-2 gap-[2px]">
      {Array.from({length: count}).map((_, i) => (
        <i
          key={i}
          className={`min-w-0 flex-1 ${
            i < doneBlocks
              ? rest
                ? 'bg-[#9fd4a8]'
                : 'bg-[#e8b27d]'
              : i === doneBlocks
                ? `${rest ? 'bg-[#e3f2e5]' : 'bg-[#f3cfa8]'} ${paused ? '' : 'motion-safe:animate-[chill-brew-now_1.6s_steps(2)_infinite]'}`
                : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  )

  if (lite) {
    const headline = rest ? `${t.focus.breakTitle(long)} · ${t.focus.breakShort}` : `${paused ? `${t.focus.paused} · ` : ''}${task ?? t.focus.noTask}`
    // Hàng phin chỉ có 1 nút chính (Tạm dừng / Bỏ nghỉ) + ⋯; nhạc là hàng riêng, có nút dừng của riêng nó
    return (
      <div className={`${frame} relative w-full max-w-[720px] p-3 sm:px-4`}>
        {dropDialog}
        {/* Điện thoại: dòng việc + vòng phin lên trên, hàng dưới đủ chỗ cho giờ và nút */}
        <div className="mb-2 flex items-center gap-2 sm:hidden">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[#ede6dd]">{headline}</p>
          {dots}
        </div>
        <div className="flex items-center gap-3">
          <PhinSprite level={rest ? 1 : progress} dripping={!rest && !paused} className="h-[44px] shrink-0 max-sm:hidden" />
          <span role="timer" aria-label={ariaLabel} className={`shrink-0 ${digitColor} ${paused ? 'opacity-50 [filter:none]' : ''}`}>
            <PixelClock text={clock} className="h-[30px] sm:h-[36px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#ede6dd] max-sm:hidden">{headline}</p>
            <span className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#a79e94] max-sm:hidden">
              {dots}
              <span className="truncate">{rest ? t.focus.nextPhin(nextMinutes) : t.focus.round(roundNow, roundOf)}</span>
            </span>
          </div>
          {rest ? (
            <button type="button" onClick={onSkipBreak} className="flex h-10 shrink-0 items-center rounded-full bg-[#9fd4a8] touch:h-11 px-3.5 text-[13px] font-semibold text-[#14261a] transition hover:bg-[#b3dfba] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd4a8]">
              {t.focus.skipBreak}
            </button>
          ) : (
            pauseButton
          )}
          <div ref={menuRef} className="relative shrink-0">
            <button type="button" aria-label={t.focus.liteActions} title={t.focus.liteActions} aria-expanded={menu} onClick={() => setMenu((v) => !v)} className={`${quiet} !w-10 !px-0`}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                <circle cx="2.5" cy="7" r="1.4" />
                <circle cx="7" cy="7" r="1.4" />
                <circle cx="11.5" cy="7" r="1.4" />
              </svg>
            </button>
            {menu && (
              <div role="menu" className="absolute bottom-full right-0 z-10 mb-2 grid min-w-44 gap-0.5 rounded-xl border border-white/10 bg-[#24222b] p-1.5 text-sm text-[#ede6dd] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)]">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false)
                    onCompact(true)
                  }}
                  className="rounded-lg px-3 py-2 text-left transition hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
                >
                  {t.focus.compact}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false)
                    askDrop()
                  }}
                  className="rounded-lg px-3 py-2 text-left text-[#f0a070] transition hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
                >
                  {rest ? t.focus.stop : `${t.focus.drop}…`}
                </button>
              </div>
            )}
          </div>
        </div>
        {progressBar}
        <div className="mt-2.5 border-t border-white/[0.08] pt-2.5">{music}</div>
      </div>
    )
  }

  return (
    // Màn rộng: 1 hàng thấp ngang thanh nhạc để không che phin và ly trên quầy.
    // Hẹp hơn: xếp chồng (điện thoại không thấy phin trên quầy nên không vướng)
    <div className={`${frame} relative w-full max-w-[720px] p-3 sm:px-4 lg:max-w-[1000px]`}>
      {asking && (
        <div role="alertdialog" aria-label={t.focus.drop} className="absolute inset-x-0 bottom-full mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#24222b] px-3 py-2.5 text-sm text-[#ede6dd] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)]">
          <span className="mr-auto min-w-0">{t.focus.dropAsk(elapsedMin)}</span>
          <button type="button" autoFocus onClick={() => setAsking(false)} className={`${quiet} !h-9`}>
            {t.focus.resume}
          </button>
          <button type="button" onClick={onDrop} className={`${quiet} !h-9 !border-[#e8b27d]/50 !text-[#f3cfa8]`}>
            {t.focus.drop}
          </button>
        </div>
      )}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <PhinSprite level={rest ? 1 : progress} dripping={!rest && !paused} className="h-[60px] lg:h-[66px]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#ede6dd]">
              {rest ? `${t.focus.breakTitle(long)} · ${t.focus.breakShort}` : `${paused ? `${t.focus.paused} · ` : ''}${task ?? t.focus.noTask}`}
            </p>
            <div className="mt-1.5 flex items-center gap-3">
              <span role="timer" aria-label={ariaLabel} className={`${digitColor} ${paused ? 'opacity-50 [filter:none]' : ''}`}>
                <PixelClock text={clock} className="h-[35px] lg:h-[42px]" />
              </span>
              <span className="grid gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#a79e94]">
                {dots}
                <span className="whitespace-nowrap">{rest ? t.focus.nextPhin(nextMinutes) : t.focus.round(roundNow, roundOf)}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 lg:order-last">
          {rest ? (
            <button type="button" onClick={onSkipBreak} className="flex h-10 items-center rounded-full bg-[#9fd4a8] px-3.5 text-[13px] font-semibold text-[#14261a] transition hover:bg-[#b3dfba] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd4a8]">
              {t.focus.skipBreak}
            </button>
          ) : (
            pauseButton
          )}
          <button type="button" onClick={() => (rest || elapsedMin < 1 ? onDrop() : setAsking(true))} className={quiet}>
            {rest ? t.focus.stop : t.focus.drop}
          </button>
          <CompactButton label={t.focus.compact} onClick={() => onCompact(true)} className={`${quiet} max-lg:ml-auto`} />
        </div>
        <div className="border-t border-white/[0.08] pt-2.5 lg:w-[380px] lg:shrink-0 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">{music}</div>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        className="mt-2.5 flex h-2 gap-[2px]"
      >
        {Array.from({length: count}).map((_, i) => (
          <i
            key={i}
            className={`min-w-0 flex-1 ${
              i < doneBlocks
                ? rest
                  ? 'bg-[#9fd4a8]'
                  : 'bg-[#e8b27d]'
                : i === doneBlocks
                  ? `${rest ? 'bg-[#e3f2e5]' : 'bg-[#f3cfa8]'} ${paused ? '' : 'motion-safe:animate-[chill-brew-now_1.6s_steps(2)_infinite]'}`
                  : 'bg-white/10'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function CompactButton({label, onClick, className}: {label: string; onClick: () => void; className: string}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={`${className} !w-10 !px-0`}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden>
        <path d="M2 5h10M4 9h6" />
      </svg>
    </button>
  )
}
