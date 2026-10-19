import {defineField, defineType} from 'sanity'

// Cài đặt chung trang /chill — 1 tài liệu duy nhất (id "chillSettings").
//
// Hai tab: "Tính năng" = công tắc bật/tắt, mỗi tính năng một khung riêng (tuỳ chọn đi kèm
// nằm chung khung, chỉ hiện khi đã bật); "Nội dung hôm nay" = chữ đổi theo dịp của bảng
// nhật ký, tiếng Việt / tiếng Anh đặt cạnh nhau.
export default defineType({
  name: 'chillSettings',
  title: 'Chill · Cài đặt',
  type: 'document',
  groups: [
    {name: 'features', title: 'Tính năng', default: true},
    {name: 'today', title: 'Nội dung hôm nay'},
  ],
  fieldsets: [
    {name: 'chat', title: 'Phòng chat', description: 'Có hiệu lực sau khoảng 30 giây.'},
    {name: 'table', title: 'Bàn nhóm · thử nghiệm', description: 'Có hiệu lực sau khoảng 30 giây.'},
    {name: 'diary', title: 'Bảng nhật ký · thử nghiệm', description: 'Có hiệu lực sau khoảng 30 giây.'},
    {name: 'shelf', title: 'Kệ sưu tầm · thử nghiệm', description: 'Có hiệu lực sau khoảng 1 phút.'},
    {
      name: 'note',
      title: 'Mẩu giấy của quán',
      description: 'Để trống = quán tự lấy 1 câu trong kho theo ngày. Điền để thay bằng câu riêng (vd. ngày Tết), nhớ xoá khi hết dịp.',
      options: {columns: 2},
    },
    {
      name: 'quote',
      title: 'Câu danh ngôn',
      description: 'Để trống = quán tự lấy 1 câu trong kho 20 câu theo ngày. Điền để thay bằng câu riêng, nhớ xoá khi hết dịp.',
      options: {columns: 2},
    },
  ],
  fields: [
    // ---------- Tab "Tính năng" ----------
    defineField({
      name: 'chatOpen',
      title: 'Mở phòng chat',
      type: 'boolean',
      initialValue: true,
      group: 'features',
      fieldset: 'chat',
      description: 'Tắt khi bị spam: nút chat ẩn đi, không ai gửi được tin. Tin cũ tự xoá sau 24 giờ.',
    }),
    defineField({
      name: 'groupTableOpen',
      title: 'Mở bàn nhóm',
      type: 'boolean',
      initialValue: false,
      group: 'features',
      fieldset: 'table',
      description: 'Khách tạo bàn, mời bạn qua link và xem bàn nhóm. Tắt là không còn nút mời, link mời mở như trang thường.',
    }),
    defineField({
      name: 'groupMaxMembers',
      title: 'Số người tối đa mỗi bàn',
      type: 'number',
      initialValue: 8,
      group: 'features',
      fieldset: 'table',
      hidden: ({document}) => !document?.groupTableOpen,
      validation: (rule) => rule.integer().min(2).max(12),
      description: 'Bàn vẽ 4 ghế, người thứ 5 trở đi hiện thành nhãn "+n". Đủ số này thì link mời báo "Bàn đã đủ người".',
    }),
    defineField({
      name: 'diaryOpen',
      title: 'Mở bảng nhật ký',
      type: 'boolean',
      initialValue: false,
      group: 'features',
      fieldset: 'diary',
      description: 'Khách viết mẩu giấy (2 mẩu / ngày) và xem bảng nhật ký. Chữ của quán đổi ở tab "Nội dung hôm nay".',
    }),
    defineField({
      name: 'shelfOpen',
      title: 'Mở kệ sưu tầm',
      type: 'boolean',
      initialValue: false,
      group: 'features',
      fieldset: 'shelf',
      description: 'Xong phin, mèo mang ra một món cho kệ (20 món, chỉ lưu trên máy khách). Tắt là kệ biến mất, món đã có vẫn giữ cho lần bật sau.',
    }),

    // ---------- Tab "Nội dung hôm nay" ----------
    defineField({
      name: 'diaryNoteVi',
      title: 'Tiếng Việt',
      type: 'string',
      group: 'today',
      fieldset: 'note',
      validation: (rule) => rule.max(140),
    }),
    defineField({
      name: 'diaryNoteEn',
      title: 'Tiếng Anh',
      type: 'string',
      group: 'today',
      fieldset: 'note',
      validation: (rule) => rule.max(140),
      description: 'Để trống thì khách xem tiếng Anh thấy câu tiếng Việt.',
    }),
    defineField({
      name: 'diaryQuoteEn',
      title: 'Tiếng Anh (chữ lớn)',
      type: 'string',
      group: 'today',
      fieldset: 'quote',
      validation: (rule) => rule.max(200),
    }),
    defineField({
      name: 'diaryQuoteVi',
      title: 'Tiếng Việt (chữ nhỏ)',
      type: 'string',
      group: 'today',
      fieldset: 'quote',
      validation: (rule) => rule.max(200),
      description: 'Để trống thì chỉ hiện câu tiếng Anh.',
    }),
    defineField({
      name: 'diaryQuoteBy',
      title: 'Tác giả',
      type: 'string',
      group: 'today',
      fieldset: 'quote',
      validation: (rule) => rule.max(60),
      description: 'Vd. "Seneca" hoặc "Confucius · Khổng Tử". Để trống thì không ghi tên.',
    }),
  ],
  preview: {prepare: () => ({title: 'Chill · Cài đặt'})},
})
