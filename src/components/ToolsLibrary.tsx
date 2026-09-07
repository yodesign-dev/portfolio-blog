'use client'

import {useEffect, useMemo, useState} from 'react'

type Tool = {
  _id: string
  name: string
  url: string
  description?: string
  category: string
  ctaLabel?: string
  usagePercent?: number
  rating?: number
  ratingCount?: number
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

const CATEGORY_STYLES: Record<string, string> = {
  design: 'bg-pink-50 text-pink-700',
  development: 'bg-emerald-50 text-emerald-700',
  ai: 'bg-violet-50 text-violet-700',
  productivity: 'bg-blue-50 text-blue-700',
  marketing: 'bg-amber-50 text-amber-700',
  other: 'bg-neutral-100 text-neutral-600',
}

// Số dòng hiện mỗi lần bấm "Xem thêm".
const PAGE_SIZE = 9

const SORT_OPTIONS = [
  {key: 'usage', label: 'Mức dùng'},
  {key: 'rating', label: 'Đánh giá'},
  {key: 'name', label: 'Tên A–Z'},
] as const

type SortKey = (typeof SORT_OPTIONS)[number]['key']

function getFaviconUrl(url: string): string | null {
  try {
    const {hostname} = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
  } catch {
    return null
  }
}

// Sinh số liệu giả lập nhưng ỔN ĐỊNH theo _id (không đổi giữa các lần
// render/reload) — chỉ dùng làm fallback cho tool nào CHƯA nhập
// usagePercent/rating trong Sanity Studio. Một khi bạn nhập đủ liệu thật
// cho toàn bộ tool, có thể xoá hàm này và bỏ luôn logic fallback bên dưới.
function getMockStats(id: string): {usage: number; rating: number; ratingCount: number} {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  const usage = 15 + (hash % 80) // 15–94
  const rating = 3.6 + ((hash >> 3) % 14) / 10 // 3.6–4.9
  const ratingCount = 8 + ((hash >> 6) % 220) // 8–227
  return {usage, rating: Math.round(rating * 10) / 10, ratingCount}
}

// Ưu tiên số liệu thật từ Sanity; field nào chưa nhập thì lấy từ mock.
function getStats(tool: Tool): {usage: number; rating: number; ratingCount: number; isMock: boolean} {
  const mock = getMockStats(tool._id)
  const hasReal =
    tool.usagePercent !== undefined && tool.rating !== undefined && tool.ratingCount !== undefined
  return {
    usage: tool.usagePercent ?? mock.usage,
    rating: tool.rating ?? mock.rating,
    ratingCount: tool.ratingCount ?? mock.ratingCount,
    isMock: !hasReal,
  }
}

export function ToolsLibrary({tools}: ToolsLibraryProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('usage')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const categories = useMemo(() => {
    const set = new Set(tools.map((t) => t.category))
    return Array.from(set)
  }, [tools])

  // Số liệu (thật hoặc fallback mock) được tính một lần cho mỗi tool,
  // giữ ổn định qua các lần sort/filter.
  const statsById = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getStats>>()
    tools.forEach((t) => map.set(t._id, getStats(t)))
    return map
  }, [tools])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const result = tools.filter((t) => {
      const matchesCategory = !category || t.category === category
      const matchesQuery =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.description ?? '').toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })

    return result.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      const statsA = statsById.get(a._id)!
      const statsB = statsById.get(b._id)!
      return sortKey === 'usage' ? statsB.usage - statsA.usage : statsB.rating - statsA.rating
    })
  }, [tools, query, category, sortKey, statsById])

  // Reset số lượng hiện khi search, filter hoặc sort đổi.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [query, category, sortKey])

  const visibleTools = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  const topUsage = useMemo(() => {
    let max = 0
    statsById.forEach((s) => {
      if (s.usage > max) max = s.usage
    })
    return max
  }, [statsById])

  return (
    <div>
      <div className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm công cụ theo tên hoặc mô tả..."
          className="w-full rounded-md border border-neutral-300 px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-10 md:flex-row">
        {/* Sidebar danh mục */}
        {categories.length > 0 && (
          <aside className="shrink-0 md:w-44">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
              Danh mục
            </p>
            <ul className="flex flex-row flex-wrap gap-1 md:flex-col md:flex-nowrap md:gap-0.5">
              <li>
                <button
                  type="button"
                  onClick={() => setCategory(null)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition md:rounded-none md:border-l-2 md:pl-3 ${
                    !category
                      ? 'bg-neutral-900 text-white md:border-neutral-900 md:bg-neutral-50 md:text-neutral-900'
                      : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400 md:border-0 md:border-l-2 md:border-transparent'
                  }`}
                >
                  <span>Tất cả</span>
                  <span className="text-xs text-neutral-400">{tools.length}</span>
                </button>
              </li>
              {categories.map((c) => (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition md:rounded-none md:border-l-2 md:pl-3 ${
                      category === c
                        ? 'bg-neutral-900 text-white md:border-neutral-900 md:bg-neutral-50 md:text-neutral-900'
                        : 'border border-neutral-200 text-neutral-600 hover:border-neutral-400 md:border-0 md:border-l-2 md:border-transparent'
                    }`}
                  >
                    <span>{CATEGORY_LABELS[c] ?? c}</span>
                    <span className="text-xs text-neutral-400">
                      {tools.filter((t) => t.category === c).length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* Danh sách chính */}
        <main className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-neutral-400">{filtered.length} công cụ</p>
            <div className="flex gap-1">
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSortKey(s.key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    sortKey === s.key
                      ? 'border-neutral-900 bg-neutral-900 text-white'
                      : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-neutral-400">Không tìm thấy công cụ nào phù hợp.</p>
          ) : (
            <>
              <div className="border-t border-neutral-200">
                {visibleTools.map((tool) => {
                  const favicon = getFaviconUrl(tool.url)
                  const categoryStyle =
                    CATEGORY_STYLES[tool.category] ?? 'bg-neutral-100 text-neutral-600'
                  const stats = statsById.get(tool._id)!

                  return (
                    <a
                      key={tool._id}
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-4 border-b border-neutral-200 py-5 no-underline transition hover:bg-neutral-50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-50 p-1.5">
                        {favicon ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={favicon} alt="" width={24} height={24} className="h-6 w-6" />
                        ) : (
                          <div className="h-6 w-6 rounded bg-neutral-200" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-neutral-900">{tool.name}</h3>
                          {stats.usage === topUsage && (
                            <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-white">
                              dùng nhiều nhất
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryStyle}`}
                          >
                            {CATEGORY_LABELS[tool.category] ?? tool.category}
                          </span>
                        </div>

                        {tool.description && (
                          <p className="mt-1.5 line-clamp-2 max-w-xl text-sm leading-relaxed text-neutral-600">
                            {tool.description}
                          </p>
                        )}
                      </div>

                      <div className="hidden w-32 shrink-0 text-right sm:block">
                        <div className="mb-1 flex items-center justify-end gap-1">
                          <svg
                            className="h-3 w-3 text-amber-500"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.8L10 14.9l-5.21 2.74 1-5.8-4.21-4.1 5.82-.85L10 1.5z" />
                          </svg>
                          <span className="text-sm font-medium text-neutral-900">
                            {stats.rating.toFixed(1)}
                          </span>
                          <span className="text-xs text-neutral-400">({stats.ratingCount})</span>
                          {stats.isMock && (
                            <span
                              title="Số liệu tạm, chưa nhập trong Sanity"
                              className="h-1.5 w-1.5 rounded-full bg-amber-400"
                            />
                          )}
                        </div>
                        <div className="ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-neutral-900"
                            style={{width: `${stats.usage}%`}}
                          />
                        </div>
                        <p className="mt-1 text-xs text-neutral-400">{stats.usage}% mức dùng</p>
                      </div>
                    </a>
                  )
                })}
              </div>

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
        </main>
      </div>
    </div>
  )
}
