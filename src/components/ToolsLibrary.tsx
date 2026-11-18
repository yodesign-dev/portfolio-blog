'use client'

import {useMemo, useState} from 'react'
import {ToolIcon} from '@/components/ToolIcon'
import {getDictionary, type Locale} from '@/lib/i18n'

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
  locale: Locale
}

const CATEGORY_STYLES: Record<string, string> = {
  // Viền + chữ cùng màu, không nền nhạt: nền pastel lạnh (pink-50, blue-50…) lạc tông trên thẻ giấy kem
  design: 'border border-current text-pink-700',
  development: 'border border-current text-emerald-700',
  ai: 'border border-current text-brand',
  productivity: 'border border-current text-sky-800',
  marketing: 'border border-current text-amber-800',
  other: 'border border-current text-neutral-600',
}

const PAGE_SIZE = 9

export function ToolsLibrary({tools, locale}: ToolsLibraryProps) {
  const t = getDictionary(locale).common
  const CATEGORY_LABELS = t.categories

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const categories = useMemo(() => {
    const set = new Set(tools.map((tool) => tool.category))
    return Array.from(set)
  }, [tools])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tools
      .filter((tool) => {
        const matchesCategory = !category || tool.category === category
        const matchesQuery =
          !q ||
          tool.name.toLowerCase().includes(q) ||
          (tool.description ?? '').toLowerCase().includes(q)
        return matchesCategory && matchesQuery
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [tools, query, category])

  // Đổi từ khoá / danh mục thì quay về trang đầu của danh sách
  const changeQuery = (value: string) => {
    setQuery(value)
    setVisibleCount(PAGE_SIZE)
  }
  const changeCategory = (value: string | null) => {
    setCategory(value)
    setVisibleCount(PAGE_SIZE)
  }

  const visibleTools = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  return (
    <div>
      <div className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => changeQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full border-2 border-neutral-900 bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 transition focus:border-brand focus:shadow-hard focus:shadow-brand focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-10 md:flex-row">
        {categories.length > 0 && (
          <aside className="shrink-0 md:w-44">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-neutral-400">
              {t.category}
            </p>
            <ul className="flex flex-row flex-wrap gap-1 md:flex-col md:flex-nowrap md:gap-0.5">
              <li>
                <button
                  type="button"
                  onClick={() => changeCategory(null)}
                  className={`flex w-full items-center justify-between gap-2 border-2 px-3 py-2 text-left font-mono text-xs uppercase tracking-[0.06em] transition touch:min-h-11 md:border-0 md:border-l-2 md:pl-3 ${
                    !category
                      ? 'border-neutral-900 bg-neutral-900 text-white md:bg-neutral-50 md:text-neutral-900'
                      : 'border-neutral-300 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 md:border-transparent md:hover:border-neutral-300'
                  }`}
                >
                  <span>{t.all}</span>
                  {/* opacity thay cho màu xám cố định: số đếm ăn theo màu chữ của nút nên đọc được
                      cả khi nút đang chọn có nền đen (xám cố định trên nền đen chỉ đạt 3.1:1) */}
                  <span className="text-xs opacity-80">{tools.length}</span>
                </button>
              </li>
              {categories.map((c) => (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => changeCategory(c)}
                    className={`flex w-full items-center justify-between gap-2 border-2 px-3 py-2 text-left font-mono text-xs uppercase tracking-[0.06em] transition touch:min-h-11 md:border-0 md:border-l-2 md:pl-3 ${
                      category === c
                        ? 'border-neutral-900 bg-neutral-900 text-white md:bg-neutral-50 md:text-neutral-900'
                        : 'border-neutral-300 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 md:border-transparent md:hover:border-neutral-300'
                    }`}
                  >
                    <span>{CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c}</span>
                    <span className="text-xs opacity-80">
                      {tools.filter((tool) => tool.category === c).length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        <main className="min-w-0 flex-1">
          <div className="mb-4">
            <p className="text-sm text-neutral-400">
              {filtered.length} {t.toolsCount}
            </p>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-neutral-400">{t.noToolsFound}</p>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {visibleTools.map((tool) => {
                  const categoryStyle =
                    CATEGORY_STYLES[tool.category] ?? 'bg-neutral-100 text-neutral-600'

                  return (
                    <a
                      key={tool._id}
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-4 border-2 border-neutral-900 bg-white p-5 no-underline shadow-hard-sm transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-hard-lg motion-reduce:transform-none"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-50 p-1.5">
                        <ToolIcon name={tool.name} url={tool.url} size={24} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-neutral-900">{tool.name}</h3>
                          <span
                            className={`px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em] ${categoryStyle}`}
                          >
                            {CATEGORY_LABELS[tool.category as keyof typeof CATEGORY_LABELS] ?? tool.category}
                          </span>
                        </div>

                        {tool.description && (
                          <p className="mt-1.5 line-clamp-2 max-w-xl text-sm leading-relaxed text-neutral-600">
                            {tool.description}
                          </p>
                        )}
                      </div>

                      <svg
                        className="mt-1 h-4 w-4 shrink-0 -translate-x-1 text-neutral-300 opacity-0 transition-all duration-150 ease-out group-hover:translate-x-0 group-hover:text-neutral-500 group-hover:opacity-100"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  )
                })}
              </div>

              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="btn-hard min-h-12 bg-white px-6 text-neutral-900 hover:bg-neutral-50"
                  >
                    {t.loadMore} ({filtered.length - visibleCount} {t.itemsSuffix})
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
