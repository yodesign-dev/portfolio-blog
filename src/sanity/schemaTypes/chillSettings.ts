import {defineField, defineType} from 'sanity'

// Cài đặt chung trang /chill — 1 tài liệu duy nhất (id "chillSettings").
export default defineType({
  name: 'chillSettings',
  title: 'Chill · Cài đặt',
  type: 'document',
  fields: [
    defineField({
      name: 'chatOpen',
      title: 'Mở phòng chat',
      type: 'boolean',
      initialValue: true,
      description:
        'Tắt để đóng chat ngay (vd. khi bị spam): nút chat ẩn đi, không ai gửi được tin. Tin cũ vẫn tự xoá sau 24 giờ. Có hiệu lực sau khoảng 30 giây.',
    }),
    defineField({
      name: 'groupTableOpen',
      title: 'Mở bàn nhóm (thử nghiệm)',
      type: 'boolean',
      initialValue: false,
      description:
        'Bật để khách tạo bàn, mời bạn bè qua link và xem bàn nhóm. Tắt là /chill trở lại y như trước (không nút mời, ô cửa đối diện không sáng, link mời mở như trang thường). Có hiệu lực sau khoảng 30 giây.',
    }),
    defineField({
      name: 'groupMaxMembers',
      title: 'Số người tối đa mỗi bàn',
      type: 'number',
      initialValue: 8,
      validation: (rule) => rule.integer().min(2).max(12),
      description: 'Bàn vẽ 4 ghế; ai vào sau 4 người đầu hiện thành nhãn "+n". Đủ số này thì link mời báo "Bàn đã đủ người".',
    }),
    defineField({
      name: 'diaryOpen',
      title: 'Mở bảng nhật ký (thử nghiệm)',
      type: 'boolean',
      initialValue: false,
      description:
        'Bật để khách viết mẩu giấy (2 mẩu / ngày) và xem bảng nhật ký của quán. Tắt là /chill trở lại y như trước: không nút, không mẩu giấy, không ai gửi được. Có hiệu lực sau khoảng 30 giây.',
    }),
    defineField({
      name: 'diaryNoteVi',
      title: 'Mẩu giấy của quán hôm nay (tiếng Việt)',
      type: 'string',
      validation: (rule) => rule.max(140),
      description:
        'Để trống = quán tự lấy 1 câu trong kho theo ngày. Điền vào để thay bằng câu riêng (vd. ngày Tết) — nhớ xoá đi khi hết dịp.',
    }),
    defineField({
      name: 'diaryNoteEn',
      title: 'Mẩu giấy của quán hôm nay (tiếng Anh)',
      type: 'string',
      validation: (rule) => rule.max(140),
      description: 'Bản tiếng Anh của câu trên. Để trống thì khách xem tiếng Anh thấy câu tiếng Việt.',
    }),
    defineField({
      name: 'diaryQuoteEn',
      title: 'Câu danh ngôn hôm nay (tiếng Anh, chữ lớn)',
      type: 'string',
      validation: (rule) => rule.max(200),
      description:
        'Để trống = quán tự lấy 1 câu trong kho 20 câu theo ngày. Điền vào để thay bằng câu riêng (vd. ngày Tết) — nhớ xoá đi khi hết dịp.',
    }),
    defineField({
      name: 'diaryQuoteVi',
      title: 'Câu danh ngôn hôm nay (tiếng Việt, chữ nhỏ)',
      type: 'string',
      validation: (rule) => rule.max(200),
      description: 'Bản tiếng Việt in nhỏ bên dưới. Để trống thì chỉ hiện câu tiếng Anh.',
    }),
    defineField({
      name: 'diaryQuoteBy',
      title: 'Tác giả câu danh ngôn',
      type: 'string',
      validation: (rule) => rule.max(60),
      description: 'Vd. "Seneca" hoặc "Confucius · Khổng Tử". Để trống thì không ghi tên.',
    }),
  ],
  preview: {prepare: () => ({title: 'Chill · Cài đặt'})},
})
