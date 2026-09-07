import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'timelineYear',
  title: 'Timeline — Năm',
  type: 'document',
  fields: [
    defineField({
      name: 'year',
      title: 'Năm',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(2000).max(2100),
    }),
    defineField({
      name: 'tools',
      title: 'Công cụ nổi bật trong năm này',
      description: 'Chọn các tool (đã có trong "Công cụ") đang được dùng nhiều trong năm này.',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'tool'}]}],
    }),
  ],
  preview: {
    select: {
      year: 'year',
      tools: 'tools',
    },
    prepare({year, tools}) {
      const count = Array.isArray(tools) ? tools.length : 0
      return {
        title: `${year}`,
        subtitle: `${count} công cụ`,
      }
    },
  },
  orderings: [
    {
      title: 'Năm (mới nhất trước)',
      name: 'yearDesc',
      by: [{field: 'year', direction: 'desc'}],
    },
  ],
})
