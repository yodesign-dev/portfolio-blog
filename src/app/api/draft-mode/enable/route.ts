import {client} from '@/sanity/lib/client'
import {defineEnableDraftMode} from 'next-sanity/draft-mode'

// Token cần quyền "Viewer" trở lên, tạo tại sanity.io/manage → API → Tokens.
// Lưu vào biến môi trường SANITY_API_READ_TOKEN (KHÔNG thêm tiền tố
// NEXT_PUBLIC_ — token này chỉ chạy phía server, không được lộ ra client).
export const {GET} = defineEnableDraftMode({
  client: client.withConfig({token: process.env.SANITY_API_READ_TOKEN}),
})
