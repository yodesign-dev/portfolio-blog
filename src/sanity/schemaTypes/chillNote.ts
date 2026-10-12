import {defineField, defineType} from 'sanity'

// Mẩu giấy khách treo lên bảng nhật ký của trang /chill.
//
// Khách gửi qua /api/chill-diary → tạo document với ID dạng `chillNote.<uuid>`. Dấu chấm
// trong ID khiến document KHÔNG đọc được bằng request không có token (dataset đang
// public), nên uidHash + ipHash không lộ ra ngoài; API tự đọc bằng token rồi chỉ trả về
// các trường công khai.
//
// Mẩu giấy hiện ngay, không chờ duyệt. Quán tự xoá mẩu cũ hơn 7 ngày. Muốn gỡ sớm: bật
// "Ẩn khỏi bảng" (hoặc xoá hẳn). Mẩu bị 2 máy khác nhau báo cáo thì tự ẩn.
export const NOTE_MOODS = [
  {title: '☕ Bình yên', value: 'calm'},
  {title: '🔥 Có đà', value: 'drive'},
  {title: '🌧 Nặng đầu', value: 'heavy'},
  {title: '😴 Buồn ngủ', value: 'sleepy'},
  {title: '✨ Biết ơn', value: 'grateful'},
]

const emoji = (value?: string) => NOTE_MOODS.find((m) => m.value === value)?.title.split(' ')[0] ?? '☕'

export default defineType({
  name: 'chillNote',
  title: 'Chill · Nhật ký',
  type: 'document',
  fields: [
    defineField({
      name: 'hidden',
      title: 'Ẩn khỏi bảng',
      type: 'boolean',
      initialValue: false,
      description: 'Bật để gỡ mẩu giấy khỏi bảng nhật ký ngay (có hiệu lực sau khoảng 15 giây).',
    }),
    defineField({name: 'text', title: 'Nội dung', type: 'text', rows: 3, readOnly: true}),
    defineField({name: 'mood', title: 'Tâm trạng', type: 'string', options: {list: NOTE_MOODS}, readOnly: true}),
    defineField({name: 'name', title: 'Tên ở quán', type: 'string', readOnly: true}),
    defineField({name: 'day', title: 'Ngày (giờ Hà Nội)', type: 'string', readOnly: true}),
    defineField({
      name: 'reports',
      title: '🚩 Lượt báo cáo',
      type: 'number',
      initialValue: 0,
      readOnly: true,
      description: 'Đủ 2 máy khác nhau báo cáo thì mẩu giấy tự ẩn.',
    }),
    defineField({name: 'uidHash', title: 'Mã người viết (băm)', type: 'string', readOnly: true, hidden: true}),
    defineField({name: 'ipHash', title: 'IP (băm)', type: 'string', readOnly: true, hidden: true}),
  ],
  preview: {
    select: {text: 'text', mood: 'mood', name: 'name', day: 'day', hidden: 'hidden', reports: 'reports'},
    prepare: ({text, mood, name, day, hidden, reports}) => ({
      title: `${hidden ? '🚫' : emoji(mood)} ${text ?? ''}`,
      subtitle: `${name || 'Khách'} · ${day ?? ''}${reports ? ` · 🚩 ${reports}` : ''}`,
    }),
  },
})
