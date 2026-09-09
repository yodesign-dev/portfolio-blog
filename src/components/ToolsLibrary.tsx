'use client'

import {useEffect, useMemo, useState} from 'react'
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
  design: 'bg-pink-50 text-pink-700',
  development: 'bg-emerald-50 text-emerald-700',
  ai: 'bg-violet-50 text-violet-700',
  productivity: 'bg-blue-50 text-blue-700',
  marketing: 'bg-amber-50 text-amber-700',
  other: 'bg-neutral-100 text-neutral-600',
}

const PAGE_SIZE = 9

function getFaviconUrl(url: string): string | null {
  try {
    const {hostname} = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
  } catch {
    return null
  }
}

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

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [query, category])

  const visibleTools = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length

  return (
    <div>
      <div className="mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full rounded-md border border-neutral-300 px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-10 md:flex-row">
        {categories.length > 0 && (
          <aside className="shrink-0 md:w-44">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-400">
              {t.category}
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
                  <span>{t.all}</span>
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
                    <span>{CATEGORY_LABELS[c as keyof typeof CATEGORY_LABELS] ?? c}</span>
                    <span className="text-xs text-neutral-400">
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
                  const favicon = getFaviconUrl(tool.url)
                  const categoryStyle =
                    CATEGORY_STYLES[tool.category] ?? 'bg-neutral-100 text-neutral-600'

                  return (
                    <a
                      key={tool._id}
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-4 rounded-xl border border-neutral-200 bg-white p-5 no-underline transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
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
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryStyle}`}
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
                    className="rounded-md border border-neutral-300 px-6 py-2.5 text-sm font-semibold text-neutral-900 transition hover:border-neutral-900"
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
