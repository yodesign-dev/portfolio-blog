'use client'

import Link from 'next/link'
import {PortableText, type PortableTextComponents} from '@portabletext/react'
import {setLang, useLang, type Lang} from './i18n'
import type {LegalBlock, LegalKind} from './legal-defaults'
import type {LegalContent} from '@/app/chill/legal'

// Trang /chill/terms và /chill/privacy — cùng ngôn ngữ với quán (nút EN/VI dùng chung).

const COPY: Record<Lang, {back: string; updated: string; noEmail: string; titles: Record<LegalKind, string>}> = {
  vi: {
    back: '← Về quán',
    updated: 'Cập nhật',
    noEmail: '(chưa có email)',
    titles: {terms: 'Điều khoản & Bản quyền', privacy: 'Quyền riêng tư'},
  },
  en: {
    back: '← Back to the café',
    updated: 'Updated',
    noEmail: '(email coming soon)',
    titles: {terms: 'Terms & Copyright', privacy: 'Privacy'},
  },
}

const PATHS: Record<LegalKind, string> = {terms: '/chill/terms', privacy: '/chill/privacy'}

const components: PortableTextComponents = {
  block: {
    h2: ({children}) => <h2 className="mt-10 text-lg font-bold text-[#f3cfa8]">{children}</h2>,
    normal: ({children}) => <p className="mt-3 leading-relaxed">{children}</p>,
  },
  list: {bullet: ({children}) => <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-[#e8b27d]">{children}</ul>},
  listItem: {bullet: ({children}) => <li className="leading-relaxed">{children}</li>},
  marks: {
    strong: ({children}) => <strong className="font-semibold text-[#f6dcbd]">{children}</strong>,
    link: ({value, children}) => (
      <a href={value?.href} className="text-[#e8b27d] underline underline-offset-2 hover:text-[#f3cfa8]">
        {children}
      </a>
    ),
  },
}

function formatDate(iso: string, lang: Lang) {
  const [y, m, d] = iso.split('-')
  return lang === 'vi' ? `${d}/${m}/${y}` : new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'})
}

// Thay {owner} / {email} / {updated} trong văn bản Studio
function fill(blocks: LegalBlock[], vars: Record<string, string>): LegalBlock[] {
  return blocks.map((block) => ({
    ...block,
    children: block.children?.map((child) =>
      typeof child.text === 'string' ? {...child, text: child.text.replace(/\{(owner|email|updated)\}/g, (_, key: string) => vars[key])} : child,
    ),
  }))
}

export function LegalPage({kind, content}: {kind: LegalKind; content: LegalContent}) {
  const lang = useLang()
  const copy = COPY[lang]
  const other: LegalKind = kind === 'terms' ? 'privacy' : 'terms'
  const updated = content.updated ? formatDate(content.updated, lang) : ''
  const blocks = fill(content[lang], {owner: content.owner, email: content.email ?? copy.noEmail, updated})

  return (
    <main className="min-h-dvh bg-[#1b1a21] px-4 py-10 text-[#ede6dd] antialiased sm:px-8 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-4 text-sm">
          <Link href="/chill" className="text-[#e8b27d] hover:text-[#f3cfa8]">
            {copy.back}
          </Link>
          <div className="flex overflow-hidden rounded-full border border-white/15 text-xs" role="group" aria-label="Language">
            {(['vi', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`cursor-pointer px-3 py-1.5 font-semibold uppercase ${lang === l ? 'bg-[#e8b27d] text-[#1b1a21]' : 'text-[#a79e94] hover:text-[#ede6dd]'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <h1 className="mt-10 text-3xl font-bold tracking-tight text-[#f6dcbd]">{copy.titles[kind]}</h1>
        {updated && (
          <p className="mt-2 text-sm text-[#a79e94]">
            {copy.updated} {updated}
          </p>
        )}

        <article className="mt-6 text-[15px] text-[#ede6dd]/90">
          <PortableText value={blocks} components={components} />
        </article>

        <footer className="mt-14 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 pt-6 text-sm text-[#a79e94]">
          <span>
            © {new Date().getFullYear()} {content.owner}
          </span>
          <Link href={PATHS[other]} className="hover:text-[#ede6dd]">
            {copy.titles[other]}
          </Link>
          <Link href="/chill" className="hover:text-[#ede6dd]">
            /chill
          </Link>
        </footer>
      </div>
    </main>
  )
}
