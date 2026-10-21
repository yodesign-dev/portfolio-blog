import {defineField, defineType} from 'sanity'

// Lời giới thiệu hiện ở mục "What people say" trang chủ (Testimonials.tsx).
// Chưa có bài nào thì mục tự ẩn. Từ 3 bài trở lên: dải thẻ chạy ngang liên tục;
// ít hơn: thẻ đứng yên.
// Chỉ đăng lời giới thiệu thật, đã được người viết đồng ý cho đăng (vd. chép từ
// mục Recommendations trên LinkedIn).

export default defineType({
  name: 'testimonial',
  title: 'Lời giới thiệu',
  type: 'document',
  fields: [
    defineField({
      name: 'quote',
      title: 'Lời giới thiệu',
      type: 'text',
      rows: 4,
      description: 'Viết tiếng Anh cho đồng bộ với trang. Dài quá thì rút 1–3 câu đắt nhất.',
      validation: (Rule) => Rule.required().max(320),
    }),
    defineField({
      name: 'name',
      title: 'Tên người viết',
      type: 'string',
      validation: (Rule) => Rule.required().max(60),
    }),
    defineField({
      name: 'role',
      title: 'Chức danh',
      type: 'string',
      description: 'Vd. "Product Manager"',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'company',
      title: 'Công ty',
      type: 'string',
      description: 'Vd. "AhaMove"',
      validation: (Rule) => Rule.max(40),
    }),
    defineField({
      name: 'relation',
      title: 'Quan hệ khi làm việc',
      type: 'string',
      description: 'Tuỳ chọn, vd. "Worked with Bin on the driver app". Hiện nhỏ dưới tên.',
      validation: (Rule) => Rule.max(70),
    }),
    defineField({
      name: 'avatar',
      title: 'Ảnh đại diện',
      type: 'image',
      options: {hotspot: true},
      description: 'Tuỳ chọn. Để trống thì hiện chữ cái đầu của tên.',
    }),
    defineField({
      name: 'link',
      title: 'Link (LinkedIn…)',
      type: 'url',
      description: 'Tuỳ chọn. Bấm vào tên sẽ mở link này.',
    }),
    defineField({
      name: 'order',
      title: 'Thứ tự',
      type: 'number',
      description: 'Số nhỏ hiện trước.',
      initialValue: 10,
    }),
  ],
  orderings: [{title: 'Thứ tự', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}]}],
  preview: {
    select: {title: 'name', subtitle: 'quote', media: 'avatar'},
  },
})
