import Link from 'next/link'
import Image from 'next/image'
import {urlFor} from '@/sanity/lib/image'
import {sanityFetch} from '@/sanity/lib/fetch'
import {getLocale} from '@/lib/get-locale'
import {getDictionary, type Locale} from '@/lib/i18n'
import {pageMetadata} from '@/lib/site'
import {getMediumPosts, MEDIUM_URL, type MediumPost} from '@/lib/medium'

export const revalidate = 60

export const metadata = pageMetadata({
  title: 'Writing',
  description: 'Notes on product design, UX and working with AI — things Bin Nguyen learns along the way.',
  path: '/blog',
})

type Post = {
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
  author?: string
}

async function getPosts(tag?: string): Promise<Post[]> {
  const tagFilter = tag ? ' && $tag in tags' : ''
  const query = `*[_type == "post" && isCaseStudy != true${tagFilter}] | order(publishedAt desc) {
    _id,
    title,
    slug,
    mainImage,
    publishedAt,
    tags,
    viewCount,
    excerpt,
    author
  }`
  const params = {tag: tag ?? ''}
  return sanityFetch<Post[]>({query, params, revalidate})
}

async function getAllTags(): Promise<string[]> {
  const query = `array::unique(*[_type == "post" && isCaseStudy != true && defined(tags)].tags[])`
  return sanityFetch<string[]>({query, revalidate})
}

function formatDate(dateString: string, locale: Locale) {
  return new Date(dateString).toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatViewCount(count: number | undefined, viewsSuffix: string) {
  const value = count ?? 0
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k ${viewsSuffix}`
  return `${value} ${viewsSuffix}`
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{tag?: string}>
}) {
  const {tag} = await searchParams
  const [posts, allTags, locale] = await Promise.all([getPosts(tag), getAllTags(), getLocale()])
  const t = getDictionary(locale)
  // Chưa có bài trên site → hiện tạm bài Medium thay vì trang trống
  const mediumPosts = posts.length === 0 && !tag ? await getMediumPosts() : []

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            {t.blog.title}
          </h1>
          <p className="mt-2 text-neutral-500">{t.blog.subtitle}</p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 sm:px-8">
        {/* Bộ lọc chỉ có ích khi có đủ bài để lọc — 1-2 bài mà hiện 4 chip
            tag thì chỉ thêm nhiễu. Đang lọc theo tag thì luôn hiện để quay lại. */}
        {allTags.length >= 2 && (tag || posts.length >= 3) && (
          <div className="mb-10 flex flex-wrap gap-2">
            <Link
              href="/blog"
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                !tag
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
            >
              {t.common.all}
            </Link>
            {allTags.map((tg) => (
              <Link
                key={tg}
                href={`/blog?tag=${encodeURIComponent(tg)}`}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                  tag === tg
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                }`}
              >
                {tg}
              </Link>
            ))}
          </div>
        )}

        {posts.length === 0 && tag ? (
          <p className="text-center text-neutral-400">{t.blog.emptyTag(tag)}</p>
        ) : posts.length === 0 && mediumPosts.length > 0 ? (
          <MediumList posts={mediumPosts} locale={locale} />
        ) : posts.length === 0 ? (
          <EmptyWriting locale={locale} />
        ) : (
          <div>
            <FeaturedPost post={posts[0]} locale={locale} viewsSuffix={t.common.viewsSuffix} />

            {posts.length > 1 && (
              <div className="mt-4 border-t border-neutral-200">
                {posts.slice(1).map((post) => (
                  <PostRow key={post._id} post={post} locale={locale} viewsSuffix={t.common.viewsSuffix} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function FeaturedPost({post, locale, viewsSuffix}: {post: Post; locale: Locale; viewsSuffix: string}) {
  const imageUrl = post.mainImage
    ? urlFor(post.mainImage)?.width(1200).height(800).fit('crop').url()
    : null

  return (
    <Link href={`/blog/${post.slug.current}`} className="group block">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="overflow-hidden rounded-lg bg-neutral-100 md:w-1/2">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={post.mainImage?.alt || post.title}
              width={1200}
              height={800}
              priority
              className="aspect-[4/3] w-full object-cover transition-all duration-300 ease-out group-hover:scale-105 group-hover:opacity-90"
            />
          ) : (
            <div className="aspect-[4/3] w-full bg-neutral-100" />
          )}
        </div>

        <div className="md:w-1/2">
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <h2 className="mt-3 text-2xl font-bold leading-snug text-neutral-900 transition-colors group-hover:text-neutral-600 sm:text-3xl">
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">{post.excerpt}</p>
          )}

          <p className="mt-4 text-sm text-neutral-400">
            {[post.author, formatDate(post.publishedAt, locale), formatViewCount(post.viewCount, viewsSuffix)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>
    </Link>
  )
}

function PostRow({post, locale, viewsSuffix}: {post: Post; locale: Locale; viewsSuffix: string}) {
  const imageUrl = post.mainImage
    ? urlFor(post.mainImage)?.width(240).height(240).fit('crop').url()
    : null

  return (
    <Link
      href={`/blog/${post.slug.current}`}
      className="group flex items-start gap-5 border-b border-neutral-200 py-6 last:border-0"
    >
      <div className="hidden h-20 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100 sm:block">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={post.mainImage?.alt || post.title}
            width={240}
            height={240}
            className="h-full w-full object-cover transition-all duration-300 ease-out group-hover:scale-105 group-hover:opacity-90"
          />
        ) : (
          <div className="h-full w-full bg-neutral-100" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {post.tags && post.tags.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <h3 className="text-base font-semibold leading-snug text-neutral-900 transition-colors group-hover:text-neutral-600">
          {post.title}
        </h3>

        {post.excerpt && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-neutral-500">
            {post.excerpt}
          </p>
        )}

        <p className="mt-2 text-xs text-neutral-400">
          {[post.author, formatDate(post.publishedAt, locale), formatViewCount(post.viewCount, viewsSuffix)]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    </Link>
  )
}

// Chữ riêng cho 2 trạng thái "chưa có bài trên site" — chỉ dùng ở trang này
const WRITING_FALLBACK = {
  en: {
    mediumIntro: 'Recent writing on Medium — new posts will live here soon.',
    onMedium: 'Medium',
    allOnMedium: 'All posts on Medium',
    emptyTitle: 'First posts are on the way',
    emptyBody:
      'I write about product design, UX research and working with AI. While these notes are being prepared, here’s where to find my work.',
    readMedium: 'Read on Medium',
    seeWork: 'See case studies',
  },
  vi: {
    mediumIntro: 'Các bài viết gần đây trên Medium — bài mới sẽ sớm có ở đây.',
    onMedium: 'Medium',
    allOnMedium: 'Tất cả bài trên Medium',
    emptyTitle: 'Những bài đầu tiên đang được viết',
    emptyBody:
      'Mình viết về product design, UX research và cách làm việc cùng AI. Trong lúc chờ, bạn có thể xem các nội dung dưới đây.',
    readMedium: 'Đọc trên Medium',
    seeWork: 'Xem case study',
  },
}

function MediumList({posts, locale}: {posts: MediumPost[]; locale: Locale}) {
  const f = WRITING_FALLBACK[locale]
  return (
    <div>
      <p className="mb-8 text-neutral-500">{f.mediumIntro}</p>
      <div className="border-t border-neutral-200">
        {posts.map((post) => (
          <a
            key={post.link}
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-5 border-b border-neutral-200 py-6 last:border-0"
          >
            <div className="hidden h-20 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100 sm:block">
              {post.image && (
                <Image
                  src={post.image}
                  alt=""
                  width={240}
                  height={240}
                  className="h-full w-full object-cover transition-all duration-300 ease-out group-hover:scale-105 group-hover:opacity-90"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              {post.tags.length > 0 && (
                <div className="mb-1.5 flex flex-wrap gap-1.5">
                  {post.tags.map((tg) => (
                    <span
                      key={tg}
                      className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600"
                    >
                      {tg}
                    </span>
                  ))}
                </div>
              )}

              <h3 className="text-base font-semibold leading-snug text-neutral-900 transition-colors group-hover:text-neutral-600">
                {post.title}
              </h3>

              {post.excerpt && (
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-neutral-500">{post.excerpt}</p>
              )}

              <p className="mt-2 text-xs text-neutral-400">
                {[post.publishedAt && formatDate(post.publishedAt, locale), `${f.onMedium} ↗`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          </a>
        ))}
      </div>

      {MEDIUM_URL && (
        <a
          href={MEDIUM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 inline-block text-sm font-semibold text-neutral-600 transition-colors hover:text-neutral-900"
        >
          {f.allOnMedium} ↗
        </a>
      )}
    </div>
  )
}

// Không lấy được bài Medium (hoặc chưa có) — vẫn cho người xem đường đi tiếp
function EmptyWriting({locale}: {locale: Locale}) {
  const f = WRITING_FALLBACK[locale]
  return (
    <div className="mx-auto max-w-xl py-8 text-center">
      <h2 className="text-2xl font-bold tracking-tight text-neutral-900">{f.emptyTitle}</h2>
      <p className="mt-3 leading-relaxed text-neutral-500">{f.emptyBody}</p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        {MEDIUM_URL && (
          <a
            href={MEDIUM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 items-center justify-center bg-brand px-6 text-base font-semibold text-white transition hover:bg-brand-hover"
          >
            {f.readMedium} ↗
          </a>
        )}
        <Link
          href="/work"
          className="flex min-h-12 items-center justify-center border border-neutral-300 px-6 text-base font-semibold text-neutral-900 transition hover:border-neutral-900"
        >
          {f.seeWork} →
        </Link>
      </div>
    </div>
  )
}
