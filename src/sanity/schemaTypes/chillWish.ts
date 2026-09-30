import {defineField, defineType} from 'sanity'

// Góp ý / mong muốn của người xem trang /chill (khung "Wishlist").
//
// Người xem gửi qua /api/chill-wish → tạo document với ID dạng `chillWish.<uuid>`.
// Dấu chấm trong ID khiến document KHÔNG đọc được bằng request không có token
// (dataset đang public), nên email + ipHash không lộ ra ngoài; API tự đọc bằng
// token rồi chỉ trả về các trường công khai.
//
// Quy trình: góp ý mới ở trạng thái "Chờ duyệt" (chưa hiện) → đổi sang "Đang
// cân nhắc" / "Sẽ làm" / "Đã làm" thì hiện công khai. "Ẩn" = từ chối / spam.
export const WISH_STATUSES = [
  {title: '⏳ Chờ duyệt', value: 'pending'},
  {title: '🤔 Đang cân nhắc', value: 'considering'},
  {title: '🛠 Sẽ làm', value: 'planned'},
  {title: '✅ Đã làm', value: 'shipped'},
  {title: '🚫 Ẩn', value: 'hidden'},
]

export const WISH_CATEGORIES = [
  {title: '💡 Tính năng', value: 'feature'},
  {title: '🎵 Nhạc', value: 'music'},
  {title: '📍 Điểm đến', value: 'place'},
  {title: '🐞 Lỗi', value: 'bug'},
  {title: '💬 Khác', value: 'other'},
]

const emoji = (value?: string) => WISH_STATUSES.find((s) => s.value === value)?.title.split(' ')[0] ?? '⏳'

export default defineType({
  name: 'chillWish',
  title: 'Chill · Wishlist',
  type: 'document',
  fields: [
    defineField({
      name: 'status',
      title: 'Trạng thái',
      type: 'string',
      options: {list: WISH_STATUSES, layout: 'radio', direction: 'horizontal'},
      initialValue: 'pending',
      description: 'Chỉ góp ý khác "Chờ duyệt" và "Ẩn" mới hiện trong Wishlist trên trang /chill.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'text',
      title: 'Nội dung',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required().max(300),
    }),
    defineField({
      name: 'category',
      title: 'Loại',
      type: 'string',
      options: {list: WISH_CATEGORIES},
      initialValue: 'feature',
    }),
    defineField({
      name: 'reply',
      title: 'Bin trả lời',
      type: 'text',
      rows: 2,
      description: 'Hiện ngay dưới góp ý trên trang (không bắt buộc), vd. "Đã thêm, thử bấm vào mèo nhé!".',
      validation: (Rule) => Rule.max(200),
    }),
    defineField({name: 'hearts', title: '❤️ Lượt thích', type: 'number', initialValue: 0, readOnly: true}),
    defineField({name: 'name', title: 'Tên người gửi', type: 'string', readOnly: true}),
    defineField({
      name: 'email',
      title: 'Email người gửi',
      type: 'string',
      readOnly: true,
      description: 'Không bao giờ hiện công khai. Khi chuyển sang "Đã làm", người gửi nhận mail báo (nếu đã cấu hình CHILL_WISH_FROM).',
    }),
    defineField({name: 'context', title: 'Bối cảnh lúc gửi', type: 'string', readOnly: true}),
    defineField({name: 'notifiedAt', title: 'Đã mail báo người gửi lúc', type: 'datetime', readOnly: true}),
    defineField({name: 'ipHash', title: 'IP (đã băm)', type: 'string', readOnly: true, hidden: true}),
  ],
  orderings: [
    {title: 'Mới nhất', name: 'newest', by: [{field: '_createdAt', direction: 'desc'}]},
    {title: 'Nhiều ❤️ nhất', name: 'hearts', by: [{field: 'hearts', direction: 'desc'}]},
  ],
  preview: {
    select: {text: 'text', status: 'status', hearts: 'hearts', name: 'name', category: 'category'},
    prepare: ({text, status, hearts, name, category}) => ({
      title: `${emoji(status)} ${text ?? ''}`,
      subtitle: [WISH_CATEGORIES.find((c) => c.value === category)?.title, name || 'Khách', `❤️ ${hearts ?? 0}`].filter(Boolean).join(' · '),
    }),
  },
})
