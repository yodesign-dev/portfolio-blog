import Link from 'next/link'
import { client } from '@/sanity/lib/client'
import { CaseStudyRow, getCaseStudies } from '@/components/CaseStudyCard'
import { Background } from '@/components/Background'
import { SideProjects } from '@/components/SideProjects'
import { HowIWork } from '@/components/HowIWork'
import { Testimonials } from '@/components/Testimonials'
import { BehanceCard } from '@/components/BehanceArchive'
import { getBehanceProjects, showcaseNote } from '@/lib/behance'
import { getMediumPosts } from '@/lib/medium'
import Hero31 from '@/components/originkit/hero-31' // 1. Đổi đường dẫn import sang Hero 31

export const revalidate = 60

// Bài Medium đã thành case study trên site thì không đưa ra trang chủ (vẫn có ở /blog)
const HOME_WRITING_SKIP = ['freemium-for-recruiter', 'onboarding-friction']

// Trang chủ chỉ lấy bài Writing (case study đã có section Work riêng).
const POSTS_QUERY = `*[_type == "post" && isCaseStudy != true] | order(publishedAt desc)[0...3] {
  _id,
  title,
  slug,
  publishedAt
}`

type Post = {
  _id: string
  title: string
  slug: { current: string }
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

function MoreWorkItem({href, title, detail, external = false}: {href: string; title: string; detail: string; external?: boolean}) {
  const body = (
    <>
      <span className="block font-semibold leading-snug text-neutral-900 transition-colors group-hover:text-brand">
        {title} <span aria-hidden="true">{external ? '↗' : '→'}</span>
      </span>
      {detail && <span className="mt-1 block text-sm text-neutral-500">{detail}</span>}
    </>
  )
  const className = 'group block py-4 sm:pt-5'
  return (
    <li className="border-b border-neutral-200 last:border-b-0 sm:border-b-0">
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
          {body}
        </a>
      ) : (
        <Link href={href} className={className}>
          {body}
        </Link>
      )}
    </li>
  )
}

export default async function HomePage() {
  const [studies, posts] = await Promise.all([getCaseStudies(revalidate), getPosts()])
  const featuredStudies = studies.slice(0, 3)
  // Chưa đủ 3 case study → thêm project Behance cho đủ hàng; Sanity chưa có bài
  // viết → lấy tạm bài Medium (giống /work và /blog), để trang chủ không nhảy
  // thẳng từ hero xuống footer.
  const [behance, mediumPosts] = await Promise.all([
    featuredStudies.length < 3 ? getBehanceProjects() : [],
    posts.length === 0 ? getMediumPosts() : [],
  ])
  // Có case study: Behance chỉ còn hàng nhỏ, chừa 1 chỗ cho quán /chill
  const featuredBehance = behance.slice(0, featuredStudies.length > 0 ? 2 : 3)
  // Writing: danh sách gọn 3 bài (ảnh bìa Medium phần lớn là ảnh chụp chữ, xếp
  // thành thẻ trông rối)
  const writing =
    posts.length > 0
      ? posts.slice(0, 3).map((post) => ({
          key: post._id,
          href: `/blog/${post.slug.current}`,
          title: post.title,
          date: post.publishedAt,
          source: null,
        }))
      : mediumPosts.filter((post) => !HOME_WRITING_SKIP.some((word) => post.link.includes(word))).slice(0, 3).map((post) => ({
          key: post.link,
          href: post.link,
          title: post.title,
          date: post.publishedAt,
          source: 'Medium',
        }))

  // Case study mới nhất → tên + link của frame "Hi-fi" trên hero (frame vẽ
  // skeleton UI web/mobile bằng code, không dùng ảnh)
  const latest = studies[0]
  const heroStudy = latest
    ? {
        title: latest.company || latest.title,
        href: `/work/${latest.slug.current}`,
      }
    : null

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      {/* 2. Đổi thẻ Hero37 cũ thành Hero31 mới */}
      <Hero31 study={heroStudy} />

      <Background />

      {/* Thứ tự: hero → lý lịch → việc đã làm → lời giới thiệu → cách làm → side projects → bài viết */}
      {(featuredStudies.length > 0 || featuredBehance.length > 0) && (
        <section id="work" className="mx-auto max-w-6xl scroll-mt-24 px-6 pt-20 sm:px-8">
          <SectionHeading title="Selected work" href="/work" linkLabel="All work" />
          {featuredStudies.length > 0 ? (
            <>
              <div className="flex flex-col gap-12 md:gap-14">
                {featuredStudies.map((study, index) => (
                  <CaseStudyRow key={study._id} study={study} priority={index === 0} />
                ))}
              </div>
              <ul className="mt-12 grid grid-cols-1 border-t border-neutral-200 sm:grid-cols-3 sm:gap-8">
                {featuredBehance.map((project) => (
                  <MoreWorkItem
                    key={project.url}
                    href={project.url}
                    external
                    title={project.title}
                    detail={[showcaseNote(project.url)?.tags[1], project.year].filter(Boolean).join(' · ')}
                  />
                ))}
                <MoreWorkItem href="/chill" title="Lofi Pixel Café" detail="Built with AI · Live" />
              </ul>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-3 sm:gap-y-12">
              {featuredBehance.map((project) => (
                <BehanceCard key={project.url} project={project} sizes="(min-width: 1152px) 352px, (min-width: 640px) 33vw, 128px" />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tự ẩn khi Studio chưa có lời giới thiệu nào */}
      <Testimonials />

      <HowIWork />

      <div className="mt-24">
        <SideProjects />
      </div>

      {writing.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-20 sm:px-8">
          <SectionHeading title="Writing" href="/blog" linkLabel="All writing" />
          <ul className="border-t border-neutral-200">
            {writing.map((item) => {
              const content = (
                <>
                  <span className="text-lg font-semibold leading-snug text-neutral-900 transition-colors group-hover:text-brand">
                    {item.title}
                    {item.source && (
                      <>
                        {' '}
                        <span aria-hidden="true" className="text-neutral-300 group-hover:text-brand">↗</span>
                        <span className="sr-only"> (opens {item.source} in a new tab)</span>
                      </>
                    )}
                  </span>
                  <span className="shrink-0 text-sm text-neutral-400 sm:text-right">
                    {item.source && `${item.source} · `}
                    {formatDate(item.date)}
                  </span>
                </>
              )
              const rowClass =
                'group flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8'
              return (
                <li key={item.key} className="border-b border-neutral-200">
                  {item.source ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className={rowClass}>
                      {content}
                    </a>
                  ) : (
                    <Link href={item.href} className={rowClass}>
                      {content}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
