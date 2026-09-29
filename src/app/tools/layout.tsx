import {ToolkitTabs} from '@/components/ToolkitTabs'
import {getLocale} from '@/lib/get-locale'
import {getDictionary} from '@/lib/i18n'

// Toolkit = thư viện công cụ (/tools) + Timeline (/tools/timeline, trước
// đây là trang riêng /timeline) — chung 1 header, chuyển qua lại bằng tab.
export default async function ToolkitLayout({children}: {children: React.ReactNode}) {
  const t = getDictionary(await getLocale())

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 pt-10 sm:px-8">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            {t.tools.title}
          </h1>
          <p className="mt-2 text-neutral-500">{t.tools.subtitle}</p>
          <ToolkitTabs />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 sm:px-8">{children}</main>
    </div>
  )
}
