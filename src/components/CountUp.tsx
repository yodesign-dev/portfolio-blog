'use client'

import {useLayoutEffect, useRef} from 'react'

// Số đếm từ 0 lên giá trị thật khi cuộn tới, 1 lần, theo lò xo (mẫu Dynamic Data
// Display của Superdesign). HTML in sẵn số thật cho Google, người tắt JS và người
// giảm chuyển động; trình đọc màn hình đọc bản sr-only. min-width theo số cuối +
// tabular-nums để cột bên cạnh không xê dịch khi đang đếm.
const STIFFNESS = 100
const DAMPING = 60

export function CountUp({value}: {value: number}) {
  const ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    el.textContent = '0'

    let frame = 0
    const run = () => {
      let x = 0
      let v = 0
      let last = performance.now()
      const step = (now: number) => {
        // Giới hạn dt để tab ẩn quay lại không nhảy cóc; chia nhỏ bước cho lò xo ổn định
        const h = Math.min((now - last) / 1000, 0.05) / 8
        last = now
        for (let i = 0; i < 8; i++) {
          v += (-STIFFNESS * (x - value) - DAMPING * v) * h
          x += v * h
        }
        const shown = Math.round(x)
        el.textContent = String(shown)
        if (shown !== value) frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        run()
      },
      {rootMargin: '-100px 0px'},
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      el.textContent = String(value)
    }
  }, [value])

  return (
    <>
      <span className="sr-only">{value}</span>
      <span
        ref={ref}
        aria-hidden
        className="inline-block tabular-nums"
        style={{minWidth: `${String(value).length}ch`}}
      >
        {value}
      </span>
    </>
  )
}
