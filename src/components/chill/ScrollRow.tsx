'use client'

// Hàng chip cuộn ngang (dãy trạm nhạc trong tab Music và danh sách Ngắm cảnh): một dòng thay vì
// rớt 2–3 dòng. Thanh cuộn ẩn, mép nào còn chip khuất thì mờ dần để khách biết còn nữa.
// - Chip đang chọn ([aria-checked="true"]) tự cuộn về sát mép trái (ngay sau mũi tên ‹, chừa
//   một mẩu chip trước nó để biết còn chip bên trái) khi hàng hiện ra, khi đổi lựa chọn và khi
//   chip thêm / bớt. Không đổi thứ tự chip: khách nhớ chỗ từng trạm, chip không nhảy dưới ngón
//   tay, phím mũi tên vẫn đi đúng thứ tự
// - Chuột: lăn dọc trên hàng thành cuộn ngang; tới mép rồi thì trả cú lăn cho danh sách bên ngoài
// - Bàn phím: mũi tên / Home / End vẫn do radio-keys.ts lo, scroll-padding giữ chip được focus
//   ra khỏi vùng mờ
// - Mũi tên ‹ › ở mép còn chip khuất: vùng mờ một mình chưa đủ, chip cuối có thể lọt đúng mép
//   và biến mất hẳn, khách tưởng hết trạm. Máy có chuột bấm được (cuộn ~70% hàng); màn chạm chỉ
//   là dấu hiệu (vuốt để cuộn), không chặn chạm vào chip bên dưới

import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react'

const FADE = 24
// Khoảng trống bên trái chip đang chọn khi cuộn về trái. Mũi tên ‹ cùng quầng tối quanh nó phủ
// ~38px tính từ mép, nên 56px mới chừa được ~12px viền chip trước nó (để biết còn chip bên trái)
const PEEK = 56

export function ScrollRow({children, selectedKey, className = '', ...aria}: {children: ReactNode; selectedKey: string; className?: string; role?: string; 'aria-label'?: string}) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({start: false, end: false})
  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const start = el.scrollLeft > 1
    const end = el.scrollLeft < el.scrollWidth - el.clientWidth - 1
    setEdges((e) => (e.start === start && e.end === end ? e : {start, end}))
  }, [])
  // Đo lại khi cuộn, khi hàng đổi bề rộng, và khi chip thêm / bớt / đổi chữ (bài tải xong, tab "Của
  // tôi" hiện ra, nhãn "Mới", sóng nhạc). Đừng đo trong effect không deps (sau mỗi lần vẽ): bản đầu
  // làm vậy và gặp vòng lặp "Maximum update depth", quán kẹt ở màn chào
  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()
    el.addEventListener('scroll', measure, {passive: true})
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    // Chip thêm / bớt ngay trong hàng (vd thả tim bài đầu → tab "Của tôi" chen vào đầu) đẩy cả dãy
    // sang bên: kéo chip đang chọn về lại mép trái, đứng yên (không trượt)
    const mo = new MutationObserver((list) => {
      if (list.some((m) => m.type === 'childList' && m.target === el)) alignSelected(el, false)
      measure()
    })
    mo.observe(el, {childList: true, subtree: true, characterData: true})
    // Lăn dọc → cuộn ngang, chỉ khi hàng còn chỗ cuộn theo hướng đó (touchpad lăn ngang để nguyên)
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max - 1)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, {passive: false})
    return () => {
      el.removeEventListener('scroll', measure)
      el.removeEventListener('wheel', onWheel)
      ro.disconnect()
      mo.disconnect()
    }
  }, [measure])

  // Lần đầu hàng hiện ra: đặt thẳng vào chỗ. Đổi lựa chọn sau đó: trượt êm (giảm chuyển động thì
  // nhảy thẳng). Bảng cài đặt đóng chỉ là trượt ra ngoài, hàng vẫn có bề rộng để tính
  const mounted = useRef(false)
  useEffect(() => {
    if (ref.current) alignSelected(ref.current, mounted.current)
    mounted.current = true
  }, [selectedKey])

  const mask =
    edges.start || edges.end
      ? `linear-gradient(to right, ${edges.start ? 'transparent' : '#000'}, #000 ${FADE}px, #000 calc(100% - ${FADE}px), ${edges.end ? 'transparent' : '#000'})`
      : undefined

  const nudge = (dir: -1 | 1) => {
    const el = ref.current
    if (el) el.scrollBy({left: dir * el.clientWidth * 0.7, behavior: 'smooth'})
  }

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        ref={ref}
        {...aria}
        style={{maskImage: mask, WebkitMaskImage: mask}}
        className="flex min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain scroll-px-6 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0 [&>*]:whitespace-nowrap"
      >
        {children}
      </div>
      {edges.start && <EdgeArrow dir={-1} onClick={() => nudge(-1)} />}
      {edges.end && <EdgeArrow dir={1} onClick={() => nudge(1)} />}
    </div>
  )
}

// Cuộn chip đang chọn về sát mép trái. Tự tính scrollLeft (không scrollIntoView) để không kéo cả
// bảng cài đặt cuộn dọc theo. Chip đầu hàng thì về 0; chip cuối hàng thì trình duyệt tự dừng ở
// mức cuộn tối đa (chip nằm bên phải, vẫn hiện đủ)
function alignSelected(el: HTMLElement, smooth: boolean) {
  const on = el.querySelector<HTMLElement>('[aria-checked="true"]')
  if (!on || !el.clientWidth) return
  const left = Math.max(0, on.offsetLeft - el.offsetLeft - PEEK)
  if (Math.abs(left - el.scrollLeft) < 1) return
  const calm = !smooth || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollTo({left, behavior: calm ? 'instant' : 'smooth'})
}

// Mũi tên ở mép hàng. Ẩn với trình đọc màn hình và phím Tab: bàn phím đã có mũi tên trong nhóm radio
function EdgeArrow({dir, onClick}: {dir: -1 | 1; onClick: () => void}) {
  return (
    <button
      type="button"
      aria-hidden
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`pointer-events-none absolute top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#16131a] text-[#ede6dd] shadow-[0_0_10px_4px_#16131a] transition [@media(hover:hover)]:pointer-events-auto [@media(hover:hover)]:hover:border-[#e8b27d]/60 [@media(hover:hover)]:hover:text-[#f3cfa8] ${
        dir < 0 ? 'left-0' : 'right-0'
      }`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  )
}
