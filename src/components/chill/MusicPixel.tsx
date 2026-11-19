'use client'

// Nhạc kiểu pixel của /chill (công tắc Studio musicPixelOpen, thử bằng ?vinyl=1):
// - VinylDisc: đĩa than 16×16 ô cạnh tên bài, vệt sáng và vạch nhãn quay 4 nấc (90° mỗi nấc, ô luôn nằm
//   trên lưới) khi nhạc đang kêu, dừng nhạc thì đứng đúng chỗ
// - WaveSeek: lớp vẽ của thanh tua, mỗi cột 4px. Cột đã nghe giữ mức âm ghi lại lúc kim đi qua;
//   đoạn chưa nghe, đoạn tua bỏ qua và sau khi tải lại trang thì ở mức thấp nhất. Không vẽ sóng
//   giả. Thay luôn 12 cột sóng trung tính cũ (Visualizer), nên điện thoại cũng thấy nhạc đang chạy
// - PixelHeart: tim 7×6 ô, lúc vừa thả thì bung 5 ô sáng
// - DiscSleeve: bao đĩa trên nút nghe nhạc của màn chào (Welcome.tsx)
// Cả ba chỉ là hình (aria-hidden): thanh tua, nút tim vẫn do ChillRoom giữ role / nhãn / phím.
// Giảm chuyển động: đĩa đứng yên, cột không nhảy, tim không bung (globals.css + matchMedia).

import {useEffect, useRef, useState, type RefObject} from 'react'
import type {ChillAudio} from './audio'

type Sprite = {rows: string[]; palette: Record<string, string>}

function Cells({rows, palette}: Sprite) {
  return (
    <>
      {rows.flatMap((row, y) => Array.from(row).map((ch, x) => (palette[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[ch]} /> : null)))}
    </>
  )
}

// Thân, viền lấy từ bảng màu phin (BrewDesk) và radio trên kệ (shelf.ts); nhãn là màu nhấn
const DISC: Sprite = {
  palette: {o: '#8a6a50', k: '#2c2523', L: '#e8b27d', l: '#c98f55', s: '#ede6dd'},
  rows: [
    '.....oooooo.....',
    '...ookkkkkkoo...',
    '..okkkkkkkkkko..',
    '.okkkkkkkkkkkko.',
    '.okkkkkkkkkkkko.',
    'okkkkkLLLLkkkkko',
    'okkkkLLLLLLkkkko',
    'okkkkLLssLLkkkko',
    'okkkkLLssLLkkkko',
    'okkkkllLLLLkkkko',
    'okkkkklllLkkkkko',
    '.okkkkkkkkkkkko.',
    '.okkkkkkkkkkkko.',
    '..okkkkkkkkkko..',
    '...ookkkkkkoo...',
    '.....oooooo.....',
  ],
}
// Lớp quay: 2 vệt sáng trên rãnh đĩa (đối xứng qua tâm) + góc tối trên nhãn. Vệt sáng nằm sát
// mép nên thấy đĩa quay rõ hơn nhiều so với chỉ vạch nhãn ở tâm
const SHINE: [number, number][] = [
  [4, 3],
  [5, 3],
  [3, 4],
  [3, 5],
  [12, 10],
  [12, 11],
  [11, 12],
  [10, 12],
]
const MARK: [number, number][] = [
  [9, 6],
  [10, 6],
  [10, 7],
]

// Hiện 48px (mỗi ô 3px): 32px thì vòng quay quá nhỏ để nhận ra
export function VinylDisc({spinning, className = ''}: {spinning: boolean; className?: string}) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" width={48} height={48} shapeRendering="crispEdges" className={`block shrink-0 ${className}`}>
      <Cells {...DISC} />
      <g className="chill-vinyl-mark" style={{animationPlayState: spinning ? 'running' : 'paused'}}>
        {SHINE.map(([x, y]) => (
          <rect key={`s${x}-${y}`} x={x} y={y} width={1} height={1} fill="#8e8279" />
        ))}
        {MARK.map(([x, y]) => (
          <rect key={`m${x}-${y}`} x={x} y={y} width={1} height={1} fill="#2a1a10" />
        ))}
      </g>
    </svg>
  )
}

// Bao đĩa cho nút nghe nhạc ở màn chào (nền hổ phách nên viền tối). Khách quay lại: đĩa ló nửa
// trên, như đĩa đang nghe dở. Khách mới: đĩa nằm trọn trong bao. Rê chuột / focus nút (cần class
// `group` ở nút): đĩa trồi thêm 2 ô theo 2 nấc
const SLEEVE: Sprite = {
  palette: {o: '#2e211b', S: '#b9825a', s: '#f3cfa8', Y: '#ede6dd', n: '#7a4a24'},
  rows: [
    'oooooooooooooooo',
    'oSSSSSSSSSSSSSSo',
    'oSsssssssssssYSo',
    'oSsssssssnnsssSo',
    'oSsssssssnssssSo',
    'oSsssssssnssssSo',
    'oSsssssnnnssssSo',
    'oSssssnnnnssssSo',
    'oSsssssnnsssssSo',
    'oSSSSSSSSSSSSSSo',
    'oooooooooooooooo',
  ],
}
const SLEEVE_DISC: Sprite = {...DISC, palette: {...DISC.palette, o: '#2e211b'}}

export function DiscSleeve({out, className = ''}: {out: boolean; className?: string}) {
  return (
    <svg aria-hidden viewBox="0 0 16 20" width={32} height={40} shapeRendering="crispEdges" className={`block shrink-0 ${className}`}>
      <g transform={`translate(0 ${out ? 2 : 9})`}>
        <g className="transition-transform duration-150 [transition-timing-function:steps(2)] group-hover:[transform:translateY(-2px)] group-focus-visible:[transform:translateY(-2px)]">
          <Cells {...SLEEVE_DISC} />
        </g>
      </g>
      <g transform="translate(0 9)">
        <Cells {...SLEEVE} />
      </g>
    </svg>
  )
}

const HEART_ON = ['.rr.rr.', 'rhrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...']
const HEART_OFF = ['.oo.oo.', 'o..o..o', 'o.....o', '.o...o.', '..o.o..', '...o...']
const HEART_PALETTE = {r: '#fda4af', h: '#ffe4e6', o: 'currentColor'}
const BURST: [number, number][] = [
  [-2, -1],
  [8, -1],
  [-2, 5],
  [8, 5],
  [3, -2],
]

// scale: số px màn hình cho 1 ô (3 trong nút 44px, 2 trong chip "Của tôi"). burst: vừa thả tim
export function PixelHeart({filled, scale = 3, burst = false}: {filled: boolean; scale?: number; burst?: boolean}) {
  return (
    <svg aria-hidden viewBox="-2 -2 11 10" width={11 * scale} height={10 * scale} shapeRendering="crispEdges" className="block shrink-0">
      <Cells rows={filled ? HEART_ON : HEART_OFF} palette={HEART_PALETTE} />
      {burst && filled && (
        <g className="chill-heart-burst" fill="#ffe4e6">
          {BURST.map(([x, y]) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
          ))}
        </g>
      )}
    </svg>
  )
}

const COL = 4
const GAP = 2
const UNIT = 4
const TOP = 4
const PLAYED = '#e8b27d'
const HEAD = '#f3cfa8'
// 3,34:1 trên nền thanh nhạc: thấy được bài dài tới đâu (vạch cũ white/10 chỉ 1,31:1)
const AHEAD = '#6f6672'

// Mức âm 1…TOP từ vài dải tần đầu (nhạc lo-fi đã cắt treble, năng lượng dồn ở đó)
export function waveLevel(data: Uint8Array): number {
  let sum = 0
  for (let i = 1; i <= 6; i++) sum += data[i] ?? 0
  const v = Math.min(1, (sum / 6 / 255) * 1.4)
  return 1 + Math.min(TOP - 1, Math.floor(v * v * TOP))
}

export function WaveSeek({
  audioRef,
  playing,
  started,
  progress,
  trackId,
  className = '',
}: {
  audioRef: RefObject<ChillAudio | null>
  playing: boolean
  started: boolean
  progress: number
  trackId: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)
  // Mức âm đã ghi của từng cột; đổi bài thì ghi lại từ đầu
  const levels = useRef<number[]>([])
  const live = useRef({progress, playing, started})
  useEffect(() => {
    live.current = {progress, playing, started}
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => setCount(Math.max(0, Math.floor((el.clientWidth + GAP) / (COL + GAP))))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const shape = useRef({trackId, count})
  useEffect(() => {
    const was = shape.current
    shape.current = {trackId, count}
    // Cùng bài mà số cột đổi (xoay máy, mở Cài đặt): dàn lại mức đã ghi sang số cột mới
    levels.current = was.trackId === trackId && was.count > 0 ? Array.from({length: count}, (_, i) => levels.current[Math.floor((i * was.count) / count)]) : []
  }, [trackId, count])

  useEffect(() => {
    const el = ref.current
    if (!el || count === 0) return
    const bars = Array.from(el.children as HTMLCollectionOf<HTMLElement>)
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const data = new Uint8Array(32)
    const paint = () => {
      const now = live.current
      const head = now.started ? Math.min(count - 1, Math.floor(now.progress * count)) : -1
      if (now.playing && head >= 0) {
        audioRef.current?.levels(data)
        const level = waveLevel(data)
        // Cột kim nhảy theo nhạc, kim đi qua rồi thì cột giữ mức cuối. Giảm chuyển động: ghi một lần
        if (calm) levels.current[head] ??= level
        else levels.current[head] = level
      }
      bars.forEach((bar, i) => {
        bar.style.height = `${(i <= head ? (levels.current[i] ?? 1) : 1) * UNIT}px`
        bar.style.background = i < head ? PLAYED : i === head ? HEAD : AHEAD
        bar.classList.toggle('chill-wave-now', i === head && now.playing)
      })
    }
    paint()
    const timer = window.setInterval(paint, 125)
    return () => window.clearInterval(timer)
  }, [audioRef, count, trackId])

  return (
    <div ref={ref} aria-hidden className={`pointer-events-none flex items-end gap-[2px] overflow-hidden ${className}`} style={{height: TOP * UNIT}}>
      {Array.from({length: count}).map((_, i) => (
        <i key={i} className="block w-1 shrink-0" />
      ))}
    </div>
  )
}
