'use client'

import Image from 'next/image'
import Link from 'next/link'
import {useEffect, useRef, useState} from 'react'

// Mục "Selected work" trang chủ: thẻ dọc có ảnh bìa.
// - Từ md: lưới 2 cột, từ lg: 4 cột, cả 4 case study nằm trong một màn hình.
// - Dưới md (điện thoại dọc / xoay ngang hẹp): một hàng vuốt ngang. Thẻ kế tiếp lộ ra một
//   phần để người xem biết còn nữa, kèm bộ đếm "1 / 4" và vạch vị trí. Không tự chạy.
// Tiếp cận: hàng thẻ vẫn là danh sách thật nên trình đọc màn hình đọc đủ, không phụ thuộc
// việc vuốt; Tab qua từng thẻ thì trình duyệt tự cuộn tới thẻ đó. Bộ đếm và vạch chỉ để
// nhìn (aria-hidden) vì số thẻ đã có trong danh sách.

export type SelectedWorkItem = {
  key: string
  href: string
  external: boolean
  meta: string
  title: string
  summary?: string
  scope: string
  platform?: string
  cover: {src: string; width: number; height: number; alt: string; framed: boolean} | null
}

export function SelectedWork({items}: {items: SelectedWorkItem[]}) {
  const listRef = useRef<HTMLUListElement>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    // Thẻ nào có mép trái gần mép trái khung cuộn nhất là thẻ đang xem
    const update = () => {
      const left = list.getBoundingClientRect().left
      let best = 0
      let bestDistance = Infinity
      Array.from(list.children).forEach((child, index) => {
        const distance = Math.abs(child.getBoundingClientRect().left - left - parseFloat(getComputedStyle(list).paddingLeft))
        if (distance < bestDistance) {
          bestDistance = distance
          best = index
        }
      })
      // Cuộn tới tận cùng thì coi như đang ở thẻ cuối (thẻ cuối không chạm được mép trái)
      if (list.scrollLeft + list.clientWidth >= list.scrollWidth - 4) best = items.length - 1
      setActive(best)
    }
    // Tab tới một thẻ đang nằm ngoài khung: tự cuộn ngang tới thẻ đó (không phải trình duyệt
    // nào cũng tự cuộn khung con khi focus). Chỉ khi đang là hàng vuốt, không đẩy trang lên xuống.
    const reveal = (event: FocusEvent) => {
      if (list.scrollWidth <= list.clientWidth) return
      const item = (event.target as HTMLElement).closest('li')
      if (!item) return
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // Tự tính đích thay vì scrollIntoView: thẻ cuối không thể canh mép trái, scrollIntoView khi đó
      // bị cơ chế "snap" kéo ngược lại. offsetLeft tính từ <ul> vì <ul> là `relative`.
      const target = Math.min(item.offsetLeft - parseFloat(getComputedStyle(list).paddingLeft), list.scrollWidth - list.clientWidth)
      list.scrollTo({left: target, behavior: still ? 'auto' : 'smooth'})
    }
    list.addEventListener('scroll', update, {passive: true})
    list.addEventListener('focusin', reveal)
    return () => {
      list.removeEventListener('scroll', update)
      list.removeEventListener('focusin', reveal)
    }
  }, [items.length])

  return (
    <div>
      {/* Chỉ hiện khi đang là hàng vuốt ngang */}
      <p aria-hidden="true" className="-mt-6 mb-4 text-right font-mono text-xs text-neutral-500 md:hidden">
        {active + 1} / {items.length}
      </p>
      <ul
        ref={listRef}
        className="relative -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-6 px-6 pb-3 pt-1 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:px-8 md:mx-0 md:grid md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <li key={item.key} className="w-[82%] max-w-[340px] shrink-0 snap-start sm:w-[46%] md:w-auto md:max-w-none">
            <WorkTile item={item} />
          </li>
        ))}
      </ul>
      <div aria-hidden="true" className="mt-3 flex justify-center gap-1.5 md:hidden">
        {items.map((item, index) => (
          <span
            key={item.key}
            className={`h-1 transition-all duration-200 motion-reduce:transition-none ${index === active ? 'w-5 bg-neutral-900' : 'w-2 bg-neutral-300'}`}
          />
        ))}
      </div>
    </div>
  )
}

// relative: các <span class="sr-only"> (position absolute) phải bám vào thẻ. Không có thì
// chúng lấy cả trang làm gốc, nằm ngoài khung cuộn ngang và làm trang bị cuộn ngang theo.
const TILE_CLASS =
  'group relative flex h-full flex-col border-2 border-neutral-900 bg-white shadow-hard transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-hard-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand motion-reduce:transform-none'

function WorkTile({item}: {item: SelectedWorkItem}) {
  const content = (
    <>
      <Cover cover={item.cover} />
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {item.meta && <p className="font-mono text-xs uppercase tracking-wider text-neutral-500">{item.meta}</p>}
        <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-neutral-900 transition-colors group-hover:text-brand">
          {item.title}
          {item.external && <span className="sr-only"> (opens in a new tab)</span>}
        </h3>
        {item.summary && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-neutral-600">{item.summary}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {item.scope && (
              <span className="bg-neutral-900 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-white">
                <span className="sr-only">Scope: </span>
                {item.scope}
              </span>
            )}
            {item.platform && <span className="text-xs text-neutral-500">{item.platform}</span>}
          </div>
          <span aria-hidden="true" className="shrink-0 text-lg text-neutral-900 transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
            {item.external ? '↗' : '→'}
          </span>
        </div>
      </div>
    </>
  )

  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={TILE_CLASS}>
      {content}
    </a>
  ) : (
    <Link href={item.href} className={TILE_CLASS}>
      {content}
    </Link>
  )
}

// Ảnh bìa 16:9. `framed`: ảnh chụp giao diện (bài chưa có ảnh bìa riêng) đặt trên nền xanh
// brand, cùng tông với các ảnh bìa minh hoạ xanh của bài khác.
function Cover({cover}: {cover: SelectedWorkItem['cover']}) {
  if (!cover) return <div aria-hidden="true" className="aspect-video border-b-2 border-neutral-900 bg-brand" />
  const sizes = '(min-width: 1024px) 270px, (min-width: 768px) 45vw, 82vw'
  return (
    <div className="relative aspect-video overflow-hidden border-b-2 border-neutral-900 bg-brand">
      {cover.framed ? (
        <div className="absolute inset-x-[8%] bottom-0 top-[10%] overflow-hidden border-2 border-b-0 border-neutral-900 bg-white">
          <Image
            src={cover.src}
            alt={cover.alt}
            fill
            sizes={sizes}
            className="object-cover object-top transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transform-none"
          />
        </div>
      ) : (
        <Image
          src={cover.src}
          alt={cover.alt}
          fill
          sizes={sizes}
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03] motion-reduce:transform-none"
        />
      )}
    </div>
  )
}
