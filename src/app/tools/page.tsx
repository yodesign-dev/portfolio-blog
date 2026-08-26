import Link from 'next/link'
import {client} from '@/sanity/lib/client'
import {ToolsLibrary} from '@/components/ToolsLibrary'

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
  ctaLabel
}`

type Tool = {
  _id: string
  name: string
  url: string
  description?: string
  category: string
  ctaLabel?: string
}

async function getTools(): Promise<Tool[]> {
  return client.fetch(TOOLS_QUERY, {}, {next: {revalidate}})
}

export default async function ToolsPage() {
  const tools = await getTools()

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-5xl px-6 py-6 sm:px-8">
          <Link href="/" className="text-sm text-neutral-500 transition-colors hover:text-neutral-900">
            ← Về trang chủ
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Tools
          </h1>
          <p className="mt-2 text-neutral-500">
            Thư viện các công cụ mình đang dùng trong công việc hằng ngày.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16 sm:px-8">
        {tools.length === 0 ? (
          <p className="text-center text-neutral-400">Chưa có công cụ nào được thêm.</p>
        ) : (
          <ToolsLibrary tools={tools} />
        )}
      </main>
    </div>
  )
}
