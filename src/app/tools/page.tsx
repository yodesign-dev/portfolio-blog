import {ToolsLibrary} from '@/components/ToolsLibrary'
import {sanityFetch} from '@/sanity/lib/fetch'
import {getLocale} from '@/lib/get-locale'
import {getDictionary} from '@/lib/i18n'

export const revalidate = 60

export const metadata = {
  title: 'Toolkit',
}

const TOOLS_QUERY = `*[_type == "tool"] | order(name asc) {
  _id,
  name,
  url,
  description,
  category,
  ctaLabel,
  usagePercent,
  rating,
  ratingCount
}`

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

async function getTools(): Promise<Tool[]> {
  return sanityFetch<Tool[]>({query: TOOLS_QUERY, revalidate})
}

export default async function ToolsPage() {
  const [tools, locale] = await Promise.all([getTools(), getLocale()])
  const t = getDictionary(locale)

  return tools.length === 0 ? (
    <p className="text-center text-neutral-400">{t.tools.empty}</p>
  ) : (
    <ToolsLibrary tools={tools} locale={locale} />
  )
}
