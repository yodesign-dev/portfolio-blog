import {sanityFetch} from '@/sanity/lib/fetch'
import {LEGAL_DEFAULTS, toBlocks, type LegalBlock, type LegalKind} from '@/components/chill/legal-defaults'

// Nội dung /chill/terms và /chill/privacy — Studio "Chill · Pháp lý".
// Ô nào trống (hoặc chưa có tài liệu, Sanity lỗi) thì dùng bản mặc định trong code.

type LegalDoc = {
  owner?: string
  email?: string
  updated?: string
  terms?: LegalBlock[]
  termsEn?: LegalBlock[]
  privacy?: LegalBlock[]
  privacyEn?: LegalBlock[]
}

export type LegalContent = {
  owner: string
  email: string | null
  updated: string | null
  vi: LegalBlock[]
  en: LegalBlock[]
}

const LEGAL_QUERY = `*[_id == "chillLegal"][0]{owner, email, updated, terms, termsEn, privacy, privacyEn}`

export async function getLegal(kind: LegalKind, revalidate: number): Promise<LegalContent> {
  const doc = await sanityFetch<LegalDoc | null>({query: LEGAL_QUERY, revalidate}).catch(() => null)
  const vi = kind === 'terms' ? doc?.terms : doc?.privacy
  const en = kind === 'terms' ? doc?.termsEn : doc?.privacyEn
  return {
    owner: doc?.owner?.trim() || 'Bin',
    email: doc?.email?.trim() || null,
    updated: doc?.updated ?? null,
    vi: vi?.length ? vi : toBlocks(LEGAL_DEFAULTS[kind].vi),
    en: en?.length ? en : toBlocks(LEGAL_DEFAULTS[kind].en),
  }
}
