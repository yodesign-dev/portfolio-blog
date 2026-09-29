import Link from 'next/link'
import Image from 'next/image'
import {urlFor} from '@/sanity/lib/image'
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
  role,
  company,
  year,
  impact[]{_key, value, label}
}`

export async function getCaseStudies(revalidate: number): Promise<CaseStudy[]> {
  return sanityFetch<CaseStudy[]>({query: CASE_STUDIES_QUERY, revalidate})
}

export function CaseStudyCard({study, priority = false}: {study: CaseStudy; priority?: boolean}) {
  const imageUrl = study.mainImage
    ? urlFor(study.mainImage)?.width(1200).height(750).fit('crop').url()
    : null
  const meta = [study.company, study.role, study.year].filter(Boolean).join(' · ')
  const impact = study.impact ?? []

  return (
    <Link href={`/work/${study.slug.current}`} className="group block">
      <div className="overflow-hidden rounded-xl bg-neutral-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={study.mainImage?.alt || study.title}
            width={1200}
            height={750}
            sizes="(min-width: 1024px) 560px, 100vw"
            priority={priority}
            className="aspect-[16/10] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="aspect-[16/10] w-full" />
        )}
      </div>

      {meta && (
        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-neutral-400">{meta}</p>
      )}

      <h3 className="mt-2 text-xl font-semibold leading-snug text-neutral-900 transition-colors group-hover:text-[#002fff] sm:text-2xl">
        {study.title}
      </h3>

      {study.excerpt && (
        <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-neutral-600">{study.excerpt}</p>
      )}

      <ImpactStats metrics={impact} className="mt-6" />

      <p className="mt-6 text-sm font-semibold text-neutral-900">
        Read case study{' '}
        <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-1">
          →
        </span>
      </p>
    </Link>
  )
}
