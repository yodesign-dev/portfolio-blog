'use client'

import {useEffect, useMemo, useState} from 'react'

type Tool = {
  _id: string
  name: string
  url: string
  description?: string
  category: string
  ctaLabel?: string
}

type ToolsLibraryProps = {
  tools: Tool[]
}

const CATEGORY_LABELS: Record<string, string> = {
  design: 'Design',
  development: 'Development',
  ai: 'AI',
  productivity: 'Productivity',
  marketing: 'Marketing',
  other: 'Khác',
}

// MỚI: màu riêng cho từng category — giúp quét mắt nhanh hơn khi
// lướt qua nhiều card, thay vì toàn bộ badge cùng một màu xám.
const CATEGORY_STYLES: Record<string, string> = {
  design: 'bg-pink-50 text-pink-700',
  development: 'bg-emerald-50 text-emerald-700',
  ai: 'bg-violet-50 text-violet-700',
  productivity: 'bg-blue-50 text-blue-700',
  marketing: 'bg-amber-50 text-amber-700',
  other: 'bg-neutral-100 text-neutral-600',
}

// Số card hiện mỗi lần — khớp lưới 3 cột (3 hàng đầu tiên).
const PAGE_SIZE = 9

function getFaviconUrl(url: string): string | null {
  try {
    const {hostname} = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
  } catch {
    return null
  }
}

export function ToolsLibrary({tools}: ToolsLibraryProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const categories = useMemo(() => {
    const set = new Set(tools.map((t) => t.category))
    return Array.from(set)
  }, [tools])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tools.filter((t) => {
      const matchesCategory = !category || t.category === category
      const matchesQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })
  }, [tools, query, category])

  // MỚI: mỗi khi search hoặc category đổi, reset lại số lượng hiện —
  // tránh trường hợp đang xem trang 3 rồi đổi filter, danh sách mới
  // ngắn hơn vị trí cuộn hiện tại, gây hụt hẫng.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [query, category])

  const visibleTools = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  return (
    <div>
      <div className="mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm công cụ theo tên hoặc mô tả..."
          className="w-full rounded-md border border-neutral-300 px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
        />
      </div>

      {categories.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              !category
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
            }`}
          >
            Tất cả
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                category === c
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
            >
              {CATEGORY_LABELS[c] ?? c}
            </button>
          ))}
        </div>
      )}

      {/* MỚI: đếm số kết quả — hữu ích khi đang search/lọc */}
      <p className="mb-6 text-sm text-neutral-400">
        {filtered.length} công cụ
      </p>

      {filtered.length === 0 ? (
        <p className="text-center text-neutral-400">Không tìm thấy công cụ nào phù hợp.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTools.map((tool) => {
              const favicon = getFaviconUrl(tool.url)
              const categoryStyle =
                CATEGORY_STYLES[tool.category] ?? 'bg-neutral-100 text-neutral-600'

              return (
                <div
                  key={tool._id}
                  className="flex flex-col rounded-lg border border-neutral-200 p-5 transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    {/* MỚI: nền xám nhạt quanh icon — tránh logo đơn sắc
                        (đen/trắng) bị "trôi" mất trên nền card trắng */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-50 p-1.5">
                      {favicon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={favicon} alt="" width={24} height={24} className="h-6 w-6" />
                      ) : (
                        <div className="h-6 w-6 rounded bg-neutral-200" />
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-neutral-900">{tool.name}</h3>
                  </div>

                  {tool.description && (
                    <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-neutral-600">
                      {tool.description}
                    </p>
                  )}

                  <span
                    className={`mt-3 inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryStyle}`}
                  >
                    {CATEGORY_LABELS[tool.category] ?? tool.category}
                  </span>

                  <a
                    href={tool.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700"
                  >
                    {tool.ctaLabel || 'Truy cập'}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 7l-10 10M17 7H8m9 0v9" />
                    </svg>
                  </a>
                </div>
              )
            })}
          </div>

          {/* MỚI: nút "Xem thêm" — phân trang kiểu load-more, hiện thêm
              PAGE_SIZE card mỗi lần bấm, không reload trang */}
          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="rounded-md border border-neutral-300 px-6 py-2.5 text-sm font-semibold text-neutral-900 transition hover:border-neutral-900"
              >
                Xem thêm ({filtered.length - visibleCount} công cụ nữa)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
