import {TimelineExplorer} from '@/components/TimelineExplorer'
import {sanityFetch} from '@/sanity/lib/fetch'
import {getLocale} from '@/lib/get-locale'
import {getDictionary} from '@/lib/i18n'

export const revalidate = 60

export const metadata = {
  title: 'Timeline · Toolkit',
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

  return years.length === 0 ? (
    <p className="text-center text-neutral-400">{t.timeline.empty}</p>
  ) : (
    <TimelineExplorer years={years} />
  )
}
