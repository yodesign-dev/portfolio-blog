import Link from 'next/link'
import Image from 'next/image'
import type {Metadata} from 'next'
import {PortableText, type PortableTextComponents} from '@portabletext/react'
import {getImageDimensions, urlFor} from '@/sanity/lib/image'
import {sanityFetch} from '@/sanity/lib/fetch'
import {ShareButtons} from '@/components/originkit/ui/hero-31/share-buttons'
import {ViewTracker} from '@/components/ViewTracker'

// Dùng chung cho trang chi tiết Writing (/blog/[slug]) và Work
// (/work/[slug]) — cùng 1 schema post, case study chỉ thêm khối
// Role/Company/Year + Impact phía trên ảnh đại diện.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://binblogs.vercel.app'

const POST_QUERY = `*[_type == "post" && slug.current == $slug][0]{
  _id,
  title,
  slug,
  mainImage,
  publishedAt,
  tags,
  viewCount,
  excerpt,
  body,
  isCaseStudy,
  role,
  company,
  year,
  impact[]{_key, value, label}
}`

export type Post = {
  _id: string
  title: string
  slug: {current: string}
  mainImage?: {
    asset?: {_ref: string}
    alt?: string
  }
  publishedAt: string
  tags?: string[]
  viewCount?: number
  excerpt?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any
  isCaseStudy?: boolean
  role?: string
  company?: string
  year?: string
  impact?: {_key: string; value: string; label: string}[]
}

export async function getPost(slug: string, revalidate: number): Promise<Post | null> {
  // Đổi từ client.fetch sang sanityFetch — khi đang mở qua Presentation
  // Tool (Draft Mode bật), hàm này tự đọc bản draft + bật stega, giúp
  // overlay click-to-edit hoạt động trên trang chi tiết bài viết.
  return sanityFetch<Post | null>({query: POST_QUERY, params: {slug}, revalidate})
}

export function postPath(post: {slug: {current: string}; isCaseStudy?: boolean}) {
  return `${post.isCaseStudy ? '/work' : '/blog'}/${post.slug.current}`
}

export function buildPostMetadata(post: Post | null): Metadata {
  if (!post) return {title: 'Post not found'}

  const postUrl = `${SITE_URL}${postPath(post)}`
  const ogImageUrl = post.mainImage
    ? urlFor(post.mainImage)?.width(1200).height(630).fit('crop').url()
    : undefined

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: postUrl,
      type: 'article',
      publishedTime: post.publishedAt,
      images: ogImageUrl ? [{url: ogImageUrl, width: 1200, height: 630}] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatViewCount(count?: number) {
  const value = count ?? 0
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k views`
  return `${value} views`
}

const portableTextComponents: PortableTextComponents = {
  types: {
    image: ({value}) => {
      const imageUrl = urlFor(value)?.width(1200).fit('max').url()
      if (!imageUrl) return null
      // Kích thước thật của ảnh (thay cho 1200x800 cố định) — trình duyệt
      // giữ chỗ đúng tỉ lệ trong lúc lazy-load, nền xám làm placeholder
      // thay vì để trống trắng như trước.
      const dims = getImageDimensions(value) ?? {width: 1200, height: 800}
      return (
        <figure className="my-8">
          <div className="overflow-hidden rounded-lg bg-neutral-100">
            <Image
              src={imageUrl}
              alt={value.alt || ''}
              width={dims.width}
              height={dims.height}
              sizes="(min-width: 768px) 704px, 100vw"
              className="h-auto w-full"
            />
          </div>
          {/* MỚI: caption dưới ảnh — style giống Medium, in nghiêng, căn giữa */}
          {value.caption && (
            <figcaption className="mt-3 text-center text-sm italic text-neutral-500">
              {value.caption}
            </figcaption>
          )}
        </figure>
      )
    },
    // MỚI: renderer cho block "divider" — Sanity không có sẵn nên tự vẽ.
    divider: ({value}) => {
      if (value?.style === 'dots') {
        return (
          <div className="my-12 flex justify-center gap-3 text-neutral-300" aria-hidden="true">
            <span className="text-lg">•</span>
            <span className="text-lg">•</span>
            <span className="text-lg">•</span>
          </div>
        )
      }
      return <hr className="my-12 border-t border-neutral-200" />
    },
    table: ({value}) => {
      if (!value?.rows?.length) return null
      return (
        <div className="my-8 overflow-x-auto">
          <table className="w-full border-collapse border border-neutral-200 text-left text-base">
            <tbody>
              {value.rows.map((row: any, rowIndex: number) => (
                <tr key={row._key ?? rowIndex}>
                  {row.cells?.map((cell: string, cellIndex: number) => (
                    <td key={cellIndex} className="border border-neutral-200 px-4 py-2 text-gray-800">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    },
  },
  block: {
    h1: ({children}) => (
      <h1 className="mb-6 mt-10 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
        {children}
      </h1>
    ),
    h2: ({children}) => (
      <h2 className="mb-4 mt-10 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
        {children}
      </h2>
    ),
    h3: ({children}) => (
      <h3 className="mb-3 mt-8 text-xl font-semibold text-neutral-900 sm:text-2xl">{children}</h3>
    ),
    normal: ({children}) => (
      <p className="mb-6 text-lg leading-relaxed text-gray-800">{children}</p>
    ),
    blockquote: ({children}) => (
      <blockquote className="my-10 border-l-4 border-neutral-900 pl-6 text-xl italic leading-relaxed text-neutral-700 sm:text-2xl">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({children}) => (
      <ul className="mb-6 list-disc space-y-2 pl-6 text-lg leading-relaxed text-gray-800">{children}</ul>
    ),
    number: ({children}) => (
      <ol className="mb-6 list-decimal space-y-2 pl-6 text-lg leading-relaxed text-gray-800">{children}</ol>
    ),
  },
  marks: {
    strong: ({children}) => <strong className="font-semibold text-neutral-900">{children}</strong>,
    em: ({children}) => <em className="italic">{children}</em>,
    underline: ({children}) => <span className="underline">{children}</span>,
    'strike-through': ({children}) => <span className="line-through">{children}</span>,
    code: ({children}) => (
      <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-base text-neutral-800">
        {children}
      </code>
    ),
    link: ({children, value}) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition-colors hover:decoration-neutral-900"
      >
        {children}
      </a>
    ),
    textColor: ({children, value}) => (
      <span style={{color: value?.color || undefined}}>{children}</span>
    ),
    fontFamily: ({children, value}) => (
      <span style={{fontFamily: value?.font || undefined}}>{children}</span>
    ),
  },
}


function CaseStudyMeta({post}: {post: Post}) {
  const facts = [
    {label: 'Role', value: post.role},
    {label: 'Company', value: post.company},
    {label: 'Year', value: post.year},
  ].filter((fact) => fact.value)
  const impact = post.impact ?? []

  if (facts.length === 0 && impact.length === 0) return null

  return (
    <div className="mt-8 border-y border-neutral-200 py-6">
      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-xs font-semibold uppercase tracking-widest text-neutral-400">
                {fact.label}
              </dt>
              <dd className="mt-1 text-base font-medium text-neutral-900">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {impact.length > 0 && (
        <ul className={`grid grid-cols-1 gap-6 sm:grid-cols-3 ${facts.length > 0 ? 'mt-6 border-t border-neutral-100 pt-6' : ''}`}>
          {impact.map((metric) => (
            <li key={metric._key}>
              <p className="text-3xl font-semibold tracking-tight text-[#002fff]">{metric.value}</p>
              <p className="mt-1 text-sm leading-snug text-neutral-600">{metric.label}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PostArticle({post}: {post: Post}) {
  const mainImageUrl = post.mainImage
    ? urlFor(post.mainImage)?.width(1600).height(900).fit('crop').url()
    : null

  const postUrl = `${SITE_URL}${postPath(post)}`
  const back = post.isCaseStudy
    ? {href: '/work', label: '← Back to Work'}
    : {href: '/blog', label: '← Back to Writing'}

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <ViewTracker postId={post._id} slug={post.slug.current} />

      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-3xl px-6 py-6 sm:px-8">
          <Link href={back.href} className="text-sm text-neutral-500 transition-colors hover:text-neutral-900">
            {back.label}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-8 sm:py-16">
        <article>
          {post.isCaseStudy ? (
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#002fff]">
              Case study
            </p>
          ) : (
            post.tags &&
            post.tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {post.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/blog?tag=${encodeURIComponent(t)}`}
                    className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-200"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            )
          )}

          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
            {post.title}
          </h1>

          {post.isCaseStudy && post.excerpt && (
            <p className="mt-4 text-lg leading-relaxed text-neutral-600">{post.excerpt}</p>
          )}

          {post.isCaseStudy && <CaseStudyMeta post={post} />}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-neutral-400">
              {formatDate(post.publishedAt)} · {formatViewCount(post.viewCount)}
            </p>
            <ShareButtons url={postUrl} title={post.title} />
          </div>

          {mainImageUrl && (
            <div className="mt-8 overflow-hidden rounded-lg bg-neutral-100">
              <Image
                src={mainImageUrl}
                alt={post.mainImage?.alt || post.title}
                width={1600}
                height={900}
                sizes="(min-width: 768px) 704px, 100vw"
                priority
                className="aspect-video w-full object-cover"
              />
            </div>
          )}

          <div className="mt-10">
            <PortableText value={post.body} components={portableTextComponents} />
          </div>

          <div className="mt-12 border-t border-neutral-200 pt-8">
            <ShareButtons url={postUrl} title={post.title} />
          </div>
        </article>
      </main>
    </div>
  )
}
