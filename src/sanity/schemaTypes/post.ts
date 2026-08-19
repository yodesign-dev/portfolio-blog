// ⬇️ CẬP NHẬT: import React — cần để tự render annotation "textColor" và "fontFamily"
// bằng React.createElement (file này là .ts nên không dùng JSX <span> trực tiếp được)
import React from 'react'
import {defineField, defineType} from 'sanity'

// ⬇️ CẬP NHẬT: danh sách màu chữ cho phép chọn trong Studio
// Sửa/thêm màu tại đây nếu cần — value là mã hex sẽ áp thẳng vào style color
const TEXT_COLORS = [
  {title: 'Mặc định', value: ''},
  {title: 'Đỏ', value: '#e53e3e'},
  {title: 'Xanh dương', value: '#00ddff'},
  {title: 'Xanh lá', value: '#38a169'},
  {title: 'Vàng', value: '#d69e2e'},
  {title: 'Tím', value: '#805ad5'},
]

// ⬇️ CẬP NHẬT: danh sách font chữ cho phép chọn trong Studio
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
    defineField({
      name: 'body',
      title: 'Nội dung bài viết',
      type: 'array',
      of: [
        {
          type: 'block',
          // ⬇️ CẬP NHẬT: thêm styles (H1/H2/H3/Quote) — trước đây block không khai
          // báo styles nên Studio chỉ cho chọn "Normal", không có tiêu đề phụ
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'H1', value: 'h1'},
            {title: 'H2', value: 'h2'},
            {title: 'H3', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          // ⬇️ CẬP NHẬT: thêm danh sách bullet/numbered (trước đây chưa khai báo)
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
          ],
          marks: {
            // ⬇️ CẬP NHẬT: thêm Underline, Strike, Code — trước đây "marks" chưa
            // được khai báo nên Studio chỉ có Bold/Italic mặc định của Sanity
            decorators: [
              {title: 'Bold', value: 'strong'},
              {title: 'Italic', value: 'em'},
              {title: 'Underline', value: 'underline'},
              {title: 'Strike', value: 'strike-through'},
              {title: 'Code', value: 'code'},
            ],
            // ⬇️ CẬP NHẬT: toàn bộ khối "annotations" là MỚI — đây là phần thêm
            // chức năng đổi màu chữ, đổi font, và chèn link cho văn bản bôi đen
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
          ],
        },
        // ⬇️ CẬP NHẬT: thêm { type: 'table' } — MỚI, cho phép chèn bảng vào bài viết.
        // Bắt buộc phải cài "npm install @sanity/table" và đã đăng ký table()
        // trong plugins của sanity.config.ts, nếu không dòng này sẽ gây lỗi runtime.
        {
          type: 'table',
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'mainImage',
      subtitle: 'publishedAt',
    },
  },
})
