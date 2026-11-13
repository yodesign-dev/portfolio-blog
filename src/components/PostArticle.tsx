import Link from 'next/link'
import Image from 'next/image'
import type {Metadata} from 'next'
import {
  PortableText,
  type PortableTextBlockComponent,
  type PortableTextComponents,
} from '@portabletext/react'
import {getImageDimensions, urlFor} from '@/sanity/lib/image'
import {sanityFetch} from '@/sanity/lib/fetch'
import {ShareButtons} from '@/components/originkit/ui/hero-31/share-buttons'
import {ViewTracker} from '@/components/ViewTracker'
import {SITE_NAME, SITE_URL, ogImageUrl} from '@/lib/site'
import {ImpactStats, type ImpactMetric} from '@/components/ImpactStats'
import {ReadingProgress, TocRail} from '@/components/ArticleNav'
import {ZoomableImage} from '@/components/ZoomableImage'
import {buildToc, formatViews, type TocItem} from '@/lib/post-format'

// Bài có từ ngần này mục trở lên mới hiện mục lục — 1-2 mục thì mục lục chỉ
// là nhiễu, cuộn là thấy hết.
const TOC_MIN_ITEMS = 3
const TOC_LABEL = 'On this page'
const ARTICLE_BODY_ID = 'article-body'
// Ảnh gốc từ ngần này px trở lên (cột bài 704px) mới có chạm-để-phóng-to
const ZOOM_MIN_WIDTH = 800

// Dùng chung cho trang chi tiết Writing (/blog/[slug]) và Work
// (/work/[slug]) — cùng 1 schema post, case study chỉ thêm khối
// Role/Company/Year + Impact phía trên ảnh đại diện.

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
  caseProblem,
  caseDecision,
  caseRoleSummary,
  impact[]{_key, value, label},
  "more": *[
    _type == "post" &&
    _id != ^._id &&
    coalesce(isCaseStudy, false) == coalesce(^.isCaseStudy, false)
  ] | order(publishedAt desc)[0...2]{_id, title, slug, isCaseStudy, excerpt, publishedAt}
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
  caseProblem?: string
  caseDecision?: string
  caseRoleSummary?: string
  impact?: ImpactMetric[]
  more?: {
    _id: string
    title: string
    slug: {current: string}
    isCaseStudy?: boolean
    excerpt?: string
    publishedAt: string
  }[]
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

  const path = postPath(post)
  // Ảnh đại diện nếu có, không thì ảnh OG tạo động theo tiêu đề bài.
  const image = post.mainImage
    ? {url: urlFor(post.mainImage).width(1200).height(630).fit('crop').url(), width: 1200, height: 630}
    : {url: ogImageUrl(post.title, post.isCaseStudy ? 'Case study' : 'Writing'), width: 1200, height: 630}

  return {
    title: post.title,
    description: post.excerpt,
    alternates: {canonical: path},
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: path,
      siteName: SITE_NAME,
      type: 'article',
      publishedTime: post.publishedAt,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [image.url],
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

// Ước lượng thời gian đọc từ text của Portable Text (~200 từ/phút).
function readingMinutes(body: unknown): number {
  if (!Array.isArray(body)) return 1
  const words = body
    .filter((block) => block?._type === 'block')
    .flatMap((block) => block.children ?? [])
    .map((child: {text?: string}) => child.text ?? '')
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

// Cột chữ hẹp hơn cột bài: 38rem ≈ 67 ký tự/dòng ở cỡ 18px Mulish (đo thật:
// trung bình 9px/ký tự). Cột bài 44rem (704px) cũ cho ~78 ký tự — quá dài, mắt
// khó tìm lại đầu dòng. Ảnh và bảng vẫn dùng hết 44rem nên ảnh chụp màn hình
// trong case study không bị thu nhỏ. Không dùng max-w-prose (65ch): "ch" đo theo
// chữ số 0, rộng hơn chữ trung bình, nên 65ch ở đây vẫn ra ~700px.
const PROSE = 'max-w-[38rem]'

// Tiêu đề mục: có id cho mục lục; scroll-mt để khi nhảy tới không dính sát mép
// trên (và không nằm dưới thanh tiến trình đọc).
const SECTION_HEADING =
  'mb-4 mt-12 scroll-mt-8 text-2xl font-semibold leading-snug tracking-tight text-neutral-900 sm:text-3xl'

function buildComponents(idByKey: Map<string, string>): PortableTextComponents {
  // H1 trong thân bài cũng vẽ thành <h2>: trang chỉ có một <h1> là tiêu đề bài.
  // Studio vẫn cho chọn H1, nên bài cũ dùng H1 làm tiêu đề mục vẫn hiện đúng.
  const sectionHeading: PortableTextBlockComponent = ({children, value}) => (
    <h2 id={value._key ? idByKey.get(value._key) : undefined} className={`${PROSE} ${SECTION_HEADING}`}>
      {children}
    </h2>
  )

  return {
  types: {
    image: ({value}) => {
      const imageUrl = urlFor(value)?.width(1200).fit('max').url()
      if (!imageUrl) return null
      // Kích thước thật của ảnh (thay cho 1200x800 cố định) — trình duyệt
      // giữ chỗ đúng tỉ lệ trong lúc lazy-load, nền xám làm placeholder
      // thay vì để trống trắng như trước.
      const realDims = getImageDimensions(value)
      const dims = realDims ?? {width: 1200, height: 800}
      const inline = (
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
      )
      // Ảnh gốc rộng hơn cột bài đáng kể thì cho chạm để xem lớn (ZoomableImage).
      // Ảnh nhỏ phóng ra cũng không nét hơn nên giữ nguyên. Bản xem lớn lấy
      // đúng cỡ gốc (tối đa 2400px) — không thể nét hơn file đã tải lên Studio.
      const zoomWidth = realDims && realDims.width >= ZOOM_MIN_WIDTH ? Math.min(realDims.width, 2400) : 0
      return (
        <figure className="my-8">
          {zoomWidth && realDims ? (
            <ZoomableImage
              src={urlFor(value).width(zoomWidth).fit('max').url()}
              width={zoomWidth}
              height={Math.round((realDims.height * zoomWidth) / realDims.width)}
              alt={value.alt || ''}
              caption={value.caption}
            >
              {inline}
            </ZoomableImage>
          ) : (
            inline
          )}
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
      // Màn hẹp: bảng cuộn ngang trong khung riêng thay vì ép mỗi cột còn vài
      // chữ (w-full cũ chia 327px cho mọi cột). min-w trên ô giữ cột đủ rộng để
      // đọc; bảng ít cột vẫn giãn hết khung nhờ min-w-full. Khung cuộn được
      // nhận Tab (role=region + nhãn) để người dùng bàn phím cuộn được bằng phím mũi tên.
      return (
        <div
          role="region"
          aria-label="Table"
          tabIndex={0}
          className="my-8 overflow-x-auto rounded-lg border border-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <table className="min-w-full border-collapse text-left text-[15px] leading-snug sm:text-base">
            <tbody>
              {value.rows.map((row: {_key?: string; cells?: string[]}, rowIndex: number) => (
                <tr key={row._key ?? rowIndex} className="border-b border-neutral-200 last:border-0">
                  {row.cells?.map((cell: string, cellIndex: number) => (
                    <td
                      key={cellIndex}
                      className="min-w-32 border-r border-neutral-200 px-4 py-2.5 align-top text-gray-800 last:border-r-0"
                    >
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
    h1: sectionHeading,
    h2: sectionHeading,
    h3: ({children}) => (
      <h3 className={`${PROSE} mb-3 mt-8 text-xl font-semibold leading-snug text-neutral-900 sm:text-2xl`}>
        {children}
      </h3>
    ),
    normal: ({children}) => (
      <p className={`${PROSE} mb-6 text-lg leading-[1.7] text-gray-800`}>{children}</p>
    ),
    blockquote: ({children}) => (
      <blockquote
        className={`${PROSE} my-10 border-l-4 border-neutral-900 pl-5 text-xl italic leading-relaxed text-neutral-700 sm:pl-6 sm:text-2xl`}
      >
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({children}) => (
      <ul className={`${PROSE} mb-6 list-disc space-y-2 pl-6 text-lg leading-[1.7] text-gray-800`}>{children}</ul>
    ),
    number: ({children}) => (
      <ol className={`${PROSE} mb-6 list-decimal space-y-2 pl-6 text-lg leading-[1.7] text-gray-800`}>
        {children}
      </ol>
    ),
  },
  marks: {
    strong: ({children}) => <strong className="font-semibold text-neutral-900">{children}</strong>,
    em: ({children}) => <em className="italic">{children}</em>,
    underline: ({children}) => <span className="underline">{children}</span>,
    'strike-through': ({children}) => <span className="line-through">{children}</span>,
    // overflow-wrap:anywhere: tên hàm/đường dẫn dài liền một chuỗi được ngắt
    // xuống dòng thay vì đẩy tràn khung 375px. 0.9em thay vì text-base để code
    // trong tiêu đề không bé hơn chữ xung quanh.
    code: ({children}) => (
      <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.9em] text-neutral-800 [overflow-wrap:anywhere]">
        {children}
      </code>
    ),
    link: ({children, value}) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 [overflow-wrap:anywhere] transition-colors hover:decoration-neutral-900"
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
}

// Mục lục cho màn hẹp (dưới lg): khối gập native, không cần JS, mở/đóng bằng
// bàn phím sẵn. Hàng tiêu đề và từng mục cao tối thiểu 44px để dễ chạm.
function TocDisclosure({items}: {items: TocItem[]}) {
  return (
    <details className="group mt-8 rounded-lg border border-neutral-200 lg:hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 text-sm font-semibold text-neutral-900 [&::-webkit-details-marker]:hidden">
        {TOC_LABEL}
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-5 shrink-0 text-neutral-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <nav aria-label={TOC_LABEL} className="border-t border-neutral-200 px-2 py-2">
        <ol>
          {items.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="flex min-h-11 items-baseline gap-3 rounded-md px-2 py-2.5 text-[15px] leading-snug text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
              >
                <span className="w-5 shrink-0 text-right text-xs tabular-nums text-neutral-500">{i + 1}</span>
                {item.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  )
}


function CaseStudyMeta({post}: {post: Post}) {
  const facts = [
    {label: 'Role', value: post.role},
    {label: 'Company', value: post.company},
    {label: 'Year', value: post.year},
  ].filter((fact) => fact.value)
  const impact = post.impact ?? []
  const glance = [
    {label: 'Problem', value: post.caseProblem},
    {label: 'Decision', value: post.caseDecision},
    {label: 'My role', value: post.caseRoleSummary},
  ].filter((item) => item.value)

  if (facts.length === 0 && impact.length === 0 && glance.length === 0) return null

  return (
    <div className="mt-8 border-y border-neutral-200 py-6">
      {glance.length > 0 && (
        <dl className="mb-6 grid grid-cols-1 gap-5 rounded-xl bg-brand/5 p-5 sm:grid-cols-3 sm:p-6">
          {glance.map((item) => (
            <div key={item.label}>
              <dt className="text-xs font-semibold uppercase tracking-widest text-brand">{item.label}</dt>
              <dd className="mt-1.5 text-[15px] font-medium leading-snug text-neutral-900">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
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

      <ImpactStats
        metrics={impact}
        size="lg"
        className={facts.length > 0 ? 'mt-6 border-t border-neutral-100 pt-6' : ''}
      />
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

  const {items: tocAll, idByKey} = buildToc(post.body)
  const toc = tocAll.length >= TOC_MIN_ITEMS ? tocAll : []
  const hasToc = toc.length > 0
  const components = buildComponents(idByKey)

  // Có mục lục thì từ lg trở lên mở rộng khung để chừa cột mục lục bên phải
  // (44rem bài + 3rem khoảng cách + 12rem mục lục + 4rem lề = 63rem); không có
  // thì giữ khung 3xl căn giữa như cũ. Header dùng cùng khung để mũi tên "Back"
  // thẳng hàng với tiêu đề bài.
  const frame = `mx-auto px-6 sm:px-8 ${hasToc ? 'max-w-3xl lg:max-w-[63rem]' : 'max-w-3xl'}`

  const meta = [
    formatDate(post.publishedAt),
    `${readingMinutes(post.body)} min read`,
    formatViews(post.viewCount, 'views'),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <ViewTracker postId={post._id} slug={post.slug.current} />
      <ReadingProgress targetId={ARTICLE_BODY_ID} />

      <header className="border-b border-neutral-200">
        {/* py-3 + link cao 44px: vùng chạm đủ lớn, header vẫn cao như cũ (~68px) */}
        <div className={`${frame} py-3`}>
          <Link
            href={back.href}
            className="inline-flex min-h-11 items-center text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            {back.label}
          </Link>
        </div>
      </header>

      <main className={`${frame} py-12 sm:py-16`}>
        <div className={hasToc ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_12rem] lg:gap-12' : undefined}>
          {/* min-w-0: con của grid mặc định không co nhỏ hơn nội dung — thiếu nó,
              một bảng rộng sẽ đẩy cả cột bài tràn ngang */}
          <div className="min-w-0">
            <article>
              {post.isCaseStudy ? (
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand">Case study</p>
              ) : (
                post.tags &&
                post.tags.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-x-1.5">
                    {/* Link cao 44px trên màn chạm (vùng bấm trong suốt), viên tag
                        bên trong giữ cỡ nhỏ như cũ để không lấn tiêu đề bài */}
                    {post.tags.map((t) => (
                      <Link
                        key={t}
                        href={`/blog?tag=${encodeURIComponent(t)}`}
                        className="group inline-flex items-center touch:min-h-11"
                      >
                        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 transition group-hover:bg-neutral-200">
                          {t}
                        </span>
                      </Link>
                    ))}
                  </div>
                )
              )}

              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-balance text-neutral-900 sm:text-4xl sm:leading-tight">
                {post.title}
              </h1>

              {post.isCaseStudy && post.excerpt && (
                <p className={`${PROSE} mt-4 text-lg leading-relaxed text-neutral-600`}>{post.excerpt}</p>
              )}

              {post.isCaseStudy && <CaseStudyMeta post={post} />}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                {/* neutral-500 thay neutral-400: 4.7:1 trên nền trắng (cũ 2.5:1, dưới chuẩn) */}
                <p className="text-sm text-neutral-500">{meta}</p>
                <ShareButtons url={postUrl} title={post.title} />
              </div>

              {/* Case study mở bằng khối tóm tắt, ảnh đại diện chỉ dùng khi chia sẻ link */}
              {mainImageUrl && !post.isCaseStudy && (
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

              {hasToc && <TocDisclosure items={toc} />}

              <div id={ARTICLE_BODY_ID} className="mt-10">
                <PortableText value={post.body} components={components} />
              </div>

              <div className="mt-12 border-t border-neutral-200 pt-8">
                <ShareButtons url={postUrl} title={post.title} />
              </div>
            </article>

            {post.more && post.more.length > 0 && (
              <aside className="mt-16 border-t border-neutral-200 pt-10">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                  {post.isCaseStudy ? 'More case studies' : 'Keep reading'}
                </h2>
                <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                  {post.more.map((item) => (
                    <li key={item._id}>
                      <Link
                        href={postPath(item)}
                        className="group block h-full rounded-xl border border-neutral-200 p-5 transition hover:border-neutral-400"
                      >
                        <p className="font-semibold leading-snug text-neutral-900 transition-colors group-hover:text-brand">
                          {item.title}
                        </p>
                        {item.excerpt && (
                          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-neutral-500">
                            {item.excerpt}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>

          {hasToc && (
            <aside className="hidden lg:block">
              <TocRail items={toc} label={TOC_LABEL} />
            </aside>
          )}
        </div>
      </main>
    </div>
  )
}
