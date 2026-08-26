'use client'

import {useMemo, useState} from 'react'

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

// Lấy favicon trực tiếp từ domain của URL — không cần lưu ảnh trong
// Sanity, không cần bạn upload logo tay cho từng tool.
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

  // Danh sách category thực tế đang có, suy ra từ chính dữ liệu tools —
  // không cần query Sanity riêng cho việc này.
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
        <div className="mb-10 flex flex-wrap gap-2">
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

      {filtered.length === 0 ? (
        <p className="text-center text-neutral-400">Không tìm thấy công cụ nào phù hợp.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tool) => {
            const favicon = getFaviconUrl(tool.url)
            return (
              <div
                key={tool._id}
                className="flex flex-col rounded-lg border border-neutral-200 p-5 transition hover:border-neutral-400"
              >
                <div className="flex items-center gap-3">
                  {favicon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={favicon}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 shrink-0 rounded"
                    />
                  ) : (
                    <div className="h-8 w-8 shrink-0 rounded bg-neutral-100" />
                  )}
                  <h3 className="text-base font-semibold text-neutral-900">{tool.name}</h3>
                </div>

                {tool.description && (
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-600">
                    {tool.description}
                  </p>
                )}

                <span className="mt-3 inline-block w-fit rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
                  {CATEGORY_LABELS[tool.category] ?? tool.category}
                </span>

                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700"
                >
                  {tool.ctaLabel || 'Truy cập'}
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
