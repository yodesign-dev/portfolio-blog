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
          ],
        },
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
