import {cookies} from 'next/headers'
import {DEFAULT_LOCALE, type Locale} from './i18n'

export const LANG_COOKIE = 'lang'

// Dùng trong Server Component (page.tsx) — đọc cookie ngôn ngữ do
// LanguageToggle set, không cần đổi URL.
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const value = store.get(LANG_COOKIE)?.value
  return value === 'en' || value === 'vi' ? value : DEFAULT_LOCALE
}
