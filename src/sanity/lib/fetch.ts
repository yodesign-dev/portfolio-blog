import {draftMode} from 'next/headers'
import {client} from './client'

// Dùng thay cho `client.fetch(...)` trực tiếp ở mọi page.tsx. Tự động:
// - Khi KHÔNG ở Draft Mode (người đọc bình thường): giữ nguyên hành vi cũ
//   — dùng CDN cache, revalidate theo ISR, y hệt trước khi có Presentation Tool.
// - Khi ĐANG ở Draft Mode (đang mở qua Presentation Tool để preview):
//   đọc bản `drafts` (chưa publish), tắt CDN cache để luôn thấy bản mới nhất,
//   và bật `stega` để overlay click-to-edit hoạt động.
export async function sanityFetch<T>({
  query,
  params = {},
  revalidate = 60,
}: {
  query: string
  params?: Record<string, unknown>
  revalidate?: number
}): Promise<T> {
  const isDraftMode = (await draftMode()).isEnabled

  if (!isDraftMode) {
    return client.fetch<T>(query, params, {next: {revalidate}})
  }

  return client
    .withConfig({
      useCdn: false,
      perspective: 'drafts',
      token: process.env.SANITY_API_READ_TOKEN,
      stega: {
        studioUrl: '/studio',
      },
    })
    .fetch<T>(query, params, {cache: 'no-store'})
}
