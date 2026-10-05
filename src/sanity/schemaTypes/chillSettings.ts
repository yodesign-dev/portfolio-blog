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
  ],
  preview: {prepare: () => ({title: 'Chill · Cài đặt'})},
})
