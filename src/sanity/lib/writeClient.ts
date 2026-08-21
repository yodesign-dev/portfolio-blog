import {createClient} from 'next-sanity'
import {apiVersion, dataset, projectId} from '@/sanity/env'

// Client RIÊNG cho việc GHI dữ liệu (tăng viewCount). Khác với client đọc
// thông thường (src/sanity/lib/client.ts) ở 2 điểm:
// 1. useCdn: false — bắt buộc khi ghi, CDN chỉ dùng để đọc.
// 2. token — cần quyền "Editor" trở lên. Token này CHỈ được dùng ở phía
//    server (API route), không bao giờ lộ ra trình duyệt vì biến
//    SANITY_API_WRITE_TOKEN không có tiền tố NEXT_PUBLIC_.
export const writeClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_API_WRITE_TOKEN,
})
