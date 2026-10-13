// Lời mời làm quen với quán (/chill): mỗi lúc chỉ mời 1 món, theo thứ tự dưới đây. Khách
// làm rồi thì không mời lại; mỗi lần ghé mời tối đa GUIDE_PER_VISIT món. Tấm thực đơn
// (nút "Thực đơn" trên thanh trên) liệt kê đủ các món, bấm dòng nào thì quán chỉ chỗ đó.
export const GUIDE_ORDER = ['phin', 'drink', 'cat', 'diary', 'settings'] as const
export type GuideStep = (typeof GUIDE_ORDER)[number]

// Lời mời đầu hiện trước khi giao diện kịp tự ẩn (IDLE_MS trong ChillRoom)
export const GUIDE_FIRST_MS = 2500
// Lời mời vừa hiện thì giữ giao diện lại bấy lâu cho khách kịp đọc
export const GUIDE_HOLD_MS = 8000
export const GUIDE_GAP_MS = 20_000
// Thời gian 1 lời mời nằm trên màn hình (chỉ tính lúc đang thấy được, xem ChillRoom)
export const GUIDE_SHOW_MS = 25_000
// Bấm 1 dòng trong thực đơn → chỉ chỗ trong bấy lâu
export const GUIDE_POINT_MS = 12_000
export const GUIDE_PER_VISIT = 3

// Món không có dấu vết nào khác trên máy (phin chưa pha xong, sổ nhật ký chưa viết) →
// nhớ riêng là khách đã mở thử
const KEY = 'chill:guide'

export function loadTried(): GuideStep[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as unknown
    return Array.isArray(raw) ? GUIDE_ORDER.filter((s) => raw.includes(s)) : []
  } catch {
    return []
  }
}

export function saveTried(tried: GuideStep[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(tried))
  } catch {
    // Chặn storage — lần sau mời lại, không sao
  }
}
