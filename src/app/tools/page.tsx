import Link from 'next/link'
import {ToolsLibrary} from '@/components/ToolsLibrary'
import {sanityFetch} from '@/sanity/lib/fetch'
import {getLocale} from '@/lib/get-locale'
import {getDictionary} from '@/lib/i18n'

export const revalidate = 60

export const metadata = {
  title: 'Tools',
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

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 py-6 sm:px-8">
          <Link href="/" className="text-sm text-neutral-500 transition-colors hover:text-neutral-900">
            {t.common.backHome}
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            {t.tools.title}
          </h1>
          <p className="mt-2 text-neutral-500">{t.tools.subtitle}</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        {tools.length === 0 ? (
          <p className="text-center text-neutral-400">{t.tools.empty}</p>
        ) : (
          <ToolsLibrary tools={tools} locale={locale} />
        )}
      </main>
    </div>
  )
}
