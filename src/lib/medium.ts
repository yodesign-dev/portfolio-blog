// Bài viết trên Medium — trang Writing hiện tạm các bài này khi Sanity chưa
// có bài nào, để trang không trống trơn. Đọc RSS phía server (không cần
// thêm domain vào CSP connect-src), lỗi mạng/Medium chặn thì trả [] để
// trang rơi về empty state thay vì vỡ.
import {SOCIAL_LINKS} from '@/lib/site'

export const MEDIUM_URL = SOCIAL_LINKS.find((link) => link.label === 'Medium')?.href ?? ''

export const MEDIUM_IMAGE_HOSTS = ['cdn-images-1.medium.com', 'miro.medium.com']

export type MediumPost = {
  title: string
  link: string
  publishedAt: string
  excerpt: string
  image: string | null
  tags: string[]
}

// RSS của Medium bọc nội dung trong CDATA
function tag(xml: string, name: string) {
  const match = xml.match(new RegExp(`<${name}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`))
  return match ? match[1].trim() : ''
}

function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
}

function excerptFrom(html: string, max = 180) {
  // Đoạn <p> đầu tiên có chữ (bỏ qua caption/ảnh)
  const paragraphs = html.match(/<p[^>]*>([\s\S]*?)<\/p>/g) ?? []
  const text = paragraphs
    .map((p) => decodeEntities(p.replace(/<[^>]+>/g, '')).trim())
    .find((p) => p.length > 40) ?? ''
  return text.length > max ? `${text.slice(0, max).replace(/\s+\S*$/, '')}…` : text
}

export async function getMediumPosts(revalidate = 3600): Promise<MediumPost[]> {
  if (!MEDIUM_URL) return []
  const handle = MEDIUM_URL.replace(/\/$/, '').split('/').pop()
  try {
    const res = await fetch(`https://medium.com/feed/${handle}`, {
      next: {revalidate},
      headers: {'User-Agent': 'Mozilla/5.0 (compatible; applebin.me)'},
    })
    if (!res.ok) return []
    const xml = await res.text()
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []

    return items.map((item) => {
      const content = tag(item, 'content:encoded')
      const image = content.match(/<img[^>]+src="(https:\/\/[^"]+)"/)?.[1] ?? null
      const categories = [...item.matchAll(/<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/g)]
      return {
        title: decodeEntities(tag(item, 'title')),
        // Bỏ ?source=rss… để link gọn
        link: tag(item, 'link').split('?')[0],
        publishedAt: tag(item, 'pubDate'),
        excerpt: excerptFrom(content),
        // Chỉ nhận ảnh từ CDN của Medium (đã khai trong images.remotePatterns
        // ở next.config.ts — host lạ sẽ làm next/image báo lỗi); bỏ pixel
        // theo dõi 1x1 /_/stat.
        image:
          image && MEDIUM_IMAGE_HOSTS.includes(new URL(image).hostname) && !image.includes('/_/stat')
            ? image
            : null,
        tags: categories.map((c) => c[1].trim()).slice(0, 3),
      }
    }).filter((post) => post.title && post.link)
  } catch {
    return []
  }
}
