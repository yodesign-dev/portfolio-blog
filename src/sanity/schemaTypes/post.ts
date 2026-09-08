import React from 'react'
import {defineField, defineType} from 'sanity'

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
  fields: [
    defineField({
      name: 'title',
      title: 'Tiêu đề',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Đường dẫn tĩnh',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'mainImage',
      title: 'Ảnh đại diện',
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
      ],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Ngày đăng',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    // MỚI: excerpt — mô tả ngắn hiển thị dưới title ở trang danh sách blog,
    // giúp người đọc biết bài viết nói về gì trước khi bấm vào.
    defineField({
      name: 'excerpt',
      title: 'Mô tả ngắn',
      type: 'text',
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
      initialValue: 'Applebin',
    }),
    // ⬇️ MỚI: tags — mảng chuỗi tự do, gõ Enter để thêm từng tag.
    // Studio sẽ hiện dạng ô nhập kiểu "pill" nhờ options.layout = 'tags'.
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{type: 'string'}],
      options: {
        layout: 'tags',
      },
    }),
    // ⬇️ MỚI: viewCount — số lượt xem, readOnly để tránh sửa tay nhầm.
    // Được tăng tự động qua API route /api/track-view, không cập nhật
    // qua Studio thủ công. initialValue 0 để bài mới không bị undefined.
    defineField({
      name: 'viewCount',
      title: 'Lượt xem',
      type: 'number',
      initialValue: 0,
      readOnly: true,
      description: 'Tự động tăng khi có người xem bài viết — không chỉnh tay ở đây.',
    }),
    defineField({
      name: 'body',
      title: 'Nội dung bài viết',
      type: 'array',
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
                  annotation: (props: any) =>
                    React.createElement(
                      'span',
                      {style: {color: props.value?.color || undefined}},
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
                  annotation: (props: any) =>
                    React.createElement(
                      'span',
                      {style: {fontFamily: props.value?.font || undefined}},
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
  ],
  preview: {
    select: {
      title: 'title',
      media: 'mainImage',
      author: 'author',
      publishedAt: 'publishedAt',
    },
    prepare({title, media, author, publishedAt}) {
      const date = publishedAt ? new Date(publishedAt).toLocaleDateString('vi-VN') : ''
      return {
        title,
        media,
        subtitle: [author, date].filter(Boolean).join(' · '),
      }
    },
  },
})
