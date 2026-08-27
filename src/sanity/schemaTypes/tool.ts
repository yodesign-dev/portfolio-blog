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
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'category',
    },
  },
})
