'use client'

import type {Locale} from '@/lib/i18n'

interface LanguageToggleProps {
  locale: Locale
  onToggle: () => void
}

export function LanguageToggle({locale, onToggle}: LanguageToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Đổi ngôn ngữ / Switch language"
      className="flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
    >
      <span className={locale === 'vi' ? 'text-neutral-900' : ''}>VN</span>
      <span className="text-neutral-300">/</span>
      <span className={locale === 'en' ? 'text-neutral-900' : ''}>EN</span>
    </button>
  )
}
