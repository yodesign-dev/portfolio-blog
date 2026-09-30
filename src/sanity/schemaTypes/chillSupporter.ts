import {defineField, defineType} from 'sanity'

// Người xem bấm "I've sent it" ở mục "Buy Bin a coffee" trang /chill rồi để lại
// lời nhắn (tự khai — trang không biết tiền có về thật hay không, đối chiếu với
// app Vietcombank / MoMo rồi tick "Đã nhận").
//
// Tạo qua /api/chill-support với ID dạng `chillSupporter.<uuid>` → không đọc được
// bằng request không có token (dataset public), thông tin chỉ hiện trong Studio.
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
      description: 'Tick sau khi đối chiếu thấy giao dịch trong app ngân hàng / MoMo.',
    }),
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
    defineField({name: 'context', title: 'Bối cảnh lúc gửi', type: 'string', readOnly: true}),
    defineField({name: 'ipHash', title: 'IP (đã băm)', type: 'string', readOnly: true, hidden: true}),
  ],
  orderings: [{title: 'Mới nhất', name: 'newest', by: [{field: '_createdAt', direction: 'desc'}]}],
  preview: {
    select: {name: 'name', amount: 'amount', method: 'method', received: 'received', message: 'message'},
    prepare: ({name, amount, method, received, message}) => ({
      title: `${received ? '✅' : '☕'} ${name || 'Khách'}${amount ? ` · ${Number(amount).toLocaleString('vi-VN')}đ` : ''}`,
      subtitle: [method === 'momo' ? 'MoMo' : method === 'vcb' ? 'Vietcombank' : '', message].filter(Boolean).join(' · '),
    }),
  },
})
