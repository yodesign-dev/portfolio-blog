import Link from 'next/link'
import {TimelineExplorer} from '@/components/TimelineExplorer'
import {sanityFetch} from '@/sanity/lib/fetch'
import {getLocale} from '@/lib/get-locale'
import {getDictionary} from '@/lib/i18n'

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
  return sanityFetch<YearData[]>({query: TIMELINE_QUERY, revalidate})
}

export default async function TimelinePage() {
  const [years, locale] = await Promise.all([getTimeline(), getLocale()])
  const t = getDictionary(locale)

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 py-6 sm:px-8">
          <Link href="/" className="text-sm text-neutral-500 transition-colors hover:text-neutral-900">
            {t.common.backHome}
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            {t.timeline.title}
          </h1>
          <p className="mt-2 text-neutral-500">{t.timeline.subtitle}</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        {years.length === 0 ? (
          <p className="text-center text-neutral-400">{t.timeline.empty}</p>
        ) : (
          <TimelineExplorer years={years} />
        )}
      </main>
    </div>
  )
}
