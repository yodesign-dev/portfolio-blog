import {defineField, defineType} from 'sanity'
import {isLiveUrl} from '../../components/chill/live'

// Buổi live YouTube của /chill: 24 giờ trước giờ bắt đầu hiện "Live hôm nay 20:00", tới giờ hiện
// "Đang live", hết giờ tự ẩn, không cần deploy. Máy khách tự so giờ (src/components/chill/live.ts).
// Cần bật thêm công tắc "Huy hiệu LIVE" ở Chill · Cài đặt.
export default defineType({
  name: 'chillLive',
  title: 'Chill · Live',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Tên', type: 'string', description: 'Chỉ để nhận ra trong Studio, khách không thấy.', validation: (rule) => rule.required().max(60)}),
    defineField({
      name: 'url',
      title: 'Link YouTube',
      type: 'url',
      description: 'Link buổi live đã lên lịch trong YouTube Studio. Trước giờ live link mở trang chờ có nút "Notify me".',
      validation: (rule) => rule.required().custom((url) => !url || isLiveUrl(url as string) ? true : 'Chỉ nhận link https của YouTube'),
    }),
    defineField({name: 'enabled', title: 'Hiện cho khách', type: 'boolean', initialValue: true, description: 'Live xong sớm hoặc huỷ: bỏ chọn rồi Publish. Khách mới thấy sau khoảng 1 phút, tab đang mở sau tối đa 10 phút.'}),
    defineField({name: 'start', title: 'Bắt đầu', type: 'datetime', validation: (rule) => rule.required()}),
    defineField({name: 'end', title: 'Kết thúc', type: 'datetime', description: 'Huy hiệu tự ẩn lúc này, kể cả khi buổi live chưa tắt thật.', validation: (rule) => rule.required().custom((end, ctx) => {
      const start = (ctx.document as {start?: string} | undefined)?.start
      return !start || !end || Date.parse(end as string) > Date.parse(start) ? true : 'Kết thúc phải sau Bắt đầu'
    })}),
  ],
  orderings: [{title: 'Mới nhất', name: 'startDesc', by: [{field: 'start', direction: 'desc'}]}],
  preview: {
    select: {title: 'title', enabled: 'enabled', start: 'start'},
    prepare: ({title, enabled, start}) => ({
      title: `${enabled ? '🔴' : '⚪️'} ${title}`,
      subtitle: start ? new Date(start).toLocaleString('vi-VN') : '',
    }),
  },
})
