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
// lại là giá đồ uống thật ở quán, bấm vào thì QR điền sẵn số đó. Không đặt tối thiểu.
export const DONATE_TIERS = [
  {amount: 0, label: 'Tùy tâm', icon: '💛', invite: ''},
  {amount: 25000, label: 'Cà phê sữa đá', icon: '☕', invite: 'Mời Bin 1 ly cà phê sữa đá'},
  {amount: 35000, label: 'Bạc xỉu', icon: '🥛', invite: 'Mời Bin 1 ly bạc xỉu'},
  {amount: 55000, label: 'Cà phê + bánh mì', icon: '🥖', invite: 'Mời Bin cà phê + bánh mì'},
]

// "25k", "1,5tr" — giá kiểu menu quán
export const shortVnd = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString('vi-VN', {maximumFractionDigits: 1})}tr` : `${Math.round(n / 1000)}k`

// Đồ uống ứng với số tiền đã mời — hiện trên bảng cảm ơn thay vì số tiền cụ thể
export function drinkFor(amount?: number) {
  if (!amount) return {icon: '☕', label: 'Cà phê'}
  if (amount >= 100_000) return {icon: '🎉', label: 'Cả bàn cà phê'}
  const tier = [...DONATE_TIERS].reverse().find((t) => t.amount && amount >= t.amount)
  return tier ? {icon: tier.icon, label: tier.label} : {icon: '☕', label: 'Cà phê'}
}

export const hasMomo = () => Boolean(DONATE.momo.qr)
export const hasVcb = () => Boolean(DONATE.vcb.account && DONATE.vcb.name)
export const hasDonate = () => hasMomo() || hasVcb()

export function vietQrUrl(amount: number, note: string) {
  const {account, name} = DONATE.vcb
  const q = new URLSearchParams({accountName: name, addInfo: note})
  if (amount > 0) q.set('amount', String(Math.round(amount)))
  return `https://img.vietqr.io/image/VCB-${account}-qr_only.png?${q}`
}

// Người xem đang ủng hộ dở (đã qua bước 1, chưa bấm "I've sent it"). Lưu lại để
// khi quay về từ app ngân hàng — trang có thể đã tải lại — vẫn tiếp tục ở bước QR.
export type DonateIntent = {
  id?: string // bản ghi "Chờ đối chiếu" trong Studio (chỉ có khi đã để lại tên / lời nhắn)
  code?: string // mã đối chiếu nằm trong nội dung chuyển khoản
  name: string
  message: string
  amount: number
  // Đồng ý hiện tên + lời nhắn trên bảng cảm ơn (sau khi Bin xác nhận đã nhận tiền)
  board?: boolean
  at: number
  // Đã tự mở lại panel 1 lần sau khi quay về từ app ngân hàng → không tự mở nữa
  reopened?: boolean
}

const INTENT_KEY = 'chill:donate-intent'
const INTENT_TTL = 2 * 60 * 60 * 1000

export function loadIntent(): DonateIntent | null {
  try {
    const raw = localStorage.getItem(INTENT_KEY)
    const intent = raw ? (JSON.parse(raw) as DonateIntent) : null
    return intent && Date.now() - intent.at < INTENT_TTL ? intent : null
  } catch {
    return null
  }
}

export function saveIntent(intent: DonateIntent | null) {
  try {
    if (intent) localStorage.setItem(INTENT_KEY, JSON.stringify(intent))
    else localStorage.removeItem(INTENT_KEY)
  } catch {
    // Chặn storage — chỉ mất phần "tiếp tục sau khi quay lại"
  }
}

// Ly cà phê của người vừa mời: hiện trên bàn cạnh lọ tip (chỉ trên máy họ) trong
// 1 ngày — bảng cảm ơn công khai chỉ cập nhật sau khi Bin đối chiếu.
const CUP_KEY = 'chill:my-cup'
const CUP_TTL = 24 * 60 * 60 * 1000

export function loadCup(): boolean {
  try {
    const at = Number(localStorage.getItem(CUP_KEY) || 0)
    return Date.now() - at < CUP_TTL
  } catch {
    return false
  }
}

export function saveCup() {
  try {
    localStorage.setItem(CUP_KEY, String(Date.now()))
  } catch {
    // Chặn storage — ly chỉ hiện đến khi tải lại trang
  }
}
