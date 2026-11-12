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
    defineField({name: 'slipNewOpen', title: 'Mẩu ghi chú kiểu mới (dán băng keo, xoay vòng)', type: 'boolean', initialValue: false}),
    defineField({name: 'shelfOpen', title: 'Mở kệ sưu tầm', type: 'boolean', initialValue: false}),
    defineField({name: 'playCountsOpen', title: 'Đếm và hiện lượt nghe', type: 'boolean', initialValue: false}),
    defineField({name: 'catToyOpen', title: 'Cần câu lông vũ trêu mèo', type: 'boolean', initialValue: false}),
    defineField({name: 'seatPickOpen', title: 'Khách chọn người ngồi nam / nữ', type: 'boolean', initialValue: false}),
    defineField({name: 'facadeOpen', title: 'Mặt phố sống động (ảnh nét, đèn đêm, neon, bóng mây)', type: 'boolean', initialValue: false}),
    defineField({name: 'highlandOpen', title: 'Đà Lạt sương mù (ảnh mới, sương trôi, khói, kính mờ)', type: 'boolean', initialValue: false}),
    defineField({name: 'marketOpen', title: 'Cần Thơ chợ nổi (bến sông, ghe, đèn cầu, bảng CHỢ NỔI)', type: 'boolean', initialValue: false}),
    defineField({name: 'streetMotionOpen', title: 'Chuyển động phố mượt (người, xe, chó)', type: 'boolean', initialValue: false}),
    defineField({name: 'sketchOpen', title: 'Chị ký hoạ ở giá vẽ (Cửa sổ quán) thay vì gõ laptop', type: 'boolean', initialValue: false}),
    defineField({name: 'stringLightsOpen', title: 'Đèn dây trong phòng thở, chớp, đổi màu nhẹ', type: 'boolean', initialValue: false}),
    defineField({name: 'miniPlayerOpen', title: 'Thu nhỏ quán thành cửa sổ nổi', type: 'boolean', initialValue: false}),
    defineField({name: 'brewDeskOpen', title: 'Bàn pha phin (đồng hồ mới, phin trong cảnh)', type: 'boolean', initialValue: false}),
    defineField({name: 'welcomeObOpen', title: 'Màn chào kiểu onboarding (Nghe nhạc / ChromoTime)', type: 'boolean', initialValue: false}),
    defineField({name: 'compactOpen', title: 'Quán gọn (khách tự bày thêm trong Thực đơn)', type: 'boolean', initialValue: false}),
    defineField({name: 'sleepTimerOpen', title: 'Hẹn giờ tắt nhạc', type: 'boolean', initialValue: false}),
    defineField({name: 'favOpen', title: 'Bài của tôi (thả tim bài, phát lặp 1 bài)', type: 'boolean', initialValue: false}),
    defineField({name: 'tripOpen', title: 'Mèo đi chơi xa (bưu thiếp)', type: 'boolean', initialValue: false}),
    defineField({name: 'tripPhins', title: 'Số phin trong ngày để mèo muốn đi', type: 'number', initialValue: 3, validation: (rule) => rule.integer().min(1).max(8)}),
    defineField({name: 'seasonsOpen', title: 'Theme theo mùa (lịch ở Chill · Mùa)', type: 'boolean', initialValue: false}),
    defineField({name: 'liveOpen', title: 'Huy hiệu LIVE (lịch ở Chill · Live)', type: 'boolean', initialValue: false}),
    // Thử thách chung "Cả quán cùng pha phin" (xem src/app/api/chill-quest/route.ts)
    defineField({name: 'questOpen', title: 'Mở thử thách chung', type: 'boolean', initialValue: false}),
    defineField({name: 'questSeason', title: 'Mã mùa', type: 'string', initialValue: 'mua-1', description: 'Đổi mã (vd. mua-2) là bắt đầu mùa mới, bộ đếm và phiếu về 0.', validation: (rule) => rule.regex(/^[a-z0-9-]{1,24}$/)}),
    defineField({name: 'questTitle', title: 'Tên mùa', type: 'string', initialValue: 'Mùa 1', validation: (rule) => rule.max(40)}),
    defineField({name: 'questTitleEn', title: 'Tên mùa (tiếng Anh)', type: 'string', initialValue: 'Season 1', validation: (rule) => rule.max(40)}),
    defineField({name: 'questGoal', title: 'Mục tiêu (số phin)', type: 'number', initialValue: 100, validation: (rule) => rule.integer().min(10).max(100000)}),
    defineField({name: 'questVoteDays', title: 'Số ngày bỏ phiếu', type: 'number', initialValue: 3, validation: (rule) => rule.integer().min(1).max(14)}),
    ...[1, 2, 3, 4].flatMap((i) => [
      defineField({name: `questOpt${i}`, title: `Lựa chọn ${i}`, type: 'string', validation: (rule) => rule.max(60)}),
      defineField({name: `questOpt${i}En`, title: `Lựa chọn ${i} (tiếng Anh)`, type: 'string', validation: (rule) => rule.max(60)}),
    ]),
    defineField({name: 'diaryNoteVi', title: 'Mẩu giấy của quán (tiếng Việt)', type: 'string', validation: (rule) => rule.max(140)}),
    defineField({name: 'diaryNoteEn', title: 'Mẩu giấy của quán (tiếng Anh)', type: 'string', validation: (rule) => rule.max(140)}),
    defineField({name: 'diaryQuoteEn', title: 'Câu danh ngôn (tiếng Anh)', type: 'string', validation: (rule) => rule.max(200)}),
    defineField({name: 'diaryQuoteVi', title: 'Câu danh ngôn (tiếng Việt)', type: 'string', validation: (rule) => rule.max(200)}),
    defineField({name: 'diaryQuoteBy', title: 'Tác giả câu danh ngôn', type: 'string', validation: (rule) => rule.max(60)}),
  ],
  preview: {prepare: () => ({title: 'Chill · Cài đặt'})},
})
