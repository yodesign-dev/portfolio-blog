// "Mời Bin một ly cà phê" trên trang /chill — thông tin nhận tiền.
//
// Phương thức nào để trống thì tự ẩn; cả 2 cùng trống thì ẩn luôn mục donate.
//
// - MoMo: ảnh QR nhận tiền xuất từ app MoMo (đã cắt gọn, public/chill/donate/).
//   Đây là VietQR trỏ tới ví MoMo nên app ngân hàng cũng quét được. QR tĩnh →
//   người chuyển tự nhập số tiền. Không in số ví ra chữ (ảnh gốc cũng che đi).
// - Vietcombank: QR VietQR tạo qua img.vietqr.io, điền sẵn số tiền + nội dung,
//   quét được bằng mọi app ngân hàng (và MoMo).

export const DONATE = {
  momo: {
    qr: '/chill/donate/momo.webp',
    name: 'NGUYEN THANH BINH', // tên hiện cạnh QR
    phone: '', // không bắt buộc — hiện kèm nút copy, vd. '09xx xxx xxx'
  },
  vcb: {
    account: '1017392443', // số tài khoản Vietcombank
    name: 'NGUYEN THANH BINH', // tên chủ tài khoản, viết hoa không dấu
  },
  // Nội dung chuyển khoản điền sẵn (VietQR)
  note: 'Chill cafe',
}

// Mặc định "tùy tâm": QR không điền số tiền, người chuyển tự nhập. Các mức còn
// lại chỉ là gợi ý, bấm vào thì QR điền sẵn số đó. Không đặt tối thiểu.
export const DONATE_TIERS = [
  {amount: 0, label: 'Any amount', icon: '💛'},
  {amount: 20000, label: 'Phin coffee', icon: '☕'},
  {amount: 35000, label: 'Bạc xỉu', icon: '🥛'},
  {amount: 50000, label: 'Coffee + cake', icon: '🍰'},
]

export const hasMomo = () => Boolean(DONATE.momo.qr)
export const hasVcb = () => Boolean(DONATE.vcb.account && DONATE.vcb.name)
export const hasDonate = () => hasMomo() || hasVcb()

export function vietQrUrl(amount: number, note: string) {
  const {account, name} = DONATE.vcb
  const q = new URLSearchParams({accountName: name, addInfo: note})
  if (amount > 0) q.set('amount', String(Math.round(amount)))
  return `https://img.vietqr.io/image/VCB-${account}-qr_only.png?${q}`
}
