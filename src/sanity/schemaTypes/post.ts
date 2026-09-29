import React from 'react'
import {defineField, defineType, type BlockAnnotationProps} from 'sanity'

const TEXT_COLORS = [
  {title: 'Mặc định', value: ''},
  {title: 'Đỏ', value: '#e53e3e'},
  {title: 'Xanh dương', value: '#00ddff'},
  {title: 'Xanh lá', value: '#38a169'},
  {title: 'Vàng', value: '#d69e2e'},
  {title: 'Tím', value: '#805ad5'},
]

const FONTS = [
  {title: 'Inter (mặc định)', value: 'Inter, sans-serif'},
  {title: 'Serif', value: 'Georgia, serif'},
  {title: 'Monospace', value: 'ui-monospace, monospace'},
]

export default defineType({
  name: 'post',
  title: 'Bài viết',
  type: 'document',
  // MỚI: chia field thành tab, thay vì 1 danh sách dài phải cuộn hết mới
  // tới "Nội dung bài viết". Tab "Nội dung" mở lên là viết được ngay.
  groups: [
    {name: 'content', title: 'Nội dung', default: true},
    {name: 'meta', title: 'Hiển thị & SEO'},
    {name: 'caseStudy', title: 'Case study'},
    {name: 'stats', title: 'Thống kê'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Tiêu đề',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Đường dẫn tĩnh',
      type: 'slug',
      group: 'content',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Nội dung bài viết',
      type: 'array',
      group: 'content',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'H1', value: 'h1'},
            {title: 'H2', value: 'h2'},
            {title: 'H3', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
              {title: 'Underline', value: 'underline'},
              {title: 'Strike', value: 'strike-through'},
              {title: 'Code', value: 'code'},
            ],
            annotations: [
              defineField({
                name: 'textColor',
                title: 'Màu chữ',
                type: 'object',
                fields: [
                  defineField({
                    name: 'color',
                    title: 'Chọn màu',
                    type: 'string',
                    options: {list: TEXT_COLORS},
                  }),
                ],
                components: {
                  annotation: (props: BlockAnnotationProps) =>
                    React.createElement(
                      'span',
                      {style: {color: (props.value as {color?: string})?.color || undefined}},
                      props.children
                    ),
                },
              }),
              defineField({
                name: 'fontFamily',
                title: 'Font chữ',
                type: 'object',
                fields: [
                  defineField({
                    name: 'font',
                    title: 'Chọn font',
                    type: 'string',
                    options: {list: FONTS},
                  }),
                ],
                components: {
                  annotation: (props: BlockAnnotationProps) =>
                    React.createElement(
                      'span',
                      {style: {fontFamily: (props.value as {font?: string})?.font || undefined}},
                      props.children
                    ),
                },
              }),
              defineField({
                name: 'link',
                title: 'Link',
                type: 'object',
                fields: [defineField({name: 'href', title: 'URL', type: 'url'})],
              }),
            ],
          },
        },
        {
          type: 'image',
          options: {
            hotspot: true,
          },
          fields: [
            defineField({
              name: 'alt',
              title: 'Văn bản thay thế (Alt text)',
              type: 'string',
            }),
            // MỚI: caption — chú thích nhỏ hiện dưới ảnh, giống style
            // Medium ("Old design of doctranslate.io"). Trước đây phải
            // giả bằng cách viết chữ in đậm phía TRÊN ảnh — giờ có field
            // riêng, hiển thị đúng vị trí (dưới ảnh, in nghiêng, căn giữa).
            defineField({
              name: 'caption',
              title: 'Chú thích ảnh',
              type: 'string',
              description: 'Hiện dưới ảnh, in nghiêng nhỏ — để trống nếu không cần.',
            }),
          ],
        },
        {
          type: 'table',
        },
        // MỚI: divider — Sanity không có block "đường phân cách" mặc định,
        // đây là block object tự định nghĩa để chèn dòng kẻ ngăn cách giữa
        // các phần trong bài, giống nhiều blog editorial khác (không riêng Medium).
        {
          type: 'object',
          name: 'divider',
          title: 'Đường phân cách',
          fields: [
            defineField({
              name: 'style',
              title: 'Kiểu',
              type: 'string',
              options: {
                list: [
                  {title: 'Đường kẻ mảnh', value: 'line'},
                  {title: 'Ba dấu chấm', value: 'dots'},
                ],
                layout: 'radio',
              },
              initialValue: 'line',
            }),
          ],
          preview: {
            select: {style: 'style'},
            prepare({style}) {
              return {title: style === 'dots' ? 'Đường phân cách (chấm)' : 'Đường phân cách (kẻ)'}
            },
          },
        },
      ],
    }),
    defineField({
      name: 'mainImage',
      title: 'Ảnh đại diện',
      type: 'image',
      group: 'meta',
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: 'alt',
          title: 'Văn bản thay thế (Alt text)',
          type: 'string',
        }),
      ],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Ngày đăng',
      type: 'datetime',
      group: 'meta',
      initialValue: () => new Date().toISOString(),
    }),
    // MỚI: excerpt — mô tả ngắn hiển thị dưới title ở trang danh sách blog,
    // giúp người đọc biết bài viết nói về gì trước khi bấm vào.
    defineField({
      name: 'excerpt',
      title: 'Mô tả ngắn',
      type: 'text',
      group: 'meta',
      rows: 3,
      description: 'Hiển thị dưới tiêu đề ở trang danh sách blog. Nên viết 1-2 câu.',
      validation: (Rule) => Rule.max(200),
    }),
    // MỚI: author — tên tác giả, hiển thị cạnh ngày đăng. Để dạng string
    // đơn giản thay vì reference sang document riêng vì hiện tại chỉ có
    // một người viết; có thể nâng cấp thành type "author" riêng sau nếu
    // có nhiều tác giả.
    defineField({
      name: 'author',
      title: 'Tác giả',
      type: 'string',
      group: 'meta',
      initialValue: 'Applebin',
    }),
    // ⬇️ MỚI: tags — mảng chuỗi tự do, gõ Enter để thêm từng tag.
    // Studio sẽ hiện dạng ô nhập kiểu "pill" nhờ options.layout = 'tags'.
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      group: 'meta',
      of: [{type: 'string'}],
      options: {
        layout: 'tags',
      },
    }),
    // MỚI: Case study — bật lên thì bài viết hiện ở trang Work (/work)
    // thay vì Writing (/blog), kèm thông tin Role/Company/Year và các con số
    // Impact. Dùng chung schema post để không phải nhập lại nội dung.
    defineField({
      name: 'isCaseStudy',
      title: 'Là case study',
      type: 'boolean',
      group: 'caseStudy',
      initialValue: false,
      description: 'Bật để bài này hiện ở mục Work (portfolio) thay vì Writing.',
    }),
    defineField({
      name: 'role',
      title: 'Vai trò',
      type: 'string',
      group: 'caseStudy',
      description: 'VD: Lead Product Designer',
      hidden: ({document}) => !document?.isCaseStudy,
    }),
    defineField({
      name: 'company',
      title: 'Công ty / Khách hàng',
      type: 'string',
      group: 'caseStudy',
      description: 'VD: docTranslate.io',
      hidden: ({document}) => !document?.isCaseStudy,
    }),
    defineField({
      name: 'year',
      title: 'Thời gian',
      type: 'string',
      group: 'caseStudy',
      description: 'VD: 2025 hoặc 2024 – 2025',
      hidden: ({document}) => !document?.isCaseStudy,
    }),
    defineField({
      name: 'impact',
      title: 'Kết quả (Impact)',
      type: 'array',
      group: 'caseStudy',
      description: 'Tối đa 3 con số nổi bật, VD: "40%" — "faster time-to-translate".',
      hidden: ({document}) => !document?.isCaseStudy,
      validation: (Rule) => Rule.max(3),
      of: [
        {
          type: 'object',
          name: 'metric',
          fields: [
            defineField({
              name: 'value',
              title: 'Con số',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Mô tả',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: {title: 'value', subtitle: 'label'},
          },
        },
      ],
    }),
    // ⬇️ MỚI: viewCount — số lượt xem, readOnly để tránh sửa tay nhầm.
    // Được tăng tự động qua API route /api/track-view, không cập nhật
    // qua Studio thủ công. initialValue 0 để bài mới không bị undefined.
    defineField({
      name: 'viewCount',
      title: 'Lượt xem',
      type: 'number',
      group: 'stats',
      initialValue: 0,
      readOnly: true,
      description: 'Tự động tăng khi có người xem bài viết — không chỉnh tay ở đây.',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'mainImage',
      author: 'author',
      publishedAt: 'publishedAt',
      isCaseStudy: 'isCaseStudy',
    },
    prepare({title, media, author, publishedAt, isCaseStudy}) {
      const date = publishedAt ? new Date(publishedAt).toLocaleDateString('vi-VN') : ''
      return {
        title,
        media,
        subtitle: [isCaseStudy ? '💼 Case study' : null, author, date].filter(Boolean).join(' · '),
      }
    },
  },
})
