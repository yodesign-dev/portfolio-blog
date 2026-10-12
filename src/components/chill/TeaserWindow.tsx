'use client'

// Ô cửa sổ quán trên trang chủ: chính cảnh của /chill (ChillScene) chạy thu nhỏ, không
// nhạc, không nút — bấm vào là sang /chill.
//
// - Bộ vẽ cảnh nặng (~2.500 dòng) nên chỉ tải khi section sắp vào màn hình; trước đó và
//   với người bật "giảm chuyển động" thì hiện ảnh tĩnh của quán
// - Chỉ vẽ khi ô đang nằm trong màn hình và tab đang mở
// - Số người đang ở quán lấy từ nhịp "đang ở quán" của /chill (xem api/chill-chat)

import Link from 'next/link'
import {useEffect, useRef, useState} from 'react'
import type {ChillScene, TimeOfDay} from './scene'

const POSTER = '/chill/scenes/room-cafe-thumb.webp'
// Cùng ngưỡng với nhãn trên /chill: quán vắng thì không nêu số
const MIN_ONLINE_SHOWN = 2

const TIME_LABEL: Record<TimeOfDay, string> = {morning: 'Morning', afternoon: 'Afternoon', night: 'Night'}

// Giờ ngoài cửa sổ theo đồng hồ Hà Nội
function hanoiTime(): TimeOfDay {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {hour: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh'}).format(new Date()))
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 18) return 'afternoon'
  return 'night'
}

export function TeaserWindow() {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [live, setLive] = useState(false)
  const [time, setTime] = useState<TimeOfDay | null>(null)
  const [online, setOnline] = useState(0)

  useEffect(() => {
    const wrap = wrapRef.current!
    const canvas = canvasRef.current!
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let scene: ChillScene | null = null
    let loading = false
    let cancelled = false
    let visible = false
    let raf = 0
    let lastDraw = 0
    let shown = false

    // Ảnh của cảnh tải xong (mặt bàn đã có màu) mới cho canvas hiện đè lên ảnh tĩnh
    const drawn = () => {
      const px = canvas.getContext('2d')!.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height * 0.86), 1, 1).data
      return px[3] > 0 && px[0] + px[1] + px[2] > 40
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      // ~30fps như /chill cho nhẹ máy
      if (now - lastDraw < 33) return
      lastDraw = now
      scene?.frame(now)
      if (!shown && drawn()) {
        shown = true
        setLive(true)
      }
    }
    const sync = () => {
      cancelAnimationFrame(raf)
      raf = 0
      if (scene && visible && !document.hidden) raf = requestAnimationFrame(loop)
    }
    const fit = () => {
      const dpr = window.devicePixelRatio || 1
      scene?.resize(wrap.clientWidth * dpr, wrap.clientHeight * dpr)
    }

    const load = async () => {
      loading = true
      const [{ChillScene}, {DESTINATIONS}] = await Promise.all([import('./scene'), import('./destinations')])
      if (cancelled) return
      const now = hanoiTime()
      scene = new ChillScene(canvas)
      scene.setAtmosphere(now, 'clear', DESTINATIONS[0])
      fit()
      setTime(now)
      sync()
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible && !scene && !loading && !still) void load()
        sync()
      },
      {rootMargin: '200px'},
    )
    io.observe(wrap)
    const ro = new ResizeObserver(fit)
    ro.observe(wrap)
    document.addEventListener('visibilitychange', sync)

    fetch('/api/chill-chat')
      .then((res) => (res.ok ? res.json() : null))
      .then((room: {online?: number} | null) => !cancelled && setOnline(room?.online ?? 0))
      .catch(() => {})

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])

  return (
    <Link
      href="/chill"
      aria-label="Open Chill — a pixel café with lo-fi music"
      className="group relative block border border-white/15 bg-[#0f0d12] p-1.5 transition-colors hover:border-[#e8b27d]/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8b27d] sm:p-2"
    >
      <span ref={wrapRef} className="relative block aspect-video overflow-hidden bg-[#16131a]">
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel art 320×180 phóng nguyên điểm ảnh, không qua bộ tối ưu ảnh */}
        <img
          src={POSTER}
          alt=""
          width={320}
          height={180}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover [image-rendering:pixelated]"
        />
        <canvas
          ref={canvasRef}
          aria-hidden
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${live ? 'opacity-100' : 'opacity-0'}`}
        />
        <span className="pointer-events-none absolute left-2 top-2 flex items-center gap-2 sm:left-3 sm:top-3">
          <span className="bg-black/55 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/90 backdrop-blur">
            Hà Nội{time ? ` · ${TIME_LABEL[time]}` : ''}
          </span>
          {online >= MIN_ONLINE_SHOWN && (
            <span className="flex items-center gap-1.5 bg-black/55 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white/90 backdrop-blur">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {online} here now
            </span>
          )}
        </span>
        <span className="pointer-events-none absolute bottom-2 right-2 bg-[#e8b27d] px-3 py-1.5 text-xs font-bold text-[#2a1a10] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 sm:bottom-3 sm:right-3">
          Step in →
        </span>
      </span>
    </Link>
  )
}
