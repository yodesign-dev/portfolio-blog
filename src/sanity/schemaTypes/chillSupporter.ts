import {defineField, defineType} from 'sanity'

// Người ủng hộ ở mục "Buy Bin a coffee" trang /chill.
//
// Luồng (xem src/components/chill/Donate.tsx):
//   1. Người xem để lại tên / lời nhắn (không bắt buộc) → tạo bản ghi "Chờ đối
//      chiếu" kèm mã riêng, mã nằm trong nội dung chuyển khoản (vd. "Chill cafe
//      K7Q2 Minh") để Bin khớp với sao kê.
//   2. Bấm "I've sent it" → "Đã báo chuyển" (kể cả người bỏ qua bước 1).
//   Trang không biết tiền có về thật hay không: Bin đối chiếu với app ngân hàng /
//   MoMo rồi tick "Đã nhận tiền".
//
// Tạo qua /api/chill-support với ID dạng `chillSupporter.<uuid>` → không đọc được
// bằng request không có token (dataset public), thông tin chỉ hiện trong Studio.
export const SUPPORT_STATUSES = [
  {title: '⏳ Chờ đối chiếu', value: 'pending'},
  {title: '💛 Đã báo chuyển', value: 'sent'},
]

export default defineType({
  name: 'chillSupporter',
  title: 'Chill · Supporters',
  type: 'document',
  fields: [
    defineField({
      name: 'received',
      title: 'Đã nhận tiền',
      type: 'boolean',
      initialValue: false,
      description: 'Tick sau khi thấy giao dịch có mã bên dưới trong app ngân hàng / MoMo.',
    }),
    defineField({
      name: 'code',
      title: 'Mã đối chiếu',
      type: 'string',
      readOnly: true,
      description: 'Nằm trong nội dung chuyển khoản, vd. "Chill cafe K7Q2 Minh".',
    }),
    defineField({name: 'status', title: 'Người xem báo', type: 'string', options: {list: SUPPORT_STATUSES}, readOnly: true}),
    defineField({name: 'name', title: 'Tên', type: 'string', readOnly: true}),
    defineField({name: 'amount', title: 'Số tiền (tự khai, VND)', type: 'number', readOnly: true}),
    defineField({
      name: 'method',
      title: 'Chuyển qua',
      type: 'string',
      options: {
        list: [
          {title: 'Vietcombank', value: 'vcb'},
          {title: 'MoMo', value: 'momo'},
        ],
      },
      readOnly: true,
    }),
    defineField({name: 'note', title: 'Nội dung chuyển khoản', type: 'string', readOnly: true}),
    defineField({name: 'message', title: 'Lời nhắn', type: 'text', rows: 3, readOnly: true}),
    defineField({name: 'sentAt', title: 'Bấm "I\'ve sent it" lúc', type: 'datetime', readOnly: true}),
    defineField({name: 'context', title: 'Bối cảnh lúc gửi', type: 'string', readOnly: true}),
    defineField({name: 'ipHash', title: 'IP (đã băm)', type: 'string', readOnly: true, hidden: true}),
  ],
  orderings: [{title: 'Mới nhất', name: 'newest', by: [{field: '_createdAt', direction: 'desc'}]}],
  preview: {
    select: {name: 'name', amount: 'amount', method: 'method', received: 'received', status: 'status', code: 'code', message: 'message'},
    prepare: ({name, amount, method, received, status, code, message}) => ({
      title: `${received ? '✅' : status === 'sent' ? '💛' : '⏳'} ${name || 'Khách'}${amount ? ` · ${Number(amount).toLocaleString('vi-VN')}đ` : ''}`,
      subtitle: [code, method === 'momo' ? 'MoMo' : method === 'vcb' ? 'Vietcombank' : '', message].filter(Boolean).join(' · '),
    }),
  },
})
