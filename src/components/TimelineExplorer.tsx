'use client'

import {useMemo, useState} from 'react'

type Tool = {
  _id: string
  name: string
  url: string
  category: string
}

type YearData = {
  year: number
  tools: Tool[]
}

type TimelineExplorerProps = {
  years: YearData[]
}

function getFaviconUrl(url: string): string | null {
  try {
    const {hostname} = new URL(url)
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
  } catch {
    return null
  }
}

export function TimelineExplorer({years}: TimelineExplorerProps) {
  const [selectedIndex, setSelectedIndex] = useState(years.length - 1)
  // MỚI: index đang hover trên biểu đồ — khác với selectedIndex (dùng
  // cho thanh trượt), để hover không làm nhảy luôn danh sách tool phía
  // dưới, chỉ hiện tooltip tạm thời
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const chartData = useMemo(
    () =>
      years.map((y) => ({
        year: y.year,
        total: y.tools.length,
        ai: y.tools.filter((t) => t.category === 'ai').length,
      })),
    [years]
  )

  const maxTotal = Math.max(1, ...chartData.map((d) => d.total))
  const width = 720
  const height = 200
  const padding = 24

  const pointFor = (index: number, value: number) => {
    const x =
      chartData.length <= 1
        ? width / 2
        : padding + (index / (chartData.length - 1)) * (width - padding * 2)
    const y = height - padding - (value / maxTotal) * (height - padding * 2)
    return {x, y}
  }

  const totalPath = chartData
    .map((d, i) => {
      const {x, y} = pointFor(i, d.total)
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')

  const aiPath = chartData
    .map((d, i) => {
      const {x, y} = pointFor(i, d.ai)
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')

  const selected = years[selectedIndex]
  const previousTools = selectedIndex > 0 ? years[selectedIndex - 1].tools : []
  const previousIds = new Set(previousTools.map((t) => t._id))

  // MỚI: vị trí + hướng neo tooltip — điểm đầu neo trái, điểm cuối neo
  // phải, các điểm giữa canh giữa, tránh tooltip bị tràn ra ngoài khung
  const isFirst = hoveredIndex === 0
  const isLast = hoveredIndex === chartData.length - 1
  const anchorClass = isFirst
    ? 'translate-x-0'
    : isLast
      ? '-translate-x-full'
      : '-translate-x-1/2'

  return (
    <div>
      <div className="mb-8 overflow-x-auto rounded-lg border border-neutral-200 p-4">
        <div className="relative">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full min-w-[600px]"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <path d={totalPath} fill="none" stroke="#a3a3a3" strokeWidth={2} />
            <path d={aiPath} fill="none" stroke="#7c3aed" strokeWidth={2} />
            {chartData.map((d, i) => {
              const total = pointFor(i, d.total)
              const ai = pointFor(i, d.ai)
              const isSelected = i === selectedIndex
              return (
                <g key={d.year}>
                  {/* MỚI: vùng hit-test vô hình, bán kính lớn hơn chấm
                      thật để dễ hover trúng bằng chuột */}
                  <circle
                    cx={total.x}
                    cy={total.y}
                    r={14}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIndex(i)}
                    className="cursor-pointer"
                  />
                  <circle
                    cx={ai.x}
                    cy={ai.y}
                    r={14}
                    fill="transparent"
                    onMouseEnter={() => setHoveredIndex(i)}
                    className="cursor-pointer"
                  />

                  <circle
                    cx={total.x}
                    cy={total.y}
                    r={isSelected || i === hoveredIndex ? 5 : 3}
                    fill="#a3a3a3"
                  />
                  <circle
                    cx={ai.x}
                    cy={ai.y}
                    r={isSelected || i === hoveredIndex ? 5 : 3}
                    fill="#7c3aed"
                  />
                  <text
                    x={total.x}
                    y={height - 4}
                    textAnchor="middle"
                    className="fill-neutral-400 text-[10px]"
                  >
                    {d.year}
                  </text>
                </g>
              )
            })}
          </svg>

          {/* MỚI: tooltip hiện khi hover — tên năm + danh sách tool.
              Hiện phía DƯỚI điểm (không phải phía trên) — điểm dữ liệu
              thường nằm gần mép trên biểu đồ (giá trị cao), nếu tooltip
              đẩy lên trên sẽ bị cắt mất do overflow-x-auto của khung
              chứa vô tình ép overflow-y thành auto theo đặc tả CSS. */}
          {hoveredIndex !== null && (
            <div
              className={`pointer-events-none absolute z-10 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg ${anchorClass}`}
              style={{
                left: `${(pointFor(hoveredIndex, chartData[hoveredIndex].total).x / width) * 100}%`,
                top: `${(pointFor(hoveredIndex, chartData[hoveredIndex].total).y / height) * 100}%`,
                marginTop: '12px',
              }}
            >
              <p className="font-semibold text-neutral-900">{years[hoveredIndex].year}</p>
              <p className="mt-1 max-w-[220px] whitespace-normal leading-relaxed text-neutral-600">
                {years[hoveredIndex].tools.map((t) => t.name).join(', ') || 'Chưa có dữ liệu'}
              </p>
            </div>
          )}
        </div>

        <div className="mt-2 flex gap-4 text-xs text-neutral-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-neutral-400" /> Tổng số tool
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-600" /> Tool AI
          </span>
        </div>
      </div>

      <div className="mb-10">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-500">Kéo để xem theo năm</span>
          <span className="text-2xl font-bold text-neutral-900">{selected.year}</span>
        </div>
        <input
          type="range"
          min={0}
          max={years.length - 1}
          step={1}
          value={selectedIndex}
          onChange={(e) => setSelectedIndex(Number(e.target.value))}
          className="w-full accent-[#00ddff]"
        />
        <div className="mt-1 flex justify-between text-xs text-neutral-400">
          <span>{years[0].year}</span>
          <span>{years[years.length - 1].year}</span>
        </div>
      </div>

      {selected.tools.length === 0 ? (
        <p className="text-center text-neutral-400">Chưa có công cụ nào cho năm này.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {selected.tools.map((tool) => {
            const favicon = getFaviconUrl(tool.url)
            const isNew = selectedIndex > 0 && !previousIds.has(tool._id)
            return (
              <a
                key={tool._id}
                href={tool.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex flex-col items-center gap-2 rounded-lg border border-neutral-200 p-4 text-center transition hover:border-neutral-400"
              >
                {isNew && (
                  <span className="absolute -top-2 -right-2 rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Mới
                  </span>
                )}
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-50 p-1.5">
                  {favicon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={favicon} alt="" width={28} height={28} className="h-7 w-7" />
                  ) : (
                    <div className="h-7 w-7 rounded bg-neutral-200" />
                  )}
                </div>
                <span className="text-sm font-medium text-neutral-900">{tool.name}</span>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
