import {defineField, defineType} from 'sanity'

// Bài nhạc cho trang /chill — toàn bộ playlist quản lý ở đây (Studio: "Chill · Nhạc").
// src/components/chill/tracks.ts chỉ còn vài bài dự phòng khi Sanity không phản hồi.
//
// File nhạc lấy từ 1 trong 2 chỗ:
// - "File nhạc": upload trong Studio → phát từ Sanity CDN (tính vào băng thông Sanity)
// - "File có sẵn trên web": bài đã nằm ở public/chill/music/ → phát từ Vercel CDN
//   (24 bài đầu tiên chuyển từ code sang). Không sửa ô này bằng tay.

export const STATION_OPTIONS = [
  {title: 'Café Acoustic', value: 'acoustic'},
  {title: 'Deep Focus', value: 'focus'},
  {title: 'Sax Lounge', value: 'sax'},
  {title: 'Lo-fi', value: 'lofi'},
  {title: 'Study Beats', value: 'study'},
]

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
      name: 'key',
      title: 'Mã bài',
      type: 'slug',
      options: {source: 'title'},
      description: 'Bấm "Generate" để tạo từ tên bài. Trang dùng mã này để nhớ bài người nghe đang nghe dở — đã publish thì đừng đổi.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'station',
      title: 'Trạm nhạc',
      type: 'string',
      initialValue: 'lofi',
      options: {list: STATION_OPTIONS, layout: 'radio'},
      validation: (Rule) => Rule.required(),
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
      description:
        'Nhạc không lời, .m4a (AAC) hoặc .mp3 ~128kbps, nên dưới 4MB (~3 phút). File càng nhẹ càng đỡ tốn băng thông Sanity (100GB/tháng ở gói Free).',
      hidden: ({document}) => Boolean(document?.localFile) && !document?.audio,
      validation: (Rule) =>
        Rule.custom((value, {document}) => (value || document?.localFile ? true : 'Cần upload file nhạc')),
    }),
    defineField({
      name: 'localFile',
      title: 'File có sẵn trên web',
      type: 'string',
      readOnly: true,
      hidden: ({document}) => !document?.localFile,
      description: 'Bài chuyển từ code sang, file nằm sẵn trên Vercel. Upload "File nhạc" thì trang sẽ dùng file mới đó.',
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
      description: 'Thứ tự trong trạm, số nhỏ đứng trước. Nên xen kẽ bài nhanh / chậm để mix không đều đều.',
    }),
    defineField({
      name: 'hidden',
      title: 'Ẩn khỏi trang',
      type: 'boolean',
      initialValue: false,
      description: 'Tạm gỡ bài khỏi playlist mà không cần xoá.',
    }),
  ],
  orderings: [
    {title: 'Trạm, rồi thứ tự', name: 'stationOrder', by: [{field: 'station', direction: 'asc'}, {field: 'order', direction: 'asc'}]},
    {title: 'Thứ tự', name: 'order', by: [{field: 'order', direction: 'asc'}]},
  ],
  preview: {
    select: {title: 'title', mood: 'mood', duration: 'duration', station: 'station', hidden: 'hidden'},
    prepare({title, mood, duration, station, hidden}) {
      const time = duration ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}` : ''
      const st = STATION_OPTIONS.find((s) => s.value === station)?.title
      return {title: `${hidden ? '🙈 ' : ''}${title}`, subtitle: [st, mood, time].filter(Boolean).join(' · ')}
    },
  },
})
