'use client'

import {useRef, useState, type MouseEvent, type ReactNode} from 'react'

// Ảnh trong bài (sơ đồ luồng, ảnh chụp màn hình) chạm để xem lớn. Trên điện
// thoại ảnh rộng 1322px bị thu còn ~327px, chữ trong sơ đồ chỉ còn 1-2px.
//
// Dùng <dialog> native + showModal(): trình duyệt tự giữ focus trong hộp, Esc
// để đóng, nền phía sau không bấm được — không cần thư viện lightbox.
//
// Hai chế độ trong hộp:
// - Vừa màn hình (mở ra là thấy cả ảnh)
// - Cỡ thật: ảnh hiện đúng số pixel gốc, cuộn/kéo ngang dọc để đọc. Bấm vào
//   điểm nào thì phóng to quanh điểm đó.
// Bấm ra ngoài ảnh (ở chế độ vừa màn hình) hoặc nút × để đóng.
export function ZoomableImage({
  children,
  src,
  width,
  height,
  alt,
  caption,
}: {
  children: ReactNode
  src: string
  width: number
  height: number
  alt: string
  caption?: string
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [zoomed, setZoomed] = useState(false)

  const show = () => {
    setZoomed(false)
    setOpen(true)
    dialogRef.current?.showModal()
    // Khoá cuộn trang phía sau — <dialog> không tự làm việc này
    document.documentElement.style.overflow = 'hidden'
  }

  const close = () => dialogRef.current?.close()

  // Chạy cho cả Esc lẫn nút × (sự kiện "close" của dialog)
  const onClosed = () => {
    setOpen(false)
    document.documentElement.style.overflow = ''
    // Safari cũ không trả focus về nút đã mở hộp
    triggerRef.current?.focus({preventScroll: true})
  }

  // Phóng to quanh điểm vừa bấm: nhớ tỉ lệ vị trí trên ảnh, sau khi ảnh đổi
  // cỡ thì cuộn sao cho điểm đó nằm giữa màn hình.
  const toggleZoom = (e: MouseEvent<HTMLImageElement>) => {
    e.stopPropagation()
    const scroller = scrollerRef.current
    if (zoomed || !scroller) {
      setZoomed(false)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const fx = (e.clientX - rect.left) / rect.width
    const fy = (e.clientY - rect.top) / rect.height
    setZoomed(true)
    requestAnimationFrame(() => {
      scroller.scrollLeft = fx * width - scroller.clientWidth / 2
      scroller.scrollTop = fy * height - scroller.clientHeight / 2
    })
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={show}
        aria-label={alt ? `View larger: ${alt}` : 'View image larger'}
        aria-haspopup="dialog"
        className="group relative block w-full cursor-zoom-in rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
      >
        {children}
        {/* Dấu hiệu "chạm để phóng to" — luôn hiện trên màn chạm (không có hover),
            máy có chuột chỉ hiện khi rê vào ảnh */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 bottom-2 flex size-8 items-center justify-center rounded-full bg-neutral-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 touch:opacity-100"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-4">
            <path strokeLinecap="round" d="M12.5 3.5h4v4M7.5 16.5h-4v-4M16.5 3.5l-5 5M3.5 16.5l5-5" />
          </svg>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        onClose={onClosed}
        aria-label={alt || caption || 'Image'}
        // Nền đặc trên chính hộp (phủ kín màn hình) thay vì chỉ ::backdrop mờ: chữ
        // của trang phía sau lộ ra sẽ lẫn với chú thích ảnh
        className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-neutral-950 p-0 text-white backdrop:bg-neutral-950"
      >
        {open && (
          <div
            ref={scrollerRef}
            onClick={zoomed ? undefined : close}
            className={`h-full w-full overflow-auto overscroll-contain ${
              zoomed ? '' : 'flex items-center justify-center p-4 pt-16 pb-14 sm:p-12'
            }`}
          >
            {/* Cỡ thật: ảnh thấp hơn màn hình thì vẫn nằm giữa theo chiều dọc
                (min-h-full + items-center); min-w-max giữ chiều ngang để cuộn */}
            <div className={zoomed ? 'flex min-h-full min-w-max items-center' : 'contents'}>
              {/* Ảnh thường (không qua next/image): cần đúng URL Sanity cỡ gốc để
                  phóng to, và chỉ tải khi hộp mở */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                width={width}
                height={height}
                onClick={toggleZoom}
                className={
                  zoomed
                    ? 'max-w-none cursor-zoom-out bg-white'
                    : 'h-auto max-h-full w-auto max-w-full cursor-zoom-in rounded-md bg-white object-contain'
                }
                style={zoomed ? {width, height: 'auto'} : undefined}
              />
            </div>
          </div>
        )}

        <div className="pointer-events-none fixed inset-x-0 top-0 flex items-start justify-between gap-4 p-2">
          <p className="pointer-events-auto min-h-11 rounded-full bg-black/60 px-4 py-3 text-xs leading-5 text-neutral-200">
            {/* Lời nhắc theo kiểu trỏ: chạm trên màn chạm, bấm/kéo trên máy có chuột */}
            <span className="hidden touch:inline">{zoomed ? 'Drag to move · tap to fit' : 'Tap the image to zoom'}</span>
            <span className="touch:hidden">{zoomed ? 'Scroll to move · click to fit' : 'Click the image to zoom'}</span>
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="pointer-events-auto flex size-11 shrink-0 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-white"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="size-5">
              <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {caption && !zoomed && (
          <p className="pointer-events-none fixed inset-x-0 bottom-0 px-4 pb-4 text-center text-sm italic text-neutral-300">
            {caption}
          </p>
        )}
      </dialog>
    </>
  )
}
