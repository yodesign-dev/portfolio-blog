// Thông tin nhận diện dùng chung cho Navbar, Footer, metadata — sửa 1 chỗ
// là đổi toàn site.
import type {Metadata} from 'next'

export const SITE_NAME = 'Bin Nguyen'
export const SITE_ROLE = 'Product Designer × AI'
export const SITE_DESCRIPTION =
  'Bin Nguyen is a product designer with 10+ years of end-to-end experience, using AI to move from research to high-fidelity work faster. Case studies, writing and toolkit.'

// Domain chính thức — dùng cho og:url, link chia sẻ, sitemap, canonical.
// Cố tình KHÔNG đọc NEXT_PUBLIC_SITE_URL nữa: biến đó trên Vercel đang để
// domain cũ (binblogs.vercel.app) khiến link chia sẻ trỏ sai domain.
export const SITE_URL = 'https://applebin.me'

// Ảnh OG tạo động (src/app/og/route.tsx) — dùng khi trang/bài không có ảnh riêng.
export function ogImageUrl(title?: string, kind?: string) {
  const params = new URLSearchParams()
  if (title) params.set('title', title)
  if (kind) params.set('kind', kind)
  const query = params.toString()
  return `/og${query ? `?${query}` : ''}`
}

// Metadata cho các trang cấp 1 (Work, Writing, Toolkit…). Next.js ghi đè
// NGUYÊN khối openGraph của layout khi trang tự khai báo, nên dựng đủ ở đây.
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}): Metadata {
  const image = {url: ogImageUrl(title), width: 1200, height: 630}
  return {
    title,
    description,
    alternates: {canonical: path},
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: `${title} · ${SITE_NAME}`,
      description,
      url: path,
      images: [image],
    },
    twitter: {card: 'summary_large_image', images: [image.url]},
  }
}

export const NAV_LINKS = [
  {href: '/work', label: 'Work'},
  {href: '/blog', label: 'Writing'},
  {href: '/tools', label: 'Toolkit'},
  {href: '/chill', label: 'Chill'},
  {href: '/resume', label: 'Resume'},
]

// Link mạng xã hội hiện ở Footer — để trống href thì mục đó tự ẩn.
export const SOCIAL_LINKS: {label: string; href: string}[] = [
  {label: 'LinkedIn', href: 'https://linkedin.com/in/binhnguyen1985'},
  {label: 'Dribbble', href: ''},
  {label: 'Behance', href: 'https://www.behance.net/applebin'},
  {label: 'Medium', href: 'https://medium.com/@applebin'},
]
