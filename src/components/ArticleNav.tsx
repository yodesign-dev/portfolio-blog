'use client'

import {useEffect, useRef, useState} from 'react'
import type {TocItem} from '@/lib/post-format'

// Vị trí "đang đọc" tính từ mép trên màn hình: tiêu đề nào đã cuộn qua dòng
// này thì mục của nó sáng lên trong mục lục.
const READING_LINE = 120

// Gọi fn tối đa 1 lần mỗi khung hình khi cuộn/đổi cỡ cửa sổ.
function useFrameListener(fn: () => void) {
  const fnRef = useRef(fn)
  useEffect(() => {
    fnRef.current = fn
  })
  useEffect(() => {
    let frame = 0
    const onChange = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        fnRef.current()
      })
    }
    onChange()
    window.addEventListener('scroll', onChange, {passive: true})
    window.addEventListener('resize', onChange)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [])
}

// Thanh tiến trình đọc 2px dính mép trên. Đo theo phần thân bài (#article-body),
// không theo cả trang — nên phần "Keep reading" và footer không tính vào.
// Không có transition: thanh chạy đúng theo tay cuộn, nên cũng không phải
// tắt gì thêm cho người bật "giảm chuyển động". aria-hidden: thời gian đọc đã
// có ở dòng thông tin bài, trình đọc màn hình không cần nghe thanh này.
export function ReadingProgress({targetId}: {targetId: string}) {
  const barRef = useRef<HTMLDivElement>(null)

  useFrameListener(() => {
    const target = document.getElementById(targetId)
    const bar = barRef.current
    if (!target || !bar) return
    const rect = target.getBoundingClientRect()
    const total = rect.height - window.innerHeight
    const progress = total <= 0 ? (rect.top <= 0 ? 1 : 0) : -rect.top / total
    bar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`
  })

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5">
      <div ref={barRef} className="h-full origin-left scale-x-0 bg-brand" />
    </div>
  )
}

// Mục lục dính bên phải trên màn rộng (lg trở lên). Màn hẹp dùng khối gập
// <details> ngay trong bài (xem PostArticle) — không cần JS.
export function TocRail({items, label}: {items: TocItem[]; label: string}) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useFrameListener(() => {
    let current: string | null = null
    for (const item of items) {
      const el = document.getElementById(item.id)
      if (el && el.getBoundingClientRect().top <= READING_LINE) current = item.id
    }
    setActiveId(current)
  })

  return (
    <nav aria-label={label} className="sticky top-8 max-h-[calc(100dvh-4rem)] overflow-y-auto">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{label}</p>
      <ol className="mt-4 space-y-1 border-l border-neutral-200">
        {items.map((item) => {
          const active = item.id === activeId
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active ? 'location' : undefined}
                className={`-ml-px block border-l-2 py-1.5 pl-4 text-sm leading-snug transition-colors ${
                  active
                    ? 'border-brand font-medium text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-900'
                }`}
              >
                {item.text}
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
