'use client'

import Link from 'next/link'
import {usePathname} from 'next/navigation'

const TABS = [
  {href: '/tools', label: 'Library'},
  {href: '/tools/timeline', label: 'Timeline'},
]

export function ToolkitTabs() {
  const pathname = usePathname()

  return (
    <nav aria-label="Toolkit" className="mt-6 flex gap-6">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition ${
              isActive
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
