import Link from 'next/link'
import {sanityFetch} from '@/sanity/lib/fetch'
import {ImpactStats, type ImpactMetric} from '@/components/ImpactStats'

export type CaseStudy = {
  _id: string
  title: string
  slug: {current: string}
  mainImage?: {
    asset?: {_ref: string}
    alt?: string
  }
  excerpt?: string
  cardProblem?: string
  cardSolution?: string
  role?: string
  company?: string
  year?: string
  platform?: string
  projectType?: string
  projectStatus?: string
  uxWork?: string[]
  uiWork?: string[]
  externalUrl?: string
  impact?: ImpactMetric[]
  bodyImages?: {_key: string; asset?: {_ref: string}}[]
}

const CASE_STUDIES_QUERY = `*[_type == "post" && isCaseStudy == true] | order(publishedAt desc) {
  _id,
  title,
  slug,
  mainImage,
  excerpt,
  cardProblem,
  cardSolution,
  role,
  company,
  year,
  platform,
  projectType,
  projectStatus,
  uxWork,
  uiWork,
  externalUrl,
  impact[]{_key, value, label},
  "bodyImages": body[_type == "image"]{_key, asset}
}`

export async function getCaseStudies(revalidate: number): Promise<CaseStudy[]> {
  return sanityFetch<CaseStudy[]>({query: CASE_STUDIES_QUERY, revalidate})
}

const CARD_CLASS =
  'group block border-2 border-neutral-900 bg-white p-6 shadow-hard transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-hard-lg motion-reduce:transform-none sm:p-8'

// Bài nằm ở nơi khác: ghi rõ nơi mở tới
function externalLabel(url: string) {
  if (url.includes('medium.com')) return 'Read on Medium'
  if (url.includes('behance.net')) return 'View on Behance'
  return 'View project'
}

function WorkRow({label, items}: {label: string; items: string[]}) {
  if (items.length === 0) return null
  return (
    <div className="flex items-start gap-3">
      <dt className="w-7 shrink-0 pt-0.5 font-mono text-xs font-bold uppercase tracking-[0.06em] text-neutral-900">
        {label}
      </dt>
      <dd className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="bg-neutral-100 px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-neutral-600"
          >
            {item}
          </span>
        ))}
      </dd>
    </div>
  )
}

// Thẻ case study: để người đọc sàng lọc nhanh. Từ trên xuống: công ty · năm + phạm vi
// (UX, UI hay cả hai), tiêu đề + một câu tóm tắt, bốn ô thông tin nhanh, đầu việc UX
// và UI tách riêng, Problem → Decision mỗi cái một dòng. Trường nào chưa nhập thì ẩn,
// nên bài cũ chỉ có Problem/Solution vẫn hiện gọn. Không dùng ảnh bìa (chỉ dùng khi
// chia sẻ link). Có "Link bài ở nơi khác" thì thẻ mở thẳng sang đó ở tab mới.
export function CaseStudyCard({study}: {study: CaseStudy}) {
  const meta = [study.company, study.year].filter(Boolean).join(' · ')
  const ux = study.uxWork ?? []
  const ui = study.uiWork ?? []
  const scope = ux.length > 0 && ui.length > 0 ? 'UX + UI' : ux.length > 0 ? 'UX' : ui.length > 0 ? 'UI' : ''
  const facts = [
    {label: 'Role', value: study.role},
    {label: 'Platform', value: study.platform},
    {label: 'Type', value: study.projectType},
    {label: 'Status', value: study.projectStatus},
  ].filter((fact) => fact.value)
  const hasStory = study.cardProblem && study.cardSolution
  const external = study.externalUrl?.startsWith('https://') ? study.externalUrl : null

  const content = (
    <>
      {(meta || scope) && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          {meta && <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">{meta}</p>}
          {scope && (
            <p className="bg-neutral-900 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-white">
              <span className="sr-only">Scope: </span>
              {scope}
            </p>
          )}
        </div>
      )}
      <h3 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-neutral-900 transition-colors group-hover:text-brand sm:text-2xl">
        {study.title}
        {external && <span className="sr-only"> (opens in a new tab)</span>}
      </h3>
      {study.excerpt && <p className="mt-2 max-w-3xl text-base leading-relaxed text-neutral-600">{study.excerpt}</p>}

      {facts.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="bg-neutral-100 px-3 py-2.5">
              <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-neutral-500">{fact.label}</dt>
              <dd className="mt-1 text-sm font-medium leading-snug text-neutral-900">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {scope && (
        <dl className="mt-4 flex flex-col gap-2">
          <WorkRow label="UX" items={ux} />
          <WorkRow label="UI" items={ui} />
        </dl>
      )}

      {hasStory && (
        <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-neutral-200 pt-5 md:grid-cols-2">
          <div>
            <dt className="font-mono text-xs uppercase tracking-widest text-neutral-500">Problem</dt>
            <dd className="mt-1 text-[15px] leading-relaxed text-neutral-700">{study.cardProblem}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs font-bold uppercase tracking-widest text-brand">Decision</dt>
            <dd className="mt-1 text-[15px] leading-relaxed text-neutral-900">{study.cardSolution}</dd>
          </div>
        </dl>
      )}

      <ImpactStats metrics={study.impact ?? []} className="mt-6" />

      <p className="mt-6 text-sm font-semibold text-brand">
        {external ? externalLabel(external) : 'Read case study'}{' '}
        <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
          {external ? '↗' : '→'}
        </span>
      </p>
    </>
  )

  return external ? (
    <a href={external} target="_blank" rel="noopener noreferrer" className={CARD_CLASS}>
      {content}
    </a>
  ) : (
    <Link href={`/work/${study.slug.current}`} className={CARD_CLASS}>
      {content}
    </Link>
  )
}
