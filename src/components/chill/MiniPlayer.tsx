'use client'

// Cửa sổ nổi của /chill (Document Picture-in-Picture — Chrome / Edge máy tính): cảnh quán
// thu nhỏ, luôn nằm trên các cửa sổ khác, kèm phát/dừng, bài tiếp, mưa và nút về quán.
//
// - Cảnh vẫn vẽ trên canvas gốc của trang; cửa sổ nổi chạy vòng vẽ bằng requestAnimationFrame
//   của chính nó (tab gốc bị ẩn thì rAF của tab đứng) rồi chép canvas gốc sang canvas nhỏ
// - Nút trong cửa sổ nổi là portal React → dùng chung state với ChillRoom
// - Trình duyệt không có API (Safari, Firefox, điện thoại) → canMiniPlayer() = false, không hiện nút

import {useEffect, useRef} from 'react'
import {createPortal} from 'react-dom'
import {useT} from './i18n'

type DocumentPiP = {
  requestWindow: (opts?: {width?: number; height?: number}) => Promise<Window>
  window: Window | null
}

const pip = () => (typeof window === 'undefined' ? undefined : (window as Window & {documentPictureInPicture?: DocumentPiP}).documentPictureInPicture)

export const canMiniPlayer = () => pip() !== undefined

// Mở cửa sổ nổi 16:9 và chép CSS của trang sang (Tailwind, font). Phải gọi trong thao tác
// của người dùng (bấm nút / phím media) — trình duyệt chặn nếu không
export async function openMiniWindow(): Promise<Window | null> {
  const api = pip()
  if (!api) return null
  if (api.window) return api.window
  const win = await api.requestWindow({width: 400, height: 225})
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const style = win.document.createElement('style')
      style.textContent = Array.from(sheet.cssRules, (r) => r.cssText).join('\n')
      win.document.head.append(style)
    } catch {
      // Stylesheet khác origin không đọc được cssRules → gắn lại bằng <link>
      if (!sheet.href) continue
      const link = win.document.createElement('link')
      link.rel = 'stylesheet'
      link.href = sheet.href
      win.document.head.append(link)
    }
  }
  win.document.documentElement.lang = document.documentElement.lang
  win.document.title = document.title
  win.document.body.style.cssText = 'margin:0;height:100vh;overflow:hidden;background:#16131a;color:#ede6dd'
  return win
}

export function MiniPlayer({
  win,
  source,
  draw,
  title,
  station,
  playing,
  rain,
  onTogglePlay,
  onNext,
  onToggleRain,
  onClose,
}: {
  win: Window
  // Canvas gốc của cảnh
  source: React.RefObject<HTMLCanvasElement | null>
  // Vẽ 1 khung cảnh (tự giới hạn ~30fps) — true nếu vừa vẽ khung mới
  draw: React.RefObject<(now: number) => boolean>
  title: string
  station: string
  playing: boolean
  rain: boolean
  onTogglePlay: () => void
  onNext: () => void
  onToggleRain: () => void
  onClose: () => void
}) {
  const t = useT()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Đóng cửa sổ (nút X của trình duyệt / nút về quán / tắt trang) → báo ChillRoom
  useEffect(() => {
    win.addEventListener('pagehide', onClose)
    return () => win.removeEventListener('pagehide', onClose)
  }, [win, onClose])

  // Phím trong cửa sổ nổi: Space phát/dừng · N bài tiếp
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        onTogglePlay()
      } else if (e.key === 'n' || e.key === 'N') onNext()
    }
    win.addEventListener('keydown', onKey)
    return () => win.removeEventListener('keydown', onKey)
  }, [win, onTogglePlay, onNext])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let raf = 0
    let first = true
    const loop = () => {
      raf = win.requestAnimationFrame(loop)
      // Thời gian lấy theo trang gốc — rAF của cửa sổ nổi có mốc giờ riêng
      const drew = draw.current(performance.now())
      const src = source.current
      if (!src || !src.width || (!drew && !first)) return
      const dpr = win.devicePixelRatio || 1
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (!w || !h) return
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      first = false
      // Phủ kín khung (object-cover), cắt đều 2 bên
      const k = Math.max(w / src.width, h / src.height)
      const sw = w / k
      const sh = h / k
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, w, h)
    }
    raf = win.requestAnimationFrame(loop)
    return () => win.cancelAnimationFrame(raf)
  }, [win, source, draw])

  const btn = 'flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur transition hover:bg-black/70'

  return createPortal(
    <div className="group relative h-full w-full select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label={title} />
      <div
        className={`absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-black/30 p-2.5 transition-opacity duration-300 ${
          playing ? 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100' : 'opacity-100'
        }`}
      >
        <div className="flex justify-end">
          <button type="button" onClick={() => win.close()} aria-label={t.room.miniReturn} title={t.room.miniReturn} className={btn}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
          </button>
        </div>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{title}</p>
            <p className="truncate text-[11px] text-white/70">{station}</p>
          </div>
          <button type="button" onClick={onToggleRain} aria-label={rain ? t.room.miniRainOff : t.room.miniRainOn} title={rain ? t.room.miniRainOff : t.room.miniRainOn} aria-pressed={rain} className={rain ? btn.replace('text-white/90', 'text-[#9fd3ff]') : btn}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 15.3M16 14v6M8 14v6M12 16v6" />
            </svg>
          </button>
          <button type="button" onClick={onTogglePlay} aria-label={playing ? t.room.pause : t.room.play} title={playing ? t.room.pause : t.room.play} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8b27d] text-[#1a1410] transition hover:bg-[#f0c494]">
            {playing ? (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
              </svg>
            )}
          </button>
          <button type="button" onClick={onNext} aria-label={t.room.next} title={t.room.next} className={btn}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M5 5v14l10-7L5 5Z" />
              <rect x="16.5" y="5" width="2.5" height="14" rx="1" />
            </svg>
          </button>
        </div>
      </div>
    </div>,
    win.document.body
  )
}
