'use client'

import {useRouter} from 'next/navigation'
import {useEffect, useState} from 'react'
import {DEFAULT_LOCALE, LANG_COOKIE, type Locale} from '@/lib/i18n'

function readCookieLocale(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE
  const match = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`))
  const value = match?.[1]
  return value === 'en' || value === 'vi' ? value : DEFAULT_LOCALE
}

export function LanguageToggle() {
  const router = useRouter()
  // Mặc định DEFAULT_LOCALE để khớp với HTML render phía server (tránh
  // hydration mismatch), sau đó đồng bộ lại theo cookie thật ngay khi
  // component mount ở client.
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    setLocale(readCookieLocale())
  }, [])

  function toggle() {
    const next: Locale = locale === 'vi' ? 'en' : 'vi'
    setLocale(next)
    // 1 năm, path=/ để cookie áp dụng cho toàn bộ site.
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000`
    // Re-render các Server Component (page.tsx) với cookie mới —
    // không đổi URL, không reload toàn trang.
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Đổi ngôn ngữ / Switch language"
      className="flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
    >
      <span className={locale === 'vi' ? 'text-neutral-900' : ''}>VN</span>
      <span className="text-neutral-300">/</span>
      <span className={locale === 'en' ? 'text-neutral-900' : ''}>EN</span>
    </button>
  )
}
