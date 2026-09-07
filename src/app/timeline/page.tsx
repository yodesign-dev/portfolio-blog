import Link from 'next/link'
import {client} from '@/sanity/lib/client'
import {TimelineExplorer} from '@/components/TimelineExplorer'

export const revalidate = 60

export const metadata = {
  title: 'Timeline',
}

const TIMELINE_QUERY = `*[_type == "timelineYear"] | order(year asc) {
  year,
  "tools": tools[]->{
    _id,
    name,
    url,
    category
  }
}`

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

async function getTimeline(): Promise<YearData[]> {
  return client.fetch(TIMELINE_QUERY, {}, {next: {revalidate}})
}

export default async function TimelinePage() {
  const years = await getTimeline()

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      {/* CẬP NHẬT: max-w-4xl → max-w-6xl — layout rộng hơn, phù hợp
          hơn cho trang có biểu đồ/data visualization */}
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 py-6 sm:px-8">
          <Link href="/" className="text-sm text-neutral-500 transition-colors hover:text-neutral-900">
            ← Về trang chủ
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Timeline
          </h1>
          <p className="mt-2 text-neutral-500">
            Công cụ thiết kế & AI được dùng nhiều qua từng năm.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        {years.length === 0 ? (
          <p className="text-center text-neutral-400">Chưa có dữ liệu timeline nào.</p>
        ) : (
          <TimelineExplorer years={years} />
        )}
      </main>
    </div>
  )
}
