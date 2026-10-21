'use client'

// Trang quay video của /chill (/chill/record): chỉ có cảnh, không nút bấm, không nhạc.
// Quay bằng OBS (Browser Source 1920×1080 hoặc 1080×1920), nhạc ghép riêng bằng
// scripts/chill-mix-audio.mjs rồi ghép hình + nhạc bằng scripts/chill-make-video.mjs.
//
// Tham số trên link (đều tuỳ chọn):
//   place=<id điểm đến>          mặc định điểm đến đầu tiên trong Studio
//   theme=cafe|balcony|desk      căn phòng
//   seat=girl                    người ngồi nữ (phòng chưa có bản nữ thì vẫn là nam)
//   time=morning|afternoon|night bỏ trống = giờ thật của điểm đến
//   weather=clear|rain|mist
//   x=0–100                      khung dọc 9:16: lấy phần nào của cảnh theo chiều ngang (mặc định 50)
//   label=0                      ẩn tên điểm đến góc trên
//   mark=0                       ẩn dòng applebin.me/chill góc dưới
//   busy=0                       cảnh nhỏ ngoài phố đến thưa như trang thường
// Khi cảnh đã vẽ xong, thẻ ngoài cùng có data-ready="1" (để biết lúc bắt đầu quay).

import {useEffect, useRef, useState} from 'react'
import type {Destination} from './destinations'
import type {ChillScene, TimeOfDay, Weather} from './scene'
import {SEATS, type Seat, type ThemeId} from './themes'

const TIMES: TimeOfDay[] = ['morning', 'afternoon', 'night']
const WEATHERS: Weather[] = ['clear', 'rain', 'mist']
const THEMES: ThemeId[] = ['cafe', 'balcony', 'desk']
const TIME_LABEL: Record<TimeOfDay, string> = {morning: 'Morning', afternoon: 'Afternoon', night: 'Night'}

// Giờ ngoài cửa sổ theo đồng hồ của điểm đến (giống /chill/embed)
function timeOfDay(timeZone: string): TimeOfDay {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {hour: '2-digit', hour12: false, timeZone}).format(new Date()))
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 18) return 'afternoon'
  return 'night'
}

const oneOf = <T extends string>(list: readonly T[], value: string | null) => (list.includes(value as T) ? (value as T) : null)

type Setup = {
  dest: Destination
  theme: ThemeId
  seat: Seat
  time: TimeOfDay | null // null = theo giờ thật
  weather: Weather
  x: number
  label: boolean
  mark: boolean
  busy: boolean
}

function readSetup(destinations: Destination[]): Setup {
  const p = new URLSearchParams(window.location.search)
  const x = Number(p.get('x'))
  return {
    dest: destinations.find((d) => d.id === p.get('place')) ?? destinations[0],
    theme: oneOf(THEMES, p.get('theme')) ?? 'cafe',
    seat: oneOf(SEATS, p.get('seat')) ?? 'boy',
    time: oneOf(TIMES, p.get('time')),
    weather: oneOf(WEATHERS, p.get('weather')) ?? 'clear',
    x: p.has('x') && Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : 50,
    label: p.get('label') !== '0',
    mark: p.get('mark') !== '0',
    busy: p.get('busy') !== '0',
  }
}

export function ChillRecord({destinations}: {destinations: Destination[]}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<ChillScene | null>(null)
  const [setup, setSetup] = useState<Setup | null>(null)
  const [time, setTime] = useState<TimeOfDay>('morning')
  const [live, setLive] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- tham số chỉ đọc được trên trình duyệt
  useEffect(() => setSetup(readSetup(destinations)), [destinations])

  // Giờ cố định theo link, hoặc theo đồng hồ thật của điểm đến (cập nhật mỗi phút)
  useEffect(() => {
    if (!setup) return
    const tick = () => setTime(setup.time ?? timeOfDay(setup.dest.timeZone))
    tick()
    if (setup.time) return
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [setup])

  // Vòng vẽ ~30fps, luôn chạy (trang chỉ dùng để quay)
  useEffect(() => {
    if (!setup) return
    const wrap = wrapRef.current!
    const canvas = canvasRef.current!
    let scene: ChillScene | null = null
    let cancelled = false
    let raf = 0
    let lastDraw = 0
    let shown = false

    // Ảnh phố từ Sanity CDN làm canvas không đọc lại được điểm ảnh → coi như đã vẽ xong
    const drawn = () => {
      try {
        const px = canvas.getContext('2d')!.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height * 0.86), 1, 1).data
        return px[3] > 0 && px[0] + px[1] + px[2] > 40
      } catch {
        return true
      }
    }
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (now - lastDraw < 33) return
      lastDraw = now
      scene?.frame(now)
      if (!shown && drawn()) {
        shown = true
        setLive(true)
      }
    }
    const fit = () => {
      const dpr = window.devicePixelRatio || 1
      scene?.resize(wrap.clientWidth * dpr, wrap.clientHeight * dpr)
    }

    void import('./scene').then(({ChillScene}) => {
      if (cancelled) return
      scene = new ChillScene(canvas)
      sceneRef.current = scene
      scene.setTheme(setup.theme)
      scene.setSeat(setup.seat)
      scene.setMusic(true)
      scene.setBusy(setup.busy)
      scene.setAtmosphere(setup.time ?? timeOfDay(setup.dest.timeZone), setup.weather, setup.dest)
      fit()
      raf = requestAnimationFrame(loop)
    })

    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      sceneRef.current = null
    }
  }, [setup])

  useEffect(() => {
    if (setup) sceneRef.current?.setAtmosphere(time, setup.weather, setup.dest)
  }, [time, setup, live])

  return (
    <div data-ready={live ? '1' : '0'} className="fixed inset-0 cursor-none overflow-hidden bg-[#0f0d12] font-mono text-white">
      <div ref={wrapRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={setup ? `Pixel art: a café window in ${setup.dest.name}` : 'Pixel art café window'}
          style={{objectPosition: `${setup?.x ?? 50}% 50%`}}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${live ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>

      {setup?.label && (
        <div className="pointer-events-none absolute left-[2.5vmin] top-[2.5vmin] bg-black/55 px-[1.4vmin] py-[0.7vmin] text-[1.8vmin] uppercase tracking-[0.18em] text-white/90 backdrop-blur">
          {setup.dest.name} · {TIME_LABEL[time]}
        </div>
      )}
      {setup?.mark && (
        <div className="pointer-events-none absolute bottom-[2.5vmin] right-[2.5vmin] text-[1.7vmin] tracking-[0.12em] text-white/70 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
          applebin.me/chill
        </div>
      )}
    </div>
  )
}
