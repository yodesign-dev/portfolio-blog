'use client'

import type {Locale} from '@/lib/i18n'

interface LanguageToggleProps {
  locale: Locale
  onSelect: (locale: Locale) => void
}

export function LanguageToggle({locale, onSelect}: LanguageToggleProps) {
  const base =
    'rounded-full px-3 py-1.5 text-xs font-semibold transition min-w-[40px] text-center'
  const active = 'bg-neutral-900 text-white'
  const inactive = 'text-neutral-500 hover:text-neutral-900'

  return (
    <div
      role="group"
      aria-label="Đổi ngôn ngữ / Switch language"
      className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 p-0.5"
    >
      <button
        type="button"
        onClick={() => onSelect('vi')}
        aria-pressed={locale === 'vi'}
        className={`${base} ${locale === 'vi' ? active : inactive}`}
      >
        VN
      </button>
      <button
        type="button"
        onClick={() => onSelect('en')}
        aria-pressed={locale === 'en'}
        className={`${base} ${locale === 'en' ? active : inactive}`}
      >
        EN
      </button>
    </div>
  )
}
