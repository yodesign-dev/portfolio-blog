import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'resume',
  title: 'Resume',
  type: 'document',
  fields: [
    defineField({
      name: 'file',
      title: 'File PDF',
      type: 'file',
      options: {
        accept: '.pdf',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isPublic',
      title: 'Công khai',
      description:
        'Bật để hiển thị resume công khai tại /resume. Tắt để ẩn — trang sẽ hiện thông báo "chưa công khai" thay vì file thật.',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'updatedAt',
      title: 'Cập nhật lần cuối',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {
      isPublic: 'isPublic',
      updatedAt: 'updatedAt',
    },
    prepare({isPublic, updatedAt}) {
      const status = isPublic ? '🟢 Công khai' : '🔴 Riêng tư'
      const date = updatedAt
        ? ' · ' + new Date(updatedAt).toLocaleDateString('vi-VN')
        : ''
      return {
        title: 'Resume',
        subtitle: status + date,
      }
    },
  },
})
