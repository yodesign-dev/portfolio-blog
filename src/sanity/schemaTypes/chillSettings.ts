import {defineField, defineType} from 'sanity'
import {ChillSettingsInput} from '../components/ChillSettingsInput'

// Cài đặt chung trang /chill — 1 tài liệu duy nhất (id "chillSettings").
//
// Form hiển thị là ChillSettingsInput (thẻ tính năng có công tắc + chữ hôm nay kèm xem
// trước). Các trường dưới đây giữ tên + giới hạn để API /chill đọc và Studio kiểm tra.
export default defineType({
  name: 'chillSettings',
  title: 'Chill · Cài đặt',
  type: 'document',
  components: {input: ChillSettingsInput},
  fields: [
    defineField({name: 'chatOpen', title: 'Mở phòng chat', type: 'boolean', initialValue: true}),
    defineField({name: 'groupTableOpen', title: 'Mở bàn nhóm', type: 'boolean', initialValue: false}),
    defineField({
      name: 'groupMaxMembers',
      title: 'Số người tối đa mỗi bàn',
      type: 'number',
      initialValue: 8,
      validation: (rule) => rule.integer().min(2).max(12),
    }),
    defineField({name: 'diaryOpen', title: 'Mở bảng nhật ký', type: 'boolean', initialValue: false}),
    defineField({name: 'shelfOpen', title: 'Mở kệ sưu tầm', type: 'boolean', initialValue: false}),
    defineField({name: 'playCountsOpen', title: 'Đếm và hiện lượt nghe', type: 'boolean', initialValue: false}),
    defineField({name: 'diaryNoteVi', title: 'Mẩu giấy của quán (tiếng Việt)', type: 'string', validation: (rule) => rule.max(140)}),
    defineField({name: 'diaryNoteEn', title: 'Mẩu giấy của quán (tiếng Anh)', type: 'string', validation: (rule) => rule.max(140)}),
    defineField({name: 'diaryQuoteEn', title: 'Câu danh ngôn (tiếng Anh)', type: 'string', validation: (rule) => rule.max(200)}),
    defineField({name: 'diaryQuoteVi', title: 'Câu danh ngôn (tiếng Việt)', type: 'string', validation: (rule) => rule.max(200)}),
    defineField({name: 'diaryQuoteBy', title: 'Tác giả câu danh ngôn', type: 'string', validation: (rule) => rule.max(60)}),
  ],
  preview: {prepare: () => ({title: 'Chill · Cài đặt'})},
})
