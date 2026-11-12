'use client'

// Bàn pha phin của /chill (công tắc Studio brewDeskOpen, ?brew=1): tấm đồng hồ thay chỗ thanh
// nhạc trong lúc pha. Phần đếm giờ vẫn nằm ở Focus.tsx, file này chỉ vẽ.
//
// - Chữ số và phin vẽ bằng ô vuông SVG để nét như pixel art của quán ở mọi cỡ, không cần font
// - Mỗi ô dưới đồng hồ là 1 phút (phin dài hơn 60 phút thì mỗi ô là 2 phút)
// - Phin trên tấm đồng hồ cũng đầy dần: điện thoại cắt tranh dọc không thấy phin trên quầy,
//   và 2 phòng không có ly trong (xem themes.ts) chỉ có phin này

import {useEffect, useEffectEvent, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type Ref} from 'react'
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
  const askId = useId()
  const [asking, setAsking] = useState(false)
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const expandRef = useRef<HTMLButtonElement>(null)
  const collapseRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLButtonElement>(null)
  // Thu gọn / mở lại bằng nút trên tấm thì tấm đổi hẳn cây DOM → nút vừa bấm biến mất, focus rơi
  // về body. Ghi lại nút cần focus ở dạng bên kia (bấm từ thanh trên thì để focus yên đó)
  const focusNext = useRef<'expand' | 'collapse' | null>(null)
  useEffect(() => {
    const want = focusNext.current
    focusNext.current = null
    if (want === 'expand') expandRef.current?.focus()
    else if (want === 'collapse') (collapseRef.current ?? moreRef.current)?.focus()
  }, [compact])
  const collapse = () => {
    focusNext.current = 'expand'
    onCompact(true)
  }
  const expand = () => {
    focusNext.current = 'collapse'
    onCompact(false)
  }

  const closeMenu = (refocus: boolean) => {
    setMenu(false)
    if (refocus) moreRef.current?.focus()
  }
  const onMenuOutside = useEffectEvent((e: PointerEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false))
  const onMenuEscape = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    closeMenu(true)
  })
  useEffect(() => {
    if (!menu) return
    // Mở menu (chuột, chạm hay phím) là đưa focus vào mục đầu, như menu của hệ điều hành
    itemRefs.current[0]?.focus()
    document.addEventListener('pointerdown', onMenuOutside)
    document.addEventListener('keydown', onMenuEscape, true)
    return () => {
      document.removeEventListener('pointerdown', onMenuOutside)
      document.removeEventListener('keydown', onMenuEscape, true)
    }
  }, [menu])
  const menuKeys = (e: ReactKeyboardEvent) => {
    const items = itemRefs.current.filter((x): x is HTMLButtonElement => Boolean(x))
    const at = items.indexOf(document.activeElement as HTMLButtonElement)
    const to = e.key === 'ArrowDown' ? at + 1 : e.key === 'ArrowUp' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : null
    if (e.key === 'Tab') return setMenu(false)
    if (to === null) return
    e.preventDefault()
    items[(to + items.length) % items.length]?.focus()
  }

  const count = minutes > 60 ? Math.ceil(minutes / 2) : minutes
  const doneBlocks = Math.floor(progress * count)
  const elapsedMin = Math.round(progress * minutes)

  // Hỏi trước khi bỏ phin đã pha từ 1 phút. Esc / Pha tiếp = giữ phin, trả focus về nút đã mở hộp
  const askDrop = (from: HTMLButtonElement | null) => {
    if (rest || elapsedMin < 1) return onDrop()
    dropRef.current = from
    setAsking(true)
  }
  const keepBrewing = () => {
    setAsking(false)
    dropRef.current?.focus()
  }
  const onAskEscape = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    keepBrewing()
  })
  useEffect(() => {
    if (!asking) return
    document.addEventListener('keydown', onAskEscape, true)
    return () => document.removeEventListener('keydown', onAskEscape, true)
  }, [asking])

  const digitColor = rest ? 'text-[#e3f2e5] [filter:drop-shadow(0_0_10px_rgba(159,212,168,0.35))]' : 'text-[#f3cfa8] [filter:drop-shadow(0_0_10px_rgba(232,178,125,0.42))]'
  // Lúc rảnh tay tấm mờ đi, nhưng chữ phụ (#a79e94) vẫn phải ≥ 4.5:1 → mờ tới 80% thôi
  const frame = `pointer-events-auto rounded-2xl border bg-[#16131a]/90 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md transition-opacity duration-700 ${rest ? 'border-[#9fd4a8]/45' : 'border-[#e8b27d]/35'} ${dimmed ? 'opacity-80 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'}`
  const dots = (
    <span className="flex gap-1" role="img" aria-label={t.focus.chainAria(roundDots, roundOf)}>
      {Array.from({length: roundOf}).map((_, i) => (
        <span key={i} className={`size-2 ${i < roundDots ? (rest ? 'bg-[#9fd4a8]' : 'bg-[#e8b27d]') : 'border border-white/30'}`} />
      ))}
    </span>
  )
  const pauseLabel = paused ? t.focus.clockResume : t.focus.clockPause
  const pauseIcon = (
    <svg width="13" height="13" viewBox="0 0 15 15" fill="currentColor" aria-hidden>
      <path d={paused ? 'M3 1.5v12l10-6z' : 'M3 1.5h3.2v12H3zM8.8 1.5H12v12H8.8z'} />
    </svg>
  )
  const pauseButton = (
    <button
      type="button"
      onClick={onPause}
      aria-label={pauseLabel}
      className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-[#e8b27d] px-3.5 touch:h-11 text-[13px] font-semibold text-[#2a1a10] transition hover:bg-[#f0c294] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e8b27d]`}
    >
      {pauseIcon}
      {paused ? t.focus.resume : t.focus.pause}
    </button>
  )
  const skipButton = (
    <button type="button" onClick={onSkipBreak} className="flex h-10 shrink-0 items-center rounded-full bg-[#9fd4a8] px-3.5 text-[13px] font-semibold text-[#14261a] transition hover:bg-[#b3dfba] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9fd4a8] touch:h-11">
      {t.focus.skipBreak}
    </button>
  )
  const quiet = 'flex h-10 shrink-0 items-center justify-center rounded-full border border-white/15 px-3.5 touch:h-11 touch:min-w-11 text-[13px] text-[#c9c0b6] transition hover:bg-white/[0.06] hover:text-[#ede6dd] focus-visible:outline-2 focus-visible:outline-[#e8b27d]'
  // Nút nhỏ (36px) cho máy có chuột, vẫn 44px trên màn cảm ứng
  const quietSm = quiet.replace('flex h-10', 'flex h-9')

  // Đồng hồ là thứ to nhất trên tấm → bấm vào là Tạm dừng / Pha tiếp (giờ nghỉ thì không dừng được).
  // Chỉ là lối tắt cho chuột / chạm: nút Tạm dừng vẫn là nút chính cho bàn phím và trình đọc màn
  // hình, nên đồng hồ không nhận Tab và không đọc trùng
  const clockFace = (size: string) => (
    <span className={`block ${digitColor} ${paused ? 'opacity-50 [filter:none]' : ''}`}>
      <PixelClock text={clock} className={size} />
    </span>
  )
  const clockTimer = (size: string) => (
    <span role="timer" aria-label={ariaLabel} className="shrink-0">
      {rest ? (
        clockFace(size)
      ) : (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden
          onClick={onPause}
          title={t.focus.clockTip(paused)}
          className="-m-2 block cursor-pointer rounded-xl p-2 transition hover:bg-white/[0.06] active:bg-white/[0.1]"
        >
          {clockFace(size)}
        </button>
      )}
    </span>
  )

  if (compact || zen) {
    // Thu gọn: bấm vào đâu trên tấm (phin, giờ, vòng, Mở lại) cũng mở lại; nút ⏸ riêng bên cạnh.
    // Chế độ ngắm cảnh không mở rộng được, chỉ còn đồng hồ + ⏸
    const face = (
      <>
        <PhinSprite level={rest ? 1 : progress} dripping={!rest && !paused} className="h-8" />
        {clockFace('h-[21px]')}
        {dots}
      </>
    )
    return (
      <div role="timer" aria-label={ariaLabel} className={`${frame} flex items-center gap-1 p-1`}>
        {zen ? (
          <span className="flex items-center gap-3 px-2">{face}</span>
        ) : (
          <button
            ref={expandRef}
            type="button"
            onClick={expand}
            aria-label={t.focus.expandAria}
            title={t.focus.expandAria}
            className="flex min-h-11 items-center gap-3 rounded-xl py-1 pl-2 pr-3 text-left transition hover:bg-white/[0.06] active:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-[#e8b27d]"
          >
            {face}
            <span className="flex items-center gap-1 text-[13px] text-[#c9c0b6]">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden>
                <path d="M2.5 7.5 6 4l3.5 3.5" />
              </svg>
              {t.focus.expand}
            </span>
          </button>
        )}
        {!rest && (
          <button type="button" onClick={onPause} aria-label={pauseLabel} title={pauseLabel} className={`${quiet} !w-10 !px-0 touch:!w-11 ${paused ? '!border-[#e8b27d]/50 !text-[#f3cfa8]' : ''}`}>
            {pauseIcon}
          </button>
        )}
      </div>
    )
  }

  const dropDialog = asking && (
    <div
      role="alertdialog"
      aria-label={t.focus.drop}
      aria-describedby={askId}
      className="absolute inset-x-0 bottom-full mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#24222b] px-3 py-2.5 text-sm text-[#ede6dd] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)]"
    >
      <span id={askId} className="mr-auto min-w-0">
        {t.focus.dropAsk(elapsedMin)}
      </span>
      <button type="button" autoFocus onClick={keepBrewing} className={quietSm}>
        {t.focus.resume}
      </button>
      <button type="button" onClick={onDrop} className={`${quietSm} !border-[#e8b27d]/50 !text-[#f3cfa8]`}>
        {t.focus.drop}
      </button>
    </div>
  )
  const progressBar = (
    <div
      role="progressbar"
      aria-label={rest ? t.focus.progressBreak : t.focus.progressPhin}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      aria-valuetext={t.focus.progressText(Math.floor(progress * minutes), minutes)}
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
  )
  const headline = rest ? `${t.focus.breakTitle(long)} · ${t.focus.breakShort}` : `${paused ? `${t.focus.paused} · ` : ''}${task ?? t.focus.noTask}`

  if (lite) {
    const menuItem = 'flex items-center rounded-lg px-3 py-2 text-left transition hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-[#e8b27d] touch:min-h-11'
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
          {clockTimer('h-[30px] sm:h-[36px]')}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#ede6dd] max-sm:hidden">{headline}</p>
            <span className="mt-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#a79e94] max-sm:hidden">
              {dots}
              <span className="truncate">{rest ? t.focus.nextPhin(nextMinutes) : t.focus.round(roundNow, roundOf)}</span>
            </span>
          </div>
          {rest ? skipButton : pauseButton}
          <div ref={menuRef} className="relative shrink-0">
            <button
              ref={moreRef}
              type="button"
              aria-label={t.focus.liteActions}
              title={t.focus.liteActions}
              aria-haspopup="menu"
              aria-expanded={menu}
              onClick={() => (menu ? closeMenu(false) : setMenu(true))}
              className={`${quiet} !w-10 !px-0 touch:!w-11`}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                <circle cx="2.5" cy="7" r="1.4" />
                <circle cx="7" cy="7" r="1.4" />
                <circle cx="11.5" cy="7" r="1.4" />
              </svg>
            </button>
            {menu && (
              <div
                role="menu"
                aria-label={t.focus.liteActions}
                onKeyDown={menuKeys}
                className="absolute bottom-full right-0 z-10 mb-2 grid min-w-44 gap-0.5 rounded-xl border border-white/10 bg-[#24222b] p-1.5 text-sm text-[#ede6dd] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)]"
              >
                <button
                  ref={(el) => {
                    itemRefs.current[0] = el
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => {
                    setMenu(false)
                    collapse()
                  }}
                  className={menuItem}
                >
                  {t.focus.compact}
                </button>
                <button
                  ref={(el) => {
                    itemRefs.current[1] = el
                  }}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => {
                    setMenu(false)
                    askDrop(moreRef.current)
                  }}
                  className={`${menuItem} text-[#f0a070]`}
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
      {dropDialog}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <PhinSprite level={rest ? 1 : progress} dripping={!rest && !paused} className="h-[60px] lg:h-[66px]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#ede6dd]">{headline}</p>
            <div className="mt-1.5 flex items-center gap-3">
              {clockTimer('h-[35px] lg:h-[42px]')}
              <span className="grid gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#a79e94]">
                {dots}
                <span className="whitespace-nowrap">{rest ? t.focus.nextPhin(nextMinutes) : t.focus.round(roundNow, roundOf)}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 lg:order-last">
          {rest ? skipButton : pauseButton}
          <button type="button" onClick={(e) => askDrop(e.currentTarget)} className={quiet}>
            {rest ? t.focus.stop : t.focus.drop}
          </button>
          <CompactButton ref={collapseRef} label={t.focus.compact} onClick={collapse} className={`${quiet} max-lg:ml-auto`} />
        </div>
        <div className="border-t border-white/[0.08] pt-2.5 lg:w-[380px] lg:shrink-0 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">{music}</div>
      </div>
      {progressBar}
    </div>
  )
}

// Thu gọn tấm đồng hồ: mũi tên chỉ xuống (tấm co về một dải nhỏ), đối xứng với ˄ Mở lại
function CompactButton({label, onClick, className, ref}: {label: string; onClick: () => void; className: string; ref?: Ref<HTMLButtonElement>}) {
  return (
    <button ref={ref} type="button" onClick={onClick} aria-label={label} title={label} className={`${className} !w-10 !px-0 touch:!w-11`}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden>
        <path d="M3 5.5 7 9.5l4-4" />
      </svg>
    </button>
  )
}
