import {defineField, defineType} from 'sanity'

// Bài nhạc cho trang /chill — nối vào sau các bài có sẵn trong code
// (src/components/chill/tracks.ts).
export default defineType({
  name: 'chillTrack',
  title: 'Chill · Nhạc',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Tên bài',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'station',
      title: 'Trạm nhạc',
      type: 'string',
      initialValue: 'lofi',
      options: {
        list: [
          {title: 'Café Acoustic', value: 'acoustic'},
          {title: 'Deep Focus', value: 'focus'},
          {title: 'Sax Lounge', value: 'sax'},
          {title: 'Lo-fi', value: 'lofi'},
          {title: 'Study Beats', value: 'study'},
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'mood',
      title: 'Mô tả ngắn',
      type: 'string',
      description: 'Hiện dưới tên bài, vd. "Piano · Warm", "Lo-fi · Rainy".',
    }),
    defineField({
      name: 'audio',
      title: 'File nhạc',
      type: 'file',
      options: {accept: 'audio/*'},
      description: 'Nên dùng .m4a (AAC) hoặc .mp3 ~128kbps để tải nhanh. Nhạc không lời.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'duration',
      title: 'Thời lượng (giây)',
      type: 'number',
      description: 'Để trống cũng được — trang tự đọc thời lượng khi phát. Nhập vào thì playlist hiện sẵn, vd. 180 = 3:00.',
      validation: (Rule) => Rule.min(1).integer(),
    }),
    defineField({
      name: 'order',
      title: 'Thứ tự',
      type: 'number',
      description: 'Số nhỏ đứng trước. Để trống thì xếp theo ngày tạo.',
    }),
  ],
  orderings: [{title: 'Thứ tự', name: 'order', by: [{field: 'order', direction: 'asc'}]}],
  preview: {
    select: {title: 'title', mood: 'mood', duration: 'duration'},
    prepare({title, mood, duration}) {
      const time = duration ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}` : ''
      return {title, subtitle: [mood, time].filter(Boolean).join(' · ')}
    },
  },
})
