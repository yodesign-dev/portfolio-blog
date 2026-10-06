import {defineArrayMember, defineField, defineType} from 'sanity'

// Nhật ký thay đổi trang /chill — nút "Có gì mới" trên thanh trên cùng mở popup
// liệt kê các bản cập nhật, mới nhất trước. Chỉ ghi thay đổi người xem thấy /
// dùng được (phòng mới, nhạc mới, tính năng mới, lỗi dễ thấy đã sửa).
//
// Bản mới nhất có "Báo cho người xem" → chấm cam trên nút + thông báo nhỏ 1 lần
// cho người chưa xem bản đó.

export const UPDATE_KINDS = [
  {title: 'Mới', value: 'new'},
  {title: 'Cải thiện', value: 'improved'},
  {title: 'Sửa lỗi', value: 'fixed'},
]

// "Thử ngay" — trang tự đổi phòng / kênh nhạc / mở bảng (ChillRoom.tsx: runAction)
export const UPDATE_ACTIONS = [
  {title: 'Mở phòng Café window', value: 'room:cafe'},
  {title: 'Mở phòng Balcony', value: 'room:balcony'},
  {title: 'Mở phòng Night desk', value: 'room:desk'},
  {title: 'Chuyển kênh Café Acoustic', value: 'station:acoustic'},
  {title: 'Chuyển kênh Deep Focus', value: 'station:focus'},
  {title: 'Chuyển kênh Sax Lounge', value: 'station:sax'},
  {title: 'Chuyển kênh Lo-fi', value: 'station:lofi'},
  {title: 'Chuyển kênh Study Beats', value: 'station:study'},
  {title: 'Mở bảng cảm ơn (lọ tip)', value: 'board'},
  {title: 'Mở Wishlist', value: 'wishlist'},
  {title: 'Mở phòng chat', value: 'chat'},
  {title: 'Mở bảng cài đặt', value: 'settings'},
  {title: 'Bật chế độ Zen', value: 'zen'},
]

export default defineType({
  name: 'chillUpdate',
  title: 'Chill · Nhật ký thay đổi',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Tiêu đề',
      type: 'string',
      description: 'Nói người xem được gì, vd. "Ban công đọc sách & lọ tip mới". Tránh thuật ngữ kỹ thuật.',
      validation: (Rule) => Rule.required().max(70),
    }),
    defineField({
      name: 'date',
      title: 'Ngày',
      type: 'date',
      options: {dateFormat: 'DD/MM/YYYY'},
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Loại',
      type: 'string',
      initialValue: 'new',
      options: {list: UPDATE_KINDS, layout: 'radio', direction: 'horizontal'},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'items',
      title: 'Các ý',
      type: 'array',
      description: 'Tối đa 4 ý, mỗi ý một dòng ngắn.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'item',
          fields: [
            defineField({name: 'icon', title: 'Emoji', type: 'string', validation: (Rule) => Rule.max(4)}),
            defineField({name: 'text', title: 'Nội dung', type: 'string', validation: (Rule) => Rule.required().max(140)}),
          ],
          preview: {
            select: {icon: 'icon', text: 'text'},
            prepare: ({icon, text}) => ({title: `${icon ? `${icon} ` : ''}${text ?? ''}`}),
          },
        }),
      ],
      validation: (Rule) => Rule.required().min(1).max(4),
    }),
    defineField({
      name: 'image',
      title: 'Ảnh / GIF minh hoạ',
      type: 'image',
      description: 'Tuỳ chọn. Ảnh ngang 16:9, chụp cảnh có thay đổi.',
      fields: [defineField({name: 'alt', title: 'Mô tả ảnh', type: 'string'})],
    }),
    defineField({
      name: 'action',
      title: 'Nút "Thử ngay"',
      type: 'string',
      description: 'Tuỳ chọn. Bấm là đưa người xem tới đúng tính năng.',
      options: {list: UPDATE_ACTIONS},
    }),
    defineField({
      name: 'actionLabel',
      title: 'Chữ trên nút',
      type: 'string',
      initialValue: 'Thử ngay',
      hidden: ({document}) => !document?.action,
      validation: (Rule) => Rule.max(24),
    }),
    defineField({
      name: 'announce',
      title: 'Báo cho người xem',
      type: 'boolean',
      initialValue: true,
      description: 'Bật cho bản lớn: chấm cam trên nút "Có gì mới" + thông báo nhỏ 1 lần. Tắt cho bản sửa lặt vặt.',
    }),
    defineField({
      name: 'version',
      title: 'Phiên bản',
      type: 'string',
      description: 'Tuỳ chọn, vd. 2.5 — chỉ hiện chữ nhỏ.',
    }),
  ],
  orderings: [{title: 'Mới nhất', name: 'dateDesc', by: [{field: 'date', direction: 'desc'}]}],
  preview: {
    select: {title: 'title', date: 'date', kind: 'kind', media: 'image'},
    prepare: ({title, date, kind, media}) => ({
      title,
      subtitle: [date?.split('-').reverse().join('/'), UPDATE_KINDS.find((k) => k.value === kind)?.title].filter(Boolean).join(' · '),
      media,
    }),
  },
})
