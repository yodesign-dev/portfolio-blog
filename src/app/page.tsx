import Link from 'next/link'
import Image from 'next/image'
import { client } from '@/sanity/lib/client'
import { urlFor } from '@/sanity/lib/image'
import { CaseStudyCard, getCaseStudies } from '@/components/CaseStudyCard'
import Hero31 from '@/components/originkit/hero-31' // 1. Đổi đường dẫn import sang Hero 31

export const revalidate = 60

// Trang chủ chỉ lấy bài Writing (case study đã có section Work riêng).
const POSTS_QUERY = `*[_type == "post" && isCaseStudy != true] | order(publishedAt desc)[0...4] {
  _id,
  title,
  slug,
  mainImage,
  publishedAt
}`

type Post = {
  _id: string
  title: string
  slug: { current: string }
  mainImage?: {
    asset?: { _ref: string }
    alt?: string
  }
  publishedAt: string
}

async function getPosts(): Promise<Post[]> {
  return client.fetch(POSTS_QUERY, {}, { next: { revalidate } })
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function SectionHeading({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="mb-10 flex items-end justify-between gap-4">
      <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{title}</h2>
      <Link
        href={href}
        className="shrink-0 text-sm font-semibold text-neutral-500 transition-colors hover:text-neutral-900"
      >
        {linkLabel} →
      </Link>
    </div>
  )
}

export default async function HomePage() {
  const [studies, posts] = await Promise.all([getCaseStudies(revalidate), getPosts()])
  const featuredStudies = studies.slice(0, 4)

  // Case study mới nhất có ảnh → hiện ở frame "Hi-fi" của canvas trên hero
  const latest = studies.find((study) => study.mainImage)
  const heroStudy = latest
    ? {
        title: latest.company || latest.title,
        href: `/work/${latest.slug.current}`,
        imageUrl: urlFor(latest.mainImage!).width(1200).height(900).fit('crop').url(),
        imageAlt: latest.mainImage?.alt || latest.title,
      }
    : null

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      {/* 2. Đổi thẻ Hero37 cũ thành Hero31 mới */}
      <Hero31 study={heroStudy} />

      {featuredStudies.length > 0 && (
        <section id="work" className="mx-auto max-w-6xl scroll-mt-24 px-6 pt-20 sm:px-8">
          <SectionHeading title="Selected work" href="/work" linkLabel="All work" />
          <div className="grid grid-cols-1 gap-x-10 gap-y-16 md:grid-cols-2">
            {featuredStudies.map((study) => (
              <CaseStudyCard key={study._id} study={study} />
            ))}
          </div>
        </section>
      )}

      {posts.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
          <SectionHeading title="Latest writing" href="/blog" linkLabel="All writing" />
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {posts.map((post) => {
              const imageUrl = post.mainImage
                ? urlFor(post.mainImage)?.width(800).height(600).fit('crop').url()
                : null

              return (
                <Link key={post._id} href={`/blog/${post.slug.current}`} className="group block">
                  <div className="overflow-hidden rounded-lg bg-neutral-100">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={post.mainImage?.alt || post.title}
                        width={800}
                        height={600}
                        sizes="(min-width: 1024px) 270px, (min-width: 640px) 50vw, 100vw"
                        className="aspect-[4/3] w-full object-cover transition-all duration-300 ease-out group-hover:scale-105 group-hover:opacity-90"
                      />
                    ) : (
                      <div className="aspect-[4/3] w-full bg-neutral-100" />
                    )}
                  </div>

                  <h3 className="mt-4 text-lg font-bold leading-snug text-neutral-900 transition-colors group-hover:text-neutral-600">
                    {post.title}
                  </h3>

                  <p className="mt-2 text-sm text-neutral-400">{formatDate(post.publishedAt)}</p>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
