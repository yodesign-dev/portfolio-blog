import {defineArrayMember, defineField, defineType} from 'sanity'
import {LEGAL_DEFAULTS, toBlocks} from '../../components/chill/legal-defaults'

// Điều khoản & Quyền riêng tư của /chill — 1 tài liệu duy nhất (id "chillLegal"),
// hiện ở /chill/terms và /chill/privacy. Mở lần đầu là văn bản đã điền sẵn bản mặc định
// (src/components/chill/legal-defaults.ts); để trống ô nào thì trang dùng bản mặc định.
//
// Trong văn bản, {owner} / {email} / {updated} tự thay bằng 3 ô đầu tiên.

const body = (name: string, title: string, group: 'terms' | 'privacy', description: string) =>
  defineField({
    name,
    title,
    group,
    type: 'array',
    description,
    of: [
      defineArrayMember({
        type: 'block',
        styles: [
          {title: 'Đoạn văn', value: 'normal'},
          {title: 'Tiêu đề mục', value: 'h2'},
        ],
        lists: [{title: 'Gạch đầu dòng', value: 'bullet'}],
        marks: {
          decorators: [{title: 'Đậm', value: 'strong'}],
          annotations: [
            {
              name: 'link',
              type: 'object',
              title: 'Link',
              fields: [{name: 'href', type: 'url', title: 'URL', validation: (Rule) => Rule.uri({scheme: ['http', 'https', 'mailto']})}],
            },
          ],
        },
      }),
    ],
  })

export default defineType({
  name: 'chillLegal',
  title: 'Chill · Pháp lý',
  type: 'document',
  initialValue: () => ({
    updated: new Date().toISOString().slice(0, 10),
    terms: toBlocks(LEGAL_DEFAULTS.terms.vi),
    termsEn: toBlocks(LEGAL_DEFAULTS.terms.en),
    privacy: toBlocks(LEGAL_DEFAULTS.privacy.vi),
    privacyEn: toBlocks(LEGAL_DEFAULTS.privacy.en),
  }),
  groups: [
    {name: 'info', title: 'Thông tin', default: true},
    {name: 'terms', title: 'Điều khoản'},
    {name: 'privacy', title: 'Quyền riêng tư'},
  ],
  fields: [
    defineField({
      name: 'owner',
      title: 'Chủ sở hữu',
      type: 'string',
      group: 'info',
      description: 'Tên ghi trên trang, thay cho {owner} trong văn bản. Để trống thì dùng "Bin".',
    }),
    defineField({
      name: 'email',
      title: 'Email liên hệ',
      type: 'string',
      group: 'info',
      description: 'Nơi nhận yêu cầu bản quyền và xoá dữ liệu, thay cho {email}. Chưa điền thì trang hiện "(chưa có email)".',
      validation: (Rule) => Rule.email(),
    }),
    defineField({
      name: 'updated',
      title: 'Cập nhật lần cuối',
      type: 'date',
      group: 'info',
      options: {dateFormat: 'DD/MM/YYYY'},
      description: 'Hiện ở đầu cả 2 trang. Đổi ngày mỗi khi sửa nội dung.',
    }),
    body('terms', 'Điều khoản (tiếng Việt)', 'terms', 'Trang /chill/terms khi khách xem giao diện tiếng Việt.'),
    body('termsEn', 'Điều khoản (tiếng Anh)', 'terms', 'Trang /chill/terms khi khách xem giao diện tiếng Anh.'),
    body('privacy', 'Quyền riêng tư (tiếng Việt)', 'privacy', 'Trang /chill/privacy khi khách xem tiếng Việt. Đổi cách lưu dữ liệu trong code thì nhớ sửa ở đây.'),
    body('privacyEn', 'Quyền riêng tư (tiếng Anh)', 'privacy', 'Trang /chill/privacy khi khách xem tiếng Anh.'),
  ],
  preview: {prepare: () => ({title: 'Điều khoản & Quyền riêng tư'})},
})
