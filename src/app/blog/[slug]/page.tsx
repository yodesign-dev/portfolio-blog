import Link from 'next/link'
import Image from 'next/image'
import {notFound} from 'next/navigation'
import {PortableText, type PortableTextComponents} from '@portabletext/react'
import {client} from '@/sanity/lib/client'
import {urlFor} from '@/sanity/lib/image'
// ⬇️ CẬP NHẬT: import component nút chia sẻ (file mới, xem hướng dẫn tạo bên dưới)
import {ShareButtons} from '@/components/originkit/ui/hero-31/share-buttons'

export const revalidate = 60

// ⬇️ CẬP NHẬT: base URL của site — dùng để build URL tuyệt đối cho OG tags và nút share.
// Bắt buộc phải thêm biến này vào .env / Vercel Environment Variables:
// NEXT_PUBLIC_SITE_URL=https://binblogs.vercel.app
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://binblogs.vercel.app'

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
    // ⬇️ CẬP NHẬT: render bảng — MỚI, khớp với { type: 'table' } đã thêm vào schema post.ts
    table: ({value}) => {
      if (!value?.rows?.length) return null
      return (
        <div className="my-8 overflow-x-auto">
          <table className="w-full border-collapse border border-neutral-200 text-left text-base">
            <tbody>
              {value.rows.map((row: any, rowIndex: number) => (
                <tr key={row._key ?? rowIndex}>
                  {row.cells?.map((cell: string, cellIndex: number) => (
                    <td
                      key={cellIndex}
                      className="border border-neutral-200 px-4 py-2 text-gray-800"
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
    // ⬇️ CẬP NHẬT: render gạch chân, gạch ngang — khớp với "underline"/"strike-through"
    // đã thêm vào marks.decorators trong schema post.ts
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
    // ⬇️ CẬP NHẬT: render màu chữ — MỚI, khớp với annotation "textColor" đã thêm vào schema
    textColor: ({children, value}) => (
      <span style={{color: value?.color || undefined}}>{children}</span>
    ),
    // ⬇️ CẬP NHẬT: render font chữ — MỚI, khớp với annotation "fontFamily" đã thêm vào schema
    fontFamily: ({children, value}) => (
      <span style={{fontFamily: value?.font || undefined}}>{children}</span>
    ),
  },
}

export async function generateMetadata({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params
  const post = await getPost(slug)

  if (!post) return {title: 'Không tìm thấy bài viết'}

  // ⬇️ CẬP NHẬT: toàn bộ khối bên dưới là MỚI — thêm Open Graph tags.
  // Bắt buộc để Facebook/LinkedIn hiển thị đúng ảnh + tiêu đề khi bài viết được chia sẻ,
  // vì 2 nền tảng này không đọc nội dung trang mà chỉ đọc các meta tag này.
  const postUrl = `${SITE_URL}/blog/${post.slug.current}`
  const ogImageUrl = post.mainImage
    ? urlFor(post.mainImage)?.width(1200).height(630).fit('crop').url()
    : undefined

  return {
    title: post.title,
    openGraph: {
      title: post.title,
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

export default async function PostPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params
  const post = await getPost(slug)

  if (!post) {
    notFound()
  }

  const mainImageUrl = post.mainImage
    ? urlFor(post.mainImage)?.width(1600).height(900).fit('crop').url()
    : null

  // ⬇️ CẬP NHẬT: URL tuyệt đối của bài viết — truyền vào ShareButtons để build link chia sẻ
  const postUrl = `${SITE_URL}/blog/${post.slug.current}`

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

          {/* ⬇️ CẬP NHẬT: bọc ngày đăng + nút share trong 1 hàng flex, căn 2 đầu */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-neutral-400">{formatDate(post.publishedAt)}</p>
            <ShareButtons url={postUrl} title={post.title} />
          </div>

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

          {/* ⬇️ CẬP NHẬT: nút share lặp lại ở cuối bài — tiện cho người đọc hết bài rồi mới muốn chia sẻ */}
          <div className="mt-12 border-t border-neutral-200 pt-8">
            <ShareButtons url={postUrl} title={post.title} />
          </div>
        </article>
      </main>
    </div>
  )
}
