import {defineField, defineType} from 'sanity'

const CATEGORIES = [
  {title: 'Design', value: 'design'},
  {title: 'Development', value: 'development'},
  {title: 'AI', value: 'ai'},
  {title: 'Productivity', value: 'productivity'},
  {title: 'Marketing', value: 'marketing'},
  {title: 'Khác', value: 'other'},
]

export default defineType({
  name: 'tool',
  title: 'Công cụ',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Tên công cụ',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Website',
      type: 'url',
      description: 'Logo sẽ tự động lấy favicon từ domain này, không cần upload tay.',
      validation: (Rule) =>
        Rule.required().uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'description',
      title: 'Mô tả ngắn',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: 'category',
      title: 'Danh mục',
      type: 'string',
      options: {
        list: CATEGORIES,
        layout: 'dropdown',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'ctaLabel',
      title: 'Nhãn nút CTA',
      type: 'string',
      initialValue: 'Truy cập',
      description: 'Chữ hiển thị trên nút, ví dụ "Truy cập", "Dùng thử".',
    }),
    // MỚI: số liệu hiển thị trên trang /tools (mức dùng + đánh giá).
    // Cả 3 field đều để trống được — trang sẽ tự dùng số liệu tạm thời
    // cho tool nào chưa nhập, nên có thể cập nhật dần dần.
    defineField({
      name: 'usagePercent',
      title: 'Mức dùng (%)',
      type: 'number',
      description: 'Ước lượng % tần suất bạn dùng tool này, từ 0 đến 100.',
      validation: (Rule) => Rule.min(0).max(100),
    }),
    defineField({
      name: 'rating',
      title: 'Đánh giá (0–5)',
      type: 'number',
      description: 'Điểm đánh giá của bạn cho tool này, ví dụ 4.5.',
      validation: (Rule) => Rule.min(0).max(5),
    }),
    defineField({
      name: 'ratingCount',
      title: 'Số lượt đánh giá',
      type: 'number',
      description: 'Số liệu tham khảo hiển thị cạnh điểm đánh giá, vd. (120).',
      validation: (Rule) => Rule.min(0).integer(),
    }),
  ],
  preview: {
    select: {
      title: 'name',
      category: 'category',
      rating: 'rating',
    },
    prepare({title, category, rating}) {
      return {
        title,
        subtitle: rating ? `${category} · ${rating}★` : category,
      }
    },
  },
})
