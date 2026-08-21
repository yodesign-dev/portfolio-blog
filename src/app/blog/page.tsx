import Link from 'next/link'
import Image from 'next/image'
import {client} from '@/sanity/lib/client'
import {urlFor} from '@/sanity/lib/image'

export const revalidate = 60

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
}

async function getPosts(tag?: string): Promise<Post[]> {
  const tagFilter = tag ? ' && $tag in tags' : ''
  const query = `*[_type == "post"${tagFilter}] | order(publishedAt desc) {
    _id,
    title,
    slug,
    mainImage,
    publishedAt,
    tags,
    viewCount
  }`
  // Luôn truyền params cùng 1 shape cố định {tag: string}. Cast `as any`
  // vì query được ghép động (${tagFilter}) nên Sanity Typegen không nhận
  // diện được, mặc định ép kiểu params phải là undefined — dù giá trị
  // lúc chạy hoàn toàn hợp lệ. Cast để bỏ qua ràng buộc kiểu quá chặt
  // này ở đúng 1 chỗ, không ảnh hưởng nơi khác trong project.
  const params = {tag: tag ?? ''}
  return client.fetch<Post[]>(query, params as any, {next: {revalidate}})
}

async function getAllTags(): Promise<string[]> {
  const query = `array::unique(*[_type == "post" && defined(tags)].tags[])`
  return client.fetch(query, {}, {next: {revalidate}})
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatViewCount(count?: number) {
  const value = count ?? 0
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k lượt xem`
  return `${value} lượt xem`
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{tag?: string}>
}) {
  const {tag} = await searchParams
  const [posts, allTags] = await Promise.all([getPosts(tag), getAllTags()])

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-4xl px-6 py-6 sm:px-8">
          <Link href="/" className="text-sm text-neutral-500 transition-colors hover:text-neutral-900">
            ← Về trang chủ
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Blog
          </h1>
          <p className="mt-2 text-neutral-500">Ghi chép và chia sẻ trong quá trình học & làm việc.</p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16 sm:px-8">
        {allTags.length > 0 && (
          <div className="mb-10 flex flex-wrap gap-2">
            <Link
              href="/blog"
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                !tag
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
            >
              Tất cả
            </Link>
            {allTags.map((t) => (
              <Link
                key={t}
                href={`/blog?tag=${encodeURIComponent(t)}`}
                className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                  tag === t
                    ? 'border-neutral-900 bg-neutral-900 text-white'
                    : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
                }`}
              >
                {t}
              </Link>
            ))}
          </div>
        )}

        {posts.length === 0 ? (
          <p className="text-center text-neutral-400">
            {tag ? `Chưa có bài viết nào gắn tag "${tag}".` : 'Chưa có bài viết nào được đăng.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2">
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
                        className="aspect-[4/3] w-full object-cover transition-all duration-300 ease-out group-hover:scale-105 group-hover:opacity-90"
                      />
                    ) : (
                      <div className="aspect-[4/3] w-full bg-neutral-100" />
                    )}
                  </div>

                  {post.tags && post.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
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

                  <h2 className="mt-3 text-lg font-bold leading-snug text-neutral-900 transition-colors group-hover:text-neutral-600">
                    {post.title}
                  </h2>

                  <p className="mt-2 text-sm text-neutral-400">
                    {formatDate(post.publishedAt)} · {formatViewCount(post.viewCount)}
                  </p>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
