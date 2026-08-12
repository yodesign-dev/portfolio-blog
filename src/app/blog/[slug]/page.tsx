import Link from 'next/link'
import Image from 'next/image'
import {notFound} from 'next/navigation'
import {PortableText, type PortableTextComponents} from '@portabletext/react'
import {client} from '@/sanity/lib/client'
import {urlFor} from '@/sanity/lib/image'

export const revalidate = 60

const POST_QUERY = `*[_type == "post" && slug.current == $slug][0]{
  _id,
  title,
  slug,
  mainImage,
  publishedAt,
  body
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
  body: any
}

async function getPost(slug: string): Promise<Post | null> {
  return client.fetch(POST_QUERY, {slug}, {next: {revalidate}})
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// Định nghĩa cách hiển thị từng loại block trong nội dung Portable Text
const portableTextComponents: PortableTextComponents = {
  types: {
    image: ({value}) => {
      const imageUrl = urlFor(value)?.width(1200).fit('max').url()
      if (!imageUrl) return null
      return (
        <span className="my-8 block overflow-hidden rounded-lg">
          <Image
            src={imageUrl}
            alt={value.alt || ''}
            width={1200}
            height={800}
            className="h-auto w-full object-cover"
          />
        </span>
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
      <blockquote className="my-8 border-l-2 border-neutral-300 pl-6 text-lg italic leading-relaxed text-neutral-600">
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
  },
}

export async function generateMetadata({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params
  const post = await getPost(slug)

  if (!post) return {title: 'Không tìm thấy bài viết'}

  return {
    title: post.title,
  }
}

export default async function PostPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params
  const post = await getPost(slug)

  if (!post) {
    notFound()
  }

  const mainImageUrl = post.mainImage
    ? urlFor(post.mainImage)?.width(1600).height(900).fit('crop').url()
    : null

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <header className="border-b border-neutral-200">
        <div className="mx-auto max-w-3xl px-6 py-6 sm:px-8">
          <Link href="/blog" className="text-sm text-neutral-500 transition-colors hover:text-neutral-900">
            ← Quay lại Blog
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 sm:px-8 sm:py-16">
        <article>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-neutral-900 sm:text-4xl">
            {post.title}
          </h1>

          <p className="mt-4 text-sm text-neutral-400">{formatDate(post.publishedAt)}</p>

          {mainImageUrl && (
            <div className="mt-8 overflow-hidden rounded-lg">
              <Image
                src={mainImageUrl}
                alt={post.mainImage?.alt || post.title}
                width={1600}
                height={900}
                priority
                className="aspect-video w-full object-cover"
              />
            </div>
          )}

          <div className="mt-10">
            <PortableText value={post.body} components={portableTextComponents} />
          </div>
        </article>
      </main>
    </div>
  )
}
