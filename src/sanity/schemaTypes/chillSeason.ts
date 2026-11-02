import {defineField, defineType} from 'sanity'

// Mùa của /chill (Noel, Tết…): đến ngày tự bật, hết ngày tự tắt, không cần deploy. Máy khách
// tự so giờ nên đúng giờ là đổi, kể cả tab đang mở (src/components/chill/season.ts).
// Cần bật thêm công tắc tổng "Theme theo mùa" ở Chill · Cài đặt.
//
// Ngày mặc định theo Noel 2026: bật trước 2 tuần, tắt sau 1 tuần. Studio hiện theo giờ máy
// đang mở (ở Việt Nam là GMT+7).
const LAYERS = [
  {name: 'lights', title: 'Đèn nháy ngoài phố'},
  {name: 'roomLights', title: 'Đèn trong phòng, tuyết xịt kính, bông gòn'},
  {name: 'snow', title: 'Tuyết bọt (khoảnh khắc + sau mỗi phin)'},
  {name: 'meteors', title: 'Sao băng ban đêm'},
  {name: 'tree', title: 'Cây thông lớn dần theo phin'},
  {name: 'catHat', title: 'Khăn len cho mèo'},
  {name: 'seat', title: 'Khăn và ánh đèn cho người ngồi'},
  {name: 'santa', title: 'Ông già Noel đi giao quà'},
  {name: 'trainLights', title: 'Tàu mang đèn (phố đường tàu)'},
  {name: 'shelf', title: 'Món kệ theo mùa'},
]

export default defineType({
  name: 'chillSeason',
  title: 'Chill · Mùa',
  type: 'document',
  groups: [
    {name: 'schedule', title: 'Lịch', default: true},
    {name: 'layers', title: 'Các lớp'},
    {name: 'moments', title: 'Khoảnh khắc'},
  ],
  fields: [
    defineField({name: 'title', title: 'Tên', type: 'string', group: 'schedule', initialValue: 'Noel 2026', validation: (rule) => rule.required().max(40)}),
    defineField({
      name: 'key',
      group: 'schedule',
      title: 'Mã mùa',
      type: 'slug',
      description: 'Khách tắt riêng và số món trên cây lưu theo mã này. Mỗi năm một mã mới, vd noel-2027.',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'pack',
      group: 'schedule',
      title: 'Bộ trang trí',
      type: 'string',
      description: 'Bộ art có sẵn trong code.',
      options: {list: [{title: 'Noel', value: 'noel'}], layout: 'radio'},
      initialValue: 'noel',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'enabled', group: 'schedule', title: 'Bật mùa này', type: 'boolean', initialValue: false, description: 'Tắt khẩn cấp: bỏ chọn rồi Publish. Khách thấy sau khoảng 1 phút, tab đang mở sau tối đa 30 phút.'}),
    defineField({name: 'start', group: 'schedule', title: 'Bắt đầu', type: 'datetime', initialValue: '2026-12-10T17:00:00.000Z', description: 'Mặc định 00:00 ngày 11/12/2026 giờ Việt Nam, trước Noel 2 tuần.', validation: (rule) => rule.required()}),
    defineField({name: 'end', group: 'schedule', title: 'Kết thúc', type: 'datetime', initialValue: '2027-01-01T17:00:00.000Z', description: 'Mặc định 00:00 ngày 2/1/2027 giờ Việt Nam, sau Noel 1 tuần.', validation: (rule) => rule.required().custom((end, ctx) => {
      const start = (ctx.document as {start?: string} | undefined)?.start
      return !start || !end || Date.parse(end as string) > Date.parse(start) ? true : 'Kết thúc phải sau Bắt đầu'
    })}),
    defineField({
      name: 'layers',
      group: 'layers',
      title: 'Các lớp',
      description: 'Bỏ chọn để tắt riêng một lớp.',
      type: 'object',
      fields: LAYERS.map((l) => defineField({...l, type: 'boolean', initialValue: true})),
    }),
    defineField({
      name: 'moments',
      group: 'moments',
      title: 'Khoảnh khắc',
      type: 'array',
      initialValue: [
        {_key: 'meteors-13', _type: 'moment', kind: 'meteors', start: '2026-12-13T12:00:00.000Z', end: '2026-12-13T22:00:00.000Z'},
        {_key: 'meteors-14', _type: 'moment', kind: 'meteors', start: '2026-12-14T12:00:00.000Z', end: '2026-12-14T22:00:00.000Z'},
        {_key: 'foam-24', _type: 'moment', kind: 'foam', start: '2026-12-24T12:00:00.000Z', end: '2026-12-24T15:00:00.000Z'},
        {_key: 'foam-25', _type: 'moment', kind: 'foam', start: '2026-12-25T12:00:00.000Z', end: '2026-12-25T15:00:00.000Z'},
      ],
      of: [
        {
          type: 'object',
          name: 'moment',
          fields: [
            defineField({name: 'kind', title: 'Loại', type: 'string', options: {list: [{title: 'Tuyết bọt', value: 'foam'}, {title: 'Mưa sao băng', value: 'meteors'}], layout: 'radio'}, validation: (rule) => rule.required()}),
            defineField({name: 'start', title: 'Từ', type: 'datetime', validation: (rule) => rule.required()}),
            defineField({name: 'end', title: 'Đến', type: 'datetime', validation: (rule) => rule.required()}),
          ],
          preview: {
            select: {kind: 'kind', start: 'start'},
            prepare: ({kind, start}) => ({title: kind === 'foam' ? 'Tuyết bọt' : 'Mưa sao băng', subtitle: start ? new Date(start).toLocaleString('vi-VN') : ''}),
          },
        },
      ],
    }),
  ],
  preview: {
    select: {title: 'title', enabled: 'enabled', start: 'start', end: 'end'},
    prepare: ({title, enabled, start, end}) => ({
      title: `${enabled ? '🟢' : '⚪️'} ${title}`,
      subtitle: start && end ? `${new Date(start).toLocaleDateString('vi-VN')} → ${new Date(end).toLocaleDateString('vi-VN')}` : '',
    }),
  },
})
