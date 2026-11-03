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
  impact?: ImpactMetric[]
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
  impact[]{_key, value, label}
}`

export async function getCaseStudies(revalidate: number): Promise<CaseStudy[]> {
  return sanityFetch<CaseStudy[]>({query: CASE_STUDIES_QUERY, revalidate})
}

// Thẻ case study: đọc qua là hiểu bài toán và cách giải, nên không dùng ảnh bìa (ảnh bìa
// chỉ còn dùng khi chia sẻ link). Bài chưa nhập Problem/Solution thì hiện mô tả ngắn.
export function CaseStudyCard({study}: {study: CaseStudy}) {
  const meta = [study.company, study.year].filter(Boolean).join(' · ')
  const hasStory = study.cardProblem && study.cardSolution

  return (
    <Link
      href={`/work/${study.slug.current}`}
      className="group block rounded-2xl border border-neutral-200 bg-white p-6 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-neutral-400 motion-reduce:transform-none sm:p-8"
    >
      {meta && <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">{meta}</p>}
      <h3 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-neutral-900 transition-colors group-hover:text-brand sm:text-2xl">
        {study.title}
      </h3>

      {hasStory ? (
        <div className="mt-6 grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] md:gap-3">
          <div className="rounded-xl bg-neutral-100 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">Problem</p>
            <p className="mt-2 text-[15px] leading-relaxed text-neutral-700">{study.cardProblem}</p>
          </div>
          <span aria-hidden="true" className="flex items-center justify-center text-xl text-brand">
            <span className="rotate-90 md:rotate-0">→</span>
          </span>
          <div className="rounded-xl bg-brand/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand">Solution</p>
            <p className="mt-2 text-[15px] leading-relaxed text-neutral-800">{study.cardSolution}</p>
          </div>
        </div>
      ) : (
        study.excerpt && <p className="mt-3 text-base leading-relaxed text-neutral-600">{study.excerpt}</p>
      )}

      <ImpactStats metrics={study.impact ?? []} className="mt-6" />

      <p className="mt-6 text-sm font-semibold text-brand">
        Read case study{' '}
        <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
          →
        </span>
      </p>
    </Link>
  )
}
