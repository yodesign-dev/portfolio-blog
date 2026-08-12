import Link from 'next/link'
import Image from 'next/image'
import {client} from '@/sanity/lib/client'
import {urlFor} from '@/sanity/lib/image'

// Cache dữ liệu 60 giây (ISR) — bạn có thể chỉnh lại tùy nhu cầu
export const revalidate = 60

const POSTS_QUERY = `*[_type == "post"] | order(publishedAt desc) {
  _id,
  title,
  slug,
  mainImage,
  publishedAt
}`

type Post = {
  _id: string
  title: string
  slug: {current: string}
  mainImage?: {
    asset?: {_ref: string}
    alt?: string
  }
  publishedAt: string
}

async function getPosts(): Promise<Post[]> {
  return client.fetch(POSTS_QUERY, {}, {next: {revalidate}})
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export default async function BlogPage() {
  const posts = await getPosts()

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      {/* Header */}
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
        {posts.length === 0 ? (
          <p className="text-center text-neutral-400">Chưa có bài viết nào được đăng.</p>
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

                  <h2 className="mt-4 text-lg font-bold leading-snug text-neutral-900 transition-colors group-hover:text-neutral-600">
                    {post.title}
                  </h2>

                  <p className="mt-2 text-sm text-neutral-400">{formatDate(post.publishedAt)}</p>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
