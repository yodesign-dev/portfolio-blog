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
  ],
  preview: {prepare: () => ({title: 'Chill · Cài đặt'})},
})
