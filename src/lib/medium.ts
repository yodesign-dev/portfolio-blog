// Bài viết trên Medium — trang Writing hiện tạm các bài này khi Sanity chưa
// có bài nào, để trang không trống trơn. Đọc RSS phía server (không cần
// thêm domain vào CSP connect-src), lỗi mạng/Medium chặn thì dùng bản dự
// phòng FALLBACK_POSTS để mục Writing không biến mất, và ghi log để biết lý do.
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

// Chép từ RSS ngày 2026-11-05. Đăng bài Medium mới thì nên thêm vào đây; thiếu
// cũng chỉ ảnh hưởng lúc Medium lỗi.
const FALLBACK_POSTS: MediumPost[] = [
  {
    title: 'AI technology has significantly impacted and helped the translation industry',
    link: 'https://medium.com/@applebin/ai-technology-has-significantly-impacted-and-helped-the-translation-industry-c4c16be8f4d6',
    publishedAt: '2024-06-26T12:00:00Z',
    excerpt:
      'AI technology’s impact on the translation industry is profound, making translations faster, more accurate, and more accessible than ever before. This makes accessing and using…',
    image: 'https://cdn-images-1.medium.com/max/1024/1*VqJlWnOevAgAA183hq_2sQ.png',
    tags: ['ai-technology', 'translation-services', 'product-design'],
  },
  {
    title: 'Reduce onboarding friction, and simplify the experience.',
    link: 'https://medium.com/@applebin/reduce-onboarding-friction-and-simplify-the-experience-df8a5d6b617b',
    publishedAt: '2023-10-30T12:00:00Z',
    excerpt:
      'How might we enable users to buy and sell without the need for switching and how can we delay verification until it is really necessary?',
    image: 'https://cdn-images-1.medium.com/max/1024/1*_bNQrMEdiyUCMUrDla0rCQ.png',
    tags: [],
  },
  {
    title: 'Case study with building a new service “ Freemium” for Recruiter at Vieclam24h',
    link: 'https://medium.com/@applebin/case-study-with-building-a-new-service-freemium-for-recruiter-at-vieclam24h-9a6a314ff0b0',
    publishedAt: '2022-04-12T12:00:00Z',
    excerpt:
      'This year, the Product team will support for Sales (P.I.C) request to build a new service “ Freemium”. This service will help increase the number of job postings from Recruiter…',
    image: 'https://cdn-images-1.medium.com/max/1024/1*JPaXqnMHX7bqHGTJK84jwg.png',
    tags: ['case-study', 'ui-ux-design', 'service-design'],
  },
  {
    title: 'Build a Food Delivery product in VietNam market and What I have seen',
    link: 'https://medium.com/@applebin/build-a-food-delivery-product-in-vietnam-market-and-what-i-have-seen-e8d9fd112740',
    publishedAt: '2019-06-27T12:00:00Z',
    excerpt:
      'This is my first article for sharing my experiences about build a food delivery app since I had joined and work as a part of team in Lala: Food Delivery’s product.',
    image: 'https://cdn-images-1.medium.com/max/1024/1*yk_Pv0X3Sjriyk3fTkDigA.png',
    tags: ['ui-ux-design', 'food-delivery', 'user-research'],
  },
]

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
    if (!res.ok) {
      console.warn(`Medium feed: HTTP ${res.status}, using fallback posts`)
      return FALLBACK_POSTS
    }
    const xml = await res.text()
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []

    const posts = items.map((item) => {
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
    // HTTP 200 nhưng không có bài: thường là trang chặn bot, không phải RSS
    if (posts.length === 0) {
      console.warn('Medium feed: no posts in response, using fallback posts')
      return FALLBACK_POSTS
    }
    return posts
  } catch (error) {
    console.warn('Medium feed: request failed, using fallback posts', error)
    return FALLBACK_POSTS
  }
}
